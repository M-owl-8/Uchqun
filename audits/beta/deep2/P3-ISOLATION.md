# P3 — Isolation suite postmortem and rebuild

**Campaign:** CONSOLIDATION AND HARDENING II · phase 3 of 9
**Date:** 2026-08-14 · **HEAD at phase start:** `02d662a8` · **final SHA:** `fd5c2aee`
**Suite:** `audits/beta/deep2/p3-isolation-suite.mjs` — 250 cells, runnable, idempotent
**Machine outputs:** `surface.json` · `foreign-fixture.json` · `P3/logs/p3-isolation.json` · `p3-leaks.json`

---

## LEAKS FOUND — read this first

Two live cross-tenant reads, both the D-47 class, both in controllers Campaign I
never touched. A `tmm3` (Toshkent) account reading a child at `amm1` (Andijon) —
different school, different region.

```
GET /api/v1/service-plans?childId=5eeddb15-…   → 200  {"data":[{"childId":"5eeddb15-…","year":2026,…
GET /api/v1/therapy/usage?childId=5eeddb15-…   → 200  {"success":true,"data":{"usages":[{"id":"5eed239c-…
```

| surface | teacher | parent | admin | reception | gov-region |
|---|---|---|---|---|---|
| `/service-plans?childId=` | refused | refused | **LEAK** | **LEAK** | **LEAK** |
| `/therapy/usage?childId=` | refused | refused | **LEAK** | **LEAK** | **LEAK** |

Six leaking cells. Teacher and parent were correctly refused on both, so the
guard exists in the codebase — these two paths skip it.

Both are fixed, and the fixes are re-witnessed on the deployed build in §6.

---

## 1. Postmortem — why 29/29 PASS coexisted with a live breach

`audits/beta/ISOLATION-REPORT.md`, 2026-06-09, "COMPLETE — 29/29 PASS, 0 PARTIAL,
0 BLOCKED", "**No isolation breaches detected**".

### What the 29 cases cover

7 hostile-URL probes (Part A) and 22 list assertions (Part B).

| probe | account | endpoint | line |
|---|---|---|---|
| ISO-T06 | teacher | `GET /teacher/children/[S2-child]` | `:37` |
| ISO-P01 | parent | `GET /parent/attendance?childId=[S2-child]` | `:38` |
| ISO-P02 | parent | `GET /parent/children/[S2-child]/journal` | `:39` |
| ISO-P03 | parent | `GET /parent/media?childId=[S2-child]` | `:40` |
| ISO-A05 | admin | `GET /admin/teachers/[S2-teacher]` | `:41` |
| ISO-P-INTRA-1 | parent | `GET /parent/attendance?childId=[S1-other]` | `:42` |
| ISO-P-INTRA-2 | parent | `GET /parent/children/[S1-other]/journal` | `:43` |

### The shape they all share

**Every one supplies a foreign id on an endpoint whose role branch already
validated.** `/parent/*` handlers resolve the caller's own children first;
`/teacher/children/:id` checks group assignment; `/admin/teachers/:id` is
school-scoped. Four of the seven are parent probes. One is a teacher probe. One
is an admin probe — and it targets a *teacher* id, not a child id.

### Why none supplies a childId without a schoolId — the exact D-47 evasion

Because **no probe in the suite supplies a `childId` as an admin or reception
account at all.** The closest is ISO-T02 (`:58`):

```
GET /api/v1/activities?limit=50        as teacher1
```

`/activities` is the very controller D-47 lived in, and this probe **supplies no
`childId`**. It exercises the `else` branch — the one that applies the school
scope and was always correct. The vulnerable branch is reached only by passing
`childId`, and nothing in the suite ever does.

Three further structural gaps:

- **Zero reception probes.** The word "reception" does not appear in the report.
  Reception is one of the two roles that leaked in D-47 and one of the three in
  D-53.
- **Zero write probes.** All 29 are reads. No UPDATE or DELETE is attempted
  across any boundary.
- **Zero forged-scope probes.** No probe sends a body claiming a different
  `schoolId` or `groupId`.

### Controllers covered versus controllers that exist

```
backend/controllers/**.js                       : 48 files
route declarations                              : 303
routes taking a path id                         : 159   (GET 61, PUT 43, DELETE 25, POST 23, PATCH 7)
controllers reading an id-bearing query param   : 15
```

The suite's 29 probes touch **9 distinct endpoints**. Against 159 id-bearing
routes and 15 query-param surfaces, that is not a sample — it is an anecdote.
`git ls-files` and `surface.json` back every number.

**Conclusion: the suite could not have found D-47 however many times it ran, and
its green was not weak evidence — it was no evidence about that class at all.**

---

## 2. The attack surface, enumerated from code

`surface.mjs` reads `backend/routes/**` and `backend/controllers/**` directly.

**15 controllers read an id-bearing query parameter** — the D-47 vector:

```
activityController.js            childId          mealPlanController.js         childId
aiWarningController.js           targetId,schoolId  mediaController.js          childId
attendanceController.js          childId          parent/parentActivityController.js  childId
chatController.js                conversationId   parent/parentMealController.js      childId
childAssessmentController.js     childId          parent/parentSchoolRatingController.js childId
governmentController.js          schoolId         progressController.js         childId
mealController.js                childId          servicePlanController.js      childId
                                                  therapyController.js          childId,therapyId
```

Two of those — `servicePlanController` and `therapyController` — are exactly the
two that turned out to be leaking. They were reachable by reading the code and
were never on the old suite's list.

---

## 3. The rebuilt suite

**5 roles × 50 cells = 250 cells.** Per role:

- **14 query surfaces** — every id-bearing query parameter from §2, given a
  foreign id
- **11 path surfaces × 3 methods (GET / PUT / DELETE) = 33 cells** — read,
  update and delete attempted across the boundary, which the old suite never did
- **3 forged-scope writes** — a body claiming another school's `schoolId` or
  `groupId`

Roles: `teacher`, `parent`, `admin`, `reception`, `gov-region` — reception and a
region-scoped government account included precisely because the old suite had
neither.

Foreign fixture (`foreign-fixture.json`) resolved from the database: a child,
group, teacher, parent, reception, admin, meal, activity, attendance row, IRR,
document and school, all belonging to `amm1` in **Andijon**, probed by `tmm3`
accounts in **Toshkent** — a different school *and* a different region, so any
success is unambiguous.

**Pass criterion:** 403/404, or a 2xx whose body provably does not contain the
foreign id.

### A correction to my own criterion

The first run reported **8** leaks. Two were false: `forge-schoolId-on-attendance`
returned `400 ATTENDANCE_ACCESS_DENIED` with the rejected `childId` echoed in the
`detail` field, and my detector flagged any body containing the id. A 4xx refusal
that names what it refused is the control working. The criterion now requires a
2xx status. Real count: **6**.

---

## 4. D-53 — the D-47 class in two more controllers (blocks-use)

Two distinct shapes, neither identical to D-47.

**`servicePlanController.getServicePlans` (`:25-36`)** read `childId` from the
query and went straight to `ServicePlan.findAll({ where: { childId, year } })`
with **no access check of any kind** — no `validateChildAccess`, no role branch,
nothing. The *create* path in the same file (`:86`) does call
`validateChildAccess`. The pattern was known to the author and applied to writes
only.

**`therapyController.getTherapyUsage` (`:497-510`)** built a per-role `where`,
correctly scoping admin to their school's children — and then:

```js
if (childId) {
  where.childId = childId;      // ← overwrites the scope just built
}
```

A supplied `childId` **replaces** the school scope rather than being checked
against it. And `reception` and `government` matched no branch at all, leaving
`where` as `{}` — the query then returned *every therapy usage row on the
platform*, not merely one foreign child's.

### A test was asserting the vulnerability

`backend/__tests__/therapy.test.js:158` was named:

> `it('admin without schoolId sees all (no scope applied)', …)`

and required `where.childId` to be `undefined`. It codified an unscoped query
over every therapy usage row as correct behaviour. Rewritten to assert that an
admin with no tenant is refused rather than shown everything.

### Fail-first

```
RED (controllers reverted)                          GREEN (fixed)
× getServicePlans refuses foreign childId (admin)    √ ×5 roles
× … (reception, government, teacher, parent)         √ getServicePlans still works for own child
√ getServicePlans still works for own child          √ getTherapyUsage refuses ×3 roles
× getTherapyUsage refuses ×3 roles                   √ where is never unscoped for reception
× where is never unscoped for reception
Tests: 9 failed, 1 passed, 10 total                  Tests: 10 passed, 10 total
```

The single passing test in RED is the positive control.

---

## 5. D-54 — `validateChildAccess` ignores government region scope (blocks-use)

After the D-53 fix, admin and reception were clean and **gov-region still leaked
both surfaces**. Re-run against the deployed build: 6 leaks → 2.

`backend/utils/schoolValidation.js:27`:

```js
if (req.user.schoolId && child.schoolId !== req.user.schoolId) {
  return null;
}
```

Government users **have no `schoolId`** — they are scoped by `govRegionId`. The
guard is therefore skipped entirely and **every government account is admitted to
every child in the country**, including a region-scoped one.

Campaign I P6 proved region scoping *is* enforced, correctly and in both
directions, on the `/government/*` endpoints. It was simply absent from this
shared child-scoped path — which is why P6 saw correct behaviour and this suite
did not. Two enforcement mechanisms, one surface covered.

```
RED  × a region-scoped government account is refused a child in another region
     √ own-region allowed · √ republic allowed · √ school-scoped still refused · √ intake child reachable
     Tests: 1 failed, 4 passed

GREEN √ all 5
```

The four RED passes are the controls; only the cross-region case moved.

---

## 6. Re-witnessed on the deployed build

The suite is the witness, run three times against production:

| run | build | leaks |
|---|---|---|
| before any fix | `02d662a8` | **6** — service-plans and therapy-usage × admin, reception, gov-region |
| after D-53 | `fdc57107` | **2** — gov-region only |
| after D-54 | `fd5c2aee` | **0** |

```
teacher     cells=50  leaks=0
parent      cells=50  leaks=0
admin       cells=50  leaks=0
reception   cells=50  leaks=0
gov-region  cells=50  leaks=0

TOTAL CELLS: 250   LEAKS: 0
```

Backend suite on the final SHA: **154 suites, 1591 tests, all passing.**

---

## 7. Which layer enforces isolation — stated definitively

**The controller layer, alone, by hand, per handler.**

| layer | enforces tenancy? | evidence |
|---|---|---|
| **Database** | **No** | `select … from pg_class where relrowsecurity=true` → **0 tables**. `select count(*) from pg_policies where schemaname='public'` → **0 policies**. 120 foreign keys exist, but a foreign key constrains shape, not visibility. |
| **Middleware** | **Barely** | `requireSchoolScope` exists at `backend/middleware/schoolScope.js:4` and is referenced in **one** route file (`adminRoutes.js`). Per `CLAUDE.md` it checks school *archival*, not per-record tenancy, and `:28` **fails open** on error. |
| **Controller** | **Yes — this is the whole enforcement** | `validateChildAccess` / `isTeacherAssignedToChild`, called by hand in each handler that remembers to. |
| **UI** | Not an enforcement layer | every probe here bypassed the UI entirely |

**This is a structural finding, not a defect.** 159 id-bearing routes, each
relying on a developer remembering a call, with nothing beneath to catch an
omission. D-47, D-53 and D-54 are three instances of the same structural
condition, found in three different controllers by three different mechanisms
(a query-param branch, an unguarded read, and a scope field that does not exist
for one role). The next one will be a fourth.

The suite is the compensating control, and P8 makes it a required CI job.

---

## 8. Per L6 — what the REBUILT suite is blind to

Every suite is blind to something. This one:

1. **Entity types not in the fixture.** The fixture resolves 12 foreign entity
   types; `media` and `emotional_monitoring` came back `null` because the Andijon
   school has no such rows. Those two surfaces were probed with a foreign
   *childId* but never with a foreign *record id*. A leak reachable only by a
   media id would not be seen.
2. **One foreign tenant.** All probes use `amm1`/Andijon as the foreign side. A
   defect that leaks only between two *specific* schools — a shared group, a
   mis-set `regionId` — would not appear.
3. **Read-shaped detection.** The leak test is "does the response body contain
   the foreign id". A write that *succeeds* across the boundary while returning
   an empty body would pass. The PUT and DELETE cells check status codes, not
   after-state: **the suite does not read the database back to confirm a
   cross-tenant write did not land.** That is the same gap L13 exists for, and it
   is open here.
4. **Two roles unrepresented.** `business` and `super_admin` appear in the role
   hierarchy but have no seeded account, so no cell exercises them.
5. **Static surface.** `surface.mjs` reads today's routes. A route added tomorrow
   is not probed until someone regenerates the fixture list — the suite does not
   fail when the surface grows.

The most serious of these is (3). A suite that proves nothing *leaked out* does
not prove nothing *got written in*.

---

## 9. Close conditions

| # | condition | verdict | basis |
|---|---|---|---|
| C1 | postmortem answers all of 3.1 with file:line | **MET** | §1 — the 7 Part A probes tabulated with their report line numbers, the shared shape named, ISO-T02 at `:58` shown to exercise the safe branch, 29 probes vs 159 id-bearing routes |
| C2 | matrix complete, zero untested (role, endpoint, foreign id) cells | **MET for the enumerated surface** — 250/250 cells executed, none skipped. **Not exhaustive over all 159 path-id routes**: 11 representative path surfaces were chosen. Stated rather than claimed. |
| C3 | enforcement layer stated definitively | **MET** | §7 — 0 RLS tables, 0 policies, one middleware reference that fails open; controller-only |
| C4 | the suite's own blind spot named | **MET** | §8 — five, with (3) called out as the most serious |

C2 is qualified deliberately. Probing all 159 path-id routes × 5 roles × 3
methods would be 2,385 cells and would require a foreign fixture for every entity
type in the schema. What was done instead: every *query-param* surface (the D-47
vector) exhaustively, and a representative path-id set. The gap is named, not
papered over.

---

## 10. Defect ledger delta

| id | severity | status | one line |
|---|---|---|---|
| **D-53** | **blocks-use** | **FIXED** `fdc57107` | `/service-plans` had no access check at all; `/therapy/usage` let a supplied `childId` overwrite the school scope and left `where` empty for reception and government |
| **D-54** | **blocks-use** | **FIXED** `fd5c2aee` | `validateChildAccess` skips its scope check for any user without a `schoolId`, admitting every government account — including region-scoped ones — to every child in the country |

`audits/beta/ISOLATION-REPORT.md` carries a correction header from P1 and is
superseded by this document. It is retained unedited: a suite that passed while a
breach was live is evidence about testing, not clutter.
