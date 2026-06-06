# TP-AUTH-ZOMBIE: Expired session renders authenticated UI with 401/403 storm

**Status:** 🟡 In progress (pending user Railway verification)
**Commit:** pending
**Evidence:** Three independent production captures — chat page, settings page, post-messenger

---

## H1 — 401 vs 403 backend consistency

**Finding: REFUTED as a backend inconsistency. The 403s are not from expired tokens.**

The backend `authenticate` middleware (auth.js:130-138) always returns **401** for expired/invalid tokens:
```js
catch (error) {
  if (error.name === 'JsonWebTokenError') → 401
  if (error.name === 'TokenExpiredError') → 401
  default → 401
}
```
There is no code path that returns 403 for an expired token.

### The two anonymous 403 endpoints identified by name:

**`?isResolved=false` → `GET /api/v1/ai-warnings?isResolved=false`**
Route: `backend/routes/aiWarningRoutes.js:24` — `requireRole('admin', 'government')`
A teacher has a valid token, passes `authenticate`, then hits `requireRole` → 403 "Insufficient permissions".
This 403 fires on EVERY page load when the teacher visits `/teacher/warnings`, not just during expired sessions. The teacher frontend was calling an admin/government-only endpoint — permanent role mismatch, not a session issue.

**`limit=200` → `GET /api/v1/chat/messages?conversationId=...&limit=200`**
Route: `backend/routes/chatRoutes.js:24` — `authenticate` only (no requireRole)
Controller: `chatController.js:55` — `canAccessConversation()` returns 403 when the teacher is not in a group that has the parent's child. Legitimate business-logic 403, correct behavior.

**`chat/read` (capture 1)** → `POST /api/v1/chat/read` — same `canAccessConversation` check → legitimate 403.

**Fix applied:** Added `'teacher'` to `requireRole` for `GET /` and `PUT /:id/resolve` in `aiWarningRoutes.js`. Added teacher school-scoping in `getWarnings` controller (`where.schoolId = req.user.schoolId` when `role === 'teacher'`). The existing `resolveWarning` already scopes by schoolId via the `else if` branch — no change needed there.

---

## H2 — Interceptor coverage and 403 behavior

**H2a: API bypass scan — NONE FOUND.**
`grep` for `axios.create`, `new axios`, `fetch(`, `window.fetch` across `teacher/src` → no matches. All API calls go through `teacher/src/shared/services/api.js` (or `teacher/src/parent/services/api.js`).

**H2b: Interceptor behavior on 403 and on refresh failure.**

The interceptor (`shared/services/api.js:53-113`) handles 403 in one case only:
```js
if (error.response?.status === 403 && error.response?.data?.error === 'SCHOOL_ARCHIVED') {
  clearAuth();   // ← only SCHOOL_ARCHIVED 403 triggers clearAuth
}
```
All other 403s → `Promise.reject(error)`. Component catch block handles them. This is **correct** — a 403 from a role mismatch cannot be fixed by refreshing the access token.

The interceptor handles 401:
```js
if (error.response?.status === 401 && !originalRequest._retry) {
  originalRequest._retry = true;
  if (!refreshPromise) {
    refreshPromise = doRefresh().finally(() => { refreshPromise = null; });
  }
  await refreshPromise;       // mutex: all concurrent 401s share one refresh
  return api(originalRequest); // retry on success
} catch {
  clearAuth();                // on refresh failure: clear auth + navigate
}
```
The mutex correctly prevents concurrent refresh races within a single api instance.

**Secondary issue found — two separate api instances sharing no mutex:**
- `teacher/src/shared/services/api.js` → `createApi({ tokenKey: 'accessToken' })` — used by teacher-side components + auth context
- `teacher/src/parent/services/api.js` → previously re-exported `@shared/services/api` default (a separate `createApi()` instance) — used by parent-side components including AIWarnings.jsx

Two instances means two separate `refreshPromise` vars. If a parent-side component (e.g., AIWarnings) and a teacher-side component both get 401 simultaneously, BOTH try to refresh independently. The first succeeds and rotates the refresh token. The second gets 401 on its refresh, calls `clearAuth()`, and the user is logged out spuriously.

**Fix applied:** `teacher/src/parent/services/api.js` now re-exports from `'../shared/services/api'` instead of `'@shared/services/api'`. All components share one instance, one mutex, one `onUnauthenticated` handler.

---

## H3 — Zombie UI root cause: ProtectedRoute guard bug

**Finding: CONFIRMED.**

`createAuthContext` initialises `user` from localStorage synchronously:
```js
const [user, setUser] = useState(() => {
  const stored = localStorage.getItem(storageKey);
  return stored ? JSON.parse(stored) : null;  // stale cache → user is truthy immediately
});
const [loading, setLoading] = useState(true);
```

`ProtectedRoute` (before fix):
```js
if (loading && !user) {   // ← bug: only blocks when BOTH conditions are true
  return <LoadingSpinner />
}
```

When localStorage has stale session data:
- `user` = `{ id:1, role:'teacher' }` (truthy)
- `loading` = `true`
- `loading && !user` → `true && false` → **false** → spinner NOT shown

Result: the full authenticated layout mounts immediately. All page components render and fire their API requests (auth/me, notifications, parents list, chat conversations, ai-warnings, etc.) before auth/me has validated the session. When auth/me gets 401, the interceptor attempts refresh. If refresh fails, `setUser(null)` is called — but all the queued requests already fired.

**Fix applied:** `ProtectedRoute.jsx` line 8: `if (loading && !user)` → `if (loading)`

This means the spinner is always shown during the auth check window (typically 200–400ms on a fast connection). After `auth/me` resolves, `setLoading(false)` fires and the correct UI renders. No page components mount during the loading window — zero requests fire prematurely.

```js
// After fix:
if (loading) {   // ← blocks ALL rendering until auth/me resolves
  return <LoadingSpinner />
}
```

---

## 502 on signed media URL

**Classification: storage-related, not auth-related.**

Signed media URLs (Railway object storage / S3-compatible) have a TTL independent of the JWT. When a zombie session renders a page that previously loaded a signed URL (from a prior session), the URL is replayed but its signature has expired → 502 from the CDN/storage gateway.

Not fixed in this PR. Logged as separate item: refresh signed URLs on re-authentication or implement short-TTL + browser-side re-fetch on error.

---

## Files changed

| File | Change |
|---|---|
| `teacher/src/shared/components/ProtectedRoute.jsx` | `loading && !user` → `loading` |
| `teacher/src/parent/services/api.js` | Re-export from teacher's shared instance (not shared module default) |
| `backend/routes/aiWarningRoutes.js` | Add `'teacher'` to requireRole for GET + PUT/:id/resolve |
| `backend/controllers/aiWarningController.js` | Teacher school-scoping in `getWarnings` |
| `teacher/src/__tests__/ProtectedRoute.zombie.test.jsx` | 4 regression tests (new file) |

## Verification checklist

- `npm run lint` (teacher): 0 errors, 0 warnings ✅
- `node backend/scripts/verify-i18n.js`: 226/226 keys matched ✅
- `ProtectedRoute.zombie.test.jsx`: 4/4 pass ✅
- Backend: `getWarnings` teacher-scoped to `req.user.schoolId` ✅

## User Railway verification steps

1. Log in as teacher. Force expiry: wait 15 min (access token TTL) with the app open, then navigate to any teacher page → app redirects to `/login` cleanly. Console shows no request storm.
2. Log back in → all pages load. Console clean.
3. Hard refresh `/teacher/settings` while authenticated → zero 401/403.
