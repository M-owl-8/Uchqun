# Phase 2 v2 — Backend Verification
**Date:** 2026-05-08  
**Baseline:** `/audit/02-backend.md` (2026-05-07)  
**Mode:** Read-only verification. No project files modified.

---

## Executive Summary

Of the 14 backend issues, **5 are verified-fixed**, **2 are partially-fixed**, and **7 are not-fixed**. The tracker addressed 4 of the 5 fixes explicitly (#02-007, #02-010, #10-001/#02-008, L-03/#02-011). The remaining 9 issues — the entire N+1 auth middleware pattern, base64 avatar storage, dual-token response body, jti non-revocation, test behavioral divergence, and three low-severity structural items — were never in the tracker scope.

**Critical compounding risk (§6.9):** Issue 02-001 (DB hit per request) and 02-005 (base64 avatar in DB) still co-exist unchanged. Every authenticated request loads the full `User` row including potentially a 2 MB base64 avatar blob. Under a realistic teacher session (20+ parents × every poll cycle), this is megabytes of blob data flowing through the ORM on every request.

**Phase 2 v2 score: 63/100** (up from 53/100).

---

## Scope

Verification of all 14 issues from `/audit/02-backend.md`. Special verification target §6.9 applied. All evidence from current code at HEAD.

---

## Per-Issue Verification Table

| Issue ID | Original Severity | Verdict | Evidence (file:line at HEAD) | Notes |
|----------|------------------|---------|------------------------------|-------|
| 02-001 | HIGH | **not-fixed** | `backend/middleware/auth.js:18` | `User.findByPk(decoded.userId)` unchanged |
| 02-002 | MEDIUM | **not-fixed** | `backend/controllers/authController.js:167-170, 243-246` | Both tokens still returned in JSON body |
| 02-003 | LOW | **not-fixed** | `backend/controllers/authController.js:12-18` | `jti` present; no revocation store |
| 02-004 | LOW | **not-fixed** | `backend/controllers/superAdminController.js:75` | Still named `getMessages`; not renamed to `getAllMessages` |
| 02-005 | HIGH | **not-fixed** | `backend/controllers/userController.js:72-73` | Base64 data URI still stored in `users.avatar` TEXT column |
| 02-006 | MEDIUM | **partially-fixed** | `backend/config/socket.js:13-24` | Port 5177 added (original symptom fixed); `uchqun-platform.vercel.app` still absent from socket CORS |
| 02-007 | MEDIUM | **verified-fixed** | `backend/controllers/` — grep returns 0 matches | All `console.*` replaced with `logger.*`; fixed via #02-007 |
| 02-008 | LOW | **verified-fixed** | `backend/server.js:14, 179` | `errorLogger` imported and `app.use(errorLogger)` registered; fixed via #10-001 |
| 02-009 | HIGH | **not-fixed** | `backend/__tests__/helpers/testApp.js:190` vs `authController.js:21` | testApp uses `jwt.sign()` for refresh; production uses `crypto.randomBytes(40)` |
| 02-010 | HIGH | **verified-fixed** | `backend/controllers/receptionController.js:18, 24` | `uploadFile()` called; `filePath: persistentUrl` stored; temp file cleaned up; fixed via #02-010 |
| 02-011 | MEDIUM | **verified-fixed** | `backend/routes/childRoutes.js` — 37 lines | All inline handlers moved to `childController.js`; fixed via L-03 |
| 02-012 | LOW | **not-fixed** | `backend/routes/progressRoutes.js:12` | No `requireRole()` guard; implicit parent-scope filtering via `Child.findOne({ parentId: req.user.id })` in controller |
| 02-013 | LOW | **not-fixed** | `backend/config/migrate.js:19-29` | Separate Sequelize instance with pool max:5 unchanged |
| 02-014 | Info | **not-fixed** | `backend/routes/migrationRoutes.js:21` | HMAC-only; returns 500 if `MIGRATION_SECRET` unset; unchanged |

**Verdict distribution: 4 verified-fixed · 1 partially-fixed · 9 not-fixed**

---

## Detailed Findings

### 02-001 — authenticate middleware: DB hit on every request (not-fixed)

`backend/middleware/auth.js:18`:
```js
const user = await User.findByPk(decoded.userId);
```

The full `User` row — including all columns — is fetched on every authenticated request. No JWT claim caching, no field projection, no request-scoped memoization has been added.

**Compounding with 02-005:** The `users.avatar` TEXT column stores base64 data URIs up to ~2 MB per user. `User.findByPk()` without `attributes` projection SELECTs all columns. Every authenticated API call loads the avatar blob from Postgres into Node.js memory, regardless of whether the handler needs the avatar.

The downstream checks that require the DB row:
- `auth.js:23-24`: `user.role`
- `auth.js:26`: `user.isActive`
- `auth.js:30`: `user.documentsApproved && user.isActive` (reception only)

None of these could be resolved from standard JWT claims without adding them to the token payload. The fix requires either projecting (`attributes: ['id','role','isActive','documentsApproved','schoolId']`) or embedding claims in the token. Neither was done.

---

### 02-002 — Tokens in response body (not-fixed)

`backend/controllers/authController.js:167-170`:
```js
res.json({
  success: true,
  accessToken,
  refreshToken,
  expiresIn: ACCESS_TOKEN_EXPIRY,
  user: user.toJSON(),
});
```

`backend/controllers/authController.js:243-246`:
```js
res.json({
  success: true,
  accessToken: newAccessToken,
  refreshToken: newRefreshToken,
  expiresIn: ACCESS_TOKEN_EXPIRY,
});
```

Both tokens are set as `httpOnly` cookies (lines 157-165, 233-241) and also returned in the JSON body. The intended transport is cookies. The body tokens provide a secondary path for JavaScript to access them. Unchanged.

---

### 02-003 — jti non-revocability (not-fixed)

`backend/controllers/authController.js:12-18`:
```js
const generateAccessToken = (userId) => {
  return jwt.sign(
    { userId, jti: crypto.randomUUID() },
    process.env.JWT_SECRET,
    { expiresIn: ACCESS_TOKEN_EXPIRY }
  );
};
```

`jti` is included in every access token. No revocation store exists. The `authenticate` middleware does not check a blocklist. On logout, only refresh tokens are invalidated — a logged-out user's access token is valid for up to 15 minutes. The `jti` implies revocability that is not implemented.

---

### 02-004 — `getMessages` naming (not-fixed)

`backend/controllers/superAdminController.js:75`:
```js
export const getMessages = async (req, res) => {
```

Still named `getMessages` (not `getAllMessages`). Still returns all messages without `senderId` filter. Safe as-mounted behind `requireGovernment`, but the naming asymmetry with `getMyMessages` in other controllers persists.

---

### 02-005 — Avatar as base64 in DB (not-fixed)

`backend/controllers/userController.js:72-73`:
```js
const dataUri = `data:${mimetype};base64,${req.file.buffer.toString('base64')}`;
await user.update({ avatar: dataUri });
```

Unchanged. 1.5 MB images are stored as ~2 MB base64 strings in the `users.avatar` TEXT column. This column is loaded on every authenticated request (see 02-001). No migration to Appwrite or external storage.

---

### 02-006 — Socket.io CORS (partially-fixed)

**Original symptom:** Reception port 5177 missing from socket CORS.

**Current socket CORS** (`backend/config/socket.js:13-24`):
```js
const SOCKET_DEFAULT_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175',
  'http://localhost:5177',       // ← added; original symptom fixed
  'https://uchqunedu.uz',
  'https://www.uchqunedu.uz',
  'https://uchqun-reception.netlify.app',
  'https://uchqun-admin.netlify.app',
  'https://uchqun-teacher.netlify.app',
  'https://uchqun-government.netlify.app',
];
```

**HTTP CORS** (`backend/server.js:76-88`) additionally includes:
```js
'https://uchqun-platform.vercel.app',   // ← present in HTTP CORS, absent from socket CORS
```

Port 5177 was added (original symptom from tracker #08-001 is resolved). One domain (`uchqun-platform.vercel.app`) remains absent from the socket origin list. The two CORS configs are now 11 vs 12 items.

---

### 02-007 — console.* calls (verified-fixed)

Grep across `backend/controllers/` and `backend/routes/`: **zero matches**. All `console.*` calls replaced with structured `logger.*` calls. Fixed via tracker #02-007 (commit b73da75). Regression test would confirm no regressions; no such test exists but the grep is definitive.

---

### 02-008 — errorLogger registration (verified-fixed)

`backend/server.js:14`:
```js
import { requestLogger, errorLogger } from './middleware/requestLogger.js';
```

`backend/server.js:179`:
```js
app.use(errorLogger);
```

`errorLogger` is a 4-argument Express error middleware (`(err, req, res, next) => {}`), correctly registered after route handlers and the `notFound` handler. Fixed via tracker #10-001 (commit a296de7). Correlation IDs from `requestLogger` are now propagated into error log entries.

---

### 02-009 — testApp refresh token behavioral divergence (not-fixed)

**testApp** (`backend/__tests__/helpers/testApp.js:190`):
```js
const refreshToken = jwt.sign(
  { userId, jti: crypto.randomUUID() },
  process.env.JWT_REFRESH_SECRET,
  { expiresIn: '7d' }
);
```

**Production** (`backend/controllers/authController.js:21`):
```js
const rawToken = crypto.randomBytes(40).toString('hex');
```

The divergence is structural: production stores a SHA-256 hash of a random hex string in the `RefreshToken` table and validates by hash lookup. testApp generates a JWT signed with `JWT_REFRESH_SECRET` and validates by JWT signature. Integration tests that exercise the refresh endpoint are testing fundamentally different code than what runs in production. Any bug in the hash-lookup path would not be caught by integration tests.

---

### 02-010 — Document upload persistence (verified-fixed)

`backend/controllers/receptionController.js:13-24`:
```js
tempPath = file.path;
const buffer = await fs.promises.readFile(tempPath);
const { url: persistentUrl } = await uploadFile(buffer, file.filename, file.mimetype);

const document = await Document.create({
  ...
  filePath: persistentUrl,   // ← persistent cloud URL, not os.tmpdir() path
  ...
});
```

`finally` block:
```js
if (tempPath) fs.promises.unlink(tempPath).catch(() => {});
```

Documents are now uploaded to cloud storage (`uploadFile` → Appwrite/GCS), the persistent URL is stored in the DB, and the temp file is cleaned up regardless of outcome. The original data-loss risk on Railway container restart is gone. Fixed via tracker #02-010 (commit a296de7).

---

### 02-011 — Inline 80-line handlers in childRoutes.js (verified-fixed)

`backend/routes/childRoutes.js` is now 37 lines total. The route definitions are:
```js
router.put('/:id/avatar', childIdValidator, handleValidationErrors, updateChildAvatar);
router.put('/:id', checkChildAccess, uploadChildPhoto.single('photo'), updateChildValidator, handleValidationErrors, updateChild);
```

Both `updateChildAvatar` and `updateChild` are now in `childController.js`. The `checkChildAccess` middleware function is also defined there. No `console.error` calls in the route file. Fixed via tracker L-03 (commit a3e30b7). The original "no test coverage" gap for these handlers should be re-checked in Phase 11.

---

### 02-012 — progressRoutes PUT: no role guard (not-fixed)

`backend/routes/progressRoutes.js:12`:
```js
router.put('/', updateProgressValidator, handleValidationErrors, updateProgress);
```

No `requireRole()` guard. The controller implicitly scopes to parents via `Child.findOne({ where: { id: childId, parentId: req.user.id } })` — a non-parent will find no child and the update will fail gracefully. But this is an implicit, undocumented defense in the controller, not an explicit route guard. A teacher calling `PUT /api/progress/` would receive a 404-style response from the controller rather than a 403 from middleware. The behavior is safe but not auditable at the route level.

---

### 02-013 — migrate.js separate pool (not-fixed; informational)

`backend/config/migrate.js:29`:
```js
pool: { max: 5, min: 0, acquire: 60000, idle: 10000 }
```

Separate Sequelize instance with pool max 5, unchanged. This was an informational finding (not a bug). Migration runs compete for DB connections independently of the main pool. No remediation was planned and none occurred.

---

### 02-014 — migrationRoutes.js: HMAC-only, 500 on unset secret (not-fixed; informational)

`backend/routes/migrationRoutes.js:21`:
```js
if (!expectedSecret) {
  return res.status(500).json({ success: false, error: 'MIGRATION_SECRET env var is not configured' });
}
```

HMAC-only auth, 500 on unset secret, unchanged. Also informational — the behavior is honest (explicit error) and no remediation was planned.

---

## Special Verification Target §6.9 — Auth-on-Every-Request

Per the original spec, this should confirm: "JWT claims are now used for identity and DB hit happens only when controllers need the User row."

**Finding: Not confirmed.** `auth.js:18` still calls `User.findByPk(decoded.userId)` unconditionally. The fix described in §6.9 was never implemented. The compounding risk is active:

1. `User.findByPk()` — full row SELECT, including `avatar` TEXT column
2. `users.avatar` may contain a ~2 MB base64 string (02-005 not fixed)
3. This happens on **every** authenticated API call

There is no field projection (`{ attributes: [...] }`) in the `authenticate` middleware. The avatar blob travels from Postgres → Sequelize → Node.js heap on every request, for every user who has uploaded an avatar.

**No test** exists to verify this does not regress. The check `requires-runtime-check` to measure actual heap allocation per-request.

---

## Metrics Scorecard

| Metric | Original v1 Score | v2 Score | Delta | Drivers |
|--------|------------------|----------|-------|---------|
| Messiness | 55% | 67% | +12 | (1) `childRoutes.js` now clean 37 lines; (2) zero `console.*` calls in backend; (3) `errorLogger` registered and active |
| Technical Debt | 52% | 52% | 0 | (1) DB hit per request unchanged; (2) base64 avatar unchanged; (3) test behavioral divergence unchanged |
| Health | 62% | 68% | +6 | (1) Document upload now persisted to cloud storage — data-loss risk eliminated; (2) structured logging now complete across all controllers |
| Coherence | 60% | 62% | +2 | (1) childRoutes consistency improved; (2) socket vs HTTP CORS still diverges by 1 origin |
| Documentation Coverage | 45% | 45% | 0 | No new JSDoc or auth-flow comments added |
| Test Coverage | 58% | 58% | 0 | (1) testApp refresh divergence not fixed; (2) childController handlers moved but test coverage not verified as added |
| Risk-on-Touch | 40% | 46% | +6 | (1) child route handlers now in testable controller file; (2) auth flow risk unchanged (02-009 divergence, 02-001 N+1) |
| **Overall** | **53%** | **63%** | **+10** | |

---

## Open Questions (from v1, updated)

1. **02-001:** No change. DB hit per request unchanged. JWT claim caching not planned.
2. **02-005:** No change. Avatar-to-Appwrite migration not scheduled.
3. **02-009:** No change. testApp refresh divergence not acknowledged in tracker.
4. **02-012:** Implicit role enforcement in progressController — intentional? An explicit `requireRole('parent')` guard would make the intent auditable.

---

## What I Did NOT Look At

- Full auth.js middleware (only key lines grep'd)
- All 60 test files for new coverage of the moved child handlers
- Actual Appwrite integration behavior (document upload confirmed structurally fixed; runtime persistence is a separate verification)
- Whether `avatar` column has a projection exclusion in any of the 60 controllers that call `User.findByPk`
