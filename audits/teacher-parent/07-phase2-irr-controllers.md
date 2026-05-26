# S5 PHASE 2 — ИРР Scoring Engine + Controllers + Endpoints

**Date:** 2026-05-26  
**Builds on:** `06b-phase1-correction.md` (10 ИРР models, schoolId on every child-scoped row, Railway deferred)

---

## 1. Scoring Engine — Pure Function (STEP 1)

**File:** `backend/utils/irrScoring.js`

`computeAssessmentResult(scores)` — deterministic sum, no DB, no HTTP:

```js
export function computeAssessmentResult(scores) {
  if (!Array.isArray(scores)) return { valid: false, error: 'ASSESSMENT_INCOMPLETE' };
  if (scores.length !== 17)  return { valid: false, error: 'ASSESSMENT_INCOMPLETE' };
  for (const s of scores) {
    if (!Number.isInteger(s) || s < 0 || s > 4)
      return { valid: false, error: 'ASSESSMENT_INVALID_SCORE' };
  }
  const totalScore = scores.reduce((sum, s) => sum + s, 0);
  return { valid: true, totalScore, maxPossibleScore: 68 };
}
```

**Design decisions (locked in IRR-DECISIONS.md):**
- Software direction: 0 = worst, 4 = best. Stored values are summed directly — no inversion.
- Max is **always 68** (17 × 4). Criterion 9 scored for ALL children regardless of `isHearingImpaired` (OQ-1).
- Result is deterministic and explainable: teacher can reconstruct the score from the per-criterion values.

**Unit test results** (`backend/__tests__/utils/irrScoring.test.js`, 11 tests):

| Test | Expected | Result |
|---|---|---|
| `all-4s` → totalScore | 68 | ✅ |
| `all-0s` → totalScore | 0 | ✅ |
| `mixed [4,3,2,1,0,4,3,2,1,0,4,3,2,1,0,4,3]` → totalScore | 37 | ✅ |
| maxPossibleScore always 68 (OQ-1) | 68 | ✅ |
| 16 scores → error | ASSESSMENT_INCOMPLETE | ✅ |
| 18 scores → error | ASSESSMENT_INCOMPLETE | ✅ |
| score of 5 → error | ASSESSMENT_INVALID_SCORE | ✅ |
| score of -1 → error | ASSESSMENT_INVALID_SCORE | ✅ |
| non-integer 3.5 → error | ASSESSMENT_INVALID_SCORE | ✅ |
| null in array → error | ASSESSMENT_INVALID_SCORE | ✅ |
| non-array input → error | ASSESSMENT_INCOMPLETE | ✅ |
| criterion 9 (index 8) included → sum includes it | 4 (only crit 9 set) | ✅ |

---

## 2. Teacher Controllers (STEP 2)

**File:** `backend/controllers/teacher/irrController.js`

### Enforcement contract (per 06b-phase1-correction.md)

Five private access helpers enforce both axes on every path:

```js
// Axis 1: child.schoolId === req.user.schoolId
// Axis 2: isTeacherAssignedToChild(child, req)
async function resolveChildAccess(childId, req)  → child | null
async function resolveIRRAccess(irrId, req)       → { irr, child } | null
async function resolvePeriodAccess(periodId, req) → { period, child } | null
async function resolveSTGoalAccess(goalId, req)   → { goal, child } | null
async function resolveLTGoalAccess(goalId, req)   → { goal, child } | null
```

Both axes return `null` → controller returns `404` (not 403). The 404-on-miss pattern prevents information leakage about resource existence.

### schoolId copied at creation

Every child-scoped mutation copies `schoolId` from the child/IRR row:

```js
// IRR create
IRR.create({ childId, schoolId: child.schoolId, ... })

// AssessmentSession create
AssessmentSession.create({ irrId, schoolId: irr.schoolId, ... })

// AssessmentScore bulk create (17 rows per session)
scoreRows = allCriteria.map((c, i) => ({ sessionId, criterionId: c.id, schoolId: irr.schoolId, score: intScores[i] }))

// LongTermGoal, GoalPeriod, ShortTermGoal, DailyMonitoringEntry, WeeklyMonitoringEntry
// all: schoolId: irr.schoolId (or child.schoolId for child-param endpoints)
```

### Endpoints implemented

**IRR lifecycle:**
- `POST /children/:childId/irr` — create draft (header fields optional at creation; 9 mandatory at activation)
- `GET /children/:childId/irr` — get current IRR for child
- `GET /irr/:irrId` — get by ID
- `PATCH /irr/:irrId` — update header fields + childStrengths/riskFactors
- `POST /irr/:irrId/activate` — gate: all 9 HEADER_FIELDS present
- `POST /irr/:irrId/archive` — idempotent-guarded

**Assessment sessions:**
- `POST /irr/:irrId/assessment-sessions` — validates 17 scores, runs engine, bulk-creates 17 AssessmentScore rows, stores totalScore + maxPossibleScore=68
- `GET /irr/:irrId/assessment-sessions` — list
- `GET /assessment-sessions/:sessionId` — get with per-criterion scores (for teacher view)

**Long-term goals:**
- `POST /irr/:irrId/long-term-goals` + `GET` + `PATCH /long-term-goals/:id` + `DELETE /long-term-goals/:id`

**Goal periods:**
- `POST /irr/:irrId/goal-periods` + `GET` + `PATCH /goal-periods/:id/review` + `POST /goal-periods/:id/sign`

**Short-term goals (nested under period):**
- `POST /goal-periods/:id/short-term-goals` + `GET` + `PATCH /short-term-goals/:id` + `DELETE /short-term-goals/:id`

**Daily monitoring (per-child, OQ-6):**
- `POST /children/:childId/daily-entries` + `GET /children/:childId/daily-entries`

**Weekly monitoring (per-child):**
- `POST /children/:childId/weekly-entries` + `GET /children/:childId/weekly-entries`

**Quarterly monitoring (admin-only, OQ-3):**
- `POST /admin/irr/quarterly-entries` + `GET /admin/irr/quarterly-entries`
- Defense-in-depth: controller checks `['admin','reception'].includes(req.user.role)` → 403 `QUARTERLY_ACCESS_DENIED` before any DB access
- Facility-scoped: no `childId`, no assignment check — `schoolId = req.user.schoolId`

---

## 3. Parent Read-Only Endpoints (STEP 3)

**File:** `backend/controllers/parent/irrParentController.js`

Per OQ-4: parent sees **aggregate scores only** (no per-criterion data). No parent write path exists.

### parentId isolation helper

```js
async function resolveParentChild(childId, req) {
  const child = await Child.findByPk(childId);
  if (!child) return null;
  if (child.parentId !== req.user.id) return null;  // parentId axis
  return child;
}
```

### Endpoints

| Route | Returns |
|---|---|
| `GET /parent/children/:childId/irr` | IRR header (full row — status, header fields) |
| `GET /parent/children/:childId/irr/assessment` | Sessions with `totalScore + maxPossibleScore + date + sessionType` only — NO per-criterion scores (OQ-4) |
| `GET /parent/children/:childId/irr/goals` | `{ longTermGoals, periods, shortTermGoals }` — goal text shared with parents |

Assessment progression query uses explicit `attributes` restriction:

```js
await AssessmentSession.findAll({
  where: { irrId: irr.id },
  attributes: ['id', 'sessionType', 'completedAt', 'totalScore', 'maxPossibleScore'],
  ...
});
```

No `scores` or `criterionId` data is ever returned to the parent.

---

## 4. Behavioral Two-Axis Tests (STEP 4)

### Teacher/IRR two-axis tests

**File:** `backend/__tests__/controllers/irr.withinSchool.test.js`

Real SQLite (in-memory) for Child/Group/User. All ИРР models mocked at DB layer only; controller logic runs real. `schoolValidation.js` is NOT mocked.

**Seed:** School A (TEACHER_A owns GROUP_G1 → CHILD_A1, TEACHER_B owns GROUP_G2 — unassigned to CHILD_A1). School B has TEACHER_X.

| Test | Axis | Result |
|---|---|---|
| `createIRR`: TEACHER_X (school B) → CHILD_A1 (school A) | Axis 1 | ✅ 404 IRR_CHILD_NOT_ACCESSIBLE, create NOT called |
| `createAssessmentSession`: school-B teacher → school-A IRR | Axis 1 | ✅ 404, session NOT created |
| `createLongTermGoal`: school-B teacher → school-A IRR | Axis 1 | ✅ 404, goal NOT created |
| `createDailyEntry`: school-B teacher → school-A child | Axis 1 | ✅ 404, entry NOT created |
| `createWeeklyEntry`: school-B teacher → school-A child | Axis 1 | ✅ 404, entry NOT created |
| `createIRR`: TEACHER_B (same school, unassigned) → CHILD_A1 | Axis 2 | ✅ 404, create NOT called |
| `createAssessmentSession`: TEACHER_B (unassigned) → IRR_A1 | Axis 2 | ✅ 404, session NOT created |
| `createGoalPeriod`: TEACHER_B (unassigned) → IRR_A1 | Axis 2 | ✅ 404, period NOT created |
| `createDailyEntry`: TEACHER_B (unassigned) → CHILD_A1 | Axis 2 | ✅ 404, entry NOT created |
| `createIRR`: TEACHER_A (assigned) → CHILD_A1 | Positive | ✅ 201, schoolId=SCHOOL_A on created row |
| `createAssessmentSession`: TEACHER_A (assigned) → IRR_A1 (all-4s) | Positive | ✅ 201, totalScore=68 maxPossibleScore=68 |
| `createLongTermGoal`: TEACHER_A (assigned) → IRR_A1 | Positive | ✅ 201, schoolId+childId set |
| `createQuarterlyEntry`: teacher role → 403 | Role gate | ✅ 403 QUARTERLY_ACCESS_DENIED |
| `createQuarterlyEntry`: admin role → 201 | Role gate | ✅ 201, schoolId=SCHOOL_A set |

### Parent isolation tests

**File:** `backend/__tests__/controllers/parent/irrParent.test.js`

Real SQLite for Child (parentId enforcement). IRR/session/goal models mocked.

**Seed:** CHILD_C1 belongs to PARENT_P1; CHILD_C2 belongs to PARENT_P2.

| Test | Axis | Result |
|---|---|---|
| `getChildIRR`: P1 requests P2's child | parentId | ✅ 404, IRR.findOne NOT called |
| `getChildIRR`: P1 requests own child | Positive | ✅ 200 |
| `getChildIRR`: child does not exist | Not found | ✅ 404 |
| `getAssessmentProgression`: P1 requests P2's child | parentId | ✅ 404, findAll NOT called |
| `getAssessmentProgression`: P1 requests own child, aggregate shape | OQ-4 | ✅ attributes restricted to totalScore/maxPossibleScore |
| `getGoals`: P1 requests P2's child | parentId | ✅ 404, findAll NOT called |
| `getGoals`: P1 requests own child, structured shape | Positive | ✅ { longTermGoals, periods, shortTermGoals } |

---

## 5. Routes

**`teacherRoutes.js`** — 28 new ИРР routes added (all under `requireTeacher`; mutations additionally gated with `requireRole('teacher')`).

**`parentRoutes.js`** — 3 new read-only ИРР routes (under `requireParent`).

**`adminRoutes.js`** — 2 new quarterly monitoring routes (under `requireAdmin + requireSchoolScope`).

---

## 6. i18n Error Code Catalog

**49 new codes** added to `audits/backend/i18n-error-codes.md` and all 3 locale files (`ru.json`, `uz-latn.json`, `uz-cyrl.json`). Total catalog: **195 codes** (was 146).

Groups: IRR (8), Assessment (9), LongTermGoal (6), GoalPeriod (5), ShortTermGoal (6), DailyEntry (5), WeeklyEntry (5), Quarterly (5).

`verify-i18n.js` output:
```
Catalog codes found: 195
✅ ru.json: 195 keys — all match catalog
✅ uz-latn.json: 195 keys — all match catalog
✅ uz-cyrl.json: 195 keys — all match catalog
Verification PASSED — all language files match the catalog.
```

---

## 7. Full Test Suite

**123/123 suites, 1302/1302 tests — all green** (previous: 120/120 suites, 1269/1269 tests).

New tests: +33 (11 scoring unit tests + 14 two-axis behavioral tests + 8 parent isolation tests).

---

## 8. Railway Deferred

Local proof complete. Railway promotion (migrations 20260526000001–000011) deferred per Phase 1 correction plan — promote after Phase 2 review, before Phase 3 (teacher screens).

---

## 9. Verdict

**S5 PHASE 2 = ✅ COMPLETE**

- Scoring engine: deterministic pure function, 11/11 unit tests, max always 68 (OQ-1 compliant)
- Teacher controllers: 25 handlers, both-axis enforcement on every child-scoped endpoint, schoolId copied at creation, 404-on-miss on either axis
- Parent read-only: 3 aggregate-only endpoints, parentId isolation, NO write path, NO per-criterion data (OQ-4 compliant)
- Quarterly monitoring: admin-only (OQ-3), facility-scoped, defense-in-depth role check in controller
- Behavioral two-axis tests: real SQLite, both axis 1 (school) and axis 2 (assignment) proven; quarterly role gate proven
- Parent isolation tests: parentId-axis proven, OQ-4 aggregate-shape asserted
- Routes wired: teacher (28 endpoints), parent (3 endpoints), admin (2 endpoints)
- i18n: 49 new codes cataloged + translated in all 3 locales
- Suite: 1302/1302 green
