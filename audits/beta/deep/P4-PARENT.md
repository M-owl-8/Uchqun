# P4 — Parent portal, deep audit (desktop and 390×844)

**Campaign:** DEEP HARDENING · phase 4 of 8
**Date:** 2026-08-14
**HEAD at start of phase:** `62d5214f` (branch `main`)
**Tenant:** beta seed tenants only — every id touched carries the `5eed` marker (L8, L12)
**Artifacts:** `audits/beta/deep/P4/screenshots/` (109 files) · `audits/beta/deep/P4/logs/` · `audits/beta/deep/P4/screenshot-index.md` · `audits/beta/deep/P4-coverage-table.md`

The parent persona is served by the `teacher` Vite app (`teacher/src/parent/**`), so "parent portal" here means that route tree, not a separate deployment.

---

## 1. Method

| script | what it establishes |
|---|---|
| `p4a-parent-routes.mjs` | all 16 parent routes at **1440×950 and 390×844**, control dumps, per-route horizontal-overflow measurement |
| `p4b-mobile-and-flows.mjs` | viewport-sized mobile captures, label-clipping measurement, teacher rating, chat send, seven read surfaces, parent write-attempt probes |
| `p4c-switcher-tabbar.mjs` | child switcher, language-control search, notifications, first tab-bar measurement |
| `p4d-tabbar-behaviour.mjs` | tab bar measured on a short and a long page at three scroll positions; five real touch taps |
| `p4e-switcher-data.mjs` | does switching child change the data or only the label |
| `p4f-settings-consent.mjs` | settings inventory, profile round-trip, password rejection, message modal, help, AIWarnings routing |
| `p4g-consent-flow.mjs` | privacy-consent withdrawal with the native dialog accepted, re-prompt at login, consent re-granted |
| `p4h/p4i/p4j/p4k` | child-profile modals; four runs to settle one ambiguous control — see §6 |

**Account.** `otaona11@tmm3.uz` — Rayhona Ergasheva, guardian of Gulnoza Ergasheva (`5eed0c9a-…`, Umid guruhi, DOB 2018-02-22, shown as "8 yosh").

**Viewports.** Desktop `1440×950`; mobile `390×844` with `hasTouch: true` and `isMobile: true`, so taps are real touch events rather than synthesised mouse clicks.

**Screenshot discipline.** Mobile evidence for layout claims is captured at **viewport size, not `fullPage`**. `fullPage` renders `position: fixed` elements at their scroll-time offset, which produced a false reading in the first pass — see §6.

---

## 2. Coverage

Controls enumerated statically from `teacher/src/parent/**` JSX → `P4-controls.json`: **117** across 25 files. Per-control table with file:line in `P4-coverage-table.md`.

| disposition | controls | share |
|---|---|---|
| EXERCISED | 109 | 93.2% |
| BLOCKED (X-01) | 4 | 3.4% |
| NOT-APPLICABLE | 4 | 3.4% |
| NOT-REACHED | 0 | 0% |

**BLOCKED (4)** — `AvatarUploadModal.jsx`, file input only. X-01 gate, unchanged.

**NOT-APPLICABLE (4)** — `AIWarnings.jsx`. It is not routed in the parent tree: `/warnings`, `/ai-warnings` and `/xabar?tab=warnings` all render the parent 404 (`p4f.json → ai-warnings-routes`, three identical `404 | Sahifa topilmadi` bodies). Dead code, not a user-facing gap.

Also dead: `teacher/src/parent/components/LanguageSwitcher.jsx` — it wraps the shared switcher but is never mounted. See D-36.

**Routes.** All 16 swept at both viewports (`001`–`016` desktop, `017`–`032` mobile), including the 404.

---

## 3. Mobile layout at 390×844

Measured per route as `documentElement.scrollWidth` vs `clientWidth`. **Fourteen of sixteen routes fit exactly** (390 = 390). Two do not.

| route | scrollWidth | clientWidth | over by | defect |
|---|---|---|---|---|
| `/rating` | **411** | 390 | 21 px | D-32 |
| `/therapy` | **394** | 390 | 4 px | D-33 |

### D-32 — the rating page does not fit a phone, and four of five criteria are unreadable (degrades-use)

The page whose entire purpose is to collect a parent's rating of the school renders 21 px wider than the viewport, and the overflow **cannot be scrolled to**: after `window.scrollTo(document.documentElement.scrollWidth, y)`, `window.scrollX` is still `0` (`p4b.json → rating-mobile-scrolled-right`). The content past 390 px is simply cut off.

Measured clipping of the school-rating criterion labels — each label box is 96 px, each label needs more:

| label | clientWidth | scrollWidth |
|---|---|---|
| `Muassasa tozaligi` | 96 | 119 |
| `Muassasa tarbiyachisi` | 96 | 149 |
| `Bolaning o'sishi` | 96 | 105 |
| `Muassasaga ishonch` | 96 | 141 |

On screen they render as `Muassasa t...`, `Bolaning o's...`, `Muassasag...` — the parent is asked to award one to five stars against criteria whose names they cannot read. The right-hand column (`UMUMIY`, the `Q3-2026` period label) is also cut.

Witnesses: `027_parent-mobile_mobile-P11-rating.png` (full page), `033_parent-mobile_D-32-mobile-D-32-rating-viewport-top.png`, `034_parent-mobile_D-32-mobile-D-32-rating-criteria-labels-clipped.png`, `035_parent-mobile_D-32-mobile-D-32-rating-scrolled-right.png`.

The same page at 1440 px is correct (`011_parent-desktop_P11-rating.png`), so this is purely a narrow-viewport failure — on the portal whose users are overwhelmingly on phones.

### D-33 — therapy page overflows by 4 px (cosmetic)

394 px vs 390 px. Culprit measured as the filter row's last chip (`BUTTON.px-4 …`, right edge 394, text `Kontent`); the bottom navigation then inherits the widened document. Witnesses `025_parent-mobile_mobile-P9-therapy.png`, `036_parent-mobile_D-33-mobile-D-33-therapy-viewport.png`, `037_parent-mobile_D-33-mobile-D-33-therapy-scrolled-right.png`.

Four pixels, no content lost. Recorded because the campaign fixes 390 px as a target width and this misses it; it sits below the blocks-use / degrades-use scale.

### Tab bar and touch targets — correct

Five real `touchscreen.tap()` events, each landing on the right route:

| tap | target | destination |
|---|---|---|
| Kundalik | 78×64 | `/journal` |
| Galereya | 78×64 | `/media` |
| Xabar | 78×64 | `/chat` |
| Bola | 78×64 | `/child` |
| Bugun | 78×64 | `/` |

Witnesses `063`–`067`. Every target is 78×64, comfortably above the 44 px minimum; `tap-targets-under-44px` is empty.

The bar stays on screen. Measured on a short page (964 px document) and a long one (2339 px), at top, middle and bottom of scroll: `navTopViewport` is constant (780 short / 826 long) while `navTopDocument` tracks `scrollY`, and `visibleInViewport` is `true` at all six measurements (`p4d.json`). Witnesses `056`–`061`.

---

## 4. New defects

### D-35 — the notification centre is never fed by journal, chat or attendance (degrades-use)

On the day the parent's child received a journal entry, a chat message and three attendance changes, the parent's notification page reads `Bildirishnomalar(0)` with `Hammasi (0) · O'qilmagan (0) · O'qilgan (0)` and `Hozircha bildirishnoma yo'q`. Witness `054_parent-desktop_D-35-D-35-notifications-empty.png`.

Database, whole table:

```
=== notifications for this parent ===   (0 rows)

=== notifications total ===
 total | today
    18 |     2

=== notification types present ===
 type     | count
 activity |     6
 media    |     6
 meal     |     5
 general  |     1
```

There is no `journal`, `chat`, `attendance` or `rating` type in the table at all. The events that actually matter to a guardian — a teacher wrote to you, your child was marked absent, an absence was cleared — generate nothing. Three of those happened to this exact parent today and produced zero rows.

This compounds D-27: reception overwriting a teacher's absence record is invisible in the audit log *and* silent to the guardian.

### D-36 — a parent cannot change language after logging in (degrades-use)

`langControlsAnywhere` is empty on `/settings` (`p4c.json`), and the settings page contains exactly: profile fields, an email-notification checkbox, the password form, the privacy-consent block and logout (`076_parent-desktop_settings-full.png`). No language control on any of the 16 routes.

`<LanguageSwitcher>` is rendered at exactly one place in the whole app — `teacher/src/pages/Login.jsx:269`, `variant="auth"`. `teacher/src/parent/components/LanguageSwitcher.jsx` exists, imports the shared component, and is never mounted anywhere (no import of it outside its own definition).

So a parent's language is fixed at the login screen. A parent who lands in the wrong locale, or whose device negotiated one, must log out to change it. The platform ships uz-latn, uz-cyrl and ru and, per `CLAUDE.md`, must display an auto-translation notice to end users (CP-019) — a locale the user cannot change undermines both.

### D-37 — the logout button renders the untranslated key `logout` in the teacher app (degrades-use)

`teacher/src/parent/pages/Settings.jsx:414` and `teacher/src/pages/Settings.jsx:249` both call `t('logout')`. The key does not exist at top level in any of the app's three catalogues:

```
teacher/src/locales/en/common.json:  top-level logout = undefined
teacher/src/locales/ru/common.json:  top-level logout = undefined
teacher/src/locales/uz/common.json:  top-level logout = undefined
```

It exists only as `nav.logout` (`"Chiqish"`). i18next therefore renders the key itself, and the button reads literally **`logout`** — visible in `076_parent-desktop_settings-full.png` on the largest, reddest, most destructive control on the parent's settings page, in an otherwise fully Uzbek interface. The same call site in the teacher persona produced the same string in P3 (`p3i.json → settings-settings`, button list contains `logout`).

Scope check: `admin` is **not** affected — `admin/src/locales/{uz,ru,en}/common.json` all define top-level `logout` (`"Chiqish"` / `"Выход"` / `"Logout"`). The defect is confined to the `teacher` app, which serves both the teacher and parent personas.

**Why no test caught it:** `teacher/src/__tests__/pages/Settings.test.jsx:38` mocks `react-i18next` with `const stable = { t: (k) => k, … }`. Every translation call returns its own key, so `getByText('logout')` passes whether or not a translation exists. This is not a test that pins the defect — it is a test suite structurally unable to observe any missing key. Relevant to P8: a fix here changes no test outcome, so the fail-first requirement (L11) must be met with a new test that asserts against the catalogue, not against rendered output under an identity mock.

---

## 5. Everything else exercised, with its outcome

| area | action | result | evidence |
|---|---|---|---|
| Dashboard | daily summary | `DAVOMAT Bor · TAOMLAR 3/3 · SURATLAR 0 · FAOLIYATLAR 15`, matching the DB row for 2026-08-14 | `001` |
| Dashboard | today's journal entry | shows the entry the teacher sent in P3n, attributed `— Zebo Ashurova` | `001` |
| Teacher rating | 5 stars + comment, submit | `POST /api/v1/parent/ratings → 200`, row `c40c1408-…`, toast `Rahmat…` | `041` |
| Chat | parent sends | `POST /api/v1/chat/messages → 201`, id `72da58ef-…`, `senderRole: parent` | `043` |
| Journal | read | `Kun jurnali(7)`, entries attributed to `ZEBO ASHUROVA` | `044` |
| IRR | read-only | `Hali baholash o'tkazilmagan` — correct: the child's IRR row exists but has no assessment recorded | `045` |
| Media | empty gallery | `0` assets, consistent with X-01 and with the dashboard's `SURATLAR 0` | `046` |
| Meals / Activities | read | `Taomlar(45)`, `Individual reja(15)` | `049`, `050` |
| Child switcher | switch child | chips `Gulnoza` / `Islom`; after switching, `/journal` reads `Kun jurnali(0)` where it read `(7)` — the data follows, not just the label | `070`, `071`, `075` |
| Settings | phone round-trip | `PUT /user/profile → 200`; `+998901000099` survived a reload; restored to `+998936753399` and verified | `077` |
| Settings | wrong current password | `PUT /user/password → 400 {"code":"CURRENT_PASSWORD_INCORRECT"}` | `079` |
| Message to school | compose and send | `POST /api/v1/parent/message-to-government → 201`, id `5aba633e-…` | `083` |
| My messages | open the list | modal contains `Mening xabarlarim | QA-P4F savol | Respublika | 2026 M08 14 15:02 | Sizning xabaringiz: …` — the parent can read back what they sent | `109` |
| Help | FAQ page | contact card, four Q&A cards, four quick links; no interactive controls by design | `084` |
| Privacy consent | withdraw → re-prompt → re-grant | `DELETE /parent/privacy-consent → 200 {"withdrawn":true}` → `POST /auth/logout → 200` → redirect `/login` → modal re-presented → `POST /parent/privacy-consent → 200` | `094`, `095`, `096`, `097` |

### Parent authorisation boundary — holds

Four probes from the parent's own authenticated session:

| request | result |
|---|---|
| `POST /api/v1/attendance` (mark own child absent) | **403** `Insufficient permissions` |
| `POST /api/v1/teacher/journal/bulk` | **403** `Insufficient permissions` |
| `GET /api/v1/teacher/children` | **403** `Insufficient permissions` |
| `GET /api/v1/attendance?startDate=…&endDate=…` | **403** `Insufficient permissions` |

The last one matters: **D-31's school-wide attendance leak does not extend to parents.** That endpoint returns all 61 children to a teacher but refuses a parent outright. D-31 is bounded to the teacher role.

(The 403 bodies use the legacy `{error:'<string>'}` shape and are untranslated English. Grandfathered under the response-shape standard in `CLAUDE.md`; noted, not filed.)

### Observation — `window.confirm` guards a legally-significant action

`teacher/src/parent/pages/Settings.jsx:131`:

```js
const handleWithdrawConsent = async () => {
  if (!window.confirm(t('settings.withdrawConsentDesc'))) return;
```

Withdrawing privacy consent — which logs the user out and forces re-consent — is gated by a native browser dialog rather than the styled modal pattern used everywhere else in the app. It functions correctly (proved in §5), but it is unstyled, its buttons are not translatable, and it is suppressed in some embedded/webview contexts. Recorded as an observation; not filed as a defect.

---

## 6. Corrections to my own work in this phase

1. **D-34 — withdrawn.** I hypothesised the mobile tab bar was not fixed, because `getComputedStyle(nav).position` reads `static` and the first `fullPage` screenshot rendered it in the middle of the document. Measuring at three scroll positions on two pages showed `navTopViewport` constant and `visibleInViewport: true` throughout: the bar is fixed by a wrapper and never leaves the screen. **There is no tab-bar defect.** Screenshots `056`–`061` retain the `D-34` tag because they were written during the investigation; the number is retired, not reused.

2. **D-38 — withdrawn.** `Mening murojaatlarim` timed out under Playwright's click, which reads as an inert control, and I tagged screenshots `103`/`104` `D-38`. The button is at y≈1615 on a 950-tall viewport; after an explicit `scrollIntoView` the hit test returns the button itself and the same click succeeds. The modal opens and contains the message sent in P4F (`109`). **No defect.** Number retired.

3. **The consent-withdrawal "silent button" was my harness.** In `p4f` the revoke produced no network request and no visible change, which looks exactly like a dead control. `Settings.jsx:131` uses `window.confirm()`, and Playwright auto-dismisses dialogs, so the handler returned before doing anything. With an explicit `dialog` handler the full flow works (§5). Had I filed from the first run I would have reported a working feature as broken.

4. **The first parent-route sweep recorded `consent-desktop: "error: Cannot read properties of undefined"`** — I called `acceptParentConsent(p)` against a signature of `(P, page, role)`. The consent modal was genuinely absent (consent had been granted on 2026-07-20), so the sweep itself is valid; the call was corrected for later runs.

5. **Four scripts to settle one control** (`p4h`, `p4i`, `p4j`, `p4k`). Recorded rather than collapsed into a tidy single run, because the intermediate readings were wrong and the artifact should show that.

---

## 7. Two guardians — unrepresentable, re-derived from the schema

```
=== child.parentId nullable? ===
 column_name | is_nullable | data_type
 parentId    | NO          | uuid
```

That is the only parent- or guardian-shaped column on `children`; there is no second-guardian column and no join table. `backend/models/Child.js:10-18` declares it `allowNull: false` with `onDelete: 'CASCADE'`. A child has exactly one guardian, enforced at the database level.

So "both guardians see the same child" cannot be tested, because the platform cannot express it. This is **D-19**, re-derived here independently of P1 rather than cited from it.

**A second finding falls out of the same query:** no seeded parent had more than one child either, so the child switcher — a real, shipped feature — had no data to run against. Rather than declare it untestable I created the condition and removed it:

- recorded the original: `children.parentId` of `5eed83ee-…` (Islom Mirzayev) = `5eede9a9-…` (`otaona16@tmm3.uz`)
- repointed it to `5eed7bf3-…` (`otaona11@tmm3.uz`), both ids `5eed`-scoped, guarded by `AND id::text LIKE '5eed%'`
- exercised the switcher (§5)
- restored it and verified: `RESTORED == true`, `children still attached to otaona11: 1`

No row was deleted and no schema was touched (L12). The change was an `UPDATE` of one nullable-free FK on one seed row, with the prior value recorded before the write and re-asserted after.

**One tenant change was not reversed:** exercising the consent lifecycle moved this parent's `consentedAt` from `2026-07-20` to `2026-08-14`. Consent is re-granted and the account is usable, but the original timestamp is gone. Stated rather than glossed.

---

## 8. Citation audit (L4)

```
$ node audits/beta/deep/citation-audit.mjs audits/beta/deep/P4-PARENT.md audits/beta/deep/P4/screenshots
```

Result in §10. Index generated from the event log and cross-checked against the filesystem: **109 events indexed, 109 files on disk, 0 orphans**. Every SQL block and every HTTP body is pasted from tool output.

---

## 9. Close conditions

| # | condition | verdict | basis |
|---|---|---|---|
| C1 | Every parent route reached and screenshotted at **both** 1440×950 and 390×844 | **MET** | 16 routes × 2 viewports, `001`–`032`, including the 404 |
| C2 | Every enumerated parent-side control dispositioned with a reason for anything not exercised | **MET** | 117/117: 109 exercised, 4 blocked by X-01, 4 not-applicable (AIWarnings proven unroutable). No NOT-REACHED. |
| C3 | Horizontal fit at 390 px measured on every route, not eyeballed | **MET** | `scrollWidth` vs `clientWidth` per route; 14 exact, 2 over → D-32, D-33 |
| C4 | Touch interaction exercised with real touch events, and tap targets measured | **MET** | `hasTouch` context, five `touchscreen.tap()`s, all targets 78×64 (`063`–`067`) |
| C5 | Every parent write path exercised end to end and confirmed server-side | **MET** | rating 200, chat 201, message 201, profile 200 + reload, consent DELETE/POST 200 |
| C6 | The parent authorisation boundary probed, not assumed | **MET** | four cross-role probes, all 403; bounds D-31 to the teacher role |
| C7 | Two-guardian visibility witnessed | **UNMET — unrepresentable** | `children.parentId` is a single `NOT NULL` uuid with no second-guardian column (D-19). Not a testing gap; the platform cannot express two guardians. Recorded as UNMET rather than reworded into something passable. |

---

## 10. Verification commands

```bash
node audits/beta/deep/_p4index.mjs
#   → indexed 109 files 109 orphans 0

node audits/beta/deep/citation-audit.mjs audits/beta/deep/P4-PARENT.md audits/beta/deep/P4/screenshots

node audits/beta/deep/p4-coverage.mjs
#   → total 117 {"EXERCISED":109,"BLOCKED":4,"NOT-APPLICABLE":4,"NOT-REACHED":0}

node audits/beta/deep/p4a-parent-routes.mjs      # both viewports, overflow measurement
node audits/beta/deep/p4d-tabbar-behaviour.mjs   # the D-34 retraction evidence
node audits/beta/deep/p4g-consent-flow.mjs       # consent withdrawal and restoration
```

---

## 11. Defect ledger delta

| id | severity | one line | fixed in P8? |
|---|---|---|---|
| D-32 | degrades-use | `/rating` is 411 px wide at 390 px and the overflow cannot be scrolled to; 4 of 5 school criterion labels clipped in 96 px boxes | pending |
| D-33 | cosmetic | `/therapy` is 394 px wide at 390 px | pending |
| D-34 | **withdrawn** | tab bar investigated and found correct — fixed and always visible | n/a |
| D-35 | degrades-use | notifications are never generated for journal, chat, attendance or rating events; only activity/media/meal types exist | pending |
| D-36 | degrades-use | no in-app language switcher for parents; `parent/components/LanguageSwitcher.jsx` is never mounted | pending |
| D-37 | degrades-use | `t('logout')` has no top-level key in the teacher app's uz/ru/en, so the logout button renders `logout` in both the teacher and parent portals | pending |
| D-38 | **withdrawn** | "Mening murojaatlarim" investigated and found working | n/a |

Carried forward: **D-19** re-derived and still binding — one guardian per child, enforced by `NOT NULL` on `children.parentId`. **D-31** bounded: the attendance list leak is teacher-only; parents get 403. **D-03** and **D-11** hold (parent attendance dates in P3 §3.3; rating submission here). **X-01** gates 4 controls.

---

*P4 closed. Conditions were marked by me and are not self-certified — per L6 they are input to P8's re-derivation. C7 is UNMET and stays UNMET.*
