# Railway Production Setup Guide

This guide covers the environment variables and Railway configuration required before the Uchqun
platform goes live with real users. All items marked **REQUIRED** are blocking for production.

---

## Required Environment Variables

### Database

| Variable | Example | Notes |
|---|---|---|
| `DATABASE_URL` | `postgresql://user:pass@host:5432/railway` | Injected automatically by Railway Postgres plugin |
| `DB_NAME` | `railway` | Only needed if not using `DATABASE_URL` |
| `DB_USER` | `postgres` | Only needed if not using `DATABASE_URL` |
| `DB_PASSWORD` | `secret` | Only needed if not using `DATABASE_URL` |
| `DB_HOST` | `host.railway.internal` | Only needed if not using `DATABASE_URL` |
| `DB_PORT` | `5432` | Only needed if not using `DATABASE_URL` |

### Security / Auth

| Variable | Example | Notes |
|---|---|---|
| `JWT_SECRET` | 64-char random hex | Run `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `JWT_REFRESH_SECRET` | 64-char random hex | Different from `JWT_SECRET` |
| `MIGRATION_SECRET` | 32-char random hex | Required for `POST /api/migrations/run` |
| `NODE_ENV` | `production` | Controls security headers, CORS, HTTPS enforcement |

### CORS (PL-002 / PL-008) — REQUIRED

```
FRONTEND_URL=https://uchqun-admin.netlify.app,https://uchqun-teacher.netlify.app,https://uchqun-reception.netlify.app,https://uchqun-government.netlify.app
```

- Comma-separated list of exact origins (protocol + host, no trailing slash).
- Omitting this in production blocks ALL cross-origin requests (fail-closed by design).
- Do **not** set `CORS_DEV_OPEN=true` in production — dev-only flag.

### Redis (PL-007) — REQUIRED for multi-instance

```
REDIS_URL=redis://default:<password>@<host>:6379
```

- Add a Redis plugin in Railway and copy the `REDIS_URL` variable.
- Without this, login lockout counters and JTI revocation are in-memory (lost on restart, not
  shared across instances).
- A single-instance deploy can operate without Redis but will lose lockout state on restarts.

### Sentry (PL-005) — REQUIRED for error visibility

```
SENTRY_DSN=https://your-key@o0.ingest.sentry.io/your-project-id
```

- Without this, all production errors are invisible. The backend starts and runs, but errors
  are only logged to Railway stdout (not alertable).
- Create a project at https://sentry.io, copy the DSN from Project Settings → Client Keys.

### External Services

| Variable | Required? | Notes |
|---|---|---|
| `APPWRITE_ENDPOINT` | Yes (for file uploads) | `https://cloud.appwrite.io/v1` |
| `APPWRITE_PROJECT_ID` | Yes | From Appwrite console |
| `APPWRITE_API_KEY` | Yes | Server API key with storage permissions |
| `APPWRITE_BUCKET_ID` | Yes | Bucket ID for media/document storage |
| `OPENAI_API_KEY` | Optional | Required for AI chat assistant feature |
| `OPENAI_BASE_URL` | Optional | Default: OpenAI; set to OpenRouter URL for multi-model |
| `OPENAI_MODEL` | Optional | Default model for AI chat |
| `TELEGRAM_BOT_TOKEN` | Optional | Required for Telegram notification channel |
| `TELEGRAM_CHANNEL_ID` | Optional | Channel or group ID for notifications |

---

## Railway-Specific Configuration

### Start command

The Railway service uses `npm run start:migrate` which runs pending migrations before starting the
server. This is safe to run on every deploy — Sequelize migrations are idempotent.

```json
// package.json
"start:migrate": "sequelize-cli db:migrate && node server.js"
```

### Database backups (PL-006)

1. In Railway dashboard → your Postgres plugin → **Backups** tab.
2. Enable automated daily backups (requires Railway Pro plan).
3. Set retention to at least 7 days.
4. Do a manual restore test before go-live: restore to a staging environment and run
   `GET /health` + a few authenticated requests to verify data integrity.

### Multi-instance scaling

Before scaling beyond 1 instance:
1. Set `REDIS_URL` (login lockout and JTI revocation require shared state).
2. Configure Socket.io Redis adapter (see `config/socket.js` — currently in-memory).

---

## Pre-Launch Checklist Reference

See `LOOP_PRE_LAUNCH_CHECKLIST.md` for the full list of blocking items. The env vars above
correspond to:

- PL-002: `FRONTEND_URL` explicit allowlist
- PL-005: `SENTRY_DSN` production monitoring
- PL-006: Railway backup configuration
- PL-007: `REDIS_URL` for multi-instance
- PL-008: `FRONTEND_URL` must be set (same as PL-002)
