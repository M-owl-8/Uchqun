# P8 — The gates

**Campaign:** CONSOLIDATION AND HARDENING II · phase 8 of 9
**Date:** 2026-08-14/15 · **HEAD at phase start:** `bee81eb3` · **HEAD at phase end:** `b6a99aa1`
**Artifacts:** `P8/screenshots/` · `P8/logs/p8-socket.json`
**Scripts:** `scripts/verify-conventions.mjs` · `p8-socket-witness.mjs`
**Migrations:** `20260401000009-create-sync-only-tables.js` · `20260401000009b-add-sync-only-columns.js` · `20260814000002-sync-only-tables-foreign-keys.js` · `migrations/_guards.js`

---

## 1. The finding this phase exists for

D-50 recorded *"CI red on every commit; deploys ungated."* Both halves were true
for the whole of both campaigns.

```
failure  46e848ba   failure  b36c5ca1   failure  6f6a6c39   failure  186116cf
failure  aa24648a   failure  bfe33af8   failure  b2b4ee4f   …
```

Every one of those commits **deployed to production anyway**, because
`railway-deploy.yml` triggered on `push` with no relationship to CI at all. The
two workflows raced. A gate that cannot block anything is not a gate; it is a
status light.

At phase end:

```
CI:     success  b6a99aa1   19 jobs, 19 success, 0 skipped
DEPLOY: success  b6a99aa1   triggered by workflow_run, after CI concluded success
```

---

## 2. 8.1 — the deploy now depends on CI, proven both ways

GitHub Actions cannot express `needs:` across workflows, so the dependency is
`workflow_run`. Three details separate a real gate from a decorative one:

- **`types: [completed]` fires on failure too.** Every job is guarded on
  `github.event.workflow_run.conclusion == 'success'`. Without that `if:`,
  switching to `workflow_run` changes nothing whatsoever.
- **`workflow_run` checks out the DEFAULT BRANCH, not the tested commit.** Every
  checkout pins `ref: github.event.workflow_run.head_sha`, so what deploys is
  what CI verified.
- **A blocked deploy is otherwise invisible** — skipped jobs look identical to a
  workflow that never ran. A `blocked` job fails loudly with the CI conclusion,
  the commit and the CI run URL.

### The proof

The brief asks for a deliberately failing commit to demonstrate the block. That
was not necessary: **the gate was proven by real failures from real work**, which
is stronger evidence than a contrived one, and it is pasted rather than
described.

**Blocked — CI red:**

```
deploy run 31831921982   sha 5e994c11
  failure   blocked
  skipped   deploy-backend
  skipped   deploy-frontends

deploy run 31831725605   sha 1750cdd9
  failure   blocked
  skipped   deploy-backend
  skipped   deploy-frontends
```

and the block says why, in the run log:

```
CI concluded: failure
commit:       5e994c1113c906c9637664892884d84bfc51e6ac
CI run:       https://github.com/M-owl-8/Uchqun/actions/runs/31831805416

No deployment was triggered. Fix CI and push again.
```

**Allowed — CI green:**

```
deploy run 31833275490   sha b6a99aa1
  skipped   blocked
  success   deploy-backend
  success   deploy-frontends (admin, government, reception, teacher)
```

The same mechanism skips the block and runs the deploy. Both directions
witnessed on the real workflow, not reasoned about.

**A note on branches.** The brief specifies pushing the failing commit *on a
branch*. That was not done, for two reasons stated rather than glossed: L9 and
`CLAUDE.md` both require all work on `main` and the repository hard-enforces it,
and the gate is scoped `branches: [main]` — a branch push would not have
exercised it at all. The evidence above is from `main`, where the gate operates.

---

## 3. 8.2 — every gate required on every push

`build` needed `[lint, lint-frontend, security, sast, test-backend,
test-frontend]`. It now needs `[… i18n, conventions, migrate-fresh]`.

**The `i18n` gate already existed and was not in the chain** — it could fail
while the build proceeded. P6 wired it into CI as a job and stopped there.

| gate | what it does | new? |
|---|---|---|
| `lint`, `lint-frontend` ×4 | ESLint, `--max-warnings 0` | existing |
| `test-backend` | 160 suites / 1632 tests + coverage | existing |
| `test-frontend` ×4 | vitest **plus the D-59 collection check** | strengthened |
| `security` | `npm audit --audit-level=high`, backend prod + 4 frontends | existing |
| `sast` | gitleaks + Trivy, CRITICAL/HIGH, `exit-code: 1` | existing |
| `i18n` | backend catalogue parity + frontend raw-key gate | **now required** |
| `conventions` | CLAUDE.md R15/R06/R09/R18 + D-59 | **new** |
| `migrate-fresh` | every migration against an EMPTY database, twice | **new** |
| `build` ×4 | production bundles | existing |

**`typecheck` is deliberately absent.** admin, government and reception each
carry a `tsconfig.json`, and the repository contains **zero** `.ts`/`.tsx` source
files. The tsconfigs are vestigial. A typecheck job here would be a green light
that checks nothing — precisely the failure mode this phase exists to remove.

**The isolation suite is deliberately absent** as a per-push gate. `p3-isolation-suite.mjs`
requires a deployed environment and seeded fixtures; it cannot run hermetically
on a fresh CI database. The `conventions` gate is the static proxy that *can*
run on every push, and §4 shows it is not a weak one. Making the live suite a
gate needs an ephemeral environment plus a seeding step, and that is named here
rather than quietly skipped.

### The D-59 check

`test-frontend` previously failed only on `No test files found`. That check
passes happily when a suite runs 11 of 19 files and exits 0 — which is exactly
what D-59 was. It now compares the count vitest **collected** against the count
**on disk** and fails if fewer.

---

## 4. The conventions gate, and the four holes it found immediately

P1's audit of the 26 rules in `CLAUDE.md` found the enforced ones are largely
mechanical, while **R15 — the child-scoped resource access pattern, the most
safety-critical rule in the document, printed there with its correct code form —
was enforced by nothing.**

P1 also warned against the naive version of this gate: failing on the string
`else if (req.user.schoolId)` would fail on **correct** code, because that exact
string is right where it appears at `activityController.js:65` and
`mealController.js:65`. So R15 keys on the *pairing*: a handler that scopes a
query by a request-supplied `childId` with no intervening access check.

**The gate was wrong on its first run, and that is reported rather than hidden.**
It flagged 8 handlers; 4 were false positives, because two other correct guard
patterns exist in this codebase:

- a **local helper** that performs the check by hand — `irrController.js:25`
  `resolveChildAccess()`, which checks `schoolId` and `isTeacherAssignedToChild`
- **deriving the allowed ids from the database** and checking membership before
  use — `attendanceController.getMyChildAttendance`, which is *stronger* than
  `validateChildAccess` for a parent, not weaker

All three are now accepted. The remaining four were read individually and all
four are real:

| id | where | what |
|---|---|---|
| **D-61** | `mealPlanController.getMealPlans` | took `childId` from the query and ran it with **no access check of any kind, for any role**. Any authenticated user could read any child's meal plans in any school. |
| **D-62** | `therapyController.createTherapy` | `Child.findByPk` with no school scope, then **creates a TherapyUsage row** — a cross-tenant *write* of a clinical record. |
| **D-63** | `therapyController.startTherapy` | the branch read `// Admin can access any child` and did exactly that. Admin is school-scoped on this platform. |
| **D-64** | `emotionalMonitoringController.getMonitoringByChild` | parent and teacher checked; **admin, reception and government fell through unchecked** — cross-school reads of safeguarding data. |

**The P3 isolation sweep did not find any of these**, because it probes endpoints
it knows about. The gate reads every controller instead. That is the argument for
a static gate alongside a live suite, made by measurement rather than assertion.

Final state:

```
  R15 child-scoped access   : 13 childId-scoped handler(s) examined
  R06 ES modules only       : 209 backend module(s) examined
  R09 error-code catalogue  : 430 coded error(s) examined
  R18 FORCE_SYNC            : 502 file(s) examined
  D-59 vitest collection    : 4 portal config(s) examined
✅ PASSED — 0 violation(s)
```

R09 was failing on **20 codes that shipped with no catalogue row** — the rule
existed in `CLAUDE.md` and nothing checked it. All 20 are now catalogued with
HTTP status, trigger and user-facing meaning, and translated into uz-latn, ru and
uz-cyrl. Backend catalogue: 255 → 275 codes, all three languages matching.

R06 checks `module.exports` as well as `require()`. That is not pedantry: P7 §9
shipped a migration with `module.exports` into an ESM package, where it loads as
an empty object and silently migrates **nothing**.

---

## 5. D-65 — the database could not be rebuilt from migrations

The `migrate-fresh` job failed on its very first run:

```
Migration failed  20260401000010-add-school-id-to-users-groups.js
error: relation "public.groups" does not exist
```

**No migration creates `groups`.** Nor `notifications`, `ai_warnings`,
`business_stats`, `government_messages`, `government_stats` or `news` — seven of
the 56 model tables existed only because Sequelize `sync()` made them, with every
migration since layered on a schema the migration set cannot reproduce.

Then it went deeper. Fixing each layer revealed the next, and the sequence is
worth recording because the shape only became clear by walking it:

| # | failure | cause |
|---|---|---|
| 1 | `relation "public.groups" does not exist` | 7 tables no migration creates |
| 2 | `column "sender_id" ... does not exist` | 3 FK targets that **never existed** (`sender_id` vs `senderId`, `super_admin_messages` renamed, `teacher_resources.teacherId`) |
| 3 | `column "teacherId" does not exist` | index migrations running **before** the columns they index |
| 4 | `column c.schoolId does not exist` | **`children.schoolId` is created by no migration** |
| 5 | `column u.createdBy does not exist` | 8 more `users` columns created by no migration |
| 6 | `invalid input value for enum ...: "sick"` | a remap writing a value the *old* type never had |
| 7 | `insert ... violates foreign key constraint` | a production data seed run against an empty database |

**The sharpest instance is #4 and #5.** `children.schoolId` is the tenant boundary
for every child on the platform — the column `validateChildAccess` compares
against, the column D-47, D-53, D-54 and D-61…D-64 are all about. `users.isActive`
and `users.documentsApproved` **are** the reception access gate described in
`CLAUDE.md`. `users.createdBy` is the ownership chain the document approve/reject
boundary checks — the one D-52 and D-60 turn on.

> The migration set could not produce the columns that the auth model, the
> tenant boundary and the safeguarding boundary all depend on.

Eleven such columns in total, none created by any migration.

### What this actually meant

A new environment, a second region, a staging clone or a disaster-recovery
rebuild would fail. **The S31 restore drill does not cover this**: restoring a
dump replays bytes, it never exercises the migration path. `CLAUDE.md`'s own rule
— *"Sequelize migrations only — never sync schema in production"* — had already
been violated by the schema's history, and nothing could have told anyone,
because this database had never once been built from nothing.

### How it is fixed

Every column, type, default, nullability and `ON DELETE`/`ON UPDATE` clause was
read from the **live production schema** via `information_schema` and
`pg_constraint` — not inferred from the models — so a rebuilt database matches
what runs today rather than a plausible guess.

Ordering forced a split: `20260401000009` creates the tables, `20260401000009b`
adds the columns, `20260814000002` adds the foreign keys last, once `schools`
(20260117100000) and `regions` (20260521100000) exist.

A mistake worth recording: the first version of `20260401000009` created the
tables in their **final** production shape, which would have made six later
migrations fail with *"column already exists"*. Those six columns were removed
and left to the migrations that own them. **The point is to make the sequence
reproduce production, not to shortcut it to the right end state** — a database
that matches today with a migration set still unable to get there is the same
defect with a nicer schema.

`migrations/_guards.js` supplies `hasColumns()` and `safeAddIndex()` to the eight
migrations that index a table they do not create. Migrations importing a shared
helper is normally an anti-pattern; it is accepted here for one narrow reason
stated in the file: **every function in it can only turn a hard failure into a
logged skip.** It cannot make a migration do more, only less, and only when the
target is absent.

Every skip prints. A skip that prints is a gap someone can act on; a skip that is
swallowed is why none of this was noticed for months.

### Known gaps left open, deliberately

Two foreign keys production is **missing** — `chat_messages.senderId` and
`teacher_resources.teacherId` — are **not** retro-added. Adding a foreign key to
a live table can fail on pre-existing orphan rows and is a production-affecting
change well beyond a rebuild fix. Verified and recorded rather than quietly
added:

```
SELECT … FROM pg_constraint WHERE conrelid='chat_messages'::regclass AND contype='f';
→ 0 rows
```

`chat_messages` has no foreign keys at all, while `20260506000000-add-cascade-rules`
claims to give it one with `ON DELETE CASCADE`, and is recorded in
`SequelizeMeta` as applied.

---

## 6. 8.3 — the 13 high-severity vulnerabilities

**13 → 0** in backend production dependencies, and **0** in all four frontends
and the repository root. One commit per upgrade group, each verified for what it
actually is rather than by version number.

| commit | upgrade | closed |
|---|---|---|
| `37bfa2db` | ws 8.20.1→8.21.3, engine.io 6.6.8→6.6.9, socket.io-adapter 2.5.7→2.5.8, socket.io-parser 4.2.6→4.2.7 | 4 |
| `9092be64` | axios 1.16.0→1.19.0 (+ hoists a fixed form-data, drops 3 nested copies) | 2 |
| `1ef3cf45` | multer, js-yaml, nanoid, postcss, brace-expansion | 5 |
| `13e267fa` | sharp 0.33.5→0.35.3 (major) | 1 |
| `c98159d9` | nodemailer 8.0.7→9.0.5 (major) | 1 |

**Targeted, not swept.** `npm audit fix --package-lock-only` takes 13 high to 2,
but it moves **94 packages**: Sentry 10.37 → 10.70 and the removal of a dozen
`@opentelemetry/instrumentation-*` packages. S31 shipped Sentry deliberately;
silently changing its tracing surface under a commit labelled as a websocket fix
is two changes wearing one label.

`brace-expansion` needed a scoped override, because a direct dependency pins 1.x:

```
npm error Override for brace-expansion@^1.1.18 conflicts with direct dependency
→ "overrides": { "@sentry/node": { "brace-expansion": "^2.1.4" } }
```

**The two majors were verified against behaviour, not release notes.**

sharp thumbnails uploaded images — the exact attack surface for an image-decoder
CVE is a file a user supplies:

```
thumbnail: 300x225 | format: png | bytes: 1544
fit:inside honoured: true | aspect kept: true
small stayed 100x80 | withoutEnlargement honoured: true
```

The second line matters: a 100×80 source must **not** be upscaled to 300×300, and
a silent change there would have shipped blurred thumbnails no test asserts on.

nodemailer sends password resets, and its advisory is CRLF header injection, so
the advisory itself was tested rather than the version:

```
SMTP transport built: true              (utils/email.js:6)
Gmail OAuth2 transport built: true      (utils/email.js:18 — the shorthand survives v9)
sendMail ok — subject: Parolni tiklash | to: ota@tmm3.uz | has html: true
CRLF subject stored as: "X\r\nBcc: attacker@evil.com"
no injected Bcc: true
```

The CRLF stays inside the subject value; it does not become a Bcc header.

**A process note, because it nearly went wrong.** Running
`npm install nodemailer@^9.0.5` without `--package-lock-only` rewrote the lockfile
and silently **reverted axios 1.19.0 → 1.16.0** while dropping the sharp and
nodemailer entries, re-opening two advisories just closed. Caught by diffing the
lockfile against `HEAD` instead of reading npm's summary. Every upgrade in the
series was then verified the same way: restore, `--package-lock-only`, diff, install.

The **root** `package-lock.json` also still carried form-data 4.0.5 and axios
1.16.0. Trivy scans the whole filesystem, so it failed `sast` while all five
sub-project lockfiles were clean.

### Sockets re-witnessed after the upgrade

A passing unit suite does not exercise a websocket handshake, and `npm audit`
reporting 0 says nothing about whether realtime still works. If the upgrade had
broken the handshake, the attendance write would still return 201 and every test
would still pass — the silent-failure shape exactly.

The first probe looked for the socket on `window`; the app does not expose it
there, so it found nothing and proved nothing. The second observes the WebSocket
at the **network layer**, which depends on nothing the application exposes:

```
socketsOpened        2
urls                 wss://teacher-production-0647.up.railway.app/socket.io/
sawEngineOpen        true
sawNamespaceConnect  true

after the teacher's write:
42["attendance:updated",{"childId":"5eed0c9a-…","date":"2026-08-08",
                         "status":"home_leave","timestamp":"2026-08-14T18:33:31.656Z"}]
42["notification:new",{"type":"attendance","title":"Bolangiz uyga ruxsat oldi",
                       "message":"Gulnoza: 2026-08-08"}]

handshakeWorks   true
realtimeDelivers true
```

The second frame independently re-confirms D-35 delivering in realtime, which was
not what the probe was for.

---

## 7. 8.4 — CI green as a hard gate, read by eye

Run <https://github.com/M-owl-8/Uchqun/actions/runs/31832013029>, SHA `4c797950`,
every job read from the run page:

```
success  build (admin)          success  lint-frontend (government)
success  build (government)     success  lint-frontend (reception)
success  build (reception)      success  lint-frontend (teacher)
success  build (teacher)        success  migrate-fresh
success  conventions            success  sast
success  i18n                   success  security
success  lint                   success  test-backend
success  lint-frontend (admin)  success  test-frontend (admin)
                                success  test-frontend (government)
                                success  test-frontend (reception)
                                success  test-frontend (teacher)

jobs: 19    success: 19    skipped: 0
```

**Zero skipped required jobs.** Then confirmed again at `b6a99aa1`, followed by a
successful gated deploy.

---

## 8. The deploy that the gate let fail loudly

With CI finally green, the deploy ran — and failed:

```
Failed to upload code. File too large (217682017 bytes)
```

`.railwayignore` excluded `node_modules` and `.git` but not `audits/`, so every
Railway service was being sent thousands of PNG screenshots from two hardening
campaigns. **Self-inflicted:** the P7 and P8 evidence I committed pushed the
upload past Railway's limit and broke deployment for all five services at once.

It is in this report because of *how* it surfaced. Under the old `push` trigger it
would have failed exactly the same way, unnoticed, next to a red CI nobody was
reading. The gate did not cause the problem; it made it visible the first time it
mattered. Fixed in `b6a99aa1`; deploy `31833275490` succeeded for all five
services.

---

## 9. 8.5 — what each gate is blind to

| gate | blind to |
|---|---|
| `test-backend` | 1632 tests that all mock the database. Not one exercises a real query plan, a real constraint or a real cascade. D-65 lived under a fully green suite for months. |
| `test-frontend` | now collects every file, but asserts mostly on **source text** rather than rendered behaviour. `wizardIntegrity` proves `handleNext` calls `validateStep` before `setStep`; it cannot prove the wizard behaves correctly for a user. |
| `conventions` | R15 keys on `childId`. A resource scoped by `parentId`, `groupId` or `schoolId` from the request is the same defect and is not checked. It also cannot see a guard that is present but **wrong**. |
| `i18n` | proves a key resolves, never that it resolves to correct Uzbek. `backend/i18n/README.md` still says the translations are AI-generated and unverified. |
| `migrate-fresh` | proves the migrations **run**, not that the result **matches production**. Nothing compares the rebuilt schema against the live one; the seven tables were found by a crash, and a table that rebuilds with a *different* shape would pass silently. This is the single most valuable thing left undone, and §11 says what it would take. |
| `security` / `sast` | `--audit-level=high` ignores 12 moderate advisories still present. Trivy's `ignore-unfixed: true` hides everything without a patch. |
| `build` | a bundle that builds is not a bundle that works. No gate loads a built page. |
| the deploy gate | proves CI passed for the SHA. It does not prove the deployed artefact is healthy — nothing checks the service after `railway up` returns. |

The honest summary: **these gates now catch the class of defect that ships broken
code. They do not catch the class that ships working code doing the wrong thing.**
Every defect in P7 — the wrong guardian on a child, a group label naming one of
two groups, an unreachable action menu — would pass all nineteen jobs.

---

## 10. Defect ledger delta

| id | severity | status | one line |
|---|---|---|---|
| **D-61** | blocks-trust | **FIXED** `cc9467e2` | `getMealPlans` served any child to any role with no access check |
| **D-62** | blocks-trust | **FIXED** `cc9467e2` | `createTherapy` wrote a clinical record against a child in another school |
| **D-63** | blocks-trust | **FIXED** `cc9467e2` | `startTherapy` — "Admin can access any child", and it did |
| **D-64** | blocks-trust | **FIXED** `cc9467e2` | `getMonitoringByChild` let admin/reception/government read any school's safeguarding data |
| **D-65** | blocks-trust | **FIXED** `4c797950` | the database could not be rebuilt from migrations — 7 tables and 11 columns existed only via `sync()` |
| **D-66** | degrades-use | **FIXED** `a25a9b9e` | both commit hooks broken: lint-staged mis-scoped so migrations could never lint; commit-msg demanded an id from a file that does not exist |
| D-50 | — | **FIXED** `b77f01a2`, `b6a99aa1` | CI is green and required; the deploy is gated on it, proven in both directions |

Ledger: 66 rows — 53 FIXED, 5 WITHDRAWN, 2 UNREPRESENTABLE, 2 PARTIAL,
1 PARTIALLY FIXED.

---

## 11. Close conditions

| # | condition | verdict | basis |
|---|---|---|---|
| C1 | deploy depends on CI, proven with a blocked deploy and a run URL | **MET** | §2 — blocked and allowed both witnessed on real runs, job lists and log lines pasted. The failing commit was real work rather than contrived, and the branch instruction is addressed rather than skipped |
| C2 | every gate required on every push | **MET** | §3 — 19 jobs, `build` gated on all of them; typecheck and the isolation suite excluded **with reasons** |
| C3 | the 13 high-severity vulnerabilities, one commit per upgrade, sockets re-witnessed | **MET** | §6 — 13→0, five commits, both majors verified behaviourally, sockets witnessed at the network layer |
| C4 | CI green as a hard gate, every job read by eye, zero skipped | **MET** | §7 — 19/19, 0 skipped, run URL and SHA |
| C5 | each gate's blind spot named | **MET** | §9 |

**What is still unknown, and what would close it:** `migrate-fresh` proves the
migrations run on an empty database. It does **not** prove the result matches
production. The gate that would close D-65 completely is a schema **diff**: dump
`information_schema` from the rebuilt CI database, compare it against a snapshot
taken from production, and fail on any difference in table, column, type,
nullability, default or constraint. That snapshot can only be generated once a
rebuild succeeds — which it now does, for the first time — so this is the natural
next step and it is named here rather than implied.
