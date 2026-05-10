import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { GoogleGenAI } from '@google/genai'
import { createServerClient } from '@/lib/supabase-server'
import { extractText, getDocumentProxy } from 'unpdf'
import { z } from 'zod'
import { zodToJsonSchema } from 'zod-to-json-schema'

export const runtime = 'nodejs'

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' })

// --- Zod Schema (from the docs pattern) ---
const weightSchema = z.object({
  label: z.string(),
  value: z.number()
}).passthrough()

const courseSchema = z.object({
  id: z.string(),
  name: z.string(),
  title: z.string(),
  prof: z.string().optional().default('TBD'),
  color: z.string().optional().default('bg-blue-500'),
  textColor: z.string().optional().default('text-blue-500'),
  weights: z.array(weightSchema).optional().default([])
}).passthrough()

const eventSchema = z.object({
  id: z.string(),
  courseId: z.string(),
  title: z.string(),
  date: z.string(),
  type: z.string().optional().default('assignment'),
  weight: z.number().optional().default(0),
  description: z.string().optional().default('')
}).passthrough()

const syllabusSchema = z.object({
  documentType: z.string().optional().default('syllabus'),
  courses: z.array(courseSchema),
  events: z.array(eventSchema),
  materials: z.array(z.any()).optional().default([])
})

// --- Helper functions ---
async function extractPDFText(buffer: Buffer): Promise<string> {
  // Suppress noisy TrueType font warnings from PDF.js
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
  // Removed all regex matching and structural filtering as requested.
  // The full raw text will now be sent to the model.
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
    {"id": "course1", "name": "CODE", "title": "Full Title", "prof": "Name", "weights": [{"label": "Category", "value": 20}]}
  ],
  "events": [
    {"id": "event1", "courseId": "course1", "title": "Name", "date": "2026-MM-DD", "type": "exam", "weight": 0, "description": "Brief"}
  ],
  "materials": []
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

    // --- 1. Local text extraction ---
    let syllabusText = ''
    let mode: 'TEXT' | 'PDF' = 'PDF'
    try {
      syllabusText = cleanText(await extractPDFText(buffer))
      if (syllabusText.length >= 100) mode = 'TEXT'
    } catch { console.warn(`[${rid}] Extract failed, using PDF mode`) }

    // --- 2. Cache lookup ---
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
          console.log(`[${rid}] CACHE HIT ✅ (${Date.now() - t0}ms)`)
          return NextResponse.json({ message: 'Cache hit', data: cached.parsed_json })
        }
      } catch { /* miss */ }
    }

    // DEBUG: Write the cleaned syllabus text to a file so we can inspect it
    try {
      const fs = require('fs')
      const path = require('path')
      fs.writeFileSync(path.join(process.cwd(), 'debug_syllabus_text.txt'), syllabusText, 'utf-8')
      console.log(`[${rid}] Wrote cleaned syllabus text to debug_syllabus_text.txt (${syllabusText.length} characters)`)
    } catch (e) {
      console.warn('Failed to write debug text:', e)
    }

    if (mode === 'PDF') {
      throw new Error("Local text extraction failed, and OpenRouter does not support direct PDF binary uploads. Please use a text-based PDF.")
    }

    const tGemini = Date.now()
    
    // Explicitly read from .env.local to bypass stale global terminal session variables
    let localEnvKey = ''
    try {
      const fs = require('fs')
      const path = require('path')
      const envContent = fs.readFileSync(path.join(process.cwd(), '.env.local'), 'utf-8')
      const match = envContent.match(/^GEMINI_API_KEY=(.*)$/m)
      if (match) localEnvKey = match[1].trim()
    } catch (e) {}

    const apiKey = localEnvKey || process.env.GEMINI_API_KEY
    
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not set. Restart the dev server after adding it to .env.local.')
    }
    
    console.log(`[${rid}] Gemini key loaded: ${apiKey.slice(0, 12)}...${apiKey.slice(-4)}`)
    
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
    
    // Strip markdown code fences if present (```json ... ```)
    rawText = rawText.replace(/```json\s*/gi, '').replace(/```\s*/g, '')
    
    // Extract the JSON portion from any surrounding conversational text
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

    // If the model returned an array instead of an object, wrap it
    if (Array.isArray(parsed)) {
      // Try to find the syllabus object inside the array
      const syllabusObj = parsed.find((item: any) => item && item.documentType === 'syllabus')
      if (syllabusObj) {
        parsed = syllabusObj
      } else {
        // Assume it's an array of courses/events — wrap into expected shape
        parsed = {
          documentType: 'syllabus',
          courses: parsed.filter((item: any) => item?.name && item?.title),
          events: parsed.filter((item: any) => item?.date && item?.courseId),
          materials: []
        }
      }
    }

    // --- 3. Assign colors dynamically ---
    if (parsed.courses && Array.isArray(parsed.courses)) {
      const COLORS = [
        { bg: 'bg-blue-500', text: 'text-blue-500' },
        { bg: 'bg-emerald-500', text: 'text-emerald-500' },
        { bg: 'bg-red-500', text: 'text-red-500' },
        { bg: 'bg-purple-500', text: 'text-purple-500' },
        { bg: 'bg-orange-500', text: 'text-orange-500' },
        { bg: 'bg-pink-500', text: 'text-pink-500' },
        { bg: 'bg-indigo-500', text: 'text-indigo-500' },
        { bg: 'bg-cyan-500', text: 'text-cyan-500' }
      ]
      
      parsed.courses.forEach((c: any) => {
        // Create a simple hash from the course name/id to deterministically pick a color
        const str = c.name || c.id || Math.random().toString()
        let hash = 0
        for (let j = 0; j < str.length; j++) {
          hash = str.charCodeAt(j) + ((hash << 5) - hash)
        }
        const colorPair = COLORS[Math.abs(hash) % COLORS.length]
        c.color = colorPair.bg
        c.textColor = colorPair.text
      })
    }

    const parsedData = syllabusSchema.parse(parsed)

    console.log(`[${rid}] ${mode} | extract=${tGemini - t0}ms gemini=${Date.now() - tGemini}ms total=${Date.now() - t0}ms`)

    // --- 4. Background cache write ---
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
