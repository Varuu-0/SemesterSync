'use client'

import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

let _client: SupabaseClient | undefined

export function supabaseBrowser(): SupabaseClient {
  if (_client) return _client
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error(
      'Supabase config missing. Copy .env.local.example to .env.local and fill in NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.'
    )
  }
  _client = createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  return _client
}

export function createClient() {
  return supabaseBrowser()
}

export const STORAGE_BUCKET = 'syllabi'
