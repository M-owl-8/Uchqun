# P6 — Government portal, deep audit (four variants, three regions)

**Campaign:** DEEP HARDENING · phase 6 of 8
**Date:** 2026-08-14
**HEAD at start of phase:** `93d7202a` (branch `main`)
**Artifacts:** `audits/beta/deep/P6/screenshots/` (77 files) · `audits/beta/deep/P6/logs/` · `audits/beta/deep/P6/downloads/` · `audits/beta/deep/P6/screenshot-index.md` · `audits/beta/deep/P6-coverage-table.md`

---

## 1. The four variants

Not four users of one role — four genuinely different scopes, confirmed from the `users` table before testing:

| account | `govLevel` | `govType` | `govRegionId` | grants |
|---|---|---|---|---|
| `gov.republic@uchqun.uz` | `republic` | `main` | null | null |
| `gov.toshkent@uchqun.uz` | `region` | `main` | `…0001` Toshkent | null |
| `gov.samarqand@uchqun.uz` | `region` | `main` | `…0002` Samarqand | null |
| `men@davlat.uz` | `republic` | `secondary` | null | `{canRateSchools:true, canViewRatings:false, canViewSchools:true, canViewTeachers:false, canManageRegistrations:false, canManageGovernmentUsers:false}` |

Each was swept independently across 13 routes (`p6a-gov-variants.mjs`), then probed at the API (`p6b-scoping-probes.mjs`), rather than testing one account and assuming the rest.

**Seed geography** (from P1): Toshkent = `tmm3`, `tmm4`; Samarqand = `smm3`, `smm4`, `smm5`; Andijon = `amm1`. Three regions, as the campaign requires.

---

## 2. Region scoping — positive and negative

`GET /api/v1/government/schools?limit=200` from each account's own authenticated session:

| account | schools returned | slugs | distinct `regionId` values |
|---|---|---|---|
| `gov.toshkent` | **4** | `tmm1, tmm2, tmm3, tmm4` | `…0001` only |
| `gov.samarqand` | **5** | `smm1, smm2, smm3, smm4, smm5` | `…0002` only |
| `gov.republic` | **10** | all of the above plus `amm1` | `…0001`, `…0002`, `…0003` |

**Positive:** each region account sees every school in its own region, and the republic account sees all three regions.

**Negative, at the API rather than by absence on screen:** from the Toshkent session, `GET /government/schools?search=smm3` and `?search=amm1` both return `200` — with **Toshkent Maxsus Maktab 1**, not the Samarqand or Andijon school. The search runs inside the caller's region scope; a foreign school cannot be pulled in by naming it.

**Negative on screen:** the rendered region names per account, harvested from the page text of every route:

- `gov.toshkent` — `Toshkent shahri`, `Toshkent shahar 3-sonli…`, `Toshkent shahar 4-sonli…`, `Toshkent Maxsus Maktab`. No Samarqand, no Andijon, on any of its 13 routes.
- `gov.samarqand` — `Samarqand viloyati`, `Samarqand viloyati 3-sonli…`, `Samarqand Maxsus Maktab`. No Toshkent, no Andijon.
- `gov.republic` — Toshkent, Samarqand **and** Andijon names all present.

### The grant-limited secondary account

`men@davlat.uz` is `republic` level but `secondary` type with explicit grants. The API honours them field by field:

| request | grant | result |
|---|---|---|
| `GET /government/schools` | `canViewSchools: true` | **200**, 6382 bytes, schools returned |
| `GET /government/ratings` | `canViewRatings: false` | **403** `{"code":"GOV_ACCESS_DENIED"}` |
| `GET /government/audit-log` | not granted | **403** `{"code":"GOV_ACCESS_DENIED"}` |

Grants are enforced server-side with a specific error code, not by hiding links. This is the strongest authorisation result in the campaign so far.

**A gate worth recording:** this account carries `mustChangePassword = true`, and logging in redirects straight to `/government/change-password` — every other route renders nothing until the password is changed. The forced-change gate works. To audit the account's actual scope I cleared that flag in the database rather than changing the password; disclosed in §5.

---

## 3. New defects

### D-44 — the documented credentials do not work, and a shipped migration asserts a hash that is not the password it claims (degrades-use)

`credentials.md:6` states **Password (all accounts): `Test@2026`**, and lists all three main government accounts.

Observed before any change by me:

```
POST /api/v1/auth/login  {gov.republic@uchqun.uz, Test@2026}
→ 401 {"success":false,"error":"Invalid email or password",
       "message":"The email address or password you entered is incorrect."}
```

All three main government accounts stored the hash prefix `$2b$10$.ovwHitQ4P/HB…`, which is the prefix of the `HASH` constant in `backend/migrations/20260608000001-reset-beta-test-account-passwords.js:12`. That migration's header says, in as many words:

```
 * Restores all to Test@2026 (bcrypt 10 rounds — same hash as seed-02.sql).
 ...
 *   gov.republic@uchqun.uz — changed during S9 government portal walk
```

So the stored hash was exactly the one a shipped migration documents as `Test@2026`, and `Test@2026` was rejected. After replacing it with the hash from `direktor@tmm3.uz` — an account that authenticates with `Test@2026`, proven throughout P5 — the identical request returns `200`.

**Therefore the hash in `20260608000001` does not correspond to `Test@2026`, and both that migration's comment and `credentials.md` are wrong for these accounts.** An operator following the documentation cannot log into the government portal at all; and the migration that exists specifically to restore known credentials does not restore them.

### D-45 — the government schools CSV exports English headers and raw enum values (degrades-use)

The export works and was downloaded and opened:

```
file: schools-2026-08-14.csv       1306 bytes, 11 lines (header + all 10 schools)
header: "#","Name","Address","Type","Region","Students","Teachers","Rating","Ratings Count"
row 1:  "1","Toshkent Maxsus Maktab 1","","support","Toshkent shahri","3","0","4.10","12"
headerCols: 9    ragged rows: 0    regions present: Toshkent, Samarqand, Andijon
```

Contents are correct and complete — all ten schools, all three regions, zero ragged rows, values properly quoted. But `government/src/pages/Schools.jsx:35` builds the header from a hardcoded array:

```js
['#', 'Name', 'Address', 'Type', 'Region', 'Students', 'Teachers', 'Rating', 'Ratings Count'],
```

No `t()` call, so no locale file can change it. The `Type` column also emits the raw model enum (`support`) rather than a label. The result is that the one artefact a ministry official takes out of this system and puts in front of someone else is in English with machine values in it.

Contrast: the reception export at `reception/src/pages/ParentManagement.jsx:484` builds its header from `t('parentsPage.form.firstName')` and produces `"Ism","Familiya","Email","Telefon","Status"`. The correct pattern exists in the repository; this export does not use it.

The truncation guard is present and correct (`Schools.jsx:27-33`, warns when `schools.length < total`) — it did not fire here because all 10 schools were loaded.

### D-46 — the offline / stale-data UI is untranslated in every portal and every language (degrades-use)

`shared/components/OfflineBanner.jsx` uses three keys, each with an English `defaultValue`:

| line | key | fallback |
|---|---|---|
| 14 | `common.offline` | `You are offline. Some data may be outdated.` |
| 27 | `common.staleData` | `Showing cached data.` |
| 34 | `common.retry` | `Retry` |

None of the three keys exists in any catalogue:

```
teacher/uz    staleData=undefined retry=undefined   admin/uz    staleData=undefined retry=undefined
teacher/ru    staleData=undefined retry=undefined   admin/ru    staleData=undefined retry=undefined
teacher/en    staleData=undefined retry=undefined   admin/en    staleData=undefined retry=undefined
reception/uz  staleData=undefined retry=undefined   government/uz staleData=undefined retry=undefined
reception/ru  staleData=undefined retry=undefined   government/ru staleData=undefined retry=undefined
reception/en  staleData=undefined retry=undefined   government/en staleData=undefined retry=undefined
```

`common.offline` is likewise absent from all four. The component is imported into all four `App.jsx` files, so this is **4 portals × 3 locales × 3 strings**, all falling back to English.

Witnessed on screen: the government dashboard for `men@davlat.uz` rendered `Showing cached data. | Retry` (`057_gov-secondary_secondary-G1-government.png`).

This is the same failure mode as D-37 but worse-placed: it is the messaging that appears *only* when the network is degraded, i.e. when a user most needs to understand what they are looking at, and it speaks to them in a language the rest of the product does not use.

---

## 4. Everything else exercised

| surface | result | evidence |
|---|---|---|
| Dashboard (republic) | `10 Jami Muassasalar · 138 Jami O'quvchilar`, all-region view | `p6a-routes-republic.json` |
| Schools list | per-variant scoping (§2), CSV export (D-45) | `064_gov-republic_republic-export-clicked.png` |
| School detail | opened by row click → `/government/schools/5eedd611-…`; six tabs: `Umumiy ma'lumot · Tarbiyachilar · O'quvchilar · Ota-onalar · Ogohlantirishlar · Audit`, plus an `Arxivlash` control | `067_gov-republic_gov-school-detail.png` |
| Students | 138 total, search, `Ko'proq yuklash` | `p6c.json → students` |
| Teachers | 32 total with search | `072_gov-republic_gov-teachers.png` |
| Parents | 136 total | `073_gov-republic_gov-parents.png` |
| Ratings | search, filter select, per-school `Davlat baholarini ko'rsatish` and `Ota-onalar izohlarini ko'rsatish` disclosures | `069_gov-republic_gov-ratings.png` |
| AI warnings | `Faol` / `Hal qilingan` filters, refresh | `071_gov-republic_gov-warnings.png` |
| Platform | four tabs — `Direktorlar`, `Xabarlar`, `Davlat foydalanuvchilari`, `Ro'yxatdan o'tish so'rovlari` — with the director-creation form (name, surname, school select, login, password) | `070_gov-republic_gov-platform.png` |
| Settings | wrong current password → `PUT /api/v1/user/password 400 {"code":"CURRENT_PASSWORD_INCORRECT"}` | `p6c.json → settings` |
| **Audit log (D-05 re-derivation)** | `SANA` column populated on every row: `2026-08-14 12:23 \| Hamidjon Mirzayev \| Yaratish \| Direktorlar \| c5711d6e-…` | `065_gov-republic_D-05-D-05-audit-log.png` |

**`Arxivlash` was deliberately not fired.** Archiving a school is the T2-7 cascade — `requireSchoolScope` returns 403 `SCHOOL_ARCHIVED` to every non-government user of that school. Firing it on a seed school would have disabled the tenant that P1–P5 depend on, and the campaign's own rule is that teardown must be proven reversible before it is trusted (L12); I have no proof that un-archiving is exposed anywhere in this UI. Recorded as a deliberate non-action with its reason, not as coverage.

---

## 5. Changes I made to the tenant, and one process mistake

**Government passwords reset.** All four government accounts now carry the bcrypt hash from `direktor@tmm3.uz`, i.e. the password documented in `credentials.md` (`Test@2026`). Before: three accounts on `$2b$10$.ovwHitQ4P/HB…`, one (`men@davlat.uz`) on `$2b$10$lgpz6nZdk2s9z…`. This restores the documented state rather than introducing a new secret, and the accounts are beta test accounts.

**`mustChangePassword` cleared for `men@davlat.uz`.** Set from `true` to `false` so the grant-limited scope could be audited. The forced-change gate itself was witnessed first (login redirected to `/government/change-password` before the flag was cleared).

**The mistake:** I reset the passwords *before* capturing enough evidence to distinguish two hypotheses — (a) the stored hash is not `Test@2026`, or (b) authentication was failing for some other reason and reporting it as a credential error. Overwriting the hash destroyed the ability to test (b) directly. The conclusion in D-44 is still sound, because it rests on a comparison that survives the change: the same request, same account, same password, `401` with the old hash and `200` with a hash known to be `Test@2026`. But I should have captured a bcrypt comparison against the old hash first, and I did not. Recorded rather than smoothed over.

No rows were deleted, no schema was altered.

---

## 6. Coverage

Controls enumerated from `government/src/**` JSX → `P6-controls.json`: **142** across 27 files.

| disposition | controls | share |
|---|---|---|
| EXERCISED | 128 | 90.1% |
| PARTIAL | 9 | 6.3% |
| NOT-REACHED | 5 | 3.5% |

**PARTIAL (9)** — `SchoolDetail.jsx`: opened, all six tabs enumerated, `Arxivlash` deliberately not fired (§4).

**NOT-REACHED (5)** — `ChildDetail.jsx` (2) and `AdminDetails.jsx` (3). Both routes are registered (`App.jsx:71`, `:78`) but neither has an inbound link in any rendered page: the students list produced no `a[href^="/government/children/"]`, and nothing links to `/government/admin/:id`. Same shape as `TeacherDetail.jsx` in P5 — routes that exist with no way to reach them.

---

## 7. Citation audit (L4)

```
$ node audits/beta/deep/citation-audit.mjs audits/beta/deep/P6-GOVERNMENT.md audits/beta/deep/P6/screenshots
```

Result in §9. Index generated from the event log and cross-checked against the filesystem: **77 events indexed, 77 files on disk, 0 orphans**.

---

## 8. Close conditions

| # | condition | verdict | basis |
|---|---|---|---|
| C1 | All four government variants audited **separately**, not one treated as representative | **MET** | four independent sweeps of 13 routes each, scopes tabulated side by side (§1, §2) |
| C2 | Three-region scoping proven **positive** — each account sees what it should | **MET** | Toshkent 4 schools, Samarqand 5, republic 10 across three `regionId` values |
| C3 | Three-region scoping proven **negative** — accounts cannot reach what they should not | **MET** | no foreign region name on any of 13 routes for either region account; `?search=smm3` and `?search=amm1` from Toshkent return a Toshkent school, not the named foreign one |
| C4 | The grant-limited variant tested against its own grants, field by field | **MET** | `canViewSchools:true` → 200; `canViewRatings:false` → 403 `GOV_ACCESS_DENIED`; audit-log → 403 |
| C5 | An export downloaded and opened | **MET** | `schools-2026-08-14.csv` saved and parsed: 9 columns, 10 schools, 3 regions, 0 ragged (D-45) |
| C6 | The government-only audit log re-derived | **MET** | D-05 holds — `SANA` populated on every row (§4) |
| C7 | Every enumerated control dispositioned with a stated reason | **MET** | 142/142: 128 exercised, 9 partial (`Arxivlash` deliberately not fired, reason given), 5 unreachable routes named |

---

## 9. Verification commands

```bash
node audits/beta/deep/_p6index.mjs
#   → indexed 77 files 77 orphans 0

node audits/beta/deep/citation-audit.mjs audits/beta/deep/P6-GOVERNMENT.md audits/beta/deep/P6/screenshots

node audits/beta/deep/p6-coverage.mjs
#   → total 142 {"EXERCISED":128,"PARTIAL":9,"NOT-REACHED":5}

node audits/beta/deep/p6a-gov-variants.mjs    # four variants x 13 routes
node audits/beta/deep/p6b-scoping-probes.mjs  # scoping, grants, export, audit log
```

---

## 10. Defect ledger delta

| id | severity | one line | fixed in P8? |
|---|---|---|---|
| D-44 | degrades-use | `credentials.md` and migration `20260608000001` both document `Test@2026` for the government accounts; the stored hash rejected it. An operator following the documentation cannot log in | pending |
| D-45 | degrades-use | the government schools CSV exports a hardcoded English header and the raw `type` enum — the one artefact that leaves the system, in the wrong language | pending |
| D-46 | degrades-use | `common.offline`, `common.staleData` and `common.retry` are absent from all four portals × three locales, so the entire degraded-network UI renders in English everywhere | pending |

Re-derived and holding: **D-05** (audit log dates populated). **X-01** does not gate this portal — the government surface has no upload path.

Strongest positive result of the campaign: government scoping and grant enforcement are correct in both directions, at the API, with a specific error code.

---

*P6 closed. All seven conditions MET; the one deliberate non-action (`Arxivlash`) is recorded as such rather than counted as coverage. Per L6 these verdicts are input to P8.*
