/**
 * CampusResolve AI Orchestrator v2
 * 
 * Pipeline Architecture:
 *   Message → MessageAnalyzer → ConversationStateEngine → Intent Router
 *                                                          ├── Application Actions (deterministic)
 *                                                          ├── Complaint Workflow (state machine + LLM)
 *                                                          ├── Feedback Workflow (state machine + LLM)
 *                                                          ├── Personal Database Tools (secure filtered queries)
 *                                                          └── RAG Pipeline (public knowledge only)
 *                                                                ↓
 *                                                          ResponseValidator → Response
 */

const mongoose = require('mongoose')
const Complaint = require('../models/Complaint')
const Student = require('../models/Student')
const Teacher = require('../models/Teacher')
const Feedback = require('../models/Feedback')
const { inMemoryStore } = require('./inMemoryStore')
const { getNextComplaintId } = require('./complaintIdService')
const { searchCampusKnowledge, buildRAGContext } = require('./ragEngine')
const { analyzeCurrentMessage, MESSAGE_CATEGORIES } = require('./messageAnalyzer')
const { STATES, normalizeState, transition, getFallbackResponse, getQuickActionsForState, isWorkflowActive } = require('./conversationStateEngine')
const { validateResponse } = require('./responseValidator')
const {
  extractComplaintDraft,
  evaluateComplaintQuality,
  analyzeFeedback,
  askGemini
} = require('./aiSimulator')
const {
  findDuplicateComplaints,
  joinExistingComplaint
} = require('./duplicateDetectionEngine')

// ── Legacy Exports (backward compat) ─────────────────────────────────────────
const CONVERSATION_STATES = { ...STATES }
const INTENTS = {
  CREATE_COMPLAINT: 'CREATE_COMPLAINT',
  PROVIDE_COMPLAINT_DETAILS: 'PROVIDE_COMPLAINT_DETAILS',
  CHECK_COMPLAINT_STATUS: 'CHECK_COMPLAINT_STATUS',
  SHOW_PENDING_COMPLAINTS: 'SHOW_PENDING_COMPLAINTS',
  SHOW_RESOLVED_COMPLAINTS: 'SHOW_RESOLVED_COMPLAINTS',
  SHOW_COMPLAINT_HISTORY: 'SHOW_COMPLAINT_HISTORY',
  GIVE_FEEDBACK: 'GIVE_FEEDBACK',
  EDIT_FEEDBACK: 'EDIT_FEEDBACK',
  SUBMIT_FEEDBACK: 'SUBMIT_FEEDBACK',
  CANCEL_ACTION: 'CANCEL_ACTION',
  GENERAL_QUESTION: 'GENERAL_QUESTION',
  GREETING: 'GREETING',
  LOGIN_HELP: 'LOGIN_HELP'
}

// ── Deduplication Request Cache (TTL 30 seconds) ─────────────────────────────
const processedRequestCache = new Map()

const isRequestDuplicate = (requestId) => {
  if (!requestId) return false
  if (processedRequestCache.has(requestId)) return true
  processedRequestCache.set(requestId, Date.now())
  // Cleanup entries older than 30s
  if (processedRequestCache.size > 200) {
    const now = Date.now()
    for (const [key, ts] of processedRequestCache.entries()) {
      if (now - ts > 30000) processedRequestCache.delete(key)
    }
  }
  return false
}

// ── Application Database Tools ───────────────────────────────────────────────
// All personal queries enforce strict userId/email authorization

const getMyPendingComplaints = async (user) => {
  const studentId = user?.studentId || user?._id?.toString() || ''
  const studentEmail = (user?.email || '').toLowerCase()
  const pendingStatuses = ['Submitted', 'Assigned', 'In Progress', 'Escalated']

  try {
    if (mongoose.connection.readyState === 1) {
      return await Complaint.find({
        $or: [
          studentId ? { studentId } : null,
          studentEmail ? { studentEmail } : null
        ].filter(Boolean),
        status: { $in: pendingStatuses }
      }).sort({ createdAt: -1 }).limit(10).lean()
    } else if (inMemoryStore && Array.isArray(inMemoryStore.complaints)) {
      return inMemoryStore.complaints.filter(c =>
        ((c.studentId && c.studentId === studentId) || (c.studentEmail && c.studentEmail.toLowerCase() === studentEmail)) &&
        pendingStatuses.includes(c.status)
      ).slice(0, 10)
    }
    return []
  } catch (err) {
    console.error('[AI Tool] getMyPendingComplaints error:', err.message)
    return []
  }
}

const getMyComplaintStatus = async (user, complaintId) => {
  const studentId = user?.studentId || user?._id?.toString() || ''
  const userEmail = (user?.email || '').toLowerCase()
  const targetId = (complaintId || '').trim().toUpperCase()

  try {
    let complaint = null
    if (mongoose.connection.readyState === 1) {
      complaint = await Complaint.findOne({
        $or: [
          { complaintId: targetId },
          mongoose.Types.ObjectId.isValid(targetId) ? { _id: targetId } : null
        ].filter(Boolean)
      }).lean()
    } else if (inMemoryStore && Array.isArray(inMemoryStore.complaints)) {
      complaint = inMemoryStore.complaints.find(c =>
        (c.complaintId && c.complaintId.toUpperCase() === targetId) || String(c._id) === targetId
      )
    }

    if (!complaint) return { found: false, unauthorized: false }

    const isOwner = (complaint.studentId && complaint.studentId === studentId) ||
                    (complaint.studentEmail && complaint.studentEmail.toLowerCase() === userEmail)
    const isTeacher = user?.role === 'teacher' && (complaint.assignedTeacherId === (user?.teacherId || user?._id?.toString()) || complaint.assignedTeacherEmail === userEmail)
    const isAdmin = user?.role === 'admin'

    if (isOwner || isTeacher || isAdmin) {
      return { found: true, unauthorized: false, complaint }
    }
    return { found: true, unauthorized: true, complaint: null }
  } catch (err) {
    console.error('[AI Tool] getMyComplaintStatus error:', err.message)
    return { found: false, unauthorized: false }
  }
}

const getMyComplaintHistory = async (user, limit = 10) => {
  const studentId = user?.studentId || user?._id?.toString() || ''
  const studentEmail = (user?.email || '').toLowerCase()

  try {
    if (mongoose.connection.readyState === 1) {
      return await Complaint.find({
        $or: [
          studentId ? { studentId } : null,
          studentEmail ? { studentEmail } : null
        ].filter(Boolean)
      }).sort({ createdAt: -1 }).limit(limit).lean()
    } else if (inMemoryStore && Array.isArray(inMemoryStore.complaints)) {
      return inMemoryStore.complaints.filter(c =>
        (c.studentId && c.studentId === studentId) || (c.studentEmail && c.studentEmail.toLowerCase() === studentEmail)
      ).slice(0, limit)
    }
    return []
  } catch (err) {
    console.error('[AI Tool] getMyComplaintHistory error:', err.message)
    return []
  }
}

const getResolvedComplaintsForFeedback = async (user) => {
  const studentId = user?.studentId || user?._id?.toString() || ''
  const studentEmail = (user?.email || '').toLowerCase()

  try {
    let resolved = []
    if (mongoose.connection.readyState === 1) {
      resolved = await Complaint.find({
        $or: [
          studentId ? { studentId } : null,
          studentEmail ? { studentEmail } : null
        ].filter(Boolean),
        status: 'Resolved'
      }).sort({ updatedAt: -1 }).limit(10).lean()
    } else if (inMemoryStore && Array.isArray(inMemoryStore.complaints)) {
      resolved = inMemoryStore.complaints.filter(c =>
        c.status === 'Resolved' &&
        ((c.studentId && c.studentId === studentId) || (c.studentEmail && c.studentEmail.toLowerCase() === studentEmail))
      ).slice(0, 10)
    }

    const existingIds = new Set()
    if (mongoose.connection.readyState === 1) {
      const fbList = await Feedback.find({
        complaintId: { $in: resolved.map(r => r.complaintId || r._id.toString()) }
      }).select('complaintId').lean()
      fbList.forEach(f => existingIds.add(f.complaintId))
    } else if (inMemoryStore && Array.isArray(inMemoryStore.feedback)) {
      inMemoryStore.feedback.forEach(f => existingIds.add(f.complaintId))
    }

    return resolved.map(c => ({
      id: c._id,
      complaintId: c.complaintId || c._id.toString(),
      title: c.title || c.category,
      category: c.category,
      department: c.department,
      assignedTeacherId: c.assignedTeacherId || '',
      assignedTeacherName: c.assignedTeacherName || 'Faculty Coordinator',
      resolutionNotes: c.resolutionNotes || '',
      hasFeedback: existingIds.has(c.complaintId) || existingIds.has(c._id.toString())
    }))
  } catch (err) {
    console.error('[AI Tool] getResolvedComplaintsForFeedback error:', err.message)
    return []
  }
}

// ── Build Structured Memory for LLM ──────────────────────────────────────────
const buildStructuredMemory = ({ conversationState, complaintDraft, feedbackDraft, lastAssistantMessage, history = [] }) => {
  const recentMessages = (history || []).slice(-8)
  return {
    systemRole: 'You are the official CampusResolve AI Assistant for a university campus grievance redressal system.',
    currentState: conversationState,
    activeWorkflow: isWorkflowActive(conversationState) ? 'Active' : 'None',
    complaintDraft: complaintDraft || null,
    feedbackDraft: feedbackDraft || null,
    lastQuestion: lastAssistantMessage || '',
    recentMessages
  }
}

// ── Format Complaint List for Response ────────────────────────────────────────
const formatComplaintList = (complaints) => {
  return complaints.map(c => ({
    id: c._id,
    complaintId: c.complaintId || 'CR-001',
    title: c.title || c.category,
    category: c.category,
    department: c.department,
    status: c.status,
    priority: c.priority,
    assignedTeacherName: c.assignedTeacherName || 'Faculty',
    createdAt: c.createdAt
  }))
}

// ── Speech Normalization for Voice AI ─────────────────────────────────────────
const cleanSpokenText = (text) => {
  if (!text) return ''
  return text
    .replace(/###\s*/g, '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/[•\-\*]\s+/g, '')
    .replace(/>\s*/g, '')
    .replace(/ℹ️|⚠️|✓|❌|⭐|⏱️|🔒|👋/g, '')
    .replace(/\bCR-(\d+)\b/g, 'C R $1')
    .replace(/\bCMP-(\d+)\b/g, 'C M P $1')
    .replace(/\s+/g, ' ')
    .trim()
}

// ── Detail Request Detection (§8) ────────────────────────────────────────────
const isDetailRequested = (msg) => {
  if (!msg) return false
  return /tell me more|explain in detail|read the full|complete explanation|more details|elaborate|give me.*detail|full details|detailed explanation|show more|expand/i.test(msg)
}

// ── Natural Voice Summary (rule-based fallback, 10-35 words default) ─────────
const ruleBasedVoiceSummary = (screenText, detailRequested) => {
  if (!screenText) return ''
  let cleaned = cleanSpokenText(screenText)
  // Remove UI artifact phrases that should never be spoken
  cleaned = cleaned.replace(/\b(submit|cancel|edit|close|send|voice agent|settings|dashboard|login)\b/gi, '').replace(/\s+/g, ' ').trim()
  const sentences = cleaned.split(/[.!?]+/).map(s => s.trim()).filter(Boolean)
  if (sentences.length === 0) return ''
  if (detailRequested) {
    const subset = sentences.slice(0, 4)
    let text = subset.join('. ') + '.'
    const words = text.split(/\s+/).filter(Boolean)
    if (words.length > 65) text = words.slice(0, 62).join(' ') + '.'
    return text
  }
  // Default: 1-3 sentences, 10-35 words, natural & conversational
  let subset = sentences.slice(0, 2)
  let text = subset.join('. ') + '.'
  const words = text.split(/\s+/).filter(Boolean)
  if (words.length > 35) {
    text = words.slice(0, 32).join(' ') + '.'
  } else if (words.length < 10 && sentences[2]) {
    const extended = sentences.slice(0, 3).join('. ') + '.'
    const extWords = extended.split(/\s+/).filter(Boolean)
    if (extWords.length <= 35) text = extended
  }
  return text
}

// Use Gemini to generate natural short voice summary when possible, fallback to rule-based
const generateVoiceSummary = async (screenText, userMessage, detailRequested) => {
  if (!screenText) return ''
  // If screen already short (< 35 words && no markdown bullets/tables), just clean it
  const plain = cleanSpokenText(screenText)
  const wordCount = plain.split(/\s+/).filter(Boolean).length
  const hasComplex = /[•\-\*]\s+|\n\n|\|/.test(screenText) || wordCount > 45
  if (!hasComplex && wordCount <= 35 && wordCount >= 8) {
    // Already suitable for voice, just ensure natural tone
    return plain
  }
  // Try Gemini for natural summarization
  try {
    if (detailRequested) {
      const prompt = `Rewrite the following answer as a natural, friendly voice reply. User asked for more detail, so you can use 3-4 short sentences (up to 60 words). Keep it conversational, concise, helpful, no markdown, no bullet points, no UI labels.\n\nAnswer: "${screenText.slice(0, 800)}"`
      const res = await askGemini(prompt)
      if (res && res.trim().length > 10) {
        const cleaned = cleanSpokenText(res)
        const w = cleaned.split(/\s+/).filter(Boolean).length
        if (w >= 10 && w <= 65) return cleaned
      }
    } else {
      const prompt = `Summarize the following answer into a natural, human-like voice reply. Use 1-3 short sentences, 10-35 words, friendly and conversational. Avoid robotic phrases like "Certainly", "I understand", "Your request has been processed". Do not include markdown, bullet points, or UI labels. Focus on the core answer.\n\nAnswer: "${screenText.slice(0, 800)}"`
      const res = await askGemini(prompt)
      if (res && res.trim().length > 10) {
        const cleaned = cleanSpokenText(res)
        const w = cleaned.split(/\s+/).filter(Boolean).length
        if (w >= 8 && w <= 40) return cleaned
      }
    }
  } catch (_) { /* fallback */ }
  return ruleBasedVoiceSummary(screenText, detailRequested)
}

// ══════════════════════════════════════════════════════════════════════════════
// ORCHESTRATOR MAIN ENTRYPOINT
// ══════════════════════════════════════════════════════════════════════════════

const orchestrateChat = async ({
  message,
  sessionId,
  user,
  role = 'guest',
  isAuthenticated = false,
  conversationState = 'IDLE',
  complaintDraft = null,
  feedbackDraft = null,
  history = [],
  actionType = null,
  requestId = null,
  previousAssistantMessage = '',
  isVoiceMode = false,
  pageContext = null
}) => {
  const detailRequested = isDetailRequested(message)
  const res = await _orchestrateChatCore({
    message,
    sessionId,
    user,
    role,
    isAuthenticated,
    conversationState,
    complaintDraft,
    feedbackDraft,
    history,
    actionType,
    requestId,
    previousAssistantMessage,
    isVoiceMode,
    pageContext
  })

  if (res) {
    // Ensure every response has a proper voiceResponse (=spokenText) separate from screen
    if (res.text && !res.spokenText) {
      // Generate short natural voice summary, not full screen text
      try {
        res.spokenText = await generateVoiceSummary(res.text, message, detailRequested)
      } catch (_) {
        res.spokenText = ruleBasedVoiceSummary(res.text, detailRequested)
      }
    } else if (res.spokenText) {
      // Even when spokenText exists, ensure it respects length rules unless detail requested
      const words = cleanSpokenText(res.spokenText).split(/\s+/).filter(Boolean).length
      const detail = detailRequested
      if (!detail && words > 38) {
        // Overly long voice — summarize even the existing voice
        try {
          res.spokenText = await generateVoiceSummary(res.spokenText, message, false)
        } catch (_) {
          res.spokenText = ruleBasedVoiceSummary(res.spokenText, false)
        }
      } else {
        // Clean but keep natural
        res.spokenText = cleanSpokenText(res.spokenText)
      }
      // Safety: never speak UI labels alone
      if (/^(submit|cancel|edit|close|send|voice agent)$/i.test(res.spokenText.trim())) {
        res.spokenText = ruleBasedVoiceSummary(res.text, detailRequested)
      }
    }
    // Additional guard: if detail NOT requested and screen is long, ensure voice is short
    if (res.text && res.spokenText && !detailRequested) {
      const screenWords = cleanSpokenText(res.text).split(/\s+/).filter(Boolean).length
      const voiceWords = cleanSpokenText(res.spokenText).split(/\s+/).filter(Boolean).length
      if (screenWords > 50 && voiceWords > 38) {
        res.spokenText = ruleBasedVoiceSummary(res.text, false)
      }
    }
  }
  return res
}

const _orchestrateChatCore = async ({
  message,
  sessionId,
  user,
  role = 'guest',
  isAuthenticated = false,
  conversationState = 'IDLE',
  complaintDraft = null,
  feedbackDraft = null,
  history = [],
  actionType = null,
  requestId = null,
  previousAssistantMessage = '',
  isVoiceMode = false,
  pageContext = null
}) => {
  const trimmedMsg = (message || '').trim()
  const userRole = role || 'guest'
  const userName = user?.name || 'Student'
  const currentSessionId = sessionId || `sess-${Date.now()}`

  // ── Step 0: Request Deduplication ──────────────────────────────────────
  if (requestId && isRequestDuplicate(requestId)) {
    console.warn(`[AI Orchestrator] Duplicate request ignored: ${requestId}`)
    return {
      sessionId: currentSessionId,
      state: conversationState,
      intent: 'GENERAL_QUESTION',
      text: 'Processing your previous request...',
      messageType: 'TEXT_MESSAGE',
      quickActions: getQuickActionsForState(conversationState, userRole)
    }
  }

  // ── Step 1: Analyze Current Message ────────────────────────────────────
  // Derive the last assistant message from history if not passed explicitly
  const lastAssistantMsg = previousAssistantMessage ||
    [...(history || [])].reverse().find(h => h.sender === 'bot')?.text || ''

  const analysis = analyzeCurrentMessage({
    message: trimmedMsg,
    actionType,
    conversationState: normalizeState(conversationState),
    complaintDraft,
    feedbackDraft,
    previousAssistantMessage: lastAssistantMsg,
    history
  })

  const intent = analysis.intent
  const msgCategory = analysis.messageCategory

  // ── Step 2: Handle CANCEL (Deterministic — Never touches LLM) ──────────
  if (intent === 'CANCEL_ACTION' || msgCategory === MESSAGE_CATEGORIES.CANCEL_ACTION) {
    return {
      sessionId: currentSessionId,
      state: STATES.IDLE,
      intent: 'CANCEL_ACTION',
      text: 'Got it — cancelled. Let me know if you need anything else.',
      spokenText: 'Cancelled. Anything else you need?',
      messageType: 'TEXT_MESSAGE',
      quickActions: getQuickActionsForState(STATES.IDLE, userRole),
      complaintDraft: null,
      feedbackDraft: null
    }
  }

  // ── Step 3: Guest Gateway (Security) ───────────────────────────────────
  if (!isAuthenticated) {
    return await _handleGuestMessage(trimmedMsg, intent, currentSessionId, history)
  }

  // ── Step 4: Route by Intent ────────────────────────────────────────────

  // 4A. GREETING — natural, concise, helpful
  if (intent === 'GREETING') {
    const first = userName.split(' ')[0] || 'there'
    return {
      sessionId: currentSessionId,
      state: STATES.IDLE,
      intent: 'GREETING',
      text: `Hey ${first}! 👋 I'm your CampusResolve assistant. I can help you create complaints, check status, or give feedback on resolved issues — what do you need?`,
      spokenText: `Hey ${first}! I can help with complaints, status, and feedback. What do you need?`,
      messageType: 'TEXT_MESSAGE',
      quickActions: getQuickActionsForState(STATES.IDLE, userRole)
    }
  }

  // 4B. CAPABILITIES — natural, project-aware, pageContext aware (§3, §24)
  if (intent === 'CAPABILITIES') {
    const page = pageContext?.pageType || pageContext?.pathname || pageContext?.currentRoute || ''
    let text = `I can help you understand CampusResolve — complaints, tracking, feedback, AI features, voice, and your own data when you're logged in.`
    let spoken = `I can help with CampusResolve — complaints, tracking, and AI features.`
    if (page && /dashboard/i.test(page)) {
      text = `Here on the Dashboard you can see pending complaints, recent activity, and stats. I can explain how complaints flow, check your status, or help create one.`
      spoken = `Here you can track complaints and see stats. I can explain the flow or check your status.`
    } else if (page && /complaint/i.test(page)) {
      text = `On this complaints page you can view history, check status by ID, or create a new one. Just tell me what you need.`
      spoken = `You can view, track, or create complaints here. What do you need?`
    } else if (page && /feedback/i.test(page)) {
      text = `Here you can rate resolved complaints (1–5 stars) and see how feedback improves services. Want to give feedback on a resolved issue?`
      spoken = `You can rate resolved complaints here. Want to give feedback?`
    } else if (page && /profile/i.test(page)) {
      text = `This is your profile — you can update your info, avatar, and see your department. Need help with anything else?`
      spoken = `This is your profile. What else do you need?`
    }
    return {
      sessionId: currentSessionId,
      state: STATES.IDLE,
      intent: 'CAPABILITIES',
      text,
      spokenText: spoken,
      messageType: 'TEXT_MESSAGE',
      quickActions: ['How does complaint creation work?', 'What AI features are implemented?', 'How does RAG work?']
    }
  }

  // 4C. LOGIN HELP — natural
  if (intent === 'LOGIN_HELP') {
    return {
      sessionId: currentSessionId,
      state: STATES.IDLE,
      intent: 'LOGIN_HELP',
      text: 'You can sign in with your Google account from the Login page. If that does not work, reach out to your department admin or IT helpdesk.',
      spokenText: 'Just sign in with Google on the login page. If that fails, ask your department admin.',
      messageType: 'TEXT_MESSAGE',
      quickActions: getQuickActionsForState(STATES.IDLE, userRole)
    }
  }

  // 4C. SHOW PENDING COMPLAINTS (Database Tool)
  if (intent === 'SHOW_PENDING_COMPLAINTS') {
    const res = await _handleShowPending(user, currentSessionId, userRole)
    return { ...res, authMode: 'authenticated', authNotice: 'Personalized assistance enabled.' }
  }

  // 4D. COMPLAINT HISTORY (Database Tool)
  if (intent === 'SHOW_COMPLAINT_HISTORY' || intent === 'SHOW_RESOLVED_COMPLAINTS') {
    const res = await _handleShowHistory(user, currentSessionId, userRole)
    return { ...res, authMode: 'authenticated', authNotice: 'Personalized assistance enabled.' }
  }

  // 4E. CHECK STATUS (Database Tool)
  if (intent === 'CHECK_COMPLAINT_STATUS') {
    const res = await _handleCheckStatus(user, trimmedMsg, analysis, currentSessionId, userRole)
    return { ...res, authMode: 'authenticated', authNotice: 'Personalized assistance enabled.' }
  }

  // 4F. GIVE FEEDBACK (Database Tool)
  if (intent === 'GIVE_FEEDBACK') {
    const res = await _handleGiveFeedback(user, currentSessionId, userRole)
    return { ...res, authMode: 'authenticated', authNotice: 'Personalized assistance enabled.' }
  }

  // 4F-2. FEEDBACK WORKFLOW (State Machine + Input)
  if (intent === 'PROVIDE_FEEDBACK_DETAILS' || _isFeedbackWorkflowState(normalizeState(conversationState))) {
    const res = await _handleFeedbackWorkflow(trimmedMsg, analysis, feedbackDraft, user, history, currentSessionId, userRole)
    return { ...res, authMode: 'authenticated', authNotice: 'Personalized assistance enabled.' }
  }

  // 4F-3. SUBMIT FEEDBACK
  if (intent === 'SUBMIT_FEEDBACK') {
    return {
      sessionId: currentSessionId,
      state: STATES.FEEDBACK_PREVIEW,
      intent: 'SUBMIT_FEEDBACK',
      text: 'Please review your feedback preview above and click **Submit Feedback** to record your rating.',
      messageType: 'FEEDBACK_ANALYSIS',
      structuredFeedback: feedbackDraft,
      feedbackDraft,
      quickActions: ['Submit Feedback', 'Edit Feedback', 'Cancel'],
      authMode: 'authenticated'
    }
  }

  // 4F-4. EDIT FEEDBACK
  if (intent === 'EDIT_FEEDBACK') {
    return {
      sessionId: currentSessionId,
      state: STATES.FEEDBACK_COMMENT,
      intent: 'EDIT_FEEDBACK',
      text: 'You can modify your feedback comment or rating. Type your updated thoughts below:',
      messageType: 'TEXT_MESSAGE',
      feedbackDraft,
      quickActions: ['Submit Feedback', 'Cancel'],
      authMode: 'authenticated'
    }
  }

  // 4G-1. JOIN COMPLAINT (Duplicate Flow Action)
  if (intent === 'JOIN_COMPLAINT') {
    const res = await _handleJoinComplaint(user, trimmedMsg, analysis, complaintDraft, history, currentSessionId, userRole)
    return { ...res, authMode: 'authenticated', authNotice: 'Personalized assistance enabled.' }
  }

  // 4G-2. CREATE ANYWAY (Duplicate Flow Action)
  if (intent === 'CREATE_ANYWAY') {
    const res = await _handleCreateAnyway(complaintDraft, currentSessionId, userRole)
    return { ...res, authMode: 'authenticated', authNotice: 'Personalized assistance enabled.' }
  }

  // 4G-3. VIEW EXISTING COMPLAINT (Duplicate Flow Action)
  if (intent === 'VIEW_EXISTING_COMPLAINT') {
    const res = await _handleViewExisting(user, trimmedMsg, analysis, history, currentSessionId, userRole)
    return { ...res, authMode: 'authenticated', authNotice: 'Personalized assistance enabled.' }
  }

  // 4G-4. COMPLAINT WORKFLOW (State Machine + LLM) — natural conversation
  if (intent === 'CREATE_COMPLAINT' && !_hasComplaintDescriptionInMessage(trimmedMsg, complaintDraft)) {
    return {
      sessionId: currentSessionId,
      state: STATES.COMPLAINT_DESCRIPTION,
      intent: 'CREATE_COMPLAINT',
      text: 'Sure — what is the issue and where is it? Include the building or room if you can.',
      spokenText: 'What is the issue and where is it?',
      messageType: 'COMPLAINT_QUESTION',
      quickActions: ['Seminar Hall projector flickering', 'Computer Lab 3 AC not working', 'Hostel Mess water issue', 'Cancel'],
      authMode: 'authenticated',
      authNotice: 'Personalized assistance enabled.'
    }
  }

  if (intent === 'CREATE_COMPLAINT' || intent === 'PROVIDE_COMPLAINT_DETAILS' || _isComplaintWorkflowState(normalizeState(conversationState))) {
    const res = await _handleComplaintWorkflow(trimmedMsg, analysis, complaintDraft, user, history, currentSessionId, lastAssistantMsg)
    return { ...res, authMode: 'authenticated', authNotice: 'Personalized assistance enabled.' }
  }

  // 4H. SPECIFIC EXPLANATION INTENTS
  if (intent === 'TRACKING_EXPLANATION') {
    return await _handleTrackingExplanation(currentSessionId, userRole)
  }

  if (intent === 'DUPLICATE_CHECK') {
    return await _handleDuplicateCheckExplanation(currentSessionId, userRole)
  }

  if (intent === 'RESOLUTION_PREDICTION') {
    return await _handleResolutionPredictionExplanation(currentSessionId, userRole)
  }

  // 4I. GENERAL QUESTION (RAG Pipeline)
  if (intent === 'GENERAL_QUESTION' || msgCategory === MESSAGE_CATEGORIES.GENERAL_QUESTION) {
    const res = await _handleGeneralQuestion(trimmedMsg, history, conversationState, currentSessionId, userRole, lastAssistantMsg)
    return { ...res, authMode: 'authenticated', authNotice: 'Personalized assistance enabled.' }
  }

  // ── Step 5: Fallback ───────────────────────────────────────────────────
  const fallback = getFallbackResponse(conversationState)
  return {
    sessionId: currentSessionId,
    state: fallback.state,
    intent: 'GENERAL_QUESTION',
    text: fallback.text,
    messageType: 'TEXT_MESSAGE',
    quickActions: fallback.quickActions,
    authMode: 'authenticated',
    authNotice: 'Personalized assistance enabled.'
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// INTENT HANDLERS (Private)
// ══════════════════════════════════════════════════════════════════════════════

async function _handleGuestMessage(message, intent, sessionId, history) {
  // 0. Greeting and Capabilities — allowed for guests, natural
  if (intent === 'GREETING') {
    return {
      sessionId,
      state: STATES.IDLE,
      intent: 'GREETING',
      text: 'Hey there! 👋 Welcome to CampusResolve. What would you like to know?',
      spokenText: 'Hey! Welcome to CampusResolve. What would you like to know?',
      messageType: 'TEXT_MESSAGE',
      authMode: 'guest',
      guestNotice: 'Log in to create complaints and track grievance resolutions.',
      quickActions: ['What can you do?', 'How does CampusResolve work?', 'Login Help']
    }
  }
  if (intent === 'CAPABILITIES') {
    return {
      sessionId,
      state: STATES.IDLE,
      intent: 'CAPABILITIES',
      text: 'I can help you understand CampusResolve — how complaints flow, how tracking and RAG work, what the AI does, and more. When you’re logged in I can also help with your own complaints and feedback.',
      spokenText: 'I can help with CampusResolve — complaints, tracking, RAG, and AI. What do you want to know?',
      messageType: 'TEXT_MESSAGE',
      authMode: 'guest',
      guestNotice: 'Log in to create complaints and track grievance resolutions.',
      quickActions: ['How does CampusResolve work?', 'How does RAG work?', 'How to Submit a Complaint']
    }
  }

  // 1. Mandatory Block on Complaint Creation for Guests
  const isComplaintIntent = [
    'CREATE_COMPLAINT', 'PROVIDE_COMPLAINT_DETAILS'
  ].includes(intent) || /^(create a complaint|create complaint|new complaint|report an issue|file a complaint|register complaint|lodge a complaint|submit a complaint|i want to report|i want to create a complaint|help me create a complaint)/i.test(message)

  if (isComplaintIntent) {
    return {
      sessionId,
      state: STATES.IDLE,
      intent: 'LOGIN_REQUIRED',
      text: 'You need to log in to create a complaint. Sign in and I can help you file it right away.',
      spokenText: 'You need to log in first to create a complaint.',
      messageType: 'TEXT_MESSAGE',
      authMode: 'guest',
      guestNotice: 'Log in to create complaints and track grievance resolutions.',
      widgetData: { type: 'AUTH_REQUIRED', ctaText: 'Sign In to Continue', target: '/login' },
      quickActions: ['Sign In', 'How to Submit a Complaint', 'What is CampusResolve?', 'Login Help'],
      complaintDraft: null,
      feedbackDraft: null
    }
  }

  // 2. Block Other Private User Inquiries (Personal complaints, status, feedback, notifications)
  const isProtectedInquiry = [
    'SHOW_PENDING_COMPLAINTS', 'SHOW_RESOLVED_COMPLAINTS',
    'SHOW_COMPLAINT_HISTORY', 'CHECK_COMPLAINT_STATUS',
    'GIVE_FEEDBACK', 'SUBMIT_FEEDBACK', 'PROVIDE_FEEDBACK_DETAILS'
  ].includes(intent) || /^(show my|my complaint|track my|my status|my tickets|show my notifications|my notifications|my feedback|give feedback)/i.test(message)

  if (isProtectedInquiry) {
    return {
      sessionId,
      state: STATES.IDLE,
      intent: 'LOGIN_HELP',
      text: 'This is personal — you need to log in first. Once signed in you can see your complaints, status, and feedback.',
      spokenText: 'You need to log in to see your personal complaints.',
      messageType: 'TEXT_MESSAGE',
      authMode: 'guest',
      guestNotice: 'Log in to view your complaints, status updates, feedback history, and personalized AI insights.',
      widgetData: { type: 'AUTH_REQUIRED', ctaText: 'Sign In to Continue', target: '/login' },
      quickActions: ['Sign In', 'How to Submit a Complaint', 'How Complaint Tracking Works', 'Feedback Information', 'Login Help'],
      complaintDraft: null,
      feedbackDraft: null
    }
  }

  // Handle specific explanations for guests
  if (intent === 'TRACKING_EXPLANATION' || /how.*tracking works/i.test(message)) {
    const res = await _handleTrackingExplanation(sessionId, 'guest')
    return { ...res, authMode: 'guest', guestNotice: 'Log in to view your complaints, status updates, feedback history, and personalized AI insights.' }
  }

  if (intent === 'DUPLICATE_CHECK' || /duplicate/i.test(message)) {
    const res = await _handleDuplicateCheckExplanation(sessionId, 'guest')
    return { ...res, authMode: 'guest', guestNotice: 'Log in to view your complaints, status updates, feedback history, and personalized AI insights.' }
  }

  if (intent === 'RESOLUTION_PREDICTION' || /prediction/i.test(message)) {
    const res = await _handleResolutionPredictionExplanation(sessionId, 'guest')
    return { ...res, authMode: 'guest', guestNotice: 'Log in to view your complaints, status updates, feedback history, and personalized AI insights.' }
  }

  // Public RAG for guests — natural, helpful tone
  const { results: ragDocs } = searchCampusKnowledge(message, 3, history)
  // Rare token check for hallucination prevention (§19)
  let hasValidRag = ragDocs.length > 0 && ragDocs[0].finalScore >= 2.5
  if (hasValidRag) {
    const qTokens = message.toLowerCase().replace(/[^a-z0-9\s]/g,' ').split(/\s+/).filter(t=>t.length>2 && !['the','and','for','you','are','how','what','why','where','when','does','did','work','works','system','project','campus','campusresolve','this','that','with','from'].includes(t))
    if (qTokens.length >0) {
      const topText = (ragDocs[0].title + ' ' + ragDocs[0].content + ' ' + (ragDocs[0].tags||[]).join(' ')).toLowerCase()
      const hasRare = qTokens.some(tok => topText.includes(tok))
      if (!hasRare) hasValidRag = false
    }
  }
  const ragContext = buildRAGContext(ragDocs)
  let replyText = ''

  if (hasValidRag) {
    const ragPrompt = `You are CampusResolve Assistant, a friendly helpful campus guide.
Answer ONLY using the verified info below. Be natural, conversational, concise (2-4 sentences). Avoid robotic phrases like "Certainly", "I understand", "Your request has been processed". Don't start with "Sure" unless natural. Sound human.

Verified info:
${ragContext}

Question: "${message}"`
    replyText = await askGemini(ragPrompt) || ragDocs[0].content
  } else if (ragDocs.length >0) {
    replyText = "I couldn't find that in the current CampusResolve project context."
  } else {
    replyText = "CampusResolve is the campus grievance portal. Sign in to submit complaints and track them — I can answer general questions even as a guest."
  }

  // Minimal contextual suggestions for guests (§15)
  let guestQuickActions = ['How does CampusResolve work?', 'Login Help']
  if (/rag|ai|voice|gemini/i.test(message)) guestQuickActions = ['How does RAG work?', 'What AI features are implemented?']
  else if (/complaint|track/i.test(message)) guestQuickActions = ['How to Submit a Complaint', 'How Complaint Tracking Works']

  return {
    sessionId,
    state: STATES.IDLE,
    intent,
    text: replyText,
    messageType: ragDocs.length > 0 ? 'RAG_ANSWER' : 'TEXT_MESSAGE',
    authMode: 'guest',
    guestNotice: 'Log in to view your complaints, status updates, feedback history, and personalized AI insights.',
    ragSources: ragDocs.map(d => ({ title: d.title, category: d.category })),
    quickActions: guestQuickActions
  }
}

function _isFeedbackWorkflowState(state) {
  return [
    STATES.FEEDBACK_SELECTION,
    STATES.FEEDBACK_RATING,
    STATES.FEEDBACK_COMMENT,
    STATES.FEEDBACK_PREVIEW,
    'FEEDBACK_INPUT'
  ].includes(state)
}

async function _handleTrackingExplanation(sessionId, userRole) {
  return {
    sessionId,
    state: STATES.IDLE,
    intent: 'TRACKING_EXPLANATION',
    text: `### How Complaint Tracking Works\nCampusResolve uses a 4-stage process:\n\n1. **Submitted** — logged with an ID like \`CR-001\`, acknowledged within 4 hours\n2. **Assigned** — routed to the right faculty or facility coordinator\n3. **In Progress** — work and inspection underway\n4. **Resolved** — resolution notes added, you get a prompt to give feedback\n\n⏱️ **Timelines**: Urgent safety: 2–4 hours, General maintenance: 24–48 hours, Academic matters: 1–2 working days.\n\nYou can check status anytime from your dashboard or by asking “Check complaint status.”`,
    spokenText: 'You submit it, it gets assigned, then you track it from your dashboard. Urgent ones take a few hours, others a day or two.',
    messageType: 'TEXT_MESSAGE',
    quickActions: ['Help Me Create a Complaint', 'Show My Pending Complaints', 'Check Complaint Status']
  }
}

async function _handleDuplicateCheckExplanation(sessionId, userRole) {
  return {
    sessionId,
    state: STATES.IDLE,
    intent: 'DUPLICATE_CHECK',
    text: `### Preventing Duplicate Complaints\nBefore creating a ticket, CampusResolve scans active complaints:\n\n- **Smart matching** — compares location, keywords, and category\n- **Join instead** — if the same issue exists (like *Projector flickering in Seminar Hall*), just join as an affected student to boost priority\n- **Your choice** — you can always create a separate ticket if you prefer`,
    spokenText: 'We scan for similar active tickets first. You can join an existing one or create your own.',
    messageType: 'TEXT_MESSAGE',
    quickActions: ['Help Me Create a Complaint', 'Show My Pending Complaints', 'How Complaint Tracking Works']
  }
}

async function _handleResolutionPredictionExplanation(sessionId, userRole) {
  return {
    sessionId,
    state: STATES.IDLE,
    intent: 'RESOLUTION_PREDICTION',
    text: `### AI Resolution Estimates\nThe system estimates resolution time using:\n\n- **Past data** — how long similar complaints took in your department\n- **Current workload** — how busy the team is\n- **SLA risk** — Low / Medium / High chance of delay\n\n> ℹ️ Insight based on available data — a recommendation, not a guarantee.`,
    spokenText: 'We estimate time from past data and current load. It is just a prediction, not a guarantee.',
    messageType: 'TEXT_MESSAGE',
    quickActions: ['Help Me Create a Complaint', 'Show My Pending Complaints', 'Check Complaint Status']
  }
}

async function _handleFeedbackWorkflow(message, analysis, feedbackDraft, user, history, sessionId, userRole) {
  const text = (message || '').trim()

  // If user is verbally adjusting rating or dimension on existing feedback draft
  if (feedbackDraft && (analysis.extractedEntities?.rating || analysis.extractedEntities?.resolutionQuality || analysis.extractedEntities?.responseTime || analysis.extractedEntities?.communication)) {
    const updatedFeedback = { ...feedbackDraft }
    if (analysis.extractedEntities.rating) {
      updatedFeedback.suggestedRating = analysis.extractedEntities.rating
    }
    if (analysis.extractedEntities.resolutionQuality) {
      updatedFeedback.resolutionQuality = analysis.extractedEntities.resolutionQuality
    }
    if (analysis.extractedEntities.responseTime) {
      updatedFeedback.responseTime = analysis.extractedEntities.responseTime
    }
    if (analysis.extractedEntities.communication) {
      updatedFeedback.communication = analysis.extractedEntities.communication
    }
    return {
      sessionId,
      state: STATES.FEEDBACK_PREVIEW,
      intent: 'PROVIDE_FEEDBACK_DETAILS',
      text: `Updated your feedback rating to **${updatedFeedback.suggestedRating} stars** with **${updatedFeedback.resolutionQuality || 'Satisfactory'}** resolution quality. Your feedback is ready. Would you like me to submit it?`,
      spokenText: `Updated your feedback rating to ${updatedFeedback.suggestedRating} stars. Your feedback is ready. Would you like me to submit it?`,
      messageType: 'FEEDBACK_ANALYSIS',
      structuredFeedback: updatedFeedback,
      feedbackDraft: updatedFeedback,
      quickActions: ['Submit Feedback', 'Edit Feedback', 'Cancel']
    }
  }

  if (!text || text.length < 2) {
    return {
      sessionId,
      state: STATES.FEEDBACK_COMMENT,
      intent: 'PROVIDE_FEEDBACK_DETAILS',
      text: 'Please write your feedback comment regarding the resolution quality and experience.',
      spokenText: 'Please describe your feedback regarding the resolution quality and experience.',
      messageType: 'TEXT_MESSAGE',
      quickActions: ['Excellent resolution', 'Satisfactory fix', 'Took too long', 'Cancel']
    }
  }

  // Analyze ONLY the user's actual text
  const aiAnalysis = await analyzeFeedback(text)
  const complaintId = feedbackDraft?.complaintId || analysis.extractedEntities?.complaintId || 'CR-001'
  const complaintTitle = feedbackDraft?.complaintTitle || 'Resolved Grievance'
  const department = feedbackDraft?.department || 'General'

  const structuredFeedback = {
    complaintId,
    complaintTitle,
    department,
    teacherId: feedbackDraft?.teacherId || 'TCH-CSE-001',
    teacherName: feedbackDraft?.teacherName || 'Faculty',
    sentiment: aiAnalysis.sentiment || 'Neutral',
    resolutionQuality: aiAnalysis.resolutionQuality || 'Satisfactory',
    responseTime: aiAnalysis.responseTime || 'Moderate',
    communication: aiAnalysis.communication || 'Moderate',
    suggestedRating: aiAnalysis.suggestedRating || 4,
    topics: aiAnalysis.topics || ['Overall Experience'],
    summary: aiAnalysis.summary || 'Student feedback recorded.',
    suggestedFeedback: aiAnalysis.suggestedFeedback || text,
    originalComment: text,
    suggestedFollowUp: aiAnalysis.suggestedFollowUp || ''
  }

  return {
    sessionId,
    state: STATES.FEEDBACK_PREVIEW,
    intent: 'PROVIDE_FEEDBACK_DETAILS',
    text: `Here is your feedback summary for **${complaintId}** (*${complaintTitle}*). Your feedback is ready. Would you like me to submit it?`,
    spokenText: 'Your feedback is ready. Would you like me to submit it?',
    messageType: 'FEEDBACK_ANALYSIS',
    structuredFeedback,
    feedbackDraft: structuredFeedback,
    quickActions: ['Submit Feedback', 'Edit Feedback', 'Cancel']
  }
}

async function _handleShowPending(user, sessionId, userRole) {
  const pending = await getMyPendingComplaints(user)
  if (pending.length === 0) {
    return {
      sessionId,
      state: STATES.IDLE,
      intent: 'SHOW_PENDING_COMPLAINTS',
      text: 'No pending complaints at the moment — either everything is resolved or you have not filed anything yet. Want to create one?',
      spokenText: 'No pending complaints right now.',
      messageType: 'TEXT_MESSAGE',
      quickActions: ['Help me create a complaint', 'Show my complaint history', '⭐ Give Feedback']
    }
  }
  const first = pending[0]
  // Short, natural voice (10-28 words)
  const shortTitle = (first.title || first.category || 'issue').split(' ').slice(0, 5).join(' ')
  const spokenText = `You have ${pending.length} pending. ${first.complaintId} about ${shortTitle} is ${first.status.toLowerCase()} with ${first.assignedTeacherName || 'the team'}.`

  return {
    sessionId,
    state: STATES.STATUS_LOOKUP,
    intent: 'SHOW_PENDING_COMPLAINTS',
    text: `You have **${pending.length} pending complaint${pending.length !== 1 ? 's' : ''}** — here they are:`,
    spokenText,
    messageType: 'COMPLAINT_LIST',
    queryResults: formatComplaintList(pending),
    quickActions: ['Help me create a complaint', 'Show my complaint history', '⭐ Give Feedback']
  }
}

async function _handleShowHistory(user, sessionId, userRole) {
  const historyList = await getMyComplaintHistory(user, 6)
  if (historyList.length === 0) {
    return {
      sessionId,
      state: STATES.IDLE,
      intent: 'SHOW_COMPLAINT_HISTORY',
      text: 'Nothing in your history yet. Facing an issue? I can help you file one now.',
      spokenText: 'No history yet. Want to file a complaint?',
      messageType: 'TEXT_MESSAGE',
      quickActions: ['Help me create a complaint', '⭐ Give Feedback']
    }
  }
  return {
    sessionId,
    state: STATES.COMPLAINT_HISTORY,
    intent: 'SHOW_COMPLAINT_HISTORY',
    text: `Your recent history — **${historyList.length} records** — is below:`,
    spokenText: `Your history shows ${historyList.length} complaints.`,
    messageType: 'COMPLAINT_LIST',
    queryResults: formatComplaintList(historyList),
    quickActions: ['Help me create a complaint', 'Show my pending complaints', '⭐ Give Feedback']
  }
}

async function _handleCheckStatus(user, message, analysis, sessionId, userRole) {
  const complaintId = analysis.extractedEntities?.complaintId || (message.match(/\b(CR-\d+|CMP-\d+)\b/i) || [])[0]

  if (complaintId) {
    const targetId = complaintId.toUpperCase()
    const statusRes = await getMyComplaintStatus(user, targetId)

    if (statusRes.unauthorized) {
      return {
        sessionId,
        state: STATES.IDLE,
        intent: 'CHECK_COMPLAINT_STATUS',
        text: `Sorry, you can’t view **${targetId}** — it is not linked to your account.`,
        spokenText: `You can’t view ${targetId}. It’s not in your account.`,
        messageType: 'TEXT_MESSAGE',
        quickActions: ['Show my pending complaints', 'Show my complaint history']
      }
    }

    if (statusRes.found && statusRes.complaint) {
      const c = statusRes.complaint
      // Voice: short summary (15-30 words)
      const t = (c.title || c.category || 'issue').split(' ').slice(0,4).join(' ')
      const spokenText = `${c.complaintId} about ${t} is ${c.status.toLowerCase()} with ${c.assignedTeacherName || 'the team'}.`
      return {
        sessionId,
        state: STATES.STATUS_LOOKUP,
        intent: 'CHECK_COMPLAINT_STATUS',
        text: `**${c.complaintId}** — ${c.title || c.category}\n- Status: **${c.status}**\n- ${c.category} • ${c.department} • ${c.priority}\n- Assigned: ${c.assignedTeacherName || 'Team'} • ${new Date(c.createdAt).toLocaleDateString()}${c.resolutionNotes ? `\n> ${c.resolutionNotes}` : ''}`,
        spokenText,
        messageType: 'STATUS_CARD',
        queryResults: [formatComplaintList([c])[0]],
        quickActions: c.status === 'Resolved'
          ? [`Give Feedback for ${c.complaintId}`, 'Show my pending complaints']
          : ['Show my pending complaints', 'Help me create a complaint']
      }
    }

    return {
      sessionId,
      state: STATES.IDLE,
      intent: 'CHECK_COMPLAINT_STATUS',
      text: `Hmm, I couldn’t find **${targetId}** in your records. Double-check the ID or look at your history.`,
      spokenText: `I couldn’t find ${targetId}. Check the ID?`,
      messageType: 'TEXT_MESSAGE',
      quickActions: ['Show my pending complaints', 'Show my complaint history']
    }
  }

  // No specific ID — show list of active complaints
  const pending = await getMyPendingComplaints(user)
  if (pending.length > 0) {
    return {
      sessionId,
      state: STATES.STATUS_LOOKUP,
      intent: 'CHECK_COMPLAINT_STATUS',
      text: 'Your active complaints — tap one to see details:',
      spokenText: `You have ${pending.length} active. Want details on one?`,
      messageType: 'COMPLAINT_LIST',
      queryResults: formatComplaintList(pending),
      quickActions: pending.map(p => `Status of ${p.complaintId || 'CR-001'}`).slice(0, 3)
    }
  }

  return {
    sessionId,
    state: STATES.IDLE,
    intent: 'CHECK_COMPLAINT_STATUS',
    text: 'No active complaints right now. If you have an ID like CR-001, just share it.',
    spokenText: 'No active complaints right now.',
    messageType: 'TEXT_MESSAGE',
    quickActions: ['Help me create a complaint', 'Show my complaint history']
  }
}

async function _handleGiveFeedback(user, sessionId, userRole) {
  const resolved = await getResolvedComplaintsForFeedback(user)
  const unreviewed = resolved.filter(r => !r.hasFeedback)

  if (unreviewed.length === 0 && resolved.length === 0) {
    return {
      sessionId,
      state: STATES.IDLE,
      intent: 'GIVE_FEEDBACK',
      text: 'Nothing to rate yet — feedback opens once a complaint is marked resolved.',
      spokenText: 'Nothing to rate yet. Feedback opens after resolution.',
      messageType: 'TEXT_MESSAGE',
      quickActions: ['Help me create a complaint', 'Show my pending complaints']
    }
  }

  return {
    sessionId,
    state: STATES.FEEDBACK_SELECTION,
    intent: 'GIVE_FEEDBACK',
    text: 'Pick a resolved complaint below to rate:',
    spokenText: 'Pick a resolved complaint to rate.',
    messageType: 'FEEDBACK_SELECTION',
    eligibleComplaints: unreviewed.length > 0 ? unreviewed : resolved,
    quickActions: ['Cancel']
  }
}

async function _handleComplaintWorkflow(message, analysis, existingDraft, user, history, sessionId, lastAssistantMsg) {
  let updatedDraft = { ...(existingDraft || {}) }
  const currentState = normalizeState(analysis.conversationState)

  // ── If user is answering a location question ────────────────────────────
  if (analysis.userIsAnsweringPreviousQuestion && analysis.extractedEntities?.location) {
    updatedDraft.location = analysis.extractedEntities.location
    if (updatedDraft.title && !updatedDraft.title.toLowerCase().includes(message.toLowerCase())) {
      updatedDraft.title = `${message} ${updatedDraft.title}`
    }
    updatedDraft.isComplete = true
  }
  // ── If user is answering a category question ───────────────────────────
  else if (analysis.userIsAnsweringPreviousQuestion && analysis.extractedEntities?.category) {
    updatedDraft.category = analysis.extractedEntities.category
  }
  // ── Location-state input (COMPLAINT_LOCATION / WAITING_FOR_LOCATION) ──
  else if ((currentState === STATES.COMPLAINT_LOCATION || currentState === 'WAITING_FOR_LOCATION') && updatedDraft.title) {
    updatedDraft.location = message
    if (!updatedDraft.title.toLowerCase().includes(message.toLowerCase())) {
      updatedDraft.title = `${message} ${updatedDraft.title}`
    }
    updatedDraft.isComplete = true
  }
  // ── Full extraction via AI + rule parser ────────────────────────────────
  else {
    const extracted = await extractComplaintDraft(message, history, user?.department || 'CSE')
    updatedDraft = {
      title: extracted.title || `${extracted.category} Issue`,
      description: extracted.description || message,
      category: extracted.category || 'Infrastructure',
      department: extracted.department || user?.department || 'CSE',
      location: extracted.location && extracted.location !== 'Campus Premises' ? extracted.location : (updatedDraft.location || ''),
      priority: extracted.priority || 'medium'
    }

    const quality = evaluateComplaintQuality(updatedDraft, message)
    // Clean hallucinated location like "About" — treat as missing
    const locLower = (updatedDraft.location || '').trim().toLowerCase()
    if (['about','the','projector','issue','campus premises','campus','general','not specified','unknown'].includes(locLower) || locLower.length < 3) {
      updatedDraft.location = ''
    }
    updatedDraft.isComplete = quality.isComplete && !!updatedDraft.location
  }

  // ── If location is STILL missing → ask naturally (§13, §14)
  if (!updatedDraft.location) {
    return {
      sessionId,
      state: STATES.COMPLAINT_LOCATION,
      intent: 'PROVIDE_COMPLAINT_DETAILS',
      text: 'Got it — **where is the issue?** Just tell me the building, room, or area.',
      spokenText: 'Where is the issue?',
      messageType: 'COMPLAINT_QUESTION',
      complaintDraft: updatedDraft,
      quickActions: ['Seminar Hall', 'Computer Lab 3', 'Hostel Block B', 'Central Library', 'Cancel']
    }
  }

  // ── Run AI Duplicate Detection Before Finalizing ───────────────────────
  const dupResult = await findDuplicateComplaints(updatedDraft)

  if (dupResult.isDuplicate && dupResult.matchedComplaint) {
    const topMatch = dupResult.matchedComplaint
    return {
      sessionId,
      state: STATES.COMPLAINT_PREVIEW,
      intent: 'PROVIDE_COMPLAINT_DETAILS',
      text: `⚠️ **Similar ticket found** (${topMatch.similarityScore}% match) — **${topMatch.complaintId}: ${topMatch.title}** at **${topMatch.location || updatedDraft.location}**.\nYou can join it to boost priority or create a new one anyway.`,
      spokenText: `Found a similar ticket for ${topMatch.location || updatedDraft.location}. Want to join it or create a new one?`,
      messageType: 'COMPLAINT_PREVIEW',
      structuredComplaint: updatedDraft,
      complaintDraft: updatedDraft,
      duplicateMatches: dupResult.matches,
      quickActions: [
        "I'm Also Facing This Issue",
        "View Existing Complaint",
        "Create New Complaint Anyway",
        "Cancel"
      ]
    }
  }

  // ── All details collected → COMPLAINT_PREVIEW ──────────────────────────
  // Validate response is not duplicating a previous location question
  const validation = validateResponse({
    responseText: 'Got it! I have prepared your complaint details below. Please review the preview card and click **Create Complaint** to submit.',
    currentMessage: message,
    previousAssistantMessage: lastAssistantMsg,
    conversationState: currentState,
    intent: 'PROVIDE_COMPLAINT_DETAILS',
    complaintDraft: updatedDraft
  })

  return {
    sessionId,
    state: STATES.COMPLAINT_PREVIEW,
    intent: 'PROVIDE_COMPLAINT_DETAILS',
    text: `Here’s your draft for **${updatedDraft.location}** — review it below and tap **Create** when ready.`,
    spokenText: `Got it — ${updatedDraft.location}. Draft is ready. Should I submit it?`,
    messageType: 'COMPLAINT_PREVIEW',
    structuredComplaint: updatedDraft,
    complaintDraft: updatedDraft,
    duplicateMatches: null,
    quickActions: ['Create Complaint', 'Edit Details', 'Cancel']
  }
}

async function _handleJoinComplaint(user, message, analysis, complaintDraft, history, sessionId, userRole) {
  let targetId = analysis.extractedEntities?.complaintId
  if (!targetId) {
    const match = message.match(/\b(CR-\d+|CMP-\d+)\b/i)
    if (match) targetId = match[0].toUpperCase()
  }
  if (!targetId) {
    const recentHistoryText = (history || []).map(h => h.text || '').join(' ')
    const match = recentHistoryText.match(/\b(CR-\d+|CMP-\d+)\b/i)
    if (match) targetId = match[0].toUpperCase()
  }

  if (!targetId) {
    // If we have active duplicate matches in candidate history, pick first
    return {
      sessionId,
      state: STATES.IDLE,
      intent: 'GENERAL_QUESTION',
      text: 'Please specify the Complaint ID (e.g. CR-003) you would like to join as an affected student.',
      messageType: 'TEXT_MESSAGE',
      quickActions: getQuickActionsForState(STATES.IDLE, userRole)
    }
  }

  const res = await joinExistingComplaint(targetId, user)
  if (res.success) {
    const text = res.alreadyJoined
      ? `You are already recorded as an affected student for ticket **${targetId}** (*${res.title}*). The ticket currently has **${res.affectedCount} affected students**.`
      : `✓ **Added as an Affected Student to ${targetId}!**\n\nYour report has been linked to **${targetId}** (*${res.title}*). The ticket priority has been updated with **${res.affectedCount} affected students** registered.`

    return {
      sessionId,
      state: STATES.IDLE,
      intent: 'JOIN_COMPLAINT',
      text,
      messageType: 'SUCCESS',
      complaintDraft: null,
      quickActions: [`Status of ${targetId}`, 'Help me create a complaint', 'Show my pending complaints']
    }
  } else {
    return {
      sessionId,
      state: STATES.IDLE,
      intent: 'JOIN_COMPLAINT',
      text: `Could not join complaint ${targetId}: ${res.message}`,
      messageType: 'TEXT_MESSAGE',
      quickActions: getQuickActionsForState(STATES.IDLE, userRole)
    }
  }
}

async function _handleCreateAnyway(complaintDraft, sessionId, userRole) {
  if (!complaintDraft) {
    return {
      sessionId,
      state: STATES.COMPLAINT_DESCRIPTION,
      intent: 'CREATE_COMPLAINT',
      text: 'Please describe the problem you would like to report on campus.',
      messageType: 'COMPLAINT_QUESTION',
      quickActions: ['Seminar Hall projector flickering', 'Computer Lab 3 AC not working', 'Cancel']
    }
  }

  return {
    sessionId,
    state: STATES.COMPLAINT_PREVIEW,
    intent: 'PROVIDE_COMPLAINT_DETAILS',
    text: 'Understood. Here is your complaint draft. You can proceed with creating this ticket independently:',
    messageType: 'COMPLAINT_PREVIEW',
    structuredComplaint: complaintDraft,
    complaintDraft,
    duplicateMatches: null, // Clear duplicate warning
    quickActions: ['Create Complaint', 'Edit Details', 'Cancel']
  }
}

async function _handleViewExisting(user, message, analysis, history, sessionId, userRole) {
  let targetId = analysis.extractedEntities?.complaintId
  if (!targetId) {
    const match = message.match(/\b(CR-\d+|CMP-\d+)\b/i)
    if (match) targetId = match[0].toUpperCase()
  }
  if (!targetId) {
    const recentHistoryText = (history || []).map(h => h.text || '').join(' ')
    const match = recentHistoryText.match(/\b(CR-\d+|CMP-\d+)\b/i)
    if (match) targetId = match[0].toUpperCase()
  }

  if (targetId) {
    return await _handleCheckStatus(user, targetId, { extractedEntities: { complaintId: targetId } }, sessionId, userRole)
  }

  return await _handleShowPending(user, sessionId, userRole)
}

async function _handleGeneralQuestion(message, history, conversationState, sessionId, userRole, lastAssistantMsg) {
  // Search with query rewriting and hybrid scoring
  const { results: ragDocs, queryInfo } = searchCampusKnowledge(message, 3, history, conversationState)
  const ragContext = buildRAGContext(ragDocs)

  if (ragDocs.length > 0 && ragDocs[0].finalScore >= 2.5) {
    // Grounded check: ensure top doc actually contains rare query tokens, else fallback (§19)
    const qTokens = message.toLowerCase().replace(/[^a-z0-9\s]/g,' ').split(/\s+/).filter(t=>t.length>2 && !['the','and','for','you','are','how','what','why','where','when','does','did','work','works','system','project','campus','campusresolve','this','that','with','from'].includes(t))
    if (qTokens.length >0) {
      const topText = (ragDocs[0].title + ' ' + ragDocs[0].content + ' ' + (ragDocs[0].tags||[]).join(' ')).toLowerCase()
      const hasRare = qTokens.some(tok => topText.includes(tok))
      if (!hasRare) {
        return {
          sessionId,
          state: STATES.IDLE,
          intent: 'GENERAL_QUESTION',
          text: "I couldn't find that in the current CampusResolve project context.",
          spokenText: "I couldn't find that in the current project context.",
          messageType: 'TEXT_MESSAGE',
          confidenceLevel: 'Low relevance',
          quickActions: ['How does CampusResolve work?', 'What AI features are implemented?']
        }
      }
    }
    const topScore = ragDocs[0].finalScore || 0
    const confidenceLevel = topScore >= 10 ? 'High relevance' : topScore >= 4.5 ? 'Medium relevance' : 'Low relevance'

    const ragPrompt = `You are CampusResolve AI — a friendly, natural, confident campus assistant.
Answer the question accurately using ONLY the verified campus info below.

Verified info:
${ragContext}

Question: "${queryInfo?.rewritten || message}"

Style: natural, conversational, concise (2-4 sentences for screen). Be friendly, not robotic. Avoid starting with "Certainly", "Of course", "I understand", "I'm here to help". Answer directly, no fluff. Ground strictly in the sources, don't invent details.`

    const ragAnswer = await askGemini(ragPrompt)

    // Validate the LLM response
    const finalText = ragAnswer || ragDocs[0].content
    const validation = validateResponse({
      responseText: finalText,
      currentMessage: message,
      previousAssistantMessage: lastAssistantMsg,
      conversationState,
      intent: 'GENERAL_QUESTION'
    })

    const responseText = validation.valid ? finalText : ragDocs[0].content

    // Minimal contextual suggestions (§15) — not large irrelevant lists
    const questionType = queryInfo?.questionType || ragDocs[0]?.questionType || 'GENERAL'
    let quickActions = ['What can you do?', 'How does CampusResolve work?']
    if (questionType === 'PROCESS') quickActions = ['How does duplicate detection work?', 'What happens after I submit a complaint?']
    else if (questionType === 'TRACKING') quickActions = ['Check complaint status', 'Show my pending complaints']
    else if (questionType === 'FEEDBACK') quickActions = ['How does feedback work?']
    else if (questionType === 'GENERAL' && /ai|voice|rag|gemini/i.test(message)) quickActions = ['What AI features are implemented?', 'How does the voice agent work?']

    return {
      sessionId,
      state: STATES.IDLE,
      intent: 'GENERAL_QUESTION',
      text: responseText,
      messageType: 'RAG_ANSWER',
      confidenceLevel,
      ragSources: ragDocs.map(d => ({ title: d.title, category: d.category })),
      quickActions
    }
  }

  // If no reliable verified context exists — project-aware honest fallback (§4)
  return {
    sessionId,
    state: STATES.IDLE,
    intent: 'GENERAL_QUESTION',
    text: "I couldn't find that in the current project context. Try rephrasing or ask about complaints, feedback, or campus facilities.",
    spokenText: "I couldn't find that in the current project context.",
    messageType: 'TEXT_MESSAGE',
    confidenceLevel: 'Low relevance',
    quickActions: ['How to Submit a Complaint', 'How Complaint Tracking Works', 'Login Help']
  }
}

// ── Helper Functions ─────────────────────────────────────────────────────────

function _hasComplaintDescriptionInMessage(msg, draft) {
  if (draft && draft.title && draft.description) return true
  return /\b(fan|light|projector|wifi|room|lab|desk|marks|ac|water|bus|noise|broken|leaking|damaged|dirty)\b/i.test(msg)
}

function _isComplaintWorkflowState(state) {
  return [
    STATES.COMPLAINT_DESCRIPTION, STATES.COMPLAINT_LOCATION,
    STATES.COMPLAINT_CATEGORY, STATES.COMPLAINT_PREVIEW,
    'COMPLAINT_COLLECTION', 'WAITING_FOR_LOCATION', 'WAITING_FOR_CATEGORY'
  ].includes(state)
}

// ── Exports ──────────────────────────────────────────────────────────────────
module.exports = {
  CONVERSATION_STATES,
  INTENTS,
  orchestrateChat,
  getMyPendingComplaints,
  getMyComplaintStatus,
  getMyComplaintHistory,
  getResolvedComplaintsForFeedback
}
