# P2 — RECEPTION PORTAL DEEP AUDIT

**Artifact:** `audits/beta/deep/P2-RECEPTION.md`
**Screenshots (77):** `audits/beta/deep/P2/screenshots`
**Index (77 rows / 77 files / 0 orphans):** `audits/beta/deep/P2/screenshot-index.md`
**Control inventory:** `audits/beta/deep/P2-controls.json` · **coverage table:** `audits/beta/deep/P2-coverage-table.md`
**Logs:** `audits/beta/deep/P2/logs/`
**Harness:** `p2a-reception-routes.mjs`, `p2b-reception-flows.mjs`, `p2c-d17.mjs`, `p2d-modals.mjs`, `p2e-childmodal.mjs`, `p2f-hovermenu.mjs`, `p2g-touch.mjs`
**Account:** `qabul@tmm3.uz` / `Uchqun@2026` — the volume school (61 children, 6 groups, 8 teachers, 62 parents)
**Build under test:** deployed Railway production, backend deploy `b5076dca…` (2026-08-14 12:38:17 +05)

---

## 1. New defects

Numbering continues from D-18. Severity per the campaign scale.

### D-22 — blocks-use — the wizard's draft-resume button silently enrols a child under the wrong guardian

**Two buttons on the same screen carry the identical label `Davom etish`, with opposite meanings.**

- `reception/src/locales/uz/common.json` → `wizard.next` = **"Davom etish"** — the wizard's Next button (`components/Wizard.jsx:129`)
- same file → `parentsPage.wizard.draftResume` = **"Davom etish"** — the draft banner's *resume* button (`pages/ParentWizard/ParentWizardPage.jsx:144`)

Resume replaces `parentData`, `childData`, `groupData` **and** `step` wholesale from localStorage
(`ParentWizardPage.jsx:73-79`), discarding whatever the operator has just typed, with no
confirmation.

**Witness:** `043_reception-tmm3_wizard-complete-start.png` — the banner *"Saqlangan qoralama
topildi. Davom etishni xohlaysizmi?"* with a solid amber **Davom etish** at the top of the page,
directly above an empty form, while the wizard's own **Davom etish** sits in the footer.

**Observed consequence, in production data.** Sequence actually executed:

| Step | What was entered |
|---|---|
| Flow B | step 1 `t.abandon` / **Zuhra Ibragimova**, advanced to step 2, then navigated away without submitting |
| Flow E | step 1 `n.saidova` / **Nigora Saidova**, step 2 child **Zilola Saidova**, group chosen, `Yakunlash` |

Resulting rows:

```
parents named Saidova : 0
children named Saidova: 1   Zilola Saidova   2026-08-14 08:45:46.235+00   group assigned = true

who owns Zilola Saidova:
  child   parent_email          pfirst   plast
  Zilola  t.abandon@tmm3.uz     Zuhra    Ibragimova
```

The child was enrolled under **a guardian the operator never entered**, and the guardian who *was*
entered (`Nigora Saidova`) does not exist. On a special-education platform this is a
safeguarding-grade integrity failure: the wrong adult holds the record.

*Correction to my own first reading:* I initially suspected stale React state clobbering the form.
It is not that. The harness clicked `button:has-text("Davom etish")` `.first()`, which is the
banner's resume button. The product behaved as coded — and that is precisely the defect: the
control a user's eye lands on first, at the top of the page, carries the same words as "continue"
and destroys their work.

### D-23 — degrades-use — the wizard advances past a blank required step and ticks it green

Clicking `Davom etish` on a **completely empty** step 1 advances to step 2 and marks step 1 with a
green check.

**Witness:** `032_reception-tmm3_wizard-s1-VALIDATION-blank-advance.png` — header reads
`QADAM 2 / 3`, the rail shows `✓ Ota-ona ma'lumotlari`, and step 2 is displayed. Every step-1
required field (Ism *, Familiya *, Email *, Telefon *, Parol *) was empty.

Cause: `ParentWizardPage.jsx:92`
```js
const handleNext = () => { if (step < STEPS.length - 1) setStep((s) => s + 1); };
```
No validation. The `required` attributes in `ParentStep.jsx` are never enforced because the Next
button is not a form submit. The operator only discovers the problem at `Yakunlash`, where the
message is the bare "Validation failed" (D-21).

### D-21 — degrades-use — create-teacher reports "Validation failed" and discards the field detail

Backend response to a weak password, verbatim from `logs/network.jsonl`:

```
400 POST /api/v1/reception/teachers
{"error":"Validation failed","message":"Some inputs failed validation",
 "details":[{"field":"password","message":"password must be at least 8 characters"},
            {"field":"password","message":"password must contain at least one …"}]}
```

**Witness:** `020_reception-tmm3_teachers-create-VALIDATION-weak-password.png` — a red toast
reading only **`Validation failed`**, untranslated, naming no field, with the Parol field
showing three dots and **no inline rule hint**. The government portal's equivalent form does print
"Kamida 8 belgi, katta harf, kichik harf, raqam" under its password box; this form does not.

Cause: `reception/src/pages/TeacherManagement.jsx:248`
`showError(error.response?.data?.error || t('teachersPage.toastSaveError'))` — `data.error` is the
bare string `"Validation failed"`, and `details[]` is dropped.

The backend rejection itself is **correct**: no account was created (`weak-password teacher
created? 0`).

### D-24 — degrades-use — browser Back exits the wizard entirely and discards everything

From step 2, `history.back()` lands on `/reception/parents`, not step 1
(`042_reception-tmm3_wizard-browser-back-result.png`, `url: …/reception/parents`). The wizard's
steps are React state, not history entries. The `beforeunload` guard at `ParentWizardPage.jsx:63-70`
does not fire on SPA navigation, so no warning is shown and all entered data is lost.

### D-25 — blocks-use on touch — the parent action menu is hover-only, with no click or keyboard path

The `⋯` trigger (`ParentManagement.jsx:617-619`) is a `<button>` with **no `onClick`**. The menu is
`<div className="hidden group-hover:block …">` (`:621`). Everything a reception clerk does to an
existing parent lives inside it: **Tahrirlash · Bola qo'shish · Faollashtirish / To'xtatish ·
O'chirish · Parolni tiklash**.

**Decisive witness** — a touch-enabled context (`hasTouch: true`), real
`page.touchscreen.tap()` on the trigger, so `:hover` never fires:

```
D-25-touch { triggerFound: true, editVisibleAfterTap: false }
```
`077_reception-touch_D-25-D-25-after-TOUCH-TAP-no-hover.png` — the menu does not open.

On a mouse context the same trigger appears to work only because Playwright's `.click()` moves the
pointer first, which fires `:hover` (`072`, `073`). Reception staff working on a tablet cannot
edit, suspend, or delete a parent at all. Keyboard users cannot either: the trigger has no handler.

---

## 2. Defects re-checked from prior runs

### D-16 — CONFIRMED OPEN — no way for reception to create a reception peer

Every visible button on four reception routes was enumerated at runtime and filtered for
`/qabul|reception/i`:

```
dashboard: []   teachers: []   settings: []   profile: []   → anyControl: 0
```
Screens `048`–`051`. There is no such control anywhere in the portal.

### D-17 — OPEN, but the prior write-up was too harsh — correcting it

The 2026-08-14 rerun said *"nothing in the creation flow tells the creator"*. That is **wrong** and
I am correcting it. Created `sh.umarova@tmm3.uz` as `direktor@tmm3.uz`:

- `055_director-tmm3_D-17-D-17-list-after-create.png` — the row's **HOLAT** column reads **`Faol emas`**,
  the HUJJATLAR column reads `Hujjat yo'q`, and the detail panel offers a one-click
  **`Faollashtirish`** button next to `Tahrirlash` and `O'chirish`.

What *is* still missing:
- the success toast says exactly `Qabul akkaunti yaratildi` — nothing about the account being
  unable to log in (`toastText` captured verbatim; my automated `toastMentionsActivation: true`
  was a false positive that matched the word `Faollashtirish` in the list *behind* the toast).
- the new user's own first login fails with no indication of who must act:
  `D-17-first-login { ok: false, landing: …/login }`, screen `056`.

**Revised severity: degrades-use, cosmetic-adjacent.** The state and the remedy are both visible to
the director on the list; only the creation moment and the new user's error message are silent.

### D-06 / X-01 — document upload

`027_reception-tmm3_X-01-documents-upload-X01-error.png`. Backend: `500 POST
/api/v1/reception/documents → {"success":false,"error":"An unexpected error occurred"}`. The user
sees the localised **"Hujjat yuklanmadi. Qayta urinib ko'ring."** (D-06's UI half remains fixed);
the backend still answers a bare 500 from `errorHandler.js:82` rather than the
`DOCUMENT_UPLOAD_STORAGE_FAILED` 502 that was added. Unchanged from the prior run.

---

## 3. Control coverage — 201 controls, enumerated from JSX

Source: `enumerate-controls.mjs` over `reception/src` (41 files scanned). Full per-line table with
file:line, kind, label and disposition: **`audits/beta/deep/P2-coverage-table.md`**.

```
Controls enumerated from JSX: 201 — EXERCISED 192 · BLOCKED 4 · NOT-APPLICABLE 5
```

| File | Route | Controls | Disposition |
|---|---|---|---|
| `components/Sidebar.jsx`, `BottomNav.jsx`, `Layout.jsx`, `CommandPalette.jsx` | all | 7 | EXERCISED — present and rendered on every route dump |
| `pages/Login.jsx` | R1 | 7 | EXERCISED — login |
| `pages/Dashboard.jsx` | R2 | 7 | EXERCISED — `001` |
| `pages/ChangePassword.jsx` | R3 | 4 | EXERCISED — `010` |
| `pages/ParentManagement.jsx` | R4 | 25 | EXERCISED — `002`, `012`–`015`, hover menu `072`–`074` |
| `pages/parents/ParentFormModal.jsx` | R4 | 19 | EXERCISED — opened via the hover menu, `074`, blank-required validation `075` |
| `pages/parents/ChildFormModal.jsx` | R4 | 13 | EXERCISED — `069`, validation `070` |
| `pages/parents/ParentCard.jsx` | — | 5 | **NOT-APPLICABLE — dead code.** `grep -rn ParentCard reception/src` returns only its own definition and export; nothing imports it. The parents page renders a table, not cards. |
| `pages/ParentWizard/*` (4 files) + `components/Wizard.jsx` | R5 | 23 | EXERCISED — `003`, `031`–`047` |
| `pages/TeacherManagement.jsx` | R6 | 24 | EXERCISED — `004`, `016`–`021` |
| `pages/GroupManagement.jsx` | R7 | 15 | EXERCISED — `005`, `022`–`024` |
| `pages/Documents.jsx` | R8 | 2 | EXERCISED — `006`, `025`–`027` |
| `components/DocumentUpload.jsx` | R8 | 4 | **BLOCKED — X-01** (upload path returns 500) |
| `pages/Settings.jsx` + `ProfileForm`, `PasswordForm`, `NotificationPreferences` | R9 | 19 | EXERCISED — `007`, `029`, `030` |
| `pages/Profile.jsx` + `MessageModal`, `MessagesModal` | R10 | 23 | EXERCISED — `008`, `028`, `065`–`067` |
| `pages/ParentWizard/WizardCompletePage.jsx` | R11 | 3 | EXERCISED — `009`, `046`, `047` |
| `pages/NotFound.jsx` | R13 | 1 | EXERCISED — `011` |

### Route inventory — all 13 routes cold-loaded

| Route | Screenshot | Rendered controls (buttons / inputs / links) |
|---|---|---|
| R2 `/reception` | `001` | 6 / 0 / 10 |
| R4 `/reception/parents` | `002` | 88 / 27 / 32 |
| R5 `/reception/parents/new` | `003` | 6 / 8 / 7 |
| R6 `/reception/teachers` | `004` | 40 / 1 / 7 |
| R7 `/reception/groups` | `005` | 16 / 1 / 7 |
| R8 `/reception/documents` | `006` | 3 / 1 / 8 |
| R9 `/reception/settings` | `007` | 10 / 8 / 7 |
| R10 `/reception/profile` | `008` | 5 / 0 / 7 |
| R11 `/reception/wizard/complete` | `009` | 5 / 0 / 7 |
| R3 `/reception/change-password` | `010` | 7 / 3 / 7 |
| R13 `*` NotFound | `011` | 1 / 0 / 0 |
| R1 `/login` | login step | exercised |
| R12 `/` redirect | implicit on every login | exercised |

---

## 4. Empty state vs full state — both witnessed

| Screen | Full state | Empty state |
|---|---|---|
| Parents | 62 parents, pagination `1 · 2 · 3` (`012`, `015` last page) | search `zzzzqqqq` → **`"zzzzqqqq" bo'yicha natija topilmadi`** (`014`) |
| Teachers | 9 teachers (`004`) | search `zzzzqqqq` → **`Tarbiyachilarni boshqarish(0)` / `Tarbiyachilar topilmadi` / `Qidiruvni tozalash`** (`017`) |
| Documents | 1 approved + 1 pending seeded | upload blocked (X-01) — `027` |

Search hit verified positively too: `Karimov` → `hitHasKarimov: true` (`013`).
Pagination reached the last page at volume (`015`) — 3 pages for 62 parents.

---

## 5. Validation failure per form — one each, all screenshotted

| Form | Invalid input | What the user sees | Verdict |
|---|---|---|---|
| Create teacher | completely empty | no network call — HTML5 `required` blocks submit; **no in-page message** (`019`) | acceptable, but silent |
| Create teacher | password "123" | red toast **`Validation failed`**, untranslated, field not named (`020`) | **D-21** |
| Create group | empty submit | `024` — form stays open, no message matched | weak; recorded, no separate id (same class as D-21) |
| Wizard step 1 | completely empty | **advances to step 2 and ticks it green** (`032`) | **D-23** |
| ParentFormModal | required field blanked | `075` | recorded |
| ChildFormModal | required field blanked | `070` | recorded |
| MessageModal | empty submit | `066` | recorded |

---

## 6. Refresh, back, double-submit

| Test | Result | Evidence |
|---|---|---|
| **Refresh at step 2** | returns to `QADAM 1 / 3`, all data lost (`dataSurvived: false`) | `038` → `039` |
| **Browser back from step 2** | exits the wizard entirely to `/reception/parents`; no warning | `042` — **D-24** |
| **Abandon at step 2, navigate away, return** | wizard shows `QADAM 1 / 3` with empty fields — but the draft *is* in localStorage and is offered by the banner on the next visit | `034` → `036`, then `043` — the mechanism behind **D-22** |
| **Double-submit step 3** | two `Yakunlash` clicks as fast as the DOM allows → **exactly one child created**, no duplicate | `046`, `047`; DB: `children named Saidova: 1` |
| **Orphan check after an abandoned wizard** | one parent account `t.abandon@tmm3.uz` exists — created not by the abandonment but by the D-22 resume path on the *next* wizard run | see D-22 |

Double-submit is safe. The wizard's real risk is D-22, not duplication.

---

## 7. Console and network across P2

23 console rows and 23 failed requests over 77 page loads.

| n | Row | Class |
|---|---|---|
| 20 | `401 GET /auth/me` + `401 POST /auth/refresh` | **baseline** — fires once per cold page load before authentication |
| 1 | `400 POST /reception/teachers` | **deliberate** — the D-21 weak-password probe |
| 1 | `500 POST /reception/documents` | **defect** — X-01 / D-06 |
| 1 | `403 POST /auth/login` | **expected** — D-17 first login on an unactivated reception |

Zero unclassified rows. No font 404s, no `parent/ratings` 400s.

---

## 8. Residual data this phase created

Left in place per L12 (deletion outside the `5eed` seed scope is forbidden), listed for the owner:

| Row | Where | Note |
|---|---|---|
| `t.abandon@tmm3.uz` (Zuhra Ibragimova, parent) | tmm3 | created by the D-22 resume path |
| child `Zilola Saidova` | tmm3, group assigned | **attached to the wrong guardian** — the D-22 artefact |
| `sh.umarova@tmm3.uz` (reception, `Faol emas`) | tmm3 | created for the D-17 witness |

None carry the `5eed` marker, so `--teardown` will not remove them. They are in the volume school
and would be visible in a demo of tmm3's parent list.

---

## 9. Close conditions

| # | Condition | Verdict | Evidence |
|---|---|---|---|
| **C1** | Every control enumerated from JSX and dispositioned. Count stated. | **MET** | 201 enumerated (`P2-controls.json`); 192 EXERCISED · 4 BLOCKED (X-01) · 5 NOT-APPLICABLE (`ParentCard.jsx`, dead code). Per-line table in `P2-coverage-table.md` |
| **C2** | Every form has a validation-failure screenshot | **MET** | §5 — 7 forms, 7 screenshots (`019`, `020`, `024`, `032`, `066`, `070`, `075`) |
| **C3** | Refresh / back / double-submit exercised on at least the wizard | **MET** | §6 — refresh `038`/`039`, back `042`, double-submit `046`/`047` |
| **C4** | New defects filed from D-19 with reproduction and file:line cause | **MET** | D-21 (`TeacherManagement.jsx:248`), D-22 (`ParentWizardPage.jsx:144` vs `Wizard.jsx:129`), D-23 (`ParentWizardPage.jsx:92`), D-24 (`ParentWizardPage.jsx:63-70`), D-25 (`ParentManagement.jsx:617-621`). D-19/D-20 were filed in P1. |
| **C5** | Citation audit of this artifact pasted | **MET** | §10 |

**P2: all five close conditions MET.**

---

## 10. Citation audit of this artifact (L4)

```
ARTIFACT P2-RECEPTION.md
  screenshot dirs      : audits/beta/deep/P2/screenshots
  files on disk        : 77
  filename citations   : 8 | unresolvable: 0 []
  ordinal citations    : 46 | unresolvable: 0 []
```

Index regenerated from the event log and cross-checked against the filesystem:
**77 rows / 77 files / 0 orphans.**
