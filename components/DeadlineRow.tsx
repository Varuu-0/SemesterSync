"use client";

import { CATEGORY_LABELS, type Course, type Deadline } from "@/lib/types";

type Variant = "upcoming" | "missed" | "completed";

export function DeadlineRow({
  deadline,
  course,
  onToggle,
  variant,
  busy,
}: {
  deadline: Deadline;
  course?: Course;
  onToggle: (next: boolean) => void;
  variant: Variant;
  busy?: boolean;
}) {
  const isCompleted = !!deadline.completed_at;
  const due = new Date(deadline.due_at);

  const containerClass =
    variant === "missed"
      ? "border-red-300/70 bg-red-500/5"
      : variant === "completed"
        ? "border-ink-200 bg-ink-100/40"
        : "border-ink-200 bg-surface";

  const dateText = formatRelative(due, variant);
  const dateClass =
    variant === "missed"
      ? "text-red-600 font-medium"
      : variant === "completed"
        ? "text-ink-500"
        : daysUntil(due) <= 1
          ? "text-amber-600 font-medium"
          : "text-ink-600";

  return (
    <li
      className={`group flex items-center gap-3 rounded-lg border ${containerClass} px-3 py-2.5 shadow-soft transition`}
    >
      <CheckBox
        checked={isCompleted}
        onChange={onToggle}
        busy={busy}
        ariaLabel={`Mark ${deadline.title} as ${isCompleted ? "incomplete" : "complete"}`}
      />
      <span
        aria-hidden
        className="h-2.5 w-2.5 shrink-0 rounded-full"
        style={{ background: course?.color ?? "rgb(var(--ink-400-rgb))" }}
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span
            className={`truncate text-sm ${
              isCompleted
                ? "text-ink-500 line-through"
                : "font-medium text-ink-900"
            }`}
          >
            {deadline.title}
          </span>
          {deadline.category && (
            <span className="shrink-0 rounded-full bg-ink-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-ink-600">
              {CATEGORY_LABELS[deadline.category] ?? deadline.category}
            </span>
          )}
        </div>
        <div className="truncate text-xs text-ink-500">
          {course?.name ?? "Unknown course"}
        </div>
      </div>
      <div className={`shrink-0 text-right text-xs ${dateClass}`}>
        <div>{dateText}</div>
        <div className="text-[10px] text-ink-400">
          {due.toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
            year: "numeric",
          })}
        </div>
      </div>
    </li>
  );
}

function CheckBox({
  checked,
  onChange,
  busy,
  ariaLabel,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  busy?: boolean;
  ariaLabel: string;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={busy}
      onClick={() => onChange(!checked)}
      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition disabled:opacity-50 ${
        checked
          ? "border-primary bg-primary text-primary-fg"
          : "border-ink-300 bg-surface hover:border-ink-500"
      }`}
    >
      {checked && (
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="M5 12l5 5L20 7" />
        </svg>
      )}
    </button>
  );
}

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function daysUntil(d: Date): number {
  const today = startOfDay(new Date());
  const target = startOfDay(d);
  return Math.round((target.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));
}

function formatRelative(due: Date, variant: Variant): string {
  if (variant === "completed") {
    return "Done";
  }
  const diff = daysUntil(due);
  if (variant === "missed") {
    const overdue = -diff;
    if (overdue === 0) return "Today";
    if (overdue === 1) return "1 day late";
    return `${overdue} days late`;
  }
  if (diff < 0) return `${-diff} days late`;
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  if (diff < 7) return `In ${diff} days`;
  if (diff < 14) return `In ${diff} days`;
  const weeks = Math.round(diff / 7);
  return `In ${weeks} weeks`;
}
