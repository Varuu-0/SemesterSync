"use client";

import { useMemo, useState } from "react";
import { CalendarView } from "@/components/CalendarView";
import { GoogleCalendarPanel } from "@/components/GoogleCalendarPanel";
import { useAuth } from "@/components/AuthProvider";
import { useCourses, useCoursesById, useDeadlines } from "@/lib/hooks";
import { addManualDeadlineRow, deleteDeadlineRow } from "@/lib/supabase";
import type { GoogleCalendarEvent } from "@/lib/types";

export default function CalendarPage() {
  const { user } = useAuth();
  const { courses } = useCourses(user?.id);
  const { deadlines } = useDeadlines(user?.id);
  const coursesById = useCoursesById(courses);
  const [googleEvents, setGoogleEvents] = useState<GoogleCalendarEvent[]>([]);
  const [view, setView] = useState<"month" | "week" | "timeline">("month");
  const [title, setTitle] = useState("");
  const [courseId, setCourseId] = useState("");
  const [date, setDate] = useState("");
  const [busy, setBusy] = useState(false);

  const timeline = useMemo(
    () => [...deadlines].sort((a, b) => +new Date(a.due_at) - +new Date(b.due_at)),
    [deadlines]
  );

  if (!user) return null;

  async function addEvent() {
    if (!user?.id || !courseId || !title.trim() || !date) return;
    setBusy(true);
    try {
      await addManualDeadlineRow({
        userId: user.id,
        courseId,
        title: title.trim(),
        dueAt: new Date(date),
      });
      setTitle("");
      setDate("");
    } finally {
      setBusy(false);
    }
  }

  async function deleteEvent(id: string) {
    setBusy(true);
    try {
      await deleteDeadlineRow(id);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-ink-900">Calendar</h1>
          <p className="mt-1 text-sm text-ink-600">Month, week, and timeline views with manual events.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setView("month")} className={`rounded-md px-3 py-1.5 text-sm ${view === "month" ? "bg-primary text-primary-fg" : "border border-ink-200"}`}>Month</button>
          <button onClick={() => setView("week")} className={`rounded-md px-3 py-1.5 text-sm ${view === "week" ? "bg-primary text-primary-fg" : "border border-ink-200"}`}>Week</button>
          <button onClick={() => setView("timeline")} className={`rounded-md px-3 py-1.5 text-sm ${view === "timeline" ? "bg-primary text-primary-fg" : "border border-ink-200"}`}>Timeline</button>
        </div>
      </div>
      <GoogleCalendarPanel onEventsChange={setGoogleEvents} />
      {view === "timeline" ? (
        <div className="rounded-2xl border border-ink-200 bg-surface p-4 shadow-soft">
          <ul className="space-y-3">
            {timeline.map((d) => (
              <li key={d.id} className="flex items-center justify-between gap-3 rounded-lg border border-ink-200 p-3">
                <div>
                  <div className={`text-sm ${d.completed_at ? "line-through text-ink-500" : "font-medium text-ink-900"}`}>{d.title}</div>
                  <div className="text-xs text-ink-500">{coursesById[d.course_id]?.name ?? "Course"} · {new Date(d.due_at).toLocaleDateString()}</div>
                </div>
                <button className="rounded-md border border-red-200 px-2 py-1 text-xs text-red-600" onClick={() => deleteEvent(d.id)} disabled={busy}>Delete</button>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <CalendarView deadlines={deadlines} coursesById={coursesById} googleEvents={googleEvents} initialView={view === "week" ? "timeGridWeek" : "dayGridMonth"} onDeleteDeadline={deleteEvent} />
      )}

      <div className="rounded-2xl border border-ink-200 bg-surface p-4 shadow-soft">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-ink-500">Add Event</h2>
        <div className="grid gap-2 sm:grid-cols-4">
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Event title" className="rounded-md border border-ink-200 px-3 py-2 text-sm" />
          <select value={courseId} onChange={(e) => setCourseId(e.target.value)} className="rounded-md border border-ink-200 px-3 py-2 text-sm">
            <option value="">Select course</option>
            {courses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="rounded-md border border-ink-200 px-3 py-2 text-sm" />
          <button disabled={busy} onClick={addEvent} className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-fg">Create</button>
        </div>
      </div>
    </div>
  );
}
