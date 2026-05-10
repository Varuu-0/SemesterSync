import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import fs from 'fs'
import path from 'path'
import { GoogleGenAI } from '@google/genai'
import { createServerClient } from '@/lib/supabase-server'
import { extractText, getDocumentProxy } from 'unpdf'
import { z } from 'zod'

export const runtime = 'nodejs'

const courseSchema = z.object({
  id: z.string(),
  name: z.string(),
  color: z.string().optional().default('#3b82f6'),
}).passthrough()

const eventSchema = z.object({
  id: z.string(),
  courseId: z.string(),
  title: z.string(),
  date: z.string(),
  type: z.string().optional().default('assignment'),
}).passthrough()

const syllabusSchema = z.object({
  documentType: z.string().optional().default('syllabus'),
  courses: z.array(courseSchema),
  events: z.array(eventSchema),
})

async function extractPDFText(buffer: Buffer): Promise<string> {
  const origWarn = console.warn
  console.warn = (...args: any[]) => {
    if (typeof args[0] === 'string' && args[0].startsWith('Warning: TT:')) return
    origWarn.apply(console, args)
  }
  try {
    const pdf = await getDocumentProxy(new Uint8Array(buffer))
    const { text } = await extractText(pdf, { mergePages: true })
    return text
  } finally {
    console.warn = origWarn
  }
}

function cleanText(raw: string): string {
  return raw.trim()
}

function normalizeForHash(text: string): string {
  return text.toLowerCase().replace(/\s+/g, ' ').trim()
}

const PROMPT = `You are a JSON-only API. Output ONLY a single JSON object with no other text, no markdown, no explanation.

Extract all course info, assignments, exams, quizzes, and deadlines from this university syllabus.

You MUST return exactly this JSON structure (a single object, NOT an array):
{
  "documentType": "syllabus",
  "courses": [
    {"id": "course1", "name": "CODE"}
  ],
  "events": [
    {"id": "event1", "courseId": "course1", "title": "Name", "date": "2026-MM-DD", "type": "exam"}
  ]
}

Rules:
- Output ONLY the JSON object. No text before or after.
- Use unique IDs for courses and events
- All events must reference a valid courseId
- If year is missing from dates, use 2026
- type must be one of: exam, assignment, quiz, lab, project`

export async function POST(req: NextRequest) {
  const t0 = Date.now()

  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 })

    const buffer = Buffer.from(await file.arrayBuffer())
    const rid = file.name.slice(0, 12)

    let syllabusText = ''
    let mode: 'TEXT' | 'PDF' = 'PDF'
    try {
      syllabusText = cleanText(await extractPDFText(buffer))
      if (syllabusText.length >= 100) mode = 'TEXT'
    } catch { console.warn(`[${rid}] Extract failed, using PDF mode`) }

    const hashSource = mode === 'TEXT' ? Buffer.from(normalizeForHash(syllabusText)) : buffer
    const contentHash = crypto.createHash('sha256').update(hashSource).digest('hex')

    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
      try {
        const supabase = createServerClient()
        const { data: cached } = await supabase
          .from('syllabus_cache')
          .select('parsed_json')
          .eq('pdf_hash', contentHash)
          .single()
        if (cached) {
          console.log(`[${rid}] CACHE HIT (${Date.now() - t0}ms)`)
          return NextResponse.json({ message: 'Cache hit', data: cached.parsed_json })
        }
      } catch { /* miss */ }
    }

    if (mode === 'PDF') {
      throw new Error("Local text extraction failed. Please use a text-based PDF.")
    }

    let localEnvKey = ''
    try {
      const envContent = fs.readFileSync(path.join(process.cwd(), '.env.local'), 'utf-8')
      const match = envContent.match(/^GEMINI_API_KEY=(.*)$/m)
      if (match) localEnvKey = match[1].trim()
    } catch {}

    const apiKey = localEnvKey || process.env.GEMINI_API_KEY

    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not set.')
    }

    const aiClient = new GoogleGenAI({ apiKey })

    const response = await aiClient.models.generateContent({
      model: 'gemini-3.1-flash-lite',
      contents: [
        { role: 'user', parts: [{ text: PROMPT + '\n\n---SYLLABUS TEXT---\n\n' + syllabusText }] }
      ],
      config: {
        systemInstruction: "You are an academic parser. NEVER output conversational text. Output ONLY valid JSON.",
        responseMimeType: "application/json",
      }
    })

    let rawText = response.text || ''
    rawText = rawText.replace(/```json\s*/gi, '').replace(/```\s*/g, '')

    const jsonStartObj = rawText.indexOf('{')
    const jsonStartArr = rawText.indexOf('[')
    const jsonStart = Math.min(
      jsonStartObj === -1 ? Infinity : jsonStartObj,
      jsonStartArr === -1 ? Infinity : jsonStartArr
    )
    const jsonEnd = Math.max(rawText.lastIndexOf('}'), rawText.lastIndexOf(']'))

    if (jsonStart !== Infinity && jsonEnd !== -1 && jsonEnd > jsonStart) {
      rawText = rawText.slice(jsonStart, jsonEnd + 1)
    }

    let parsed = JSON.parse(rawText)

    if (Array.isArray(parsed)) {
      const syllabusObj = parsed.find((item: any) => item && item.documentType === 'syllabus')
      if (syllabusObj) {
        parsed = syllabusObj
      } else {
        parsed = {
          documentType: 'syllabus',
          courses: parsed.filter((item: any) => item?.name),
          events: parsed.filter((item: any) => item?.date && item?.courseId),
        }
      }
    }

    if (parsed.courses && Array.isArray(parsed.courses)) {
      const COLORS = [
        '#3b82f6', '#10b981', '#ef4444', '#8b5cf6',
        '#f97316', '#ec4899', '#6366f1', '#06b6d4',
      ]

      parsed.courses.forEach((c: any) => {
        const str = c.name || c.id || Math.random().toString()
        let hash = 0
        for (let j = 0; j < str.length; j++) {
          hash = str.charCodeAt(j) + ((hash << 5) - hash)
        }
        c.color = COLORS[Math.abs(hash) % COLORS.length]
      })
    }

    const parsedData = syllabusSchema.parse(parsed)

    console.log(`[${rid}] ${mode} | total=${Date.now() - t0}ms`)

    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
      createServerClient()
        .from('syllabus_cache')
        .insert({ pdf_hash: contentHash, parsed_json: parsedData })
        .then(({ error }) => { if (error) console.warn(`[${rid}] Cache write failed: ${error.message}`) })
    }

    return NextResponse.json({ message: 'Success', data: parsedData })

  } catch (error: any) {
    console.error('Upload Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
