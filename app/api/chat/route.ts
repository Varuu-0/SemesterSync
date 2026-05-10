import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { CATEGORY_LABELS, type DeadlineCategory } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

type Body = {
  message?: string;
};

const MODEL = process.env.GEMINI_MODEL ?? "gemini-2.5-flash";
const MAX_SYLLABUS_CHARS_PER_COURSE = 18_000;
const MAX_HISTORY = 12;
const PAST_WINDOW_DAYS = 14;
const FUTURE_WINDOW_DAYS = 120;

type CourseRow = {
  id: string;
  name: string;
  color: string;
  syllabus_text: string | null;
};

type DeadlineRow = {
  id: string;
  course_id: string;
  title: string;
  category: DeadlineCategory | null;
  due_at: string;
  courses: { name: string; color: string } | null;
};

type HistoryRow = {
  role: "user" | "assistant";
  text: string;
  created_at: string;
};

export async function POST(request: Request) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Gemini API key not configured." },
      { status: 501 }
    );
  }

  const supabase = supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const message = (body.message ?? "").trim();
  if (!message) {
    return NextResponse.json({ error: "Empty message." }, { status: 400 });
  }

  const coursesRes = await supabase
    .from("courses")
    .select("id, name, color, syllabus_text")
    .order("name", { ascending: true })
    .returns<CourseRow[]>();
  const courses = coursesRes.data ?? [];

  const now = new Date();
  const lower = new Date(now);
  lower.setDate(lower.getDate() - PAST_WINDOW_DAYS);
  const upper = new Date(now);
  upper.setDate(upper.getDate() + FUTURE_WINDOW_DAYS);

  const deadlinesRes = await supabase
    .from("deadlines")
    .select(
      "id, course_id, title, category, due_at, courses!inner(name, color)"
    )
    .gte("due_at", lower.toISOString())
    .lte("due_at", upper.toISOString())
    .order("due_at", { ascending: true })
    .returns<DeadlineRow[]>();
  const deadlines = deadlinesRes.data ?? [];

  const historyRes = await supabase
    .from("chat_messages")
    .select("role, text, created_at")
    .is("course_id", null)
    .order("created_at", { ascending: false })
    .limit(MAX_HISTORY)
    .returns<HistoryRow[]>();
  const history = (historyRes.data ?? []).slice().reverse();

  const prompt = buildPrompt({
    courses,
    deadlines,
    history,
    message,
    today: now,
  });

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${apiKey}`;
  const requestBody = {
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.4,
      maxOutputTokens: 900,
    },
  };

  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(requestBody),
    });
  } catch (e) {
    return NextResponse.json(
      { error: `Failed to reach Gemini: ${(e as Error).message}` },
      { status: 502 }
    );
  }

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    return NextResponse.json(
      { error: `Gemini error ${res.status}: ${errText.slice(0, 500)}` },
      { status: 502 }
    );
  }

  const json = (await res.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  const reply =
    json.candidates?.[0]?.content?.parts
      ?.map((p) => p.text ?? "")
      .join("")
      .trim() ?? "";

  if (!reply) {
    return NextResponse.json(
      { error: "Gemini returned an empty reply." },
      { status: 502 }
    );
  }

  return NextResponse.json({ reply });
}

function buildPrompt(args: {
  courses: CourseRow[];
  deadlines: DeadlineRow[];
  history: HistoryRow[];
  message: string;
  today: Date;
}) {
  const { courses, deadlines, history, message, today } = args;

  const todayStr = today.toLocaleDateString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const courseListBlock = courses.length
    ? courses.map((c) => `- ${c.name}`).join("\n")
    : "(none yet — the student has not added any courses)";

  const syllabusBlocks = courses
    .filter((c) => c.syllabus_text && c.syllabus_text.trim())
    .map((c) => {
      const trimmed = (c.syllabus_text ?? "").slice(
        0,
        MAX_SYLLABUS_CHARS_PER_COURSE
      );
      return `[${c.name}]\n"""\n${trimmed}\n"""`;
    });

  const syllabiBlock = syllabusBlocks.length
    ? `Syllabi (truncated where long):\n${syllabusBlocks.join("\n\n")}`
    : "No syllabi have been uploaded yet. If the student asks about course content, suggest uploading a PDF on the Courses page.";

  const deadlineLines = deadlines.length
    ? deadlines.map((d) => formatDeadline(d)).join("\n")
    : "(no deadlines recorded in the past 14 days or next 120 days)";

  const historyText = history.length
    ? history
        .map(
          (h) =>
            `${h.role === "assistant" ? "Assistant" : "Student"}: ${h.text}`
        )
        .join("\n")
    : "(no prior conversation)";

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
- Ground every factual claim in the syllabi or deadlines listed above. If the answer isn't there, say so plainly and suggest the next step (e.g. "upload that course's syllabus on the Courses page").
- Never invent dates, weights, policies, or page numbers.
- Use plain prose. No markdown headings.

Respond now.`;
}

function formatDeadline(d: DeadlineRow): string {
  const date = new Date(d.due_at);
  const dateStr = date.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const cat = d.category ? ` [${CATEGORY_LABELS[d.category] ?? d.category}]` : "";
  const courseName = d.courses?.name ?? "Unknown course";
  return `- ${courseName} — ${d.title}${cat} — ${dateStr}`;
}
