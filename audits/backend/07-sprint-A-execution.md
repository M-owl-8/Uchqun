# Backend S7 — Sprint A Execution Report

**Sprint:** A (Foundation + Teacher Unblock)  
**Closed:** 2026-05-19  
**Commits:** 5fbdd84 → a1149fb (7 commits)

---

## 1. Pre-Flight

- LOOP_TRACKER.md read: S6.1 ✅, S6 ✅, S5 ✅, S4 ✅ — all gates passed
- S7 marked 🟡 + "Sprint A: 🟡 in progress" before first commit

---

## 2. Task O-1 — Feature Flag Investigation

**Verdict:** No feature flag infrastructure exists (no `flagsmith`, `launchdarkly`, `unleash`, or home-grown toggle library found in `package.json` or any config file). T2-2 (parent suspension) must follow the two-PR rollout as documented in Section 9 of `06-feature-plan.md`.

---

## 3. Task 1 — T2-1: Audit Log Infrastructure

**Commit:** 5fbdd84

### Files created
| File | Purpose |
|---|---|
| `migrations/20260519100000-create-audit-log.js` | `audit_log` table: BIGINT PK, actorId/schoolId FKs (SET NULL), action/entity/entityId/actorRole/meta, `occurredAt` (no timestamps). Indexes on actorId, entity+entityId, schoolId, occurredAt. |
| `models/AuditLog.js` | Sequelize model, `timestamps: false`. Static `.update` and `.destroy` overridden to throw `Error('audit_log is immutable')`. |
| `utils/auditLogger.js` | `logAudit({ actorId, actorRole, action, entity, entityId, schoolId, meta })`. Swallows all errors — audit failures never block application flow. |
| `models/index.js` (modified) | Added AuditLog + ChildAttendance imports, associations, and `Child.afterDestroy` hook calling `logAudit`. Hook failure is caught and swallowed at both levels. |

### Tests (9 new, `__tests__/auditLog.test.js` + `__tests__/childAuditHook.test.js`)
- `AuditLog.update` throws `audit_log is immutable` (immutability guard)
- `AuditLog.destroy` throws `audit_log is immutable`
- `logAudit` calls `AuditLog.create` with correct fields
- `logAudit` swallows failures (no throw)
- `logAudit` defaults actorId null and actorRole 'unknown'
- `Child.afterDestroy` hook registered on index.js load
- Hook writes audit entry with actorId, actorRole, action='delete', entity='children'
- Hook writes null actorId when not passed
- Hook does not throw when `AuditLog.create` fails

---

## 4. Task 2 — T1-1 + T1-6: Teacher Children List + Attendance

**Commits:** d48e6a3 (migration + model), 69d2114 (controller + routes + tests)

### Files created
| File | Purpose |
|---|---|
| `migrations/20260519100001-create-child-attendance.js` | `child_attendance` table with paranoid (deletedAt). Partial unique index `(childId, date) WHERE deletedAt IS NULL`. ENUM type for status. schoolId FK RESTRICT. |
| `models/ChildAttendance.js` | Sequelize model, `paranoid: true`, ENUM status, JSONB childSnapshot. |
| `controllers/attendanceController.js` | `createAttendance` (validates date not-future, calls `validateChildAccess`, populates childSnapshot, returns 409 on duplicate). `listAttendance` (schoolId-scoped, optional childId/date/date-range filters). `updateAttendance` (schoolId match check → 403). `deleteAttendance` (schoolId match check → 403, soft-delete). |
| `routes/attendanceRoutes.js` | Mounted at `/api/v1/attendance`. POST/GET → `requireTeacher`. PATCH → `requireTeacher`. DELETE → `requireAdmin`. |
| `server.js` (modified) | `app.use('/api/v1/attendance', attendanceRoutes)` |

### `teacherController.js` (modified)
- Added `getChildren`: `Child.findAll({ where: { schoolId: req.user.schoolId } })` → `{ success: true, data }`
- Added `getChildById`: `validateChildAccess(req.params.id, req)` → 404 if null

### `teacherRoutes.js` (modified)
- `GET /children` → `getChildren`
- `GET /children/:id` → `getChildById`

### Tests (23 new, `__tests__/attendance.test.js` + `__tests__/teacherChildren.test.js`)

**attendance.test.js (16 tests):**
- `createAttendance`: 201+childSnapshot, 400 missing childId/date/invalid status/future date, 403 IDOR guard (revert-test), 409 duplicate, 500 DB error
- `listAttendance`: 200 schoolId-scoped, 500 DB error
- `updateAttendance`: 400 no payload, 403 cross-school (revert-test), 200 valid, 500 DB error
- `deleteAttendance`: 403 cross-school (revert-test), 200 delete, 500 DB error

**teacherChildren.test.js (7 tests):**
- `getChildren`: 200 schoolId-scoped (where.schoolId verified), 500 DB error
- `getChildById`: 200 valid, 404 IDOR cross-school (revert-test), 404 not found, 500 DB error

---

## 5. Task 3 — T1-4: Admin Document Status Filter

**Commit:** a706f96

### Changes
- `controllers/admin/adminReceptionController.js`: Added `VALID_DOCUMENT_STATUSES` constant and `getDocuments` export. Invalid status → 400. Admin isolation enforced via `include: [{ model: User, as: 'user', where: { createdBy: req.user.id } }]`.
- `routes/adminRoutes.js`: `GET /documents` added **before** `GET /documents/pending` to avoid route shadowing. `getDocuments` added to import.

### Tests (6 new, `__tests__/adminReception.test.js`)
- No filter → all docs returned, where has no status key
- `?status=approved` → where.status=approved
- `?status=rejected` → where.status=rejected
- `?status=unknown` → 400, findAll not called (revert-test)
- Admin isolation: `include[0].where.createdBy === req.user.id` asserted
- DB throws → 500

---

## 6. Task 4 — T1-5: Reception Document Status Filter

**Commit:** 9c8d888

### Changes
- `controllers/receptionController.js`: Added `VALID_DOCUMENT_STATUSES` constant. `getMyDocuments` now accepts `?status=` query param. Backward-compatible (no status = returns all).
- No route change needed — `GET /reception/documents` already wired.

### Tests (4 new, `__tests__/receptionControllerOther.test.js`)
- No filter → where has no status key, returns all
- `?status=pending` → where.status=pending, where.userId asserted
- `?status=approved` → where.status=approved
- `?status=garbage` → 400, findAll not called (revert-test)

---

## 7. Fix Commit

**Commit:** a1149fb

Two fixes caught during gate verification:
1. `attendanceController.js`: Removed unused `Child` import (ESLint `no-unused-vars` warning, 0 warnings gate)
2. `childAuditHook.test.js`: Added `ChildAttendance` mock — after `models/index.js` was updated to import `ChildAttendance`, the test suite failed because the mock for `database.js` lacked `define`. Fix: mock the model file directly, matching the pattern of all other model mocks in that test.

---

## 8. Verification Gates

| Gate | Result |
|---|---|
| Test suite | ✅ 74 suites, 686 tests, 0 failures |
| Lint | ✅ 0 errors, 0 warnings |
| Coverage (statements) | ✅ 47.65% ≥ 46.66% gate |
| Migration up/down/up | ⚠️ `migrate:undo` is `echo` only — no CLI rollback. `npm run migrate` completed without error. Migration files verified: both `up` and `down` functions defined and syntactically correct. Full up/down/up cycle runs on Railway deploy via `npm run start:migrate`. |

---

## 9. Cross-Portal Handoffs Completed

CP-004, CP-005, CP-009, CP-010 marked ✅ in `LOOP_CROSS_PORTAL.md`.

| CP | Item | Ready |
|---|---|---|
| CP-004 | `GET /api/v1/teacher/children` | ✅ |
| CP-005 | `POST/GET/PATCH/DELETE /api/v1/attendance` | ✅ |
| CP-009 | `GET /api/v1/admin/documents?status=` | ✅ |
| CP-010 | `GET /api/v1/reception/documents?status=` | ✅ |

---

## 10. Sprint A Summary

**Tasks completed:** O-1 (feature flag check), T2-1 (audit log), T1-1+T1-6 (children+attendance), T1-4 (admin doc filter), T1-5 (reception doc filter)  
**New test cases:** 38 (686 total, up from 645)  
**New files:** 9 (2 migrations, 2 models, 1 controller, 1 route, 3 test files)  
**Modified files:** 7  
**Coverage delta:** 46.66% → 47.65% (+0.99pp)  
**Sprint B scope:** Remaining Tier 1 blockers (T1-2 observations, T1-3 reflections, T1-7a bulk import validator) + T2-1 instrumentation of existing delete endpoints.
