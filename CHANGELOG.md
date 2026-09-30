# Changelog

All notable changes to this project are documented here.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added
- `backend/src/middleware/accessControl.js` — record-level authorization helpers (`canAccessComplaint`, `canAccessStudent`, `canAccessTeacher`, `requireOwnership`).
- `backend/src/middleware/corsOptions.js` — origin allowlist that replaces the wildcard CORS policy.
- `backend/src/middleware/apiErrors.js` — shared JSON 404 + error mapping (400/409/413 for client mistakes).
- `backend/src/utils/secureRandom.js` — CSPRNG-backed OTP, token, id and filename helpers.
- `backend/tests/unit.test.cjs` — 22 unit tests covering JWT secret policy, secure randomness, access control, CORS decisions and complaint-id formatting; wired into `npm test` and CI.
- `backend/src/routes/index.js` — single route-mount table shared by the Express server and the Vercel serverless entry.
- `backend/src/utils/jwtSecret.js` — central JWT secret resolution that fails fast in production instead of falling back to a public default.
- `backend/src/config/env.js` — `requireEnv`, `requireMongoUri`, `isProduction` and `confirmDestructive` helpers for scripts.
- `backend/src/middleware/rateLimiters.js` — `authLimiter`, `aiLimiter`, `uploadLimiter`, `writeLimiter`.
- `backend/scripts/security-smoke-test.mjs` — 22-check authorization regression test that runs against a live API.
- Documentation set: `docs/ARCHITECTURE.md`, `docs/API.md`, `docs/DEPLOYMENT.md`, `docs/TROUBLESHOOTING.md`, `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `SECURITY.md`.
- GitHub setup: CI workflow (lint, unit tests, build, boot the API and run the authorization smoke test), issue forms and a pull-request template.
- `docs/TECH_DEBT.md` — deprioritised work with rationale and fix recipes (unreferenced modules, remaining advisories, lint warnings, serverless caveats).

### Security
- **Fixed record-level authorization (IDOR).** Any signed-in student could read another student's complaints and feedback by changing the id in the URL, and any teacher could read another department's queue; complaint detail leaked any complaint to any authenticated caller. Ownership is now enforced per record.
- **Replaced `Math.random()` with a CSPRNG for password-reset OTPs** — predictable OTPs allowed account takeover. Student-id and upload-filename generation moved to `crypto` as well.
- **Locked down CORS.** The API previously answered with `Access-Control-Allow-Origin: *`, letting any website call it from a victim's browser. Only `FRONTEND_URL`, `ALLOWED_ORIGINS`, localhost (dev) and `*.vercel.app` previews are accepted.
- **Upload hardening.** The stored file extension is now derived from the validated MIME type instead of the client-supplied filename, multer errors return 400 instead of 500, and size/count limits are explicit.
- Removed hardcoded personal email addresses from the Google sign-in allowlist (now `ALLOWED_EMAILS`).
- Deleted `backend/src/utils/resetPasswordManual.js`, a dead script that reset a personal account's password, plus the unused `services/ragService.js` and `utils/projectKnowledgeManager.js`.
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
- Dependency hygiene: removed the unused `xlsx` (which had an unfixable prototype-pollution advisory) and `joi` packages, applied safe updates and upgraded `nodemailer` to 10 — `npm audit` findings dropped from **40 to 8**, all of which now need deliberate major upgrades and are documented in `docs/TECH_DEBT.md`.
- `emailService.js` no longer hardcodes a sender address; without `EMAIL_USER`/`EMAIL_PASS` it logs clearly and skips sending instead of silently using a baked-in account.
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
