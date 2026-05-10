import { createServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') || '/dashboard'

  if (code) {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          },
        },
      }
    )

    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.provider_token) {
        const userId = session.user.id
        const { data: settings } = await supabase
          .from('user_settings')
          .select('user_id')
          .eq('user_id', userId)
          .single()

        const upsertData = {
          user_id: userId,
          google_refresh_token: session.refresh_token || null,
          google_connected_at: new Date().toISOString(),
          show_gcal_events: true,
        }

        if (settings) {
          await supabase.from('user_settings').update({
            google_refresh_token: upsertData.google_refresh_token,
            google_connected_at: upsertData.google_connected_at,
          }).eq('user_id', userId)
        } else {
          await supabase.from('user_settings').insert(upsertData)
        }
      }

      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}/?error=auth`)
}
