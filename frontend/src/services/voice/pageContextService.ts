/**
 * CampusResolve Global AI Voice Agent — Page Context Service
 *
 * Keeps track of which page the user is currently on, detects active entity IDs
 * (e.g. complaint ID from URL or page state), and provides page-specific capabilities.
 */

import { PageContext, PageType } from '../../types/voiceAgent'

export class PageContextService {
  /**
   * Derives PageContext based on route pathname and optional state
   */
  public getContextFromPath(pathname: string, activeEntityId?: string | null): PageContext {
    const cleanPath = pathname.toLowerCase().split('?')[0].replace(/\/$/, '') || '/'

    // Match routes
    if (cleanPath === '/student' || cleanPath === '/admin' || cleanPath === '/teacher') {
      const role = cleanPath.replace('/', '')
      return {
        pathname,
        pageTitle: `${role.charAt(0).toUpperCase() + role.slice(1)} Dashboard`,
        pageType: 'dashboard',
        activeEntityId: null,
        summary: `You are on the ${role} dashboard. You can view metrics, active complaints, and quick actions.`,
        availableVoiceActions: [
          'Read dashboard summary',
          'Show my pending complaints',
          'Create a complaint',
          'Show notifications',
          'Open feedback'
        ]
      }
    }

    if (cleanPath === '/student/history' || cleanPath.startsWith('/complaints')) {
      return {
        pathname,
        pageTitle: 'Complaint History',
        pageType: 'complaints',
        activeEntityId,
        summary: 'Viewing your complaint history and filed tickets.',
        availableVoiceActions: [
          'Search complaints',
          'Open the first complaint',
          'Check status of complaint',
          'Read timeline',
          'Create a complaint'
        ]
      }
    }

    if (cleanPath.startsWith('/complaint/') || activeEntityId) {
      return {
        pathname,
        pageTitle: `Complaint Details ${activeEntityId ? `(${activeEntityId})` : ''}`,
        pageType: 'complaint_details',
        activeEntityId,
        summary: `Viewing details for complaint ${activeEntityId || 'selected'}.`,
        availableVoiceActions: [
          'Read complaint information',
          'Read timeline',
          'Check SLA status',
          'Give feedback',
          'Back to complaints'
        ]
      }
    }

    if (cleanPath === '/student/feedback' || cleanPath === '/admin/feedback') {
      return {
        pathname,
        pageTitle: 'Grievance Feedback',
        pageType: 'feedback',
        activeEntityId,
        summary: 'Feedback submission page for resolved complaints.',
        availableVoiceActions: [
          'Give feedback for my complaint',
          'List resolved complaints',
          'Submit feedback',
          'Cancel feedback'
        ]
      }
    }

    if (cleanPath === '/student/profile' || cleanPath.startsWith('/profile/')) {
      return {
        pathname,
        pageTitle: 'User Profile',
        pageType: 'profile',
        activeEntityId,
        summary: 'Your CampusResolve profile and academic department details.',
        availableVoiceActions: [
          'Read profile information',
          'Go to dashboard',
          'Go to complaints'
        ]
      }
    }

    if (cleanPath === '/admin/recommendations' || cleanPath === '/admin/analytics') {
      return {
        pathname,
        pageTitle: 'AI Recommendations & Intelligence',
        pageType: 'ai_intelligence',
        activeEntityId: null,
        summary: 'AI campus insights, predictive SLA risk, and grievance hotspots.',
        availableVoiceActions: [
          'Read AI insights',
          'Show recurring issues',
          'Show campus hotspots',
          'Check SLA risks'
        ]
      }
    }

    if (cleanPath === '/admin/teachers') {
      return {
        pathname,
        pageTitle: 'Teacher Management',
        pageType: 'teachers',
        activeEntityId: null,
        summary: 'Manage faculty roster, department allocations, and grievance handling staff.',
        availableVoiceActions: [
          'List teachers',
          'Find teacher by department',
          'Go to dashboard'
        ]
      }
    }

    if (cleanPath === '/login' || cleanPath === '/reset-password' || cleanPath === '/forgot-password') {
      return {
        pathname,
        pageTitle: 'Authentication',
        pageType: 'auth',
        activeEntityId: null,
        summary: 'Sign in to access personalized complaints and grievance resolution.',
        availableVoiceActions: [
          'How to sign in',
          'Reset password assistance'
        ]
      }
    }

    return {
      pathname,
      pageTitle: 'CampusResolve',
      pageType: 'general',
      activeEntityId: null,
      summary: 'CampusResolve Smart Grievance Redressal Portal.',
      availableVoiceActions: [
        'How to create a complaint',
        'Go to dashboard',
        'Login assistance'
      ]
    }
  }
}

export const pageContextService = new PageContextService()
