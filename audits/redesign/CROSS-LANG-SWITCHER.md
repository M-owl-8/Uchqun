# CROSS-LANG-SWITCHER + ADMIN-LOGIN-CLEAN

**Status:** ✅ CLOSED (pending user Railway verification)
**Commit:** 999d2b6
**Tests:** admin 30/30·165/165, gov 17/17·124/124
**Builds:** admin ✓ · gov ✓ · reception ✓ · teacher ✓

---

## Part A — Login background cleanup

### Admin Login
**Removed:**
- `GuillochePattern` import + div (SVG with 45° rotated grid + 3 concentric circles, `opacity: 0.06`)
- Large "U" watermark div (`opacity: 0.04`, `fontSize: 340`, `position: absolute -bottom-12 -right-8`)

**Kept:** `UEmblem` (branding logo in wordmark area — not decorative)

**Result:** Left panel = flat gradient (`bg-gradient-to-b from-panel-top to-panel-bottom`) only.

### Government Login
**Removed:**
- `GuillochePattern` import + div (same pattern)
- `Emblem` watermark div (`opacity: 0.045`, `size: 520`, `position: absolute -bottom-24 -right-24`)

**Kept:** `Emblem` in the crest tile (branding — not decorative)

**Result:** Left panel = flat gradient only.

---

## Part B — Unified LanguageSwitcher

### STEP B1 — Inventory (before this session)

| Portal | Login switcher | In-app switcher | Component | Style |
|---|---|---|---|---|
| Admin | `dnp/LangDropdown` — footer | Sidebar inline `LangDropdown` | per-portal fork | Dropdown ↑, light bg |
| Government | `dnp/LangToggle` — footer | Sidebar inline `LangDropdown` | per-portal fork | Pill buttons / dropdown ↑ |
| Reception | Pill buttons — footer | Sidebar pill buttons | inline | UZ/RU/EN uppercase pills |
| Teacher | Pill buttons — footer (no localStorage!) | Sidebar pill | inline | UZ/RU/EN uppercase pills |
| Parent | None | TopBar `<select>` wrapping shared | wrapper over old select | Native select element |

**Bugs found:**
- Teacher Login `handleLangChange` called `i18n.changeLanguage` but NOT `localStorage.setItem('dnp:lang')` — language was lost on reload
- Parent had 3 nesting levels (TopBar → local LanguageSwitcher → shared select wrapper) with messy API

### STEP B2 — Canonical shared component

**File:** `shared/components/LanguageSwitcher.jsx` (complete rewrite of the old select wrapper)

**Three variants:**

| Variant | Use case | Trigger style | Dropdown direction |
|---|---|---|---|
| `sidebar` | All in-app sidebars | `text-white/50 hover:text-white hover:bg-white/10` (universal on any dark bg) | Opens upward (`bottom-full`) |
| `auth` | All login pages | `text-warm-600 hover:bg-warm-100` (light) | Opens upward (`bottom-full`, right-aligned) |
| `topbar` | Parent TopBar (colored header) | `text-white/70 hover:bg-white/15` | Opens downward (`top-full`, right-aligned) |

**All variants share:**
- Globe icon + language name (full name, not abbreviation) + chevron
- `useTranslation()` reads `i18n.language` — always in sync with the running app
- On select: `i18n?.changeLanguage(lng)` + `localStorage.setItem('dnp:lang', lng)`
- Optional `onChange` callback for portals with local STRINGS state (admin/gov login)
- ARIA listbox pattern (`role="listbox"`, `role="option"`, `aria-selected`)
- Click-outside dismissal via `pointerdown` listener

**Sidebar variant** uses opacity-based white colors instead of portal-specific tokens (`walnut-*`, `sidebar-*`, `teak-*`), so it works across all 4 different sidebar color schemes without per-portal overrides.

### STEP B3 — Per-portal replacements

| Surface | Before | After | Notes |
|---|---|---|---|
| Admin login | `dnp/LangDropdown` (local state) | `<LanguageSwitcher variant="auth" onChange={setLang} />` | onChange updates STRINGS dict state |
| Admin sidebar | Inline `LangDropdown` component (57 lines) | `<LanguageSwitcher variant="sidebar" />` | `handleChangeLang` + `currentLang` removed |
| Gov login | `dnp/LangToggle` (local state) | `<LanguageSwitcher variant="auth" onChange={setLang} />` | Same STRINGS dict pattern |
| Gov sidebar | Inline `LangDropdown` component (60 lines) | `<LanguageSwitcher variant="sidebar" />` in `px-3 pb-2` wrapper | `currentLang` removed |
| Reception login | Pill buttons (17 lines) | `<LanguageSwitcher variant="auth" />` | `langs`/`currentLang`/`handleLang` removed |
| Reception sidebar | Pill buttons (19 lines) | `<LanguageSwitcher variant="sidebar" />` | Same state removed |
| Teacher login | Pill buttons + `activeLang` state | `<LanguageSwitcher variant="auth" />` | **Fixed: now writes localStorage** |
| Teacher sidebar | Pill buttons + `activeLang` state | `<LanguageSwitcher variant="sidebar" />` | `LANG_OPTIONS`/`handleLangChange` removed |
| Parent TopBar | `<LanguageSwitcher />` (local wrapper) | `<LanguageSwitcher variant="topbar" />` (shared) | 3 levels → 1 |

### STEP B4 — Storage regression check

All portals still write `'dnp:lang'` on language change. Migration from legacy `'lang'` key is in each portal's `i18n.js` init block — untouched. Confirmed via code grep: no portal writes to the old `'lang'` key.

Teacher login localStorage write was previously absent — now fixed automatically by the shared component.

---

## STEP 8 — Honest count

| Portal × Surface | Was | Now |
|---|---|---|
| Admin login | Separate dnp/LangDropdown | ✅ Shared auth variant |
| Admin sidebar | Inline fork (57 lines) | ✅ Shared sidebar variant |
| Gov login | Separate dnp/LangToggle | ✅ Shared auth variant |
| Gov sidebar | Inline fork (60 lines) | ✅ Shared sidebar variant |
| Reception login | Pill buttons | ✅ Shared auth variant |
| Reception sidebar | Pill buttons | ✅ Shared sidebar variant |
| Teacher login | Pill buttons (no localStorage!) | ✅ Shared auth variant + bug fixed |
| Teacher sidebar | Pill buttons | ✅ Shared sidebar variant |
| Parent TopBar | Local wrapper → old select | ✅ Shared topbar variant |

**Dead code removed:** 6 inline implementations + 1 wrapper component → 0 per-portal forks

**Part A decoration removed:** 4 elements across 2 login pages

---

## STEP 7 — Railway verification checklist (user)

### Part A
- [ ] Admin login: no circles, no hatching, no "U" watermark — flat dark gradient panel only
- [ ] Gov login: same — no guilloché, no emblem watermark in background

### Part B — each portal
**Admin:**
- [ ] Login footer: Globe + "O'zbekcha" / "Русский" / "English" dropdown, opens upward
- [ ] Switch language on login → login → app renders in that language
- [ ] Sidebar: same dropdown style, opens upward, shows current language name
- [ ] Switch in sidebar → reload → persists

**Government:**
- [ ] Login footer: same Globe dropdown
- [ ] Sidebar: same dropdown

**Reception:**
- [ ] Login: Globe dropdown (no more UZ/RU/EN pill)
- [ ] Sidebar: Globe dropdown (no more pill)

**Teacher:**
- [ ] Login: Globe dropdown
- [ ] Sidebar: Globe dropdown
- [ ] Switch language on login → persists after login (localStorage fix verified)

**Parent:**
- [ ] TopBar: Globe + 2-letter code + chevron, dropdown opens downward
- [ ] Switch language → persists

**Cross-portal storage:**
- [ ] Set RU in admin → open government URL in SAME browser tab / same subdomain → check if RU persists (note: separate subdomains may not share localStorage — document actual behavior)

Screenshots: admin login (no decoration); each portal's login switcher; one sidebar switcher; parent topbar switcher.
