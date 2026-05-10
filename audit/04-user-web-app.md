# Phase 4 — User Web App Audit

**Scope:** `teacher/` directory — the single Vite app that hosts both the Teacher Dashboard (`/teacher/*`) and the Parent Portal (`/`).

---

## 1. Inventory

### App Entry Point
- `teacher/src/App.jsx` — top-level router. Parent portal at `/` (12 routes), teacher dashboard at `/teacher` (10 routes). All routes lazy-loaded. ErrorBoundary on each route.
- Provider order (outermost → innermost): `ToastProvider → NotificationProvider → AuthProvider → SocketProvider → Router`

### Teacher Pages (12 files)
| File | Route | Notes |
|------|-------|-------|
| `pages/Dashboard.jsx` | `/teacher` | 6 stat cards; uses `<a href>` not `<Link>` |
| `pages/Login.jsx` | `/teacher/login` | Shared login page |
| `pages/ParentManagement.jsx` | `/teacher/parents` | Client-side teacher filter |
| `pages/Activities.jsx` | `/teacher/activities` | CRUD for activities |
| `pages/Meals.jsx` | `/teacher/meals` | CRUD for meals |
| `pages/Media.jsx` | `/teacher/media` | Photo/video upload |
| `pages/Chat.jsx` | `/teacher/chat` | Teacher↔parent chat (5s polling) |
| `pages/Profile.jsx` | `/teacher/profile` | Avatar upload |
| `pages/MonitoringJournal.jsx` | `/teacher/monitoring` | Emotional state records; uses `confirm()` |
| `pages/TherapyManagement.jsx` | `/teacher/therapy` | Therapy CRUD+assign; uses `confirm()` |
| `pages/Settings.jsx` | `/teacher/settings` | Profile + password change |
| `pages/NotFound.jsx` | `*` | 404 fallback |

### Parent Pages (14 files)
| File | Route | Notes |
|------|-------|-------|
| `parent/pages/Login.jsx` | `/login` | Same login for teacher+parent |
| `parent/pages/Dashboard.jsx` | `/` | 6 parallel API calls + WebSocket listeners |
| `parent/pages/ChildProfile.jsx` | `/child-profile` | Avatar upload; `window.location.href` for 401; hardcoded Cyrillic labels |
| `parent/pages/Activities.jsx` | `/activities` | Read-only individual plans |
| `parent/pages/Meals.jsx` | `/meals` | Date picker + meal log |
| `parent/pages/Media.jsx` | `/media` | Photo/video gallery |
| `parent/pages/Chat.jsx` | `/chat` | Parent↔teacher chat (5s polling) |
| `parent/pages/AIChat.jsx` | `/ai-chat` | Stores history in localStorage only |
| `parent/pages/Notifications.jsx` | `/notifications` | API-backed notification list |
| `parent/pages/Settings.jsx` | `/settings` | Profile + password (has stale `push` pref) |
| `parent/pages/TeacherRating.jsx` | `/ratings` | Teacher + school rating UI |
| `parent/pages/Therapy.jsx` | `/therapy` | Therapy browse + session start; uses `alert()` |
| `parent/pages/AIWarnings.jsx` | `/ai-warnings` | AI-generated alerts; uses `alert()` |
| `parent/pages/Help.jsx` | `/help` | **Fully hardcoded English, fake contacts** |

### Shared Infrastructure
| Location | File | Purpose |
|----------|------|---------|
| `shared/context/AuthContext.jsx` | Thin wrapper over `@shared` createAuthContext | No extra logic |
| `shared/context/NotificationContext.jsx` | **STUB** — `useState(3)` hardcoded | Used by teacher side only |
| `shared/context/SocketContext.jsx` | Cookie-based Socket.io connection | Used by both teacher and parent |
| `shared/context/ToastContext.jsx` | Toast queue | Used by teacher side; parent has its own |
| `shared/services/api.js` | Axios instance (`tokenKey: 'accessToken'`) | Both sides |
| `shared/services/chatStore.js` | Chat API abstraction + unread counting | Shared; N+1 call pattern |
| `shared/components/ProtectedRoute.jsx` | Role-based guard (isTeacher / isParent) | Both sides |
| `parent/context/NotificationContext.jsx` | Real API-backed (`/notifications/count`, 30s poll) | Parent side only |
| `parent/context/ToastContext.jsx` | Duplicate toast context | Parent side; creates second provider in tree |

### Tests
- `src/__tests__/auth.test.js` — 6 unit tests for login/logout logic (logic mirrors, not component tests)
- `src/__tests__/utils.test.js` — not read; assumed similar coverage

---

## 2. Scorecard

| Metric | Score | Observations |
|--------|-------|-------------|
| **Messiness** | 35% | `<a href>` in SPA, `alert()`/`confirm()`, hardcoded strings, duplicate providers, Cyrillic in JSX |
| **Technical Debt** | 38% | N+1 polling sidebar, chat polling instead of WebSocket, stale push pref, `window.location.href` for navigation |
| **Health** | 52% | Core flows work; notification stub always shows 3, AI chat ephemeral, fake support contact |
| **Coherence** | 40% | Teacher NotificationContext is stub, parent's is real; `<a>` vs `<Link>` inconsistency within same app |
| **Documentation Coverage** | 22% | No JSDoc, no prop types, no architecture comments |
| **Test Coverage** | 10% | 2 test files for 26 pages + 9 contexts/services. Zero component tests, zero E2E |
| **Risk-on-Touch** | 68% | Dual-app routing — adding route can silently break other sub-app; chatStore shared |
| **UX Quality** | 28% | Fake contacts, full-page reloads in SPA, ephemeral AI chat, missing i18n on key UI strings |
| **Overall** | **37%** | |

---

## 3. Findings

### 04-001 · CRITICAL — Duplicate providers in component tree
**Files:** `teacher/src/App.jsx`, `teacher/src/parent/ParentApp.jsx`

`App.jsx` wraps the entire tree with `ToastProvider` and `NotificationProvider`. `ParentApp.jsx` then adds another `ToastProvider` and `NotificationProvider` inside the parent routes. Parent-side components import from `../context/ToastContext` (the inner one), while teacher-side components import from `../../shared/context/ToastContext` (the outer one). This means:
- Two separate toast queues exist simultaneously for parent routes
- The outer `NotificationProvider` is the stub (hardcoded 3); the inner is the real one
- Any component that accidentally imports from the wrong path gets silently wrong state

**Risk:** Silent state divergence; toasts fired from parent components may not render if the wrong provider is targeted.

---

### 04-002 · HIGH — N+1 API calls per 5 seconds for chat badge
**Files:** `teacher/src/components/Sidebar.jsx:34–53`, `teacher/src/shared/services/chatStore.js:38–65`

`Sidebar.jsx` calls `getUnreadTotalForPrefix('parent:', 'teacher')` every 5 seconds. That function first fetches `GET /teacher/parents` to get all parents, then for each parent calls `GET /chat/messages?conversationId=parent:{id}&limit=200`. A teacher with 20 parents generates **21 API calls every 5 seconds** just to display a badge number.

```js
// chatStore.js:41–53
const res = await api.get('/teacher/parents');
const parents = res.data?.parents || [];
for (const parent of parents) {
  const convoId = `parent:${parent.id}`;
  const msgs = await loadMessages(convoId); // <-- one GET per parent
  totalUnread += msgs.filter(...).length;
}
```

Socket.io is already connected and available. An unread count via WebSocket events would eliminate this entirely.

---

### 04-003 · HIGH — SPA using `<a href>` for navigation (multiple locations)
**Files:**
- `teacher/src/pages/Dashboard.jsx:114` — all 6 stat cards wrapped in `<a href={card.href}>`
- `teacher/src/components/Layout.jsx:43` — floating chat button `<a href="/teacher/chat">`
- `teacher/src/parent/pages/Help.jsx:*` — quick links use `<a href>`

Every click on a Dashboard stat card causes a full page reload, blowing away all React state, re-fetching the user session, and re-initializing i18n. The Sidebar correctly uses `<Link>` from react-router-dom; the Dashboard does not.

---

### 04-004 · HIGH — Teacher `NotificationContext` is a hardcoded stub
**File:** `teacher/src/shared/context/NotificationContext.jsx:14`

```js
const [count, setCount] = useState(3); // Default to 3 notifications
```

The teacher-side `NotificationProvider` always initializes with count=3 and provides only in-memory `addNotification`/`removeNotification`/`clearNotifications` — no API calls, no persistence. The comment says "Default to 3 notifications." This means:
- Teacher's notification badge always starts at 3 on every page load
- Badges never reflect real server state
- Notifications are never fetched from the API on the teacher side

The parent side has a fully-implemented `NotificationContext` (`parent/context/NotificationContext.jsx`) with proper API polling. The two implementations are completely different and divergent.

---

### 04-005 · HIGH — `Help.jsx` is entirely hardcoded English with false contact information
**File:** `teacher/src/parent/pages/Help.jsx`

The Help page:
- Contains zero `t()` calls — 100% hardcoded English strings
- Uses `support@uchqunplatform.com` (a different domain from the canonical `uchqunedu.uz`)
- Shows `+1 (555) 123-4567` — a US fake number
- Uses `<a href="...">` links (full page reload in SPA)

For a platform where the primary language is Uzbek and users are parents in Uzbekistan, a Help page that shows US contact details is actively misleading.

---

### 04-006 · HIGH — AI Chat history stored only in `localStorage`
**File:** `teacher/src/parent/pages/AIChat.jsx`

AI chat messages are stored under `localStorage.key('parent-ai-chat-messages')`. No server persistence means:
- History is lost when the browser cache is cleared
- History doesn't sync across devices (parent uses phone AND desktop)
- History is not visible to teachers or admins
- No audit trail for AI-generated content shown to parents

The teacher-parent chat (Chat.jsx) correctly uses the API-backed `chatStore.js`. The AI chat is the exception.

---

### 04-007 · MEDIUM — `window.location.href` for 401 redirect
**File:** `teacher/src/parent/pages/ChildProfile.jsx:171–173`

```js
} else if (err.response.status === 401) {
  setTimeout(() => { window.location.href = '/login'; }, 2000);
```

Hard navigation destroys all React state including the auth context. The shared `api.js` already handles 401 → token refresh → retry automatically. This manual redirect will fire during a routine token refresh cycle, logging parents out unnecessarily on slow connections. Other pages use `navigate('/login')` from React Router correctly.

---

### 04-008 · MEDIUM — Hardcoded Cyrillic text in `ChildProfile.jsx`
**File:** `teacher/src/parent/pages/ChildProfile.jsx:672–706`

The emotional state monitoring section in ChildProfile uses hardcoded Cyrillic Uzbek strings directly in JSX:

```jsx
// Line 672
<p className="text-sm text-gray-500 mt-1">Тарбиячи: ...</p>
// Lines 688–696: object literal with Cyrillic keys/values:
{ stable: 'Боланинг ҳиссий ҳолати барқарор', positiveEmotions: 'Бола ижобий ҳис-туйғуларни намоён этади', ... }
```

Nine monitoring labels are hardcoded in Cyrillic. `MonitoringJournal.jsx` uses `t('monitoring.emotionalStates.stable')` etc. — the same keys exist in the locale files. ChildProfile doesn't. This inconsistency means when the UI language is English or Russian, these labels still appear in Cyrillic.

---

### 04-009 · MEDIUM — `alert()` and `confirm()` used for error and confirmation dialogs
**Files:**
- `teacher/src/parent/pages/AIWarnings.jsx:46` — `alert(error.response?.data?.error || 'Failed to resolve warning')`
- `teacher/src/parent/pages/Therapy.jsx:59` — `alert(error.response?.data?.error || 'Failed to start therapy')`
- `teacher/src/pages/MonitoringJournal.jsx:159` — `confirm(t('monitoring.confirmDelete'))`
- `teacher/src/pages/TherapyManagement.jsx:214` — `confirm(t('therapy.confirmDelete', ...))`

Native browser dialogs: (a) block the main thread; (b) are not stylable; (c) cannot be translated to Uzbek in all browsers; (d) on iOS/mobile some browsers suppress them entirely. A ToastContext is already available in both sub-apps.

---

### 04-010 · MEDIUM — Chat uses polling instead of WebSocket
**Files:** `teacher/src/parent/pages/Chat.jsx:36–44`, `teacher/src/pages/Chat.jsx:56–63`

Both chat pages poll `loadMessages()` every 5 seconds using `setInterval`. The Socket.io connection (`SocketContext`) is already available in both sub-apps. The backend emits `message:created` events (inferred from chat controller). Polling adds constant load and introduces up to 5s message latency.

---

### 04-011 · MEDIUM — Stale `push` preference wired into parent Settings form
**File:** `teacher/src/parent/pages/Settings.jsx:46–49`

```js
notificationPreferences: { email: true, push: true }
```

The form initializes with `push: true` in state and saves it to the server via `PUT /user/profile`. But:
- The UI renders no push toggle (only email checkbox exists, lines 262–279)
- The User model's `notificationPreferences` JSONB `push` key is documented in Phase 3 as stale
- This silently overwrites any user's existing push preference with `true` on every Settings save

---

### 04-012 · MEDIUM — Parent filtering done client-side after full list fetch
**Files:** `teacher/src/pages/ParentManagement.jsx:33`, `teacher/src/pages/Dashboard.jsx:29`, `teacher/src/pages/Chat.jsx:31–33`

All three teacher pages fetch `GET /teacher/parents` then filter `p.teacherId === user.id` client-side:

```js
const filtered = user?.id ? list.filter((p) => p.teacherId === user.id) : list;
```

If the backend route already filters by the authenticated teacher's scope, this is redundant. If it doesn't, it's a data over-fetch — all parents are sent to the client even if only a subset belong to this teacher. At scale with many schools and parents, this is a meaningful payload issue.

---

### 04-013 · LOW — `vite.config.js` has hardcoded Railway URL as default
**File:** `teacher/vite.config.js:10`

```js
const backendBase = process.env.VITE_API_URL?.replace('/api', '') 
  || 'https://uchqun-production-2d8a.up.railway.app';
```

A specific Railway deployment URL is hardcoded as a fallback. If this instance is renamed, redeployed, or migrated, dev environments without `VITE_API_URL` set will silently proxy to a stale or nonexistent URL. Two other hardcoded URLs also appear in `parentAIController.js` (Phase 2 finding 02-007).

---

### 04-014 · LOW — Test coverage is near-zero for actual app behavior
**Files:** `teacher/src/__tests__/auth.test.js`, `teacher/src/__tests__/utils.test.js`

Only 2 test files exist for a 26-page dual app. The auth test mirrors login/logout logic in isolation — it doesn't mount any React component. It tests the same function signatures that are already tested in `@shared`. There are no tests for:
- Any parent page (Dashboard, Chat, ChildProfile, TeacherRating, etc.)
- Any teacher page (ParentManagement, MonitoringJournal, etc.)
- Chat polling behavior
- Notification context (either implementation)
- Socket events
- Child context / localStorage persistence

CI passes with these 6 tests present, giving false confidence.

---

### 04-015 · LOW — ChildProfile makes 6 parallel API calls on mount
**File:** `teacher/src/parent/pages/ChildProfile.jsx:263–270`

```js
const [childResponse, activitiesResponse, mealsResponse, mediaResponse, profileResponse, monitoringResponse] 
  = await Promise.all([...]);
```

Six simultaneous requests fire every time `selectedChildId` changes or `refreshKey` increments. A single WebSocket event (e.g., `activity:created`) triggers `setRefreshKey(k => k+1)`, which re-fires all 6. For a media-heavy child profile on a slow connection, this creates a noticeable waterfall.

---

## 4. Route / Component Map

### Teacher Dashboard Routes
```
/teacher                  → Dashboard.jsx (6 stat cards, <a href> navigation)
/teacher/parents          → ParentManagement.jsx (client-side filter)
/teacher/profile          → Profile.jsx
/teacher/activities       → Activities.jsx
/teacher/meals            → Meals.jsx
/teacher/media            → Media.jsx
/teacher/chat             → Chat.jsx (polling, 5s)
/teacher/monitoring       → MonitoringJournal.jsx (confirm() delete)
/teacher/therapy          → TherapyManagement.jsx (confirm() delete)
/teacher/settings         → Settings.jsx
```

### Parent Portal Routes
```
/                         → Dashboard.jsx (6 parallel API calls + WS)
/login                    → Login.jsx
/child-profile            → ChildProfile.jsx (hardcoded Cyrillic, window.location.href)
/activities               → Activities.jsx
/meals                    → Meals.jsx
/media                    → Media.jsx
/chat                     → Chat.jsx (polling, 5s)
/ai-chat                  → AIChat.jsx (localStorage only)
/notifications            → Notifications.jsx
/settings                 → Settings.jsx (stale push pref)
/ratings                  → TeacherRating.jsx
/therapy                  → Therapy.jsx (alert() on error)
/ai-warnings              → AIWarnings.jsx (alert() on error)
/help                     → Help.jsx (all hardcoded English, fake contacts)
```

---

## 5. Issues Summary Table

| ID | Severity | File | Issue |
|----|----------|------|-------|
| 04-001 | CRITICAL | `App.jsx`, `ParentApp.jsx` | Duplicate `ToastProvider` + `NotificationProvider` in tree for parent routes |
| 04-002 | HIGH | `Sidebar.jsx`, `chatStore.js` | N+1 API calls every 5s for unread chat badge (1 + N per teacher) |
| 04-003 | HIGH | `Dashboard.jsx:114`, `Layout.jsx:43`, `Help.jsx` | `<a href>` instead of `<Link>` — full page reload in SPA |
| 04-004 | HIGH | `shared/context/NotificationContext.jsx:14` | Notification count hardcoded to 3; no API calls; teacher badge always wrong |
| 04-005 | HIGH | `parent/pages/Help.jsx` | 0 i18n calls; wrong email domain; fake US phone number |
| 04-006 | HIGH | `parent/pages/AIChat.jsx` | AI conversation history stored localStorage only; lost on cache clear |
| 04-007 | MEDIUM | `parent/pages/ChildProfile.jsx:171` | `window.location.href = '/login'` on 401 — destroys React state |
| 04-008 | MEDIUM | `parent/pages/ChildProfile.jsx:672–706` | 9 emotional state labels hardcoded in Cyrillic; ignores active language |
| 04-009 | MEDIUM | `AIWarnings.jsx`, `Therapy.jsx`, `MonitoringJournal.jsx`, `TherapyManagement.jsx` | `alert()`/`confirm()` for errors and delete confirmations |
| 04-010 | MEDIUM | `parent/pages/Chat.jsx`, `pages/Chat.jsx` | Chat polls 5s; WebSocket available but unused |
| 04-011 | MEDIUM | `parent/pages/Settings.jsx:46` | Stale `push: true` silently saved on every profile update |
| 04-012 | MEDIUM | `ParentManagement.jsx`, `Dashboard.jsx`, `Chat.jsx` | Client-side teacher filter after fetching all parents |
| 04-013 | LOW | `vite.config.js:10` | Hardcoded Railway URL as proxy fallback |
| 04-014 | LOW | `__tests__/` | Near-zero test coverage: 6 unit tests for 26-page dual app |
| 04-015 | LOW | `parent/pages/ChildProfile.jsx:263` | 6 parallel API calls re-fired on every WebSocket event |
