import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

export const runtime = "nodejs";

/**
 * Clear the user's Google Calendar connection state. We intentionally do NOT
 * touch any events that were already pushed to Google — the user can delete
 * the SemesterSync calendar on Google's side if they want a clean slate.
 *
 * We also clear `google_event_id` on every deadline so a future reconnect
 * starts from a clean reconciliation.
 */
export async function POST() {
  const supabase = supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const { error: settingsErr } = await supabase
    .from("user_settings")
    .upsert(
      {
        user_id: user.id,
        google_refresh_token: null,
        google_calendar_id: null,
        google_connected_at: null,
        last_sync_at: null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );

  if (settingsErr) {
    return NextResponse.json({ error: settingsErr.message }, { status: 500 });
  }

  await supabase
    .from("deadlines")
    .update({ google_event_id: null })
    .eq("user_id", user.id);

  return NextResponse.json({ ok: true });
}
