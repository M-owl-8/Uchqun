# Backend S7 — Sprint D Execution

**Sprint:** D (Government Acceptance)  
**Closed:** 2026-05-20  
**Final commit:** `00a1402`  
**Test result:** 84 suites / 837 tests / 0 lint errors  
**Related tracker rows:** Log entries #21–#23

---

## Tasks delivered

### T2-6 — EmotionalMonitoring soft-delete
- Added `paranoid: true` and `deletedAt` column to `EmotionalMonitoring` model
- Idempotent migration: `20260520080000-add-deleted-at-to-emotional-monitoring.js`
- 4 delete/paranoid tests in `__tests__/controllers/emotionalMonitoringController.delete.test.js`

### T2-8 — Progress soft-delete
- Added `paranoid: true` and `deletedAt` column to `Progress` model
- Idempotent migration: `20260520090000-add-deleted-at-to-progress.js`
- 4 delete/paranoid tests in `__tests__/controllers/progressController.paranoid.test.js`

### T2-5 — afterDestroy audit hooks on all paranoid models
- `models/index.js`: registered `afterDestroy` audit hooks for all 21 paranoid models
  - Existing: Child, ChildObservation, TeacherReflection, ChildJournalEntry
  - New hooks: User, ChildAttendance, EmotionalMonitoring, Progress, ImportJob, Activity, Meal, MealPlan, Media, Document, ChatMessage, ChildAssessment, ServicePlan, TherapyUsage, Therapy, SchoolRating, TeacherRating
- All controller `.destroy()` calls updated to pass `{ actorId, actorRole, reason }` in options
- `__tests__/childAuditHook.test.js` extended to verify hook fires on all models

### T2-2 PR1 — User status column
- Migration `20260520120000-add-status-to-users.js`: idempotent addColumn + CHECK constraint + index
- `models/User.js`: `status` field added (ENUM `active`/`suspended`/`archived`, default `active`)
- Deployed to Railway and verified present in prod schema before PR2 was written

### T2-2 PR2 — Auth middleware status gate + parent suspension endpoints
**Commit:** `0a9bde6`

- `middleware/auth.js`: status check block added before existing `isActive` check
  - `status === 'suspended' || status === 'archived'` → 401 `ACCOUNT_NOT_ACTIVE`
  - Government role is exempt (hardcoded bypass)
  - `undefined` status passes (backward compat for legacy records)
- `controllers/admin/adminParentController.js`: added `suspendParent` and `activateParent`
  - School-scoped via `User.findOne({ where: { id, role: 'parent', schoolId: req.user.schoolId } })`
  - Defense-in-depth: controller-level `req.user.role !== 'admin'` check
  - Audit-before-update: `logAudit()` fires before `user.update()`
  - 409 when already in target state
- `routes/adminRoutes.js`: `PUT /parents/:id/suspend` and `PUT /parents/:id/activate`
- Tests: 6 auth middleware tests + 10 adminParent endpoint tests
- i18n codes: `ACCOUNT_NOT_ACTIVE`, `PARENT_SUSPEND_FORBIDDEN`, `PARENT_ACTIVATE_FORBIDDEN`, `PARENT_NOT_FOUND`, `PARENT_ALREADY_SUSPENDED`, `PARENT_ALREADY_ACTIVE`, `PARENT_SUSPEND_FAILED`, `PARENT_ACTIVATE_FAILED`
- **CP-012 ✅ consumable** for admin portal

### T2-4 — Child school transfer
**Commit:** `d0deee8`

- `controllers/childController.js`: added `transferChild`
  - Source-admin-only: checks child belongs to `req.user.schoolId` (blocks cross-school pull)
  - Defense-in-depth controller role check
  - `logAudit()` fires BEFORE `child.update()` — transfer is always traceable even if update fails
  - Validates target school exists
- `routes/adminRoutes.js`: `PUT /children/:id/transfer`
- `__tests__/childTransfer.test.js`: 8 tests including audit-before-update verification
- `__tests__/child.test.js`: 3 new mocks (auditLogger, AuditLog, School) to prevent breakage
- i18n codes: `CHILD_TRANSFER_FORBIDDEN`, `CHILD_TRANSFER_TARGET_REQUIRED`, `CHILD_TRANSFER_NOT_IN_SCHOOL`, `CHILD_TRANSFER_SAME_SCHOOL`, `CHILD_TRANSFER_SCHOOL_NOT_FOUND`, `CHILD_TRANSFER_FAILED`

### T2-7 — School archival mechanism
**Commit:** `00a1402`

- `controllers/governmentController.js`: added `archiveSchool` and `reactivateSchool`
  - `PUT /government/schools/:id/archive` — sets `isActive=false`, government only
  - `PUT /government/schools/:id/reactivate` — sets `isActive=true`, government only
  - `logAudit()` fires BEFORE `school.update()` (audit-before-mutation pattern)
  - 404 / 409 idempotency guards
- `routes/governmentRoutes.js`: both routes wired up
- `middleware/schoolScope.js`: converted to `async`; added `School.findByPk` check
  - Non-government users at archived schools → 403 `SCHOOL_ARCHIVED`
  - Fails open (calls `next()`) if DB lookup throws — service continuity over defense-in-depth for this secondary gate
- `routes/adminRoutes.js`: `router.use(requireSchoolScope)` mounted after `requireAdmin`
- `__tests__/governmentSchoolArchive.test.js`: 10 endpoint tests (archive + reactivate × 5 paths each)
- `__tests__/middleware/schoolScope.test.js`: converted to async + dynamic import; 3 new T2-7 tests (archived school → 403, government bypasses, DB error fails open); all 9 existing tests updated to `await requireSchoolScope(...)`
- i18n codes: `SCHOOL_NOT_FOUND`, `SCHOOL_ALREADY_ARCHIVED`, `SCHOOL_ALREADY_ACTIVE`, `SCHOOL_ARCHIVE_FAILED`, `SCHOOL_REACTIVATE_FAILED`, `SCHOOL_ARCHIVED`
- **CP-014 ✅ consumable** for government portal

---

## i18n codes added this sprint (all in `audits/backend/i18n-error-codes.md`)

Total new codes: **20** (8 Account Lifecycle + 6 Child Transfer + 6 School Archival)

---

## Test count progression

| After phase | Suites | Tests |
|---|---|---|
| Sprint C close | 80 | 784 |
| Sprint D Phase 1+2+3 (T2-6/8/5/2-PR1) | 82 | 801 |
| Sprint D Phase 4 (T2-2 PR2 + T2-4) | 83 | 822 |
| Sprint D Phase 5 (T2-7) | **84** | **837** |

---

## Security properties established

| Property | Mechanism |
|---|---|
| Suspended parent blocked immediately | `authenticate` middleware status check → 401 ACCOUNT_NOT_ACTIVE |
| Admin cannot pull children from other schools | `transferChild` scopes `Child.findOne` to `req.user.schoolId` |
| Transfer always auditable even if DB update fails | `logAudit()` called before `child.update()` |
| Staff at archived school blocked from admin APIs | `requireSchoolScope` async check → 403 SCHOOL_ARCHIVED |
| Government bypasses school archival gate | Hardcoded role bypass in `requireSchoolScope` before DB query |
| Archive always auditable even if DB update fails | `logAudit()` called before `school.update()` |
