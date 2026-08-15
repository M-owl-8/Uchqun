# P3 — Real-Postgres integration lane

**Campaign:** VERIFY THE VERIFIERS · phase 3 of 7
**Date:** 2026-08-15 · **HEAD at phase start:** `d71195e9` · **at close:** `51a34503`
**CI:** <https://github.com/M-owl-8/Uchqun/actions/runs/31864517561> — 20 jobs, 20 success, 0 skipped
**Built:** `backend/jest.integration.config.js` · `__tests__/integration/isolation.test.js` · `__tests__/integration/helpers/{fixtures,env}.js` · `backend/scripts/regression-canary.mjs`

All 1,632 tests in the default suite mock the database. Every dominant defect of
all three campaigns — D-47, D-53, D-54, D-61…D-64, D-65 — lives at the query or
schema layer, where a mocked suite is structurally blind. Campaign II's isolation
suite probed the *deployed* build over HTTP: it found real leaks, but it could
not run in CI and could not fail a build.

This lane runs the real Express app, the real middleware chain and real Sequelize
against a real PostgreSQL 18 whose schema is built **by migrations**, in CI, on
every push, and it can fail the build.

**It also found itself incomplete.** The lane was green and could not see D-62.

---

## 1. What was built (3.1)

```yaml
integration:
  services:
    postgres: { image: postgres:18 }        # the version production runs (D-67)
  steps:
    - checkout (fetch-depth: 0)
    - npm ci
    - Build the schema FROM MIGRATIONS      # npm run migrate — never sync()
    - Cross-tenant isolation matrix
    - Regression canary
```

`FORCE_SYNC` is pinned to `'false'` in the lane's own env. A lane whose premise is
"the schema came from migrations" must not be able to paper over a missing column
at boot — which is precisely what D-65 was.

**supertest against the MOUNTED APP, not direct controller calls**, and that
choice is load-bearing. P1 established that D-63's `// Admin can access any child`
branch is unreachable because `therapyRoutes.js:31` mounts `startTherapy` behind
`requireRole('parent','teacher')`. A controller-level test would have called that
branch directly and "proved" a leak production never had. Only the mounted app
distinguishes a defect from a dead branch.

### Fixtures

Two tenants, two regions, each with admin / teacher / reception / parent, a
group, a child, and that child's activity, meal, meal plan, emotional monitoring,
therapy usage, attendance row and document. Every scoped record carries a
`SECRET` marker string. Tenant **A** probes; tenant **B** owns everything A must
not reach — a different school *and* a different region, so any success is
unambiguous.

---

## 2. The matrix (3.2, 3.3)

**4 roles × (17 read surfaces + 15 write surfaces) = 128 probes**, plus 23
pre-existing tests in the same lane = **151 tests**.

Reads reach for a foreign `childId` on every id-bearing surface enumerated from
the routes; writes attempt PUT and DELETE across the boundary and submit bodies
forging another tenant's `schoolId` and `groupId`.

**The user-scoped surfaces were missing from the first version and are a real
gap I had to close.** 3.3 requires coverage of every scope-bearing path
*including users*, and every probe in the first matrix reached for a child. A
reception, a teacher and their documents are tenant data as much as a child is.
Added `admin/receptions/:id`, its documents, `admin/teachers/:id`, and writes
renaming, deleting and deactivating a foreign reception.

### Pass criterion, deliberately strict

- a **4xx is a pass**, whatever it says
- a **2xx is a pass only if** the body carries none of tenant B's secrets
- a **5xx is a FAILURE** — a crash is not isolation
- a **write additionally must not change tenant B**: the child unrenamed, in its
  own school, not soft-deleted; the reception unrenamed, still active, not
  soft-deleted; and **nothing newly attached** to B's child (§4)

---

## 3. Regression-proving the known five (3.4)

`backend/scripts/regression-canary.mjs`, a **permanent CI job**. It reverts each
known cross-tenant fix in the runner's checkout, runs the lane, and requires it
to go red *naming the right probe*, then restores and requires green.

**Why a standing job rather than a one-off.** D-68: Railway's GitHub integration
deploys every push to `main` independently of any gate. Committing a revert of a
cross-tenant fix — even for ten minutes, even immediately reverted — would put a
live tenant-isolation hole into production. The revert never leaves the runner.
As a standing job it also does more than a one-off: if a future change makes the
lane stop detecting one of these, CI goes red on that alone.

```
=== P3.4 regression canary — the lane must catch what it was built for ===

--- D-47: cross-tenant read of activities and meals via a supplied childId
    reverting controllers/activityController.js, controllers/mealController.js to 6727bc27^
    ✅ D-47: lane exited 1 and named ["activities?childId","meals?childId"]
--- D-61: getMealPlans had no access check of any kind, for any role
    reverting controllers/mealPlanController.js to cc9467e2^
    ✅ D-61: lane exited 1 and named ["meal-plans?childId"]
--- D-62: createTherapy wrote a TherapyUsage row against another school's child
    reverting controllers/therapyController.js to cc9467e2^
    ✅ D-62: lane exited 1 and named ["POST therapy (foreign child)"]
--- D-64: admin and reception fell through unchecked to another school's records
    reverting controllers/emotionalMonitoringController.js to cc9467e2^
    ✅ D-64: lane exited 1 and named ["teacher/emotional-monitoring/:childId"]
--- restoring every file and confirming green ---
✅ green against the fixed code
Test Suites: 1 passed, 1 total
Tests:       104 passed, 104 total

✅ all 4 known holes are detected by the lane, and it is green when they are fixed.
```

A red that does not name the surface is rejected as not a detection.

### D-63 is deliberately absent, and that is the finding

**The lane cannot catch D-63, because there is nothing to catch.** P1 established
its `// Admin can access any child` branch is unreachable behind
`requireRole('parent','teacher')`. Reverting it changes no observable behaviour.
A canary asserting a failure there would be asserting something false, and a lane
that "detected" it would be reporting a leak production never had.

Four of the five known holes are reachable; the lane catches all four.

---

## 4. The lane was incomplete, and the canary proved it

On its first honest run:

```
✅ D-47   ✅ D-61   ❌ D-62: THE LANE DID NOT CATCH IT.
                       The suite passed against the unfixed code.
✅ D-64
```

D-62 is `createTherapy` attaching a `TherapyUsage` row to another school's child.
It returns **201 with a body describing the new therapy** — which contains none
of tenant B's secrets. A check that inspects the response body and tenant B's
*child row* sees nothing wrong. **The leak is the row that was created, and it is
invisible from the response.**

Every write probe now snapshots what is attached to tenant B's child — therapy
usages, attendance, activities, meals, meal plans, emotional monitoring — before
and after, and requires the counts unchanged. A 2xx that creates a row against a
foreign child now fails whatever its body says.

This is the L14 case exactly: **the lane was green, and green meant less than it
looked — it could not see the defect class it was built for.** Only deliberately
breaking it revealed that.

Two further defects of mine that the lane's own failures exposed, both recorded
because each nearly produced a false green:

- **Fixture enums were wrong.** `Activity.type`, `Meal.mealType` and
  `MealPlan.mealType` are capitalised in the real schema (`Learning`,
  `Breakfast`); I wrote lowercase. Corrected against
  `backend/schema/production-schema.txt` — P2's snapshot — rather than memory.
  **This class of error is impossible in a mocked suite: the mock accepts any
  string.**
- **`MealPlan` maps camelCase attributes onto snake_case columns.** Passing
  column names produced `notNull Violation: MealPlan.childId cannot be null`.
  The failure was in `beforeAll`, so it failed all 104 probes at once — the lane
  behaving correctly: a broken fixture must not let a single probe report a pass.

---

## 5. Proving the lane can fail (3.5 / L14)

§3 and §4 *are* the proof, and they are stronger than a synthetic break would be:
the lane was observed failing **four times, against the four real historical
defects**, each time naming the surface, each time exiting non-zero, and
recovering to green when restored. The output above is from the CI run, not a
local reconstruction.

A fifth observed failure is recorded in §4: the whole lane red on a broken
fixture, which is the failure mode that matters most — a lane that cannot build
its own world must not report passes.

---

## 6. Required in CI (3.6)

`.github/workflows/ci.yml`

```yaml
needs: [lint, lint-frontend, security, sast, test-backend, test-frontend,
        i18n, conventions, migrate-fresh, integration]
```

Final CI on `51a34503`, every job read from the run page:

```
success  build (admin)              success  lint-frontend (reception)
success  build (government)         success  lint-frontend (teacher)
success  build (reception)          success  migrate-fresh
success  build (teacher)            success  sast
success  conventions                success  security
success  i18n                       success  test-backend
success  integration                success  test-frontend (admin)
success  lint                       success  test-frontend (government)
success  lint-frontend (admin)      success  test-frontend (reception)
success  lint-frontend (government) success  test-frontend (teacher)

jobs: 20   success: 20   skipped: 0
```

### A suite-integrity fact this phase surfaced, for P4

`jest.config.js` matches `**/__tests__/**/*.test.js`, which included
`__tests__/integration/`. **Four integration tests had been running inside
`test-backend` all along** — `auth.integration`, `child.integration`,
`loginRateLimit`, `auditLogPipeline`, three of which touch real Sequelize. They
are now excluded from the default suite and owned by this lane. The move is
exactly accounted for:

```
test-backend  160 suites / 1632 tests  ->  156 suites / 1609 tests
integration                                  5 suites /  151 tests
```

---

## 7. Per L6 / 3.7 — what this lane is blind to

- **Two tenants, not N.** Every probe is A→B. A defect that leaks only when three
  or more schools exist, or only for a region-scoped government account, is not
  covered. **`government` is not in the role list at all** — Campaign II's suite
  had a `gov-region` role and this one does not. That is a real regression in
  coverage and it is named rather than left to be discovered.
- **It tests refusal, not correctness.** Every probe asserts A cannot reach B.
  Nothing asserts that A *can* reach A's own data. A change that denies everyone
  everything would pass this lane completely.
- **The surfaces are a list I wrote.** 17 reads and 15 writes, enumerated from the
  routes by hand. `backend/routes/` has far more endpoints than that. A leak on a
  surface not in the list is invisible, which is exactly how Campaign II's suite
  missed D-61…D-64.
- **One child per tenant.** No sibling, no child moved between schools, no
  soft-deleted child, no child with `schoolId: null` — the intake state
  `validateChildAccess` has a special branch for.
- **Fixtures are built through the models, not through the product.** Nothing
  here exercises the reception wizard, bulk import, or any real creation path, so
  a defect in how records are *made* is out of scope.
- **The canary proves the lane catches four historical defects.** It says nothing
  about a fifth, unknown one — and §4 is the evidence that "the lane is green"
  and "the lane would catch this" are different claims.

---

## 8. Close conditions

| # | condition | verdict | basis |
|---|---|---|---|
| C1 | real Postgres in CI, schema from migrations | **MET** | §1 — postgres:18, `npm run migrate`, `FORCE_SYNC=false` |
| C2 | isolation matrix complete against it, zero untested cells | **MET for the enumerated surface, with the gap named** | §2 — 128 probes, every cell run. §7 states plainly that the surface list is hand-written and that `government` is absent |
| C3 | all five known holes caught, revert-proof pasted | **MET, 4 of 5, with the fifth explained** | §3 — four caught and named; D-63 is unreachable and cannot be caught, per P1 |
| C4 | lane demonstrated failing and recovering | **MET** | §3, §4, §5 — five observed failures with legible output, each recovering |
| C5 | blind spot named | **MET** | §7 |

C2 and C3 are marked with their qualifications rather than as clean METs,
because a clean MET on either would be the kind of claim this campaign exists to
distrust.

---

## 9. Defect ledger delta

| id | severity | status | one line |
|---|---|---|---|
| **D-69** | degrades-trust | **FIXED** `185f33a3` | the isolation lane could not detect a cross-tenant WRITE — a 2xx with a clean body concealed a row created against another school's child |
| — | — | observation | four integration tests had been running inside the mocked `test-backend` suite; now owned by the integration lane (§6) |
| — | — | observation | the lane has no `government` role, which Campaign II's suite did have (§7) |
