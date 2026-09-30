/**
 * CampusResolve — UnifiedAssistant §5
 *
 * ONE chatbot launcher where Text and Voice are two interfaces to the SAME:
 *   conversation, workflow, RAG, authentication, and action system.
 *
 * Both modalities call the SAME processUserMessage() from GlobalAIAgentContext.
 * No duplicate launcher, no second floating mic, no duplicate AI pipeline.
 *
 * Voice (continuous): Speech → Text → Unified AI → Response → TTS
 * Text:               Text → Unified AI → Response → UI
 *
 * State machine: IDLE → LISTENING → SPEECH_DETECTED → PROCESSING → AI_SPEAKING → LISTENING
 * User does NOT press mic after every sentence (continuous mode §6)
 */

import React, { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X, Send, Mic, MicOff, Bot, Maximize2, Minimize2, Sparkles,
  RefreshCw, Copy, Check, AlertCircle, ChevronRight, Edit3, Star, Lock, MoreVertical, Volume2, VolumeX, Square
} from 'lucide-react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useGlobalAIAgent } from '../../context/GlobalAIAgentContext'
import { useAuthStore } from '../../store/authStore'
import { ChatMessageContent } from './ChatMessageContent'
import { VoiceVisualizer } from './VoiceVisualizer'
import { UserAvatar } from '../ui/Avatar'
import { speechRecognitionService } from '../../services/voice/speechRecognitionService'
import { textToSpeechService } from '../../services/voice/textToSpeechService'
import { StructuredComplaint, StructuredFeedback, EligibleResolvedComplaint } from '../../services/chatbotService'
import { createComplaintFromChat, submitFeedbackFromChat, fetchEligibleResolvedComplaints } from '../../services/chatbotService'

const GUEST_PROMPTS = [
  { title: 'How to Submit a Complaint', desc: 'Learn how grievances are filed & routed', text: 'How to Submit a Complaint' },
  { title: 'How Complaint Tracking Works', desc: 'Understand ticket lifecycle and resolution', text: 'How Complaint Tracking Works' },
  { title: 'Feedback Information', desc: 'How service ratings & faculty reviews work', text: 'Feedback Information' },
  { title: 'Login Help', desc: 'How to sign in with student or faculty ID', text: 'Login Help' },
]

const STUDENT_PROMPTS = [
  { title: 'Help Me Create a Complaint', desc: 'Describe an issue and AI will draft it', text: 'Help Me Create a Complaint' },
  { title: 'Show My Pending Complaints', desc: 'View all active unresolved tickets', text: 'Show My Pending Complaints' },
  { title: 'Check Complaint Status', desc: 'Look up progress on your submitted tickets', text: 'Check Complaint Status' },
  { title: '⭐ Give Feedback', desc: 'Rate and evaluate resolved complaints', text: 'Give Feedback' },
]

const genId = (p = 'msg') => `${p}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`

export const UnifiedAssistant: React.FC = () => {
  const navigate = useNavigate()
  const location = useLocation()
  // The guest "Sign In" banner is a dead no-op on auth pages (already signing in) — hide it there.
  const isAuthPage = ['/login', '/forgot-password', '/reset-password', '/set-password']
    .some((p) => location.pathname.startsWith(p))
  const {
    messages, isTyping, isOpen, setIsOpen, isMinimized, setIsMinimized,
    processUserMessage, voiceState, playbackState, isMuted,
    isAuthenticated, userRole, activeWorkflow, pageContext,
    startListening, stopListening, toggleListening, clearChat,
    audioLevel, transcript, interimTranscript, isVoiceResponseEnabled,
    voiceEnabled, enableVoice, disableVoice, toggleVoiceEnabled
  } = useGlobalAIAgent() as any

  const user = useAuthStore(s => s.user)
  const [inputValue, setInputValue] = useState('')
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null)
  const [activeMenuMsgId, setActiveMenuMsgId] = useState<string | null>(null)
  const [isEnhancing, setIsEnhancing] = useState(false)
  const [isSubmittingDraft, setIsSubmittingDraft] = useState(false)
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false)
  const [isJoiningComplaint, setIsJoiningComplaint] = useState(false)

  const [editingDraft, setEditingDraft] = useState<StructuredComplaint | null>(null)
  const [editForm, setEditForm] = useState<any>({ title: '', category: 'Infrastructure', department: 'CSE', location: '', priority: 'medium', description: '' })
  const [editingFeedback, setEditingFeedback] = useState<StructuredFeedback | null>(null)
  const [feedbackEditForm, setFeedbackEditForm] = useState<any>({ complaintId: '', complaintTitle: '', rating: 5, comment: '', category: 'Resolution Satisfaction' })

  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const isUserNearBottomRef = useRef(true)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleScroll = () => {
    if (!messagesContainerRef.current) return
    const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current
    isUserNearBottomRef.current = scrollHeight - scrollTop - clientHeight < 100
  }

  const scrollToBottom = useCallback((beh: ScrollBehavior = 'smooth') => {
    if (messagesContainerRef.current) messagesContainerRef.current.scrollTo({ top: messagesContainerRef.current.scrollHeight, behavior: beh })
  }, [])

  useEffect(() => { if (isUserNearBottomRef.current) scrollToBottom('smooth') }, [messages, isTyping, scrollToBottom])

  // Keyboard: Escape stops listening/speaking (§28)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (voiceState === 'LISTENING' || voiceState === 'USER_SPEAKING') stopListening()
        else if (playbackState === 'PLAYING') textToSpeechService.stop()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [voiceState, playbackState, stopListening])

  const handleSendText = async (text?: string) => {
    const t = (text ?? inputValue).trim()
    if (!t || isTyping) return
    setInputValue('')
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
    await processUserMessage({ text: t, source: 'text' })
  }

  const handleTextareaInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value)
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`
    }
  }

  const handleCopyMessage = (id: string, text: string) => {
    navigator.clipboard.writeText(text)
    setCopiedMsgId(id)
    setTimeout(() => setCopiedMsgId(null), 2000)
  }

  const handleRegenerate = () => {
    const lastUser = [...messages].reverse().find(m => m.sender === 'user')
    if (lastUser) void processUserMessage({ text: lastUser.text, source: 'text' })
  }

  const handleEnhance = async () => {
    if (!inputValue.trim()) return
    setIsEnhancing(true)
    try {
      const { enhanceFeedbackText } = await import('../../services/chatbotService')
      const enhanced = await enhanceFeedbackText(inputValue)
      setInputValue(enhanced)
    } catch { /* keep original */ } finally { setIsEnhancing(false) }
  }

  const handleToggleListen = async () => {
    // STRICT: listening toggle only allowed when voiceEnabled === true
    if (!voiceEnabled) return
    if (voiceState === 'LISTENING' || voiceState === 'USER_SPEAKING') {
      stopListening()
    } else {
      if (playbackState === 'PLAYING') textToSpeechService.stop()
      await startListening()
    }
  }

  const handleToggleVoiceEnabled = async () => {
    // Explicit Voice Agent activation — the ONLY way to enable voice (§2)
    if (voiceEnabled) {
      disableVoice()
    } else {
      await enableVoice()
    }
  }

  const handleSpeakMessage = (msgId: string, text: string) => {
    // STRICT: per-message TTS also requires voiceEnabled (§10) and short voice (§6-7)
    if (!voiceEnabled) return
    if (playbackState === 'PLAYING') {
      textToSpeechService.stop()
      return
    }
    // Never read long screen text word-by-word — summarize to 1-3 sentences (10-35 words)
    const isDetailRequestedNow = /tell me more|explain in detail|read the full|complete explanation|more details|full details/i.test(inputValue || text)
    let toSpeak = text || ''
    // If text is long (>38 words or has markdown bullets), summarize to short voice
    const words = toSpeak.replace(/[*_#`[\]|]/g, ' ').split(/\s+/).filter(Boolean)
    if (!isDetailRequestedNow && words.length > 38) {
      const sentences = toSpeak.replace(/```[\s\S]*?```/g, '').split(/[.!?]+/).map(s => s.trim()).filter(Boolean)
      let short = sentences.slice(0, 2).join('. ') + '.'
      const sw = short.split(/\s+/).filter(Boolean)
      if (sw.length > 35) short = sw.slice(0, 32).join(' ') + '.'
      toSpeak = short
    }
    textToSpeechService.speak(toSpeak, msgId)
  }

  // ── Structured Action handlers (card buttons) ───────────────────────────
  const handleCreateComplaintCard = async (draft: StructuredComplaint) => {
    setIsSubmittingDraft(true)
    try {
      await createComplaintFromChat({
        title: draft.title, category: draft.category, department: (draft as any).department || user?.department || 'CSE',
        location: draft.location || '', priority: draft.priority || 'medium', description: draft.description
      })
      // Push success via unified pipeline by sending confirmation text — but direct success is cleaner
      // For now, trigger via voice pipeline: send "Yes" which will complete workflow if active, otherwise show manual success
      if (activeWorkflow) {
        await processUserMessage({ text: 'Yes', source: 'text' })
      } else {
        // No active workflow — just created via card; inform via local message injection through process path
        // Use backend fallback: send a status query to refresh — or directly append success
        // We'll directly call processUserMessage to let orchestrator produce success if workflow existed
        // Otherwise emit local success by calling the card's sibling path in GlobalAIAgent (handled by backend)
        await processUserMessage({ text: `Created complaint: ${draft.title} at ${draft.location}`, source: 'text' })
      }
    } catch (e: any) {
      // Show error via unified pipeline
      await processUserMessage({ text: `Failed to create complaint: ${e?.response?.data?.message || e.message}`, source: 'text' })
    } finally { setIsSubmittingDraft(false) }
  }

  const handleQuickActionClick = (act: string) => {
    if (isTyping) return
    if (/^sign in( to continue)?$/i.test(act)) { navigate('/login'); return }
    if (act === 'Cancel') { void processUserMessage({ text: 'Cancel', source: 'text' }); return }
    if (/^create complaint$/i.test(act)) {
      // Confirmation button on preview card — map to Yes
      const preview = [...messages].reverse().find(m => m.structuredComplaint)
      if (preview?.structuredComplaint) { void handleCreateComplaintCard(preview.structuredComplaint); return }
      void processUserMessage({ text: 'Yes', source: 'text' }); return
    }
    if (/^(submit feedback|use this feedback)$/i.test(act)) {
      const fb = [...messages].reverse().find(m => m.structuredFeedback)?.structuredFeedback
      if (fb) {
        setIsSubmittingFeedback(true)
        submitFeedbackFromChat({ complaintId: fb.complaintId, rating: fb.suggestedRating || 5, comment: fb.suggestedFeedback || '', category: 'Resolution Satisfaction' })
          .then(() => processUserMessage({ text: `Feedback submitted for ${fb.complaintId}`, source: 'text' }))
          .catch(() => processUserMessage({ text: 'Feedback submission failed, please try again.', source: 'text' }))
          .finally(() => setIsSubmittingFeedback(false))
        return
      }
      void processUserMessage({ text: 'Yes', source: 'text' }); return
    }
    if (/^edit details$/i.test(act)) {
      const draft = [...messages].reverse().find(m => m.structuredComplaint)?.structuredComplaint
      if (draft) { setEditingDraft(draft); setEditForm({ title: draft.title || '', category: draft.category || 'Infrastructure', department: (draft as any).department || user?.department || 'CSE', location: (draft as any).location || '', priority: draft.priority || 'medium', description: draft.description || '' }) }
      return
    }
    if (/^edit feedback$/i.test(act)) {
      const fb = [...messages].reverse().find(m => m.structuredFeedback)?.structuredFeedback
      if (fb) { setEditingFeedback(fb); setFeedbackEditForm({ complaintId: fb.complaintId, complaintTitle: fb.complaintTitle, rating: fb.suggestedRating || 5, comment: fb.suggestedFeedback || '', category: 'Resolution Satisfaction' }) }
      return
    }
    // Default: treat as free text sent via unified pipeline (both text & voice docs)
    void processUserMessage({ text: act, source: 'text' })
  }

  const handleSelectComplaintId = (id: string) => {
    if (userRole === 'student') navigate('/student/history')
    else if (userRole === 'teacher') navigate('/teacher')
    else if (userRole === 'admin') navigate('/admin')
    setIsOpen(false)
  }

  const handleSaveEditedDraft = () => {
    if (!editForm.title || !editForm.description) return
    const updated: StructuredComplaint = { ...editForm, isComplete: true }
    setEditingDraft(null)
    void handleCreateComplaintCard(updated)
  }

  const handleSaveEditedFeedback = () => {
    if (!feedbackEditForm.complaintId || !feedbackEditForm.comment) return
    const updated: StructuredFeedback = {
      complaintId: feedbackEditForm.complaintId,
      complaintTitle: feedbackEditForm.complaintTitle,
      sentiment: editingFeedback?.sentiment || 'Neutral',
      resolutionQuality: editingFeedback?.resolutionQuality || 'Satisfactory',
      responseTime: editingFeedback?.responseTime || 'Moderate',
      communication: editingFeedback?.communication || 'Moderate',
      suggestedRating: feedbackEditForm.rating,
      topics: editingFeedback?.topics || ['Overall Experience'],
      summary: editingFeedback?.summary || 'Student feedback',
      suggestedFeedback: feedbackEditForm.comment,
      originalComment: feedbackEditForm.comment,
      suggestedFollowUp: editingFeedback?.suggestedFollowUp
    } as any
    setEditingFeedback(null)
    setIsSubmittingFeedback(true)
    submitFeedbackFromChat({ complaintId: updated.complaintId, rating: updated.suggestedRating, comment: updated.suggestedFeedback, category: 'Resolution Satisfaction' })
      .then(() => processUserMessage({ text: `Feedback for ${updated.complaintId} submitted`, source: 'text' }))
      .catch(() => processUserMessage({ text: 'Feedback submission failed', source: 'text' }))
      .finally(() => setIsSubmittingFeedback(false))
  }

  const handleFeedbackFlow = async () => {
    // Trigger feedback selector via unified pipeline OR direct API for eligible list
    try {
      const res = await fetchEligibleResolvedComplaints()
      if (res.complaints && res.complaints.length > 0) {
        // Push eligibility via a virtual bot message is handled by backend; easiest is to ask unified to give feedback
        void processUserMessage({ text: 'Give feedback', source: 'text' })
      } else {
        void processUserMessage({ text: 'Give feedback', source: 'text' })
      }
    } catch { void processUserMessage({ text: 'Give feedback', source: 'text' }) }
  }

  const activePrompts = !isAuthenticated ? GUEST_PROMPTS : STUDENT_PROMPTS

  // Determine mic button state for a11y
  const isListeningActive = voiceState === 'LISTENING' || voiceState === 'USER_SPEAKING' || (voiceState as any) === 'TRANSCRIBING'

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className={`fixed z-50 overflow-hidden flex flex-col paper-card rounded-md ${
              isFullscreen ? 'top-4 bottom-4 right-4 left-4 md:left-24 md:top-6 md:bottom-6 md:right-6' : 'bottom-6 right-6 w-[430px] max-w-[calc(100vw-32px)] h-[620px] max-h-[calc(100vh-64px)]'
            }`}
            role="dialog" aria-modal="true" aria-label="CampusResolve AI Assistant"
          >
            {/* Header — paper dossier header */}
            <div className="p-3.5 px-4 sm:px-5 border-b-2 border-dashed border-[#e5dcc3] dark:border-white/10 flex items-center justify-between bg-[#efe7d2]/60 dark:bg-white/5 shrink-0 select-none">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className={`paper-font-type w-8 h-8 sm:w-9 sm:h-9 rounded-md ${isAuthenticated ? 'bg-[#1e293b] dark:bg-[#f1f5f9] text-[#fffdf4] dark:text-[#0f172a] border border-[#0f172a] dark:border-[#cbd5e1] shadow-[0_2px_0_#0f172a] dark:shadow-[0_2px_0_#64748b]' : 'bg-transparent border-[1.5px] border-dashed border-[#cbbf9a] text-amber-600'} flex items-center justify-center font-bold transition-colors -rotate-3`}>
                    {isAuthenticated ? <Sparkles className="w-4 h-4" /> : <Lock className="w-4 h-4 text-amber-500" />}
                  </div>
                  <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full ${isAuthenticated ? 'bg-emerald-500 animate-pulse' : 'bg-[var(--text-muted)]'} border-2 border-[var(--paper)]`} />
                </div>
                <div>
                  <h3 className="paper-font-type text-[13.5px] font-bold text-[var(--text-heading)] tracking-tight leading-tight">CampusResolve AI Assistant</h3>
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 font-medium">
                    {isAuthenticated ? (<><span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /><span className="text-emerald-700 dark:text-emerald-400 font-semibold">Personalized assistance enabled.</span></>) : (<><span className="w-1.5 h-1.5 rounded-full bg-slate-400" /><span className="font-medium">Guest Mode</span></>)}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button type="button" onClick={() => setIsOpen(false)} className="p-1.5 rounded-md text-[var(--text-muted)] hover:text-rose-700 hover:bg-rose-500/10 border border-transparent hover:border-dashed hover:border-rose-600/50 transition-colors cursor-pointer" title="Close" aria-label="Close assistant"><X className="w-3.5 h-3.5" /></button>
                <button onClick={() => setIsFullscreen(!isFullscreen)} className="p-1.5 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-black/[0.05] dark:hover:bg-white/10 border border-transparent hover:border-dashed hover:border-[#cbbf9a] transition-colors cursor-pointer hidden sm:flex" title={isFullscreen ? 'Restore' : 'Fullscreen'}><span>{isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}</span></button>
                <button onClick={clearChat} className="p-1.5 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-black/[0.05] dark:hover:bg-white/10 border border-transparent hover:border-dashed hover:border-[#cbbf9a] transition-colors cursor-pointer" title="Clear conversation"><RefreshCw className="w-3.5 h-3.5" /></button>
              </div>
            </div>

            {!isAuthenticated && !isAuthPage && (
              <div className="px-4 py-2 bg-[#f5eedd] dark:bg-amber-950/40 border-b-2 border-dashed border-[#d8cfae] dark:border-amber-900/60 text-[11px] text-amber-900 dark:text-amber-200 flex items-center justify-between gap-2 shrink-0">
                <div className="flex items-center gap-1.5 min-w-0"><Lock className="w-3.5 h-3.5 text-amber-600 shrink-0" /><span className="truncate font-medium">Log in to view your complaints, status updates, feedback history, and personalized AI insights.</span></div>
                <button onClick={() => { setIsOpen(false); navigate('/login') }} className="paper-font-type px-2.5 py-1 rounded-md bg-[#1e293b] hover:bg-[#0f172a] text-[#fffdf4] font-bold text-[10.5px] shrink-0 cursor-pointer border border-[#0f172a] shadow-[0_2px_0_#0f172a]">Sign In</button>
              </div>
            )}

            {/* Messages — ruled ledger paper */}
            <div ref={messagesContainerRef} onScroll={handleScroll} className="flex-1 overflow-y-auto p-3.5 sm:p-4 scrollbar-thin relative bg-[repeating-linear-gradient(to_bottom,transparent_0px,transparent_31px,rgba(37,99,235,0.06)_31px,rgba(37,99,235,0.06)_32px)]">
              <div className="w-full max-w-3xl mx-auto space-y-3">
                {messages.length <= 1 && (
                  <div className="space-y-2 pt-1 pb-1">
                    <span className="paper-font-type text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-[0.18em] block px-1">Suggested Prompts</span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {activePrompts.map(card => (
                        <button key={card.title} onClick={() => handleQuickActionClick(card.text)} disabled={isTyping} className="paper-card rounded-md p-2.5 hover:-translate-y-px hover:shadow-[0_8px_20px_rgba(60,50,30,0.20)] transition-all text-left flex items-start gap-2.5 cursor-pointer group disabled:opacity-50">
                          <div className="w-6 h-6 rounded-md bg-[#1e293b] dark:bg-[#f1f5f9] text-[#fffdf4] dark:text-[#0f172a] flex items-center justify-center shrink-0 -rotate-3 group-hover:rotate-0 transition-transform border border-[#0f172a] dark:border-[#cbd5e1]"><ChevronRight className="w-3.5 h-3.5" /></div>
                          <div className="min-w-0"><h4 className="paper-font-type text-[12.5px] font-bold text-[var(--text-heading)] leading-snug">{card.title}</h4><p className="text-[11px] text-[var(--text-muted)] mt-0.5 leading-snug truncate font-medium">{card.desc}</p></div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {messages.map((msg: any) => (
                  <motion.div key={msg.id} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.18 }} className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}>
                    <div className={`flex items-start gap-2 ${msg.sender === 'user' ? 'flex-row-reverse max-w-[85%] sm:max-w-[70%]' : 'flex-row max-w-[92%] sm:max-w-[85%]'}`}>
                      {msg.sender === 'user' ? (
                        <UserAvatar src={user?.profilePicture || user?.profileImage} name={user?.name} size="sm" className="h-6 w-6 sm:h-7 sm:w-7 rounded-md border border-[#e5dcc3] dark:border-white/15 ring-2 ring-[#e5dcc3] dark:ring-white/10 shrink-0 mt-0.5" />
                      ) : (
                        <div className="paper-font-type w-6 h-6 sm:h-7 sm:w-7 rounded-md bg-[#1e293b] dark:bg-[#f1f5f9] text-[#fffdf4] dark:text-[#0f172a] flex items-center justify-center shrink-0 border border-[#0f172a] dark:border-[#cbd5e1] shadow-[0_2px_0_#0f172a] dark:shadow-[0_2px_0_#64748b] mt-0.5 -rotate-3"><Bot className="w-3.5 h-3.5" /></div>
                      )}
                      <div className={`p-3.5 break-words overflow-hidden ${msg.sender === 'user' ? 'rounded-md rounded-tr-none bg-[#1e293b] dark:bg-[#f1f5f9] text-[#fffdf4] dark:text-[#0f172a] border border-[#0f172a] dark:border-[#cbd5e1] shadow-[0_2px_0_#0f172a] dark:shadow-[0_2px_0_#64748b]' : msg.messageType === 'SUCCESS' ? 'rounded-md rounded-tl-none paper-card border-l-4 !border-l-emerald-500 text-[var(--text-body)]' : 'rounded-md rounded-tl-none paper-card text-[var(--text-body)]'}`}>
                        <ChatMessageContent
                          content={msg.text} isUser={msg.sender === 'user'}
                          structuredComplaint={msg.structuredComplaint} structuredFeedback={msg.structuredFeedback}
                          duplicateMatches={msg.duplicateMatches} queryResults={msg.queryResults}
                          eligibleComplaints={msg.eligibleComplaints} ragSources={msg.ragSources} widgetData={msg.widgetData}
                          onCreateComplaint={(d) => handleCreateComplaintCard(d)}
                          onEditComplaint={(d) => { setEditingDraft(d); setEditForm({ title: d.title || '', category: d.category || 'Infrastructure', department: (d as any).department || user?.department || 'CSE', location: (d as any).location || '', priority: d.priority || 'medium', description: d.description || '' }) }}
                          onCancelComplaint={() => void processUserMessage({ text: 'Cancel', source: 'text' })}
                          onSubmitFeedback={(fb) => { setIsSubmittingFeedback(true); submitFeedbackFromChat({ complaintId: fb.complaintId, rating: fb.suggestedRating || 5, comment: fb.suggestedFeedback || '', category: 'Resolution Satisfaction' }).then(() => processUserMessage({ text: `Feedback for ${fb.complaintId} submitted`, source: 'text' })).catch(() => {}).finally(() => setIsSubmittingFeedback(false)) }}
                          onEditFeedback={(fb) => { setEditingFeedback(fb); setFeedbackEditForm({ complaintId: fb.complaintId, complaintTitle: fb.complaintTitle, rating: fb.suggestedRating || 5, comment: fb.suggestedFeedback || '', category: 'Resolution Satisfaction' }) }}
                          onCancelFeedback={() => void processUserMessage({ text: 'Cancel', source: 'text' })}
                          onSelectResolvedComplaint={(c) => void processUserMessage({ text: `Give feedback for ${c.complaintId}`, source: 'text' })}
                          onSelectComplaintId={(id) => handleSelectComplaintId(id)}
                          onJoinComplaint={async (cid) => { setIsJoiningComplaint(true); try { const { joinComplaintFromChat } = await import('../../services/chatbotService'); await joinComplaintFromChat(cid); void processUserMessage({ text: `Joined complaint ${cid}`, source: 'text' }) } catch (err) { console.warn('Join complaint from chat failed:', err) } finally { setIsJoiningComplaint(false) } }}
                          onCreateAnyway={(d) => handleCreateComplaintCard(d)}
                          isSubmittingDraft={isSubmittingDraft} isSubmittingFeedback={isSubmittingFeedback} isJoiningComplaint={isJoiningComplaint}
                          onSpeak={voiceEnabled ? () => handleSpeakMessage(msg.id, (msg as any).spokenText || msg.text) : undefined} onStopSpeak={() => textToSpeechService.stop()}
                        />
                      </div>
                    </div>
                    <div className={`flex items-center gap-2 mt-1 mx-8 sm:mx-9 paper-font-type text-[10.5px] font-bold text-[var(--text-muted)] ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      <div className="relative flex items-center gap-1">
                        {msg.sender === 'bot' && (
                          <>
                            <button onClick={() => handleCopyMessage(msg.id, msg.text)} className="hover:text-slate-700 dark:hover:text-slate-200 transition-colors p-0.5 cursor-pointer" title="Copy response">{copiedMsgId === msg.id ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}</button>
                            <button onClick={handleRegenerate} disabled={isTyping} className="hover:text-slate-700 dark:hover:text-slate-200 transition-colors p-0.5 cursor-pointer disabled:opacity-40" title="Regenerate"><RefreshCw className="w-3 h-3" /></button>
                          </>
                        )}
                        <button onClick={() => setActiveMenuMsgId(activeMenuMsgId === msg.id ? null : msg.id)} className="hover:text-slate-700 dark:hover:text-slate-200 transition-colors p-0.5 cursor-pointer" title="More"><MoreVertical className="w-3 h-3" /></button>
                        {activeMenuMsgId === msg.id && (
                          <div className="absolute top-5 z-30 min-w-[130px] rounded-md paper-card py-1 paper-font-type text-[11px] font-bold text-[var(--text-primary)]">
                            <button onClick={() => { handleCopyMessage(msg.id, msg.text); setActiveMenuMsgId(null) }} className="w-full text-left px-3 py-1.5 hover:bg-black/[0.04] dark:hover:bg-white/5 flex items-center gap-1.5 cursor-pointer"><Copy className="w-3 h-3" /><span>Copy Text</span></button>
                            {msg.sender === 'bot' && <button onClick={() => { handleRegenerate(); setActiveMenuMsgId(null) }} disabled={isTyping} className="w-full text-left px-3 py-1.5 hover:bg-black/[0.04] dark:hover:bg-white/5 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"><RefreshCw className="w-3 h-3" /><span>Retry</span></button>}
                          </div>
                        )}
                      </div>
                    </div>
                    {msg.quickActions && msg.quickActions.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-1.5 ml-8 sm:ml-9 max-w-[92%] sm:max-w-[85%]">
                        {msg.quickActions.map((act: string) => (
                          <button key={`qa-${act}`} onClick={() => handleQuickActionClick(act)} disabled={isTyping} className="paper-font-type px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider border-[1.5px] border-dashed border-[#cbbf9a] dark:border-slate-500 bg-[var(--paper)] text-[var(--text-primary)] hover:bg-[#f5eedd] dark:hover:bg-white/10 hover:-translate-y-px transition-all cursor-pointer shadow-[0_1px_0_rgba(60,50,30,0.3)] disabled:opacity-40 -rotate-[0.4deg]">{act}</button>
                        ))}
                      </div>
                    )}
                  </motion.div>
                ))}

                {isTyping && (
                  <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="flex items-start gap-2">
                    <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-md bg-[#1e293b] dark:bg-[#f1f5f9] text-[#fffdf4] dark:text-[#0f172a] flex items-center justify-center shrink-0 border border-[#0f172a] dark:border-[#cbd5e1] mt-0.5 -rotate-3"><Bot className="w-3.5 h-3.5" /></div>
                    <div className="px-3.5 py-2.5 rounded-md rounded-tl-none paper-card flex items-center gap-2.5">
                      <div className="w-2 h-2 rounded-full bg-[#1e293b] dark:bg-[#f1f5f9] animate-pulse" />
                      <span className="paper-font-type text-[11.5px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                        {voiceState === 'PROCESSING' ? 'Thinking…' : voiceState === 'AI_SPEAKING' ? 'Voicing…' : 'Thinking…'}
                      </span>
                      <div className="flex items-center gap-1 ml-1"><span className="w-1 h-1 rounded-full bg-[#1e293b] dark:bg-slate-300 animate-bounce" /><span className="w-1 h-1 rounded-full bg-[#1e293b] dark:bg-slate-300 animate-bounce [animation-delay:0.15s]" /><span className="w-1 h-1 rounded-full bg-[#1e293b] dark:bg-slate-300 animate-bounce [animation-delay:0.3s]" /></div>
                    </div>
                  </motion.div>
                )}
              </div>
            </div>

            {/* Polish bar — kraft slip */}
            <AnimatePresence>
              {inputValue.trim().length > 15 && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="px-4 py-1.5 border-t-2 border-dashed border-[#e5dcc3] dark:border-white/10 bg-[#f5eedd]/70 dark:bg-white/5 overflow-hidden">
                  <div className="w-full max-w-3xl mx-auto flex items-center justify-between">
                    <div className="paper-font-type flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[#1e293b] dark:text-slate-200"><Sparkles className="w-3.5 h-3.5" /><span>Improve text</span></div>
                    <button onClick={handleEnhance} disabled={isEnhancing} className="paper-font-type px-2.5 py-1 rounded-md text-[11px] font-bold bg-[#1e293b] dark:bg-[#f1f5f9] text-[#fffdf4] dark:text-[#0f172a] hover:bg-[#0f172a] dark:hover:bg-white transition-all cursor-pointer border border-[#0f172a] dark:border-[#cbd5e1] shadow-[0_2px_0_#0f172a] dark:shadow-[0_2px_0_#64748b] disabled:opacity-50">{isEnhancing ? 'Polishing…' : '✨ Polish'}</button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Composer — paper desk with dashed ink tray */}
            <div className="p-3 sm:p-3.5 border-t-2 border-dashed border-[#e5dcc3] dark:border-white/10 bg-[var(--paper)] shrink-0">
              <div className="w-full max-w-3xl mx-auto space-y-1.5">
                {/* ── Strict Voice Mode Toggle Bar (§16) ── */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <div className={`paper-font-type px-2.5 py-1 rounded-md text-[10.5px] font-bold uppercase tracking-wider border-[1.5px] border-dashed flex items-center gap-1 transition-colors ${!voiceEnabled ? 'bg-[#1e293b] dark:bg-[#f1f5f9] text-[#fffdf4] dark:text-[#0f172a] border-[#0f172a] dark:border-[#cbd5e1]' : 'bg-transparent text-[var(--text-muted)] border-[#cbbf9a] dark:border-slate-500'}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${!voiceEnabled ? 'bg-emerald-400 animate-pulse' : 'bg-slate-300'}`} /> Text Chat
                    </div>
                    <div className={`paper-font-type px-2.5 py-1 rounded-md text-[10.5px] font-bold uppercase tracking-wider border-[1.5px] border-dashed flex items-center gap-1 transition-colors ${voiceEnabled ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-600/60' : 'bg-transparent text-[var(--text-muted)] border-[#cbbf9a] dark:border-slate-500'}`}>
                      <Mic className="w-3 h-3" /> Voice Agent {voiceEnabled && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse ml-1" />}
                    </div>
                    <span className="paper-font-type hidden sm:inline text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] ml-1">{voiceEnabled ? 'Voice Active' : 'Text Mode'}</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleToggleVoiceEnabled}
                    className={`paper-font-type px-3 py-1.5 rounded-md text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer border ${voiceEnabled ? 'bg-[#b91c1c] hover:bg-[#991b1b] text-white border-[#450a0a] shadow-[0_2px_0_#450a0a]' : 'bg-[#1e293b] dark:bg-[#f1f5f9] hover:bg-[#0f172a] dark:hover:bg-white text-[#fffdf4] dark:text-[#0f172a] border-[#0f172a] dark:border-[#cbd5e1] shadow-[0_2px_0_#0f172a] dark:shadow-[0_2px_0_#64748b]'}`}
                    aria-label={voiceEnabled ? 'Disable Voice Agent' : 'Enable Voice Agent'}
                    aria-pressed={voiceEnabled}
                  >
                    {voiceEnabled ? <><MicOff className="w-3.5 h-3.5" /> Voice Agent Active</> : <><Mic className="w-3.5 h-3.5" /> Start Voice Agent</>}
                  </button>
                </div>

                {/* Voice Visualizer — ONLY when voiceEnabled === true (§2) */}
                <AnimatePresence>
                  {voiceEnabled && (voiceState !== 'IDLE' || playbackState !== 'STOPPED') && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mb-1.5">
                      <VoiceVisualizer
                        voiceState={voiceState as any}
                        playbackState={playbackState}
                        isMuted={isMuted}
                        transcript={interimTranscript || transcript || inputValue}
                        onStopListening={stopListening}
                        onPauseSpeaking={() => textToSpeechService.pause()}
                        onResumeSpeaking={() => textToSpeechService.resume()}
                        onStopSpeaking={() => textToSpeechService.stop()}
                        onReplaySpeaking={() => textToSpeechService.replay()}
                        onToggleMute={() => { textToSpeechService.toggleMute() }}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="flex items-end gap-2 rounded-md p-1.5 px-3 bg-transparent border-[1.5px] border-dashed border-[#cbbf9a] dark:border-slate-500 focus-within:border-solid focus-within:border-[#1e293b] dark:focus-within:border-slate-300 focus-within:bg-[#fffef9] dark:focus-within:bg-white/5 transition-all">
                  <textarea
                    ref={textareaRef} rows={1} value={inputValue} onChange={handleTextareaInput}
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendText() } }}
                    placeholder={voiceEnabled ? 'Voice Agent Active — type or speak…' : 'Ask about a complaint, check a status, create a grievance, or share feedback…'}
                    className="flex-1 bg-transparent py-1.5 paper-font-type font-bold text-[13.5px] text-[var(--text-heading)] placeholder:text-[12.5px] placeholder:font-sans placeholder:font-normal placeholder:text-[var(--text-muted)] focus:outline-none resize-none min-h-[24px] max-h-[120px] border-0 !shadow-none"
                    aria-label="Type your message to CampusResolve AI"
                  />
                  <div className="flex items-center gap-1 shrink-0 pb-0.5">
                    {/* Mic ONLY when Voice Agent explicitly enabled (§2, §11) */}
                    {voiceEnabled && speechRecognitionService.isAvailable() && (
                      <button
                        type="button" onClick={handleToggleListen}
                        aria-label={isListeningActive ? 'Stop voice recording' : 'Start voice recording'}
                        className={`relative p-2 rounded-md border-[1.5px] border-dashed transition-all cursor-pointer ${isListeningActive ? 'text-[#fffdf4] bg-[#1e293b] border-[#0f172a]' : voiceState === 'PROCESSING' || (voiceState as any) === 'AI_THINKING' ? 'text-violet-700 bg-violet-500/10 border-violet-600/50' : voiceState === 'AI_SPEAKING' ? 'text-emerald-700 bg-emerald-500/10 border-emerald-600/50' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-black/[0.04] border-[#cbbf9a] dark:border-slate-500'}`}
                        title={isListeningActive ? 'Listening… Click to stop' : voiceState === 'AI_SPEAKING' ? 'AI Speaking… Click to interrupt (barge-in)' : 'Voice Input — continuous conversation'}
                      >
                        {isListeningActive ? (<><span className="absolute inset-0 rounded-md bg-[#1e293b] animate-ping opacity-20" /><Square className="w-3.5 h-3.5 fill-current relative z-10" /></>) : voiceState === 'PROCESSING' ? (<RefreshCw className="w-3.5 h-3.5 animate-spin text-violet-700" />) : voiceState === 'AI_SPEAKING' ? (<Volume2 className="w-3.5 h-3.5 text-emerald-700 animate-pulse" />) : (<Mic className="w-4 h-4" />)}
                      </button>
                    )}
                    <button
                      type="button" onClick={() => handleSendText()} disabled={!inputValue.trim() || isTyping}
                      className="paper-font-type w-8 h-8 rounded-md bg-[#1e293b] dark:bg-[#f1f5f9] text-[#fffdf4] dark:text-[#0f172a] flex items-center justify-center hover:bg-[#0f172a] dark:hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed transition-all border border-[#0f172a] dark:border-[#cbd5e1] shadow-[0_2px_0_#0f172a] dark:shadow-[0_2px_0_#64748b] cursor-pointer -rotate-3"
                      aria-label="Send message"
                    ><Send className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
                {/* Strict hint */}
                <p className="paper-font-type text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] text-center hidden sm:block" aria-live="polite">
                  {voiceEnabled ? (
                    <>Voice Agent Active — speak naturally. <kbd className="px-1 py-0.5 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 rounded text-[10px]">Esc</kbd> to stop listening/speaking. Toggle off to return to silent text chat.</>
                  ) : (
                    <>Text mode: responses are silent. Press <span className="font-bold text-slate-600 dark:text-slate-300">Start Voice Agent</span> to enable voice conversation.</>
                  )}
                </p>
              </div>
            </div>

            {/* Edit Complaint Modal — paper slip */}
            {editingDraft && (
              <div className="absolute inset-0 z-50 bg-black/50 flex items-center justify-center p-3.5">
                <div className="w-full max-w-[390px] paper-card rounded-md p-4 space-y-3">
                  <div className="flex items-center justify-between border-b-2 border-dashed border-[#e5dcc3] dark:border-white/10 pb-2">
                    <h4 className="paper-font-type text-[13px] font-bold uppercase tracking-wider text-[var(--text-heading)] flex items-center gap-1.5"><Edit3 className="w-4 h-4" /> Edit Complaint Details</h4>
                    <button onClick={() => setEditingDraft(null)} className="p-1 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-black/[0.05] cursor-pointer"><X className="w-4 h-4" /></button>
                  </div>
                  <div className="space-y-2 text-[12px]">
                    <div><label className="text-[11px] font-medium text-slate-500 block mb-1">Title</label><input type="text" value={editForm.title} onChange={e => setEditForm((p: any) => ({ ...p, title: e.target.value }))} className="w-full p-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-[12.5px] focus:outline-none focus:border-blue-500" /></div>
                    <div className="grid grid-cols-2 gap-2">
                      <div><label className="text-[11px] font-medium text-slate-500 block mb-1">Category</label><select value={editForm.category} onChange={e => setEditForm((p: any) => ({ ...p, category: e.target.value }))} className="w-full p-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-[12px] focus:outline-none"><option>Infrastructure</option><option>Academics</option><option>Transport</option><option>Hostel</option><option>General</option></select></div>
                      <div><label className="text-[11px] font-medium text-slate-500 block mb-1">Priority</label><select value={editForm.priority} onChange={e => setEditForm((p: any) => ({ ...p, priority: e.target.value }))} className="w-full p-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-[12px] focus:outline-none"><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="Urgent">Urgent</option></select></div>
                    </div>
                    <div><label className="text-[11px] font-medium text-slate-500 block mb-1">Location / Room</label><input type="text" value={editForm.location} onChange={e => setEditForm((p: any) => ({ ...p, location: e.target.value }))} placeholder="e.g. Seminar Hall, Lab 3" className="w-full p-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-[12.5px] focus:outline-none focus:border-blue-500" /></div>
                    <div><label className="text-[11px] font-medium text-slate-500 block mb-1">Description</label><textarea rows={3} value={editForm.description} onChange={e => setEditForm((p: any) => ({ ...p, description: e.target.value }))} className="w-full p-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-[12.5px] focus:outline-none focus:border-blue-500 resize-none" /></div>
                  </div>
                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button onClick={() => setEditingDraft(null)} className="px-3 py-1.5 rounded-xl text-[12px] text-slate-500 hover:text-slate-700 cursor-pointer">Cancel</button>
                    <button onClick={handleSaveEditedDraft} className="px-3.5 py-1.5 rounded-xl text-[12px] font-semibold bg-slate-900 dark:bg-blue-600 text-white hover:opacity-90 cursor-pointer shadow-xs">Save & Create</button>
                  </div>
                </div>
              </div>
            )}

            {/* Edit Feedback Modal — paper slip */}
            {editingFeedback && (
              <div className="absolute inset-0 z-50 bg-black/50 flex items-center justify-center p-3.5">
                <div className="w-full max-w-[390px] paper-card rounded-md p-4 space-y-3">
                  <div className="flex items-center justify-between border-b-2 border-dashed border-[#e5dcc3] dark:border-white/10 pb-2">
                    <h4 className="paper-font-type text-[13px] font-bold uppercase tracking-wider text-[var(--text-heading)] flex items-center gap-1.5"><Star className="w-4 h-4 text-amber-600 fill-amber-500" /> Edit Feedback Details</h4>
                    <button onClick={() => setEditingFeedback(null)} className="p-1 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"><X className="w-4 h-4" /></button>
                  </div>
                  <div className="space-y-2.5 text-[12px]">
                    <div><span className="text-[11px] font-mono text-blue-600 block font-bold">{feedbackEditForm.complaintId}</span><span className="text-[13px] font-semibold text-slate-900 dark:text-white">{feedbackEditForm.complaintTitle}</span></div>
                    <div><label className="text-[11px] font-medium text-slate-500 block mb-1">Satisfaction Rating</label><div className="flex items-center gap-2">{[1,2,3,4,5].map(star => (<button key={star} type="button" onClick={() => setFeedbackEditForm((p: any) => ({ ...p, rating: star }))} className="p-1 cursor-pointer hover:scale-110 transition-transform"><Star className={`w-5 h-5 ${star <= feedbackEditForm.rating ? 'text-amber-500 fill-amber-500' : 'text-slate-300 dark:text-slate-600'}`} /></button>))}<span className="text-[12px] font-bold ml-1">{feedbackEditForm.rating}/5</span></div></div>
                    <div><label className="text-[11px] font-medium text-slate-500 block mb-1">Feedback Comments</label><textarea rows={3} value={feedbackEditForm.comment} onChange={e => setFeedbackEditForm((p: any) => ({ ...p, comment: e.target.value }))} className="w-full p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-[12.5px] focus:outline-none focus:border-blue-500 resize-none" /></div>
                  </div>
                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button onClick={() => setEditingFeedback(null)} className="px-3 py-1.5 rounded-xl text-[12px] text-slate-500 hover:text-slate-700 cursor-pointer">Cancel</button>
                    <button onClick={handleSaveEditedFeedback} className="px-3.5 py-1.5 rounded-xl text-[12px] font-semibold bg-slate-900 dark:bg-blue-600 text-white hover:opacity-90 cursor-pointer shadow-xs">Submit Feedback</button>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Single Floating Launcher (§5) — ink stamp */}
      {!isOpen && (
        <motion.button
          initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.2, type: 'spring', stiffness: 260, damping: 20 }}
          whileHover={{ scale: 1.05, rotate: 0 }} whileTap={{ scale: 0.95 }}
          onClick={() => setIsOpen(true)}
          className="paper-font-type fixed bottom-6 right-6 z-50 h-[56px] w-[56px] rounded-md bg-[#1e293b] dark:bg-[#f1f5f9] text-[#fffdf4] dark:text-[#0f172a] flex items-center justify-center border border-[#0f172a] dark:border-[#cbd5e1] shadow-[0_3px_0_#0f172a] dark:shadow-[0_3px_0_#64748b] hover:shadow-[0_5px_0_#0f172a] transition-all cursor-pointer -rotate-3"
          aria-label="Open CampusResolve AI Assistant — unified text and voice agent"
        >
          <div className="relative flex items-center justify-center"><Sparkles className="w-5 h-5" /><span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-[#1e293b] dark:border-[#f1f5f9] animate-pulse" /></div>
        </motion.button>
      )}
    </>
  )
}

export default UnifiedAssistant
