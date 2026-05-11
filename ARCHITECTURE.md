# Uchqun Platform — Architecture

## Overview

Uchqun is a government web platform for special education school management in Uzbekistan. It is a monorepo containing one Express backend and four React frontends served at separate subdomains/ports.

## Repository Structure

```
Uchqun/
├── backend/           Express API (Node.js, ES Modules)
├── admin/             Admin dashboard (React + Vite, port 5175)
├── government/        Government dashboard (React + Vite, port 5173)
├── teacher/           Teacher + parent app (React + Vite, port 5174)
├── reception/         Reception dashboard (React + Vite, port 5177)
└── shared/            Shared React components, contexts, and services
```

## Role Hierarchy

```
Government → Business → Admin → Reception → Teacher → Parent
```

Each role has a scoped dashboard. Reception creates parents. Teachers are assigned to parents. Admins manage receptions. Government views analytics.

## Backend

### Stack
- **Runtime:** Node.js (ES Modules — `import`/`export` only, no `require()`)
- **Framework:** Express 4
- **ORM:** Sequelize 6 with PostgreSQL 15
- **Auth:** JWT (15-minute access token, 7-day refresh token, both HTTP-only cookies)
- **Storage:** Appwrite (production); local disk fallback only in non-production when `LOCAL_STORAGE_FALLBACK=true`
- **Sockets:** Socket.io (in-memory; needs Redis adapter for multi-instance)
- **Logging:** Winston (structured JSON, PII-redacted)
- **Login lockout + JTI revocation:** Redis-backed when `REDIS_URL` is set; in-memory fallback for single-instance dev

### Middleware Chain

Every authenticated route runs this chain in order:

```
authenticate → requireRole(...) → schoolScope → controller
```

`authenticate` — verifies JWT, attaches `req.user`  
`requireRole` — checks `req.user.role` against allowed list  
`schoolScope` — adds `req.user.schoolId` filter context  
Reception additionally requires `documentsApproved && isActive`

`requireTeacher` allows roles `['teacher', 'reception', 'admin']` — intentional: reception and admin can access teacher-scoped resources.

### Route Prefixes

All routes are under `/api/`. Key prefixes:

| Prefix | Roles |
|--------|-------|
| `/api/auth/` | Public (login, refresh, register) |
| `/api/parent/` | Parent |
| `/api/teacher/` | Teacher, reception, admin |
| `/api/reception/` | Reception |
| `/api/admin/` | Admin |
| `/api/government/` | Government |

### Database Models (key relationships)

```
User (role: government|business|admin|reception|teacher|parent)
  └── createdBy → User (who created this account)
  └── teacherId → User (parent's assigned teacher)
  └── groupId  → Group

Child
  └── parentId → User (parent)
  └── schoolId → School (FK; nullable = intake/pre-assignment)
  └── groupId  → Group

School
  └── type: 'preschool' | 'school' | 'both'

Group
  └── teacherId → User (teacher)
  └── schoolId  → School

Media / Activity / ParentMeal / ParentActivity / Progress
  └── childId  → Child
  └── parentId → User (parent)
```

### School Scope Isolation

`validateChildAccess(childId, req)` in `backend/utils/schoolValidation.js` is the canonical gatekeeper for cross-school access. All write operations on child-scoped resources must call it.

Children with `schoolId === null` are intake-status: only the child's own parent and government users may access them.

### Migrations

Custom migration runner at `backend/migrate.js`. All migration files use idempotent guards (check column existence before adding). Never use `FORCE_SYNC=true` — it drops all tables.

```bash
cd backend && npm run migrate        # apply pending
cd backend && npm run migrate:undo   # revert last
```

## Frontend Apps

All four apps share:
- `shared/services/api.js` — Axios instance with cookie-based auth, 401 refresh with mutex, FormData detection
- `shared/components/` — Card, LoadingSpinner, ConfirmDialog, Toast, ErrorBoundary
- `shared/context/createAuthContext.jsx` — auth context factory (each app passes its own `tokenKey` and `requiredRole`)
- `shared/context/ToastContext.jsx` — toast notification context

Each app has per-locale i18n files at `src/locales/{en,uz,ru}/common.json` loaded via `react-i18next`.

### Parent App

The parent-facing UI lives inside the `teacher/` app at `teacher/src/parent/`. Parents access it via the teacher app URL. The `teacher/src/App.jsx` renders different routes based on `user.role`.

## Deployment

- **Backend:** Railway (auto-deploy on `main` push via `.github/workflows/railway-deploy.yml`)
- **Frontends:** Netlify / Vercel (separate deploys per app)
- **Database:** Railway-managed PostgreSQL 15
- **Local dev:** `docker-compose up` for Postgres

## Security Notes

- CORS is currently regex-based (C-07 — pre-launch TODO: replace with explicit env-driven allowlist)
- Group-wide media visibility is by design (C-02 — requires product/legal sign-off before launch)
- `REDIS_URL` must be set in Railway for multi-instance login lockout and JTI revocation
- Socket.io requires Redis adapter for multi-instance
