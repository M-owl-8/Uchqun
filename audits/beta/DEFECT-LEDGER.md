# Uchqun — Defect Ledger

**THE SINGLE AUTHORITATIVE DEFECT LEDGER.** Established by Campaign II, P1
(`audits/beta/deep2/P1-CONSOLIDATION.md`). Any other list of defects in this
repository is historical and must not be treated as current.

**Last re-derived:** 2026-08-15 · Campaign II P9 · from HEAD `028ef934`
**Score:** 7.4 / 10 at close of CONSOLIDATION II — see `deep2/P9-CLOSEOUT.md` §3 (5.5 at start).

**Numbering:** ids are permanent and never reused. New defects continue from D-70.

| id | severity | status | one line | authoritative artifact |
|---|---|---|---|---|
| D-01 | blocks-use | **FIXED** `899006ac` | attendance grid offered the whole school; a refused row reported as saved | `deep/P3-TEACHER.md` §5 |
| D-02 | blocks-use | **FIXED** `bcd1fb58`, `487587e3` | no school could be onboarded — account creation broken across roles | `rerun-2026-08-14/` |
| D-03 | blocks-use | **FIXED** `22fc6b37` | parent shown attendance on the wrong calendar date | `deep/P3-TEACHER.md` §3 |
| D-04 | blocks-use | **FIXED** `f69964e6` | government reply dead-ended, never reached the school | `rerun-2026-08-14/` |
| D-05 | degrades-use | **FIXED** `452e88d0` | audit-log date column empty | `deep/P6-GOVERNMENT.md` §4 |
| D-06 | degrades-use | **PARTIAL** `7028767a` | document-upload error path: user string fixed, throw site unknown (blocked by D-08) | `rerun-2026-08-14/` |
| D-07 | degrades-use | **FIXED** `ec8ed394`, `03906f24` | teacher dashboard showed a placeholder attendance figure | `deep/P3-TEACHER.md` §5 |
| D-08 | degrades-use | **FIXED** `56d08287` | the logger emitted NOTHING — PII redaction dropped winston's Symbol(message), so every transport discarded every line. Not a Railway problem. | `deep2/P4-OBSERVABILITY.md` §1 |
| D-09 | degrades-use | **FIXED** `6b3a210f` | Reja tab bar missing Taomlar | `deep/P3-TEACHER.md` §5 |
| D-10 | degrades-use | **FIXED** `6b3a210f` | admin/government navigation sections missing | `rerun-2026-08-14/` |
| D-11 | degrades-use | **FIXED** `21ee564e` | parent–teacher rating had no assigned teacher | `deep/P4-PARENT.md` §5 |
| D-12 | degrades-use | **FIXED** | group label rendered as empty quotes | `deep/P3-TEACHER.md` §5 |
| D-13 | cosmetic | **FIXED** | change-password copy | `deep/P3-TEACHER.md` §5 |
| D-14 | cosmetic | **WITHDRAWN** | no longer reproduces on any portal; the retired Google font file was corrected upstream — not fixed by this repository | `deep2/P7-FIXES.md` §6 |
| D-15 | cosmetic | **FIXED** | teacher-form domain chip | `rerun-2026-08-14/` |
| D-16 | degrades-use | **OPEN** | reception cannot create a reception peer — four routes enumerated at runtime, `anyControl: 0`. May be intentional under the role hierarchy; never decided | `deep/P2-RECEPTION.md` |
| D-17 | degrades-use | **OPEN** | creating a reception says `Qabul akkaunti yaratildi` and nothing about the account being unable to log in; the new user's first login then fails with no indication of who must act | `deep/P2-RECEPTION.md` |
| D-18 | — | **VOID** | no artifact in either campaign defines this id; carried forward as a row with no content, and recorded as void rather than left as "see artifact" | — |
| D-19 | — | **UNREPRESENTABLE** | one guardian per child — `children.parentId` is a single `NOT NULL` uuid | `deep/P4-PARENT.md` §7 |
| D-20 | — | **UNREPRESENTABLE** | one teacher per group — single `groups.teacherId` column | `deep/P1-SEED.md` |
| D-21 | degrades-use | **FIXED** `b9f52a01` | create-teacher showed a bare "Validation failed" and discarded details[] | `deep2/P7-FIXES.md` §1 |
| D-22 | blocks-use | **FIXED** `f243d21a` | the draft-resume button shared the wizard's words and enrolled a child under a guardian never entered | `deep2/P7-FIXES.md` §5 |
| D-23 | degrades-use | **FIXED** `f243d21a` | a blank required step advanced and was ticked green | `deep2/P7-FIXES.md` §5 |
| D-24 | degrades-use | **FIXED** `f243d21a` | browser Back left the wizard and discarded everything | `deep2/P7-FIXES.md` §5 |
| D-25 | blocks-use (touch) | **FIXED** `dffa22a0` | the parent action menu was hover-only, unreachable on any touch device | `deep2/P7-FIXES.md` §1 |
| D-26 | degrades-use | **FIXED** `6727bc27` | attendance had no lower date bound | `deep/P8-CLOSEOUT.md` §1 |
| D-27 | blocks-use | **FIXED** `6727bc27`, `ed2579f7` | overwrites falsely attributed, unaudited; cleared absences silent | `deep/P8-CLOSEOUT.md` §1 |
| D-28 | blocks-use | **FIXED** `6727bc27` | `therapyType` meant three different things | `deep/P8-CLOSEOUT.md` §1 |
| D-29 | degrades-use | **FIXED** `ebc8591f` | the group label names every group shown, not the first child's | `deep2/P7-FIXES.md` §1 |
| D-30 | degrades-use | **FIXED** `186116cf` | same-named children carry a birth year on the card and in the accessible name | `deep2/P7-FIXES.md` §1 |
| D-31 | blocks-use | **FIXED** `6727bc27` | teacher received the whole school's attendance | `deep/P8-CLOSEOUT.md` §1 |
| D-32 | degrades-use | **FIXED** `240c75b1`,`bc59ff6e` | `/rating` 411px with 4 of 5 criteria truncated — two separate causes | `deep2/P5-UI.md` §2 |
| D-33 | cosmetic | **FIXED** `9f7c78ba` | `/therapy` 394px — non-wrapping filter row | `deep2/P5-UI.md` §2 |
| D-34 | — | **WITHDRAWN** | mobile tab bar investigated and found correct | `deep/P4-PARENT.md` §6 |
| D-35 | degrades-use | **PARTIALLY FIXED** `b36c5ca1` | attendance and journal now notify; chat deliberately not wired | `deep2/P7-FIXES.md` §12 |
| D-36 | degrades-use | **FIXED** `3f5fb5e1` | the parent portal has a language switcher | `deep2/P7-FIXES.md` §1 |
| D-37 | degrades-use | **FIXED** `6727bc27` | `logout` rendered as a raw i18n key | `deep/P8-CLOSEOUT.md` §1 |
| D-38 | — | **WITHDRAWN** | "Mening murojaatlarim" investigated and found working | `deep/P4-PARENT.md` §6 |
| D-39 | — | **WITHDRAWN** | partial-import Start exists behind a confirm step | `deep/P5-ADMIN.md` §6 |
| D-40 | degrades-use | **FIXED** `a4f6ae2d` | admin hardcoded English literals routed through i18n | `deep2/P7-FIXES.md` §1 |
| D-41 | degrades-use | **FIXED** `bfe33af8` | the admin child page fetches its child; no raw UUID in any state | `deep2/P7-FIXES.md` §8 |
| D-42 | degrades-use | **FIXED** `46e848ba` | /admin/parents exports CSV via a shared helper | `deep2/P7-FIXES.md` §1 |
| D-43 | blocks-use | **FIXED** `6727bc27` | `/admin/therapy` dead on every load | `deep/P8-CLOSEOUT.md` §1 |
| D-44 | — | **WITHDRAWN** — see below | claimed the documented credentials do not work | `deep2/P1-CONSOLIDATION.md` §3 |
| D-45 | degrades-use | **FIXED** `59c304e0` | the government schools CSV header is Uzbek | `deep2/P7-FIXES.md` §1 |
| D-46 | degrades-use | **FIXED** `6727bc27` | offline/stale UI untranslated in all portals | `deep/P8-CLOSEOUT.md` §1 |
| D-47 | blocks-use | **FIXED** `6727bc27` | cross-tenant read of child activity and meal records | `deep/P8-CLOSEOUT.md` §1 |
| D-48 | degrades-use | **FIXED** `e81d1291` | unlock cleared one of three rate-limit buckets; now resets the per-email limiter too | `deep2/P4-OBSERVABILITY.md` §3 |
| D-49 | degrades-use | **FIXED** `6727bc27` | no frontend i18n gate existed | `deep/P8-CLOSEOUT.md` §1 |
| D-50 | blocks-trust | **FIXED** `b77f01a2`, `b6a99aa1` | CI was red on every commit and deploys were ungated; CI is now green and required, and the deploy is gated on it — proven blocked and allowed | `deep2/P8-GATES.md` §2 |
| D-51 | blocks-use | **FIXED** `bb3e8f61` | the export selected `telegramUsername`, a column that exists nowhere; verified working, 67,561 bytes | `deep2/P4-OBSERVABILITY.md` §3 |
| D-52 | degrades-use | **FIXED** `aa24648a` | a rejected document can be approved on review; no path back to pending (P7 §7) | `deep2/P7-FIXES.md` §7 |
| D-53 | blocks-use | **FIXED** `fdc57107` | `/service-plans` had no access check; `/therapy/usage` let childId overwrite the school scope and left `where` empty for reception and government | `deep2/P3-ISOLATION.md` §4 |
| D-54 | blocks-use | **FIXED** `fd5c2aee` | `validateChildAccess` skipped its scope check for any user without a schoolId, admitting every government account to every child in the country | `deep2/P3-ISOLATION.md` §5 |
| D-55 | degrades-use | **FIXED** `44846072`, `7f57c18f`, `b2b4ee4f` | deep links survive login in all four portals — the fourth was found by the witness | `deep2/P7-FIXES.md` §4 |
| D-56 | blocks-use | **FIXED** `9f7c78ba` | `/child` rendered 720px wide on a 390px phone — a `<select>` sized by option text carrying the school name | `deep2/P5-UI.md` §2 |
| D-57 | cosmetic | **FIXED** `af07912c` | the teacher's name truncated on every activity card at 1440px | `deep2/P5-UI.md` §2 |
| D-58 | degrades-use | **FIXED** `92d16c82` | `admin/src/i18n.js:30` fell back to English while the three other portals fell back to Uzbek | `deep2/P6-I18N.md` §3 |
| D-59 | blocks-trust | **FIXED** `25fac0d7` | teacher vitest silently ran 11–12 of 19 test files and exited 0 — 56 tests never ran while the suite reported green | `deep2/P7-FIXES.md` §2 |
| D-60 | blocks-trust | **FIXED** `6f6a6c39` | an approved identification document could never be revoked — a reception approved in error kept access permanently | `deep2/P7-FIXES.md` §7 |
| D-61 | blocks-trust | **FIXED** `cc9467e2` | `getMealPlans` read any child's meal plans for any role with no access check at all | `deep2/P8-GATES.md` |
| D-62 | blocks-trust | **FIXED** `cc9467e2` | `createTherapy` wrote a TherapyUsage row against a child in another school — a cross-tenant WRITE | `deep2/P8-GATES.md` |
| D-63 | latent | **FIXED** `cc9467e2` | `startTherapy`'s "Admin can access any child" branch — UNREACHABLE behind `requireRole('parent','teacher')`; fix retained as defence in depth. Campaign II described it as live; that was wrong | `deep3/P1-DISCLOSURE.md` §1.1 |
| D-64 | blocks-trust | **FIXED** `cc9467e2` | `getMonitoringByChild` let **admin and reception** (not government — `requireTeacher` excludes it) read any school's emotional-monitoring records | `deep3/P1-DISCLOSURE.md` §1.1 |
| D-65 | blocks-trust | **FIXED** `34663c38` | the database could not be rebuilt from migrations; now proven to reproduce production EXACTLY by schema diff (1859 = 1859), not by absence of a crash | `deep3/P2-SCHEMA.md` §4 |
| D-66 | degrades-use | **FIXED** `a25a9b9e` | both commit hooks were broken: lint-staged mis-scoped eslint so migrations could never lint, and commit-msg demanded an id from a file that does not exist | `deep2/P8-GATES.md` |
| D-67 | blocks-trust | **FIXED** `1b1df13c` | CI ran PostgreSQL 15 against a production running 18.4 — three major versions, in the two jobs meant to prove production behaviour | `deep3/P2-SCHEMA.md` §2 |
| D-68 | blocks-trust | **OPEN** | Railway's GitHub integration deploys every push independently of GitHub Actions — the Campaign II deploy gate has never gated production | `deep3/P2-SCHEMA.md` §8 |
| D-69 | degrades-trust | **FIXED** `185f33a3` | the P3 isolation lane could not detect a cross-tenant WRITE — a 2xx with a clean body concealed a TherapyUsage row created against another school's child | `deep3/P3-INTEGRATION.md` §4 |
| X-01 | — | **GATING** | media upload not exercised against production storage | `deep/P1-SEED.md` |

## D-44 — WITHDRAWN, and the damage it caused

Campaign I P6 recorded that `credentials.md` and migration
`20260608000001-reset-beta-test-account-passwords.js` both document `Test@2026`
for the government accounts, and that the stored hash rejected it.

**The documentation was correct. The defect was not.**

```
$ node -e "bcrypt.compare('Test@2026', '$2b$10$.ovwHitQ4P/HBG4RmhrYR.LRGIrOGlFaCtM.d9Gi.yXuCZ0q6KyTO')"
Test@2026          true
Test@2025          false
Government@2026    false
NewPass@2026       false
```

The documented hash **is** `Test@2026`. The P6 probe sent `PW` from the test
harness, which is `Uchqun@2026` — the password the Campaign I P1 seed set on the
accounts *it* created (`direktor@tmm3.uz`, `tarbiyachi1@tmm3.uz`, …). The
government accounts are pre-existing seed-02 accounts and were never touched by
that seed. Two account families, two passwords, one assumption.

**Consequence:** acting on the false finding, P6 overwrote all four government
account passwords with a hash of `Uchqun@2026`, moving them *away* from what
`credentials.md` documents. From that point the documentation genuinely was
wrong — because the campaign had made it so.

**Repaired** in Campaign II P1. All four restored to the documented hash and
verified by live login:

```
200 gov.republic@uchqun.uz     Test@2026
200 gov.toshkent@uchqun.uz     Test@2026
200 gov.samarqand@uchqun.uz    Test@2026
200 men@davlat.uz              Test@2026
200 direktor@tmm3.uz           Uchqun@2026
```

`men@davlat.uz`'s original hash (`$2b$10$lgpz6nZdk2s9z…`) was overwritten before
being captured in full and is unrecoverable; it now carries the documented
`Test@2026` hash, which is the estate convention. Its `mustChangePassword` flag
was also cleared in P6 and has not been restored.

The harness now resolves the password per account family
(`pwFor()` in `audits/beta/deep2/lib.mjs`) so the conflation cannot recur.
