# Phase 00 — Discovery & Inventory

**Generated:** 2026-05-07  
**Auditor:** Claude Code (claude-sonnet-4-6)  
**Audit mode:** READ ONLY — no project files were modified.

---

## Executive Summary

- The Uchqun platform is a **Node.js + Express backend** plus **four React/Vite frontends** in a monorepo — web-only since a scope pivot on 2026-05-06.
- An additional **shared library** (`shared/`) supplies components, contexts, hooks, and the Axios API service to all frontends — but each app also maintains local copies of many of those same components, creating significant duplication.
- The **teacher app is a dual-app**: it hosts both the Teacher UI (`/teacher/*`) and the Parent UI (`/`) inside a single Vite project and deployment.
- Three structural decisions are confirmed as **partially or fully executed**: mobile removal (table dropped, directory absent), payment removal (table dropped, `paymentController.js`/`paymentRoutes.js` deleted), and super-admin → government merge (migration ran, separate app gone). However **significant code artifacts remain** for all three.
- The existing `AUDIT_REPORT.md` at repo root was generated **before the 2026-05-06 pivot** and references dozens of files, screens, and routes that no longer exist (mobile screens, `paymentController.js`, `super-admin/` app, `Payments.jsx`). It must not be used as ground truth for this engagement.
- `nixpacks.toml` specifies `nodejs-18_x` while the entire project requires `>=20.0.0` — a deployment mismatch that may silently fail on Railway.
- **Total source files (excluding node_modules / .git / dist / build):** ~493 code files, ~644 total paths. Total JS/JSX LOC: ~60,000.

---

## Scope

**Inspected:** All project files excluding `node_modules/`, `.git/`, `dist/`, `build/`. This covers backend, four frontend apps, shared library, migrations, CI/CD, Docker config, scripts, docs.

**Not inspected in this phase:** Actual running database state, Railway project environment variables, Netlify/Vercel deployment configs (account-level), content of `docs/internal/PROJECT_GUIDE.md` (to be read in later phases as needed).

---

## 0.1 — Full Repository Tree (Annotated)

```
/c/work/Uchqun/                    ← monorepo root
├── .claude/                        ← Claude Code local settings (not audited)
├── .github/
│   └── workflows/
│       ├── ci.yml                  ← lint + security + test-backend + test-frontend + build
│       └── railway-deploy.yml      ← backend deploy to Railway on main push
├── .husky/
│   └── pre-commit                  ← runs "npx lint-staged" only
├── admin/                          ← Admin dashboard (port 5175)
│   ├── src/
│   │   ├── __tests__/              ← 3 test files
│   │   ├── components/             ← 11 components (local copies, many duplicated from shared/)
│   │   ├── context/                ← AuthContext.jsx, ToastContext.jsx
│   │   ├── locales/en,ru,uz/       ← i18n translations (in-src, not public/)
│   │   ├── pages/                  ← 13 pages
│   │   └── services/api.js         ← local API wrapper (thin layer over shared)
│   ├── netlify.toml                ← SPA redirect rules
│   ├── server.js                   ← Express static server for deployment
│   ├── vercel.json                 ← SPA redirect rules
│   ├── vite.config.js
│   └── package.json                ← name: "uchqun-admin"
├── backend/                        ← Express API (port 5000)
│   ├── __tests__/                  ← 47 test files (controllers, middleware, utils, integration)
│   ├── config/
│   │   ├── database.js             ← Sequelize init (supports DATABASE_URL or individual vars)
│   │   ├── env.js                  ← Joi env validation (exits on invalid)
│   │   ├── migrate.js              ← Migration runner
│   │   ├── socket.js               ← socket.io init
│   │   ├── storage.js              ← Appwrite storage
│   │   └── swagger.js              ← Swagger/OpenAPI spec builder
│   ├── controllers/                ← 37 controller files
│   │   ├── admin/                  ← 6 sub-controllers for admin role
│   │   └── parent/                 ← 8 sub-controllers for parent role
│   ├── middleware/                 ← 10 middleware files
│   ├── migrations/                 ← 37 migration files (see §0.6)
│   ├── models/                     ← 37 Sequelize models + index.js
│   ├── routes/                     ← 26 route files
│   ├── scripts/                    ← 15 utility scripts (seed, create-*, reset-*, etc.)
│   ├── utils/                      ← 8 utility modules
│   ├── validators/                 ← 11 validator files (express-validator + joi)
│   ├── .dockerignore
│   ├── .env.example (denied)       ← readable copy is env.example
│   ├── env.example                 ← full env var documentation
│   ├── Dockerfile                  ← node:20-alpine, 2-stage build
│   ├── jest.config.js
│   ├── nixpacks.toml               ← ⚠ specifies nodejs-18_x (project requires >=20)
│   ├── railway.toml                ← Railway deploy config
│   ├── server.js                   ← entry point
│   └── package.json                ← name: "uchqun-backend", type: "module"
├── docs/internal/
│   └── PROJECT_GUIDE.md            ← detailed architecture reference
├── government/                     ← Government dashboard (port 5173)
│   ├── src/
│   │   ├── __tests__/              ← 5 test files
│   │   ├── components/             ← 9 components (8 local, 1 tab subfolder with 5 components)
│   │   ├── context/                ← AuthContext.jsx, ToastContext.jsx
│   │   ├── locales/en,ru,uz/       ← in-src translations
│   │   ├── pages/                  ← 10 pages
│   │   └── services/api.js         ← local API wrapper
│   ├── netlify.toml
│   ├── server.js
│   ├── vercel.json
│   └── package.json                ← name: "uchqun-government"
├── reception/                      ← Reception dashboard (port 5177)
│   ├── src/
│   │   ├── __tests__/              ← 2 test files
│   │   ├── components/             ← 9 components (local)
│   │   ├── context/                ← AuthContext.jsx, ToastContext.jsx
│   │   ├── pages/                  ← 8 pages
│   │   └── services/
│   │       ├── api.js
│   │       └── dataStore.js        ← localStorage wrapper
│   ├── public/locales/en,ru,uz/    ← i18n in public/ (different from admin/government pattern)
│   ├── netlify.toml
│   ├── server.js
│   ├── vercel.json
│   └── package.json                ← name: "uchqun-reception"
├── shared/                         ← Shared library (NOT a published npm package — no package.json)
│   ├── components/                 ← 8 components
│   ├── context/                    ← 4 context files + createAuthContext.jsx
│   ├── hooks/                      ← useAsync.js, useDebounce.js
│   ├── locales/en.json             ← shared translation keys
│   ├── services/
│   │   ├── api.js                  ← primary Axios instance (token refresh mutex)
│   │   └── config.js               ← VITE_API_URL export
│   ├── tailwind.base.js            ← shared Tailwind config base
│   └── utils/imageUrl.js
├── teacher/                        ← Teacher + Parent UI combined (port 5174)
│   ├── src/
│   │   ├── __tests__/              ← 2 test files
│   │   ├── components/             ← 3 components (teacher layout)
│   │   ├── pages/                  ← 12 teacher pages
│   │   ├── parent/                 ← ⚠ full parallel app structure inside teacher:
│   │   │   ├── components/         ← 10 components (duplicated from shared/)
│   │   │   ├── context/            ← 4 contexts (duplicated from shared/)
│   │   │   ├── locales/en,ru,uz/   ← own translations
│   │   │   ├── pages/              ← 14 parent pages
│   │   │   └── services/api.js
│   │   └── shared/                 ← ⚠ third copy of shared utilities (inside teacher)
│   │       ├── components/         ← 11 components
│   │       ├── context/            ← 4 contexts
│   │       └── services/           ← api.js + chatStore.js
│   ├── public/                     ← locales/ + avatar images (.jfif, .png)
│   ├── netlify.toml
│   ├── server.js
│   ├── vercel.json
│   └── package.json                ← name: "uchqun-teacher-frontend" ⚠ (only app with "-frontend" suffix)
├── .dockerignore                   ← root level
├── .gitignore
├── AUDIT_REPORT.md                 ← ⚠ pre-pivot report; references removed code — do not use as truth
├── CLAUDE.md                       ← project instructions for Claude Code
├── README.md                       ← quick-start guide
├── docker-compose.yml              ← PostgreSQL 15 + backend container
├── package.json                    ← root (uchqun-platform); only husky + lint-staged
├── package-lock.json
├── plan.md                         ← master dev plan (pivot noted: 2026-05-06)
└── vercel.json                     ← root SPA config (potential conflict with app-level configs)
```

---

## 0.2 — Package Manifests

| Path | Name | Type | Package Manager |
|------|------|------|----------------|
| `package.json` | `uchqun-platform` | Root workspace coordinator | npm |
| `backend/package.json` | `uchqun-backend` | API server | npm |
| `admin/package.json` | `uchqun-admin` | Frontend SPA | npm |
| `teacher/package.json` | `uchqun-teacher-frontend` | Frontend SPA (dual-role) | npm |
| `reception/package.json` | `uchqun-reception` | Frontend SPA | npm |
| `government/package.json` | `uchqun-government` | Frontend SPA | npm |

**Note:** `shared/` has **no `package.json`**. It is consumed via relative-path imports (`../../shared/...`), not as an npm package. There is no workspace configuration (`npm workspaces`, `pnpm-workspace.yaml`, etc.) at the root — apps install their own dependencies independently.

---

## 0.3 — Service Map

| Service | Path | Port | Role | Audience |
|---------|------|------|------|---------|
| Backend API | `backend/` | 5000 | Express + Sequelize + Socket.io | All frontends |
| Government app | `government/` | 5173 | React + Vite SPA | `government` role users |
| Teacher/Parent app | `teacher/` | 5174 | React + Vite SPA (dual) | `teacher` + `parent` roles |
| Admin app | `admin/` | 5175 | React + Vite SPA | `admin` role users |
| Reception app | `reception/` | 5177 | React + Vite SPA | `reception` role users |
| PostgreSQL | Docker / Railway | 5432 | Relational DB | Backend only |

**Port 5176 is missing:** The role hierarchy has 5 web roles but only 4 frontend apps. The `business` role has no dedicated frontend — it is served via the government app or has no current UI (UNKNOWN — to be resolved in Phase 2/4).

---

## 0.4 — Language, Framework & Version Inventory

### Backend

| Item | Value |
|------|-------|
| Runtime | Node.js ≥ 20.0.0 (`.nvmrc` present: see below) |
| Module system | ES Modules (`"type": "module"`) |
| Framework | Express 4.18.2 |
| ORM | Sequelize 6.35.2 |
| Database | PostgreSQL 15 (pg 8.11.3) |
| Real-time | Socket.io 4.8.3 (in-memory, no Redis adapter) |
| Auth | JSON Web Tokens (jsonwebtoken 9.0.2) |
| Validation | express-validator 7.0.1 + joi 17.11.0 (both present simultaneously) |
| File storage | Appwrite 13.0.0 + multer 1.4.5 + sharp 0.33.0 |
| AI | OpenAI SDK 4.20.0 (via OpenRouter) |
| Logging | Winston 3.11.0 + Google Cloud Logging Winston 6.0.0 |
| Error tracking | Sentry @sentry/node 10.37.0 |
| Email | Nodemailer 7.0.12 |
| Messaging | Telegram Bot (via Axios) |
| Sanitization | sanitize-html 2.17.2 + dompurify 3.3.1 + jsdom 27.4.0 |
| Docs | swagger-jsdoc 6.2.8 + swagger-ui-express 5.0.1 |
| Test runner | Jest 30.2.0 |

**`.nvmrc` content:** Not read directly (in backend directory). Assumed to pin Node 20 based on `package.json` engines. To verify in Phase 2.

### Frontends (all 4 apps, identical stack)

| Item | Value |
|------|-------|
| Framework | React 18.2.0 |
| Build tool | Vite 5.0.8 |
| Styling | Tailwind CSS 3.3.6 |
| i18n | i18next 23.10.1 + react-i18next 13.5.0 |
| Icons | lucide-react 0.562.0 |
| HTTP client | Axios 1.13.x (via shared/services/api.js) |
| Routing | react-router-dom 6.20.1 |
| Test runner | Vitest 4.0.18 |
| Test utilities | @testing-library/react 16.3.2 + @testing-library/jest-dom 6.9.1 |

**Exception:** `teacher` app adds `socket.io-client 4.8.3` and `i18next-http-backend 2.5.2`. Reception also adds `i18next-http-backend`.

---

## 0.5 — Database Inventory

**Engine:** PostgreSQL 15 (docker-compose), Railway Postgres (production).

**Connection:** Supports `DATABASE_URL` / `DATABASE_PUBLIC_URL` (Railway format) or individual `DB_*` vars. SSL enabled only in production + when using a URL-style connection.

**ORM:** Sequelize 6.35.2 with explicit migrations (no `sync()` in production). Test DB: `uchqun_test` (SQLite3 in devDeps but not configured for tests — tests require real Postgres).

### 0.5a — Models (37 total, from `models/index.js`)

| Model | Table (inferred) | Notes |
|-------|-----------------|-------|
| User | users | Central identity; 6 roles |
| Child | children | Core entity; linked to parents, groups, schools |
| Group | groups | Teacher-managed; parents and children belong to groups |
| School | schools | Multi-tenant anchor |
| Activity | activities | Teacher records per child; paranoid |
| Meal | meals | Teacher records per child; paranoid |
| Media | media | Photo/video; linked to child + optional activity; paranoid |
| Progress | progress | One-per-child JSON blob |
| Document | documents | Reception document uploads for approval |
| Notification | notifications | Per-user + per-child |
| ChatMessage | chat_messages | Teacher↔parent messaging |
| RefreshToken | refresh_tokens | JWT refresh token revocation |
| EmotionalMonitoring | emotional_monitoring | Teacher journal per child |
| Therapy | therapies | Therapy types; paranoid |
| TherapyUsage | therapy_usages | Child therapy assignments; paranoid |
| AIWarning | ai_warnings | AI-generated alerts per school/parent |
| GovernmentStats | government_stats | Aggregated stats snapshots |
| BusinessStats | business_stats | Business-role stats |
| SchoolRating | school_ratings | Parent ratings of schools; paranoid |
| TeacherRating | teacher_ratings | Parent ratings of teachers; paranoid |
| SuperAdminMessage | super_admin_messages | Messages TO government (⚠ legacy name — table not renamed) |
| AdminRegistrationRequest | admin_registration_requests | Self-registration flow |
| ChildAssessment | child_assessments | Structured assessments per child |
| ServicePlan | service_plans | Individual education plans; paranoid |
| MealPlan | meal_plans | Dietary plans per child; paranoid |
| TeacherResource | teacher_resources | Materials uploaded by teachers |
| TeacherResponsibility | teacher_responsibilities | Free-text role items |
| TeacherTask | teacher_tasks | Task items per teacher |
| TeacherWorkHistory | teacher_work_history | Employment history |
| ParentActivity | parent_activities | Legacy: parent-submitted activity records |
| ParentMeal | parent_meals | Legacy: parent-submitted meal records |
| ParentMedia | parent_media | Legacy: parent-submitted media records |
| News | news | Platform news/announcements |
| ParentEvaluation | parent_evaluations | Parent evaluates teacher |
| BusinessStats | business_stats | Business-role statistics |
| GovernmentStats | government_stats | Government-level statistics snapshots |

**Orphan model risk:** `TeacherResponsibility`, `TeacherTask`, `TeacherWorkHistory` appear in models but have no explicit route files listed in `server.js`. Status of their routes is UNKNOWN — to be confirmed in Phase 2.

### 0.5b — Migration Chronology (37 files)

| Timestamp | File | Purpose |
|-----------|------|---------|
| 20240101 | initial-schema | users, children, activities, meals, media, progress |
| 20240102 | update-role-based-schema | Extended user/teacher/group tables |
| 20240103 | create-refresh-tokens | refresh_tokens table |
| 20250115 | add-telegram-username | telegram_username column on users |
| 20260108 | create-teacher-ratings | teacher_ratings table |
| 20260110 | create-chat-messages | chat_messages table |
| 20260111 | add-individual-plan-fields | Extended child/progress fields |
| 20260112 | create-super-admin-messages | super_admin_messages table ⚠ (legacy name) |
| 20260113 | create-admin-registration-requests | admin_registration_requests |
| 20260114 | update-admin-registration-requests | Schema update |
| 20260115 | create-emotional-monitoring | emotional_monitoring table |
| 20260116 | create-therapies | therapies + therapy_usages tables |
| 20260117 | add-government-business-roles | Added `government`, `business`, `reception` to enum |
| 20260117100000 | create-schools | schools table |
| 20260118 | create-payments | payments table (**CREATED then later dropped**) |
| 20260201 | add-rating-fields-to-users | rating columns on users |
| 20260202 | add-numeric-rating-to-school-ratings | numeric rating columns |
| 20260203 | make-stars-required-in-school-ratings | stars NOT NULL constraint |
| 20260204 | create-school-ratings | school_ratings table |
| 20260205 | add-evaluation-to-school-ratings | evaluation JSONB column |
| 20260330 | add-missing-fk-indexes | FK indexes (**uses snake_case — may target wrong columns**) |
| 20260330 | add-soft-deletes | deletedAt column additions |
| 20260401 | expand-child-profile | Extended child columns |
| 20260401-001 | create-child-assessments | child_assessments table |
| 20260401-002 | create-service-plans | service_plans table |
| 20260401-003 | create-meal-plans | meal_plans table |
| 20260401-010 | add-school-id-to-users-groups | schoolId on users and groups |
| 20260401-011 | add-school-id-to-registration-requests | schoolId on admin_registration_requests |
| 20260402 | create-teacher-resources | teacher_resources table |
| 20260422 | create-parent-evaluations | parent_evaluations table |
| 20260423 | avatar-text-column | avatar → TEXT column type |
| **20260506** | add-cascade-rules | Proper ON DELETE rules across FKs (**includes payments FK — payments table still existed**) |
| **20260506-001** | add-extended-soft-deletes | More deletedAt columns |
| **20260506100000** | drop-push-notifications | Drops push_notifications table + all ENUMs ← **mobile removal** |
| **20260506110000** | drop-payments | Drops payments table + all ENUMs ← **payment removal** |
| **20260506120000** | promote-super-admin-to-government | Promotes super-admin user to `government` role |
| **20260506130000** | add-camel-case-fk-indexes | Corrective camelCase FK indexes |

**Ordering gap:** Migration `20260506000000-add-cascade-rules.js` (line 50–52) still adds FK rules for the `payments` table **before** `20260506110000-drop-payments.js` drops it. This is safe if migrations run in sequence, but means the cascade migration references a table that is then deleted later.

---

## 0.6 — CI/CD & Deployment

### CI Pipeline (`.github/workflows/ci.yml`)

| Job | Trigger | Description |
|-----|---------|-------------|
| `lint` | push/PR to main | ESLint on backend only |
| `security` | push/PR to main | `npm audit --audit-level=high` on backend + all 4 frontends |
| `test-backend` | push/PR to main | Jest tests against real Postgres 15 |
| `test-frontend` | push/PR to main | Vitest per app (matrix: admin, teacher, reception, government) |
| `build` | push/PR to main (after all above) | `vite build` per app |

**Gaps in CI:**
- No lint job for frontends (only backend is linted in CI)
- No type-check step (TypeScript types are in devDependencies but code is plain JS)
- No SAST / secret-scanning step
- CI JWT secrets fall back to public known values if repo secrets not set ([ci.yml:68-69])

### Deployment

| Target | Method | Notes |
|--------|--------|-------|
| Backend | Railway (auto-deploy on main push) | `railway.toml` configures start/health |
| Frontends | Netlify or Vercel (manual) | Each app has both `netlify.toml` and `vercel.json` |

**`nixpacks.toml` version mismatch:** `backend/nixpacks.toml:2` specifies `nodejs-18_x`. All `package.json` files require `node: >=20.0.0`. If Railway uses `nixpacks.toml` as the build config, the backend builds and runs on Node 18, which is below the stated requirement. `railway.toml` does not specify a Node version. This is a production risk.

---

## 0.7 — External Services & Env Vars

### Required Environment Variables

| Variable | Description | Validation |
|----------|-------------|-----------|
| `JWT_SECRET` | Access token signing key | Required, min 32 chars |
| `JWT_REFRESH_SECRET` | Refresh token signing key | Required, min 32 chars, must differ from JWT_SECRET |
| `FRONTEND_URL` | Allowed CORS origins (comma-separated URLs) | Required |
| `DATABASE_URL` or (`DB_NAME` + `DB_USER` + `DB_PASSWORD`) | DB connection | Mutually exclusive set |

### Optional External Services

| Service | Variables | Current Use |
|---------|-----------|-------------|
| OpenAI / OpenRouter | `OPENAI_API_KEY`, `OPENAI_MODEL`, `OPENAI_BASE_URL` | AI chat feature (`parentAIController.js`) |
| Appwrite | `APPWRITE_ENDPOINT`, `APPWRITE_PROJECT_ID`, `APPWRITE_API_KEY`, `APPWRITE_BUCKET_ID` | Media/file storage |
| Google Cloud Storage | `GCP_PROJECT_ID`, `GCS_BUCKET_NAME` | Alternative to Appwrite (optional) |
| Google Cloud Logging | `GCP_PROJECT_ID` | Production Winston log sink |
| Sentry | `SENTRY_DSN` | Error tracking |
| Telegram | `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHANNEL_ID` | Admin notifications |
| Redis | `REDIS_URL` | Documented as optional; login lockout and Socket.io are **in-memory only** |
| Railway | `RAILWAY_TOKEN` | Used only in deploy workflow |

### Deprecated Variables Still in `env.example`

| Variable | Reason Deprecated |
|----------|-----------------|
| `PAYME_MERCHANT_ID`, `PAYME_MERCHANT_KEY`, `PAYME_TEST_MODE` | Payments removed (migration 20260506110000) |
| `CLICK_MERCHANT_ID`, `CLICK_SERVICE_ID`, `CLICK_SECRET_KEY`, `CLICK_MERCHANT_USER_ID` | Payments removed |

These env vars appear in `backend/env.example` but have no corresponding code paths in the current backend (the payment controller and routes were deleted). The `env.js` validator does not validate or require them (uses `Joi.unknown()` passthrough), so they cause no startup error but are misleading.

---

## 0.8 — Naming & Brand Identifiers (Master List)

| Identifier | Context | Value(s) |
|------------|---------|---------|
| Platform name | Everywhere | **Uchqun** |
| Root package | `package.json` | `uchqun-platform` |
| Backend package | `backend/package.json` | `uchqun-backend` |
| Admin package | `admin/package.json` | `uchqun-admin` |
| Teacher package | `teacher/package.json` | `uchqun-teacher-frontend` ⚠ inconsistent `-frontend` suffix |
| Reception package | `reception/package.json` | `uchqun-reception` |
| Government package | `government/package.json` | `uchqun-government` |
| Docker user | `backend/Dockerfile:5` | `uchqun` |
| Docker DB name | `docker-compose.yml:9` | `uchqun` (default) |
| CI test DB | `ci.yml:66` | `uchqun_test` |
| Backend service ID | `server.js:62` | `uchqun-backend` |
| Logger service name | `utils/logger.js:129` | `uchqun-backend` |
| Production domain | `server.js:84-85` | `uchqunedu.uz` / `www.uchqunedu.uz` |
| Vercel deployment | `server.js:83` | `uchqun-platform.vercel.app` |
| Netlify — Reception | `server.js:86` | `uchqun-reception.netlify.app` |
| Netlify — Admin | `server.js:87` | `uchqun-admin.netlify.app` |
| Netlify — Teacher | `server.js:88` | `uchqun-teacher.netlify.app` |
| Netlify — Government | `server.js:89` | `uchqun-government.netlify.app` |
| Legacy model name | `models/SuperAdminMessage.js` | `SuperAdminMessage` ⚠ references defunct role |
| Legacy table name | migrations | `super_admin_messages` ⚠ references defunct role |
| Legacy route alias | `admin/adminRoutes.js:46` | `/message-to-super-admin` ⚠ backward-compat alias |
| Legacy validator file | `validators/superAdminValidator.js` | Name references defunct role |
| Legacy controller file | `controllers/superAdminController.js` | Name references defunct role |
| Legacy CORS check | `server.js:109` | regex `uchqun-[a-z-]+` (good — explicit pattern) |

**Identity conclusion:** The platform name "Uchqun" is consistent everywhere. The primary inconsistency is the persistence of "super-admin" and "superAdmin" in file names, model names, and table names despite the role being merged into "government". This is a Phase 6 audit target.

---

## 0.9 — Repo Size & Code Metrics

| Metric | Value |
|--------|-------|
| Total paths (excl. node_modules/.git/dist/build) | ~644 |
| Total JS/JSX source files | ~493 |
| Total JS/JSX lines of code | ~60,000 |
| Backend controller lines | ~13,033 (37 files) |
| Backend migration lines | ~3,429 (37 files) |
| Backend test files | 47 |
| Frontend test files | 11 (3 admin, 5 government, 2 reception, 2 teacher) |
| Model files | 37 |
| Route files | 26 |
| Middleware files | 10 |
| Migration files | 37 |
| Script files | 15 |
| i18n locale sets | 4 apps × 3 languages = 12 locale files (plus shared) |
| Markdown docs | 5 files |

**Largest controller files:**

| File | Lines |
|------|-------|
| `receptionController.js` | 1,152 |
| `parent/parentRatingController.js` | 930 |
| `mediaController.js` | 913 |
| `governmentController.js` | 869 |
| `teacherController.js` | 763 |
| `admin/adminStatsController.js` | 665 |
| `therapyController.js` | 610 |

---

## 0.10 — Three Structural Decisions: Current State

### Mobile App Removal (Phase 9 audit target)

| Aspect | Status |
|--------|--------|
| Mobile app directory (`mobile/`) | ✅ **Absent** — removed |
| Expo / React Native dependencies | ✅ **Absent** from all package.json |
| Push notification infrastructure | ✅ Dropped via migration `20260506100000` — `push_notifications` table and all related ENUMs deleted |
| FCM/APNS tokens | UNKNOWN — columns may exist on `users` table (to verify in Phase 3) |
| Mobile-only backend routes | UNKNOWN — no `mobile/` route prefix found in `server.js`, but some endpoints may have been mobile-targeted (to map in Phase 9) |
| CI mobile build/test step | ✅ Never existed — no step to remove |
| Shared code used by mobile | UNKNOWN — `shared/` folder references may have served mobile; some hooks (`useAsync`, `useDebounce`) are generic |
| `plan.md` declaration | ✅ Phase 1 marked "Completed" |

### Payment System Removal (Phase 10 audit target)

| Aspect | Status |
|--------|--------|
| `paymentController.js` | ✅ **Absent** — confirmed deleted per CLAUDE.md (C-06 fix) |
| `paymentRoutes.js` | ✅ **Absent** — not in server.js imports |
| `payments` DB table | ✅ Dropped via migration `20260506110000` |
| Payment ENUMs (`enum_payments_*`) | ✅ Dropped in same migration |
| Payment model (`Payment.js`) | UNKNOWN — no `Payment` model file exists in `models/`, model was listed with `paranoid: true` in plan.md phase 3c |
| Payme/Click env vars in `env.example` | ⚠ **Still present** — `PAYME_*` and `CLICK_*` vars documented but serve no code path |
| Payment-related tests | UNKNOWN — search needed in Phase 10 |
| UI payment pages | UNKNOWN — `admin/src/pages/` contains no `PaymentManagement.jsx` visible in current tree |
| `plan.md` declaration | ✅ Phase scope pivot marked complete |

### Super-Admin → Government Merge (Phase 6 audit target)

| Aspect | Status |
|--------|--------|
| Separate super-admin app | ✅ **Absent** — no `super-admin/` directory |
| Migration: promote user to government | ✅ Migration `20260506120000` runs UPDATE on users |
| `superAdminController.js` | ⚠ **Still present** — repurposed for messaging but name misleads |
| `superAdminValidator.js` | ⚠ **Still present** — used by governmentRoutes.js |
| `SuperAdminMessage` model | ⚠ **Still present** — table is `super_admin_messages`, message direction is "to government" |
| `super_admin_messages` DB table | ⚠ **Still present** — not renamed |
| Backward-compat alias route | ⚠ **Still present** — `adminRoutes.js:46` `/message-to-super-admin` redirects to same handler |
| `requireGovernment` middleware | ✅ Correct — uses `role === 'government'` |
| `plan.md` declaration | ✅ Marked complete, but artifacts remain |

---

## Issues Catalog (Phase 0)

| ID | Location | Description | Severity | Confidence |
|----|----------|-------------|----------|------------|
| 00-001 | `backend/nixpacks.toml:2` | Specifies `nodejs-18_x` but project engines require `>=20.0.0` — potential Railway build on wrong Node version | high | 95% |
| 00-002 | `teacher/package.json:2` | Name `uchqun-teacher-frontend` has `-frontend` suffix; all other apps omit it | low | 100% |
| 00-003 | `backend/env.example` | Payme and Click env vars documented but dead (payment system removed) | medium | 100% |
| 00-004 | `backend/models/SuperAdminMessage.js`, `migrations/20260112*` | Model/table named `SuperAdminMessage`/`super_admin_messages` — legacy name for "messages to government"; not renamed after role merge | medium | 100% |
| 00-005 | `backend/controllers/superAdminController.js` | Filename references defunct `superAdmin` role — contains government-facing messaging logic | low | 100% |
| 00-006 | `backend/validators/superAdminValidator.js` | Filename references defunct `superAdmin` role | low | 100% |
| 00-007 | `backend/routes/adminRoutes.js:46` | Route alias `/message-to-super-admin` — legacy path kept for "backward-compatible" clients; references defunct role in URL | low | 100% |
| 00-008 | `shared/` | No `package.json` — consumed via relative path imports only; cannot be versioned or published independently; changes propagate inconsistently since apps maintain local copies | medium | 100% |
| 00-009 | `teacher/src/shared/` + `teacher/src/parent/` | Teacher app contains **three layers** of shared code: `teacher/src/shared/`, `teacher/src/parent/`, and imports from root `shared/` — same components exist in all three | high | 100% |
| 00-010 | `reception/public/locales/` vs `admin/src/locales/` | Reception puts locale files in `public/` (HTTP-served); admin/government/teacher put them in `src/` (bundled). Inconsistent i18n loading patterns. | medium | 100% |
| 00-011 | `AUDIT_REPORT.md` | Existing audit report references pre-pivot code (mobile, payments, super-admin app). Not updated to reflect current state. Risk of stale guidance being followed. | medium | 100% |
| 00-012 | `backend/migrations/20260506000000-add-cascade-rules.js:50-52` | Adds FK constraints to `payments` table in same migration batch that drops `payments` three files later. If run as a unit in one batch, the `payments` table exists at time of cascade migration. Safe but architecturally odd. | low | 90% |
| 00-013 | `vercel.json` (root) | Root-level Vercel SPA config may conflict with or override per-app `vercel.json` files | low | 70% |
| 00-014 | `backend/routes/migrationRoutes.js` | `/api/migrations/run` endpoint is publicly reachable (no `authenticate` middleware before the secret check). Secret check uses `timingSafeEqual` (correct), but any HTTP client can attempt it. | medium | 100% |

---

## Metrics Scorecard

| Metric | Score | Justification |
|--------|-------|--------------|
| Messiness | 55% | (1) Three layers of duplicated shared code in the teacher app alone; (2) super-admin naming artifacts scattered across 5+ files despite the role being gone |
| Technical Debt | 48% | (1) `nixpacks.toml` pins Node 18 while codebase requires Node 20; (2) deprecated payment env vars remain documented in `env.example`; (3) shared library has no package.json making version tracking impossible |
| Health | 70% | (1) CI pipeline exists and covers backend tests + frontend builds; (2) Docker multi-stage build with HEALTHCHECK and non-root user; (3) Sequelize migrations properly sequenced |
| Coherence | 60% | (1) Reception uses `public/locales/` while others use `src/locales/` — different i18n loading strategies; (2) teacher package name has `-frontend` suffix others lack |
| Documentation Coverage | 65% | (1) `CLAUDE.md` and `README.md` are present and up-to-date; (2) `AUDIT_REPORT.md` is dangerously stale — pre-pivot, references removed code, risk of misleading developers |
| Test Coverage (estimated) | 30% | (1) Backend has 47 test files covering controllers and middleware; (2) Frontend has only 11 test files total for 4 apps, covering auth and basic utils only — no component or page tests |
| Risk-on-Touch | 65% | (1) Teacher app dual-app architecture means touching any shared context risks both teacher and parent flows; (2) `models/index.js` defines all associations — one bad change breaks the entire ORM layer |

---

## Open Questions for the User

1. **`business` role frontend:** No dedicated frontend app exists for the `business` role. Do business users log into the government app, or is there a planned dedicated app? Is the `business` role currently in active use?

2. **`nixpacks.toml` Node version:** Is Railway actually using `nixpacks.toml` as the build manifest, or has it been superseded by `railway.toml`? Should `nixpacks.toml` be deleted or updated to Node 20?

3. **`vercel.json` at repo root:** Is this intentionally there for deploying the monorepo root to Vercel, or is it a leftover that should be deleted?

4. **Teacher app dual-app architecture:** Was the decision to host the parent UI inside the teacher app intentional (same domain/deployment), or is it a transitional arrangement pending extraction to a separate app?

5. **`shared/` as non-package:** Was there ever a plan to make `shared/` a proper npm workspace package? The current relative-path import approach means changes in `shared/` are not automatically picked up by apps that maintain local copies.

6. **`TherapyManagement.jsx`** appears in both `admin/src/pages/` and `teacher/src/pages/`. Are these the same feature or different functionality? Only one was visible in the admin app pages listing — needs verification.

7. **AUDIT_REPORT.md:** Should this file be archived, deleted, or replaced by the current audit? It currently sits at repo root where developers will likely read it, despite referencing removed code.

---

## What I Did NOT Look At

- Content of `docs/internal/PROJECT_GUIDE.md` (will be referenced in later phases as needed)
- Actual running database schema (Railway Postgres) — to be queried via `postgres-uchqun` MCP in Phase 3
- Contents of individual locale JSON files
- Detailed contents of test files
- Backend config files beyond `database.js`, `env.js`, `socket.js` basics
- All 37 migration files in detail (only representative ones were read)
- Individual model files beyond the associations in `index.js`
- All 26 route files in detail
- All 37 controller files in detail
- All 15 backend scripts
- Frontend page/component internals (to be covered in Phases 4–5)
