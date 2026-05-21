# Admin Portal — Step 0: Understanding

**Date:** 2026-05-21  
**Portal:** Admin (Loop 3)  
**Port:** 5175  
**Role served:** `admin` (school directors/owners)  
**Tenant model:** School-scoped — each admin account belongs to exactly one school; `requireSchoolScope` enforces it for all admin routes.

---

## 1. File Inventory

```
admin/
├── package.json                        # deps + scripts
├── vite.config.js                      # port 5175, /api proxy, @shared alias
├── src/
│   ├── main.jsx                        # React entry
│   ├── App.jsx                         # BrowserRouter, routes, providers
│   ├── i18n.js                         # mergeLocales(shared+portal), fallbackLng='uz'
│   ├── index.css                       # tailwind
│   ├── setupTests.js                   # vitest setup
│   ├── services/
│   │   └── api.js                      # thin wrapper: createApi({ tokenKey: 'admin_accessToken' })
│   ├── context/
│   │   └── AuthContext.jsx             # createAuthContext({ requiredRole: 'admin', ... })
│   ├── components/
│   │   ├── Layout.jsx                  # sidebar + mobile header + <Outlet>
│   │   ├── Sidebar.jsx                 # NAV_SECTIONS (9 items); missing /groups + /users nav
│   │   ├── ProtectedRoute.jsx          # redirects to /login if not authenticated
│   │   ├── BottomNav.jsx               # mobile nav (reception, exit only)
│   │   └── LanguageSwitcher.jsx        # uz/ru/en switcher
│   ├── pages/
│   │   ├── Login.jsx                   # POST /auth/login via useAuth().login; no mustChangePassword check
│   │   ├── AdminRegister.jsx           # POST /auth/admin-register (pre-auth, file upload)
│   │   ├── Dashboard.jsx               # 5 API calls; mock activity feed; see §3
│   │   ├── ReceptionManagement.jsx     # CRUD reception + doc approval; 8 API calls
│   │   ├── ParentManagement.jsx        # GET /admin/parents + /admin/parents/:id (view-only)
│   │   ├── TeacherManagement.jsx       # GET /admin/teachers (view-only)
│   │   ├── GroupManagement.jsx         # GET /admin/groups (view-only); no sidebar link
│   │   ├── DocumentApprovalQueue.jsx   # GET pending/approved/rejected + PUT approve/reject
│   │   ├── SchoolRatings.jsx           # GET /admin/school-ratings via useFetch
│   │   ├── AIWarnings.jsx              # ⚠️ BROKEN — calls /admin/ai-warnings (wrong URL)
│   │   ├── UsersStats.jsx              # ⚠️ BROKEN — calls /business/users (403 for admin role)
│   │   ├── TherapyManagement.jsx       # ⚠️ ORPHANED — no App.jsx route; calls /therapy
│   │   ├── Profile.jsx                 # GET /admin/messages + POST /admin/message-to-government
│   │   ├── Settings.jsx                # PUT /user/profile + PUT /user/password + messages
│   │   ├── NotFound.jsx                # 404 page
│   │   └── settings/
│   │       ├── ProfileForm.jsx         # form component
│   │       ├── PasswordForm.jsx        # form component
│   │       ├── NotificationPreferences.jsx  # form component (no API call found)
│   │       ├── MessageModal.jsx        # send-to-government form component
│   │       └── MessagesModal.jsx       # view messages list component
│   ├── locales/
│   │   ├── en/common.json              # English portal strings (~180 keys)
│   │   ├── ru/common.json              # Russian (AI-generated, UNVERIFIED)
│   │   └── uz/common.json             # Uzbek (AI-generated, UNVERIFIED)
│   └── __tests__/
│       ├── auth.test.js                # 7 tests — shared auth flow
│       ├── AuthContext.test.jsx        # 1 test — import check only
│       ├── utils.test.js               # utility function tests
│       ├── pages/
│       │   ├── Settings.test.jsx       # Settings page render test
│       │   └── showToast.test.jsx      # toast utility test
│       └── shared/                     # 10 shared component tests (Avatar, Badge, Button…)
```

**Stray production dependency:** `"express": "^4.18.2"` in `package.json` `dependencies` (not devDependencies) — same issue flagged in Government portal; should be removed.

---

## 2. Entry Points and Boot Flow

```
main.jsx → App() → I18nextProvider → BrowserRouter → AuthProvider → ToastProvider
         → OfflineBanner → AppRoutes → ProtectedRoute → Layout → <Outlet>
```

`AppRoutes` (App.jsx:27):
1. Reads `{ isAuthenticated, isAdmin, loading }` from `useAuth()`
2. Shows spinner while `loading`
3. `/login` → renders `Login` if not authenticated, else navigate to `/admin`
4. `/admin-register` → renders `AdminRegister` if not authenticated
5. `/admin/*` → wrapped in `ProtectedRoute` → `Layout` (authenticated + isAdmin required)
6. `/` → navigate to `/admin` (if authenticated+admin) or `/login`
7. `*` → `NotFound`

**No `mustChangePassword` gate** — the `AppRoutes` in admin has no forced-password-change redirect. CP-023 backend gate (`403 PASSWORD_CHANGE_REQUIRED`) is live; admin portal doesn't handle it (any page request after password reset will get a 403 that the interceptor will not handle as auth failure, leaving the admin stuck).

---

## 3. Page/Screen Inventory

| Route | Page | Purpose | Backend endpoints called |
|---|---|---|---|
| `/admin` | Dashboard | KPI summary, attention items, activity, ratings | `GET /admin/statistics`, `GET /admin/receptions`, `GET /admin/documents/pending`, `GET /admin/ai-warnings` ⚠️, `GET /admin/school-ratings` |
| `/admin/receptions` | ReceptionManagement | Full CRUD for reception accounts + doc approval + activate/deactivate | `GET /admin/receptions`, `GET /admin/receptions/:id`, `POST /admin/receptions`, `PUT /admin/receptions/:id`, `DELETE /admin/receptions/:id`, `PUT /admin/receptions/:id/activate`, `PUT /admin/receptions/:id/deactivate`, `GET /admin/receptions/:id/documents`, `PUT /admin/documents/:id/approve`, `PUT /admin/documents/:id/reject` |
| `/admin/parents` | ParentManagement | View parents + their children/activities/meals/media | `GET /admin/parents`, `GET /admin/parents/:id` |
| `/admin/teachers` | TeacherManagement | View teachers (list + search) | `GET /admin/teachers` |
| `/admin/groups` | GroupManagement | View groups (no sidebar nav link) | `GET /admin/groups` |
| `/admin/documents` | DocumentApprovalQueue | Tabbed pending/approved/rejected queue | `GET /admin/documents/pending`, `GET /admin/documents?status=approved`, `GET /admin/documents?status=rejected`, `PUT /admin/documents/:id/approve`, `PUT /admin/documents/:id/reject` |
| `/admin/school-ratings` | SchoolRatings | View parent ratings for the school | `GET /admin/school-ratings` |
| `/admin/ai-warnings` | AIWarnings | View + resolve AI warnings | `GET /admin/ai-warnings` ⚠️, `POST /admin/ai-warnings/:id/resolve` ⚠️ |
| `/admin/users` | UsersStats | Platform user stats (no sidebar nav link) | `GET /business/users` ⚠️ |
| `/admin/profile` | Profile | Admin profile + send/view government messages | `GET /admin/messages`, `POST /admin/message-to-government` |
| `/admin/settings` | Settings | Edit profile/password + messages | `PUT /user/profile`, `PUT /user/password`, `GET /admin/messages`, `POST /admin/message-to-government` |
| `/login` | Login | Admin login | `POST /auth/login` (via useAuth) |
| `/admin-register` | AdminRegister | Self-registration (pre-approval flow) | `POST /auth/admin-register` (multipart) |

---

## 4. Component Map

| Component | Lines | Notes |
|---|---|---|
| `Layout.jsx` | ~70 | Sidebar (desktop fixed) + mobile header + slide-out nav + `<Outlet>` |
| `Sidebar.jsx` | ~174 | 9 nav items in 4 sections; missing `/admin/groups` and `/admin/users`; language switcher inline |
| `ProtectedRoute.jsx` | small | Redirects to `/login` if `!isAuthenticated` |
| `BottomNav.jsx` | small | Mobile bottom nav; only "Reception" + "Exit" links |
| `Dashboard.jsx` | ~513 | Most complex page; MOCK_ACTIVITY hardcoded; tasks derived from API data |
| `ReceptionManagement.jsx` | ~300+ | State-heavy; create/edit/delete modals; detail panel |
| `DocumentApprovalQueue.jsx` | ~200+ | Tab-based queue; modal for reject-with-reason |
| `AIWarnings.jsx` | ~280 | ⚠️ broken URLs; client-side filter by status + severity |
| `ParentManagement.jsx` | ~200 | Read-only; detail panel with child data |
| `settings/*` | 5 sub-components | Extracted form components; NotificationPreferences has no API call |

---

## 5. State Management Pattern

- **Local `useState` + `useEffect`** — no Redux, no Zustand
- **Shared cache layer** (`shared/utils/cache.js`) — `cache.get/set/invalidate`; cache keys: `admin:dashboard`, `admin:parents`, `admin:teachers`, `admin:groups`, `admin:receptions`, `admin:documents`, `admin:ai-warnings`
- **Stale-while-revalidate** — Dashboard, ReceptionManagement, TeacherManagement, ParentManagement, GroupManagement all follow: show cached value immediately, fire background fetch to update cache
- **`useFetch` hook** (shared) — used by SchoolRatings; handles loading/error states
- **Context:** AuthContext (user session), ToastContext (notifications)

---

## 6. Backend-Consumption Map — Full Admin-Reachable Surface

### 6.1 Admin router endpoints (`/api/v1/admin/*`)
All routes: `authenticate → requireAdmin → requireSchoolScope`

| Endpoint | Frontend consumer | Expected shape | Actual shape | Match |
|---|---|---|---|---|
| `GET /admin/statistics` | Dashboard.jsx:80 | `{ data: { teachers, parents, children, groups, receptions, capacity, enrolled } }` | `{ success, data: {...} }` | ✅ (defensive extraction) |
| `GET /admin/receptions` | ReceptionManagement:118, Dashboard:80 | `{ data: [...] }` | `{ success, data: [...] }` | ✅ |
| `GET /admin/receptions/:id` | ReceptionManagement:153 | `{ data: {...} }` | `{ success, data: {...} }` | ✅ |
| `POST /admin/receptions` | ReceptionManagement:229 | `{ data: {...} }` | `{ success, data: {...} }` | ✅ |
| `PUT /admin/receptions/:id` | ReceptionManagement:267 | `{ data: {...} }` | `{ success, data: {...} }` | ✅ |
| `DELETE /admin/receptions/:id` | ReceptionManagement:295 | — | `{ success }` | ✅ |
| `PUT /admin/receptions/:id/activate` | ReceptionManagement:190 | `{ data: {...} }` | `{ success, data: {...} }` | ✅ |
| `PUT /admin/receptions/:id/deactivate` | ReceptionManagement:209 | `{ data: {...} }` | `{ success, data: {...} }` | ✅ |
| `GET /admin/documents/pending` | DocumentApprovalQueue:127, Dashboard:80 | `{ data: [...] }` | `{ success, data: [...] }` | ✅ |
| `GET /admin/documents?status=approved` | DocumentApprovalQueue:128 | `{ data: [...] }` | `{ success, data: [...] }` | ✅ |
| `GET /admin/documents?status=rejected` | DocumentApprovalQueue:129 | `{ data: [...] }` | `{ success, data: [...] }` | ✅ |
| `GET /admin/receptions/:id/documents` | ReceptionManagement:136 | `{ data: [...] }` | `{ success, data: [...] }` | ✅ |
| `PUT /admin/documents/:id/approve` | DocumentApprovalQueue:151, ReceptionManagement:151 | — | `{ success }` | ✅ |
| `PUT /admin/documents/:id/reject` | DocumentApprovalQueue (reject modal), ReceptionManagement:171 | — | `{ success }` | ✅ |
| `GET /admin/teachers` | TeacherManagement:34 | `{ data: [...] }` | `{ success, data: [...] }` | ✅ |
| `GET /admin/parents` | ParentManagement:42 | `{ data: [...] }` | `{ success, data: [...] }` | ✅ |
| `GET /admin/parents/:id` | ParentManagement:72 | `{ data: {...} }` | `{ success, data: {...} }` | ✅ |
| `PUT /admin/parents/:id/suspend` | **❌ NO UI** | — | `{ success, data }` | ❌ GAP (CP-012) |
| `PUT /admin/parents/:id/activate` | **❌ NO UI** | — | `{ success, data }` | ❌ GAP (CP-012) |
| `GET /admin/groups` | GroupManagement:34 | `{ groups: [...] }` | `{ success, data: { groups, total } }` | ⚠️ uses `res.data.groups || res.data.data` — works but shape assumption brittle |
| `GET /admin/school-ratings` | SchoolRatings:9 | `{ data: [...] }` | `{ success, data: [...] }` | ✅ |
| `GET /admin/messages` | Profile:42, Settings:66 | `{ data: [...] }` | `{ success, data: [...] }` | ✅ |
| `POST /admin/message-to-government` | Profile:59, Settings:87 | — | `{ success }` | ✅ |
| `GET /admin/children/:id/observations` | **❌ NO UI** | — | `{ success, data: [...] }` | ❌ GAP |
| `GET /admin/children/:id/goals` | **❌ NO UI** | — | `{ success, data: [...] }` | ❌ GAP |
| `PUT /admin/children/:id/transfer` | **❌ NO UI** | — | `{ success, data }` | ❌ GAP (CP-016 adjacent) |
| `PUT /admin/children/:id/restore` | **❌ NO UI** | — | `{ success, data }` | ❌ GAP (CP-016) |
| `PUT /admin/users/:id/restore` | **❌ NO UI** | — | `{ success, data }` | ❌ GAP (CP-016) |
| `PUT /admin/observations/:id/restore` | **❌ NO UI** | — | `{ success, data }` | ❌ GAP (CP-016) |
| `PUT /admin/attendance/:id/restore` | **❌ NO UI** | — | `{ success, data }` | ❌ GAP (CP-016) |
| `POST /admin/import/children/validate` | **❌ NO UI** | — | `{ importJobId, totalRows, validRows, invalidRows, errors }` | ❌ GAP (CP-011) |
| `POST /admin/import/:id/start` | **❌ NO UI** | — | 202 + `{ importJobId, status }` | ❌ GAP (CP-011) |
| `GET /admin/import/:id/status` | **❌ NO UI** | — | `{ status, ... }` | ❌ GAP (CP-011) |
| `GET /admin/import/:id/errors` | **❌ NO UI** | — | `{ errors: [...] }` | ❌ GAP (CP-011) |

### 6.2 AI Warnings router (`/api/v1/ai-warnings/*`)
Middleware: `authenticate → requireRole('admin', 'government')`  
**No `requireSchoolScope` on this router** — same pattern that bit Government.

| Endpoint | Frontend call | Frontend URL used | Correct URL | Status |
|---|---|---|---|---|
| `GET /ai-warnings` | Dashboard:81, AIWarnings:181/190 | `/admin/ai-warnings` | `/ai-warnings` | ❌ WRONG PREFIX — returns 404 |
| `PUT /ai-warnings/:id/resolve` | AIWarnings:206 | `POST /admin/ai-warnings/:id/resolve` | `PUT /ai-warnings/:id/resolve` | ❌ WRONG PREFIX + WRONG METHOD |
| `POST /ai-warnings/:id/notify` | — | — | `/ai-warnings/:id/notify` | ❌ NO UI |
| `POST /ai-warnings/analyze` | — | — | `/ai-warnings/analyze` | ❌ NO UI |

**Result:** The AI Warnings page always shows an empty state (the `GET` returns 404, swallowed silently at AIWarnings:195). The Dashboard AI warnings count is always 0. The "Mark Resolved" action fires a 404 (POST to wrong path).

### 6.3 Shared user routes (`/api/v1/user/*`)
Admin can access `PUT /user/profile` and `PUT /user/password` (used in Settings.jsx and Profile.jsx). These are gated by `authenticate` only — any authenticated user can update their own profile.

### 6.4 Cross-router endpoints the admin token can reach but portal does NOT use

| Endpoint | Router | Why admin can reach | Portal uses it? |
|---|---|---|---|
| `GET /therapy` | `/api/v1/therapy` | authenticate only for GET | ❌ No (TherapyManagement.jsx is orphaned) |
| `POST/PUT/DELETE /therapy` | `/api/v1/therapy` | `requireRole('admin', 'teacher')` | ❌ No |
| `GET /groups` | `/api/v1/groups` | authenticate only for GET | ❌ No (admin uses `/admin/groups` instead) |
| `GET /ai-warnings` | `/api/v1/ai-warnings` | `requireRole('admin', 'government')` | ❌ No (portal uses wrong prefix `/admin/ai-warnings`) |
| `PUT /ai-warnings/:id/resolve` | `/api/v1/ai-warnings` | same | ❌ No (wrong prefix AND wrong method) |

### 6.5 Endpoint called that requires a different role

| Frontend call | Endpoint | Required roles | Admin role result |
|---|---|---|---|
| `GET /business/users` (UsersStats:32) | `/api/v1/business/users` | `business`, `government` | ❌ 403 FORBIDDEN — admin cannot reach business routes |

---

## 7. Full Admin-Reachable Surface Note

This survey mapped endpoints across all routers an admin token can reach, not just `adminRoutes.js`:

- `adminRoutes.js` — primary surface; fully mapped above
- `aiWarningRoutes.js` — admin CAN reach it; portal calls wrong URL prefix
- `therapyRoutes.js` — admin CAN reach mutations (requireRole includes admin); portal has orphaned TherapyManagement.jsx with no route
- `groupRoutes.js` — admin CAN reach GET-only (authenticate sufficient); portal uses adminRoutes `/admin/groups` wrapper instead
- `userRoutes.js` — admin CAN reach `/user/profile` and `/user/password`; Settings.jsx uses these correctly
- `businessRoutes.js` — admin CANNOT reach (requires `business` or `government`); UsersStats.jsx incorrectly calls this → permanent 403

**Conclusion:** The Government lesson holds — two broken endpoints (`/admin/ai-warnings` and `/business/users`) were only visible by checking outside adminRoutes.js.

---

## 8. i18n Status

| Attribute | Value |
|---|---|
| Setup | `mergeLocales(sharedEn/Uz/Ru, portalEn/Uz/Ru)` — same pattern as Government |
| Languages wired | ✅ en, uz, ru |
| `fallbackLng` | `'uz'` — NOT `'en'`; if a key is missing from `en` locale it falls back to `uz` strings (potentially confusing for English speakers) |
| Portal locale files | `locales/en/common.json`, `locales/uz/common.json`, `locales/ru/common.json` |
| String externalization | **Mixed** — most Dashboard/ReceptionManagement strings use `t()` with `defaultValue`; some strings still hardcoded in Uzbek (e.g., `MOCK_ACTIVITY` at Dashboard:42–47, group labels, reception status labels in Uzbek inline) |
| AI-generated status | `ru.json` and `uz.json` are AI-generated (UNVERIFIED, same as backend i18n — PL-009-VERIFY applies) |
| `verify-i18n.js` | Only covers backend error codes; admin locale completeness unverified by script |

**i18n gaps found:**
- `TherapyManagement.jsx` has hardcoded Uzbek labels (moot since it's orphaned)
- Dashboard `MOCK_ACTIVITY` array has hardcoded Uzbek names and time strings
- `Sidebar.jsx` section labels (`'Boshqaruv'`, `'Hujjatlar'`, `'Hisobotlar'`, `'Sozlamalar'`) are hardcoded Uzbek strings, not `t()` calls

---

## 9. CP-Inheritance Table

Items from Government CLOSEOUT.md §6 and LOOP_CROSS_PORTAL.md targeted at Admin:

| CP | Item | Admin current state |
|---|---|---|
| CP-011 | Bulk import UI (`/admin/import/children/validate` + `/start` + `/status` + `/errors`) | ❌ Not built — 4 backend endpoints exist, 0 frontend consumers |
| CP-012 | Parent suspend/activate buttons | ❌ Not built — routes exist (`PUT /admin/parents/:id/suspend|activate`), `ParentManagement.jsx` is view-only |
| CP-016 | Restore UI (children, users, observations, attendance) | ❌ Not built — 4 backend endpoints exist, 0 frontend consumers |
| CP-023 | Forced password-change flow | ❌ Not built — no `mustChangePassword` check in `AppRoutes`; backend gate returns 403 but admin portal doesn't redirect |
| CP-019 | AI-translation notice banner | ❌ Not built — `TranslationNotice.jsx` component was created for Government; Admin has no equivalent |
| CP-003 | Response shape grandfather clause | 🟡 Partially handled — defensive `res.data.data || res.data` patterns present; new endpoints built in Admin loop must use `{ success, data }` |
| DG-003 | School category UI | ❌ Not built (deal-gated pending PL-015 data; Admin loop can defer until PL-015 received) |
| CP-020 | Rating overhaul (two directions) | ❌ Not built — spec in LOOP_CROSS_PORTAL.md; Admin loop needs to consult spec before touching SchoolRatings page |

**Archived-school banner** (from Government CLOSEOUT §6): `requireSchoolScope` already returns 403 `SCHOOL_ARCHIVED` if admin's school is archived. No banner or user-facing message exists in admin portal. Admin would see 403 errors on every page load with no explanation.

---

## 10. External Dependencies and Versions

| Package | Version | Notes |
|---|---|---|
| `react` | 18.2.0 | ✅ stable |
| `react-router-dom` | 6.20.1 | ✅ stable |
| `axios` | 1.13.2 | ✅ stable |
| `i18next` | 23.10.1 | ✅ stable |
| `react-i18next` | 13.5.0 | ✅ stable |
| `lucide-react` | 0.562.0 | ✅ stable |
| `vite` | 5.0.8 | ✅ stable |
| `vitest` | 4.0.18 | ✅ stable |
| **`express`** | **4.18.2** | **⚠️ WRONG — in `dependencies` not `devDependencies`; admin is a frontend SPA; never used; should be removed** |
| `jsdom` | 27.4.0 (via override) | Fine — overrides internal dep |

---

## 11. Conventions Observed

- **Routing:** React Router v6, nested routes with Outlet (`App.jsx:51–62`)
- **API client:** Single shared `api` instance from `services/api.js`; all pages import from there
- **Cache:** `shared/utils/cache.js`; string keys prefixed `admin:`; used for all data-heavy pages
- **Error handling:** `try/catch` with `toastError()` on network failures; no global error handler; silent 404 swallowing in AIWarnings page (`// endpoint may not exist yet` comment at AIWarnings.jsx:195)
- **Loading state:** `useState(false)` initialized from cache check (`!cache.get(KEY)`); skeleton or spinner shown during load
- **No pagination:** All list endpoints fetched without pagination params (ReceptionManagement uses client-side `PAGE_SIZE = 15` slicing on fetched array; not server-side pagination)
- **No tests for page components** (Dashboard, ReceptionManagement, DocumentApprovalQueue, AIWarnings, ParentManagement, TeacherManagement, GroupManagement, SchoolRatings, UsersStats, Profile — ZERO page tests exist)

---

## 12. Open Questions

| # | Question | Implication |
|---|---|---|
| OQ-1 | Is `TherapyManagement.jsx` intentionally excluded from routing, or was it accidentally dropped? The file calls `/therapy` CRUD endpoints that admin CAN access. | If intentional: delete the file. If accidental: add route + sidebar link in S5/S6. |
| OQ-2 | Is `UsersStats.jsx` (at `/admin/users`) intended for admin use at all? It calls `/business/users` which requires `business` or `government` role. If the page is for admins, the endpoint is wrong; if it's not for admins, the route and file should be removed. | Determines whether this is a bug to fix or a page to remove. |
| OQ-3 | The Dashboard activity feed is entirely hardcoded mock data (Uzbek names, fake timestamps). Is there a planned `/admin/me/activity` backend endpoint, or should the mock be replaced with real audit-log data from `/admin/audit-log`? | Shapes S6 feature plan — real audit log is the safer bet. |
| OQ-4 | `GroupManagement.jsx` has no sidebar nav link. Is this intentional (admin shouldn't navigate to it independently) or a nav omission? Groups are visible in the sidebar for Government but not Admin. | Minor nav bug vs intentional design. |
| OQ-5 | The `BottomNav.jsx` mobile nav only shows "Reception" and "Exit". Should it match the full sidebar nav (9 items)? Government has a mobile slide-out; Admin has a limited bottom nav that doesn't cover all pages. | Mobile UX completeness — S1 finding candidate. |
| OQ-6 | `NotificationPreferences.jsx` in Settings has no API call observed. Does the notification preferences form submit anywhere? | Possibly a stub/dead form. |
| OQ-7 | The AI Warnings resolve endpoint is called with `POST` but the backend is `PUT`. Is this wrong (S1 bug to fix) or did the backend change after the frontend was written? | S1 finding — need to check git log for which changed last. |
| OQ-8 | Does the admin portal need the parent suspend/activate UI as part of this loop, or is CP-012 deferred to a later pass? CP-012 target said "Admin portal" — this may be the loop. | Shapes S6 scope. |

---

## 13. Summary for S1

**Confirmed broken (3 bugs):**
1. **AI Warnings: wrong URL prefix** — `GET /admin/ai-warnings` should be `GET /ai-warnings`; `POST /admin/ai-warnings/:id/resolve` should be `PUT /ai-warnings/:id/resolve`. Both the Dashboard warning count and the full AIWarnings page are dead.
2. **UsersStats: wrong role endpoint** — `GET /business/users` returns 403 for admin role. Page loads but immediately errors.
3. **Login: no mustChangePassword gate** — CP-023 backend gate is live but admin portal doesn't redirect to change-password page.

**Structurally orphaned (1):**
4. **TherapyManagement.jsx** — file with API calls, no route in App.jsx.

**CP gaps (no UI for built backend):**
- CP-011 bulk import — 4 endpoints, 0 UI
- CP-012 parent suspend/activate — 2 endpoints, 0 UI
- CP-016 restore — 4 endpoints, 0 UI
- CP-019 translation notice — 0 UI
- CP-023 forced password-change — 0 UI
- Archived-school banner — 0 UI

**No page-level tests:** 11 page components, 0 page tests. Government had 16 suites; Admin has 15 with only 1 non-trivial page test (Settings).

**Current counts:** 15 test suites / 79 tests / lint (unverified).
