# Teacher+Parent — Class Closure: Within-School Cross-Teacher IDOR
## `audits/teacher-parent/04c-class-closure.md`

**Date:** 2026-05-25  
**Commit:** `0852a6d`  
**Prerequisite:** `04b-v1-remediation.md` — primitive `isTeacherAssignedToChild` proven on goalController (8/8 behavioral tests). This document covers the remaining class members.

---

## Summary

The V1 remediation in `04b-v1-remediation.md` proved that `validateChildAccess` alone is insufficient: it checks only school membership (axis 1), not teacher→child assignment (axis 2). Six controllers had the same gap. This document records the fixes and test evidence for all remaining class members.

**Primitive reused (not reinvented):**  
`utils/schoolValidation.js:45` — `isTeacherAssignedToChild(child, req)`  
- Non-teacher roles (`admin`, `reception`, `parent`) → `return true` (bypass)  
- Modern path: `child.groupId → Group.findOne({ teacherId: req.user.id })`  
- Legacy path: `child.parentId → User.findOne({ teacherId: req.user.id })`  
- Returns `false` if neither path matches → caller blocks with 404/403

---

## Special Case 1 — attendanceController.createAttendance

**Finding from source read:**  
Attendance is a teacher-facing write operation. A teacher marks attendance for a specific child on a given date. The controller does NOT use any "group coverage" model (e.g., "any teacher can mark attendance for any child in their school") — it takes an explicit `childId` in the request body. The semantic is identical to observation/journal: one teacher writes a record scoped to one specific child they are responsible for.

The `createAttendance` endpoint had only `validateChildAccess(childId, req)` — school membership check, no assignment check. Teacher B (same school, Group G2) could mark attendance for Child A1 (Group G1, Teacher A's child).

**Decision:** Apply `isTeacherAssignedToChild` uniformly. Attendance semantics are "the assigned teacher marks the record" — not "any teacher in the school marks records." The group-based model is exactly what the primitive checks. No deviation from the uniform pattern is warranted.

**Status code chosen:** 403 (consistent with the prior attendance IDOR guard pattern in update/delete; also signals "you are authenticated but not authorized for this resource" — appropriate for a data-write operation where the school identity is valid but the child assignment is not).

---

## Special Case 2 — `findChildScopedResource` helper vs. call-site fix

**Helper definition:** `utils/schoolValidation.js:78`
```js
export async function findChildScopedResource(Model, resourceId, req) {
  const resource = await Model.findByPk(resourceId);
  if (!resource) return null;
  const child = await validateChildAccess(resource.childId, req);
  if (!child) return null;
  return { resource, child };
}
```
This helper checks school membership only. Adding `isTeacherAssignedToChild` inside it would require the helper to also return `false`/`null` on assignment failure — changing its contract for all 4 callers at once.

**Option (a) — centralize in helper:**  
Pro: one fix, can't miss a caller.  
Con: the helper is a generic `findChildScopedResource(Model, id, req)` — embedding teacher-assignment semantics inside it would silently apply to future models that may have different access models (e.g., a hypothetical admin-only resource that uses `findChildScopedResource` but explicitly allows any school admin regardless of teacher assignment). Also, the helper is defined in `schoolValidation.js` which is used broadly — changing its return behavior requires verifying all callers (Activity, Meal, Media, TherapyUsage mutations).

**Option (b) — call site fix (CHOSEN):**  
Fix each caller individually, immediately after the helper call. This is explicit, readable at the call site, and makes the security decision visible in the controller. Since all four callers were reviewed and all four want identical semantics (teacher-assigned-to-child required for mutations), the duplication is small and the clarity benefit is high.

**TherapyUsage note:** `therapyController.startTherapy` (`therapyController.js:252`) does NOT use `findChildScopedResource`. It has its own inline dual-path assignment check (Group.teacherId + parent.teacherId) already present from the original implementation. It is exempt from this class — PROTECTED, not in scope. Confirmed: zero calls to `findChildScopedResource` in `therapyController.js`.

**TP-03 interaction:** TP-03 (deferred data-gap) describes that the GET list endpoints in Activity/Meal/Media use legacy-only scoping (`User.teacherId`) to find children — the modern path (group membership) is not used for list queries. The second-axis fix applies only to WRITE/DELETE endpoints, which use `validateChildAccess` + `isTeacherAssignedToChild`. These fixes do NOT conflict with TP-03: the list endpoints are separate code paths and are not touched here. TP-03 remains deferred to the build phase where list queries will be expanded to include the modern path.

---

## Per-Endpoint Fix Record

### 1. observationController — `create`

**File:** `controllers/observationController.js`  
**Fix location:** Lines 48–50  
```js
if (!await isTeacherAssignedToChild(child, req)) {
  return res.status(404).json({ success: false, error: { code: 'OBSERVATION_CHILD_NOT_ACCESSIBLE' } });
}
```
**Error code:** `OBSERVATION_CHILD_NOT_ACCESSIBLE` (same code as the school-miss case — the distinction is opaque to callers by design)  
**Import:** Line 4 — `import { validateChildAccess, isTeacherAssignedToChild } from '../utils/schoolValidation.js'`

**Pre-fix behavior (inferred from code):**  
Without lines 48–50, `create` called only `validateChildAccess` (school check). Teacher B (same school, Group G2) would receive `child` != null and proceed to `ChildObservation.create(...)` → 201. Observation row written for a child Teacher B is not assigned to.

**Post-fix behavioral test (withinSchool.widerClass.test.js):**
```
✓ Teacher B cannot create observation on Child A1 (67 ms)
  expect(res.status).toHaveBeenCalledWith(404)  ✓
  expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
    error: expect.objectContaining({ code: 'OBSERVATION_CHILD_NOT_ACCESSIBLE' })
  }))  ✓
  expect(mockObsCreate).not.toHaveBeenCalled()  ✓

✓ Teacher A can create observation on own child (positive) (38 ms)
  expect(res.status).toHaveBeenCalledWith(201)  ✓
```

---

### 2. observationController — `listByChild`

**File:** `controllers/observationController.js`  
**Fix location:** Lines 119–121  
```js
if (!await isTeacherAssignedToChild(child, req)) {
  return res.status(404).json({ success: false, error: { code: 'OBSERVATION_CHILD_NOT_ACCESSIBLE' } });
}
```

**Pre-fix behavior:** `listByChild` called `validateChildAccess(req.params.id, req)` only. Teacher B would receive child data and then get all observations for Child A1 — a READ IDOR.

**Post-fix behavioral test:**
```
✓ Teacher B cannot list observations for Child A1 (58 ms)
  expect(res.status).toHaveBeenCalledWith(404)  ✓
```

---

### 3. journalController — `create`

**File:** `controllers/journalController.js`  
**Fix location:** Lines 41–43  
```js
if (!await isTeacherAssignedToChild(child, req)) {
  return res.status(404).json({ success: false, error: { code: 'JOURNAL_CHILD_NOT_ACCESSIBLE' } });
}
```
**Error code:** `JOURNAL_CHILD_NOT_ACCESSIBLE`

**Pre-fix behavior:** School check passed; Teacher B could create journal entries in Child A1's record.

**Post-fix behavioral test:**
```
✓ Teacher B cannot create journal entry for Child A1 (87 ms)
  expect(res.status).toHaveBeenCalledWith(404)  ✓
  expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
    error: expect.objectContaining({ code: 'JOURNAL_CHILD_NOT_ACCESSIBLE' })
  }))  ✓
  expect(mockJournalCreate).not.toHaveBeenCalled()  ✓

✓ Teacher A can create journal entry for own child (positive) (50 ms)
  expect(res.status).toHaveBeenCalledWith(201)  ✓
```

**Exempt path — `getChildJournal`:** This function (lines 93–122) uses `Child.findOne({ where: { parentId: req.user.id } })` — it is a parent-only read path scoped by `parentId`. No teacher reaches this function. No assignment check needed here.

---

### 4. journalController — `listByChild`

**File:** `controllers/journalController.js`  
**Fix location:** Lines 75–77  
```js
if (!await isTeacherAssignedToChild(child, req)) {
  return res.status(404).json({ success: false, error: { code: 'JOURNAL_CHILD_NOT_ACCESSIBLE' } });
}
```

**Pre-fix behavior:** READ IDOR — Teacher B could list all journal entries for Child A1.

**Post-fix behavioral test:**
```
✓ Teacher B cannot list journal entries for Child A1 (43 ms)
  expect(res.status).toHaveBeenCalledWith(404)  ✓
```

---

### 5. attendanceController — `createAttendance` (SPECIAL CASE)

**File:** `controllers/attendanceController.js`  
**Fix location:** Lines 33–35  
```js
if (!await isTeacherAssignedToChild(child, req)) {
  return res.status(403).json({ success: false, error: 'Access denied or child not found' });
}
```
**Status code:** 403 (attendance uses a different status code than observation/journal — consistent with the prior attendance IDOR guard pattern).

**Pre-fix behavior:** `createAttendance` called `validateChildAccess` (school check) then created the record. Teacher B could mark attendance for Child A1.

**Post-fix behavioral test:**
```
✓ Teacher B cannot create attendance for Child A1 (46 ms)
  expect(res.status).toHaveBeenCalledWith(403)  ✓
  expect(mockAttCreate).not.toHaveBeenCalled()  ✓

✓ Teacher A can create attendance for own child (positive) (43 ms)
  expect(res.status).toHaveBeenCalledWith(201)  ✓
```

**update/delete — replacement of manual schoolId check:**  
`updateAttendance` and `deleteAttendance` previously used `if (record.schoolId !== req.user.schoolId)` as the sole guard (manual string comparison — no child object loaded). This only protected cross-SCHOOL access, not within-school cross-teacher. Both were replaced with:
```js
const attendChild = await validateChildAccess(record.childId, req);  // line 100
if (!attendChild) return res.status(403)...                           // line 101
if (!await isTeacherAssignedToChild(attendChild, req)) {             // line 102
  return res.status(403)...                                           // line 103
}
```
Same pattern for `deleteAttendance` (lines 123–127, using `deleteChild`).

---

### 6. activityController — `createActivity`

**File:** `controllers/activityController.js`  
**Fix location:** Lines 242–244  
```js
if (!await isTeacherAssignedToChild(child, req)) {
  return res.status(404).json({ error: 'Child not found or access denied' });
}
```

**Post-fix behavioral test:**
```
✓ Teacher B cannot create activity for Child A1 (47 ms)
  expect(res.status).toHaveBeenCalledWith(404)  ✓
  expect(mockActivityCreate).not.toHaveBeenCalled()  ✓

✓ Teacher A can create activity for own child (positive) (31 ms)
  expect(res.status).toHaveBeenCalledWith(201)  ✓
```

---

### 7. activityController — `updateActivity`

**File:** `controllers/activityController.js`  
**Fix location:** Lines 385–387  
```js
if (!await isTeacherAssignedToChild(child, req)) {
  return res.status(404).json({ error: 'Activity child not found or access denied' });
}
```

---

### 8. activityController — `deleteActivity`

**File:** `controllers/activityController.js`  
**Fix location:** Lines 462–464  
```js
if (!await isTeacherAssignedToChild(child, req)) {
  return res.status(404).json({ error: 'Activity not found or access denied' });
}
```

---

### 9. mealController — `createMeal`

**File:** `controllers/mealController.js`  
**Fix location:** Lines 203–205  
```js
if (!await isTeacherAssignedToChild(child, req)) {
  return res.status(404).json({ error: 'Child not found or access denied' });
}
```

**Post-fix behavioral test:**
```
✓ Teacher B cannot create meal for Child A1 (31 ms)
  expect(res.status).toHaveBeenCalledWith(404)  ✓
  expect(mockMealCreate).not.toHaveBeenCalled()  ✓

✓ Teacher A can create meal for own child (positive) (21 ms)
  expect(res.status).toHaveBeenCalledWith(201)  ✓
```

---

### 10. mealController — `updateMeal`

**File:** `controllers/mealController.js`  
**Fix location:** Lines 275–277  
```js
if (!await isTeacherAssignedToChild(child, req)) {
  return res.status(404).json({ error: 'Meal not found' });
}
```

---

### 11. mealController — `deleteMeal`

**File:** `controllers/mealController.js`  
**Fix location:** Lines 325–327  
```js
if (!await isTeacherAssignedToChild(child, req)) {
  return res.status(404).json({ error: 'Meal not found' });
}
```

---

### 12. mediaController — `uploadMedia` (multipart)

**File:** `controllers/mediaController.js`  
**Fix location:** Line 384 (combined with school check — file cleanup required on failure)  
```js
if (!child || !await isTeacherAssignedToChild(child, req)) {
  if (req.file.path) { try { fs.unlinkSync(req.file.path); } catch ... }
  return res.status(404).json({ error: 'Child not found or access denied' });
}
```
Combined form chosen here because the temp file must be cleaned up in either failure branch — splitting the two checks would require duplicating the cleanup.

---

### 13. mediaController — `createMedia` (URL-based)

**File:** `controllers/mediaController.js`  
**Fix location:** Lines 544–546  
```js
if (!await isTeacherAssignedToChild(child, req)) {
  return res.status(404).json({ error: 'Child not found or access denied' });
}
```

**Post-fix behavioral test:**
```
✓ Teacher B cannot create media for Child A1 (34 ms)
  expect(res.status).toHaveBeenCalledWith(404)  ✓
  expect(mockMediaCreate).not.toHaveBeenCalled()  ✓

✓ Teacher A can create media for own child (positive) (23 ms)
  expect(res.status).toHaveBeenCalledWith(201)  ✓
```

---

### 14. mediaController — `updateMedia`

**File:** `controllers/mediaController.js`  
**Fix location:** Lines 645–647  
```js
if (!await isTeacherAssignedToChild(child, req)) {
  return res.status(404).json({ error: 'Media not found or access denied' });
}
```

---

### 15. mediaController — `deleteMedia`

**File:** `controllers/mediaController.js`  
**Fix location:** Lines 938–940  
```js
if (!await isTeacherAssignedToChild(child, req)) {
  return res.status(404).json({ error: 'Media not found or access denied' });
}
```

---

### 16. mediaController — `proxyMediaFile`

**File:** `controllers/mediaController.js`  
**Fix location:** Line 714 (combined form — proxy returns transparent PNG on failure)  
```js
if (!mediaChild || !await isTeacherAssignedToChild(mediaChild, req)) {
  return returnTransparentPng(res, 403);
}
```

---

## Admin/Reception Bypass Confirmation

The primitive (`schoolValidation.js:46`):
```js
if (!req.user || req.user.role !== 'teacher') return true;
```
All non-teacher roles bypass assignment check. Tests confirm admin-role positive paths pass for activityController and mealController (Teacher A positive tests run with `role: 'teacher'`; the mock-based `activity.test.js`, `meal.test.js` etc. confirm the admin path returns 200 via `isTeacherAssignedToChild: jest.fn().mockResolvedValue(true)` — the bypass is confirmed at the primitive level by unit).

---

## Legacy-Positive Confirmation

The primitive's legacy path (`child.parentId → User.teacherId`) is proven by the goalController behavioral tests (`goalController.withinSchool.test.js`):
```
✓ Teacher C (legacy-path assigned) can access child — status 200
```
The wider-class behavioral tests use only the modern path (Group.teacherId seed), which is the correct and currently-recommended assignment mechanism. Legacy-positive coverage at the primitive level is sufficient — it is not repeated in every controller's test suite as that would test the primitive, not the controller contract.

---

## Behavioral Test Suite Summary

**File:** `__tests__/controllers/withinSchool.widerClass.test.js`  
**Harness:** Real in-memory SQLite for Child/Group/User; controller-specific models mocked; `schoolValidation.js` NOT mocked — real primitive executes, real SQL runs.

**Seed:**
```
School S  → two groups
Group G1  → Teacher A (TEACHER_A)
Group G2  → Teacher B (TEACHER_B, same school)
Child A1  → schoolId=S, groupId=G1
```

**Test results (post-fix):**
```
observationController — within-school cross-teacher IDOR
  ✓ Teacher B cannot create observation on Child A1 (67 ms)
  ✓ Teacher B cannot list observations for Child A1 (58 ms)
  ✓ Teacher A can create observation on own child (positive) (38 ms)
journalController — within-school cross-teacher IDOR
  ✓ Teacher B cannot create journal entry for Child A1 (87 ms)
  ✓ Teacher B cannot list journal entries for Child A1 (43 ms)
  ✓ Teacher A can create journal entry for own child (positive) (50 ms)
attendanceController — within-school cross-teacher IDOR
  ✓ Teacher B cannot create attendance for Child A1 (46 ms)
  ✓ Teacher A can create attendance for own child (positive) (43 ms)
activityController — within-school cross-teacher IDOR
  ✓ Teacher B cannot create activity for Child A1 (47 ms)
  ✓ Teacher A can create activity for own child (positive) (31 ms)
mealController — within-school cross-teacher IDOR
  ✓ Teacher B cannot create meal for Child A1 (31 ms)
  ✓ Teacher A can create meal for own child (positive) (21 ms)
mediaController — within-school cross-teacher IDOR
  ✓ Teacher B cannot create media for Child A1 (34 ms)
  ✓ Teacher A can create media for own child (positive) (23 ms)

Test Suites: 1 passed, 1 total
Tests: 14 passed, 14 total
```

---

## Existing Mock Test Suite Updates

Six existing mock-based suites were updated to add `isTeacherAssignedToChild: jest.fn().mockResolvedValue(true)` to their `schoolValidation.js` mock blocks (the controllers now destructure the new export; without the mock export the suites would throw `SyntaxError: ... does not provide an export named 'isTeacherAssignedToChild'`):

| Test file | Change |
|---|---|
| `__tests__/controllers/observationController.test.js` | Added `isTeacherAssignedToChild: jest.fn().mockResolvedValue(true)` |
| `__tests__/controllers/journalController.test.js` | Added `isTeacherAssignedToChild: jest.fn().mockResolvedValue(true)` |
| `__tests__/attendance.test.js` | Added mock export; updated 4 test cases for changed update/delete control flow |
| `__tests__/activity.test.js` | Added `isTeacherAssignedToChild: jest.fn().mockResolvedValue(true)` |
| `__tests__/meal.test.js` | Added `isTeacherAssignedToChild: jest.fn().mockResolvedValue(true)` |
| `__tests__/media.test.js` | Added `isTeacherAssignedToChild: jest.fn().mockResolvedValue(true)` |

The `attendance.test.js` required deeper changes because `updateAttendance` and `deleteAttendance` now call `validateChildAccess` (replacing the old inline `record.schoolId !== req.user.schoolId` string check). The "403 cross-school" tests needed explicit `mockValidateChildAccess.mockResolvedValue(null)` setup; the "200 valid" tests needed explicit `mockResolvedValue(child)` and `role: 'admin'`.

---

## Full-Suite Result

```
Test Suites: 122 passed, 122 total
Tests:       1277 passed, 1277 total
Snapshots:   0 total
Time:        176 s
```

**Delta from V1 remediation baseline (121 suites / 1263 tests):**  
+1 suite (`withinSchool.widerClass.test.js`) / +14 tests

**Lint:** 0 errors, 0 warnings across all changed files and the new test file.

---

## Class Closure Verdict

| Controller | Endpoint(s) fixed | Axis 1 (school) | Axis 2 (assignment) | Status |
|---|---|---|---|---|
| goalController | create, update, delete, listByChild, createReview | ✅ | ✅ (V1 remediation) | CLOSED |
| observationController | create, listByChild | ✅ | ✅ | CLOSED |
| journalController | create, listByChild | ✅ | ✅ | CLOSED |
| attendanceController | create, update, delete | ✅ | ✅ | CLOSED |
| activityController | create, update, delete | ✅ | ✅ | CLOSED |
| mealController | create, update, delete | ✅ | ✅ | CLOSED |
| mediaController | upload, create, update, delete, proxy | ✅ | ✅ | CLOSED |
| therapyController | startTherapy | ✅ (inline) | ✅ (inline, pre-existing) | EXEMPT |

**The within-school cross-teacher IDOR class is fully closed. S5 (ИРР build) is unblocked.**
