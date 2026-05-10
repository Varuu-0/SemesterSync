'use client'

import { useMemo, useState, useEffect } from 'react'
import Link from 'next/link'
import { motion } from 'motion/react'
import { format } from 'date-fns'
import { useAppContext } from '@/context/AppContext'
import { useAuth } from '@/hooks/useAuth'
import { computeMetrics, type CourseWorkload } from '@/lib/dashboardMetrics'
import { CATEGORY_LABELS, type Course, type Deadline, type GoogleCalendarEvent } from '@/lib/types'
import { DashboardSkeleton } from '@/components/DashboardSkeleton'
import { DashboardEmptyState } from '@/components/dashboard/DashboardEmptyState'
import { DeadlineRow } from '@/components/DeadlineRow'
import { CalendarView } from '@/components/CalendarView'
import GoogleCalendarPanel from '@/components/GoogleCalendarPanel'
import { exportToICS } from '@/lib/exportIcs'
import {
  Clock, AlertTriangle, Target, TrendingUp, Download,
  ChevronUp, ChevronDown, DownloadCloud,
} from 'lucide-react'
import { supabaseBrowser } from '@/lib/supabase'

const UPCOMING_VISIBLE = 8
const MISSED_VISIBLE = 5
const COMPLETED_VISIBLE = 5

export default function DashboardPage() {
  const { courses, deadlines, dataLoading, toggleDeadlineCompletion, loadFromSupabase } = useAppContext()
  const { user, loading: authLoading } = useAuth()
  const [showAllUpcoming, setShowAllUpcoming] = useState(false)
  const [showAllMissed, setShowAllMissed] = useState(false)
  const [completedOpen, setCompletedOpen] = useState(false)
  const [busyIds, setBusyIds] = useState<Record<string, boolean>>({})
  const [googleEvents, setGoogleEvents] = useState<GoogleCalendarEvent[]>([])

  useEffect(() => {
    if (user?.id) loadFromSupabase(user.id)
  }, [user?.id, loadFromSupabase])

  const metrics = useMemo(
    () => computeMetrics(courses, deadlines),
    [courses, deadlines],
  )

  const coursesById = useMemo(() => {
    const m: Record<string, Course> = {}
    courses.forEach(c => { m[c.id] = c })
    return m
  }, [courses])

  async function toggleCompleted(d: Deadline, next: boolean) {
    const nextValue = next ? new Date().toISOString() : null
    const previous = d.completed_at
    setBusyIds(prev => ({ ...prev, [d.id]: true }))
    toggleDeadlineCompletion(d.id, next, user?.id || '')
    const supabase = supabaseBrowser()
    const { error } = await supabase
      .from('deadlines')
      .update({ completed_at: nextValue })
      .eq('id', d.id)
    setBusyIds(prev => {
      const { [d.id]: _, ...rest } = prev
      return rest
    })
    if (error) {
      toggleDeadlineCompletion(d.id, !!previous, user?.id || '')
    }
    if (next) {
      const heaviestId = metrics.heaviestCourse?.course.id
      const wasOnlyWeekTask =
        metrics.upcomingThisWeek.some(x => x.id === d.id) &&
        metrics.upcomingThisWeek.filter(x => x.id !== d.id).length === 0
      const heaviestHit = heaviestId != null && d.course_id === heaviestId
      if (wasOnlyWeekTask || heaviestHit) {
        void import('canvas-confetti').then(mod => {
          mod.default({
            particleCount: heaviestHit && wasOnlyWeekTask ? 90 : 55,
            spread: 68,
            origin: { y: 0.74 },
            scalar: 0.9,
            ticks: 120,
          })
        })
      }
    }
  }

  function exportIcs() {
    if (deadlines.length === 0) {
      alert('No deadlines yet. Upload a syllabus PDF on the Courses page.')
      return
    }
    exportToICS(deadlines, courses)
  }

  const loading = authLoading || dataLoading
  const empty = !loading && deadlines.length === 0

  const upcomingList = showAllUpcoming
    ? metrics.upcoming
    : metrics.upcoming.slice(0, UPCOMING_VISIBLE)
  const missedList = showAllMissed
    ? metrics.missed
    : metrics.missed.slice(0, MISSED_VISIBLE)
  const completedList = completedOpen
    ? metrics.completed
    : metrics.completed.slice(0, COMPLETED_VISIBLE)

  if (loading) return <DashboardSkeleton />

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <motion.h1
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-2xl font-semibold text-white"
          >
            Dashboard
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="mt-1 text-sm text-white/40"
          >
            Your semester at a glance: workload, what&apos;s next, and what you&apos;ve already crushed.
          </motion.p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/dashboard/courses"
            className="rounded-lg bg-white/5 border border-white/10 px-3 py-1.5 text-sm font-medium text-white/60 hover:bg-white/10 hover:text-white transition-all"
          >
            Manage courses
          </Link>
          <button
            type="button"
            onClick={exportIcs}
            className="rounded-lg px-3 py-1.5 text-sm font-medium text-white transition-all hover:opacity-90"
            style={{
              background: 'linear-gradient(to top right, var(--theme-brand-from), var(--theme-brand-to))',
            }}
          >
            Export .ics
          </button>
        </div>
      </div>

      {empty && <DashboardEmptyState />}

      {!empty && (
        <>
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
          >
            <MetricCard
              label="Upcoming this week"
              value={metrics.upcomingThisWeek.length}
              hint={
                metrics.nextDeadline
                  ? `Next: ${formatShort(new Date(metrics.nextDeadline.due_at))}`
                  : 'Nothing on deck'
              }
              tone="default"
              icon={<ClockIcon />}
            />
            <MetricCard
              label="Missed"
              value={metrics.missed.length}
              hint={
                metrics.missed.length === 0
                  ? 'All caught up'
                  : 'Past due, not checked off'
              }
              tone={metrics.missed.length > 0 ? 'danger' : 'good'}
              icon={<AlertIcon />}
            />
            <MetricCard
              label="Heaviest course (30d)"
              value={metrics.heaviestCourse?.upcoming ?? 0}
              hint={
                metrics.heaviestCourse
                  ? metrics.heaviestCourse.course.name
                  : 'No upcoming deadlines'
              }
              accentColor={metrics.heaviestCourse?.course.color}
              icon={<StackIcon />}
            />
            <MetricCard
              label="On-time rate"
              value={`${Math.round(metrics.completionRate * 100)}%`}
              hint={
                metrics.completedCount + metrics.missed.length === 0
                  ? 'Nothing graded yet'
                  : `${metrics.completedCount} done · ${metrics.missed.length} missed`
              }
              tone={
                metrics.completionRate >= 0.8
                  ? 'good'
                  : metrics.completionRate >= 0.5
                    ? 'default'
                    : 'danger'
              }
              icon={<TargetIcon />}
            />
          </motion.section>

          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="space-y-3"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-white/40">
                Calendar
              </h2>
              {courses.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5">
                  {courses.map(c => {
                    const hex = c.color
                    return (
                      <span
                        key={c.id}
                        className="inline-flex items-center gap-1.5 rounded-full bg-white/5 px-2 py-0.5 text-[11px] font-medium text-white/60 ring-1 ring-white/10"
                      >
                        <span className="h-2 w-2 rounded-full" style={{ background: hex }} />
                        {c.name}
                      </span>
                    )
                  })}
                </div>
              )}
            </div>
            <GoogleCalendarPanel onEventsChange={setGoogleEvents} />
            <CalendarView
              deadlines={deadlines}
              coursesById={coursesById}
              googleEvents={googleEvents}
            />
          </motion.section>

          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="grid gap-4 lg:grid-cols-3"
          >
            <WorkloadByWeek metrics={metrics} />
            <WorkloadByCourse workload={metrics.workloadByCourse} coursesCount={courses.length} />
            <CategoryMix metrics={metrics} />
          </motion.section>

          <Section
            title="Up next"
            subtitle={`${metrics.upcoming.length} incomplete · sorted by due date`}
            actions={
              metrics.upcoming.length > UPCOMING_VISIBLE && (
                <button
                  type="button"
                  onClick={() => setShowAllUpcoming(v => !v)}
                  className="text-xs font-medium text-white/40 hover:text-white/80 transition-colors"
                >
                  {showAllUpcoming
                    ? 'Show top 8'
                    : `Show all ${metrics.upcoming.length}`}
                </button>
              )
            }
          >
            {metrics.upcoming.length === 0 ? (
              <Placeholder>Nothing upcoming. Upload a fresh syllabus to get started.</Placeholder>
            ) : (
              <ul className="space-y-2">
                {upcomingList.map(d => (
                  <DeadlineRow
                    key={d.id}
                    deadline={d}
                    course={courses.find(c => c.id === d.course_id)}
                    variant="upcoming"
                    busy={!!busyIds[d.id]}
                    onToggle={(next) => toggleCompleted(d, next)}
                  />
                ))}
              </ul>
            )}
          </Section>

          {metrics.missed.length > 0 && (
            <Section
              title="Missed"
              subtitle={`${metrics.missed.length} past due — check off any you've actually finished`}
              tone="danger"
              actions={
                metrics.missed.length > MISSED_VISIBLE && (
                  <button
                    type="button"
                    onClick={() => setShowAllMissed(v => !v)}
                    className="text-xs font-medium text-white/40 hover:text-white/80 transition-colors"
                  >
                    {showAllMissed
                      ? `Show top ${MISSED_VISIBLE}`
                      : `Show all ${metrics.missed.length}`}
                  </button>
                )
              }
            >
              <ul className="space-y-2">
                {missedList.map(d => (
                  <DeadlineRow
                    key={d.id}
                    deadline={d}
                    course={courses.find(c => c.id === d.course_id)}
                    variant="missed"
                    busy={!!busyIds[d.id]}
                    onToggle={(next) => toggleCompleted(d, next)}
                  />
                ))}
              </ul>
            </Section>
          )}

          {metrics.completed.length > 0 && (
            <Section
              title="Completed"
              subtitle={`${metrics.completed.length} done · ${metrics.completedThisWeek} in the last 7 days`}
              actions={
                <button
                  type="button"
                  onClick={() => setCompletedOpen(v => !v)}
                  className="text-xs font-medium text-white/40 hover:text-white/80 transition-colors"
                >
                  {completedOpen
                    ? 'Collapse'
                    : metrics.completed.length > COMPLETED_VISIBLE
                      ? `Show all ${metrics.completed.length}`
                      : 'Expand'}
                </button>
              }
            >
              <ul className="space-y-2">
                {completedList.map(d => (
                  <DeadlineRow
                    key={d.id}
                    deadline={d}
                    course={courses.find(c => c.id === d.course_id)}
                    variant="completed"
                    busy={!!busyIds[d.id]}
                    onToggle={(next) => toggleCompleted(d, next)}
                  />
                ))}
              </ul>
            </Section>
          )}
        </>
      )}
    </div>
  )
}

function MetricCard({
  label,
  value,
  hint,
  tone = 'default',
  icon,
  accentColor,
}: {
  label: string
  value: number | string
  hint?: string
  tone?: 'default' | 'good' | 'danger'
  icon?: React.ReactNode
  accentColor?: string
}) {
  const toneClass =
    tone === 'danger'
      ? 'text-red-400'
      : tone === 'good'
        ? 'text-emerald-400'
        : 'text-white'

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[24px] p-4 relative overflow-hidden"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="text-xs font-semibold uppercase tracking-wide text-white/40">
          {label}
        </div>
        <span
          className="flex h-7 w-7 items-center justify-center rounded-lg text-white/50"
          style={
            accentColor
              ? { background: `${accentColor}20`, color: accentColor }
              : { background: 'rgba(255,255,255,0.05)' }
          }
        >
          {icon}
        </span>
      </div>
      <div className={`mt-2 text-3xl font-semibold tabular-nums ${toneClass}`}>
        {value}
      </div>
      {hint && (
        <div className="mt-1 truncate text-xs text-white/30">{hint}</div>
      )}
      <div className="absolute -bottom-8 -right-8 w-24 h-24 rounded-full opacity-5 blur-2xl pointer-events-none" style={{ backgroundColor: accentColor || 'var(--theme-accent)' }} />
    </motion.div>
  )
}

function Section({
  title,
  subtitle,
  actions,
  tone,
  children,
}: {
  title: string
  subtitle?: string
  actions?: React.ReactNode
  tone?: 'danger'
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(true)
  return (
    <section>
      <div className="mb-3 flex items-end justify-between gap-3">
        <button onClick={() => setOpen(!open)} className="flex items-center gap-2 group">
          <h2
            className={`text-sm font-semibold uppercase tracking-wide ${
              tone === 'danger' ? 'text-red-400' : 'text-white/40'
            }`}
          >
            {title}
          </h2>
          {open ? <ChevronUp size={14} className="text-white/20" /> : <ChevronDown size={14} className="text-white/20" />}
        </button>
        {actions}
      </div>
      {open && children}
    </section>
  )
}

function Placeholder({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-[24px] border border-dashed border-white/10 bg-white/[0.02] backdrop-blur-xl p-6 text-center text-sm text-white/30">
      {children}
    </div>
  )
}

function WorkloadByWeek({ metrics }: { metrics: ReturnType<typeof computeMetrics> }) {
  const max = Math.max(1, ...metrics.workloadByWeek.map(w => w.count))
  return (
    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[24px] p-4">
      <div className="text-xs font-semibold uppercase tracking-wide text-white/40">
        Workload · next 4 weeks
      </div>
      <ul className="mt-3 space-y-2.5">
        {metrics.workloadByWeek.map((w, i) => {
          const pct = (w.count / max) * 100
          return (
            <li key={i} className="flex items-center gap-3 text-sm">
              <span className="w-20 shrink-0 text-xs text-white/50">{w.label}</span>
              <span className="relative h-2 flex-1 overflow-hidden rounded-full bg-white/5">
                <motion.span
                  className="absolute inset-y-0 left-0 rounded-full"
                  style={{ backgroundColor: 'var(--theme-accent)' }}
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.8, delay: i * 0.1 }}
                />
              </span>
              <span className="w-6 text-right text-xs font-semibold tabular-nums text-white/60">
                {w.count}
              </span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function WorkloadByCourse({
  workload,
  coursesCount,
}: {
  workload: CourseWorkload[]
  coursesCount: number
}) {
  const top = workload.slice(0, 5)
  const max = Math.max(1, ...top.map(w => w.upcoming))
  return (
    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[24px] p-4">
      <div className="text-xs font-semibold uppercase tracking-wide text-white/40">
        Workload · by course
      </div>
      {top.length === 0 ? (
        <div className="mt-4 text-xs text-white/30">
          {coursesCount === 0 ? 'Add courses to see this chart.' : 'No upcoming deadlines.'}
        </div>
      ) : (
        <ul className="mt-3 space-y-2.5">
          {top.map(w => {
            const pct = (w.upcoming / max) * 100
            const hex = w.course.color
            return (
              <li key={w.course.id} className="text-sm">
                <div className="mb-1 flex items-center justify-between gap-2">
                  <span className="flex min-w-0 items-center gap-1.5">
                    <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: hex }} />
                    <span className="truncate text-xs font-medium text-white/70">{w.course.name}</span>
                  </span>
                  <span className="shrink-0 text-xs tabular-nums text-white/40">
                    {w.upcoming}
                    {w.missed > 0 && (
                      <span className="ml-1 text-red-400">+{w.missed} missed</span>
                    )}
                  </span>
                </div>
                <span className="block h-1.5 overflow-hidden rounded-full bg-white/5">
                  <motion.span
                    className="block h-full rounded-full"
                    style={{ width: `${pct}%`, background: hex }}
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.8 }}
                  />
                </span>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

function CategoryMix({ metrics }: { metrics: ReturnType<typeof computeMetrics> }) {
  return (
    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[24px] p-4">
      <div className="text-xs font-semibold uppercase tracking-wide text-white/40">
        Mix · next 30 days
      </div>
      {metrics.categoryBreakdown.length === 0 ? (
        <div className="mt-4 text-xs text-white/30">Nothing in the next 30 days.</div>
      ) : (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {metrics.categoryBreakdown.map(c => (
            <span
              key={c.category}
              className="inline-flex items-center gap-1.5 rounded-full bg-white/5 px-2.5 py-1 text-xs font-medium text-white/60"
            >
              <span className="capitalize">
                {c.category === 'uncategorized'
                  ? 'Other'
                  : (CATEGORY_LABELS[c.category as keyof typeof CATEGORY_LABELS] ?? c.category)}
              </span>
              <span className="tabular-nums" style={{ color: 'var(--theme-accent)' }}>{c.count}</span>
            </span>
          ))}
        </div>
      )}
      <div className="mt-4 grid grid-cols-3 gap-2 border-t border-white/10 pt-3 text-center">
        <Stat label="Tracked" value={metrics.totalCount} />
        <Stat label="Done" value={metrics.completedCount} />
        <Stat label="Open" value={metrics.upcoming.length} />
      </div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="text-lg font-semibold tabular-nums text-white">{value}</div>
      <div className="text-[10px] uppercase tracking-wide text-white/30">{label}</div>
    </div>
  )
}

function formatShort(d: Date): string {
  return d.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
}

function ClockIcon() {
  return (
    <Svg>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </Svg>
  )
}
function AlertIcon() {
  return (
    <Svg>
      <path d="M12 3l10 18H2L12 3z" />
      <path d="M12 10v5" />
      <path d="M12 18v.01" />
    </Svg>
  )
}
function StackIcon() {
  return (
    <Svg>
      <path d="M3 7l9-4 9 4-9 4-9-4z" />
      <path d="M3 12l9 4 9-4" />
      <path d="M3 17l9 4 9-4" />
    </Svg>
  )
}
function TargetIcon() {
  return (
    <Svg>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="12" cy="12" r="1.5" />
    </Svg>
  )
}
function Svg({ children }: { children: React.ReactNode }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {children}
    </svg>
  )
}
