/**
 * CampusResolve — WorkflowManager §7
 *
 * Centralized active workflow engine.
 * Supported workflows:
 * CREATE_COMPLAINT, FEEDBACK/SUBMIT_FEEDBACK, SEARCH_COMPLAINT,
 * VIEW_COMPLAINT, CHECK_STATUS, NAVIGATION, NOTIFICATION, PROFILE, AI_INTELLIGENCE
 *
 * Guarantees:
 * - Only ONE active workflow at a time
 * - expectedInput drives slot-filling (e.g. LOCATION → "Lab 3" becomes location)
 * - Paused workflow survives navigation and can be resumed
 */

import { ActiveWorkflow, WorkflowType, WorkflowStatus, ExpectedInputType } from './workflowTypes'

export class WorkflowManager {
  private active: ActiveWorkflow | null = null
  private paused: ActiveWorkflow | null = null

  getActive(): ActiveWorkflow | null {
    return this.active ? { ...this.active } : null
  }

  getPaused(): ActiveWorkflow | null {
    return this.paused ? { ...this.paused } : null
  }

  setActive(wf: ActiveWorkflow | null): void {
    this.active = wf ? { ...wf } : null
    if (wf) {
      this.active!.updatedAt = Date.now()
    }
  }

  hasActive(): boolean {
    return !!this.active && this.active.status !== 'COMPLETED' && this.active.status !== 'CANCELLED'
  }

  isAwaiting(expected: ExpectedInputType): boolean {
    return this.active?.expectedInput === expected
  }

  updateCollectedData(partial: Record<string, any>): void {
    if (!this.active) return
    this.active.collectedData = { ...this.active.collectedData, ...partial }
    this.active.updatedAt = Date.now()
  }

  setStatus(status: WorkflowStatus): void {
    if (!this.active) return
    this.active.status = status
    this.active.updatedAt = Date.now()
  }

  // Pause current active (e.g. "go to dashboard" mid-complaint)
  pause(): ActiveWorkflow | null {
    if (!this.active) return null
    this.paused = { ...this.active, status: 'PAUSED', updatedAt: Date.now() }
    this.active = null
    return { ...this.paused }
  }

  // Resume paused workflow (§34 Navigation test)
  resume(): ActiveWorkflow | null {
    if (!this.paused) return null
    this.active = { ...this.paused, status: 'COLLECTING_INFORMATION', updatedAt: Date.now() }
    this.paused = null
    return { ...this.active }
  }

  clear(): void {
    this.active = null
  }

  clearPaused(): void {
    this.paused = null
  }

  clearAll(): void {
    this.active = null
    this.paused = null
  }

  // Create helper for CREATE_COMPLAINT
  createComplaintWorkflow(params: {
    id?: string
    expectedInput: ExpectedInputType
    currentStep: string
    collectedData: Record<string, any>
    missingFields: string[]
    lastQuestion: string
  }): ActiveWorkflow {
    const wf: ActiveWorkflow = {
      id: params.id || `wf-${Date.now()}`,
      type: 'CREATE_COMPLAINT',
      status: 'COLLECTING_INFORMATION',
      currentStep: params.currentStep,
      expectedInput: params.expectedInput,
      collectedData: params.collectedData,
      missingFields: params.missingFields,
      lastQuestion: params.lastQuestion,
      conversationContext: [],
      startedAt: Date.now(),
      updatedAt: Date.now()
    }
    this.setActive(wf)
    return { ...wf }
  }

  // §12 Logout security — purge private workflows
  purgePrivateWorkflows(): void {
    if (this.active && ['CREATE_COMPLAINT', 'SUBMIT_FEEDBACK', 'FEEDBACK', 'VIEW_COMPLAINT', 'CHECK_STATUS', 'SEARCH_COMPLAINT'].includes(this.active.type)) {
      this.active = null
    }
    this.paused = null
  }
}

export const workflowManager = new WorkflowManager()
