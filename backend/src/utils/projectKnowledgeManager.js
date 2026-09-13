/**
 * CampusResolve — Project Knowledge Manager
 * Centralized retrieval layer for project/code knowledge (Part 4).
 * Wraps RAG engine with targeted project area detection and context building.
 * Ensures we never send entire project to Gemini — only relevant slices.
 */

const { searchCampusKnowledge, buildRAGContext, CAMPUS_KNOWLEDGE_BASE } = require('./ragEngine')

// Project area keywords for targeted retrieval
const PROJECT_AREAS = {
  frontend: ['frontend', 'react', 'vite', 'component', 'page', 'ui', 'zustand', 'hook'],
  backend: ['backend', 'node', 'express', 'route', 'api', 'server', 'middleware'],
  database: ['mongodb', 'mongoose', 'model', 'schema', 'collection', 'store'],
  auth: ['auth', 'jwt', 'google', 'oauth', 'login', 'supabase', 'protect'],
  ai: ['ai', 'gemini', 'rag', 'llm', 'voice', 'nvidia', 'prompt'],
  complaint: ['complaint', 'grievance', 'ticket', 'cr-', 'duplicate'],
  feedback: ['feedback', 'rating', 'star'],
  deployment: ['vercel', 'env', 'config']
}

const detectProjectArea = (query) => {
  const q = (query || '').toLowerCase()
  for (const [area, keywords] of Object.entries(PROJECT_AREAS)) {
    if (keywords.some(k => q.includes(k))) return area
  }
  return 'general'
}

const getRelevantKnowledge = (query, history = [], topK = 3) => {
  const area = detectProjectArea(query)
  const result = searchCampusKnowledge(query, topK, history)
  // Add area metadata
  return {
    ...result,
    projectArea: area,
    // Filter to ensure we only send relevant context (max 3 docs, ~1500 tokens)
    context: buildRAGContext(result.results),
    // For observability
    retrievalMeta: {
      area,
      topK,
      scores: result.results.map(r => ({ id: r.id, score: r.finalScore, title: r.title }))
    }
  }
}

const getKnowledgeBaseStats = () => ({
  totalDocs: CAMPUS_KNOWLEDGE_BASE.length,
  categories: [...new Set(CAMPUS_KNOWLEDGE_BASE.map(d => d.category))],
  docs: CAMPUS_KNOWLEDGE_BASE.map(d => ({ id: d.id, title: d.title, category: d.category }))
})

module.exports = {
  getRelevantKnowledge,
  detectProjectArea,
  getKnowledgeBaseStats,
  // Re-export for compatibility
  searchCampusKnowledge,
  buildRAGContext,
  CAMPUS_KNOWLEDGE_BASE
}
