# Admin Portal — S3 Cleanup Execution Log

**Date:** 2026-05-22
**Units:** U-1 through U-10 (all 10 cleanup units)
**Final test count:** 94 tests / 18 suites / lint clean on modified files
**Final commit:** cb3550c

---

## U-1: AIWarnings URL + method + field mismatch (AD-001, AD-002, AD-009, AD-013)

**Commit:** 96d1b23
**Files changed:**
- `admin/src/pages/AIWarnings.jsx` — stale fetch path `/admin/ai-warnings` → `/ai-warnings`; cold-load path same; both silent empty catches replaced with `showError()`; `api.post(…/resolve)` → `api.put('/ai-warnings/${id}/resolve')`; useCallback deps `[]` → `[showError, t]`
- `admin/src/pages/Dashboard.jsx` — Line 81 URL `/admin/ai-warnings` → `/ai-warnings`; Lines 183, 186, 199, 292, 294: `isResolved` → `resolvedAt` (5 sites)
- `admin/src/__tests__/pages/AIWarnings.test.jsx` — NEW; 6 tests: revert-guard URL (AD-001), unresolved card (resolvedAt:null), resolved card (resolvedAt:timestamp), count derivation (AD-009), error toast no silent-swallow (AD-002), PUT not POST (AD-013)

**Revert-test evidence:**
- Test 1 (revert-guard): asserts `api.get.mock.calls[0][0] === '/ai-warnings'` — would fail if `/admin/ai-warnings` reverted
- Test 6 (AD-013): asserts `api.put` called with `/ai-warnings/w-1/resolve` — would fail on POST or /admin/ path
- Tests 2+3: seed both `resolvedAt: null` and `resolvedAt: '2026-05-20T10:00:00.000Z'`; confirms both states render correctly

**U-2 decision:** `/admin/audit-log` endpoint confirmed absent in adminRoutes.js — placeholder used.

---

## U-2: Dashboard fiction removal (AD-007, AD-008, AD-013)

**Commit:** 4b3d91e
**Files changed:**
- `admin/src/pages/Dashboard.jsx`
  - Removed `MOCK_ACTIVITY` array (5 hardcoded Uzbek names: Aziza Karimova, Bobur Saidov, Madina Rahmatova)
  - Removed 5 lucide imports only used by MOCK_ACTIVITY (UserPlus2, FileText, CheckCircle2, LogIn, Pencil)
  - Added `Clock` icon for placeholder
  - Activity feed panel: replaced `MOCK_ACTIVITY.map(…)` with labeled placeholder ("Faoliyat tarixi tez kunda")
  - `capacity || 140` → `stats?.capacity ?? null`; occupancy shows `'—'` when null
  - `ratingAvg ?? 4.6` → `ratings?.average ?? null`
  - `ratingDist || [59,18,7,2,1]` → `ratings?.distribution ?? null`
  - `|| 87` total fallback removed; ratings panel shows "Hozircha reytinglar mavjud emas" placeholder when ratings null

**Activity feed decision:** `/admin/audit-log` does not exist in adminRoutes.js. Only `/government/audit-log` exists. Correct path is placeholder, not a real wire.

---

## U-3: Forced-password-change gate (CP-023)

**Commit:** 5036bcc
**Files changed:**
- `shared/context/createAuthContext.jsx` — added `mustChangePassword: user?.mustChangePassword === true` to context provider value
- `admin/src/App.jsx` — added `useLocation` import; `AppRoutes` now reads `mustChangePassword`; added redirect guard (`isAuthenticated && isAdmin && mustChangePassword && !isChangePasswordPage`) before Routes; added ChangePassword import and `/admin/change-password` route
- `admin/src/pages/Login.jsx` — after `result.success`, navigate to `/admin/change-password` if `result.mustChangePassword`; otherwise `/admin`
- `admin/src/pages/ChangePassword.jsx` — NEW; mirrors government E1 implementation with admin-portal styling (bg-cream, warm-* tokens); calls PUT `/user/password`; clears `mustChangePassword` flag on success via `setUser({...user, mustChangePassword: false})`; navigates to `/admin`

**Pattern matched:** Government `AppRoutes` exact pattern — `useLocation` + `!isChangePasswordPage` exemption to prevent redirect loop.

---

## U-4: Delete UsersStats (AD-003)

**Commit:** 7865cdc
**Files changed:**
- `admin/src/App.jsx` — removed `UsersStats` import and `path="users"` route
- `admin/src/pages/UsersStats.jsx` — DELETED

**Verification:** No other files referenced UsersStats (grep confirmed). No sidebar nav item for `/admin/users` existed.

---

## U-5: Wire TherapyManagement (AD-006)

**Commit:** 5560b13
**Files changed:**
- `admin/src/pages/TherapyManagement.jsx` — added `ConfirmDialog` import; added `confirmDialog` state; replaced `if (!confirm(…))` with `setConfirmDialog({ message, onConfirm })` pattern; added `<ConfirmDialog>` render at bottom of JSX
- `admin/src/App.jsx` — added `TherapyManagement` import; added `path="therapy"` route
- `admin/src/components/Sidebar.jsx` — added `Brain` icon import; added `{ key: 'nav.therapy', href: '/admin/therapy', icon: Brain }` to Hisobotlar section
- `admin/src/locales/en/common.json` — added `nav.therapy: "Therapy Management"`
- `admin/src/locales/uz/common.json` — added `nav.therapy: "Terapiya boshqaruvi"`
- `admin/src/locales/ru/common.json` — added `nav.therapy: "Управление терапиями"`
- `admin/src/__tests__/pages/TherapyManagement.test.jsx` — NEW; 4 tests: GET /therapy on mount, ConfirmDialog shown on delete click, DELETE called on confirm, DELETE not called on cancel

**therapyRoutes.js verification (pre-execution):** `router.post('/', requireRole('admin', 'teacher'), …)` — admin CAN create/update/delete. Admin can reach all CRUD endpoints.

**Key test insight:** `useTranslation` mock must return stable `t` function reference (defined once in factory, not per-call) to prevent `useCallback` invalidation on every render.

---

## U-6: 403 SCHOOL_ARCHIVED handling (AD-016)

**Commit:** 725cd2b
**Files changed:**
- `admin/src/services/api.js` — added portal-level `interceptors.response.use(null, handler)` that normalizes `{ code, detail }` error objects to strings; `SCHOOL_ARCHIVED` → human-readable message; other codes use `detail` or `code`

**U-6 decision:** `getMe` returns `user.toJSON()` with no `include: [School]`, so `user.school.isActive` is never populated. ProtectedRoute approach would never trigger. Interceptor approach works globally without needing auth context enrichment.

---

## U-7: i18n sidebar labels + fallbackLng (AD-010, AD-017)

**Commit:** 7406782
**Files changed:**
- `admin/src/i18n.js` — `fallbackLng: 'uz'` → `fallbackLng: 'en'` (AI-generated uz should not be fallback)
- `admin/src/components/Sidebar.jsx` — `NAV_SECTIONS` labels changed from hardcoded strings (`label: 'Boshqaruv'`) to i18n keys (`labelKey: 'nav.section.management'`); template changed from `{section.label}` to `{t(section.labelKey, { defaultValue: section.labelKey })}`
- `admin/src/locales/en/common.json` — added `nav.section.{management, documents, reports, settings}`
- `admin/src/locales/uz/common.json` — added `nav.section.{management, documents, reports, settings}`
- `admin/src/locales/ru/common.json` — added `nav.section.{management, documents, reports, settings}`

---

## U-8: Remove express from prod deps (AD-012)

**Commit:** 0800311
**Files changed:**
- `admin/package.json` — removed `"express": "^4.18.2"` from `dependencies` (SPA has no express runtime)

---

## U-9: CP-019 TranslationNotice port (AD-015)

**Commit:** c674e20
**Files changed:**
- `admin/src/components/TranslationNotice.jsx` — NEW; mirrors `government/src/components/TranslationNotice.jsx`; `STORAGE_KEY = 'admin_translation_notice_dismissed'` (different from government's `'gov_translation_notice_dismissed'`)
- `admin/src/components/Layout.jsx` — added `TranslationNotice` import; renders `<TranslationNotice />` above `<main>` in the main content column

---

## U-10: Page tests for untouched pages (AD-014)

**Commit:** cb3550c
**Files changed:**
- `admin/src/__tests__/pages/pages.smoke.test.jsx` — NEW; 5 smoke tests: Login (renders form), NotFound (renders 404), DocumentApprovalQueue (renders "Tasdiqlash navbati" heading), ReceptionManagement (mounts without crash), SchoolRatings (mounts without crash with useFetch stub)

---

## Deferred items (NOT in S3 — feature phase)

- **AD-018 / CP-011**: Bulk import UI for admin (no backend route consumed by admin yet)
- **AD-018 / CP-012**: Parent suspend/activate UI
- **AD-018 / CP-016**: Restore UI
- **CP-020**: Two-direction rating system (cross-portal, tracked in LOOP_CROSS_PORTAL.md)

---

## Final state

| Unit | Finding(s) | Commit | Status |
|---|---|---|---|
| U-1 | AD-001, AD-002, AD-009, AD-013 | 96d1b23 | ✅ |
| U-2 | AD-007, AD-008 | 4b3d91e | ✅ |
| U-3 | AD-004, AD-005, CP-023 | 5036bcc | ✅ |
| U-4 | AD-003 | 7865cdc | ✅ |
| U-5 | AD-006, AD-011 (therapy nav) | 5560b13 | ✅ |
| U-6 | AD-016 | 725cd2b | ✅ |
| U-7 | AD-010, AD-017 | 7406782 | ✅ |
| U-8 | AD-012 | 0800311 | ✅ |
| U-9 | AD-015, CP-019 | c674e20 | ✅ |
| U-10 | AD-014 | cb3550c | ✅ |

**Test count:** 79 (pre-S3) → 94 (post-S3) / 18 suites
**Pre-existing lint errors in dist/ and Dashboard.jsx not introduced by this session** — confirmed by stash test.
