# Uchqun — Navigation & Code Quality Audit
**Date:** 2026-05-15 | **Scope:** All 5 portals + shared library

---

## Were the apps built incorrectly?

**Honest answer: partially.** The apps work and ship real features, which is a genuine accomplishment for a first project. The routing architecture, auth flow, i18n, and component decomposition show real understanding. But several patterns that feel natural to beginners cause compounding problems in production — slow navigation, memory leaks, data races, stale UI. None of these are catastrophic, but they will get worse as the app grows. The list below documents every instance with exact file references so they can be fixed systematically.

**Awkwardness scale used throughout this document:**
- **90–100 %** — Causes production bugs or security holes right now
- **70–89 %** — Causes visible UX problems or data incorrectness
- **50–69 %** — Grows into a serious problem as the codebase scales
- **30–49 %** — Violates best practice; fine short-term but adds maintenance burden
- **10–29 %** — Style or preference issue, low impact

---

## Part 1 — Navigation Smoothness

### Root causes by portal

| Portal | Primary friction | Secondary friction |
|--------|------------------|--------------------|
| Admin | No data caching — every nav = fresh API call | Skeleton loaders on every visit back |
| Government | No data caching + no page transitions | Dashboard fires 3 parallel calls on every visit |
| Reception | No data caching | ParentManagement fires 3 calls on mount |
| Teacher | Sidebar polls `/chat/unread-count` every 30 s → re-renders Layout mid-navigation | N+1 API calls in Dashboard (30+ calls if 10 children) |
| Parent | No data caching | Double `loadParents()` call in Activities |

### What "no caching" looks like in practice

Every page component does this:
```jsx
useEffect(() => {
  fetchData(); // fires on every single mount
}, []);
```

There is zero caching of any kind in the entire frontend. Navigate from Dashboard → Parents → Dashboard and the Dashboard re-fetches everything from scratch, shows skeletons, and re-animates. A user clicking around quickly sees loading states on every single page including ones they visited two seconds ago.

### Teacher sidebar polling — the main jank cause

`teacher/src/components/Sidebar.jsx` line 43:
```jsx
intervalId = setInterval(loadUnread, 30000);
```

This fires every 30 seconds regardless of what the user is doing. When the interval fires at the exact moment a user clicks a nav link, the Sidebar re-renders mid-transition. The entire Layout subtree re-renders. The result is a visible flicker during navigation that does not happen in the other portals.

Socket.io is already configured (`SocketContext.jsx`) and the server emits chat events. The poll is completely unnecessary.

### Teacher Dashboard N+1 calls — the worst load time

`teacher/src/pages/Dashboard.jsx` lines 32–51:
```jsx
const fetchCount = async (path, key) => {
  const requests = childIds.map((id) =>
    api.get(`${path}?childId=${id}`).catch(() => ({ data: [] }))
  );
  const responses = await Promise.all(requests);
  // ...
};

await Promise.all([
  fetchCount('/activities', 'activities'), // N calls — one per child
  fetchCount('/meals', 'meals'),           // N calls
  fetchCount('/media', 'media'),           // N calls
]);
```

A teacher with 10 children fires **30 API calls** to load their dashboard. With 20 children it is 60 calls. This is not a nuisance — it is a correctness problem that will be unacceptable at real scale.

---

## Part 2 — Code Quality Issues (Full Inventory)

### Issue 1 — N+1 API calls
**Awkwardness: 88 %**

Making one API call per item in a list instead of one batch call. Classic first-project mistake — works fine with 2 items, falls over with 20.

| File | Line | Description |
|------|------|-------------|
| `teacher/src/pages/Dashboard.jsx` | 32–51 | `fetchCount()` called for every childId across 3 endpoints = N×3 calls |
| `teacher/src/pages/Activities.jsx` | 72–90 | `loadChildrenForParent()` re-fetches ALL parents just to get one parent's children |

---

### Issue 2 — Polling instead of WebSocket
**Awkwardness: 78 %**

`setInterval` calling an HTTP endpoint every 30 seconds when a working socket.io connection is already open and the server already emits the relevant events. The poll adds server load, has up to 30-second staleness, and causes mid-navigation re-renders in teacher sidebar.

| File | Line | Polling target |
|------|------|----------------|
| `teacher/src/components/Sidebar.jsx` | 43 | `/chat/unread-count` every 30 s |
| `teacher/src/parent/components/Sidebar.jsx` | 44 | `/chat/unread-count` every 30 s |
| `teacher/src/shared/context/NotificationContext.jsx` | 43 | `/notifications` every 30 s |
| `teacher/src/parent/context/NotificationContext.jsx` | 43 | `/notifications` every 30 s |
| `teacher/src/parent/pages/Chat.jsx` | 40 | message list every 30 s |

**Total: 5 polling loops that should be socket subscriptions.**

---

### Issue 3 — No data caching anywhere
**Awkwardness: 75 %**

Every page mounts and unconditionally fires API calls. There is no React Query, SWR, module-level cache, or any other mechanism to skip a fetch when data is already fresh. Navigating back to a page you visited 3 seconds ago shows loading skeletons again. In a real-world app with slow mobile connections this is the single biggest UX regression.

| Portal | Pages with uncached fetches |
|--------|-----------------------------|
| Admin | Dashboard, ParentManagement, TeacherManagement, GroupManagement, ReceptionManagement, TherapyManagement |
| Government | Dashboard, Schools, Ratings, Platform |
| Reception | Dashboard, ParentManagement, TeacherManagement, GroupManagement |
| Teacher | Dashboard, Activities, Meals, Media, Chat, MonitoringJournal, TherapyManagement |
| Parent | Dashboard, ChildProfile, Activities, Meals, Media, Notifications |

**Every data page in all 5 portals — zero exceptions.**

---

### Issue 4 — eslint-disable-next-line react-hooks/exhaustive-deps (26 instances)
**Awkwardness: 65 %**

Suppressing the exhaustive-deps lint rule is a code smell that says "I don't understand why this warning exists." In most of these cases the intent was correct (fetch on mount only) but the proper solution is to use `useCallback` with stable references, not to hide the warning. Left as-is, some of these will cause stale-closure bugs when the surrounding state changes.

**Full list:**

| File | Line |
|------|------|
| `shared/context/createAuthContext.jsx` | 42 |
| `admin/src/pages/Settings.jsx` | 62 |
| `admin/src/pages/ReceptionManagement.jsx` | 56 |
| `admin/src/pages/ParentManagement.jsx` | 38 |
| `admin/src/pages/GroupManagement.jsx` | 30 |
| `admin/src/pages/TeacherManagement.jsx` | 30 |
| `admin/src/pages/TherapyManagement.jsx` | 54 |
| `reception/src/pages/Settings.jsx` | 57 |
| `reception/src/pages/ParentManagement.jsx` | 41 |
| `reception/src/pages/GroupManagement.jsx` | 38 |
| `reception/src/pages/TeacherManagement.jsx` | 51 |
| `government/src/pages/Settings.jsx` | 44 |
| `teacher/src/pages/Settings.jsx` | 62 |
| `teacher/src/pages/Dashboard.jsx` | 71 |
| `teacher/src/pages/Activities.jsx` | 53 |
| `teacher/src/pages/Meals.jsx` | 76 |
| `teacher/src/pages/Media.jsx` | 53 |
| `teacher/src/pages/Chat.jsx` | 41 |
| `teacher/src/pages/MonitoringJournal.jsx` | 52 |
| `teacher/src/pages/TherapyManagement.jsx` | 50 |
| `teacher/src/parent/pages/Dashboard.jsx` | 73 |
| `teacher/src/parent/pages/ChildProfile.jsx` | 127 |
| `teacher/src/parent/pages/Notifications.jsx` | 40 |
| `teacher/src/parent/pages/Settings.jsx` | 61 |
| `teacher/src/parent/pages/AIWarnings.jsx` | 25 |
| `teacher/src/parent/pages/Therapy.jsx` | 33 |
| `teacher/src/parent/pages/TeacherRating.jsx` | 95 |

---

### Issue 5 — Missing AbortController (entire frontend)
**Awkwardness: 72 %**

Zero instances of `AbortController` or request cancellation across all ~60 data-fetching pages. When a user navigates away from a page while its API calls are in-flight, those calls complete and call `setState()` on an unmounted component — a memory leak. In a fast-clicking user session this accumulates.

```jsx
// Every page looks like this — no cleanup
useEffect(() => {
  const loadData = async () => {
    const res = await api.get('/teacher/parents'); // fires even after navigation
    setParents(res.data.parents);                  // setState on unmounted component
    setLoading(false);                             // same
  };
  loadData();
}, []);

// Should have:
useEffect(() => {
  const controller = new AbortController();
  const loadData = async () => {
    const res = await api.get('/teacher/parents', { signal: controller.signal });
    setParents(res.data.parents);
    setLoading(false);
  };
  loadData();
  return () => controller.abort(); // cancels in-flight request on unmount
}, []);
```

**Affects:** Every single data-fetching page across all 5 portals.

---

### Issue 6 — Duplicate API calls within one function
**Awkwardness: 70 %**

Calling the same endpoint twice in one user action, fetching data that is already available in local state.

| File | Lines | Description |
|------|-------|-------------|
| `teacher/src/pages/Activities.jsx` | 56–90 | `loadParents()` fetches `/teacher/parents`, then calls `loadChildrenForParent()` which **also fetches** `/teacher/parents` to extract one parent's children |
| `admin/src/pages/ReceptionManagement.jsx` | 102–158 | After approve/reject document, refetches both the document list AND the reception record separately when one call could return both |

---

### Issue 7 — Duplicate component implementations across portals
**Awkwardness: 60 %**

A `shared/` library exists and is partially adopted, but several components have been copy-pasted and modified per-portal. This means bug fixes must be applied in multiple places. It also means accessibility improvements made to `shared/` are not present in the copies.

| Component | Locations | Problem |
|-----------|-----------|---------|
| `Card.jsx` | `shared/`, `teacher/src/shared/`, `teacher/src/parent/`, `admin/` (re-export) | Parent Card missing `role="button"`, `tabIndex`, `onKeyDown` a11y props present in shared version |
| `LoadingSpinner.jsx` | `shared/`, `teacher/src/shared/`, `teacher/src/parent/`, `government/src/`, `admin/src/`, `reception/src/` | Copies missing `role="status"` and `aria-label` present in shared version |
| `Toast.jsx` | `shared/`, `teacher/src/shared/` | Identical duplication — teacher copy receives no upstream fixes |
| `ProfileForm.jsx` | `admin/src/pages/settings/`, `reception/src/pages/settings/`, `teacher/src/pages/settings/` | 3 near-identical implementations, ~85 lines each, differ only in translation keys |
| `PasswordForm.jsx` | Same 3 locations | Same duplication pattern |
| `NotificationPreferences.jsx` | Same 3 locations | Same duplication pattern |

---

### Issue 8 — God components (pages over 300 lines handling 4+ responsibilities)
**Awkwardness: 58 %**

The largest page components mix data fetching, local state management, business logic, form validation, and rendering into a single file. These become hard to reason about, hard to test, and hard to extend.

| File | Lines | Responsibilities crammed in |
|------|-------|-----------------------------|
| `admin/src/pages/ReceptionManagement.jsx` | 808 | CRUD, document approval, document rejection, search, filtering, 2 modal types |
| `admin/src/pages/TherapyManagement.jsx` | 546 | Therapy CRUD, child assignment, filtering, modal state |
| `teacher/src/pages/Meals.jsx` | 542 | Meal CRUD, date filtering, type selection, time picker, child selection |
| `admin/src/pages/AdminRegister.jsx` | 367 | Registration form, validation, file upload, error handling |
| `teacher/src/pages/MonitoringJournal.jsx` | 403 | Journal CRUD, filtering, double-click delete |
| `teacher/src/pages/Profile.jsx` | 386 | Profile display, message sending, emotion tracking, avatar upload |
| `teacher/src/pages/Chat.jsx` | 360 | Chat list, message sending, polling, sidebar state |

---

### Issue 9 — Inconsistent error handling
**Awkwardness: 55 %**

Three different error strategies co-exist with no consistent rule for which to use. Users sometimes see errors, sometimes see silently empty screens, sometimes see zeros in stats.

**Strategy A — Show to user (correct):**
```jsx
// teacher/src/pages/Activities.jsx line 157
} catch (error) {
  showError(error.response?.data?.error || t('activitiesPage.toastLoadError'));
}
```

**Strategy B — Silent void (wrong):**
```jsx
// teacher/src/pages/Dashboard.jsx line 65
} catch (error) { void error; } // user has no idea something failed
```

**Strategy C — Empty array fallback (hides failures):**
```jsx
// teacher/src/pages/Dashboard.jsx lines 28-51
api.get('/teacher/parents').catch(() => ({ data: { parents: [] } }))
// Statistics show 0 with no explanation when request failed
```

---

### Issue 10 — `key={index}` in dynamic lists
**Awkwardness: 52 %**

Using array index as React `key` in lists that can change order or length causes React to recycle the wrong DOM nodes. In the task form, this means adding/removing tasks breaks input focus and cursor position.

| File | Line | Risk |
|------|------|------|
| `teacher/src/parent/pages/Help.jsx` | 61 | Low — static FAQ list |
| `teacher/src/parent/pages/AIChat.jsx` | 104 | Medium — messages can update |
| `teacher/src/pages/activities/ActivityFormModal.jsx` | 159 | **High** — dynamic task list; user typing in a task loses focus when another task is added/removed |

---

### Issue 11 — Magic numbers repeated across files
**Awkwardness: 38 %**

Configuration values hardcoded as literals in multiple places. When you want to change the polling interval, you must hunt for every `30000` across the codebase.

| Value | Meaning | Occurrences |
|-------|---------|-------------|
| `30000` | Polling interval (ms) | `Sidebar.jsx` ×2, `NotificationContext.jsx` ×2, `Chat.jsx` ×1 = **5 files** |
| `5000` | Toast duration (ms) | `Toast.jsx` ×2 |
| `'localhost:5000'` | Dev API URL fallback | `vite.config.js` ×3, `SocketContext.jsx`, `AvatarUpload.jsx`, `Profile.jsx`, `Media.jsx`, `ChildProfile.jsx`, `mediaUtils.js` = **9 files** |

---

### Issue 12 — No page transition animations
**Awkwardness: 35 %**

All portals switch pages with an immediate hard cut. Combined with the loading skeletons this makes every navigation feel like a page reload rather than an in-app transition. Admin and reception have partial `animate-in fade-in` on some pages but not consistently on the content wrapper itself.

---

### Issue 13 — Inline style objects in JSX (recreated every render)
**Awkwardness: 28 %**

`style={{ ... }}` with multi-property objects in JSX body creates a new object reference on every render, causing unnecessary reconciliation.

| File | Line | Issue |
|------|------|-------|
| `teacher/src/pages/media/VideoPlayer.jsx` | 170–200 | 10-property inline style object in a component that re-renders on playback events |

---

### Issue 14 — Over-fetching (full list, slice in component)
**Awkwardness: 32 %**

Some dashboard sections fetch the complete collection and then `.slice(0, 5)` in the component instead of passing `?limit=5` to the API.

| File | Line | Behaviour |
|------|------|-----------|
| `admin/src/pages/Dashboard.jsx` | 206 | Fetches all receptions, renders `receptions.slice(0, 5)` |

*(Other dashboards correctly use `?limit=5` — this is an isolated case.)*

---

## Part 3 — Awkwardness Summary Table

| # | Issue | Awkwardness | Portals affected | Priority |
|---|-------|-------------|-----------------|----------|
| 1 | N+1 API calls | **88 %** | Teacher | P1 |
| 2 | Missing AbortController / memory leaks | **72 %** | All | P1 |
| 3 | Polling instead of WebSocket | **78 %** | Teacher | P1 |
| 4 | No data caching anywhere | **75 %** | All | P1 |
| 5 | Duplicate API calls in one function | **70 %** | Teacher, Admin | P2 |
| 6 | eslint-disable exhaustive-deps (26×) | **65 %** | All | P2 |
| 7 | Duplicate component implementations | **60 %** | All | P2 |
| 8 | God components (808-line pages) | **58 %** | Admin, Teacher | P2 |
| 9 | Inconsistent error handling | **55 %** | All | P2 |
| 10 | `key={index}` in dynamic lists | **52 %** | Teacher, Parent | P3 |
| 11 | No page transition animations | **35 %** | All | P3 |
| 12 | Magic numbers repeated across files | **38 %** | All | P3 |
| 13 | Over-fetching full lists to show 5 | **32 %** | Admin | P3 |
| 14 | Inline style objects in JSX | **28 %** | Teacher | P4 |

**Overall codebase quality score: ~62 / 100**
Functional and shippable, but carrying enough technical debt that each new feature takes longer than it should and subtle production bugs will increase over time if not addressed.

---

## Part 4 — Fix Plan (Navigation + Code Quality)

### Step 1 — Teacher: replace sidebar polling with socket (30 min)
**Fixes:** Issues 2 (polling), improves navigation smoothness in teacher portal immediately.

Files to change:
- `teacher/src/components/Sidebar.jsx` — replace `setInterval(loadUnread, 30000)` with `socket.on('chat:unread', ...)`
- `teacher/src/parent/components/Sidebar.jsx` — same
- `teacher/src/shared/context/NotificationContext.jsx` — replace interval with `socket.on('notification:new', ...)`
- `teacher/src/parent/context/NotificationContext.jsx` — same
- `teacher/src/parent/pages/Chat.jsx` — replace interval with socket listener

---

### Step 2 — All portals: add fade-in transition to Layout content wrapper (15 min/portal)
**Fixes:** Issue 11, makes every page navigation feel smooth regardless of loading state.

One-line change per portal — add `animate-in fade-in duration-150` to the `<main>` or content `<div>` in each Layout.jsx.

---

### Step 3 — Teacher: fix Dashboard N+1 calls (backend + frontend, 2 hrs)
**Fixes:** Issue 1, biggest single performance improvement.

Backend: add `GET /teacher/dashboard/counts` that returns `{ activitiesCount, mealsCount, mediaCount, ratingsCount, monitoringCount }` for all the teacher's children in one query.

Frontend: replace `fetchCount()` loop with single call to the new endpoint.

---

### Step 4 — All portals: add simple staleness cache to Dashboard and data pages (4 hrs/portal)
**Fixes:** Issue 3 (no caching).

Strategy: module-level cache map with 30-second TTL. No new library required.

```js
// shared/utils/dataCache.js
const cache = new Map();
export function getCached(key) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > 30_000) { cache.delete(key); return null; }
  return entry.data;
}
export function setCached(key, data) {
  cache.set(key, { data, ts: Date.now() });
}
```

Apply to: Dashboard, ParentManagement, TeacherManagement, GroupManagement pages across all portals.

Order: Admin → Reception → Government → Teacher → Parent.

---

### Step 5 — Add AbortController to all async pages (1 hr/portal)
**Fixes:** Issue 2 (memory leaks).

Systematic pass: wrap every `api.get()` in `useEffect` with an abort signal and return cleanup.

---

### Step 6 — Fix duplicate API calls
**Fixes:** Issue 5.

- `teacher/src/pages/Activities.jsx`: pass already-loaded `parents` array into `loadChildrenForParent(parentId, parents)` instead of re-fetching
- `admin/src/pages/ReceptionManagement.jsx`: after approve/reject, merge updated data from response instead of re-fetching

---

### Step 7 — Consolidate duplicate components into shared/
**Fixes:** Issue 6.

All portals already have path aliases (`@shared`). Replace portal-local `Card.jsx`, `LoadingSpinner.jsx`, `ProfileForm.jsx`, `PasswordForm.jsx`, `NotificationPreferences.jsx` with imports from `@shared/components/` and `@shared/pages/settings/`.

---

### Step 8 — Fix `key={index}` in dynamic lists
**Fixes:** Issue 9.

- `ActivityFormModal.jsx`: use `key={task.id}` or `key={index_stable_uuid}` for task items
- `AIChat.jsx`: use `key={message.id}` or `key={message.timestamp}`

---

### Step 9 — Fix eslint-disable-next-line (26 instances)
**Fixes:** Issue 4.

Systematic pass: for each suppressed instance, wrap the fetch function in `useCallback` with correct dependencies so the lint rule is genuinely satisfied.

---

### Step 10 — Break apart god components
**Fixes:** Issue 7.

Start with the worst offender: `ReceptionManagement.jsx` (808 lines). Extract:
- `useReceptionData.js` (custom hook for all API calls)
- `ReceptionForm.jsx` (create/edit modal)
- `DocumentViewer.jsx` (document approval UI)
- `ReceptionList.jsx` (list + search)

---

## Execution order summary

| Step | Portal | Est. effort | Visible impact |
|------|--------|-------------|----------------|
| 1 | Teacher | 30 min | Eliminates sidebar jank immediately |
| 2 | All | 1 hr | Every navigation feels smooth |
| 3 | Teacher | 2 hrs | Dashboard loads 10× faster |
| 4 | Admin | 3 hrs | No re-load on back-navigation |
| 4 | Reception | 3 hrs | Same |
| 4 | Government | 1 hr | Same |
| 4 | Teacher | 3 hrs | Same |
| 4 | Parent | 2 hrs | Same |
| 5 | All | 4 hrs | Eliminates memory leak warnings |
| 6 | Teacher, Admin | 1 hr | No duplicate fetches |
| 7 | All | 3 hrs | Consistent components, fewer bugs |
| 8 | Teacher, Parent | 30 min | Dynamic form inputs work correctly |
| 9 | All | 3 hrs | Lint clean, no stale closures |
| 10 | Admin, Teacher | 4 hrs | Maintainability |
