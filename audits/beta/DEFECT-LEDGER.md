# Uchqun — Defect Ledger

**THE SINGLE AUTHORITATIVE DEFECT LEDGER.** Established by Campaign II, P1
(`audits/beta/deep2/P1-CONSOLIDATION.md`). Any other list of defects in this
repository is historical and must not be treated as current.

**Last re-derived:** 2026-08-14 · Campaign II P1 · from HEAD `3d780e33`
**Numbering:** ids are permanent and never reused. New defects continue from D-55.

| id | severity | status | one line | authoritative artifact |
|---|---|---|---|---|
| D-01 | blocks-use | **FIXED** `899006ac` | attendance grid offered the whole school; a refused row reported as saved | `deep/P3-TEACHER.md` §5 |
| D-02 | blocks-use | **FIXED** `bcd1fb58`, `487587e3` | no school could be onboarded — account creation broken across roles | `rerun-2026-08-14/` |
| D-03 | blocks-use | **FIXED** `22fc6b37` | parent shown attendance on the wrong calendar date | `deep/P3-TEACHER.md` §3 |
| D-04 | blocks-use | **FIXED** `f69964e6` | government reply dead-ended, never reached the school | `rerun-2026-08-14/` |
| D-05 | degrades-use | **FIXED** `452e88d0` | audit-log date column empty | `deep/P6-GOVERNMENT.md` §4 |
| D-06 | degrades-use | **PARTIAL** `7028767a` | document-upload error path: user string fixed, throw site unknown (blocked by D-08) | `rerun-2026-08-14/` |
| D-07 | degrades-use | **FIXED** `ec8ed394`, `03906f24` | teacher dashboard showed a placeholder attendance figure | `deep/P3-TEACHER.md` §5 |
| D-08 | degrades-use | **OPEN** | backend application logs unretrievable; blocks diagnosis of D-06 and D-48 | `deep/P7-CROSS-CUTTING.md` §4 |
| D-09 | degrades-use | **FIXED** `6b3a210f` | Reja tab bar missing Taomlar | `deep/P3-TEACHER.md` §5 |
| D-10 | degrades-use | **FIXED** `6b3a210f` | admin/government navigation sections missing | `rerun-2026-08-14/` |
| D-11 | degrades-use | **FIXED** `21ee564e` | parent–teacher rating had no assigned teacher | `deep/P4-PARENT.md` §5 |
| D-12 | degrades-use | **FIXED** | group label rendered as empty quotes | `deep/P3-TEACHER.md` §5 |
| D-13 | cosmetic | **FIXED** | change-password copy | `deep/P3-TEACHER.md` §5 |
| D-14 | cosmetic | **NOT CLAIMED** | font 404s — never proven fixed | `fullrun-2026-08-14/` |
| D-15 | cosmetic | **FIXED** | teacher-form domain chip | `rerun-2026-08-14/` |
| D-16 | — | confirmed | reception portal finding | `deep/P2-RECEPTION.md` |
| D-17 | — | corrected | reception portal finding | `deep/P2-RECEPTION.md` |
| D-18 | — | see artifact | | `deep/P2-RECEPTION.md` |
| D-19 | — | **UNREPRESENTABLE** | one guardian per child — `children.parentId` is a single `NOT NULL` uuid | `deep/P4-PARENT.md` §7 |
| D-20 | — | **UNREPRESENTABLE** | one teacher per group — single `groups.teacherId` column | `deep/P1-SEED.md` |
| D-21…D-25 | mixed | **OPEN** | reception portal defects | `deep/P2-RECEPTION.md` |
| D-26 | degrades-use | **FIXED** `6727bc27` | attendance had no lower date bound | `deep/P8-CLOSEOUT.md` §1 |
| D-27 | blocks-use | **FIXED** `6727bc27`, `ed2579f7` | overwrites falsely attributed, unaudited; cleared absences silent | `deep/P8-CLOSEOUT.md` §1 |
| D-28 | blocks-use | **FIXED** `6727bc27` | `therapyType` meant three different things | `deep/P8-CLOSEOUT.md` §1 |
| D-29 | degrades-use | **OPEN** | multi-group teacher labelled with one group's name | `deep/P3-TEACHER.md` §4 |
| D-30 | degrades-use | **OPEN** | same-named children indistinguishable (teacher grid + admin IRR) | `deep/P3-TEACHER.md` §4 |
| D-31 | blocks-use | **FIXED** `6727bc27` | teacher received the whole school's attendance | `deep/P8-CLOSEOUT.md` §1 |
| D-32 | degrades-use | **OPEN** | `/rating` 411 px at a 390 px viewport; 4 of 5 criteria truncated | `deep/P4-PARENT.md` §3 |
| D-33 | cosmetic | **OPEN** | `/therapy` 394 px at a 390 px viewport | `deep/P4-PARENT.md` §3 |
| D-34 | — | **WITHDRAWN** | mobile tab bar investigated and found correct | `deep/P4-PARENT.md` §6 |
| D-35 | degrades-use | **OPEN** | notifications never fed by journal, chat or attendance events | `deep/P4-PARENT.md` §4 |
| D-36 | degrades-use | **OPEN** | no in-app language switcher for parents | `deep/P4-PARENT.md` §4 |
| D-37 | degrades-use | **FIXED** `6727bc27` | `logout` rendered as a raw i18n key | `deep/P8-CLOSEOUT.md` §1 |
| D-38 | — | **WITHDRAWN** | "Mening murojaatlarim" investigated and found working | `deep/P4-PARENT.md` §6 |
| D-39 | — | **WITHDRAWN** | partial-import Start exists behind a confirm step | `deep/P5-ADMIN.md` §6 |
| D-40 | degrades-use | **OPEN** | hardcoded English outside i18n in admin | `deep/P5-ADMIN.md` §4 |
| D-41 | degrades-use | **OPEN** | admin child page shows a raw UUID on refresh | `deep/P5-ADMIN.md` §4 |
| D-42 | degrades-use | **OPEN** | admin portal has no data export | `deep/P5-ADMIN.md` §4 |
| D-43 | blocks-use | **FIXED** `6727bc27` | `/admin/therapy` dead on every load | `deep/P8-CLOSEOUT.md` §1 |
| D-44 | — | **WITHDRAWN** — see below | claimed the documented credentials do not work | `deep2/P1-CONSOLIDATION.md` §3 |
| D-45 | degrades-use | **OPEN** | government CSV exports English headers and raw enums | `deep/P6-GOVERNMENT.md` §3 |
| D-46 | degrades-use | **FIXED** `6727bc27` | offline/stale UI untranslated in all portals | `deep/P8-CLOSEOUT.md` §1 |
| D-47 | blocks-use | **FIXED** `6727bc27` | cross-tenant read of child activity and meal records | `deep/P8-CLOSEOUT.md` §1 |
| D-48 | degrades-use | **OPEN** | unlock endpoint reports success, does not unlock | `deep/P7-CROSS-CUTTING.md` §3 |
| D-49 | degrades-use | **FIXED** `6727bc27` | no frontend i18n gate existed | `deep/P8-CLOSEOUT.md` §1 |
| D-50 | degrades-use | **PARTIAL** `5c52885d` | CI red on every commit; deploys ungated. Stale test fixed; dependency vulns and the missing gate remain | `deep/P8-CLOSEOUT.md` §2 |
| D-51 | blocks-use | **OPEN** | `GET /parent/me/export` returns 500 on every parent tested; the right-of-access export has never succeeded in production | `deep2/P2-AUDIT-INTEGRITY.md` §4 |
| D-52 | degrades-use | **OPEN** | document rejection is irreversible; a mis-rejected document blocks a reception permanently | `deep2/P2-AUDIT-INTEGRITY.md` §5 |
| D-53 | blocks-use | **FIXED** `fdc57107` | `/service-plans` had no access check; `/therapy/usage` let childId overwrite the school scope and left `where` empty for reception and government | `deep2/P3-ISOLATION.md` §4 |
| D-54 | blocks-use | **FIXED** `fd5c2aee` | `validateChildAccess` skipped its scope check for any user without a schoolId, admitting every government account to every child in the country | `deep2/P3-ISOLATION.md` §5 |
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
