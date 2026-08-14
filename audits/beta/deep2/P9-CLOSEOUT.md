# P9 — Closeout

**Campaign:** CONSOLIDATION AND HARDENING II · phase 9 of 9
**Date:** 2026-08-15 · **HEAD at campaign start:** `3d780e33` · **HEAD at close:** `028ef934`
**Commits this campaign:** 55 · **Artifacts:** `audits/beta/deep2/P1…P9`
**Single source of truth for defects:** `audits/beta/DEFECT-LEDGER.md`

Every claim below was re-derived from the artifacts on disk, not from memory.

---

## 1. What the campaign found

The brief's premise was that a 5.5/10 build needed consolidating. The largest
findings were not in the ledger it inherited — they were in the machinery that
was supposed to be watching.

**Five defects rated blocks-trust were found in the last two phases**, by gates
built during them:

| id | found by | what it was |
|---|---|---|
| D-59 | reading a suite summary twice | the teacher suite ran **11–12 of 19 files** and exited 0. 56 tests — a third of the suite, covering both the teacher and parent personas — were not running, and the output said "passed" |
| D-61…D-64 | the new conventions gate, first run | four cross-tenant holes the P3 isolation sweep never probed. One **writes** a clinical record to another school's child. One carried the comment `// Admin can access any child` and did exactly that |
| D-65 | the new migrate-fresh gate, first run | **the database could not be rebuilt from migrations at all** |
| D-66 | being blocked by them | the commit hooks were broken four ways, including one that rejected every `docs:` commit for being a `docs:` commit |

D-65 is the one to sit with. Seven model tables and eleven columns existed only
because Sequelize `sync()` created them once. Among the eleven:

- **`children.schoolId`** — the tenant boundary. The column `validateChildAccess`
  compares against. The column D-47, D-53, D-54 and D-61…D-64 are *all* about.
- **`users.isActive`, `users.documentsApproved`** — the reception access gate, by
  name, in `CLAUDE.md`.
- **`users.createdBy`** — the ownership chain the document approve/reject
  boundary checks, which D-52 and D-60 turn on.

> The migration set could not produce the columns that the auth model, the tenant
> boundary and the safeguarding boundary all depend on.

Nothing could have revealed this except building the database from nothing, and
in the platform's history that had never once been done.

---

## 2. The ledger

66 rows. Every row has a real status; three that carried prose instead of one
(`confirmed`, `corrected`, `see artifact`) were resolved this phase.

| status | count |
|---|---|
| **FIXED** | 54 |
| WITHDRAWN | 5 |
| OPEN | 2 |
| UNREPRESENTABLE | 2 |
| PARTIAL | 1 |
| PARTIALLY FIXED | 1 |
| VOID | 1 |

**The five withdrawn matter as much as the fifty-four fixed**, because each was a
finding this project had been carrying as true:

- **D-44** — the documented admin/government password was correct all along. My
  probe sent the wrong one. Campaign I overwrote four production passwords on
  that basis; all four were restored and verified by live login.
- **D-06** — the coded 502 `DOCUMENT_UPLOAD_STORAGE_FAILED` *does* fire,
  contradicting Campaign I.
- **D-14** — the government font 404 no longer reproduces on any portal.
  Resolved upstream by Google; **nothing in this repository changed**, and the
  artifact says so rather than claiming a fix.
- Two more from Campaign I, unchanged.

**Still open, stated plainly:**

| id | why it is still open |
|---|---|
| D-16 | reception cannot create a reception peer. Four routes enumerated, `anyControl: 0`. May be intentional under the role hierarchy — **never decided**, and I did not decide it unilaterally |
| D-17 | creating a reception says `Qabul akkaunti yaratildi` and nothing about the account being unable to log in; the new user's first login then fails with no indication of who must act |
| D-06 | PARTIAL — the user-facing string is fixed; the throw site needs an Appwrite upload failure to locate |
| D-35 | PARTIALLY FIXED — attendance and journal notify; **chat deliberately not wired**, because one notification per message is a product decision about volume, not a defect |
| D-19, D-20 | UNREPRESENTABLE — one guardian per child and one teacher per group are single `NOT NULL` columns. Not defects; schema facts |
| D-18 | VOID — no artifact in either campaign defines this id |

---

## 3. Rescore

Rubric weights from the brief. **BEFORE: 5.5.**

| dimension | weight | before | after | why |
|---|---|---|---|---|
| Truthfulness | 3.0 | ~1.0 | **2.2** | §3.1 |
| Completability | 2.0 | ~1.1 | **1.6** | §3.2 |
| Onboarding | 2.0 | ~1.2 | **1.4** | §3.3 |
| Reachability | 1.5 | ~0.9 | **1.1** | §3.4 |
| Error legibility | 1.0 | ~0.4 | **0.7** | §3.5 |
| Polish | 0.5 | ~0.3 | **0.4** | §3.6 |
| **TOTAL** | **10** | **5.5** | **7.4** | |

### 3.1 Truthfulness — 2.2 / 3.0

The dimension that moved most, because it was the one most broken.

**Before**, the system lied about itself in at least seven measurable ways: CI was
red on every commit while deploying regardless; `ISOLATION-REPORT.md` said 29/29
PASS while D-47 was live in production; the teacher suite reported green while
running 11 of 19 files; the logger emitted nothing at all; audit-write failures
were swallowed; migrations were recorded as applied having done nothing; and a
validation rejection said `Validation failed` while the backend had the field
name and the rule in hand.

**After:** every one of those is closed and gated. CI is green, required, and
blocks the deploy — proven in both directions. The isolation suite is rebuilt
from the code surface. D-59 is fixed *and* a CI check compares collected files
against files on disk. The migration set builds an empty database twice over.
`verify-conventions.mjs` enforces the rule `CLAUDE.md` called most
safety-critical and nothing had ever checked.

**Not 3.0, and the gap is specific.** `migrate-fresh` proves the migrations
*run*; it does not prove the result *matches production*. All 1632 backend tests
mock the database — not one exercises a real constraint or cascade, which is
exactly why D-65 survived a fully green suite for months. The translations remain
AI-generated and unverified by anyone who speaks the language.

### 3.2 Completability — 1.6 / 2.0

The reception wizard enrolled a real child under a guardian the operator never
typed (D-22), advanced past a blank required step and ticked it green (D-23),
and discarded everything on browser Back (D-24). A rejected document locked a
reception out permanently with no path back (D-52). Deep links were discarded on
login in all four portals (D-55). All fixed and re-witnessed on the deployed
build.

Held back by what is still missing rather than broken: chat notifications, no
route from `rejected` back to `pending`, admin export on one route only.

### 3.3 Onboarding — 1.4 / 2.0

Reception onboarding *is* the wizard, and it is now safe rather than silently
wrong. Documents can be un-rejected (D-52) and revoked (D-60). Parents can change
language (D-36). Validation failures name their fields.

Held back honestly: D-17 is open and it is squarely an onboarding defect — the
moment an account is created is the moment the product says least. The
`details[]` messages D-21 now surfaces are **in English**, which is better than a
content-free `Validation failed` and still not Uzbek. CP-019, the notice telling
parents the localisation is machine-translated, is not implemented.

### 3.4 Reachability — 1.1 / 1.5

The touch-only action menu (D-25) blocked every per-parent operation on any
tablet. Deep links (D-55), the admin child page (D-41), export (D-42), the
language switcher (D-36) are all reachable now, and 13 parent routes fit
390×844 with zero breaks.

Held back: 19 enumerated components still have no inbound link (P5 §1), and the
admin portal still has no children index — a child is reachable only through
their guardian.

### 3.5 Error legibility — 0.7 / 1.0

The logger now emits (D-08, P4). Audit-write failures are counted and surfaced
on `/health/readiness`. Errors carry a `correlationId`. Validation names the
field. Migration skips print what they skipped.

Held back: `details[]` is English; the audit log has no UI, so
`approve_after_rejection` and `reject_after_approval` are legible only to someone
with database access — the same gap P5 recorded for concurrent attendance writes.

### 3.6 Polish — 0.4 / 0.5

Same-named children are distinguishable (D-30), the group label names every group
(D-29), names are not truncated (D-57), the parent portal fits a phone, the
government CSV is Uzbek (D-45).

---

## 4. Buyer verdict

**Yes — with one disclosure, down from Campaign I's two.**

### The safe click-path, verified on the deployed build

Not asserted. Driven, on `028ef934`, cold, per portal:

```
clickpath-government  /government/schools   content ✓  serverErrors []  1373 chars
clickpath-admin       /admin/parents        content ✓  serverErrors []  3836 chars
clickpath-reception   /reception/parents    content ✓  serverErrors []  2692 chars
clickpath-teacher     /teacher/bolalar      content ✓  serverErrors []  1298 chars
```

**Zero server errors across all four.** The console errors are the pre-auth
`/auth/me` and `/auth/refresh` probes (2 per portal) and the teacher portal's
known IRR 404s for children without an IRR — classified in P5 §4, not new.

### Campaign I's avoid list, re-measured

Its closeout said: *"What I would not show yet: the parent rating page on a phone
— it is 21px too wide with four of five criteria truncated, on the portal whose
users are overwhelmingly mobile."*

Measured again on the deployed build at 390×844:

```
ratingPage  width: 390   viewport: 390   truncatedLabels: 0
  Muassasa tozaligi       not truncated
  Xizmat sifati           not truncated
  Muassasa tarbiyachisi   not truncated
  Bolaning o'sishi        not truncated
  Muassasaga ishonch      not truncated

13 parent routes checked — breaks: []
```

411 → 390. Four truncated criteria → zero. **The avoid list is cleared**, and it
was cleared by measurement rather than by the commit that claimed it.

Its second reservation — *"I would not promise a launch date that depends on the
13 high-severity dependencies, because I did not resolve them"* — is also
cleared: **13 → 0**, across the backend, all four frontends and the repository
root, with both majors verified behaviourally.

### The one remaining disclosure

**The release process was ungated for the entire history of this platform until
this week.** CI failed on every commit of both campaigns and every one of them
deployed to production anyway. That is now fixed and proven, but a buyer should
be told that "the tests pass" carried no weight as a release claim until
`b6a99aa1`, because passing was never a condition of shipping — and that the two
worst defects of this campaign (D-59, D-65) are both instances of a green signal
that was not measuring what it appeared to measure.

### What I would still not promise

A disaster-recovery rebuild. The migrations now build an empty database, which
they could not do before, but **nothing yet proves the rebuilt schema matches
production.** Until the diff in §6 exists, "we can rebuild from migrations" is a
claim supported by the absence of a crash, not by a comparison.

---

## 5. D-47 disclosure status, and its evidentiary limits

**Status: FIXED** (`6727bc27`, Campaign I), and the fix holds — re-probed in P3
of this campaign.

The disclosure that matters is not the fix, it is what the fix implies.

**What is established.** A school director could read another school's child
activity and meal records, including health notes. It was live in production. It
was found by a probe, not by the test suite, and not by
`ISOLATION-REPORT.md`, which reported **29/29 PASS**.

**Why that report could not have found it** — structural, not bad luck. P1 §C-1
and P3 §2 read its 29 probes: every hostile-URL probe supplies a foreign id on an
endpoint whose role branch *already* validated; the one probe against
`/activities` supplies **no** `childId`, which is the safe branch; there are zero
probes supplying a `childId` as an admin or reception account, the exact evasion;
and all 29 are reads.

**The limits of what can be claimed, stated because they bound the disclosure:**

1. **Exposure window is unknown.** Nothing establishes when the hole opened. It
   predates both campaigns.
2. **Whether it was ever exploited is unknown, and cannot be established.** The
   audit log records mutations, not reads. A cross-tenant *read* leaves no trace
   by design. No amount of forensics on this system can answer that question, and
   any statement that it "was not exploited" would be unfounded.
3. **The class was wider than D-47.** D-53, D-54 and then D-61…D-64 were the same
   shape in six more controllers — four of them found *after* a purpose-built
   isolation suite reported the estate clean. That is the honest disclosure: not
   "a bug was found and fixed", but "a pattern was found repeatedly, by different
   methods, each of which the previous method had missed".
4. **What is now true is narrower than "isolation is proven".** `R15` is enforced
   mechanically for `childId`-scoped handlers — 13 examined, 0 violations. A
   resource scoped by `parentId`, `groupId` or `schoolId` taken from the request
   is the same defect and is **not** checked.

---

## 6. What is still unknown

Ordered by what I would want answered first.

1. **Does the rebuilt schema match production?** The highest-value thing left
   undone. `migrate-fresh` proves the migrations run. The gate that closes D-65
   completely is a diff: dump `information_schema` from the rebuilt CI database,
   compare against a snapshot from production, fail on any difference in table,
   column, type, nullability, default or constraint. That snapshot can only be
   generated once a rebuild succeeds — which it now does, **for the first time**.
2. **Do the backend tests test the database?** All 1632 mock it. Not one
   exercises a real constraint, cascade or query plan. D-65 lived under that
   green suite for months.
3. **Are the translations correct?** Unverified by any speaker.
   `backend/i18n/README.md` still says so. 47 English fallbacks remain, measured.
4. **What do the 19 unreachable components do?** Enumerated in P5 §1 and never
   resolved: `MonthlyMilestones`, `AIWarnings`, `TeacherDetail`, `ChildDetail`,
   `AdminDetails`.
5. **Is `chat_messages` missing a foreign key that matters?** Production has
   **none**, while `20260506000000-add-cascade-rules` claims to give it one with
   `ON DELETE CASCADE` and is recorded as applied. Not retro-added here: adding
   an FK to a live table can fail on orphan rows and is a production-affecting
   change beyond a rebuild fix.
6. **Does the platform behave under concurrency beyond one probe?** P5 proved
   last-writer-wins on one attendance row. Nothing else was tested concurrently,
   including every path fixed in P7 and P8.
7. **D-16 — is it a defect or the design?** Never decided, and I did not decide
   it unilaterally.

---

## 7. Verifier packet

Runnable by someone with the repository and Railway access, without reading any
prose above. **Executed on `028ef934` before publishing this document**; the
pasted output is from that run.

### Gates

```bash
node scripts/verify-conventions.mjs
#   R15 child-scoped access   : 13 childId-scoped handler(s) examined
#   R06 ES modules only       : 209 backend module(s) examined
#   R09 error-code catalogue  : 430 coded error(s) examined
#   R18 FORCE_SYNC            : 506 file(s) examined
#   D-59 vitest collection    : 4 portal config(s) examined
#   ✅ PASSED — 0 violation(s)

node scripts/verify-frontend-i18n.mjs      # ✅ PASSED — 0 raw key(s), 47 English fallback(s)
node backend/scripts/verify-i18n.js        # Verification PASSED — all language files match the catalog
```

### Suites

```bash
cd backend && npm test
#   Test Suites: 160 passed, 160 total
#   Tests:       1632 passed, 1632 total

cd admin      && npx vitest run --testTimeout=30000   # 34 files / 182 tests
cd teacher    && npx vitest run --testTimeout=30000   # 21 files / 182 tests
cd reception  && npx vitest run --testTimeout=30000   # 10 files / 100 tests
cd government && npx vitest run --testTimeout=30000   # 17 files / 124 tests
```

The teacher line is the D-59 check: **21 files**, against 21 on disk. A run
reporting fewer is the defect, not a flake.

### Fail-first, from git history

```bash
git checkout cc9467e2~1 -- backend/controllers/mealPlanController.js \
    backend/controllers/therapyController.js backend/controllers/emotionalMonitoringController.js
cd backend && NODE_OPTIONS=--experimental-vm-modules \
  npx jest __tests__/controllers/r15TenantIsolation.test.js
#   Tests: 6 failed, 4 passed, 10 total       <- the four cross-tenant holes, live

cd .. && git checkout HEAD -- backend/controllers/
cd backend && NODE_OPTIONS=--experimental-vm-modules \
  npx jest __tests__/controllers/r15TenantIsolation.test.js
#   Tests: 10 passed, 10 total
```

The 4 green-in-RED are the unchanged-behaviour guards. They must pass in both
runs; if they fail in RED, the test is measuring the wrong thing.

### The gate itself

```bash
gh run view 31832013029 --json jobs --jq '.jobs[] | "\(.conclusion)\t\(.name)"'
#   19 jobs, all success, 0 skipped

gh run view 31831921982 --json jobs --jq '.jobs[] | "\(.conclusion)\t\(.name)"'
#   failure  blocked        <- CI was red, deployment refused
#   skipped  deploy-backend
#   skipped  deploy-frontends

gh run view 31833275490 --json jobs --jq '.jobs[] | "\(.conclusion)\t\(.name)"'
#   skipped  blocked        <- CI was green
#   success  deploy-backend
#   success  deploy-frontends (admin, government, reception, teacher)
```

### The deployed build

```bash
node audits/beta/deep2/p9-closeout-verify.mjs
#   avoid-list-parent-mobile  breaks: []   rating 390/390   truncatedLabels: 0
#   clickpath-{government,admin,reception,teacher}  content ✓  serverErrors []

node audits/beta/deep2/p8-socket-witness.mjs
#   handshakeWorks: true   realtimeDelivers: true
#   42["attendance:updated",…]   42["notification:new",…]
```

---

## 8. Close conditions

| # | condition | verdict | basis |
|---|---|---|---|
| C1 | every phase re-derived from disk | **MET** | 8 artifacts read from `deep2/`; the three ambiguous ledger rows were resolved by reading `deep/P2-RECEPTION.md`, and D-18 was found to have no defining text anywhere |
| C2 | full ledger, every row with a status | **MET** | §2 — 66 rows; `confirmed`/`corrected`/`see artifact` replaced with real statuses |
| C3 | rescore on the rubric | **MET** | §3 — per dimension, with the reason for each gap, not only the number |
| C4 | buyer verdict with a click-path verified against the avoid list | **MET** | §4 — driven on the deployed build; the avoid list re-measured and cleared |
| C5 | D-47 disclosure status with evidentiary limits | **MET** | §5 — four limits, including the one that cannot be resolved by any means |
| C6 | what is still unknown | **MET** | §6 — seven items, ranked |
| C7 | verifier packet executed before publishing | **MET** | §7 — run on `028ef934`; output pasted is from that run |

---

## 9. The honest summary

The score moved 5.5 → 7.4 because 54 defects were closed with evidence, the
release process acquired a gate that demonstrably blocks, and the dependency
surface went to zero high-severity.

It did not move further because of what the last two phases revealed about the
first seven: **the instruments were not measuring what they appeared to measure.**
A suite that ran two-thirds of itself and said "passed". A migration set that had
never been asked to build anything and could not. An isolation report claiming
29/29 while the hole it existed to find was live. A conventions gate that, on its
first run, found four more instances of the defect class two campaigns had
already been through.

Each was found by asking a green signal what it was blind to, and each time the
answer was: more than anyone had assumed. That is the campaign's actual result,
and it is why §6 is longer than a closing report would normally want it to be.

**The number is 7.4. The finding is that the number was never the problem — the
confidence in it was.**
