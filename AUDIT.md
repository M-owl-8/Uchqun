# Uchqun Platform — Independent Deep Audit

**Audit date:** 2026-08-10
**Auditor posture:** read-only on the repo; deps installed, suites/builds/servers run locally with pasted outputs.
**Scope:** full monorepo at commit on branch `claude/unshallow-commit-count-55n7q3` (== `origin/main`, 1,681 commits).
**Rule:** every claim carries file:line, a command+output, or a counted denominator. Docs are treated as claims, code as evidence.

---

## 1. Executive summary (findings first)

- The **code is more real than the docs' worst reading suggests**: backend suite is **green (1537/1537, 147 suites, 67.5 s)**, all 4 frontend suites green under `NODE_ENV=test` (542 tests), all 4 builds pass, backend boots and serves `/health` + `/health/readiness` against Postgres.
- **Severity counts (severity-tagged rows across all axis tables): CRITICAL 3 · HIGH 7 · MEDIUM 16 · LOW 13.**
- **CRITICAL-1:** a full **production credential matrix for every role including republic-level government** is committed in plaintext (`credentials.md` + 13 root `.mjs` scripts), pointing at live Railway URLs.
- **CRITICAL-2:** **two child-data endpoints have a tenant-isolation (IDOR) hole** — `GET /service-plans` and `GET /meal-plans` read any child's records with no access check, while their write siblings check. This is exactly the invariant CLAUDE.md declares mandatory.
- **CRITICAL-3 (proven by running):** the **migration set cannot build a fresh database** — 6 model tables (`groups`, `notifications`, `news`, `ai_warnings`, `government_stats`, `business_stats`) have no `createTable` in any migration; a clean `db:migrate` **fails at `relation "public.groups" does not exist`**. The schema only exists because `sequelize.sync()` fills the gap, contradicting CLAUDE.md's "migrations only — never sync in production."
- **HIGH:** tenant isolation is enforced only inside controllers, never by route middleware, and is **never verified end-to-end** (PL-029 `⬜`); 25 dependency vulns in backend (13 high); C-02 group-wide child-media visibility; the "AI" system contains **no LLM** (zero call sites); the project's own audit contains a **fabricated verification**.
- **Docs are the weakest layer:** stale totals, a spot-check that contradicts the file it claims to have read, and a `DEFERRED.md` that says "nothing parked" while the checklist carries 17 open items including a self-declared beta-blocker.
- **Genuinely sound:** append-only audit log (3 enforced layers), env validation fail-fast, CORS fail-closed in prod, JTI revocation fail-closed, liveness/readiness split, zero circular deps, clean linters.

---

## 2. Stage 0 — Inventory (the denominators)

| Dimension | Value | Method / evidence |
|---|---|---|
| Languages / LOC | JS 79,202 (579 files) · JSX 50,682 (320) · MJS 3,864 (18) · CJS 641 (18) · JSON 61,804 (54) · MD 54,896 (232) · **0 TS/TSX** | `find … -name '*.ext' \| xargs wc -l`, node_modules excluded |
| Source LOC (hand-written) | backend src 27,737 · admin 11,694 · teacher 21,996 · reception 8,061 · government 9,287 · shared 3,968 | `wc -l` per tree |
| Apps / portals | 4 React apps (admin/teacher/reception/government) + 1 Express backend. "5th portal" (parent) = role-gated route tree **inside** teacher app: 42 files, 6,815 LOC under `teacher/src/parent/` (`teacher/src/App.jsx:52-126`) | verified |
| Not apps | `TeacherParent/` = 8 JPEGs + 1 PDF (no code); `twa/` = 2 Bubblewrap manifests, unsigned stubs (`fingerprints: []`, no keystore) | `find`, manifest read |
| Routes/endpoints | **304 total**: 303 `router.*` across 26 route files + 1 inline `server.js:58` | enumerated by sub-agent, per-file table in A1 |
| DB models | **56** (`models/*.js` minus index.js) | `ls models/*.js \| grep -v index \| wc -l` |
| Migrations | **101** | `ls migrations/*.js \| wc -l` |
| Test files | backend 147 suites / 26,651 LOC; frontend 76 files (admin 31, teacher 19, reception 9, government 17) | `find … -name '*.test.*'` |
| Test-to-source ratio | backend 26,651 / 27,737 = **0.96:1** | computed |
| Deps (backend) | 32 prod + 14 dev; **25 vulns (13 high, 12 moderate, 0 critical)**; 23 outdated | `npm audit`, `npm outdated` |
| Deps (frontends) | admin 4 vulns (2h/2m), teacher 8 (5h/3m), reception 5 (2h/3m), government 4 (2h/2m) | `npm audit --json` per app |
| CI/CD | `.github/workflows/ci.yml` gates: eslint (all 5), npm audit `--audit-level=high`, gitleaks + Trivy (CRITICAL/HIGH, exit 1), backend jest+coverage, frontend vitest (fails if no test files), frontend eslint, build. `build` needs all prior jobs | file read |
| CI/CD (disabled) | `db-backup.yml` and `health-check.yml` both **DISABLED BY DEFAULT** (require repo var flip + uncomment schedule) | file headers |
| Secrets handling | `config/env.js` Joi-validates: `JWT_SECRET`/`JWT_REFRESH_SECRET` `.min(32).required()`, must differ (`:122`); FRONTEND_URL required; **fail-fast on import**. `.env.production` files tracked but contain only public `VITE_API_URL` | file read |
| Git shape | 1,681 commits; 6 committers (853 M-owl-8, 463 akbarjonilhamov, 131 zokirjanov, 80 Claude, 59 Murodbek, 47 paxbyme); first 2026-01-02, last 2026-08-10; peaks 2026-01 (572), 2026-05 (667); tailed to 4/month by 2026-07/08 | `git log` |
| **Does it build?** | **YES** — all 4 frontends `npm run build` exit 0 | pasted |
| **Does it run?** | **YES** — backend boots on Postgres, `/health`→200, `/health/readiness`→`{database:healthy}` | pasted below |
| **Do tests pass?** | **YES** — backend 1537/1537; frontends 542/542 under `NODE_ENV=test` | pasted below |

**Boot proof:**
```
$ curl /health        → {"status":"ok",...,"uptime":6.01}
$ curl /health/readiness → {"status":"ready","checks":{"database":"healthy"}}
$ (DB unreachable) /health → 200 ; /health/readiness → {"status":"not ready","checks":{"database":"unhealthy"},"error":"database ... does not exist"}
```

**Backend test proof:**
```
Test Suites: 147 passed, 147 total
Tests:       1537 passed, 1537 total
Time:        67.528 s
```
Coverage (lcov, computed): **lines 63.6% (4569/7188) · branches 56.7% (2897/5108) · functions 63.2% (483/764)**.

**Frontend test proof (`NODE_ENV=test`):** admin 167/167, teacher 167/167, reception 84/84, government 124/124 — all suites pass. (Under `NODE_ENV=production`, which leaked into my first run, React Testing Library's `act()` throws and every suite fails — a runner-env footgun, not a code defect; CI sets `NODE_ENV=test`.)

---

## 3. Axis sweeps (CRITICAL → LOW within each)

### A1 — Security

| Sev | Finding | Evidence | Blast radius | Fix |
|---|---|---|---|---|
| **CRIT** | Production credentials for **all roles incl. republic government** committed in plaintext | `credentials.md:1-6` ("Environment: Railway production", "Password (all accounts): `Test@2026`") lists 3 gov + 4 schools × {admin,reception,2 teacher,3 parent}; `tmp-s32-gates.mjs:18,90-96` uses `Test@2026` for all 3 gov accounts; `seed-bobur-content.mjs:29-34` 3 roles; 13 of 15 root scripts hold the password. All git-tracked; `.gitignore` has no `tmp-*`/`verify-*`/`*.mjs` rule | Anyone with repo read (contractor, fork, leak) logs into live gov platform holding children's PII | S (rotate + gitignore + purge history) |
| **CRIT** | IDOR: cross-tenant read of child service/meal plans | `servicePlanController.js:22-36` `getServicePlans` queries `where:{childId,year}` with **no** `validateChildAccess`; route `servicePlanRoutes.js:10` has only `authenticate`. `mealPlanController.js:13-36` identical shape; route `mealPlanRoutes.js:24`. Write siblings DO check (`mealPlanController.js:60`, `servicePlanController.js:86,130`). Violates CLAUDE.md mandatory child-scope pattern | Any authenticated user reads any child's plans given a childId (UUIDv4 — not blind-enumerable, caps mass-harvest) | S (add `validateChildAccess` to both GETs) |
| **HIGH** | Tenant isolation lives only in controllers, never route middleware, and is **never tested end-to-end** | `requireSchoolScope` applied in exactly 1 file (`adminRoutes.js:68`); `requireRegionScope` in exactly 1 (`governmentRoutes.js:65`). All child-data routers (teacher 68, parent 29, media, activity, meal) rely on per-controller `validateChildAccess` (77 call sites, 13 controllers). PL-029 (cross-school access attempt) = `⬜ Not verified` (`LOOP_PRE_LAUNCH_CHECKLIST.md:150`) | One missed check per new route = child-data leak; whole-platform isolation unproven | M |
| **HIGH** | 25 backend dependency vulns (13 high) reachable at prod path | `npm audit --omit=dev` → 2 high (`form-data 4.0.0-4.0.5` CRLF injection). Full `npm audit`: 25 total incl. `axios`, `nanoid`, `ws`, `multer`, `sharp`, `nodemailer`, `sequelize`, `socket.io-parser` highs | CRLF/upstream request tampering via multipart; each CVE its own surface | S (`npm audit fix`, mostly non-breaking) |
| **HIGH** | Group-wide child media visibility (C-02) | `CLAUDE.md:57` "⚠️ REQUIRES product/legal sign-off before launch"; parents of different children in one group see each other's uploaded child photos/video by design | Children's images cross-family; child-safeguarding/legal | M (design decision) |
| **MED** | `requireTeacher` admits teacher **+ reception + admin** | `middleware/auth.js:159-167`; teacher router (68 routes) uses only `requireTeacher` (`teacherRoutes.js:60`). Reads, `POST /journal`, emotional-monitoring writes reachable by reception/admin unless a route adds `requireRole('teacher')` | Reception/admin reach teacher-scoped child records | M |
| **MED** | Unauthenticated multipart upload on `admin-register` | `authRoutes.js:22-29` — `POST /auth/admin-register` public, accepts `uploadDocuments` files behind rate limiter only | Unauth file writes to temp/storage | M |
| **MED** | `checkChildAccess` skips school match when staff `schoolId` is null | `childController.js:200` `if (req.user.schoolId)` — a staff account with null `schoolId` bypasses the school comparison on `PUT /child/:id` | Null-school staff edits any child | S |
| **MED** | `/uploads` static served with no auth | `server.js:150` `express.static` — uploaded media/documents path-served without gating | Direct-URL access to stored files | M |
| **LOW** | Readiness leaks DB error string outside prod | `health.js:59-61` returns `error.message` (DB name) when `NODE_ENV!==production`. Gated in prod | Info disclosure in dev/staging | S |
| **LOW** | `user/message-to-government` lacks the validator its siblings use | `userRoutes.js:19` — no `messageToGovValidator` (admin/teacher/reception equivalents have it) | Unvalidated input to gov inbox | S |

**Negative checks run (with output):**
- Secrets in git **history** (not just HEAD): `git log --all -p -G'(sk-[A-Za-z0-9]{20}|AKIA[A-Z0-9]{16}|BEGIN (RSA|EC|OPENSSH) PRIVATE KEY)'` → **no matches**. `.env`/`backend/.env` never added (`git log --diff-filter=A` empty). History only contains **example** placeholders (`sk-your-openai-key`, `TELEGRAM_BOT_TOKEN=123456789:ABC…`, `user:pass@host`) in `.env.example` — not real.
- SQL injection: only 3 raw-SQL sites (`adminStatsController.js:343,420,438`) — all static string literals with no interpolation (`QueryTypes.SELECT`), parameter-free. No template-interpolated SQL found.
- Swallowed catches: `grep -rzoP "catch\s*\([^)]*\)\s*\{\s*\}"` → **0 empty catches**. 436 catch blocks; error handler gates stack leak on prod (`errorHandler.js:4,36,47`).

### A2 — Correctness & test reality

| Sev | Finding | Evidence | Fix |
|---|---|---|---|
| — | Suite passes for real | 1537/1537 backend (pasted), 542/542 frontend (`NODE_ENV=test`) | — |
| **MED** | Error-path assertions are thin vs the codebase's own rule | CLAUDE.md mandates a non-200 test per error-path fix. Only **12 of 147** backend suites assert a 4xx/5xx status (`grep -lE '(status\|statusCode)…(400\|401\|403\|404\|409\|422\|500)'`). Mitigant: **54 suites** use `mockRejectedValue`/`toThrow` to exercise throw paths | M |
| **MED** | Coverage floors on untested infra | 0% on `middleware/upload.js`, `uploadChildren.js`, `uploadImportCsv.js`, `utils/email.js`, `utils/telegram.js`; `redisClient` 44%, `redisRateLimitStore` 41%, `rateLimiter` 64%. `irrController` (the flagship domain module) **39.5%** lines | M |
| LOW | Zero snapshot tests, zero no-assertion tests | `grep -rl toMatchSnapshot __tests__` → 0; no test file with 0 `expect()` in backend or any frontend | — |

No money/critical-path logic exists to test — payments removed (A7). "AI" logic is deterministic thresholds, tested in `aiWarning.test.js` against hand-built rating arrays (mocks shaped from the code, not realistic external data).

### A3 — Technical debt, quantified

| Sev | Finding | Evidence |
|---|---|---|
| MED | 86 unused exports | `knip --production --include exports` → 86 (incl. `validateEnv`, `requireBusiness`, `schoolWhere`, `uploadMultiple`, several controllers). Some false positives (route-wired dynamically) |
| MED | 9.06% duplication | `jscpd` → 451 clones, 5,877 dup lines across 395 files |
| LOW | TODO/FIXME density: **1** | `grep -rniE 'TODO\|FIXME\|HACK\|XXX'` src trees → 1 real (`government/src/pages/Schools.jsx:18` CP-001 pagination). Rest were i18n string false-positives |
| LOW | `console.*` in src: **0** | backend 0, frontends 0 (winston + shared logger used throughout) |
| LOW | No type safety available | 0 TS files; plain JS. Backend eslint `--max-warnings 0` passes; all 4 frontend eslints pass |
| LOW | Deprecated API refs in docs | `CLAUDE.md:127` still lists "Payment" as a sensitive area; subsystem deleted (A7) |

### A4 — Architecture & mess

| Sev | Finding | Evidence |
|---|---|---|
| — | Zero circular dependencies | `madge --circular` backend "No circular dependency found!"; same for all 4 frontends |
| — | Linters configured AND clean | backend `.eslintrc.cjs` + `eslint . --max-warnings 0` exit 0; 4 frontend `npm run lint` exit 0. No Prettier (CLAUDE.md: match surrounding style) |
| MED | God files | top by LOC: `teacher/src/pages/IrrShell.jsx` 1,422; `governmentController.js` 1,333; `models/index.js` 1,143 (associations hub); `mediaController.js` 990; `reception/src/pages/ParentManagement.jsx` 815; `teacher/controllers/irrController.js` 765 |
| LOW | No `routes/index.js` | 26 routers mounted directly in `server.js:155-180`; no central auth application (auth is per-router) |
| LOW | Mid-file imports | `governmentRoutes.js:118-124` imports appear after route defs (hoisting saves it) |

Structure is discernible and conventional: `routes → controllers → models`, `middleware/`, `utils/`, `services/`, `validators/`, `config/`. Frontends share via `shared/` (Axios `withCredentials`).

### A5 — Data layer

Denominators: 56 models, 101 migrations, 577 column defs, 131 FK-shaped columns.

| Sev | Finding | Evidence |
|---|---|---|
| **CRIT** | Migrations cannot build a fresh DB (proven by running) | 6 tables have no `createTable` in any migration: `groups`, `notifications`, `news`, `ai_warnings`, `government_stats`, `business_stats` (grep of all `createTable`/raw `CREATE TABLE` = 0 each). `node -e import('./config/migrate.js').runMigrations()` on a clean DB → **`MIGRATE FAIL: relation "public.groups" does not exist`** (pasted). Later migrations depend on the missing tables: `20260401000010-add-school-id-to-users-groups.js:22` `addColumn('groups',…)`, `20260523100000-backfill-child-schoolid.js:11` `UPDATE children SET "schoolId"`. Gap filled by `sync()` at `models/index.js:1077` / `server.js:256` |
| **HIGH** | `notifications` table has zero indexes in any migration, on the hottest read path | model declares `indexes:[{userId,isRead},{createdAt}]` (`models/Notification.js:65-72`) but only `sync()` materializes them; no migration touches the table. Also unindexed: `notifications.childId/schoolId/relatedId` |
| **HIGH** | Bulk write loops are sequential AND non-transactional (partial-write on failure) | only 2 of 63 controller/service files use `sequelize.transaction`. `attendanceController.js:24` ~5 serial queries/child (30-child group ≈150 queries), no txn — mid-loop failure half-writes attendance (safeguarding data). Same shape: `journalController.js:125`, `adminImportController.js:204` (`Child.create`+`logAudit` per row, fails at row 400/500 → 399 committed) |
| MED | Model-vs-DB drift: `users.status` nullability | `models/User.js:60` `allowNull:false, default 'active'`; `migrations/20260520120000-add-status-to-users.js:7` adds it `allowNull:true`. DB nullable, model believes NOT NULL — a NULL passes DB, fails model validation on read |
| MED | 5 model columns exist only via `sync()` | `users.groupId/createdBy/teacherId` (`User.js:78,86,95`), `children.schoolId/groupId` (`Child.js:47,63`) — no migration adds them; index migrations that reference them swallow "column does not exist" in bare `catch{}` (`20260330000000:28`, `20260506130000:36`) |
| MED | 10 genuinely non-reversible migrations + lossy downs | down performs a DB op in 91/101; 10 no-ops. Worse: `20260506000000-add-cascade-rules.js:77` `down()` takes **no `queryInterface` param** (can never reverse ~15 tables' cascade rules); `20260606000001-update-attendance-status-enum.js:35` and `20260602000003-update-school-type-enum.js:77` collapse enum values lossily; `20260330000000:44` down derives table names by string surgery and swallows failures |
| MED | 23 of 131 FK columns unindexed | incl. `daily/weekly_monitoring_entries.irrId`, `teacher_reflections.schoolId`, `child_journal_entries.teacherId`, `schools.districtId`, `users.govRegionId`, plus 10 audit `*By` columns. 108/131 (82%) covered |
| MED | Base64 avatars stored in DB | PL-011 `⬜` — not migrated to object storage (`migrations/20260423000000-avatar-text-column.js`) |
| LOW | Duplicate migration timestamp | two files share `20260608000001-*` (attendance-enum-fix + password-reset); ordering is lexicographic-dependent, not intentional |
| LOW | Referential integrity gaps by design | `schools.regionId/districtId/categoryId` are bare UUIDs with **no FK constraint** (`School.js:73,78,84`, deliberate/staged); 10 models declare `references:` but no `onDelete:` (model/DB disagree on delete semantics); 5 models fully unconstrained (`AuditLog`, `ChildJournalEntry`, `District`, `ImportJob`, `TeacherReflection`). Aggregate: 16 unique, 48 ENUM, 91 onDelete (58 SET NULL / 41 CASCADE / 19 RESTRICT across migrations) |
| LOW | Invariants enforced in JS only, not DB | `User.status`/`School.type` migrated from PG enum to STRING + `isIn` validator (no CHECK); `IRR` draft→active promotion ("mandatory clinical fields") enforced only in controller — DB allows an `active` IRR with all 13 clinical fields null (`IRR.js:40-72`) |
| — | Audit log immutability real (3 layers) | `models/AuditLog.js:50-74` verified — static `update`/`destroy` throw; instance `update`/`destroy`/`save`(existing) throw; `_originalSave` preserves inserts; DB REVOKE migration present. Gaps (not claimed): `bulkCreate`/`upsert`/`truncate` not overridden; `immutableError` throws synchronously so `.catch()` won't catch it (no current call site affected) |

*(Data-layer findings independently verified: the fresh-DB failure by execution, the 6 missing tables by grep, immutability by direct read.)*

### A6 — Prod readiness

| Sev | Finding | Evidence |
|---|---|---|
| HIGH | Single-instance-only unless Redis set | JTI revocation + login lockout + Socket.IO all in-memory without `REDIS_URL` (`middleware/auth.js:6-7,23`; CLAUDE.md Scaling; PL-UZ-03 `⬜`). Multi-instance deploy silently breaks revocation/lockout |
| MED | Backups disabled by default | `db-backup.yml` requires repo-var flip + schedule uncomment; contains children's PII per its own header |
| MED | Sentry code-complete but dark | PL-005 — `utils/errorTracker.js` wired, PII scrub, but no DSN provisioned; no-op until set |
| MED | Storage backing unshipped for target env | Media upload requires `APPWRITE_*` (`config/storage.js:28-55`) or opt-in local fallback; PL-UZ-02 "NOT yet surfaced to the partner" `⬜` |
| — | Graceful failure verified | Liveness stays 200 while readiness reports `unhealthy` on DB-down (pasted). SIGTERM/SIGINT graceful shutdown + 30s force (`server.js:200-235`); `unhandledRejection`/`uncaughtException` handlers present |
| — | Config per-env, validated | `config/env.js` fail-fast; CORS fail-closed in prod (`server.js:88-121`); HTTPS enforced in prod (`:70`); rate limiters: api/auth/login/loginIp/changePassword (`middleware/rateLimiter.js`) |
| — | Deploy story documented | Railway auto-deploy on main (`railway.toml`, `.github/workflows/railway-deploy.yml`); `RUN_MIGRATIONS`/`start:migrate` |

**[UNCERTAIN]** — infra not in repo: actual Railway env vars, whether `REDIS_URL`/`APPWRITE_*`/`SENTRY_DSN` are set in production, whether seeded demo accounts are still live. Resolve by inspecting Railway config.

### A7 — Scope vs claims → full table below (§4).

### A8 — Per portal

| Portal | Auth posture | Tests (NODE_ENV=test) | Notable |
|---|---|---|---|
| Backend | per-router auth; 2 IDOR GETs unguarded | 1537 pass | 304 routes; school-scope in controllers |
| Admin | `requireAdmin` + `requireSchoolScope` file-wide (`adminRoutes.js:66-68`) | 167 pass | bulk import real |
| Teacher (+Parent tree) | `requireTeacher` (admits reception/admin) | 167 pass | ИРР flagship; hosts parent portal at `/` |
| Reception | `requireReception` file-wide | 84 pass | additionally gated on `documentsApproved && isActive` |
| Government | `requireGovernment` + `requireRegionScope` | 124 pass | region scoping in `getWarnings`/`resolveWarning` |

### A9 — AI system

- **There is no AI system.** OpenAI SDK is a dependency (`openai 4.104.0`) with **zero live call sites** (`grep 'new OpenAI|chat.completions|createCompletion'` → 0). README.md:138 ("teacher AI chat assistant") describes an **absent** feature.
- "AI warnings" = deterministic thresholds: `aiWarningController.js:38` average, `:45` `if(avgRating<2.5)`, `:47-48` severity ladder; `aiAnalysis` at `:53` is a hand-built Uzbek template string. No prompts, no injection surface (no user text reaches any model), no model config, no cost controls needed. Nothing breaks if "the provider is down" — there is no provider.
- Consequence: PL-UZ-04 (AI egress risk) in the checklist is a **fictional risk item**.

### A10 — Legal / provenance

| Sev | Finding | Evidence |
|---|---|---|
| LOW | LGPL transitive deps | `license-checker --production`: 348 pkgs — MIT 261, Apache-2.0 49, ISC 14, BSD 20, **LGPL-3.0-or-later 2** (`@img/sharp-libvips-*` — dynamically linked native libs, standard for sharp), Python-2.0 1, MIT-0 1. No GPL, no unlicensed. Commercial-safe |
| HIGH | PII vs privacy claims | Government directory pages expose student/teacher/parent names, emails, phones, DOB (PL-014, signed 2026-06-11). C-02 cross-family child media. i18n unverified before real users (PL-009-VERIFY beta-blocker). Children's special-education data with tenant isolation unverified |
| [UNCERTAIN] | Copied code w/o attribution | No evidence found; not exhaustively checkable |

---

## 4. A7 — Scope vs claims reconciliation (full)

| Feature (claimed) | Verdict | Evidence |
|---|---|---|
| AI warnings | **FACADE** (works as rule engine, mislabeled "AI") | `aiWarningController.js` 405 lines, 0 LLM calls; UI in admin/gov/parent |
| Teacher AI chat | **ABSENT** | README.md:138 claims it; no backend call site exists |
| Emotional monitoring | **WORKS** | `teacherRoutes.js:119-125` + `parentRoutes.js:94-95`; `emotionalMonitoringController.js`; UI wired |
| ИРР / ПТПК plans | **WORKS** | `teacherRoutes.js:129-162`; `irrController.js`; `IrrShell.jsx:181-536` (16 endpoints) |
| Bulk CSV import | **WORKS** | `adminImportController.js:69,268,288` (`setImmediate(processImport)`), per-row atomic; `ImportJob` model |
| Media upload | **PARTIAL** | code complete; storage backing (`APPWRITE_*`) unshipped for target env (PL-UZ-02 `⬜`) |
| Messaging / chat | **WORKS** | `chatRoutes.js:24-30`; `chatController.js` 294 lines; parent+teacher UI |
| Reflections | **WORKS** | `teacherRoutes.js:109-110`; `reflectionController.js`; `DailyReflection.jsx` |
| School ratings | **WORKS** (docs understate) | parent + **government** UI both exist; see fabricated-verification note |
| Attendance | **WORKS** | `attendanceRoutes.js` + `parentRoutes.js:59`; teacher+parent UI |
| Meals | **WORKS** | `mealRoutes.js:18-24`; teacher+parent UI |
| Reports / analytics | **PARTIAL → mostly ABSENT** | only aggregates (`/admin/statistics`, `/government/stats`); no reporting subsystem; PL-013 `⬜` |
| i18n | **PARTIAL** | ships but every backend locale `verification_status: UNVERIFIED`; key-count drift across languages; metadata string count stale ~2×; PL-009-VERIFY beta-blocker `⬜` |
| Payments (C-06 "deleted entirely") | **VERIFIED DELETED** | no route/controller/model/mount; `20260506110000-drop-payments.js`; 2 regression guards; 0 frontend call sites |

**Facade count: 1 (AI warnings) + 1 absent (AI chat) + 2 partial-to-absent (reports, media-in-target-env).**

**Three doc-integrity defects (the most damaging outputs of this reconciliation):**
1. **Fabricated verification.** `features-INDEX.md:161` records spot-check #9: *"Inventory correctly says 'no frontend UI' — confirmed by reading SchoolDetail.jsx."* The government rating UI **is in that file**: `government/src/pages/SchoolDetail.jsx:40` `GovRatingForm`, `:76` `api.post('/government/schools/${schoolId}/rate')`, `:193` render. A spot-check claiming to confirm the absence of code that occupies lines 40–193 of the named file is fabricated — it discredits the "10/10 verified" header at `:5`.
2. **C-02 doc contradiction.** `CLAUDE.md:57` says C-02 "REQUIRES sign-off before launch" (open); `LOOP_PRE_LAUNCH_CHECKLIST.md:60` says "✅ CLOSED (signed 2026-06-11)". Both are shipped as authoritative; they disagree.
3. **Empty deferral register.** `DEFERRED.md:9` "No active deferred items" while the checklist carries 17 `⬜` including a beta-blocker (PL-009-VERIFY), 5 unverified critical flows (PL-026–030, incl. tenant isolation PL-029), and 5 open UzCloud procurement dependencies (PL-UZ-01–05).

Also: totals disagree (CLAUDE.md 482 vs features-INDEX 481; admin 94 vs 95), and `features-INDEX.md:125,145` reference a `/teacher/ai-warnings` page that is now a redirect (`teacher/src/App.jsx:151`).

---

## 5. ★ Inheritance assessment (for someone deciding to JOIN)

### The 10 heaviest things you would inherit

| # | What | Evidence | Fix | Wait? |
|---|---|---|---|---|
| 1 | Production credentials committed for every role incl. republic gov | `credentials.md`, 13 root `.mjs` | S | **No — rotate now** |
| 2 | IDOR on `GET /service-plans` + `/meal-plans` | controllers cited in A1 | S | **No** |
| 3 | Migrations can't build a fresh DB (schema depends on `sync()`) | A5-CRIT, proven by running | M (write the 6 missing createTable migrations) | **No** |
| 4 | Tenant isolation unproven end-to-end; enforced only in controllers | PL-029 `⬜`; scope middleware in 2 files | M (build the test matrix) | **No** |
| 5 | Non-transactional bulk write loops (attendance/journal/import) | A5-HIGH | M | Soon |
| 6 | "AI" is branding over a rule engine + an absent chat feature | A9 | S (rename/docs) or L (build real AI) | Yes (rename now, build later) |
| 7 | Doc layer you can't trust (fabricated verification, empty DEFERRED, wrong totals) | §4 | M (re-verify inventory) | Partly |
| 8 | 25 backend + ~21 frontend dep vulns | `npm audit` | S | Soon |
| 9 | i18n unverified before any real user (beta-blocker) | PL-009-VERIFY `⬜`, 218+ codes | L (needs native reviewer) | **No for beta** |
| 10 | Single-instance until Redis; storage/backups/Sentry dark; `notifications` unindexed; base64 avatars | A6, A5; PL-UZ-02/03, PL-005, PL-011 | M | Before launch/scale |

### What is genuinely sound (evidence-cited, not courtesy)
- **Append-only audit log** — 3 enforced layers verified (`AuditLog.js:51-73`) + DB REVOKE migration.
- **Test discipline** — 0.96:1 test:source, 1537 backend tests green, 542 frontend green, CI fails on missing frontend tests.
- **Fail-safe defaults** — env validation fail-fast (`config/env.js`), CORS fail-closed in prod, JTI revocation fail-closed on Redis error (`auth.js:35`), liveness/readiness split works under DB-down.
- **Clean structure** — 0 circular deps, linters green across all 5 packages, conventional layering.
- **Real domain software** — ИРР workflow (`IrrShell.jsx`, 16 endpoints), async bulk import with per-row atomicity. Not a demo shell.
- **Clean payment removal** — fully excised + guarded by regression tests.

### 3 questions to ask the current coder before committing
1. The migration set can't build a fresh DB (fails at `groups`) — how is production's schema actually created, and what happens on a from-scratch UzCloud deploy or disaster-recovery restore?
2. Are the seeded `*.up.railway.app` accounts in `credentials.md` **live right now**, and has cross-tenant isolation (PL-029) ever actually been exercised against two schools? (`GET /service-plans` + `/meal-plans` skip `validateChildAccess` — known gap or oversight? what else shares it?)
3. The README sells "AI"; the code has no LLM. Is real AI on the roadmap, or is that copy that needs to change before a government demo?

### Remediation-before-feature-work estimate (one skilled dev)
Derivation: credentials rotation + gitignore + history purge (0.25) · 2 IDOR fixes + child-scope sweep (0.25) · **write 6 missing createTable migrations + prove fresh-DB build in CI (0.5)** · tenant-isolation test matrix + fixes (0.75) · wrap bulk write loops in transactions + `notifications` index (0.25) · dep-vuln sweep across 5 packages (0.25) · docs re-verification/reconciliation (0.5) · Redis/storage/backup/Sentry productionization (0.75) · migration reversibility + avatar migration (0.5) · error-path test backfill to satisfy the repo's own rule (0.5). **≈ 4.5 dev-months of remediation before net-new feature work** — excluding the i18n native review (external vendor, calendar not dev time) and any real-AI build.

---

## 6. Stage 2 — Adversarial self-check (unedited)

**a) Re-derive the 5 most severe findings from scratch:**
1. *Committed prod credentials* — **CONFIRMED.** `git ls-files credentials.md` tracked; `grep -c 'Test@2026' credentials.md` = 32; `tmp-s32-gates.mjs:18` password used for all 3 gov accounts. Direct re-read.
2. *IDOR service/meal plans* — **CONFIRMED.** Re-read `servicePlanController.js:22-36` and `mealPlanController.js:13-36`: no `validateChildAccess`; routes carry only `authenticate`. Write paths (`:60`,`:86`,`:130`) do check. Not inferred — read.
3. *Tenant isolation unproven* — **CONFIRMED** as stated but **scoped**: isolation *is* enforced in controllers (77 call sites), so it is not "absent," it is "unverified end-to-end and route-middleware-thin." Phrasing corrected accordingly.
4. *Fabricated verification* — **CONFIRMED.** Read both `features-INDEX.md:161` (claims no UI) and `SchoolDetail.jsx:40,76,193` (UI present). Direct contradiction.
5. *No AI* — **CONFIRMED.** `grep 'new OpenAI|chat.completions'` non-test backend = 0; `aiWarningController.js` is arithmetic.

One **DOWNGRADED**: I initially weighed C-02 as "open." The checklist shows sign-off 2026-06-11; CLAUDE.md is merely stale. So C-02 is HIGH-by-design-with-sign-off, and the *real* finding is the CLAUDE.md-vs-checklist contradiction, not an unresolved blocker.

One **UPGRADED after Stage-1**: the migration-set fresh-DB failure (A5-CRIT). I did not trust the sub-agent's claim that 6 tables lack `createTable`; I ran `config/migrate.js` against an empty database and it aborted at `relation "public.groups" does not exist`. Confirmed by execution, then elevated to CRITICAL — it breaks the documented migrations-only deploy contract.

**b) Strongest case against this audit (3+ ways it could be wrong):**
1. **Runtime behavior largely unobserved.** I proved boot + health + test-suite, but did **not** exercise the 304 endpoints live, did not attempt the IDOR against a running server, and did not log into the portals. The IDOR is confirmed by code-read, not by a live 200 leaking another school's child. *Closes by:* seed two schools locally and run the cross-tenant request.
2. **Coverage/severity sampling is partial.** I verified 2 IDOR gaps by reading the 2 controllers a sub-agent flagged; I did not read all 61 controllers for the same pattern. There may be more unguarded GETs. Error-path assertion count (12/147) is a grep proxy, not a per-test read. *Closes by:* a full `validateChildAccess`-presence sweep across every child-scoped GET.
3. **Infra is invisible.** Whether Redis/Appwrite/Sentry/backups are actually configured in Railway, and whether seeded accounts are live, are all [UNCERTAIN] from the repo alone. Several A6 severities would move if prod env were inspected.
4. **Sub-agent inputs partially trusted.** Route enumeration (304) and scope reconciliation came from sub-agents; I independently re-verified the load-bearing claims (both IDORs, the fabricated verification, C-02, no-AI, payment removal) by direct read, but did not re-count all 304 routes myself.
5. **Static schema analysis vs live DB.** The index-gap (23/131) and drift findings are computed from reading migrations + models; several migrations swallow errors in `catch{}`, so the *actual* production schema may differ from what the migration set predicts. The fresh-DB failure and the 6 missing tables are proven (executed/grepped); the finer index/constraint counts would be settled definitively by querying `information_schema` on the live database, which I did not touch (read-only, and it is not in the repo).

---

*End of audit. Findings are on paper; the decision is the reader's.*
