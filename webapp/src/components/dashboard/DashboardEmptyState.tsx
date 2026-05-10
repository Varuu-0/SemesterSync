'use client'

import Link from 'next/link'
import { motion } from 'motion/react'

export function DashboardEmptyState() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-[24px] border border-dashed border-white/10 bg-white/5 backdrop-blur-xl p-8 sm:p-12"
    >
      <div className="mx-auto max-w-md text-center">
        <div className="mx-auto mb-6 flex justify-center">
          <EmptyCalendarIllustration />
        </div>
        <h3 className="text-lg font-semibold text-white">
          Your semester calendar is empty
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-white/40">
          Add a course and upload its syllabus PDF. We&apos;ll scan it for every
          assignment, quiz, and exam — then track them here so nothing slips
          through the cracks.
        </p>
        <Link
          href="/dashboard/courses"
          className="mt-8 inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold text-white shadow-lg transition hover:opacity-95"
          style={{
            background: 'linear-gradient(to top right, var(--theme-brand-from), var(--theme-brand-to))',
            boxShadow: '0 8px 12px -3px var(--theme-accent-glow)',
          }}
        >
          Get started — add a course
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>
        <p className="mt-4 text-xs text-white/25">
          Tip: You can manage syllabi anytime from the Courses tab.
        </p>
      </div>
    </motion.div>
  )
}

function EmptyCalendarIllustration() {
  return (
    <svg width="160" height="140" viewBox="0 0 160 140" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <rect x="18" y="28" width="124" height="96" rx="12" stroke="rgba(255,255,255,0.15)" strokeWidth="2" />
      <path d="M18 48h124" stroke="rgba(255,255,255,0.1)" strokeWidth="2" />
      <rect x="34" y="36" width="28" height="8" rx="2" fill="rgba(255,255,255,0.1)" />
      <circle cx="124" cy="40" r="4" fill="var(--theme-accent)" opacity="0.5" />
      <rect x="34" y="58" width="92" height="6" rx="2" fill="rgba(255,255,255,0.06)" />
      <rect x="34" y="72" width="72" height="6" rx="2" fill="rgba(255,255,255,0.04)" />
      <rect x="34" y="88" width="56" height="22" rx="6" fill="var(--theme-accent)" opacity="0.1" />
      <path d="M46 99l6 6 12-14" stroke="var(--theme-accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.6" />
      <circle cx="130" cy="22" r="16" fill="var(--theme-accent)" opacity="0.08" />
      <path d="M124 22h12M130 16v12" stroke="var(--theme-accent)" strokeWidth="2" strokeLinecap="round" opacity="0.4" />
    </svg>
  )
}
