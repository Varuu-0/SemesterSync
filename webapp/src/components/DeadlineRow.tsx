'use client'

import { CATEGORY_LABELS, type Course, type Deadline } from '@/lib/types'
import { motion } from 'motion/react'
import { CheckCircle2, Circle } from 'lucide-react'

type Variant = 'upcoming' | 'missed' | 'completed'

export function DeadlineRow({
  deadline,
  course,
  onToggle,
  variant,
  busy,
}: {
  deadline: Deadline
  course?: Course
  onToggle: (next: boolean) => void
  variant: Variant
  busy?: boolean
}) {
  const isCompleted = !!deadline.completed_at
  const due = new Date(deadline.due_at)

  const containerClass =
    variant === 'missed'
      ? 'border-red-500/20 bg-red-500/5'
      : variant === 'completed'
        ? 'border-white/5 bg-white/[0.02]'
        : 'border-white/10 bg-white/5'

  const dateText = formatRelative(due, variant)
  const dateClass =
    variant === 'missed'
      ? 'text-red-400 font-medium'
      : variant === 'completed'
        ? 'text-white/30'
        : daysUntil(due) <= 1
          ? 'text-amber-400 font-medium'
          : 'text-white/40'

  return (
    <motion.li
      layout
      className={`group flex items-center gap-3 rounded-xl border ${containerClass} px-3 py-2.5 backdrop-blur-sm transition`}
    >
      <CheckBox
        checked={isCompleted}
        onChange={onToggle}
        busy={busy}
        ariaLabel={`Mark ${deadline.title} as ${isCompleted ? 'incomplete' : 'complete'}`}
      />
      <span
        aria-hidden
        className="h-2 w-2 shrink-0 rounded-full"
        style={{ background: course?.color ?? 'rgba(255,255,255,0.3)' }}
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span
            className={`truncate text-sm ${
              isCompleted
                ? 'text-white/30 line-through'
                : 'font-medium text-white'
            }`}
          >
            {deadline.title}
          </span>
          {deadline.category && (
            <span className="shrink-0 rounded-full bg-white/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white/50">
              {CATEGORY_LABELS[deadline.category] ?? deadline.category}
            </span>
          )}
        </div>
        <div className="truncate text-xs text-white/30">
          {course?.name ?? 'Unknown course'}
        </div>
      </div>
      <div className={`shrink-0 text-right text-xs ${dateClass}`}>
        <div>{dateText}</div>
        <div className="text-[10px] text-white/20">
          {due.toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          })}
        </div>
      </div>
    </motion.li>
  )
}

function CheckBox({
  checked,
  onChange,
  busy,
  ariaLabel,
}: {
  checked: boolean
  onChange: (next: boolean) => void
  busy?: boolean
  ariaLabel: string
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={busy}
      onClick={() => onChange(!checked)}
      className="shrink-0 mt-0.5"
    >
      {checked ? (
        <CheckCircle2 size={18} className="text-emerald-400" />
      ) : (
        <Circle size={18} className="text-white/20 hover:text-white/50 transition-colors" />
      )}
    </button>
  )
}

function startOfDay(d: Date): Date {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

function daysUntil(d: Date): number {
  const today = startOfDay(new Date())
  const target = startOfDay(d)
  return Math.round((target.getTime() - today.getTime()) / (24 * 60 * 60 * 1000))
}

function formatRelative(due: Date, variant: Variant): string {
  if (variant === 'completed') return 'Done'
  const diff = daysUntil(due)
  if (variant === 'missed') {
    const overdue = -diff
    if (overdue === 0) return 'Today'
    if (overdue === 1) return '1 day late'
    return `${overdue} days late`
  }
  if (diff < 0) return `${-diff} days late`
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Tomorrow'
  if (diff < 7) return `In ${diff} days`
  const weeks = Math.round(diff / 7)
  return `In ${weeks} weeks`
}
