/**
 * @deprecated — CampusResolve ChatAssistant legacy shim
 *
 * This file previously contained a SEPARATE chatbot implementation with:
 * - duplicate voiceConversationController registration
 * - duplicate speechRecognition listeners
 * - duplicate TTS handlers
 * - duplicate AI request pipeline (agentOrchestrator + sendChatMessage)
 * - separate local conversation state not shared with GlobalAIAgentProvider
 *
 * Per FULL REWRITE §1 and §5, Text and Voice MUST be ONE unified agent.
 * The SINGLE source of truth is now:
 *   GlobalAIAgentProvider (processUserMessage) + UnifiedAssistant (single launcher UI)
 *
 * This shim re-exports UnifiedAssistant so any stale imports do not create a second launcher.
 * All new code should import from './UnifiedAssistant' directly.
 */

export { UnifiedAssistant as ChatAssistant, default } from './UnifiedAssistant'
