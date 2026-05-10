export type Course = {
  id: string
  user_id: string
  name: string
  color: string
  pdf_storage_path: string | null
  pdf_file_name: string | null
  syllabus_text: string | null
  created_at: string
}

export const DEADLINE_CATEGORIES = [
  'assignment',
  'quiz',
  'exam',
  'project',
  'reading',
  'lab',
  'presentation',
  'other',
] as const

export type DeadlineCategory = (typeof DEADLINE_CATEGORIES)[number]

export type Deadline = {
  id: string
  user_id: string
  course_id: string
  title: string
  due_at: string
  category: DeadlineCategory | null
  source_snippet: string | null
  completed_at: string | null
  google_event_id: string | null
  created_at: string
}

export type UserSettings = {
  user_id: string
  google_refresh_token: string | null
  google_calendar_id: string | null
  google_connected_at: string | null
  show_gcal_events: boolean
  last_sync_at: string | null
  updated_at: string
}

export type GoogleCalendarEvent = {
  id: string
  summary: string
  start: string
  end: string
  allDay: boolean
  htmlLink?: string
  description?: string
}

export const CATEGORY_LABELS: Record<DeadlineCategory, string> = {
  assignment: 'Assignment',
  quiz: 'Quiz',
  exam: 'Exam',
  project: 'Project',
  reading: 'Reading',
  lab: 'Lab',
  presentation: 'Presentation',
  other: 'Other',
}

export type ChatRole = 'user' | 'assistant'

export type ChatMessage = {
  id: string
  user_id: string
  course_id: string | null
  role: ChatRole
  user_name: string | null
  user_photo: string | null
  text: string
  created_at: string
}

export const COURSE_COLORS = [
  '#ef4444',
  '#f97316',
  '#eab308',
  '#22c55e',
  '#14b8a6',
  '#3b82f6',
  '#8b5cf6',
  '#ec4899',
] as const
