# GOV-REDESIGN-01 — DNP Design System Foundation

**Status:** ✅ Complete  
**Date:** 2026-06-01  
**Phase:** 1 of N — tokens, fonts, SVG assets, primitive components only. No page implementation.

---

## STEP 0 — Agency Name Resolution

**Finding:** The spec prototype used "Inson huquqlari milliy agentligi" (IHMA in a different expansion). This is incorrect.

**Confirmed correct:** IHMA = **Ijtimoiy himoya milliy agentligi** (National Social Protection Agency)

All strings in `government/src/config/agency.js` use the IHMA identity exclusively. Zero instances of "Inson huquqlari" were introduced.

---

## STEP 1 — tailwind.config.js

**File:** `C:\work\Uchqun\government\tailwind.config.js`

Added to `theme.extend`:

- **`colors.dnp.*`** — 18 tokens verbatim from spec Section 1:
  - Brand greens: `green` (#4F7B4E), `green-hover` (#426B41), `green-press` (#385B37), `panel-top` (#2E5A36), `panel-bottom` (#1B3A22), `panel-ink` (#EAF1E7), `panel-ink-dim` (#A9C3A6)
  - Neutrals: `bg` (#F4F1EA), `card` (#FFFFFF), `ink` (#1C2A1E), `muted` (#6A7A6B), `faint` (#93A293), `border` (#E2E0D6), `field-bg` (#FAFAF7), `field-border` (#D9D7CC)
  - Semantic: `danger` (#B5462F), `warning` (#B57A1E), `info` (#2F6B7A)
- **`borderRadius`** — 4 tokens (Section 3): `dnp-input` 11px, `dnp-btn` 12px, `dnp-card` 14px, `dnp-sheet` 22px
- **`boxShadow`** — 4 tokens (Section 3): `dnp-focus`, `dnp-err`, `dnp-card`, `dnp-sm` (verbatim RGBA values)
- **`height`** — `dnp-input` 50px, `dnp-btn` 52px
- **`fontFamily`** — `inter` and `geist-mono`

**Legacy tokens preserved (no removal):** `primary`, `brand`, `sidebar`, `paper`, `inkGreen` — all intact.

---

## STEP 2 — Web Fonts + CSS Defaults

**Files modified:**
- `C:\work\Uchqun\government\index.html`
- `C:\work\Uchqun\government\src\index.css`

**index.html:** Updated Google Fonts link to include:
- Inter: wght@400;500;600;700;800
- Geist Mono: wght@400;500
- Single combined `?family=Inter:wght@...&family=Geist+Mono:wght@...&display=swap` URL

**Deviation note:** Geist Mono is listed on Google Fonts as "Geist Mono" (not "GeistMono"). The URL uses `family=Geist+Mono` which is the correct Google Fonts slug.

**index.css:** Added:
- `body` font-family: `'Inter'`, background-color: `#F4F1EA`, color: `#1C2A1E`
- `@keyframes dnp-spin` — 0.7s linear infinite rotation
- `.dnp-spinner` — applies `animation: dnp-spin 0.7s linear infinite`
- `.dnp-guilloche` — `position: absolute; inset: 0; width/height: 100%; opacity: 0.07; pointer-events: none`

---

## STEP 3 — SVG Identity Components

### `government/src/components/identity/Emblem.jsx`
Named export `Emblem({ size = 64, stroke = 1.7 })` — verbatim from spec. Props: `size` (SVG width/height), `stroke` (strokeWidth). Uses `currentColor` throughout for easy theming.

### `government/src/components/identity/GuillochePattern.jsx`
Named export `GuillochePattern()` — verbatim from spec. Uses `.dnp-guilloche` CSS class (defined in index.css) for absolute positioning and opacity. Pattern ID: `dnp-grid`.

---

## STEP 4 — Icon Components

All use `currentColor`, accept `size` prop, `aria-hidden="true"`.

| File | Export | Props | Notes |
|---|---|---|---|
| `government/src/components/icons/EyeIcon.jsx` | `EyeIcon` | `{ off = false, size = 18 }` | off=false: circle+path; off=true: crossed-path slash |
| `government/src/components/icons/LockIcon.jsx` | `LockIcon` | `{ size = 14 }` | rect + path (padlock) |
| `government/src/components/icons/GlobeIcon.jsx` | `GlobeIcon` | `{ size = 16 }` | circle + horizontal meridian + vertical oval path |

---

## STEP 5 — AGENCY_CONFIG

**File:** `C:\work\Uchqun\government\src\config\agency.js`

All 11 keys from spec, IHMA identity only:
- `name_uz`, `name_ru`, `nation_uz`, `nation_ru`, `acronym` ("IHMA")
- `panelTag_uz`, `panelTag_ru`, `portalTitle_uz`, `portalTitle_ru`
- `footer_uz`, `footer_ru`

Note: `acronym` is `'IHMA'` not `'ИНМА'` — Latin script as the spec uses.

---

## STEP 6 — Primitive Components

All in `government/src/components/dnp/`.

| Component | File | Status | Notes |
|---|---|---|---|
| Field | `Field.jsx` | ✅ | All 4 states (default/focus/error/disabled), eye toggle for password type, trailing prop override, error msg 12.5px/500/danger 7px below |
| PrimaryButton | `PrimaryButton.jsx` | ✅ | loading (spinner + text), done (check icon), disabled (opacity .5), active:scale(.992), all 3 bg states |
| Checkbox | `Checkbox.jsx` | ✅ | 19×19, radius 6, hidden native input, white check stroke 3.5, off/on states |
| InlineLink | `InlineLink.jsx` | ✅ | 12.5px/600/green, no underline default, underline+color-hover on hover, renders as button |
| SecurePill | `SecurePill.jsx` | ✅ | inline-flex gap-[7px] px-[12px] py-[6px] rounded-full bg-white/[.08] border-white/[.14] text-panel-ink text-[12.5px] font-semibold, LockIcon 13px |
| LangToggle | `LangToggle.jsx` | ✅ | Globe icon, UZ/RU buttons, localStorage read on mount, document.lang update on change, tracking-[0.04em] |
| Spinner | `Spinner.jsx` | ✅ | 17px SVG circle, ~75% arc via strokeDasharray, .dnp-spinner class, color prop |

**Count:** 7/7 components completed.

**Spinner implementation note:** The 75% arc is achieved via `strokeDasharray="${circumference * 0.75} ${circumference * 0.25}"` on a circle with r=7, matching the 17px viewBox. The `dnp-spin` @keyframes + `.dnp-spinner` class are defined in `index.css` rather than inline, keeping the CSS boundary clean.

---

## STEP 7 — Sandbox Preview Page

**File:** `C:\work\Uchqun\government\src\pages\_DnpPreview.jsx`

Renders:
- Dark panel section (linear-gradient panel-top → panel-bottom) with GuillochePattern + Emblem at 24/32/52/200px + 2 SecurePill variants
- Emblem at 4 sizes on white card (text-[#4F7B4E])
- Field: 4 states (default, password with eye toggle, error, disabled)
- PrimaryButton: interactive (simulates loading→done), disabled, loading static, done static
- Checkbox: unchecked, checked, interactive
- InlineLink: with surrounding label text
- LangToggle: interactive with active lang display
- Spinner: at 4 sizes (14/17/20/28px)
- Color token reference grid (18 swatches)

**App.jsx:** Dev-only route added at `/_dnp-preview`:
```jsx
const DnpPreview = import.meta.env.DEV
  ? lazy(() => import('./pages/_DnpPreview'))
  : null;
// …
{import.meta.env.DEV && DnpPreview && (
  <Route path="/_dnp-preview" element={
    <Suspense fallback={<LoadingSpinner size="lg" />}><DnpPreview /></Suspense>
  } />
)}
```

Tree-shakes in prod because `import.meta.env.DEV` is `false` at build time, so the condition is dead-eliminated and `lazy()` never runs.

---

## STEP 8 — LOOP_TRACKER.md

Entry #109 added to the log table under "Government Redesign". Status: ✅.

---

## Honest Counts

| Area | Planned | Completed | Deviations |
|---|---|---|---|
| Tailwind tokens | 18 colors + 4 radii + 4 shadows + 2 heights + 2 fonts | ✅ 30/30 | None |
| Web fonts | Inter 400/500/600/700/800 + Geist Mono 400/500 | ✅ | Geist Mono URL uses `Geist+Mono` (correct GF slug) |
| Identity SVGs | Emblem + GuillochePattern | ✅ 2/2 | None |
| Icon components | EyeIcon + LockIcon + GlobeIcon | ✅ 3/3 | None |
| AGENCY_CONFIG | 11 keys | ✅ 11/11 | None |
| Primitive components | Field, PrimaryButton, Checkbox, InlineLink, SecurePill, LangToggle, Spinner | ✅ 7/7 | None |
| Preview page | _DnpPreview + dev route | ✅ | None |

**Total: 14 files created, 4 files modified. Zero deviations from spec values.**

---

## GOV-REDESIGN-03 Inventory — Existing brand-* Tokens

The following tokens exist in `government/tailwind.config.js` and will need migration assessment when GOV-REDESIGN-03 runs:

### `brand.*` / `primary.*` (identical color scales)
Full 50–900 scale in use across the government portal. Components to audit:
- `government/src/components/Sidebar.jsx` — uses `sidebar.*` tokens
- `government/src/components/Layout.jsx`
- All page components under `government/src/pages/`

### `sidebar.*`
7 tokens (DEFAULT, hover, active, text, muted, line). The Sidebar component uses these directly. GOV-REDESIGN-03 will need to decide: migrate Sidebar to use `dnp-panel-*` tokens or keep side-by-side.

### `paper.*`
3 tokens (DEFAULT, card, deep). Used for background surfaces. Will map to `dnp.bg` / `dnp.card` / `dnp.field-bg` in the new system.

### `inkGreen.*`
2 tokens (800, 900). Will map to `dnp.ink` or `dnp.panel-bottom` depending on usage context.

### Migration strategy for GOV-REDESIGN-03
1. Grep for `brand-*`, `primary-*`, `sidebar-*`, `paper-*`, `inkGreen-*` across `government/src/`
2. Map each to the nearest `dnp.*` equivalent
3. Migrate page-by-page, component-by-component
4. Remove legacy tokens from tailwind.config.js only after zero references remain (confirmed by `npm run build` with no unused-class warnings)
5. The `Sidebar.jsx` will require the largest migration surface as it uses all 6 `sidebar.*` tokens inline
