'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { MessageCircle, X, Send, Loader2, Trash2, RotateCcw } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { useAuth } from '@/hooks/useAuth'
import { supabaseBrowser } from '@/lib/supabase'
import type { ChatMessage } from '@/lib/types'
import { toast } from 'sonner'

const SUGGESTIONS = [
  "What's due this week?",
  'Plan my next 2 weeks',
  'Which course is heaviest?',
]

export function Chatbot() {
  const { user } = useAuth()
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [streamingText, setStreamingText] = useState('')
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [hasUnread, setHasUnread] = useState(false)
  const [confirmClear, setConfirmClear] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const abortRef = useRef<AbortController | null>(null)
  const prevMessageCountRef = useRef(0)

  async function loadHistory() {
    if (!user) return
    setLoadingHistory(true)
    try {
      const sb = supabaseBrowser()
      const { data, error } = await sb
        .from('chat_messages')
        .select('*')
        .is('course_id', null)
        .order('created_at', { ascending: true })
        .limit(50)

      if (error) throw error
      setMessages((data as ChatMessage[]) ?? [])
    } catch (err) {
      console.error('Failed to load chat history:', err)
    } finally {
      setLoadingHistory(false)
    }
  }

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamingText])

  useEffect(() => {
    if (!isOpen) return
    if (messages.length > prevMessageCountRef.current) {
      setHasUnread(false)
    }
    prevMessageCountRef.current = messages.length
  }, [isOpen, messages.length])

  useEffect(() => {
    if (!isOpen || !user) return
    loadHistory()
  }, [isOpen, user])

  useEffect(() => {
    return () => {
      abortRef.current?.abort()
    }
  }, [])

  async function sendMessage(text?: string) {
    const content = (text ?? input).trim()
    if (!content || isStreaming || !user) return

    setInput('')
    setIsStreaming(true)
    setStreamingText('')

    const optimisticUserMsg = {
      id: `local-${Date.now()}`,
      user_id: user.id,
      course_id: null as string | null,
      role: 'user' as const,
      text: content,
      user_name: null as string | null,
      user_photo: null as string | null,
      created_at: new Date().toISOString(),
    }
    setMessages(prev => [...prev, optimisticUserMsg])

    abortRef.current = new AbortController()

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'text/event-stream',
        },
        body: JSON.stringify({
          query: content,
          history: messages.slice(-6).map(m => ({ role: m.role, text: m.text })),
        }),
        signal: abortRef.current.signal,
      })

      if (!res.ok || !res.body) throw new Error('Stream failed')

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let accumulated = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value, { stream: true })
        const lines = chunk.split('\n')

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6)
            if (data === '[DONE]') break
            try {
              const parsed = JSON.parse(data)
              if (parsed.delta) {
                accumulated += parsed.delta
                setStreamingText(accumulated)
              }
              if (parsed.message) {
                const saved: ChatMessage = {
                  id: parsed.message.id,
                  user_id: user.id,
                  course_id: null,
                  role: 'assistant',
                  text: parsed.message.text ?? parsed.message.content ?? '',
                  user_name: null,
                  user_photo: null,
                  created_at: parsed.message.created_at,
                }
                setMessages(prev => [...prev, saved])
              }
            } catch {
              accumulated += data
              setStreamingText(accumulated)
            }
          }
        }
      }

      if (accumulated && !messages.some(m => m.text === accumulated && m.role === 'assistant')) {
        const assistantMsg = {
          id: `local-assistant-${Date.now()}`,
          user_id: user.id,
          course_id: null as string | null,
          role: 'assistant' as const,
          text: accumulated,
          user_name: null as string | null,
          user_photo: null as string | null,
          created_at: new Date().toISOString(),
        }
        setMessages(prev => [...prev, assistantMsg])
      }
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        console.error('Chat error:', err)
        setMessages(prev => [
          ...prev,
          {
            id: `local-error-${Date.now()}`,
            user_id: user.id,
            course_id: null as string | null,
            role: 'assistant' as const,
            text: 'Sorry, I ran into an error processing that request.',
            user_name: null as string | null,
            user_photo: null as string | null,
            created_at: new Date().toISOString(),
          },
        ])
      }
    } finally {
      setIsStreaming(false)
      setStreamingText('')
      abortRef.current = null
      if (!isOpen) setHasUnread(true)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  async function deleteMessage(id: string) {
    if (!id || !user) return
    const prev = [...messages]
    setMessages(msgs => msgs.filter(m => m.id !== id))
    try {
      const sb = supabaseBrowser()
      const { error } = await sb.from('chat_messages').delete().eq('id', id)
      if (error) throw error
    } catch {
      setMessages(prev)
      toast.error('Failed to delete message')
    }
  }

  async function clearConversation() {
    if (!user) return
    const prev = [...messages]
    setMessages([])
    setConfirmClear(false)
    try {
      const sb = supabaseBrowser()
      const { error } = await sb.from('chat_messages').delete().eq('user_id', user.id).is('course_id', null)
      if (error) throw error
      toast.success('Conversation cleared')
    } catch {
      setMessages(prev)
      toast.error('Failed to clear conversation')
    }
  }

  return (
    <>
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 20 }}
            onClick={() => setIsOpen(true)}
            className="fixed bottom-6 right-6 z-50 w-12 h-12 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 dark:from-violet-400 dark:to-indigo-500 shadow-lg shadow-violet-500/25 flex items-center justify-center hover:shadow-violet-500/40 transition-shadow"
          >
            <MessageCircle className="w-5 h-5 text-white" />
            {hasUnread && (
              <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-red-500 rounded-full border-2 border-white dark:border-zinc-900" />
            )}
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 28 }}
            className="fixed bottom-6 right-6 z-50 w-96 max-h-[70vh] flex flex-col bg-black/80 backdrop-blur-xl border border-white/10 rounded-[24px] overflow-hidden shadow-2xl"
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
              <h2 className="text-white font-semibold text-sm tracking-wide">SemesterSync AI</h2>
              <div className="flex items-center gap-1">
                {confirmClear ? (
                  <div className="flex items-center gap-2 mr-2">
                <span className="text-xs text-red-400">Clear all?</span>
                    <button
                      onClick={clearConversation}
                      className="text-xs text-red-400 hover:text-red-300 font-medium px-1.5 py-0.5 rounded bg-red-500/10 hover:bg-red-500/20 transition-colors"
                    >
                      Yes
                    </button>
                    <button
                      onClick={() => setConfirmClear(false)}
                      className="text-xs text-white/50 hover:text-white/70 font-medium px-1.5 py-0.5 rounded bg-white/5 hover:bg-white/10 transition-colors"
                    >
                      No
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmClear(true)}
                    className="w-8 h-8 flex items-center justify-center rounded-lg text-white/40 hover:text-red-400 hover:bg-white/5 transition-colors"
                    title="Clear conversation"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
                <button
                  onClick={() => setIsOpen(false)}
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-white/40 hover:text-white/80 hover:bg-white/5 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 min-h-0">
              {loadingHistory ? (
                <div className="space-y-3 py-4">
                  {[12, 16, 8].map((w, i) => (
                    <div key={i} className="flex gap-3">
                      <div className="w-7 h-7 rounded-lg bg-white/5 animate-pulse flex-shrink-0" />
                      <div className="bg-white/5 rounded-xl p-3 flex-1 space-y-2">
                        <div
                          className="h-3 bg-white/10 rounded animate-pulse"
                          style={{ width: `${w * 5}%` }}
                        />
                        {i < 2 && (
                          <div
                            className="h-3 bg-white/10 rounded animate-pulse"
                            style={{ width: `${w * 3}%` }}
                          />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : messages.length === 0 && !isStreaming ? (
                <div className="flex flex-col items-center justify-center py-8 px-2 gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500/20 to-indigo-500/20 flex items-center justify-center">
                    <MessageCircle className="w-6 h-6 text-violet-400" />
                  </div>
                  <p className="text-white/40 text-sm text-center">Ask me anything about your semester</p>
                  <div className="flex flex-wrap justify-center gap-2">
                    {SUGGESTIONS.map(s => (
                      <button
                        key={s}
                        onClick={() => sendMessage(s)}
                        className="text-xs px-3 py-1.5 rounded-full border border-white/10 text-white/60 hover:text-white hover:bg-white/10 hover:border-white/20 transition-all"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <>
                  {messages.map((msg, idx) => (
                    <div
                      key={msg.id ?? `msg-${idx}`}
                      className={`group flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`relative max-w-[85%] p-3 text-sm leading-relaxed ${
                          msg.role === 'user'
                            ? 'bg-white/10 text-white rounded-xl'
                            : 'bg-white/5 text-white/90 rounded-xl'
                        }`}
                      >
                        {msg.role === 'assistant' ? (
                          <div className="prose prose-invert prose-sm max-w-none [&_p]:m-0 [&_ul]:m-0 [&_ol]:m-0 [&_li]:m-0 [&_pre]:m-0 [&_code]:before:content-none [&_code]:after:content-none [&_code]:bg-white/10 [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded [&_pre]:bg-white/5 [&_pre]:p-3 [&_pre]:rounded-lg [&_a]:text-violet-400 [&_a]:underline">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.text}</ReactMarkdown>
                          </div>
                        ) : (
                          msg.text
                        )}
                        <button
                          onClick={() => msg.id && deleteMessage(msg.id)}
                          className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-black/60 border border-white/10 flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-red-500/30 hover:border-red-500/50 transition-all"
                        >
                          <Trash2 className="w-2.5 h-2.5 text-white/60" />
                        </button>
                      </div>
                    </div>
                  ))}
                  {isStreaming && streamingText && (
                    <div className="flex gap-2 justify-start">
                      <div className="max-w-[85%] p-3 text-sm leading-relaxed bg-white/5 text-white/90 rounded-xl">
                        <div className="prose prose-invert prose-sm max-w-none [&_p]:m-0 [&_ul]:m-0 [&_ol]:m-0 [&_li]:m-0 [&_pre]:m-0 [&_code]:before:content-none [&_code]:after:content-none [&_code]:bg-white/10 [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded [&_pre]:bg-white/5 [&_pre]:p-3 [&_pre]:rounded-lg [&_a]:text-violet-400 [&_a]:underline">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>{streamingText}</ReactMarkdown>
                        </div>
                        <span className="inline-block w-1.5 h-4 bg-violet-400 animate-pulse ml-0.5 align-text-bottom rounded-sm" />
                      </div>
                    </div>
                  )}
                  {isStreaming && !streamingText && (
                    <div className="flex gap-2 justify-start">
                      <div className="bg-white/5 rounded-xl px-4 py-3">
                        <div className="flex gap-1.5">
                          <div className="w-1.5 h-1.5 rounded-full bg-white/30 animate-pulse" />
                          <div className="w-1.5 h-1.5 rounded-full bg-white/30 animate-pulse [animation-delay:150ms]" />
                          <div className="w-1.5 h-1.5 rounded-full bg-white/30 animate-pulse [animation-delay:300ms]" />
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className="px-4 pb-4 pt-2">
              <div className="flex items-end gap-2 bg-white/5 rounded-xl border border-white/10 px-3 py-2 focus-within:border-violet-500/50 transition-colors">
                <textarea
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask about your semester..."
                  disabled={isStreaming}
                  rows={1}
                  className="flex-1 bg-transparent text-sm text-white placeholder-white/30 outline-none resize-none max-h-24 disabled:opacity-50"
                  onInput={e => {
                    const el = e.currentTarget
                    el.style.height = 'auto'
                    el.style.height = `${Math.min(el.scrollHeight, 96)}px`
                  }}
                />
                <button
                  onClick={() => sendMessage()}
                  disabled={(!input.trim() && !isStreaming) || isStreaming}
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed flex-shrink-0"
                >
                  {isStreaming ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
