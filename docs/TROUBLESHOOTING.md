# Troubleshooting

Symptoms first, causes second. If a fix here doesn't work, please open an issue with the exact error text.

---

## Quick diagnostics

```bash
node backend/check-env.js        # reports missing/placeholder configuration
curl http://localhost:5001/api/health
node backend/scripts/security-smoke-test.mjs   # verifies auth on a running API
```

---

## Database

### `MongoDB connection attempt 1/3 failed` / `MongooseServerSelectionError`

Atlas is refusing your connection.

1. [MongoDB Atlas](https://cloud.mongodb.com) → **Network Access** → **Add IP Address**
2. **Add Current IP Address** for development, or `0.0.0.0/0` for a short-lived demo — never for production.
3. Wait 1–2 minutes, then restart the API.

Also confirm the connection string includes a database name (`…/campusresolve?retryWrites=true`) and that the password has no unescaped `@`, `:` or `/` characters.

### Data resets every time I restart

The backend is running **in offline/demo mode** because `MONGO_URI` is missing or unreachable. Look for this line in the log:

```
MONGO_URI is not configured. Running in offline/demo mode.
```

It uses `backend/data/store.json` (git-ignored). Set `MONGO_URI` in `backend/.env` for durable data.

### `bad auth : authentication failed`

Wrong username/password in `MONGO_URI` from the Atlas **Database Access** user. If the password contains special characters, URL-encode it.

### Corporate network / TLS errors

```dotenv
MONGO_TLS_ALLOW_INVALID_CERTS=true
```

Only for development behind a TLS-intercepting proxy — it disables certificate validation.

---

## Authentication

### `The given origin is not allowed for this client`

Google Cloud Console doesn't recognise your origin.

1. [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Edit your **OAuth 2.0 Client ID**
3. **Authorized JavaScript origins** → add `http://localhost:5173` and `http://127.0.0.1:5173` (plus every deployed origin)
4. Save and hard-refresh the browser

### `SECRET_KEY is not set` warning, or `401` on every request after deploy

The API signs JWTs with `SECRET_KEY` (or `JWT_SECRET`). In production it **refuses to start signing with the insecure default**, so tokens issued before the secret was set are invalid.

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# add to backend/.env / host env:  SECRET_KEY=<output>
```

Changing the secret invalidates all existing sessions — users simply sign in again.

### `Your Google account is not registered for CampusResolve`

The email isn't in the allowlist. Add it to `ALLOWED_EMAILS` (comma separated) and restart, or insert the address into the `allowedemails` collection.

### Demo login fails

- Accounts only exist after seeding. `SEED_DEMO_DATA=false` disables seeding; production also skips it by default.
- Passwords are **never overwritten** by seeding — if you changed one, re-seed it deliberately:

```bash
ADMIN_PASSWORD='newpass' node backend/create_admin.js
```

- Offline mode accepts only `TCH-CSE-001 / teach123` for teachers.

### `Too many sign-in or password-reset attempts` (`429`)

The auth rate limiter allows 20 failed attempts per 15 minutes per IP. Wait, or restart the API to clear the in-memory counter.

---

## Frontend

### `Network Error` / requests to `localhost:5001` fail

Make sure the backend is running and `frontend/.env` has:

```dotenv
VITE_API_BASE_URL=http://localhost:5001/api
```

Restart Vite after editing `.env` — Vite only reads env files at startup.

### Vite dev server reachable at `localhost` but not from another machine/container

`vite.config.ts` already sets `host: '0.0.0.0'` and `allowedHosts: true`. If you proxy through another hostname, confirm the proxy forwards `/api`, `/socket.io` and `/uploads` to the backend (`VITE_BACKEND_URL`).

### Chat/voice assistant stays silent

1. Browsers require a user gesture before audio — click once inside the page.
2. Microphone access needs HTTPS (or `localhost`); check site permissions.
3. Missing AI keys are not fatal: answers fall back to the rule-based knowledge base. Check the browser console and the API log for provider errors (quota/401 from Gemini or NVIDIA).

### Blank page after deploy, or `Failed to fetch dynamically imported module`

Usually a stale chunk after a redeploy. Hard-refresh (Ctrl/Cmd+Shift+R). If it persists, confirm `VITE_*` variables were set **before** the build — they are baked into the bundle.

---

## Uploads & email

### Uploaded images 404 after deploying to Vercel

The serverless filesystem is ephemeral. Local-disk uploads survive only on a long-running host. Use object storage (S3/R2/Supabase Storage) for production.

### Password-reset email never arrives

1. `EMAIL_USER` / `EMAIL_PASS` must be a Gmail **App Password** (not your account password) for Gmail SMTP.
2. Check the `emaillogs` collection / API log — the send result, including SMTP errors, is recorded there.
3. If no SMTP is configured, the API logs the generated reset link server-side instead of sending it — copy it from the console.

### `Supabase disabled: SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are missing`

Expected and harmless: Supabase is optional. In-app notifications and everything else keep working; only the Supabase mirror and Supabase-hosted recovery links are skipped.

---

## Development environment

### `npm install` fails with peer-dependency errors

The repo pins `legacy-peer-deps=true` in `.npmrc`. Use `npm ci` from the repository root (npm workspaces), not inside a single package.

### `Port 5001 is already in use`

```bash
lsof -ti:5001 | xargs kill -9     # macOS/Linux
netstat -ano | findstr :5001      # Windows
```

Or change `PORT` in `backend/.env` and point `VITE_API_BASE_URL` / `VITE_BACKEND_URL` at the new port.

### `npm run lint` reports hundreds of `no-explicit-any` warnings

Warnings don't fail the build (errors do). The typed-contracts roadmap item tracks reducing them.

---

## Still stuck?

Open an issue with: the exact command, the full error, `node -v`, and whether the API reported *offline/demo mode* or a Mongo connection. Never paste real credentials, connection strings or API keys into an issue.
