import { NextResponse } from "next/server";
import { DEADLINE_CATEGORIES } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

type Body = {
  text: string;
  courseName?: string;
  fileName?: string;
  referenceDate?: string;
};

type ModelResponse = {
  term?: {
    label?: string;
    termStart?: string | null;
    termEnd?: string | null;
  };
  deadlines?: Array<{
    title: string;
    category: string;
    dueDate: string;
    sourceSnippet?: string;
  }>;
};

const MAX_INPUT_CHARS = 80_000;
const MODEL = process.env.GEMINI_MODEL ?? "gemini-2.5-flash";
// Allow a deadline to fall up to this many days outside the inferred term
// before we drop it as a hallucination.
const TERM_SLACK_DAYS = 21;

export async function POST(request: Request) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Gemini API key not configured." },
      { status: 501 }
    );
  }

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const text = (body.text ?? "").trim();
  if (!text) {
    return NextResponse.json({ error: "Empty syllabus text." }, { status: 400 });
  }

  const trimmed = text.slice(0, MAX_INPUT_CHARS);
  const referenceDate =
    body.referenceDate || new Date().toISOString().slice(0, 10);
  const courseName = body.courseName?.trim() || "this course";
  const fileName = body.fileName?.trim() || "";

  const prompt = buildPrompt({
    text: trimmed,
    courseName,
    fileName,
    referenceDate,
  });

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${apiKey}`;

  const requestBody = {
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.05,
      responseMimeType: "application/json",
      responseSchema: {
        type: "OBJECT",
        properties: {
          term: {
            type: "OBJECT",
            properties: {
              label: { type: "STRING" },
              termStart: { type: "STRING", nullable: true },
              termEnd: { type: "STRING", nullable: true },
            },
            propertyOrdering: ["label", "termStart", "termEnd"],
          },
          deadlines: {
            type: "ARRAY",
            items: {
              type: "OBJECT",
              properties: {
                title: { type: "STRING" },
                category: {
                  type: "STRING",
                  enum: [...DEADLINE_CATEGORIES],
                },
                dueDate: { type: "STRING" },
                sourceSnippet: { type: "STRING" },
              },
              required: ["title", "category", "dueDate"],
              propertyOrdering: ["title", "category", "dueDate", "sourceSnippet"],
            },
          },
        },
        required: ["term", "deadlines"],
        propertyOrdering: ["term", "deadlines"],
      },
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

  const raw =
    json.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ??
    "";
  if (!raw) {
    return NextResponse.json({ deadlines: [], term: null });
  }

  let parsed: ModelResponse;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return NextResponse.json(
      { error: "Gemini returned invalid JSON." },
      { status: 502 }
    );
  }

  const termStart = parseDate(parsed.term?.termStart ?? null);
  const termEnd = parseDate(parsed.term?.termEnd ?? null);
  const termLabel = parsed.term?.label?.trim() || null;

  const cleaned = (parsed.deadlines ?? [])
    .map((d) => normalize(d, termStart, termEnd))
    .filter((d): d is NormalizedDeadline => d !== null);

  return NextResponse.json({
    deadlines: cleaned,
    term: {
      label: termLabel,
      termStart: termStart ? termStart.toISOString().slice(0, 10) : null,
      termEnd: termEnd ? termEnd.toISOString().slice(0, 10) : null,
    },
  });
}

type NormalizedDeadline = {
  title: string;
  category: string;
  dueAt: string;
  sourceSnippet?: string;
};

function buildPrompt(args: {
  text: string;
  courseName: string;
  fileName: string;
  referenceDate: string;
}) {
  const fileLine = args.fileName ? `File name: ${args.fileName}\n` : "";
  return `You extract assignment deadlines from a course syllabus.

Course: ${args.courseName}
${fileLine}Reference date (today): ${args.referenceDate}

CRITICAL: today's date is ONLY for resolving "this Friday" style language. Never use it as the year for dates that already have a year or term marker. The syllabus is the source of truth.

STEP 1 — Identify the academic term.
Look at the file name, course header, schedule headings, the first/last weeks of the schedule, and any phrase like "Fall 2025", "Winter 2026", "Spring 2026", "Summer 2026".

Common Canadian/US academic shorthand often appears in file names:
  • F25 / Fall 2025  ->  Sep 2 2025 to Dec 5 2025
  • W26 / Winter 2026 -> Jan 5 2026 to Apr 10 2026
  • S26 / Spring 2026 -> Jan / May
  • Summer 2026 -> May 2026 to Aug 2026

Examples:
  - Filename "CP372_..._W26 - Ver4.pdf" -> term is Winter 2026, anchor year = 2026 for any month between Jan and Apr.
  - Course header "Fall 2025 — CS 374" with a schedule starting "Sep 8" -> term is Fall 2025, anchor year = 2025.

Output term.label as a short human string (e.g. "Winter 2026"). Output termStart and termEnd as YYYY-MM-DD using either explicit dates from the syllabus or the typical bounds for that term. Use null only when truly unknown.

STEP 2 — Extract every graded deliverable that has an explicit due date in the syllabus.
- Use the LITERAL date written in the syllabus. Read the day, month, and (if present) year exactly.
- If only month + day is given (e.g. "Jan 15", "Feb 10"), assign the year so the date falls within the term identified in Step 1.
- A schedule with rows like "Week 1 — Jan 6 — Lecture: Intro" gives you a literal date (2026-01-06 in W26). Do not bump these rows to "today + N weeks".
- Skip rows that have no graded deliverable (lectures, holidays, study breaks, office hours).
- Skip dates that fall more than ~3 weeks outside the inferred term — those are almost certainly extraction errors.
- If the syllabus mentions both a "due date" and a "released" date for the same item, use the due date.

For each deadline:
- title: Title Case, no extra context, no trailing punctuation. Examples: "Project 1 Proposal", "Midterm Exam", "Reading Quiz 3", "HW 2".
- category: one of ${DEADLINE_CATEGORIES.map((c) => `"${c}"`).join(", ")}.
- dueDate: ISO 8601. Use YYYY-MM-DD when no specific time is given, otherwise YYYY-MM-DDTHH:mm.
- sourceSnippet: a short verbatim quote from the syllabus that proves this entry (max 240 chars).

De-duplicate identical items. Sort by dueDate ascending.

Syllabus text:
"""
${args.text}
"""`;
}

function normalize(
  d: { title: string; category: string; dueDate: string; sourceSnippet?: string },
  termStart: Date | null,
  termEnd: Date | null
): NormalizedDeadline | null {
  const title = (d.title ?? "").trim();
  if (!title) return null;
  const date = parseDate(d.dueDate);
  if (!date) return null;

  // If we have a term window, drop hallucinated dates that fall well outside it.
  if (termStart && termEnd) {
    const lower = addDays(termStart, -TERM_SLACK_DAYS).getTime();
    const upper = addDays(termEnd, TERM_SLACK_DAYS).getTime();
    const t = date.getTime();
    if (t < lower || t > upper) return null;
  }

  const cat = (DEADLINE_CATEGORIES as readonly string[]).includes(d.category)
    ? d.category
    : "other";
  return {
    title: title.slice(0, 120),
    category: cat,
    dueAt: date.toISOString(),
    sourceSnippet: d.sourceSnippet?.slice(0, 280),
  };
}

function parseDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const v = value.trim();
  if (!v) return null;
  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(v);
  const d = new Date(dateOnly ? `${v}T12:00:00` : v);
  if (Number.isNaN(d.getTime())) return null;
  const year = d.getFullYear();
  const now = new Date().getFullYear();
  if (year < now - 3 || year > now + 4) return null;
  return d;
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}
