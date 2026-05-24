# Teacher+Parent Portal — S2 Cleanup Plan

**Date:** 2026-05-24
**Based on:** `audits/teacher-parent/01-audit.md` (5 HIGH · 6 MEDIUM · 3 LOW · 2 INFO)
**Status:** PLAN ONLY — no code changes applied here.

> **Rule:** Every security fix (Unit 3) ships with a revert-test PAIR. The revert-test must FAIL before the fix and PASS after. Behavioral two-tenant tests must use real SQLite WHERE clause execution (not mocked), same standard as Reception S6/S7 and the isolation tests already in backend.

---

## AI Surface Freeze (Government-Mandated Removal — Build Phase)

**Decision recorded:** `audits/teacher-parent/IRR-DECISIONS.md` (AI REMOVAL section).

**S3 must NOT touch any AI surface.** The following files are FROZEN FOR REMOVAL in S5/S6:

| File | Status | Why frozen |
|---|---|---|
| `teacher/src/parent/pages/AIChat.jsx` | Frozen — remove in S5/S6 | Government-mandated removal (parent AI advice) |
| `teacher/src/parent/pages/AIWarnings.jsx` | Frozen — remove in S5/S6 | Dead page (backend admin/govt-only); broken teacher route; dead parent nav link |
| `teacher/src/parent/components/Sidebar.jsx` (ai-chat + ai-warnings links) | Frozen — remove in S5/S6 | Nav links for both AI pages |
| `teacher/src/parent/components/BottomNav.jsx` (ai-chat link) | Frozen — remove in S5/S6 | Nav link |
| `backend/routes/parentRoutes.js:53` (`POST /parent/ai/chat`) | Frozen — unmount in S5/S6 | Backend endpoint removed with teardown |
| `backend/routes/teacherRoutes.js:79` (`POST /teacher/ai/chat`) | Frozen — unmount in S5/S6 | Teacher AI chat also removed (confirmed Max 2026-05-24) |
| `teacher/src/App.jsx:67` (ai-chat route) | Frozen — remove in S5/S6 | Route definition removed with teardown |
| `teacher/src/App.jsx:93` (ai-warnings teacher route) | Frozen — remove in S5/S6 | Dead teacher route removed with teardown |

**Impact on S3 cleanup units — check each:**

- **UNIT 1 (ToastContext):** ToastContext is in `teacher/src/shared/context/ToastContext.jsx` — no AI pages depend on it in a way that cleanup touches. ✓ No interaction.
- **UNIT 2 (Attendance toast):** `Attendance.jsx` only. ✓ No interaction.
- **UNIT 3 (security fixes):** Backend controllers. ✓ No interaction.
- **UNIT 4 (CP-023):** `ProtectedRoute.jsx` + new ChangePassword pages. ✓ No interaction.
- **UNIT 5 (cold-load):** `QuickObservation.jsx`, `Attendance.jsx`, `ChildContext.jsx`. ✓ No interaction with AI pages.
- **UNIT 6 (express dep):** `package.json`. ✓ No interaction.

**Conclusion:** No cleanup unit touches a frozen AI file. S3 can proceed without adjustment.

**S4 reporting note:** When S4 (confirm clean) audits the portal, the AI surface will be reported as **PRESENT-BUT-FROZEN-FOR-REMOVAL** — not as a finding, not as clean-final. S4 explicitly calls this out rather than flagging it as an unresolved finding.

---

---

## UNIT 0 — Route-Reachability Confirmation (read-only gate)

Confirms or denies the Section H "out of scope" claims from S1 before committing to cleanup scope.

### Claim 1: newsController mutations are admin-gated

**Route file:** `backend/routes/newsRoutes.js:37–57`
```js
router.post('/',   requireRole('admin'), ..., createNews);   // line 37-41
router.put('/:id', requireRole('admin'), ..., updateNews);   // line 44-50
router.delete('/:id', requireRole('admin'), ..., deleteNews); // line 52-57
```
**Verdict:** ✅ Confirmed. `requireRole('admin')` rejects teacher (role='teacher') and parent (role='parent') JWTs before the controller runs. Mutations NOT reachable by teacher/parent.

### Claim 2: groupController mutations are reception-only

**Route file:** `backend/routes/groupRoutes.js:38–58`
```js
router.post('/',   requireRole('reception'), ..., createGroup);   // line 38-43
router.put('/:id', requireRole('reception'), ..., updateGroup);   // line 45-51
router.delete('/:id', requireRole('reception'), ..., deleteGroup); // line 53-58
```
**Verdict:** ✅ Confirmed. Teacher and parent JWTs are rejected before controller. Teachers can reach GET `/groups` and GET `/groups/:id` only — those are guarded by `authenticate` only (line 21) and the controller's conditional schoolId (line 110) is not a teacher-reachable security issue (teachers always have schoolId).

### Claim 3: emotionalMonitoringController admin arm is role-gated

**Route file:** `backend/routes/teacherRoutes.js:46–47` — entire teacher router uses `requireTeacher` (allows teacher/reception/admin).  
**Controller:** `backend/controllers/emotionalMonitoringController.js:88`
```js
// POST /teacher/emotional-monitoring — line 88:
if (req.user.role === 'admin' && req.user.schoolId && child.schoolId !== req.user.schoolId) {
  return res.status(403)...
}
// Teacher path (line 95–104): checks parent.teacherId OR group.teacherId
if (req.user.role !== 'admin' && req.user.role !== 'government') {
  const parent = await User.findOne({ where: { id: child.parentId, teacherId } });
  // ...
}
```
**Verdict:** ✅ Confirmed. Teacher JWTs reach line 95 (teacher arm) — not the admin-null-schoolId bypass at line 88. The admin arm (line 88) is only reachable by admin JWTs, which always have a schoolId (created via admin provisioning). Not in teacher/parent cleanup scope.

### Claim 4: teacherResourceController admin arm is only exploitable by admin

**Route file:** `backend/routes/teacherResourceRoutes.js:34`
```js
router.delete('/:id', requireRole('teacher', 'admin'), ..., deleteResource);
```
**Controller:** `backend/controllers/teacherResourceController.js:125, 130`
```js
// Admin arm — line 125:
if (req.user.role === 'admin' && req.user.schoolId && resource.schoolId !== req.user.schoolId) {
  return res.status(404)...
}
// Teacher arm — line 130:
if (req.user.role !== 'admin' && resource.teacherId !== req.user.id) {
  return res.status(403)...
}
```
**Verdict:** ✅ Confirmed. Teacher JWTs reach line 130 — teachers can only delete their own resources (teacherId check). The admin null-schoolId bypass at line 125 only affects admin JWTs. Not in teacher/parent cleanup scope.

### UNIT 0 Verdict: NO PROMOTIONS

All four Section H claims confirmed correct. Cleanup scope is exactly the 7 units below — no expansions.

---

## Ordering and Dependencies

```
UNIT 0 (read-only) → gates scope (complete)
UNIT 1 (ToastContext) → UNIT 2, UNIT 5 depend on it
UNIT 3a–d (security) → independent of each other, can land in same commit
UNIT 4 (CP-023) → independent
UNIT 5 (cold-loads) → depends on UNIT 1
UNIT 6 (express dep) → independent
```

---

## UNIT 1 — ToastContext Stabilization (FOUNDATION)

**Finding:** TA-RE1  
**File:** `teacher/src/shared/context/ToastContext.jsx:16–29`  
**Depends on:** nothing (must land first)  
**Blocks:** UNIT 2, UNIT 5 (they reference toast functions in useEffect deps)

### Planned change

Wrap all five toast functions — and removeToast — in `useCallback` with stable dep chains:

```js
// Current (new ref every render):
const addToast = (message, type = 'info') => { ... };
const removeToast = (id) => { ... };
const success = (message) => addToast(message, 'success');
const error   = (message) => addToast(message, 'error');
const warning = (message) => addToast(message, 'warning');
const info    = (message) => addToast(message, 'info');

// Fixed (stable refs — same function across renders until dep changes):
const addToast = useCallback((message, type = 'info') => {
  const id = Date.now() + Math.random();
  setToasts((prev) => [...prev, { id, message, type }]);
  return id;
}, []);  // setToasts from useState is stable; no deps needed

const removeToast = useCallback((id) => {
  setToasts((prev) => prev.filter((toast) => toast.id !== id));
}, []);

const success = useCallback((message) => addToast(message, 'success'), [addToast]);
const error   = useCallback((message) => addToast(message, 'error'),   [addToast]);
const warning = useCallback((message) => addToast(message, 'warning'), [addToast]);
const info    = useCallback((message) => addToast(message, 'info'),    [addToast]);
```

Import `useCallback` from React.

### Verify step

1. All existing teacher frontend tests still pass (`npm test` from teacher/).
2. Add one ref-stability test in a new test file (or in existing toast tests if they exist): render two component instances that call `useToast()`, trigger a toast, confirm `success` reference is the same object before and after the toast is shown (`expect(before).toBe(after)`).
3. Check that the 11 dep-array sites listed in TA-RE1 have NOT changed (still the same function names — only the underlying stability changes).

---

## UNIT 2 — Attendance Broken Toast (TA-C2)

**Finding:** TA-C2  
**File:** `teacher/src/pages/Attendance.jsx:23, 71, 74`  
**Depends on:** UNIT 1 (stable toast context)

### Planned change

```js
// Line 23 — current (destructures non-existent 'toast' property):
const { toast } = useToast() || {};

// Fixed:
const { success, error: showError } = useToast();

// Line 71 — save success (current: no-op):
toast?.({ type: 'success', message: 'Davomat saqlandi' });
// Fixed:
success('Davomat saqlandi');

// Line 74 — save error (current: no-op):
toast?.({ type: 'error', message: 'Saqlashda xatolik yuz berdi' });
// Fixed:
showError('Saqlashda xatolik yuz berdi');
```

Remove the `|| {}` fallback — ToastContext throws if called outside provider, which is the correct failure mode.

### Verify step

1. Tests: add/update Attendance test — mock `api.post` to resolve → assert `success` toast was called; mock to reject → assert `showError` toast was called.
2. The cold-load silent failure in Attendance (TA-B2) is addressed separately in UNIT 5.

---

## UNIT 3 — Security Fixes (with revert-test pairs)

All four fixes can land in the same commit or be split — ordering within unit is independent.

---

### UNIT 3a — TP-01: goalController PATCH/DELETE missing child-assignment axis

**Finding:** TP-01  
**Files:** `backend/controllers/goalController.js:136–138, 217–219, 235–239`  
**Revert-test file:** `backend/__tests__/controllers/goalController.test.js` (extend existing)

#### Planned change

For `update` (line 134), `deleteGoal` (line 215), and `createReview` (line 233): after the existing `findOne` by `{ id, schoolId }`, add a child-access check using `validateChildAccess(goal.childId, req)`.

```js
// Pattern for update (apply same to deleteGoal and createReview):
const goal = await ChildGoal.findOne({
  where: { id: req.params.id, schoolId: req.user.schoolId },
});
if (!goal) {
  return res.status(404).json({ success: false, error: { code: 'GOAL_NOT_FOUND' } });
}

// ADD: check teacher has access to this goal's child
const child = await validateChildAccess(goal.childId, req);
if (!child) {
  return res.status(404).json({ success: false, error: { code: 'GOAL_CHILD_NOT_ACCESSIBLE' } });
}
```

Import `validateChildAccess` from `'../utils/schoolValidation.js'` (already imported in goalController for `create`).

#### Revert-test pair

**Test 1 (mock-based — proves null-handling):**
```js
// BEFORE fix: this passes (validateChildAccess not called)
// AFTER fix: this must pass (validateChildAccess returns null → 404)
it('PATCH /goals/:id → 404 when validateChildAccess returns null', async () => {
  mockFindOne.mockResolvedValue({ id: 'goal-1', childId: 'child-1', schoolId: 'school-1' });
  validateChildAccessMock.mockResolvedValue(null);
  const res = await request(app).patch('/teacher/goals/goal-1').send({ title: 'new' });
  expect(res.status).toBe(404);
  expect(res.body.error.code).toBe('GOAL_CHILD_NOT_ACCESSIBLE');
});
```

**Test 2 (behavioral — two-tenant SQLite, proves WHERE clause):**
```
Setup: school A + school B; teacher A assigned to child A1; goal G created for child A1 by teacher A.
Action: teacher B (school A, assigned to child A2) sends PATCH /goals/G.id.
Expected: 404 GOAL_CHILD_NOT_ACCESSIBLE (teacher B has no validateChildAccess to child A1).
Assert: ChildGoal row unchanged (SELECT after attempted update).
```

#### Verify step

`npm test -- goalController.test.js` — all existing + new tests pass.

---

### UNIT 3b — TP-05: parentSchoolRatingController — null-bypass + schoolName no-tenant-check

**Finding:** TP-05  
**File:** `backend/controllers/parent/parentSchoolRatingController.js:65–98`  
**Revert-test file:** new `backend/__tests__/controllers/parentSchoolRatingController.test.js`

#### Planned change

**Fix 1 — Line 70: two-part bypass → unconditional deny:**
```js
// Current (null req.user.schoolId skips the check):
if (req.user.schoolId && req.user.schoolId !== finalSchoolId) {
  return res.status(403).json({ error: 'You can only rate your own school' });
}

// Fixed (unconditional; null schoolId also rejects):
if (req.user.schoolId !== finalSchoolId) {
  return res.status(403).json({ error: 'You can only rate your own school' });
}
```

**Fix 2 — Lines 53–54: require schoolId, reject schoolName path for parent role:**
```js
// Current (schoolId OR schoolName both accepted):
if (!schoolId && (!schoolName || ...)) {
  return res.status(400)...
}

// Fixed: parents must provide schoolId; schoolName path is removed / rejected:
if (!schoolId) {
  return res.status(400).json({
    error: 'School ID required',
    message: 'Please provide schoolId to rate your school.',
  });
}
```

This removes the schoolName branch entirely for parents. The `schoolName` and `School.create` code (lines 78–98) becomes dead code and can be deleted.

#### Revert-test pair

**Test 1 (mock-based — null-schoolId bypass):**
```js
// Parent with null schoolId rates a different school → must be 403 AFTER fix
it('POST /parent/ratings → 403 when req.user.schoolId is null', async () => {
  req.user = { id: 'p1', role: 'parent', schoolId: null };
  School.findByPk.mockResolvedValue({ id: 'school-B' });
  // BEFORE fix: this request succeeds (null && X = false, guard skipped)
  // AFTER fix: null !== 'school-B' → 403
  const res = await request(app).post('/parent/ratings').send({ schoolId: 'school-B', stars: 4 });
  expect(res.status).toBe(403);
});
```

**Test 2 (behavioral — schoolName path closes):**
```js
it('POST /parent/ratings with schoolName → 400 (schoolId required)', async () => {
  // BEFORE fix: creates arbitrary School row
  // AFTER fix: 400 immediately
  const res = await request(app).post('/parent/ratings')
    .send({ schoolName: 'Arbitrary School', stars: 4 });
  expect(res.status).toBe(400);
  // Assert: no School row was created
  expect(School.create).not.toHaveBeenCalled();
});
```

**Test 3 (behavioral — cross-school rejection):**
```
Setup: parent P1 affiliated to school S1; school S2 exists.
Action: POST /parent/ratings { schoolId: S2.id, stars: 5 }
Expected: 403 — cannot rate another school.
Assert: no SchoolRating row created for S2.
```

#### Verify step

`npm test -- parentSchoolRatingController.test.js`

---

### UNIT 3c — TP-02: teacherController conditional schoolId

**Finding:** TP-02  
**File:** `backend/controllers/teacherController.js:122, 175, 229, 248`  
**Revert-test file:** extend `backend/__tests__/controllers/teacherController.test.js`

#### Planned change

Four identical patterns, each changed the same way:

```js
// Current (conditional — null schoolId returns all schools' data):
if (req.user.schoolId) where.schoolId = req.user.schoolId;

// Fixed (unconditional — null schoolId queries for null, returns empty):
where.schoolId = req.user.schoolId;
```

No other changes. The behavior for normal teacher accounts (always have schoolId) is identical. The behavior for null-schoolId accounts changes from "returns all records" to "returns empty results" — correct.

#### Revert-test pair

**Test 1 (mock-based — null-schoolId returns empty):**
```js
it('GET /teacher/parents → empty when req.user.schoolId is null', async () => {
  req.user = { id: 't1', role: 'teacher', schoolId: null };
  // User.findAll will receive where.schoolId = null → no rows match → empty array
  User.findAll.mockResolvedValue([]);
  const res = await request(app).get('/teacher/parents');
  expect(res.status).toBe(200);
  expect(res.body.parents).toEqual([]);
  // Assert: findAll was called with schoolId: null (not without schoolId filter)
  expect(User.findAll).toHaveBeenCalledWith(
    expect.objectContaining({ where: expect.objectContaining({ schoolId: null }) })
  );
});
```

**Behavioral test:**
```
Before fix: session with schoolId=null → GET /teacher/parents returns parents from ALL schools (cross-school leak).
After fix: same session → returns [] (null schoolId matches nothing).
```

#### Verify step

Run full teacherController test suite. Confirm the 4 lines changed produce no regressions for normal teacher sessions (schoolId = valid UUID).

---

### UNIT 3d — TP-04: parentMediaController — group path missing parent-child ownership check

**Finding:** TP-04  
**File:** `backend/controllers/parent/parentMediaController.js:89–97`  
**Revert-test file:** `backend/__tests__/controllers/parentMediaController.test.js` (extend or create)

#### Planned change

```js
// Current — group path (lines 89–97):
const media = await Media.findOne({
  where: { id },
  include: [{
    model: Child,
    as: 'child',
    where: { groupId },          // validates child is in parent's group
    // ← missing: no check that child.parentId === req.user.id
    required: true,
  }],
});

// Fixed — add parentId constraint:
const media = await Media.findOne({
  where: { id },
  include: [{
    model: Child,
    as: 'child',
    where: { groupId, parentId: req.user.id },  // both checks
    required: true,
  }],
});
```

Same fix should be verified against `getMedia` (list endpoint) — if it uses the same pattern, apply there too.

#### Revert-test pair

**Test 1 (mock-based):**
```js
it('GET /parent/media/:id → 404 when child is in group but not parent's child', async () => {
  getParentGroupId.mockResolvedValue('group-G');
  Media.findOne.mockResolvedValue(null);  // parentId filter causes no match
  // BEFORE fix: Media.findOne called without parentId → returns media
  // AFTER fix: parentId: req.user.id in where → null → 404
  const res = await request(app).get('/parent/media/media-1');
  expect(res.status).toBe(404);
});
```

**Test 2 (behavioral — TA-E3):**
```
Setup: group G; parent P1 → child C1 (parentId=P1); parent P2 → child C2 (parentId=P2);
  both C1 and C2 in group G; Media M1 belongs to C2.
Action: parent P1 calls GET /parent/media/M1.id
Expected: 404 (C2's parentId is P2, not P1).
Before fix: returns M1 (group check passes, no parentId check).
After fix: 404 (parentId: P1 → no match on C2).
```

#### Verify step

`npm test -- parentMediaController.test.js`

---

## UNIT 4 — CP-023: mustChangePassword Gate (TA-C1)

**Finding:** TA-C1  
**Files:** `teacher/src/shared/components/ProtectedRoute.jsx`, new `teacher/src/pages/ChangePassword.jsx`, new `teacher/src/parent/pages/ChangePassword.jsx`, `teacher/src/App.jsx`  
**Depends on:** nothing (independent)

### Planned change

#### ProtectedRoute.jsx — add mustChangePassword redirect

```js
// After the isAuthenticated check, before role checks:
if (user?.mustChangePassword) {
  const changePath = requireRole === 'parent' ? '/change-password' : '/teacher/change-password';
  return <Navigate to={changePath} replace />;
}
```

This uses the existing `requireRole` prop to select the correct destination. No additional state needed.

**Loop prevention:** The ChangePassword routes use `ProtectedRoute` themselves, so they must be guarded against redirect loops. Two options:
1. ChangePassword routes use a lightweight `AuthGuard` (only authenticate, not mustChangePassword check) rather than ProtectedRoute.
2. ProtectedRoute checks `window.location.pathname` — but this is fragile with React Router.

**Recommended plan (Option A — explicit prop):** Add `allowMustChange` boolean prop to ProtectedRoute. ChangePassword routes pass it. When `allowMustChange === true`, skip the mustChangePassword redirect.

```jsx
// App.jsx — ChangePassword routes:
<Route path="/teacher/change-password"
  element={
    <ProtectedRoute requireRole="teacher" allowMustChange>
      <ChangePassword />
    </ProtectedRoute>
  }
/>
<Route path="/change-password"
  element={
    <ProtectedRoute requireRole="parent" allowMustChange>
      <ParentChangePassword />
    </ProtectedRoute>
  }
/>

// ProtectedRoute.jsx:
if (user?.mustChangePassword && !allowMustChange) {
  const changePath = requireRole === 'parent' ? '/change-password' : '/teacher/change-password';
  return <Navigate to={changePath} replace />;
}
```

#### ChangePassword.jsx (teacher) — planned interface

- Calls `PUT /api/v1/user/password` with `{ currentPassword, newPassword, confirmPassword }`
- On success: update AuthContext to clear `mustChangePassword`, navigate to `/teacher`
- On error: display error from API response
- Fields: current password, new password (≥8 chars), confirm new password
- Same structure as `reception/src/pages/ChangePassword.jsx` (already built in Reception S3)

#### ParentChangePassword.jsx (parent) — same interface, redirects to `/`

#### AuthContext update

Check if `user.mustChangePassword` is already exposed from login response / profile endpoint. If not, the backend `GET /user/profile` must return it, or the login response includes it. Verify before S3 build.

From reception S3 experience: the backend's `/user/profile` endpoint already returns `mustChangePassword`. AuthContext refresh after successful password change will clear it.

### Tests

1. ProtectedRoute: when `user.mustChangePassword=true` and no `allowMustChange` → renders Navigate to change-password path.
2. ProtectedRoute: when `user.mustChangePassword=true` and `allowMustChange=true` → renders children (no loop).
3. ChangePassword: submit valid passwords → calls PUT /user/password → navigates to /teacher.
4. ChangePassword: submit invalid (mismatch) → shows inline error, no API call.
5. ChangePassword: API error (wrong current password) → shows error from API.

### Verify step

Manual smoke: receptionist resets teacher credentials via reception portal → teacher logs in → lands on change-password → changes → reaches /teacher. Same for parent.

---

## UNIT 5 — Silent Cold-Load Swallows (TA-B1/B2/B3)

**Findings:** TA-B1, TA-B2, TA-B3  
**Depends on:** UNIT 1 (stable toast context, so surface errors don't cause re-render loops)

### TA-B3 — ChildContext.jsx (parent portal, highest priority)

**File:** `teacher/src/parent/context/ChildContext.jsx:52–60`

```js
// Current cold-load failure path (lines 52–60):
try {
  setLoading(true);
  const response = await api.get('/child');
  const childrenData = ...;
  setChildrenList(childrenData);
} catch {
  setChildrenList([]);   // ← silent
} finally {
  setLoading(false);
}
```

**Plan:** Add `error` state to context; set it on cold-load failure; expose via context value. Parent pages check `error` and render an error message.

```js
// Add to ChildContext state:
const [loadError, setLoadError] = useState(null);

// In cold-load catch:
} catch {
  setChildrenList([]);
  setLoadError('Failed to load children. Please refresh.');
}

// Clear on success:
setLoadError(null);

// Expose in context value:
<ChildContext.Provider value={{ childrenList, selectedChildId, setSelectedChildId, loading, loadError, loadChildren }}>
```

Parent pages (Dashboard, ChildProfile) that call `useChild()` can now render `if (loadError) return <ErrorState message={loadError} />`.

### TA-B2 — Attendance.jsx cold-load (UNIT 2 adds toast; TA-B2 adds it to the load catch)

**File:** `teacher/src/pages/Attendance.jsx:42–44`

```js
// After UNIT 2 renames the toast destructure:
} catch {
  setChildren([]);
  showError(t('attendance.childLoadError', { defaultValue: "Bolalar ro'yxatini yuklashda xatolik" }));
}
```

### TA-B1 — QuickObservation.jsx

**File:** `teacher/src/components/QuickObservation.jsx:59`

QuickObservation is a modal component that doesn't use toast context directly. The cleanest fix is an error state rendered inside the modal:

```js
const [childLoadError, setChildLoadError] = useState(null);

useEffect(() => {
  api.get('/teacher/children').then(res => {
    const list = res.data?.data || res.data || [];
    setChildren(Array.isArray(list) ? list : []);
    if (!selectedChild && list.length > 0) setSelectedChild(list[0]);
  }).catch(() => {
    setChildLoadError('Bolalar ro\'yxatini yuklashda xatolik');
  });
}, []);

// In render: if (childLoadError) show inline error banner inside modal
```

### Verify step

For each: write/update test — mock the API to reject → assert the error state is set (ChildContext error state populated; Attendance showError called; QuickObservation renders error text). Do NOT touch the intentional background-refresh catches.

---

## UNIT 6 — Remove Stray `express` Dependency (TA-D1)

**Finding:** TA-D1  
**File:** `teacher/package.json:16`

### Planned change

Remove `"express": "^4.18.2"` from `dependencies`. No code in the teacher frontend imports it.

### Verify step

`npm run build` from teacher/ directory — build passes. `npm test` — all tests pass.

---

## Cleanup Scope — Explicitly Out of Scope for S3

These are acknowledged and deferred:

| Item | Reason | Where addressed |
|---|---|---|
| TP-03 (activity/meal/media teacher scope) | Data-correctness gap, not IDOR. Design question for ИРР build. | S6 feature plan |
| TA-03 (groupController conditional schoolId) | Only exploitable by admin-with-null-schoolId, not teacher/parent | Database loop |
| TA-04 (emotionalMonitoring admin arm) | Same — admin-null-schoolId, not teacher/parent | Database loop |
| TA-E1 (frontend tests mock-only) | The behavioral isolation test standard applies to S3 security fixes (UNIT 3). Broader frontend coverage is a build-phase requirement (S7) | S7 feature phase |

---

## S3 Execution Order

When S3 executes this plan, the mandatory order is:

1. UNIT 1 (ToastContext) — commit first; this is the foundation
2. UNIT 2 + UNIT 5 can land together (both depend on UNIT 1)
3. UNIT 3a–d — each with revert-test pair; can land together or as separate commits
4. UNIT 4 (CP-023) — independent; can land at any point
5. UNIT 6 (express dep) — trivial; can land at any point

Backend units (3a–d) run `npm test` (full suite) after each commit. Frontend units run `npm test` from teacher/.

---

## S3 Expected Outcome

After S3:
- 0 null-schoolId bypass paths in teacher+parent reachable code
- All 4 security guards have revert-test pairs
- CP-023 implemented for teacher and parent roles
- Toast interface stable; Attendance feedback works
- Cold-load failures surfaced to users
- express removed from teacher frontend deps
- Full test suite passing, lint 0
