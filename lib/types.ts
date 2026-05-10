export type GradeComponent = {
  component: string;
  weight: number;
};

export type Course = {
  id: string;
  user_id: string;
  name: string;
  color: string;
  instructor: string | null;
  semester: string | null;
  office_hours: string | null;
  lecture_topics: string[] | null;
  grade_breakdown: GradeComponent[] | null;
  late_policy: string | null;
  attendance_policy: string | null;
  academic_integrity_policy: string | null;
  pdf_storage_path: string | null;
  pdf_file_name: string | null;
  syllabus_text: string | null;
  created_at: string;
};

export const DEADLINE_CATEGORIES = [
  "assignment",
  "quiz",
  "exam",
  "project",
  "reading",
  "lab",
  "presentation",
  "other",
] as const;

export type DeadlineCategory = (typeof DEADLINE_CATEGORIES)[number];

export type Deadline = {
  id: string;
  user_id: string;
  course_id: string;
  title: string;
  due_at: string; // ISO timestamp from Postgres
  category: DeadlineCategory | null;
  source_snippet: string | null;
  completed_at: string | null;
  google_event_id: string | null;
  created_at: string;
};

export type UserSettings = {
  user_id: string;
  google_refresh_token: string | null;
  google_calendar_id: string | null;
  google_connected_at: string | null;
  show_gcal_events: boolean;
  last_sync_at: string | null;
  updated_at: string;
};

export type GoogleCalendarEvent = {
  id: string;
  summary: string;
  start: string; // ISO date or datetime
  end: string;
  allDay: boolean;
  htmlLink?: string;
  description?: string;
};

export type CalendarEventSource = "deadline" | "google" | "manual";

export type StudyPlanNode = {
  title: string;
  estimateMinutes?: number;
  reason?: string;
  children?: StudyPlanNode[];
};

export type AssistantActionPayload = {
  studyPlan?: StudyPlanNode[];
};

export const CATEGORY_LABELS: Record<DeadlineCategory, string> = {
  assignment: "Assignment",
  quiz: "Quiz",
  exam: "Exam",
  project: "Project",
  reading: "Reading",
  lab: "Lab",
  presentation: "Presentation",
  other: "Other",
};

export type ChatRole = "user" | "assistant";

export type ChatMessage = {
  id: string;
  user_id: string;
  course_id: string | null;
  role: ChatRole;
  user_name: string | null;
  user_photo: string | null;
  text: string;
  created_at: string;
};

export const COURSE_COLORS = [
  "#ef4444", // red
  "#f97316", // orange
  "#eab308", // yellow
  "#22c55e", // green
  "#14b8a6", // teal
  "#3b82f6", // blue
  "#8b5cf6", // violet
  "#ec4899", // pink
] as const;
