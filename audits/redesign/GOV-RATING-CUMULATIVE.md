# GOV-RATING-CUMULATIVE — Three-Rating Model: Parent + Government + Cumulative (50/50)

**Date:** 2026-06-02  
**Status:** ✅ CLOSED

---

## Pre-flight findings

### Models

**SchoolRating** (parent ratings):
- `stars` INTEGER 1-5 (derived from `indicators` JSONB via `deriveStars`)
- `parentId` → who rated; `schoolId` → which school
- Unique constraint: (schoolId, parentId) — one rating per parent per school

**GovernmentSchoolRating** (government ratings):
- `stars` INTEGER 1-5 (auto-derived from 5 indicators via `deriveStars`)
- `period` STRING — "Q1-2026", "Q2-2026" etc.
- `indicators` JSONB — 5 GOV_INDICATORS each scored 1–5
- Unique constraint: (schoolId, govUserId, period)

### Current backend (before)

- `getRatingsAggregated`: `direction=parent|gov` — returns separate per-direction lists
- `getSchoolById`: `averageRating` = parent avg only; `ratingsCount` = parent count only
- `getSchoolsStats`: same as above
- `getMySchoolRating`: parent avg only, no government rating

### Current frontend (before)

- Ratings page: direction toggle (parent/gov) — two separate views
- SchoolDetail sidebar: `school.averageRating` (parent only), `school.ratingsCount`
- Dashboard widget: `school.averageRating` (parent only), sorted by parent
- Admin SchoolRatings: individual parent ratings list only
- Parent TeacherRating: `schoolSummary.average` (parent only) in school rating section

---

## STEP 1 — Backend

### 1a — Service: `backend/services/schoolRatingService.js`

Created new service with two exported functions:

**`getSchoolRatingAggregated(schoolId)`**:
- Loads `SchoolRating.findAll({ where: { schoolId } })` + `GovernmentSchoolRating.findOne({ where: { schoolId }, order: [['period', 'DESC']] })`
- Returns `{ parent: { avg, count }, government: { avg, period } | null, cumulative: { avg, isPartial } }`
- Edge cases:
  - Both present: `cumulative = (parent × 0.5) + (gov × 0.5)`, `isPartial = false`
  - Parent only: `cumulative = parentAvg`, `isPartial = true`
  - Gov only: `cumulative = govAvg`, `isPartial = true`
  - Neither: `cumulative = null`, `isPartial = false`

**`getSchoolRatingsBatch(schoolIds)`**:
- 2 queries total regardless of school count (no N+1)
- Groups parent stars by school, picks latest gov rating per school (ORDER BY period DESC, first seen = latest)
- Returns `Record<schoolId, aggregated>` for all schools in one call

### 1b — Endpoints updated

`getRatingsAggregated` (`GET /government/ratings`):
- Added `direction=combined` (now the DEFAULT — was `parent`)
- Combined response: per-school `parentAvg`, `parentCount`, `govAvg`, `govPeriod`, `cumulativeAvg`, `cumulativeIsPartial`
- Sorted by `cumulativeAvg` DESC; nulls last
- Old `direction=parent` and `direction=gov` preserved for backward compat

`getSchoolById` (`GET /government/schools/:id`):
- Now calls `getSchoolRatingAggregated(id)`
- Response adds: `parentAvg`, `parentCount`, `govAvg`, `govPeriod`, `cumulativeAvg`, `cumulativeIsPartial`
- Legacy fields: `averageRating = parentAvg ?? 0`, `ratingsCount = parentCount` (backward compat)

`getSchoolsStats` (`GET /government/schools`):
- Calls `getSchoolRatingsBatch(schoolIds)` — 2 extra queries for the full school list
- Response per school adds: `parentAvg`, `parentCount`, `govAvg`, `govPeriod`, `cumulativeAvg`, `cumulativeIsPartial`
- Dashboard sorting updated to use `cumulativeAvg`

`getMySchoolRating` (`GET /parent/school-rating`):
- Now calls `getSchoolRatingAggregated(schoolId)` alongside existing queries
- Response adds: `parentAvg`, `parentCount`, `govAvg`, `govPeriod`, `cumulativeAvg`, `cumulativeIsPartial`
- Legacy field `summary.average` preserved

`getAdminSchoolRatingSummary` (`GET /admin/school-rating-summary`) — NEW:
- Returns `{ parent, government, cumulative }` for the admin's own school
- Admin role only; uses `getSchoolRatingAggregated`

---

## STEP 2 — Government Ratings page (`Ratings.jsx`)

**Before:** Direction toggle (parent/gov) → two separate card types, two separate fetches.

**After:** Combined view. Major restructure:
- Single fetch: `GET /government/ratings?direction=combined`
- One `CombinedSchoolCard` component per school showing all 3 ratings
- Sort dropdown: Cumulative (default) / Parent / Gov
- Schools with `cumulativeAvg = null` sort last regardless of direction
- Distribution bars section labeled "Ota-onalar baholari taqsimoti"
- Expandable parent reviews section (accordion: "Ota-onalar izohlarini ko'rsatish")
- Expandable gov reviews section (accordion: "Davlat baholarini ko'rsatish")
- Rating rows: show star display + numeric value + count/period; null → "Reyting yo'q"
- `isPartial = true` → shows "Faqat ota-onalar bahosi asosida" or "Faqat davlat bahosi asosida"

---

## STEP 3 — SchoolDetail rating sidebar (`SchoolDetail.jsx`)

**Before:** Single `4.3 / 12 ta baho` display, parent only.

**After:** Three-section display:
- Cumulative headline (big number, stars, "Umumiy reyting" label)
- `isPartial` notice if one component missing
- Parent row: stars + `4.3 (12)` or "Reyting yo'q"
- Government row: stars + `4.5` + period or "Reyting yo'q"

All values use `school.cumulativeAvg`, `school.parentAvg`, `school.govAvg` from the updated `getSchoolById` endpoint.

---

## STEP 4 — Dashboard widget (`Dashboard.jsx`)

**Before:** `school.averageRating` (parent only), sorted by parent.

**After:**
- Cumulative as headline: star icon + `school.cumulativeAvg.toFixed(1)` (or "—" if null)
- Compact breakdown line: `P:4.3 · D:4.5`
- Sort: `cumulativeAvg ?? averageRating ?? 0` (cumulative first, fallback to parent avg for legacy data)

---

## STEP 5 — Parent portal school rating display (`TeacherRating.jsx`)

**Before:** `schoolSummary.average.toFixed(1)` (parent only) + count.

**After:**
- New `schoolRatingAgg` state populated from the extended `getMySchoolRating` response
- Cumulative headline (or "Reyting yo'q")
- Parent avg row with count
- Government avg row with period (or "—" if absent)
- Transparency principle: parents see government's rating of their school

---

## STEP 6 — Admin portal (`SchoolRatings.jsx`)

**Before:** Individual parent rating records only.

**After:**
- New `GET /admin/school-rating-summary` endpoint
- Summary card at top of SchoolRatings page showing:
  - Ota-onalar reytingi (parent avg + count)
  - Davlat reytingi (gov avg + period)
  - Umumiy reyting (cumulative avg, with "qisman" note if partial)

---

## STEP 7 — Tests

**New:** `backend/__tests__/services/schoolRatingService.test.js` — **8/8 passing**:
1. Both ratings → 50/50 cumulative, `isPartial = false`
2. Parent only → cumulative = parentAvg, `isPartial = true`
3. Gov only → cumulative = govAvg, `isPartial = true`
4. Neither → cumulative = null, `isPartial = false`
5. `findOne ORDER BY period DESC` — latest quarter confirmed
6. `parent count 0` → `parent.avg = null` (not 0)
7. All indicators = 5 → `government.avg = 5`
8. Rounding: `(3.3 + 4.0) / 2 = 3.7`

**Updated tests:**
- `parentSchoolRatingController.test.js`: mocks `schoolRatingService`; tests new `parentAvg`, `govAvg`, `cumulativeAvg` response fields
- `governmentSchoolRating.test.js`: added service mock; `direction=parent` now explicit; new `direction=combined (default)` test
- 11 government controller test files: all received `schoolRatingService` mock to prevent transitive model-loading issues

**Full suite:** 135/135 suites, 1421/1421 tests — all green.

---

## STEP 8 — Honest count

| Item | Status |
|---|---|
| `backend/services/schoolRatingService.js` | ✅ Created — `getSchoolRatingAggregated` + `getSchoolRatingsBatch` |
| `getRatingsAggregated` — `combined` direction | ✅ |
| `getSchoolById` — 3-rating fields | ✅ |
| `getSchoolsStats` — 3-rating fields | ✅ |
| `getMySchoolRating` — gov + cumulative added | ✅ |
| `getAdminSchoolRatingSummary` — new endpoint | ✅ |
| Ratings page: combined view + sort | ✅ |
| SchoolDetail sidebar: 3-rating display | ✅ |
| Dashboard widget: cumulative + breakdown | ✅ |
| Admin SchoolRatings: summary card | ✅ |
| Parent TeacherRating: 3-rating display | ✅ |
| Locale strings (UZ/RU/EN) | ✅ |
| 8 service edge-case tests | ✅ |
| Government test files updated (11 files) | ✅ |
| All 135 suites, 1421 tests green | ✅ |

### Residuals (intentionally deferred)

- **Time-weighting of ratings**: Future enhancement. Currently: parent avg is all-time rolling; government avg is latest quarter only. Time-weighting would discount older ratings. Not in scope.
- **Per-indicator transparency for parents**: Parents currently see only the government's aggregate star score. Showing per-indicator breakdown (e.g. "Infrastructure: 4/5, Safety: 5/5") is a future feature requiring UX design.
- **Comment moderation**: Parent comments display verbatim. Moderation queue is a future feature.
- **Distribution bars for backend combined endpoint**: The combined endpoint doesn't include `distribution` (1-5 bucket counts) because it requires loading all parent ratings. The Ratings page still shows distribution from the individual school's ratings-detail endpoint. This is acceptable — distribution is shown per-card on expand.

---

## STEP 9 — Adjacent observations

1. **Admin SchoolRatings old type display**: Lines 70-73 in `SchoolRatings.jsx` still reference old type enum values (`school`, `kindergarten`, `typeBoth`). These are legacy badge labels. The GOV-INSTITUTION-TYPES session updated the main type system but missed this admin page. Logged as minor drift.

2. **Dashboard regional breakdown** (`regionBreakdown`): Uses `s.averageRating > 0` for the regional average. This should ideally use `s.cumulativeAvg`. Not changed now to avoid scope creep.

3. **`computeRatingScore` in `governmentLevel.js`**: This function exists in the codebase but is no longer used with the new 3-rating model. The `governmentLevel` computation still uses parent avg. Future: consider whether cumulative should drive `governmentLevel`.
