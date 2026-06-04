# CLEANUP-07c-OTA-ONALAR

**Status:** 🟡 Code complete — awaiting user Railway verification  
**Scope:** Admin Ota-onalar (ParentManagement) page — master-detail cleanup, locale wiring, 07b conventions  
**Commit:** `f8bd988`

---

## STEP 1 — Current state (pre-change)

`admin/src/pages/ParentManagement.jsx` — 367 lines.

**Business constraint** (code comment): "Admin can VIEW parents and suspend/activate them." Admin cannot create or edit parents. Parents are created by reception staff.

**Layout**: `lg:grid-cols-2` master-detail split — LEFT = scrollable parent list, RIGHT = selected parent's full data (children, activities, meals, media, suspend/activate action).

**Identified issues:**

| Element | Issue |
|---|---|
| Header h1 | `text-4xl font-black` — oversized; no count in title |
| Search input | `pl-12 py-3 rounded-xl` — oversized, doesn't match 07b |
| Left panel inner h2 | "Ota-onalar" redundant with page title |
| Avatar bg | `bg-brand-100 text-brand-700` — accent on non-functional element |
| Status badges | Green/red pill badges (`bg-green-100 text-green-700 rounded-full`) — inconsistent with 07b dot pattern |
| Selected row | `bg-brand-50 border-l-4 border-brand-500` — heavy, uses brand-50 |
| `Eye` icon | Decorative, no function |
| Detail panel icons | `Baby, FileText, Utensils, ImageIcon` all with `text-brand-600` — decorative accent |
| Detail panel headers | "Children (N)", "Activities (N)", "Meals (N)", "Media (N)" — hardcoded English |
| No-data strings | "No children registered", "No activities", etc. — hardcoded English |
| Empty right panel | "Select a parent to view their data" — hardcoded English |
| UZ `children` key | `"Bolalar "` (trailing space, no count format) — bug |

---

## STEP 2 — Session doc discrepancy

**The session document was wrong in three key ways:**

1. **No `ParentFormModal` exists** — searched `admin/src/**/*Parent*Modal*` and `admin/src/**/*parent*form*`, zero results. The modal was never built.

2. **Admin cannot create or edit parents** — admin is view + suspend/activate only. The session doc's STEP 5 ("verify email split input, create flow, edit mode email lock") is entirely inapplicable.

3. **"Full CRUD on parents"** stated in the session doc is incorrect. The session doc appears to have been written assuming the GOV-ACCOUNT-DOMAINS architecture was fully implemented in the admin portal — it was not. Reception staff manage parent creation.

These findings are documented here as an example of **audit-vs-assumption drift**: session documents generated based on architectural intent may not match the actual deployed implementation. Always read the source code first (Rule 4 of the loop tracker).

---

## STEP 3 — User decisions (corrected scope)

- **A1**: Keep master-detail layout, clean up
- **B1**: Compact row styling (07b dot pattern, neutral avatar, terracotta selected border)
- **C**: Wire existing locale keys for all detail panel strings + add selectParent key
- Selected row: `border-l-[3px] border-brand-600 bg-warm-50` per spec
- No create flow, no edit flow, no modal — confirmed by actual code

---

## STEP 4 — Implementation

### Changes applied

**`admin/src/pages/ParentManagement.jsx`:**

| Element | Before | After |
|---|---|---|
| Import | `Eye` included | Removed `Eye`, added `ChevronRight` |
| Header h1 | `text-4xl font-black` + title only | `text-3xl font-semibold tracking-tight` + `title (N)` count |
| Search | `pl-12 py-3 rounded-xl` | `pl-10 py-2.5 rounded-lg text-sm` |
| Left panel inner h2 | "Ota-onalar" section header inside list | Removed |
| Avatar | `w-10 h-10 bg-brand-100 text-brand-700 font-bold` | `w-9 h-9 bg-warm-100 text-warm-700 font-semibold` |
| Status | Pill badge `bg-green-100/red-100 rounded-full` with text | `w-2 h-2 rounded-full` dot: `bg-success-500`/`bg-warm-300` with `title` tooltip |
| Selected row | `bg-brand-50 border-l-4 border-brand-500` | `border-l-[3px] border-brand-600 bg-warm-50` |
| Unselected hover | `hover:bg-warm-50` (no border) | `border-transparent hover:bg-warm-50` (border always present, just transparent) |
| `Eye` icon | Present in each row | Removed |
| Phone row | `text-sm text-warm-500 mt-2 flex items-center gap-2` | `text-xs text-warm-600 mt-2 pt-2 border-t border-warm-100` |
| Detail header | `<h2 text-lg font-semibold>` | `<p text-base font-semibold>` |
| Detail body container | `p-4 space-y-6` | `px-5 py-4 space-y-5 max-h-[520px] overflow-y-auto` |
| Section icons | `w-5 h-5 text-brand-600` | `w-4 h-4 text-warm-400` |
| Section headers | Hardcoded English "Children (N)" etc. | `t('parentsPage.children', { count: N })` etc. |
| No-data strings | Hardcoded English "No children registered" etc. | `t('parentsPage.noChildren')` etc. |
| Child links | Block with DOB/Gender/School/Class rows | Compact: name + class + `ChevronRight` |
| Empty right panel | "Select a parent to view their data" hardcoded EN | `t('parentsPage.selectParent', ...)` |
| Error state | "Failed to load parent data" hardcoded EN | `t('parentsPage.dataError')` |
| Suspend/activate buttons | No strokeWidth | `strokeWidth={1.75}` added for icon consistency |

### Token discipline

| Element | Token | Acceptable? |
|---|---|---|
| Avatar | `bg-warm-100 text-warm-700` | ✅ Neutral |
| Status dot — active | `bg-success-500` | ✅ Functional (status) |
| Status dot — suspended | `bg-warm-300` | ✅ Neutral |
| Selected row border | `border-brand-600` | ✅ Functional (state indicator) |
| Section icons | `text-warm-400` | ✅ Neutral |
| Child link chevron | `text-warm-300 group-hover:text-brand-600` | ✅ Functional (hover affordance) |
| Suspend button | `bg-red-50 text-red-700` | ✅ Functional (destructive action) |
| Activate button | `bg-green-50 text-green-700` | ✅ Functional (positive action) |

**Note on suspend/activate button colors:** These use raw Tailwind `green-*` and `red-*` instead of admin portal's `success-*`/`error-*` tokens. This is a pre-existing pattern that was kept as-is (user confirmed: "keep functional"). Future locale hygiene pass could standardize.

### Locale changes (all 3 files)

| Key | Change |
|---|---|
| `parentsPage.title` | "Ota-onalar boshqaruvi"/"Parent Management"/"Управление родителями" → "Ota-onalar"/"Parents"/"Родители" |
| `parentsPage.children` (UZ only) | `"Bolalar "` (typo + no count) → `"Bolalar ({{count}})"` |
| `parentsPage.selectParent` | New key — 3 locales |
| `parentsPage.statusActive` | New key — 3 locales |
| `parentsPage.statusSuspended` | New key — 3 locales |
| `parentsPage.activate` | New key — 3 locales |
| `parentsPage.suspend` | New key — 3 locales |

---

## STEP 5 — ParentFormModal verification

**Not applicable.** No modal exists. Admin is view + suspend/activate only. See STEP 2 for full explanation.

---

## STEP 6 — Responsive behavior

| Viewport | Layout |
|---|---|
| `< lg` (mobile + tablet) | Single column — list first, detail below (stacked by default `grid-cols-1`) |
| `≥ lg` | Two-column master-detail `lg:grid-cols-2` |

On mobile, after clicking a parent in the list, the detail panel appears below. This is acceptable for a management interface used primarily on desktop.

---

## STEP 7 — Test + build

| Check | Result |
|---|---|
| Tests | ✅ 30/30 · 162/162 |
| Build | ✅ built in 7.78s |

**Test changes in `ParentManagement.test.jsx`:**
- `shows Active badge for active parents` → `shows active status dot for active parents` — now checks `document.querySelector('[title="Faol"]')` instead of `screen.getByText('Active')`
- `shows Suspended badge for suspended parents` → similar, checks `title="To'xtatilgan"`
- 3 suspend/activate tests: `screen.getByText('Suspend')` → `screen.getByText("To'xtatish")` (matches defaultValue in JSX with i18n mock)

---

## STEP 8 — Commit

Commit: `f8bd988`  
Pushed to `origin/main`. Railway auto-deploy triggered.

---

## STEP 9 — User Railway verification (REQUIRED before close)

1. Login as director → Ota-onalar from sidebar
2. **Header**: "Ota-onalar (N)" — not "Ota-onalar boshqaruvi"
3. **List rows**: neutral grey avatar, 2px status dot (green=active, grey=suspended with tooltip), terracotta 3px left border on selected row
4. **Click any parent row** → detail panel fills on right with name, email, suspend/activate button
5. **Detail sections** in UZ mode: "Bolalar (0)", "Faoliyatlar (0)", "Ovqatlanish (0)", "Media (0)" — not English
6. **Suspend/activate** — click Suspend on active parent → confirmation dialog → confirm → status dot changes to grey; click Activate → dot returns green
7. **Language switching** (UZ → RU → EN):
   - UZ: "Ota-onalar", "Ko'rish uchun ota-onani tanlang", section headers in UZ
   - RU: "Родители", "Выберите родителя для просмотра данных", sections in RU
   - EN: "Parents", "Select a parent to view their details", sections in EN
8. **Search**: filter works, count in header updates
9. **Responsive** (≤1024px): layout collapses to single column; detail panel appears below list when parent selected

Screenshots: desktop in UZ (with parent selected showing detail panel), one in RU.

Reply "verified" before this is marked ✅.

---

## STEP 10 — Honest count

| Item | Status |
|---|---|
| Current state documented | ✅ |
| Session doc discrepancy documented | ✅ No ParentFormModal exists; admin is view+suspend/activate only |
| Layout: keep master-detail (A1) | ✅ |
| Compact row styling (B1) | ✅ |
| Locale wiring (C) | ✅ All hardcoded English → t() calls |
| Header "Ota-onalar (N)" per 07b convention | ✅ |
| Avatar neutral tokens | ✅ bg-warm-100 text-warm-700 |
| Status dot (green/grey) replacing pill badges | ✅ |
| Selected row 3px terracotta border + bg-warm-50 | ✅ |
| Eye icon removed | ✅ |
| Detail panel icons neutral (text-warm-400) | ✅ |
| Section headers wired to locale keys | ✅ children/activities/meals/media |
| No-data strings wired to locale keys | ✅ |
| Empty right panel locale key | ✅ selectParent in UZ/RU/EN |
| UZ children key typo fixed | ✅ "Bolalar ({{count}})" |
| 5 new locale keys × 3 langs | ✅ |
| Tests passing | ✅ 30/30 · 162/162 |
| Test assertions updated for dot pattern | ✅ |
| Build clean | ✅ |
| User Railway verification | ⏳ pending |

---

## Incidental observations

1. **Session document vs. reality gap** — the original session doc assumed parent CRUD based on GOV-ACCOUNT-DOMAINS architecture (which added email domain logic for parent accounts). The admin portal was designed to delegate parent creation to reception staff. This is consistent with the business logic: directors manage staff (receptions), receptions manage families (parents + children). Future session documents should be cross-checked against actual source code before implementation.

2. **Suspend/activate button colors** — still using raw Tailwind `green-*`/`red-*` rather than admin portal's `success-*`/`error-*` tokens. Pre-existing, kept as-is. Candidate for locale hygiene pass.

3. **Detail panel child DOB/Gender/School/Class fields removed** — the old child link blocks showed DOB, Gender, School, and Class as 4 separate lines. This was excessive for a list-adjacent detail panel. Simplified to: child name + class, with ChevronRight to navigate to full ChildDetail. The removed fields are all visible on the ChildDetail page.

4. **Left panel `max-h-[600px] overflow-y-auto`** — retained to keep the two-column layout stable. Default browser scrollbar used (light background, macOS overlay or Windows standard). The `.sidebar-scroll` CSS class from CLEANUP-06 is for dark sidebar backgrounds (white rgba colors) and would not suit this light panel. Acceptable as-is.

5. **`parentsPage.listTitle` key** — still in locale file but no longer used in the JSX (inner h2 removed). Harmless unused key.
