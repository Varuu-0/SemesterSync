'use client'

import { supabaseBrowser } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import type { User } from '@supabase/supabase-js'

export function useAuth() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let supabase: ReturnType<typeof supabaseBrowser> | null = null
    try {
      supabase = supabaseBrowser()
    } catch {
      setLoading(false)
      return
    }

    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  const signInWithGoogle = async () => {
    const supabase = supabaseBrowser()
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`
      }
    })
  }

  const signOut = async () => {
    const supabase = supabaseBrowser()
    await supabase.auth.signOut()
    router.push('/')
  }

  const connectGoogleCalendar = async (redirectPath = '/dashboard') => {
    const supabase = supabaseBrowser()
    const next = encodeURIComponent(redirectPath)
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        scopes: 'openid email profile https://www.googleapis.com/auth/calendar',
        queryParams: { access_type: 'offline', prompt: 'consent' },
        redirectTo: `${window.location.origin}/auth/callback?next=${next}`,
      },
    })
  }

  return { user, loading, signInWithGoogle, signOut, connectGoogleCalendar }
}
