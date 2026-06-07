# CROSS-IRR-VISIBILITY

Make IRR (Individual Rehabilitation Roadmap / Individual Reja) visible across
admin (school director) and government portals, with admin able to
counter-sign goal periods inline from the child profile.

## Why

IRR is the platform's central clinical document — a 12-month, 17-criterion
rehab roadmap with quarterly goal periods that require dual signatures
(teacher + manager/director). Previously:

- Admin (school Director) had a separate `/admin/manager-irr` page bolted on,
  using "manager" terminology that did not map to any real role in the system.
- Government users could list students but could not drill into a child's
  profile or see IRR oversight data.

Result: directors had to bounce between pages to sign, and government couldn't
audit IRR completion. Both gaps undermine the "IRR is the spine" framing of
the platform.

## Decisions (recorded)

- **Q1: Director counter-sign UX.** Admin gets an inline counter-sign button
  on the IRR card itself, embedded in the child profile (not a separate page).
- **Q2: Government IRR detail level.** Government sees aggregate-only
  progression — no per-criterion scores. Per-criterion data stays restricted to
  the clinical layer (teacher → admin/director). Government oversight =
  completion & dual-signature status, not clinical scores.
- **Q4: Route architecture.** New dedicated `/admin/children/:id/irr*` and
  `/government/children/:id/*` routes with role-specific controllers. We do
  not piggyback on `/teacher/*` or `/parent/*` routes — clean tenant separation,
  zero risk of accidental role drift in the future.

## Terminology cleanup

The IRR clinical document uses the term "manager" (Russian/Uzbek convention
for the school director). There is **no `manager` role in the database**. The
school director's actual role is `admin`. We aligned terminology accordingly:

- `admin/src/pages/ManagerIRR.jsx` → `admin/src/pages/AdminIRR.jsx`
- `managerIrr` locale namespace → `directorIrr`
- Test file renamed: `ManagerIRR.test.jsx` → `AdminIRR.test.jsx`

The standalone `AdminIRR` page is retained as a director's IRR worklist
(across all children in the school). For per-child sign-off, directors use
the new inline button on `ChildDetail`.

## Backend

### New controllers

- `backend/controllers/admin/adminIrrController.js` — admin-scoped IRR reads.
  Per-criterion scores included (full assessment payload), authorized via
  `resolveAdminChild()` which enforces `req.user.role === 'admin'` AND
  `child.schoolId === req.user.schoolId`.
- `backend/controllers/government/governmentChildController.js` — region-scoped
  child + IRR reads for government users. Aggregate-only progression (no
  per-criterion scores). Republic gov bypass via `req.user.isGlobalAccess`;
  region gov scoped via `req.user.regionScope`.

### New endpoints

```
GET  /api/v1/admin/children/:childId/irr               → adminGetChildIRR
GET  /api/v1/admin/children/:childId/irr/assessment    → adminGetAssessmentProgression
GET  /api/v1/admin/children/:childId/irr/goals         → adminGetGoals
POST /api/v1/admin/goal-periods/:id/sign               → irrSignGoalPeriod (reused)

GET  /api/v1/government/schools/:id/students           → listSchoolStudents
GET  /api/v1/government/children/:id                   → getChild
GET  /api/v1/government/children/:id/irr               → getChildIRR
GET  /api/v1/government/children/:id/irr/assessment    → getAssessmentProgression
GET  /api/v1/government/children/:id/irr/goals         → getGoals
```

All government routes guarded by `requireGovAccess('canViewStudents')`.

### New error codes (Cross-IRR-Visibility row in catalog)

- `CHILD_NOT_ACCESSIBLE` — child exists but is outside caller's school/region scope
- `SCHOOL_NOT_ACCESSIBLE` — school exists but is outside caller's region scope
- `CHILD_FETCH_FAILED` — DB failure on child read
- `STUDENT_LIST_FAILED` — DB failure on students list

Added to `audits/backend/i18n-error-codes.md` and all three i18n catalogs
(`ru.json`, `uz-latn.json`, `uz-cyrl.json`). `EXPECTED_CODE_COUNT` in the i18n
test bumped 236 → 240.

## Frontend

### Shared component

`shared/components/IRRSummary.jsx` — read-only IRR card with header, score
progression visualization, long-term goals, and quarterly periods list with
sign-status badges. Optional `onSignPeriod(period)` callback enables admin's
inline counter-sign. Consumed by:

- `admin/src/pages/ChildDetail.jsx` — IRR tab with `onSignPeriod` callback
  posting to `/admin/goal-periods/:id/sign` (toast on error, throws on failure
  so the component reverts UI optimistically).
- `government/src/pages/ChildDetail.jsx` — IRR card with NO `onSignPeriod`
  prop; renders read-only.

### Government child profile

- New page `government/src/pages/ChildDetail.jsx` at `/government/children/:id`.
- Hero strip + basic info card + IRRSummary (aggregate-only).
- Students rows are now clickable (Students.jsx wired with `useNavigate()`).

## Tests

- `backend/__tests__/controllers/adminIrr.test.js` — 10 tests covering
  role-gate, school-scope, and the three read endpoints.
- `backend/__tests__/controllers/governmentChild.test.js` — 9 tests covering
  republic vs region scope, child resolution, and IRR aggregate payload shape.
- `government/src/__tests__/DirectoryPages.test.jsx` — wrapped existing renders
  in `<MemoryRouter>` to support the new `useNavigate()` in Students.
- `backend/__tests__/i18n.test.js` — `EXPECTED_CODE_COUNT` bumped to 240.

## Test counts (post-change)

- Backend: 1510/1510 pass
- Admin: 165/165 pass
- Government: 124/124 pass
- Admin `check:locales`: PASS (UZ/EN/RU all complete)

## Files touched

```
NEW:
  backend/controllers/admin/adminIrrController.js
  backend/controllers/government/governmentChildController.js
  backend/__tests__/controllers/adminIrr.test.js
  backend/__tests__/controllers/governmentChild.test.js
  shared/components/IRRSummary.jsx
  government/src/pages/ChildDetail.jsx
  admin/src/pages/AdminIRR.jsx                       (renamed from ManagerIRR.jsx)
  admin/src/__tests__/pages/AdminIRR.test.jsx        (renamed from ManagerIRR.test.jsx)
  audits/redesign/CROSS-IRR-VISIBILITY.md            (this file)

MODIFIED:
  backend/routes/adminRoutes.js                       (+4 routes)
  backend/routes/governmentRoutes.js                  (+5 routes)
  backend/__tests__/i18n.test.js                      (EXPECTED_CODE_COUNT 236→240)
  backend/i18n/{ru,uz-latn,uz-cyrl}.json              (+4 codes each)
  audits/backend/i18n-error-codes.md                  (+CROSS-IRR-VISIBILITY section)
  admin/src/App.jsx                                   (route rename)
  admin/src/pages/ChildDetail.jsx                     (IRR tab + onSignPeriod)
  admin/src/locales/{uz,en,ru}/common.json            (childDetail.irr, signFailed; managerIrr→directorIrr)
  government/src/App.jsx                              (children/:id route)
  government/src/pages/Students.jsx                   (clickable rows)
  government/src/locales/{uz,en,ru}/common.json       (childDetail block)
  government/src/__tests__/DirectoryPages.test.jsx    (MemoryRouter wrap)

DELETED:
  admin/src/pages/ManagerIRR.jsx                      (→ AdminIRR.jsx)
  admin/src/__tests__/pages/ManagerIRR.test.jsx       (→ AdminIRR.test.jsx)
```
