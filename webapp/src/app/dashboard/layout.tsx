'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { motion } from 'motion/react'
import {
  GraduationCap, LayoutDashboard, CalendarDays, ListTodo, BookOpen,
  AlertTriangle, Calculator, Flame, MessageCircle, UploadCloud,
  LogOut, Palette,
} from 'lucide-react'
import { UploadModal } from '@/components/UploadModal'
import { Chatbot } from '@/components/Chatbot'
import { useAppContext } from '@/context/AppContext'
import { exportToICS } from '@/lib/exportIcs'
import { useAuth } from '@/hooks/useAuth'
import { ThemePicker } from '@/components/ThemePicker'
import { cn } from '@/lib/utils'

const NAV = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/calendar', label: 'Calendar', icon: CalendarDays },
  { href: '/dashboard/tasks', label: 'Tasks', icon: ListTodo },
  { href: '/dashboard/courses', label: 'Courses', icon: BookOpen },
  { href: '/dashboard/warnings', label: 'Doom Week', icon: AlertTriangle },
  { href: '/dashboard/gpa', label: 'GPA', icon: Calculator },
  { href: '/dashboard/roast', label: 'Roast', icon: Flame },
  { href: '/dashboard/chat', label: 'Chat', icon: MessageCircle },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { user, loading: authLoading, signOut } = useAuth()
  const { deadlines, courses } = useAppContext()
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false)

  useEffect(() => {
    if (!authLoading && !user) router.replace('/')
  }, [user, authLoading, router])

  if (authLoading || !user) {
    return (
      <main className="flex min-h-screen items-center justify-center text-white/40">
        Loading…
      </main>
    )
  }

  const meta = user.user_metadata as { avatar_url?: string; full_name?: string; name?: string } | undefined
  const avatar = meta?.avatar_url
  const name = meta?.full_name ?? meta?.name ?? user.email ?? 'User'

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b border-white/10 bg-white/5 backdrop-blur-2xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          <Link href="/dashboard" className="flex items-center gap-2.5 text-white">
            <div
              className="flex h-7 w-7 items-center justify-center rounded-lg text-white shadow-lg transition-colors duration-700"
              style={{
                background: 'linear-gradient(to top right, var(--theme-brand-from), var(--theme-brand-to))',
                boxShadow: '0 6px 10px -2px var(--theme-accent-glow)',
              }}
            >
              <GraduationCap size={14} strokeWidth={2.5} />
            </div>
            <span className="text-base font-semibold tracking-tight">
              Semester<span style={{ color: 'var(--theme-accent)' }}>Sync</span>
            </span>
          </Link>

          <nav className="flex items-center gap-1">
            {NAV.map((item) => {
              const active =
                item.href === '/dashboard'
                  ? pathname === '/dashboard'
                  : pathname.startsWith(item.href)
              const Icon = item.icon
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-all',
                    active
                      ? 'bg-white/10 text-white'
                      : 'text-white/40 hover:bg-white/5 hover:text-white/80',
                  )}
                  style={active ? { color: 'var(--theme-accent)' } : undefined}
                >
                  <Icon size={15} style={active ? { color: 'var(--theme-accent)' } : undefined} />
                  <span className="hidden lg:inline">{item.label}</span>
                </Link>
              )
            })}
          </nav>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsUploadModalOpen(true)}
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-white/50 hover:text-white hover:bg-white/5 transition-all"
            >
              <UploadCloud size={15} />
              <span className="hidden xl:inline">Upload</span>
            </button>

            <button
              onClick={() => exportToICS(deadlines, courses)}
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-white/50 hover:text-white hover:bg-white/5 transition-all"
            >
              <span className="hidden xl:inline">.ics</span>
            </button>

            <ThemePicker />

            {avatar ? (
              <img src={avatar} alt={name} className="h-7 w-7 rounded-full" referrerPolicy="no-referrer" />
            ) : (
              <div
                className="flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold text-white"
                style={{
                  background: 'linear-gradient(to top right, var(--theme-brand-from), var(--theme-brand-to))',
                }}
              >
                {name[0]?.toUpperCase() ?? '?'}
              </div>
            )}

            <button
              onClick={signOut}
              className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-medium text-white/40 hover:text-white hover:bg-white/5 transition-all"
            >
              <LogOut size={15} />
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8">
        {children}
      </main>

      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-lg p-4">
          <div className="relative max-w-4xl w-full h-full max-h-[80vh] flex flex-col items-center justify-center">
            <button
              onClick={() => setIsUploadModalOpen(false)}
              className="absolute top-0 right-0 z-50 text-white/50 hover:text-white font-medium p-4 bg-white/5 rounded-full hover:bg-white/10 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
            <UploadModal onUploadSuccess={() => setIsUploadModalOpen(false)} />
          </div>
        </div>
      )}

      <Chatbot />
    </div>
  )
}
