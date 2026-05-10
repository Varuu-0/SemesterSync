"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useAuth } from "@/components/AuthProvider";
import { ChatPanel } from "@/components/ChatPanel";
import { useCourses, useDeadlines } from "@/lib/hooks";

export default function ChatPage() {
  const { user } = useAuth();
  const { courses } = useCourses(user?.id);
  const { deadlines } = useDeadlines(user?.id);

  const stats = useMemo(
    () => ({
      courseCount: courses.length,
      syllabusCount: courses.filter((c) => c.syllabus_text && c.syllabus_text.length > 0)
        .length,
      deadlineCount: deadlines.length,
    }),
    [courses, deadlines]
  );

  if (!user) return null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink-900">Assistant</h1>
        <p className="mt-1 text-sm text-ink-600">
          A single AI study assistant grounded in every syllabus you&apos;ve uploaded
          and every deadline on your calendar. Ask about planning, priorities,
          or anything in your course materials.
        </p>
      </div>

      {courses.length === 0 ? (
        <div className="rounded-xl border border-dashed border-ink-200 bg-surface p-8 text-center text-sm text-ink-500">
          You have no courses yet.{" "}
          <Link
            href="/dashboard/courses"
            className="font-medium text-ink-900 underline"
          >
            Add a course
          </Link>{" "}
          and upload its syllabus so the assistant has something to reason about.
        </div>
      ) : null}

      <ChatPanel stats={stats} />
    </div>
  );
}
