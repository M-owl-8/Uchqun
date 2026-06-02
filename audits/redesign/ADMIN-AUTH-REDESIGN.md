# ADMIN-AUTH-REDESIGN — Admin Login Page Redesign

**Status:** 🟡 In progress — pending user Railway visual verification  
**Scope:** Admin portal Login page only. Wider portal terminology drift deferred to ADMIN-LOCALE-HYGIENE.

---

## 1. Pre-flight Findings

### Current state (before redesign)
- `admin/src/pages/Login.jsx` — single-column centered card, 164 lines. No split-screen layout.
- Uses i18next `t()` calls with defaultValue fallbacks.
- Language switcher: three buttons (UZ / РУ / EN) in a segmented pill — same pattern as rest of admin portal.
- Terminology: "Admin", "Maktab boshqaruv tizimi" (in locale fallbacks).
- `admin/src/components/dnp/` — **did not exist**. Admin portal had zero DNP primitives.
- `admin/src/components/identity/` — **did not exist**.
- `admin/tailwind.config.js` — had terracotta `brand.*` + `walnut.*` tokens but **no DNP layout tokens** (`panel.*`, `bg`, `ink`, `muted`, `faint`, `border`, `field.*`, `danger`, `shadow-focus/err/card`).

### Government portal reference
- `government/src/pages/Login.jsx` — split-screen, inline STRINGS (no i18next), `LangToggle` three buttons.
- `government/src/components/dnp/` — has Field, PrimaryButton, Checkbox, InlineLink, SecurePill, LangToggle, Spinner. All use hardcoded government-green (`#4F7B4E`) — NOT parameterized.
- `government/src/components/identity/` — has Emblem (shield/crest SVG) + GuillochePattern.

### Architecture decision: per-portal DNP components
Government DNP components hardcode green. Admin needs terracotta. No shared DNP abstraction exists. Decision: create `admin/src/components/dnp/` as portal-specific implementations of the DNP spec with admin terracotta colors. This matches the existing pattern (gov has its own, admin now has its own) without introducing a premature shared abstraction.

### STEP 0: Internal identifier scope
- `role: 'admin'` — unchanged in all backend code, RBAC, audit log.
- `/admin/*` routes — unchanged.
- `School` model — unchanged. "Muassasa" is a display-layer correction only.
- The pre-existing `school` field in `nav.school` locale key stays as-is — deferred to ADMIN-LOCALE-HYGIENE.

---

## 2. Tailwind Token Changes (`admin/tailwind.config.js`)

Added to `theme.extend`:

### Colors — DNP identity panel (admin brown/walnut variant)
```js
panel: {
  top:    '#2E1F1A',  // dark walnut-brown gradient start
  bottom: '#1A120F',  // near-black gradient end
  ink:    '#F2E9DF',  // same as walnut.text — cream text on dark panel
  dim:    '#BEA898',  // muted warm beige for secondary panel text
},
```

### Colors — DNP form-panel layout tokens
```js
bg:     '#FAF7F2',   // same as existing cream token
card:   '#FFFCF8',   // same as existing surface token
ink:    '#1E1A16',   // warm.900
muted:  '#756959',   // warm.500
faint:  '#9E907C',   // warm.400
border: '#EFE9DE',   // warm.100
field: { bg: '#FFFCF8', border: '#DFD6C6' },
danger: '#9A3E3A',   // error.600
```

### BoxShadow — DNP focus/error rings (terracotta tint)
```js
focus: '0 0 0 4px rgba(168,92,64,.13)',   // brand.600 terracotta
err:   '0 0 0 4px rgba(181,70,47,.10)',
card:  '0 1px 2px rgba(45,40,35,.04), 0 24px 50px -28px rgba(45,40,35,.30)',
```

### BorderRadius & Height
```js
borderRadius: { input: '11px', btn: '12px', sheet: '22px' }
height: { 'dnp-input': '50px', 'dnp-btn': '52px' }
```

---

## 3. New Components Created

### Icons (`admin/src/components/icons/`)
- `GlobeIcon.jsx` — copied from gov portal
- `LockIcon.jsx` — copied from gov portal
- `EyeIcon.jsx` — copied from gov portal

### Identity (`admin/src/components/identity/`)
- `UEmblem.jsx` — new. Terracotta rounded-square tile with "U" glyph. Inline style, accepts `size` prop. `background: #A85C40`, `color: #F2E9DF`.
- `GuillochePattern.jsx` — adapted from gov. Uses absolute positioning SVG. Pattern id renamed `adm-grid` to avoid collision if both portals ever render on same page.

### DNP primitives (`admin/src/components/dnp/`)
All use admin terracotta `#A85C40` (brand.600) where gov portal uses `#4F7B4E` (green).

- `Spinner.jsx` — same structure as gov, default color `#A85C40`
- `Field.jsx` — focus border `#A85C40`, focus shadow `shadow-focus`, error border `#9A3E3A`
- `PrimaryButton.jsx` — bg `#A85C40`, hover `#8D4A33`, press `#6E3A2A`, text `#F2E9DF`
- `Checkbox.jsx` — checked bg/border `#A85C40`, check mark `#F2E9DF`
- `InlineLink.jsx` — text `#A85C40`, hover `#8D4A33`
- `SecurePill.jsx` — same as gov (uses white/opacity classes, works on dark panel)
- **`LangDropdown.jsx`** — NEW pattern (first in codebase). Globe icon + selected language label + chevron. Opens upward (`bottom-full`). Three options: O'zbekcha / Русский / English. Persists to `dnp:lang` localStorage key. Active item highlighted terracotta `#A85C40`.

---

## 4. Login Page Implementation (`admin/src/pages/Login.jsx`)

Full replacement (was 164 lines, now ~240 lines).

### Architecture change
Old: i18next `useTranslation()` + defaultValue fallbacks.  
New: inline `STRINGS` object keyed by `lang` (uz/ru/en) — same pattern as government portal's Login. This is the correct pattern for a standalone auth page that renders before i18next has loaded the user's portal session.

### Layout
- **Desktop (≥880px):** CSS grid `grid-cols-[minmax(420px,1.05fr)_minmax(440px,1fr)]` — identity panel left, form panel right. Same breakpoint as government portal.
- **Mobile (<880px):** Single column, identity panel stacks on top.

### Identity panel
- Background: `bg-gradient-to-b from-panel-top to-panel-bottom` — `#2E1F1A` → `#1A120F`
- GuillochePattern backdrop at `text-white/[.06]`
- Large "U" watermark (desktop, bottom-right, 4% opacity)
- **Top:** `UEmblem (48px)` + "Uchqun" wordmark + tagline
- **Middle:** Direktor badge (terracotta pill) + "DIREKTOR PANELI" eyebrow + `panelTitle` (h1) + `panelSub` subtitle
- **Bottom:** `SecurePill` + separator + footer text

### Form panel
- Background: `bg-bg` (#FAF7F2)
- **Header:** Direktor badge (light terracotta pill on cream) + `heading` (h2) + `formSub` subtitle
- **Fields:** `Field` (email + password with `InlineLink` for forgot-password)
- **Checkbox:** `Checkbox` for "Bu qurilmani eslab qolish"
- **Submit:** `PrimaryButton` (terracotta)
- **Security notice:** LockIcon + `security` text
- **Footer:** footer text + `LangDropdown`

### Auth behavior preserved exactly
```js
navigate(result.mustChangePassword ? '/admin/change-password' : '/admin')
```
Force-password-change flow works. Error codes: 429 → rateLimited, ACCOUNT_NOT_ACTIVE → suspended, 403 → notApproved.

---

## 5. Locale String Changes (UZ / RU / EN)

Note: The redesigned Login.jsx uses inline STRINGS (not i18next keys), so these locale file updates are for documentation consistency and for any future portal-wide references to `login.*` keys.

| Key | UZ Before | UZ After |
|---|---|---|
| `login.title` | "Admin" | "Direktor" |
| `login.tagline` | (new key) | "Muassasa boshqaruv tizimi" |
| `login.blockTitle` | "Admin kirishi" | "Direktor kirishi" |
| `login.blockSubtitle` | "Admin hisobingiz bilan tizimga kiring" | "Direktor akkauntingiz bilan tizimga kiring" |
| `login.placeholderEmail` | "admin@uchqun.com" | "direktor@muassasa.uz" |

| Key | RU Before | RU After |
|---|---|---|
| `login.title` | "Админ" | "Директор" |
| `login.tagline` | (new key) | "Система управления учреждением" |
| `login.email` | "Email" | "Электронная почта" |
| `login.blockTitle` | "Вход администратора" | "Вход директора" |
| `login.placeholderEmail` | "admin@uchqun.com" | "direktor@uchqun.uz" |

| Key | EN Before | EN After |
|---|---|---|
| `login.title` | "Admin" | "Director" |
| `login.tagline` | (new key) | "Institution management system" |
| `login.button` | "Login" | "Sign in" |
| `login.blockTitle` | "Admin Login" | "Director Login" |
| `login.placeholderEmail` | "admin@uchqun.com" | "director@institution.uz" |

---

## 6. Wider Terminology Drift Inventory (for ADMIN-LOCALE-HYGIENE)

Out of scope for this session. Deferred items:

| Key | Current value | Should be |
|---|---|---|
| `sidebar.title` (all locales) | "Uchqun Admin" | "Uchqun Direktor" or just "Uchqun" |
| `role.admin` (UZ) | "Administrator" | "Direktor" |
| `role.admin` (RU) | "Администратор" | "Директор" |
| `role.admin` (EN) | "Administrator" | "Director" |
| `dashboard.role` (UZ) | "Mening rolim: Admin" | "Mening rolim: Direktor" |
| `dashboard.role` (RU) | "Моя роль: Админ" | "Моя роль: Директор" |
| `dashboard.role` (EN) | "My Role: Admin" | "My Role: Director" |
| `nav.school` (UZ) | "Maktab profili" | "Muassasa profili" |
| `nav.school` (RU) | "Профиль школы" | "Профиль учреждения" |
| `nav.school` (EN) | "School Profile" | "Institution Profile" |
| `nav.schoolRatings` (RU) | "Оценки школ" | "Оценки учреждений" |
| `nav.schoolRatings` (EN) | "School Ratings" | "Institution Ratings" |

---

## 7. New Primitives — Summary

| Component | Type | Notable |
|---|---|---|
| `UEmblem` | Identity | First admin-specific emblem — terracotta "U" tile |
| `GuillochePattern` | Identity | Adapted from gov — pattern id renamed `adm-grid` |
| `LangDropdown` | DNP | **First dropdown language switcher in platform** — new pattern |
| `Field` | DNP | Terracotta focus ring, admin error color |
| `PrimaryButton` | DNP | Terracotta, no shared abstraction with gov |
| `Checkbox` | DNP | Terracotta checked state |
| `InlineLink` | DNP | Terracotta link color |
| `SecurePill` | DNP | Same as gov (white/opacity on dark panels) |
| `Spinner` | DNP | Terracotta default color |

---

## 8. Test Results

- **Login smoke test:** ✅ `Login page smoke > renders login form` — passes (button "Kirish" found)
- **Total admin suite:** 160/162 passing — 2 pre-existing failures in `Settings.test.jsx` (password change) and `AIWarnings.test.jsx` (resolve endpoint) — both unrelated to Login redesign, present before this session.

---

## 9. Honest Count

| Item | Status |
|---|---|
| New auth page implemented per spec | ✅ |
| "Admin" → "Direktor" on Login | ✅ |
| "Maktab" → "Muassasa" on Login | ✅ |
| Three-button → dropdown language switcher | ✅ |
| Admin accent color (terracotta) Tailwind tokens | ✅ |
| Admin Emblem (UEmblem) component | ✅ |
| Admin DNP component set (7 components) | ✅ |
| GuillochePattern identity component | ✅ |
| Locale strings updated UZ/RU/EN | ✅ |
| Split-screen layout (≥880px) | ✅ |
| Force-change password flow tested | ✅ (existing flow preserved; `/admin/change-password` nav intact) |
| Wider terminology drift inventoried | ✅ (noted for ADMIN-LOCALE-HYGIENE) |
| Visual verification screenshots | ⏳ pending user verification |

---

## 10. STEP 8 — User Railway Verification (REQUIRED before ✅)

Please verify on Railway:

1. Open admin portal Login page → **screenshot**
2. Confirm: split-screen layout, dark brown left panel, cream form panel
3. Confirm: "Direktor" appears as role label (not "Admin", not "Administrator")
4. Confirm: "Muassasa boshqaruv tizimi" tagline
5. Confirm: "Muassasalarni yagona boshqaruv markazi" panel title
6. Confirm: terracotta "Kirish" / "Войти" / "Sign in" button
7. **Click the language selector** → confirm it opens as a **dropdown** (not three buttons) → screenshot
8. Switch to RU → confirm "Директор" + "Система управления учреждением" → screenshot
9. Switch to EN → confirm "Director" + "Institution management system" → screenshot
10. Log in with valid admin credentials → confirm redirect to dashboard
11. Log in with wrong password → confirm error message displayed clearly

Reply "verified" with screenshots to close this session ✅.

---

## Deferred / Post-launch TODOs

- **ADMIN-LOCALE-HYGIENE:** Fix `sidebar.title`, `role.admin`, `dashboard.role`, `nav.school*` across all admin portal locale files (9+ keys in 3 language files).
- **LOOP_PRE_LAUNCH_CHECKLIST.md:** Add native UZ speaker review of "Direktor" and "Muassasa" terminology (ensure register is appropriate for directors of special-education institutions, not just general "director" connotation).
- **LangDropdown in government portal:** The new dropdown pattern should eventually replace the three-button LangToggle in the government portal's Login page — separate session.
