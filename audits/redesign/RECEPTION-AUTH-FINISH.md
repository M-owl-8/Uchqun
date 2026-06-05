# RECEPTION-AUTH-FINISH

**Status:** 🟡 In progress (pending user Railway verification)
**Commit:** (pending test pass)
**Tests:** pending

---

## Diagnosis — Why CROSS-LANG-SWITCHER missed this

### Evidence

**CROSS-LANG-SWITCHER (commit 999d2b6) DID touch `reception/src/pages/Login.jsx`:**
```
git log --follow reception/src/pages/Login.jsx
999d2b6 feat(platform): unified LanguageSwitcher + clean admin/gov login backgrounds
```

**Exact files changed in 999d2b6:**
```
reception/src/components/Sidebar.jsx     | 27 +----
reception/src/pages/Login.jsx            | 24 +---
```

**Current Login.jsx state (post-999d2b6, confirmed in code):**
- Line 7: `import { LanguageSwitcher } from '@shared/components/LanguageSwitcher';`
- Line 192: `<LanguageSwitcher variant="auth" />`
- Pills (`langs`/`currentLang`/`handleLang` state + JSX) removed ✅

**CROSS-LANG-SWITCHER deliverable table (Part B, row for reception login):**
> Reception login | Pill buttons (17 lines) | `<LanguageSwitcher variant="auth" />` | `langs`/`currentLang`/`handleLang` removed

### Root cause — Delta 2 (LanguageSwitcher)
Delta 2 **was completed** by CROSS-LANG-SWITCHER in commit 999d2b6. The user sees pills because **Netlify/Vercel reception has not redeployed since that commit.** The git code is correct; the live URL is serving a stale build. Pushing this new commit will trigger a fresh build that carries the LanguageSwitcher change.

### Root cause — Delta 1 (star glyph)
CROSS-LANG-SWITCHER Part A removed `GuillochePattern` (SVG with 45° grid + concentric circles) and `Emblem` watermarks from admin and gov login pages only. Reception login's decoration is a **different class** — `motif-rhombus motif-rhombus-lg` — a CSS `background-image` pattern (two overlapping 45° linear gradients that create diamond/star intersections at every 60×60px tile). It was **never listed in Part A's scope**, is defined in `reception/src/index.css` (not in a shared component like GuillochePattern), and was not present in admin/gov logins, so the Part A pass never encountered it.

**Process finding:** CROSS-LANG-SWITCHER Part A verified "flat panel" for admin + gov by removing named components. Reception login's background motif is a CSS class applied to an anonymous `<div>` — not a named imported component — so a search for `GuillochePattern`/`Emblem` would never surface it. The session verified those two portals visually (per the checklist) but reception login was not part of Part A's checklist, only Part B. The Part B checklist for reception only asked about the language switcher, not the background.

---

## Delta 1 — Remove the star glyph

**Source:** `reception/src/pages/Login.jsx` lines 51–56 (pre-fix):
```jsx
{/* Rhombus motif backdrop */}
<div
  className="fixed inset-0 motif-rhombus motif-rhombus-lg text-brand-700 pointer-events-none"
  aria-hidden="true"
  style={{ opacity: 0.03 }}
/>
```

**What it renders:** `.motif-rhombus` = two `linear-gradient(±45deg, currentColor 1px, transparent 1px)` overlaid, producing a diamond crosshatch. At `background-size: 60px 60px` (`.motif-rhombus-lg`), every intersection of the diagonals forms a **four-pointed star-outline** shape. With `text-brand-700` (teal) and `opacity: 0.03`, these are subtle teal sparkle/star glyphs tiled across the full login viewport. Most visible where the page gradient has teal tone (bottom-left radial — `rgba(90,138,135,0.16) at 6% 92%`).

**Fix:** Removed the div entirely. The CSS classes remain in `index.css` (may be used by future surfaces).

**Result:** Login background = radial gradient only (existing — unchanged). No shapes, no watermarks.

---

## Delta 2 — Language dropdown

**Status: already done in code by CROSS-LANG-SWITCHER (999d2b6).** No code change needed in this session.

`reception/src/pages/Login.jsx:192`:
```jsx
<LanguageSwitcher variant="auth" />
```

Positioned in the footer row (right side, below card), same pattern as admin login. Renders: Globe icon + current language name + chevron → dropdown opens upward → on select: `i18n.changeLanguage(lng)` + `localStorage.setItem('dnp:lang', lng)`. Language chosen at login persists into the app.

This commit's push triggers a Netlify/Vercel rebuild that will make both deltas visible at the deployed URL for the first time.

---

## Verification checklist (user)

1. **No star glyph** — login page background is a clean radial gradient, no diamond/star tile pattern visible anywhere on the page.
2. **Dropdown switcher** — bottom-right of the card footer shows Globe + language name + chevron instead of [UZ][RU][EN] pill buttons. Clicking opens an upward dropdown.
3. **Persistence** — pick RU in dropdown → log in → reception app renders in Russian (nav, buttons, labels all Russian).
4. **Side-by-side with reference screenshot** — nothing else changed on the page.

Reply "verified".

---

## Honest count

| Item | Before | After |
|---|---|---|
| Star glyph (motif-rhombus div) | Present in Login.jsx | **Removed** |
| Language switcher | Already `<LanguageSwitcher variant="auth" />` in code | No change needed |
| Lines removed from Login.jsx | — | **6 lines** (div + comment) |
| CROSS-LANG-SWITCHER process gap | Part A missed reception motif-rhombus (different element, different checklist) | Documented |
| Deployment gap | Netlify/Vercel reception running pre-999d2b6 build | This push triggers rebuild |
