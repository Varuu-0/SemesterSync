'use client'

import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin from '@fullcalendar/interaction'
import { useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { X, ExternalLink } from 'lucide-react'
import {
  CATEGORY_LABELS,
  type Course,
  type Deadline,
  type DeadlineCategory,
  type GoogleCalendarEvent,
} from '@/lib/types'

export function CalendarView({
  deadlines,
  coursesById,
  googleEvents,
}: {
  deadlines: Deadline[]
  coursesById: Record<string, Course>
  googleEvents?: GoogleCalendarEvent[]
}) {
  const [detail, setDetail] = useState<CalendarDetail | null>(null)

  const events = useMemo(() => {
    const deadlineEvents = deadlines.map((d) => {
      const course = coursesById[d.course_id]
      const color = course?.color ?? '#3b82f6'
      const completed = !!d.completed_at
      const titlePrefix = completed ? '✓ ' : ''
      return {
        id: d.id,
        title: `${titlePrefix}${course ? `${course.name}: ${d.title}` : d.title}`,
        start: new Date(d.due_at),
        allDay: true,
        backgroundColor: color,
        borderColor: color,
        textColor: '#ffffff',
        classNames: completed ? ['ss-event-completed'] : [],
        extendedProps: {
          source: 'deadline' as const,
          snippet: d.source_snippet,
          category: d.category,
          completed,
          courseName: course?.name ?? 'Course',
          dueLabel: formatDueLabel(new Date(d.due_at)),
        },
      }
    })

    const externalEvents = (googleEvents ?? []).map((ev) => ({
      id: `gcal:${ev.id}`,
      title: ev.summary,
      start: ev.start,
      end: ev.end,
      allDay: ev.allDay,
      backgroundColor: 'transparent',
      borderColor: 'rgba(255,255,255,0.3)',
      textColor: 'rgba(255,255,255,0.7)',
      classNames: ['ss-event-gcal'],
      extendedProps: {
        source: 'gcal' as const,
        description: ev.description,
        htmlLink: ev.htmlLink,
      },
    }))

    return [...externalEvents, ...deadlineEvents]
  }, [deadlines, coursesById, googleEvents])

  return (
    <>
      <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[24px] p-4">
        <FullCalendar
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          headerToolbar={{
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek',
          }}
          height="auto"
          events={events}
          dayMaxEventRows={4}
          eventClick={(info) => {
            const props = info.event.extendedProps ?? {}
            if (props.source === 'gcal') {
              setDetail({
                kind: 'gcal',
                title: info.event.title,
                description: props.description as string | undefined,
                htmlLink: props.htmlLink as string | undefined,
              })
              return
            }
            const category = props.category as DeadlineCategory | null
            const snippet = props.snippet as string | undefined
            const courseName = props.courseName as string | undefined
            const dueLabel = props.dueLabel as string | undefined
            const completed = !!props.completed
            setDetail({
              kind: 'deadline',
              title: info.event.title,
              courseName: courseName ?? 'Course',
              category,
              snippet,
              dueLabel,
              completed,
            })
          }}
        />
      </div>

      <AnimatePresence>
        {detail && (
          <CalendarEventModal detail={detail} onClose={() => setDetail(null)} />
        )}
      </AnimatePresence>
    </>
  )
}

type CalendarDetail =
  | {
      kind: 'deadline'
      title: string
      courseName: string
      category: DeadlineCategory | null
      snippet?: string
      dueLabel?: string
      completed: boolean
    }
  | {
      kind: 'gcal'
      title: string
      description?: string
      htmlLink?: string
    }

function CalendarEventModal({
  detail,
  onClose,
}: {
  detail: CalendarDetail
  onClose: () => void
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        role="dialog"
        aria-modal="true"
        className="max-h-[min(85vh,540px)] w-full max-w-md overflow-y-auto bg-white/5 backdrop-blur-2xl border border-white/10 rounded-[24px] p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-base font-semibold leading-snug text-white">
            {detail.kind === 'deadline'
              ? detail.title.replace(/^[✓]\s*/, '')
              : detail.title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-lg p-1.5 text-white/40 hover:bg-white/10 hover:text-white transition-colors"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        {detail.kind === 'deadline' && (
          <>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-white/10 px-2.5 py-1 text-xs font-medium text-white/70">
                {detail.courseName}
              </span>
              {detail.category && (
                <span
                  className="rounded-full px-2.5 py-1 text-xs font-semibold uppercase tracking-wide"
                  style={{
                    backgroundColor: 'var(--theme-accent)',
                    opacity: 0.15,
                    color: 'var(--theme-accent)',
                  }}
                >
                  {CATEGORY_LABELS[detail.category] ?? detail.category}
                </span>
              )}
              {detail.completed && (
                <span className="rounded-full bg-emerald-500/20 px-2.5 py-1 text-xs font-medium text-emerald-400">
                  Done
                </span>
              )}
            </div>
            {detail.dueLabel && (
              <p className="mt-3 text-sm text-white/50">
                <span className="font-medium text-white/70">Due:</span>{' '}
                {detail.dueLabel}
              </p>
            )}
            {detail.snippet ? (
              <div className="mt-4 rounded-xl bg-white/5 border border-white/10 px-3 py-2.5">
                <div className="text-[10px] font-semibold uppercase tracking-wide text-white/30">
                  Syllabus excerpt
                </div>
                <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-white/60">
                  {detail.snippet}
                </p>
              </div>
            ) : (
              <p className="mt-4 text-xs text-white/30">
                No syllabus snippet stored for this deadline.
              </p>
            )}
          </>
        )}

        {detail.kind === 'gcal' && (
          <>
            <p className="mt-2 text-xs font-medium uppercase tracking-wide text-white/30">
              Google Calendar
            </p>
            {detail.description && (
              <p className="mt-2 whitespace-pre-wrap text-sm text-white/60">
                {detail.description}
              </p>
            )}
            {detail.htmlLink && (
              <a
                href={detail.htmlLink}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium text-white transition-all hover:opacity-90"
                style={{
                  background: 'linear-gradient(to top right, var(--theme-brand-from), var(--theme-brand-to))',
                }}
              >
                <ExternalLink size={14} />
                Open in Google Calendar
              </a>
            )}
          </>
        )}

        <div className="mt-5 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-white/5 border border-white/10 px-3 py-1.5 text-sm font-medium text-white/60 hover:bg-white/10 hover:text-white transition-colors"
          >
            Close
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

function formatDueLabel(d: Date): string {
  return d.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}
