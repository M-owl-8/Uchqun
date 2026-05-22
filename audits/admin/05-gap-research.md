# Admin Portal — S5 Gap Research

**Date:** 2026-05-22
**Portal scope:** Admin (school director/owner)
**Basis:** Backend route/controller deep-dives (adminRoutes.js, adminImportController, adminParentController, adminRestoreController, adminGoalController, adminStatsController, adminMessageController, observationController, aiWarningController, childController); S1 audit; S4 confirm-clean state

---

## Current admin pages

Confirmed from App.jsx + Sidebar.jsx:

| Page | Route | Sidebar | Backend |
|---|---|---|---|
| Dashboard | /admin | ✅ | GET /admin/statistics, GET /ai-warnings |
| ReceptionManagement | /admin/receptions | ✅ | Full CRUD + activate/deactivate |
| DocumentApprovalQueue | /admin/documents | ✅ | approve/reject |
| ParentManagement | /admin/parents | ✅ | GET only — no suspend/activate |
| TeacherManagement | /admin/teachers | ✅ | GET only |
| GroupManagement | /admin/groups | ❌ no sidebar | GET /admin/groups |
| SchoolRatings | /admin/school-ratings | ✅ | GET /admin/school-ratings |
| AIWarnings | /admin/ai-warnings | ✅ | GET + PUT resolve only (no analyze, no notify) |
| TherapyManagement | /admin/therapy | ✅ | Full CRUD |
| Profile, Settings, ChangePassword, Login | — | partial | — |

---

## Gap Catalog

### AG-001 — Bulk Import UI (CP-011)
**Value: HIGH | Type: Wire existing backend**

Complete backend contract:
- `POST /api/admin/import/children/validate` — multipart CSV (≤5MB, `.csv`), required headers: `firstName, lastName, dateOfBirth, gender, disabilityType, class, teacher, parentEmail`. Returns 201 `{ importJobId, filename, totalRows, validRows, invalidRows, errors: [{row, field, code}] }`. Returns 400 only for file-level failures.
- `POST /api/admin/import/:id/start` — guards: `status === 'ready'`, `validRows > 0`, school IDOR (`importJob.schoolId === req.user.schoolId`). Responds 202 `{ importJobId, status: 'importing' }`. Calls `setImmediate(() => processImport(...))`.
- `GET /api/admin/import/:id/status` — returns `{ id, status, totalRows, validRows, invalidRows, createdAt, updatedAt }`. Status ∈ {ready, importing, completed, failed}. Poll every ~3s.
- `GET /api/admin/import/:id/errors` — row-level errors post-import.

Per-row atomicity: failure at row N does not roll back rows 1..N-1.

Row error codes (for i18n display): `IMPORT_ROW_FIRST_NAME_REQUIRED`, `IMPORT_ROW_LAST_NAME_REQUIRED`, `IMPORT_ROW_DOB_INVALID`, `IMPORT_ROW_DOB_IN_FUTURE`, `IMPORT_ROW_GENDER_INVALID`, `IMPORT_ROW_DISABILITY_TYPE_REQUIRED`, `IMPORT_ROW_CLASS_REQUIRED`, `IMPORT_ROW_TEACHER_REQUIRED`, `IMPORT_ROW_PARENT_EMAIL_INVALID`, `IMPORT_ROW_PARENT_NOT_FOUND`, `IMPORT_ROW_DUPLICATE`, `IMPORT_ROW_CREATE_FAILED`.

Optional CSV fields: `specialNeeds, medicalDiagnosis, institutionStartDate, fatherFullName, motherFullName, address, contactPhone`.

UI flow needed:
1. File picker + CSV format guide (required headers)
2. Validate → show validation result: total/valid/invalid, per-row error table (row#, field, code)
3. Start confirmation with valid row count; warn if any invalid rows will be skipped
4. Progress: poll `/status` every ~3s, spinner while `importing`
5. Final result: imported count + errors for `IMPORT_ROW_CREATE_FAILED` rows

No new page template needed beyond what's described.

---

### AG-002 — Parent Suspend/Activate UI (CP-012)
**Value: HIGH | Type: Wire existing backend**

Complete backend contract:
- `PUT /api/admin/parents/:id/suspend` — `User.findOne({ where: { id, role:'parent', schoolId: req.user.schoolId } })`. Returns 200 `{ id, status:'suspended' }`. 409 `PARENT_ALREADY_SUSPENDED` if already suspended. Defense-in-depth role check, logAudit before update.
- `PUT /api/admin/parents/:id/activate` — same pattern. Returns 200 `{ id, status:'active' }`. 409 `PARENT_ALREADY_ACTIVE`.

ParentManagement.jsx exists and is wired with `/admin/parents`. It needs:
- Status badge on parent list row (active / suspended)
- Suspend button (when `parent.status !== 'suspended'`) + ConfirmDialog before action
- Activate button (when `parent.status === 'suspended'`)

Note: `getParents` fetches via `createdBy` chain (admin → receptions → parents), not direct schoolId. The suspend/activate endpoints use `schoolId` IDOR — consistent scoping, different lookup path.

---

### AG-003 — Restore UI (CP-016)
**Value: MED | Type: Wire existing backend (UX question first)**

Complete backend contract:
- `PUT /api/admin/children/:id/restore`
- `PUT /api/admin/users/:id/restore`
- `PUT /api/admin/observations/:id/restore`
- `PUT /api/admin/attendance/:id/restore`

All four: `Model.findOne({ where: { id }, paranoid: false })` → check `deletedAt` → school IDOR → `record.restore()` → `logAudit(action:'restore')`. Returns `{ success: true, data: <restored record> }`. 400 `RESTORE_NOT_DELETED` if record.deletedAt is null. Admin is school-scoped (cannot restore other schools' records).

**Blocked on UX question #1 (see below):** admin needs a way to discover soft-deleted records before restore can be wired.

---

### AG-004 — Child Observations Admin View
**Value: MED | Type: Wire existing backend**

Backend: `GET /api/admin/children/:id/observations` via `listByChild` (observationController.js). Uses `validateChildAccess(req.params.id, req)` — admin has `req.user.schoolId`; the function matches `child.schoolId` to `req.user.schoolId`. Access works for own-school children. Returns last 100 observations sorted by `observationDate DESC`. Fields: `childId, observationDate, domain, note, severity`.

Admin is read-only — `create` is NOT in adminRoutes.js. Oversight only.

**Blocked on UX question #2 (see below):** needs a child detail page to surface this data. Admin has no children list — children are currently only nested under a parent's detail view.

---

### AG-005 — Child Goals Admin View
**Value: MED | Type: Wire existing backend**

Backend: `GET /api/admin/children/:id/goals` via `listByChildAsAdmin` (adminGoalController.js). Defense-in-depth: `if (req.user.role !== 'admin') return 403`. School scoped: `Child.findOne({ where: { id: childId, schoolId: req.user.schoolId } })`. Returns ChildGoal list with nested ChildGoalReview summaries (`id, reviewDate, status`). Admin is read-only (no goal CRUD in adminRoutes.js).

Same dependency as AG-004: needs a child detail page.

---

### AG-006 — AI Warnings: Analyze Trigger + Notify
**Value: MED | Type: Wire existing backend**

Backend (admin + government):
- `POST /api/ai-warnings/analyze` body: `{ schoolId }` — scans SchoolRating for that school, generates AIWarning records where avg rating < 2.5 or rapid decline detected.
- `POST /api/ai-warnings/:id/notify` body: `{ message?, includeParents?, includeTeachers? }` — creates Notification records for school stakeholders.

Current AIWarnings.jsx: fetches + displays warning list, allows resolve. Missing:
1. "Analyze" button → `POST /ai-warnings/analyze` with `{ schoolId: user.schoolId }` → reload warning list. Admin's schoolId comes from `useAuth()`.
2. "Notify" button on each unresolved warning card → ConfirmDialog → `POST /ai-warnings/:id/notify`.

Both are additions to AIWarnings.jsx — no new page needed.

---

### AG-007 — Groups Sidebar Link
**Value: LOW | Type: 1-line fix**

GroupManagement.jsx exists, calls `GET /api/admin/groups` correctly, is wired as `path="groups"` in App.jsx. ONLY missing: a sidebar navigation entry.

Fix: add `{ key: 'nav.groups', href: '/admin/groups', icon: <icon> }` to Sidebar.jsx NAV_SECTIONS + 3 i18n strings (en/uz/ru).

**UX question #3 (see below):** which section — Management or a separate Academic section?

---

### AG-008 — Government Message Inbox
**Value: LOW | Type: Wire existing backend**

Backend:
- `POST /api/admin/message-to-government` — sends GovernmentMessage (exists, no UI)
- `GET /api/admin/messages` — returns messages where `senderId = req.user.id`, sorted by createdAt DESC (exists, no UI)

No messaging UI at all in admin portal. Admin cannot send OR read from the UI.

Note: `GET /admin/messages` returns admin's SENT messages only (filtered by `senderId`). Whether government replies are threaded in the same model requires GovernmentMessage model inspection — unclear from current scope. Plan a simple compose + sent items view first; defer reply threading unless Max confirms it's needed.

---

### AG-009 — Child Transfer UI
**Value: LOW | Type: Wire existing backend (UX question first)**

Backend: `PUT /api/admin/children/:id/transfer` body: `{ toSchoolId, reason? }` — inter-school transfer. Admin is source school only (cannot pull children from other schools). Error codes: `CHILD_TRANSFER_FORBIDDEN`, `CHILD_TRANSFER_NOT_IN_SCHOOL`, `CHILD_TRANSFER_TARGET_REQUIRED`, `CHILD_TRANSFER_SAME_SCHOOL`, `CHILD_TRANSFER_TARGET_NOT_FOUND`.

**UX question #4 (see below):** is child transfer admin's job for the demo, or government-only? Transfer crosses school boundaries (parent and teacher access implications). This may be a government-managed workflow.

---

## Backend-First Gaps

These cannot be wired in S6 without new backend work. Not in S6 scope unless Max decides otherwise.

### B-001 — Admin Activity Feed / Audit Log
Current state: `GET /api/admin/audit-log` does not exist. Only `GET /api/government/audit-log` exists. Dashboard activity panel is a placeholder ("Faoliyat tarixi tez kunda" from S3).

Backend work needed: new `GET /api/admin/audit-log` endpoint — query `audit_log` scoped to `schoolId = req.user.schoolId`, paginated.

**UX question #5 (see below):** is a real activity feed needed for the government demo?

### B-002 — Admin School Profile View
Admin has no way to view or edit their school's own profile (name, address, type, region). No `/api/admin/school` endpoint exists.

Backend work needed: `GET /api/admin/school` — return the `schools` record for `req.user.schoolId`. Edit may be read-only (government manages school ownership data).

### B-003 — Data Export
No export endpoints exist for any admin-managed data. If a school director needs a CSV roster for regional submission, there is no backend support.

---

## CP-020 Admin Boundary

CP-020 (rating overhaul, PLANNED-NOT-BUILT) adds direction-rating from government to school. Admin's boundary is unchanged and correct:
- View parent-submitted ratings: SchoolRatings.jsx ✅
- Trigger AI analysis: `POST /api/ai-warnings/analyze` — currently unwired (AG-006)
- No rating submission form — admin does not submit ratings. Direction ratings are government → school.

SchoolRatings.jsx is the correct scope. No admin rating form is needed for CP-020.

---

## Consistency Gaps vs. Government Portal

| Feature | Government | Admin |
|---|---|---|
| Audit log viewer | ✅ | ❌ B-001 (backend needed first) |
| Message inbox + government replies | ✅ | ❌ AG-008 (sent items only backend) |
| School profile edit | ✅ manages all schools | ❌ B-002 (backend needed first) |
| Data export | n/a | ❌ B-003 (backend needed first) |
| TranslationNotice (CP-019) | ✅ | ✅ (done S3) |
| Forced password change gate | ✅ | ✅ (done S3) |

---

## UX Questions for Max

S6 (feature plan) cannot finalize scope without answers to these:

1. **Restore discovery**: How does admin find soft-deleted records? (a) dedicated Trash page listing all soft-deleted records, (b) "Show deleted" toggle per list, (c) search includes deleted?

2. **Child detail page**: Is there a child detail page planned for admin? (Needed to surface observations + goals — AG-004/AG-005.) Or does admin see child data only nested under parent detail? This determines whether AG-004/AG-005 can be scoped for S6.

3. **Groups sidebar**: Which section should Groups appear in — Management (with receptions/parents/teachers) or a separate Academic section?

4. **Child transfer**: Is inter-school transfer admin's job for the demo? Or government-only workflow?

5. **Activity feed**: Is a real audit log / activity feed needed for the government demo? (B-001 requires a backend sprint before S6 can plan it.)

6. **Message replies**: Does admin need to see government replies threaded under sent messages, or is a simple "sent items" inbox sufficient for the demo?

---

## Prioritization

### Government demo — must-do (S6 scope)
| Gap | Effort estimate | Rationale |
|---|---|---|
| AG-007 Groups sidebar link | ~15 min | Trivial; page already exists |
| AG-002 Parent suspend/activate | 2–3h | Safeguarding demo feature; complete backend |
| AG-001 Bulk import | 1 day | Shows scale; admin onboards 30+ children per cohort |
| AG-006 AI Warnings analyze + notify | 2–4h | Completes warnings workflow already visible in demo |

### Government demo — do if time (S6 scope, conditional on UX answers)
| Gap | Blocker | Effort |
|---|---|---|
| AG-004 + AG-005 child observations + goals | UX question #2 | 4–6h |
| AG-008 Government message inbox | — | 3–4h |

### Post-demo / nice-to-have
| Gap | Blocker |
|---|---|
| AG-003 Restore UI | UX question #1 |
| AG-009 Child transfer | UX question #4 |

### Needs backend sprint before S6 can plan
| Gap | Backend work |
|---|---|
| B-001 Activity feed | New /admin/audit-log endpoint |
| B-002 School profile | New /admin/school endpoint |
| B-003 Data export | New export endpoints |

---

## Gap Count Summary

- 9 wirable gaps (AG-001..AG-009): 2 HIGH, 4 MED, 3 LOW
- 3 backend-first gaps (B-001..B-003)
- 6 UX questions for Max before S6 finalizes scope
- 4 gaps confirmed demo-critical (AG-001, AG-002, AG-006, AG-007)
- 0 gaps require CP-020 work in admin portal
