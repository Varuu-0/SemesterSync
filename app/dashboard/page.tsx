"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { CalendarView } from "@/components/CalendarView";
import { DashboardEmptyState } from "@/components/dashboard/DashboardEmptyState";
import { DashboardSkeleton } from "@/components/dashboard/DashboardSkeleton";
import { DeadlineRow } from "@/components/DeadlineRow";
import { GoogleCalendarPanel } from "@/components/GoogleCalendarPanel";
import { useCourses, useCoursesById, useDeadlines } from "@/lib/hooks";
import { buildIcs, downloadIcs } from "@/lib/ics";
import { computeMetrics, type CourseWorkload } from "@/lib/dashboardMetrics";
import { supabaseBrowser } from "@/lib/supabase";
import {
  CATEGORY_LABELS,
  type Deadline,
  type GoogleCalendarEvent,
} from "@/lib/types";
import { toast } from "sonner";

const UPCOMING_VISIBLE = 8;
const MISSED_VISIBLE = 5;
const COMPLETED_VISIBLE = 5;

export default function DashboardPage() {
  const { user } = useAuth();
  const { courses, loading: coursesLoading } = useCourses(user?.id);
  const { deadlines, loading: deadlinesLoading, mutateLocal } = useDeadlines(
    user?.id
  );
  const coursesById = useCoursesById(courses);

  const metrics = useMemo(
    () => computeMetrics(courses, deadlines),
    [courses, deadlines]
  );

  const [busyIds, setBusyIds] = useState<Record<string, boolean>>({});
  const [completedOpen, setCompletedOpen] = useState(false);
  const [showAllUpcoming, setShowAllUpcoming] = useState(false);
  const [showAllMissed, setShowAllMissed] = useState(false);
  const [googleEvents, setGoogleEvents] = useState<GoogleCalendarEvent[]>([]);

  if (!user) return null;

  async function toggleCompleted(d: Deadline, next: boolean) {
    const nextValue = next ? new Date().toISOString() : null;
    const previous = d.completed_at;
    setBusyIds((prev) => ({ ...prev, [d.id]: true }));
    mutateLocal(d.id, { completed_at: nextValue });
    const supabase = supabaseBrowser();
    const { error } = await supabase
      .from("deadlines")
      .update({ completed_at: nextValue })
      .eq("id", d.id);
    setBusyIds((prev) => {
      const { [d.id]: _, ...rest } = prev;
      return rest;
    });
    if (error) {
      mutateLocal(d.id, { completed_at: previous });
      toast.error(error.message);
      return;
    }

    if (next) {
      const heaviestId = metrics.heaviestCourse?.course.id;
      const wasOnlyWeekTask =
        metrics.upcomingThisWeek.some((x) => x.id === d.id) &&
        metrics.upcomingThisWeek.filter((x) => x.id !== d.id).length === 0;
      const heaviestHit = heaviestId != null && d.course_id === heaviestId;
      if (wasOnlyWeekTask || heaviestHit) {
        void import("canvas-confetti").then((mod) => {
          mod.default({
            particleCount: heaviestHit && wasOnlyWeekTask ? 90 : 55,
            spread: 68,
            origin: { y: 0.74 },
            scalar: 0.9,
            ticks: 120,
          });
        });
      }
    }
  }

  function exportIcs() {
    if (deadlines.length === 0) {
      toast.info("No deadlines yet. Upload a syllabus PDF on the Courses page.");
      return;
    }
    const content = buildIcs(deadlines, coursesById);
    downloadIcs("semestersync.ics", content);
  }

  const loading = coursesLoading || deadlinesLoading;
  const empty = !loading && deadlines.length === 0;

  const upcomingList = showAllUpcoming
    ? metrics.upcoming
    : metrics.upcoming.slice(0, UPCOMING_VISIBLE);
  const missedList = showAllMissed
    ? metrics.missed
    : metrics.missed.slice(0, MISSED_VISIBLE);
  const completedList = completedOpen
    ? metrics.completed
    : metrics.completed.slice(0, COMPLETED_VISIBLE);

  return (
    <div className="space-y-8">
      {/* Header — stable while data loads */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-ink-900">Dashboard</h1>
          <p className="mt-1 text-sm text-ink-600">
            Your semester at a glance: workload, what&apos;s next, and what
            you&apos;ve already crushed.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/dashboard/courses"
            className="rounded-md border border-ink-200 bg-surface px-3 py-1.5 text-sm font-medium text-ink-700 hover:bg-ink-100"
          >
            Manage courses
          </Link>
          <button
            type="button"
            onClick={exportIcs}
            className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-fg hover:opacity-90"
          >
            Export .ics
          </button>
        </div>
      </div>

      {loading && <DashboardSkeleton />}

      {!loading && empty && <DashboardEmptyState />}

      {!loading && !empty && (
        <>
          {/* Metric cards */}
          <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard
              label="Upcoming this week"
              value={metrics.upcomingThisWeek.length}
              hint={
                metrics.nextDeadline
                  ? `Next: ${formatShort(new Date(metrics.nextDeadline.due_at))}`
                  : "Nothing on deck"
              }
              tone="default"
              icon={<ClockIcon />}
            />
            <MetricCard
              label="Missed"
              value={metrics.missed.length}
              hint={
                metrics.missed.length === 0
                  ? "All caught up"
                  : "Past due, not checked off"
              }
              tone={metrics.missed.length > 0 ? "danger" : "good"}
              icon={<AlertIcon />}
            />
            <MetricCard
              label="Heaviest course (30d)"
              value={metrics.heaviestCourse?.count ?? 0}
              hint={
                metrics.heaviestCourse
                  ? metrics.heaviestCourse.course.name
                  : "No upcoming deadlines"
              }
              accentColor={metrics.heaviestCourse?.course.color}
              icon={<StackIcon />}
            />
            <MetricCard
              label="On-time rate"
              value={`${Math.round(metrics.completionRate * 100)}%`}
              hint={
                metrics.completedCount + metrics.missed.length === 0
                  ? "Nothing graded yet"
                  : `${metrics.completedCount} done · ${metrics.missed.length} missed`
              }
              tone={
                metrics.completionRate >= 0.8
                  ? "good"
                  : metrics.completionRate >= 0.5
                    ? "default"
                    : "danger"
              }
              icon={<TargetIcon />}
            />
          </section>

          {/* Calendar */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-500">
                Calendar
              </h2>
              {courses.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5">
                  {courses.map((c) => (
                    <span
                      key={c.id}
                      className="inline-flex items-center gap-1.5 rounded-full bg-surface px-2 py-0.5 text-[11px] font-medium text-ink-700 shadow-soft ring-1 ring-ink-200"
                    >
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ background: c.color }}
                      />
                      {c.name}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <GoogleCalendarPanel onEventsChange={setGoogleEvents} />
            <CalendarView
              deadlines={deadlines}
              coursesById={coursesById}
              googleEvents={googleEvents}
            />
          </section>

          {/* Workload visualizations */}
          <section className="grid gap-4 lg:grid-cols-3">
            <WorkloadByWeek metrics={metrics} />
            <WorkloadByCourse
              workload={metrics.workloadByCourse}
              coursesCount={courses.length}
            />
            <CategoryMix metrics={metrics} />
          </section>

          {/* Upcoming */}
          <Section
            title="Up next"
            subtitle={`${metrics.upcoming.length} incomplete · sorted by due date`}
            actions={
              metrics.upcoming.length > UPCOMING_VISIBLE && (
                <button
                  type="button"
                  onClick={() => setShowAllUpcoming((v) => !v)}
                  className="text-xs font-medium text-ink-600 hover:text-ink-900"
                >
                  {showAllUpcoming
                    ? "Show top 8"
                    : `Show all ${metrics.upcoming.length}`}
                </button>
              )
            }
          >
            {metrics.upcoming.length === 0 ? (
              <Placeholder>
                Nothing upcoming. Either you&apos;re a wizard or you should
                upload a fresh syllabus.
              </Placeholder>
            ) : (
              <ul className="space-y-2">
                {upcomingList.map((d) => (
                  <DeadlineRow
                    key={d.id}
                    deadline={d}
                    course={coursesById[d.course_id]}
                    variant="upcoming"
                    busy={!!busyIds[d.id]}
                    onToggle={(next) => toggleCompleted(d, next)}
                  />
                ))}
              </ul>
            )}
          </Section>

          {/* Missed */}
          {metrics.missed.length > 0 && (
            <Section
              title="Missed"
              subtitle={`${metrics.missed.length} past due — check off any you've actually finished`}
              tone="danger"
              actions={
                metrics.missed.length > MISSED_VISIBLE && (
                  <button
                    type="button"
                    onClick={() => setShowAllMissed((v) => !v)}
                    className="text-xs font-medium text-ink-600 hover:text-ink-900"
                  >
                    {showAllMissed
                      ? `Show top ${MISSED_VISIBLE}`
                      : `Show all ${metrics.missed.length}`}
                  </button>
                )
              }
            >
              <ul className="space-y-2">
                {missedList.map((d) => (
                  <DeadlineRow
                    key={d.id}
                    deadline={d}
                    course={coursesById[d.course_id]}
                    variant="missed"
                    busy={!!busyIds[d.id]}
                    onToggle={(next) => toggleCompleted(d, next)}
                  />
                ))}
              </ul>
            </Section>
          )}

          {/* Completed (collapsible) */}
          {metrics.completed.length > 0 && (
            <Section
              title="Completed"
              subtitle={`${metrics.completed.length} done · ${metrics.completedThisWeek} in the last 7 days`}
              actions={
                <button
                  type="button"
                  onClick={() => setCompletedOpen((v) => !v)}
                  className="text-xs font-medium text-ink-600 hover:text-ink-900"
                >
                  {completedOpen
                    ? "Collapse"
                    : metrics.completed.length > COMPLETED_VISIBLE
                      ? `Show all ${metrics.completed.length}`
                      : "Expand"}
                </button>
              }
            >
              <ul className="space-y-2">
                {completedList.map((d) => (
                  <DeadlineRow
                    key={d.id}
                    deadline={d}
                    course={coursesById[d.course_id]}
                    variant="completed"
                    busy={!!busyIds[d.id]}
                    onToggle={(next) => toggleCompleted(d, next)}
                  />
                ))}
              </ul>
            </Section>
          )}
        </>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Building blocks                                                            */
/* -------------------------------------------------------------------------- */

function MetricCard({
  label,
  value,
  hint,
  tone = "default",
  icon,
  accentColor,
}: {
  label: string;
  value: number | string;
  hint?: string;
  tone?: "default" | "good" | "danger";
  icon?: React.ReactNode;
  accentColor?: string;
}) {
  const toneClass =
    tone === "danger"
      ? "text-red-600"
      : tone === "good"
        ? "text-emerald-600"
        : "text-ink-900";
  return (
    <div className="rounded-2xl border border-ink-200 bg-surface p-4 shadow-soft">
      <div className="flex items-start justify-between gap-3">
        <div className="text-xs font-semibold uppercase tracking-wide text-ink-500">
          {label}
        </div>
        <span
          className="flex h-7 w-7 items-center justify-center rounded-lg text-ink-600"
          style={
            accentColor
              ? { background: `${accentColor}20`, color: accentColor }
              : { background: "rgb(var(--ink-100-rgb))" }
          }
        >
          {icon}
        </span>
      </div>
      <div className={`mt-2 text-3xl font-semibold tabular-nums ${toneClass}`}>
        {value}
      </div>
      {hint && (
        <div className="mt-1 truncate text-xs text-ink-500">{hint}</div>
      )}
    </div>
  );
}

function Section({
  title,
  subtitle,
  actions,
  tone,
  children,
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  tone?: "danger";
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="mb-3 flex items-end justify-between gap-3">
        <div>
          <h2
            className={`text-sm font-semibold uppercase tracking-wide ${
              tone === "danger" ? "text-red-600" : "text-ink-500"
            }`}
          >
            {title}
          </h2>
          {subtitle && <p className="text-xs text-ink-500">{subtitle}</p>}
        </div>
        {actions}
      </div>
      {children}
    </section>
  );
}

function Placeholder({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-ink-200 bg-surface p-6 text-center text-sm text-ink-500">
      {children}
    </div>
  );
}

function WorkloadByWeek({
  metrics,
}: {
  metrics: ReturnType<typeof computeMetrics>;
}) {
  const max = Math.max(1, ...metrics.workloadByWeek.map((w) => w.count));
  return (
    <div className="rounded-2xl border border-ink-200 bg-surface p-4 shadow-soft lg:col-span-1">
      <div className="text-xs font-semibold uppercase tracking-wide text-ink-500">
        Workload · next 4 weeks
      </div>
      <ul className="mt-3 space-y-2.5">
        {metrics.workloadByWeek.map((w, i) => {
          const pct = (w.count / max) * 100;
          return (
            <li key={i} className="flex items-center gap-3 text-sm">
              <span className="w-20 shrink-0 text-xs text-ink-600">
                {w.label}
              </span>
              <span className="relative h-2 flex-1 overflow-hidden rounded-full bg-ink-100">
                <span
                  className="absolute inset-y-0 left-0 rounded-full bg-primary"
                  style={{ width: `${pct}%` }}
                />
              </span>
              <span className="w-6 text-right text-xs font-semibold tabular-nums text-ink-700">
                {w.count}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function WorkloadByCourse({
  workload,
  coursesCount,
}: {
  workload: CourseWorkload[];
  coursesCount: number;
}) {
  const top = workload.slice(0, 5);
  const max = Math.max(1, ...top.map((w) => w.upcoming));
  return (
    <div className="rounded-2xl border border-ink-200 bg-surface p-4 shadow-soft">
      <div className="text-xs font-semibold uppercase tracking-wide text-ink-500">
        Workload · by course
      </div>
      {top.length === 0 ? (
        <div className="mt-4 text-xs text-ink-500">
          {coursesCount === 0
            ? "Add courses to see this chart."
            : "No upcoming deadlines."}
        </div>
      ) : (
        <ul className="mt-3 space-y-2.5">
          {top.map((w) => {
            const pct = (w.upcoming / max) * 100;
            return (
              <li key={w.course.id} className="text-sm">
                <div className="mb-1 flex items-center justify-between gap-2">
                  <span className="flex min-w-0 items-center gap-1.5">
                    <span
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{ background: w.course.color }}
                    />
                    <span className="truncate text-xs font-medium text-ink-800">
                      {w.course.name}
                    </span>
                  </span>
                  <span className="shrink-0 text-xs tabular-nums text-ink-500">
                    {w.upcoming}
                    {w.missed > 0 && (
                      <span className="ml-1 text-red-600">
                        +{w.missed} missed
                      </span>
                    )}
                  </span>
                </div>
                <span className="block h-1.5 overflow-hidden rounded-full bg-ink-100">
                  <span
                    className="block h-full rounded-full"
                    style={{
                      width: `${pct}%`,
                      background: w.course.color,
                    }}
                  />
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function CategoryMix({
  metrics,
}: {
  metrics: ReturnType<typeof computeMetrics>;
}) {
  return (
    <div className="rounded-2xl border border-ink-200 bg-surface p-4 shadow-soft">
      <div className="text-xs font-semibold uppercase tracking-wide text-ink-500">
        Mix · next 30 days
      </div>
      {metrics.categoryBreakdown.length === 0 ? (
        <div className="mt-4 text-xs text-ink-500">
          Nothing in the next 30 days.
        </div>
      ) : (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {metrics.categoryBreakdown.map((c) => (
            <span
              key={c.category}
              className="inline-flex items-center gap-1.5 rounded-full bg-ink-100 px-2.5 py-1 text-xs font-medium text-ink-700"
            >
              <span className="capitalize">
                {c.category === "uncategorized"
                  ? "Other"
                  : (CATEGORY_LABELS[c.category as keyof typeof CATEGORY_LABELS] ??
                    c.category)}
              </span>
              <span className="tabular-nums text-ink-500">{c.count}</span>
            </span>
          ))}
        </div>
      )}
      <div className="mt-4 grid grid-cols-3 gap-2 border-t border-ink-200 pt-3 text-center">
        <Stat label="Tracked" value={metrics.totalCount} />
        <Stat label="Done" value={metrics.completedCount} />
        <Stat label="Open" value={metrics.upcoming.length} />
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="text-lg font-semibold tabular-nums text-ink-900">
        {value}
      </div>
      <div className="text-[10px] uppercase tracking-wide text-ink-500">
        {label}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Helpers + icons                                                            */
/* -------------------------------------------------------------------------- */

function formatShort(d: Date): string {
  return d.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function ClockIcon() {
  return (
    <Svg>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </Svg>
  );
}
function AlertIcon() {
  return (
    <Svg>
      <path d="M12 3l10 18H2L12 3z" />
      <path d="M12 10v5" />
      <path d="M12 18v.01" />
    </Svg>
  );
}
function StackIcon() {
  return (
    <Svg>
      <path d="M3 7l9-4 9 4-9 4-9-4z" />
      <path d="M3 12l9 4 9-4" />
      <path d="M3 17l9 4 9-4" />
    </Svg>
  );
}
function TargetIcon() {
  return (
    <Svg>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="12" cy="12" r="1.5" />
    </Svg>
  );
}
function Svg({ children }: { children: React.ReactNode }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {children}
    </svg>
  );
}
