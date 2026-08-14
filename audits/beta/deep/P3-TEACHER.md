# P3 — Teacher portal, deep audit

**Campaign:** DEEP HARDENING · phase 3 of 8
**Date:** 2026-08-14
**HEAD at start of phase:** `d214e280` (branch `main`)
**Tenant:** beta seed tenants only — every record touched carries the `5eed` marker (L8, L12)
**Artifacts:** `audits/beta/deep/P3/screenshots/` (167 files) · `audits/beta/deep/P3/logs/` · `audits/beta/deep/P3/screenshot-index.md` · `audits/beta/deep/P3-coverage-table.md`

---

## 1. Method

Twelve runnable scripts, each committed alongside this report, each writing its own JSON log and numbered screenshots into the shared P3 counter. Nothing in this document is asserted from memory: every claim below names a screenshot in the index, a log key, a source line, or a SQL result pasted verbatim.

| script | what it establishes |
|---|---|
| `p3a-teacher.mjs` | all 17 routes cold + child detail + child IRR; two-group teacher; no-group empty state |
| `p3b-attendance-boundaries.mjs` | month/week/earliest/future/re-mark/volume/collision battery |
| `p3c-parent-boundary.mjs` | first parent week-view attempt (navigation failed — superseded) + pre-enrolment date |
| `p3d-week-walk.mjs` | parent week walk, four consecutive weeks (the D-03 class proof) |
| `p3e-collision-creates-chat.mjs` | D-27 witness; activity/meal/monitoring/reflection/IRR creation; chat + live parent |
| `p3f-chat-order-monitoring.mjs` | chat pane scoped ordering and scrollback; monitoring and IRR saves |
| `p3g-chat-order-strict.mjs` | strict (date,time) monotonicity over the whole thread |
| `p3h-meal-irr.mjs` | why the meal did not persist; IRR change with a traceable stamp |
| `p3i-remaining-surface.mjs` | therapy tab, media modal, bulk fill, settings, password rejection |
| `p3j-therapy-journal-prefs.mjs` | therapy assign; journal composer; IRR sections; preference persistence |
| `p3l/p3m/p3n-journal-*.mjs` | three attempts at the journal send control — see §7 corrections |
| `p3o-lastmodals.mjs` · `p3p-therapy-error.mjs` | therapy create modal and its 400; government message composer |
| `p3q-attendance-scope.mjs` | D-31 — the attendance list scope leak |

**Accounts.** `tarbiyachi1@tmm3.uz` (owns two groups — Umid 12 + Yulduz 9 = 21 children), `tarbiyachi6@tmm3.uz` (no group), `otaona11@tmm3.uz` (parent of the probe child), `qabul@tmm3.uz` (reception, for the collision).

**Probe child.** Gulnoza Ergasheva `5eed0c9a-fe3e-4031-8f5c-aac195c36b31`, Umid guruhi, DOB 2018-02-22. See D-30 — a second child of the same name exists in the same group; every mark below is confirmed against this id in SQL, not against the rendered name.

---

## 2. Coverage

Controls enumerated statically from teacher-side JSX by `enumerate-controls.mjs` → `P3-controls.json`: **297** across 48 files. Full per-control table with file:line in `P3-coverage-table.md`.

| disposition | controls | share |
|---|---|---|
| EXERCISED | 269 | 90.6% |
| BLOCKED (X-01) | 20 | 6.7% |
| NOT-REACHED | 8 | 2.7% |

**BLOCKED (20)** — all file-upload dependent: `MediaFormModal.jsx` (10), `VideoPlayer.jsx` (6), `MediaViewModal.jsx` (2), `AvatarUpload.jsx` (2). The media upload modal was opened and its fields enumerated (`110_teacher-tmm3_X-01-X-01-media-upload-modal.png`, one `input[type=file]`, four required fields); no binary was uploaded to production storage. This is the X-01 gate, unchanged from P1/P2.

**NOT-REACHED (8)** — `MonthlyMilestones.jsx`. It is imported by `IrrShell.jsx:13` but no control in the rendered IRR exposes it for a child in this IRR state; the section list captured in `p3j.json → irr-sections` contains `Asosiy ma'lumotlar · Ehtiyojlarni baholash · Baholash natijalari · Yangi baholash` and nothing month-scoped. Stated as not reached rather than counted as passing.

**Routes.** 17 routes swept cold plus `/teacher/children/:id` and `/teacher/children/:id/irr` (`p3a-route-dumps.json`, screenshots `001`–`019`). The 404 route renders `NotFound.jsx` (`018`).

**Empty state.** `tarbiyachi6@tmm3.uz` (no group): `022`, `023`, `024`. Body reads `Bolalar (0) · Hozircha bolalar yo'q`. The attendance grid for this teacher offers **0** cards — no school-wide leak on the *rendered* surface. (Contrast D-31, which is about what the API returns.)

---

## 3. The D-03 class — attendance date-keying

D-03 was one instance of a date bug. The requirement for this phase was to show the *class* is gone, not the instance.

### 3.1 Marks written (teacher side)

| # | date | day | status written | evidence |
|---|---|---|---|---|
| 1 | 2026-07-31 | Fri, last day of July | `sick` | `026_teacher-tmm3_mark-month-jul31-2026-07-31-sick.png` |
| 2 | 2026-08-03 | Mon, first weekday of August | `absent` | `029_teacher-tmm3_mark-month-aug03-2026-08-03-absent.png` |
| 3 | 2026-08-09 | **Sunday** | `home_leave` | `032_teacher-tmm3_mark-week-sun09-2026-08-09-home_leave.png` |
| 4 | 2026-08-10 | **Monday**, week start | `hospitalized` | `035_teacher-tmm3_mark-week-mon10-2026-08-10-hospitalized.png` |
| 5 | 2026-08-11 | Tue | `sick` → re-marked `absent` | `042`, `045` |

### 3.2 Database truth (`child_attendance`, joined to `users` for the marker)

```
    date     |    status    |      marked_by        |             updatedAt
-------------+--------------+-----------------------+-------------------------------
 2026-07-27  | present      | tarbiyachi1@tmm3.uz   | 2026-07-27 03:30:00+00
 2026-07-28  | present      | tarbiyachi1@tmm3.uz   | 2026-07-28 03:30:00+00
 2026-07-29  | present      | tarbiyachi1@tmm3.uz   | 2026-07-29 03:30:00+00
 2026-07-30  | present      | tarbiyachi1@tmm3.uz   | 2026-07-30 03:30:00+00
 2026-07-31  | sick         | tarbiyachi1@tmm3.uz   | 2026-08-14 09:05:48.064+00
 2026-08-03  | absent       | tarbiyachi1@tmm3.uz   | 2026-08-14 09:06:02.271+00
 2026-08-04  | present      | tarbiyachi1@tmm3.uz   | 2026-08-04 03:30:00+00
 2026-08-05  | present      | tarbiyachi1@tmm3.uz   | 2026-08-05 03:30:00+00
 2026-08-06  | present      | tarbiyachi1@tmm3.uz   | 2026-08-06 03:30:00+00
 2026-08-07  | present      | tarbiyachi1@tmm3.uz   | 2026-08-07 03:30:00+00
 2026-08-09  | home_leave   | tarbiyachi1@tmm3.uz   | 2026-08-14 09:06:15.362+00
 2026-08-10  | hospitalized | tarbiyachi1@tmm3.uz   | 2026-08-14 09:06:29.256+00
 2026-08-11  | present      | tarbiyachi1@tmm3.uz   | 2026-08-14 09:07:31.165+00
 2026-08-12  | present      | tarbiyachi1@tmm3.uz   | 2026-08-12 03:30:00+00
 2026-08-13  | present      | tarbiyachi1@tmm3.uz   | 2026-08-13 03:30:00+00
 2026-08-14  | present      | tarbiyachi1@tmm3.uz   | 2026-08-14 03:30:00+00

duplicate rows per date: (0 rows)
```

### 3.3 What the parent's screen shows

`p3d-week-walk.mjs`, four consecutive weeks stepped backwards with the `Oldingi kun` control, week view (`Hafta`) toggled on:

| week header rendered | cells rendered | matches DB |
|---|---|---|
| `2026-08-10 – 2026-08-16` | M08 10=**Shifoxonada** · 11=Bor · 12=Bor · 13=Bor · 14=Bor · 15,16 blank | ✔ |
| `2026-08-03 – 2026-08-09` | M08 3=**Yo'q** · 4=Bor · 5=Bor · 6=Bor · 7=Bor · 8=Belgilanmagan · 9=**Uyda** | ✔ |
| `2026-07-27 – 2026-08-02` | M07 27–30=Bor · **31=Kasal** · M08 1,2=Belgilanmagan | ✔ |
| `2026-07-20 – 2026-07-26` | M07 20–24=Bor · 25,26=Belgilanmagan | ✔ |

Witnesses: `062_parent-otaona11_D-03-D-03-week-0-2026-08-10.png`, `063_…week-1-2026-08-03.png`, `064_…week-2-2026-07-27.png`, `065_…week-3-2026-07-20.png`.

Every header range matches its own cell labels; every status lands on its true calendar date; Saturdays/Sundays without records render `Belgilanmagan`; future days render blank. **The month boundary (07-31 → 08-03) and the week boundary (Sun 08-09 → Mon 08-10) are both correct on the parent's screen.** This is the platform at UTC+5 with dates written from a browser in the same zone.

### 3.4 Bounds

| probe | result | evidence |
|---|---|---|
| earliest date the input accepts | `min` attribute is **absent (null)**; input accepted `2020-01-06` | `038_teacher-tmm3_earliest-date-2020-01-06.png` |
| does the API accept it | **`201 {"success":true,"data":{"saved":1,…}}`** — row now exists, dated 2020-01-06 | `p3c.json → pre-enrolment-date-save`; SQL row above the 2026 block |
| latest date the input accepts | `max` = `2026-08-14` (today) | `p3b.json → 3-earliest-date` |
| future date forced past the input | `400 {"code":"ATTENDANCE_FUTURE_DATE"}` | `040_teacher-tmm3_future-date-attempt.png` |
| re-mark an already-marked day | updates in place, **0 duplicate rows** | SQL above |

Upper bound enforced, lower bound absent → **D-26**.

---

## 4. New defects

### D-26 — attendance has no lower date bound (degrades-use)

`backend/controllers/attendanceController.js:33-41` validates only that the date parses and is not in the future:

```js
const todayBound = new Date();
todayBound.setHours(23, 59, 59, 999);
if (attendanceDate > todayBound) {
  results.errors.push({ childId, code: 'ATTENDANCE_FUTURE_DATE' }); continue;
}
```

There is no comparison against the child's enrolment date, the group's creation date, or the school's. Proven: `POST /api/v1/attendance {date:'2020-01-06'}` for a child born 2018-02-22 at a school seeded in 2026 returned `201 saved:1`, and the row is in `child_attendance`. The date input carries no `min` attribute, so the picker offers the same range. Impact: attendance history — a safeguarding record and, per the government portal, an input to school ratings — can be back-written to any date without limit.

### D-27 — reception overwrites a teacher's attendance and the record still names the teacher (blocks-use)

Sequence, all in `p3b.json → 7-collision-reception-overwrites` and `p3e.json → C7-collision-witness`:

1. `tarbiyachi1@tmm3.uz` marks 2026-08-11 `sick`, then re-marks `absent` (`042`, `045`).
2. `qabul@tmm3.uz` — role `reception`, user id `5eed803b-af80-497a-8e1e-6ac3e120a758` — POSTs the same child and date with `present`. Response: **`201 {"success":true,"data":{"saved":1,"skipped":0,"errors":[]}}`**.
3. DB: `2026-08-11 | present | marked_by tarbiyachi1@tmm3.uz | updatedAt 2026-08-14 09:07:31`.
4. The teacher reopens 2026-08-11 and their own screen reads `aria-label="Gulnoza Ergasheva: Bor"` — the reception's value, with no indication anyone else touched it. Witness `067_teacher-tmm3_D-27-D-27-teacher-sees-receptions-value.png`.

Three separable failures, one code path:

- **Attribution is false.** `attendanceController.js:53-58` writes only `status` and `note` on the update branch:
  ```js
  if (existing) {
    existing.status = status;
    if (note !== undefined) existing.note = note || null;
    await existing.save();
  }
  ```
  `markedBy` and `teacherId` keep their original values. The audit trail now states the teacher marked this child present. They did not.
- **No audit row.** `createAttendance` never calls `logAudit()`. Per `CLAUDE.md`, audit-log reads are government-only and the table is append-only — but nothing is appended here at all, so the overwrite leaves no trace anywhere.
- **The safeguarding marker is erased silently.** `logger.warn('ATTENDANCE_ABSENT safeguarding marker', …)` fires only when *writing* `absent`. Clearing an absence to `present` logs nothing. An absence can be removed without any record that it existed.

Why reception passes the gate — `backend/utils/schoolValidation.js:45-46`:

```js
export async function isTeacherAssignedToChild(child, req) {
  if (!req.user || req.user.role !== 'teacher') return true;
```

For every non-teacher role the group check is skipped entirely and the function returns `true`. Only `validateChildAccess` (school scope) applies. Reception and admin can therefore write any child in their school, which may be intended — but doing so under the teacher's name is not.

### D-28 — therapy type enum disagrees three ways; two of the three offered types cannot be saved (blocks-use)

| layer | allowed `therapyType` |
|---|---|
| UI select — `teacher/src/pages/therapy/TherapyFormModal.jsx:64-66` | `music`, `video`, `content` |
| request validator — `backend/validators/therapyValidator.js:6` | `video`, `audio`, `article`, `exercise`, `game`, `breathing`, `meditation`, `other` |
| DB model enum — `backend/models/Therapy.js:13` | `music`, `video`, `content`, `art`, `physical`, `speech`, `occupational`, `other` |

Intersection of all three: **`video` alone.**

`music` is the select's default. Filling the form and pressing Saqlash produces:

```
POST /api/v1/therapy → 400
{"error":"Validation failed","message":"Some inputs failed validation",
 "details":[{"field":"therapyType",
  "message":"therapyType must be one of: video, audio, article, exercise, game, breathing, meditation, other"}, …]}
```

Witnesses: `163_teacher-tmm3_D-28-D-28-therapy-type-music-selected.png` (form filled, `Turi *` = `Musiqa`) and `164_teacher-tmm3_D-28-D-28-therapy-400-response-1200ms.png` — the modal stays open with the data intact and a red toast reading **`Validation failed`**: raw English, in an otherwise fully Uzbek interface, naming no field. It comes from `TherapyManagement.jsx:192`, `showError(error.response?.data?.error || t('therapy.saveError'))` — the server's legacy `{error:'<string>'}` shape means the untranslated string wins over the i18n fallback.

The same screenshot carries the page header: *"Musiqa, video va content terapiyalarni boshqaring va bolalarga tayinlang"* — the product describes exactly the three types the UI offers, and two of them cannot be created.

The assignment path is unaffected and works: `POST /api/v1/therapy/5eedc892-…/start → 201` (`127_teacher-tmm3_therapy-assign-result.png`).

### D-29 — a multi-group teacher is shown one group's name over all groups' children (degrades-use)

`tarbiyachi1@tmm3.uz` owns two groups:

```
              id                  |      name       | children
------------------------------------+-----------------+----------
 5eed2a08-5b27-4b7e-83dc-43d9f7b3c9f8 | Umid guruhi   | 12
 5eed33af-d304-4b7a-8402-2fafaa2d7919 | Yulduz guruhi |  9
```

The dashboard reads `"Umid guruhi" Guruh · 21 bola.` (`001_teacher-tmm3_T3-dashboard.png`) and the attendance grid header reads `Umid guruhi · 21 bola` with 21 cards and a `Hammasi · 21` chip (`021_teacher-tmm3_two-group-teacher-attendance-grid.png`). Umid has 12. Yulduz is never named anywhere on either screen. A teacher reading their own dashboard is told a group has nearly double its real roll, and the second group is invisible.

The counting itself is correct — 21 is the right number of children this teacher is responsible for; only the label is wrong, and there is no per-group split.

### D-30 — same-named children in one group are indistinguishable on the attendance grid (degrades-use)

```
              id                  |    dob     |     grp
------------------------------------+------------+-------------
 5eed0c9a-fe3e-4031-8f5c-aac195c36b31 | 2018-02-22 | Umid guruhi
 5eeddf8b-13af-41b3-8f69-03ecfe4cf1d8 | 2022-01-23 | Umid guruhi
```

Two different children, both `Gulnoza Ergasheva`, both in Umid guruhi, four years apart. On the grid (`021_teacher-tmm3_two-group-teacher-attendance-grid.png`) they render as the first two cards: identical initials badge `GE`, identical label `Gulnoza E.`, identical status. No date of birth, no photograph, no identifier, no ordinal. Their accessible names are also identical — both `aria-label="Gulnoza Ergasheva: Bor"`.

The teacher marking attendance has no way to tell which card is which child. Marking the wrong one produces a false absence record for one child and a false presence for another, both safeguarding records, both invisible as errors.

Shared given-name + surname pairs are ordinary in Uzbekistan, so this is not an artefact of test data being unrealistic. It *is* an artefact of test data being unlucky: the P1 seed generated the collision by chance rather than by design. That does not weaken the finding — production will produce the same collision — but it is disclosed rather than presented as a deliberate probe.

**Consequence for this report's own evidence:** because both cards match `button[aria-label^="Gulnoza Ergasheva:"]`, the P3b battery used `.first()`. Every resulting mark was verified in SQL against `5eed0c9a` specifically, and all sixteen rows in §3.2 belong to that id. The boundary evidence is therefore sound, but it is sound *because it was checked in the database*, not because the screen was unambiguous.

### D-31 — `GET /api/v1/attendance` returns the whole school to a teacher (blocks-use)

Logged in as `tarbiyachi1@tmm3.uz`, from the teacher's own page context (`p3q.json`):

```json
{
  "api": { "status": 200, "records": 61, "distinctChildren": 61,
    "sample": [
      { "childId": "5eed0c9a-…", "status": "present",
        "snapshot": { "firstName": "Gulnoza", "lastName": "Ergasheva", "schoolId": "5eedd253-…" } },
      { "childId": "5eed6188-…", "status": "present",
        "snapshot": { "firstName": "Zaynab",  "lastName": "Umarova",   "schoolId": "5eedd253-…" } }
    ] },
  "ownChildren": 21,
  "saveBar": "21 dan 61 ta belgilangan · Yangilash"
}
```

61 is the total number of children at tmm3 (groups of 12+11+10+10+9+9). This teacher is responsible for 21. The response carries, for each of the other 40, their **first name, last name, and attendance status for the day** — `absent`, `sick`, `hospitalized` are the values this field takes.

Mechanism — `backend/controllers/attendanceController.js`, `listAttendance`:

```js
const where = { schoolId: req.user.schoolId };
```

School scope, and nothing narrower. `isTeacherAssignedToChild` guards the **write** path only; that was D-01's fix, and it holds (see §5). The read path was never scoped.

It surfaces in the UI as a nonsense counter. `teacher/src/pages/Attendance.jsx:293-294`:

```js
const markedCount = Object.values(states).filter(s => s && s !== 'unset').length;
const total = children.length;
```

and `Attendance.jsx:176-182` seeds `states` with the teacher's 21 children, then writes **every record the response contains** into it without filtering to that set:

```js
children.forEach(c => { newStates[c.id] = 'unset'; });
records.forEach(r => {
  const date = r.date?.split('T')[0] || r.date;
  if (date === selectedDate) newStates[r.childId] = r.status;
});
```

So `states` ends up with 61 keys, `total` stays 21, and the primary action button renders `21 dan 61 ta belgilangan` — 61 marked out of 21. Witness `167_teacher-tmm3_D-31-D-31-attendance-scope-leak-savebar.png`.

This is a same-school leak, not a cross-tenant one — the `schoolId` filter does hold, and the grid renders only the correct 21. Both facts limit the blast radius; neither makes it acceptable that a teacher's browser receives forty other children's safeguarding records.

---

## 5. Prior defects re-derived on this phase's build

Re-derived independently, not read from the earlier report.

| id | claim under test | this phase's evidence | verdict |
|---|---|---|---|
| D-01 | attendance grid offers only the teacher's own children; a refused row is not reported as saved | grid offers exactly 21 cards for a 21-child teacher (`047_teacher-tmm3_D-01-D-01-volume-grid.png`); a Nur-guruhi child (`5eedc269-…`, another teacher's group) is refused `400 ATTENDANCE_ACCESS_DENIED` | **holds** — on the write path. See D-31 for the read path. |
| D-03 | parent sees each status on its true date | §3.3, four weeks, day-for-day against SQL | **holds** |
| D-07 | dashboard shows a real attendance figure, not a placeholder | `001_teacher-tmm3_T3-dashboard.png` — `SINF BIR QARASHDA 21/21 keldi` | **holds** |
| D-09 | Reja tab bar includes Taomlar | `006_teacher-tmm3_T5d-reja-meals.png` — `Individual reja · Terapiya · Kuzatuv · Taomlar` | **holds** |
| D-12 | group label is not empty quotes | `001` — `"Umid guruhi" Guruh · 21 bola.` | **holds** as to the name; the count is wrong for multi-group teachers → D-29 |
| D-13 | change-password copy | `016_teacher-tmm3_T2-change-password.png` — `Yangi parolni o'rnating.` | **holds** |
| X-01 | media upload cannot be exercised against production storage | `110_…X-01-media-upload-modal.png` — modal opened, `input[type=file]` present, no binary sent | **still gating**, 20 controls |

---

## 6. Everything else exercised, with its outcome

| area | action | result | evidence |
|---|---|---|---|
| Activity | create individual plan | row `383b51d2-d54e-49cb-b7ab-a33fd5212bb2`, `createdAt 09:15:07` | `071_teacher-tmm3_create-activity-result.png` + SQL |
| Meal | create | `POST /api/v1/meals → 201`, row `05249a7b-34c2-4b81-a5b8-2cce9fcf83ef`, `Breakfast / Sabzavotli sho'rva` | `100`, `101` + SQL |
| Monitoring | emotional rating | `Monitoring yozuvi muvaffaqiyatli yaratildi`, row `d2adef1d-…` | `092_teacher-tmm3_monitoring-rating-result.png` |
| Monitoring | bulk fill | `POST /api/v1/teacher/emotional-monitoring → 200` | `p3i.json → bulkfill` |
| Monitoring | Kunlik / Haftalik tabs | both render | `115`, `116` |
| Reflection | write and save | row `e2ae8f76-…`, `createdAt 09:15:37` | `078_teacher-tmm3_reflection-result.png` |
| IRR | edit a field and save | `updatedAt` moved `08:33:01 → 09:21:27`; the marker string `QA-P3H` is present in the row (`to_jsonb(t)::text ilike '%QA-P3H%'` → `true`) | `104_teacher-tmm3_irr-real-change-result.png` |
| IRR | save with no change | `updatedAt` unchanged | correct Sequelize behaviour, not a defect |
| Therapy | assign to a child | `POST /api/v1/therapy/…/start → 201` | `127` |
| Therapy | create | `400` — see D-28 | `163`, `164` |
| Parent journal | 2 children, subject + body, send | `POST /api/v1/teacher/journal/bulk → 201`, entries created for both | `148`, `149` |
| Gov message | teacher → government | `POST /api/v1/teacher/message-to-government → 201`, id `5d638bd7-…`, `recipientLevel: republic` | `157` |
| Chat | thread ordering | 21 messages, 07-23 → 08-14, strictly non-decreasing by (date, time), **0 out-of-order pairs** | `097_teacher-tmm3_chat-order-strict.png`, `p3g.json` |
| Chat | opens at latest | pane `scrollTop 1349` of `scrollHeight 2119 / clientHeight 770` → at bottom | `087` |
| Chat | scrollback to oldest | reaches `Assalomu alaykum… 13:10` on M07 23 | `088` |
| Chat | live delivery with parent logged in | teacher sends at 14:16 local; parent's already-open `/chat` shows it **without reload** (`arrivedLive: true`), and after reload | `083`, `084`, `085` |
| Password | wrong current password | `PUT /api/v1/user/password → 400 {"code":"CURRENT_PASSWORD_INCORRECT"}`, UI shows an error | `123` |
| Preferences | toggle, save, reload | `PUT /api/v1/user/profile → 200`; state survives reload (`persisted: true`) | `134` |

---

## 7. Corrections to my own work in this phase

L4 and L7 require that wrong turns be recorded, not quietly dropped.

1. **A chat-ordering defect I asserted and then withdrew.** `p3e` read every `HH:MM` element in the document and produced a timestamp list that ran backwards (`15:12 → 14:20`). That list included the conversation-list pane on the left. Re-scoped to the message pane and paired with each bubble's date label (`p3g`), the sequence is monotonic and `outOfOrder` is `[]`. **There is no chat ordering defect.** The earlier reading was a measurement error.

2. **Three failed attempts at the journal send control before it worked.** `p3l` reported the send button disabled at `Jo'natish · 2`; `p3m` typed a real note and it was still disabled. Reading `ParentJournalComposer.jsx:274` — `disabled={sending || !subject || !body || selectedIds.length === 0}` — showed the subject field was empty, and that the subject `<input>` carries no `type` attribute, so `input[type="text"]` never matched it. With `input:not([type])` targeted, `p3n` sent successfully. **Not a defect.** Had I stopped at `p3m` I would have filed one.

3. **The meal creation that "did not persist."** `p3e` submitted the meal form and no row appeared. `p3h` enumerated the form first and found a required `Bola` select my blind fill had skipped; with every field filled, `POST /api/v1/meals → 201`. **Not a defect** — a harness gap.

4. **The IRR save that "did not bump `updatedAt`."** `p3f` clicked Saqlash without changing anything and `updatedAt` stayed at `08:33:01`. That is correct behaviour. `p3h` made a real, traceable change and `updatedAt` moved. **Not a defect.**

5. **A therapy toast I nearly reported as swallowed.** `p3o` screenshotted six seconds after the 400 and showed no error, which reads as a silent failure. `p3p` screenshotted at 1200 ms and caught the toast. The toast had merely expired. D-28 is about the enum divergence and the untranslated string, **not** about a suppressed error.

6. **Four fabricated screenshot filenames in my own first draft of §3.1.** Caught by the citation audit, not by me — full first-pass and second-pass output in §8. Corrected in place.

7. **`p3b` item 8 and `p3c` both failed to navigate the parent week view** — they clicked the wrong chevron and captured the day view. Those screenshots (`049`–`055`, `056`–`059`) are in the index but are not cited as witnesses for anything. `p3d` used `button[aria-label="Oldingi kun"]` and succeeded; only `p3d`'s four screenshots back §3.3.

---

## 8. Citation audit (L4)

Every screenshot filename appearing in this document was checked against `audits/beta/deep/P3/screenshots/` by `citation-audit.mjs`, which resolves each `NNN_*.png` token and exits non-zero on any that does not exist on disk.

**First pass — four citations failed:**

<!-- citation-audit:ignore -->
```
$ node audits/beta/deep/citation-audit.mjs audits/beta/deep/P3-TEACHER.md audits/beta/deep/P3/screenshots
ARTIFACT P3-TEACHER.md
  screenshot dirs      : audits/beta/deep/P3/screenshots
  files on disk        : 167
  filename citations   : 25 | unresolvable: 4 ["030_teacher-tmm3_mark-month-jul31-2026-07-31-sick.png",
                                               "032_teacher-tmm3_mark-month-aug03-2026-08-03-absent.png",
                                               "034_teacher-tmm3_mark-week-sun09-2026-08-09-home_leave.png",
                                               "036_teacher-tmm3_mark-week-mon10-2026-08-10-hospitalized.png"]
  ordinal citations    : 46 | unresolvable: 0 []
EXIT=1
```
<!-- /citation-audit:ignore -->

The four filenames above are quoted as evidence of the failure, so they sit inside an explicit `<!-- citation-audit:ignore -->` region — otherwise quoting a failing run would make the artifact fail forever. The marker is visible in the Markdown source and the auditor reports how many such regions it skipped, so the exemption cannot be used quietly. It is the only one in this document.

I had written those four filenames in §3.1 by reconstructing them from the naming pattern in `markDay()` rather than reading them off disk. The action, the date and the status in each name were right; the ordinal was wrong, because `markDay` also writes an `-open` and a `-saved` frame per call and I had not counted them. **This is the same failure mode as the six fabricated filenames in the first campaign's report** — a plausible name written from a pattern instead of from the filesystem — caught here by the control that exists for it. The four were corrected against `screenshot-index.md` to `026`, `029`, `032`, `035`, and the ordinal pair for the re-mark was corrected from `042`,`044` to `042`,`045` (`044` is the `-open` frame, `045` is the marked frame).

**Second pass — clean:**

```
$ node audits/beta/deep/citation-audit.mjs audits/beta/deep/P3-TEACHER.md audits/beta/deep/P3/screenshots
ARTIFACT P3-TEACHER.md
  screenshot dirs      : audits/beta/deep/P3/screenshots
  ignored regions      : 1
  files on disk        : 167
  filename citations   : 25 | unresolvable: 0 []
  ordinal citations    : 56 | unresolvable: 0 []
EXIT=0
```

The index itself was generated from the event log and cross-checked against the filesystem: **167 events indexed, 167 files on disk, 0 orphans** (`_p3index.mjs`). Every SQL block is pasted from the query output, not retyped.

No claim in this document rests on a file that does not exist. That is now demonstrated by a failing run followed by a passing one, rather than asserted.

---

## 9. Close conditions

Set at the start of the phase. Marked as they fell; none was adjusted to make it pass (L6).

| # | condition | verdict | basis |
|---|---|---|---|
| C1 | Every teacher route reached and screenshotted, including the empty state and the 404 | **MET** | 17 routes + child detail + child IRR (`001`–`019`); no-group teacher (`022`–`024`); `NotFound` (`018`) |
| C2 | Every enumerated teacher-side control given a disposition, with a stated reason for anything not exercised | **MET** | 297/297 dispositioned in `P3-coverage-table.md`: 269 exercised, 20 blocked by X-01, 8 not reached with the reason recorded in §2 |
| C3 | One of each teacher artefact created and confirmed in the database, not merely on screen | **MET** | activity, meal, monitoring, reflection, IRR edit, therapy assignment, parent journal, government message — all with row ids or 2xx bodies in §6 |
| C4 | D-01 re-derived at volume, not on the 7-child case it was originally found on | **MET** | 21-child two-group teacher; grid offers 21, foreign child refused `400 ATTENDANCE_ACCESS_DENIED` (`047`) |
| C5 | Chat exercised at length: ordering, scrollback, and delivery to a parent who is logged in at the same time | **MET** | 21 messages monotonic with 0 inversions (`097`); scrollback to the oldest (`088`); live arrival without reload (`084`) |
| C6 | Week-boundary and month-boundary attendance both witnessed correct on the parent's screen against database truth | **MET** | §3.3 — four weeks, day-for-day; Sun 08-09 / Mon 08-10 and Fri 07-31 / Mon 08-03 both correct (`062`–`065`) |
| C7 | A concurrent write collision on the same child and day witnessed, and its outcome stated plainly | **MET** | reception overwrote the teacher's record, `201`, attribution unchanged, no audit row → D-27 (`067`) |

**C7 note on scope.** The collision I could construct is cross-role (reception vs teacher). The two-teachers-on-one-group collision remains unrepresentable for the reason recorded in P1 as **D-20**: `groups.teacherId` is a single column, so a group cannot have two teachers. C7 is met by the collision that the schema permits; the one it forbids is still forbidden, and D-20 still stands.

---

## 10. Verification commands

```bash
# screenshot index vs filesystem
node audits/beta/deep/_p3index.mjs
#   → indexed 167 files 167 orphans 0

# citation audit of this document
node audits/beta/deep/citation-audit.mjs audits/beta/deep/P3-TEACHER.md

# control coverage
node audits/beta/deep/p3-coverage.mjs
#   → total 297 {"EXERCISED":269,"BLOCKED":20,"NOT-REACHED":8}

# re-run any single probe (each is idempotent and writes into the P3 counter)
node audits/beta/deep/p3d-week-walk.mjs        # the D-03 class proof
node audits/beta/deep/p3q-attendance-scope.mjs # D-31
node audits/beta/deep/p3p-therapy-error.mjs    # D-28
```

---

## 11. Defect ledger delta

| id | severity | one line | fixed in P8? |
|---|---|---|---|
| D-26 | degrades-use | attendance accepts any past date — no enrolment or school lower bound, no `min` on the input | pending |
| D-27 | blocks-use | reception/admin overwrite a teacher's attendance; `markedBy` still names the teacher; no audit row; cleared absences log nothing | pending |
| D-28 | blocks-use | `therapyType` differs across UI, validator and model; 2 of 3 offered types 400; the error reaches the teacher as English `Validation failed` | pending |
| D-29 | degrades-use | multi-group teacher shown one group's name over all groups' children; second group never named | pending |
| D-30 | degrades-use | two same-named children in one group are identical on the attendance grid — no DOB, photo or id | pending |
| D-31 | blocks-use | `GET /api/v1/attendance` returns every child in the school to a teacher, with names and statuses | pending |

Carried forward unchanged: D-01, D-03, D-07, D-09, D-12, D-13 hold. D-20 still blocks the two-teacher case. X-01 still gates 20 controls.

---

*P3 closed. This phase's conditions were marked by me and are not self-certified as correct — per L6 they are the input to P8's re-derivation, not a substitute for it.*
