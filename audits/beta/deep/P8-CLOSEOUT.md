# P8 — Fix, prove, gate, re-derive, rescore

**Campaign:** DEEP HARDENING · phase 8 of 8 (final)
**Date:** 2026-08-14
**Campaign start SHA:** `03906f24` · **Final SHA:** `ed2579f7` · branch `main`
**Artifacts:** `audits/beta/deep/P8/logs/` (fail-first outputs, suite runs) · `audits/beta/deep/P8/screenshots/`

---

## 1. What was fixed, and how it was proven

Every fix carries a test that was **red against the unfixed code and green against the fixed code**, both outputs pasted, and then a **third proof: the behaviour re-witnessed against production** after deploy. A test passing is not the same as the product working, so both are here.

| defect | severity | test | RED | GREEN | production re-witness |
|---|---|---|---|---|---|
| **D-47** cross-tenant read | blocks-use | `backend/__tests__/controllers/crossTenantChildRead.test.js` | 5 failed / 1 passed | **6 / 6** | admin + reception both `403` on activities, meals, media; single meal by id `404` |
| **D-43** `/admin/therapy` dead | blocks-use | `admin/src/__tests__/pages/therapyRating.test.js` | 2 failed / 2 passed | **4 / 4** | route renders `Terapiya boshqaruvi (20)`, `crashed: false`, `pageErrors: []` |
| **D-31** teacher read whole school | blocks-use | `backend/__tests__/controllers/attendanceHardening.test.js` | 6 failed / 2 passed | **8 / 8** | 21 records / 21 distinct children (was 61); save bar reads `24 dan 21 ta belgilangan` |
| **D-27** false attribution, no audit | blocks-use | same file | same run | same run | `marked_by = qabul@tmm3.uz` (the reception that wrote it); two `attendance_overwrite` audit rows with correct `actorRole` |
| **D-26** no lower date bound | degrades-use | same file | same run | same run | `400 {"code":"ATTENDANCE_DATE_TOO_EARLY"}` for `2020-01-06` |
| **D-28** therapyType enum split three ways | blocks-use | `backend/__tests__/validators/therapyEnumParity.test.js` | 3 failed / 1 passed | **4 / 4** | validator and model enum now identical; every UI option inside both |
| **D-37 / D-46 / D-49** i18n | degrades-use | `scripts/verify-frontend-i18n.mjs` | 8 raw keys, exit 1 | **0 raw keys, exit 0** | 57 keys added across 4 portals × 3 locales |

In every RED run the passing tests are deliberate positive controls — "admin still sees the whole school", "a recent date is still accepted", "getActivities returns records when the child IS accessible". They exist so a red run proves the defect rather than proving the harness is broken.

### The fixes themselves

**D-47** — `activityController.js` and `mealController.js` put the school scope in an `else if (req.user.schoolId)`, so supplying `childId` took the first branch and skipped it. `getMeal` had no admin filter at all. Every admin/reception read of a named child now goes through `validateChildAccess`, and `getMeal` is school-scoped. `CLAUDE.md`'s mandatory child-scoped access rule names Activity and Meal explicitly; the code now matches the pattern that document prints.

**D-43** — `rating` is `DECIMAL(3,2)`, which Sequelize serialises as a **string**; `TherapyManagement.jsx:310` called `.toFixed()` on it inside a `map`, so the first row threw and the ErrorBoundary took the route down permanently. Adopts the guard already in use at `teacher/src/pages/therapy/TherapyCard.jsx:28`.

**D-31** — `listAttendance` scoped on `schoolId` alone. Teachers are now narrowed to the children they teach, and a foreign `childId` returns `403 ATTENDANCE_CHILD_NOT_ACCESSIBLE`. Admin and reception are unchanged.

**D-27** — the update branch wrote only `status` and `note`, so an overwrite kept the original `markedBy`. `markedBy`/`teacherId` now follow the writer, every overwrite writes an audit row, and clearing an absence emits `ATTENDANCE_ABSENCE_CLEARED`.

**D-26** — adds `ATTENDANCE_DATE_TOO_EARLY`, bounded by `ATTENDANCE_MAX_BACKDATE_DAYS` (default 365) so corrections stay possible and 2020-in-2026 does not. Catalogue row and all three locale entries added, per the rule in `CLAUDE.md` that a new error code must ship with its catalogue row.

**D-28** — the DB enum is the binding constraint (changing it needs a migration), so the validator was aligned to it. The test reads all three layers from source, so the three cannot silently diverge again.

**D-49** — `scripts/verify-frontend-i18n.mjs` reads the frontend catalogues and every `t()` call site. It fails the build on any raw key; English `defaultValue` fallbacks are reported with a count so they cannot quietly grow. Wired into CI as a blocking job.

### A fix of mine that failed silently, and how it was caught

The first D-27 fix passed `entityId: \`${childId}:${date}\``. `audit_log.entityId` is a **uuid** column; Postgres rejected the insert; `logAudit` swallows write errors by design so that audit failures never break features. The result: `markedBy` was correctly fixed, the endpoint returned `201`, the unit test passed — and **no audit row ever appeared**.

It was caught only by reading production after deploy:

```
=== attendance row ===         marked_by qabul@tmm3.uz  role reception   ✔
=== audit_log ===              (0 rows)                                  ✘
```

Fixed by moving the date into `meta`, and the test now asserts `entityId` is the child's uuid and that `meta` carries `date`/`previousStatus`/`newStatus`. After redeploy:

```
 action               | actorRole | entityId                             | meta
 attendance_overwrite | reception | 5eed0c9a-fe3e-4031-8f5c-aac195c36b31 | {"date":"2026-08-12","newStatus":"pr…
 attendance_overwrite | teacher   | 5eed0c9a-fe3e-4031-8f5c-aac195c36b31 | {"date":"2026-08-12","newStatus":"ab…
```

This is the same failure class the campaign spent eight phases finding — a write that reports success while nothing lands — and it happened to my own fix. Only the production read caught it. It is the single strongest argument in this report for why "the test passes" was never allowed to be the last word.

---

## 2. The CI hard gate

### State on the final SHA `ed2579f7`

| job | result |
|---|---|
| `lint` | ✅ |
| `lint-frontend` (admin, teacher, reception, government) | ✅ ×4 |
| `test-backend` — 151 suites, **1571 tests** | ✅ |
| `test-frontend` (admin 171, teacher 167, reception 84, government 124) | ✅ ×4 |
| **`i18n`** (new — backend catalogue + frontend gate) | ✅ |
| `security` — `npm audit --audit-level=high --omit=dev` | ❌ |
| `sast` — Trivy, block on CRITICAL/HIGH | ❌ |

**11 green, 2 red.** Both red jobs are dependency scanners, and both were red before this campaign began.

### D-50 — CI has been red on `main` on every commit, and deploys shipped anyway (degrades-use)

```
failure  9f8c364b  2026-08-14   failure  62d5214f  2026-08-14
failure  ab86509c  2026-08-14   failure  296713a4  2026-08-14
failure  93d7202a  2026-08-14   failure  03906f24  2026-08-14   ← campaign start SHA
failure  26a977dd  2026-08-14   failure  c3e0a6fb  2026-08-10
```

Twelve consecutive failures, back to 2026-08-10 at least. Meanwhile **every `Deploy to Railway` run succeeded**, because `railway-deploy.yml` triggers on `push: branches: [main]` with no `needs:` and no `workflow_run` dependency on CI. Production deployment is not gated on the test suite, the linters, or the security scanners.

Two distinct causes were tangled together in that red:

1. **A stale test.** `government/src/__tests__/SidebarCapability.test.jsx` asserted an 8-link nav, with the comment *"students/teachers/parents removed from primary nav"*. That removal was reversed in the product — the sidebar has 11 links and P6 exercised all three restored routes (`O'quvchilar` 138, `Tarbiyachilar` 32, `Ota-onalar` 136) with correct region scoping. The test was never updated. **Fixed.** Its failure also cancelled the `test-frontend` and `lint-frontend` matrix legs for admin and reception via fail-fast, which made the red look four times worse than it was.

2. **Dependency vulnerabilities.** `npm audit --omit=dev` on the backend reports **25 vulnerabilities (12 moderate, 13 high)** in *production* dependencies, on the `ws` → `engine.io` → `socket.io-adapter` chain. Trivy independently reports 18 CRITICAL/HIGH for `backend/package-lock.json` and 2 each for admin, government and the root.

**Not fixed, deliberately.** Upgrading `socket.io`'s transitive chain changes the realtime transport that this campaign has been exercising (P3 proved live chat delivery works without reload), and I have no way to run an integration test against production infrastructure before pushing. Bumping it blind on a live government platform is a worse risk than the one it closes. It is named, quantified, and left for a maintenance window with a rollback plan.

**The deploy gate is the more serious half.** A red suite that still ships is not a test failure, it is an absent control.

---

## 3. Re-derivation of every phase's close conditions

Per L6, no phase closed itself. Each condition below was re-checked here against the artifacts, not copied from the phase that claimed it.

| phase | claimed | re-derived | disagreement |
|---|---|---|---|
| **P1** seed | 4/4 MET | **4/4 confirmed** — X-01 probe verbatim, D-19/D-20 schema proofs, 6 schools across 3 regions all still present and queried in P6/P7 | none |
| **P2** reception | 5/5 MET | **5/5 confirmed** — 201 controls dispositioned; D-25 (touch vs hover) still stands | none |
| **P3** teacher | 7/7 MET | **7/7 confirmed** — 297 controls; the D-03 class proof (4 weeks, day-for-day against SQL) is the strongest single piece of evidence in the campaign | none |
| **P4** parent | 6 MET, C7 UNMET | **confirmed, including the UNMET** — `children.parentId` is a single `NOT NULL` uuid; two-guardian visibility is unrepresentable, not untested | none |
| **P5** admin | 6 MET, C7 UNMET | **confirmed** — C7 (restore preserves account flags) remains unproven; the test written for it targeted the wrong row | none |
| **P6** government | 7/7 MET | **7/7 confirmed** — scoping correct in both directions at the API; the `Arxivlash` non-action is correctly recorded as a non-action | none |
| **P7** cross-cutting | 5 MET, C6 + C7 UNMET | **confirmed** — D-08 re-derived not resolved; resilience under induced network degradation was not run | none |

**Two conditions were UNMET at phase close and are still UNMET now:**

- **P5 C7** — whether restore preserves `isActive`/`isVerified`/`documentsApproved`. Unproven. One run against a fully-active reception, targeting by id, would settle it.
- **P7 C7** — resilience under induced offline/throttled conditions. Not run.

**One was UNMET and is now partly addressed:** P7 C6 asked for D-08 resolved or re-derived. It is re-derived and still open — and this phase produced concrete evidence of its cost: D-48's mechanism could not be diagnosed because the backend logs are unreadable.

Nothing was reworded to make it pass.

---

## 4. Rescore

Scored per criterion, not per role. The prior campaign's 3.0 → 8.25 was a per-role average; that shape is dropped as the brief requires.

| criterion | score | why |
|---|---|---|
| **Tenant isolation** | **6 / 10** | The breach found in P7 is closed and re-witnessed in production, and government region scoping is correct in both directions with server-side grant enforcement. But it was found at all, in endpoints a 2026-06-09 report called 29/29 PASS, in code that contradicted the project's own written mandatory pattern. Six because the control now works; not higher because the class of error is unbounded — I tested Activity, Meal and Media, and there are other child-scoped resources. |
| **Safeguarding-record integrity** | **7 / 10** | Attendance now attributes writes to the writer, audits every overwrite, logs cleared absences, and refuses impossible dates. D-30 remains: two children with the same name in one group are indistinguishable on the attendance grid, in two portals. |
| **Authorisation and session** | **8 / 10** | Logout invalidates across three endpoints, lockout fires at its configured threshold, all five portal roots redirect when unauthenticated, teacher and parent child-scope guards hold, government grants enforce field by field. Held back by D-48: the documented unlock endpoint reports success and does not unlock. |
| **Correctness of what ships** | **7 / 10** | The dead admin route is fixed, the enum divergence is fixed, the D-03 date class is provably closed. D-41 (a raw UUID as a page title on refresh) and D-33/D-32 (mobile layout on the rating page) are open. |
| **Internationalisation** | **5 / 10** | Zero raw keys now reach users, and a gate exists that would have caught them. 57 English `defaultValue` fallbacks remain, mostly in the government portal, plus hardcoded literals outside i18n entirely (`Show N errors`, `DOB:`, the schools CSV header). Five because the floor is raised and measured, not because the ceiling is near. |
| **Observability** | **3 / 10** | D-08 is unchanged since the first campaign: backend application logs are unreadable, across hundreds of authenticated requests. It is now demonstrably blocking — it prevented diagnosing D-48. Audit logging, by contrast, is good: bulk import, delete, restore and now attendance overwrites all write rows. |
| **Test and CI discipline** | **4 / 10** | 2117 tests pass and the suites are genuinely broad. But CI was red on every commit for at least four days, a stale test sat unfixed, production deploys are not gated on CI at all, and 13 high-severity vulnerabilities sit in production dependencies. The tests are good; the gate around them is not. |
| **Documentation fidelity** | **4 / 10** | `CLAUDE.md` is unusually good and its rules are specific enough to test against — which is how D-47 was framed. Against that: `credentials.md` documents a password the government accounts rejected, and a shipped migration asserts a hash equals `Test@2026` when it does not. Documentation that cannot be followed is worse than none. |

**Weighted overall: 5.5 / 10.**

I am not producing a single number as a verdict without saying what it is not. It is not comparable to the prior campaign's 8.25 — that was averaged across roles after a fix wave aimed at the specific defects that wave had found. This one is scored against the platform's obligations, by criteria, after eight phases that went looking in places the earlier runs did not.

---

## 5. Buyer verdict

**Can this be shown to a buyer? Yes — with two disclosures.**

The product does the thing it claims. A teacher marks attendance and the parent sees it on the right calendar date, at a month boundary and a week boundary, proven day-for-day against the database across four weeks. A teacher writes a journal entry and it appears on the parent's dashboard attributed to them. A chat message arrives on an already-open parent screen with no reload. Bulk import validates nine rows, reports seven distinct row-level errors, states plainly that two of nine will be imported, and imports exactly two. A ministry account in Toshkent sees four schools; the same screen for Samarqand sees five; the republic account sees all ten across three regions; a grant-limited account is refused at the API with a specific code. Delete, trash, restore works and is audited both ways.

**Disclosure one: this build is four days old as a deployable artifact.** The cross-tenant read breach was live in production until today. It is closed and re-witnessed, but the buyer should be told that a school director could read another school's child records — including health notes — and that this was found by a probe, not by the test suite, and not by the isolation report that says 29/29 PASS.

**Disclosure two: the release process has no gate.** CI has been failing on `main` continuously and every one of those commits deployed to production regardless. Until `railway-deploy.yml` depends on CI, "the tests pass" carries no weight as a release claim, because passing was never a condition of shipping.

**What I would not show yet:** the parent rating page on a phone — it is 21 px too wide with four of five criteria truncated, on the portal whose users are overwhelmingly mobile. And I would not promise a launch date that depends on the 13 high-severity production dependencies being resolved, because I did not resolve them and do not know how disruptive the upgrade is.

**What would change my answer to an unqualified yes:** the deploy gate wired to CI; the dependency chain upgraded and the realtime path re-tested; D-08 fixed so incidents are diagnosable; and one more isolation sweep over the child-scoped resources I did not test.

---

## 6. Verifier packet

Everything below can be run by someone with the repository and Railway access, in this order, without reading any prose in this campaign.

### Reproduce the fixes, red then green

```bash
# D-47 — cross-tenant read
git stash push backend/controllers/activityController.js backend/controllers/mealController.js
cd backend && node --experimental-vm-modules ./node_modules/jest/bin/jest.js \
  __tests__/controllers/crossTenantChildRead.test.js --forceExit     # expect 5 failed / 1 passed
cd .. && git stash pop
cd backend && node --experimental-vm-modules ./node_modules/jest/bin/jest.js \
  __tests__/controllers/crossTenantChildRead.test.js --forceExit     # expect 6 passed

# D-26 / D-27 / D-31 — attendance
git stash push backend/controllers/attendanceController.js
cd backend && node --experimental-vm-modules ./node_modules/jest/bin/jest.js \
  __tests__/controllers/attendanceHardening.test.js --forceExit      # expect 6 failed / 2 passed
cd .. && git stash pop && cd backend && node --experimental-vm-modules \
  ./node_modules/jest/bin/jest.js __tests__/controllers/attendanceHardening.test.js --forceExit  # 8 passed

# D-28 — enum parity across three layers
cd backend && node --experimental-vm-modules ./node_modules/jest/bin/jest.js \
  __tests__/validators/therapyEnumParity.test.js --forceExit         # expect 4 passed

# D-43 — the admin therapy crash
cd admin && npx vitest run src/__tests__/pages/therapyRating.test.js  # expect 4 passed

# D-49 — the gate that was missing
node scripts/verify-frontend-i18n.mjs                                 # expect 0 raw keys, exit 0
node backend/scripts/verify-i18n.js                                   # expect 253/253
```

### Reproduce the findings that are still open

```bash
node audits/beta/deep/p7f-auth-session.mjs      # D-48: unlock returns 200, account stays 429-locked
railway logs -s Uchqun -n 60                    # D-08: container-start lines only
cd backend && npm audit --audit-level=high --omit=dev   # D-50: 13 high in production deps
grep -A4 '^on:' .github/workflows/railway-deploy.yml    # D-50: no CI dependency
node audits/beta/deep/p4a-parent-routes.mjs     # D-32/D-33: /rating 411px, /therapy 394px at 390px
```

### Re-witness the fixes against production

```bash
node audits/beta/deep/p8a-prod-verify.mjs   # D-47, D-31, D-26, D-43 all closed
node audits/beta/deep/p8b-d27-verify.mjs    # D-27: then read child_attendance + audit_log
```

### Check the evidence itself

```bash
for P in P3 P4 P5 P6 P7; do node audits/beta/deep/_p${P#P}index.mjs; done   # index vs filesystem, 0 orphans
node audits/beta/deep/citation-audit.mjs audits/beta/deep/P3-TEACHER.md      audits/beta/deep/P3/screenshots
node audits/beta/deep/citation-audit.mjs audits/beta/deep/P4-PARENT.md       audits/beta/deep/P4/screenshots
node audits/beta/deep/citation-audit.mjs audits/beta/deep/P5-ADMIN.md        audits/beta/deep/P5/screenshots
node audits/beta/deep/citation-audit.mjs audits/beta/deep/P6-GOVERNMENT.md   audits/beta/deep/P6/screenshots
node audits/beta/deep/citation-audit.mjs audits/beta/deep/P7-CROSS-CUTTING.md audits/beta/deep/P7/screenshots
# every one exits 0
```

### Where everything is

| what | where |
|---|---|
| Phase artifacts | `audits/beta/deep/P{1..8}-*.md` |
| Screenshots, indexed and cross-checked | `audits/beta/deep/P{3..8}/screenshots/` + `screenshot-index.md` |
| Raw run logs (JSON per script) | `audits/beta/deep/P{1..8}/logs/` |
| Fail-first red/green outputs | `audits/beta/deep/P8/logs/D-*-RED.txt`, `D-*-GREEN.txt` |
| Control coverage tables | `audits/beta/deep/P{2..6}-coverage-table.md` |
| Import fixtures | `audits/beta/deep/fixtures/` |
| Downloaded exports | `audits/beta/deep/P5/downloads/`, `P6/downloads/` |
| Every probe script | `audits/beta/deep/p*.mjs` — all runnable, all idempotent |

---

## 7. Full defect ledger, this campaign

| id | severity | state | one line |
|---|---|---|---|
| D-19 | — | **unrepresentable** | one guardian per child, `NOT NULL` on `children.parentId` |
| D-20 | — | **unrepresentable** | one teacher per group, single `groups.teacherId` column |
| D-21…D-25 | mixed | open | reception portal (P2) |
| D-26 | degrades-use | **FIXED** | attendance had no lower date bound |
| D-27 | blocks-use | **FIXED** | overwrites falsely attributed, unaudited, absences cleared silently |
| D-28 | blocks-use | **FIXED** | `therapyType` meant three different things |
| D-29 | degrades-use | open | multi-group teacher labelled with one group's name |
| D-30 | degrades-use | open | same-named children indistinguishable (two portals) |
| D-31 | blocks-use | **FIXED** | teacher received the whole school's attendance |
| D-32 | degrades-use | open | `/rating` 411 px at 390 px, 4 of 5 criteria truncated |
| D-33 | cosmetic | open | `/therapy` 394 px at 390 px |
| D-34 | — | **withdrawn** | tab bar investigated, correct |
| D-35 | degrades-use | open | notifications never fed by journal, chat or attendance |
| D-36 | degrades-use | open | no in-app language switcher for parents |
| D-37 | degrades-use | **FIXED** | `logout` rendered as a raw key |
| D-38 | — | **withdrawn** | "Mening murojaatlarim" works |
| D-39 | — | **withdrawn** | partial-import Start exists behind a confirm step |
| D-40 | degrades-use | open | hardcoded English outside i18n in admin |
| D-41 | degrades-use | open | admin child page shows a raw UUID on refresh |
| D-42 | degrades-use | open | admin portal has no export |
| D-43 | blocks-use | **FIXED** | `/admin/therapy` dead on every load |
| D-44 | degrades-use | open | documented credentials do not work; migration asserts a wrong hash |
| D-45 | degrades-use | open | government CSV exports English headers and raw enums |
| D-46 | degrades-use | **FIXED** | offline/stale UI untranslated in all portals |
| D-47 | **blocks-use** | **FIXED** | cross-tenant read of child activity and meal records |
| D-48 | degrades-use | open | unlock endpoint reports success, does not unlock |
| D-49 | degrades-use | **FIXED** | no frontend i18n gate existed |
| D-50 | degrades-use | **partly fixed** | CI red on every commit; deploys ungated. Stale test fixed; dependency vulns and the missing gate remain |
| D-08 | degrades-use | open | backend application logs unreadable |
| X-01 | — | gating | media upload not exercised against production storage |

**Fixed this phase: 9.** All five blocks-use defects found in this campaign are closed and re-witnessed in production.
**Withdrawn after measurement: 3** — recorded rather than deleted, because a reader needs to know what was investigated and found sound.

---

## 8. Tenant state left behind

- **3 children** created by the P5 bulk import into `tmm3`, all `SIM-` prefixed, none deleted.
- **5 `import_jobs`** rows.
- Attendance rows written by P3's date battery and P8's D-27 verification, on one seeded child.
- One reception (`sh.umarova@tmm3.uz`) deleted and restored twice; present, `deletedAt` null.
- **Four government passwords reset** to the value `credentials.md` documents, and `mustChangePassword` cleared for `men@davlat.uz`.
- **One parent's `consentedAt` moved** from 2026-07-20 to 2026-08-14 as a consequence of exercising the consent lifecycle. Not reversible; disclosed.
- One seed child was temporarily repointed to a second parent to exercise the child switcher, and **restored with the original FK re-asserted** (`RESTORED == true`).

No row was hard-deleted. No schema was altered outside the additive error-code catalogue. No `DROP`, no `TRUNCATE` (L12).

---

*P8 closed. Two close conditions from earlier phases remain UNMET and are named as such. The campaign's measure was whether a stranger with these artifacts could reach the same conclusions alone — §6 is the answer to that, and it is meant to be run, not read.*
