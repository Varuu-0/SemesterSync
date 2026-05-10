'use client'

import * as chrono from 'chrono-node'
import type { DeadlineCategory } from './types'

export type ExtractedDeadline = {
  title: string
  dueAt: Date
  category: DeadlineCategory
  sourceSnippet?: string
  source: 'ai' | 'local'
}

const DEADLINE_KEYWORDS = [
  'due', 'deadline', 'submit', 'submission', 'assignment',
  'project', 'quiz', 'exam', 'midterm', 'final',
  'homework', 'lab', 'presentation', 'paper', 'report', 'milestone',
]

const KEYWORD_RE = new RegExp(`\\b(${DEADLINE_KEYWORDS.join('|')})\\b`, 'i')

const CATEGORY_PATTERNS: Array<[RegExp, DeadlineCategory]> = [
  [/\b(midterm|final\s+exam|exam|test)\b/i, 'exam'],
  [/\b(quiz)\b/i, 'quiz'],
  [/\b(project|milestone)\b/i, 'project'],
  [/\b(lab\s*\d|lab\b)/i, 'lab'],
  [/\b(presentation|present|demo)\b/i, 'presentation'],
  [/\b(reading|chapter|read\b)/i, 'reading'],
  [/\b(assignment|homework|hw|problem\s*set|pset|paper|report)\b/i, 'assignment'],
]

export async function extractTextFromPdf(file: File): Promise<string> {
  const pdfjs = await import('pdfjs-dist')
  const version = (pdfjs as unknown as { version: string }).version
  pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${version}/pdf.worker.min.mjs`

  const buffer = await file.arrayBuffer()
  const doc = await pdfjs.getDocument({ data: buffer }).promise
  const pageNumbers = Array.from({ length: doc.numPages }, (_, i) => i + 1)
  const pages = await Promise.all(pageNumbers.map((n) => doc.getPage(n)))
  const pageTexts = await Promise.all(pages.map((page) => extractTextFromPdfPage(page)))
  return pageTexts.join('\n\n')
}

async function extractTextFromPdfPage(page: {
  getTextContent: () => Promise<{ items: unknown[] }>
}): Promise<string> {
  const content = await page.getTextContent()
  const lines: string[] = []
  let lineY: number | null = null
  let line = ''
  for (const item of content.items as Array<{ str: string; transform: number[] }>) {
    const y = item.transform?.[5]
    if (lineY === null || (y !== undefined && Math.abs(y - lineY) < 2)) {
      line += (line && !line.endsWith(' ') ? ' ' : '') + item.str
      lineY = y ?? lineY
    } else {
      if (line.trim()) lines.push(line.trim())
      line = item.str
      lineY = y ?? null
    }
  }
  if (line.trim()) lines.push(line.trim())
  return lines.join('\n')
}

export async function extractDeadlinesSmart(
  text: string,
  opts: { courseName?: string; fileName?: string; refDate?: Date } = {}
): Promise<{ deadlines: ExtractedDeadline[]; source: 'ai' | 'local'; reason?: string }> {
  const refDate = opts.refDate ?? new Date()

  try {
    const res = await fetch('/api/extract-deadlines', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        text,
        courseName: opts.courseName,
        fileName: opts.fileName,
        referenceDate: refDate.toISOString().slice(0, 10),
      }),
    })

    if (res.ok) {
      const json = (await res.json()) as {
        deadlines: Array<{
          title: string
          category: DeadlineCategory
          dueAt: string
          sourceSnippet?: string
        }>
      }
      const deadlines = json.deadlines
        .map((d) => ({
          title: d.title,
          category: d.category,
          dueAt: new Date(d.dueAt),
          sourceSnippet: d.sourceSnippet,
          source: 'ai' as const,
        }))
        .filter((d) => !Number.isNaN(d.dueAt.getTime()))
      return { deadlines, source: 'ai' }
    }

    if (res.status !== 501) {
      const body = (await res.json().catch(() => ({}))) as { error?: string }
      console.warn('AI extraction failed, falling back to local:', body.error)
    }
  } catch (e) {
    console.warn('AI extraction request errored, using local extractor:', e)
  }

  const local = extractDeadlinesFromText(text, refDate)
  return { deadlines: local, source: 'local' }
}

export function extractDeadlinesFromText(
  text: string,
  refDate: Date = new Date()
): ExtractedDeadline[] {
  const term = inferTerm(text, refDate)
  const anchor = term?.start ?? refDate
  const candidates = splitCandidates(text)
  const seen = new Set<string>()
  const out: ExtractedDeadline[] = []

  for (const snippet of candidates) {
    if (!KEYWORD_RE.test(snippet)) continue
    const results = chrono.parse(snippet, anchor)
    if (!results.length) continue

    const parsed = results[0]
    let date = parsed.start.date()
    if (term && !/\b(19|20)\d{2}\b/.test(parsed.text)) {
      date = snapIntoTerm(date, term)
    }
    if (!isPlausibleDate(date)) continue

    const title = buildTitle(snippet, parsed.text)
    const dayKey = date.toISOString().slice(0, 10)
    const dedupe = `${title.toLowerCase()}__${dayKey}`
    if (seen.has(dedupe)) continue
    seen.add(dedupe)

    out.push({
      title,
      dueAt: date,
      category: guessCategory(snippet),
      sourceSnippet: snippet.slice(0, 280),
      source: 'local',
    })
  }
  return out
}

type Term = { label: string; start: Date; end: Date }

function inferTerm(text: string, refDate: Date): Term | null {
  const longRe = /\b(fall|winter|spring|summer)\s+(20\d{2})\b/i
  const longMatch = text.match(longRe)
  if (longMatch) {
    const season = longMatch[1].toLowerCase()
    const year = parseInt(longMatch[2], 10)
    return termRange(season, year)
  }
  const shortRe = /\b(F|W|S)(\d{2})\b/
  const shortMatch = text.slice(0, 4000).match(shortRe)
  if (shortMatch) {
    const code = shortMatch[1].toUpperCase()
    const year = 2000 + parseInt(shortMatch[2], 10)
    const season = code === 'F' ? 'fall' : code === 'W' ? 'winter' : 'spring'
    return termRange(season, year)
  }
  const m = refDate.getMonth()
  const year = refDate.getFullYear()
  const season = m <= 3 ? 'winter' : m <= 7 ? 'summer' : m <= 11 ? 'fall' : 'winter'
  return termRange(season, year)
}

function termRange(season: string, year: number): Term {
  switch (season) {
    case 'fall':
      return { label: `Fall ${year}`, start: new Date(year, 8, 1), end: new Date(year, 11, 20) }
    case 'winter':
      return { label: `Winter ${year}`, start: new Date(year, 0, 5), end: new Date(year, 3, 25) }
    case 'spring':
      return { label: `Spring ${year}`, start: new Date(year, 0, 5), end: new Date(year, 4, 1) }
    case 'summer':
      return { label: `Summer ${year}`, start: new Date(year, 4, 1), end: new Date(year, 7, 30) }
    default:
      return { label: `${season} ${year}`, start: new Date(year, 0, 1), end: new Date(year, 11, 31) }
  }
}

function snapIntoTerm(d: Date, term: Term): Date {
  if (d.getTime() >= term.start.getTime() && d.getTime() <= term.end.getTime()) return d
  for (const dy of [-1, 1, -2, 2]) {
    const shifted = new Date(d)
    shifted.setFullYear(shifted.getFullYear() + dy)
    if (shifted.getTime() >= term.start.getTime() && shifted.getTime() <= term.end.getTime()) {
      return shifted
    }
  }
  return d
}

function guessCategory(snippet: string): DeadlineCategory {
  for (const [re, cat] of CATEGORY_PATTERNS) if (re.test(snippet)) return cat
  return 'other'
}

function splitCandidates(text: string): string[] {
  const byLine = text.split(/\n+/).map((s) => s.trim()).filter(Boolean)
  const sentences: string[] = []
  for (const line of byLine) {
    if (line.length <= 240) {
      sentences.push(line)
      continue
    }
    for (const part of line.split(/(?<=[.!?])\s+/)) {
      if (part.trim()) sentences.push(part.trim())
    }
  }
  return sentences
}

function isPlausibleDate(d: Date): boolean {
  const year = d.getFullYear()
  const now = new Date().getFullYear()
  return year >= now - 1 && year <= now + 2
}

function buildTitle(snippet: string, dateText: string): string {
  let cleaned = snippet
    .replace(dateText, '')
    .replace(/\s{2,}/g, ' ')
    .replace(/^[\s\-–—:•·\.]+/, '')
    .replace(/[\s\-–—:•·\.]+$/, '')
    .trim()
  if (cleaned.length > 80) cleaned = cleaned.slice(0, 80).trim() + '…'
  if (!cleaned) cleaned = 'Deadline'
  return cleaned
}
