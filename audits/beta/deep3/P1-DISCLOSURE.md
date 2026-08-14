# P1 — Disclosure recount

**Campaign:** VERIFY THE VERIFIERS · phase 1 of 7
**Date:** 2026-08-15 · **HEAD:** `ecabdea6` · **Read-only phase** — no code changed.

Campaign II reduced the disclosure count from two to one while finding four new
cross-tenant holes, one of which writes. That arithmetic is re-derived here from
git history, route definitions, deployment records and the production database.

**Three of Campaign II's own claims are corrected below.** Two holes were
narrower than reported and one was not reachable at all.

---

## 1.1 The five holes, dated on both ends

### Method

- **Introduced:** `git log -S "<the exact vulnerable line>"` against the file,
  oldest match. Dates the *code*, not the file.
- **Fixed:** the commit SHA and its author date.
- **Reachable:** read from the route definition — router-level `use()` guards and
  the per-route `requireRole` — because a hole behind a role guard the attacker
  cannot pass is not reachable, whatever the controller does.
- **Deployed:** GitHub Actions `railway-deploy.yml` run history.

### Deployment evidence, common to all five

```
successful deploy runs: 344
first success: 2026-05-07T00:32:02Z | last: 2026-08-14T20:05:52Z
successful deploys BEFORE the D-47 fix: 309
by month: {"2026-05":129,"2026-06":163,"2026-07":4,"2026-08":48}
```

`railway-deploy.yml` was created `70fed5c2` 2026-05-07, which is why the record
starts there. **Before 2026-05-07 there is no deployment record available to me.**
`railway deployment list` returns only the 20 most recent deployments (all from
2026-08-14/15). Whether production served the vulnerable code between each hole's
introduction and 2026-05-07 is **[UNVERIFIED]** — not "no", *unknown*. What would
prove it: Railway's project-level deployment history through its API or dashboard,
which retains further back than the CLI's 20-row window.

The provable window is therefore **2026-05-07 → each hole's fix date**, and inside
it production was rebuilt from `main` **309 times** before the first of these
fixes landed.

Independently, the production database was being written throughout: the oldest
row of any kind is 2026-05-29 (`audit_log`) / 2026-05-30 (all business tables),
and rows continue to 2026-08-14. Production was live and serving.

### D-47 — cross-tenant read of activities and meals

| | |
|---|---|
| **Introduced** | `a58f441d` **2026-01-05** — the repository's first commit |
| **Fixed** | `6727bc27` **2026-08-14 16:38:33 +0500** |
| **Route** | `activityRoutes.js:16` `router.use(authenticate)`; `:18` `router.get('/', …, getActivities)` — **no `requireRole`**. Same shape in `mealRoutes.js:16,18` |
| **Reachable by** | any authenticated **non-parent** role: teacher, reception, admin, government. Parents were guarded by the other branch |
| **Live in production** | **YES**, provably 2026-05-07 → 2026-08-14, 309 deploys |
| **Data** | READ. `activities` — `title, description, notes, skill, goal, tasks, methods, progress, observation, services, studentEngagement`. `meals` — `mealName, description, specialNotes, quantity, eaten`. **1,607 activity rows and 4,808 meal rows exist in production today**, none soft-deleted |

The vulnerable pairing, from `git show 6727bc27^:backend/controllers/activityController.js`:

```js
if (childId) {
  where.childId = childId;          // <- client-supplied id, no scope check
} else if (req.user.schoolId) {
  const schoolChildren = await Child.findAll({ where: { schoolId: req.user.schoolId }, … });
  where.childId = { [Op.in]: schoolChildren.map(c => c.id) };
}
```

Supplying `?childId=` skipped the school scope entirely. Omitting it did not.

### D-61 — unscoped read of meal plans

| | |
|---|---|
| **Introduced** | `cb840b32` **2026-03-31** — "feat: Feature 3 — Per-Child Meal Plan with bulk assign" |
| **Fixed** | `cc9467e2` **2026-08-14 23:20:34 +0500** |
| **Route** | `mealPlanRoutes.js:20` `router.use(authenticate)`; `:22` `router.get('/', getMealPlans)` — **no `requireRole` at all** |
| **Reachable by** | **every authenticated role without exception** — parent, teacher, reception, admin, government. The widest of the five |
| **Live in production** | **YES**, provably 2026-05-07 → 2026-08-14 |
| **Data** | READ. `meal_plans` — `planned_menu, notes, meal_type, date`, joined to `children.firstName/lastName`. **The table holds 0 rows and 0 soft-deleted rows.** |

`mealPlanController.js:21` (pre-fix) was `const where = { childId };` with no
preceding check of any kind.

**Materially: the hole was live, maximally reachable, and there was nothing
behind it.** A caller exploiting it received an empty array. That is a fact about
the data, not a mitigation of the defect, and it is stated separately from
reachability so neither is read as excusing the other.

### D-62 — cross-tenant WRITE of a therapy usage record

| | |
|---|---|
| **Introduced** | `8adb083c` **2026-01-24** — "Fix therapy start endpoint for teachers and add child assignment during therapy creation" |
| **Fixed** | `cc9467e2` **2026-08-14 23:20:34 +0500** |
| **Route** | `therapyRoutes.js:35` `router.post('/', requireRole('admin', 'teacher'), …, createTherapy)` |
| **Reachable by** | admin and teacher. **Both are school-scoped roles**, and neither was scope-checked |
| **Live in production** | **YES**, provably 2026-05-07 → 2026-08-14 |
| **Data** | **WRITE.** Creates a `therapy_usages` row — `therapyId, childId, parentId, teacherId, startTime` — against a child in another school. `therapy_usages` holds 98 rows, earliest 2026-07-26 |

`therapyController.js:270` (pre-fix): `const child = await Child.findByPk(childId);`
— primary-key lookup, no school scope, then `TherapyUsage.create`.

**This is the one that writes.** It attaches a clinical record to a child the
caller has no relationship with. It is the most serious of the five and Campaign
II's disclosure count did not reflect it.

### D-63 — admin bypass in startTherapy — **NOT REACHABLE**

| | |
|---|---|
| **Introduced** | `8adb083c` **2026-01-24** |
| **Fixed** | `cc9467e2` **2026-08-14 23:20:34 +0500** |
| **Route** | `therapyRoutes.js:31` `router.post('/:id/start', requireRole('parent', 'teacher'), …, startTherapy)` |
| **Reachable by** | parent and teacher **only** |
| **Live in production** | **NO — the vulnerable branch was unreachable** |
| **Data** | none exposed |

`therapyController.js:305` (pre-fix) read, in full:

```js
} else if (userRole === 'admin') {
  // Admin can access any child
  parentId = child.parentId;
```

**`requireRole('parent', 'teacher')` means `userRole === 'admin'` is never true
inside this handler.** The branch is dead code. The two roles that *can* reach it
were both guarded: the parent branch checks `child.parentId !== userId`, and the
teacher branch resolves the teacher's own groups and requires the child's parent
to be assigned to them.

Only one mount exists — `grep -rn "startTherapy" backend/routes/*.js` returns
`therapyRoutes.js:31` and nothing else.

**Correction to Campaign II.** `P8-GATES.md` §4 states D-63 as *"an admin of
school A could start a therapy session against school B's child and write a usage
row for them."* **That is wrong.** The fix is still correct as defence in depth —
a future route change would activate the branch — but it closed a latent defect,
not a live exposure, and it must not be counted in a disclosure.

### D-64 — cross-tenant read of emotional monitoring

| | |
|---|---|
| **Introduced** | `1873c41a` **2026-01-21** — "Add weekly emotional monitoring journal feature" |
| **Fixed** | `cc9467e2` **2026-08-14 23:20:34 +0500** |
| **Route** | `teacherRoutes.js:59-60` `router.use(authenticate); router.use(requireTeacher);` then `:119` `router.get('/emotional-monitoring/child/:childId', getMonitoringByChild)` |
| **Reachable by** | `middleware/auth.js:163` — `['teacher', 'reception', 'admin']`. The controller guarded `parent` and `teacher`; **`reception` and `admin` fell through with no check** |
| **Live in production** | **YES**, provably 2026-05-07 → 2026-08-14 |
| **Data** | READ. `emotional_monitoring` — `emotionalState, notes, teacherSignature, date`. **24 rows in production** |

`emotionalMonitoringController.js:239` (pre-fix) reached `const where = { childId };`
with no `else` on the role chain.

**Correction to Campaign II.** `P8-GATES.md` §4 states the fall-through admitted
*"admin, reception and government"*. **Government is wrong** — `requireTeacher`
does not admit it, so a government account receives 403 before reaching the
controller. The exposure is admin and reception only.

### Summary

| id | introduced | fixed | reachable by | live in prod | data |
|---|---|---|---|---|---|
| D-47 | 2026-01-05 `a58f441d` | 2026-08-14 `6727bc27` | teacher, reception, admin, government | **YES** | READ — 1,607 activities + 4,808 meals |
| D-61 | 2026-03-31 `cb840b32` | 2026-08-14 `cc9467e2` | **every** authenticated role | **YES** | READ — table empty (0 rows) |
| D-62 | 2026-01-24 `8adb083c` | 2026-08-14 `cc9467e2` | admin, teacher | **YES** | **WRITE** — therapy_usages |
| D-63 | 2026-01-24 `8adb083c` | 2026-08-14 `cc9467e2` | — (branch unreachable) | **NO** | none |
| D-64 | 2026-01-21 `1873c41a` | 2026-08-14 `cc9467e2` | admin, reception | **YES** | READ — 24 monitoring rows |

**Four of the five were live. One was not. One of the four writes.**

---

## 1.2 D-08 — definitively

**D-08 is FIXED for retrieval and NOT fixed for retention, and the retention
window does not reach the exposure dates by any margin.**

`deep2/P4-OBSERVABILITY.md` §1 establishes the root cause: the logger emitted
nothing at all. `backend/utils/logger.js`'s PII redactor rebuilt the info object
with `Object.entries()`, which enumerates string keys only, dropping winston's
`Symbol.for('level')` and `Symbol.for('message')` — so every transport had nothing
to write and discarded every line. Fixed in `56d08287`.

The retention answer, quoted from `P4-OBSERVABILITY.md` §4:

> | **Retention** | **current deployment only.** A 1000-line request returned 260
> rows, oldest `2026-08-14T13:36:33Z` — the current container start. **A redeploy
> discards the history.** |
> | **Durable history** | none. No log drain is configured and `SENTRY_DSN` is
> unset, so `backend/utils/errorTracker.js` is a documented no-op. |

**Retention window: the current container's lifetime. Zero durable history.**

Set against 1.1:

| | |
|---|---|
| exposure window, provable | 2026-05-07 → 2026-08-14 (99 days, 309 deploys) |
| log retention | current deployment only |
| deployments since the fixes | the campaign redeployed repeatedly on 2026-08-14/15; each discarded the prior container's logs |
| **overlap** | **none** |

Before 2026-08-14 13:36 there are no application logs of any kind, anywhere,
because until `56d08287` **none were ever written** — not lost, never produced.
No drain, no Sentry, no archive.

---

## 1.3 Access evidence

**For every hole live in production — D-47, D-61, D-62, D-64 — no evidence exists
either way as to whether it was accessed.**

What was checked, and what each can and cannot show:

| source | covers the window? | what it could show |
|---|---|---|
| application logs | **no** — never written before 2026-08-14 13:36 (§1.2) | request url, method, ip, userAgent, userId, role per request |
| Sentry | **no** — `SENTRY_DSN` unset in production | errors only, and not reads |
| `audit_log` | **no** — table created by migration 2026-05-19; earliest row 2026-05-29; and it records **mutations, not reads** | writes only |
| Railway log drain | **no** — none configured | — |
| database row inspection | n/a | a read leaves no row |

**No evidence of access exists for any of the four.** That is the complete
statement this evidence supports.

Three of the four are reads. **A cross-tenant read leaves no trace by design** —
not in the audit log, which records mutations, and not in application logs, which
did not exist. No forensic method available on this system can answer the
question, now or later, for the period before 2026-08-14 13:36.

D-62 is a write, and writes *are* auditable in principle. `logAudit` is not called
by `createTherapy`, so no audit row would exist for it either; and inspecting
`therapy_usages` for rows whose `childId` belongs to a different school than the
creating actor is not possible because the table does not record the actor's
school. **[UNVERIFIED]** — what would prove it: a join from `therapy_usages` to
the creating user, which the schema does not support, since `teacherId` is
nullable and no `createdBy` column exists.

---

## 1.4 Disclosure count, recomputed

### A mitigating fact, stated before the count and not instead of it

**Every row in the production database is demo or test data.**

```
schools    10 rows — 4 named "Toshkent/Samarqand Maxsus Maktab 1/2" (2026-05-30)
                     6 seeded by Campaign II (2026-08-14, ids prefixed 5eed)
children  138 rows — 121 with 5eed-prefixed ids
                      12 parented by parent1..parent12@uchqun.uz (2026-05-30)
                       5 created by this campaign's own probes (2026-08-14)
oldest row of any kind: 2026-05-29 (audit_log) / 2026-05-30 (business tables)
```

There is no real school, no real child, and no real guardian in this database
today.

**This does not reduce the count, for a reason that must be stated:** the
database's oldest row is 2026-05-30, while the code dates to 2026-01-05. Whether
real data existed before 2026-05-30 and was removed **cannot be determined** —
`audit_log` did not exist until 2026-05-19, and application logs did not exist
until 2026-08-14. The absence of old rows is not evidence that old rows never
existed.

### The count

**Three.** Campaign II reported one.

**Disclosure 1 — cross-tenant access to child records was live in production for
a provable minimum of 99 days.** Three separate holes: two reads (D-47 across
6,415 rows of activity and meal records including free-text notes and
observations; D-64 across 24 emotional-monitoring records including
`emotionalState` and clinical notes) and **one write** (D-62, which attaches a
therapy record to a child in another school). Reachable by ordinary school staff
roles — teacher, reception, admin — not by anything privileged. Live across 309
production deploys. All fixed 2026-08-14.

**Disclosure 2 — whether any of it was accessed cannot be determined, now or
ever, for the period before 2026-08-14 13:36.** Application logs were never
written until that moment; the audit log records mutations only and did not exist
until 2026-05-19; `SENTRY_DSN` is unset; no log drain exists. A buyer must be told
that this question is permanently unanswerable for that period, rather than
answered optimistically.

**Disclosure 3 — the release process was ungated for the platform's entire
history until 2026-08-14.** CI failed on every commit of both campaigns and every
one deployed regardless (`deep2/P8-GATES.md` §1). This is the disclosure Campaign
II carried, and it stands unchanged.

### How Campaign II arrived at one

`deep2/P9-CLOSEOUT.md` §4 states: *"Yes — with one disclosure, down from Campaign
I's two."* Campaign I's two were the D-47 breach and the ungated release
(`deep/P8-CLOSEOUT.md` §5). Campaign II kept the second and dropped the first.

Two errors produced that:

1. **A fixed breach was treated as a discharged disclosure.** D-47 was fixed and
   re-witnessed, and the disclosure was dropped on that basis. Remediation does
   not retire a disclosure — the exposure still occurred, and the reason to tell
   a buyer is the exposure, not the bug's present state.
2. **The four new holes were never added to the count.** They were found in P8,
   the same phase that wrote the disclosure section, and `P9-CLOSEOUT.md` §4
   discusses D-61…D-64 nowhere. The count was carried forward from Campaign I and
   decremented, not recomputed.

The arithmetic Campaign II performed was `2 − 1 = 1`. The arithmetic the evidence
supports is `1 (exposure, now spanning three holes rather than one) + 1
(unanswerable access question) + 1 (ungated release) = 3`.

Campaign II's §5 *did* carry four evidentiary limits on D-47 honestly, including
that exploitation is unknowable. Those limits were recorded and then not counted.

---

## 2. Close conditions

| # | condition | verdict | basis |
|---|---|---|---|
| C1 | all five holes dated on both ends, deployment reachability proven | **MET, with one bound stated** | §1.1 — five introducing SHAs from `git log -S`, five fix SHAs with author dates, route guards read for each, 344 deploy runs. Reachability before 2026-05-07 is marked **[UNVERIFIED]** with what would prove it, rather than assumed |
| C2 | D-08 answered definitively with its retention window | **MET** | §1.2 — retrieval fixed `56d08287`, retention is the current container only, oldest line `2026-08-14T13:36:33Z`, zero overlap with the exposure window |
| C3 | no sentence asserts access did not occur | **MET** | §1.3 — the only claim made is that no evidence of access exists; the reads are stated to be untraceable by design and the write's actor is unrecoverable from the schema |
| C4 | count recomputed with arithmetic shown | **MET** | §1.4 — three, with both errors in Campaign II's `2 − 1 = 1` identified |

---

## 3. Citation audit (L4)

Every file:line and command output cited above, re-read at `ecabdea6`:

```
$ sed -n '163p' backend/middleware/auth.js
  if (['teacher', 'reception', 'admin'].includes(req.user.role)) {
$ sed -n '59,60p' backend/routes/teacherRoutes.js
router.use(authenticate);
router.use(requireTeacher);
$ sed -n '119p' backend/routes/teacherRoutes.js
router.get('/emotional-monitoring/child/:childId', getMonitoringByChild);
$ sed -n '20p;22p' backend/routes/mealPlanRoutes.js
router.use(authenticate);
router.get('/', getMealPlans);
$ sed -n '31p;35p' backend/routes/therapyRoutes.js
router.post('/:id/start', requireRole('parent', 'teacher'), …, startTherapy);
router.post('/', requireRole('admin', 'teacher'), …, createTherapy);
$ sed -n '16p;18p' backend/routes/activityRoutes.js
router.use(authenticate);
router.get('/', …, getActivities);

$ git show cc9467e2^:backend/controllers/therapyController.js | grep -n "Admin can access any child"
305:        // Admin can access any child
$ git show cc9467e2^:backend/controllers/mealPlanController.js | grep -n "const where = { childId };"
21:    const where = { childId };
$ git show cc9467e2^:backend/controllers/emotionalMonitoringController.js | grep -n "const where = { childId };"
239:    const where = { childId };
$ git show cc9467e2^:backend/controllers/therapyController.js | grep -n "Child.findByPk(childId);"
179:        const child = await Child.findByPk(childId);
270:      const child = await Child.findByPk(childId);
```

Artifacts quoted: `deep2/P4-OBSERVABILITY.md` §4 (retention table),
`deep2/P8-GATES.md` §1 and §4, `deep2/P9-CLOSEOUT.md` §4,
`deep/P8-CLOSEOUT.md` §5. All four opened in full.

**Unresolvable citations: 0.**

---

## 4. Defect ledger delta

No code changed in this phase. Two corrections to existing rows:

| id | change |
|---|---|
| **D-63** | severity corrected from blocks-trust to **latent** — the vulnerable branch is unreachable behind `requireRole('parent','teacher')`. Fix retained as defence in depth. `deep2/P8-GATES.md` §4's description is wrong and is corrected here |
| **D-64** | exposure corrected — **admin and reception only, not government**. `requireTeacher` (`auth.js:163`) does not admit government |
