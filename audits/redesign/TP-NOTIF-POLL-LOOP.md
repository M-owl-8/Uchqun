# TP-NOTIF-POLL-LOOP — Runaway Notification Polling on Login Page

**Status:** ✅ Built + pushed — awaiting user Railway verification  
**Branch:** `main`  
**Commit:** `2bd9678`

---

## Root cause — confirmed from code

### H1 — NotificationProvider mounted outside auth (CONFIRMED)

`teacher/src/App.jsx` line 75:
```jsx
<NotificationProvider>         ← wraps ALL routes
  <Router>
    <Route path="/login" element={<Login />} />   ← line 81, inside provider
    ...
  </Router>
</NotificationProvider>
```

`teacher/src/shared/context/NotificationContext.jsx` (original):
```js
useEffect(() => {
  loadNotifications();              // ← fires immediately on mount
  on('notification:new', loadNotifications);
  return () => off('notification:new', loadNotifications);
}, [on, off]);                      // ← no isAuthenticated guard
```

On page load at `/login`: `GET /api/v1/notifications/count` fires with no token.

### H2 — No halt or backoff on 401/429 (CONFIRMED)

Original error handlers:
```js
const loadNotifications = async () => {
  try {
    const response = await api.get('/notifications/count');
    setCount(response.data.count || 0);
  } catch {
    setCount(0);        // ← 401 and 429 both swallowed silently
  }
};
```

The interceptor retries 401 via `POST /auth/refresh`, then calls `clearAuth()`, which re-renders the auth context. In scenarios where stale localStorage has a user object, this triggers a re-mount cascade: `isAuthenticated` briefly true → notification fires → 401 → refresh fails → clearAuth → repeat.

### H3 — Shared apiLimiter bucket between notifications and auth (CONFIRMED)

`backend/server.js`:
```js
app.use('/api', apiLimiter);          // line 153 — ALL /api/* routes share this bucket
app.use('/api/v1/notifications', notificationRoutes);  // line 167
```

`backend/middleware/rateLimiter.js`:
```js
export const apiLimiter = rateLimit({
  windowMs: WINDOW_MS,
  max: 1000,           // 1000 req/15min per IP — shared with /auth/login
  store: makeRedisStore(WINDOW_MS, 'api'),
  ...
});
```

`backend/routes/authRoutes.js`:
```js
router.post('/login', loginIpLimiter, loginLimiter, loginValidator, handleValidationErrors, login);
```

`loginLimiter` and `loginIpLimiter` have separate Redis stores BUT `apiLimiter` fires **before** them (Express middleware order). Notification flood exhausts the 1000/15min `api` bucket → subsequent `POST /auth/login` requests get 429 from `apiLimiter` before reaching `loginLimiter`.

### H4 — 429 on the axios interceptor (CONFIRMED: NO RETRY LOOP)

The interceptor only retries on **401**, not 429:
```js
if (error.response?.status === 401 && !originalRequest._retry) { ... retry ... }
// 429: falls through to Promise.reject(error) — no retry loop
```

The 429 errors accumulate because the initial load fires repeatedly (not because the interceptor retries them). The cascade is mount → 401 → refresh → clearAuth → re-render → mount → ... especially with stale localStorage state.

---

## Fix

### Frontend — teacher + parent NotificationContext

Both `teacher/src/shared/context/NotificationContext.jsx` and `teacher/src/parent/context/NotificationContext.jsx` now:

1. **isAuthenticated guard** — the effect bails immediately if not authenticated:
```js
const { isAuthenticated } = useAuth();

useEffect(() => {
  if (!isAuthenticated) return;     // ← zero requests on /login
  loadNotifications();
  on('notification:new', loadNotifications);
  return () => off('notification:new', loadNotifications);
}, [isAuthenticated, on, off, loadNotifications]);
```

2. **429 backoff** — `pausedUntilRef` tracks expiry without state re-renders:
```js
const pausedUntilRef = useRef(0);

const loadNotifications = useCallback(async () => {
  if (Date.now() < pausedUntilRef.current) return;
  try {
    const response = await api.get('/notifications/count');
    setCount(response.data.count || 0);
  } catch (err) {
    const status = err?.response?.status;
    if (status === 401) return;   // interceptor handles → isAuthenticated flips → effect tears down
    if (status === 429) {
      const retryAfter = parseInt(err?.response?.headers?.['retry-after'] || '60', 10);
      pausedUntilRef.current = Date.now() + Math.max(retryAfter * 1_000, 60_000);
    }
    setCount(0);
  }
}, []);
```

### Backend — isolate auth bucket

`backend/middleware/rateLimiter.js`:
```js
export const apiLimiter = rateLimit({
  ...
  skip: (req) => req.path.startsWith('/v1/auth/'),
  // Auth paths have dedicated limiters; excluding them prevents
  // an API flood from blocking login attempts with spurious 429s.
  ...
});
```

### Other portals

Admin, reception, and government: `grep` for NotificationProvider/notification polling returned zero hits. No changes needed.

---

## Tests — 6/6 ✅

`teacher/src/__tests__/context/NotificationContext.test.jsx`

| Test | Result |
|------|--------|
| unauthenticated render → 0 GET /notifications/count | ✅ |
| authenticated render → fires /notifications/count | ✅ |
| authenticated → socket listener registered | ✅ |
| unauthenticated → socket listener NOT registered | ✅ |
| 429 → retry blocked by backoff gate | ✅ |
| 401 → no throw, silent return | ✅ |

---

## Build

- **Build:** ✅ `vite build` green — 863 kB / 17s

---

## User verification checklist (after 15-min lockout expires)

1. Open `/login` with DevTools Network → **ZERO requests** to `/notifications*`
2. Log in as teacher → polling starts, sane count update in header badge
3. Log out → no more `/notifications` requests in Network tab
4. Log in / log out 5× quickly → no lockout (auth bucket no longer poisoned)

Reply "verified" to close TP-NOTIF-POLL-LOOP.
