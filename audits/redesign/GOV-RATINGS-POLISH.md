# GOV-RATINGS-POLISH — Single-color discipline + persistent sidebar scroll

**Date:** 2026-06-02  
**Status:** ✅

---

## Pre-flight findings

### Ratings.jsx color issues

**Distribution bars (`STAR_COLORS`, lines 11–17 + 54–59):**
```js
const STAR_COLORS = {
  5: 'bg-green-500',
  4: 'bg-blue-500',   // ← blue
  3: 'bg-yellow-500', // ← yellow
  2: 'bg-orange-500', // ← orange
  1: 'bg-red-500',    // ← red
};
```
Five different hues on bars that represent measurement, not category. Violates single-accent discipline.

**Rank badges (`SchoolCardHeader`, lines 317–325):**
```jsx
school.rank === 1 ? 'bg-yellow-100 text-yellow-700 border-2 border-yellow-400'  // gold
: school.rank === 2 ? 'bg-gray-100 text-gray-700 border-2 border-gray-400'     // silver
: school.rank === 3 ? 'bg-orange-100 text-orange-700 border-2 border-orange-400' // bronze
: 'bg-brand-100 text-brand-600'                                                  // green
```
Trophy-podium metaphor applied to a ranking system. Three extra color families not in the DNP palette.

**School building icon (lines 331–333):** `bg-brand-100 / text-brand-600` — already correct, no change needed.

### Layout.jsx scroll issue

Current pattern: `min-h-screen relative overflow-hidden bg-paper` outer + `fixed inset-y-0 left-0 w-64` sidebar + `lg:pl-64` main. Body scrolls; sidebar stays via `position: fixed`.

While technically functional, the body-scroll pattern depends on `position: fixed` not being broken by ancestor transforms (a common footgun). The cleaner Option A pattern — `h-screen overflow-hidden` container with `flex-1 overflow-y-auto` main — uses scroll context isolation instead.

---

## STEP 1 — Color discipline

### Distribution bars

Removed `STAR_COLORS` constant entirely. All 5 bar rows now use `bg-brand-600` (#4F7B4E — the DNP brand green). Visual differentiation is carried by:
- Leading number ("5", "4", "3", "2", "1")
- Gold star icon (unchanged — `fill-yellow-400`, single icon)
- Bar width proportional to count
- Trailing count number

Zero-count bars remain the gray track with no fill. No hue variation between rows.

### Rank badges

Before (3 special cases + 1 fallback):
```jsx
school.rank === 1 ? 'bg-yellow-100 text-yellow-700 border-2 border-yellow-400'
: school.rank === 2 ? 'bg-gray-100 text-gray-700 border-2 border-gray-400'
: school.rank === 3 ? 'bg-orange-100 text-orange-700 border-2 border-orange-400'
: 'bg-brand-100 text-brand-600'
```

After (uniform for all ranks):
```jsx
className="w-12 h-12 rounded-lg flex items-center justify-center font-bold text-lg bg-white border border-gray-200 text-gray-900"
```

All rank badges: white background, single neutral border, dark ink text. Rank is communicated by the number inside, not by the badge color.

---

## STEP 2 — Layout scroll pattern (Option A)

Changed `government/src/components/Layout.jsx`:

| Before | After |
|---|---|
| `min-h-screen relative overflow-hidden bg-paper` (outer) | `flex h-screen overflow-hidden bg-paper` (outer) |
| `hidden lg:block fixed inset-y-0 left-0 w-64 z-40` (sidebar wrapper) | `hidden lg:flex lg:flex-col flex-shrink-0 w-64 z-40` (sidebar flex sibling) |
| `lg:pl-64 relative z-10 pt-14 lg:pt-0` (main) | `flex-1 min-w-0 overflow-y-auto pt-14 lg:pt-0` (main — own scroll context) |

The sidebar is now a flex sibling in a fixed-height container. It can never scroll off the viewport because the container is exactly `h-screen` and the sidebar fills its column via `lg:flex-col`.

The main content area has `overflow-y-auto` — it scrolls independently within its own context. The sidebar is unaffected.

**Mobile behavior preserved:**
- Fixed top bar: still `fixed top-0 left-0 right-0 h-14 z-40` — viewport-fixed, unaffected by `overflow-hidden` on the container (`position: fixed` always escapes overflow clipping)
- Mobile overlay: `fixed inset-0 bg-black/50 z-40` — same
- Mobile drawer: `fixed inset-y-0 left-0 w-64 z-50` — same, slides in above content

`min-w-0` on the main content ensures flex item doesn't overflow when content is wide (a known flex gotcha).

---

## STEP 3 — Verification

### Code verification

```
grep 'STAR_COLORS|bg-green-500|bg-blue-500|bg-orange-500|bg-red-500|bg-yellow-500|border-yellow-400|border-orange-400' Ratings.jsx
→ No matches found ✅
```

All rainbow classes removed.

```
grep 'bg-brand-600' Ratings.jsx → line 47: "bg-brand-600" (the single bar fill) ✅
grep 'bg-white border border-gray-200 text-gray-900' Ratings.jsx → rank badge line ✅
grep 'h-screen overflow-hidden' Layout.jsx → outer container ✅
grep 'overflow-y-auto' Layout.jsx → main content ✅
grep 'fixed inset-y-0 left-0 w-64' Layout.jsx → mobile drawer (preserved) ✅
```

### Test suite

Government portal: **17/17 suites, 120/120 tests — all passing.**

Ratings page has no dedicated test file. Layout changes don't affect component tests (components render in isolation without Layout in tests).

---

## STEP 4 — Adjacent observations

1. **Admin/reception portals:** Both likely have similar `min-h-screen overflow-hidden` layouts. If they have the same scroll behavior, they need the same fix. Out of scope for this session — flagged as follow-up.

2. **Admin ratings display:** The admin portal (`admin/src/pages/SchoolProfile.jsx`) shows ratings but uses a different component. If it uses colored bars, a similar fix should apply. Not checked in this session.

3. **Baholarni yashirish toggle:** The expand/collapse behavior of comments is inside the `overflow-y-auto` main container. Expanding a school card correctly expands the scroll area — the toggle works correctly with the new scroll pattern.

4. **Other multi-color badge patterns:** `dashboard.activeWarnings` already fixed (AI prefix removal). No other rainbow badge patterns found in the government portal during this pass.

---

## STEP 5 — Honest count

| Item | Status |
|---|---|
| Distribution bars unified to brand-600 green | ✅ |
| Rank badges normalized to neutral white/border/gray | ✅ |
| School icon palette (already correct) | ✅ confirmed, no change |
| Sidebar persistent — Option A (flex + overflow-y-auto) | ✅ |
| Mobile viewport (fixed elements preserved) | ✅ code-confirmed |
| Government tests: 17/17, 120/120 | ✅ |
| Other government pages: no regressions (tests green) | ✅ |

**Latent issues flagged:**
- Admin/reception portals may have same `min-h-screen` scroll pattern — follow-up session
- Parent portal `TeacherRating.jsx` still uses range sliders — follow-up session (GOV-RATING-STARS noted this)
