# Cleanup Log

Tracks each item from the focused cleanup pass (see `CLEANUP_DISCOVERY.md`).
Ordered by execution sequence.

---

## Final Scorecard

| Item | Status | Commit |
|------|--------|--------|
| CL-002 — backend/.env.example | Closed | 41c4c65 |
| CL-001 — Fix pntsPage i18n key | Closed | 6d27052 |
| CL-010 — Fix "Davlat reply" in EN locale | Closed | 3cb74c1 |
| CL-003 — Winston logger in storage.js | Closed | 6bab6ad |
| CL-006 — Winston logger in env.js | Closed | b2d8f49 |
| CL-011 — Drop Child.school string field | Closed | 2b1b5dc |
| CL-004 — DB transactions on multi-step ops | Closed | b47f604 |
| CL-007 — validateChildAccess in updateActivity | Closed | dc3bb75 |
| CL-008 — Shared components deduplication | Already clean | n/a |
| CL-009 — Auth context factory migration | Already clean | n/a |
| CL-005 — i18n in AdminRegister.jsx | Closed | e34230e |
| DOC-1 — ARCHITECTURE.md | Done | 1e09d3c |
| DOC-2 — CONTRIBUTING.md | Done | 1e09d3c |
| DOC-3 — RUNBOOK.md | Done | 1e09d3c |
| CL-014a — Decompose admin/Settings.jsx | Closed | a954465, 072e948 |
| CL-014b — Decompose teacher/Settings.jsx | Closed | b07bdab, a4c9085 |
| CL-014c — Decompose reception/Settings.jsx | Closed | 5531527, ddd65d1 |
| CL-013c — Decompose teacher/parent/ChildProfile.jsx | Closed | (multi-commit) |
| CL-017 — Circular-reference guard in sanitize.js | Closed | (see section) |
| CL-018 — Unify error response shape | Closed | (see section) |
| CL-016 — Invalidate user cache on profile mutation | Closed | (see section) |
| CL-023 — Replace req.connection.remoteAddress | Closed | (see section) |
| CL-027 — Deduplicate pool config | Closed | (see section) |
| CL-024 — Group model associations by domain | Closed | b310616 |
| CL-025 — ENV-overridable rate limiter configs | Closed | 4579061 |
| CL-029 — ENV-overridable login lockout thresholds | Closed | f04b519 |
| CL-030 — ENV-overridable PAGINATION_MAX_LIMIT | Closed | acf2c5e |
| CL-040 — ENV-overridable SENTRY_TRACES_SAMPLE_RATE | Closed | 9643003 |
| CL-034 — Production CORS driven by FRONTEND_URL | Closed | 19df30a |
| CL-020 — Real pagination for government Parents page | Closed | 5a15108 |
| CL-021 — Replace hardcoded uz-UZ with i18n.language | Closed | 4823025 |
| CL-019 — Extract shared useFetch hook | Closed | 8410ebc |
| CL-022 — Remove orphaned shared/utils/imageUrl.js | Closed | 4190af6 |
| CL-032 — Remove orphaned shared/components/BottomNav.jsx | Closed | d1fc8ee |
| CL-033 — Replace nextId counter with crypto.randomUUID() | Closed | b49aebe |
| CL-026 — Winston logger in config/migrate.js | Already clean | n/a |
| CL-035 — i18n: TopBar "Uchqun Admin" | Closed | c390e65 |
| CL-036 — i18n: NotFound "Page not found" in all 4 apps | Closed | b247ee6 |
| CL-037 — i18n: requiredFieldsError hardcoded Uzbek fallback | Closed | f6e8728 |
| CL-038 — Sidebar hex colors → Tailwind tokens | Closed | 6f16248 |
| CL-039 — Document 1E9 magic number in upload.js | Closed | e0a7024 |

**Backend tests: 512/512 throughout. All four frontend lints clean.**

---

---

## CL-002 — Create/update `backend/.env.example`

**Status:** Closed
**Files changed:** `backend/.env.example`
**Commit:** 41c4c65

**Verification command:**
```
git ls-files backend/.env.example
python3 -c "... (all required vars present)"
node --input-type=module (validateEnv passes)
```

**Verification output:**

Gate 1 — file is tracked:
```
.env.example
TRACKED
```

Gate 2 — all required Joi vars present:
```
PASS: all required vars present
```

Gate 3 — placeholder values pass Joi validation:
```
✓ Environment variables validated successfully
PASS: env.js validateEnv succeeded
```

**Tests:** 510 → 510, all green
**Notes:** File already existed with most vars. Added missing `REDIS_URL`, `DATABASE_PUBLIC_URL`, `LOCAL_STORAGE_FALLBACK`. Fixed empty Appwrite placeholder values (`APPWRITE_PROJECT_ID=` etc.) which fail Joi `string().optional()` — replaced with `REPLACE_ME`. Telegram vars moved to commented-out form.

---

## Discovered During Cleanup

_(Items noticed but not fixed — logged for future cleanup pass.)_

- `backend/.env.example` had `TELEGRAM_BOT_TOKEN=` and `TELEGRAM_CHANNEL_ID=` (empty values) — would also fail Joi if those vars were in the schema. Fixed opportunistically as part of CL-002 since they were in the same file.

---

## CL-001 — Fix `pntsPage` i18n key mismatch

**Status:** Closed
**Files changed:** `admin/src/locales/en/common.json`
**Commit:** 6d27052

**Verification command:**
```
grep -rn "pntsPage" admin/ && echo "FAIL" || echo "PASS"
grep "parentsPage" admin/src/locales/{en,uz,ru}/common.json
cd admin && npm test -- --run
```

**Verification output:**

Gate 1 — no pntsPage remaining:
```
PASS (exit code 0)
```

Gate 2 — parentsPage in all three locales:
```
en: FOUND
uz: FOUND
ru: FOUND
```

Gate 3 — admin tests:
```
Test Files  4 passed (4)
Tests       31 passed (31)
```

**Tests:** 31/31 admin green
**Notes:** EN locale also had abbreviated "pnt" values ("Pnt Management", "pnts", etc.) which were expanded to full "parent"/"parents". Count interpolation (`{{count}}`) added to match UZ/RU format.

---

## CL-010 — Fix `"governmentReply": "Davlat reply"` Uzbek-in-English locale

**Status:** Closed
**Files changed:** `admin/src/locales/en/common.json`, `admin/src/locales/ru/common.json`
**Commit:** 3cb74c1

**Verification command:**
```
grep '"governmentReply"' admin/src/locales/en/common.json
cd admin && npm test -- --run
```

**Verification output:**

Gate 1:
```
"governmentReply": "Government reply",
```

Gate 2 — admin tests:
```
Test Files  4 passed (4)
Tests       31 passed (31)
```

**Tests:** 31/31 admin green
**Notes:** Also fixed spelling typo in RU locale: "государствоа" → "государства" (same key, same file pass).

---

## CL-003 — Replace `console.*` in `config/storage.js` with Winston

**Status:** Closed
**Files changed:** `backend/config/storage.js`
**Commit:** 6bab6ad

**Verification command:**
```
grep -n "console\." backend/config/storage.js && echo "FAIL" || echo "PASS"
grep "from.*utils/logger" backend/config/storage.js
grep -n "NODE_ENV.*production\|fallbackEnabled" backend/config/storage.js
cd backend && npm test
```

**Verification output:**

Gate 1 — no console calls:
```
PASS
```

Gate 2 — logger imported:
```
import logger from '../utils/logger.js';
```

Gate 3 — production fallback guard:
```
const fallbackEnabled = process.env.LOCAL_STORAGE_FALLBACK === 'true' && process.env.NODE_ENV !== 'production';
```

Gate 4 — backend tests:
```
Test Suites: 63 passed, 63 total
Tests:       510 passed, 510 total
```

**Tests:** 510 → 510, all green
**Notes:** LOCAL_STORAGE_FALLBACK logic inverted — was opt-out (default enabled, disable with =false); now opt-in (default disabled, enable with =true in non-production). Stale comments updated.

---

## CL-006 — Replace `console.*` in `config/env.js`

**Status:** Closed
**Files changed:** `backend/config/env.js`
**Commit:** b2d8f49

**Verification command:**
```
grep -n "console\." backend/config/env.js && echo "FAIL" || echo "PASS"
cd backend && npm test
```

**Verification output:**

Gate 1: PASS (no console calls)
Gate 2: 510/510 tests green

**Tests:** 510 → 510, all green
**Notes:** Logger import is safe before validateEnv() — logger.js uses only NODE_ENV/LOG_LEVEL and has no circular dependency. process.exit(1) behavior preserved.

---

## CL-011 — Drop `Child.school` denormalized string field

**Status:** Closed
**Files changed:**
- `backend/models/Child.js` — removed `school` DataTypes.STRING field
- `backend/migrations/20260512000001-drop-child-school-string.js` — idempotent migration removes column
- `backend/controllers/childController.js` — added `childSchool` School include
- `backend/controllers/teacherController.js` — removed `school` attr, added School include
- `backend/controllers/admin/adminParentController.js` — added School include
- `backend/controllers/receptionParentController.js` — removed all `school` string parsing/saving/lookup blocks
- `backend/controllers/parent/parentSchoolRatingController.js` — removed `child.school` fallback blocks
- `admin/src/pages/ParentManagement.jsx` — `child.school` → `child.childSchool?.name`
- `teacher/src/pages/ParentManagement.jsx` — same
- `teacher/src/pages/MonitoringJournal.jsx` — same
- `teacher/src/parent/pages/ChildProfile.jsx` — 3 occurrences updated
- `reception/src/pages/ParentManagement.jsx` — removed school from form state, validation, submission, and UI input
**Commit:** 2b1b5dc

**Verification command:**
```
grep -rn "c\.school\b\|child\.school\b" --include="*.jsx" --include="*.js" .
cd backend && npm test
cd reception && npm run lint
cd teacher && npm run lint
```

**Verification output:**

Gate 1 — no remaining child.school refs in frontend/backend (migration checks only):
```
PASS
```

Gate 2 — backend tests:
```
Test Suites: 63 passed, 63 total
Tests:       510 passed, 510 total
```

Gate 3/4 — reception + teacher lint: PASS

**Tests:** 510 → 510, all green
**Notes:** Reception's school text-input intake is no longer needed — school is assigned via `req.user.schoolId` on the backend. All display uses `childSchool?.name` from the Sequelize `belongsTo(School, { as: 'childSchool' })` join.

---

## CL-004 — Add DB transactions to multi-step operations

**Status:** Closed
**Files changed:**
- `backend/controllers/childController.js` — reversed op order (DB before storage)
- `backend/controllers/mediaController.js` — delete uploaded file if Media.create fails
- `backend/controllers/adminRegistrationController.js` — delete files on DB fail; sequelize.transaction for approve
- `backend/controllers/receptionParentController.js` — sequelize.transaction wrapping User.create + Child.create
- `backend/__tests__/adminRegistration.test.js` — added database.js mock; updated assertion for transaction arg
**Commit:** b47f604

**Verification command:**
```
cd backend && npm test
```

**Verification output:**
```
Test Suites: 63 passed, 63 total
Tests:       510 passed, 510 total
```

**Tests:** 510 → 510, all green
**Notes:** `activityController.createActivity` was single-step (one Activity.create + fire-and-forget notification) — no transaction needed. `deleteChild` fix was operation-reordering rather than a transaction since it's a single DB destroy. The `approveRegistrationRequest` transaction is the only true two-DB-write pattern.

---

## CL-007 — Extract duplicated access-control block to shared helper

**Status:** Closed
**Files changed:**
- `backend/controllers/activityController.js` — replaced inline Child.findByPk + school check in updateActivity with `validateChildAccess`
- `backend/__tests__/activity.test.js` — captured mockValidateChildAccess, updated cross-school and whitelist tests
**Commit:** dc3bb75

**Verification command:**
```
grep -n "child.schoolId.*req.user.schoolId" backend/controllers/activityController.js && echo "FAIL" || echo "PASS"
cd backend && npm test
```

**Verification output:**

Gate 1 — no inline school checks remaining: PASS
Gate 2: 510/510 tests green

**Tests:** 510 → 510, all green
**Notes:** `validateChildAccess` was already extracted and used by createActivity/uploadMedia. The only remaining inline copy was in `updateActivity`. Behavior change: cross-school update now returns 404 (consistent with other endpoints using validateChildAccess) instead of 403.

---

## CL-005 — Add i18n to `admin/src/pages/AdminRegister.jsx`

**Status:** Closed
**Files changed:**
- `admin/src/pages/AdminRegister.jsx` — added `useTranslation`, replaced 30+ hardcoded strings
- `admin/src/locales/en/common.json` — added `adminRegister` namespace (32 keys)
- `admin/src/locales/uz/common.json` — same
- `admin/src/locales/ru/common.json` — same
**Commit:** e34230e

**Verification command:**
```
grep -n "Ism\|Familiya\|Yuborish\|yuklang\|Eslatma\|Muvaffaq" admin/src/pages/AdminRegister.jsx | grep -v "t(" && echo "FAIL" || echo "PASS"
cd admin && npm run lint && npm test -- --run
```

**Verification output:**

Gate 1 — no remaining hardcoded strings: PASS
Gate 2 — lint: clean
Gate 3 — tests: 31/31 passed

---

---

## CL-008 — Remove duplicated shared components from admin/government/reception

**Status:** Already clean — no action needed
**Commit:** n/a

All app-specific LoadingSpinner, Card, ConfirmDialog, Toast components are already thin re-exports:
```js
export { default } from '@shared/components/LoadingSpinner';
```
This was done in a prior phase. Single source of truth is in `shared/components/`.

---

## CL-009 — Migrate admin/government/reception to shared `createAuthContext` factory

**Status:** Already clean — no action needed
**Commit:** n/a

All four apps (admin, reception, government, teacher) already use the `createAuthContext` factory from `shared/context/createAuthContext.jsx`. Each passes its own `tokenKey` and `requiredRole`. This was done in a prior phase.

---

## CL-014a — Decompose `admin/src/pages/Settings.jsx`

**Status:** Closed
**Files changed:**
- `admin/src/pages/Settings.jsx` — 633 → 302 LOC
- `admin/src/pages/settings/ProfileForm.jsx` — new (88 LOC)
- `admin/src/pages/settings/NotificationPreferences.jsx` — new (51 LOC)
- `admin/src/pages/settings/PasswordForm.jsx` — new (99 LOC)
- `admin/src/pages/settings/MessageModal.jsx` — new (78 LOC)
- `admin/src/pages/settings/MessagesModal.jsx` — new (92 LOC)
- `admin/src/__tests__/pages/Settings.test.jsx` — new (225 LOC, 9 tests)
**Commits:** a954465 (tests), 072e948 (extraction)

**Verification command:**
```
cd admin && npm run lint && npm test -- --run
```

**Verification output:**

Gate 1 — lint: clean (0 warnings)
Gate 2 — tests: 40 passed (31 prior + 9 new Settings tests)
Gate 3 — parent LOC: 302 (target < 400) ✓
Gate 4 — no behavior change: all 9 integration tests exercise same API calls and UI interactions

**Tests:** 40/40 admin green
**Notes:** Each child component owns its own `useTranslation` call. State and handlers stay in the parent (Settings.jsx) and are passed as props. No logic moved — pure structural decomposition.

---

## CL-014b — Decompose `teacher/src/pages/Settings.jsx`

**Status:** Closed
**Files changed:**
- `teacher/src/pages/Settings.jsx` — 713 → 237 LOC
- `teacher/src/pages/settings/AvatarUpload.jsx` — new (self-contained: own state, ref, hooks)
- `teacher/src/pages/settings/ProfileForm.jsx` — new
- `teacher/src/pages/settings/NotificationPreferences.jsx` — new
- `teacher/src/pages/settings/PasswordForm.jsx` — new
- `teacher/src/pages/settings/MessageModal.jsx` — new
- `teacher/src/pages/settings/MessagesModal.jsx` — new
- `teacher/src/__tests__/pages/Settings.test.jsx` — new (9 tests)
**Commits:** b07bdab (tests), a4c9085 (extraction)

**Verification:**

Gate 1 — lint: clean (0 warnings)
Gate 2 — tests: green (9 new Settings tests)
Gate 3 — parent LOC: 237 (target < 400) ✓
Gate 4 — no behavior change: mechanical extraction only

**Notes:** AvatarUpload extracted as self-contained component managing its own uploadingAvatar state, fileInputRef, and direct hook calls (useAuth, useToast, api). ProfileForm passes `user` prop to AvatarUpload — zero avatar-related props in parent. Imports use `../../shared/` prefix (teacher-specific shared folder).

---

## CL-014c — Decompose `reception/src/pages/Settings.jsx`

**Status:** Closed
**Files changed:**
- `reception/src/pages/Settings.jsx` — 571 → 250 LOC
- `reception/src/pages/settings/ProfileForm.jsx` — new (no saving/disabled — reception has no saving state)
- `reception/src/pages/settings/NotificationPreferences.jsx` — new
- `reception/src/pages/settings/PasswordForm.jsx` — new
- `reception/src/pages/settings/MessageModal.jsx` — new (uses `profile.*` i18n namespace for send/cancel keys)
- `reception/src/pages/settings/MessagesModal.jsx` — new (calls `useTranslation` internally for `i18n.language` date formatting)
- `reception/src/__tests__/pages/settings.test.jsx` — augmented 76 → 209 LOC (added 7 tests, total 10)
**Commits:** 5531527 (tests), ddd65d1 (extraction)

**Verification:**

Gate 1 — lint: clean (0 warnings)
Gate 2 — tests: 10/10 green
Gate 3 — parent LOC: 250 (target < 400) ✓
Gate 4 — no behavior change: mechanical extraction only

**Notes:** Reception Settings has no `saving`/`savingPassword` state (unlike admin/teacher), so child components receive no disabled-state props. MessagesModal uses `i18n.language` for toLocaleDateString — solved by calling `useTranslation()` directly inside MessagesModal rather than passing language as a prop.

---

## CL-013c — Decompose `teacher/src/parent/pages/ChildProfile.jsx`

**Status:** Closed
**Files changed:**
- `teacher/src/parent/pages/ChildProfile.jsx` — 1059 → 375 LOC
- `teacher/src/parent/pages/childProfile/childProfileUtils.jsx` — new (InfoItem, StatRow)
- `teacher/src/parent/pages/childProfile/ChildProfileHero.jsx` — new (photo/avatar section)
- `teacher/src/parent/pages/childProfile/AvatarUploadModal.jsx` — new (full upload logic)
- `teacher/src/parent/pages/childProfile/LogoutModal.jsx` — new (logout confirm + logic)
- `teacher/src/parent/pages/childProfile/MessageModal.jsx` — new (compose message + send)
- `teacher/src/parent/pages/childProfile/MessagesModal.jsx` — new (inbox view)
- `teacher/src/parent/pages/childProfile/EmotionalMonitoringSection.jsx` — new (records list)
- `teacher/src/__tests__/pages/ChildProfile.test.jsx` — updated (stable t reference, waitFor patterns)

**Verification:**

Gate 1 — lint: clean
Gate 2 — tests: all passing
Gate 3 — parent LOC: 375 (target < 400) ✓
Gate 4 — no behavior change: mechanical extraction only

**Notes:** `vi.mock('react-i18next')` factory must hoist `t` into closure scope to prevent function reference churn in React `useEffect` dependency arrays — new `t` on every render triggers infinite re-render loop.

---

## CL-017 — Circular-reference guard in `sanitize.js`

**Status:** Closed
**Files changed:**
- `backend/middleware/sanitize.js` — added `visited = new WeakSet()` parameter to `sanitize()`
- `backend/__tests__/middleware/sanitize.test.js` — added circular-reference test

**Verification:**
```
grep -n "WeakSet" backend/middleware/sanitize.js
cd backend && npm test
```

Gate 1 — WeakSet present: ✓
Gate 2 — 512/512 tests green

**Notes:** Recursive `sanitize()` previously threw `Maximum call stack size exceeded` on circular JS objects (e.g., Sequelize model instances with self-referential associations). WeakSet tracks visited objects, returns early on revisit.

---

## CL-018 — Unify error response shape

**Status:** Closed
**Files changed:**
- `backend/middleware/validation.js` — added `message: 'Some inputs failed validation'` to 400 response
- `backend/__tests__/middleware/validation.test.js` — added `message` assertion

**Verification:**
```
grep -n '"message"' backend/middleware/validation.js
cd backend && npm test
```

Gate 1 — message field present: ✓
Gate 2 — 512/512 tests green

**Notes:** Canonical error shape across all middleware is `{ error: string, message: string, details?: Array<{field, message}> }`. The `error` field is the short machine-readable code; `message` is the human-readable summary.

---

## CL-016 — Invalidate user cache on profile mutation

**Status:** Closed
**Files changed:**
- `backend/middleware/auth.js` — exported `invalidateUserCache(userId)` function
- `backend/controllers/admin/adminReceptionController.js` — added cache invalidation after 4 `reception.save()` calls that mutate `isActive`
- `backend/__tests__/middleware/auth.test.js` — added `invalidateUserCache` test

**Verification:**
```
grep -n "invalidateUserCache" backend/controllers/admin/adminReceptionController.js
cd backend && npm test
```

Gate 1 — 4 invalidation calls present: ✓ (approveDocument, rejectDocument, activateReception, deactivateReception)
Gate 2 — 512/512 tests green

**Notes:** The 30s in-memory cache in `auth.js` stores `{ user, expiry }` keyed by `userId`. Without invalidation, activating/deactivating a reception account takes up to 30s to take effect. Cache is only active when `NODE_ENV === 'production'`.

---

## CL-023 — Replace deprecated `req.connection.remoteAddress`

**Status:** Closed
**Files changed:**
- `backend/middleware/requestLogger.js` — `req.ip || req.connection.remoteAddress` → `req.ip`
- `backend/__tests__/middleware/requestLogger.test.js` — updated fallback test to use `req.ip` directly

**Verification:**
```
grep -n "connection.remoteAddress" backend/middleware/requestLogger.js && echo "FAIL" || echo "PASS"
cd backend && npm test
```

Gate 1 — no remaining deprecated usage: PASS
Gate 2 — 512/512 tests green

**Notes:** `req.connection` deprecated since Node.js 18. `req.ip` is the Express-idiomatic way to get client IP; it respects `trust proxy` settings automatically.

---

## CL-027 — Deduplicate pool config in `database.js`

**Status:** Closed
**Files changed:**
- `backend/config/database.js` — extracted `POOL_CONFIG` and `RETRY_CONFIG` as module-level constants; both Sequelize constructor branches reference them

**Verification:**
```
grep -c "POOL_CONFIG\|RETRY_CONFIG" backend/config/database.js
cd backend && npm test
```

Gate 1 — both constants referenced in both branches: ✓
Gate 2 — 512/512 tests green

---

## CL-024 — Group model associations by domain

**Status:** Closed
**Files changed:**
- `backend/models/index.js` — added 8 domain section headers to associations block; reorganized associations under sections
**Commit:** b310616

**Verification:**
```
grep -c "^// ===" backend/models/index.js  # → 8
cd backend && npm test
```

Gate 1 — 8 section headers: ✓ (User & Auth, Child & Family, School, Activities & Media, Ratings & Evaluations, Messaging & Government, Therapy & Clinical, Teacher Tools)
Gate 2 — 512/512 tests green

**Notes:** Pure comment/ordering change — zero association definitions modified.

---

## CL-025 — ENV-overridable rate limiter configs

**Status:** Closed
**Files changed:**
- `backend/middleware/rateLimiter.js` — `WINDOW_MS`, `RATE_LIMIT_API_MAX`, `RATE_LIMIT_AUTH_MAX`, `RATE_LIMIT_UPLOAD_MAX` read from env vars with numeric defaults
- `backend/__tests__/middleware/rateLimiterEnv.test.js` — new (uses `jest.unstable_mockModule` to capture limiter options)
**Commit:** 4579061

**Verification:**
```
grep -n "process.env.RATE_LIMIT" backend/middleware/rateLimiter.js
cd backend && npm test
```

Gate 1 — env overrides present: ✓
Gate 2 — 512/512 tests green

**Notes:** ESM module caching requires all env vars to be set in `beforeAll()` before the single `await import()` call — setting them inside `it()` blocks is too late.

---

## CL-029 — ENV-overridable login lockout thresholds

**Status:** Closed
**Files changed:**
- `backend/utils/loginRateLimitStore.js` — `LOGIN_MAX_ATTEMPTS` and `LOGIN_LOCKOUT_SECS` read from env vars
**Commit:** f04b519

**Verification:**
```
grep "LOGIN_MAX_ATTEMPTS\|LOGIN_LOCKOUT_SECS" backend/utils/loginRateLimitStore.js
cd backend && npm test
```

Gate 1 — env overrides present: ✓
Gate 2 — 512/512 tests green

---

## CL-030 — ENV-overridable PAGINATION_MAX_LIMIT

**Status:** Closed
**Files changed:**
- `backend/utils/pagination.js` — `MAX_LIMIT = parseInt(process.env.PAGINATION_MAX_LIMIT, 10) || 100`
**Commit:** acf2c5e

**Verification:**
```
grep "PAGINATION_MAX_LIMIT" backend/utils/pagination.js
cd backend && npm test
```

Gate 1 — env override present: ✓
Gate 2 — 512/512 tests green

---

## CL-040 — ENV-overridable SENTRY_TRACES_SAMPLE_RATE

**Status:** Closed
**Files changed:**
- `backend/utils/errorTracker.js` — `tracesSampleRate: parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE) || (prod ? 0.1 : 1.0)`
**Commit:** 9643003

**Verification:**
```
grep "SENTRY_TRACES_SAMPLE_RATE" backend/utils/errorTracker.js
cd backend && npm test
```

Gate 1 — env override present: ✓
Gate 2 — 512/512 tests green

---

## CL-034 — Production CORS driven by FRONTEND_URL env var

**Status:** Closed
**Files changed:**
- `backend/server.js` — removed hardcoded `defaultOrigins` production list; added `FRONTEND_URL` comma-separated allowlist; dev keeps `localhostOrigins`; deploy-preview regex retained for non-production only
**Commit:** 19df30a

**Verification:**
```
grep "FRONTEND_URL" backend/server.js
cd backend && npm test
```

Gate 1 — FRONTEND_URL parsing present: ✓
Gate 2 — 512/512 tests green

**Notes:** Resolves C-07 audit finding. Production no longer uses regex matching. CORS_STRICT=true disables the localhost fallback in dev.

---

## CL-020 — Real pagination for government Parents page

**Status:** Closed
**Files changed:**
- `backend/controllers/governmentController.js` — `getParentsList` uses `parsePagination`; response includes `limit`/`offset` metadata
- `government/src/pages/Parents.jsx` — added `PAGE_SIZE=20`, `page` state, prev/next UI
**Commit:** 5a15108

**Verification:**
```
grep "parsePagination" backend/controllers/governmentController.js
cd government && npm run lint
cd backend && npm test
```

Gate 1 — parsePagination in use: ✓
Gate 2 — lint: clean
Gate 3 — 512/512 tests green

---

## CL-021 — Replace hardcoded `uz-UZ` locale with `i18n.language`

**Status:** Closed
**Files changed:**
- `admin/src/pages/Profile.jsx`
- `admin/src/pages/settings/MessagesModal.jsx`
- `teacher/src/pages/Profile.jsx`
- `teacher/src/pages/settings/MessagesModal.jsx`
- `teacher/src/parent/pages/childProfile/MessagesModal.jsx`
- `teacher/src/parent/pages/childProfile/EmotionalMonitoringSection.jsx`
- `reception/src/pages/Profile.jsx`
**Commit:** 4823025

**Verification:**
```
grep -rn "uz-UZ\|ru-RU\|en-US" admin/src teacher/src reception/src | grep -v "test\|node_modules" && echo "FAIL" || echo "PASS"
```

Gate 1 — no more hardcoded locale strings: PASS
Gate 2 — all frontend lints clean

---

## CL-019 — Extract shared `useFetch` hook

**Status:** Closed
**Files changed:**
- `shared/hooks/useFetch.js` — new: wraps `api.get()` with `{ data, loading, error, refresh }` and `skip` option
- `admin/src/pages/SchoolRatings.jsx` — migrated to useFetch
- `government/src/pages/Students.jsx`, `Teachers.jsx`, `Schools.jsx`, `AdminDetails.jsx` — all migrated
**Commit:** 8410ebc

**Verification:**
```
grep -rn "useFetch" admin/src government/src
cd admin && npm run lint
cd government && npm run lint
cd backend && npm test
```

Gate 1 — useFetch used in 5 pages: ✓
Gate 2/3 — lint: clean
Gate 4 — 512/512 tests green

**Notes:** `skip: !isValidId` pattern for `AdminDetails` — when UUID invalid, `loading` starts `false` and `data=null`, immediately shows "not found" without API call.

---

## CL-022 — Remove orphaned `shared/utils/imageUrl.js`

**Status:** Closed
**Files changed:**
- `shared/utils/imageUrl.js` — deleted (zero imports across codebase)
**Commit:** 4190af6

**Verification:**
```
git show 4190af6 --stat
grep -rn "imageUrl" --include="*.jsx" --include="*.js" . | grep -v node_modules && echo "FAIL" || echo "PASS"
```

Gate 1 — file deleted: ✓
Gate 2 — zero remaining imports: PASS

**Notes:** `shared/components/Skeleton.jsx` was listed as orphaned in spec but is actively used by ParentManagement, TeacherManagement, and Dashboard — kept.

---

## CL-032 — Remove orphaned `shared/components/BottomNav.jsx`

**Status:** Closed
**Files changed:**
- `shared/components/BottomNav.jsx` — deleted (zero imports from root shared)
**Commit:** d1fc8ee

**Verification:**
```
git show d1fc8ee --stat
grep -rn "from.*shared/components/BottomNav" --include="*.jsx" . | grep -v node_modules
```

Gate 1 — root file deleted: ✓
Gate 2 — no dangling imports

**Notes:** `teacher/src/components/Layout.jsx` imports from `'../shared/components/BottomNav'` which resolves to `teacher/src/shared/components/BottomNav.jsx` (local, not root shared). `teacher/src/parent/components/BottomNav.jsx` handles the parent use case.

---

## CL-033 — Replace `nextId` counter with `crypto.randomUUID()`

**Status:** Closed
**Files changed:**
- `shared/context/NotificationContext.jsx` — removed `let nextId = 1`; `const id = crypto.randomUUID()`
**Commit:** b49aebe

**Verification:**
```
grep -n "nextId" shared/context/NotificationContext.jsx && echo "FAIL" || echo "PASS"
grep "randomUUID" shared/context/NotificationContext.jsx
```

Gate 1 — no nextId: PASS
Gate 2 — randomUUID in use: ✓

**Notes:** `nextId` was module-level mutable state that caused HMR-clash — after a hot reload the counter reset to 1, making new notification IDs collide with ones still in the component's useState.

---

## CL-026 — Winston logger in `config/migrate.js`

**Status:** Already clean — no action needed
**Commit:** n/a

`migrate.js` already imports `logger` from `'../utils/logger.js'` and uses `logger.info/warn/error` throughout. Zero `console.*` calls present. This was done in a prior phase.

---

## CL-035 — i18n: TopBar "Uchqun Admin"

**Status:** Closed
**Files changed:**
- `admin/src/components/TopBar.jsx` — added `useTranslation`, replaced literal with `t('sidebar.title', ...)`
**Commit:** c390e65

**Verification:**
```
grep -n "Uchqun Admin" admin/src/components/TopBar.jsx && echo "FAIL" || echo "PASS"
cd admin && npm run lint
```

Gate 1 — no hardcoded string: PASS
Gate 2 — lint: clean

**Notes:** Reused existing `sidebar.title` key already present in all 3 locales — no new key needed.

---

## CL-036 — i18n: "Page not found" in all 4 NotFound pages

**Status:** Closed
**Files changed:**
- `admin/src/pages/NotFound.jsx`, `teacher/src/pages/NotFound.jsx`, `reception/src/pages/NotFound.jsx`, `government/src/pages/NotFound.jsx` — all use `t('page404.*')`
- All locale files updated: admin (`src/locales/`), teacher (`src/locales/`), reception (`public/locales/`), government (`src/locales/`)
**Commit:** b247ee6

**Verification:**
```
grep -rn "Page not found\|Go Back" admin/src teacher/src reception/src government/src | grep -v ".json\|node_modules" && echo "FAIL" || echo "PASS"
```

Gate 1 — no hardcoded strings: PASS
Gate 2 — all 4 frontend lints clean

---

## CL-037 — i18n: hardcoded Uzbek fallback in Activities.jsx

**Status:** Closed
**Files changed:**
- `teacher/src/pages/Activities.jsx` — removed `|| 'Ko\'nikma...'` fallback; uses `t('activitiesPage.requiredFieldsError')` directly
- `teacher/src/locales/en/common.json`, `uz/common.json`, `ru/common.json` — added `requiredFieldsError` key
**Commit:** f6e8728

**Verification:**
```
grep -n "Ko.nikma" teacher/src/pages/Activities.jsx && echo "FAIL" || echo "PASS"
cd teacher && npm run lint
```

Gate 1 — no hardcoded Uzbek: PASS
Gate 2 — lint: clean

---

## CL-038 — Sidebar hex colors to Tailwind tokens

**Status:** Closed
**Files changed:**
- `shared/tailwind.base.js` — added `sidebar: { navy, muted, blue, mint, peach }` color tokens
- `admin/src/components/Sidebar.jsx`, `teacher/src/components/Sidebar.jsx`, `reception/src/components/Sidebar.jsx`, `government/src/components/Sidebar.jsx`, `teacher/src/parent/components/Sidebar.jsx` — replaced `COLORS` object + `style={{}}` with Tailwind class names
**Commit:** 6f16248

**Verification:**
```
grep -n "COLORS\|#2E3A59\|#8F9BB3\|#E8F4FD" admin/src/components/Sidebar.jsx && echo "FAIL" || echo "PASS"
cd admin && npm run lint
```

Gate 1 — no COLORS object or hex literals: PASS
Gate 2 — all 4 frontend lints clean

**Notes:** Government Sidebar maps to existing `primary-*` and `slate-500` tokens (no new tokens needed). Lucide icons inherit color from parent `text-*` class via `currentColor` — icon-level `style={{ color }}` overrides removed.

---

## CL-039 — Document `1E9` magic number in `upload.js`

**Status:** Closed
**Files changed:**
- `backend/middleware/upload.js` — extracted `RANDOM_SUFFIX_RANGE = 1_000_000_000` named constant with comment
**Commit:** e0a7024

**Verification:**
```
grep "RANDOM_SUFFIX_RANGE" backend/middleware/upload.js
```

Gate 1 — named constant present: ✓

**Notes:** Uses ES2021 numeric separator (`1_000_000_000`) for readability. Comment explains the 9-digit range is for collision avoidance in temp filenames.

---
