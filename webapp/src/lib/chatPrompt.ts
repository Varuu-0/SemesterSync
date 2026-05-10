import { CATEGORY_LABELS, type DeadlineCategory } from '@/lib/types'

export const MAX_SYLLABUS_CHARS_PER_COURSE = 18_000

export type CourseRow = {
  id: string
  name: string
  color: string
  syllabus_text: string | null
}

export type DeadlineRow = {
  id: string
  course_id: string
  title: string
  category: DeadlineCategory | null
  due_at: string
  courses: { name: string; color: string } | null
}

export type HistoryRow = {
  role: 'user' | 'assistant'
  text: string
  created_at: string
}

export function buildChatPrompt(args: {
  courses: CourseRow[]
  deadlines: DeadlineRow[]
  history: HistoryRow[]
  message: string
  today: Date
}): string {
  const { courses, deadlines, history, message, today } = args

  const todayStr = today.toLocaleDateString(undefined, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  const courseListBlock = courses.length
    ? courses.map((c) => `- ${c.name}`).join('\n')
    : '(none yet — the student has not added any courses)'

  const syllabusBlocks = courses
    .filter((c) => c.syllabus_text && c.syllabus_text.trim())
    .map((c) => {
      const trimmed = (c.syllabus_text ?? '').slice(0, MAX_SYLLABUS_CHARS_PER_COURSE)
      return `[${c.name}]\n"""\n${trimmed}\n"""`
    })

  const syllabiBlock = syllabusBlocks.length
    ? `Syllabi (truncated where long):\n${syllabusBlocks.join('\n\n')}`
    : 'No syllabi have been uploaded yet. If the student asks about course content, suggest uploading a PDF on the Courses page.'

  const deadlineLines = deadlines.length
    ? deadlines.map((d) => formatDeadlineLine(d)).join('\n')
    : '(no deadlines recorded in the past 14 days or next 4 months)'

  const historyText = history.length
    ? history.map((h) => `${h.role === 'assistant' ? 'Assistant' : 'Student'}: ${h.text}`).join('\n')
    : '(no prior conversation)'

  return `You are SemesterSync's AI study assistant. You help one student plan across all of their courses.

Today is ${todayStr}.

The student's courses (${courses.length}):
${courseListBlock}

${syllabiBlock}

All deadlines (chronological, past 2 weeks through next 4 months):
${deadlineLines}

Recent conversation:
${historyText}

Student: ${message}

Reply rules:
- Be concise: aim for 2-6 sentences unless the student explicitly asks for detail.
- When listing multiple deadlines, use a short bullet list with course name, title, and date ("CP372 — Project 1, Fri Jan 23").
- Always disambiguate by course when more than one course is involved.
- Ground every factual claim in the syllabi or deadlines listed above. If the answer isn't there, say so plainly and suggest the next step.
- Never invent dates, weights, policies, or page numbers.
- Use plain prose. No markdown headings.

Respond now.`
}

function formatDeadlineLine(d: DeadlineRow): string {
  const date = new Date(d.due_at)
  const dateStr = date.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
  const cat = d.category ? ` [${CATEGORY_LABELS[d.category as keyof typeof CATEGORY_LABELS] ?? d.category}]` : ''
  const courseName = d.courses?.name ?? 'Unknown course'
  return `- ${courseName} — ${d.title}${cat} — ${dateStr}`
}
