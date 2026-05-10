import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')

export async function POST(req: NextRequest) {
  try {
    const { query, contextData, history } = await req.json()

    if (!query) {
      return NextResponse.json({ error: 'Missing query' }, { status: 400 })
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-3.1-flash-lite' })
    
    // Construct the context string
    const systemInstruction = `
      You are an incredibly helpful academic assistant embedded in the SemesterSync dashboard.
      Your job is to answer the student's questions based strictly on the uploaded syllabus data and course materials provided below.
      Be concise, encouraging, and direct.

      CURRENT UPLOADED DATA:
      Courses: ${JSON.stringify(contextData.courses || [])}
      Upcoming Events/Deadlines: ${JSON.stringify(contextData.events || [])}
      Course Materials & Rubrics: ${JSON.stringify(contextData.materials || [])}
    `

    // Format chat history for Gemini
    const chat = model.startChat({
      history: [
        { role: 'user', parts: [{ text: systemInstruction }] },
        { role: 'model', parts: [{ text: 'Understood. I will answer based only on the provided context.' }] },
        ...history.map((msg: any) => ({
          role: msg.role === 'user' ? 'user' : 'model',
          parts: [{ text: msg.content }]
        }))
      ]
    })

    const result = await chat.sendMessage(query)
    const responseText = result.response.text()

    return NextResponse.json({ answer: responseText })

  } catch (error: any) {
    console.error('Chat API Error:', error)
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}
