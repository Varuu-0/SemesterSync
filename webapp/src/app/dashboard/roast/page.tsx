'use client'

import { useState } from 'react'
import { motion } from 'motion/react'
import { Flame, Copy, RefreshCw, Check } from 'lucide-react'
import { useAppContext } from '@/context/AppContext'
import { useAuth } from '@/hooks/useAuth'

export default function RoastPage() {
  const { courses, deadlines } = useAppContext()
  const { user } = useAuth()
  const [roast, setRoast] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  const fetchRoast = async () => {
    setLoading(true)
    setRoast(null)
    try {
      const res = await fetch('/api/roast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courses: courses.map(c => ({ name: c.name })),
          deadlines: deadlines.map(d => ({
            title: d.title,
            due_at: d.due_at,
            category: d.category || 'other',
          })),
        }),
      })
      const data = await res.json()
      if (data.roast) {
        setRoast(data.roast)
      } else {
        setRoast('Something went wrong. Even the AI couldn\'t handle your schedule.')
      }
    } catch {
      setRoast('The AI is speechless. Your schedule broke the internet.')
    } finally {
      setLoading(false)
    }
  }

  const handleCopy = async () => {
    if (!roast) return
    await navigator.clipboard.writeText(roast)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (courses.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center h-full text-white/40 p-8">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <Flame size={48} className="mx-auto mb-4 text-white/20" />
          <p className="text-lg font-medium mb-2">No courses yet</p>
          <p className="text-sm text-white/30 max-w-xs">
            Upload a syllabus first so the AI has something to roast you about.
          </p>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8">

        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="text-4xl font-light tracking-tight text-white mb-1 font-display">
            Roast My <span className="font-semibold">Semester</span>
          </h1>
          <p className="text-white/40 text-sm">
            Let an AI academic advisor brutally roast your course load and deadlines.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-gradient-to-br from-orange-500/10 to-red-500/10 backdrop-blur-xl border border-orange-500/20 rounded-[24px] p-8 relative overflow-hidden"
        >
          <div className="absolute top-4 left-5 text-orange-500/10 text-[120px] leading-none font-serif select-none pointer-events-none">
            &ldquo;
          </div>
          <div className="absolute bottom-4 right-5 text-orange-500/10 text-[120px] leading-none font-serif select-none pointer-events-none rotate-180">
            &ldquo;
          </div>

          <div className="relative z-10">
            {!roast && !loading && (
              <div className="text-center py-8">
                <Flame size={40} className="mx-auto mb-4 text-orange-400/60" />
                <p className="text-white/50 text-sm mb-6">
                  Ready to hear the truth about your schedule?
                </p>
                <button
                  onClick={fetchRoast}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-400 hover:to-red-400 text-white font-semibold rounded-full transition-all shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40"
                >
                  <Flame size={18} />
                  Roast My Semester
                </button>
              </div>
            )}

            {loading && (
              <div className="text-center py-8">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }}
                  className="inline-block mb-4"
                >
                  <Flame size={40} className="text-orange-400" />
                </motion.div>
                <p className="text-white/50 text-sm">
                  Analyzing your poor life choices...
                </p>
              </div>
            )}

            {roast && !loading && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <div className="flex items-start gap-3 mb-6">
                  <Flame size={20} className="text-orange-400 mt-1 shrink-0" />
                  <p className="text-white/80 text-lg leading-relaxed">
                    {roast}
                  </p>
                </div>

                <div className="flex items-center gap-3 pt-4 border-t border-orange-500/10">
                  <button
                    onClick={fetchRoast}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 text-white/70 hover:text-white rounded-full border border-white/10 transition-all text-sm font-medium"
                  >
                    <RefreshCw size={14} />
                    Regenerate
                  </button>
                  <button
                    onClick={handleCopy}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 text-white/70 hover:text-white rounded-full border border-white/10 transition-all text-sm font-medium"
                  >
                    {copied ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
                    {copied ? 'Copied!' : 'Copy'}
                  </button>
                </div>
              </motion.div>
            )}
          </div>
          </motion.div>

    </div>
  )
}
