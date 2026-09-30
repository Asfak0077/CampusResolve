const bcrypt = require('bcryptjs')
const Student = require('../models/Student')
const Teacher = require('../models/Teacher')
const { isProduction } = require('../config/env')

/**
 * Demo data seeding.
 *
 * Two rules learned the hard way:
 *  1. Never overwrite the password of an account that already exists — seeding
 *     must not silently reset a real user's credentials on every server boot.
 *  2. Never seed demo accounts on a production deployment unless it is an
 *     intentional demo instance (SEED_DEMO_DATA=true).
 */

const departments = [
  { dept: 'CSE', teacherId: 'TCH-CSE-001', name: 'Dr. Rajesh Kumar', email: 'cse.teacher@campusresolve.edu' },
  { dept: 'ECE', teacherId: 'TCH-ECE-001', name: 'Dr. Priya Sharma', email: 'ece.teacher@campusresolve.edu' },
  { dept: 'MECH', teacherId: 'TCH-MECH-001', name: 'Dr. Arun Patel', email: 'mech.teacher@campusresolve.edu' },
  { dept: 'EEE', teacherId: 'TCH-EEE-001', name: 'Dr. Meena Iyer', email: 'eee.teacher@campusresolve.edu' },
  { dept: 'AIDS', teacherId: 'TCH-AIDS-001', name: 'Dr. Karthik Reddy', email: 'aids.teacher@campusresolve.edu' },
  { dept: 'IT', teacherId: 'TCH-IT-001', name: 'Dr. Lakshmi Nair', email: 'it.teacher@campusresolve.edu' }
]

const shouldSeed = () => {
  const flag = (process.env.SEED_DEMO_DATA || '').toLowerCase()
  if (flag === 'true') return true
  if (flag === 'false') return false
  return !isProduction()
}

const seedDemoData = async () => {
  if (require('mongoose').connection.readyState !== 1) return

  if (!shouldSeed()) {
    console.log('ℹ️  Demo seeding skipped (production). Set SEED_DEMO_DATA=true for a demo instance.')
    return
  }

  const studentHash = await bcrypt.hash(process.env.DEMO_PASSWORD || 'password123', 10)
  const adminHash = await bcrypt.hash(process.env.DEMO_ADMIN_PASSWORD || 'password123', 10)
  const teacherHash = await bcrypt.hash(process.env.TEACHER_DEFAULT_PASSWORD || 'teach123', 10)

  // ── Demo student ────────────────────────────────────────────────────────────
  let student = await Student.findOne({ email: 'student@campusresolve.edu' })
  if (!student) {
    await Student.create({
      name: 'Student User',
      email: 'student@campusresolve.edu',
      passwordHash: studentHash,
      department: 'CSE',
      studentId: 'CR21CS001',
      role: 'student',
      isActive: true,
      isPasswordSet: true
    })
    console.log('✓ Created demo student (student@campusresolve.edu)')
  } else if (!student.passwordHash) {
    student.passwordHash = studentHash
    student.isPasswordSet = true
    await student.save()
    console.log('✓ Demo student had no password — initialised it')
  } else {
    console.log('• Demo student already exists — password left untouched')
  }

  // ── Admin ───────────────────────────────────────────────────────────────────
  let admin = await Student.findOne({ email: 'admin@campusresolve.edu' })
  if (!admin) {
    await Student.create({
      name: 'Admin Officer',
      email: 'admin@campusresolve.edu',
      passwordHash: adminHash,
      department: 'Administration',
      studentId: '',
      role: 'admin',
      isActive: true,
      isPasswordSet: true
    })
    console.log('✓ Created admin account (admin@campusresolve.edu)')
  } else if (!admin.passwordHash) {
    admin.passwordHash = adminHash
    admin.isPasswordSet = true
    await admin.save()
    console.log('✓ Admin account had no password — initialised it')
  } else {
    console.log('• Admin account already exists — password left untouched')
  }

  // ── Department teachers ─────────────────────────────────────────────────────
  for (const { dept, teacherId, name, email } of departments) {
    const existing = await Teacher.findOne({ $or: [{ teacherId }, { email }] })
    if (!existing) {
      await Teacher.create({
        teacherId,
        name,
        email,
        department: dept,
        designation: 'Professor',
        passwordHash: teacherHash,
        activeComplaints: 0,
        resolvedComplaints: 0,
        isActive: true,
        role: 'teacher'
      })
      console.log(`✓ Created ${dept} teacher: ${name} (${teacherId})`)
    } else if (!existing.passwordHash) {
      existing.passwordHash = teacherHash
      existing.isActive = true
      existing.role = 'teacher'
      await existing.save()
      console.log(`✓ ${dept} teacher had no password — initialised it`)
    }
  }

  // ── Demo complaints (only for the demo student, only if none exist) ─────────
  const Complaint = require('../models/Complaint')
  const demoStudent = await Student.findOne({ email: 'student@campusresolve.edu' })
  if (demoStudent) {
    const existing = await Complaint.findOne({ studentEmail: demoStudent.email })
    if (!existing) {
      await Complaint.create({
        complaintId: 'CR-001',
        title: 'Broken Projector in Lab 3',
        category: 'Infrastructure',
        department: 'CSE',
        description: 'Projector stopped working during lecture',
        priority: 'high',
        status: 'Submitted',
        studentName: demoStudent.name,
        studentEmail: demoStudent.email,
        studentId: demoStudent.studentId || demoStudent._id.toString()
      })
      await Complaint.create({
        complaintId: 'CR-002',
        title: 'Request for extra lab session',
        category: 'Academic',
        department: 'CSE',
        description: 'Need additional lab session before midterms',
        priority: 'medium',
        status: 'Assigned',
        studentName: demoStudent.name,
        studentEmail: demoStudent.email,
        studentId: demoStudent.studentId || demoStudent._id.toString(),
        assignedTeacherId: 'TCH-CSE-001',
        assignedTeacherName: 'Dr. Rajesh Kumar',
        assignedTeacherDepartment: 'CSE',
        assignedDate: new Date()
      })
      console.log('✓ Created demo complaints for demo student (CR-001, CR-002)')
    }
  }
}

module.exports = {
  seedDemoData
}
