/**
 * CampusResolve RAG (Retrieval-Augmented Generation) Knowledge Base & Search Engine
 * 
 * Production-quality RAG pipeline:
 *  1. Query rewriting (context-aware expansion of short/ambiguous queries)
 *  2. Hybrid search (semantic similarity + keyword matching + category relevance)
 *  3. Reranking (question-type-aware document prioritization)
 *  4. Structured context formatting for LLM prompts
 *  5. Grounding rules (no hallucination of campus policies)
 */

// ── Campus Knowledge Base ────────────────────────────────────────────────────
const CAMPUS_KNOWLEDGE_BASE = [
  {
    id: 'kb-policy-overview',
    category: 'Policy',
    title: 'Campus Grievance Redressal Policy Overview',
    tags: ['policy', 'grievance', 'rules', 'rights', 'redressal', 'confidentiality', 'overview', 'how', 'works', 'system'],
    content: `CampusResolve is the official digital grievance redressal portal for students, faculty, and administration. The system guarantees:
1. Transparency: Every complaint receives an immutable ID (e.g. CR-001) and live tracking timeline.
2. Confidentiality & Security: Student data is protected by JWT authentication and role-based access.
3. Fair & Non-Retaliatory Redressal: Complaints are evaluated objectively without prejudice against the student.
4. Multichannel Support: Issues across Infrastructure, Academics, Hostel, Transport, and IT are systematically categorized and assigned.`
  },
  {
    id: 'kb-sla-timelines',
    category: 'SLA',
    title: 'Service Level Agreement (SLA) & Resolution Timelines',
    tags: ['sla', 'timeline', 'time', 'how long', 'hours', 'duration', 'delay', 'urgent', 'speed', 'resolve', 'resolution', 'fast', 'wait', 'expected', 'days'],
    content: `CampusResolve enforces strict Service Level Agreements (SLAs) for complaint resolution:
- Standard Target SLA: Initial acknowledgment and assignment within 4 hours; total resolution targeted within 24 hours.
- Emergency / Critical Issues (e.g., electrical sparks, water pipe bursts, physical safety): Targeted resolution within 2–4 hours.
- Routine Infrastructure Maintenance (e.g., painting, furniture repairs, minor fixtures): Targeted within 24–48 hours.
- Academic & Examination Queries: Addressed by designated department faculty within 1–2 working days.`
  },
  {
    id: 'kb-escalation-rules',
    category: 'Escalation',
    title: 'Automated Escalation Rules & Administrative Alerts',
    tags: ['escalation', 'pending', 'delay', 'overdue', 'unresolved', 'hod', 'principal', 'alert', 'warning', 'not resolved', 'ignored', 'stuck', 'what happens', 'follow up'],
    content: `CampusResolve includes an automated background escalation worker:
1. When a complaint remains pending or unreviewed past the 24-hour SLA window, its status automatically escalates to 'Escalated'.
2. Automated alert notifications and emails are dispatched immediately to Department Heads (HODs) and Administrative Officers.
3. Reassignment: Admins and HODs can reassign delayed complaints to available faculty or specialized maintenance contractors.
4. Students receive real-time notifications when their complaint is escalated, ensuring transparency.`
  },
  {
    id: 'kb-categories-infrastructure',
    category: 'Categories',
    title: 'Infrastructure Complaints Scope & Department Routing',
    tags: ['infrastructure', 'maintenance', 'projector', 'fan', 'light', 'ac', 'water', 'washroom', 'desk', 'bench', 'lab', 'class', 'building', 'electrical', 'plumbing'],
    content: `Infrastructure complaints cover all physical campus facilities:
- Classrooms & Lecture Halls: Projectors, smart boards, audio systems, tube lights, ceiling fans, student desks, and podiums.
- Laboratories: Workstation power outlets, air conditioning units, safety equipment, and exhaust systems.
- Sanitation & Water: Restroom cleanliness, plumbing lines, water coolers, purifiers, and tap fixtures.
- Routed to: Campus Facility & Maintenance Directorate and designated department faculty.`
  },
  {
    id: 'kb-categories-academics',
    category: 'Categories',
    title: 'Academic Grievances Scope & Faculty Review',
    tags: ['academic', 'marks', 'grade', 'attendance', 'syllabus', 'exam', 'assignment', 'notes', 'timetable', 'hall ticket', 'result', 'cgpa'],
    content: `Academic grievances cover educational and curriculum matters:
- Internal Assessment & Marks: Score discrepancies, assignment grade updates, and test marks re-verification.
- Attendance Reconciliation: On-duty (OD) leaves, medical leave certificates, and semester attendance tracking.
- Timetable & Classes: Lecture scheduling conflicts, laboratory hours, and course material accessibility.
- Routed to: Designated Department Faculty Coordinators across CSE, ECE, MECH, EEE, AIDS, and IT.`
  },
  {
    id: 'kb-categories-hostel',
    category: 'Categories',
    title: 'Hostel & Residential Life Complaints',
    tags: ['hostel', 'mess', 'food', 'room', 'bed', 'warden', 'drinking water', 'geyser', 'laundry', 'cleanliness', 'boys', 'girls', 'residential'],
    content: `Hostel complaints cover campus residential facilities for boys and girls:
- Mess & Dining: Food hygiene, meal quality, drinking water dispensers, and dining hall cleanliness.
- Room Maintenance: Electrical sockets, ceiling fans, window latches, mattresses, and door locks.
- Utilities: Hot water geysers, laundry washing machines, and common room facilities.
- Routed to: Chief Hostel Warden and Residential Facility Managers.`
  },
  {
    id: 'kb-categories-transport',
    category: 'Categories',
    title: 'Campus Transport & Bus Route Services',
    tags: ['transport', 'bus', 'route', 'driver', 'pickup', 'timing', 'delay', 'bus pass', 'stop', 'vehicle'],
    content: `Transport complaints cover university bus operations:
- Bus Routes & Timing: Morning pickup delays, evening departure schedules, and designated stop alterations.
- Vehicle Condition: Air conditioning in campus buses, seat repairs, and cleanliness.
- Driver & Staff Conduct: Driving safety adherence and student assistance.
- Routed to: Campus Transport Officer.`
  },
  {
    id: 'kb-categories-it',
    category: 'Categories',
    title: 'IT & Digital Infrastructure Support',
    tags: ['it', 'wifi', 'internet', 'network', 'login', 'portal', 'password', 'computer', 'software', 'email', 'digital', 'tech support'],
    content: `IT support covers digital and network systems:
- Campus Wi-Fi: Coverage dead spots, login authentication issues, and bandwidth throttling.
- Student Portal: Password resets, account lockout, profile photo updates, and fee receipt portal links.
- Lab Systems: Operating system updates, compiler installations, and specialized lab software licenses.
- Routed to: Central IT Infrastructure Team.`
  },
  {
    id: 'kb-feedback-system',
    category: 'Feedback',
    title: 'Resolution Feedback & Star Rating Guidelines',
    tags: ['feedback', 'rating', 'star', 'review', 'quality', 'survey', 'satisfaction', 'resolved', 'rate', 'evaluate'],
    content: `CampusResolve collects student feedback on resolved complaints:
1. Star Rating: Students provide a 1 to 5 star rating assessing resolution quality, response speed, and faculty communication.
2. AI Feedback Analysis: Sentiment and topic analysis automatically structure feedback for departmental quality metrics.
3. Low Rating Escalation: Ratings of 1 or 2 stars trigger administrative review alerts to investigate why resolution was unsatisfactory.
4. Feedback can only be submitted for complaints with status "Resolved".`
  },
  {
    id: 'kb-campus-facilities',
    category: 'Facilities',
    title: 'Campus Buildings & Facilities Directory',
    tags: ['campus', 'location', 'building', 'block', 'room', 'seminar hall', 'library', 'lab', 'canteen', 'map', 'where', 'department'],
    content: `CampusResolve covers key campus locations:
- Tech Block A: CSE, AIDS, and IT Departments, Advanced Systems Labs (Rooms 101-305).
- Tech Block B: ECE, EEE, and Robotics Labs, Seminar Hall 1 & 2.
- Mechanical Block: Machine Shop, CAD/CAM Labs, Thermal Engineering Lab.
- Central Library: Ground to 2nd Floor, Digital Reading Room, Book Circulation Desk.
- Administrative Block: Principal Office, Dean Academic, Exam Cell, and Accounts Section.
- Hostels: Boys Hostel Blocks A, B, C, D; Girls Hostel Blocks A, B, C.`
  },
  {
    id: 'kb-evidence-upload',
    category: 'FAQ',
    title: 'File & Evidence Attachment Guidelines',
    tags: ['upload', 'file', 'image', 'photo', 'pdf', 'evidence', 'proof', 'attachment', 'size', 'format'],
    content: `Students can attach file proof when lodging complaints:
- Supported Formats: JPG, JPEG, PNG, WebP, and PDF documents.
- File Size Limit: Up to 5 MB per file.
- Quantity: Up to 5 attachments per complaint.
- Security: Uploaded files are virus-scanned and stored securely on the university server.`
  },
  {
    id: 'kb-how-to-submit',
    category: 'FAQ',
    title: 'How to Submit a Complaint on CampusResolve',
    tags: ['how to', 'submit', 'create', 'complaint', 'steps', 'guide', 'process', 'file', 'lodge', 'register'],
    content: `Steps to submit a complaint on CampusResolve:
1. Sign in using your student Google account or credentials.
2. Open the AI Assistant and say "Help me create a complaint" or click the complaint button.
3. Describe the issue including the affected location (e.g., "Fan not working in Seminar Hall").
4. Review the AI-generated complaint preview with category, priority, and details.
5. Click "Create Complaint" to submit. You'll receive a unique Complaint ID (e.g., CR-004).
6. Track progress via "Show my pending complaints" or the Complaint History page.`
  },
  {
    id: 'kb-complaint-tracking',
    category: 'FAQ',
    title: 'How Complaint Tracking Works',
    tags: ['track', 'tracking', 'status', 'progress', 'timeline', 'lifecycle', 'stages', 'complaint id', 'resolution', 'what happens', 'after', 'submit', 'happens after', 'what happens after i submit a complaint'],
    content: `What happens after you submit a complaint? Complaint tracking in CampusResolve follows these stages:
1. Submitted: Complaint received and logged with a unique ID.
2. Assigned: Routed to the appropriate department faculty member.
3. In Progress: Faculty is actively working on resolving the issue.
4. Escalated: Auto-triggered if no resolution within 24 hours.
5. Resolved: Issue addressed and closed by the assigned faculty.
Students can track status anytime via the AI Assistant ("Check complaint status") or the Complaint History page.`
  },
  {
    id: 'kb-how-campusresolve-works',
    category: 'FAQ',
    title: 'How CampusResolve Works — End-to-End',
    tags: ['how', 'works', 'campusresolve', 'system', 'process', 'workflow', 'overview', 'what is', 'explain', 'architecture', 'project'],
    content: `CampusResolve works in 4 simple steps: Submit — describe the issue with location and category; Assigned — auto-routed to the right department faculty; In Progress — team works on it with real inspection; Resolved — you get notified and can give feedback. Track anytime from your dashboard or ask the AI "Check status".`
  },
  {
    id: 'kb-complaint-creation-storage',
    category: 'FAQ',
    title: 'How and Where Complaints Are Stored',
    tags: ['where', 'stored', 'complaint', 'created', 'database', 'mongodb', 'store', 'saved', 'how does my complaint get created', 'storage'],
    content: `When you submit a complaint, CampusResolve validates your JWT, checks for duplicates, generates an ID like CR-007 via the complaintIdService, then saves to MongoDB (or inMemoryStore in dev) with live duplicate detection and notifies admins via Socket.io. Your JWT and role determine what you can access.`
  },
  {
    id: 'kb-ai-chatbot-arch',
    category: 'FAQ',
    title: 'How the AI Chatbot Works',
    tags: ['ai', 'chatbot', 'how does the ai chatbot work', 'architecture', 'gemini', 'nvidia', 'nim', 'llm', 'assistant', 'brain'],
    content: `The AI is a single unified Global AI Agent (processUserMessage) used by both text and voice. Text and voice share the same RAG, workflows, and auth. Backend uses Gemini 1.5 Flash and NVIDIA NIM (llama-3.2-11b) with RAG retrieval, conversation state, and duplicate detection. Voice adds STT/TTS only when voiceEnabled is true.`
  },
  {
    id: 'kb-rag-explained',
    category: 'FAQ',
    title: 'How RAG Works in CampusResolve',
    tags: ['rag', 'retrieval', 'augmented', 'generation', 'how does rag work', 'knowledge', 'embed', 'search'],
    content: `RAG (Retrieval-Augmented Generation) in CampusResolve: Your question is rewritten with context, then hybrid search (keyword + semantic + category) retrieves top verified campus docs, reranked by question type. Those docs are fed to Gemini with strict grounding — answers come only from retrieved sources, with citations. No hallucination.`
  },
  {
    id: 'kb-voice-agent',
    category: 'FAQ',
    title: 'Voice Agent — Why and How',
    tags: ['voice', 'agent', 'voice agent', 'stt', 'tts', 'speech', 'microphone', 'why is the voice agent doing this', 'audio', 'talk', 'typing', 'speak', 'can i talk', 'can i speak', 'conversation', 'chat'],
    content: `Voice Agent is a mode of the same AI, not a separate bot. It starts only when you press "Start Voice Agent" (voiceEnabled=true). Then: speech → STT → same AI brain → short voiceResponse (10-35 words) → TTS. In text mode (default) there is no audio. Long answers are summarized for voice; say "Tell me more" for detail. You can talk instead of typing via the microphone in the same assistant — both use the unified Global AI Agent.`
  },
  {
    id: 'kb-google-login',
    category: 'FAQ',
    title: 'How Google Login Works',
    tags: ['google', 'login', 'oauth', 'how does google login work', 'authentication', 'jwt', 'sign in'],
    content: `Google login uses OAuth via Google Identity Services. Your Google ID token is verified with Google Auth Library, matched to an allowed email, then a JWT is issued (SECRET_KEY). That JWT protects all personal APIs — guests can ask public questions, but complaints/status/feedback require auth.`
  },
  {
    id: 'kb-apis-architecture',
    category: 'Architecture',
    title: 'Where Is the Complaint API',
    tags: ['where is the complaint api', 'complaint api', 'api', 'apis', 'workflow', 'workflows', 'architecture', 'endpoint', 'backend', 'frontend', 'chatbot message', 'complaint route'],
    content: `Where is the complaint API? Backend: backend/src/routes/complaintRoutesEnhanced.js (/api/complaints) and backend/src/routes/chatbotRoutes.js (POST /api/chatbot/message → /api/chatbot/create-complaint → /api/chatbot/join-complaint). File that handles complaint creation from AI is backend/src/routes/chatbotRoutes.js calling Complaint model and getNextComplaintId(). Frontend service is frontend/src/services/complaintService.ts.`
  },
  {
    id: 'kb-project-features',
    category: 'FAQ',
    title: 'CampusResolve Features Overview',
    tags: ['features', 'application', 'project', 'what can i do', 'notifications', 'profile', 'ui', 'database', 'capabilities'],
    content: `Features: Students submit/track complaints, give 5-star feedback, get notifications, update profile; Teachers manage assigned tickets and add resolution notes; Admins assign, view analytics, detect overload. Notifications are real-time via Socket.io, database is MongoDB with inMemoryStore fallback.`
  },
  {
    id: 'kb-frontend-stack',
    category: 'Architecture',
    title: 'Frontend Architecture — React + Vite',
    tags: ['frontend', 'react', 'vite', 'tailwind', 'zustand', 'react query', 'components', 'pages', 'ui', 'architecture'],
    content: `Frontend: React 18 + Vite 5 + Tailwind 3. State via Zustand (auth, theme), React Query for data, React Router for pages (Landing, Login, StudentDashboard, ComplaintHistory, Profile, AdminDashboard). Key components: UnifiedAssistant (single chat view), ChatMessageContent, VoiceVisualizer. Services: chatbotService, complaintService, voice/*, apiClient with JWT header.`
  },
  {
    id: 'kb-backend-stack',
    category: 'Architecture',
    title: 'Backend Architecture — Node + Express + MongoDB',
    tags: ['backend', 'node', 'nodejs', 'express', 'mongodb', 'mongoose', 'socket.io', 'api', 'server', 'architecture'],
    content: `Backend: Node ≥18 + Express 4 + Mongoose 8. Entry: backend/src/server.js. Routes: /api/chatbot/message (AI orchestrator), /api/complaints, /api/feedback, /api/notifications, /api/auth. Middleware: helmet, express-mongo-sanitize, rate-limit, CORS. Real-time via Socket.io. Fallback to file-based inMemoryStore if MongoDB not connected.`
  },
  {
    id: 'kb-complaint-id-generation',
    category: 'FAQ',
    title: 'How CR-IDs Are Generated',
    tags: ['cr', 'complaint id', 'cr-007', 'how is cr-007 generated', 'id', 'counter', 'generation'],
    content: `CR IDs like CR-007 are generated by complaintIdService.getNextComplaintId() using a MongoDB Counter collection (or in-memory counter in dev). Each new complaint atomically increments the counter and formats as CR-XXX. Stored in Complaint.complaintId and shown in UI via ComplaintIdBadge.`
  },
  {
    id: 'kb-supabase-auth',
    category: 'Architecture',
    title: 'Supabase and Authentication Handling',
    tags: ['supabase', 'authentication', 'auth', 'where is the supabase authentication handled', 'jwt', 'protect', 'middleware'],
    content: `Supabase is used for notifications RLS and as auth alternative. Main JWT auth is via backend/src/middleware/authMiddleware.js (protect, authorize). Frontend uses Supabase client in lib/supabaseClient.ts for anonymous access and Zustand authStore for JWT. Google OAuth handled in authRoutesEnhanced via Google Auth Library; JWT issued with SECRET_KEY.`
  },
  {
    id: 'kb-why-mongodb',
    category: 'Architecture',
    title: 'Why MongoDB Is Used',
    tags: ['why is mongodb used', 'mongodb', 'database', 'why', 'mongoose', 'nosql'],
    content: `MongoDB (Mongoose) stores flexible complaint, feedback, user documents with fast queries for status/history. It supports inMemoryStore fallback for dev/offline. Schemas: Complaint, Student, Teacher, Feedback, Notification, ActivityLog, AllowedEmail, Counter, ComplaintAIAnalysis.`
  },
  {
    id: 'kb-notifications-profile',
    category: 'FAQ',
    title: 'Notifications and Profile System',
    tags: ['notifications', 'profile', 'bell', 'update profile', 'avatar', 'qr'],
    content: `Notifications: real-time via Socket.io (notificationHelper.createNotification) stored in Notification model, polled via /api/notifications. Profile: /api/profile and /api/users/profile via profileRoutes.js, avatar upload via /api/upload, persisted in Student/Teacher docs and Supabase storage.`
  },
  {
    id: 'kb-roles-permissions-security',
    category: 'Architecture',
    title: 'Roles, Permissions, and Security',
    tags: ['roles', 'permissions', 'security', 'guest', 'student', 'teacher', 'admin', 'protect', 'authorize', 'helmet', 'sanitize'],
    content: `Roles: guest (public Q&A only), student (own complaints/feedback), teacher (assigned complaints), admin (all). Enforced by authMiddleware.protect (JWT verify) + authorize(role) and in orchestrator's guest gateway. Security: helmet, mongo-sanitize, rate-limit, CORS, JWT SECRET_KEY, allowedEmails check.`
  },
  {
    id: 'kb-routes-components-services',
    category: 'Architecture',
    title: 'Routes, Components, Services, and Models',
    tags: ['routes', 'components', 'services', 'database models', 'file', 'which file controls the chatbot', 'api routes', 'chatbot', 'controls', 'aiOrchestrator', 'chatbotRoutes', 'GlobalAIAgentContext'],
    content: `Which file controls the chatbot? Backend: backend/src/utils/aiOrchestrator.js (orchestrateChat) + backend/src/routes/chatbotRoutes.js (POST /api/chatbot/message). Frontend: frontend/src/context/GlobalAIAgentContext.tsx (processUserMessage) and frontend/src/components/chat/UnifiedAssistant.tsx (view only). Services: chatbotService.ts, complaintService.ts, ai/*, voice/*. Models: Complaint.js, Feedback.js, Student.js, Teacher.js, Notification.js.`
  },
  {
    id: 'kb-env-config',
    category: 'Architecture',
    title: 'Environment Configuration',
    tags: ['environment', 'configuration', 'env', 'variables', 'config', 'frontend', 'backend'],
    content: `Env: root .env holds PORT, SECRET_KEY, MONGO_URI, GOOGLE_CLIENT_ID/SECRET, EMAIL_*, SUPABASE_URL/KEY, GEMINI_API_KEY, NVIDIA_API_KEY, VITE_API_BASE_URL, VITE_GOOGLE_CLIENT_ID, VITE_SUPABASE_*. Frontend reads VITE_ vars via import.meta.env; backend via dotenv. vercel.json builds frontend/dist and routes /api to api/index.js.`
  },
  {
    id: 'kb-ai-features',
    category: 'Architecture',
    title: 'Existing AI Features in CampusResolve',
    tags: ['ai features', 'what ai features are implemented', 'ai agents', 'duplicate', 'prediction', 'sentiment', 'intelligence'],
    content: `AI features: (1) Duplicate detection via duplicateDetectionEngine (semantic+location matching), (2) Resolution prediction (historical + workload SLA), (3) Feedback sentiment analysis (Positive/Neutral/Negative), (4) RAG policy answers via Gemini, (5) Complaint draft extraction via Gemini, (6) Voice (STT/TTS) as mode of same agent. No hallucinated IDs.`
  },
  {
    id: 'kb-duplicate-detection-deep',
    category: 'FAQ',
    title: 'How Duplicate Complaint Detection Works (Deep)',
    tags: ['duplicate', 'how does duplicate complaint detection work', 'duplicate detection', 'join', 'similar'],
    content: `Duplicate detection: When drafting, findDuplicateComplaints() scans active complaints by category/location/semantic similarity (70%+ considered high). If match, user can Join (joinExistingComplaint increments affectedCount) or Create Anyway. Stored in complaint.duplicateDetection with score and userDecision.`
  },
  {
    id: 'kb-voice-why-stop',
    category: 'FAQ',
    title: 'Why Voice Stops and How It Handles Interruption',
    tags: ['why does voice stop', 'voice stop', 'barge-in', 'interruption', 'stop speaking'],
    content: `Voice stops because voiceEnabled is strict: TTS only when explicitly enabled. It also stops on barge-in (user starts speaking while AI speaks → speechRecognition.onSpeechStart cancels TTS), on disable, on Escape key, on cooldown (600ms), or when navigating. Check isVoiceEnabled guard in GlobalAIAgentContext and textToSpeechService.setVoiceEnabled(false) → stop().`
  }
]

// ── Stopwords (excluded from scoring) ────────────────────────────────────────
const STOPWORDS = new Set([
  'the', 'is', 'at', 'which', 'on', 'a', 'an', 'and', 'or', 'to', 'in',
  'for', 'of', 'with', 'by', 'from', 'it', 'this', 'that', 'are', 'was',
  'be', 'has', 'had', 'do', 'does', 'did', 'but', 'not', 'what', 'all',
  'can', 'her', 'his', 'him', 'how', 'its', 'may', 'my', 'our', 'out',
  'then', 'them', 'they', 'too', 'very', 'just', 'about', 'above', 'also',
  'i', 'me', 'we', 'you', 'he', 'she'
])

/**
 * Tokenize and normalize text, removing stopwords
 */
const tokenize = (text = '') => {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(t => t.length > 2 && !STOPWORDS.has(t))
}

/**
 * Rewrite a short/ambiguous query using conversation context
 */
const rewriteQuery = (query, conversationHistory = [], conversationState = 'IDLE') => {
  const trimmed = (query || '').trim()
  if (!trimmed) return { original: trimmed, rewritten: trimmed, wasRewritten: false }

  // Only rewrite short/ambiguous queries (< 5 words)
  const words = trimmed.split(/\s+/)
  if (words.length >= 5) {
    return { original: trimmed, rewritten: trimmed, wasRewritten: false }
  }

  // Extract context from recent history
  const recentMessages = (conversationHistory || []).slice(-4)
  const contextWords = recentMessages
    .map(m => (m.text || m.message || '').toLowerCase())
    .join(' ')

  // Try to expand based on context keywords
  let rewritten = trimmed

  // "How long?" → expand with topic from context
  if (/^how long\??$/i.test(trimmed)) {
    if (/infrastructure|maintenance|repair|fix/i.test(contextWords)) {
      rewritten = 'How long does an infrastructure complaint take to resolve?'
    } else if (/academic|marks|grade/i.test(contextWords)) {
      rewritten = 'How long does an academic complaint take to resolve?'
    } else if (/hostel|mess|food/i.test(contextWords)) {
      rewritten = 'How long does a hostel complaint take to resolve?'
    } else {
      rewritten = 'How long does a complaint take to resolve?'
    }
  }

  // "What happens?" or "Then what?" → expand with workflow context
  if (/^(what happens|then what|and then)\??$/i.test(trimmed)) {
    if (/escalat|delay|pending|overdue/i.test(contextWords)) {
      rewritten = 'What happens when my complaint is not resolved on time?'
    } else if (/submit|create|complaint|file/i.test(contextWords)) {
      rewritten = 'What happens after I submit a complaint?'
    } else if (/feedback|rating|star/i.test(contextWords)) {
      rewritten = 'What happens after I submit feedback?'
    }
  }

  // "Can I?" or "Is there?" → expand with topic
  if (/^(can i|is there)\b/i.test(trimmed) && words.length <= 4) {
    if (/upload|attach|file|photo/i.test(contextWords)) {
      rewritten = 'Can I upload evidence or attachments with my complaint?'
    } else if (/track|status|check/i.test(contextWords)) {
      rewritten = 'Can I track my complaint status online?'
    }
  }

  return {
    original: trimmed,
    rewritten,
    wasRewritten: rewritten !== trimmed
  }
}

/**
 * Question type detection for reranking
 */
const detectQuestionType = (query) => {
  const q = (query || '').toLowerCase()

  if (/escalat/i.test(q)) return 'ESCALATION'
  if (/delay|not resolved|overdue|stuck|ignored/i.test(q) && !/what happens after.*submit/i.test(q)) return 'ESCALATION'
  if (/what happens after/i.test(q)) return 'TRACKING'
  if (/how long|time|duration|sla|hours|days|fast|speed|wait/i.test(q)) return 'SLA'
  if (/how does.*work|how.*system.*work|what is.*campusresolve|about campusresolve|how.*campusresolve.*work/i.test(q)) return 'PROCESS'
  if (/\bhow to\b|\bsubmit\b|\bcreate\b|\bfile\b|\blodge\b|\bsteps\b|\bprocess\b|\bguide\b/i.test(q)) return 'PROCESS'
  if (/\bcategory\b|\btype\b|\binfrastructure\b|\bacademic\b|\bhostel\b|\btransport\b|\bit\b/i.test(q)) return 'CATEGORY'
  if (/\bfeedback\b|\brating\b|\bstar\b|\breview\b|\brate\b/i.test(q)) return 'FEEDBACK'
  if (/\bupload\b|\bfile\b|\bevidence\b|\battachment\b|\bphoto\b|\bpdf\b/i.test(q)) return 'EVIDENCE'
  if (/\btrack\b|\bstatus\b|\bprogress\b|\btimeline\b|\blifecycle\b/i.test(q)) return 'TRACKING'
  if (/\bpolicy\b|\brules\b|\brights\b|\bconfidential\b|\bredressal\b/i.test(q)) return 'POLICY'
  // Facilities only if explicit physical location, not API/code questions
  if (/\b(where is|location of|building|block [a-d]|room \d+|facility directory|map of)\b/i.test(q) && !/\b(api|chatbot|file|code|route|component)\b/i.test(q)) return 'FACILITY'
  if (/\bwhere\b|\blocation\b|\bbuilding\b|\bblock\b|\broom\b|\bfacility\b/i.test(q) && !/how does|what is|how.*work|campusresolve|api|chatbot|file/i.test(q)) return 'FACILITY'

  return 'GENERAL'
}

/**
 * Category relevance bonus based on question type
 */
const getCategoryBonus = (docCategory, questionType) => {
  const bonusMap = {
    ESCALATION: { Escalation: 8, SLA: 5, Policy: 3, Architecture: 2 },
    SLA: { SLA: 8, Escalation: 4, Policy: 2, Architecture: 2 },
    PROCESS: { FAQ: 8, Policy: 5, Architecture: 7, Categories: 3 },
    CATEGORY: { Categories: 6, FAQ: 3, Architecture: 2 },
    FEEDBACK: { Feedback: 8, FAQ: 3 },
    FACILITY: { Facilities: 8, Categories: 3 },
    EVIDENCE: { FAQ: 8 },
    TRACKING: { FAQ: 6, SLA: 4, Policy: 3, Architecture: 3 },
    POLICY: { Policy: 8, SLA: 3, Escalation: 3, FAQ: 3 },
    GENERAL: { FAQ: 4, Architecture: 4, Policy: 2, Facilities: 1 }
  }
  return (bonusMap[questionType] && bonusMap[questionType][docCategory]) || 0
}

/**
 * Hybrid search: keyword + semantic similarity + category relevance
 */
const searchCampusKnowledge = (query = '', topK = 5, conversationHistory = [], conversationState = 'IDLE') => {
  if (!query || !query.trim()) return { results: [], queryInfo: null }

  // Step 1: Query rewriting
  const queryInfo = rewriteQuery(query, conversationHistory, conversationState)
  const searchQuery = queryInfo.rewritten

  // Step 2: Detect question type for reranking
  const questionType = detectQuestionType(searchQuery)

  // Step 3: Tokenize
  const queryTokens = tokenize(searchQuery)
  if (queryTokens.length === 0) return { results: [], queryInfo }

  // Step 4: Score each document
  const scored = CAMPUS_KNOWLEDGE_BASE.map(doc => {
    const titleTokens = tokenize(doc.title)
    const contentTokens = tokenize(doc.content)
    const tags = (doc.tags || []).map(t => t.toLowerCase())

    // ── Keyword Score ──────────────────────────────────────────────
    let keywordScore = 0
    queryTokens.forEach(token => {
      if (tags.includes(token)) keywordScore += 5
      if (tags.some(tag => tag.includes(token) || token.includes(tag))) keywordScore += 3
      if (titleTokens.includes(token)) keywordScore += 4
      if (contentTokens.includes(token)) keywordScore += 1
    })

    // Phrase match bonus
    const qLower = searchQuery.toLowerCase()
    if (doc.title.toLowerCase().includes(qLower)) keywordScore += 10
    if (doc.content.toLowerCase().includes(qLower)) keywordScore += 6

    // ── Semantic Similarity Score (token overlap) ─────────────────
    const docTokenSet = new Set([...titleTokens, ...contentTokens, ...tags])
    const queryTokenSet = new Set(queryTokens)
    const intersection = [...queryTokenSet].filter(t => docTokenSet.has(t)).length
    const union = new Set([...queryTokenSet, ...docTokenSet]).size
    const semanticScore = union > 0 ? (intersection / union) * 100 : 0

    // ── Category Relevance Score ─────────────────────────────────
    const categoryScore = getCategoryBonus(doc.category, questionType)

    // ── Final Hybrid Score ──────────────────────────────────────
    const finalScore = (0.55 * keywordScore) + (0.25 * semanticScore) + (0.20 * categoryScore * 5)

    return {
      ...doc,
      keywordScore,
      semanticScore: Math.round(semanticScore * 100) / 100,
      categoryScore,
      finalScore: Math.round(finalScore * 100) / 100,
      questionType
    }
  })

  // Step 5: Filter and sort
  const filtered = scored
    .filter(r => r.finalScore > 1.5)
    .sort((a, b) => b.finalScore - a.finalScore)

  // Step 6: Rerank (boost top matches based on question type)
  const reranked = _rerank(filtered, questionType)

  // Step 7: Return top K
  return {
    results: reranked.slice(0, topK),
    queryInfo: {
      ...queryInfo,
      questionType,
      totalCandidates: filtered.length,
      returnedCount: Math.min(topK, reranked.length)
    }
  }
}

/**
 * Rerank results based on question type specificity
 */
const _rerank = (results, questionType) => {
  if (results.length <= 1) return results

  // Apply question-type-specific boosting
  return results.map(doc => {
    let boost = 0

    // Boost documents whose category strongly matches the question type
    if (questionType === 'ESCALATION' && doc.category === 'Escalation') boost += 5
    if (questionType === 'SLA' && doc.category === 'SLA') boost += 5
    if (questionType === 'FEEDBACK' && doc.category === 'Feedback') boost += 5
    if (questionType === 'PROCESS' && doc.category === 'FAQ') boost += 5
    if (questionType === 'POLICY' && doc.category === 'Policy') boost += 5

    // Penalize category documents for non-category questions
    if (doc.category === 'Categories' && questionType !== 'CATEGORY' && questionType !== 'FACILITY') {
      boost -= 2
    }

    return { ...doc, finalScore: doc.finalScore + boost }
  }).sort((a, b) => b.finalScore - a.finalScore)
}

/**
 * Format retrieved documents into structured context string for Gemini prompt
 */
const buildRAGContext = (retrievedDocs = []) => {
  const docs = Array.isArray(retrievedDocs) ? retrievedDocs : (retrievedDocs.results || [])
  if (!docs || docs.length === 0) return ''

  const header = 'VERIFIED CAMPUS KNOWLEDGE:\n'
  const sources = docs
    .map((doc, i) => `Source ${i + 1}:\nTitle: ${doc.title} (${doc.category})\nContent:\n${doc.content}`)
    .join('\n\n')

  const rule = '\n\nRULE: Answer using ONLY the information from the sources above. If the information is not available in the retrieved documents, say: "I couldn\'t find verified CampusResolve information for that question. You can try rephrasing or contact the relevant department."'

  return header + sources + rule
}

/**
 * Legacy-compatible search wrapper (returns array like old API)
 */
const searchCampusKnowledgeLegacy = (query = '', topK = 3) => {
  const { results } = searchCampusKnowledge(query, topK)
  return results
}

module.exports = {
  CAMPUS_KNOWLEDGE_BASE,
  searchCampusKnowledge,
  searchCampusKnowledgeLegacy,
  buildRAGContext,
  rewriteQuery,
  detectQuestionType,
  tokenize
}
