# Phase 01 — Naming & Identity Audit

**Generated:** 2026-05-07  
**Auditor:** Claude Code (claude-sonnet-4-6)  
**Audit mode:** READ ONLY — no project files were modified.

---

## Executive Summary

- The core platform brand **"Uchqun"** is applied consistently across package names, Docker labels, logger metadata, and API titles — strong coherence at the top level.
- A **"super-admin" ghost** pervades the codebase. Despite the super-admin role being formally merged into "government" on 2026-05-06, the old name survives in 30+ file locations: a model, a DB table, a controller, a validator, 5 route aliases, all government i18n namespaces, inline comments, Telegram message templates, email body text, and one test asserting a role string that no longer exists in the DB ENUM.
- The government app's i18n translation keys are **entirely named under the `superAdmin` namespace** (e.g., `t('superAdmin.messagesTitle')`). The user-facing labels are correct (say "Davlat"/Government), but the code-level key names still say "superAdmin" throughout six component files and all three locale files.
- **Four different email domains** are used across the project: `uchqun.uz`, `uchqunedu.uz`, `uchqun.com`, `uchqunplatform.com`. No single canonical domain is established.
- **Three different Railway URLs** appear as hardcoded fallbacks for the same backend service.
- `shared/context/AuthContext.jsx` maps `isTeacher` to include the `admin` role — an intentional but undocumented blurring of role identity.
- The teacher package name `uchqun-teacher-frontend` carries a `-frontend` suffix that no other app uses.
- The English locale for admin contains **Uzbek words in English strings** (`"send a message to davlat"`, `"Davlat reply"`).

---

## Scope

**Inspected:** All `.js`, `.jsx`, `.json`, `.yml`, `.yaml`, `.md`, `.toml`, `.env`, `.example` files, excluding `node_modules/`, `.git/`, `dist/`, `build/`.

**Not inspected:** Binary assets (avatars, images), the live Railway database for table/column names (covered in Phase 3), git history/blame for when names were introduced.

---

## 1.1 — All Textual Identifier Inventory

### Package Names

| Surface | Value | Canonical? |
|---------|-------|-----------|
| Root `package.json` | `uchqun-platform` | ✅ Yes |
| `backend/package.json` | `uchqun-backend` | ✅ Yes |
| `admin/package.json` | `uchqun-admin` | ✅ Yes |
| `teacher/package.json` | `uchqun-teacher-frontend` | ⚠ `-frontend` suffix unique to this package |
| `reception/package.json` | `uchqun-reception` | ✅ Yes |
| `government/package.json` | `uchqun-government` | ✅ Yes |

### App / Brand Strings in UI

| Location | String | Role/Context | Canonical? |
|----------|--------|-------------|-----------|
| `admin/src/components/TopBar.jsx:17` | `Uchqun Admin` | Admin app header | ✅ |
| `admin/src/components/Sidebar.jsx:50` | `Uchqun Admin` | Admin sidebar title | ✅ |
| `admin/src/locales/*/common.json` | `Uchqun Admin` | Login page title (all 3 languages) | ✅ |
| `teacher/src/components/Sidebar.jsx:83` | `Uchqun Teacher` | Teacher sidebar title | ✅ |
| `teacher/src/parent/pages/Login.jsx:49` | `Uchqun Platform` | Parent login page title | ✅ |
| `teacher/public/locales/uz/common.json:13` | `Uchqun Portal` | Teacher public locale | ⚠ inconsistent with "Uchqun Teacher" |
| `teacher/public/locales/ru/common.json:13` | `Uchqun Portal` | Teacher public locale (RU) | ⚠ same |
| `backend/controllers/parent/parentAIController.js:116` | `Uchqun Parent Portal` | OpenRouter X-Title header | ⚠ different branding again |
| `backend/utils/telegram.js:141` | `Uchqun Admin Panel` | Telegram notification title | ⚠ different from "Uchqun Admin" |
| `backend/utils/email.js:116` | `Uchqun Admin Panel` | HTML email header | ⚠ same as Telegram |
| `backend/config/swagger.js:7` | `Uchqun Platform API` | Swagger UI title | ✅ |
| `backend/server.js:61` | `uchqun-backend` | Winston log metadata | ✅ |

### Domain & URL Identifiers

| Location | Value | Conflict? |
|----------|-------|---------|
| `backend/server.js:82-83` | `uchqunedu.uz`, `www.uchqunedu.uz` | **Production domain** |
| `backend/utils/email.js:54` | `noreply@uchqun.uz` | ⚠ `.uz` but different subdomain |
| `backend/migrations/20260506120000:7` | `superadmin@uchqun.uz` | Migration default email |
| `backend/scripts/create-demo-accounts.js:22,24` | `teacher@uchqun.uz`, `parent@uchqun.uz` | Script default |
| `backend/scripts/create-reception.js:19` | `reception@uchqun.uz` | Script default |
| `backend/scripts/create-admin.js:14` | `admin@uchqun.com` | ⚠ `.com` not `.uz` |
| `backend/scripts/create-government.js:14` | `government@uchqun.com` | ⚠ `.com` not `.uz` |
| `backend/scripts/reset-admin-password.js:15` | `admin@uchqun.com` | ⚠ `.com` not `.uz` |
| `admin/src/locales/*/common.json` | `admin@uchqun.com` | ⚠ placeholder in UI, `.com` |
| `teacher/src/parent/pages/Help.jsx:44` | `support@uchqunplatform.com` | ⚠ entirely different domain |
| `teacher/vite.config.js:10` | `https://uchqun-production-2d8a.up.railway.app` | Hardcoded Railway URL variant A |
| `backend/controllers/parent/parentAIController.js:115` | `https://uchqun-production-2d8a.up.railway.app` | Hardcoded Railway URL variant A (×3) |
| `docs/internal/PROJECT_GUIDE.md:284` | `https://uchqun-production.up.railway.app` | Railway URL variant B |
| `backend/env.example:51,53` | `https://uchqun-production-up.railway.app` | Railway URL variant C |
| `backend/server.js:81` | `https://uchqun-platform.vercel.app` | Vercel CORS origin |
| `backend/server.js:84-87` | `uchqun-reception/admin/teacher/government.netlify.app` | Netlify CORS origins |

**Domain conflict summary:** Four distinct domains in use — `uchqunedu.uz`, `uchqun.uz`, `uchqun.com`, `uchqunplatform.com` — with no documented canonical authority.

**Railway URL conflict:** Three different URL patterns for the same backend service. If the URL ever changes, at least 4 hardcoded references need updating. The correct URL to update to is UNKNOWN from code alone — requires checking Railway dashboard.

### DB Names

| Surface | Value |
|---------|-------|
| Docker compose default | `uchqun` |
| Database.js fallback | `uchqun` |
| CI environment | `uchqun_test` |
| Docker user in Dockerfile | `uchqun` |

### Env Var Prefixes

| Prefix group | Example vars | Consistent? |
|-------------|-------------|------------|
| `DB_*` | `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_HOST`, `DB_PORT` | ✅ |
| `JWT_*` | `JWT_SECRET`, `JWT_REFRESH_SECRET`, `JWT_EXPIRE`, `JWT_REFRESH_EXPIRE` | ✅ |
| `OPENAI_*` | `OPENAI_API_KEY`, `OPENAI_MODEL`, `OPENAI_BASE_URL` | ✅ (even when using OpenRouter) |
| `APPWRITE_*` | `APPWRITE_ENDPOINT`, `APPWRITE_PROJECT_ID`, `APPWRITE_API_KEY`, `APPWRITE_BUCKET_ID` | ✅ |
| `TELEGRAM_*` | `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHANNEL_ID` | ✅ |
| `SUPER_ADMIN_*` | `SUPER_ADMIN_SECRET_KEY`, `SUPER_ADMIN_EMAIL` | ⚠ legacy prefix for defunct role |
| `PAYME_*` | `PAYME_MERCHANT_ID`, `PAYME_MERCHANT_KEY`, `PAYME_TEST_MODE` | ⚠ dead (payments removed) |
| `CLICK_*` | `CLICK_MERCHANT_ID`, `CLICK_SERVICE_ID`, `CLICK_SECRET_KEY`, `CLICK_MERCHANT_USER_ID` | ⚠ dead (payments removed) |

---

## 1.2 — Conflict Matrix

The following table maps every contested name to every location where it appears, to establish the full blast radius.

### Conflict A: "super-admin" / "superAdmin" / "super_admin"

| Location | Form | Notes |
|----------|------|-------|
| `backend/controllers/superAdminController.js` (filename) | `superAdmin` | Contains messaging logic for government |
| `backend/validators/superAdminValidator.js` (filename) | `superAdmin` | Validators used by governmentRoutes.js |
| `backend/models/SuperAdminMessage.js` (filename + class name) | `SuperAdminMessage` | Model for messages-to-government |
| `backend/models/SuperAdminMessage.js:24` | `super_admin_messages` | Explicit `tableName` declaration |
| `backend/models/index.js:22,58,163-164,302` | `SuperAdminMessage` | Import, registration, associations |
| `backend/controllers/superAdminController.js:31` | `superAdminMessage` | Local variable name |
| `backend/controllers/admin/adminMessageController.js:1,14` | `SuperAdminMessage` | Import + query |
| `backend/controllers/teacherController.js:7,562` | `SuperAdminMessage` | Import + query |
| `backend/controllers/parent/parentMessageController.js:1,14` | `SuperAdminMessage` | Import + query |
| `backend/controllers/receptionController.js:6,1137` | `SuperAdminMessage` | Import + query |
| `backend/migrations/20260112000000-create-super-admin-messages.js` (filename) | `super-admin` | Creates the table |
| `backend/migrations/20260112000000:2,58-81,92` | `super_admin_messages` | Table name in SQL |
| `backend/migrations/20260506000000:64-65` | `super_admin_messages` | FK cascade migration |
| `backend/migrations/20260506120000:2-3,7,15` | `super-admin`, `SUPER_ADMIN_EMAIL` | Migration comments + env var |
| `backend/migrations/20260401000010:11` | `superadmin` | Comment: "superadmin has no school" |
| `backend/routes/adminRoutes.js:46` | `message-to-super-admin` | URL path alias |
| `backend/routes/parentRoutes.js:69` | `message-to-super-admin` | URL path alias |
| `backend/routes/receptionRoutes.js:69` | `message-to-super-admin` | URL path alias |
| `backend/routes/teacherRoutes.js:81` | `message-to-super-admin` | URL path alias |
| `backend/routes/userRoutes.js:21` | `message-to-super-admin` | URL path alias |
| `backend/middleware/auth.js` | `superadmin` (comment only) | Comment in `User.js:95` |
| `backend/utils/telegram.js:145` | `super-admin` | Uzbek Telegram message text |
| `backend/utils/email.js:94` | `super-admin` | Uzbek email body text |
| `backend/env.example:30` | `SUPER_ADMIN_SECRET_KEY` | Env var name (no code reads it) |
| `shared/locales/en.json:12` | `"superAdmin"` | i18n key namespace |
| `government/src/locales/en/common.json:121` | `"superAdmin"` | i18n namespace |
| `government/src/locales/ru/common.json:121` | `"superAdmin"` | i18n namespace |
| `government/src/locales/uz/common.json:121` | `"superAdmin"` | i18n namespace |
| `government/src/components/tabs/SchoolsTab.jsx` | `t('superAdmin.*')` | 8 i18n key refs |
| `government/src/components/tabs/RegistrationsTab.jsx` | `t('superAdmin.*')` | 18+ i18n key refs |
| `government/src/components/tabs/MessagesTab.jsx` | `t('superAdmin.*')` | 15+ i18n key refs |
| `government/src/components/tabs/GovernmentTab.jsx` | `t('superAdmin.*')` | 12+ i18n key refs |
| `government/src/components/tabs/AdminsTab.jsx` | `t('superAdmin.*')` | 10+ i18n key refs |
| `government/src/pages/Platform.jsx` | `t('superAdmin.*')` | used throughout |
| `admin/src/pages/Settings.jsx:430,480,606` | `t('settings.contactSuperAdmin')`, `t('settings.sendToSuperAdmin')`, `t('settings.superAdminReply')` | i18n key names |
| `teacher/src/pages/Settings.jsx:512,562,688` | same key pattern | i18n key names |
| `reception/src/pages/Profile.jsx:317` | `t('profile.superAdminReply')` | i18n key name |
| `admin/src/pages/Profile.jsx:144,320` | `t('profile.contactSuperAdmin')`, `t('profile.superAdminReply')` | i18n key names |
| `admin/src/locales/uz/common.json` | `contactSuperAdmin`, `sendToSuperAdmin`, `superAdminReply` | Keys (values say "Davlat") |
| `admin/src/locales/en/common.json:175,191` | `contactSuperAdmin`, `superAdminReply` | Keys ("Davlat reply" in value) |
| `reception/public/locales/uz/common.json` | `contactSuperAdmin`, `superAdminReply` | Keys (values say "Davlat") |
| `teacher/src/locales/uz/common.json` | `contactSuperAdmin`, `superAdminReply` | Keys |
| `admin/src/__tests__/utils.test.js:34,113` | `'super-admin'` | Tests label for role string no longer in DB |
| `government/src/__tests__/Platform.test.jsx:82,86` | `'/super-admin/'` | Test asserts Platform.jsx doesn't call super-admin URLs |
| `backend/controllers/admin/adminUserController.js:285,332` | `updateGovernmentBySuper`, `deleteGovernmentBySuper` | Function names |
| `backend/routes/governmentRoutes.js:21-22` | `updateGovernmentBySuper`, `deleteGovernmentBySuper` | Import names |

**Count: 50+ individual file:line references to the defunct super-admin naming.**

### Conflict B: Email Domain Variants

| Domain | Used In | Usage |
|--------|---------|-------|
| `uchqunedu.uz` | `backend/server.js:82-83` | Production CORS domain |
| `uchqun.uz` | `backend/utils/email.js:54` | Email sender domain |
| `uchqun.uz` | `backend/scripts/create-demo-accounts.js` | Demo teacher/parent emails |
| `uchqun.uz` | `backend/scripts/create-reception.js` | Demo reception email |
| `uchqun.uz` | `backend/migrations/20260506120000:7` | Default super-admin email |
| `uchqun.com` | `backend/scripts/create-admin.js:14` | Default admin email |
| `uchqun.com` | `backend/scripts/create-government.js:14` | Default government email |
| `uchqun.com` | `backend/scripts/reset-admin-password.js:15` | Default reset email |
| `uchqun.com` | `admin/src/locales/*/common.json:28` | UI placeholder email |
| `uchqunplatform.com` | `teacher/src/parent/pages/Help.jsx:44` | Support contact shown to parents |

**Impact:** Parents see `support@uchqunplatform.com` on the Help page. Admins see `admin@uchqun.com` in form placeholders. Emails are sent from `noreply@uchqun.uz`. The production app runs on `uchqunedu.uz`. No domain is documented as the canonical one.

### Conflict C: Railway Production URL Variants

| Location | URL |
|----------|-----|
| `teacher/vite.config.js:10` | `https://uchqun-production-2d8a.up.railway.app` |
| `backend/controllers/parent/parentAIController.js:115,162,185` | `https://uchqun-production-2d8a.up.railway.app` (×3) |
| `docs/internal/PROJECT_GUIDE.md:284` | `https://uchqun-production.up.railway.app` |
| `backend/env.example:51,53` | `https://uchqun-production-up.railway.app` |

**Impact:** `teacher/vite.config.js` has `process.env.VITE_API_URL?.replace('/api', '')` with the hardcoded fallback — if `VITE_API_URL` is unset in a deployment, the teacher frontend calls the wrong backend URL silently.

### Conflict D: App Branding String Variants

| String | Used In |
|--------|---------|
| `Uchqun Admin` | `admin/` sidebar, TopBar, all locales |
| `Uchqun Admin Panel` | `backend/utils/telegram.js`, `backend/utils/email.js` |
| `Uchqun Portal` | `teacher/public/locales/uz/common.json`, `ru/common.json` |
| `Uchqun Teacher` | `teacher/src/components/Sidebar.jsx` |
| `Uchqun Parent Portal` | `backend/controllers/parent/parentAIController.js` (OpenRouter header) |
| `Uchqun Parent` | `teacher/src/parent/locales/en/common.json` |
| `Uchqun Ota-ona` | `teacher/src/parent/locales/uz/common.json` |
| `Uchqun Родитель` | `teacher/src/parent/locales/ru/common.json` |
| `Uchqun Platform` | `teacher/src/parent/pages/Login.jsx` (parent login) |
| `Uchqun Platform` | `teacher/src/parent/locales/*/common.json` (login title in all 3 langs) |
| `Uchqun Platform API` | `backend/config/swagger.js:7` |
| `Uchqun School` | `backend/controllers/receptionController.js:272,826` (hardcoded default) |

---

## 1.3 — Current Intended Name vs Legacy Name

| Surface | Legacy Name (should go) | Current Intended Name |
|---------|------------------------|--------------------|
| Model file | `SuperAdminMessage.js` | `GovernmentMessage.js` |
| DB table | `super_admin_messages` | `government_messages` |
| Controller file | `superAdminController.js` | `governmentMessageController.js` |
| Validator file | `superAdminValidator.js` | `governmentValidator.js` |
| Route paths | `/message-to-super-admin` | `/message-to-government` |
| Env var | `SUPER_ADMIN_SECRET_KEY` | `GOVERNMENT_SECRET_KEY` (or remove entirely) |
| Env var | `SUPER_ADMIN_EMAIL` | `GOVERNMENT_EMAIL` |
| Function names | `updateGovernmentBySuper`, `deleteGovernmentBySuper` | `updateGovernment`, `deleteGovernment` |
| Association alias | `superAdminMessages` (User.hasMany) | `governmentMessages` |
| i18n namespace | `superAdmin` | `government` |
| i18n keys | `contactSuperAdmin`, `sendToSuperAdmin`, `superAdminReply` | `contactGovernment`, `sendToGovernment`, `governmentReply` |
| Telegram/Email text | "super-admin tomonidan" | "davlat tomonidan" |
| Test role string | `'super-admin'` (invalid) | `'government'` |
| Teacher package name | `uchqun-teacher-frontend` | `uchqun-teacher` |
| Teacher public locale title | `Uchqun Portal` | `Uchqun Teacher` |
| Admin Panel branding | `Uchqun Admin Panel` | `Uchqun Admin` |
| Parent Portal branding | `Uchqun Parent Portal` | `Uchqun Parent` |
| Support contact domain | `uchqunplatform.com` | `uchqunedu.uz` (presumably) |
| Admin script defaults | `admin@uchqun.com` | `admin@uchqun.uz` |
| Railway URL | three variants | one canonical URL (confirm in Railway) |

---

## 1.4 — All Legacy Name Locations

### 1.4a — "super-admin" artifacts still in use (active code, not just comments)

| # | File | Line | Pattern | Severity |
|---|------|------|---------|---------|
| 1 | `backend/controllers/superAdminController.js` | entire file | filename contains `superAdmin` | medium |
| 2 | `backend/validators/superAdminValidator.js` | entire file | filename contains `superAdmin` | low |
| 3 | `backend/models/SuperAdminMessage.js` | entire file | filename, class name, tableName | medium |
| 4 | `backend/models/index.js` | 22,58,163-164,302 | import + usage of `SuperAdminMessage` | medium |
| 5 | `backend/controllers/admin/adminMessageController.js` | 1,14 | import `SuperAdminMessage` | medium |
| 6 | `backend/controllers/teacherController.js` | 7,562 | import `SuperAdminMessage` | medium |
| 7 | `backend/controllers/parent/parentMessageController.js` | 1,14 | import `SuperAdminMessage` | medium |
| 8 | `backend/controllers/receptionController.js` | 6,1137 | import `SuperAdminMessage` | medium |
| 9 | `backend/routes/adminRoutes.js` | 46 | `/message-to-super-admin` route | medium |
| 10 | `backend/routes/parentRoutes.js` | 69 | `/message-to-super-admin` route | medium |
| 11 | `backend/routes/receptionRoutes.js` | 69 | `/message-to-super-admin` route | medium |
| 12 | `backend/routes/teacherRoutes.js` | 81 | `/message-to-super-admin` route | medium |
| 13 | `backend/routes/userRoutes.js` | 21 | `/message-to-super-admin` route | medium |
| 14 | `backend/utils/telegram.js` | 145 | "super-admin tomonidan tasdiqlandi" | low |
| 15 | `backend/utils/email.js` | 94 | "super-admin bilan bog'laning" | low |
| 16 | `backend/env.example` | 30 | `SUPER_ADMIN_SECRET_KEY` env var | low |
| 17 | `backend/controllers/admin/adminUserController.js` | 285,332 | `updateGovernmentBySuper`, `deleteGovernmentBySuper` | low |
| 18 | `shared/locales/en.json` | 12 | `"superAdmin"` i18n namespace key | medium |
| 19 | `government/src/locales/en/common.json` | 121 | `"superAdmin"` i18n namespace key | medium |
| 20 | `government/src/locales/ru/common.json` | 121 | `"superAdmin"` i18n namespace key | medium |
| 21 | `government/src/locales/uz/common.json` | 121 | `"superAdmin"` i18n namespace key | medium |
| 22 | `government/src/components/tabs/SchoolsTab.jsx` | multiple | `t('superAdmin.*')` calls | medium |
| 23 | `government/src/components/tabs/RegistrationsTab.jsx` | multiple | `t('superAdmin.*')` calls | medium |
| 24 | `government/src/components/tabs/MessagesTab.jsx` | multiple | `t('superAdmin.*')` calls | medium |
| 25 | `government/src/components/tabs/GovernmentTab.jsx` | multiple | `t('superAdmin.*')` calls | medium |
| 26 | `government/src/components/tabs/AdminsTab.jsx` | multiple | `t('superAdmin.*')` calls | medium |
| 27 | `government/src/pages/Platform.jsx` | multiple | `t('superAdmin.*')` calls | medium |
| 28 | `admin/src/pages/Settings.jsx` | 430,480,606 | i18n keys `contactSuperAdmin`, `sendToSuperAdmin`, `superAdminReply` | low |
| 29 | `teacher/src/pages/Settings.jsx` | 512,562,688 | same keys | low |
| 30 | `reception/src/pages/Profile.jsx` | 317 | key `profile.superAdminReply` | low |
| 31 | `admin/src/pages/Profile.jsx` | 144,320 | keys `contactSuperAdmin`, `superAdminReply` | low |
| 32 | `admin/src/locales/uz/common.json` | — | keys `contactSuperAdmin`, `superAdminReply` | low |
| 33 | `admin/src/locales/en/common.json` | — | keys + English values with "davlat" | medium |
| 34 | `reception/public/locales/uz/common.json` | — | keys `contactSuperAdmin`, `superAdminReply` | low |
| 35 | `teacher/src/locales/uz/common.json` | — | keys `contactSuperAdmin`, `superAdminReply` | low |
| 36 | `admin/src/__tests__/utils.test.js` | 34,113 | tests `'super-admin'` role string (invalid in DB) | high |

### 1.4b — Email/domain inconsistencies (active code)

| File | Line | Domain | Problem |
|------|------|--------|---------|
| `backend/scripts/create-admin.js` | 14 | `uchqun.com` | `.com` not `.uz` |
| `backend/scripts/create-government.js` | 14 | `uchqun.com` | `.com` not `.uz` |
| `backend/scripts/reset-admin-password.js` | 15 | `uchqun.com` | `.com` not `.uz` |
| `admin/src/locales/*/common.json` | — | `admin@uchqun.com` | UI placeholder uses `.com` |
| `teacher/src/parent/pages/Help.jsx` | 44 | `uchqunplatform.com` | Different domain entirely |
| `admin/src/locales/en/common.json` | 176-177,191 | mixed English+Uzbek | English strings contain "davlat" |

### 1.4c — Hardcoded Railway URL (active code)

| File | Line | URL |
|------|------|-----|
| `teacher/vite.config.js` | 10 | `uchqun-production-2d8a.up.railway.app` |
| `backend/controllers/parent/parentAIController.js` | 115,162,185 | `uchqun-production-2d8a.up.railway.app` |

---

## 1.5 — Docs/READMEs vs Code Reality

### README.md (`/README.md`)
- States "The platform is web-only (no mobile app)" ✅ accurate
- States "no in-platform payment processing" ✅ accurate
- Port table: 5173/5174/5175/5177 ✅ matches server.js
- Mentions `backend/ARCHITECTURE.md` with "(if present)" — file does not exist. No issue flagged but the hedging language is a sign of documentation rot.

### CLAUDE.md (`/CLAUDE.md`)
- Role hierarchy accurate ✅
- Port table accurate ✅
- Auth flow accurate ✅
- Backend structure counts: "41 controllers", "36 migration files", "34 models", "25 route files" — actual current counts are 37 controllers, 37 migrations, 37 models, 26 route files. **Small count drift** from documentation.
- References `middleware/csrf.js` as deleted ✅ (no longer present)

### docs/internal/PROJECT_GUIDE.md
- Line 21: shows repo tree with `uchqun/` as root folder — this matches the local Windows path (`c:\work\Uchqun\`) ✅
- Line 284: Railway URL `uchqun-production.up.railway.app` — **differs from hardcoded URL in actual code** (`uchqun-production-2d8a.up.railway.app`)
- Model count listed as 34 — actual is 37
- Route count listed as 25 — actual is 26

### plan.md
- Documents all three structural decisions as complete ✅ accurate
- References `superAdminRoutes.js` as having been fixed (SHA256 comparison) — that file is now deleted, so the history reference is accurate
- References `SuperAdmin.jsx` (1,724 lines) being broken into components — that file is no longer present ✅

### AUDIT_REPORT.md (root)
- This file is from **before the 2026-05-06 pivot** and contains 107 findings, many of which reference code that no longer exists:
  - C-01 (missing `emotionalMonitoringRoutes.js`) — resolved differently (consumed inline)
  - C-06 (payment callback) — resolved (payment system deleted entirely)
  - C-09 (infinite loop in `Payments.jsx`) — resolved (payments removed)
  - C-10 (hooks violation in `Activities.jsx`) — PARTIALLY — the mobile screen `ParentDetailScreen.js` is gone, but the web `Activities.jsx` may still have the issue (to check in Phase 4)
  - C-11 (mobile TherapyScreen) — resolved (mobile removed)
  - C-12 (super-admin AuthContext) — resolved (super-admin app removed)
  - H-04 (business routes reject business role) — UNKNOWN — needs verification in Phase 2
  - H-16 (no Vite proxy in 4 apps) — partially addressed (see Phase 4)
  - H-20 (`npm start` missing `server.js`) — **STILL PRESENT**: every app now has a `server.js` for deployment
  - Multiple findings about mobile screens — resolved (mobile removed)
  
  **Conclusion:** AUDIT_REPORT.md is partially accurate but dangerously stale. It should be archived or replaced.

---

## 1.6 — Scoring: Naming Coherence % and Drift %

**Naming Coherence:** How consistently is the intended name used across all surfaces?

| Surface | Coherent | Drifted |
|---------|---------|--------|
| Platform brand "Uchqun" | ✅ | — |
| Package names | 4/5 consistent | teacher has `-frontend` suffix |
| Backend role strings (`government`, `admin`, etc.) | ✅ all 6 correct | — |
| Frontend role flags (`isGovernment`, etc.) | mostly ✅ | `isTeacher` includes admin role |
| i18n namespaces | ✅ most areas | government app uses `superAdmin` namespace |
| UI visible strings for government role | ✅ (Davlat/Government) | — |
| i18n KEY names for government | ❌ `contactSuperAdmin`, `superAdminReply` | Keys say superAdmin, values say government |
| Email domains | ❌ four domains in use | — |
| Backend Railway URLs | ❌ three URL variants | — |
| App branding strings | partial | "Admin Panel" vs "Admin", "Portal" vs "Teacher" |
| Docs/code parity | ⚠ | minor count drift, one stale Railway URL |

---

## Issues Catalog

| ID | Location | Description | Severity | Confidence |
|----|----------|-------------|----------|------------|
| 01-001 | `admin/src/__tests__/utils.test.js:34,113` | Test asserts `getRoleLabel('super-admin')` → 'Super Admin'. The string `'super-admin'` is not a valid DB role ENUM value and never was. Test is testing a dead code path. | high | 100% |
| 01-002 | `admin/src/locales/en/common.json:176-177,191` | English locale strings contain Uzbek word "davlat": `"send a message to davlat"`, `"Davlat reply"`. Mixed-language English locale. | medium | 100% |
| 01-003 | `teacher/src/parent/pages/Help.jsx:44` | Support email shown to parents is `support@uchqunplatform.com` — a domain not used anywhere else in the system and likely non-existent. | high | 95% |
| 01-004 | `teacher/vite.config.js:10` | Hardcoded fallback Railway URL `uchqun-production-2d8a.up.railway.app` differs from URLs in `env.example` and `PROJECT_GUIDE.md`. If `VITE_API_URL` unset in production, wrong backend is called. | high | 90% |
| 01-005 | `backend/controllers/parent/parentAIController.js:115,162,185` | Same wrong/stale Railway URL as 01-004 hardcoded as HTTP-Referer header (×3). | medium | 90% |
| 01-006 | Government app — all 6 tab components | All government dashboard tabs use `t('superAdmin.xxx')` i18n key namespace. The namespace should be `government` or similar. This is a direct legacy naming artifact. | medium | 100% |
| 01-007 | `government/src/locales/*/common.json` (×3) | All three locale files define a `"superAdmin"` top-level key block used exclusively by the government app's Platform page. Key name references defunct role. | medium | 100% |
| 01-008 | `admin/src/locales/*/common.json`, `reception/public/locales/*/common.json`, `teacher/src/locales/*/common.json` | i18n keys `contactSuperAdmin`, `sendToSuperAdmin`, `superAdminReply` are used with correct Uzbek/Russian values ("Davlat...") but wrong key names. | low | 100% |
| 01-009 | `backend/utils/telegram.js:145` | Telegram notification body sent to admins says "super-admin tomonidan tasdiqlandi" (approved by super-admin). Should say "davlat tomonidan" (by government). | low | 100% |
| 01-010 | `backend/utils/email.js:94` | Email body says "super-admin bilan bog'laning" (contact super-admin). Should say "davlat bilan bog'laning". | low | 100% |
| 01-011 | `backend/env.example:30` | Env var `SUPER_ADMIN_SECRET_KEY` documented but no code reads it in current backend — was used by deleted `superAdminRoutes.js`. Dead env var documentation. | low | 95% |
| 01-012 | `backend/controllers/admin/adminUserController.js:285,332` | Functions `updateGovernmentBySuper` and `deleteGovernmentBySuper` have misleading "BySuper" suffix — there is no super role anymore; government IS the super role. | low | 100% |
| 01-013 | `backend/scripts/create-admin.js:14`, `create-government.js:14`, `reset-admin-password.js:15` | Default email addresses use `@uchqun.com` while all other infrastructure uses `@uchqun.uz`. | low | 100% |
| 01-014 | `teacher/package.json:2` | Package name `uchqun-teacher-frontend` uniquely uses the `-frontend` suffix. All other packages are `uchqun-{role}`. | low | 100% |
| 01-015 | `teacher/public/locales/uz/common.json:13`, `ru/common.json:13` | App title in teacher public locales is "Uchqun Portal" — does not match "Uchqun Teacher" used elsewhere in the teacher app. | low | 100% |
| 01-016 | `backend/controllers/parent/parentAIController.js:116,163,186` | `X-Title` HTTP header sent to OpenRouter is "Uchqun Parent Portal" — inconsistent with "Uchqun Parent" used in parent locales. | low | 100% |
| 01-017 | `backend/controllers/receptionController.js:272,826` | Hardcoded fallback string `'Uchqun School'` used as default school name when creating a child — will appear in real data if the field is omitted. | medium | 100% |
| 01-018 | `shared/context/AuthContext.jsx:62` | `isTeacher: user?.role === 'teacher' || user?.role === 'admin'` — admin is treated as a teacher for route guarding. Undocumented blurring of role identity. | medium | 90% |
| 01-019 | `docs/internal/PROJECT_GUIDE.md:284` | Railway URL `uchqun-production.up.railway.app` does not match hardcoded URL in code (`uchqun-production-2d8a.up.railway.app`). Doc references stale/incorrect URL. | medium | 85% |
| 01-020 | `AUDIT_REPORT.md` (root) | Pre-pivot audit report references mobile screens, payment controller, and super-admin app — none of which exist. Actively misleading if followed. | high | 100% |

---

## Metrics Scorecard

| Metric | Score | Justification |
|--------|-------|--------------|
| Messiness | 38% | (1) 50+ locations with "super-admin" naming artifacts; (2) four different email domains; (3) three different Railway URL variants for one service |
| Technical Debt | 42% | (1) i18n key names say `superAdmin` while values say "Government/Davlat" — renaming requires changes across all 4 frontends simultaneously; (2) `admin/src/__tests__/utils.test.js` tests a role string that doesn't exist in the DB ENUM |
| Health | 65% | (1) The platform brand "Uchqun" is consistently applied at package and domain level; (2) role strings in the DB ENUM and auth middleware are correct — the drift is naming-only, not functional |
| Coherence | 40% | (1) Government app uses `superAdmin` i18n namespace throughout; (2) English locale contains Uzbek words; (3) four email domains with no canonical |
| Documentation Coverage | 55% | (1) CLAUDE.md and README.md are reasonably current and accurate; (2) AUDIT_REPORT.md is stale and misleading — a significant negative weight |
| Test Coverage (naming) | 35% | (1) Auth tests cover role strings correctly; (2) `utils.test.js` tests a non-existent `super-admin` role — the test passes only because the function has a default branch, not because the role is valid |
| Risk-on-Touch | 45% | (1) Renaming the `SuperAdminMessage` model requires a DB migration to rename the table — non-trivial blast radius; (2) renaming i18n keys across 6 government tab components must be done atomically or the UI breaks |

**Overall Phase 1 Average: 46%** — Naming coherence is the lowest-scoring area so far, driven entirely by the super-admin ghost and the domain fragmentation.

---

## Open Questions for the User

1. **Canonical domain:** Is `uchqunedu.uz` the definitive production domain? If so, should all email addresses (`noreply@`, scripts, placeholders) use `@uchqunedu.uz`, and should `uchqun.uz`, `uchqun.com`, and `uchqunplatform.com` be retired?

2. **`support@uchqunplatform.com` (Help page):** Is this a real support email mailbox? If not, what is the correct support contact to show parents?

3. **`SUPER_ADMIN_SECRET_KEY` env var:** Is this still set in Railway production env? It can be deleted from all Railway services since the code that consumed it (`superAdminRoutes.js`) has been removed. Confirm before cleanup.

4. **`super_admin_messages` table rename:** Renaming this to `government_messages` requires a DB migration. Given the table has data and is actively written to, this needs to be a safe ALTER TABLE RENAME. Is this acceptable to do in the remediation phase?

5. **`isTeacher` including admin role (in `shared/context/AuthContext.jsx:62`):** Is this intentional behavior — i.e., do admins need to see teacher-only UI in the teacher app? Or is this a leftover from before admin had its own app?

6. **Railway URL canonical form:** Three URL variants exist in code. Which is the live Railway URL: `uchqun-production.up.railway.app`, `uchqun-production-2d8a.up.railway.app`, or `uchqun-production-up.railway.app`?

7. **AUDIT_REPORT.md:** Should it be archived to `docs/internal/` or deleted to prevent confusion? It cannot be updated to current state within this audit (read-only engagement).

---

## What I Did NOT Look At

- Binary/image files in `teacher/public/avatars/`
- Full contents of every locale file (only the structure and selected values were read)
- Git history for when each naming artifact was introduced
- Live Railway project names or environment variable values (requires dashboard access)
- All 37 migration files for naming patterns (only relevant ones were sampled)
