import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://kxfdrixsoujxnsysslzq.supabase.co'
const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  ''

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('⚠️ WARNING: Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY in environment configuration.')
}

/**
 * Custom fetch for Supabase — only handles telemetry, not auth.
 * Auth requests are passed through to allow Google OAuth via Supabase to work.
 * The backend API remains the source of truth for our own JWT, but we must
 * not block Supabase OAuth (signInWithOAuth / signInWithPassword) or the
 * login will always receive a fake 400.
 */
const supabaseFetch: typeof fetch = async (input, init) => {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.href : (input as Request).url
  // Only intercept Google telemetry, not Supabase Auth — let Supabase Auth pass through
  // so Google OAuth can complete and App.tsx can verify via /auth/verify-google-user.
  return globalThis.fetch(input, init)
}

/**
 * Global singleton reference to prevent duplicate GoTrueClient / SupabaseClient
 * instantiations during Vite HMR or multiple module evaluation passes.
 */
const globalForSupabase = globalThis as unknown as {
  __campusresolve_supabase_instance__?: SupabaseClient
}

const getSupabaseClient = (): SupabaseClient => {
  if (!globalForSupabase.__campusresolve_supabase_instance__) {
    globalForSupabase.__campusresolve_supabase_instance__ = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        // Must be true for Supabase Google OAuth to work:
        // - persistSession keeps the session after redirect
        // - detectSessionInUrl parses the #access_token in the OAuth callback URL
        // - autoRefreshToken keeps the session alive
        // Backend JWT remains the source of truth for our own APIs, but Supabase
        // session is required to complete the OAuth handshake and be verified via /auth/verify-google-user.
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storageKey: 'sdcfrs-supabase-auth',
        flowType: 'pkce' as any,
      },
      global: {
        fetch: supabaseFetch
      }
    })
  }
  return globalForSupabase.__campusresolve_supabase_instance__
}

export const supabase = getSupabaseClient()
