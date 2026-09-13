/**
 * CampusResolve — UnifiedConversationManager
 *
 * Single persistent global conversation manager.
 * Holds ONE session that survives route changes, login/logout, and modality switches.
 * Text and Voice BOTH call processUserMessage() on this manager — they share:
 *   conversationId, sessionId, messages, activeWorkflow, expectedInput,
 *   collectedData, selectedEntity, searchResults, pageContext.
 *
 * State per spec §3:
 * {
 *   conversationId, sessionId, authenticatedUser, currentRoute, pageContext,
 *   activeWorkflow, expectedInput, collectedData, conversationHistory,
 *   selectedEntity, searchResults, pendingAction,
 *   isListening, isProcessing, isSpeaking, voiceMode, requestId
 * }
 */

import { ChatMessage } from '../chatbotService'
import { ActiveWorkflow, ExpectedInputType } from './workflowTypes'
import { PageContext } from '../../types/voiceAgent'
import { pageContextService } from './pageContextService'

export interface UnifiedSessionState {
  conversationId: string
  sessionId: string
  authenticatedUser: any | null
  currentRoute: string
  pageContext: PageContext
  activeWorkflow: ActiveWorkflow | null
  expectedInput: ExpectedInputType | null
  collectedData: any
  conversationHistory: ChatMessage[]
  selectedEntity: any | null
  searchResults: any[]
  pendingAction: any | null
  isListening: boolean
  isProcessing: boolean
  isSpeaking: boolean
  voiceMode: 'CONTINUOUS' | 'PUSH_TO_TALK'
  requestId: string
}

const SESSION_STORAGE_KEY = 'campusresolve_unified_session'

const genId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

export class UnifiedConversationManager {
  private state: UnifiedSessionState
  private subscribers: Set<(s: UnifiedSessionState) => void> = new Set()

  // request deduplication (§24)
  private processedHashes: Map<string, number> = new Map()
  private abortController: AbortController | null = null

  constructor() {
    this.state = this.createInitialState()
    this.loadFromStorage()
  }

  private createInitialState(): UnifiedSessionState {
    return {
      conversationId: genId('conv'),
      sessionId: genId('sess'),
      authenticatedUser: null,
      currentRoute: typeof window !== 'undefined' ? window.location.pathname : '/',
      pageContext: pageContextService.getContextFromPath(typeof window !== 'undefined' ? window.location.pathname : '/'),
      activeWorkflow: null,
      expectedInput: null,
      collectedData: null,
      conversationHistory: [],
      selectedEntity: null,
      searchResults: [],
      pendingAction: null,
      isListening: false,
      isProcessing: false,
      isSpeaking: false,
      voiceMode: 'CONTINUOUS',
      requestId: genId('req')
    }
  }

  private loadFromStorage(): void {
    try {
      const raw = sessionStorage.getItem(SESSION_STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw)
        // Restore only safe, non-sensitive fields; reset volatile audio flags
        this.state.conversationId = parsed.conversationId || this.state.conversationId
        this.state.sessionId = parsed.sessionId || this.state.sessionId
        this.state.conversationHistory = (parsed.conversationHistory || []).map((m: any) => ({ ...m, timestamp: new Date(m.timestamp) }))
        this.state.selectedEntity = parsed.selectedEntity ?? null
        this.state.searchResults = parsed.searchResults ?? []
      }
    } catch { /* ignore */ }
  }

  private persist(): void {
    try {
      sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify({
        conversationId: this.state.conversationId,
        sessionId: this.state.sessionId,
        conversationHistory: this.state.conversationHistory.slice(-30),
        selectedEntity: this.state.selectedEntity,
        searchResults: this.state.searchResults
      }))
    } catch { /* ignore */ }
  }

  // ── Subscriptions ─────────────────────────────────────────────────────
  subscribe(cb: (s: UnifiedSessionState) => void): () => void {
    this.subscribers.add(cb)
    return () => this.subscribers.delete(cb)
  }

  private notify(): void {
    this.persist()
    for (const cb of this.subscribers) cb({ ...this.state })
  }

  getState(): UnifiedSessionState {
    return { ...this.state }
  }

  // ── Session setters (route, auth, workflow, page) ───────────────────
  setRoute(route: string): void {
    this.state.currentRoute = route
    this.state.pageContext = pageContextService.getContextFromPath(route, this.state.selectedEntity?.complaintId || this.state.selectedEntity?.id || null)
    this.notify()
  }

  setPageContext(ctx: PageContext): void {
    this.state.pageContext = ctx
    this.notify()
  }

  setAuthUser(user: any | null): void {
    this.state.authenticatedUser = user
    this.notify()
  }

  setActiveWorkflow(wf: ActiveWorkflow | null): void {
    this.state.activeWorkflow = wf
    this.state.expectedInput = wf?.expectedInput ?? null
    this.state.collectedData = wf?.collectedData ?? this.state.collectedData
    this.state.pendingAction = wf?.status === 'AWAITING_CONFIRMATION' ? 'CONFIRM_SUBMISSION' : null
    this.notify()
  }

  setSelectedEntity(entity: any | null): void {
    this.state.selectedEntity = entity
    this.notify()
  }

  setSearchResults(results: any[]): void {
    this.state.searchResults = results
    this.notify()
  }

  setVoiceMode(mode: 'CONTINUOUS' | 'PUSH_TO_TALK'): void {
    this.state.voiceMode = mode
    this.notify()
  }

  setListening(v: boolean): void {
    this.state.isListening = v
    this.notify()
  }

  setProcessing(v: boolean): void {
    this.state.isProcessing = v
    this.notify()
  }

  setSpeaking(v: boolean): void {
    this.state.isSpeaking = v
    this.notify()
  }

  newRequestId(): string {
    this.state.requestId = genId('req')
    return this.state.requestId
  }

  // ── ConversationHistory (ONLY via this manager) ───────────────────────
  appendMessage(msg: ChatMessage): void {
    // dedup by id
    if (this.state.conversationHistory.some(m => m.id === msg.id)) return
    this.state.conversationHistory = [...this.state.conversationHistory, msg]
    this.notify()
  }

  appendMessages(msgs: ChatMessage[]): void {
    for (const m of msgs) this.appendMessage(m)
  }

  clearConversation(): void {
    this.state.conversationHistory = []
    this.state.activeWorkflow = null
    this.state.expectedInput = null
    this.state.collectedData = null
    this.state.pendingAction = null
    this.state.selectedEntity = null
    this.state.searchResults = []
    this.notify()
  }

  // §12 Logout security — purge private state
  purgePrivateState(): void {
    this.state.conversationHistory = this.state.conversationHistory.filter(m => {
      // Keep only public assistant welcome & general RAG; remove user private turns
      // Simplistic: drop USER_TEXT that looks like private workflow
      return !(m.sender === 'user' && /\b(create a complaint|my complaint|show my|feedback for)\b/i.test(m.text))
    })
    // Clear workflow/draft/search/selected
    this.state.activeWorkflow = null
    this.state.expectedInput = null
    this.state.collectedData = null
    this.state.pendingAction = null
    this.state.selectedEntity = null
    this.state.searchResults = []
    this.state.sessionId = genId('sess')
    this.notify()
    try { sessionStorage.removeItem(SESSION_STORAGE_KEY) } catch { /* ignore */ }
  }

  // ── Request deduplication (§24) ───────────────────────────────────────
  hashTranscript(text: string): string {
    let h = 0
    for (let i = 0; i < text.length; i++) h = ((h << 5) - h) + text.charCodeAt(i) | 0
    return `${h}-${text.length}-${text.slice(0, 20)}`
  }

  isDuplicateRequest(text: string, requestId?: string): boolean {
    if (requestId && this.processedHashes.has(requestId)) return true
    const hash = this.hashTranscript(text.trim().toLowerCase())
    if (this.processedHashes.has(hash)) {
      const ts = this.processedHashes.get(hash)!
      if (Date.now() - ts < 2500) return true // 2.5s window matches ChatAssistant
    }
    this.processedHashes.set(hash, Date.now())
    if (requestId) this.processedHashes.set(requestId, Date.now())
    // prune > 200 entries / >30s
    if (this.processedHashes.size > 200) {
      const now = Date.now()
      for (const [k, ts] of this.processedHashes) if (now - ts > 30000) this.processedHashes.delete(k)
    }
    return false
  }

  // AbortController per §24
  createAbortController(): AbortSignal {
    if (this.abortController) this.abortController.abort()
    this.abortController = new AbortController()
    return this.abortController.signal
  }

  abortInFlight(): void {
    if (this.abortController) this.abortController.abort()
    this.abortController = null
  }

  getAbortSignal(): AbortSignal | undefined {
    return this.abortController?.signal
  }

  // Generate history payload for backend (last 8 turns)
  getHistoryPayload(): Array<{ sender: 'user' | 'bot'; text: string }> {
    return this.state.conversationHistory.slice(-8).map(m => ({ sender: m.sender, text: m.text }))
  }

  getLastAssistantMessage(): string {
    const last = [...this.state.conversationHistory].reverse().find(m => m.sender === 'bot')
    return last?.text || ''
  }
}

export const unifiedConversationManager = new UnifiedConversationManager()
