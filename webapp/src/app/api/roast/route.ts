import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')

export async function POST(req: NextRequest) {
  try {
    const { courses, deadlines } = await req.json()

    if (!courses || courses.length === 0) {
      return NextResponse.json({ error: 'No courses provided' }, { status: 400 })
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-3.1-flash-lite' })

    const prompt = `You are a witty, slightly snarky academic advisor. Given this student's course load and deadlines, write a 3-5 sentence humorous roast. Be clever and funny, not mean. Reference specific courses and deadlines.

Courses:
${courses.map((c: { name: string }) => `- ${c.name}`).join('\n')}

Deadlines:
${(deadlines || []).map((d: { title: string; due_at: string; category: string }) => `- ${d.title} (${d.category || 'uncategorized'}, due ${d.due_at})`).join('\n')}

Write the roast now.`

    const result = await model.generateContent(prompt)
    const roast = result.response.text()

    return NextResponse.json({ roast })
  } catch (error: any) {
    console.error('Roast API Error:', error)
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}
