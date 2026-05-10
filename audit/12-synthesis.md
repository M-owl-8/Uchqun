# Phase 12 — Synthesis & Sanity Roadmap
## Full-platform audit summary across all 11 prior phases

> Audit only — no modifications to project files.
> This document aggregates findings from phases 00–11 into a single prioritized view.

---

## Platform Scorecard

| Phase | Topic | Score |
|-------|-------|-------|
| 01 | Naming & Identity | 46/100 |
| 02 | Backend API & Middleware | 53/100 |
| 03 | Database & Migrations | 46/100 |
| 04 | Teacher/Parent Web App | 37/100 |
| 05 | Admin / Reception / Government Apps | 47/100 |
| 06 | Role Merge (`super_admin` → `government`) | 46/100 |
| 07 | Design System | 38/100 |
| 08 | AI Service | 41/100 |
| 09 | Mobile App Removal | 41/100 |
| 10 | Payment System Removal | 68/100 |
| 11 | Cross-Cutting (CI, security, deps) | 56/100 |
| **Platform Overall** | | **47/100** |

The payment removal (Phase 10) is the cleanest piece of work in the codebase. Every other phase scored below 60. The user-facing teacher/parent app (Phase 04) and design system (Phase 07) are the weakest areas — both below 40.

---

## Issue Totals by Phase

| Phase | CRITICAL | HIGH | MEDIUM | LOW | Total |
|-------|----------|------|--------|-----|-------|
| 01 — Naming | 0 | 3 | 7 | 10 | 20 |
| 02 — Backend | 0 | 4 | 4 | 6 | 14 |
| 03 — Database | 0 | 5 | 10 | 3 | 18 |
| 04 — Teacher/Parent App | 1 | 5 | 6 | 3 | 15 |
| 05 — Agent Web Apps | 1 | 4 | 8 | 3 | 16 |
| 06 — Role Merge | 0 | 1 | 4 | 2 | 7 |
| 07 — Design System | 0 | 3 | 8 | 2 | 13 |
| 08 — AI Service | 0 | 3 | 5 | 2 | 10 |
| 09 — Mobile Removal | 0 | 3 | 4 | 3 | 10 |
| 10 — Payment Removal | 0 | 0 | 1 | 1 | 2 |
| 11 — Cross-Cutting | 0 | 2 | 5 | 4 | 11 |
| **TOTAL** | **2** | **33** | **62** | **39** | **136** |

136 distinct issues across the platform. Two CRITICAL, 33 HIGH, 62 MEDIUM, 39 LOW.

---

## The Eight Systemic Themes

These themes cut across multiple phases. Fixing by module produces diminishing returns — these are platform-level problems requiring platform-level solutions.

---

### Theme A — The `super_admin` Ghost (50+ locations, 9 phases)

The `super_admin` → `government` migration ran on 2026-05-06. The DB schema is clean. Nothing that authenticates users or gates access uses `super_admin`. But the naming debt is enormous:

- **Model file**: `SuperAdminMessage.js`, class name, table `super_admin_messages`
- **Controller**: `superAdminController.js`
- **Validator**: `superAdminValidator.js`
- **4 function names**: `updateGovernmentBySuper`, `deleteGovernmentBySuper`, etc.
- **5 dead route aliases**: `POST /api/*/message-to-super-admin` in all 5 role route files
- **i18n namespace**: `superAdmin.*` throughout 6 government tab components + shared/locales
- **i18n key names**: `contactSuperAdmin`, `superAdminReply`, `sendToSuperAdmin` in admin, reception, teacher locales
- **User-facing notifications**: Telegram and email still say "super-admin tomonidan" to real admins
- **Env vars**: `SUPER_ADMIN_SECRET_KEY`, `SUPER_ADMIN_EMAIL` in env.example
- **Tests**: One test asserts `getRoleLabel('super-admin')` — role string doesn't exist in the DB ENUM

This is a multi-day renaming project. The most disruptive part is the `SuperAdminMessage` model + table rename (requires a migration) and the government i18n namespace change (requires updating 6 tab component files atomically).

---

### Theme B — Polling Everywhere / Socket.io Never Used

Socket.io is initialized with JWT auth, per-user socket tracking, and an `emitToUser()` helper. It has zero call sites in production code. Every real-time feature compensates with `setInterval(load, 5000)` polling:

| Location | What polls | Per-interval cost |
|----------|-----------|-------------------|
| `teacher/src/components/Sidebar.jsx:38` | Unread count for all parents | 1 + N API calls (N = parent count) |
| `teacher/src/parent/components/Sidebar.jsx:58` | Unread count for parent's chat | 200-message fetch |
| `teacher/src/pages/Chat.jsx:56` | Chat messages | 1 API call |
| `teacher/src/parent/pages/Chat.jsx:36` | Chat messages | 1 API call |
| `teacher/src/parent/context/NotificationContext.jsx` | Notification count | 1 API call |

The teacher sidebar (Issue 08-001) is the most urgent: for a teacher with 20 parents, 21 API calls fire every 5 seconds — that is 252 requests/minute against a rate limit of 100/15min. This pattern will trigger the global rate limiter within minutes of any teacher logging in under real load.

The fix is one architectural decision: wire `emitToUser()` to the `ChatMessage` creation event in `chatController.js`. All polling loops become event listeners overnight.

---

### Theme C — i18n Swiss Cheese

i18n is configured for three languages (uz/ru/en). The actual coverage is far below what the locale file structure implies:

| Surface | State |
|---------|-------|
| `teacher/src/parent/pages/Help.jsx` | 100% hardcoded English; `+1 (555) 123-4567`; `support@uchqunplatform.com` |
| `teacher/src/parent/pages/ChildProfile.jsx` | 9 monitoring labels hardcoded in Cyrillic |
| `admin/src/components/MessageModal.jsx` | All strings hardcoded Uzbek |
| `admin/src/locales/en/common.json` | English strings contain Uzbek words ("davlat") |
| `reception/src/pages/Settings.jsx` | 3 strings hardcoded Uzbek |
| `admin/src/pages/UsersStats.jsx` | All labels hardcoded English |
| `government/src/locales/*/common.json` | `superAdmin` namespace key (wrong name, correct values) |
| `shared/locales/` | English only — no Uzbek or Russian in shared layer |
| `shared/components/OfflineBanner.jsx`, `ErrorBoundary.jsx`, `BottomNav.jsx` | English strings only |
| `government/src/components/tabs/*` | All calls to `t('superAdmin.*')` — namespace wrong |

The platform's primary users are Uzbek-speaking parents and teachers in Uzbekistan. Several high-visibility pages (Help, some Settings sections) are English-only or carry US placeholder contact info.

---

### Theme D — Native Browser Dialogs in a Designed App

`alert()` and `window.confirm()` are used for error feedback and destructive action confirmation in at least 10 locations across 4 apps:

| Location | Usage |
|----------|-------|
| `teacher/src/parent/pages/AIWarnings.jsx:46` | `alert()` on resolve error |
| `teacher/src/parent/pages/Therapy.jsx:59` | `alert()` on therapy start error |
| `teacher/src/pages/MonitoringJournal.jsx:159` | `confirm()` before delete |
| `teacher/src/pages/TherapyManagement.jsx:214` | `confirm()` before delete |
| `reception/src/pages/TeacherManagement.jsx:119` | `window.confirm()` before delete |
| `reception/src/pages/GroupManagement.jsx:83` | `window.confirm()` before delete |
| `government/src/pages/Platform.jsx:184,249,260` | `window.confirm()` for 3 destructive actions |

All apps have a `useToast()` hook. `reception/src/pages/ParentManagement.jsx` already uses a custom `confirmDialog` state correctly. The fix exists in the codebase — it just hasn't been applied everywhere.

---

### Theme E — Test Coverage Desert

The platform has 50+ backend test files and meaningful government frontend tests. Everything else has near-zero coverage:

| Area | Test state |
|------|-----------|
| `teacher/src/parent/` (30+ files, 14 pages) | **Zero test files** |
| Teacher AI (`teacherController.js:668–762`) | Zero tests |
| AI warning controller | Zero tests |
| Admin pages (TeacherManagement, GroupManagement, ParentManagement) | Zero page/component tests |
| Reception pages | Zero page/component tests |
| `PUT /api/child/:id` (80-line inline route handler) | Zero tests |
| `GET /api/progress/` PUT | Zero tests |

The gap is not random — it correlates exactly with the areas that have the most functional bugs: admin `showToast` undefined, teacher notification stub at 3, AI warning resolve button always 403. Every one of those would have been caught by a basic render test.

CI has no test coverage threshold. It only requires that test files exist — not that they cover anything meaningful. A two-line test file per app satisfies the CI gate.

---

### Theme F — Duplicate Infrastructure (Contexts, Components)

`ToastContext.jsx` has 6 separate file instances across the monorepo. `AuthContext.jsx` has 5. `Toast.jsx` has 4 (positioned at different `top-*` values). The teacher app's `src/shared/` directory is a shadow copy of `shared/` that duplicates maintenance effort and means any bug fixed in the shared ToastContext must be manually applied to the teacher-local and parent-local copies too.

The root cause: each frontend was built by copying rather than importing from `@shared`. The `api.js` service is the one exception — it correctly uses `createApi()` from the shared library. The pattern exists; it was just not consistently applied.

---

### Theme G — Deployment and Configuration Risks

Three infrastructure issues that can cause silent failures in production:

**1. nixpacks.toml specifies Node 18** ([`backend/nixpacks.toml`](backend/nixpacks.toml)) — Railway deploys the backend on Node 18 (EOL April 2025) while CI tests on Node 20. The `engines.node` field in both `package.json` files says `>=20.0.0`. This is a one-line fix.

**2. Documents written to `os.tmpdir()`** ([`backend/controllers/receptionController.js:52`](backend/controllers/receptionController.js#L52)) — Reception uploads approval documents to a temporary filesystem path. Container restarts (every deploy) wipe the directory. All uploaded documents become 404 after each Railway deploy.

**3. JWT_EXPIRE defaults to 30d** ([`backend/config/env.js:47`](backend/config/env.js#L47)) — If `JWT_EXPIRE` is not explicitly set in production `.env`, access tokens expire after 30 days, not 15 minutes. This nullifies the short-lived token security model and the purpose of refresh token rotation.

---

### Theme H — Security Defense Gaps

| Gap | Location | Risk |
|-----|----------|------|
| 13 route groups have no input validators | admin, reception, teacher, parent routes + 9 more | Malformed input reaches Sequelize directly |
| No per-user rate limit on AI endpoints | `/api/parent/ai/chat`, `/api/teacher/ai/chat` | Unbounded token spend from a single account |
| User.findByPk on every authenticated request | `middleware/auth.js:18` | N+1 DB hit per API call; no JWT claim caching |
| Socket.io CORS does not include all frontend ports | `config/socket.js:14` | Socket connections from some frontends may be rejected |
| `errorLogger` never registered | `server.js` | Correlation IDs absent from error logs |
| CORS allowlist still regex-based, not env-driven | `server.js:109` | CLAUDE.md PRE-LAUNCH TODO — not yet env-configurable |

---

## Launch Blockers

These issues must be resolved before any real user accesses the platform. Each one is either a data-loss risk, a broken-for-users experience, or a documented PRE-LAUNCH requirement:

| # | Issue | Phase | Impact |
|---|-------|-------|--------|
| L-01 | `nixpacks.toml` deploys Node 18 — project requires ≥20, Node 18 is EOL | 00, 11 | Silent runtime failures possible; CI/prod split |
| L-02 | Documents stored in `os.tmpdir()` — wiped on every Railway deploy | 02 | Reception document uploads permanently lost on each deploy |
| L-03 | `JWT_EXPIRE` default is `30d` — should be `15m` per auth design | 08, 11 | Access tokens live 30 days if env not set; refresh rotation is security theatre |
| L-04 | Help page shows `+1 (555) 123-4567` and `support@uchqunplatform.com` to parents | 01, 04, 09 | Parents in Uzbekistan given inaccessible/fake US contact info |
| L-05 | Teacher sidebar N+1 polling triggers rate limit with 20+ parents | 04, 08 | Teachers silently locked out of chat badge within minutes |
| L-06 | CORS still regex-based rather than env-driven allowlist | 11 | CLAUDE.md PRE-LAUNCH TODO — must be confirmed complete before launch |
| L-07 | No `.env.example` — required variables undiscoverable without reading source | 11 | Deployment risk; new developers misconfigure |
| L-08 | `showToast` undefined in 3 admin pages — error feedback silently broken | 05 | Admins receive zero feedback on API failures, including delete errors |
| L-09 | AI Warning "Resolve" button always returns 403 for parents | 09 | Parent-facing error via `alert()` on every click |
| L-10 | `errorLogger` not registered — correlation IDs absent from error logs | 02, 11 | Incident response relies on raw stdout with no request attribution |

---

## Prioritized Remediation Roadmap

### Sprint 1 — One Week After Launch Blockers

| Issue | Phase | Effort |
|-------|-------|--------|
| Teacher `NotificationContext` always returns 3 | 04 | Small |
| `<a href>` nav in teacher Dashboard + Layout → `<Link>` | 04 | Small |
| `window.confirm()` → custom dialog in reception + government | 05, 07 | Medium |
| `alert()` → `useToast()` in parent portal pages | 04, 09 | Small |
| Government mobile navigation (`BottomNav` missing below 1024px) | 07 | Small |
| Input validators on admin/reception routes (account creation) | 11 | Medium |
| `refreshToken.tokenHash` index missing — full table scan on auth | 03 | Small (migration) |
| AI endpoints: add per-user rate limit | 08 | Small |
| Socket.io: wire `emitToUser` to ChatMessage creation | 08 | Medium |

### Quarter 1 — Technical Debt Sprint

| Area | Issues | Effort |
|------|--------|--------|
| super_admin complete rename | 01, 06 | Large (multi-file, DB migration) |
| Avatar → Appwrite migration | 02, 03 | Large |
| i18n audit — Help, ChildProfile, modals, shared components | 01, 04, 07 | Medium |
| Context deduplication — ToastContext to 1 instance | 07, 09, 11 | Medium |
| School scope: universal middleware enforcement | 03 | Medium |
| Test coverage: parent portal + AI endpoints | 04, 08 | Large |
| Parent portal: extract to own Vite app or document as intentional | 09 | Architecture decision |
| Dead code removal: `DecorativeBackground.jsx`, `dataStore.js`, `parent/Login.jsx` | 05, 07, 09 | Small |
| `jsdom` → devDependency; remove `dompurify` duplication | 11 | Small |
| Payment cascade migration: add try-catch for payments FK calls | 10 | Small |
| Child model: consolidate dual school/teacher string + FK fields | 03 | Medium (migration) |
| CI: add coverage threshold | 11 | Small |
| CLAUDE.md: document `isActive` bypass, `requireTeacher` allowing admin/reception, isTeacher=admin intent | 02, 06 | Small |

---

## What Is Genuinely Good

Not everything needs work. These design decisions are correct and should be preserved:

**Auth architecture**: JWT + HTTP-only cookies + refresh rotation + per-route role guards is correctly implemented. The `requireRole()` factory pattern is clean. Reception's `documentsApproved && isActive` double gate is a good real-world constraint.

**Rate limiting**: Four-tier rate limiting (global/auth/password-reset/upload) with appropriate production limits. The auth limiter skips successful requests — correct behavior.

**Helmet + HSTS + CORS**: Security headers are properly configured. HSTS has a 1-year max-age with `preload`. CORS uses regex matching, not substring checks. `sanitizeBody` is globally applied before all routes.

**Payment removal**: The cleanest structural change in the codebase. Model, routes, controllers all gone. Drop migration removes the table and all 4 ENUMs. Government regression test explicitly blocks `/payments` calls.

**api.js centralization**: Despite widespread context duplication, the Axios factory with refresh token interceptor is correctly shared. All 5 consuming apps use `createApi()` from `@shared/services/api`. One mutex, one refresh implementation.

**Government test suite**: 17 meaningful tests including accessibility cases and explicit regression guards for removed features (`/super-admin/*`, `/payments`). This is the standard all apps should reach.

**`ChildContext`**: The parent portal's `ChildContext` is well-designed — fetches children from `/child`, persists `selectedChildId` in localStorage, provides a `loadChildren()` refresh method. Right level of abstraction.

**PII redaction in logger**: Winston scrubs `password`, `token`, `authorization`, and `email` fields before they reach log storage. Correct privacy control.

**Fail-fast env validation**: The Joi schema in `env.js` hard-crashes the server on missing or invalid required configuration. JWT secret minimum lengths are enforced. `JWT_SECRET` and `JWT_REFRESH_SECRET` must differ.

**`ProtectedRoute` role guards**: Both `requireRole='parent'` and `requireRole='teacher'` correctly check role before rendering, preventing cross-role access in the dual-SPA architecture.

---

## Open Decisions Required from Product/Tech Lead

These issues cannot be resolved by code changes alone — they need product or architectural decisions first:

1. **Canonical domain**: Is `uchqunedu.uz` the definitive production domain? Affects Help page, all email templates, script defaults, CORS allowlist, and placeholder contacts.

2. **`support@uchqunplatform.com`**: Is this a real support mailbox? If not, what is the correct parent-facing support contact for the Help page?

3. **Parent portal architecture**: Should the parent portal remain embedded in the teacher Vite bundle, or be extracted to its own `parent/` app (matching the pattern of `admin/`, `reception/`, `government/`)? Extraction eliminates namespace collision, ToastContext nesting, and shared-login ambiguity, but is a significant project.

4. **`super_admin_messages` table rename**: Renaming to `government_messages` requires an `ALTER TABLE` migration with live data. Is this acceptable to schedule?

5. **`isTeacher` including admin role** (`shared/context/AuthContext.jsx:62`): Is this intentional — do admins need access to teacher-only UI? Or is it a leftover that should be restricted?

6. **Socket.io vs REST**: Is real-time chat a requirement (implying Socket.io wiring), or is 5-second polling acceptable latency for the current user base size?

7. **AI Warnings for parents**: Should `AIWarnings.jsx` be routed and shown to parents (requiring the resolve button to be hidden or the endpoint permission to be changed), or should the page be deleted?

8. **Document storage**: Should reception approval documents be migrated to Appwrite (resolving the ephemeral temp path issue), or is there a different intended storage mechanism?

---

## Summary

The platform is structurally sound at the foundation: auth is correct, the DB schema is relational and normalized at the core, and the security middleware chain is well-ordered. The main problems are in the layers above: presentation consistency, test coverage, i18n completeness, and the incomplete execution of three structural changes (super_admin rename, parent portal architecture, and the teacher-app dual-SPA decision).

The 10 launch blockers above are the honest pre-launch checklist. The rest is technical debt that can be addressed in Q1 without affecting production stability.

**136 issues: 2 CRITICAL · 33 HIGH · 62 MEDIUM · 39 LOW**
