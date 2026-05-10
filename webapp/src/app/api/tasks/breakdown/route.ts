import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { title, description, weight } = body

    if (!title) {
      return NextResponse.json({ error: 'Missing title' }, { status: 400 })
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-3.1-flash-lite' })
    const prompt = `
      You are an agentic academic planner. 
      The user needs to complete the following assignment:
      Title: ${title}
      Description: ${description || 'No description provided.'}
      Weight: ${weight ? weight + '%' : 'Unknown'}

      Evaluate the scope of this assignment. Recursively break it down into a tree of actionable sub-tasks.
      If it's a small task (e.g. a reading), 1 level of depth is fine.
      If it's a large project, break it down up to 3 levels deep.
      Include a time estimate for each node.

      Return ONLY a raw, minified JSON object matching this recursive schema:
      {
        "taskName": "string",
        "estimatedHours": number,
        "subtasks": [
          {
            "taskName": "string",
            "estimatedHours": number,
            "subtasks": [ ... ] // Optional, omit if leaf node
          }
        ]
      }
      
      No markdown formatting (no \`\`\`json). Just the raw JSON.
    `

    const result = await model.generateContent(prompt)
    let cleanJson = result.response.text().trim()

    if (cleanJson.startsWith('```json')) cleanJson = cleanJson.substring(7)
    if (cleanJson.endsWith('```')) cleanJson = cleanJson.substring(0, cleanJson.length - 3)

    const parsedData = JSON.parse(cleanJson)

    return NextResponse.json({ data: parsedData })

  } catch (error: any) {
    console.error('Task Breakdown Error:', error)
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}
