'use client'

import React, { createContext, useContext, useState, ReactNode } from 'react'

export type Course = {
  id: string
  name: string
  title: string
  prof: string
  color: string
  textColor: string
  weights: { label: string; value: number }[]
}

export type AppEvent = {
  id: string
  courseId: string
  title: string
  date: string // ISO string
  type: string // 'assignment', 'midterm', 'lecture'
  weight: number
  description: string
  completed?: boolean
}

export type AppMaterial = {
  id: string
  courseId: string
  title: string
  type: string // e.g. 'rubric', 'reading', 'lecture_notes'
  summary: string
}

const COURSE_COLORS = [
  { bg: 'bg-blue-500', text: 'text-blue-500', hex: '#3b82f6' },
  { bg: 'bg-emerald-500', text: 'text-emerald-500', hex: '#10b981' },
  { bg: 'bg-red-500', text: 'text-red-500', hex: '#ef4444' },
  { bg: 'bg-purple-500', text: 'text-purple-500', hex: '#a855f7' },
  { bg: 'bg-orange-500', text: 'text-orange-500', hex: '#f97316' },
  { bg: 'bg-pink-500', text: 'text-pink-500', hex: '#ec4899' },
  { bg: 'bg-indigo-500', text: 'text-indigo-500', hex: '#6366f1' },
  { bg: 'bg-cyan-500', text: 'text-cyan-500', hex: '#06b6d4' },
  { bg: 'bg-amber-500', text: 'text-amber-500', hex: '#f59e0b' },
  { bg: 'bg-teal-500', text: 'text-teal-500', hex: '#14b8a6' },
  { bg: 'bg-rose-500', text: 'text-rose-500', hex: '#f43f5e' },
  { bg: 'bg-lime-500', text: 'text-lime-500', hex: '#84cc16' },
]

export { COURSE_COLORS }

interface AppContextProps {
  courses: Course[]
  events: AppEvent[]
  materials: AppMaterial[]
  setCourses: (courses: Course[]) => void
  setEvents: (events: AppEvent[]) => void
  setMaterials: (materials: AppMaterial[]) => void
  addExtractedData: (data: { courses?: Course[]; events?: AppEvent[]; materials?: AppMaterial[] }) => void
  updateCourseColor: (courseId: string, bg: string, textColor: string) => void
  randomizeCourseColors: () => void
}

const AppContext = createContext<AppContextProps | undefined>(undefined)

export function AppContextProvider({ children }: { children: ReactNode }) {
  const [courses, setCourses] = useState<Course[]>([])
  const [events, setEvents] = useState<AppEvent[]>([])
  const [materials, setMaterials] = useState<AppMaterial[]>([])

  const addExtractedData = (data: { courses?: Course[]; events?: AppEvent[]; materials?: AppMaterial[] }) => {
    // Generate truly unique IDs for every item since Gemini might output duplicate IDs within the same array
    const courseIdMap: Record<string, string> = {}
    
    const uniqueCourses = (data.courses || []).map(c => {
      const newId = `course-${Math.random().toString(36).substring(2, 15)}`
      courseIdMap[c.id] = newId
      return { ...c, id: newId }
    })
    
    const uniqueEvents = (data.events || []).map(e => ({
      ...e,
      id: `event-${Math.random().toString(36).substring(2, 15)}`,
      courseId: courseIdMap[e.courseId] || e.courseId
    }))
    
    const uniqueMaterials = (data.materials || []).map(m => ({
      ...m,
      id: `material-${Math.random().toString(36).substring(2, 15)}`,
      courseId: courseIdMap[m.courseId] || m.courseId
    }))

    if (uniqueCourses.length > 0) setCourses(prev => [...prev, ...uniqueCourses])
    if (uniqueEvents.length > 0) setEvents(prev => [...prev, ...uniqueEvents])
    if (uniqueMaterials.length > 0) setMaterials(prev => [...prev, ...uniqueMaterials])
  }

  const updateCourseColor = (courseId: string, bg: string, textColor: string) => {
    setCourses(prev => prev.map(c =>
      c.id === courseId ? { ...c, color: bg, textColor } : c
    ))
  }

  const randomizeCourseColors = () => {
    // Shuffle a copy of the colors array and assign one to each course
    const shuffled = [...COURSE_COLORS].sort(() => Math.random() - 0.5)
    setCourses(prev => prev.map((c, i) => {
      const pick = shuffled[i % shuffled.length]
      return { ...c, color: pick.bg, textColor: pick.text }
    }))
  }

  return (
    <AppContext.Provider value={{ courses, events, materials, setCourses, setEvents, setMaterials, addExtractedData, updateCourseColor, randomizeCourseColors }}>
      {children}
    </AppContext.Provider>
  )
}

export function useAppContext() {
  const context = useContext(AppContext)
  if (!context) {
    throw new Error('useAppContext must be used within an AppContextProvider')
  }
  return context
}
