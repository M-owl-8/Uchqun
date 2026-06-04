# CLEANUP-07a-DASHBOARD

**Status:** 🟡 STEP 2 — awaiting user layout approval before writing code  
**Scope:** Admin portal dashboard restructure — visual hierarchy, consolidated attention zone, compact stats

---

## STEP 1 — Current state

### Section-by-section audit (post CLEANUP-05)

| Section | Location in JSX | Visual weight | Functional purpose | Issue |
|---|---|---|---|---|
| Page header | lines 252–278 | High | Date + title + welcome + last-updated + refresh | ✅ Clean |
| Attention zone (3 cards) | lines 280–362 | **Very high** (large grid-cols-3) | Pending docs / AI warnings / pending receptions | 3 equal-weight large cards — each with a `text-4xl` counter, avatars row, and action link. Consumes ~240px height |
| Stats (4 cards) | lines 364–403 | **High** (grid-cols-4) | Children / Teachers / Parents / Occupancy | Same visual weight as attention, competing. Stats need far less space |
| Two-column main | lines 405–553 | Medium | Left: Activity feed + Rating panel · Right: Tasks + Quick info | Rating is currently in LEFT column below activity (counterintuitive — rating is overview data, not a recent-events feed) |
| → Activity feed | lines 409–444 | Medium-high | 8 most recent audit log entries | ✅ Correct placement |
| → Rating panel | lines 446–481 | Medium | Star chart + distribution bars | Currently LEFT column — competes for space with activity feed |
| → Tasks | lines 485–507 | Medium | Derived tasks from pending docs + AI warnings | Content is largely the **same data** as the attention zone — partial redundancy |
| → Quick info | lines 509–551 | Low-medium | School address / capacity / accreditation / phone | Mostly redundant — capacity is in stats, address/phone are in SchoolProfile |
| Hisobotlar strip | lines 555–586 | Low | IRR + Groups quick-links (CLEANUP-05 addition) | ✅ Correctly weighted low. Currently 2 cards — should be 3 (add Audit jurnali) |

### Key layout problems

1. **Competing visual weights** — attention zone (3 large cards) and stats (4 large cards) are both `text-4xl` / `text-3xl` and `bg-surface border p-5`. The page has no clear primary/secondary hierarchy between them.

2. **Rating in wrong column** — rating panel is stacked below the activity feed in the LEFT column. It's a separate information category (school quality metric) and belongs with the director's daily summary items in the right column.

3. **Tasks ≈ attention zone** — the tasks section derives its items from `pendingDocsArray` and `aiWarningsArray` — the same sources as two of the three attention cards. They both show "N documents pending" and "open warnings". This is content duplication.

4. **Quick info is low-signal** — `address`, `capacity`, `accreditation`, `phone` from `user.school.*`. Capacity is already a stat card. Address and phone are available in SchoolProfile. Accreditation is rarely needed day-to-day.

5. **Hisobotlar strip has only 2 cards** — IRR + Guruhlar. The task session calls for 3: add Audit jurnali.

---

## STEP 2 — Layout proposal (awaiting user approval)

```
┌─ HEADER ───────────────────────────────────────────────────────────────┐
│  Dushanba, 4 iyun 2026      Boshqaruv paneli             ⟳ 14:22      │
│  Xush kelibsiz, Ali.                                                    │
├─ ATTENTION ZONE (single consolidated card) ────────────────────────────┤
│  Sizning e'tiboringizni talab qiladi                                    │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │ 📄  3 ta hujjat tasdiqlash kutmoqda          Ko'rib chiqish →   │  │
│  │ 🔔  2 ta ogohlantirish (1 ta yuqori daraja)  Hammasini ko'rish →│  │
│  │ 👤  1 ta yangi xodim faollashtirish kutmoqda  Faollashtirish → │  │
│  │  ─ ─ ─  (row hidden if count=0)                                 │  │
│  └──────────────────────────────────────────────────────────────────┘  │
├─ STATS STRIP ──────────────────────────────────────────────────────────┤
│  Muassasa — bir qarashda                                                │
│  ┌──────────┬──────────┬──────────┬──────────┐                       │
│  │   12     │    4     │    8     │  12/15   │                       │
│  │ Bolalar  │Tarbiyach.│Ota-onalar│  Bandlik │  compact inline       │
│  └──────────┴──────────┴──────────┴──────────┘                       │
├─ MAIN TWO-COLUMN ──────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────┬─────────────────────────────────┐ │
│  │  So'nggi faoliyat               │  Muassasa reytingi              │ │
│  │  [Audit jurnali →]              │  ★★★★☆ 4.3 (12 baho) Batafsil →│ │
│  │  ─ entry ─ 2 daqiqa oldin      │  [bar chart]                    │ │
│  │  ─ entry ─ 1 soat oldin        │                                 │ │
│  │  ─ entry ─ ...                  │                                 │ │
│  │  (scrolls internally)           │                                 │ │
│  └─────────────────────────────────┴─────────────────────────────────┘ │
├─ HISOBOTLAR STRIP ─────────────────────────────────────────────────────┤
│  ┌────────────────┬────────────────┬────────────────┐                  │
│  │  ИРР jurnali   │   Guruhlar     │  Audit jurnali │ low-weight cards │
│  │  Choraklik →   │   Ko'rish →    │  Ko'rish →     │                  │
│  └────────────────┴────────────────┴────────────────┘                  │
└────────────────────────────────────────────────────────────────────────┘
```

### What changes

| Element | Before | After |
|---|---|---|
| Attention zone | 3 separate large cards (grid-cols-3) | 1 consolidated card with 3 rows |
| Stats | 4 large cards (grid-cols-4) | 1 compact strip with 4 inline metrics |
| Bandlik display | Percentage % + mini bar + "N/M ta o'rin" below | "N/M" ratio primary, bar removed from strip |
| Rating panel | In LEFT column below activity feed | Moved to RIGHT column (primary position) |
| Tasks panel | In RIGHT column (derived from same sources as attention) | **Removed** — attention zone rows + action links serve this function |
| Quick info | In RIGHT column (address/phone/capacity/accreditation) | **Proposed removal** — see Decision A |
| Hisobotlar strip | 2 cards (IRR + Groups) | 3 cards (IRR + Groups + Audit jurnali) |

### Decision A — Quick info (Tezkor ma'lumot)

Current content:
- `user.school.address` — school physical address
- Enrolled / capacity ratio
- `user.school.accreditation`
- `user.school.phone`

Capacity is already in the stats strip. Address, accreditation, and phone are available in SchoolProfile (`/admin/school`).

**Options:**
- **A1: Remove entirely** — director can find address/phone in SchoolProfile. Saves right-column space for rating panel.
- **A2: Keep as compact 2-line footer** — show just address + phone in a small muted line below the rating panel, no separate card.
- **A3: Keep current card** — right column becomes 3 stacked items (rating + quick info + tasks... wait, tasks is being removed).

My recommendation: **A1** — remove entirely. Address and phone are setup data visible in SchoolProfile. The dashboard should show operational metrics, not setup info.

### Decision B — Attention rows when count = 0

When there are no pending documents / no open warnings / no pending receptions:
- **B1: Hide the row** — clean, attention zone shows only active items. If all zero: "Hammasi joyida! Bugun e'tiboringizni talab qiladigan ishlar yo'q" as empty state.
- **B2: Show muted "0 — hammasi ko'rib chiqilgan"** — director sees all three rows always. Counts clearly at zero.

My recommendation: **B1** — hide zero rows; show clean empty state if all clear. Shorter card when no action needed.

### Decision C — Stats strip: Bandlik format

The Bandlik (occupancy) stat:
- **C1: Show "N/M" ratio** (e.g., "12/15") — explicit: enrolled out of capacity.
- **C2: Show percentage "80%"** (current) — more scannable, less specific.
- **C3: Show both** — "12/15 · 80%" in small text.

My recommendation: **C1: "N/M"** — directors think in terms of enrolled vs. available slots, not percentages.

---

**User decisions:** A1 + B1 (with per-row hide refinement) + C1 + keep progress bar (subtle). Tasks panel confirmed auto-derived → removed entirely. Right-column decision: Option X (Rating only, 300px). Bottom strip: 3 cards (IRR + Groups + Audit jurnali).

---

## STEP 3 — Implementation

### Files changed

| File | Change |
|---|---|
| `admin/src/pages/Dashboard.jsx` | Complete JSX restructure; data layer unchanged |
| `admin/src/locales/uz/common.json` | +7 keys: attentionAllClear, highSeverity, ratingsCount, auditRefSub, lastUpdated, refresh |
| `admin/src/locales/en/common.json` | +7 keys (same) |
| `admin/src/locales/ru/common.json` | +7 keys (same) |

### Structural changes

**Removed imports:** `TrendingUp, Minus, MapPin, ShieldCheck, Phone` (used only in removed sections)  
**Added import:** `CheckCircle2` (for all-clear state)

**New derived variables:**
```js
const openDocsCount = pendingDocsArray.length;
const openWarningsCount = aiWarningsArray.filter(w => !w.resolvedAt).length;
const openReceptionsCount = pendingReceptions.length;
const allClear = openDocsCount === 0 && openWarningsCount === 0 && openReceptionsCount === 0;
const hasHighSeverity = aiWarningsArray.some(w => !w.resolvedAt && (w.severity === 'high' || w.severity === 'critical'));
```

**Removed derived variables:** `tasks`, `highestAi`, `occupancy` (percentage), `ratingAvg/ratingDist/ratingTotal/ratingPct` stay.

### Section-by-section changes

| Section | Before | After |
|---|---|---|
| Header | `space-y-0` wrapper, `letterhead pt-4 flex items-end justify-between flex-wrap gap-4 mb-9` | `space-y-8` wrapper, clean `flex items-start justify-between` |
| Section headings | `text-lg font-semibold text-warm-900` | `text-xs font-semibold uppercase tracking-wider text-warm-500` — muted label style |
| Attention zone | 3×`bg-surface border p-5` cards in `grid md:grid-cols-3` | 1×`bg-surface border divide-y` card with conditional rows |
| Row visibility | Always shown with count | Per-row: hidden when 0; all-clear state when all 0 |
| High-severity badge | Separate line below warning count | Inline badge within warning row |
| Stats | 4×`bg-surface border p-5` cards in `grid grid-cols-2 md:grid-cols-4` | 1×`bg-surface border` card with `grid grid-cols-2 sm:grid-cols-4 divide-x` |
| Stats — Bandlik | `{occupancy}%` + mini bar + "N / M ta o'rin" text | `{enrolled}/{capacity}` + `h-1 bg-warm-400` bar |
| Two-column grid | `lg:grid-cols-[1fr_360px]` | `lg:grid-cols-[1fr_300px]` |
| Left column | Activity feed + Rating panel stacked | Activity feed only |
| Right column | Tasks + Quick info stacked | Rating card only |
| Rating internal layout | `grid md:grid-cols-[200px_1fr]` (broke at 300px) | Stacked vertically: avg+stars then bars |
| Hisobotlar | 2 cards (IRR + Groups) in `grid md:grid-cols-2` | 3 link-cards (IRR + Groups + Audit jurnali) in `grid sm:grid-cols-3` |
| Hisobotlar visual weight | `bg-surface border p-4 shadow-xs` | `bg-surface border-warm-100 px-4 py-3` — lighter border, no shadow, hover-only accent |

### Token discipline check

| Element | Token used | Acceptable? |
|---|---|---|
| Action links (Ko'rib chiqish →, Audit jurnali →, Batafsil →) | `text-brand-700 hover:text-brand-800` | ✅ Functional |
| Warning severity badge | `bg-error-50 text-error-700` | ✅ Functional (severity indicator) |
| BellRing icon | `text-warning-600` | ✅ Functional (warning state) |
| UserPlus icon | `text-info-600` | ✅ Functional (info state) |
| All-clear icon | `text-success-600` | ✅ Functional (success state) |
| Star rating | `text-brand-600` fill | ✅ Functional (quality metric) |
| Bandlik bar fill | `bg-warm-400` | ✅ Neutral (not accent — intentionally low-contrast) |
| Section headings | `text-warm-500` | ✅ No accent |
| Hisobotlar hover accent | `group-hover:text-brand-600` | ✅ Functional (interactive affordance on hover only) |

No decorative accents added. CLEANUP-02 compliance maintained.

---

## STEP 4 — Responsive behavior

| Breakpoint | Layout |
|---|---|
| `< sm` (mobile) | Attention: full-width card. Stats: `grid-cols-2` (2×2). Two-col: single column (activity above rating). Hisobotlar: stacked (`sm:grid-cols-3` does not apply). |
| `sm–lg` (tablet) | Stats: `sm:grid-cols-4` (horizontal strip). Hisobotlar: `sm:grid-cols-3` (horizontal strip). Two-col: still single column (no `lg:` prefix applied). |
| `≥ lg` (desktop) | Full layout: `lg:grid-cols-[1fr_300px]` two-column. All sections horizontal. |

---

## STEP 5 — Test + build results

| Check | Result |
|---|---|
| Tests | ✅ 30/30 · 162/162 |
| Build | ✅ built in 8.06s |

No test changes needed — no tests directly assert Dashboard section content.

---

## STEP 6 — Commit

Commit: `e603958`  
Message: `feat(admin): dashboard restructure — consolidated attention zone, compact stats strip, two-column main`  
Pushed to `origin/main`. Railway auto-deploy triggered.

---

## STEP 7 — User Railway verification (REQUIRED before close)

1. Login as a director → land on dashboard (`/admin`)

**Attention zone:**
- Confirm single card (not 3 separate cards)
- If pending docs > 0: row visible with count, "Ko'rib chiqish →" link
- If 0 pending docs: docs row hidden entirely
- Switch language (UZ → RU → EN) → all row labels translate

**Stats strip:**
- Confirm 1 card with 4 inline metrics separated by vertical lines
- Bandlik shows "12/15" format (or actual enrolled/capacity), not percentage
- Mini progress bar visible below Bandlik number

**Two-column:**
- Left: activity feed (wider)
- Right: rating card only (300px, no tasks, no quick info)
- Rating shows star average + distribution bars stacked vertically

**Hisobotlar (bottom):**
- 3 compact link-cards: ИРР · Guruhlar · Audit jurnali
- All 3 navigate correctly on click
- Lower visual weight than main content

**Language switching (mandatory):**
- UZ mode: "Hammasi joyida!", "ta hujjat tasdiqlash kutmoqda", "ta ogohlantirish ochiq", "Bandlik"
- RU mode: "Всё в порядке!", labels translate
- EN mode: "All clear!", labels translate

**Responsive:**
- Tablet (~900px): stats stay horizontal 4-column, two-col collapses to single
- Mobile (~400px): stats become 2×2 grid, everything stacks

Screenshots needed: desktop in UZ + desktop in RU + one mobile view.

Reply "verified" with screenshots before this is marked ✅.

---

## STEP 8 — Honest count

| Item | Status |
|---|---|
| Current state documented | ✅ 8 sections audited |
| Layout proposal surfaced (STEP 2) | ✅ Full diagram + 3 decisions |
| User approved (A1+B1+C1) + right-column decision (X) | ✅ |
| Attention zone consolidated to single card | ✅ |
| Per-row hide when count=0 | ✅ |
| All-clear state when all three zero | ✅ |
| Stats strip compact (4 inline metrics, divide-x) | ✅ |
| Bandlik shows enrolled/capacity ratio | ✅ C1 |
| Mini progress bar: thin (h-1), warm-400, low-contrast | ✅ |
| Tasks panel removed (confirmed auto-derived) | ✅ |
| Quick info card removed (A1) | ✅ |
| Rating moved to right column, layout fixed for 300px | ✅ |
| Hisobotlar: 3 cards (added Audit jurnali) | ✅ |
| Hisobotlar visual weight lower than main content | ✅ |
| No decorative accents (CLEANUP-02 compliance) | ✅ |
| Responsive: mobile 2×2 stats, tablet horizontal | ✅ |
| All strings use t() with locale catalog entries | ✅ 6 new keys × 3 locales |
| Tests passing | ✅ 30/30 · 162/162 |
| Build clean | ✅ |
| User Railway verification | ⏳ pending |

---

## Incidental observations

1. **`dashboard.welcome` key hardcodes `Xush kelibsiz, ${firstName}` as defaultValue** — the locale file has `"welcome": "Xush kelibsiz, {{name}}"` which uses interpolation correctly. No change needed.

2. **`getGroupsCount` function remains** — still used in data layer for `statsData.groups`, even though the groups count is not displayed on the dashboard (not in the stats strip). Orphaned data but harmless; stats strip shows the 4 most director-relevant metrics.

3. **`ACTION_META` labels are hardcoded in UZ only** — the activity feed event labels (e.g., "Hujjat tasdiqlandi") are not localized. This is a pre-existing issue (out of scope for CLEANUP-07a).

4. **`RatingBar` `bg-brand-600`/`bg-brand-500` for top stars** — these differ by star value (5★ = brand-600, 4★ = brand-500, others = warm-300). Arguable as functional (data visualization) vs. decorative. Not changed; consistent with CLEANUP-02's "functional accents preserved" policy.

5. **Right-column height match** — with only the rating card in the right column and only the activity feed on the left, the two columns may have mismatched heights at different data states (many audit entries = tall left; few = short left). The `items-start` on the grid prevents ugly stretching — each card is naturally height.

Also confirm: any sections you want to keep/add that aren't in the proposal? For example:
- Should I keep the occupancy mini-bar (progress bar) within the stats strip, or drop it (it adds complexity to the compact strip)?
- Should the Hisobotlar strip be collapsible or always shown?
