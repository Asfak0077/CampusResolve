/**
 * CampusResolve Voice AI Agent — Response Generator & Voice Formatter
 * Normalizes chat responses into concise, spoken text and appends safety disclaimers.
 */

export class ResponseGenerator {
  public static readonly AI_SAFETY_DISCLAIMER =
    'AI-generated insight based on available complaint data. This is a recommendation, not a confirmed fact.'

  private static isDetailRequested(msg: string): boolean {
    return /tell me more|explain in detail|read the full|complete explanation|more details|elaborate|full details/i.test(msg || '')
  }

  /**
   * Convert verbose chat markdown responses into concise, voice-friendly spoken text.
   * Default 10-35 words, 1-3 sentences. Longer only if detail explicitly requested.
   */
  public static toSpokenText(text: string, originalQuery: string = ''): string {
    if (!text) return "I'm here to help."

    const detailRequested = this.isDetailRequested(originalQuery)

    let spoken = text
      .replace(/```[\s\S]*?```/g, '')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .replace(/\*([^*]+)\*/g, '$1')
      .replace(/^#{1,6}\s+/gm, '')
      .replace(/\|/g, ', ')
      .replace(/[✓✗✔✘☐☑]/g, '')
      .replace(/[\u{1F300}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '')
      .replace(/\s+/g, ' ')
      .trim()

    // Always summarize if long, unless detail requested
    const sentences = spoken.split(/[.!?]+/).map(s => s.trim()).filter(Boolean)
    const wordCount = spoken.split(/\s+/).filter(Boolean).length

    if (!detailRequested) {
      if (wordCount > 38 || sentences.length > 3 || spoken.includes('•') || spoken.includes('|')) {
        let short = sentences.slice(0, 2).join('. ') + '.'
        const sw = short.split(/\s+/).filter(Boolean)
        if (sw.length > 35) short = sw.slice(0, 32).join(' ') + '.'
        else if (sw.length < 10 && sentences[2]) {
          const ext = sentences.slice(0, 3).join('. ') + '.'
          if (ext.split(/\s+/).filter(Boolean).length <= 35) short = ext
        }
        return short
      }
    } else {
      // Detail requested: allow up to 4 sentences / 65 words
      if (sentences.length > 4 || wordCount > 65) {
        let longer = sentences.slice(0, 4).join('. ') + '.'
        const lw = longer.split(/\s+/).filter(Boolean)
        if (lw.length > 65) longer = lw.slice(0, 62).join(' ') + '.'
        return longer
      }
    }

    return spoken
  }

  /**
   * Enforces disclaimer for any analytical or predictive AI content.
   */
  public static ensurePredictionDisclaimer(text: string): string {
    if (text.includes('recommendation, not a confirmed fact') || text.includes('not a confirmed fact')) {
      return text
    }
    return `${text}\n\n*${this.AI_SAFETY_DISCLAIMER}*`
  }
}
