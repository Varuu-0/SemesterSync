'use client'

import { useState, useRef, useEffect } from 'react'
import { MessageSquare, X, Send, Bot, User, Sparkles } from 'lucide-react'
import { useAppContext } from '@/context/AppContext'

export function Chatbot() {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant', content: string }[]>([
    { role: 'assistant', content: 'Hi! I am your AI Academic Assistant. Ask me anything about your uploaded syllabus, rubrics, or deadlines!' }
  ])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  
  const { courses, events, materials } = useAppContext()
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return

    const userMessage = input.trim()
    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: userMessage }])
    setIsLoading(true)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: userMessage,
          contextData: { courses, events, materials },
          history: messages.slice(-4) // Send last 4 messages for context
        })
      })
      const data = await res.json()
      
      if (data.answer) {
        setMessages(prev => [...prev, { role: 'assistant', content: data.answer }])
      } else {
        throw new Error(data.error || 'Unknown error')
      }
    } catch (error) {
      console.error('Chat error:', error)
      setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, I ran into an error processing that request.' }])
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      {/* Floating Action Button */}
      <button
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-8 right-8 w-14 h-14 rounded-sm flex items-center justify-center transition-all duration-300 z-50 bg-black dark:bg-white shadow-md ${
          isOpen ? 'scale-0 opacity-0' : 'scale-100 opacity-100 hover:scale-105'
        }`}
      >
        <Sparkles className="w-5 h-5 text-white dark:text-black" />
      </button>

      {/* Chat Window */}
      <div
        className={`fixed bottom-8 right-8 w-80 sm:w-96 sleek-panel flex flex-col overflow-hidden transition-all duration-300 origin-bottom-right z-50 ${
          isOpen ? 'scale-100 opacity-100' : 'scale-0 opacity-0 pointer-events-none'
        }`}
        style={{ height: '550px', maxHeight: 'calc(100vh - 64px)' }}
      >
        {/* Header */}
        <div className="bg-slate-50 dark:bg-[#18181b] text-slate-900 dark:text-white p-4 flex items-center justify-between border-b border-slate-200 dark:border-white/10 z-10">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-sm bg-black dark:bg-white flex items-center justify-center">
              <Bot className="w-4 h-4 text-white dark:text-black" />
            </div>
            <span className="font-bold tracking-wide">AI Assistant</span>
          </div>
          <button onClick={() => setIsOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-sm hover:bg-slate-200 dark:hover:bg-white/10 transition-colors">
            <X className="w-4 h-4 text-slate-500 dark:text-slate-400" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-transparent">
          {messages.map((msg, idx) => (
            <div key={idx} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {msg.role === 'assistant' && (
                <div className="w-8 h-8 rounded-sm bg-slate-100 dark:bg-[#18181b] border border-slate-200 dark:border-white/10 flex flex-shrink-0 items-center justify-center">
                  <Bot className="w-4 h-4 text-slate-700 dark:text-slate-300" />
                </div>
              )}
              <div
                className={`max-w-[80%] p-3 rounded-sm text-sm leading-relaxed shadow-sm ${
                  msg.role === 'user'
                    ? 'bg-black dark:bg-white text-white dark:text-black'
                    : 'sleek-card text-slate-800 dark:text-slate-200'
                }`}
              >
                {msg.content}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-sm bg-slate-100 dark:bg-[#18181b] border border-slate-200 dark:border-white/10 flex flex-shrink-0 items-center justify-center">
                <Bot className="w-4 h-4 text-slate-700 dark:text-slate-300" />
              </div>
              <div className="sleek-card p-3 rounded-sm">
                <div className="flex gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-sm bg-slate-400 animate-pulse" />
                  <div className="w-1.5 h-1.5 rounded-sm bg-slate-400 animate-pulse" style={{ animationDelay: '0.15s' }} />
                  <div className="w-1.5 h-1.5 rounded-sm bg-slate-400 animate-pulse" style={{ animationDelay: '0.3s' }} />
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <form onSubmit={sendMessage} className="p-3 bg-slate-50 dark:bg-[#18181b] border-t border-slate-200 dark:border-white/10 flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 bg-white dark:bg-[#0a0a0a] border border-slate-200 dark:border-white/10 rounded-sm px-4 py-2 text-sm focus:ring-1 focus:ring-slate-400 dark:focus:ring-white/30 outline-none text-slate-800 dark:text-slate-200 placeholder-slate-400"
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="w-10 h-10 rounded-sm bg-black dark:bg-white text-white dark:text-black flex items-center justify-center hover:bg-slate-800 dark:hover:bg-slate-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
          >
            <Send className="w-4 h-4 ml-0.5" />
          </button>
        </form>
      </div>
    </>
  )
}
