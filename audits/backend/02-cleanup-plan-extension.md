# Backend S2: Cleanup Plan Extension (Recovery Pass)

**Generated:** 2026-05-19  
**Trigger:** S4 Confirm Clean returned verdict 🔴 — 4 new findings (BACKEND-039–042) + BACKEND-007b weak-fix correction  
**Status:** Plan only — no code changes in this step  
**Extends:** `audits/backend/02-cleanup-plan.md` (Batches 1–9, all completed in S3)

---

## Section 1: New Findings Added to Audit

These findings were identified during S4 Confirm Clean and S2 Recovery investigation, and are formally recorded in `01-audit.md`:

| ID | Severity | Title | Source |
|---|---|---|---|
| BACKEND-007b | Medium | `getStatistics` inner catch returns HTTP 200 on primary DB failure | S4 re-read of `adminStatsController.js` |
| BACKEND-039 | High | npm vulnerabilities in socket.io chain (engine.io DoS, file-type HIGH) | S4 `npm audit` run |
| BACKEND-040 | Medium | Admin role bypasses school-scope check in 3 controllers | S4 second-pass audit |
| BACKEND-041 | High | `updateMealPlan`/`deleteMealPlan` have no ownership or school check | S4 second-pass audit |
| BACKEND-042 | Info | `npm run lint` script missing from `package.json` | S4 hygiene check |
| BACKEND-043 | High | `updateMeal`/`deleteMeal` have no ownership or school check | S2 Batch 10 sweep |
| BACKEND-044 | Medium | `resolveWarning`/`notifyUsers` have no school check for admin callers | S2 Batch 10 sweep |

All seven are now in `audits/backend/01-audit.md`.

---

## Section 2: Batch 10 — IDOR Completeness Sweep

**Goal:** Enumerate every `findByPk`-then-mutate site across all controllers. Classify each as SAFE, FIXED, or FINDING. Produce `audits/backend/10-idor-sweep.md`.

**Scope:** All files in `backend/controllers/` and `backend/controllers/admin/`.

**Method:**
1. Grep for `.findByPk(` across all controllers.
2. For each hit: read the surrounding function (±30 lines).
3. Classify:
   - **SAFE** — `req.user.id` self-service, or route requires `requireGovernment` (intentional platform-wide).
   - **FIXED** — finding already closed in S3 (reference BACKEND-ID).
   - **FINDING** — no scope check after `findByPk`; assign BACKEND-ID.
4. Document every site in `10-idor-sweep.md` with file:line, function name, route guard, scope check, classification.

**Deliverable:** `audits/backend/10-idor-sweep.md` ✅ (written in this step).

---

## Section 3: Batches 11–14 Plans

### Batch 11 — Fix New IDOR Findings (BACKEND-041, BACKEND-043, BACKEND-044)

**Findings addressed:** BACKEND-041, BACKEND-043, BACKEND-044

| Finding | File | Functions | Lines | Current gap |
|---|---|---|---|---|
| BACKEND-041 | `mealPlanController.js` | `updateMealPlan`, `deleteMealPlan` | 156, 189 | `findByPk` then update/destroy with no scope |
| BACKEND-043 | `mealController.js` | `updateMeal`, `deleteMeal` | 261, 305 | `findByPk` then update/destroy with no scope |
| BACKEND-044 | `aiWarningController.js` | `resolveWarning`, `notifyUsers` | 248, 279 | `findByPk` then update; gov OK, admin unchecked |

**Fix pattern for BACKEND-041 and BACKEND-043 (child-scoped resources):**
```js
// Replace: const resource = await Model.findByPk(id);
// With:
import { findChildScopedResource } from '../utils/schoolValidation.js';

const result = await findChildScopedResource(Model, id, req);
if (!result) return res.status(404).json({ success: false, error: 'Not found' });
const { resource } = result;
// continue with resource.update(...) or resource.destroy()
```

**Fix pattern for BACKEND-044 (aiWarning — admin callers need school scope):**
```js
const warning = await AIWarning.findByPk(id);
if (!warning) return res.status(404).json({ success: false, error: 'Not found' });
// Government callers retain platform-wide access (intentional)
if (req.user.role !== 'government') {
  const childOk = await validateChildAccess(warning.childId, req);
  if (!childOk) return res.status(404).json({ success: false, error: 'Not found' });
}
```

**Pre-check required before execution:** Read the 4 not-yet-audited controllers from `10-idor-sweep.md` (parentEvaluation, teacherTask, servicePlan) to confirm no additional IDOR sites exist before closing Batch 11.

**Tests required:**
- `mealPlan.test.js`: add cross-school update/delete rejection test (teacher from school B cannot modify school A plan).
- `meal.test.js` (create if absent): cross-school update/delete rejection test.
- `aiWarning.test.js` (create if absent): cross-school resolve/notify rejection test for admin role.

### Batch 12 — Fix BACKEND-007b (adminStatsController inner catch)

**Finding:** BACKEND-007b  
**File:** `backend/controllers/admin/adminStatsController.js`  
**Line:** 392–403 (inner catch inside `getStatistics`)  
**Sensitive area:** `controllers/admin/` — use plan mode before editing.

**Change:**
```js
// Current inner catch (lines 398–403):
} catch (error) {
  logger.error('getStatistics error', { error: error.message });
  res.json({ success: true, data: [] });  // ← HTTP 200 on failure — wrong
}

// Fixed:
} catch (error) {
  logger.error('getStatistics error', { error: error.message });
  return res.status(500).json({ success: false, error: 'Failed to fetch statistics' });
}
```

**Test required:** In `adminStats.test.js`, add a test that mocks the primary DB query (e.g., `School.findAll`) to throw and asserts `res.status` is 500 and `body.success` is `false`. This verifies the inner catch — not just the outer one.

### Batch 13 — Fix BACKEND-040 (admin bypass ×3 controllers)

**Finding:** BACKEND-040  
**Sensitive area:** `controllers/` (admin-related logic) — use plan mode before editing.

| File | Line | Function | Bad pattern |
|---|---|---|---|
| `childAssessmentController.js` | 202 | `updateAssessment` | `assessment.teacherId !== req.user.id && req.user.role !== 'admin'` skips school check for admin |
| `emotionalMonitoringController.js` | 89 | `createEmotionalMonitoring` | `req.user.role !== 'admin'` bypass skips `validateChildAccess` |
| `emotionalMonitoringController.js` | 389 | `updateEmotionalMonitoring` | Same bypass |
| `teacherResourceController.js` | 125 | `deleteTeacherResource` | `req.user.role !== 'admin'` bypass skips ownership check |

**Fix approach:**
- `childAssessmentController.js:202`: retain teacher ownership check AND validate school scope for admin via `validateChildAccess(assessment.childId, req)`.
- `emotionalMonitoringController.js:89,389`: call `validateChildAccess(childId, req)` before create/update for all roles (not just non-admin).
- `teacherResourceController.js:125`: for admin callers, scope by resource's school matching `req.user.schoolId` rather than blanket bypass.

**Tests required:** Cross-school rejection test for each affected function under admin role.

### Batch 14 — npm Security + Lint Script (BACKEND-039, BACKEND-042)

**Finding BACKEND-042 — Add lint script (one-line fix):**
```json
// backend/package.json — add to "scripts":
"lint": "eslint controllers/ middleware/ utils/ routes/ config/ models/"
```
Verify: `npm run lint` exits 0 on clean codebase.

**Finding BACKEND-039 — npm vulnerabilities:**

| Package | GHSA | Prod severity | Action |
|---|---|---|---|
| file-type | GHSA-5v7r-6r5c-r473 | HIGH (direct dep) | `npm install file-type@^19.6.0`; verify `fileTypeFromBuffer` API unchanged |
| engine.io | GHSA-gxpj-cx7g-858c | HIGH | Monitor; no standalone fix — tied to socket.io upgrade |
| ws | GHSA-58qx-3vcg-4xpx | MODERATE | Accept risk; monitor socket.io release for patch |
| node-tar (×4) | Multiple | N/A (build tool) | Accept; not in production bundle |

**Do NOT run `npm audit fix --force`** — it installs socket.io@4.5.4 (downgrade from 4.7.x), which is a breaking change and counterproductive. Upgrade file-type directly; document ws/engine.io as accepted risk in `LOOP_QUESTIONS.md`.

---

## Section 4: Batch 10 Execution Results

Detailed classification in `audits/backend/10-idor-sweep.md`. New findings follow.

### BACKEND-043 — `mealController.js:261,305` — High (NEW)

`updateMeal` (line 261) and `deleteMeal` (line 305) both call `Meal.findByPk(id)` with no school or ownership check after. Route guard `requireRole('teacher', 'admin')` — any teacher from any school can modify any meal by UUID. The `Child.findByPk(meal.childId)` at line 268 is Socket.IO notification only, not authorization.

**Evidence (from code read):**
- `mealController.js:261`: `const meal = await Meal.findByPk(id);`
- `mealController.js:270`: `meal.update(req.body)` — no scope check between 261 and 270
- `mealController.js:305`: `const meal = await Meal.findByPk(id);` then `meal.destroy()` — no scope check

Assigned: **BACKEND-043 (High)**. Added to `01-audit.md`.

### BACKEND-044 — `aiWarningController.js:248,279` — Medium (NEW)

`resolveWarning` (line 248) and `notifyUsers` (line 279) call `AIWarning.findByPk(id)` then mutate with no school-scope check. Government callers are intentionally platform-wide. Admin is school-scoped but is not checked against the warning's child school.

**Evidence (from code read):**
- `aiWarningController.js:248`: `const warning = await AIWarning.findByPk(id);` — no school guard follows
- `aiWarningController.js:279`: same pattern

Assigned: **BACKEND-044 (Medium)**. Added to `01-audit.md`.

### Safe Sites (Not Findings)

| File | Lines | Reason |
|---|---|---|
| `governmentMessageController.js` | 148, 196, 244, 277 | `requireGovernment` — government has intentional platform-wide access by design |
| `therapyController.js:259` | `startTherapy` | Per-role child access check exists at lines 268+ |
| `userController.js:109` | `changePassword` | `req.user.id` — self-service only; cross-tenant access impossible |

---

## Section 5: Investigation Notes

### npm audit (run 2026-05-19, `npm audit --audit-level=high`)

```
13 vulnerabilities (2 low, 6 moderate, 5 high)
```

| Package | GHSA | npm-reported severity | Production impact | Notes |
|---|---|---|---|---|
| ws | GHSA-58qx-3vcg-4xpx | MODERATE | MODERATE | Memory disclosure via malformed HTTP upgrade |
| engine.io | GHSA-gxpj-cx7g-858c | HIGH | HIGH | DoS via uncaughtException on malformed packets |
| file-type | GHSA-5v7r-6r5c-r473 | HIGH | HIGH | Infinite loop on malformed ASF; direct dep in `upload.js` |
| node-tar (×4) | Multiple | HIGH | **NONE** | Build tool only — not in production bundle |

`npm audit fix --force` installs socket.io@4.5.4 — a downgrade from 4.7.x. This is counterproductive and a breaking change. The correct fix is a targeted `file-type` upgrade plus patience for socket.io to patch engine.io/ws.

### ESLint status

`.eslintrc.cjs` is fully configured with `eslint:recommended` + `plugin:security/recommended-legacy` + `no-console: 'error'`. The `ignorePatterns` covers `scripts/` and `node_modules/`. The only missing piece is the `"lint"` entry in `package.json` scripts — one line (Batch 14).

---

## Section 6: Updated Finding Index

| ID | Severity | Title | Status | Batch |
|---|---|---|---|---|
| BACKEND-001 | High | `approveDocument` auth check always false | ✅ Fixed | S3 Batch 1 |
| BACKEND-002 | High | `updateReception` scoped by schoolId not createdBy | ✅ Fixed | S3 Batch 3 |
| BACKEND-003 | High | `deleteMedia`/`updateMedia` no school isolation | ✅ Fixed | S3 Batch 5 |
| BACKEND-004 | High | `proxyMediaFile` no ownership isolation | ✅ Fixed | S3 Batch 5 |
| BACKEND-005 | High | Admin sees all meals platform-wide | ✅ Fixed | S3 Batch 2 |
| BACKEND-006 | High | Document upload trusts client MIME type | ✅ Fixed | S3 Batch 6 |
| BACKEND-007 | Medium | `getSchoolRatings` outer catch returns 200 | ✅ Fixed (outer) | S3 Batch 4 |
| BACKEND-007b | Medium | `getStatistics` inner catch returns 200 on DB failure | ⬜ Planned | Batch 12 |
| BACKEND-008 | Medium | `getAllSchools` unbounded findAll | ✅ Fixed | S3 Batch 4 |
| BACKEND-009 | Medium | Government endpoints default 500-row responses | ✅ Fixed | S3 Batch 1 |
| BACKEND-010 | Medium | Avatar stored as base64 in DB | ⏸ Deferred | — |
| BACKEND-011 | Medium | `proxyMediaFile` wildcards CORS | ✅ Fixed | S3 Batch 5 |
| BACKEND-012 | Medium | Response shape inconsistency | ✅ Documented | S3 Batch 8 |
| BACKEND-013 | Medium | `deleteTherapy` deactivates instead of soft-deletes | ✅ Fixed | S3 Batch 7 |
| BACKEND-014 | Medium | Swagger glob misses subdirectories | ✅ Fixed | S3 Batch 9 |
| BACKEND-015 | Medium | `sendAdminApprovalTelegram` dead code | ✅ Fixed | S3 Batch 9 |
| BACKEND-016 | Medium | `isVerified = true` set at upload time | ✅ Fixed | S3 Batch 9 |
| BACKEND-017 | Medium | Mixed `underscored` convention across models | ⏸ Deferred | — |
| BACKEND-018 | Medium | Legacy ParentActivity/Meal/Media queried in stats | ✅ Fixed | S3 Batch 4 |
| BACKEND-019 | Low | `Child.class`/`Child.teacher` STRING columns redundant | ✅ Fixed | S3 Batch 9 |
| BACKEND-020 | Low | `_TherapyUsage` imported but unused | ✅ Fixed | S3 Batch 9 |
| BACKEND-021 | Low | Dead Payme/Click keys in `.env.example` | ✅ Fixed | S3 Batch 9 |
| BACKEND-022 | Low | `tsconfig.json` dead config | ✅ Fixed | S3 Batch 9 |
| BACKEND-023 | Low | `reset-database.js` no safety guard | ✅ Fixed | S3 Batch 9 |
| BACKEND-024 | Low | `documentType` not validated as enum | ✅ Fixed | S3 Batch 6 |
| BACKEND-025 | Low | `getTherapyUsage` admin no school scope | ✅ Fixed | S3 Batch 7 |
| BACKEND-026 | Low | Migration endpoint weak rate limiter | ✅ Fixed | S3 Batch 9 |
| BACKEND-027 | Low | Sequelize logs via console.log | ✅ Fixed | S3 Batch 9 |
| BACKEND-028 | Low | `getMyEvaluations` hard-coded limit 50 | ✅ Fixed | S3 Batch 9 |
| BACKEND-029 | Info | 65 suites, 559 tests, 38.68% coverage | ✅ No action | — |
| BACKEND-030 | Info | Zero TODO/FIXME markers | ✅ No action | — |
| BACKEND-031 | Info | JTI revocation fail-closed | ✅ No action | — |
| BACKEND-032 | Info | `emitToUser` Redis-adapter-aware | ✅ No action | — |
| BACKEND-033 | Info | Parent role bypasses isActive — intentional | ✅ No action | — |
| BACKEND-034 | Info | `getUserChatIdByUsername` dead code | ✅ Fixed | S3 Batch 9 |
| BACKEND-035 | High | `createActivity` no child scope check | ✅ Fixed | S3 |
| BACKEND-036 | High | Meal/Activity admin list no school scope | ✅ Fixed | S3 |
| BACKEND-037 | Medium | `startTherapy` validation gap | ✅ Fixed | S3 |
| BACKEND-038 | Medium | `getStatistics` double-count | ✅ Fixed | S3 Batch 4 |
| BACKEND-039 | High | npm vulns in socket.io chain | ⬜ Planned | Batch 14 |
| BACKEND-040 | Medium | Admin bypass ×3 controllers | ⬜ Planned | Batch 13 |
| BACKEND-041 | High | `mealPlanController` update/delete no scope | ⬜ Planned | Batch 11 |
| BACKEND-042 | Info | `npm run lint` missing | ⬜ Planned | Batch 14 |
| BACKEND-043 | High | `mealController` update/delete no scope | ⬜ Planned | Batch 11 |
| BACKEND-044 | Medium | `aiWarningController` admin no school scope | ⬜ Planned | Batch 11 |

**Total: 44 findings** (BACKEND-001–038 original, plus 007b and 039–044).

**Open (unplanned):** 0  
**Planned (Batches 11–14):** 6 findings  
**Deferred:** 2 (BACKEND-010, BACKEND-017)  
**Fixed / No action:** 36

---

## Section 7: CLAUDE.md Test Discipline Update

Add the following bullets to `## Testing Requirements` in `CLAUDE.md`:

```
- Error-path fixes MUST include a test that triggers the failure (mock the DB method to throw) and asserts the HTTP status is non-200. A catch-block fix is unverified without a test that exercises that path.
- When a controller has nested try/catch blocks, ALL catch branches must return error-appropriate HTTP status codes. Fixing only the outermost catch does not protect inner-catch silent-failure paths — read the full function before closing an error-handling finding.
```

**Rationale:** BACKEND-007b was missed in S3 because only the outer catch at line 637 was fixed; no test triggered the inner catch at lines 392–403. The S4 re-read caught it. This rule prevents the same failure pattern on future error-handling fixes.
