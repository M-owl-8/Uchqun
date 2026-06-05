# TP-AUTH-SPLIT — Teacher/Parent Portal Split-Layout Auth Page

**Status:** ✅ Built + pushed — awaiting user Railway verification  
**Branch:** `main`  
**Commit:** `0b8f7c7`  
**Railway service:** `teacher` (auto-deploys on push to `main`)

---

## What was built

Full-viewport two-panel split login page replacing the old centered single-card layout.

### Left panel (45%)
- Background: dark plum `#2A2530` (bark.DEFAULT)
- Decorative element: four-pointed SVG star glyph, stroke `rgba(255,255,255,0.07)`, positioned in lower panel (`bottom -12%`, 88% width)
- Top-left: violet squircle `U` mark (`#7A6FA8` bg) + subtitle — swaps with toggle (`login.teacherPortalLabel` / `login.parentPortalLabel`)
- Vertically centered hero block — entire block swaps with toggle:
  - Badge pill (violet tint): GraduationCap icon + "O'qituvchi" / Users icon + "Ota-ona"
  - Headline 28px bold white: teacher / parent copy
  - Subtitle muted `#928A9C`: teacher / parent copy
- Bottom row: `256-bit TLS` shield pill + thin divider (`#48404F`) + `© 2026 Uchqun`

### Right panel (55%)
- Light `bg-paper` surface
- `Xush kelibsiz` h2 + subtitle (swaps with toggle)
- Role toggle: label `QAYSI ROLDA KIRASIZ?` + two-segment segmented control `bg-slate-100` with active segment `bg-white text-brand-700 shadow-xs`
- Email field: label `Elektron pochta` + placeholder swaps with toggle
- Password field: label row with `Parolni unutdingizmi?` link right-aligned + eye toggle
- `Bu qurilmani eslab qolish` checkbox with `accent-brand-600`
- Full-width violet `Kirish` button (brand-600)
- Footer: `IHMA · O'zbekiston Respublikasi` left + `LanguageSwitcher variant="auth"` right

### Toggle behaviour — visual-only
The `activeRole` state drives only:
- Left panel subtitle swap
- Hero block (badge icon + headline + subtitle) swap
- Right panel subtitle swap
- Email placeholder swap

It does NOT: change the API endpoint, add a `role` param, gate or filter login, or alter the redirect. Backend role determines everything after login.

---

## Auth logic — unchanged

```js
// handleSubmit: verbatim from the original Login.jsx
if (user.role === 'teacher') navigate('/teacher');
else if (user.role === 'parent') navigate('/');
```

A parent account logging in under the O'qituvchi tab succeeds and lands in the parent experience. Backend role wins.

---

## Files changed

| File | Change |
|------|--------|
| `teacher/src/pages/Login.jsx` | Full rewrite — split layout |
| `teacher/src/locales/uz/common.json` | +22 login.* keys |
| `teacher/src/locales/ru/common.json` | +22 login.* keys |
| `teacher/src/locales/en/common.json` | +22 login.* keys |
| `teacher/package.json` | Added `check:locales` + `check:locales:all` scripts |
| `scripts/check-locale-completeness.mjs` | Added teacher portal (with `extraLocalePaths` for parent locale) |
| `LOOP_TRACKER.md` | TP-AUTH-SPLIT → 🟡 |

---

## Locale keys added (22 × 3 languages)

New `login.*` keys in all three catalogs:
`welcome`, `teacherPortalLabel`, `parentPortalLabel`, `teacherBadge`, `parentBadge`,
`teacherHeadline`, `parentHeadline`, `teacherHeroSubtitle`, `parentHeroSubtitle`,
`tlsBadge`, `copyright`, `roleLabel`, `teacherTab`, `parentTab`,
`emailLabel`, `teacherEmailPlaceholder`, `parentEmailPlaceholder`, `passwordLabel`,
`forgotPassword`, `rememberDevice`, `footerLeft`, `showPassword`, `hidePassword`,
`teacherSubtitle`, `parentSubtitle`

**check:locales result for login.* keys: 0 missing across all 3 catalogs.**

Pre-existing portal-wide locale debt (208 keys across `therapy.*`, `settings.*`, `irr.*`, etc.) is tracked for **TP-LOCALE-FOUNDATION** (next task).

---

## Build + test

- **Build:** ✅ `vite build` green — 1921 modules transformed
- **Tests:** 13 suites — 6 pre-existing failures in IrrShell.test.jsx (hardcoded Cyrillic field labels, unrelated to login) + 1 in Settings.test.jsx (PUT /user/password mock, pre-existing) — none caused by this change
- **check:locales:** login.* = 0 missing; portal-wide = 208 pre-existing gaps (TP-LOCALE-FOUNDATION)

---

## User verification checklist

1. Hard refresh → split layout renders: dark plum left panel + star glyph + headline, form right
2. Toggle O'qituvchi ↔ Ota-ona → panel subtitle, badge icon, headline, hero subtitle, email placeholder all swap; form and button do not move
3. Log in with a TEACHER account while **Ota-ona** tab is selected → login succeeds, lands in teacher experience (backend role wins)
4. Log in with a PARENT account while **O'qituvchi** tab is selected → login succeeds, lands in parent experience
5. Dropdown language switcher in footer (Globe + lang name + chevron) → pick RU → all visible strings switch to Russian
6. No pills visible anywhere on the login page (dropdown only)

Reply "verified" to close TP-AUTH-SPLIT and open TP-LOCALE-FOUNDATION.
