#!/usr/bin/env node
/**
 * Quick inspection of the students collection (first 5 records by default).
 *
 * Usage:
 *   node list_students.js
 *   LIMIT=25 node list_students.js
 *
 * Requires MONGO_URI in backend/.env.
 */
const mongoose = require('mongoose')
const { requireMongoUri } = require('./src/config/env')
const Student = require('./src/models/Student')

const limit = Number(process.env.LIMIT || 5)

async function listStudents () {
  await mongoose.connect(requireMongoUri())
  console.log('✓ Connected to MongoDB')

  const students = await Student.find({}, 'name email studentId department role').limit(limit)
  console.log(JSON.stringify(students, null, 2))
}

listStudents()
  .catch((error) => {
    console.error('❌ list_students failed:', error.message)
    process.exitCode = 1
  })
  .finally(() => mongoose.disconnect())
