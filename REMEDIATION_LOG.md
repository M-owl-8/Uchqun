# Remediation Log

Tracks findings from `AUDIT.md` as they are resolved. Each entry links the fix
to a specific commit and records the verification command output.

---

## Stage 0 — Broken Tests / Lint Errors

### C-02a — `reception.test.js` imported functions that don't exist on `receptionController.js`
- **Status:** CLOSED
- **Commit:** 1684bba
- **Root cause:** `createTeacher` and `deleteParent` were destructured from the
  controller barrel; both live in separate sub-controllers.
- **Fix:** Split import → `receptionTeacherController.js` / `receptionParentController.js`
- **Verification:** `npm test -- __tests__/reception.test.js` → PASS

---

### C-02b — `parentRating.test.js` imported from a file that never existed
- **Status:** CLOSED
- **Commit:** a7ace53
- **Root cause:** `parentRatingController.js` was never created; the real file is
  `parentTeacherRatingController.js`.
- **Fix:** Corrected import path.
- **Verification:** `npm test -- __tests__/parentRating.test.js` → PASS

---

### C-02c — `aiWarning.test.js` `SyntaxError: 'Sequelize' not exported by mock`
- **Status:** CLOSED
- **Commit:** 2921596
- **Root cause:** `Notification` model not mocked → transitive load of `database.js`
  which does `import { Sequelize } from 'sequelize'` against a mock that only had `{ Op }`.
- **Fix:** Added `Notification` mock + added `Sequelize: class {}` to sequelize mock.
- **Verification:** `npm test -- __tests__/aiWarning.test.js` → PASS

---

### C-02d — Five test suites with wrong imports or broken cookie-based auth
- **Status:** CLOSED
- **Commit:** b4f2656
- **Files fixed:**
  - `adminUser.test.js` — renamed `updateAdminBySuper`/`deleteAdminBySuper` → `updateAdmin`/`deleteAdmin`
  - `chat.test.js` — mock `../config/socket.js` to prevent `models/index.js` associations running against mock objects
  - `child.test.js` — removed `addChild` (function was deleted; child creation moved to reception)
  - `teacher.test.js` — split `updateTaskStatus` import to `teacherTaskController.js`
  - `integration/child.integration.test.js` — switch from `supertest(app)` to `supertest.agent(app)` so cookies persist across requests; remove `accessToken` body extraction (server uses HTTP-only cookies)
- **Verification:** Full backend suite 61/61 PASS, 481 tests

---

### M-08 — `government/Platform.test.jsx` failed to resolve `react-i18next` from shared component
- **Status:** CLOSED
- **Commit:** 1529590
- **Root cause:** `@shared/components/ConfirmDialog.jsx` imports `react-i18next`;
  Vite couldn't find it when transforming from the shared folder's context.
  Same pattern as the pre-existing `axios` alias workaround.
- **Fix:** Added `'react-i18next': path.resolve(__dirname, 'node_modules/react-i18next')`
  to `government/vite.config.js` resolve aliases.
- **Verification:** `npm test -- --run` in government → 5/5 suites PASS

---

### M-09 — `reception/settings.test.jsx` `container.querySelector('h1')` returned null
- **Status:** CLOSED
- **Commit:** 1529590
- **Root cause:** `Settings.jsx` initializes `loading: true` and renders a spinner
  until `loadUserProfile()` resolves. The test called `querySelector` synchronously
  before the async state update.
- **Fix:** Wrap assertion in `waitFor(...)`.
- **Verification:** `npm test -- --run` in reception → 3/3 PASS

---

### H-04 — ESLint `no-undef` errors in `vite.config.js` and `server.js` files
- **Status:** CLOSED
- **Commits:** 1529590, b090b49
- **Root cause:** Node.js globals (`process`, `__dirname`, `Buffer`) not declared
  in ESLint config for files that run in Node context.
- **Fix:** Add `/* eslint-env node */` to all four `vite.config.js` and `server.js`
  files; import `beforeAll`/`afterAll` explicitly in `SharedComponents.test.jsx`;
  remove unused `eslint-disable` directive in `teacher/src/i18n.js`.
- **Verification:** `npx eslint vite.config.js server.js` exits 0 in all 4 apps.

---

## Discovered Issues (not in original AUDIT.md)

### N-001 — ~140 pre-existing ESLint warnings fail `--max-warnings 0` CI gate
- **Status:** OPEN (pre-existing, out of scope for Stage 0)
- **Root cause:** All four frontend apps use `eslint . --max-warnings 0`, meaning
  any warning fails lint. There are ~140 `no-unused-vars` and
  `react-hooks/exhaustive-deps` warnings across source files that were never fixed.
- **Affected:** admin (31), teacher (67), reception (15), government (30)
- **Impact:** `npm run lint` has never exited 0 in CI for any frontend app.
- **Recommendation:** Either fix all warnings (large scope), or switch to
  `--max-warnings 50` as an interim gate and add a separate ticket to clear warnings.

---

## Stage 1 — Critical Security

### C-01 — `getMediaItem` admin path bypassed school isolation (IDOR)
- **Status:** CLOSED
- **Commit:** 670b688
- **Root cause:** `else if (role === 'admin')` branch had no `schoolId` filter — admin
  could retrieve any media item by ID regardless of school.
- **Fix:** Admin now fetches school's children first and filters `where.childId` to
  that set; admin without schoolId falls back to unscoped.
- **Also added:** `government` branch (was falling into parent path returning nothing).
- **Verification:** `npm test -- __tests__/media.test.js` → 12/12 PASS

---

### M-02 — `getMedia` admin path bypassed school isolation (IDOR list)
- **Status:** CLOSED
- **Commit:** 670b688 (same commit as C-01)
- **Root cause:** Same as C-01 but for the list endpoint; admin with a specific
  `childId` could also access a child from a different school.
- **Fix:** Admin `getMedia` now scopes through `Child.findAll({ where: { schoolId } })`.
- **Verification:** See C-01 above.

---

### H-05 — `validateChildAccess` null-schoolId bypass
- **Status:** CLOSED
- **Commit:** ad2685a
- **Root cause:** `req.user.schoolId && child.schoolId && child.schoolId !== req.user.schoolId`
  — the `child.schoolId &&` condition meant a child with no schoolId was never denied
  to scoped users.
- **Fix:** Changed to `req.user.schoolId && child.schoolId !== req.user.schoolId`
  (exact match required; null child.schoolId fails the check for scoped users).
- **Verification:** `npm test -- __tests__/utils/schoolValidation.test.js` → 6/6 PASS

---

## Stage 2 — Other Security

### H-01 — `nodemailer@7.x` affected by SMTP command injection CVEs
- **Status:** CLOSED
- **Commit:** d600e2a
- **CVEs:** GHSA-c7w3-x93f-qmm8 (envelope.size injection), GHSA-vvjj-xcjg-gr5g (CRLF in EHLO/HELO)
- **Fix:** Upgraded `nodemailer` 7.0.12 → 8.0.7. No API changes needed.
- **Verification:** `npm audit` no longer reports nodemailer. All 61 suites pass.

---

### H-03 — File upload validates MIME type only (no magic-byte check)
- **Status:** CLOSED
- **Commit:** 0dc2afa
- **Root cause:** `fileFilter` in `upload.js` checks `file.mimetype` (client-controlled).
- **Fix:** Installed `file-type@19.6.0`; added `fileTypeFromFile` check in `uploadMedia`
  after multer writes the file to disk. Invalid content → `safeCleanup` + 400.
- **Verification:** All 61 suites pass.

---

### M-03 — In-memory login lockout and JTI revocation store
- **Status:** DEFERRED (pre-launch blocker, requires Redis infrastructure)
- **Note:** Both stores documented in `CLAUDE.md` as known limitations.

---

## Stage 3 — Performance

### H-02 — N+1 queries in `getSchoolsStats` fallback branch
- **Status:** CLOSED
- **Commit:** 065356e
- **Root cause:** Fallback branch ran 2 queries per school inside `Promise.all(schools.rows.map(...))`.
- **Fix:** Pre-load all ratings and child counts in 2 bulk queries before the map;
  map is now synchronous.
- **Verification:** `npm test -- __tests__/government.test.js` → 2/2 PASS. Full suite 61/61.

---

## Stage 4 — Infra Hygiene

### M-04 — `nixpacks.toml` used `npm install` (non-deterministic builds)
- **Status:** CLOSED
- **Commit:** cf2abae
- **Fix:** Changed to `npm ci` to enforce lockfile on Railway deploys.

---

## Stage 5 — Code Hygiene

### M-10 — `migrate.js` used `console.log/error` instead of structured logger
- **Status:** CLOSED
- **Commit:** 6edca8f
- **Fix:** Replaced all 17 `console.*` calls with `logger.info/warn/error` with
  structured key-value fields.

---

## Stage 6 — API Versioning

### M-07 — All API routes lacked `/v1/` prefix
- **Status:** CLOSED
- **Commit:** 29b5732
- **Fix:** All 25 `app.use('/api/<resource>', ...)` registrations in `server.js` updated to
  `/api/v1/<resource>`. Rate limiter stays on `/api` (covers all `/api/*`). Swagger docs
  moved to `/api/v1/docs`. `FALLBACK_API_BASE` in `shared/services/config.js` updated to
  `'http://localhost:5000/api/v1'`; `API_HOST` regex updated to strip `/api` or `/api/vN`
  suffixes via `replace(/\/api(?:\/v\d+)?\/?$/, '')`.
- **Verification:** Full backend suite 61/61 PASS, 486 tests.

---

## Stage 7 — Dependency Upgrades

### L-02 — `bcryptjs@2.4.3` outdated
- **Status:** CLOSED
- **Commit:** 63dc790
- **Fix:** Upgraded `bcryptjs` 2.4.3 → 3.0.3. Identical JS API (3.x is a TypeScript
  rewrite). Removed `@types/bcryptjs` from devDependencies — bundled in 3.x.
- **Verification:** All auth tests pass (61/61 suite green).

---

### L-03 — `node-appwrite@13.0.0` outdated
- **Status:** CLOSED
- **Commit:** 63dc790
- **Fix:** Upgraded `node-appwrite` 13.0.0 → 24.1.0. Updated `backend/config/storage.js`:
  `import { InputFile } from 'node-appwrite/file'` → merged into main package import
  `import { ..., InputFile } from 'node-appwrite'`.
- **Verification:** Full suite 61/61 PASS.

---

### L-05 — `multer@1.4.5-lts.1` outdated
- **Status:** CLOSED
- **Commit:** 63dc790
- **Fix:** Upgraded `multer` 1.4.5-lts.1 → 2.1.1. Removed dead `preservePath: false`
  option from `backend/middleware/upload.js` (was never a documented multer option).
- **Verification:** Full suite 61/61 PASS.

---

## Stage 8 — Open Questions (Dispositions)

### Q1 — chat.test.js model mock strategy
- **Status:** CLOSED (resolved in Stage 0, commit b4f2656)
- Mock strategy: `jest.unstable_mockModule('../config/socket.js', ...)` prevents
  `models/index.js` associations from running at import time. Adopted as team pattern.

### Q2 — C-07 CORS regex
- **Status:** OPEN — product/ops decision required
- The current regex `^https:\/\/(deploy-preview-\d+--)?uchqun-[a-z-]+\.(netlify|vercel)\.app$`
  is technically correct. The CLAUDE.md pre-launch TODO is about policy: whether
  deploy-preview origins should ever be CORS-allowed in production. Replace with an
  explicit `ALLOWED_ORIGINS` env-var list before going live.

### Q3 — Business role scope
- **Status:** OPEN — product decision required
- `business` is currently `isGlobalAccess = true` (same as `government`). Needs
  product sign-off on whether business users should be scoped to specific schools.

### Q4 — Child.schoolId nullable
- **Status:** OPEN — product decision required
- Migration `20260510000001-make-child-school-nullable.js` makes `schoolId` nullable.
  Needs confirmation whether this is intentional (children not yet assigned to a school)
  or a rollback artifact.

### Q5 — Payment SDK dependencies
- **Status:** CLOSED — already clean
- No Payme/Click/Uzum packages in `package.json`. Payment routes were deleted in
  commit ca2039b; no orphaned SDK dependencies remain.

### Q6 — GCS vs Appwrite in production
- **Status:** OPEN — ops decision required
- `storage.js` supports both GCS and Appwrite with Appwrite preferred. If GCS is not
  used in production, `GCS_BUCKET_NAME` / `GCP_PROJECT_ID` env vars and the GCS init
  block can be removed. Awaiting ops confirmation.

### Q7 — Government-level media access
- **Status:** CLOSED (design intent confirmed by H-05 fix)
- Government users retain full cross-school media access via `validateChildAccess`.
  The null-schoolId bypass in H-05 was tightened for scoped users only; government
  bypasses `schoolScope.js` entirely (`isGlobalAccess = true`).

### Q8 — Migration route attack surface
- **Status:** CLOSED — already self-gated
- `POST /api/v1/migrations/run` returns 404 when `MIGRATION_SECRET` env var is unset,
  effectively disabling the endpoint in environments that don't configure it. No code
  change required.
