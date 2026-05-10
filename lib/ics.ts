import type { Course, Deadline } from "./types";

/**
 * Build an RFC 5545 VCALENDAR string from deadlines.
 * Events are stored as all-day VEVENTs in UTC; clients render them as a single day.
 */
export function buildIcs(
  deadlines: Deadline[],
  coursesById: Record<string, Course>
): string {
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//SemesterSync//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:SemesterSync",
  ];

  for (const d of deadlines) {
    const date = new Date(d.due_at);
    const course = coursesById[d.course_id];
    const completed = !!d.completed_at;
    const summary = course
      ? `${completed ? "✓ " : ""}${course.name}: ${d.title}`
      : `${completed ? "✓ " : ""}${d.title}`;
    const descParts: string[] = [];
    if (d.category) descParts.push(`Category: ${d.category}`);
    if (d.source_snippet) descParts.push(d.source_snippet);
    lines.push(
      "BEGIN:VEVENT",
      `UID:${d.id}@semestersync`,
      `DTSTAMP:${formatDateTimeUtc(new Date())}`,
      `DTSTART;VALUE=DATE:${formatDateOnly(date)}`,
      `DTEND;VALUE=DATE:${formatDateOnly(addDays(date, 1))}`,
      `SUMMARY:${escapeText(summary)}`,
      d.category ? `CATEGORIES:${escapeText(d.category)}` : "",
      completed ? "STATUS:COMPLETED" : "STATUS:CONFIRMED",
      completed && d.completed_at
        ? `COMPLETED:${formatDateTimeUtc(new Date(d.completed_at))}`
        : "",
      descParts.length ? `DESCRIPTION:${escapeText(descParts.join("\n\n"))}` : "",
      "END:VEVENT"
    );
  }

  lines.push("END:VCALENDAR");
  return lines.filter(Boolean).join("\r\n");
}

export function downloadIcs(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function formatDateOnly(d: Date): string {
  const y = d.getUTCFullYear().toString().padStart(4, "0");
  const m = (d.getUTCMonth() + 1).toString().padStart(2, "0");
  const day = d.getUTCDate().toString().padStart(2, "0");
  return `${y}${m}${day}`;
}

function formatDateTimeUtc(d: Date): string {
  return (
    formatDateOnly(d) +
    "T" +
    d.getUTCHours().toString().padStart(2, "0") +
    d.getUTCMinutes().toString().padStart(2, "0") +
    d.getUTCSeconds().toString().padStart(2, "0") +
    "Z"
  );
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setUTCDate(r.getUTCDate() + n);
  return r;
}

function escapeText(s: string): string {
  return s
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}
