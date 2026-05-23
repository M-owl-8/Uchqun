# Reception Portal — Step 2: Cleanup Plan

**Date:** 2026-05-23  
**Branch:** main  
**Based on:** `audits/reception/01-audit.md` (15 findings RE-1..RE-15)  
**Max's locked decisions:** RE-14 → per-school; RE-15 → add DELETE endpoint  
**Needs nothing further from Max:** Both decisions locked. S3 executes without waiting.

---

## 0. Finding Coverage Map

| Finding | Severity | Unit | Status |
|---|---|---|---|
| RE-10 | HIGH (IDOR) | U-1 | Will fix |
| RE-11 | HIGH (IDOR root cause) | U-1 | Will fix |
| RE-12 | MED (null-bypass) | U-2 | Will fix |
| RE-13 | MED (cross-school teacher) | U-2 | Will fix |
| RE-14 | NEEDS-DECISION → locked per-school | U-3 | Will fix |
| RE-2 | HIGH (broken page) | U-4 | Will fix |
| RE-15 | NEEDS-DECISION → locked add endpoint | U-4 | Will fix |
| RE-4 | HIGH (CP-023 gate) | U-5 | Will fix |
| RE-1 | HIGH (toast stability) | U-6 | Will fix |
| RE-7 | MED (bulk-delete silent) | U-7 | Will fix |
| GroupStep catch swallow | HIGH (silent failure, wizard) | U-7 | Will fix |
| RE-5 | MED (CP-019 notice) | U-8 | Will fix |
| RE-6 | LOW (express dep) | U-8 | Will fix |
| RE-8 | LOW (window.confirm) | U-8 | Will fix |
| RE-3 | MED (groups old shape) | Deferred | CP-003 grandfather |
| RE-9 | INFO (dead Activate button) | Deferred | Feature phase |

**All 15 findings accounted for** (13 in cleanup units, 2 explicitly deferred).

---

## 1. Ordering Rationale

```
U-1  Child IDOR (RE-10+RE-11+backfill)          ← tenant-isolation BROKEN, #1 priority
U-2  Group scoping (RE-12+RE-13)                 ← tenant-isolation gap
U-3  Teacher scope change RE-14 (per-school)     ← tenant-isolation scope correction
U-4  Documents broken + DELETE endpoint (RE-2+RE-15) ← broken core workflow
U-5  CP-023 password gate (RE-4)                 ← safety gate
U-6  Toast stability (RE-1)                      ← reliability
U-7  Silent failures (RE-7 + GroupStep catch)    ← UX reliability
U-8  CP/cosmetic (RE-5+RE-6+RE-8)               ← polish
```

Security first: U-1 is the highest-risk fix in the reception portal — it closes a real tenant-isolation failure on children's safeguarding-sensitive records. U-2 and U-3 close further scoping gaps before any broken-feature or cosmetic work.

---

## 2. U-1 — Child IDOR: Creation + Guard + Backfill (RE-10 + RE-11)

**Priority: HIGHEST — Do not split this unit.**

### Why three parts must go together

The IDOR has two independent failure modes that compound each other:

1. **RE-11 (creation):** `createChildForParent` writes `schoolId: null` for every child added via the "Add Child" modal, because the `school` body field (the only path to a non-null schoolId) is never sent by the UI. This is the null-schoolId *source*.

2. **RE-10 (guard):** `updateChildForReception` and `deleteChildForReception` guard with `if (child.schoolId && child.schoolId !== req.user.schoolId)`. When `child.schoolId === null`, the first clause is falsy — the guard never fires. Any reception from any school can mutate that child. This is the null-schoolId *exploit*.

3. **Backfill (existing data):** Even after fixing RE-11 (no new nulls) and RE-10 (guard now blocks nulls), existing null-schoolId children remain exposed. A reception-B can still update/delete them until the migration runs. All three parts must land in the same deployment.

**Splitting leaves the hole open:**
- RE-10 guard fix alone: existing null records still unscoped; RE-11 still creates new ones
- RE-11 creation fix alone: existing null records still bypass the unchanged guard
- Backfill alone: RE-11 immediately creates fresh null records post-deploy

### Files changed

**`backend/controllers/receptionParentController.js`**

*RE-11 fix — `createChildForParent` (~line 278):*
```js
// BEFORE (broken):
let schoolId = null;
if (school) {
  // text-search by school name → sets schoolId if found
}
const child = await Child.create({ ..., schoolId, ... });

// AFTER (fixed):
// Reception's own schoolId is authoritative — no free-text lookup needed
const schoolId = req.user.schoolId;
const child = await Child.create({ ..., schoolId, ... });
```
The `school` text-search block (lines ~280-295) is removed. The frontend never sends this field and reception cannot be at two schools.

*RE-10 fix — `updateChildForReception` (~line 316):*
```js
// BEFORE (broken — null bypasses):
if (child.schoolId && child.schoolId !== req.user.schoolId)
  return res.status(403).json(...);

// AFTER (fixed — null is now also blocked):
if (!child.schoolId || child.schoolId !== req.user.schoolId)
  return res.status(403).json(...);
```

*RE-10 fix — `deleteChildForReception` (~line 376):* identical guard change.

**New migration: `backend/migrations/YYYYMMDD-backfill-child-schoolid.js`**
```js
// Backfill: set schoolId on null-schoolId children from their parent's schoolId
await queryInterface.sequelize.query(`
  UPDATE children c
  SET "schoolId" = u."schoolId"
  FROM users u
  WHERE c."parentId" = u.id
    AND c."schoolId" IS NULL
    AND u."schoolId" IS NOT NULL
`);
```
Children whose parent also has null schoolId remain null (orphaned records — acceptable; they have no school assignment either).

### Tests / revert-tests

**Revert-test 1 — cross-school update on null-schoolId child:**
1. Seed a child with `schoolId: null` directly (simulating the pre-fix state)
2. Call `PUT /reception/children/:childId` as reception from a different school (different schoolId JWT)
3. **Assert: 200 OK** — confirming the leak existed
4. Apply RE-10 guard fix (in test: mock child with `schoolId: null`)
5. **Assert: 403** — confirming the fix closes it

**Revert-test 2 — cross-school delete on null-schoolId child:** same pattern for DELETE.

**Test 3 — creation no longer produces null schoolId:**
Call `POST /reception/children` (without `school` body field, as the UI does)
Assert: response child has `schoolId === req.user.schoolId` (not null).

**Test 4 — backfill migration:**
Run migration against a seed DB state with null-schoolId children whose parents have schoolIds.
Assert: all targeted children's schoolIds are now set to parent's schoolId.

**Test 5 — guard still blocks explicit cross-school children:**
Seed a child with `schoolId: 'school-B'`. Reception from `school-A` calls PUT.
Assert: 403 (guard works for non-null cross-school children too).

### Dependencies

None — this unit is self-contained backend-only.

### Estimate

**L (large)** — 2 controller method edits + 1 migration + 5 tests (including 2 revert-test pairs).

---

## 3. U-2 — Group Scoping: Null-Bypass + Cross-School Teacher (RE-12 + RE-13)

**Priority: HIGH — tenant isolation, bundle because both touch `groupController.js`.**

### RE-12 — Update/delete null-bypass

**File:** `backend/controllers/groupController.js`

`updateGroup` (~line 177) and `deleteGroup` (~line 223) both use the three-part condition:
```js
// BEFORE (broken — null bypasses):
if (req.user.schoolId && group.schoolId && group.schoolId !== req.user.schoolId)
  return res.status(403).json(...);

// AFTER (fixed — matches two-part pattern of getGroup):
if (!group.schoolId || group.schoolId !== req.user.schoolId)
  return res.status(403).json(...);
```

Note: `getGroup` (single record fetch) already uses the two-part pattern correctly — the fix brings update/delete into alignment.

### RE-13 — Cross-school teacher in group create/update

**File:** `backend/controllers/groupController.js`

`createGroup` and `updateGroup` both validate the teacher via `User.findByPk(teacherId)` with no school scope — a reception can link any teacher from any school to a group.

```js
// BEFORE (broken):
const teacher = await User.findByPk(teacherId);
if (!teacher || teacher.role !== 'teacher') return res.status(400)...;

// AFTER (fixed):
const teacher = await User.findOne({
  where: { id: teacherId, role: 'teacher', schoolId: req.user.schoolId }
});
if (!teacher) return res.status(404).json({
  success: false,
  error: { code: 'TEACHER_NOT_FOUND' }
});
```

### Tests / revert-tests

**Revert-test RE-12a — null-schoolId group update:**
1. Seed group with `schoolId: null`
2. PUT /groups/:id as reception from a different school
3. Assert: **200 OK** (the bypass — confirming leak)
4. Apply fix
5. Assert: **403** (bypass closed)

**Revert-test RE-12b — null-schoolId group delete:** same pattern.

**Revert-test RE-13 — cross-school teacher in createGroup:**
1. Use teacherId belonging to school-B as school-A reception
2. POST /groups with that teacherId
3. Assert: **200/201** (cross-school teacher accepted — confirming leak)
4. Apply fix
5. Assert: **404** (teacher not found in own school)

**Test RE-13 update — same cross-school check in updateGroup.**

### Dependencies

None — self-contained backend-only.

### Estimate

**M (medium)** — 2 condition fixes + 1 teacher-lookup fix in 2 methods + 4 tests.

---

## 4. U-3 — Teacher Assignment Scope: Per-Reception → Per-School (RE-14)

**Priority: HIGH — tenant-isolation scope correction. Max's decision: per-school.**

### Current behavior (broken UX)

`getTeachers` returns ALL teachers at the school (school-scope).  
`createParent`/`updateParent` validate teacher via `createdBy: req.user.id` (per-reception).  
`getGroups` filters by `includeTeacher.where = { createdBy: req.user.id }` (per-reception).

Result: a teacher is visible in the teacher list but cannot be assigned to a parent — confusing UX where the user can see the option but cannot use it.

### Fix

**`backend/controllers/receptionParentController.js`**

*`createParent` teacher validation (~line 59-62):*
```js
// BEFORE:
const teacherWhere = { id: teacherId, role: 'teacher', createdBy: req.user.id };
if (req.user.schoolId) teacherWhere.schoolId = req.user.schoolId;

// AFTER:
const teacherWhere = { id: teacherId, role: 'teacher', schoolId: req.user.schoolId };
```

*`updateParent` teacher validation (~line 164-168):* identical change.

**`backend/controllers/groupController.js`**

*`getGroups` reception filter (~line 37):*
```js
// BEFORE:
includeTeacher.where = { createdBy: req.user.id };

// AFTER:
includeTeacher.where = { schoolId: req.user.schoolId };
```

This means all receptions at the same school see the same groups and can assign any school teacher.

### Tests / revert-tests

**Revert-test — cross-reception teacher assignment:**
1. Seed school-A with reception-R1 and reception-R2; teacher-T1 created by R1
2. As R2: call `POST /reception/parents` with `teacherId = T1.id`
3. Assert: **400/404** (per-reception blocks — confirming the old behavior)
4. Apply fix
5. Assert: **201** (per-school allows — confirming fix works)

**Test — getGroups returns all school teachers' groups:**
As reception-R2, call `GET /groups`; assert groups belonging to teacher-T1 (created by R1) are included.

### Dependencies

Depends on U-2 being complete first if both touch groupController.js in the same session — but the changes are in different methods and do not conflict.

### Estimate

**M (medium)** — 2 field changes across 2 controllers + 2 tests.

---

## 5. U-4 — Documents Page Fix + New DELETE Endpoint (RE-2 + RE-15)

**Priority: HIGH — the Documents page is the reception's primary onboarding workflow (uploading qualification docs to become `documentsApproved`). Currently 100% broken.**

### Frontend fixes (RE-2) — `reception/src/pages/Documents.jsx`

| Bug | Fix |
|---|---|
| GET URL `/reception/my-documents` | Change to `/reception/documents` |
| POST URL `/reception/my-documents` | Change to `/reception/documents` |
| DELETE URL `/reception/my-documents/:id` | Change to `/reception/documents/:id` |
| FormData field `document` | Change to `file` (matches `upload.single('file')`) |
| `documentType` not sent | Add a `documentType` selector to the upload UI (at minimum a required `<select>` or `<input>`) |
| Shape accessor `res.data.documents` | Change to `res.data.data` |
| Silent catch on GET (`catch { setDocs([]) }`) | Replace with error state + visible error message; remove `// endpoint may not exist yet` comment |

### Backend new endpoint (RE-15) — `DELETE /reception/documents/:id`

**File:** `backend/controllers/receptionController.js`  
**Route:** `backend/routes/receptionRoutes.js`

Guards (in order):
1. **Ownership:** `document.userId === req.user.id` → 403 `DOCUMENT_ACCESS_DENIED`
2. **Status:** `document.status !== 'pending'` → 400 `DOCUMENT_CANNOT_DELETE_NON_PENDING`

```js
// DELETE /reception/documents/:id
export const deleteDocument = async (req, res) => {
  try {
    const { id } = req.params;
    const document = await Document.findByPk(id);
    if (!document) return res.status(404).json({ success: false, error: { code: 'DOCUMENT_NOT_FOUND' } });
    if (document.userId !== req.user.id)
      return res.status(403).json({ success: false, error: { code: 'DOCUMENT_ACCESS_DENIED' } });
    if (document.status !== 'pending')
      return res.status(400).json({ success: false, error: { code: 'DOCUMENT_CANNOT_DELETE_NON_PENDING' } });
    await document.destroy();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR' } });
  }
};
```

Add 3 new i18n codes to `audits/backend/i18n-error-codes.md`: `DOCUMENT_NOT_FOUND`, `DOCUMENT_ACCESS_DENIED`, `DOCUMENT_CANNOT_DELETE_NON_PENDING`.

### Tests / revert-tests (backend DELETE endpoint)

**Revert-test — ownership guard:**
1. Create document owned by user-A
2. Call DELETE as user-B (different userId JWT)
3. **Before guard:** assert 200 (the bypass — revert confirms guard is needed)
4. Apply ownership guard
5. Assert 403

**Test — status guard:**
Create document with `status: 'approved'`. Call DELETE as owner. Assert 400 `DOCUMENT_CANNOT_DELETE_NON_PENDING`.

**Test — success case:**
Create document with `status: 'pending'`, owned by current user. Call DELETE. Assert 200, document gone from DB.

**Frontend tests:**
- Test: Documents component calls GET `/reception/documents` (not `/reception/my-documents`)
- Test: Upload sends FormData with field named `file` (not `document`)
- Test: Upload includes `documentType` field
- Test: Failed GET shows error message (not empty list)

### Dependencies

None. Backend endpoint is new (no existing code broken). Frontend fixes are in isolation.

### Estimate

**L (large)** — backend endpoint + 3 backend tests + frontend overhaul + 4 frontend tests + 3 i18n codes.

---

## 6. U-5 — CP-023 Password Gate (RE-4)

**Priority: HIGH — safety gate. A reception with `mustChangePassword: true` is soft-locked: all API calls return 403, no recovery path exists in the UI.**

### Fix (Admin pattern, Reception port)

**`reception/src/context/AuthContext.jsx`**  
Expose `mustChangePassword` from the decoded user object in `createAuthContext` (same as Government Sprint E1).

**`reception/src/pages/ChangePassword.jsx`** (new file)  
Minimal page with password + confirm fields → `PUT /user/password`. On success: clear `mustChangePassword` flag from context, `navigate('/reception')`. Can reuse the password-form sub-component already present in `Settings.jsx`.

**`reception/src/App.jsx` — `AppRoutes`**  
Add redirect logic before rendering protected routes:
```jsx
if (isAuthenticated && isReception && mustChangePassword) {
  return <Navigate to="/reception/change-password" replace />;
}
```
Also add the `/reception/change-password` route (accessible without the `mustChangePassword` guard cleared, so the user can actually reach it).

### Tests

- Test: `ProtectedRoute` — when `mustChangePassword === true`, renders redirect to `/reception/change-password`
- Test: `ChangePassword` page — calls `PUT /user/password` on submit
- Test: `ChangePassword` page — on success, navigates to dashboard
- Smoke test: `ChangePassword` page renders without error

### Dependencies

None. Backend gate already enforces; frontend is additive.

### Estimate

**M (medium)** — 1 new page + 2 context lines + 1 route redirect + 4 tests.

---

## 7. U-6 — Toast Stability: `useRef` Stabilization (RE-1)

**Priority: HIGH — prevents potential fetch loops on pathological re-renders. Follows exact Admin Phase 3 pattern.**

### Affected pages (3)

1. `reception/src/pages/ParentManagement.jsx` — `loadParents` useCallback
2. `reception/src/pages/TeacherManagement.jsx:80` — `loadTeachers` useCallback
3. `reception/src/pages/GroupManagement.jsx:49` — `loadData` useCallback

### Pattern (apply identically to all three)

```js
// BEFORE:
const { showError } = useToast();
const loadTeachers = useCallback(async () => {
  ...
  showError(...);
  ...
}, [showError, t]);    // ← showError in deps → unstable

// AFTER:
const { showError } = useToast();
const showErrorRef = useRef(showError);
useEffect(() => { showErrorRef.current = showError; }, [showError]);
const loadTeachers = useCallback(async () => {
  ...
  showErrorRef.current(...);
  ...
}, [t]);               // ← showError removed from deps → stable
```

If `t` (i18n) is also stable from the library, it can be removed from deps too — verify. If `t` has a stable reference, the dep array becomes `[]`.

### Tests

Smoke tests confirming each page still renders and the load function is still called. No new behavior introduced — the fix is mechanical.

### Dependencies

None.

### Estimate

**S (small)** — 3-file mechanical change, ~10 lines per file, 3 smoke tests.

---

## 8. U-7 — Silent Failures: Bulk-Delete + GroupStep (RE-7 + sweep finding)

**Priority: MED — UX reliability. The GroupStep silence is HIGH-impact because it blocks parent registration.**

### RE-7 — Bulk-delete silent failure (`reception/src/pages/ParentManagement.jsx`)

```js
// BEFORE (broken):
for (const id of selectedRows) {
  try {
    await api.delete(`/reception/parents/${id}`);
  } catch {} // ← swallowed silently
}

// AFTER (fixed):
const failed = [];
for (const id of selectedRows) {
  try {
    await api.delete(`/reception/parents/${id}`);
  } catch (err) {
    failed.push(id);
  }
}
if (failed.length > 0) {
  showError(t('parentsPage.bulkDeletePartialFailure', { count: failed.length }));
}
```

Add i18n key `parentsPage.bulkDeletePartialFailure` to all locale files (en/uz/ru — uz/ru UNVERIFIED).

### GroupStep silent groups-fetch failure (`reception/src/pages/ParentWizard/steps/GroupStep.jsx`)

```js
// BEFORE (broken):
.catch(() => {}); // ← empty catch, shows "no groups"

// AFTER (fixed):
.catch((err) => {
  setError(t('groupStep.loadError', { defaultValue: 'Failed to load groups. Please try again.' }));
});
```

Add an error state to GroupStep and render it when set. The wizard's Next/Submit button should be disabled if groups failed to load.

### Tests

- Test: bulk-delete with one failing DELETE call surfaces a toast with the failure count
- Test: GroupStep with failed API call shows an error message (not empty list)

### Dependencies

None.

### Estimate

**S (small)** — 2 catch block fixes + 2 tests + 1 i18n key.

---

## 9. U-8 — CP/Cosmetic: Translation Notice, express dep, window.confirm (RE-5 + RE-6 + RE-8)

**Priority: LOW-MED. Ship after all security/stability fixes.**

### RE-5 — CP-019 Translation notice (MED)

Port the `TranslationNotice.jsx` component from the admin or government portal into `reception/src/components/`.  
Mount in `reception/src/components/Layout.jsx` (same position as admin portal implementation).  
No backend changes.

### RE-6 — express stray production dependency (LOW)

**`reception/package.json`:** remove `"express": "^4.18.2"` from `dependencies`. Express is never imported in the reception React app.

```bash
npm uninstall express  # from within the reception/ directory
```

Run `npm run build` afterward to confirm the bundle builds cleanly.

### RE-8 — `window.confirm` in ParentWizard draft restore (LOW)

**`reception/src/pages/ParentWizard/ParentWizardPage.jsx:39`:**
```js
// BEFORE:
const resume = window.confirm("Saqlangan qoralama topildi. Davom etishni xohlaysizmi?");

// AFTER:
// Replace with a ConfirmDialog or a banner — same pattern used across the portal.
// Extract string to i18n: parentsPage.wizard.draftRestorePrompt
```

The draft-restore banner can be a simple dismissable in-UI bar (not a full dialog) since it appears on page load before any user action.

### Tests

- CP-019: confirm TranslationNotice renders in Layout (smoke)
- RE-6: build passes after express removal
- RE-8: ParentWizard smoke test (window.confirm no longer called)

### Dependencies

RE-5 depends on having the shared TranslationNotice component available — copy from admin or government portal.

### Estimate

**S (small)** — 3 independent changes, ~3 tests.

---

## 10. Deferred Items

### RE-3 — `/groups` old response shape (MED → deferred)

**Reason:** CP-003 grandfather clause. The `/groups` endpoint returns `{ groups, total }` (old shape). All four frontend consumers correctly access `res.data.groups`. No live breakage. Migration requires updating all 4 consumers simultaneously (Dashboard, GroupManagement, GroupStep, ParentManagement). Defer until the endpoint is touched for another reason.

**When to revisit:** Any S7 feature work that touches the groups endpoint or any of its 4 consumers.

### RE-9 — Dashboard "Activate" button dead (INFO → deferred)

**Reason:** Developer's `// TODO(phase-2)` comment is intentional. No endpoint exists for reception-side parent activation (that is an admin action). Defer to feature phase if reception scope expands.

---

## 11. Max's Decisions — Confirmed Locked

| Decision | Outcome | Impact |
|---|---|---|
| RE-14: Teacher assignment scope | **Per-school** — `schoolId: req.user.schoolId` in createParent/updateParent/getGroups | Receptions at the same school can assign any school teacher; cross-reception assignment now works |
| RE-15: Documents DELETE endpoint | **Add backend endpoint** with ownership + pending-only guards | New `DELETE /reception/documents/:id` with `DOCUMENT_ACCESS_DENIED` and `DOCUMENT_CANNOT_DELETE_NON_PENDING` error codes |

Both decisions are locked. S3 executes without further input.

---

## 12. S3 Execution Order

Execute units in this order — each is independently committable:

| Order | Unit | Security relevance | Estimate |
|---|---|---|---|
| 1 | U-1 (child IDOR) | Tenant-isolation FIX — IDOR closed | L |
| 2 | U-2 (group scoping) | Tenant-isolation FIX — null-bypass closed | M |
| 3 | U-3 (teacher scope RE-14) | Tenant-isolation CORRECTION — per-school | M |
| 4 | U-4 (Documents + DELETE) | Broken core workflow + new endpoint | L |
| 5 | U-5 (CP-023 gate) | Safety gate | M |
| 6 | U-6 (toast stability) | Reliability | S |
| 7 | U-7 (silent failures) | UX reliability | S |
| 8 | U-8 (CP/cosmetic) | Polish | S |

**Security fix count: 3 (U-1, U-2, U-3 all close cross-school isolation gaps)**  
**Total units: 8**
