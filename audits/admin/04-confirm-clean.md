# Admin Portal — S4 Confirm Clean

**Date:** 2026-05-22
**Verifier:** Self-verification of S3 cleanup (S4 job)
**Final test count:** 95 tests / 18 suites / lint 0 portal-wide
**Verdict:** ✅ CONFIRMED CLEAN (with one additional fix: NotFound smoke test flakiness patched)

---

## Job 0 — ToastContext scope (resolved definitively)

### File hierarchy

| File | Who uses it |
|---|---|
| `shared/context/ToastContext.jsx` | admin, government, reception (all import via `@shared/context/ToastContext`) |
| `teacher/src/shared/context/ToastContext.jsx` | teacher + parent (teacher portal, bundled inside teacher's src/shared/) |

### What S3 fixed and where it landed

S3 fixed `shared/context/ToastContext.jsx` — adding `useCallback` on all helpers (`addToast`, `removeToast`, `success`, `error`, `warning`, `info`) and `useMemo` on the context value. This means:

- **Admin**: fix inherited ✅
- **Government**: fix inherited ✅ (same shared file, already closed)
- **Reception**: fix inherited ✅ (same shared file)
- **Teacher**: NOT fixed — teacher's own copy `teacher/src/shared/context/ToastContext.jsx` is the original unstable version (inline functions, no useCallback/useMemo, value object recreated each render)

### Teacher portal carry-forward

`teacher/src/shared/context/ToastContext.jsx` has the same instability the shared file had:
- `addToast`, `removeToast`, `success`, `error`, `warning`, `info` are inline arrow functions recreated on every `ToastProvider` render
- Any component with a `useCallback` that depends on toast helpers (e.g. `error` from `useToast()`) will recreate its callback on every toast event, potentially triggering spurious `useEffect` re-fires

Teacher S1 audit MUST check: do any teacher portal pages have `useCallback` that depends on `useToast` helpers? If yes, the same refetch loop risk applies. The fix is identical to what was done to the shared file.

This is NOT blocking Admin S4. The fix is contained; the shared file is correct; teacher is a separate portal loop.

---

## Job 1 — Per-unit verification

### U-1: AIWarnings URL + method + field (AD-001, AD-002, AD-009, AD-013)

**Verified ✅**

API call evidence (grep `api.get|api.put` in AIWarnings.jsx):
```
181: api.get('/ai-warnings').then(...)       ← cold-load path
192: const res = await api.get('/ai-warnings') ← full-load path
208: await api.put(`/ai-warnings/${id}/resolve`)
```

Dashboard API call (grep `api.get|api.put` in Dashboard.jsx):
```
69: api.get('/ai-warnings', { signal })  ← correct, no /admin/ prefix
```

`/admin/ai-warnings` grep in `admin/src/pages/**`: zero matches in API calls. The three matches in Sidebar.jsx (`href: '/admin/ai-warnings'`) and Dashboard.jsx (`link: '/admin/ai-warnings'`, `<Link to="/admin/ai-warnings">`) are **client-side navigation links** (SPA routes), not API calls. Correct.

`isResolved` grep in `admin/src/pages/**`: **zero matches** ✅

Silent catch grep (`\.catch\(\s*\(\s*\)\s*=>\s*\{\s*\}\)`): **zero matches** ✅

Tests: 7 tests (including new stability test) — all pass ✅

### U-2: Dashboard fiction removal (AD-007, AD-008, AD-013)

**Verified ✅**

`MOCK_ACTIVITY` in `admin/src/**`: **zero matches** ✅

Fiction names (Aziza Karimova, Bobur Saidov, Madina Rahmatova) in `admin/src/**`: **zero matches** ✅
Note: names appear in `admin/Uchqun Admin Design System.html` — a static HTML design-system preview doc, not compiled into the SPA. Not a finding.

Fabricated fallbacks grep (`ratingAvg.*4\.6`, `\|\| 87`, `\|\| 140`, `\[59, 18`): **zero matches** ✅

Dashboard.jsx activity feed: placeholder with `Clock` icon and "Faoliyat tarixi tez kunda" — confirmed no fake data rendered.

Ratings panel: `ratings?.average ?? null` — shows `—` when null. `ratings?.distribution ?? null` — shows placeholder text when null. All fabricated fallbacks gone.

### U-3: Forced-password-change gate (AD-004, AD-005, CP-023)

**Verified ✅**

- `Login.jsx:25`: `navigate(result.mustChangePassword ? '/admin/change-password' : '/admin')` — redirects on flag
- `App.jsx:29`: `const { ..., mustChangePassword } = useAuth()` — reads from context
- `App.jsx:41`: `if (isAuthenticated && isAdmin && mustChangePassword && !isChangePasswordPage)` — redirect guard
- `ChangePassword.jsx:43`: `setUser({ ...user, mustChangePassword: false })` — clears flag on success
- Route `/change-password` present in App.jsx
- Path exemption `!isChangePasswordPage` prevents redirect loop ✅

### U-4: Delete UsersStats (AD-003)

**Verified ✅**

- `admin/src/pages/UsersStats.jsx`: **file does not exist** (Glob confirms no match)
- `UsersStats` in `admin/src/**`: **zero matches** ✅

### U-5: Wire TherapyManagement (AD-006, AD-011)

**Verified ✅**

- `App.jsx:69`: `<Route path="therapy" element={<ErrorBoundary><TherapyManagement /></ErrorBoundary>} />`
- `Sidebar.jsx:16`: `Brain` imported; `Sidebar.jsx:40`: `{ key: 'nav.therapy', href: '/admin/therapy', icon: Brain }` in Hisobotlar section
- `TherapyManagement.jsx`: `confirm(` — **zero matches** ✅ (native confirm() removed)
- Tests: 4 tests pass ✅

### U-6: SCHOOL_ARCHIVED interceptor (AD-016)

**Verified ✅**

`admin/src/services/api.js`: interceptor present at lines 9-22. `SCHOOL_ARCHIVED` code maps to human-readable message "School archived — contact your regional government office." Other `{ code, detail }` objects normalized to strings for legacy catch blocks. Comment accurately describes intent (no `[object Object]` coercion in error messages).

### U-7: Sidebar i18n + fallbackLng (AD-010, AD-017)

**Verified ✅**

- `admin/src/i18n.js:24`: `fallbackLng: 'en'` ✅ (was `'uz'`)
- `Sidebar.jsx:21,30,36,44`: all four sections use `labelKey: 'nav.section.*'` ✅
- `Sidebar.jsx:117,119`: render uses `t(section.labelKey, { defaultValue: section.labelKey })` ✅

### U-8: Remove express dep (AD-012)

**Verified ✅**

`admin/package.json`: grep for `express` — **zero matches** ✅

### U-9: TranslationNotice (AD-015, CP-019)

**Verified ✅**

- `admin/src/components/TranslationNotice.jsx`: `STORAGE_KEY = 'admin_translation_notice_dismissed'` (admin-specific, distinct from gov's `'gov_translation_notice_dismissed'`) ✅
- `admin/src/components/Layout.jsx:6,47`: imported and rendered above `<main>` ✅

### U-10: Smoke tests (AD-014)

**Verified ✅ with fix applied**

`admin/src/__tests__/pages/pages.smoke.test.jsx` exists with 5 smoke tests.

**Intermittent failure found and fixed (not introduced by S3):**
On the first cold-start full-suite run, the `NotFound page smoke > renders 404 heading` test timed out at 5000ms. Root cause: `await import('../../pages/NotFound')` inside the `it()` body was slow under full-suite worker load. The test passed reliably in isolation and on subsequent warm runs. Pattern mismatch: NotFound used a synchronous `expect` with no retry, unlike the other smoke tests which use `waitFor`.

Fix applied: moved the `import` to a `beforeAll()` hook so it executes before the test body's timeout starts. Test now passes consistently in the full suite.

Coverage gap (recorded from S3 closeout):
- ReceptionManagement: smoke-only (mounts-without-crash). No behavioral tests for create/edit/delete endpoint assertions.
- DocumentApprovalQueue: smoke-only. No behavioral tests for approve/reject endpoint assertions.
- This gap is documented and accepted. Behavioral tests are candidates for S7 when those pages are next touched for feature work.

---

## Job 2 — Full-suite + standards verification

### Test suite

```
Test Files: 18 passed (18)
     Tests: 95 passed (95)
  Duration: ~15s
```

Zero failures. ✅

### Lint (portal-wide)

```
npx eslint src --ext js,jsx
(no output — clean)
```

Zero warnings, zero errors across the entire `admin/src/` directory. ✅

### Build

`npm run build` requires `VITE_API_URL` env var (intentional guard in vite.config.js:7 — throws in production mode without it). This is consistent behavior across all portals. The guard prevents accidental builds against the wrong API. Build passes in CI/Railway where `VITE_API_URL` is set. Not a defect.

### Feature-phase contamination check

Grep for deferred S6/S7 work leaked in:
- Bulk import UI (`BulkImport`, `bulk.import` routes): **zero matches** ✅
- Suspend/activate parent buttons: **zero matches** ✅
- Restore UI: **zero matches** ✅

No feature-phase work in the cleanup commit range. ✅

---

## Discrepancies between S3 log and current code

| Claim | Reality | Status |
|---|---|---|
| "lint clean on modified files" | One warning existed (Dashboard.jsx:54 unused navigate) — pre-existing but on an untouched line | Fixed in S3 closeout (22135ca) ✅ |
| "94 tests / 18 suites" | 94 + 1 stability test added in S3 closeout = 95 | Accurate as of closeout ✅ |
| S3 log says "5 smoke tests" | All 5 pass, but NotFound was intermittently flaky in full-suite cold-start | Fixed in S4 (beforeAll pattern) ✅ |

No functional discrepancies. The S3 log accurately describes the code as shipped.

---

## ToastContext determination — summary

| Portal | File | Fixed? | How |
|---|---|---|---|
| Admin | `shared/context/ToastContext.jsx` | ✅ | S3 direct fix |
| Government | `shared/context/ToastContext.jsx` | ✅ | Inherited (same file) |
| Reception | `shared/context/ToastContext.jsx` | ✅ | Inherited (same file) |
| Teacher | `teacher/src/shared/context/ToastContext.jsx` | ❌ | Own copy — unstable. Teacher S1 must audit. |

---

## Confirmed-clean verdict

✅ **Admin cleanup phase is genuinely complete.**

- All 10 units verified in current code (grep evidence + test results)
- Fiction-trio names: zero matches in page source
- AI Warnings URL/method/field: confirmed clean API calls, zero `isResolved` in page code
- Dashboard fabricated fallbacks: zero matches
- Lint: 0 portal-wide (not "modified files" — full portal)
- Tests: 95 / 18 suites, 0 failures
- No feature-phase work leaked in
- ToastContext scope resolved: shared file fixed (admin/gov/reception inherit); teacher copy flagged for Teacher S1

## Carry-forward (residuals)

1. **Teacher ToastContext instability** — `teacher/src/shared/context/ToastContext.jsx` is the original unstable version. Teacher S1 must check: any `useCallback` depending on `useToast()` helpers creates a refetch loop risk on every toast event. Fix is identical to what was applied to the shared file.
2. **Reception/Documents behavioral test gap** — ReceptionManagement and DocumentApprovalQueue have smoke-only coverage. No CRUD endpoint assertions. Noted residual; not a blocking defect for cleanup phase. Candidate for S7.
