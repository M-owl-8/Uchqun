# P1 — SEED EXPANSION

**Artifact:** `audits/beta/deep/P1-SEED.md`
**Script:** `backend/scripts/seed-beta-demo.mjs`
**Environment:** Railway production, DB reached over `DATABASE_PUBLIC_URL`
**Campaign start HEAD:** `03906f24` (last code commit) — actual repo HEAD at P1 start was
`296713a40e175b03397dcdd1bd8a0d9f9baf220b`, which is `03906f24` plus the P8 audit-docs commit
`296713a4`. Branch: `main`. Stated because the prompt names `03906f24` and the two differ.

---

## 1. X-01 STATUS — verbatim, first action of this phase

```
X-01 PROBE (P1 first action) 2026-08-14T08:24:22.329Z
GET https://fra.cloud.appwrite.io/v1/storage/buckets/<bucket>
HTTP 403
{"message":"Project is paused due to inactivity. Please restore it from the console to resume
 operations.","code":403,"type":"project_paused","version":"1.9.6"}
```

**Appwrite is still paused.** Media therefore stays at **0 rows** in this seed. Nothing was
uploaded, so **0 images were screened and 0 rejected** — the S5 screening counts are zero because
the gate never opened, not because screening was skipped. No run screenshot is used as media
anywhere.

---

## 2. Two targets that this schema cannot express

Reported rather than faked. Both were checked against `information_schema` before writing any row.

### D-19 — a child cannot have a second guardian

```
guardian-ish tables matching /guardian|parent_child|child_parent/ : []   (none exist)
children columns matching /parent|guardian|father|mother/ :
  parentId          uuid  NOT NULL
  fatherFullName    varchar  NULL      motherFullName    varchar  NULL
  fatherDOB         date     NULL      motherDOB         date     NULL
  fatherOccupation  varchar  NULL      motherOccupation  varchar  NULL
```

`children.parentId` is a single **NOT NULL** FK and there is no join table. The `father*` /
`mother*` columns are free-text display fields on the child record, not accounts — they carry no
FK to `users` and grant no access. A second parent account cannot be attached to a child, so
"two parent accounts reading one record" is **not representable**.

Consequence downstream: **P4 close condition C7 (two-guardian visibility) cannot be met by any
seed.** It is a product gap, filed as **D-19, severity degrades-use**, and P4 will report C7 UNMET
with this cause rather than simulating it with duplicate child rows.

### D-20 — a group cannot have two teachers

```
groups columns: id! name! description teacherId capacity! ageRange createdAt! updatedAt! schoolId
```

`groups.teacherId` is a single nullable FK. Co-teaching is **not representable**. Filed as
**D-20, severity degrades-use**.

The mirror case — *one teacher owning two groups* — **is** representable and is seeded (below).

---

## 3. What exists now

| slug | School | Region | Groups | Children | Teachers | Receptions | Weeks | Attendance rows | % present |
|---|---|---|---|---|---|---|---|---|---|
| **tmm3** | Toshkent shahar 3-sonli ixtisoslashtirilgan maktabi | Toshkent | **6** | **61** | **8** | 2 | **12** | **3660** | 87% |
| tmm4 | Toshkent shahar 4-sonli maxsus ta'lim markazi | Toshkent | 3 | 15 | 3 | 2 | 4 | 300 | 88% |
| smm3 | Samarqand viloyati 3-sonli madad maktabi | Samarqand | 2 | 14 | 3 | 2 | 4 | 280 | 86% |
| smm4 | Urgut tumani maxsus ta'lim maktabi | Samarqand | 2 | 10 | 3 | 2 | 4 | 200 | 85% |
| smm5 | Kattaqo'rg'on tumani erta yordam markazi | Samarqand | 2 | 10 | 3 | 2 | 4 | 200 | 87% |
| **amm1** | Andijon viloyati 1-sonli maxsus ta'lim maktabi | **Andijon (3rd region)** | 2 | 11 | 3 | 2 | 4 | 220 | 86% |

Region distribution, from the DB:

```
## regions covered by seeded schools
 Andijon viloyati     1 school   11 children
 Samarqand viloyati   3 schools  34 children
 Toshkent shahri      2 schools  77 children
```

IDENTIFY totals:

```
activities 1601 · audit_log 120 · chat_messages 252 · child_attendance 4860 · children 121
documents 12 · gov_ratings 18 · groups 17 · irrs 25 · journal 108 · meals 4803 · media 0
schools 6 · therapies 30 · therapy_usages 97 · users 162
```

### Attendance percentage — not tuned

**85–88% present across the six schools; 87% at the volume school.** Absences are clustered as
2–4 day illness runs (`absencePlan` in the script), not spread evenly. No band was targeted and no
figure was adjusted after the fact. This is simply what the clustering produced.

### The specific structural cases requested

| Requested | Status | Evidence (DB query output) |
|---|---|---|
| 3 regions, two-sided isolation case | ✔ | Toshkent 2 schools / Samarqand 3 / Andijon 1 |
| One school at 60+ children, 6 groups, 8 teachers, 12 weeks | ✔ | tmm3: 61 / 6 / 8 / 12w / 3660 rows |
| Uneven group sizes | ✔ | tmm3 groups sized 12, 11, 10, 10, 9, 9; others 4–8 |
| Every child has a parent | ✔ | every `children.parentId` FK satisfied (column is NOT NULL) |
| `users.teacherId` genuinely populated | ✔ | set from `groups[g].teacher.id` at insert for every seeded parent |
| 2 receptions per school | ✔ | `receptions` column above, all six schools |
| **A teacher in two groups** | ✔ | `tarbiyachi1@tmm3.uz` → 2 groups: *Yulduz guruhi, Umid guruhi* |
| Teachers with no group (specialist edge case) | ✔ | tmm3: `tarbiyachi6/7/8@tmm3.uz` (+ `g.saidova@tmm3.uz`, created through the UI in the prior run) |
| **A group with two teachers** | ✘ **NOT REPRESENTABLE** | D-20 |
| **A second guardian on one child** | ✘ **NOT REPRESENTABLE** | D-19 |
| Chat threads of 15+ messages | ✔ | 3 threads at **21 messages** each (18-turn thread + 3-turn absence conversation on the same `conversationId`) |
| Week boundary AND month boundary | ✔ | tmm3 attendance `2026-05-25 → 2026-08-14`, **60 distinct school days across 4 distinct months** |
| Government ratings across 3 periods | ✔ | every school has Q1-2026, Q2-2026, Q3-2026 with a rising series, e.g. tmm3 `3 → 4 → 5`, amm1 `2 → 2 → 3` |
| Audit-log volume sufficient to paginate | ✔ | tmm3 has **48** government-visible school-lifecycle rows; the government audit page paginates at 20 (`governmentController.js:1218`), so 3 pages. 120 seeded audit rows in total |

Government-rating series per school:

```
amm1  Q1-2026:2 Q2-2026:2 Q3-2026:3
smm3  Q1-2026:2 Q2-2026:3 Q3-2026:4
smm4  Q1-2026:3 Q2-2026:4 Q3-2026:5
smm5  Q1-2026:2 Q2-2026:3 Q3-2026:4
tmm3  Q1-2026:3 Q2-2026:4 Q3-2026:5
tmm4  Q1-2026:4 Q2-2026:5 Q3-2026:5
```

Government-visible audit rows (`entity='schools'`, action in the allowlist at
`governmentController.js:1191-1204`, which is the only slice the government audit page shows):

```
tmm3 48 · smm4 6 · amm1 6 · smm5 6 · smm3 6 · tmm4 6
```

---

## 4. S1 — the marker is machine-only

Every seeded primary key starts with the hex string **`5eed`**. Naive substring scan:

```
schools matching /(test|demo|seed|sim)/i  : 0
children matching                          : 0
groups   matching                          : 0
users    matching                          : 2
```

The two user hits are **false positives of my own regex**, not markers:

| email | firstName | lastName | why it matched |
|---|---|---|---|
| `tarbiyachi2@tmm3.uz` | Anvar | **Qo**si**mov** | the substring `sim` inside *Qosimov* |
| `qabul2@tmm3.uz` | Dilrabo | **Qo**si**mova** | same |

Re-run with word-boundary anchors (`\mtest|\mdemo|\mseed|\msim`): **0 matches.** No human-visible
field contains test / demo / seed / sim as a word.

### IDENTIFY query

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

It returns **exactly** the seed: every row it counts has a `5eed` id or hangs off one by FK. The
complement is the non-seed set below, and the two never overlap because the marker is the primary
key itself.

---

## 5. S2 — reversible and idempotent, both directions shown

### Teardown of one school (`--teardown-only=amm1`)

```
NON-SEED before teardown: {"schools":"4","users":"41","children":"13","attendance":"42","chat":"22"}

── TEARDOWN (single school: amm1 ) ──
     13  audit_log
      3  gov_ratings
     18  journal
      2  documents
     39  chat_messages
     12  therapy_usages
      5  therapies
      0  media
    143  activities
    429  meals
    220  child_attendance
      3  irrs
     11  children
      2  groups_detach
     17  users
      2  groups
      1  schools

NON-SEED after teardown:  {"schools":"4","users":"41","children":"13","attendance":"42","chat":"22"}
```

**Identical on both sides.** The teardown touched nothing outside the seed. The 4 legacy tenants,
their 41 users, 13 children (12 legacy + the `Ozoda Rahimova` record created through the product
UI in the prior run), 42 attendance rows and 22 chat messages are untouched.

### Re-seed (`--only=amm1`)

Totals restored exactly to the pre-teardown figures: `activities 1601 · child_attendance 4860 ·
children 121 · users 162 · meals 4803 · schools 6 · gov_ratings 18 · audit_log 120`.

### Idempotency — re-run with no teardown changes nothing

```
identify checksum before : 7619361f9dc8657e8c2cf219769ae744
  (re-ran `--only=smm3` against live data, no teardown)
identify checksum after  : 7619361f9dc8657e8c2cf219769ae744
```

Ids are sha1-derived from `(kind, school, index)`, so a re-run rewrites the same rows. Day-grained
tables are deleted for the seeded scope and rewritten each run.

### Two collisions found and fixed while expanding

Both are recorded because they would have silently corrupted a re-run:

1. **Reception email collision.** The expansion moved reception ids from `sid('user',slug,'reception')`
   to `…'reception0'`. The pre-existing row already held `qabul@<slug>.uz`, and `users.email` is
   unique — an `ON CONFLICT (id)` upsert under a new id would have raised a unique violation.
   Index 0 now keeps the legacy key so the row is **updated in place**.
2. **Government-rating partial unique index.** `idx_gov_school_ratings_unique_active` is on
   `(schoolId, period)`, which an `ON CONFLICT (id)` upsert does not catch. The first full run
   died mid-way with `duplicate key value violates unique constraint
   "idx_gov_school_ratings_unique_active"`. The seed now clears its own rating rows for the school
   before inserting the three periods.

---

## 6. S5 — media report

| Slot | Intended source | What occupies it |
|---|---|---|
| (a) Meal photos | real food images | **empty** — X-01 |
| (b) Child / activity media | classroom scenes, craft work, generated illustration; never a real identifiable child | **empty** — X-01 |
| (c) Documents | a form or certificate image is plausible here | **empty** — X-01. The 12 seeded `documents` rows are metadata-only; `filePath` points at a path with no stored object |

**Screened: 0. Rejected: 0. Promoted: 0.** Zero images were uploaded, so no screening pass ran.
The rule stands for whenever storage returns: reject any image showing a password field with
typed content, a change-password screen, a creation form displaying an email or initial password,
a token, a session id, or a URL containing credentials.

**No screenshot from any run is visible to a parent as child media.**

---

## 7. Accounts this seed provides

All seeded accounts use password **`Uchqun@2026`**. Pattern, per school `<slug>`:

| Role | Email |
|---|---|
| Director | `direktor@<slug>.uz` |
| Reception 1 | `qabul@<slug>.uz` |
| Reception 2 | `qabul2@<slug>.uz` |
| Teachers | `tarbiyachi1@<slug>.uz` … `tarbiyachi8@<slug>.uz` (8 at tmm3, 3 elsewhere) |
| Parents | `otaona<group><index>@<slug>.uz`, e.g. `otaona11@tmm3.uz` |

Slugs: `tmm3` (volume, Toshkent), `tmm4` (Toshkent), `smm3` `smm4` `smm5` (Samarqand),
`amm1` (Andijon). Pre-existing government accounts are unchanged and use `Test@2026`.

---

## 8. Close conditions

| # | Condition | Verdict | Evidence |
|---|---|---|---|
| **C1** | 6 schools, 3 regions, one school at 60+ children — DB counts pasted | **MET** | §3 — 6 schools; Toshkent 2 / Samarqand 3 / Andijon 1; tmm3 at 61 children, 6 groups, 8 teachers, 12 weeks, 3660 attendance rows |
| **C2** | Teardown + re-seed proven, non-seed counts unchanged, both directions shown | **MET** | §5 — teardown line-by-line; non-seed `{4,41,13,42,22}` identical before and after; re-seed restored totals exactly; idempotency checksum identical |
| **C3** | Identify query returns exactly the seed and nothing else | **MET** | §4 — query keyed on the `5eed` primary-key marker; naive scan found 2 hits, both proven false positives of the scan regex (`Qosimov`), word-anchored scan returns 0 |
| **C4** | X-01 status stated verbatim at the top | **MET** | §1 — 403 `project_paused`, probed `2026-08-14T08:24:22.329Z` |

**P1: all four close conditions MET.**

## New defects filed in this phase

| ID | Severity | Status | Summary |
|---|---|---|---|
| **D-19** | degrades-use | OPEN | A child cannot have a second guardian. `children.parentId` is a single NOT NULL FK; no guardian join table exists; the `father*`/`mother*` columns are free text with no FK to `users`. Blocks P4 C7. |
| **D-20** | degrades-use | OPEN | A group cannot have two teachers. `groups.teacherId` is a single FK. Co-teaching is unrepresentable. |

---

## 9. Citation audit of this artifact (L4)

This artifact cites no screenshots — every claim is a DB query output or a probe response pasted
verbatim above. Run against the campaign auditor for completeness:

```
ARTIFACT P1-SEED.md
  screenshot dirs      : (none — this phase produced no screenshots)
  files on disk        : 0
  filename citations   : 0 | unresolvable: 0 []
  ordinal citations    : 0 | unresolvable: 0 []
```
