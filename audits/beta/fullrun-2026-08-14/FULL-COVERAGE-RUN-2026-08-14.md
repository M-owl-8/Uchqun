# Uchqun — full-coverage single-run report

**Deliverable path:** `C:\work\Uchqun\audits\beta\fullrun-2026-08-14\FULL-COVERAGE-RUN-2026-08-14.md`
**Screenshots (385 files):** `C:\work\Uchqun\audits\beta\fullrun-2026-08-14\screenshots`
**Screenshot index:** `C:\work\Uchqun\audits\beta\fullrun-2026-08-14\screenshot-index.md`
**Raw logs:** `C:\work\Uchqun\audits\beta\fullrun-2026-08-14\logs\` (`events.jsonl`, `console.jsonl`, `network.jsonl`, `railway-backend.jsonl`, `railway-stream.log`, per-phase `*.json`)
**Harness scripts:** `p1-probe.mjs … p9-nav.mjs`, shared `lib.mjs`, in the same directory

---

## 1. Run header

| Field | Value |
|---|---|
| Environment | **Railway production** (owner instruction: staging is unusable) |
| Backend | `https://uchqun-production-b484.up.railway.app/api/v1` |
| Government portal | `https://government-production.up.railway.app` |
| Admin portal | `https://admin-production-536f.up.railway.app` |
| Teacher + Parent portal | `https://teacher-production-0647.up.railway.app` |
| Reception portal | `https://reception-production-ba41.up.railway.app` |
| Repo root | `C:\work\Uchqun` |
| Branch | `main` |
| HEAD SHA | `0c2fecadc80a055b36f083537c2d0e6b8d43de22` |
| `git status --porcelain` at start | `?? P3-Step2-Logging-Plan.pdf` (only) |
| `git status --porcelain` at end | `?? P3-Step2-Logging-Plan.pdf`, `?? audits/beta/fullrun-2026-08-14/` — **no tracked file modified** |
| Browser mode | Playwright 1.60.0 **headless** Chromium, viewport 1440×950, locale `uz`, fresh browser context per role |
| Run window | first screenshot `2026-08-14T03:34:57Z`, last `2026-08-14T05:0xZ` (UTC+5 local 08:34 → 10:0x) |
| Client timezone during run | UTC+5 (matters for defect D-03) |
| What was written, and where | **Only into `smm2` (Samarqand Maxsus Maktab 2)**, plus two school-less government accounts. Proof in §11. |

**Records created by this run** (all carry the literal `SIM-` prefix or the SIM government accounts):

| Table | Count | Detail |
|---|---|---|
| `users` | 2 | `simviloyat@samarqand.uz` (government/region/secondary, Samarqand), `simrespublika@davlat.uz` (government/republic/secondary) |
| `child_attendance` | 14 | 7 dates × 2 children (`smm2` only) — the 3rd child's 7 records were silently dropped by the product, see D-01 |
| `chat_messages` | 3 | `SIM-Absence-D3-01`, `SIM-Absence-D3-02`, `SIM-Withdraw-01` (last one edited then withdrawn through the product's own delete flow) |
| `government_messages` | 2 | `SIM-Escalation-01…` (admin→gov) + its threaded reply |
| `government_school_ratings` | 1 | `smm2`, period `Q3-2026`, 4/5 all indicators |

Nothing was deleted except the one `SIM-Withdraw-01` chat message I created for the express purpose of exercising the withdraw path (soft delete, `deletedAt`).

---

## 2. R0 — Recon inventory

### R0.1 Environment

| Item | Value | Evidence |
|---|---|---|
| Stack | Express 4 + Sequelize 6 + PostgreSQL, ES modules only | `backend/package.json` (`"type":"module"`) |
| Frontends | 4 × React 18 + Vite + react-router-dom + i18next | `government|admin|teacher|reception/src/App.jsx` |
| Portals | 4 apps, 5 personas (teacher app hosts both teacher and parent) | `teacher/src/App.jsx:103-160` |
| Start | backend `npm run start:migrate` (`node config/migrate.js && node server.js`) | `backend/package.json` |
| Deploy | all five services on Railway project **Uchqun** (`Postgres`, `Redis`, `Uchqun`, `government`, `admin`, `teacher`, `reception`) | `railway status`, `railway service` |
| Environments that exist | **local** (`docker-compose.yml`), **production** (Railway). No separate staging service exists in the Railway project. | `railway service` output lists exactly the 7 services above |
| Environment used | **production** — it is where the beta tenants live, and the owner directed it | §2 R0.2 |

### R0.2 Tenant model — L6 gate

A tenant is a row in `schools` (`backend/models/School.js:4`, table `schools`), with `regionId` → `regions` (`School.js:76`). Users bind by `users.schoolId`; children by `children.schoolId`; region-level government accounts bind by `users.govRegionId` (`backend/models/User.js:118-126`).

| slug | Name | Region | Users | Children | Groups | Attendance rows | Chat rows | Media | Activities | Last user `updatedAt` |
|---|---|---|---|---|---|---|---|---|---|---|
| tmm1 | Toshkent Maxsus Maktab 1 | 01 Toshkent | 10 | 3 | 6 | 13 | 25 | 5 | 4 | 2026-06-13 |
| tmm2 | Toshkent Maxsus Maktab 2 | 01 Toshkent | 7 | 3 | 2 | 8 | 5 | 1 | 1 | 2026-06-09 |
| smm1 | Samarqand Maxsus Maktab 1 | 02 Samarqand | 8 | 3 | 2 | 4 | 2 | 0 | 0 | 2026-06-13 |
| **smm2** | **Samarqand Maxsus Maktab 2** | **02 Samarqand** | **7** | **3** | **2** | **3** | **1** | **0** | **0** | **2026-05-30 14:43** |

**Selected tenant: `smm2` (id `5334e23c-a749-4808-8b9a-1f8c67aa1938`).**

L6 proof that it is an unused beta tenant:
1. All 4 schools were inserted in the same transaction: `schools.createdAt = 2026-05-30 13:44:56.848484` for every row — a seed, not organic creation.
2. All 7 `smm2` users share the identical `createdAt = 2026-05-30 13:44:56.848484`.
3. `smm2` has the **oldest** last-touch of any tenant: max `users.updatedAt = 2026-05-30 14:43:02` — untouched since the seed day.
4. Its entire pre-existing activity is 3 attendance rows all dated `2026-06-08` and **one** chat message whose literal content is `P11 beta xabar 58177 — ota-ona javobi 🙏` — a prior automated beta artefact, not a human message.
5. Zero media, zero meals, zero activities, zero IRRs, zero documents, zero ratings.

Gate **PASSED**; write phase proceeded.

### R0.3 Role enumeration — source of truth is code

`backend/models/User.js:35-39`:
```js
role: { type: DataTypes.ENUM('admin', 'reception', 'teacher', 'parent', 'government', 'business'), … }
```
Government sub-dimensions, `backend/models/User.js:113-127`: `govLevel ∈ {republic, region}`, `govType ∈ {main, secondary}`, `govRegionId`, `govAccessGrants` (JSONB).

| Requested role | Concrete role in this system | Account existed in / for target school at run start? |
|---|---|---|
| government (main) | `role=government, govLevel=republic, govType=main` | **yes** — `gov.republic@uchqun.uz` |
| government (secondary) | `role=government, govLevel=republic, govType=secondary` | yes but unusable — `men@davlat.uz` exists with `mustChangePassword=true` and an unknown password; I created a working one |
| region (main) | `role=government, govLevel=region, govType=main, govRegionId=…0002` | **yes** — `gov.samarqand@uchqun.uz` (owns Samarqand → owns smm2) |
| region (secondary) | `role=government, govLevel=region, govType=secondary` | **no** — none existed; I created one |
| school director / admin | `role=admin` (UI label "Direktor") | **yes** — `admin4@uchqun.uz` |
| reception | `role=reception` | **yes** — `reception4@uchqun.uz` |
| teacher | `role=teacher` | yes — `teacher7@`, `teacher8@uchqun.uz` |
| parent | `role=parent` | yes — `parent10@`, `parent11@`, `parent12@uchqun.uz` |
| **business** | `role=business` — **ABSENT as a product** | Backend routes exist (`backend/server.js:174`, `backend/routes/businessRoutes.js:16` `requireRole('business','government')`). **No frontend anywhere references it**: `grep -rl business government/src admin/src teacher/src reception/src` returns 1 hit and it is the English string `"Admin reviews within 1-3 business days"` in `reception/src/locales/en/common.json:445`. There is no business portal, no login surface, and no account of that role in the DB. |

### R0.4 Account creation mechanism

| Role | Product-UI creation path | Password set | Email verification blocks first login? |
|---|---|---|---|
| government (any level/type) | `/government/platform` → "Davlat foydalanuvchilari" → `POST /government/users` (`government/src/pages/Platform.jsx:169`) | initial password typed by creator; `mustChangePassword=true` forces a change on first login (`backend/middleware/auth.js:120-129`) | no email verification exists |
| admin (school director) | `/government/platform` → "Direktorlar" → `POST /government/admins` (`Platform.jsx:99`) | as above | no |
| reception | `/admin/receptions` → "Qabul yaratish" → `POST /admin/receptions` (`admin/src/pages/ReceptionManagement.jsx:238`) | typed by admin | no |
| teacher | `/reception/teachers` → "Tarbiyachi qo'shish" → `POST /reception/teachers` (`reception/src/pages/TeacherManagement.jsx:242`) | typed by reception | no |
| parent + child | `/reception/parents/new` 3-step wizard → `POST /reception/parents` (`reception/src/pages/ParentWizard/ParentWizardPage.jsx:117`) | typed by reception | no |
| admin (self-service) | public `/admin-register` → `AdminRegistrationRequest`, approved by government at `/government/platform` → "Ro'yxatdan o'tish so'rovlari" | credentials delivered by Telegram per on-screen copy (screenshot 380) | n/a |
| business | none | n/a | n/a |

Roles above school level **are** creatable through the UI (government users, admins). See D-02 for whether they actually work.

### R0.5 Screen inventory — the coverage list

Complete; every route mapped to the roles that reach it. Status column is the coverage ledger (§9).

**Government** — `government/src/App.jsx`

| # | Route | file:line | Roles |
|---|---|---|---|
| G1 | `/login` | :56 | anon |
| G2 | `/government` (Dashboard) | :66 | government (all 4 variants) |
| G3 | `/government/change-password` | :67 | government |
| G4 | `/government/schools` | :68 | government |
| G5 | `/government/schools/:id` | :69 | government |
| G6 | `/government/students` | :70 | government |
| G7 | `/government/children/:id` | :71 | government |
| G8 | `/government/teachers` | :72 | government |
| G9 | `/government/parents` | :73 | government |
| G10 | `/government/ratings` | :74 | government |
| G11 | `/government/platform` (4 tabs: Direktorlar · Xabarlar · Davlat foydalanuvchilari · Ro'yxatdan o'tish so'rovlari, `Platform.jsx:41`) | :75 | government |
| G12 | `/government/profile` | :76 | government |
| G13 | `/government/settings` | :77 | government |
| G14 | `/government/admin/:id` | :78 | government |
| G15 | `/government/warnings` | :79 | government |
| G16 | `/government/audit-log` | :80 | government |
| G17 | `/` redirect | :83 | any |
| G18 | `*` NotFound | :84 | any |
| G19 | `/_dnp-preview` | :89 | dev builds only (`import.meta.env.DEV`) |

**Admin** — `admin/src/App.jsx`

| # | Route | file:line |
|---|---|---|
| A1 | `/login` | :56 |
| A2 | `/admin-register` (public) | :57 |
| A3 | `/admin` Dashboard | :67 |
| A4 | `/admin/change-password` | :68 |
| A5 | `/admin/receptions` | :69 |
| A6 | `/admin/parents` | :70 |
| A7 | `/admin/teachers` | :71 |
| A8 | `/admin/groups` | :72 |
| A9 | `/admin/school-ratings` | :73 |
| A10 | `/admin/profile` | :74 |
| A11 | `/admin/settings` | :75 |
| A12 | `/admin/documents` | :76 |
| A13 | `/admin/ai-warnings` | :77 |
| A14 | `/admin/therapy` | :78 |
| A15 | `/admin/import` | :79 |
| A16 | `/admin/school` | :80 |
| A17 | `/admin/teachers/:id` | :81 |
| A18 | `/admin/activity` | :82 |
| A19 | `/admin/children/:id` | :83 |
| A20 | `/admin/communications` | :84 |
| A21 | `/admin/trash` | :85 |
| A22 | `/admin/messages` | :86 |
| A23 | `/admin/irr` | :87 |
| A24 | `/` redirect | :90 |
| A25 | `*` NotFound | :91 |

**Reception** — `reception/src/App.jsx`

| # | Route | file:line |
|---|---|---|
| R1 | `/login` | :44 |
| R2 | `/reception` Dashboard | :54 |
| R3 | `/reception/change-password` | :55 |
| R4 | `/reception/parents` | :56 |
| R5 | `/reception/parents/new` (3-step wizard) | :57 |
| R6 | `/reception/teachers` | :58 |
| R7 | `/reception/groups` | :59 |
| R8 | `/reception/documents` | :60 |
| R9 | `/reception/settings` | :61 |
| R10 | `/reception/profile` | :62 |
| R11 | `/reception/wizard/complete` | :63 |
| R12 | `/` redirect | :66 |
| R13 | `*` NotFound | :67 |

**Teacher** — `teacher/src/App.jsx`

| # | Route | file:line |
|---|---|---|
| T1 | `/login` (teacher tab) | :83 |
| T2 | `/teacher/change-password` | :86 |
| T3 | `/teacher` Dashboard | :136 |
| T4 | `/teacher/bolalar` | :137 |
| T5 | `/teacher/reja` — sub-tabs `activities`, `therapy`, `monitoring` (`Reja.jsx:17`) | :138 |
| T6 | `/teacher/xabar` — sub-tabs `chat`, `warnings` (`Xabar.jsx:52`) | :139 |
| T7 | `/teacher/men` — sub-tabs `profile`, `settings`, `reflection` (`Men.jsx:19`) | :140 |
| T8-T15 | redirects: `/teacher/parents`, `/profile`, `/settings`, `/reflection`, `/activities`, `/therapy`, `/chat`, `/warnings`, `/ai-warnings` | :143-151 |
| T16 | `/teacher/attendance` | :154 |
| T17 | `/teacher/meals` | :155 |
| T18 | `/teacher/media` | :156 |
| T19 | `/teacher/monitoring` | :157 |
| T20 | `/teacher/children/:id` | :158 |
| T21 | `/teacher/children/:id/irr` | :159 |
| T22 | `*` NotFound | :162 |

**Parent** — `teacher/src/App.jsx` (same app, parent persona)

| # | Route | file:line |
|---|---|---|
| P1 | `/login` (parent tab) | :83 |
| P2 | `/change-password` | :95 |
| P3 | `/` Dashboard | :111 |
| P4 | `/child` | :112 |
| P5 | `/activities` | :113 |
| P6 | `/meals` | :114 |
| P7 | `/media` | :115 |
| P8 | `/chat` | :116 |
| P9 | `/notifications` | :117 |
| P10 | `/help` | :118 |
| P11 | `/rating` | :119 |
| P12 | `/settings` | :120 |
| P13 | `/therapy` | :121 |
| P14 | `/irr` | :122 |
| P15 | `/attendance` | :123 |
| P16 | `/journal` | :124 |
| P17 | `*` NotFound | :162 |

### R0.6 Log surfaces

| Surface | How to read it | Result this run |
|---|---|---|
| Backend app log (winston → stdout, Console transport always on, level `info` in prod — `backend/utils/logger.js:76-80`) | `railway logs -s Uchqun -d -n 400 --json` | **Returned only 5 container-start lines from 2026-08-10T09:35Z.** See D-08. |
| Backend live stream | `railway logs -s Uchqun -d` (streamed 75 s while issuing 6 requests) | 0 new lines. `logs/railway-stream.log` |
| Backend file logs | disabled in production by design (`logger.js:14-19`, `canWriteLogs=false` when `NODE_ENV=production`) | n/a |
| DB error/audit table | `audit_log` (append-only, 3 layers per `CLAUDE.md`) read via `postgres-uchqun` MCP and `/government/audit-log` | readable; see D-05 |
| Job/queue logs | none exist — bulk import runs in-process via `setImmediate` (`CLAUDE.md`, T1-7b) | n/a |
| Browser console | captured per page by the harness → `logs/console.jsonl` | 197 rows |
| Failed network requests | captured per page with response bodies → `logs/network.jsonl` | 197 rows |
| Sentry | `@sentry/node` in `backend/package.json`; DSN not inspected from this side | not read (out of scope, no console access) |

### R0.7 External services — EXTERNAL, scored separately

| Service | Purpose | Credential status observed |
|---|---|---|
| **Appwrite Storage** | all media and document file persistence (`backend/config/storage.js` → `uploadFile`) | **DOWN.** Verbatim from production: `MEDIA_UPLOAD_STORAGE_FAILED … "Appwrite upload failed (403): Project is paused due to inactivity. Please restore it from the console to resume operations."` |
| OpenAI / OpenRouter | AI warnings, chat assistant | not exercised (no AI warnings existed to trigger); EXTERNAL |
| Telegram Bot | credential delivery for self-service admin registration (per `/admin-register` copy) | not exercised; EXTERNAL |
| Payme / Click | payment providers | payment routes were deleted (`CLAUDE.md` C-06); not present |
| Redis | lockout + JTI revocation + socket adapter | present as a Railway service; not directly probed |
| Nodemailer / SMTP | e-mail | no e-mail is sent in any flow observed |

---

## 3. R1-ACCOUNTS — credential table

Password pattern: seeded accounts `Test@2026`; accounts created by this run `SimRun@2026`, changed at forced first login to **`SimNew@2026`**.

| Role | Login | Password | How created | First login witnessed | Landing screen |
|---|---|---|---|---|---|
| government · republic · main | `gov.republic@uchqun.uz` | `Test@2026` | pre-seeded 2026-05-30 | ✔ `002_gov-republic_landing.png` | `/government` — Davlat Nazorat Paneli, 4 schools / 12 students |
| government · republic · secondary | `simrespublika@davlat.uz` | `SimNew@2026` | **created through the product UI** (`/government/platform` → Davlat foydalanuvchilari) `176-178` | ✔ `193` forced change-password → `196` changed → `205` re-login | `/government` — "Respublika· ikkilamchi", all 4 schools |
| government · region (Samarqand) · main | `gov.samarqand@uchqun.uz` | `Test@2026` | pre-seeded | ✔ `020_gov-region-samarqand_landing.png` | `/government` — "Viloyat", 2 Samarqand schools |
| government · region (Samarqand) · secondary | `simviloyat@samarqand.uz` | `SimNew@2026` | **created through the product UI** `149-152` | ✔ `184` forced change-password → `187` changed → `202` re-login | `/government` — "Viloyat· ikkilamchi", **correctly scoped to Samarqand only** (`203`) |
| school director / admin @ smm2 | `admin4@uchqun.uz` | `Test@2026` | pre-seeded — **UI creation is broken, see D-02** | ✔ `034_admin-smm2_landing.png` | `/admin` — Boshqaruv paneli |
| reception @ smm2 | `reception4@uchqun.uz` | `Test@2026` | pre-seeded — **UI creation is broken, see D-02** | ✔ `058_reception-smm2_landing.png` | `/reception` — Boshqaruv paneli |
| teacher @ smm2, A-guruh | `teacher7@uchqun.uz` | `Test@2026` | pre-seeded — **UI creation is broken, see D-02** | ✔ `071_teacher-smm2_landing.png` | `/teacher` — Bugun |
| teacher @ smm2, B-guruh | `teacher8@uchqun.uz` | `Test@2026` | pre-seeded | ✔ `360_teacher8-bguruh_landing.png` | `/teacher` — Bugun |
| parent @ smm2 (Sanjar Yusupov) | `parent10@uchqun.uz` | `Test@2026` | pre-seeded — **UI creation is broken, see D-02** | ✔ `100_parent-smm2_landing.png` | `/` — privacy consent gate, then Bugun |
| parent @ smm2 (Nozima Qodirova) | `parent11@uchqun.uz` | `Test@2026` | pre-seeded | ✔ `347_parent11-nozima_landing.png` | `/` |
| parent @ smm2 (Malika Ahmedova) | `parent12@uchqun.uz` | `Test@2026` | pre-seeded | ✔ `353_parent12-malika_landing.png` | `/` |
| business | — | — | **ABSENT** — no portal exists | n/a | n/a |

**Defect-class "role not creatable through product" applies to: admin, reception, teacher, parent** — four of the six creatable roles. Detail in D-02. Government users are the only role the product can actually create.

---

## 4. R2 — day-by-day action log

Back-dating is supported by the product: `teacher/src/pages/Attendance.jsx:346-350` exposes `<input type="date" max={today}>` and `shiftDate` blocks only future dates. **The week therefore ran on 7 real distinct dates, 2026-08-08 … 2026-08-14, not compressed.**

School: `smm2`. Group A-guruh = teacher7 (Sanjar Yusupov, Nozima Qodirova). Group B-guruh = teacher8 (Malika Ahmedova).

| Day | Date | Actor | Action | Screenshots | Outcome |
|---|---|---|---|---|---|
| D1 | 2026-08-08 | teacher7 | attendance, all present, "Hammasi keldi" then save. Save button read `3 dan 3 ta belgilangan · Saqlash` | `209`, `210` | UI success; **2 of 3 rows persisted** |
| D2 | 2026-08-09 | teacher7 | attendance, all present | `211`, `212` | same |
| D3 | 2026-08-10 | teacher7 | attendance; **Sanjar Yusupov → Kasal (sick)** — absence 1. Card `aria-label` read back as `Sanjar Yusupov: Kasal` | `213`, `214` | persisted correctly |
| D3 | — | teacher7 | opens chat with Rano Yusupova, sends `SIM-Absence-D3-01 — Sanjar 2026-08-10 kuni kasal deb belgilandi. Ahvoli qanday?` | `232`, `233`, `234` | delivered |
| D3 | — | parent10 | accepts privacy-consent gate, opens `/chat`, **sees the teacher's message**, replies `SIM-Absence-D3-02 — Rahmat, Sanjar isitmaladi, ertaga keladi.` | `240`, `241` | delivered |
| D3 | — | teacher7 | fresh session, reopens thread, **sees the parent's reply** | `246` | round-trip confirmed |
| D4 | 2026-08-11 | teacher7 | attendance, all present | `215`, `216` | 2 of 3 persisted |
| D4 | — | teacher7 | photo upload for Sanjar: real 10 698-byte PNG (`sim-photo.png`), title `SIM-Media-D4 Sanjar mashgulot`, date 2026-08-11 | `235`, `236`, `237` | **FAILED — EXTERNAL.** `POST /media/upload` → 502 `MEDIA_UPLOAD_STORAGE_FAILED … Appwrite … Project is paused`. Error surfaced correctly to the user as `Fayl yuklanmadi. Qayta urinib ko'ring.` |
| D5 | 2026-08-12 | teacher7 | attendance; **Nozima Qodirova → Yo'q (absent)** — absence 2 | `217`, `218` | persisted correctly |
| D6 | 2026-08-13 | teacher7 | attendance; **Malika Ahmedova → Uyda (home_leave)** — absence 3 | `219`, `220`; repeated with response capture `226`, `227`, `228` | **SILENTLY DROPPED.** See D-01 |
| D7 | 2026-08-14 | teacher7 | attendance, all present | `221`, `222` | 2 of 3 persisted |
| D7 | — | teacher7 | week view witness (Hafta tab) | `223` | grid shows the week |
| — | — | parent10 | edit path: taps own bubble, edits `SIM-Withdraw-01` → `SIM-Withdraw-01 — TAHRIRLANDI 2026-08-14` | `250`, `251`, `252` | edit persisted and re-rendered |
| — | — | parent10 | withdraw path: taps bubble → O'chirish → confirm `Ushbu xabar o'chirilsinmi?` → deleted | `255`, `256`, `257` | toast `Xabar o'chirildi`, message gone |
| — | — | reception4 | daily workflow: dashboard, parents review, groups review | `260`, `264`, `265` | render fine |
| — | — | reception4 | uploads `sim-document.pdf` as Litsenziya | `262`, `263` | **FAILED.** `POST /reception/documents` → 500 `An unexpected error occurred`. Root cause EXTERNAL (same Appwrite `uploadFile`), handling is product-side — see D-06 |
| — | — | admin4 | approval-shaped action: opens `/admin/documents` queue | `268` | **0 approve buttons — queue empty**, because the upload above failed. Approval path BLOCKED (cascade, environmental) |
| — | — | admin4 | escalation: `/admin/messages` → Yangi xabar → `SIM-Escalation-01 davomat masalasi` | `269`–`272` | sent, row `163e1f94…` created |
| — | — | gov.samarqand (region) | regional read **across schools**: `/government/schools` shows exactly the 2 Samarqand schools + CSV export; `/government/students` across both | `276`, `277` | region scoping correct |
| — | — | gov.samarqand | **sees `SIM-Escalation-01`** in Platform → Xabarlar | `279` | hop 2 of the chain confirmed |
| — | — | gov.samarqand | replies `SIM-Escalation-01-REPLY — viloyat nazorati qabul qildi, 2026-08-14.` | `314`–`317` | reply row `d47313af…` created with `parentMessageId` set; gov UI shows "1 javob" |
| — | — | gov.samarqand | regional write: rates `smm2`, period Q3-2026, all 5 indicators 4/5, comment `SIM- viloyat bahosi…` | `319`, `320`, `321` | `government_school_ratings` row created |
| — | — | gov.republic | republic read **across regions**: dashboard regional breakdown (4 schools, 12 students, 2 regions), ratings, audit log | `286`, `289`, `290`, `308`, `309`, `310` | render fine |
| — | — | gov.republic | **sees `SIM-Escalation-01`** at republic level | `288` | hop 3 of the chain confirmed |
| — | — | admin4 | reads back the thread expecting the region's reply | `305`, `325` | **REPLY INVISIBLE — status still "Kutilmoqda".** See D-04 |

**Cross-role chain result:** school → region → republic **works for the outbound leg** (three hops, each screenshotted under its own account). The **return leg is broken**: a government reply never reaches the school.

---

## 5. R3 — eye confirm

Every row = log out, fresh browser context, log in as the role that should see the result, load the page cold.

| # | Expected consequence | Observed consequence | Match | Screenshot |
|---|---|---|---|---|
| 1 | parent10 sees Sanjar sick on **2026-08-10** | Week view shows `M08 10 Bor`, **`M08 11 Kasal`**, and a `Bor` on `M08 15` (a future day with no record). The sick day is rendered one day late. | **NO** | `345` |
| 2 | parent11 sees Nozima absent on **2026-08-12** | Week view shows `M08 12 Bor`, **`M08 13 Yo'q`** — same +1 day shift | **NO** | `351` |
| 3 | parent12 sees Malika on home leave on 2026-08-13 | **All seven days read `Belgilanmagan` (unmarked).** Nothing was ever recorded for this child. | **NO** | `357` |
| 4 | parent12 dashboard reflects the week | `DAVOMAT —`, `TAOMLAR 0/0`, `SURATLAR 0`, `FAOLIYATLAR 0` | consistent with the loss | `358` |
| 5 | teacher8 (Malika's own teacher) sees her week | Grid: `Malika A. — — — — — — — 0/7` while `Nozima Q. 4/7`, `Sanjar Y. 4/7` | **NO** (confirms total loss) | `363` |
| 6 | teacher8 dashboard reflects reality on 2026-08-14 | `3/3 keldi · 100% · normal` with three green dots, although Malika has **no** record for that date and teacher8 personally recorded nothing | **NO** | `361` |
| 7 | parent10 sees the teacher's absence message | `SIM-Absence-D3-01` visible in `/chat` under `parent10@uchqun.uz` | **YES** | `240` |
| 8 | teacher7 sees the parent's reply | `SIM-Absence-D3-02` visible under `teacher7@uchqun.uz` in a fresh session | **YES** | `246` |
| 9 | parent10 retrieves the uploaded photo | gallery empty — upload never happened (EXTERNAL) | n/a — BLOCKED | `242` |
| 10 | gov.samarqand sees the school's escalation | `SIM-Escalation-01` present at region level | **YES** | `279` |
| 11 | gov.republic sees the same escalation | present at republic level | **YES** | `288` |
| 12 | admin4 (sender) sees the region's reply | thread shows only `Sizning xabaringiz`, status badge `Kutilmoqda`; the reply text is absent | **NO** | `325` (school side) vs `317` (gov side showing "1 javob" and the reply body) |
| 13 | the region's school rating is visible downstream | parent10's Fikr-bildirish page shows `UMUMIY 4.0 · Davlat: 4.0 Q3-2026` for Samarqand Maxsus Maktab 2 | **YES** | `336` |
| 14 | new region-secondary gov account is scoped to Samarqand | dashboard "Viloyat· ikkilamchi", 2 schools, 6 students; `/government/schools` lists only the 2 Samarqand schools | **YES** | `202`, `203` |
| 15 | new republic-secondary gov account sees all regions | dashboard "Respublika· ikkilamchi", 4 schools, 12 students | **YES** | `205`, `206` |
| 16 | government audit log shows this run's archive/rating actions with timestamps | rows render but the entire **SANA (date) column is `—` for every row** | **NO** | `016`, `310` |

---

## 6. R4 — logs

### 6.1 Backend application log

`railway logs -s Uchqun -d -n 400 --json` returned **5 lines**, all from the container start at `2026-08-10T09:35:09Z`. A 75-second live stream (`railway logs -s Uchqun -d`) during which I issued 6 requests — 3 × `GET /api/v1/health` (404) and 3 × `POST /api/v1/auth/login` with a non-existent e-mail (401) — produced **zero** new lines (`logs/railway-stream.log`, 5 lines, unchanged).

Those requests must log: `backend/controllers/authController.js:47` `logger.info('Login attempt')` and `:84` `logger.warn('Login attempt with non-existent email')` fire unconditionally, and the winston Console transport is enabled in production at level `info` (`backend/utils/logger.js:76-80`). Across the whole run the backend also had cause to emit `logger.warn('ATTENDANCE_ABSENT safeguarding marker')` (`attendanceController.js:71`), `logger.error('Upload document error')` (`receptionController.js:49`) and ~40 successful-login `info` lines. None are retrievable. See D-08.

### 6.2 HTTP errors observed in the browser, by cause

Baseline noise excluded: `401 GET /auth/me` and `401 POST /auth/refresh` fire once per cold page load before login (106 rows) — expected, not defects.

| n | Status · endpoint | Roles | Body / cause | Screens |
|---|---|---|---|---|
| 28 | `404 GET /s/inter/v20/…woff2` | teacher-smm2 | self-hosted Inter font file missing on the teacher/parent portal — a console error on every page load | all teacher/parent screens |
| 10 | `404 GET /teacher/children/:id/irr` | teacher | no IRR exists for the child; UI degrades correctly ("Bola uchun yangi IRR tuzing") but logs an error each time | `087` |
| 8 | `400 GET /parent/ratings` | parent10, parent-smm2 | `parentTeacherRatingController.js:64-66` returns **400** when `parent.teacherId` is null. All three smm2 parents have `teacherId = NULL`. | `109`, `336` |
| 6+4+4+4+4+2 | `403 … PASSWORD_CHANGE_REQUIRED` | the two new SIM gov accounts | correct enforcement of the forced-change gate before the password was changed | `184`, `193` |
| 6 | `404 GET /{admin,government}/children/:id/irr*` | admin, government | same no-IRR case as above | `050`, `007` |
| 2 | `403 GET /meals?childId=…` | teacher-smm2 | teacher7 loading the Meals page for a child outside her group — same scope mismatch as D-01 | `083` |
| 2 | `400 POST /government/admins` | gov-republic | `{"error":"Validation failed","details":[{"field":"email","message":"Please provide a valid email address"}]}` | `153` |
| 2 | `400 POST /reception/teachers` | reception | same body | `162` |
| 1 | `400 POST /admin/receptions` | admin | same body | `172` |
| 1 | `400 POST /reception/parents` | reception | same body **plus** `child[gender] must be one of: male, female, MALE, FEMALE` | — |
| 1 | `502 POST /media/upload` | teacher | `MEDIA_UPLOAD_STORAGE_FAILED … Appwrite … Project is paused` — EXTERNAL | `236` |
| 1 | `500 POST /reception/documents` | reception | `{"success":false,"error":"An unexpected error occurred"}` — EXTERNAL cause, product-side handling | `262` |

### 6.3 Silent errors (page looks fine, console throws)

| Screen | Symptom |
|---|---|
| every teacher/parent page | font `404` in console, page renders normally |
| `/teacher/children/:id/irr`, `/admin/children/:id`, `/government/children/:id` | IRR `404`s in console, page shows a correct empty state |
| `/rating` (parent) | `400` in console; the page **does** show a correct notice, but also renders a large empty white card below it |

### 6.4 Error count per role and per screen

| Role | Non-baseline error rows |
|---|---|
| teacher-smm2 | 43 (28 font, 10 IRR, 2 meals-403, 1 media-502, 2 other) |
| parent-smm2 / parent10-sanjar | 10 (8 ratings-400, 2 IRR-404) |
| gov-region-secondary-SIM / gov-republic-secondary-SIM | 24 (all `PASSWORD_CHANGE_REQUIRED`, expected) |
| gov-republic | 5 (3 IRR-404, 2 admins-400) |
| admin-smm2 | 7 (6 IRR-404, 1 receptions-400) |
| reception-smm2 | 3 (2 teachers-400, 1 documents-500 — plus 1 parents-400) |
| parent11, parent12, teacher8, gov-region-samarqand | 0 non-baseline |

---

## 7. R5 — defect ledger

| ID | Severity | Role | Screen | Reproduction | Evidence | Product / EXTERNAL | Blocks buyer demo |
|---|---|---|---|---|---|---|---|
| **D-01** | **blocks-use** | teacher, parent, admin | `/teacher/attendance` → parent `/attendance` | 1. Log in as `teacher7@uchqun.uz`. 2. `/teacher/attendance`, set date 2026-08-13. 3. "Hammasi keldi" — the grid shows **3** children, including Malika Ahmedova who belongs to B-guruh. 4. Tap Malika once → "Uyda". 5. Save; button reads `3 dan 3 ta belgilangan · Saqlash`. 6. Green toast `Davomat saqlandi`, app navigates to `/teacher`. 7. Log in as `parent12@uchqun.uz` → `/attendance` → Hafta. | Screens `226`, `227`, `357`, `363`. Verbatim response: `HTTP 201 {"success":true,"data":{"saved":2,"skipped":0,"errors":[{"childId":"f52ed345-…","code":"ATTENDANCE_ACCESS_DENIED"}]}}`. DB: only 14 rows for 7 days × 3 children. Cause: `backend/controllers/teacherController.js:235` returns **all school children**; `backend/controllers/attendanceController.js:46-48` rejects children outside the teacher's group; `:82-88` returns 400 **only if `saved === 0`**, so a partial denial is reported as success; `teacher/src/pages/Attendance.jsx:222-226` never inspects `data.errors`. | Product | **YES** |
| **D-02** | **blocks-use** | government, admin, reception | `/government/platform`, `/admin/receptions`, `/reception/teachers`, `/reception/parents/new` | Fill any of the four account-creation forms completely and submit. | Screens `153`, `162`, `172`. All four return `400 {"error":"Validation failed","details":[{"field":"email","message":"…valid email address"}]}`; UI shows an untranslated red toast **`Validation failed`** naming no field, while the form's own Email field is filled and shows a valid login preview (`Login: sim.direktor@smm2.uz`). Cause: every frontend sends `localPart` — `government/src/components/tabs/AdminsTab.jsx:64`, `admin/src/pages/ReceptionManagement.jsx:14` (`EMPTY_CREATE_FORM`), `reception/src/pages/TeacherManagement.jsx:235-241`, `reception/src/pages/ParentWizard/ParentWizardPage.jsx:16` — while every validator requires `email`: `backend/validators/governmentUserValidator.js:13`, `backend/validators/adminValidator.js:6`, `backend/validators/receptionValidator.js:8` and `:31`. **No school can be onboarded through the product.** The parent wizard additionally fails on `child[gender]`. | Product | **YES** |
| **D-03** | **blocks-use** | parent | `/attendance` (Hafta) | Log in as any parent, open `/attendance`, switch to "Hafta". | Screens `345`, `351`. Header reads `2026-08-09 – 2026-08-15` while the seven cards are labelled `M08 10 … M08 16`; Sanjar's 2026-08-10 sick record appears under **M08 11**; Nozima's 2026-08-12 absence appears under **M08 13**; `M08 15` (future) is highlighted as "today" and shows `Bor`. Cause: `teacher/src/parent/pages/Attendance.jsx:45` `isoOf = d => new Date(d).toISOString().slice(0,10)` applied to a **local-midnight** Date built at `:41` (`setHours(0,0,0,0)`). At UTC+5 that shifts every key back one day, so each card looks up the previous day's record while displaying its own date. The teacher's grid is unaffected because `teacher/src/pages/Attendance.jsx:38` anchors at `T12:00:00`. **Parents are shown the wrong day for their child's absence.** | Product | **YES** |
| **D-04** | **blocks-use** | admin ← government | `/admin/messages` | 1. As `admin4@uchqun.uz` send a message to government. 2. As `gov.samarqand@uchqun.uz` open Platform → Xabarlar → Javob, reply, send. 3. Back as `admin4@uchqun.uz`, open `/admin/messages`. | Screens `317` (gov side: "1 javob", reply body and author visible) vs `325` (school side: badge `Kutilmoqda`, only `Sizning xabaringiz`). DB: reply stored as a child row `d47313af…` with `parentMessageId=163e1f94…`, while the parent row's scalar `reply` column is still `NULL`. Cause: `backend/controllers/admin/adminMessageController.js:11-15` returns bare rows with no `replies` include; `admin/src/pages/GovMessages.jsx:170,180` renders only `selected.reply`. **A government answer never reaches the school that asked.** | Product | **YES** |
| **D-05** | degrades-use | government | `/government/audit-log` | Open the page as any government account. | Screens `016`, `310` — the **SANA column is `—` on every row**. Cause: the API returns `occurredAt` (`audit_log` has no `createdAt`; `backend/controllers/governmentController.js:1286` orders by `occurredAt`) but `government/src/pages/AuditLog.jsx:211` renders `formatDateTime(entry.createdAt)`, and `:63` returns `'—'` for undefined. `admin/src/pages/ActivityFeed.jsx:213` uses `occurredAt` correctly, so the bug is isolated to the government audit log — the one screen a regulator would open. | Product | **YES** |
| **D-06** | degrades-use | reception | `/reception/documents` | Select a document type and upload any valid PDF/JPG/PNG. | Screen `262`. `POST /reception/documents` → `500 {"success":false,"error":"An unexpected error occurred"}`, surfaced as a red toast reading the raw English string **"An unexpected error occurred"** — untranslated, no error code, no guidance. The underlying cause is EXTERNAL (Appwrite), but the media path handles the same outage far better (`502` + `MEDIA_UPLOAD_STORAGE_FAILED` + localised `Fayl yuklanmadi. Qayta urinib ko'ring.`, screen `236`). Consequence: the reception→admin document-approval workflow cannot be demonstrated at all (`/admin/documents` queue empty, screen `268`). | Product (handling) + EXTERNAL (cause) | YES, for the approval workflow |
| **D-07** | degrades-use | teacher, parent | `/teacher`, `/teacher/bolalar` | Open the teacher dashboard on a day with no attendance taken. | Screen `072` (taken before any write in this run): shows `DAVOMAT 3 / 3 keldi`, `100% · normal`, three green "present" dots — while **zero** `child_attendance` rows existed for `smm2` on 2026-08-14 (DB at that moment held exactly 3 rows for this school, all dated 2026-06-08). Screen `361` (teacher8, after the week was written) still shows `3/3 · 100%` although only 2 of that day's 3 children have a record and teacher8 personally recorded nothing. Cause: `teacher/src/pages/Dashboard.jsx:62` `present: rawStats.present \|\| …filter(…).length \|\| rawChildren.length` — both real values are `0` (falsy) so it falls through to the head-count; `:198,306` `state={child.attendanceState \|\| 'present'}` defaults unknown to present. The teacher's own Attendance screen simultaneously reads `3 dan 0 ta belgilangan` — two screens in the same app contradict each other. `/teacher/bolalar` compounds it with the caption "Sizning guruhingiz bolalari" over children from another group. | Product | **YES** |
| **D-08** | degrades-use | ops | backend | `railway logs -s Uchqun -d -n 400 --json`; then stream `railway logs -s Uchqun -d` for 75 s while issuing requests. | Both return only the 5 container-start lines from `2026-08-10T09:35:09Z` (`logs/railway-backend.jsonl`, `logs/railway-stream.log`). No `Login attempt` (`authController.js:47`), no `Login attempt with non-existent email` (`:84`), no `ATTENDANCE_ABSENT safeguarding marker` (`attendanceController.js:71`), no `Upload document error` (`receptionController.js:49`) — despite ~40 logins, 3 forced failures, 3 absences and a 500 during the window. Winston's Console transport is unconditionally enabled at `info` in production (`backend/utils/logger.js:76-80`). No production observability for auth, safeguarding or 5xx. Whether errors still reach Sentry was not checked from this side. | Product / infra | no (but blocks incident response) |
| **D-09** | degrades-use | teacher | `/teacher/meals` | Try to reach the Meals page from anywhere in the teacher UI. | `grep -rn "teacher/meals" teacher/src --include=*.jsx` returns **only** `App.jsx:155`. The page exists and renders (`083`), the 5-tab IA has no entry for it, and no other page links to it. Meanwhile the parent portal shows `Taomlar va ovqatlanish (0)` (`104`) — a parent-facing feature the school can never populate. `/teacher/media` is only reachable from a per-child page (`teacher/src/pages/ChildDetail.jsx:271`). | Product | YES for the meals story |
| **D-10** | degrades-use | admin, government | `/admin/import`, `/admin/trash`, `/admin/school`, `/admin/profile`, `/government/students`, `/government/teachers`, `/government/parents` | Log in and enumerate every visible link on the landing page. | `logs/p9-nav.json`. Admin exposes 14 links, none pointing to `/admin/import`, `/admin/trash`, `/admin/school`, `/admin/profile` — yet Bulk Import is a fully built 5-step wizard (`047`). Government exposes 8 links, none to `/government/students`, `/government/teachers`, `/government/parents`, all of which render real data (`006`, `008`, `009`). | Product | partly — the demo cannot show bulk import without a hand-typed URL |
| **D-11** | degrades-use | parent | `/rating` ("Fikr bildirish") | Open the page as any parent. | Screen `336`, `logs/network.jsonl`: `GET /parent/ratings` → **400** `Assigned teacher not found`. All three smm2 parents have `users.teacherId = NULL` (the teacher link is only derivable via child→group→teacher). Cause: `backend/controllers/parent/parentTeacherRatingController.js:64-66` returns a client-error 400 for an ordinary empty state. The UI degrades politely ("Biriktirilgan tarbiyachi topilmadi…") but **no parent can ever rate a teacher**, and a blank white card is left on the page. | Product | no |
| **D-12** | cosmetic | teacher, teacher8 | `/teacher` | Open the teacher dashboard. | Screens `072`, `361`: the greeting renders `"" Guruh · 3 bola` — literal empty quotes. Cause: `teacher/src/pages/Dashboard.jsx:157` interpolates `children[0]?.groupName` while `backend/controllers/teacherController.js:238-240` selects only `['id','firstName','lastName','dateOfBirth','gender','schoolId','groupId','class']` — `groupName` is never returned. | Product | YES (first screen of the demo) |
| **D-13** | cosmetic | teacher, parent | `/teacher/change-password`, `/change-password` | Navigate directly while `mustChangePassword=false`. | Screens `097`, `115`: the page reads "Davom etishdan oldin yangi parol o'rnatish kerak" ("you must set a new password before continuing") for a user under no such obligation. | Product | no |
| **D-14** | cosmetic | all (teacher/parent portal) | every page | Open any teacher or parent page with the console open. | 28 × `404 GET /s/inter/v20/…woff2` — the self-hosted Inter font is missing from the teacher/parent deployment. Text still renders via fallback. | Product | no |
| **D-15** | cosmetic | reception | `/reception/teachers` | Open the create-teacher modal. | Screen `162`: the e-mail suffix chip reads `@smm2`, missing `.uz`, while the equivalent government form shows `@smm2.uz` (screen `153`). | Product | no |
| **X-01** | blocks-use | teacher, parent, reception | media + document upload | Upload any file anywhere. | `502 MEDIA_UPLOAD_STORAGE_FAILED … "Appwrite upload failed (403): Project is paused due to inactivity."` (screen `236`), `500` on documents (screen `262`). | **EXTERNAL** — excluded from the usability score | YES until the storage project is restored |

---

## 8. R6 — verdict

### 8.1 Rubric (stated before scoring)

Usability only: *can a real school run one week on this, unassisted?* External-service gaps are excluded. Ten points, allocated:

| Weight | Criterion |
|---|---|
| 3 | **Truthfulness** — what the UI reports matches what the system stored, and what a second account sees |
| 2 | **Completability** — the role's core weekly loop can be finished end-to-end without a workaround |
| 2 | **Onboarding** — the role's own accounts and records can be created through the product |
| 1.5 | **Reachability** — the features that exist can be found from navigation |
| 1 | **Error legibility** — failures are named, localised, and actionable |
| 0.5 | **Polish** — labels, empty states, console cleanliness |

### 8.2 Scores

| Role | Score | Reasoning |
|---|---|---|
| Government (republic, main & secondary) | **7 / 10** | Truthful and complete for reading across regions; region scoping is correct and was proven with a purpose-built secondary account (`202`, `203`). Loses points for the dateless audit log (D-05), three orphaned top-level routes (D-10), and being unable to create a school director (D-02). |
| Government (region, main & secondary) | **6.5 / 10** | Reads across schools correctly, rates schools successfully, and the rating propagates all the way to a parent's screen (`336`). Loses points because its reply to a school is invisible to that school (D-04) and for D-05/D-10. |
| School director / admin | **4 / 10** | Can read the school and escalate upward. Cannot create a reception account (D-02), cannot see the government's answer (D-04), cannot process a document approval (D-06/X-01), and four of its own pages are unreachable (D-10). |
| Reception | **3.5 / 10** | Dashboard and lists are the most polished surfaces in the product (`059`). But its entire reason to exist — creating teachers and enrolling parents + children — is 100 % blocked (D-02), and document upload returns a raw English 500 (D-06). |
| Teacher | **3 / 10** | Attendance back-dating, the 5-tab IA, and parent chat all work well. But the dashboard fabricates a 100 % attendance figure on a day nothing was recorded (D-07), the roster shows children from another group with the caption "your group's children", marking one of them reports success and discards the record (D-01), the group name renders as `""` (D-12), and Meals is unreachable (D-09). |
| Parent | **3 / 10** | Chat (send, receive, edit, withdraw) is genuinely good and fully round-tripped. The privacy-consent gate is well written. But the attendance week — the parent's single most-used screen — displays every status on the wrong day (D-03), one parent sees nothing at all (D-01), and teacher rating is permanently unavailable (D-11). |
| **Product as a whole** | **3.5 / 10** | Read paths are broadly solid and the hierarchy genuinely works. Write paths are not trustworthy: the product tells users their data was saved when it was not, shows parents the wrong day, and cannot create the accounts a school is made of. |

### 8.3 Buyer-demo answer

Standard assumed, as stated in the brief: *one school, every role, one week, unassisted.*

## **CANNOT SHOW**

Four defects each independently break the demo:

1. **D-02** — you cannot stand up a school in front of the buyer. Every account-creation form in the product returns `Validation failed`. The demo would have to run entirely on pre-seeded rows, and any "let me add a teacher for you" moment fails on screen.
2. **D-01** — the headline daily workflow lies. The teacher marks three children, the app says "3 of 3 marked · saved" and shows a green *Davomat saqlandi*, and one child's record — including an absence — is discarded. A buyer who cross-checks on the parent app sees an empty week.
3. **D-03** — the parent app shows the absence on the wrong day. For a special-education regulator this is the demo's most damaging single screen.
4. **D-04** — the government replies to the school, and the school's inbox still reads *Kutilmoqda*. The escalation story, which is the platform's reason to exist, visibly dead-ends.

**D-07** and **D-12** additionally corrupt the very first screen a teacher sees.

### 8.4 Shortest ordered fix list to move CANNOT → CAN

Ordered by demo impact per unit of change. No effort estimates are given because I have no basis to ground them.

| # | Fix | Defect | Change |
|---|---|---|---|
| 1 | Accept `localPart` on the four account-creation endpoints (or send `email` from the four forms). Compose `localPart + '@' + school.slug + '.uz'` server-side before validation, and map `child[gender]` in the wizard. | **D-02** | `backend/validators/governmentUserValidator.js:13`, `adminValidator.js:6`, `receptionValidator.js:8` and `:31` — plus the gender enum in the parent wizard payload |
| 2 | Make partial attendance saves fail loudly, and stop showing children the teacher cannot record. Return non-2xx (or surface `data.errors`) when `errors.length > 0`, and scope `getChildren` to the teacher's group. | **D-01**, and it also removes the meals 403 | `backend/controllers/attendanceController.js:82-88`, `backend/controllers/teacherController.js:235`, `teacher/src/pages/Attendance.jsx:222-226` |
| 3 | Replace `toISOString()` date keying in the parent attendance view with a local-date formatter (the teacher page's `T12:00:00` anchor is the working precedent). | **D-03** | `teacher/src/parent/pages/Attendance.jsx:45` |
| 4 | Include `replies` in the school's own message query and render the thread, not the legacy scalar `reply`. | **D-04** | `backend/controllers/admin/adminMessageController.js:11-15`, `admin/src/pages/GovMessages.jsx:170-180` |
| 5 | Stop defaulting unknown attendance to "present" on the teacher dashboard; render an explicit unrecorded state. | **D-07** | `teacher/src/pages/Dashboard.jsx:62,198,306` |
| 6 | Return `groupName` from the teacher children endpoint (or stop interpolating it). | **D-12** | `backend/controllers/teacherController.js:238-240`, `teacher/src/pages/Dashboard.jsx:157` |
| 7 | Render `occurredAt` in the government audit log. | **D-05** | `government/src/pages/AuditLog.jsx:211` |
| 8 | Restore the Appwrite project, then re-run the document-upload → admin-approval leg. | **X-01**, unblocks **D-06** | external console |

Items 1–4 are the minimum that moves the verdict. 5–7 are one-line changes on screens the demo cannot avoid.

---

## 9. Coverage ledger

Every route from R0.5. `EXERCISED` = loaded under an authorised account with a screenshot.

### Government (19)

| Route | Status | Screens |
|---|---|---|
| `/login` | EXERCISED | `001`, `010`, `012`, `183`, `192`, `201`, `204` |
| `/government` | EXERCISED (4 gov variants) | `003`, `021`, `202`, `205`, `286`, `309` |
| `/government/change-password` | EXERCISED (incl. real forced change) | `017`, `185`–`187`, `194`–`196` |
| `/government/schools` | EXERCISED | `004`, `022`, `203`, `206`, `276` |
| `/government/schools/:id` | EXERCISED (incl. rating write) | `005`, `023`, `318`–`321` |
| `/government/students` | EXERCISED | `006`, `024`, `277` |
| `/government/children/:id` | EXERCISED | `007` |
| `/government/teachers` | EXERCISED | `008`, `025` |
| `/government/parents` | EXERCISED | `009`, `026` |
| `/government/ratings` | EXERCISED | `010`, `027`, `289`, `308` |
| `/government/platform` — tab Direktorlar (default) | EXERCISED (incl. create attempt) | `011`, `028`, `153`, `154` |
| `/government/platform` — tab Xabarlar | EXERCISED (incl. reply write) | `279`, `288`, `313`–`317`, `384` |
| `/government/platform` — tab Davlat foydalanuvchilari | EXERCISED (2 accounts created) | `150`–`152`, `176`–`178`, `385` |
| `/government/platform` — tab Ro'yxatdan o'tish so'rovlari | EXERCISED | `383` |
| `/government/profile` | EXERCISED | `012`, `032` |
| `/government/settings` | EXERCISED | `013`, `029` |
| `/government/admin/:id` | EXERCISED | `014` |
| `/government/warnings` | EXERCISED | `015`, `031` |
| `/government/audit-log` | EXERCISED | `016`, `030`, `290`, `310` |
| `/` redirect | EXERCISED | implicit on every login |
| `*` NotFound | EXERCISED | `018` |
| `/_dnp-preview` | **NOT-APPLICABLE-TO-ANY-ROLE** — dev-only, guarded by `import.meta.env.DEV` (`App.jsx:87`) and tree-shaken from the production build | — |

### Admin (25)

| Route | Status | Screens |
|---|---|---|
| `/login` | EXERCISED | `003`, `014`, `034` |
| `/admin-register` | EXERCISED (public, unauthenticated) | `380` |
| `/admin` | EXERCISED | `035` |
| `/admin/change-password` | EXERCISED | `055` |
| `/admin/receptions` | EXERCISED (incl. create attempt) | `036`, `170`–`173` |
| `/admin/parents` | EXERCISED | `037` |
| `/admin/teachers` | EXERCISED | `038` |
| `/admin/teachers/:id` | EXERCISED | `039` |
| `/admin/groups` | EXERCISED | `040` |
| `/admin/school-ratings` | EXERCISED | `041` |
| `/admin/profile` | EXERCISED | `042` |
| `/admin/settings` | EXERCISED | `043` |
| `/admin/documents` | EXERCISED (queue empty — see D-06) | `044`, `268` |
| `/admin/ai-warnings` | EXERCISED | `045` |
| `/admin/therapy` | EXERCISED | `046` |
| `/admin/import` | EXERCISED (wizard step 1; not run — CSV import would create child records and was out of the simulation's scope) | `047` |
| `/admin/school` | EXERCISED | `048` |
| `/admin/activity` | EXERCISED | `049`, `273`, `367` |
| `/admin/children/:id` | EXERCISED | `050`, `366` |
| `/admin/communications` | EXERCISED | `051` |
| `/admin/trash` | EXERCISED | `052` |
| `/admin/messages` | EXERCISED (compose + send + read-back) | `053`, `268`–`272`, `305`, `325` |
| `/admin/irr` | EXERCISED | `054` |
| `/` redirect | EXERCISED | implicit |
| `*` NotFound | EXERCISED | `056` |

### Reception (13)

| Route | Status | Screens |
|---|---|---|
| `/login` | EXERCISED | `004`, `016`, `058` |
| `/reception` | EXERCISED | `059`, `260` |
| `/reception/change-password` | EXERCISED | `068` |
| `/reception/parents` | EXERCISED | `060`, `264` |
| `/reception/parents/new` (3 steps) | EXERCISED (all 3 steps filled and submitted — blocked by D-02) | `061`, `140`–`147`, `164`–`168` |
| `/reception/teachers` | EXERCISED (create attempted — blocked by D-02) | `062`, `160`–`163` |
| `/reception/groups` | EXERCISED | `063`, `265` |
| `/reception/documents` | EXERCISED (upload attempted — blocked by X-01) | `064`, `261`–`263` |
| `/reception/settings` | EXERCISED | `065` |
| `/reception/profile` | EXERCISED | `066` |
| `/reception/wizard/complete` | EXERCISED | `067` |
| `/` redirect | EXERCISED | implicit |
| `*` NotFound | EXERCISED | `069` |

### Teacher (22)

| Route | Status | Screens |
|---|---|---|
| `/login` (teacher tab) | EXERCISED | `006`, `018`, `070` |
| `/teacher/change-password` | EXERCISED | `097` |
| `/teacher` | EXERCISED (teacher7 + teacher8) | `072`, `361` |
| `/teacher/bolalar` | EXERCISED | `073` |
| `/teacher/reja?tab=activities` | EXERCISED | `074`, `092` |
| `/teacher/reja?tab=therapy` | EXERCISED | `075`, `093` |
| `/teacher/reja?tab=monitoring` | EXERCISED | `076` |
| `/teacher/xabar?tab=chat` | EXERCISED (send + receive) | `077`, `094`, `231`–`234`, `246` |
| `/teacher/xabar?tab=warnings` | EXERCISED | `078`, `095`, `096` |
| `/teacher/men?tab=profile` | EXERCISED | `079`, `089` |
| `/teacher/men?tab=settings` | EXERCISED | `080`, `090` |
| `/teacher/men?tab=reflection` | EXERCISED | `081`, `091` |
| `/teacher/attendance` | EXERCISED (7 write cycles + week view) | `082`, `209`–`228`, `363` |
| `/teacher/meals` | EXERCISED by URL — **unreachable from navigation, see D-09** | `083` |
| `/teacher/media` | EXERCISED (upload attempted — blocked by X-01) | `084`, `235`–`237` |
| `/teacher/monitoring` | EXERCISED | `085` |
| `/teacher/children/:id` | EXERCISED | `086` |
| `/teacher/children/:id/irr` | EXERCISED | `087` |
| `/teacher/parents` redirect | EXERCISED | `088` |
| `/teacher/profile · settings · reflection · activities · therapy · chat · warnings · ai-warnings` redirects | EXERCISED (all 8) | `089`–`096` |
| `*` NotFound | EXERCISED | `098` |

### Parent (17)

The P2 pass (`101`–`116`) was captured **behind the blocking privacy-consent modal** and is not a valid witness for those pages. A full re-sweep was run after accepting the gate; those are the authoritative screens.

| Route | Status | Screens (post-consent) |
|---|---|---|
| `/login` (parent tab) | EXERCISED | `099`, `100`, `326`, `346`, `352` |
| privacy-consent gate | EXERCISED (accepted on all three parent accounts) | `127`, `128` (parent10); `348`, `349` (parent11); `354`, `355` (parent12) |
| `/` Dashboard | EXERCISED | `328`, `358` |
| `/child` | EXERCISED | `329` |
| `/activities` | EXERCISED | `330` |
| `/meals` | EXERCISED | `331` |
| `/media` | EXERCISED | `332`, `242` |
| `/chat` | EXERCISED (receive, reply, edit, withdraw) | `333`, `240`, `241`, `249`–`257` |
| `/notifications` | EXERCISED | `334` |
| `/help` | EXERCISED | `335` |
| `/rating` | EXERCISED | `336` |
| `/settings` | EXERCISED | `337` |
| `/therapy` | EXERCISED | `338` |
| `/irr` | EXERCISED | `339` |
| `/attendance` | EXERCISED (day + week, all three parents) | `340`, `344`, `345`, `350`, `351`, `356`, `357` |
| `/journal` | EXERCISED | `341` |
| `/change-password` | EXERCISED | `342` |
| `*` NotFound | EXERCISED | `343` |

**No route is unmentioned. One route is NOT-APPLICABLE (`/_dnp-preview`, dev-only). Zero routes are BLOCKED at the navigation level; two are reachable only by typed URL (D-09, D-10).**

---

## 10. CHANGES-MADE (L7)

**None.** No file in the repository was created, edited, or deleted outside the new, untracked run directory `audits/beta/fullrun-2026-08-14/` (harness scripts, screenshots, logs, this report). `git status --porcelain` at the end of the run shows only `?? P3-Step2-Logging-Plan.pdf` (pre-existing) and `?? audits/beta/fullrun-2026-08-14/`. Nothing was committed or pushed.

---

## 11. BLOCKED list

### Genuine — the product cannot do it

| Item | What I attempted | The wall | Evidence |
|---|---|---|---|
| Create a school director through the UI | `/government/platform` → Direktorlar, all fields valid, "Yaratish" | `400 Validation failed` on field `email`; red toast reads only `Validation failed` | `153`, `154` |
| Create a reception account through the UI | `/admin/receptions` → Qabul yaratish → Qabulni yaratish | same 400 | `171`–`173` |
| Create a teacher through the UI | `/reception/teachers` → Tarbiyachi qo'shish → Yaratish | same 400 | `162`, `163` |
| Create a parent + child through the UI | `/reception/parents/new`, all 3 steps completed incl. group assignment, "Yakunlash" | `400` on `email` **and** `child[gender]` | `164`–`168` |
| Exercise a `business`-role account | searched all four frontends for any business surface | no portal, no login, no route, no account — backend-only (`backend/routes/businessRoutes.js:16`) | §2 R0.3 |
| Admin document-approval action | `/admin/documents` after the reception upload | queue empty — 0 approve buttons, because the upload could not succeed | `268` |
| Parent rates a teacher | `/rating` | `400 Assigned teacher not found`; `users.teacherId` is NULL for every parent | `336` |
| Reach `/teacher/meals` from the UI | enumerated every link and nav button on the teacher landing page | no link exists anywhere in `teacher/src` | `logs/p9-nav.json` |

### Environmental — not product defects

| Item | The wall |
|---|---|
| Photo upload and retrieval by a second account | Appwrite storage project is **paused**: `502 MEDIA_UPLOAD_STORAGE_FAILED … "Project is paused due to inactivity."` The product's own handling was correct (localised toast). Owner has stated storage credentials will be rotated on the UzCloud migration. |
| Reception document upload | same Appwrite dependency, surfaced as a bare `500` (the handling gap is logged separately as D-06) |
| Backend application log retrieval | `railway logs` returns only container-start lines; whether that is a CLI limitation or a broken log pipeline is **[UNVERIFIED]** — recorded as D-08 with that caveat |
| Sentry-side error visibility | not inspected; no console access in scope |
| `men@davlat.uz` (pre-existing republic-secondary account) | `mustChangePassword=true` with an unknown password; I created a working replacement rather than reset it |

---

## 12. Screenshot index

385 files, numbered sequentially in capture order, at:

**`C:\work\Uchqun\audits\beta\fullrun-2026-08-14\screenshots`**

Naming: `NNN_role_action.png`. The full table (file · role · action · path) is `screenshot-index.md` in the same directory. Ranges:

| Range | Phase |
|---|---|
| `001`–`116` | R0.5 read-only route sweep, all six personas (`p2-sweep.mjs`) |
| `117`–`148` | form discovery + first provisioning attempt (`p3a`, `p3b`) |
| `149`–`178` | R1 provisioning retries and the two government accounts created (`p3b2`, `p3b3`, `p3c`) |
| `179`–`206` | forced first-login, password change, scope verification for both SIM government accounts (`p3d`, `p3e`) |
| `207`–`228` | the 7-day attendance week + the response-capture proof of D-01 (`p4`, `p4b`) |
| `229`–`257` | absence chat thread, media upload attempt, edit and withdraw paths (`p5`, `p5b`, `p5c`) |
| `258`–`294` | reception daily workflow, document upload, admin escalation, region and republic hops (`p6`) |
| `295`–`325` | government reply, school rating, admin read-back (`p7`, `p7b`) |
| `326`–`367` | R3 eye-confirm: post-consent parent sweep and the three parents' attendance weeks, teacher8, admin (`p8`) |
| `368`–`380` | navigation reachability audit + public `/admin-register` (`p9`) |
| `381`–`385` | remaining government Platform tabs captured explicitly (Ro'yxatdan o'tish so'rovlari, Xabarlar, Davlat foydalanuvchilari) |

---

## 13. CORRECTIONS (added 2026-08-14 by the P0 citation audit of the follow-up run)

An automated audit (`p0-citation-audit.mjs`, output `p0-citation-audit.json`) re-checked
every screenshot reference in this report against `screenshot-index.md`.

**Exact-filename citations: 9 total, 6 wrong.** All six were in the R1-ACCOUNTS table of
§3, and all six were fabricated as a plausible odd-number sequence (011, 013, 015, 017,
019, 021) instead of being read from the index. Those ordinals exist but name entirely
different screens. Corrected in place:

| Line | Cited (wrong) | Actual file at that ordinal | Corrected to |
|---|---|---|---|
| 265 | `011_gov-republic_landing.png` | `011_gov-republic_platform.png` | `002_gov-republic_landing.png` |
| 267 | `013_gov-region-samarqand_landing.png` | `013_gov-republic_settings.png` | `020_gov-region-samarqand_landing.png` |
| 269 | `015_admin-smm2_landing.png` | `015_gov-republic_ai-warnings.png` | `034_admin-smm2_landing.png` |
| 270 | `017_reception-smm2_landing.png` | `017_gov-republic_change-password.png` | `058_reception-smm2_landing.png` |
| 271 | `019_teacher-smm2_landing.png` | `019_gov-region-samarqand_login-form.png` | `071_teacher-smm2_landing.png` |
| 273 | `021_parent-smm2_landing.png` | `021_gov-region-samarqand_dashboard.png` | `100_parent-smm2_landing.png` |

The three exact-filename citations that were already correct:
`360_teacher8-bguruh_landing.png`, `347_parent11-nozima_landing.png`,
`353_parent12-malika_landing.png`.

**Bare-ordinal citations: 383 total, 0 wrong.** Every backticked three-digit ordinal
resolves to a file that exists. Seven apparent misses are HTTP status codes matched by
the audit regex (`404`, `400`, `500`, `502`) at lines 376, 377, 378, 403, 413, 627, 638 —
not screenshot references.

**Re-audit after correction: 15 exact-filename citations, 0 bad.**

Nothing else in this report was altered by the correction pass. The defect findings, DB
queries, verbatim HTTP bodies, and scores stand as originally published.
