# PP-AUTH-ZOMBIE — Parent portal auth-zombie closure verification

**Status:** 🟡 S5 confirm in progress (pending user Railway verification)
**Scope:** Verify parent-side closure of the auth-zombie bug — no new architecture, no re-fix. Lock with evidence the chain that S1 + S2-PP-AUDIT already collapsed.
**Brief rule honored:** every negative claim ("no orphan", "no bypass") is backed by a pasted grep/read, never an assertion.

---

## Background — what S1 actually closed

The S1 close-out of TP-AUTH-ZOMBIE landed two parent-relevant changes that this session re-confirms didn't drift:
- The shared `ProtectedRoute` (which both teacher and parent routes mount through) uses `if (loading)` as the auth-verification guard — eliminating the zombie-render window where stale localStorage rendered the full authenticated shell before `auth/me` resolved.
- The orphan `teacher/src/parent/components/ProtectedRoute.jsx` (which still carried the old `loading && !user` guard) was deleted in S1 — it had zero importers, but its existence was a footgun. Its variant guard never ran in production but is now gone.

The backend semantic split (S1: `auth.js:102-110` 403→401 for `!isActive`/reception `!documentsApproved`) is parent-irrelevant directly: `auth.js:101-104` gates **non-parent** roles on `isActive`, and parent suspension is handled via the `users.status` enum (which already returned 401 ACCOUNT_NOT_ACTIVE pre-S1). So the parent's session-expiry path is purely the **token-expired → 401 → interceptor refresh → on-fail clearAuth → redirect** flow.

---

## Confirm with evidence

### 1. Parent route mount chain — pasted, not asserted

`teacher/src/App.jsx:10` — the import:
```jsx
import ProtectedRoute from './shared/components/ProtectedRoute';
```

`teacher/src/App.jsx:92-106` — the two parent route mounts:
```jsx
<Route
  path="/change-password"
  element={
    <ProtectedRoute requireRole="parent" allowMustChange>
      <ParentChangePassword />
    </ProtectedRoute>
  }
/>

<Route
  path="/"
  element={
    <ProtectedRoute requireRole="parent">
      <ParentApp />
    </ProtectedRoute>
  }
>
  …all parent routes…
</Route>
```

`teacher/src/shared/components/ProtectedRoute.jsx:12` — the fixed guard:
```jsx
const ProtectedRoute = ({ children, requireRole, allowMustChange = false }) => {
  const { isAuthenticated, loading, isTeacher, isParent, user } = useAuth();

  // Block rendering during auth verification regardless of stale localStorage data.
  // The old guard `loading && !user` allowed zombie rendering: if localStorage had
  // a stale user, the full authenticated layout mounted immediately and fired all
  // page API requests before auth/me validated the session (request storm on 401).
  if (loading) {
    return (<div …><LoadingSpinner size="lg" /></div>);
  }
  …
};
```

**Orphan / variant-guard check** — `find teacher/src/parent -name "*ProtectedRoute*" -o -name "*Guard*"`:
```
(empty)
```
Zero matches. The parent tree has no ProtectedRoute file and no homegrown guard.

**Old buggy `loading && !user` anywhere** — `grep -rn "loading && !user" teacher/src --include='*.jsx' --include='*.js' | grep -v __tests__`:
```
teacher/src/shared/components/ProtectedRoute.jsx:9:  // The old guard `loading && !user` allowed zombie rendering: if localStorage had
```
Single match, and it is **inside a JSX comment** that documents why the old guard was wrong. No live code carries that variant. Confirmed.

### 2. Parent API-call bypass scan — grep, not assertion

Three greps over `teacher/src/parent/**` (excluding tests):

```
$ grep -rn "import axios\|from 'axios'\|require('axios')" teacher/src/parent --include='*.jsx' --include='*.js' | grep -v __tests__
(empty)

$ grep -rn "fetch(\|window\.fetch\|globalThis\.fetch" teacher/src/parent --include='*.jsx' --include='*.js' | grep -v __tests__
(empty)

$ grep -rn "XMLHttpRequest" teacher/src/parent --include='*.jsx' --include='*.js' | grep -v __tests__
(empty)
```

**Bypass list: empty.** Every HTTP call in the parent tree routes through `teacher/src/parent/services/api.js`.

`teacher/src/parent/services/api.js` (the entire file, 9 lines):
```jsx
// Re-export the teacher portal's single api instance so all components — both
// teacher-side and parent-side — share one axios instance, one refreshPromise
// mutex, and one onUnauthenticated handler. Previously this re-exported the
// shared module-level default (a separate instance), which caused concurrent
// refresh races: parent-side would rotate the refresh token first; teacher-side
// would then send the revoked token, fail, and call clearAuth() — logging the
// user out spuriously.
export { default } from '../../shared/services/api';
export { createApi } from '@shared/services/api';
```

The default export comes from `teacher/src/shared/services/api.js`, which is:
```jsx
import { createApi } from '@shared/services/api';
const api = createApi({ tokenKey: 'accessToken' });
export default api;
```

— a **singleton** created once at module load. Parent and teacher components import the same module export; they share one axios instance, one `refreshPromise` mutex, one error path.

**Rogue `createApi` / `axios.create` in parent** — `grep -rn "createApi\|axios.create" teacher/src/parent --include='*.jsx' --include='*.js' | grep -v __tests__`:
```
teacher/src/parent/services/api.js:9:export { createApi } from '@shared/services/api';
```
Single match, and it is a **re-export passthrough** — not a new instance creation. No rogue api.

### 3. Parent session-expiry path — traced end-to-end

The parent app's full expiry path, traced through file:line:

| Step | File:line | Behavior |
|---|---|---|
| Parent page calls `api.get('/parent/…')` | various | uses shared singleton via parent's re-export |
| Token expired → backend returns 401 | `backend/middleware/auth.js:134-135` | `if (error.name === 'TokenExpiredError') return res.status(401)` |
| Interceptor catches 401 | `shared/services/api.js:96-108` | sets `_retry`, acquires `refreshPromise` mutex (single in-flight refresh across teacher+parent components — the parent re-export uses the same `refreshPromise` closure), calls `doRefresh()` |
| Refresh fails (refresh-token expired too) | `shared/services/api.js:104-107` | `clearAuth()` then `Promise.reject(error)` |
| `clearAuth` | `shared/services/api.js:33-43` | removes `localStorage.user`; if `_onUnauthenticated` is set, calls it; else `window.location.replace('/login')` (skipping that replace if already on `/login` — anti-loop guard at `:38-40`) |
| Login route renders for both roles | `teacher/src/App.jsx:71-79` (Login mount) | parent and teacher land on the same `/login`; the Login page routes the user back to `/` or `/teacher` after auth based on `user.role` |

**The 403-from-account-state path** (S1 carve-out): parent is explicitly exempt from the legacy `isActive` gate at `auth.js:101-104` (`if (!isParent && !isGovernment && !user.isActive) …`). Parent suspension is via the `users.status` enum gate at `auth.js:96-98`, which **already returned 401 ACCOUNT_NOT_ACTIVE** before S1. So parent's account-state expiry path is identical to its token-expiry path: 401 → interceptor refresh → fail → clearAuth → redirect. No 403 zombie window exists in the parent flow.

### 4. AuthContext share — single source of truth

`teacher/src/parent/context/AuthContext.jsx` (the entire file, 3 lines):
```jsx
// Parent section re-uses the shared teacher AuthContext.
// Do NOT create a separate AuthProvider here — the outer AuthProvider in App.jsx covers all routes.
export { AuthProvider, useAuth } from '../../shared/context/AuthContext';
```

There is one `AuthProvider` mounted at the top of `App.jsx`; both parent and teacher trees consume the same `useAuth()` hook. The interceptor's `clearAuth` and the ProtectedRoute's `loading` come from the same provider. There is no parallel parent auth state to drift.

---

## Tests — locked with parent-role variants (S1 work, re-confirmed)

`teacher/src/__tests__/ProtectedRoute.zombie.test.jsx` — **7 cases**, all importing the same shared `../shared/components/ProtectedRoute`:

| Line | Case | Role tested |
|---|---|---|
| 37 | shows spinner when loading=true even with stale localStorage user (no zombie render) | teacher |
| 57 | shows spinner when loading=true and no user (cold start — no localStorage) | teacher |
| 75 | redirects to /login when loading=false and user cleared (expired session resolved) | teacher |
| 96 | renders children when loading=false and teacher is authenticated | teacher |
| **120** | **parent route: shows spinner during loading even with stale localStorage parent user** | **parent** |
| **138** | **parent route: redirects to /login when loading=false and parent session resolved as expired** | **parent** |
| **158** | **parent route: renders children when authenticated parent has loading=false** | **parent** |

The three parent-role variants (S1 additions) lock in that:
1. Stale localStorage + loading=true → spinner, not zombie shell mount (closes the request-storm window).
2. loading=false + user cleared → redirect to `/login` (closes the post-expiry render window).
3. loading=false + authenticated parent → children render (positive case — no false redirect).

`grep -nE "  it\('" teacher/src/__tests__/ProtectedRoute.zombie.test.jsx` confirms the 7 cases above are the only `it()` calls in the file. No gaps. No additional case to add — the brief's "Add any missing parent-specific case" is satisfied; nothing missing.

---

## Verdict

**No fix needed — closure confirmed.** Specifically, the four claims this brief required confirmation of:

| Claim | Evidence type | Result |
|---|---|---|
| Parent routes use shared fixed guard | Read | `App.jsx:10` import + `:95,104` mounts + `shared/components/ProtectedRoute.jsx:12` `if (loading)` |
| No orphan / variant guard in parent tree | Negative grep | `find teacher/src/parent -name "*ProtectedRoute*" -o -name "*Guard*"` empty; `loading && !user` only as a comment in shared file |
| No parent API-call bypasses | Three negative greps | `import axios`, `fetch(`, `XMLHttpRequest` all empty under `teacher/src/parent/**` |
| Parent inherits S1 session semantics | Trace | Singleton api + shared interceptor + shared AuthContext; parent exempt from `!isActive` 403 carve-out, so account-state expiry is also 401-only |

---

## User Railway verification

1. **Force expiry on parent.** Log into the parent portal in a browser. Either wait ~15 min idle (the JWT access TTL) OR open DevTools → Application → Cookies → delete `accessToken` and `refreshToken`. Navigate to any parent page. **Expect:** clean redirect to `/login`; DevTools Network tab shows zero 401/403 storm; the parent shell does not flash visible before the redirect.
2. **Log back in.** Submit credentials → parent dashboard loads; DevTools console clean (no 401/403, no "uncaught" promise rejections).
3. **Hard refresh.** While authenticated, hard-refresh `/` (the parent dashboard root) → page renders; zero 401/403 in Network tab.

Reply **"verified"** → I flip `LOOP_TRACKER.md` `PP-AUTH-ZOMBIE` to ✅. Next: S6 PP-DATE-LOCALE.
