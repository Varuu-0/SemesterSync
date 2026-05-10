import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabaseServer";

const bodySchema = z.object({
  events: z
    .array(
      z.object({
        title: z.string().min(1).max(120),
        dueAt: z.string().min(1),
        courseId: z.string().uuid().nullable().optional(),
        category: z.string().optional(),
        sourceSnippet: z.string().max(240).optional(),
      })
    )
    .min(1)
    .max(30),
  defaultCourseId: z.string().uuid().nullable().optional(),
});

export async function POST(request: Request) {
  const supabase = supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid events payload." }, { status: 400 });
  }

  const { events, defaultCourseId } = parsed.data;
  const courseId = defaultCourseId ?? null;

  const rows = events
    .map((event) => {
      const due = new Date(event.dueAt);
      if (Number.isNaN(due.getTime())) return null;
      const targetCourseId = event.courseId ?? courseId;
      if (!targetCourseId) return null;
      return {
        user_id: user.id,
        course_id: targetCourseId,
        title: event.title.trim(),
        due_at: due.toISOString(),
        category: event.category ?? "other",
        source_snippet: event.sourceSnippet ?? null,
        event_type: "manual",
      };
    })
    .filter((row): row is NonNullable<typeof row> => row !== null);

  if (rows.length === 0) {
    return NextResponse.json(
      { error: "No valid events to create. Select a course or include courseId." },
      { status: 400 }
    );
  }

  const courseIds = [...new Set(rows.map((r) => r.course_id))];
  const { data: ownedCourses, error: ownErr } = await supabase
    .from("courses")
    .select("id")
    .eq("user_id", user.id)
    .in("id", courseIds);
  if (ownErr) {
    return NextResponse.json({ error: ownErr.message }, { status: 500 });
  }
  if ((ownedCourses?.length ?? 0) !== courseIds.length) {
    return NextResponse.json(
      { error: "One or more courses are invalid or do not belong to you." },
      { status: 403 }
    );
  }

  const { data, error } = await supabase.from("deadlines").insert(rows).select("*");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ created: data ?? [], count: data?.length ?? 0 });
}
