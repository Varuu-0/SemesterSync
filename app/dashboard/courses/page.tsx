"use client";

import { useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { CourseForm } from "@/components/CourseForm";
import { PdfUpload } from "@/components/PdfUpload";
import { STORAGE_BUCKET, supabaseBrowser } from "@/lib/supabase";
import { useCourses, useDeadlines } from "@/lib/hooks";
import type { Course } from "@/lib/types";

export default function CoursesPage() {
  const { user } = useAuth();
  const { courses } = useCourses(user?.id);
  const { deadlines } = useDeadlines(user?.id);
  const [busy, setBusy] = useState(false);

  if (!user) return null;

  async function addCourse(name: string, color: string) {
    if (!user) return;
    setBusy(true);
    try {
      const supabase = supabaseBrowser();
      const { error } = await supabase
        .from("courses")
        .insert({ user_id: user.id, name, color });
      if (error) throw error;
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function deleteCourse(course: Course) {
    if (!user) return;
    if (!confirm(`Delete ${course.name} and all its deadlines?`)) return;

    const supabase = supabaseBrowser();

    // Cascade in DB removes deadlines + chat_messages; we still need to clean
    // up the bucket object since storage isn't tied to the row.
    if (course.pdf_storage_path) {
      const { error: rmError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .remove([course.pdf_storage_path]);
      if (rmError) console.warn("Failed to remove PDF:", rmError.message);
    }

    const { error } = await supabase.from("courses").delete().eq("id", course.id);
    if (error) alert(error.message);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink-900">Courses</h1>
        <p className="mt-1 text-sm text-ink-600">
          Add a course, pick a color, then upload its syllabus PDF. We will scan it for due dates
          and drop them on your calendar.
        </p>
      </div>

      <CourseForm onSubmit={addCourse} busy={busy} />

      <div className="space-y-3">
        {courses.length === 0 ? (
          <div className="rounded-xl border border-dashed border-ink-200 bg-surface p-8 text-center text-sm text-ink-500">
            No courses yet. Add one above to get started.
          </div>
        ) : (
          courses.map((course) => {
            const count = deadlines.filter((d) => d.course_id === course.id).length;
            return (
              <div
                key={course.id}
                className="flex flex-col gap-3 rounded-xl border border-ink-200 bg-surface p-4 shadow-soft sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex items-center gap-3">
                  <span
                    className="h-3 w-3 rounded-full"
                    style={{ background: course.color }}
                  />
                  <div>
                    <div className="font-medium text-ink-900">{course.name}</div>
                    <div className="text-xs text-ink-500">
                      {count} deadline{count === 1 ? "" : "s"}
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <PdfUpload course={course} userId={user.id} />
                  <button
                    type="button"
                    onClick={() => deleteCourse(course)}
                    className="rounded-md border border-red-200 bg-surface px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50"
                  >
                    Delete
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
