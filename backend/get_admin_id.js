#!/usr/bin/env node
/**
 * Print the MongoDB _id of the admin account (useful for seeding Supabase rows
 * or debugging notification ownership).
 *
 * Usage:
 *   node get_admin_id.js
 *   ADMIN_EMAIL=someone@college.edu node get_admin_id.js
 *
 * Requires MONGO_URI in backend/.env.
 */
const mongoose = require('mongoose')
const { requireMongoUri } = require('./src/config/env')
const Student = require('./src/models/Student')

const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || 'admin@campusresolve.edu').toLowerCase()

async function getAdminId () {
  await mongoose.connect(requireMongoUri())
  console.log('✓ Connected to MongoDB')

  const admin = await Student.findOne({ email: ADMIN_EMAIL })
  if (!admin) {
    console.log(`• No account found for ${ADMIN_EMAIL}`)
    return
  }

  console.log('Admin account found:')
  console.log('  _id   :', admin._id.toString())
  console.log('  name  :', admin.name)
  console.log('  email :', admin.email)
  console.log('  role  :', admin.role)
}

getAdminId()
  .catch((error) => {
    console.error('❌ get_admin_id failed:', error.message)
    process.exitCode = 1
  })
  .finally(() => mongoose.disconnect())
