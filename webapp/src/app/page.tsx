'use client'

import Link from 'next/link'
import { CalendarDays, CheckCircle, Zap, Loader2, Sparkles, ArrowRight } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'

export default function LandingPage() {
  const { user, loading, signInWithGoogle } = useAuth()

  return (
    <main className="min-h-screen flex flex-col relative overflow-hidden bg-transparent">
      {/* Navbar */}
      <header className="w-full p-6 flex justify-between items-center max-w-7xl mx-auto border-b border-white/10 bg-white/5 backdrop-blur-md z-20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-tr from-purple-500 to-blue-500 rounded-xl flex items-center justify-center shadow-lg shadow-purple-500/20">
            <CalendarDays className="w-5 h-5 text-white" />
          </div>
          <span className="font-display font-semibold text-2xl tracking-tight text-white">Semester<span className="text-blue-400">Sync</span></span>
        </div>
        {user ? (
          <Link
            href="/dashboard"
            className="px-6 py-2 bg-white/10 text-white rounded-full text-sm font-medium hover:bg-white/20 transition-all flex items-center gap-2 group border border-white/10"
          >
            Dashboard
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        ) : (
          <button
            onClick={signInWithGoogle}
            disabled={loading}
            className="px-6 py-2 bg-white/10 text-white rounded-full text-sm font-medium hover:bg-white/20 transition-all border border-white/10 disabled:opacity-50"
          >
            Sign In
          </button>
        )}
      </header>

      {/* Hero Section */}
      <section className="flex-1 flex flex-col items-center justify-center px-4 text-center pb-20 relative z-10">
        
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs font-bold text-white/80 mb-8 uppercase tracking-widest animate-in fade-in duration-700 backdrop-blur-md">
          <Sparkles className="w-3.5 h-3.5 text-blue-400" />
          <span>Survive the Semester with AI</span>
        </div>

        <h1 className="text-6xl md:text-8xl font-display font-semibold tracking-tighter text-white max-w-5xl mb-8 leading-[1.1] animate-in fade-in slide-in-from-bottom-8 duration-700 delay-100">
          Syllabus to Calendar in{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">
            Seconds
          </span>
          .
        </h1>
        
        <p className="text-lg md:text-2xl text-white/40 max-w-3xl mb-12 font-medium animate-in fade-in slide-in-from-bottom-8 duration-700 delay-200">
          Upload your messy course syllabi. Let AI instantly extract all midterms, assignments,
          and lectures into a unified master schedule. Say goodbye to missed deadlines.
        </p>

        <div className="animate-in fade-in slide-in-from-bottom-8 duration-700 delay-300">
          <button
            onClick={signInWithGoogle}
            disabled={loading}
            className="group px-8 py-4 bg-white text-black rounded-full font-semibold text-lg hover:bg-white/90 transition-colors flex items-center gap-3 disabled:opacity-60 shadow-xl shadow-white/10"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <img
                src="https://authjs.dev/img/providers/google.svg"
                alt="Google"
                className="w-5 h-5 bg-white rounded-sm"
              />
            )}
            <span>{user ? 'Go to Dashboard' : 'Sign in with Google'}</span>
          </button>
        </div>

        {/* Feature Highlights - Glass Panels */}
        <div className="mt-32 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl w-full text-left animate-in fade-in slide-in-from-bottom-12 duration-1000 delay-500">
          <div className="p-8 bg-white/5 backdrop-blur-xl border border-white/10 rounded-[32px] hover:bg-white/10 transition-colors">
            <div className="w-12 h-12 bg-white/10 border border-white/10 rounded-2xl flex items-center justify-center mb-6">
              <Zap className="w-6 h-6 text-blue-400" />
            </div>
            <h3 className="text-xl font-medium mb-3 text-white">Instant Extraction</h3>
            <p className="text-white/40 text-base leading-relaxed">
              Drag and drop a massive PDF and get all your deadlines mapped out instantly using our premium AI parsing engine.
            </p>
          </div>

          <div className="p-8 bg-white/5 backdrop-blur-xl border border-white/10 rounded-[32px] relative overflow-hidden hover:bg-white/10 transition-colors">
            <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 blur-[50px] rounded-none pointer-events-none" />
            <div className="w-12 h-12 bg-white/10 border border-white/10 rounded-2xl flex items-center justify-center mb-6 relative z-10">
              <CheckCircle className="w-6 h-6 text-purple-400" />
            </div>
            <h3 className="text-xl font-medium mb-3 text-white relative z-10">Neural Task Board</h3>
            <p className="text-white/40 text-base leading-relaxed relative z-10">
              Agentic AI recursively breaks down your largest assignments into manageable sub-tasks with time estimates.
            </p>
          </div>

          <div className="p-8 bg-white/5 backdrop-blur-xl border border-white/10 rounded-[32px] hover:bg-white/10 transition-colors">
            <div className="w-12 h-12 bg-white/10 border border-white/10 rounded-2xl flex items-center justify-center mb-6">
              <CalendarDays className="w-6 h-6 text-emerald-400" />
            </div>
            <h3 className="text-xl font-medium mb-3 text-white">Burnout Prevention</h3>
            <p className="text-white/40 text-base leading-relaxed">
              Our system detects "Doom Weeks" where multiple midterms overlap, warning you well in advance to start studying.
            </p>
          </div>
        </div>
      </section>
    </main>
  )
}
