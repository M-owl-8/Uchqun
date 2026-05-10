# UCHQUN PLATFORM — MASTER DEVELOPMENT PLAN

**Status: ACTIVE** | Pivot to government-owned web platform | Updated: 2026-05-06

---

## SCOPE PIVOT (2026-05-06)

The platform is being transferred to government ownership. As a result:

- ✅ **Mobile app removed** — web-only going forward (Expo app + Expo push stack deleted)
- ✅ **Payments removed** — service is state-funded, no in-platform payment processing
- ✅ **Super-admin app removed** — features merged into the Government dashboard at `/government/platform`
- ✅ **Role hierarchy now:** Government > Business > Admin > Reception > Teacher > Parent (Government is the top role)
- ⏭ **Phase 6 (Flutter)** — cancelled
- ⏭ **Phase 7** — narrowed to web-only QA + beta

---

## PHASES OVERVIEW

| Phase | Focus | Status |
|-------|-------|--------|
| 1 — Remove Mobile | Clean repo | ✅ Completed (re-done after Expo rebuild attempt) |
| 2 — Backend | Security + stability | In progress |
| 3 — Database | Data integrity | In progress |
| 4 — Web Cleanup | Consistency + safety | In progress |
| 5 — Ultimate Web | Features + polish | Pending |
| 6 — Flutter | Mobile rebuild | ❌ Cancelled |
| 7 — QA + Beta | Ship readiness | Pending |

---

## PHASE 1 — REMOVE MOBILE APP

**Goal:** Clean slate. No dead weight.

- [x] Delete `mobile/` directory entirely
- [x] Remove mobile-related scripts from root `package.json` (none existed)
- [x] Backend push notification infrastructure (Expo) removed entirely (post-pivot)
- [x] Delete stale nested `uchqun/` directory (old project copy)
- [x] Delete superseded `AUDIT.md`
- [x] Update `CLAUDE.md` to reflect mobile removal
- [x] CI/CD already clean — no mobile steps existed
- [x] Commit: `chore(phase-1): remove mobile app and stale project copy`

---

## PHASE 2 — BACKEND CLEANUP

**Goal:** Secure, consistent, production-safe API.

### 2a — Critical Security Fixes
- [x] `middleware/csrf.js` — deleted (was dead code; server used Bearer token auth, not cookie sessions)
- [x] `routes/governmentRoutes.js` — replaced `===` with SHA256+`crypto.timingSafeEqual()`
- [x] `controllers/adminRegistrationController.js:135` — UUID-based upload filenames, strip original name
- [x] `controllers/authController.js:68-69` — unified error message for wrong email vs wrong password
- [x] `validators/governmentUserValidator.js`, `validators/teacherValidator.js` — raised password minimum to 8+ chars with complexity
- [x] `utils/email.js` — replaced plaintext password with set-password link (`generateSetPasswordToken` 24h JWT)
- [x] `config/database.js:23,50` — set `rejectUnauthorized: true` in production SSL

### 2b — Auth & Session
- [x] JWT token blacklist/revocation on logout — RefreshToken DB table, rotate on refresh, revoke all on logout
- [x] `middleware/auth.js` — added `isActive` check for all non-parent, non-government roles
- [x] `middleware/schoolScope.js:44-46` — enforced strict schoolId, removed null bypass for legacy users
- [x] Account lockout — in-memory per-account after 5 failures, 15-min window (`authController.js`); comment documents Redis upgrade path for multi-instance

### 2c — Input Validation & Sanitization
- [x] `middleware/validation.js:14-19` — removed `value` field from validation error responses (was leaking user input)
- [x] `validators/childValidator.js` — all required fields already had `notEmpty()`; tightened phone to E.164 format
- [x] Telegram username format validation (`/^[a-zA-Z0-9_]{5,32}$/`) added in `adminRegistrationController.js`
- [x] Phone number validation — practical E.164 with `customSanitizer` strip + `/^\+?[1-9]\d{6,14}$/` across all validators
- [x] Created `utils/queryValidator.js` — `parsePositiveInt`, `parsePage`, `parseLimit`, `parseOffset` — rejects Infinity/NaN/negatives

### 2d — Rate Limiting & DoS Protection
- [x] Applied `uploadLimiter` to `/admin-register` public endpoint
- [x] `apiLimiter` applied globally to all `/api/*` routes in `server.js`
- [x] Added `timeout: 5000` to all Telegram Axios calls; OpenAI/Appwrite clients handle timeouts internally

### 2e — Code Quality
- [x] Replaced all `console.log` with `logger.info/debug` across `server.js` and all touched files
- [x] `server.js` — added SIGTERM/SIGINT graceful shutdown handlers with 30s force-exit
- [x] `server.js` — migration race documented; migrations run after listen (acceptable — DB not ready at bind)
- [x] `server.js` — cleaned CORS origins list, removed dead Railway URL, deduplicated with Set
- [x] Standardized `success: false` on all error responses — `errorHandler.js`, `notFound`, `authController.js`, `adminRegistrationController.js`
- [x] Sentry initialized in `errorTracker.js` (conditional on `SENTRY_DSN`); `captureException` wired to `errorHandler.js` for DB and 5xx errors
- [x] Created `backend/.env.example` with all required variables documented
- [x] Added `"engines": { "node": ">=20.0.0", "npm": ">=9.0.0" }` to `backend/package.json`
- [x] Added `eslint-plugin-security` to devDependencies and configured in `.eslintrc.cjs`
- [x] Removed `// TODO: Implement subscription model` dead comment in `businessController.js`
- [x] `controllers/authController.js` — replaced dynamic `await import('bcryptjs')` with static import
- [x] `backend/.eslintrc.cjs` — changed `no-console: off` → `no-console: warn` (allows warn/error)

### 2f — Dockerfile & CI/CD
- [x] `backend/Dockerfile` — upgraded `node:18-alpine` → `node:20-alpine`
- [x] Added `HEALTHCHECK` directive to Dockerfile (wget /health, 30s interval)
- [x] Created `backend/.dockerignore`
- [x] `docker-compose.yml` — all DB credentials use `${VAR:?error}` env var syntax; no hardcoded values
- [x] `.github/workflows/ci.yml` — JWT secrets use `${{ secrets.CI_JWT_SECRET || 'fallback-test-value' }}` pattern
- [x] Added deploy stage to CI pipeline — Railway (backend) + Netlify (5 frontends); gated on `main` push + secrets availability

---

## PHASE 3 — DATABASE CLEANUP

**Goal:** Enforced constraints, no orphaned data, no silent data loss.

### 3a — Critical Model Fixes
- [x] `models/index.js` — imported and registered `News` model; moved News associations here
- [x] `models/News.js` — associations moved to `index.js`; added `onDelete: RESTRICT` to `createdById`
- [x] `models/TeacherResource.js` — added `references` + `onDelete` to `teacherId` (CASCADE) and `schoolId` (SET NULL)
- [x] `models/ChatMessage.js` — added `references` + `onDelete: CASCADE` to `senderId`; added missing `conversationId` index
- [x] `models/ParentEvaluation.js` — added `references` + cascade rules to `parentId` (CASCADE), `teacherId` (SET NULL), `schoolId` (SET NULL)
- [x] `models/TeacherRating.js` — added `references` + `onDelete: CASCADE` to `teacherId` and `parentId`; added `paranoid: true`

### 3b — Foreign Key Cascade Audit
Add proper `onDelete`/`onUpdate` to every FK missing them:
- [x] `Activity.childId` → `CASCADE` + `paranoid: true`
- [x] `Meal.childId` → `CASCADE` + `paranoid: true`
- [x] `Media.childId` → `CASCADE`, `Media.activityId` → `SET NULL` + `paranoid: true`; added missing `activityId` index
- [x] `Progress.childId` → `CASCADE`
- [x] `SchoolRating.schoolId` → `CASCADE`, `SchoolRating.parentId` → `CASCADE` + `paranoid: true`
- [x] `SuperAdminMessage.senderId` → `SET NULL`; `allowNull` changed to `true` (migration alters column + FK)
- [x] `RefreshToken.userId` → `CASCADE`; replaced `console.error` with `logger.error`
- [x] `Therapy.createdBy` → `SET NULL` + `paranoid: true`
- [x] `TherapyUsage.therapyId` → `CASCADE`, `TherapyUsage.childId` → `CASCADE`, `TherapyUsage.parentId` → `RESTRICT`, `TherapyUsage.teacherId` → `SET NULL` + `paranoid: true`

### 3c — Soft Delete (Paranoid)
Add `paranoid: true` + `deletedAt` migration to:
- [x] `Activity`, `Meal`, `Media`, `Payment` — `paranoid: true` added
- [x] `Therapy`, `TherapyUsage`, `ServicePlan`, `MealPlan` — `paranoid: true` added
- [x] `TeacherRating`, `SchoolRating` — `paranoid: true` added

### 3d — Indexes & Constraints
- [x] Fixed table name: `teacher_work_histories` → `teacher_work_history` in FK indexes migration
- [x] `Progress.childId` unique already present; `Payment.transactionId` unique already present — confirmed correct
- [x] Added missing `activityId` index on `media` table; existing indexes verified for all other FKs

### 3e — Scopes
- [x] Added named scopes on `User`: `active`, `bySchool`, `teachers`, `parents` (named rather than default to preserve login lookup semantics)
- [x] Added school-scoped named scopes: `Child.bySchool`, `Activity.bySchool/byChild`, `Meal.bySchool/byChild`, `Media.bySchool/byChild`
- [x] Associations reorganized in `index.js`; school/role filtering via named scopes rather than default association scopes (safer — avoids breaking existing queries)

---

## PHASE 4 — WEB APP CLEANUP

**Goal:** Consistent, secure, maintainable dashboards. No console.logs, no dead code, no duplicates.

### 4a — Shared Code First
- [x] `shared/services/api.js` — implement token refresh mutex (fix race condition)
- [x] `shared/services/api.js` — add `timeout: 30000` to axios instance
- [x] `shared/services/api.js` — add AbortController / request cancellation support
- [x] `shared/services/api.js` — replace `window.location.href = '/login'` with router callback
- [x] `shared/context/AuthContext.jsx` — validate token expiry on app load (call `/auth/me`)
- [x] `shared/context/AuthContext.jsx` — wrap all `localStorage.getItem/JSON.parse` in try-catch
- [x] `shared/components/ErrorBoundary.jsx` — add Sentry error reporting
- [x] `shared/context/NotificationContext.jsx` — store notification items array, not just count
- [x] `shared/context/createAuthContext.jsx` — remove 3× hardcoded production Railway URL
- [x] Create `shared/utils/imageUrl.js` — centralize avatar/media URL construction
- [x] Create `shared/hooks/useAsync.js` — standardize loading/error/data pattern

### 4b — All 5 Apps: Common Fixes
- [x] Remove all `console.log/error` in production code (30+ teacher, 27+ reception, etc.)
- [x] Add `<NotFound />` page and wire wildcard route in all 5 `App.jsx` files
- [x] Add per-page error boundaries
- [x] Add debounce on all form submit handlers
- [x] Standardize i18next version → `^23.10.1` across all apps
- [x] Standardize jsdom version → `^27.4.0` across all apps
- [x] Add `VITE_API_URL` validation at build time (fail build if missing)

### 4c — App-Specific Fixes

**government dashboard:**
- [x] Break `SuperAdmin.jsx` (1,724 lines, 78 state vars) into 6 separate page components
- [x] Add pagination to all admin/school/message list endpoints
- [x] Password creation: add strength rules + confirmation field
- [x] Remove plaintext generated password from UI — email only

**admin:**
- [x] Remove `console.log('Sending form data:')` and all sensitive logs
- [x] Add proper email/phone/required validation to `ParentManagement.jsx`, `ChildManagement.jsx`
- [x] Fix manual axios resolution in `vite.config.js`

**reception:**
- [x] File upload: add MIME type + size validation before submitting
- [x] Replace `window.confirm()` with proper modal dialogs
- [x] Wrap `JSON.parse` in `dataStore.js` with try-catch
- [x] Remove `medicalDiagnosis` from localStorage — fetch from API only

**teacher:**
- [x] Fix dual auth context architecture (merge shared + parent contexts)
- [x] Extract duplicate URL construction to `shared/utils/imageUrl.js`
- [x] Fix socket reconnection debouncing
- [x] Add retry on failed chat message delivery

**government:**
- [x] Validate `:id` route param in `AdminDetails.jsx`
- [x] Replace hardcoded Uzbek error string in `Login.jsx:28` with i18n key
- [x] Use `Promise.allSettled` instead of `Promise.all` in Dashboard data load
- [x] Fix `I18nextProvider` wrapping order in `App.jsx`

---

## PHASE 5 — ULTIMATE WEB APP VERSION

**Goal:** Feature-complete, polished, production-grade dashboards.

*(Scope to be defined collaboratively before starting this phase)*

- [ ] Full i18n audit — all strings externalized, Uzbek/Russian/English parity across all 5 apps
- [ ] Unified design system — shared Tailwind config, token-based colors, no hardcoded hex
- [ ] Code splitting + lazy loading for all routes
- [ ] Skeleton screens replacing spinners
- [ ] Offline-aware UI (stale indicators, retry buttons)
- [ ] Accessibility audit (ARIA labels, keyboard nav, contrast ratios)
- [ ] Performance audit (bundle size, image optimization, API call deduplication)
- [ ] Full Vitest component test coverage (target 80%+)
- [ ] E2E tests with Playwright for critical user flows
- [ ] Lock and document final API contracts (response shapes, error codes)

---

## PHASE 7 — FINAL CLEANUP, TESTING & BETA

**Goal:** Ship-ready.

- [ ] Full backend test coverage audit — target 80%
- [ ] Write tests for all previously untested routes
- [ ] Add error-case tests to all existing test files
- [ ] End-to-end integration tests (backend + frontend)
- [ ] Security penetration test (re-run full audit checklist)
- [ ] Load test backend (k6 or Artillery)
- [ ] Beta deployment — real users, monitored environment
- [ ] Sentry dashboards live, alerts configured
- [ ] Performance baselines established
- [ ] Documentation complete (API docs, deployment runbook)
- [ ] Final sign-off → production launch
