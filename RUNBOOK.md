# Uchqun Platform — Runbook

## Services

| Service | URL | Platform |
|---------|-----|----------|
| Backend API | Railway (auto-deploy from `main`) | Railway |
| Admin dashboard | Netlify/Vercel | Static |
| Government dashboard | Netlify/Vercel | Static |
| Teacher/parent app | Netlify/Vercel | Static |
| Reception dashboard | Netlify/Vercel | Static |
| Database | Railway Postgres 15 | Railway |

## Common Operations

### Apply pending DB migrations

```bash
cd backend && npm run migrate
```

Migrations are idempotent — safe to re-run. Never use `FORCE_SYNC=true`.

### Roll back last migration

```bash
cd backend && npm run migrate:undo
```

### Check backend health

```
GET /api/health
```

Returns `{ status: "ok", timestamp: "..." }` when healthy.

### View structured logs

Backend logs in JSON to stdout. On Railway: open the service → Logs tab. Filter by `level: "error"` for issues.

## Incident Response

### 500 errors on login

Common causes:
1. Database connectivity — check `DATABASE_URL` env var in Railway
2. SSL cert issue in `database.js` — ensure `ssl: { rejectUnauthorized: false }` is set for Railway
3. JWT secret missing — check `ACCESS_TOKEN_SECRET` and `REFRESH_TOKEN_SECRET`

### File uploads failing in production

1. Check `APPWRITE_ENDPOINT`, `APPWRITE_PROJECT_ID`, `APPWRITE_API_KEY`, `APPWRITE_BUCKET_ID` are set
2. Verify Appwrite bucket permissions allow server-side uploads
3. Check backend logs for `Storage upload failed` errors

**Do not set `LOCAL_STORAGE_FALLBACK=true` in production** — Railway disk is ephemeral; files vanish on restart.

### Auth locked out / JTI revocation not working

If `REDIS_URL` is not set, login lockout and JTI revocation fall back to in-memory (single-instance only). For multi-instance Railway deploys, set `REDIS_URL` to a Redis instance.

### Socket.io not delivering real-time events

Socket.io is in-memory by default. If multiple backend instances are running, events only reach clients connected to the same instance. Solution: add Redis adapter via `REDIS_URL`.

### Reception user can't log in (403 or redirect loop)

Reception users require both `documentsApproved === true` and `isActive === true`. An admin must approve their documents:
- Admin dashboard → Reception Management → approve documents

## Database Access

The `postgres-uchqun` MCP server provides read-only access to the Railway database for debugging. Never run write queries through it.

Useful queries:

```sql
-- Check active users by role
SELECT role, COUNT(*) FROM "Users" GROUP BY role;

-- Check pending admin registration requests
SELECT id, email, status, "createdAt" FROM "AdminRegistrationRequests" WHERE status = 'pending';

-- Find orphaned children (no school assigned)
SELECT id, "firstName", "lastName", "parentId" FROM "Children" WHERE "schoolId" IS NULL;
```

## Environment Variables Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string (Railway internal) |
| `DATABASE_PUBLIC_URL` | Dev only | PostgreSQL public URL (for local dev tunneling) |
| `ACCESS_TOKEN_SECRET` | Yes | JWT access token signing secret |
| `REFRESH_TOKEN_SECRET` | Yes | JWT refresh token signing secret |
| `REDIS_URL` | Multi-instance | Redis for JTI revocation and login lockout |
| `APPWRITE_ENDPOINT` | Prod | Appwrite API endpoint |
| `APPWRITE_PROJECT_ID` | Prod | Appwrite project ID |
| `APPWRITE_API_KEY` | Prod | Appwrite server API key |
| `APPWRITE_BUCKET_ID` | Prod | Appwrite storage bucket ID |
| `LOCAL_STORAGE_FALLBACK` | Dev only | Set `=true` to enable local disk fallback (never in prod) |
| `NODE_ENV` | Yes | `production` or `development` |
| `MIGRATION_SECRET` | Yes | Secret for the `/api/migrate` trigger endpoint |
| `ADMIN_PANEL_URL` | Yes | URL of the admin dashboard (for set-password links) |
| `FORCE_SYNC` | **Never** | **Never set to `true` — drops all tables** |

## Pre-Launch Checklist

- [ ] C-07: Replace regex CORS with explicit env-driven allowlist
- [ ] C-02: Product/legal sign-off on group-wide media visibility
- [ ] `REDIS_URL` configured on Railway for multi-instance JTI revocation
- [ ] All `APPWRITE_*` vars confirmed in Railway production environment
- [ ] `LOCAL_STORAGE_FALLBACK` **not** set in production
- [ ] Railway deploy hook tested on a staging branch before main merge
