'use client'

import { useState, useEffect, useMemo } from 'react'
import { motion } from 'motion/react'
import { useAppContext } from '@/context/AppContext'
import { useAuth } from '@/hooks/useAuth'
import { CheckCircle2, Circle, Clock, BrainCircuit, ChevronRight, ChevronDown, ChevronUp, Loader2, CalendarClock, Flame, Info, CheckSquare } from 'lucide-react'
import { type Deadline, type Course } from '@/lib/types'

type TaskNode = {
  taskName: string
  estimatedHours: number
  subtasks?: TaskNode[]
}

function getDaysUntil(dateStr: string): number {
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const due = new Date(dateStr)
  due.setHours(0, 0, 0, 0)
  return Math.ceil((due.getTime() - now.getTime()) / 86400000)
}

function getUrgencyClass(days: number, completed: boolean): string {
  if (completed) return 'bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500/30'
  if (days < 0) return 'bg-red-500/20 text-red-400 ring-1 ring-red-500/30'
  if (days === 0) return 'bg-amber-500/20 text-amber-400 ring-1 ring-amber-500/30'
  if (days <= 2) return 'bg-amber-500/20 text-amber-400 ring-1 ring-amber-500/30'
  if (days <= 7) return 'bg-blue-500/20 text-blue-400 ring-1 ring-blue-500/30'
  return 'bg-white/10 text-white/40 ring-1 ring-white/10'
}

function getUrgencyLabel(days: number, completed: boolean): string {
  if (completed) return 'Done'
  if (days < 0) return `${Math.abs(days)} day${Math.abs(days) === 1 ? '' : 's'} overdue`
  if (days === 0) return 'Due today!'
  if (days <= 7) return `${days} day${days === 1 ? '' : 's'} left`
  return `${days} days left`
}

function getSuggestedAction(task: Deadline, days: number, completed: boolean): string {
  if (completed) return 'Completed — nice work!'
  if (days < 0) return `Overdue! Submit "${task.title}" immediately`
  if (days === 0) return `Focus on completing ${task.title} today`
  if (days <= 2) return `Start working on ${task.title} now`
  if (days <= 7) return `Begin preparation for ${task.title}`
  return `Plan ahead for ${task.title}`
}

function TaskTreeNode({ node, depth = 0 }: { node: TaskNode; depth?: number }) {
  const [expanded, setExpanded] = useState(true)
  const hasChildren = node.subtasks && node.subtasks.length > 0

  return (
    <div className="mt-3 relative z-10">
      <div className={`flex items-start gap-3 relative ${depth > 0 ? 'ml-6 pl-4' : ''}`}>
        {depth > 0 && (
          <div className="absolute left-0 top-0 bottom-[-16px] w-[1px] bg-white/10 -translate-x-[22px]" />
        )}
        {depth > 0 && (
          <div className="absolute left-0 top-3 w-4 h-[1px] bg-white/10 -translate-x-[22px]" />
        )}
        {hasChildren ? (
          <button
            onClick={() => setExpanded(!expanded)}
            className="mt-0.5 w-5 h-5 flex items-center justify-center rounded-sm bg-white/5 border border-white/10 text-white/40 hover:text-white transition-colors z-10"
          >
            {expanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
          </button>
        ) : (
          <div className="w-5 h-5 mt-0.5 flex-shrink-0 flex items-center justify-center z-10">
            <div className="w-1.5 h-1.5 bg-white rounded-full" />
          </div>
        )}
        <div className="flex-1 bg-white/5 backdrop-blur-xl border border-white/10 rounded-[16px] px-4 py-2.5">
          <h5 className="text-sm font-semibold text-white flex items-center justify-between">
            {node.taskName}
            <span className="text-white/40 font-medium ml-2 px-2 py-0.5 bg-white/5 rounded-sm text-xs">
              {node.estimatedHours} hrs
            </span>
          </h5>
        </div>
      </div>
      {expanded && hasChildren && (
        <div className="ml-2 relative">
          {node.subtasks!.map((child, idx) => (
            <TaskTreeNode key={idx} node={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  )
}

type DeadlineGroup = {
  label: string
  icon: React.ElementType
  deadlines: Deadline[]
  defaultOpen: boolean
}

export default function TasksPage() {
  const { courses, deadlines, dataLoading, toggleDeadlineCompletion, loadFromSupabase } = useAppContext()
  const { user } = useAuth()
  const [selectedDeadline, setSelectedDeadline] = useState<Deadline | null>(null)
  const [breakdown, setBreakdown] = useState<TaskNode | null>(null)
  const [breakdownLoading, setBreakdownLoading] = useState(false)
  const [showCompleted, setShowCompleted] = useState(false)

  useEffect(() => {
    if (user?.id) loadFromSupabase(user.id)
  }, [user?.id, loadFromSupabase])

  const courseMap = useMemo(() => {
    const m = new Map<string, Course>()
    courses.forEach(c => m.set(c.id, c))
    return m
  }, [courses])

  const groupedDeadlines = useMemo<DeadlineGroup[]>(() => {
    const thisWeek: Deadline[] = []
    const nextWeek: Deadline[] = []
    const upcoming: Deadline[] = []
    const completed: Deadline[] = []

    const sorted = [...deadlines].sort((a, b) => new Date(a.due_at).getTime() - new Date(b.due_at).getTime())

    for (const d of sorted) {
      const days = getDaysUntil(d.due_at)
      if (d.completed_at) {
        completed.push(d)
      } else if (days <= 7) {
        thisWeek.push(d)
      } else if (days <= 14) {
        nextWeek.push(d)
      } else {
        upcoming.push(d)
      }
    }

    return [
      { label: 'This Week', icon: Flame, deadlines: thisWeek, defaultOpen: true },
      { label: 'Next Week', icon: CalendarClock, deadlines: nextWeek, defaultOpen: true },
      { label: 'Upcoming', icon: Clock, deadlines: upcoming, defaultOpen: true },
      { label: 'Completed', icon: CheckSquare, deadlines: completed, defaultOpen: false },
    ]
  }, [deadlines])

  useEffect(() => {
    if (!selectedDeadline) {
      setBreakdown(null)
      return
    }
    let cancelled = false
    const fetchBreakdown = async () => {
      setBreakdownLoading(true)
      setBreakdown(null)
      try {
        const res = await fetch('/api/tasks/breakdown', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: selectedDeadline.title,
            description: selectedDeadline.source_snippet,
          }),
        })
        const json = await res.json()
        if (!cancelled && json.data) {
          setBreakdown(json.data)
        }
      } catch (err) {
        console.error('Failed to fetch breakdown', err)
      } finally {
        if (!cancelled) setBreakdownLoading(false)
      }
    }
    fetchBreakdown()
    return () => { cancelled = true }
  }, [selectedDeadline])

  if (dataLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 text-white/30 animate-spin" />
          <p className="text-sm text-white/40 font-medium">Loading tasks...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <h1 className="text-2xl md:text-3xl font-semibold text-white tracking-tight">Task Board</h1>
        <p className="text-sm text-white/40 mt-1">Smart planner + AI-powered task breakdown</p>
      </motion.div>

      <div className="flex flex-col lg:flex-row gap-6">
        <div className="w-full lg:w-1/2 flex flex-col gap-4">
          {groupedDeadlines.map((group, gi) => {
            if (group.label === 'Completed' && !showCompleted) return null
            return (
              <DeadlineSection
                key={group.label}
                group={group}
                courseMap={courseMap}
                selectedId={selectedDeadline?.id ?? null}
                onSelect={setSelectedDeadline}
                onToggle={(d) => toggleDeadlineCompletion(d.id, !d.completed_at, user?.id || '')}
                userId={user?.id || ''}
                delay={gi * 0.1}
              />
            )
          })}
          {deadlines.length > 0 && (
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              onClick={() => setShowCompleted(!showCompleted)}
              className="flex items-center gap-2 text-xs font-medium text-white/40 hover:text-white/70 transition-colors self-start"
            >
              {showCompleted ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              {showCompleted ? 'Hide Completed' : `Show Completed (${groupedDeadlines[3]?.deadlines.length ?? 0})`}
            </motion.button>
          )}
          {deadlines.length === 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[24px] p-8 flex flex-col items-center justify-center text-white/30"
            >
              <Info size={32} className="mb-3" />
              <p className="text-sm font-medium">No tasks found. Upload a syllabus to get started.</p>
            </motion.div>
          )}
        </div>

        <div className="w-full lg:flex-1 flex flex-col">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[24px] p-5 flex flex-col flex-1 relative overflow-hidden"
          >
            <div className="flex items-center gap-3 mb-5 relative z-10">
              <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
                <BrainCircuit className="w-5 h-5 text-white" style={{ color: 'var(--theme-accent)' }} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white tracking-tight">AI Breakdown</h3>
                <p className="text-[11px] text-white/30">Recursive task decomposition</p>
              </div>
            </div>

            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[16px] p-5 flex-1 relative z-10 overflow-y-auto">
              {!selectedDeadline ? (
                <div className="flex flex-col items-center justify-center h-full text-white/30 min-h-[200px]">
                  <BrainCircuit className="w-12 h-12 mb-4" />
                  <p className="text-sm font-medium">Select a task to get an AI-powered breakdown</p>
                </div>
              ) : breakdownLoading ? (
                <div className="flex flex-col items-center justify-center py-16 text-white/40">
                  <div className="relative">
                    <Loader2 className="w-10 h-10 animate-spin" />
                  </div>
                  <p className="text-sm font-bold mt-6 tracking-wide text-white/30">GENERATING BREAKDOWN...</p>
                </div>
              ) : breakdown ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="animate-in fade-in duration-500"
                >
                  <h4 className="font-bold text-lg text-white mb-2">
                    Breaking down:{' '}
                    <span style={{ color: 'var(--theme-accent)' }}>{selectedDeadline.title}</span>
                  </h4>
                  <p className="text-sm text-white/40 mb-6 font-medium">
                    AI has generated the following recursive execution nodes.
                  </p>
                  <div className="mt-4">
                    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[16px] p-5">
                      <h5 className="font-bold text-white/40 mb-4 pb-3 border-b border-white/10 uppercase tracking-widest text-xs">
                        Execution Tree
                      </h5>
                      <div className="relative pl-2">
                        <div className="absolute left-4 top-0 bottom-0 w-[1px] bg-white/10" />
                        <TaskTreeNode node={breakdown} />
                      </div>
                    </div>
                  </div>
                </motion.div>
              ) : (
                <div className="flex flex-col items-center justify-center py-16">
                  <p className="text-sm text-red-400 font-medium bg-red-500/10 p-4 rounded-xl border border-red-500/20">
                    Failed to generate breakdown. Try selecting the task again.
                  </p>
                </div>
              )}
            </div>
            <div className="absolute -bottom-12 -right-12 w-40 h-40 rounded-full bg-[var(--theme-accent)] opacity-5 blur-3xl pointer-events-none" />
          </motion.div>
        </div>
      </div>
    </div>
  )
}

function DeadlineSection({
  group,
  courseMap,
  selectedId,
  onSelect,
  onToggle,
  userId,
  delay,
}: {
  group: DeadlineGroup
  courseMap: Map<string, Course>
  selectedId: string | null
  onSelect: (d: Deadline) => void
  onToggle: (d: Deadline) => void
  userId: string
  delay: number
}) {
  const [open, setOpen] = useState(group.defaultOpen)
  const Icon = group.icon

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
      className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[24px] p-5"
    >
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center justify-between w-full mb-3"
      >
        <div className="flex items-center gap-2">
          <Icon size={16} style={{ color: 'var(--theme-accent)' }} />
          <span className="text-xs font-bold uppercase tracking-widest text-white/40">{group.label}</span>
          <span className="text-xs text-white/20 font-mono">({group.deadlines.length})</span>
        </div>
        {open ? <ChevronUp size={14} className="text-white/30" /> : <ChevronDown size={14} className="text-white/30" />}
      </button>
      {open && (
        <div className="space-y-3">
          {group.deadlines.map((d) => {
            const course = courseMap.get(d.course_id)
            const courseHex = course?.color || '#64748b'
            const days = getDaysUntil(d.due_at)
            const completed = !!d.completed_at
            const isSelected = d.id === selectedId

            return (
              <motion.div
                key={d.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                onClick={() => onSelect(d)}
                className={`bg-white/5 backdrop-blur-xl border rounded-[16px] p-4 cursor-pointer transition-all duration-200 ${
                  isSelected
                    ? 'border-white/30 shadow-lg shadow-white/5'
                    : 'border-white/10 hover:border-white/20'
                } ${completed ? 'opacity-50' : ''}`}
              >
                <div className="flex items-start gap-3">
                  <button
                    onClick={(e) => { e.stopPropagation(); onToggle(d) }}
                    className="mt-0.5 shrink-0"
                  >
                    {completed
                      ? <CheckCircle2 size={18} className="text-emerald-400" />
                      : <Circle size={18} className="text-white/30 hover:text-white/60 transition-colors" />
                    }
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: courseHex }}
                      />
                      <h4 className={`text-sm font-semibold truncate ${completed ? 'line-through text-white/30' : 'text-white'}`}>
                        {d.title}
                      </h4>
                    </div>
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      <span className="text-[11px] text-white/30">
                        {course?.name}
                      </span>
                      <span
                        className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${getUrgencyClass(days, completed)}`}
                      >
                        {getUrgencyLabel(days, completed)}
                      </span>
                      {d.category && (
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-white/5 text-white/40 border border-white/10">
                          {d.category}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-white/25 mt-2 italic">
                      {getSuggestedAction(d, days, completed)}
                    </p>
                  </div>
                </div>
              </motion.div>
            )
          })}
          {group.deadlines.length === 0 && (
            <p className="text-xs text-white/20 italic py-2">No tasks in this category.</p>
          )}
        </div>
      )}
    </motion.div>
  )
}
