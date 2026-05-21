# Government Portal — Step 7 Sprint 1 Execution Log
## Blockers: Archived-School Visibility + Audit Log + Archive UI

**Branch:** main  
**Date:** 2026-05-21  
**Outcome:** ✅ All 5 commits shipped, 79 government + 946 backend tests green

---

## Pre-flight

- S6 confirmed ✅ (SHA `3eb3f8e`)
- S7-Sprint-1 marked 🟡 at SHA `64bf690` before work began

---

## Corrections from S6 Plan (applied before any code written)

### Correction 1 — Restore events excluded from audit allowlist
The S6 feature plan included restore events in BC-02. These were removed before implementation:

Excluded (child-level data outside PQ-1 governance scope):
- `restore:children`
- `restore:users`
- `restore:child_observations`
- `restore:child_attendance`

Final allowlist: 10 `action:entity` pairs covering archive/reactivate schools, registration approvals, and admin/government account CRUD.

### Correction 2 — BC-01 requires revert-test AND scoping test
Both were implemented in `backend/__tests__/controllers/governmentSchoolDetail.test.js`:

**Revert-test evidence:**
- Pre-fix (isActive: true in where clause): test 1 FAILS — `expect(school.isActive).toBe(false)` received `true`; controller returned 404
- Post-fix (where: { id } only): 8/8 PASS

**Scoping assertion:**
- admin role → 403 from `requireGovernment`
- teacher role → 403
- government role → 200 with correct school data

---

## Commits

### Commit 1 — BC-01: Archived-school visibility fix
**SHA:** `4fc481b`  
**Message:** `fix(backend): BC-01 getSchoolById serves archived schools to government (IB-001)`

**Change:** `governmentController.js` line ~265:
```
// Before (bug)
School.findOne({ where: { id, isActive: true } })

// After (fix)
School.findOne({ where: { id } })
```

**Tests:** `backend/__tests__/controllers/governmentSchoolDetail.test.js` — 8 tests (5 controller, 3 scoping)

---

### Commit 2 — BC-02a: logAudit calls for governance actions
**SHA:** `ba40e98`  
**Message:** `feat(backend): BC-02a audit logging for governance actions (approvals, admin/government account changes)`

**Files changed:**
- `backend/controllers/admin/adminUserController.js` — logAudit on create/update/delete for admins and government_users (6 calls)
- `backend/controllers/adminRegistrationController.js` — logAudit on approve_registration and reject_registration (2 calls)
- `backend/models/index.js` — `AuditLog.belongsTo(User, { as: 'actor', constraints: false })`

**logAudit pattern:** fire-and-forget; placed BEFORE destroy calls so deletions are always traceable.

**Tests:**
- `backend/__tests__/controllers/adminUserAudit.test.js` — 6 tests
- `backend/__tests__/controllers/adminRegistrationAudit.test.js` — 4 tests

---

### Commit 3 — BC-02: GET /government/audit-log endpoint
**SHA:** `8f6de7b`  
**Message:** `feat(backend): BC-02 government audit-log endpoint with server-side governance allowlist`

**Allowlist (server-side, never client-side):**
```
archive:schools
reactivate:schools
approve_registration:admin_registrations
reject_registration:admin_registrations
create:admins
update:admins
delete:admins
create:government_users
update:government_users
delete:government_users
```

**Privacy boundary:** `[Op.or]: allowlistPairs` is always present in the WHERE clause — the DB never returns out-of-scope events regardless of what query params are passed.

**Allowlist revert-test evidence:**
- Pre-fix (Op.or removed): `Array.isArray(undefined)` → test FAILS
- Post-fix: 8/8 PASS

**New i18n codes:** `AUDIT_LOG_INVALID_FILTER` (400), `AUDIT_LOG_FETCH_FAILED` (500)
- Added to `audits/backend/i18n-error-codes.md`
- Added to `backend/i18n/ru.json`, `uz-latn.json`, `uz-cyrl.json`
- `EXPECTED_CODE_COUNT` updated: 106 → 108

**Tests:** `backend/__tests__/governmentAuditLog.test.js` — 8 tests including privacy boundary test

---

### Commit 4 — S1-F01: School archive/reactivate UI + archived badge
**SHA:** `d54d32b`  
**Message:** `feat(government): S1-F01 school archive/reactivate UI with archived badge (CP-014)`

**SchoolDetail.jsx additions:**
- `isActiveOverride` local state for immediate UI update without re-fetch
- Archive button (red) for active schools; Reactivate button (brand) for archived schools
- ConfirmDialog guards both actions
- 409 `SCHOOL_ALREADY_ARCHIVED` / `SCHOOL_ALREADY_ACTIVE` → specific error toasts
- Error normalization: `detail ?? code ?? fallback`

**Revert-test evidence:**
- Pre-fix (api.put call commented out): 3 failed | 4 passed
- Post-fix: 7 passed | 0 failed

**i18n:** 9 new keys under `schoolDetail` in uz/ru locales (UNVERIFIED — AI-generated)

**Tests:** `government/src/__tests__/SchoolDetail.test.jsx` — 7 tests

---

### Commit 5 — S1-F02: Governance audit-log viewer page
**SHA:** `fcd2c45`  
**Message:** `feat(government): S1-F02 governance audit-log viewer page`

**AuditLog.jsx:**
- Paginated table (default 20/page, server-side pagination)
- Filter bar: action dropdown, entity dropdown, start/end date pickers, Apply button
- Filter options derived from the 10-entry allowlist (same action:entity pairs as backend)
- Loading / empty / error states
- Pagination controls (prev/next) with page indicator

**Routing:** `<Route path="audit-log" element={...} />` added to `App.jsx`

**Nav:** `ClipboardList` icon link added to `Sidebar.jsx` between Warnings and Platform  
Nav order: Dashboard → Schools → Ratings → Warnings → **Audit Log** → Platform → Profile → Settings  
Directories group (Students/Teachers/Parents) stubbed for Sprint 2.

**i18n:** `nav.auditLog` + `auditLog.*` section added to uz/ru locales (UNVERIFIED — AI-generated)

**Tests:** `government/src/__tests__/AuditLog.test.jsx` — 7 tests

---

## Post-commit Verification

| Check | Result |
|---|---|
| `node backend/scripts/verify-i18n.js` | ✅ 108 codes, all 3 language files match catalog |
| Backend lint | ✅ |
| Backend tests | ✅ 946 passed, 93 suites |
| Government lint | ✅ |
| Government tests | ✅ 79 passed, 12 suites |
| Government build | ✅ 1826 modules, no errors |

---

## Manual Verification Gate

Before S7-Sprint-1 is used in production the following must be manually confirmed:

1. **BC-01:** Navigate to an archived school's detail page as a government user — page loads with school data and "Nofaol" badge, not 404
2. **S1-F01:** Archive an active school — confirmation dialog appears, on confirm the badge switches to "Nofaol" and the Reactivate button appears; toast shows success; 409 on double-archive shows specific error
3. **S1-F02:** Navigate to Audit Log — table loads with entries; action filter narrows results; pagination controls work; date range filters applied correctly
4. **BC-02 privacy boundary:** Confirm no child-related events (observations, attendance, meals) appear in the audit log even when no filters are applied

---

## Sprint 2 Scope (Directories — not started)

Per nav structure decision: Students, Teachers, Parents directory pages are Sprint 2. Sidebar will receive a collapsible Directories group. PL-014 (legal sign-off for directory data exposure) must be resolved before Sprint 2 ships.
