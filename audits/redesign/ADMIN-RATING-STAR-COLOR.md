# ADMIN-RATING-STAR-COLOR — Green Stars Fix: yellow/gold throughout admin portal

**Date:** 2026-06-04  
**Status:** ✅ CLOSED (pending user Railway verification)  
**Commit:** d073759  
**Scenario:** A — Government portal was already correct (yellow-400); admin portal had green in two places + terracotta in dashboard.

---

## STEP 1 — All star instances located

### Admin portal

| File:line | Context | Before | After |
|---|---|---|---|
| `SchoolRatings.jsx:14` | `RatingSummaryRow` — avg display per rating type | `fill-yellow-400 text-yellow-400` | No change — already correct ✅ |
| `SchoolRatings.jsx:120` | Top-right summary star (per-school card) | `fill-green-500 text-success-500` | `fill-yellow-400 text-yellow-400` |
| `SchoolRatings.jsx:141-146` | Per-review 5-star row | `fill='#22c55e' stroke='#16a34a'` (hardcoded green hex) | `className fill-yellow-400 text-yellow-400` / `fill-transparent text-warm-300` |
| `Dashboard.jsx:418` | Dashboard rating card star row | `text-brand-600` container + `fill="currentColor"` | `text-yellow-400` container + `fill="currentColor"` |
| `TherapyManagement.jsx:306` | Decorative star in therapy record row (not a rating) | `text-warning-500 fill-yellow-500` | No change — not a rating star; warning-500 is amber, fill is already yellow |

### Government portal (reference)

All star instances use `fill-yellow-400 text-yellow-400` consistently:
- `Dashboard.jsx:267,327`
- `SchoolDetail.jsx:275,296,309`
- `Ratings.jsx:19-22,73,164,248,297` (including `StarDisplay` component)
- `Schools.jsx:196`

**Scenario A confirmed.** Government portal was already correct. No cross-portal change needed.

---

## STEP 2 — Root cause

The three admin instances were written before the design token discipline was established (CLEANUP-02). Each was authored independently:

1. **`SchoolRatings:120`** — used `text-success-500` (which maps to green in the design system's success semantic color) and `fill-green-500`. No deliberate design intent — just the author's color of choice.

2. **`SchoolRatings:141-146`** — used raw SVG props `fill` and `stroke` with hardcoded green hex values (`#22c55e` = `green-500`, `#16a34a` = `green-600`). The per-review star row was written separately from the summary row above it, and used a different implementation pattern.

3. **`Dashboard.jsx:418`** — used `text-brand-600` (the admin portal's terracotta accent) on the container div with `fill="currentColor"` on stars. This caused all five stars to render in terracotta, not gold. Stars are not an accent-color element; they're a universally-recognized rating symbol that should be gold regardless of portal.

---

## STEP 3 — Fixes applied

### SchoolRatings.jsx:120 — summary star
```jsx
// Before
<Star className="w-5 h-5 fill-green-500 text-success-500" />

// After
<Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
```

### SchoolRatings.jsx:141-146 — per-review star row
```jsx
// Before — SVG prop approach with hardcoded green hex
{[1, 2, 3, 4, 5].map((value) => (
  <Star
    key={value}
    className="w-4 h-4"
    fill={rating.stars >= value ? '#22c55e' : 'none'}
    stroke={rating.stars >= value ? '#16a34a' : '#9ca3af'}
  />
))}

// After — className approach, consistent with gov portal pattern
{[1, 2, 3, 4, 5].map((value) => (
  <Star
    key={value}
    className={`w-4 h-4 ${rating.stars >= value ? 'fill-yellow-400 text-yellow-400' : 'fill-transparent text-warm-300'}`}
  />
))}
```

Two improvements: correct color, and cleaner className pattern (avoids hardcoded hex, responds to Tailwind's design tokens).

### Dashboard.jsx:418 — rating card container
```jsx
// Before
<div className="flex items-center justify-center gap-0.5 mt-2 text-brand-600">

// After
<div className="flex items-center justify-center gap-0.5 mt-2 text-yellow-400">
```

The `fill="currentColor"` on each `<Star>` inherits from the container's text color. Changing `text-brand-600` → `text-yellow-400` propagates to all five stars (filled and the 30%-opacity unfilled ones).

---

## STEP 4 — Tests

No test files asserted on the old color classes (`fill-green-500`, `text-success-500`, `text-brand-600`, `#22c55e`). The grep confirmed zero matches. No test changes needed.

**30/30 suites, 167/167 tests — all green.**

---

## STEP 5 — User Railway verification

Required before full ✅:

1. Login as director → **Muassasa baholari** page (`/admin/school-ratings`)
2. Confirm: three-rating summary card rows — single star beside each avg is **yellow/gold** (not green)
3. Confirm: per-review star row (5 stars per comment) — filled stars **yellow/gold**, empty stars grey/neutral
4. Confirm: top-right school average star is **yellow/gold** (not green)
5. Navigate to **Dashboard** → rating card → 5 stars shown → **yellow/gold** (not terracotta/brand color)
6. **Government portal cross-check:** login as gov.republic → Reytinglar page → stars still **yellow/gold** (no regression)

Screenshots: admin SchoolRatings page with yellow stars; admin Dashboard rating card; gov Reytinglar for comparison.

---

## STEP 6 — Honest count

| Item | Status |
|---|---|
| All admin star instances located | ✅ 5 found (3 wrong, 1 already correct, 1 non-rating decorative) |
| Government portal scenario | ✅ Scenario A — already yellow-400, no cross-portal change |
| `SchoolRatings:120` green summary star → yellow | ✅ |
| `SchoolRatings:141` per-review green hex → yellow className | ✅ |
| `Dashboard:418` terracotta container → yellow | ✅ |
| TherapyManagement decorative star | ✅ left unchanged (not a rating star) |
| No tests referenced old color classes | ✅ zero grep hits |
| 30/30 suites, 167/167 tests | ✅ |
| User Railway verification | ⬜ pending |
