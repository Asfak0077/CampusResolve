/**
 * Demo / offline credentials — single source of truth.
 *
 * The platform runs in two modes:
 *   1. MongoDB connected  -> credentials come from the `students` / `teachers` collections.
 *   2. MongoDB unreachable -> the persistent in-memory store takes over (see inMemoryStore.js)
 *      and these hardcoded demo accounts are what the login routes validate against.
 *
 * Keeping the roster in one module avoids the drift that previously existed between the
 * README table, seedDemoData.js and the login handlers (e.g. `teachcse` vs `teach123`).
 */

const bcrypt = require('bcryptjs')

const DEMO_STUDENTS = [
  {
    id: 'CR21CS001',
    studentId: 'CR21CS001',
    name: 'Student User',
    email: 'student@campusresolve.edu',
    role: 'student',
    department: 'CSE',
    semesterYear: '3rd Year',
    passwords: ['password123', 'student123']
  },
  {
    id: 'ADM-001',
    studentId: '',
    name: 'Admin Officer',
    email: 'admin@campusresolve.edu',
    role: 'admin',
    department: 'Administration',
    passwords: ['admin123', 'password123', 'pass123@A']
  }
]

const DEMO_TEACHERS = [
  {
    teacherId: 'TCH-CSE-001',
    name: 'Dr. Rajesh Kumar',
    email: 'cse.teacher@campusresolve.edu',
    department: 'CSE',
    designation: 'Professor',
    passwords: ['teachcse', 'teach123']
  },
  {
    teacherId: 'TCH-ECE-001',
    name: 'Dr. Priya Sharma',
    email: 'ece.teacher@campusresolve.edu',
    department: 'ECE',
    designation: 'Professor',
    passwords: ['teach123']
  },
  {
    teacherId: 'TCH-MECH-001',
    name: 'Dr. Arun Patel',
    email: 'mech.teacher@campusresolve.edu',
    department: 'MECH',
    designation: 'Professor',
    passwords: ['teach123']
  },
  {
    teacherId: 'TCH-EEE-001',
    name: 'Dr. Meena Iyer',
    email: 'eee.teacher@campusresolve.edu',
    department: 'EEE',
    designation: 'Professor',
    passwords: ['teach123']
  },
  {
    teacherId: 'TCH-AIDS-001',
    name: 'Dr. Karthik Reddy',
    email: 'aids.teacher@campusresolve.edu',
    department: 'AIDS',
    designation: 'Professor',
    passwords: ['teach123']
  },
  {
    teacherId: 'TCH-IT-001',
    name: 'Dr. Lakshmi Nair',
    email: 'it.teacher@campusresolve.edu',
    department: 'IT',
    designation: 'Professor',
    passwords: ['teach123']
  }
]

const normalize = (value) => String(value || '').toLowerCase().trim()

const findDemoStudentByEmail = (email) => {
  const target = normalize(email)
  return DEMO_STUDENTS.find((s) => normalize(s.email) === target) || null
}

const findDemoTeacher = (identifier) => {
  const target = normalize(identifier)
  if (!target) return null
  return (
    DEMO_TEACHERS.find(
      (t) => normalize(t.teacherId) === target || normalize(t.email) === target
    ) || null
  )
}

/**
 * Validate a password against a demo record or a stored (in-memory / Mongo) record.
 * Supports bcrypt hashes when present, plus the plain demo password list.
 */
const verifyDemoPassword = (record, password) => {
  if (!record || !password) return false

  const candidates = Array.isArray(record.passwords)
    ? record.passwords
    : record.password
      ? [record.password]
      : []

  if (candidates.includes(password)) return true

  if (record.passwordHash) {
    try {
      return bcrypt.compareSync(password, record.passwordHash)
    } catch {
      return false
    }
  }

  return false
}

/**
 * Store-shaped teacher records for seeding the offline in-memory store.
 */
const demoTeacherStoreRecords = () =>
  DEMO_TEACHERS.map((t, index) => ({
    _id: `64f1a2b3c4d5e6f7a8b9c0t${index + 1}`,
    id: t.teacherId,
    teacherId: t.teacherId,
    name: t.name,
    email: t.email,
    phone: '',
    department: t.department,
    designation: t.designation,
    activeComplaints: 0,
    resolvedComplaints: 0,
    role: 'teacher',
    isActive: true,
    emailNotifications: true,
    preferences: { darkMode: false, language: 'en', emailNotifications: true },
    activityHistory: []
  }))

/**
 * Realistic demo complaints so the student / admin / teacher dashboards are
 * populated in offline mode instead of rendering empty states.
 */
const demoComplaints = () => {
  const daysAgo = (n) => new Date(Date.now() - n * 24 * 3600 * 1000).toISOString()
  const student = DEMO_STUDENTS[0]

  return [
    {
      complaintId: 'CR-001',
      title: 'Broken Projector in Lab 3',
      category: 'Infrastructure',
      department: 'CSE',
      description: 'The ceiling projector in Lab 3 stopped powering on during the afternoon lecture.',
      priority: 'high',
      status: 'In Progress',
      studentName: student.name,
      studentEmail: student.email,
      studentId: student.studentId,
      assignedTeacherId: 'TCH-CSE-001',
      createdAt: daysAgo(6),
      resolutionTimeline: [
        { status: 'Submitted', timestamp: daysAgo(6), updatedBy: 'Student', notes: 'Complaint submitted' },
        { status: 'Assigned', timestamp: daysAgo(5), updatedBy: 'Admin', notes: 'Assigned to Dr. Rajesh Kumar' },
        { status: 'In Progress', timestamp: daysAgo(2), updatedBy: 'Teacher', notes: 'Replacement lamp ordered' }
      ]
    },
    {
      complaintId: 'CR-002',
      title: 'Request for extra lab session before midterms',
      category: 'Academic',
      department: 'CSE',
      description: 'Students need one additional DBMS lab session before the midterm examinations.',
      priority: 'medium',
      status: 'Assigned',
      studentName: student.name,
      studentEmail: student.email,
      studentId: student.studentId,
      assignedTeacherId: 'TCH-CSE-001',
      createdAt: daysAgo(4),
      resolutionTimeline: [
        { status: 'Submitted', timestamp: daysAgo(4), updatedBy: 'Student', notes: 'Complaint submitted' },
        { status: 'Assigned', timestamp: daysAgo(3), updatedBy: 'Admin', notes: 'Assigned to Dr. Rajesh Kumar' }
      ]
    },
    {
      complaintId: 'CR-003',
      title: 'Library air conditioning noise',
      category: 'Facility',
      department: 'ECE',
      description: 'Continuous rattling noise from the AC unit on the second floor of the library.',
      priority: 'low',
      status: 'Resolved',
      studentName: student.name,
      studentEmail: student.email,
      studentId: student.studentId,
      assignedTeacherId: 'TCH-ECE-001',
      createdAt: daysAgo(12),
      resolutionTimeline: [
        { status: 'Submitted', timestamp: daysAgo(12), updatedBy: 'Student', notes: 'Complaint submitted' },
        { status: 'Assigned', timestamp: daysAgo(11), updatedBy: 'Admin', notes: 'Assigned to Dr. Priya Sharma' },
        { status: 'Resolved', timestamp: daysAgo(8), updatedBy: 'Teacher', notes: 'AC serviced and mounting bolts tightened' }
      ]
    },
    {
      complaintId: 'CR-004',
      title: 'Hostel Wi-Fi dropping frequently',
      category: 'Network',
      department: 'IT',
      description: 'Wi-Fi in Block C hostel disconnects every few minutes during peak hours.',
      priority: 'high',
      status: 'Submitted',
      studentName: student.name,
      studentEmail: student.email,
      studentId: student.studentId,
      assignedTeacherId: '',
      createdAt: daysAgo(1),
      resolutionTimeline: [
        { status: 'Submitted', timestamp: daysAgo(1), updatedBy: 'Student', notes: 'Complaint submitted' }
      ]
    }
  ]
}

module.exports = {
  DEMO_STUDENTS,
  DEMO_TEACHERS,
  findDemoStudentByEmail,
  findDemoTeacher,
  verifyDemoPassword,
  demoTeacherStoreRecords,
  demoComplaints
}
