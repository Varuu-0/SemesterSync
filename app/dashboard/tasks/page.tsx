"use client";

import { useMemo, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { DeadlineRow } from "@/components/DeadlineRow";
import { useCourses, useCoursesById, useDeadlines } from "@/lib/hooks";
import { toggleDeadlineCompletionRow } from "@/lib/supabase";
import type { Course, Deadline } from "@/lib/types";

export default function TasksPage() {
  const { user } = useAuth();
  const { courses } = useCourses(user?.id);
  const { deadlines, mutateLocal } = useDeadlines(user?.id);
  const coursesById = useCoursesById(courses);
  const [showCompleted, setShowCompleted] = useState(true);
  const [busyIds, setBusyIds] = useState<Record<string, boolean>>({});

  const groups = useMemo(() => groupDeadlines(deadlines), [deadlines]);
  if (!user) return null;

  async function onToggle(d: Deadline, next: boolean) {
    const previous = d.completed_at;
    mutateLocal(d.id, { completed_at: next ? new Date().toISOString() : null });
    setBusyIds((p) => ({ ...p, [d.id]: true }));
    try {
      await toggleDeadlineCompletionRow(d.id, next);
    } catch {
      mutateLocal(d.id, { completed_at: previous });
    } finally {
      setBusyIds((p) => {
        const { [d.id]: _, ...rest } = p;
        return rest;
      });
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink-900">Smart Planner</h1>
        <p className="mt-1 text-sm text-ink-600">
          Auto-grouped by urgency: this week, next week, upcoming, and completed.
        </p>
      </div>
      <PlannerSection
        title="This Week"
        items={groups.thisWeek}
        empty="No deadlines due in the next 7 days."
        coursesById={coursesById}
        busyIds={busyIds}
        onToggle={onToggle}
      />
      <PlannerSection
        title="Next Week"
        items={groups.nextWeek}
        empty="Nothing queued for next week."
        coursesById={coursesById}
        busyIds={busyIds}
        onToggle={onToggle}
      />
      <PlannerSection
        title="Upcoming"
        items={groups.upcoming}
        empty="No additional upcoming deadlines."
        coursesById={coursesById}
        busyIds={busyIds}
        onToggle={onToggle}
      />
      <section className="rounded-2xl border border-ink-200 bg-surface p-4 shadow-soft">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-500">
            Completed
          </h2>
          <button
            type="button"
            onClick={() => setShowCompleted((v) => !v)}
            className="text-xs font-medium text-ink-600 hover:text-ink-900"
          >
            {showCompleted ? "Hide" : "Show"}
          </button>
        </div>
        {showCompleted && (
          <PlannerList
            items={groups.completed}
            empty="No completed deadlines yet."
            coursesById={coursesById}
            busyIds={busyIds}
            onToggle={onToggle}
            variant="completed"
          />
        )}
      </section>
    </div>
  );
}

function PlannerSection({
  title,
  items,
  empty,
  coursesById,
  busyIds,
  onToggle,
}: {
  title: string;
  items: Deadline[];
  empty: string;
  coursesById: Record<string, Course>;
  busyIds: Record<string, boolean>;
  onToggle: (d: Deadline, next: boolean) => void;
}) {
  return (
    <section className="rounded-2xl border border-ink-200 bg-surface p-4 shadow-soft">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-ink-500">
        {title}
      </h2>
      <PlannerList
        items={items}
        empty={empty}
        coursesById={coursesById}
        busyIds={busyIds}
        onToggle={onToggle}
        variant="upcoming"
      />
    </section>
  );
}

function PlannerList({
  items,
  empty,
  coursesById,
  busyIds,
  onToggle,
  variant,
}: {
  items: Deadline[];
  empty: string;
  coursesById: Record<string, Course>;
  busyIds: Record<string, boolean>;
  onToggle: (d: Deadline, next: boolean) => void;
  variant: "upcoming" | "completed";
}) {
  if (items.length === 0) return <div className="text-sm text-ink-500">{empty}</div>;
  return (
    <ul className="space-y-2">
      {items.map((d) => (
        <DeadlineRow
          key={d.id}
          deadline={d}
          course={coursesById[d.course_id]}
          variant={variant}
          busy={!!busyIds[d.id]}
          onToggle={(next) => onToggle(d, next)}
        />
      ))}
    </ul>
  );
}

function groupDeadlines(deadlines: Deadline[]) {
  const now = new Date();
  const day = 86400000;
  const thisWeek: Deadline[] = [];
  const nextWeek: Deadline[] = [];
  const upcoming: Deadline[] = [];
  const completed: Deadline[] = [];
  for (const d of deadlines) {
    if (d.completed_at) {
      completed.push(d);
      continue;
    }
    const diff = (new Date(d.due_at).getTime() - now.getTime()) / day;
    if (diff <= 7) thisWeek.push(d);
    else if (diff <= 14) nextWeek.push(d);
    else upcoming.push(d);
  }
  const sorter = (a: Deadline, b: Deadline) => +new Date(a.due_at) - +new Date(b.due_at);
  thisWeek.sort(sorter);
  nextWeek.sort(sorter);
  upcoming.sort(sorter);
  completed.sort((a, b) => +new Date(b.completed_at ?? b.due_at) - +new Date(a.completed_at ?? a.due_at));
  return { thisWeek, nextWeek, upcoming, completed };
}
