# Backend S4: Cleanup Verification

**Generated:** 2026-05-19  
**Status:** 🔴 Incomplete — 1 new High IDOR + npm vulnerabilities; loop returns to S2  
**Verifier:** Independent re-read of every cited file:line  
**Coverage re-run:** 45.02% statements (2380/5286) — confirmed ✅

---

## Pass 1 — Verification Matrix

For each finding S3 claimed ✅ Fixed: re-opened the cited file:line and confirmed in current code.

| ID | Sev | S3 Claim | S4 Verdict | Evidence | Test |
|---|---|---|---|---|---|
| BACKEND-001 | High | ✅ Fixed | ✅ Re-verified Closed | `adminReceptionController.js:144` — `createdBy` added to attributes; `:154` — check now evaluates correctly | `adminReception.test.js` |
| BACKEND-002 | High | ✅ Fixed | ✅ Re-verified Closed | `adminReceptionController.js:420` — `receptionWhere = { id, role: 'reception', createdBy: req.user.id }` | `adminReception.test.js` |
| BACKEND-003 | High | ✅ Fixed | ✅ Re-verified Closed | `mediaController.js:931` — `validateChildAccess(media.childId, req)` called before delete | `media.test.js` |
| BACKEND-004 | High | ✅ Fixed | ✅ Re-verified Closed | `mediaController.js:641` (updateMedia) and `:710` (proxyMediaFile) — both call `validateChildAccess` | `media.test.js` |
| BACKEND-005 | High | ✅ Fixed | ✅ Re-verified Closed | `mealController.js:59-62` — admin branch `Child.findAll({ where: { schoolId: req.user.schoolId } })` + `Op.in` scope | `meal.test.js` |
| BACKEND-006 | High | ✅ Fixed | ✅ Re-verified Closed | `receptionController.js:5` — `fileTypeFromBuffer` imported; `:26-29` — called before `uploadFile`; `:8-9` — MIME allowlist | `receptionControllerOther.test.js` |
| BACKEND-007 | Medium | ✅ Fixed | ⚠️ Closed but weakly tested | Outer catch at `adminStatsController.js:637` returns `status(500)`. BUT inner catch at `:392-403` still returns 200 `{success:true, data:[]}` on the main DB query failure — the most common failure path. The outer catch is only reachable if an error escapes the inner try block. The test confirms function returns 200 (via inner catch), and notes "outer catch verified by code review" — not by an actual failing-test. Monitoring benefit of fix is limited. | `adminStats.test.js` (⚠️ tests inner-catch path, not outer-catch 500) |
| BACKEND-008 | Medium | ✅ Fixed | ✅ Re-verified Closed | `adminStatsController.js:647` — `parsePagination(req.query, { limit: 50 })` + `findAndCountAll` with `limit`/`offset` at `:659-660` | `adminStats.test.js` |
| BACKEND-009 | Medium | ✅ Fixed | ✅ Re-verified Closed | `governmentController.js:301` — `Math.min(parseInt(req.query.limit,10) \|\| 50, 200)`. Response includes `total` + `students`/`teachers` | `government.test.js` |
| BACKEND-010 | Medium | Deferred | Deferred | Cross-portal (CP-002). No change expected. | — |
| BACKEND-011 | Medium | ✅ Fixed | ✅ Re-verified Closed | `mediaController.js` — grep for `Access-Control-Allow-Origin` and `Cross-Origin-Resource-Policy` returns 0 results. Headers removed. | `media.test.js` |
| BACKEND-012 | Medium | ✅ Documented | ✅ Re-verified Closed | `CLAUDE.md:74-75` — response shape standard added. Batch 7 diff confirms only CLAUDE.md changed; no controller code touched. | — |
| BACKEND-013 | Medium | ✅ Fixed | ✅ Re-verified Closed | `therapyController.js:473` — `await therapy.destroy()` (not `update({ isActive: false })`) | `therapy.test.js` |
| BACKEND-014 | Medium | ✅ Fixed | ✅ Re-verified Closed | `config/swagger.js:33` — `apis: ['./routes/**/*.js', './controllers/**/*.js']` | — |
| BACKEND-015 | Info | ✅ Fixed | ✅ Re-verified Closed | `utils/telegram.js` — 36 lines, only `sendTelegramMessageByChatId` remains | — |
| BACKEND-016 | Medium | ✅ Fixed | ✅ Re-verified Closed | `receptionController.js:43` — comment "isVerified is set to true by approveDocument"; no `update({ isVerified: true })` in upload function | `adminReception.test.js` |
| BACKEND-017 | Medium | Deferred | Deferred | DB audit (Loop 7). No change expected. | — |
| BACKEND-018 | Medium | ✅ Fixed | ✅ Re-verified Closed | `adminStatsController.js:181-203` — `Promise.all` sums legacyActivities + modernActivities (and Meals, Media). `.catch(() => 0)` on individual sub-queries is acceptable for stats; outer catch still returns 500. | `adminStats.test.js` |
| BACKEND-019 | Low | Deferred | Deferred | Field in use (`receptionParentController.js:108`). Confirmed unchanged. | — |
| BACKEND-020 | Low | ✅ Fixed | ✅ Re-verified Closed | `governmentController.js` first 10 lines — no `_TherapyUsage` import | — |
| BACKEND-021 | Low | ✅ Fixed | ✅ Re-verified Closed | `git show HEAD:backend/.env.example \| grep -i PAYME` — no output. Payme/Click block removed. | — |
| BACKEND-022 | Low | ✅ Fixed | ✅ Re-verified Closed | `test -f tsconfig.json` → DELETED | — |
| BACKEND-023 | Low | ✅ Fixed | ✅ Re-verified Closed | `scripts/reset-database.js:7-8` — `ALLOW_DB_RESET !== 'true'` guard with `process.exit(1)`. `:12` — `isDryRun` flag. logger used throughout. | — |
| BACKEND-024 | Low | ✅ Fixed | ✅ Re-verified Closed | `receptionController.js:9` — `DOCUMENT_ALLOWED_TYPES` const; `:19-21` — enum validation before `Document.create` | `receptionControllerOther.test.js` |
| BACKEND-025 | Low | ✅ Fixed | ✅ Re-verified Closed | `therapyController.js:501-508` — admin branch `Child.findAll({ where: { schoolId: req.user.schoolId } })` + `Op.in` scope | `therapy.test.js` |
| BACKEND-026 | Low | ✅ Fixed | ✅ Re-verified Closed | `routes/migrationRoutes.js:16` — `router.post('/run', authLimiter, ...)` | — |
| BACKEND-027 | Low | ✅ Fixed | ✅ Re-verified Closed | `config/database.js:31,51` — both `console.log` replaced with `(msg) => logger.debug(msg)` | — |
| BACKEND-028 | Low | ✅ Fixed | ✅ Re-verified Closed | `parentEvaluationController.js:60` — `parsePagination(req.query, { limit: 20 })` | — |
| BACKEND-029 | Info | No action | No action | — | — |
| BACKEND-030 | Info | No action | No action | S1 claimed 0 TODO/FIXME/HACK. Confirmed: 0 real markers in production dirs (controllers/middleware/utils/config/models/routes). The 5 PowerShell "matches" are `xxx` parameter placeholders in JSDoc — false positives. | — |
| BACKEND-031 | Info | No action | No action | — | — |
| BACKEND-032 | Info | No action | No action | — | — |
| BACKEND-033 | Info | ✅ Documented | ✅ Re-verified Closed | `CLAUDE.md` Auth Flow section has the bypass explained. `LOOP_QUESTIONS.md` has dated entry. | — |
| BACKEND-034 | Info | ✅ Fixed | ✅ Re-verified Closed | Dead functions gone from `telegram.js`. Only `sendTelegramMessageByChatId` remains. | — |
| BACKEND-035 | High | ✅ Fixed | ✅ Re-verified Closed | `activityController.js:57-62` — admin path `Child.findAll({ where: { schoolId } })` + `Op.in`; `:180-185` — same in `getActivity` | `activity.test.js` |
| BACKEND-036 | High | ✅ Fixed | ✅ Re-verified Closed | `activityController.js:452` — `validateChildAccess(activity.childId, req)` called in `deleteActivity` before deletion | `activity.test.js` |
| BACKEND-037 | Medium | ✅ Fixed | ✅ Re-verified Closed | `activityController.js:196` — `where.childId = { [Op.in]: children.map(c => c.id) }` using `findAll` result | `activity.test.js` |
| BACKEND-038 | Low | ✅ Fixed | ✅ Re-verified Closed | `activityController.js:259` — `teacher: \`${req.user.firstName} ${req.user.lastName}\`` set server-side; no `teacher` in body destructure | `activity.test.js` |

**Summary:** 31 ✅ Re-verified Closed · 1 ⚠️ Closed but weakly tested (BACKEND-007) · 4 Deferred/No-action (no change expected)

---

## Pass 2 — Hygiene Results

| Check | Command / Method | Expected | Actual | Result |
|---|---|---|---|---|
| TODO/FIXME/HACK/XXX markers | PowerShell Select-String on controllers/middleware/utils/config/models/routes | 0 real markers | 0 real markers (5 "xxx" in JSDoc parameter examples — false positives via case-insensitive match) | ✅ Pass |
| console.log / debugger | PowerShell on controllers/middleware/utils/config/models/routes | 0 | 0 | ✅ Pass |
| Hardcoded secrets | Pattern scan — permissions blocked on .env files; checked controllers only | 0 | 0 | ✅ Pass |
| npm audit (high+critical) | `npm audit --audit-level=high` | 0 high | **13 total: 2 low, 6 moderate, 5 high** — all in socket.io dependency chain | ❌ Fail — see BACKEND-039 |
| Lint | `npx eslint controllers/ middleware/ utils/` (no `npm run lint` script) | 0 errors/warnings | 0 errors, 0 warnings | ✅ Pass |
| `npm run lint` script | Check package.json scripts | Script exists | **Script missing** from package.json; CLAUDE.md documents it incorrectly | ❌ New Info finding (BACKEND-042) |
| Build/syntax check | Implicitly verified: all 630 tests pass, which requires all modules to load | No syntax errors | All 630 tests pass, 70 suites | ✅ Pass |
| Dead files removed | Check tsconfig.json, telegram.js size | tsconfig.json gone; telegram.js ~36 lines | Confirmed: `tsconfig.json` deleted; `telegram.js` is 36 lines | ✅ Pass |
| Payme/Click env vars | `git show HEAD:backend/.env.example \| grep PAYME` | 0 matches | 0 matches | ✅ Pass |
| Coverage confirmed | `npm test -- --coverage --coverageReporters=text-summary` | ≥ 45% statements | **45.02% (2380/5286), 70 suites, 630 tests, 0 failures** | ✅ Pass |

---

## Pass 3 — Fresh Second-Pass Audit

### 3.1 schoolValidation.js helper

`findChildScopedResource` exists at `utils/schoolValidation.js:36-44`. It correctly:
- Calls `Model.findByPk(resourceId)` → returns null if missing
- Calls `validateChildAccess(resource.childId, req)` → returns null if school mismatch
- Returns `{ resource, child }` on success

Edge cases in `validateChildAccess`:
- `!childId` → null ✅
- child not found → null ✅
- `child.schoolId === null` (intake) → only parent + government ✅
- `req.user.schoolId && child.schoolId !== req.user.schoolId` → null ✅
- government (no schoolId) → passes through ✅

**No tests for `findChildScopedResource` directly.** The helper is only tested indirectly through the controllers that call it. This is acceptable but worth noting.

### 3.2 IDOR fix spot-check

**Attack: teacher in school A deletes media from school B**
Trace through `mediaController.js:deleteMedia`:
1. `Media.findByPk(id)` — finds record (no scope) — resource exists
2. `validateChildAccess(media.childId, req)` — teacher from school A, child from school B → `child.schoolId !== req.user.schoolId` → returns `null`
3. `if (!child) return res.status(404).json(...)` — 404 returned, resource untouched ✅

The fix correctly blocks the cross-school attack.

### 3.3 IDOR siblings not covered in S1

Controllers reviewed: `childAssessmentController.js`, `mealPlanController.js`, `servicePlanController.js`, `emotionalMonitoringController.js`, `teacherResourceController.js`, `chatController.js`, `notificationController.js`, `progressController.js`, `newsController.js`

**Controllers verified clean:**
- `servicePlanController.js` — calls `validateChildAccess` at lines 86, 130 ✅
- `progressController.js` — `requireParent` middleware restricts to parent role; `resolveChild` scopes to `parentId: req.user.id` ✅
- `notificationController.js` — all operations use `where: { id, userId: req.user.id }` ✅
- `newsController.js` — update/delete at `:140` and `:177` check `newsItem.schoolId !== req.user.schoolId` ✅
- `chatController.js` — admin access to all conversations is intentional (moderation); message delete checks `isOwner || isAdmin` which may warrant a product review but is not an unintentional IDOR

**New findings discovered:**

#### BACKEND-040 (Medium): Admin IDOR in three controllers

All three share the same pattern: `req.user.role !== 'admin'` short-circuits a role check, but no `validateChildAccess` call follows to verify the admin's `schoolId` matches the resource's child's school.

- `childAssessmentController.js:202` — `updateAssessment`: `assessment.teacherId !== req.user.id && req.user.role !== 'admin'` allows any admin to update any assessment regardless of school
- `emotionalMonitoringController.js:89` — `createOrUpdateMonitoring`: `if (req.user.role !== 'admin' && req.user.role !== 'government')` skips parent→child access check for admin; admin from school A can write emotional monitoring for children in school B
- `emotionalMonitoringController.js:389` — `deleteMonitoring`: `record.teacherId !== req.user.id && req.user.role !== 'admin'` allows any admin to delete any monitoring record
- `teacherResourceController.js:125` — `deleteResource`: `req.user.role !== 'admin' && resource.teacherId !== req.user.id` allows any admin to delete any teacher resource

**Fix:** After `findByPk`, call `validateChildAccess(resource.childId, req)` and return 404 if null. For resources not scoped by `childId` (e.g. `TeacherResource`), scope the initial lookup with `where: { ..., schoolId: req.user.schoolId }`.

#### BACKEND-041 (High): `updateMealPlan` and `deleteMealPlan` have NO ownership check

`mealPlanController.js:156-182` (`updateMealPlan`) and `mealPlanController.js:189-204` (`deleteMealPlan`):

```js
// updateMealPlan (line 161)
const plan = await MealPlan.findByPk(id);
if (!plan) return 404;
// [update fields directly — no ownership or school check]
await plan.save();
```

```js
// deleteMealPlan (line 193)
const plan = await MealPlan.findByPk(id);
if (!plan) return 404;
await plan.destroy(); // no ownership or school check
```

Route guard: `requireRole('teacher', 'admin')` — both teacher and admin roles can reach these.

**Attack vector:** A teacher in school A who knows (or brute-forces) the UUID of a meal plan belonging to a child in school B can update or delete it. The create path (`createOrUpdateMealPlan`) correctly calls `validateChildAccess`, but the update and delete paths do not.

This is the same class of issue as BACKEND-003, BACKEND-005, and BACKEND-036 that S3 fixed. It was simply not caught in S1 because `mealPlanController.js` was not read end-to-end.

**Fix:** After `MealPlan.findByPk(id)`, call `validateChildAccess(plan.childId, req)` and return 404 if null. Consistent with the `createOrUpdateMealPlan` path.

### 3.4 Silent-success-on-error re-scan

Broad grep for `res.json` inside catch blocks — 0 additional instances found in controllers (outside `adminStatsController.js` which was already reviewed).

**BACKEND-007 residual:** `adminStatsController.js:392-403` — inner catch still returns `{ success: true, data: [] }` (200) when the raw SQL ratings query fails. The outer catch at `:637` is now 500, but the main query path routes through the inner catch. Practical effect: DB errors in `getSchoolRatings` still produce silent 200 responses. The fix is real but ineffective for the primary failure mode.

One other silent-return: `parentSchoolRatingController.js:197` — returns `{ success: true, data: { rating: null, ... } }`. This is NOT an error path — it's the "no rating found for this user" case. Benign.

### 3.5 BACKEND-018 stats validation

`adminStatsController.js:181-203` correctly sums:
- `legacyActivities + modernActivities`
- `legacyMeals + modernMeals`
- `legacyMedia + modernMedia`

The inner `.catch(() => 0)` on each individual count is appropriate for a stats endpoint (partial failure → 0 for that metric, not total failure). The outer catch at `:303-325` returns 500 on complete failure. Logic verified. ⚠️ Real-data verification remains pending (test uses mocked 0 values, so the summing logic isn't tested against realistic data).

### 3.6 Batch 7 response shape drift check

`git diff df38e07^ df38e07 -- CLAUDE.md` shows exactly 3 lines added (the response shape standard). No controller files were changed. Confirmed: Batch 7 only touched documentation. ✅

### 3.7 Cross-portal accuracy check

`LOOP_CROSS_PORTAL.md` reviewed:
- CP-001: `getStudentsStats` and `getTeachersList` limit is now `Math.min(parseInt, 200)` — confirmed. Response shape `{success:true, data:{total, students:[]}}` confirmed. CP-001 accurately describes the change. ✅
- CP-002: Base64 avatars still in DB. Deferred. Accurately described. ✅
- CP-003: Response shape decision documented in CLAUDE.md, migration deferred. Accurately described. ✅

### 3.8 CLAUDE.md documentation additions

Three additions reviewed:
1. **Auth Flow — parent isActive bypass** (`CLAUDE.md:40-42`): Accurate. Explains the bypass, conditions for when it becomes unsafe, and cross-references `LOOP_QUESTIONS.md`. ✅
2. **Child-scoped resource pattern** (`CLAUDE.md:87-101`): Pattern with code examples. Correct and usable as a reference. ✅
3. **Response shape standard** (`CLAUDE.md:74-75`): Clear. Grandfather clause correctly prevents accidental existing endpoint migration. ✅

No contradictions with existing content found.

---

## New Findings (BACKEND-039 through BACKEND-042)

| ID | Severity | Category | File:Line | Title | Description |
|---|---|---|---|---|---|
| BACKEND-039 | High | Security (Dependencies) | `package.json` | 5 high-severity npm vulnerabilities in socket.io chain | `npm audit --audit-level=high` reports 13 total (2 low, 6 moderate, 5 high). All high-severity findings are in the socket.io / engine.io / ws dependency chain. Specific CVEs include DoS via memory exhaustion (ws) and uncaughtException vectors (engine.io). These affect the real-time communication layer used by all connected clients. `npm audit fix --force` is required but involves breaking changes to socket.io API. |
| BACKEND-040 | Medium | Security (OWASP A01 BAC) | `childAssessmentController.js:202`, `emotionalMonitoringController.js:89,389`, `teacherResourceController.js:125` | Admin role bypasses school-scope check in 3 controllers | The pattern `req.user.role !== 'admin'` short-circuits ownership/school checks without verifying the admin's `schoolId` matches the resource's school. Admin from school A can: update any `ChildAssessment` across all schools; create/update/delete `EmotionalMonitoring` records for any child; delete any `TeacherResource`. The emotional monitoring access is most sensitive (health-adjacent data). **Fix:** Call `validateChildAccess(resource.childId, req)` after `findByPk` in each affected function. |
| BACKEND-041 | High | Security (OWASP A01 IDOR) | `mealPlanController.js:156,189` | `updateMealPlan` and `deleteMealPlan` have no ownership or school check | `MealPlan.findByPk(id)` is called, then fields are updated or the record destroyed, with NO ownership check and NO school-scope check. Route guard `requireRole('teacher', 'admin')` allows any teacher across any school to update or delete any meal plan by UUID. This is the same class of IDOR that S3 fixed in `mediaController`, `mealController`, `activityController` — but `mealPlanController`'s update/delete paths were not read in S1. **Fix:** After `findByPk`, call `validateChildAccess(plan.childId, req)` and return 404 on null. |
| BACKEND-042 | Info | Documentation | `backend/package.json` | `npm run lint` documented in CLAUDE.md but script does not exist | CLAUDE.md commands section lists `npm run lint` for backend, but `package.json` has no `lint` script. Running `npm run lint` fails with "Missing script". ESLint does work via `npx eslint`. **Fix:** Add `"lint": "eslint controllers/ middleware/ utils/ routes/ config/ models/"` to `package.json` scripts. |

---

## Reopened Findings

None — all 32 S3-claimed fixes are present in code. BACKEND-007 is correctly marked ⚠️ (fix exists but weakly effective for main failure path).

---

## Coverage Verification

```
Statements   : 45.02% ( 2380/5286 )
Test Suites: 70 passed, 70 total
Tests:       630 passed, 630 total
```

S3 claimed 45.02% — confirmed. ✅

---

## Cross-Portal Accuracy

`LOOP_CROSS_PORTAL.md` accurately describes the backend state for all three CP items. ✅

---

## Verdict: 🔴 Cleanup Incomplete

**Trigger:** BACKEND-041 is a new High-severity IDOR finding of the same type and severity as the issues S3 was designed to fix. Any teacher (not just admin) can update or delete any meal plan across school boundaries by UUID. This is `mealPlanController.js:156,189`.

BACKEND-039 (npm High vulnerabilities in socket.io chain) is a second High finding, though it requires dependency updates rather than code changes.

**Required action:** Return to S2. Append BACKEND-039, BACKEND-040, BACKEND-041, BACKEND-042 to `audits/backend/01-audit.md`. Plan and execute fixes. Re-verify.

**Scope of new work:**
- BACKEND-041 (High): Add `validateChildAccess(plan.childId, req)` to `updateMealPlan` and `deleteMealPlan` in `mealPlanController.js` — estimated S effort
- BACKEND-040 (Medium): Add school-scope checks to 4 admin-bypass paths across 3 controllers — estimated S effort
- BACKEND-039 (High): `npm audit fix --force` with socket.io breaking-change review — estimated M effort
- BACKEND-042 (Info): Add `lint` script to `package.json` — S effort (5 min)
