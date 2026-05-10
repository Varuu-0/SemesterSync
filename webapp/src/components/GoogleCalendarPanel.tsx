'use client'

import { useState, useEffect } from 'react'
import { motion } from 'motion/react'
import { Calendar, Unplug, RefreshCw, Eye, EyeOff, Loader2, Check } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { toast } from 'sonner'
import type { GoogleCalendarEvent } from '@/lib/types'

interface GoogleCalendarPanelProps {
  onEventsChange?: (events: GoogleCalendarEvent[]) => void
}

export default function GoogleCalendarPanel({ onEventsChange }: GoogleCalendarPanelProps) {
  const { connectGoogleCalendar } = useAuth()
  const [expanded, setExpanded] = useState(true)
  const [connected, setConnected] = useState(false)
  const [configured, setConfigured] = useState(false)
  const [showGcalEvents, setShowGcalEvents] = useState(false)
  const [lastSync, setLastSync] = useState<string | null>(null)
  const [syncing, setSyncing] = useState(false)
  const [disconnecting, setDisconnecting] = useState(false)
  const [toggling, setToggling] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const res = await fetch('/api/google/status')
        if (res.ok) {
          const data = await res.json()
          setConnected(data.connected ?? false)
          setConfigured(data.configured ?? false)
          setShowGcalEvents(data.showGcalEvents ?? false)
          setLastSync(data.lastSync ?? null)
        } else {
          setConfigured(false)
          setConnected(false)
        }
      } catch {
        setConfigured(false)
        setConnected(false)
      } finally {
        setLoading(false)
      }
    }
    checkStatus()
  }, [])

  useEffect(() => {
    if (!connected || !showGcalEvents) {
      onEventsChange?.([])
      return
    }
    const fetchEvents = async () => {
      try {
        const res = await fetch('/api/google/events')
        if (res.ok) {
          const data = await res.json()
          onEventsChange?.(data.events ?? [])
        }
      } catch {
        onEventsChange?.([])
      }
    }
    fetchEvents()
  }, [connected, showGcalEvents, onEventsChange])

  const handleConnect = () => {
    connectGoogleCalendar('/dashboard/courses')
  }

  const handleSync = async () => {
    setSyncing(true)
    try {
      const res = await fetch('/api/google/sync', { method: 'POST' })
      if (res.ok) {
        const data = await res.json()
        setLastSync(data.lastSync ?? new Date().toISOString())
        toast.success('Google Calendar synced')
        if (showGcalEvents) {
          const evRes = await fetch('/api/google/events')
          if (evRes.ok) {
            const evData = await evRes.json()
            onEventsChange?.(evData.events ?? [])
          }
        }
      } else {
        toast.error('Sync failed')
      }
    } catch {
      toast.error('Sync failed')
    } finally {
      setSyncing(false)
    }
  }

  const handleToggle = async () => {
    setToggling(true)
    try {
      const res = await fetch('/api/google/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ showGcalEvents: !showGcalEvents }),
      })
      if (res.ok) {
        setShowGcalEvents(!showGcalEvents)
      } else {
        toast.error('Failed to update settings')
      }
    } catch {
      toast.error('Failed to update settings')
    } finally {
      setToggling(false)
    }
  }

  const handleDisconnect = async () => {
    setDisconnecting(true)
    try {
      const res = await fetch('/api/google/disconnect', { method: 'POST' })
      if (res.ok) {
        setConnected(false)
        setShowGcalEvents(false)
        setLastSync(null)
        onEventsChange?.([])
        toast.success('Google Calendar disconnected')
      } else {
        toast.error('Disconnect failed')
      }
    } catch {
      toast.error('Disconnect failed')
    } finally {
      setDisconnecting(false)
    }
  }

  const formatLastSync = (iso: string | null) => {
    if (!iso) return null
    try {
      const d = new Date(iso)
      return d.toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      })
    } catch {
      return null
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[24px] overflow-hidden"
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-6 py-4 cursor-pointer"
      >
        <div className="flex items-center gap-3">
          <Calendar size={18} style={{ color: 'var(--theme-accent)' }} />
          <span className="text-white font-medium">Google Calendar</span>
          <span
            className={`w-2 h-2 rounded-full ${connected ? 'bg-green-400' : 'bg-gray-500'}`}
          />
        </div>
        <motion.span
          animate={{ rotate: expanded ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="text-white/50 text-sm"
        >
          ▾
        </motion.span>
      </button>

      {expanded && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          transition={{ duration: 0.25 }}
          className="px-6 pb-5 space-y-4"
        >
          {loading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 size={20} className="animate-spin text-white/40" />
            </div>
          ) : !configured ? (
            <div className="bg-white/5 border border-white/10 rounded-xl p-4">
              <p className="text-sm text-white/60 leading-relaxed">
                Google Calendar sync is not configured. Add{' '}
                <code className="text-white/80 bg-white/10 px-1.5 py-0.5 rounded text-xs">
                  GOOGLE_CLIENT_ID
                </code>{' '}
                and{' '}
                <code className="text-white/80 bg-white/10 px-1.5 py-0.5 rounded text-xs">
                  GOOGLE_CLIENT_SECRET
                </code>{' '}
                to your <code className="text-white/80 bg-white/10 px-1.5 py-0.5 rounded text-xs">.env.local</code> file.
              </p>
            </div>
          ) : !connected ? (
            <div className="space-y-3">
              <button
                onClick={handleConnect}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/20 border border-white/10 rounded-xl text-white font-medium transition-colors cursor-pointer"
                style={{ color: 'var(--theme-accent)' }}
              >
                <Calendar size={16} />
                Connect Google Calendar
              </button>
              <p className="text-xs text-white/50 text-center">
                Sync your deadlines to Google Calendar and overlay your existing events.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Check size={14} className="text-green-400" />
                  <span className="text-sm text-white/80">Connected</span>
                  {lastSync && (
                    <span className="text-xs text-white/40">
                      · Last synced {formatLastSync(lastSync)}
                    </span>
                  )}
                </div>
              </div>

              <button
                onClick={handleSync}
                disabled={syncing}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/20 border border-white/10 rounded-xl text-white font-medium transition-colors disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
              >
                {syncing ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <RefreshCw size={16} />
                )}
                {syncing ? 'Syncing…' : 'Sync Now'}
              </button>

              <div className="flex items-center justify-between py-2">
                <div className="flex items-center gap-2">
                  {showGcalEvents ? (
                    <Eye size={14} className="text-white/60" />
                  ) : (
                    <EyeOff size={14} className="text-white/40" />
                  )}
                  <span className="text-sm text-white/70">Show Google Calendar events</span>
                </div>
                <button
                  onClick={handleToggle}
                  disabled={toggling}
                  className={`relative w-10 h-5 rounded-full transition-colors cursor-pointer disabled:cursor-not-allowed ${
                    showGcalEvents ? 'bg-green-500/60' : 'bg-white/10'
                  }`}
                  style={showGcalEvents ? { backgroundColor: 'color-mix(in srgb, var(--theme-accent) 60%, transparent)' } : {}}
                >
                  <motion.span
                    animate={{ x: showGcalEvents ? 20 : 2 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                    className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow"
                  />
                  {toggling && (
                    <Loader2 size={12} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-spin text-white/40" />
                  )}
                </button>
              </div>

              <button
                onClick={handleDisconnect}
                disabled={disconnecting}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-white/5 hover:bg-red-500/20 border border-white/10 hover:border-red-500/30 rounded-xl text-white/60 hover:text-red-400 text-sm transition-colors disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
              >
                {disconnecting ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Unplug size={14} />
                )}
                {disconnecting ? 'Disconnecting…' : 'Disconnect'}
              </button>
            </div>
          )}
        </motion.div>
      )}
    </motion.div>
  )
}
