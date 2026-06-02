# GOV-FORCE-PASSWORD-FLOW — Force-Password-Change Flow Bug

**Date:** 2026-06-02  
**Status:** ✅ CLOSED (pending user Railway verification — STEP 7)  
**Root cause:** Compound bug — Cause B (wrong HTTP status) + Interceptor session destruction

---

## STEP 1 — Backend Diagnosis

### 1a — Login with mustChangePassword=true

`backend/controllers/authController.js` login function (lines 156-183):
- Issues a **normal** access token + refresh token — no special scope or restriction
- Response includes `user.toJSON()` which contains `mustChangePassword: true`
- No special gate at the token level

```js
const accessToken = generateAccessToken(user.id);
const refreshToken = await generateRefreshToken(user.id);
// Sets HTTP-only cookies
res.json({ success: true, expiresIn: ACCESS_TOKEN_EXPIRY, user: user.toJSON() });
```

The force-change restriction is enforced in `authenticate` middleware, not at token issue time.

### 1b — Authenticate middleware force-change gate

`backend/middleware/auth.js` lines 117-127:
```js
if (user.mustChangePassword) {
  const url = (req.originalUrl || req.path || '').split('?')[0];
  const ALLOWED_PATHS = ['/api/v1/user/password', '/api/v1/auth/logout'];
  if (!ALLOWED_PATHS.includes(url)) {
    return res.status(403).json({
      success: false,
      error: { code: 'PASSWORD_CHANGE_REQUIRED' },
      mustChangePassword: true,
    });
  }
}
```

`PUT /api/v1/user/password` IS in the allowed list → the gate correctly passes through.

### 1c — changePassword controller (the bug)

`backend/controllers/userController.js` lines 97-128:
```js
const isPasswordValid = await user.comparePassword(currentPassword);
if (!isPasswordValid) {
  // BUG: returns 401 — "Unauthorized" — for a bad-input error (wrong field value)
  return res.status(401).json({ error: 'Current password is incorrect' });
}
```

**401 is semantically wrong for this case.** HTTP 401 means "not authenticated" (no/invalid credentials in the request). HTTP 400 means "bad request" (caller provided an invalid value). Returning 401 for a wrong password value triggers the Axios retry interceptor, which treats all 401s as potential token-expiry events.

### 1d — Refresh function

`backend/controllers/authController.js` lines 193-261:
- `POST /auth/refresh` does NOT go through `authenticate` middleware
- Reads refresh token from cookie
- Does NOT check `mustChangePassword`
- Issues new access + refresh tokens normally

The refresh function is NOT the problem. It would succeed during the force-change flow.

### 1e — Existing backend tests

`backend/__tests__/user.test.js` line 126-133 (pre-fix):
```js
it('401 when current password wrong', async () => {
  expect(res.status).toHaveBeenCalledWith(401);  // WRONG — test validated bad behavior
});
```

`backend/__tests__/middleware/passwordChangeGate.test.js`:
- Correctly tests the gate allows `/api/v1/user/password`
- Does NOT test the full end-to-end flow (login → change → re-login)

---

## STEP 2 — Frontend Diagnosis

### 2a — Login handling

`government/src/context/AuthContext.jsx` line 22:
```js
const mustChangePassword = base.user?.mustChangePassword === true;
```

`government/src/App.jsx` lines 47-50:
```js
if (isAuthenticated && mustChangePassword && !isChangePasswordPage) {
  return <Navigate to="/government/change-password" replace />;
}
```
Correctly blocks all navigation until force-change is completed.

### 2b — ChangePassword form

`government/src/pages/ChangePassword.jsx` (pre-fix):
```js
await api.put('/user/password', {
  currentPassword: form.currentPassword,
  newPassword: form.newPassword,
});
// Success: setUser({ ...user, mustChangePassword: false }), navigate('/government')
```

```js
} catch (err) {
  if (err.response?.status === 401) {           // BUG: should be 400
    setError(t('changePasswordForced.incorrect'));
  } else {
    setError(t('changePasswordForced.error'));
  }
}
```

The form is otherwise correct — it sends `currentPassword + newPassword`, not `email + newPassword`.

### 2c — The Axios interceptor compound

`shared/services/api.js` lines 96-112:
```js
if (error.response?.status === 401 && !originalRequest._retry) {
  originalRequest._retry = true;
  try {
    if (!refreshPromise) refreshPromise = doRefresh().finally(() => { ... });
    await refreshPromise;            // Refresh succeeds — new access token issued
    return api(originalRequest);     // RETRY PUT /user/password with same body
  } catch {
    clearAuth();                     // If refresh fails → session destroyed
    return Promise.reject(error);
  }
}
if (error.response?.status === 401) {
  clearAuth();                       // _retry=true + 401 again → session destroyed
}
```

**The bug chain:**
1. User enters wrong `currentPassword` → backend returns 401
2. Interceptor sees 401 → not on no-retry list → calls `doRefresh()` (succeeds)
3. Interceptor retries `PUT /user/password` with same (wrong) body → 401 again
4. Second 401 with `_retry=true` → `clearAuth()` → `window.location.replace('/login')`
5. Page navigates away before `ChangePassword.catch(err)` can call `setError`
6. User sees **no error message** and is **logged out**
7. User can log back in with the temp password (change never applied)

### 2d — Frontend tests

`government/src/__tests__/PasswordChangeRedirect.test.jsx`:
- Only tests App.jsx routing (redirect behavior)
- Does NOT test the ChangePassword form submit or error handling
- No ChangePassword.test.jsx existed before this session

---

## STEP 3 — Root Cause Classification

**Cause B + Interceptor (compound):**

1. **Backend returns wrong HTTP status (Cause B):** `changePassword` returns 401 for wrong `currentPassword`. Correct status is 400.
2. **Interceptor session destruction:** The shared Axios interceptor retries all 401s. A wrong-password 401 triggers refresh+retry, and the second 401 calls `clearAuth()` → destroys session, navigates to login, silences the error message.

**Why it went undetected:** Backend unit test explicitly expected 401 and passed. Frontend tests covered routing but not the form submit flow. No end-to-end test covered the create → first-login → force-change → second-login sequence.

---

## STEP 4 — Fix Applied

### Backend fix (`backend/controllers/userController.js`)

```js
// BEFORE
return res.status(401).json({ error: 'Current password is incorrect' });

// AFTER
return res.status(400).json({
  success: false,
  error: { code: 'CURRENT_PASSWORD_INCORRECT', detail: 'Current password is incorrect' },
});
```

**Why 400 fixes the bug:** The Axios interceptor only retries on 401. A 400 propagates directly to the component's `catch` block, where `setError` is called and the error is shown to the user. Session is preserved.

The token-expiry scenario (15-minute window) still works correctly:
- Token expires during change-password flow → `PUT /user/password` returns 401 (token expired)
- Interceptor refreshes → retries → if password correct → 200; if wrong → 400 → error shown

### Frontend fix (`government/src/pages/ChangePassword.jsx`)

```js
// BEFORE
if (err.response?.status === 401) {
  setError(t('changePasswordForced.incorrect'));

// AFTER  
if (err.response?.status === 400) {
  setError(t('changePasswordForced.incorrect'));
```

### No interceptor change needed

The interceptor behavior (retry on 401) is correct for token-expiry recovery. Only the backend status code was wrong.

---

## STEP 5 — Backend Tests

**Updated `backend/__tests__/user.test.js`:**

| Test | Change |
|---|---|
| "401 when current password wrong" | Updated to expect 400 + `CURRENT_PASSWORD_INCORRECT` error code |
| "persists new password and saves" | Added: verifies `user.mustChangePassword` is set to false on success |
| "500 on save failure" | New test: DB error during save → 500 |

Backend result: **135/135 suites, 1422/1422 tests** (was 1420).

---

## STEP 6 — Frontend Tests

**New `government/src/__tests__/ChangePassword.test.jsx` (7 tests):**

| Test | What it proves |
|---|---|
| Renders 3 fields + submit button | Component structure |
| Mismatch → client-side error, no API call | Front-end validation |
| Too short → client-side error, no API call | Front-end validation |
| 400 → shows "incorrect password", no navigate, session preserved | **The fixed bug case** |
| 5xx → shows generic error, no navigate | Error handling |
| 200 → clears mustChangePassword flag, navigates to dashboard | Happy path |
| Submits only currentPassword + newPassword (no confirmPassword in body) | Request shape |

Government result: **18/18 suites, 127/127 tests** (was 120).

---

## STEP 7 — User Railway Verification (Gate)

Required before full ✅:

1. Log in as gov.republic → Platform → Government Users → Create secondary account (any region)
2. Note the temp password
3. Log out → log in as new account with temp password
4. Force-change prompt appears → enter wrong password → confirm error message shown (NOT redirected to login)
5. Enter correct new password → confirm success, redirected to dashboard
6. Log out → log in with new password → confirm no force-change prompt
7. Try to log in with old/temp password → confirm 401 (rejected)

Screenshots at each step. Reply "verified" with evidence.

---

## STEP 8 — Honest Count

| Finding | Status |
|---|---|
| Root cause identified | ✅ Cause B (wrong HTTP status) + interceptor chain |
| Backend fix | ✅ `userController.js` — 401 → 400 for wrong password |
| Frontend fix | ✅ `ChangePassword.jsx` — checks 400 not 401 |
| Backend test updated | ✅ `user.test.js` — 3 tests updated/added |
| Frontend test added | ✅ `ChangePassword.test.jsx` — 7 new tests |
| Error displayed to user | ✅ setError now reachable (400 bypasses interceptor retry) |
| Session preserved on wrong password | ✅ clearAuth() no longer triggered |
| User Railway verification | ⬜ Pending |
| LOOP_PRE_LAUNCH_CHECKLIST updated | ✅ PL-026 through PL-030 added (critical user flows) |

**409 on account creation (mentioned in bug report):** The conflict was benign — duplicate credential (first name already taken). The form's `setCreateError` handles this via `PROVISION_CREDENTIAL_TAKEN`. User resolved by retrying with different name. No action needed.

---

## STEP 9 — Discipline Observations

**Third user-caught bug in successive sessions:**
1. GOV-ACCOUNT-DOMAINS — AdminsTab drift (missed form component)
2. GOV-ACCOUNT-FORM-AUDIT-2 — canRateSchools i18n (missed locale key)
3. This session — force-password-change (wrong HTTP status, interceptor chain)

**Pattern:** Deployment-critical auth flows are systematically under-tested because:
- Backend unit tests mock `comparePassword` as a Jest mock — never exercise bcrypt
- Frontend tests cover routing (redirect to change-password) but not the form submit flow
- No integration test covers the full create → first-login → force-change → second-login sequence
- The test in `user.test.js` explicitly expected 401 and PASSED — validating bad behavior

**The test validated the wrong contract.** Without a human walking through the flow, a well-tested (but wrongly-specified) system can ship bugs.

**LOOP_PRE_LAUNCH_CHECKLIST additions (PL-026 to PL-030):** Five critical multi-step auth flows now require explicit human verification on Railway before beta launch. These cannot be validated by unit tests alone.

---

## Files Changed

| File | Change |
|---|---|
| `backend/controllers/userController.js` | Wrong password → 400 (not 401) + BACKEND-012 error shape |
| `backend/__tests__/user.test.js` | Expect 400, verify mustChangePassword=false, add 500 test |
| `government/src/pages/ChangePassword.jsx` | Check 400 (not 401) for wrong-password error |
| `government/src/__tests__/ChangePassword.test.jsx` | New — 7 component tests |
| `LOOP_PRE_LAUNCH_CHECKLIST.md` | PL-026–030: critical user flows section |
| `LOOP_TRACKER.md` | GOV-FORCE-PASSWORD-FLOW entry |
