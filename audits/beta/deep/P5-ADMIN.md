# P5 — Admin portal, deep audit

**Campaign:** DEEP HARDENING · phase 5 of 8
**Date:** 2026-08-14
**HEAD at start of phase:** `26a977dd` (branch `main`)
**Tenant:** beta seed tenants only (L8, L12)
**Artifacts:** `audits/beta/deep/P5/screenshots/` (142 files) · `audits/beta/deep/P5/logs/` · `audits/beta/deep/P5/downloads/` · `audits/beta/deep/P5/screenshot-index.md` · `audits/beta/deep/P5-coverage-table.md` · `audits/beta/deep/fixtures/`

---

## 1. Method

| script | what it establishes |
|---|---|
| `p5a-admin-routes.mjs` | 20 routes cold + the unauthenticated `/admin-register` page |
| `p5b-bulk-import.mjs` | four file classes against the two-phase import contract |
| `p5c` / `p5d` / `p5e` | the 5-step wizard end to end; the confirm step; job completion |
| `p5f` / `p5g` / `p5h` / `p5i` | where imported children surface; what Trash covers; delete → Trash → restore |
| `p5j-restore-fidelity.mjs` | attempted proof that restore preserves account flags — **inconclusive, see §6** |
| `p5k` / `p5l` | export scan across the admin portal; the reception CSV downloaded and opened |
| `p5m-admin-surfaces.mjs` | therapy, IRR, documents queue, government messages, profile/settings, activity, communications, school profile, ratings, groups, AI warnings, teachers |
| `p5n-therapy-crash.mjs` | root cause of D-43 |

**Account.** `direktor@tmm3.uz` — Nodira Ismoilova, Direktor, school `tmm3` (Toshkent shahar 3-sonli ixtisoslashtirilgan maktabi).

**Fixtures** (`audits/beta/deep/fixtures/`): `import-valid.csv` (3 good rows), `import-malformed.csv` (9 rows exercising 7 distinct row-level failures), `import-badheaders.csv`, `import-notcsv.txt`.

---

## 2. Coverage

Controls enumerated from `admin/src/**` JSX → `P5-controls.json`: **209** across 37 files.

| disposition | controls | share |
|---|---|---|
| EXERCISED | 187 | 89.5% |
| BLOCKED | 20 | 9.6% |
| NOT-REACHED | 2 | 1.0% |

**BLOCKED (20)** — all of `TherapyManagement.jsx`. Not blocked by X-01: the route **crashes on load** (D-43), so none of its controls can be reached at all. This is the first phase where the blocker is a defect rather than a testing constraint.

**NOT-REACHED (2)** — `TeacherDetail.jsx`. The route `/admin/teachers/:id` is registered (`admin/src/App.jsx:81`) but the A4 route dump contains no `/admin/teachers/<uuid>` link, so nothing in the UI navigates to it.

---

## 3. Bulk import — the two-phase contract, tested against its own specification

`CLAUDE.md` specifies T1-7a (validate, read-only) and T1-7b (start, mutating) with explicit rules about which failures are 400 and which are 201. Each rule was tested rather than assumed.

| input | expected per contract | observed | verdict |
|---|---|---|---|
| headers missing | file-level 400 | `400 {"code":"IMPORT_MISSING_HEADERS","detail":"Missing: firstName, lastName, dateOfBirth, gender, disabilityType, class, teacher, parentEmail"}` | ✔ |
| wrong extension | file-level 400 | `400 {"code":"IMPORT_FILE_INVALID_TYPE"}` | ✔ |
| rows invalid | **201**, job created, per-row errors | `201 {"importJobId":"2113056b-…","totalRows":9,"validRows":2,"invalidRows":7,"errors":[…]}` | ✔ |
| all rows valid | 201 then 202 on start | `201 {"totalRows":3,"validRows":3}` then `202 {"status":"importing"}` | ✔ |
| start a job that is not yours | school IDOR check | `404 {"code":"IMPORT_JOB_NOT_FOUND"}` | ✔ |

Row-level codes returned for the malformed file, in row order: `IMPORT_ROW_FIRST_NAME_REQUIRED` (2), `IMPORT_ROW_DOB_INVALID` (3), `IMPORT_ROW_DOB_IN_FUTURE` (4), `IMPORT_ROW_GENDER_INVALID` (5), and further rows for the invalid e-mail, the unknown parent, and the within-file duplicate. Seven distinct failure modes, each reported against its own row number.

**The wizard.** Five steps: upload → validate → results → confirm → done. On the results step the action reads `To'g'ri qatorlar bilan davom etish` ("continue with the correct rows"); the confirm step then states the count plainly:

- valid file: `Importni tasdiqlash · 3 ta bolani import qilish?`
- malformed file: `Importni tasdiqlash · 2 ta bolani import qilish? · 7 ta qator tekshirish xatolari sababli o'tkazib yuboriladi.`

That is the documented partial-import semantics stated to the user before they commit. Witnesses `047_admin-tmm3_import-confirm-step.png`, `039_admin-tmm3_wiz-valid-validated.png`.

**Completion, verified in the database:**

```
=== imported children ===
 id                                   | firstName    | lastName       | dob        | gender | deletedAt
 0047fff7-b7f2-400c-aacc-f380a4b4dd31 | SIM-Nodira   | Tekshiruvova   | 2019-03-14 | Female | null
 a1ba21b2-5f9b-4d6a-9401-892a9bda2ce7 | SIM-Bekzod   | Tekshiruvov    | 2018-11-02 | Male   | null
 925f570f-51a3-4424-88d1-594bd49bf674 | SIM-Malika   | Tekshiruvova   | 2020-06-25 | Female | null

=== import jobs ===
 32995cac-9cce-4aa1-841a-b833f59c7ba1 | import-valid.csv | completed | 3 | 3 | 0
```

**Audit trail — correct.** Three `bulk_import` rows at `10:25:08`, one per child, exactly as T1-7b requires:

```
 action      | actorRole | occurredAt
 restore     | admin     | 2026-08-14 10:34:24.061+00
 delete      | admin     | 2026-08-14 10:34:09.267+00
 delete      | admin     | 2026-08-14 10:34:09.262+00
 bulk_import | admin     | 2026-08-14 10:25:08.652+00
 bulk_import | admin     | 2026-08-14 10:25:08.644+00
 bulk_import | admin     | 2026-08-14 10:25:08.636+00
```

Worth stating next to D-27: account deletion, restoration and bulk import are all audited. Attendance mutation is not.

**Where the imported children surface.** Not on any list of their own — the admin portal has no children index. They appear under their guardian in `ParentManagement`: selecting Rayhona Ergasheva shows `SIM-Nodira Tekshiruvova · Umid guruhi` alongside her existing child, each linking to `/admin/children/:id` (`079_admin-tmm3_D-41-D-41-parent-detail-imported-children.png`). Reachable, but only if you already know which parent to open.

---

## 4. New defects

### D-43 — `/admin/therapy` crashes on every load and cannot recover (blocks-use)

The route renders nothing but an error boundary:

> **Something went wrong** — Please try again or refresh the page. — **Try Again**

Console, captured on load:

```
TypeError: L.rating.toFixed is not a function
    at index-354kTjRt.js:462:31692
    at Array.map (<anonymous>)
```

The API is healthy — `GET /api/v1/therapy?isActive=true` returns `200` with a full payload (12,643 bytes, therapies present). The failure is purely in rendering.

Root cause, one line:

- `backend/models/Therapy.js:42-47` — `rating: { type: DataTypes.DECIMAL(3, 2) }`. Sequelize serialises DECIMAL as a **string**, so the payload carries `"rating": "4.50"`.
- `admin/src/pages/TherapyManagement.jsx:310` — `{therapy.rating.toFixed(1)}` — called directly on that string, inside an `Array.map`, so the first therapy row throws and takes the whole page down.

The correct pattern already exists in this repository. `teacher/src/pages/therapy/TherapyCard.jsx:28-31` renders the same field from the same endpoint:

```jsx
{therapy.rating != null && !isNaN(Number(therapy.rating)) && (
  ...
  <span>{Number(therapy.rating).toFixed(1)}</span>
```

**"Try Again" cannot help.** It re-renders against the same deterministic payload and throws again — captured twice, `141_admin-tmm3_D-43-D-43-admin-therapy-crash.png` and `142_admin-tmm3_D-43-D-43-admin-therapy-after-retry.png`, identical error both times. The route is permanently unusable in production for every admin at every school, and it takes 20 controls (9.6% of the admin surface) with it.

### D-41 — the admin child page shows a raw UUID and no details on a direct link or refresh (degrades-use)

`admin/src/pages/ChildDetail.jsx:18`:

```js
const child = location.state?.child ?? null;
```

The child object is taken **only** from React Router navigation state and is never fetched. `setChild` does not exist anywhere in the file (0 occurrences). Consequences when `location.state` is absent — a refresh, a bookmark, a pasted link, a new tab:

- line 34, `const displayName = child ? … : \`Child ${id}\`` → the heading renders **`Child 0047fff7-b7f2-400c-aacc-f380a4b4dd31`**
- line 50, `{child && (…)}` → the entire detail block (date of birth, gender, class) renders nothing

Reproduced by direct navigation on two different children, one imported and one long-seeded:

| child | heading rendered | raw UUID shown | IRR |
|---|---|---|---|
| `0047fff7-…` (imported) | `Child 0047fff7-b7f2-400c-aacc-f380a4b4dd31` | yes | `404 IRR_NOT_FOUND` — correct, none created yet |
| `5eed0c9a-…` (seeded, has an IRR) | `Child 5eed0c9a-fe3e-4031-8f5c-aac195c36b31` | yes | `200`, full IRR payload |

Witnesses `083_admin-tmm3_D-41-D-41-child-detail-imported.png`, `084_admin-tmm3_D-41-D-41-child-detail-seed.png`. The IRR content loads correctly in both cases — this is specifically the child identity that is lost.

### D-40 — hardcoded English strings in the admin UI, outside i18n entirely (degrades-use)

Not missing keys — strings that never enter the translation system, so no locale file can fix them and `backend/scripts/verify-i18n.js` cannot see them.

| location | string |
|---|---|
| `admin/src/pages/BulkImport.jsx:233` | `showErrors ? 'Hide errors' : \`Show ${jobResult.errors.length} errors\`` |
| `admin/src/pages/ChildDetail.jsx:53` | `<span>DOB: {…}</span>` |
| `admin/src/pages/ChildDetail.jsx:55` | `<span>Gender: {child.gender}</span>` |
| `admin/src/pages/ChildDetail.jsx:56` | `<span>Class: {child.class}</span>` |
| error boundary (rendered by D-43) | `Something went wrong` · `Please try again or refresh the page.` · `Try Again` |

`Show 7 errors` was observed on screen during the malformed-file run — it is the control that reveals **which rows failed**, i.e. the one thing an admin needs after a failed import, and it is in English.

Checked and **not** part of this defect: `childDetail.back`, `childDetail.irr`, `childDetail.goals`, `childDetail.loadError`, `receptionsPage.deleteAction`, `receptionsPage.editAction` all resolve correctly in `admin/src/locales/uz/common.json`, so their `defaultValue` fallbacks are inert.

### D-42 — the admin portal has no data export anywhere (degrades-use; may be intentional)

Scanned eight routes (`/admin`, `/receptions`, `/parents`, `/teachers`, `/school-ratings`, `/activity`, `/settings`, `/irr`) for any control matching `export|csv|excel|yuklab ol|eksport`. The only match is the **import** card on `/admin/settings`. There is no export control on any admin route.

Exports do exist elsewhere in the platform — `reception/src/pages/ParentManagement.jsx:493` and `government/src/pages/Schools.jsx:26` — so a school director can neither extract their own school's data nor reproduce what their reception staff can. Flagged as a defect rather than an observation because a government platform's school administrator having no export path is an operational gap; whether it is intentional is a product call I cannot source from the repository, and that is stated rather than assumed.

**The export that does exist was downloaded and opened** (P5's export requirement, satisfied on the nearest available surface):

```
file: ota-onalar-2026-08-14.csv     234 bytes, 4 lines, BOM present
header: "Ism","Familiya","Email","Telefon","Status"
row 1:  "Zuhra","Ibragimova","t.abandon@tmm3.uz","+998901239900","Faol"
row 2:  "Nozima","Umarova","otaona69@tmm3.uz","+998937843299","Faol"
row 3:  "Sevinch","Qodirova","otaona68@tmm3.uz","+998940957299","Faol"
headerCols: 5   ragged rows: 0
```

Three rows for the three checkboxes ticked, correctly quoted, BOM-prefixed for Excel, date-stamped filename, zero ragged rows. The file is retained at `audits/beta/deep/P5/downloads/`.

---

## 5. Trash — delete and restore

Trash covers exactly two entity types, shown as tabs: **Ota-onalar** and **Qabulxonalar**. Children are not among them; there is also no child-delete control on the admin child page (its only buttons are `Orqaga`, `IRR`, `Maqsadlar`), so nothing is orphaned by the omission.

Full cycle on a seed reception:

| step | evidence |
|---|---|
| 4 receptions listed | Nodira Ismoilova · Shahnoza Umarova · Dilrabo Qosimova · Kamola Yusupova (`095`) |
| delete via the icon button `title="O'chirish"`, confirm `Tasdiqlash` | `DELETE /api/v1/admin/receptions/b10facdf-… → 200 {"message":"Reception account deleted successfully"}` |
| list drops to 3 | Shahnoza Umarova gone (`097`) |
| Trash → Qabulxonalar tab | `Shahnoza Umarova · sh.umarova@tmm3.uz · 2026-08-14 · Tiklash` (`099`) |
| restore | `PUT /api/v1/admin/users/b10facdf-…/restore → 200` |
| list back to 4 | all four names present (`102`) |
| database | `deletedAt: null` |

Both halves are audited (`delete` and `restore` rows above). The delete control is icon-only with a `title` attribute — the same pattern that produced D-25 in P2 — so it is invisible to text-based targeting.

---

## 6. Corrections to my own work in this phase

1. **D-39 — withdrawn.** I recorded that no Start action was offered for a partially valid file and tagged a screenshot `D-39-import-partial-no-start`. It is offered; the label is `To'g'ri qatorlar bilan davom etish`, which my `/Boshla|Import|Yuklashni/i` matcher did not match, and the actual start sits one step further on behind `Boshlash`. The partial-import path works exactly as documented. Number retired.

2. **D-41 was provisionally tagged on a screenshot that showed correct behaviour.** `079_…D-41-parent-detail-imported-children.png` is the parent detail correctly listing `SIM-Nodira Tekshiruvova · Umid guruhi`. The defect that D-41 eventually became — the raw-UUID heading — was found afterwards on a different screen. The tag on `079` should be read as provisional; the substantive witnesses are `083` and `084`.

3. **The restore-fidelity test did not test what it claims.** `p5j` was written to delete `qabul2@tmm3.uz` (fully active: `isActive`, `isVerified`, `documentsApproved` all true) and compare its flags after restore. My row-targeting selector matched the wrong row and deleted `sh.umarova` again; `qabul2` was never touched, so the reported `identical: true` compares an untouched record with itself and proves nothing.

   **Open question, [UNVERIFIED]:** the restore response for `sh.umarova` returned `isVerified: false, documentsApproved: false, isActive: false`, and I have no capture of that account's flags *before* its first deletion, so I cannot say whether restore preserved them or cleared them. This matters because `CLAUDE.md` states reception access requires `documentsApproved && isActive` — a lossy restore would silently leave a restored reception unable to work.

   **What would settle it:** capture the three flags for a fully-active reception, delete that exact row (targeting by id, not by text match), restore, and re-read. One run, no ambiguity.

4. **Two earlier import runs used the wrong probe origin.** `p5b`'s IDOR probe fetched `/api/v1/admin/import/…` from the admin SPA host and got `200` with `<!doctype html>` — the frontend's index page, not the API. Re-run against the backend origin it returns `404 IMPORT_JOB_NOT_FOUND`, which is the real answer reported in §3.

5. **Repeated apostrophe mismatches.** Several matchers on `O'chirish` / `To'ldirish` / `Jo'natish` failed against the typographic apostrophe in the rendered text. Where this caused a wrong reading it is corrected above; the surviving lesson is that text matching on this UI is unreliable and `title` / `aria-label` targeting is not.

---

## 7. Data left behind

Disclosed rather than glossed:

- **3 children created** in school `tmm3` by the bulk import: `SIM-Nodira Tekshiruvova`, `SIM-Bekzod Tekshiruvov`, `SIM-Malika Tekshiruvova`. All carry the `SIM-` marker, all in the beta tenant, none deleted. Their ids are not `5eed`-prefixed because the application generated them.
- **5 import jobs** in `import_jobs` (4 `ready`, 1 `completed`).
- **1 therapy row** may exist from the P5m admin-therapy attempt — that modal never opened (D-43), so no create was submitted.
- `sh.umarova@tmm3.uz` was deleted and restored twice; `deletedAt` is `null` and the account is present in the list. Its flag state is the open question in §6.

No row was hard-deleted, no schema was altered, no truncate or drop was issued.

---

## 8. Citation audit (L4)

```
$ node audits/beta/deep/citation-audit.mjs audits/beta/deep/P5-ADMIN.md audits/beta/deep/P5/screenshots
```

Result in §10. Index generated from the event log and cross-checked against the filesystem: **142 events indexed, 142 files on disk, 0 orphans**.

---

## 9. Close conditions

| # | condition | verdict | basis |
|---|---|---|---|
| C1 | Every admin route reached and screenshotted, including the 404 and the unauthenticated register page | **MET** | 20 routes (`001`–`020`) plus `/admin-register` (`021`) |
| C2 | Every enumerated admin control dispositioned with a stated reason | **MET** | 209/209: 187 exercised, 20 blocked by D-43, 2 not reached (`TeacherDetail`, no inbound link) |
| C3 | Bulk import tested against its documented contract, valid **and** malformed, not just the happy path | **MET** | four file classes; five contract rules each checked separately (§3); seven distinct row-level error codes observed |
| C4 | The import verified server-side, not just on screen | **MET** | 3 rows in `children`, job `completed`, 3 `bulk_import` audit rows |
| C5 | Trash exercised as a full cycle — delete, appear in trash, restore, reappear | **MET** | §5, six steps each with a witness, both halves audited |
| C6 | An export downloaded and opened, its contents checked | **MET** | `ota-onalar-2026-08-14.csv` saved to disk and parsed: 5 columns, 3 rows, BOM, 0 ragged (§4, D-42) — on the reception surface, because the admin portal has none |
| C7 | Restore proven non-lossy for account state | **UNMET** | the test that would have proven it targeted the wrong row (§6.3). Reported as unverified rather than restated as passing. |

---

## 10. Verification commands

```bash
node audits/beta/deep/_p5index.mjs
#   → indexed 142 files 142 orphans 0

node audits/beta/deep/citation-audit.mjs audits/beta/deep/P5-ADMIN.md audits/beta/deep/P5/screenshots

node audits/beta/deep/p5-coverage.mjs
#   → total 209 {"EXERCISED":187,"BLOCKED":20,"NOT-REACHED":2}

node audits/beta/deep/p5n-therapy-crash.mjs   # D-43, root cause
node audits/beta/deep/p5d-import-complete.mjs # the wizard, both file classes
node audits/beta/deep/p5i-trash-final.mjs     # delete -> trash -> restore
node audits/beta/deep/p5l-reception-export.mjs # the CSV, downloaded and parsed
```

---

## 11. Defect ledger delta

| id | severity | one line | fixed in P8? |
|---|---|---|---|
| D-40 | degrades-use | hardcoded English strings in the admin UI outside i18n (`Show N errors`, `DOB:`, `Gender:`, `Class:`, the error-boundary copy) — unreachable by any locale file or by `verify-i18n.js` | pending |
| D-41 | degrades-use | `ChildDetail.jsx:18` takes the child only from `location.state`; a refresh or direct link renders `Child <uuid>` with no details at all | pending |
| D-42 | degrades-use | the admin portal has no data export on any route, while reception and government both do | pending |
| D-43 | **blocks-use** | `/admin/therapy` throws `rating.toFixed is not a function` on every load — DECIMAL arrives as a string; the route is permanently dead and takes 20 controls with it. The safe pattern already exists at `TherapyCard.jsx:28` | pending |
| D-39 | **withdrawn** | the partial-import Start action does exist, behind a confirm step | n/a |

Reinforced: **D-30** — `AdminIRR` lists `Ergasheva Gulnoza Umid` twice with nothing to tell the two children apart, the same ambiguity found on the teacher attendance grid, now in a second portal.

Contrast for D-27: bulk import, account deletion and account restoration all write audit rows. Attendance mutation still writes none.

---

*P5 closed. C7 is UNMET because the test that would have established it was flawed, not because the behaviour is known to be wrong. Per L6 these verdicts are input to P8's re-derivation.*
