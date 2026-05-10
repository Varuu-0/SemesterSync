import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import {
  GoogleAuthError,
  listPrimaryEvents,
  refreshAccessToken,
  type GoogleApiEvent,
} from "@/lib/googleCalendar";
import type { GoogleCalendarEvent } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function GET(request: Request) {
  const supabase = supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  if (!from || !to) {
    return NextResponse.json(
      { error: "from and to query params required (ISO timestamps)" },
      { status: 400 }
    );
  }

  const settingsRes = await supabase
    .from("user_settings")
    .select("google_refresh_token, show_gcal_events")
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
    return NextResponse.json({ events: [], connected: false });
  }

  if (settingsRes.data?.show_gcal_events === false) {
    return NextResponse.json({ events: [], connected: true, hidden: true });
  }

  let accessToken: string;
  try {
    accessToken = await refreshAccessToken(refreshToken);
  } catch (e) {
    if (e instanceof GoogleAuthError && e.status === 401) {
      return NextResponse.json(
        { error: "reconnect", events: [] },
        { status: 401 }
      );
    }
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "refresh failed", events: [] },
      { status: 500 }
    );
  }

  let raw: GoogleApiEvent[];
  try {
    raw = await listPrimaryEvents(accessToken, from, to);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "list failed", events: [] },
      { status: 500 }
    );
  }

  const events: GoogleCalendarEvent[] = raw
    .map((ev) => normalize(ev))
    .filter((ev): ev is GoogleCalendarEvent => ev !== null);

  return NextResponse.json({ events, connected: true });
}

function normalize(ev: GoogleApiEvent): GoogleCalendarEvent | null {
  if (!ev.id || !ev.start || !ev.end) return null;
  if (ev.status === "cancelled") return null;
  const allDay = !!ev.start.date;
  const start = ev.start.date ?? ev.start.dateTime;
  const end = ev.end.date ?? ev.end.dateTime;
  if (!start || !end) return null;
  return {
    id: ev.id,
    summary: ev.summary ?? "(no title)",
    start,
    end,
    allDay,
    htmlLink: ev.htmlLink,
    description: ev.description,
  };
}
