# CLEANUP-07g-REPORTS — Reports Cluster: Muassasa baholari + Terapiya boshqaruvi + Ogohlantirishlar

**Date:** 2026-06-04  
**Status:** ✅ CLOSED (pending user Railway verification)  
**Commit:** 43e210f  
**Decisions:** A1 card grid (existing), B severity colors (existing/correct), C "Xabar berish" is functional (posts notifications)

---

## Pre-flight

Prior fixes confirmed still in place:
- Yellow stars in SchoolRatings ✅
- aiWarnings locale namespace (33 keys) ✅
- Crash guard (Array.isArray) ✅

---

## STEP 1 — Findings

### AIWarnings.jsx — 2 confirmed production bugs + 3 convention issues

**Bug 1 — Relative time hardcoded to minutes:**
```js
// Before — always shows minutes regardless of actual time:
new Intl.RelativeTimeFormat('uz', { numeric: 'auto' }).format(
  Math.round((new Date(warning.createdAt) - Date.now()) / 60000),
  'minute'  // ← hardcoded
)
// Result: "7 924 daqiqa oldin" for a 5-day-old warning

// After — smart roll-up:
formatRelativeTime(warning.createdAt, t)
// → "Hozirgina" / "X daqiqa oldin" / "X soat oldin" / "X kun oldin"
```

**Bug 2 — resolvedBy shows raw UUID:**
```js
// Before — renders UUID directly:
{warning.resolvedBy}  // → "a5e497f8-..."

// After — uses backend-joined resolver name:
{warning.resolver
  ? `${warning.resolver.firstName} ${warning.resolver.lastName}`.trim()
  : warning.resolvedBy}  // fallback to UUID if resolver join missing
```

Backend returns `warning.resolver = { id, firstName, lastName }` (via Sequelize include in `getWarnings`). Frontend was ignoring this field and using the raw FK `resolvedBy` instead.

**Convention issues fixed:**
- Header count: `· {safeWarnings.length}` → `({safeWarnings.length})`
- Analyze button: `text-white` → `text-walnut-text`
- `Intl.DateTimeFormat('uz-UZ', ...)` hardcoded locale → `undefined`

### TherapyManagement.jsx — header + token issues

| Before | After |
|---|---|
| `font-black`, no letterhead, no count | Letterhead eyebrow "Hisobotlar" + `Terapiya boshqaruvi (N)` |
| Compose: `text-white rounded-xl px-6 py-3` | `text-walnut-text rounded-md h-10 px-4` |
| Music color: `bg-purple-50 text-purple-600` (raw Tailwind) | `bg-warning-50 text-warning-700` (design token) |
| Save button: `text-white rounded-lg` | `text-walnut-text rounded-md` |
| focus rings: `focus:ring-brand-500 focus:border-transparent` | `focus:ring-brand-600/30 focus:border-brand-600` |
| Single empty state (no distinction) | Two states: no-data-at-all vs filter-has-no-results |

### SchoolRatings.jsx — header + token + type taxonomy

| Before | After |
|---|---|
| Plain `<h1 font-bold>`, no eyebrow, no count | Letterhead + eyebrow + `Muassasa baholari (N)` |
| Building icon: `bg-success-100 text-success-700` (green) | `bg-warm-100 text-warm-700` (neutral) |
| Type badge: old 3-type (`school/kindergarten/both`) | New 5-type taxonomy via `typeLabel()` function |
| Type badge: `bg-success-100 text-success-700` (green) | `bg-warm-100 text-warm-700 border-warm-200` (neutral) |

**Type taxonomy fix:** GOV-INSTITUTION-TYPES migrated school types from `{school, kindergarten, both}` to `{daycare, early_preschool, support, early_intervention, home_care}`. SchoolRatings still mapped old codes — which would never match any school post-migration. The type badge was always showing the `else` fallback (typeBoth). Now `typeLabel(type)` correctly resolves the 5 new codes.

---

## New locale keys

| Namespace | Keys added |
|---|---|
| `timeAgo.days` | `{{count}} kun oldin` / `{{count}} дн. назад` / `{{count}}d ago` |
| `schoolRatings.typeDaycare/EarlyPreschool/Support/EarlyIntervention/HomeCare` | 5 × 3 langs |
| `schoolRatings.noRating/summaryTitle/parentRating/govRating/cumulativeRating/partial` | 6 × 3 langs |

---

## Test results

30/30 suites, 167/167 tests — all green.

---

## User Railway verification

Required before full ✅:

### Muassasa baholari
1. Header: **`Muassasa baholari (N)`** with eyebrow "Hisobotlar"
2. School type badge shows **localized institution type** (e.g., "Madad" for support), not "Muassasa va Bog'cha"
3. Building icon: **neutral grey** (not green)
4. Yellow stars hold ✅
5. Three-rating summary card works
6. Language switch → full translation

### Terapiya boshqaruvi
7. Header: **`Terapiya boshqaruvi (N)`** with eyebrow "Hisobotlar"
8. Create button: correct style (not oversized)
9. Music therapy icon: **amber/warm color** (not purple)
10. Filter tabs: Barchasi/Musiqa/Video/Content — all work
11. Create → validation toast if title missing; success toast on submit
12. Empty state: "Terapiyalar yo'q" if none exist; "Terapiyalar topilmadi" if filter/search has no results
13. Language switch → full translation

### Ogohlantirishlar
14. Header: **`Ogohlantirishlar (N)`** (not "AI ogohlantirishlar")
15. Analyze button: **terracotta/warm** (not white)
16. Warning time: shows **"X kun oldin"** for old warnings (not "7 924 daqiqa oldin")
17. Resolved warning: **resolver's name** shown (not UUID like "a5e497f8-...")
18. Resolve a warning → confirm dialog → success toast → moved to resolved state
19. Language switch → RU shows "Предупреждения" etc.

Screenshots: each page header; Ogohlantirishlar showing resolved-by name + rolled-up time; SchoolRatings type badge.

---

## Honest count

| Item | Status |
|---|---|
| AIWarnings relative time roll-up | ✅ |
| AIWarnings resolvedBy UUID → resolver name | ✅ |
| AIWarnings date locale-neutral | ✅ |
| AIWarnings header (N) + analyze text-walnut-text | ✅ |
| TherapyManagement letterhead header | ✅ |
| TherapyManagement button tokens | ✅ |
| TherapyManagement music purple → warning | ✅ |
| TherapyManagement empty-state distinction | ✅ |
| SchoolRatings letterhead header | ✅ |
| SchoolRatings icon warm token | ✅ |
| SchoolRatings 5-type taxonomy fix | ✅ |
| timeAgo.days + schoolRatings type keys | ✅ |
| 30/30 167/167 | ✅ |
| User Railway verification | ⬜ pending |
