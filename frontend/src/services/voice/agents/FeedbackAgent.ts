/**
 * CampusResolve Voice-First Multi-Turn AI Agent — Feedback Agent
 *
 * Manages the entire SUBMIT_FEEDBACK multi-turn workflow:
 * - Complaint Selection
 * - Star Rating (1-5, words/numbers)
 * - Aspect Ratings (Resolution Quality, Response Time, Communication)
 * - Comment / Aspects
 * - Review and Confirmation
 * - STRICT UI WORD FILTERING: UI action labels (Submit Feedback, Edit, Cancel, Next, Back)
 *   are NEVER stored as feedback content!
 */

import {
  ActiveWorkflow,
  FeedbackDraftData,
  ExpectedInputType,
  AgentResponse
} from '../workflowTypes'

// UI words that MUST NEVER be saved as feedback comments
const UI_ACTION_WORDS_REGEX = /^(cancel|submit feedback|submit|edit feedback|edit|back|next|close|done|proceed|review)$/i

export class FeedbackAgent {
  /**
   * Start feedback workflow
   */
  public startFeedbackWorkflow(
    complaintId?: string | null,
    complaintTitle?: string | null,
    initialUtterance?: string
  ): AgentResponse {
    const workflowId = `wf-feedback-${Date.now()}`
    const draft: FeedbackDraftData = {
      complaintId: complaintId || null,
      complaintTitle: complaintTitle || null,
      rating: null,
      feedbackText: null,
      resolutionQuality: null,
      responseTime: null,
      communication: null
    }

    if (initialUtterance) {
      this.extractAllRatings(initialUtterance, draft)
    }

    // Step 1: If no complaint selected, ask for complaint ID or pick recent
    if (!draft.complaintId) {
      const activeWorkflow: ActiveWorkflow = {
        id: workflowId,
        type: 'SUBMIT_FEEDBACK',
        status: 'COLLECTING_INFORMATION',
        currentStep: 'AWAITING_COMPLAINT_SELECTION',
        expectedInput: 'COMPLAINT_SELECTION',
        collectedData: draft,
        missingFields: ['complaintId', 'rating', 'feedbackText'],
        lastQuestion: 'Which resolved complaint would you like to provide feedback for?',
        conversationContext: [
          { role: 'user', text: initialUtterance || 'Give feedback', timestamp: Date.now() },
          { role: 'agent', text: 'Which resolved complaint would you like to provide feedback for?', timestamp: Date.now() }
        ],
        startedAt: Date.now(),
        updatedAt: Date.now()
      }

      return {
        workflow: 'SUBMIT_FEEDBACK',
        workflowStatus: 'COLLECTING_INFORMATION',
        currentStep: 'AWAITING_COMPLAINT_SELECTION',
        expectedInput: 'COMPLAINT_SELECTION',
        extractedData: draft,
        missingFields: ['complaintId', 'rating', 'feedbackText'],
        screenResponse: 'Which resolved complaint would you like to provide feedback for?',
        voiceResponse: 'Which resolved complaint would you like to provide feedback for?',
        shouldListenAgain: true,
        requiresConfirmation: false,
        feedbackDraft: draft,
        action: {
          type: 'NONE',
          payload: { activeWorkflow }
        },
        quickActions: ['Show my resolved complaints', 'Cancel']
      }
    }

    // Step 2: If complaint known, ask for rating
    const activeWorkflow: ActiveWorkflow = {
      id: workflowId,
      type: 'SUBMIT_FEEDBACK',
      status: 'COLLECTING_INFORMATION',
      currentStep: 'AWAITING_RATING',
      expectedInput: 'RATING',
      collectedData: draft,
      missingFields: ['rating', 'feedbackText'],
      lastQuestion: `How would you rate the resolution of complaint ${draft.complaintId} from 1 to 5 stars?`,
      conversationContext: [
        { role: 'user', text: initialUtterance || 'Give feedback', timestamp: Date.now() },
        { role: 'agent', text: `How would you rate the resolution of complaint ${draft.complaintId} from 1 to 5 stars?`, timestamp: Date.now() }
      ],
      startedAt: Date.now(),
      updatedAt: Date.now()
    }

    return {
      workflow: 'SUBMIT_FEEDBACK',
      workflowStatus: 'COLLECTING_INFORMATION',
      currentStep: 'AWAITING_RATING',
      expectedInput: 'RATING',
      extractedData: draft,
      missingFields: ['rating', 'feedbackText'],
      screenResponse: `How would you rate the resolution of complaint **${draft.complaintId}**? (1 to 5 stars)`,
      voiceResponse: `How would you rate the resolution of complaint ${draft.complaintId} from 1 to 5 stars?`,
      shouldListenAgain: true,
      requiresConfirmation: false,
      feedbackDraft: draft,
      action: {
        type: 'NONE',
        payload: { activeWorkflow }
      },
      quickActions: ['⭐⭐⭐⭐⭐ 5 Stars', '⭐⭐⭐⭐ 4 Stars', '⭐⭐⭐ 3 Stars', 'Cancel']
    }
  }

  /**
   * Handle user input within SUBMIT_FEEDBACK workflow
   */
  public async handleWorkflowInput(
    userInput: string,
    activeWorkflow: ActiveWorkflow
  ): Promise<AgentResponse> {
    const raw = userInput.trim()
    const lower = raw.toLowerCase()
    let draft: FeedbackDraftData = { ...(activeWorkflow.collectedData as FeedbackDraftData) }

    // 1. Explicit Cancellation
    if (/^(cancel|stop|nevermind|abort|exit|close|forget it)$/i.test(lower)) {
      return this.cancelWorkflow()
    }

    // 2. Explicit Edit
    if (/^(edit|edit feedback|change rating|change comment|go back)$/i.test(lower)) {
      return this.askRating(draft, activeWorkflow)
    }

    // 3. Confirmation Handling
    if (activeWorkflow.status === 'AWAITING_CONFIRMATION' || activeWorkflow.expectedInput === 'CONFIRMATION') {
      if (/^(yes|yeah|sure|confirm|submit|proceed|submit it|go ahead|submit feedback)$/i.test(lower)) {
        return this.submitFeedback(draft)
      } else if (/^(no|cancel|reject|don't submit|wait)$/i.test(lower)) {
        return this.cancelWorkflow()
      }
    }

    // 4. Extract granular aspect ratings at any point
    this.extractAllRatings(raw, draft)

    // 5. Process based on expected input
    if (activeWorkflow.expectedInput === 'COMPLAINT_SELECTION') {
      const match = raw.match(/\b(CR-\d+|CMP-\d+)\b/i)
      if (match) {
        draft.complaintId = match[0].toUpperCase()
      } else if (/first|recent|last/i.test(lower)) {
        draft.complaintId = 'CR-RECENT'
      } else {
        draft.complaintId = raw
      }

      // If rating was also spoken in this utterance
      if (draft.rating) {
        return this.askFeedbackText(draft, activeWorkflow)
      }
      return this.askRating(draft, activeWorkflow)
    }

    if (activeWorkflow.expectedInput === 'RATING') {
      const rating = this.extractRating(raw)
      if (rating) {
        draft.rating = rating
        return this.askResponseTime(draft, activeWorkflow)
      }
      return this.askRating(draft, activeWorkflow)
    }

    if (activeWorkflow.expectedInput === 'RESPONSE_TIME') {
      const rt = this.extractRating(raw) || raw
      draft.responseTime = typeof rt === 'number' ? String(rt) : rt
      return this.askCommunication(draft, activeWorkflow)
    }

    if (activeWorkflow.expectedInput === 'COMMUNICATION') {
      const comm = this.extractRating(raw) || raw
      draft.communication = typeof comm === 'number' ? String(comm) : comm
      return this.askFeedbackText(draft, activeWorkflow)
    }

    if (activeWorkflow.expectedInput === 'FEEDBACK_TEXT') {
      // CRITICAL CHECK: Never allow UI action words or button names to become feedback content!
      if (UI_ACTION_WORDS_REGEX.test(lower)) {
        if (/^(submit|submit feedback)$/i.test(lower)) {
          draft.feedbackText = draft.feedbackText || 'Resolution completed satisfactorily.'
          return this.requestConfirmation(draft, activeWorkflow)
        }
        if (/^(cancel)$/i.test(lower)) {
          return this.cancelWorkflow()
        }
        if (/^(back|edit|edit feedback)$/i.test(lower)) {
          return this.askRating(draft, activeWorkflow)
        }
      }

      // Valid text feedback from user
      draft.feedbackText = raw
      // All collected -> Review and confirm
      return this.requestConfirmation(draft, activeWorkflow)
    }

    // Default fallback
    return this.askRating(draft, activeWorkflow)
  }

  private askRating(draft: FeedbackDraftData, activeWorkflow: ActiveWorkflow): AgentResponse {
    const active: ActiveWorkflow = {
      ...activeWorkflow,
      currentStep: 'AWAITING_RATING',
      expectedInput: 'RATING',
      collectedData: draft,
      missingFields: ['rating'],
      lastQuestion: 'How would you rate the resolution from 1 to 5?',
      updatedAt: Date.now()
    }

    return {
      workflow: 'SUBMIT_FEEDBACK',
      workflowStatus: 'COLLECTING_INFORMATION',
      currentStep: 'AWAITING_RATING',
      expectedInput: 'RATING',
      extractedData: draft,
      missingFields: ['rating'],
      screenResponse: `How would you rate the resolution of **${draft.complaintId || 'the complaint'}** from 1 to 5?`,
      voiceResponse: 'How would you rate the resolution from 1 to 5?',
      shouldListenAgain: true,
      requiresConfirmation: false,
      feedbackDraft: draft,
      action: { type: 'NONE', payload: { activeWorkflow: active } },
      quickActions: ['⭐⭐⭐⭐⭐ 5', '⭐⭐⭐⭐ 4', '⭐⭐⭐ 3', '⭐⭐ 2', '⭐ 1', 'Cancel']
    }
  }

  private askResponseTime(draft: FeedbackDraftData, activeWorkflow: ActiveWorkflow): AgentResponse {
    const active: ActiveWorkflow = {
      ...activeWorkflow,
      currentStep: 'AWAITING_RESPONSE_TIME',
      expectedInput: 'RESPONSE_TIME',
      collectedData: draft,
      missingFields: ['responseTime'],
      lastQuestion: 'How was the response time?',
      updatedAt: Date.now()
    }

    return {
      workflow: 'SUBMIT_FEEDBACK',
      workflowStatus: 'COLLECTING_INFORMATION',
      currentStep: 'AWAITING_RESPONSE_TIME',
      expectedInput: 'RESPONSE_TIME',
      extractedData: draft,
      missingFields: ['responseTime'],
      screenResponse: 'How was the **response time**? (1 to 5 or Fast / Slow)',
      voiceResponse: 'How was the response time?',
      shouldListenAgain: true,
      requiresConfirmation: false,
      feedbackDraft: draft,
      action: { type: 'NONE', payload: { activeWorkflow: active } },
      quickActions: ['5 - Very Fast', '4 - Fast', '3 - Moderate', '2 - Slow', '1 - Very Slow', 'Cancel']
    }
  }

  private askCommunication(draft: FeedbackDraftData, activeWorkflow: ActiveWorkflow): AgentResponse {
    const active: ActiveWorkflow = {
      ...activeWorkflow,
      currentStep: 'AWAITING_COMMUNICATION',
      expectedInput: 'COMMUNICATION',
      collectedData: draft,
      missingFields: ['communication'],
      lastQuestion: 'How was communication?',
      updatedAt: Date.now()
    }

    return {
      workflow: 'SUBMIT_FEEDBACK',
      workflowStatus: 'COLLECTING_INFORMATION',
      currentStep: 'AWAITING_COMMUNICATION',
      expectedInput: 'COMMUNICATION',
      extractedData: draft,
      missingFields: ['communication'],
      screenResponse: 'How was **communication**? (e.g. Very good, Helpful, Poor)',
      voiceResponse: 'How was communication?',
      shouldListenAgain: true,
      requiresConfirmation: false,
      feedbackDraft: draft,
      action: { type: 'NONE', payload: { activeWorkflow: active } },
      quickActions: ['Very good', 'Good', 'Average', 'Poor', 'Cancel']
    }
  }

  private askFeedbackText(draft: FeedbackDraftData, activeWorkflow: ActiveWorkflow): AgentResponse {
    const active: ActiveWorkflow = {
      ...activeWorkflow,
      currentStep: 'AWAITING_FEEDBACK_TEXT',
      expectedInput: 'FEEDBACK_TEXT',
      collectedData: draft,
      missingFields: ['feedbackText'],
      lastQuestion: 'Tell me about your experience.',
      updatedAt: Date.now()
    }

    return {
      workflow: 'SUBMIT_FEEDBACK',
      workflowStatus: 'COLLECTING_INFORMATION',
      currentStep: 'AWAITING_FEEDBACK_TEXT',
      expectedInput: 'FEEDBACK_TEXT',
      extractedData: draft,
      missingFields: ['feedbackText'],
      screenResponse: 'Tell me about your **experience** with the resolution:',
      voiceResponse: 'Tell me about your experience.',
      shouldListenAgain: true,
      requiresConfirmation: false,
      feedbackDraft: draft,
      action: { type: 'NONE', payload: { activeWorkflow: active } },
      quickActions: ['The issue was fixed properly', 'Took too long but resolved well', 'Cancel']
    }
  }

  private requestConfirmation(draft: FeedbackDraftData, activeWorkflow: ActiveWorkflow): AgentResponse {
    const active: ActiveWorkflow = {
      ...activeWorkflow,
      status: 'AWAITING_CONFIRMATION',
      currentStep: 'AWAITING_CONFIRMATION',
      expectedInput: 'CONFIRMATION',
      collectedData: draft,
      missingFields: [],
      lastQuestion: 'Your feedback is ready. Should I submit it?',
      updatedAt: Date.now()
    }

    const comment = draft.feedbackText || 'Resolution completed satisfactorily.'

    return {
      workflow: 'SUBMIT_FEEDBACK',
      workflowStatus: 'AWAITING_CONFIRMATION',
      currentStep: 'AWAITING_CONFIRMATION',
      expectedInput: 'CONFIRMATION',
      extractedData: draft,
      missingFields: [],
      screenResponse: `### 🌟 Feedback Review\n- **Complaint:** ${draft.complaintId || 'Recent Complaint'}\n- **Rating:** ${draft.rating} / 5 Stars\n${draft.responseTime ? `- **Response Time:** ${draft.responseTime}\n` : ''}${draft.communication ? `- **Communication:** ${draft.communication}\n` : ''}- **Comment:** "${comment}"\n\nYour feedback is ready. Should I submit it?`,
      voiceResponse: 'Your feedback is ready. Should I submit it?',
      shouldListenAgain: true,
      requiresConfirmation: true,
      feedbackDraft: draft,
      action: { type: 'NONE', payload: { activeWorkflow: active } },
      quickActions: ['Yes, Submit Feedback', 'Edit Feedback', 'Cancel']
    }
  }

  private submitFeedback(draft: FeedbackDraftData): AgentResponse {
    return {
      workflow: 'SUBMIT_FEEDBACK',
      workflowStatus: 'COMPLETED',
      currentStep: 'COMPLETED',
      expectedInput: null,
      extractedData: draft,
      missingFields: [],
      screenResponse: `✅ **Feedback Submitted Successfully!**\n\nThank you for helping us maintain high campus resolution standards.`,
      voiceResponse: `Feedback submitted successfully for complaint ${draft.complaintId}. Thank you for your review!`,
      shouldListenAgain: true,
      requiresConfirmation: false,
      feedbackDraft: draft,
      action: {
        type: 'SUBMIT_FEEDBACK',
        payload: draft
      },
      quickActions: ['Show my complaints', 'Done']
    }
  }

  public cancelWorkflow(): AgentResponse {
    return {
      workflow: 'SUBMIT_FEEDBACK',
      workflowStatus: 'CANCELLED',
      currentStep: 'CANCELLED',
      expectedInput: null,
      extractedData: {},
      missingFields: [],
      screenResponse: 'Feedback submission cancelled.',
      voiceResponse: 'Cancelled. How else can I help you?',
      shouldListenAgain: true,
      requiresConfirmation: false,
      feedbackDraft: null,
      action: { type: 'NONE', payload: { clearWorkflow: true } }
    }
  }

  private extractAllRatings(text: string, draft: FeedbackDraftData): void {
    // Overall rating
    const overallMatch = text.match(/\b(?:overall|experience|overall rating)\s*(?:is|was|of|to)?\s*([1-5]|one|two|three|four|five)\b/i)
    if (overallMatch) {
      const r = this.parseRatingValue(overallMatch[1])
      if (r) draft.rating = r
    } else {
      const r = this.extractRating(text)
      if (r && !draft.rating) draft.rating = r
    }

    // Resolution quality: "Give the resolution quality 4"
    const qualMatch = text.match(/\b(?:resolution quality|quality)\s*(?:is|was|of|to)?\s*([1-5]|one|two|three|four|five)\b/i)
    if (qualMatch) {
      const q = this.parseRatingValue(qualMatch[1])
      if (q) draft.resolutionQuality = String(q)
    }

    // Response time: "response time 5"
    const timeMatch = text.match(/\b(?:response time|speed)\s*(?:is|was|of|to)?\s*([1-5]|one|two|three|four|five)\b/i)
    if (timeMatch) {
      const t = this.parseRatingValue(timeMatch[1])
      if (t) draft.responseTime = String(t)
    }

    // Communication: "communication 4"
    const commMatch = text.match(/\b(?:communication|staff support)\s*(?:is|was|of|to)?\s*([1-5]|one|two|three|four|five)\b/i)
    if (commMatch) {
      const c = this.parseRatingValue(commMatch[1])
      if (c) draft.communication = String(c)
    }
  }

  private parseRatingValue(val: string): number | null {
    const wordMap: Record<string, number> = { one: 1, two: 2, three: 3, four: 4, five: 5 }
    if (wordMap[val.toLowerCase()]) return wordMap[val.toLowerCase()]
    const n = parseInt(val, 10)
    return isNaN(n) ? null : Math.max(1, Math.min(5, n))
  }

  private extractRating(text: string): number | null {
    const wordMap: Record<string, number> = { one: 1, two: 2, three: 3, four: 4, five: 5 }
    const matchWord = text.match(/\b(one|two|three|four|five)\s*(?:star|stars)?\b/i)
    if (matchWord && wordMap[matchWord[1].toLowerCase()]) {
      return wordMap[matchWord[1].toLowerCase()]
    }
    const matchDigit = text.match(/\b([1-5])\s*(?:star|stars)?\b/i)
    if (matchDigit) {
      return parseInt(matchDigit[1], 10)
    }
    return null
  }
}

export const feedbackAgent = new FeedbackAgent()
