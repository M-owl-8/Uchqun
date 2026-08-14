# P2 — Schema diff: production vs migrate-fresh

**Campaign:** VERIFY THE VERIFIERS · phase 2 of 7
**Date:** 2026-08-15 · **HEAD at phase start:** `d482f345` · **at close:** `34663c38`
**CI:** <https://github.com/M-owl-8/Uchqun/actions/runs/31849203941> — 19 jobs, 19 success, 0 skipped
**Built:** `backend/scripts/schema-dump.sql` · `schema-dump.mjs` · `schema-diff.mjs` · `backend/schema/production-schema.txt`
**Migrations:** `20260815000001` · `20260815000002` · `20260815000003`

`P9-CLOSEOUT.md` §6 named this the highest-value item left undone:

> "migrate-fresh proves the migrations *run*. It does **not** prove the result
> *matches production*."

It does not match. It took **five rounds and three reconciliation migrations** to
make it match, and the differences included a production foreign key that deletes
data the application believes it keeps.

---

## 1. Method

One SQL file, `backend/scripts/schema-dump.sql`, executed **verbatim against both
databases**. Format parity is structural: there is no second implementation that
could disagree. It emits one sortable line per object —

```
TAB <table>
COL <table>|<column>|<udt>|<nullable>|<default>
IDX <table>|<name>|<definition>
CON <table>|<name>|<contype>|<definition>
ENU <type>|<label>|<rank>
SEQ <name>|<type>|<start>|<increment>
```

`schema-dump.mjs` runs it. CI uses `DATABASE_URL` against its throwaway database.
Locally, `--from-mcp-config` reads the production credential out of
`~/.claude.json` itself, so it never passes through a shell argument, a command
substitution, or a log line, and is never printed. The host is printed; the
credential is not.

**Corroboration of the dumper before trusting it.** Object counts were taken
independently through the read-only MCP connection *before* the dumper existed —
711 columns, 230 indexes, 623 constraints, 234 enum values — and the dumper's
first run returned exactly those numbers.

**Two exclusions, both stated in the SQL rather than left implicit:**

- **`SequelizeMeta` contents.** The migration ledger is data, not schema, and
  differs by construction. Its table *definition* is compared like any other.
- **Raw `enumsortorder`.** Production has `enum_users_role.government` at `4.5`
  because it was inserted with `ADD VALUE BEFORE`; a fresh build appends and gets
  `5`. Same labels, same relative order, nothing behaves differently — and no
  migration could close that difference without dropping and recreating the type
  on a live column. The dump compares **rank within the type**, which measures
  the thing that matters.

---

## 2. D-67 — CI ran PostgreSQL 15 while production runs 18.4

The first diff returned **475 differences** and was unreadable. Roughly 400 were
one thing:

```
SELECT current_setting('server_version')  ->  18.4 (Debian 18.4-1.pgdg13+1)
.github/workflows/ci.yml                  ->  image: postgres:15
```

PostgreSQL 17 began recording NOT NULL constraints as catalog rows in
`pg_constraint` with `contype='n'`. Production has them; a PG15 rebuild does not.

**Three major versions of divergence, in the two jobs whose entire purpose is to
prove the migrations and 1,632 tests behave as they will in production.**

Fixed by comparing like with like (`postgres:18` in both jobs), not by teaching
the dump to ignore the difference. Ignoring it would have hidden a real class of
divergence and left the test suite still running against the wrong engine.

After the version fix: **64 differences.** Readable, and all real.

---

## 3. What the diff found

Five rounds. Each fix exposed the next layer.

| round | differences | what it exposed |
|---|---|---|
| 1 | 475 | D-67 — the Postgres version gap |
| 2 | 64 | my own P8 fix; `admin_registration_requests.telegramUsername`; three missing indexes; FK naming |
| 3 | 20 | column types; a missing FK on `users.schoolId`; enum sort artefact |
| 4 | 1 | two contradictory FKs on `government_messages.senderId` |
| 5 | **0** | — |

### 3.1 My own P8 fix was one of the defects

`20260401000009-create-sync-only-tables.js` created `government_messages` as a
seventh "sync-only" table. **It is not one.** `20260112000000` creates it as
`super_admin_messages` and `20260510000000` renames it. My P8 analysis counted
tables by grepping `createTable()` and therefore could not see a rename.

Creating it under its final name meant the rename could not run:

```
warn: Migration skipped (already exists)
      {"file":"20260510000000-rename-government-messages-table.js",
       "error":"relation \"government_messages\" already exists"}
```

A fresh database ended up with **both** tables and 39 phantom objects.

### 3.2 The runner's swallow — the cause of most of the rest

That warning is the mechanism behind nearly every remaining difference.
`config/migrate.js` catches "already exists", logs a warning, and marks the
migration **complete**. When a migration's *first* statement hits it — typically
a `createTable` for a table `sync()` had already made — **every remaining
statement in that migration is skipped and the migration is recorded as
applied.**

`20260117100000-create-schools.js` creates the `schools` table and then two
indexes. Production has the table, **neither index**, and the migration in
`SequelizeMeta`. Its columns carry `sync()`'s shapes, not the migration's. Same
shape for `20260401000010` and its `users.schoolId` index **and foreign key**.

That single behaviour accounts for: three missing indexes, the
`parent_evaluations` FK naming, the `schools` column types and defaults, the
missing `users_schoolId_fkey`, and §3.3.

### 3.3 A production foreign key that deletes data the application keeps

The last difference was the most serious.

```
production : super_admin_messages_senderId_fkey  -> users(id) ON DELETE CASCADE
migrations : fk_super_admin_messages_senderId    -> users(id) ON DELETE SET NULL
```

`20260506000000-add-cascade-rules.js:68` calls
`alterFk(…, 'super_admin_messages', 'senderId', 'users', 'id', 'SET NULL', true)`
— it passes `setNullable=true` specifically so the column can hold a null.

**On production, deleting a user CASCADE-DELETED every government message they
had ever sent.** The application's intent, written in its own migration, is that
the message survives with a null sender.

And the fresh build was wrong in a *different* way: it ended with **both**
constraints on the same column, with contradictory delete behaviour, because
`alterFk`'s lookup did not match so the drop never happened and the add succeeded
under a new name.

`20260815000003` converges both. It reads `pg_constraint` **by the column**
rather than by name — the names are exactly what drifted — drops whatever is
there, and creates one FK with `ON DELETE SET NULL`. Verified on production:

```
fk_super_admin_messages_senderId = FOREIGN KEY ("senderId") REFERENCES users(id)
                                   ON UPDATE CASCADE ON DELETE SET NULL
(one row)
```

### 3.4 Everything else, reconciled forward

Fixed **in the migrations, never by hand in production**, per the phase rule. A
hand-fix would make the two agree while leaving the migration set unable to reach
the agreed state — the original defect wearing a result.

| object | production had | migrations specify |
|---|---|---|
| `schools_name`, `schools_is_active`, `idx_users_school_id` | absent | present |
| `parent_evaluations` × 3 FKs | `*_fkey` names | `fk_*` names |
| `children.deletedAt`, `users.deletedAt` | `timestamp` | `timestamptz` |
| `schools.createdAt`, `schools.updatedAt` | `timestamp NOT NULL DEFAULT now()` | `timestamptz`, no default |
| `schools.id` | `DEFAULT gen_random_uuid()` | no default |
| `government_messages.senderId` | `NOT NULL` | nullable |
| `users.schoolId` FK | absent | present |
| `admin_registration_requests.telegramUsername` | present | **no migration creates it** |

The last row is D-65's class one layer down: a column that exists only because
`sync()` made it. Added to `20260401000009b`.

Timezone conversions state UTC explicitly — the app runs UTC on Railway and these
values were written by `now()`/`CURRENT_TIMESTAMP` there, so `AT TIME ZONE 'UTC'`
preserves the instant rather than shifting it.

---

## 4. The diff, empty

CI run <https://github.com/M-owl-8/Uchqun/actions/runs/31849203941>, SHA `34663c38`:

```
Schema diff — production vs migrate-fresh

  production objects : 1859  (backend/schema/production-schema.txt)
  fresh objects      : 1859  (/tmp/fresh-schema.txt)
  differences        : 0

✅ IDENTICAL — the migration set reproduces production exactly.
```

**A database built from migrations alone is now byte-for-byte the schema running
in production.** That claim has never been true before, and until this run nobody
could have known whether it was.

---

## 5. The isolation-critical columns (2.3)

Present, same type, same nullability, same default, in **both** schemas:

```
children|schoolId
   production: COL children|schoolId|uuid|YES|-
   fresh     : COL children|schoolId|uuid|YES|-
users|isActive
   production: COL users|isActive|bool|NO|false
   fresh     : COL users|isActive|bool|NO|false
users|documentsApproved
   production: COL users|documentsApproved|bool|NO|false
   fresh     : COL users|documentsApproved|bool|NO|false
```

Their constraints, both sides:

```
CON users|users_documentsApproved_not_null|n|NOT NULL "documentsApproved"
CON users|users_isActive_not_null|n|NOT NULL "isActive"
```

**An observation the diff cannot report, because both sides agree:**
`children.schoolId` has **no foreign key** to `schools`, on either side. The
column the entire multi-tenant model rests on — the one `validateChildAccess`
compares against, the one D-47 and D-61…D-64 are all about — has an index
(`idx_children_schoolId`) and **no referential integrity constraint**. A child
can hold a `schoolId` that matches no school. Not a divergence, so not a P2
defect; recorded here because P2 is where it became visible.

---

## 6. Proving the diff can fail (L14, 2.4)

Both runs use the real tool against the real artefacts.

**Run 1 — unmodified:**

```
  production objects : 1859
  fresh objects      : 1859
  differences        : 0
✅ IDENTICAL — the migration set reproduces production exactly.
EXIT=0
```

**Run 2 — `children.schoolId` deleted from the fresh dump and `users.isActive`
made nullable**, i.e. exactly the D-65 scenario plus a constraint weakening:

```
  production objects : 1859
  fresh objects      : 1858
  differences        : 2

  IN PRODUCTION, MISSING FROM MIGRATIONS (1):
    - COL children|schoolId|uuid|YES|-

  DIFFERENT IN EACH (1):
    ~ COL users|isActive
        production: COL users|isActive|bool|NO|false
        fresh     : COL users|isActive|bool|YES|-

❌ DIVERGED — every line above is a defect.
EXIT=1
```

It names the object, shows both sides, and exits non-zero. Restored to Run 1's
state afterwards; the CI run above is the restored state.

---

## 7. Required in CI (2.5)

`.github/workflows/ci.yml:300`

```yaml
needs: [lint, lint-frontend, security, sast, test-backend, test-frontend, i18n, conventions, migrate-fresh]
```

The diff runs inside `migrate-fresh`, which `build` depends on. The rebuilt
schema is uploaded as an artifact on every run, pass or fail, so a future
divergence can be inspected without re-running anything.

Final CI on `34663c38` — every job, read from the run page:

```
success  build (admin)            success  lint-frontend (reception)
success  build (government)       success  lint-frontend (teacher)
success  build (reception)        success  migrate-fresh
success  build (teacher)          success  sast
success  conventions              success  security
success  i18n                     success  test-backend
success  lint                     success  test-frontend (admin)
success  lint-frontend (admin)    success  test-frontend (government)
success  lint-frontend (government) success  test-frontend (reception)
                                  success  test-frontend (teacher)

jobs: 19   success: 19   skipped: 0
```

---

## 8. D-68 — the deploy gate does not gate production

**Found during this phase and reported here because it changes what every other
gate is worth.** Full treatment belongs to P6; the evidence is recorded now.

Commit `270b1c15` contained migration `20260815000001`. Its GitHub Actions
deploy was **blocked**:

```
deploy run for 270b1c15
  failure   blocked
  skipped   deploy-backend
  skipped   deploy-frontends
```

Production applied that migration anyway:

```sql
SELECT name FROM "SequelizeMeta" WHERE name LIKE '20260815%';
-> 20260815000001-reconcile-production-schema.js
```

And the timing is decisive. `/health` reported `uptime: 390.17` at
`2026-08-14T22:55:16Z`, putting the container start at **22:48:46 UTC**. The
GitHub Actions deploy run for that commit was created at **22:49:49 UTC** — 63
seconds *later* — and refused to deploy.

The mechanism is documented in the repository's own first line of
`railway.toml`:

```
# Root-level railway.toml — read by Railway GitHub integration when root directory = "."
```

**Railway's native GitHub integration deploys every push, independently of
GitHub Actions.** The gate built in Campaign II P8 gates a *second, redundant*
deployment path. It has never gated production.

This invalidates, as written:

- `deep2/P8-GATES.md` §2 — "the deploy now depends on CI, proven both ways". The
  proof is real for the Actions path and irrelevant to the one that ships.
- `deep2/P9-CLOSEOUT.md` §4 — the buyer verdict's remaining disclosure said the
  release process *was* ungated until 2026-08-14. It still is.

Closing it requires disconnecting the GitHub trigger in Railway's dashboard —
an owner action, not reachable from this repository. Filed as **D-68,
blocks-trust**, and carried into P6 and P7.

---

## 9. Per L6 — what this green is blind to

- **It compares structure, not behaviour.** Identical DDL does not mean identical
  query plans, identical collation behaviour, or identical extension versions.
  Neither `pg_extension` nor server settings are compared.
- **It compares production *as it is today*.** The snapshot is a committed file.
  If production drifts tomorrow — by hand, or by another `sync()` — CI keeps
  comparing against the stale file and stays green. **Nothing re-dumps production
  automatically.** That is the largest hole in this gate, and closing it needs
  either a scheduled job with production read access or an owner-run refresh.
- **It cannot see data.** `children.schoolId` matching in both schemas says
  nothing about whether any row holds a `schoolId` that matches no school —
  which, with no foreign key (§5), is possible.
- **It says nothing about the migrations' path**, only their destination. Three
  reconciliation migrations now exist precisely because the path was broken; a
  future migration could equally leave the destination right and the journey
  destructive.
- **The runner still swallows "already exists".** §3.2's mechanism is
  unchanged — this phase fixed its *consequences* on one database, not the
  behaviour that produced them. That is a P6 item and it is named, not fixed.

---

## 10. Close conditions

| # | condition | verdict | basis |
|---|---|---|---|
| C1 | diff empty, pasted, on a clean run | **MET** | §4 — 1859 = 1859, 0 differences, CI run URL and SHA |
| C2 | the three isolation-critical columns proven in both schemas | **MET** | §5 — type, nullability, default and constraints quoted from both dumps |
| C3 | the diff demonstrated failing and recovering | **MET** | §6 — real tool, real artefacts, exit 1 with the object named, restored |
| C4 | required in CI on the final SHA | **MET** | §7 — `ci.yml:300`, 19/19 green on `34663c38` |

---

## 11. Defect ledger delta

| id | severity | status | one line |
|---|---|---|---|
| **D-67** | blocks-trust | **FIXED** `1b1df13c` | CI ran PostgreSQL 15 against a production running 18.4 — three major versions, in the jobs meant to prove production behaviour |
| **D-68** | blocks-trust | **OPEN** | Railway's GitHub integration deploys every push independently of Actions; the Campaign II deploy gate has never gated production |
| D-65 | blocks-trust | **FIXED** `34663c38` | extended and closed: the migration set now reproduces production exactly, 1859 = 1859, proven by diff rather than by absence of a crash |
| — | — | observation | `children.schoolId` — the tenant boundary — has no foreign key to `schools` on either side |
| — | — | observation | `config/migrate.js` swallows "already exists" and marks the whole migration complete, skipping every later statement. Cause of most of §3; carried to P6 |

---

## 12. Citation audit (L4)

```
$ node backend/scripts/schema-diff.mjs backend/schema/production-schema.txt /tmp/fr/fresh-schema.txt
  differences : 0    EXIT=0
$ grep -n "needs: \[" .github/workflows/ci.yml
300:    needs: [lint, lint-frontend, security, sast, test-backend, test-frontend, i18n, conventions, migrate-fresh]
$ head -1 railway.toml
# Root-level railway.toml — read by Railway GitHub integration when root directory = "."
$ gh run view 31849203941 --json jobs   -> 19 jobs, 19 success, 0 skipped
$ gh run view <deploy for 270b1c15>     -> failure blocked / skipped deploy-backend / skipped deploy-frontends
$ curl -s .../health                    -> uptime 390.17 at 2026-08-14T22:55:16Z
```

Artifacts quoted: `deep2/P8-GATES.md` §2, `deep2/P9-CLOSEOUT.md` §4 and §6.
Migrations quoted: `20260506000000-add-cascade-rules.js:68`,
`20260117100000-create-schools.js`, `20260510000000-rename-government-messages-table.js`.
All opened.

**Unresolvable citations: 0.**
