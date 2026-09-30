# API reference

- **Base URL (local):** `http://localhost:5001/api`
- **Auth:** send `Authorization: Bearer <token>` on protected routes.
- **Content type:** `application/json` (uploads use `multipart/form-data`).
- **Roles:** `student` · `teacher` · `admin` (guests may call the public routes only).

Legend: 🔓 public · 🔐 any signed-in user · 👨‍🏫 teacher or admin · 🛡️ admin only

Interactive check of these rules: `node backend/scripts/security-smoke-test.mjs`

---

## Health

| Method | Path | Access | Description |
| ------ | ---- | ------ | ----------- |
| `GET` | `/health` | 🔓 | `{ ok: true, service }` liveness probe |

---

## Auth — `/api/auth`

| Method | Path | Access | Description |
| ------ | ---- | ------ | ----------- |
| `POST` | `/student-login` | 🔓 | Email + password sign-in (admins use this too when their account lives in `students`) |
| `POST` | `/login` | 🔓 | Alias of `student-login` |
| `POST` | `/student-signup` | 🔓 | Self-registration (subject to the allowed-email policy) |
| `POST` | `/teacher-login` | 🔓 | `{ teacherId \| email, password }` |
| `POST` | `/verify-google-user` | 🔓 | Verifies a Supabase/Google session against the allowlist, returns an app JWT |
| `POST` | `/google/verify` | 🔓 | Verifies a Google ID token directly |
| `GET` | `/me` | 🔐 | Current account from the bearer token |
| `PUT` | `/profile` | 🔐 | Update display name / phone / profile fields |
| `POST` | `/verify-email-exists` | 🔓 | Pre-check used by the forgot-password flow |
| `POST` | `/forgot-password/student` · `/forgot-password/teacher` | 🔓 | Start an OTP reset |
| `POST` | `/verify-otp` | 🔓 | Validate the emailed OTP |
| `POST`/`PUT` | `/update-password` | 🔓 | Complete the reset with a valid OTP |
| `PUT` | `/reset-password` | 🔓 | Supabase recovery-flow alias |
| `POST` | `/send-password-reset-email` | 🔓 | Email a Supabase recovery link |
| `POST` | `/change-password` | 🔓 | Change password for a signed-in user |
| `POST` | `/set-password` | 🔓 | First-time password setup for Google-created accounts |
| `POST` | `/logout` | 🔓 | Client-side session teardown |

> All credential and OTP endpoints are rate limited (20 failed attempts per 15 minutes per IP).

**Example**

```bash
curl -X POST http://localhost:5001/api/auth/student-login \
  -H 'Content-Type: application/json' \
  -d '{"email":"student@campusresolve.edu","password":"password123"}'
```

```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIs…",
  "user": { "id": "CR21CS001", "name": "Student User", "role": "student", "department": "CSE" }
}
```

---

## Complaints — `/api/complaints`

| Method | Path | Access | Description |
| ------ | ---- | ------ | ----------- |
| `POST` | `/create` | 🔐 | Create a complaint (canonical endpoint) |
| `POST` | `/predict-resolution` | 🔐 | AI prediction of resolution time / priority |
| `GET` | `/student/:studentId` | 🔐 | A student's complaint list |
| `GET` | `/details/:complaintId` | 🔐 | Full complaint with timeline and AI analysis |
| `GET` | `/teacher/:teacherId` | 👨‍🏫 | Complaints assigned to a teacher |
| `GET` | `/teacher/:teacherId/activity-logs` | 👨‍🏫 | Teacher action history |
| `PUT` | `/:complaintId/update-status` | 👨‍🏫 | Change status (`Assigned`, `In Progress`, `Resolved`, …) with notes |
| `PUT` | `/:complaintId/feedback` | 🔐 | Attach feedback data to a complaint |
| `GET` | `/admin/all-complaints` | 🛡️ | Paginated campus-wide list (`status`, `priority`, `department`, `search`, `page`, `limit`) |
| `GET` | `/admin/analytics` | 🛡️ | Totals, resolution rate, breakdowns by department/priority/category, satisfaction |
| `GET` | `/admin/activity-logs` | 🛡️ | Campus audit trail |
| `PUT` | `/:complaintId/assign` | 🛡️ | Assign or reassign a teacher |
| `DELETE` | `/:complaintId` | 🛡️ | Delete a complaint |
| `GET` | `/` · `POST` `/` · `PATCH` `/:id` · `POST` `/:id/assign` | see note | Legacy aliases kept for older clients (`GET /` is admin-only, `POST /` requires a session) |

**Create request**

```jsonc
{
  "title": "Broken fan in Lab 12",
  "category": "Infrastructure",
  "department": "CSE",
  "description": "The ceiling fan stopped working during the lab session.",
  "priority": "medium",
  "studentData": { "name": "Student User", "email": "student@campusresolve.edu", "studentId": "CR21CS001", "phone": "9999999999" },
  "attachments": ["/uploads/files-1234.png"]
}
```

**Status update**

```bash
curl -X PUT http://localhost:5001/api/complaints/CR-001/update-status \
  -H "Authorization: Bearer $TEACHER_TOKEN" -H 'Content-Type: application/json' \
  -d '{"newStatus":"In Progress","resolutionNotes":"Electrician scheduled for tomorrow"}'
```

---

## Feedback — `/api/feedback`

| Method | Path | Access | Description |
| ------ | ---- | ------ | ----------- |
| `POST` | `/` | 🔐 | Submit feedback for a resolved complaint |
| `GET` | `/` | 🛡️ | All feedback (analytics page) |
| `GET` | `/student/:studentId` | 🔐 | Feedback written by a student |
| `GET` | `/teacher/:teacherId` | 👨‍🏫 | Feedback received by a teacher |
| `GET` | `/teachers/:department` | 🔐 | Feedback aggregated for a department |

---

## Teachers — `/api/teachers`

| Method | Path | Access | Description |
| ------ | ---- | ------ | ----------- |
| `GET` | `/` | 🔐 | Teacher directory (students need it to route complaints) |
| `POST` | `/` | 🛡️ | Create a teacher account |
| `DELETE` | `/:id` | 🛡️ | Remove a teacher |

---

## Notifications — `/api/notifications`

| Method | Path | Access | Description |
| ------ | ---- | ------ | ----------- |
| `GET` | `/?userId=` | 🔐 | Feed for the signed-in user |
| `GET` | `/unread-count` | 🔐 | Badge count |
| `POST` | `/mark-read/:id` | 🔐 | Mark one as read |
| `POST` | `/mark-all-read` | 🔐 | Mark everything as read |
| `DELETE` | `/:id` | 🔐 | Delete a notification |

---

## Analytics — `/api/analytics`

| Method | Path | Access | Description |
| ------ | ---- | ------ | ----------- |
| `GET` | `/teachers/performance` | 🔐 | Per-teacher workload, average resolution hours and a 0–5 rating |
| `GET` | `/performance` | 🔐 | Legacy alias |

---

## AI intelligence — `/api/ai-intelligence`

| Method | Path | Access | Description |
| ------ | ---- | ------ | ----------- |
| `GET` | `/complaints/:complaintId` | 🔐 | Cached AI analysis (category, priority, sentiment, duplicates, resolution prediction) |
| `POST` | `/complaints/:complaintId/refresh` | 🔐 | Recompute the analysis |
| `POST` | `/complaints/:complaintId/smart-escalate` | 🔐 | Escalate using the AI priority signal |
| `GET` | `/admin/campus-summary` | 🛡️ | Natural-language campus status summary |
| `GET` | `/admin/recommendations` | 🛡️ | Ranked actions for admins |
| `POST` | `/admin/recommendations/:id/dismiss` | 🛡️ | Dismiss a recommendation |

---

## Assistant — `/api/chatbot`

| Method | Path | Access | Description |
| ------ | ---- | ------ | ----------- |
| `POST` | `/message` | 🔓* | Conversation turn (guest Q&A allowed) |
| `POST` | `/enhance-text` | 🔓* | Rewrite a complaint/feedback draft |
| `POST` | `/analyze-feedback` | 🔓* | Sentiment + quality analysis of a feedback draft |
| `POST` | `/generate-bio` | 🔓* | Generate a profile bio |
| `POST` | `/user-context` | 🔓* | Resolve the caller's context |
| `GET` | `/eligible-resolved-complaints` | 🔐 | Complaints awaiting feedback |
| `POST` | `/submit-feedback` | 🔐 | File feedback from the chat flow |
| `POST` | `/create-complaint` | 🔐 | Create a complaint from the chat flow |
| `POST` | `/join-complaint` | 🔐 | Join an existing complaint |
| `GET` | `/logs` | 🛡️ | Assistant transcript (admin) |

\* Public endpoints are rate limited (60 requests / 15 minutes per IP) to protect model credits.

---

## Uploads — `/api/upload`

| Method | Path | Access | Description |
| ------ | ---- | ------ | ----------- |
| `POST` | `/multiple` | 🔐 | `multipart/form-data` field `files`; returns `/uploads/<filename>` URLs (40 uploads / 15 min) |

Static files are served by the Express server at `/uploads/<filename>` (and proxied by Vite in development).

---

## Error format

```json
{ "message": "Not authorized, no token" }
```

| Status | Meaning |
| ------ | ------- |
| `400` | Validation failed / required fields missing |
| `401` | No token, expired token, or the account no longer exists |
| `403` | Authenticated, but the role may not perform this action |
| `404` | Resource not found |
| `429` | Rate limit exceeded — back off and retry |
| `500` | Server error (details are logged server-side, never returned) |
