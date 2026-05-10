/**
 * Server-side helpers for talking to the Google Calendar API.
 *
 * Auth model:
 * - We sign users in via Supabase's Google OAuth provider, requesting the
 *   `calendar` scope and `access_type=offline`.
 * - On callback we capture the long-lived `provider_refresh_token` and store
 *   it in `public.user_settings.google_refresh_token`.
 * - Whenever we need to talk to the API server-side we exchange the refresh
 *   token for a short-lived access token via Google's token endpoint, using
 *   the same OAuth client that Supabase uses (its credentials live in
 *   GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET env vars).
 */

import "server-only";

const TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const CALENDAR_BASE = "https://www.googleapis.com/calendar/v3";

const SS_PRIVATE_KEY = "semestersync";
const SS_PRIVATE_VALUE = "deadline";

export type GoogleApiEvent = {
  id: string;
  summary?: string;
  description?: string;
  status?: string;
  htmlLink?: string;
  start?: { date?: string; dateTime?: string; timeZone?: string };
  end?: { date?: string; dateTime?: string; timeZone?: string };
  extendedProperties?: {
    private?: Record<string, string>;
    shared?: Record<string, string>;
  };
};

/* -------------------------------------------------------------------------- */
/* Token refresh                                                              */
/* -------------------------------------------------------------------------- */

export class GoogleAuthError extends Error {
  status: number;
  constructor(message: string, status = 401) {
    super(message);
    this.status = status;
  }
}

/**
 * Exchange a stored refresh token for a fresh access token.
 * Throws GoogleAuthError on 4xx so callers can surface a "reconnect" message.
 */
export async function refreshAccessToken(refreshToken: string): Promise<string> {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new GoogleAuthError(
      "Server is missing GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET env vars.",
      500
    );
  }

  const res = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }).toString(),
  });

  if (!res.ok) {
    const text = await res.text();
    // 400 invalid_grant typically means the user revoked access on Google's
    // side or the token rotated. Caller should clear it and ask for reconnect.
    throw new GoogleAuthError(
      `Failed to refresh Google token (${res.status}): ${text}`,
      res.status === 400 || res.status === 401 ? 401 : 502
    );
  }

  const json = (await res.json()) as { access_token?: string };
  if (!json.access_token) {
    throw new GoogleAuthError("Google returned no access_token.", 502);
  }
  return json.access_token;
}

/* -------------------------------------------------------------------------- */
/* SemesterSync calendar discovery / creation                                 */
/* -------------------------------------------------------------------------- */

/**
 * Make sure the user has a "SemesterSync" calendar to push deadlines into.
 * If `existingId` is still valid, returns it. Otherwise creates a new one.
 */
export async function ensureSemesterSyncCalendar(
  accessToken: string,
  existingId: string | null
): Promise<string> {
  if (existingId) {
    const res = await fetch(
      `${CALENDAR_BASE}/calendars/${encodeURIComponent(existingId)}`,
      { headers: { authorization: `Bearer ${accessToken}` } }
    );
    if (res.ok) return existingId;
    // 404 / 410 → calendar deleted. Fall through and create a new one.
  }

  const res = await fetch(`${CALENDAR_BASE}/calendars`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${accessToken}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      summary: "SemesterSync",
      description: "Auto-synced course deadlines from SemesterSync.",
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new GoogleAuthError(
      `Failed to create SemesterSync calendar: ${res.status} ${text}`,
      res.status === 401 ? 401 : 502
    );
  }

  const json = (await res.json()) as { id?: string };
  if (!json.id) throw new GoogleAuthError("Calendar create returned no id.", 502);
  return json.id;
}

/* -------------------------------------------------------------------------- */
/* Event CRUD                                                                 */
/* -------------------------------------------------------------------------- */

export type DeadlinePayload = {
  id: string;
  title: string;
  courseName?: string;
  due_at: string; // ISO timestamp
  category: string | null;
  source_snippet: string | null;
  completed_at: string | null;
};

function formatAllDay(due: Date): { start: string; end: string } {
  const y = due.getUTCFullYear();
  const m = String(due.getUTCMonth() + 1).padStart(2, "0");
  const d = String(due.getUTCDate()).padStart(2, "0");
  const start = `${y}-${m}-${d}`;
  // All-day events in GCal need end = day after start.
  const next = new Date(due);
  next.setUTCDate(next.getUTCDate() + 1);
  const ny = next.getUTCFullYear();
  const nm = String(next.getUTCMonth() + 1).padStart(2, "0");
  const nd = String(next.getUTCDate()).padStart(2, "0");
  const end = `${ny}-${nm}-${nd}`;
  return { start, end };
}

function buildEventBody(d: DeadlinePayload) {
  const due = new Date(d.due_at);
  const { start, end } = formatAllDay(due);
  const completed = !!d.completed_at;
  const summary = d.courseName
    ? `${completed ? "✓ " : ""}${d.courseName}: ${d.title}`
    : `${completed ? "✓ " : ""}${d.title}`;

  const descriptionLines: string[] = [];
  if (d.category) descriptionLines.push(`Category: ${d.category}`);
  if (d.source_snippet) descriptionLines.push(d.source_snippet);
  descriptionLines.push("\n— Synced from SemesterSync");

  return {
    summary,
    description: descriptionLines.join("\n\n"),
    start: { date: start },
    end: { date: end },
    status: "confirmed", // GCal has no "completed" status; we mark via summary prefix.
    extendedProperties: {
      private: {
        [SS_PRIVATE_KEY]: SS_PRIVATE_VALUE,
        deadline_id: d.id,
        completed: completed ? "true" : "false",
        category: d.category ?? "",
      },
    },
  };
}

export async function listSemesterSyncEvents(
  accessToken: string,
  calendarId: string
): Promise<GoogleApiEvent[]> {
  // Pull a wide window. Calendars have at most ~1000 deadlines for a semester
  // even for the most chaotic student, so 2 years should cover everything.
  const now = new Date();
  const past = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000).toISOString();
  const future = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000).toISOString();
  const url = new URL(
    `${CALENDAR_BASE}/calendars/${encodeURIComponent(calendarId)}/events`
  );
  url.searchParams.set("timeMin", past);
  url.searchParams.set("timeMax", future);
  url.searchParams.set("singleEvents", "true");
  url.searchParams.set("maxResults", "2500");
  url.searchParams.set(
    "privateExtendedProperty",
    `${SS_PRIVATE_KEY}=${SS_PRIVATE_VALUE}`
  );

  const res = await fetch(url, {
    headers: { authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new GoogleAuthError(
      `Failed to list SemesterSync events: ${res.status} ${text}`,
      res.status === 401 ? 401 : 502
    );
  }
  const json = (await res.json()) as { items?: GoogleApiEvent[] };
  return json.items ?? [];
}

export async function createDeadlineEvent(
  accessToken: string,
  calendarId: string,
  d: DeadlinePayload
): Promise<string> {
  const res = await fetch(
    `${CALENDAR_BASE}/calendars/${encodeURIComponent(calendarId)}/events`,
    {
      method: "POST",
      headers: {
        authorization: `Bearer ${accessToken}`,
        "content-type": "application/json",
      },
      body: JSON.stringify(buildEventBody(d)),
    }
  );
  if (!res.ok) {
    const text = await res.text();
    throw new GoogleAuthError(
      `Failed to create event: ${res.status} ${text}`,
      res.status === 401 ? 401 : 502
    );
  }
  const json = (await res.json()) as { id?: string };
  if (!json.id) throw new GoogleAuthError("Event create returned no id.", 502);
  return json.id;
}

export async function updateDeadlineEvent(
  accessToken: string,
  calendarId: string,
  eventId: string,
  d: DeadlinePayload
): Promise<string> {
  const res = await fetch(
    `${CALENDAR_BASE}/calendars/${encodeURIComponent(
      calendarId
    )}/events/${encodeURIComponent(eventId)}`,
    {
      method: "PUT",
      headers: {
        authorization: `Bearer ${accessToken}`,
        "content-type": "application/json",
      },
      body: JSON.stringify(buildEventBody(d)),
    }
  );
  if (res.status === 404 || res.status === 410) {
    // Event was deleted in Google. Fall back to creating a fresh one.
    return createDeadlineEvent(accessToken, calendarId, d);
  }
  if (!res.ok) {
    const text = await res.text();
    throw new GoogleAuthError(
      `Failed to update event: ${res.status} ${text}`,
      res.status === 401 ? 401 : 502
    );
  }
  const json = (await res.json()) as { id?: string };
  return json.id ?? eventId;
}

export async function deleteCalendarEvent(
  accessToken: string,
  calendarId: string,
  eventId: string
): Promise<void> {
  const res = await fetch(
    `${CALENDAR_BASE}/calendars/${encodeURIComponent(
      calendarId
    )}/events/${encodeURIComponent(eventId)}`,
    {
      method: "DELETE",
      headers: { authorization: `Bearer ${accessToken}` },
    }
  );
  if (res.status === 404 || res.status === 410 || res.status === 200 || res.status === 204) {
    return;
  }
  const text = await res.text();
  throw new GoogleAuthError(
    `Failed to delete event: ${res.status} ${text}`,
    res.status === 401 ? 401 : 502
  );
}

/* -------------------------------------------------------------------------- */
/* Pull side: list events from primary calendar                               */
/* -------------------------------------------------------------------------- */

export async function listPrimaryEvents(
  accessToken: string,
  timeMin: string,
  timeMax: string
): Promise<GoogleApiEvent[]> {
  const url = new URL(`${CALENDAR_BASE}/calendars/primary/events`);
  url.searchParams.set("timeMin", timeMin);
  url.searchParams.set("timeMax", timeMax);
  url.searchParams.set("singleEvents", "true");
  url.searchParams.set("orderBy", "startTime");
  url.searchParams.set("maxResults", "500");

  const res = await fetch(url, {
    headers: { authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new GoogleAuthError(
      `Failed to list primary events: ${res.status} ${text}`,
      res.status === 401 ? 401 : 502
    );
  }
  const json = (await res.json()) as { items?: GoogleApiEvent[] };
  // Filter out the SemesterSync-pushed mirror events on the off-chance the
  // user has the SS calendar overlaid on primary.
  return (json.items ?? []).filter(
    (e) => e.extendedProperties?.private?.[SS_PRIVATE_KEY] !== SS_PRIVATE_VALUE
  );
}
