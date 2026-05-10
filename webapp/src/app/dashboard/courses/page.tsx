'use client'

import { useState } from 'react'
import { motion } from 'motion/react'
import { Book, Plus, Trash2, Upload, Shuffle, Check, X } from 'lucide-react'
import { useAppContext } from '@/context/AppContext'
import { useAuth } from '@/hooks/useAuth'
import { COURSE_COLORS, type Course } from '@/lib/types'
import GoogleCalendarPanel from '@/components/GoogleCalendarPanel'
import { toast } from 'sonner'

export default function CoursesPage() {
  const { courses, addCourse, removeCourse, updateCourseColor, randomizeCourseColors } = useAppContext()
  const { user } = useAuth()
  const [openPickerId, setOpenPickerId] = useState<string | null>(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [newCourseName, setNewCourseName] = useState('')
  const [newCourseColor, setNewCourseColor] = useState<string>(COURSE_COLORS[0])
  const [isAdding, setIsAdding] = useState(false)

  const handleAddCourse = async () => {
    if (!newCourseName.trim() || !user) return
    setIsAdding(true)
    try {
      const result = await addCourse(newCourseName.trim(), newCourseColor, user.id)
      if (result) {
        toast.success(`Added "${newCourseName.trim()}"`)
        setNewCourseName('')
        setNewCourseColor(COURSE_COLORS[0])
        setShowAddForm(false)
      } else {
        toast.error('Failed to add course')
      }
    } catch {
      toast.error('Failed to add course')
    } finally {
      setIsAdding(false)
    }
  }

  const handleDeleteCourse = async (courseId: string, courseName: string) => {
    if (deleteConfirmId === courseId) {
      try {
        await removeCourse(courseId, user!.id)
        toast.success(`Removed "${courseName}"`)
        setDeleteConfirmId(null)
      } catch {
        toast.error('Failed to remove course')
      }
    } else {
      setDeleteConfirmId(courseId)
      setTimeout(() => setDeleteConfirmId(null), 3000)
    }
  }

  const cancelAdd = () => {
    setShowAddForm(false)
    setNewCourseName('')
    setNewCourseColor(COURSE_COLORS[0])
  }

  return (
    <div className="space-y-8">

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

          <div className="flex items-center gap-3">
            <motion.button
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.15 }}
              onClick={randomizeCourseColors}
              className="flex items-center gap-2 px-5 py-2.5 bg-white/5 hover:bg-white/10 text-white/80 hover:text-white rounded-full border border-white/10 transition-all text-sm font-medium"
            >
              <Shuffle size={16} />
              Randomize All Colors
            </motion.button>
            <motion.button
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
              onClick={() => setShowAddForm(true)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-full border border-white/10 transition-all text-sm font-medium"
              style={{
                background: 'linear-gradient(to top right, var(--theme-brand-from), var(--theme-brand-to))',
                color: 'white',
                boxShadow: '0 8px 12px -3px var(--theme-accent-glow)',
              }}
            >
              <Plus size={16} />
              Add Course
            </motion.button>
          </div>
        </div>

        {/* Add Course Form */}
        {showAddForm && (
          <motion.div
            initial={{ opacity: 0, y: -10, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: -10, height: 0 }}
            className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[24px] p-6 overflow-hidden"
          >
            <h3 className="text-sm font-semibold text-white/80 uppercase tracking-widest mb-4">New Course</h3>
            <div className="flex flex-col sm:flex-row gap-4">
              <input
                type="text"
                value={newCourseName}
                onChange={(e) => setNewCourseName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleAddCourse() }}
                placeholder="Course name (e.g. CS101)"
                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/30 focus:outline-none focus:border-white/20 transition-all"
                autoFocus
              />
              <div className="flex flex-wrap gap-2">
                {COURSE_COLORS.map((c) => {
                  const isSelected = newCourseColor === c
                  return (
                    <button
                      key={c}
                      onClick={() => setNewCourseColor(c)}
                      className={`w-8 h-8 rounded-lg transition-all flex items-center justify-center ${
                        isSelected ? 'ring-2 ring-white/50 scale-110' : 'hover:scale-110 opacity-60 hover:opacity-100'
                      }`}
                      style={{ backgroundColor: c }}
                    >
                      {isSelected && <Check size={14} className="text-white drop-shadow-md" />}
                    </button>
                  )
                })}
              </div>
            </div>
            <div className="flex items-center gap-3 mt-4">
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={handleAddCourse}
                disabled={!newCourseName.trim() || isAdding}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all disabled:opacity-40"
                style={{
                  background: 'linear-gradient(to top right, var(--theme-brand-from), var(--theme-brand-to))',
                  color: 'white',
                }}
              >
                {isAdding ? (
                  <motion.div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Check size={16} />
                )}
                Save
              </motion.button>
              <button
                onClick={cancelAdd}
                className="flex items-center gap-2 px-5 py-2.5 bg-white/5 hover:bg-white/10 text-white/60 hover:text-white rounded-xl border border-white/10 transition-all text-sm font-medium"
              >
                <X size={16} />
                Cancel
              </button>
            </div>
          </motion.div>
        )}

        {/* Course Cards */}
        {courses.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-20 text-center"
          >
            <div className="w-20 h-20 rounded-2xl bg-white/5 flex items-center justify-center mb-6">
              <Upload size={36} className="text-white/20" />
            </div>
            <p className="text-lg font-medium text-white/50 mb-2">No courses yet</p>
            <p className="text-sm text-white/30 max-w-xs">
              Upload a syllabus to add courses automatically, or create one manually.
            </p>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {courses.map((course, i) => {
              const hex = course.color
              const isPickerOpen = openPickerId === course.id
              const isDeleteConfirm = deleteConfirmId === course.id

              return (
                <motion.div
                  key={course.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 + i * 0.05 }}
                  className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[24px] overflow-hidden relative"
                >
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
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                      </div>
                    </div>

                    {/* Color Picker + Delete */}
                    <div className="border-t border-white/10 pt-4 flex items-center justify-between">
                      <button
                        onClick={() => setOpenPickerId(isPickerOpen ? null : course.id)}
                        className="flex items-center gap-2 text-xs font-medium text-white/40 hover:text-white/70 transition-colors"
                      >
                        <div className="w-4 h-4 rounded-full border border-white/20 transition-colors duration-300" style={{ backgroundColor: hex }} />
                        {isPickerOpen ? 'Close' : 'Change color'}
                      </button>

                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleDeleteCourse(course.id, course.name)}
                        className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-all ${
                          isDeleteConfirm
                            ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                            : 'text-white/30 hover:text-red-400 hover:bg-red-500/10'
                        }`}
                      >
                        <Trash2 size={12} />
                        {isDeleteConfirm ? 'Confirm?' : 'Delete'}
                      </motion.button>
                    </div>

                    {isPickerOpen && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mt-3 flex flex-wrap gap-2"
                      >
                        {COURSE_COLORS.map((c) => {
                          const isSelected = course.color === c
                          return (
                            <button
                              key={c}
                              onClick={() => {
                                updateCourseColor(course.id, c)
                                setOpenPickerId(null)
                              }}
                              className={`w-8 h-8 rounded-lg transition-all flex items-center justify-center ${
                                isSelected ? 'ring-2 ring-white/50 scale-110' : 'hover:scale-110'
                              }`}
                              style={{ backgroundColor: c }}
                            >
                              {isSelected && <Check size={14} className="text-white drop-shadow-md" />}
                            </button>
                          )
                        })}
                      </motion.div>
                    )}
                  </div>
                </motion.div>
              )
            })}
          </div>
        )}

      <div className="mt-8">
        <GoogleCalendarPanel />
      </div>
    </div>
  )
}
