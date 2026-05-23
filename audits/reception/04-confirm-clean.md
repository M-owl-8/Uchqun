# Reception Portal — Step 4: Confirm Clean

**Date:** 2026-05-23
**Branch:** main
**Verdict: 🟢 CLEAN — all S3 fixes hold in current code**

---

## 0. Executive Summary

All 8 S3 units verified in current code via grep/read (not from the S3 log). No drift found.
Lint: 0 errors / 0 warnings portal-wide. Silent-failure re-grep: no new empty catches; the 3
existing ones are intentional stale-while-revalidate paths. Null-schoolId anti-pattern sweep:
no third instance in reception-reachable controllers — but one instance found in a general child
route (`checkChildAccess`, `PUT /children/:id`) that is technically reachable by reception tokens.
Flagged as S5 finding. ParentManagement test residual: **FIXED** — all 11 tests now pass.

---

## 1. Unit-by-Unit Re-Verification (Job 1)

### U-1 — Child IDOR Guards + Creation Scope

**File:** `backend/controllers/receptionParentController.js`

**createChildForParent (RE-11):**
- Line 236: `User.findOne({ where: { id: parentId, role: 'parent', schoolId: req.user.schoolId } })` — parent lookup scoped to reception's school ✅
- Line 276: `const schoolId = req.user.schoolId` — authoritative school from token, no free-text lookup ✅

**updateChildForReception (RE-10):**
- Line 301: `if (!child.schoolId || child.schoolId !== req.user.schoolId)` — two-part guard, null is BLOCKED ✅

**deleteChildForReception (RE-10):**
- Line 362: `if (!child.schoolId || child.schoolId !== req.user.schoolId)` — same pattern ✅

**Backfill migration:** `20260523100000-backfill-child-schoolid.js` exists with orphan logging.
Not yet run on Railway (commits not pushed). Live DB query shows 1 child with null schoolId
(id=5a95116a, parent has schoolId 4ffc18f4-...) → will resolve automatically on deploy. 0 orphans.

---

### U-2 — Group Null-Bypass + Cross-School Teacher

**File:** `backend/controllers/groupController.js`

**updateGroup (RE-12):**
- Line 179: `if (!group.schoolId || group.schoolId !== req.user.schoolId)` ✅

**deleteGroup (RE-12):**
- Line 226: `if (!group.schoolId || group.schoolId !== req.user.schoolId)` ✅

**createGroup teacher lookup (RE-13):**
- Line 137: `User.findOne({ where: { id: teacherId, role: 'teacher', schoolId: req.user.schoolId } })` ✅

**updateGroup teacher lookup (RE-13):**
- Line 185: `User.findOne({ where: { id: teacherId, role: 'teacher', schoolId: req.user.schoolId } })` ✅

---

### U-3 — Per-School Teacher Scope in getGroups

**File:** `backend/controllers/groupController.js`

- Line 38: `includeTeacher.where = { schoolId: req.user.schoolId }` — reception path uses schoolId, NOT createdBy ✅

---

### U-4 — Documents Page + DELETE Endpoint

**File:** `reception/src/pages/Documents.jsx`

- Line 25: `api.get('/reception/documents')` — correct URL ✅
- Line 26: `Array.isArray(res.data.data)` — correct shape accessor ✅
- Line 49: `formData.append('file', file)` — correct field name ✅
- Line 50: `formData.append('documentType', documentType)` — documentType present ✅
- Line 16: `const [fetchError, setFetchError] = null` + visible banner (lines 101-106) ✅
- No `// endpoint may not exist yet` or silent catch ✅

**File:** `backend/controllers/receptionController.js`

- deleteDocument (line 93): ownership guard (403 DOCUMENT_ACCESS_DENIED) ✅
- deleteDocument (line 103): pending-only guard (400 DOCUMENT_CANNOT_DELETE_NON_PENDING) ✅
- deleteDocument (line 97): 404 DOCUMENT_NOT_FOUND ✅

---

### U-5 — CP-023 Forced Password Gate

- `reception/src/App.jsx` line 38: `if (isAuthenticated && isReception && mustChangePassword && !isChangePasswordPage)` — redirect present ✅
- `reception/src/App.jsx` line 26: `mustChangePassword` destructured from `useAuth()` ✅
- `reception/src/pages/ChangePassword.jsx` line 43: `setUser({ ...user, mustChangePassword: false })` on success ✅

---

### U-6 — Toast Stability (3 pages)

All 3 pages have the useRef pattern:

- `GroupManagement.jsx` lines 35-36: `showErrorRef = useRef(showError)` + sync effect ✅
- `TeacherManagement.jsx` lines 48-49: same pattern ✅
- `ParentManagement.jsx` lines 77-78: same pattern ✅

`showError` NOT in any useCallback dep array in these 3 files ✅

---

### U-7 — Silent Failures

**GroupStep.jsx:**
- Line 20: `.catch(() => setFetchError('groupStep.loadError'))` — error state surfaced, no empty catch ✅
- Error banner rendered conditionally before loading skeleton ✅

**ParentManagement.jsx bulk-delete:**
- Lines 409-414: `catch { failed++ }` per row + `showErrorRef.current(...)` if any failures ✅

---

### U-8 — Cosmetic

- `TranslationNotice` in `reception/src/components/Layout.jsx` line 60 ✅
- `express` NOT in `reception/package.json` dependencies ✅
- `window.confirm(` — 0 matches in `reception/src` ✅ (only comments remain)

---

## 2. Re-Run Results (Job 2)

### Backend

```
Test Suites: 115 passed, 115 total
Tests:       1199 passed, 1199 total
```

Verified via `npm test` from `backend/` directory.

### Reception (Vitest)

```
✓ auth.test.js            6 tests  pass
✓ utils.test.js          17 tests  pass
✓ GroupStep.test.jsx      3 tests  pass
✓ ChangePassword.test.jsx 4 tests  pass
✓ ParentManagement.test.jsx 11 tests pass  ← was 9 fail / 2 pass pre-S4; now 11/11 ✅
```

**Total: 41 pass / 0 fail** (was 32 pass / 9 fail at end of S3)

### Lint

```
Reception: 0 errors, 0 warnings  ✅
```

Verified via `npx eslint src/` from `reception/`.

### Silent-Failure Re-Grep

Grep: `catch\s*\(\s*\)\s*\{\s*\}|\.catch\s*\(\s*\(\s*\)\s*=>\s*\{\s*\}\s*\)` on `reception/src`:

Matches found:

| File | Line | Context | Verdict |
|---|---|---|---|
| `Dashboard.jsx:63` | `.catch(() => {})` | Background refresh when cache already populated (user sees stale data, not an error) | **Intentional** — stale-while-revalidate |
| `ParentManagement.jsx:110` | `fetchFresh().catch(() => {})` | Same pattern — cache hit path, background refresh | **Intentional** — stale-while-revalidate |
| `TeacherManagement.jsx:68` | `fetchFresh().catch(() => {})` | Same pattern | **Intentional** — stale-while-revalidate |
| `auth.test.js:30` | `.catch(() => {})` | Test file, logout cleanup | **Intentional** — test teardown |

S3 closed the two blocking silent failures (GroupStep was blocking display of groups entirely; Documents was silently swallowing upload errors). The three remaining `catch(() => {})` instances are all in the "cache hit → background refresh fails → stale data shown" path. This is a deliberate UX choice (no error flash when user already has data). Not a gap.

### Null-schoolId Anti-Pattern Sweep (the systemic check)

Grep: `\.schoolId\s*&&\s*\w+\.schoolId\s*!==` across all `backend/controllers/`:

| File | Line | Pattern | Reception-reachable? | Verdict |
|---|---|---|---|---|
| `childController.js:202` | `parent?.schoolId && parent.schoolId !== req.user.schoolId` | YES — `PUT /children/:id` via `checkChildAccess` middleware | **⚠️ THIRD INSTANCE — flagged** |
| `emotionalMonitoringController.js:88` | `req.user.role === 'admin' && req.user.schoolId && child.schoolId !== ...` | No — admin only; condition checks req.user.schoolId not resource.schoolId | Safe (opposite direction) |
| `groupController.js:108` (getGroup) | `req.user.schoolId && group.schoolId !== ...` | getGroup not in receptionRoutes.js | Not reception-reachable |
| `newsController.js:140,177` | `newsItem.schoolId && req.user.schoolId && newsItem.schoolId !== ...` | News routes not in receptionRoutes.js | Not reception-reachable |
| `teacherResourceController.js:125` | `req.user.role === 'admin' && req.user.schoolId && ...` | Admin only | Not reception-reachable |

**Third instance detail (`checkChildAccess`, `childController.js:202`):**

```js
// PUT /children/:id  (childRoutes.js — requireRole includes 'reception')
if (req.user.schoolId) {
  const parent = await User.findByPk(child.parentId);
  if (parent?.schoolId && parent.schoolId !== req.user.schoolId) {   // ← OLD PATTERN
    return res.status(403).json({ error: 'You can only edit children in your institution' });
  }
}
```

If `parent.schoolId` is null: `null && ...` → false → guard bypassed → reception can update
any child whose parent has null schoolId. The backfill migration (U-1) resolves most null-schoolId
parents, but the code pattern remains broken.

**Severity:** Medium. The frontend uses `/reception/children/:id` (receptionParentController.js,
FIXED) not `/children/:id`. However, a direct API call with a reception token to `PUT /children/:id`
would hit this unguarded path. Tracked as **S4-NEW-01** — fix in S5 cleanup.

**Reception-reachable IDOR status:**
- receptionParentController.js (updateChildForReception, deleteChildForReception): ✅ FIXED (S3)
- groupController.js (updateGroup, deleteGroup): ✅ FIXED (S3)
- checkChildAccess (PUT /children/:id): ⚠️ THIRD INSTANCE — carry to S5

---

## 3. ParentManagement Test Residual (Job 3) — FIXED

**Decision: FIXED.** All 9 pre-existing failures resolved. 11/11 tests pass.

**Root causes found (not just "missing modal mocking"):**

1. **i18n mock returned defaultValue text, not key** — tests looked for translation keys (`parentsPage.search`), component rendered `'Qidirish…'` (the defaultValue). Fix: changed mock to `const t = (k) => k`.

2. **Hardcoded Uzbek in action dropdown** — `Tahrirlash`, `Bola qo'shish`, `O'chirish` not wrapped in `t()`. Tests looked for translation keys. Fix: wrapped all three in `t('parentsPage.buttons.edit')`, `t('parentsPage.buttons.addChild')`, `t('parentsPage.buttons.delete')`.

3. **Create-parent flow is wizard navigation, not modal** — tests 4+5 expected `role="dialog"` after clicking "add", but `handleCreate` calls `navigate('/reception/parents/new')`. Fix: rewrote test 4 to assert navigation; test 5 to test the edit-modal + PUT submission path instead.

4. **Child edit/delete buttons removed in S3** — `_handleEditChild` and `_handleDeleteChild` were prefixed in S3 lint pass (unused), but tests expected child action buttons in the UI. Fix: un-prefixed the handlers, added icon buttons with `title` attributes to the "Bola" table column, shows full child name.

**Component changes (ParentManagement.jsx):**
- Added `Pencil` to lucide imports
- `_handleEditChild` → `handleEditChild`, `_handleDeleteChild` → `handleDeleteChild`
- Action dropdown buttons: `Tahrirlash` → `t('parentsPage.buttons.edit')` etc.
- Bola column: shows `firstName + ' ' + lastName` + icon buttons with `title` attrs
- Removed defaultValue from `parentsPage.search` placeholder and `parentsPage.add` button

**Test changes (ParentManagement.test.jsx):**
- i18n mock: `(k, opts) => opts?.defaultValue ?? k` → `(k) => k`
- Extracted `mockNavigate` outside factory
- Tests 4–5 rewritten to test actual behavior

---

## 4. Confirm-Clean Verdict

| Check | Result |
|---|---|
| U-1 child IDOR guards hold in current code | ✅ |
| U-2 group null-bypass closed in current code | ✅ |
| U-3 per-school teacher scope in getGroups | ✅ |
| U-4 Documents page + DELETE endpoint | ✅ |
| U-5 CP-023 mustChangePassword gate | ✅ |
| U-6 toast useRef pattern (3 pages) | ✅ |
| U-7 GroupStep error banner + bulk-delete failure surfaced | ✅ |
| U-8 TranslationNotice + no express + no window.confirm | ✅ |
| Backend: 115 suites / 1199 tests | ✅ |
| Reception: 41 pass / 0 fail | ✅ |
| Lint: 0 errors / 0 warnings | ✅ |
| Silent-failure sweep: no new empty catches | ✅ |
| Null-schoolId anti-pattern sweep: no NEW reception-reachable instance | ✅ (1 pre-existing in general child route, flagged) |
| ParentManagement test residual | ✅ FIXED |

**Verdict: 🟢 CLEAN**

---

## 5. Residuals Carried to S5

| ID | Description | Severity |
|---|---|---|
| S4-NEW-01 | `checkChildAccess` middleware (`PUT /children/:id`): `parent?.schoolId && parent.schoolId !== req.user.schoolId` null-bypass — reception-reachable via general child routes | Medium → **CLOSED (S4-NEW-01b)** |
| Backfill deploy | 1 child (5a95116a) with null schoolId will resolve automatically when commits push to Railway | Operational |
| PL-009-VERIFY | All new locale strings AI-generated (unverified) | Pre-launch |

---

## 6. S4-NEW-01 Closure (post-clean-verdict fix)

**Date:** 2026-05-23  
**Finding:** S4-NEW-01 — `checkChildAccess` in `backend/controllers/childController.js:202` had the old null-bypass pattern. `PUT /children/:id` in `childRoutes.js` uses `checkChildAccess` as middleware with no `requireRole` guard — the middleware itself allows `['teacher', 'admin', 'reception', 'government', 'business']` at line 196. So a reception token can reach it directly. The bypass: if `parent.schoolId` is null, `parent?.schoolId && ...` = `false` → guard skipped → reception can write any child whose parent has null schoolId.

### Fix

**File:** `backend/controllers/childController.js:202`

```js
// BEFORE (null-bypass):
if (parent?.schoolId && parent.schoolId !== req.user.schoolId) {
  return res.status(403).json({ error: 'You can only edit children in your institution' });
}

// AFTER (null blocked — same two-part guard as RE-10/RE-12):
if (!parent?.schoolId || parent.schoolId !== req.user.schoolId) {
  return res.status(403).json({ error: 'You can only edit children in your institution' });
}
```

**Outer `if (req.user.schoolId)` wrapper** (line 200) confirmed safe: reception always has a schoolId (enforced at account creation). Government users have no schoolId and skip the wrapper entirely — intentional cross-school access.

### Revert-Test Evidence

Three tests added to `backend/__tests__/child.test.js`, describe `checkChildAccess`:

**Pre-fix behavior** (documented in `[REVERT-TEST]` comment): reception from SCHOOL_A + child whose parent has `schoolId: null` → `parent?.schoolId && ...` = `false` → guard bypassed → `next()` called.

**Post-fix run — all 3 pass:**

```
checkChildAccess
  ✓ [REVERT-TEST] null-parent-schoolId returns 403 for cross-school reception (S4-NEW-01) (3 ms)
  ✓ blocks reception when parent has a different (non-null) schoolId (2 ms)
  ✓ allows reception when parent schoolId matches (3 ms)
```

Full backend suite post-fix: **115 suites / 1202 tests** (+3) / 0 fail.

### Sweep Instance Re-Confirmation

The S4 sweep flagged 5 instances with the old schoolId pattern. After closing S4-NEW-01, all are confirmed resolved or confirmed non-reachable by reception:

| Instance | Reception-reachable? | Guard direction | Verdict |
|---|---|---|---|
| `checkChildAccess` (`childController.js:202`) | ✅ YES — `PUT /children/:id`, no `requireRole`, middleware allows reception | `parent?.schoolId &&` (resource null-bypass) | **FIXED** — `!parent?.schoolId \|\|` |
| `emotionalMonitoringController.js:88` | Route: `teacherRoutes.js` + `requireTeacher` (allows reception) BUT the check is `req.user.role === 'admin' && ...` — reception never enters this branch | Admin-only condition; reception is gated by teacher-assignment check instead | **Not a reception bypass** |
| `groupController.js:108` (getGroup) | ✅ YES — `GET /api/v1/groups/:id`, no `requireRole`, just `authenticate` | `req.user.schoolId && group.schoolId !== req.user.schoolId` — check is on `req.user`, NOT `group`: if `group.schoolId` is null then `null !== req.user.schoolId` = true → 403 fires | **Not a bypass** — null group.schoolId is correctly BLOCKED |
| `newsController.js:140,177` (updateNews, deleteNews) | ❌ NO — `requireRole('admin')` before both handlers | N/A | **Not reception-reachable** |
| `teacherResourceController.js:125` | ❌ NO — `requireRole('teacher', 'admin')` | N/A | **Not reception-reachable** |

**Key correction from S4 sweep:** `groupController.js:108 getGroup` was labelled "not in receptionRoutes.js" but the route IS reachable via general `groupRoutes.js GET /:id`. However, the guard direction (`req.user.schoolId` as the leading condition, not `group.schoolId`) means null-schoolId groups are correctly blocked — no bypass exists. The sweep's "not reception-reachable" label was wrong on route accessibility, but the "safe" conclusion holds.

### Updated Null-schoolId Defect Class Status

All reception-reachable child/group mutation endpoints now have the correct two-part guard:

| Endpoint | Guard | Status |
|---|---|---|
| `receptionParentController.js updateChildForReception` | `!child.schoolId \|\| child.schoolId !== req.user.schoolId` | ✅ Closed S3 (RE-10) |
| `receptionParentController.js deleteChildForReception` | `!child.schoolId \|\| child.schoolId !== req.user.schoolId` | ✅ Closed S3 (RE-10) |
| `groupController.js updateGroup` | `!group.schoolId \|\| group.schoolId !== req.user.schoolId` | ✅ Closed S3 (RE-12) |
| `groupController.js deleteGroup` | `!group.schoolId \|\| group.schoolId !== req.user.schoolId` | ✅ Closed S3 (RE-12) |
| `childController.js checkChildAccess` | `!parent?.schoolId \|\| parent.schoolId !== req.user.schoolId` | ✅ Closed S4-NEW-01 |

**Null-schoolId defect class is now FULLY CLOSED for all reception-reachable routes.**
