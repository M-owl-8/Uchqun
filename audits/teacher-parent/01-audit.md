# Teacher+Parent Portal — S1 Deep Audit

**Date:** 2026-05-24
**Method:** Code read + grep, current state. Every finding cites file:line + quoted code.
**Scope:** All routes reachable by a teacher JWT or parent JWT — including child, activity, media, meal, therapy, chat, group, teacher-resource, and parent sub-routes. Not limited to teacherRoutes.js / parentRoutes.js.

**Finding counts:** 5 HIGH · 6 MEDIUM · 4 LOW · 2 INFO = 17 total

> **Rules for this step:** Read-only evidence only. No fixes, no ИРР models, no code changes.

---

## Section A — Null-schoolId Bypass Vulnerabilities

### TP-01-CONFIRMED (S0 carry) — goalController PATCH/DELETE: schoolId-only guard, second axis missing

**Severity:** HIGH  
**File:** `backend/controllers/goalController.js:136–138, 217–219`

```js
// update (line 134–138):
export const update = async (req, res) => {
  try {
    const goal = await ChildGoal.findOne({
      where: { id: req.params.id, schoolId: req.user.schoolId },
    });

// deleteGoal (line 215–219):
export const deleteGoal = async (req, res) => {
  try {
    const goal = await ChildGoal.findOne({
      where: { id: req.params.id, schoolId: req.user.schoolId },
    });
```

**Why:** PATCH/DELETE are scoped by `schoolId` only. A teacher in School S can update or delete ANY child's goal within their school — not just children in their assigned group. CREATE correctly calls `validateChildAccess(childId, req)` (line 95) which checks the child-teacher-assignment relationship; PATCH/DELETE skip this second axis entirely. This asymmetry means the IDOR protection applied at create time is not carried forward to mutations.

Note: `createReview` (line 235) also uses `findOne({ where: { id, schoolId } })` without the child-assignment check — same pattern.

**S2 disposition:** Fix — add `validateChildAccess` or scope by `createdBy: req.user.id` (teacher's own goals) before allowing mutation.

---

### TP-05-CONFIRMED (S0 carry) — parentSchoolRatingController: two-part null-bypass + schoolName path has no tenant check

**Severity:** HIGH  
**File:** `backend/controllers/parent/parentSchoolRatingController.js:70, 78–98`

```js
// schoolId path (line 65–72):
if (schoolId) {
  school = await School.findByPk(schoolId);
  if (!school) return res.status(404)...
  finalSchoolId = school.id;
  if (req.user.schoolId && req.user.schoolId !== finalSchoolId) {
    return res.status(403).json({ error: 'You can only rate your own school' });
  }

// schoolName path (lines 78–98):
} else {
  school = await School.findOne({ where: { name: { [Op.iLike]: trimmedName } } });
  if (!school) school = await School.create({ name: trimmedName, type: 'both' });
  finalSchoolId = school.id;
  // ← NO tenant check here
}
```

**Why:** Two separate bugs:
1. Line 70: two-part bypass — `req.user.schoolId && req.user.schoolId !== finalSchoolId`. If `req.user.schoolId` is null (unaffiliated/test parent), the guard evaluates false and any school can be rated.
2. Lines 78–98: when `schoolName` is provided instead of `schoolId`, there is ZERO per-user school isolation check. Any parent can rate (or CREATE) any school by name.

**S2 disposition:** Fix — change guard to `if (req.user.schoolId !== finalSchoolId)` (two-part → unconditional). Close the schoolName path: require that the found/created school matches `req.user.schoolId` (or reject schoolName submissions entirely).

---

### TP-02-CONFIRMED (S0 carry) — teacherController: conditional schoolId allows null-bypass on all list/detail endpoints

**Severity:** MEDIUM  
**File:** `backend/controllers/teacherController.js:122, 175, 229, 248`

```js
// Pattern repeated at four call sites:
if (req.user.schoolId) where.schoolId = req.user.schoolId;
```

**Why:** All four teacher-scoped list/detail endpoints (getParents, getParentById, getChildren, getChildById) apply `schoolId` filtering only when `req.user.schoolId` is truthy. A user with `null` schoolId (government user using a teacher-role session — edge case but the middleware does not prevent it) would receive unscoped data across schools. Normal teacher accounts always have schoolId, making this low-probability; it's still the conditional-schoolId anti-pattern.

**S2 disposition:** Fix — replace with `where.schoolId = req.user.schoolId` unconditionally (null schoolId will return empty results, which is the correct behavior). Same fix as applied in reception S3.

---

### TP-04-CONFIRMED (S0 carry) — parentMediaController: getMediaById validates group membership but NOT parent-child ownership

**Severity:** MEDIUM  
**File:** `backend/controllers/parent/parentMediaController.js:84–101`

```js
export const getMediaById = async (req, res) => {
  const { id } = req.params;
  const groupId = await getParentGroupId(req.user.id);

  if (groupId) {
    const media = await Media.findOne({
      where: { id },
      include: [{
        model: Child,
        as: 'child',
        where: { groupId },   // ← filters to child in parent's group
        required: true,
      }],
    });
    // ← no check that child.parentId === req.user.id
    if (!media) return res.status(404)...
    return res.json({ success: true, data: media });
  }
```

**Why:** The modern path (when parent has a group) validates `child.groupId === parent.groupId` but does NOT validate `child.parentId === req.user.id`. A parent in a group can fetch the media of any other child in the same group, even a child that is not theirs. The legacy path (ParentMedia model) is correctly scoped to `parentId`. This is a within-group privacy leak.

**S2 disposition:** Fix — add `childId` filter: `where: { groupId, parentId: req.user.id }` on the Child include, or resolve the child's parentId after media fetch and compare to `req.user.id`.

---

### TA-03 — groupController: conditional guard exploitable by null-schoolId accounts (admin/government)

**Severity:** MEDIUM (INFO for pure teacher/parent scope)  
**File:** `backend/controllers/groupController.js:110`

```js
if (req.user.schoolId && group.schoolId !== req.user.schoolId) {
  return res.status(403).json({ error: 'Access denied to this group' });
}
```

**Why:** The three-part bypass: if `req.user.schoolId` is null, the guard evaluates false. For teacher/parent accounts, schoolId is always set, so this is not directly exploitable by the teacher portal. However, government accounts (which have null schoolId) CAN access this endpoint — it is not role-gated to admin/reception only. Noted here for completeness; the specific teacher+parent risk is low.

**S2 disposition:** Inform-only — flag for Database loop scope review. Not in teacher/parent cleanup scope.

---

### TA-04 — emotionalMonitoringController and teacherResourceController: admin null-schoolId bypass

**Severity:** INFO (for teacher/parent scope)  
**Files:** `backend/controllers/emotionalMonitoringController.js:88`, `backend/controllers/teacherResourceController.js:125`

```js
// emotionalMonitoringController.js:88
if (req.user.role === 'admin' && req.user.schoolId && child.schoolId !== req.user.schoolId) {

// teacherResourceController.js:125
if (req.user.role === 'admin' && req.user.schoolId && resource.schoolId !== req.user.schoolId) {
```

**Why:** Only exploitable when `req.user.role === 'admin'` and `req.user.schoolId` is null. Not reachable by teacher or parent JWTs. Noted for completeness.

**S2 disposition:** Inform-only. Out of teacher/parent S2 scope.

---

## Section B — Silent-Failure Catches (Frontend)

### TA-B1 — QuickObservation.jsx: children cold-load swallowed silently

**Severity:** MEDIUM  
**File:** `teacher/src/components/QuickObservation.jsx:59`

```js
useEffect(() => {
  api.get('/teacher/children').then(res => {
    const list = res.data?.data || res.data || [];
    setChildren(Array.isArray(list) ? list : []);
    if (!selectedChild && list.length > 0) setSelectedChild(list[0]);
  }).catch(() => {});  // ← cold-load, no error surface
}, []);
```

**Why:** This is a COLD-LOAD fetch (no cache), not a background refresh. If the endpoint fails, the teacher sees the QuickObservation modal open with an empty child list and no error message. Teacher cannot create a quick observation. Silent failure on a user-triggered action.

**S2 disposition:** Fix — surface error (use `showError` or set an error state).

---

### TA-B2 — Attendance.jsx: children cold-load swallowed silently

**Severity:** MEDIUM  
**File:** `teacher/src/pages/Attendance.jsx:42–44`

```js
try {
  const res = await api.get('/teacher/children');
  // ...
} catch {
  setChildren([]);  // ← cold-load, no error surface
} finally {
  setLoading(false);
}
```

**Why:** Cold-load failure sets empty array with no user feedback. Teacher sees an empty attendance page — no children to mark, no explanation. Same class as Reception RG-001.

**S2 disposition:** Fix — add `showError(...)` in the catch block.

---

### TA-B3 — ChildContext.jsx (parent portal): children cold-load swallowed silently

**Severity:** MEDIUM  
**File:** `teacher/src/parent/context/ChildContext.jsx:58–60`

```js
// Note: line 49 catch is intentional background-refresh (cached branch)
// The cold-load (non-cached) path:
try {
  setLoading(true);
  const response = await api.get('/child');
  // ...
} catch {
  setChildrenList([]);   // ← cold-load, no error surface
} finally {
  setLoading(false);
}
```

**Why:** If the initial child list load fails (no cache), the parent portal renders with no children and no error. Every parent page (`Dashboard`, `ChildProfile`, `Activities`, etc.) depends on this context — all show empty state with no explanation.

**S2 disposition:** Fix — surface error (set an error state that parent pages can render).

---

### Note — Intentional background-refresh catches (confirmed, no action needed)

The following `.catch(() => {})` instances are in **cached-branch background refresh paths** — the primary data was already shown from cache; the silent swallow is intentional SWR pattern:

| File | Line | Classification |
|---|---|---|
| `Chat.jsx` | 48 | Background refresh of parent list (cached branch) ✓ |
| `MonitoringJournal.jsx` | 71 | Background refresh of parents (cached branch) ✓ |
| `MonitoringJournal.jsx` | 97 | Background refresh of monitoring records (cached branch) ✓ |
| `TherapyManagement.jsx` | 71 | Background refresh of therapies (cached branch) ✓ |
| `TherapyManagement.jsx` | 100 | Background refresh of children (cached branch) ✓ |
| `parent/pages/Dashboard.jsx` | 84 | Background refresh of dashboard data (cached branch) ✓ |
| `components/MediaCard.jsx` | 33 | `video.play()` autoplay blocked by browser ✓ |

These are NOT bugs. Cold-load paths for all of the above properly call `showError(...)`.

---

## Section C — Missing Features / Gates

### TA-C1 — CP-023 gap: no mustChangePassword redirect in teacher+parent portal

**Severity:** HIGH  
**File:** `teacher/src/shared/components/ProtectedRoute.jsx`

```js
const ProtectedRoute = ({ children, requireRole }) => {
  const { isAuthenticated, loading, isTeacher, isParent, user } = useAuth();
  // ...
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  if (requireRole === 'teacher' && !isTeacher) {
    return isParent ? <Navigate to="/" replace /> : <Navigate to="/login" replace />;
  }
  if (requireRole === 'parent' && !isParent) {
    return isTeacher ? <Navigate to="/teacher" replace /> : <Navigate to="/login" replace />;
  }
  return children;   // ← no mustChangePassword check
};
```

**Why:** The backend's `authenticate` middleware enforces `mustChangePassword` (returns 403 `PASSWORD_CHANGE_REQUIRED` for any endpoint other than `/user/password` and `/auth/logout`). When a teacher or parent has `mustChangePassword=true` (e.g., after reception resets their credentials — the lifecycle feature just built in S6/S7), they can reach all teacher/parent routes but every API call will return 403. The teacher/parent sees cryptic errors with no UX affordance to change their password.

There is no `/teacher/change-password` route and no `ChangePassword` page in the teacher portal. CP-023 is confirmed un-implemented for teacher/parent.

**S2 disposition:** Fix — add `user.mustChangePassword` check to ProtectedRoute, create `ChangePassword.jsx` page, add route `/teacher/change-password` (teacher) and `/change-password` (parent).

---

### TA-C2 — Attendance broken toast interface (S0-carry, confirmed)

**Severity:** HIGH  
**File:** `teacher/src/pages/Attendance.jsx:23, 71, 74`

```js
// line 23 — destructuring non-existent export:
const { toast } = useToast() || {};
// ToastContext exports: { toasts, addToast, removeToast, success, error, warning, info }
// ← NO 'toast' key in context value

// line 71 — save success:
toast?.({ type: 'success', message: 'Davomat saqlandi' });

// line 74 — save error:
toast?.({ type: 'error', message: 'Saqlashda xatolik yuz berdi' });
```

**Why:** `useToast()` returns `{ toasts, addToast, removeToast, success, error, warning, info }` — there is no `toast` property. The destructuring silently assigns `undefined`. The optional-chain `toast?.()` makes both calls no-ops. When a teacher saves attendance, they get no confirmation toast. When save fails, they get no error toast — only the route navigation (line 72: `navigate('/teacher')`) confirms a successful save, but nothing indicates failure.

**S2 disposition:** Fix — replace with `const { success, error: showError } = useToast()` and `success('Davomat saqlandi')` / `showError('Saqlashda xatolik yuz berdi')`.

---

## Section D — ToastContext Instability (RE-1 pattern, S0-carry confirmed)

### TA-RE1 — ToastContext: no useCallback on any toast function; 9 dep-array usages cause stale-closure loops

**Severity:** HIGH  
**File:** `teacher/src/shared/context/ToastContext.jsx:16–29`; affected pages listed below

```js
const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const addToast = (message, type = 'info') => {  // new ref every render
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type }]);
    return id;
  };
  const success = (message) => addToast(message, 'success');  // new ref every render
  const error   = (message) => addToast(message, 'error');    // new ref every render
  const warning = (message) => addToast(message, 'warning');  // new ref every render
  const info    = (message) => addToast(message, 'info');     // new ref every render

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast, success, error, warning, info }}>
```

**Why:** All five toast functions are plain arrow functions — new reference every render. When `setToasts` is called (a toast is shown), `ToastProvider` re-renders, all five functions get new references, and every `useCallback` / `useEffect` that lists them as deps re-executes. This creates the stale-closure instability that caused 3 pages of bugs in the Reception portal.

**Affected dep arrays (grepped, 9 instances across 8 pages):**

| File | Dep array | Risk |
|---|---|---|
| `pages/Activities.jsx:91` | `[getParentsList, loadChildrenForParent, showError, t]` | loadChildrenForParent re-runs on every toast |
| `pages/Activities.jsx:109` | `[showError, t]` | load re-runs on every toast |
| `pages/Chat.jsx:58` | `[user?.id, toastError, t]` | parent-list effect re-runs on every toast |
| `pages/Meals.jsx:86` | `[showError]` | child-list load re-runs on every toast |
| `pages/Meals.jsx:104` | `[showError, t]` | meals load re-runs on every toast |
| `pages/Media.jsx:81` | `[showError, t]` | media load re-runs on every toast |
| `pages/MonitoringJournal.jsx:83` | `[showError, t]` | parents load re-runs on every toast |
| `pages/MonitoringJournal.jsx:112` | `[showError, t]` | monitoring records load re-runs |
| `pages/ParentManagement.jsx:42` | `[showError, t]` | parent list load re-runs on every toast |
| `pages/TherapyManagement.jsx:87` | `[filterType, showError, t]` | therapy list re-runs on every toast |
| `parent/pages/Dashboard.jsx:100` | `[selectedChildId, fetchFresh, refreshNotifications, showError]` | dashboard re-loads on every toast |

**S2 disposition:** Fix — wrap all five toast functions in `useCallback` inside `ToastProvider` (same fix as Reception S3 U-6). This is mandatory before any new page adds to the dep-array count.

---

## Section E — Test Coverage Gaps

### TA-E1 — All frontend tests are mock-only; no two-tenant behavioral isolation tests

**Severity:** MEDIUM  
**File:** `teacher/src/__tests__/pages/*.test.jsx`

**Evidence (representative — Activities.test.jsx:70–76):**
```js
function stubLoad(activities = [], parents = []) {
  mockApi.get.mockImplementation((url) => {
    if (url === '/activities') return Promise.resolve({ data: activities });
    return Promise.resolve({ data: {} });
  });
}
```

**Why:** No test verifies that Teacher A (school S1) cannot read or mutate data belonging to school S2. The behavioral isolation standard set in Reception S6/S7 (real SQLite WHERE clause execution, two-school seed) has not been applied to teacher/parent controllers. IDOR fixes (TP-01, TP-04) will be unverified without revert-test pairs. The TP-02 fix (unconditional schoolId) has zero test coverage.

**S2 disposition:** Require — any endpoint fixed in S3 must ship a revert-test pair. The build phase (S5–S7) must apply the behavioral isolation standard for all new ИРР endpoints.

---

### TA-E2 — goalController: no revert-test for IDOR guard

**Severity:** LOW  
**Evidence:** goalController.test.js exists but has no test that mocks `ChildGoal.findOne` to return null (cross-school 404 assertion). The schoolId guard is covered structurally but not by a test that would catch a regression if the `where` clause is removed.

**S2 disposition:** Add revert-test pair in S3 alongside TP-01 fix.

---

### TA-E3 — parentMediaController: no multi-child group isolation test

**Severity:** LOW  
**Evidence:** No test verifies that parent P1 cannot access media of child C2 (in same group, but C2's parent is P2). The TP-04 fix needs a revert-test to prevent regression.

**S2 disposition:** Add revert-test pair in S3 alongside TP-04 fix.

---

## Section F — Dependency / Configuration

### TA-D1 — Stray `express` in teacher/package.json

**Severity:** LOW  
**File:** `teacher/package.json:16`

```json
"dependencies": {
  "express": "^4.18.2",
```

**Why:** Express is not used by the teacher frontend (Vite + React SPA). Stray dependency copied from backend — same as every prior portal. Increases bundle surface and Dependabot noise.

**S2 disposition:** Remove from `dependencies`.

---

## Section G — TP-03 Data Gap (S0-carry, scoping clarified)

### TP-03 — activityController/mealController/mediaController: teacher-list scoped by teacherId (not child-assignment)

**Severity:** MEDIUM (data gap, not IDOR)  
**File:** `backend/controllers/activityController.js:19–22`

```js
if (req.user.role === 'teacher') {
  // teacher sees activities WHERE teacherId = req.user.id
  where: { teacherId: req.user.id },
```

**Why:** Teachers see their own activities (by `teacherId` attribution). This is a data-correctness concern: a substitute teacher or a teacher whose group assignment changed would not see activities attributed to the previous teacher. This is NOT a security bypass — a teacher cannot see another teacher's activities. It is a "data model legacy" gap that becomes more visible once ИРР is built (goals/observations already use `validateChildAccess` for creation, which is the correct two-axis model). This gap is flagged for the ИРР build plan, not for S3 cleanup.

**S2 disposition:** Inform-only — Document in the S6 feature plan as a data-model gap to address during ИРР build (Part E of the spec — existing models unification).

---

## Section H — Out-of-Scope Items Verified

The following were investigated and confirmed NOT to affect the teacher/parent surface:

| Item | Why out of scope |
|---|---|
| `newsController.js:140, 177` — three-part bypass on PUT/DELETE | `newsRoutes.js:44, 52` applies `requireRole('admin')` to mutations. Teacher/parent JWTs are rejected before the controller code runs. Read endpoints (GET) are scoped correctly: non-government users see only `schoolId = req.user.schoolId OR null`. ✓ |
| `groupController.js:110` — full IDOR scope | Group mutations are reception-only (Create/Update/Delete). Teacher JWT only reaches group GETs. The conditional guard is medium-risk for admin-null-schoolId but not for teacher/parent. ✓ |

---

## Finding Summary

| ID | Severity | Category | File | Fix in S2/S3? |
|---|---|---|---|---|
| TP-01 | HIGH | Null-schoolId / second-axis | `goalController.js:136, 217` | Yes |
| TP-05 | HIGH | Null-schoolId / tenant check | `parentSchoolRatingController.js:70, 78` | Yes |
| TA-C1 | HIGH | Missing gate (CP-023) | `ProtectedRoute.jsx` | Yes |
| TA-C2 | HIGH | Broken interface | `Attendance.jsx:23, 71, 74` | Yes |
| TA-RE1 | HIGH | ToastContext instability | `ToastContext.jsx:16–29` + 11 dep arrays | Yes |
| TP-02 | MEDIUM | Conditional schoolId | `teacherController.js:122, 175, 229, 248` | Yes |
| TP-04 | MEDIUM | Missing child-ownership check | `parentMediaController.js:84–101` | Yes |
| TP-03 | MEDIUM | Data gap (not IDOR) | `activityController.js:19–22` | Inform-only / build phase |
| TA-B1 | MEDIUM | Silent cold-load | `QuickObservation.jsx:59` | Yes |
| TA-B2 | MEDIUM | Silent cold-load | `Attendance.jsx:42–44` | Yes |
| TA-B3 | MEDIUM | Silent cold-load | `ChildContext.jsx:58` | Yes |
| TA-E1 | MEDIUM | Test gap | `teacher/src/__tests__/` | Yes (S3 alongside fixes) |
| TA-D1 | LOW | Stray dependency | `teacher/package.json:16` | Yes |
| TA-E2 | LOW | Test gap | `goalController.test.js` | Yes (S3 alongside TP-01) |
| TA-E3 | LOW | Test gap | `parentMediaController.test.js` | Yes (S3 alongside TP-04) |
| TA-03 | INFO | Conditional schoolId (admin only) | `groupController.js:110` | No (Database loop) |
| TA-04 | INFO | Conditional schoolId (admin only) | `emotionalMonitoringController.js:88` | No (out of scope) |

**5 HIGH · 6 MEDIUM · 3 LOW · 2 INFO = 16 findings + 1 DATA-GAP (TP-03)**

---

## S2 Preview — What cleanup must address

Before building ИРР or any other feature on top of this surface:

1. **5 security fixes with revert-test pairs:** TP-01 (goal PATCH/DELETE), TP-02 (teacherController conditional schoolId), TP-04 (parentMedia group isolation), TP-05 (school rating two-part bypass + schoolName no-check)
2. **1 gate:** CP-023 mustChangePassword (ChangePassword page + ProtectedRoute guard + route)
3. **1 toast fix:** TA-RE1 (wrap all 5 toast functions in useCallback) — must precede any stale-closure cleanup
4. **1 interface fix:** TA-C2 (Attendance broken toast)
5. **3 silent cold-load fixes:** TA-B1/B2/B3
6. **1 package:** express removed from teacher/package.json
7. **Test requirement:** Every security fix ships with a revert-test pair
