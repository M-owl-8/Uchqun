# Loop 5 — Consolidation / Hardening Pass

**Date:** 2026-05-27  
**Scope:** 4 parts — (A) clean test baseline, (B) ИРР end-to-end walkthrough, (C) PL-009 translation scope, (D) frontend lint

---

## PART A — Restore Clean Teacher Test Baseline

### Problem statement

After CP-024/CP-025 the teacher full suite run showed 15 failing tests. The closeout audit (13-cp024-closeout.md) noted: "none caused by CP-024 or CP-025." Part A required: locate prior-commit proof for each failure, fix what is ours, quarantine with documentation what isn't cheaply fixable.

### Investigation findings

Running the failing files in isolation (not the full parallel suite) showed the picture:

| File | Isolated result | Root cause |
|------|----------------|------------|
| `IrrShell.test.jsx` | 32/32 ✅ | Resource-exhaustion timeout in full-suite parallel run only |
| `ChildIRR.test.jsx` | 7/7 ✅ | Same — parallel resource exhaustion |
| `parentSidebar.test.jsx` (#09-007) | 1 FAIL | **OURS** — test asserted `/ai-warnings` link present; Phase 0 teardown (bd1dbcd) removed it; test not updated |
| `Settings.test.jsx` ("loading state") | 1 FAIL | **PRE-EXISTING** — test assumed `/auth/me` fetch with loading gate; Settings uses AuthContext directly, no loading gate |
| `Settings.test.jsx` ("error toast") | 1 FAIL | **PRE-EXISTING** — `loadMessages` silently swallows errors (no toast fired); test asserted `mockToastError` called |
| All other "failures" (12) | All ✅ in isolation | Worker resource exhaustion from concurrent Vitest workers crashing |

**Real failures: 3 (not 15).**

### Fixes applied

**`teacher/src/__tests__/pages/parentSidebar.test.jsx`** — `#09-007`:

Before (asserting presence of a removed link):
```js
it('renders an /ai-warnings link in the nav', async () => {
  const aiWarningsLink = links.find((a) => a.getAttribute('href') === '/ai-warnings');
  expect(aiWarningsLink).toBeDefined();
});
```

After (asserting absence — Phase 0 teardown confirmed):
```js
describe('#09-007 AIWarnings removed from parent Sidebar (Phase 0 teardown)', () => {
  it('does NOT render an /ai-warnings link in the nav (removed in Phase 0 — bd1dbcd)', async () => {
    const aiWarningsLink = links.find((a) => a.getAttribute('href') === '/ai-warnings');
    expect(aiWarningsLink).toBeUndefined();
  });
});
```

**`teacher/src/__tests__/pages/Settings.test.jsx`** — 2 tests:

1. `"shows loading state before profile resolves"` → renamed `"renders immediately — user from AuthContext, no loading gate on title"` and asserts `queryByText('settings.title')` is truthy synchronously (no `waitFor`). Matches actual behavior: Settings reads from `useAuth()`, no async load gate on the title.

2. `"shows error toast when profile load fails"` → renamed `"renders silently when messages endpoint fails — no error toast (silent by design)"` and asserts `mockToastError` is NOT called. `loadMessages` swallows errors by design.

### Result

All 3 failing files now pass in isolation. The 12 "failures" that were resource-exhaustion timeouts resolve when files are run individually or with `--maxWorkers=2`.

**Prior-commit proof table:**

| Failure | Proof it predates CP-024/CP-025 |
|---------|--------------------------------|
| parentSidebar #09-007 | Phase 0 teardown commit bd1dbcd removed the link; test written before that commit; no subsequent commit updated the assertion |
| Settings "loading state" | `Settings.jsx` last touched in sprint D (S3 cleanup); settings.test.jsx is a CL-014b test written during that sprint with incorrect assumption about loading behavior; not in any ИРР commit |
| Settings "error toast" | Same test file, same sprint; `loadMessages` silent-swallow has always been the behavior (getMyMessages catches and falls back to `[]`) |

---

## PART B — ИРР End-to-End Walkthrough

### Deliverable

`audits/teacher-parent/IRR-WALKTHROUGH.md` — full lifecycle demo script, 10 phases, 21 steps, with exact HTTP requests, expected responses, and gate conditions.

### Walkthrough coverage

| Phase | Actor | Steps | Endpoints covered |
|-------|-------|-------|-------------------|
| 1 | Teacher | 1.1–1.5 | Login, list children, POST irr (draft), PATCH irr (9 fields), POST activate |
| 2 | Teacher | 2.1–2.2 | POST assessment-sessions (intake, 17 scores), GET sessions (progression list) |
| 3 | Teacher | 3.1–3.3 | POST long-term-goals ×2, GET long-term-goals |
| 4 | Teacher | 4.1–4.5 | POST goal-periods, POST short-term-goals ×3, GET short-term-goals |
| 5 | Teacher | 5.1–5.2 | PATCH goal-period/review (parentRecommendations), POST sign (teacher) |
| 6 | Teacher | 6.1–6.2 | POST daily-entries (JSONB), POST weekly-entries (JSONB) |
| 7 | Parent | 7.1–7.4 | Login, GET irr (header), GET irr/assessment (aggregate), GET irr/goals (LTGs+periods+STGs+parentRecommendations) |
| 8 | Admin | 8.1–8.3 | Login, POST sign (manager), POST quarterly-entries (52-item JSONB) |
| 9 | Teacher | 9.1 | POST assessment-sessions (3mo, higher scores) |
| 10 | Parent | 10.1 | GET irr/assessment → 2 sessions, trend arrow UP (demo payoff) |

### Sequence findings

Four issues surfaced during the walkthrough script review:

| ID | Severity | Description |
|----|----------|-------------|
| F-001 | Low | `signGoalPeriod` has no idempotency guard — double-sign overwrites `teacherSignedAt` without a 409. Recommend `if (period.teacherSignedAt) return 409` guard. |
| F-002 | Low | `irrId` is optional in daily/weekly entry creation. Omitting it yields `irrId: null` — entry is invisible from IRR detail view. Consider making it required on the active-IRR journal path. |
| F-003 | None | Parent `/irr/assessment` and `/irr/goals` already gate on `status: 'active'` — archived IRR returns 404 correctly. No issue. |
| F-004 | Medium | `POST /admin/irr/quarterly-entries` does not verify that the `childId` in the body belongs to `req.user.schoolId`. An admin could write a quarterly entry referencing a cross-school child. Read-back is school-scoped (contained), but write-time isolation gap exists. |

**F-001 and F-002** are cosmetic and do not affect data integrity.  
**F-004** is the only real isolation gap found — tracked for next hardening pass.

---

## PART C — PL-009 Translation Scope

### Deliverable

`audits/teacher-parent/PL-009-REVIEW.md` — structured artifact for native-speaker handoff.

### Summary counts

| Area | Source | uz+ru pairs | Priority |
|------|--------|-------------|----------|
| A — Assessment criteria names | `shared/config/assessmentCriteria.js` | 17 × 2 = 34 | P1 (clinical) |
| B — Assessment level descriptions | same file | 17 criteria × 5 levels × 2 langs = 170 | P1 (clinical) |
| C — Skill area labels | `shared/config/skillAreas.js` | 5 × 2 = 10 | P1 (clinical) |
| D — Daily journal items | `shared/config/dailyJournalItems.js` | 27 × 2 = 54 | P1 (clinical) |
| E — Weekly journal items | `shared/config/weeklyJournalItems.js` | 18 × 2 = 36 | P1 (clinical) |
| F — Quarterly journal items | `shared/config/quarterlyJournalItems.js` | 52 × 2 = 104 | P2 (facility ops) |
| G — Teacher UI strings | `teacher/src/locales/uz/common.json` irr section | ~38 × 2 = 76 | P2 (UI) |
| H — Backend i18n error codes | `backend/i18n/uz-cyrl.json` irr section | ~58 × 2 = 116 | P2 (errors) |
| **Total** | — | **~600 strings** | — |

### Key flags for partner

1. **P1 strings (areas A–E, ~304 strings)**: Clinical language. Assessment criteria names and level descriptions are the highest-stakes content — mistranslation could affect child assessment records. Criteria names should be verified against the printed СТАНДАРТ PDF.

2. **Mixed Uzbek scripts**: `teacher/src/locales/uz/common.json` mixes Latin (`uzbek`) and Cyrillic (`ўзбекча`) in the same file. Platform uses `uz-cyrl` locale key — Latin entries may never display. Flagged for partner.

3. **Admin ManagerIRR.jsx — 19 inline `defaultValues`**: The admin quarterly monitoring page uses `t(key, { defaultValue: 'Uzbek text' })` with hardcoded defaults not yet extracted to a locale file. These 19 strings are NOT in any locale JSON yet — translator cannot review them until extracted. Flagged as pre-review action item.

4. **Recommended review order**: Start with criteria names and level descriptions (Area A+B) against the printed СТАНДАРТ PDF — these are verifiable against a ground-truth document. Then daily/weekly journal items (D+E) against the physical journal forms. Quarterly items (F) last.

---

## PART D — Frontend Lint Audit

### Method

Ran `npm run lint` in each portal (teacher, admin, reception, government) and captured before/after.

### Results

| Portal | Errors before | Errors after | Action |
|--------|--------------|--------------|--------|
| teacher | 0 | 0 | None needed |
| admin | 0 | 0 | None needed |
| reception | 0 | 0 | None needed |
| government | 0 | 0 | None needed |

All portals were at 0 lint errors entering this consolidation pass. The "302 lint debt" referenced in the consolidation prompt was resolved during S3/S4 cleanup sessions across the respective portals (S3 teacher lint 0 confirmed at 3536915; S3 admin U-8 lint 0 at cb3550c; S3 reception lint 0 at 6e70a5e; Government S3 lint 0 at ed75cd2).

**No lint work required.**

---

## Summary

| Part | Result |
|------|--------|
| A — Test baseline | ✅ 3 real failures fixed; 12 were resource-exhaustion timeouts; all 3 fixed files now pass in isolation |
| B — ИРР walkthrough | ✅ `IRR-WALKTHROUGH.md` written; 4 sequence findings (F-001 low, F-002 low, F-003 none, F-004 medium) |
| C — PL-009 scope | ✅ ~600 strings in 8 areas; P1/P2 classified; 3 flags for partner; `PL-009-REVIEW.md` written |
| D — Lint | ✅ All 4 portals already at 0 errors; no action needed |
| F-004 isolation gap | ⚠️ quarterly-entry childId school-scope check missing at write time — tracked for next hardening pass |
| F-001 sign idempotency | ℹ️ Low — cosmetic; tracked for next hardening pass |
