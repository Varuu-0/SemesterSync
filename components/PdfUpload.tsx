"use client";

import { useRef, useState } from "react";
import { STORAGE_BUCKET, supabaseBrowser } from "@/lib/supabase";
import {
  extractDeadlinesSmart,
  extractTextFromPdf,
} from "@/lib/extractDeadlines";
import type { Course } from "@/lib/types";

type Phase =
  | "idle"
  | "upload"
  | "read"
  | "save_course"
  | "ai"
  | "deadlines"
  | "done";

const STEPS: { phase: Exclude<Phase, "idle" | "done">; label: string }[] = [
  { phase: "upload", label: "Upload file" },
  { phase: "read", label: "Read PDF text" },
  { phase: "save_course", label: "Save syllabus" },
  { phase: "ai", label: "Extract deadlines (AI)" },
  { phase: "deadlines", label: "Save to calendar" },
];

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
  const [phase, setPhase] = useState<Phase>("idle");
  const [status, setStatus] = useState<string>("");

  async function handleFile(file: File) {
    setBusy(true);
    setPhase("upload");
    setStatus("");
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

      setPhase("read");
      const text = await extractTextFromPdf(file);

      const syllabusForChat = text.slice(0, 60_000);

      setPhase("save_course");
      const update = await supabase
        .from("courses")
        .update({
          pdf_storage_path: path,
          pdf_file_name: file.name,
          syllabus_text: syllabusForChat,
        })
        .eq("id", course.id);
      if (update.error) throw update.error;

      setPhase("ai");
      const { deadlines, source } = await extractDeadlinesSmart(text, {
        courseName: course.name,
        fileName: file.name,
      });

      if (deadlines.length === 0) {
        setPhase("done");
        setStatus(
          source === "ai"
            ? "Gemini did not find any deadlines in this syllabus."
            : "No deadlines detected. You can add them manually."
        );
        onComplete?.(0);
        return;
      }

      setPhase("deadlines");
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

      setPhase("done");
      const label = source === "ai" ? "Gemini" : "Local extractor";
      setStatus(
        `${label} added ${deadlines.length} deadline${deadlines.length === 1 ? "" : "s"}.`
      );
      onComplete?.(deadlines.length);
    } catch (e) {
      console.error(e);
      setPhase("idle");
      setStatus(`Error: ${(e as Error).message}`);
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="flex flex-col gap-3">
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
          <span className="text-xs text-ink-500">
            Current: {course.pdf_file_name}
          </span>
        )}
        {status && !busy && (
          <span className="text-xs text-ink-600">{status}</span>
        )}
      </div>

      {busy && (
        <div className="rounded-xl border border-ink-200 bg-surface p-4 shadow-soft">
          <div className="mb-3 flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-40" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
            </span>
            <span className="text-xs font-semibold uppercase tracking-wide text-ink-500">
              Processing syllabus
            </span>
          </div>
          <ol className="space-y-2.5">
            {STEPS.map((step, i) => {
              const currentOrder =
                phase === "idle" || phase === "done"
                  ? -1
                  : STEPS.findIndex((s) => s.phase === phase);
              const allDone = phase === "done";
              const done = allDone || (currentOrder >= 0 && i < currentOrder);
              const current = !allDone && currentOrder === i;

              return (
                <li key={step.phase} className="flex items-center gap-3 text-sm">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center">
                    {done ? (
                      <CheckIcon />
                    ) : current ? (
                      <Spinner />
                    ) : (
                      <span className="h-2 w-2 rounded-full bg-ink-300" />
                    )}
                  </span>
                  <span
                    className={
                      current
                        ? "font-medium text-ink-900"
                        : done
                          ? "text-ink-600"
                          : "text-ink-400"
                    }
                  >
                    {step.label}
                  </span>
                  {current && (
                    <span className="ml-auto h-1.5 max-w-[100px] flex-1 overflow-hidden rounded-full bg-ink-100">
                      <span className="block h-full w-full animate-pulse rounded-full bg-primary/35" />
                    </span>
                  )}
                </li>
              );
            })}
          </ol>
          <p className="mt-3 text-xs text-ink-500">
            Large PDFs take longer to read; AI extraction usually runs a few
            seconds after upload finishes.
          </p>
        </div>
      )}
    </div>
  );
}

function CheckIcon() {
  return (
    <svg
      className="h-5 w-5 text-emerald-600"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

function Spinner() {
  return (
    <svg
      className="h-5 w-5 animate-spin text-primary"
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
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
