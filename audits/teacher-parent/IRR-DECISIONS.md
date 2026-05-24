# ИРР Build-Phase Decisions — Source of Truth

**Date:** 2026-05-24
**Status:** Decisions of record for S5–S7 build phases.

> **IMPORTANT:** These decisions are DESIGN INTENT for the build phases. The loop must complete
> S1–S4 (audit + cleanup) on the EXISTING surface FIRST. Do NOT act on any ИРР model, migration,
> or controller until S4 (confirm-clean) is closed and the build plan (S6) is approved.

**Full spec:** `audits/teacher-parent/IRR-SPECIFICATION.md`
**This file:** decision summary — what is locked, what is resolved, what is pending external sign-off.

---

## Locked Scope

| Decision | Detail |
|---|---|
| ИРР is the centerpiece | All existing observations/goals/monitoring flow INTO or ALONGSIDE the ИРР. Dispositions per IRR-SPECIFICATION.md Part E. |
| Beta scope | FULL ИРР — all parts (header + assessment + goals + journals). No phase-gating. |
| Parent isolation | Parent is VIEW-ONLY on the ИРР. No parent write path to any ИРР model (IRR, AssessmentSession, AssessmentScore, LongTermGoal, GoalPeriod, ShortTermGoal, DailyMonitoringEntry, WeeklyMonitoringEntry, QuarterlyMonitoringEntry). Hard rule — no exceptions. |
| Data-driven design | Assessment criteria, skill-area categories, and journal checklist items stored as seed config. Checklist checkbox state stored as JSONB (`{ code: boolean }`). Changing an item when the standard is finalized = seed/data update, NOT a schema migration. |

---

## Resolved Open Questions (OQ-1 through OQ-12)

These were the open questions from IRR-SPECIFICATION.md Part G. The ones below are resolved by Max's decisions delivered 2026-05-24.

| OQ | Question | Resolution |
|---|---|---|
| OQ-1 | Score criterion 9 for all children, or only hearing-impaired? | **Score for ALL children. Max always = 68.** Parent chart = rising score out of 68. Note for partner: for non-hearing children, criterion 9 semantically overlaps criteria 6–8 — flag to ministry so it isn't a surprise during review. |
| OQ-3 | Who fills the quarterly monitoring journal? | **Manager/admin role ONLY.** Role gate on `QuarterlyMonitoringEntry`. Teachers cannot write quarterly entries. |
| OQ-4 | What do parents see in the assessment — per-criterion scores or aggregate only? | **Aggregate score progression ONLY.** No per-criterion detail surfaced to parents. Parent chart shows total score over time (e.g. 23/68 → 31/68 → 40/68). |
| OQ-5 | Is each daily/weekly journal entry mandatory, or can a day be skipped? | **Optional.** A skipped day = historical gap in the record, not a blocked UI. Teachers are not gated on prior entries. |
| OQ-6 | Daily/weekly journals — one record per facility, or one per child? | **One record per child per day/week.** `DailyMonitoringEntry` and `WeeklyMonitoringEntry` scope to `childId`. |
| OQ-8 | PDF export for ИРР — in beta scope? | **NOT in beta.** Deferred. No PDF generation in S7. |
| OQ-9 | Are "strengths/risk factors" in the needs assessment a hard gate before goals can be created? | **Advisory only, not a hard gate.** Teachers can proceed to goals without completing the strengths/risk-factors fields. |
| OQ-11 | Should long-term goals have a skill-area tag? | **No tag — free-form per standard.** Long-term goals are plain text (goal description + timeline). No skill-area enum applied to them. |
| OQ-12 | What happens to the ИРР when a child leaves the facility? | **Manager action, not automatic.** Manager archives the ИРР via an explicit "archive ИРР" action when child-leave is recorded. No auto-archive on child soft-delete. |

---

## Scoring (Locked)

| Rule | Detail |
|---|---|
| Direction | **INVERTED vs printed standard.** Software: 0 = worst/can't-do, 4 = best/can-do. Printed standard: 0 = best, 4 = worst. |
| Conversion | `softwareScore = 4 − printedScore` for all criteria. |
| Level text | Level-description TEXT follows the inverted index. software-4 shows printed column-0 text ("can do independently"). software-0 shows printed column-4 text ("cannot do"). |
| Auto-score | Deterministic SUM across all 17 criteria. NOT AI-generated. Max = 68 (17 criteria × 4). |
| Criteria 14–15 | Frequency-based behavioral indicators. Inversion logic identical to other criteria; semantics noted in spec. |
| Criteria 16–17 | Participation-based. Same inversion logic. |
| Seed direction | AssessmentCriteria seed stores level descriptions in SOFTWARE direction (index 0 = worst, 4 = best). The printed standard's column order must be reversed when seeding. |

---

## Partner / Ministry Items (External Sign-off Required — NOT Code Decisions)

These are NOT implementation-blocking (build can proceed with current design), but they require external confirmation before the feature ships to real users.

| Ref | Item | Status |
|---|---|---|
| F-1 (IRR-SPEC Part F §1) | **Scoring inversion — ministry acknowledgment.** The software direction (0=worst, 4=best) diverges from the printed standard (0=best, 4=worst). Ministry must acknowledge this divergence to avoid confusion during in-person reviews where staff compare software scores against physical tables. | ⬜ Pending |
| F-2 (IRR-SPEC Part F §2) | **Physical journal stamp regulation.** Regulation requires all journals to be stamped/signed by regional social protection administration, sewn, and numbered. Question: does a digital record satisfy this regulation, or must physical journals coexist? This affects the legal validity of digital signatures (OQ-7) and whether the platform is the system-of-record or a supplement. | ⬜ Pending |
| F-3 (IRR-SPEC Part F §3) | **DRAFT standard acknowledgment.** The source document is marked ЛОЙИҲА (DRAFT). Post-finalization changes to criteria, journal items, or scoring may require data migrations. Partner must confirm: is this draft the version used for beta evaluation, or will the final version be provided before launch? | ⬜ Pending |
| OQ-2 | **ПТПК conclusion validity duration.** Typical validity period for a ПТПК conclusion (sets long-term goal date range). Without this, the ИРР header `irr.startDate` → `goalPeriod.targetDate` range cannot be auto-populated. | ⬜ Pending |
| OQ-10 | **Quarterly parent-engagement section item count.** The quarterly monitoring journal appears to have 14 or 15 items in the parent-engagement section (image cut-off; full list not visible in source photos). Partner to confirm the complete item list. | ⬜ Pending |
| PL-009 extension | **ИРР terminology translations.** All new ru/uz strings for ИРР domain (criteria names, level descriptions, journal item labels, goal skill areas) are AI-generated / UNVERIFIED. Must be included in the PL-009-VERIFY professional review before beta. | ⬜ Pending (tracked in LOOP_PRE_LAUNCH_CHECKLIST.md) |

---

## Data Model Summary (for build reference)

10 new models to create in S5 (migrations + Sequelize models). Relationships:

```
Child
└── IRR (one active per child; unique constraint child+status≠archived)
    ├── AssessmentSession (5 per ИРР: intake, 3mo, 6mo, 9mo, 12mo)
    │   └── AssessmentScore (17 rows per session, one per criterion)
    ├── LongTermGoal (1–N per ИРР)
    │   └── GoalPeriod (quarterly review cycles)
    └── ShortTermGoal (1–N per ИРР, linked to skill area + optional long-term goal)

Child
├── DailyMonitoringEntry (one per child per calendar day)
└── WeeklyMonitoringEntry (one per child per ISO week)

School (facility-level)
└── QuarterlyMonitoringEntry (one per school per quarter; manager/admin only)

AssessmentCriteria (seed table — 17 rows, static)
```

JSONB fields:
- `DailyMonitoringEntry.checklistData`: `{ "D01": true, "D02": false, ... }` (27 keys)
- `WeeklyMonitoringEntry.checklistData`: `{ "W01": true, ... }` (18 keys)
- `QuarterlyMonitoringEntry.checklistData`: `{ "Q01": true, ... }` (~55 keys, 5 sections)

---

## Checklist: What Needs to Happen Before Build

- [ ] S1 audit complete (`audits/teacher-parent/01-audit.md`)
- [ ] S2 cleanup plan approved (`audits/teacher-parent/02-cleanup-plan.md`)
- [ ] S3 cleanup executed + S4 confirmed clean
- [ ] S6 feature plan approved (including ИРР build plan referencing this decisions file)
- [ ] OQ-2, OQ-10, F-1, F-2, F-3 sign-offs from partner/ministry (before shipping to real users)
- [ ] PL-009-VERIFY extended to cover all new ИРР terminology

---

*Generated from IRR-SPECIFICATION.md Part G resolutions and Max's decisions 2026-05-24.*

---

## AI REMOVAL (S5/S6 Build Phase — Government-Mandated)

**Decision:** LOCKED. Government flagged AI as able to mislead parents of disabled children. AI is removed from the parent portal.

**Reason:** Parents of children with disabilities are in a vulnerable position. AI-generated advice (even well-intentioned) may be misread as professional or clinical guidance. Government explicitly prohibited it.

**Scope (from investigation 2026-05-24):**

| Surface | Remove? | Why |
|---|---|---|
| `teacher/src/parent/pages/AIChat.jsx` | ✅ Yes | Parent-facing AI chatbot. Direct AI advice to parents. Government-flagged risk. |
| Route `/ai-chat` (parent subtree, App.jsx:67) | ✅ Yes | Mounts AIChat for parents. |
| Nav links in BottomNav.jsx + Sidebar.jsx (parent) | ✅ Yes | Both nav components link to `/ai-chat`. |
| `POST /parent/ai/chat` (parentRoutes.js:53) | ✅ Yes | Backend endpoint powering parent AI chat. Unmount entirely. |
| `teacher/src/parent/pages/AIWarnings.jsx` | ✅ Yes (dead page) | Imported and used at `/teacher/ai-warnings` (teacher subtree). Backend requires admin/government — teachers get 403. Dead page. Also linked from parent sidebar at `/ai-warnings` (path mismatch → hits NotFound). Both surfaces broken. Remove page + both nav/route references. |
| Route `/teacher/ai-warnings` (teacher subtree, App.jsx:93) | ✅ Yes | Teacher-mounted dead page (403 always). |
| Parent sidebar link to `/ai-warnings` (Sidebar.jsx:60) | ✅ Yes | Dead link → hits NotFound. |
| `backend/routes/aiWarningRoutes.js` + `aiWarningController.js` | ❌ Keep | Serves admin/government legitimately (analyze, view, resolve, notify). Not a parent-access concern. |
| `POST /teacher/ai/chat` (teacherRoutes.js:79) | ✅ Yes — remove in S5/S6 | Confirmed by Max 2026-05-24. Same concern as parent AI: AI misleading caregivers of disabled children extends to teachers. Unmount alongside parent AI teardown. |

**Data disposition:** No stored data — no AI chat model or table exists. The parent AI chat is stateless (request → Claude API → response). No migration needed for removal.

**Teardown standard:** This is a deliberate teardown, not `rm -rf`. When executed in S5/S6:
- No orphaned routes (removed from App.jsx + route files)
- No dead nav links (removed from Sidebar.jsx, BottomNav.jsx)
- No blank parent screens without explanation (pages removed cleanly, nav updates to exclude AI links)
- Backend endpoints fully unmounted from parentRoutes.js
- i18n keys for AI chat removed from locale files (uz/ru/en)
- No 404 landmines from old bookmarked URLs (React Router catches these with NotFound already, but confirm no hardcoded redirects)

**When executed:** S5 or S6 build phase — as part of the teacher+parent portal feature build, not in S3 cleanup. S3 cleanup does NOT touch AI surfaces.

**Teacher AI chat:** Also removed. Confirmed by Max 2026-05-24. Scope is ALL AI chat in the teacher+parent portal (both roles).
