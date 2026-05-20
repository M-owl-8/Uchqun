# Government Portal — Step 0: Understanding

**Date:** 2026-05-21  
**Auditor:** Claude (automated)  
**Mode:** Read-only reconnaissance — no changes made  
**Portal:** `government/` — React 18 SPA, Vite, port 5173  
**Scope:** Frontend source + backend government routes/controllers

---

## 1. File Inventory

```
government/
├── index.html
├── package.json                         (React 18, React Router v6, react-i18next, Axios)
├── vite.config.js                       (aliases: @shared → ../shared, @government → ./src)
├── tailwind.config.js
├── eslint.config.js
├── src/
│   ├── main.jsx                         (entry — i18n init, React root mount)
│   ├── App.jsx                          (router setup, AuthProvider wrap)
│   ├── services/
│   │   └── api.js                       (3 lines — createApi wrapper, tokenKey='government_accessToken')
│   ├── pages/
│   │   ├── Dashboard.jsx                (overview stats + parallel Promise.allSettled fetches)
│   │   ├── Schools.jsx                  (schools list, no pagination)
│   │   ├── SchoolDetail.jsx             (single school + stats, no archive/reactivate UI)
│   │   ├── Ratings.jsx                  (per-school ratings, page-based pagination)
│   │   ├── Platform.jsx                 (admin/government CRUD + registration approvals — 370 lines)
│   │   ├── AdminDetails.jsx             (admin detail view with tab sub-components)
│   │   ├── AIWarnings.jsx               (AI safeguarding warnings list + resolve action)
│   │   ├── Profile.jsx                  (government user profile edit)
│   │   └── Settings.jsx                 (app settings — theme, language, notifications)
│   ├── components/
│   │   ├── Layout.jsx                   (sidebar + main content wrapper)
│   │   ├── Sidebar.jsx                  (nav links, logout handler)
│   │   ├── ProtectedRoute.jsx           (thin AuthContext guard)
│   │   ├── LanguageSwitcher.jsx         (i18next language toggle)
│   │   └── tabs/
│   │       ├── AdminsTab.jsx            (admin list within AdminDetails)
│   │       ├── MessagesTab.jsx          (message inbox + reply — 295 lines)
│   │       ├── GovernmentTab.jsx        (government user list + create)
│   │       └── RegistrationsTab.jsx     (admin registration approvals — 175 lines)
│   ├── context/
│   │   └── AuthContext.jsx              (createAuthContext from shared, role='government')
│   └── locales/
│       ├── en/                          (dashboard.json, schools.json, platform.json, common.json,
│       │                                 admin.json, ratings.json, aiwarnings.json, settings.json)
│       ├── ru/                          (same 8 files in Russian)
│       └── uz/                          (same 8 files in Uzbek)
shared/
├── services/api.js                      (createApi factory — cookie auth, 30s timeout, 401 refresh)
├── hooks/useFetch.js                    (declarative GET — unwraps {success,data} or raw body)
├── context/AuthContext.jsx              (factory: createAuthContext)
└── locales/                             (shared translation keys merged at init)
```

**Total source files read:** 9 pages, 4 component files, 4 tab components, 2 shared hooks/services, 8 backend files.

---

## 2. Entry Points and Flow

**`government/src/main.jsx`**
- Initializes react-i18next with `government/src/locales/` + `shared/locales/` merged
- Mounts `<App />` into `#root`

**`government/src/App.jsx`**
- Wraps entire tree in `<AuthProvider>` (from `context/AuthContext.jsx`)
- Defines React Router v6 routes:
  - `/` → `<Dashboard />`
  - `/schools` → `<Schools />`
  - `/schools/:id` → `<SchoolDetail />`
  - `/ratings` → `<Ratings />`
  - `/platform` → `<Platform />`
  - `/admins/:id` → `<AdminDetails />`
  - `/ai-warnings` → `<AIWarnings />`
  - `/profile` → `<Profile />`
  - `/settings` → `<Settings />`
  - `/login` → login page (unauthenticated)
- All routes except `/login` wrapped in `<ProtectedRoute />` which checks `AuthContext.user`

**`government/src/context/AuthContext.jsx`**
- Calls `createAuthContext({ tokenKey: 'government_accessToken', requiredRole: 'government', api })`
- `tokenKey` accepted by factory but has no functional effect (cookies handle auth; the param is for legacy compat)
- Exposes `user`, `login()`, `logout()`, `isLoading`

**Auth flow:**
1. On mount, `AuthContext` calls `GET /api/v1/auth/me` via the shared `api` instance
2. If 401 → redirect to `/login`
3. Login: `POST /api/v1/auth/login` → sets HTTP-only cookie → `user` populated from `/auth/me`
4. All subsequent requests carry cookie automatically (`withCredentials: true`)
5. 401 on any request triggers refresh mutex → `POST /auth/refresh-token` → retry once → on failure `clearAuth()` + redirect

---

## 3. Page / Screen Inventory

| Page | Route | Primary Purpose |
|---|---|---|
| Dashboard | `/` | Platform overview: school count, student count, active warnings, pending registrations |
| Schools | `/schools` | List all schools (no pagination — silently truncated at 50) |
| SchoolDetail | `/schools/:id` | Single school stats; no archive/reactivate UI |
| Ratings | `/ratings` | Per-school rating breakdown with page-based pagination |
| Platform | `/platform` | Manage admins, government users, view/approve/reject registration requests |
| AdminDetails | `/admins/:id` | Admin detail: stats, linked schools, teachers, parents, children, messages |
| AIWarnings | `/ai-warnings` | List AI safeguarding warnings; filter by resolved/unresolved; resolve individual |
| Profile | `/profile` | Edit government user's own profile |
| Settings | `/settings` | Theme, language, notification prefs (client-side only — no backend persistence) |

---

## 4. Component Map

```
App
└── AuthProvider (context/AuthContext.jsx)
    ├── /login → LoginPage
    └── ProtectedRoute (components/ProtectedRoute.jsx)
        └── Layout (components/Layout.jsx)
            ├── Sidebar (components/Sidebar.jsx)
            │   ├── Nav links (Dashboard, Schools, Ratings, Platform, AIWarnings, Profile)
            │   └── Logout button → api.post('/auth/logout') → clearAuth()
            └── <Outlet /> → active page
                ├── Dashboard.jsx      (no sub-components)
                ├── Schools.jsx        (no sub-components)
                ├── SchoolDetail.jsx   (no sub-components)
                ├── Ratings.jsx        (no sub-components)
                ├── Platform.jsx       (no sub-components — inline tab rendering)
                ├── AdminDetails.jsx   (tab switcher)
                │   ├── AdminsTab.jsx
                │   ├── MessagesTab.jsx
                │   ├── GovernmentTab.jsx
                │   └── RegistrationsTab.jsx
                ├── AIWarnings.jsx     (no sub-components)
                ├── Profile.jsx        (no sub-components)
                └── Settings.jsx       (no sub-components)
```

**Shared components used:**
- `LanguageSwitcher` (components/LanguageSwitcher.jsx) — rendered in Sidebar header

---

## 5. State Management

No global state library (no Redux, Zustand, Jotai). All state is local React state.

**Patterns observed:**

| Pattern | Used in | Notes |
|---|---|---|
| `useFetch(path)` (shared hook) | Schools, SchoolDetail, AIWarnings, AdminDetails, Profile | Declarative; fires on mount; returns `{ data, loading, error }`. Unwraps `res.data?.data ?? res.data ?? null`. |
| `useApiCache` (local hook in Platform.jsx) | Platform.jsx | Custom hook: `useCallback` fetch + `useState`. Returns `[data, loading, refetch]`. Unwraps `res.data?.data \|\| []`. |
| `Promise.allSettled` + `useState` | Dashboard.jsx | Fires 4 parallel GETs on mount; each result plucked from `results[i].value.data.*` |
| Inline `useState` + manual `useEffect` | Ratings.jsx, AIWarnings.jsx, MessagesTab.jsx | Local fetch on mount + on filter/page change |

**No optimistic updates.** All mutations trigger a full data re-fetch after success.

**No persistent client state** — Settings page writes to `localStorage` only.

---

## 6. Backend Consumption Map

Every frontend API call mapped to its backend handler with response shape verification.

| # | Call Site (file:line) | Method + Path | Frontend Reads | Backend Returns | Match |
|---|---|---|---|---|---|
| 1 | `Dashboard.jsx:44` | `GET /government/overview` | `res.data.data` → `{ schools, students, teachers, parents, averageRating, activeWarnings }` | `{ success: true, data: { schools, students, teachers, parents, averageRating, activeWarnings } }` | ✅ |
| 2 | `Dashboard.jsx:45` | `GET /government/schools?limit=5` | `res.data.data?.schools \|\| []` | `{ success: true, data: { schools: [], total, totalReviews, globalAverageRating, limit, offset } }` | ✅ |
| 3 | `Dashboard.jsx:46` | `GET /government/admin-registrations?status=pending` | `res.data?.data \|\| []` for list; `res.data?.pagination?.total` for count | `{ success: true, data: requests[], pagination: { total, page, limit, totalPages } }` | ⚠️ Frontend reads `res.data?.data` but backend puts list directly in `data` (no `data.requests` wrapper). Works because `data` IS the array. Pagination total reads correctly. |
| 4 | `Dashboard.jsx:45` | `GET /ai-warnings?resolved=false` | `res.data?.data?.length ?? res.data?.warnings?.length ?? 0` | `{ success: true, data: { warnings: [], total, limit, offset } }` — query param is `isResolved` not `resolved` | ❌ Wrong param name. Dashboard sends `resolved=false`; backend filters on `isResolved`. Backend ignores unknown param → returns ALL warnings (resolved + unresolved). Active warning count on dashboard is incorrect. |
| 5 | `Schools.jsx:11` | `GET /government/schools` | `useFetch` → `data?.schools \|\| []` | `{ success: true, data: { schools: [], total, … } }` default limit 50 | ⚠️ No pagination UI; schools list silently capped at 50 (CP-001). Data shape access is correct. |
| 6 | `SchoolDetail.jsx:12` | `GET /government/schools/:id` | `data.school \|\| data` + `data.stats \|\| {}` | `{ success: true, data: { id, name, …fields, studentsCount, teachersCount, ratingsCount, averageRating, governmentLevel } }` — no `.school` or `.stats` sub-keys | ⚠️ `data.school` is undefined → falls back to `data` (correct). `data.stats` is undefined → `{}` (correct). Stats shown via `school.studentsCount` which reads the flat fields. Works but relies on fallback. |
| 7 | `SchoolDetail.jsx` | Backend `getSchoolById` filters `isActive: true` | N/A | Archived school returns 404 | ⚠️ CP-014: no archive/reactivate buttons in UI; archived school navigated to shows 404. |
| 8 | `Ratings.jsx:80` | `GET /government/ratings/:schoolId?page=N&limit=10` | `res.data?.data` → `{ ratings, totalPages }` | `{ success: true, data: { ratings: [], total, limit, offset, totalPages } }` | ✅ `parsePagination` converts `?page=N` to `offset=(N-1)*10`; `totalPages` present in response. |
| 9 | `Platform.jsx:90` | `GET /government/admins` | `res.data?.data \|\| []` | `{ success: true, data: admins[], total, limit, offset }` — array directly in `data` | ✅ `data` IS the array; `res.data?.data` reads it correctly. |
| 10 | `Platform.jsx:91` | `GET /government/governments` | `res.data?.data \|\| []` | `{ success: true, data: governments[], count }` — array directly in `data` | ✅ Same pattern as above. |
| 11 | `Platform.jsx:93` | `GET /government/admin-registrations` | `res.data?.data \|\| []` | `{ success: true, data: requests[], pagination: { … } }` | ✅ Array in `data`. |
| 12 | `Platform.jsx` | `POST /government/admins` | success → refetch admins | `{ success: true, data: admin.toJSON() }` | ✅ |
| 13 | `Platform.jsx` | `PUT /government/admins/:id` | success → refetch admins | `{ success: true, data: admin.toJSON() }` | ✅ |
| 14 | `Platform.jsx` | `DELETE /government/admins/:id` | success → refetch admins | `{ success: true }` | ✅ |
| 15 | `Platform.jsx` | `POST /government/governments` | success → refetch governments | `{ success: true, data: governmentData }` | ✅ |
| 16 | `Platform.jsx:246` | `POST /government/admin-registrations/:id/approve` | `res.data?.data?.credentials \|\| res.data?.data` | `{ success: true, data: { request, admin, setPasswordUrl, telegramUsername } }` — no `credentials` sub-key | ⚠️ `res.data?.data?.credentials` is undefined → falls back to `res.data?.data` (the full object). Then in RegistrationsTab.jsx:131 `approvedCredentials.email` is undefined (email is at `.admin.email`). Partial fix — setPasswordUrl and telegramUsername work but email display is broken. |
| 17 | `RegistrationsTab.jsx:131` | (reads state set by #16) | `approvedCredentials.email` | Backend: `{ request, admin: { email, … }, setPasswordUrl, telegramUsername }` | ❌ `approvedCredentials.email` is undefined. Email is at `approvedCredentials.admin.email`. |
| 18 | `RegistrationsTab.jsx` | `POST /government/admin-registrations/:id/reject` | success → refetch | `{ success: true, data: request }` | ✅ |
| 19 | `AdminDetails.jsx:24` | `GET /government/admins/:id` | `useFetch` → `{ admin, stats, receptions, schools, teachers, parents, children }` | `{ success: true, data: { admin, stats, receptions, schools, teachers, parents, children } }` | ✅ useFetch unwraps `data` → destructuring correct. |
| 20 | `AIWarnings.jsx:93` | `GET /ai-warnings?isResolved=<bool>` | `res.data?.data?.warnings \|\| res.data?.warnings \|\| []` | `{ success: true, data: { warnings: [], total, limit, offset } }` | ✅ Uses correct `isResolved` param (unlike Dashboard). Dual-shape fallback unnecessary but harmless. |
| 21 | `AIWarnings.jsx` | `PUT /ai-warnings/:id/resolve` | success → refetch | `{ success: true, data: warning }` | ✅ |
| 22 | `MessagesTab.jsx:47` | `GET /government/messages` | `res.data?.data \|\| []` for list; `res.data?.pagination` for pagination | `{ success: true, data: messages[], pagination: { total, page, limit, totalPages } }` | ✅ |
| 23 | `MessagesTab.jsx` | `POST /government/messages/:id/reply` | success → refetch | `{ success: true, data: replyMsg }` | ✅ |
| 24 | `Profile.jsx:40` | `GET /api/v1/auth/me` | `useFetch` → `data` (raw object) | `{ id, email, role, … }` — raw shape (via AuthContext) | ✅ |
| 25 | `Profile.jsx` | `PUT /government/profile` | `res.data?.data \|\| res.data` | `res.json(userData)` — legacy raw object (no `{ success, data }` wrapper) | ⚠️ Frontend fallback `\|\| res.data` catches the legacy format. Functional but legacy. |
| 26 | `Profile.jsx` | `PUT /government/change-password` | success flag | `res.json({ message: 'Password changed' })` — legacy | ⚠️ Frontend checks `res.data.success`; backend returns `{ message }` (no `success` field). May silently fail success check but no visible breakage if only checking for no error. |
| 27 | `Sidebar.jsx` | `POST /api/v1/auth/logout` | redirect | clears cookies | ✅ |

**Summary: 20 ✅ matched · 4 ⚠️ shape mismatch (functional via fallback) · 2 ❌ broken (wrong param, undefined field)**

---

## 7. Cross-Portal Dependencies

| CP ID | Title | Government Portal Status | Required Action |
|---|---|---|---|
| CP-001 | Government endpoint pagination (50-school default) | ⚠️ `Schools.jsx` has no pagination UI. Schools list silently truncated at 50. | Implement pagination controls in `Schools.jsx` (offset or page-based). |
| CP-014 | School archival UI | ⬜ Not implemented. `SchoolDetail.jsx` has no archive/reactivate buttons. Backend `getSchoolById` filters `isActive: true` → archived school navigated to returns 404. | Add archive/reactivate buttons; handle 404 gracefully in `SchoolDetail.jsx`. |
| CP-016 | Restore endpoints (admin/government) | ⬜ Not implemented in Government portal. | Government users can restore across schools — UI for restore action not present. Low priority vs CP-001/CP-014. |
| CP-019 | AI translation notice — first login | ⬜ Not implemented. No one-time banner during login for government users. | Display dismissible notice at first login: "Translations are auto-generated and may contain errors." |

---

## 8. Conventions Observed

**Code style:**
- Functional components with hooks throughout — no class components
- No PropTypes or TypeScript; plain JSX
- Tailwind CSS utility classes for all styling — no CSS modules or styled-components
- `async/await` in all event handlers; no raw `.then()` chains except in `Promise.allSettled` usage

**API access:**
- All API calls via `government/src/services/api.js` (which re-exports `createApi()` from shared)
- Declarative fetches: `useFetch()` for initial loads
- Imperative fetches: direct `api.get/post/put/delete()` in handlers and `useEffect`
- Error display: inline error states in JSX (`{error && <p>{error.message}</p>}`)

**Response unwrapping:**
- `useFetch`: `res.data?.data ?? res.data ?? null` — handles both new `{ success, data }` and legacy raw
- `useApiCache`: `res.data?.data || []` — assumes new format
- Manual: varies by page (some `res.data?.data`, some `res.data.data.data` for nested)

**Routing:**
- React Router v6, `useParams`, `useNavigate`
- No lazy loading — all pages imported eagerly in `App.jsx`

**i18n:**
- `useTranslation(['dashboard', 'common'])` namespace pattern
- Locale files per page in `government/src/locales/{en,ru,uz}/`
- Falls back to shared locales for common keys

**Commit history not reviewed** — static file read only per Step 0 rules.

---

## 9. External Dependencies

| Dependency | Version (from package.json) | Purpose |
|---|---|---|
| react | 18.x | UI framework |
| react-dom | 18.x | DOM binding |
| react-router-dom | 6.x | Client-side routing |
| axios | 1.x | HTTP client (via shared/services/api.js) |
| react-i18next | 13.x | Internationalization |
| i18next | 23.x | i18n core |
| tailwindcss | 3.x | Utility CSS |
| vite | 5.x | Build tool + dev server |
| @vitejs/plugin-react | 4.x | Vite React plugin |

**Shared packages (from `../shared`):**
- `shared/services/api.js` — Axios factory
- `shared/hooks/useFetch.js` — declarative fetch hook
- `shared/context/AuthContext.jsx` — auth factory

**No charting library** — ratings and stats displayed as raw numbers, not charts.  
**No form library** — all forms use raw controlled inputs with `useState`.  
**No date library** — dates formatted with `new Date().toLocaleDateString()`.

---

## 10. Open Questions

| # | Question | Severity | Notes |
|---|---|---|---|
| Q-01 | Dashboard AI warning count is wrong: sends `?resolved=false`, backend expects `?isResolved=false`. Should the fix be in Dashboard.jsx (change param name) or should the backend also accept `resolved` as an alias? | ❌ Bug | Dashboard.jsx:45 vs aiWarningController.js. Fix is trivial in frontend: change `resolved` → `isResolved`. |
| Q-02 | `RegistrationsTab.jsx:131` shows `approvedCredentials.email` which is `undefined`. Should it be `approvedCredentials.admin.email`? | ❌ Bug | After approval, the credential display panel shows blank email. Trivial frontend fix. |
| Q-03 | `SchoolDetail.jsx` calls `getSchoolById` which filters `isActive: true`. If a school is archived, the page 404s with no user feedback. What should the archived-school experience be? | ⚠️ UX | Options: (a) show archived banner + reactivate button, (b) redirect to Schools list with toast, (c) government role always bypasses isActive filter. CP-014. |
| Q-04 | `Platform.jsx:246` stores the full approval response (`{ request, admin, setPasswordUrl, telegramUsername }`) as `approvedCredentials`. The intent is to show a credential card. Should the credential card display `admin.email` rather than `approvedCredentials.email`? | ⚠️ Bug | Confirm expected credential card fields with Max. |
| Q-05 | `Schools.jsx` has no pagination. With 50+ schools this silently truncates. Is Schools expected to paginate, or should the backend default limit be raised? | ⚠️ Product | CP-001. Backend `getSchoolsStats` default limit is 50, max 200. Government platform likely needs all schools visible. |
| Q-06 | `Profile.jsx` → `PUT /government/profile` returns legacy raw object. Frontend fallback handles it. Should this endpoint be migrated to `{ success, data }` shape per BACKEND-012? | ⚠️ Tech debt | Not breaking. Migrate when endpoint is next touched. |
| Q-07 | `changePassword` handler checks `res.data.success` but backend returns `{ message: 'Password changed' }` — no `success` field. Does password change currently show a success message to the user? | ⚠️ UX | Need to confirm live behavior. May silently succeed without user feedback. |
| Q-08 | Settings.jsx persists preferences to `localStorage` only. Are notification preferences intended to be backend-persisted? | ⬜ Product | No backend endpoint for settings observed. |
| Q-09 | `MessagesTab.jsx` reads `res.data?.pagination` for the messages list but the standard backend response wraps it as `{ success, data: messages[], pagination: { … } }` — pagination is at `res.data.pagination` (outside `data`). Is this inconsistency intentional? | ✅ Works | Backend `getAllMessages` intentionally puts `pagination` at the top level of the response body. Frontend reads `res.data?.pagination` correctly. No bug — just unusual shape. |
| Q-10 | CP-019: AI translation notice is not implemented anywhere in the Government portal. Which login event should trigger it — first ever login, or every session until dismissed? | ⬜ Product | Needs product decision before implementation. |
