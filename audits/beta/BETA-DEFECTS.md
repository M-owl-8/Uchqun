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

### DEF-004 — G-050: canRateSchools i18n key missing
- **Severity:** P1
- **Persona:** gov.republic (provisioning secondary users)
- **Wave:** 6
- **Feature ID:** G-050
- **Detail:** `provision.grants.canRateSchools` is missing from UZ/RU/EN locale files. The capability checkbox label renders as the raw key string.
- **Suspected layer:** Frontend (i18n)

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
- **Status:** ✅ FIXED (S15) — root cause was misidentified at beta time
- **Actual root cause:** `teacher/public/locales/` is NOT loaded at runtime. `teacher/src/i18n.js` uses bundled imports (`import portalUz from './locales/uz/common.json'`). The src locale files (`teacher/src/locales/{uz,ru,en}/common.json`) have had all correct keys since commit 6b8daf02. The raw keys seen during the beta run were a stale browser/CDN cache artifact — the browser was serving an older JS bundle. Hard refresh fetched the current build, resolving the issue.
- **Verification:** `node scripts/check-locale-completeness.mjs --portal=teacher` → ✅ PASS — 866 keys, all present in UZ, RU, EN. Keys confirmed: `attendance.statusPresent`/`statusHomeLeave`/`statusSick`/`statusHospitalized`/`statusAbsent`/`statusUnset` and `quickObs.title`/`quickObs.outcomes.*` all resolve to human-readable strings in all three locales.
- **Code change:** None required — locale source files were already correct. No PR needed.
- **Fix commit:** See BETA-DEFECTS.md update commit (DEF-007 close-out)

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

## Wave 4 Defects (Admin)
<!-- Populated during testing -->

## Wave 5 Defects (Region Gov)
<!-- Populated during testing -->

## Wave 6 Defects (Republic Gov)
<!-- Populated during testing -->

## Cross-Cutting Defects (Step 2)
<!-- Language, session, refresh, double-submit, empty-state, upload error -->

## Tenant Isolation Defects (Step 3)
<!-- Any isolation breach found during hostile probes -->
