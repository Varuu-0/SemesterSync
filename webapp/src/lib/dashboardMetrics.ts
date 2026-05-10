import type { Course, Deadline, DeadlineCategory } from './types'
import { CATEGORY_LABELS } from './types'

export type CourseWorkload = {
  course: Course
  upcoming: number
  missed: number
  completed: number
  total: number
}

export type CategoryCount = {
  category: string
  count: number
}

export type WeekWorkload = {
  label: string
  count: number
}

export type DashboardMetrics = {
  nextDeadline: Deadline | null
  upcomingThisWeek: Deadline[]
  upcoming: Deadline[]
  missed: Deadline[]
  completed: Deadline[]
  completedThisWeek: number
  completedCount: number
  totalCount: number
  completionRate: number
  heaviestCourse: CourseWorkload | null
  workloadByWeek: WeekWorkload[]
  workloadByCourse: CourseWorkload[]
  categoryBreakdown: CategoryCount[]
  doomWeekScore: number
}

export function computeMetrics(
  courses: Course[],
  deadlines: Deadline[],
): DashboardMetrics {
  const now = new Date()
  const startOfWeek = new Date(now)
  startOfWeek.setDate(now.getDate() - now.getDay())
  startOfWeek.setHours(0, 0, 0, 0)
  const endOfWeek = new Date(startOfWeek)
  endOfWeek.setDate(endOfWeek.getDate() + 7)

  const upcoming: Deadline[] = []
  const missed: Deadline[] = []
  const completed: Deadline[] = []

  deadlines.forEach((d) => {
    if (d.completed_at) {
      completed.push(d)
    } else if (new Date(d.due_at) < now) {
      missed.push(d)
    } else {
      upcoming.push(d)
    }
  })

  upcoming.sort((a, b) => new Date(a.due_at).getTime() - new Date(b.due_at).getTime())
  missed.sort((a, b) => new Date(b.due_at).getTime() - new Date(a.due_at).getTime())
  completed.sort((a, b) => new Date(b.completed_at!).getTime() - new Date(a.completed_at!).getTime())

  const upcomingThisWeek = upcoming.filter((d) => {
    const due = new Date(d.due_at)
    return due >= startOfWeek && due < endOfWeek
  })

  const weekAgo = new Date(now)
  weekAgo.setDate(weekAgo.getDate() - 7)
  const completedThisWeek = completed.filter(
    (d) => d.completed_at && new Date(d.completed_at) >= weekAgo,
  ).length

  const totalCount = deadlines.length
  const completedCount = completed.length
  const completionRate =
    totalCount > 0
      ? (completedCount) /
        (completedCount + missed.length || 1)
      : 0

  const nextDeadline = upcoming.length > 0 ? upcoming[0] : null

  const coursesById = new Map(courses.map((c) => [c.id, c]))

  const workloadByCourse: CourseWorkload[] = courses
    .map((course) => {
      const courseDeadlines = deadlines.filter((d) => d.course_id === course.id)
      const up = courseDeadlines.filter(
        (d) => !d.completed_at && new Date(d.due_at) >= now,
      ).length
      const ms = courseDeadlines.filter(
        (d) => !d.completed_at && new Date(d.due_at) < now,
      ).length
      const cm = courseDeadlines.filter((d) => d.completed_at).length
      return { course, upcoming: up, missed: ms, completed: cm, total: courseDeadlines.length }
    })
    .filter((w) => w.total > 0)
    .sort((a, b) => b.upcoming - a.upcoming)

  const heaviestCourse =
    workloadByCourse.length > 0 ? workloadByCourse[0] : null

  const thirtyDaysFromNow = new Date(now)
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30)
  const next30 = deadlines.filter((d) => {
    const due = new Date(d.due_at)
    return due >= now && due <= thirtyDaysFromNow
  })

  const categoryMap: Record<string, number> = {}
  next30.forEach((d) => {
    const cat = d.category || 'other'
    categoryMap[cat] = (categoryMap[cat] || 0) + 1
  })
  const categoryBreakdown: CategoryCount[] = Object.entries(categoryMap)
    .map(([category, count]) => ({
      category: CATEGORY_LABELS[category as DeadlineCategory] ?? category,
      count,
    }))
    .sort((a, b) => b.count - a.count)

  const workloadByWeek: WeekWorkload[] = []
  for (let i = 0; i < 4; i++) {
    const weekStart = new Date(startOfWeek)
    weekStart.setDate(weekStart.getDate() + i * 7)
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekEnd.getDate() + 7)
    const label = weekStart.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
    })
    const count = deadlines.filter((d) => {
      const due = new Date(d.due_at)
      return due >= weekStart && due < weekEnd && !d.completed_at
    }).length
    workloadByWeek.push({ label, count })
  }

  const doomWeekScore = upcomingThisWeek.reduce((score, d) => {
    const typeWeight: Record<string, number> = {
      exam: 3, project: 2.5, assignment: 1.5, quiz: 1, lab: 1.2, other: 1,
    }
    const tw = typeWeight[d.category || 'other'] || 1
    const gw = 0.5
    return score + tw * gw
  }, 0)

  return {
    nextDeadline,
    upcomingThisWeek,
    upcoming,
    missed,
    completed,
    completedThisWeek,
    completedCount,
    totalCount,
    completionRate,
    heaviestCourse,
    workloadByWeek,
    workloadByCourse,
    categoryBreakdown,
    doomWeekScore: Math.round(doomWeekScore * 10) / 10,
  }
}
