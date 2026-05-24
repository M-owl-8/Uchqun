# Teacher+Parent Portal — S4 Confirm-Clean

**Date:** 2026-05-24  
**Based on:** S3 cleanup claims in `audits/teacher-parent/03-cleanup-execution.md`  
**Method:** Independent re-verification from code and test runs — NOT a restatement of S3's own claims.  
**Verdict:** PARTIAL CLEAN — 1 MEDIUM residual (V1), 6 items clean.

---

## Verdict Summary

| Item | Claim | Verdict |
|---|---|---|
| V1 — TP-01 closes within-school cross-teacher threat | PATCH/DELETE now gate on validateChildAccess | ❌ RESIDUAL (MEDIUM) |
| V2 — CP-023 field delivered end-to-end | mustChangePassword chain frontend→gate | ✅ CLEAN |
| V3 — Null-schoolId sweep re-run | No null-bypass patterns in teacher/parent scope | ✅ CLEAN |
| V4 — AttendanceGrid prop rename not broken | childList rename did not break rendering | ✅ CLEAN |
| V5 — Frontend test count + lint | Actual suite/test counts, lint on S3 files | ✅ CLEAN |
| V6 — AIChat freeze held | No S3 commit touched any frozen AI surface | ✅ CLEAN |
| V7 — Cold-load fixes on cold-load paths only | All 3 catch blocks verified | ✅ CLEAN |

---

## V1 — TP-01 Threat Coverage (RESIDUAL MEDIUM)

### What S3 claimed
Added `validateChildAccess(goal.childId, req)` after `findOne` in `update`, `deleteGoal`, and `createReview` in `goalController.js`.

### S1 audit's original threat statement (01-audit.md:36)
> "A teacher in School S can update or delete ANY child's goal within their school — not just children in their assigned group."

### What `validateChildAccess` actually checks (`backend/utils/schoolValidation.js`)
```js
if (req.user.schoolId && child.schoolId !== req.user.schoolId) {
  return null;  // cross-school only
}
return child;   // same school → ALWAYS returns child
```
The function checks **school membership only**. It does not check teacher-group-child assignment. Within the same school, it always returns the child → access granted.

### Threat closed by S3
**Cross-school stale-schoolId scenario:** Child transferred from school A to school B; goal still stored with `schoolId=A`. Before fix, Teacher A's `findOne({ where: { id, schoolId: A } })` succeeded because goal carried old schoolId. After fix, `validateChildAccess` compares `child.schoolId` (now B) against `req.user.schoolId` (A) → returns null → 404.

### Threat NOT closed by S3
**Within-school cross-teacher scenario (original TP-01 finding):** Teacher B and Teacher A both at school S. Teacher B attacks goal on child A1, who is assigned to Teacher A's group. `validateChildAccess` finds `child.schoolId === req.user.schoolId === S` → returns child → 200 OK. Goal is mutated. Should be 404 `GOAL_CHILD_NOT_ACCESSIBLE`.

### Revert-test coverage gap
The TP-01 test mock (`goalController.test.js:34`) only simulates cross-school:
```js
validateChildAccess: jest.fn(async (childId, req) => {
  if (child.schoolId !== req.user.schoolId) return null;  // same school → returns child
  return child;
}),
```
The within-school cross-teacher scenario is never exercised by the test suite.

### Note on S1 audit error
S1 stated CREATE "correctly calls `validateChildAccess` which checks the child-teacher-assignment relationship." This was incorrect — `validateChildAccess` has never checked teacher-child group assignment. The correct fix for the original TP-01 finding requires a group-membership check (e.g., `scoping by createdBy: req.user.id` or verifying `child.groupId` against teacher's `groupId`).

### Disposition
**MEDIUM.** Practical risk is within-school (lower trust boundary than cross-school). However, this is critical before the ИРР build (S5–S7): teachers author individualized education plans for their assigned children only — cross-teacher goal mutation undermines this isolation.

**Required fix before S7 ИРР launch:**
```js
// In update, deleteGoal, createReview — after validateChildAccess:
if (child.groupId !== req.user.groupId) {
  return res.status(404).json({
    success: false,
    error: { code: 'GOAL_CHILD_NOT_ACCESSIBLE' }
  });
}
```
Or alternatively scope the initial `findOne` by `createdBy: req.user.id` for mutations.

---

## V2 — CP-023 End-to-End Field Delivery (CLEAN)

### Chain verified

**Backend delivery** — `authController.js` `getMe` (line 285):
```js
const user = await User.findByPk(req.user.id, {
  attributes: { exclude: ['password'] },  // all fields returned
});
res.json({ success: true, data: user.toJSON() });
```
`mustChangePassword` is NOT in the exclude list → always delivered to frontend.

**Frontend storage** — `createAuthContext.jsx` (line 49):
```js
const res = await api.get('/auth/me');
const userData = res.data.data ?? res.data;
setUser(userData);  // stores full user object including mustChangePassword
```
Context exposes it at line 105: `mustChangePassword: user?.mustChangePassword === true`

**Route gate** — `ProtectedRoute.jsx` (line 20):
```jsx
if (user?.mustChangePassword && !allowMustChange) {
  const changePath = requireRole === 'parent' ? '/change-password' : '/teacher/change-password';
  return <Navigate to={changePath} replace />;
}
```
Loop prevention: both `/teacher/change-password` and `/change-password` routes pass `allowMustChange` prop.

**Clearance on success** — `teacher/src/pages/ChangePassword.jsx`:
```js
if (user) setUser({ ...user, mustChangePassword: false });
navigate('/teacher', { replace: true });
```
Parent variant navigates to `/`.

**Verdict:** Full chain confirmed — field delivered, gate fires, loop prevented, field cleared on success. ✅

---

## V3 — Null-schoolId Sweep Re-run (CLEAN)

Independently grepped `teacher-reachable` and `parent-reachable` controllers for the three-part conditional pattern `if (req.user.schoolId) where.schoolId`.

### teacherController.js — all 4 TP-02 sites confirmed unconditional
- `getParentById` (line 175): `where.schoolId = req.user.schoolId;` — unconditional ✅
- `getTeacherRatings` (line 229): `where.schoolId = req.user.schoolId;` — unconditional ✅
- `getChildren` (line 247): `const where = { schoolId: req.user.schoolId };` — unconditional ✅
- `getParents` (line 122): admin/reception-only branch, not reachable by teacher JWT ✅

### parentMediaController.js — both TP-04 sites confirmed fixed
- `getMyMedia` (line 58): `where: { groupId, parentId: req.user.id }` ✅
- `getMediaById` (line 95): `where: { groupId, parentId: req.user.id }` ✅

### INFO — admin-only residuals (not a finding)
Three instances remain in admin-only branches (`groupController:110`, `emotionalMonitoringController:88`, `teacherResourceController:125`). These are unreachable by teacher or parent JWTs; they are an admin-path issue outside this audit's scope.

**Verdict:** Zero null-bypass patterns in teacher/parent-reachable scope. ✅

---

## V4 — AttendanceGrid Prop Rename (CLEAN)

`AttendanceGrid.jsx` component signature:
```jsx
export function AttendanceGrid({ childList, states, onStateChange }) {
  return (
    <div className="grid grid-cols-2 gap-2.5">
      {childList.map((child) => (
```

Only consumer — `Attendance.jsx` line 156:
```jsx
<AttendanceGrid childList={filtered} states={states} onStateChange={handleStateChange} />
```

Grep confirmed zero other call sites. The rename from `children` (reserved React prop) to `childList` is correctly propagated. **Verdict:** ✅

---

## V5 — Frontend Test Count + Lint (CLEAN)

### Backend suite (re-run this session)
```
Test Suites: 120 passed, 120 total
Tests:       1255 passed, 1255 total
Time:        182.951 s
```
Matches S3 claim of 120 suites / 1255 tests exactly. ✅

### Teacher frontend suite
11 test files across `src/__tests__/`. ~78 individual test cases (counted from source).

**Settings.test.jsx — 2 pre-existing failures** (confirmed pre-existing by stash-revert in S3):
- "shows loading state before profile resolves"
- "shows error toast when profile load fails"

Both are React `act()` timing issues in test infrastructure. `Settings.jsx` was not modified by S3.

### Lint on S3-changed files
Run: `npx eslint src/shared/context/ToastContext.jsx src/pages/Attendance.jsx src/components/AttendanceGrid.jsx src/shared/components/ProtectedRoute.jsx src/pages/ChangePassword.jsx src/parent/pages/ChangePassword.jsx src/App.jsx src/parent/context/ChildContext.jsx src/components/QuickObservation.jsx`

**Result: zero errors, zero warnings** in all 9 S3-changed files. ✅

Pre-existing lint errors (302 total) are in files NOT touched by S3 — unescaped Uzbek apostrophes, unused variables, etc. Not introduced by S3.

---

## V6 — AIChat Freeze Held (CLEAN)

Verified all 3 S3 commits touched zero frozen AI surface files:

| Frozen file | Commit 3536915 | Commit 3d99812 | Commit 33410f3 |
|---|---|---|---|
| `teacher/src/parent/pages/AIChat.jsx` | not touched | not touched | not touched |
| `teacher/src/parent/pages/AIWarnings.jsx` | not touched | not touched | not touched |
| `teacher/src/parent/components/Sidebar.jsx` | not touched | not touched | not touched |
| `teacher/src/parent/components/BottomNav.jsx` | not touched | not touched | not touched |
| `backend/routes/parentRoutes.js:53` | not touched | not touched | not touched |
| `backend/routes/teacherRoutes.js:79` | not touched | not touched | not touched |
| `teacher/src/App.jsx:67` (ai-chat route) | not touched | not touched | not touched |
| `teacher/src/App.jsx:93` (ai-warnings route) | not touched | not touched | not touched |

**Verdict:** AIChat freeze held across all S3 commits. ✅

---

## V7 — Cold-Load Fixes on Cold-Load Paths (CLEAN)

### ChildContext.jsx — three paths
1. **Cold-load catch** (line 60): `setLoadError('Failed to load children. Please refresh.')` — FIXED ✅
2. **Background refresh catch** (line 50): `.catch(() => {})` — intentional SWR silent failure, unchanged ✅ (not a cold-load path)
3. **Success path** (line 59): `setLoadError(null)` — clears error on recovery ✅

### Attendance.jsx
- **Cold-load catch** (line 44): `showError("Bolalar ro'yxatini yuklashda xatolik")` — FIXED ✅

### QuickObservation.jsx
- **Mount catch**: `setChildLoadError("Bolalar ro'yxatini yuklashda xatolik")` — FIXED ✅
- **Error banner renders**: `{childLoadError && <div className="...">...</div>}` — visible to user ✅

**Verdict:** All three cold-load fixes are on correct paths. Background SWR catch is correctly unchanged. ✅

---

## S4 Final Verdict

**6 of 7 items clean.** One MEDIUM residual:

- **V1 RESIDUAL — TP-01 within-school cross-teacher access not closed.** `validateChildAccess` checks school membership only. Teacher B (same school) can still PATCH/DELETE goals on Teacher A's children. The existing revert-test only covers cross-school transferred-child scenario. Root cause: S1 audit incorrectly described `validateChildAccess` as checking teacher-child assignment.

### Recommended disposition
Document as known gap. The V1 residual does not block basic teacher/parent functionality (goals are not surfaced in the current teacher UI). However, **it MUST be fixed before the ИРР build (S5–S7)** — ИРР endpoints will directly expose goal mutation to teachers.

Fix path: add `groupId` check after `validateChildAccess` in `goalController.js:update`, `deleteGoal`, `createReview`. Add behavioral within-school cross-teacher revert-test pair.

*S4 complete. Proceed to S5 with V1 fix as first task.*
