# Changelog

All notable changes to this project are documented here.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added
- `backend/src/routes/index.js` — single route-mount table shared by the Express server and the Vercel serverless entry.
- `backend/src/utils/jwtSecret.js` — central JWT secret resolution that fails fast in production instead of falling back to a public default.
- `backend/src/config/env.js` — `requireEnv`, `requireMongoUri`, `isProduction` and `confirmDestructive` helpers for scripts.
- `backend/src/middleware/rateLimiters.js` — `authLimiter`, `aiLimiter`, `uploadLimiter`, `writeLimiter`.
- `backend/scripts/security-smoke-test.mjs` — 22-check authorization regression test that runs against a live API.
- Documentation set: `docs/ARCHITECTURE.md`, `docs/API.md`, `docs/DEPLOYMENT.md`, `docs/TROUBLESHOOTING.md`, `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `SECURITY.md`.
- GitHub setup: CI workflow (lint + build + security smoke test), issue forms and a pull-request template.

### Security
- **Enforced authentication and authorization across the API.** Admin complaint dumps, analytics, activity logs, complaint assignment/deletion, teacher management and feedback exports now require the `admin` role; teacher endpoints require `teacher`/`admin`; complaint details, student lists, feedback submission, notifications and uploads require a session. Previously these were callable anonymously — an unauthenticated request could mark a complaint as resolved and dump every complaint's student contact details.
- Removed a hardcoded NVIDIA API key fallback from `backend/src/services/ragService.js`.
- Removed hardcoded MongoDB Atlas credentials from 8 maintenance scripts; all of them now read `MONGO_URI` from the environment.
- Replaced the `'dev-secret'` JWT fallback with `getJwtSecret()`, which refuses weak defaults in production.
- Wired up rate limiting on credential, OTP, AI and upload endpoints (`express-rate-limit` was a dependency but was never used).
- Demo seeding no longer overwrites existing account passwords on boot, and is disabled in production unless `SEED_DEMO_DATA=true`.
- Removed personal email addresses from the allowed-email seed; the allowlist is now `ALLOWED_EMAILS`-driven.
- MongoDB TLS certificate validation is opt-in (`MONGO_TLS_ALLOW_INVALID_CERTS`) instead of always disabled.
- Destructive maintenance scripts now require `--yes` / `CONFIRM_DESTRUCTIVE=yes`.

### Fixed
- Backend crashed on startup when Supabase environment variables were absent (`createClient('')` threw at require time); Supabase is now optional and the client degrades to `null`.
- `GET /api/analytics/teachers/performance` 404'd on the Vercel deployment because the serverless entry mounted the analytics router at a different prefix than the Express server.
- `GET /api/complaints/admin/analytics` and `GET /api/analytics/teachers/performance` returned 500 in offline/demo mode; both now work against the in-memory store as well as MongoDB.
- All 11 ESLint errors (`no-useless-escape`, `no-empty`, `no-unused-expressions`, `no-misleading-character-class`, `ban-ts-comment`) — `npm run lint` now exits 0.

### Changed
- Vite build now splits vendor chunks; the main bundle dropped from 1.70 MB to 745 kB and libraries are cached separately.
- `README.md` rewritten to describe the architecture the code actually implements, with accurate setup, environment-variable tables, demo accounts and API overview.
- Repository hygiene: stopped tracking ~30 MB of development artifacts (Playwright dumps, a 17 MB `.crx` archive, sample uploads, a screenshot) and expanded `.gitignore`.

### Removed
- `api/_index.js` — byte-identical duplicate of `api/index.js`.
- One-off scripts that leaked live database credentials and duplicated maintenance flows: `check_password.js`, `find_teacher.js`, `reset_password.js`, `test-db.js`, `update_teachers.js`.
- `frontend/introspect.mjs` and `frontend/test-supa.mjs` — scratch scripts containing a hardcoded Supabase project URL and anon key; deleted in favour of the real client in `src/lib/supabaseClient.ts`.

## [0.1.0] — initial public version

- React + TypeScript SPA with landing page, role dashboards (student, teacher, admin), profile and QR digital ID.
- Express API with complaints, feedback, teachers, notifications, uploads and analytics.
- JWT and Google authentication, OTP password reset, faculty directory, activity logs.
- AI assistant with RAG, multi-turn workflows, text and voice interaction.
- Email notifications and SLA escalation worker.
- Optional Supabase integration for notifications and Row Level Security.
- Offline/demo mode backed by an in-memory store when MongoDB is unavailable.
