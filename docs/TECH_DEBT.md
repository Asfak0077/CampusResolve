# Technical debt & quality backlog

Known issues that are understood, scoped and deliberately deferred — with the
reason and a suggested approach. Everything here is a candidate for a focused
follow-up PR; nothing on this list is a known active exploit.

_Last reviewed: 2026-09-30._

---

## 1. Unreferenced frontend modules (~36 files, ~3 300 lines)

**Nothing imports these.** They are superseded implementations kept alongside the
live ones, which makes the codebase harder to navigate (two `ChatAssistant`s, two
AI service layers, two design-system component sets).

Detected by resolving every import/require across the repository. Verified
manually for false positives (sibling imports, barrel files, dynamic imports).

| Group | Files |
| ----- | ----- |
| Superseded chat UI (live: `components/chat/UnifiedAssistant.tsx`) | `chat/ChatAssistant.tsx`, `chat/VoiceConversationModal.tsx`, `chat/FeedbackReminderBubble.tsx` |
| Superseded AI service layer (live: `GlobalAIAgentContext` + `services/voice/agents/*`) | `services/ai/*` (5 files), `services/voice/globalActionExecutor.ts`, `services/voice/voiceConversationController.ts`, `services/complaints/*` (2), `services/feedback/*` (2) |
| Unused landing sections (live: `Hero`, `Features`, `Statistics`, `AdditionalSections`) | `landing/About.tsx`, `landing/Footer.tsx`, `landing/Testimonials.tsx`, `landing/GalaxyBackground.tsx`, `landing/PlatformPreview.tsx` |
| Unused UI/design-system variants | `admin/KpiCards.tsx`, `admin/AdminStatsCards.tsx`, `student/StudentStats.tsx`, `shared/{ActivityTimeline,AnimatedButton,BackgroundAnimation,DashboardNav,MouseFollower,ThemeCircularRippleOverlay,ThemeSweepOverlay}.tsx`, `ui/{Input,Modal}.tsx`, `profile/ProfileDropdown.tsx` |
| Unused helpers | `hooks/useFormAnimation.ts`, `hooks/useGoogleAuth.ts`, `utils/soundUtils.ts`, `lib/supabase.ts` (a one-line re-export of `lib/supabaseClient`) |

**Why deferred:** deleting ~3 300 lines of someone's work is an ownership call, not
a lint fix. Confirming each component is not a planned feature is the owner's
decision.

**How to fix:**

```bash
# after confirming none are wanted, e.g.:
git rm frontend/src/services/ai frontend/src/services/complaints frontend/src/services/feedback
npm run build:frontend && npm run lint      # proves nothing broke
```

Note they cost **no** bundle size today — unimported modules are never included in
the build. The cost is comprehension, not bytes.

---

## 2. Remaining dependency advisories (8)

Reduced from **40 → 8** by removing unused dependencies and applying safe updates.
What is left needs a major-version jump, so it should be done deliberately.

| Package | Severity | Why it is deferred | Suggested approach |
| ------- | -------- | ------------------ | ------------------ |
| `vite` (5 → 8) | high | Path traversal in the **dev server**; requires Vite 8 + plugin compatibility work | Upgrade on a branch, verify `vite build`, `tsc` and the dev proxy |
| `esbuild` (via Vite) | moderate | Same upgrade as above; dev-only | Comes along with Vite 8 |
| `react-router-dom` (6 → 7) | moderate | Open-redirect fix requires the v7 rewrite across ~20 route modules | Upgrade + regression-test every route, including the `/profile/:userId` public page |
| `@typescript-eslint/*`, `minimatch` | high | ReDoS in the **linter** only — pulled in by the deprecated `eslint-config-standard-with-typescript` | Migrate to `eslint-config-love` (as upstream advises), then drop the old config |
| `qs` (transitive via Express) | moderate | Untriggerable by this app (no deep object parsing of untrusted `$data`) | Resolves itself with the next Express patch |

Removed outright (they were unused, and one had **no fix available**):
`xlsx` (prototype pollution) and `joi` (unbounded recursion).

Track with:

```bash
npm audit
npm outdated
```

---

## 3. Lint warnings: 372 `no-explicit-any`

Errors are at zero (CI enforces that), but the warnings are real type-safety
debt — mostly around Socket.IO payloads, AI provider responses and legacy props.

**How to fix:** turn the rule into an error per-directory as each area is typed:

```bash
cd frontend
npx eslint "src/services/**/*.ts"            # start where types pay off most
# then flip no-explicit-any to \"error\" for that path in eslint.config.js
```

Prefer precise types for API/provider payloads; `unknown` plus a narrow parse is
usually better than `any`.

---

## 4. No frontend test suite

The backend has unit tests (`npm test`) and an integration-level authorization
test (`npm run test:security`), and CI runs both. The frontend has none.

**How to fix:** add Vitest + React Testing Library, then start with the highest
value targets:

1. `services/apiClient.ts` — 401 handling, token injection
2. `services/authService.ts` — session → auth-store mapping
3. `components/auth/ProtectedRoute.tsx` — role gating
4. `services/voice/IntentRouter.ts` — intent classification fixtures

---

## 5. Serverless deployment caveats

| Limitation | Impact | Mitigation |
| ---------- | ------ | ---------- |
| Filesystem is ephemeral | Uploads vanish between invocations; `/uploads/<file>` 404s after a cold start | Move to S3 / Cloudflare R2 / Supabase Storage with signed URLs |
| No long-lived process | Socket.IO live updates and `utils/escalationWorker.js` (SLA escalation) do not run | Move escalation to Vercel Cron or a scheduled GitHub Action; clients poll or use a hosted WS service |
| Cold starts | First request after idle is slower | Keep-warm pings or a long-running host (`backend/src/server.js` on Render/Fly/PM2) |

See [DEPLOYMENT.md](DEPLOYMENT.md) §2 for the full comparison.

---

## 6. Offline/demo mode is not a production store

Without `MONGO_URI` the API runs on `backend/src/utils/inMemoryStore.js` (JSON file
on disk). It is excellent for UI work and demos — and unsuitable for real data:
single-process state, no transactions, no backup story, and the file is writable by
anything that can reach the process.

**How to fix:** make the mode explicit in the UI (a banner reading "demo data —
not saved"), and/or refuse to start in offline mode when `NODE_ENV=production`.

---

## 7. Smaller items

- **Escalation email templates** exist but are only exercised by the worker, which
  is a no-op on serverless (see §5).
- **Rate limiting is per-instance** (in-memory store). Swap
  `middleware/rateLimiters.js` to a Redis store before scaling horizontally, or the
  effective limit multiplies by the number of instances.
- **AWS/`S3` in the roadmap**: uploads validate MIME type and size but are not
  virus-scanned; add scanning if uploads are ever exposed publicly.
- **`docs/` screenshots**: the README links no UI images yet; adding a few
  screenshots (student dashboard, admin analytics, assistant) would help newcomers.
