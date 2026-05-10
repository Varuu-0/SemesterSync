'use client'

import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin from '@fullcalendar/interaction'
import { useAppContext } from '@/context/AppContext'
import { useAuth } from '@/hooks/useAuth'
import {
  X, Plus, Trash2, Loader2, Sparkles, ArrowRight,
  LayoutGrid, List, Calendar as CalIcon, ChevronLeft, ChevronRight,
} from 'lucide-react'
import { type Deadline, type Course, CATEGORY_LABELS } from '@/lib/types'
import { useRouter } from 'next/navigation'

type ViewMode = 'month' | 'week' | 'timeline'

const glass = 'bg-white/5 backdrop-blur-xl border border-white/10 rounded-[24px]'

const CATEGORY_BADGE_COLORS: Record<string, string> = {
  assignment: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  exam: 'bg-red-500/20 text-red-300 border-red-500/30',
  quiz: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  project: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  lab: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  presentation: 'bg-pink-500/20 text-pink-300 border-pink-500/30',
  reading: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
  deadline: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
  other: 'bg-slate-500/20 text-slate-300 border-slate-500/30',
}

function getCourseHex(course: Course | undefined): string {
  if (!course) return '#3b82f6'
  return course.color
}

export default function DashboardCalendarPage() {
  const { deadlines, courses, addManualDeadline, deleteDeadline } = useAppContext()
  const { user } = useAuth()
  const router = useRouter()

  const [viewMode, setViewMode] = useState<ViewMode>('month')
  const [hiddenCourseIds, setHiddenCourseIds] = useState<Set<string>>(new Set())
  const [selectedDeadline, setSelectedDeadline] = useState<Deadline | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const [addTitle, setAddTitle] = useState('')
  const [addDate, setAddDate] = useState('')
  const [addType, setAddType] = useState('assignment')
  const [addCourseId, setAddCourseId] = useState('')

  const filteredDeadlines = useMemo(
    () => deadlines.filter(d => !hiddenCourseIds.has(d.course_id)),
    [deadlines, hiddenCourseIds],
  )

  const calendarEvents = useMemo(
    () =>
      filteredDeadlines.map(d => {
        const course = courses.find(c => c.id === d.course_id)
        const hexColor = getCourseHex(course)
        return {
          id: d.id,
          title: `${course ? course.name + ': ' : ''}${d.title}`,
          date: d.due_at,
          backgroundColor: hexColor,
          borderColor: hexColor,
          extendedProps: { originalDeadline: d, course },
        }
      }),
    [filteredDeadlines, courses],
  )

  const timelineDeadlines = useMemo(
    () =>
      [...filteredDeadlines].sort(
        (a, b) => new Date(a.due_at).getTime() - new Date(b.due_at).getTime(),
      ),
    [filteredDeadlines],
  )

  const timelineMonths = useMemo(() => {
    const map = new Map<string, Deadline[]>()
    for (const d of timelineDeadlines) {
      const dt = new Date(d.due_at)
      const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(d)
    }
    return Array.from(map.entries()).map(([key, dlts]) => {
      const [y, m] = key.split('-').map(Number)
      return { key, label: new Date(y, m - 1).toLocaleDateString(undefined, { month: 'long', year: 'numeric' }), deadlines: dlts }
    })
  }, [timelineDeadlines])

  const toggleCourse = (courseId: string) => {
    setHiddenCourseIds(prev => {
      const next = new Set(prev)
      if (next.has(courseId)) next.delete(courseId)
      else next.add(courseId)
      return next
    })
  }

  const handleGenerateBreakdown = async () => {
    if (!selectedDeadline) return
    setIsGenerating(true)
    setTimeout(() => {
      setIsGenerating(false)
      setSelectedDeadline(null)
      router.push('/dashboard/tasks')
    }, 1500)
  }

  const handleDelete = async () => {
    if (!selectedDeadline || !user) return
    setIsDeleting(true)
    await deleteDeadline(selectedDeadline.id, user.id)
    setIsDeleting(false)
    setSelectedDeadline(null)
  }

  const handleAddSubmit = async () => {
    if (!addTitle.trim() || !addDate || !addCourseId || !user) return
    setIsSubmitting(true)
    await addManualDeadline(addCourseId, addTitle.trim(), addDate, addType, user.id)
    setIsSubmitting(false)
    setShowAddDialog(false)
    setAddTitle('')
    setAddDate('')
    setAddType('assignment')
    setAddCourseId('')
  }

  const fullCalendarRef = useMemo(() => {
    let api: import('@fullcalendar/core').CalendarApi | null = null
    return {
      getApi: () => api,
      setApi: (a: import('@fullcalendar/core').CalendarApi) => { api = a },
    }
  }, [])

  const viewButtons: { mode: ViewMode; label: string; icon: React.ReactNode }[] = [
    { mode: 'month', label: 'Month', icon: <CalIcon className="w-4 h-4" /> },
    { mode: 'week', label: 'Week', icon: <LayoutGrid className="w-4 h-4" /> },
    { mode: 'timeline', label: 'Timeline', icon: <List className="w-4 h-4" /> },
  ]

  return (
    <div className="space-y-4">

      {/* ── Toolbar ─────────────────────────────────────────── */}
      <div className={`${glass} px-4 py-3 flex flex-col sm:flex-row items-start sm:items-center gap-3 shrink-0`}>
        {/* View toggles */}
        <div className="flex items-center gap-1 bg-white/5 rounded-xl p-1">
          {viewButtons.map(b => (
            <button
              key={b.mode}
              onClick={() => setViewMode(b.mode)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                viewMode === b.mode
                  ? 'bg-white/15 text-white shadow-sm'
                  : 'text-white/50 hover:text-white/80'
              }`}
            >
              {b.icon}
              <span className="hidden sm:inline">{b.label}</span>
            </button>
          ))}
        </div>

        {/* Nav arrows for calendar views */}
        {viewMode !== 'timeline' && (
          <div className="flex items-center gap-1">
            <button
              onClick={() => fullCalendarRef.getApi()?.prev()}
              className="p-1.5 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => fullCalendarRef.getApi()?.next()}
              className="p-1.5 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

        <div className="flex-1" />

        {/* Add Event */}
        <button
          onClick={() => setShowAddDialog(true)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-sm font-medium transition-all border border-white/10 hover:border-white/20"
        >
          <Plus className="w-4 h-4" />
          Add Event
        </button>
      </div>

      {/* ── Course filter pills ─────────────────────────────── */}
      {courses.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto shrink-0 pb-1 scrollbar-hide">
          {courses.map(course => {
            const isHidden = hiddenCourseIds.has(course.id)
            const hex = getCourseHex(course)
            return (
              <button
                key={course.id}
                onClick={() => toggleCourse(course.id)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all shrink-0 border ${
                  isHidden
                    ? 'bg-white/5 border-white/10 text-white/30'
                    : 'border-transparent'
                }`}
                style={!isHidden ? { backgroundColor: hex + '30', color: hex, borderColor: hex + '50' } : undefined}
              >
                <span
                  className={`w-2 h-2 rounded-full transition-all ${isHidden ? 'bg-white/20' : ''}`}
                  style={!isHidden ? { backgroundColor: hex } : undefined}
                />
                <span>{course.name}</span>
              </button>
            )
          })}
        </div>
      )}

      {/* ── Main content ────────────────────────────────────── */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {deadlines.length === 0 ? (
          <div className={`${glass} h-full flex flex-col items-center justify-center gap-4 p-8`}>
            <CalIcon className="w-12 h-12 text-white/20" />
            <p className="text-white/50 text-lg font-medium">No events yet</p>
            <p className="text-white/30 text-sm text-center max-w-xs">
              Upload your course syllabus to populate your calendar, or add events manually.
            </p>
            <button
              onClick={() => setShowAddDialog(true)}
              className="mt-2 flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-sm font-medium transition-all border border-white/10"
            >
              <Plus className="w-4 h-4" />
              Add Event
            </button>
          </div>
        ) : viewMode === 'timeline' ? (
          /* ── Timeline View ──────────────────────────────────── */
          <div className="h-full overflow-y-auto pr-2">
            {timelineMonths.length === 0 ? (
              <p className="text-white/40 text-center py-12">No events to display.</p>
            ) : (
              timelineMonths.map(month => (
                <div key={month.key} className="mb-8">
                  <h3 className="text-sm font-semibold text-white/60 uppercase tracking-wider mb-4 pl-6">
                    {month.label}
                  </h3>
                  <div className="relative pl-6">
                    <div className="absolute left-[7px] top-2 bottom-2 w-px bg-white/10" />
                    <div className="flex flex-col gap-3">
                      {month.deadlines.map(d => {
                        const course = courses.find(c => c.id === d.course_id)
                        const hex = getCourseHex(course)
                        const cat = d.category ?? 'other'
                        const badge = CATEGORY_BADGE_COLORS[cat] || CATEGORY_BADGE_COLORS.other
                        return (
                          <motion.button
                            key={d.id}
                            onClick={() => setSelectedDeadline(d)}
                            whileHover={{ x: 4 }}
                            className={`relative flex items-start gap-4 p-4 ${glass} text-left transition-all hover:bg-white/10 ${
                              d.completed_at ? 'opacity-50' : ''
                            }`}
                          >
                            <span
                              className="absolute left-[-21px] top-6 w-3 h-3 rounded-full border-2 border-[#0c0e14]"
                              style={{ backgroundColor: hex }}
                            />
                            <div className="flex-1 min-w-0">
                              <p className={`font-medium text-sm text-white truncate ${d.completed_at ? 'line-through' : ''}`}>
                                {d.title}
                              </p>
                              <p className="text-xs text-white/40 mt-1">
                                {course?.name || 'No Course'} &middot;{' '}
                                {new Date(d.due_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                              </p>
                            </div>
                            <span className={`shrink-0 px-2 py-0.5 text-[11px] font-semibold rounded-md border capitalize ${badge}`}>
                              {cat}
                            </span>
                          </motion.button>
                        )
                      })}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
          /* ── FullCalendar View ──────────────────────────────── */
          <div className={`${glass} h-full p-2 md:p-4 calendar-container overflow-hidden`}>
            <FullCalendar
              ref={el => { if (el) fullCalendarRef.setApi(el.getApi()) }}
              plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
              initialView={viewMode === 'week' ? 'timeGridWeek' : 'dayGridMonth'}
              headerToolbar={false}
              height="100%"
              events={calendarEvents}
              eventClick={info => {
                setSelectedDeadline(info.event.extendedProps.originalDeadline)
              }}
              themeSystem="standard"
            />
          </div>
        )}
      </div>

      {/* ── Detail Slide-Over ───────────────────────────────── */}
      <AnimatePresence>
        {selectedDeadline && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-40 bg-black/40 backdrop-blur-sm"
              onClick={() => setSelectedDeadline(null)}
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="absolute right-0 top-0 bottom-0 z-50 w-full max-w-sm flex flex-col bg-white/5 backdrop-blur-2xl border-l border-white/10"
            >
              <div className="p-6 flex-1 overflow-y-auto">
                <div className="flex items-start justify-between mb-6">
                  <div className="min-w-0">
                    <h3 className="text-xl font-bold text-white truncate">{selectedDeadline.title}</h3>
                    <p className="text-sm font-medium mt-1" style={{ color: getCourseHex(courses.find(c => c.id === selectedDeadline.course_id)) }}>
                      {courses.find(c => c.id === selectedDeadline.course_id)?.name || 'Unknown Course'}
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectedDeadline(null)}
                    className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors shrink-0 ml-3"
                  >
                    <X className="w-4 h-4 text-white/60" />
                  </button>
                </div>

                <div className={`${glass} p-4`}>
                  <div className="mb-4">
                    <p className="text-[10px] text-white/40 uppercase font-bold tracking-widest mb-1">Date</p>
                    <p className="font-medium text-white text-sm">
                      {new Date(selectedDeadline.due_at).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-white/40 uppercase font-bold tracking-widest mb-1.5">Type</p>
                    <span
                      className={`inline-block px-2.5 py-1 text-xs font-semibold rounded-md border capitalize ${
                        CATEGORY_BADGE_COLORS[selectedDeadline.category ?? 'other'] || CATEGORY_BADGE_COLORS.other
                      }`}
                    >
                      {selectedDeadline.category ?? 'other'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-6 border-t border-white/10 flex flex-col gap-3">
                <button
                  onClick={handleGenerateBreakdown}
                  disabled={isGenerating}
                  className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-medium shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2 group disabled:opacity-70 disabled:cursor-wait"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Analyzing syllabus logic...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5 text-blue-200 group-hover:text-white transition-colors" />
                      <span>Generate Study Plan</span>
                      <ArrowRight className="w-4 h-4 opacity-70 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                    </>
                  )}
                </button>
                <button
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="w-full py-2.5 px-4 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl font-medium transition-all flex items-center justify-center gap-2 border border-red-500/20 disabled:opacity-70"
                >
                  {isDeleting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                  <span>Delete Event</span>
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── Add Event Dialog ─────────────────────────────────── */}
      <AnimatePresence>
        {showAddDialog && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-40 bg-black/40 backdrop-blur-sm"
              onClick={() => setShowAddDialog(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="absolute inset-0 z-50 flex items-center justify-center p-4"
            >
              <div className={`${glass} w-full max-w-md p-6`}>
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-bold text-white">Add Event</h3>
                  <button
                    onClick={() => setShowAddDialog(false)}
                    className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors"
                  >
                    <X className="w-4 h-4 text-white/60" />
                  </button>
                </div>

                <div className="flex flex-col gap-4">
                  <div>
                    <label className="block text-xs text-white/40 uppercase font-bold tracking-widest mb-1.5">Title</label>
                    <input
                      value={addTitle}
                      onChange={e => setAddTitle(e.target.value)}
                      placeholder="Midterm Exam"
                      className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/25 focus:outline-none focus:border-white/25 transition-colors text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-white/40 uppercase font-bold tracking-widest mb-1.5">Date</label>
                    <input
                      type="date"
                      value={addDate}
                      onChange={e => setAddDate(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-white/25 transition-colors text-sm [color-scheme:dark]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-white/40 uppercase font-bold tracking-widest mb-1.5">Type</label>
                    <select
                      value={addType}
                      onChange={e => setAddType(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-white/25 transition-colors text-sm [color-scheme:dark]"
                    >
                      <option value="assignment">Assignment</option>
                      <option value="exam">Exam</option>
                      <option value="quiz">Quiz</option>
                      <option value="project">Project</option>
                      <option value="lab">Lab</option>
                      <option value="presentation">Presentation</option>
                      <option value="reading">Reading</option>
                      <option value="other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs text-white/40 uppercase font-bold tracking-widest mb-1.5">Course</label>
                    <select
                      value={addCourseId}
                      onChange={e => setAddCourseId(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-white/25 transition-colors text-sm [color-scheme:dark]"
                    >
                      <option value="">Select a course...</option>
                      {courses.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <button
                  onClick={handleAddSubmit}
                  disabled={!addTitle.trim() || !addDate || !addCourseId || isSubmitting}
                  className="mt-6 w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-medium shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Plus className="w-5 h-5" />
                  )}
                  <span>{isSubmitting ? 'Adding...' : 'Add Event'}</span>
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── FullCalendar Dark Theme Overrides ────────────────── */}
      <style jsx global>{`
        .calendar-container .fc {
          background: transparent;
          color: white;
        }
        .calendar-container .fc-daygrid-day {
          background: rgba(255,255,255,0.02);
          border-color: rgba(255,255,255,0.1);
        }
        .calendar-container .fc-daygrid-day:hover {
          background: rgba(255,255,255,0.05);
        }
        .calendar-container .fc-col-header {
          border-color: rgba(255,255,255,0.1);
        }
        .calendar-container .fc-toolbar-title {
          color: white;
        }
        .calendar-container .fc-button {
          background: rgba(255,255,255,0.1) !important;
          border-color: rgba(255,255,255,0.2) !important;
          color: white !important;
        }
        .calendar-container .fc-button:hover {
          background: rgba(255,255,255,0.15) !important;
        }
        .calendar-container .fc-button-active {
          background: rgba(255,255,255,0.2) !important;
          border-color: rgba(255,255,255,0.3) !important;
        }
        .calendar-container .fc-daygrid-day-number {
          color: rgba(255,255,255,0.5);
          font-weight: 500;
        }
        .calendar-container .fc-timegrid-slot {
          border-color: rgba(255,255,255,0.06);
        }
        .calendar-container .fc-timegrid-slot-label {
          color: rgba(255,255,255,0.4);
          font-size: 0.75rem;
        }
        .calendar-container .fc-scrollgrid {
          border-color: rgba(255,255,255,0.1);
        }
        .calendar-container .fc-scrollgrid td,
        .calendar-container .fc-scrollgrid th {
          border-color: rgba(255,255,255,0.08);
        }
        .calendar-container .fc-col-header-cell-cushion {
          color: rgba(255,255,255,0.5);
          font-weight: 600;
          text-transform: uppercase;
          font-size: 0.7rem;
          letter-spacing: 0.05em;
        }
        .calendar-container .fc-event {
          border: none !important;
          border-left: 3px solid rgba(255,255,255,0.3) !important;
          border-radius: 6px;
          padding: 2px 6px;
          font-size: 0.7rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .calendar-container .fc-event:hover {
          transform: translateY(-1px) scale(1.02);
          box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        }
        .calendar-container .fc-day-today {
          background: rgba(59,130,246,0.08) !important;
        }
        .calendar-container .fc-timegrid-now-indicator-line {
          border-color: rgba(59,130,246,0.5);
        }
        .calendar-container .fc-timegrid-now-indicator-arrow {
          border-color: rgba(59,130,246,0.5);
        }
      `}</style>
    </div>
  )
}
