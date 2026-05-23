# Reception Portal — Step 0: Understanding

**Date:** 2026-05-23
**Branch:** main
**Auditor:** S0 reconnaissance (read-only, no changes made)

---

## 1. Portal Overview

| Item | Value |
|---|---|
| Framework | React 18 + Vite |
| Dev port | 5177 |
| API service | `createApi({ tokenKey: 'reception_accessToken' })` via `@shared/services/api` |
| Auth context | `createAuthContext({ tokenKey: 'reception_accessToken', requiredRole: 'reception' })` |
| i18n | i18next, `fallbackLng: 'uz'`, merges shared + portal locales |
| State hydration | Stale-while-revalidate via `shared/utils/cache` |
| Test runner | Vitest + @testing-library/react |

**Backend middleware chain for reception routes:**
`authenticate → requireReception` (both checked). `requireReception` enforces `role === 'reception'` AND `documentsApproved && isActive`.

**Auth guard in frontend (ProtectedRoute.jsx):**
Checks `isAuthenticated && isReception` — no `mustChangePassword` check (see RE-4).

---

## 2. Route Map (`reception/src/App.jsx`)

| Path | Component | Notes |
|---|---|---|
| `/reception` | Dashboard | Default route (index) |
| `/reception/parents` | ParentManagement | List + CRUD + child CRUD |
| `/reception/parents/new` | ParentWizardPage | 3-step parent/child/group wizard |
| `/reception/teachers` | TeacherManagement | List + CRUD + ratings viewer |
| `/reception/groups` | GroupManagement | List + CRUD |
| `/reception/documents` | Documents | Own-document upload — **BROKEN** (see RE-2) |
| `/reception/settings` | Settings | Profile, password, gov message |
| `/reception/profile` | Profile | Legacy profile page (same gov-message functionality as Settings) |
| `/reception/wizard/complete` | WizardCompletePage | Post-wizard success screen |
| `*` | NotFound | 404 fallback |

**Gap:** No `/login` route in App.jsx — `Login.jsx` exists as a page file but must be mounted via a parent router or separate entry. Assumed handled at the root level.

---

## 3. Pages Inventory — Purpose and Endpoints

### 3a. Dashboard

**Purpose:** Summary counts (parents, teachers, groups, pending documents) + quick links.

| Endpoint | Method | Accessor | Shape |
|---|---|---|---|
| `/reception/parents` | GET | `res.data.data` | ✅ new |
| `/reception/teachers` | GET | `res.data.data` | ✅ new |
| `/groups` | GET | `res.data.groups` | ⚠️ old (see RE-3) |
| `/reception/my-documents` | GET | `res.data.documents` | ❌ WRONG URL + WRONG SHAPE (see RE-2) |

`// TODO(phase-2): wire to /reception/my-documents?status=pending` — developer comment left in Dashboard.jsx. Pending-doc badge not wired.

**Activate button** on pending-parent cards is display-only — renders a button but has no `onClick` handler. Status indicator only.

---

### 3b. ParentManagement

**Purpose:** Full CRUD for parents and their children; bulk delete; group/teacher assignment.

| Endpoint | Method | Accessor | Notes |
|---|---|---|---|
| `/reception/parents` | GET | `res.data.data` | ✅ |
| `/reception/teachers` | GET | `res.data.data` | ✅ |
| `/groups` | GET | `res.data.groups` | ⚠️ old shape |
| `/reception/parents` | POST | FormData | ✅ — multer `fields([{ name: 'child[photo]' }])` |
| `/reception/parents/:id` | PUT | JSON | ✅ |
| `/reception/parents/:id` | DELETE | — | ✅ |
| `/reception/children` | POST | FormData | ✅ |
| `/reception/children/:id` | PUT | FormData | ✅ |
| `/reception/children/:id` | DELETE | — | ✅ |

**TOAST FINDING:** `showError` is in `loadParents` useCallback dependency array (`[showError, t]`) → **RE-1**.

**Bulk delete** (Select All + delete): iterates selected rows with `for...of` and `try/catch` with empty `catch {}` — per-row errors are silently swallowed → **RE-7**.

**Inline ConfirmDialog:** ParentManagement uses its own inline `<div>` confirm UI (not the shared `ConfirmDialog` component). Inconsistency, not a bug.

---

### 3c. TeacherManagement

**Purpose:** Full CRUD for teachers; ratings viewer modal.

| Endpoint | Method | Accessor | Notes |
|---|---|---|---|
| `/reception/teachers` | GET | `res.data.data` | ✅ |
| `/reception/teachers/:id/ratings` | GET | `res.data.data` | ✅ (via `response.data?.data`) |
| `/reception/teachers` | POST | JSON | ✅ |
| `/reception/teachers/:id` | PUT | JSON | ✅ |
| `/reception/teachers/:id` | DELETE | — | ✅ |

**TOAST FINDING:** `showError` is in `loadTeachers` useCallback dependency array (`[showError, t]`) → **RE-1**.

Uses shared `ConfirmDialog` ✅.

---

### 3d. GroupManagement

**Purpose:** Full CRUD for groups; assigns teacher to group.

| Endpoint | Method | Accessor | Notes |
|---|---|---|---|
| `/reception/teachers` | GET | `res.data.data` | ✅ (for teacher select) |
| `/groups` | GET | `res.data.groups` | ⚠️ old shape |
| `/groups` | POST | JSON | ✅ |
| `/groups/:id` | PUT | JSON | ✅ |
| `/groups/:id` | DELETE | — | ✅ |

**TOAST FINDING:** `showError` is in `loadData` useCallback dependency array (`[showError, t]`) → **RE-1**.

Uses shared `ConfirmDialog` ✅.

---

### 3e. Documents — **BROKEN PAGE**

**Purpose:** Upload reception own documents for admin approval; view status.

This page is non-functional in production (see **RE-2** for full details).

| Frontend call | Backend route | Status |
|---|---|---|
| `GET /reception/my-documents` | `GET /api/v1/reception/documents` | ❌ URL mismatch — 404 |
| `POST /reception/my-documents` | `POST /api/v1/reception/documents` | ❌ URL mismatch — 404 |
| `DELETE /reception/my-documents/:id` | *(no endpoint)* | ❌ endpoint does not exist |

Additional mismatches even if URL were corrected:
- Frontend sends FormData with field `document`; backend multer expects field `file`
- Frontend omits `documentType` field; backend controller returns 400 without it
- Frontend accesses `res.data.documents`; backend returns `{ success: true, data: [...] }` (new shape — `res.data.data`)

The `loadDocs` function has a comment `// endpoint may not exist yet` — confirms developer was aware. The function silently catches errors and renders an empty list. **This is the most critical functional gap in the portal.**

---

### 3f. Profile

**Purpose:** View account info; compose and view messages to government.

| Endpoint | Method | Accessor | Notes |
|---|---|---|---|
| `/reception/messages` | GET | `response.data.data` | ✅ |
| `/reception/message-to-government` | POST | JSON `{ subject, message }` | ✅ |

No toast in `useEffect` deps ✅ (`loadMessages` is a plain async function, not useCallback).

---

### 3g. Settings

**Purpose:** Duplicate of Profile's gov-message feature plus profile/password edit.

| Endpoint | Method | Accessor | Notes |
|---|---|---|---|
| `/reception/messages` | GET | `response.data.data` | ✅ |
| `/reception/message-to-government` | POST | JSON | ✅ |
| `/user/profile` | PUT | JSON | ✅ |
| `/user/password` | PUT | JSON `{ currentPassword, newPassword }` | ✅ |

`loadMessages` is a `useCallback` with deps `[]` — no toast in deps ✅.

Note: Profile and Settings both implement the gov-message compose+history UI. This is duplication, not a bug.

---

### 3h. ParentWizardPage + GroupStep

**Purpose:** 3-step guided flow: parent data → child data → group assignment → `POST /reception/parents`.

| Endpoint | Method | Accessor | Notes |
|---|---|---|---|
| `/reception/parents` | POST | FormData | ✅ at step 3 complete |
| `/groups` | GET | `res.data.groups` | ⚠️ old shape (GroupStep.jsx) |

Draft saved to `cache` (key `reception:wizard:parent-draft`). Restore prompt uses `window.confirm` (blocking synchronous API — cosmetic concern).

No toast in useEffect deps ✅.

---

## 4. Backend-Consumption Map — Full Reception-Reachable Surface

Reception token (`role: 'reception'`) can reach the following routers:

### `/api/v1/reception/*` — requires `authenticate + requireReception`

| Endpoint | Controller | Notes |
|---|---|---|
| `POST /reception/documents` | `uploadDocument` | Requires `documentType` field + `file` multer field |
| `GET /reception/documents` | `getMyDocuments` | Returns `{ success:true, data:[...] }` |
| `GET /reception/verification-status` | `getVerificationStatus` | Used on Dashboard indirectly |
| `POST /reception/teachers` | `createTeacher` | validator: `createStaffValidator` |
| `GET /reception/teachers` | `getTeachers` | Returns new shape |
| `GET /reception/teachers/:id/ratings` | `getTeacherRatings` | Returns new shape |
| `PUT /reception/teachers/:id` | `updateTeacher` | |
| `DELETE /reception/teachers/:id` | `deleteTeacher` | |
| `POST /reception/parents` | `createParent` | multipart: `child[photo]` |
| `GET /reception/parents` | `getParents` | Returns new shape |
| `PUT /reception/parents/:id` | `updateParent` | |
| `DELETE /reception/parents/:id` | `deleteParent` | |
| `POST /reception/children` | `createChildForParent` | multipart |
| `PUT /reception/children/:id` | `updateChildForReception` | multipart |
| `DELETE /reception/children/:id` | `deleteChildForReception` | |
| `GET /reception/groups` | `getGroups` | same controller as `/api/v1/groups` |
| `POST /reception/message-to-government` | `sendMessage` | validator: `messageToGovValidator` |
| `GET /reception/messages` | `getMyMessages` | Returns `{ success:true, data:[...] }` |

### `/api/v1/groups/*` — requires `authenticate` only (role: any)

| Endpoint | Role required | Notes |
|---|---|---|
| `GET /groups` | any | Returns OLD shape `{ groups:[...], total:N }` |
| `GET /groups/:id` | any | Returns bare group object |
| `POST /groups` | `requireRole('reception')` | ✅ |
| `PUT /groups/:id` | `requireRole('reception')` | ✅ |
| `DELETE /groups/:id` | `requireRole('reception')` | ✅ |

### `/api/v1/user/*` — requires `authenticate` only

| Endpoint | Notes |
|---|---|
| `PUT /user/profile` | ✅ — Settings.jsx uses correctly |
| `PUT /user/password` | ✅ — Settings.jsx uses correctly |

### `/api/v1/chat/*` — requires `authenticate` only (no role gate)

Reception tokens can technically reach all chat endpoints. **No reception page calls any chat endpoint.** The `chatController.js` `canAccessConversation`/`getAccessibleConversationIds` functions have no `reception` branch — reception would receive empty results or errors. No current risk but a theoretical surface worth noting.

---

## 5. Response Shape Analysis

| Source | Shape | Pages affected |
|---|---|---|
| `GET /groups` (groupController) | `{ groups: [...], total: N }` — **old shape** | Dashboard, GroupManagement, GroupStep, ParentManagement |
| `GET /reception/documents` (receptionController) | `{ success: true, data: [...] }` — **new shape** | Documents.jsx (currently broken — wrong URL) |
| `GET /reception/teachers` | `{ ..., data: [...] }` — **new shape** | All teacher consumers ✅ |
| `GET /reception/parents` | `{ ..., data: [...] }` — **new shape** | All parent consumers ✅ |
| `GET /reception/messages` | `{ success: true, data: [...] }` — **new shape** | Profile.jsx, Settings.jsx ✅ |
| `GET /reception/teachers/:id/ratings` | `{ ..., data: { summary, ratings } }` | TeacherManagement ✅ |

The grandfather clause (CP-003) applies to `/groups` — it is not required to migrate immediately. Frontend correctly accesses `res.data.groups`. This is known technical debt.

---

## 6. Toast / Effect Stability Grep (First-Class Task)

Grepped all `useCallback` and `useEffect` hooks in `reception/src/pages/**` for toast helper variables (`showError`, `success`, `showSuccess`, `toastError`, `toastSuccess`) in dependency arrays.

### FINDING RE-1 — Toast callbacks in useCallback deps (3 pages)

| File | Line | Pattern |
|---|---|---|
| `reception/src/pages/ParentManagement.jsx:48` | `loadParents` | `}, [showError, t]` |
| `reception/src/pages/TeacherManagement.jsx:80` | `loadTeachers` | `}, [showError, t]` |
| `reception/src/pages/GroupManagement.jsx:49` | `loadData` | `}, [showError, t]` |

**Problem:** The `useCallback` wraps a fetch function and includes `showError` (a toast helper) in its deps. If the toast context changes identity (e.g., after a re-render that re-creates the context value), `loadTeachers`/`loadParents`/`loadData` gets a new function reference. This new reference triggers the `useEffect` that depends on it, re-fetching data. In practice this may not loop visibly if ToastContext is stable, but it is the same class of bug as the admin Phase 3 finding (`useRef` fix applied to all 5 admin pages in S7).

**Fix (same as admin portal):** Wrap `showError` and `success` in a `useRef` inside each affected component, and use the ref's `.current` inside the callback. Remove toast refs from `useCallback` deps.

### Clean pages (no toast in effect deps)

- `Dashboard.jsx`: No `useCallback` for fetch; uses inline try/catch ✅
- `Documents.jsx`: `loadDocs` useCallback has `[]` deps ✅
- `Profile.jsx`: `loadMessages` is a plain function, called in `useEffect(() => ..., [])` ✅
- `Settings.jsx`: `loadMessages` useCallback has `[]` deps ✅
- `ParentWizardPage.jsx`: No fetch in useCallback at all ✅
- `GroupStep.jsx`: Fetch in `useEffect(() => ..., [])` — no toast in deps ✅

---

## 7. CP Items — Inherited from Admin Closeout

| CP Item | Description | Reception Status |
|---|---|---|
| **CP-023** | `mustChangePassword` gate | ❌ NOT IMPLEMENTED — see RE-4 |
| **CP-019** | Translation notice banner (end-user-facing) | ❌ NOT IMPLEMENTED — see RE-5 |
| **CP-003** | Response shape migration | ⚠️ `/groups` returns old shape — grandfather clause applies, migrate opportunistically |
| **ToastContext pattern** | `showError`/`success` in `useCallback` deps | ❌ 3 pages affected — RE-1 |

---

## 8. Existing Test Coverage

| File | Suite(s) | Count | What's covered |
|---|---|---|---|
| `__tests__/auth.test.js` | reception auth – login, logout | 6 | Role enforcement, localStorage, network failure |
| `__tests__/pages/ParentManagement.test.jsx` | CL-012 | 11 | Loading, render, search, create/edit/delete parent + child |
| `__tests__/pages/settings.test.jsx` | #05-013, CL-014c | 9 | Render, profile PUT, password PUT, compose modal, messages modal, gov POST, error resilience |
| `__tests__/utils.test.js` | 5 describe blocks | 17 | filterChildrenByGroup, calculateAge, isValidUzPhone, getDocumentStatus, sortByDateDesc |

**Total existing:** ~43 tests / 4 suites

---

## 9. Test Gaps

| Page / Unit | Gap |
|---|---|
| `TeacherManagement` | No tests — CRUD + ratings viewer |
| `GroupManagement` | No tests — CRUD |
| `Documents` | No tests — but page is broken (fix URL first) |
| `Dashboard` | No tests — counts render |
| `Profile` | No tests — gov message compose (Settings has coverage, Profile doesn't) |
| `ParentWizardPage` | No tests — 3-step flow, draft restore |
| `ProtectedRoute` | No tests — role enforcement |

**Priority gaps for Phase 1:** TeacherManagement (CRUD endpoints) and GroupManagement (CRUD endpoints) are the core reception workflows with zero coverage. Documents page needs fixes before tests make sense.

---

## 10. Security Observations

**School scoping on reception routes:**
`requireReception` enforces `documentsApproved && isActive`. `schoolScope` middleware is applied to all reception routes in `adminRoutes.js`. But reception-specific routes are in `receptionRoutes.js` — check whether `schoolScope` is also applied there.

From `receptionRoutes.js:26-27`:
```js
router.use(authenticate);
router.use(requireReception);
```
No `schoolScope` middleware in reception router. However, reception controllers use `req.user.id` as `createdBy` scoping (e.g., teachers and parents created by this reception). This is implicit scoping, not explicit `schoolScope` middleware. The isolation relies on the foreign key (`createdBy: req.user.id`) rather than `schoolId`.

**Chat surface:** Reception tokens reach `/api/v1/chat/*` (authenticate-only). No reception page uses chat. No data leak because `getAccessibleConversationIds` has no `reception` branch — reception would get an empty list. Low risk but should be documented.

**No IDOR check on `DELETE /reception/documents` (non-existent):** The backend has no DELETE endpoint for own documents, which is correct — once uploaded, documents are admin-controlled. The frontend incorrectly assumes such an endpoint exists.

**`express` stray production dependency** (`reception/package.json`): `"express": "^4.18.2"` listed under `dependencies` (not `devDependencies`). Cosmetic — it's never imported in the reception React app — but bloats the production bundle analysis. Same issue as admin portal.

---

## 11. Findings Summary

| ID | Severity | Category | Summary |
|---|---|---|---|
| **RE-1** | HIGH | Toast/Effect stability | `showError` in `useCallback` deps in 3 pages: ParentManagement, TeacherManagement, GroupManagement |
| **RE-2** | HIGH | Broken feature | Documents page non-functional: wrong URLs, wrong multer field, missing `documentType`, no DELETE backend, wrong shape accessor |
| **RE-3** | MED | Response shape | `GET /groups` returns old shape `{ groups, total }` — frontend uses `res.data.groups` (correct for old shape, but needs migration eventually) |
| **RE-4** | HIGH | CP-023 | `mustChangePassword` gate not implemented: backend returns 403 `PASSWORD_CHANGE_REQUIRED` but frontend App.jsx/ProtectedRoute has no handler |
| **RE-5** | MED | CP-019 | No translation notice banner anywhere in reception portal |
| **RE-6** | LOW | Deps | `express` in production dependencies in `reception/package.json` |
| **RE-7** | LOW | Reliability | Bulk delete in ParentManagement silently swallows per-row errors (`catch {}`) |
| **RE-8** | INFO | UX | ParentWizard uses `window.confirm` (blocking synchronous API) for draft restore prompt |
| **RE-9** | INFO | Feature gap | Dashboard "Activate" button on pending-parent cards has no API call — display-only |

---

## 12. Phase 1 Recommendation

**Highest-priority items to address first:**

1. **RE-2 — Documents page fix (MUST):** Fix URL from `/reception/my-documents` → `/reception/documents`, fix FormData field from `document` → `file`, add `documentType` field, fix shape accessor from `res.data.documents` → `res.data.data`. Decide on DELETE: either add `DELETE /reception/documents/:id` on backend (with ownership check: `document.userId === req.user.id`) or remove the `handleRemove` flow for non-temp files in the frontend.

2. **RE-1 — useRef stabilization for toast callbacks (MUST):** Apply the same `useRef` fix used in admin Phase 3 to ParentManagement, TeacherManagement, and GroupManagement. Pattern: `const showErrorRef = useRef(showError); useEffect(() => { showErrorRef.current = showError; }, [showError]);` — then remove `showError` from `useCallback` deps.

3. **RE-4 — CP-023 mustChangePassword (MUST):** Add `mustChangePassword` to `createAuthContext` return value (or read it from the user object). In `App.jsx`, redirect to a `/change-password` page when `user.mustChangePassword === true`. Backend gate already enforces this (403 `PASSWORD_CHANGE_REQUIRED`).

4. **Test gaps (HIGH):** Add tests for TeacherManagement (CRUD + ratings) and GroupManagement (CRUD). These are the core reception workflows. Add Documents tests after URL fix.

5. **RE-5 — CP-019 (MEDIUM):** Add translation notice banner to end-user-facing pages (at minimum the parent-facing wizard and Login screen). Can be deferred to a dedicated CP pass.

---

## 13. What Phase 1 Inherits from Admin Portal

Per `audits/admin/08-final-verify.md` Section 5:

- `useRef` stabilization pattern (applied to all 5 admin Phase 3 pages) → must apply to 3 reception pages
- `include_deleted` endpoint pattern → reception doesn't currently manage trash; not required
- `schoolScope` middleware → already on admin routes; reception uses `createdBy` isolation (different pattern, intentional)
- CP-023, CP-019, CP-003 → documented above

**Reception portal entry state: 🟡 YELLOW — critical feature broken (Documents), CP-023 missing, 3 toast stability findings, 5 pages with 0 tests.**
