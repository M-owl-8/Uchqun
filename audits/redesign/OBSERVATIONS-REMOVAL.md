# OBSERVATIONS-REMOVAL

Removed the entire **kuzatuv / ChildObservation** feature from the platform.

## Why

The feature was broken end-to-end and had no consumers:

1. **The "Yangi kuzatuv" button never worked.** `QuickObservation.jsx` posted
   `{ childId, goalId, outcome, note }` but the backend required `{ childId,
   observationDate, domain, note (≥10 chars) }`. Every submission returned
   400; the catch block was a `// TODO: show error toast` so the failure was
   silent. Production data confirms the feature was never used by real
   teachers in this session.

2. **Parents never saw observations.** No `/parent/observations` endpoint, no
   UI in the parent portal. The feature was teacher-only with admin
   read-only access — but the only place admin could view it was a tab on
   the admin's `ChildDetail` page.

3. **IRR replaced the use case.** The clinical record-keeping need
   (developmental-domain tracking, urgent-severity escalation) is now
   covered by IRR DailyMonitoringEntry / WeeklyMonitoringEntry /
   QuarterlyMonitoringEntry — those flow into the 12-month IRR roadmap and
   are part of the dual-signature workflow. Keeping a parallel
   "ChildObservation" feature with its own broken UI was carry-on dead
   weight.

4. **Cleanup is hygienic.** Less surface area → fewer dead i18n codes,
   fewer dead routes, fewer dead tabs, fewer locale keys to translate.
   Quality bar is "no messy, no dead code, everything aligned" — kuzatuv
   was the largest offender.

## What was removed

### Backend

- **Model**: `backend/models/ChildObservation.js` (deleted)
- **Controller**: `backend/controllers/observationController.js` (deleted)
- **Migration**: new `20260609000001-drop-child-observations.js` drops the
  `child_observations` table. Down migration recreates table shape for dev
  rollback — production rollback does not restore deleted rows.
- **Model registry**: removed from `backend/models/index.js` (import,
  array, associations, audit hook, re-export)
- **Restore endpoint**: removed `restoreObservation` from
  `admin/adminRestoreController.js` + `PUT /admin/observations/:id/restore`
  from `adminRoutes.js`
- **Parent data export**: removed observations block from
  `parent/parentDataExportController.js`
- **Routes removed**:
  - `POST /api/v1/teacher/observations`
  - `GET  /api/v1/teacher/observations/recent`
  - `GET  /api/v1/teacher/children/:id/observations`
  - `GET  /api/v1/admin/children/:id/observations`
  - `PUT  /api/v1/admin/observations/:id/restore`
- **i18n catalog**: 11 `OBSERVATION_*` codes removed from
  `audits/backend/i18n-error-codes.md` + `ru.json` + `uz-latn.json` +
  `uz-cyrl.json`. `EXPECTED_CODE_COUNT` 240 → 229.

### Teacher portal

- **Component**: `teacher/src/components/QuickObservation.jsx` (deleted)
- **FAB removed** from `TeacherMobileTopBar.jsx` and `TeacherTopNav.jsx`
- **Dashboard.jsx**: removed `OutcomePill`, `ObservationRow`,
  observations fetch, "Bugungi kuzatuvlar" stat tile, "So'nggi kuzatuvlar"
  section. Mobile + desktop. Stats grid shrank 3-col → 2-col.
- **DailyReflection.jsx**: removed `ObservationItem`, observations fetch,
  "Today's observations" section. Layout simplified.
- **teacher/ChildDetail.jsx**: removed `OutcomeChip`, `GoalHeatmap`, `obs`
  tab, "Yangi kuzatuv" hero CTA, hero "newObservation" link.
- **Locales** (`teacher/src/locales/{uz,en,ru}/common.json`): removed
  `quickObs` block, `dashboard.{observationsToday,recentObservations,
  noObservations,noObservationsMobile,observationStat,vsYesterday}`,
  `childDetail.{tab.obs,heatmap.last12,button.newObservation,badge.
  assistNeeded}`, `reflection.{observationsToday,noObservations,positive,
  needsHelp}`, `layout.newObservation`, `nav.observations`, IRR Goal
  card's `recents.last12`.

### Admin portal

- **admin/ChildDetail.jsx**: removed observations tab, fetch, list,
  `DOMAIN_COLORS`, `SEVERITY_COLORS`, default tab now `irr`
- **Locales**: removed `childDetail.observations`, `childDetail.
  noObservations` from uz/en/ru
- **Test**: removed 2 observation-tab tests from
  `admin/src/__tests__/pages/ChildDetail.test.jsx`

### Tests

- **Deleted**: `backend/__tests__/controllers/observationController.test.js`
  (~31 tests)
- **Cleaned**: observation mocks/refs removed from
  `restore.test.js`, `parentDataExport.test.js`,
  `withinSchool.widerClass.test.js`, `journalController.test.js`,
  `integration/auditLogPipeline.test.js`, `childAuditHook.test.js`
- **Deleted**: T-046 (QuickObservation FAB) from `wave2-teacher.spec.js`
- **Trimmed**: A-057 (observations tab) from `wave4-admin.spec.js`
- **Trimmed**: QuickObservation modal test from
  `def007-cold-load-proof.spec.js`

### What stayed

- **EmotionalMonitoring** — unrelated feature; the word "kuzatuv" appears
  in some of its labels because that's the generic Uzbek word.
- **`Activity.observation`** — free-text field on Activity model (the
  daily activities log entered by teachers via the Activities page). Same
  word, different table.
- **IRR's quarterly review `placeholder.observations`** — placeholder text
  on the IRR quarterly review form; different feature.
- **`bulkMonitoring.title: "Kunlik kuzatuv — barcha bolalar"`** — IRR daily
  bulk fill; different feature.
- **`isTeacherAssignedToChild`** — used by attendance, journal, activity,
  meal, IRR. Generic helper, not observation-specific.

## Test counts (post-change)

- Backend: **1479 / 1479 pass** (was 1510; -31 deleted obs tests)
- Admin: **163 / 163 pass** (was 165; -2 deleted obs-tab tests)
- Admin `check:locales`: **PASS**
- Teacher `check:locales`: **PASS**
- Teacher Vitest baseline: 138 failures pre-existing on clean tree
  (`act(...)` env issue, unrelated to this work)

## Production data caveat

When Railway picks up this commit, the new migration runs and drops
`child_observations`. Any rows present in prod at that moment are lost.
This is the intended outcome of "delete cleanly" — no zombie tables, no
stale data.

If Railway prod has high-value clinical observations, do not deploy until
they are exported. We have no evidence of such data (the form has been
non-functional since CROSS-IRR-VISIBILITY surfaced the bug).
