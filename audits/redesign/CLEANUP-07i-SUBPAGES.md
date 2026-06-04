# CLEANUP-07i-SUBPAGES — IRR + Guruhlar + Audit jurnali

**Status:** ✅ CLOSED (pending user Railway verification)
**Commit:** df3abb8
**Tests:** 30/30 · 165/165 · build clean

---

## Pages covered

| Page | Route | Access path |
|---|---|---|
| ManagerIRR | `/admin/irr` | Dashboard Hisobotlar → "IRR →" + Settings Quick Links |
| GroupManagement | `/admin/groups` | Dashboard Hisobotlar → "Guruhlar →" + Settings Quick Links |
| ActivityFeed | `/admin/activity` | Dashboard → "Audit jurnali →" link |

---

## STEP 1 — Current state audit

### ActivityFeed

| Element | Finding | Severity |
|---|---|---|
| Header | Plain `h1 text-3xl font-semibold` — no letterhead/eyebrow | Medium |
| Locale collision | **CRITICAL**: Two `activityFeed` top-level keys in all 3 JSON files. JSON parser keeps last block (pageOf/prev/next), first block (title/subtitle/filter keys) is silently dropped. Component renders via `defaultValue` only. | High |
| Date format | Hardcoded `toLocaleString('uz-UZ')` — shows wrong format in RU/EN | Medium |
| Focus rings | `focus:ring-brand-500` — should be `focus:ring-brand-600/30 focus:border-brand-600` | Low |
| Actor display | `${entry.actor.firstName} ${entry.actor.lastName}` — correct, names not UUIDs | OK |
| Filters | Working select + date range filters — functional, translated | OK |
| Pagination | prev/next keys were in the orphan block — broken until fix | Fixed |

### GroupManagement

| Element | Finding | Severity |
|---|---|---|
| Header | `text-4xl font-black` — old oversized pattern, no letterhead/eyebrow, no (N) count | Medium |
| Avatar | `bg-brand-100 text-brand-700` — raw brand color, should be warm-100/600 | Low |
| Search input | `rounded-xl` — should be `rounded-md` per 07h convention | Low |
| Focus ring | `focus:ring-brand-500` — wrong | Low |
| Empty state | No explanation of who creates groups | Low |
| Read-only | No create/edit/delete buttons — correctly enforced | OK |
| Locale | Missing `eyebrow`, `emptyReason`; title "Guruh boshqaruvi" → "Guruhlar" | Medium |

### ManagerIRR

| Element | Finding | Severity |
|---|---|---|
| Header | `text-xl font-bold` — small, no letterhead/eyebrow | Medium |
| SECTION_MAP labels | 5 section labels hardcoded in UZ Cyrillic (`'Ахборот тизими'`, etc.) — not translatable | Medium |
| Focus rings | `focus:ring-brand-500` on all inputs + textarea | Low |
| No locale section | All strings fell through to Cyrillic defaultValues — no proper UZ Latin, RU, or EN translations | High |
| CRUD tabs | Two tabs (Goal Periods + Quarterly) both working with validation + toasts | OK |
| Sign button | `bg-brand-600 text-white` — small inline CTA, acceptable as primary accent | OK |

---

## STEP 2 — Decisions

No ambiguous decisions. All three pages map cleanly to established 07-series conventions.

---

## STEP 3 — Implementation

### Locale fixes (3 files: uz, en, ru)

**activityFeed duplicate collision fix:**
- Merged the orphan second `activityFeed` block (pageOf/prev/next) into the canonical first block
- Added `eyebrow` key to the canonical block
- Removed orphan block from end of each file

**groupsPage additions:**
- `eyebrow`: "Boshqaruv" / "Management" / "Управление"
- `title`: "Guruhlar" / "Groups" / "Группы" (was "Guruh boshqaruvi" etc.)
- `emptyReason`: explains groups are created by reception staff

**managerIrr section (new — 40 keys × 3 langs):**
- `eyebrow`, `title`, `subtitle`, all tab/sign/quarterly/section keys
- Section labels: sectionInfoSystem/sectionParentWork/sectionDocumentation/sectionCareQuality/sectionConditions

### ActivityFeed.jsx
- Letterhead header: eyebrow + h1 + subtitle
- `DATE_LOCALE` map + `i18n?.language` optional chain for locale-aware date
- Focus rings: `ring-brand-600/30 border-brand-600`

### GroupManagement.jsx
- Letterhead header with `(groups.length)` count
- Avatar: `bg-warm-100 text-warm-600`
- Search: `rounded-md`, `h-10`, correct focus ring
- Empty state: `emptyReason` shown when no search query

### ManagerIRR.jsx
- Letterhead header with eyebrow
- `SECTION_MAP`: `label` field replaced with `labelKey` → `t(labelKey)`
- Focus rings: all `ring-brand-600/30 border-brand-600`

---

## STEP 5 — Build + test

```
30/30 test files · 165/165 tests · 0 failures
build: ✓ 8.16s
```

---

## STEP 6 — Commit

`df3abb8` — feat(admin): IRR + Guruhlar + Audit jurnali conventions pass — admin portal CLEANUP-07 series complete

---

## STEP 7 — Railway verification checklist (user)

### IRR (`/admin/irr`)
- [ ] Letterhead header renders: eyebrow "Hisobotlar" + title "IRR boshqaruvi — Rahbar"
- [ ] Periods tab: children load, expand shows goal periods with sign buttons
- [ ] Quarterly tab: form renders with section labels in UZ Latin (not Cyrillic)
- [ ] Sign action → success toast
- [ ] Quarter submit → success toast; duplicate → error toast
- [ ] Language switch UZ→RU→EN: full translation (eyebrow / title / section labels)

### Guruhlar (`/admin/groups`)
- [ ] Header: eyebrow "Boshqaruv" + "Guruhlar (N)"
- [ ] Groups render with warm-100 avatar (no brand-100 blue tint)
- [ ] No create/edit/delete buttons visible
- [ ] Empty state shows "Guruhlar qabulxona xodimlari tomonidan yaratiladi"
- [ ] Search works; filter empty state shows emptySearch message
- [ ] Language switch: full translation

### Audit jurnali (`/admin/activity`)
- [ ] Letterhead header: eyebrow "Hisobotlar" + title "Faoliyat tarixchasi"
- [ ] Entries show actor NAMES (not UUIDs)
- [ ] Action labels translated (not raw `approve:documents`)
- [ ] Date format adapts on language switch (uz-UZ / ru-RU / en-US)
- [ ] Filters work (action dropdown + date range)
- [ ] Pagination shows Oldingi / Keyingi (not "Oldingi" from defaultValue)
- [ ] Language switch: full translation

### Admin portal final sweep
- [ ] Every sidebar nav item loads without error
- [ ] No console errors on any page
- [ ] One full UZ→RU→EN cycle on Dashboard

---

## STEP 8 — Honest count

| Area | Before | After |
|---|---|---|
| activityFeed locale collision | All title/subtitle/filter keys broken in 3 langs | Fixed — merged into single canonical block |
| managerIrr locale | 0 keys — all Cyrillic defaultValues | 40 keys × 3 langs |
| groupsPage | Missing eyebrow/emptyReason, title wrong | 3 new keys, title corrected |
| ActivityFeed header | Plain h1 | Letterhead + eyebrow |
| ActivityFeed date | Hardcoded uz-UZ | Locale-aware via i18n.language |
| GroupManagement header | text-4xl font-black, no count | Letterhead + (N) count |
| GroupManagement avatar | bg-brand-100 token drift | bg-warm-100 |
| GroupManagement search | rounded-xl | rounded-md |
| ManagerIRR header | text-xl font-bold | Letterhead + eyebrow |
| SECTION_MAP | 5 hardcoded Cyrillic labels | t() keys → translatable |
| Focus rings (all 3) | ring-brand-500 | ring-brand-600/30 |
| Admin portal CLEANUP-07 series | 07a–07h closed | 07i closes — PORTAL COMPLETE |
