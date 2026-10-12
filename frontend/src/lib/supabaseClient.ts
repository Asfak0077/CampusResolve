import { createClient, type SupabaseClient } from '@supabase/supabase-js'

/**
 * Supabase is OPTIONAL in CampusResolve: the backend Express API issues and
 * verifies the app's own JWT, and Supabase is only used to mirror Google OAuth
 * / password-recovery sessions when it has been configured.
 *
 * ⚠️ `createClient()` throws `supabaseKey is required.` when the key is empty.
 * Because this module is imported by App.tsx and authService at startup, doing
 * that at module scope used to blow up the entire bundle and render a blank
 * page whenever VITE_SUPABASE_* were unset. We therefore fall back to an inert
 * stub that satisfies the `supabase.auth.*` surface the app actually uses.
 */

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined
const supabaseAnonKey =
  (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined) ||
  (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) ||
  ''

const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey)

const notConfigured = (operation: string) => ({
  name: 'SupabaseNotConfiguredError',
  message:
    `Supabase is not configured, so "${operation}" is disabled. ` +
    'CampusResolve authentication runs through the backend API instead. ' +
    'Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY to enable it.'
})

/**
 * Minimal, safe stand-in for SupabaseClient.
 * Every call resolves to the same inert result the real client returns when
 * there is no session, so callers (login fallbacks, guards, password recovery)
 * keep working without a Supabase project.
 */
const createStubClient = (): SupabaseClient => {
  const stub = {
    auth: {
      getSession: async () => ({ data: { session: null }, error: null }),
      getUser: async () => ({ data: { user: null }, error: notConfigured('getUser') }),
      setSession: async () => ({ data: { user: null, session: null }, error: notConfigured('setSession') }),
      updateUser: async () => ({ data: { user: null }, error: notConfigured('updateUser') }),
      signInWithPassword: async () => ({
        data: { user: null, session: null },
        error: notConfigured('signInWithPassword')
      }),
      signInWithOAuth: async () => ({
        data: { provider: 'google', url: null },
        error: notConfigured('signInWithOAuth')
      }),
      resetPasswordForEmail: async () => ({ data: {}, error: notConfigured('resetPasswordForEmail') }),
      signOut: async () => ({ error: null }),
      // Listeners are accepted but never fired: there is no Supabase session to report.
      onAuthStateChange: () => ({
        data: {
          subscription: {
            id: 'supabase-disabled',
            callback: () => undefined,
            unsubscribe: () => undefined
          }
        }
      })
    }
  }

  return stub as unknown as SupabaseClient
}

/**
 * Custom fetch for Supabase — only handles telemetry, not auth.
 * Auth requests are passed through to allow Google OAuth via Supabase to work.
 * The backend API remains the source of truth for our own JWT, but we must
 * not block Supabase OAuth (signInWithOAuth / signInWithPassword) or the
 * login will always receive a fake 400.
 */
const supabaseFetch: typeof fetch = async (input, init) => {
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
    if (!isSupabaseConfigured) {
      console.warn(
        '⚠️ Supabase credentials missing (VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY). ' +
        'Running without Supabase — backend API authentication only.'
      )
      globalForSupabase.__campusresolve_supabase_instance__ = createStubClient()
    } else {
      globalForSupabase.__campusresolve_supabase_instance__ = createClient(supabaseUrl as string, supabaseAnonKey, {
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
          flowType: 'pkce' as any
        },
        global: {
          fetch: supabaseFetch
        }
      })
    }
  }
  return globalForSupabase.__campusresolve_supabase_instance__
}

export const supabase = getSupabaseClient()

export const isSupabaseEnabled = isSupabaseConfigured
