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

**Backend tests: 510/510 throughout. All four frontend lints clean.**

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
