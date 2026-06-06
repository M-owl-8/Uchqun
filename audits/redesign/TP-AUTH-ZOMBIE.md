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

---

## S1 — Reopen (2026-06-06)

The S1 reopen was triggered by PP-AUDIT C.2 reporting that `teacher/src/parent/components/ProtectedRoute.jsx:8` still used the old `loading && !user` guard. Investigation under this brief produced findings the prior round missed.

### S1.H3 finding — parent-side foothold was a phantom

```bash
$ grep -rn "from .*parent/components/ProtectedRoute\|from .*'\./components/ProtectedRoute'" teacher/src --include='*.js' --include='*.jsx'
# (empty — zero importers)
```
`teacher/src/parent/components/ProtectedRoute.jsx` is **not imported anywhere**. `teacher/src/App.jsx:10` imports `ProtectedRoute` from `./shared/components/ProtectedRoute`, and that same shared component guards both teacher routes (line 86, 126) and parent routes (lines 95, 104). All production parent traffic was already running through the fixed guard. PP-AUDIT's verdict that the parent zombie risk was live was based on file existence, not import wiring — corrected here.

**Action:** the orphan file was deleted in this session to prevent future accidental imports of the old guard. New parent-role variants were added to the existing zombie regression suite to lock in that the shared route handles `requireRole: 'parent'` correctly.

### S1.H1 finding — backend semantic split still leaked 403 from `authenticate`

The S1 brief's H1 was the gap the original round did not address. The `authenticate` middleware itself returned **403** (not 401) for two account-state conditions, which the frontend interceptor does not treat as session-dead:

| Path | Old behavior | New behavior |
|---|---|---|
| `auth.js:102-104` — `!user.isActive` (teacher/admin/reception) | `res.status(403).json({ error: 'Account is not active' })` | `res.status(401).json({ success: false, error: { code: 'ACCOUNT_NOT_ACTIVE' } })` |
| `auth.js:106-110` — reception `!documentsApproved || !isActive` | `res.status(403).json({ error: 'Account not approved...', requiresApproval: true })` | `res.status(401).json({ success: false, error: { code: 'RECEPTION_NOT_APPROVED' }, requiresApproval: true })` |

`PASSWORD_CHANGE_REQUIRED` (auth.js:117-127) stays **403** intentionally — `ProtectedRoute.jsx:24-27` already navigates to `/change-password` when `user.mustChangePassword`. That is a special UI flow, not session-dead.

After the change, the interceptor's existing 401 path (`shared/services/api.js:96-111`) covers all account-state failures uniformly: one refresh attempt → on failure, `clearAuth()` → redirect to `/login`. No zombie window for deactivated/unapproved accounts either.

### S1.H2 finding — re-verified, still clean

```bash
$ grep -rn "import axios\|require('axios')\|fetch(" teacher/src 2>/dev/null \
    | grep -v "shared/services/api" | grep -v "__tests__" | grep -v ".test."
# (empty — every teacher-app HTTP call routes through the shared client)
```
No bypass introduced since the original round.

### S1.H4 finding — 502 on signed media URL is non-auth

Classified: Appwrite-side. The 502 in capture 3 was on a signed Appwrite media URL whose validity is independent of the session (signed URLs carry their own expiry). Tracked separately as part of `TP-MEDIA-STORAGE`; not closed by this session, but the interceptor doesn't touch it either (no `auth/` path in `originalRequest.url`).

### Files changed (S1)

| File | Change |
|---|---|
| `backend/middleware/auth.js:100-110` | Two `403`s → `401` with `{ code: ACCOUNT_NOT_ACTIVE }` and `{ code: RECEPTION_NOT_APPROVED }` |
| `audits/backend/i18n-error-codes.md` | `ACCOUNT_NOT_ACTIVE` row expanded to cover `!isActive`; new `RECEPTION_NOT_APPROVED` row |
| `backend/i18n/{uz-latn,uz-cyrl,ru}.json` | Added `RECEPTION_NOT_APPROVED` translations (3 locales) |
| `backend/__tests__/i18n.test.js` | `EXPECTED_CODE_COUNT 226 → 227` |
| `backend/__tests__/middleware/auth.test.js` | +5 cases: teacher/admin `!isActive` → 401, reception `!documentsApproved` → 401, parent/government exempt |
| `teacher/src/__tests__/ProtectedRoute.zombie.test.jsx` | +3 parent-role variants |
| `teacher/src/parent/components/ProtectedRoute.jsx` | **Deleted (orphan)** |

### Verification gates (S1)

| Gate | Local | Notes |
|---|---|---|
| `node --check backend/middleware/auth.js` | ✅ | Plus the two test files |
| JSON validate 3 locales | ✅ | `python3 json.load` passes on each |
| `npm run lint` (teacher) | ⚠️ pending CI | Full dep tree not installable in this remote sandbox |
| `npm test` backend / teacher | ⚠️ pending CI | Same reason. Tests pushed to `main`; GitHub Actions will run them. |

### S1 User Railway verification

In addition to the original three steps above:

4. **Parent portal: force expiry** — log in as parent, wait 15 min, navigate → clean redirect to `/login`, console shows no 401/403 storm (this exercises the shared ProtectedRoute via the parent route mount at `App.jsx:95,104`).
5. **Account-state semantic check (optional, requires admin)** — while a teacher session is open, an admin sets that teacher's `isActive=false`. The teacher's next API call gets `401` with `code: ACCOUNT_NOT_ACTIVE`. The interceptor clears the session and redirects to `/login` — no `Account is not active` 403 toast lingering in a still-mounted UI.

Reply "verified" → flip `LOOP_TRACKER` to ✅, advance to S2 (TP-LOCALE-FOUNDATION re-inspect).
