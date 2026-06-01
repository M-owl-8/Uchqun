# GOV-REDESIGN-DIAG: Diagnostic Report
**Date:** 2026-06-01  
**Method:** Read-only static audit — git log, file reads, no code changes.  
**Question:** Why does the Login page look unchanged after GOV-REDESIGN-01?

---

## Answer (TL;DR)

**Explanation (A) — Expected behavior.**

GOV-REDESIGN-01 was foundation-only by design. Its prompt stated explicitly: *"NO page implementation in this session. Foundation only."* `Login.jsx` was never touched. The foundation items all landed correctly. The user's "unchanged" report is correct and expected.

**Next step: proceed with GOV-REDESIGN-02 (Login rebuild).**

---

## STEP 1 — Foundation status: all items verified present

### Tailwind config (`government/tailwind.config.js`)
All tokens from the spec appendix are present in `theme.extend`. Verified:

| Token group | Keys | Status |
|---|---|---|
| `green` | DEFAULT `#4F7B4E`, hover `#426B41`, press `#385B37` | ✅ |
| `panel` | top `#2E5A36`, bottom `#1B3A22`, ink `#EAF1E7`, dim `#A9C3A6` | ✅ |
| Surface neutrals | `bg` `#F4F1EA`, `card` `#FFFFFF`, `ink` `#1C2A1E`, `muted` `#6A7A6B`, `faint` `#93A293`, `border` `#E2E0D6` | ✅ |
| `field` | bg `#FAFAF7`, border `#D9D7CC` | ✅ |
| Semantic | `danger` `#B5462F`, `warning` `#B57A1E`, `info` `#2F6B7A` | ✅ |
| Border radii | `input` 11px, `btn` 12px, `card` 14px, `sheet` 22px | ✅ |
| Shadows | `focus`, `err`, `card`, `sm` | ✅ |
| Font families | `sans` (Inter), `mono` (Geist Mono) | ✅ |

Top-level class names (`bg-green`, `border-field-border`, `shadow-focus`, etc.) match spec appendix exactly. `dnp.*` aliases also present for compat. Legacy `brand-*`, `sidebar-*`, `paper-*` tokens untouched.

### Web fonts (`government/index.html`, `government/src/index.css`)
`index.html` line 9:
```html
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Geist+Mono:wght@400;500&display=swap" rel="stylesheet" />
```
`index.css` body:
```css
font-family: 'Inter', system-ui, sans-serif;
background-color: #F4F1EA;
color: #1C2A1E;
```
`@keyframes dnp-spin`, `.dnp-spinner`, `.dnp-guilloche` all present. ✅

### SVG asset components
| File | Status |
|---|---|
| `government/src/components/identity/Emblem.jsx` | ✅ Named export, verbatim spec SVG (shield + wheat ears + three discs) |
| `government/src/components/identity/GuillochePattern.jsx` | ✅ Named export, 45° grid + 3 concentric rings |
| `government/src/components/icons/EyeIcon.jsx` | ✅ off/on states |
| `government/src/components/icons/LockIcon.jsx` | ✅ |
| `government/src/components/icons/GlobeIcon.jsx` | ✅ |

### DNP primitive components (`government/src/components/dnp/`)
All 7/7 present: `Field`, `PrimaryButton`, `Checkbox`, `InlineLink`, `SecurePill`, `LangToggle`, `Spinner`. ✅

### AGENCY_CONFIG (`government/src/config/agency.js`)
```js
export const AGENCY_CONFIG = {
  name_uz: 'Ijtimoiy himoya milliy agentligi',   // ✅ correct IHMA
  name_ru: 'Национальное агентство социальной защиты',
  acronym: 'IHMA',
  ...
};
```
Correct agency. ✅ (Spec examples showed wrong agency "Inson huquqlari" — not propagated.)

### Sandbox preview (`government/src/pages/_DnpPreview.jsx`)
Exists. Dev-only route `/_dnp-preview` wired in `App.jsx` via `lazy()`. ✅

---

## STEP 2 — Login.jsx: completely untouched by GOV-REDESIGN-01

`government/src/pages/Login.jsx` current state:

**Imports:** `lucide-react` Eye/EyeOff, `ihmaLogo` image asset, `LoadingSpinner` (shared). **No** `dnp/*` component imports. **No** AGENCY_CONFIG import. **No** Emblem component import.

**Classes used (legacy tokens only):**
- `bg-paper`, `bg-paper-card`, `text-inkGreen-900` — old paper/inkGreen palette
- `bg-brand-600`, `focus:ring-brand-500`, `hover:bg-brand-700` — old brand-* scale
- `border-gray-200`, `text-gray-*` — Tailwind defaults

**Layout:** single centered column, `max-w-[420px]`, card inside `flex items-center justify-center`. **No** split identity-panel + form layout.

**Visual bugs present (from user's screenshot):**
- Lavender/purple password fill: confirmed — `<input className="... bg-white">` but browser autofill override, not fixed
- "Parolni unutdingizmi?" label collision: confirmed — `<span className="text-xs text-brand-600">` with full reset text in the same label row, wraps into password field

Both bugs are in the pre-redesign Login.jsx and were never touched.

---

## STEP 3 — Token activation: tokens are in the build config

The Tailwind tokens are in `tailwind.config.js` and `index.css` body defaults are already applying (`background-color: #F4F1EA`, `color: #1C2A1E`, `font-family: 'Inter'`). The tokens compile on next Vite build.

However: `Login.jsx` **uses none of them** — it uses `bg-paper` (#F7F5EF), `bg-brand-600`, etc. So even though tokens like `bg-bg` and `bg-green` are now in the build, Login doesn't reference them. The page renders identically before and after the foundation commit.

The sandbox page (`/_dnp-preview`) would prove the tokens work if loaded — all primitives in it use the new token classes.

---

## STEP 4 — Root cause reconciliation

| Explanation | Evidence |
|---|---|
| **(A) Expected behavior** — foundation-only by design, Login untouched | ✅ Supported. GOV-REDESIGN-01 prompt: "NO page implementation in this session. Foundation only. The Login rebuild is GOV-REDESIGN-02." `git show a010dae --stat` confirms Login.jsx not in the 20-file commit. |
| **(B) Foundation incomplete** | ❌ Not supported. All 30 tokens, 7 primitives, 5 SVG components, fonts, AGENCY_CONFIG all verified present. |
| **(C) Login.jsx inadvertently modified** | ❌ Not supported. `git log -- government/src/pages/Login.jsx` shows no commit from GOV-REDESIGN-01. Login has its full set of original bugs intact (lavender fill, label collision). |

**Verdict: (A).** The unchanged appearance is the expected outcome of a foundation-only session.

---

## STEP 5 — Recommended next step

**Proceed with GOV-REDESIGN-02 (Login rebuild) as planned.**

Foundation is clean:
- All tokens ready (`bg-green`, `rounded-input`, `shadow-focus`, `font-sans`, etc.)
- All primitives ready (`Field`, `PrimaryButton`, `Checkbox`, `InlineLink`, `SecurePill`, `LangToggle`)
- `AGENCY_CONFIG` ready with correct IHMA strings
- `Emblem` + `GuillochePattern` ready as components
- Sandbox at `/_dnp-preview` for live verification during build

GOV-REDESIGN-02 scope: replace `Login.jsx` with the split-screen layout from the spec — identity panel (left, green gradient) + form panel (right, white). Wire all primitives. Import and use `AGENCY_CONFIG` for org/nation strings. Remove `ihmaLogo` image dependency. Fix the label-collision and lavender-fill bugs in the process. Match the spec's Section 6 responsive behavior (split ≥880px, stacked ≤880px, centered card mode available).

---

*GOV-REDESIGN-DIAG — read-only, no commit.*
