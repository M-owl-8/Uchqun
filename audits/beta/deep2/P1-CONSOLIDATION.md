# P1 — Consolidation sweep

**Campaign:** CONSOLIDATION AND HARDENING II · phase 1 of 9
**Date:** 2026-08-14 · **HEAD at phase start:** `3d780e33` · branch `main`
**Machine outputs:** `audits/beta/deep2/inventory.json` · `claudemd-rules.json` · `deadcode.json`
**Scripts:** `inventory.mjs` · `claudemd-audit.mjs` · `deadcode.mjs` · `d44-probe.mjs`

---

## 1. Inventory

256 tracked markdown documents (`git ls-files "*.md"`), each with its last commit
SHA, date, and any authority claim it makes. Full machine output in
`inventory.json`; `inventory.mjs` regenerates it.

```
files: 256
with an authority claim: 88
```

**88 of 256 documents assert authority over something** — "canonical", "source of
truth", "AUTHORITATIVE", or an `N/N PASS` verdict. That is the consolidation
problem stated as a number: the repository does not have one source of truth per
domain, it has eighty-eight, and nothing reconciles them.

The oldest documents still carrying present-tense claims:

```
2026-05-19  c29a3259  audits/backend/00-understanding.md
2026-05-19  6a7be142  audits/backend/10-idor-sweep.md
2026-05-18  2b979420  docs/audit/closures/V5-CRIT-01.md
```

Nine documents in `audits/backend/` are unchanged since 2026-05-19 — three months
of product change ago — and `10-idor-sweep.md` is an IDOR sweep, i.e. it speaks to
exactly the class D-47 turned out to be.

---

## 2. Contradiction ledger

Five pairs where two documents assert incompatible things. The final column is the
one that matters.

### C-1 · `ISOLATION-REPORT.md` 29/29 PASS **vs** D-47

| | |
|---|---|
| **Claim A** | `audits/beta/ISOLATION-REPORT.md:5` — "COMPLETE — 29/29 PASS, 0 PARTIAL, 0 BLOCKED"; `:103` — "**No isolation breaches detected.**" |
| **Claim B** | D-47 — an admin at school A reads school B's child activity (13 records) and meal (39 records) data by supplying `childId`. `deep/P7-CROSS-CUTTING.md` §2 |
| **True** | **B.** Reproduced against production, root-caused to `activityController.js:53-63`, `mealController.js:54-63` and `:150-151`, fixed in `6727bc27`, re-witnessed as `403`. |
| **How A survived** | Structural, not accidental. Read `ISOLATION-REPORT.md:37-43`: every Part A probe supplies a foreign id on an endpoint whose **role branch already validated** — `/parent/attendance`, `/parent/children/:id/journal`, `/teacher/children/:id`, `/admin/teachers/:id`. The single probe against `/activities` (ISO-T02, `:58`) supplies **no `childId` at all**, which is precisely the branch that was safe. **No probe anywhere in the suite supplies a `childId` as an admin or reception account** — the exact evasion D-47 used. The suite contains **zero reception probes** and **zero write or delete probes**. It could not have found D-47 no matter how many times it ran. |

Correction header added to the document; the body is retained unedited, because a
suite that passed while a breach was live is itself evidence. Full postmortem in P3.

### C-2 · `credentials.md` **vs** D-44 — and the documentation was right

| | |
|---|---|
| **Claim A** | `credentials.md:6` — "Password (all accounts): `Test@2026`"; `:112` publishes the bcrypt hash. Migration `20260608000001-reset-beta-test-account-passwords.js:12` uses that hash and its header says "Restores all to Test@2026". |
| **Claim B** | D-44 (`deep/P6-GOVERNMENT.md` §3) — "the hash in `20260608000001` does not correspond to `Test@2026`… an operator following the documentation cannot log into the government portal at all". |
| **True** | **A.** `bcrypt.compare('Test@2026', <documented hash>)` → **`true`**. Restoring that hash to `gov.samarqand@uchqun.uz` and logging in returned **200**. |
| **How B survived** | The Campaign I probe sent `PW` from the harness. `PW = 'Uchqun@2026'` — the password the Campaign I P1 seed set on the accounts *it* created. The government accounts are pre-existing seed-02 accounts that seed never touched. Two account families, two passwords, one unexamined assumption. The 401 was read as evidence about the documentation rather than about the probe. |

**D-44 is WITHDRAWN**, and it did damage: acting on it, Campaign I P6 overwrote all
four government passwords with a hash of `Uchqun@2026`, moving them away from the
documented value. From that moment the documentation genuinely was wrong — because
the campaign had made it so. Repaired this phase; all four verified by live login
(§3). The harness now resolves the password per account family via `pwFor()`, so
the conflation cannot recur.

### C-3 · `CONTENT-GATE-INVENTORY.md` "CI green on main" **vs** D-50

| | |
|---|---|
| **Claim A** | `audits/beta/CONTENT-GATE-INVENTORY.md:17` — "**CI green on main: run 27366773717, all 16 jobs success**" |
| **Claim B** | D-50 — CI failed on `main` on every commit from at least 2026-08-10 through 2026-08-14, twelve consecutive runs. `deep/P8-CLOSEOUT.md` §2 |
| **True** | **Both, at different times.** A was true on 2026-06-11. B is true from 2026-08-10. |
| **How A survived** | It is a point-in-time measurement written in the present tense with no expiry, in a document labelled canonical. Nothing re-checks it and nothing marks it stale. This is the commonest failure mode in the inventory: 88 documents assert a present-tense state, and a state assertion decays the moment it is written. |

Staleness note added in place.

### C-4 · `CLAUDE.md` prints the correct pattern **vs** three controllers ignoring it

| | |
|---|---|
| **Claim A** | `CLAUDE.md`, "Child-scoped resource access pattern (mandatory)" — names Activity and Meal explicitly, prints the correct list-endpoint form, and states "A role check alone is not sufficient". |
| **Claim B** | `activityController.js`, `mealController.js` (×2) shipped a branch the printed pattern does not contain, for months. |
| **True** | The rule was right; the code was wrong. |
| **How A survived** | **Nothing checked it.** §4 finds R15 is PROSE — no lint rule, no test, no grep, no CI job. A mandatory rule with no enforcement is a wish with formatting. |

### C-5 · `docs/OPERATIONS.md` documents Sentry **vs** `SENTRY_DSN` unset in production

| | |
|---|---|
| **Claim A** | `docs/OPERATIONS.md:43-52` — Sentry initialises on server start, `setupExpressErrorHandler(app)` captures all Express errors. It also states plainly: "Without `SENTRY_DSN` the module is a complete no-op". |
| **Claim B** | `railway variables --service Uchqun` — **`SENTRY_DSN` is absent.** |
| **True** | Both. The document is accurate *and* the documented mechanism is inert in production. |
| **How A survived** | The document describes a capability conditionally and the reader takes away the capability, not the condition. This is why D-08 has no fallback: the primary log path is unreadable and the documented secondary path was never switched on. Directly actionable in P4. |

---

## 3. Repair carried out this phase

The four government accounts were restored to the documented credential and
verified by live login against production, not by reading the hash back:

```
200 gov.republic@uchqun.uz     Test@2026
200 gov.toshkent@uchqun.uz     Test@2026
200 gov.samarqand@uchqun.uz    Test@2026
200 men@davlat.uz              Test@2026
200 direktor@tmm3.uz           Uchqun@2026   (P1-seed family, unchanged)
```

`men@davlat.uz`'s original hash was overwritten in Campaign I before being captured
in full (`$2b$10$lgpz6nZdk2s9z…`, 20 characters recorded) and is unrecoverable. It
now carries the documented hash, which is the estate convention. Its
`mustChangePassword` flag was cleared in Campaign I P6 and has not been restored.
Both stated rather than glossed.

---

## 4. CLAUDE.md rule audit — ENFORCED or PROSE

25 rules extracted. Each probed for an enforcing artefact — a hook, a CI job, a
test, a schema constraint, a lint rule. Machine output in `claudemd-rules.json`.

```
RULES: 25   ENFORCED: 11   PROSE: 14
```

### ENFORCED (11)

| id | rule | enforced by |
|---|---|---|
| R01 | work on main only | `.claude/hooks/enforce-main-only.sh` (PreToolUse) |
| R03 | never set `FORCE_SYNC=true` | `backend/server.js:252` — `NODE_ENV !== 'production' && FORCE_SYNC === 'true'`; cannot fire in production |
| R04 | never commit `.env` or PII | `.gitignore` + gitleaks in CI |
| R13 | new error code needs a catalogue row | `backend/scripts/verify-i18n.js`, CI job `i18n` |
| R16 | never call `AuditLog.create()` directly | `backend/models/AuditLog.js` static overrides |
| R17 | `audit_log` append-only, 3 layers | model overrides + migration `20260520100000` REVOKE |
| R19 | bulk import two-phase, per-row atomicity | `adminImportController.test.js`, `.start.test.js` |
| R22 | pre-commit Husky → lint-staged → ESLint | `.husky/pre-commit` |
| R23 | run the full suite | `.github/workflows/ci.yml` |
| R24 | CI fails if an app has no test files | `ci.yml` — greps "No test files found" |
| R25 | catalogue ↔ locale parity | `ci.yml` job `i18n` |

### PROSE (14) — nothing checks these

| id | rule | mechanically enforceable? |
|---|---|---|
| R02 | read `DEFERRED.md` at session start | no (agent behaviour) |
| R05 | all routes prefixed `/api/` | **yes** — but the rule as written is already inaccurate: `server.js:150` mounts `/uploads` and `:155` mounts `/health`. Fix the rule, then gate it. |
| R06 | all frontend HTTP via `shared/services/api.js` | **yes** — ban bare `axios`/`fetch` in portal `src/` |
| R07 | ES Modules only in backend | **yes** — and currently **clean**: 0 `require(` in `controllers/models/middleware/utils` |
| R08 | never sync schema in production | **yes** — grep `sequelize.sync`; currently one call site, `models/index.js:1077`, reached only through the R03-guarded path |
| R09 | new controllers ship with tests | **yes** — every `controllers/**.js` needs a matching test file |
| R10 | error-path fixes need a failure-triggering test | partial |
| R11 | all catch branches return error statuses | partial |
| R12 | response shape `{success,data}` / `{success,error}` | partial — grandfather clause makes a blanket gate wrong |
| **R15** | **child-scoped resources MUST call `validateChildAccess`** | **yes — and this is the rule D-47 violated** |
| R18 | destroy passes `{actorId, actorRole, reason}` | **yes** |
| R20 | PascalCase components, camelCase services | **yes** — lint rule |
| R21 | conventional commits | **yes** — commitlint |

**R15 is the finding.** The most safety-critical rule in the document, printed with
its correct code form, naming the exact models involved, is enforced by nothing.
Eleven of the twenty-five rules that *are* enforced are largely the mechanical
ones; the ones that encode judgement about tenant safety are the ones left as prose.

**P8 candidates, ranked:** R15 (D-47's shape), R09, R07, R08, R06, R18, R20, R21.

A note on the naive gate the campaign brief proposes — failing the build on
`else if (req.user.schoolId)`. That exact string is **still present and correct** at
`activityController.js:65` and `mealController.js:65`: it is the no-`childId`
branch, which is the right place for school scope. A grep on that string alone
would fail the build on correct code. The gate must key on the *pairing* —
`if (childId)` assigning `where.childId` without an intervening
`validateChildAccess` — which is what P8 will implement.

---

## 5. Single sources of truth

| domain | authoritative path | status |
|---|---|---|
| defect ledger | **`audits/beta/DEFECT-LEDGER.md`** | created this phase; 51 rows; every other defect list is historical |
| current score | `audits/beta/deep/P8-CLOSEOUT.md` §4 → superseded by `audits/beta/deep2/P9-CLOSEOUT.md` §3 on publication | pointer |
| campaign / phase state | `audits/beta/deep2/` — one artifact per phase, P1…P9 | this directory |
| credentials | **`credentials.md`** — verified correct 2026-08-14 by live login (§3) | authoritative, and now proven |
| deferral list | `DEFERRED.md` | exists; referenced by CLAUDE.md R02 |

---

## 6. Dead code and stale config

Machine output in `deadcode.json`; `deadcode.mjs` regenerates it. 649 modules
scanned by full-corpus membership.

**Unreferenced modules — 7.** No deletions this phase: the two migrations must not
be deleted (they have run against production), and the four UI motif/background
components need a rendered check before removal, which belongs in P5.

```
backend/migrations/20260520110000-add-paranoid-to-emotional-monitoring.js
backend/migrations/20260520110001-add-paranoid-to-progress.js
backend/scripts/_qa-reparent.mjs                     <- Campaign I probe, retained as evidence
reception/src/components/ReceptionBackground.jsx
reception/src/components/motifs/EmptyFolders.jsx
reception/src/components/motifs/EmptyInbox.jsx
teacher/src/shared/components/TeacherBackground.jsx
```

**Undocumented environment variables — 34** used in `backend/**` and absent from
both `backend/env.example` and `backend/.env.example`:

```
ADMIN_EMAIL, ADMIN_PANEL_URL, ADMIN_PASSWORD, ALLOW_DB_RESET,
ATTENDANCE_MAX_BACKDATE_DAYS, AUTH_LIMIT_MAX, AUTH_LIMIT_WINDOW_MS,
DATABASE_PUBLIC_URL, DB_POOL_MAX, FILE_BASE_URL, GMAIL_CLIENT_ID,
GMAIL_CLIENT_SECRET, GMAIL_REFRESH_TOKEN, GMAIL_USER, GOVERNMENT_EMAIL,
GOVERNMENT_PASSWORD, LOCAL_STORAGE_FALLBACK, LOCAL_UPLOADS_DIR,
LOGIN_LOCKOUT_SECS, LOGIN_MAX_ATTEMPTS, PARENT_EMAIL, PARENT_PASSWORD,
PUBLIC_API_URL, RAILWAY_GIT_COMMIT_SHA, RECEPTION_EMAIL, RECEPTION_PASSWORD,
RUN_MIGRATIONS, SENTRY_TRACES_SAMPLE_RATE, SMTP_SECURE, SUPER_ADMIN_EMAIL,
TEACHER_EMAIL, TEACHER_PASSWORD, UPLOAD_LIMIT_MAX, UPLOAD_LIMIT_WINDOW_MS
```

Two of these have already cost this project directly. `LOGIN_MAX_ATTEMPTS`
(default 20) and `LOGIN_LOCKOUT_SECS` are undocumented, which is why Campaign I P7
tested lockout with 8 attempts, saw only 401s, and came within one step of filing
"no brute-force protection exists" — a false finding avoided only by reading the
constant. Six are credential seeds (`*_PASSWORD`, `*_EMAIL`) that belong in an
example file precisely so nobody guesses at them.

**Migration hygiene — one duplicate timestamp:**

```
20260608000001-fix-attendance-status-enum-column.js
20260608000001-reset-beta-test-account-passwords.js
```

Two migrations share the ordering key `20260608000001`. Their relative order is
whatever the loader's directory read returns. Both have already run, so the risk
is to a fresh-database rebuild — which is exactly what P8's migration gate will
exercise.

---

## 7. Corrections to my own work in this phase

Three, all in the tooling, all caught before publication.

1. **`git log --format=%h`** through `execSync` on Windows: `cmd.exe` expanded
   `%h`/`%ad` as environment variables and the inventory produced 256 rows of
   garbage. Fixed with `spawnSync(..., { shell: false })`.

2. **`git grep -E` with `\s`.** POSIX ERE has no `\s`, so the pattern matched
   nothing and the dead-code scan reported **635 unreferenced modules** — including
   `admin/src/pages/BulkImport.jsx`, which Campaign I P5 had exercised by hand
   through five screenshots. Rewritten as a pure-Node corpus scan. Real answer: 7.

3. **Env-example files never loaded.** The corpus filter matched by extension and
   `.example` does not match, so every backend variable looked undocumented — 71
   instead of 34. Fixed by reading those two files directly.

Each of these would have been a confident, specific, wrong number in the artifact.
The pattern across both campaigns is consistent: the tooling errs toward
over-reporting, and the only defence is checking a claim against something already
known — 635 was refutable by a screenshot I had taken myself.

---

## 8. Close conditions

| # | condition | verdict | basis |
|---|---|---|---|
| C1 | every repo document inventoried and dispositioned | **MET** | 256 files in `inventory.json` with SHA, date and authority claim; 88 authority-claiming documents identified |
| C2 | contradiction ledger complete, each with "how it survived" | **MET** | §2 — five entries, each with its survival mechanism; C-1 and C-4 are structural, C-3 is decay, C-2 is my own error |
| C3 | one authoritative path named per domain | **MET** | §5 — five domains, five paths; `DEFECT-LEDGER.md` created |
| C4 | every CLAUDE.md rule marked ENFORCED or PROSE | **MET** | §4 — 25 rules, 11/14 split, each with its enforcing artefact or its absence |
| C5 | every deletion carries proof of non-reference | **MET, vacuously** | **zero deletions this phase.** 7 unreferenced modules identified; two are applied migrations, four need a rendered check in P5, one is retained Campaign I evidence. Stated rather than deleted. |

---

## 9. Scope extensions

| what | why unavoidable | commit |
|---|---|---|
| Restored 4 government passwords to the documented value | Campaign I damaged them on a false finding (C-2). Leaving production credentials mismatched against their own documentation is not a state this campaign can audit around. | see P1 commit |
| Added `pwFor()` to the harness in both `deep/` and `deep2/` | The conflation that produced D-44 is in the shared library; fixing only the new copy would let the old one repeat it. | same |
| Correction headers on `ISOLATION-REPORT.md` and `CONTENT-GATE-INVENTORY.md` | 1.3 requires superseded documents to carry a header. Both make present-tense claims that a reader would otherwise act on. | same |

---

*P1 closed. Five close conditions MET, one of them vacuously and said so. The most
consequential finding is not in the contradiction ledger — it is §4: the rule that
D-47 violated was written down, correct, mandatory, and enforced by nothing.*
