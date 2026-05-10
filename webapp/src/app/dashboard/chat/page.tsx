'use client'

import { useState, useEffect, useRef } from 'react'
import { motion } from 'motion/react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Send, Loader2, Trash2, RotateCcw, MessageCircle } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { supabaseBrowser } from '@/lib/supabase'
import type { ChatMessage } from '@/lib/types'
import { toast } from 'sonner'

const SUGGESTIONS = [
  'What deadlines do I have this week?',
  'Summarize my syllabus for me',
  'What exams are coming up?',
  'Help me plan my study schedule',
]

export default function ChatPage() {
  const { user } = useAuth()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [streamingText, setStreamingText] = useState('')
  const [loadingHistory, setLoadingHistory] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const loadHistory = async () => {
    if (!user) return
    setLoadingHistory(true)
    try {
      const supabase = supabaseBrowser()
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true })
        .limit(100)
      if (error) throw error
      setMessages((data as ChatMessage[]) || [])
    } catch (e) {
      console.error('Failed to load chat history:', e)
    } finally {
      setLoadingHistory(false)
    }
  }

  useEffect(() => {
    if (!user) return
    loadHistory()
  }, [user])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamingText])
  const sendMessage = async (text?: string) => {
    const messageText = (text || input).trim()
    if (!messageText || isLoading) return

    setInput('')
    setIsLoading(true)
    setStreamingText('')

    const userMessage = {
      id: `local-${Date.now()}`,
      role: 'user' as const,
      text: messageText,
      user_id: user?.id ?? '',
      course_id: null as string | null,
      user_name: null as string | null,
      user_photo: null as string | null,
      created_at: new Date().toISOString(),
    }
    setMessages(prev => [...prev, userMessage])

    try {
      const supabase = supabaseBrowser()
      await supabase.from('chat_messages').insert({
        user_id: user?.id,
        role: 'user',
        text: messageText,
      })
    } catch (e) {
      console.error('Failed to save user message:', e)
    }

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: messageText,
          contextData: {},
          history: messages.slice(-6).map(m => ({
            role: m.role,
            content: m.text,
          })),
        }),
      })

      if (!res.ok) throw new Error('Failed to get response')

      const data = await res.json()
      const answer: string = data.answer || 'Sorry, I couldn\'t generate a response.'

      setStreamingText(answer)

      await new Promise(resolve => setTimeout(resolve, 300))

      const assistantMessage = {
        id: `local-assistant-${Date.now()}`,
        role: 'assistant' as const,
        text: answer,
        user_id: user?.id ?? '',
        course_id: null as string | null,
        user_name: null as string | null,
        user_photo: null as string | null,
        created_at: new Date().toISOString(),
      }
      setMessages(prev => [...prev, assistantMessage])
      setStreamingText('')

      try {
        const supabase = supabaseBrowser()
        await supabase.from('chat_messages').insert({
      user_id: user?.id ?? '',
          role: 'assistant',
          text: answer,
        })
      } catch (e) {
        console.error('Failed to save assistant message:', e)
      }
    } catch (error) {
      console.error('Chat error:', error)
      const errorMessage = {
        id: `local-error-${Date.now()}`,
        role: 'assistant' as const,
        text: 'Sorry, I ran into an error processing that request. Please try again.',
        user_id: user?.id ?? '',
        course_id: null as string | null,
        user_name: null as string | null,
        user_photo: null as string | null,
        created_at: new Date().toISOString(),
      }
      setMessages(prev => [...prev, errorMessage])
      setStreamingText('')
    } finally {
      setIsLoading(false)
      inputRef.current?.focus()
    }
  }

  const clearChat = async () => {
    if (!user) return
    try {
      const supabase = supabaseBrowser()
      const { error } = await supabase
        .from('chat_messages')
        .delete()
        .eq('user_id', user.id)
      if (error) throw error
      setMessages([])
      toast.success('Chat history cleared')
    } catch (e) {
      console.error('Failed to clear chat:', e)
      toast.error('Failed to clear chat history')
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    sendMessage()
  }

  const displayMessages = [...messages]
  if (streamingText) {
    displayMessages.push({
      id: `streaming`,
      role: 'assistant',
      text: streamingText,
      user_id: '',
      course_id: null,
      user_name: null,
      user_photo: null,
      created_at: new Date().toISOString(),
    })
  }

  return (
    <div className="flex flex-col min-h-[calc(100vh-8rem)]">
      {/* Header */}
      <div className="flex items-center justify-between px-8 py-4 border-b border-white/10 bg-white/[0.02] backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{
              background: 'linear-gradient(to top right, var(--theme-brand-from), var(--theme-brand-to))',
              boxShadow: '0 8px 12px -3px var(--theme-accent-glow)',
            }}
          >
            <MessageCircle size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-white">AI Study Assistant</h1>
            <p className="text-xs text-white/40">Ask about your courses, deadlines, and syllabi</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={loadHistory}
            className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 text-white/60 hover:text-white rounded-xl border border-white/10 transition-all text-sm"
          >
            <RotateCcw size={14} />
            Reload
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={clearChat}
            className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-red-500/10 text-white/60 hover:text-red-400 rounded-xl border border-white/10 hover:border-red-500/20 transition-all text-sm"
          >
            <Trash2 size={14} />
            Clear
          </motion.button>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-8 py-6">
        <div className="max-w-3xl mx-auto space-y-4">
          {loadingHistory ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-6 h-6 text-white/30 animate-spin" />
            </div>
          ) : displayMessages.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center justify-center py-20 text-center"
            >
              <div
                className="w-20 h-20 rounded-2xl flex items-center justify-center mb-6"
                style={{
                  background: 'linear-gradient(to top right, var(--theme-brand-from), var(--theme-brand-to))',
                  boxShadow: '0 12px 20px -4px var(--theme-accent-glow)',
                }}
              >
                <MessageCircle size={36} className="text-white" />
              </div>
              <h2 className="text-2xl font-display font-semibold text-white mb-2">Start a Conversation</h2>
              <p className="text-white/40 mb-8 max-w-md">
                Start a conversation with your AI study assistant. Ask about deadlines, course details, or study tips.
              </p>
              <div className="flex flex-wrap gap-3 justify-center">
                {SUGGESTIONS.map((suggestion) => (
                  <motion.button
                    key={suggestion}
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => sendMessage(suggestion)}
                    className="px-4 py-2.5 bg-white/5 hover:bg-white/10 text-white/60 hover:text-white rounded-xl border border-white/10 hover:border-white/20 transition-all text-sm"
                  >
                    {suggestion}
                  </motion.button>
                ))}
              </div>
            </motion.div>
          ) : (
            <>
              {displayMessages.map((msg, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl px-5 py-3.5 ${
                      msg.role === 'user'
                        ? 'bg-white/10 backdrop-blur-xl border border-white/10 text-white'
                        : 'bg-white/[0.04] backdrop-blur-xl border border-white/[0.06] text-white/80'
                    }`}
                  >
                    {msg.role === 'assistant' ? (
                      <div className="prose prose-invert prose-sm max-w-none prose-p:leading-relaxed prose-headings:text-white/90 prose-strong:text-white/90 prose-code:text-white/70 prose-code:bg-white/10 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-xs prose-code:before:content-[''] prose-code:after:content-[''] prose-pre:bg-white/5 prose-pre:border prose-pre:border-white/10">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {msg.text}
                        </ReactMarkdown>
                      </div>
                    ) : (
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                    )}
                    {msg.created_at && (
                      <p className="text-[10px] text-white/20 mt-2">
                        {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    )}
                  </div>
                </motion.div>
              ))}
              {isLoading && !streamingText && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex justify-start"
                >
                  <div className="bg-white/[0.04] backdrop-blur-xl border border-white/[0.06] rounded-2xl px-5 py-4">
                    <div className="flex gap-1.5">
                      <div className="w-2 h-2 rounded-full bg-white/30 animate-bounce" />
                      <div className="w-2 h-2 rounded-full bg-white/30 animate-bounce" style={{ animationDelay: '0.15s' }} />
                      <div className="w-2 h-2 rounded-full bg-white/30 animate-bounce" style={{ animationDelay: '0.3s' }} />
                    </div>
                  </div>
                </motion.div>
              )}
            </>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Suggestion pills when messages exist but few */}
      {displayMessages.length > 0 && displayMessages.length <= 2 && !isLoading && (
        <div className="px-8 pb-2">
          <div className="max-w-3xl mx-auto flex flex-wrap gap-2">
            {SUGGESTIONS.slice(0, 2).map((suggestion) => (
              <motion.button
                key={suggestion}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => sendMessage(suggestion)}
                className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-white/40 hover:text-white/70 rounded-lg border border-white/5 hover:border-white/10 transition-all text-xs"
              >
                {suggestion}
              </motion.button>
            ))}
          </div>
        </div>
      )}

      {/* Input Area */}
      <div className="px-8 py-4 border-t border-white/10 bg-white/[0.02] backdrop-blur-sm">
        <form onSubmit={handleSubmit} className="max-w-3xl mx-auto flex gap-3">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about your courses, deadlines, or study tips..."
            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-5 py-3.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-white/20 focus:bg-white/[0.08] transition-all"
            disabled={isLoading}
          />
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            type="submit"
            disabled={!input.trim() || isLoading}
            className="w-12 h-12 rounded-xl flex items-center justify-center transition-all disabled:opacity-30 disabled:cursor-not-allowed flex-shrink-0"
            style={{
              background: !input.trim() || isLoading
                ? 'rgba(255,255,255,0.05)'
                : 'linear-gradient(to top right, var(--theme-brand-from), var(--theme-brand-to))',
              boxShadow: !input.trim() || isLoading ? 'none' : '0 8px 12px -3px var(--theme-accent-glow)',
            }}
          >
            {isLoading ? (
              <Loader2 size={18} className="text-white animate-spin" />
            ) : (
              <Send size={18} className="text-white ml-0.5" />
            )}
          </motion.button>
        </form>
      </div>
    </div>
  )
}
