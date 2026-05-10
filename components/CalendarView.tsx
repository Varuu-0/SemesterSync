"use client";

import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import listPlugin from "@fullcalendar/list";
import interactionPlugin from "@fullcalendar/interaction";
import { useMemo, useState } from "react";
import {
  CATEGORY_LABELS,
  type Course,
  type Deadline,
  type DeadlineCategory,
  type GoogleCalendarEvent,
} from "@/lib/types";

export function CalendarView({
  deadlines,
  coursesById,
  googleEvents,
  initialView = "dayGridMonth",
  onDeleteDeadline,
}: {
  deadlines: Deadline[];
  coursesById: Record<string, Course>;
  googleEvents?: GoogleCalendarEvent[];
  initialView?: "dayGridMonth" | "timeGridWeek";
  onDeleteDeadline?: (id: string) => void;
}) {
  const [detail, setDetail] = useState<CalendarDetail | null>(null);

  const events = useMemo(() => {
    const deadlineEvents = deadlines.map((d) => {
      const course = coursesById[d.course_id];
      const color = course?.color ?? "#3b82f6";
      const completed = !!d.completed_at;
      const titlePrefix = completed ? "✓ " : "";
      return {
        id: d.id,
        title: `${titlePrefix}${course ? `${course.name}: ${d.title}` : d.title}`,
        start: new Date(d.due_at),
        allDay: true,
        backgroundColor: color,
        borderColor: color,
        textColor: "#ffffff",
        classNames: completed ? ["ss-event-completed"] : [],
        extendedProps: {
          source: "deadline" as const,
          snippet: d.source_snippet,
          category: d.category,
          completed,
          courseName: course?.name ?? "Course",
          dueLabel: formatDueLabel(new Date(d.due_at)),
        },
      };
    });

    const externalEvents = (googleEvents ?? []).map((ev) => ({
      id: `gcal:${ev.id}`,
      title: ev.summary,
      start: ev.start,
      end: ev.end,
      allDay: ev.allDay,
      backgroundColor: "transparent",
      borderColor: "rgb(var(--ink-400-rgb))",
      textColor: "rgb(var(--ink-700-rgb))",
      classNames: ["ss-event-gcal"],
      extendedProps: {
        source: "gcal" as const,
        description: ev.description,
        htmlLink: ev.htmlLink,
      },
    }));

    return [...externalEvents, ...deadlineEvents];
  }, [deadlines, coursesById, googleEvents]);

  return (
    <>
      <div className="rounded-2xl border border-ink-200 bg-surface p-4 shadow-soft">
        <FullCalendar
          plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]}
          initialView={initialView}
          headerToolbar={{
            left: "prev,next today",
            center: "title",
            right: "dayGridMonth,timeGridWeek,listWeek",
          }}
          height="auto"
          events={events}
          dayMaxEventRows={4}
          eventClick={(info) => {
            const props = info.event.extendedProps ?? {};
            if (props.source === "gcal") {
              setDetail({
                kind: "gcal",
                title: info.event.title,
                description: props.description as string | undefined,
                htmlLink: props.htmlLink as string | undefined,
              });
              return;
            }
            const category = props.category as DeadlineCategory | null;
            const snippet = props.snippet as string | undefined;
            const courseName = props.courseName as string | undefined;
            const dueLabel = props.dueLabel as string | undefined;
            const completed = !!props.completed;
            setDetail({
              kind: "deadline",
                id: info.event.id,
              title: info.event.title,
              courseName: courseName ?? "Course",
              category,
              snippet,
              dueLabel,
              completed,
            });
          }}
        />
      </div>

      {detail && (
        <CalendarEventModal detail={detail} onClose={() => setDetail(null)} onDeleteDeadline={onDeleteDeadline} />
      )}
    </>
  );
}

type CalendarDetail =
  | {
      kind: "deadline";
      id: string;
      title: string;
      courseName: string;
      category: DeadlineCategory | null;
      snippet?: string;
      dueLabel?: string;
      completed: boolean;
    }
  | {
      kind: "gcal";
      title: string;
      description?: string;
      htmlLink?: string;
    };

function CalendarEventModal({
  detail,
  onClose,
  onDeleteDeadline,
}: {
  detail: CalendarDetail;
  onClose: () => void;
  onDeleteDeadline?: (id: string) => void;
}) {
  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/45 p-4 backdrop-blur-[1px]"
      role="presentation"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="cal-event-title"
        className="max-h-[min(85vh,540px)] w-full max-w-md overflow-y-auto rounded-2xl border border-ink-200 bg-surface p-5 shadow-soft"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <h2
            id="cal-event-title"
            className="text-base font-semibold leading-snug text-ink-900"
          >
            {detail.kind === "deadline"
              ? detail.title.replace(/^[✓]\s*/, "")
              : detail.title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-md p-1 text-ink-500 hover:bg-ink-100 hover:text-ink-800"
            aria-label="Close"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {detail.kind === "deadline" && (
          <>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-ink-100 px-2.5 py-1 text-xs font-medium text-ink-700">
                {detail.courseName}
              </span>
              {detail.category && (
                <span className="rounded-full bg-accent/15 px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-ink-800">
                  {CATEGORY_LABELS[detail.category] ?? detail.category}
                </span>
              )}
              {detail.completed && (
                <span className="rounded-full bg-emerald-500/15 px-2.5 py-1 text-xs font-medium text-emerald-800">
                  Done
                </span>
              )}
            </div>
            {detail.dueLabel && (
              <p className="mt-3 text-sm text-ink-600">
                <span className="font-medium text-ink-700">Due:</span>{" "}
                {detail.dueLabel}
              </p>
            )}
            {detail.snippet ? (
              <div className="mt-4 rounded-xl border border-ink-200 bg-ink-50/80 px-3 py-2.5">
                <div className="text-[10px] font-semibold uppercase tracking-wide text-ink-500">
                  Syllabus excerpt
                </div>
                <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-ink-700">
                  {detail.snippet}
                </p>
              </div>
            ) : (
              <p className="mt-4 text-xs text-ink-500">
                No syllabus snippet stored for this deadline.
              </p>
            )}
            {onDeleteDeadline && (
              <button
                type="button"
                onClick={() => {
                  onDeleteDeadline(detail.id);
                  onClose();
                }}
                className="mt-4 rounded-md border border-red-200 bg-surface px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50"
              >
                Delete event
              </button>
            )}
          </>
        )}

        {detail.kind === "gcal" && (
          <>
            <p className="mt-2 text-xs font-medium uppercase tracking-wide text-ink-500">
              Google Calendar
            </p>
            {detail.description && (
              <p className="mt-2 whitespace-pre-wrap text-sm text-ink-700">
                {detail.description}
              </p>
            )}
            {detail.htmlLink && (
              <a
                href={detail.htmlLink}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-fg hover:opacity-90"
              >
                Open in Google Calendar
              </a>
            )}
          </>
        )}

        <div className="mt-5 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-ink-200 bg-surface px-3 py-1.5 text-sm font-medium text-ink-700 hover:bg-ink-100"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function formatDueLabel(d: Date): string {
  return d.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}
