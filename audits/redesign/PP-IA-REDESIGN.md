# PP-IA-REDESIGN — parent portal navigation + page restructure

## Summary
Restructured the parent web app's information architecture so every feature is reachable in ≤ 2 taps and the daily-use pages get tab-bar real-estate proportional to their value to parents.

**Mobile bottom tab bar (final, 5 tabs):**
```
🏠 Bugun  ·  📖 Kundalik  ·  🖼 Galereya  ·  💬 Xabar  ·  👤 Bola
   /         /journal         /media          /chat        /child
```

**Notifications** moved out of the tab bar — a bell icon now lives in the top-right of every page (sticky `MobileTopBar` on mobile, `DesktopTopNav` on desktop).

## What changed in code

| File | Change |
|---|---|
| `parent/components/MobileTopBar.jsx` | **New.** Sticky mobile header — brand mark left, compact ChildSwitcher centre, notification bell right (with count badge). |
| `parent/components/MobileTabBar.jsx` | Rewritten — 5 tabs above, fully i18n-keyed (was 4 with hardcoded Uzbek). No badge — notifications moved to top bar. |
| `parent/components/DesktopTopNav.jsx` | Rewritten — 5 primary tabs matching mobile + Reyting + Sozlamalar on the right. Same brand pattern as MobileTopBar. |
| `parent/components/Layout.jsx` | Mounts `MobileTopBar` on `<lg`, `DesktopTopNav` on `≥lg`. |
| `parent/pages/Dashboard.jsx` | Rewritten as a daily heartbeat: snapshot eyebrow → 4-tile today row (Davomat / Taomlar / Suratlar / Faoliyatlar) → latest journal entry preview → 5-row quick links. Deep-links `/media?range=today`. |
| `parent/pages/ChildProfile.jsx` | Account section split into 3 grouped sections via new `HubSection` + `HubRow` helpers: **Reja va rivojlanish** (IRR / Individual reja / Terapiya / Davomat / Taomlar) · **Maktab bilan** (Reyting / Hukumatga murojaat / Mening murojaatlarim) · **Hisob** (Sozlamalar / Chiqish). |
| `parent/pages/Meals.jsx` | Accepts `?date=YYYY-MM-DD` (or `?date=today`); date-select syncs query string; jump-to-today button shown when off-today. |
| `parent/pages/Media.jsx` | Adds **Today / All-time** range chip orthogonal to the existing Photo/Video chip; `?range=today` is honoured + persisted. |
| `parent/components/Sidebar.jsx` | **Deleted.** Legacy, unused since Layout migrated to MobileTabBar + DesktopTopNav. |
| `parent/components/BottomNav.jsx` | **Deleted.** Legacy 4-tab variant, unused. |
| `parent/locales/{uz,en,ru}/common.json` | Added 38 keys across `brand`, `nav`, `common`, `dashboard`, `child.section`, `child.row`, `meals`, `media`. All 3 locales in sync (334 keys each, verified by `npm run check:locales`). |
| `__tests__/pages/parentDesignSystem.test.jsx` | Updated MobileTabBar tests for the new 5-tab IA (route assertions + badge removal). |
| `__tests__/pages/ChildProfile.test.jsx` | Switched 3 button-finder assertions to the new `child.row.*` keys; tightened logout/modal placeholder assertions. |
| `__tests__/pages/SidebarPolling.test.jsx` | Dropped the 2 parent-Sidebar checks (component no longer exists). |
| `__tests__/pages/parentSidebar.test.jsx` | **Deleted.** Whole file targeted the removed parent Sidebar. |

## IA decisions

| # | Decision | Rationale |
|---|---|---|
| 1 | **Split chat from notifications.** Bell sits top-right; Xabar tab is chat only. | User-driven. Avoids fragmented attention badges; notifications stay glanceable from anywhere via the header. |
| 2 | **Kundalik (journal) wins the 2nd tab slot.** | Narrative content; the only "story" feature. Davomat is structured/colored-dot data, fine living inside Bola. |
| 3 | **No `/help` row anywhere in Bola.** | User-driven. Help can be rebuilt later if needed. |
| 4 | **Today filter on Meals + Media is URL-state, not local-state.** | Lets the Bugun tiles deep-link cleanly: `/media?range=today`. Meals also defaults to today by default — explicit `?date=today` is honoured. |

## Route → tab map (every existing route accounted for)

| Existing route | Reachable via |
|---|---|
| `/`             | Tab 1 (Bugun) |
| `/journal`      | Tab 2 (Kundalik) |
| `/media`        | Tab 3 (Galereya) — also from Bugun tile |
| `/chat`         | Tab 4 (Xabar) |
| `/child`        | Tab 5 (Bola) |
| `/notifications`| Bell icon (top right) — also Bola is not used for this |
| `/irr`          | Bola → Plan & progress |
| `/activities`   | Bola → Plan & progress — also from Bugun tile |
| `/therapy`      | Bola → Plan & progress |
| `/attendance`   | Bola → Plan & progress — also from Bugun tile |
| `/meals`        | Bola → Plan & progress — also from Bugun tile |
| `/rating`       | Bola → Maktab bilan — also desktop top nav |
| `/settings`     | Bola → Hisob — also desktop top nav |
| `/change-password` | Auth gate (unchanged) |

`/help` is no longer linked from anywhere (per decision #3). Route still resolves if deep-linked.

## Verification

- ✅ `npm run build` → 1925 modules, dist emitted in 4.20s
- ✅ `npm run check:locales` → all 859 keys present in all 3 locales
- ✅ `npx vitest run` (ChildProfile + parentDesignSystem + SidebarPolling + MessageModal) → 50/50 pass
- ✅ ESLint clean on every touched file

## Phase-1 walk (please verify)

1. **Mobile (resize to ≤ lg / use phone preview):**
   - Top bar shows `U · Uchqun · Ota-ona` (left), child switcher chip (centre), bell with badge (right).
   - Bottom tab bar shows 5 icons: Home / NotebookPen / Image / MessageCircle / User with labels Bugun / Kundalik / Galereya / Xabar / Bola.
   - Tap each tab — active tab turns brand-600, all others sepia-400. Order matches mobile/desktop.
2. **Bugun page (`/`):**
   - Snapshot eyebrow + today's date.
   - 4 tiles row — Davomat tile colored by status (green/amber/red), Taomlar `eaten/total`, Suratlar `N`, Faoliyatlar `N`.
   - Latest journal entry preview card → tap → `/journal`. Shows "no entry yet" when blank.
   - 5-row quick links (no Help).
3. **Bola page (`/child`):**
   - Hero + child info + emotional monitoring + weekly stats (unchanged).
   - **3 new grouped sections:** Reja va rivojlanish (5 rows) · Maktab bilan (3 rows) · Hisob (2 rows). Each row has icon + label + chevron, rows divided by hairline.
   - Logout row uses error-50 icon background + error-600 label.
   - Tap Hukumatga murojaat / Mening murojaatlarim → modals still open.
4. **Galereya (`/media`):**
   - Two chip groups visible: time-range (All time / Today) on left, type (All / Photo / Video) on right.
   - From Bugun, tap Suratlar tile → URL becomes `/media?range=today`, Today chip is pre-selected.
5. **Taomlar (`/meals`):**
   - Date select defaults to today.
   - When viewing a past day, a `→ Bugunga` jump button appears next to the date select.

## Phase-2 (later, unblocked by other gates)

- Multi-parent IDOR verification on `/parent/attendance`, `/parent/children/:id/journal`, dashboard endpoints (still PP-AUDIT phase-2 territory, awaits S4).
- Russian/English copy review for the 38 new keys (auto-translated; PL-009-VERIFY).
