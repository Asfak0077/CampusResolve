/**
 * Environment helpers shared by the backend and the one-off maintenance scripts.
 *
 * Scripts must never carry hardcoded connection strings or credentials — this
 * repository is public, and a committed Atlas URI is a compromised Atlas URI.
 */

const path = require('path')

// Load .env from backend/, then the repository root (first value wins).
require('dotenv').config({ path: path.join(__dirname, '../../.env') })
require('dotenv').config({ path: path.join(__dirname, '../../../.env') })

const requireEnv = (name, hint = '') => {
  const value = process.env[name]
  if (!value || !String(value).trim()) {
    const suffix = hint ? `\n   👉 ${hint}` : ''
    throw new Error(`Missing required environment variable: ${name}${suffix}`)
  }
  return String(value).trim()
}

const requireMongoUri = () => {
  const uri = requireEnv(
    'MONGO_URI',
    'Copy backend/.env.example to backend/.env and set MONGO_URI=mongodb+srv://<user>:<pass>@<cluster>/<db>'
  )
  if (/:([^:@/]+)@/.test(uri) && /(asfak|password|changeme)/i.test(uri.match(/:([^:@/]+)@/)[1])) {
    console.warn('⚠️  MONGO_URI looks like it still contains a placeholder/test credential — double-check backend/.env.')
  }
  return uri
}

const isProduction = () =>
  process.env.NODE_ENV === 'production' || Boolean(process.env.VERCEL_ENV) || Boolean(process.env.VERCEL)

/**
 * Guards destructive maintenance scripts (data wipes, bulk password resets).
 * Usage: `node scripts/foo.js --yes`  (or CONFIRM_DESTRUCTIVE=yes)
 */
const confirmDestructive = (action) => {
  const confirmed =
    process.argv.includes('--yes') ||
    process.argv.includes('-y') ||
    String(process.env.CONFIRM_DESTRUCTIVE || '').toLowerCase() === 'yes'

  if (confirmed) return true

  console.error(`\n🛑 Refusing to run: ${action}\n`)
  console.error('   This operation modifies or deletes data in the database named by MONGO_URI.')
  console.error('   Re-run with --yes (or CONFIRM_DESTRUCTIVE=yes) if you are sure.\n')
  process.exit(1)
}

module.exports = { requireEnv, requireMongoUri, isProduction, confirmDestructive }
