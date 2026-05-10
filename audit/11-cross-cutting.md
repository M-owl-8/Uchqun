# Phase 11 — Cross-Cutting Audit
## Scope: Security infrastructure, CI/CD, environment config, shared library, dependency health, logging, input validation

> Audit only — no modifications to project files.
> All file references include path + line range.

---

## Scorecard

| Metric | Score | Notes |
|--------|-------|-------|
| Security Infrastructure | 68/100 | Helmet/HSTS/CORS solid; errorLogger dead; AI endpoints rate-limit gap (Phase 08) |
| CI/CD Pipeline | 63/100 | Tests + security audit + build all run; no coverage threshold; backend lint only |
| Environment Config | 55/100 | Fail-fast on missing secrets; JWT_EXPIRE=30d default; no `.env.example` |
| Shared Library | 52/100 | api.js properly shared; contexts duplicated 5×; locales English-only |
| Dependency Health | 68/100 | No abandoned packages; jsdom in prod deps; two HTML sanitizers; OpenAI SDK stale |
| Input Validation Coverage | 38/100 | 9 of 22 route groups have validators; admin/reception/teacher/parent all missing |
| Logging | 60/100 | PII redaction present; 17 console.* bypasses; errorLogger defined but unused |
| Deployment Config | 42/100 | nixpacks.toml specifies Node 18 vs ≥20 requirement; no .env.example |
| **Overall** | **56/100** | |

---

## 1. Security Infrastructure

### 1.1 What Is Correct

**Middleware stack order** — [`backend/server.js`](backend/server.js) registers layers in the correct defensive order:

```
Line 67:  securityHeaders (Helmet)
Line 72:  enforceHTTPS (production redirect)
Line 101: cors() — origin validated
Line 124: requestLogger + correlation ID
Line 138: express.json() / urlencoded
Line 140: cookieParser
Line 141: sanitizeBody — removes HTML from all string fields
Line 146: apiLimiter — rate limit on /api/*
[routes]
Line 178: notFound (404)
Line 179: errorHandler
```

**Helmet + HSTS**: Security headers enforced globally. HSTS header is set at `max-age=31536000` with `includeSubDomains` and `preload`. Cross-origin resource policy is `cross-origin` (correct for upload storage).

**CORS**: [`backend/server.js:101–122`](backend/server.js#L101) — the origin check is a regex, not a substring match. C-07 is functionally resolved:

```js
/^https:\/\/(deploy-preview-\d+--)?uchqun-[a-z-]+\.(netlify|vercel)\.app$/
```

Deploy-preview URLs are matched precisely; arbitrary subdomains are not accepted. CLAUDE.md notes this still needs an explicit env-driven allowlist before launch — that work is still pending but the current regex is not exploitable.

**Rate Limiting** — [`backend/middleware/rateLimiter.js`](backend/middleware/rateLimiter.js) is well-structured with four tiers:

| Limiter | Limit | Notes |
|---------|-------|-------|
| Global API | 100 req / 15min (prod) | Applied to all `/api/*` |
| Auth | 50 req / 15min (prod) | Skips on success |
| Password reset | 3 req / hour | Appropriately strict |
| Upload | 50 uploads / 15min (prod) | Per IP |

**PII Redaction in Logs** — [`backend/utils/logger.js:26–49`](backend/utils/logger.js#L26) redacts `password`, `token`, `authorization`, and `email` fields in all log output. This is correct behavior.

---

### Issue 11-001 — MEDIUM: `errorLogger` Middleware Defined But Never Registered

[`backend/middleware/requestLogger.js:52–68`](backend/middleware/requestLogger.js#L52) exports `errorLogger`, a 4-argument Express error middleware that attaches the request correlation ID to error log entries:

```js
export const errorLogger = (err, req, res, next) => {
  logger.error('Request error', {
    correlationId: req.correlationId,
    method: req.method,
    path: req.path,
    ...
  });
  next(err);
};
```

[`backend/server.js`](backend/server.js) does not import or register `errorLogger`. The `errorHandler` middleware (line 179) re-logs errors independently but does not attach the correlation ID from `requestLogger`. Errors in production logs are missing the correlation ID that would link them to their incoming request, making cross-referencing slow in incident response.

The fix is one line in `server.js`:

```js
app.use(errorLogger);  // before errorHandler
app.use(errorHandler);
```

This was first noted in Phase 02 and remains unresolved.

---

## 2. CI/CD Pipeline

### 2.1 What Is Correct

[`.github/workflows/ci.yml`](.github/workflows/ci.yml) runs five jobs on every push:

| Job | What it does |
|-----|-------------|
| `lint` | ESLint on backend with `--max-warnings 0` |
| `security` | `npm audit --audit-level=high` on backend + all 4 frontends |
| `test-backend` | Jest with PostgreSQL 15 service container |
| `test-frontend` | Vitest matrix (admin, teacher, reception, government); **fails on zero test files** |
| `build` | Vite build for all 4 frontends |

The `test-frontend` job explicitly fails if no test files are found — this prevents apps from silently shipping zero coverage.

Node version: **20** in CI (correct, matches `engines` requirement).

---

### Issue 11-002 — MEDIUM: No Test Coverage Threshold Enforced in CI

[`backend/jest.config.js`](backend/jest.config.js) defines `collectCoverageFrom` but sets no `coverageThreshold`. The CI `test-backend` job runs `npm test` without `--coverage`. A PR can pass CI with 0% line coverage for newly added controllers and middleware.

For context, Phase 08 found zero tests for the teacher AI endpoint and zero tests for the AI warning system. Phase 09 found zero tests for the entire parent portal (`teacher/src/parent/`). None of these gaps currently fail CI.

---

### Issue 11-003 — LOW: Frontend Linting Not Run in CI

The `lint` job in [`ci.yml`](.github/workflows/ci.yml) runs ESLint only on `backend/`. The four frontend apps have ESLint configs (all extend the same base) but are not linted during CI. Frontend lint issues — such as the `showToast` undefined destructure found in Phase 05 — are invisible to CI.

---

## 3. Deployment Configuration

### Issue 11-004 — HIGH: `nixpacks.toml` Specifies Node 18 — Mismatches `engines: >=20` Requirement

[`backend/nixpacks.toml`](backend/nixpacks.toml):

```toml
[phases.setup]
nixPkgs = ["nodejs-18_x"]
```

[`backend/package.json`](backend/package.json) and root [`package.json`](package.json) both declare:

```json
"engines": { "node": ">=20.0.0", "npm": ">=9.0.0" }
```

Railway uses `nixpacks.toml` to provision the runtime. The backend is running on Node 18 in production while the code is developed and tested against Node 20 in CI. Node 18 reached End of Life on April 30, 2025. The gap between what CI tests and what Railway deploys is a silent reliability risk — any Node 20-specific behavior (improved fetch API, newer V8, updated crypto) would not be caught before reaching production.

The fix is a one-line change: `nixPkgs = ["nodejs_20"]`.

First noted in Phase 00 as unresolved.

---

### Issue 11-005 — MEDIUM: No `.env.example` File

No `.env.example` exists at the repo root or in `backend/`. Developers and deployment pipelines must reverse-engineer required environment variables from [`backend/config/env.js`](backend/config/env.js), the Joi schema, and `docker-compose.yml` comments.

Required secrets that have no default and will hard-crash the app on startup if missing:
- `JWT_SECRET` (min 32 chars)
- `JWT_REFRESH_SECRET` (min 32 chars)
- `FRONTEND_URL`
- One of: `DATABASE_URL` OR `DB_NAME` + `DB_USER` + `DB_PASSWORD`

Optional integrations (AI, storage, notifications, error tracking) are scattered across `env.js` with no single reference document.

---

## 4. Shared Library Health

### 4.1 What Is Correct

[`shared/services/api.js`](shared/services/api.js) — the Axios factory with refresh token interceptor is correctly centralized. All 5 consuming apps (admin, teacher, reception, government, teacher/parent) use `createApi()` from `@shared/services/api` rather than maintaining separate Axios instances. The mutex pattern in the interceptor prevents concurrent refresh floods.

### 4.2 Context Duplication

Five separate `ToastContext.jsx` files exist across the monorepo:

| File | Type |
|------|------|
| `shared/context/ToastContext.jsx` | Canonical shared |
| `admin/src/context/ToastContext.jsx` | Local copy |
| `reception/src/context/ToastContext.jsx` | Local copy |
| `government/src/context/ToastContext.jsx` | Local copy |
| `teacher/src/shared/context/ToastContext.jsx` | Teacher-level copy |
| `teacher/src/parent/context/ToastContext.jsx` | Parent-level copy (third in one bundle) |

Similarly, `AuthContext.jsx` has 5+ instances. This was catalogued in Phase 07 (design system) and Phase 09 (mobile removal). The correct fix — using the shared versions via the `@shared` Vite alias — was not applied when each app was built.

### Issue 11-006 — MEDIUM: `shared/locales/` Contains Only English

[`shared/locales/`](shared/locales/) has a single file: `en.json`. There are no `uz.json` or `ru.json` files in the shared locale directory.

The individual apps maintain their own locale files (`admin/src/locales/{uz,ru,en}/`, etc.) and function correctly. But the shared `en.json` is the source of `superAdmin.*` keys that Phase 06 flagged (the `superAdmin.title = "Super Admin"` key visible in the English government panel). Any i18n key that lives only in `shared/locales/en.json` has no Uzbek translation at the shared level — app-level overrides may cover this but the gap is invisible from the shared layer.

---

## 5. Dependency Health

### Issue 11-007 — MEDIUM: `jsdom` in Production Dependencies

[`backend/package.json`](backend/package.json) lists `jsdom@^27.4.0` as a production dependency (`dependencies`, not `devDependencies`). `jsdom` is a DOM simulation library used in test environments; its primary consumers are Jest and testing utilities. It adds ~7MB to the production bundle and a non-trivial attack surface (HTML parsing in Node). It should be moved to `devDependencies`.

---

### Issue 11-008 — LOW: Two HTML Sanitizers in Production — `sanitize-html` and `dompurify`

[`backend/package.json`](backend/package.json) includes both `sanitize-html@^2.17.2` and `dompurify@^3.3.1`. These serve the same purpose (stripping unsafe HTML). `dompurify` is primarily a browser-side library; running it in Node requires JSDOM (which is the `jsdom` dependency above). Using both is redundant and the chain `dompurify → jsdom` in server-side code is unconventional. `sanitize-html` is the correct server-side choice.

---

### Issue 11-009 — LOW: OpenAI SDK Outdated

`openai@^4.20.0` is specified. As of the audit date, the OpenAI Node SDK is at 4.67+. The gap is functionally significant — newer SDK versions add streaming helpers, revised model aliases, and updated error types. The `^` semver operator will only resolve within `4.x`, and `4.20` is well behind the current minor. A `npm update openai` would resolve this.

---

## 6. Input Validation Coverage

### Issue 11-010 — HIGH: 13 of 22 Route Groups Have No Input Validators

[`backend/validators/`](backend/validators/) contains 11 validator files. Grep confirms validators are attached in route definitions for only 9 route files:

**Routes WITH validators**: `activityRoutes`, `authRoutes`, `childRoutes`, `governmentRoutes`, `groupRoutes`, `mealRoutes`, `mediaRoutes`, `newsRoutes`, `userRoutes`

**Routes WITHOUT validators**:

| Route file | Unguarded operations |
|-----------|---------------------|
| `adminRoutes.js` | Create/update reception, teacher, parent accounts |
| `receptionRoutes.js` | Create teachers, parents with document uploads |
| `teacherRoutes.js` | Update task/monitoring records, school ratings |
| `parentRoutes.js` | Submit evaluations, update profile |
| `chatRoutes.js` | Send chat messages, create conversations |
| `childAssessmentRoutes.js` | Create/update assessments |
| `mealPlanRoutes.js` | Create meal plans |
| `notificationRoutes.js` | Send notifications |
| `progressRoutes.js` | Log progress records |
| `servicePlanRoutes.js` | Create service plans |
| `teacherResourceRoutes.js` | Upload resources |
| `businessRoutes.js` | Business account operations |
| `aiWarningRoutes.js` | Trigger AI analysis |

These routes reach controllers with no `handleValidationErrors` middleware in the chain. Controllers perform ad-hoc validation (checking that required fields are present) but there is no systematic type, length, or format checking before the controller runs.

Example from [`backend/routes/adminRoutes.js`](backend/routes/adminRoutes.js):

```js
router.post('/receptions', createReception);   // no validator
router.put('/receptions/:id', updateReception); // no validator
```

Compared to a validated route in [`backend/routes/authRoutes.js`](backend/routes/authRoutes.js):

```js
router.post('/login', loginValidator, handleValidationErrors, login);
```

The gap is most consequential for the admin and reception routes, which create user accounts with role assignments, document uploads, and school scoping. Malformed input to these endpoints reaches the Sequelize layer directly.

---

## 7. Logging

### 7.1 What Is Correct

[`backend/utils/logger.js`](backend/utils/logger.js) (166 lines) is a well-structured Winston logger:
- Structured JSON output in production
- PII redaction for `password`, `token`, `authorization`, `email` fields
- Google Cloud Logging transport in production (correct for Railway GCP backend)
- Sentry integration via `@sentry/node`
- Exception and rejection handlers in development

### Issue 11-011 — LOW: 17 `console.*` Calls in Controllers Bypass Structured Logger

Grep finds 17 `console.log/warn/error` calls across 4 controller files:

| File | Occurrences |
|------|------------|
| `controllers/activityController.js` | 7 |
| `controllers/mealController.js` | 5 |
| `controllers/userController.js` | 3 |
| `controllers/mediaController.js` | 2 |

Example from `mediaController.js:22`:
```js
console.warn('Sharp module not available, using original image');
```

These log lines bypass PII redaction, structured JSON format, correlation ID attachment, and the Google Cloud Logging transport. In production they appear only in Railway's raw stdout stream, not in the structured log sink.

---

## 8. Environment Configuration Detail

[`backend/config/env.js`](backend/config/env.js) — summary of all fields:

| Key | Default | Risk |
|-----|---------|------|
| `JWT_EXPIRE` | `'30d'` | ⚠️ Should be `'15m'` per auth design |
| `JWT_REFRESH_EXPIRE` | `'7d'` | ✅ Acceptable |
| `JWT_SECRET` | required | ✅ Fails fast if absent |
| `JWT_REFRESH_SECRET` | required | ✅ Fails fast if absent |
| `PORT` | `5000` | ✅ |
| `NODE_ENV` | `'development'` | ✅ |
| `OPENAI_MODEL` | `'gpt-3.5-turbo'` | ✅ |
| `OPENAI_MAX_TOKENS` | `500` | ✅ |
| `REDIS_URL` | optional | ℹ️ Login lockout is in-memory without this |
| `SENTRY_DSN` | optional | ℹ️ Error tracking silently disabled if absent |

The `JWT_EXPIRE = '30d'` default was first reported in Phase 08 (Issue 08-010) and remains unchanged. If no `JWT_EXPIRE` is set in production `.env`, access tokens last 30 days — eliminating the short-lived token security model entirely.

---

## 9. Issue Summary

| Issue | Severity | Location | Description |
|-------|----------|----------|-------------|
| `nixpacks.toml` deploys Node 18 — project requires ≥20 | HIGH | nixpacks.toml | Railway runtime 2 major versions behind CI; Node 18 is EOL |
| 13 route groups have no input validators | HIGH | adminRoutes, receptionRoutes, teacherRoutes, parentRoutes + 9 more | User-creation and write operations reach Sequelize with no systematic input validation |
| `errorLogger` defined but never registered in server.js | MEDIUM | middleware/requestLogger.js:52 | Error logs missing correlation ID; duplicated logging in errorHandler |
| No test coverage threshold in CI | MEDIUM | .github/workflows/ci.yml, jest.config.js | PRs can pass with 0% coverage; no enforcement floor |
| No `.env.example` file | MEDIUM | repo root / backend/ | Required env vars only discoverable by reading env.js source |
| Shared locales have only English | MEDIUM | shared/locales/ | No Uzbek/Russian in shared layer; app-level files partially compensate |
| `jsdom` in production dependencies | MEDIUM | backend/package.json | Test-only library in prod bundle; pulls in large DOM parser for server-side code |
| Frontend linting not run in CI | LOW | .github/workflows/ci.yml | ESLint runs only on backend; frontend issues invisible to CI |
| Two HTML sanitizers (sanitize-html + dompurify/jsdom) | LOW | backend/package.json | Redundant; dompurify→jsdom chain is unconventional server-side |
| OpenAI SDK ~47 minor versions behind | LOW | backend/package.json | openai@4.20 vs current 4.67+; streaming and error type changes |
| 17 `console.*` calls bypass structured logger | LOW | activityController, mealController, userController, mediaController | Bypass PII redaction, correlation IDs, Cloud Logging transport |

**Total: 2 HIGH · 5 MEDIUM · 4 LOW = 11 issues**

---

## 10. What's Actually Good

- **Helmet + HSTS + CORS**: Production security headers are correctly configured with a 1-year HSTS preload and precise regex-based CORS rather than a substring check.
- **Rate limiting architecture**: Four-tier rate limiting (global / auth / password-reset / upload) is well-designed and the limits are production-appropriate.
- **PII redaction in logger**: The Winston PII scrubber strips sensitive fields before they reach log storage — a proactive privacy control.
- **Fail-fast env validation**: The Joi schema in `env.js` prevents the server from starting with missing or invalid required configuration. JWT secret minimum lengths are enforced.
- **`npm audit` in CI**: Security audits run at `--audit-level=high` for all 5 apps on every push.
- **`sanitizeBody` middleware**: Registered globally before routes; strips HTML from all incoming string fields before any controller sees them.
- **api.js centralization**: Despite extensive context/component duplication, the Axios service layer is correctly shared — all 5 apps use `createApi()` from `@shared/services/api` and there is only one refresh-token interceptor.
- **Zero test file check**: CI explicitly fails if any frontend app has no test files, preventing silent zero-coverage shipping.
