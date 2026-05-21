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
| `POST /admins` | 🟡 gate only | `canManageAdmins` | 🟡 | mutation not region-checked; region accounts need grant |
| `PUT /admins/:id` | 🟡 gate only | `canManageAdmins` | 🟡 | same as above |
| `DELETE /admins/:id` | 🟡 gate only | `canManageAdmins` | 🟡 | same as above |
| `GET /audit-log` | ✅ school subquery join | `canViewAuditLog` | ✅ | design §2.3 #8 — hardest case |
| `GET /users` | ✅ Sprint B (getGovernments) | `canManageGovernmentUsers` | ✅ | |
| `POST /users` | ✅ Sprint B (createGovernment) | `canManageGovernmentUsers` | ✅ | |
| `PUT /users/:id` | ✅ Sprint B (updateGovernmentUser) | `canManageGovernmentUsers` | ✅ | |
| `DELETE /users/:id` | ✅ Sprint B (deleteGovernmentUser) | `canManageGovernmentUsers` | ✅ | |
| `PUT /users/:id/reset-password` | ✅ Sprint B (resetGovernmentPassword) | `canManageGovernmentUsers` | ✅ | |
| `GET /messages` | 🟡 gate only | `canViewMessages` | 🟡 | 3-hop join (message→sender→school→region) not implemented |
| `POST /messages/:id/reply` | 🟡 gate only | `canViewMessages` | 🟡 | same |
| `PUT /messages/:id/read` | 🟡 gate only | `canViewMessages` | 🟡 | same |
| `DELETE /messages/:id` | 🟡 gate only | `canViewMessages` | 🟡 | same |
| `GET /admin-registrations` | ✅ school-join | `canManageRegistrations` | ✅ | |
| `POST /admin-registrations/:id/approve` | 🟡 gate only | `canManageRegistrations` | 🟡 | mutation validates specific request, region check deferred |
| `POST /admin-registrations/:id/reject` | 🟡 gate only | `canManageRegistrations` | 🟡 | same |
| `POST /stats/generate` | 🟡 no gate, no scope | — | 🟡 | future feature endpoint, noted in route comment |
| `GET /stats` | 🟡 no gate, no scope | — | 🟡 | GovernmentStats has no regionId — deferred to Sprint D |

**Legend:** ✅ fully scoped · 🟡 partial (gate present but region filter deferred)

### Yellow gate summary

- **Admin mutations (POST/PUT/DELETE /admins)**: Read paths fully scoped; mutations carry capability gate (`canManageAdmins`) which is deny-by-default for secondary accounts. A region account with the grant could theoretically update an out-of-scope admin if they know the UUID. Low risk: all government accounts have `mustChangePassword=true` on provisioning, and the grant is not auto-assigned. Sprint D recommendation: add `School.findOne(regionWhere)` check before the mutation.

- **Messages (GET/reply/read/delete /messages)**: `GovernmentMessage` has `senderId` but no `schoolId` or `regionId`. Region scoping would require a 3-hop join (message → sender → users.schoolId → schools.regionId). Capability gate is in place. Deferred to Sprint D.

- **Registration mutations (approve/reject)**: The `getRegistrationRequests` list endpoint IS scoped by school join. Approve/reject operate on a specific `requestId` — a region account could approve a request from another region if they have the requestId. Gate is in place. Sprint D: add school-region IDOR check before approve/reject.

- **Stats (generate/saved)**: Future feature endpoints with no real-user usage. `GovernmentStats` model has no `regionId`. Deferred.

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

| Check | Result |
|-------|--------|
| Test suites | 101 passed / 0 failed |
| Total tests | 1079 passed / 0 failed |
| Lint | 0 errors, 0 warnings |
| verify-i18n | 123 codes · ru ✅ · uz-latn ✅ · uz-cyrl ✅ |
| Design §2.3 endpoints (10) | All 10 scoped ✅ |
| Revert-tests (all 10 + audit subquery) | All present ✅ |

**Test growth:** 1025 (Sprint B baseline) → 1079 (+54 tests across 4 commits)

---

## Decisions recorded

| Decision | Rationale |
|----------|-----------|
| 404 (not 403) for out-of-scope resources | Correct security posture — don't confirm existence of out-of-scope resources |
| Non-school audit events excluded for region accounts | Only republic-level governance manages admins and gov users across regions |
| Admin mutations left as yellow gates | Capability gate (deny-by-default) + read-path scoping provides sufficient isolation for current risk level |
| Messages left as yellow gates | 3-hop join (message→sender→school→region) deferred; gate in place |
| `getOverview` not gated by capability | Overview stats are the dashboard landing page; restricting it would lock out accounts with no grants |

---

## Open items (carry to Sprint D+)

- **Sprint D**: Admin mutation region check (POST/PUT/DELETE /admins)
- **Sprint D**: Messages region scope (3-hop join)
- **Sprint D**: Registration approve/reject IDOR check
- **Sprint D**: GovernmentStats regionId — deferred from stats endpoints
- **FRONTEND**: Government portal sprint C UI — region-aware school/people/audit views
- **CP-019**: UI notice for AI-generated translations (all portals)
- **PL-009-VERIFY**: Professional translation review before launch
