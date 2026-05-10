import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
import { getAccessToken, listPrimaryEvents } from '@/lib/googleCalendar'
import type { UserSettings } from '@/lib/types'
import type { GoogleCalendarEvent } from '@/lib/types'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl
    const timeMin = searchParams.get('timeMin')
    const timeMax = searchParams.get('timeMax')

    if (!timeMin || !timeMax) {
      return NextResponse.json({ error: 'Missing timeMin or timeMax query params' }, { status: 400 })
    }

    const supabase = await supabaseServer()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: settings } = await supabase
      .from('user_settings')
      .select('google_refresh_token, show_gcal_events')
      .eq('user_id', user.id)
      .single<UserSettings>()

    if (!settings?.google_refresh_token || settings.show_gcal_events === false) {
      return NextResponse.json({ events: [] })
    }

    const accessToken = await getAccessToken(settings.google_refresh_token)
    const rawEvents = await listPrimaryEvents(accessToken, timeMin, timeMax)

    const events: GoogleCalendarEvent[] = rawEvents
      .map((ev) => {
        if (!ev.id || !ev.start || !ev.end) return null
        if ((ev as any).status === 'cancelled') return null
        const allDay = !!ev.start.date
        const start = ev.start.date ?? ev.start.dateTime ?? ''
        const end = ev.end.date ?? ev.end.dateTime ?? ''
        if (!start || !end) return null
        return {
          id: ev.id,
          summary: ev.summary ?? '(no title)',
          start,
          end,
          allDay,
          htmlLink: (ev as any).htmlLink,
          description: ev.description,
        } as GoogleCalendarEvent
      })
      .filter((ev): ev is GoogleCalendarEvent => ev !== null)

    return NextResponse.json({ events })
  } catch (err) {
    console.error('Google events error:', err)
    const msg = err instanceof Error ? err.message : 'Internal Server Error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
