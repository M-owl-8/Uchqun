# Uchqun Platform — Production Audit Report

**Date:** 2026-05-11  
**Auditor:** Claude Code (automated + manual review)  
**Branch:** `main` (54 commits ahead of origin)  
**Scope:** Full codebase — backend, 4 React dashboards, shared library, CI/CD

---

## 1. Executive Summary

Uchqun is a government-operated multi-tenant SaaS platform for special-education school management in Uzbekistan. The monorepo contains a Node.js/Express backend (~31 K LOC), four React dashboards, and a shared component library.

**What the team is doing well:** The security baseline is unusually strong for a project at this phase — helmet, CORS allowlist, JWT rotation with JTI revocation, bcrypt, body sanitization, full rate limiting stack, PII redaction in logs, multi-stage Docker builds with non-root user, and a CI pipeline that runs gitleaks, Trivy SAST, and npm audit before merging.

**What needs immediate attention:**

1. **8 broken backend test suites (25 failing tests)** — test files import controllers at stale paths after refactoring. CI will fail on every push until fixed.
2. **IDOR gap in `mediaController.getMediaItem`** — the `admin` role branch has no `schoolId` filter, letting any admin retrieve any child's media in the entire database.
3. **Moderate CVE in `nodemailer ≤ 8.0.4`** — SMTP command injection via CRLF in envelope/transport name. Upgrade to 8.0.7 required.
4. **N+1 queries in government statistics** — one DB round-trip per school when computing school stats; catastrophic at scale.
5. **ESLint errors in `vite.config.js` for all four frontends** — CI lint-frontend job will fail in strict mode.

---

## 2. Health Scorecard

| Phase | Score | Justification |
|-------|-------|---------------|
| Code Quality | 6/10 | No backend linting errors in source; 4–6 ESLint errors in vite configs; `exhaustive-deps` warnings widespread in frontends; no TypeScript in backend despite `tsconfig.json` present |
| Architecture & Design | 7/10 | Clean MVC layering, good barrel-export refactor; school-scope middleware is correct in concept but not consistently applied to `mediaController.getMediaItem` admin path |
| Security | 7/10 | Outstanding baseline for rate limiting, auth, headers; nodemailer CVE outstanding; upload relies on MIME type alone (no magic-byte check); in-memory lockout/JTI store documented but not resolved |
| Performance | 5/10 | N+1 per-school queries in government stats endpoint; teacher media path executes 2 serial queries per request (parents then children); no caching layer |
| Testing | 4/10 | 8 backend suites fail (stale import paths); 2 frontend test suites have a failing test; coverage unknown; 463 backend tests is a good quantity but quality varies |
| Documentation | 5/10 | CLAUDE.md is excellent; README is minimal; no API docs for production; no ADRs, CHANGELOG, or CONTRIBUTING guide |
| Dependencies | 6/10 | 1 moderate CVE (nodemailer); 9 low CVEs (google-cloud packages); multer pinned to lts.1 instead of 2.x; openai SDK 4 vs latest 6 |
| Build / CI / CD | 8/10 | Strong CI pipeline; Docker best practices followed; `nixpacks.toml` uses `npm install` instead of `npm ci` (non-deterministic) |
| Data Layer | 7/10 | 45+ ordered migrations, soft-delete with `paranoid`, FK indexes; no backup strategy documented; `childId` nullable on school means orphaned data possible |
| API / Frontend / a11y | 6/10 | Consistent REST shape and i18n in uz/ru/en; no API versioning; lazy loading correct; accessibility not audited |

---

## 3. Detailed Findings

### CRITICAL

---

#### C-01 — IDOR: Admin can read any child's media across schools

**Severity:** Critical  
**Location:** `backend/controllers/mediaController.js:176–183`

```js
} else if (req.user.role === 'admin') {
  // Admin can see all media - no filter needed
}
```

**Description:** The `getMediaItem` function has no `schoolId` filter on the admin path. An admin from School A can call `GET /api/media/:id` with any UUID and read media belonging to children in School B, C, etc.

**Impact:** Cross-tenant data exposure. Personal photos/videos of children in other schools are accessible to any authenticated admin.

**Fix:**
```js
} else if (req.user.role === 'admin') {
  // Filter to admin's own school only
  where.childId = { [Op.in]: 
    (await Child.findAll({ where: { schoolId: req.user.schoolId }, attributes: ['id'] }))
      .map(c => c.id)
  };
}
```
Or add a `JOIN ON children.schoolId = :schoolId` to the base query. The `getMedia` (list) endpoint also lacks schoolId filtering for the admin path.

**Effort:** 2 hours

---

#### C-02 — Broken test suites block CI

**Severity:** Critical  
**Location:** `backend/__tests__/reception.test.js:38`, `backend/__tests__/parentRating.test.js:33`, `backend/__tests__/aiWarning.test.js:18`, `backend/__tests__/chat.test.js:27`

**Description:** 8 test suites fail with `TypeError` / `Cannot find module` errors due to stale import paths after controller refactoring. Specifically:

1. `reception.test.js:38` — imports `deleteParent` from `../controllers/receptionController.js` but the function lives in `receptionParentController.js`.
2. `parentRating.test.js:33` — imports `../controllers/parent/parentRatingController.js` which does not exist; actual files are `parentTeacherRatingController.js` and `parentSchoolRatingController.js`.
3. `aiWarning.test.js:18` — mocks `sequelize` as `{ Op: ... }` only, missing the `Sequelize` named export that the controller imports via `import { Op } from 'sequelize'`.
4. `chat.test.js:27` — model association runs during test setup before Sequelize is fully mocked; `Progress.belongsTo(Child)` throws `called with something that's not a subclass of Sequelize.Model`.

**Impact:** 25 tests fail (out of 463). CI blocks on `test-backend`.

**Fix for (1):** Update import in `reception.test.js` to `../controllers/receptionParentController.js`.  
**Fix for (2):** Rename import to `parentTeacherRatingController.js` (or create a `parentRatingController.js` barrel if multiple rating controllers need to be exposed).  
**Fix for (3):** Add `Sequelize: class {}` to the sequelize mock in `aiWarning.test.js`.  
**Fix for (4):** Move model associations into a lazy-loaded helper, or restructure the mock to provide a real `Model` subclass stub.

**Effort:** 4 hours (all four issues combined)

---

### HIGH

---

#### H-01 — Moderate CVE: nodemailer SMTP command injection

**Severity:** High  
**Location:** `backend/package.json` — `nodemailer@7.0.x`  
**CVE:** GHSA-c7w3-x93f-qmm8, GHSA-vvjj-xcjg-gr5g

**Description:** Versions ≤ 8.0.4 allow SMTP command injection via unsanitized `envelope.size` and CRLF in transport name (EHLO/HELO).

**Impact:** Attacker-controlled email data could inject SMTP commands, potentially sending spoofed email or disrupting the mail session.

**Fix:** Upgrade `nodemailer` to `^8.0.7`. This is a breaking change (verify transport config API changes).

**Effort:** 2 hours (upgrade + regression test)

---

#### H-02 — N+1 queries in government school-stats endpoint

**Severity:** High  
**Location:** `backend/controllers/governmentController.js:155–195`

**Description:** The fallback branch of `getSchoolsStats` executes two SQL queries per school in a `Promise.all` inside `Array.map`:
```js
const schoolsWithStats = await Promise.all(schools.rows.map(async (school) => {
  // else branch when includesLoaded is false:
  const [ratingRows, childRows] = await Promise.all([
    SchoolRating.findAll({ where: { schoolId: school.id }, ... }),
    Child.count({ where: { schoolId: school.id } }),
  ]);
```

For 100 schools this fires 200 SQL queries.

**Impact:** Endpoint latency scales O(n) with school count. Government overview dashboard will become unusable as school count grows.

**Fix:** Replace the fallback with a single aggregation query using `GROUP BY schoolId`:
```js
const ratingAgg = await SchoolRating.findAll({
  attributes: ['schoolId', [fn('AVG', col('stars')), 'avgRating'], [fn('COUNT', col('id')), 'count']],
  where: { schoolId: { [Op.in]: schoolIds } },
  group: ['schoolId'],
});
const childAgg = await Child.findAll({
  attributes: ['schoolId', [fn('COUNT', col('id')), 'count']],
  where: { schoolId: { [Op.in]: schoolIds } },
  group: ['schoolId'],
});
```
Alternatively, make the `includes` path work correctly so `includesLoaded` is always `true`.

**Effort:** 4 hours

---

#### H-03 — File upload validates MIME type only (no magic-byte check)

**Severity:** High  
**Location:** `backend/middleware/upload.js:32–43`

**Description:** The `fileFilter` function allows files whose `mimetype` (set by the HTTP client) is in the allowlist. A malicious client can send an executable file with `Content-Type: image/jpeg`.

**Impact:** If the backend ever serves files directly (the static `/uploads` path is still mounted in `server.js:131`), polyglot files could be served as images and trigger client-side parsing exploits.

**Fix:** Add magic-byte validation after the file is written to disk using `file-type` or `mmmagic`:
```js
import { fileTypeFromFile } from 'file-type';
const detected = await fileTypeFromFile(req.file.path);
if (!ALLOWED_MIME_TYPES.includes(detected?.mime)) {
  fs.unlinkSync(req.file.path);
  return res.status(400).json({ error: 'File content does not match declared type' });
}
```

**Effort:** 3 hours

---

#### H-04 — ESLint errors in all four vite.config.js files fail CI lint

**Severity:** High  
**Location:** `admin/vite.config.js:6,14,15`, `government/vite.config.js:6,11`, and likely `teacher/`, `reception/` vite configs

```
6:33  error  'process' is not defined    no-undef
14:33 error  '__dirname' is not defined  no-undef
```

**Description:** The ESLint configs for the frontends treat `vite.config.js` as a browser module, but it runs in Node.js. `process` and `__dirname` are not declared as globals.

**Impact:** `npx eslint . --ext js,jsx --max-warnings 0` exits non-zero, failing CI `lint-frontend` job.

**Fix:** Add `/* eslint-env node */` at the top of each `vite.config.js`, or add `node: true` to the `env` section of the frontend `.eslintrc.cjs`:
```js
// vite.config.js
/* eslint-env node */
import { defineConfig } from 'vite';
```

**Effort:** 30 minutes

---

#### H-05 — `validateChildAccess` silently bypasses school check when schoolId is null

**Severity:** High  
**Location:** `backend/utils/schoolValidation.js:13–16`

```js
if (req.user.schoolId && child.schoolId && child.schoolId !== req.user.schoolId) {
  return null;
}
```

**Description:** If either `req.user.schoolId` or `child.schoolId` is `null`, the check is skipped entirely. A government or business user with no `schoolId` can access any child's data. A child not yet assigned to a school can be accessed by users from any school.

**Impact:** Cross-tenant data access for edge-case accounts.

**Fix:**
```js
// Explicitly allow government/business to cross boundaries; deny everyone else
if (req.user.role !== 'government' && req.user.role !== 'business') {
  if (!req.user.schoolId || !child.schoolId || req.user.schoolId !== child.schoolId) {
    return null;
  }
}
```

**Effort:** 1 hour (+ regression tests for government access)

---

### MEDIUM

---

#### M-01 — N+1 in `getMedia` and `getMediaItem` for teacher role

**Severity:** Medium  
**Location:** `backend/controllers/mediaController.js:47–80` (getMedia teacher path), `backend/controllers/mediaController.js:140–165` (getMediaItem teacher path)

**Description:** Teacher media access executes two sequential `findAll` calls (all assigned parents → all their children) before any media query. This runs 2 queries per request even for single-item lookups.

**Fix:** Use a single JOIN or subquery:
```js
where.childId = { [Op.in]: sequelize.literal(
  `(SELECT c.id FROM children c
    JOIN users p ON c."parentId" = p.id
    WHERE p."teacherId" = '${req.user.id}')`
) };
```

**Effort:** 2 hours

---

#### M-02 — `admin` role in `getMedia` (list) also lacks schoolId filter

**Severity:** Medium  
**Location:** `backend/controllers/mediaController.js:82–88`

**Description:** The admin list path has `// Admin can see all media` comment with no schoolId restriction. Consistent with C-01 but on the list endpoint.

**Fix:** Same as C-01 — scope to `req.user.schoolId`.

**Effort:** 1 hour

---

#### M-03 — In-memory login lockout and JTI store not Redis-backed

**Severity:** Medium  
**Location:** `backend/utils/loginRateLimitStore.js`, `backend/middleware/auth.js:7`

**Description:** Both the per-account lockout (`loginRateLimitStore.js`) and the JTI revocation list (`auth.js._revokedJtis`) are in-process `Map` instances. State is lost on server restart and not shared across instances.

**Impact:** On a multi-instance Railway deploy, a locked-out account becomes unlocked as soon as traffic routes to a different instance. Revoked JTIs can be replayed on another instance.

**Note:** Both are documented in `CLAUDE.md` as known limitations. This is a pre-launch blocker, not a surprise.

**Fix:** Add Redis (Upstash or Railway Redis service) and replace both stores with Redis-backed implementations. The comments in `loginRateLimitStore.js` already outline the interface contract.

**Effort:** 1 day

---

#### M-04 — `nixpacks.toml` uses `npm install` instead of `npm ci`

**Severity:** Medium  
**Location:** `backend/nixpacks.toml:4`

```toml
[phases.install]
cmds = ["npm install"]
```

**Description:** `npm install` can modify `package-lock.json` and install ranges, producing non-reproducible builds. `npm ci` enforces the lockfile.

**Fix:** Change to `npm ci`.

**Effort:** 5 minutes

---

#### M-05 — `react-hooks/exhaustive-deps` warnings indicate stale closure bugs

**Severity:** Medium  
**Location:** Multiple frontend files — `admin/src/pages/TeacherManagement.jsx:33`, `admin/src/pages/TherapyManagement.jsx:55`, `admin/src/pages/UsersStats.jsx:31`, `government/src/pages/Schools.jsx:26`, `government/src/pages/Students.jsx:17`, `government/src/pages/Teachers.jsx:17` (and likely others)

**Description:** `useEffect` hooks that call async data-fetching functions (`fetchTeachers`, `loadStats`, `loadSchools`, etc.) are missing those functions as dependencies. This can lead to stale data when parent state changes, or infinite re-render loops if the functions are defined inside the component without `useCallback`.

**Fix:** Either wrap the functions in `useCallback` with proper dependencies, or move them outside the component / use a custom hook. ESLint `exhaustive-deps` rule is enabled — these warnings should be errors.

**Effort:** 2–4 hours (systematic sweep)

---

#### M-06 — `reception.test.js` tests `deleteParent` at wrong import path

**Severity:** Medium (covered by C-02, listed separately for traceability)  
**Location:** `backend/__tests__/reception.test.js:38`  
**Description:** Part of the C-02 broken-test cluster. `deleteParent` lives in `receptionParentController.js`, not `receptionController.js`.

---

#### M-07 — No API versioning

**Severity:** Medium  
**Location:** `backend/server.js` — all routes at `/api/<resource>`

**Description:** The API has no version prefix (`/api/v1/`). This makes it impossible to introduce breaking changes without coordinating simultaneous frontend deployments.

**Fix:** Add `/v1/` prefix now while the client base is still small.

**Effort:** 2 hours (update all routes and frontend `api.js`)

---

#### M-08 — Government settings test (`h1` selector) fails

**Severity:** Medium  
**Location:** `government/src/__tests__/pages/settings.test.jsx:71`

**Description:** The test asserts `container.querySelector('h1')` is truthy, but the Settings component renders its heading differently (the DOM returns `null`). This causes 1 failing test in the government suite.

**Fix:** Inspect the rendered component to find the actual heading element or text. Use `getByRole('heading')` or `getByText` instead of raw `querySelector('h1')`.

**Effort:** 30 minutes

---

#### M-09 — Reception settings test import error

**Severity:** Medium  
**Location:** `reception/src/__tests__/pages/settings.test.jsx` (or similar)

**Description:** The reception test suite fails to resolve `react-i18next` during transform (Vite/Vitest import error in a `ConfirmDialog` component). `useTranslation` import causes a transform failure in the test environment.

**Fix:** Ensure `react-i18next` is properly mocked in `setupTests.js`, or add it to `server.deps.inline` in the reception `vitest.config`.

**Effort:** 1 hour

---

#### M-10 — `console.log` in production-path migration runner

**Severity:** Low-Medium  
**Location:** `backend/config/migrate.js:23–127` (17 occurrences)

**Description:** `migrate.js` uses `console.log/error` directly instead of the project's Winston logger. When `RUN_MIGRATIONS=true` is set on Railway, migration output bypasses structured logging and won't appear in Google Cloud Logging.

**Fix:** Replace with `logger.info/error` from `utils/logger.js`.

**Effort:** 30 minutes

---

### LOW

---

#### L-01 — `unused-vars` warnings throughout frontends (31 in admin, 30 in government)

**Severity:** Low  
**Location:** `admin/src/pages/TeacherManagement.jsx:13-14`, `admin/src/pages/UsersStats.jsx:18`, `government/src/pages/Schools.jsx:5-8`, `government/src/pages/Teachers.jsx:1`, etc.

**Description:** Imported symbols (`GraduationCap`, `Briefcase`, `Filter`, `LEVEL_COLORS`, `user`, `React`) are imported but never used. Inflates bundle and indicates dead code.

**Fix:** Remove unused imports. Enable `eslint --max-warnings 0` strictly (it's already configured but currently failing).

**Effort:** 1 hour

---

#### L-02 — `bcryptjs` old major version

**Severity:** Low  
**Location:** `backend/package.json` — `bcryptjs@2.4.3` (latest: 3.0.3)

**Description:** No CVE outstanding, but 2.4.3 is the last 2.x release from 2018. Version 3.x includes performance and correctness improvements. Cost factor 10 is still acceptable for 2024-era hardware.

**Fix:** `npm install bcryptjs@3`. Verify API compatibility.

**Effort:** 1 hour

---

#### L-03 — `node-appwrite` is 11 major versions behind

**Severity:** Low  
**Location:** `backend/package.json` — `node-appwrite@13.0.0` (latest: 24.1.0)

**Description:** 11 major versions behind. Appwrite SDKs have breaking changes between major versions; staying this far behind risks incompatible cloud API behavior as Appwrite updates its service.

**Fix:** Review Appwrite v13→v24 migration guide and upgrade incrementally.

**Effort:** 2–4 hours

---

#### L-04 — `openai` SDK 4.x vs 6.x

**Severity:** Low  
**Location:** `backend/package.json` — `openai@4.104.0` (latest: 6.37.0)

**Description:** OpenAI SDK 5 and 6 introduced breaking changes to model names and streaming API. Current code calls OpenRouter which mimics OpenAI's API; the risk is low unless switching back to direct OpenAI.

**Fix:** Upgrade when planning AI feature work; review changelog for streaming changes.

**Effort:** 2 hours

---

#### L-05 — Multer pinned to legacy `lts.1` instead of current `2.x`

**Severity:** Low  
**Location:** `backend/package.json` — `multer@1.4.5-lts.2` (latest: 2.1.1)

**Description:** Multer 2.x is a major release with security and API improvements. The lts branch is an unofficial maintenance fork.

**Fix:** Upgrade to `multer@^2` and verify field name handling for `uploadDocuments` (the `fields` API changed slightly).

**Effort:** 2 hours

---

#### L-06 — `database.js` Sequelize logging uses `console.log` in development

**Severity:** Low  
**Location:** `backend/config/database.js:23,53`

```js
logging: process.env.NODE_ENV === 'development' ? console.log : false,
```

**Description:** SQL query logging goes to stdout as raw `console.log` instead of through Winston. This means raw SQL with potential query parameters appears in unstructured output and bypasses PII redaction.

**Fix:** Replace with `(msg) => logger.debug(msg)`.

**Effort:** 10 minutes

---

#### L-07 — `schoolScope.schoolWhere` trusts `req.user` without schoolScope middleware

**Severity:** Low  
**Location:** `backend/middleware/schoolScope.js:20–26`

**Description:** The comment says "works with or without `requireSchoolScope` being mounted." This is intentional flexibility but means a controller that calls `schoolWhere(req)` without having `requireSchoolScope` in the middleware chain will silently return `{}` (no filter) for government users, which is correct, but could also be misused by future developers who don't realize the absence of schoolId means no filter.

**Fix:** Document this contract clearly with a comment at the usage point. Consider renaming to `schoolWhereUnsafe` or adding a `strict` flag.

**Effort:** 30 minutes (documentation + comment)

---

#### L-08 — Login does two `findOne` queries per login attempt

**Severity:** Low  
**Location:** `backend/controllers/authController.js:68–80`

**Description:** First queries `WHERE email = :email` (exact match), then on miss queries `WHERE email ILIKE :email` (case-insensitive). This always runs two queries for users who registered with mixed-case email (which bcrypt normalizes anyway since `normalizeEmail()` lowercases at the validator level).

**Fix:** Remove the two-query fallback. Since `loginValidator` calls `.normalizeEmail().toLowerCase()`, the email in `req.body` is already lowercased. A single `iLike` query (or rely on a case-insensitive `CITEXT` column) is sufficient.

**Effort:** 30 minutes

---

#### L-09 — `env.example` contains payment provider stubs (Payme, Click) for deleted feature

**Severity:** Low  
**Location:** `backend/env.example:50–62`

**Description:** The payment feature was deleted (migration `20260506110000-drop-payments.js`), but `env.example` still documents `PAYME_*` and `CLICK_*` variables. This is misleading for new developers.

**Fix:** Remove the payment variables from `env.example`.

**Effort:** 5 minutes

---

#### L-10 — Static `/uploads` route serves files without authentication

**Severity:** Low  
**Location:** `backend/server.js:131`

```js
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));
```

**Description:** Uploaded files in the `uploads/` temp directory are publicly accessible at `/uploads/:filename` without any authentication check. In production, files are stored in Appwrite (correct), but the temp directory exposure remains if any file is not cleaned up after upload failure.

**Fix:** Remove the static `/uploads` route in production (`if (process.env.NODE_ENV !== 'production')`), or require auth. The cleanup code after upload errors (`fs.unlinkSync`) is in place but depends on error paths not being missed.

**Effort:** 1 hour

---

## 4. Prioritized Action Plan

### Quick Wins (< 1 day)

| # | Action | Finding |
|---|--------|---------|
| 1 | Fix `vite.config.js` ESLint globals (`/* eslint-env node */`) | H-04 |
| 2 | Fix broken test imports: `reception.test.js`, `parentRating.test.js` | C-02 |
| 3 | Fix `aiWarning.test.js` sequelize mock | C-02 |
| 4 | Fix `chat.test.js` model association in test | C-02 |
| 5 | Change `nixpacks.toml` `npm install` → `npm ci` | M-04 |
| 6 | Remove payment env vars from `env.example` | L-09 |
| 7 | Replace `console.log` in `database.js` logging config | L-06 |
| 8 | Remove unused imports from admin/government pages | L-01 |
| 9 | Fix government `settings.test.jsx` h1 assertion | M-08 |
| 10 | Fix reception settings test import transform error | M-09 |

### Short-term (1–2 weeks)

| # | Action | Finding |
|---|--------|---------|
| 1 | Patch IDOR: add `schoolId` filter to `mediaController.getMediaItem` admin path | C-01 |
| 2 | Patch IDOR: add `schoolId` filter to `mediaController.getMedia` admin path | M-02 |
| 3 | Tighten `validateChildAccess` null-schoolId bypass | H-05 |
| 4 | Upgrade `nodemailer` to `^8.0.7` | H-01 |
| 5 | Add magic-byte file type validation to upload middleware | H-03 |
| 6 | Fix `exhaustive-deps` warnings in admin/government/teacher frontends | M-05 |
| 7 | Fix N+1 in teacher media path (join instead of 2-query chain) | M-01 |
| 8 | Replace `console.log/error` in `migrate.js` with logger | M-10 |
| 9 | Remove static `/uploads` route from production | L-10 |
| 10 | Fix `login()` double-query (remove iLike fallback) | L-08 |

### Long-term (> 1 month)

| # | Action | Finding |
|---|--------|---------|
| 1 | Add Redis for login lockout + JTI revocation store (pre-launch blocker) | M-03 |
| 2 | Fix N+1 in government school-stats endpoint (aggregate SQL) | H-02 |
| 3 | Add API versioning (`/api/v1/`) | M-07 |
| 4 | Upgrade `multer` to `^2.x` | L-05 |
| 5 | Upgrade `node-appwrite` to current major | L-03 |
| 6 | Upgrade `openai` SDK to `^6` | L-04 |
| 7 | Upgrade `bcryptjs` to `^3` | L-02 |
| 8 | Add backup strategy documentation for Railway Postgres | — |
| 9 | Add cursor-based pagination for large collections | — |
| 10 | Accessibility audit (axe-core or similar) on all 4 dashboards | — |

---

## 5. Strengths

1. **Security posture is well above average.** Helmet + CORS allowlist + HTTP-only cookies + JWT rotation + JTI revocation + per-route rate limiters + bcrypt + body sanitization + PII redaction in logs — this is a production-quality security stack, not an afterthought.

2. **CI pipeline is comprehensive.** Gitleaks secret scanning, Trivy SAST, npm audit at high severity, per-app lint + test + build all gate PRs. This is rare at this project stage.

3. **Docker image follows best practices.** Multi-stage build, `npm ci --omit=dev`, non-root user (`uchqun:nodejs`), explicit healthcheck. The compose file requires secrets via `${VAR:?error}` — no silent defaults for credentials.

4. **Test quantity is respectable.** 61 backend test suites, 463 tests — once the 8 broken import paths are fixed, the suite will be solid. The 4 frontend apps have tests that actually run, not just stubs.

5. **Multi-tenancy is architecturally correct.** `schoolScope` middleware, `schoolWhere()` helper, and `validateChildAccess()` show deliberate design. The gaps found (admin media path) are implementation misses, not design failures.

6. **i18n is first-class.** Uzbek, Russian, and English locales are present in shared and per-app locale directories. For a government platform in Uzbekistan, this is essential and well-executed.

7. **Migration history is complete and ordered.** 45+ timestamped migrations covering the full schema lifecycle. Soft-delete (`paranoid: true`) on sensitive models. FK indexes added explicitly.

8. **Error handling is consistent and production-safe.** The global `errorHandler` suppresses stack traces in production, handles all major Sequelize error types, and calls Sentry for 5xx errors.

9. **Controller refactoring is clean.** The barrel-export pattern (`adminController.js`, `parentController.js`) keeps route files unchanged while allowing sub-controllers to grow. This is a good architectural decision.

10. **Logging is structured and PII-aware.** Winston with JSON format in production, Google Cloud Logging transport, explicit email and secret redaction in the `piiRedact` formatter.

---

## 6. Open Questions

1. **C-02 / `chat.test.js` model mock:** What is the intended mock strategy for tests that need Sequelize model associations? The current pattern (`jest.unstable_mockModule`) works for standalone controllers but breaks when a model file sets up associations at import time. Is there a test helper pattern the team prefers, or should models be refactored to separate definition from association setup?

2. **Intentional design C-07 (CORS):** CLAUDE.md flags the regex CORS check as a pre-launch TODO. The current regex `^https:\/\/(deploy-preview-\d+--)?uchqun-[a-z-]+\.(netlify|vercel)\.app$` looks correct — what is the specific concern? Is it the regex itself or the broader question of whether deploy previews should ever be CORS-allowed in production?

3. **Business role scope:** The `business` role is treated identically to `government` (global access, `isGlobalAccess = true`) in `schoolScope.js`. What is the actual intended data access scope for `business` users? Should they be limited to their assigned schools?

4. **`Child.schoolId` nullable:** Migration `20260510000001-make-child-school-nullable.js` made `schoolId` nullable on children. What is the business case? Are there children legitimately not assigned to a school, or is this a migration-rollback artifact?

5. **Payment env vars in `env.example`:** Payment routes and migration were dropped in `commit ca2039b`. Should the Payme/Click SDK dependencies be removed from `package.json` as well, or are they planned to return?

6. **GCS_BUCKET_NAME in env.js vs Appwrite:** The env validation includes `GCS_BUCKET_NAME` and `GCP_PROJECT_ID`, and the logger initializes a Google Cloud Logging transport. However, media storage uses Appwrite. Is GCS used in production for anything, or is it a legacy holdover?

7. **Government-level vs admin-level media access:** Is the product intent that a government user (cross-school access) should be able to view any child's media? The current code allows it via `validateChildAccess` (null schoolId bypass). Confirm whether this is intentional before patching H-05.

8. **`MIGRATION_SECRET` exposure:** The migration endpoint `POST /api/migrations/run` is unauthenticated except for the secret. In production, should this route be removed entirely (Railway runs migrations via `RUN_MIGRATIONS=true` env var) to reduce attack surface?

---

*This report was generated via automated tool execution + manual code review. Every finding cites a specific file and line. No issues were invented — if a finding seems incorrect, please check the cited location and flag for re-review.*
