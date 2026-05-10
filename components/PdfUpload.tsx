"use client";

import { useRef, useState } from "react";
import { STORAGE_BUCKET, supabaseBrowser } from "@/lib/supabase";
import {
  extractDeadlinesSmart,
  extractTextFromPdf,
} from "@/lib/extractDeadlines";
import type { Course } from "@/lib/types";

export function PdfUpload({
  course,
  userId,
  onComplete,
}: {
  course: Course;
  userId: string;
  onComplete?: (count: number) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string>("");

  async function handleFile(file: File) {
    setBusy(true);
    setStatus("Uploading PDF…");
    const supabase = supabaseBrowser();
    try {
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]+/g, "_");
      const path = `${userId}/courses/${course.id}/${Date.now()}-${safeName}`;

      const upload = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(path, file, {
          contentType: "application/pdf",
          upsert: false,
        });
      if (upload.error) throw upload.error;

      setStatus("Reading syllabus…");
      const text = await extractTextFromPdf(file);

      // Cap stored syllabus text so the chat prompt stays well within the
      // model's context budget while still covering most syllabi.
      const syllabusForChat = text.slice(0, 60_000);

      const update = await supabase
        .from("courses")
        .update({
          pdf_storage_path: path,
          pdf_file_name: file.name,
          syllabus_text: syllabusForChat,
        })
        .eq("id", course.id);
      if (update.error) throw update.error;

      setStatus("Asking Gemini to extract deadlines…");
      const { deadlines, source } = await extractDeadlinesSmart(text, {
        courseName: course.name,
        fileName: file.name,
      });

      if (deadlines.length === 0) {
        setStatus(
          source === "ai"
            ? "Gemini did not find any deadlines in this syllabus."
            : "No deadlines detected. You can add them manually."
        );
        onComplete?.(0);
        return;
      }

      const rows = deadlines.map((d) => ({
        user_id: userId,
        course_id: course.id,
        title: d.title,
        due_at: d.dueAt.toISOString(),
        category: d.category,
        source_snippet: d.sourceSnippet ?? null,
      }));

      const insert = await supabase.from("deadlines").insert(rows);
      if (insert.error) throw insert.error;

      const label = source === "ai" ? "Gemini" : "Local extractor";
      setStatus(
        `${label} added ${deadlines.length} deadline${deadlines.length === 1 ? "" : "s"}.`
      );
      onComplete?.(deadlines.length);
    } catch (e) {
      console.error(e);
      setStatus(`Error: ${(e as Error).message}`);
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
      />
      <button
        type="button"
        disabled={busy}
        onClick={() => inputRef.current?.click()}
        className="rounded-md border border-ink-200 bg-surface px-3 py-1.5 text-sm font-medium text-ink-700 hover:bg-ink-100 disabled:opacity-60"
      >
        {busy
          ? "Working…"
          : course.pdf_file_name
          ? "Replace syllabus PDF"
          : "Upload syllabus PDF"}
      </button>
      {course.pdf_file_name && !busy && (
        <span className="text-xs text-ink-500">Current: {course.pdf_file_name}</span>
      )}
      {status && <span className="text-xs text-ink-500">{status}</span>}
    </div>
  );
}

export async function addManualDeadline(
  userId: string,
  courseId: string,
  title: string,
  dueAt: Date
) {
  const supabase = supabaseBrowser();
  const { error } = await supabase.from("deadlines").insert({
    user_id: userId,
    course_id: courseId,
    title,
    due_at: dueAt.toISOString(),
  });
  if (error) throw error;
}
