import type { Deadline, Course } from '@/lib/types'
import * as ics from 'ics'

export const exportToICS = (deadlines: Deadline[], courses: Course[]) => {
  if (!deadlines || deadlines.length === 0) return

  const courseMap = new Map(courses.map(c => [c.id, c]))

  const icsEvents: ics.EventAttributes[] = deadlines.map(d => {
    const dateObj = new Date(d.due_at)
    const year = dateObj.getFullYear()
    const month = dateObj.getMonth() + 1
    const day = dateObj.getDate()
    const course = courseMap.get(d.course_id)

    return {
      start: [year, month, day, 9, 0],
      duration: { hours: 1 },
      title: `${course?.name ?? 'Course'} - ${d.title}`,
      description: d.source_snippet ?? '',
      categories: [d.category ?? 'other'],
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
