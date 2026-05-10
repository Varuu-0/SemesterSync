'use client'

import { AlertTriangle, CheckCircle, Flame, ArrowRight } from 'lucide-react'
import { useAppContext } from '@/context/AppContext'

export default function WarningsPage() {
  const { events } = useAppContext()

  // For now, if there are no events, or we haven't hit the "doom week" logic yet, show an empty state.
  // In Phase 7, we will add the algorithm to actually group dates and find overlaps.
  if (events.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
          <CheckCircle className="w-8 h-8 text-slate-400" />
        </div>
        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200 mb-2">No Syllabus Data</h2>
        <p className="text-slate-500 max-w-sm">
          Upload a syllabus to allow the AI to detect potential "Doom Weeks" where your assignments overlap.
        </p>
      </div>
    )
  }

  // Placeholder for real logic. Currently assumes all is well if we have events but haven't run the algorithm.
  return (
    <div className="h-full flex flex-col items-center justify-center p-6 text-center">
      <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-6">
        <CheckCircle className="w-10 h-10 text-green-500" />
      </div>
      <h2 className="text-2xl font-extrabold text-slate-800 dark:text-slate-100 mb-2">
        Schedule Looking Good!
      </h2>
      <p className="text-slate-500 max-w-md text-lg">
        We've analyzed your current syllabus data. Currently, there are no catastrophic overlaps detected. You're in the clear!
      </p>
    </div>
  )
}
