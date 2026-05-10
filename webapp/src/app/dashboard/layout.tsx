'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { CalendarDays, BookOpen, AlertTriangle, UploadCloud, LogOut, GraduationCap, LayoutDashboard, ListTodo, Palette } from 'lucide-react'
import { useState } from 'react'
import { UploadModal } from '@/components/UploadModal'
import { Chatbot } from '@/components/Chatbot'
import { useAppContext } from '@/context/AppContext'
import { exportToICS } from '@/lib/exportIcs'
import { useAuth } from '@/hooks/useAuth'
import { motion } from 'motion/react'
import { cn } from '@/lib/utils'
import { ThemePicker } from '@/components/ThemePicker'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false)
  const { events } = useAppContext()
  const { user, signOut } = useAuth()

  const navItems = [
    { name: 'Dashboard', href: '/dashboard', id: '/dashboard', icon: LayoutDashboard },
    { name: 'Calendar', href: '/dashboard/calendar', id: '/dashboard/calendar', icon: CalendarDays },
    { name: 'Task Board', href: '/dashboard/tasks', id: '/dashboard/tasks', icon: ListTodo },
    { name: 'Courses', href: '/dashboard/courses', id: '/dashboard/courses', icon: BookOpen },
    { name: 'Doom Week', href: '/dashboard/warnings', id: '/dashboard/warnings', icon: AlertTriangle },
  ]

  return (
    <div className="flex h-screen bg-transparent overflow-hidden font-sans">
      {/* SemesterOS Sidebar */}
      <aside className="w-64 h-full bg-white/5 backdrop-blur-2xl border-r border-white/10 flex flex-col pt-8 z-20">
        <div className="px-6 flex items-center gap-3 mb-12">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-lg transition-colors duration-700" style={{ background: `linear-gradient(to top right, var(--theme-brand-from), var(--theme-brand-to))`, boxShadow: `0 10px 15px -3px var(--theme-accent-glow)` }}>
            <GraduationCap size={24} strokeWidth={2.5} />
          </div>
          <h1 className="font-display font-semibold tracking-tight text-xl text-white">
            Semester<span style={{ color: 'var(--theme-accent)' }}>Sync</span>
          </h1>
        </div>

        <nav className="flex-1 px-4 space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all group relative overflow-hidden",
                  isActive 
                    ? "bg-white/10" 
                    : "text-white/40 hover:bg-white/5 hover:text-white"
                )}
                style={isActive ? { color: 'var(--theme-accent)' } : undefined}
              >
                {isActive && (
                  <motion.div
                    layoutId="sidebar-active"
                    className="absolute left-0 top-0 bottom-0 w-1 rounded-r-full transition-colors duration-700"
                    style={{ backgroundColor: 'var(--theme-accent)' }}
                    initial={false}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  />
                )}
                <Icon size={20} className={cn("transition-colors", !isActive && "text-white/40 group-hover:text-white")} style={isActive ? { color: 'var(--theme-accent)' } : undefined} />
                {item.name}
              </Link>
            )
          })}
        </nav>

        <div className="p-4 mt-auto space-y-1">
          <button 
            onClick={() => setIsUploadModalOpen(true)}
            className="w-full flex items-center justify-center gap-2 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl font-medium transition-all border border-white/10 mb-3"
          >
            <UploadCloud size={20} />
            Upload Syllabus
          </button>

          <ThemePicker />
          
          <button 
            onClick={signOut}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-white/40 hover:bg-white/5 hover:text-white transition-colors"
          >
            <LogOut size={20} />
            Log out
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-hidden relative bg-transparent z-10">
        <header className="h-20 flex items-center justify-between px-8 border-b border-white/10 bg-white/5 backdrop-blur-md">
          <h2 className="text-2xl font-display font-semibold text-white capitalize tracking-tight">
            {pathname === '/dashboard' ? 'Overview' : pathname.split('/').pop()}
          </h2>
          <div className="flex items-center gap-4">
            <button 
              onClick={() => exportToICS(events)}
              className="text-sm font-medium text-white/60 hover:text-white transition-colors bg-white/5 hover:bg-white/10 px-4 py-2 rounded-full border border-white/10"
            >
              Export to Calendar (.ics)
            </button>
            <div className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-md transition-colors duration-700" style={{ background: `linear-gradient(to top right, var(--theme-brand-from), var(--theme-brand-to))` }}>
              {user?.user_metadata?.avatar_url ? (
                <img src={user.user_metadata.avatar_url} alt="Avatar" className="w-full h-full object-cover rounded-full" />
              ) : (
                <span>{user?.email?.[0]?.toUpperCase() ?? '?'}</span>
              )}
            </div>
          </div>
        </header>
        
        <div className="flex-1 overflow-auto relative">
          {children}
        </div>
      </main>

      {/* Upload Modal Overlay */}
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

      {/* Floating Syllabus Chatbot */}
      <Chatbot />
    </div>
  )
}
