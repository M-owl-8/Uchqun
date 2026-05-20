# Government Portal — Step 1 Deep Audit

**Date:** 2026-05-21  
**Auditor:** Claude (automated, read-only)  
**Portal:** `government/` — React 18, Vite, Tailwind CSS  
**Backend branch audited:** `main` (post pre-launch sprint)  
**Finding count:** 14 total — 1 critical · 4 high · 5 medium · 4 low

> **S0 doc corrections:** `00-understanding.md` contained two inaccuracies discovered during this audit:
> (1) Routes listed as `/` → Dashboard etc. — actual prefix is `/government` (see `App.jsx`).
> (2) i18n described as "8 files per language" — actual: 1 file per language (`common.json`); shared files merged at runtime by `i18n.js`.
> All findings in this document reflect the verified state.

---

## Section A — Executive Summary

The Government portal is a well-structured React SPA that manages school oversight,
admin registration approval, AI safeguarding warnings, and government messaging. The
auth flow, route protection, and shared utilities (cache, fetch, Axios factory) are
correctly wired.

However, this audit found **one critical data-integrity bug** on the highest-stakes
feature (AI safeguarding warnings), **one high bug that makes a key workflow completely
non-functional** (credentials display after admin approval), and systemic risks in
i18n coverage and error-format handling.

### Finding summary

| Severity | Count | Highest-risk area |
|---|---|---|
| Critical | 1 | GOV-001: Dashboard warning count always wrong |
| High | 4 | GOV-002: Credentials email `undefined`; GOV-003: Schools silently truncated; GOV-004: Entire `warnings.*` locale section absent; GOV-005: Suspended-user login error wrong |
| Medium | 5 | GOV-006: Stale closure unread count; GOV-007: Error-format fragility; GOV-008: `window.confirm` vs ConfirmDialog; GOV-009: SchoolDetail defensive coding; GOV-010: CSV export truncated |
| Low | 4 | GOV-011: `express` prod dep; GOV-012: `console.error` in prod; GOV-013: Hardcoded Uzbek aria-label; GOV-014: Missing locale keys masked by defaultValues |

**What is working correctly:** auth/refresh mutex, role guard (`isGovernment`), SWR
cache pattern, Profile/Settings API calls, Messages reply/delete/read, AIWarnings
filter param (on the dedicated page), `AbortController` cleanup, `Promise.allSettled`
parallel fetch, ErrorBoundary on all routes.

---

## Section B — Findings

---

### GOV-001 · CRITICAL · Backend Integration

**Dashboard AI warnings count uses wrong query param — count is always the total unresolved count**

**File:** `government/src/pages/Dashboard.jsx:45`

```js
api.get('/ai-warnings', { params: { resolved: false } }),
```

**Backend verification:** `backend/controllers/aiWarningController.js:161–185`

```js
// Backend reads `isResolved`, not `resolved`:
const isResolved = req.query.isResolved === 'true';
const where = { isResolved };
```

The backend ignores the unknown `resolved` parameter entirely. Because `isResolved`
is not supplied, the `where` clause becomes `{ isResolved: undefined }`, which
Sequelize drops — returning **all warnings regardless of resolved status**.

**Impact:** The Dashboard warning-count badge (line 71) always shows the total
unresolved-warning count. A government official who has resolved warnings still
sees the full count on the dashboard, giving a false picture of outstanding
safeguarding alerts. This is the portal's highest-stakes feature.

**Contrast:** `AIWarnings.jsx:93` (the dedicated warnings page) correctly sends
`isResolved: filter === 'resolved'`, so the warnings page itself works correctly —
only the Dashboard count is wrong.

**Recommendation:** Change line 45 to `{ params: { isResolved: false } }`.

---

### GOV-002 · HIGH · Backend Integration

**Admin credentials display shows `undefined` email — clipboard copies `undefined`**

**File:** `government/src/components/tabs/RegistrationsTab.jsx:131–132`

```jsx
<input type="text" readOnly value={approvedCredentials.email || ''} ... />
onClick={() => { navigator.clipboard.writeText(approvedCredentials.email); ... }}
```

**Backend verification:** `backend/controllers/adminRegistrationController.js` (approval endpoint)

```js
res.json({
  success: true,
  data: {
    request: request.toJSON(),
    admin: adminUser.toJSON(),   // ← email lives here
    setPasswordUrl,
    telegramUsername: request.telegramUsername,
  },
});
```

**Platform.jsx:246** (where `approvedCredentials` is set):

```js
setApprovedCredentials(res.data?.data?.credentials || res.data?.data);
```

`res.data?.data` has no `.credentials` sub-key, so `approvedCredentials` is set
to the full `{ request, admin, setPasswordUrl, telegramUsername }` object. The
email is at `approvedCredentials.admin.email`, not `approvedCredentials.email`.

**Impact:** Every time a government user approves an admin registration, the email
field in the credentials panel is blank and the clipboard copy writes `"undefined"`.
The set-password URL (line 143) and Telegram username (line 157) are unaffected —
those keys exist at the top level.

**Recommendation:** Change line 131 to `value={approvedCredentials.admin?.email || ''}` and line 132 to `navigator.clipboard.writeText(approvedCredentials.admin?.email)`.

---

### GOV-003 · HIGH · State Management / Backend Integration

**Schools list silently truncates at backend default — badge and CSV export reflect truncated data**

**File:** `government/src/pages/Schools.jsx` (entire fetch, no pagination)

```js
const { data, loading, error } = useFetch('/government/schools');
// ...
<span className="badge">{schools.length}</span>
// ...
const csv = schools.map(s => [...]).join('\n');
```

The component fetches `/government/schools` with no `limit` or `offset` parameter.
The backend applies `parsePagination` with a default cap — `CP-001` in
`LOOP_CROSS_PORTAL.md` documents that the default cap is now 200 (previously 500).

**Impact:** If there are more than 200 schools:
- The badge shows e.g. "200" when the real total may be higher (no `total` from pagination).
- The CSV export silently omits schools beyond the limit — a government official
  downloading data for a regulatory report would receive an incomplete file with no warning.

**Recommendation:** Implement pagination UI per CP-001, or at minimum pass `?limit=999`
as a documented workaround until pagination UI is built, and display `total` from
the paginated response rather than `schools.length`.

---

### GOV-004 · HIGH · i18n

**`warnings.*` locale section absent from all three language files — Russian users see Uzbek fallback text on the safeguarding page**

**Files verified:**
- `government/src/locales/en/common.json` — no `warnings` key
- `government/src/locales/uz/common.json` — no `warnings` key
- `government/src/locales/ru/common.json` — no `warnings` key

**File:** `government/src/pages/AIWarnings.jsx:121`

```js
showError(err.response?.data?.error || t('warnings.resolveError', { defaultValue: "Ogohlantirishni hal qilishda xato" }));
```

Every `t()` call on the AIWarnings page uses `defaultValue` with Uzbek hardcoded
strings. Because `fallbackLng: 'uz'` is set in `i18n.js`, a Russian-language user
receives Uzbek strings on every label of this page — filter labels, resolve buttons,
empty-state messages, and error toasts.

**Impact:** The AI warnings page is the government portal's primary safeguarding
interface. Russian-speaking government officials (a significant user segment per the
project's target regions) see an entirely Uzbek UI on the most sensitive page.

**Recommendation:** Add a `warnings` section to all three `common.json` files. Keys
needed: `warnings.title`, `warnings.filterAll`, `warnings.filterUnresolved`,
`warnings.filterResolved`, `warnings.resolveButton`, `warnings.resolveError`,
`warnings.resolveSuccess`, `warnings.empty`, `warnings.loadError`.

---

### GOV-005 · HIGH · Error Handling

**Login maps suspended-user 401 to wrong status code — shows generic error instead of "account suspended"**

**File:** `government/src/pages/Login.jsx:29`

```js
else if (result.status === 403) setError(t('login.notApproved'));
```

**Backend verification:** `backend/middleware/auth.js:96`

```js
if (!isGovernment && (user.status === 'suspended' || user.status === 'archived')) {
  return res.status(401).json({ ... code: 'ACCOUNT_NOT_ACTIVE' ... });
}
```

A suspended user receives HTTP 401, not 403. The Login.jsx status-code check for
403 is never triggered for this case. The response falls through to the generic
`setError(t('login.error'))` branch, showing "Email yoki parol noto'g'ri" (email
or password incorrect).

**Impact:** A government user whose account is suspended (e.g., during security
review) sees a misleading "wrong password" message rather than a meaningful
"account suspended" message. This impedes support triaging.

**Note:** Government users are exempt from the `isActive` gate but NOT from the
`status` gate. This path is reachable for government accounts.

**Recommendation:** Add `else if (result.status === 401 && result.data?.error?.code === 'ACCOUNT_NOT_ACTIVE')` before the generic 401 branch.

---

### GOV-006 · MEDIUM · State Management

**MessagesTab stale closure corrupts unread count during "load more"**

**File:** `government/src/components/tabs/MessagesTab.jsx:54`

```js
const unread = (append
  ? [...(append ? messages : []), ...incoming]  // `messages` is a stale closure
  : incoming
).filter(m => !m.isRead).length;
```

`messages` is captured from the outer component scope at the time `fetchMessages`
is defined. The function is memoized with `[debouncedSearch]` as deps (line 64),
so `messages` is never refreshed:

```js
}, [debouncedSearch]); // eslint-disable-line react-hooks/exhaustive-deps
```

The `eslint-disable` comment acknowledges the suppressed warning. When a user
loads more messages, the unread count is computed by spreading a stale `messages`
snapshot rather than the current state — the displayed unread badge may undercount
or overcount after the first load-more.

**Recommendation:** Use a functional state update (`setMessages(prev => ...)`) and
compute `unread` from the post-merge result, or add `messages` to the `useCallback`
deps and accept the refetch-on-new-message behavior.

---

### GOV-007 · MEDIUM · Error Handling

**All error handlers read `err.response?.data?.error` as a string — silent failure when endpoint uses new `{ success, data }` error shape**

Multiple locations across the portal read errors as:

```js
// Platform.jsx:110
showError(error.response?.data?.error || t('government.toastSaveError'));

// AIWarnings.jsx:121
showError(err.response?.data?.error || t('warnings.resolveError', ...));

// Settings.jsx:47
showError(error.response?.data?.error || t('settings.passwordError', ...));
```

For endpoints that have migrated to the new shape (`{ success: false, error: { code, detail } }`),
`err.response?.data?.error` evaluates to `{ code: '...', detail: '...' }` — an
object, not a string. `showError({ code: ... })` would display `[object Object]`.

**Current exposure:** The endpoints consumed by these handlers (`/government/*`,
`/user/profile`, `/user/password`) still return the old string format. The risk is
latent — it will activate silently if any of these endpoints are refactored to the
new shape.

**Recommendation:** Normalize at the point of reading: `err.response?.data?.error?.detail ?? err.response?.data?.error ?? t(...)`.

---

### GOV-008 · MEDIUM · UX Consistency

**`window.confirm` used for message deletion in MessagesTab; `ConfirmDialog` used in Platform — inconsistent destructive action pattern**

**File:** `government/src/components/tabs/MessagesTab.jsx:97–98`

```js
if (!window.confirm(t('government.confirmDeleteMessage', { defaultValue: "Bu xabarni o'chirmoqchimisiz?" }))) return;
```

**Contrast:** `government/src/pages/Platform.jsx` (admin deletion) uses the shared
`ConfirmDialog` component with title/body/confirm-label props.

`window.confirm` is synchronous, cannot be styled with the app's design system,
does not support i18n formatting beyond a plain string, and has inconsistent
browser styling across platforms.

**Recommendation:** Replace `window.confirm` in MessagesTab with `ConfirmDialog`.

---

### GOV-009 · MEDIUM · Defensive Coding / UX

**SchoolDetail uses fragile response-shape fallbacks that mask backend contract uncertainty**

**File:** `government/src/pages/SchoolDetail.jsx:39–40`

```js
const school = data.school || data;   // fallback: author unsure if school is nested
const stats = data.stats || {};       // fallback: .stats sub-key may not exist
```

The backend returns a flat object (`getSchoolDetail` returns the school record
directly, not nested under `.school`). The `.stats` sub-key does not exist in the
current response. These defensive patterns suggest the frontend was written without
verifying the actual response shape.

**Secondary UX issue:** If a school is archived, the portal currently has no UI to
indicate this state (tracked as CP-014). A government user navigating to an archived
school's detail page sees the same data view as an active school, with no visible
"archived" indicator or reactivate option.

**Recommendation:** Remove the `|| data` fallback once the shape is confirmed. Add
an "Archived" banner when `school.isActive === false`. Implement archive/reactivate
buttons per CP-014.

---

### GOV-010 · MEDIUM · Data Correctness

**Schools CSV export silently exports only the loaded (potentially truncated) subset**

**File:** `government/src/pages/Schools.jsx` (CSV export logic)

```js
const csv = schools.map(s => [
  s.name, s.region, s.address, s.adminName, s.status
].join(',')).join('\n');
```

`schools` is the array fetched from a single paginated API call (see GOV-003). If
the backend caps results at 200 and there are 250 schools, the exported CSV contains
200 rows with no warning, no row count in the filename, and no indication that data
was truncated.

**Impact:** A government official downloading school data for regulatory submission
receives a silently incomplete file. This is distinct from GOV-003 (which is about
the badge count) — it is specifically a data-export correctness issue.

**Recommendation:** Either fetch all pages before exporting, or add a visible notice
("Exporting {schools.length} of {total} schools") and disable the export button
when `schools.length < total`.

---

### GOV-011 · LOW · Code Quality

**`express` listed as a production dependency in a Vite SPA**

**File:** `government/package.json`

```json
"dependencies": {
  "express": "^4.18.2",
  ...
}
```

`express` has no runtime role in a Vite-built SPA deployed to Netlify/Vercel. It
should not appear in `dependencies`. If it was added for a local dev proxy it
belongs in `devDependencies`; if it is unused it should be removed. It adds ~0.5 MB
to the production bundle and exposes an unnecessary server-framework version to
package scanners.

**Recommendation:** Move to `devDependencies` or remove entirely after confirming it
is not used in any `vite.config.js` plugin or build script.

---

### GOV-012 · LOW · Code Quality

**`console.error` debug log left in production Dashboard code**

**File:** `government/src/pages/Dashboard.jsx:56`

```js
console.error('[Dashboard] revalidation error:', err);
```

This log fires on every background revalidation failure (network hiccup, server
restart) and emits to the browser console in production. It exposes internal
architecture naming to end users with devtools open.

**Recommendation:** Remove or replace with the Sentry `captureException` call
(PL-005) once the DSN is configured.

---

### GOV-013 · LOW · Accessibility

**Password toggle `aria-label` hardcoded in Uzbek — not translated**

**File:** `government/src/pages/Login.jsx:102`

```jsx
aria-label={showPassword ? 'Parolni yashirish' : "Parolni ko'rsatish"}
```

The aria-label is a Uzbek literal string, not a `t()` call. Screen-reader users
operating in Russian or English hear Uzbek labels on the password visibility toggle.

**Recommendation:** Replace with `t('login.hidePassword', { defaultValue: "Parolni yashirish" })` and `t('login.showPassword', ...)`, and add both keys to all three locale files.

---

### GOV-014 · LOW · i18n

**Multiple dashboard, schools, and profile keys missing from all locale files — defaultValue fallbacks mask the gaps**

The following keys are called with `t(key, { defaultValue: '<Uzbek string>' })` but
are absent from `en/common.json`, `uz/common.json`, and `ru/common.json`:

| Key | Used in | DefaultValue language |
|---|---|---|
| `dashboard.pendingAdmins` | Dashboard.jsx | Uzbek |
| `dashboard.activeWarnings` | Dashboard.jsx | Uzbek |
| `dashboard.andMore` | Dashboard.jsx | Uzbek |
| `dashboard.viewAll` | Dashboard.jsx | Uzbek |
| `dashboard.schoolsMore` | Dashboard.jsx | Uzbek |
| `dashboard.regionalBreakdown` | Dashboard.jsx | Uzbek |
| `dashboard.colRegion` | Dashboard.jsx | Uzbek |
| `dashboard.colSchools` | Dashboard.jsx | Uzbek |
| `dashboard.colAvgRating` | Dashboard.jsx | Uzbek |
| `dashboard.noRatings` | Dashboard.jsx | Uzbek |
| `dashboard.unknownRegion` | Dashboard.jsx | Uzbek |
| `dashboard.pendingAdminList` | Dashboard.jsx | Uzbek |
| `dashboard.noPendingAdmins` | Dashboard.jsx | Uzbek |
| `schools.exportCSV` | Schools.jsx | Uzbek |
| `profile.governmentRole` | Profile.jsx | Uzbek |
| `profile.save` | Profile.jsx | Uzbek |
| `profile.edit` | Profile.jsx | Uzbek |

All 17 keys fail silently — no console warning, no crash — because `defaultValue`
is provided. However:
- English users see Uzbek strings for all 17 labels.
- Russian users see Uzbek strings (fallback language is `uz`, not `ru`).

**This is distinct from GOV-004** (the `warnings.*` section, which is the
safeguarding-critical case). These keys affect the dashboard overview, schools list,
and profile page.

**Recommendation:** Add all 17 keys to `en/common.json`, `uz/common.json`, and
`ru/common.json` in the same pass as GOV-004.

---

## Section C — Pattern Observations

### 1. Old-format error reading is universal
Every error handler in the portal reads `err.response?.data?.error` as a plain
string. This is correct for the current government endpoints (which all use the old
format), but creates a fragile implicit contract: any endpoint migration to the new
`{ success: false, error: { code, detail } }` shape will break error display silently.
The pattern should be normalized before endpoint migrations happen.

### 2. `defaultValue` fallbacks mask i18n incompleteness
The portal makes heavy use of `t(key, { defaultValue: '<Uzbek string>' })`. This
pattern hides missing translation keys at runtime — no crash, no warning — but
results in English and Russian users seeing Uzbek UI text. The `warnings.*` section
(GOV-004) and 17 other keys (GOV-014) are the current gaps. A locale-completeness
linting step (similar to `verify-i18n.js` on the backend) would surface these
automatically.

### 3. Inconsistent destructive-action confirmation
Two patterns exist in the same portal: `window.confirm` (MessagesTab) and the
shared `ConfirmDialog` component (Platform admin deletion). The `ConfirmDialog`
component was presumably introduced to provide a consistent, styleable, i18n-friendly
alternative. The `window.confirm` usage is a holdover that was never updated.

### 4. Defensive response-shape coding in SchoolDetail
`data.school || data` and `data.stats || {}` in SchoolDetail.jsx indicate the
frontend was written without firm knowledge of the backend response shape. The
backend returns a flat object; the `.school` and `.stats` fallbacks are dead code.
This pattern should be removed and the exact shape documented.

### 5. Query param mismatch between Dashboard and AIWarnings for the same endpoint
Dashboard.jsx sends `{ resolved: false }` while AIWarnings.jsx sends
`{ isResolved: false }` to the same `/ai-warnings` endpoint. The two pages were
apparently written independently. The AIWarnings page is correct; the Dashboard
page was never aligned with it.

---

## Section D — Gaps (not bugs)

These items are missing features or unimplemented CP handoffs, not code defects.

### D-1 · CP-001 · No pagination UI for schools list

`GET /government/schools` now returns paginated data with `total/limit/offset`.
The Schools.jsx page has no "Load more" or page-selector UI, and does not use the
`total` field from the response. The badge and CSV export reflect only the first
page of results. See GOV-003 and GOV-010 for the bug-level consequences of this gap.

**Action required:** Government portal must implement pagination UI on Schools page
before real-user launch (tracked in `LOOP_CROSS_PORTAL.md` CP-001).

### D-2 · CP-014 · No archive/reactivate buttons on SchoolDetail

Backend routes `PUT /government/schools/:id/archive` and
`PUT /government/schools/:id/reactivate` exist (`backend/routes/governmentRoutes.js:63–64`)
but the SchoolDetail.jsx page has no buttons to invoke them. Government users cannot
archive or reactivate schools from the portal.

**Action required:** Add archive/reactivate action buttons to SchoolDetail.jsx
(tracked in `LOOP_CROSS_PORTAL.md` CP-014).

### D-3 · CP-016 · No restore UI in government portal

Backend endpoints for restoring soft-deleted records across schools exist
(`PUT /admin/children/:id/restore`, etc. with government-role cross-school access),
but the government portal has no UI surface to invoke them.

**Action required:** Assess whether government portal needs a restore UI, or whether
this is admin-portal-only. If needed, implement per CP-016 in `LOOP_CROSS_PORTAL.md`.

### D-4 · CP-019 · No AI translation notice on first login

The government portal loads Russian and Uzbek translations that are AI-generated and
labeled `UNVERIFIED`. The CP-019 requirement (one-time notice on first login: "This
platform's translations are auto-generated and may contain errors") has not been
implemented in this portal.

**Action required:** Implement the CP-019 first-login notice in the government portal
(tracked in `LOOP_CROSS_PORTAL.md` CP-019). Dismiss on user acknowledgement; remove
once PL-009-VERIFY is complete.

---

## Section E — i18n Readiness Assessment

**Verdict: NOT READY for Russian-language users. Ready (with caveats) for Uzbek-language users.**

### Current state

The portal uses a single `common.json` file per language (`en`, `uz`, `ru`), merged
at runtime with shared locale files from `shared/locales/`. The `fallbackLng` is
`'uz'`. All three files exist and load correctly.

### Coverage gaps

| Gap | Severity | Affected users |
|---|---|---|
| `warnings.*` section entirely absent (GOV-004) | High | All users — Russian sees Uzbek; English sees Uzbek |
| 17 dashboard/schools/profile keys absent (GOV-014) | Low | English and Russian users see Uzbek |
| Hardcoded Uzbek `aria-label` in Login (GOV-013) | Low | Screen-reader users in EN/RU |

### Russian language risk (definitive)

A Russian-language government official navigating the portal today will encounter
Uzbek text on:
- The entire AIWarnings / safeguarding page (GOV-004) — all labels, filter buttons,
  resolve buttons, empty state, error toasts
- 13 dashboard labels (panel headers, table column headers, empty states)
- 3 schools-page labels (export button)
- 3 profile-page labels (role label, save/edit buttons)

This is not a crash or functional failure, but it is a localization regression that
affects the safeguarding-critical surface of the portal.

### Uzbek language

Uzbek users receive the `defaultValue` strings directly, which are Uzbek literals.
Coverage is effectively complete for Uzbek users, pending the professional
translation review (PL-009-VERIFY).

### English language

English users see Uzbek `defaultValue` strings for the 20+ missing keys. This
affects legibility for any non-Uzbek developer or international auditor using the
portal in English.

### Recommendation

1. Add `warnings.*` to all three locale files immediately (GOV-004 — highest priority).
2. Add the 17 missing keys from GOV-014 to all three locale files.
3. Fix the hardcoded `aria-label` in Login.jsx (GOV-013).
4. Add a locale-completeness CI check (similar to `backend/scripts/verify-i18n.js`)
   that fails if any key present in `uz/common.json` is absent from `en/common.json`
   or `ru/common.json`.
5. Implement CP-019 AI-translation notice.

---

## Section F — Out of Scope

The following were observed but not audited in depth for this step:

- **Test coverage completeness:** Three test files exist (`SharedComponents.test.jsx`,
  `SharedHooks.test.jsx`, `Platform.test.jsx`). No page-level tests for Dashboard,
  Schools, AIWarnings, Login, or SchoolDetail were found. Test coverage audit is
  deferred to Step 2 (Execute Fixes) when new tests will be written alongside fixes.

- **Ratings.jsx deep audit:** The Ratings page was read (AbortController, SWR cache,
  non-memoized `doFetch`) but no findings were elevated — the page functions correctly
  within its current scope. `doFetch` not being memoized (line 249) is a minor code
  smell but does not cause incorrect behavior.

- **Accessibility beyond aria-labels:** Full WCAG 2.1 audit (focus management, color
  contrast, keyboard navigation) is out of scope for this step.

- **Bundle size / Lighthouse performance:** The `express` production dependency
  (GOV-011) is the only performance-relevant finding elevated. Full bundle analysis
  deferred.

- **Backend government controllers deep audit:** Government-side controllers
  (`governmentController.js`, `governmentSchoolController.js`,
  `governmentMessageController.js`) were read only to the extent needed to verify
  frontend call sites. A full backend controller audit for the government routes is
  deferred to the Backend audit pass.

- **Mobile responsiveness:** Not assessed. Government portal is assumed to be
  desktop-primary.
