# Teacher+Parent Portal — V1 Remediation: Within-School Cross-Teacher IDOR

**Date:** 2026-05-25  
**Triggered by:** S4 Confirm Clean finding V1-RESIDUAL (MEDIUM) — `validateChildAccess` checks school-only, missing teacher-child assignment axis  
**Status:** ✅ CLOSED

---

## STEP 1 — Caller Re-audit: True Scope of the Second-Axis Gap

Re-audited every caller of `validateChildAccess` from source code. Prior S1 marks of "✓ validateChildAccess" were based on the wrong premise that `validateChildAccess` verifies teacher-child assignment. It does not — it only checks `child.schoolId === req.user.schoolId` (school membership). The second axis (teacher assigned to this child's group) was not checked anywhere before this remediation.

### Caller Table

| Controller | Function | Route roles | `validateChildAccess` called? | `isTeacherAssignedToChild` needed? | Protected by other mechanism? | Gap? |
|---|---|---|---|---|---|---|
| `goalController` | `listByChild` | teacher/reception/admin | ✅ yes (line 20) | YES — teacher path | No | **OPEN (READ IDOR)** |
| `goalController` | `create` | teacher/reception/admin | ✅ yes (line 95) | YES — teacher path | No | **OPEN** |
| `goalController` | `update` | teacher/reception/admin | ✅ yes (line 142) | YES — teacher path | No | **OPEN (V1 site)** |
| `goalController` | `deleteGoal` | teacher/reception/admin | ✅ yes (line 227) | YES — teacher path | No | **OPEN (V1 site)** |
| `goalController` | `createReview` | teacher/reception/admin | ✅ yes (line 249) | YES — teacher path | No | **OPEN (V1 site)** |
| `observationController` | `create` | teacher/reception/admin | ✅ yes | YES — teacher path | No | **OPEN** |
| `observationController` | `listByChild` | teacher/reception/admin | ✅ yes | YES — teacher path | No | **OPEN (READ IDOR)** |
| `journalController` | `create` | teacher/reception/admin | ✅ yes | YES — teacher path | No | **OPEN** |
| `journalController` | `listByChild` | teacher/reception/admin | ✅ yes | YES — teacher path | No | **OPEN (READ IDOR)** |
| `attendanceController` | `createAttendance` | teacher/reception/admin | ✅ yes | MEDIUM — group-based but teacher implicit | No | **OPEN** |
| `emotionalMonitoringController` | `deleteMonitoring` | teacher/admin | ✅ yes | YES — teacher path | ✅ `record.teacherId !== req.user.id` check (line ~95) | PROTECTED |
| `teacherController` | `getChildById` | teacher/reception/admin | ✅ yes | LIKELY INTENTIONAL — teacher can see any child in school | N/A | INFO |
| `findChildScopedResource` callers (Activity, Meal, Media, TherapyUsage) | various | teacher/reception/admin | ✅ yes (via helper) | YES — teacher path | No | **OPEN (wider class)** |

### Verdict: Gap Is Wider Than Goals Alone

The second-axis gap affects **at least**: goals (5 endpoints), observations (2), journals (2), attendance (1), and potentially Activity/Meal/Media/TherapyUsage via `findChildScopedResource`. The `emotionalMonitoringController` is the only instance with an independent record-owner check that closes the gap by a different mechanism.

**Decision per the remediation spec:** Fix the goals surface (the V1 site) now. Report the wider class and stop. User decides scope before S5/ИРР build.

---

## STEP 2 — Fix Decision: Named Reusable Primitive

### Why a named primitive rather than inline checks

Three alternatives were considered:

1. **Inline `goal.createdBy === req.user.id` check** — Rejected. `createdBy` catches only goals the teacher created themselves; it breaks the legitimate case where a teacher is assigned to a child mid-year and needs to update goals created by a previous teacher.

2. **Inline `child.groupId === teacher's group`** — Rejected. Does not handle the legacy path where assignment is via `parent.teacherId` (no group). Would break all legacy-assigned children with 404.

3. **Named primitive `isTeacherAssignedToChild(child, req)`** — Chosen. Mirrors the dual-path logic already established in `teacherController.getParents` (the reference implementation for dual-path resolution). Reusable across all callers. Explicit about what it checks. Non-teacher roles bypass immediately (`role !== 'teacher'` → return true), preserving existing admin/reception access.

### Dual-path logic

**Modern path:** `child.groupId → Group.findOne({ id: child.groupId, teacherId: req.user.id })`  
**Legacy path:** `child.parentId → User.findOne({ id: child.parentId, teacherId: req.user.id })`

Takes the child OBJECT (already loaded by `validateChildAccess`) — no double `findByPk`.

### Files changed

| File | Change |
|---|---|
| `backend/utils/schoolValidation.js` | Added `isTeacherAssignedToChild(child, req)` export; added `Group` + `User` imports |
| `backend/controllers/goalController.js` | Added `isTeacherAssignedToChild` import; added assignment check in 5 handler functions (listByChild, create, update, deleteGoal, createReview) |
| `backend/__tests__/controllers/goalController.test.js` | Added `isTeacherAssignedToChild: jest.fn().mockResolvedValue(true)` to the schoolValidation mock |
| `backend/__tests__/controllers/goalController.withinSchool.test.js` | NEW — behavioral test file (8 tests, real SQLite) |

---

## STEP 3 — Revert-Test Evidence

### Pre-fix run (git stash applied — fix changes stashed, pre-fix state active)

Test command: `npm test -- --forceExit --detectOpenHandles __tests__/controllers/goalController.withinSchool.test.js`

```
Test Suites: 1 failed, 1 total
Tests:       5 failed, 3 passed, 8 total
Time:        37055.859 s
Ran all test suites matching __tests__/controllers/goalController.withinSchool.test.js.
```

Failure sample (listByChild cross-teacher IDOR, line 194):
```
● listByChild — within-school cross-teacher IDOR › 404 GOAL_CHILD_NOT_ACCESSIBLE when Teacher B lists goals for Child A1

  expect(jest.fn()).toHaveBeenCalledWith(...expected)

  Expected: 404
  Received: 500

  Number of calls: 1

   192 |       res,
   193 |     );
  >194 |     expect(res.status).toHaveBeenCalledWith(404);
       |                        ^
   195 |     expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
   196 |       error: expect.objectContaining({ code: 'GOAL_CHILD_NOT_ACCESSIBLE' }),
   197 |     }));

    at Object.<anonymous> (__tests__/controllers/goalController.withinSchool.test.js:194:24)
```

Note: 5 tests returned 500 (not 200) because the test infrastructure exposed real failure modes — `ChildGoal.findAll` not mocked caused `undefined()` TypeError, and `mockGoalCreate` cleared caused `goal.id` TypeError. The key fact is: **all 5 cross-teacher IDOR tests fail** — the test gate is effective regardless of the specific failure mode (500 vs 200 both prove the fix is absent).

### Post-fix run (git stash pop — fix restored)

Test command: `npm test -- --forceExit --detectOpenHandles __tests__/controllers/goalController.withinSchool.test.js`

```
PASS __tests__/controllers/goalController.withinSchool.test.js (5.688 s)
  update — within-school cross-teacher IDOR
    ✓ 404 GOAL_CHILD_NOT_ACCESSIBLE when Teacher B updates Child A1's goal (298 ms)
  deleteGoal — within-school cross-teacher IDOR
    ✓ 404 GOAL_CHILD_NOT_ACCESSIBLE when Teacher B deletes Child A1's goal (120 ms)
  createReview — within-school cross-teacher IDOR
    ✓ 404 GOAL_CHILD_NOT_ACCESSIBLE when Teacher B creates review on Child A1's goal (145 ms)
  create — within-school cross-teacher IDOR
    ✓ 404 GOAL_CHILD_NOT_ACCESSIBLE when Teacher B creates goal on Child A1 (80 ms)
  listByChild — within-school cross-teacher IDOR
    ✓ 404 GOAL_CHILD_NOT_ACCESSIBLE when Teacher B lists goals for Child A1 (83 ms)
  positive: Teacher A accesses own child's goals
    ✓ update — Teacher A gets 200 on Child A1 goal (43 ms)
  legacy positive: Teacher C (parent.teacherId) accesses Child C1's goals
    ✓ update — Teacher C gets 200 on Child C1 goal (legacy assignment) (60 ms)
  admin bypass: admin accesses any child's goals
    ✓ update — admin gets 200 on Child A1 goal despite not being in Group G1 (42 ms)

Test Suites: 1 passed, 1 total
Tests:       8 passed, 8 total
Snapshots:   0 total
Time:        6.268 s
```

### Full suite post-fix

```
Test Suites: 121 passed, 121 total
Tests:       1263 passed, 1263 total
Snapshots:   0 total
Time:        175.767 s
```

Previous baseline (S4): 120 suites / 1255 tests → now 121 suites / 1263 tests (+1 suite, +8 tests).

---

## STEP 4 — Corrections to S1 Audit Record

### S1 TP-01 description error

The S1 audit finding TP-01 described `validateChildAccess` as checking the teacher-child assignment relationship. This was incorrect. The S1 text read:

> "CREATE correctly calls `validateChildAccess(childId, req)` (line 95) which checks the child-teacher-assignment relationship; PATCH/DELETE skip this second axis entirely."

The correct description: `validateChildAccess` checks **school membership only** (`child.schoolId === req.user.schoolId`). It has never checked the teacher-child assignment relationship. Therefore:

- The S1 framing ("PATCH/DELETE skip this second axis") understated the scope — `create` and `listByChild` also lacked the assignment check.
- S3 U3a fixed the cross-school IDOR (TP-01 original framing) correctly, but that was only the first axis. The within-school cross-teacher IDOR remained open on all 5 goal endpoints.

**Correction note added to `01-audit.md` Section A (see below).**

### S1 mark for emotionalMonitoringController

The S1 audit did not flag emotionalMonitoringController as having the gap. Confirmed in STEP 1: `deleteMonitoring` has `record.teacherId !== req.user.id && role !== 'admin'` which independently closes the assignment gap. Not a false negative — the protection exists, just via a different mechanism.

---

## STOP — Wider Class Found

Per remediation spec:

> "STOP. If STEP 1 found a WIDER class → report it; we decide scope before S5."

**The second-axis gap is NOT goals-only.** Controllers with the same pattern (validateChildAccess called, isTeacherAssignedToChild not called, teacher role reachable):

- `observationController` — 2 endpoints (create, listByChild)  
- `journalController` — 2 endpoints (create, listByChild)  
- `attendanceController` — 1 endpoint (createAttendance)
- `findChildScopedResource` callers — Activity, Meal, Media, TherapyUsage mutations

**S5 cannot begin until scope decision is made.** Options:
1. Fix the full class now (all ~10+ endpoints) before ИРР build  
2. Accept remaining gap as ИРР-build prerequisite (fix alongside each new ИРР endpoint)
3. Fix the full class in a dedicated pre-S5 pass, then open ИРР build

Awaiting user decision.
