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

### Optional: external pg_dump

For belt-and-suspenders, configure a nightly pg_dump to S3 or similar.
Not set up currently; recommended before real-user launch.

---

## Error Monitoring (PL-005)

Sentry is integrated at `utils/errorTracker.js`. When `SENTRY_DSN` is set:
- Sentry initializes on server start.
- `Sentry.setupExpressErrorHandler(app)` captures all Express-level errors.
- `captureException` is called explicitly for `SequelizeDatabaseError` and generic 5xx responses in `middleware/errorHandler.js`.

### Sentry setup checklist

1. Create a project at https://sentry.io
2. Copy the DSN from Project Settings → Client Keys
3. Set `SENTRY_DSN=<dsn>` in Railway env
4. Create an alert rule: "First seen issue" → notify Slack channel `#uchqun-alerts`

### On-call runbook

When a Sentry alert fires:
1. Check the error stack trace in Sentry for the controller and line number.
2. Check Railway logs for context around the same timestamp.
3. If it is a DB error (`SequelizeDatabaseError`), check the Railway Postgres metrics.
4. If it is a 5xx in a child/parent endpoint, cross-reference the audit log for the affected school.

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
