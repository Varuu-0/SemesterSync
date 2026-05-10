import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import {
  compactSyllabusWhitespace,
  geminiThinkingGenerationSlice,
} from "@/lib/geminiGeneration";
import { DEADLINE_CATEGORIES } from "@/lib/types";

const extractDeadlinesBodySchema = z.object({
  text: z.string().max(120_000),
  courseName: z.string().max(400).optional(),
  fileName: z.string().max(400).optional(),
  referenceDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD")
    .optional(),
});

export const runtime = "nodejs";
export const maxDuration = 60;

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
  gradeBreakdown?: Array<{
    component: string;
    weight: number | string;
  }>;
};

/** Fewer input tokens → faster API calls; syllabi rarely need more than ~48k chars. */
function maxSyllabusInputChars(): number {
  const raw = process.env.GEMINI_MAX_SYLLABUS_CHARS?.trim();
  const parsed = raw ? parseInt(raw, 10) : NaN;
  const fallback = 48_000;
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.min(parsed, 120_000);
}

const MODEL = process.env.GEMINI_MODEL ?? "gemini-2.5-flash";
// Allow a deadline to fall up to this many days outside the inferred term
// before we drop it as a hallucination.
const TERM_SLACK_DAYS = 21;
const MAX_GEMINI_RETRIES = 3;

export async function POST(request: Request) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Gemini API key not configured." },
      { status: 501 }
    );
  }

  let bodyJson: unknown;
  try {
    bodyJson = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsedBody = extractDeadlinesBodySchema.safeParse(bodyJson);
  if (!parsedBody.success) {
    const issue = parsedBody.error.flatten().fieldErrors;
    const hint =
      issue.text?.[0] ??
      issue.referenceDate?.[0] ??
      "Check syllabus text size and date format (YYYY-MM-DD).";
    return NextResponse.json(
      {
        error:
          "We couldn’t read that request. If your syllabus is huge, try a smaller PDF or trim pasted text.",
        detail: hint,
      },
      { status: 400 }
    );
  }

  const body = parsedBody.data;
  const text = body.text.trim();
  if (!text) {
    return NextResponse.json({ error: "Empty syllabus text." }, { status: 400 });
  }

  const compacted = compactSyllabusWhitespace(text);
  const trimmed = compacted.slice(0, maxSyllabusInputChars());
  const referenceDate =
    body.referenceDate || new Date().toISOString().slice(0, 10);
  const courseName = body.courseName?.trim() || "this course";
  const fileName = body.fileName?.trim() || "";
  const cacheKey = hashSyllabus(trimmed);
  const cache = createSyllabusCacheClient();

  if (cache) {
    try {
      const { data } = await cache
        .from("syllabus_cache")
        .select("parsed_json")
        .eq("content_hash", cacheKey)
        .single();
      if (data?.parsed_json) {
        return NextResponse.json(data.parsed_json);
      }
    } catch {
      // Cache is best-effort. If table doesn't exist, we continue to Gemini.
    }
  }

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
      maxOutputTokens: 8192,
      ...geminiThinkingGenerationSlice(),
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
          gradeBreakdown: {
            type: "ARRAY",
            items: {
              type: "OBJECT",
              properties: {
                component: { type: "STRING" },
                weight: { type: "NUMBER" },
              },
              required: ["component", "weight"],
              propertyOrdering: ["component", "weight"],
            },
          },
        },
        required: ["term", "deadlines", "gradeBreakdown"],
        propertyOrdering: ["term", "deadlines", "gradeBreakdown"],
      },
    },
  };

  let res: Response;
  try {
    res = await fetchGeminiWithRetry(url, requestBody);
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

  const geminiRaw =
    json.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ??
    "";
  if (!geminiRaw) {
    return NextResponse.json({ deadlines: [], term: null, gradeBreakdown: [] });
  }

  let parsed: ModelResponse;
  try {
    parsed = JSON.parse(extractJsonObject(geminiRaw));
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
  const gradeBreakdown = normalizeGradeBreakdown(parsed.gradeBreakdown ?? []);

  const payload = {
    deadlines: cleaned,
    gradeBreakdown,
    term: {
      label: termLabel,
      termStart: termStart ? termStart.toISOString().slice(0, 10) : null,
      termEnd: termEnd ? termEnd.toISOString().slice(0, 10) : null,
    },
  };

  if (cache) {
    void cache.from("syllabus_cache").upsert(
      { content_hash: cacheKey, parsed_json: payload },
      { onConflict: "content_hash" }
    );
  }

  return NextResponse.json(payload);
}

async function fetchGeminiWithRetry(
  url: string,
  requestBody: Record<string, unknown>
) {
  let waitMs = 500;
  for (let attempt = 0; attempt <= MAX_GEMINI_RETRIES; attempt++) {
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(requestBody),
    });
    if (res.status !== 429 || attempt === MAX_GEMINI_RETRIES) return res;
    await new Promise((resolve) => setTimeout(resolve, waitMs));
    waitMs *= 2;
  }
  throw new Error("Unreachable retry state.");
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

STEP 3 — Extract grading breakdown percentages.
- Return gradeBreakdown as an array of { component, weight }.
- Include every grading component where a percentage weight is stated.
- Convert weights to numbers (e.g. 25 not "25%").
- Ignore non-graded informational percentages.

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

function normalizeGradeBreakdown(
  raw: Array<{ component: string; weight: number | string }>
) {
  return raw
    .map((g) => ({
      component: (g.component ?? "").trim().slice(0, 120),
      weight:
        typeof g.weight === "number"
          ? g.weight
          : Number.parseFloat(String(g.weight)),
    }))
    .filter(
      (g) => g.component.length > 0 && Number.isFinite(g.weight) && g.weight > 0
    )
    .map((g) => ({ component: g.component, weight: Math.round(g.weight * 100) / 100 }));
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

function hashSyllabus(text: string): string {
  const normalized = text.toLowerCase().replace(/\s+/g, " ").trim();
  return createHash("sha256").update(normalized).digest("hex");
}

function createSyllabusCacheClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRole) return null;
  return createClient(url, serviceRole, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function extractJsonObject(raw: string): string {
  const noFence = raw.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
  const start = noFence.indexOf("{");
  const end = noFence.lastIndexOf("}");
  if (start >= 0 && end > start) {
    return noFence.slice(start, end + 1);
  }
  return noFence;
}
