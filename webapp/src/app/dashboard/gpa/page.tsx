'use client'

import { motion } from 'motion/react'
import { Calculator } from 'lucide-react'

export default function GPAPage() {
  return (
    <div className="flex items-center justify-center py-20">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[24px] p-12 text-center max-w-md"
      >
        <Calculator className="w-12 h-12 mx-auto mb-4 text-white/40" />
        <h2 className="text-xl font-semibold text-white/80 mb-2">
          Grade Calculator
        </h2>
        <p className="text-white/50 text-sm">
          Upload a syllabus to track your grading breakdowns and calculate your GPA.
        </p>
      </motion.div>
    </div>
  )
}
