/**
 * CampusResolve — IntentRouter §20 (§5 Strict Workflow Priority)
 *
 * Determines intent/workflow/required fields/auth required before
 * delegating to AgentOrchestrator or backend.
 * Never performs DB writes — verified backend does.
 */

export type Intent =
  | 'CREATE_COMPLAINT'
  | 'PROVIDE_COMPLAINT_DETAILS'
  | 'CHECK_STATUS'
  | 'SEARCH_COMPLAINT'
  | 'VIEW_COMPLAINT'
  | 'GIVE_FEEDBACK'
  | 'PROVIDE_FEEDBACK_DETAILS'
  | 'SUBMIT_FEEDBACK'
  | 'NAVIGATION'
  | 'NOTIFICATION'
  | 'PROFILE'
  | 'AI_INTELLIGENCE'
  | 'CANCEL_ACTION'
  | 'PAUSE_WORKFLOW'
  | 'RESUME_WORKFLOW'
  | 'GENERAL_QUESTION'
  | 'GREETING'

export interface IntentResult {
  intent: Intent
  action: string | null
  requiresAuth: boolean
  requiresConfirmation: boolean
  expectedInput: string | null
  confidence: number
}

// Private actions per §9 — MUST be blocked for guests
const PRIVATE_INTENTS: Set<Intent> = new Set([
  'CREATE_COMPLAINT',
  'PROVIDE_COMPLAINT_DETAILS',
  'CHECK_STATUS',
  'SEARCH_COMPLAINT',
  'VIEW_COMPLAINT',
  'GIVE_FEEDBACK',
  'PROVIDE_FEEDBACK_DETAILS',
  'SUBMIT_FEEDBACK',
])

export class IntentRouter {
  classify(message: string, hasActiveWorkflow: boolean, expectedInput: string | null): IntentResult {
    const raw = message.trim()
    const lower = raw.toLowerCase()

    // §7 Active workflow has priority — treat as slot fill, NOT new intent
    if (hasActiveWorkflow && expectedInput) {
      if (/^(cancel|stop|nevermind|abort|forget it)$/i.test(lower)) {
        return { intent: 'CANCEL_ACTION', action: 'CANCEL', requiresAuth: false, requiresConfirmation: false, expectedInput: null, confidence: 1 }
      }
      if (/^(pause|hold on|wait a second)$/i.test(lower)) {
        return { intent: 'PAUSE_WORKFLOW', action: 'PAUSE', requiresAuth: false, requiresConfirmation: false, expectedInput: null, confidence: 1 }
      }
      if (/^(continue|resume|continue my complaint)$/i.test(lower)) {
        return { intent: 'RESUME_WORKFLOW', action: 'RESUME', requiresAuth: false, requiresConfirmation: false, expectedInput: null, confidence: 1 }
      }
      // Any other text while workflow active is PROVIDE_* — delegate to workflow
      // For CREATE_COMPLAINT workflow, the input is complaint detail; for FEEDBACK it's feedback detail
      // We conservatively return GENERAL here; caller delegates to agentOrchestrator which knows active type.
      // We mark as requiresAuth true so guest check still applies.
      return { intent: 'PROVIDE_COMPLAINT_DETAILS', action: null, requiresAuth: true, requiresConfirmation: false, expectedInput, confidence: 0.9 }
    }

    // Global cancel/pause/resume even without active workflow
    if (/^(cancel|stop|nevermind|abort)$/i.test(lower)) return { intent: 'CANCEL_ACTION', action: 'CANCEL', requiresAuth: false, requiresConfirmation: false, expectedInput: null, confidence: 1 }
    if (/^(continue|resume|continue my complaint)$/i.test(lower)) return { intent: 'RESUME_WORKFLOW', action: 'RESUME', requiresAuth: false, requiresConfirmation: false, expectedInput: null, confidence: 1 }

    // Navigation intents §14 — public, no auth
    if (/^(go to|open|navigate to|take me to|show)\s+(dashboard|complaints|history|feedback|profile|notifications|ai intelligence|recommendations|analytics|teachers|home)/i.test(lower)) {
      return { intent: 'NAVIGATION', action: 'NAVIGATE', requiresAuth: false, requiresConfirmation: false, expectedInput: null, confidence: 0.95 }
    }
    if (/^go back$/i.test(lower)) {
      return { intent: 'NAVIGATION', action: 'NAVIGATE', requiresAuth: false, requiresConfirmation: false, expectedInput: null, confidence: 0.95 }
    }

    // CREATE_COMPLAINT §15 — private
    if (/^(create a complaint|create complaint|new complaint|report an issue|file a complaint|register complaint|lodge a complaint|submit a complaint|i want to report|help me create a complaint)/i.test(lower) ||
        (/\b(is not working|broken|leaking|damaged|flickering|not cooling|dirty|jammed)\b/i.test(lower) && !/status|history|search|how/i.test(lower))) {
      return { intent: 'CREATE_COMPLAINT', action: 'CREATE_COMPLAINT', requiresAuth: true, requiresConfirmation: true, expectedInput: 'DESCRIPTION', confidence: 0.9 }
    }

    // FEEDBACK §16 — private
    if (/^(give feedback|leave feedback|rate complaint|feedback|submit feedback|rate resolution)/i.test(lower)) {
      return { intent: 'GIVE_FEEDBACK', action: 'SUBMIT_FEEDBACK', requiresAuth: true, requiresConfirmation: true, expectedInput: 'RATING', confidence: 0.92 }
    }

    // STATUS §18 — private when "my"
    if (/\b(status of|check status|track complaint|what is the status|read the timeline|timeline)\b/i.test(lower)) {
      return { intent: 'CHECK_STATUS', action: 'VIEW_COMPLAINT', requiresAuth: true, requiresConfirmation: false, expectedInput: null, confidence: 0.88 }
    }

    // SEARCH §17 — private when "my"
    if (/\b(find my|show my|search.*my|find complaints about|show my pending|show my resolved|pending complaints)\b/i.test(lower)) {
      return { intent: 'SEARCH_COMPLAINT', action: 'SEARCH_COMPLAINTS', requiresAuth: true, requiresConfirmation: false, expectedInput: null, confidence: 0.88 }
    }
    if (/^(search|find|lookup|filter)\s+(complaint|issue)/i.test(lower)) {
      return { intent: 'SEARCH_COMPLAINT', action: 'SEARCH_COMPLAINTS', requiresAuth: false, requiresConfirmation: false, expectedInput: null, confidence: 0.7 }
    }

    // Greeting
    if (/^(hi|hello|hey|greetings|good morning|good afternoon)\b/i.test(lower)) {
      return { intent: 'GREETING', action: null, requiresAuth: false, requiresConfirmation: false, expectedInput: null, confidence: 0.95 }
    }

    // Ordinal / timeline follow-ups
    if (/\b(open the first one|the second one|open it|read the details)\b/i.test(lower)) {
      return { intent: 'VIEW_COMPLAINT', action: 'VIEW_COMPLAINT', requiresAuth: true, requiresConfirmation: false, expectedInput: null, confidence: 0.85 }
    }

    return { intent: 'GENERAL_QUESTION', action: null, requiresAuth: false, requiresConfirmation: false, expectedInput: null, confidence: 0.6 }
  }

  requiresAuthForIntent(intent: Intent): boolean {
    return PRIVATE_INTENTS.has(intent)
  }
}

export const intentRouter = new IntentRouter()
