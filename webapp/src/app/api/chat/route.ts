import { NextRequest, NextResponse } from 'next/server'
import { buildChatPrompt, type CourseRow, type DeadlineRow, type HistoryRow } from '@/lib/chatPrompt'
import { geminiThinkingGenerationSlice } from '@/lib/geminiGeneration'
import { iterateGeminiSseTextDeltas } from '@/lib/geminiStreamParse'
import { supabaseServer } from '@/lib/supabase-server'

export const maxDuration = 60

const MODEL = process.env.GEMINI_MODEL ?? 'gemini-3.1-flash-lite'

function geminiUrl(stream: boolean): string {
  const base = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:${stream ? 'streamGenerateContent' : 'generateContent'}`
  const params = `key=${process.env.GEMINI_API_KEY}${stream ? '&alt=sse' : ''}`
  return `${base}?${params}`
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await supabaseServer()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let message: string
    try {
      const body = await req.json()
      message = body.message
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    if (!message || typeof message !== 'string' || !message.trim()) {
      return NextResponse.json({ error: 'Missing message' }, { status: 400 })
    }

    const now = new Date()
    const pastDate = new Date(now.getTime() - 14 * 86_400_000)
    const futureDate = new Date(now.getTime() + 120 * 86_400_000)

    const [coursesResult, deadlinesResult, historyResult] = await Promise.all([
      supabase
        .from('courses')
        .select('id, name, color, syllabus_text')
        .eq('user_id', user.id),
      supabase
        .from('deadlines')
        .select('id, course_id, title, category, due_at, courses(name, color)')
        .eq('user_id', user.id)
        .gte('due_at', pastDate.toISOString())
        .lte('due_at', futureDate.toISOString())
        .order('due_at', { ascending: true }),
      supabase
        .from('chat_messages')
        .select('role, text, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true })
        .limit(12),
    ])

    const courses: CourseRow[] = (coursesResult.data ?? []) as CourseRow[]
    const deadlines = (deadlinesResult.data ?? []).map((d: any) => ({
      ...d,
      courses: Array.isArray(d.courses) ? d.courses[0] : d.courses,
    })) as DeadlineRow[]
    const history: HistoryRow[] = (historyResult.data ?? []) as HistoryRow[]

    const { error: insertError } = await supabase
      .from('chat_messages')
      .insert({
        user_id: user.id,
        role: 'user',
        text: message.trim(),
      })

    if (insertError) {
      console.error('Failed to save user message:', insertError)
      return NextResponse.json({ error: 'Failed to save message' }, { status: 500 })
    }

    const prompt = buildChatPrompt({
      courses,
      deadlines,
      history,
      message: message.trim(),
      today: now,
    })

    const thinkingSlice = geminiThinkingGenerationSlice()

    const geminiBody = {
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      ...thinkingSlice,
    }

    const acceptsSse = (req.headers.get('accept') ?? '').includes('text/event-stream')

    if (acceptsSse) {
      return handleStreaming(geminiBody, user.id, supabase)
    }

    return handleNonStreaming(geminiBody, user.id, supabase)
  } catch (err: unknown) {
    console.error('Chat API error:', err)
    const msg = err instanceof Error ? err.message : 'Internal Server Error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

async function handleNonStreaming(
  body: Record<string, unknown>,
  userId: string,
  supabase: Awaited<ReturnType<typeof supabaseServer>>
): Promise<NextResponse> {
  const res = await fetch(geminiUrl(false), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    console.error('Gemini non-streaming error:', res.status, text)
    return NextResponse.json({ error: 'Gemini API request failed' }, { status: 502 })
  }

  const json = await res.json()
  const parts = (json as any)?.candidates?.[0]?.content?.parts
  const reply: string = parts?.map((p: any) => p.text ?? '').join('') ?? ''

  const { data: savedMsg } = await supabase
    .from('chat_messages')
    .insert({
      user_id: userId,
      role: 'assistant',
      text: reply,
    })
    .select('id, role, text, created_at')
    .single()

  return NextResponse.json({ reply, message: savedMsg ?? null })
}

function handleStreaming(
  body: Record<string, unknown>,
  userId: string,
  supabase: Awaited<ReturnType<typeof supabaseServer>>
): Response {
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      let assembled = ''
      try {
        const res = await fetch(geminiUrl(true), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })

        if (!res.ok) {
          const text = await res.text().catch(() => '')
          console.error('Gemini streaming error:', res.status, text)
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: 'Gemini API request failed' })}\n\n`))
          controller.close()
          return
        }

        if (!res.body) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: 'Empty response body from Gemini' })}\n\n`))
          controller.close()
          return
        }

        for await (const delta of iterateGeminiSseTextDeltas(res.body)) {
          assembled += delta
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ delta })}\n\n`))
        }

        const { data: savedMsg } = await supabase
          .from('chat_messages')
          .insert({
            user_id: userId,
            role: 'assistant',
            text: assembled,
          })
          .select('id, role, text, created_at')
          .single()

        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ done: true, message: savedMsg ?? { role: 'assistant', text: assembled } })}\n\n`)
        )
      } catch (err: unknown) {
        console.error('Streaming error:', err)
        const msg = err instanceof Error ? err.message : 'Streaming failed'
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: msg })}\n\n`))

        if (assembled) {
          await supabase
            .from('chat_messages')
            .insert({
              user_id: userId,
              role: 'assistant',
              text: assembled,
            })
        }
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  })
}
