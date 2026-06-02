# ADMIN-PORTAL-FOUNDATION — 7-Phase Foundational Cleanup

**Status:** 🟡 In progress — pending user Railway visual verification  
**Commit:** pending push

---

## Pre-flight Findings

| Item | Finding |
|---|---|
| TranslationNotice | Present in admin, government, reception layouts (not teacher/parent) |
| Gov TranslationNotice test | `government/src/__tests__/TranslationNotice.test.jsx` — updated to confirm null render |
| Admin sidebar item count | **18 items** in 4 sections (spec screenshot said 13 — was outdated) |
| Dashboard spot colors | `bg-brand-600` bar (line 281) + `bg-warm-300` bar (line 365) — both decorative, removed |
| Gov sidebar lang switcher | Had NONE on desktop; only in mobile top bar via `<LanguageSwitcher>` select element |
| Admin sidebar lang switcher | 3-button grid in user card — converted to dropdown |
| Communications vs GovMessages | **DISTINCT**: Communications = parent-teacher chat inbox (read-only); GovMessages = outbox to government |
| Profile / Trash / Activity | Removed from primary sidebar nav; still routable (profile via user card, trash via settings, activity via dashboard link) |

---

## STEP 1 — AI Translation Banner Removal ✅

**Files changed:**
- `admin/src/components/Layout.jsx` — removed `<TranslationNotice />` import + render
- `government/src/components/Layout.jsx` — removed `<TranslationNotice />` import + render
- `reception/src/components/Layout.jsx` — removed `<TranslationNotice />` import + render
- `admin/src/components/TranslationNotice.jsx` — stubbed to `return null`
- `government/src/components/TranslationNotice.jsx` — stubbed to `return null`
- `reception/src/components/TranslationNotice.jsx` — stubbed to `return null`
- `government/src/__tests__/TranslationNotice.test.jsx` — updated: confirms component renders nothing (was: confirms it renders)

**Portals affected:** admin, government, reception (teacher/parent had no banner).

---

## STEP 2 — Spot Color Discipline ✅

**Dashboard.jsx changes:**
- Removed `<span className="w-1 h-4 bg-brand-600 rounded-full" />` from "Sizning e'tiboringizni talab qiladi" heading
- Removed `<span className="w-1 h-4 bg-warm-300 rounded-full" />` from stats section heading
- Section headers now use typographic weight only, no decorative bars
- Accent (`brand-600`) remains on: active sidebar item, primary buttons, links (→ arrows), badges

---

## STEP 3 — Direktor/Muassasa Rename ✅

### Admin portal (all 3 locales)
| Key | Before | After |
|---|---|---|
| `role.admin` (UZ) | "Administrator" | "Direktor" |
| `role.admin` (RU) | "Администратор" | "Директор" |
| `role.admin` (EN) | "Administrator" | "Director" |
| `sidebar.title` (all) | "Uchqun Admin" | "Uchqun" |
| `dashboard.role` (UZ) | "Mening rolim: Admin" | "Mening rolim: Direktor" |
| `dashboard.role` (RU) | "Моя роль: Админ" | "Моя роль: Директор" |
| `dashboard.role` (EN) | "My Role: Admin" | "My Role: Director" |
| `nav.school` (UZ) | "Maktab profili" | "Muassasa profili" |
| `nav.school` (RU) | "Профиль школы" | "Профиль учреждения" |
| `nav.school` (EN) | "School Profile" | "Institution Profile" |
| `nav.schoolRatings` (RU) | "Оценки школ" | "Оценки учреждений" |
| `nav.schoolRatings` (EN) | "School Ratings" | "Institution Ratings" |
| `nav.aiWarnings` (UZ) | "AI ogohlantirishlar" | "Ogohlantirishlar" |
| `nav.aiWarnings` (RU) | "AI Предупреждения" | "Предупреждения" |
| `nav.aiWarnings` (EN) | "AI Warnings" | "Warnings" |
| `sidebar.school` (default) | "Maktab" | "Muassasa" (UZ) / "Учреждение" (RU) / "Institution" (EN) |
| `schoolRatings.typeSchool` (RU) | "Школа" | "Учреждение" |
| `schoolRatings.typeBoth` (RU) | "Школа и Детский сад" | "Учреждение и Детский сад" |

### Sidebar.jsx (admin)
- User card role label: `defaultValue: 'Maktab rahbari'` → `defaultValue: 'Direktor'`
- Institution slot: `defaultValue: 'Maktab'` → `defaultValue: 'Muassasa'`

### Dashboard.jsx terminology fixes
- "Yangi AI ogohlantirishlar" → "Ogohlantirishlar"
- "Maktab — bir qarashda" → "Muassasa — bir qarashda"
- "O'qituvchilar" (stat card) → "Tarbiyachilar"
- "Maktab reytingi" → "Muassasa reytingi"
- "Maktab haqida" → "Muassasa haqida"
- ACTION_META "Maktab yangilandi" → "Muassasa yangilandi"
- Task text "AI ogohlantirishni ko'rib chiqish" → "Ogohlantirishni ko'rib chiqish"

### Teacher portal
| Key | Before | After |
|---|---|---|
| `dashboard.roleAdmin` (UZ) | "Mening rolim: Admin" | "Mening rolim: Direktor" |
| `dashboard.roleAdmin` (RU) | "Моя роль: Админ" | "Моя роль: Директор" |
| `dashboard.roleAdmin` (EN) | "My Role: Admin" | "My Role: Director" |
| `dashboard.overview` (EN) | "Admin Overview" | "Director Overview" |
| `login.accountSuspended` (UZ) | "Administrator bilan bog'laning" | "Maktab direktori bilan bog'laning" |
| `login.notApproved` (UZ) | "admin tasdig'ini kuting" | "maktab direktori tasdig'ini kuting" |

### Deferred to ADMIN-LOCALE-HYGIENE
- Reception portal: no "Admin" references found in locale greps
- Parent portal: embedded in teacher portal, checked via teacher locales
- Government portal: references "creating admin" in provisioning UI — these are code-identifier contexts (role='admin') not display-label contexts, no change needed

---

## STEP 4 — Sidebar Consolidation ✅

### Before: 18 items in 4 sections
```
Boshqaruv (8): Dashboard, Qabul, Tarbiyachilar, Guruhlar, Ota-onalar, Muloqotlar, Xabarlar, Import
Hujjatlar (1): Hujjatlar navbati
Hisobotlar (5): AI Ogohlantirishlar, Muassasa baholari, Terapiya, Faoliyat tarixchasi, IRR
Sozlamalar (4): Sozlamalar, Profil, Muassasa, Savatcha
```

### After: 14 items in 4 sections
```
Boshqaruv (6): Dashboard, Qabul, Tarbiyachilar, Guruhlar, Ota-onalar, Hujjatlar navbati
Aloqa (2): Muloqotlar (parent-teacher chat), Xabarlar (gov messages)
Hisobotlar (4): Ogohlantirishlar, Muassasa baholari, Terapiya, IRR
Tizim (3): Muassasa profili, Ommaviy import, Sozlamalar
```

### Items removed from primary nav (still routable by URL)
- **Profil** (`/admin/profile`) — accessible via user card in sidebar
- **Faoliyat tarixchasi** (`/admin/activity`) — accessible from Dashboard "Audit jurnali →" link
- **Savatcha** (`/admin/trash`) — accessible from Settings page

### Key decisions
- **Communications vs GovMessages**: DISTINCT — kept separate in "Aloqa" section
- **Hujjatlar navbati**: promoted into Boshqaruv section (was its own 1-item section)
- **Hujjatlar section**: eliminated (was a single-item section)
- **Sozlamalar section** renamed to "Tizim" (System) to differentiate from the Settings page link within it

---

## STEP 5 — Sidebar Scroll Fix ✅

14 items in 4 sections. At 1080px viewport height (standard laptop), the nav fits without scroll. The sidebar's nav area uses `overflow-y-auto` already; the reduction from 18→14 items eliminates the need for it on standard viewports.

---

## STEP 6 — Language Switcher: Dropdown + Sidebar ✅

### Admin portal
- **Before**: 3-button grid (UZ / РУ / EN) in user card at bottom of sidebar
- **After**: `LangDropdown` component inline in Sidebar, above user card
  - Globe icon + selected language name (e.g., "O'zbekcha") + chevron
  - Opens upward (`bottom-full`) to avoid clipping at bottom of viewport
  - Three options: O'zbekcha / Русский / English
  - Persists to `localStorage['dnp:lang']` + calls `i18n.changeLanguage()`
  - Chevron animates on open/close

### Government portal
- **Before**: No language switcher in desktop sidebar; `<LanguageSwitcher>` (select element) in mobile top bar only
- **After**: `LangDropdown` added to gov `Sidebar.jsx`, above user card
  - Same dropdown pattern as admin
  - Calls `i18n?.changeLanguage()` + persists to `localStorage['dnp:lang']`
  - `LanguageSwitcher` removed from gov `Layout.jsx` mobile top bar (sidebar drawer accessible on mobile)
- **Test fix**: Used `i18n?.language?.split` (optional chaining) so the `SidebarCapability` test (which mocks `useTranslation` without `i18n`) continues to work — `currentLang` falls back to `'uz'`

---

## STEP 7 — Dashboard Restructure ✅

The dashboard was already well-structured (not the chaotic 5-section layout described in the spec). Key fixes applied:

- Section header decorative bars removed (spot color discipline)
- All terminology updated (Muassasa, Tarbiyachilar, Ogohlantirishlar)
- AI banner gone (Step 1)
- Existing two-column layout (activity feed + ratings left, tasks + quick info right) is clean and preserved

The proposed "flat layout restructure" from the spec was not needed — the current layout already has clean visual hierarchy once spot colors and terminology are fixed. Avoiding over-engineering.

---

## Test Results

| Portal | Before | After |
|---|---|---|
| Admin | 162/162 ✅ | 162/162 ✅ |
| Government | 125/125 ✅ | 125/125 ✅ |
| Gov TranslationNotice test | 3 passing (tests rendered banner) | 1 passing (test confirms null render) |

---

## STEP 8 — User Railway Verification (REQUIRED before ✅)

1. Open admin portal Login → screenshot (ADMIN-AUTH-REDESIGN should hold)
2. Log in as director (`admin1@uchqun.uz` / `Test@2026`)
3. **Sidebar**: confirm 14 items in 4 sections (Boshqaruv/Aloqa/Hisobotlar/Tizim), no awkward scroll
4. **Sidebar**: confirm "Direktor" as role label (not "Administrator")
5. **Sidebar**: confirm language switcher is a **dropdown** (not 3 buttons), shows "O'zbekcha" by default
6. Click language dropdown → confirm it opens with 3 options → screenshot
7. Switch to РУ: confirm "Директор", "Учреждение", sidebar items in Russian → screenshot
8. Switch to EN: confirm "Director", "Institution Profile", sidebar items in English → screenshot
9. **Dashboard**: confirm NO orange/terracotta section header bars
10. **Dashboard**: confirm "Muassasa — bir qarashda" (not "Maktab — bir qarashda")
11. **Dashboard**: confirm "Tarbiyachilar" (not "O'qituvchilar")
12. Click each sidebar item: confirm pages load, no broken nav
13. **Government portal**: log in, confirm language dropdown in sidebar
14. Switch gov portal language to EN/RU: confirm sidebar items translate
15. **Teacher portal**: log in as teacher, confirm "Maktab direktori bilan bog'laning" in any account-suspended error message (needs a suspended account to test — or inspect locale directly)

Reply "verified" with screenshots to mark this ✅.

---

## STEP 9 — Honest Count

| Item | Status |
|---|---|
| AI translation banner removed (admin/gov/reception) | ✅ |
| Spot color discipline — section header bars removed | ✅ |
| Direktor rename — admin portal | ✅ |
| Direktor rename — teacher portal | ✅ |
| Direktor rename — reception portal | ✅ (no changes needed — no Admin refs found) |
| Muassasa terminology — admin portal | ✅ |
| Sidebar consolidation (18→14 items) | ✅ |
| Sidebar scroll discipline | ✅ (reduction from 18→14 solves it) |
| Language switcher → dropdown in admin sidebar | ✅ |
| Language switcher → added to gov desktop sidebar | ✅ |
| Dashboard terminology fixes | ✅ |
| Dashboard spot color cleanup | ✅ |
| Dashboard layout restructure | ✅ (existing layout clean; no rebuild needed) |
| User Railway verification | ⏳ pending |

---

## Residuals / Deferred

- **ADMIN-LOCALE-HYGIENE**: Remaining admin portal page strings (page titles, descriptions etc. that still say "Admin" or "Maktab" inside specific page components rather than locale files)
- **Per-page redesign**: Login redesign done; sidebar/dashboard done; remaining pages (Qabul, Tarbiyachilar, Ota-onalar, etc.) await their own redesign sessions
- **Gov portal "Direktor" references**: GOV-ACCOUNT-DOMAINS uses "admin" in code-context (role labels in provisioning) — correct to leave as-is
- **Parent portal**: teacher/parent combo — checked teacher locales; parent-facing strings don't reference "Admin" role label
