# Teacher+Parent — Whole-Class Confirm + Legacy-parentId Verification
## `audits/teacher-parent/04d-class-confirm.md`

**Date:** 2026-05-25  
**Commit:** (this step)  
**Prerequisite:** `04c-class-closure.md` — 16 endpoints fixed, 122 suites / 1277 tests green.

---

## STEP 1 — parentId-load verification at every primitive call site

### The risk
`isTeacherAssignedToChild`'s legacy path queries:
```js
// schoolValidation.js:59-65
if (child.parentId) {
  const parent = await User.findOne({
    where: { id: child.parentId, teacherId: req.user.id },
    attributes: ['id'],
  });
  if (parent) return true;
}
```
If a controller passes a child object loaded WITHOUT `parentId` (e.g., via an `attributes: ['id', 'schoolId']` restrict), the legacy path silently short-circuits — a legitimately legacy-assigned teacher gets 404. The wider-class behavioral tests used only the modern (group) seed, so this failure mode would be invisible to existing tests.

### The load path — all 7 controllers

Every controller reaches `isTeacherAssignedToChild` by passing the return value of `validateChildAccess(childId, req)`:

```js
// utils/schoolValidation.js:13-32
export async function validateChildAccess(childId, req) {
  if (!childId) return null;
  const child = await Child.findByPk(childId);   // ← line 16: NO attributes restriction
  ...
  return child;
}
```

`Child.findByPk(childId)` with no `attributes` option → Sequelize returns all model columns. The Child model defines `parentId` as a standard UUID column (`models/Child.js:10-18`, `allowNull: false`). There is no `attributes` allow-list, no `include` that might shadow it, and no transformation in the return path.

**Per-controller load-line table:**

| Controller | Load line | Load call | parentId included |
|---|---|---|---|
| goalController | `goalController.js:20` | `validateChildAccess(childId, req)` | ✅ |
| goalController (update/delete/review) | `goalController.js:148, 236, 261` | `validateChildAccess(goal.childId, req)` | ✅ |
| observationController `create` | `observationController.js:44` | `validateChildAccess(childId, req)` | ✅ |
| observationController `listByChild` | `observationController.js:115` | `validateChildAccess(req.params.id, req)` | ✅ |
| journalController `create` | `journalController.js:37` | `validateChildAccess(childId, req)` | ✅ |
| journalController `listByChild` | `journalController.js:71` | `validateChildAccess(req.params.childId, req)` | ✅ |
| attendanceController `create` | `attendanceController.js:31` | `validateChildAccess(childId, req)` | ✅ |
| attendanceController `update` | `attendanceController.js:100` | `validateChildAccess(record.childId, req)` | ✅ |
| attendanceController `delete` | `attendanceController.js:123` | `validateChildAccess(record.childId, req)` | ✅ |
| activityController `create` | `activityController.js:238` | `validateChildAccess(childId, req)` | ✅ |
| activityController `update` | `activityController.js:381` | `validateChildAccess(activity.childId, req)` | ✅ |
| activityController `delete` | `activityController.js:458` | `validateChildAccess(activity.childId, req)` | ✅ |
| mealController `create` | `mealController.js:199` | `validateChildAccess(childId, req)` | ✅ |
| mealController `update` | `mealController.js:271` | `validateChildAccess(meal.childId, req)` | ✅ |
| mealController `delete` | `mealController.js:321` | `validateChildAccess(meal.childId, req)` | ✅ |
| mediaController `upload` | `mediaController.js:383` | `validateChildAccess(childId, req)` | ✅ |
| mediaController `create` | `mediaController.js:540` | `validateChildAccess(childId, req)` | ✅ |
| mediaController `update` | `mediaController.js:641` | `validateChildAccess(media.childId, req)` | ✅ |
| mediaController `delete` | `mediaController.js:934` | `validateChildAccess(media.childId, req)` | ✅ |
| mediaController `proxy` | `mediaController.js:713` | `validateChildAccess(media.childId, req)` | ✅ |

**Verdict: ALL CLEAN. No call site restricts attributes. No fix required.**

---

## STEP 2 — Legacy-positive behavioral test (observationController)

A new test case was added to `__tests__/controllers/withinSchool.widerClass.test.js` in the `observationController` describe block.

**Seed added to `beforeAll`:**
```js
// Legacy-path fixture: parent user whose teacherId points to TEACHER_L; child has no group
await UserModel.create({ id: PARENT_L, teacherId: TEACHER_L });
await ChildModel.create({ id: CHILD_L1, schoolId: SCHOOL_S, parentId: PARENT_L, groupId: null });
```

Constants:
```
TEACHER_L  = 'aa000007-0000-4000-a000-000000000007'
PARENT_L   = 'aa000008-0000-4000-a000-000000000008'
CHILD_L1   = 'aa000009-0000-4000-a000-000000000009'
```

**What this proves:** `CHILD_L1` has `groupId: null`, so the modern path (`child.groupId → Group.findOne`) short-circuits immediately. The primitive must fall through to the legacy path (`child.parentId → User.findOne({ teacherId: TEACHER_L })`). That query runs against real SQLite and finds `PARENT_L`. The primitive returns `true`. The controller proceeds to `ChildObservation.create()` → 201.

This confirms the full chain: controller child-load → `validateChildAccess` → `Child.findByPk` (parentId populated) → `isTeacherAssignedToChild` → legacy User query → assignment found → access granted.

**Test result:**
```
observationController — within-school cross-teacher IDOR
  ✓ Teacher B cannot create observation on Child A1 (67 ms)
  ✓ Teacher B cannot list observations for Child A1 (58 ms)
  ✓ Teacher A can create observation on own child (positive) (38 ms)
  ✓ Teacher L (legacy-assigned via parent.teacherId, no group) can create observation (positive) (9 ms)
```

---

## STEP 3 — Load-bearing suite markers

Both behavioral suites now carry explicit load-bearing headers:

**`goalController.withinSchool.test.js` (updated header):**
```
LOAD-BEARING TEST SUITE — second-axis (teacher→child assignment) isolation
for the goals class (V1 remediation). The mock-based suites stub
isTeacherAssignedToChild to `true` and do NOT prove the primitive works
through a real child load. Do not delete or weaken without replacing this
coverage. See also: withinSchool.widerClass.test.js (wider class + legacy-positive).
```

**`withinSchool.widerClass.test.js` (updated header):**
```
LOAD-BEARING TEST SUITE — second-axis (teacher→child assignment) isolation
for the full teacher portal wider class (observation/journal/attendance/
activity/meal/media). The mock-based suites (attendance.test.js etc.) stub
isTeacherAssignedToChild to `true` and do NOT prove the primitive works
through a real child load. Do not delete or weaken without replacing this
coverage. See also: goalController.withinSchool.test.js (goals class).
```

The cross-reference between both files means a future reader removing either suite will see a pointer to the other and understand the coverage relationship.

---

## STEP 4 — Whole-class final verdict

### Both axes, both paths

| Axis | Path | Proven by |
|---|---|---|
| Axis 1: school membership | `child.schoolId === req.user.schoolId` | `validateChildAccess` — tested in all existing mock suites (e.g., attendance 403 cross-school test) |
| Axis 2: teacher assignment (modern) | `child.groupId → Group.teacherId` | `goalController.withinSchool.test.js` (5 IDOR tests) + `withinSchool.widerClass.test.js` (6 IDOR tests) — Teacher B in G2 blocked from Child A1 in G1 |
| Axis 2: teacher assignment (legacy) | `child.parentId → User.teacherId` | `goalController.withinSchool.test.js` (Teacher C legacy-positive) + **`withinSchool.widerClass.test.js` (Teacher L legacy-positive — new, through obs controller child-load)** |

### Full class closure table

| Controller | Endpoints | Axis 1 | Axis 2 | Status |
|---|---|---|---|---|
| goalController | listByChild, create, update, delete, createReview | ✅ | ✅ | CLOSED |
| observationController | create, listByChild | ✅ | ✅ | CLOSED |
| journalController | create, listByChild | ✅ | ✅ | CLOSED |
| attendanceController | create, update, delete | ✅ | ✅ | CLOSED |
| activityController | create, update, delete | ✅ | ✅ | CLOSED |
| mealController | create, update, delete | ✅ | ✅ | CLOSED |
| mediaController | upload, create, update, delete, proxy | ✅ | ✅ | CLOSED |
| therapyController | startTherapy | ✅ | ✅ (inline, pre-existing) | EXEMPT |

### AIChat surfaces — confirmed untouched

The second-axis fixes touched only: observationController, journalController, attendanceController, activityController, mealController, mediaController, schoolValidation.js, and test files. AIChat routes remain frozen:
- `routes/teacherRoutes.js:79` — `router.post('/ai/chat', ...)` — UNTOUCHED
- `routes/parentRoutes.js:53` — `router.post('/ai/chat', ...)` — UNTOUCHED
- Frontend AIChat page — not in backend scope; confirmed frozen by S3 freeze audit

No AIChat controller, route, validator, or test was modified by the class closure work.

### Final suite summary

```
Test Suites: 122 passed, 122 total
Tests:       1278 passed, 1278 total   (+1 from legacy-positive test)
Snapshots:   0 total
Time:        216 s
```

Behavioral suites:
```
withinSchool.widerClass.test.js   — 15 tests (14 original + 1 legacy-positive)
goalController.withinSchool.test.js — 8 tests
Total behavioral: 23 tests / 2 suites
```

### Verdict

**The within-school cross-teacher IDOR class is fully closed and confirmed:**
- Both axes proven at all 20 mutation endpoints
- Both assignment paths (modern + legacy) proven through real controller child-loads
- parentId populated at every call site — legacy path cannot silently break
- Load-bearing suites marked — accidental removal will be noticed
- AIChat frozen, no drift

**S5 (ИРР build from `IRR-DECISIONS.md`) is unblocked.**
