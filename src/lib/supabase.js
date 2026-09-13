import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

function isValidSupabaseUrl(url) {
  try {
    const parsedUrl = new URL(url)
    return parsedUrl.protocol === 'https:' || parsedUrl.protocol === 'http:'
  } catch {
    return false
  }
}

export const isSupabaseConfigured = Boolean(
  supabaseUrl
    && supabaseAnonKey
    && isValidSupabaseUrl(supabaseUrl)
    && supabaseUrl !== 'your_supabase_project_url'
    && supabaseAnonKey !== 'your_supabase_anon_key',
)

if (import.meta.env.DEV && !isSupabaseConfigured) {
  console.error(
    'Supabase Storage is missing required Vite environment variables: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY. Add them to .env.local before enabling Supabase-backed uploads.',
  )
}

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null
