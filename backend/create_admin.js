#!/usr/bin/env node
/**
 * Create (or update) the CampusResolve admin account.
 *
 * Usage:
 *   node create_admin.js
 *   ADMIN_EMAIL=you@college.edu ADMIN_PASSWORD='S3cure!Pass' node create_admin.js
 *
 * Requires MONGO_URI in backend/.env — never hardcode connection strings here.
 * Never commit real credentials; this repository is public.
 */
const mongoose = require('mongoose')
const bcrypt = require('bcryptjs')
const { requireMongoUri } = require('./src/config/env')
const Student = require('./src/models/Student')

const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || 'admin@campusresolve.edu').toLowerCase()
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'password123'
const ADMIN_NAME = process.env.ADMIN_NAME || 'Admin Officer'

async function createAdmin () {
  await mongoose.connect(requireMongoUri())
  console.log('✓ Connected to MongoDB')

  const existing = await Student.findOne({ email: ADMIN_EMAIL })
  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 10)

  if (existing) {
    existing.role = 'admin'
    existing.isActive = true
    existing.passwordHash = passwordHash
    existing.isPasswordSet = true
    await existing.save()
    console.log(`✓ Updated existing admin: ${ADMIN_EMAIL}`)
  } else {
    await Student.create({
      name: ADMIN_NAME,
      email: ADMIN_EMAIL,
      role: 'admin',
      department: 'Administration',
      passwordHash,
      isPasswordSet: true,
      isActive: true
    })
    console.log(`✓ Created admin: ${ADMIN_EMAIL}`)
  }

  if (!process.env.ADMIN_PASSWORD) {
    console.warn('\n⚠️  Used the default demo password. Set ADMIN_PASSWORD=... to choose your own,')
    console.warn('   and change it from the app before exposing this instance to the internet.')
  }
}

createAdmin()
  .catch((error) => {
    console.error('❌ create_admin failed:', error.message)
    process.exitCode = 1
  })
  .finally(() => mongoose.disconnect())
