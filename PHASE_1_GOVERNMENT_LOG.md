# Phase 1 Government Portal — Visual Design Log

**Date:** 2026-05-16
**Branch:** main
**Scope:** Government portal only (never touches admin/teacher/reception)

---

## Steps Executed

### STEP A — Shared Assets Directory + Logo Copy
- Created `shared/assets/` directory
- Copied `government/src/logo symbol green.png` → `shared/assets/ihma-logo.png`
- Logo inverted to white in Sidebar via CSS `filter: brightness(0) invert(1)`

### STEP B — shared/tailwind.base.js: Add olive success scale
**File changed:** `shared/tailwind.base.js`
- Added `successColors` export (olive scale: 50–900)
- Added `success` to `basePreset.theme.extend.colors`
- Kept `primaryColors` (violet) unchanged — success is the only addition

### STEP C — government/tailwind.config.js: Brand green + sidebar + paper
**File changed:** `government/tailwind.config.js`
- Added `brandColors` (forest green 50–900)
- Overrode `primary` → `brandColors` (so shared Button/Input components render green)
- Added `brand` alias (same values, for post-codemod source)
- Added `sidebar` (DEFAULT: #1C2620, hover/active/text/muted/line)
- Added `paper` (DEFAULT: #F7F5EF, card: #FDFCF8, deep: #EFEDE6)
- Added `inkGreen` (800: #233227, 900: #15201A)

### STEP D — Build Verification (after token changes)
- government: PASS (built in ~7.75s)
- admin: PASS (built in ~7.46s)
- reception: PASS (built in ~7.34s)
- teacher: PASS (built in ~8.74s)

### STEP E — Codemod government/src
**15 files changed:**
1. `components/Layout.jsx` — `primary-*` → `brand-*`
2. `components/Sidebar.jsx` — `primary-*` → `brand-*`
3. `components/tabs/AdminsTab.jsx`
4. `components/tabs/GovernmentTab.jsx`
5. `components/tabs/MessagesTab.jsx`
6. `components/tabs/RegistrationsTab.jsx`
7. `components/tabs/SchoolsTab.jsx`
8. `pages/AdminDetails.jsx`
9. `pages/Dashboard.jsx`
10. `pages/Login.jsx`
11. `pages/NotFound.jsx`
12. `pages/Profile.jsx`
13. `pages/Ratings.jsx`
14. `pages/Schools.jsx`
15. `pages/Settings.jsx`

**CSS change:** `src/index.css` — focus outline color `#7C3AED` → `#5B8C5A`

**Verification:** `grep primary-[0-9]` returns 0 matches in government/src

### STEP F — GovernmentBackground + Layout redesign
**`government/src/components/GovernmentBackground.jsx`** — replaced purple gradient SVG with paper-colored `<div className="fixed inset-0 bg-paper ...">`

**`government/src/components/Layout.jsx`** — updated:
- Desktop sidebar: removed `bg-white shadow-lg`
- Mobile header: `bg-white` → `bg-sidebar`, text white, updated focus ring
- Mobile sidebar drawer: removed `bg-white shadow-lg`

### STEP G — Sidebar redesign
**`government/src/components/Sidebar.jsx`** — complete rewrite:
- Deep slate-green background (`bg-sidebar`)
- IHMA logo (white-inverted PNG) + title lockup
- Active nav: left 3px border (`border-brand-500`) + `bg-sidebar-active`
- Inactive nav: `text-sidebar-muted` with hover to white
- User card: initials avatar, muted email, logout button

### STEP H — Login page redesign
**`government/src/pages/Login.jsx`** — complete rewrite:
- Paper background (`bg-paper`)
- 4px brand-green top rule
- IHMA logo (PNG, not icon) centered
- Border card (no shadow): `bg-paper-card border border-gray-200 rounded-lg`
- `rounded-md` inputs and button
- Audit microcopy below submit
- Footer with LanguageSwitcher

### STEP I — Dashboard redesign
**`government/src/pages/Dashboard.jsx`** — complete rewrite:
- All data-fetching logic preserved (loadData, cache, useEffect, useState)
- New page header with RefreshCw ghost button + last-updated timestamp
- 4 stat cards: tabular numerics, border (not shadow), `rounded-lg`
- Admin table: two-state StatusBadge (pending=gray, approved=success-olive)
- Schools list: compact ranked list, click → `/government/schools/:id`
- Right rail: activity feed (static placeholder with TODO(phase-2))
- `lastUpdated` state added for "Oxirgi yangilanish" display

### STEP J — Schools list page redesign
**`government/src/pages/Schools.jsx`** — complete rewrite:
- Client-side search (name/address) + type filter (with TODO(phase-2) to move to API)
- Table layout with 6 columns (rank, name+address, type, students, rating, chevron)
- Clickable rows → `/government/schools/:id`
- Footer showing filtered/total count

### STEP K — SchoolDetail page (new)
**`government/src/pages/SchoolDetail.jsx`** — created:
- Breadcrumb: Muassasalar → school.name
- Page header with isActive badge (success-olive or gray)
- Left 2/3: Key facts grid (type/region/city/phone/email/director) + Metrics panel (occupancy%, teacher count, doc approval%)
- Right rail: stats (students/teachers/ratings) + Rating widget (numeric + stars)
- All metric fields have TODO(phase-2) notes where API data is missing

### STEP L — App.jsx: Add schools/:id route
**`government/src/App.jsx`** — added:
- `const SchoolDetail = lazy(() => import('./pages/SchoolDetail'));`
- `<Route path="schools/:id" element={<ErrorBoundary><SchoolDetail /></ErrorBoundary>} />`

### STEP M — Final Build + Tests
- government build: PASS (SchoolDetail-C-krP9OJ.js included, built in ~7.12s)
- government tests: 47 passed / 5 failed — Platform.test.jsx failures are pre-existing (ToastProvider context issue, identical before/after this PR)
- admin tests: 79/79 passed
- reception: running
- teacher: running

---

## Files Changed Summary

| File | Type |
|------|------|
| `shared/tailwind.base.js` | Modified (success colors added) |
| `shared/assets/ihma-logo.png` | Created (logo asset) |
| `government/tailwind.config.js` | Modified (brand/paper/sidebar/inkGreen tokens) |
| `government/src/index.css` | Modified (focus color: violet → green) |
| `government/src/App.jsx` | Modified (SchoolDetail lazy import + route) |
| `government/src/components/GovernmentBackground.jsx` | Modified (SVG → paper div) |
| `government/src/components/Layout.jsx` | Modified (sidebar/header redesign) |
| `government/src/components/Sidebar.jsx` | Modified (complete dark sidebar rewrite) |
| `government/src/pages/Login.jsx` | Modified (paper card design) |
| `government/src/pages/Dashboard.jsx` | Modified (new visual layer, same data logic) |
| `government/src/pages/Schools.jsx` | Modified (table + filters) |
| `government/src/pages/SchoolDetail.jsx` | Created (new page) |
| `government/src/components/tabs/AdminsTab.jsx` | Modified (brand-* codemod) |
| `government/src/components/tabs/GovernmentTab.jsx` | Modified (brand-* codemod) |
| `government/src/components/tabs/MessagesTab.jsx` | Modified (brand-* codemod) |
| `government/src/components/tabs/RegistrationsTab.jsx` | Modified (brand-* codemod) |
| `government/src/components/tabs/SchoolsTab.jsx` | Modified (brand-* codemod) |
| `government/src/pages/AdminDetails.jsx` | Modified (brand-* codemod) |
| `government/src/pages/NotFound.jsx` | Modified (brand-* codemod) |
| `government/src/pages/Profile.jsx` | Modified (brand-* codemod) |
| `government/src/pages/Ratings.jsx` | Modified (brand-* codemod) |
| `government/src/pages/Settings.jsx` | Modified (brand-* codemod) |

---

## TODOs Deferred to Phase 2

- **Activity feed API:** Dashboard right rail is static placeholder; needs `GET /api/v1/government/me/activity`
- **School detail API:** SchoolDetail uses `useFetch('/government/schools/:id')` — backend must return `{ school, stats: { studentsCount, teachersCount, docsApproved, docsTotal, capacity }, ratings: [] }`
- **School capacity:** Occupancy % widget hidden until `capacity` field added to API
- **Doc approval metrics:** `docsApproved`/`docsTotal` hidden until API supports them
- **Teacher load ratio:** Students-per-teacher not shown until API supports it
- **Server-side filters (Schools):** Search/type filters are client-side; move to query params when backend adds support
- **Admin intermediate states:** StatusBadge is two-state (pending/approved); backend may add "under review" later
- **Audit log page:** "Barcha faoliyatlar →" link in activity feed points nowhere yet
- **CORS allowlist (C-07 partial):** Pre-launch: replace regex CORS check with explicit env-driven allowlist

---

## Design Principles Applied

- Off-white paper background (`#F7F5EF`) everywhere, never pure white
- 1px borders on cards, no shadows (except modals/overlays)
- `rounded-md` for buttons/inputs, `rounded-lg` for cards
- Tabular numerics (`tabular-nums`) on all stat values
- No gradients on action UI, no `rounded-2xl`
- Sidebar: `#1C2620` deep slate-green, white text, `#8B978E` muted inactive, active = left `border-brand-500` + `bg-sidebar-active` tint
- Focus ring: `#5B8C5A` (brand green) instead of violet
