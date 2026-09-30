#!/usr/bin/env node
/**
 * Seed one teacher account per department.
 *
 * Usage:
 *   node create_teachers.js
 *   TEACHER_DEFAULT_PASSWORD='Campus@2026' node create_teachers.js
 *
 * Requires MONGO_URI in backend/.env. Passwords come from the environment —
 * never hardcode credentials in this file.
 */
const mongoose = require('mongoose')
const bcrypt = require('bcryptjs')
const { requireMongoUri } = require('./src/config/env')
const Teacher = require('./src/models/Teacher')

const DEFAULT_TEACHER_PASSWORD = process.env.TEACHER_DEFAULT_PASSWORD || 'teach123'

const departments = [
  { dept: 'CSE', teacherId: 'TCH-CSE-001', name: 'Dr. Rajesh Kumar', email: 'cse.teacher@campusresolve.edu' },
  { dept: 'ECE', teacherId: 'TCH-ECE-001', name: 'Dr. Priya Sharma', email: 'ece.teacher@campusresolve.edu' },
  { dept: 'MECH', teacherId: 'TCH-MECH-001', name: 'Dr. Arun Patel', email: 'mech.teacher@campusresolve.edu' },
  { dept: 'EEE', teacherId: 'TCH-EEE-001', name: 'Dr. Meena Iyer', email: 'eee.teacher@campusresolve.edu' },
  { dept: 'AIDS', teacherId: 'TCH-AIDS-001', name: 'Dr. Karthik Reddy', email: 'aids.teacher@campusresolve.edu' },
  { dept: 'IT', teacherId: 'TCH-IT-001', name: 'Dr. Lakshmi Nair', email: 'it.teacher@campusresolve.edu' }
]

async function createTeachers () {
  await mongoose.connect(requireMongoUri())
  console.log('✓ Connected to MongoDB')

  const passwordHash = await bcrypt.hash(DEFAULT_TEACHER_PASSWORD, 10)

  for (const { dept, teacherId, name, email } of departments) {
    const existing = await Teacher.findOne({ $or: [{ teacherId }, { email }] })

    if (existing) {
      // Never overwrite an existing account's password — only fill in metadata.
      existing.name = existing.name || name
      existing.department = existing.department || dept
      existing.teacherId = existing.teacherId || teacherId
      existing.isActive = true
      existing.role = 'teacher'
      await existing.save()
      console.log(`• Kept existing ${dept} teacher (${teacherId})`)
      continue
    }

    await Teacher.create({
      teacherId,
      name,
      email,
      department: dept,
      designation: 'Professor',
      passwordHash,
      activeComplaints: 0,
      resolvedComplaints: 0,
      isActive: true,
      role: 'teacher'
    })
    console.log(`✓ Created ${dept} teacher: ${name} (${teacherId})`)
  }

  if (!process.env.TEACHER_DEFAULT_PASSWORD) {
    console.warn(`\n⚠️  Newly created teachers use the default password "teach123".`)
    console.warn('   Set TEACHER_DEFAULT_PASSWORD=... for anything beyond a local demo.\n')
  }
}

createTeachers()
  .catch((error) => {
    console.error('❌ create_teachers failed:', error.message)
    process.exitCode = 1
  })
  .finally(() => mongoose.disconnect())
