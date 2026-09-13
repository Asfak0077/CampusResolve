/**
 * CampusResolve Global AI Voice Agent — Types
 *
 * Defines the persistent VoiceSession, PageContext, Structured Voice Actions,
 * and conversational workflow contracts.
 */

import { ActiveWorkflow, ComplaintDraftData, FeedbackDraftData, ExpectedInputType } from '../services/voice/workflowTypes'
import { VoiceState, VoiceMode, PlaybackState, VoiceAgentSettings } from '../services/voice/voiceTypes'

export type PageType =
  | 'dashboard'
  | 'complaints'
  | 'complaint_details'
  | 'complaint_form'
  | 'feedback'
  | 'notifications'
  | 'profile'
  | 'ai_intelligence'
  | 'teachers'
  | 'analytics'
  | 'auth'
  | 'general'

export interface PageContext {
  pathname: string
  pageTitle: string
  pageType: PageType
  activeEntityId?: string | null
  summary?: string
  availableVoiceActions: string[]
  metadata?: Record<string, any>
}

export type VoiceActionType =
  | 'NAVIGATE'
  | 'SEARCH_COMPLAINTS'
  | 'OPEN_COMPLAINT'
  | 'CREATE_COMPLAINT'
  | 'UPDATE_COMPLAINT'
  | 'CANCEL_COMPLAINT'
  | 'SUBMIT_FEEDBACK'
  | 'EDIT_FEEDBACK'
  | 'CANCEL_FEEDBACK'
  | 'READ_STATUS'
  | 'READ_TIMELINE'
  | 'CHECK_SLA'
  | 'READ_NOTIFICATIONS'
  | 'OPEN_PROFILE'
  | 'READ_DASHBOARD'
  | 'SEARCH_USER_DATA'
  | 'PAUSE_WORKFLOW'
  | 'RESUME_WORKFLOW'
  | 'CONFIRM_ACTION'
  | 'REJECT_ACTION'
  | 'NONE'

export interface StructuredVoiceAction {
  intent: string
  action: VoiceActionType
  requiresConfirmation: boolean
  confirmationPrompt?: string
  data?: Record<string, any>
  navigationTarget?: string
}

export interface VoiceConversationTurn {
  role: 'user' | 'agent'
  text: string
  timestamp: number
  action?: StructuredVoiceAction
}

/**
 * The 16 mandatory persistent voice session properties that survive page navigation
 */
export interface VoiceSession {
  voiceSessionId: string
  conversationId: string
  activeWorkflow: ActiveWorkflow | null
  workflowStep: string | null
  expectedInput: ExpectedInputType | null
  collectedSlots: Record<string, any>
  pageContext: PageContext
  lastIntent: string | null
  lastRequestId: string | null
  listeningState: boolean
  speakingState: boolean
  processingState: boolean
  pausedWorkflow: ActiveWorkflow | null
  currentDraft: ComplaintDraftData | FeedbackDraftData | null
  authenticationState: boolean
  userRole: 'guest' | 'student' | 'teacher' | 'admin'
}

export interface VoiceAgentActionResult {
  success: boolean
  spokenMessage: string
  screenMessage?: string
  data?: any
  navigationTarget?: string
}
