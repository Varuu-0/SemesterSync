'use client'

import { motion } from 'motion/react'
import { Book, Shuffle, Check } from 'lucide-react'
import { useAppContext, COURSE_COLORS } from '@/context/AppContext'
import { useState } from 'react'
import { cn } from '@/lib/utils'

const tailwindToHex: Record<string, string> = {
  'bg-blue-500': '#3b82f6',
  'bg-emerald-500': '#10b981',
  'bg-red-500': '#ef4444',
  'bg-purple-500': '#a855f7',
  'bg-orange-500': '#f97316',
  'bg-pink-500': '#ec4899',
  'bg-indigo-500': '#6366f1',
  'bg-cyan-500': '#06b6d4',
  'bg-amber-500': '#f59e0b',
  'bg-teal-500': '#14b8a6',
  'bg-rose-500': '#f43f5e',
  'bg-lime-500': '#84cc16',
  'bg-slate-500': '#64748b',
}

export default function CoursesPage() {
  const { courses, updateCourseColor, randomizeCourseColors } = useAppContext()
  const [openPickerId, setOpenPickerId] = useState<string | null>(null)

  if (courses.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center h-full text-white/40 p-8">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <Book size={48} className="mx-auto mb-4 text-white/20" />
          <p className="text-lg font-medium mb-2">No courses yet</p>
          <p className="text-sm text-white/30 max-w-xs">Upload a syllabus to populate your courses. Each course will get its own color that you can customize.</p>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="flex-1 w-full p-8 lg:p-12 overflow-y-auto">
      <div className="max-w-5xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <motion.h1
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-4xl font-light tracking-tight text-white mb-1 font-display"
            >
              Your <span className="font-semibold">Courses</span>
            </motion.h1>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="text-white/40 text-sm"
            >
              Customize colors for each course. Changes apply across the entire app.
            </motion.p>
          </div>

          <motion.button
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            onClick={randomizeCourseColors}
            className="flex items-center gap-2 px-5 py-2.5 bg-white/5 hover:bg-white/10 text-white/80 hover:text-white rounded-full border border-white/10 transition-all text-sm font-medium"
          >
            <Shuffle size={16} />
            Randomize All Colors
          </motion.button>
        </div>

        {/* Course Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {courses.map((course, i) => {
            const hex = tailwindToHex[course.color] || '#3b82f6'
            const isPickerOpen = openPickerId === course.id

            return (
              <motion.div
                key={course.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + i * 0.05 }}
                className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[24px] overflow-hidden relative"
              >
                {/* Color bar at top */}
                <div className="h-1.5 w-full transition-colors duration-300" style={{ backgroundColor: hex }} />

                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center transition-colors duration-300"
                        style={{ backgroundColor: `${hex}30` }}
                      >
                        <Book size={20} style={{ color: hex }} />
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg text-white">{course.name}</h3>
                        <p className="text-xs text-white/40">{course.title}</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono text-white/30 uppercase tracking-wider mt-1">{course.prof}</span>
                  </div>

                  {/* Grading Breakdown */}
                  {course.weights && course.weights.length > 0 && (
                    <div className="mb-5">
                      <h4 className="text-[10px] font-bold text-white/30 uppercase tracking-widest mb-3">Grading Breakdown</h4>
                      <div className="space-y-2.5">
                        {course.weights.map((w, idx) => (
                          <div key={idx}>
                            <div className="flex justify-between text-sm mb-1">
                              <span className="text-white/70 font-medium">{w.label}</span>
                              <span className="text-white/40 font-mono text-xs">{w.value}%</span>
                            </div>
                            <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                              <motion.div
                                className="h-full rounded-full"
                                style={{ backgroundColor: hex }}
                                initial={{ width: 0 }}
                                animate={{ width: `${w.value}%` }}
                                transition={{ duration: 0.8, delay: 0.3 + idx * 0.05 }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Color Picker */}
                  <div className="border-t border-white/10 pt-4">
                    <button
                      onClick={() => setOpenPickerId(isPickerOpen ? null : course.id)}
                      className="flex items-center gap-2 text-xs font-medium text-white/40 hover:text-white/70 transition-colors"
                    >
                      <div className="w-4 h-4 rounded-full border border-white/20 transition-colors duration-300" style={{ backgroundColor: hex }} />
                      {isPickerOpen ? 'Close color picker' : 'Change color'}
                    </button>

                    {isPickerOpen && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mt-3 flex flex-wrap gap-2"
                      >
                        {COURSE_COLORS.map((c) => {
                          const isSelected = course.color === c.bg
                          return (
                            <button
                              key={c.bg}
                              onClick={() => {
                                updateCourseColor(course.id, c.bg, c.text)
                                setOpenPickerId(null)
                              }}
                              className={cn(
                                "w-8 h-8 rounded-lg transition-all flex items-center justify-center",
                                isSelected ? "ring-2 ring-white/50 scale-110" : "hover:scale-110"
                              )}
                              style={{ backgroundColor: c.hex }}
                              title={c.bg.replace('bg-', '').replace('-500', '')}
                            >
                              {isSelected && <Check size={14} className="text-white drop-shadow-md" />}
                            </button>
                          )
                        })}
                      </motion.div>
                    )}
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>

      </div>
    </div>
  )
}
