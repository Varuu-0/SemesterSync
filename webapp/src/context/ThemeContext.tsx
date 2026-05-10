'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'

export interface ThemePreset {
  id: string
  name: string
  bg: string           // Main background
  meshA: string        // First mesh gradient blob color
  meshB: string        // Second mesh gradient blob color
  accent: string       // Primary accent (active sidebar, links)
  accentGlow: string   // Shadow/glow for accent elements
  brandFrom: string    // Brand gradient start (logo icon)
  brandTo: string      // Brand gradient end
}

export const PRESETS: ThemePreset[] = [
  {
    id: 'nebula',
    name: 'Nebula',
    bg: '#0c0e14',
    meshA: 'rgba(147, 51, 234, 0.20)',   // purple
    meshB: 'rgba(59, 130, 246, 0.20)',    // blue
    accent: '#60a5fa',
    accentGlow: 'rgba(96, 165, 250, 0.20)',
    brandFrom: '#a855f7',
    brandTo: '#3b82f6',
  },
  {
    id: 'emerald',
    name: 'Emerald',
    bg: '#0a0f0e',
    meshA: 'rgba(16, 185, 129, 0.18)',
    meshB: 'rgba(20, 184, 166, 0.15)',
    accent: '#34d399',
    accentGlow: 'rgba(52, 211, 153, 0.20)',
    brandFrom: '#10b981',
    brandTo: '#14b8a6',
  },
  {
    id: 'sunset',
    name: 'Sunset',
    bg: '#140c0a',
    meshA: 'rgba(249, 115, 22, 0.18)',
    meshB: 'rgba(234, 88, 12, 0.15)',
    accent: '#fb923c',
    accentGlow: 'rgba(251, 146, 60, 0.20)',
    brandFrom: '#f97316',
    brandTo: '#ef4444',
  },
  {
    id: 'rose',
    name: 'Rose',
    bg: '#120a0e',
    meshA: 'rgba(236, 72, 153, 0.18)',
    meshB: 'rgba(168, 85, 247, 0.15)',
    accent: '#f472b6',
    accentGlow: 'rgba(244, 114, 182, 0.20)',
    brandFrom: '#ec4899',
    brandTo: '#a855f7',
  },
  {
    id: 'arctic',
    name: 'Arctic',
    bg: '#0a0c14',
    meshA: 'rgba(56, 189, 248, 0.18)',
    meshB: 'rgba(99, 102, 241, 0.15)',
    accent: '#38bdf8',
    accentGlow: 'rgba(56, 189, 248, 0.20)',
    brandFrom: '#38bdf8',
    brandTo: '#6366f1',
  },
]

interface ThemeContextType {
  theme: ThemePreset
  setThemeById: (id: string) => void
  customAccent: string | null
  setCustomAccent: (hex: string | null) => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [themeId, setThemeId] = useState('nebula')
  const [customAccent, setCustomAccent] = useState<string | null>(null)

  // Persist to localStorage
  useEffect(() => {
    const saved = localStorage.getItem('semester-sync-theme')
    const savedAccent = localStorage.getItem('semester-sync-accent')
    if (saved) setThemeId(saved)
    if (savedAccent) setCustomAccent(savedAccent)
  }, [])

  useEffect(() => {
    localStorage.setItem('semester-sync-theme', themeId)
  }, [themeId])

  useEffect(() => {
    if (customAccent) {
      localStorage.setItem('semester-sync-accent', customAccent)
    } else {
      localStorage.removeItem('semester-sync-accent')
    }
  }, [customAccent])

  const theme = PRESETS.find(p => p.id === themeId) || PRESETS[0]

  // Apply CSS custom properties to the document
  useEffect(() => {
    const root = document.documentElement
    const activeAccent = customAccent || theme.accent
    root.style.setProperty('--theme-bg', theme.bg)
    root.style.setProperty('--theme-mesh-a', theme.meshA)
    root.style.setProperty('--theme-mesh-b', theme.meshB)
    root.style.setProperty('--theme-accent', activeAccent)
    root.style.setProperty('--theme-accent-glow', customAccent ? `${customAccent}33` : theme.accentGlow)
    root.style.setProperty('--theme-brand-from', theme.brandFrom)
    root.style.setProperty('--theme-brand-to', theme.brandTo)
  }, [theme, customAccent])

  const setThemeById = (id: string) => {
    setThemeId(id)
    setCustomAccent(null) // Reset custom accent when switching presets
  }

  return (
    <ThemeContext.Provider value={{ theme, setThemeById, customAccent, setCustomAccent }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within a ThemeProvider')
  return ctx
}
