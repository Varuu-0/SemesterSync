import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (code) {
    const supabase = supabaseServer();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      return NextResponse.redirect(
        `${origin}/?auth_error=${encodeURIComponent(error.message)}`
      );
    }

    // If Google issued a refresh token (only when access_type=offline was
    // requested AND the user re-consented), capture it. Google issues a
    // refresh token at most once per consent grant, so we cache it ourselves.
    const session = data?.session;
    if (session?.provider_refresh_token && session.user) {
      // Use upsert so first-time and re-connect both work cleanly.
      const { error: upsertError } = await supabase
        .from("user_settings")
        .upsert(
          {
            user_id: session.user.id,
            google_refresh_token: session.provider_refresh_token,
            google_connected_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id" }
        );
      if (upsertError) {
        console.error("Failed to persist Google refresh token:", upsertError);
      }
    }
  }

  return NextResponse.redirect(`${origin}${next}`);
}
