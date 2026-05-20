# Uchqun Platform

Government web platform for special education school management in Uzbekistan.
Monorepo: 1 Express backend + 4 React dashboards. Active dev, Phase 2–4 of 7.

> **Detailed reference:** see `docs/internal/PROJECT_GUIDE.md` for full architecture, model schemas, and historical context. This file is the operating manual.

## Critical Rules
- Always work on `main` branch (or feature branches off main)
- Never set `FORCE_SYNC=true` — drops all tables
- Never commit `.env` files or seed data with real PII
- All routes prefixed `/api/`; all frontend HTTP via `shared/services/api.js` (Axios, `withCredentials: true`)
- ES Modules only in backend (`import`/`export`) — no `require()`
- Sequelize migrations only — never sync schema in production

## Role Hierarchy
Government > Business > Admin > Reception > Teacher > Parent

## Ports
Backend 5000 · Government 5173 · Teacher 5174 · Admin 5175 · Reception 5177

## Commands
```bash
# Backend (cd backend)
npm run dev | npm test | npm run lint | npm run migrate | npm run migrate:undo

# Frontend (cd admin|teacher|reception|government)
npm run dev | npm test | npm run lint | npm run build

# Single test file
npm test -- path/to/file.test.js
```

## Auth Flow
JWT: 15m access (HTTP-only cookie) + 7d refresh. Middleware order:
`authenticate → requireRole(...) → schoolScope → controller`.
Reception additionally requires `documentsApproved && isActive`.
`requireTeacher` allows roles `['teacher', 'reception', 'admin']` — intentional: reception and admin can view teacher-scoped resources.

**Parent `isActive` bypass (intentional):** `middleware/auth.js:95` skips the `isActive: false` check for `role === 'parent'`. This is safe because no endpoint exists to set `isActive = false` for a parent — only paranoid-delete is available. If a future feature adds parent suspension, the bypass MUST be removed at the same time. See `LOOP_QUESTIONS.md` LQ-001.

## Testing Requirements
- New controllers MUST ship with tests in `backend/__tests__/controllers/`
- Backend: Jest, PostgreSQL 15 required
- Frontend: Vitest — CI fails if no test files in an app
- Run full suite before any PR
- Error-path fixes MUST include a test that triggers the failure (mock the DB method to throw) and asserts the HTTP status is non-200. A catch-block fix is unverified without a test that exercises that path.
- When a controller has nested try/catch blocks, ALL catch branches must return error-appropriate HTTP status codes. Fixing only the outermost catch does not protect inner-catch silent-failure paths — read the full function before closing an error-handling finding.

## Security Audit Status
- ✅ C-01: Resolved — emotionalMonitoring consumed inline in parent/teacher routes (commit c1bd08d)
- ⚠️ C-02: Documented as intentional design ("group-wide media visibility") — REQUIRES product/legal sign-off before launch (commits 9b2994c, 2ef0c4d)
- ✅ C-03: Resolved — ALLOWED_FIELDS whitelist in progressController (commit 9b2994c)
- ✅ C-05: Resolved — ALLOWED_ACTIVITY_FIELDS + schoolId guard in activityController (commits 9b2994c, 10df6d0)
- ✅ C-06: Resolved — payment routes/controller deleted entirely (commit ca2039b)
- ⚠️ C-07: Partial — regex replaces substring CORS check; PRE-LAUNCH TODO: replace with explicit env-driven allowlist (commit c1bd08d)

## Credential Reset (admin/government accounts)
If admin or government passwords need resetting, deploy a one-off migration:
- Pre-compute bcrypt hash locally: `node -e "import('bcryptjs').then(b=>b.default.hash('NewPass@2026',10).then(console.log))"`
- Add a migration UPDATE (see `backend/migrations/20260514000001-reset-admin-gov-passwords.js` as template)
- Push to main; Railway will run it on next deploy via `npm run start:migrate`
- Login lockout keys are `lockout:attempts:<email>` and `lockout:locked:<email>` in Redis (or in-memory). Unlock via `POST /api/v1/auth/unlock-account { email }` (government or admin role required), or wait 15 min, or `redis-cli DEL lockout:locked:<email> lockout:attempts:<email>`.

## Scaling Constraints
- Login lockout + JTI revocation: Redis-backed when `REDIS_URL` is set; falls back to
  in-memory when unset (single-instance only). Set `REDIS_URL` in Railway for multi-instance.
- Socket.io is in-memory. Multi-instance deploy needs Redis adapter.

## Conventions
- PascalCase components, camelCase services/utils/routes/controllers
- Conventional commits: `feat(scope):`, `fix(scope):`, `chore(scope):`
- Pre-commit: Husky → lint-staged → ESLint auto-fix
- No Prettier configured — match surrounding style

### Response shape standard (BACKEND-012)
**New endpoints** MUST use `{ success: true, data: <payload> }` for success and `{ success: false, error: '<message>' }` for errors. **Existing endpoints** that return bare objects are grandfather-claused until a dedicated migration sprint coordinates changes across all frontends. Do NOT silently change an existing endpoint's shape — it will break the consuming UI.

## Deployment
- Backend → Railway (auto-deploy on `main` push via `.github/workflows/railway-deploy.yml`)
- Frontends → Netlify / Vercel
- Local DB: `docker-compose up`

## When Touching Sensitive Areas
Use plan mode (Shift+Tab twice) before any changes to:
- `middleware/auth.js`, `middleware/security.js`
- Anything in `controllers/admin/` or `controllers/parent/`
- Migrations
- `routes/` index or CORS config
- Payment, media upload, or scope-checking logic

### Child-scoped resource access pattern (mandatory)
Any endpoint that reads, writes, or deletes a child-scoped resource (Activity, Meal, Media, TherapyUsage) MUST call `validateChildAccess(childId, req)` (or `findChildScopedResource(Model, id, req)` from `utils/schoolValidation.js`) for authorization AFTER the initial PK lookup. A role check alone is not sufficient — tenant isolation requires the school-scope check.

```js
// Correct pattern for mutations:
const result = await findChildScopedResource(Model, id, req);
if (!result) return res.status(404).json({ error: 'Not found' });
const { resource, child } = result;

// Correct pattern for list endpoints (admin/reception path):
if (req.user.schoolId) {
  const schoolChildren = await Child.findAll({ where: { schoolId: req.user.schoolId }, attributes: ['id'] });
  where.childId = { [Op.in]: schoolChildren.map(c => c.id) };
}
```

## Audit Log Conventions

The `audit_log` table is provably append-only via three independent layers:

**Layer 1 — Static model overrides** (`models/AuditLog.js`):
`AuditLog.update` and `AuditLog.destroy` are overridden to throw `Error('audit_log is immutable')`.
These block bulk update/delete operations via Sequelize's static API.

**Layer 2 — Instance method overrides** (`models/AuditLog.js`):
`AuditLog.prototype.update` and `AuditLog.prototype.destroy` are overridden to throw the same error.
`AuditLog.prototype.save` throws for existing records (`isNewRecord === false`); allows initial inserts
(`isNewRecord === true`) by calling through to the captured `_originalSave`. This blocks post-insert
field mutation via `instance.save()`.

**Layer 3 — DB-level REVOKE** (migration `20260520100000-audit-log-revoke-mutations.js`):
`REVOKE UPDATE, DELETE ON audit_log FROM PUBLIC` blocks any direct SQL mutation attempt.
Note: the Railway Postgres superuser (`postgres`) is not affected by `REVOKE FROM PUBLIC` — the model
layers are the primary guard for the application process. The REVOKE protects against other DB roles.

**Writing audit entries:** always use `logAudit()` from `utils/auditLogger.js`. Never call
`AuditLog.create()` directly from controllers. The helper swallows all errors — audit failures must
never cascade to feature failures.

**Destroy calls on paranoid models** should pass `{ actorId, actorRole, reason }` in options:
```js
await child.destroy({ actorId: req.user.id, actorRole: req.user.role, reason: 'admin_request' });
```
Calls without these still succeed; the audit row has `actorId: null` (acceptable for system actions).
Currently only `Child` has an `afterDestroy` audit hook. Other paranoid models get hooks in T2-5.

## MCP Servers Available
This project has three MCP servers configured (see ~/.claude.json):
- **context7** — live library docs. Workflow: call `resolve-library-id` first, then `query-docs` (NOT `get-library-docs` — that name is outdated).
- **github** — repo M-owl-8/Uchqun, read-only on contents, read+write on issues/PRs.
- **postgres-uchqun** — Railway DB, READ-ONLY (restricted mode). Use for schema inspection, debugging queries, NEVER for migrations. Tools: list_schemas, list_objects, get_object_details, explain_query, execute_sql (SELECT only).

When debugging a Sequelize query or model relationship, query the live schema via postgres-uchqun BEFORE assuming.
