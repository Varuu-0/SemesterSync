export const TYPE_WEIGHTS: Record<string, number> = {
  exam: 3.0,
  project: 2.5,
  presentation: 2.0,
  assignment: 1.5,
  lab: 1.2,
  quiz: 1.0,
  reading: 0.5,
  deadline: 2.0,
  other: 1.0,
}

const THRESHOLDS = {
  normal: { max: 4, label: 'Chill', emoji: '😊', color: '#10b981' },
  busy: { max: 7, label: 'Busy', emoji: '😰', color: '#f59e0b' },
  heavy: { max: 10, label: 'Critical', emoji: '😫', color: '#f97316' },
  doom: { max: Infinity, label: 'DOOM WEEK', emoji: '💀', color: '#ef4444' },
}

export type SeverityLevel = 'normal' | 'busy' | 'heavy' | 'doom'

export type Severity = {
  level: SeverityLevel
  label: string
  emoji: string
  color: string
  max: number
}

export type EventLike = {
  date: string
  type: string
  weight?: number
}

export type WeekScore = {
  weekKey: string
  weekStart: string
  events: EventLike[]
  score: number
  severity: Severity
  eventCount: number
}

export type BurnoutAnalysis = {
  weekScores: WeekScore[]
  peakWeek: WeekScore | null
  warnings: WeekScore[]
  doomWeeks: WeekScore[]
}

function getISOWeek(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`
}

function getWeekStart(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  d.setDate(diff)
  return d.toISOString().split('T')[0]
}

function calculateStressScore(events: EventLike[]): number {
  return events.reduce((score, event) => {
    const typeWeight = TYPE_WEIGHTS[event.type] || TYPE_WEIGHTS.other
    const gradeWeight = event.weight ? Math.min(event.weight / 20, 2) : 0.5
    return score + typeWeight * gradeWeight
  }, 0)
}

export function getSeverity(score: number): Severity {
  if (score <= THRESHOLDS.normal.max)
    return { ...THRESHOLDS.normal, level: 'normal' }
  if (score <= THRESHOLDS.busy.max)
    return { ...THRESHOLDS.busy, level: 'busy' }
  if (score <= THRESHOLDS.heavy.max)
    return { ...THRESHOLDS.heavy, level: 'heavy' }
  return { ...THRESHOLDS.doom, level: 'doom' }
}

export function analyzeBurnout(events: EventLike[]): BurnoutAnalysis {
  const weekMap: Record<string, WeekScore> = {}

  events.forEach((event) => {
    if (!event.date) return
    const weekKey = getISOWeek(event.date)
    const weekStart = getWeekStart(event.date)
    if (!weekMap[weekKey]) {
      weekMap[weekKey] = { weekKey, weekStart, events: [], score: 0, severity: getSeverity(0), eventCount: 0 }
    }
    weekMap[weekKey].events.push(event)
  })

  const weekScores = Object.values(weekMap).map((week) => {
    const score = calculateStressScore(week.events)
    const severity = getSeverity(score)
    return {
      ...week,
      score: Math.round(score * 10) / 10,
      severity,
      eventCount: week.events.length,
    }
  })

  weekScores.sort((a, b) => a.weekStart.localeCompare(b.weekStart))

  const peakWeek = weekScores.reduce<WeekScore | null>(
    (peak, w) => (w.score > (peak?.score ?? 0) ? w : peak),
    null,
  )

  const warnings = weekScores.filter((w) => w.severity.level !== 'normal')
  const doomWeeks = weekScores.filter((w) => w.severity.level === 'doom')

  return { weekScores, peakWeek, warnings, doomWeeks }
}

export function getSemesterSummary(analysis: BurnoutAnalysis): string {
  const { weekScores, peakWeek, doomWeeks } = analysis
  if (weekScores.length === 0) return 'No events to analyze.'

  const avgScore = weekScores.reduce((s, w) => s + w.score, 0) / weekScores.length

  if (doomWeeks.length >= 3) {
    return `Your semester has ${doomWeeks.length} doom weeks. This is going to be intense. Plan ahead!`
  }
  if (doomWeeks.length > 0) {
    return `Watch out for ${doomWeeks.length} high-intensity week${doomWeeks.length > 1 ? 's' : ''}. Peak stress: week of ${peakWeek?.weekStart}.`
  }
  if (avgScore > 5) {
    return 'Your semester is consistently busy. Stay on top of weekly tasks.'
  }
  return 'Your semester looks manageable. Keep it up!'
}
