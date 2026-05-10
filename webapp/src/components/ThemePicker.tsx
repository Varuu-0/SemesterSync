'use client'

import React, { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { Palette, Check, X } from 'lucide-react'
import { useTheme, PRESETS } from '@/context/ThemeContext'
import { cn } from '@/lib/utils'

export function ThemePicker() {
  const [isOpen, setIsOpen] = useState(false)
  const { theme, setThemeById, customAccent, setCustomAccent } = useTheme()
  const pickerRef = useRef<HTMLDivElement>(null)

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    if (isOpen) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [isOpen])

  return (
    <div ref={pickerRef} className="relative">
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-white/40 hover:bg-white/5 hover:text-white transition-colors"
      >
        <Palette size={20} />
        Theme
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute bottom-full left-0 mb-2 w-72 bg-[#161820] border border-white/10 rounded-2xl p-5 shadow-2xl z-50 backdrop-blur-xl"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-white tracking-wide">Color Theme</h3>
              <button onClick={() => setIsOpen(false)} className="text-white/30 hover:text-white transition-colors">
                <X size={16} />
              </button>
            </div>

            {/* Preset Swatches */}
            <div className="space-y-2 mb-5">
              {PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => { setThemeById(preset.id) }}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all",
                    theme.id === preset.id && !customAccent
                      ? "bg-white/10 border border-white/20"
                      : "hover:bg-white/5 border border-transparent"
                  )}
                >
                  {/* Swatch preview */}
                  <div className="flex -space-x-1">
                    <div className="w-5 h-5 rounded-full border-2 border-[#161820]" style={{ backgroundColor: preset.brandFrom }} />
                    <div className="w-5 h-5 rounded-full border-2 border-[#161820]" style={{ backgroundColor: preset.brandTo }} />
                    <div className="w-5 h-5 rounded-full border-2 border-[#161820]" style={{ backgroundColor: preset.accent }} />
                  </div>
                  <span className="text-sm font-medium text-white/80">{preset.name}</span>
                  {theme.id === preset.id && !customAccent && (
                    <Check size={14} className="ml-auto" style={{ color: preset.accent }} />
                  )}
                </button>
              ))}
            </div>

            {/* Custom Color Wheel Section */}
            <div className="border-t border-white/10 pt-4">
              <label className="text-xs font-semibold text-white/40 uppercase tracking-widest mb-3 block">Custom Accent</label>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <input
                    type="color"
                    value={customAccent || theme.accent}
                    onChange={(e) => setCustomAccent(e.target.value)}
                    className="w-10 h-10 rounded-xl cursor-pointer border-2 border-white/10 bg-transparent appearance-none [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:rounded-lg [&::-webkit-color-swatch]:border-none"
                  />
                </div>
                <div className="flex-1">
                  <input
                    type="text"
                    value={customAccent || theme.accent}
                    onChange={(e) => {
                      const v = e.target.value
                      if (/^#[0-9a-fA-F]{0,6}$/.test(v)) setCustomAccent(v)
                    }}
                    placeholder="#60a5fa"
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-white/30 transition-colors"
                  />
                </div>
                {customAccent && (
                  <button
                    onClick={() => setCustomAccent(null)}
                    className="text-white/30 hover:text-white transition-colors p-2"
                    title="Reset to preset"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
              {customAccent && (
                <p className="text-[10px] text-white/30 mt-2">Using custom accent on top of {theme.name} preset.</p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
