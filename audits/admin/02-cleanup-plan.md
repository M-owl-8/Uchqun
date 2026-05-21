# Admin Portal — Step 2: Cleanup Plan

**Date:** 2026-05-21  
**Portal:** Admin (Loop 3)  
**Source:** `audits/admin/01-audit.md` (18 findings)  
**OQ decisions:** All 4 resolved by Max (see §0)  
**Planner:** Claude (claude-sonnet-4-6)

---

## 0. Max's Decisions (pre-locked — S3 executes against these)

| OQ | Decision |
|---|---|
| OQ-1 (TherapyManagement) | **KEEP and wire up.** Add route + sidebar nav item. Bring to standard: replace hardcoded strings with i18n keys, add a page test, verify CRUD against `/therapy`. |
| OQ-2 (UsersStats) | **REMOVE entirely.** Delete page, route, file — it was a business/government page misplaced in admin. |
| OQ-3 (activity feed) | **WIRE to `GET /admin/audit-log` (real data)**, replacing MOCK_ACTIVITY. If audit-log response shape doesn't map cleanly to a feed, fall back to a clearly-labeled placeholder — not fake data. |
| OQ-4 (fabricated dashboard data) | **REMOVE all fabricated fallbacks** (4.6 rating avg, [59,18,7,2,1] distribution, 87 reviews, 140 capacity default). Show honest 0/null/empty and hide panels when no real data. |

**S3 can proceed without further Max input.** All 4 decisions are locked.

---

## 1. Ordered Work Units

10 cleanup units, ordered by: (1) demo-liability, (2) silent-failure danger, (3) dependency between fixes.

| Unit | Findings closed | Priority rationale |
|---|---|---|
| U-1 | AD-001, AD-002, AD-009, AD-013 | Silent safeguarding data loss; field mismatch creates new bug if split |
| U-2 | AD-007, AD-008 | Fabricated data shown to real users |
| U-3 | AD-004, AD-005 | User-blocking lockout with no escape path |
| U-4 | AD-003 | Page broken on every load; simple deletion |
| U-5 | AD-006 | Structural fix per OQ-1; medium size |
| U-6 | AD-016 | Error handling clarity; depends on U-3 patterns |
| U-7 | AD-010, AD-011, AD-017 | i18n and nav correctness |
| U-8 | AD-012 | Hygiene — zero risk |
| U-9 | AD-015 | CP-019 port; isolated |
| U-10 | AD-014 (remainder) | Test coverage for pages not covered by U-1/U-5 |

---

### U-1 — AI Warnings: URL + method + field mismatch (bundle, must not be split)

**Findings closed:** AD-001, AD-002, AD-009, AD-013

**Why this is one unit (critical):**  
Fixing the URL (AD-001/013) without fixing the field mismatch (AD-009) swaps one bug for another. The moment data flows with the corrected URL, the Dashboard reads `w.isResolved` (boolean) but the backend returns `resolvedAt` (timestamp or null). An unresolved warning shows `isResolved === undefined`, which is falsy — so it *looks* correct accidentally. But a resolved warning has `resolvedAt: "2026-05-21T..."` which is truthy, while `isResolved` would be `undefined` — Dashboard would count ALL warnings as unresolved regardless of state. The AIWarnings page meanwhile uses `resolvedAt` correctly. The two screens would disagree on the count every time a warning is resolved.

Splitting also means one commit "fixes" the URL while the next commit "fixes" the count — neither standalone commit is correct. They must land together.

**Files to change:**

| File | Lines | Change |
|---|---|---|
| `admin/src/pages/AIWarnings.jsx` | 181, 190 | `/admin/ai-warnings` → `/ai-warnings` (both fetch paths) |
| `admin/src/pages/AIWarnings.jsx` | 185 | `.catch(() => {})` → `.catch(err => showError(err.response?.data?.error?.code \|\| t('aiWarnings.loadError', ...)))` — surface stale-path failures |
| `admin/src/pages/AIWarnings.jsx` | 194–196 | Replace empty catch with `showError(...)` — remove the "may not exist yet" comment |
| `admin/src/pages/AIWarnings.jsx` | 206 | `api.post('/admin/ai-warnings/${id}/resolve')` → `api.put('/ai-warnings/${id}/resolve')` |
| `admin/src/pages/Dashboard.jsx` | 81 | `/admin/ai-warnings` → `/ai-warnings` |
| `admin/src/pages/Dashboard.jsx` | 183, 292, 294, 199 | `!w.isResolved` → `!w.resolvedAt`; `w.isResolved` → `w.resolvedAt` (all four sites) |

**Tests required:**

- `admin/src/__tests__/pages/AIWarnings.test.jsx` (new):
  1. Renders loading skeleton on mount
  2. Shows warnings list when fetch succeeds with `resolvedAt: null` (unresolved)
  3. Shows "resolved" card when `resolvedAt` is a timestamp string
  4. Shows error toast (not empty state) when fetch returns non-2xx
  5. Calls `PUT /ai-warnings/:id/resolve` (not POST, not `/admin/ai-warnings/`) on resolve click
  6. Shows toast on resolve success

- **Revert-test pair** in the same file (using inline-mock pattern):
  - `[REVERT-TEST: BUG]` — mock returning `{ resolvedAt: null }`, URL is `/admin/ai-warnings` → confirms `warnings` state stays `[]` (the silent failure)
  - `[REVERT-TEST: FIXED]` — same warning, URL corrected to `/ai-warnings` → confirms warning appears in list and `!w.resolvedAt` evaluates correctly

**Dependency:** None — first unit.

**Est. size:** Small-medium (6 line-edits + 6-8 test cases).

---

### U-2 — Dashboard fiction removal: MOCK_ACTIVITY + fabricated fallbacks

**Findings closed:** AD-007, AD-008

**Why second:**  
Fabricated names ("Aziza Karimova") and fabricated ratings (4.6 ★) shown to real users are demo-credibility killers. This is the highest-visibility fix after the safeguarding fix.

**AD-007 fix — wire activity feed to `GET /admin/audit-log`:**

```
Implementation fork:
  A. If audit-log returns { actor: { firstName, lastName }, action, entityType, createdAt }
     → map to activity feed items (actorName, icon from action, relativeTime)
  B. If audit-log returns actorId only (no joined user data)
     → show a placeholder banner: "Recent activity will appear here once connected."
     → hide the MOCK_ACTIVITY entirely
```

The S3 executor must check the actual audit-log response shape before choosing A vs B. Do NOT fall back to MOCK_ACTIVITY — either real data or a labeled placeholder, nothing in between.

**Files to change:**

| File | Lines | Change |
|---|---|---|
| `admin/src/pages/Dashboard.jsx` | 41–47 | Delete `MOCK_ACTIVITY` constant |
| `admin/src/pages/Dashboard.jsx` | `fetchFresh` | Add `GET /admin/audit-log` (5th or 6th parallel call in `allSettled`) |
| `admin/src/pages/Dashboard.jsx` | activity feed section | Wire to real data or replace with placeholder banner |
| `admin/src/pages/Dashboard.jsx` | 194 | `ratings?.average ?? 4.6` → `ratings?.average ?? null` |
| `admin/src/pages/Dashboard.jsx` | 195 | `ratings?.distribution \|\| [59, 18, 7, 2, 1]` → `ratings?.distribution \|\| null` |
| `admin/src/pages/Dashboard.jsx` | 196 | `ratingDist.reduce(...) \|\| 87` → `ratingDist ? ratingDist.reduce(...) : 0` |
| `admin/src/pages/Dashboard.jsx` | ratings panel render | Hide entire ratings panel when `ratings === null` |
| `admin/src/pages/Dashboard.jsx` | 169–171 | `stats?.capacity \|\| 140` → `stats?.capacity \|\| 0`; use 0 not 140 as default |

**Tests required:**

- `admin/src/__tests__/pages/Dashboard.test.jsx` (new or added to):
  1. Renders without MOCK_ACTIVITY names — confirm "Aziza Karimova" never appears in DOM
  2. Ratings panel hidden when `ratings` API call returns null/fails
  3. Capacity shows 0 (not 140) when stats has no capacity field

**Dependency:** None — independent of U-1.

**Est. size:** Small (wire is the largest part; deletions are mechanical).

---

### U-3 — Forced password-change gate (CP-023): Login + ProtectedRoute

**Findings closed:** AD-004, AD-005

**Why third:**  
Admin users with `mustChangePassword: true` are functionally locked out — every API call returns 403 `PASSWORD_CHANGE_REQUIRED` with no UI path to escape. This is a real operational blocker for any admin whose password was reset.

**Pattern:** Replicate Government Sprint E1 exactly. Reference implementation: `government/src/App.jsx` (AppRoutes guard) + `government/src/pages/ChangePassword.jsx` + `government/src/components/ProtectedRoute.jsx`.

**Files to change / create:**

| File | Change |
|---|---|
| `admin/src/pages/Login.jsx` | After `result.success`: check `result.mustChangePassword \|\| result.user?.mustChangePassword` → navigate to `/admin/change-password` instead of `/admin` |
| `admin/src/components/ProtectedRoute.jsx` | After `isAuthenticated && isAdmin` check: if `user?.mustChangePassword && pathname !== '/admin/change-password'` → `<Navigate to="/admin/change-password" replace />` |
| `admin/src/pages/ChangePassword.jsx` | New page — PUT `/user/password` form; on success: call `setUser({ ...user, mustChangePassword: false })`, navigate to `/admin`. Mirror Government's `ChangePassword.jsx`. |
| `admin/src/App.jsx` | Add `import ChangePassword from './pages/ChangePassword'`; add route `<Route path="change-password" element={<ChangePassword />} />` inside the `/admin` outlet (but outside or at-top so ProtectedRoute doesn't block it — see Government pattern for exact placement) |

**Important:** The `change-password` route must be reachable when `mustChangePassword: true`. In Government, the change-password page is rendered inside the layout but ProtectedRoute's redirect exempts the current path. ProtectedRoute must skip the `mustChangePassword` redirect when `pathname === '/admin/change-password'`.

**Tests required:**

- `admin/src/__tests__/pages/PasswordChangeRedirect.test.jsx` (new):
  1. `mustChangePassword: true` + login success → navigates to `/admin/change-password` (not `/admin`)
  2. `mustChangePassword: false` + login success → navigates to `/admin`
  3. ProtectedRoute with `mustChangePassword: true` redirects away from `/admin` to `/admin/change-password`
  4. ProtectedRoute with `mustChangePassword: true` does NOT redirect when already on `/admin/change-password`
  5. ChangePassword page: successful PUT `/user/password` → navigates to `/admin`

**Revert-test:** Same file:
- `[REVERT-TEST: BUG]` — `mustChangePassword: true` → Login navigates to `/admin` (old broken path — proves the bug)
- `[REVERT-TEST: FIXED]` — same state → navigates to `/admin/change-password`

**Dependency:** None — independent. But note this shares the `/user/password` endpoint with U-3's `ChangePassword.jsx` which also appears in Settings — no conflict (different forms, same endpoint).

**Est. size:** Medium (3 existing file edits + 1 new page + tests).

---

### U-4 — Remove UsersStats (OQ-2 decision: page never belonged in admin)

**Findings closed:** AD-003

**Why fourth:**  
The page is broken (403 on every load, error toast fires immediately). Deletion is the simplest fix and creates no regression risk since the page has never worked for admin.

**Files to change:**

| File | Change |
|---|---|
| `admin/src/pages/UsersStats.jsx` | **Delete** |
| `admin/src/App.jsx` | Remove `import UsersStats from './pages/UsersStats'`; remove `<Route path="users" element={<ErrorBoundary><UsersStats /></ErrorBoundary>} />` |
| `admin/src/components/Sidebar.jsx` | Confirm `/admin/users` is already absent from NAV_SECTIONS (it is — confirmed in S1 AD-011) — no change needed |

**Tests required:** None — deletion; no behavior to test. Confirm the route 404s after deletion (router falls to `<NotFound>` — this is correct behavior).

**Dependency:** None.

**Est. size:** Trivial (delete 1 file, 2 lines in App.jsx).

---

### U-5 — Wire TherapyManagement (OQ-1 decision: keep and bring to standard)

**Findings closed:** AD-006

**Why fifth:**  
Structural change per OQ-1. The page is complete — it needs a route, nav item, i18n pass, and one test. Medium size but isolated.

**Files to change / create:**

| File | Change |
|---|---|
| `admin/src/App.jsx` | Add `import TherapyManagement from './pages/TherapyManagement'`; add route `<Route path="therapy" element={<ErrorBoundary><TherapyManagement /></ErrorBoundary>} />` inside `/admin` outlet |
| `admin/src/components/Sidebar.jsx` | Add nav item to an appropriate section (e.g., "Boshqaruv" or a new "Terapiya" section — match existing visual style). Use `Pill` or `Tablets` icon from lucide-react. |
| `admin/src/pages/TherapyManagement.jsx` | Replace any remaining hardcoded UI strings not already behind `t()` with i18n keys. Confirm all form labels, table headers, and empty-state text use `t()`. |
| `admin/src/pages/TherapyManagement.jsx` | Replace `confirm()` native dialog with `ConfirmDialog` component (already in admin shared components — used in Document Approval). |
| `admin/src/locales/en/common.json` | Add any therapy keys not yet present |
| `admin/src/locales/uz/common.json` | Same |
| `admin/src/locales/ru/common.json` | Same |

**CRUD verification (required before calling the unit done):**  
The S3 executor must verify that all 4 therapy operations reach the backend correctly:
- `GET /therapy` — list (admin can reach via therapyRoutes `requireRole('admin', 'teacher')`)
- `POST /therapy` — create
- `PUT /therapy/:id` — edit
- `DELETE /therapy/:id` — delete

These are not integration tests — verify by reading the route file and confirming the roles allow `admin`. Do not spin up a server.

**Tests required:**

- `admin/src/__tests__/pages/TherapyManagement.test.jsx` (new, minimum):
  1. Renders therapy list when API returns data
  2. Shows empty state when API returns `[]`
  3. Opens create modal on "New Therapy" button click
  4. Calls `DELETE /therapy/:id` when delete is confirmed

**ConfirmDialog note:** The `TherapyManagement.jsx:137` delete uses `confirm()` (native browser dialog). Replace with the same `ConfirmDialog` component used in `DocumentApprovalQueue.jsx` — import from `@shared/components/ConfirmDialog`.

**Dependency:** None. But note that once the route is wired, the page is live — the i18n pass and ConfirmDialog replacement must be in the same commit.

**Est. size:** Medium (route + nav + i18n audit + ConfirmDialog swap + 4 tests).

---

### U-6 — 403 error handling: SCHOOL_ARCHIVED + PASSWORD_CHANGE_REQUIRED

**Findings closed:** AD-016

**Why sixth:**  
Depends on U-3 (which adds the `/admin/change-password` route). The 403 for `PASSWORD_CHANGE_REQUIRED` from API calls can redirect to that route. The 403 for `SCHOOL_ARCHIVED` needs a specific message.

**Problem:** The admin portal's API interceptor (`shared/services/api.js`) only handles 401. A 403 `SCHOOL_ARCHIVED` propagates to individual catch blocks, which show a generic error toast.

**Approach — portal-level response interceptor extension:**  
Rather than editing the shared interceptor (which would affect all portals), add an admin-specific interceptor layer in `admin/src/services/api.js`:

```js
// admin/src/services/api.js (current: 3 lines)
import { createApi } from '@shared/services/api';
const api = createApi({ tokenKey: 'admin_accessToken' });

// Add after createApi():
api.interceptors.response.use(null, (error) => {
  const code = error.response?.data?.error?.code;
  if (error.response?.status === 403) {
    if (code === 'PASSWORD_CHANGE_REQUIRED') {
      // Redirect to change-password page (SPA navigate, not hard reload)
      window.dispatchEvent(new CustomEvent('admin:mustChangePassword'));
    } else if (code === 'SCHOOL_ARCHIVED') {
      window.dispatchEvent(new CustomEvent('admin:schoolArchived'));
    }
  }
  return Promise.reject(error);
});

export default api;
```

Then in `App.jsx` or `Layout.jsx`, listen for these events and react (navigate / show specific modal). This keeps the interceptor addition in the admin-specific layer, not the shared layer.

**Alternative (simpler):** Catch in ProtectedRoute's render — if `user.school?.isActive === false`, show an archived banner before rendering children. This requires the auth context to return school info — check if `user.school` is populated from `/auth/me`.

The S3 executor should choose the simpler approach that fits the existing data shape. The plan documents both paths; S3 picks one.

**Files to change:**

| File | Change |
|---|---|
| `admin/src/services/api.js` | Add portal-level interceptor for 403 codes (or handle in ProtectedRoute — S3 decides based on `user.school` availability) |
| `admin/src/components/ProtectedRoute.jsx` | (if ProtectedRoute approach chosen) Add archived-school banner when `user?.school?.isActive === false` |
| `admin/src/locales/*/common.json` | Add `errors.schoolArchived` and `errors.mustChangePassword` locale keys |

**Tests required:**

- `admin/src/__tests__/pages/ProtectedRoute.test.jsx` or in existing auth tests:
  1. `school.isActive === false` → renders archived banner (not the admin layout)
  2. `school.isActive === true` → renders normally

**Dependency:** U-3 (the `/admin/change-password` route must exist before we can redirect to it from an interceptor).

**Est. size:** Small.

---

### U-7 — i18n + nav correctness

**Findings closed:** AD-010, AD-011, AD-017

**Why seventh:**  
No user-blocking impact; batched together as a hygiene sweep.

**AD-010 — Sidebar section labels:**

```js
// Sidebar.jsx — change from:
{ label: 'Boshqaruv', items: [...] }

// To:
{ labelKey: 'nav.section.management', items: [...] }

// And in template:
<p ...>{t(section.labelKey, { defaultValue: section.labelKey })}</p>
```

Add to locale files:
- `nav.section.management` → "Management" / "Boshqaruv" / "Управление"
- `nav.section.documents` → "Documents" / "Hujjatlar" / "Документы"
- `nav.section.reports` → "Reports" / "Hisobotlar" / "Отчёты"
- `nav.section.settings` → "Settings" / "Sozlamalar" / "Настройки"

**AD-011 — Nav item for Therapy (added by U-5). GroupManagement nav item:**  
`/admin/groups` route exists but has no sidebar link. Add to appropriate section.
- If groups are intentionally hidden (accessed via a link from another page — e.g., Dashboard → "View groups"), confirm this is intentional and add a code comment.
- Otherwise add `{ key: 'nav.groups', href: '/admin/groups', icon: LayersIcon }`.
- The S3 executor should check GroupManagement.jsx to see if it's linked from elsewhere before deciding.

**AD-017 — fallbackLng:**

```js
// admin/src/i18n.js:24
// Change:
fallbackLng: 'uz',
// To:
fallbackLng: 'en',
```

**Files to change:**

| File | Change |
|---|---|
| `admin/src/components/Sidebar.jsx` | Rename `label` to `labelKey`; use `t(section.labelKey)` in template |
| `admin/src/components/Sidebar.jsx` | Add GroupManagement nav item (if confirmed not linked elsewhere) |
| `admin/src/locales/en/common.json` | Add `nav.section.*` keys |
| `admin/src/locales/uz/common.json` | Same |
| `admin/src/locales/ru/common.json` | Same |
| `admin/src/i18n.js` | `fallbackLng: 'uz'` → `'en'` |

**Tests required:**  
Update any existing Sidebar tests that count or assert section labels. No new test needed — this is purely a correctness fix.

**Dependency:** None. But GroupManagement nav item (AD-011) depends on S3 executor verifying the page isn't already linked-to from somewhere.

**Est. size:** Small.

---

### U-8 — Remove `express` from production dependencies

**Findings closed:** AD-012

**File:** `admin/package.json`

```json
// Remove from "dependencies":
"express": "^4.18.2",
```

No other change needed — express is unused in the SPA source.

**Tests required:** None. Run `npm install` after to confirm no import errors.

**Dependency:** None.

**Est. size:** Trivial (1 line deletion).

---

### U-9 — Port CP-019 translation notice to admin portal

**Findings closed:** AD-015

**Reference implementation:** `government/src/components/TranslationNotice.jsx` + `government/src/components/Layout.jsx`.

**Port strategy:** The component is identical except for the localStorage key (`gov_translation_notice_dismissed` → `admin_translation_notice_dismissed`). Copy the component, update the key, add to admin Layout.

**Files to create / change:**

| File | Change |
|---|---|
| `admin/src/components/TranslationNotice.jsx` | New — port from government; change `STORAGE_KEY` to `'admin_translation_notice_dismissed'` |
| `admin/src/components/Layout.jsx` | Add `import TranslationNotice from './TranslationNotice'`; render `<TranslationNotice />` before `<main>` |
| `admin/src/locales/en/common.json` | Add `common.translationNotice` and `common.dismiss` keys (if not already present from shared locale) |

**Tests required:**

- `admin/src/__tests__/components/TranslationNotice.test.jsx` (new):
  1. Renders notice by default
  2. Does not render when `admin_translation_notice_dismissed = '1'` in localStorage
  3. Dismiss button hides notice and sets localStorage key

Mirror the government test exactly (3 tests).

**Dependency:** None.

**Est. size:** Trivial (copy-paste + key change + 3 tests).

---

### U-10 — Page tests for pages not touched by U-1 through U-9

**Findings closed:** AD-014 (remainder)

**Context:** AD-014 cited 0 tests for 11 routed pages. U-1 adds AIWarnings tests. U-5 adds TherapyManagement tests. U-3 adds PasswordChangeRedirect tests. The remaining pages with 0 tests:

| Page | Risk level | Test priority |
|---|---|---|
| ReceptionManagement | HIGH — CRUD (create, delete with ConfirmDialog, doc approval) | Write tests |
| DocumentApprovalQueue | MEDIUM — PUT approve/reject mutations | Write tests |
| Dashboard | MEDIUM — 5 API calls, allSettled pattern, U-2 adds some coverage | U-2 covers the fabrication bugs; remaining: loading state + stats render |
| ParentManagement | LOW — read-only list | Write at least a render test |
| TeacherManagement | LOW — read-only list | Write at least a render test |
| GroupManagement | LOW — read-only list | Write at least a render test |
| SchoolRatings | LOW — read-only display | Write at least a render test |
| Profile | LOW — messages feature | Deferred — covered implicitly by Settings tests |

**Minimum required in S3:**  
- ReceptionManagement: render + create form + delete-with-confirm (3 tests minimum)
- DocumentApprovalQueue: render + approve action + reject action (3 tests minimum)

**Lower-priority pages (ParentManagement, TeacherManagement, GroupManagement, SchoolRatings):**  
Write render-only smoke tests (1 test each: renders loading skeleton, then renders data). These 4 pages are view-only with no mutations — a render test gives meaningful coverage.

**Dashboard:** U-2 adds 3 tests. Add 2 more in U-10: loading state, and stats card renders with real data from the API mock.

**Dependency:** U-2 (Dashboard tests should be added in the same file as U-2's tests — don't write Dashboard tests twice).

**Est. size:** Medium (9+ new tests across 5+ files).

---

## 2. The AI Warnings Bundle Rationale (canonical reference)

**AD-001 + AD-002 + AD-009 + AD-013 are one unit. Do not split them across commits.**

The failure mode if split:

```
Commit A: fix AD-001/013 (URL corrected → data flows for the first time)
  → Dashboard now calls GET /ai-warnings correctly
  → aiData = [{ title: "...", resolvedAt: null, ... }]
  → Dashboard filter: !w.isResolved = !undefined = true  ← accidentally looks right
  → But: resolved warning has resolvedAt: "2026-05..." and isResolved: undefined
  → !undefined = true → resolved warning counted as unresolved ← WRONG

Commit B: fix AD-009 (field standardized to resolvedAt)
  → Now correct
```

Between Commit A and Commit B, the Dashboard shows resolved warnings as unresolved. Any commit that fixes the URL without fixing the field is producing a wrong-but-not-visibly-broken state. The revert-test in U-1 must prove both fields are correct simultaneously.

---

## 3. Deferred to Feature Phase (not cleanup)

These findings are **not bugs** — they are missing features with working backend endpoints. They belong in S6 (Plan Features) / S7 (Implement Features), not S3 (Execute Cleanup).

| Finding | What | Why deferred |
|---|---|---|
| AD-018 (CP-011) | Bulk import UI (validate + progress polling) | New UI feature, not a bug fix |
| AD-018 (CP-012) | Parent suspend/activate buttons in ParentManagement | New UI feature |
| AD-018 (CP-016) | Restore UI for soft-deleted entities | New UI feature |
| CP-020 | Two-direction school rating system overhaul | Cross-portal spec, not ready for admin loop |

**Note:** The SchoolRatings page currently works for viewing existing parent ratings. The fabrication removal in U-2 (hardcoded fallbacks) is cleanup. The two-direction rating overhaul (CP-020) that would add government rating submission is a feature — it is NOT part of cleanup and is NOT planned here.

---

## 4. Finding Coverage Verification

All 18 S1 findings accounted for:

| Finding | Unit | Status |
|---|---|---|
| AD-001 | U-1 | Cleanup |
| AD-002 | U-1 | Cleanup |
| AD-003 | U-4 | Cleanup |
| AD-004 | U-3 | Cleanup |
| AD-005 | U-3 | Cleanup |
| AD-006 | U-5 | Cleanup |
| AD-007 | U-2 | Cleanup |
| AD-008 | U-2 | Cleanup |
| AD-009 | U-1 | Cleanup (must bundle with URL fix) |
| AD-010 | U-7 | Cleanup |
| AD-011 | U-7 | Cleanup |
| AD-012 | U-8 | Cleanup |
| AD-013 | U-1 | Cleanup (must bundle with URL fix) |
| AD-014 | U-1 + U-3 + U-5 + U-10 | Cleanup (distributed across units + remainder in U-10) |
| AD-015 | U-9 | Cleanup |
| AD-016 | U-6 | Cleanup |
| AD-017 | U-7 | Cleanup |
| AD-018 | — | **Deferred to feature phase** (CP-011, CP-012, CP-016) |

✅ All 18 findings accounted for. 17 in cleanup units, 1 deferred.

---

## 5. Commit Map for S3

Each unit ships as one commit (or two if the code + tests are cleanly separable). Suggested commit messages:

| Unit | Suggested commit |
|---|---|
| U-1 | `fix(admin): AIWarnings URL + method + field — safeguarding surface restored` |
| U-2 | `fix(admin): Dashboard — replace MOCK_ACTIVITY with audit-log feed; remove fabricated ratings/capacity` |
| U-3 | `feat(admin): CP-023 forced-password-change gate — Login + ProtectedRoute + ChangePassword page` |
| U-4 | `chore(admin): remove UsersStats — business-portal page misplaced in admin` |
| U-5 | `feat(admin): wire TherapyManagement — route, sidebar nav, i18n pass, ConfirmDialog, tests` |
| U-6 | `fix(admin): 403 error handling — SCHOOL_ARCHIVED specific message + PASSWORD_CHANGE_REQUIRED redirect` |
| U-7 | `fix(admin): i18n sidebar labels + nav gaps + fallbackLng en` |
| U-8 | `chore(admin): remove express from prod dependencies` |
| U-9 | `feat(admin): CP-019 translation notice banner + tests` |
| U-10 | `test(admin): page-level tests — Reception, Documents, lower-priority pages` |
