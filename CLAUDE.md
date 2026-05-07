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

## Testing Requirements
- New controllers MUST ship with tests in `backend/__tests__/controllers/`
- Backend: Jest, PostgreSQL 15 required
- Frontend: Vitest — CI fails if no test files in an app
- Run full suite before any PR

## Open Security Audit Findings
See `AUDIT_REPORT.md` for full context. **Confirm resolution status before touching related code:**
- C-01: Missing `emotionalMonitoringRoutes.js` (server crash on startup)
- C-02: Cross-parent media data leak (groupId scope bug)
- C-03: Mass assignment in `progressController.js`
- C-05: Activity scope bypass (teacher updating any activity)
- C-06: Payment callback signature validation missing
- C-07: CORS wildcard for Netlify/Vercel subdomains

## Scaling Constraints (single-instance only — TODO confirm)
- Login lockout is in-memory (5 attempts → 15min). Not Redis-backed.
- Socket.io is in-memory. Multi-instance deploy needs Redis adapter.

## Conventions
- PascalCase components, camelCase services/utils/routes/controllers
- Conventional commits: `feat(scope):`, `fix(scope):`, `chore(scope):`
- Pre-commit: Husky → lint-staged → ESLint auto-fix
- No Prettier configured — match surrounding style

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
