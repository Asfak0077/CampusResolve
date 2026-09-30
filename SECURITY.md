# Security Policy

> 🔴 **If you are the maintainer: this repository has open secret-scanning alerts
> for a leaked MongoDB Atlas password and an NVIDIA API key.**
> Rotate them first — see [Open secret-scanning alerts](#-open-secret-scanning-alerts--rotate-these-credentials).
> The leaked files are gone from this branch, but the credentials remain in git
> history and are public. Rotation is the only real fix.

## Reporting a vulnerability

**Please do not report security issues through public GitHub issues.**

Report privately using GitHub's [Security Advisories](../../security/advisories/new) tab for this repository (Security → Report a vulnerability). If you cannot use that, contact the maintainer through their GitHub profile.

Include:

- a description of the issue and its impact,
- steps to reproduce (a `curl` command or short proof of concept is ideal),
- affected endpoint/version and any suggested fix.

**What to expect**

| Stage | Target |
| ----- | ------ |
| Acknowledgement of your report | within 3 days |
| Initial assessment (severity, affected versions) | within 7 days |
| Fix or mitigation for confirmed issues | within 30 days for high severity |
| Public disclosure | coordinated with you after a fix ships; credit given unless you prefer otherwise |

Please give us a reasonable window to fix the issue before public disclosure, and avoid accessing, modifying or deleting data that isn't yours while testing.

## Supported versions

This project is developed on `main`; security fixes land there and are not backported to older commits or forks.

| Version | Supported |
| ------- | :-------: |
| `main` (latest) | ✅ |
| Older commits / forks | ❌ |

## Scope

**In scope**

- The API in `backend/` and the serverless entry in `api/`
- The web client in `frontend/`
- Authentication/authorization logic, JWT handling, role enforcement
- Injection, XSS, CSRF, SSRF, IDOR and rate-limiting bypasses
- Credential or personal-data exposure in the repository

**Out of scope**

- Vulnerabilities in third-party dependencies (report those upstream; open an issue here if the fix requires a version bump)
- Issues that require a compromised device, browser extension, or the victim's own credentials
- Denial of service through sheer volume (we apply rate limits; no SLA on availability)
- Findings against deployments whose owners have not applied the documented configuration

## Security design in this project

| Control | Where |
| ------- | ----- |
| JWT auth with a mandatory secret in production | `backend/src/utils/jwtSecret.js`, `backend/src/middleware/authMiddleware.js` |
| Role gates (`student` / `teacher` / `admin`) | `authorize(...)` on each protected route |
| Record-level authorization (no IDOR) | `backend/src/middleware/accessControl.js` — students read only their own complaints/feedback, teachers only their own queue |
| CORS allowlist (no wildcard) | `backend/src/middleware/corsOptions.js` — `FRONTEND_URL`, `ALLOWED_ORIGINS`, localhost in dev, `*.vercel.app` previews |
| CSPRNG for OTPs and generated ids | `backend/src/utils/secureRandom.js` (replaced `Math.random()`) |
| Upload validation by MIME type | `backend/src/routes/uploadRoutes.js` — stored extension derived from the validated MIME type, 5 MB × 5 files |
| Consistent JSON errors, no stack leakage | `backend/src/middleware/apiErrors.js` |
| Deleted dead code that leaked data | removed `resetPasswordManual.js` (hardcoded personal address) and unused RAG/project modules |
| Password hashing | bcrypt (`bcryptjs`), 10 rounds |
| Login/OTP brute-force protection | `backend/src/middleware/rateLimiters.js` (`authLimiter`) |
| Rate limits on AI endpoints and uploads | `authLimiter`, `aiLimiter`, `uploadLimiter` |
| NoSQL injection defences | `express-mongo-sanitize` |
| Security headers | `helmet` |
| Request body limits | `express.json({ limit })` |
| Secrets in the environment only | `.gitignore` + `backend/src/config/env.js` |
| Automated authorization regression test | `backend/scripts/security-smoke-test.mjs` |

## 🔴 Open secret-scanning alerts — rotate these credentials

GitHub's secret scanning has flagged **live credentials committed to this public
repository**. The files have been removed on the current branch, but *the secrets
are still in the Git history and must be treated as compromised.* Deleting a file
does **not** un-leak a secret — **rotation is the only real fix.**

| Alert | Secret | Originally in | Status in this branch | Required action |
| :---: | ------ | ------------- | --------------------- | --------------- |
| [#1](../../security/secret-scanning/1) | MongoDB Atlas URI (`asfakrahman43_db_user` / `asfakrahman`) | `backend/test-db.js` | file deleted | **Rotate the password in Atlas → Database Access** |
| [#2](../../security/secret-scanning/2) | MongoDB Atlas URI (`asfakrahman43_db_user` / `ogR4BInjAyhGnzpz`) | `backend/update_admin_password.js` | script rewritten to read `MONGO_URI` | **Rotate the password in Atlas** |
| [#3](../../security/secret-scanning/3) | MongoDB Atlas URI (`asfakrahman43_db_user` / `asfak2006`) | `backend/update_teachers.js` | file deleted | **Rotate the password in Atlas** |
| (scan) | NVIDIA NIM key `nvapi-yhk…` | `backend/src/services/ragService.js` | hardcoded fallback removed | **Revoke + reissue** at <https://build.nvidia.com> |

Because all three Atlas URIs name the **same database user**, rotating that one
password invalidates every leaked variant at once.

### Rotate now — 10 minute checklist

1. **MongoDB Atlas** → *Database Access* → edit `asfakrahman43_db_user` → **Edit Password** → generate a new one. Update `MONGO_URI` in your hosting environment (`backend/.env` locally) and redeploy. The old password stops working immediately.
2. **Atlas** → *Network Access* → remove `0.0.0.0/0` if present and allow only your host's IPs.
3. **Atlas** → *Database Access* → confirm the user has `readWrite` on the app database only, not `atlasAdmin`.
4. **NVIDIA** → revoke the old key, issue a new one, set `NVIDIA_API_KEY` in the environment (never in code).
5. **New `SECRET_KEY`** — invalidates every JWT issued so far:
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```
6. Change every live demo/seed password (`password123`, `teach123`).
7. **Then** mark the alerts as *Revoked* in **Security → Secret scanning**, which resolves them and clears the noise.

### Cleaning the history (optional, after rotating)

Rotation is sufficient to make the leak harmless — history rewriting is only worth
it if you want the strings gone from `git log`. It rewrites commit hashes and
requires a coordinated force-push:

```bash
# pip install git-filter-repo
git filter-repo --replace-text <(cat <<'EOF'
asfakrahman43_db_user:asfak2006==>REDACTED
asfakrahman43_db_user:ogR4BInjAyhGnzpz==>REDACTED
asfakrahman43_db_user:asfakrahman==>REDACTED
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==>REDACTED
EOF
)
git push --force --all && git push --force --tags
```

> Everyone with a clone must delete it and re-clone afterwards, and any open PR
> will need rebasing. Do this **after** the credentials are rotated, never instead
> of it — crawlers scrape leaked secrets within minutes.

### Preventing the next one

- Enable **push protection** (Security → Secret scanning) so a commit containing a
  recognised secret is blocked before it reaches GitHub.
- Keep every credential in `.env` (git-ignored) or host environment variables.
- The maintenance scripts in `backend/` now require `MONGO_URI` from the
  environment and fail fast with a clear message when it is missing — use them
  rather than pasting a connection string into a file.

## Hardening checklist for deployments

```
[ ] SECRET_KEY set to 32+ random bytes (the API refuses weak defaults in production)
[ ] SEED_DEMO_DATA=false and no demo passwords in use
[ ] MONGO_URI user has readWrite on a single database, not an admin role
[ ] Atlas Network Access restricted to your host's IPs
[ ] ALLOWED_EMAILS lists only real campus accounts
[ ] EMAIL_PASS is an app password, never an account password
[ ] CORS restricted to your frontend origin for production use
[ ] Uploads stored in object storage with size/type validation
[ ] Backups enabled (Atlas snapshots) and a restore has been tested
```
