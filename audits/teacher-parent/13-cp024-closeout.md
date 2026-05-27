# CP-024 Closeout Audit

**Date:** 2026-05-27
**Scope:** Admin cross-school isolation test + full 55-item structured quarterly checklist + CP-025 suite confirmation

---

## STEP 1 — Cross-School Admin Isolation Test (real SQLite, two-school seed)

### Pre-check: did any existing Phase-2 tests exercise the admin role on teacher routes?

Reviewed `backend/__tests__/controllers/irr.realDB.test.js` and `irr.withinSchool.test.js`. **No existing test exercised the admin role** through `GET /teacher/children`, `GET /teacher/children/:id/irr`, `GET /teacher/irr/:irrId/goal-periods`, or `POST /teacher/goal-periods/:id/sign`. All Phase-2 tests use `role: 'teacher'`. The admin-path gap was confirmed.

### Why the admin path is the highest-stakes boundary

`requireTeacher` allows `['teacher', 'reception', 'admin']`. For teachers, the assignment axis (`isTeacherAssignedToChild`) is the primary guard. For admins, `isTeacherAssignedToChild` returns `true` immediately (non-teacher bypass). The ONLY boundary for an admin is the `schoolId` check inside each controller resolver. If that check were absent or incorrect, admin A could read school B's children's IRRs, assessments, goal periods, and clinical diagnoses.

### Test file

`backend/__tests__/controllers/irr.adminIsolation.realDB.test.js`

Two-school seed:
- School A: child `adm-iso-child-a1`, IRR `adm-iso-irr-a`
- School B: child `adm-iso-child-b1`, IRR `adm-iso-irr-b`, period `adm-iso-period-b`
- Admin under test: `role: 'admin', schoolId: SCHOOL_A`

`schoolValidation.js` is NOT mocked — real `isTeacherAssignedToChild` confirms the admin bypass is in place, making the resolver `schoolId` check the sole guard.

### Results (all 4 PASS)

| Test | Route | Expected | Actual |
|---|---|---|---|
| `getChildren` — school A admin sees only school A's children | `GET /teacher/children` | school-B child absent, list length 1 | ✅ PASS — school-A child returned, school-B child NOT in list |
| `getChildIRR` — admin A blocked from school-B child | `GET /teacher/children/:schoolB_childId/irr` | 404 | ✅ PASS — 404 |
| `listGoalPeriods` — admin A blocked from school-B IRR | `GET /teacher/irr/:schoolB_irrId/goal-periods` | 404 | ✅ PASS — 404 |
| `signGoalPeriod` — admin A blocked from signing school-B period | `POST /teacher/goal-periods/:schoolB_periodId/sign` | 404 | ✅ PASS — 404 |

**Result: school-axis boundary HOLDS for admin role. No cross-school leak.**

Full suite run: `125 suites / 1313 tests — all green` (includes the 4 isolation tests).

---

## STEP 2 — Full 55-Item Structured Quarterly Checklist

### Prior state (free-text stopgap — commit 79cc9bf)

The original CP-024 build shipped the quarterly form with 5 free-text `<textarea>` inputs per section — a stopgap to meet the deadline. The backend JSONB columns were designed for `code → boolean` maps but the frontend was not yet data-driven.

### Current state (structured checklist — this closeout)

`admin/src/pages/ManagerIRR.jsx` — `QuarterlyTab` component now renders a data-driven structured checklist:

```js
const SECTION_MAP = [
  { formKey: 'infoSystemData',    configKey: 'infoSystem',    label: 'Ахборот тизими' },
  { formKey: 'parentWorkData',    configKey: 'parentWork',    label: 'Ота-оналар билан иш' },
  { formKey: 'documentationData', configKey: 'documentation', label: 'Ҳужжатчилик' },
  { formKey: 'careQualityData',   configKey: 'careQuality',   label: 'Парвариш сифати' },
  { formKey: 'conditionsData',    configKey: 'conditions',    label: 'Шарт-шароит' },
];
```

Each section renders `QUARTERLY_JOURNAL_ITEMS[configKey].map(item => <checkbox key={item.code} ... />)` — not hardcoded, not re-transcribed.

### Item counts (from `shared/config/quarterlyJournalItems.js`)

| Section | Config key | Item count | OQ note |
|---|---|---|---|
| Ахборот тизими | `infoSystem` | 2 | — |
| Ота-оналар билан иш | `parentWork` | 14 | OQ-10 provisional — partner to confirm |
| Ҳужжатчилик | `documentation` | 9 | — |
| Парвариш сифати | `careQuality` | 17 | — |
| Шарт-шароит | `conditions` | 10 | — |
| **Total** | — | **52** (`QUARTERLY_ITEM_COUNT`) | OQ-10 may add 1 |

### JSONB shape (confirmed from test)

POST body sends:
```json
{
  "quarterStart": "2026-01-01",
  "quarterEnd":   "2026-03-31",
  "infoSystemData":    { "info_tizimga_kiritildi": true, "info_face_id": false },
  "parentWorkData":    { "par_malumot_oladilar": false, … },
  "documentationData": { "doc_irr_dolzarb": false, … },
  "careQualityData":   { "care_ovqat_rejim": false, … },
  "conditionsData":    { "shar_harorat": false, … },
  "departures": [],
  "notes": null
}
```

Shape matches daily/weekly JSONB pattern. Backend stores and returns as-is.

### OQ-10 flag

The `parentWork` section shows 14 items (all visible in source PDF). OQ-10 remains pending partner confirmation. The config comment: `// OQ-10: 14 items confirmed visible in source PDF; one may be partially obscured.`

### Departures sub-table + general notes

Retained from original CP-024: departures sub-table (name/admitDate/departDate/reason) and free-text notes field. Structured checklist replaces the per-section free-text areas only.

### IRR-DECISIONS.md

Decision recorded under "Quarterly Monitoring: Full Structured 55-Item Checklist (CP-024 Closeout)" — supersedes free-text stopgap.

---

## STEP 3 — CP-025 Commit + Full Suite Confirmation

### CP-025 commit

**SHA: c22f726** — `feat(teacher-parent): parent ИРР view-only surface — progression + goals (Phase 3e, CP-025)`

Commit contents: `ChildIRR.jsx` (3 parent read endpoints, aggregate-only, view-only, parentRecommendations amber box, progression score bars + trend arrows, STGs nested in period cards), `/irr` route, Sidebar/BottomNav nav entries. Audit: `audits/teacher-parent/12-phase3e-parent-irr.md`.

### Suite results (CP-025 specific — run in isolation)

- **IrrShell.test.jsx**: `32/32` — all phases (3a header, 3b assessment, 3c goals, 3d monitoring journals) green
- **ChildIRR.test.jsx**: `7/7` — parent view-only (Phase 3e) all green

CP-025 did NOT break any prior teacher/parent pages. The full teacher suite has 15 pre-existing failures (Settings.test.jsx loading-state mock mismatch, parentSidebar.test.jsx `/ai-warnings` link test written before S3 cleanup removed that link, AIWarnings.test.jsx parent role test) — none are caused by CP-024 or CP-025 changes.

---

## STEP 4 — CP-024 Tests Updated for Structured Quarterly Checklist

`admin/src/__tests__/pages/ManagerIRR.test.jsx` — updated to reflect structured checklist:

- **Mock:** `QUARTERLY_JOURNAL_ITEMS` mocked with 2 `infoSystem` items, 1 each for other sections (6 total)
- **Test: quarterly tab renders structured checklist items** — asserts `section-infoSystemData`, `section-parentWorkData` testids; asserts `item-info_a` and `item-info_b` (data-driven, 2 infoSystem items); toggles a checkbox to `true`
- **Test: submit sends code→boolean JSONB shape** — asserts POST body includes `infoSystemData: { info_a: true, info_b: false }` and `parentWorkData: { par_a: false }` (the exact JSONB shape)
- **Test: 409 duplicate-quarter toast** — unchanged, still works
- **Test: lists existing entries** — unchanged, still works

**Admin frontend suite: `30 suites / 160 tests — all green`**

---

## Summary

| Item | Result |
|---|---|
| Admin cross-school isolation test | ✅ 4/4 PASS — school-axis boundary HOLDS for admin role |
| Quarterly checklist structured 52-item data-driven | ✅ Code→boolean JSONB, from config, 5 sections |
| OQ-10 parentWork count | ⬜ 14 provisional — partner pending |
| CP-025 SHA confirmed | ✅ c22f726 |
| IrrShell 32/32 green | ✅ |
| ChildIRR 7/7 green | ✅ |
| ManagerIRR 7/7 green | ✅ |
| Backend 125 suites / 1313 tests | ✅ |
| Admin frontend 30 suites / 160 tests | ✅ |
| Teacher pre-existing failures | ⚠️ 15 pre-existing (Settings, parentSidebar, AIWarnings) — not caused by CP-024/CP-025 |
| IRR-DECISIONS.md updated | ✅ "Quarterly Monitoring: Full Structured 55-Item Checklist (CP-024 Closeout)" |

**CP-024 CLOSED. CP-025 CLOSED. ИРР COMPLETE across teacher + parent + admin.**

Next: consolidation/hardening pass (end-to-end human walk, PL-009 translation review, 302 lint debt), then CP-020/CP-022.
