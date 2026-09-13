/**
 * CampusResolve — ResponseGenerator §20
 *
 * Normalizes structured AgentResponse into screenResponse + voiceResponse.
 * Produces cleaned voiceResponse for TTS.
 */

import { AgentResponse } from './workflowTypes'

export interface StructuredResponse {
  intent: string
  action: string | null
  requiresAuth: boolean
  requiresConfirmation: boolean
  expectedInput: string | null
  screenResponse: string
  voiceResponse: string
  data: Record<string, any>
  navigation: string | null
  confidence: number
}

export class ResponseGenerator {
  fromAgentResponse(ar: AgentResponse, intent: string): StructuredResponse {
    const screen = ar.screenResponse || ''
    const rawVoice = ar.voiceResponse || this.cleanForSpeech(screen)
    // Ensure voice is short (10-35 words) unless detail explicitly requested
    // Detail detection is done in GlobalAIAgentContext, but we provide safe short fallback here
    const voiceResponse = this.ensureShortVoice(rawVoice, screen)
    return {
      intent,
      action: ar.action?.type || null,
      requiresAuth: false,
      requiresConfirmation: !!ar.requiresConfirmation,
      expectedInput: ar.expectedInput,
      screenResponse: screen,
      voiceResponse,
      data: ar.extractedData || {},
      navigation: ar.navigationTarget || null,
      confidence: 0.9
    }
  }

  private ensureShortVoice(voice: string, screen: string): string {
    if (!voice) return ''
    const cleaned = this.cleanForSpeech(voice)
    const words = cleaned.split(/\s+/).filter(Boolean)
    // If voice is already concise and not overly long, keep it
    if (words.length >= 8 && words.length <= 38 && !/[•\-\*]\s+|\|/.test(voice)) return cleaned
    // If voice is too long or contains complex markdown, summarize from screen
    const screenClean = this.cleanForSpeech(screen)
    const sentences = screenClean.split(/[.!?]+/).map(s => s.trim()).filter(Boolean)
    let short = sentences.slice(0, 2).join('. ') + '.'
    const sw = short.split(/\s+/).filter(Boolean)
    if (sw.length > 35) short = sw.slice(0, 32).join(' ') + '.'
    return short || cleaned
  }

  cleanForSpeech(text: string): string {
    if (!text) return ''
    return text
      .replace(/```[\s\S]*?```/g, '')
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .replace(/\*([^*]+)\*/g, '$1')
      .replace(/^#{1,6}\s+/gm, '')
      .replace(/\|/g, ', ')
      .replace(/[✓✗✔✘]/g, '')
      .replace(/\b(CR|CMP)-(\d+)\b/gi, (_, p, n) => `${p.split('').join(' ')} ${n}`)
      .replace(/\s+/g, ' ')
      .trim()
  }
}

export const responseGenerator = new ResponseGenerator()
