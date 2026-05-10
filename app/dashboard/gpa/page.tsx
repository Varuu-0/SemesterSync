"use client";

import { useMemo, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { useCourses } from "@/lib/hooks";
import type { GradeComponent } from "@/lib/types";

export default function GpaPage() {
  const { user } = useAuth();
  const { courses } = useCourses(user?.id);
  const [scores, setScores] = useState<Record<string, string>>({});

  const gradedCourses = useMemo(
    () =>
      courses.filter(
        (c) => Array.isArray(c.grade_breakdown) && c.grade_breakdown.length > 0
      ),
    [courses]
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink-900">GPA Predictor</h1>
        <p className="mt-1 text-sm text-ink-600">
          Per-course estimator based on each course grading breakdown.
        </p>
      </div>
      {gradedCourses.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-ink-200 bg-surface p-6 text-sm text-ink-500">
          Add grade breakdown components to courses from the Courses page to
          enable per-course GPA prediction.
        </div>
      ) : (
        <div className="space-y-4">
          {gradedCourses.map((course) => (
            <CourseGradeCard
              key={course.id}
              courseName={course.name}
              components={course.grade_breakdown ?? []}
              scores={scores}
              setScores={setScores}
              courseId={course.id}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function CourseGradeCard({
  courseId,
  courseName,
  components,
  scores,
  setScores,
}: {
  courseId: string;
  courseName: string;
  components: GradeComponent[];
  scores: Record<string, string>;
  setScores: (updater: (prev: Record<string, string>) => Record<string, string>) => void;
}) {
  const stats = useMemo(() => {
    const totalWeight = components.reduce((sum, c) => sum + (c.weight || 0), 0);
    let enteredWeight = 0;
    let earnedWeight = 0;
    for (let i = 0; i < components.length; i++) {
      const key = `${courseId}:${i}`;
      const raw = scores[key];
      if (raw == null || raw.trim() === "") continue;
      const score = Number(raw);
      if (!Number.isFinite(score)) continue;
      const w = components[i].weight || 0;
      enteredWeight += w;
      earnedWeight += (score / 100) * w;
    }
    const current =
      enteredWeight > 0 ? (earnedWeight / enteredWeight) * 100 : null;
    const remaining = Math.max(0, totalWeight - enteredWeight);
    const maxPossible =
      totalWeight > 0 ? ((earnedWeight + remaining) / totalWeight) * 100 : 0;
    return { totalWeight, current, maxPossible };
  }, [components, courseId, scores]);

  return (
    <div className="rounded-2xl border border-ink-200 bg-surface p-4 shadow-soft">
      <div className="mb-3">
        <h2 className="text-lg font-semibold text-ink-900">{courseName}</h2>
        <p className="text-xs text-ink-500">Total weight: {stats.totalWeight}%</p>
      </div>
      <div className="grid gap-2">
        {components.map((c, idx) => {
          const key = `${courseId}:${idx}`;
          return (
            <div key={key} className="grid gap-2 sm:grid-cols-3">
              <div className="rounded-md border border-ink-200 px-3 py-2 text-sm text-ink-700">
                {c.component}
              </div>
              <div className="rounded-md border border-ink-200 px-3 py-2 text-sm text-ink-600">
                {c.weight}%
              </div>
              <input
                type="number"
                min={0}
                max={150}
                value={scores[key] ?? ""}
                onChange={(e) =>
                  setScores((prev) => ({ ...prev, [key]: e.target.value }))
                }
                placeholder="Score %"
                className="rounded-md border border-ink-200 px-3 py-2 text-sm"
              />
            </div>
          );
        })}
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-ink-200 p-3">
          <div className="text-xs uppercase tracking-wide text-ink-500">
            Current
          </div>
          <div className="mt-1 text-2xl font-semibold text-ink-900">
            {stats.current == null ? "—" : `${stats.current.toFixed(1)}%`}
          </div>
        </div>
        <div className="rounded-xl border border-ink-200 p-3">
          <div className="text-xs uppercase tracking-wide text-ink-500">
            Max Possible
          </div>
          <div className="mt-1 text-2xl font-semibold text-ink-900">
            {Math.min(100, stats.maxPossible).toFixed(1)}%
          </div>
        </div>
      </div>
    </div>
  );
}
