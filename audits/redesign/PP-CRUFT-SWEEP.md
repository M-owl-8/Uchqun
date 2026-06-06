# PP-CRUFT-SWEEP — post-IA archaeology pass

**Status:** ✅ CLOSED
**Commit:** `075c9d9`
**Date:** 2026-06-06
**Trigger:** User asked "explore, inspect, define if any design or feature overlaps, duplicates and anything built on top of dead or old thing on parent role as we changed the logic many times."

## What this session is

A code-archaeology pass over `teacher/src/parent/` after 13+ refactor sessions (PP-AUDIT → PP-IA-REDESIGN). Specifically NOT a feature change — only debris removal. The PP-IA-REDESIGN session shipped clean, but each prior loop layered new components on top of old ones without always removing the predecessors. This session removes the resulting orphans.

## Findings & disposition

### Dead components (deleted)

| File | Why dead | Evidence |
|---|---|---|
| `parent/components/DayCard.jsx` | Only `parentDesignSystem.test.jsx` imported it; previous Dashboard rewrite removed the production caller | Grep for `DayCard` → 0 production hits |
| `parent/components/DayStack.jsx` | Same — only the design-system test | Grep for `DayStack` → 0 production hits |
| `parent/components/TopBar.jsx` | Legacy mobile chrome from a pre-MobileTopBar redesign; never imported anywhere | Grep for `from.*parent/components/TopBar` → 0 hits |
| `parent/components/SensitiveNotice.jsx` | Only the design-system test imported it; no production caller after PP-IA-REDESIGN | Grep → 0 production hits |
| `parent/components/CallTeacherButton.jsx` | Same — orphan since the original parent portal redesign | Grep → 0 production hits |

All five components also had test sections in `parentDesignSystem.test.jsx`. The file dropped from 263 → 124 lines (DayCard, DayStack, SensitiveNotice, CallTeacherButton blocks excised). MobileTabBar and ChildSwitcher blocks remain.

### Dead locale keys (removed × 3 locales)

15 keys × 3 files (uz / en / ru) = 45 entries:

```
dashboard.role           dashboard.welcome        dashboard.overview
dashboard.viewAll        dashboard.journal        dashboard.activities
dashboard.mealsTracked   dashboard.photos         dashboard.notifications
dashboard.individualPlan dashboard.meals          dashboard.media
sidebar.title            sidebar.menu             (sidebar object dropped)
```

Verified by running through every parent file with `grep -rn "t('${key}'" — 0 references. `npm run check:locales` after removal: **✅ PASS** (859 used keys, all 3 locales in sync).

### Token leak fixed

`Dashboard.jsx:42` was the sole `slate-*` instance in the new Dashboard. Used as the ATTENDANCE_TONE fallback for the `absent` status. Migrated:

```diff
- absent: 'text-slate-700   bg-slate-50    border-slate-200',
+ absent: 'text-p-sepia-700 bg-p-sepia-50  border-p-sepia-200',
```

Brings the absent-status tile in line with the rest of the parent palette.

### Missing CSS utility added

`MobileTopBar.jsx:30` referenced `.no-scrollbar` to hide the centre ChildSwitcher's horizontal overflow scrollbar. The class was **never defined anywhere in CSS** — it was silently a no-op. Added to `teacher/src/index.css` utilities layer:

```css
.no-scrollbar { scrollbar-width: none; }
.no-scrollbar::-webkit-scrollbar { display: none; }
```

### Stale TODO removed

`Meals.jsx:70` carried a `TODO(phase-1)` from S6 about the meal-type color palette (blue for Lunch/Dinner). The decision was made (blue is intentional for meal-type, not brand-*). Comment removed.

## What was found but NOT fixed (surfaced as open questions)

The audit also turned up four larger items that need user sign-off before action. They're in Q&A form so they can be ticked off later:

| Q | Item | Recommendation | Status post-session |
|---|---|---|---|
| Q1 | `slate-*` / `success-50` / `font-bold` carryover in `Media.jsx`, `Therapy.jsx`, `ChangePassword.jsx` | Migrate to `p-sepia-*` / `p-brand-*` palette | Deferred — PP-TOKEN-SWEEP post-beta |
| Q2 | `/help` route exists, page exists, locale exists — no UI link points to it (user said "no /help right now" in PP-IA-REDESIGN) | Keep as hidden until product decides | Decided: keep hidden, no action |
| Q3 | Dashboard listens for socket events `attendance:updated` and `journal:created` — neither is emitted by the backend | Either emit them or remove listeners | Deferred — beta works fine without them; the Dashboard polls on tab focus |
| Q4 | `Activities.jsx`, `Meals.jsx`, `Media.jsx` cache via `shared/utils/cache.js` but lack socket invalidation | Add socket listeners or document staleness as acceptable | Deferred — beta acceptable; cache TTL is short |
| Q5 | 6 `check:locales` UZ==RU "suspect" warnings — 5 are intentional (brand/legal/contact), 1 (`help.email: "Email"`) should be RU-translated to `"Эл. почта"` | Fix the one real warning | Deferred — bundled with PL-009-VERIFY native review |

All four are non-beta-blocking. Recorded in `audits/BETA-LAUNCH-PLAN.md` "Out of scope for beta" table.

## Verification

- ✅ Build: 1925 modules transformed, dist emitted in 4.31s
- ✅ `npm run check:locales`: 859 keys, all 3 locales in sync
- ✅ Tests: 21/21 on parentDesignSystem + ChildProfile + SidebarPolling + Help
- ✅ ESLint: clean on all touched files

## Files changed (12)

```
A  audits/redesign/PP-CRUFT-SWEEP.md          (this doc)
M  teacher/src/__tests__/pages/parentDesignSystem.test.jsx  (263 → 124 lines)
M  teacher/src/index.css                       (+6 lines, no-scrollbar)
D  teacher/src/parent/components/CallTeacherButton.jsx
D  teacher/src/parent/components/DayCard.jsx
D  teacher/src/parent/components/DayStack.jsx
D  teacher/src/parent/components/SensitiveNotice.jsx
D  teacher/src/parent/components/TopBar.jsx
M  teacher/src/parent/locales/en/common.json   (−16 lines)
M  teacher/src/parent/locales/ru/common.json   (−16 lines)
M  teacher/src/parent/locales/uz/common.json   (−16 lines)
M  teacher/src/parent/pages/Dashboard.jsx      (slate → p-sepia)
M  teacher/src/parent/pages/Meals.jsx          (TODO removed)
```

Net: **−483 lines / +8 lines.**

## Lessons captured

1. **Each redesign loop should ship with a same-session cruft sweep.** Otherwise dead code accumulates and the next archaeology pass costs a session of its own.
2. **Test files are the easiest place to spot orphans.** A `describe()` for `XComponent` whose source has no production import is a 100%-confidence signal.
3. **`check:locales` catches dead keys when extended.** The script ran clean before this session even with 15 dead keys — because the script only verifies missing keys, not unused ones. Worth adding an `--unused` mode in a future session.
