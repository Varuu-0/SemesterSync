import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

export const runtime = "nodejs";

export async function PATCH(request: Request) {
  const supabase = supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  let body: { show_gcal_events?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const patch: Record<string, unknown> = {
    user_id: user.id,
    updated_at: new Date().toISOString(),
  };
  if (typeof body.show_gcal_events === "boolean") {
    patch.show_gcal_events = body.show_gcal_events;
  }

  const { data, error } = await supabase
    .from("user_settings")
    .upsert(patch, { onConflict: "user_id" })
    .select(
      "google_refresh_token, google_calendar_id, google_connected_at, show_gcal_events, last_sync_at"
    )
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    show_gcal_events: data?.show_gcal_events ?? true,
    last_sync_at: data?.last_sync_at ?? null,
  });
}
