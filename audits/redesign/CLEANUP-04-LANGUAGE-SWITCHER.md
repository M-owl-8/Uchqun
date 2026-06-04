# CLEANUP-04-LANGUAGE-SWITCHER

**Status:** 🟡 Code complete — awaiting user Railway verification  
**Scope:** Government portal sidebar dropdown verification + cross-portal localStorage key reconciliation  
**Commit:** pending  

---

## STEP 1 — Verify previous session's claims about government portal switcher

| File | Claimed change | Actual state |
|---|---|---|
| `government/src/components/Sidebar.jsx` | LangDropdown above user card | ✅ CONFIRMED — lines 22–81 define `LangDropdown` inline; lines 192–196 render it between nav and user card: `<LangDropdown currentLang={currentLang} onChange={(lng) => { i18n?.changeLanguage(lng); localStorage.setItem('dnp:lang', lng); }} />` |
| `government/src/components/Layout.jsx` | LanguageSwitcher removed | ✅ CONFIRMED — no LanguageSwitcher import or render anywhere in file. Mobile top bar (lines 20–31) only has Menu button and title. |
| `government/src/components/LanguageSwitcher.jsx` | Should be unused | ⚠️ FILE EXISTED — was imported in `government/src/pages/Settings.jsx:7` and `government/src/pages/Profile.jsx:6`. Both stale (sidebar already canonical). → **FIXED in STEP 2** |

The previous session's core claims were correct (Sidebar ✅, Layout ✅), but missed that `Settings.jsx` and `Profile.jsx` still rendered the old switcher.

---

## STEP 2 — Audit for stale language switcher locations

### Grep run across all 5 portals

```
grep -rnE "LanguageSwitcher|LangSwitcher|LangToggle|language.switch|i18n.changeLanguage" ...
```

**Classification:**

| Location | Classification | Action |
|---|---|---|
| `government/src/components/Sidebar.jsx` LangDropdown (lines 22–196) | ✅ Canonical (inline) | Keep |
| `admin/src/components/Sidebar.jsx:160–162` LangDropdown (inline) | ✅ Canonical (inline) | Keep |
| `reception/src/components/Sidebar.jsx:42–44` | ✅ Canonical (inline) | Fix key (STEP 3) |
| `teacher/src/components/Sidebar.jsx:96–99` | ✅ Canonical (inline) | Fix missing localStorage write (STEP 3) |
| `teacher/src/parent/components/LanguageSwitcher.jsx` + `TopBar.jsx` | ✅ Canonical for parent portal (no sidebar) | Fix key (STEP 3) |
| `government/src/pages/Settings.jsx:77` `<LanguageSwitcher />` | ❌ Stale (sidebar already canonical) | **REMOVED** |
| `government/src/pages/Profile.jsx:75` `<LanguageSwitcher />` | ❌ Stale | **REMOVED** |
| `admin/src/pages/Settings.jsx` Language Settings card (lines 193–203) | ❌ Stale (sidebar already canonical) | **REMOVED** |
| `admin/src/pages/Profile.jsx` Language Switcher section (lines 127–136) | ❌ Stale | **REMOVED** |
| `teacher/src/pages/Settings.jsx:180` `<LanguageSwitcher />` | ❌ Stale (sidebar already canonical) | **REMOVED** |
| `teacher/src/pages/Profile.jsx:133` `<LanguageSwitcher />` | ❌ Stale | **REMOVED** |
| `teacher/src/parent/pages/Settings.jsx:129` header + lines 269–279 Language card | ❌ Stale (TopBar already has canonical) | **REMOVED** |
| `teacher/src/parent/pages/ChildProfile.jsx:316–321` language section | ❌ Stale | **REMOVED** |
| `teacher/src/shared/components/BottomNav.jsx` `showLanguageSwitcher` prop (always `false`) | ❌ Dead code | **REMOVED** |

### Dead component files deleted

| File | Reason |
|---|---|
| `government/src/components/LanguageSwitcher.jsx` | No longer imported anywhere |
| `admin/src/components/LanguageSwitcher.jsx` | No longer imported anywhere |
| `reception/src/components/LanguageSwitcher.jsx` | Was never imported anywhere (dead since creation) |
| `teacher/src/components/LanguageSwitcher.jsx` | No longer imported anywhere (BottomNav cleaned up) |

Remaining after cleanup:
- `shared/components/LanguageSwitcher.jsx` — base select component, kept (used by parent)
- `teacher/src/parent/components/LanguageSwitcher.jsx` — canonical for parent portal, kept

### Test mocks cleaned up

| File | Change |
|---|---|
| `admin/src/__tests__/pages/Settings.test.jsx` | Removed `vi.mock('../../components/LanguageSwitcher', ...)` (3 lines) |
| `teacher/src/__tests__/pages/Settings.test.jsx` | Removed `vi.mock('../../components/LanguageSwitcher', ...)` (3 lines) |
| `government/src/__tests__/Login.test.jsx` | Removed `vi.mock('../components/LanguageSwitcher', ...)` (dead — Login never imported it) |
| `admin/src/__tests__/pages/Settings.test.jsx` | Removed `expect(screen.getByText('settings.language'))` assertion (card removed) |

---

## STEP 3 — localStorage key divergence diagnosis and reconciliation

### Pre-fix state

| Portal | Sidebar writes | i18n.js reads | Divergence? |
|---|---|---|---|
| Government | `'dnp:lang'` (Sidebar.jsx:195) | `'lang'` (i18n.js:17) | ❌ YES |
| Admin | `'dnp:lang'` (Sidebar.jsx:162) | `'lang'` (i18n.js:17) | ❌ YES |
| Reception | `'lang'` (Sidebar.jsx:44) | `'lang'` (i18n.js:17) | "consistent" but wrong key |
| Teacher | (no localStorage write at all) | `'lang'` (i18n.js:69) | ❌ YES — changes didn't persist |
| Parent | `'lang'` (parent LanguageSwitcher.jsx:9) | teacher's i18n.js reads `'lang'` | "consistent" but wrong key |

### Changes applied

**All 4 i18n.js files** (`government`, `admin`, `reception`, `teacher/src`):
- Added one-time migration block BEFORE init:
  ```js
  if (typeof window !== 'undefined') {
    const legacyLang = localStorage.getItem('lang');
    const newLang = localStorage.getItem('dnp:lang');
    if (legacyLang && !newLang) localStorage.setItem('dnp:lang', legacyLang);
  }
  ```
- Changed `localStorage.getItem('lang')` → `localStorage.getItem('dnp:lang')` in init
- Changed `changeLanguage` export to write `'dnp:lang'`

**Sidebar localStorage writes:**
- `reception/src/components/Sidebar.jsx:44` — `'lang'` → `'dnp:lang'`
- `teacher/src/components/Sidebar.jsx:98` — added `localStorage.setItem('dnp:lang', lang.toLowerCase())` (was missing entirely — language changes never persisted from teacher sidebar)

**Reception Login:**
- `reception/src/pages/Login.jsx:42` — `'lang'` → `'dnp:lang'`

**Parent canonical LanguageSwitcher:**
- `teacher/src/parent/components/LanguageSwitcher.jsx:9` — `'lang'` → `'dnp:lang'`

### Post-fix state

| Portal | Sidebar/canonical writes | i18n.js reads | Divergence? |
|---|---|---|---|
| Government | `'dnp:lang'` | `'dnp:lang'` | ✅ None |
| Admin | `'dnp:lang'` | `'dnp:lang'` | ✅ None |
| Reception | `'dnp:lang'` | `'dnp:lang'` | ✅ None |
| Teacher | `'dnp:lang'` | `'dnp:lang'` | ✅ None |
| Parent | `'dnp:lang'` | teacher's `'dnp:lang'` | ✅ None |

---

## STEP 4 — Dropdown styling parity

Both admin and government have LangDropdown defined **inline** in their Sidebar.jsx files.

| Feature | Admin Sidebar | Government Sidebar |
|---|---|---|
| Globe icon | `Globe` (lucide) | `Globe` (lucide) ✅ |
| Selected label | `LANG_LABELS` object | `LANG_LABELS` object ✅ |
| ChevronDown rotation | `180deg` on open | `180deg` on open ✅ |
| Dropdown direction | `bottom-full` (opens up) | `bottom-full` (opens up) ✅ |
| Click-outside close | `pointerdown` on document | `pointerdown` on document ✅ |
| Options | uz / ru / en | uz / ru / en ✅ |
| Placement | Above user card | Above user card ✅ |

Minor differences (acceptable): admin uses walnut-* tokens vs government uses sidebar-* tokens — consistent with each portal's design system.

---

## STEP 5 — Test and build results

### Tests

| Portal | Files | Tests | Status |
|---|---|---|---|
| Government | 17/17 | 124/124 | ✅ |
| Admin | 30/30 | 162/162 | ✅ (1 assertion removed from Settings test — `'settings.language'` card was deleted) |
| Reception | ✅ | ✅ | ✅ (exit code 0) |
| Teacher | ✅ | ✅ | ✅ (exit code 0; pre-existing TherapyManagement warnings unchanged) |

### Builds (VITE_API_URL=https://dummy.example.com/api)

| Portal | Result |
|---|---|
| Government | ✅ built in 9.97s |
| Admin | ✅ built in 10.76s |
| Reception | ✅ built in 21.98s |
| Teacher | ✅ built in 22.25s |

All chunk-size warnings are pre-existing (not introduced by this change).

---

## STEP 6 — Final grep

### LanguageSwitcher references remaining

```
shared/components/LanguageSwitcher.jsx              — base shared component (kept, used by parent)
teacher/src/parent/components/LanguageSwitcher.jsx  — canonical for parent portal (kept)
teacher/src/parent/components/TopBar.jsx            — uses canonical (kept)
teacher/src/__tests__/pages/ChildProfile.test.jsx   — mocks parent LanguageSwitcher (file still exists, fine)
```

No stale UI switchers in any page file. ✅

### localStorage lang references remaining

| Location | Type | Acceptable? |
|---|---|---|
| All 4 i18n.js migration blocks — `localStorage.getItem('lang')` | Legacy read in migration | ✅ Intentional |
| No `setItem('lang', ...)` calls anywhere | — | ✅ |

All `setItem` calls now use `'dnp:lang'`. ✅

---

## STEP 7 — Commit

_Pending push — commit created after this file is written._

---

## STEP 8 — User Railway verification (REQUIRED)

### Government portal
1. Login as gov.toshkent or gov.republic
2. Desktop view → confirm language dropdown in sidebar (above user card)
3. Profile page (`/government/profile`) → confirm NO language switcher there
4. Settings page (`/government/settings`) → confirm NO language switcher there
5. Click dropdown → opens upward with 3 options (O'zbekcha / Русский / English)
6. Switch to RU → page strings translate
7. **F5 refresh** → confirm RU persists
8. Switch to EN → **F5** → confirm EN persists
9. Back to UZ → **F5** → confirm UZ persists
10. Screenshot the dropdown open

### Admin portal (regression check)
1. Login as a director
2. Sidebar dropdown still works → switch language → refresh → confirm persistence
3. Settings page → confirm NO separate language switcher card
4. Profile page → confirm NO language switcher section
5. Screenshot

### Other portals (quick spot-check)
- Reception: language switching in sidebar works, persists on refresh
- Teacher: language switching in sidebar works, persists on refresh (this was newly fixed — teacher sidebar previously didn't persist)
- Parent: TopBar language switching works, persists on refresh

### DevTools verification for existing users
Open DevTools → Application → Local Storage. Both `lang` and `dnp:lang` keys should exist with the same value (migration ran).

Reply "verified" with screenshots from government portal (sidebar dropdown + language persistence on reload) before this is marked ✅.

---

## STEP 9 — Honest count

| Item | Status |
|---|---|
| Government sidebar dropdown verified present | ✅ Sidebar.jsx:192-196 |
| Government mobile top-bar switcher confirmed removed | ✅ Layout.jsx has no LanguageSwitcher |
| Stale switcher locations in profile/settings removed | ✅ 8 page locations across 4 portals |
| Admin portal switcher unchanged (regression check) | ✅ Sidebar LangDropdown intact |
| Other portals' switchers verified | ✅ Reception, teacher, parent canonical locations intact |
| localStorage key reconciled to `'dnp:lang'` in all portals | ✅ All 4 i18n.js + all sidebar writes + parent LanguageSwitcher |
| One-time migration code added | ✅ All 4 i18n.js files |
| Language persists across page reload | ⏳ pending user Railway verification |
| Tests passing | ✅ Government 124, Admin 162, Reception ✅, Teacher ✅ |
| Builds clean | ✅ All 4 portals |
| User Railway verification | ⏳ pending |

---

## Incidental observations

1. **Teacher sidebar didn't write localStorage before this fix** — `handleLangChange` called `i18n.changeLanguage` but never wrote localStorage. Language changes on teacher sidebar would reset on page reload. Fixed in this session (now writes `'dnp:lang'`).

2. **Reception Login also wrote stale `'lang'` key** — fixed alongside the sidebar.

3. **Parent portal has LanguageSwitcher in two stale locations** (`Settings.jsx` × 2, `ChildProfile.jsx` × 1) beyond the canonical `TopBar.jsx` — all three duplicates removed.

4. **`reception/src/components/LanguageSwitcher.jsx` was dead code** — existed but was never imported by any reception page. Deleted.

5. **Teacher Settings test had an assertion for `'settings.language'` text** — this was asserting the Language Settings card heading that was removed from admin Settings. Fixed in `admin/src/__tests__/pages/Settings.test.jsx`.
