# Phase 4 v2 — Teacher/Parent Web App Verification
**Date:** 2026-05-09  
**Baseline:** `/audit/04-user-web-app.md` (2026-05-07)  
**Mode:** Read-only verification. No project files modified.

---

## Executive Summary

Of the 15 issues, **2 are verified-fixed**, **4 are partially-fixed**, and **9 are not-fixed**. The tracker addressed 4 items that overlap with this phase: `#04-002` (N+1 badge → unread-count endpoint), `#04-001` (Help page contacts), `M-13` (ConfirmDialog modal), and `M-22` (ChildProfile Cyrillic). Of these, `#04-002` is fully confirmed; `#04-001` is already counted as 01-003/04-005 verified-fixed; `M-13` did NOT fix the four files cited in 04-009 (it fixed other pages — Activities, Meals, Media — instead); `M-22` partially fixed 04-008 (emotional state labels extracted to i18n, but "Тарбиячи:" label still hardcoded Cyrillic at line 674).

**Special verification target §6.5 (Chat WebSocket migration):** Teacher `Chat.jsx` now subscribes to `chat:message` via Socket.io. Parent `Chat.jsx` still polls at 5s. **Partially-fixed.** Both `Sidebar.jsx` implementations (teacher and parent) now call `/chat/unread-count` — the N+1 badge pattern is gone. Backend `chat:message` emit was confirmed in Phase 2 (M-11 / 02-007 scope).

The nine unfixed issues span the full severity range and include the three structural problems that affect every authenticated parent session: the duplicate provider tree (04-001), the teacher notification stub (04-004), and `window.location.href` on 401 (04-007).

**Phase 4 v2 score: 44/100** (up from 37/100).

---

## Scope

Verification of all 15 issues from `/audit/04-user-web-app.md`. Special verification target §6.5 applied. All evidence from current code at HEAD.

---

## Per-Issue Verification Table

| Issue ID | Original Severity | Verdict | Evidence (file:line at HEAD) | Notes |
|----------|------------------|---------|------------------------------|-------|
| 04-001 | CRITICAL | **not-fixed** | `teacher/src/parent/ParentApp.jsx:3-4,12-13` | `ToastProvider` + `NotificationProvider` still nested inside `App.jsx`'s outer providers |
| 04-002 | HIGH | **verified-fixed** | `teacher/src/components/Sidebar.jsx:43`; `teacher/src/parent/components/Sidebar.jsx:66` | Both Sidebars now call `/chat/unread-count`; dead `getUnreadTotalForPrefix` remains in chatStore but unused |
| 04-003 | HIGH | **partially-fixed** | `teacher/src/pages/Dashboard.jsx:114`; `teacher/src/components/Layout.jsx:43` | Dashboard stat cards still `<a href>`; floating chat button still `<a href>`; Help.jsx quick links now use `<Link>` |
| 04-004 | HIGH | **not-fixed** | `teacher/src/shared/context/NotificationContext.jsx:14` | `useState(3)` unchanged; no API calls; teacher badge always wrong |
| 04-005 | HIGH | **verified-fixed** | `teacher/src/parent/pages/Help.jsx:19-82` | All strings via `t()`; email `t('help.emailValue')` = `support@uchqun.uz`; quick links use `<Link>`; fixed via `#04-001` |
| 04-006 | HIGH | **not-fixed** | `teacher/src/parent/pages/AIChat.jsx:15,45` | `localStorage.getItem/setItem` unchanged; no server persistence |
| 04-007 | MEDIUM | **not-fixed** | `teacher/src/parent/pages/ChildProfile.jsx:172` | `window.location.href = '/login'` in 401 handler unchanged |
| 04-008 | MEDIUM | **partially-fixed** | `ChildProfile.jsx:674`; `ChildProfile.jsx:691` | `t('child.emotionalCriteria.${key}')` now used for state labels (M-22); `Тарбиячи:` at line 674 still hardcoded Cyrillic |
| 04-009 | MEDIUM | **not-fixed** | `MonitoringJournal.jsx:159`; `TherapyManagement.jsx:214`; `AIWarnings.jsx:46`; `Therapy.jsx:59` | All four still use native `confirm()`/`alert()`; `ConfirmDialog` was added to Activities/Meals/Media instead |
| 04-010 | MEDIUM | **partially-fixed** | Teacher `Chat.jsx:72-73`; Parent `Chat.jsx:38` | Teacher chat: `on('chat:message')` WebSocket (fixed); Parent chat: `setInterval(load, 5000)` unchanged |
| 04-011 | MEDIUM | **not-fixed** | `teacher/src/parent/pages/Settings.jsx:46-49,67-69` | `push: true` in initial state and server-sent default; silently overwrites on every save |
| 04-012 | MEDIUM | **partially-fixed** | `teacher/src/pages/ParentManagement.jsx:33`; `teacher/src/pages/Dashboard.jsx:29` | `Chat.jsx` no longer client-filters; `ParentManagement.jsx` and `Dashboard.jsx` still filter `teacherId === user.id` |
| 04-013 | LOW | **not-fixed** | `teacher/vite.config.js:10` | Hardcoded Railway URL unchanged (also 01-004) |
| 04-014 | LOW | **partially-fixed** | `teacher/src/__tests__/` — 5 files | Up from 2 to 5 test files: `SidebarPolling.test.jsx`, `Help.test.jsx`, `AIWarnings.test.jsx` added; still sparse for 26-page app |
| 04-015 | LOW | **not-fixed** | `teacher/src/parent/pages/ChildProfile.jsx:263,40` | `Promise.all` with 6 items unchanged; `refreshKey` still re-fires all 6 on any WebSocket event |

**Verdict distribution: 2 verified-fixed · 4 partially-fixed · 9 not-fixed**

---

## Detailed Findings

### 04-001 — Duplicate providers (not-fixed)

`teacher/src/parent/ParentApp.jsx:3-4,12-13` (current):
```jsx
import { ToastProvider } from './context/ToastContext';
import { NotificationProvider } from './context/NotificationContext';
...
<ToastProvider>
  <NotificationProvider>
    ...
  </NotificationProvider>
</ToastProvider>
```

`App.jsx:49-50` (outer tree):
```jsx
<ToastProvider>
  <NotificationProvider>
    ...
    <ParentApp />  {/* ← renders second ToastProvider + NotificationProvider inside */}
```

Two independent `ToastProvider` + `NotificationProvider` instances in the tree for every parent route. The outer `NotificationProvider` is the teacher stub (`useState(3)`); the inner is the parent's real implementation (`parent/context/NotificationContext.jsx`). A parent component importing from `'../context/ToastContext'` gets the inner instance; one that drifts to `'../../shared/context/ToastContext'` gets the outer silent stub. Silent state divergence is still structurally possible.

---

### 04-002 — N+1 badge → /chat/unread-count (verified-fixed)

**Teacher Sidebar** (`teacher/src/components/Sidebar.jsx:43`):
```js
const UNREAD_POLL_MS = 30000; // 30s — lightweight endpoint, no N+1
...
const res = await api.get('/chat/unread-count', { params: { prefix: 'parent:', role: 'teacher' } });
```

**Parent Sidebar** (`teacher/src/parent/components/Sidebar.jsx:66`):
```js
const res = await api.get('/chat/unread-count', { params: { role: 'parent' } });
intervalId = setInterval(loadUnread, 30000); // 30s — lightweight endpoint
```

Both Sidebars now call the dedicated endpoint. Poll interval reduced from 5s to 30s. The N+1 function `getUnreadTotalForPrefix` still exists in `chatStore.js:38-65` but is no longer called from any Sidebar — it is now dead code. Confirmed by `SidebarPolling.test.jsx` which asserts Sidebar does not import `chatStore`. Fixed via tracker `#04-002`.

---

### 04-003 — `<a href>` in SPA (partially-fixed)

**Still broken:**

`teacher/src/pages/Dashboard.jsx:114`:
```jsx
<a href={card.href} className="flex items-center gap-4">
```
All 6 stat cards still use `<a href>` → full page reload on every click.

`teacher/src/components/Layout.jsx:43`:
```jsx
href="/teacher/chat"
```
Floating chat button still causes full page reload.

**Fixed:**

`teacher/src/parent/pages/Help.jsx:72-81`:
```jsx
<Link to="/activities" ...>
<Link to="/media" ...>
<Link to="/meals" ...>
<Link to="/settings" ...>
```
Quick links in Help.jsx now use `<Link>`. `mailto:` and `tel:` anchors are appropriate `<a href>` usage.

---

### 04-004 — NotificationContext stub (not-fixed)

`teacher/src/shared/context/NotificationContext.jsx:14`:
```js
const [count, setCount] = useState(3); // Default to 3 notifications
```

Unchanged. Teacher badge always initializes to 3. No API call on mount or poll. The parent's `NotificationContext.jsx` in `parent/context/` has real API polling — the two implementations remain completely divergent.

---

### 04-005 — Help.jsx fully localized (verified-fixed)

`teacher/src/parent/pages/Help.jsx` is now fully i18n-ized. All display strings use `t()`. Email resolves to `support@uchqun.uz`, phone to `t('help.phoneValue')`, FAQ items to `t('help.q1')` etc. Quick links use `<Link>`. The fake US phone number and wrong domain are gone. Confirmed via `Help.test.jsx`. Fixed via tracker `#04-001` (same as 01-003).

---

### 04-006 — AIChat localStorage (not-fixed)

`teacher/src/parent/pages/AIChat.jsx:15,45` (current):
```js
const saved = localStorage.getItem(STORAGE_KEY);
...
localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
```

No server-side persistence. History is lost on cache clear. No cross-device sync. No audit trail. Unchanged.

---

### 04-007 — `window.location.href` on 401 (not-fixed)

`teacher/src/parent/pages/ChildProfile.jsx:168-173` (current):
```js
} else if (err.response.status === 401) {
  errorMessage = 'Sessiya muddati tugagan. Iltimos, qayta kirib ko\'ring.';
  setTimeout(() => {
    window.location.href = '/login';
  }, 2000);
```

Still present — a hard navigation in the avatar upload error handler. The 401 triggered by a routine token refresh (Axios interceptor in `api.js` handles this transparently) will cause this handler to fire, logging the parent out unnecessarily. The correct logout flow at line 211 uses `navigate('/login')` after `logout()`. The inconsistency is unchanged.

---

### 04-008 — Cyrillic hardcoding in ChildProfile (partially-fixed)

**Fixed (M-22):** `ChildProfile.jsx:691`:
```jsx
<span>{t(`child.emotionalCriteria.${key}`)}</span>
```
The 9 emotional state labels (stable, positiveEmotions, etc.) are now resolved via i18n.

**Still broken:** `ChildProfile.jsx:674`:
```jsx
<p className="text-sm text-gray-500 mt-1">Тарбиячи: {record.teacher.firstName} {record.teacher.lastName}</p>
```
"Тарбиячи:" (= "Teacher:") is still hardcoded Cyrillic, appearing in all language modes including English and Russian. This label was not part of the `emotionalCriteria` key extraction.

---

### 04-009 — alert()/confirm() (not-fixed)

The tracker claimed M-13 fixed "window.confirm blocking dialogs in 6 pages." Verification shows `ConfirmDialog` was added to `Activities.jsx`, `Meals.jsx`, and `Media.jsx` — none of which appear in the original 04-009 findings. The four files cited in the audit remain unchanged:

| File | Line | Call |
|------|------|------|
| `parent/pages/AIWarnings.jsx` | 46 | `alert(error.response?.data?.error \|\| 'Failed to resolve warning')` |
| `parent/pages/Therapy.jsx` | 59 | `alert(error.response?.data?.error \|\| 'Failed to start therapy')` |
| `pages/MonitoringJournal.jsx` | 159 | `if (!confirm(t('monitoring.confirmDelete')))` |
| `pages/TherapyManagement.jsx` | 214 | `if (!confirm(t('therapy.confirmDelete', ...)))` |

All four block the main thread; the confirm() calls in particular are suppressed on some mobile browsers.

---

### 04-010 — Chat polling vs WebSocket (partially-fixed — §6.5)

**Teacher Chat** (`teacher/src/pages/Chat.jsx:60-73`) — **verified-fixed:**
```js
const { on, off } = useSocket();
...
const handleMessage = async (msg) => {
  if (msg.conversationId !== convoId) return;
  setMessages((prev) => prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]);
  await markRead(convoId);
};
on('chat:message', handleMessage);
return () => off('chat:message', handleMessage);
```
Initial load via `loadMessages()`, then real-time updates via `chat:message` Socket.io event. No polling interval. Fixed via M-11.

**Parent Chat** (`teacher/src/parent/pages/Chat.jsx:38`) — **not-fixed:**
```js
intervalId = setInterval(load, 5000);
```
Still polls every 5 seconds. `useSocket()` is available in ParentApp context but is not imported or used in `parent/pages/Chat.jsx`.

**Sidebar badge (both)** — **verified-fixed:** Both teacher and parent Sidebars call `/chat/unread-count` at 30s intervals (04-002 scope).

---

### 04-011 — Stale `push` preference (not-fixed)

`teacher/src/parent/pages/Settings.jsx:46-49`:
```js
notificationPreferences: {
  email: true,
  push: true,
}
```
`Settings.jsx:67-69`:
```js
notificationPreferences: profileForm.notificationPreferences || { email: true, push: true }
```

The `push: true` value is saved to the server on every profile update via `PUT /user/profile`. No push toggle is rendered in the UI (only email checkbox, line 265). The User model default still includes `push: true` (03-006 — not-fixed in Phase 3). Every settings save silently coerces the user's push preference to true.

---

### 04-012 — Client-side teacher filter (partially-fixed)

**Still broken:**

`teacher/src/pages/ParentManagement.jsx:33`:
```js
const filtered = user?.id ? list.filter((p) => p.teacherId === user.id) : list;
```

`teacher/src/pages/Dashboard.jsx:29`:
```js
const parents = user?.id ? allParents.filter((p) => p.teacherId === user.id) : allParents;
```

**Fixed:** `teacher/src/pages/Chat.jsx` — no `teacherId` filter present at HEAD; parents list is used directly from API response.

---

### 04-014 — Test coverage (partially-fixed)

Test files at HEAD: **5** (up from 2)

| File | Purpose | Status |
|------|---------|--------|
| `__tests__/auth.test.js` | Login/logout logic | Pre-existing |
| `__tests__/utils.test.js` | Utility functions | Pre-existing |
| `__tests__/pages/SidebarPolling.test.jsx` | Verifies Sidebar uses `/chat/unread-count` (04-002) | NEW |
| `__tests__/pages/Help.test.jsx` | Help page i18n assertions | NEW |
| `__tests__/pages/AIWarnings.test.jsx` | AIWarnings page | NEW |

Improvement from 2 to 5 test files. Still no tests for: parent Dashboard, ChildProfile, Chat (parent or teacher), TeacherRating, NotificationContext behavior, duplicate provider interaction, or any of the 9 confirm/alert issues. 26-page app with 5 test files remains severely under-covered.

---

### §6.5 Special Verification — Chat WebSocket Migration

**Summary:**

| Component | Original | Current | Status |
|-----------|----------|---------|--------|
| Teacher `Chat.jsx` | 5s `setInterval` | `on('chat:message')` WebSocket | **Fixed** |
| Parent `Chat.jsx` | 5s `setInterval` | 5s `setInterval` (unchanged) | **Not fixed** |
| Teacher `Sidebar.jsx` badge | N+1 per 5s | `/chat/unread-count` per 30s | **Fixed** |
| Parent `Sidebar.jsx` badge | N+1 per 5s | `/chat/unread-count` per 30s | **Fixed** |
| Backend `chat:message` emit | Absent | Present (`chatController.js`, M-11) | **Fixed** |

The backend emit and teacher frontend are correctly wired. Parent chat remains on polling. The M-11 work was done on the backend and teacher side only; the parent side was not updated.

---

## Metrics Scorecard

| Metric | Original v1 Score | v2 Score | Delta | Drivers |
|--------|------------------|----------|-------|---------|
| Messiness | 35% | 40% | +5 | (1) Help.jsx fully clean (all `t()`, real contacts, `<Link>`); (2) Dashboard stat cards + Layout chat button still `<a href>`; (3) `alert()`/`confirm()` in 4 files unchanged |
| Technical Debt | 38% | 42% | +4 | (1) N+1 badge eliminated from both Sidebars; (2) Parent chat still 5s polling; (3) Push pref stale; (4) AI chat localStorage |
| Health | 52% | 58% | +6 | (1) Help page real contacts eliminate active user misguidance; (2) Teacher chat real-time via WebSocket; (3) Teacher notification badge still always 3 |
| Coherence | 40% | 39% | −1 | (1) Teacher vs parent Chat now diverged (WebSocket vs polling) — new inconsistency; (2) Help.jsx improved; (3) Duplicate providers unchanged |
| Documentation Coverage | 22% | 22% | 0 | No new JSDoc, prop types, or architecture comments |
| Test Coverage | 10% | 15% | +5 | (1) 3 new test files; (2) SidebarPolling confirms 04-002 fix at test level; (3) Still no component tests for any page |
| Risk-on-Touch | 68% | 65% | −3 | (1) Fewer <a href> in Help; (2) Duplicate provider tree still present; (3) Teacher/parent chat divergence adds new regression surface |
| UX Quality | 28% | 36% | +8 | (1) Help page: real email, real phone, correct language; (2) Teacher chat: real-time messages; (3) AIChat still ephemeral; (4) Cyrillic label partially addressed |
| **Overall** | **37%** | **44%** | **+7** | |

---

## Open Questions (from v1, updated)

1. **04-001 duplicate providers:** Still no fix. The parent's real `NotificationContext` being nested inside the teacher's stub creates silent state divergence risk.
2. **04-004 notification stub:** No change. Teacher badge hardcoded to 3 on every page load.
3. **04-009 alert/confirm in cited files:** M-13 fixed *different* pages. MonitoringJournal, TherapyManagement, AIWarnings, Therapy.jsx all still use native dialogs.
4. **04-010 parent chat:** Parent `Chat.jsx` needs WebSocket migration matching what was done for teacher `Chat.jsx`.
5. **04-006 AIChat persistence:** No change. For an AI-generated content audit trail, localStorage is insufficient.

---

## What I Did NOT Look At

- Parent `Sidebar.jsx` full content (only grep'd for unread-count and chatStore)
- Full ChildProfile.jsx (sampled key lines around Cyrillic and 401 handler)
- AIWarnings.test.jsx full content (just noted its existence)
- vite.config.js teacher (confirmed in Phase 1 — not re-read)
- Whether `useSocket()` is available in parent Chat.jsx context tree (it is — `SocketProvider` wraps all routes in `App.jsx`)
