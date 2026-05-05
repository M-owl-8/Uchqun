# UCHQUN PLATFORM — MASTER DEVELOPMENT PLAN

**Status: LOCKED** | Based on 309-issue audit across 878 files | Date: 2026-05-05

---

## PHASES OVERVIEW

| Phase | Focus | Blocker For |
|-------|-------|-------------|
| 1 — Remove Mobile | Clean repo | Nothing blocked |
| 2 — Backend | Security + stability | Everything |
| 3 — Database | Data integrity | Phase 5 features |
| 4 — Web Cleanup | Consistency + safety | Phase 5 |
| 5 — Ultimate Web | Features + polish | Phase 6 (API contracts) |
| 6 — Flutter | Mobile rebuild | Phase 7 |
| 7 — QA + Beta | Ship readiness | Launch |

---

## PHASE 1 — REMOVE MOBILE APP

**Goal:** Clean slate. No dead weight.

- [x] Delete `mobile/` directory entirely
- [x] Remove mobile-related scripts from root `package.json` (none existed)
- [x] Backend push notification infrastructure kept (dormant until Flutter Phase 6)
- [x] Delete stale nested `uchqun/` directory (old project copy)
- [x] Delete superseded `AUDIT.md`
- [x] Update `CLAUDE.md` to reflect mobile removal
- [x] CI/CD already clean — no mobile steps existed
- [x] Commit: `chore(phase-1): remove mobile app and stale project copy`

---

## PHASE 2 — BACKEND CLEANUP

**Goal:** Secure, consistent, production-safe API.

### 2a — Critical Security Fixes
- [ ] `middleware/csrf.js` — fix multipart/form-data CSRF bypass
- [ ] `routes/superAdminRoutes.js:28,65,98` — replace `===` with `crypto.timingSafeEqual()`
- [ ] `controllers/adminRegistrationController.js:135` — UUID-based upload filenames, strip original name
- [ ] `controllers/authController.js:68-69` — unify error message for wrong email vs wrong password
- [ ] `validators/superAdminValidator.js`, `validators/teacherValidator.js` — raise password minimum to 8+ chars with complexity
- [ ] `utils/email.js:135-147` — replace plaintext password emails with time-limited reset links
- [ ] `config/database.js:23,50` — set `rejectUnauthorized: true` in production SSL
- [ ] `middleware/csrf.js` — set `httpOnly` flag on CSRF cookie

### 2b — Auth & Session
- [ ] Implement JWT token blacklist/revocation on logout (Redis or DB table)
- [ ] Add `isActive` check in `middleware/auth.js` for all non-parent roles
- [ ] `middleware/schoolScope.js:44-46` — enforce strict schoolId, remove null bypass for legacy users
- [ ] Add account lockout after 5 failed login attempts

### 2c — Input Validation & Sanitization
- [ ] `middleware/validation.js:14-19` — remove `value` field from validation error responses
- [ ] `validators/childValidator.js` — add `notEmpty()` to all required string fields
- [ ] Add Telegram username format validation (`/^[a-zA-Z0-9_]{5,32}$/`)
- [ ] Phone number validation → E.164 format
- [ ] `utils/queryValidator.js:11-19` — enforce strict int range, reject Infinity

### 2d — Rate Limiting & DoS Protection
- [ ] Apply `uploadLimiter` to `/admin-register` public endpoint
- [ ] Apply `apiLimiter` to all GET endpoints (currently unprotected)
- [ ] Add `timeout: 5000` to all external Axios calls (Telegram, OpenAI, Appwrite)

### 2e — Code Quality
- [ ] Replace all `console.log` with `logger.info/debug` (12+ files)
- [ ] `server.js` — add SIGTERM/SIGINT graceful shutdown handlers
- [ ] `server.js` — block startup until migrations complete (remove background async race)
- [ ] `server.js` — clean up hardcoded CORS origins list, remove dead Railway URL
- [ ] Standardize all API response shapes to `{ success, data, error }`
- [ ] Initialize Sentry error tracking (installed but never initialized)
- [ ] Create `backend/.env.example` with all required variables documented
- [ ] Add `"engines": { "node": ">=20.0.0" }` to `backend/package.json`
- [ ] Add ESLint security plugin (`eslint-plugin-security`)
- [ ] Remove `// TODO: Implement subscription model` dead comment in `businessController.js`

### 2f — Dockerfile & CI/CD
- [ ] `backend/Dockerfile:2` — upgrade `node:18-alpine` → `node:20-alpine`
- [ ] Add `HEALTHCHECK` directive to Dockerfile
- [ ] Create `backend/.dockerignore`
- [ ] `docker-compose.yml` — move hardcoded credentials to `.env` with `${VAR:?error}` syntax
- [ ] Remove hardcoded JWT secrets from `.github/workflows/ci.yml` → GitHub Secrets
- [ ] Add deploy stage to CI pipeline (Railway backend + Netlify frontends)

---

## PHASE 3 — DATABASE CLEANUP

**Goal:** Enforced constraints, no orphaned data, no silent data loss.

### 3a — Critical Model Fixes
- [ ] `models/index.js` — import and register `News` model
- [ ] `models/News.js` — move associations into `index.js`
- [ ] `models/TeacherResource.js` — add explicit `field:` snake_case mappings or align migration
- [ ] `models/ChatMessage.js` — add `references:` block to `senderId`
- [ ] `models/ParentEvaluation.js` — add `references:` blocks to `parentId`, `teacherId`, `schoolId`
- [ ] `models/TeacherRating.js` — add `references:` blocks to `teacherId`, `parentId`

### 3b — Foreign Key Cascade Audit
Add proper `onDelete`/`onUpdate` to every FK missing them:
- [ ] `Activity.childId` → `CASCADE`
- [ ] `Meal.childId` → `CASCADE`
- [ ] `Media.childId`, `Media.activityId` → `CASCADE` / `SET NULL`
- [ ] `Progress.childId` → `CASCADE`
- [ ] `SchoolRating.schoolId`, `SchoolRating.parentId` → `CASCADE`
- [ ] `SuperAdminMessage.senderId` → `SET NULL`
- [ ] `PushNotification.userId` → `CASCADE`
- [ ] `Payment.parentId`, `Payment.childId`, `Payment.schoolId` → appropriate cascades
- [ ] `RefreshToken.userId` → `CASCADE`
- [ ] `Therapy.createdBy` → `SET NULL`
- [ ] `TherapyUsage` — all 4 FKs

### 3c — Soft Delete (Paranoid)
Add `paranoid: true` + `deletedAt` migration to:
- [ ] `Activity`, `Meal`, `Media`, `Payment`
- [ ] `Therapy`, `TherapyUsage`, `ServicePlan`, `MealPlan`
- [ ] `TeacherRating`, `SchoolRating`

### 3d — Indexes & Constraints
- [ ] Fix table name mismatch in `migrations/20260330000000-add-missing-fk-indexes.js:21` (`teacher_work_histories` vs `teacher_work_history`)
- [ ] Add missing unique constraints at model level: `Progress.childId`, `Payment.transactionId`
- [ ] Add indexes on all FK columns that lack them

### 3e — Scopes
- [ ] Add default scope to `User` (filter by `isActive`)
- [ ] Add school-scoped named scopes to `Activity`, `Child`, `Meal`, `Media`
- [ ] Reduce User's 25+ unfiltered `hasMany` associations with proper scoping

---

## PHASE 4 — WEB APP CLEANUP

**Goal:** Consistent, secure, maintainable dashboards. No console.logs, no dead code, no duplicates.

### 4a — Shared Code First
- [ ] `shared/services/api.js` — implement token refresh mutex (fix race condition)
- [ ] `shared/services/api.js` — add `timeout: 30000` to axios instance
- [ ] `shared/services/api.js` — add AbortController / request cancellation support
- [ ] `shared/services/api.js` — replace `window.location.href = '/login'` with router callback
- [ ] `shared/context/AuthContext.jsx` — validate token expiry on app load (call `/auth/me`)
- [ ] `shared/context/AuthContext.jsx` — wrap all `localStorage.getItem/JSON.parse` in try-catch
- [ ] `shared/components/ErrorBoundary.jsx` — add Sentry error reporting
- [ ] `shared/context/NotificationContext.jsx` — store notification items array, not just count
- [ ] `shared/context/createAuthContext.jsx` — remove 3× hardcoded production Railway URL
- [ ] Create `shared/utils/imageUrl.js` — centralize avatar/media URL construction
- [ ] Create `shared/hooks/useAsync.js` — standardize loading/error/data pattern

### 4b — All 5 Apps: Common Fixes
- [ ] Remove all `console.log/error` in production code (30+ teacher, 27+ reception, etc.)
- [ ] Add `<NotFound />` page and wire wildcard route in all 5 `App.jsx` files
- [ ] Add per-page error boundaries
- [ ] Add debounce on all form submit handlers
- [ ] Standardize i18next version → `^23.10.1` across all apps
- [ ] Standardize jsdom version → `^27.4.0` across all apps
- [ ] Add `VITE_API_URL` validation at build time (fail build if missing)

### 4c — App-Specific Fixes

**super-admin:**
- [ ] Break `SuperAdmin.jsx` (1,724 lines, 78 state vars) into 6 separate page components
- [ ] Add pagination to all admin/school/message list endpoints
- [ ] Password creation: add strength rules + confirmation field
- [ ] Remove plaintext generated password from UI — email only

**admin:**
- [ ] Remove `console.log('Sending form data:')` and all sensitive logs
- [ ] Add proper email/phone/required validation to `ParentManagement.jsx`, `ChildManagement.jsx`
- [ ] Fix manual axios resolution in `vite.config.js`

**reception:**
- [ ] File upload: add MIME type + size validation before submitting
- [ ] Replace `window.confirm()` with proper modal dialogs
- [ ] Wrap `JSON.parse` in `dataStore.js` with try-catch
- [ ] Remove `medicalDiagnosis` from localStorage — fetch from API only

**teacher:**
- [ ] Fix dual auth context architecture (merge shared + parent contexts)
- [ ] Extract duplicate URL construction to `shared/utils/imageUrl.js`
- [ ] Fix socket reconnection debouncing
- [ ] Add retry on failed chat message delivery

**government:**
- [ ] Validate `:id` route param in `AdminDetails.jsx`
- [ ] Replace hardcoded Uzbek error string in `Login.jsx:28` with i18n key
- [ ] Use `Promise.allSettled` instead of `Promise.all` in Dashboard data load
- [ ] Fix `I18nextProvider` wrapping order in `App.jsx`

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
- [ ] Lock and document final API contracts (response shapes, error codes) for Flutter

---

## PHASE 6 — FLUTTER MOBILE APP

**Goal:** Native mobile experience built against a stable, documented API.

*(Starts only after Phase 5 API contracts are locked)*

- [ ] Set up Flutter project structure
- [ ] Implement auth flow (JWT + refresh token, FlutterSecureStorage)
- [ ] SSL certificate pinning from day one
- [ ] Build parent screens
- [ ] Build teacher screens
- [ ] Push notifications (FCM)
- [ ] Offline-first architecture
- [ ] Android + iOS builds

---

## PHASE 7 — FINAL CLEANUP, TESTING & BETA

**Goal:** Ship-ready.

- [ ] Full backend test coverage audit — target 80% (currently 21%)
- [ ] Write tests for all 21 previously untested routes
- [ ] Add error-case tests to all existing test files
- [ ] End-to-end integration tests (backend + frontend)
- [ ] Flutter integration tests
- [ ] Security penetration test (re-run full audit checklist)
- [ ] Load test backend (k6 or Artillery)
- [ ] Beta deployment — real users, monitored environment
- [ ] Sentry dashboards live, alerts configured
- [ ] Performance baselines established
- [ ] Documentation complete (API docs, deployment runbook)
- [ ] Final sign-off → production launch

---

## AUDIT BASELINE (2026-05-05)

| Area | Issues | Health |
|------|--------|--------|
| Backend Security | 62 | 36% |
| Test Coverage | 35 | 21% |
| Database / Models | 27 | 66% |
| CI/CD & Shared Code | 40 | 58% |
| Web Frontends (5 apps) | 118 | 56% |
| Mobile (deleted Phase 1) | 27 | — |
| **Total** | **309** | **47%** |

**Target after Phase 7: 90%+**
