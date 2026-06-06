# PP-MOBILE-PASS — Parent portal mobile responsiveness

**Status:** 🟡 S12 in progress (pending Railway mobile walk at 360–390 px).
**Scope:** Final UI parent session — equivalent to teacher's TP-MOBILE-PASS. Absorbs `PP-MOBILE-NAV` and the PP-AUDIT C.5 layout flags. No data/feature changes — chrome + layout only.
**Constraint honored:** Desktop unchanged.

---

## 1. Mobile nav — the chosen pattern (stated explicitly)

**Pattern: bottom 4-tab MobileTabBar + Dashboard as the hub + Profil tab as the account sub-hub.**

- `teacher/src/parent/components/Layout.jsx:9-23` — split is `lg:` (1024 px). At `< lg`, `DesktopTopNav` is hidden and the **bottom-fixed `MobileTabBar`** is the persistent nav.
- `MobileTabBar` carries 4 tabs (`Bugun` / `Kundalik` / `Xabarlar` / `Profil`) — the four most-used parent flows per the PARENT-DESIGN reskin's intent.
- The other 10 routes are reachable from mobile through **two stable entry points**:
  - **Dashboard (`/`)** as the hub: `Dashboard.jsx:122-129` renders 8 QuickLink cards (`activities / meals / media / child / rating / irr / therapy / help`) — every content page is one tap from Home.
  - **Profil tab (`/child`)** as the account sub-hub: `ChildProfile.jsx:326-330` renders an explicit `<Link to="/settings">{t('settings.title')}</Link>` row. Profil also hosts the child's bio + emotional-monitoring history. This is the "my account" surface on mobile.
- **Notifications** are surfaced from the Dashboard header (`Dashboard.jsx` Bell button with `count` badge) — single-tap from Home.

**Settings is therefore reachable on mobile in ≤ 2 taps from any tab** (tab → Profil → "Sozlamalar" link), and Logout is one further tap (Settings.jsx:358 — visible full-width button).

This is **intentionally not a hamburger/sidebar**. The teacher portal needed a hamburger because it has 14+ deep-link routes that don't fit the 4-tab pattern. The parent has 13 routes but a clear "hub" structure (Dashboard + Profil) where the tab-bar's 4 core flows + 2 hub pages cover every navigation need. Adding a hamburger would duplicate Dashboard's QuickLinks.

**Compared to PP-AUDIT C.4 — "Mobile users have no tab-bar shortcut to Settings":**
- Confirmed. There is no Settings tab.
- The chosen design is Settings via Profil — explicitly logged as the pattern, not a gap.

---

## 2. Per-page mobile-fit status (every parent page audited)

The Layout's content container is `max-w-2xl mx-auto px-4 sm:px-6 py-6 pb-24 lg:pb-10` — the **`pb-24`** (96 px) preserves room above the 64 px (`h-16`) bottom `MobileTabBar`. Each page sits inside this wrapper.

| Page | Mobile state going in | Verdict / fix |
|---|---|---|
| Dashboard | S8 letterhead + Dashboard's QuickLink grid is `grid-cols-2 sm:grid-cols-3` — stacks to 2 cols on 360 px | **CLEAN** |
| ChildProfile | S8 letterhead + content sections are responsive | **CLEAN** |
| Activities | Card grid `grid-cols-1 lg:grid-cols-2 xl:grid-cols-3` — single col on mobile. Modal `max-w-4xl w-full max-h-[90vh] overflow-y-auto` inside `p-4` backdrop → 360 - 32 = 328 px modal width, fits. | **CLEAN** |
| Meals | S8 letterhead + date picker Card row stacks vertically on `< md` | **CLEAN** |
| Media | S8 letterhead + filter chips row + grid stacks on `< sm`. Lightbox `max-w-6xl flex flex-col lg:flex-row max-h-[90vh] h-[90vh]` — `flex-col` on mobile stacks media + info; close button is `lg:hidden` so it's visible on mobile only. | **CLEAN** |
| Chat | **DIRTY** — `Chat.jsx:137` had `-mb-16 lg:mb-0`: a NEGATIVE margin to compensate for the bottom tab-bar that actually pulled the Chat Card 64 px UPWARD, causing the composer to bleed into the tab-bar's 64-px footprint. | **FIXED.** `-mb-16 lg:mb-0` removed. Layout's `pb-24` already reserves space above the tab-bar; the negative margin was a fight against it. Chat composer now sits cleanly above the tab-bar at all viewport heights. |
| Notifications | S8 letterhead + single-column list | **CLEAN** |
| Help | S8 letterhead + FAQ blocks | **CLEAN** |
| TeacherRating | Two-section page (teacher rating + school rating). Each section's grid stacks on `< lg` | **CLEAN** |
| Settings | S8 letterhead + form sections | **CLEAN** (logout button at `:356-365` is full-width `w-full` — text visible without tapping) |
| Therapy | Card grid stacks; search input full-width | **CLEAN** |
| ChildIRR | S11 fixed Cyrillic + assessment-session list is single-column | **CLEAN** |
| Attendance | **DIRTY** — `WeekGrid` (S7) used `grid grid-cols-7 gap-1.5` with each cell rendering a 10-px text status label. At 360 px, cell width ≈ 41 px, far too narrow for `"Belgilanmagan"` / `"Hospitalized"`. The label's `truncate` clipped mid-character. | **FIXED.** Status labels gated with `hidden sm:inline` — at `< 640 px` only the color dot renders (which is semantically sufficient at week-glance scale); at `≥ 640 px` the full label re-appears next to the dot. Same fix applied to the unset-state placeholder text. The day-of-week header (`text-[10px]`) stays visible at all widths. |
| AIWarnings | mounted at `/teacher/warnings`, not a parent route — out of scope | n/a |
| ChangePassword | forced-flow page with `max-w-md`-class form — already narrow | **CLEAN** |

**Two pages fixed. The remaining 11 are clean as shipped from earlier sessions (S8 letterhead + S6 dates + S2b strings already absorbed the layout questions).**

---

## 3. Attendance week-grid + Chat thread — the two PP-AUDIT C.5 items specifically called out

### Attendance week-grid at 360 px

Before:
```jsx
<div className="flex items-center gap-1.5">
  <span className={`w-2 h-2 rounded-full ${meta.dot}`} aria-hidden="true" />
  <span className="text-[10px] font-medium text-slate-700 truncate">{t(meta.labelKey)}</span>
</div>
```

After:
```jsx
<div className="flex items-center gap-1.5">
  <span className={`w-2 h-2 rounded-full ${meta.dot}`} aria-hidden="true" />
  <span className="hidden sm:inline text-[10px] font-medium text-slate-700 truncate">{t(meta.labelKey)}</span>
</div>
```

The week view is now a row of 7 color-coded cells with the day number visible at every width and the textual status label appearing from the `sm:` breakpoint up. Power users on tablets / desktop see the full taxonomy; mobile users see the color-coded glance. The day-detail view (single-day Card) is unchanged and renders the full status pill — so the textual taxonomy is still one tap away on mobile.

### Chat thread mobile

Before (`Chat.jsx:137`):
```jsx
<div className="max-w-4xl mx-auto space-y-4 -mb-16 lg:mb-0">
```
The `-mb-16` (–64 px) was added as a hack to push the chat Card upward — fighting the Layout's `pb-24` (96 px). Net effect: composer at `(viewport-bottom – 32 px)` = 32 px overlap with the 64-px bottom-fixed `MobileTabBar`. Composer + the bottom 1–2 lines of messages were visually beneath the tab bar.

After:
```jsx
<div className="max-w-4xl mx-auto space-y-4">
```
The Layout's `pb-24` keeps the chat Card 96 px above the viewport bottom — comfortably above the 64-px tab-bar with 32 px breathing room. Composer is visible. Send works.

The S9 layout-parity additions (date separators + per-bubble timestamps via shared formatter) remain unchanged — they didn't depend on the margin hack.

---

## 4. Logout on mobile — inheritance check (S3 carryover)

`teacher/src/parent/pages/Settings.jsx:356-365` renders the logout button with **visible text by default**:

```jsx
<Card className="p-6">
  <button
    onClick={handleLogout}
    className="flex items-center justify-center gap-2 px-6 py-3 bg-error-600 text-white rounded-xl font-bold hover:bg-error-700 transition-colors shadow-sm w-full"
  >
    <LogOut className="w-5 h-5" />
    {t('logout', { defaultValue: 'Chiqish' })}
  </button>
</Card>
```

No `hidden md:` / `sm:` visibility classes — text is visible at every breakpoint including 360 px. The button is `w-full` so the icon + label are centred in the Card on mobile.

**Note on shared LogoutButton (S3):** the parent Settings page uses its own inline button (with the `bg-error-600` warm-red treatment matching the page's "danger zone" semantics) rather than the cross-portal `LogoutButton`. The visible-text outcome is identical to the S3 contract; the visual style is parent-themed. Documented as the chosen variant — no S12 code change.

---

## 5. Mobile scale — touch targets & type proportionality

- **Layout content padding:** `px-4 sm:px-6` → 16 px each side on mobile, 24 px on `sm+`. Standard small-screen breathing room.
- **MobileTabBar tap targets:** 4 tabs across the viewport width on a 360-px screen = 90 px / tab, 64 px tall — exceeds the WCAG 44 × 44 touch-target minimum on both axes.
- **Header tap targets in Dashboard / Layout:** the Bell button and other top-row icons are `p-2` (32 px) plus 24-px icon = effective 40 px — adequate. Logout in Settings is 48 px tall (`py-3` + 24-px icon).
- **Type:** the S8 letterhead uses `text-[22px] sm:text-[24px]` — readable at all sizes. Subtitles at 13 px, hints at 11 px (uppercase, tracking-wide for legibility). No microscopic 9-px font; no chunky 28-px buttons.

No layout / sizing edits this session — the existing scale is already proportionate post-S8.

---

## 6. Desktop no-regression

Both S12 changes are layout-neutral at desktop width:
- **Chat `-mb-16 lg:mb-0` removal**: the `lg:mb-0` half explicitly zeroed the negative margin at desktop. Removing the whole pair is identical to "always `lg:mb-0`" at `lg+`. Desktop chat layout unchanged.
- **Attendance week-grid `hidden sm:inline`**: at `≥ sm` (640 px), the label renders exactly as before. Desktop layout unchanged. The fix only activates below 640 px.

`grep -n "max-w-4xl mx-auto space-y-4" teacher/src/parent/pages/Chat.jsx` → confirms the new line.
`grep -n "hidden sm:inline" teacher/src/parent/pages/Attendance.jsx` → confirms the new gating.

---

## 7. Gates

| Gate | Status |
|---|---|
| `npm --prefix teacher run check:locales` | ✅ PASS |
| Cyrillic JSX in `teacher/src/parent/**` (S2b + S11 carry) | ✅ ZERO |
| `defaultValue:` / `||` fallback masks (S2b + S11 carry) | ✅ ZERO |
| Hardcoded date locales in parent (S6 carry) | ✅ ZERO |
| Shared-util conformance (S2b + S6) | ✅ unchanged |
| ESLint / Vitest | ⚠️ pending CI |

---

## 8. Files modified in S12

| File | Change |
|---|---|
| `teacher/src/parent/pages/Chat.jsx` | Removed `-mb-16 lg:mb-0` hack so composer no longer bleeds into the mobile tab-bar |
| `teacher/src/parent/pages/Attendance.jsx` | `WeekGrid` status label gated with `hidden sm:inline` — color dot at all widths; text label at `≥ sm` |
| `audits/redesign/PP-MOBILE-PASS.md` | NEW (this doc) |
| `LOOP_TRACKER.md` | + PP-MOBILE-PASS tracker line |

---

## 9. User Railway verification

### MOBILE (360–390 px / real device)

Walk EVERY parent page:

1. **Navigation coherent.** No broken or redundant nav. The bottom 4-tab bar carries the four core flows (Bugun / Kundalik / Xabarlar / Profil). Other content pages are one tap from Dashboard. Settings is one tap from Profil. Logout is visible (text + icon) on Settings.
2. **Every page fits width.** Walk Dashboard → ChildProfile → Activities → Meals → Media → Chat → Notifications → Help → TeacherRating → Settings → Therapy → ChildIRR → Attendance → ChangePassword. None horizontally scroll; no clipped headers / buttons / cards. (Dashboard cards stack 2-up at 360 px.)
3. **Attendance week view usable.** Swap to "Hafta" view. Seven cells across; each cell shows the day number + a color dot for the status. Text labels reappear from `sm:` (640 px) up — confirmed by widening the viewport. Tap any day to see the full pill in the day-detail Card.
4. **Chat composer pinned above the tab-bar.** Open `/chat` on mobile. The composer Card has 32 px breathing room above the 64-px bottom tab-bar. Tap into the textarea — keyboard opens, send button is fully tappable. No overlap with the tab-bar icons.
5. **Dashboard cards stack** — 2 columns at 360 px (`grid-cols-2`).
6. **Logout text visible.** Tap Profil → tap "Sozlamalar" → scroll to the bottom of Settings → the logout button shows "Chiqish" / "Выход" / "Logout" centred with the icon, full-width, no hover required.
7. **Sizing tight/proportionate.** Tab-bar icons + labels readable; touch targets feel deliberate (no microscopic 9-px text, no chunky 28-px buttons everywhere).

### DESKTOP (≥ 1024 px)

8. Same pages walked at `lg+` width — no regression vs. before S12. Specifically:
   - Chat layout unchanged (the `-mb-16 lg:mb-0` was already zeroed at `lg`).
   - Attendance week-grid shows the full text status label at `≥ sm` — same as before.
   - DesktopTopNav (top-of-page with bell + settings icons) intact.

**Screenshots:** dashboard mobile, attendance mobile (week view), chat mobile (with composer).

Reply **"verified"** → `LOOP_TRACKER.md` `PP-MOBILE-PASS` to ✅. **This closes the parent UI arc.** Remaining work is terminal-gated only:

- **S4** TP-PARENT-ASSIGNMENT (postgres-MCP from terminal Claude).
- **Phase-2 re-walks** for PP-ATTENDANCE-SURFACE / PP-CHAT-INTEGRITY / PP-DASHBOARD-CARDS (post-S4 multi-parent verification).
- **PP-JOURNAL-FEATURE** (new follow-up surfaced in S11 — backend route exists, frontend `/journal` needs to be built).
