#!/usr/bin/env node
/**
 * Reset the admin password (or create the admin if it does not exist).
 *
 * Usage:
 *   ADMIN_PASSWORD='S3cure!Pass' node update_admin_password.js
 *
 * Requires MONGO_URI in backend/.env.
 */
const mongoose = require('mongoose')
const bcrypt = require('bcryptjs')
const { requireMongoUri } = require('./src/config/env')
const Student = require('./src/models/Student')

const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || 'admin@campusresolve.edu').toLowerCase()

async function updateAdminPassword () {
  await mongoose.connect(requireMongoUri())
  console.log('✓ Connected to MongoDB')

  if (!process.env.ADMIN_PASSWORD) {
    throw new Error("Set ADMIN_PASSWORD='<new password>' when running this script.")
  }

  const passwordHash = await bcrypt.hash(process.env.ADMIN_PASSWORD, 10)

  let admin = await Student.findOne({ email: ADMIN_EMAIL })
  if (!admin) {
    admin = new Student({
      name: process.env.ADMIN_NAME || 'Admin Officer',
      email: ADMIN_EMAIL,
      role: 'admin',
      department: 'Administration',
      studentId: ''
    })
    console.log(`• Admin ${ADMIN_EMAIL} not found — creating it`)
  }

  admin.role = 'admin'
  admin.passwordHash = passwordHash
  admin.isPasswordSet = true
  admin.isActive = true
  await admin.save()

  console.log(`✓ Admin password updated for ${ADMIN_EMAIL}`)
}

updateAdminPassword()
  .catch((error) => {
    console.error('❌ update_admin_password failed:', error.message)
    process.exitCode = 1
  })
  .finally(() => mongoose.disconnect())
