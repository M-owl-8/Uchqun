# Backend S1: Deep Audit

**Generated:** 2026-05-19  
**Status:** Complete (6 sections)  

## Preamble — Full Reads Completed

All five S0 partial-read controllers read end-to-end in this step:

| File | Chunks read | Lines covered |
|---|---|---|
| `governmentController.js` | 6 passes (0-160, 160-320, 320-480, 480-640, 640-800, 800-923) | 1–923 complete |
| `mediaController.js` | 6 passes (0-160, 160-320, 320-480, 480-640, 640-800, 800-958) | 1–958 complete |
| `admin/adminStatsController.js` | 4 passes (0-175, 175-350, 350-525, 525-668) | 1–668 complete |
| `admin/adminReceptionController.js` | 3 passes (0-175, 175-350, 350-499) | 1–499 complete |
| `therapyController.js` | 3 passes (0-175, 175-350, 350-544) | 1–544 complete |
| `receptionController.js` | 1 pass | 1–81 complete |
| `config/socket.js` | Lines 95–125 | Covers lines 109–121 |

Additional files read in this step: `auth.js` (0–120), `childController.js` (0–213), `mealController.js` (0–80), `userController.js` (0–128), `parentEvaluationController.js` (0–70), `telegram.js` (1–224), `adminRegistrationController.js` (0–430), `upload.js` (1–117), `uploadChildren.js` (1–25), `schoolValidation.js` (1–30), `routes/childRoutes.js`, `routes/governmentRoutes.js`, `routes/mediaRoutes.js`, `routes/migrationRoutes.js`, `config/swagger.js`, `scripts/reset-database.js`.

---

## Section A — Executive Summary

### Verdict: 🟡 Needs Work

The backend is functional and ships no auth bypasses, but carries six High findings (all IDOR/tenant-isolation), twelve Medium findings, and ten Low findings. No Critical findings. The codebase is generally well-structured but inconsistent — new features were added faster than cleanup kept pace.

### Headline counts

| Severity | Count |
|---|---|
| Critical | 0 |
| High | 6 |
| Medium | 12 |
| Low | 10 |
| Info | 6 |
| **Total** | **34** |

### Top 5 most damaging findings

| ID | Impact |
|---|---|
| BACKEND-003 | Any teacher/admin/reception can delete or update **any** media record regardless of school, by UUID |
| BACKEND-001 | `approveDocument` always returns 403 — admin document approval flow is silently broken |
| BACKEND-002 | Admin A can update Admin B's receptions if they share a school (`createdBy` not in scope check) |
| BACKEND-005 | Admin role sees **all** meals platform-wide with no school scoping |
| BACKEND-006 | Document uploads trust client MIME type — no magic-byte validation; files accepted on declared type alone |

### Resolution of all 14 Open Questions from S0

See Section E.

---

## Section B — Findings Table

| ID | Severity | Category | File:Line | Title | Description | Evidence | Recommended fix |
|---|---|---|---|---|---|---|---|
| BACKEND-001 | High | Security (OWASP A01 BAC) | `admin/adminReceptionController.js:140` | `approveDocument` auth check always evaluates false | `createdBy` is excluded from the User attributes list in the include. `document.user.createdBy` is therefore `undefined`. The check `undefined !== req.user.id` is always `true`, returning 403 to every admin. Approximate root: field was added to the check after the query was written without updating the attributes list. | `attributes: ['id', 'firstName', 'lastName', 'email', 'role']` at line 140–145; check at line 153: `document.user.createdBy !== req.user.id` | Add `'createdBy'` to the attributes list, or (preferred) re-use the `rejectDocument` pattern: `await User.findByPk(document.userId)` with no attribute restriction. |
| BACKEND-002 | High | Security (OWASP A01 IDOR) | `admin/adminReceptionController.js:419` | `updateReception` scoped by `schoolId`, not `createdBy` | Any admin in the same school as another admin can modify that admin's receptionist accounts. The reception lookup at line 422 uses `{ id, role: 'reception', schoolId: req.user.schoolId }`. All other CRUD operations on receptions correctly scope by `createdBy`. | `const receptionWhere = { id, role: 'reception' }; if (req.user.schoolId) receptionWhere.schoolId = req.user.schoolId;` (lines 419–420); contrast with `getReceptionById` (line 43): `{ id, role: 'reception', createdBy: req.user.id }` | Add `createdBy: req.user.id` to `receptionWhere`. |
| BACKEND-003 | High | Security (OWASP A01 IDOR) | `mediaController.js:912` | `deleteMedia` and `updateMedia` have no school/ownership isolation | Role guard at line 914 checks role only. After finding the media record by PK, there is no ownership or school check. Any teacher, admin, or reception in any school can delete or update any media by UUID. | `const media = await Media.findByPk(id);` (line 919) — no `where` condition scoping by school or user | For `deleteMedia`: verify `media.childId` belongs to a child in the caller's school via `validateChildAccess`. For `updateMedia`: same pattern. |
| BACKEND-004 | High | Security (OWASP A01 BAC) | `mediaController.js:690` | `proxyMediaFile` has no ownership or school isolation | Any authenticated user (including a parent from school A) can proxy any media file by UUID, bypassing the role-specific isolation implemented in `getMedia`/`getMediaItem`. UUID randomness makes guessing impractical, but the design explicitly bypasses all access controls. | `router.get('/proxy/:fileId', authenticate, proxyMediaFile)` at `routes/mediaRoutes.js:22`; in controller: `const media = await Media.findByPk(fileId)` (line 700) — no further check | Add `validateChildAccess(media.childId, req)` before proxying, consistent with the upload path. |
| BACKEND-005 | High | Security (OWASP A01 BAC) | `mealController.js:53` | Admin can see all meals platform-wide — no school scoping | The admin branch sets no school filter. An admin from school A can list all meals for children of any school. `mediaController.js` correctly scopes admin by `req.user.schoolId`; `mealController.js` does not. | `} else if (req.user.role === 'admin') { // Admin can see all meals` (lines 53–58) vs. `mediaController.js:83`: `if (req.user.schoolId) { const schoolChildren = ...` | Mirror `mediaController.js`'s admin path: scope by `req.user.schoolId` when present. |
| BACKEND-006 | High | Security (OWASP A08 Integrity Failure) | `receptionController.js:17` | Document upload trusts client MIME type — no magic-byte validation | `uploadFile` is called with `file.mimetype` from Multer's in-memory metadata, which is derived from the client's `Content-Type` header. The Multer filter checks this declared type (line 46–57 of `upload.js`). Unlike `mediaController.js` which calls `fileTypeFromFile(req.file.path)` to verify actual content, reception document upload has no server-side content check. | `const { url: persistentUrl } = await uploadFile(buffer, file.filename, file.mimetype)` (line 17) — `file.mimetype` is client-supplied | Add `fileTypeFromBuffer` (from `file-type` package, already a dep) before calling `uploadFile`. |
| BACKEND-007 | Medium | Error Handling | `admin/adminStatsController.js:614` | `getSchoolRatings` returns HTTP 200 on all errors | The outer catch block at line 614 always responds `res.json({ success: true, data: [] })` with status 200, masking any database failure. Clients see an empty success response when the query errors. | `res.json({ success: true, data: [] });` at line 615–618, inside the `catch (error)` block | Change to `res.status(500).json({ success: false, error: 'Failed to fetch ratings' })` in the catch block. |
| BACKEND-007b | Medium | Error Handling | `admin/adminStatsController.js:392` | `getStatistics` inner catch silently returns HTTP 200 on primary DB failure | Inside `getStatistics`, a nested try/catch at lines 392–403 wraps the primary data query. When that query fails the inner catch responds `res.json({ success: true, data: [] })` with HTTP 200, masking the error. The outer catch at line 637 (fixed in S3 for BACKEND-007) is **unreachable** for this failure path because the inner catch already sent a response. S3 fixed only the outer catch. | `catch (error) { ... res.json({ success: true, data: [] }); }` at lines 398–403 | Replace inner catch response with `res.status(500).json({ success: false, error: 'Failed to fetch statistics' })`. Do NOT rely solely on fixing the outer catch when nested catch blocks exist. |
| BACKEND-008 | Medium | Performance | `admin/adminStatsController.js:626` | `getAllSchools` unbounded `findAll` — entire table in one query | `School.findAll(...)` with no `limit` or `offset`. As the school count grows this will load the entire table on every request. | `const schools = await School.findAll({ where: { isActive: true }, ...})` (line 628) — no limit | Add `parsePagination` and pass `limit`/`offset` to the query. |
| BACKEND-009 | Medium | Performance | `governmentController.js:300,356` | Government endpoints default to 500-row responses | `getStudentsStats` line 301: `const { schoolId, limit = 500, offset = 0 }` (max capped at 1000). `getTeachersList` line 358: `limit = 500, offset = 0` (max 1000). These return PII for all users in single large responses. | `const limitNum = Math.min(parseInt(limit, 10) \|\| 500, 1000);` (line 302) | Reduce defaults to 20–50 and enforce a lower max (200 at most). Use `parsePagination` consistently. |
| BACKEND-010 | Medium | Performance | `userController.js:76` | User avatar stored as base64 in `users.avatar` TEXT column | Every user fetch from the DB includes up to 2MB of base64 image data. Every JWT-authenticated request loads the user via `getCachedUser`, which calls `User.findByPk(userId)`. All user fields are included unless explicitly excluded. | `const dataUri = \`data:${mimetype};base64,${req.file.buffer.toString('base64')}\`` (line 76) — stored in `user.avatar` | Upload avatars to Appwrite (like media files) and store only the URL. The comment at line 61 explains the Railway workaround — acceptable short-term but should be migrated. |
| BACKEND-011 | Medium | Security (OWASP A05 Config) | `mediaController.js:855` | `proxyMediaFile` overrides server CORS policy with `Access-Control-Allow-Origin: *` | The proxy endpoint sets wildcard CORS, allowing any web origin to use the proxied stream. This contradicts the server-wide CORS allowlist in `server.js`. | `res.setHeader('Access-Control-Allow-Origin', '*');` (line 855) and `res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');` (line 856) | Remove line 855–856. The server-wide CORS headers are sufficient. If cross-origin image loading is needed, add the specific frontend origins. |
| BACKEND-012 | Medium | Messiness | Multiple controllers | Response shape inconsistency across controllers | `governmentController.js`, `therapyController.js`, `adminStatsController.js` return `{ success: true, data: {...} }`. `groupController.js`, `mealController.js`, `activityController.js`, `childController.js` return bare objects (`res.json(groups)`). Some wrap in `{groups, total, limit, offset}`, others in `{data: {total, ...}}`. Frontend must handle two divergent schemas. | `res.json({ groups: groups.rows, total: groups.count, ... })` (`groupController.js:75`) vs `res.json({ success: true, data: { therapies: ..., total: ... } })` (`therapyController.js:68`) | Adopt one shape for all new code. Document the chosen standard in CLAUDE.md. Consider a migration path for existing endpoints. |
| BACKEND-013 | Medium | Technical Debt | `therapyController.js:474` | `deleteTherapy` deactivates instead of soft-deleting | The function sets `isActive: false` rather than calling `.destroy()`. The `Therapy` model is `paranoid: true`, so `.destroy()` would set `deletedAt`. The current code leaves the record fully visible to queries that include `isActive: false`. The endpoint is named "delete" but does not delete. | `await therapy.update({ isActive: false });` (line 474) vs the expected `await therapy.destroy()` | Call `await therapy.destroy()`. A separate `deactivate` endpoint can exist for `isActive: false`. |
| BACKEND-014 | Medium | Documentation | `config/swagger.js:33` | Swagger spec only scans `./routes/*.js` — misses controller JSDoc in sub-paths | The glob `'./routes/*.js'` only matches top-level routes. If routes were ever moved to subdirectories, or JSDoc was added to controllers, those would be missed. Currently all routes are flat so no docs are lost, but the setup gives a false sense of documentation coverage. | `apis: ['./routes/*.js']` (line 33) | Change to `['./routes/**/*.js', './controllers/**/*.js']` to future-proof. |
| BACKEND-015 | Medium | Technical Debt | `utils/telegram.js:133` | `sendAdminApprovalTelegram` is dead code — never called | Grep of the entire `backend/` directory finds no call to `sendAdminApprovalTelegram`. The actual admin approval flow uses `generateSetPasswordToken` + a set-password URL (`adminRegistrationController.js:387`). The Telegram function (and its internal `getUserChatIdByUsername`) have no callers. | `export async function sendAdminApprovalTelegram(...)` at line 133 — zero imports found in codebase | Delete `sendAdminApprovalTelegram` and `getUserChatIdByUsername` from `telegram.js`. |
| BACKEND-016 | Medium | Technical Debt | `receptionController.js:29` | `isVerified = true` set at document upload time, before review | `await req.user.update({ isVerified: true })` runs when a reception uploads any document, regardless of its content or approval status. The actual access gate for reception login is `documentsApproved && isActive` (auth.js:99), so `isVerified` is misleading — it means "has uploaded at least one document", not "has been verified". | `await req.user.update({ isVerified: true });` (line 29, `receptionController.js`) | Either (a) rename the field to `hasUploadedDocuments` for clarity, or (b) remove the `isVerified` update from this path and only set it in `approveDocument`. |
| BACKEND-017 | Medium | Messiness | Multiple model files | Mixed `underscored: true/false` convention across Sequelize models | Most models use camelCase columns (`underscored: false`, default). `ChildAssessment.js`, `ServicePlan.js`, `MealPlan.js`, `ParentEvaluation.js` use `underscored: true`. `RefreshToken.js` is `underscored: false` but declares `createdAt: 'created_at'`. This means JOIN queries mixing model types require careful aliasing. | `RefreshToken.js`: `underscored: false, ... createdAt: 'created_at'` vs `ChildAssessment.js`: `underscored: true` | Decide on one convention. For greenfield models, add `underscored: false` explicitly to match the majority. |
| BACKEND-018 | Medium | Technical Debt | `admin/adminStatsController.js:7-9,169-179` | Legacy `ParentActivity/Meal/Media` models actively queried for admin stats | `adminStatsController.js` imports and queries `ParentActivity`, `ParentMeal`, `ParentMedia` for content counts in the `getStatistics` response. The modern `Activity`, `Meal`, `Media` models exist and are the live data path for all non-admin portals. Stats therefore count only legacy content and miss modern records. | `import ParentActivity from '../../models/ParentActivity.js'` (line 7); `ParentActivity.count({ where: { parentId: { [Op.in]: parentIds } } })` (line 171) | Replace with counts from `Activity`, `Meal`, `Media` scoped by `childId` through the parent→child relation, or sum both during a transition window. |
| BACKEND-019 | Low | Technical Debt | `models/Child.js` | `Child.class` and `Child.teacher` STRING columns redundant with FK relations | The model has `class: DataTypes.STRING` and `teacher: DataTypes.STRING` alongside proper FK relations (`teacherId`, `groupId`). These STRING fields shadow the relational design. It is unclear which is canonical. | S0 Section 6 OQ#2: "Redundant `class`/`teacher` STRING fields on `Child` — are these legacy?" — confirmed by model inspection | Remove the STRING fields if FKs are canonical. If they serve intake data (before school assignment), document that explicitly. |
| BACKEND-020 | Low | Technical Debt | `governmentController.js:5` | `_TherapyUsage` imported but unused | `import _TherapyUsage from '../models/TherapyUsage.js'` — the underscore prefix conventionally signals "unused" in this codebase, and it is indeed never referenced in the file. | `import _TherapyUsage from '../models/TherapyUsage.js';` (line 5) | Remove the import. |
| BACKEND-021 | Low | Technical Debt | `.env.example:64-74` | Dead Payme/Click payment keys in `.env.example` | The payment system was removed (`CLAUDE.md` confirms `C-06: payment routes/controller deleted`), but the example file still documents `PAYME_*` and `CLICK_*` env vars. New developers will wonder why these are needed. | Lines 64–74 of `.env.example` contain payment gateway keys for a deleted feature | Delete the Payme/Click block from `.env.example`. |
| BACKEND-022 | Low | Technical Debt | `tsconfig.json` | `tsconfig.json` exists but no TypeScript is used | The backend uses ESM JavaScript exclusively. The file is a dead config artifact. | `tsconfig.json` at repo root; `package.json` has no `tsc` script or TypeScript dependencies | Delete `tsconfig.json`. |
| BACKEND-023 | Low | Operational Safety | `scripts/reset-database.js` | `reset-database.js` has no safety guard, no dry-run, uses `console.log` | Running `node scripts/reset-database.js` with `DB_*` env vars pointing to production will drop and recreate the database with no confirmation prompt, no dry-run flag, no env-based guard, and no warning. | Lines 40–41: `await sequelize.query('DROP DATABASE IF EXISTS ...')` followed immediately by `CREATE DATABASE` — no guard | Add `if (process.env.ALLOW_DB_RESET !== 'true') throw new Error('...')` and a dry-run flag. Replace `console.log` with logger. |
| BACKEND-024 | Low | Validation | `receptionController.js:9` | `documentType` field not validated as enum | `Document.create({ documentType, ... })` accepts any string value for `documentType` without validating it against allowed values. If the Document model defines an enum constraint, validation only happens at DB level (less descriptive error). | `const { documentType } = req.body;` (line 9) — no allowed-values check before `Document.create` | Add an allowlist check: `const ALLOWED_TYPES = ['certificate', 'passport', 'diploma']; if (!ALLOWED_TYPES.includes(documentType)) return 400`. |
| BACKEND-025 | Low | Security (OWASP A01) | `therapyController.js:490` | `getTherapyUsage` admin role has no WHERE clause — sees all cross-school usage | For `admin` role, no filter is added to `where`. Admin can page through therapy usage for all users in all schools. This is inconsistent with how admin is scoped elsewhere. | Role check at line 498–501: only `parent` and `teacher` roles get scoped; `admin` falls through with empty `where` | Add `if (req.user.role === 'admin' && req.user.schoolId)` scope by child school or created-by hierarchy. |
| BACKEND-026 | Low | Security | `routes/migrationRoutes.js:15` | Migration trigger endpoint has only global rate limiter | `POST /api/v1/migrations/run` is protected by `MIGRATION_SECRET` (correct timing-safe check), but only has the global `apiLimiter` (500 requests per 15 minutes). A brute-force attack against a weak secret would be rate-limited only modestly. | No dedicated rate limiter applied to the route; global `apiLimiter` defined in `server.js:152` | Apply `authLimiter` (50/15m) or a dedicated `migrationLimiter` (5/15m) to this route. |
| BACKEND-027 | Low | Messiness | `config/database.js:30` | Sequelize logs via `console.log` in development mode | `logging: process.env.NODE_ENV === 'development' ? console.log : false` bypasses the Winston logger. SQL queries in development go to stdout without correlation IDs or PII redaction. | `logging: process.env.NODE_ENV === 'development' ? console.log : false,` (line 30) | Replace with `logging: (msg) => logger.debug(msg)` or `false` — Sequelize output is noisy and better disabled in production. |
| BACKEND-028 | Low | Performance | `parentEvaluationController.js:58` | `getMyEvaluations` hard-coded `limit: 50`, no pagination | `ParentEvaluation.findAll({ ..., limit: 50 })` ignores any `limit`/`offset` from the query string. Parents with many evaluations will miss older records. | `limit: 50,` (line 62) — no `parsePagination` call | Use `parsePagination(req.query, { limit: 20 })` and pass `limit`/`offset` to the query. |
| BACKEND-029 | Info | Testing | Test suite | 65 suites, 559 tests, all passing; coverage 38.68%/32.65%/38.96%/39.5% | All suites pass. Coverage exceeds the 25% threshold. Most controllers have dedicated test files (see Section D). | `npm test` output: "65 passed, 65 total; 559 passed, 559 total" | — |
| BACKEND-030 | Info | Code Quality | All JS files | Zero TODO/FIXME/HACK markers in backend source | Full grep across `backend/**/*.js` for `TODO\|FIXME\|HACK\|XXX` returned zero results. | Grep result: "No matches found" | — |
| BACKEND-031 | Info | Security | `middleware/auth.js:26-38` | JTI revocation is fail-closed | When Redis errors, `_isJtiRevoked` returns `true` (token treated as revoked), preventing replay attacks during Redis outage. Correct security posture. | `return true; // fail closed` comment at line 35 | — |
| BACKEND-032 | Info | Architecture | `config/socket.js:116` | `emitToUser` uses room-based approach — Redis-adapter-aware | `io.to(\`user:${userId}\`).emit(event, data)` is correctly routed through the Redis Socket.IO adapter when multi-instance. The `userSockets` in-memory Map is only used for diagnostics, not for event routing. | `io.to(\`user:${userId}\`).emit(event, data);` (line 116) | — |
| BACKEND-033 | Info | Security | `middleware/auth.js:92-97` | Parent role bypasses `isActive` check — intentional | Parents (`role === 'parent'`) and government users skip the `isActive: false` block. This is deliberate: parents self-register without admin approval. | `if (!isParent && !isGovernment && !user.isActive)` (line 95) | — |
| BACKEND-034 | Info | Technical Debt | `utils/telegram.js:88` | `getUserChatIdByUsername` is dead code — fragile but harmless | Only called from `sendAdminApprovalTelegram` (line 162), which is itself never imported or called. Both functions are unreachable in production. The actual approval flow uses a set-password link token (`adminRegistrationController.js:387`). | Grep for `sendAdminApprovalTelegram` returns only the function definition | — |
| BACKEND-039 | High | Security (Dependencies) | `package.json` | 5 high-severity npm vulnerabilities in socket.io chain | `npm audit --audit-level=high` reports 13 total (2 low, 6 moderate, 5 high). All high-severity findings are in the socket.io / engine.io / ws dependency chain. CVEs include DoS via memory exhaustion (ws) and uncaughtException vectors (engine.io). Affects the real-time communication layer. `npm audit fix --force` required but involves breaking changes. | `npm audit --audit-level=high` output (2026-05-19 S4 run) | Upgrade socket.io and test; consider pinning to a patched minor |
| BACKEND-040 | Medium | Security (OWASP A01 BAC) | `childAssessmentController.js:202`, `emotionalMonitoringController.js:89,389`, `teacherResourceController.js:125` | Admin role bypasses school-scope in 3 controllers | `req.user.role !== 'admin'` short-circuits ownership check without verifying admin's `schoolId` matches resource's school. Admin from school A can update any `ChildAssessment`, create/update/delete `EmotionalMonitoring` records for any child (health-adjacent data), and delete any `TeacherResource`. | `:202` — `assessment.teacherId !== req.user.id && req.user.role !== 'admin'`; `:89` — `if (req.user.role !== 'admin' && req.user.role !== 'government')` skips child access check; `:389` — same bypass | Call `validateChildAccess(resource.childId, req)` after `findByPk` in each affected function |
| BACKEND-041 | High | Security (OWASP A01 IDOR) | `mealPlanController.js:156,189` | `updateMealPlan`/`deleteMealPlan` have no ownership or school check | `MealPlan.findByPk(id)` is called, then update or destroy executes with NO ownership or school-scope check. Route guard `requireRole('teacher', 'admin')` allows any teacher from any school to update or delete any meal plan by UUID. Same class as BACKEND-003/005/036 fixed in S3 — `mealPlanController.js` create path correctly calls `validateChildAccess` but update/delete do not. | `mealPlanController.js:161` — `const plan = await MealPlan.findByPk(id)` then direct update with no scope; `:193` — same for destroy | After `findByPk`, call `validateChildAccess(plan.childId, req)` and return 404 on null |
| BACKEND-042 | Info | Documentation | `backend/package.json` | `npm run lint` script missing — documented in CLAUDE.md | CLAUDE.md commands section lists `npm run lint` for backend, but `package.json` has no `lint` script. `npm run lint` fails with "Missing script". ESLint works via `npx eslint`. | `npm run` output: no lint script listed | Add `"lint": "eslint controllers/ middleware/ utils/ routes/ config/ models/"` to `package.json` scripts |
| BACKEND-043 | High | Security (OWASP A01 IDOR) | `mealController.js:261,305` | `updateMeal`/`deleteMeal` have no ownership or school check | `Meal.findByPk(id)` is called then update or destroy executes with NO school-scope check. `Child.findByPk(meal.childId)` at line 268 is for Socket.IO notification only — it is not authorization. Route guard `requireRole('teacher', 'admin')` allows any teacher from any school to update or delete any meal by UUID. Same IDOR class as BACKEND-041. | `mealController.js:261` — `const meal = await Meal.findByPk(id)` then `meal.update(req.body)` at :270 with no scope; `:305` — same for destroy | After `findByPk`, call `findChildScopedResource(Meal, id, req)` (or `validateChildAccess(meal.childId, req)`) and return 404 on null |
| BACKEND-044 | Medium | Security (OWASP A01 BAC) | `aiWarningController.js:248,279` | `resolveWarning`/`notifyUsers` have no school check for admin callers | `AIWarning.findByPk(id)` is called then mutation executes with no school-scope verification. Route guard is `requireRole('admin', 'government')`. Government callers have intentional platform-wide access. Admin is school-scoped but no check ensures the warning's child belongs to the admin's school. | `aiWarningController.js:248` — `const warning = await AIWarning.findByPk(id)` then update with no schoolId check; `:279` — same | For admin callers: validate `warning.childId` via `validateChildAccess(warning.childId, req)` before mutating. Government callers retain platform-wide access. |

> **Amended 2026-05-19 (S4 + S2 recovery):** 9 additional findings identified in S4 Confirm Clean and S2 Recovery passes (BACKEND-007b, BACKEND-039–044). Updated counts: Critical=0, High=9, Medium=15, Low=10, Info=7, **Total=43**.

---

## Section C — Pattern Observations

### 1. Inconsistent school isolation across parallel controllers

`mediaController.js` (admin path) correctly scopes by `req.user.schoolId`. `mealController.js` (admin path) does not. `activityController.js` was not fully audited in this pass but the same pattern likely applies. This is a systematic issue: school isolation was added to some controllers but not others, probably because it was retrofitted after initial development. **Effect:** admin-role users can read/write data outside their school in at least two controllers.

### 2. Dual-layer role check pattern used inconsistently

Some controllers apply role restrictions via route-level `requireRole(...)` middleware (`mediaRoutes.js:64`). Others apply inline checks inside the controller function (`mediaController.js:320`, `mediaController.js:518`). The inline checks are redundant when `requireRole` is already on the route, but dangerous if the route ever removes the middleware without updating the controller.

### 3. Raw SQL is safe but signals lost confidence in Sequelize

`adminStatsController.js` uses three raw `sequelize.query()` calls with `QueryTypes.SELECT`. All three are static queries with no user input interpolation — no injection risk. But the pattern (especially with the `try/catch/fallback-SQL` pattern) signals the developer had association problems they couldn't resolve through Sequelize's ORM. This is technical debt: the ORM associations should be fixed rather than worked around with raw SQL.

### 4. Defensive over-wrapping hides errors

`governmentController.js` wraps every individual stat count in its own try/catch, returning 0 on failure (lines 41–95). `adminStatsController.js:614` returns `{success:true, data:[]}` with HTTP 200 on any error. This "fail silently" pattern means that database errors, schema mismatches, and missing indexes manifest as empty data rather than 500 errors. Monitoring and alerting cannot distinguish a real outage from normal empty results.

### 5. Three N+2 query chains for teacher role across controllers

`mediaController.js` `getMedia` for teacher role (lines 47–73): query 1 = assigned parents, query 2 = children of those parents, query 3 = media. Same pattern in `mealController.js:18–51` and `activityController.js` (not fully read but same import pattern). These are 3 fixed queries, not a true N+1, but could be collapsed into one join query for performance.

---

## Section D — Coverage Measurement

Test suite ran: `npm test -- --coverage --coverageReporters=text-summary` (43.8s, 65 suites, 559 tests, all pass).

| Metric | Value | Threshold | Status |
|---|---|---|---|
| Statements | 38.68% (2044/5284) | 25% | ✅ Pass |
| Branches | 32.65% (1151/3525) | 15% | ✅ Pass |
| Functions | 38.96% (196/503) | 25% | ✅ Pass |
| Lines | 39.5% (1962/4966) | 25% | ✅ Pass |

### Controllers with dedicated test files

All 46 controller files have at least one corresponding test file. The test directory structure matches controller structure with per-feature test files. Notable test files: `schoolIsolation.test.js`, `jwtExpiry.test.js`, `deadRoutes.test.js`, `envExample.test.js` demonstrate intentional coverage of security-sensitive paths.

### Controllers likely below 50% coverage (inferred from overall 38% line coverage)

The five controllers that were large, complex, or partially read in S0 — `governmentController.js` (922 lines), `mediaController.js` (958 lines), `admin/adminStatsController.js` (667 lines) — likely pull coverage down disproportionately. The proxy endpoint in `mediaController.js` (268 lines, lines 690–958) involves network I/O that is hard to test without mocks, suggesting near-0% coverage for that section.

**Recommendation:** Run `npm test -- --coverage --coverageReporters=lcov` and open the HTML report to identify the specific uncovered branches. Focus on security-critical paths: `proxyMediaFile`, `deleteMedia`, `updateMedia`, `approveDocument`.

---

## Section E — Open Questions Resolution

| # | OQ from S0 | Status | Finding / Explanation |
|---|---|---|---|
| OQ-01 | Payme/Click env vars in `.env.example` — payment deleted, are these safe to remove? | **Finding** | BACKEND-021 (Low). Safe to remove. Payment controller was deleted (CLAUDE.md C-06). |
| OQ-02 | `Child.class`/`Child.teacher` STRING fields — legacy or intentional? | **Finding** | BACKEND-019 (Low). Confirmed redundant with FK relations. No code path was observed reading these STRING fields for business logic. |
| OQ-03 | Legacy `ParentActivity/Meal/Media` — active or dead code? | **Finding** | BACKEND-018 (Medium). Active: `adminStatsController.js` still queries all three legacy models for content counts. Modern models are used in all other contexts. |
| OQ-04 | `receptionController.js:29` sets `isVerified = true` on document upload — before review. Is this intentional? | **Finding** | BACKEND-016 (Medium). Confirmed. `isVerified` is set at upload, before review. The actual access gates (`isActive`, `documentsApproved`) are separate. `isVerified` means "has uploaded" not "is verified." |
| OQ-05 | Government message sending before `requireGovernment` guard — is this intentional? | **Verified harmless** | `governmentRoutes.js:52` explicitly mounts the POST route before `router.use(requireGovernment)` and requires `requireRole('parent', 'teacher', 'reception', 'admin', 'business', 'government')`. Intentional: all roles can send messages TO government. Only government can read/reply. |
| OQ-06 | `validateChildAccess` — how does it handle intake children? | **Verified harmless** | `schoolValidation.js:18-21`: intake children (`schoolId === null`) are accessible only to their own parent and government. Correct. |
| OQ-07 | `ChatMessage.conversationId` is a STRING, not a FK — intentional? | **Verified harmless (not re-read)** | S0 noted this. Chat model uses string-based conversation IDs (e.g., `"parentId_teacherId"`). Not a UUID FK — a composite key convention. No security issue. |
| OQ-08 | `tsconfig.json` at root — is TypeScript used? | **Finding** | BACKEND-022 (Low). No TS. Dead file. |
| OQ-09 | Swagger spec — is it actually empty? | **Verified** | `swagger.js:33` scans `./routes/*.js`. All routes are flat (no subdirectory routes files), so Swagger picks up JSDoc from all route files. However, controllers have no JSDoc annotations, and routes have minimal/no JSDoc comments in practice. The Swagger UI at `/api/v1/docs` likely shows only the skeleton (servers, security schemes) and no actual endpoint documentation. Not an active finding since the system is not yet customer-facing. |
| OQ-10 | `emitToUser` in `socket.js` — does it use `io.to()` (Redis-aware) or the local `userSockets` Map? | **Verified harmless** | BACKEND-032 (Info). Uses `io.to('user:${userId}').emit(...)` — Redis-adapter-aware. `userSockets` Map is maintained for connection tracking only. |
| OQ-11 | `scripts/reset-database.js` — no safety guard | **Finding** | BACKEND-023 (Low). Confirmed: no env guard, no confirmation prompt, directly drops and recreates the DB. |
| OQ-12 | Test coverage — does it actually hit 25%? | **Verified** | BACKEND-029 (Info). 38.68% statements, all above threshold. 65 suites pass. |
| OQ-13 | `parentEvaluationController.js` hard-coded limit 50 | **Finding** | BACKEND-028 (Low). Confirmed: `limit: 50` at line 62 with no pagination support. |
| OQ-14 | `telegram.js` `getUserChatIdByUsername` scrapes `getUpdates` — known? Exploitable? | **Finding** | BACKEND-034 (Info). Not exploitable — it's dead code. `sendAdminApprovalTelegram` is never imported. The actual approval flow uses a set-password link token. The function remains in the file as dead code (see BACKEND-015 for the parent finding). |

---

## Section G — S4 Re-verification Findings (appended 2026-05-19)

| ID | Severity | Title | Source | Status |
|---|---|---|---|---|
| BACKEND-007c | Medium | Batch 3 fixes lack proof tests (4 functions untested) | S4 Re-verification Pass 4 — weak-fix sample audit | ✅ Closed — Batch 15 (commits 1441f10, 7edb259, bc120e5, 8d1e161) |

**BACKEND-007c detail:** Pass 4 audited 5 randomly sampled S3 original fixes using the revert-test workflow. 4 of 5 failed — the test suite would not detect a regression in those fixes. Affected:
- `mediaController.js: deleteMedia, updateMedia, proxyMediaFile` (BACKEND-003/004) — `media.test.js` only imports `getMedia`/`getMediaItem`
- `therapyController.js: deleteTherapy` (BACKEND-013) — `therapy.test.js` only imports `startTherapy`/`getTherapyUsage`
- `activityController.js: getActivity` parent path (BACKEND-037) — never imported in `activity.test.js`
- `adminStatsController.js: getStatistics` legacy count (BACKEND-018) — mocks return 0 so sum is zero regardless

Root cause: Batch 3 (SHA ee9cc6f) was executed before the test discipline rule was added to CLAUDE.md. Fixes ARE present in code (manually verified). Gap is test coverage only. Fix: add proof tests in Batch 15.

---

## Section F — Out of Scope

The following were noticed but belong to frontend or database portal audits:

1. **All four frontend dashboards** (government, admin, teacher, reception): response shape inconsistency (BACKEND-012) will require corresponding frontend fixes.
2. **Database indexes**: the `mealController.js` teacher path does a full scan of `users` where `teacherId = ?` and then a full scan of `children` where `parentId IN (...)`. Whether these queries are fast depends on indexes on `users.teacherId` and `children.parentId`. This should be audited in the **Database portal** (Step 7).
3. **Sequelize migration vs. model drift**: several models use `underscored: true` but their column names in migrations may differ. This should be verified during the Database portal audit against the live schema via `postgres-uchqun` MCP.
4. **`scripts/seed.js`**: not read in this step. Could contain hardcoded PII or unsafe SQL. Belongs in the operational safety section of a future Database audit.
5. **`scripts/create-demo-accounts.js`**: not read. Could contain hardcoded credentials. Belongs in Database portal.
6. **Railway deploy pipeline** (`railway.toml`, `.github/workflows/railway-deploy.yml`): not audited. Belongs in infrastructure review.
