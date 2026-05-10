'use client'

import { useMemo } from 'react'
import { motion } from 'motion/react'
import { useAppContext } from '@/context/AppContext'
import { useAuth } from '@/hooks/useAuth'
import { analyzeBurnout, getSeverity, getSemesterSummary, type BurnoutAnalysis, type WeekScore } from '@/lib/burnoutDetector'
import { AlertTriangle, TrendingUp, Flame, Skull, SmilePlus, CalendarDays } from 'lucide-react'
import type { Deadline } from '@/lib/types'

const SEVERITY_BORDER: Record<string, string> = {
  normal: 'border-emerald-500',
  busy: 'border-amber-500',
  heavy: 'border-orange-500',
  doom: 'border-red-500',
}

const SEVERITY_BG: Record<string, string> = {
  normal: 'bg-emerald-500',
  busy: 'bg-amber-500',
  heavy: 'bg-orange-500',
  doom: 'bg-red-500',
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function getWeekEnd(weekStart: string): string {
  const d = new Date(weekStart + 'T00:00:00')
  d.setDate(d.getDate() + 6)
  return formatDate(d.toISOString().split('T')[0])
}

function StressMeter({ score, severity }: { score: number; severity: { label: string; emoji: string; color: string } }) {
  const pct = Math.min((score / 20) * 100, 100)

  return (
    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[24px] p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: severity.color + '20' }}>
            {score <= 4 ? <SmilePlus className="w-5 h-5" style={{ color: severity.color }} /> :
             score <= 7 ? <AlertTriangle className="w-5 h-5" style={{ color: severity.color }} /> :
             score <= 10 ? <Flame className="w-5 h-5" style={{ color: severity.color }} /> :
             <Skull className="w-5 h-5" style={{ color: severity.color }} />}
          </div>
          <div>
            <p className="text-xs text-white/50 uppercase tracking-wider font-medium">Overall Stress</p>
            <p className="text-3xl font-bold" style={{ color: severity.color }}>
              {score.toFixed(1)} <span className="text-lg">{severity.emoji}</span>
            </p>
          </div>
        </div>
        <span
          className="text-sm font-semibold px-3 py-1 rounded-full"
          style={{ backgroundColor: severity.color + '20', color: severity.color }}
        >
          {severity.label}
        </span>
      </div>

      <div className="w-full h-3 bg-white/5 rounded-full overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: severity.color }}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 1, ease: 'easeOut' }}
        />
      </div>

      <div className="flex justify-between mt-2 text-[10px] text-white/30 uppercase tracking-wider">
        <span>0 Chill</span>
        <span>5 Busy</span>
        <span>10 Critical</span>
        <span>20 Doom</span>
      </div>
    </div>
  )
}

function PeakWeekCard({ week }: { week: WeekScore }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[24px] p-6"
      style={{ borderLeftWidth: 4, borderLeftColor: week.severity.color }}
    >
      <div className="flex items-center gap-2 mb-2">
        <CalendarDays className="w-4 h-4 text-white/40" />
        <p className="text-xs text-white/40 uppercase tracking-wider font-medium">Peak Stress Week</p>
      </div>
      <p className="text-lg font-bold text-white">
        {formatDate(week.weekStart)} – {getWeekEnd(week.weekStart)}
      </p>
      <div className="flex items-center gap-3 mt-2">
        <span className="text-2xl font-bold" style={{ color: week.severity.color }}>
          {week.score.toFixed(1)}
        </span>
        <span className="text-xl">{week.severity.emoji}</span>
        <span
          className="text-xs font-semibold px-2 py-0.5 rounded-full"
          style={{ backgroundColor: week.severity.color + '20', color: week.severity.color }}
        >
          {week.severity.label}
        </span>
      </div>
      <p className="text-sm text-white/40 mt-2">{week.eventCount} event{week.eventCount !== 1 ? 's' : ''} that week</p>
    </motion.div>
  )
}

function DangerWeekCard({ week, index }: { week: WeekScore; index: number }) {
  const displayedEvents = week.events.slice(0, 5)
  const overflow = week.events.length - 5

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 + index * 0.05 }}
      className={`bg-white/5 backdrop-blur-xl border border-white/10 rounded-[24px] p-6 border-l-4 ${SEVERITY_BORDER[week.severity.level]}`}
    >
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-sm font-semibold text-white">
            {formatDate(week.weekStart)} – {getWeekEnd(week.weekStart)}
          </p>
          <p className="text-xs text-white/40 mt-0.5">{week.eventCount} event{week.eventCount !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xl font-bold" style={{ color: week.severity.color }}>
            {week.score.toFixed(1)}
          </span>
          <span
            className="text-xs font-semibold px-2 py-0.5 rounded-full"
            style={{ backgroundColor: week.severity.color + '20', color: week.severity.color }}
          >
            {week.severity.emoji} {week.severity.label}
          </span>
        </div>
      </div>

      <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden mb-3">
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: week.severity.color }}
          initial={{ width: 0 }}
          animate={{ width: `${Math.min((week.score / 20) * 100, 100)}%` }}
          transition={{ duration: 0.8, ease: 'easeOut', delay: 0.1 + index * 0.05 }}
        />
      </div>

      <ul className="space-y-1">
        {displayedEvents.map((evt, i) => (
          <li key={i} className="text-xs text-white/60 truncate flex items-center gap-1.5">
            <span className="w-1 h-1 rounded-full flex-shrink-0" style={{ backgroundColor: week.severity.color }} />
            {evt.type && (
              <span
                className="px-1 py-0.5 rounded text-[9px] font-medium uppercase"
                style={{ backgroundColor: week.severity.color + '15', color: week.severity.color }}
              >
                {evt.type}
              </span>
            )}
            <span className="truncate">{(evt as { title?: string }).title || (evt as { date?: string }).date}</span>
          </li>
        ))}
      </ul>
      {overflow > 0 && (
        <p className="text-xs text-white/30 mt-2">+{overflow} more</p>
      )}
    </motion.div>
  )
}

export default function WarningsPage() {
  const { deadlines } = useAppContext()
  const { user } = useAuth()

  const analysis: BurnoutAnalysis = useMemo(() => {
    const eventLike = deadlines.map((d) => ({
      date: d.due_at,
      type: d.category ?? 'other',
      title: d.title,
    }))
    return analyzeBurnout(eventLike)
  }, [deadlines])

  const peakSeverity = analysis.peakWeek ? getSeverity(analysis.peakWeek.score) : null
  const summary = useMemo(() => getSemesterSummary(analysis), [analysis])

  if (deadlines.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6 text-center">
        <div className="w-20 h-20 bg-white/5 backdrop-blur-xl border border-white/10 rounded-full flex items-center justify-center mb-6">
          <CalendarDays className="w-10 h-10 text-white/30" />
        </div>
        <h2 className="text-2xl font-extrabold text-white mb-2">No Syllabus Data</h2>
        <p className="text-white/50 max-w-md">
          Upload a syllabus to allow the AI to detect potential Doom Weeks where your deadlines overlap.
        </p>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-3"
      >
        <AlertTriangle className="w-6 h-6" style={{ color: 'var(--theme-accent)' }} />
        <h1 className="text-2xl font-bold text-white">Doom Week Detector</h1>
      </motion.div>

      {peakSeverity && (
        <StressMeter score={analysis.peakWeek!.score} severity={peakSeverity} />
      )}

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[24px] p-6"
      >
        <div className="flex items-center gap-2 mb-2">
          <TrendingUp className="w-4 h-4 text-white/40" />
          <p className="text-xs text-white/40 uppercase tracking-wider font-medium">Semester Summary</p>
        </div>
        <p className="text-white/80 text-sm leading-relaxed">{summary}</p>
      </motion.div>

      {analysis.peakWeek && (
        <PeakWeekCard week={analysis.peakWeek} />
      )}

      <div>
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Flame className="w-5 h-5" style={{ color: 'var(--theme-accent)' }} />
          Danger Weeks
        </h2>

        {analysis.warnings.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[24px] p-8 text-center"
          >
            <p className="text-xl text-white/60">
              Your semester looks manageable! No doom weeks detected. 🎉
            </p>
          </motion.div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {analysis.warnings.map((week, i) => (
              <DangerWeekCard key={week.weekKey} week={week} index={i} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
