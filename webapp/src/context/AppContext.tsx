'use client'

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react'
import { supabaseBrowser } from '@/lib/supabase'
import type { Course, Deadline, ChatMessage } from '@/lib/types'
import { COURSE_COLORS } from '@/lib/types'

interface AppContextProps {
  courses: Course[]
  deadlines: Deadline[]
  dataLoading: boolean
  addCourse: (name: string, color: string, userId: string) => Promise<Course | null>
  removeCourse: (courseId: string, userId: string) => Promise<void>
  updateCourseColor: (courseId: string, color: string) => void
  randomizeCourseColors: () => void
  toggleDeadlineCompletion: (deadlineId: string, completed: boolean, userId: string) => Promise<void>
  deleteDeadline: (deadlineId: string, userId: string) => Promise<void>
  addManualDeadline: (courseId: string, title: string, dueAt: string, category: string, userId: string) => Promise<Deadline | null>
  loadFromSupabase: (userId: string) => Promise<void>
}

const AppContext = createContext<AppContextProps | undefined>(undefined)

export function AppContextProvider({ children }: { children: ReactNode }) {
  const [courses, setCourses] = useState<Course[]>([])
  const [deadlines, setDeadlines] = useState<Deadline[]>([])
  const [dataLoading, setDataLoading] = useState(false)

  const loadFromSupabase = useCallback(async (userId: string) => {
    if (!userId) return
    setDataLoading(true)
    try {
      const supabase = supabaseBrowser()
      const [coursesRes, deadlinesRes] = await Promise.all([
        supabase.from('courses').select('*').eq('user_id', userId).order('name', { ascending: true }),
        supabase.from('deadlines').select('*').eq('user_id', userId).order('due_at', { ascending: true }),
      ])
      setCourses((coursesRes.data ?? []) as Course[])
      setDeadlines((deadlinesRes.data ?? []) as Deadline[])
    } catch (e) {
      console.error('Failed to load from Supabase:', e)
    } finally {
      setDataLoading(false)
    }
  }, [])

  const addCourse = useCallback(async (name: string, color: string, userId: string): Promise<Course | null> => {
    const supabase = supabaseBrowser()
    const { data, error } = await supabase
      .from('courses')
      .insert({ user_id: userId, name, color })
      .select()
      .single()
    if (error) {
      console.error('Add course failed:', error)
      return null
    }
    const newCourse = data as Course
    setCourses(prev => [...prev, newCourse])
    return newCourse
  }, [])

  const removeCourse = useCallback(async (courseId: string, userId: string) => {
    setCourses(prev => prev.filter(c => c.id !== courseId))
    setDeadlines(prev => prev.filter(d => d.course_id !== courseId))
    const supabase = supabaseBrowser()
    await supabase.from('deadlines').delete().eq('course_id', courseId)
    await supabase.from('courses').delete().eq('id', courseId)
  }, [])

  const updateCourseColor = useCallback((courseId: string, color: string) => {
    setCourses(prev => prev.map(c =>
      c.id === courseId ? { ...c, color } : c
    ))
    supabaseBrowser()
      .from('courses')
      .update({ color })
      .eq('id', courseId)
      .then(({ error }) => { if (error) console.error('Color update failed:', error) })
  }, [])

  const randomizeCourseColors = useCallback(() => {
    const shuffled = [...COURSE_COLORS].sort(() => Math.random() - 0.5)
    setCourses(prev => prev.map((c, i) => ({
      ...c,
      color: shuffled[i % shuffled.length],
    })))
  }, [])

  const toggleDeadlineCompletion = useCallback(async (deadlineId: string, completed: boolean, userId: string) => {
    const nextValue = completed ? new Date().toISOString() : null
    setDeadlines(prev => prev.map(d =>
      d.id === deadlineId ? { ...d, completed_at: nextValue } : d
    ))
    const supabase = supabaseBrowser()
    const { error } = await supabase
      .from('deadlines')
      .update({ completed_at: nextValue })
      .eq('id', deadlineId)
    if (error) console.error('Toggle completion failed:', error)
  }, [])

  const deleteDeadline = useCallback(async (deadlineId: string, userId: string) => {
    setDeadlines(prev => prev.filter(d => d.id !== deadlineId))
    const supabase = supabaseBrowser()
    await supabase.from('deadlines').delete().eq('id', deadlineId)
  }, [])

  const addManualDeadline = useCallback(async (
    courseId: string, title: string, dueAt: string, category: string, userId: string
  ): Promise<Deadline | null> => {
    const supabase = supabaseBrowser()
    const { data, error } = await supabase
      .from('deadlines')
      .insert({ user_id: userId, course_id: courseId, title, due_at: dueAt, category })
      .select()
      .single()
    if (error) {
      console.error('Add deadline failed:', error)
      return null
    }
    const newDeadline = data as Deadline
    setDeadlines(prev => [...prev, newDeadline])
    return newDeadline
  }, [])

  return (
    <AppContext.Provider value={{
      courses, deadlines, dataLoading,
      addCourse, removeCourse, updateCourseColor, randomizeCourseColors,
      toggleDeadlineCompletion, deleteDeadline, addManualDeadline,
      loadFromSupabase,
    }}>
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
