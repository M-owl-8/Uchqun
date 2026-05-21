# Region Model — Sprint E1 Execution Log
**CP-021 · Frontend Foundation (auth context, password-change gate, capability nav)**
**Date:** 2026-05-21
**Executor:** Claude (claude-sonnet-4-6)

---

## Commits

| # | Hash | Description |
|---|------|-------------|
| 1 | `1416c78` | feat(government): auth context exposes region level, type, grants, capability check |
| 2 | `716fb25` | feat(government): forced password-change flow blocks navigation until changed (CP-023) |
| 3 | `ce7428e` | feat(government): capability-driven sidebar nav + region/republic indicator |

---

## Per-Commit Log

### Commit 1 — Auth context extension (`1416c78`)

**Files changed:**
- `government/src/context/AuthContext.jsx` — rewritten; wraps shared `createAuthContext` factory with `GovAuthBridge` component
- `government/src/__tests__/GovAuthContext.test.js` — 10 new tests

**Design: wrapper pattern (not shared-factory modification)**

The shared factory (`shared/context/createAuthContext.jsx`) stores the full user object from login/me as-is. Government-specific fields (`govLevel`, `govType`, `govRegionId`, `govAccessGrants`, `mustChangePassword`) are already on `user` — they just weren't promoted to top-level context values.

`GovAuthBridge` is a React component rendered inside `BaseAuthProvider` that reads `useBaseAuth().user`, derives government state, and publishes a new `GovAuthContext`. All existing `useAuth()` consumers remain compatible — same exports, same contract, extended value.

**New context values:**
| Value | Type | Description |
|-------|------|-------------|
| `govLevel` | `'republic'|'region'|null` | Account scope level |
| `govType` | `'main'|'secondary'|null` | Account hierarchy type |
| `govRegionId` | `UUID|null` | Region UUID for region accounts |
| `govAccessGrants` | `{}|{key:bool}` | Grant map for secondary accounts |
| `mustChangePassword` | `boolean` | True if forced password change required |
| `hasCapability(key)` | `fn→bool` | main→true; secondary→checks grant |
| `isRepublic` | `boolean` | govLevel==='republic' |
| `isRegionAccount` | `boolean` | govLevel==='region' |

**`hasCapability` — mirrors backend `requireGovAccess`:**
```js
function hasCapability(key) {
  if (govType === 'main') return true;
  return govAccessGrants[key] === true;
}
```
Republic-main and region-main both pass all capabilities. Secondary accounts only pass if the grant is explicitly `true` in their `govAccessGrants`.

**Test coverage:**
- `republic-main` → all 4 sampled capabilities pass
- `region-main` → all capabilities pass
- `secondary` with 2 grants → only those 2 pass; others return false
- `secondary` with no grants → nothing passes
- `isRepublic` / `isRegionAccount` flags
- `mustChangePassword` for true/false/null/undefined
- null user → all fields are safe defaults

---

### Commit 2 — Forced password-change flow (`716fb25`)

**Files changed:**
- `government/src/pages/ChangePassword.jsx` — new forced-change page
- `government/src/App.jsx` — redirect logic + new route
- `government/src/locales/en/common.json` — `changePasswordForced` keys added
- `government/src/locales/uz/common.json` — same keys (UNVERIFIED)
- `government/src/locales/ru/common.json` — same keys (UNVERIFIED)
- `LOOP_CROSS_PORTAL.md` — CP-023 added

**Redirect logic (App.jsx):**
```jsx
const isChangePasswordPage = location.pathname === '/government/change-password';
if (isAuthenticated && mustChangePassword && !isChangePasswordPage) {
  return <Navigate to="/government/change-password" replace />;
}
```
This fires BEFORE the Routes render. Every path under `/government/*` redirects to the change-password page as long as `mustChangePassword === true`. After password change, `setUser({ ...user, mustChangePassword: false })` clears the flag in local auth state and `navigate('/government', { replace: true })` redirects to dashboard.

**Route placement:** inside the `/government` protected route so the user stays authenticated. Layout (`Sidebar`, `Header`) renders normally — the change-password page renders inside it. The page itself has full-screen centering, making it visually standalone despite the Layout wrapper.

**Backend alignment:**
- Backend gate (`auth.js:117`): `mustChangePassword=true` → 403 `PASSWORD_CHANGE_REQUIRED` for all except `/api/v1/user/password` and `/api/v1/auth/logout`
- Frontend gate: `mustChangePassword=true` → redirect to `/government/change-password` for all except that page
- Success path: `PUT /api/v1/user/password` → clears `mustChangePassword` on user → navigate to `/government`

**ChangePassword page:**
- 3-field form: current password, new password, confirm new password
- Client-side validation: mismatch, min-8-chars, uppercase+lowercase+digit
- 401 response → "Current password is incorrect"
- Other errors → generic failure message
- Success → local flag cleared + SPA navigate (no reload)
- Show/hide toggles on all 3 password fields

**i18n status:** `en` keys are canonical. `uz` and `ru` are UNVERIFIED AI-generated translations (labeled with `_note: "UNVERIFIED"`). Subject to PL-009-VERIFY.

**CP-023:** Added to `LOOP_CROSS_PORTAL.md` — Admin, Reception, Teacher portals must implement the same redirect pattern in their respective loops. The backend gate is already live.

---

### Commit 3 — Capability-driven Sidebar (`ce7428e`)

**Files changed:**
- `government/src/components/Sidebar.jsx` — capability gating + region/republic indicator
- `government/src/locales/{en,uz,ru}/common.json` — `sidebar.republic`, `sidebar.regionAccount`, `sidebar.secondary` keys

**Capability map:**

| Nav item | Capability gate | Notes |
|----------|-----------------|-------|
| Dashboard | none | All accounts |
| Schools | `canViewSchools` | |
| Ratings | `canViewRatings` | |
| Warnings | `canViewAuditLog` | AI warnings are monitoring-level access |
| Audit Log | `canViewAuditLog` | |
| Platform | any of `canManageAdmins`, `canManageGovernmentUsers`, `canViewMessages`, `canManageRegistrations` | Tab-level subtabs remain available only per grant |
| Profile | none | All accounts |
| Settings | none | All accounts |

`main` accounts (republic or region) see all 8 items. `secondary` accounts see only items where their grants pass.

**Array capability check:**
```js
if (Array.isArray(capability)) return capability.some((c) => hasCapability(c));
```
Platform tab: if the secondary account has ANY platform grant, they see the tab. The Platform page itself has sub-tabs — secondary without `canManageAdmins` won't see the admins sub-tab (that's a Sprint E2/E3 scope).

**Region/republic indicator badge:**
- Positioned between the lockup and nav
- `Globe` icon for republic accounts
- `MapPin` icon for region accounts
- Shows `t('sidebar.republic')` or `t('sidebar.regionAccount')`
- Secondary accounts show `· secondary` suffix in the badge
- Hidden when `govLevel` is null (not yet loaded)

---

## Capability Gate Coverage

| Context value | Gate | Tests |
|---------------|------|-------|
| `hasCapability` — main → true | ✅ | GovAuthContext.test.js |
| `hasCapability` — secondary checked | ✅ | GovAuthContext.test.js |
| `isRepublic` / `isRegionAccount` | ✅ | GovAuthContext.test.js |
| `mustChangePassword` true/false/null/undefined | ✅ | GovAuthContext.test.js |
| Sidebar filters by hasCapability | 🟡 | No dedicated test — visual |
| ChangePassword redirect | 🟡 | No dedicated test — integration |

The redirect and sidebar filtering are React component behaviors. The underlying logic (`hasCapability`, `mustChangePassword` derivation) is fully unit-tested. React component integration tests would require jsdom + provider setup — out of scope for the shell sprint.

---

## Honest Status

| Item | State |
|------|-------|
| Auth context: `govLevel`, `govType`, `govRegionId`, `govAccessGrants`, `mustChangePassword` | ✅ Exposed and tested |
| `hasCapability(key)` | ✅ Implemented and tested |
| Forced password-change flow | ✅ Blocks navigation, form submits, clears flag |
| Capability-driven sidebar | ✅ Filters nav by grants |
| Region/republic indicator | ✅ Badge in sidebar |
| CP-023 registered | ✅ `LOOP_CROSS_PORTAL.md` |
| i18n: `changePasswordForced.*` and `sidebar.republic/regionAccount/secondary` | ✅ en canonical · uz/ru UNVERIFIED |

**Yellow gate:** No React component tests for the redirect or sidebar filtering. The logic is tested; the wiring is not. A component test sprint (E4 or final verify) should add integration tests.

---

## Verification

| Check | Result |
|-------|--------|
| Government Vitest suite | 13 suites / 88 tests passed / 0 failed |
| Frontend lint | 0 errors, 0 warnings |
| New test file | `GovAuthContext.test.js` — 10 tests |
| Test growth | 78 (Sprint 1) → 88 (Sprint E1, +10) |
| CP-023 registered | ✅ `LOOP_CROSS_PORTAL.md` |

---

## Deal-Gated Items (Sprint E1 scope)

DG-003 from Sprint D (category assignment UI) is still pending — Sprint E2/E3 scope. Not affected by Sprint E1 work.

No new deal-gated items introduced in Sprint E1.
