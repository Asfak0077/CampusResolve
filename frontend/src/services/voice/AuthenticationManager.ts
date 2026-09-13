/**
 * CampusResolve — AuthenticationManager §9
 *
 * Enforces MANDATORY authentication for private actions.
 * Frontend checks are UX gates; backend JWT verification is security gate (§10).
 * Ownership is derived from verified session — never from req.body.userId.
 */

import { useAuthStore } from '../../store/authStore'

export type AuthDecision =
  | { allowed: true }
  | { allowed: false; reason: string; spokenReason: string }

export const PRIVATE_ACTIONS = new Set([
  'CREATE_COMPLAINT',
  'VIEW_PERSONAL_COMPLAINTS',
  'SEARCH_PERSONAL_COMPLAINTS',
  'SUBMIT_FEEDBACK',
  'VIEW_PERSONAL_FEEDBACK',
  'VIEW_PERSONAL_NOTIFICATIONS',
  'UPDATE_PROFILE',
  'REOPEN_COMPLAINT',
  'ESCALATE_COMPLAINT',
])

export class AuthenticationManager {
  isAuthenticated(): boolean {
    const s = useAuthStore.getState()
    return Boolean(s.isAuthenticated && s.token && s.user)
  }

  getVerifiedUser(): any | null {
    const s = useAuthStore.getState()
    if (!s.isAuthenticated || !s.token || !s.user) return null
    return s.user
  }

  getVerifiedUserId(): string | null {
    const user = this.getVerifiedUser()
    if (!user) return null
    return user.studentId || user.teacherId || user.email || (user as any)._id || null
  }

  requireAuthFor(action: string): AuthDecision {
    if (!PRIVATE_ACTIONS.has(action)) return { allowed: true }
    if (this.isAuthenticated()) return { allowed: true }
    return {
      allowed: false,
      reason: 'Please log in first. You need to be authenticated before you can create a complaint.',
      spokenReason: 'Please log in first. You need to be authenticated before you can create a complaint.'
    }
  }

  requireAuthForComplaintCreation(): AuthDecision {
    return this.requireAuthFor('CREATE_COMPLAINT')
  }

  // §11 — store only SAFE intended action, not private data
  storeIntendedAction(action: string): void {
    try {
      if (PRIVATE_ACTIONS.has(action) || action === 'CREATE_COMPLAINT') {
        localStorage.setItem('campusresolve_intended_action', action)
      }
    } catch { /* ignore */ }
  }

  consumeIntendedAction(): string | null {
    try {
      const v = localStorage.getItem('campusresolve_intended_action')
      if (v) localStorage.removeItem('campusresolve_intended_action')
      return v
    } catch { return null }
  }

  clearIntendedAction(): void {
    try { localStorage.removeItem('campusresolve_intended_action') } catch { /* ignore */ }
  }
}

export const authenticationManager = new AuthenticationManager()
