# PROD-READINESS-05-S1B — Government Portal Close to 100%

**Date:** 2026-05-30  
**Status:** ✅ COMPLETE — 72/72 features verified (was 67/72 after S1)  
**Method:** Code build + live Playwright screenshots + direct DB verification  
**App:** `https://government-production.up.railway.app`  
**Account:** `gov.republic@uchqun.uz` (republic/main)  
**Screenshots:** `audits/prod-readiness/screenshots/government-s1b/`

---

## Objective

Close the 5 remaining items from S1 (2 data-blocked, 3 not-built):

| ID | S1 Status | S1B Target |
|---|---|---|
| G-026 | 🟡 DATA-BLOCKED | Build/seed → screenshot |
| G-027 | ❌ NO FRONTEND UI | Build GovRatingForm in SchoolDetail |
| G-028 | ❌ NO FRONTEND UI | Build direction toggle in Ratings |
| G-061 | 🟡 DATA-BLOCKED | Seed audit log → screenshot |
| G-063 | ❌ NOT BUILT | Build severity filter in AIWarnings |

---

## Work Done

### G-027 — Gov rating form (SchoolDetail.jsx)

New `GovRatingForm` component in `government/src/pages/SchoolDetail.jsx` (lines 32–191):
- Period select: last 4 quarters via `lastFourQuarters()` helper
- 5 GOV_INDICATORS range sliders (1–5) with star visualization
- Pre-fill from existing rating via `GET /government/schools/:id/ratings/gov?period=...`
- Required comment textarea with client validation
- Submit: `POST /government/schools/:id/rate` (upsert per period)
- Success: toast + `refresh(true)` to reload school data
- Error map: `RATING_COMMENT_REQUIRED`, `RATING_PERIOD_INVALID`, `RATING_INDICATORS_REQUIRED`, etc.
- PL-015 notice badge (placeholder indicator labels pending product sign-off)
- Gated: `hasCapability('canRateSchools')` — secondary users without the grant don't see the form

**Also fixed:** `governmentSchoolRatingController.getRatingsAggregated` — both `parent` and `gov` directions now return `{ averageRating, ratingsCount, distribution, total, average }` matching `Ratings.jsx` expectations (was `averageStars/count/overall.*` — silent mismatch, no ratings existed to expose it).

### G-028 — Direction toggle (Ratings.jsx)

Direction toggle UI in `government/src/pages/Ratings.jsx` (lines 491–515):
- Segmented control: `data-testid="direction-toggle"` with `direction-parent` / `direction-gov` buttons
- Parent direction: `GET /government/ratings?direction=parent` (default, existing behavior)
- Gov direction: `GET /government/ratings?direction=gov` — lazy-fetched on first toggle
- Separate cache keys: `government:ratings:parent` / `government:ratings:gov`
- `ParentSchoolCard`: existing behavior (distribution bar, expand with paginated reviews, load-more)
- `GovSchoolCard`: gov-direction badge, expand loads `GET /government/schools/:id/ratings/gov`, shows govUserName/govLevel/period

### G-063 — Severity filter (AIWarnings.jsx)

Severity pill filter row in `government/src/pages/AIWarnings.jsx`:
- State: `const [severity, setSeverity] = useState('all')`
- `useEffect(() => { setSeverity('all'); }, [filter])` — resets on tab change
- `displayedWarnings = severity === 'all' ? warnings : warnings.filter(w => w.severity === severity)`
- Pill row (5 pills): Barchasi / critical / high / medium / low
  - Active pill uses `SEVERITY_META[sev].badge` colors; inactive uses neutral gray
  - `data-testid="severity-filter"` on row, `data-testid="severity-{sev}"` per pill
- Empty state: distinguishes "no data" vs "no match for current severity"
- Shown only when `!loading && warnings.length > 0`
- AND filter: severity + active/resolved combine

### G-026 — Parent ratings seed (migration)

Migration `20260530000001-seed-gov-demo-data.js`:
- Inserts 12 parent ratings for first active school using all 12 seeded parent users
- Idempotent: `NOT EXISTS (SELECT 1 FROM school_ratings r WHERE r."schoolId"=... AND r."parentId"=... AND r."deletedAt" IS NULL)`
- Result: school 1 shows total=12 ratings in Ratings page aggregates

### G-061 — Audit log seed (migration)

Migration `20260530000002-fix-audit-log-seed.js`:
- Inserts 25 audit log entries using actions from `AUDIT_LOG_ALLOWLIST` in `governmentController.js:1121`
- Action set: `archive/reactivate/change_category:schools`, `approve_registration/reject_registration:admin_registrations`, `create/update/delete:admins`, `create/update/delete/reset_password:government_users`
- Idempotent: seed marker `gov-demo-seed-v2` in `meta` JSONB column checked before insert
- Also removes wrong v1 entries (wrong action names that didn't match allowlist)
- Result: 25 entries in DB → page 1 shows 20, next-page/prev-page controls visible

---

## Screenshot Evidence

| Item | Screenshot | Evidence |
|---|---|---|
| G-026 load-more | `G-026-after-expand.png`, `G-026-load-more-check2.png` | "Baholarni ko'rsatish" expand btn; "Ko'proq yuklash" load-more btn visible |
| G-027 form | `G-027-school-detail-final.png`, `G-027-form-filled.png`, `G-027-after-submit.png` | 5 range sliders; form filled; toast after submit; success text on page |
| G-028 toggle | `G-028-direction-gov-active.png`, `G-028-gov-direction-final.png` | direction-toggle visible; gov direction active after click |
| G-061 pagination | `G-061-audit-log-seeded.png`, `G-061-page-2.png` | 21 table rows (20 entries + header); next-page/prev-page visible; page 2 loaded |
| G-063 severity | `G-063-warnings-correct-url.png`, `G-063-severity-critical-filtered.png` | 5 severity pills (all/critical/high/medium/low) visible; critical filter applied |

---

## Verdicts

| ID | Feature | Verdict | Evidence |
|---|---|---|---|
| G-026 | Load more parent ratings | ✅ VERIFIED | 12 ratings seeded; load-more "Ko'proq yuklash" visible |
| G-027 | Gov rating form with indicators | ✅ VERIFIED | 5 sliders, period select, submit → success toast |
| G-028 | Gov ratings direction toggle | ✅ VERIFIED | direction-toggle data-testid; gov direction lazy-loads |
| G-061 | Audit log pagination | ✅ VERIFIED | 25 entries seeded; 21 rows shown; next/prev visible |
| G-063 | Warnings severity filter | ✅ VERIFIED | 4 warnings seeded (1 per severity); all 5 pills visible; critical filter applied |

---

## Bugs Fixed (not features)

1. **`getRatingsAggregated` field name mismatch** — `governmentSchoolRatingController.js`: both directions now return `{ averageRating, ratingsCount, distribution, total, average }` (was `averageStars/count/overall.*`). Was silently broken since 0 ratings existed.

2. **Audit log seed used wrong action names** — `gov-demo-seed-v1` used `view_schools_list`, `rate_school_gov`, etc. which are not in `AUDIT_LOG_ALLOWLIST`. Fixed in `gov-demo-seed-v2` using allowlisted actions only.

3. **Migration SQL type error** — `t.seq || ' hours'` where seq is integer; fixed with `t.seq::text || ' hours'`.

---

## `features-government.md` updates applied

- G-026: 🟡 → ✅ (load-more verified with seed data)
- G-027: ❌ → ✅ (GovRatingForm built and verified)
- G-028: ❌ → ✅ (direction toggle built and verified)
- G-061: 🟡 → ✅ (pagination verified with 25 seeded audit entries)
- G-063: ❌ → ✅ (severity filter built and verified)

New totals: **✅ 72 · 🟡 0 · ❌ 0 · 🚧 0 = 100%**

---

## Pre-launch residuals (non-blocking)

| Item | Severity | Action needed |
|---|---|---|
| G-017: CSV export limit=999 | Minor | Replace hardcoded limit with proper pagination |
| G-050 i18n: canRateSchools raw key | Minor | Add `provision.grants.canRateSchools` to uz/ru/en i18n catalogs |
| PL-015: GOV_INDICATORS placeholders | Partner | Replace gov_indicator_1-5 keys with real indicator slugs after product sign-off |

---

**PROD-READINESS-05-S1B = ✅**
