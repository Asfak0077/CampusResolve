#!/usr/bin/env node
/**
 * Re-align demo accounts with the documented demo passwords.
 *
 * ⚠️  Destructive: this resets passwords for the accounts listed in
 * DEMO_ACCOUNT_EMAILS. Run with --yes to confirm.
 *
 * Usage:
 *   node sync_demo_accounts.js --yes
 *   DEMO_ACCOUNT_EMAILS="a@x.edu,b@x.edu" DEMO_PASSWORD='demo@123' node sync_demo_accounts.js --yes
 *
 * Requires MONGO_URI in backend/.env.
 */
const mongoose = require('mongoose')
const bcrypt = require('bcryptjs')
const { requireMongoUri, confirmDestructive, isProduction } = require('./src/config/env')

const DEFAULT_DEMO_EMAILS = [
  'student@campusresolve.edu',
  'admin@campusresolve.edu'
]

const demoEmails = (process.env.DEMO_ACCOUNT_EMAILS || DEFAULT_DEMO_EMAILS.join(','))
  .split(',')
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean)

const demoPassword = process.env.DEMO_PASSWORD || 'password123'
const teacherPassword = process.env.TEACHER_DEFAULT_PASSWORD || 'teach123'

async function syncDemoPasswords () {
  confirmDestructive('reset passwords for demo student/admin/teacher accounts')

  if (isProduction() && String(process.env.ALLOW_DEMO_PASSWORDS || '').toLowerCase() !== 'true') {
    console.error('\n🛑 Refusing to install known demo passwords on a production deployment.')
    console.error('   Set ALLOW_DEMO_PASSWORDS=true only on a throwaway demo instance.\n')
    process.exit(1)
  }

  await mongoose.connect(requireMongoUri())
  const db = mongoose.connection.db

  const studentHash = await bcrypt.hash(demoPassword, 10)
  const studentResult = await db.collection('students').updateMany(
    { email: { $in: demoEmails } },
    { $set: { passwordHash: studentHash, isPasswordSet: true, isActive: true } }
  )
  console.log(`✓ Updated ${studentResult.modifiedCount ?? studentResult.matchedCount} student/admin account(s)`)

  const teacherHash = await bcrypt.hash(teacherPassword, 10)
  const teacherResult = await db.collection('teachers').updateMany(
    {},
    { $set: { passwordHash: teacherHash, isActive: true } }
  )
  console.log(`✓ Updated ${teacherResult.modifiedCount ?? teacherResult.matchedCount} teacher account(s)`)

  console.log(`\nAccounts now using the demo password: ${demoEmails.join(', ')}`)
  console.log('Change these before exposing the deployment to real users.')
}

syncDemoPasswords()
  .catch((error) => {
    console.error('❌ sync_demo_accounts failed:', error.message)
    process.exitCode = 1
  })
  .finally(() => mongoose.disconnect())
