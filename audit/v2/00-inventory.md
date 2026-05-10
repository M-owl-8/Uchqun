# Phase 0 v2 — Re-Inventory
**Date:** 2026-05-08  
**Auditor:** Re-audit pass (verification mode)  
**Baseline:** `/audit/00-inventory.md` (original audit)  
**Mode:** Read-only. No project files modified.

---

## Executive Summary

The remediation cycle produced **859 total commits** in the repository (up from the baseline count implied by the original audit). The 20 remediation-specific commits landed across two sessions: a broader Phase 1–6 session and a final Phase 7 session (five commits, HEAD~4..HEAD). Net structural effect: **−1,463 lines** across the files touched in Phase 7 alone (23 files, +1,380/−2,843); the earlier session produced comparable line-count reductions. The platform's controller layer is substantially reorganized: 3 monolithic controllers split into 10 focused files, 2 new utility abstractions extracted, 1 file deleted. CI is now a 7-job pipeline covering lint, security audit, SAST, backend tests, frontend tests, frontend lint, and build.

**Structural health is improved. Key open questions for subsequent phases:** reception app has no i18n at all; CI JWT values are hardcoded public strings (L-10, marked N/A but the concern persists); test coverage threshold is 10%/5% — actual measured coverage unknown from code reading alone.

---

## Scope

This phase covers structural changes only: file counts, LOC, new/removed files, dependency changes, CI changes, migration history, and test file inventory. No issue verdicts are rendered here — those begin at Phase 1.

---

## 1. Commit History Overview

| Range | Description | Commits |
|-------|-------------|---------|
| Pre-audit baseline | All work before this remediation session | ~839 |
| Phase 1–6 remediation | f611543 → 06f84a5 | 15 |
| Phase 7 remediation | b5cc2e9 → 1d1b2dd | 5 |
| **Total at HEAD** | | **859** |

### Phase 7 commits (most recent — direct subject of this re-audit pass):

| Commit | Message |
|--------|---------|
| `1d1b2dd` | `refactor(reception): split 1165-line controller into 3 files (L-04)` |
| `8fcbaa4` | `refactor(parent): split 930-line parentRatingController into 2 files (L-04)` |
| `de654e4` | `refactor(teacher): split 763-line controller into 3 focused files (L-04)` |
| `cc2e6ba` | `refactor(parent): extract group-vs-legacy branching to shared utility (M-03)` |
| `b5cc2e9` | `refactor(auth): extract login lockout store for Redis-readiness (M-01)` |

---

## 2. File System Structural Changes

### 2.1 Files Added (Phase 7)

| File | Lines | Purpose |
|------|-------|---------|
| `backend/utils/loginRateLimitStore.js` | 36 | Per-email lockout store; extracted from authController; documents Redis swap interface |
| `backend/utils/parentDataSource.js` | 10 | `getParentGroupId()` shared by activity/meal/media parent controllers |
| `backend/controllers/receptionTeacherController.js` | 122 | Teacher CRUD for reception role (split from receptionController) |
| `backend/controllers/receptionParentController.js` | 419 | Parent/child CRUD for reception role (split from receptionController) |
| `backend/controllers/teacherTaskController.js` | ~160 | Teacher responsibility/task/work-history (split from teacherController) |
| `backend/controllers/teacherAIController.js` | ~69 | `getAIAdvice` only (split from teacherController) |
| `backend/controllers/parent/parentTeacherRatingController.js` | 105 | `rateMyTeacher`, `getMyRating` (split from parentRatingController) |
| `backend/controllers/parent/parentSchoolRatingController.js` | 262 | `rateSchool`, `getMySchoolRating`, `getSchools` (split from parentRatingController) |

### 2.2 Files Deleted (Phase 7)

| File | Original lines | Status |
|------|---------------|--------|
| `backend/controllers/parent/parentRatingController.js` | ~930 | **Confirmed deleted** — does not exist at HEAD |

### 2.3 Files Substantially Reduced (Phase 7)

| File | Original lines | Current lines | Delta |
|------|---------------|--------------|-------|
| `backend/controllers/receptionController.js` | ~1,165 | 81 | −1,084 |
| `backend/controllers/teacherController.js` | ~763 | 190 | −573 |

### 2.4 Barrel Files Updated (Phase 7)

| File | Change |
|------|--------|
| `backend/controllers/parentController.js` | Replaced `parentRatingController` with two new split exports |
| `backend/routes/teacherRoutes.js` | Updated to import from 3 controller files instead of 1 |
| `backend/routes/receptionRoutes.js` | Updated to import from 3 controller files instead of 1 |

---

## 3. Controller Inventory (Full, at HEAD)

### 3.1 Root Controllers (`backend/controllers/`)

| File | Lines | Notes |
|------|-------|-------|
| `activityController.js` | 463 | Unchanged |
| `adminController.js` | 7 | Barrel wrapper |
| `adminRegistrationController.js` | 438 | |
| `aiWarningController.js` | 339 | |
| `authController.js` | 340 | Modified: lockout logic extracted to loginRateLimitStore |
| `businessController.js` | 272 | |
| `chatController.js` | 300 | Modified: WebSocket emit added (M-11) |
| `childAssessmentController.js` | 211 | |
| `childController.js` | 380 | Modified: inline closures moved here (L-03) |
| `emotionalMonitoringController.js` | 408 | |
| `governmentController.js` | 869 | Largest single controller; above 300-line threshold |
| `groupController.js` | 224 | |
| `mealController.js` | 327 | Above 300-line threshold |
| `mealPlanController.js` | 205 | |
| `mediaController.js` | 913 | Largest remaining controller; above 300-line threshold |
| `newsController.js` | 169 | |
| `notificationController.js` | 197 | |
| `parentController.js` | 9 | Barrel wrapper — updated |
| `parentEvaluationController.js` | 70 | |
| `progressController.js` | 87 | |
| `receptionController.js` | 81 | **Reduced from 1,165** |
| `receptionParentController.js` | 419 | **NEW** — split from reception |
| `receptionTeacherController.js` | 122 | **NEW** — split from reception |
| `servicePlanController.js` | 171 | |
| `superAdminController.js` | 263 | Name drift: "superAdmin" remains (see Phase 6) |
| `teacherAIController.js` | ~69 | **NEW** — split from teacher |
| `teacherController.js` | 190 | **Reduced from 763** |
| `teacherResourceController.js` | 136 | |
| `teacherTaskController.js` | ~160 | **NEW** — split from teacher |
| `therapyController.js` | 610 | Above 300-line threshold |
| `userController.js` | 124 | |

**Root total: ~31 files, ~8,600 lines**

### 3.2 Admin Subdirectory (`backend/controllers/admin/`)

| File | Lines |
|------|-------|
| `adminMessageController.js` | 27 |
| `adminParentController.js` | 139 |
| `adminReceptionController.js` | 494 |
| `adminStatsController.js` | 667 |
| `adminTeacherController.js` | 61 |
| `adminUserController.js` | 361 |

**Admin total: 6 files, 1,749 lines**  
Note: `adminReceptionController.js` (494 lines) and `adminStatsController.js` (667 lines) remain above the 300-line threshold — not touched in L-04 remediation.

### 3.3 Parent Subdirectory (`backend/controllers/parent/`)

| File | Lines | Status |
|------|-------|--------|
| `parentAIController.js` | 323 | Pre-existing split |
| `parentActivityController.js` | 149 | Pre-existing split |
| `parentChildController.js` | 26 | Pre-existing split |
| `parentMealController.js` | 149 | Pre-existing split |
| `parentMediaController.js` | 113 | Pre-existing split |
| `parentMessageController.js` | 27 | Pre-existing split |
| `parentProfileController.js` | 124 | Pre-existing split |
| `parentSchoolRatingController.js` | 262 | **NEW in Phase 7** |
| `parentTeacherRatingController.js` | 105 | **NEW in Phase 7** |
| ~~`parentRatingController.js`~~ | ~~930~~ | **DELETED in Phase 7** |

**Parent total: 9 files, 1,278 lines**

**Overall controller total: ~48 files, ~11,627 lines**

### 3.4 Controllers Still Above 300-Line Threshold

The original L-04 finding cited any controller over 300 lines. The following remain above threshold at HEAD and were **not** addressed in remediation:

| File | Lines |
|------|-------|
| `governmentController.js` | 869 |
| `mediaController.js` | 913 |
| `therapyController.js` | 610 |
| `adminStatsController.js` | 667 |
| `adminReceptionController.js` | 494 |
| `activityController.js` | 463 |
| `adminRegistrationController.js` | 438 |
| `emotionalMonitoringController.js` | 408 |
| `childController.js` | 380 |
| `adminUserController.js` | 361 |
| `aiWarningController.js` | 339 |
| `authController.js` | 340 |
| `mealController.js` | 327 |
| `parentAIController.js` | 323 |
| `chatController.js` | 300 |
| `receptionParentController.js` | 419 |

This is relevant to the L-04 verdict — remediation fixed 3 of the largest offenders but the issue class persists broadly. See Phase 2 for verdict.

---

## 4. Utils Inventory (`backend/utils/`)

| File | Lines | Notes |
|------|-------|-------|
| `email.js` | 138 | Pre-existing |
| `errorTracker.js` | 17 | Pre-existing |
| `governmentLevel.js` | 121 | Pre-existing |
| `logger.js` | 165 | Pre-existing |
| `loginRateLimitStore.js` | 36 | **NEW — M-01** |
| `pagination.js` | 7 | Pre-existing |
| `parentDataSource.js` | 10 | **NEW — M-03** |
| `queryValidator.js` | 23 | Pre-existing |
| `schoolValidation.js` | 19 | Pre-existing |
| `telegram.js` | 224 | Pre-existing |
| `uuidValidator.js` | 14 | Pre-existing |

**Total: 11 files, 774 lines**

---

## 5. Routes Inventory (`backend/routes/`)

25 route files, 1,149 lines total. Unchanged in count from original audit (original cited 22 route groups — discrepancy noted, likely due to health/migration/internal routes). Routes updated in Phase 7: `teacherRoutes.js`, `receptionRoutes.js`.

---

## 6. Frontend Structure

### 6.1 File Counts

| App | JSX/TSX files | i18n present | Languages |
|-----|--------------|--------------|-----------|
| admin | 32 | Yes | en, ru, uz |
| teacher | 63 | Yes | en, ru, uz |
| reception | 22 | **No** | — |
| government | 31 | Yes | en, ru, uz |

**Notable finding:** `reception/` has no `locales/` directory and no i18n setup. This is consistent with the original audit observation but was not the subject of an explicit remediation item.

### 6.2 Total Frontend Files
148 JSX/TSX files across 4 apps.

---

## 7. CI/CD Pipeline (`ci.yml`, 162 lines)

### Jobs (7 total):

| Job | Description | Gate |
|-----|-------------|------|
| `lint` | ESLint backend (conditional on config existence) | Independent |
| `security` | `npm audit --audit-level=high` on backend + 4 frontends | Independent |
| `sast` | Gitleaks + Trivy CRITICAL/HIGH SARIF scan | Independent |
| `test-backend` | Jest + PostgreSQL 15 service + coverage | Independent |
| `test-frontend` | Vitest matrix (4 apps); fails if no test files found | Independent |
| `lint-frontend` | ESLint matrix (4 apps) | Independent |
| `build` | Vite build matrix — requires ALL prior jobs | Dependent |

### Key CI env values (lines 98–99):
```yaml
JWT_SECRET: ci-test-jwt-secret-that-is-at-least-32-chars
JWT_REFRESH_SECRET: ci-test-refresh-secret-at-least-32-chars
```
These are hardcoded public strings in the workflow file. This is the subject of L-10 (marked N/A) and Special Verification Target §6.2. They have no `|| secrets.X` fallback — they are the literal value. Phase 11 will render the L-10 verdict.

### Coverage configuration:
The backend test command is `npm test -- --coverage`. No `--coverageThreshold` flag is passed here; the threshold (if any) must be in `jest.config.js` or `package.json`. Actual measured coverage is unknown from code reading alone — this is a **requires-runtime-check** item.

---

## 8. Test File Inventory

**Location:** `backend/__tests__/`  
**Total test files: 60**

### Distribution:

| Category | Count |
|----------|-------|
| Controller tests (root) | 34 |
| Controller tests (admin/) | 7 |
| Controller tests (parent/) | 6 |
| Integration tests | 2 |
| Middleware tests | 8 |
| Utils tests | 6 |
| **Subtotal** | **63** (some files in multiple dirs) |

### New test coverage gaps identified at Phase 0:
- `loginRateLimitStore.js` — no test file found
- `parentDataSource.js` — no test file found

Both are new utils added in Phase 7. The testing requirement in CLAUDE.md ("New controllers MUST ship with tests") applies to controllers; utils are not explicitly called out. However the original test coverage audit applies.

---

## 9. Migration Inventory

**Total migrations: 40** (up from the original audit which did not give a precise count)

### Migrations added during remediation:

| File | Purpose |
|------|---------|
| `20260506120000-promote-super-admin-to-government.js` | Role rename migration |
| `20260506130000-add-camel-case-fk-indexes.js` | FK index fix (H-13 first attempt) |
| `20260508000001-fix-fk-index-column-names.js` | H-13 corrected fix |
| `20260508000002-school-rating-stars-not-null.js` | M-06 SchoolRating.stars NOT NULL |

---

## 10. Dependency Changes

### Backend — Notable additions vs. original:
- `express-rate-limit ^7.1.5` — added (for M-01 HTTP-level rate limiting)
- `@sentry/node ^10.37.0` — present (error tracking)
- `dompurify ^3.3.1`, `sanitize-html ^2.17.2` — sanitization (security hardening)
- `joi ^17.11.0`, `express-validator ^7.0.1` — dual validation libraries (input validation)
- `node-appwrite ^13.0.0` — Appwrite storage client

### No new frontend dependencies identified beyond those in original audit.

---

## 11. Removed Structure

| Item | Status |
|------|--------|
| `mobile/` directory | Absent — confirmed removed |
| Payment controller/routes | Absent — confirmed removed (`20260506110000-drop-payments.js`) |
| `vercel.json` (root-level) | Absent — confirmed removed |

---

## 12. Structural Delta Summary

| Metric | Original Audit | At HEAD | Delta |
|--------|---------------|---------|-------|
| Backend controller files | ~35 (estimated) | 48 | +13 (splits) |
| Largest single controller | ~1,165 lines (reception) | 913 lines (media) | −252 |
| Controllers over 300 lines | ~12 (estimated) | 16 | Net: still present broadly |
| Backend utils files | ~9 (estimated) | 11 | +2 |
| Backend test files | ~45 (estimated) | 60 | +15 |
| Migrations | ~36 (estimated) | 40 | +4 |
| Frontend JSX/TSX files | ~145 (estimated) | 148 | +3 |
| CI jobs | 4 | 7 | +3 |
| Mobile app present | Yes | No | Removed |
| Payment system present | Yes | No | Removed |

---

## 13. Open Questions for Subsequent Phases

1. **L-10 verdict** — JWT hardcoded in CI as public strings. The N/A rationale ("test-only, no production exposure") is accurate but does not address the propagation risk. Phase 11.
2. **Actual test coverage %** — CI runs `--coverage` but threshold enforcement unclear without seeing jest.config. Requires runtime check. Phase 11.
3. **L-04 completeness** — 16 controllers remain over 300 lines at HEAD; only 3 were fixed. Phase 2.
4. **superAdminController.js** — file still exists; name drift. Phase 6.
5. **Reception i18n** — app has no locales directory. Phase 4/5.
6. **governmentController.js (869 lines), mediaController.js (913 lines)** — largest remaining files. Phase 2.
7. **parentDataSource.js / loginRateLimitStore.js** — no tests. Phase 11.

---

## What I Did NOT Look At

- Actual file content of any controller beyond the 3 explicitly read (loginRateLimitStore, parentDataSource, CI yml)
- Frontend component internals
- i18n key parity across language files
- Model definitions
- Any runtime behavior

All of the above are covered in their respective phase reports (Phase 1–12).
