# Beta Defect Log
**S14 / BETA-VERIFICATION**
**Opened:** 2026-06-08
**Rule:** DO NOT FIX here — find, record, classify only. Fixes are follow-up sessions.

## Severity Scale
- **P0** — Blocks a task entirely (user cannot proceed)
- **P1** — Wrong or confusing (user proceeds with incorrect information or unexpected behaviour)
- **P2** — Will break: fragility, slow >3s response, console errors, data inconsistency

## Template
```
### DEF-NNN — [Title]
- **Severity:** P0 / P1 / P2
- **Persona:** role + account
- **Portal:** Teacher / Parent / Admin / Reception / Government
- **Wave:** 1–6
- **Feature ID:** T-xxx / P-xxx / A-xxx / R-xxx / G-xxx
- **Repro:**
  1. Step 1
  2. Step 2
- **Expected:** what should happen
- **Actual:** what happens instead
- **Screenshot:** screens/DEF-NNN-*.png
- **Console errors:** (paste or "none")
- **Network:** (relevant API call + status code)
- **Suspected layer:** Frontend / Backend / Data / Config
```

---

## Pre-Test Known Issues (from STEP 0 matrix)

### DEF-005 — 3 beta accounts have changed passwords (blocked Wave 1 start)
- **Severity:** P1
- **Persona:** reception1, teacher2, gov.republic
- **Portal:** Reception / Teacher / Government
- **Wave:** 1, 2, 6
- **Feature ID:** Infrastructure
- **Repro:** Login as reception1@uchqun.uz with Test@2026 → "Email yoki parol noto'g'ri"
- **Root cause:** Passwords for reception1, teacher2, gov.republic were changed via Settings page during S6–S9 sprint testing. The hash in Railway DB diverged from the seed-02.sql hash. Confirmed via bcrypt comparison (2026-06-08).
- **Fix:** Migration `20260608000001-reset-beta-test-account-passwords.js` resets all three to Test@2026. Pushed to Railway — will run on next deploy.
- **Screenshot:** screens/R-001-login-fail-reception1.png (from Wave 1 first run failure)
- **Suspected layer:** Data (password changed via app during previous sprint)

### DEF-001 — Teacher count: only 8 teacher accounts, spec requires 16
- **Severity:** P1
- **Persona:** Test infrastructure
- **Wave:** 2
- **Feature ID:** F-001 (scope finding)
- **Detail:** Only teacher1–teacher8 exist in Railway DB. The Wave-2 "other 8 teachers run attendance + one content action" sub-wave cannot execute. All 8 seeded teachers will run full days instead. Seeder needs to add teacher9–teacher16 before next beta cycle.
- **Suspected layer:** Data (seeder gap)

### DEF-002 — School 1 has no groups seeded
- **Severity:** P1
- **Persona:** reception1 (S1)
- **Wave:** 1
- **Feature ID:** F-002 (scope finding)
- **Detail:** School 1 children exist but are unassigned to any group. Reception1 must create a group as the first Wave-1 step. If group creation (R-052) fails, Wave-1 child onboarding for S1 is blocked (P0 cascade).
- **Suspected layer:** Data (seeder gap)

### DEF-003 — P-011: Parent Sidebar.jsx — dead code, never rendered
- **Severity:** P1
- **Persona:** parent (all)
- **Wave:** 3
- **Feature ID:** P-011
- **Detail:** Sidebar.jsx is implemented with 10 items, badges, and footer but is NOT imported in Layout.jsx. It is dead code that will never render.
- **Suspected layer:** Frontend
- **Status:** ✅ FIXED (S18) — deleted by PP-IA-REDESIGN commit `4b01e1af` (2026-06-06)
- **Decision: DELETE** — chosen because every Sidebar destination is reachable through the current live navigation. No parent destination was lost.
- **Side-by-side (12 Sidebar routes vs live nav):**
  - `/child` — MobileTabBar "Child" tab + DesktopTopNav ✅
  - `/irr` — `/child` Bola hub → "Plan & progress" section (HubRow → TrendingUp) ✅
  - `/activities` — `/child` Bola hub → "Plan & progress" section ✅
  - `/attendance` — `/child` Bola hub → "Plan & progress" section ✅
  - `/journal` — MobileTabBar "Diary" tab + DesktopTopNav ✅
  - `/meals` — `/child` Bola hub → "Plan & progress" section ✅
  - `/media` — MobileTabBar "Gallery" tab + DesktopTopNav ✅
  - `/rating` — DesktopTopNav secondary + `/child` hub "School relations" section ✅
  - `/therapy` — `/child` Bola hub → "Plan & progress" section ✅
  - `/chat` — MobileTabBar "Messages" tab + DesktopTopNav ✅
  - `/notifications` — MobileTopBar Bell icon (mobile) + DesktopTopNav Bell icon (lg+) ✅
  - `/settings` — DesktopTopNav secondary + `/child` hub "Account" section ✅
  - Note: `/` (Dashboard/Today) was NOT in the old Sidebar but IS in MobileTabBar ✅
- **Residual import check:** `grep -r "import.*Sidebar" teacher/src/parent/` → zero results. Only inline JSX comments `{/* Sidebar */}` remain in Media.jsx:711 and TeacherRating.jsx:532 (describing layout regions, not the deleted component).
- **Context:** The feature catalog (compiled 2026-05-30, commit `6c34f4faba`) captured Sidebar.jsx in its dead-code state. PP-IA-REDESIGN (2026-06-06) deleted it and restructured the parent IA: 5-tab bottom bar (MobileTabBar) + horizontal top nav (DesktopTopNav) + deep links consolidated into the /child Bola hub page (ChildProfile.jsx). DEF-003 filed during beta audit reflected a state that had already been fixed by the time S18 ran.
- **Matrix row:** P-011 NOT flipped to PASS — re-verification is a separate phase.

### DEF-004 — G-050: canRateSchools i18n key missing
- **Severity:** P1
- **Persona:** gov.republic (provisioning secondary users)
- **Wave:** 6
- **Feature ID:** G-050
- **Detail:** `provision.grants.canRateSchools` is missing from UZ/RU/EN locale files. The capability checkbox label renders as the raw key string.
- **Suspected layer:** Frontend (i18n)
- **Status:** ✅ FIXED (S19) — already resolved by commit `7b1a39b9` (2026-06-06), before S19 ran
- **Root cause (verified):** All 12 `provision.grants.*` keys were absent from `government/src/locales/{uz,ru,en}/common.json`. Commit `7b1a39b9` added all 12 keys to all three locales. No stale `government/public/locales/` tree was found — `government/src/i18n.js` uses bundled static imports (no HTTP fetch, no `i18next-http-backend`), so there was no stale public tree to delete.
- **All 12 keys confirmed present post-fix (Node.js read of locale files, 2026-06-08):**
  - UZ: `canRateSchools` → "Maktablarni Baholash"; `canArchiveSchools` → "Maktablarni Arxivlash"; `canManageAdmins` → "Direktorlarni Boshqarish"; `canViewAuditLog` → "Audit Jurnalini Ko'rish"; (+ 8 others) ✅
  - RU: `canRateSchools` → "Оценивать Школы" ✅
  - EN: `canRateSchools` → "Rate Schools" ✅
- **Proof (Playwright 4/4 PASS — `tests/def004-provision-grants-proof.spec.js`):**
  - Test 1: `gov.republic@uchqun.uz` cold login (no cookies) → leaves `/login` ✅
  - Test 2: Navigate to Platform → "Davlat foydalanuvchilari" tab → visible ✅
  - Test 3: Select `secondary` account type — 12 grant checkboxes render translated labels; zero raw camelCase keys (`canRateSchools`, etc.) in form text; UZ spot-checks pass ("Baholash", "Arxivlash", "Boshqarish", "Jurnalini"); `canRateSchools` label "Maktablarni Baholash" is visible ✅
  - Test 4: Switch to RU — zero raw keys in form text ✅
- **Cold-load screenshots:**
  - `screens/DEF-004-gov-republic-login.png` — cold login at government portal
  - `screens/DEF-004-gov-users-tab.png` — "Davlat foydalanuvchilari" tab active, showing Davlat Hisoblar (4) list
  - `screens/DEF-004-grants-checkboxes.png` — "Ikkinchi darajali" selected; "Maktablarni Baholash" and "Maktablarni Ko'rish" visible as translated labels
  - `screens/DEF-004-canRateSchools-translated.png` — canRateSchools label confirmed visible as translated text (not raw key)
  - `screens/DEF-004-grants-ru.png` / `DEF-004-grants-ru-nokeys.png` — RU locale, no raw keys
- **Matrix row:** G-050 NOT flipped to PASS — re-verification is a separate phase.

---

## Wave 1 Defects (Reception)
<!-- Populated during testing -->

## Wave 2 Defects (Teacher)

### DEF-006 — teacher2 has mustChangePassword=True; Wave 2 S2 teacher2 blocked
- **Severity:** P1
- **Persona:** teacher2
- **Portal:** Teacher
- **Wave:** 2
- **Feature ID:** T-001
- **Repro:**
  1. Login as teacher2 with Test@2026
  2. App redirects to `/teacher/change-password`
  3. All teacher features (attendance, chat) inaccessible until password is changed
- **Expected:** teacher2 lands on teacher dashboard and can mark attendance
- **Actual:** Redirected to change-password page; Wave 2 S2 teacher2 sub-test aborted
- **Screenshot:** screens/T-001-teacher2-mustChangePassword-blocked.png
- **Console errors:** none
- **Network:** POST /api/auth/login returns `{ mustChangePassword: true }`
- **Suspected layer:** Data — migration `20260608000001` reset `password` column but not `mustChangePassword` flag for teacher2
- **Status:** ✅ FIXED (S17) — migration commit `58ac80a6`
- **Root cause (verified):** Migration `20260608000001` that reset teacher2's password to `Test@2026` did not include a `mustChangePassword = false` clause. The CP-021 gate in `middleware/auth.js:120-130` correctly checks `user.mustChangePassword` and returns 403 `PASSWORD_CHANGE_REQUIRED` for any non-allowed path. Gate logic was correct; the stale flag was a data issue only.
- **Fix:** Idempotent migration `20260608000002-clear-teacher2-must-change-password.js` — UPDATE scoped exactly to `teacher2@uchqun.uz WHERE mustChangePassword = true`. Ran on Railway on auto-deploy of commit `58ac80a6`.
- **Before (DB query, 2026-06-08):** `teacher2@uchqun.uz` → `mustChangePassword: True`
- **After (DB query, 2026-06-08):** `teacher2@uchqun.uz` → `mustChangePassword: False` ✅
- **Gate code unchanged:** `middleware/auth.js:120-130` — checks `user.mustChangePassword`, returns 403 `PASSWORD_CHANGE_REQUIRED` for non-allowed paths. Confirmed present by Playwright test 4.
- **Flagged accounts not cleared:** `testr077.s9@uchqun.uz` and `testwizard3.s8@uchqun.uz` retain `mustChangePassword: True` — they are sprint test accounts, not beta fleet.
- **Proof (Playwright 4/4 PASS — `tests/def006-must-change-password-proof.spec.js`):**
  - Test 1: teacher2 login URL → `/teacher` (not `/change-password`) ✅
  - Test 2: post-login screenshot shows teacher dashboard (Doniyor opa/aka · 3/3 keldi) ✅
  - Test 3: POST `/api/v1/auth/login` for teacher2 returns `{ success: true, user: { mustChangePassword: false } }` ✅
  - Test 4: `middleware/auth.js` contains `user.mustChangePassword`, `PASSWORD_CHANGE_REQUIRED`, and `ALLOWED_PATHS` — gate is intact ✅
- **Cold-login screenshot:** `screens/DEF-006-teacher2-dashboard.png` — teacher portal dashboard, nav visible (Bugun · Bolalar · Reja · Xabar · Men · Sozlamalar), no change-password redirect

### DEF-007 — i18n: attendance status keys and quickObs keys missing from teacher locale
- **Severity:** P1
- **Persona:** teacher (all)
- **Portal:** Teacher
- **Wave:** 2
- **Feature ID:** T-026–T-029, T-046
- **Repro:**
  1. Navigate to `/teacher/attendance` → status labels render as raw i18n keys (`attendance.statusPresent`, `attendance.statusHomeLeave`, etc.)
  2. Open QuickObservation FAB → all modal text renders as raw keys (`quickObs.save`, `quickObs.selectChild`, etc.)
- **Expected:** Localized Uzbek labels ("Bor", "Uyda", "Kasal", "Shifoxonada", "Yo'q", "Saqlash")
- **Actual:** Raw i18n key strings displayed to user
- **Screenshot:** (captured during T-026 and T-046 runs)
- **Console errors:** none (i18next silently falls back to key name)
- **Network:** none
- **Suspected layer:** Frontend — `teacher/public/locales/uz/common.json` uses old keys (`statePresent`/`stateLate`) while attendance component uses `statusPresent`/`statusHomeLeave`; no `quickObs` section (component uses `quickObs.*`, i18n has `observation.*`)
- **Status:** ✅ CLOSED (S15)
- **Corrected root cause:** The suspected layer description was wrong. `teacher/public/locales/` is NEVER loaded at runtime — no `i18next-http-backend`, no `loadPath`, no HTTP fetch in `teacher/src/i18n.js`. The runtime path is bundled static imports (`import portalUz from './locales/uz/common.json'` at line 9). The `teacher/src/locales/{uz,ru,en}/common.json` files have had all correct keys since commit `6b8daf02`. The raw keys seen during the beta run were a stale browser cache serving an older JS bundle; hard refresh loaded the current bundle.
- **Locale verification:** `node scripts/check-locale-completeness.mjs --portal=teacher` → ✅ PASS — 866 keys, all present in UZ, RU, EN. Confirmed values: `attendance.statusPresent` → "Bor"/"Присутствует"/"Present"; `quickObs.title` → "Yangi kuzatuv"/"Новое наблюдение"/"New observation".
- **Cold-load proof (S15):** Playwright test `tests/def007-cold-load-proof.spec.js` ran against production (`https://teacher-production-0647.up.railway.app`) on a fresh incognito context (no cookies, no cached JS). 3/3 PASS. Screenshots: `audits/beta/screens/DEF-007-attendance-cold.png` (filter chips: Bor·2 / Uyda·0 / Kasal·0 / Shifoxonada·0 / Yo'q·0) and `audits/beta/screens/DEF-007-quickobs-modal-cold.png` (modal: Yangi kuzatuv / Maqsad tanlang / Yangi / Yordam bilan / Mustaqil / Mahorat / Bekor / Saqlash). Zero raw keys in either screenshot.
- **Cache-bust guarantee:** Vite builds produce content-hashed JS/CSS filenames (`index-CGsAwfX9.css`, `index-CZzkUnzp.js`). `index.html` references hashed filenames; a build change always produces a new filename. `netlify.toml` and `vercel.json` updated to serve `index.html` with `Cache-Control: no-cache, no-store, must-revalidate` (explicit, not reliant on host default). `/assets/*` retains `immutable, max-age=31536000`. A cold browser on demo day will always get the current bundle.
- **Stale public tree deleted:** `teacher/public/locales/` (contained old keys `statePresent`/`stateLate`, no `quickObs.*` section) was never loaded but was a latent reintroduction risk. Deleted in this commit.
- **Fix commit:** see commit message referencing DEF-007

### DEF-008 — Intermittent session loss after T-001→T-003 re-login chain
- **Severity:** P2
- **Persona:** teacher1
- **Portal:** Teacher
- **Wave:** 2
- **Feature ID:** T-008
- **Repro:**
  1. T-001: login teacher1 → `/teacher`
  2. T-002: goto `/login`, interact with UI, re-login → `/teacher`
  3. T-003: goto `/login`, interact with language switcher, re-login → `waitForURL` resolves at `/teacher`
  4. T-008: `page.goto('/teacher')` → URL resolves to `/login` (session lost)
- **Expected:** Session persists; dashboard loads at `/teacher`
- **Actual:** Session invalidated; ProtectedRoute redirects to `/login`
- **Screenshot:** screens/T-008-dashboard.png (shows login page)
- **Console errors:** none observed
- **Network:** `/api/auth/me` likely returns 401 — probable race: concurrent in-flight `/auth/me` (from page reload in login helper) and `/auth/login` form submit may leave AuthContext in inconsistent state
- **Suspected layer:** Frontend (AuthContext race condition in `createAuthContext.jsx` — concurrent `/auth/me` and `/auth/login` settle order is non-deterministic)

## Wave 3 Defects (Parent)

### DEF-009 — parent6 login intermittently fails (URL stays at /login)
- **Severity:** P1
- **Persona:** parent6 (`parent6@uchqun.uz`)
- **Portal:** Parent (teacher-production-0647)
- **Wave:** 3
- **Feature ID:** P-001
- **Repro:**
  1. Login as parent6@uchqun.uz with Test@2026
  2. After `waitForURL` (25 s timeout) + `waitForLoadState('networkidle')`, URL is still `/login`
- **Expected:** Redirected to `/` (parent dashboard)
- **Actual:** Stays at `/login`; all subsequent parent features blocked for parent6
- **Screenshot:** screens/P-001-parent6-login-failed.png
- **Console errors:** none observed
- **Network:** POST /api/auth/login likely returned an error response — but DB shows account is active, `isActive=true`, `mustChangePassword=false`, `status=active`; no DB-level block. Suspected Railway cold-start or transient 500 on the backend.
- **Suspected layer:** Backend (intermittent Railway cold-start or transient DB error during login for this account)

### DEF-010 — PrivacyConsentModal blocks all parent interactions on first login
- **Severity:** P0
- **Persona:** parent (all, first login)
- **Portal:** Parent (teacher-production-0647)
- **Wave:** 3
- **Feature ID:** P-001 (and all subsequent parent features)
- **Repro:**
  1. Login as any parent account for the first time (no prior consent recorded)
  2. PrivacyConsentModal (`role="dialog"`, `aria-labelledby="privacy-consent-title"`) appears at `z-[60]` covering the full viewport
  3. Any tap/click below the modal is intercepted by the overlay
- **Expected:** Consent modal is dismissed after pressing the accept button, then the app is fully interactive
- **Actual:** On first login, all taps go to the modal overlay until explicitly dismissed; any UI test or user action will silently fail until the modal is closed
- **Screenshot:** (captured during W3-S1 P-001 run — modal visible)
- **Console errors:** none
- **Network:** POST /api/parent/privacy-consent (or similar) fires when accepted
- **Suspected layer:** Frontend — expected UX for first-login consent, but P0 because automation and naive users cannot interact with the app until modal is dismissed; no "dismiss" affordance other than the accept button
- **Status:** ✅ FIXED (S16) — commit 5b0098ab
- **Root cause (verified):** `PrivacyConsentModal.jsx` used a single flat `overflow-y-auto` container for all content (header + policy sections + action buttons). The entire modal scrolled as one unit. At short viewports (360×640, 90vh = 576px), the long policy text pushed the accept button below the fold. No visible scroll indicator on mobile means most users never discover the button.
- **Fix:** Restructured to `flex flex-col` with two zones: (1) `flex-1 overflow-y-auto` scrollable policy body (header, intro, both consent sections) and (2) `shrink-0` pinned footer (accept/decline buttons + footnote) that never scrolls off screen. On mobile, the sheet anchors to the bottom edge (`items-end`) so the footer is the first element visible above the keyboard. On `sm+` viewpoints it centres as a card. Consent logic (POST, checkbox gates, error display) unchanged.
- **Proof (Playwright, route-intercepted — forced re-show, noted per S16 spec):** `tests/def010-modal-layout-proof.spec.js`, 7/7 PASS
  - `DEF-010-390-button-visible.png`: 390×844 — accept button bounding box confirmed within viewport; policy text visible and scrollable above pinned footer
  - `DEF-010-640-button-visible.png`: 360×640 — accept button bounding box confirmed within 640px viewport even with truncated (scrollable) policy body
  - `DEF-010-390-dashboard-after-accept.png`: after clicking accept the modal dismissed and parent dashboard ("Bugungi xulosa") rendered fully interactive
- **Matrix rows:** P-001 and downstream parent rows NOT flipped to PASS — re-verification in the next verification-rebuild phase.

## Wave 4 Defects (Admin)
<!-- Populated during testing -->

## Wave 5 Defects (Region Gov)
<!-- Populated during testing -->

## Wave 6 Defects (Republic Gov)
<!-- Populated during testing -->

## Cross-Cutting Defects (Step 2)

### UX-01 — Destructive actions execute without confirmation modal

- **Severity:** P2
- **Portals affected:** Admin (Reception Management), Reception (Teacher / Parent / Group Management)
- **Wave:** Cross-cutting (discovered during pre-S20 audit)

**Pre-fix inventory (S20 audit results):**

| Portal    | Page                | Action                    | Pre-fix state                                      |
|-----------|---------------------|---------------------------|----------------------------------------------------|
| Admin     | Reception Mgmt      | Delete receptionist       | ⚠️ Shared ConfirmDialog used but **name missing** — message showed generic text, no entity name |
| Reception | Teacher Mgmt        | Delete teacher            | ⚠️ Shared ConfirmDialog used but **name missing**, **no group-unassignment warning** |
| Reception | Parent Mgmt (indiv) | Delete parent             | ❌ Hand-rolled inline modal — **silently dropped `warning` field**, had no `role="dialog"` |
| Reception | Parent Mgmt (child) | Delete child              | ⚠️ Shared ConfirmDialog but **name missing** |
| Reception | Parent Mgmt (bulk)  | Bulk delete parents       | ⚠️ Shared ConfirmDialog but **no `warning` field** set |
| Reception | Group Mgmt          | Delete group              | ⚠️ Shared ConfirmDialog used but **name missing**, **no children-reassignment warning** |

**Fix (commit `13129a92`, S20):**
- Admin → ReceptionManagement: `handleDeleteReception` now looks up name from state and passes `{{name}}` to i18n message.
- Reception → TeacherManagement: `handleDelete` now looks up name; `warning` field added with group-unassignment note.
- Reception → ParentManagement (individual): replaced hand-rolled inline modal with `<ConfirmDialog>` (gains `role="dialog"` + `warning` rendering); `handleDelete` now looks up name; `handleDeleteChild` looks up child name + adds warning.
- Reception → ParentManagement (bulk): `warning: t('parentsPage.bulkDeleteWarning')` now passed.
- Reception → GroupManagement: `handleDelete` now looks up group name; `warning` field added with children-reassignment note.
- Locale keys added to uz/ru/en for all 6 new message strings (confirmDelete, confirmDeleteWarning per action).

**Proof (Playwright, 9/9 PASS, cold production, S20 + S20-close):** `tests/ux01-confirm-dialogs-proof.spec.js`

*uz (default locale):*
- `UX-01-admin-reception-delete-modal.png` — admin portal: dialog shows "Iroda Abdullayeva" + red warning; Cancel closes it
- `UX-01-admin-reception-after-cancel.png` — **row count unchanged + first row still visible** after Cancel (asserted)
- `UX-01-reception-teacher-delete-modal.png` — teacher name + group-unassignment warning in red
- `UX-01-reception-teacher-after-cancel.png` — **card count unchanged + teacher card still visible** (asserted)
- `UX-01-reception-parent-delete-modal.png` — `role="dialog"` confirmed (shared ConfirmDialog, not old inline); name + warning
- `UX-01-reception-parent-bulk-delete-modal.png` — count "1" in message; red soft-delete warning visible
- `UX-01-reception-parent-bulk-after-cancel.png` — **row count unchanged + first row still visible** after bulk Cancel (asserted)
- `UX-01-reception-group-delete-modal.png` — group name in message + children-reassignment warning in red
- `UX-01-reception-group-after-cancel.png` — **card count unchanged + group card still visible** (asserted)

*Non-default locales (DEF-004 lesson — keys hide in non-default locales):*
- `UX-01-reception-teacher-delete-modal-ru.png` — ru: "Удалить аккаунт воспитателя «Shahnoza Ergasheva»?" + Russian warning with group note; no raw keys
- `UX-01-reception-teacher-delete-modal-en.png` — en: "Delete teacher account \"Shahnoza Ergasheva\"?" + English warning with group note; no raw keys
- `UX-01-reception-parent-bulk-delete-modal-ru.png` — ru bulk: translated message + Russian soft-delete warning; no raw keys
- `UX-01-reception-parent-bulk-delete-modal-en.png` — en bulk: translated message + English soft-delete warning; no raw keys

*Confirm path (actual deletion):* DEFERRED to verification-rebuild phase against disposable test data — no mutations on production.

**Matrix rows:** NOT flipped to PASS — re-verification in next verification-rebuild phase.

**Status:** ✅ FIXED (S20, closed S20-close) — fix commit `13129a92`; proof commits `87709e0e`, `HEAD`

## Tenant Isolation Defects (Step 3)
<!-- Any isolation breach found during hostile probes -->
