/**
 * Record-level authorization helpers.
 *
 * `protect` proves *who* the caller is; these helpers answer *what* they may
 * read. Without them an authenticated student could read any other student's
 * complaints (including phone numbers) simply by changing the id in the URL.
 *
 * Admins bypass every check; teachers are limited to their own queue; students
 * to their own records.
 */

const norm = (value) => String(value ?? '').toLowerCase().trim()

/** Identifiers that can refer to the signed-in account. */
const requesterIds = (req) => {
  const user = req.user || {}
  return [
    user._id,
    user.id,
    user.studentId,
    user.teacherId,
    user.email
  ].map(norm).filter(Boolean)
}

const isAdmin = (req) => req.userRole === 'admin'
const isTeacher = (req) => req.userRole === 'teacher'

/** The caller may read records belonging to `studentId`. */
const canAccessStudent = (req, studentId) => {
  if (isAdmin(req)) return true
  if (!isTeacher(req)) return requesterIds(req).includes(norm(studentId))
  // Teachers only see a student's record when it is part of their own queue,
  // which is enforced per-complaint instead.
  return false
}

/** The caller may read the queue of `teacherId`. */
const canAccessTeacher = (req, teacherId) => {
  if (isAdmin(req)) return true
  return isTeacher(req) && requesterIds(req).includes(norm(teacherId))
}

/** The caller may read this complaint document. */
const canAccessComplaint = (req, complaint) => {
  if (!complaint) return false
  if (isAdmin(req)) return true

  const ids = requesterIds(req)

  if (isTeacher(req)) {
    return [
      complaint.assignedTeacherId,
      complaint.teacherId,
      complaint.assignedTeacherEmail
    ].map(norm).filter(Boolean).some((value) => ids.includes(value))
  }

  return [
    complaint.studentId,
    complaint.studentEmail,
    complaint.studentUserId
  ].map(norm).filter(Boolean).some((value) => ids.includes(value))
}

/**
 * Express middleware factory for routes whose `:param` names a record owner.
 * `kind` is 'student' | 'teacher'.
 */
const requireOwnership = (kind, param) => (req, res, next) => {
  const value = req.params[param]
  const allowed = kind === 'student' ? canAccessStudent(req, value) : canAccessTeacher(req, value)

  if (!allowed) {
    return res.status(403).json({ message: 'You are not allowed to access this resource' })
  }
  next()
}

module.exports = {
  requesterIds,
  isAdmin,
  isTeacher,
  canAccessStudent,
  canAccessTeacher,
  canAccessComplaint,
  requireOwnership
}
