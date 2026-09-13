// SERVER ONLY. Uses the Supabase service role key and must never be imported by client code.
import { createClient } from '@supabase/supabase-js'

let cachedClient = null

export function getSupabaseAdmin() {
  if (cachedClient) return cachedClient

  const supabaseUrl = process.env.SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    const error = new Error('Supabase server credentials are not configured.')
    error.status = 500
    error.code = 'server/supabase-not-configured'
    throw error
  }

  cachedClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })

  return cachedClient
}
