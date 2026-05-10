# Phase 02 — Backend Audit

**Generated:** 2026-05-07  
**Auditor:** Claude Code (claude-sonnet-4-6)  
**Audit mode:** READ ONLY — no project files were modified.

---

## Executive Summary

The backend is a well-structured Express monolith that handles 25 route namespaces, 41 controllers, and 10 middleware layers. The auth system is solid: JWT-based with rotating refresh tokens, HTTP-only cookies, per-account login lockout, and reception/admin activation gates. The middleware chain is correctly ordered and provides defense-in-depth (Helmet, CORS, sanitization, correlation IDs, rate limiting).

However, several critical issues exist: every authenticated request queries the database for the full user record rather than reading JWT claims, which creates N+1 DB hits on every API call. Inline business logic appears in route files (not controllers). 17 `console.*` calls bypass the structured logger. Refresh tokens are randomly generated hex strings but the testApp re-implements the refresh flow using JWT signatures — a silent behavioral divergence. The avatar storage pattern writes base64 data URIs to a TEXT column, which will bloat the users table with multi-megabyte rows. The `errorLogger` middleware is defined but never registered, creating a dead code path. The in-memory login lockout is not Redis-backed and will not survive container restarts or multi-instance deploy.

---

## Scope

**Inspected:** All files under `backend/` — 25 route files, 41 controllers, 10 middleware files, 9 utils, 11 validators, config/, models/ (index only), all `__tests__/` files.  
**Not inspected:** Individual migration files (Phase 3), individual model definitions (Phase 3).

---

## 2.1 — Service Topology

```
Client (browser / API consumer)
    ↓ HTTPS (TLS terminated at Railway)
Express HTTP server (port 5000, single process)
    ├── Middleware stack (10 layers, see §2.3)
    ├── 25 route namespaces
    ├── 41 controllers (flat + admin/ + parent/ subdirs)
    └── Socket.io (in-memory, same process, same port)
            └── JWT-authenticated WS connections
PostgreSQL 15 (Railway managed)
    └── Sequelize 6 ORM
Appwrite Cloud
    └── File/media storage via node-appwrite 13
OpenAI SDK / OpenRouter
    └── AI chat completions (parent AI + teacher AI)
Winston + Google Cloud Logging (production)
Sentry (conditional on SENTRY_DSN)
```

**No background workers, cron jobs, or message queues exist.** All async operations (stats generation, AI warning analysis) are on-demand via API endpoints. This is a single-instance, single-process service.

---

## 2.2 — Route Inventory

### Full Route Table

| Mount prefix | File | Auth guard | Key verbs | Notes |
|---|---|---|---|---|
| `/health` | `health.js` | none | GET | Also duplicated inline at `server.js:57` before middleware |
| `/api/auth` | `authRoutes.js` | mixed | POST login, POST refresh, POST set-password, GET me, POST logout, POST admin-register | login/refresh/set-password use `authLimiter`; admin-register also uses `uploadLimiter` |
| `/api/admin` | `adminRoutes.js` | `authenticate + requireAdmin` | CRUD receptions, documents, GET teachers/parents/groups, GET statistics, GET school-ratings | Barrel import from `adminController.js`; `sendMessage` from `superAdminController.js` |
| `/api/reception` | `receptionRoutes.js` | `authenticate + requireReception` | Document upload, CRUD teachers/parents/children, GET groups | Uses `upload.fields` for child photo; dual `message-to-government` + `message-to-super-admin` alias |
| `/api/parent` | `parentRoutes.js` | `authenticate + requireParent` per route | GET children/activities/meals/media, ratings, school-rating, schools, messages, evaluations, emotional-monitoring | Barrel import from `parentController.js`; `/:parentId/data` uses `requireAdminOrReception` |
| `/api/teacher` | `teacherRoutes.js` | `authenticate + requireTeacher` (global) | Profile, responsibilities, tasks, work-history, parents (read-only), groups, ratings, AI chat, emotional monitoring CRUD | `requireTeacher` allows teacher + reception + admin |
| `/api/government` | `governmentRoutes.js` | `authenticate + requireGovernment` (except messages POST) | Overview/stats, CRUD admins, CRUD government users, messages CRUD, admin registrations | Stats generation on-demand; `POST /messages` gated by `requireRole(parent,teacher,reception,admin,business,government)` before global guard |
| `/api/business` | `businessRoutes.js` | `authenticate + requireRole(business,government)` | GET overview/users/usage, POST stats/generate, GET stats | Business analytics; government can also access |
| `/api/child` | `childRoutes.js` | `authenticate` (role checks inline) | GET list/single, DELETE (admin/reception/government), PUT (role-inline), PUT /:id/avatar | 80-line inline middleware for PUT /:id (not a controller) |
| `/api/user` | `userRoutes.js` | `authenticate` | PUT profile/avatar/password | `passwordResetLimiter` on password; avatar via `uploadUserAvatar.single('avatar')` |
| `/api/activities` | `activityRoutes.js` | `authenticate` + role per write | GET list/single, POST/PUT/DELETE (teacher/admin/reception) | Uses query validators |
| `/api/media` | `mediaRoutes.js` | `authenticate` + role per write | GET list/single, POST /upload (multipart, Appwrite), POST / (URL-based legacy), PUT/DELETE | Proxy endpoint `GET /proxy/:fileId` for Appwrite files |
| `/api/meals` | `mealRoutes.js` | `authenticate` + role per write | GET list/single, POST/PUT/DELETE (teacher/admin) | |
| `/api/chat` | `chatRoutes.js` | `authenticate` | GET messages, POST messages, POST read, PUT messages/:id, DELETE messages/:id, GET unread-count, GET conversations | AI-assisted chat between parent and teacher; schoolScope not applied |
| `/api/notifications` | `notificationRoutes.js` | `authenticate` | GET list, GET count, PUT /:id/read, PUT /read-all, DELETE /:id | |
| `/api/progress` | `progressRoutes.js` | `authenticate` | GET /, PUT / | No /:id — single flat endpoint per user; no role guards on PUT |
| `/api/groups` | `groupRoutes.js` | `authenticate` + role per write | GET list/single, POST/PUT/DELETE (reception only) | |
| `/api/therapy` | `therapyRoutes.js` | `authenticate` + role per write | GET list/usage, POST /:id/start, PUT /usage/:id/end, GET /:id, POST/PUT/DELETE (admin/teacher) | Route ordering comment present (specific before generic) |
| `/api/ai-warnings` | `aiWarningRoutes.js` | `authenticate` + role per write | POST /analyze, GET /, PUT /:id/resolve, POST /:id/notify | Only admin/government can analyze/resolve/notify |
| `/api/assessments` | `childAssessmentRoutes.js` | `authenticate` + role per write | GET list, GET /latest, POST/PUT (teacher/admin) | |
| `/api/service-plans` | `servicePlanRoutes.js` | `authenticate` + role per write | GET /, POST / (upsert), POST /bulk | No DELETE; no /:id GET |
| `/api/meal-plans` | `mealPlanRoutes.js` | `authenticate` + role per write | (not yet read) | |
| `/api/resources` | `teacherResourceRoutes.js` | `authenticate` + role per write | (not yet read) | |
| `/api/news` | `newsRoutes.js` | `authenticate` + role per write | GET list/single, POST/PUT/DELETE (admin only) | |
| `/api/migrations` | `migrationRoutes.js` | HMAC secret only (no JWT) | POST /run | Secured by `MIGRATION_SECRET` via timing-safe equal; no `authenticate` middleware |
| `/api/docs` | swagger-ui | dev only | GET | Conditionally mounted |

**Total: 25 route prefixes, ~120 individual route handlers.**

### Legacy alias routes (`message-to-super-admin`)

The following 5 route files each define both `/message-to-government` and `/message-to-super-admin` pointing to the same `sendMessage` handler:

| Route file | Legacy alias |
|---|---|
| `adminRoutes.js:46` | `POST /api/admin/message-to-super-admin` |
| `receptionRoutes.js:69` | `POST /api/reception/message-to-super-admin` |
| `parentRoutes.js:69` | `POST /api/parent/message-to-super-admin` |
| `teacherRoutes.js:81` | `POST /api/teacher/message-to-super-admin` |
| `userRoutes.js:22` | `POST /api/user/message-to-super-admin` |

These 5 dead aliases cost nothing functionally but signal incomplete rename work.

---

## 2.3 — Middleware Chain

Actual registration order in `server.js`:

```
1. GET /health (inline, before all middleware)
2. securityHeaders (Helmet)
3. enforceHTTPS (production only, skips /health again — redundant check)
4. CORS
5. requestLogger (assigns correlationId UUID)
6. Request timeout (inline, 30s or 120s for uploads)
7. express.json({ limit: '10mb' })
8. express.urlencoded({ extended: true, limit: '10mb' })
9. cookieParser
10. sanitizeBody
11. express.static('/uploads')
12. apiLimiter (on /api/* only)
13. Route handlers
14. notFound handler
15. errorHandler
```

**Issue:** `requestLogger` runs before `cookieParser` and body parsers (steps 5 vs 7–9), so `req.user` is always undefined in request-start log lines. User identity only appears in response-completion logs. This means request-start logs are not attributable.

**Issue:** `enforceHTTPS` at step 3 has an internal `if req.path === '/health' return next()` guard — the same health check that was already skipped by the outer wrapper in `server.js:69–74`. Double guard is harmless but confusing.

**Not in chain:** `errorLogger` (defined in `requestLogger.js:52–68`) is never `app.use()`-registered anywhere. This is dead code.

**Not in chain:** `requireSchoolScope` / `schoolWhere` (`schoolScope.js`) are exported as utilities but never globally applied. They are manually called in individual controllers as needed — inconsistent use.

---

## 2.4 — Auth / AuthZ Flow

### JWT Setup

| Token | Type | Storage | Expiry | Signing key |
|---|---|---|---|---|
| Access token | JWT (HS256, `{userId, jti}`) | HTTP-only cookie `accessToken` + response body | 15m | `JWT_SECRET` |
| Refresh token | 40-byte random hex string (SHA-256 hashed for storage) | HTTP-only cookie `refreshToken` + response body | 7d | n/a — not a JWT |
| Set-password token | JWT (HS256, `{userId, purpose: 'set-password', jti}`) | Delivered out-of-band (email) | 24h | `JWT_SECRET` |

### authenticate middleware (`auth.js:4–48`)

1. Reads `accessToken` from cookie; falls back to `Authorization: Bearer <token>` header
2. Verifies signature and expiry with `jwt.verify()`
3. **Queries `User.findByPk(decoded.userId)` on every authenticated request** — this is a full DB roundtrip per request, making decoded JWT claims effectively unused for identity after verification
4. Checks `isActive` (skipped for parent and government roles)
5. Checks `documentsApproved && isActive` for reception role
6. Attaches full `User` model instance to `req.user`

**Issue (02-001):** The authenticate middleware fetches the full user record from the DB on every request. With 20 concurrent authenticated users, this is 20 extra queries per API call, all for data that is already attested by the signed JWT. The `userId` claim alone should be trusted for routing; the full user record should only be fetched when the handler needs fields not in the JWT. No caching or memoization exists.

### requireRole / requireTeacher inconsistency

```js
// auth.js:50 — generic factory
export const requireRole = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) return 403;
};

// auth.js:65 — special-cased, allows teacher + reception + admin
export const requireTeacher = (req, res, next) => {
  if (['teacher', 'reception', 'admin'].includes(req.user.role)) return next();
};
```

`requireTeacher` is not equivalent to `requireRole('teacher')`. It also allows `reception` and `admin`. This is used as the global guard on ALL teacher routes (`teacherRoutes.js:44–45`), which means:

- `GET /api/teacher/profile` → accessible to reception and admin users
- `GET /api/teacher/ai/chat` → accessible to reception and admin users
- `POST /api/teacher/ai/chat` → accessible to reception and admin users

This is likely intentional (admin oversight capability) but is undocumented in code and inconsistent with the role hierarchy description in CLAUDE.md.

### Login lockout (`authController.js:12–37`)

```js
const loginAttempts = new Map(); // in-process memory
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000;
```

- Single-instance only — container restart clears all lockout state
- Multi-instance deploy would require Redis-backed store
- Documented in CLAUDE.md under "Scaling Constraints"
- Lock state is keyed by normalized email, not IP — an attacker can bypass by using different IPs, but a legitimate user cannot be locked out by an attacker targeting a specific IP

### Token in response body (02-002)

`authController.js:194–199` returns both `accessToken` and `refreshToken` in the JSON response body, in addition to setting HTTP-only cookies. The intended transport is cookies. Returning tokens in the body provides a second storage path that frontend code could misuse (e.g., storing in localStorage). Both the parent AI controller and teacher vite.config show Bearer header usage in some flows, suggesting the body token is being consumed somewhere.

### Access token non-revocability (02-003)

Access tokens include a `jti` (unique identifier per token) but there is no revocation store. A logged-out user's access token remains valid for up to 15 minutes. The refresh token IS revoked on logout (all records for the user). The 15-minute window is short enough to be acceptable, but the `jti` field promises revocability that isn't implemented.

---

## 2.5 — Business Logic Issues

### Inline controller logic in route handlers (`childRoutes.js`)

`backend/routes/childRoutes.js:79–133` contains an 80-line inline `async` middleware function handling permission checks, parent scope enforcement, school scope enforcement, and file upload, directly inside the route file. This is controller logic that lives outside any controller file and outside any test suite.

`backend/routes/childRoutes.js:27–76` similarly has an inline avatar update handler with `import('../models/Child.js')` dynamic import — a pattern not used anywhere else in the backend.

These inline handlers use `console.error` (lines 69 and 124) instead of the structured logger, bypassing correlation ID tracking, PII redaction, and GCP log routing.

### superAdminController.js: no authZ on getMessages (02-004)

`superAdminController.js:75` — `getMessages` queries `SuperAdminMessage` without filtering by `senderId`. This function is only mounted on `GET /api/government/messages` behind `requireGovernment`, so government correctly sees all messages. But `getMyMessages` in other controllers (adminController's `adminMessageController.js`, etc.) independently implements per-sender filtering. The naming (`getMessages` vs `getMyMessages`) would suggest `getMessages` is scoped, but it is not. Safe as currently mounted, but a rename risk.

### Document upload stores temp path in DB (`receptionController.js:52`)

```js
const document = await Document.create({
  ...
  filePath: file.path,  // path in os.tmpdir() — wiped on container restart
});
```

Multer diskStorage writes the uploaded file to `os.tmpdir()/uchqun-uploads-temp/`. The `filePath` stored in the DB points to this temp path. On Railway, each deploy restart wipes the ephemeral filesystem. Any document uploaded and stored by this path becomes inaccessible after the next deploy. Media uploads correctly go to Appwrite, but document uploads do not — they stay on ephemeral disk and their path is permanently recorded in the DB.

### Avatar stored as base64 data URI in DB (02-005)

`userController.js:72–73`:
```js
const dataUri = `data:${mimetype};base64,${req.file.buffer.toString('base64')}`;
await user.update({ avatar: dataUri });
```

A 1.5 MB image becomes ~2 MB of base64 text stored in the `users.avatar` TEXT column. With many users, this will significantly bloat the users table. The column is SELECTed on every `User.findByPk()` — including the per-request `authenticate` middleware call (issue 02-001 above). Every authenticated request loads the avatar blob unnecessarily.

---

## 2.6 — Shared/Cross-Cutting Business Logic

### Rating score computation (`utils/governmentLevel.js`)

Three rating formats are supported with explicit priority order:
1. `evaluation` (JSONB with 10 boolean criteria) → score = (met/10) × 5
2. `numericRating` (1–10 INTEGER) → score = (n/10) × 5
3. `stars` (1–5 INTEGER, legacy)

This is clean and well-tested. `computeRatingScore`, `computeAverageRating`, `getGovernmentLevel`, `sortSchoolsByRating` are all pure functions covered by `__tests__/utils/governmentLevel.test.js`.

### Pagination (`utils/pagination.js`)

`parsePagination()` is a one-function utility: clamps limit to [1, 100], handles both offset and page-based pagination. Used in most list endpoints. Clean.

### schoolValidation (`utils/schoolValidation.js`)

`validateChildAccess(childId, req)` — checks child.schoolId matches req.user.schoolId. Only used in `activityController.js`. Not used in meal, media, or progress controllers. Inconsistent application of school scope checking across controllers.

---

## 2.7 — AI Services

### Parent AI (`controllers/parent/parentAIController.js`)

- Fetches parent's first child for context (limit 1)
- Constructs system prompt with disability context
- Language detection from `Accept-Language` header or `req.body.lang`
- Primary model: `OPENAI_MODEL` env var or `qwen/qwen-2.5-7b-instruct:free` (OpenRouter fallback)
- Fallback cascade on 402/404/credits error: fetches available free models from OpenRouter API, tries each in sequence
- Hardcoded fallback URL in HTTP-Referer header: `https://uchqun-production-2d8a.up.railway.app` (appears 3× at lines 115, 162, 185)
- Chat history from client: accepts up to last 8 exchanges, guards content to 4000 chars
- **No server-side persistence of conversation history** — client must send history on every request
- max_tokens: 500 (tight, 2–4 sentences as instructed)

### Teacher AI (`controllers/teacherController.js` → `getAIAdvice`)

- Separate AI endpoint for teachers at `POST /api/teacher/ai/chat`
- Shares the same pattern as parent AI but for teacher context

### Chat (`controllers/chatController.js`)

- Separate from AI: this is the parent↔teacher messaging feature
- `canAccessConversation()`: parent can only see own conversation; teacher can see conversations of parents whose children are in teacher's groups; reception can see parents they created; admin/government can see all
- Uses `ChatMessage` model (conversationId keyed as `parent:<parentId>`)
- Real-time via Socket.io (`emitToUser` in multiple controllers)

---

## 2.8 — Real-Time (Socket.io)

`config/socket.js` — in-memory, single-instance:

- JWT auth on connect: reads from `socket.handshake.auth.token` or `accessToken` cookie
- `userSockets` Map: userId → Set of socketIds (tracks multiple tabs)
- Room per user: `user:<userId>`
- `emitToUser(userId, event, data)` exported for controllers to call

**Issue (02-006):** Socket.io CORS origin is set from `FRONTEND_URL.split(',')` only. If `FRONTEND_URL` is not set, it defaults to only `localhost:5173/5174/5175` — missing reception port 5177. The HTTP Express CORS includes all 4 app ports plus hardcoded Netlify/Vercel domains. Socket.io origin list is a subset.

**Scaling constraint (documented in CLAUDE.md):** Socket.io is in-memory. A multi-instance deploy would lose cross-instance socket routing. No Redis adapter configured.

---

## 2.9 — Error Handling

`errorHandler` middleware (`middleware/errorHandler.js`) handles:

| Error type | HTTP code | Production behavior |
|---|---|---|
| `SequelizeValidationError` | 400 | Hides detail messages |
| `SequelizeUniqueConstraintError` | 409 | Generic message |
| `SequelizeDatabaseError` | 500 | Generic message + Sentry capture |
| JWT errors | 401 | Generic message |
| `err.status === 429` | 429 | Rate limit message |
| `err.status` 4xx | err.status | err.message |
| All others | 500 | Generic + Sentry capture |

In development, stack traces and detail messages are exposed. In production, all internal details are suppressed. Correct pattern.

**Issue (02-007):** 17 `console.error/warn/log` calls in controllers (`activityController.js` 7×, `mealController.js` 5×, `mediaController.js` 2×, `userController.js` 3×) and 2 in `childRoutes.js`. These bypass the Winston structured logger entirely: no correlationId, no PII redaction, no GCP routing in production. These surface in raw Node.js stderr only.

**Issue (02-008):** `errorLogger` (defined at `requestLogger.js:52`) is never registered as middleware. It is dead code.

---

## 2.10 — Logging

Winston logger (`utils/logger.js`):
- Production: `google-cloud/logging-winston` transport
- Development: file logs `error.log` / `combined.log`
- PII redaction applied to structured metadata fields

`requestLogger` middleware:
- Generates UUID v4 correlation ID per request (or reads `X-Correlation-ID` from incoming header)
- Logs request-start (but without user identity — cookies/body not yet parsed)
- Logs request-completion with status, duration, userId, role

---

## 2.11 — Config & Environment

`config/env.js` Joi validation runs on import (server startup). Validates:
- DB_* or DATABASE_URL required
- JWT_SECRET and JWT_REFRESH_SECRET must differ
- FRONTEND_URL multi-URL validator

`config/migrate.js` creates its own `Sequelize` instance separate from `config/database.js`. This means migration runs use a different connection pool configuration (max: 5) than the main app (max: 20 in database.js, max: 5 in migrate.js). The pools share the same DB credentials.

`config/socket.js` re-exports `User` from models — a side-effect export that couples the socket config module to the ORM. Used in the `initializeSocket` function only but visible at module level.

---

## 2.12 — Tests

**Test infrastructure:**

| Layer | Tool | DB |
|---|---|---|
| Unit / controller | Jest 30 + `jest.unstable_mockModule` | None (all mocked) |
| Integration (`auth`, `child`) | Jest + `testApp.js` | SQLite in-memory (sequelize) |
| Integration (`schoolIsolation`) | Jest | PostgreSQL 15 (CI service container) |
| Middleware | Jest + `supertest` | None / SQLite |

**Test file count:** 50+ test files, covering all 41 controllers plus all 10 middleware files plus all major utils.

**Coverage gaps:**

- `childRoutes.js` inline handlers (PUT /:id, PUT /:id/avatar) have no dedicated tests
- `parentEvaluationController.js` is imported directly in parentRoutes but tested via `parentSubControllers.test.js` (shared mock pattern)
- Schema divergence: `testApp.js` User model has `teacherId`, `groupId`, `createdBy` fields but omits `schoolId` — isolation tests relying on schoolId would not use testApp

**Critical behavioral divergence (02-009):**

`testApp.js:190` generates a refresh token using `jwt.sign({userId}, process.env.JWT_REFRESH_SECRET)` — a JWT signed with `JWT_REFRESH_SECRET`. Production `authController.js:48–58` generates refresh tokens as `crypto.randomBytes(40).toString('hex')` — a random hex string (NOT a JWT), stored as SHA-256 hash. The production `refresh` endpoint verifies by hash lookup, not JWT verify. These are completely different implementations. Integration tests for auth refresh exercise different code than production.

**Dead test:** `superAdmin.test.js` correctly tests `superAdminController.js` but the test file is named after the legacy name. The test will continue to pass because the controller filename hasn't changed.

---

## 2.13 — Dead Routes & Unused Exports

| Item | Location | Status |
|---|---|---|
| `errorLogger` | `requestLogger.js:52` | Defined, never registered |
| `POST /api/admin/message-to-super-admin` | `adminRoutes.js:46` | Active alias, intentional |
| `POST /api/reception/message-to-super-admin` | `receptionRoutes.js:69` | Active alias, intentional |
| `POST /api/parent/message-to-super-admin` | `parentRoutes.js:69` | Active alias, intentional |
| `POST /api/teacher/message-to-super-admin` | `teacherRoutes.js:81` | Active alias, intentional |
| `POST /api/user/message-to-super-admin` | `userRoutes.js:22` | Active alias, intentional |
| `uploadMultiple` | `middleware/upload.js:69` | Exported, never imported in any route |
| `uploadDocument` (named export) | `middleware/upload.js:72` | Named export, `uploadDocuments` is what's used |
| `parentChildController.js` | `controllers/parent/` | Re-exported via barrel; functions consumed by `parentRoutes.js` via `parentController.js` barrel |

---

## 2.14 — Issue Catalog

| ID | Severity | Location | Description |
|---|---|---|---|
| 02-001 | High | `middleware/auth.js:18` | `User.findByPk` on every authenticated request — N+1 DB hit per API call; consider caching or trusting JWT claims for role/schoolId |
| 02-002 | Medium | `controllers/authController.js:194` | Tokens returned in response body AND set as cookies — inconsistent dual storage; body tokens enable localStorage misuse |
| 02-003 | Low | `controllers/authController.js:44` | `jti` in access token suggests revocability but no revocation store exists; logout does not invalidate access tokens for up to 15m |
| 02-004 | Low | `controllers/superAdminController.js:75` | `getMessages` is unscoped (returns all messages); safe as-mounted behind `requireGovernment` but misleadingly named — rename to `getAllMessages` |
| 02-005 | High | `controllers/userController.js:72–73` | Avatar stored as base64 data URI in `users.avatar` TEXT column; each avatar is ~2MB; loaded on every authenticated request via `authenticate` → `User.findByPk` |
| 02-006 | Medium | `config/socket.js:14` | Socket.io CORS origin does not include all 4 frontend ports or Netlify/Vercel domains; inconsistent with HTTP CORS config |
| 02-007 | Medium | `controllers/activityController.js`, `mealController.js`, `mediaController.js`, `userController.js`, `routes/childRoutes.js` | 19 total `console.*` calls bypass Winston logger — no correlationId, no PII redaction, no GCP routing |
| 02-008 | Low | `middleware/requestLogger.js:52` | `errorLogger` defined but never registered — dead code |
| 02-009 | High | `__tests__/helpers/testApp.js:190` | Integration tests use JWT-based refresh tokens; production uses random-hex refresh tokens — fundamentally different behaviors tested vs deployed |
| 02-010 | High | `controllers/receptionController.js:52` | Document `filePath` stores temp filesystem path (`os.tmpdir()`); path is wiped on container restart; documents become inaccessible after each deploy |
| 02-011 | Medium | `routes/childRoutes.js:79–133` | 80+ lines of business logic in route file, not a controller; no test coverage; uses `console.error` |
| 02-012 | Low | `routes/progressRoutes.js` | `PUT /api/progress/` has no role guard — any authenticated user can update progress records; no scoping info in route |
| 02-013 | Low | `config/migrate.js` | Creates separate Sequelize instance with pool max 5; migration runs compete for connections separately from the main app pool |
| 02-014 | Info | `routes/migrationRoutes.js:15–40` | `POST /api/migrations/run` secured by HMAC secret only (no JWT); if `MIGRATION_SECRET` is not set, endpoint returns 500 (not 404); visible surface area |

---

## 2.15 — Per-Route Risk Table

Risk scores (0 = low risk, 5 = high risk) for on-touch modification:

| Route | Auth complexity | Business logic | Test coverage | Risk |
|---|---|---|---|---|
| `POST /api/auth/login` | Medium (lockout, multi-role gates) | High (lockout, bcrypt, cookie/body) | High | 3 |
| `POST /api/auth/refresh` | Medium (hash lookup) | High (token rotation) | Medium (test divergence) | **4** |
| `PUT /api/child/:id` | **High (inline, 80 lines)** | **High** | **None** | **5** |
| `PUT /api/child/:id/avatar` | Medium | Medium | None | **4** |
| `POST /api/government/messages` | Complex (pre-guard route order) | Low | Medium | 3 |
| `POST /api/auth/admin-register` | Low | Medium (doc upload) | Low | 3 |
| `POST /api/media/upload` | Medium (role guard) | High (Appwrite) | Low | 3 |
| `PUT /api/user/avatar` | Low | High (base64 DB write) | Low | 3 |
| `GET /api/government/overview` | Low (global guard) | High (6 separate try/catch DB queries) | Medium | 2 |
| All `*message-to-super-admin` | Low | Low | Medium | 1 |

---

## Scorecard

| Metric | Score | Observations |
|---|---|---|
| Messiness | 55% | `childRoutes.js` inline handlers, `console.*` leaks, dead `errorLogger` |
| Technical Debt | 52% | DB hit per request, base64 avatars, temp document paths, test divergence |
| Health | 62% | Good error handler, Sentry, structured logging mostly in place, validators present |
| Coherence | 60% | Consistent patterns in most controllers; inconsistencies in role guards and schoolScope application |
| Documentation Coverage | 45% | JSDoc comments in some controllers; zero comments on many auth flow decisions; no API contract docs except Swagger (dev only) |
| Test Coverage | 58% | 50+ test files; critical gaps in childRoutes inline handlers and auth refresh behavioral parity |
| Risk-on-Touch | 40% | Auth controller, child routes, and refresh flow all have non-obvious behavior that tests don't catch |
| **Overall** | **53%** | |

---

## Open Questions for Product / Tech Lead

1. **authenticate DB hit (02-001):** Is there a plan to move role/schoolId into JWT claims to avoid the per-request DB query? This would require token rotation on role/school change, but doubles throughput on auth-heavy endpoints.

2. **Avatar storage (02-005):** Should avatars be migrated to Appwrite (alongside media) or to a CDN, and the DB column cleared? Current approach is not scalable.

3. **Document upload to ephemeral disk (02-010):** Should reception document uploads go to Appwrite (like media), or is this an intentional legacy behavior pending migration?

4. **`requireTeacher` allowing reception + admin (auth.js:69):** Is this intentional for all teacher routes, or should it be scoped to specific read-only endpoints?

5. **Refresh token test divergence (02-009):** Integration tests pass but test different code than production. Should the testApp be updated to match production refresh token behavior?
