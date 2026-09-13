/**
 * CampusResolve Voice-First Multi-Turn AI Agent — Navigation Agent
 * 
 * Maps spoken voice commands to campus application routes and maintains the voice session.
 */

import { AgentResponse } from '../workflowTypes'
import { useAuthStore } from '../../../store/authStore'

export class NavigationAgent {
  public resolveNavigation(spokenText: string): { path: string; name: string; complaintId?: string } | null {
    const lower = spokenText.toLowerCase().trim()
    const role = useAuthStore.getState().role || 'student'

    // Specific complaint navigation: "open complaint CR-001"
    const complaintMatch = lower.match(/\b(?:open|show|view|go to)?\s*(?:complaint|ticket)\s*(cr-\d+|cmp-\d+)\b/i)
    if (complaintMatch) {
      const complaintId = complaintMatch[1].toUpperCase()
      return {
        path: role === 'admin' ? '/admin' : '/student/history',
        name: `Complaint ${complaintId}`,
        complaintId
      }
    }

    // Role-specific base routes
    const dashboardPath = role === 'admin' ? '/admin' : role === 'teacher' ? '/teacher' : '/student'
    const feedbackPath = role === 'admin' ? '/admin/feedback' : '/student/feedback'
    const aiPath = role === 'admin' ? '/admin/recommendations' : '/student'

    const routeTriggers: Record<string, { path: string; name: string }> = {
      'dashboard': { path: dashboardPath, name: 'Dashboard' },
      'home': { path: dashboardPath, name: 'Home' },
      'my complaints': { path: '/student/history', name: 'My Complaints' },
      'complaints': { path: role === 'admin' ? '/admin' : '/student/history', name: 'Complaints' },
      'history': { path: '/student/history', name: 'Complaint History' },
      'feedback': { path: feedbackPath, name: 'Feedback' },
      'notifications': { path: dashboardPath, name: 'Notifications' },
      'my profile': { path: '/student/profile', name: 'Profile' },
      'profile': { path: '/student/profile', name: 'Profile' },
      'settings': { path: '/student/profile', name: 'Settings' },
      'ai intelligence': { path: aiPath, name: 'AI Intelligence' },
      'recommendations': { path: '/admin/recommendations', name: 'AI Recommendations' },
      'analytics': { path: role === 'admin' ? '/admin/analytics' : dashboardPath, name: 'Analytics' },
      'teachers': { path: '/admin/teachers', name: 'Teacher Management' }
    }

    for (const [trigger, route] of Object.entries(routeTriggers)) {
      if (
        lower === trigger ||
        lower.includes(`go to ${trigger}`) ||
        lower.includes(`open ${trigger}`) ||
        lower.includes(`navigate to ${trigger}`) ||
        lower.includes(`take me to ${trigger}`) ||
        lower.includes(`show ${trigger}`) ||
        lower.includes(`show my ${trigger}`)
      ) {
        return route
      }
    }
    return null
  }

  public handleNavigation(route: { path: string; name: string; complaintId?: string }): AgentResponse {
    return {
      workflow: 'NAVIGATION',
      workflowStatus: 'COMPLETED',
      currentStep: 'NAVIGATED',
      expectedInput: null,
      extractedData: { targetPath: route.path, complaintId: route.complaintId },
      missingFields: [],
      screenResponse: `Navigating to **${route.name}**...`,
      voiceResponse: `Opening ${route.name}.`,
      shouldListenAgain: true,
      requiresConfirmation: false,
      navigationTarget: route.path,
      action: {
        type: 'NAVIGATE',
        payload: { path: route.path, complaintId: route.complaintId }
      }
    }
  }
}

export const navigationAgent = new NavigationAgent()
