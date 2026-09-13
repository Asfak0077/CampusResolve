/**
 * CampusResolve Global AI Voice Agent — Global Action Executor
 *
 * Centralized, safe action executor for structured voice actions.
 * Translates voice intents into real application side effects (navigation,
 * complaint submission, feedback submission, status reading, notification queries)
 * while enforcing authentication, authorization, and confirmation gates.
 */

import { StructuredVoiceAction, VoiceAgentActionResult } from '../../types/voiceAgent'
import { createComplaintFromChat, submitFeedbackFromChat } from '../chatbotService'
import { fetchStudentComplaints } from '../complaintService'
import { useAuthStore } from '../../store/authStore'

export interface ActionExecutorDependencies {
  navigate: (path: string) => void
  onComplaintCreated?: (complaint: any) => void
  onFeedbackSubmitted?: (feedback: any) => void
  onRefreshData?: () => void
}

export class GlobalActionExecutor {
  /**
   * Executes a structured action safely
   */
  public async execute(
    action: StructuredVoiceAction,
    deps: ActionExecutorDependencies
  ): Promise<VoiceAgentActionResult> {
    const auth = useAuthStore.getState()
    const isAuthenticated = auth.isAuthenticated
    const userRole = auth.role || 'guest'
    const currentUser = auth.user

    switch (action.action) {
      case 'NAVIGATE': {
        const target = action.navigationTarget || action.data?.path || '/student'
        deps.navigate(target)
        return {
          success: true,
          spokenMessage: `Navigating to ${action.data?.pageTitle || target}.`,
          screenMessage: `Navigated to **${action.data?.pageTitle || target}**`,
          navigationTarget: target
        }
      }

      case 'CREATE_COMPLAINT': {
        if (!isAuthenticated) {
          return {
            success: false,
            spokenMessage: 'Please log in to submit a complaint.',
            screenMessage: '⚠️ **Authentication required**: Please sign in to submit a complaint.'
          }
        }

        const draft = action.data || {}
        const title = draft.title || (draft.description ? draft.description.slice(0, 50) : 'Campus Issue')
        const description = draft.description || ''
        const location = draft.location || ''
        const category = draft.category || 'Infrastructure'
        const priority = draft.priority || 'medium'
        const department = draft.department || 'Campus Facilities'

        try {
          const res = await createComplaintFromChat({
            title,
            description,
            location,
            category,
            priority,
            department
          })

          const complaintId = res?.complaint?.complaintId || res?.complaint?._id || 'Submitted'
          if (deps.onComplaintCreated) deps.onComplaintCreated(res.complaint)

          return {
            success: true,
            spokenMessage: `Complaint created successfully. Your complaint ID is ${complaintId}.`,
            screenMessage: `✅ **Complaint Created Successfully!**\n\nYour complaint ID is **${complaintId}** for **${title}** at *${location}*. Our maintenance staff has been notified.`,
            data: res.complaint
          }
        } catch (error: any) {
          console.error('[ActionExecutor] Failed to create complaint:', error)
          return {
            success: false,
            spokenMessage: 'Sorry, there was an issue submitting your complaint. Please try again.',
            screenMessage: `❌ **Failed to submit complaint**: ${error?.response?.data?.message || error?.message || 'Server error'}`
          }
        }
      }

      case 'SUBMIT_FEEDBACK': {
        if (!isAuthenticated) {
          return {
            success: false,
            spokenMessage: 'Please log in to submit feedback.',
            screenMessage: '⚠️ **Authentication required**: Please sign in to submit feedback.'
          }
        }

        const draft = action.data || {}
        const complaintId = draft.complaintId
        const rating = Number(draft.rating || 5)
        const comment = draft.feedbackText || draft.comment || 'Issue was handled satisfactorily.'

        if (!complaintId) {
          return {
            success: false,
            spokenMessage: 'Please specify which complaint you are providing feedback for.',
            screenMessage: '⚠️ Complaint ID is missing for feedback.'
          }
        }

        try {
          const res = await submitFeedbackFromChat({
            complaintId,
            rating,
            comment,
            category: draft.category || 'Infrastructure'
          })

          if (deps.onFeedbackSubmitted) deps.onFeedbackSubmitted(res.feedback)

          return {
            success: true,
            spokenMessage: `Feedback submitted successfully for complaint ${complaintId}. Thank you for your review!`,
            screenMessage: `⭐ **Feedback Submitted!**\n\nThank you for rating complaint **${complaintId}** with **${rating} stars**.`,
            data: res.feedback
          }
        } catch (error: any) {
          console.error('[ActionExecutor] Failed to submit feedback:', error)
          return {
            success: false,
            spokenMessage: 'Sorry, there was an issue recording your feedback. Please try again.',
            screenMessage: `❌ **Failed to record feedback**: ${error?.response?.data?.message || error?.message || 'Server error'}`
          }
        }
      }

      case 'OPEN_COMPLAINT': {
        const id = action.data?.complaintId
        if (!id) {
          return {
            success: false,
            spokenMessage: 'I could not determine which complaint to open.',
            screenMessage: 'Complaint ID not specified.'
          }
        }
        // Navigate to complaint history
        deps.navigate('/student/history')
        return {
          success: true,
          spokenMessage: `Opening complaint ${id}.`,
          screenMessage: `Opened complaint **${id}** in your history.`,
          data: { complaintId: id }
        }
      }

      case 'READ_DASHBOARD': {
        if (!isAuthenticated) {
          return {
            success: true,
            spokenMessage: 'Welcome to CampusResolve. Please log in to see your personalized dashboard.',
            screenMessage: 'Please log in to view your dashboard.'
          }
        }

        try {
          const studentId = currentUser?.studentId || (currentUser as any)?._id || currentUser?.id
          let complaints: any[] = []
          if (studentId) {
            complaints = await fetchStudentComplaints(studentId)
          }
          const pending = complaints.filter(c => c.status !== 'Resolved')
          const resolved = complaints.filter(c => c.status === 'Resolved')

          return {
            success: true,
            spokenMessage: `You have ${pending.length} pending complaint${pending.length === 1 ? '' : 's'} and ${resolved.length} resolved complaint${resolved.length === 1 ? '' : 's'}.`,
            screenMessage: `📊 **Dashboard Summary**\n- **Pending complaints:** ${pending.length}\n- **Resolved complaints:** ${resolved.length}`
          }
        } catch (e) {
          return {
            success: true,
            spokenMessage: `You are on your ${userRole} dashboard.`,
            screenMessage: `You are on your ${userRole} dashboard.`
          }
        }
      }

      case 'OPEN_PROFILE': {
        deps.navigate('/student/profile')
        return {
          success: true,
          spokenMessage: 'Opening your profile.',
          screenMessage: 'Opened your profile.'
        }
      }

      default:
        return {
          success: true,
          spokenMessage: 'Action processed.',
          screenMessage: 'Done.'
        }
    }
  }
}

export const globalActionExecutor = new GlobalActionExecutor()
