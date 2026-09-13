/**
 * CampusResolve — Single Unified Global AI Agent Context & Provider
 *
 * UNIFIED ARCHITECTURE:
 * Text and Voice are TWO INPUT/OUTPUT MODES of ONE single AI Agent.
 *
 * Both share the EXACT SAME:
 * - conversationId & sessionId
 * - messages history (conversation turns)
 * - activeWorkflow & expectedInput
 * - currentDraft
 * - pageContext
 * - authenticated user context
 *
 * MANDATORY AUTHENTICATION RULES:
 * - A guest user CANNOT create a complaint or start a complaint workflow.
 * - If a guest asks to create a complaint, the agent responds:
 *   "Please log in first. You need to be authenticated before you can create a complaint."
 *   and NO API call or database record is made.
 * - Login-then-continue: Remembers intendedAction ('CREATE_COMPLAINT') and prompts to continue after login.
 * - Logout security: Purges all private messages, workflows, drafts, and resets to guest mode.
 * - STT/TTS overlap fix with 600ms cooldown and instant barge-in.
 */

import React, { createContext, useContext, useState, useEffect, useRef, useCallback, ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import {
  ChatMessage,
  ChatResponse,
  sendChatMessage,
  createComplaintFromChat,
  submitFeedbackFromChat
} from '../services/chatbotService'
import { PageContext } from '../types/voiceAgent'
import { pageContextService } from '../services/voice/pageContextService'
import { agentOrchestrator } from '../services/voice/agentOrchestrator'
import { navigationAgent } from '../services/voice/agents/NavigationAgent'
import { speechRecognitionService } from '../services/voice/speechRecognitionService'
import { textToSpeechService } from '../services/voice/textToSpeechService'
import { VoiceState, VoiceMode, PlaybackState, VoiceAgentSettings, DEFAULT_VOICE_SETTINGS } from '../services/voice/voiceTypes'
import { ActiveWorkflow, ComplaintDraftData, FeedbackDraftData, ExpectedInputType } from '../services/voice/workflowTypes'
// Unified architecture layers (§2)
import { unifiedConversationManager } from '../services/voice/UnifiedConversationManager'
import { workflowManager } from '../services/voice/WorkflowManager'
import { intentRouter } from '../services/voice/IntentRouter'
import { authenticationManager } from '../services/voice/AuthenticationManager'
import { permissionManager } from '../services/voice/PermissionManager'
import { ragContextManager } from '../services/voice/RAGContextManager'
import { responseGenerator } from '../services/voice/ResponseGenerator'

export interface ProcessUserMessageParams {
  text: string
  source?: 'text' | 'voice'
  actionType?: string
}

export interface GlobalAIAgentContextType {
  // Section 3: One Global AI Session State
  conversationId: string
  sessionId: string
  authenticatedUser: any
  currentRoute: string
  pageContext: PageContext
  activeWorkflow: ActiveWorkflow | null
  expectedInput: ExpectedInputType | null
  collectedData: any
  conversationHistory: ChatMessage[]
  selectedEntity: any
  searchResults: any[]
  pendingAction: any
  isListening: boolean
  isProcessing: boolean
  isSpeaking: boolean
  voiceMode: VoiceMode
  requestId: string

  // UI & Additional States
  messages: ChatMessage[]
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>
  currentDraft: ComplaintDraftData | FeedbackDraftData | null
  setCurrentDraft: (draft: ComplaintDraftData | FeedbackDraftData | null) => void
  isOpen: boolean
  setIsOpen: (open: boolean) => void
  toggleOpen: () => void
  isMinimized: boolean
  setIsMinimized: (minimized: boolean) => void
  isTyping: boolean
  voiceState: VoiceState
  playbackState: PlaybackState
  isVoiceResponseEnabled: boolean
  // STRICT VOICE ACTIVATION (§1-10): voiceEnabled defaults false, TTS only when true + voice source
  voiceEnabled: boolean
  isMuted: boolean
  audioLevel: number
  transcript: string
  interimTranscript: string
  settings: VoiceAgentSettings
  isAuthenticated: boolean
  userRole: string

  // Actions
  processUserMessage: (params: ProcessUserMessageParams) => Promise<void>
  toggleVoiceMode: () => void
  toggleVoiceResponse: () => void
  toggleMute: () => void
  startListening: () => Promise<void>
  stopListening: () => void
  toggleListening: () => Promise<void>
  enableVoice: () => Promise<void>
  disableVoice: () => void
  toggleVoiceEnabled: () => Promise<void>
  pauseWorkflow: () => void
  resumeWorkflow: () => void
  cancelWorkflow: () => void
  confirmAction: () => Promise<void>
  rejectAction: () => void
  replayLastResponse: () => void
  clearChat: () => void
}

const GlobalAIAgentContext = createContext<GlobalAIAgentContextType | undefined>(undefined)

const SETTINGS_STORAGE_KEY = 'campusresolve_unified_ai_settings'

const generateUniqueId = (prefix: string = 'msg') => {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
}

const cleanSpokenText = (text: string): string => {
  if (!text) return ''
  return text
    .replace(/[*_#`\[\]]/g, '')
    .replace(/https?:\/\/\S+/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

// ── Voice Summary Helpers (§5-8) — short natural voice, not full screen text
const isDetailRequested = (text: string): boolean => {
  if (!text) return false
  return /tell me more|explain in detail|read the full|complete explanation|more details|elaborate|full details|show more|expand|detailed/i.test(text)
}

const ruleBasedVoiceSummary = (screenText: string, detailRequested = false): string => {
  if (!screenText) return ''
  let cleaned = cleanSpokenText(screenText)
    .replace(/\b(submit|cancel|edit|close|send|voice agent|settings|dashboard|login)\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  const sentences = cleaned.split(/[.!?]+/).map(s => s.trim()).filter(Boolean)
  if (sentences.length === 0) return cleaned
  if (detailRequested) {
    const subset = sentences.slice(0, 4)
    let text = subset.join('. ') + '.'
    const words = text.split(/\s+/).filter(Boolean)
    if (words.length > 65) text = words.slice(0, 62).join(' ') + '.'
    return text
  }
  let subset = sentences.slice(0, 2)
  let text = subset.join('. ') + '.'
  const words = text.split(/\s+/).filter(Boolean)
  if (words.length > 35) text = words.slice(0, 32).join(' ') + '.'
  else if (words.length < 10 && sentences[2]) {
    const ext = sentences.slice(0, 3).join('. ') + '.'
    if (ext.split(/\s+/).filter(Boolean).length <= 35) text = ext
  }
  return text
}

const ensureShortVoice = (voiceText: string, screenText: string, userQuery: string): string => {
  const detail = isDetailRequested(userQuery)
  const voiceClean = cleanSpokenText(voiceText)
  const voiceWords = voiceClean.split(/\s+/).filter(Boolean).length
  const hasComplex = /[•\-\*]\s+|\n\n|\|/.test(voiceText) || /[•\-\*]\s+|\n\n|\|/.test(screenText)
  if (!detail && (voiceWords > 38 || (hasComplex && voiceWords > 30))) {
    return ruleBasedVoiceSummary(screenText || voiceText, false)
  }
  if (detail && voiceWords > 68) {
    return ruleBasedVoiceSummary(voiceText || screenText, true)
  }
  // Never speak UI labels alone
  if (/^(submit|cancel|edit|close|send|voice agent)$/i.test(voiceClean.trim())) {
    return ruleBasedVoiceSummary(screenText, detail)
  }
  return voiceClean
}

export const GlobalAIAgentProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const location = useLocation()
  const navigate = useNavigate()

  const authUser = useAuthStore(s => s.user)
  const authRole = useAuthStore(s => s.role) || 'guest'
  const isAuthenticated = useAuthStore(s => s.isAuthenticated)

  // ── Session & Identification ──────────────────────────────────────────────
  const [sessionId, setSessionId] = useState<string>(() => `sess-${Date.now()}`)
  const [conversationId] = useState<string>(() => `conv-${Date.now()}`)

  // ── Page Context ──────────────────────────────────────────────────────────
  const [pageContext, setPageContext] = useState<PageContext>(() =>
    pageContextService.getContextFromPath(window.location.pathname)
  )

  // ── Shared Conversation History & Workflow ────────────────────────────────
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [activeWorkflow, setActiveWorkflow] = useState<ActiveWorkflow | null>(null)
  const [currentDraft, setCurrentDraft] = useState<ComplaintDraftData | FeedbackDraftData | null>(null)
  const [intendedActionAfterLogin, setIntendedActionAfterLogin] = useState<string | null>(null)

  // ── UI States ─────────────────────────────────────────────────────────────
  const [isOpen, setIsOpen] = useState<boolean>(false)
  const [isMinimized, setIsMinimized] = useState<boolean>(false)
  const [isTyping, setIsTyping] = useState<boolean>(false)

  // ── Voice Mode States ─────────────────────────────────────────────────────
  const [voiceState, setVoiceState] = useState<VoiceState>('IDLE')
  const [voiceMode, setVoiceMode] = useState<VoiceMode>('CONTINUOUS')
  const [playbackState, setPlaybackState] = useState<PlaybackState>('STOPPED')
  // STRICT: voiceEnabled defaults FALSE — text chat must remain silent (§1)
  const [voiceEnabled, setVoiceEnabled] = useState<boolean>(false)
  // isVoiceResponseEnabled kept for backward compat but always mirrors voiceEnabled
  const [isVoiceResponseEnabled, setIsVoiceResponseEnabled] = useState<boolean>(false)
  const voiceEnabledRef = useRef<boolean>(false)
  const [isMuted, setIsMuted] = useState<boolean>(false)
  const [audioLevel, setAudioLevel] = useState<number>(0)
  const [transcript, setTranscript] = useState<string>('')
  const [interimTranscript, setInterimTranscript] = useState<string>('')

  const [settings, setSettings] = useState<VoiceAgentSettings>(() => {
    try {
      const stored = localStorage.getItem(SETTINGS_STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        // STRICT: always force voiceResponseEnabled false on load, ignore stored voice preference
        return { ...DEFAULT_VOICE_SETTINGS, ...parsed, voiceResponseEnabled: false }
      }
    } catch { /* ignore */ }
    return { ...DEFAULT_VOICE_SETTINGS, voiceResponseEnabled: false }
  })

  // Cooldown and deduplication refs
  const cooldownTimerRef = useRef<any>(null)
  const isCooldownActiveRef = useRef(false)
  const isProcessingRef = useRef(false)
  const lastProcessedTranscriptRef = useRef('')
  const prevAuthStatusRef = useRef<boolean>(isAuthenticated)
  const lastSpokenMessageIdRef = useRef<string | null>(null)
  const unifiedRequestIdRef = useRef<string>(`req-${Date.now()}`)

  // ── STRICT VOICE ACTIVATION SYNC ────────────────────────────────────────
  useEffect(() => {
    voiceEnabledRef.current = voiceEnabled
    textToSpeechService.setVoiceEnabled(voiceEnabled)
    // Keep legacy flag mirrored for backwards compat
    setIsVoiceResponseEnabled(voiceEnabled)
    if (!voiceEnabled) {
      // Immediately stop everything when disabled (§2, §18)
      speechRecognitionService.stopListening()
      textToSpeechService.stop()
      if (cooldownTimerRef.current) clearTimeout(cooldownTimerRef.current)
      isCooldownActiveRef.current = false
      // Only reset to IDLE if currently in voice-related state
      setVoiceState(prev => (prev === 'LISTENING' || prev === 'USER_SPEAKING' || prev === 'AI_SPEAKING' || prev === 'PROCESSING' ? 'IDLE' : prev))
      setPlaybackState('STOPPED')
      unifiedConversationManager.setListening(false)
      unifiedConversationManager.setSpeaking(false)
    }
  }, [voiceEnabled])

  // ── 1. Route Change: Update pageContext WITHOUT resetting session ─────────
  // UnifiedConversationManager also tracks route (survives navigation per §3)
  useEffect(() => {
    const newContext = pageContextService.getContextFromPath(location.pathname)
    setPageContext(newContext)
    unifiedConversationManager.setRoute(location.pathname)
    // Keep WorkflowManager in sync — paused workflow can resume after navigation (§34)
    const wf = workflowManager.getActive() || agentOrchestrator.getActiveWorkflow()
    if (wf) {
      workflowManager.setActive(wf)
    }
  }, [location.pathname])

  // ── 2. Authentication Lifecycle (Login-Then-Continue & Logout Security) ──
  useEffect(() => {
    const prevAuth = prevAuthStatusRef.current
    prevAuthStatusRef.current = isAuthenticated

    if (!prevAuth && isAuthenticated && authUser) {
      // ── USER JUST LOGGED IN ───────────────────────────────────────────────
      const firstName = authUser?.name?.split(' ')[0] || 'there'

      // Check if user had an intended action waiting for login
      if (intendedActionAfterLogin === 'CREATE_COMPLAINT') {
        setIntendedActionAfterLogin(null)
        // Login-then-continue prompt!
        const resumeMsg: ChatMessage = {
          id: generateUniqueId('resume'),
          messageType: 'AI_TEXT',
          text: `You're logged in, **${firstName}**! Let's continue creating your complaint. Please describe the issue.`,
          spokenText: `You are logged in, ${firstName}! Let's continue creating your complaint. Please describe the issue.`,
          sender: 'bot',
          timestamp: new Date(),
          quickActions: ['The projector is flickering', 'Water leakage in washroom', 'Fan not working in lab']
        }
        setMessages(prev => [...prev, resumeMsg])
        // Initialize complaint workflow
        const wf = agentOrchestrator.getActiveWorkflow()
        setActiveWorkflow(wf)
        // STRICT: NEVER speak resume welcome automatically — only if voiceEnabled explicitly true
        // (voiceEnabled defaults false, so this remains text-only after login per §14)
        if (voiceEnabledRef.current && !isMuted) {
          textToSpeechService.speak(resumeMsg.spokenText!)
        }
      } else {
        // Standard Authenticated Welcome
        let welcomeText = `Hi ${firstName}! I'm your **CampusResolve AI Assistant**.\nI can help you create complaints, submit feedback on resolved issues, check statuses, and search history.`
        let qa = ['Help Me Create a Complaint', 'Show My Pending Complaints', 'Check Complaint Status', 'Show My Complaint History', '⭐ Give Feedback']

        if (authRole === 'admin') {
          welcomeText = `Hi **Admin**! 🛡️ Real-time campus infrastructure data is connected. Ask for statistics, departmental workloads, or feedback analytics.`
          qa = ['Campus Statistics', 'Feedback Report', 'Escalations']
        } else if (authRole === 'teacher') {
          welcomeText = `Hi **Faculty**! 🎓 I can help manage your assigned complaints, generate resolution templates, or review student feedback.`
          qa = ['View Assigned Complaints', 'Resolution Templates', 'Student Feedback Analytics']
        }

        setMessages([
          {
            id: generateUniqueId('welcome'),
            messageType: 'AI_TEXT',
            text: welcomeText,
            sender: 'bot',
            timestamp: new Date(),
            quickActions: qa
          }
        ])
      }
    } else if (prevAuth && !isAuthenticated) {
      // ── USER LOGGED OUT (LOGOUT SECURITY §12) ─────────────────────────────
      // Purge private conversation context, active workflows, drafts, stop audio
      // STRICT: also disable voiceEnabled immediately
      setVoiceEnabled(false)
      speechRecognitionService.stopListening()
      textToSpeechService.stop()
      setVoiceState('IDLE')
      setActiveWorkflow(null)
      setCurrentDraft(null)
      setIntendedActionAfterLogin(null)
      agentOrchestrator.resetSession()
      workflowManager.clearAll()
      unifiedConversationManager.purgePrivateState()
      authenticationManager.clearIntendedAction()
      unifiedRequestIdRef.current = `req-${Date.now()}`
      setSessionId(`sess-${Date.now()}`)

      // Reset to Guest Welcome
      setMessages([
        {
          id: generateUniqueId('guest-welcome'),
          messageType: 'AI_TEXT',
          text: `Welcome to CampusResolve! 🏛️ I'm your **Public Campus Assistant**.\n\nI can answer general questions about filing grievances, resolution workflows, feedback policies, and login support.\n\n🔒 *Please sign in to access your personal complaints, status tracking, and feedback history.*`,
          sender: 'bot',
          timestamp: new Date(),
          quickActions: ['How to Submit a Complaint', 'How Complaint Tracking Works', 'Feedback Information', 'Login Help']
        }
      ])
    } else if (messages.length === 0) {
      // Initial mount
      if (isAuthenticated && authUser) {
        const firstName = authUser?.name?.split(' ')[0] || 'there'
        setMessages([
          {
            id: generateUniqueId('welcome'),
            messageType: 'AI_TEXT',
            text: `Hi ${firstName}! I'm your **CampusResolve AI Assistant**.\nI can help you create complaints, submit feedback on resolved issues, check statuses, and search history.`,
            sender: 'bot',
            timestamp: new Date(),
            quickActions: ['Help Me Create a Complaint', 'Show My Pending Complaints', 'Check Complaint Status', '⭐ Give Feedback']
          }
        ])
      } else {
        setMessages([
          {
            id: generateUniqueId('guest-welcome'),
            messageType: 'AI_TEXT',
            text: `Welcome to CampusResolve! 🏛️ I'm your **Public Campus Assistant**.\n\nI can answer general questions about filing grievances, resolution workflows, feedback policies, and login support.\n\n🔒 *Please sign in to access your personal complaints, status tracking, and feedback history.*`,
            sender: 'bot',
            timestamp: new Date(),
            quickActions: ['How to Submit a Complaint', 'How Complaint Tracking Works', 'Feedback Information', 'Login Help']
          }
        ])
      }
    }
  }, [isAuthenticated, authUser, authRole])

  // ── 3. STT, VAD, Barge-In & Overlap Protection ────────────────────────────
  useEffect(() => {
    speechRecognitionService.onTranscript = (res) => {
      if (isCooldownActiveRef.current) return
      if (res.isFinal) {
        setTranscript(res.transcript)
        setInterimTranscript('')
      } else {
        setInterimTranscript(res.transcript)
      }
    }

    speechRecognitionService.onAudioLevel = (lvl) => {
      setAudioLevel(lvl)
    }

    // Barge-in: if user starts speaking while AI speaks -> stop TTS immediately!
    speechRecognitionService.onSpeechStart = () => {
      if (textToSpeechService.isSpeaking()) {
        console.log('[GlobalAIAgent] Barge-in: user interrupted TTS')
        textToSpeechService.stop()
        setPlaybackState('STOPPED')
      }
      setVoiceState('USER_SPEAKING')
    }

    speechRecognitionService.onSpeechEnd = () => {
      // Silence timer in STT triggers onFinalTranscript
    }

    speechRecognitionService.onStateChange = (st) => {
      if (st === 'LISTENING') {
        setVoiceState('LISTENING')
      } else if (st === 'IDLE' && voiceState !== 'AI_SPEAKING' && voiceState !== 'PROCESSING') {
        setVoiceState('IDLE')
      }
    }

    speechRecognitionService.onFinalTranscript = (text) => {
      // STRICT: only process voice transcript when voiceEnabled true (§11)
      if (!voiceEnabledRef.current) return
      if (!text || !text.trim() || isCooldownActiveRef.current) return
      void processUserMessage({ text: text.trim(), source: 'voice' })
    }

    speechRecognitionService.onError = (err) => {
      if (err.isPermissionDenied) {
        setVoiceState('ERROR')
        const errMsg: ChatMessage = {
          id: generateUniqueId('err'),
          messageType: 'AI_TEXT',
          text: 'Microphone permission was denied. Please allow microphone access in your browser settings to use voice input.',
          sender: 'bot',
          timestamp: new Date()
        }
        setMessages(prev => [...prev, errMsg])
      }
    }

    // TTS Callbacks & Overlap Fix (mute mic while speaking + 600ms cooldown)
    textToSpeechService.onStart = () => {
      setPlaybackState('PLAYING')
      setVoiceState('AI_SPEAKING')
      speechRecognitionService.stopListening()
    }

    textToSpeechService.onEnd = () => {
      setPlaybackState('STOPPED')
      isCooldownActiveRef.current = true
      if (cooldownTimerRef.current) clearTimeout(cooldownTimerRef.current)

      cooldownTimerRef.current = setTimeout(() => {
        isCooldownActiveRef.current = false
        // STRICT: only auto-resume listening if voiceEnabled explicitly true (§11)
        if (voiceEnabledRef.current && voiceMode === 'CONTINUOUS' && isOpen) {
          setVoiceState('LISTENING')
          void speechRecognitionService.startListening()
        } else {
          setVoiceState('IDLE')
        }
      }, 600)
    }

    textToSpeechService.onStateChange = (st) => {
      setPlaybackState(st)
    }
  }, [voiceMode, isOpen, voiceState])

  // ── 4. ONE UNIFIED MESSAGE PIPELINE — Text & Voice share SAME processUserMessage() ──
  // Architecture per §2: UnifiedConversationManager → WorkflowManager → IntentRouter
  // → AuthenticationManager → PermissionManager → RAGContextManager → AgentOrchestrator
  // → ActionExecutor (existing Backend APIs) → ResponseGenerator → Text UI / TTS
  const processUserMessage = useCallback(async ({
    text,
    source = 'text',
    actionType
  }: ProcessUserMessageParams): Promise<void> => {
    const raw = (text || '').trim()
    if (!raw && !actionType) return

    // §24 Request deduplication — unified + local short-circuit
    const requestId = unifiedRequestIdRef.current = `req-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
    if (source === 'voice' && raw) {
      if (unifiedConversationManager.isDuplicateRequest(raw, requestId)) {
        console.log('[GlobalAIAgent] Deduplicating voice transcript (unified):', raw)
        return
      }
      if (raw.toLowerCase() === lastProcessedTranscriptRef.current) {
        console.log('[GlobalAIAgent] Deduplicating voice transcript:', raw)
        return
      }
      lastProcessedTranscriptRef.current = raw.toLowerCase()
      setTimeout(() => {
        if (lastProcessedTranscriptRef.current === raw.toLowerCase()) {
          lastProcessedTranscriptRef.current = ''
        }
      }, 2500)
    } else if (raw && unifiedConversationManager.isDuplicateRequest(raw, requestId)) {
      // Text dedup as well (prevent double-click sends)
      if (isProcessingRef.current) return
    }

    // Append User Message to the shared conversation (both text & voice → same history)
    if (raw) {
      const userMsg: ChatMessage = {
        id: generateUniqueId('user'),
        messageType: 'USER_TEXT',
        text: raw,
        sender: 'user',
        timestamp: new Date()
      }
      setMessages(prev => [...prev, userMsg])
      unifiedConversationManager.appendMessage(userMsg)
      setTranscript(raw)
      setInterimTranscript('')
    }

    setIsTyping(true)
    setVoiceState('PROCESSING')
    isProcessingRef.current = true
    unifiedConversationManager.setProcessing(true)

    const lower = raw.toLowerCase()
    const detailRequested = isDetailRequested(raw)

    // ── STEP 1: UNIFIED AUTH CHECK via IntentRouter + AuthenticationManager (§9) ─
    // Classify intent first, then enforce auth (hard security)
    const hasActiveWf = !!(workflowManager.getActive() || agentOrchestrator.getActiveWorkflow())
    const currentExpected = workflowManager.getActive()?.expectedInput || agentOrchestrator.getActiveWorkflow()?.expectedInput || null
    const intentResult = intentRouter.classify(raw, hasActiveWf, currentExpected)

    const isComplaintAction = intentResult.intent === 'CREATE_COMPLAINT' || intentResult.intent === 'PROVIDE_COMPLAINT_DETAILS' && /complaint/i.test(raw)
    // Preserve original private check but also respect IntentRouter
    const legacyIsComplaint =
      /^(create a complaint|create complaint|new complaint|report an issue|file a complaint|register complaint|lodge a complaint|submit a complaint|i want to report|help me create a complaint)/i.test(lower) ||
      (/\b(is not working|broken|leaking|damaged|flickering|not cooling|dirty|jammed)\b/i.test(lower) && !/status|history|search|how/i.test(lower))
    const legacyIsPrivate = legacyIsComplaint || /^(show my complaints|my complaints|my pending|my tickets|show my notifications|give feedback|submit feedback|rate complaint)/i.test(lower)
    const isPrivateAction = intentResult.requiresAuth || legacyIsPrivate
    const actualComplaintAction = isComplaintAction || legacyIsComplaint

    if (!isAuthenticated && isPrivateAction) {
      setIsTyping(false)
      setVoiceState('IDLE')
      isProcessingRef.current = false
      unifiedConversationManager.setProcessing(false)

      if (actualComplaintAction) {
        setIntendedActionAfterLogin('CREATE_COMPLAINT')
        authenticationManager.storeIntendedAction('CREATE_COMPLAINT')
      }

      // Also enforce via AuthenticationManager for audit trail
      authenticationManager.requireAuthFor(actualComplaintAction ? 'CREATE_COMPLAINT' : 'VIEW_PERSONAL_COMPLAINTS')

      const requiredMsg = actualComplaintAction
        ? 'Please log in first. You need to be authenticated before you can create a complaint.'
        : 'Please log in first. You need to be authenticated to access your personal complaints and feedback.'

      const botMsg: ChatMessage = {
        id: generateUniqueId('bot-auth'),
        messageType: 'AI_TEXT',
        text: `🔒 **Authentication Required**\n\n${requiredMsg}`,
        spokenText: requiredMsg,
        sender: 'bot',
        timestamp: new Date(),
        widgetData: { type: 'AUTH_REQUIRED', ctaText: 'Sign In to Continue', target: '/login' },
        quickActions: ['Sign In', 'How to Submit a Complaint', 'What is CampusResolve?', 'Login Help']
      }

      setMessages(prev => [...prev, botMsg])
      unifiedConversationManager.appendMessage(botMsg)

      // STRICT: TTS only if voiceEnabled === true AND source === 'voice' (§10)
      if (voiceEnabledRef.current && source === 'voice' && !isMuted) {
        textToSpeechService.stop() // §22: stop previous TTS before new
        textToSpeechService.speak(requiredMsg)
      } else {
        setVoiceState('IDLE')
      }
      return
    }

    // Permission check (§10) — e.g. teacher cannot create student complaint
    if (isAuthenticated && actualComplaintAction && !permissionManager.canCreateComplaint() && intentResult.intent === 'CREATE_COMPLAINT') {
      // Admin/teacher attempting student action — still allow via backend but note role
      // Do not block at frontend; backend will enforce via JWT role
    }

    // ── STEP 2: WORKFLOW + INTENT ROUTING (§2 → WorkflowManager → IntentRouter → AgentOrchestrator) ─
    try {
      // Sync WorkflowManager with AgentOrchestrator memory
      const activeWf = workflowManager.getActive() || agentOrchestrator.getActiveWorkflow()
      if (activeWf && !workflowManager.getActive()) workflowManager.setActive(activeWf)
      const isFeedbackAction = /^(give feedback|leave feedback|rate complaint|feedback|submit feedback|rate resolution)/i.test(lower)
      const isResumeOrCancel = /^(cancel|stop|nevermind|pause|continue|resume|continue my complaint)$/i.test(lower)

      // RAG scope selection (§19) — enforced in backend but tracked here
      void ragContextManager.buildContext(raw, pageContext)

      // §34 Navigation mid-workflow: "Go to dashboard" should pause, not be consumed as slot value
      if (activeWf && intentResult.intent === 'NAVIGATION') {
        // IntentRouter may not detect nav when workflow active — also try direct resolver
        const navDuringWf = navigationAgent.resolveNavigation(raw)
        if (navDuringWf) {
          workflowManager.pause()
          // Also pause in orchestrator memory if possible
          try { (agentOrchestrator as any).memory && ((agentOrchestrator as any).memory.pausedWorkflow = (agentOrchestrator as any).memory.activeWorkflow); (agentOrchestrator as any).memory.activeWorkflow = null } catch { /* ignore */ }
          const navRes = navigationAgent.handleNavigation(navDuringWf)
          navigate(navDuringWf.path)
          unifiedConversationManager.setRoute(navDuringWf.path)
          const botMsg: ChatMessage = {
            id: generateUniqueId('nav-paused'),
            messageType: 'AI_TEXT',
            text: `${navRes.screenResponse}\n\n*Your complaint draft is paused. Say **"Continue my complaint"** to resume.*`,
            spokenText: `${navRes.voiceResponse} Your complaint draft is paused. Say continue to resume.`,
            sender: 'bot',
            timestamp: new Date()
          }
          setMessages(prev => [...prev, botMsg])
          unifiedConversationManager.appendMessage(botMsg)
          setIsTyping(false); setVoiceState('IDLE'); isProcessingRef.current = false; unifiedConversationManager.setProcessing(false)
          // STRICT: only speak if voiceEnabled && voice source
          if (voiceEnabledRef.current && source === 'voice' && navRes.voiceResponse && !isMuted) {
            textToSpeechService.stop(); textToSpeechService.speak(`${navRes.voiceResponse} Your complaint draft is paused. Say continue to resume.`)
          }
          return
        }
      }
      // Explicit nav check even when IntentRouter missed due to active workflow
      const earlyNav = navigationAgent.resolveNavigation(raw)
      if (earlyNav && activeWf) {
        workflowManager.pause()
        try { (agentOrchestrator as any).memory && ((agentOrchestrator as any).memory.pausedWorkflow = (agentOrchestrator as any).memory.activeWorkflow); (agentOrchestrator as any).memory.activeWorkflow = null } catch { /* ignore */ }
        const navRes = navigationAgent.handleNavigation(earlyNav)
        navigate(earlyNav.path)
        unifiedConversationManager.setRoute(earlyNav.path)
        const botMsg: ChatMessage = { id: generateUniqueId('nav-paused2'), messageType: 'AI_TEXT', text: `${navRes.screenResponse}\n\n*Your complaint draft is paused. Say **"Continue my complaint"** to resume.*`, spokenText: `${navRes.voiceResponse} Your complaint draft is paused. Say continue to resume.`, sender: 'bot', timestamp: new Date() }
        setMessages(prev => [...prev, botMsg])
        unifiedConversationManager.appendMessage(botMsg)
        setIsTyping(false); setVoiceState('IDLE'); isProcessingRef.current = false; unifiedConversationManager.setProcessing(false)
        if (voiceEnabledRef.current && source === 'voice' && navRes.voiceResponse && !isMuted) { textToSpeechService.stop(); textToSpeechService.speak(`${navRes.voiceResponse} Your complaint draft is paused. Say continue to resume.`) }
        return
      }

      if (activeWf || isComplaintAction || isFeedbackAction || isResumeOrCancel || intentResult.intent === 'RESUME_WORKFLOW' || intentResult.intent === 'PAUSE_WORKFLOW') {
        const agentRes = await agentOrchestrator.processMessage(raw, async (act) => {
          // Action execution within active workflow
          if (act.type === 'CREATE_COMPLAINT') {
            if (!isAuthenticated) throw new Error('Authentication required')
            const draft = act.payload
            const res = await createComplaintFromChat({
              title: draft.title || `${draft.category || 'Infrastructure'} Issue`,
              category: draft.category || 'Infrastructure',
              department: draft.department || authUser?.department || 'CSE',
              location: draft.location || '',
              priority: draft.priority || 'medium',
              description: draft.description || ''
            })
            setActiveWorkflow(null)
            setCurrentDraft(null)
            return { complaintId: res.complaint?.complaintId || res.complaint?._id || 'Submitted' }
          }
          if (act.type === 'SUBMIT_FEEDBACK') {
            if (!isAuthenticated) throw new Error('Authentication required')
            const fb = act.payload
            await submitFeedbackFromChat({
              complaintId: fb.complaintId,
              rating: fb.rating || 5,
              comment: fb.feedbackText || 'Resolution completed satisfactorily.',
              category: 'Resolution Satisfaction'
            })
            setActiveWorkflow(null)
            setCurrentDraft(null)
            return { success: true }
          }
          if (act.type === 'NAVIGATE') {
            navigate(act.payload.path)
            return { success: true }
          }
        })

        if (agentRes.screenResponse) {
          const structured = responseGenerator.fromAgentResponse(agentRes, intentResult.intent)
          const rawVoice = structured.voiceResponse || cleanSpokenText(agentRes.screenResponse)
          const spoken = ensureShortVoice(rawVoice, agentRes.screenResponse, raw)
          const botMsg: ChatMessage = {
            id: generateUniqueId('bot'),
            messageType: agentRes.requiresConfirmation ? 'COMPLAINT_PREVIEW' : 'AI_TEXT',
            text: structured.screenResponse,
            spokenText: spoken,
            sender: 'bot',
            timestamp: new Date(),
            quickActions: agentRes.quickActions,
            structuredComplaint: agentRes.complaintDraft as any,
            structuredFeedback: agentRes.feedbackDraft as any
          }

          setMessages(prev => [...prev, botMsg])
          unifiedConversationManager.appendMessage(botMsg)
          const nextWf = agentOrchestrator.getActiveWorkflow()
          setActiveWorkflow(nextWf)
          workflowManager.setActive(nextWf)
          if (nextWf) workflowManager.clearPaused()
          setCurrentDraft(agentRes.complaintDraft || agentRes.feedbackDraft || null)
          if (agentRes.complaintDraft || agentRes.feedbackDraft) {
            unifiedConversationManager.setSelectedEntity(agentRes.complaintDraft || agentRes.feedbackDraft)
          }

          if (agentRes.navigationTarget) {
            navigate(agentRes.navigationTarget)
          }

          // STRICT TTS GUARD (§10): only when voiceEnabled && voice source
          if (voiceEnabledRef.current && source === 'voice' && spoken && !isMuted) {
            textToSpeechService.stop()
            textToSpeechService.speak(spoken)
          } else {
            setVoiceState('IDLE')
            unifiedConversationManager.setSpeaking(false)
            // DO NOT auto-restart listening for text source — only voice mode
          }
          return
        }
      }

      // ── STEP 3: NAVIGATION COMMAND CHECK (§14) ────────────────────────────
      const navRoute = navigationAgent.resolveNavigation(raw)
      if (navRoute) {
        const navRes = navigationAgent.handleNavigation(navRoute)
        navigate(navRoute.path)
        unifiedConversationManager.setRoute(navRoute.path)
        const botMsg: ChatMessage = {
          id: generateUniqueId('nav'),
          messageType: 'AI_TEXT',
          text: navRes.screenResponse,
          spokenText: navRes.voiceResponse,
          sender: 'bot',
          timestamp: new Date()
        }
        setMessages(prev => [...prev, botMsg])
        unifiedConversationManager.appendMessage(botMsg)

        if (voiceEnabledRef.current && source === 'voice' && navRes.voiceResponse && !isMuted) {
          textToSpeechService.stop()
          textToSpeechService.speak(navRes.voiceResponse)
        } else {
          setVoiceState('IDLE')
          unifiedConversationManager.setSpeaking(false)
        }
        return
      }

      // ── STEP 4: BACKEND RAG & GEMINI FALLBACK (ActionExecutor → Backend APIs → ResponseGenerator) ─
      const abortSignal = unifiedConversationManager.createAbortController()
      const chatRes: ChatResponse = await sendChatMessage({
        message: raw,
        sessionId,
        conversationState: (activeWf as any)?.currentStep || undefined,
        isVoiceMode: voiceEnabledRef.current && source === 'voice',
        pageContext,
        actionType,
        requestId,
        previousAssistantMessage: unifiedConversationManager.getLastAssistantMessage(),
        history: unifiedConversationManager.getHistoryPayload()
      } as any)

      // Stale-request protection (§24): if aborted, ignore
      if (abortSignal.aborted) return

      const rawSpoken = (chatRes as any).spokenText || cleanSpokenText(chatRes.text)
      const spoken = ensureShortVoice(rawSpoken, chatRes.text, raw)
      const botMsg: ChatMessage = {
        id: generateUniqueId('bot-rag'),
        messageType: chatRes.messageType || 'AI_TEXT',
        text: chatRes.text,
        spokenText: spoken,
        sender: 'bot',
        timestamp: new Date(),
        quickActions: chatRes.quickActions,
        structuredComplaint: chatRes.structuredComplaint,
        structuredFeedback: chatRes.structuredFeedback,
        duplicateMatches: chatRes.duplicateMatches,
        queryResults: chatRes.queryResults,
        ragSources: (chatRes as any).ragSources,
        widgetData: (chatRes as any).widgetData
      }

      setMessages(prev => [...prev, botMsg])
      unifiedConversationManager.appendMessage(botMsg)
      if (chatRes.queryResults) {
        unifiedConversationManager.setSearchResults(chatRes.queryResults)
        // Also set for ordinal resolution in agentOrchestrator
        agentOrchestrator.setRecentResults(chatRes.queryResults.map((c: any) => ({ id: c.complaintId || c._id, title: c.title || c.category })))
      }

      // STRICT: only speak when voiceEnabled && voice source
      if (voiceEnabledRef.current && source === 'voice' && spoken && !isMuted) {
        textToSpeechService.stop()
        textToSpeechService.speak(spoken)
      } else {
        setVoiceState('IDLE')
        unifiedConversationManager.setSpeaking(false)
      }
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        // Stale request cancelled by barge-in — silently ignore
        setIsTyping(false)
        isProcessingRef.current = false
        unifiedConversationManager.setProcessing(false)
        return
      }
      console.error('[GlobalAIAgent] Message processing error:', err)
      const errorMsg: ChatMessage = {
        id: generateUniqueId('err'),
        messageType: 'ERROR_MESSAGE',
        text: 'Sorry, I encountered an issue processing your request. Please try again.',
        spokenText: 'Sorry, I encountered an issue processing your request. Please try again.',
        sender: 'bot',
        timestamp: new Date()
      }
      setMessages(prev => [...prev, errorMsg])
      unifiedConversationManager.appendMessage(errorMsg)
      setVoiceState('IDLE')
      unifiedConversationManager.setSpeaking(false)
      unifiedConversationManager.setProcessing(false)
      if (voiceEnabledRef.current && source === 'voice' && !isMuted) {
        textToSpeechService.stop()
        textToSpeechService.speak(errorMsg.spokenText!)
      }
    } finally {
      setIsTyping(false)
      isProcessingRef.current = false
      unifiedConversationManager.setProcessing(false)
    }
  }, [isAuthenticated, authUser, sessionId, pageContext, voiceMode, isMuted, isOpen, navigate])

  // ── Public Controls (single mic/TTS instance per §29) ───────────────────
  // STRICT: startListening only allowed when voiceEnabled === true (§11)
  const startListening = async () => {
    if (!voiceEnabledRef.current) return
    if (isCooldownActiveRef.current) return
    textToSpeechService.stop() // §22 stop previous TTS before listening
    setIsOpen(true)
    setIsMinimized(false)
    setVoiceState('LISTENING')
    unifiedConversationManager.setListening(true)
    await speechRecognitionService.startListening()
  }

  const stopListening = () => {
    speechRecognitionService.stopListening()
    textToSpeechService.stop()
    unifiedConversationManager.abortInFlight()
    unifiedConversationManager.setListening(false)
    unifiedConversationManager.setSpeaking(false)
    // Keep voiceEnabled as-is; only voice state goes IDLE. Disable via disableVoice.
    setVoiceState('IDLE')
  }

  const toggleListening = async () => {
    if (!voiceEnabledRef.current) return
    if (voiceState === 'LISTENING' || voiceState === 'USER_SPEAKING') {
      stopListening()
    } else {
      await startListening()
    }
  }

  // STRICT VOICE ACTIVATION controls (§2-10)
  const enableVoice = async () => {
    setVoiceEnabled(true)
    voiceEnabledRef.current = true
    textToSpeechService.setVoiceEnabled(true)
    setIsVoiceResponseEnabled(true)
    setIsOpen(true)
    setIsMinimized(false)
    // small delay to ensure state propagated before listening
    setTimeout(async () => {
      if (isCooldownActiveRef.current) return
      textToSpeechService.stop()
      setVoiceState('LISTENING')
      unifiedConversationManager.setListening(true)
      await speechRecognitionService.startListening()
    }, 50)
  }

  const disableVoice = () => {
    setVoiceEnabled(false)
    voiceEnabledRef.current = false
    textToSpeechService.setVoiceEnabled(false)
    setIsVoiceResponseEnabled(false)
    speechRecognitionService.stopListening()
    textToSpeechService.stop()
    if (cooldownTimerRef.current) clearTimeout(cooldownTimerRef.current)
    isCooldownActiveRef.current = false
    unifiedConversationManager.abortInFlight()
    unifiedConversationManager.setListening(false)
    unifiedConversationManager.setSpeaking(false)
    setVoiceState('IDLE')
    setPlaybackState('STOPPED')
    setAudioLevel(0)
    setTranscript('')
    setInterimTranscript('')
  }

  const toggleVoiceEnabled = async () => {
    if (voiceEnabledRef.current) {
      disableVoice()
    } else {
      await enableVoice()
    }
  }

  const toggleVoiceMode = () => {
    setVoiceMode(prev => (prev === 'CONTINUOUS' ? 'PUSH_TO_TALK' : 'CONTINUOUS'))
  }

  const toggleVoiceResponse = () => {
    // Legacy toggle — now strictly mirrors voiceEnabled (§10)
    void toggleVoiceEnabled()
  }

  const toggleMute = () => {
    setIsMuted(prev => !prev)
  }

  const toggleOpen = () => {
    if (isOpen) {
      setIsOpen(false)
      // Do NOT disable voiceEnabled on close — but stop listening/TTS to avoid background mic
      // When reopened, voice remains OFF unless user explicitly enables again? 
      // Spec §7: if Voice was OFF, reopen stays OFF; if ON and architecture allows persist, keep enabled but don't auto-start.
      // So we stop listening but keep voiceEnabled flag if true, but don't auto-speak.
      speechRecognitionService.stopListening()
      textToSpeechService.stop()
      setVoiceState('IDLE')
      setPlaybackState('STOPPED')
    } else {
      setIsOpen(true)
      setIsMinimized(false)
      // STRICT: never auto-start voice on open — user must press Voice Agent button
    }
  }

  const confirmAction = async () => {
    await processUserMessage({ text: 'Yes, submit it', source: 'text' })
  }

  const rejectAction = () => {
    void processUserMessage({ text: 'No, cancel', source: 'text' })
  }

  const pauseWorkflow = () => {
    void processUserMessage({ text: 'Pause', source: 'text' })
  }

  const resumeWorkflow = () => {
    void processUserMessage({ text: 'Continue', source: 'text' })
  }

  const cancelWorkflow = () => {
    void processUserMessage({ text: 'Cancel', source: 'text' })
  }

  const replayLastResponse = () => {
    if (!voiceEnabledRef.current) return
    const lastBotMsg = [...messages].reverse().find(m => m.sender === 'bot')
    if (lastBotMsg) {
      const textToSpeak = lastBotMsg.spokenText || cleanSpokenText(lastBotMsg.text)
      textToSpeechService.speak(textToSpeak)
    }
  }

  const clearChat = () => {
    setMessages([])
    setActiveWorkflow(null)
    setCurrentDraft(null)
    workflowManager.clearAll()
    unifiedConversationManager.clearConversation()
    agentOrchestrator.resetSession()
    textToSpeechService.stop()
    speechRecognitionService.stopListening()
  }

  return (
    <GlobalAIAgentContext.Provider
      value={{
        // Section 3: One Global AI Session (survives route changes)
        conversationId,
        sessionId,
        authenticatedUser: authUser,
        currentRoute: location.pathname,
        pageContext,
        activeWorkflow,
        expectedInput: activeWorkflow?.expectedInput || null,
        collectedData: activeWorkflow?.collectedData || currentDraft || null,
        conversationHistory: messages,
        selectedEntity: (activeWorkflow?.collectedData as any)?.complaintId || unifiedConversationManager.getState().selectedEntity || null,
        searchResults: unifiedConversationManager.getState().searchResults || [],
        pendingAction: activeWorkflow?.status === 'AWAITING_CONFIRMATION' ? 'CONFIRM_SUBMISSION' : null,
        isListening: voiceState === 'LISTENING' || voiceState === 'USER_SPEAKING',
        isProcessing: voiceState === 'PROCESSING' || isTyping,
        isSpeaking: playbackState === 'PLAYING' || voiceState === 'AI_SPEAKING',
        voiceMode,
        requestId: unifiedRequestIdRef.current,

        // UI & Shared Conversation
        messages,
        setMessages,
        currentDraft,
        setCurrentDraft,
        isOpen,
        isMinimized,
        isTyping,
        voiceState,
        playbackState,
        isVoiceResponseEnabled,
        voiceEnabled,
        isMuted,
        audioLevel,
        transcript,
        interimTranscript,
        settings,
        isAuthenticated,
        userRole: authRole,

        // Actions
        processUserMessage,
        setIsOpen,
        toggleOpen,
        setIsMinimized,
        toggleVoiceMode,
        toggleVoiceResponse,
        toggleMute,
        startListening,
        stopListening,
        toggleListening,
        enableVoice,
        disableVoice,
        toggleVoiceEnabled,
        pauseWorkflow,
        resumeWorkflow,
        cancelWorkflow,
        confirmAction,
        rejectAction,
        replayLastResponse,
        clearChat
      }}
    >
      {children}
    </GlobalAIAgentContext.Provider>
  )
}

export const useGlobalAIAgent = () => {
  const ctx = useContext(GlobalAIAgentContext)
  if (!ctx) {
    throw new Error('useGlobalAIAgent must be used within a GlobalAIAgentProvider')
  }
  return ctx
}
