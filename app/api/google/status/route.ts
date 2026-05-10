import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

export const runtime = "nodejs";

export async function GET() {
  const supabase = supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const { data: settings, error } = await supabase
    .from("user_settings")
    .select(
      "google_refresh_token, google_calendar_id, google_connected_at, show_gcal_events, last_sync_at"
    )
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    connected: !!settings?.google_refresh_token,
    google_calendar_id: settings?.google_calendar_id ?? null,
    google_connected_at: settings?.google_connected_at ?? null,
    show_gcal_events: settings?.show_gcal_events ?? true,
    last_sync_at: settings?.last_sync_at ?? null,
    server_configured:
      !!process.env.GOOGLE_CLIENT_ID && !!process.env.GOOGLE_CLIENT_SECRET,
  });
}
