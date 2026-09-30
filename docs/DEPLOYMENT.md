# Deployment

Two supported paths: Vercel (what the live demo uses) and any Node host that can run a long-lived process. Both need the same environment variables.

---

## 1. Pre-flight checklist

- [ ] `MONGO_URI` points at a MongoDB Atlas cluster with **Network Access** allowing your host (`0.0.0.0/0` only for throwaway demos)
- [ ] `SECRET_KEY` is a long random string — **the API refuses to sign tokens without it in production**
- [ ] `FRONTEND_URL` matches the deployed origin (used in emails and OAuth redirects)
- [ ] Google OAuth **Authorized JavaScript origins** include your production URL
- [ ] `EMAIL_USER` / `EMAIL_PASS` set if you want real emails (otherwise reset links are logged server-side)
- [ ] `ALLOWED_EMAILS` lists the Google accounts allowed to sign in
- [ ] `SEED_DEMO_DATA=false` so demo accounts are never created on a live campus instance
- [ ] Demo passwords changed (`ADMIN_PASSWORD=... node backend/create_admin.js`)
- [ ] No secret has ever been committed — see [SECURITY.md](../SECURITY.md)

Generate a secret:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## 2. Vercel

The repository root holds `vercel.json`:

| Setting | Value |
| ------- | ----- |
| Build command | `npm run build:frontend` (`tsc && vite build`) |
| Output directory | `frontend/dist` |
| API function | `api/index.js` → same Express app as the local server |
| Routing | `/api/*` and `/uploads/*` → the function, everything else → the SPA |
| Function memory / timeout | 1024 MB / 30 s |

### Steps

```bash
npm i -g vercel
vercel login
vercel            # preview deployment
vercel --prod     # production
```

Then, in **Vercel → Project → Settings → Environment Variables**:

| Variable | Value |
| -------- | ----- |
| `MONGO_URI` | `mongodb+srv://…` |
| `SECRET_KEY` | the generated secret |
| `FRONTEND_URL` | `https://<your-app>.vercel.app` |
| `VITE_API_BASE_URL` | `/api` (same origin) |
| `GOOGLE_CLIENT_ID` / `VITE_GOOGLE_CLIENT_ID` | your OAuth client |
| `EMAIL_USER`, `EMAIL_PASS`, `EMAIL_FROM` | SMTP sender |
| `GEMINI_API_KEY`, `NVIDIA_API_KEY`, `OPENROUTER_API_KEY` | AI providers (optional) |
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | optional |
| `ALLOWED_EMAILS` | comma-separated allowlist |
| `SEED_DEMO_DATA` | `false` |

`VITE_*` values are inlined at build time — change one and you must redeploy.

### Serverless caveats

| Caveat | Impact | Mitigation |
| ------ | ------ | ---------- |
| No long-lived process | Socket.IO and the SLA escalation worker do not run | Use polling/UIs that refetch; move escalation to Vercel Cron or a scheduled GitHub Action |
| Filesystem is ephemeral | Uploads written to `/uploads` disappear between invocations | Use S3/R2/Supabase Storage for production uploads |
| Cold starts | First request after idle is slower (Mongo connection is reused across warm invocations) | Keep-alive pings, or move to a long-running host |

---

## 3. Long-running Node host

Recommended when you need WebSockets, background jobs and durable local uploads (Render, Railway, Fly.io, a VM with PM2, Docker).

```bash
npm ci
npm run build:frontend                      # produces frontend/dist
NODE_ENV=production node backend/src/server.js
```

- Health check: `GET /api/health`
- Port: `PORT` (default `5001`)
- Serve `frontend/dist` from your reverse proxy (nginx/Caddy) or a static host, and proxy `/api`, `/uploads` and `/socket.io` to the Node process:

```nginx
location /api/        { proxy_pass http://127.0.0.1:5001; }
location /uploads/    { proxy_pass http://127.0.0.1:5001; }
location /socket.io/  { proxy_pass http://127.0.0.1:5001; proxy_http_version 1.1;
                        proxy_set_header Upgrade $http_upgrade; proxy_set_header Connection "upgrade"; }
location /            { root /var/www/campusresolve/frontend/dist; try_files $uri /index.html; }
```

PM2 example:

```bash
pm2 start backend/src/server.js --name campusresolve-api -i 2
pm2 save && pm2 startup
```

---

## 4. Database preparation

1. Create a cluster on [MongoDB Atlas](https://cloud.mongodb.com) (M0 is fine to start).
2. **Database Access** → add a user with `readWrite` on the app database.
3. **Network Access** → add your host's IP (or `0.0.0.0/0` for a temporary demo).
4. Put the connection string in `MONGO_URI`, including the database name: `…/campusresolve?retryWrites=true&w=majority`.
5. Indexes are created by Mongoose on first use. Seed data:

```bash
NODE_ENV=development node backend/src/server.js   # seeds demo accounts once
# or explicitly:
ADMIN_PASSWORD='…' node backend/create_admin.js
TEACHER_DEFAULT_PASSWORD='…' node backend/create_teachers.js
```

Optional Supabase (notifications + password recovery):

```sql
-- run supabase_notifications_rls.sql in the Supabase SQL editor
```

---

## 5. Google sign-in setup

1. [Google Cloud Console](https://console.cloud.google.com/apis/credentials) → **Create credentials → OAuth client ID → Web application**.
2. **Authorized JavaScript origins:** `http://localhost:5173`, `http://127.0.0.1:5173`, and each deployed origin.
3. **Authorized redirect URIs:** your Supabase callback if you use Supabase OAuth (`https://<project>.supabase.co/auth/v1/callback`).
4. Put the client ID in `VITE_GOOGLE_CLIENT_ID` (frontend) and `GOOGLE_CLIENT_ID` (backend, for token verification).
5. Add the accounts that may sign in to `ALLOWED_EMAILS`.

---

## 6. Post-deploy verification

```bash
curl -s https://<your-app>/api/health
# {"ok":true,"service":"sdcfrs-backend","timestamp":"…"}

API_BASE_URL=https://<your-app>/api node backend/scripts/security-smoke-test.mjs
# 22 checks: anonymous callers rejected, each role limited to its own data
```

Then in the browser: sign in as student → file a complaint; as teacher → update its status; as admin → assign it and confirm analytics update.

---

## 7. Rollback

- **Vercel:** Deployments → pick the previous successful build → *Promote to Production*.
- **Node host:** keep the previous release directory and repoint the symlink; `pm2 reload campusresolve-api`.
- **Database:** Atlas provides point-in-time restore on paid tiers — take a manual snapshot before schema migrations.
