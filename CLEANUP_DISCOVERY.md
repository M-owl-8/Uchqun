# Uchqun — Cleanup Phase Discovery Report

*Generated: 2026-05-11 after full six-phase codebase read.*
*Scope: all files in `backend/`, `admin/`, `government/`, `teacher/`, `reception/`, `shared/` — excluding `node_modules/`, `dist/`, `.git/`.*

---

## 1. Executive Summary

| Dimension | Score | Notes |
|-----------|-------|-------|
| Overall messiness | **38%** | Clean conventions at the edges; debt concentrated in frontend god-components and `config/storage.js` |
| Overall technical debt | **45%** | Missing transactions, duplicated logic, no service layer, shared library not being used |
| Overall risk | **22%** | Good test coverage masks some hidden traps; main risks are race conditions in file ops and stale user cache |
| Onboarding readiness | **52%** | README has a broken setup step; no `.env.example`; CLAUDE.md is solid; no architecture diagram |

### Top 5 Cleanup Priorities (ranked)

1. **Shared library ghost duplication (CL-008, CL-009, CL-022)** — Toast, ConfirmDialog, Card, LoadingSpinner, and Auth context each exist in 3–4 independent copies. The shared library was built for a reason; most frontends aren't using it. This is the biggest single source of future divergence.

2. **Missing DB transactions in multi-step operations (CL-019)** — `uploadMedia`, `createActivity`, `deleteChild`, and `adminRegistration` each perform ≥2 DB/storage operations with no transaction. A mid-operation failure produces orphaned files or orphaned DB records.

3. **God components (CL-015, CL-016, CL-017)** — Three files exceed 700 LOC (`reception/ParentManagement.jsx` at 1325, `teacher/Media.jsx` at 1013, `teacher/Activities.jsx` at 829). Each combines data fetching, business logic, and rendering. They are already at the size where a single engineer change produces full-page regressions.

4. **`config/storage.js` logger discipline (CL-002)** — 19 `console.log/warn/error` calls in a 297-line file that runs in production. Every other backend file uses Winston. Production logs from this file bypass PII redaction, structured fields, and Sentry integration.

5. **`admin/AdminRegister.jsx` i18n violations (CL-005)** — 30+ user-facing validation messages and form labels hardcoded in Uzbek with no `t()` wrapping. This file is entirely outside the i18n system and cannot be localized or translated.

---

## 2. Repository-Wide Reconnaissance

### 2.1 File-Size Outliers

*Files ≥ 350 LOC that are not tests or migrations.*

| File | LOC | Why it matters |
|------|-----|----------------|
| `reception/src/pages/ParentManagement.jsx` | 1325 | God component — fetch, list, modal, CRUD all in one |
| `teacher/src/parent/pages/ChildProfile.jsx` | 1059 | Deep parent-facing profile with embedded forms |
| `teacher/src/pages/Media.jsx` | 1013 | Photo/video gallery + upload + player, all inline |
| `teacher/src/pages/Activities.jsx` | 829 | Activity CRUD + hardcoded service list |
| `admin/src/pages/ReceptionManagement.jsx` | 808 | Admin CRUD with document review UI |
| `teacher/src/pages/TherapyManagement.jsx` | 734 | Therapy CRUD, duplicate state patterns |
| `teacher/src/pages/Settings.jsx` | 713 | Profile + password + language + messaging in one page |
| `teacher/src/parent/pages/Settings.jsx` | 413 | Parent settings — partial duplicate of teacher settings |
| `admin/src/pages/Settings.jsx` | 633 | Same combination as teacher/Settings |
| `backend/controllers/governmentController.js` | 884 | All government analytics in one controller |
| `backend/controllers/mediaController.js` | 950 | Upload + fetch + delete + proxy all inline |
| `backend/controllers/therapyController.js` | 610 | Therapy + TherapyUsage CRUD |
| `backend/controllers/admin/adminStatsController.js` | 667 | Statistics aggregation controller |

### 2.2 TODO / FIXME / HACK Catalog

**Result: zero.** Grep across all `*.js` and `*.jsx` files excluding `node_modules` returned exactly one hit — a JSDoc comment in `reception/src/__tests__/utils.test.js:33` that contains the word "Validates", which is not a code marker. No production code has outstanding TODO/FIXME markers. This is a genuine strength; the previous audit phase cleaned them up.

### 2.3 Stray `console.*` Catalog

*Non-test, non-script files using `console.*` instead of Winston logger.*

| File | Count | Calls |
|------|-------|-------|
| `backend/config/storage.js` | 19 | log (12), warn (5), error (2) |
| `backend/config/env.js` | 4 | log (1), warn (1), error (2) |
| `backend/config/database.js` | 2 | `logging: console.log` in dev mode (intentional) |

**Scripts** (intentional, scripts have no logger): 60+ calls across `scripts/*.js` — all appropriate.
**Migrations** (console.log for migration output): 12 calls — partially acceptable but inconsistent since `migrate.js` uses logger.
**Frontend**: zero `console.*` in production source; only in test setup (where it is suppressed via `vi.fn()`).

**Verdict**: `config/storage.js` is the only file that is genuinely out of pattern.

### 2.4 Suppression Catalog (`eslint-disable`, `ts-ignore`)

| Location | Rule suppressed | Count | Justified? |
|----------|----------------|-------|------------|
| Frontend pages | `react-hooks/exhaustive-deps` | 33 | Yes — all are mount-only `useEffect` calls |
| `backend/server.js:110` | `security/detect-unsafe-regex` | 1 | Yes — CORS regex is safe as written |
| `backend/__tests__/cors.test.js:11` | `security/detect-unsafe-regex` | 1 | Yes — test mirrors production regex |
| `shared/services/api.js:11` | `no-unused-vars` | 1 | Marginal — investigate |

No `ts-ignore` or `ts-nocheck` anywhere.

**Verdict**: All 36 suppressions are either legitimate or trivially fixable. No red flags.

### 2.5 Barrel / Aggregator File Inventory

| File | Re-exports | Used by |
|------|-----------|---------|
| `backend/models/index.js` | All 35 models + `sequelize` instance | All backend controllers via named imports |

All four frontends use `@shared/...` path aliases rather than index barrel files. The single backend barrel is a net positive — it centralizes associations and scoped queries in one place — but it mixes three concerns: model registration, association definitions, and `syncDatabase()`. See CL-037.

---

## 3. Backend Inventory

### 3.1 Aggregate Scores

| Dimension | Score | Primary driver |
|-----------|-------|----------------|
| Messiness | 32% | Long controller functions; `storage.js` console noise; duplicated access-control blocks |
| Debt | 42% | Missing transactions; no service layer; repeated logic; hardcoded constants |
| Risk | 23% | Good test coverage; main risks are file/DB race conditions and stale user cache |

### 3.2 Per-File Inventory

| Path | LOC | Purpose | Mess% | Debt% | Risk% | Notable issues |
|------|-----|---------|-------|-------|-------|---------------|
| `server.js` | 257 | Express app bootstrap, route mounting, graceful shutdown | 15% | 25% | 10% | Hardcoded CORS origin list at lines 76–88; magic timeout numbers 120000/30000 at lines 134–135; `dotenv.config()` called after import of `env.js` (double invocation) |
| `config/database.js` | 76 | Sequelize connection | 20% | 30% | 15% | Pool config duplicated identically at lines 24–29 and 54–59; SSL detection logic on line 12 doesn't handle all cloud DB variants |
| `config/env.js` | 149 | Joi env validation | 20% | 15% | 10% | `console.warn/log/error` at lines 130, 140, 143 instead of logger; runs on import with `process.exit(1)` — no graceful degradation possible |
| `config/storage.js` | 297 | Appwrite + local file storage | **65%** | 40% | 30% | 19 `console.*` calls bypassing Winston; no retry on transient Appwrite errors; 6 near-identical warning messages; `streamToBuffer()` potentially called twice per upload |
| `config/migrate.js` | 137 | Custom migration runner | 30% | 35% | 20% | Error detection via string-matching (`err.message.includes`) at lines 90–102 — fragile across PG versions; `finally` block logic duplicated; no transaction/rollback strategy |
| `models/index.js` | 319 | Model registry + all associations | 35% | 30% | 15% | Associations unorganized (160 lines, no domain grouping); `syncDatabase()` unrelated to registry; both default export and named exports of every model create dual-maintenance surface |
| `models/User.js` | 156 | User model | 20% | 20% | 15% | Password hooks don't validate length/format before hashing; `notificationPreferences` JSONB has no schema; `rating` is FLOAT 0–5 but no rounding guard |
| `models/Child.js` | 155 | Child profile | 30% | **50%** | 25% | `school` (STRING) and `schoolId` (UUID FK) both exist — same concept stored twice; `teacher` (STRING) should be a FK to `users.id`; `getAge()` method has no null-check on `dateOfBirth` |
| `models/Media.js` | 48 | Media attachments | 25% | 30% | 20% | `thumbnail` field defined but `sanitizeMediaUrls()` always returns `thumbnail: null` — dead field |
| `models/RefreshToken.js` | 70 | Secure refresh token storage | 10% | 15% | **30%** | `hashToken` uses SHA256 — not constant-time; timing attack surface against token comparison (low probability but measurable) |
| `models/Activity.js` | 69 | Activity logging | 20% | 25% | 15% | `studentEngagement` ENUM default `'Medium'` duplicated in `activityController` line 244; JSONB `tasks`/`services` fields have no schema |
| `middleware/auth.js` | 145 | JWT verify + role checks | 20% | 25% | **25%** | 30s user cache does not invalidate on profile changes — stale role/school data served; `requireTeacher` uses different pattern from `requireRole` — inconsistency |
| `middleware/security.js` | 50 | Helmet headers + HTTPS enforcement | 10% | 10% | 10% | `crossOriginEmbedderPolicy: false` unexplained |
| `middleware/sanitize.js` | 41 | HTML sanitization of req.body | 15% | 15% | **20%** | `Object.entries()` on a circular object will throw `TypeError: Converting circular object to JSON`; no guard at line 24 |
| `middleware/validation.js` | 20 | Express-validator error handler | 15% | **35%** | 15% | Response shape `{ error, details: [{field, message}] }` differs from `errorHandler.js` shape `{ error, message }` — API clients must handle two formats |
| `middleware/errorHandler.js` | 94 | Global error handler | 20% | 20% | 15% | Stack trace sent in non-production at line 86 — potential info leak in staging; `captureException` called without `req.correlationId` context |
| `middleware/rateLimiter.js` | 89 | Express-rate-limit configs | 30% | 25% | 10% | 4 nearly-identical handler functions; magic numbers (100, 50, 20, 50) with no ENV override; naming `apiLimiter` vs `authLimiter` inconsistent |
| `middleware/requestLogger.js` | 71 | Correlation ID + timing logs | 20% | 20% | 10% | `req.connection.remoteAddress` (deprecated Node.js 18+) at line 24; identical metadata object constructed twice |
| `middleware/schoolScope.js` | 31 | School isolation enforcement | 10% | 10% | 15% | `schoolWhere()` utility doesn't guard against missing `req.user` — unsafe if called outside auth chain |
| `middleware/upload.js` | 117 | Multer configuration | 20% | 25% | 15% | `1E9` magic number in filename at line 23; file-size limits (50MB, 10MB) and max count (10) not ENV-overridable |
| `controllers/authController.js` | 339 | Login, logout, refresh, set-password | 25% | 30% | 20% | `ACCESS_TOKEN_EXPIRY = '15m'` magic string at line 10 (not from env); `startsWith('$2')` hash check at line 95 fragile; 180-line `login()` function |
| `controllers/mediaController.js` | 950 | Media upload, list, retrieve | **55%** | **50%** | **35%** | Access control block repeated from `activityController` (lines 47–83 vs 150–196 in activityController); `getSharp()` swallows errors and returns null at lines 17–27; `sanitizeMediaUrls()` always sets `thumbnail: null`; no transaction wrapping file upload + DB record creation |
| `controllers/activityController.js` | 463 | Activity CRUD | 45% | 45% | 25% | Access control logic repeated from childController; JSONB parsing/fallback duplicated at lines 112–131; missing transaction for createActivity + media attachment |
| `controllers/childController.js` | 380 | Child CRUD + avatar | 30% | 35% | 25% | Photo deletion swallows errors at lines 102–109 — orphaned files if storage misconfigured; `emitToUser` fire-and-forget with no error handling at line 119 |
| `controllers/governmentController.js` | 884 | Government analytics | 40% | 35% | 20% | 884 LOC in one file — 10 distinct endpoint handlers; no sub-controller split |
| `controllers/therapyController.js` | 610 | Therapy + TherapyUsage CRUD | 35% | 35% | 20% | Complex role logic duplicated from other controllers |
| `controllers/admin/adminStatsController.js` | 667 | School statistics | 35% | 30% | 15% | Helper functions defined inline in controller; fallback branch fixed in H-02 but overall size unchanged |
| `utils/logger.js` | 149 | Winston logger with PII redaction | 15% | 15% | 10% | PII redaction regex at line 25 uses global `/g` without domain-anchored email pattern — false positives possible |
| `utils/loginRateLimitStore.js` | 71 | Redis/in-memory lockout store | 10% | 15% | 10% | `MAX_ATTEMPTS=5`, `LOCKOUT_SECS=900` hardcoded — no ENV override |
| `utils/redisClient.js` | 38 | Redis singleton | 10% | 10% | 5% | Connection options (maxRetries, connectTimeout) hardcoded — no ENV override |
| `utils/pagination.js` | 8 | Pagination helpers | 5% | 10% | 5% | `MAX_LIMIT=100` hardcoded |
| `utils/schoolValidation.js` | 31 | Child access scoping | 10% | 10% | 15% | Intake branch uses `role === 'government' OR userId === parentId` — OR logic; AND would be stronger |
| `utils/errorTracker.js` | 18 | Sentry integration | 5% | 5% | 5% | `tracesSampleRate` hardcoded (0.1 prod, 1.0 dev) — no ENV override |

### 3.3 Backend-Specific Findings

**Repeated access-control blocks (3 controllers, ~100 lines each)**
`childController.js`, `activityController.js`, and `mediaController.js` each contain a nearly identical role-switch block that determines whether the requesting user can see the target record. This logic should be a middleware or a shared helper. As-is, any change to access logic must be made in three places.

**Missing transactions in multi-step operations**
Four critical flows lack transaction wrappers:
1. `mediaController.uploadMedia` — writes file to Appwrite, then creates `Media` DB record. If the record creation fails, the file is leaked.
2. `activityController.createActivity` — creates `Activity`, then optionally uploads media. Failure mid-way produces an orphaned activity.
3. `childController.deleteChild` — deletes the photo from storage, then deletes the DB record. If the DB delete fails, the child record is gone but the photo reference is already deleted.
4. `adminRegistrationController` — creates a `User`, then creates an `AdminRegistrationRequest`. Non-atomic.

**Inconsistent response shape**
Most endpoints return `{ success: true, data: ... }`. But several return raw objects (e.g., `getNotifications` returns `{ notifications, unreadCount, total }` with no `success` field; `validation.js` middleware returns `{ error, details }` without `success`). Clients have to special-case these. Count: 8 endpoints observed out of pattern.

**No service layer**
Controllers talk directly to Sequelize models. As the application grows, business logic (e.g., "what happens when a child is deleted?") lives only in the controller. There is no obvious place to put cross-cutting business rules (notifications on status change, side effects) without controller bloat.

---

## 4. Frontend Inventory

### 4.1 Admin App

**Aggregate scores:** Messiness 42% · Debt 50% · Risk 18%

**Per-file inventory (selected high-debt files)**

| Path | LOC | Mess% | Debt% | Risk% | Notable issues |
|------|-----|-------|-------|-------|---------------|
| `src/pages/Settings.jsx` | 633 | **60%** | **65%** | 20% | Handles profile edit, password change, notifications, messaging, and language — 5 distinct concerns; 50+ `useState` calls; duplicates MessageModal code (3rd copy) |
| `src/pages/AdminRegister.jsx` | 371 | 40% | **60%** | 15% | 30+ hardcoded Uzbek strings; no i18n; file validation errors in Uzbek only |
| `src/pages/Profile.jsx` | 345 | 40% | 55% | 15% | Duplicates all message-modal code from `MessageModal.jsx` (2nd copy); date formatting hardcoded `'uz-UZ'` at lines 292, 321 |
| `src/pages/ReceptionManagement.jsx` | 808 | 50% | 50% | 20% | All CRUD + document review in one component |
| `src/pages/Dashboard.jsx` | 254 | 30% | 35% | 15% | Helper functions defined inside component body; silent API failure (no error toast) |
| `src/components/TopBar.jsx` | 23 | 20% | 20% | 5% | `"Uchqun Admin"` hardcoded at line 16 — not localized |
| `src/components/MessageModal.jsx` | 116 | 25% | 30% | 10% | First of 3 copies of message-sending modal |
| `src/locales/en/common.json` | 194 | — | — | — | Key `"pntsPage"` at line 58 does not exist in `uz/common.json` (uz has `"parentsPage"`) — **active i18n key mismatch bug** |

**Cross-page consistency**

| Concern | Status | Notes |
|---------|--------|-------|
| Loading spinner | Partially consistent | Uses `LoadingSpinner` from shared but wrapper div classes differ per page (`h-96` vs `min-h-[400px]`) |
| Error toast | Partially consistent | Some pages call `showError()`, others call `toastError()` — different destructure names |
| Empty state | Inconsistent | Some show icon + text card, others show bare text, Dashboard shows 0-count card |
| Form validation | Inconsistent | AdminRegister validates inline; Settings checks trim(); Login checks notEmpty() — three different approaches |
| Confirmation dialog | Inconsistent | ReceptionManagement uses `ConfirmDialog` component; Settings uses `confirm()` dialog; Profile uses inline boolean modal |

**i18n audit (Admin)**
- `admin/en/common.json:58` key `"pntsPage"` (parent management) does not exist in `uz/common.json` (which has `"parentsPage"`). Any admin user on Uzbek locale will see raw key strings on the parent management page.
- `en/common.json:191` — `"governmentReply": "Davlat reply"` — mixed Uzbek-English in the English locale.
- `AdminRegister.jsx` — Entirely outside i18n. 30+ user-facing strings in Uzbek only.
- Date formatting: `'uz-UZ'` hardcoded at `Profile.jsx:292`, `Profile.jsx:321`, `Settings.jsx:580`, `Settings.jsx:609` instead of using `i18n.language`.

### 4.2 Government App

**Aggregate scores:** Messiness 35% · Debt 40% · Risk 18%

**Per-file inventory (selected)**

| Path | LOC | Mess% | Debt% | Risk% | Notable issues |
|------|-----|-------|-------|-------|---------------|
| `src/pages/Platform.jsx` | ~394 | 50% | 55% | 15% | 15+ `useState` calls at page level for 5 different tabs' form state; should extract per-tab form hooks |
| `src/pages/Dashboard.jsx` | ~150 | 25% | 30% | 15% | `Promise.allSettled` is good; but stale data shown without explicit user acknowledgment |
| `src/pages/Parents.jsx` | ~100 | 20% | **40%** | 20% | `?limit=500` with no real pagination — will break as user base grows |
| `src/pages/Profile.jsx` | ~150 | 25% | 30% | 10% | `"Government"` hardcoded as span text at line 66 |

**Cross-page consistency**

| Concern | Status | Notes |
|---------|--------|-------|
| Loading spinner | Consistent | `LoadingSpinner` used uniformly |
| Error handling | Inconsistent | Dashboard shows `StaleIndicator`; Schools shows error text; Students/Teachers/Parents silently show empty state |
| Empty state | Partially consistent | Most pages show icon + message; inconsistent copywriting |
| Form validation | N/A | Government app is mostly read-only |
| Confirmation dialog | Consistent | `ConfirmDialog` used in Platform |

### 4.3 Teacher App (including Parent sub-app)

**Aggregate scores:** Messiness 55% · Debt 60% · Risk 22%

The teacher app is the most complex: it serves two distinct users (teachers at `/teacher/*` and parents at `/`) from a single `App.jsx`. This design decision created substantial structural debt.

**Per-file inventory (selected)**

| Path | LOC | Mess% | Debt% | Risk% | Notable issues |
|------|-----|-------|-------|-------|---------------|
| `src/pages/Media.jsx` | 1013 | **70%** | 65% | 25% | Gallery + upload + video player + progress bar all inline; video player state duplicated per item; hardcoded `"Your browser does not support the video tag"` at line 312 |
| `src/pages/Activities.jsx` | 829 | **65%** | 60% | 20% | Hardcoded Uzbek service/therapy type list at lines 758–774 (not i18n); CRUD + sub-item management inline |
| `src/pages/TherapyManagement.jsx` | 734 | 55% | 55% | 20% | Same structure as Activities; default values hardcoded (lines 156–159) |
| `src/pages/Settings.jsx` | 713 | 55% | 60% | 15% | Messaging code duplicated from `Profile.jsx` (lines 54–239 and 509–623) |
| `src/pages/Profile.jsx` | 386 | 45% | 50% | 15% | `API_BASE` hardcoded at line 26 (not from `shared/services/config.js`) |
| `src/parent/pages/ChildProfile.jsx` | 1059 | **65%** | 60% | 20% | Largest frontend file; parent-facing child profile with all sub-sections inline |
| `src/i18n.js` | 83 | 40% | **50%** | 15% | Deep-merge logic at lines 15–48 exists solely to prevent `parent/en.json` sidebar.title from overwriting teacher `sidebar.title` — symptom of parent/teacher being incorrectly coupled in one app |

**The parent/teacher coupling issue (structural debt)**
`teacher/src/App.jsx` routes both `/teacher/*` (teacher dashboard) and `/` (parent app) in a single entry point. `teacher/src/parent/` then duplicates 7 components — `BottomNav`, `Card`, `LanguageSwitcher`, `Layout`, `LoadingSpinner`, `TopBar`, `ProtectedRoute` — because they have different route assumptions. The `i18n.js` deep-merge is a workaround for translation key namespace collision between the two sub-apps. This is a structural decision that should be revisited.

**i18n audit (Teacher)**
- `src/pages/Activities.jsx:758–774` — Uzbek service type names (`"Logoped"`, `"Psixolog"`, etc.) hardcoded in JSX, not in i18n files.
- `src/pages/Meals.jsx:476–479` — Portion size labels (`"Full portion"`, etc.) hardcoded.
- `src/pages/Media.jsx:312` — HTML5 video fallback text hardcoded in English.
- `src/pages/Login.jsx:8` — Emoji in JSX (minor, but not i18n-controlled).

### 4.4 Reception App

**Aggregate scores:** Messiness 50% · Debt 45% · Risk 18%

| Path | LOC | Mess% | Debt% | Risk% | Notable issues |
|------|-----|-------|-------|-------|---------------|
| `src/pages/ParentManagement.jsx` | 1325 | **75%** | **70%** | 25% | Largest file in the entire monorepo; full parent CRUD + child CRUD + document management + search — 5 distinct concerns |
| `src/pages/Settings.jsx` | 571 | 55% | 55% | 15% | Same messaging duplication pattern as admin/teacher Settings |
| `src/pages/TeacherManagement.jsx` | 507 | 50% | 50% | 15% | Teacher CRUD + document approval in one component |
| `src/pages/GroupManagement.jsx` | 348 | 40% | 40% | 10% | Group management + child assignment inline |

**Cross-page consistency (Reception)**

| Concern | Status | Notes |
|---------|--------|-------|
| Loading spinner | Consistent | Uniform usage |
| Error toast | Consistent | All pages use `useToast()` |
| Empty state | Partially consistent | Styling varies |
| Form validation | Inconsistent | ParentManagement validates inline; others use API error responses |
| Confirmation dialog | Inconsistent | Some pages use `ConfirmDialog` component; others use `confirm()` |

### 4.5 Cross-Frontend Comparison

| App | Messiness | Debt | Largest file | i18n compliance | Test coverage |
|-----|-----------|------|--------------|-----------------|---------------|
| Admin | 42% | 50% | Settings.jsx (633) | ~75% (AdminRegister is 0%) | Exists |
| Government | 35% | 40% | Platform.jsx (~394) | ~90% | Exists |
| Teacher | 55% | 60% | Media.jsx (1013) | ~70% | Exists |
| Reception | 50% | 45% | ParentManagement.jsx (1325) | ~85% | Exists |

**Cleanest frontend:** Government — smallest components, most consistent patterns, fewest hardcoded strings.
**Messiest frontend:** Teacher — structural teacher/parent coupling, 5 god components, most i18n violations.

---

## 5. Shared Library Assessment

### What is shared and works well
- `shared/services/api.js` — Axios factory with 401 refresh, mutex, FormData handling. Used correctly by all frontends.
- `shared/services/config.js` — Centralized API URL. Used correctly.
- `shared/components/ErrorBoundary.jsx` — Used in all apps, not duplicated.
- `shared/components/OfflineBanner.jsx` — Used in all apps, not duplicated.
- `shared/hooks/useAsync.js` — Good pattern; used by OfflineBanner.
- `shared/context/createAuthContext.jsx` — Well-designed factory; handles `requiredRole`, `storageKey`, role flags.
- `shared/tailwind.base.js` — Properly shared color/animation tokens.
- `shared/locales/*.json` — Centralized translations for common keys.

### What exists in shared but is also duplicated

| Component | Shared | Admin | Government | Reception | Teacher |
|-----------|--------|-------|------------|-----------|---------|
| `LoadingSpinner` | ✓ | ✓ (own copy) | ✓ (own copy) | ✓ (own copy) | via shared |
| `Card` | ✓ | ✓ (own copy) | ✓ (own copy) | ✓ (own copy) | via shared |
| `ConfirmDialog` | ✓ | ✓ (own copy) | ✓ (own copy) | ✓ (own copy) | ✓ (parent copy) |
| `Toast` + `ToastContext` | ✓ | ✓ (own copy) | ✓ (own copy) | ✓ (own copy) | via shared |
| `AuthContext` (factory) | ✓ | own impl | own impl | own impl | via shared |

**Consequence:** When a shared component is patched (accessibility fix, style change, bug fix), only the `teacher` app gets it automatically. The other three must be manually synced.

### What is in shared but shouldn't be
- `shared/components/BottomNav.jsx` — Has hardcoded routes (`/activities`, `/media`, `/child`, `/help`) that are specific to the parent/teacher role. This component cannot be used by admin, government, or reception without changes. It belongs in `teacher/src/`.

### Orphaned shared code
- `shared/components/Skeleton.jsx` (87 LOC) — Skeleton loaders defined but not imported by any frontend.
- `shared/utils/imageUrl.js` (19 LOC) — URL builder utilities not imported by any frontend.

### Versioning
The shared library is not versioned. All frontends import directly via `@shared` path alias resolved at build time. This is pragmatic for a monorepo but means breaking changes in `shared/` affect all apps simultaneously with no incremental migration path.

---

## 6. Cross-Cutting Concerns Scorecard

| Axis | Consistency | Notes |
|------|-------------|-------|
| **Naming — entities** | 85% | `child`/`children` consistent throughout; `school`/`schoolId` both exist on Child model (CL-014); `pnts` abbreviation in admin locale (CL-041) |
| **Naming — files** | 90% | Backend: camelCase controllers/routes; Frontend: PascalCase pages/components; consistent |
| **Error handling** | 60% | Backend: good `try/catch` everywhere; Frontend: 3 patterns (toast, silent-fallback, Promise.allSettled); `storage.js` and some parent app contexts swallow errors silently |
| **Response shape** | 65% | Most endpoints return `{ success, data }`; ~8 observed out of pattern (validation middleware, notifications list, some government endpoints) |
| **Validation layer** | 55% | Backend: split between express-validator middleware (most routes), Joi in `env.js`, and inline checks in controllers; frontend: 3 different patterns per app |
| **Logging** | 80% | Winston everywhere except `config/storage.js` (19 calls) and `config/env.js` (4 calls) |
| **Transactions** | **30%** | Only simple single-model operations are safe; all multi-step (file + DB, multi-model create/delete) lack transactions |
| **i18n** | 70% | Government: ~90% compliant; Reception: ~85%; Admin: ~75% (AdminRegister kills it); Teacher: ~70% (Activities, Media hardcoded) |
| **Date/time** | 55% | Backend dates are UTC via Sequelize; Frontend: 6+ components format dates with hardcoded `'uz-UZ'` instead of `i18n.language` |
| **ID consistency** | 98% | UUIDs everywhere (DataTypes.UUIDV4); one migration script briefly references integer IDs as documentation |

---

## 7. Onboarding Experience

**Scenario:** Senior engineer, Monday morning, with only `README.md` + `CLAUDE.md` + the codebase.

| Question | Score | Gap |
|----------|-------|-----|
| 1. How do I run locally? | **40%** | README step 2 says `cp backend/.env.example backend/.env` but `.env.example` does not exist anywhere in the repo. Setup is blocked at step 2 without prior knowledge. |
| 2. How do I run tests? | **80%** | `npm test` in `backend/` is documented in CLAUDE.md. Frontend test command (`npm test -- --run`) is only in CLAUDE.md; not in README. Missing: how to run a single test file. |
| 3. How do I add a new API endpoint? | **60%** | Pattern is inferrable by reading existing routes + controllers. Not documented. No scaffold command. New engineer spends ~30min reverse-engineering the pattern. |
| 4. How do I add a new frontend page? | **50%** | No documentation. Pattern is inferrable from existing pages. Missing: how to wire i18n keys, whether to use the shared API or a new endpoint. |
| 5. How do I add a new language? | **45%** | No documentation. Must find all 4 `src/locales/` directories plus `shared/locales/` manually. `i18n.js` shows the structure but there's no "add a language" guide. |
| 6. How do I create a new migration? | **70%** | `npm run migrate` documented; file naming convention inferrable from existing files. Missing: migration rollback command (CLAUDE.md says "Manual rollback required"). |
| 7. What env vars are required vs optional? | **65%** | `backend/config/env.js` is the authoritative source (Joi schema clearly marks required/optional). But there's no `.env.example`, so a new engineer won't know to look there. CLAUDE.md helps. |
| 8. Where is the auth flow? | **70%** | CLAUDE.md documents the middleware chain. Must trace `auth.js` + `authController.js` + `server.js`. No single document. |
| 9. Where is photo upload end-to-end? | **45%** | Three files involved: `middleware/upload.js`, `controllers/mediaController.js`, `config/storage.js`. No documentation linking them. Appwrite configuration is undocumented in the repo. |
| 10. Production bug — where do I look? | **60%** | Railway logs mentioned in CLAUDE.md. No runbook. No defined incident response path. Sentry is configured but the DSN location is undocumented. |

**Overall onboarding score: 58%**

The biggest single gap is the missing `.env.example`. A new engineer cannot start the backend without it, and the README instructs them to copy it.

---

## 8. Cleanup Backlog

### Blocker — must fix before buyer review

| ID | Category | Location | Description | Impact | Effort |
|----|----------|----------|-------------|--------|--------|
| CL-001 | Mismatch | `admin/src/locales/en/common.json:58` vs `uz/common.json` | `"pntsPage"` key in English locale has no corresponding key in Uzbek locale (uz uses `"parentsPage"`). Any admin user on Uzbek locale sees raw key strings on the parent management page. | Broken UI for Uzbek-language admin users | 0.5h |
| CL-002 | Blocker | No `.env.example` | `README.md` step 2 instructs `cp backend/.env.example backend/.env`, but the file does not exist. First-run setup is broken. | New engineers and CI pipelines can't start the backend | 1h |

### Critical — significantly hurts maintainability or risk profile

| ID | Category | Location | Description | Impact | Effort |
|----|----------|----------|-------------|--------|--------|
| CL-003 | Issue | `config/storage.js` (19 calls) | 19 `console.log/warn/error` calls instead of Winston logger. Bypasses PII redaction, structured fields, Sentry, and log aggregation. | Production file-upload logs are invisible to monitoring | 2h |
| CL-004 | Issue | `mediaController.uploadMedia`, `activityController.createActivity`, `childController.deleteChild`, `adminRegistrationController` | No DB transaction wrapping multi-step operations. File leaked on DB failure; orphaned activity on upload failure; orphaned reference on delete failure. | Data corruption on partial failure | 6h |
| CL-005 | Debt | `admin/src/pages/AdminRegister.jsx` (entire file) | 30+ user-facing validation messages and form labels hardcoded in Uzbek. File is entirely outside the i18n system. | Cannot localize admin registration; English- or Russian-speaking admins see Uzbek errors only | 4h |
| CL-006 | Messiness | `admin/src/pages/Profile.jsx:185–254`, `admin/src/pages/Settings.jsx:472–542`, `admin/src/components/MessageModal.jsx` | ~600 lines of identical message-modal code copied three times. Any UI or logic fix must be applied in three places. | Divergence already started (`Settings.jsx` version has a different loading state pattern) | 3h |
| CL-007 | Messiness | `backend/controllers/` (childController, activityController, mediaController) | School-scoped access-control block (~80 lines) copied into three controllers. Changes must be made in three places. | Access control bug requires triple-patch | 3h |
| CL-008 | Debt | `shared/components/` vs `admin/src/components/`, `government/src/components/`, `reception/src/components/` | `LoadingSpinner`, `Card`, `ConfirmDialog`, `Toast` each exist in shared AND 3 frontend copies. Shared library patches don't propagate. | 3 apps perpetually behind on component fixes | 4h |
| CL-009 | Debt | `shared/context/createAuthContext.jsx` vs admin/reception/government | `createAuthContext` factory exists and is well-designed but admin, reception, and government each implement their own auth context. | Auth bug requires 3 fixes; factory improvements unused | 3h |
| CL-010 | Mismatch | `admin/src/locales/en/common.json:191` | `"governmentReply": "Davlat reply"` — Uzbek word in the English locale file. English-speaking users see Uzbek text. | I18n correctness failure | 0.5h |
| CL-011 | Issue | `models/Child.js:47–58` | `school` (STRING, nullable) and `schoolId` (UUID FK) are both present. `school` is a denormalized copy. Writes to one are not reflected in the other. | Data can silently diverge between the string field and the FK | 4h |

### High — meaningful improvement, should happen before scale

| ID | Category | Location | Description | Impact | Effort |
|----|----------|----------|-------------|--------|--------|
| CL-012 | Messiness | `reception/src/pages/ParentManagement.jsx` (1325 LOC) | God component. Full CRUD for parents, children, documents, and search in one file. | Single-engineer changes produce full-page regressions | 8h |
| CL-013 | Messiness | `teacher/src/pages/Media.jsx` (1013 LOC) | Gallery, upload, video player, and progress bar all inline. | Same as above | 6h |
| CL-014 | Messiness | `teacher/src/pages/Activities.jsx` (829 LOC), `TherapyManagement.jsx` (734 LOC), `Settings.jsx` (713 LOC) | Three more god components in the teacher app. | Same as above | 12h total |
| CL-015 | Debt | `teacher/src/App.jsx`, `teacher/src/parent/components/` | Teacher and parent apps share a single entry point. Seven parent-specific components are duplicated locally. `i18n.js` has a deep-merge hack to handle namespace collision. | Structural: any parent-app feature adds complexity to teacher build | 12h |
| CL-016 | Issue | `middleware/auth.js:49–59` | 30s user cache does not invalidate when a user's role, schoolId, or `isActive` changes. A deactivated admin stays authenticated for up to 30 seconds. | Stale authorization decisions | 2h |
| CL-017 | Issue | `middleware/sanitize.js:22–29` | Recursive sanitization has no circular-reference guard. `Object.entries()` on a circular object throws `TypeError`. Normal Express request bodies don't have circular refs, but a crafted payload or a library bug could trigger this. | Unhandled exception → 500 → no response | 1h |
| CL-018 | Mismatch | `middleware/validation.js` vs `middleware/errorHandler.js` | Two different error response shapes. `validation.js` returns `{ error, details: [{field, message}] }`; `errorHandler.js` returns `{ error, message }`. | API clients need special-case logic | 2h |
| CL-019 | Debt | `admin/src/pages/Settings.jsx`, `reception/src/pages/Settings.jsx`, `teacher/src/pages/Settings.jsx`, `government/src/pages/Platform.jsx` | No custom hooks for API calls. Loading state, error state, and retry logic copy-pasted into each page component. | 20+ pages each implement the same fetch-loading-error boilerplate | 8h |
| CL-020 | Issue | `government/src/pages/Parents.jsx` | `?limit=500` with no real pagination. Will degrade as parent count grows toward the assumed scale. | Performance cliff | 1h |
| CL-021 | Mismatch | `admin/src/pages/Profile.jsx:292`, `Profile.jsx:321`, `Settings.jsx:580`, `Settings.jsx:609` + 2 more locations | Date formatting uses hardcoded `'uz-UZ'` instead of `i18n.language`. Users who switch the app to Russian or English still see Uzbek date formatting. | Broken locale experience | 1h |
| CL-022 | Debt | `shared/components/Skeleton.jsx`, `shared/utils/imageUrl.js` | Two shared modules are defined but never imported by any frontend. Dead code in the shared library. | Confusion for new engineers | 0.5h |
| CL-023 | Issue | `middleware/requestLogger.js:24` | `req.connection.remoteAddress` is deprecated since Node.js 18. The correct API is `req.socket.remoteAddress`. | Will emit deprecation warnings; will break in a future Node major | 0.5h |

### Medium — quality of life, schedule when convenient

| ID | Category | Location | Description | Impact | Effort |
|----|----------|----------|-------------|--------|--------|
| CL-024 | Debt | `backend/models/index.js:76–240` | 160 lines of associations with no domain grouping. Finding the User→School or Child→Therapy association requires reading all 160 lines. | Slow onboarding to data model | 1h |
| CL-025 | Debt | `backend/middleware/rateLimiter.js` | 4 nearly-identical handler functions; magic number request limits (100, 50, 20, 50) not ENV-overridable. | Cannot tune limits without code change + deploy | 1h |
| CL-026 | Messiness | `backend/config/env.js:130`, `env.js:140`, `env.js:143` | `console.warn/log/error` on 3 lines instead of logger. Minor inconsistency, but env validation output goes to a different sink from all other startup logs. | Startup log fragmentation | 0.5h |
| CL-027 | Debt | `backend/config/database.js:24–29` and `:54–59` | Identical pool configuration block duplicated. | DRY violation; config changes require double edit | 0.5h |
| CL-028 | Messiness | `backend/controllers/authController.js:95` | `password.startsWith('$2')` to detect bcrypt hash is fragile. The canonical check is `bcrypt.isHash()` or simply attempting `bcrypt.compare()`. | Edge case: non-bcrypt hash in DB won't be caught correctly | 0.5h |
| CL-029 | Debt | `backend/utils/loginRateLimitStore.js` | `MAX_ATTEMPTS=5`, `LOCKOUT_SECS=900` hardcoded — no ENV override. Cannot tune security parameters without a deploy. | Ops friction | 0.5h |
| CL-030 | Debt | `backend/utils/pagination.js` | `MAX_LIMIT=100` hardcoded. | Ops friction | 0.5h |
| CL-031 | Debt | `teacher/src/i18n.js:15–48` | Deep-merge logic exists solely to prevent namespace collision between teacher and parent translation files. Symptom of structural coupling. | Code smell that requires explanation | 0.5h (fix requires CL-015) |
| CL-032 | Messiness | `shared/components/BottomNav.jsx` | Hardcoded route paths (`/activities`, `/media`, `/child`, `/help`) make this component unusable outside the parent/teacher app. Named "shared" but is role-specific. | Misleading location in shared library | 1h |
| CL-033 | Mismatch | `shared/context/NotificationContext.jsx:11` | Module-level `let nextId = 1` increments on every notification, never resets. In tests this leaks across test runs. | Flaky tests that depend on notification IDs | 0.5h |
| CL-034 | Messiness | `backend/server.js:76–88` | 9 production domain strings hardcoded in the CORS allowlist. Should be driven by `FRONTEND_URL` env var (already supported) with the static list as a build-time constant. | Configuration-as-code anti-pattern | 1h |

### Low — cosmetic or marginal

| ID | Category | Location | Description | Impact | Effort |
|----|----------|----------|-------------|--------|--------|
| CL-035 | Messiness | `admin/src/components/TopBar.jsx:16` | `"Uchqun Admin"` hardcoded string, not localized. | Minor i18n gap | 0.5h |
| CL-036 | Messiness | All four `NotFound.jsx` pages | Hardcoded `"Page not found"` in English. | Minor i18n gap | 0.5h |
| CL-037 | Messiness | `teacher/src/pages/Activities.jsx:758–774` | Uzbek service type names hardcoded in JSX array (not in i18n JSON). | Cannot localize service type list | 1h |
| CL-038 | Messiness | Multiple frontend pages | `admin/src/components/Sidebar.jsx` and `government/src/components/Sidebar.jsx` each define a `COLORS` object with hardcoded hex values (e.g., `'#2E3A59'`, `'#7C3AED'`). These should be Tailwind CSS variables. | Hardcoded values diverge from design tokens | 1h |
| CL-039 | Messiness | `backend/middleware/upload.js:23` | `Math.round(Math.random() * 1E9)` — `1E9` magic number with no explanation. | Minor readability issue | 0.5h |
| CL-040 | Debt | `backend/utils/errorTracker.js` | `tracesSampleRate` (0.1 prod, 1.0 dev) not ENV-overridable. | Cannot tune Sentry sampling without deploy | 0.5h |
| CL-041 | Mismatch | `admin/src/locales/en/common.json:5` | `"pnts": "Pnts"` — abbreviation of "parents" that is cryptic in English. Key appears in nav and dashboard. | UX confusion for non-Uzbek-familiar readers | 1h |

---

## 9. Strengths

**Backend architecture is solid.** The middleware chain (`authenticate → requireRole → schoolScope → controller`) is clean and consistently applied across all 25 route files. The schoolScope isolation and the `validateChildAccess` utility are well-abstracted. The recent Redis-backed auth state (JTI revocation, login lockout) is correctly fail-closed.

**Test coverage is unusually good for a platform of this stage.** 63 test suites, 510 tests, all green. The `jest.unstable_mockModule` ESM pattern is applied consistently across all 55 backend test files. Two real integration tests (`auth.integration.test.js`, `child.integration.test.js`) catch regressions that unit tests cannot.

**Shared API service is exemplary.** `shared/services/api.js` handles cookie-based auth, 401 refresh with mutex (prevents parallel refresh storms), FormData detection, and quota-safe localStorage writes. Every frontend benefits from this without duplication.

**Zero TODO/FIXME markers.** The audit + remediation phase cleared all markers. There are no deferred-with-comment traps.

**ESLint is enforced at zero warnings.** All four frontends pass `--max-warnings 0`. The suppressions that exist are all justified. Tooling discipline is high.

**Migration discipline.** Custom migration runner with idempotent guards (checks column existence before adding). No `FORCE_SYNC` usage in production. Migration files are date-prefixed and read chronologically.

**Production safety guards.** `FORCE_SYNC` is guarded by both `NODE_ENV !== 'production'` and an explicit env var check. `MIGRATION_SECRET` env gate on the migration route. Both are correct.

**Error boundary coverage.** `shared/components/ErrorBoundary.jsx` is imported and used in all four frontends, wrapping the full app tree. Sentry integration is optional and graceful.

**Graceful shutdown.** `server.js` handles both `SIGTERM` and `SIGINT` with a 30-second hard-kill fallback, database connection close, and unhandled rejection logging. This is production-grade.

---

## 10. Open Questions

1. **Is the `"pnts"` abbreviation intentional?** The admin English locale uses `"pnts"` and `"pntsPage"` as keys for the parent management page. This looks like an abbreviation of "parents" (Uzbek: "ota-onalar"), but it reads cryptically in English. Was this chosen intentionally, or is it a leftover from a naming change?

2. **Is the `school` STRING field on `Child` still written anywhere?** The `Child` model has both `school` (string) and `schoolId` (UUID FK). If no code writes to `school` anymore, it can be dropped. If something still writes to it, the two fields need a reconciliation migration.

3. **What is the intended access model for the parent app?** The parent app lives inside `teacher/` (`teacher/src/parent/`). Is the intent that parents always access the platform via the teacher app's URL, or is there a plan to deploy a separate parent app? The answer determines whether CL-015 (separate entry point) is a cleanup item or a product milestone.

4. **Should `government` users have access to all media?** The current code explicitly allows government-level access to bypass school scope in `validateChildAccess`. This is coded as intentional (per Q7 in `REMEDIATION_LOG.md`), but it means any government user can view any child's photos. Is this by product design or a leftover from before the school isolation work?

5. **Is Appwrite the only production storage backend?** `config/storage.js` has a local disk fallback guarded by `LOCAL_STORAGE_FALLBACK`. In production, if Appwrite is misconfigured, files go to the Railway ephemeral disk and are lost on restart. Is the fallback intentional for any deploy, or should it be unconditionally disabled in production?

6. **What is the planned `teacher/src/parent/pages/TeacherRating.jsx` endpoint?** This is the largest parent-facing page (687 LOC) and contains rating submission logic. Is this feature complete and in production use, or in-progress?

7. **Is the `business` role currently used?** The `business` role is in the hierarchy and has its own controller/routes, but it was just recently scoped to school-level access (Q3 fix). Are there any active `business` users in production, or is this role planned for a future phase?
