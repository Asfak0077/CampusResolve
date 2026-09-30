# Security Policy

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
| Password hashing | bcrypt (`bcryptjs`), 10 rounds |
| Login/OTP brute-force protection | `backend/src/middleware/rateLimiters.js` (`authLimiter`) |
| Rate limits on AI endpoints and uploads | `authLimiter`, `aiLimiter`, `uploadLimiter` |
| NoSQL injection defences | `express-mongo-sanitize` |
| Security headers | `helmet` |
| Request body limits | `express.json({ limit })` |
| Secrets in the environment only | `.gitignore` + `backend/src/config/env.js` |
| Automated authorization regression test | `backend/scripts/security-smoke-test.mjs` |

## ⚠️ Credential hygiene — action required for existing deployments

This repository is **public**, and earlier commits contained secrets that must now be treated as compromised. Removing a file does not remove it from Git history, so **rotate, don't just delete**:

| Credential | Where it leaked | Action |
| ---------- | --------------- | ------ |
| MongoDB Atlas user `asfakrahman43_db_user` (database password, two variants) | hardcoded in 8 backend scripts | **Rotate the database user password in Atlas → Database Access.** Also audit which IPs are allowed and who has cluster access |
| NVIDIA NIM API key (`nvapi-…`) | `backend/src/services/ragService.js` fallback | **Revoke and reissue** at <https://build.nvidia.com>, update `NVIDIA_API_KEY` in your environment |

Other steps worth taking:

1. Rotate `SECRET_KEY` so all previously issued JWTs become invalid.
2. Review the allowlist (`allowedemails`) and remove addresses that should not sign in.
3. Change every demo/seed password (`password123`, `teach123`) on any live instance.
4. Check Atlas logs for unexpected connections from unknown IPs.
5. Consider [BFG](https://rtyley.github.io/bfg-repo-cleaner/) or `git filter-repo` if you need the history itself cleaned — and force-push only after coordinating with everyone who has a clone.

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
