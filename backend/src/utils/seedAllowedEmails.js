const AllowedEmail = require('../models/AllowedEmail')

/**
 * Email addresses that may sign in with Google.
 *
 * Values come from the ALLOWED_EMAILS environment variable (comma separated)
 * plus the built-in demo accounts. Personal addresses must NOT be committed to
 * this public repository — add them to backend/.env instead.
 *
 * Example:
 *   ALLOWED_EMAILS=me@college.edu,hod.cse@college.edu
 */
const DEMO_EMAILS = [
  'student@campusresolve.edu',
  'admin@campusresolve.edu'
]

const getAllowedEmails = () => {
  const fromEnv = (process.env.ALLOWED_EMAILS || '')
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean)

  const allowDemoAccounts = String(process.env.ALLOW_DEMO_LOGINS || 'true').toLowerCase() !== 'false'

  return [...new Set([...(allowDemoAccounts ? DEMO_EMAILS : []), ...fromEnv])]
}

const seedAllowedEmails = async () => {
  if (require('mongoose').connection.readyState !== 1) return

  const emails = getAllowedEmails()
  if (!emails.length) return

  console.log('--- Seeding Allowed Emails ---')

  for (const email of emails) {
    const normalized = email.toLowerCase()
    const exists = await AllowedEmail.findOne({ email: normalized })
    if (!exists) {
      await AllowedEmail.create({ email: normalized })
      console.log(`[+] Added ${normalized} to allowlist`)
    } else {
      console.log(`[=] ${normalized} already exists`)
    }
  }

  console.log('--- Allowed Emails Seeded ---\n')
}

module.exports = { seedAllowedEmails, getAllowedEmails, getAllowlist: getAllowedEmails }
