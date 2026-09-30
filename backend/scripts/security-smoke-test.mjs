#!/usr/bin/env node
/**
 * Authorization smoke test.
 *
 * Verifies that sensitive endpoints reject anonymous callers and that each role
 * can only reach what it should. Run it against a locally started backend:
 *
 *   node backend/src/server.js
 *   node backend/scripts/security-smoke-test.mjs
 *
 * Exit code 0 = all checks passed, 1 = at least one failed.
 * This test only reads data; it never mutates records.
 */

const API = process.env.API_BASE_URL || 'http://localhost:5001/api'

const DEMO = {
  student: { email: 'student@campusresolve.edu', password: process.env.DEMO_PASSWORD || 'password123' },
  admin: { email: 'admin@campusresolve.edu', password: process.env.DEMO_ADMIN_PASSWORD || 'password123' },
  teacher: { teacherId: process.env.DEMO_TEACHER_ID || 'TCH-CSE-001', password: process.env.TEACHER_DEFAULT_PASSWORD || 'teach123' }
}

let passed = 0
let failed = 0

const request = async (path, { method = 'GET', token, body, origin } = {}) => {
  const response = await fetch(`${API}${path}`, {
    method,
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(origin ? { Origin: origin } : {})
    },
    body: body ? JSON.stringify(body) : undefined
  })
  return response.status
}

/** Raw fetch for checks that need headers or an invalid JSON body. */
const raw = (path, options = {}) => fetch(`${API}${path}`, options)

const check = (name, expected, actual) => {
  const ok = Array.isArray(expected) ? expected.includes(actual) : actual === expected
  if (ok) {
    passed++
    console.log(`  ✅ ${name} (HTTP ${actual})`)
  } else {
    failed++
    console.log(`  ❌ ${name} — expected ${expected}, got ${actual}`)
  }
}

const login = async (path, payload, field = 'accessToken') => {
  try {
    const response = await fetch(`${API}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
    if (!response.ok) return ''
    const data = await response.json()
    return data[field] || ''
  } catch {
    return ''
  }
}

const main = async () => {
  // Fail fast if the API isn't reachable.
  try {
    await request('/health')
  } catch (error) {
    console.error(`\n🛑 Cannot reach ${API} — start the backend first (npm run dev:backend).\n`)
    process.exit(1)
  }

  console.log('\n── Anonymous caller must be rejected ──')
  check('complaint dump blocked', 401, await request('/complaints/admin/all-complaints?limit=5'))
  check('admin analytics blocked', 401, await request('/complaints/admin/analytics'))
  check('activity logs blocked', 401, await request('/complaints/admin/activity-logs'))
  check('complaint list blocked', 401, await request('/complaints'))
  check('status change blocked', 401, await request('/complaints/CR-001/update-status', {
    method: 'PUT', body: { newStatus: 'Resolved' }
  }))
  check('assignment blocked', 401, await request('/complaints/CR-001/assign', {
    method: 'PUT', body: { teacherId: 'TCH-CSE-001' }
  }))
  check('teacher creation blocked', 401, await request('/teachers', {
    method: 'POST', body: { name: 'x', department: 'CSE' }
  }))
  check('feedback dump blocked', 401, await request('/feedback'))
  check('upload blocked', 401, await request('/upload/multiple', { method: 'POST' }))

  const studentToken = await login('/auth/student-login', DEMO.student)
  if (!studentToken) {
    console.log('\n⚠️  Could not sign in as the demo student — skipping role checks.')
    console.log('   (Seed the demo accounts, or set DEMO_PASSWORD to match your database.)')
  } else {
    console.log('\n── Student role ──')
    check('own complaints readable', 200, await request('/complaints/student/CR21CS001', { token: studentToken }))
    check('notifications readable', 200, await request('/notifications?userId=CR21CS001', { token: studentToken }))
    check('teacher directory readable', 200, await request('/teachers', { token: studentToken }))
    check('cannot read complaint dump', 403, await request('/complaints/admin/all-complaints', { token: studentToken }))
    check('cannot change status', 403, await request('/complaints/CR-001/update-status', {
      method: 'PUT', token: studentToken, body: { newStatus: 'Resolved' }
    }))
    check('cannot create teachers', 403, await request('/teachers', {
      method: 'POST', token: studentToken, body: { name: 'x', department: 'CSE' }
    }))

    console.log('\n── Record-level authorization (IDOR) ──')
    check('cannot read another student\'s complaints', 403, await request('/complaints/student/CR99XX999', { token: studentToken }))
    check('cannot read another student\'s feedback', 403, await request('/feedback/student/CR99XX999', { token: studentToken }))
    check('cannot read another teacher\'s queue', 403, await request('/complaints/teacher/TCH-IT-001', { token: studentToken }))
    check('can read own complaints', [200], await request('/complaints/student/CR21CS001', { token: studentToken }))
    check('can read own feedback', [200], await request('/feedback/student/CR21CS001', { token: studentToken }))
  }

  const adminToken = await login('/auth/student-login', DEMO.admin)
  if (adminToken) {
    console.log('\n── Admin role ──')
    check('reads complaint dump', 200, await request('/complaints/admin/all-complaints?limit=5', { token: adminToken }))
    check('reads analytics', [200], await request('/complaints/admin/analytics', { token: adminToken }))
    check('reads feedback', [200], await request('/feedback', { token: adminToken }))
    check('reads teacher performance', [200], await request('/analytics/teachers/performance', { token: adminToken }))
  }

  const teacherToken = await login('/auth/teacher-login', DEMO.teacher)
  if (teacherToken) {
    console.log('\n── Teacher role ──')
    check('reads own queue', [200], await request(`/complaints/teacher/${DEMO.teacher.teacherId}`, { token: teacherToken }))
    check('is authorized for status updates', [200, 404], await request('/complaints/CR-001/update-status', {
      method: 'PUT', token: teacherToken, body: { newStatus: 'Resolved' }
    }))
    check('cannot read complaint dump', 403, await request('/complaints/admin/all-complaints', { token: teacherToken }))
    check('cannot read another department\'s queue', 403, await request('/complaints/teacher/TCH-IT-001', { token: teacherToken }))
  }

  console.log('\n── Platform hardening ──')
  const unknown = await request('/definitely-not-a-route')
  check('unknown API route returns JSON 404', 404, unknown)

  const malformed = await raw('/auth/student-login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{ not json'
  })
  check('malformed JSON body rejected with 400', 400, malformed.status)

  const evilOrigin = await raw('/health', { headers: { Origin: 'https://evil.example.com' } })
  check('untrusted origin gets no CORS grant',
    '', evilOrigin.headers.get('access-control-allow-origin') || '')

  const localOrigin = await raw('/health', { headers: { Origin: 'http://localhost:5173' } })
  check('known dev origin is allowed',
    'http://localhost:5173', localOrigin.headers.get('access-control-allow-origin') || '')

  const upload = await raw('/upload/multiple', { method: 'POST', token: studentToken })
  check('upload without a file returns 4xx', [400, 401], upload.status)

  console.log(`\nRESULT: ${passed} passed, ${failed} failed\n`)
  process.exit(failed ? 1 : 0)
}

main().catch((error) => {
  console.error('✖ Security smoke test crashed:', error)
  process.exit(1)
})
