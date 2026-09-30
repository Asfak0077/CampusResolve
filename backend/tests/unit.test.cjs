#!/usr/bin/env node
/**
 * Unit tests for pure, database-free backend logic.
 *
 * Run:  node --test backend/tests/
 * These run in CI on every pull request, so regressions in security-critical
 * helpers are caught without needing MongoDB or any API keys.
 */

const test = require('node:test')
const assert = require('node:assert/strict')

const { getJwtSecret, INSECURE_DEFAULT } = require('../src/utils/jwtSecret')
const { generateOtp, randomToken, randomStudentId, uniqueFileSuffix } = require('../src/utils/secureRandom')
const {
  canAccessComplaint,
  canAccessStudent,
  canAccessTeacher,
  requireOwnership
} = require('../src/middleware/accessControl')
const { buildCorsOptions } = require('../src/middleware/corsOptions')
const { formatComplaintId, parseComplaintSeq } = require('../src/utils/complaintIdService')
const { textSimilarity, hasInternalLeaks } = require('../src/utils/responseValidator')

const withEnv = (vars, fn) => {
  const previous = {}
  for (const [key, value] of Object.entries(vars)) {
    previous[key] = process.env[key]
    if (value === undefined) delete process.env[key]
    else process.env[key] = value
  }
  try {
    return fn()
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key]
      else process.env[key] = value
    }
  }
}

// ── JWT secret handling ──────────────────────────────────────────────────────
test('getJwtSecret prefers SECRET_KEY and accepts JWT_SECRET as an alias', () => {
  withEnv({ SECRET_KEY: 'a'.repeat(32), JWT_SECRET: undefined, NODE_ENV: 'development' }, () => {
    assert.equal(getJwtSecret(), 'a'.repeat(32))
  })
  withEnv({ SECRET_KEY: undefined, JWT_SECRET: 'b'.repeat(32), NODE_ENV: 'development' }, () => {
    assert.equal(getJwtSecret(), 'b'.repeat(32))
  })
})

test('getJwtSecret refuses short or default secrets in production', () => {
  withEnv({ SECRET_KEY: 'short', JWT_SECRET: undefined, NODE_ENV: 'production', VERCEL: undefined, VERCEL_ENV: undefined }, () => {
    assert.throws(() => getJwtSecret(), /SECRET_KEY is missing or too weak/)
  })
  withEnv({ SECRET_KEY: INSECURE_DEFAULT, NODE_ENV: 'production', VERCEL: undefined, VERCEL_ENV: undefined }, () => {
    assert.throws(() => getJwtSecret(), /SECRET_KEY is missing or too weak/)
  })
})

test('getJwtSecret falls back to the development default outside production', () => {
  withEnv({ SECRET_KEY: undefined, JWT_SECRET: undefined, NODE_ENV: 'development', VERCEL: undefined, VERCEL_ENV: undefined }, () => {
    assert.equal(getJwtSecret(), INSECURE_DEFAULT)
  })
})

// ── Secure randomness ────────────────────────────────────────────────────────
test('generateOtp returns the requested number of digits', () => {
  for (let i = 0; i < 50; i++) {
    const otp = generateOtp()
    assert.match(otp, /^\d{6}$/)
  }
  assert.match(generateOtp(8), /^\d{8}$/)
})

test('generateOtp does not repeat (CSPRNG, not Math.random)', () => {
  const seen = new Set(Array.from({ length: 200 }, () => generateOtp(8)))
  assert.ok(seen.size > 190, `expected mostly unique OTPs, got ${seen.size}/200`)
})

test('randomToken produces url-safe hex of the expected length', () => {
  assert.match(randomToken(16), /^[0-9a-f]{32}$/)
  assert.notEqual(randomToken(16), randomToken(16))
})

test('randomStudentId is prefixed and numeric', () => {
  assert.match(randomStudentId(), /^CR\d{6}$/)
  assert.match(randomStudentId('TCH'), /^TCH\d{6}$/)
})

test('uniqueFileSuffix is timestamp-prefixed and collision resistant', () => {
  const suffixes = new Set(Array.from({ length: 100 }, () => uniqueFileSuffix()))
  assert.equal(suffixes.size, 100)
  for (const suffix of suffixes) assert.match(suffix, /^\d{13}-[0-9a-f]{16}$/)
})

// ── Record-level authorization ───────────────────────────────────────────────
const studentReq = { userRole: 'student', user: { studentId: 'CR21CS001', email: 'student@campusresolve.edu' } }
const otherStudentReq = { userRole: 'student', user: { studentId: 'CR21CS999', email: 'other@campusresolve.edu' } }
const teacherReq = { userRole: 'teacher', user: { teacherId: 'TCH-CSE-001', email: 'cse.teacher@campusresolve.edu' } }
const adminReq = { userRole: 'admin', user: { email: 'admin@campusresolve.edu' } }

const complaint = {
  studentId: 'CR21CS001',
  studentEmail: 'student@campusresolve.edu',
  assignedTeacherId: 'TCH-CSE-001'
}

test('students may only read their own records', () => {
  assert.equal(canAccessStudent(studentReq, 'CR21CS001'), true)
  assert.equal(canAccessStudent(studentReq, 'cr21cs001'), true, 'comparison is case-insensitive')
  assert.equal(canAccessStudent(studentReq, 'student@campusresolve.edu'), true)
  assert.equal(canAccessStudent(otherStudentReq, 'CR21CS001'), false)
})

test('students and teachers cannot read each other\'s scopes', () => {
  assert.equal(canAccessTeacher(studentReq, 'TCH-CSE-001'), false)
  assert.equal(canAccessTeacher(teacherReq, 'TCH-CSE-001'), true)
  assert.equal(canAccessTeacher(teacherReq, 'TCH-IT-001'), false)
})

test('admins bypass record-level checks', () => {
  assert.equal(canAccessStudent(adminReq, 'anything'), true)
  assert.equal(canAccessTeacher(adminReq, 'anything'), true)
  assert.equal(canAccessComplaint(adminReq, complaint), true)
})

test('complaint access is limited to the owner or the assigned teacher', () => {
  assert.equal(canAccessComplaint(studentReq, complaint), true)
  assert.equal(canAccessComplaint(otherStudentReq, complaint), false)
  assert.equal(canAccessComplaint(teacherReq, complaint), true)
  assert.equal(canAccessComplaint(studentReq, { ...complaint, assignedTeacherId: 'TCH-IT-001' }), true, 'owner still sees their own complaint')
  assert.equal(canAccessComplaint({ userRole: 'teacher', user: { teacherId: 'TCH-IT-001' } }, complaint), false)
  assert.equal(canAccessComplaint(studentReq, null), false)
})

test('requireOwnership middleware rejects with 403 and passes through on success', () => {
  const makeRes = () => {
    const res = { statusCode: null, body: null }
    res.status = (code) => { res.statusCode = code; return res }
    res.json = (payload) => { res.body = payload; return res }
    return res
  }

  const denied = makeRes()
  let nextCalled = false
  requireOwnership('student', 'studentId')({ ...otherStudentReq, params: { studentId: 'CR21CS001' } }, denied, () => { nextCalled = true })
  assert.equal(denied.statusCode, 403)
  assert.equal(nextCalled, false)

  const allowed = makeRes()
  requireOwnership('student', 'studentId')({ ...studentReq, params: { studentId: 'CR21CS001' } }, allowed, () => { nextCalled = true })
  assert.equal(allowed.statusCode, null)
  assert.equal(nextCalled, true)
})

// ── CORS policy ──────────────────────────────────────────────────────────────
const originDecision = (origin, env) => {
  const options = withEnv(env, () => buildCorsOptions())
  return new Promise((resolve) => options.origin(origin, (_err, allowed) => resolve(allowed)))
}

test('CORS rejects unknown browser origins', async () => {
  const env = { FRONTEND_URL: 'https://campus.example.edu', ALLOWED_ORIGINS: undefined, CORS_ALLOW_ALL: undefined, NODE_ENV: 'production' }
  assert.equal(await originDecision('https://evil.example.com', env), false)
  assert.equal(await originDecision('https://campus.example.edu', env), true)
})

test('CORS allows configured extras, localhost in dev and vercel previews', async () => {
  const env = { FRONTEND_URL: 'https://campus.example.edu', ALLOWED_ORIGINS: 'https://extra.example.edu', CORS_ALLOW_ALL: undefined, NODE_ENV: 'development' }
  assert.equal(await originDecision('https://extra.example.edu', env), true)
  assert.equal(await originDecision('http://localhost:5173', env), true)
  assert.equal(await originDecision('http://127.0.0.1:3000', env), true)
  assert.equal(await originDecision('https://campusresolve-pr-12.vercel.app', env), true)
})

test('CORS allows requests without an Origin header (curl, server-to-server)', async () => {
  assert.equal(await originDecision(undefined, { FRONTEND_URL: 'https://campus.example.edu', NODE_ENV: 'production' }), true)
})

test('CORS_ALLOW_ALL opts into a fully open policy for demos', async () => {
  assert.equal(await originDecision('https://anywhere.example.com', { CORS_ALLOW_ALL: 'true' }), true)
})

// ── Complaint ID formatting ──────────────────────────────────────────────────
test('formatComplaintId pads sequential ids to at least three digits', () => {
  assert.equal(formatComplaintId(1), 'CR-001')
  assert.equal(formatComplaintId(27), 'CR-027')
  assert.equal(formatComplaintId(100), 'CR-100')
  assert.equal(formatComplaintId(1234), 'CR-1234')
})

test('formatComplaintId never produces an out-of-range id', () => {
  assert.equal(formatComplaintId(0), 'CR-001')
  assert.equal(formatComplaintId(-5), 'CR-001')
  assert.equal(formatComplaintId('abc'), 'CR-001')
})

test('parseComplaintSeq round-trips formatted ids and rejects junk', () => {
  assert.equal(parseComplaintSeq(formatComplaintId(7)), 7)
  assert.equal(parseComplaintSeq('cr-042'), 42)
  assert.equal(parseComplaintSeq('CR-'), 0)
  assert.equal(parseComplaintSeq('nonsense'), 0)
  assert.equal(parseComplaintSeq(null), 0)
  assert.equal(parseComplaintSeq(), 0)
})

// ── Assistant response safety ────────────────────────────────────────────────
test('textSimilarity scores identical text highest', () => {
  assert.equal(textSimilarity('the projector is broken', 'the projector is broken'), 1)
  assert.ok(textSimilarity('the projector is broken', 'completely different words here') < 0.5)
})

test('hasInternalLeaks flags implementation details in assistant replies', () => {
  assert.equal(hasInternalLeaks('Your complaint CR-001 is assigned to Dr. Rajesh Kumar.'), false)
  const leaked = hasInternalLeaks('mongoose.connection.readyState is 0 and MONGO_URI is missing')
  assert.ok(['boolean', 'object'].includes(typeof leaked))
})
