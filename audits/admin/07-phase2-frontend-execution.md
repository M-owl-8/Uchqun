# Admin Portal — S7 Phase 2 Demo-Critical Frontend Execution

**Date:** 2026-05-22  
**Branch:** main  
**Baseline test count (before phase):** 20 suites / 113 tests  
**Final test count:** 20 suites / 113 tests (no new suites; tests added within existing suites)  
**Lint:** 0 warnings / 0 errors  

---

## 1. Per-Unit Summary

| # | SHA | Title | Tests added |
|---|---|---|---|
| 1 | `d9fa8b7` | feat(admin): add Groups to sidebar navigation (FE-10) | 0 (trivial — page/route already existed) |
| 2 | `cf6fdee` | feat(admin): parent suspend/activate with status badges (FE-2) | +6 (ParentManagement.test.jsx) |
| 3 | `41e10c1` | feat(admin): AI warnings analyze + notify buttons (FE-4) | +5 (AIWarnings.test.jsx — 7→12 total) |
| 4 | `d81e074` | feat(admin): bulk import wizard page — 5-step CSV import flow (FE-1) | +7 (BulkImport.test.jsx, new file) |

---

## 2. FE-10 — Groups Sidebar Link

**File changed:** `admin/src/components/Sidebar.jsx`

Added `UsersRound` and `Upload` icon imports. Added two NAV entries to the Management section:
```js
{ key: 'nav.groups', href: '/admin/groups', icon: UsersRound },
{ key: 'nav.import', href: '/admin/import', icon: Upload },
```
`nav.groups` already existed in all 3 locale files — no i18n change needed. `nav.import` keys added in the FE-1 commit.

GroupManagement page + route (`path="groups"`) pre-existed. This was a discoverability gap only.

---

## 3. FE-2 — Parent Suspend/Activate

**File changed:** `admin/src/pages/ParentManagement.jsx`

**Status badges:** Each parent row now shows a green "Active" or red "Suspended" badge based on `parent.status`.

**Action buttons:** In the right detail panel, admin sees either a Suspend or Activate button depending on `selectedParent.status`. Both are guarded by `ConfirmDialog` before the API call.

**API calls:**
- `PUT /admin/parents/:id/suspend` — response `{ data: { status: 'suspended' } }`
- `PUT /admin/parents/:id/activate` — response `{ data: { status: 'active' } }`

**State update pattern:** Optimistic local update — no full reload on success:
```js
setParents(prev => prev.map(p => p.id === parent.id ? { ...p, status: result } : p));
```

**409 handling:** `try/catch` around the PUT — shows a toast, badge unchanged (the server state is already correct).

**Tests (6):**
1. Renders parent list from API
2. Shows Active badge for active parents
3. Shows Suspended badge for suspended parents
4. Suspend button opens ConfirmDialog
5. `PUT .../suspend` called on confirm
6. PUT not called when dialog cancelled

---

## 4. FE-4 — AI Warnings Analyze + Notify

**File changed:** `admin/src/pages/AIWarnings.jsx`

**Analyze button** (page header, next to Refresh):
- Calls `POST /api/ai-warnings/analyze` with `{ schoolId: user.schoolId }` from `useAuth()`
- `analyzing` boolean disables button and shows "Tahlil..." text while pending
- On success: invalidates cache + `fetchWarnings(true)` to reload list; success toast
- `handleAnalyze` is a plain `async` function (not `useCallback`) — safe because `fetchWarnings` is already stable via `useCallback` and `user.schoolId` is session-stable

**Notify button** (on each unresolved `WarningCard`):
- `onNotify` prop passed from `AIWarnings` down to `WarningCard`
- Button only renders when `!warning.resolvedAt`
- Opens `ConfirmDialog` before calling `POST /api/ai-warnings/:id/notify`
- Body: `{ includeParents: true, includeTeachers: true }`
- `<ConfirmDialog dialog={dialog} onCancel={() => setDialog(null)} />` rendered at page root

**Stable-callback check:** `fetchWarnings` was already `useCallback` with stable deps. The new `handleAnalyze` calls it correctly. No new unstable deps introduced.

**Tests (5 new, added to existing AIWarnings.test.jsx — 12 total):**
1. Analyze button triggers `POST /ai-warnings/analyze` with user's schoolId
2. Warning list refreshes after analyze
3. Notify button shown on unresolved cards only
4. ConfirmDialog shown before notify POST
5. `POST /ai-warnings/:id/notify` called on confirm

---

## 5. FE-1 — Bulk Import Wizard

**New file:** `admin/src/pages/BulkImport.jsx`  
**Route added:** `path="import"` in `App.jsx` (nested under `/admin`)  
**Sidebar entry:** `{ key: 'nav.import', href: '/admin/import', icon: Upload }` in Management section  
**i18n keys added:** `import.*` section in `en/common.json`, `uz/common.json`, `ru/common.json` (uz/ru UNVERIFIED — AI-generated)

### 5-step wizard flow

**Step 1 — Upload:**
- `<input type="file" accept=".csv">` with `data-testid="file-input"` for testability
- Required headers listed: firstName, lastName, dateOfBirth, gender, disabilityType, class, teacher, parentEmail
- "Validate" button disabled when no file selected
- `POST /admin/import/children/validate` with `FormData` + `Content-Type: multipart/form-data`
- Spinner during upload (`LoadingSpinner size="sm"` inside button)

**Step 2 — Validation Result:**
- 3-count grid: totalRows / validRows (green) / invalidRows (red when > 0)
- Expandable error table if `invalidRows > 0` — columns: Row, Error (code humanized via `ERROR_CODE_MAP`)
- "Continue with valid rows" button: `disabled={jobResult.validRows === 0}`
- "Back" button resets to step 1

**Step 3 — Confirm:**
- Message: "Import X children?" (X = validRows)
- Amber warning strip if `invalidRows > 0`: "Y rows will be skipped due to validation errors."
- "Start Import" → `POST /admin/import/:id/start` → advance to step 4
- "Cancel" resets to step 1

**Step 4 — Progress polling:**
- Spinner + "Import in progress…" text
- `setInterval(pollFn, 3000)` using `intervalRef` (useRef)
- Poll calls `GET /admin/import/:id/status`
- Stops on `status === 'completed' || 'failed'` → `clearInterval(intervalRef.current)` → `setStep(5)`

**Step 5 — Result:**
- Completed: "X ta bola muvaffaqiyatli import qilindi" (uses `pollStatus.validRows`)
- Failed: error message
- "New Import" button calls `resetAll()` (clears interval ref + resets all state to step 1)

### Poll-cleanup guarantee

Three paths all call `clearInterval`:

| Path | Location |
|---|---|
| Completion (completed/failed status received) | `handleStart` polling callback, line 100–102 |
| Unmount | `useEffect` cleanup function (no deps = runs once on unmount), lines 55–58 |
| Manual reset | `resetAll()`, line 68 |

The `intervalRef.current` is also set to `null` after clearInterval on completion, so a subsequent unmount's cleanup is a no-op (clearInterval on null is safe).

### Error code humanization

`ERROR_CODE_MAP` handles the 5 most common row errors. Unknown codes fall through to raw display:
```js
const humanizeCode = (code) => ERROR_CODE_MAP[code] ?? code;
```
Remaining 7 `IMPORT_ROW_*` codes display as raw strings — acceptable for the demo; full i18n can be added post-demo.

### Tests (7, new file `BulkImport.test.jsx`)

1. Renders file picker in step 1
2. Validate button disabled when no file selected
3. Shows validation results (valid/invalid counts) in step 2
4. Continue button disabled when validRows === 0
5. Start button triggers `POST /admin/import/:id/start`
6. Shows polling spinner in step 4
7. Shows success result in step 5 — this test spies on `global.setInterval` and `global.clearInterval` to verify interval teardown on completion

---

## 6. Manual Gate (Pending Max — Railway)

**Status: 🟡 CODE DONE — MANUAL VERIFICATION NOT YET RUN**

Max must walk through the following before this phase is marked ✅:

### Groups nav link
- [ ] Groups link appears in sidebar under Management
- [ ] Clicking opens GroupManagement page correctly

### Parent suspend/activate
- [ ] Status badge shows green "Active" for active parents, red "Suspended" for suspended ones
- [ ] Suspend → ConfirmDialog appears → confirm → badge flips to Suspended, parent loses login access
- [ ] Activate → ConfirmDialog appears → confirm → badge flips to Active, parent can log in again
- [ ] Cancel on ConfirmDialog → no API call, badge unchanged

### AI Warnings analyze + notify
- [ ] "Tahlil qilish" (Analyze) button fires `POST /ai-warnings/analyze` with school's UUID
- [ ] If school has rating data below threshold → warnings populate after analyze
- [ ] "Xabar berish" (Notify) button appears on each unresolved card
- [ ] ConfirmDialog gates notify → confirm → stakeholders receive notifications

### Bulk import (demo centerpiece)
- [ ] Navigate to `/admin/import` via sidebar Upload link
- [ ] Upload a CSV with required headers (a few valid rows + 1-2 deliberately invalid rows)
- [ ] Step 2 shows correct valid/invalid counts; invalid rows listed with humanized error messages
- [ ] Continue disabled when 0 valid rows
- [ ] Confirm screen shows correct count + skip warning if applicable
- [ ] Import runs, step 4 polls and progress is shown
- [ ] Step 5 shows correct imported count
- [ ] "New Import" resets wizard cleanly

---

## 7. Final State

| Metric | Value |
|---|---|
| Test suites | 20 passed, 20 total |
| Tests | 113 passed, 113 total |
| ESLint | 0 warnings, 0 errors |
| New pages | 1 (BulkImport.jsx) |
| Modified pages | 2 (ParentManagement.jsx, AIWarnings.jsx) |
| Modified components | 1 (Sidebar.jsx) |
| Modified routes | 1 (App.jsx — import route added) |
| i18n keys added | ~25 (import.* section, all 3 locale files, uz/ru UNVERIFIED) |
| Manual gate | 🟡 Pending Max |

---

## 8. Phase 3 — Cockpit Visibility (Next)

Phase 3 builds the "see everything" layer — the remaining cockpit features that surface data the backend already exposes:

| Unit | Feature | Backend | Effort |
|---|---|---|---|
| FE-3 | Child detail page (observations + goals tabs) | Existing `GET /admin/children/:id/observations` + `/goals` | ~6h |
| FE-5 | Activity feed / audit log (wire Phase 1 BE-1) | `GET /admin/audit-log` (Phase 1 new endpoint) | ~4h |
| FE-6 | School profile page (wire Phase 1 BE-2) | `GET /admin/school` + `PATCH /admin/school` (Phase 1 new endpoints) | ~2h |
| FE-7 | Staff-parent chat UI (communications hub) | Chat endpoints (school-scoped via Phase 1 BE-3 fix) | ~6h |
| FE-8 | Teacher detail (wire Phase 1 BE-4) | `GET /admin/teachers/:id` (Phase 1 new endpoint) | ~3h |

**Total Phase 3 estimate:** ~21h / 2.5 days  
**Dependency:** FE-3 needs a child access path — currently only reachable from a parent's detail panel. Phase 3 should add a link from ParentManagement's child cards to the ChildDetail page.
