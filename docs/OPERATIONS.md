# Uchqun Platform — Operations Runbook

## Database Backups (PL-006)

### Railway automated backups

Railway provides automated daily backups depending on plan tier:
- Hobby: 7 days retention
- Pro: 30 days retention

To verify backups are configured:
1. Open Railway dashboard → your project → Postgres database
2. Click "Backups" tab
3. Confirm "Automated backups" is enabled
4. Note the most recent backup timestamp

### Recovery procedure

Railway recovery requires a support ticket. Workflow:
1. Identify the timestamp you need to recover to.
2. Open a Railway support ticket via the dashboard.
3. Request restoration to a new database (not in-place — in-place restore loses
   data between the backup and the current state).
4. Once restored, update DATABASE_URL env var to point to the new database.

### Backup & restore runbook

**See `docs/BACKUP_RUNBOOK.md`** — exact dump/restore/verification commands, expected
durations, and the break-glass restore-to-prod procedure. The restore drill was executed
and PROVEN on 2026-06-12 (table counts, row counts, app queries, and schema version all
verified against production). Re-run quarterly or after major schema changes.

### Optional: external pg_dump (script ready, disabled)

`scripts/backup-db.sh` + `.github/workflows/db-backup.yml` implement a nightly pg_dump to
S3-compatible storage. Disabled by default — the workflow header lists the exact secrets
and the repository variable (`DB_BACKUP_ENABLED`) needed to enable it.

---

## Error Monitoring (PL-005 — deferral revoked 2026-06-12, code-ready)

**Backend** — `backend/utils/errorTracker.js`. When `SENTRY_DSN` is set:
- Sentry initializes on server start with `environment`, `release`
  (`RAILWAY_GIT_COMMIT_SHA`, injected by Railway), and `sendDefaultPii: false`.
- `Sentry.setupExpressErrorHandler(app)` captures all Express-level errors.
- `captureException` is called explicitly for `SequelizeDatabaseError` and generic 5xx responses in `middleware/errorHandler.js`.
- **Mandatory PII scrubbing** (`beforeSend: scrubEvent`): auth headers/cookies stripped;
  sensitive field names (names, emails, phones, diagnoses, notes, message content, …)
  redacted recursively; emails and JWTs masked inside exception messages and breadcrumbs;
  `user` reduced to opaque id only. Unit-tested in `__tests__/utils/errorTracker.test.js`.
- Without `SENTRY_DSN` the module is a complete no-op (also unit-tested).

**Frontend (all four portals)** — single shared implementation:
- `shared/services/sentry.js` (`initSentry()`, called from each portal's `main.jsx`)
- `shared/utils/piiScrub.js` (same scrubbing rules as the backend)
- No `VITE_SENTRY_DSN` at build time → complete no-op; the SDK isn't even downloaded
  (dynamic import). With DSN: `environment`, optional `release` via `VITE_COMMIT_SHA`,
  `sendDefaultPii: false`, `beforeSend`/`beforeBreadcrumb` scrubbing.
- `shared/components/ErrorBoundary.jsx` reports React render errors via `window.Sentry`,
  which `initSentry()` sets.
- Unit-tested in `admin/src/__tests__/shared/sentry.test.js`.

### MAX-ACTIONS — Sentry go-live checklist (~20 min, only Max can do these)

1. Create a Sentry org/account at https://sentry.io (free Developer tier is fine to start).
2. Create **two projects**: `uchqun-backend` (platform: Node.js → Express) and
   `uchqun-portals` (platform: Browser JavaScript → React).
3. Backend DSN → Railway: dashboard → backend service → Variables →
   `SENTRY_DSN=<uchqun-backend DSN>`. Railway redeploys automatically.
4. Portal DSN → each portal's build environment (Netlify/Vercel site settings →
   Environment variables): `VITE_SENTRY_DSN=<uchqun-portals DSN>`, then trigger a rebuild.
   (One shared browser project/DSN is fine — events are distinguishable by URL.)
5. Alert channel: Sentry → Alerts → create rule "A new issue is created" → notify via
   email (or connect Telegram/Slack integration if preferred).
6. **Prove events arrive (backend):** hit a guaranteed-500 once, e.g.
   `curl -X POST https://uchqun-production-b484.up.railway.app/api/v1/auth/login -H "Content-Type: application/json" -d "not-json"`
   or temporarily stop the Postgres service for one request. Then check the Sentry issue
   stream — an event with `environment: production` and a `release` SHA must appear.
7. **Prove events arrive (portals):** open any portal, log in, run
   `window.Sentry.captureException(new Error('sentry wiring test'))` in the browser
   console, confirm it appears under `uchqun-portals`.

### On-call runbook

When a Sentry alert fires:
1. Check the error stack trace in Sentry for the controller and line number.
2. Check Railway logs for context around the same timestamp.
3. If it is a DB error (`SequelizeDatabaseError`), check the Railway Postgres metrics.
4. If it is a 5xx in a child/parent endpoint, cross-reference the audit log for the affected school.

---

## Uptime Monitoring & Health Alerting

### Health endpoints (live, unauthenticated, no data exposure)

| Endpoint | What it proves | Response |
|---|---|---|
| `GET /health` | process is up | `{ status: "ok", service, version, uptime, timestamp }` — always 200, no DB touch (Railway deploy healthcheck needs it fast) |
| `GET /health/readiness` | **DB connectivity** | 200 `{ status: "ready", checks: { database: "healthy" } }` or 503 when the DB is unreachable |
| `GET /health/liveness` | process is up | 200 `{ status: "alive", uptime }` |

Verified against production 2026-06-12: both `/health` and `/health/readiness` returned
200 with healthy payloads.

### MAX-ACTIONS — external pinger setup (~10 min, UptimeRobot free tier)

1. Create an account at https://uptimerobot.com (free: 50 monitors, 5-min interval).
2. Add monitor 1 — type: HTTP(s), name `uchqun-backend-ready`,
   URL `https://uchqun-production-b484.up.railway.app/health/readiness`, interval 5 min.
   This is the canonical monitor: it fails when the DB is down even if the process is up.
3. Add monitor 2 — type: HTTP(s) **keyword**, name `uchqun-backend-up`,
   URL `https://uchqun-production-b484.up.railway.app/health`, keyword `ok`, interval 5 min.
4. Optionally add the four portal URLs as plain HTTP monitors (static hosts — these
   rarely fail, lowest priority).
5. Alert contact: add your email (and the Telegram integration if wanted) under
   My Settings → Alert Contacts; attach it to both monitors.
6. Threshold: default (alert after 1 failed check, i.e. ≤5 min detection). Expected
   response is HTTP 200; anything else or a timeout (>30 s) alerts.

### Backup alerting path (GitHub Action, disabled)

`.github/workflows/health-check.yml` curls both health endpoints every 15 min and
opens/updates a `health-alert` GitHub issue on failure. Disabled by default — set
repository variable `HEALTH_CHECK_ENABLED=true` and uncomment the `schedule:` block.
No secrets needed. This is the backup path; UptimeRobot is primary (GitHub cron is
best-effort and can be delayed).

---

## Environment Variables Quick Reference

See `docs/RAILWAY_SETUP.md` for the complete env var table.

Critical variables (missing = production outage or security gap):
- `DATABASE_URL` — injected by Railway Postgres plugin
- `JWT_SECRET` / `JWT_REFRESH_SECRET` — must be unique, 64+ char random hex
- `FRONTEND_URL` — CORS allowlist; empty = all cross-origin blocked
- `SENTRY_DSN` — error visibility; empty = silent failures
- `REDIS_URL` — shared state for multi-instance; empty = in-memory fallback

---

## Deployment

Backend auto-deploys to Railway on push to `main` via `.github/workflows/railway-deploy.yml`.
The start command is `npm run start:migrate` which runs pending Sequelize migrations before
starting the server. Migrations are idempotent — safe to run on every deploy.

**Never set `FORCE_SYNC=true`** — this drops all tables and recreates them empty.
