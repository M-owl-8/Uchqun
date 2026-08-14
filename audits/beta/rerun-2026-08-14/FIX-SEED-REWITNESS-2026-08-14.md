# Uchqun — fix / seed / deploy / re-witness run

**Deliverable:** `C:\work\Uchqun\audits\beta\rerun-2026-08-14\FIX-SEED-REWITNESS-2026-08-14.md`
**Screenshots (97):** `C:\work\Uchqun\audits\beta\rerun-2026-08-14\screenshots`
**Index (verified, 97 rows / 97 files / 0 orphans):** `C:\work\Uchqun\audits\beta\rerun-2026-08-14\screenshot-index.md`
**Logs:** `C:\work\Uchqun\audits\beta\rerun-2026-08-14\logs\`
**Prior artifact (corrected in place):** `C:\work\Uchqun\audits\beta\fullrun-2026-08-14\FULL-COVERAGE-RUN-2026-08-14.md`

---

# 1. X-01 — STILL BLOCKED. READ THIS FIRST.

**Appwrite object storage is still paused. No media of any kind can be uploaded, seeded, or shown.**

Probed as the first action of the run, `2026-08-14T05:32:55Z`, direct to the API with the
production credentials from `railway variables -s Uchqun`:

```
GET https://fra.cloud.appwrite.io/v1/storage/buckets/<bucket>
HTTP 403
{"message":"Project is paused due to inactivity. Please restore it from the console
 to resume operations.","code":403,"type":"project_paused","version":"1.9.6"}
```

Consequences, all confirmed on the deployed build:

| Blocked | Evidence |
|---|---|
| Every child/activity photo. Parent gallery is empty. | `093_parent-tmm3_W6-parent-gallery-x01-blocked.png` — "Hozircha media fayllar yo'q" |
| Every meal photo | same |
| Reception document upload | `063_reception-tmm3_D-06-document-upload-error-message.png`, `500 POST /reception/documents` |
| The live reception→director document-approval demo | queue can only be shown with seeded, pre-approved rows |
| **All of S5** (media seeding, screenshot screening, the "is it convincing" judgement) | not reached |

**Only the owner can clear this** — restore the project in the Appwrite console. The loader and
the seed slots are in place; media is the one content category the seed left at 0.

## P3 assumption, stated for override

**"at least 5" was read as 5 SCHOOLS.** The seed creates 5 schools across 2 regions with 61
children in 11 groups. If the owner meant 5 children per group, only the counts in
`SCHOOLS[].groups` change — the method, markers, teardown and idempotency are unaffected.

---

# 2. P0 — Citation audit

Ran `p0-citation-audit.mjs` over the 2026-08-14 report against `screenshot-index.md`.
Two citation classes: exact filenames, and bare backticked ordinals.

## Exact-filename citations — 9 total, **6 wrong**

All six sat in the R1-ACCOUNTS table and were fabricated as a plausible odd-number sequence
rather than read from the index. Every one of those ordinals exists but names a different screen.

| Line | Cited (wrong) | What that ordinal actually is | Corrected to |
|---|---|---|---|
| 265 | `011_gov-republic_landing.png` | `011_gov-republic_platform.png` | `002_gov-republic_landing.png` |
| 267 | `013_gov-region-samarqand_landing.png` | `013_gov-republic_settings.png` | `020_gov-region-samarqand_landing.png` |
| 269 | `015_admin-smm2_landing.png` | `015_gov-republic_ai-warnings.png` | `034_admin-smm2_landing.png` |
| 270 | `017_reception-smm2_landing.png` | `017_gov-republic_change-password.png` | `058_reception-smm2_landing.png` |
| 271 | `019_teacher-smm2_landing.png` | `019_gov-region-samarqand_login-form.png` | `071_teacher-smm2_landing.png` |
| 273 | `021_parent-smm2_landing.png` | `021_gov-region-samarqand_dashboard.png` | `100_parent-smm2_landing.png` |

Correct already: `360_teacher8-bguruh_landing.png`, `347_parent11-nozima_landing.png`,
`353_parent12-malika_landing.png`.

## Bare-ordinal citations — 383 total, **0 wrong**

Every backticked three-digit ordinal resolves to a file that exists. Seven apparent misses
(lines 376, 377, 378, 403, 413, 627, 638) are HTTP status codes — `404`, `400`, `500`, `502` —
matched by the audit regex, not screenshot references.

**Corrections applied in place**, and recorded openly as a new §13 CORRECTIONS section in the
2026-08-14 report. Re-audit after correction: **15 exact-filename citations, 0 bad.**
Nothing else in that report was altered: findings, DB queries, verbatim HTTP bodies and scores
stand as published.

**This run's own index was machine-generated from the event log and cross-checked against the
filesystem** (`lib.writeIndex()`): 97 rows, 97 files, 0 orphans, 0 dangling references.

---

# 3. Fix table

Branch `main` throughout. 13 commits, none force-pushed, no history rewritten. One merge commit
(`c91f5eb7`) to integrate 8 commits that had landed on `origin/main` (PWA/TWA work) before my push.

| Defect | Files changed | Commit | Witness screenshot | Status |
|---|---|---|---|---|
| **D-02** account creation | `backend/validators/{governmentUser,admin,reception}Validator.js`, `backend/utils/accountDomain.js`, `backend/__tests__/accountCreationValidator.test.js` | `bcd1fb58` | `026`, `029`+`030`, `007`, `017` | **FIXED** |
| **D-02** (scope ext.) teacher creatable at all; new director can log in | `backend/utils/accountDomain.js`, `backend/controllers/admin/adminUserController.js`, `backend/__tests__/accountDomain.test.js` | `487587e3` | `031`, `032` | **FIXED** |
| **D-01** attendance silently discards | `backend/controllers/teacherController.js`, `backend/controllers/attendanceController.js`, `teacher/src/pages/Attendance.jsx`, i18n + catalog, `__tests__/attendance.test.js` | `899006ac` | `038`, `040`, `041` | **FIXED** |
| **D-03** parent week one day late | `teacher/src/parent/pages/Attendance.jsx` | `22fc6b37` | `047` | **FIXED** |
| **D-04** government reply invisible to the school | `backend/controllers/admin/adminMessageController.js`, `admin/src/pages/GovMessages.jsx`, `__tests__/adminMessage.test.js` | `f69964e6` | `052` → `055`/`057` → `061` | **FIXED** |
| **D-07** dashboard fabricates 100% | `teacher/src/pages/Dashboard.jsx`, teacher i18n | `ec8ed394` | `037` | **FIXED** |
| **D-07** (scope ext.) real figure once taken | `backend/controllers/teacherController.js` | `03906f24` | `091` | **FIXED** |
| **D-12** group name renders `""` | `backend/controllers/teacherController.js`, `__tests__/teacherChildren.test.js` | `29845609` | `037`, `091` | **FIXED** |
| **D-05** audit-log dates blank | `government/src/pages/AuditLog.jsx` | `452e88d0` | `058` | **FIXED** |
| **D-11** no parent can rate a teacher | `backend/controllers/parent/parentTeacherRatingController.js`, `parentProfileController.js`, catalog + i18n, 3 test files | `21ee564e` | `048` | **FIXED** |
| **D-09** `/teacher/meals` unreachable | `teacher/src/pages/Reja.jsx`, teacher i18n | `6b3a210f` | `043`, `044` | **FIXED** |
| **D-10** orphaned routes | `admin/src/components/Sidebar.jsx`, `government/src/components/Sidebar.jsx`, admin i18n | `6b3a210f` | `053`, `059`, `089` | **FIXED** |
| **D-06** raw English upload error | `backend/controllers/receptionController.js`, `reception/src/pages/Documents.jsx`, catalog + 6 locales | `7028767a` | `063` | **PARTIAL** — see below |
| **D-13** false forced-change copy | `teacher/src/pages/ChangePassword.jsx`, `teacher/src/parent/pages/ChangePassword.jsx`, teacher i18n | `7028767a` | `045` | **FIXED** |
| **D-15** email chip missing `.uz` | `reception/src/pages/TeacherManagement.jsx`, `ParentWizard/steps/ParentStep.jsx` | `7028767a` | `025` | **FIXED** |
| **D-14** Inter font 404s | *(no code change)* | — | 0 occurrences in `logs/console.jsonl` across ~95 page loads | **NOT REPRODUCIBLE** |
| seed | `backend/scripts/seed-beta-demo.mjs` | `cb47189c` | §4 | applied |

**Full backend suite after every change: 148 suites, 1553 tests, all passing.**
All four frontends build clean (`npm run build` with `VITE_API_URL` set).

## The three that are not a clean "FIXED"

**D-06 — PARTIAL.** The stated defect was *"surfaces a raw English 'An unexpected error
occurred'"*. That is gone: the toast now reads the localised **"Hujjat yuklanmadi. Qayta urinib
ko'ring."** (`063`). But the 502 + `DOCUMENT_UPLOAD_STORAGE_FAILED` path I added never fires —
the deployed response is still `500 {"success":false,"error":"An unexpected error occurred"}`,
which is `backend/middleware/errorHandler.js:82`, i.e. the throw escapes `uploadDocument`
entirely and reaches Express's error middleware ahead of my try/catch. **Where it is thrown is
[UNVERIFIED]** — I could not localise it because backend application logs are unreadable (D-08,
still open). The user-visible symptom is fixed; the diagnosis path is not.

**D-14 — NOT REPRODUCIBLE, and I made no change.** The 2026-08-14 run logged 28 × `404 GET
https://fonts.gstatic.com/s/inter/v20/UcCB3Fwr…woff2` per page. Probed directly this run: that
URL still 404s, but the current `css2` response for the app's exact combined
`Inter + Source Serif 4` request returns entirely different URLs, all of which I probed at
**HTTP 200**. The 404s came from a stale cached CSS pointing at font files Google has since
rotated away — upstream, transient, nothing wrong in the repo, and the app already carried a
`system-ui, sans-serif` fallback which is why text always rendered. **0 font 404s across ~95
page loads this run.** I am not claiming credit for a fix I did not make.

**D-08 — untouched, still open.** Not in scope for this run.

---

# 4. Seed report

`backend/scripts/seed-beta-demo.mjs`, committed as `cb47189c`.

## What exists now

| slug | School | Region | Groups | Children | Teachers | Attendance rows | % present | Gov stars |
|---|---|---|---|---|---|---|---|---|
| tmm3 | Toshkent shahar 3-sonli ixtisoslashtirilgan maktabi | Toshkent | 2 (7, 5) | 12 | 2 | 240 | 88% | 4★ |
| tmm4 | Toshkent shahar 4-sonli maxsus ta'lim markazi | Toshkent | 3 (6, 4, 5) | 15 | 3 | 300 | 88% | 5★ |
| smm3 | Samarqand viloyati 3-sonli madad maktabi | Samarqand | 2 (8, 6) | 14 | 2 | 280 | 86% | 3★ |
| smm4 | Urgut tumani maxsus ta'lim maktabi | Samarqand | 2 (5, 5) | 10 | 2 | 200 | 85% | 4★ |
| smm5 | Kattaqo'rg'on tumani erta yordam markazi | Samarqand | 2 (4, 6) | 10 | 2 | 200 | 87% | 3★ |

Totals across the seed: **5 schools · 11 groups · 61 children · 82 users · 1220 attendance rows ·
2388 meals · 796 activities · 60 journal entries · 120 chat messages · 25 therapy items ·
51 therapy usages · 15 IRRs · 5 approved documents · 5 government ratings · 35 audit rows ·
0 media (X-01)**.

**S3 deviation, stated plainly:** the brief asked for 88–96% attendance. Actual is **85–88%** —
three schools land 1–3 points under the band. Absences are clustered as 2–4 day illness runs per
child (not evenly spaced), which is what pushed the average down. I did not tune the numbers up
to hit the band; special-education settings routinely run higher absence than mainstream, so the
lower figure is if anything more plausible. Flagging it rather than claiming compliance.

Seeded content, all in Uzbek, all plausible: real diagnoses with ICD codes (F84.0 autism, F80.1
speech delay, F70, H90.3, G80.1, H54.2, F90.0, F83) and matching special-needs notes; ages 3–10;
uneven group sizes 4–8; meals with realistic Uzbek menus and "ate/didn't eat" variation;
teacher–parent chat threads several days apart including an absence conversation with a reply;
mixed government ratings (3/4/5, not all 4★).

**`users.teacherId` is genuinely populated** for every seeded parent — D-11 was required to be
fixed on real data, not patched around. Witnessed: `048` shows the parent's rating page naming
*Zebo Ashurova, tarbiyachi1@tmm3.uz* as the assigned teacher.

## S1 — identifiability is machine-only

Every seeded primary key begins with the hex string **`5eed`**. Nothing human-visible contains
"seed", "test", "demo" or "SIM". Verified by query:

```sql
SELECT count(*) FROM schools  WHERE id::text LIKE '5eed%' AND name ~* '(test|demo|seed|sim-)';        -- 0
SELECT count(*) FROM children WHERE id::text LIKE '5eed%'
   AND ("firstName" ~* '(test|demo|seed|sim)' OR "lastName" ~* '(test|demo|seed|sim)');               -- 0
```

**IDENTIFY query** (`--identify` prints it):

```sql
SELECT 'schools' AS t, count(*) FROM schools  WHERE id::text LIKE '5eed%'
UNION ALL SELECT 'users',            count(*) FROM users    WHERE id::text LIKE '5eed%'
UNION ALL SELECT 'groups',           count(*) FROM groups   WHERE id::text LIKE '5eed%'
UNION ALL SELECT 'children',         count(*) FROM children WHERE id::text LIKE '5eed%'
UNION ALL SELECT 'child_attendance', count(*) FROM child_attendance WHERE "schoolId"::text LIKE '5eed%'
UNION ALL SELECT 'meals',            count(*) FROM meals    WHERE "childId"::text LIKE '5eed%'
UNION ALL SELECT 'activities',       count(*) FROM activities WHERE "childId"::text LIKE '5eed%'
UNION ALL SELECT 'media',            count(*) FROM media    WHERE "childId"::text LIKE '5eed%'
UNION ALL SELECT 'irrs',             count(*) FROM irrs     WHERE "schoolId"::text LIKE '5eed%'
UNION ALL SELECT 'therapies',        count(*) FROM therapies WHERE id::text LIKE '5eed%'
UNION ALL SELECT 'therapy_usages',   count(*) FROM therapy_usages WHERE "childId"::text LIKE '5eed%'
UNION ALL SELECT 'chat_messages',    count(*) FROM chat_messages WHERE "senderId"::text LIKE '5eed%'
UNION ALL SELECT 'documents',        count(*) FROM documents WHERE "userId"::text LIKE '5eed%'
UNION ALL SELECT 'journal',          count(*) FROM child_journal_entries WHERE "schoolId"::text LIKE '5eed%'
UNION ALL SELECT 'gov_ratings',      count(*) FROM government_school_ratings WHERE "schoolId"::text LIKE '5eed%'
UNION ALL SELECT 'audit_log',        count(*) FROM audit_log WHERE "schoolId"::text LIKE '5eed%'
ORDER BY 1;
```

**TEARDOWN:** `node backend/scripts/seed-beta-demo.mjs --teardown` (FK-ordered, 17 statements, all
keyed on `5eed%`), or `--teardown-only=<slug>` for one school.

## S2 — idempotency and reversibility, proven on smm5

| Step | Result |
|---|---|
| `--teardown-only=smm5` | removed 200 attendance · 393 meals · 131 activities · 24 journal · 3 irrs · 10 children · 14 users · 2 groups · 1 school |
| non-seed rows immediately after | schools **4**, users **36**, children **12**, attendance **42** — the four legacy tenants untouched |
| `--only=smm5` re-seed | totals restored **exactly**: 61 children, 82 users, 1220 attendance, 2388 meals, 796 activities, 5 schools |

Ids are sha1-derived from `(kind, school, index)`, so a re-run rewrites the same rows rather than
duplicating; day-grained tables are deleted for the seeded scope and rewritten each run.

## S4 — old markers purged

| Purged | Count |
|---|---|
| `chat_messages` matching `^P[0-9]+ beta xabar` or `SIM-%` (previous automated runs, incl. the `P11 beta xabar` artefact) | **10** |
| `government_messages` `SIM-%` | 0 (already gone) |
| `government_school_ratings` comment `SIM-%` | 0 (already gone) |
| `users` firstName `SIM-%` (the two SIM government accounts from the prior run) | 0 (already gone) |

**Residual I deliberately did NOT delete — 4 pre-existing accounts with test-shaped names**, all
in the legacy tenants (tmm1/smm1), none created by either run:
`childless.test@uchqun.uz` (Childless Test), `tests9.teacher@uchqun.uz` (TestS9 Teacher),
`testwizard3.s8@uchqun.uz` (TestWizard3 S8Verify), `testr077.s9@uchqun.uz` (TestR077 S9).
Deleting a parent cascades to their child records, and these are somebody's accounts, not my
artefacts. **The demo click-path in §9 never enters the legacy tenants**, so a buyer following it
does not see them. If the owner wants them gone, that is a one-line decision, not mine to take.

## S5 — media report

**Nothing was seeded into any media slot, and no run screenshot is visible to a parent as child
media.** All of S5 is gated on X-01, which is still paused.

| Slot | Intended source (preference order) | What actually occupies it |
|---|---|---|
| (a) Meal photos | real food images | **empty** — X-01 |
| (b) Child / activity media | classroom scenes, craft work, generated illustration — never a real identifiable child | **empty** — X-01 |
| (c) Documents | a screenshot of a form or certificate is plausible here | **empty** — X-01; the 5 seeded document rows are metadata-only, `filePath` points at a path with no stored object |

**Credential screening: 0 screened, 0 rejected, 0 promoted — because 0 images were uploaded.**
The screening rule stands for whenever storage returns: the 2026-08-14 set contains login forms,
change-password screens with typed password fields, and account-creation forms showing emails and
initial passwords (e.g. `002`, `006`, `010`, `014`, `029` in this run alone), and every one of
those must be rejected before any screenshot becomes buyer-visible media.

**Explicit statement required by S5: no screenshot from either run is visible to a parent as
child media.** The parent gallery is empty (`093`).

---

# 5. Deploy record

Branch `main`. Deployed by `.github/workflows/railway-deploy.yml` (backend + 4 frontends).

| Push | HEAD after | GH Actions |
|---|---|---|
| `c3e0a6fb..c91f5eb7` | merge + D-01…D-15 | Deploy to Railway — success |
| `c91f5eb7..487587e3` | D-02 scope extension | success |
| `487587e3..03906f24` | D-07 scope extension | success |

**Final HEAD: `03906f240e2af1aec5bd988921acff7f822f6c43`**

| Service | Final deploy id | Up at (UTC+5) |
|---|---|---|
| Uchqun (backend) | `b5076dca-804b-4f03-be36-f4b14605c574` | 2026-08-14 12:38:17 |
| government | `9a8dfaf8-353e-4fdf-bdd6-e19e8882fba2` | 2026-08-14 12:38:36 |
| admin | `4b49550d-0e81-4a1f-9a8c-d6b686d756ed` | 2026-08-14 12:38:39 |
| teacher | `96b2ec6f-890d-4b23-b381-576b994be1dc` | 2026-08-14 12:38:37 |
| reception | `78d58dce-1844-46a3-b054-3c3edb7ce525` | 2026-08-14 12:38:35 |

No service failed to build. Every W-series screenshot below was taken **after** the deploy that
contains the fix it witnesses; the three screenshots that pre-date a fix (`020`, `021`, `022`) are
labelled as such and are the *before* evidence for the D-02 scope extension.

---

# 6. Re-witness gallery

Headed Chromium (`chromium.launch({ headless: false })`), 1440×950, locale `uz`, a fresh browser
context per role, every page cold-loaded.

## W1 — one screenshot per fix, on the deployed build

| Defect | Screenshot | What it shows |
|---|---|---|
| D-01 | `038_teacher-tmm3_D-01-attendance-grid-own-group-only.png` | 7 cards, all Umid guruhi; `foreignChildOffered: false`. Previously the grid offered the whole school. |
| D-01 | `041_teacher-tmm3_D-01-attendance-save-result.png` | a legitimate absence saved, "Davomat saqlandi" |
| D-02 | `026`, `029`+`030`, `007`, `017` | all four roles created, each with its success toast |
| D-03 | `047_parent-tmm3_D-03-parent-attendance-week.png` | week `2026-08-10 – 2026-08-16` over cards M08 10…16, statuses on the correct days |
| D-04 | `061_director-tmm3_D-04-hop3-school-sees-reply.png` | badge **"Javob berildi"**, reply body, author, timestamp |
| D-05 | `058_gov-toshkent_D-05-audit-log-dates.png` | SANA column populated on every row |
| D-06 | `063_reception-tmm3_D-06-document-upload-error-message.png` | localised **"Hujjat yuklanmadi. Qayta urinib ko'ring."** |
| D-07 | `037` (not recorded) / `091` (real figure) | `Davomat hali olinmagan` → `6 / 7 keldi · 86%` |
| D-09 | `043`, `044` | Reja tab bar reads *Individual reja · Terapiya · Kuzatuv · **Taomlar*** |
| D-10 | `053`, `059`, `089` | admin **MUASSASA** section; government registers in the sidebar; bulk import reached by clicking |
| D-11 | `048_parent-tmm3_D-11-parent-teacher-rating.png` | **BIRIKTIRILGAN TARBIYACHI — Zebo Ashurova** with the rating form |
| D-12 | `037`, `091` | `"Umid guruhi" Guruh · 7 bola.` — no empty quotes |
| D-13 | `045_teacher-tmm3_D-13-change-password-copy.png` | "Yangi parolni o'rnating." |
| D-15 | `025_reception-tmm3_D-15-teacher-form-domain-chip.png` | chip reads `@tmm3.uz` |
| D-14 | — | no screenshot; 0 font 404s in `logs/console.jsonl`. Not claimed as fixed. |

## W2 — D-02: four roles created through the UI, four first logins

| # | Actor → creates | Result on screen | Created | First login |
|---|---|---|---|---|
| 1 | gov.republic → **director** `sh.qurbonova@tmm3.uz` | "Direktor muvaffaqiyatli yaratildi" + "Hisob ma'lumotlari: sh.qurbonova@tmm3.uz" (`003`, `004`) | ✔ | ✘ `020` — 403 "Admin account is not active" (**before** the `487587e3` fix) |
| 2 | director → **reception** `k.yusupova@tmm3.uz` | "Qabul akkaunti yaratildi" (`007`, `008`) | ✔ | ✘ `021`, then ✔ `036` after the director activated her through the UI (`034`, `035`) |
| 3 | reception → **teacher** `g.saidova@tmm3.uz` | first attempt `011` failed 403; after `487587e3`: "Tarbiyachi akkaunti yaratildi" (`026`, `027`) | ✔ | ✔ `031` — lands on `/teacher`, "Xush kelibsiz, Gulnora opa/aka." |
| 4 | reception → **parent + child** `m.rahimova@tmm3.uz` / Ozoda Rahimova | 3-step wizard `014`–`016`, "Tayyor! Ota-ona, bola va guruh muvaffaqiyatli ro'yxatdan o'tkazildi" (`017`, `018`), in the parent list (`019`) | ✔ | ✔ `023` — parent portal, child "Ozoda Rahimova" |
| 5 | gov.republic → **director** `d.ergashev@smm4.uz` (post-fix) | "Direktor muvaffaqiyatli yaratildi" (`030`) | ✔ | ✔ `032` — lands on `/admin` |

DB confirmation: the wizard-created child `Ozoda Rahimova` exists **with a group assigned**.
No scripts were used for any creation — every field was typed into the product's own forms.

## W3 — D-01 refusal, then a legitimate absence confirmed on the correct day

1. **The child a teacher may not record is no longer offered.** `038`: grid shows exactly the 7
   Umid guruhi children; no child from Nur guruhi appears. The refusal is now structural.
2. **The backend refuses too** (corroboration, not a witness). An in-page `fetch` as that teacher
   for a Nur guruhi child returned:
   `400 {"success":false,"error":{"code":"ATTENDANCE_ACCESS_DENIED","detail":"1 of 1 record(s) were not saved"},"data":{"saved":0,"skipped":0,"errors":[…]}}`.
   Compare the 2026-08-14 run, same action: `201 {"success":true,…"saved":2,"errors":[…]}`.
3. **A real absence, marked and saved**: `040` (`Nozima Sharipova: Kasal`), `041` ("Davomat saqlandi").
4. **The parent sees it on the right day** (this also re-proves D-03), `047`:

| Date | DB truth | Parent card |
|---|---|---|
| 2026-08-10 | present | M08 10 **Bor** |
| 2026-08-11 | sick | M08 11 **Kasal** |
| 2026-08-12 | sick | M08 12 **Kasal** |
| 2026-08-13 | present | M08 13 **Bor** |
| 2026-08-14 *(marked in step 3)* | sick | M08 14 **Kasal** |
| 2026-08-15 / 16 (future) | none | blank |

Zero shift. Before the fix the header read `2026-08-09 – 2026-08-15` over cards `M08 10…16`, every
status landed one day late, and a future day showed a fabricated "Bor".

## W4 — D-04, three hops, three accounts, three screenshots

| Hop | Account | Screenshot | State |
|---|---|---|---|
| 1 | `direktor@tmm3.uz` sends "Terapiya mashg'ulotlari uchun qo'shimcha mutaxassis so'rovi" | `051`, `052` | badge **Kutilmoqda** |
| 2 | `gov.toshkent@uchqun.uz` sees it and replies | `055`, `056`, `057` | reply sent |
| 3 | `direktor@tmm3.uz`, fresh session | `061` | badge **Javob berildi**; "Hukumat javobi · Nodira Yusupova · 2026-08-14 12:30:07" + the reply body |

## W5 — the demo path, in order

| # | Screen | Screenshot |
|---|---|---|
| 1 | government login | `064` |
| 2 | republic dashboard — 9 schools, all regions | `065` |
| 3 | all schools | `066` |
| 4 | all students | `067` |
| 5 | ratings across regions | `068` |
| 6 | region (Toshkent) login → dashboard | `069` |
| 7 | region school list | `070`, `085` |
| 8 | school detail | `086` |
| 9 | director dashboard | `071` |
| 10 | director → teachers | `072` |
| 11 | director → activity feed (dated) | `073`, `087` |
| 12 | director → IRR | `074` |
| 13 | director → documents queue (not empty) | `088` |
| 14 | teacher's day | `075`, `091` |
| 15 | teacher → children | `076` |
| 16 | teacher → plan | `077` |
| 17 | teacher → chat | `078` |
| 18 | parent today | `079` |
| 19 | parent attendance | `080` |
| 20 | parent meals — **39 records** | `081`, `094` |
| 21 | parent journal — **6 entries** | `082`, `095` |
| 22 | parent chat | `083` |

## W6 — seeded media as a parent sees it

`093_parent-tmm3_W6-parent-gallery-x01-blocked.png` — **"Hozircha media fayllar yo'q"**, empty,
unretouched. This is X-01, not a product defect. Neighbouring parent screens that the seed *could*
fill are full: meals `094` (39), journal `095` (6), therapy library `097`.
`096` shows a child with no IRR yet ("Hali baholash o'tkazilmagan") — the seed writes IRRs for the
first three children per school, so some children legitimately have none.

## W7 — console and network, whole run

70 console rows and 70 failed requests across ~95 page loads. **61 of the 70 are the baseline
pre-login `401 /auth/me` + `401 /auth/refresh` pair** that every cold page fires before
authenticating.

| n | Error | Verdict |
|---|---|---|
| 4 | `404 GET /teacher/children/<id>/irr` → `{"code":"IRR_NOT_FOUND"}` | legitimate empty state, still logged as a console error — residual noise |
| 2 | `403 POST /auth/login` — "Admin account is not active" | **historical**: `new-director`/`new-reception` before `487587e3` deployed |
| 1 | `403 POST /reception/teachers` — `ACCOUNT_CREATE_FORBIDDEN_HIERARCHY` | **historical**: before `487587e3` |
| 1 | `401 POST /auth/login` (`new-teacher`) | historical consequence of the above |
| 1 | `400 POST /attendance` — `ATTENDANCE_ACCESS_DENIED` | **my deliberate D-01 refusal probe** |
| 1 | `500 POST /reception/documents` | X-01 / D-06 residual |

Comparison with the 2026-08-14 run: 197 console rows and 197 failed requests over ~120 page loads,
including **28 font 404s per page**, 8 × `400 /parent/ratings`, 2 × `403 /meals`. All three of
those classes are now at **zero**.

---

# 7. Remaining defect ledger

| ID | Severity | Status | Detail |
|---|---|---|---|
| **D-08** | degrades-use | **OPEN, untouched** | Backend application logs unreadable via Railway. Not in this run's scope. It is why D-06's throw site is `[UNVERIFIED]`. |
| **D-06** | degrades-use | **PARTIAL** | User-visible raw-English string fixed; the 502 + `DOCUMENT_UPLOAD_STORAGE_FAILED` path never fires because the throw escapes the controller into `errorHandler.js:82`. Throw site unknown (blocked by D-08). |
| **D-16** *(new)* | degrades-use | **OPEN** | `POST /reception/parents` and the whole enrolment path work, but reception cannot create a **reception** peer and admin has no teacher-create UI — the product's create-permission map is asymmetric and undocumented in the UI. Discovered while fixing D-02; only the teacher half was in scope and is fixed. |
| **D-17** *(new)* | degrades-use | **OPEN (by design, badly surfaced)** | A reception created through the product is born `isActive=false, documentsApproved=false` and cannot log in until a director activates them (`034`, `035`, `036`). This is the documented CLAUDE.md gate — but nothing in the creation flow tells the creator, and the new user simply gets "Account not approved". |
| **D-18** *(new)* | cosmetic | **OPEN** | `IRR_NOT_FOUND` 404s are logged as console errors on a legitimate empty state (4 occurrences). |
| **X-01** | blocks-use | **OPEN — owner action** | Appwrite paused. Blocks all media, document upload, and the live approval demo. |
| **D-14** | cosmetic | **NOT REPRODUCIBLE** | Upstream Google Fonts rotation; 0 occurrences this run. No code change made. |
| C-02 | — | pre-existing | "group-wide media visibility" still requires product/legal sign-off (CLAUDE.md). Unrelated to this run. |

---

# 8. RESCORE

## Rubric — unchanged from the 2026-08-14 run, same hand

Usability only: *can a real school run a week on this, unassisted?* External-service gaps
(X-01) excluded. Ten points:

| Weight | Criterion |
|---|---|
| 3.0 | **Truthfulness** — what the UI reports matches what the system stored, and what a second account sees |
| 2.0 | **Completability** — the role's core weekly loop finishes without a workaround |
| 2.0 | **Onboarding** — the role's own accounts and records can be created through the product |
| 1.5 | **Reachability** — features that exist can be found from navigation |
| 1.0 | **Error legibility** — failures are named, localised, actionable |
| 0.5 | **Polish** — labels, empty states, console cleanliness |

## BEFORE — reconstructed from the 2026-08-14 evidence

The prior report published only an overall **3.5** with no per-criterion breakdown, so the
baseline had to be rebuilt before any delta could be claimed. Reconstruction:

| Criterion | Weight | Reconstructed BEFORE | Reasoning from that run's own evidence |
|---|---|---|---|
| Truthfulness | 3.0 | **0.6 / 3.0** | Four independent lies on screen: attendance saved-but-discarded (D-01), parent week one day late (D-03), dashboard 100% on an empty day (D-07), government reply invisible (D-04). Read paths were honest; that is the only reason it is not 0. |
| Completability | 2.0 | **0.8 / 2.0** | Attendance, chat, ratings, escalation-outbound all completed; the return leg, the document approval, and the teacher's meals loop did not. |
| Onboarding | 2.0 | **0.2 / 2.0** | Zero of four school roles creatable. Only government users could be created. |
| Reachability | 1.5 | **0.9 / 1.5** | 5 built routes needed a typed URL; the rest of the IA was sound. |
| Error legibility | 1.0 | **0.3 / 1.0** | "Validation failed" naming no field; raw English "An unexpected error occurred"; 400 for an ordinary empty state. The media path was the one good example. |
| Polish | 0.5 | **0.2 / 0.5** | Literal `""` on the first screen, 28 font 404s/page, dead card on the rating page, false forced-change copy. |
| **TOTAL** | 10 | **3.0 / 10** | |

**My reconstruction is 3.0, not the published 3.5 — I disagree with the earlier number by 0.5.**
Arithmetic: 0.6 + 0.8 + 0.2 + 0.9 + 0.3 + 0.2 = 3.0. The published 3.5 was an overall judgement
never decomposed; decomposed against the same evidence, Onboarding cannot carry more than 0.2/2.0
when four of six creatable roles return HTTP 400, and Truthfulness cannot carry more than
0.6/3.0 with four screen-level falsehoods. I am reporting the lower reconstruction.

## AFTER — scored from this run's W-series screenshots only

| Criterion | Weight | BEFORE | AFTER | Defect IDs that moved it | Witness screenshot |
|---|---|---|---|---|---|
| Truthfulness | 3.0 | 0.6 | **2.6** | D-01, D-03, D-04, D-05, D-07 | `038`, `041`, `047`, `061`, `058`, `091` |
| Completability | 2.0 | 0.8 | **1.5** | D-01, D-04, D-09 (+ seed) | `041`, `061`, `044`, `081`, `095` |
| Onboarding | 2.0 | 0.2 | **1.6** | D-02 (+ scope ext.) | `026`, `030`, `007`, `017`, `031`, `032`, `023`, `036` |
| Reachability | 1.5 | 0.9 | **1.4** | D-09, D-10 | `043`, `053`, `059`, `089` |
| Error legibility | 1.0 | 0.3 | **0.7** | D-06 (partial), D-11 | `063`, `048` |
| Polish | 0.5 | 0.2 | **0.45** | D-12, D-13, D-14, D-15 (+ seed) | `037`, `045`, `025`, `091` |
| **TOTAL** | 10 | **3.0** | **8.25** | | |

Where each AFTER score stops short of full marks, and why:

- **Truthfulness 2.6/3.0** — every named falsehood is gone and re-witnessed. Held back 0.4 because
  D-06's backend still answers a bare 500 that says nothing true about what failed, and because
  D-08 means no one can verify server-side behaviour independently.
- **Completability 1.5/2.0** — held back 0.5: the reception→director document-approval loop cannot
  be completed at all while X-01 is paused. That is an external gap, but the *loop* is genuinely
  incompletable today, and Completability measures the loop.
- **Onboarding 1.6/2.0** — all four roles now create and log in. Held back 0.4 for D-17: a
  reception created through the product cannot log in until someone activates them, and nothing on
  screen says so.
- **Reachability 1.4/1.5** — all previously orphaned routes are now in navigation, witnessed.
- **Error legibility 0.7/1.0** — held back 0.3 for D-06 partial and D-18 console noise.
- **Polish 0.45/0.5** — held back 0.05 for the residual `IRR_NOT_FOUND` console errors.

**Seeded data earned points only in Completability and Polish**, per the rule. Truthfulness moved
solely on D-01/D-03/D-04/D-05/D-07, each with its own witness.

## Per-role, same two columns

| Role | BEFORE | AFTER | What moved it | Witness |
|---|---|---|---|---|
| Government (republic) | 7.0 | **8.5** | D-05 dates, D-10 registers in nav | `058`, `059`, `065`–`068` |
| Government (region) | 6.5 | **8.5** | D-04 reply now lands, D-05, D-10 | `057`, `058`, `086` |
| School director / admin | 4.0 | **8.0** | D-02 creates receptions, D-04 sees the reply, D-10 nav | `007`, `061`, `053`, `089` |
| Reception | 3.5 | **7.5** | D-02 creates teachers and enrols parent+child, D-06 legible error, D-15 domain | `026`, `017`, `063`, `025` |
| Teacher | 3.0 | **8.5** | D-01 scope + honest save, D-07 real figure, D-09 meals, D-12 group name | `038`, `041`, `091`, `043` |
| Parent | 3.0 | **8.0** | D-03 correct day, D-11 rating works, seeded content | `047`, `048`, `094`, `095` |

## Weakest criteria now, and what would move them next

1. **Completability (1.5/2.0)** — restore Appwrite (X-01). That alone re-enables media, document
   upload, and the approval loop, and is worth ~0.5.
2. **Error legibility (0.7/1.0)** — fix D-08 first (backend logs), then D-06's real throw site
   becomes diagnosable in minutes instead of being `[UNVERIFIED]`.
3. **Truthfulness (2.6/3.0)** — capped by the same two items. Nothing on a screen is currently
   known to be false.
4. **Onboarding (1.6/2.0)** — surface the reception activation requirement in the creation flow
   (D-17): one sentence in the success toast would close it.

---

# 9. Buyer-demo verdict

## **CAN SHOW** — with a defined path and two screens to avoid.

Every defect that drove the previous CANNOT verdict has been fixed and re-witnessed on the
deployed build:

| Previous blocker | Now |
|---|---|
| D-02 — no school could be onboarded | four roles created live on screen, four first logins (`026`, `030`, `017`, `031`, `032`, `023`) |
| D-01 — attendance said "saved" and discarded | child not offered at all; API refuses 400; save is honest (`038`, `041`) |
| D-03 — parent shown the wrong day | day-for-day match against the DB (`047`) |
| D-04 — government reply dead-ended | "Javob berildi" + reply body at the school (`061`) |
| D-07 / D-12 — first teacher screen wrong | `"Umid guruhi" Guruh · 7 bola` and `6 / 7 keldi · 86%` (`091`) |

### The safe click-path

1. **Government (republic)** — `gov.republic@uchqun.uz` / `Test@2026`
   → dashboard (9 schools, 2 regions) → Muassasalar → O'quvchilar → Reytinglar
2. **Government (region)** — `gov.toshkent@uchqun.uz` / `Test@2026`
   → dashboard scoped to Toshkent → Muassasalar → open **Toshkent shahar 3-sonli…** → school detail
3. **Director** — `direktor@tmm3.uz` / `Uchqun@2026`
   → Bosh sahifa → Tarbiyachilar → Faoliyat tarixchasi → Choraklik monitoring → Hujjatlar navbati
   → **Xabarlar** (show the answered government thread)
4. **Teacher** — `tarbiyachi1@tmm3.uz` / `Uchqun@2026`
   → Bugun (`6 / 7 keldi · 86%`) → Bolalar → Davomat → Reja ▸ Taomlar → Xabar
5. **Parent** — `otaona11@tmm3.uz` / `Uchqun@2026`
   → Bugun → Davomat (Hafta) → Taomlar (39) → Kundalik (6) → Xabar → Fikr bildirish

Optional live moment, now safe: **create a teacher on stage** as `qabul@tmm3.uz` /
`Uchqun@2026` → Tarbiyachilar → "Tarbiyachi qo'shish" → and log in as them.

### Screens to avoid, and why

| Avoid | Why |
|---|---|
| **Galereya** (parent) and any media upload | X-01 — empty gallery, upload returns an error |
| **Mening hujjatlarim** upload button (reception) | X-01 — 500 on submit |
| Creating a **reception** live | D-17 — the new account cannot log in until activated; the flow does not say so |
| The four legacy tenants (tmm1, tmm2, smm1, smm2) | they still contain `Test*` accounts and thin data; the seeded five are the demo set |
| `/admin/documents` on any school other than the seeded five | queue will be empty |

---

# 10. SCOPE-EXTENSION log

| # | Change | Why it was necessary | Commit |
|---|---|---|---|
| 1 | `accountDomain.js` — reception may create a teacher | D-02's stated fix removed the email wall and exposed a 403: `POST /reception/teachers` is behind `requireReception`, `adminRoutes.js:109` is GET-only, so **no role could create a teacher through any route**. Reception created teachers directly before `a0723db1`. W2 explicitly requires creating a teacher through the UI. | `487587e3` |
| 2 | `adminUserController.createAdmin` — set `isActive: true` | Directors created through the government portal were refused at login with 403 "Admin account is not active" (witnessed, `020`). No admin approval workflow exists; every sibling creator sets it true. W2 requires a first login. | `487587e3` |
| 3 | `getDashboardCounts` — return today's present/total | D-07's stated fix (stop falling through to head count) left the panel permanently on "not recorded" because the endpoint never returned an attendance figure at all. Witnessed on a cold login, `042`/`090`. | `03906f24` |
| 4 | Rewrote three tests that asserted the defective behaviour | `attendance.test.js` asserted 201 for a partial save; `parentRating.test.js` asserted 400 for the NULL-`teacherId` case that was 100% of production parents; `accountDomain.test.js` asserted "reception cannot create teacher". Each encoded the bug. | `899006ac`, `21ee564e`, `487587e3` |
| 5 | Extended the S4 purge to `^P[0-9]+ beta xabar` | S4 named the `P11` artefact; nine identical siblings from the same automated run remained. Text-only rows, no FK dependants. | `cb47189c` |

Each is logged rather than folded silently into a fix commit.

---

# 11. BLOCKED list

## Genuine — the product cannot do it

| Item | Attempted | Wall | Evidence |
|---|---|---|---|
| Reception creates a reception peer | not attempted through UI | `accountDomain.js` allows only `admin` → reception; the reception portal has no such form either | D-16 |
| Diagnose D-06's real throw site | read the deployed 500 body, compared with the media path | needs server logs; D-08 makes them unreadable | `logs/network.jsonl` |

## Environmental

| Item | Wall |
|---|---|
| All media seeding and every W6 media judgement | **X-01** — Appwrite `project_paused`, probed 403 at 05:32:55Z |
| Reception document upload; the live approval loop | same |
| Backend runtime logs | D-08, carried over untouched |
| `men@davlat.uz` (legacy republic-secondary) | `mustChangePassword=true`, password unknown; not used |

---

# 12. Screenshot index

**`C:\work\Uchqun\audits\beta\rerun-2026-08-14\screenshot-index.md`** — 97 rows, generated from
the run's event log and cross-checked against the filesystem (0 orphans, 0 dangling references).
Columns: File · Defect · Role · Action · Path. Filenames carry their defect id, so every claim in
§3 and §8 is reachable by grepping the index for that id.

Screenshots directory: **`C:\work\Uchqun\audits\beta\rerun-2026-08-14\screenshots`**

---
---

# VERIFIER PACKET

*Standalone. Re-derive the score from the screenshots alone.*

**Screenshot index:** `C:\work\Uchqun\audits\beta\rerun-2026-08-14\screenshot-index.md`
**Screenshots:** `C:\work\Uchqun\audits\beta\rerun-2026-08-14\screenshots`
**Deployed HEAD:** `03906f240e2af1aec5bd988921acff7f822f6c43`

## Fix table

| Defect | Commit | Witness screenshot(s) | Status |
|---|---|---|---|
| D-01 | `899006ac` | `038_teacher-tmm3_D-01-attendance-grid-own-group-only.png`, `040_teacher-tmm3_D-01-attendance-marked-sick.png`, `041_teacher-tmm3_D-01-attendance-save-result.png` | FIXED |
| D-02 | `bcd1fb58`, `487587e3` | `026_reception-tmm3_D-02-create-teacher-result.png`, `030_gov-republic_D-02-create-director2-result.png`, `007_director-tmm3_D-02-create-reception-result.png`, `017_reception-tmm3_D-02-wizard-result.png`, `031_new-teacher_D-02-first-login-landing.png`, `032_new-director2_D-02-first-login-landing.png`, `023_new-parent_D-02-first-login-landing.png`, `036_new-reception_D-17-first-login-after-activation.png` | FIXED |
| D-03 | `22fc6b37` | `047_parent-tmm3_D-03-parent-attendance-week.png` | FIXED |
| D-04 | `f69964e6` | `052_director-tmm3_D-04-hop1-school-sent-pending.png`, `057_gov-toshkent_D-04-hop2-region-replied.png`, `061_director-tmm3_D-04-hop3-school-sees-reply.png` | FIXED |
| D-05 | `452e88d0` | `058_gov-toshkent_D-05-audit-log-dates.png` | FIXED |
| D-06 | `7028767a` | `063_reception-tmm3_D-06-document-upload-error-message.png` | PARTIAL |
| D-07 | `ec8ed394`, `03906f24` | `037_teacher-tmm3_D-07-dashboard-before-attendance.png`, `091_teacher-tmm3_D-07-dashboard-real-attendance-figure.png` | FIXED |
| D-09 | `6b3a210f` | `043_teacher-tmm3_D-09-reja-tabbar-with-meals.png`, `044_teacher-tmm3_D-09-reja-meals-tab.png` | FIXED |
| D-10 | `6b3a210f` | `053_director-tmm3_D-10-admin-sidebar-institution-section.png`, `059_gov-toshkent_D-10-gov-sidebar-registers.png`, `089_demo-director_D-10-director-bulk-import-reachable.png` | FIXED |
| D-11 | `21ee564e` | `048_parent-tmm3_D-11-parent-teacher-rating.png` | FIXED |
| D-12 | `29845609` | `037_teacher-tmm3_D-07-dashboard-before-attendance.png`, `091_teacher-tmm3_D-07-dashboard-real-attendance-figure.png` | FIXED |
| D-13 | `7028767a` | `045_teacher-tmm3_D-13-change-password-copy.png` | FIXED |
| D-14 | *(none)* | *(none — 0 occurrences in `logs/console.jsonl`)* | NOT REPRODUCIBLE |
| D-15 | `7028767a` | `025_reception-tmm3_D-15-teacher-form-domain-chip.png` | FIXED |
| X-01 | *(none — owner action)* | `093_parent-tmm3_W6-parent-gallery-x01-blocked.png` | BLOCKED |

## AFTER score table

| Criterion | Weight | BEFORE | AFTER | Defect IDs that moved it | Witness screenshot |
|---|---|---|---|---|---|
| Truthfulness | 3.0 | 0.6 | 2.6 | D-01, D-03, D-04, D-05, D-07 | `038`, `041`, `047`, `061`, `058`, `091` |
| Completability | 2.0 | 0.8 | 1.5 | D-01, D-04, D-09 | `041`, `061`, `044`, `081`, `095` |
| Onboarding | 2.0 | 0.2 | 1.6 | D-02 | `026`, `030`, `007`, `017`, `031`, `032`, `023`, `036` |
| Reachability | 1.5 | 0.9 | 1.4 | D-09, D-10 | `043`, `053`, `059`, `089` |
| Error legibility | 1.0 | 0.3 | 0.7 | D-06, D-11 | `063`, `048` |
| Polish | 0.5 | 0.2 | 0.45 | D-12, D-13, D-14, D-15 | `037`, `045`, `025`, `091` |
| **TOTAL** | **10** | **3.0** | **8.25** | | |

| Role | BEFORE | AFTER |
|---|---|---|
| Government (republic) | 7.0 | 8.5 |
| Government (region) | 6.5 | 8.5 |
| School director / admin | 4.0 | 8.0 |
| Reception | 3.5 | 7.5 |
| Teacher | 3.0 | 8.5 |
| Parent | 3.0 | 8.0 |

---

# 13. Self-audit of THIS report (L3)

Ran `verify-citations.mjs` over this document against both screenshot sets — this run's, and
the 2026-08-14 run's (which §2 legitimately quotes):

```
exact filename citations: 63 | unresolvable: 0
bare ordinal citations  : 218 | unresolvable: 0
rerun screenshots on disk: 97
index rows: 97
```

Every filename and ordinal in this report was resolved against the filesystem before publication,
not after. The index itself was generated from the run's event log and cross-checked against the
files on disk (0 orphans). The failure mode that produced the six fabricated citations in the
prior report — writing a plausible-looking sequence and never opening the index — is what this
check exists to catch.
