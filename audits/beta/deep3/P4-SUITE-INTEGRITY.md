# P4 — Suite integrity

**Campaign:** VERIFY THE VERIFIERS · phase 4 of 7
**Date:** 2026-08-15 · **HEAD at phase start:** `6643f864` · **at close:** `b7270107`
**CI:** <https://github.com/M-owl-8/Uchqun/actions/runs/31867043082> — all six suites at baseline
**Built:** `scripts/verify-suite-baseline.mjs` · `audits/suite-baseline.json` · `scripts/audit-suite-integrity.mjs` · `scripts/strip-revert-bug-tests.mjs`

D-59: the teacher suite ran 11–12 of 19 files and exited 0, hiding 56 tests
across two personas. Reception migrated off `poolOptions` in S30; teacher never
did; nothing detected it.

This phase audits **every** suite for that class and its variants, builds a gate
against them, and removes **25 tests that were structurally incapable of
failing**.

---

## 1. Every suite (4.1)

Seven, not five. The seventh had not been counted by either previous campaign.

| suite | config | runner | drift class present? |
|---|---|---|---|
| backend | `backend/jest.config.js:6` `testMatch`, `:10` `testPathIgnorePatterns` | jest 30.2.0 | no |
| backend-integration | `backend/jest.integration.config.js:16` | jest 30.2.0 | no |
| admin | `admin/vite.config.js:34` `test:` | vitest 4.1.8 | no |
| teacher | `teacher/vite.config.js:53` `test:`, `:67-69` `pool/maxWorkers/minWorkers` | vitest 4.1.8 | **fixed** — D-59 was here |
| reception | `reception/vite.config.js:26` `test:`, `:34` `pool: 'forks'` | vitest 4.1.8 | **fixed** — S30 |
| government | `government/vite.config.js:25` `test:` | vitest 4.1.8 | no |
| **playwright** | `playwright.config.js:11` `testDir: './tests'` | @playwright/test | **§5 — the suite does not run at all** |

`poolOptions` — the removed vitest 4 option that caused D-59 — appears in **no
config**. The `conventions` gate built in Campaign II P8 enforces that, and it is
still green.

---

## 2. Expected versus executed (4.2)

Measured, per suite, on-disk against the runner's own report:

```
backend               156 on disk   156 executed   1584 tests
backend-integration     5 on disk     5 executed    151 tests
admin                  34 on disk    34 executed    182 tests
teacher                21 on disk    21 executed    182 tests
reception              10 on disk    10 executed    100 tests
government             17 on disk    17 executed    124 tests
```

**No gap in any suite.** D-59's specific failure is closed and stays closed.

### One thing measurement found that a single run would not

Running all four frontend suites back to back, **admin failed 1 test**. Three
consecutive runs of admin alone: `34 passed (34)`, `182 passed (182)`, three
times. It is load-sensitivity, not a code defect — the same class P7 recorded in
Campaign II and the same class that turned the P9 closeout commit red.

It is named rather than filed as fixed: **a suite that fails roughly one run in
four under load, sitting in a required gate, teaches people to re-run until
green.** That is how a real failure eventually gets waved through. The mitigation
in place is `--testTimeout=30000`; the underlying flakiness is not diagnosed.

---

## 3. The gate (4.3)

Campaign II's check compared vitest's **collected** count against files **on
disk**. That catches a runner silently dropping files — D-59 exactly. It does
**not** catch a file being deleted, renamed out of the glob, or emptied: on-disk
and collected fall together and the check stays green.

`scripts/verify-suite-baseline.mjs` compares against a committed baseline holding
the **exact file list** and test count per suite. A suite that shrinks fails, and
the failure names what disappeared.

`audits/suite-baseline.json`:

```
backend              156 files   1584 tests
backend-integration    5 files    151 tests
admin                 34 files    182 tests
teacher               21 files    182 tests
reception             10 files    100 tests
government            17 files    124 tests
```

Wired into all six jobs. Updating the baseline requires a commit and a reason —
that friction is the point.

CI on `e0f9a225`:

```
Suite baseline — backend               tests baseline 1584  observed 1584  ✅
Suite baseline — backend-integration   tests baseline  151  observed  151  ✅
Suite baseline — admin                 tests baseline  182  observed  182  ✅
Suite baseline — teacher               tests baseline  182  observed  182  ✅
Suite baseline — reception             tests baseline  100  observed  100  ✅
Suite baseline — government            tests baseline  124  observed  124  ✅
```

### Proving it catches a deleted file (4.4 / L14)

```
====== RUN 1 — intact ======
  files   baseline 21   present 21
  tests   baseline 182   observed 182
✅ at or above baseline
EXIT=0

====== RUN 2 — one test file deleted ======
  files   baseline 21   present 20
  tests   baseline 182   observed 177

  ❌ 1 test file(s) in the baseline are GONE:
       - teacher/src/__tests__/deepLinkPersona.test.jsx
     A suite that shrinks is a suite that stopped testing something.

  ❌ test count fell: 177 < 182 (baseline)
❌ FAILED
EXIT=1

====== RUN 3 — restored ======
✅ at or above baseline
EXIT=0
```

It names the file. Both failure modes fire independently, so a file that is
present but emptied is caught by the count even when the list is intact.

**The gate also failed once for the wrong reason and that is recorded**: the
frontend test-count parser was not tolerant of vitest's ANSI colour codes, so it
read `0` and failed four suites at once. Fixed by matching the shape the adjacent
`Test Files` check already used, and verified against real vitest output before
pushing.

---

## 4. Skipped, empty, decoupled (4.5)

`scripts/audit-suite-integrity.mjs`, across all seven suites:

| variant | count | where |
|---|---|---|
| SKIPPED (`.skip` / `xit` / `xdescribe` / `.todo`) | **0** | — |
| FOCUSED (`.only` — silently disables the rest of the file) | **0** | — |
| EMPTY (no assertion of any kind) | **56** | **all in `tests/`** — the Playwright suite (§5) |
| CONDITIONAL (returns before asserting) | **0** | — |

**Across the six suites that actually run in CI: zero of all four variants.**

### The detector was wrong three times before it was right

Reported here because the first numbers — 146 empty, 34 conditional — were
almost entirely false, and a tool that over-reports is as useless as one that
under-reports.

1. **Helper assertions.** Ten `accountDomain` tests route through an
   `expectError()` helper that calls `expect(err).toHaveProperty(...)`. Counting
   only inline `expect()` called them empty. The fix is the same shape as the
   R15 gate's `localGuards`: recognise local helpers that assert.
2. **testing-library queries.** `getBy*`/`findBy*` **throw** when the query
   fails, so `await waitFor(() => screen.getByText(...))` is an assertion. Six
   admin crash-guard tests were called empty when they are the regression tests
   for a real crash (`ADMIN-OGOHLANTIRISHLAR-CRASH`).
3. **Mock routers read as early returns.** `if (url === '/x') return
   Promise.resolve(…)` inside a mock implementation is a router, not an exit.
   The check is now depth-aware and only counts a return at the test body's own
   level.

Each correction is the lesson P1 of Campaign II wrote down about the naive R15
gate: **the obvious pattern fires on correct code.**

### A counting note, so the numbers are not confusing

The static audit reports **1521** backend tests; jest reports **1584**. Both are
right: the audit counts `it(...)` declarations, jest counts executions, and
`it.each` turns one declaration into many. The baseline gate uses the runner's
number, which is the one that matters.

---

## 5. The Playwright suite does not run

**24 spec files. 372 tests. In no workflow. Last evidence written 2026-06-10.**

```
$ ls tests/*.spec.js | wc -l          -> 24
$ grep -c playwright .github/workflows/*.yml
  ci.yml:0  db-backup.yml:0  health-check.yml:0  railway-deploy.yml:0
$ ls -la audits/beta/playwright-results.json   -> Jun 10 21:22
```

This is the "exit code decoupled from results" variant in its strongest form:
**the suite's result cannot affect anything, because it never produces one.** All
56 remaining EMPTY findings live here, and no one would learn of them, because
nothing reads this suite's output.

It is not deleted, and it is not wired in. Both would be decisions beyond this
phase: wiring it in means standing up a deployed environment with seeded fixtures
in CI, and deleting 24 files of proof scripts from two audit campaigns is the
owner's call. **It is recorded as a defect so that "we have Playwright coverage"
cannot be said again without someone checking.**

---

## 6. Tests that asserted defective behaviour (4.6)

The brief said three had been found in an earlier run. **There were 25.**

`[REVERT-TEST: BUG]` tests across 12 backend files define a **local copy** of
previously-buggy code and assert that the bug happens:

```js
const buggyResolveWarning = async (req, res) => { …BUG… };
mockFindByPk.mockReturnValue({ id: 'w1', schoolId: 'SCHOOL_B', update });
await buggyResolveWarning(req, res);
expect(update).toHaveBeenCalled();   // BUG: resolved cross-region
```

They never touch the production controller. **Proven empirically rather than
argued** — the real guard at `aiWarningController.js:271` was disabled in the
working tree and the pair re-run:

```
guard intact    ->  Tests: 2 passed
guard DISABLED  ->  Tests: 1 failed, 1 passed
```

The one that **failed** is `[REVERT-TEST: FIXED]`, which calls the real
`resolveWarning`. The one that **passed while production was broken** is
`[REVERT-TEST: BUG]`. It cannot fail when the code regresses and it cannot fail
when the code is fixed.

Every one has a `FIXED` counterpart that does exercise the real controller — 29
`BUG` against 30 `FIXED` — so removing them leaves nothing uncovered. The
documentation value is preserved as a comment where each test stood:

```js
// Historical bug, documented rather than asserted (P4.6):
//   without govRegionId check, region gov can resolve cross-region warning
// The former [REVERT-TEST: BUG] case here reimplemented the buggy code
// locally and asserted the bug, so it could not fail when the real
// controller regressed.
```

**backend: 1609 → 1584 tests, 156 suites, all passing.** The count going *down*
is the honest direction: it was inflated by 25 tests that could not detect
anything, and the real revert-testing now happens in P3's regression canary,
which reverts the **actual files** and requires the isolation lane to catch it.

---

## 7. Per L6 — what these greens are blind to

- **The baseline is a floor, not a spec.** It proves a suite did not shrink. It
  proves nothing about whether the tests that remain assert anything worth
  asserting — and §6 is the evidence that a suite can be large and hollow.
- **`0 skipped, 0 empty` is a static reading.** A test whose only assertion is
  `expect(true).toBe(true)` passes every check in §4. So does one asserting the
  wrong thing.
- **The audit cannot see a mocked-away defect.** Every one of the 1,584 backend
  tests mocks the database; a test can be perfectly formed and still be blind to
  the entire class P3 exists for.
- **Load-sensitivity is mitigated, not diagnosed** (§2). The admin suite still
  fails occasionally under contention and nobody knows why.
- **The Playwright suite is measured but not gated** (§5), so its 372 tests
  count toward nothing.

---

## 8. Close conditions

| # | condition | verdict | basis |
|---|---|---|---|
| C1 | every suite audited for the drift class, not a sample | **MET** | §1 — seven suites, config file:line and runner version each; the seventh had not been counted before |
| C2 | file-count and test-count gate required in CI | **MET** | §3 — `verify-suite-baseline.mjs` in all six runnable suites, green on `e0f9a225` |
| C3 | gate demonstrated catching a deliberately removed file | **MET** | §3 — three runs pasted, the missing file named, exit codes shown |
| C4 | skipped/empty/decoupled enumerated | **MET** | §4 and §5 — 0/0/0/0 across the six running suites; 56 empty and an entire ungated suite in `tests/` |

---

## 9. Defect ledger delta

| id | severity | status | one line |
|---|---|---|---|
| **D-70** | degrades-trust | **FIXED** `b768b0a1` | 25 `[REVERT-TEST: BUG]` tests asserted a bug against a local replica of buggy code — proven to pass while production was broken |
| **D-71** | degrades-trust | **OPEN** | the Playwright suite — 24 files, 372 tests — is in no workflow and last ran 2026-06-10; its result cannot affect anything |
| **D-72** | degrades-use | **OPEN** | the admin suite fails intermittently under parallel load; mitigated with a 30s timeout, undiagnosed |
| D-59 | blocks-trust | **still FIXED, now gated** | no suite drops files; a shrinking suite now fails CI by name |
