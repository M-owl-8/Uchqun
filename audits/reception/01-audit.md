# Reception Portal — Step 1: Deep Audit

**Date:** 2026-05-23
**Branch:** main
**Auditor:** S1 (findings only — no code changed)
**Based on:** `audits/reception/00-understanding.md` (S0), all reception controllers read directly

---

## 0. Priority Finding Summary

| Finding | Severity | Category |
|---|---|---|
| **RE-10** | HIGH | IDOR — child update/delete bypasses schoolId scope when child.schoolId is null |
| **RE-11** | HIGH | Root cause of RE-10 — POST /reception/children creates children with null schoolId |
| **RE-2** | HIGH | Documents page broken — silent failure, wrong URL, no multer field, no DELETE endpoint |
| **RE-4** | HIGH | CP-023 mustChangePassword gate missing |
| **RE-1** | HIGH | Toast callbacks in useCallback deps — 3 pages |
| **RE-12** | MED | Group update/delete null-schoolId bypass |
| **RE-13** | MED | Cross-school teacher assignment in group create/update |
| **RE-7** | MED | Bulk-delete silent error swallow (destructive op) |
| **RE-3** | MED | /groups old response shape |
| **RE-5** | MED | CP-019 translation notice missing |
| **RE-14** | NEEDS-DECISION | Teacher assignment scope: per-reception (current) vs per-school (intuitive) |
| **RE-15** | NEEDS-DECISION | Documents DELETE endpoint: add to backend or drop from frontend |
| **RE-6** | LOW | express stray production dependency |
| **RE-8** | LOW | window.confirm blocking in ParentWizard |
| **RE-9** | INFO | Dashboard Activate button dead (display only) |

**Totals:** 2 HIGH (scoping/IDOR), 2 HIGH (functional/CP), 3 MED, 2 NEEDS-DECISION, 1 LOW, 1 INFO, 1 MED-functional

---

## 1. Per-Endpoint Scoping Table (Priority Investigation)

This section answers: for every reception-reachable endpoint, what scopes it, and can a crafted request reach another school's data?

### 1a. Authentication baseline

`authenticate` (middleware/auth.js:65):
- Validates JWT, checks JTI revocation, loads user from DB
- Line 96–98: suspends users with `status === 'suspended'|'archived'`
- Line 102–104: blocks `!isActive` for reception/teacher/admin
- **Line 106–111**: for reception specifically — `if (user.role === 'reception' && (!user.documentsApproved || !user.isActive))` → 403
- Line 117–127: `mustChangePassword` gate → 403 `PASSWORD_CHANGE_REQUIRED` (all paths except `/user/password` + `/auth/logout`)

`requireReception` = `requireRole('reception')` — only checks `role === 'reception'`. The `documentsApproved` check is in `authenticate`, not `requireReception`.

So the effective gate is: **authenticate (schoolId, documentsApproved, isActive, mustChangePassword) + requireReception (role)**.

---

### 1b. Teacher endpoints (`receptionTeacherController.js`)

| Endpoint | Scope mechanism | Cross-school isolated? | Evidence |
|---|---|---|---|
| `POST /reception/teachers` | creates `schoolId: req.user.schoolId` | ✅ Provably YES | line 22–23: `schoolId: req.user.schoolId` |
| `GET /reception/teachers` | `where: { role: 'teacher', schoolId: req.user.schoolId }` | ✅ Provably YES | line 76 |
| `GET /reception/teachers/:id/ratings` | `findOne({ where: { id, role: 'teacher', schoolId: req.user.schoolId } })` | ✅ Provably YES | line 37 |
| `PUT /reception/teachers/:id` | `findOne({ where: { id, role: 'teacher', schoolId: req.user.schoolId } })` | ✅ Provably YES | line 92 |
| `DELETE /reception/teachers/:id` | `findOne({ where: { id, role: 'teacher', schoolId: req.user.schoolId } })` | ✅ Provably YES | line 116 |

**Verdict: All teacher endpoints are cross-school isolated via `schoolId: req.user.schoolId` in the where-clause. No IDOR.**

Note: `getTeachers` returns ALL teachers at the school (school-scope), not just those created by this reception. This is broader than the teacher-assignment scope used in parent create/update (see RE-14).

---

### 1c. Parent endpoints (`receptionParentController.js`)

| Endpoint | Scope mechanism | Cross-school isolated? | Evidence |
|---|---|---|---|
| `POST /reception/parents` | Creates parent with `schoolId: req.user.schoolId`; child with `schoolId: req.user.schoolId \|\| null` | ✅ Provably YES (parent + child in `createParent`) | lines 98, 102–107 |
| `GET /reception/parents` | `where: { role: 'parent', schoolId: req.user.schoolId }` | ✅ Provably YES | line 133–134 |
| `PUT /reception/parents/:id` | `findOne({ where: { id, role: 'parent', schoolId: req.user.schoolId } })` | ✅ Provably YES | line 161 |
| `DELETE /reception/parents/:id` | `findOne({ where: { id, role: 'parent', schoolId: req.user.schoolId } })` | ✅ Provably YES | line 209 |

**Parent read/mutate: all cross-school isolated. No IDOR on parent records themselves.**

---

### 1d. Child endpoints (`receptionParentController.js`) — **IDOR FOUND**

| Endpoint | Scope mechanism | Cross-school isolated? | Evidence |
|---|---|---|---|
| `POST /reception/children` | Parent check: `findOne({ where: { id: parentId, schoolId: req.user.schoolId } })` ✅; BUT child created with `schoolId` derived from text-search lookup of `req.body.school` field — defaults to `null` if no school provided | ⚠️ CREATE inserts null-schoolId children | lines 238, 278–298 |
| `PUT /reception/children/:id` | `if (child.schoolId && child.schoolId !== req.user.schoolId)` | ❌ **CONDITIONAL BYPASS** — null schoolId skips the check | lines 312–316 |
| `DELETE /reception/children/:id` | `if (child.schoolId && child.schoolId !== req.user.schoolId)` | ❌ **CONDITIONAL BYPASS** — null schoolId skips the check | lines 372–376 |

**Attack path (RE-10 + RE-11):**

Step 1 — Child with null schoolId is created:
```js
// receptionParentController.js:278-298 (createChildForParent)
let schoolId = null;
if (school) {           // 'school' is req.body.school — not sent by the "Add Child" UI
  // text search for school by name...
}
// If 'school' not in FormData: schoolId stays null
const child = await Child.create({
  parentId: parent.id, ...,
  schoolId,              // ← null
  ...
});
```

Step 2 — Any reception can update/delete that child:
```js
// receptionParentController.js:316 (updateChildForReception)
if (child.schoolId && child.schoolId !== req.user.schoolId)
//   ↑ null && ... → false → check SKIPPED → access granted
  return res.status(403)...

// receptionParentController.js:376 (deleteChildForReception)
if (child.schoolId && child.schoolId !== req.user.schoolId) // same bypass
```

**Reception at School B can PUT/DELETE a child belonging to School A if that child has `schoolId: null`.**

This child population grows over time because the "Add Child" modal in ParentManagement.jsx posts to `/reception/children` without a `school` field. Null-schoolId children accumulate silently.

---

### 1e. Group endpoints (`groupController.js`)

| Endpoint | Scope mechanism | Cross-school isolated? | Evidence |
|---|---|---|---|
| `GET /groups` | `where.schoolId = req.user.schoolId` (line 16–18) AND `includeTeacher.where = { createdBy: req.user.id }` (line 37) | ✅ School-isolated; reception scoped further to own-teacher's groups | lines 16–37 |
| `GET /groups/:id` | `if (req.user.schoolId && group.schoolId !== req.user.schoolId)` | ✅ Safe: if `group.schoolId === null`, then `null !== req.user.schoolId` = true → 403 returned | line 107 |
| `POST /groups` | Sets `schoolId: req.user.schoolId` ✅; teacher validation: `User.findByPk(teacherId)` — **no school scope** | ❌ Cross-school teacher can be linked | lines 136–148 |
| `PUT /groups/:id` | `if (req.user.schoolId && group.schoolId && group.schoolId !== req.user.schoolId)` | ❌ **Three-part condition** — null `group.schoolId` skips check | line 177 |
| `DELETE /groups/:id` | `if (req.user.schoolId && group.schoolId && group.schoolId !== req.user.schoolId)` | ❌ Same three-part null bypass | line 223 |

Note: `createGroup` also uses `User.findByPk(teacherId)` without school scope — see RE-13.

---

### 1f. Document endpoints (`receptionController.js`)

| Endpoint | Scope mechanism | Cross-school isolated? | Evidence |
|---|---|---|---|
| `POST /reception/documents` | Creates `Document` with `userId: req.user.id` | ✅ User-scoped | line 34 |
| `GET /reception/documents` | `where: { userId: req.user.id }` | ✅ User-scoped | line 63 |
| `DELETE /reception/documents/:id` | **Does not exist** | N/A — endpoint missing | — |

*The frontend calls `/reception/my-documents` (wrong URL) for all three operations — see RE-2.*

---

### 1g. Message endpoints

| Endpoint | Scope mechanism | Cross-school isolated? | Evidence |
|---|---|---|---|
| `GET /reception/messages` | `where: { senderId: req.user.id }` | ✅ User-scoped | receptionController.js:94 |
| `POST /reception/message-to-government` | Creates with `senderId: req.user.id` | ✅ No isolation needed (outbound) | governmentMessageController.js:41 |

---

### 1h. Scoping verdict

| Domain | Verdict |
|---|---|
| Teacher endpoints | ✅ ALL CLEAN — schoolId in every where-clause |
| Parent read/mutate | ✅ ALL CLEAN — schoolId in every where-clause |
| Child create (POST /reception/children) | ❌ Missing `req.user.schoolId` assignment → null-schoolId creation |
| Child update/delete | ❌ IDOR — conditional null-bypass allows cross-school access |
| Group read | ✅ CLEAN (with reception further scoped to own-teacher's groups) |
| Group create | ⚠️ Teacher assignment lacks school scope check |
| Group update/delete | ❌ Three-part null-bypass allows mutation of null-schoolId groups |
| Document endpoints | ✅ CLEAN (user-scoped; frontend calls wrong URL — see RE-2) |
| Message endpoints | ✅ CLEAN |

---

## 2. Findings — Grouped by Severity

### CRITICAL

*None reached CRITICAL this audit.* RE-10 is HIGH (not CRITICAL) because exploiting the child IDOR requires knowing a target child's UUID, which is not trivially guessable. It is, however, a real tenant-isolation failure on safeguarding-sensitive data.

---

### HIGH

#### RE-10 — Child update/delete IDOR via null-schoolId bypass

**Files:**
- `backend/controllers/receptionParentController.js:316` (updateChildForReception)
- `backend/controllers/receptionParentController.js:376` (deleteChildForReception)

**Root cause file:** `backend/controllers/receptionParentController.js:294-298` (createChildForParent — see RE-11)

**Code (updateChildForReception:316):**
```js
if (child.schoolId && child.schoolId !== req.user.schoolId)
  return res.status(403).json({ error: 'Access denied to this child' });
```

**Why wrong:** The condition is three-part: `schoolId_exists && schoolId_differs`. If `child.schoolId === null`, the first clause is falsy and the entire condition short-circuits to `false` — the guard does not fire. Any authenticated reception (from any school) can then update or delete a child whose `schoolId` is null.

**How null-schoolId children arise (RE-11):** `createChildForParent` (POST /reception/children) sets `schoolId` from a text-based school-name lookup of `req.body.school`. This field is not sent by the ParentManagement "Add Child" modal. When omitted, `schoolId = null` (lines 278–298).

**Fix direction:**
1. (Root-cause fix) In `createChildForParent`, always set `schoolId: req.user.schoolId` — remove the text-search approach for schoolId or use it only as supplementary.
2. (Guard fix) Change conditional to `!child.schoolId || child.schoolId !== req.user.schoolId` in both update and delete.
3. (Data hygiene) Backfill existing null-schoolId children: set `schoolId` from their parent's `schoolId` via migration.

---

#### RE-11 — `createChildForParent` does not set `schoolId` from request context

**File:** `backend/controllers/receptionParentController.js:278–298`

**Code:**
```js
let schoolId = null;
if (school) {            // school = req.body.school — NOT sent by the Add Child UI
  try {
    let foundSchool = await School.findOne({ where: { name: { [Op.iLike]: school } } });
    ...
    if (foundSchool) schoolId = foundSchool.id;
    else logger.warn('School not found for child');
  } catch (error) { ... }
}
const child = await Child.create({ ..., schoolId, ... });
```

**Why wrong:** The `POST /reception/children` endpoint (add-child-to-existing-parent flow) derives the child's `schoolId` from a free-text school-name search in the request body. The frontend "Add Child" modal does not send this field. Result: every child added via the "Add Child" button gets `schoolId: null`, removing them from tenant isolation.

Contrast with `createParent` (POST /reception/parents), which correctly sets `schoolId: req.user.schoolId || null` (line 102) for the simultaneously-created child.

**Fix direction:** Replace `let schoolId = null; if (school) { ... }` with `const schoolId = req.user.schoolId || null;`. The school-name text search logic is not needed — reception's schoolId is authoritative.

---

#### RE-2 — Documents page completely broken (silent failure)

**Files:**
- `reception/src/pages/Documents.jsx:22–28` (wrong GET URL)
- `reception/src/pages/Documents.jsx:47` (wrong POST URL + wrong multer field)
- `reception/src/pages/Documents.jsx:67` (missing DELETE endpoint)
- `backend/routes/receptionRoutes.js:31–32` (actual backend routes)
- `backend/controllers/receptionController.js:56–70` (actual controller behavior)

**Mismatch table:**

| Item | Frontend | Backend | Status |
|---|---|---|---|
| GET URL | `/reception/my-documents` | `/reception/documents` | ❌ 404 |
| POST URL | `/reception/my-documents` | `/reception/documents` | ❌ 404 |
| multer field | `formData.append('document', file)` | `upload.single('file')` | ❌ field name mismatch |
| documentType | not sent | required in body | ❌ 400 on any valid URL |
| DELETE | `/reception/my-documents/:id` | **does not exist** | ❌ 404 |
| GET shape | `res.data.documents` | `{ success: true, data: [...] }` | ❌ wrong accessor |

**Silent failure:** `Documents.jsx:26-29`:
```js
} catch {
  // endpoint may not exist yet
  setDocs([]);
}
```
The 404 is swallowed. The page displays an empty list without any error. A reception sees "no documents" and believes the feature is empty, not broken.

**Severity elevation from S0:** This is the same class of bug as admin's `AIWarnings` (CRITICAL in admin S1 — a page that silently returns wrong data due to wrong URL). Reception staff cannot upload or manage their own qualification documents at all. Without approved documents, reception cannot authenticate (documentsApproved gate in `authenticate`). The documents page is the primary workflow for new receptions to become active.

**Fix direction:**
1. Fix GET URL: `/reception/my-documents` → `/reception/documents`
2. Fix POST URL: same correction; change FormData field from `document` → `file`; add `documentType` field selection to the upload UI
3. Fix GET shape accessor: `res.data.documents` → `res.data.data`
4. Decide on DELETE: see RE-15 (Needs-Max-Decision)
5. Remove `// endpoint may not exist yet` — surface errors properly

---

#### RE-4 — CP-023 `mustChangePassword` gate missing in frontend

**Files:**
- `reception/src/App.jsx` (no `mustChangePassword` check in AppRoutes)
- `reception/src/components/ProtectedRoute.jsx:16` (only checks `isAuthenticated && isReception`)
- `reception/src/context/AuthContext.jsx` (does not expose `mustChangePassword`)

**Code (ProtectedRoute.jsx:16):**
```jsx
if (!isAuthenticated || !isReception) {
  return <Navigate to="/login" replace />;
}
```

**Backend enforcement (middleware/auth.js:117–127):**
```js
if (user.mustChangePassword) {
  const url = req.originalUrl.split('?')[0];
  const ALLOWED_PATHS = ['/api/v1/user/password', '/api/v1/auth/logout'];
  if (!ALLOWED_PATHS.includes(url)) {
    return res.status(403).json({
      success: false,
      error: { code: 'PASSWORD_CHANGE_REQUIRED' },
      mustChangePassword: true,
    });
  }
}
```

**Why wrong:** When a reception account is provisioned with `mustChangePassword: true` (e.g., a government-provisioned account or an admin-reset account), the backend blocks all API calls with 403. The reception frontend has no handler for this — all page loads make API calls, all fail silently or show error states, and the user is stuck with no path to change their password. There is no change-password page in the reception portal.

The Settings page has `PUT /user/password` wired correctly — the infrastructure exists. Only the gate and redirect are missing.

**Fix direction (same as admin S3 U-3):**
1. Expose `mustChangePassword` from `createAuthContext` (read from user object)
2. Add `/reception/change-password` page (can reuse the `PasswordForm` sub-component from Settings)
3. In `AppRoutes`, redirect to `/reception/change-password` when `mustChangePassword === true`
4. On password change success, clear the flag and navigate to dashboard

---

#### RE-1 — Toast callbacks in `useCallback` dependency arrays (3 pages)

**Files:**
- `reception/src/pages/ParentManagement.jsx` — `loadParents` useCallback: `}, [showError, t]`
- `reception/src/pages/TeacherManagement.jsx:80` — `loadTeachers` useCallback: `}, [showError, t]`
- `reception/src/pages/GroupManagement.jsx:49` — `loadData` useCallback: `}, [showError, t]`

**Pattern (TeacherManagement.jsx:50–80):**
```js
const loadTeachers = useCallback(async (bust = false) => {
  ...
  showError(error.response?.data?.error || t('teachersPage.toastLoadError'));
  ...
}, [showError, t]);      // ← showError causes cascade

useEffect(() => {
  loadTeachers();
}, [loadTeachers]);       // ← loadTeachers changes when showError changes
```

**Why wrong:** If the toast context changes reference (e.g., a re-render that recreates the context value), `loadTeachers` gets a new identity, which triggers `useEffect`, which re-fetches. In pathological cases this creates fetch loops. This is the same class of bug fixed in all 5 admin Phase 3 pages via `useRef` stabilization.

**Fix direction:** Wrap `showError` and `success` in a `useRef` inside each component. Remove them from `useCallback` deps. Pattern from admin:
```js
const showErrorRef = useRef(showError);
useEffect(() => { showErrorRef.current = showError; }, [showError]);
const loadTeachers = useCallback(async (bust = false) => {
  ...
  showErrorRef.current(...);
}, []);   // empty deps — stable
```

---

### MEDIUM

#### RE-12 — Group update/delete null-schoolId bypass

**File:** `backend/controllers/groupController.js:177, 223`

**Code (updateGroup:177):**
```js
if (req.user.schoolId && group.schoolId && group.schoolId !== req.user.schoolId) {
//                        ↑ this clause means: if group.schoolId is null → whole condition = false → check skipped
  return res.status(403).json({ error: 'Access denied to this group' });
}
```

Same pattern in `deleteGroup:223`.

**Why wrong:** Groups with `schoolId: null` can be updated or deleted by any reception. Unlike children (where null-schoolId is created by the backend itself), groups are created by `createGroup` which sets `schoolId: req.user.schoolId` correctly (line 147). However, the defensive check is still defective — if data inconsistency or a migration produces null-schoolId groups, they become universally accessible.

**Contrast with `getGroup`** (single-record GET, line 107): uses two-part condition `if (req.user.schoolId && group.schoolId !== req.user.schoolId)` — since `null !== req.user.schoolId` is `true`, this DOES block access to null-schoolId groups. The mismatch between the two-part and three-part conditions is the source of the inconsistency.

**Fix direction:** Change `updateGroup` and `deleteGroup` guards to match `getGroup`:
```js
if (req.user.schoolId && group.schoolId !== req.user.schoolId) {
```
This blocks both other-school groups AND null-schoolId groups.

---

#### RE-13 — Cross-school teacher assignment in group creation

**File:** `backend/controllers/groupController.js:136–138` (createGroup), `182–186` (updateGroup)

**Code (createGroup:136–138):**
```js
const teacher = await User.findByPk(teacherId);
if (!teacher || teacher.role !== 'teacher') {
  return res.status(400).json({ error: 'Invalid teacher ID' });
}
```

**Why wrong:** Teacher lookup uses `findByPk` — no school scope. A reception at school A could POST `{ teacherId: <teacher-from-school-B-UUID> }` and create a group linked to an out-of-school teacher. This does not leak data (the group is still school-scoped), but it corrupts tenant isolation at the group level.

**Fix direction:** Change lookup to `User.findOne({ where: { id: teacherId, role: 'teacher', schoolId: req.user.schoolId } })`.

---

#### RE-7 — Bulk-delete silent error swallow (destructive operation)

**File:** `reception/src/pages/ParentManagement.jsx` (bulk-delete handler)

**Pattern:**
```js
for (const id of selectedRows) {
  try {
    await api.delete(`/reception/parents/${id}`);
  } catch {} // ← silently swallowed
}
```

**Why wrong:** A reception selecting 10 parents and bulk-deleting them receives no feedback if some deletes fail. The list refreshes and appears consistent, but some parents may still exist. This is a silent failure on a **destructive operation** — worse than a read-path silent failure because the user believes the action succeeded.

**Severity upgraded from S0 LOW → MED.** The deletion of parent records (which cascades to their children) is irreversible without a restore endpoint.

**Fix direction:** Collect failures into an array, surface them via toast after the loop: "8 deleted, 2 failed: [error messages]".

---

#### RE-3 — `/groups` endpoint returns old response shape

**File:** `backend/controllers/groupController.js:75–80`

**Code:**
```js
res.json({
  groups: groups.rows,
  total: groups.count,
  ...
});
```

**Why wrong:** Returns `{ groups, total }` (old shape). BACKEND-012 standard requires `{ success: true, data: [...] }` for new endpoints. Grandfather clause (CP-003) applies — this endpoint was not refactored when the standard was adopted. All four reception consumers access `res.data.groups` which is correct for the old shape. No immediate breakage.

**Fix direction:** Migrate opportunistically when the endpoint is next touched for any reason. All consumers must be updated simultaneously (Dashboard.jsx, GroupManagement.jsx, GroupStep.jsx, ParentManagement.jsx — all use `res.data.groups`).

---

#### RE-5 — CP-019 translation notice banner missing

**File:** `reception/src/components/Layout.jsx` (no banner), `reception/src/pages/Login.jsx` (no banner)

**Why wrong:** CP-019 requires a dismissable notice banner informing end users that translations are AI-generated. Reception is an end-user-facing portal (receptions interact with the system and indirectly with parents). The government portal implements this via `TranslationNotice.jsx` (government S7 closeout). The admin portal implemented it in cleanup S3 U-9.

**Fix direction:** Port the shared `TranslationNotice.jsx` component from the government portal or use the admin version. Mount in `reception/src/components/Layout.jsx`.

---

### NEEDS-MAX-DECISION

#### RE-14 — Teacher assignment scope: per-reception vs per-school

**Files:**
- `backend/controllers/receptionParentController.js:59-62` (createParent teacher validation)
- `backend/controllers/receptionParentController.js:164-168` (updateParent teacher validation)
- `backend/controllers/groupController.js:36-37` (getGroups reception filter)

**Code (createParent:59-62):**
```js
const teacherWhere = { id: teacherId, role: 'teacher', createdBy: req.user.id };
if (req.user.schoolId) teacherWhere.schoolId = req.user.schoolId;
const teacher = await User.findOne({ where: teacherWhere });
```

**The inconsistency:**
- `getTeachers` → school-scope: reception A can SEE teachers created by reception B at the same school
- `createParent`/`updateParent` → per-reception-scope: reception A CANNOT assign a parent to a teacher created by reception B
- `getGroups` → per-reception-scope: reception A cannot see groups for teachers created by reception B

**Two schools of thought:**
1. **Intended per-reception ownership:** each reception manages their own cohort of teachers and parents, with no cross-reception assignment. School staff partition by reception account.
2. **School collaboration (likely expected):** all receptions at a school should be able to view and assign any teacher at the school — they work together.

**Why this matters:** The current behavior makes it impossible for a second reception (e.g., a replacement or assistant) to manage existing parent-teacher assignments set up by the first reception, even at the same school. `getTeachers` shows all school teachers to all receptions — this creates a confusing UX where a teacher is visible but cannot be assigned.

**Decision needed from Max:** Should teacher assignment validation be per-reception (`createdBy: req.user.id`) or per-school (`schoolId: req.user.schoolId`)? This affects `createParent`, `updateParent`, and `getGroups`'s reception filter.

---

#### RE-15 — Documents DELETE endpoint: add or remove?

**Files:**
- `reception/src/pages/Documents.jsx:61-72` (handleRemove calls DELETE)
- `backend/routes/receptionRoutes.js` (no DELETE /reception/documents/:id)

**The question:** The frontend assumes a `DELETE /reception/documents/:id` endpoint for removing uploaded documents. The backend has no such endpoint. Documents flow: reception uploads → admin reviews → admin approves/rejects.

**Two options:**
1. **Add DELETE endpoint on backend:** `DELETE /reception/documents/:id` with ownership check (`document.userId === req.user.id`) AND status guard (`document.status === 'pending'` only — can't delete an approved/rejected doc). This makes sense: a reception should be able to remove a mistaken upload before admin reviews it.
2. **Drop the delete flow from frontend:** Only allow deletion of temp-upload failures (already handled by the `id.startsWith('tmp-')` check on line 62). Server-saved documents are permanent and only replaced by re-upload.

**Decision needed from Max:** Should receptions be able to delete their own pending documents before admin review?

---

### LOW

#### RE-6 — `express` stray production dependency

**File:** `reception/package.json`

```json
"dependencies": {
  "express": "^4.18.2",   ← should be in devDependencies or removed entirely
  ...
}
```

Express is never imported in the reception React app. Confirmed the same issue was fixed in admin S3 U-8. Not a functional bug but unnecessary production bundle weight.

**Fix direction:** Move to `devDependencies` or remove entirely (remove is cleaner since it's not used even in dev scripts).

---

#### RE-8 — `window.confirm` blocking API in ParentWizard draft restore

**File:** `reception/src/pages/ParentWizard/ParentWizardPage.jsx:39`

```js
const resume = window.confirm("Saqlangan qoralama topildi. Davom etishni xohlaysizmi?");
```

`window.confirm` is synchronous and blocks the main thread. In strict mode environments and test runners it throws or behaves unexpectedly. The text is hardcoded Uzbek (not i18n'd).

**Fix direction:** Replace with an in-UI modal (a small banner or ConfirmDialog). Also extract string to i18n.

---

### INFO

#### RE-9 — Dashboard "Activate" button is display-only

**File:** `reception/src/pages/Dashboard.jsx` (pending parent cards)

An "Activate" button renders on pending-parent cards but has no `onClick` handler. It functions as a status indicator only. The developer's `// TODO(phase-2)` comment nearby suggests this was intentionally deferred.

No fix needed unless phase-2 scope includes wiring this.

---

## 3. Silent-Failure Sweep

Every reception-side catch block that swallows errors without user notification:

| Location | Code | Failure mode | Risk |
|---|---|---|---|
| `Documents.jsx:26-28` | `catch { setDocs([]); }` + `// endpoint may not exist yet` | GET 404 → empty list displayed. Feature appears absent, not broken. | HIGH — blocks core reception workflow |
| `Documents.jsx:55-58` | `catch (err) { showError(...); setDocs(prev => prev.filter(...)) }` | POST 404 → user sees error toast + temp file removed. Partially surfaced. | MED — somewhat surfaced |
| `Documents.jsx:68-70` | `catch { showError('Hujjatni o\'chirib bo\'lmadi.') }` | DELETE 404 → surfaced as toast. OK. | LOW |
| `GroupStep.jsx:17-19` | `.catch(() => {})` | GET /groups error → "no groups" shown; wizard silently can't assign parent to group | HIGH — wizard broken without groups |
| `TeacherManagement.jsx:66` | `fetchFresh().catch(() => {})` | Background stale-while-revalidate refresh silently fails; stale data remains | LOW — stale data shown, not nothing |
| `ParentManagement.jsx` (bulk delete) | `catch {}` (empty) | Per-row DELETE errors silently swallowed | MED — destructive op with no feedback |
| `receptionController.js:28-30` (uploadDocument) | Error path returns 500 with `{ error: string }` (old shape) | Not a silent failure — error is returned | INFO |

**Key finding:** Two HIGH-impact silent failures:
1. **Documents GET** — entire document management workflow fails silently (RE-2 already covers this)
2. **GroupStep groups fetch** — if the groups API fails, the ParentWizard step 3 shows "no groups", the wizard cannot complete, and the reception gets no error message

---

## 4. Summary by Count

| Severity | Count | IDs |
|---|---|---|
| HIGH | 4 | RE-10, RE-11, RE-2, RE-4 |
| HIGH (toast/stability) | 1 | RE-1 |
| MED | 4 | RE-12, RE-13, RE-7, RE-3, RE-5 |
| NEEDS-MAX-DECISION | 2 | RE-14, RE-15 |
| LOW | 2 | RE-6, RE-8 |
| INFO | 1 | RE-9 |

**New findings vs S0:** 6 new (RE-10, RE-11, RE-12, RE-13, RE-14, RE-15)

**Scoping verdict:** 2 confirmed IDOR paths (RE-10/RE-11 child endpoints; RE-12 group null-bypass). No cross-school data read (GET endpoints all clean). IDOR risks are confined to mutations on null-schoolId records.

---

## 5. Needs-Max-Decisions (Consolidated)

| ID | Question | Options | Default if no answer |
|---|---|---|---|
| RE-14 | Teacher assignment scope in createParent/updateParent: per-reception (`createdBy`) or per-school (`schoolId`)? | A) per-reception (keep current, document); B) per-school (fix validation + getGroups filter) | Assume B (per-school) and plan the fix — per-reception is confusing given school-scoped getTeachers |
| RE-15 | Documents DELETE endpoint: add to backend (with pending-only guard) or drop from frontend? | A) Add backend DELETE with ownership + status guard; B) Drop frontend delete for server-saved docs | Assume A (add endpoint) — receptions should be able to retract a pending upload |

---

## 6. What S2 (Cleanup Plan) Must Address

**Must-fix before portal can be used:**
1. RE-10 + RE-11 together (child IDOR + null-schoolId): two-line fix in each file, plus migration to backfill
2. RE-2 (Documents broken): URL correction, multer field, documentType UI, shape accessor

**Must-fix before portal is safe:**
3. RE-4 (CP-023): change-password page + redirect gate
4. RE-1 (toast stability): useRef pattern in 3 pages

**Fix with S2:**
5. RE-12 (group null-bypass): two-line condition change
6. RE-13 (cross-school teacher in groups): scope check in createGroup/updateGroup
7. RE-7 (bulk-delete silent failure): collect and surface errors
8. RE-6 (express dep): remove

**Defer to S5/S7 or cross-portal pass:**
- RE-3 (groups old shape, CP-003 grandfather clause)
- RE-5 (CP-019 translation notice)
- RE-8 (window.confirm cosmetic)
- RE-14, RE-15 (Max decisions → shapes the plan)
