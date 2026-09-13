/**
 * CampusResolve — PermissionManager §10
 *
 * Verifies role-based authorization after authentication.
 * Called by AgentOrchestrator before executing action.
 */

import { useAuthStore } from '../../store/authStore'

export class PermissionManager {
  canCreateComplaint(): boolean {
    const role = useAuthStore.getState().role
    return role === 'student' // only students file complaints; admin/teacher manage
  }

  canViewComplaint(complaint: any): boolean {
    const { user, role } = useAuthStore.getState()
    if (!user) return false
    if (role === 'admin') return true
    const sid = (user.studentId || (user as any)._id || '').toString()
    const email = (user.email || '').toLowerCase()
    if (complaint.studentId && complaint.studentId.toString() === sid) return true
    if (complaint.studentEmail && complaint.studentEmail.toLowerCase() === email) return true
    if (role === 'teacher') {
      if (complaint.assignedTeacherId === (user.teacherId || (user as any)._id)) return true
    }
    return false
  }

  canSubmitFeedback(complaint: any): boolean {
    return this.canViewComplaint(complaint) && complaint.status === 'Resolved'
  }

  role(): string {
    return useAuthStore.getState().role || 'guest'
  }
}

export const permissionManager = new PermissionManager()
