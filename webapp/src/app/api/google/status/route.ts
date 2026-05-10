import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
import type { UserSettings } from '@/lib/types'

export const runtime = 'nodejs'

export async function GET() {
  try {
    if (!process.env.GOOGLE_CLIENT_ID) {
      return NextResponse.json({ connected: false, notConfigured: true })
    }

    const supabase = await supabaseServer()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: settings } = await supabase
      .from('user_settings')
      .select('google_refresh_token, last_sync_at, show_gcal_events')
      .eq('user_id', user.id)
      .single<UserSettings>()

    if (!settings || !settings.google_refresh_token) {
      return NextResponse.json({
        connected: false,
        lastSyncAt: null,
        showGcalEvents: settings?.show_gcal_events ?? true,
      })
    }

    return NextResponse.json({
      connected: true,
      lastSyncAt: settings.last_sync_at ?? null,
      showGcalEvents: settings.show_gcal_events,
    })
  } catch (err) {
    console.error('Google status error:', err)
    const msg = err instanceof Error ? err.message : 'Internal Server Error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
