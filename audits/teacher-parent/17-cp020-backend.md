# CP-020 Backend Audit — Two-Direction School Rating

**Date:** 2026-05-27  
**Scope:** CP-020 backend implementation (parent + government school rating, 5-indicator structure, mandatory comment, region-scoped government endpoints)  
**Suite baseline:** 128 suites / 1332 tests — all green

---

## Deliverables

| Artifact | Status |
|---|---|
| `backend/models/GovernmentSchoolRating.js` | ✅ Created |
| `backend/migrations/20260527000001-create-government-school-rating.js` | ✅ Created |
| `backend/migrations/20260527000002-update-school-ratings-cp020.js` | ✅ Created |
| `shared/package.json` ("type": "module") | ✅ Created |
| `shared/config/ratingIndicators.js` | ✅ Exists (PARENT_INDICATORS + GOV_INDICATORS, 5 keys each) |
| `backend/controllers/parent/parentSchoolRatingController.js` | ✅ Rewritten |
| `backend/controllers/government/governmentSchoolRatingController.js` | ✅ Created |
| `backend/validators/parentRatingValidator.js` | ✅ Updated |
| `backend/models/SchoolRating.js` | ✅ Updated (indicators JSONB, comment NOT NULL) |
| `backend/models/index.js` | ✅ Updated (GovernmentSchoolRating registered + associations) |
| `backend/config/govCapabilities.js` | ✅ Updated (canRateSchools added) |
| `government/src/config/govCapabilities.js` | ✅ Updated (drift guard sync) |
| `backend/routes/governmentRoutes.js` | ✅ Updated (3 new routes) |
| `backend/__tests__/controllers/parentSchoolRating.cp020.test.js` | ✅ Created |
| `backend/__tests__/controllers/governmentSchoolRating.test.js` | ✅ Created |
| `backend/__tests__/parentSchoolRating.test.js` | ✅ Rewritten for new API |
| `backend/__tests__/controllers/parentSchoolRatingController.test.js` | ✅ Updated (TP-05 revert tests) |
| `audits/backend/i18n-error-codes.md` | ✅ 12 RATING_* codes added |
| `backend/i18n/ru.json` | ✅ 12 RATING_* translations added |
| `backend/i18n/uz-latn.json` | ✅ 12 RATING_* translations added |
| `backend/i18n/uz-cyrl.json` | ✅ 12 RATING_* translations added |

---

## Model: GovernmentSchoolRating

- Table: `government_school_ratings`
- Columns: `id` (UUID PK), `schoolId` (FK→schools RESTRICT), `govUserId` (FK→users SET NULL), `period` (STRING 20, e.g. "Q2-2026"), `stars` (INTEGER 1–5, server-derived), `indicators` (JSONB), `comment` (TEXT NOT NULL), timestamps, paranoid
- Unique index: `(schoolId, govUserId, period)` WHERE `deletedAt IS NULL` — one rating per gov user per school per quarter
- Associations: School.hasMany / belongsTo, User.hasMany / belongsTo

## Model update: SchoolRating

- Added `indicators` JSONB (allowNull: true — nullable for legacy rows without migration backfill)
- Changed `comment` to `allowNull: false`
- Migration backfills `'—'` for any existing NULL comments before setting NOT NULL

---

## Parent Rating Controller Changes

- **Defense-in-depth role check** at controller body (`req.user.role !== 'parent'` → 403) in addition to route middleware
- **Mandatory comment:** `!comment || typeof comment !== 'string' || comment.trim() === ''` → 400 `RATING_COMMENT_REQUIRED`
- **schoolId required:** `!schoolId` → 400 `RATING_SCHOOL_ID_REQUIRED`
- **5-indicator validation:** all 5 `PARENT_INDICATORS` keys required, each an integer 1–5
- **TP-05 2-part deny-on-null fix:** `if (!parentSchoolId || parentSchoolId !== school.id)` → 403 `RATING_SCHOOL_FORBIDDEN`
  - Before (3-part): `if (parentSchoolId && parentSchoolId !== school.id)` — null schoolId bypassed the guard entirely
  - After (2-part): null OR mismatch → both denied. Null-bypass IDOR class eliminated.
- **Stars derivation:** server-side `Math.round(sum_of_5_scores / 5)`, clamped 1–5. Client sends scores, never stars.
- **BACKEND-012 shape** on all responses

---

## Government Rating Endpoints

### POST /government/schools/:id/rate
- Guard: `requireGovAccess('canRateSchools')` + controller role check
- Validates: comment (required), period (regex `/^Q[1-4]-\d{4}$/`), 5 GOV_INDICATORS keys each 1–5
- Region-scoped: `School.findOne({ where: { id, ...regionWhere(req) } })` — region-A gov gets 404 for region-B schools
- Upserts GovernmentSchoolRating (update if exists for same schoolId/govUserId/period)
- Error codes: RATING_COMMENT_REQUIRED, RATING_PERIOD_INVALID, RATING_INDICATORS_REQUIRED, RATING_INDICATOR_INVALID, RATING_SCHOOL_NOT_FOUND (covers region mismatch), RATING_CREATE_FAILED

### GET /government/schools/:id/ratings/gov
- Guard: `requireGovAccess('canViewRatings')`
- Region-scoped school check, returns all GovernmentSchoolRatings for the school with summary (count, averageStars)

### GET /government/ratings?direction=parent|gov  (replaces GET /government/ratings)
- Defaults to `direction=parent` — **backward-compatible** with existing government portal ratings page
- `direction=gov`: aggregates GovernmentSchoolRating with region-scoped school filter
- `direction=parent`: aggregates SchoolRating with region-scoped school filter (was `getRatingsStats`)
- Region isolation: all school lookups use `regionWhere(req)` — republic-level gets all, regional gov gets own region only

---

## Isolation Tests

### parentSchoolRating.cp020.test.js (10 tests)
1. mandatory comment null → 400 RATING_COMMENT_REQUIRED
2. mandatory comment whitespace → 400 RATING_COMMENT_REQUIRED
3. 5 indicators absent → 400 RATING_INDICATORS_REQUIRED
4. indicator out of range (6) → 400 RATING_INDICATOR_INVALID
5. missing indicator key → 400 RATING_INDICATOR_INVALID
6. **TP-05 null schoolId → 403** (null-bypass guard proven)
7. **TP-05 cross-school attempt → 403** (SCHOOL_A user → SCHOOL_B → denied)
8. stars derived correctly: [4,3,5,2,4] → stars=4
9. happy path creates new rating
10. happy path updates existing rating

### governmentSchoolRating.test.js (7 tests)
1. **Region isolation: region-A gov → region-B school → 404** (regionWhere called with { regionId: 'region-a' })
2. **Republic-level gov → any school → 200** (no regionId filter applied)
3. Same-region gov → same-region school → 200
4. bad period format → 400 RATING_PERIOD_INVALID
5. missing comment → 400 RATING_COMMENT_REQUIRED
6. upsert: existing rating → update called, not create
7. **Aggregation region-scope**: direction=gov uses GovernmentSchoolRating scoped to region; direction=parent uses SchoolRating not GovernmentSchoolRating

---

## TP-05 Revert Tests (parentSchoolRatingController.test.js)

- `null-bypass guard`: null schoolId must produce 403, not create a rating
- `schoolId required`: null schoolId in body must produce 400
- Sanity: valid same-school rating with comment + indicators → 200

---

## i18n Coverage

12 new RATING_* codes added to catalog and all 3 locale files:

| Code | Trigger |
|---|---|
| RATING_FORBIDDEN | Non-parent tried to rate school |
| RATING_COMMENT_REQUIRED | comment null/empty/whitespace |
| RATING_SCHOOL_ID_REQUIRED | schoolId missing in body |
| RATING_INDICATORS_REQUIRED | indicators null/not-object |
| RATING_INDICATOR_INVALID | Any indicator out of 1–5 or missing key |
| RATING_SCHOOL_NOT_FOUND | School.findByPk or region-scoped findOne returned null |
| RATING_SCHOOL_FORBIDDEN | Parent's schoolId null or ≠ target school (TP-05) |
| RATING_PERIOD_INVALID | period doesn't match /^Q[1-4]-\d{4}$/ |
| RATING_DIRECTION_INVALID | direction param ≠ 'parent' or 'gov' |
| RATING_CHILD_NOT_FOUND | childId in query not found for parent |
| RATING_CREATE_FAILED | Unhandled DB error on upsert |
| RATING_FETCH_FAILED | Unhandled DB error on read |

`node backend/scripts/verify-i18n.js` → 207 catalog codes, all 3 locales ✅

---

## Lint

`npm run lint` → 0 errors, 2 pre-existing warnings (receptionParentController.js:12, irrController.js:235 — not from CP-020 code)

---

## Deferred

- PL-015: Indicator display labels need UX sign-off before frontend-beta. Backend uses placeholder keys (`parent_indicator_1`…`5`, `gov_indicator_1`…`5`) — acceptable for backend phase.
- Railway migration promotion: deferred to deliberate deploy step. Proven locally against local Postgres via docker-compose.
- Teacher-portal form for school rating: blocked on this backend step (now unblocked).
- CP-022 backend: next step (recipientLevel + escalatedFromId + routing, owner=Option-1).
