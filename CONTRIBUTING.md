# Contributing to CampusResolve

Thanks for wanting to improve the project! This guide covers everything you need to go from clone to merged pull request.

---

## Ways to contribute

| Type | Start here |
| ---- | ---------- |
| 🐛 Bug report | [Open an issue](../../issues/new?template=bug_report.yml) with the exact error and steps to reproduce |
| 💡 Feature idea | [Open a feature request](../../issues/new?template=feature_request.yml) describing the problem before the solution |
| 📝 Documentation | Typos, unclear setup steps and missing screenshots are all welcome PRs |
| 🔧 Code | Bug fixes, accessibility, tests and performance work — see the roadmap in the README |
| 🔐 Security | **Do not open a public issue.** Follow [SECURITY.md](SECURITY.md) |

---

## Development setup

```bash
git clone https://github.com/<you>/CampusResolve.git
cd CampusResolve
npm install                     # installs the frontend + backend workspaces

cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env

npm run dev                     # API on :5001, SPA on :5173
```

You do **not** need MongoDB or any API keys to get started: without `MONGO_URI` the backend runs in offline/demo mode with seeded data.

Add `SECRET_KEY` to `backend/.env` to avoid the "insecure development secret" warning:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## Before you open a PR

All three must pass locally — this is exactly what CI runs:

```bash
npm run lint                 # ESLint + backend syntax check, zero errors required
npm test                     # backend unit tests
npm run scan:secrets         # no credentials in tracked files
npm run build:frontend       # tsc + vite build
npm run test:security        # 33 authorization checks, with the API running
```

The security smoke test verifies that anonymous callers are rejected and each
role only reaches its own data. If you add or change a route, update that script
and [docs/API.md](docs/API.md) in the same PR.

---

## Branching & commits

```
main                       stable, deployable
└── feat/short-description  your work
```

Use [Conventional Commits](https://www.conventionalcommits.org/) — the prefixes make the history readable:

```
feat(complaints): add SLA badge to the student timeline
fix(auth): reject tokens for deleted accounts
docs(readme): document the AI fallback behaviour
chore(deps): bump mongoose to 8.6
security(api): require admin role for complaint export
```

Rules of thumb:

- One logical change per commit; explain **why**, not just what.
- Never commit `.env`, credentials, uploads, `dist/` or editor files (`.gitignore` covers these — don't fight it).
- Keep the diff focused; unrelated formatting churn makes review harder.

---

## Code style

**Frontend**

- TypeScript, function components, hooks. Avoid `any` where a real type is cheap.
- Styling with Tailwind utilities; page-specific CSS lives in `src/styles/`.
- Reuse the design system in `src/components/ds/` before writing new primitives.
- Every network call goes through `src/services/apiClient.ts` so the JWT is attached.

**Backend**

- CommonJS (`require`) — the project is JavaScript on the server, not TypeScript.
- New routes: mount them in `backend/src/routes/index.js` (**never** add a mount in only one entry point — that's how the Vercel/Serve mismatch happened).
- Wrap protected handlers with `protect` and the right `authorize(...)` role.
- Branch on `mongoose.connection.readyState === 1` and keep the in-memory store path working so offline mode stays usable.
- Never hardcode secrets or connection strings. Read them from `process.env` via `backend/src/config/env.js`.
- Validate input, return `4xx` with a helpful `message`, and log details server-side rather than leaking them to clients.

---

## Data & migrations

- Seed data belongs in `backend/src/utils/seedDemoData.js`, and seeding must be **idempotent**: never overwrite a password or erase user data on boot.
- Destructive scripts must call `confirmDestructive()` from `backend/src/config/env.js` and require `--yes`.
- Add new models to [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) §4 and new endpoints to [docs/API.md](docs/API.md).

---

## Pull request checklist

- [ ] The change solves one problem and links the related issue (`Closes #123`)
- [ ] `npm run lint`, `npm run build:frontend` and the security smoke test pass
- [ ] New/changed endpoints are documented in `docs/API.md` and covered by `security-smoke-test.mjs`
- [ ] No secrets, credentials, personal data or generated artifacts are included
- [ ] UI changes include a screenshot or short screen recording
- [ ] Commit messages follow Conventional Commits

---

## Review process

1. CI (lint + build) must be green.
2. A maintainer reviews for correctness, security and consistency, and may ask for changes.
3. Once approved, your PR is squash-merged into `main`.

Be kind in reviews — see our [Code of Conduct](CODE_OF_CONDUCT.md). First-time contributors are explicitly welcome; ask questions in the PR thread if anything is unclear.
