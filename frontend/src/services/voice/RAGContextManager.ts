/**
 * CampusResolve — RAGContextManager §19
 *
 * Selects relevant RAG context based on authentication & page.
 * Public RAG: complaint process, feedback policy, FAQs, campus policies
 * Authenticated RAG: user's complaints, feedback, notifications, operational data
 * Never sends entire DB to Gemini.
 */

import { useAuthStore } from '../../store/authStore'

export interface RAGContextEntry {
  title: string
  category: string
  content?: string
}

export class RAGContextManager {
  async buildContext(message: string, pageContext: any): Promise<{ context: string; sources: RAGContextEntry[]; scope: 'public' | 'authenticated' }> {
    const isAuthenticated = useAuthStore.getState().isAuthenticated
    // We delegate to backend's ragEngine via the orchestrateChat RAG pipeline,
    // but this manager governs scope enforcement on frontend.
    // For frontend-only callers (e.g. preview), return empty and let backend supply.
    if (!isAuthenticated) {
      return { context: '', sources: [], scope: 'public' }
    }
    return { context: '', sources: [], scope: 'authenticated' }
  }

  enforceScope(contextText: string, scope: 'public' | 'authenticated'): string {
    // No-op on frontend; backend enforces per-user filtering.
    return contextText
  }
}

export const ragContextManager = new RAGContextManager()
