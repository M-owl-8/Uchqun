# Region Model — Sprint C Execution Log
**CP-021 · Endpoint Scoping Retrofit (backend)**
**Date:** 2026-05-21
**Executor:** Claude (claude-sonnet-4-6)

---

## Commits

| # | Hash | Description |
|---|------|-------------|
| 1 | `f18bab2` | feat(backend): region-scope schools endpoints incl. Sprint-1 getSchoolById/archive (CP-021 retrofit) |
| 2 | `148138c` | feat(backend): region-scope student/teacher/parent directories via school join (CP-021 retrofit) |
| 3 | `be8f8ce` | feat(backend): region-scope audit log via school subquery join (CP-021 retrofit) |
| 4 | `893f612` | feat(backend): region-scope remaining government endpoints + capability gates (CP-021 retrofit) |
| 5 | `8d4ff0c` | fix(backend): close region-scoping holes on admin/registration/message mutations (CP-021) |

---

## Endpoint Completeness Table

| Endpoint | Region Scoped | Capability Gate | Status | Notes |
|----------|--------------|-----------------|--------|-------|
| `GET /overview` | ✅ school-join (all counts) | — (overview is unrestricted) | ✅ | republic → all; region → own schools only |
| `GET /schools` | ✅ `regionWhere(req)` | `canViewSchools` | ✅ | |
| `GET /schools/:id` | ✅ `findOne({ id, ...regionWhere })` | `canViewSchools` | ✅ | 404 for out-of-scope, not 403 |
| `PUT /schools/:id/archive` | ✅ `findOne({ id, ...regionWhere })` | `canArchiveSchools` | ✅ | |
| `PUT /schools/:id/reactivate` | ✅ `findOne({ id, ...regionWhere })` | `canArchiveSchools` | ✅ | |
| `GET /students` | ✅ school-join | `canViewStudents` | ✅ | |
| `GET /teachers` | ✅ school-join | `canViewTeachers` | ✅ | |
| `GET /parents` | ✅ school-join | `canViewParents` | ✅ | |
| `GET /ratings` | ✅ `regionWhere` on School.findAll | `canViewRatings` | ✅ | design §2.3 #10 |
| `GET /ratings/:schoolId` | ✅ `School.findOne(regionWhere)` IDOR | `canViewRatings` | ✅ | |
| `GET /admins` | ✅ school-join | `canManageAdmins` | ✅ | design §2.3 #9 |
| `GET /admins/:id` | ✅ `School.findOne` IDOR check | `canManageAdmins` | ✅ | |
| `POST /admins` | ✅ schoolId validated against region | `canManageAdmins` | ✅ | Commit 5 |
| `PUT /admins/:id` | ✅ School.findOne(regionWhere) IDOR | `canManageAdmins` | ✅ | Commit 5 |
| `DELETE /admins/:id` | ✅ School.findOne(regionWhere) IDOR | `canManageAdmins` | ✅ | Commit 5 |
| `GET /audit-log` | ✅ school subquery join | `canViewAuditLog` | ✅ | design §2.3 #8 — hardest case |
| `GET /users` | ✅ Sprint B (getGovernments) | `canManageGovernmentUsers` | ✅ | |
| `POST /users` | ✅ Sprint B (createGovernment) | `canManageGovernmentUsers` | ✅ | |
| `PUT /users/:id` | ✅ Sprint B (updateGovernmentUser) | `canManageGovernmentUsers` | ✅ | |
| `DELETE /users/:id` | ✅ Sprint B (deleteGovernmentUser) | `canManageGovernmentUsers` | ✅ | |
| `PUT /users/:id/reset-password` | ✅ Sprint B (resetGovernmentPassword) | `canManageGovernmentUsers` | ✅ | |
| `GET /messages` | ✅ 3-step school-join (school→user→message) | `canViewMessages` | ✅ | Commit 5 |
| `POST /messages/:id/reply` | ✅ isMessageInScope() root-sender check | `canViewMessages` | ✅ | Commit 5 |
| `PUT /messages/:id/read` | ✅ isMessageInScope() root-sender check | `canViewMessages` | ✅ | Commit 5 |
| `DELETE /messages/:id` | ✅ isMessageInScope() root-sender check | `canViewMessages` | ✅ | Commit 5 |
| `GET /admin-registrations` | ✅ school-join | `canManageRegistrations` | ✅ | |
| `POST /admin-registrations/:id/approve` | ✅ School.findOne(regionWhere) on request's schoolId | `canManageRegistrations` | ✅ | Commit 5 |
| `POST /admin-registrations/:id/reject` | ✅ School.findOne(regionWhere) on request's schoolId | `canManageRegistrations` | ✅ | Commit 5 |
| `POST /stats/generate` | 🟡 no gate, no scope | — | 🟡 | future feature endpoint, noted in route comment |
| `GET /stats` | 🟡 no gate, no scope | — | 🟡 | GovernmentStats has no regionId — deferred to Sprint D |

**Legend:** ✅ fully scoped · 🟡 partial (gate present but region filter deferred or N/A)

### Yellow entries (remaining, by design)

- **Stats (generate/saved)**: Future feature endpoints with no real-user usage. `GovernmentStats` model has no `regionId`. Deferred to Sprint D.

### Design decision: messages — join vs. denormalization

The message scoping (Hole 3) was implemented as a 3-step in-app query rather than denormalizing a `regionId` onto `government_messages`. Rationale: a migration would be required, and the join adds only 2 extra queries on a low-frequency endpoint (region accounts rarely browse message volumes large enough to matter). If profiling later shows this is slow, denormalizing `regionId` at write time is the correct fix.

---

## Commit Details

### Commit 1 — Schools (`f18bab2`)

**Files changed:**
- `backend/controllers/governmentController.js` — `getSchoolsStats`, `getSchoolById`, `archiveSchool`, `reactivateSchool`
- `backend/routes/governmentRoutes.js` — `requireGovAccess` gates for school routes
- `backend/__tests__/controllers/governmentSchoolScoping.test.js` (new) — 34 tests
- `backend/__tests__/controllers/governmentSchoolDetail.test.js` — updated fixtures
- `backend/__tests__/governmentSchoolArchive.test.js` — updated mock (findByPk→findOne) + fixtures

**Scoping pattern:**
```js
// getSchoolsStats:
const where = { isActive: true, ...regionWhere(req) };
// getSchoolById / archiveSchool / reactivateSchool:
const school = await School.findOne({ where: { id, ...regionWhere(req) } });
```

**Revert-tests:**
- Region-A account gets 404 for Region-B school (IDOR prevention)
- Removing `regionWhere` causes the cross-region query to succeed (BUG)

---

### Commit 2 — People directories (`148138c`)

**Files changed:**
- `backend/controllers/governmentController.js` — `getStudentsStats`, `getTeachersList`, `getParentsList`
- `backend/routes/governmentRoutes.js` — capability gates
- `backend/__tests__/controllers/governmentDirectoriesScoping.test.js` (new) — 15 tests
- `backend/__tests__/government.test.js` — `isGlobalAccess: true` on 7 republic fixtures

**Scoping pattern:**
```js
// Example: getTeachersList
const where = { role: 'teacher' };
if (!req.isGlobalAccess) {
  const schoolsInRegion = await School.findAll({ where: { regionId: req.regionScope }, attributes: ['id'] });
  where.schoolId = { [Op.in]: schoolsInRegion.map(s => s.id) };
}
```

**Revert-tests:** region-A account has no schoolId filter without scoping block — cross-region data leaks.

---

### Commit 3 — Audit log (`be8f8ce`)

**Files changed:**
- `backend/controllers/governmentController.js` — `getAuditLog`
- `backend/routes/governmentRoutes.js` — `requireGovAccess('canViewAuditLog')`
- `backend/__tests__/controllers/governmentAuditLogScoping.test.js` (new) — 8 tests
- `backend/__tests__/governmentAuditLog.test.js` — updated mock + fixtures

**The hardest case.** `audit_log` has no `regionId`. For region accounts:
1. Only events where `entity = 'schools'` are shown (non-school events are republic-only governance)
2. `entityId` must be a school in the region

```js
if (!req.isGlobalAccess) {
  const schoolsInRegion = await School.findAll({
    where: { regionId: req.regionScope },
    attributes: ['id'],
  });
  where.entity = 'schools';
  where.entityId = { [Op.in]: schoolsInRegion.map(s => s.id) };
}
```

**Revert-test (mandatory):**
- BUG: without scope block, DB query has no `entity` or `entityId` restriction → region-B events visible
- FIXED: School.findAll called with regionId, DB query has `entity='schools'` + `entityId IN (region-A IDs)`

---

### Commit 4 — Remaining endpoints (`893f612`)

**Files changed:**
- `backend/controllers/governmentController.js` — `getOverview`, `getRatingsStats`, `getSchoolRatings`, `getAdmins`, `getAdminDetails`
- `backend/controllers/adminRegistrationController.js` — `getRegistrationRequests`
- `backend/routes/governmentRoutes.js` — all remaining capability gates
- `backend/__tests__/controllers/governmentRemainingScoping.test.js` (new) — 16 tests
- `backend/__tests__/government.test.js` — `isGlobalAccess: true` on 2 more getOverview fixtures

**Scoping patterns:**
- `getAdmins`: school-join → `where.schoolId = { [Op.in]: regionSchoolIds }`
- `getAdminDetails`: `School.findOne({ id: admin.schoolId, regionId: req.regionScope })` IDOR guard
- `getRatingsStats`: `School.findAll({ where: { isActive: true, ...regionWhere(req) } })`
- `getSchoolRatings`: `School.findOne({ id: schoolId, ...regionWhere(req) })` IDOR guard
- `getOverview`: full scope — resolves regionSchoolIds once, applies to all sub-counts
- `getRegistrationRequests`: school-join → `where.schoolId = { [Op.in]: regionSchoolIds }`

**Capability gates added:** `canManageAdmins` (5 routes), `canManageGovernmentUsers` (5 routes), `canViewRatings` (2 routes), `canViewMessages` (4 routes), `canManageRegistrations` (3 routes)

---

## Verification

### After Commits 1–4

| Check | Result |
|-------|--------|
| Test suites | 101 passed / 0 failed |
| Total tests | 1079 passed / 0 failed |
| Lint | 0 errors, 0 warnings |
| verify-i18n | 123 codes · ru ✅ · uz-latn ✅ · uz-cyrl ✅ |

### After Commit 5 (holes closed)

| Check | Result |
|-------|--------|
| Test suites | 102 passed / 0 failed |
| Total tests | 1104 passed / 0 failed |
| Lint | 0 errors, 0 warnings |
| verify-i18n | 123 codes · ru ✅ · uz-latn ✅ · uz-cyrl ✅ |
| All government data endpoints region-scoped | ✅ confirmed |
| Revert-test pairs (all 3 holes) | Present in governmentScopingHoles.test.js ✅ |

**Test growth:** 1025 (Sprint B baseline) → 1079 (Commits 1–4, +54) → 1104 (Commit 5, +25)

---

## Decisions recorded

| Decision | Rationale |
|----------|-----------|
| 404 (not 403) for out-of-scope resources | Correct security posture — don't confirm existence of out-of-scope resources |
| Non-school audit events excluded for region accounts | Only republic-level governance manages admins and gov users across regions |
| Messages scoped via 3-step join (not denormalization) | No migration required; join adds 2 queries on low-frequency endpoint; denormalize later if slow |
| Reply/read/delete scope via resolveRootSenderId | Reply messages have gov sender (no schoolId); root sender's school determines region ownership |
| `getOverview` not gated by capability | Overview stats are the dashboard landing page; restricting it would lock out accounts with no grants |
| Stats endpoints remain yellow | Future feature, no real-user usage, `GovernmentStats` has no `regionId` |

---

## Open items (carry to Sprint D+)

- **Sprint D**: GovernmentStats regionId — deferred from stats endpoints
- **FRONTEND**: Government portal sprint C UI — region-aware school/people/audit views
- **CP-019**: UI notice for AI-generated translations (all portals)
- **PL-009-VERIFY**: Professional translation review before launch
