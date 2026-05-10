import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
import { getAccessToken, createDeadlineEvent } from '@/lib/googleCalendar'
import type { UserSettings } from '@/lib/types'

export const runtime = 'nodejs'

export async function POST() {
  try {
    const supabase = await supabaseServer()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: settings } = await supabase
      .from('user_settings')
      .select('google_refresh_token, google_calendar_id')
      .eq('user_id', user.id)
      .single<UserSettings>()

    if (!settings?.google_refresh_token || !settings?.google_calendar_id) {
      return NextResponse.json({ error: 'Google Calendar not connected' }, { status: 400 })
    }

    const accessToken = await getAccessToken(settings.google_refresh_token)

    const { data: deadlines } = await supabase
      .from('deadlines')
      .select('id, title, due_at, course_id, google_event_id, courses(color)')
      .eq('user_id', user.id)

    const unsynced = (deadlines ?? []).filter((d: any) => !d.google_event_id) as any[]

    let synced = 0
    const errors: string[] = []

    for (const deadline of unsynced) {
      try {
        const courseColor = Array.isArray(deadline.courses)
          ? deadline.courses[0]?.color ?? '#3b82f6'
          : deadline.courses?.color ?? '#3b82f6'

        const event = await createDeadlineEvent(accessToken, settings.google_calendar_id!, {
          title: deadline.title,
          dueAt: deadline.due_at,
          courseColor,
        })

        await supabase
          .from('deadlines')
          .update({ google_event_id: event.id })
          .eq('id', deadline.id)

        synced++
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error'
        errors.push(`Failed to sync "${deadline.title}": ${msg}`)
      }
    }

    await supabase
      .from('user_settings')
      .update({ last_sync_at: new Date().toISOString() })
      .eq('user_id', user.id)

    return NextResponse.json({ synced, errors })
  } catch (err) {
    console.error('Google sync error:', err)
    const msg = err instanceof Error ? err.message : 'Internal Server Error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
