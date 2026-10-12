const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.SUPABASE_URL || ''
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

const hasPlaceholder =
  !supabaseUrl ||
  !supabaseServiceKey ||
  supabaseUrl.includes('your_') ||
  supabaseServiceKey.includes('your_')

// Supabase is optional: it only powers the realtime notification mirror.
// Every consumer already null-checks `supabase`, so degrade gracefully instead
// of crashing the whole API when credentials are missing.
let supabase = null

if (hasPlaceholder) {
  console.warn('⚠️ WARNING: Missing or placeholder Supabase credentials in .env (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)')
  console.warn('⚠️ Continuing without Supabase — realtime notification mirroring is disabled.')
} else {
  try {
    supabase = createClient(supabaseUrl, supabaseServiceKey)
  } catch (error) {
    console.error('❌ Failed to initialise Supabase client:', error.message)
    supabase = null
  }
}

module.exports = { supabase, isSupabaseEnabled: Boolean(supabase) }
