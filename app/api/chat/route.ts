import { NextResponse } from "next/server";
import {
  buildChatPrompt,
  type CourseRow,
  type DeadlineRow,
  type HistoryRow,
} from "@/lib/chatPrompt";
import { geminiThinkingGenerationSlice } from "@/lib/geminiGeneration";
import {
  iterateGeminiLineJsonDeltas,
  iterateGeminiSseTextDeltas,
} from "@/lib/geminiStreamParse";
import { supabaseServer } from "@/lib/supabaseServer";
import type { DeadlineCategory } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

type Body = {
  message?: string;
};

const MODEL = process.env.GEMINI_MODEL ?? "gemini-2.5-flash";
const MAX_HISTORY = 12;
const PAST_WINDOW_DAYS = 14;
const FUTURE_WINDOW_DAYS = 120;

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

  const wantsStream = request.headers.get("accept")?.includes("text/event-stream");

  const now = new Date();
  const lower = new Date(now);
  lower.setDate(lower.getDate() - PAST_WINDOW_DAYS);
  const upper = new Date(now);
  upper.setDate(upper.getDate() + FUTURE_WINDOW_DAYS);

  const coursesRes = await supabase
    .from("courses")
    .select("id, name, color, syllabus_text")
    .order("name", { ascending: true })
    .returns<CourseRow[]>();
  const courses = coursesRes.data ?? [];

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

  const prompt = buildChatPrompt({
    courses,
    deadlines,
    history,
    message,
    today: now,
  });

  const geminiBody = {
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.4,
      maxOutputTokens: 900,
      ...geminiThinkingGenerationSlice(),
    },
  };

  if (wantsStream) {
    return streamChatResponse({
      supabase,
      userId: user.id,
      apiKey,
      geminiBody,
    });
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${apiKey}`;
  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(geminiBody),
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

async function streamChatResponse(args: {
  supabase: ReturnType<typeof supabaseServer>;
  userId: string;
  apiKey: string;
  geminiBody: Record<string, unknown>;
}) {
  const { supabase, userId, apiKey, geminiBody } = args;

  const streamUrl = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:streamGenerateContent?key=${encodeURIComponent(apiKey)}&alt=sse`;

  let geminiRes: Response;
  try {
    geminiRes = await fetch(streamUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(geminiBody),
    });
  } catch (e) {
    return NextResponse.json(
      { error: `Failed to reach Gemini: ${(e as Error).message}` },
      { status: 502 }
    );
  }

  if (!geminiRes.ok || !geminiRes.body) {
    const errText = await geminiRes.text().catch(() => "");
    return NextResponse.json(
      { error: `Gemini error ${geminiRes.status}: ${errText.slice(0, 500)}` },
      { status: 502 }
    );
  }

  const encoder = new TextEncoder();

  const ct = geminiRes.headers.get("content-type") ?? "";
  const useSse =
    ct.includes("text/event-stream") || ct.includes("event-stream");

  const readable = new ReadableStream({
    async start(controller) {
      let assembled = "";
      try {
        const deltas = useSse
          ? iterateGeminiSseTextDeltas(geminiRes.body!)
          : iterateGeminiLineJsonDeltas(geminiRes.body!);
        for await (const delta of deltas) {
          assembled += delta;
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ delta })}\n\n`)
          );
        }

        const trimmed = assembled.trim();
        if (!trimmed) {
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ error: "Gemini returned an empty reply." })}\n\n`
            )
          );
          controller.close();
          return;
        }

        const assistantInsert = await supabase
          .from("chat_messages")
          .insert({
            user_id: userId,
            course_id: null,
            role: "assistant",
            user_name: "SemesterSync AI",
            user_photo: null,
            text: trimmed,
          })
          .select()
          .single();

        if (assistantInsert.error) throw assistantInsert.error;

        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({
              done: true,
              message: assistantInsert.data,
            })}\n\n`
          )
        );
        controller.close();
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ error: msg })}\n\n`)
        );
        controller.close();
      }
    },
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
