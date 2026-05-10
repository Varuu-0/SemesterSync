"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { DeadlineCategory } from "./types";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

let _client: SupabaseClient | undefined;

/**
 * Lazy singleton browser Supabase client.
 * Throws a friendly error if env vars are missing so the UI can surface it.
 */
export function supabaseBrowser(): SupabaseClient {
  if (_client) return _client;
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error(
      "Supabase config missing. Copy .env.local.example to .env.local and fill in NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY."
    );
  }
  _client = createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  return _client;
}

export const STORAGE_BUCKET = "syllabi";

export async function addCourseRow(userId: string, name: string, color: string) {
  const { error } = await supabaseBrowser().from("courses").insert({
    user_id: userId,
    name,
    color,
  });
  if (error) throw error;
}

export async function removeCourseRow(courseId: string) {
  const { error } = await supabaseBrowser().from("courses").delete().eq("id", courseId);
  if (error) throw error;
}

export async function toggleDeadlineCompletionRow(deadlineId: string, complete: boolean) {
  const { error } = await supabaseBrowser()
    .from("deadlines")
    .update({ completed_at: complete ? new Date().toISOString() : null })
    .eq("id", deadlineId);
  if (error) throw error;
}

export async function deleteDeadlineRow(deadlineId: string) {
  const { error } = await supabaseBrowser().from("deadlines").delete().eq("id", deadlineId);
  if (error) throw error;
}

export async function addManualDeadlineRow(args: {
  userId: string;
  courseId: string;
  title: string;
  dueAt: Date;
  category?: DeadlineCategory;
}) {
  const { userId, courseId, title, dueAt, category } = args;
  const { error } = await supabaseBrowser().from("deadlines").insert({
    user_id: userId,
    course_id: courseId,
    title,
    due_at: dueAt.toISOString(),
    category: category ?? "other",
    event_type: "manual",
  });
  if (error) throw error;
}
