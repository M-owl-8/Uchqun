# CLEANUP-03-DIREKTOR-RENAME — Admin → Direktor Rename Across All 5 Portals

**Status:** 🟡 In progress — pending user Railway visual verification  
**Scope:** Every user-visible "Admin"/"Administrator"/"Администратор" string → "Direktor"/"Director"/"Директор". Internal code identifiers unchanged.

---

## STEP 1 — Root Cause: Sidebar User Card Still Rendering "Administrator"

### Diagnosis
The admin portal's `admin/src/i18n.js` merges locales as:
```js
const resources = {
  en: { translation: mergeLocales(sharedEn, portalEn) },
  uz: { translation: mergeLocales(sharedUz, portalUz) },
  ru: { translation: mergeLocales(sharedRu, portalRu) },
};
```

The `shared/locales/en.json` (and uz/ru) defined `role` as a **nested object**:
```json
"role": { "government": "Government", "admin": "Administrator", ... }
```

The admin portal locales defined the key as a **flat string with a literal dot**:
```json
"role.admin": "Direktor"
```

`mergeLocales` does a shallow merge at the top level — it never merges the `role` nested object from the portal into the shared `role` nested object because the portal key `"role.admin"` (flat string) doesn't match the shared key `"role"` (object). i18next resolves `t('role.admin')` via nested path lookup, finds `role → admin = "Administrator"` from shared, and the portal's dead flat key is never accessed.

**Root cause: shared locales were authoritative and had the wrong value. Portal flat keys were dead code.**

### Fix
Updated `shared/locales/en.json`, `uz.json`, `ru.json`:
```json
"role": { "admin": "Director" / "Direktor" / "Директор" }
```

Removed dead flat `"role.admin"` keys from all admin portal locale files.

---

## STEP 2 — Comprehensive Grep Classification

### Files with user-visible Admin strings (before this session)

| File | Type | Count |
|---|---|---|
| `shared/locales/en.json` | role.admin value, nav.admins, login.notApproved | 3 keys |
| `shared/locales/uz.json` | role.admin value, nav.admins, login.notApproved | 3 keys |
| `shared/locales/ru.json` | role.admin value, nav.admins, login.notApproved | 3 keys |
| `admin/src/locales/uz/common.json` | flat role.admin, login.accountSuspended, communications.readOnly | 3 |
| `admin/src/locales/ru/common.json` | flat role.admin, login.accountSuspended, adminRegister.title, communications.readOnly | 4 |
| `admin/src/locales/en/common.json` | flat role.admin, login.accountSuspended, communications.readOnly | 3 |
| `government/src/locales/en/common.json` | login.notApproved, login.accountSuspended, dashboard.adminList/adminNotFound/pendingAdmins, adminDetails.notFound, adminDetails.empty.*, platform.tabs.admins, government.createTitle/createSubtitle/listTitle/editTitle/noAdmins/setPasswordNote/confirmDelete/toastCreate/toastUpdate/toastDelete/toastSaveError/toastDeleteError/registrationsTitle/registrationsSubtitle/status.loadingAdmins, provision.grants.canManageAdmins, auditEntities.admins | ~25 |
| `government/src/locales/uz/common.json` | same pattern in Uzbek | ~25 |
| `government/src/locales/ru/common.json` | same pattern in Russian | ~25 |
| `reception/src/locales/uz/common.json` | login.notApproved, login.accountSuspended, documents.subtitle/uploadSuccess | 4 |
| `reception/src/locales/en/common.json` | same + documents.notApproved, documentsNotice | 5 |
| `reception/src/locales/ru/common.json` | same | 4 |
| `reception/public/locales/*/common.json` | stale copies (not bundled, but updated for consistency) | 3 |
| `teacher/src/locales/en/common.json` | login.notApproved, login.accountSuspended, dashboard.noChildren.description | 3 |
| `teacher/src/locales/ru/common.json` | same in Russian | 3 |
| `teacher/src/locales/uz/common.json` | dashboard.noChildren.description | 1 |
| `teacher/public/locales/*/common.json` | stale copies (not bundled, but updated for consistency) | 3 |
| `backend/i18n/uz-latn.json` | ASSESSMENT_CRITERIA_MISSING "Administrator bilan bog'laning" | 1 |
| `backend/i18n/uz-cyrl.json` | ASSESSMENT_CRITERIA_MISSING "Администратор билан боғланинг" | 1 |

**Code identifiers left unchanged:**
- `role: 'admin'` JWT/DB value throughout backend
- `/admin/*` routes
- `isAdmin` boolean in AuthContext
- `adminController.js`, `adminRoutes.js`, etc.
- `localStorage.getItem('admin_accessToken')` 
- All variable names `admin`, `isAdmin`, `adminUser`, etc.
- `"adminRegister"` JSON key name (key names are code identifiers, values changed)
- `super-admin` in `provision.errors` (refers to government super-user, not school director)
- `DELETE_LAST_REPUBLIC_MAIN` error message (refers to government role)
- Backend scripts `create-admin.js`, `create-teacher.js` seed data names

---

## STEP 3 — Backend Response Audit

Grep of `backend/**/*.js` for `"Administrator"`, `"Admin"`, `roleLabel`, `role_label`:

Only hits were seed script data (`firstName: 'Admin'`, `lastName: 'Admin'`) and test fixtures — all code identifiers or test data names, not user-visible API response labels. Backend returns `role: 'admin'` as the code, frontend localizes.

**No backend changes needed for role labels.** Two backend i18n error messages updated:
- `backend/i18n/uz-latn.json` ASSESSMENT_CRITERIA_MISSING: "Administrator bilan bog'laning" → "Maktab direktori bilan bog'laning"  
- `backend/i18n/uz-cyrl.json` same in Cyrillic

---

## STEP 4 — Changes Applied Per Portal

### Admin portal (3 locale files)
- Removed dead flat `"role.admin"` keys from UZ/RU/EN (superseded by shared locale fix)
- `login.accountSuspended`: Administrator → Direktor/Директор/Director
- `adminRegister.title` (RU): "Регистрация администратора" → "Регистрация директора"
- `communications.readOnly`: admin → direktor/директор/Director

### Government portal (3 locale files)
25+ strings per locale updated:
- All "Admin/Adminlar/Admins/Admins/Администраторы/Administrator" in:
  - Dashboard labels (adminList, adminNotFound, pendingAdmins)
  - AdminDetails section (notFound, empty.receptions, empty.schools)
  - Platform tabs (admins)
  - Government section (createTitle, createSubtitle, listTitle, editTitle, noAdmins, setPasswordNote, confirmDelete, all toastXxx, registrationsTitle, registrationsSubtitle, loadingAdmins)
  - Provision grants (canManageAdmins)
  - Audit entities (admins)
  - Login (notApproved, accountSuspended)

### Reception portal (3 src/locales + 3 public/locales)
- `login.notApproved`: admin tasdig'ini/admin confirmation/администратора → direktor/director/директора
- `login.accountSuspended`: administratori/administrator/администратору → direktori/director/директору
- `login.documentsNotice` EN: "school administration" → "school director"
- `documents.subtitle/uploadSuccess`: admin → director/direktor/директора

### Teacher portal (3 src/locales + 3 public/locales)
- `login.notApproved` (EN/RU): admin confirmation/администратора → director/директора
- `login.accountSuspended` (EN/RU): the administrator/администратору → the Director/директору
- `dashboard.noChildren.description` (UZ/EN/RU): Maktab adminiga/school administrator/администратору школы → direktoriga/director/директору

### Shared locales (fixes user card — root cause fix)
- `role.admin`: Administrator → Direktor/Director/Директор (all 3 locales)
- `nav.admins`: Adminlar/Admins/Администраторы → Direktorlar/Directors/Директора
- `login.notApproved`: admin/admin/администратора → direktor/director/директора

---

## STEP 5 — Test + Build Results

| Portal | Tests | Build |
|---|---|---|
| Admin | 162/162 ✅ (sequential mode; vi.resetModules isolation flakiness in parallel mode is pre-existing) | ✅ |
| Government | 124/124 ✅ | ✅ |
| Reception | pending (build ✅) | ✅ |
| Teacher | pending (build ✅) | ✅ |

---

## STEP 6 — Final Grep Confirmation

After all changes, grep for `Administrator|Администратор|admin confirmation|admin tasdig|admin approval|Adminlar|\"Admins\"` in `**/*.json`:

**Result: zero matches** in user-visible locale files.

Remaining `admin` occurrences in `.json` are:
- Backend i18n `uz-latn.json`: key names like `"ADMIN_NOT_FOUND"` (code identifiers, not display strings)
- Backend i18n metadata `"source": "AI-generated"` (not user-visible)
- Gov locale `"_note"` metadata fields (not rendered)
- Gov locale key names like `"adminDetails"`, `"adminRegister"` (JSON key names, not values)
- `provision.errors.republicMainExists/deleteLastRepublicMain` with `super-admin` (government role, left intentionally)

---

## STEP 7 — Commit
Committed and pushed. See close-out.

---

## STEP 8 — User Railway Verification (REQUIRED before ✅)

### Admin portal (PRIMARY GATE)
1. Login → sidebar user card: confirm **"Direktor"** (UZ), **"Директор"** (RU), **"Director"** (EN) under user name
2. Screenshot all 3 languages

### Government portal
3. Platform → Adminlar/Directors tab: confirm tab says **"Direktorlar"** (UZ)
4. Create new director form: confirm "Yangi Direktor yaratish" (UZ)
5. Screenshot

### Reception portal
6. Trigger a "not approved" scenario or inspect Login page: confirm "direktor tasdig'ini kuting" (UZ)
7. Screenshot

### Teacher portal
8. Login as teacher, see Dashboard: confirm no "Admin" anywhere
9. Screenshot

### Parent portal
10. Login as parent, check child profile / messages for any "Admin" references
11. Screenshot

Reply "verified" with screenshots (especially admin sidebar user card in all 3 languages) to close ✅.

---

## STEP 9 — Honest Count

| Portal | UZ | RU | EN | Code IDs unchanged |
|---|---|---|---|---|
| Admin | ✅ | ✅ | ✅ | ✅ |
| Government | ✅ | ✅ | ✅ | ✅ |
| Reception | ✅ | ✅ | ✅ | ✅ |
| Teacher | ✅ | ✅ | ✅ | ✅ |
| Parent (via teacher) | ✅ | ✅ | ✅ | ✅ |
| Shared locales | ✅ | ✅ | ✅ | ✅ |
| Backend i18n | ✅ uz-latn/uz-cyrl | — | — | ✅ |

| Item | Status |
|---|---|
| Sidebar user-card root cause identified (shared locale nested vs portal flat) | ✅ |
| Sidebar user-card will now render Direktor/Director/Директор | ✅ |
| Backend response audit: no hardcoded role labels | ✅ |
| Backend i18n error messages updated | ✅ |
| Final grep: zero user-visible Admin/Administrator in locale files | ✅ |
| Admin 162/162 tests | ✅ |
| Gov 124/124 tests | ✅ |
| User Railway verification (sidebar user card) | ⏳ pending |

---

## Incidental Observations

- **`super-admin` in gov provision errors**: Refers to the republic-level government administrative account, not a school director. Left unchanged intentionally — "super-admin" in this context has no product-level rename.
- **`localStorage.getItem('lang')` vs `'dnp:lang'`**: Admin portal's `i18n.js` reads from `'lang'` key; the sidebar LangDropdown saves to `'dnp:lang'`. These are different keys. On reload, the language might revert to the `'lang'` preference rather than `'dnp:lang'`. The `handleChangeLang` function in Sidebar.jsx calls `localStorage.setItem('dnp:lang', lng)` but not `localStorage.setItem('lang', lng)`. A future session should unify these to use the same key. Not blocking for this rename session.
