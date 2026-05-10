# Phase 5 — Agent Web Apps Audit
## Scope: `admin/`, `reception/`, `government/`

> Audit only — no modifications to project files.
> All file references include path + line range.

---

## Scorecard

| Metric | Score | Notes |
|--------|-------|-------|
| Messiness | 62/100 | Dead code file, state monolith, mixed string-hardcoding |
| Technical Debt | 68/100 | Broken toast in 3 pages, 540-line dead file, limit=500 bombs |
| Health | 38/100 | Critical: 3 admin pages have silently broken error feedback |
| Coherence | 44/100 | `I18nextProvider` in one app only; `window.confirm` vs custom dialog mix |
| Documentation Coverage | 28/100 | 2 business-logic comments in admin; most pages uncommented |
| Test Coverage | 32/100 | Government: 17 meaningful tests; admin/reception: auth unit tests only |
| Risk-on-Touch | 58/100 | Platform.jsx state monolith is the highest-risk single file |
| Cross-App Consistency | 42/100 | Toast API used differently across apps; pagination strategy absent |
| **Overall** | **47/100** | |

---

## 1. App-by-App Findings

### 1.1 Admin App (`admin/`)

**Structure:** 13 pages, 12 components, 3 test files. `createAuthContext({ tokenKey: 'admin_accessToken', requiredRole: 'admin' })`. Read-only for parents and groups; full write for teachers and receptions.

#### Issue 05-001 — CRITICAL: `showToast` Undefined in Three Pages

`useToast()` exports `{ success, error, warning, info, addToast }`. It does NOT export `showToast`. Three admin pages call `const { showToast } = useToast()` and then call `showToast(msg, 'error')` for every error path:

- [`admin/src/pages/TeacherManagement.jsx:27`](admin/src/pages/TeacherManagement.jsx#L27) — called at lines 57, 127
- [`admin/src/pages/GroupManagement.jsx:25`](admin/src/pages/GroupManagement.jsx#L25) — called at line 38
- [`admin/src/pages/ParentManagement.jsx:36`](admin/src/pages/ParentManagement.jsx#L36) — called at lines 55, 69

In all three pages `showToast` is `undefined`. Calling it throws a TypeError that is caught by the `catch` block, making the error handler silently crash. Users see no feedback on API failures, load errors, or delete errors. The fix is to destructure `error: showError` from `useToast()` (matching the pattern used correctly in `TeacherManagement.jsx` in the reception app).

#### Issue 05-002 — MEDIUM: `UsersStats.jsx` Hardcoded English + Swallowed Error

[`admin/src/pages/UsersStats.jsx:37`](admin/src/pages/UsersStats.jsx#L37) swallows all load errors silently with the comment `/* swallowed: surface to UI when toast hook is available */` — the hook _is_ available but only `success`/`error` are exported. The page renders a blank state with no error feedback.

Additionally, lines 68–69 and 89 contain hardcoded English UI strings (`"Users Statistics"`, `"Track user growth and demographics"`, `"All Roles"`, `"Parents"`, `"Teachers"`, `"Receptions"`) while the surrounding pages use `t()`.

#### Issue 05-003 — MEDIUM: Redundant Client-Side Role Filter

[`admin/src/pages/ParentManagement.jsx:49–52`](admin/src/pages/ParentManagement.jsx#L49):

```js
const parentsData = (response.data.data || []).filter(user => {
  return user && user.role === 'parent' && user.role !== 'reception' && user.role !== 'admin' && user.role !== 'teacher';
});
```

When `user.role === 'parent'` is true, the remaining conditions (`!== 'reception'`, `!== 'admin'`, `!== 'teacher'`) are always true. This is dead logic and signals the author was defensive about a leaky API response. The API should return only parents; the filter should just be `user.role === 'parent'`.

**Admin app overall:** Mostly clean routing, lazy loading, proper ErrorBoundary. Dashboard's 3-level fallback chain (lines 1–253) signals API instability. The broken `showToast` bug is the critical issue.

---

### 1.2 Reception App (`reception/`)

**Structure:** 8 pages, 8 components, 2 test files. Full write access for teachers and groups; ParentManagement (not yet visible from routes). Uses custom confirm dialogs in ParentManagement but `window.confirm` in TeacherManagement and GroupManagement.

#### Issue 05-004 — HIGH: `dataStore.js` — 540-line Dead Code File

[`reception/src/services/dataStore.js`](reception/src/services/dataStore.js) is a complete frontend-only localStorage CRUD system covering parents, teachers, children, groups, schedules, media, activities, meals, menus, news, notifications, attendance, and system settings. It was confirmed dead via grep: **no reception page imports it**. Only a comment in `utils.test.js` line 5 references it by name.

Key issues within the dead file:
- `generateId()` uses `Date.now().toString() + Math.random()` — not UUID-compatible
- Implements full CRUD with local state only — zero server sync
- 540 lines that confuse any developer trying to understand the data layer

This is an unremoved prototype artifact from early development. It should be deleted.

#### Issue 05-005 — HIGH: `window.confirm()` in Two Reception Pages

- [`reception/src/pages/TeacherManagement.jsx:119`](reception/src/pages/TeacherManagement.jsx#L119): `if (!window.confirm(t('teachersPage.confirmDelete')))`
- [`reception/src/pages/GroupManagement.jsx:83`](reception/src/pages/GroupManagement.jsx#L83): `if (!window.confirm(t('groupsPage.confirmDelete')))`

By contrast, `reception/src/pages/ParentManagement.jsx` correctly uses a custom `confirmDialog` state for delete confirmations. This inconsistency means destructive teacher/group deletes show a browser native dialog while parent-related flows use the app's design system.

#### Issue 05-006 — MEDIUM: Hardcoded Strings in `reception/Settings.jsx`

Three hardcoded Uzbek strings bypass i18n in [`reception/src/pages/Settings.jsx`](reception/src/pages/Settings.jsx):
- Line 419: `"Davlatga xabar yuborish"` (modal title — should be `t('profile.sendToGovernment')`)
- Line 529: `"Javob berildi"` (badge label — should be `t('profile.replied')`)
- Line 545: `"Davlat javobi"` (section heading — should be `t('profile.governmentReply')`)

Additionally, line 232: `placeholder="+1 (555) 123-4567"` — a US phone number placeholder in a Uzbekistan platform. Should be `+998 XX XXX XX XX`.

**Reception app overall:** Core pages are well-structured. The dead `dataStore.js` is the most disorienting issue. GroupManagement correctly uses `Promise.catch()` chaining on individual API calls before the outer try block — a good defensive pattern.

---

### 1.3 Government App (`government/`)

**Structure:** 10 pages (+ AdminDetails at `/government/admins/:id`), 12 components + 5 tab components, 5 test files. Best test coverage of the three apps.

#### Issue 05-007 — HIGH: `Platform.jsx` State Monolith

[`government/src/pages/Platform.jsx`](government/src/pages/Platform.jsx) (377 lines):

- **25+ state variables** all declared at the top component level for a 5-tab CRUD page (admins, government users, registration requests, messages, government profile)
- **4 independent `useEffect` hooks** on mount — fire sequentially as the component renders rather than being composed into a single `Promise.allSettled` call
- **3 `window.confirm()` calls** — `handleDeleteAdmin` (line 184), `handleDeleteGovernment` (line 249), `handleApproveRequest` (line 260)
- **Line 16:** `const { success, error: showError } = useToast?.() || {}` — `?.()` on a hook call is an anti-pattern. Hooks must always be called unconditionally; optional-chaining them suggests the author was unsure whether the context was available
- All form state and every handler are prop-drilled to tab components. `AdminsTab` receives 20+ props
- `handleMarkRead` swallows errors silently (`catch { /* ignore */ }`)

The tab components (`AdminsTab`, `GovernmentUsersTab`, `RegistrationsTab`, `MessagesTab`) are defined in [`government/src/components/`](government/src/components/) but exist purely as prop receivers — they add complexity without encapsulating any logic.

#### Issue 05-008 — HIGH: Hardcoded `?limit=500` in Two Government List Pages

- [`government/src/pages/Students.jsx:21`](government/src/pages/Students.jsx#L21): `api.get('/government/students?limit=500')`
- [`government/src/pages/Teachers.jsx:21`](government/src/pages/Teachers.jsx#L21): `api.get('/government/teachers?limit=500')`

Both pages load up to 500 records into client memory with no pagination, no load-more, no virtual scroll. At scale this is a memory and render performance problem. No error state: failures silently return empty arrays with no UI feedback.

#### Issue 05-009 — MEDIUM: `I18nextProvider` Inconsistency

[`government/src/App.jsx`](government/src/App.jsx) wraps the entire tree in `<I18nextProvider i18n={i18n}>`. `admin/src/App.jsx` and `reception/src/App.jsx` do not. All three apps share the same i18n instance via module-level state so this likely works at runtime, but it's architecturally inconsistent and could cause rendering differences during server-side or test environments where module state is not shared.

Additionally, `OfflineBanner` is placed inside `AppRoutes` (inside Router) in government, while admin and reception place it outside `AppRoutes` — different DOM tree positions for the same component.

#### Issue 05-010 — MEDIUM: Errors Silently Swallowed in Government List Pages

Multiple government pages catch errors and return empty arrays/states with no user-visible error message:

- [`government/src/pages/Schools.jsx:38–40`](government/src/pages/Schools.jsx#L38)
- [`government/src/pages/Students.jsx:26–28`](government/src/pages/Students.jsx#L26)
- [`government/src/pages/Teachers.jsx:26–28`](government/src/pages/Teachers.jsx#L26)
- [`government/src/pages/Ratings.jsx:99`](government/src/pages/Ratings.jsx#L99) — per-school review load, with comment "swallowed: surface to UI when toast hook is available"

`government/src/pages/Dashboard.jsx` correctly uses `Promise.allSettled` and shows a `<StaleIndicator>` on partial failure. The same pattern was not carried through to the list pages.

#### Issue 05-011 — MEDIUM: `t` Prop-Drilled to `SchoolCard`

[`government/src/pages/Ratings.jsx:337`](government/src/pages/Ratings.jsx#L337) passes `t` as a prop: `<SchoolCard key={school.id} school={school} t={t} />`. The `SchoolCard` sub-component (defined in the same file, lines 74–237) should call `const { t } = useTranslation()` directly. Passing `t` as a prop is unnecessary coupling that also means SchoolCard cannot be extracted to its own file without changing its interface.

#### Issue 05-012 — LOW: Hardcoded Locale and Labels

- [`government/src/pages/AdminDetails.jsx:304`](government/src/pages/AdminDetails.jsx#L304): `Tug&apos;ilgan:` hardcoded Uzbek label outside `t()`
- [`government/src/pages/Dashboard.jsx:177`](government/src/pages/Dashboard.jsx#L177): `new Date(admin.createdAt).toLocaleDateString('uz-UZ')` — locale hardcoded as `'uz-UZ'` rather than reading from i18n
- [`government/src/pages/AdminDetails.jsx:150`](government/src/pages/AdminDetails.jsx#L150): `new Date(admin.createdAt).toLocaleDateString('uz-UZ')` — same pattern

---

### 1.4 Test Coverage Comparison

| App | Test Files | Meaningful Page/Component Tests | Auth Unit Tests |
|-----|-----------|--------------------------------|-----------------|
| admin | 3 | 0 (AuthContext.test.jsx tests context factory, not the admin pages) | Yes |
| reception | 2 | 0 | Yes |
| government | 5 | 17 (Platform, SharedComponents, SharedHooks) | Yes |

Government stands out positively. `Platform.test.jsx` (107 lines) includes 5 component-level tests with proper `vi.mock` API mocking. `SharedComponents.test.jsx` (113 lines) tests 12 accessibility cases for LoadingSpinner, Card, and ErrorBoundary. `SharedHooks.test.jsx` (94 lines) tests `useDebounce`, `useSubmitDebounce`, and `useAsync` including stale-data-on-network-error behavior.

Admin and reception have no page or component tests at all. They test only the auth context factory logic, which is shared code already tested by the government tests. This is effectively zero incremental test coverage for admin or reception pages.

#### Issue 05-013 — MEDIUM: Admin/Reception Near-Zero Test Coverage

Neither `admin/` nor `reception/` has tests for any of their pages or components. Given that `admin/TeacherManagement.jsx` has a critical bug (broken `showToast`) that a simple render test would have caught immediately, the lack of test coverage is directly contributing to the issue count.

---

## 2. Cross-App Summary

| Issue | Severity | App(s) | File(s) |
|-------|----------|--------|---------|
| `showToast` undefined — error feedback silently broken | CRITICAL | admin | TeacherManagement:27, GroupManagement:25, ParentManagement:36 |
| 540-line dead localStorage data store | HIGH | reception | services/dataStore.js |
| `?limit=500` — all records loaded into browser memory | HIGH | government | Students:21, Teachers:21 |
| `window.confirm()` used for destructive actions | HIGH | reception, government | TeacherManagement:119, GroupManagement:83, Platform:184,249,260 |
| Platform.jsx state monolith + optional-chained hook | HIGH | government | Platform.jsx:1–377 |
| `I18nextProvider` in government only | MEDIUM | government | App.jsx |
| Hardcoded strings bypassing i18n | MEDIUM | reception | Settings:419, 529, 545 |
| `UsersStats` — hardcoded English + swallowed error | MEDIUM | admin | UsersStats:37–69 |
| Errors silently swallowed — empty list with no feedback | MEDIUM | government | Schools:38, Students:26, Teachers:26, Ratings:99 |
| US phone placeholder | MEDIUM | reception | Settings:232 |
| Redundant role filter logic | MEDIUM | admin | ParentManagement:49–52 |
| `t` prop-drilled to SchoolCard | MEDIUM | government | Ratings:337 |
| Near-zero page/component test coverage | MEDIUM | admin, reception | `__tests__/` |
| Hardcoded Uzbek label | LOW | government | AdminDetails:304 |
| Hardcoded `'uz-UZ'` locale in date formatting | LOW | government | Dashboard:177, AdminDetails:150 |
| Error silent empty states | LOW | government | Schools, Students, Teachers |

**Total: 1 CRITICAL · 4 HIGH · 8 MEDIUM · 3 LOW = 16 issues**

---

## 3. What's Actually Good

- **Admin dashboard fallback chain** (`admin/src/pages/Dashboard.jsx`): 3-level fallback with per-endpoint fallback is over-engineered, but it means the admin always sees _something_ rather than a blank page.
- **Government dashboard**: `Promise.allSettled` + `StaleIndicator` is the correct pattern for partial-failure graceful degradation.
- **Government test suite**: 17 meaningful tests including regression guards for removed features (no `/super-admin/*` or `/payments` calls).
- **Reception `ParentManagement.jsx`**: Correctly uses custom `confirmDialog` state rather than `window.confirm()` — the right pattern that should be spread to TeacherManagement and GroupManagement.
- **Reception `GroupManagement.jsx`**: Uses `.catch()` chaining on individual API calls to prevent a partial failure from blocking the entire load.
- **`AdminDetails.jsx`**: UUID validation guard before firing the API call (`UUID_RE.test(id)`) prevents spurious 400 requests from bookmarked or malformed URLs.
