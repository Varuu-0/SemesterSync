import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import {
  GoogleAuthError,
  createDeadlineEvent,
  deleteCalendarEvent,
  ensureSemesterSyncCalendar,
  listSemesterSyncEvents,
  refreshAccessToken,
  updateDeadlineEvent,
  type DeadlinePayload,
} from "@/lib/googleCalendar";

export const runtime = "nodejs";
export const maxDuration = 60;

type DeadlineRow = {
  id: string;
  title: string;
  due_at: string;
  category: string | null;
  source_snippet: string | null;
  completed_at: string | null;
  google_event_id: string | null;
  course: { name: string; color: string } | null;
};

/**
 * Full reconciliation push:
 *   1. Refresh a fresh access token using the stored refresh token.
 *   2. Make sure a "SemesterSync" calendar exists in Google.
 *   3. List every existing SemesterSync event in Google.
 *   4. For every deadline in Postgres → upsert into Google.
 *   5. For every Google event whose `deadline_id` no longer maps to a row in
 *      Postgres → delete it.
 */
export async function POST() {
  const supabase = supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const settingsRes = await supabase
    .from("user_settings")
    .select("google_refresh_token, google_calendar_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (settingsRes.error) {
    return NextResponse.json(
      { error: settingsRes.error.message },
      { status: 500 }
    );
  }
  const refreshToken = settingsRes.data?.google_refresh_token;
  if (!refreshToken) {
    return NextResponse.json(
      { error: "Google Calendar is not connected." },
      { status: 400 }
    );
  }

  let accessToken: string;
  try {
    accessToken = await refreshAccessToken(refreshToken);
  } catch (e) {
    if (e instanceof GoogleAuthError && e.status === 401) {
      // Token revoked — clear it so the UI prompts a reconnect.
      await supabase
        .from("user_settings")
        .update({
          google_refresh_token: null,
          google_calendar_id: null,
          google_connected_at: null,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", user.id);
      return NextResponse.json(
        { error: "Google revoked access. Please reconnect." },
        { status: 401 }
      );
    }
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Token refresh failed" },
      { status: 500 }
    );
  }

  let calendarId: string;
  try {
    calendarId = await ensureSemesterSyncCalendar(
      accessToken,
      settingsRes.data?.google_calendar_id ?? null
    );
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Calendar setup failed" },
      { status: 500 }
    );
  }

  if (calendarId !== settingsRes.data?.google_calendar_id) {
    await supabase
      .from("user_settings")
      .update({
        google_calendar_id: calendarId,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", user.id);
  }

  // Pull current state from both sides.
  const [deadlinesRes, gcalEvents] = await Promise.all([
    supabase
      .from("deadlines")
      .select(
        "id, title, due_at, category, source_snippet, completed_at, google_event_id, course:courses!inner(name, color)"
      )
      .eq("user_id", user.id)
      .returns<DeadlineRow[]>(),
    listSemesterSyncEvents(accessToken, calendarId),
  ]);

  if (deadlinesRes.error) {
    return NextResponse.json(
      { error: deadlinesRes.error.message },
      { status: 500 }
    );
  }
  const deadlines = deadlinesRes.data ?? [];

  // Build a quick lookup of GCal events by deadline_id (extended property)
  // and by event id (for the case where Postgres has a stored google_event_id).
  const eventByDeadlineId = new Map<string, string>(); // deadline.id → gcal event id
  const eventIds = new Set<string>();
  for (const ev of gcalEvents) {
    eventIds.add(ev.id);
    const did = ev.extendedProperties?.private?.deadline_id;
    if (did) eventByDeadlineId.set(did, ev.id);
  }

  let created = 0;
  let updated = 0;
  let deleted = 0;
  const errors: string[] = [];
  const referencedEventIds = new Set<string>();

  for (const d of deadlines) {
    const payload: DeadlinePayload = {
      id: d.id,
      title: d.title,
      courseName: d.course?.name,
      courseColor: d.course?.color,
      due_at: d.due_at,
      category: d.category,
      source_snippet: d.source_snippet,
      completed_at: d.completed_at,
    };

    // Prefer the stored event id; fall back to extended-property lookup.
    let eventId =
      (d.google_event_id && eventIds.has(d.google_event_id)
        ? d.google_event_id
        : null) ?? eventByDeadlineId.get(d.id) ?? null;

    try {
      if (eventId) {
        const newId = await updateDeadlineEvent(
          accessToken,
          calendarId,
          eventId,
          payload
        );
        eventId = newId;
        updated += 1;
      } else {
        eventId = await createDeadlineEvent(accessToken, calendarId, payload);
        created += 1;
      }

      if (eventId !== d.google_event_id) {
        await supabase
          .from("deadlines")
          .update({ google_event_id: eventId })
          .eq("id", d.id);
      }
      referencedEventIds.add(eventId);
    } catch (e) {
      errors.push(
        `${d.title}: ${e instanceof Error ? e.message : String(e)}`
      );
    }
  }

  // Anything in GCal that's no longer in Postgres should be deleted.
  for (const ev of gcalEvents) {
    if (referencedEventIds.has(ev.id)) continue;
    const did = ev.extendedProperties?.private?.deadline_id;
    // Defensive: skip events that don't carry our marker (shouldn't happen
    // because we filtered on it, but safer to be explicit).
    if (!did) continue;
    try {
      await deleteCalendarEvent(accessToken, calendarId, ev.id);
      deleted += 1;
    } catch (e) {
      errors.push(
        `delete ${ev.summary ?? ev.id}: ${
          e instanceof Error ? e.message : String(e)
        }`
      );
    }
  }

  await supabase
    .from("user_settings")
    .update({
      last_sync_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", user.id);

  return NextResponse.json({
    ok: errors.length === 0,
    created,
    updated,
    deleted,
    total: deadlines.length,
    errors,
    calendar_id: calendarId,
  });
}
