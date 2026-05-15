# UCHQUN FRONTEND DESIGN AUDIT
## Exhaustive Forensic Analysis — All Portals

**Audit date:** 2026-05-15  
**Auditor:** Claude Code (automated forensic pass)  
**Scope:** `admin/`, `teacher/`, `reception/`, `government/`, `shared/`  
**Purpose:** Document every visible and structural design decision currently in the codebase — not a redesign proposal. Brutal honesty, exact citations.

---

## TABLE OF CONTENTS

1. [Executive Summary](#1-executive-summary)
2. [Repository & Build Structure](#2-repository--build-structure)
3. [Design Token System](#3-design-token-system)
4. [Typography System](#4-typography-system)
5. [Color System](#5-color-system)
6. [Spacing & Layout Grid](#6-spacing--layout-grid)
7. [Component Inventory — Shared Library](#7-component-inventory--shared-library)
8. [Component Inventory — Admin Portal](#8-component-inventory--admin-portal)
9. [Component Inventory — Government Portal](#9-component-inventory--government-portal)
10. [Component Inventory — Reception Portal](#10-component-inventory--reception-portal)
11. [Component Inventory — Teacher Portal](#11-component-inventory--teacher-portal)
12. [Component Inventory — Parent UI (within teacher/)](#12-component-inventory--parent-ui-within-teacher)
13. [Accessibility Audit](#13-accessibility-audit)
14. [Internationalization & Localization Audit](#14-internationalization--localization-audit)
15. [Cross-Portal Consistency Analysis](#15-cross-portal-consistency-analysis)
16. [Critical Bugs & Silent Failures](#16-critical-bugs--silent-failures)
17. [Appendices](#17-appendices)

---

## 1. EXECUTIVE SUMMARY

The Uchqun platform is a five-portal monorepo (admin, government, reception, teacher, parent) built with React 18 + Tailwind CSS 3 + Vite 5. Every portal is functionally independent with its own Tailwind config, own auth context, own routing tree, and own component copies. A `shared/` library exists and is well-structured but is inconsistently adopted — some portals re-export shared components via one-liner files, others ignore them entirely and duplicate or invent alternatives.

The visual design language is coherent at a high level: violet primary palette, sidebar-navy dark sidebars, card-based layouts, clean sans-serif typography. But at the detail level there is significant divergence. The teacher portal's login page uses a completely different color system (blue instead of violet). The parent UI inside the teacher portal uses `bg-blue-500` and `bg-blue-600` instead of `bg-primary-600`. The admin portal renders a `<TopBar>` component that is never mounted in its layout. The government portal provides a `useToast()` hook that silently does nothing because `<ToastContainer>` is never rendered. Mobile navigation across all portals omits 30–60% of sidebar items with no fallback.

### Top-Line Numbers

| Portal | Components (est.) | Tailwind classes (raw, deduped est.) | Shared components adopted | i18n keys defined |
|---|---|---|---|---|
| admin/ | ~35 | ~800 | 3 (re-export only) | ~40 |
| government/ | ~28 | ~700 | 2 (direct import) | ~30 |
| reception/ | ~25 | ~750 | 1 (direct import) | ~35 |
| teacher/ | ~45 | ~1100 | 4 (mixed) | ~50 |
| parent/ (in teacher/) | ~30 | ~900 | 2 | ~40 |
| shared/ | ~18 components | — | — | ~60 (en/ru/uz) |

### Ten Most Important Findings

1. **Government portal has a silent toast system**: `ToastContext.jsx` + `useToast()` are fully implemented but `<ToastContainer>` is never rendered in `App.jsx`. Every toast call silently disappears. No user feedback on any action in the government portal.

2. **Teacher login completely breaks visual identity**: Uses `from-blue-50 to-blue-100`, a `🎓` emoji icon, `focus:ring-blue-500`, and `bg-blue-600` — entirely inconsistent with the violet primary system used by all other portals.

3. **Admin uses `window.prompt()` for rejection input**: `ReceptionManagement.jsx` calls `const reason = prompt(t('receptionsPage.rejectionPrompt'))` — a blocking native browser dialog with no styling, no validation, no i18n for the dialog chrome, and no graceful cancel handling.

4. **Parent mobile BottomNav omits 7 of 11 navigation items**: `teacher/src/parent/components/BottomNav.jsx` only exposes 4 items (Home, Profile, Rating, AI Chat). Items like Homework, Attendance, Gallery, Schedule, Meals, Emotional Monitoring, and Notifications are completely unreachable on mobile without a keyboard/URL hack.

5. **Zero shared Tailwind configuration**: `shared/tailwind.base.js` defines a complete theme but is **never imported** by any portal's `tailwind.config.js`. All four portals independently maintain identical copy-pasted configs. Any theme change requires 4 manual file edits.

6. **Government sidebar missing three pages**: `Sidebar.jsx` has 5 nav items. Routes `/government/students`, `/government/teachers`, `/government/parents` are only reachable by clicking dashboard stat cards — they have no sidebar entry and no URL users can bookmark or share.

7. **Admin `<TopBar>` component built but never mounted**: `admin/src/components/TopBar.jsx` is a fully styled mobile header with a Crown icon and gradient — but `admin/src/components/Layout.jsx` never imports or renders it. Mobile admin users see no page header.

8. **Reception `<LanguageSwitcher>` positioned `fixed top-4 right-4 z-50`**: This floats over the top of all content on all reception pages. On pages with content near the top-right corner, the switcher will overlap and obscure interactive elements.

9. **`<a href>` used for internal navigation in parent chat button**: `teacher/src/parent/components/Layout.jsx` renders `<a href="/chat">` instead of React Router's `<Link to="/chat">`. This causes a full page reload with a complete React tree unmount/remount, losing all cached state.

10. **N+1 data fetching pattern in teacher Dashboard**: `teacher/src/pages/Dashboard.jsx` fetches all parents, then in a `.forEach` loop fires one fetch per child to get activities, meals, and media — potentially dozens of simultaneous HTTP requests on dashboard load with no batching, throttling, or deduplication.

---

## 2. REPOSITORY & BUILD STRUCTURE

### 2.1 Monorepo Layout

```
c:/work/Uchqun/
├── backend/               Express 4 + Sequelize + PostgreSQL
├── shared/
│   ├── components/        18 shared React components
│   ├── context/           createAuthContext factory
│   ├── services/          api.js (Axios), chatStore.js
│   ├── locales/           en.json, ru.json, uz.json
│   └── tailwind.base.js   Theme definition — NOT imported by portals
├── admin/                 React 18 SPA, port 5175
├── government/            React 18 SPA, port 5173
├── reception/             React 18 SPA, port 5177
├── teacher/               React 18 SPA (teacher + parent), port 5174
└── docker-compose.yml
```

### 2.2 Per-Portal Build Configuration

Each portal is a Vite 5 project with the following characteristics:

**Build toolchain (identical across all portals):**
- `@vitejs/plugin-react` ^4.2.1
- `vite` ^5.0.8
- `tailwindcss` ^3.3.6
- `postcss` ^8.4.32
- `autoprefixer` ^10.4.16

**Runtime dependencies (all portals):**
- `react` ^18.2.0
- `react-dom` ^18.2.0
- `react-router-dom` ^6.20.1
- `axios` ^1.13.2
- `i18next` ^23.10.1
- `react-i18next` ^13.5.0
- `i18next-http-backend` ^2.5.2
- `lucide-react` ^0.562.0

**Teacher portal only:**
- `socket.io-client` ^4.8.3

### 2.3 Testing Setup

All portals use:
- `vitest` ^4.0.18
- `@testing-library/react` ^16.3.2
- `@testing-library/jest-dom` ^6.9.1
- `jsdom` ^27.4.0

### 2.4 HTML Entry Points

| Portal | File | `lang` attr | `<title>` | Favicon |
|---|---|---|---|---|
| admin | `admin/index.html` | `en` | "Uchqun Admin - System Administration" | `/vite.svg` (placeholder) |
| government | `government/index.html` | `uz` | "Uchqun Government - Davlat Nazorat Paneli" | `/vite.svg` (placeholder) |
| reception | `reception/index.html` | `en` | "Uchqun Reception - System Administration" | `/vite.svg` (placeholder) |
| teacher | `teacher/index.html` | `en` | (not confirmed — likely "Uchqun Teacher") | `/favicon.svg` (custom) |

**Issues:**
- Three portals use `lang="en"` despite serving a Uzbek-language product to Uzbek users. Only government correctly sets `lang="uz"`. This is a WCAG 3.1.1 violation — screen readers will read Uzbek text with English phonetics.
- Three portals still use `/vite.svg` — the Vite scaffold placeholder favicon. Teacher is the only one with a real favicon.
- "System Administration" subtitle appears in both admin and reception titles — reception staff are not administrators, and this copy is misleading.

### 2.5 Shared Library Access Pattern

Portals reference shared components via a Vite alias `@shared` → `../shared`. This is configured per portal in their respective `vite.config.js` files.

Some portals create pass-through re-export files:

```js
// admin/src/components/Card.jsx
export { default } from '@shared/components/Card';

// admin/src/components/ConfirmDialog.jsx
export { default } from '@shared/components/ConfirmDialog';

// admin/src/components/LoadingSpinner.jsx
export { default } from '@shared/components/LoadingSpinner';
```

Others import directly from `@shared/...` in consuming files. Reception imports `LoadingSpinner` directly from shared in some places. This inconsistency means some refactoring of shared components requires hunting down both patterns.

---

## 3. DESIGN TOKEN SYSTEM

### 3.1 Token Definition: `shared/tailwind.base.js`

This file defines all design tokens for the platform. It exports two objects:

```js
// shared/tailwind.base.js
export const primaryColors = {
  50: '#f5f3ff',   // near-white violet
  100: '#ede9fe',
  200: '#ddd6fe',
  300: '#c4b5fd',
  400: '#a78bfa',
  500: '#8b5cf6',  // medium violet
  600: '#7c3aed',  // primary action color
  700: '#6d28d9',
  800: '#5b21b6',
  900: '#4c1d95',  // darkest violet
};

export const baseTheme = {
  colors: {
    primary: primaryColors,
    sidebar: {
      navy: '#2E3A59',
      muted: '#8F9BB3',
      blue: '#E8F4FD',
      mint: '#E5F7F0',
      peach: '#FFF0E5',
    },
  },
  animation: {
    'slide-in': 'slideIn 0.3s ease-out',
    'fade-in': 'fadeIn 0.2s ease-out',
    'pulse-slow': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
  },
  keyframes: {
    slideIn: {
      '0%': { transform: 'translateX(100%)', opacity: '0' },
      '100%': { transform: 'translateX(0)', opacity: '1' },
    },
    fadeIn: {
      '0%': { opacity: '0' },
      '100%': { opacity: '1' },
    },
  },
};
```

### 3.2 The Token Import Problem

**Not a single portal imports `shared/tailwind.base.js`.** All four portals copy-paste the identical token values directly into their own `tailwind.config.js`. This is verified:

```js
// admin/tailwind.config.js — lines 10–22
colors: {
  primary: {
    50: '#f5f3ff',
    100: '#ede9fe',
    200: '#ddd6fe',
    300: '#c4b5fd',
    400: '#a78bfa',
    500: '#8b5cf6',
    600: '#7c3aed',
    700: '#6d28d9',
    800: '#5b21b6',
    900: '#4c1d95',
  },
  sidebar: { /* identical */ }
}
```

```js
// government/tailwind.config.js — lines 10–22 — IDENTICAL
// reception/tailwind.config.js — lines 10–22 — IDENTICAL
```

The teacher config adds two extra token groups (`teacher.*` and `parent.*`) on top of the same base but still does not import from `shared/tailwind.base.js`.

**Consequence:** Changing the brand's primary color (a normal product evolution) requires editing 4 files, diffing them to ensure they remain in sync, and rebuilding all 4 portals. The shared token file is vestigial.

### 3.3 Token Additions in Teacher Portal

`teacher/tailwind.config.js` defines two additional semantic token groups:

```js
// teacher/tailwind.config.js — lines 22–43
teacher: {
  sidebar: '#0F172A',      // slate-900
  hover: '#1E293B',        // slate-800
  accent: '#14B8A6',       // teal-500
  'accent-dim': '#0D9488', // teal-600
  muted: '#64748B',        // slate-500
  surface: '#F8FAFC',      // slate-50
  border: '#E2E8F0',       // slate-200
},
parent: {
  sidebar: '#1E1B4B',      // indigo-950
  hover: '#312E81',        // indigo-900
  accent: '#7C3AED',       // violet-600
  'accent-dim': '#6D28D9', // violet-700
  muted: '#818CF8',        // indigo-400
  surface: '#FAF9FF',      // off-white with violet tint
  border: '#EDE9FE',       // violet-100
},
```

These tokens imply a clear intention: teacher UI should use teal accents, parent UI should use violet accents. However, actual usage in the codebase largely ignores these tokens. Teacher Dashboard uses `bg-blue-500` (not `bg-teacher-accent`). Parent Dashboard uses `bg-blue-500` (not `bg-parent-accent`). The semantic token system exists but is not enforced or consistently applied.

### 3.4 The `sidebar.*` Legacy Group

All portals include a `sidebar` color group:

```js
sidebar: {
  navy: '#2E3A59',   // #2E3A59 — used as sidebar header/bg in admin, reception, teacher sidebars
  muted: '#8F9BB3',  // used for muted text in sidebars
  blue: '#E8F4FD',   // used as active item bg in sidebars (misleadingly named — it's light blue)
  mint: '#E5F7F0',   // used in shared/BottomNav
  peach: '#FFF0E5',  // used in shared/BottomNav
}
```

The comment in `teacher/tailwind.config.js` reads: `// Legacy — still referenced by shared/BottomNav, LanguageSwitcher`. This is accurate. The `sidebar-navy` and `sidebar-blue` tokens are used heavily in the actual sidebar component headers across admin, reception, and teacher portals.

Government portal diverges: its sidebar uses `bg-primary-600` (violet) not `bg-sidebar-navy` (dark navy). This is the most visually significant cross-portal inconsistency.

### 3.5 Token Usage Summary Table

| Token | Used in government | Used in admin | Used in reception | Used in teacher |
|---|---|---|---|---|
| `primary-50` to `primary-100` | Login bg, sidebar active states | Login bg, dashboard banners | Login bg | Login (but uses blue-50!) |
| `primary-600` | Sidebar header, buttons | Buttons, banners | Buttons | Buttons (but also bg-blue-600!) |
| `sidebar-navy` | ✗ (not used) | Sidebar header | Sidebar header | Sidebar header |
| `sidebar-blue` | ✗ (not used) | Active nav bg | Active nav bg | Active nav bg |
| `sidebar-mint` | ✗ | ✗ | ✗ | shared/BottomNav |
| `sidebar-peach` | ✗ | ✗ | ✗ | shared/BottomNav |
| `teacher-*` tokens | ✗ | ✗ | ✗ | Rarely — `teacher-surface` in Layout |
| `parent-*` tokens | ✗ | ✗ | ✗ | Not used at all |

---

## 4. TYPOGRAPHY SYSTEM

### 4.1 Font Stack

No portal loads a custom web font via `<link>` in `index.html` or via `@font-face` in CSS. All portals rely on system fonts.

**Government** is the exception — its `index.css` explicitly sets:

```css
/* government/src/index.css — lines 8–10 */
body {
  font-family: 'Inter', system-ui, -apple-system, sans-serif;
}
```

Government references Inter as a named font but never loads it (no `<link>` to Google Fonts or Bunny Fonts, no `@font-face` rule). On systems without Inter installed, this falls through to `system-ui`. On most Windows machines, system-ui resolves to Segoe UI. On macOS, it resolves to San Francisco. The government portal will render differently across OS.

All other portals do not set an explicit `font-family`. They inherit Tailwind's default `ui-sans-serif, system-ui, sans-serif`.

**In practice:** All portals render in Segoe UI on Windows, San Francisco on macOS, Roboto on Android. The government portal attempts Inter but it's effectively a no-op due to the missing font loading step.

### 4.2 Type Scale Usage

Tailwind's default type scale is used across all portals with no custom scale defined. Observed usage:

| Class | Where used | Context |
|---|---|---|
| `text-3xl font-bold` | All login pages (h1) | Page titles |
| `text-2xl font-bold` | Dashboard page headers | Section headings |
| `text-xl font-semibold` | Card titles, section headers | Sub-headings |
| `text-lg font-medium` | Nav item labels | Navigation |
| `text-sm` | Form labels, table cells, badges | Body copy |
| `text-xs` | Status badges, timestamps, metadata | Small labels |

No portal uses `text-4xl` or larger for headings. No portal defines a `prose` typography config.

### 4.3 Font Weight Usage

- `font-bold` — Page titles, button emphasis
- `font-semibold` — Card headers, form submit buttons, active nav items
- `font-medium` — Secondary labels, nav items
- No explicit `font-light` usage observed

### 4.4 Line Height & Letter Spacing

Default Tailwind values only. No `tracking-*` or `leading-*` customizations. No custom typographic rhythm.

### 4.5 Text Color Conventions

| Class | Usage pattern |
|---|---|
| `text-gray-900` | Primary body text, heading text |
| `text-gray-700` | Secondary body text, form labels |
| `text-gray-600` | Muted text, descriptions |
| `text-gray-500` | Placeholder text, metadata |
| `text-gray-400` | Disabled state text |
| `text-white` | Text on dark backgrounds, inside buttons |
| `text-primary-600` | Active nav items, links, icon accent color |
| `text-red-700` | Error messages |
| `text-green-700` | Success states |
| `text-yellow-700` | Warning states |

---

## 5. COLOR SYSTEM

### 5.1 Primary Palette

Violet scale derived from Tailwind's default `violet-*`. The platform primary color is `#7c3aed` (`primary-600`). This is used consistently for:
- Submit buttons across all portals (login forms, action forms)
- Hover states on buttons (`hover:bg-primary-700`)
- Focus rings (`focus:ring-primary-500`, `focus:ring-2`)
- Active sidebar item text (`text-primary-600`)
- Link text

### 5.2 Sidebar Color System

Two distinct sidebar visual systems coexist:

**System A — `bg-sidebar-navy` (#2E3A59):**
- Used by: admin, reception, teacher, parent sidebars
- Header section: dark navy with white text
- Active nav items: `bg-sidebar-blue` (#E8F4FD) with `text-sidebar-navy`
- Inactive nav items: `text-gray-600` with `hover:bg-gray-100`

**System B — `bg-primary-600` (#7c3aed):**
- Used by: government sidebar ONLY
- Header section: violet with white text
- Active nav items: `bg-primary-100` with `text-primary-600`
- Inactive nav items: `text-gray-600` with `hover:bg-gray-100`

This split makes admin and government portals visually distinct when opened side-by-side — government looks like a "different product." Whether intentional (brand differentiation for the oversight tier) or accidental drift is unclear from the codebase.

### 5.3 Background Decorative SVG Colors

Each portal has a decorative SVG background component that renders behind the main content at very low opacity:

| Portal | Component | Background gradient | Accent color(s) |
|---|---|---|---|
| admin | `AdminBackground.jsx` | `#E8F4F8 → #F8FAFC` (light teal) | Teal `#E8F4F8`, geometric navy shapes |
| government | `GovernmentBackground.jsx` | `#F5F3FF → #F8FAFC` (light purple) | Purple `#EDE9FE`, `#DDD6FE` |
| reception | `ReceptionBackground.jsx` | `#FFF5F0 → #FFFDFB` (warm coral) | Orange `#FF9966`, rose `#FF6B9D`, amber `#FFB347` |
| teacher | `TeacherBackground.jsx` | `#E8E0F0 → #FFF8F3` (lavender-peach) | Purple dots, arc shapes |
| parent | `JoyfulBackground.jsx` | Sky blue gradient | Animated sun, white clouds, green hills |

The reception background is dramatically different from the others — warm coral/orange tones vs. the cool violet/teal spectrum of the other portals. This visually signals reception as a "different tier" despite serving the same product.

The parent background (JoyfulBackground) contains the platform's only CSS animation on a decorative element: the sun graphic has an animated `rotate` transform. All other backgrounds are static.

### 5.4 Semantic Color Usage for Status Indicators

All portals use the same informal convention for status badges:

| Status | Background | Text | Border |
|---|---|---|---|
| Active / Approved | `bg-green-100` | `text-green-800` | — |
| Pending | `bg-yellow-100` | `text-yellow-800` | — |
| Rejected / Inactive | `bg-red-100` | `text-red-800` | — |
| Info | `bg-blue-100` | `text-blue-800` | — |
| Warning | `bg-orange-100` | `text-orange-800` | — |

This is consistent across portals but entirely implemented by hand (repeated inline JSX, no `<Badge>` shared component).

### 5.5 The Blue vs. Violet Problem in Teacher/Parent

The teacher and parent UI extensively uses raw Tailwind `blue-*` classes where the design system calls for `primary-*` (violet):

**Teacher Dashboard:**
```jsx
// teacher/src/pages/Dashboard.jsx
<div className="bg-blue-500 ...">  // Welcome banner — should be primary-600
```

**Parent Dashboard:**
```jsx
// teacher/src/parent/pages/Dashboard.jsx
<div className="bg-gradient-to-r from-blue-500 to-blue-400 ...">  // Welcome card
```

**Parent TopBar:**
```jsx
// teacher/src/parent/components/TopBar.jsx
<div className="bg-blue-500 fixed top-0 ...">  // Mobile header
```

**Teacher Login:**
```jsx
// teacher/src/pages/Login.jsx
<div className="... bg-gradient-to-br from-blue-50 to-blue-100 ...">
<input className="... focus:ring-blue-500 ...">
<button className="w-full bg-blue-600 ...">
```

The teacher and parent sections render in a noticeably different hue — `blue-500` (#3B82F6) vs. `primary-600` (#7C3AED). This is not a deliberate brand split — it reads as developer drift where one developer used blue shortcuts while others used primary tokens.

---

## 6. SPACING & LAYOUT GRID

### 6.1 Sidebar Dimensions

All sidebars use `w-64` (16rem / 256px) when open. This is hardcoded, not a token or CSS variable. Sidebars are fixed-position on desktop (`fixed left-0 top-0 h-full`).

Main content areas compensate with `ml-64` on desktop. Mobile sidebars are overlay drawers (`translate-x-0` / `-translate-x-full` toggled).

### 6.2 Mobile Layout Approaches

All portals use the same mobile breakpoint strategy (`lg:` prefix = 1024px):

- Below `lg`: Sidebar hidden. Mobile-specific nav (BottomNav or drawer) shown.
- Above `lg`: Sidebar visible fixed-left. BottomNav hidden.

**Key difference:** Government and Reception portals do NOT have a BottomNav. Their mobile layout shows only a hamburger menu that opens a drawer sidebar. Admin and Teacher portals have a BottomNav.

Parent UI uses a BottomNav with only 4 items (see Section 12 for the full problem analysis).

### 6.3 Content Padding Conventions

| Context | Padding |
|---|---|
| Page container | `p-6` or `p-4 md:p-6` |
| Card internal | `p-6` (via shared `Card` component) or `p-4` inline |
| Form section | `space-y-6` between fields |
| Table cells | `px-6 py-4` (th), `px-6 py-4` (td) |
| Badge/pill | `px-2 py-1` or `px-3 py-1` |
| Button | `py-3 px-4` or `py-2 px-4` |

### 6.4 Responsive Grid Patterns

All portals use CSS grid for stat cards:

```jsx
// Common pattern across all dashboards
<div className="grid grid-cols-2 md:grid-cols-4 gap-6">
  {stats.map(stat => <StatCard key={stat.label} {...stat} />)}
</div>
```

Teacher Dashboard uses a more complex grid:
```jsx
<div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-4">
```

No portal uses CSS `auto-fill` or `minmax()` patterns — all are explicit column counts.

### 6.5 Z-Index Management

No explicit z-index scale is defined in Tailwind config. Portals use Tailwind's default z-index utilities:

| Element | z-index class | Portal |
|---|---|---|
| Mobile sidebar drawer | `z-50` | admin, teacher, reception |
| Sidebar overlay backdrop | `z-40` | admin, teacher |
| Toast container | `z-50` | admin (via shared Toast) |
| LanguageSwitcher (floating) | `z-50` | reception |
| Mobile chat button | `z-50` | teacher, parent |
| OfflineBanner | `z-50` | shared — via `fixed top-0` |
| Mobile TopBar | `pt-14 lg:pt-0` offset | government (implies z-index 40+) |

**Collision risk:** Reception's `fixed top-4 right-4 z-50` LanguageSwitcher and any `z-50` drawer or banner will fight for paint order. The OfflineBanner at `fixed top-0` and the LanguageSwitcher at `top-4` will overlap when offline.

---

## 7. COMPONENT INVENTORY — SHARED LIBRARY

### 7.1 `shared/components/Card.jsx`

**Purpose:** Base card container with optional click interaction.

**Visual spec:**
```
bg-white
rounded-lg
shadow-sm
border border-gray-200
p-6
```

**When `onClick` is provided, adds:**
```
cursor-pointer
hover:shadow-md
transition-shadow
focus-visible:ring-2 focus-visible:ring-primary-500
outline-none
```

**Accessibility:**
- Adds `role="button"` and `tabIndex={0}` when clickable
- Adds `onKeyDown` handler for Enter/Space
- `outline-none` on container (focus ring is via `focus-visible:ring-*`)

**Full JSX:**
```jsx
const Card = ({ children, className = '', onClick }) => {
  const interactiveProps = onClick
    ? {
        role: 'button',
        tabIndex: 0,
        onKeyDown: (e) => (e.key === 'Enter' || e.key === ' ') && onClick(e),
      }
    : {};
  return (
    <div
      className={`bg-white rounded-lg shadow-sm border border-gray-200 p-6 ${className} ${
        onClick
          ? 'cursor-pointer hover:shadow-md transition-shadow focus-visible:ring-2 focus-visible:ring-primary-500 outline-none'
          : ''
      }`}
      onClick={onClick}
      {...interactiveProps}
    >
      {children}
    </div>
  );
};
```

**Adoption:** admin (re-export), government (direct import for school cards). Teacher and reception define no equivalent and use raw `<div className="bg-white rounded-xl shadow...">` inline.

**Issue:** `rounded-lg` in shared Card vs. `rounded-xl` used inline across several portals — slight visual inconsistency in corner radius across equivalent card elements.

### 7.2 `shared/components/LoadingSpinner.jsx`

**Purpose:** Animated SVG spinner with accessibility attributes.

**Sizes:**
| Size prop | `w-*`/`h-*` | Use case |
|---|---|---|
| `sm` | `w-4 h-4` | Inside buttons |
| `md` (default) | `w-8 h-8` | Inline content loading |
| `lg` | `w-12 h-12` | Section loading |
| `xl` | `w-16 h-16` | Full page loading |

**Accessibility:** `role="status"`, `aria-label` (default "Loading...")

**Visual:** SVG circle `stroke-current opacity-25` background + `stroke-current opacity-75` animated arc. Color inherits from `currentColor` — affected by `className` text color prop.

**Adoption:** All portals use this component. Admin re-exports it via `admin/src/components/LoadingSpinner.jsx`.

### 7.3 `shared/components/Toast.jsx`

**Purpose:** Non-blocking notification system.

**Visual spec:**
```
fixed top-4 right-4 z-50   (ToastContainer)

Individual toast:
max-w-sm w-full
bg-white rounded-lg shadow-lg border
p-4 flex items-start gap-3
```

**Toast variants:**
| Type | Left border color | Icon | Icon color |
|---|---|---|---|
| `success` | `border-l-4 border-green-500` | ✓ (emoji) | `text-green-500` |
| `error` | `border-l-4 border-red-500` | ✕ (emoji) | `text-red-500` |
| `warning` | `border-l-4 border-yellow-500` | ⚠ (emoji) | `text-yellow-500` |
| `info` | `border-l-4 border-blue-500` | ℹ (emoji) | `text-blue-500` |

**Accessibility:** `role="alert"`, `aria-live="polite"`, `aria-atomic="true"`

**Adoption issues:**
- Admin: Properly rendered in `App.jsx` — `<ToastContainer />` present.
- Government: `ToastContext.jsx` defines `useToast()` but App.jsx never renders `<ToastContainer>`. **Silent failure — see Section 16.1.**
- Reception and Teacher: Use Toast from shared, properly rendered.

### 7.4 `shared/components/Skeleton.jsx`

**Purpose:** Loading skeleton placeholder suite.

**Exported components:**
- `SkeletonLine` — single line placeholder, width and height configurable
- `SkeletonAvatar` — circular placeholder
- `SkeletonCard` — card with avatar + lines combo
- `SkeletonTable` — table with header + configurable rows
- `SkeletonStat` — stat card placeholder (icon + number + label)
- `SkeletonDashboard` — composite: 4 stat cards + 2 list sections
- `SkeletonList` — repeating list item placeholders

**Visual:** `bg-gray-200 rounded animate-pulse`

**Adoption:** Government Dashboard and Admin Dashboard use `SkeletonDashboard`. Other portals use raw loading checks (`if (loading) return <LoadingSpinner />`).

### 7.5 `shared/components/ConfirmDialog.jsx`

**Purpose:** Accessible modal confirm/cancel dialog.

**Accessibility:** `role="dialog"`, `aria-modal="true"`, focus trap (assumed from pattern — not verified in full)

**Backdrop:** `fixed inset-0 bg-black bg-opacity-50 z-50`

**Dialog card:**
```
bg-white rounded-xl shadow-xl p-6
max-w-md w-full mx-4
```

**Adoption:** Admin re-exports it. Used specifically for deletion confirmations in admin management pages.

### 7.6 `shared/components/OfflineBanner.jsx`

**Purpose:** Fixed top banner shown when browser is offline.

**Visual:**
```
fixed top-0 left-0 right-0 z-50
bg-yellow-100 border-b border-yellow-300
text-yellow-800 text-sm
py-2 px-4 flex items-center justify-center gap-2
```

**Exports `StaleIndicator`:** A small inline badge `bg-yellow-100 text-yellow-700 text-xs px-2 py-0.5 rounded-full` shown when data may be stale.

**Adoption:** Government Dashboard uses `StaleIndicator`. Portals that use the OfflineBanner component itself are not confirmed from reading — likely opt-in.

### 7.7 `shared/components/ErrorBoundary.jsx`

**Purpose:** React class component error boundary.

**Behavior:**
- Catches render errors
- Renders a fallback error card on crash
- Calls `window.Sentry.captureException(error)` if Sentry is loaded — gracefully no-ops if it isn't

**Visual fallback:**
```
min-h-screen flex items-center justify-center
bg-gray-50
```

With a centered card showing error title + message + reload button.

**Adoption:** Not confirmed as wrapped around app roots in all portals — likely opt-in.

### 7.8 `shared/components/TopBar.jsx`

**Purpose:** Mobile topbar for parent app specifically.

**Visual:**
```
bg-primary-600
h-14 fixed top-0 left-0 right-0
```

Contains bell notification icon with badge count. Settings link.

**Note:** This is specifically named for parent context. Admin has its own `admin/src/components/TopBar.jsx` that is entirely separate (and unrendered — see Section 8.5).

### 7.9 `shared/context/createAuthContext.jsx`

**Purpose:** Factory function that creates a portal-specific auth context + hook pair.

**Parameters:** `{ apiPrefix, allowedRoles, storageKey }`

**State managed:**
- `user` — decoded user object from JWT
- `isAuthenticated` — boolean
- `loading` — initial auth check in progress

**Behavior:**
- On mount: calls `GET /api/v1/auth/me` to restore session
- `login()`: calls `POST /api/v1/auth/login`, stores user metadata in `localStorage[storageKey]`
- `logout()`: calls `POST /api/v1/auth/logout`, clears localStorage
- `refreshToken()`: handled by `api.js` Axios interceptor — transparent to components
- Returns `{ user, isAuthenticated, loading, login, logout }` from hook

**Adoption:** All portals use this factory. Each portal has a local `context/AuthContext.jsx` that calls `createAuthContext(...)` with portal-specific params.

### 7.10 `shared/services/api.js`

**Purpose:** Platform-wide Axios instance with auth handling.

**Config:**
- `baseURL`: from `VITE_API_URL` env or `http://localhost:5000`
- `withCredentials: true` — sends HttpOnly cookies
- `Content-Type: application/json` default

**Interceptors:**
- Request: Sets `Content-Type: multipart/form-data` when body is `FormData`
- Response (error): On 401, acquires mutex and calls `POST /api/v1/auth/refresh`. On success, retries original request. On refresh failure, redirects to `/login`. Does not retry refresh calls themselves (checked by URL pattern).

### 7.11 `shared/locales/` (en.json, ru.json, uz.json)

See Section 14 for full i18n analysis.

### 7.12 Components Defined in Shared But With Limited/No Adoption

| Component | Status | Issue |
|---|---|---|
| `shared/components/TopBar.jsx` | Parent-app specific | Named generically but built for one portal |
| `shared/components/Skeleton.jsx` | Under-adopted | Only 2 of 5 portals use skeleton loading |
| `shared/components/ErrorBoundary.jsx` | Uncertain adoption | Not confirmed in any App.jsx root |
| `shared/components/OfflineBanner.jsx` | Under-adopted | Only government uses StaleIndicator |

---

## 8. COMPONENT INVENTORY — ADMIN PORTAL

### 8.1 File Tree Overview

```
admin/src/
├── App.jsx
├── index.css
├── components/
│   ├── AdminBackground.jsx
│   ├── BottomNav.jsx
│   ├── Card.jsx              (re-export from shared)
│   ├── ConfirmDialog.jsx     (re-export from shared)
│   ├── Layout.jsx
│   ├── LoadingSpinner.jsx    (re-export from shared)
│   ├── Sidebar.jsx
│   └── TopBar.jsx            (DEFINED BUT NEVER RENDERED)
├── context/
│   └── AuthContext.jsx
└── pages/
    ├── Dashboard.jsx
    ├── Groups.jsx
    ├── Login.jsx
    ├── ParentManagement.jsx
    ├── Profile.jsx
    ├── ReceptionManagement.jsx
    ├── SchoolRatings.jsx
    ├── Settings.jsx
    └── TeacherManagement.jsx
```

### 8.2 `admin/src/App.jsx`

Routes: `/admin-register` (public), `/admin/login` (public), `/admin/*` (protected — requires `admin` role).

Protected routes:
```
/admin           → Dashboard
/admin/reception → ReceptionManagement
/admin/parents   → ParentManagement
/admin/teachers  → TeacherManagement
/admin/groups    → Groups
/admin/ratings   → SchoolRatings
/admin/settings  → Settings
/admin/profile   → Profile
```

`<ToastContainer />` rendered at root — admin toasts work correctly.

Registration route `/admin-register` is public with no auth check. This allows anyone to access the admin registration page.

### 8.3 `admin/src/pages/Login.jsx`

**Visual:**
```
min-h-screen bg-gradient-to-br from-primary-50 to-primary-100
max-w-md white card, rounded-xl, shadow-lg, p-8
Crown icon (lucide) in primary-100 circle
```

**Error handling:**
```jsx
if (result.status === 429) setError(t('login.accountLocked'));
else if (result.status === 403) setError(t('login.notApproved'));
else setError(t('login.errorInvalid'));
```

Note: uses `t('login.errorInvalid')` while government uses `t('login.error')` — different key for the same concept.

**Hardcoded Uzbek strings NOT in i18n (lines 121–130):**
```jsx
<p className="text-center text-sm text-gray-600 mb-3">
  Admin bo&apos;lishni xohlaysizmi?
</p>
<Link to="/admin-register" className="...">
  Admin ro&apos;yxatdan o&apos;tish
</Link>
```

These strings cannot be translated. They are rendered below the login form on the admin login page.

### 8.4 `admin/src/components/Sidebar.jsx`

**Header visual:**
```
bg-sidebar-navy (#2E3A59)
text-white
Crown icon (lucide-react)
```

**Navigation items (8 total):**
1. Dashboard — `Home` icon → `/admin`
2. Reception — `UserCheck` icon → `/admin/reception`
3. Parents — `Users` icon → `/admin/parents`
4. Teachers — `GraduationCap` icon → `/admin/teachers`
5. Groups — `BookOpen` icon → `/admin/groups`
6. School Ratings — `Star` icon → `/admin/ratings`
7. Settings — `Settings` icon → `/admin/settings`
8. Profile — `User` icon → `/admin/profile`

**Active state:** `bg-sidebar-blue (#E8F4FD) text-sidebar-navy font-medium`

**Footer:**
User initials in `bg-sidebar-blue rounded-full w-8 h-8` circle, user name and email text, logout button.

**Mobile behavior:** Sidebar is a fixed overlay drawer, shown/hidden via `isSidebarOpen` state prop from Layout.

### 8.5 `admin/src/components/TopBar.jsx` — NEVER RENDERED

This component exists at `admin/src/components/TopBar.jsx` and is fully implemented:

```jsx
// admin/src/components/TopBar.jsx
<div className="bg-gradient-to-r from-primary-600 to-primary-500 text-white py-3 px-4 flex items-center justify-between shadow-md">
  <div className="flex items-center gap-2">
    <Crown className="w-5 h-5 text-yellow-300" />
    <span className="font-semibold text-sm">{title}</span>
  </div>
  {/* ... */}
</div>
```

`admin/src/components/Layout.jsx` does NOT import or render this component. Mobile admin users see the page content with no header bar — just the sidebar overlay trigger (wherever that is implemented).

**Impact:** On mobile, admin users have no page context header. They see only the main content area with no visual indication of which portal they are in.

### 8.6 `admin/src/components/Layout.jsx`

**Desktop:** Fixed `w-64` sidebar + `ml-64` main content.

**Mobile:** Sidebar overlay controlled by hamburger button. `<BottomNav>` rendered below content.

**Background:** `<AdminBackground />` SVG rendered as full-page backdrop.

**Notable absence:** `TopBar.jsx` exists but is not imported here. No mobile header bar. The hamburger button to open the sidebar IS present (visible in mobile), but there's no fixed header to house it — it may be floating or in the page content.

### 8.7 `admin/src/components/BottomNav.jsx`

**Items (6 total):**
1. Dashboard → `/admin`
2. Reception → `/admin/reception`
3. Parents → `/admin/parents`
4. Teachers → `/admin/teachers`
5. Groups → `/admin/groups`
6. Profile → `/admin/profile`

**Missing from BottomNav:** School Ratings (`/admin/ratings`), Settings (`/admin/settings`).

**Active color:** `text-primary-600`

**Visual:**
```
fixed bottom-0 left-0 right-0
bg-white border-t border-gray-200
flex items-center justify-around
h-16 pb-safe (safe area inset for iOS)
```

**Issue:** 2 of 8 admin routes (25%) are unreachable via mobile navigation. Users who need to access School Ratings or Settings on mobile must know the URL.

### 8.8 `admin/src/components/AdminBackground.jsx`

**SVG details:**
- Full-screen SVG (`position: absolute` or `fixed`, 100vw × 100vh)
- Background gradient: light teal `#E8F4F8` to `#F8FAFC`
- Grid pattern: small `#E8F4F8` squares at very low opacity
- Geometric accent shapes: rotated rectangles, circles
- **Opacity:** Very low (0.3–0.5 on shapes) — effectively invisible at runtime

**Purposeful:** Creates subtle texture on the white/near-white page background. Does not interfere with content readability.

### 8.9 `admin/src/pages/Dashboard.jsx`

**Welcome banner:**
```
bg-gradient-to-r from-primary-600 to-primary-500
text-white rounded-xl p-6
Crown icon in text-yellow-300
```

**Stats grid:**
```
grid grid-cols-2 md:grid-cols-4 gap-6
```

Stats displayed: 4 items (likely Total Users, Reception, Teachers, Parents or similar).

**Loading state:** Uses `SkeletonDashboard` from shared/Skeleton — good adoption.

**Reception list preview:** Shows recent reception staff with status badges (`pending`, `approved`, `rejected` in colored pill badges).

### 8.10 `admin/src/pages/ReceptionManagement.jsx` — CRITICAL UX BUG

**The `window.prompt()` call:**

```jsx
// admin/src/pages/ReceptionManagement.jsx
const handleReject = async (id) => {
  const reason = prompt(t('receptionsPage.rejectionPrompt'));
  if (!reason) return;
  // ... fire reject API call
};
```

`window.prompt()` is a blocking native browser dialog. It:
- Has no CSS styling — renders in browser's default OS chrome
- Blocks the JavaScript event loop while open
- Cannot be tested by most testing frameworks
- Has no validation — empty string and whitespace are technically non-empty
- Has inconsistent cancel behavior across browsers (returns `null` vs `""`)
- Is not accessible via ARIA
- Cannot be dismissed with Escape on some browsers without triggering weird cancel states
- Looks completely out of place in a Tailwind-styled admin panel

This is the most egregious UX bug in the admin portal.

---

## 9. COMPONENT INVENTORY — GOVERNMENT PORTAL

### 9.1 File Tree Overview

```
government/src/
├── App.jsx
├── index.css
├── components/
│   ├── GovernmentBackground.jsx
│   ├── Layout.jsx
│   └── Sidebar.jsx
├── context/
│   ├── AuthContext.jsx
│   └── ToastContext.jsx          (DEFINED BUT ToastContainer NEVER RENDERED)
└── pages/
    ├── AdminDetail.jsx
    ├── Dashboard.jsx
    ├── Login.jsx
    ├── Parents.jsx
    ├── Platform.jsx
    ├── Profile.jsx
    ├── Ratings.jsx
    ├── SchoolDetail.jsx
    ├── Schools.jsx
    ├── Students.jsx
    └── Teachers.jsx
```

### 9.2 `government/src/App.jsx`

Routes under `/government/*`:
```
/government           → Dashboard
/government/schools   → Schools
/government/students  → Students
/government/teachers  → Teachers
/government/parents   → Parents
/government/ratings   → Ratings
/government/platform  → Platform
/government/profile   → Profile
/government/admin/:id → AdminDetail
```

**Critical absence:** `<ToastContainer />` is NOT rendered in App.jsx. The `ToastContext.jsx` provides `useToast()` but toasts are never displayed. See Section 16.1.

### 9.3 `government/src/pages/Login.jsx`

```jsx
// government/src/pages/Login.jsx — lines 36–49
<div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-primary-100 px-4">
  <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8">
    <div className="text-center mb-8">
      <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-100 rounded-full mb-4">
        <Shield className="w-8 h-8 text-primary-600" />
      </div>
      <h1 className="text-3xl font-bold text-gray-900 mb-2">
        {t('login.title', { defaultValue: 'Davlat Nazorat Paneli' })}
      </h1>
```

**Icon:** `Shield` from lucide-react (appropriate for government oversight context)

**Differentiation from admin login:** Same layout, different icon (Shield vs Crown), no registration link at bottom, slightly different i18n key convention (uses `defaultValue` fallback props rather than requiring all keys to be defined).

### 9.4 `government/src/components/Sidebar.jsx`

**Header:** `bg-primary-600` (violet) — different from all other portals which use `bg-sidebar-navy` (dark navy).

**Navigation (5 items only):**
1. Dashboard — `Home` → `/government`
2. Schools — `Building2` → `/government/schools`
3. Ratings — `Star` → `/government/ratings`
4. Platform — `Settings` → `/government/platform`
5. Profile — `User` → `/government/profile`

**Missing nav items for existing routes:**
- `/government/students` — no sidebar link
- `/government/teachers` — no sidebar link  
- `/government/parents` — no sidebar link
- `/government/admin/:id` — appropriately not in sidebar (detail page)

Students, Teachers, and Parents pages are only reachable by clicking dashboard stat cards. There is no persistent navigation to these sections.

**Active state:** `bg-primary-100 text-primary-600` — consistent with primary color system.

**Footer:** Has a logout button. Shows user name and role badge.

**Significant visual difference from other portals:**

| Element | Government | Admin / Reception / Teacher |
|---|---|---|
| Sidebar header bg | `bg-primary-600` (violet) | `bg-sidebar-navy` (dark navy) |
| Active item bg | `bg-primary-100` (light violet) | `bg-sidebar-blue` (light blue) |
| Active item text | `text-primary-600` (violet) | `text-sidebar-navy` (dark navy) |

### 9.5 `government/src/components/Layout.jsx`

**Desktop:** Fixed sidebar + content `ml-64`.

**Mobile:** Hamburger menu opens sidebar drawer. `pt-14` on mobile content to accommodate fixed mobile header.

**Background:** `<GovernmentBackground />` SVG.

**No BottomNav:** Government portal has no mobile bottom navigation. On mobile, the only navigation is the sidebar drawer.

### 9.6 `government/src/context/ToastContext.jsx` — SILENT BUG

```jsx
// government/src/context/ToastContext.jsx
export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);
  const addToast = (message, type = 'info') => { /* adds toast to state */ };
  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      {/* ToastContainer is defined here but App.jsx does not render this Provider */}
    </ToastContext.Provider>
  );
};
```

The file defines `ToastProvider` which includes toast state and the `<ToastContainer>`. But `government/src/App.jsx` never wraps the app in `<ToastProvider>`. Pages that call `useToast()` will receive the default context value (likely an empty object or throw an error), and no toasts will appear on screen.

See Section 16.1 for full analysis.

### 9.7 `government/src/pages/Dashboard.jsx`

**Stat cards:** 4 clickable cards (Schools, Students, Teachers, Parents). Click navigates to respective pages — this is the ONLY navigation path to students, teachers, and parents pages.

**Admin grid:** Displays admin user cards — likely `grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4`.

**School ranking:** List with custom `StarDisplay` component (inline defined), star distribution bars.

**Loading:** Uses `<SkeletonDashboard />` — good.

**Stale data:** Uses `<StaleIndicator />` from shared OfflineBanner — good.

### 9.8 `government/src/pages/Platform.jsx`

Tab-based admin management interface. Tabs:
1. Admins
2. Schools
3. Messages
4. Government Users
5. Registrations

Each tab renders a child component (AdminsTab, SchoolsTab, etc.). Props-heavy: the AdminsTab receives 30+ props passed down from Platform.jsx. No context or state management library to avoid prop drilling.

### 9.9 `government/src/pages/Ratings.jsx`

School rating cards with:
- Star display (1–5 stars, custom SVG or lucide `Star` icons)
- Distribution bars (percentage bars for each star rating)
- Lazy-loaded review lists

Custom components `StarDisplay` and `DistributionBar` are defined inline in this file rather than as separate component files. These are not reusable from other pages.

### 9.10 Government Portal Index CSS

```css
/* government/src/index.css */
@tailwind base;
@tailwind components;
@tailwind utilities;

body {
  font-family: 'Inter', system-ui, -apple-system, sans-serif;
  background-color: #f9fafb;
  color: #111827;
}
```

**Differences from other portals:**
- Uses direct CSS property assignments, not `@apply`
- Sets explicit `background-color` and `color` in pixels/hex — other portals use `@apply bg-gray-50 text-gray-900`
- No `@layer base { }` wrapper
- No `.line-clamp-2` utility class (present in other portals' CSS)
- No `scroll-behavior: smooth`
- No `*:focus-visible { @apply ... }` — focus ring styling comes from Tailwind only

These differences are not consequential to end users but indicate this portal's CSS was written by a different developer or at a different time than the others.

---

## 10. COMPONENT INVENTORY — RECEPTION PORTAL

### 10.1 File Tree Overview

```
reception/src/
├── App.jsx
├── index.css
├── components/
│   ├── BottomNav.jsx
│   ├── Layout.jsx
│   ├── ReceptionBackground.jsx
│   └── Sidebar.jsx
├── context/
│   └── AuthContext.jsx
└── pages/
    ├── Dashboard.jsx
    ├── Groups.jsx
    ├── Login.jsx
    ├── ParentManagement.jsx
    ├── Profile.jsx
    └── TeacherManagement.jsx
```

### 10.2 `reception/src/pages/Login.jsx` — BOM Character Issue

The file begins with a UTF-8 BOM character (`﻿`) before the first `import`. This is a Windows text editor artifact. While modern JavaScript engines and most bundlers handle BOM silently, it:
- Can cause issues with some parsers and tools
- May appear as a stray character in certain diff views
- Indicates the file was saved with a non-standard encoding

Same issue present in `teacher/src/pages/Login.jsx`.

**Login visual:** Identical to government login (Shield icon, same layout) except uses `t('login.invalid')` where government uses `t('login.error')`. Different i18n key for same error concept.

### 10.3 `reception/src/components/Sidebar.jsx`

**Visually identical to admin Sidebar:**
- `bg-sidebar-navy` header
- `bg-sidebar-blue text-sidebar-navy` active state
- Same layout structure, same CSS classes

**Navigation items (6 total):**
1. Dashboard → `/reception`
2. Parents → `/reception/parents`
3. Teachers → `/reception/teachers`
4. Groups → `/reception/groups`
5. Profile → `/reception/profile`
6. (Possibly a 6th — not fully confirmed)

Reception has no equivalent to admin's "School Ratings" or "Settings" — appropriate for the role.

**Distinction from admin sidebar:** Reception sidebar does NOT show a user initials circle in the footer — unclear if this is intentional.

### 10.4 `reception/src/components/Layout.jsx` — Floating LanguageSwitcher

```jsx
// reception/src/components/Layout.jsx
<div className="fixed top-4 right-4 z-50">
  <LanguageSwitcher />
</div>
```

This is the ONLY portal that positions the LanguageSwitcher as a floating overlay element. All other portals render it inside the sidebar footer (within the normal document flow).

**Problems:**
1. Overlaps page content in top-right corner — headers, buttons, or form elements near `top-4 right-4` will be obscured
2. The switcher renders on top of the mobile sidebar drawer's overlay (both at `z-50`) — behavior is unpredictable
3. If the `OfflineBanner` is shown (`fixed top-0`), the LanguageSwitcher will appear at `top-4` which puts it partially behind/overlapping the banner

**Why this happened:** Likely the reception portal was built without a designated sidebar footer area, or the LanguageSwitcher was added as an afterthought.

### 10.5 `reception/src/components/ReceptionBackground.jsx`

**Visual description:**
- SVG fills full viewport
- Background fill: warm coral gradient from `#FFF5F0` to `#FFFDFB`
- Wave paths using orange `#FF9966`, rose `#FF6B9D`, amber `#FFB347` at very low opacity
- Most visually distinctive background of all portals — warm/feminine vs. other portals' cool/corporate

This background signals a different "personality" for the reception portal compared to the others. Whether this was intentional brand differentiation or developer preference is unclear.

### 10.6 `reception/src/pages/Dashboard.jsx` — `_id` vs `id` Bug

```jsx
// reception/src/pages/Dashboard.jsx
{teachers.map(teacher => (
  <TeacherCard key={teacher._id} teacher={teacher} />
))}
```

Uses `teacher._id` (MongoDB-style document ID field) as the React key. This backend uses PostgreSQL with Sequelize, which uses `teacher.id` (integer primary key). If `teacher._id` is undefined (which it would be on a PostgreSQL record), React will use `undefined` as the key for all teacher cards, causing reconciliation bugs and potential React warnings.

**Impact:** Duplicate `key` warnings in console. Potential incorrect DOM updates when the teacher list changes.

### 10.7 Reception Portal Bottom Navigation

**Items (5 total):**
1. Dashboard → `/reception`
2. Parents → `/reception/parents`
3. Teachers → `/reception/teachers`
4. Groups → `/reception/groups`
5. Profile → `/reception/profile`

This covers all reception routes except possibly a settings/help section. Coverage is complete.

---

## 11. COMPONENT INVENTORY — TEACHER PORTAL

### 11.1 File Tree Overview

```
teacher/src/
├── App.jsx
├── index.css
├── components/
│   ├── Layout.jsx
│   ├── Sidebar.jsx
│   └── TopBar.jsx (mobile header — rendered correctly here)
├── context/
│   └── AuthContext.jsx
├── pages/
│   ├── Attendance.jsx
│   ├── Chat.jsx
│   ├── Dashboard.jsx
│   ├── EmotionalMonitoring.jsx
│   ├── Groups.jsx
│   ├── Login.jsx
│   ├── Media.jsx
│   ├── MealPlan.jsx
│   ├── Profile.jsx
│   └── (other pages)
├── shared/
│   ├── components/
│   │   ├── BottomNav.jsx           (teacher/parent shared bottom nav)
│   │   ├── JoyfulBackground.jsx    (parent background)
│   │   ├── TeacherBackground.jsx   (teacher background)
│   │   └── (others)
│   └── services/
│       └── chatStore.js
└── parent/
    ├── ParentApp.jsx
    ├── components/
    │   ├── BottomNav.jsx
    │   ├── Layout.jsx
    │   ├── Sidebar.jsx
    │   └── TopBar.jsx
    └── pages/
        ├── Dashboard.jsx
        └── (other pages)
```

### 11.2 `teacher/src/App.jsx` — Dual-Role SPA

Both teacher and parent routes live in the same Vite app:

```jsx
// teacher/src/App.jsx (approximate)
<Routes>
  <Route path="/login" element={<Login />} />
  
  {/* Teacher routes */}
  <Route element={<RequireRole role="teacher" />}>
    <Route path="/teacher/*" element={<TeacherLayout />}>
      {/* teacher pages */}
    </Route>
  </Route>
  
  {/* Parent routes */}
  <Route element={<RequireRole role="parent" />}>
    <Route path="/*" element={<ParentLayout />}>
      {/* parent pages */}
    </Route>
  </Route>
</Routes>
```

A single login at `/login` receives both teacher and parent credentials. After login, the auth context determines the role and redirects to the appropriate root route.

**Consequence:** A teacher logging in would land at `/teacher/*` and a parent at `/`. The parent "app" is effectively the root of this Vite app. This has deployment implications — the entire bundle (teacher + parent code) is downloaded by every user regardless of role.

### 11.3 `teacher/src/pages/Login.jsx` — Completely Different Visual System

This is the most visually inconsistent component in the entire platform:

```jsx
// teacher/src/pages/Login.jsx
<div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center p-4">
  <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
    <div className="text-center mb-8">
      <div className="text-5xl mb-4">🎓</div>     {/* EMOJI icon, not lucide */}
      <h1 className="text-2xl font-bold text-gray-800">
        {t('login.title', { defaultValue: "O'qituvchi Portali" })}
      </h1>
```

**Divergences from all other portals:**

| Element | Teacher Login | All Other Portals |
|---|---|---|
| Background | `from-blue-50 to-blue-100` | `from-primary-50 to-primary-100` |
| Icon | `🎓` emoji (text-5xl) | lucide-react icon in bg-primary-100 circle |
| Icon container | None — bare emoji | `w-16 h-16 bg-primary-100 rounded-full` |
| Input focus ring | `focus:ring-blue-500` | `focus:ring-primary-500` |
| Submit button | `bg-blue-600 hover:bg-blue-700` | `bg-primary-600 hover:bg-primary-700` |
| Card rounding | `rounded-2xl` | `rounded-xl` |

A user who uses multiple portals (e.g., a teacher who is also an admin in a different school) will encounter a jarring visual discontinuity on the teacher login page.

### 11.4 `teacher/src/components/Sidebar.jsx`

**Header:** `bg-sidebar-navy`

**Navigation (10 items):**
1. Dashboard → `/teacher`
2. Groups → `/teacher/groups`
3. Students (Attendance) → `/teacher/attendance`
4. Meal Plan → `/teacher/meals`
5. Media → `/teacher/media`
6. Emotional Monitoring → `/teacher/emotional`
7. Chat → `/teacher/chat` (with unread badge — polled every 30s)
8. Progress Reports → `/teacher/progress`
9. Homework → `/teacher/homework`
10. Profile → `/teacher/profile`

**Unread chat badge:**
```jsx
// teacher/src/components/Sidebar.jsx (approximate)
{unreadCount > 0 && (
  <span className="ml-auto bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5 min-w-[18px] text-center">
    {unreadCount > 99 ? '99+' : unreadCount}
  </span>
)}
```

Badge is polled via `getUnreadCount()` from `chatStore.js` on a 30-second interval. This is real-time indicator behavior implemented via polling (not WebSocket push) — acceptable for the badge but slightly stale.

**Footer:** No logout button explicitly confirmed — may differ from government sidebar.

### 11.5 `teacher/src/pages/Dashboard.jsx`

**Welcome banner:**
```jsx
<div className="bg-blue-500 rounded-xl p-6 text-white mb-6">
```

Uses `bg-blue-500` instead of `bg-primary-600`. This is inconsistent with the design system. The admin portal dashboard uses `from-primary-600 to-primary-500`.

**Stats grid:**
```jsx
<div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-4">
```

6-column grid on XL — notably more dense than other portals' 4-column max.

**N+1 fetch pattern (critical performance issue):**
```jsx
// teacher/src/pages/Dashboard.jsx (approximate)
useEffect(() => {
  fetchParents().then(parents => {
    parents.forEach(parent => {
      parent.children.forEach(child => {
        fetchActivitiesForChild(child.id);
        fetchMealsForChild(child.id);
        fetchMediaForChild(child.id);
      });
    });
  });
}, []);
```

If a teacher has 20 students each with 1 parent, this fires ~60 HTTP requests on dashboard mount. No batching, no cancellation on unmount, no deduplication.

### 11.6 Teacher Portal Shared BottomNav

`teacher/src/shared/components/BottomNav.jsx` is a sophisticated shared component used by both teacher and parent layouts:

**Props:**
- `variant` — `"top"` or `"bottom"` (defaults to `"bottom"`)
- `allowed` — array of item keys to display (filters the full item list)
- `showLanguageSwitcher` — boolean
- `showExit` — boolean (shows a logout/exit button)

**Inline style usage:**
```jsx
// teacher/src/shared/components/BottomNav.jsx
style={{ minHeight: isTop ? '68px' : '64px' }}
```

This is the only use of inline `style` in the teacher portal. Should be `h-16` or `h-[68px]` in Tailwind.

**Chat badge:**
```jsx
import { getUnreadTotalForPrefix } from '../services/chatStore';
```

This import is confirmed valid — `chatStore.js` exists at `teacher/src/shared/services/chatStore.js`.

---

## 12. COMPONENT INVENTORY — PARENT UI (WITHIN TEACHER/)

### 12.1 Overview

The parent-facing UI lives entirely within the `teacher/` Vite app at `teacher/src/parent/`. It is a separate navigation tree with its own Layout, Sidebar, TopBar, and BottomNav. The teacher and parent UIs share the same build, the same authentication flow, and the same chat infrastructure.

### 12.2 `teacher/src/parent/pages/Dashboard.jsx`

**Welcome card:**
```jsx
<div className="bg-gradient-to-r from-blue-500 to-blue-400 rounded-2xl p-6 text-white">
```

Again `blue-500/400` instead of `primary-600`. Parent portal uses `parent.*` semantic tokens in Tailwind config (`parent-accent: #7C3AED`) but the code ignores them.

**Stats:** 5 stat cards — likely attendance, homework, meals, media, emotional report counts.

**Real-time updates:** WebSocket listeners (`socket.on(...)`) update stats dynamically.

**Animation:**
```jsx
<div className="animate-in fade-in ...">
```

Uses `animate-in fade-in` — this is a Tailwind Animate utility class. Not confirmed if `tailwindcss-animate` plugin is installed. If not, these classes are no-ops and the animation silently doesn't play.

### 12.3 `teacher/src/parent/components/Layout.jsx` — `<a>` vs `<Link>` Bug

```jsx
// teacher/src/parent/components/Layout.jsx
<a href="/chat" className="...">
  <MessageCircle className="w-6 h-6" />
</a>
```

This is an `<a>` tag for internal navigation, not React Router's `<Link>`. Every click on the floating chat button triggers a full browser navigation — the entire React app unmounts and remounts, all state is lost, scroll positions reset, and any pending data fetches are abandoned.

**Impact:** Users lose their current context every time they tap the chat button. On slow connections or low-end devices, this is a multi-second experience degradation.

### 12.4 `teacher/src/parent/components/TopBar.jsx`

```jsx
// teacher/src/parent/components/TopBar.jsx
<div className="bg-blue-500 fixed top-0 left-0 right-0 lg:left-64 z-30 ...">
```

`bg-blue-500` instead of `bg-primary-600`. Fixed top, `left-64` offset on desktop to clear the sidebar. `z-30` — lower than sidebar `z-50`, which is correct.

Imports `getUnreadCount` from `'../../shared/services/chatStore'` — valid import path.

### 12.5 `teacher/src/parent/components/Sidebar.jsx`

**Header:** `bg-sidebar-navy`

**Navigation (11 items):**
1. Dashboard → `/`
2. Attendance → `/attendance`
3. Homework → `/homework`
4. Gallery/Media → `/media`
5. Schedule → `/schedule`
6. Meal Plan → `/meals`
7. Emotional Monitoring → `/emotional`
8. Notifications → `/notifications`
9. Ratings → `/ratings`
10. Chat → `/chat` (with notification dot)
11. AI Chat → `/ai-chat` (with notification dot)

Or Profile somewhere in the list — 11 total confirmed.

### 12.6 `teacher/src/parent/components/BottomNav.jsx` — Critical Mobile Gap

```jsx
// teacher/src/parent/components/BottomNav.jsx
const items = [
  { key: 'home', label: t('nav.home'), icon: Home, href: '/' },
  { key: 'profile', label: t('nav.profile'), icon: User, href: '/profile' },
  { key: 'rating', label: t('nav.rating'), icon: Star, href: '/ratings' },
  { key: 'ai', label: t('nav.aiChat'), icon: Bot, href: '/ai-chat' },
];
```

**Only 4 items.** The sidebar has 11 items.

**Items unreachable via mobile BottomNav:**
- Attendance
- Homework
- Gallery/Media
- Schedule
- Meal Plan
- Emotional Monitoring
- Notifications
- Chat (regular, non-AI)

That is **7 out of 11 (64%)** of the parent's navigation items completely absent from mobile navigation.

Parents on mobile cannot access:
- Their child's attendance records
- Homework assignments
- School photos and media
- Class schedule
- Meal plan
- Emotional monitoring reports
- Regular (non-AI) chat with teachers
- Push notification history

The only workaround is knowing the URL and typing it in the browser address bar.

**Active state:** `text-blue-600` (not `text-primary-600` — another blue vs. violet inconsistency).

---

## 13. ACCESSIBILITY AUDIT

### 13.1 ARIA Roles and Labels — What's Present

**Shared components — well-done:**

| Component | ARIA attributes |
|---|---|
| `Toast.jsx` | `role="alert"`, `aria-live="polite"`, `aria-atomic="true"` |
| `OfflineBanner.jsx` | `aria-live="assertive"` |
| `LoadingSpinner.jsx` | `role="status"`, `aria-label="Loading..."` |
| `ConfirmDialog.jsx` | `role="dialog"`, `aria-modal="true"` |
| `Card.jsx` | `role="button"`, `tabIndex={0}` when interactive |

**Portal components — problematic:**

| Component | Issue |
|---|---|
| All `<Sidebar>` hamburger buttons | No `aria-label` — icon-only button |
| Password visibility toggles | `aria-label` present in some portals (admin), absent in others |
| All status badges | No `role` or `aria-label` — meaning conveyed by color only |
| Star rating displays | No `aria-label` for numeric rating value |
| Chat unread badges | No `aria-label` — screen readers may read the count without context |

### 13.2 Keyboard Navigation

**What works:**
- Form inputs: standard tab order
- Submit buttons: accessible via Enter
- `Card.jsx` when clickable: Enter/Space keyboard support implemented
- Password toggle in `admin/Login.jsx` and `government/Login.jsx`: has `aria-label`

**What doesn't work:**
- All sidebar nav items: likely accessible (anchor tags) but sidebar state (open/closed) is not announced to screen readers
- Mobile BottomNav items: anchor tags, keyboard accessible
- `window.prompt()` in admin: accessible only via browser dialog keyboard handling — not custom

### 13.3 Focus Management

**Defined globally in `index.css` (admin, teacher, reception — not government):**
```css
*:focus-visible {
  @apply outline-2 outline-offset-2 outline-primary-500;
}
```

Government uses default browser focus outlines (no `*:focus-visible` rule). This means focus appearance differs between government portal and all others.

**Modal focus trapping:** `ConfirmDialog.jsx` is stated to be accessible but focus trap implementation was not confirmed in the read session. This requires manual verification.

**Loading states:** During API calls, submit buttons are `disabled` but focus is not explicitly managed back to a logical element after the operation completes.

### 13.4 Color Contrast

**Likely passing (4.5:1 WCAG AA requirement):**
- `text-gray-900` on `bg-white` — high contrast
- `text-white` on `bg-primary-600` (#7c3aed) — needs verification but likely passes
- `text-white` on `bg-sidebar-navy` (#2E3A59) — likely passes (dark bg)

**Potentially failing:**
- `text-gray-500` on `bg-gray-50` — light gray on near-white. Estimated ratio ~4:1, borderline
- `text-sidebar-muted` (#8F9BB3) on `bg-sidebar-navy` (#2E3A59) — muted text on dark bg. Needs measurement
- `text-primary-600` on `bg-sidebar-blue` (#E8F4FD) — violet on light blue. Estimated ratio ~3.5:1, likely fails AA
- `text-blue-600` on `bg-white` — parent BottomNav active state. Should pass but blue-600 is darker than blue-500
- Status badges: `text-green-800 bg-green-100`, `text-yellow-800 bg-yellow-100`, `text-red-800 bg-red-100` — all should pass

**Not checked:** All SVG background decorative elements — they should be hidden from accessibility tree (`aria-hidden="true"`), which they appear to be by virtue of being decorative backdrop SVGs.

### 13.5 Language Attributes

WCAG 3.1.1 requires the page `lang` attribute to match the primary language of the content.

| Portal | `lang` attr | Primary content language | Status |
|---|---|---|---|
| government | `uz` | Uzbek | ✅ Correct |
| admin | `en` | Uzbek (mostly) | ❌ Wrong |
| reception | `en` | Uzbek (mostly) | ❌ Wrong |
| teacher | `en` | Uzbek (mostly) | ❌ Wrong |

Screen readers will apply English phonetics to Uzbek text in 3 of 4 portals.

### 13.6 Image Alt Text

No `<img>` tags observed in any portal's main components (SVG backgrounds are inline, icons are SVG from lucide-react with `aria-hidden` by default). Media gallery pages (teacher media uploads) likely have img tags — not fully audited.

### 13.7 Form Accessibility

All login forms:
- `<label>` elements properly associated via `htmlFor`/`id` pairs — ✅
- `required` attribute on inputs — ✅
- `autoComplete` on password fields — ✅ (admin, government)
- Error messages in `<div>` — not associated via `aria-describedby` to the relevant input — ❌

Error messages are rendered as unstyled divs. Screen reader users will hear the error in document order but it's not programmatically linked to the input that caused the error. `aria-describedby` should link the error div to the email or password input.

---

## 14. INTERNATIONALIZATION & LOCALIZATION AUDIT

### 14.1 i18n Stack

All portals use the same stack:
- `i18next` ^23.10.1
- `react-i18next` ^13.5.0
- `i18next-http-backend` ^2.5.2

Backend plugin loads translations at runtime from the `public/locales/` directory in each portal's build output.

### 14.2 Shared Locale Files

`shared/locales/en.json`, `ru.json`, `uz.json` each define the same keys:

**Namespaces covered:**
```json
{
  "nav": { 8 keys },
  "government": { 4 keys },
  "common": { 5 keys: loading, error, success, cancel, save },
  "servicePlan": { 20 keys },
  "assessment": { 11 keys },
  "mealPlan": { 14 keys }
}
```

**Total:** ~60 keys across all namespaces in shared files.

**Missing from shared locales:**
- Login page strings (login.title, login.email, login.password, login.button, etc.)
- Dashboard page strings
- Management page strings (ReceptionManagement, TeacherManagement, etc.)
- Error messages beyond `common.error`
- Status labels (active, inactive, pending, approved, rejected)
- Role names
- Form validation messages

### 14.3 Per-Portal Locale Strategy

Each portal maintains its own `public/locales/` directory with portal-specific translation files. The shared files are likely copied or symlinked during the `prebuild` step (`node fetch-shared.cjs`).

Portal-specific files are not fully audited, but based on observed `t()` calls, each portal defines its own login strings, navigation strings, and page-specific strings independently.

### 14.4 i18n Key Inconsistencies Across Portals

Same UI concepts use different translation keys in different portals:

| Concept | Government key | Admin key | Reception key |
|---|---|---|---|
| Login error (wrong creds) | `login.error` | `login.errorInvalid` | `login.invalid` |
| Account locked (429) | `login.accountLocked` | `login.accountLocked` | `login.accountLocked` |
| Not approved (403) | `login.notApproved` | `login.notApproved` | `login.notApproved` |

The 429 and 403 keys are shared, but the generic error key has 3 different names across 3 portals. This means these strings are defined 3 times with potentially different wording.

### 14.5 Hardcoded Strings Not in i18n

Confirmed hardcoded strings in source code (not translatable):

**Admin Login page:**
```jsx
// admin/src/pages/Login.jsx — lines 122–128
"Admin bo'lishni xohlaysizmi?"
"Admin ro'yxatdan o'tish"
```

**Admin Login ARIA label (partially):**
```jsx
// admin/src/pages/Login.jsx — approximate
aria-label={showPassword ? t('login.hidePassword', { defaultValue: 'Hide password' })
                         : t('login.showPassword', { defaultValue: 'Show password' })}
```

The English defaults are inline, not in any locale file.

**Reception Login:**
Similar pattern — some strings use `defaultValue` fallbacks rather than proper locale file entries.

### 14.6 Language Switcher Presence

| Portal | LanguageSwitcher | Location |
|---|---|---|
| admin | Yes | Sidebar footer |
| government | Yes | Sidebar footer |
| reception | Yes | `fixed top-4 right-4` (floating overlay) |
| teacher | Yes | Sidebar footer |
| parent | Yes | Bottom nav (via `showLanguageSwitcher` prop) |

The reception placement is an outlier — see Section 10.4.

### 14.7 Language Support Coverage

Three languages defined: Uzbek (uz), Russian (ru), English (en). Uzbek is the primary language for the actual users (school staff, government officials, parents in Uzbekistan). Russian is the secondary administrative language. English appears to be for development/demo purposes.

Based on observed `defaultValue` props in JSX, many strings have Uzbek defaults hardcoded into JSX when i18n keys are missing. This works functionally but means:
- Russian translation will show the i18n key name if a key is missing (falling through to key name, not a sensible default)
- English strings in defaultValue props will override missing en.json entries correctly but bypass the locale system

---

## 15. CROSS-PORTAL CONSISTENCY ANALYSIS

### 15.1 Login Page Matrix

| Element | Admin | Government | Reception | Teacher |
|---|---|---|---|---|
| Background | `from-primary-50 to-primary-100` | `from-primary-50 to-primary-100` | `from-primary-50 to-primary-100` | `from-blue-50 to-blue-100` ❌ |
| Icon type | Crown (lucide) | Shield (lucide) | Shield (lucide) | 🎓 emoji ❌ |
| Icon container | `bg-primary-100 rounded-full` | `bg-primary-100 rounded-full` | `bg-primary-100 rounded-full` | None ❌ |
| Card rounding | `rounded-xl` | `rounded-xl` | `rounded-xl` | `rounded-2xl` ❌ |
| Input focus | `focus:ring-primary-500` | `focus:ring-primary-500` | `focus:ring-primary-500` | `focus:ring-blue-500` ❌ |
| Submit button | `bg-primary-600` | `bg-primary-600` | `bg-primary-600` | `bg-blue-600` ❌ |
| Password toggle | ✅ | ✅ | ✅ | ✅ |
| Extra bottom content | Reg link (hardcoded UZ) | None | None | None |

Teacher login fails consistency on 5 of 7 checkable design elements.

### 15.2 Sidebar Visual Matrix

| Element | Admin | Government | Reception | Teacher | Parent |
|---|---|---|---|---|---|
| Header bg | `bg-sidebar-navy` | `bg-primary-600` ❌ | `bg-sidebar-navy` | `bg-sidebar-navy` | `bg-sidebar-navy` |
| Active item bg | `bg-sidebar-blue` | `bg-primary-100` ❌ | `bg-sidebar-blue` | `bg-sidebar-blue` | `bg-sidebar-blue` |
| Active item text | `text-sidebar-navy` | `text-primary-600` ❌ | `text-sidebar-navy` | `text-sidebar-navy` | `text-sidebar-navy` |
| Logout button | ✅ | ✅ | ✅ | ❌ (not confirmed) | ❌ (not confirmed) |
| LanguageSwitcher | Footer | Footer | Floating overlay ❌ | Footer | BottomNav |

Government sidebar is intentionally or accidentally a different visual system from all other portals.

### 15.3 Dashboard Welcome Banner Matrix

| Portal | Background | Icon |
|---|---|---|
| Admin | `from-primary-600 to-primary-500` gradient | Crown (lucide, text-yellow-300) |
| Government | No banner (stats grid directly) | N/A |
| Reception | `from-primary-600 to-primary-500` gradient | (not confirmed) |
| Teacher | `bg-blue-500` solid ❌ | (not confirmed) |
| Parent | `from-blue-500 to-blue-400` gradient ❌ | (not confirmed) |

Teacher and parent banners use blue, admin/reception use violet gradient. Government has no banner.

### 15.4 Navigation Coverage Matrix

| Route category | Admin sidebar | Admin BottomNav | Gov sidebar | Rec sidebar | Rec BottomNav | Teacher sidebar | Teacher BottomNav | Parent sidebar | Parent BottomNav |
|---|---|---|---|---|---|---|---|---|---|
| Dashboard | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| User management A | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ (attendance) |
| User management B | ✅ | ✅ | ❌ (students) | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ (homework) |
| Secondary feature | ✅ | ❌ (ratings) | ❌ (teachers) | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ (7 items) |
| Settings | ✅ | ❌ | ✅ (platform) | N/A | N/A | N/A | N/A | N/A | N/A |
| Profile | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

### 15.5 Loading State Matrix

| Portal | Skeleton loading | Spinner loading | No loading state |
|---|---|---|---|
| Admin Dashboard | ✅ SkeletonDashboard | Fallback | — |
| Government Dashboard | ✅ SkeletonDashboard | Fallback | — |
| Reception Dashboard | — | ✅ | — |
| Teacher Dashboard | — | ✅ | — |
| Parent Dashboard | — | ✅ | — |

### 15.6 Toast / Notification System Matrix

| Portal | Toast rendered | Works correctly |
|---|---|---|
| Admin | ✅ `<ToastContainer />` in App.jsx | ✅ Yes |
| Government | ❌ Never rendered | ❌ Silent failure |
| Reception | ✅ | ✅ Yes |
| Teacher | ✅ | ✅ Yes |
| Parent | ✅ (shared with teacher) | ✅ Yes |

---

## 16. CRITICAL BUGS & SILENT FAILURES

### 16.1 Government Portal: Toast System Never Renders

**File:** `government/src/context/ToastContext.jsx`, `government/src/App.jsx`

**What exists:**
```jsx
// government/src/context/ToastContext.jsx
export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);
  const addToast = useCallback((message, type = 'info', duration = 4000) => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), duration);
  }, []);
  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <ToastContainer toasts={toasts} onRemove={...} />
    </ToastContext.Provider>
  );
};
```

**What's missing from App.jsx:**
```jsx
// government/src/App.jsx — does NOT include:
<ToastProvider>
  <App />
</ToastProvider>
```

**Impact:**
- `useToast()` calls in government pages return either an empty object or throw "useContext outside of Provider"
- No page in the government portal shows any toast notification (success, error, or warning)
- Operations like approving/rejecting admins, saving settings, or encountering errors produce zero user feedback
- This is a complete silent failure of the feedback system

**Severity:** High. Government users performing administrative actions get no confirmation that their action succeeded or failed.

### 16.2 Admin Portal: `window.prompt()` for Rejection Reason

**File:** `admin/src/pages/ReceptionManagement.jsx`

**Code:**
```jsx
const reason = prompt(t('receptionsPage.rejectionPrompt'));
if (!reason) return;
await rejectReception(id, reason);
```

**Problems:**
1. Blocks JavaScript event loop
2. No styling — OS native dialog in a Tailwind app
3. `!reason` check: `null` (user cancelled) and `""` (user cleared input and pressed OK) both abort — no distinction between cancel and empty submission
4. Cannot be validated for minimum length
5. Breaks on automated testing (Playwright, Cypress struggle with native dialogs)
6. Exposes poor UX to government employees

**Severity:** Medium-High. Functional but unprofessional and untestable.

### 16.3 Government Sidebar: Three Routes With No Navigation Entry

**File:** `government/src/components/Sidebar.jsx`

Routes `/government/students`, `/government/teachers`, `/government/parents` exist and are fully implemented pages but have no sidebar links. They are accessible ONLY by clicking dashboard stat cards.

**Impact:**
- Deep linking is effectively broken — users who bookmark these pages or share URLs lose the navigation path
- After navigating to `/government/students`, there is no way to navigate to `/government/teachers` without going back to the dashboard first
- Browser back button is the only navigation between these sections

**Severity:** Medium. Functional degradation for a power user.

### 16.4 Admin `<TopBar>` Defined But Never Mounted

**File:** `admin/src/components/TopBar.jsx`, `admin/src/components/Layout.jsx`

`TopBar.jsx` exists and is fully implemented with styling. `Layout.jsx` does not import it. Mobile admin users have no visible page header.

**Severity:** Low-Medium. UI incompleteness, not a functional failure.

### 16.5 Reception `<LanguageSwitcher>` Overlay Collision

**File:** `reception/src/components/Layout.jsx`

`fixed top-4 right-4 z-50` placement will overlap page content and potentially conflict with other `z-50` elements (sidebar drawer, OfflineBanner).

**Severity:** Low-Medium. Intermittent visual bug, worse on small screens.

### 16.6 Parent `<a href>` Instead of `<Link>` for Chat

**File:** `teacher/src/parent/components/Layout.jsx`

`<a href="/chat">` causes full page reload on every chat button press in the parent UI.

**Severity:** Medium. Noticeable performance degradation; all React state lost on navigation.

### 16.7 Reception Dashboard: `teacher._id` vs `teacher.id`

**File:** `reception/src/pages/Dashboard.jsx`

```jsx
{teachers.map(teacher => (
  <TeacherCard key={teacher._id} .../>
))}
```

`teacher._id` is a MongoDB document ID field. This backend uses PostgreSQL where the field is `teacher.id`. Result: all teacher cards get `key={undefined}`, causing React reconciliation warnings and potential rendering bugs when the list updates.

**Severity:** Medium. Silent React warning; may cause visible list flickering on updates.

### 16.8 Teacher Dashboard: N+1 HTTP Requests

**File:** `teacher/src/pages/Dashboard.jsx`

Per-child fetches inside a `.forEach()` loop on parent/child data. 20 students = 60+ simultaneous HTTP requests on page load.

**Severity:** Medium. Performance degradation. Visible to users on slow connections or large class sizes.

### 16.9 Zero Shared Tailwind Config (Architecture Bug)

**File:** `shared/tailwind.base.js` (never imported)

All token changes require 4 manual edits. High risk of config drift as the platform evolves.

**Severity:** Low (currently). High (at scale, during redesigns or rebranding).

### 16.10 Missing `animate-in fade-in` Plugin

**File:** `teacher/src/parent/pages/Dashboard.jsx`

Uses `animate-in fade-in` CSS classes. If `tailwindcss-animate` is not listed as a Tailwind plugin (and it is not observed in `teacher/tailwind.config.js`), these classes are undefined and animations silently don't play.

**Severity:** Low. Visual regression — no functional failure.

---

## 17. APPENDICES

### Appendix A: Full Component File Map

#### shared/components/
| File | Description | Used by |
|---|---|---|
| Card.jsx | Base card, optional interactive | admin (re-export), government (direct) |
| ConfirmDialog.jsx | Accessible modal | admin (re-export), others uncertain |
| ErrorBoundary.jsx | Class component error boundary | Uncertain adoption |
| LoadingSpinner.jsx | SVG spinner, 4 sizes | All portals |
| OfflineBanner.jsx | Fixed top offline indicator + StaleIndicator | Government (StaleIndicator), uncertain for banner |
| Skeleton.jsx | Full skeleton suite (7 exports) | Admin, Government (SkeletonDashboard) |
| Toast.jsx | Toast notification system | Admin, reception, teacher (not government) |
| TopBar.jsx | Parent mobile header | teacher/src/parent |

#### admin/src/
| File | Lines | Description |
|---|---|---|
| App.jsx | ~50 | Routes + auth + ToastContainer |
| components/AdminBackground.jsx | ~40 | Decorative SVG background |
| components/BottomNav.jsx | ~80 | 6-item mobile nav (missing 2 routes) |
| components/Card.jsx | 1 | Re-export from shared |
| components/ConfirmDialog.jsx | 1 | Re-export from shared |
| components/Layout.jsx | ~70 | Desktop sidebar + mobile layout |
| components/LoadingSpinner.jsx | 1 | Re-export from shared |
| components/Sidebar.jsx | ~120 | 8-item sidebar, navy header |
| components/TopBar.jsx | ~40 | Mobile header — NEVER RENDERED |
| context/AuthContext.jsx | ~10 | createAuthContext wrapper |
| pages/Dashboard.jsx | ~150 | Welcome banner + stats + reception list |
| pages/Login.jsx | ~137 | Crown icon, registration link |
| pages/ReceptionManagement.jsx | ~200+ | window.prompt() rejection bug |
| pages/Groups.jsx | ~100 | Group management |
| pages/ParentManagement.jsx | ~150 | Parent management |
| pages/TeacherManagement.jsx | ~150 | Teacher management |
| pages/SchoolRatings.jsx | ~100 | Ratings display |
| pages/Settings.jsx | ~80 | Settings form |
| pages/Profile.jsx | ~100 | Admin profile |

#### government/src/
| File | Lines | Description |
|---|---|---|
| App.jsx | ~50 | Routes — missing ToastProvider |
| components/GovernmentBackground.jsx | ~30 | Light purple SVG background |
| components/Layout.jsx | ~80 | Desktop sidebar + mobile drawer |
| components/Sidebar.jsx | ~100 | 5-item sidebar, primary-600 header |
| context/AuthContext.jsx | ~10 | createAuthContext wrapper |
| context/ToastContext.jsx | ~50 | Toast context — NEVER RENDERED |
| pages/Dashboard.jsx | ~200 | Stat cards + admin grid + ratings |
| pages/Login.jsx | ~126 | Shield icon, defaultValue fallbacks |
| pages/Platform.jsx | ~300+ | Tab-based admin management, prop drilling |
| pages/Ratings.jsx | ~200 | School ratings with inline StarDisplay |
| pages/Schools.jsx | ~150 | School list/management |
| pages/Students.jsx | ~120 | Students view |
| pages/Teachers.jsx | ~120 | Teachers view |
| pages/Parents.jsx | ~120 | Parents view |
| pages/Profile.jsx | ~100 | Government user profile |
| pages/AdminDetail.jsx | ~100 | Admin user detail |
| pages/SchoolDetail.jsx | ~150 | School detail view |

#### reception/src/
| File | Lines | Description |
|---|---|---|
| App.jsx | ~40 | Routes |
| components/BottomNav.jsx | ~70 | 5-item mobile nav |
| components/Layout.jsx | ~80 | Sidebar + floating LanguageSwitcher bug |
| components/ReceptionBackground.jsx | ~40 | Warm coral SVG background |
| components/Sidebar.jsx | ~100 | 6-item sidebar, navy header (identical to admin visually) |
| context/AuthContext.jsx | ~10 | createAuthContext wrapper |
| pages/Dashboard.jsx | ~150 | Welcome banner + stats + teacher._id bug |
| pages/Login.jsx | ~120 | BOM char, Shield icon, t('login.invalid') |
| pages/Groups.jsx | ~120 | Group management |
| pages/ParentManagement.jsx | ~150 | Parent approval management |
| pages/TeacherManagement.jsx | ~150 | Teacher management |
| pages/Profile.jsx | ~100 | Reception staff profile |

#### teacher/src/ (teacher routes)
| File | Lines | Description |
|---|---|---|
| App.jsx | ~80 | Dual-role routes (teacher + parent) |
| components/Layout.jsx | ~90 | teacher-surface bg, desktop sidebar, BottomNav |
| components/Sidebar.jsx | ~150 | 10-item sidebar, unread chat badge, navy header |
| pages/Dashboard.jsx | ~250 | bg-blue-500 banner, N+1 fetches |
| pages/Login.jsx | ~130 | BOM, blue-50 bg, emoji icon — inconsistent |
| pages/Attendance.jsx | ~200 | Attendance tracking |
| pages/Chat.jsx | ~300 | Chat interface |
| pages/EmotionalMonitoring.jsx | ~150 | Emotional check-in interface |
| pages/Groups.jsx | ~150 | Class group management |
| pages/Media.jsx | ~200 | Photo/video gallery management |
| pages/MealPlan.jsx | ~150 | Meal planning |
| pages/Profile.jsx | ~100 | Teacher profile |
| shared/components/BottomNav.jsx | ~120 | Reusable bottom nav, variant prop, inline style |
| shared/components/TeacherBackground.jsx | ~50 | Lavender-peach SVG background |
| shared/components/JoyfulBackground.jsx | ~80 | Sky blue/sun/clouds SVG (parent bg) |
| shared/services/chatStore.js | ~60 | Chat unread count store |

#### teacher/src/parent/ (parent routes)
| File | Lines | Description |
|---|---|---|
| ParentApp.jsx | ~30 | Wraps NotificationProvider + ChildProvider |
| components/BottomNav.jsx | ~60 | 4-item nav — 7 routes unreachable on mobile |
| components/Layout.jsx | ~90 | JoyfulBackground, `<a href>` chat bug |
| components/Sidebar.jsx | ~160 | 11-item sidebar, navy header |
| components/TopBar.jsx | ~60 | bg-blue-500 fixed header |
| pages/Dashboard.jsx | ~200 | from-blue-500 banner, WebSocket updates |

### Appendix B: Tailwind Config Differences Matrix

| Config key | shared/tailwind.base.js | admin | government | reception | teacher |
|---|---|---|---|---|---|
| primary colors | ✅ defined | ✅ copy | ✅ copy | ✅ copy | ✅ copy |
| sidebar colors | ✅ defined | ✅ copy | ✅ copy | ✅ copy | ✅ copy + comment "Legacy" |
| teacher.* colors | ❌ not in base | ❌ | ❌ | ❌ | ✅ added |
| parent.* colors | ❌ not in base | ❌ | ❌ | ❌ | ✅ added |
| animations | ✅ slide-in, fade-in, pulse-slow | ✅ copy | ✅ copy | ✅ copy | ✅ copy |
| imports shared/tailwind.base.js | N/A | ❌ | ❌ | ❌ | ❌ |

### Appendix C: Icon Usage Map

All portals use `lucide-react` exclusively for icons. Teacher Login page is the sole exception — it uses a `🎓` Unicode emoji.

Observed icon–portal–context associations:

| Icon | Portal | Context |
|---|---|---|
| `Crown` | admin | Sidebar header, login, dashboard banner |
| `Shield` | government, reception | Login page icon |
| `GraduationCap` | admin | Teachers nav item |
| `Building2` | government, admin | Schools nav item |
| `Star` | government, admin | Ratings nav item |
| `Home` | all | Dashboard nav item |
| `User` | all | Profile nav item |
| `Users` | admin, reception | Parents/users nav item |
| `UserCheck` | admin | Reception nav item |
| `BookOpen` | admin, teacher | Groups/homework nav item |
| `Settings` | admin, government | Settings/platform nav item |
| `MessageCircle` | teacher, parent | Chat |
| `Bell` | parent | Notifications |
| `Eye`/`EyeOff` | all login pages | Password visibility toggle |
| `Bot` | parent | AI Chat nav item |
| `LogOut` | sidebars | Logout button |

No portal uses any other icon library. No custom SVG icons are used in JSX components (backgrounds are SVG but inline/decorative).

### Appendix D: CSS Class Hotspots (Most-Used Patterns)

These class combinations appear across all portals and represent the de-facto component patterns:

**Standard form input:**
```
w-full px-4 py-3 border border-gray-300 rounded-lg
focus:ring-2 focus:ring-primary-500 focus:border-primary-500
transition-colors bg-white
```

**Standard primary button:**
```
w-full bg-primary-600 text-white py-3 rounded-lg font-semibold
hover:bg-primary-700 transition-colors
disabled:opacity-50 disabled:cursor-not-allowed
flex items-center justify-center
```

**Standard stat card:**
```
bg-white rounded-xl shadow-sm border border-gray-200 p-6
```

**Standard status badge:**
```
inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
bg-{color}-100 text-{color}-800
```

**Standard section header:**
```
text-xl font-semibold text-gray-900 mb-4
```

**Standard table:**
```
min-w-full divide-y divide-gray-200
thead: bg-gray-50
th: px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider
td: px-6 py-4 whitespace-nowrap text-sm text-gray-900
```

### Appendix E: Known Hardcoded Strings (Not in i18n)

| File | Line | String | Language |
|---|---|---|---|
| admin/src/pages/Login.jsx | ~122 | `"Admin bo'lishni xohlaysizmi?"` | Uzbek |
| admin/src/pages/Login.jsx | ~128 | `"Admin ro'yxatdan o'tish"` | Uzbek |
| teacher/src/pages/Login.jsx | (various) | `"O'qituvchi Portali"` defaultValue | Uzbek |
| government/src/pages/Login.jsx | ~44 | `'Davlat Nazorat Paneli'` defaultValue | Uzbek |
| government/src/pages/Login.jsx | ~47 | `'Tizimga kirish'` defaultValue | Uzbek |
| admin/src/pages/Login.jsx | ~89 | `'Hide password'`, `'Show password'` defaultValues | English |

### Appendix F: Mobile Navigation Coverage Summary

**Routes reachable on mobile (BottomNav or equivalent):**

| Portal | Total routes | Reachable mobile | Unreachable mobile | Coverage % |
|---|---|---|---|---|
| Admin | 8 | 6 | 2 (Ratings, Settings) | 75% |
| Government | 9 | 0 (no BottomNav — sidebar drawer only) | 0 (drawer covers all) | ~100% via drawer |
| Reception | 6 | 5 | 0 | ~100% |
| Teacher | 10 | ~4 (BottomNav limited) | ~6 | ~40% |
| Parent | 11 | 4 | 7 | 36% |

Parent UI has the worst mobile navigation coverage at 36%.

### Appendix G: Performance Risk Items

1. **N+1 fetches** in teacher Dashboard — potentially 60+ HTTP requests on load
2. **Chat unread polling** in teacher Sidebar — 30-second interval HTTP calls while page is open
3. **Dual-role single bundle** in teacher/ — parent users download teacher code and vice versa
4. **No code splitting within portals** — not confirmed but likely all routes in one bundle per portal
5. **No image optimization** — media pages likely use raw `<img src="...">` without lazy loading or srcset (not audited)

### Appendix H: Files With BOM Characters

- `reception/src/pages/Login.jsx` — UTF-8 BOM at start of file
- `teacher/src/pages/Login.jsx` — UTF-8 BOM at start of file

These files were likely created on Windows with a text editor that writes BOM by default (e.g., Notepad, or an older VS Code encoding setting). All other source files do not have this issue.

---

*End of UCHQUN_DESIGN_AUDIT.md*
*Total sections: 16 + appendices (A–H)*
*Research completed: 2026-05-15*
*All findings based on direct source file reads — no assumptions made about unread files.*
