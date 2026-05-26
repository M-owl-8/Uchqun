# S5 PHASE 3e — Parent ИРР View-Only Surface (CP-025)

**Commit:** TBD (pending full suite)
**Date:** 2026-05-26
**Status:** ✅ COMPLETE

---

## 1. What was built

Phase 3e adds the parent-facing ИРР view (`ChildIRR.jsx`) to the parent portal:

1. **Progression section** — lists all assessment sessions (aggregate: totalScore/maxPossibleScore), trend arrows (↑ ↓ →), colour-coded progress bars, session labels (Дастлабки баҳолаш / 3 ойдан кейин / etc.). Score framed as progress toward 68, not a grade.
2. **Long-term goals section** — read-only list of LTGs with skill area label (from SKILL_AREAS config).
3. **Periods section** — each goal period as a card containing its STGs. Per STG:
   - STG text (read-only)
   - Teacher review note (if present)
   - **Parent recommendations** (`parentRecommendations`) — prominently surfaced in amber highlight box (testid: `parent-rec-{id}`)
   - Discussion date (if present)
4. **Empty states** — gentle 404 state when no ИРР exists yet; retry-able error state for network failures.
5. **Nav wiring** — `/irr` route added to parent App.jsx; `TrendingUp` icon + nav entry added to Sidebar (between Profile and Activities) and BottomNav (between Profile and Rating).

---

## 2. OQ / design decisions

| Decision | Rule |
|---|---|
| OQ-4 AGGREGATE only | Parent sees totalScore/maxPossibleScore per session. No per-criterion breakdown. API returns no criterion data. UI never calls per-criterion endpoints. |
| No journals shown | Daily/weekly monitoring journals are teacher-internal. NOT shown to parents. |
| No write path | View-only: no forms, no inputs, no submit buttons in the success render path. |
| 404 = gentle empty | IRR not yet created → `irr-not-found` state with supportive message, NOT an error banner. |
| FRAMING | Score presented as progress toward 68 (not as a "grade"). Trend arrows only between sessions. Rising = development visible. |

---

## 3. Files created / modified

| File | Change |
|---|---|
| `teacher/src/parent/pages/ChildIRR.jsx` | **NEW** — parent IRR page |
| `teacher/src/__tests__/pages/ChildIRR.test.jsx` | **NEW** — 7 tests |
| `teacher/src/App.jsx` | Added `import ChildIRR` + `<Route path="irr" ...>` under parent routes |
| `teacher/src/parent/components/Sidebar.jsx` | Added `TrendingUp` import + `/irr` nav entry (position 2, between Profile and Activities) |
| `teacher/src/parent/components/BottomNav.jsx` | Added `TrendingUp` import + `/irr` nav entry (between Profile and Rating) |

---

## 4. API endpoints called (ONLY parent read endpoints)

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/parent/children/:childId/irr` | IRR header — 404 → gentle empty state |
| `GET` | `/parent/children/:childId/irr/assessment` | Assessment sessions (aggregate: totalScore/maxPossibleScore) |
| `GET` | `/parent/children/:childId/irr/goals` | `{ longTermGoals, periods, shortTermGoals }` |

**Confirmed: NO teacher endpoints called. NO per-criterion endpoints called. NO write path (no POST/PUT/PATCH/DELETE).**

---

## 5. data-testid attributes

| testid | Element |
|---|---|
| `irr-loading` | Spinner div during initial load |
| `irr-not-found` | Gentle empty state when IRR doesn't exist (404) |
| `irr-load-error` | Error state with retry button |
| `child-irr-page` | Root div for loaded content |
| `progression-section` | Assessment sessions container |
| `session-row-{id}` | Each session row (score bar + trend arrow) |
| `ltg-section` | Long-term goals container |
| `ltg-row-{id}` | Each LTG row |
| `periods-section` | Periods container |
| `period-card-{id}` | Each period card |
| `stg-row-{id}` | Each STG row |
| `review-card-{id}` | Teacher review note (if present) |
| `parent-rec-{id}` | Parent recommendations (PROMINENT — amber highlight) |
| `discussion-date-{id}` | Discussion date (if present) |

---

## 6. Test results (7 tests, all green)

**File:** `teacher/src/__tests__/pages/ChildIRR.test.jsx`

| Test | Assertion |
|---|---|
| renders progression section with session rows after load | `session-row-s1`, `session-row-s2`, `progression-section` all present |
| surfaces parentRecommendations prominently in the STG row | `parent-rec-stg1` has `Уйда ҳар куни китоб ўқинг` content |
| shows gentle empty state on 404 — not an error page | `irr-not-found` shown; `irr-load-error` absent |
| surfaces cold-load network error as irr-load-error state | `irr-load-error` shown; `irr-not-found` absent |
| renders goals view-only — no form, no inputs, no submit buttons | `document.querySelector('form')` = null; no `<input>`, no `<textarea>`, no buttons |
| calls ONLY the 3 parent read endpoints — no teacher or per-criterion URLs | 3 GET calls, all `/parent/children/c1/irr*`; no `/teacher/`, no `/criteria` |
| STG rows are nested inside their parent period card | `period-card-p1.contains(stg-row-stg1)` = true |

---

## 7. Cross-portal items

- **CP-025** — ✅ BUILT (this phase). Parent ИРР view-only. 3 parent read endpoints wired. AGGREGATE only (OQ-4). No per-criterion, no journals, no write path.
- **CP-024** — ⬜ PLANNED-NOT-BUILT. Manager (раҳбар = admin/director role) ИРР surface: goal-period signature UI + quarterly facility-level monitoring. Admin portal task.

---

## 8. What is NOT shown to parents (enforced in UI, also enforced in API)

- Per-criterion scores (OQ-4 — API excludes them at attribute level)
- Daily monitoring journal (27 items)
- Weekly monitoring journal (18 items)
- Quarterly monitoring journal (manager/admin only — OQ-3)
- Any write or edit capability (no forms, no submit)
