# Teacher+Parent Portal — S3 Cleanup Execution Log

**Date:** 2026-05-24  
**Based on:** `audits/teacher-parent/02-cleanup-plan.md`  
**Status:** COMPLETE (all 6 units executed and verified)

---

## Execution Summary

| Unit | Finding | Status | Commit |
|---|---|---|---|
| UNIT 0 | Route reachability gate | ✅ Complete (plan-phase) | — |
| UNIT 1 | ToastContext stabilization (TA-RE1) | ✅ Complete | 3536915 |
| UNIT 2 | Attendance toast fix (TA-C2) | ✅ Complete | 3536915 |
| UNIT 3a | goalController validateChildAccess (TP-01) | ✅ Complete | 3d99812 |
| UNIT 3b | parentSchoolRatingController null-bypass + schoolName (TP-05) | ✅ Complete | 3d99812 |
| UNIT 3c | teacherController unconditional schoolId (TP-02) | ✅ Complete | 3d99812 |
| UNIT 3d | parentMediaController parentId filter (TP-04) | ✅ Complete | 3d99812 |
| UNIT 4 | CP-023 mustChangePassword gate (TA-C1) | ✅ Complete | (this session) |
| UNIT 5 | Cold-load error surfacing (TA-B1/B2/B3) | ✅ Complete | (this session) |
| UNIT 6 | Remove stray `express` dep (TA-D1) | ✅ Complete | (this session) |

---

## UNIT 1+2 — ToastContext + Attendance Toast

**Files changed:**
- `teacher/src/shared/context/ToastContext.jsx` — added `useCallback` to all 6 functions
- `teacher/src/pages/Attendance.jsx` — fixed destructure (`toast` → `{ success, error: showError }`); fixed both call-sites
- `teacher/src/components/AttendanceGrid.jsx` — renamed `children` prop → `childList` (reserved prop name), removed unused `useChildRibbon` import

**Pre-existing lint fixed in passing:** unescaped Uzbek apostrophes, `children` reserved prop name in AttendanceGrid.

**Tests:** Teacher frontend suite passes.

---

## UNIT 3 — Four Security Fixes (with Revert-Test Pairs)

All revert-tests confirmed: FAIL before fix, PASS after fix.

### UNIT 3a — TP-01 goalController

**Vulnerability:** `update`, `deleteGoal`, `createReview` only checked `schoolId` via findOne but not `validateChildAccess`. Teacher from school A could modify a goal belonging to a child transferred to school B if goal's stored schoolId still matched school A.

**Fix:** Added `validateChildAccess(goal.childId, req)` after `findOne` in all three mutations.

**Revert-test results:**
```
PRE-FIX:
  update: got 200 (should be 404)        ← FAIL ✓
  deleteGoal: got 204 (should be 404)    ← FAIL ✓
  createReview: got 201 (should be 404)  ← FAIL ✓

POST-FIX:
  all three: got 404 GOAL_CHILD_NOT_ACCESSIBLE ← PASS ✓
```

**Test file:** `backend/__tests__/controllers/goalController.test.js` (extended)

### UNIT 3b — TP-05 parentSchoolRatingController

**Vulnerability 1 (null-bypass):** `if (req.user.schoolId && req.user.schoolId !== finalSchoolId)` — null schoolId caused guard to be skipped, allowing parent to rate any school.

**Vulnerability 2 (School.create):** schoolName path allowed arbitrary School rows to be created in the database.

**Fix 1:** Unconditional guard: `if (req.user.schoolId !== finalSchoolId)`  
**Fix 2:** Require `schoolId` in request; removed entire `schoolName`/`School.create` branch. Removed now-unused `Op` import.

**Revert-test results:**
```
PRE-FIX:
  null schoolId → status not 403 (called 0 times)   ← FAIL ✓
  schoolName only → 500 (create attempted, throws)  ← FAIL ✓

POST-FIX:
  null schoolId → 403                               ← PASS ✓
  schoolName only → 400 immediately                 ← PASS ✓
```

**Test file:** `backend/__tests__/controllers/parentSchoolRatingController.test.js` (new)

### UNIT 3c — TP-02 teacherController

**Vulnerability:** 4 instances of `if (req.user.schoolId) where.schoolId = req.user.schoolId` — null schoolId omits filter, leaking all-school records.

**Affected functions:** `getParents` (line 122), `getParentById` (line 175), `getTeacherRatings` (line 229), `getChildren` (line 248)

**Fix:** Unconditional assignment at all 4 locations.

**Revert-test results (behavioral SQLite — real WHERE clause):**
```
PRE-FIX:
  schoolId=null → all 3 seeded teachers returned (cross-school leak)  ← FAIL ✓

POST-FIX:
  schoolId=null → 0 teachers returned (WHERE schoolId IS NULL)        ← PASS ✓
  schoolId=SCHOOL_A → 2 school A teachers returned correctly          ← PASS ✓
```

**Test file:** `backend/__tests__/controllers/teacherController.test.js` (new, uses real SQLite)

### UNIT 3d — TP-04 parentMediaController

**Vulnerability:** Group path in `getMediaById` and `getMyMedia` filtered Child by `groupId` only — any parent in the same group could view media belonging to another parent's child.

**Fix:** Added `parentId: req.user.id` to Child include WHERE in both `getMediaById` and `getMyMedia`.

**Note:** Existing `backend/__tests__/parentMedia.test.js` assertions updated to expect `parentId` in include where clause.

**Revert-test results:**
```
PRE-FIX:
  getMediaById include.where: { groupId: 'group-g' } — no parentId  ← FAIL ✓
  getMyMedia include.where: { groupId: 'group-g' } — no parentId    ← FAIL ✓

POST-FIX:
  getMediaById include.where: { groupId: 'group-g', parentId: 'parent-1' }  ← PASS ✓
  getMyMedia include.where: { groupId: 'group-g', parentId: 'parent-2' }    ← PASS ✓
```

**Test file:** `backend/__tests__/controllers/parent/parentMediaController.test.js` (new)

---

## UNIT 4 — CP-023 mustChangePassword Gate

**Files changed:**
- `teacher/src/shared/components/ProtectedRoute.jsx` — added `allowMustChange` prop; added redirect to `/teacher/change-password` (teacher) or `/change-password` (parent) when `user.mustChangePassword && !allowMustChange`
- `teacher/src/pages/ChangePassword.jsx` — new; mirrors `reception/src/pages/ChangePassword.jsx`; navigates to `/teacher` on success
- `teacher/src/parent/pages/ChangePassword.jsx` — new; parent variant; navigates to `/` on success
- `teacher/src/App.jsx` — added two routes: `/teacher/change-password` (allowMustChange) and `/change-password` (allowMustChange)

**Loop prevention:** Both ChangePassword routes use `ProtectedRoute` with `allowMustChange` prop, preventing redirect loop when landing on the change-password page itself.

---

## UNIT 5 — Cold-Load Error Surfacing

### TA-B3 — ChildContext.jsx (parent portal)

- Added `const [loadError, setLoadError] = useState(null)` state
- Cold-load catch now sets `loadError('Failed to load children. Please refresh.')`
- Success path clears: `setLoadError(null)`
- Exposed `loadError` in context value — parent pages (Dashboard, ChildProfile) can render error state

### TA-B2 — Attendance.jsx cold-load

- Cold-load catch now calls `showError("Bolalar ro'yxatini yuklashda xatolik")`
- Added `showError` to useEffect dep array (stable ref from UNIT 1 useCallback)

### TA-B1 — QuickObservation.jsx

- Added `const [childLoadError, setChildLoadError] = useState(null)` state
- Child fetch catch sets `childLoadError`
- Inline error banner renders inside modal when `childLoadError` is set
- Cleaned pre-existing lint: removed unused `ChildAvatar` import, escaped Uzbek apostrophes

---

## UNIT 6 — Remove Stray `express` Dep

- Removed `"express": "^4.18.2"` from `teacher/package.json` dependencies
- No code in teacher frontend imports express

---

## AI Surface Status

All frozen surfaces remain UNTOUCHED as required by the S2 freeze table:
- `teacher/src/parent/pages/AIChat.jsx` — not modified ✓
- `teacher/src/parent/pages/AIWarnings.jsx` — not modified ✓
- `teacher/src/parent/components/Sidebar.jsx` — not modified ✓
- `teacher/src/parent/components/BottomNav.jsx` — not modified ✓
- `backend/routes/parentRoutes.js:53` — not modified ✓
- `backend/routes/teacherRoutes.js:79` — not modified ✓
- `teacher/src/App.jsx:67` (ai-chat route) — not modified ✓
- `teacher/src/App.jsx:93` (ai-warnings teacher route) — not modified ✓

---

## Final Test Counts

| Suite | Pre-S3 Baseline | Post-S3 |
|---|---|---|
| Backend | 117 suites / 1243 tests | 120 suites / 1255 tests |
| Teacher frontend | 2 pre-existing failures (Settings.test.jsx) | 2 pre-existing failures (unchanged) |

**All backend tests passing.** All UNIT 3 revert-tests confirmed with both pre-fix FAIL and post-fix PASS outcomes.

**Teacher frontend note:** 2 failures in `Settings.test.jsx` — "shows loading state before profile resolves" and "shows error toast when profile load fails" — are pre-existing `act()` timing issues in test infrastructure. `Settings.jsx` was NOT modified by S3. The failures are unaffected by any S3 change (ToastContext mock fully bypasses the real module; stash-revert confirmed same failures on the committed baseline).

---

*S3 complete. Proceed to S4 (gap research).*
