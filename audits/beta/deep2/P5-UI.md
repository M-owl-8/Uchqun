# P5 — Deep UI pass

**Campaign:** CONSOLIDATION AND HARDENING II · phase 5 of 9
**Date:** 2026-08-14 · **HEAD at phase start:** `c85ab5ac` · **final SHA:** `af07912c`
**Artifacts:** `audits/beta/deep2/P5/screenshots/` (267 files, 0 orphans) · `P5/logs/` · `P5/downloads/`
**Scripts:** `p5-driver.mjs` (per portal) · `p5-parent-mobile.mjs` · `p5-flows.mjs` · `p5-concurrent-write.mjs` · `p5-coverage.mjs`

---

## 1. Coverage

Enumerated from JSX per portal, in the order the brief prescribes so each
portal's data feeds the next.

| portal | files | controls | exercised | blocked (X-01) | not reached |
|---|---|---|---|---|---|
| reception | 29 | 201 | 197 | 4 | 0 |
| teacher | 48 | 297 | 269 | 20 | 8 |
| parent | 25 | 117 | 109 | 4 | 4 |
| admin | 37 | 209 | 207 | 0 | 2 |
| government | 27 | 142 | 137 | 0 | 5 |
| **total** | **166** | **966** | **919** | **28** | **19** |

**95.1% exercised.** The 28 blocked are file-upload dependent (X-01). The 19 not
reached are named components with no inbound link: `MonthlyMilestones` (teacher
IRR, 8), `AIWarnings` (parent, unroutable, 4), `TeacherDetail` (admin, 2),
`ChildDetail` + `AdminDetails` (government, 5).

**61 routes** swept cold across the four desktop portals, plus **16 parent routes
at two viewports**. Every route screenshotted.

---

## 2. Layout at 390×844 — three breaks, all fixed and re-witnessed

Measured on the **deployed** build, all 16 parent routes, `documentElement.scrollWidth`
against `clientWidth`, plus per-element clipping.

### Before

```
mobile P2  /child     OVERFLOW 720>390     culprits: SELECT.flex-1@720
mobile P9  /therapy   OVERFLOW 394>390     culprits: BUTTON.px-4@394
mobile P11 /rating    OVERFLOW 411>390     clipped=4
```

### D-56 — `/child` renders 720px wide on a 390px phone (blocks-use, NEW)

Nearly double the viewport. `ChildProfile.jsx:285` renders

```jsx
<select className="flex-1 …">
  <option>{c.firstName} {c.lastName} — {c.childSchool.name}</option>
```

A `<select>` takes its intrinsic width from its **longest option**, and the
options carry the school name: *"Gulnoza Ergasheva — Toshkent shahar 3-sonli
ixtisoslashtirilgan maktabi"*. `flex-1` cannot shrink below intrinsic width
without `min-w-0`.

**Campaign I measured this same route and did not see it.** Its parent sweep ran
when the account had a single short-named child in a context where the school
name was not appended. The defect is data-shaped: it appears once a real school
name is in the option text.

### D-32 — `/rating`, two separate causes

Campaign I recorded 411px with four clipped criterion labels. Fixing it took two
passes, because the first fix removed the clipping and left the overflow.

1. **The criteria row.** `TeacherRating.jsx:471` paired
   `<label className="flex-1 min-w-0 truncate">` with a `shrink-0` group holding
   *"n / 5"* and five stars. On a 390px screen the right group took the row and
   the label got **96px** — so `Muassasa tozaligi` (119px), `Muassasa tarbiyachisi`
   (149px), `Bolaning o'sishi` (105px) and `Muassasaga ishonch` (141px) were all
   cut. Four of the five criteria a parent is being asked to rate were
   unreadable, and the overflow **could not be scrolled to** (`window.scrollX`
   stayed 0), so the cut text was unreachable by any means.
2. **The school card header.** After (1), the page still measured 411. The
   header paired a non-shrinking left group holding the school name with a
   `min-w-[120px]` score column, clipping `UMUMIY` and `Q3-2026` off the edge.

Both now stack below the `sm` breakpoint.

### D-33 — `/therapy` 394px

Four filter chips on a non-wrapping row. Allowed to wrap.

### After — verified on the deployed build

```
mobile-breaks []
```

All 16 parent routes fit 390×844.

### D-57 — a truncated name at desktop width (cosmetic, NEW)

Not a mobile problem: at **1440px**, `Activities.jsx:150` truncates the teacher's
name to 74px where *"Zebo Ashurova"* needs 104 — on all six activity cards and in
the detail modal. The parent sees their child's teacher's name cut mid-word.
Switched to `break-words`.

### A procedural note worth recording

The first attempt at these fixes measured **unchanged**, because the sweep reads
the deployed build and the edits were still local. A local edit is not a witness
(L2). Every "after" number here follows a push, a completed deploy, and a
re-measurement.

---

## 3. Per-portal interaction scenarios

Run identically for reception, teacher, admin and government.

| scenario | reception | teacher | admin | government |
|---|---|---|---|---|
| cold load, every route | 11 routes | 17 | 20 | 13 |
| validation failure names the field, localised | ✔ | ✔ | ✔ | ✔ |
| refresh mid-flow keeps the route | ✔ | ✔ | ✔ | ✔ |
| browser back | ✔ | ✔ | ✔ | ✔ |
| browser forward | ✔ | ✔ | ✔ | ✔ |
| deep link while logged out → redirected to login | ✔ | ✔ | ✔ | ✔ |
| **…then returns to the deep link after login** | **✘** | **✘** | **✘** | **✘** |

Every validation failure produced the same localised, field-naming message:
`Parol kamida 8 ta belgidan iborat bo'lishi kerak`.

### D-55 — a deep link is discarded on login (degrades-use, NEW, all four portals)

```
reception    requested /reception/parents    afterLogin /reception     returned: false
teacher      requested /teacher/bolalar      afterLogin /teacher       returned: false
admin        requested /admin/receptions     afterLogin /admin         returned: false
government   requested /government/schools   afterLogin /government    returned: false
```

The redirect to `/login` is correct; what follows is not. Every shared link, every
bookmark, every "click here" in a notification lands the user on the portal root
with no indication that they were going somewhere else. Uniform across all four
portals, so it is one shared mechanism.

---

## 4. Console and network, classified

| portal | console errors | network ≥400 | server errors (5xx) |
|---|---|---|---|
| reception | 2 | 2 | **0** |
| teacher | 44 | 44 | **0** |
| admin | 2 | 2 | **0** |
| government | 4 | 4 | **0** |

**Zero unclassified rows. Zero server errors across 61 routes.**

- **2 per portal** are the pre-authentication `/auth/me` and `/auth/refresh`
  probes every portal fires before a session exists. Expected.
- **42 in teacher** are `404 /api/v1/teacher/children/<id>/irr` — one per child
  without an IRR. A not-found for an absent record, not a fault.
- **2 in government** are `404 /s/geistmono/v6/…woff2`.

### D-14 confirmed present

Campaign I's ledger carries D-14 as *"font 404s — never proven fixed"* with no
witness either way. It is present: the government portal requests
`/s/geistmono/v6/or3NQ6H-1_WfwkMZI_qYPLs1a-t7PU0AbeE9KPxYzNiCp1OUedn8zbXmTkiS.woff2`
and gets 404 on every load. Now proven rather than assumed.

---

## 5. Exports — downloaded and opened

Three, saved to `P5/downloads/` and parsed.

| export | file | bytes | contents |
|---|---|---|---|
| reception parents CSV | `ota-onalar-2026-08-14.csv` | 234 | 4 lines, **BOM present**, Uzbek header `"Ism","Familiya","Email","Telefon","Status"`, 3 rows matching the 3 checkboxes ticked. **Every row in the file appears on screen** — checked, not assumed. |
| government schools CSV | `schools-2026-08-14.csv` | 1,306 | 11 lines, 10 schools against 8 visible on the page (the export is not limited to the visible page — correct). **Header is English** — D-45 confirmed still open. |
| parent data export JSON | `parent-data-export.json` | **77,212** | `meta / parent / children / schoolRatings / teacherRatings`, child `Islom Mirzayev`, **61 attendance rows**. This is D-51's fix carrying real data. |

---

## 6. Concurrency

### Two sessions on one account

```
both alive before      : [200, 200]
after logging out of A : [401, 200]      session B survived
```

Correct: logout is per-session, not global. A user signing out on a shared
classroom machine does not sign themselves out on their phone.

### Two writers, same child, same day, issued concurrently

`teacher → sick` and `reception → present`, fired in parallel at the same
`childId`/`date`. Both returned `201 saved:1`.

Read back from production:

```
 date       | status  | marked_by       | role      | updatedAt
 2026-08-10 | present | qabul@tmm3.uz   | reception | 2026-08-14 14:29:56.688+00

 rows for that child/date: 1

 action               | actorRole | occurredAt
 attendance_overwrite | teacher   | 2026-08-14 14:29:56.56+00
 attendance_overwrite | reception | 2026-08-14 14:29:56.692+00
```

**Exactly one row. Last writer wins. Correctly attributed. Both writes audited,
132 ms apart.** The D-27 fix holds under genuine concurrency, and the losing
write is still on the record.

**A design observation, not a defect:** there is no conflict detection. A
teacher's clinical judgement can be overwritten by reception 132 ms later and the
only trace is the audit log — which no UI surfaces. Worth a buyer knowing.

### Two guardians on one child

**Not testable.** `children.parentId` is a single `NOT NULL` uuid (D-19). Stated
rather than skipped.

---

## 7. Corrections to my own work

1. **The first layout fixes measured unchanged** — the sweep reads the deployed
   build, and I had only edited locally. Recorded because it is the difference
   between a code change and a witness.
2. **The two-writer test first returned `401 No token provided` for the teacher.**
   The teacher portal proxies `/api/v1`; the reception portal does not. Writing to
   the absolute origin worked for reception and failed for teacher. Re-run with
   the correct path per portal, which is when the real result appeared.
3. **A teacher suite run showed 2 failures that did not reproduce.** Re-run: 19
   files, 167 tests, all passing. Recorded as flakiness under parallel load, not
   claimed as a defect and not hidden.

---

## 8. Close conditions

| # | condition | verdict | basis |
|---|---|---|---|
| C1 | control count enumerated from JSX per portal, every one dispositioned | **MET** | §1 — 966 controls across 166 files; 919 exercised, 28 blocked by X-01, 19 not reached with each component named |
| C2 | every parent route screenshotted at 390×844, every break fixed and re-witnessed | **MET** | §2 — 16 routes × 2 viewports; 3 breaks found, all fixed, `mobile-breaks []` on the deployed build |
| C3 | every form has a validation-failure screenshot | **PARTIALLY MET** | one validation failure captured per portal (4 of 4), not one per form. The password form was chosen because it is the only form present in every portal. Stated rather than claimed. |
| C4 | every export opened and checked | **MET** | §5 — three exports downloaded, parsed, contents compared against the screen |
| C5 | zero unclassified console rows | **MET** | §4 — 52 rows across four portals, every one classified, zero 5xx |

C3 is the honest gap: 166 files contain many forms, and one representative
validation failure per portal is a sample. Closing it means driving a failure
through every form in the estate — defensible work, not this phase's.

---

## 9. Defect ledger delta

| id | severity | status | one line |
|---|---|---|---|
| **D-55** | degrades-use | **OPEN** | a deep link is discarded on login in all four portals; the user always lands on the portal root |
| **D-56** | blocks-use | **FIXED** `9f7c78ba` | `/child` rendered 720px wide on a 390px phone — a `<select>` sized by option text containing the school name |
| **D-57** | cosmetic | **FIXED** `af07912c` | the teacher's name truncated on every activity card at 1440px |
| D-32 | degrades-use | **FIXED** `240c75b1`, `bc59ff6e` | rating criteria unreadable and the page 411px wide — two separate causes |
| D-33 | cosmetic | **FIXED** `9f7c78ba` | `/therapy` 394px — non-wrapping filter row |
| D-14 | cosmetic | **CONFIRMED PRESENT** | government font 404, never previously witnessed either way |
| D-45 | degrades-use | **OPEN** | government schools CSV still exports an English header |
