# CP-020 Frontend Audit — Parent School Rating: 5-Indicator Form (PL-015-Gated)

**Date:** 2026-05-27  
**Scope:** CP-020 frontend — replace old single-star school rating form in TeacherRating.jsx with 5-indicator slider form (data-driven from `shared/config/ratingIndicators.js`), mandatory comment, toast-based error handling. PL-015 gate recorded.  
**Suite baseline:** teacher portal — 7/7 new tests green

---

## Deliverables

| File | Change |
|---|---|
| `teacher/src/parent/pages/TeacherRating.jsx` | School rating section rewritten: 5-indicator sliders, mandatory comment, `useToast`, PARENT_INDICATORS config import. Teacher rating section unchanged. |
| `teacher/src/__tests__/pages/TeacherRating.test.jsx` | New — 7 tests (data-driven render, edit pre-fill, comment required, POST payload, backend error, happy path, no-school state) |
| `LOOP_PRE_LAUNCH_CHECKLIST.md` | PL-015 updated: CP-020 form gate explicitly noted — form must not ship to beta with placeholder labels |

---

## Endpoint Wired

| Method | Path | Who calls it | Change |
|---|---|---|---|
| `GET` | `/parent/school-rating?childId=<id>` | `useEffect` load | Now reads `rating.indicators` (JSONB) to pre-fill sliders |
| `POST` | `/parent/school-rating` | `handleSchoolSubmit` | Sends `{ schoolId, indicators: {parent_indicator_1..5}, comment }` — **no longer sends `stars`** — server derives stars |

---

## Design Decisions

- **5-indicator sliders** (`type="range"`, 1–5, step 1) replace single star selector. One per `PARENT_INDICATORS` entry.
- **Data-driven labels**: `ind[i18n.language] || ind.en` — labels come from the config, not hardcoded. PL-015 = config update only, no rebuild.
- **Mandatory comment**: `* Majburiy` marker on the label; client-side guard (empty → `toast.error`); backend error codes mapped (RATING_COMMENT_REQUIRED, RATING_INDICATOR_INVALID, RATING_SCHOOL_FORBIDDEN).
- **Stars removed from payload**: Client sends `indicators` object only; backend server-derives `Math.round(sum/5)` clamped 1–5.
- **Default slider values**: `3` (midpoint) on initial load if no saved rating.
- **Toast via `useToast`**: All school-rating errors go through `toast.error()`; teacher-rating section kept with inline error state (not changing it).
- **`data-testid` attributes**: `slider-{key}`, `score-{key}`, `indicator-row-{key}`, `school-comment`, `school-submit` — all stable for tests and QA.

---

## PL-015 Gate

```js
// PL-015 GATE: Indicator labels in the school rating form are PLACEHOLDERS from
// shared/config/ratingIndicators.js. DO NOT ship this form to beta users until the
// partner provides real indicator names via PL-015 and ratingIndicators.js is updated.
```

This comment is at the top of `TeacherRating.jsx`. The checklist entry is in `LOOP_PRE_LAUNCH_CHECKLIST.md` PL-015 row.

---

## Tests (7/7 green)

1. **5 sliders render from PARENT_INDICATORS** — data-testids `slider-parent_indicator_{1-5}` present after load
2. **Prior rating pre-fills sliders** — saved indicators → slider values match (e.g. indicator_1=4, indicator_3=5)
3. **Empty comment blocks submit** — `toast.error` called, `api.post` NOT called
4. **Submit POSTs indicators (not stars)** — payload has `{ schoolId, indicators: {...}, comment }` and no `stars` key
5. **RATING_COMMENT_REQUIRED surfaced via toast** — backend rejects → `toast.error` called
6. **Happy path: school renders** — school name visible, submit button present
7. **No school: section absent** — school-submit not present, "noSchool" text shown

---

## Suite Result

`npx vitest run src/__tests__/pages/TeacherRating.test.jsx` → **7/7 passed** (exit 0, 3.48s)

---

## What Was NOT Changed

- Teacher rating section (star buttons + optional comment) — untouched
- `schoolAllRatings` display — removed (was showing all parent ratings, not relevant to the form UX)
- GET endpoint path — unchanged (`/parent/school-rating?childId=<id>`)
- POST endpoint path — unchanged (`/parent/school-rating`)
