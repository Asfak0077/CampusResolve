const { createClient } = require('@supabase/supabase-js')

/**
 * Supabase client (service role) used for notifications and optional auth checks.
 *
 * Supabase is OPTIONAL for the core app: complaints, feedback, auth and the AI
 * assistant all work without it. Earlier this module called `createClient('')`
 * when the env vars were absent, which threw at require() time and crashed the
 * whole server on boot — a fresh clone could not start at all. It now degrades
 * to `null` and every consumer checks for that.
 */

const supabaseUrl = process.env.SUPABASE_URL || ''
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

const isPlaceholder = (value) => !value || value.includes('your_')

let supabase = null

if (isPlaceholder(supabaseUrl) || isPlaceholder(supabaseServiceKey)) {
  console.warn(
    '⚠️  Supabase disabled: SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are missing or placeholders. ' +
    'Notification mirroring is skipped; the rest of the API works normally.'
  )
} else {
  try {
    supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false, autoRefreshToken: false }
    })
  } catch (error) {
    console.warn(`⚠️  Supabase client could not be initialised (${error.message}). Continuing without it.`)
    supabase = null
  }
}

module.exports = { supabase }
