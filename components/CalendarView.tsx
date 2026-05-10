"use client";

import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import { useMemo } from "react";
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
}: {
  deadlines: Deadline[];
  coursesById: Record<string, Course>;
  googleEvents?: GoogleCalendarEvent[];
}) {
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
        },
      };
    });

    const externalEvents = (googleEvents ?? []).map((ev) => ({
      id: `gcal:${ev.id}`,
      title: ev.summary,
      start: ev.start,
      end: ev.end,
      allDay: ev.allDay,
      // Outline-only treatment so they sit visually behind the deadlines.
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
    <div className="rounded-2xl border border-ink-200 bg-surface p-4 shadow-soft">
      <FullCalendar
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
        initialView="dayGridMonth"
        headerToolbar={{
          left: "prev,next today",
          center: "title",
          right: "dayGridMonth,timeGridWeek",
        }}
        height="auto"
        events={events}
        dayMaxEventRows={4}
        eventClick={(info) => {
          const props = info.event.extendedProps ?? {};
          if (props.source === "gcal") {
            const link = props.htmlLink as string | undefined;
            if (link) window.open(link, "_blank", "noopener,noreferrer");
            return;
          }
          const category = props.category as DeadlineCategory | null;
          const snippet = props.snippet as string | undefined;
          const tagLine = category
            ? `[${CATEGORY_LABELS[category] ?? category}]\n\n`
            : "";
          const snippetLine = snippet ? `From syllabus:\n${snippet}` : "";
          if (tagLine || snippetLine) {
            alert(`${info.event.title}\n\n${tagLine}${snippetLine}`.trim());
          }
        }}
      />
    </div>
  );
}
