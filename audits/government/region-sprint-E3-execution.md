# Region Model — Sprint E3 Execution Log
**E3 · Region-Scoped Data Views**
**Date:** 2026-05-21
**Executor:** Claude (claude-sonnet-4-6)

---

## Commits

| # | Hash | Description |
|---|------|-------------|
| 1 | `52e5229` | feat(government): E3 — region-scoped dashboard with clear scope labeling |
| 2 | `9ab6153` | feat(government): E3 — region-scoped schools list with scope labeling |
| 3 | `d745e46` | feat(government): E3 — directory pages (students/teachers/parents) with region scope |
| 4 | `9f5ba8e` | feat(government): E3 — region-scoped audit/ratings/warnings with scope context + backend fix |
| 5 | (this doc) | docs(government): region sprint E3 execution — region-scoped data views |

---

## Per-Commit Log

### Commit 1 — Dashboard + region context (`52e5229`)

**New file:**
- `government/src/hooks/useRegionName.js` — reusable hook; fetches `/government/regions` once using shared `platform:regions` cache key, returns resolved region name string for region accounts (`null` for republic)

**Files changed:**
- `government/src/pages/Dashboard.jsx` — added `useAuth`, `useRegionName`; scope badge in header (`data-testid="scope-label"`); `regionBreakdown` now hidden for region accounts (1-region breakdown is redundant); region-aware school list empty state
- `government/src/__tests__/Dashboard.test.jsx` — added `useAuth` and `useRegionName` mocks; updated `t()` mock to support `{{name}}` interpolation; 3 new scope-label tests (5 total)
- `government/src/locales/en/common.json` — added `scope.*` section; scope-variant keys for all views; filled in `nav.warnings` and `nav.auditLog` (were missing, showed as raw keys)
- `government/src/locales/uz/common.json` — added `scope.*` and scope-variant keys (UNVERIFIED — AI-generated translations)
- `government/src/locales/ru/common.json` — same (UNVERIFIED)

**Scope badge pattern established:**
```jsx
<div className="flex items-center gap-1.5 mt-1" data-testid="scope-label">
  {isRepublic ? (
    <span className="inline-flex items-center gap-1 text-xs text-gray-400">
      <Globe className="w-3 h-3" />
      {t('scope.national', { defaultValue: 'All regions' })}
    </span>
  ) : isRegionAccount && regionName ? (
    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-blue-50 text-blue-700 text-xs font-medium border border-blue-200">
      <MapPin className="w-3 h-3" />
      {regionName}
    </span>
  ) : null}
</div>
```

---

### Commit 2 — Schools region scope (`9ab6153`)

**Files changed:**
- `government/src/pages/Schools.jsx` — added scope badge; subtitle becomes region-aware; empty state text uses region name when applicable
- `government/src/__tests__/Schools.test.jsx` — added `useAuth`/`useRegionName` mocks; 3 new scope-label tests (8 total)

**SchoolDetail decision:** No changes made. The detail page shows a single school scoped by the server (404 for out-of-region access). The school's own region string is already visible in the Key Facts grid. Adding a scope badge at this level would be redundant.

---

### Commit 3 — Directory pages (`d745e46`)

**New pages built (Sprint C endpoints existed, UI was missing):**

#### `government/src/pages/Students.jsx`
- Fetches `GET /government/students` with `limit=50`, offset-based load-more
- Search by name or school name (client-side filter on fetched page)
- Displays: student name, school name, date of birth, gender, health status badge
- Scope badge, region-aware subtitle and empty state

#### `government/src/pages/Teachers.jsx`
- Fetches `GET /government/teachers` with `limit=50`, offset-based load-more
- Search by name or email (client-side filter on fetched page)
- Displays: teacher name, email, school name, role badge
- Scope badge, region-aware subtitle and empty state

#### `government/src/pages/Parents.jsx`
- Fetches `GET /government/parents` with `limit=20` (matching backend default)
- Offset-based load-more (API does not support name filtering)
- Displays: parent name, phone, children count, status badge
- Scope badge, region-aware subtitle and empty state

**Infrastructure files changed:**
- `government/src/components/Sidebar.jsx` — added `GraduationCap`, `UserCheck`, `Users` icons; 3 new NAV_ITEMS (students, teachers, parents) with capability gates (`canViewStudents`, `canViewTeachers`, `canViewParents`); total nav items: 11 (was 8)
- `government/src/App.jsx` — imported Students, Teachers, Parents; added 3 routes inside `/government` layout wrapped in `<ErrorBoundary>`
- `government/src/__tests__/SidebarCapability.test.jsx` — updated nav count assertions from 8→11; updated test names; added test for secondary capability set including `canViewStudents/Teachers/Parents`
- `government/src/__tests__/DirectoryPages.test.jsx` — 11 new tests covering all 3 directory pages: loading spinner, republic scope label, region scope label, region-specific empty state, row rendering

**PL-014 re-flagged:** Directory pages are now built. Parent/student/teacher PII (names, phones, DOB) is now visible in the government portal. PL-014 (PII sign-off) is a launch-blocking prerequisite.

---

### Commit 4 — Audit/Ratings/Warnings + backend fix (`9f5ba8e`)

**Backend fix — Sprint C gap closed:**

`/ai-warnings` routes use `requireRole('admin', 'government')` only — no `requireRegionScope` middleware. Government region accounts were seeing ALL warnings nationwide (all schools, all regions).

Fix in `backend/controllers/aiWarningController.js` (`getWarnings`):
```js
// Government region scoping: region accounts only see warnings for their region's schools
if (req.user.role === 'government' && req.user.govRegionId) {
  const regionSchools = await School.findAll({
    where: { regionId: req.user.govRegionId },
    attributes: ['id'],
  });
  where.schoolId = { [Op.in]: regionSchools.map((s) => s.id) };
}
```

`backend/__tests__/aiWarning.test.js` — updated School mock from `{ default: {} }` to `{ default: { findAll: mockSchoolFindAll } }`; 2 new tests:
- `government region account: scopes to schools in govRegionId` — verifies `School.findAll` called with `{ regionId: 'region-uuid-1' }` and `where.schoolId` set
- `government republic account (no govRegionId): no region scoping applied` — verifies `School.findAll` NOT called and `where.schoolId` undefined

**Frontend — scope labels added to:**
- `government/src/pages/AuditLog.jsx` — scope badge in header; region-aware empty state: "No audit entries for {{name}} yet"
- `government/src/pages/Ratings.jsx` — scope badge; region-aware subtitle and empty state
- `government/src/pages/AIWarnings.jsx` — scope badge; region-aware empty states for both active and resolved filter tabs

`government/src/__tests__/AuditLog.test.jsx` — added `useAuth`/`useRegionName` mocks; 2 new scope-label tests (9 total)

---

## Test Results

### Before E3
- Government: 15 suites / 98 tests
- Backend: 106 suites / 1134 tests

### After E3
- Government: **16 suites / 118 tests** (+1 suite, +20 tests) ✅
- Backend: **106 suites / 1136 tests** (+2 tests) ✅
- Backend lint: 0 errors ✅
- Government lint: 0 errors ✅
- `node backend/scripts/verify-i18n.js`: 123 codes, all 3 language files match ✅

---

## Manual Gate

**Status:** COMPLETED by Max on 2026-05-21 — all 11 nav items verified; data (not just labels) confirmed region-scoped throughout.

**Manual gate checklist:**
- [x] Log in as region account (govRegionId set)
- [x] Dashboard — scope badge shows region name; KPI counts are regional; region breakdown hidden
- [x] Schools — scope badge shows region name; only region's schools listed
- [x] School Detail — loads correctly for region school; 404 for out-of-region (test via URL)
- [x] Students — scope badge shows region name; only region's students; load-more works
- [x] Teachers — scope badge shows region name; only region's teachers; load-more works
- [x] Parents — scope badge shows region name; only region's parents; load-more works
- [x] Ratings — scope badge shows region name; only region's school ratings
- [x] AI Warnings — scope badge shows region name; only region's school warnings
- [x] Audit Log — scope badge shows region name; entries scoped to region (server handles)
- [x] Log in as republic account — all pages show "All regions" Globe label; full data visible

**Outcome:** Every screen clearly identifies its scope. Region account sees only their region's data throughout. Republic account sees all-region data throughout.

---

## Key Decisions

| Decision | Rationale |
|----------|-----------|
| `useRegionName` hook shares `platform:regions` cache key | Platform.jsx already fetches regions; re-using the key means 0 extra requests when navigating from Platform page |
| SchoolDetail: no scope badge added | Single-school detail is inherently scoped; the school's region is visible in Key Facts; a badge would be redundant |
| `regionBreakdown` hidden for region accounts | A breakdown of 1 region is meaningless; republic accounts still see the full regional breakdown |
| No client-side region filtering | Server scopes all endpoints (Sprint C); frontend is presentation-only |
| AIWarnings backend fix included in E3 | Sprint C gap left region accounts seeing all warnings nationwide; scope label would have been misleading without the fix |
| Directory pages use offset-based load-more | Sprint C endpoints support `limit`/`offset`; cursor pagination not needed for government directory |

---

## Open Items After E3

| ID | Item | Priority |
|----|------|----------|
| PL-014 | PII sign-off — directory pages show student/parent/teacher PII | LAUNCH-BLOCKING |
| C-02 | Group-wide media visibility — product/legal sign-off | PRE-LAUNCH |
| C-07 | CORS substring check — replace with explicit allowlist | PRE-LAUNCH |
| CP-019 | i18n unverified notice for end users (all portals) | PRE-LAUNCH |
| PL-009-VERIFY | Professional review of AI-generated uz/ru translations | PRE-LAUNCH |
| Manual gate | Max walks every nav item as region account on Railway | ✅ COMPLETED 2026-05-21 |
