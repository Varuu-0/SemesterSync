import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabaseServer";

const requestSchema = z.object({
  goal: z.string().min(3).max(500),
});

const planNodeSchema: z.ZodType<{
  title: string;
  estimateMinutes?: number;
  reason?: string;
  children?: Array<{
    title: string;
    estimateMinutes?: number;
    reason?: string;
    children?: any[];
  }>;
}> = z.lazy(() =>
  z.object({
    title: z.string().min(1).max(160),
    estimateMinutes: z.number().int().positive().max(600).optional(),
    reason: z.string().max(240).optional(),
    children: z.array(planNodeSchema).max(8).optional(),
  })
);

export async function POST(request: Request) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Gemini API key not configured." }, { status: 501 });
  }

  const supabase = supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid goal." }, { status: 400 });
  }

  const { data: courses } = await supabase
    .from("courses")
    .select("id,name")
    .eq("user_id", user.id)
    .order("name", { ascending: true });
  const { data: upcoming } = await supabase
    .from("deadlines")
    .select("title,due_at,course_id")
    .eq("user_id", user.id)
    .is("completed_at", null)
    .order("due_at", { ascending: true })
    .limit(40);

  const prompt = `Build an agentic study plan as JSON tree only.
Goal: ${parsed.data.goal}
Courses: ${(courses ?? []).map((c) => c.name).join(", ") || "none"}
Upcoming deadlines: ${(upcoming ?? [])
    .map((d) => `${d.title} (${new Date(d.due_at).toLocaleDateString()})`)
    .join(", ") || "none"}

Return JSON with this shape:
{"plan":[{"title":"Task","estimateMinutes":45,"reason":"...","children":[...]}]}
Rules:
- Return only JSON.
- Keep 2-4 depth levels max.
- 5-12 top-level tasks.
- estimateMinutes optional but preferred.
`;

  const model = process.env.GEMINI_MODEL ?? "gemini-2.5-flash-lite";
  const rawPlannerMax = Number(process.env.GEMINI_PLANNER_MAX_TOKENS ?? "8192");
  const plannerMaxTokens =
    Number.isFinite(rawPlannerMax) && rawPlannerMax > 0 ? Math.floor(rawPlannerMax) : 8192;
  const prompts = [
    prompt,
    `${prompt}
Strict: Output one JSON object only. Escape double quotes inside strings as \\". No markdown, no commentary.`,
  ];

  const compactPrompt = `${prompt}
Strict: Output one JSON object only. Escape double quotes inside strings as \\".
To stay within limits: at most 8 top-level tasks, at most 3 children per node, reasons max 80 characters, depth at most 3 levels (root → child → leaf).`;

  const callGemini = async (promptText: string, maxOutputTokens: number) => {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: promptText }] }],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens,
            responseMimeType: "application/json",
          },
        }),
      }
    );

    if (!res.ok) {
      const err = await res.text().catch(() => "");
      return {
        ok: false as const,
        response: NextResponse.json(
          { error: `Planner generation failed: ${err.slice(0, 300)}` },
          { status: 502 }
        ),
      };
    }

    const json = (await res.json()) as {
      candidates?: Array<{
        finishReason?: string;
        content?: { parts?: Array<{ text?: string }> };
      }>;
    };
    const candidate = json.candidates?.[0];
    const finishReason = candidate?.finishReason;
    const raw =
      candidate?.content?.parts?.map((p) => p.text ?? "").join("").trim() ?? "";
    if (!raw) {
      return {
        ok: false as const,
        response: NextResponse.json({ error: "Empty planner response." }, { status: 502 }),
      };
    }

    return { ok: true as const, raw, finishReason };
  };

  const tryParsePlan = (
    raw: string
  ):
    | { ok: true; plan: z.infer<typeof planNodeSchema>[] }
    | { ok: false; reason: "json" | "schema" } => {
    let parsedJson: { plan?: unknown[] };
    try {
      parsedJson = JSON.parse(extractJsonObject(raw)) as { plan?: unknown[] };
    } catch {
      return { ok: false, reason: "json" };
    }
    const nodes = z.array(planNodeSchema).max(20).safeParse(parsedJson.plan ?? []);
    if (!nodes.success) return { ok: false, reason: "schema" };
    return { ok: true, plan: nodes.data };
  };

  const last = {
    raw: "",
    failure: "json" as "json" | "schema",
    finishReason: undefined as string | undefined,
  };

  const runAttempts = async (attempts: Array<{ text: string; maxOutputTokens: number }>) => {
    for (const { text, maxOutputTokens } of attempts) {
      const gen = await callGemini(text, maxOutputTokens);
      if (!gen.ok) return { done: true as const, response: gen.response };
      last.raw = gen.raw;
      last.finishReason = gen.finishReason;
      const parsedPlan = tryParsePlan(gen.raw);
      if (parsedPlan.ok) return { done: true as const, response: NextResponse.json({ plan: parsedPlan.plan }) };
      last.failure = parsedPlan.reason;
    }
    return { done: false as const };
  };

  const first = await runAttempts(
    prompts.map((text) => ({ text, maxOutputTokens: plannerMaxTokens }))
  );
  if (first.done) return first.response;

  if (last.failure === "json" && last.finishReason === "MAX_TOKENS") {
    const compact = await runAttempts([{ text: compactPrompt, maxOutputTokens: plannerMaxTokens }]);
    if (compact.done) return compact.response;
  }

  console.error(
    "Planner parse failed after retry:",
    last.failure,
    last.finishReason,
    last.raw.slice(0, 600)
  );
  let errorMessage: string;
  if (last.failure === "schema") {
    errorMessage = "The planner returned an unexpected structure. Please try again.";
  } else if (last.finishReason === "MAX_TOKENS") {
    errorMessage =
      "The study plan was too long and got cut off. Try a shorter goal or fewer courses in context.";
  } else {
    errorMessage = "The planner response was not valid JSON. Please try again.";
  }
  return NextResponse.json({ error: errorMessage }, { status: 502 });
}

function extractJsonObject(raw: string) {
  const noFence = raw.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
  const start = noFence.indexOf("{");
  const end = noFence.lastIndexOf("}");
  if (start >= 0 && end > start) return noFence.slice(start, end + 1);
  return noFence;
}
