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
- **S22-V4 update (2026-06-11):** Backend theory **refuted** — 36/36 parent API logins hard-pass across three sweeps (12 accounts × 3 runs, HTTP 200 + `/auth/me` role=parent, `tests/s22v4-probe.spec.js`). The defect is a **client-side race** and it reproduces reliably: parent3's UI form login succeeded (login 200, navigated to `/`) but the app bounced back to `/login` within ~1–5 s in **2 of 3** attempts (evidence: `screens/S22V4-P-001-def009-bounce-to-login.png`). Debug trace shows the login page fires `/auth/me` → 401 → interceptor `/auth/refresh` → 401 **before** login; when that chain resolves after the successful login navigation, the unauthenticated handler clears auth and redirects — explaining the intermittent "stays at /login" symptom across different parent accounts (originally parent3/6/7/10/12). Suspected layer revised: **Frontend** — `shared/services/api.js` onUnauthenticated handler racing a concurrent successful login. Severity stays **P1**; matrix P-001 set to FAIL. Still OPEN (find-and-record only this session).

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

### DEF-011 — P0: child_attendance.status column stuck on old enum; sick/home_leave/hospitalized saves silently fail

- **Severity:** P0
- **Persona:** All teachers (any status other than present/absent/late/excused)
- **Portal:** Teacher
- **Wave:** 2 (T-026–T-032)
- **Feature ID:** T-026–T-032

**Root cause:** Migration `20260606000001-update-attendance-status-enum.js` (2026-06-06) failed partway through. It successfully:
- renamed the old enum to `enum_child_attendance_status_old` (`present/absent/late/excused`)
- created the new enum `enum_child_attendance_status` (`present/absent/home_leave/sick/hospitalized`)

but crashed before the `ALTER COLUMN` step because it tried `UPDATE child_attendance SET status = 'sick' WHERE status = 'excused'` — an invalid assignment: `sick` is not a member of `enum_child_attendance_status_old`. Because migrate.js silently swallows errors matching "already exists" (the second deploy attempt hit that pattern on the RENAME step), the migration was marked complete in `SequelizeMeta` without having altered the column. The column stayed on `enum_child_attendance_status_old`, blocking DB-level saves for `sick`, `home_leave`, and `hospitalized`.

The attendanceController validated statuses against `VALID_STATUSES = ['present', 'absent', 'home_leave', 'sick', 'hospitalized']`, so the application layer correctly accepted these values — but the DB rejected them with a constraint violation. The per-row `catch` in `createAttendance` converted this to `ATTENDANCE_SAVE_FAILED` error codes returned in the response body (HTTP 201, partial save). No 500 was raised, making the failure invisible without inspecting the response body.

**Impact:** Any teacher marking a child as Kasal (sick), Uyda (home_leave), or Shifoxonada (hospitalized) got a silent partial failure — 201 returned, no error shown in UI, but the child's status was never persisted. The wave-2 beta tests that exercised those statuses would have produced false-positive "saved" UI feedback while the DB retained whatever prior status existed.

**Fix:** Migration `20260608000001-fix-attendance-status-enum-column.js` (commit `ce49ff93`, 2026-06-08). Used a `CASE` expression in the `ALTER COLUMN USING` clause to remap legacy values atomically, avoiding any pre-UPDATE step:
```sql
ALTER TABLE child_attendance
  ALTER COLUMN status TYPE "enum_child_attendance_status"
  USING CASE status::text
    WHEN 'late'    THEN 'present'::"enum_child_attendance_status"
    WHEN 'excused' THEN 'sick'::"enum_child_attendance_status"
    ELSE status::text::"enum_child_attendance_status"
  END
```

**Data impact analysis (queried 2026-06-09):**

All 15 rows in `child_attendance` at migration time:

| Pre-migration status | Count | Post-migration status | Source |
|---|---|---|---|
| `present` | 3 | `present` | 3 seed/sprint rows from 2026-05-31 |
| `absent` | 1 | `absent` | 1 seed/sprint row from 2026-05-31 |
| `excused` | 1 | `sick` | 1 seed/sprint row from 2026-05-31 03:20 UTC |
| `present` | 11 | `present` | 11 beta-test rows from 2026-06-08 (wave-2 testing) |
| `late` | 0 | — | No `late` rows existed — controller `VALID_STATUSES` never included `late`, preventing any app-layer save |

**`late → present` remapping: 0 rows.** Confirmed zero — `late` was blocked by controller validation and never reached the DB.

**`excused → sick` remapping: 1 row.** The row (2026-05-31 03:20 UTC) is sprint-testing/seed data, not a real child's clinical record. No real users have used this Railway environment. Data-owner sign-off is not required for this specific row.

**Standing pre-launch concern (not blocking beta):** The `excused → sick` mapping is semantically incorrect for any future real-data migration. `excused` means absence with permission; `sick` asserts a medical state. If production ever contains real `excused` rows, the correct mapping is `excused → absent`, not `excused → sick`. The `down()` migration should be reviewed before any rollback on a live deployment.

**Status:** ✅ FIXED (S21) — migration commit `ce49ff93`
**Matrix rows:** T-026–T-032 NOT flipped to PASS — re-verification in next phase.

---

### UX-02 — Attendance correction: no UI affordance to signal that saved records are editable

- **Severity:** P1
- **Portals affected:** Teacher
- **Wave:** 2 (T-026–T-032)

**Case:** (b/c) — Backend correctly upserts (findOne → update or create) when saving attendance for a date that already has records. Returning to a saved date loaded the prior statuses into state. However, the UI showed no badge or label change to indicate the data was already saved, leaving teachers uncertain whether a second save would overwrite or duplicate, and with no clear signal that correction is possible.

**What was changed:**

*`teacher/src/pages/Attendance.jsx`* (commit `f5f18500`):
- Added `hasSavedData` state; set `true` when `GET /attendance` returns ≥ 1 record for the selected date.
- Badge rendered below the group label when `hasSavedData && !isFuture`:
  `<CheckCheck /> {t('attendance.alreadySaved')}` — green-50 background, green-200 border.
- Save button label changes to `{t('attendance.saveUpdate')}` ("Yangilash") in correction mode.

*Locale keys added to uz/ru/en `teacher/src/locales/*/common.json`* (commit `f5f18500`):
- `attendance.alreadySaved`: "Saqlangan — tahrirlash mumkin" / "Сохранено — можно изменить" / "Saved — you can edit"
- `attendance.saveUpdate`: "Yangilash" / "Обновить" / "Update"

*`backend/migrations/20260608000001-fix-attendance-status-enum-column.js`* (commit `ce49ff93`):
- Migration `20260606000001` created `enum_child_attendance_status` but the `ALTER COLUMN` step never ran. The column stayed on `enum_child_attendance_status_old` (`present/absent/late/excused`), causing all saves with statuses `sick/home_leave/hospitalized` to fail with `ATTENDANCE_SAVE_FAILED`.
- Prior fix attempt (`35ef1e19`) crashed because `SET status = 'sick'::text` is invalid on an enum-typed column (no `text → enum` assignment cast in PostgreSQL for custom enums).
- Final fix uses a `CASE` expression in the `ALTER COLUMN USING` clause to remap `late → present` and `excused → sick` atomically. No pre-UPDATEs needed.

**Gate (Playwright 7/7 PASS — `tests/ux02-attendance-correction-proof.spec.js`, commit `ce49ff93`):**
1. Load today → `[class*="bg-green"]` badge shows "Saqlangan — tahrirlash mumkin"; Bobur = Bor; button = Yangilash ✅
2. Cycle Bobur to Kasal → save → POST `/api/v1/attendance` returns 201; navigates away ✅
3. Return → badge visible; Bobur = Kasal (correction persisted in DB) ✅
4. Cycle Bobur back to Bor → save → 201 ✅
5. Reload → Bobur = Bor (round-trip complete; no duplicate row) ✅
6. Badge text in ru = "Сохранено — можно изменить"; no raw i18n keys ✅
7. Badge text in en = "Saved — you can edit"; no raw i18n keys ✅

**Screenshots:**
- `screens/ux02-badge-visible-initial-uz.png` — badge and Yangilash button on first load (uz)
- `screens/ux02-bobur-kasal-after-correction.png` — badge visible; Bobur shows Kasal after save
- `screens/ux02-bor-persists-round-trip.png` — Bobur shows Bor on reload (round-trip confirmed)
- (ru/en badge screenshots captured as test artifacts)

**Matrix rows:** T-026–T-032 NOT flipped to PASS — re-verification in next phase.

**Status:** ✅ FIXED (S21) — frontend + locale commit `f5f18500`; migration commit `ce49ff93`

## Tenant Isolation Defects (Step 3)

### DEF-012 — P3: Parent media endpoint ignores `childId` query param (group-scoped by design; param silently unused)

- **Severity:** P3 (cosmetic / behavioural gap — no data exposure)
- **Persona:** parent1 / any authenticated parent
- **Portal:** Parent (API endpoint)
- **Wave:** 3 (ISO-P03 probe, S22-V1)
- **Feature ID:** P-045 (media gallery)

**Behaviour:** `GET /api/v1/parent/media?childId=<uuid>` accepts a `childId` query parameter but the controller (`parentMediaController.js: getMyMedia`) never reads it. The endpoint scopes media by `{ groupId: parentGroupId, parentId: req.user.id }` at the Sequelize JOIN level. Any `childId` value — including a cross-tenant UUID — is silently ignored; the response returns the parent's own group's media regardless.

**Why this is not a security breach:** The JOIN clause enforces `parentId = req.user.id` as a hard constraint. No cross-tenant data can appear in the response regardless of what `childId` is passed. Confirmed by hostile probe ISO-P03: passing an S2 child UUID returns 200 with only the caller's own media; the S2 child UUID does not appear anywhere in the response body.

**Why it is still a finding:** The parameter is accepted in the query string (no 400/403 on invalid childId) and silently dropped. A caller expecting child-level filtering (e.g. a multi-child parent filtering the gallery by a specific child) would receive all group media with no indication that the filter had no effect.

**Root cause:** `getMyMedia` was written to implement group-wide media visibility (C-02 design intent). No `childId` filter was added; the parameter is simply unused.

**Fix (deferred, low priority):** Either document `childId` as unsupported and return 400 if provided, or implement the filter: if `childId` is provided, validate it belongs to `req.user.id` and narrow the JOIN to that child.

**Evidence:** ISO-P03 assertion in `tests/iso22-v1-isolation-probes.spec.js` (PASS — 200, S2 UUID absent from body; screenshot `audits/beta/screens/iso-p03-parent1-s2-media.png`).

**Status:** OPEN (P3, not blocking launch)

---

## S22-V3 Defects (Blocked-Row Verification)

### DEF-013 — P1: Realtime chat teacher→parent delivery broken — parseInt(UUID) corrupts socket room target

- **Severity:** P1 (messages saved to DB; parent must reload to see them — real-time delivery silently dropped)
- **Persona:** teacher1 (sender), parent1 (receiver)
- **Portal:** Teacher (sender side) + Parent (receiver side)
- **Wave:** 2 (T-043), Wave 3 (P-051)
- **Feature ID:** T-043, P-051
- **Repro:**
  1. Teacher navigates to chat, opens a parent conversation, sends a message
  2. Parent has `/chat` open in the same browser session with socket listener active
  3. Parent page does NOT update in real-time — the message never appears without a page reload
- **Expected:** Message appears in parent view within ~1 s via socket event `chat:message`
- **Actual:** Message is persisted to DB but parent real-time delivery is silently dropped; parent must reload to see it
- **Screenshot:** (captured during S22-V3 T-043 run — parent page ARIA snapshot shows no new message)
- **Console errors:** none (the socket emit silently targets the wrong room)
- **Network:** POST `/api/v1/chat/messages` → 201 (message persisted); no socket event reaches parent
- **Suspected layer:** Backend — `chatController.js:92`
- **Root cause:**
  ```js
  // chatController.js line 92
  emitToUser(parseInt(parentId, 10), 'chat:message', msg.toJSON());
  ```
  `parentId` is extracted from `msg.conversationId.replace('parent:', '')` — a UUID string (e.g. `"08b49ab0-c2f8-4921-b1d0-32554bc2b4ab"`).
  `User.id` is `DataTypes.UUID`; socket middleware sets `socket.userId = user.id` (UUID string); parent joins room `user:${uuid}`.
  `parseInt("08b49ab0-...", 10)` returns `8` (parseInt stops at first non-decimal char `b`).
  `emitToUser(8, ...)` → `io.to("user:8").emit(...)` — room `user:8` has no connected sockets.
  Parent is in room `user:08b49ab0-...`. Rooms never match.
- **Scope:** Teacher→parent direction only. Parent→teacher direction (line 101) iterates `teacherIds` directly from DB (UUID strings, no parseInt) and is unaffected.
- **Fix:** Removed `parseInt` on line 92 — pass UUID string directly:
  ```js
  emitToUser(parentId, 'chat:message', msg.toJSON());
  ```
  Commit `bb4ba3d2` (`fix(chat): DEF-013 — remove parseInt(parentId,10) before emitToUser`).
- **Proof (Node.js two-context probe — `tests/def013-socket-probe.cjs`):**
  - Context A: teacher1 logged in, sent `DEF013-PROBE-1781067500793` via `POST /api/v1/chat/messages` → HTTP 201
  - Context B: parent1 socket connected to default namespace (`https://uchqun-production-b484.up.railway.app`) → received `chat:message` event
  - Output: `✅ PASS — socket delivered the message! content: "DEF013-PROBE-1781067500793", conversationId: parent:e67cf25b-e129-4f3d-89b3-eef89b77c2b0, senderRole: teacher`
  - Regression (parent→teacher): unaffected — line 101 was always correct (direct UUIDs from DB, no parseInt)
  - Note: Playwright browser test was blocked by DEF-015 (`getSocketUrl()` regex bug). DEF-015 fixed in S22-FIX-DEF015 (commit `21ac5ebf`) — browser test now fully passes (T1 + T2 both green, see DEF-015 close-out).
- **Status:** ✅ FIXED (S22-FIX-DEF013, 2026-06-10) — commit `bb4ba3d2`, deployed to Railway. Browser proof via S22-FIX-DEF015 Playwright run.

---

## S22-FIX-DEF013 New Findings (FIND AND RECORD ONLY — not fixed this session)

### DEF-014 — P3: Government portal period sort uses string order — Q4-2025 ranks above Q2-2026

- **Severity:** P3 (data quality risk at scale; not blocking against current seed data)
- **Persona:** gov.toshkent, gov.republic (any government user viewing school ratings)
- **Portal:** Government
- **Feature:** School rating detail / period selector — `ORDER BY period DESC, createdAt DESC`
- **Repro:**
  1. Create school ratings for Q1-2026, Q2-2026, Q3-2025, Q4-2025 in that sequence
  2. Government portal displays or selects the "latest" period
  3. Q4-2025 is selected as latest instead of Q2-2026
- **Root cause:** `period` column stores strings in the format `Q{N}-{YYYY}` (e.g. `Q4-2025`, `Q2-2026`). `ORDER BY period DESC` performs a lexicographic sort: `'Q4' > 'Q3' > 'Q2' > 'Q1'` regardless of year. String character at position 1 (`'4'` vs `'2'`) determines order, so `Q4-2025` sorts above `Q2-2026` even though 2026 is chronologically later.
- **Evidence:** RECONCILIATION.md note — gov.toshkent school detail: `Q4-2025` ranks higher than `Q2-2026` under string sort; DB ground truth and API agree (no numeric mismatch) but the wrong period is "latest". Test seed has only Q1-2026 and earlier quarters so the bug is masked.
- **Fix (not applied this session):** Change the sort to use parsed year+quarter: `ORDER BY CAST(SPLIT_PART(period, '-', 2) AS INT) DESC, CAST(SPLIT_PART(period, 'Q', 2) AS INT) DESC, createdAt DESC` or store period as a sortable integer/date.
- **Status:** OPEN (logged S22-FIX-DEF013, 2026-06-10) — data-quality risk, not blocking launch against current seed

---

### DEF-015 — P1: SocketContext.jsx `getSocketUrl()` regex fails to strip `/v1` — browser socket connects to wrong namespace

- **Severity:** P1 (all real-time features broken in browser — chat, unread badge, notifications)
- **Persona:** Any user in Teacher or Parent portal
- **Portal:** Teacher (parent-side view embedded) + Parent portal
- **Feature ID:** T-043, P-051 (same features as DEF-013)
- **Repro:**
  1. Deploy teacher/parent portal with `VITE_API_URL = 'https://uchqun-production-b484.up.railway.app/api/v1'`
  2. Open browser, log in as parent or teacher
  3. Socket.IO in browser attempts to connect — receives "Invalid namespace" error
  4. No real-time events ever delivered (chat messages, unread counts)
- **Root cause:**
  ```js
  // teacher/src/shared/context/SocketContext.jsx (before fix)
  const getSocketUrl = () => {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
    return apiUrl.replace(/\/api\/?$/, '');   // BUG: regex only matches /api or /api/ at end
  };
  ```
  When `VITE_API_URL` ends in `/api/v1`, the regex `/\/api\/?$/` does NOT match (it requires the string to end with `/api` or `/api/`). The full URL including `/api/v1` is returned. Socket.IO client interprets the path component `/api/v1` as a namespace — the backend only registers the default namespace `/`, so the connection is rejected with "Invalid namespace".
- **Sibling check:** `socket.io-client` is imported in exactly one browser-facing file (`teacher/src/shared/context/SocketContext.jsx`). No other portals (admin, reception, government) have socket clients. No other socket-URL construction sites affected.
- **Fix applied (S22-FIX-DEF015, commit `21ac5ebf`):**
  ```js
  // SocketContext.jsx — import API_HOST from shared config (single source of truth)
  import { API_HOST } from '@shared/services/config';
  const getSocketUrl = () => API_HOST;
  ```
  `API_HOST` uses `/\/api(?:\/v\d+)?\/?$/` which correctly strips both `/api` and `/api/v1`.
- **Proof (Playwright browser two-context test — `tests/def013-chat-fix-proof.spec.js`):**
  - **DEF-013-T1 PASS** — teacher1 (context A) sent `DEF013-T1-1781069820547` → appeared in parent1 (context B) browser DOM live within 5.2 s without reload. WS frame delivered. Screenshot: `audits/beta/screens/DEF-013-T1-parent-received.png`
  - **DEF-013-T2 PASS** — parent1 sent `DEF013-T2-1781069825815` → appeared in teacher1 browser DOM live within 1.5 s (conversation list preview + message bubble, both in DOM). Screenshot: `audits/beta/screens/DEF-013-T2-teacher-received.png`
  - Both directions work live — proves namespace fix restored realtime broadly (chat delivery in both directions, WS frames flowing)
  - Full suite: **2 passed (18.2 s)**
- **Status:** ✅ FIXED (S22-FIX-DEF015, 2026-06-10) — commit `21ac5ebf`, deployed to Railway. DEF-013-T1 (previously blocked) now passes.

---

### DEF-016 — RETRACTED: government password toggle reported missing — false finding (test artifact)

- **Severity:** — (retracted, never a product defect)
- **Portal:** Government
- **Feature ID:** G-002
- **What happened:** The S22-V4 government suite marked G-002 FAIL claiming "Login.jsx has type=\"password\" hardcoded — no toggle implementation". Code review shows `government/src/pages/Login.jsx` renders the password input via `components/dnp/Field.jsx`, which implements a full show/hide toggle (eye button with `aria-label="Show password"`, switches input type password↔text). The test's selector `pg.locator('button').filter({ has: svg }).last()` clicked the **language switcher** (the last svg-button on the page), so the input type never changed and the assertion failed.
- **Verification (S22-V4 probe, 2026-06-11):** corrected selector (`button[aria-label="Show password"]`) on the live portal — toggle switches type to `text` and back to `password` both directions. Screenshot: `screens/S22V4-G-002-toggle-type-text.png`. Selector fixed in `tests/s22v4-government.spec.js`.
- **Status:** ❌ RETRACTED (2026-06-11) — G-002 verdict corrected to PASS. Number DEF-016 is consumed; do not reuse.
