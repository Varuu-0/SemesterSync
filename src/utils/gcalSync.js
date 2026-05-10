/**
 * Syncs extracted course events to Google Calendar.
 * Events are added as "All-day" events since exact times are usually not provided.
 */
export async function syncToGoogleCalendar(events, accessToken, onProgress) {
  let successCount = 0;
  let errorCount = 0;

  // Filter events that actually have a valid date
  const validEvents = events.filter((e) => e.date);

  for (let i = 0; i < validEvents.length; i++) {
    const e = validEvents[i];

    if (onProgress) {
      onProgress(i + 1, validEvents.length);
    }

    // Google Calendar API requires date in YYYY-MM-DD for all-day events.
    // End date must be the next day for an all day event.
    const startDate = new Date(e.date + 'T00:00:00');
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 1);

    const startStr = e.date; // YYYY-MM-DD
    const endStr = endDate.toISOString().split('T')[0];

    const payload = {
      summary: `${e.courseCode || e.courseName}: ${e.title}`,
      description: e.description || '',
      start: {
        date: startStr,
      },
      end: {
        date: endStr,
      },
      // Using a nice blue default color (Google Calendar color ID 9)
      colorId: '9',
    };

    try {
      const res = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        successCount++;
      } else {
        errorCount++;
        console.error('Failed to create event:', await res.text());
      }
    } catch (err) {
      errorCount++;
      console.error('Network error creating event:', err);
    }
  }

  return { successCount, errorCount };
}
