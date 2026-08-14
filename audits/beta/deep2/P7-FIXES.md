# P7 — Triage, fix, re-witness

**Campaign:** CONSOLIDATION AND HARDENING II · phase 7 of 9
**Date:** 2026-08-14 · **HEAD at phase start:** `44846072` · **HEAD at phase end:** `46e848ba`
**Artifacts:** `P7/screenshots/` (85 files, **0 orphans**) · `P7/downloads/` · `P7/logs/` · `screenshot-index.md`
**Scripts:** `p7-witness.mjs` · `p7-witness2.mjs` · `p7-witness3.mjs` · `p7-d21-witness.mjs` · `p7-d14.mjs` · `p7-d14b.mjs` · `p7-d52-prod.mjs` · `p7-prod-verify.mjs` · `p7-d35-verify.mjs` · `p7-d35-witness.mjs`

---

## 1. What this phase closed

Sixteen defects, sixteen commits, every one re-witnessed on the **deployed** build
or, for backend paths, by **reading the row back from production**. The rule for
this phase was the brief's: *no screenshot → reported NOT FIXED*.

| id | severity | commit | witness |
|---|---|---|---|
| **D-59** | blocks-trust | `25fac0d7` | three runs, 19/19 files (was 11, 12, 11) |
| D-45 | degrades-use | `59c304e0` | `012_D-45_D-45-csv-downloaded.png` + the downloaded file |
| D-40 | degrades-use | `a4f6ae2d` | `015_D-40_D-40-bulk-import-labels.png` |
| D-36 | degrades-use | `3f5fb5e1` | `017_D-36_D-36-language-switcher.png` |
| D-55 | degrades-use | `44846072`, `7f57c18f`, `b2b4ee4f` | 4 screenshots, one per portal |
| D-21 | degrades-use | `b9f52a01` | `085_D-21c_D-21-toast-final.png` |
| D-25 | blocks-use (touch) | `dffa22a0` | `054_D-25_D-25-menu-open-after-touch-tap.png` |
| **D-22** | **blocks-use** | `f243d21a` | `071_D-22b_D-22-banner-names-the-guardian.png` |
| D-23 | degrades-use | `f243d21a` | `049_D-22_D-23-blank-step-refused.png` |
| D-24 | degrades-use | `f243d21a` | `050_D-22_D-24-back-walks-the-steps.png` |
| D-41 | degrades-use | `bfe33af8` | `041_D-41_D-41-child-detail-after-refresh.png` |
| D-52 | degrades-use | `aa24648a` | `039_D-52_…png` + the production row |
| D-29 | degrades-use | `ebc8591f` | `056_D-29_D-29-dashboard-names-both-groups.png` |
| D-30 | degrades-use | `186116cf` | `058_D-29_D-30-same-named-children-disambiguated.png` |
| **D-60** | **NEW, blocks-trust** | `6f6a6c39` | `042_D-60_…png` + the production row |
| D-35 | degrades-use | `b36c5ca1` | `045_D-35w_D-35-parent-sees-attendance-notification.png` |
| D-42 | degrades-use | `46e848ba` | `060_D-42_D-42-admin-export.png` + the downloaded file |
| D-14 | cosmetic | — | **resolved externally**, §6 |

---

## 2. D-59 — the green that was blind to a third of itself

The phase opened by noticing that a teacher suite run reported `Test Files 12
passed (12)` where an earlier run in the same phase had reported 19. Nineteen
test files exist on disk and nineteen match the default include pattern.

Three consecutive runs:

```
teacher test files on disk: 19
 Test Files  11 passed (11)
 Test Files  12 passed (12)
 Test Files  11 passed (11)
```

**All three exited 0. All three reported "passed".** Seven to eight files never
ran, and nothing in the output said so.

The cause was in the output all along, unread:

```
DEPRECATED  `test.poolOptions` was removed in Vitest 4.
⎯ Unhandled Errors ⎯
Vitest caught 7 unhandled errors during the test run.
This might cause false positive tests.
Error: [vitest-pool]: Failed to start threads worker for test files
       C:/work/Uchqun/teacher/src/__tests__/pages/ChildProfile.test.jsx.
```

`teacher/vite.config.js:61` carried `poolOptions: { threads: { maxThreads: 2 } }`.
Vitest 4 removed that option. The cap was therefore ignored, workers
over-subscribed, and the files whose workers failed to start were dropped from
the run — **not** counted as failures.

The compounding detail: **reception hit this exact deprecation in S30 and
migrated off it**, leaving a comment in its own config saying so. Nobody applied
the same knowledge to the teacher app. After the fix, three runs:

```
 Test Files  19 passed (19)     Tests  167 passed (167)
 Test Files  19 passed (19)     Tests  167 passed (167)
 Test Files  19 passed (19)     Tests  167 passed (167)
```

**56 tests — a third of the suite, covering both the teacher and parent
personas — were not running.** This is the L6 case in its purest form, and it
matters most for P8: a required CI gate standing on this suite would have gone
green while a third of it never executed.

The other three portals were checked against their own on-disk counts and
collect everything: admin 33/33, reception 9/9, government 17/17.

---

## 3. Two regressions I introduced, found because of D-59

Auditing every portal's suite surfaced a government failure I had caused and
pushed:

```
FAIL src/__tests__/Login.test.jsx
Error: [vitest] No "useLocation" export is defined on the "react-router-dom" mock.
 ❯ Login src/pages/Login.jsx:96:20
```

The D-55 fix (`44846072`) added `useLocation()` to the government Login; that
suite mocks `react-router-dom` with an explicit factory exporting only
`useNavigate`. **I pushed it without running that portal's suite.** Fixed in
`7f57c18f`. The same shape then recurred in the teacher app's
`ProtectedRoute.zombie.test.jsx` and was fixed in `b2b4ee4f` — there the mock's
`Navigate` was also taught to capture `state`, so the deep link being carried is
now asserted rather than merely not-crashing.

---

## 4. D-55 was three-quarters done and reported as done

The first witness pass is the reason this is in the report:

```
D-55-reception  requested /reception/parents   afterLogin /reception/parents   true
D-55-admin      requested /admin/receptions    afterLogin /admin/receptions    true
D-55-government requested /government/schools  afterLogin /government/schools  true
D-55-teacher    requested /teacher/bolalar     afterLogin /teacher             FALSE
```

I had edited three portals and not the fourth. The screenshot said so; the code
review had not.

The teacher app is the one that needed care, because a single Login screen serves
both teachers and parents. Restoring a stored `/teacher/*` path for a parent
would land them where `ProtectedRoute` immediately bounces them back to `/login`
— a redirect loop wearing a fix's clothes. `isTeacherPath`/`isParentPath` gate
it, and the test **evaluates those predicates** rather than trusting their names.

---

## 5. D-22 — the safeguarding defect

Two buttons on one screen read `Davom etish`. One advanced the wizard; the other
replaced everything the operator had typed with a saved draft. In production this
enrolled the child **Zilola Saidova** under `t.abandon@tmm3.uz` (Zuhra
Ibragimova) while the guardian actually entered, Nigora Saidova, was never
created. On a special-education platform, the wrong adult holding a child's
record is the worst thing in this ledger.

Fixed three ways, and witnessed on the deployed build:

```
buttonLabels        [... "Qoralamani tiklash", "Bekor qilish", "Orqaga",
                     "Saqlab chiqish", "Davom etish"]
davomEtishCount     1                      (was 2)
resumeLabel         "Qoralamani tiklash"
bannerText          "Saqlangan qoralama topildi. Davom etishni xohlaysizmi? |
                     Zuhra Ibragimova — Zilola Saidova | Qoralamani tiklash |
                     Bekor qilish"
```

The banner **names the guardian the draft belongs to**. The exact production
incident is now visible before it can be accepted: an operator who typed Nigora
Saidova sees the words *Zuhra Ibragimova* and stops.

Alongside it, D-23 (`Davom etish` on a blank step 1 advanced and ticked the step
green) now refuses and names what is missing —
`Quyidagi majburiy maydonlar to'ldirilmagan: Ism, Familiya, Email, Telefon, Parol`
with the header still reading `QADAM 1 / 3` — and D-24 (browser Back left the
wizard entirely) now walks the steps: `QADAM 2 / 3` → Back → `QADAM 1 / 3`,
`stayedInWizard: true`.

---

## 6. D-14 — withdrawn, and not by us

P5 witnessed the government portal 404ing on
`/s/geistmono/v6/or3NQ6H-…woff2` on every load. Re-measured this phase under the
same conditions — authenticated, cold context, all 12 government routes:

```
{ routesSwept: 12, totalFailures: 2, fontFailures: 0,
  otherSample: [401 /api/v1/auth/me, 401 /api/v1/auth/refresh] }
```

Zero font failures on all four portals. The witnessed URL still 404s when
requested directly (`curl -o /dev/null -w '%{http_code}'` → `404`) while the URL
Google's CSS serves today returns `200` — Google retired a file and has since
corrected what it references.

**Nothing in this repository changed.** D-14 is recorded as resolved externally,
not fixed, and the class of failure is unchanged: all four portals load fonts
from `fonts.googleapis.com`, so a third-party CDN rotating files or being
unreachable in-country breaks them again with no warning. For a government
platform that is also an availability and privacy consideration, and it is named
here rather than closed.

---

## 7. D-60 — a new defect, created by verifying another one

Having fixed D-52 (a rejected document could never be approved, so a reception
whose identification was mistakenly rejected was locked out permanently), I
proved it on production and then could not undo my own approval.

`rejectDocument` gated on `status !== 'pending'` exactly as `approveDocument`
did. **An approved document could never be rejected.** A reception approved on a
wrong, expired or forged identification kept full access to a child-welfare
platform permanently, with no revocation path anywhere in the product.

This is the more dangerous direction of the same one-way door: D-52 wrongly
*denied* access; D-60 wrongly *grants* it. Filed as a new defect and fixed in
`6f6a6c39`.

**Disclosure.** My D-52 verification changed production state: document
`5eed382e` went `pending → approved`, taking `qabul2@amm1.uz` to
`documentsApproved: true`. The D-60 fix let me revoke it, and the account is now
back to `documentsApproved: false, isActive: false`. The residual difference is
real and is stated rather than glossed: the document is now `rejected` where it
was originally `pending`, and **no path in the product returns a document to
pending**. That is a smaller version of the same one-way-door family, still open.

---

## 8. Every production write, read back (L13)

The brief's rule is that a response code is not evidence. Each of these returned
success; each was then verified in the database independently.

### D-52 / D-60 — the document

```
PUT /admin/documents/5eed382e-…/reject   → 200
PUT /admin/documents/5eed382e-…/approve  → 200
```

Read back:

```
 id       | status   | rejectionReason | reviewedBy | reviewedAt
 5eed382e | approved | None            | 5eed7a0e   | 2026-08-14 17:23:41.532+00

 action                    | actorRole | meta
 approve_after_rejection   | admin     | {previousRejectionReason: 'D-52 reversal probe'}
 reject                    | admin     | {rejectionReason: 'D-52 reversal probe'}
```

Then after the D-60 fix deployed:

```
 doc_status  docs_approved  is_active  last_audit
 rejected    False          False      reject_after_approval
```

The reversal works in both directions, the access follows the status, and both
transitions are on the record under their own action names.

### D-35 — the notification

```
POST /api/v1/attendance {childId: 5eed0c9a, date: 2026-08-09, status: absent}
→ 201 {"success":true,"data":{"saved":1,"skipped":0,"errors":[]}}
```

`201 saved:1` is **precisely the response D-27 gave while writing nothing**, so
it proves nothing. The row:

```
 type       | relatedType | title                      | message               | userId
 attendance | attendance  | Bolangiz bugun kelmadi     | Gulnoza: 2026-08-09   | 5eed7bf3

 notified_user     actual_parent
 otaona11@tmm3.uz  otaona11@tmm3.uz
```

And the L2 witness — the parent's own rendered page, cold, on the deployed build:

```
Bildirishnomalar(1) | Hammasi (1) | O'qilmagan (1) | O'qilgan (0)
Bolangiz bugun kelmadi | Gulnoza: 2026-08-09 | Gulnoza Ergasheva | 2026 M08 14 22:37 | Yangi
```

It previously read `Bildirishnomalar(0)` and `Hozircha bildirishnoma yo'q`.

### D-41 — the child endpoint

```
GET /admin/children/5eed0c9a-… → 200
{"success":true,"data":{"id":"5eed0c9a-…","firstName":"Gulnoza","lastName":"Ergasheva",
 "dateOfBirth":"2018-02-22","gender":"Female","disabilityType":"Autizm spektri buzilishi",…}}
```

Cold direct link to `/admin/children/<uuid>`, which is the exact case that
failed: `heading: "Gulnoza Ergasheva"`, `showsRawUuid: false`. It previously
rendered `Child 0047fff7-b7f2-400c-aacc-f380a4b4dd31`.

---

## 9. The trap D-35 nearly shipped with

`notifications.type` and `notifications.relatedType` are **separate PostgreSQL
enums with different value sets**:

```
enum_notifications_type          activity, meal, media, progress, general
enum_notifications_relatedType   activity, meal, media, progress
```

The first version of the fix added `attendance` and `journal` to `type` alone.
**Every unit test passed** — they assert on the arguments handed to
`createNotification` — and on production every insert would have failed on
`relatedType`. `createNotification` swallows its own errors, so the notification
centre would have stayed empty while the suite stayed green.

That is the D-27 pattern verbatim: a success response, a passing test, nothing
written. It was caught by querying the live schema before trusting the model, as
`CLAUDE.md` requires. Both enums are now covered, and a test asserts they stay in
step.

A second silent failure in the same commit: the migration was first written with
`module.exports` in an ESM package, which loads as an empty object — sequelize
would have run a migration that did nothing. Corrected to `export default` and
verified to load. Confirmed on production:

```
enum_notifications_type          activity, meal, media, progress, general, attendance, journal
enum_notifications_relatedType   activity, meal, media, progress, attendance, journal
```

---

## 10. Fail-first evidence (L11)

Every test was shown red against unfixed code and green against fixed code.

| test file | RED | GREEN |
|---|---|---|
| `reception/…/wizardIntegrity.test.jsx` | `Tests 16 failed (16)` | `Tests 16 passed (16)` |
| `teacher/…/deepLinkPersona.test.jsx` | `Tests 5 failed (5)` | `Tests 5 passed (5)` |
| `backend/…/getChildForAdmin.test.js` | `Tests 8 failed, 8 total` | `Tests 8 passed, 8 total` |
| `backend/…/approveAfterRejection.test.js` (D-52) | `3 failed, 3 passed, 6 total` | `6 passed, 6 total` |
| `backend/…/approveAfterRejection.test.js` (D-60) | `3 failed, 9 passed, 12 total` | `12 passed, 12 total` |
| `teacher/…/groupAndNameClarity.test.jsx` | `6 failed \| 4 passed (10)` | `10 passed (10)` |
| `backend/…/attendanceNotification.test.js` | `5 failed, 3 passed, 8 total` | `8 passed, 8 total` |
| `admin/…/exportCsv.test.js` | module does not resolve | `Tests 8 passed (8)` |

The green-in-RED counts are not weakness — they are the unchanged-behaviour
guards (a plain pending approval, an already-approved refusal, the ownership
boundary, a single group, a non-colliding name, an unparseable date of birth).
Passing before and after is the correct result for those.

**Three RED runs were wrong first and are recorded as such:**

1. `groupAndNameClarity` first "went red" because `git stash push` silently
   ignored the untracked `groupSummary.js`, so the failure was a missing module.
   Re-established by restoring the original `AttendanceGrid` **and** stubbing
   `groupSummary` to the old `children[0].groupName` behaviour, so the failures
   are the old behaviour being wrong.
2. `wizardIntegrity`'s D-25 assertion anchored on `MoreHorizontal`, which matched
   the **lucide-react import** rather than the JSX element. Corrected to
   `<MoreHorizontal` and re-proven red.
3. `deepLinkPersona` extracted the persona predicates with a `;\n` anchor. The
   working tree is CRLF, so the match ran past the intended statement. Corrected
   to `;\r?\n`.

`exportCsv`'s RED is a missing module, and that is honest here rather than sloppy:
D-42's defect *was* the absence of any export.

---

## 11. Harness errors, disclosed

Four probes failed for reasons that were mine, not the product's. Each is
recorded because each nearly became a false finding.

| probe | what went wrong | correction |
|---|---|---|
| D-35 mark-absent | `401 No token provided` against the absolute API origin | the **teacher** portal proxies `/api/v1`; use the relative path |
| D-21 API | `200` returning `<!doctype html>` | the **reception** portal does **not** proxy; use the absolute origin. The two portals are opposite, which is how this was got wrong twice |
| D-22 draft seed | banner showed an unrelated draft | the app keys on `wizard:parent:<user.id>:draft` and reception stores its user under `reception_accessToken_user`, not `user` |
| D-21 create form | four runs captured no request at all | `/Qo'sh\|Yangi/` matched **`Yangilash`** (update) before `Tarbiyachi qo'shish`, and later an empty `required` field blocked native submit |

Every probe was checked against production afterwards: no stray accounts were
created. `SELECT … WHERE email ILIKE '%probe%' …` returns **0 rows** — the
weak-password rejections were all correct.

---

## 12. Deliberate limits

Stated rather than left to be discovered.

- **D-35 is reduced in scope, not closed.** Attendance and journal are wired.
  **Chat is not.** One notification per chat message is a product decision about
  volume, and guessing at it would be worse than leaving it. `'present'` also
  notifies nobody by design: attendance is marked in bulk for every child every
  day, so notifying on `present` would bury the message that matters.
- **D-21 names the field but in English.** The toast now reads
  `password: password must be at least 8 characters · password: password must
  contain at least one uppercase letter…` — a large improvement on the bare,
  content-free `Validation failed`, but `details[]` comes from the backend in
  English and is not localised. The defect as filed is closed; the localisation
  is not.
- **D-42 covers `/admin/parents` only.** Teachers, groups and ratings have no
  export. The shared helper now exists, so adding them is small — but it was not
  done, and this is not a claim that the admin portal now exports everything.
- **D-52's residual**, per §7: no path returns a document to `pending`.
- **One production row was written for evidence** and is disclosed: attendance
  `absent` for child `5eed0c9a` on `2026-08-09`, inside the `5eed` seed scope
  (L12). No production data was deleted at any point in this phase.

---

## 13. Gate state at phase end

```
backend        158 suites / 1621 tests passing      lint clean
teacher         21 files  /  182 tests passing      lint clean   build OK
admin           34 files  /  182 tests passing      lint clean   build OK
reception       10 files  /  100 tests passing      lint clean   build OK
government      17 files  /  124 tests passing      lint clean   build OK
backend i18n    255 codes, all three languages match
frontend i18n   0 raw keys, 47 English fallbacks
```

The frontend i18n gate caught **my own** new fallbacks twice during this phase —
47 → 48 on D-25, 47 → 52 on D-42 — and both were driven back to 47 before
commit. A gate that only ever reports other people's regressions is not being
tested.

---

## 14. Per L6 — what these greens are blind to

- **The suites now run every file. They do not run every path.** D-59 fixed
  collection, not coverage. Nothing here measures how much of the estate those
  182 teacher tests touch.
- **Most of this phase's frontend tests assert on source text**, not on rendered
  behaviour. `wizardIntegrity` proves `handleNext` calls `validateStep` before
  `setStep`; it does not prove the wizard behaves correctly for a user. The
  deployed-build screenshots are what carry that, and they cover one path each.
- **The D-30 fix keys on a name collision inside the list being rendered.** Two
  same-named children in *different* groups shown on *different* screens are
  still identical, because neither list can see the other.
- **`approve_after_rejection` and `reject_after_approval` are written to the
  audit log, which no UI surfaces.** The reversal is recorded and legible to
  someone querying the database. To a director in the product, it is invisible —
  the same gap P5 recorded for concurrent attendance writes.
- **The production verifications are single-shot.** Each write was confirmed
  once. Nothing here proves these paths hold under concurrency, and P5's
  concurrency work did not cover any of them.

---

## 15. Citation audit (L4)

Every screenshot cited above was checked against the phase's own index.

```
$ node -e "import('./audits/beta/deep2/lib.mjs').then(m=>{const P=m.phase('P7');console.log(JSON.stringify(m.writeIndex(P)))})"
{"indexed":85,"files":85,"orphans":[]}
```

85 screenshots on disk, 85 indexed, **0 orphans**. Every file named in this
document exists in `P7/screenshots/`; every screenshot taken is indexed with its
role, viewport, action and path.

Downloads opened and parsed rather than cited by name:
`P7/downloads/schools-2026-08-14.csv` (header now Uzbek) and
`P7/downloads/ota-onalar-2026-08-14.csv` (64 lines, BOM present, header
`"Ism","Familiya","Email","Telefon","Bolalar","Holat"`).

---

## 16. Close conditions

| # | condition | verdict | basis |
|---|---|---|---|
| C1 | every open ledger defect triaged | **MET** | 17 addressed; D-14 withdrawn with measurement (§6) |
| C2 | one commit per defect | **MET, one stated deviation** | 16 commits; D-22/D-23/D-24 share one because they share `liveFormHasData` and interleave in one file — declared in the commit message, not hidden |
| C3 | every fix re-witnessed on the deployed build | **MET** | §1 table; 85 screenshots, 0 orphans |
| C4 | every write confirmed by reading production back | **MET** | §8 — three write paths, each read back from the database, plus the audit rows |
| C5 | fail-first for every test | **MET** | §10, including three RED runs that were wrong first and were re-established |

---

## 17. Defect ledger delta

| id | severity | status | one line |
|---|---|---|---|
| **D-59** | blocks-trust | **FIXED** `25fac0d7` | teacher vitest silently ran 11–12 of 19 files and exited 0 — a third of the suite never ran |
| **D-60** | blocks-trust | **FIXED** `6f6a6c39` | an approved identification document could never be revoked; found while verifying D-52 |
| D-21 | degrades-use | **FIXED** `b9f52a01` | validation rejection now names the field and quotes the rule (in English — §12) |
| D-22 | blocks-use | **FIXED** `f243d21a` | the draft-resume button no longer shares the wizard's words, confirms, and names the guardian |
| D-23 | degrades-use | **FIXED** `f243d21a` | a blank required step no longer advances and ticks green |
| D-24 | degrades-use | **FIXED** `f243d21a` | browser Back walks the wizard steps instead of discarding everything |
| D-25 | blocks-use (touch) | **FIXED** `dffa22a0` | the parent action menu opens on tap, click and keyboard focus |
| D-29 | degrades-use | **FIXED** `ebc8591f` | the group label names every group shown, not the first child's |
| D-30 | degrades-use | **FIXED** `186116cf` | same-named children carry a birth year, on the card and in the accessible name |
| D-35 | degrades-use | **PARTIALLY FIXED** `b36c5ca1` | attendance and journal now notify; **chat deliberately not wired** |
| D-36 | degrades-use | **FIXED** `3f5fb5e1` | the parent portal has a language switcher |
| D-40 | degrades-use | **FIXED** `a4f6ae2d` | admin English literals routed through i18n |
| D-41 | degrades-use | **FIXED** `bfe33af8` | the admin child page fetches its child; no raw UUID in any state |
| D-42 | degrades-use | **FIXED** `46e848ba` | `/admin/parents` exports CSV via a shared helper |
| D-45 | degrades-use | **FIXED** `59c304e0` | the government schools CSV header is Uzbek |
| D-52 | degrades-use | **FIXED** `aa24648a` | a rejected document can be approved on review |
| D-55 | degrades-use | **FIXED** `44846072`, `7f57c18f`, `b2b4ee4f` | deep links survive login in all **four** portals — the fourth was found by the witness |
| D-14 | cosmetic | **WITHDRAWN** | no longer reproduces; resolved by Google, not by this repository (§6) |

---

## 18. Scope extensions (L10)

| what | why unavoidable | commit |
|---|---|---|
| `GET /admin/children/:id` — a new backend endpoint | D-41 is a UI defect with no endpoint to fix it against; the page had nothing to fetch from | `bfe33af8` |
| Migration `20260814000001` — two enum values | D-35 cannot store an attendance or journal notification without them | `b36c5ca1` |
| `shared/utils/exportCsv.js` — a new shared module | D-42 needed an export; a third copy of logic that had **already drifted** (D-45) would have been the defect again | `46e848ba` |
| `backend/__tests__/i18n.test.js` — `EXPECTED_CODE_COUNT` 253 → 255 | the catalogue gate is count-pinned and two codes were added for D-41 | `bfe33af8` |
| `government/…/Login.test.jsx`, `teacher/…/ProtectedRoute.zombie.test.jsx` | repairing regressions **I** introduced in D-55 (§3) | `7f57c18f`, `b2b4ee4f` |
