/**
 * CampusResolve Voice-First Multi-Turn AI Agent — Status Agent
 * 
 * Manages complaint status inquiries, retrieves details, and handles
 * follow-up contextual questions like "when was it created", "who is assigned".
 */

import { AgentResponse } from '../workflowTypes'

export class StatusAgent {
  public handleStatusInquiry(complaintId?: string | null, utterance?: string): AgentResponse {
    const raw = (utterance || '').trim()
    const idMatch = raw.match(/\b(CR-\d+|CMP-\d+)\b/i)
    const targetId = idMatch ? idMatch[0].toUpperCase() : (complaintId ? complaintId.toUpperCase() : null)

    if (targetId) {
      return {
        workflow: 'CHECK_STATUS',
        workflowStatus: 'COMPLETED',
        currentStep: 'SHOWING_STATUS',
        expectedInput: 'GENERAL',
        extractedData: { complaintId: targetId },
        missingFields: [],
        screenResponse: `### 📋 Complaint Details — ${targetId}\n- **ID:** ${targetId}\n- **Status:** Submitted\n- **Timeline:** Logged via AI Assistant\n- **SLA Resolution:** Standard (24–48 hours)\n\nYou can say **"Read the timeline"** or **"Give feedback"**.`,
        voiceResponse: `Here are the details for complaint ${targetId}. Status is Submitted. You can say read the timeline or give feedback.`,
        shouldListenAgain: true,
        requiresConfirmation: false,
        action: {
          type: 'VIEW_COMPLAINT',
          payload: { complaintId: targetId }
        },
        quickActions: [`Read the timeline`, 'Give feedback', 'Show my pending complaints']
      }
    }

    return {
      workflow: 'CHECK_STATUS',
      workflowStatus: 'COLLECTING_INFORMATION',
      currentStep: 'AWAITING_COMPLAINT_ID',
      expectedInput: 'COMPLAINT_SELECTION',
      extractedData: {},
      missingFields: ['complaintId'],
      screenResponse: 'Which complaint status would you like to check? You can provide a complaint ID like CR-001.',
      voiceResponse: 'Which complaint would you like to check? Please provide the complaint ID.',
      shouldListenAgain: true,
      requiresConfirmation: false,
      quickActions: ['Show my pending complaints', 'Show complaint history', 'Cancel']
    }
  }

  public handleTimelineInquiry(complaintId: string | null): AgentResponse {
    const targetId = complaintId || 'your recent complaint'
    return {
      workflow: 'VIEW_COMPLAINT',
      workflowStatus: 'COMPLETED',
      currentStep: 'SHOWING_TIMELINE',
      expectedInput: 'GENERAL',
      extractedData: { complaintId: targetId },
      missingFields: [],
      screenResponse: `### ⏱️ Resolution Timeline for ${targetId}\n1. **Submitted**: Just now by CampusResolve AI Assistant — *Complaint submitted via AI Assistant conversation*\n2. **Assigned**: Pending facility assignment (estimated within 4 hours)\n3. **In Progress**: Scheduled for maintenance inspection\n4. **Resolved**: Awaiting technician completion`,
      voiceResponse: `Here is the timeline for complaint ${targetId}. Stage 1: Submitted just now via AI Assistant conversation with status Submitted. Stage 2: Pending facility assignment. Stage 3: Maintenance inspection. Stage 4: Resolution.`,
      shouldListenAgain: true,
      requiresConfirmation: false,
      action: {
        type: 'VIEW_COMPLAINT',
        payload: { complaintId: targetId }
      },
      quickActions: ['Give feedback', 'Show my pending complaints', 'Done']
    }
  }

  public handleFollowUp(question: string, currentComplaintId: string | null): AgentResponse {
    if (!currentComplaintId) {
      return {
        workflow: 'CHECK_STATUS',
        workflowStatus: 'COLLECTING_INFORMATION',
        currentStep: 'AWAITING_COMPLAINT_ID',
        expectedInput: 'COMPLAINT_SELECTION',
        extractedData: {},
        missingFields: ['complaintId'],
        screenResponse: 'Which complaint are you referring to?',
        voiceResponse: 'Which complaint are you referring to?',
        shouldListenAgain: true,
        requiresConfirmation: false
      }
    }

    return {
      workflow: 'CHECK_STATUS',
      workflowStatus: 'COMPLETED',
      currentStep: 'SHOWING_STATUS',
      expectedInput: 'GENERAL',
      extractedData: { complaintId: currentComplaintId },
      missingFields: [],
      screenResponse: `Fetching details for **${currentComplaintId}**...`,
      voiceResponse: `Fetching details for ${currentComplaintId}.`,
      shouldListenAgain: true,
      requiresConfirmation: false,
      action: {
        type: 'VIEW_COMPLAINT',
        payload: { complaintId: currentComplaintId }
      }
    }
  }
}

export const statusAgent = new StatusAgent()

