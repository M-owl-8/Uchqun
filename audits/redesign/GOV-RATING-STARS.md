# GOV-RATING-STARS — Interactive 5-Star Rating Input

**Date:** 2026-06-02  
**Status:** ✅

---

## Pre-flight findings

### Current implementation (before)

`government/src/pages/SchoolDetail.jsx` — `GovRatingForm` component, lines 114–127:

```jsx
{GOV_INDICATORS.map((ind) => (
  <div key={ind.key} className="flex items-center gap-3">
    <span className="text-xs text-gray-600 w-28">{ind.uz}</span>
    <input type="range" min={1} max={5} step={1} value={indicators[ind.key]}
      onChange={e => setIndicators(prev => ({ ...prev, [ind.key]: Number(e.target.value) }))}
      className="flex-1 h-2 accent-brand-600" />
    <span className="text-sm font-semibold w-5">{indicators[ind.key]}</span>
    <div className="flex gap-0.5">
      {[1,2,3,4,5].map(s => (
        <Star key={s} className={`w-3 h-3 ${s <= indicators[ind.key] ? 'fill-yellow-400...' : 'text-gray-200'}`} />
      ))}
    </div>
  </div>
))}
```

**Bug:** Range slider is the actual input; stars are purely decorative and non-interactive. Users naturally reach for stars but the input mechanism is the bar.

### Parent-side rating (TeacherRating.jsx)

`teacher/src/parent/pages/TeacherRating.jsx:468` — also uses `<input type="range" data-testid="slider-{key}">`. Separate component, same antipattern.

### Shared components

No shared rating components found (`shared/components/*Rating*` → no matches). Both portals have their own implementations.

### Case

**Case B** — government and parent have separate components, both with sliders. This session fixes government only. Parent is flagged as a follow-up.

---

## STEP 2 — Implementation

### New `StarRating` component (inline in `SchoolDetail.jsx`)

```jsx
const StarRating = ({ value, onChange, name, disabled }) => {
  const [hoverVal, setHoverVal] = useState(0);
  const display = hoverVal || value;

  return (
    <div role="radiogroup" aria-label={name} className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <button
          key={s}
          type="button"
          role="radio"
          aria-checked={value === s}
          aria-label={String(s)}
          disabled={disabled}
          onClick={() => !disabled && onChange(s)}
          onMouseEnter={() => !disabled && setHoverVal(s)}
          onMouseLeave={() => setHoverVal(0)}
          onKeyDown={(e) => {
            if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
              e.preventDefault(); onChange(Math.min(5, value + 1));
            }
            if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
              e.preventDefault(); onChange(Math.max(1, value - 1));
            }
          }}
          className="focus:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400 rounded-sm disabled:cursor-not-allowed"
        >
          <Star className={`w-6 h-6 transition-colors duration-100 ${
            s <= display
              ? hoverVal ? 'fill-yellow-300 text-yellow-300' : 'fill-yellow-400 text-yellow-400'
              : disabled ? 'text-gray-200' : 'text-gray-300 hover:text-yellow-200'
          }`} />
        </button>
      ))}
    </div>
  );
};
```

### Indicator rows (after)

```jsx
{GOV_INDICATORS.map((ind) => (
  <div key={ind.key} className="flex items-center gap-3">
    <span className="text-xs text-gray-600 w-28 flex-shrink-0">{ind.uz}</span>
    <StarRating
      value={indicators[ind.key]}
      onChange={(v) => setIndicators(prev => ({ ...prev, [ind.key]: v }))}
      name={ind.uz}
      disabled={submitting}
    />
    <span className="text-sm font-semibold tabular-nums w-8 text-right text-brand-700" aria-hidden="true">
      {indicators[ind.key]}/5
    </span>
  </div>
))}
```

### What changed

| Before | After |
|---|---|
| `<input type="range">` (horizontal slider) | 5 `<button role="radio">` per indicator |
| Static `<Star>` icons beside slider (decoration only) | Interactive `<Star>` icons that are the actual input |
| No hover preview | Hover shows lighter yellow preview before commit |
| No keyboard navigation per spec | ArrowLeft/Right/Up/Down navigate within the group |
| No ARIA roles | `role="radiogroup"` on container, `role="radio"` + `aria-checked` on each star |
| `w-3 h-3` static stars | `w-6 h-6` interactive stars (24px per spec) |
| Numeric value alone (`3`) | Fraction confirmation (`3/5`) |

### What didn't change

- Data shape: `{ gov_indicator_1: 3, gov_indicator_2: 4, ... }` — unchanged
- Submit handler: unchanged
- Comment field: unchanged
- Period selector: unchanged
- PL-015 gate notice: unchanged
- `DEFAULT_INDICATORS` initial state (all 3): unchanged

---

## STEP 3 — Verification

### Code verification (source)

- `grep 'type.*range'` in SchoolDetail.jsx → **0 matches** (confirmed)
- `grep 'radiogroup'` → line 26: `role="radiogroup"` on the container div ✅
- `grep 'role.*radio'` → line 34: `role="radio"` on each star button ✅
- `aria-checked={value === s}` ✅
- `aria-label={String(s)}` ✅ 
- Arrow key handlers ✅
- `disabled={submitting}` propagated ✅

### Test suite

Government portal: **17/17 suites, 120/120 tests — all passing**.

The `GovRatingForm` is not directly exercised in tests (it's hidden behind `hasCapability('canRateSchools') = false` in the test mock). No tests broke because the rating form logic was isolated. No new test infrastructure was added — the form change is purely UI-level and the data shape is unchanged.

### Live app verification

Live verification requires Railway backend authentication (cookie-based auth over HTTPS). The dev server proxy to Railway was not working in the local Playwright environment (HTTPS CORS/cookie constraints). The implementation was verified by:
1. Code inspection (grep confirms range inputs removed, radiogroups present)
2. Test suite passing (no regressions)
3. Visual inspection of the dev server (login page rendered correctly)

---

## STEP 4 — Keyboard + accessibility

| Feature | Status |
|---|---|
| `role="radiogroup"` on indicator container | ✅ |
| `role="radio"` on each star button | ✅ |
| `aria-checked={value === s}` | ✅ |
| `aria-label={String(s)}` on each star | ✅ |
| `aria-label={name}` on radiogroup (indicator label) | ✅ |
| ArrowRight / ArrowUp: increment value | ✅ |
| ArrowLeft / ArrowDown: decrement value | ✅ |
| `e.preventDefault()` to prevent scroll on arrows | ✅ |
| `focus-visible:ring-2 focus-visible:ring-yellow-400` | ✅ |
| `disabled` state during form submission | ✅ |
| `aria-hidden="true"` on decorative numeric value | ✅ |

Screen reader behavior: Tab focuses each star button individually. Arrow keys navigate value. Announced as: "3 [radio, checked], Ko'rsatkich 1 [radiogroup]" or similar per ARIA spec.

---

## STEP 5 — Honest count

- **Stars implemented:** ✅ 5 interactive stars per indicator, replacing range sliders
- **Case:** B — government-only fix. Parent portal has same issue (TeacherRating.jsx:468 uses `type="range"`), not fixed in this session.
- **Parent-side propagated:** ❌ out of scope for this session — flagged as follow-up
- **Keyboard navigation:** ✅ ArrowLeft/Right/Up/Down complete in this session
- **Submit + persistence:** Logic unchanged; data shape unchanged; persistence behavior unaffected

---

## STEP 6 — Adjacent observations

1. **Parent portal follow-up:** `teacher/src/parent/pages/TeacherRating.jsx:468` still uses `<input type="range" data-testid="slider-{key}">`. Same antipattern. Tests reference `slider-{key}` test IDs — those tests would need updating when the parent side is fixed.

2. **PL-015 note:** The "Ko'rsatkich nomlari: PL-015 pending" badge in the form header remains. Star UI works regardless of label names — when PL-015 lands (real indicator names), only `shared/config/ratingIndicators.js` changes.

3. **Star size:** Changed from `w-3 h-3` (12px decoration) to `w-6 h-6` (24px interactive). This is a meaningful target area increase for touch/mouse users.

4. **Hover color:** `fill-yellow-300` (lighter) on hover vs `fill-yellow-400` (saturated) on commit — gives clear visual distinction between "previewing" and "selected."
