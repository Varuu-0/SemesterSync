'use client'

import React, { useState, useMemo } from 'react'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin from '@fullcalendar/interaction'
import { useAppContext, AppEvent, Course } from '@/context/AppContext'
import { X, Sparkles, Loader2, ArrowRight } from 'lucide-react'
import { useRouter } from 'next/navigation'

const tailwindToHex: Record<string, string> = {
  'bg-blue-500': '#3b82f6',
  'bg-emerald-500': '#10b981',
  'bg-red-500': '#ef4444',
  'bg-purple-500': '#a855f7',
  'bg-orange-500': '#f97316',
  'bg-pink-500': '#ec4899',
  'bg-indigo-500': '#6366f1',
  'bg-cyan-500': '#06b6d4',
  'bg-slate-500': '#64748b'
}

export default function DashboardCalendarPage() {
  const { events, courses } = useAppContext()
  const router = useRouter()
  
  // Filter State
  const [hiddenCourseIds, setHiddenCourseIds] = useState<Set<string>>(new Set())

  // Modal State
  const [selectedEvent, setSelectedEvent] = useState<AppEvent | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)

  const toggleCourse = (courseId: string) => {
    setHiddenCourseIds(prev => {
      const next = new Set(prev)
      if (next.has(courseId)) next.delete(courseId)
      else next.add(courseId)
      return next
    })
  }

  // Map events to FullCalendar format with exact colors
  const calendarEvents = useMemo(() => {
    return events
      .filter(e => !hiddenCourseIds.has(e.courseId))
      .map(e => {
        const course = courses.find(c => c.id === e.courseId)
        const hexColor = course ? (tailwindToHex[course.color] || '#3b82f6') : '#3b82f6'
        
        return {
          id: e.id,
          title: `${course ? course.name + ': ' : ''}${e.title}`,
          date: e.date,
          backgroundColor: hexColor,
          borderColor: hexColor,
          extendedProps: { originalEvent: e, course }
        }
      })
  }, [events, courses, hiddenCourseIds])

  const handleGenerateBreakdown = async () => {
    if (!selectedEvent) return
    setIsGenerating(true)
    
    // In a real app, this would call /api/tasks/breakdown and save the result to AppContext
    // Since we just want to deep-link to the tasks board where the breakdown is visible,
    // we will mock a tiny delay and redirect.
    setTimeout(() => {
      setIsGenerating(false)
      setSelectedEvent(null)
      router.push('/dashboard/tasks')
    }, 1500)
  }

  return (
    <div className="h-full bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-4 md:p-6 overflow-hidden flex flex-col relative">
      
      {/* Course Pills Filter Row */}
      {courses.length > 0 && (
        <div className="flex items-center space-x-2 pb-4 overflow-x-auto scrollbar-hide shrink-0">
          <span className="text-sm font-medium text-slate-500 mr-2 shrink-0">Filters:</span>
          {courses.map(course => {
            const isHidden = hiddenCourseIds.has(course.id)
            return (
              <button
                key={course.id}
                onClick={() => toggleCourse(course.id)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all shrink-0 border flex items-center space-x-2 ${
                  isHidden 
                    ? 'bg-transparent border-slate-200 text-slate-400 dark:border-slate-700 dark:text-slate-500'
                    : `${course.color} text-white shadow-sm border-transparent`
                }`}
              >
                <div className={`w-2 h-2 rounded-full ${isHidden ? 'bg-slate-300 dark:bg-slate-700' : 'bg-white'}`} />
                <span>{course.name}</span>
              </button>
            )
          })}
        </div>
      )}

      {/* Calendar */}
      <div className="flex-1 calendar-container bg-white dark:bg-slate-900 rounded-lg p-2 md:p-4">
        {events.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-500">
            <p className="mb-4">No events yet.</p>
            <p className="text-sm text-center max-w-xs">
              Upload your course syllabus using the sidebar to automatically populate your calendar.
            </p>
          </div>
        ) : (
          <FullCalendar
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
            initialView="dayGridMonth"
            headerToolbar={{
              left: 'prev,next today',
              center: 'title',
              right: 'dayGridMonth,timeGridWeek'
            }}
            height="100%"
            events={calendarEvents}
            eventClick={(info) => {
              setSelectedEvent(info.event.extendedProps.originalEvent)
            }}
            themeSystem="standard"
          />
        )}
      </div>

      {/* Event Details Slide-Over Modal */}
      {selectedEvent && (
        <div className="absolute inset-0 z-50 flex justify-end">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-slate-900/20 backdrop-blur-sm transition-opacity"
            onClick={() => setSelectedEvent(null)}
          />
          
          {/* Slide Panel */}
          <div className="relative w-full max-w-sm h-full bg-white dark:bg-slate-800 shadow-2xl border-l border-slate-200 dark:border-slate-700 flex flex-col animate-in slide-in-from-right duration-200">
            <div className="p-6 flex-1 overflow-y-auto">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-1">
                    {selectedEvent.title}
                  </h3>
                  <p className="text-sm font-medium text-blue-600 dark:text-blue-400">
                    {courses.find(c => c.id === selectedEvent.courseId)?.title || 'Unknown Course'}
                  </p>
                </div>
                <button 
                  onClick={() => setSelectedEvent(null)}
                  className="p-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 rounded-full transition-colors"
                >
                  <X className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                </button>
              </div>

              <div className="space-y-6">
                <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-xl border border-slate-100 dark:border-slate-700">
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <p className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-1">Date</p>
                      <p className="font-medium text-slate-900 dark:text-slate-100">
                        {new Date(selectedEvent.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-1">Impact</p>
                      <p className="font-medium text-slate-900 dark:text-slate-100">
                        {selectedEvent.weight}% of Grade
                      </p>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-1">Type</p>
                    <span className="inline-block px-2.5 py-1 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-md capitalize">
                      {selectedEvent.type}
                    </span>
                  </div>
                </div>

                <div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-2">Description</p>
                  <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                    {selectedEvent.description || 'No description provided in syllabus.'}
                  </p>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
              <button
                onClick={handleGenerateBreakdown}
                disabled={isGenerating}
                className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-medium shadow-md hover:shadow-lg transition-all flex items-center justify-center space-x-2 group disabled:opacity-70 disabled:cursor-wait"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Analyzing syllabus logic...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5 text-blue-200 group-hover:text-white transition-colors" />
                    <span>Generate AI Study Plan</span>
                    <ArrowRight className="w-4 h-4 ml-2 opacity-70 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                  </>
                )}
              </button>
              <p className="text-xs text-center text-slate-500 mt-3">
                Breaks down this {selectedEvent.type} into actionable micro-tasks.
              </p>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        /* Minimalist Calendar Styling */
        .calendar-container .fc-theme-standard td,
        .calendar-container .fc-theme-standard th,
        .calendar-container .fc-theme-standard .fc-scrollgrid { border-color: #e2e8f0; }
        .dark .calendar-container .fc-theme-standard td,
        .dark .calendar-container .fc-theme-standard th,
        .dark .calendar-container .fc-theme-standard .fc-scrollgrid { border-color: #1e293b; }
        
        .calendar-container .fc-button-primary {
          background-color: #ffffff;
          border: 1px solid #e2e8f0;
          color: #475569;
          font-weight: 600;
          text-transform: capitalize;
          box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
        }
        .calendar-container .fc-button-primary:hover {
          background-color: #f8fafc;
          border-color: #cbd5e1;
          color: #0f172a;
        }
        .calendar-container .fc-button-active {
          background-color: #f1f5f9 !important;
          border-color: #cbd5e1 !important;
          color: #0f172a !important;
        }
        
        .dark .calendar-container .fc-button-primary {
          background-color: #1e293b;
          border-color: #334155;
          color: #94a3b8;
        }
        .dark .calendar-container .fc-button-primary:hover {
          background-color: #334155;
          color: #f8fafc;
        }
        .dark .calendar-container .fc-button-active {
          background-color: #334155 !important;
          border-color: #475569 !important;
          color: #f8fafc !important;
        }

        .calendar-container .fc-event {
          border: none !important;
          border-left: 3px solid rgba(255,255,255,0.4) !important;
          border-radius: 4px;
          padding: 3px 6px;
          font-size: 0.75rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s ease;
          box-shadow: 0 1px 2px rgba(0,0,0,0.05);
        }
        .calendar-container .fc-event:hover {
          transform: translateY(-1px) scale(1.02);
          box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }
        .calendar-container .fc-daygrid-day-number {
          font-weight: 500;
          color: #64748b;
        }
        .dark .calendar-container .fc-daygrid-day-number {
          color: #94a3b8;
        }
      `}</style>
    </div>
  )
}
