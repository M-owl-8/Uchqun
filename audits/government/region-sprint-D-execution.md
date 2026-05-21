# Region Model — Sprint D Execution Log
**CP-021 · Region-Data Layer (placeholder-now, real-later)**
**Date:** 2026-05-21
**Executor:** Claude (claude-sonnet-4-6)

---

## Commits

| # | Hash | Description |
|---|------|-------------|
| 1 | `e2d8e5a` | feat(backend): data-driven school category model (placeholder categories, real-data-ready) |
| 2 | `4e4f650` | feat(backend): school category-change restricted to government main accounts (region-scoped) |
| 3 | `8a6fea0` | feat(backend): GovernmentStats regionId + scoping (closes Sprint C yellow) |
| 4 | `50deb9c` | docs(backend): region/category real-data swap instructions + name-independence verification |

---

## Per-Commit Log

### Commit 1 — Category model (`e2d8e5a`)

**Files changed:**
- `backend/migrations/20260521200000-create-school-categories.js` — creates `school_categories` table; seeds 4 placeholder entries; adds `categoryId` FK to `schools`
- `backend/models/SchoolCategory.js` — new model (id, code, name, isActive, timestamps)
- `backend/models/School.js` — `categoryId` UUID FK field added (nullable, comment explaining it's government-only)
- `backend/models/index.js` — imports, association, exports
- `backend/__tests__/controllers/schoolCategory.test.js` — 5 tests

**Category seeds (stable UUIDs + codes):**

| UUID | Code | Placeholder name |
|------|------|-----------------|
| `00000000-0000-0000-cafe-000000000001` | `kunduzgi_parvarish` | Kunduzgi parvarish |
| `00000000-0000-0000-cafe-000000000002` | `yangi_kun` | Yangi kun |
| `00000000-0000-0000-cafe-000000000003` | `madad` | Madad |
| `00000000-0000-0000-cafe-000000000004` | `uyda_qarab_turish` | Uyda qarab turish |

**FK choice — why categoryId not string:**
School has no prior `category` string field (the existing `type` field is a different concept: school/kindergarten/both). Starting clean with a UUID FK is the right design — no legacy string to migrate from. FK by id means renaming categories has zero cascade effect.

**Backfill:**
Existing schools have `categoryId = null` (uncategorised). This is correct — government assigns categories after data swap.

---

### Commit 2 — Category-change authorization (`4e4f650`)

**Files changed:**
- `backend/controllers/governmentController.js` — adds `changeSchoolCategory` function + `'change_category:schools'` to `AUDIT_LOG_ALLOWLIST` (now 12 entries)
- `backend/routes/governmentRoutes.js` — adds `PUT /schools/:id/category` (no capability gate required — main-only check in controller)
- `backend/__tests__/controllers/schoolCategoryChange.test.js` — 14 tests
- `backend/__tests__/governmentAuditLog.test.js` — allowlist count updated 11→12

**Authorization rule:**
```js
if (req.govType !== 'main') return res.status(403).json({ error: { code: 'CATEGORY_CHANGE_FORBIDDEN' } });
```
No capability gate middleware (the route is under `requireGovernment` already). The explicit `govType !== 'main'` check blocks secondary accounts definitively, regardless of what grants they carry.

**Region scoping:**
```js
const school = await School.findOne({ where: { id, ...regionWhere(req) } });
// → republic-main: { id } only; region-main: { id, regionId: req.regionScope }
```

**Revert-test pair (quoted):**
```
[REVERT-TEST: BUG]  secondary can change category if govType check absent
  → mockSchoolFindOne and mockSchoolSave called; school.categoryId = CATEGORY_ID (write succeeds)

[REVERT-TEST: FIXED] secondary → 403 (govType check present)
  → res.status called with 403; mockSchoolFindOne NOT called; mockSchoolSave NOT called
```

---

### Commit 3 — GovernmentStats regionId (`8a6fea0`)

**Files changed:**
- `backend/migrations/20260521300000-add-regionId-to-government-stats.js` — adds `regionId` UUID FK (nullable, SET NULL) to `government_stats` + index
- `backend/models/GovernmentStats.js` — `regionId` field added
- `backend/models/index.js` — Region→GovernmentStats association
- `backend/controllers/governmentController.js` — `generateStats` stamps `regionId = req.isGlobalAccess ? null : req.regionScope`; `getSavedStats` adds `where.regionId = req.regionScope` for region accounts
- `backend/__tests__/controllers/governmentStatsScoping.test.js` — 7 tests

**Revert-test pair (quoted):**
```
[REVERT-TEST: BUG]  without regionId filter, region account sees all stats
  → where object has no regionId property; all 3 rows (REGION_A + other-region + null) visible

[REVERT-TEST: FIXED] region account only sees own-region stats
  → where.regionId === REGION_A confirmed
```

---

### Commit 4 — Data-update instructions (`50deb9c`)

**File:** `docs/region-category-data-update.md`

Contents:
- Migration template for region name swap (UPDATE by UUID, not INSERT)
- Migration template for category name swap
- Instructions for adding a 5th category (INSERT with stable UUID `cafe-000000000005`)
- What NEVER changes: UUIDs, `isRepublic` flag, FK relationships
- Name-independence verification: `npm test` after swap — zero test changes needed
- PL-015 status note

---

## Endpoint Completeness Table (Sprint D update)

| Endpoint | Region Scoped | Capability Gate | Status | Notes |
|----------|--------------|-----------------|--------|-------|
| `GET /overview` | ✅ school-join | — (unrestricted) | ✅ | |
| `GET /schools` | ✅ `regionWhere` | `canViewSchools` | ✅ | |
| `GET /schools/:id` | ✅ IDOR | `canViewSchools` | ✅ | |
| `PUT /schools/:id/archive` | ✅ IDOR | `canArchiveSchools` | ✅ | |
| `PUT /schools/:id/reactivate` | ✅ IDOR | `canArchiveSchools` | ✅ | |
| `PUT /schools/:id/category` | ✅ IDOR + main-only | — (controller check) | ✅ | Sprint D Commit 2 |
| `GET /students` | ✅ school-join | `canViewStudents` | ✅ | |
| `GET /teachers` | ✅ school-join | `canViewTeachers` | ✅ | |
| `GET /parents` | ✅ school-join | `canViewParents` | ✅ | |
| `GET /ratings` | ✅ `regionWhere` | `canViewRatings` | ✅ | |
| `GET /ratings/:schoolId` | ✅ IDOR | `canViewRatings` | ✅ | |
| `GET /admins` | ✅ school-join | `canManageAdmins` | ✅ | |
| `GET /admins/:id` | ✅ IDOR | `canManageAdmins` | ✅ | |
| `POST /admins` | ✅ school validation | `canManageAdmins` | ✅ | |
| `PUT /admins/:id` | ✅ IDOR | `canManageAdmins` | ✅ | |
| `DELETE /admins/:id` | ✅ IDOR | `canManageAdmins` | ✅ | |
| `GET /audit-log` | ✅ school subquery | `canViewAuditLog` | ✅ | |
| `GET /users` | ✅ Sprint B | `canManageGovernmentUsers` | ✅ | |
| `POST /users` | ✅ Sprint B | `canManageGovernmentUsers` | ✅ | |
| `PUT /users/:id` | ✅ Sprint B | `canManageGovernmentUsers` | ✅ | |
| `DELETE /users/:id` | ✅ Sprint B | `canManageGovernmentUsers` | ✅ | |
| `PUT /users/:id/reset-password` | ✅ Sprint B | `canManageGovernmentUsers` | ✅ | |
| `GET /messages` | ✅ 3-step join | `canViewMessages` | ✅ | |
| `POST /messages/:id/reply` | ✅ root-sender check | `canViewMessages` | ✅ | |
| `PUT /messages/:id/read` | ✅ root-sender check | `canViewMessages` | ✅ | |
| `DELETE /messages/:id` | ✅ root-sender check | `canViewMessages` | ✅ | |
| `GET /admin-registrations` | ✅ school-join | `canManageRegistrations` | ✅ | |
| `POST /admin-registrations/:id/approve` | ✅ IDOR | `canManageRegistrations` | ✅ | |
| `POST /admin-registrations/:id/reject` | ✅ IDOR | `canManageRegistrations` | ✅ | |
| `POST /stats/generate` | ✅ regionId auto-stamped | — | ✅ | Sprint D Commit 3 |
| `GET /stats` | ✅ regionId filter | — | ✅ | Sprint D Commit 3 |

**All 31 government data endpoints are now ✅.** No yellow entries remain.

---

## DEAL-GATED ITEMS

Per owner strategy, the following items are intentionally deferred as deal leverage. Each is confirmed **incomplete-NOT-broken** — no data leak, no crash, no scoping hole left open.

### DG-001: Real region names (PL-015 data swap)
**State:** Placeholder names ("Region 01" … "Region 13") in `regions` table.  
**What completes it:** Partner delivers authoritative Uzbek region list. Run migration from `docs/region-category-data-update.md`.  
**Incomplete-not-broken confirmation:** Scoping uses `regionId` UUID, never `name`. Existing tests use UUID constants — all 1130 tests pass against placeholder names. No user-facing function depends on the name string for correctness; it's display-only.

### DG-002: Real school category names (PL-015 data swap)
**State:** Placeholder names in `school_categories` table (~70% confirmed, final list pending partner).  
**What completes it:** Partner confirms final category names. Run name UPDATE from `docs/region-category-data-update.md`. If a 5th category is added, INSERT with stable UUID `cafe-000000000005`.  
**Incomplete-not-broken confirmation:** `categoryId` FK uses UUID — renaming categories has zero effect on any school link. No endpoint currently returns categories to users (category-change is government-internal only).

### DG-003: School category assignment (UI)
**State:** Backend supports `categoryId` and the `PUT /government/schools/:id/category` endpoint. No government portal UI page exists for this workflow yet.  
**What completes it:** Frontend Sprint E (or dedicated UI sprint) builds a category picker in the school management UI.  
**Incomplete-not-broken confirmation:** Schools have `categoryId = null` (uncategorised). This is visible in school JSON but causes no errors or crashes anywhere. The endpoint is available for API use; it simply has no UI entry point.

---

## Data-Readiness Summary

| Data layer | Update path | Code change required? | Name-independent? |
|-----------|-------------|----------------------|------------------|
| Region names | UPDATE by UUID via migration | No | ✅ yes |
| Category names | UPDATE by UUID via migration | No | ✅ yes |
| New 5th category | INSERT with stable UUID | No | ✅ yes |
| School→category assignment | PUT /government/schools/:id/category | No | ✅ yes |

When the partner delivers PL-015 data: open `docs/region-category-data-update.md`, create one migration, run `npm run migrate`, run `npm test`. Done.

---

## Verification

| Check | Result |
|-------|--------|
| Test suites | 105 passed / 0 failed |
| Total tests | 1130 passed / 0 failed (+26 Sprint D) |
| Lint | 0 errors, 0 warnings |
| verify-i18n | 123 codes · ru ✅ · uz-latn ✅ · uz-cyrl ✅ |
| All government endpoints region-scoped | ✅ 31/31 |
| Revert-test pairs (category-change + stats) | Both present ✅ |
| Deal-gated items confirmed incomplete-not-broken | ✅ (DG-001, DG-002, DG-003) |
| Data-update instructions | ✅ `docs/region-category-data-update.md` |

**Test growth:** 1104 (Sprint C close) → 1130 (Sprint D, +26: 5 category model + 14 category-change + 7 stats scoping)

---

## PL-015 Status

Still pending partner. The swap path is ready — see `docs/region-category-data-update.md`.
