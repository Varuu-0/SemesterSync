/**
 * ICS Calendar Export
 * Generates .ics (iCalendar) files from course events.
 */

/**
 * Format a date string for ICS (YYYYMMDD)
 */
function formatICSDate(dateStr) {
  return dateStr.replace(/-/g, '');
}

/**
 * Escape special characters in ICS text fields
 */
function escapeICS(text) {
  return (text || '')
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}

/**
 * Generate a unique UID for each event
 */
function generateUID(event) {
  return `${event.id}-${Date.now()}@semestersync.app`;
}

/**
 * Generate a VEVENT block for a single event
 */
function generateVEvent(event) {
  if (!event.date) return '';

  const dtStart = formatICSDate(event.date);
  // All-day event (next day as DTEND for full-day)
  const nextDay = new Date(event.date + 'T00:00:00');
  nextDay.setDate(nextDay.getDate() + 1);
  const dtEnd = formatICSDate(nextDay.toISOString().split('T')[0]);

  const summary = `${event.courseCode ? `[${event.courseCode}] ` : ''}${event.title}`;
  const description = [
    event.courseName && `Course: ${event.courseName}`,
    event.type && `Type: ${event.type}`,
    event.weight && `Weight: ${event.weight}%`,
    event.description,
  ]
    .filter(Boolean)
    .join('\\n');

  return [
    'BEGIN:VEVENT',
    `UID:${generateUID(event)}`,
    `DTSTART;VALUE=DATE:${dtStart}`,
    `DTEND;VALUE=DATE:${dtEnd}`,
    `SUMMARY:${escapeICS(summary)}`,
    `DESCRIPTION:${escapeICS(description)}`,
    `CATEGORIES:${escapeICS(event.type || 'other')}`,
    // Reminder 1 day before
    'BEGIN:VALARM',
    'TRIGGER:-P1D',
    'ACTION:DISPLAY',
    `DESCRIPTION:${escapeICS(summary)} is tomorrow!`,
    'END:VALARM',
    // Reminder 3 days before for exams
    ...(event.type === 'exam'
      ? [
          'BEGIN:VALARM',
          'TRIGGER:-P3D',
          'ACTION:DISPLAY',
          `DESCRIPTION:${escapeICS(summary)} is in 3 days!`,
          'END:VALARM',
        ]
      : []),
    'END:VEVENT',
  ].join('\r\n');
}

/**
 * Generate a complete .ics file content from events
 *
 * @param {Array} events - Events from CourseContext.getAllEvents()
 * @param {string} calendarName - Name for the calendar
 * @returns {string} ICS file content
 */
export function generateICS(events, calendarName = 'SemesterSync Schedule') {
  const datedEvents = events.filter((e) => e.date);

  const vevents = datedEvents.map(generateVEvent).filter(Boolean).join('\r\n');

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//SemesterSync//AI Schedule//EN',
    `X-WR-CALNAME:${escapeICS(calendarName)}`,
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    vevents,
    'END:VCALENDAR',
  ].join('\r\n');
}

/**
 * Download the .ics file
 */
export function downloadICS(events, filename = 'semestersync-schedule.ics') {
  const icsContent = generateICS(events);
  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}

/**
 * Generate a Google Calendar URL for a single event
 */
export function getGoogleCalendarUrl(event) {
  if (!event.date) return null;

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: `${event.courseCode ? `[${event.courseCode}] ` : ''}${event.title}`,
    dates: `${formatICSDate(event.date)}/${formatICSDate(event.date)}`,
    details: [event.courseName, event.type, event.description].filter(Boolean).join('\n'),
  });

  return `https://calendar.google.com/calendar/r/eventedit?${params.toString()}`;
}
