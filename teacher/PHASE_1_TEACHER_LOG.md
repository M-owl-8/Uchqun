# Phase 1 Teacher Portal Visual Redesign Log

**Date:** 2026-05-17
**Branch:** main
**Scope:** `teacher/` only

## Summary

Complete visual redesign of the Teacher portal to the lavender design system specified in `teacher/Teacher Design System.html`.

## Steps Completed

### Step 1 — Design Reference Read
- Read full `Teacher Design System.html` reference
- Captured all token values, component specs, and page layouts

### Step 2 — `teacher/tailwind.config.js` Updated
- Replaced legacy teacher/parent role colors with full design system
- Added: `paper`, `surface`, `brand.*` (10-stop lavender), `bark.*` (warm charcoal sidebar), `mint.*`, `child.*` (12 ribbon colors)
- Added: `warning.*`, `error.*` (softer Bordeaux #9A5045), `info.*`
- Added: custom boxShadow (xs/sm/md/lg/ring), borderRadius (sm/md/lg/xl/2xl), fontSize tokens
- Did NOT redefine `success.*` (inherited from shared preset)

### Step 3 — `teacher/src/index.css` Updated
- Added Inter font-feature-settings (cv11, ss01, tnum)
- Background paper (#FAFAF8), color slate-900 (#1E2026)
- Mobile 16px base font size
- `.tnum` utility class
- Skeleton shimmer animation (`.skel`)
- Page fade animation (`.page-fade`)
- Lavender focus ring

### Step 4 — Token Codemod
- Replaced legacy tokens across all `teacher/src/**/*.{jsx,tsx}`:
  - `primary-` → `brand-`
  - `bg-gray-` → `bg-slate-`, `text-gray-` → `text-slate-`, `border-gray-` → `border-slate-`
  - `bg-white` → `bg-surface`
  - `bg-sidebar-navy` → `bg-bark`
  - `bg-green-` → `bg-success-`, `text-green-` → `text-success-`
  - `bg-red-` → `bg-error-`, `text-red-` → `text-error-`
  - `bg-yellow-` → `bg-warning-`, `text-yellow-` → `text-warning-`

### Step 5 — Ribbon Infrastructure
- Created `teacher/src/hooks/useChildRibbon.js` — deterministic hash from child.id
- Created `teacher/src/components/ChildRibbon.jsx` — 3px/6px vertical bar
- Created `teacher/src/components/ChildAvatar.jsx` — ribbon-colored initials circle/square

### Step 6 — Sidebar.jsx Rewritten
- 240px, bark background (#2A2530)
- Section groups: Bugun / Bolalar / IEP / Aloqa
- Active state: 3px brand-600 left border + rgba(122,111,168,.18) background
- User card: initials avatar bg-brand-600, name, "O'qituvchi" role, logout, language pill
- Unread chat badge in error-500 color
- Language switcher (UZ/RU/EN) integrated into user card

### Step 7 — Layout.jsx Rewritten
- bg-paper page background
- Fixed 240px sidebar (md: breakpoint)
- Top bar: 56px, bg-surface, 1px border-b border-slate-200
- Mobile: MobileTabBar instead of BottomNav
- Removed MessageCircle floating button and BottomNav

### Step 8 — MobileTabBar.jsx Created
- 5 tabs: Home (Bugun), Users (Bolalar), Plus-FAB (Yangi yozuv), MessageSquare (Xabarlar), User (Profil)
- Center FAB: -mt-7, w-14 h-14 rounded-full bg-brand-600, ring-4 ring-surface
- Active tab: brand-700 icon + small label
- FAB opens QuickObservation modal

### Step 9 — Login.jsx Rewritten
- Lavender radial gradient backdrop (no motif)
- 440px card, rounded-lg shadow-md
- "U" bark mark + "Uchqun" + "O'qituvchi portali"
- H1 "Xush kelibsiz", subtitle "Bugungi kun bilan tanishishni boshlang."
- Mail icon email field, Lock icon + Eye toggle password field
- Fix A: Plain IHMA text (no Cloudflare obfuscation)
- Fix B: Password input empty at rest (no value="••••••••••")
- Fix C: ToS consent line omitted entirely
- Fix D: No "Page N of 6" labels
- Language pill (UZ/RU/EN) below card
- All existing auth logic preserved

### Step 10 — Dashboard.jsx Rewritten
- Desktop: H1 with brand left-bar accent (inline borderLeft style)
- "Sinf bir qarashda" horizontal avatar strip with state dots
- 3-col stat cards (Davomat, Kuzatuvlar, Xabarlar)
- "Bugungi diqqat" section with ChildRibbon-accented cards
- "So'nggi kuzatuvlar" list with ribbon-colored rows
- Mobile: genuine redesign with 6×2 avatar grid, compact stats
- Data fetching via Promise.allSettled with graceful fallbacks
- TODO(phase-2) comments where endpoints may not exist yet

### Step 11 — AttendanceGrid + Attendance Page
- `AttendanceGrid.jsx`: 2-column grid, 5 states (unset/present/absent/late/sick)
- Tap cycles through states; visual state variants with border colors + icon badges
- `Attendance.jsx`: Date header, "Hammasi keldi" bulk action, filter chips, sticky save bar
- Save bar: progress fill proportional to markedCount/total
- POST /attendance on save

### Step 12 — ChildDetail Page
- Hero card: rounded-2xl, 6px ribbon, ChildAvatar size="2xl" shape="square"
- Fix A: Plain `mailto:` links for parent contact (no Cloudflare obfuscation)
- 5-tab navigation (IEP / Kuzatuvlar / Hujjatlar / Xabarlar / Galereya)
- IEP tab: goal cards with 12-square heatmap, mastered/struggling variants
- Medical note in warning color
- Route added: `/teacher/children/:id`

### Step 13 — DailyReflection Page + ParentJournalComposer
- `ParentJournalComposer.jsx`: left rail (180px child multi-select), composer area
- Auto-save to localStorage every 5s (`teacher:journal:draft:YYYY-MM-DD`)
- Moment chips: Birinchi marta (mint), Yaxshi natija (brand), Yordam kerak (warning)
- Photo gallery (up to 3)
- `DailyReflection.jsx`: split grid, private reflection (Lock badge), journal composer
- Routes added: `/teacher/reflection`, `/teacher/journal`

### Step 14 — QuickObservation Component
- Mobile: bottom sheet; Desktop: centered modal
- Child selector: horizontal scrollable strip with ribbon-bordered avatars
- Goal dropdown from API with smart-default
- 4-state outcome chips (Yangi/Yordam bilan/Mustaqil/Mahorat)
- Note textarea + photo attachment
- Wired into MobileTabBar FAB

### Step 15 — Locale Keys Updated
- Added to `teacher/public/locales/uz/common.json`:
  - `attendance.*` (state labels, filter labels, save bar)
  - `observation.*` (outcome labels, photo button, note placeholder)
  - `journal.*` (composer strings, moment chips, draft/send buttons)
  - `childDetail.*` (tab labels, section headings, IEP terms)
  - `reflection.*` (private label, lock badge, callout titles)
  - `tabbar.*` (tab labels)

## Design Decisions

- **No CommandPalette**: Teacher does not have this (Reception's signature)
- **No folder-tab CSS**: Teacher uses inline borderLeft for h1-tab accent
- **No motif/pattern**: Teacher's warmth comes from ribbons and content
- **Error color**: Softer Bordeaux #9A5045, not bright red
- **strokeWidth={1.75}** on all Lucide icons
- **Child ribbons**: Only on child-representing surfaces

## The Four Fixes Applied

- **Fix A**: No Cloudflare email artifacts anywhere — plain `href="mailto:"` and plain `href="tel:"`
- **Fix B**: Password field empty at rest — no `value="••••••••••"`
- **Fix C**: ToS consent line removed from Login entirely
- **Fix D**: "Page N of 6" labels not shipped (design system internal labels only)

## Files Created/Modified

### Modified
- `teacher/tailwind.config.js`
- `teacher/src/index.css`
- `teacher/src/App.jsx`
- `teacher/src/components/Sidebar.jsx`
- `teacher/src/components/Layout.jsx`
- `teacher/src/pages/Login.jsx`
- `teacher/src/pages/Dashboard.jsx`
- `teacher/public/locales/uz/common.json`
- All `teacher/src/**/*.{jsx,tsx}` (codemod)

### Created
- `teacher/src/hooks/useChildRibbon.js`
- `teacher/src/components/ChildRibbon.jsx`
- `teacher/src/components/ChildAvatar.jsx`
- `teacher/src/components/MobileTabBar.jsx`
- `teacher/src/components/AttendanceGrid.jsx`
- `teacher/src/components/QuickObservation.jsx`
- `teacher/src/components/ParentJournalComposer.jsx`
- `teacher/src/pages/Attendance.jsx`
- `teacher/src/pages/ChildDetail.jsx`
- `teacher/src/pages/DailyReflection.jsx`
- `teacher/PHASE_1_TEACHER_LOG.md`
