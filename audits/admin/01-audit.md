# Admin Portal — Step 1: Audit

**Date:** 2026-05-21  
**Portal:** Admin (Loop 3)  
**Auditor:** Claude (claude-sonnet-4-6)  
**Input:** S0 understanding doc + direct code reads of all 11 routed pages and supporting files

---

## 0. Summary

| Severity | Count | IDs |
|---|---|---|
| Critical | 2 | AD-001, AD-002 |
| High | 4 | AD-003, AD-004, AD-005, AD-006 |
| Medium | 7 | AD-007, AD-008, AD-009, AD-010, AD-011, AD-012, AD-013 |
| Low | 5 | AD-014, AD-015, AD-016, AD-017, AD-018 |
| **Total** | **18** | |

**Needs Max decision:** 4 items (§4)  
**Silent-failure audit:** §2  
**OQ cross-reference:** §5

---

## 1. Findings by Severity

---

### CRITICAL

---

#### AD-001 — AIWarnings: GET /admin/ai-warnings (wrong prefix) + silent empty state

**File:** `admin/src/pages/AIWarnings.jsx:181, 190, 194–196`  
**OQ cross-ref:** OQ-1 (S0 §8 question about AIWarnings)

```js
// AIWarnings.jsx:180-186 — stale-while-revalidate path:
api.get('/admin/ai-warnings').then(res => {
  const data = res.data.data || [];
  cache.set(CACHE_KEY, data);
  setWarnings(data);
}).catch(() => {});   // ← swallowed on both paths

// AIWarnings.jsx:188-198 — cold-load path:
try {
  setLoading(true);
  const res = await api.get('/admin/ai-warnings');   // line 190 — WRONG PREFIX
  const data = res.data.data || [];
  cache.set(CACHE_KEY, data);
  setWarnings(data);
} catch {
  // endpoint may not exist yet — silently show empty state   // line 195 — SILENT 404 SWALLOW
} finally {
  setLoading(false);
}
```

**Why it's wrong:**  
The backend endpoint is `GET /api/v1/ai-warnings` (declared in `aiWarningRoutes.js`, mounted at `/ai-warnings`). There is no `/admin/ai-warnings` route — the request 404s every time. Both fetch paths swallow the error with no toast, no log, no retry indicator. The user sees an empty warnings list with a healthy "No warnings" shield icon.

AI Warnings is a safeguarding surface: it surfaces patterns in child behavioral data that require staff review. An admin who sees 0 warnings when real warnings exist makes decisions (discharge, escalation, routine) on a false picture. The empty-catch comment `// endpoint may not exist yet` was written during development scaffolding and was never removed.

**Correct URL:** `GET /api/v1/ai-warnings`  
**Fix direction:** Change URL to `/ai-warnings`; replace empty catch with `showError(...)`.

---

#### AD-002 — AIWarnings: resolve uses wrong method (POST) and wrong prefix

**File:** `admin/src/pages/AIWarnings.jsx:206`

```js
// AIWarnings.jsx:203-215 — handleResolve:
const handleResolve = async (id) => {
  try {
    setResolving(id);
    await api.post(`/admin/ai-warnings/${id}/resolve`);   // ← POST, wrong prefix
    ...
  } catch (err) {
    showError(err.response?.data?.error || t('aiWarnings.resolveError', ...));
  }
```

**Why it's wrong:**  
The backend uses `PUT /api/v1/ai-warnings/:id/resolve` (declared in `aiWarningRoutes.js`). Two bugs compound:
1. Wrong prefix: `/admin/` → 404
2. Wrong method: `POST` → even with correct prefix, would 404 (no POST route exists)

The catch block _does_ show an error toast — but the error comes from a 404, not a business-logic rejection. Admin cannot resolve any warning.

**Fix direction:** Change to `api.put(\`/ai-warnings/${id}/resolve\`)`.

---

### HIGH

---

#### AD-003 — UsersStats: calls business-role endpoint, admin gets 403 on every load

**File:** `admin/src/pages/UsersStats.jsx:32`  
**OQ cross-ref:** OQ-2 (is this page intended for admin?)

```js
// UsersStats.jsx:26-41 — useEffect loadStats:
const loadStats = async () => {
  try {
    setLoading(true);
    const params = { ...dateRange };
    if (selectedRole) params.role = selectedRole;
    const response = await api.get('/business/users', { params });   // ← businessRoutes
    setStats(response.data.data);
  } catch (error) {
    showError(error.response?.data?.error || error.message);   // ← shows 403 error toast
  } finally {
    setLoading(false);
  }
};
```

**Why it's wrong:**  
`businessRoutes.js` begins with `router.use(requireRole('business', 'government'))`. An admin token gets 403 immediately. The error toast fires on every page load and every filter change. The page is mounted at `/admin/users` in `App.jsx:57` and is reachable but permanently broken.

The `GET /admin/statistics` endpoint already returns user counts (receptions, teachers, parents, children) and is what the Dashboard uses. UsersStats likely should call that, or should not exist in the admin portal at all.

**Fix direction (needs Max decision OQ-2):**  
Option A — remove the page (if it was scaffolded for business role and accidentally left).  
Option B — rewire to `GET /admin/statistics` if the intent is school-scoped user counts.

---

#### AD-004 — Login ignores `mustChangePassword` flag — no forced-password-change redirect

**File:** `admin/src/pages/Login.jsx:22–26`  
**OQ cross-ref:** CP-023

```js
// Login.jsx:22-33 — handleSubmit success path:
const result = await login(email, password);

if (result.success) {
  navigate('/admin');   // ← always goes to dashboard, no mustChangePassword check
} else {
  if (result.status === 429) setError(t('login.accountLocked'));
  else if (result.status === 403) setError(t('login.notApproved'));
  else setError(t('login.errorInvalid'));
}
```

**Why it's wrong:**  
The backend login response includes `mustChangePassword: true` when the flag is set on the user record. The backend also enforces `403 PASSWORD_CHANGE_REQUIRED` on every subsequent API call when the flag is set (`middleware/auth.js`). This means:  
- Admin logs in → navigates to `/admin` (dashboard)  
- Dashboard makes 5 API calls (statistics, receptions, documents, ai-warnings, school-ratings)  
- All 5 return 403 `PASSWORD_CHANGE_REQUIRED`  
- Dashboard shows all zeros / empty state with no explanation  
- Admin cannot take any action; there is no UI path to change the password when the flag is set

CP-023 is live on the backend. Government portal implemented the redirect (Sprint E1). Admin has not.

**Fix direction:** Check `result.mustChangePassword` or `result.user?.mustChangePassword` after success; navigate to `/admin/settings` (or a dedicated `/admin/change-password` route) instead of `/admin`.

---

#### AD-005 — ProtectedRoute doesn't check `mustChangePassword` — gate is incomplete

**File:** `admin/src/components/ProtectedRoute.jsx:20–24`

```js
// ProtectedRoute.jsx:20-24:
if (!isAuthenticated || !isAdmin) {
  return <Navigate to="/login" replace />;
}

return children;   // ← no mustChangePassword guard
```

**Why it's wrong:**  
Even if Login is fixed (AD-004) to redirect to a change-password page, a user who navigates directly to `/admin/dashboard` (or uses the back button after being redirected) bypasses the check entirely. The Government portal wraps the redirect in both Login AND ProtectedRoute. The Admin portal needs both layers.

**Fix direction:** `const { user } = useAuth()`. If `user?.mustChangePassword` and the current path is not the change-password route, return `<Navigate to="/admin/change-password" replace />`.

---

#### AD-006 — TherapyManagement.jsx (547 lines) has no route — orphaned or missing route

**File:** `admin/src/pages/TherapyManagement.jsx` (entire file)  
**OQ cross-ref:** OQ-1 (needs Max decision)

```js
// TherapyManagement.jsx:59 — on mount:
const response = await api.get('/therapy', { params });

// TherapyManagement.jsx:120-125 — create:
await api.post('/therapy', therapyData);

// TherapyManagement.jsx:119-122 — edit:
await api.put(`/therapy/${editingTherapy.id}`, therapyData);

// TherapyManagement.jsx:141-144 — delete:
await api.delete(`/therapy/${id}`);
```

**App.jsx — no import, no route:**
```js
// App.jsx — TherapyManagement is NOT imported, NOT in routes
```

**Why it's a finding:**  
A full CRUD page for therapy resources (music, video, content) was built for the admin portal. The backend routes (`therapyRoutes.js`) allow `admin` role for mutations — the URLs are correct and the page would work if mounted. But the route was never added to App.jsx (or was removed). The file is unreachable in production and will not be tested.

This is ambiguous: (a) intentionally deferred — route should be added when the therapy feature is approved; (b) accidentally dropped — the route was removed during a refactor. Max must decide. Until then, the file is dead code.

**Fix direction (needs Max decision OQ-1):**  
Option A — add route and sidebar nav item.  
Option B — delete the file until the feature is approved.

---

### MEDIUM

---

#### AD-007 — Dashboard activity feed is hardcoded mock data with real-looking names

**File:** `admin/src/pages/Dashboard.jsx:41–47`

```js
const MOCK_ACTIVITY = [
  { icon: UserPlus2, color: 'bg-success-50 text-success-700',
    text: ['Aziza Karimova', ' yangi ota-onani qo\'shdi · ', 'Yusuf Toshmatov'],
    time: '12 daqiqa oldin' },
  { icon: FileText, color: 'bg-brand-50 text-brand-700',
    text: ['Bobur Saidov', ' hujjat yukladi · ', 'Tibbiy ma\'lumot'],
    time: '28 daqiqa oldin' },
  { icon: Pencil, color: 'bg-info-50 text-info-700',
    text: ['Madina Rahmatova', ' o\'qituvchi profilini tahrirladi · ', 'Sevara Tursunova'],
    time: '1 soat 14 daqiqa oldin' },
  { icon: CheckCircle2, color: 'bg-success-50 text-success-700',
    text: ['Aziza Karimova', ' guruh ro\'yxatini yangiladi · ', '5-A "Quyosh"'],
    time: '2 soat 03 daqiqa oldin' },
  { icon: LogIn, color: 'bg-warm-100 text-warm-600',
    text: ['Bobur Saidov', ' tizimga kirdi', ''],
    time: '3 soat 41 daqiqa oldin' },
];
```

**Dashboard.jsx:389–406 — rendered as if live data:**
```jsx
{MOCK_ACTIVITY.map((item, i) => (
  <div key={i} ...>
    ...
    <p className="text-warm-700">
      <span className="text-warm-900 font-medium">{item.text[0]}</span>  // "Aziza Karimova"
      {item.text[1]}
      {item.text[2] && <span className="text-warm-900 font-medium">{item.text[2]}</span>}
    </p>
    <p className="text-xs text-warm-500 num mt-0.5">{item.time}</p>  // "12 daqiqa oldin"
  </div>
))}
// TODO(phase-2): wire to /api/v1/admin/me/activity once backend supports it
```

**Why it's wrong:**  
Every admin user on every school sees the same five Uzbek names ("Aziza Karimova", "Bobur Saidov", etc.) performing the same actions at the same relative times. There is no visual indicator that this is placeholder data. An admin running the school for the first time may interpret this as real activity from their staff. No backend audit-activity endpoint currently exists.

**Fix direction:** Either (a) hide the activity feed section entirely with a "Coming soon" placeholder, or (b) wire to `GET /admin/audit-log` (which does exist — returns real audit entries for the school) and show those instead.

---

#### AD-008 — Dashboard school-ratings fallback to hardcoded constants when API fails

**File:** `admin/src/pages/Dashboard.jsx:194–197`

```js
const ratingAvg  = ratings?.average ?? 4.6;        // ← 4.6 shown if API fails/null
const ratingDist = ratings?.distribution || [59, 18, 7, 2, 1];  // ← fake distribution
const ratingTotal = ratingDist.reduce((a, b) => a + b, 0) || 87; // ← 87 shown if sum=0
const ratingPct  = (n) => ratingTotal > 0 ? Math.round((n / ratingTotal) * 100) : 0;
```

**Why it's wrong:**  
If `GET /admin/school-ratings` fails or returns null, the ratings panel shows: 4.6 ★★★★★, distribution bars at 68/21/8/2/1%, "87 ta baho" — all fabricated. A school with zero ratings, or a school whose ratings call failed, looks like it has an excellent 4.6-star record. This is confusing and potentially misleading when admins show the dashboard to stakeholders.

**Fix direction:** Replace fallbacks with `0` / `null` and hide the ratings panel when no real data exists.

---

#### AD-009 — Dashboard uses `isResolved` field; AIWarnings page uses `resolvedAt` — field mismatch

**File:** `admin/src/pages/Dashboard.jsx:183, 292, 294, 199` vs `admin/src/pages/AIWarnings.jsx:219–221`

```js
// Dashboard.jsx:183 — tasks panel:
aiWarningsArray.filter((w) => !w.isResolved).length > 0

// Dashboard.jsx:292 — AI warnings card count:
aiWarningsArray.filter((w) => !w.isResolved).length

// Dashboard.jsx:199 — highest-priority warning:
aiWarningsArray.find((w) => !w.isResolved && ['critical', 'high'].includes(...))

// AIWarnings.jsx:219-221 — AIWarnings page filter:
const matchesStatus =
  statusFilter === 'all' ? true :
  statusFilter === 'unresolved' ? !w.resolvedAt :
  statusFilter === 'resolved' ? !!w.resolvedAt : true;
```

**Why it's wrong:**  
The backend model uses `resolvedAt` (timestamp) as the resolved indicator, not a boolean `isResolved`. The Dashboard would always show 0 unresolved warnings if the backend returns objects without `isResolved`. The AIWarnings page correctly uses `resolvedAt`. One of the two is out of sync with the actual response shape.

**Fix direction:** Confirm backend response shape; standardize on `resolvedAt`. If `isResolved` is a computed boolean from the backend, document it — otherwise rewrite Dashboard to use `resolvedAt`.

---

#### AD-010 — Sidebar section labels hardcoded in Uzbek — not i18n keys

**File:** `admin/src/components/Sidebar.jsx:21, 29, 35, 41`

```js
const NAV_SECTIONS = [
  { label: 'Boshqaruv', items: [...] },    // ← raw Uzbek string
  { label: 'Hujjatlar', items: [...] },    // ← raw Uzbek string
  { label: 'Hisobotlar', items: [...] },   // ← raw Uzbek string
  { label: 'Sozlamalar', items: [...] },   // ← raw Uzbek string
];
```

**Sidebar.jsx:116:**
```jsx
<p className="px-3 text-[10px] font-semibold uppercase tracking-wider text-walnut-muted mb-1.5">
  {section.label}   // ← rendered directly, not through t()
</p>
```

**Why it's wrong:**  
Nav item labels correctly go through `t(item.key)`. Section headers bypass i18n entirely. When a user switches to English or Russian, nav items translate but section dividers stay in Uzbek — visually inconsistent and a signal that the portal isn't fully localized.

**Fix direction:** Add `nav.section.*` keys to locale files; pass `label` as a translation key and use `t(section.labelKey)` in the template.

---

#### AD-011 — `/admin/groups` and `/admin/users` routes exist but have no Sidebar nav items

**File:** `admin/src/App.jsx:55, 57` vs `admin/src/components/Sidebar.jsx` (NAV_SECTIONS)

```js
// App.jsx — routes declared:
<Route path="groups" element={<ErrorBoundary><GroupManagement /></ErrorBoundary>} />
<Route path="users"  element={<ErrorBoundary><UsersStats /></ErrorBoundary>} />

// Sidebar.jsx — NAV_SECTIONS — neither /admin/groups nor /admin/users appears
```

**Why it's wrong:**  
Both pages are accessible but undiscoverable — an admin must type the URL directly. `GroupManagement` is a functional read-only view of school groups. `UsersStats` is broken (AD-003) but the discoverability gap exists independently. If groups are intentionally navigation-hidden (e.g., accessed via a link from another page), that should be documented.

**Fix direction:** Either add nav items, or remove the routes if the pages are not ready for use.

---

#### AD-012 — `express` in production dependencies — SPA has no server runtime

**File:** `admin/package.json:17`

```json
"dependencies": {
  "express": "^4.18.2",   // ← should not be here; SPA has no express runtime
  ...
}
```

**Why it's wrong:**  
The admin portal is a Vite/React SPA deployed as static files. There is no `express` usage anywhere in `admin/src/`. The dependency was likely copy-pasted from a server-side project. It adds ~2MB to `node_modules`, is bundled in the dependency tree, and may trigger security audits for an unneeded dep.

**Fix direction:** Remove from `dependencies`. If a dev script needed it, it belongs in `devDependencies` — but it's not used at all.

---

#### AD-013 — Dashboard also calls `/admin/ai-warnings` (wrong URL) — AI count always 0

**File:** `admin/src/pages/Dashboard.jsx:81`

```js
// Dashboard.jsx:77-83 — fetchFresh Promise.allSettled:
const [statsRes, receptionsRes, docsRes, aiRes, ratingsRes] = await Promise.allSettled([
  api.get('/admin/statistics', { signal }),
  api.get('/admin/receptions', { signal }),
  api.get('/admin/documents/pending', { signal }),
  api.get('/admin/ai-warnings', { signal }),   // ← line 81 — WRONG PREFIX
  api.get('/admin/school-ratings', { signal }),
]);

const aiData = aiRes.status === 'fulfilled'
  ? (aiRes.value?.data?.data || aiRes.value?.data || []) : [];   // always [] — rejected
```

**Why it's wrong:**  
Same wrong prefix as AD-001. `allSettled` prevents a page crash but `aiRes.status` is always `'rejected'` — `aiData` is always `[]`. The Dashboard AI warnings count is permanently 0, the Tasks panel never shows an AI-warnings task, and the "highest AI warning" callout never appears. No error is surfaced to the admin.

**Fix direction:** Change to `/ai-warnings` (same fix as AD-001).

---

### LOW

---

#### AD-014 — No page-level tests — 0 tests for 11 routed pages

**File:** `admin/src/__tests__/` (entire directory)

Tests present: `AuthContext.test.jsx` (1 import check), `auth.test.js` (7 tests), `utils.test.js`, `pages/Settings.test.jsx`, `pages/showToast.test.jsx`, 10 shared component tests.

**0 tests for:** Dashboard, AIWarnings, UsersStats, ReceptionManagement, ParentManagement, TeacherManagement, GroupManagement, SchoolRatings, DocumentApprovalQueue, Profile.

**Why it's a finding:**  
The two most-critical pages — AIWarnings (safeguarding) and ReceptionManagement (CRUD with 8 API calls) — have no behavioral tests. The broken state of AIWarnings (AD-001/002) would have been caught by a basic render + fetch-mock test. The CLAUDE.md requirement "New controllers MUST ship with tests" does not extend to frontend pages, but the risk gap on a safeguarding-adjacent feature warrants coverage.

**Fix direction:** At minimum, add render + error-state tests for AIWarnings (which will confirm the fix for AD-001/002 works). ReceptionManagement CRUD tests are also high value.

---

#### AD-015 — CP-019 translation notice not ported to admin portal

**File:** Government portal has `government/src/components/TranslationNotice.jsx`; admin portal has no equivalent.

**Why it's a finding:**  
CP-019 was closed for the government portal in the closeout pass. The admin portal has AI-generated uz/ru translations (unverified — `admin/src/locales/`) with no user-visible disclaimer. The translation notice is a pre-launch requirement for all portals with end-user-facing text.

**Fix direction:** Port `TranslationNotice.jsx` pattern to admin portal; add to `Layout.jsx`.

---

#### AD-016 — 403 `SCHOOL_ARCHIVED` not handled — admin sees generic error toast

**File:** `admin/src/services/api.js` (interceptor) + `shared/services/api.js`

**Why it's a finding:**  
`requireSchoolScope` returns `{ success: false, error: { code: 'SCHOOL_ARCHIVED' } }` with status 403 when the school is archived. The interceptor only handles 401 (token refresh). A 403 propagates to individual catch blocks, which call `showError(error.response?.data?.error || ...)`. Most pages will show "Hal qilinmagan xato" (generic error). This is a UX gap — the admin should see "Your school has been archived by your regional government. Contact your government portal for assistance."

**Fix direction:** Intercept 403 + check `error.response?.data?.error?.code === 'SCHOOL_ARCHIVED'` and show a specific message.

---

#### AD-017 — `fallbackLng: 'uz'` — missing i18n keys fall back to AI-generated Uzbek

**File:** `admin/src/i18n.js:24`

```js
i18n.use(initReactI18next).init({
  ...
  fallbackLng: 'uz',   // ← Uzbek is AI-generated and unverified
```

**Why it's a finding:**  
When a key is missing in the active language (e.g., English), i18next falls back to Uzbek — which is AI-generated and PL-009-VERIFY-pending. An English-browsing admin who encounters a missing key gets unverified Uzbek instead of a raw key they can report. The government portal uses `fallbackLng: 'uz'` too — this is a platform-wide gap, but flagged here for admin since the fix is per-portal.

**Fix direction:** Change to `fallbackLng: 'en'` — English translations are developer-authored and most complete.

---

#### AD-018 — CP-011/012/016 backend endpoints have no admin UI

**Why it's a finding:**  
Three feature sets built in backend have no admin portal consumer:

| CP | Endpoints | What's missing |
|---|---|---|
| CP-011 | `POST /admin/import/children/validate`, `POST /admin/import/:id/start`, `GET /admin/import/:id/status`, `DELETE /admin/import/:id` | Bulk CSV import UI (drag-and-drop, validation table, progress polling) |
| CP-012 | `PUT /admin/parents/:id/suspend`, `PUT /admin/parents/:id/activate` | Suspend/activate buttons in ParentManagement |
| CP-016 | `GET /admin/children/:id/restore`, `GET /admin/users/:id/restore`, `GET /admin/schools/:id/restore`, `GET /admin/receptions/:id/restore` | Restore UI for soft-deleted entities |

These are tracked in `LOOP_CROSS_PORTAL.md`. Flagged here so the cleanup plan (S2) accounts for them.

---

## 2. Silent-Failure Audit

Silent failures are catch blocks that swallow errors without surfacing feedback to the user or to logs.

| ID | File | Line(s) | Failure swallowed | Severity |
|---|---|---|---|---|
| AD-001 | AIWarnings.jsx | 185, 194–196 | GET 404 → empty warnings list; no toast, no log | CRITICAL |
| AD-001 | AIWarnings.jsx | 185 | Stale-while-revalidate path also swallows: `.catch(() => {})` | CRITICAL |
| AD-013 | Dashboard.jsx | 81 | `allSettled` handles it — no crash, but AI count always 0 | MEDIUM |
| — | Settings.jsx | 68–70 | `GET /admin/messages` failure → `setMyMessages([])`, no error displayed | LOW |
| — | createAuthContext.jsx | 58–61 | `/auth/me` failure → `setUser(null)` — this is correct behavior (session expired) | OK |
| — | Dashboard.jsx | 135–137 | `// ignore abort` — AbortSignal cancellations are correctly ignored | OK |

The only silent failures requiring action are the AIWarnings ones (AD-001/002). Settings messages failure is acceptable UX (the messages list is secondary to the main profile form). The Dashboard abort pattern is correct.

---

## 3. School-Scoping Frontend Assumptions

The admin portal's tenant isolation is handled entirely by `requireSchoolScope` middleware — the frontend has no scoping responsibility beyond passing valid credentials (cookies). However, three UI gaps exist when scoping enforcement returns errors:

| Scenario | Backend response | Admin portal response | Gap |
|---|---|---|---|
| School archived | 403 `SCHOOL_ARCHIVED` | Generic error toast | AD-016 — no specific message |
| mustChangePassword set | 403 `PASSWORD_CHANGE_REQUIRED` | Generic error toast per-call; no redirect | AD-004/AD-005 |
| Token expired mid-session | 401 → interceptor refreshes | Transparent to user — correct | OK |
| Other school's resource | 404 (school scope enforced by backend) | 404 error toast | OK — server handles isolation |

---

## 4. Needs Max Decision

| OQ | Item | What's needed | Affects |
|---|---|---|---|
| OQ-1 | TherapyManagement.jsx — intentional deferral or accidentally dropped route? | Confirm: add route (feature is approved) or delete file (not approved) | AD-006 severity classification |
| OQ-2 | UsersStats.jsx — is this page intended for admin role? | Confirm: remove (business-portal-only feature) or rewire to `/admin/statistics` | AD-003 fix direction |
| OQ-3 | Dashboard activity feed — should it wire to audit log or show a "Coming soon" placeholder? | Audit log exists (`GET /admin/audit-log`); depends on data shape | AD-007 fix direction |
| OQ-4 | Hardcoded fallbacks (4.6 rating avg, 87 ratings, 140 capacity) — user-visible or acceptable? | If these will remain for a sprint, add "— data unavailable" label | AD-008 fix direction |

---

## 5. OQ Cross-Reference (from S0 §8)

| S0 OQ | S0 question | Finding | Resolution |
|---|---|---|---|
| OQ-1 | Is TherapyManagement intentional or accidental? | AD-006 | Needs Max (§4) |
| OQ-2 | Is UsersStats intended for admin role? | AD-003 | Needs Max (§4) |
| OQ-3 | Does Dashboard activity feed have a real endpoint? | AD-007 | No — audit log exists but field mapping unknown |
| OQ-4 | What are the hardcoded fallbacks doing in production? | AD-008 | Risk: fake data shown when API fails |
| OQ-5 | BottomNav only covers 2 of 11 pages — intentional mobile scope? | Low UX gap | Not a finding unless mobile is a delivery target |
| OQ-6 | NotificationPreferences — is there a backend event system? | No API call in component; preferences are saved via profile update (`PUT /user/profile`) — this is correct | Closed: NotificationPreferences delegates to the Settings `onSubmit`, which calls `PUT /user/profile` with the full profile including preferences. No dedicated API needed. |

---

## 6. What S2 (Cleanup Plan) Must Cover

Priority order derived from severity:

1. **AD-001, AD-002, AD-013** — Fix AIWarnings URL (`/admin/ai-warnings` → `/ai-warnings`) and method (POST → PUT). Fix Dashboard URL. Add error toast to AIWarnings catch.
2. **AD-004, AD-005** — Implement CP-023 forced-password-change redirect in Login + ProtectedRoute.
3. **AD-003** — After Max confirms OQ-2: remove UsersStats or rewire to `/admin/statistics`.
4. **AD-006** — After Max confirms OQ-1: add TherapyManagement route or delete file.
5. **AD-007** — Replace MOCK_ACTIVITY with audit-log data or a placeholder banner.
6. **AD-008** — Remove hardcoded rating/capacity fallbacks; hide panel when data is null.
7. **AD-009** — Standardize on `resolvedAt` vs `isResolved` across Dashboard and AIWarnings.
8. **AD-010** — Translate Sidebar section labels via i18n.
9. **AD-011** — Add nav items for `/admin/groups` and remove or hide `/admin/users` pending OQ-2.
10. **AD-012** — Remove `express` from production dependencies.
11. **AD-014** — Add AIWarnings page tests (minimum: render + fetch-mock covering the fixed URL).
12. **AD-015** — Port `TranslationNotice` to admin portal Layout.
13. **AD-016** — Handle `SCHOOL_ARCHIVED` 403 in shared interceptor or portal-level error handler.
14. **AD-017** — Change `fallbackLng: 'uz'` → `'en'`.
15. **AD-018** — CP-011/012/016 UI tracked in cleanup plan; not immediate fixes.
