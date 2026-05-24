# Reception Portal — S6/S7: Lifecycle + Finish Execution

**Date:** 2026-05-24
**Branch:** main
**Prompt:** Loop 4 S6/S7 — delegated lifecycle endpoints + finish-items + frontend UI

---

## Part A — Backend: Delegated Lifecycle Endpoints

**Commit:** `15223f8` — `feat(backend): reception delegated lifecycle — parent + teacher activate/suspend/reset-credentials`

### A-1 — Parent activate/deactivate

Routes:
- `PUT /reception/parents/:id/activate` → `activateParent`
- `PUT /reception/parents/:id/suspend`  → `suspendParent`

Pattern (both): `User.findOne({ where: { id, role: 'parent', schoolId: req.user.schoolId } })` — deny-on-null → 404. Defense-in-depth role check at controller level (non-reception → 403 before any DB call). Sets `users.status` to `'active'` / `'suspended'`. `logAudit` called before `save()`. Idempotent: already-in-target-state → 409.

**Revert-test results (from `receptionLifecycle.test.js`):**

```
✓ [REVERT-TEST] cross-school parent (null schoolId) → 404, no information leak
  mockUserFindOne returns null (schoolId filter eliminates foreign parent)
  → res.status called with 404 ✓

✓ [REVERT-TEST] cross-school parent (null schoolId) → 404  [suspendParent]
  → res.status called with 404 ✓
```

### A-2 — Teacher activate/deactivate

Routes:
- `PUT /reception/teachers/:id/activate` → `activateTeacher`
- `PUT /reception/teachers/:id/suspend`  → `suspendTeacher`

Identical pattern to A-1, role: `'teacher'`.

**Revert-test results:**

```
✓ [REVERT-TEST] cross-school teacher (null schoolId) → 404  [activateTeacher]
  → res.status called with 404 ✓

✓ [REVERT-TEST] cross-school teacher → 404  [suspendTeacher]
  → res.status called with 404 ✓
```

### A-3 — Parent credential-restore

Route: `POST /reception/parents/:id/reset-credentials` → `resetParentCredentials`

School-scoped + deny-on-null lookup (own-school parent only). Generates a 12-char alphanumeric temp password, assigns to `parent.password` (beforeSave hook hashes it with Argon2id), sets `mustChangePassword = true`, calls `logAudit` (action: `'reset_credentials'`, entity: `'parents'`), then `parent.save()`. Returns `{ success: true, data: { tempPassword } }` — the plain temp password is returned once so reception can relay it. Reception never sees the old password hash.

**Revert-test:**

```
✓ [REVERT-TEST] cross-school parent (null or different schoolId) → 404
  mockUserFindOne({ where: { schoolId: SCHOOL_A } }) returns null → 404 ✓
```

**Credential-security assertion (test: "returns tempPassword; sets mustChangePassword = true; NEVER returns original hash"):**

```js
const ORIGINAL_HASH = '$2b$10$ORIGINAL_HASHED_PASSWORD_NEVER_EXPOSED';
// After resetParentCredentials():
expect(parent.mustChangePassword).toBe(true);                          // ✓
expect(parent.password).not.toBe(ORIGINAL_HASH);                       // ✓ replaced by temp
expect(parent.password).toMatch(/^[A-Za-z0-9]{12}$/);                  // ✓ temp password shape
const responseBody = JSON.stringify(res.json.mock.calls[0][0]);
expect(responseBody).not.toContain(ORIGINAL_HASH);                     // ✓ hash never returned
expect(res.json).toHaveBeenCalledWith(
  expect.objectContaining({ data: expect.objectContaining({ tempPassword: expect.any(String) }) })
);                                                                      // ✓ temp returned once
```

All assertions pass. Reception cannot impersonate; no hash exposure.

### A-4 — Teacher credential-restore

Route: `POST /reception/teachers/:id/reset-credentials` → `resetTeacherCredentials`

Identical pattern, role: `'teacher'`.

**Revert-test:**

```
✓ [REVERT-TEST] cross-school teacher → 404; schoolId scope enforced
  mockUserFindOne({ where: { schoolId: SCHOOL_A, role: 'teacher' } }) returns null → 404 ✓
```

**Credential-security assertion (same structure as A-3, teacher variant — both pass).**

### Part A test suite

File: `backend/__tests__/controllers/receptionLifecycle.test.js`

```
Test Suites: 1 passed, 1 total
Tests:       29 passed, 29 total
```

Coverage: 6 revert-test pairs (1 per endpoint), 6 defense-in-depth 403 checks, idempotent 409 checks, success + DB-error paths for all 6 endpoints, 2 credential-security assertions.

### Part A — Behavioral isolation supplement

File: `backend/__tests__/controllers/receptionLifecycleBehavioral.test.js`

**Why:** The existing revert-tests mock `findOne` to return `null` and assert the 404 handler fires. They prove null-handling is correct but do not prove the `WHERE schoolId` clause itself filters correctly. These tests close that gap.

**Approach:** `jest.unstable_mockModule` redirects `'../../models/User.js'` to a real in-memory SQLite `UserModel` (same field definitions, no mocks). All other model imports get empty stubs. The actual `User.findOne({ where: { id, role, schoolId } })` call in the controller executes as a live SQL query against seeded two-school data.

**Seed:** school-A parent + teacher, school-B parent + teacher — all seeded with known sentinel passwords and `status: 'suspended'`.

**Per-endpoint test pair:**

| Endpoint | Cross-school call | Assertion |
|---|---|---|
| `activateParent` | reception-A → parentB.id | 404; `parentB.status` still `'suspended'` in DB |
| `suspendParent` | reception-A → parentB.id | 404; `parentB.status` still `'active'` in DB |
| `resetParentCredentials` | reception-A → parentB.id | 404; `parentB.password` == seed hash (unchanged); `mustChangePassword` still false |
| `activateTeacher` | reception-A → teacherB.id | 404; `teacherB.status` still `'suspended'` in DB |
| `suspendTeacher` | reception-A → teacherB.id | 404; `teacherB.status` still `'active'` in DB |
| `resetTeacherCredentials` | reception-A → teacherB.id | 404; `teacherB.password` == seed hash (unchanged); `mustChangePassword` still false |

Each describe block also has a same-school success test proving the WHERE clause is correctly selective — only the schoolId boundary stops the cross-school case.

```
Test Suites: 1 passed, 1 total
Tests:       12 passed, 12 total   (6 cross-school isolation + 6 same-school success)
```

### Part A i18n

11 new error codes added to `backend/i18n/uz-latn.json`, `ru.json`, `uz-cyrl.json`. Count: 135 → 146 (UNVERIFIED machine translation). New codes include: `PARENT_NOT_FOUND`, `PARENT_ALREADY_ACTIVE`, `PARENT_ALREADY_SUSPENDED`, `TEACHER_NOT_FOUND`, `TEACHER_ALREADY_ACTIVE`, `TEACHER_ALREADY_SUSPENDED`, `CREDENTIAL_RESET_FAILED`, plus status/action variants. All added to `audits/backend/i18n-error-codes.md`.

---

## Part B — Finish-items

### B-1 — RG-001: Dashboard pending-docs URL bug

**Commit:** `6b41aab` — `feat(reception): groups shape migration (RE-3) + RG-004 frontend test suite`

`Dashboard.jsx` fixed:
- URL: `/reception/my-documents` → `/reception/documents`
- Accessor: `.data.documents` → `.data.data`
- Silent `.catch(() => ({ data: { documents: [] } }))` removed — errors now surface

**`my-documents` grep — zero remaining in production code:**

```
$ grep -r "my-documents" reception/src/
reception/src/__tests__/pages/Dashboard.test.jsx: * RG-001: Dashboard must call /reception/documents (not the old /reception/my-documents)
reception/src/__tests__/pages/Dashboard.test.jsx:  it('[RG-001] calls /reception/documents (NOT /reception/my-documents)', ...
reception/src/__tests__/pages/Dashboard.test.jsx:    expect(urls).not.toContain('/reception/my-documents');
```

Only the test file references the old URL — as a negative assertion proving it's gone. Zero instances in `src/pages/` or any other production file.

### B-2 — RG-004: Tests for core workflow screens

Added in `6b41aab`:

| File | Tests |
|---|---|
| `TeacherManagement.test.jsx` | 11 (render, filter, create, edit, delete, ratings modal, error toast) |
| `GroupManagement.test.jsx` | 10 (render, create, edit, delete, teacher assign, shape guard) |
| `Dashboard.test.jsx` | 6 (counts render, pending-docs RG-001, pending-parents, RG-002 dead-button removed) |

Then `9e0e8c9` added 3 lifecycle tests to each of TeacherManagement and ParentManagement (see Part C).

### B-3 — RE-3 / CP-003: Groups shape migration

**Backend:** `groupController.js` `GET /groups` now returns:
```json
{ "success": true, "data": [...] }
```
(was `{ groups: [...], total: N }`)

**All 4 consumers updated simultaneously in `6b41aab`:**

| File | Before | After |
|---|---|---|
| `GroupManagement.jsx` | `res.data.groups` | `res.data.data` |
| `GroupStep.jsx` | `res.data.groups` | `res.data.data` |
| `Dashboard.jsx` | `groupsRes.value.data?.groups` | `groupsRes.value.data?.data` |
| `ParentManagement.jsx` | `res.data.groups` | `res.data.data` |

Test mocks in `GroupManagement.test.jsx` and `GroupStep.test.jsx` encode the new shape from the start.

---

## Part C — Frontend: Lifecycle UI

**Commit:** `9e0e8c9` — `feat(reception): lifecycle UI for parents and teachers (Part C, S6/S7)`

### C-1 — ParentManagement.jsx

- Activate/suspend toggle: `PUT /reception/parents/:id/activate` or `/suspend`, gated by `ConfirmDialog`
- Status badge: green `active` / red `To'xtatilgan (suspended)`
- Reset credentials: `POST /reception/parents/:id/reset-credentials` → on success, temp-password modal appears with the one-time password + clipboard copy + "must change on next login" note
- Optimistic local state: parent's `status` field updated in the local array after confirmed action; refetch on credential reset

**3 lifecycle tests added (ParentManagement.test.jsx now 14 tests):**
```
✓ calls PUT /reception/parents/:id/activate for a suspended parent
✓ opens confirm dialog then calls PUT /reception/parents/:id/suspend
✓ shows temp password modal after credential reset
```

### C-2 — TeacherManagement.jsx

Same pattern as C-1 for teachers (`/reception/teachers/:id/activate|suspend|reset-credentials`).

**3 lifecycle tests added (TeacherManagement.test.jsx now 14 tests):**
```
✓ calls PUT /reception/teachers/:id/activate for a suspended teacher
✓ opens confirm dialog then calls PUT /reception/teachers/:id/suspend
✓ shows temp password modal after teacher credential reset
```

### Part C i18n

`parentsPage.tempPasswordTitle`, `parentsPage.tempPasswordNote`, `teachersPage.tempPasswordTitle`, `teachersPage.tempPasswordNote` — added inline with `defaultValue` Uzbek fallbacks (uz/ru UNVERIFIED; follow CP-019-VERIFY pattern).

---

## Final State

### Test counts

**Backend:**
```
Test Suites: 117 passed, 117 total
Tests:       1243 passed, 1243 total
```
(was 1199 before S6/S7; +44 tests: 29 mock-based lifecycle + 12 behavioral isolation + 1 group shape + 2 group test updates)

**Reception frontend:**
```
✓ auth.test.js                  (6 tests)
✓ GroupStep.test.jsx             (3 tests)
✓ Dashboard.test.jsx             (6 tests)
✓ ChangePassword.test.jsx        (4 tests)
✓ GroupManagement.test.jsx       (10 tests)
✓ TeacherManagement.test.jsx     (14 tests)
✓ utils.test.js                  (17 tests)
✓ ParentManagement.test.jsx      (14 tests)
✓ settings.test.jsx              (12 tests)
Total: 9 suites / 86 tests / 0 failures
```
(was 41 before S6/S7)

**Lint:** 0 errors, 0 warnings portal-wide (both backend and reception).

### `my-documents` grep

Zero remaining instances in production code — confirmed above.

### 4 Revert-test results (cross-school → 404)

| Endpoint | Test name | Result |
|---|---|---|
| `PUT /parents/:id/activate` | `[REVERT-TEST] cross-school parent (null schoolId) → 404` | ✓ PASS |
| `PUT /parents/:id/suspend` | `[REVERT-TEST] cross-school parent (null schoolId) → 404` | ✓ PASS |
| `POST /parents/:id/reset-credentials` | `[REVERT-TEST] cross-school parent (null or different schoolId) → 404` | ✓ PASS |
| `PUT /teachers/:id/activate` | `[REVERT-TEST] cross-school teacher (null schoolId) → 404` | ✓ PASS |
| `PUT /teachers/:id/suspend` | `[REVERT-TEST] cross-school teacher → 404` | ✓ PASS |
| `POST /teachers/:id/reset-credentials` | `[REVERT-TEST] cross-school teacher → 404; schoolId scope enforced` | ✓ PASS |

All 6 revert-tests pass. No new IDOR paths introduced.

### Credential-security assertion

Confirmed in `receptionLifecycle.test.js` for both parent and teacher reset:
- Original hash never appears in the response body ✓
- `mustChangePassword` set to `true` before save ✓
- Temp password is a 12-char alphanumeric string ✓
- `tempPassword` returned once in `data.tempPassword` ✓
- Reception cannot set an arbitrary password — only system-generated temp ✓

### Manual gate — ✅ COMPLETED by Max 2026-05-24

1. **Deactivate blocks login:** ✅ Suspend a parent → login blocked. Reactivate → login works.
2. **Credential reset forces change:** ✅ Temp password works for login; CP-023 gate fires and redirects to password-change before any other action.
3. **Cross-school sanity:** ✅ Reception cannot see or manage another school's accounts (404).
4. **Dashboard pending-docs card:** ✅ Shows real pending count from `/reception/documents`.

---

## Commits (Part A → B → C order)

| SHA | Description |
|---|---|
| `15223f8` | feat(backend): reception delegated lifecycle — parent + teacher activate/suspend/reset-credentials |
| `6b41aab` | feat(reception): groups shape migration (RE-3) + RG-004 frontend test suite |
| `9e0e8c9` | feat(reception): lifecycle UI for parents and teachers (Part C, S6/S7) |
