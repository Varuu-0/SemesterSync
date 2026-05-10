import { AppEvent } from '@/context/AppContext'
import * as ics from 'ics'

export const exportToICS = (events: AppEvent[]) => {
  if (!events || events.length === 0) return

  const icsEvents: ics.EventAttributes[] = events.map(event => {
    // Parse the date (assuming format YYYY-MM-DD or similar)
    const dateObj = new Date(event.date)
    const year = dateObj.getFullYear()
    const month = dateObj.getMonth() + 1
    const day = dateObj.getDate()

    return {
      start: [year, month, day, 9, 0], // Defaulting to 9 AM
      duration: { hours: 1 }, // Default 1 hour duration
      title: `${event.courseId} - ${event.title}`,
      description: event.description,
      categories: [event.type],
    }
  })

  ics.createEvents(icsEvents, (error, value) => {
    if (error) {
      console.error('Error generating ICS file:', error)
      return
    }

    const blob = new Blob([value], { type: 'text/calendar;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    
    const a = document.createElement('a')
    a.href = url
    a.download = 'SemesterSync_Schedule.ics'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  })
}
