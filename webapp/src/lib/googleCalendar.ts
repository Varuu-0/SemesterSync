const GOOGLE_CALENDAR_API = 'https://www.googleapis.com/calendar/v3'

type GoogleCalendarColor = {
  id: string
  background: string
  foreground: string
}

type CalendarEvent = {
  id: string
  summary: string
  start: { date?: string; dateTime?: string }
  end: { date?: string; dateTime?: string }
  colorId?: string
  description?: string
  source?: { title: string; url: string }
}

function getEnvCredentials() {
  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    throw new Error(
      'Google Calendar integration is not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET environment variables.'
    )
  }

  return { clientId, clientSecret }
}

async function getAccessToken(refreshToken: string): Promise<string> {
  const { clientId, clientSecret } = getEnvCredentials()

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to exchange refresh token for access token: ${error}`)
  }

  const data = await response.json()
  return data.access_token
}

async function findNearestColorId(hexColor: string, accessToken: string): Promise<string> {
  const response = await fetch(`${GOOGLE_CALENDAR_API}/colors`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to fetch Google Calendar colors: ${error}`)
  }

  const data = await response.json()
  const eventColors: Record<string, GoogleCalendarColor> = data.event

  const targetRgb = hexToRgb(hexColor)
  let nearestId = '1'
  let nearestDistance = Infinity

  for (const [id, color] of Object.entries(eventColors)) {
    const colorRgb = hexToRgb(color.background)
    const distance = colorDistance(targetRgb, colorRgb)
    if (distance < nearestDistance) {
      nearestDistance = distance
      nearestId = id
    }
  }

  return nearestId
}

async function createDeadlineEvent(
  accessToken: string,
  calendarId: string,
  deadline: { title: string; dueAt: string; courseColor: string }
): Promise<CalendarEvent> {
  const colorId = await findNearestColorId(deadline.courseColor, accessToken)

  const dueDate = new Date(deadline.dueAt).toISOString().split('T')[0]

  const event: Partial<CalendarEvent> & { source: { title: string; url: string } } = {
    summary: deadline.title,
    start: { date: dueDate },
    end: { date: dueDate },
    colorId,
    source: { title: 'SemesterSync', url: 'https://semestersync.app' },
  }

  const response = await fetch(
    `${GOOGLE_CALENDAR_API}/calendars/${encodeURIComponent(calendarId)}/events`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(event),
    }
  )

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to create deadline event: ${error}`)
  }

  return response.json()
}

async function updateDeadlineEvent(
  accessToken: string,
  calendarId: string,
  eventId: string,
  updates: Partial<CalendarEvent>
): Promise<CalendarEvent> {
  const response = await fetch(
    `${GOOGLE_CALENDAR_API}/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
    {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updates),
    }
  )

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to update deadline event ${eventId}: ${error}`)
  }

  return response.json()
}

async function deleteCalendarEvent(
  accessToken: string,
  calendarId: string,
  eventId: string
): Promise<void> {
  const response = await fetch(
    `${GOOGLE_CALENDAR_API}/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
    {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  )

  if (!response.ok && response.status !== 204) {
    const error = await response.text()
    throw new Error(`Failed to delete calendar event ${eventId}: ${error}`)
  }
}

async function listSemesterSyncEvents(
  accessToken: string,
  calendarId: string,
  timeMin: string,
  timeMax: string
): Promise<CalendarEvent[]> {
  const params = new URLSearchParams({
    timeMin,
    timeMax,
    singleEvents: 'true',
    orderBy: 'startTime',
    maxResults: '2500',
  })

  const response = await fetch(
    `${GOOGLE_CALENDAR_API}/calendars/${encodeURIComponent(calendarId)}/events?${params}`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  )

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to list SemesterSync events: ${error}`)
  }

  const data = await response.json()
  const events: CalendarEvent[] = data.items ?? []

  return events.filter(
    (event) => event.source?.url?.includes('semestersync')
  )
}

async function listPrimaryEvents(
  accessToken: string,
  timeMin: string,
  timeMax: string
): Promise<CalendarEvent[]> {
  const params = new URLSearchParams({
    timeMin,
    timeMax,
    singleEvents: 'true',
    orderBy: 'startTime',
    maxResults: '2500',
  })

  const response = await fetch(
    `${GOOGLE_CALENDAR_API}/calendars/primary/events?${params}`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  )

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to list primary calendar events: ${error}`)
  }

  const data = await response.json()
  return data.items ?? []
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const cleaned = hex.replace('#', '')
  return {
    r: parseInt(cleaned.substring(0, 2), 16),
    g: parseInt(cleaned.substring(2, 4), 16),
    b: parseInt(cleaned.substring(4, 6), 16),
  }
}

function colorDistance(
  a: { r: number; g: number; b: number },
  b: { r: number; g: number; b: number }
): number {
  return Math.sqrt((a.r - b.r) ** 2 + (a.g - b.g) ** 2 + (a.b - b.b) ** 2)
}

export {
  GOOGLE_CALENDAR_API,
  getAccessToken,
  createDeadlineEvent,
  updateDeadlineEvent,
  deleteCalendarEvent,
  listSemesterSyncEvents,
  listPrimaryEvents,
  findNearestColorId,
}

export type { GoogleCalendarColor, CalendarEvent }
