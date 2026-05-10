# Phase 7 v2 — Design System & UI Consistency Verification
**Date:** 2026-05-09  
**Baseline:** `/audit/07-design-system.md` (2026-05-07)  
**Mode:** Read-only verification. No project files modified.

---

## Executive Summary

Of the 13 issues, **0 are verified-fixed**, **2 are partially-fixed**, and **11 are not-fixed**. No tracker item was targeted at the design system. The two partial improvements are:

- **07-001** (government/index.css): `@tailwind base/components/utilities` directives were added — Tailwind now loads correctly in the government app. However, the `:root` still has the Vite default colors (`rgba(0,0,0,0.87)`, `#ffffff`) rather than the correct `bg-gray-50`/`text-gray-900` from the shared template, and the `*:focus-visible` keyboard focus ring rule is still absent.

- **07-013** (three background variants): `JoyfulBackground.jsx` is now imported by `teacher/src/parent/components/Layout.jsx:4` — the parent portal uses it. Two of three backgrounds are now in active use. Only `DecorativeBackground.jsx` (315 lines, ~500 DOM nodes) remains dead.

Everything else — teacher shadow shared directory, government mobile nav gap, Toast ARIA, LanguageSwitcher inconsistency, sidebar color mismatch, shared component hardcoded English, MessageModal i18n bypass, TopBar hardcoded routes, OfflineBanner DOM position, Card keyboard access — is unchanged.

**Phase 7 v2 score: 40/100** (up from 38/100).

---

## Scope

Verification of all 13 issues from `/audit/07-design-system.md`. All evidence from current code at HEAD.

---

## Per-Issue Verification Table

| Issue ID | Original Severity | Verdict | Evidence (file:line at HEAD) | Notes |
|----------|------------------|---------|------------------------------|-------|
| 07-001 | HIGH | **partially-fixed** | `government/src/index.css:1-3,11-12` | `@tailwind base/components/utilities` added; `:root` still has `rgba(0,0,0,0.87)` / `#ffffff`; no `*:focus-visible` rule |
| 07-002 | HIGH | **not-fixed** | `teacher/src/shared/context/`; `teacher/src/shared/components/` | All 4 context files + 10 component files still present in shadow directory |
| 07-003 | HIGH | **not-fixed** | `government/src/components/Layout.jsx` (45 lines) | No `BottomNav` import or render; no `pb-20` bottom padding for mobile |
| 07-004 | MEDIUM | **not-fixed** | `teacher/src/shared/components/DecorativeBackground.jsx` | File still exists (315 lines); no import found in any layout |
| 07-005 | MEDIUM | **not-fixed** | `shared/components/Toast.jsx:23-26` | Emoji icons (✓ ✕ ⚠ ℹ) unchanged; no `role="alert"` or `aria-live` attribute |
| 07-006 | MEDIUM | **not-fixed** | Teacher app — no LanguageSwitcher in Layout or Sidebar | Teacher users still have no language switcher UI at all |
| 07-007 | MEDIUM | **not-fixed** | `government/src/components/Sidebar.jsx:16` | `softNavy: '#7C3AED'` (purple) unchanged; name semantically wrong |
| 07-008 | MEDIUM | **not-fixed** | `shared/components/OfflineBanner.jsx:12`; `ErrorBoundary.jsx:30`; `BottomNav.jsx:5-9` | All three shared components still use hardcoded English strings |
| 07-009 | MEDIUM | **not-fixed** | `admin/src/components/MessageModal.jsx:45,59,88,103`; `MessagesModal.jsx:13` | All Uzbek hardcoded strings unchanged; `'uz-UZ'` locale in MessagesModal unchanged |
| 07-010 | MEDIUM | **not-fixed** | `shared/components/TopBar.jsx:33,49` | `navigate('/notifications')` and `to="/settings"` still hardcoded |
| 07-011 | MEDIUM | **not-fixed** | `government/src/App.jsx:44`; `admin/src/App.jsx:80` | Government OfflineBanner inside AppRoutes; admin OfflineBanner inside BrowserRouter but outside AppRoutes — same inconsistency |
| 07-012 | LOW | **not-fixed** | `shared/components/Card.jsx` | No `role="button"`, `tabIndex`, or `onKeyDown` when `onClick` is provided |
| 07-013 | LOW | **partially-fixed** | `teacher/src/parent/components/Layout.jsx:4,13` | `JoyfulBackground` now imported and rendered by parent portal layout; `TeacherBackground` used by teacher layout; `DecorativeBackground` still unused |

**Verdict distribution: 0 verified-fixed · 2 partially-fixed · 11 not-fixed**

---

## Detailed Findings

### 07-001 — government/index.css (partially-fixed)

`government/src/index.css` (current):
```css
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  font-family: Inter, system-ui, Avenir, Helvetica, Arial, sans-serif;
  line-height: 1.5;
  color-scheme: light dark;
  color: rgba(0, 0, 0, 0.87);
  background-color: #ffffff;
  ...
}
body {
  margin: 0;
  min-width: 320px;
  min-height: 100vh;
}
```

**Fixed:** `@tailwind base; @tailwind components; @tailwind utilities;` now present. Tailwind utility classes load correctly in the government app.

**Still broken:**
1. `:root` has `color: rgba(0,0,0,0.87); background-color: #ffffff;` instead of the shared template's `body { @apply bg-gray-50 text-gray-900; }`. Subtle but inconsistent base appearance.
2. **No `*:focus-visible` rule** — the keyboard focus ring (`outline-2 outline-offset-2 outline-primary-500`) is still absent in the government app. Keyboard navigation produces no visible focus indicator. This is the accessibility regression noted in the original audit.

The correct reference template (admin/reception/teacher):
```css
@tailwind base; @tailwind components; @tailwind utilities;
body { @apply bg-gray-50 text-gray-900; }
*:focus-visible { @apply outline-2 outline-offset-2 outline-primary-500; }
.line-clamp-2 { ... }
```

---

### 07-002 — Teacher shadow shared directory (not-fixed)

`teacher/src/shared/` still contains all duplicate files at HEAD:

| File | Still present |
|------|--------------|
| `context/ToastContext.jsx` | ✓ |
| `context/AuthContext.jsx` | ✓ |
| `context/NotificationContext.jsx` | ✓ |
| `context/SocketContext.jsx` | ✓ |
| `components/Toast.jsx` | ✓ |
| `components/BottomNav.jsx` | ✓ |
| `components/Card.jsx` | ✓ |
| `components/LoadingSpinner.jsx` | ✓ |
| `components/DecorativeBackground.jsx` | ✓ |
| `components/JoyfulBackground.jsx` | ✓ |
| `components/TeacherBackground.jsx` | ✓ |
| `components/TopBar.jsx` | ✓ |
| `components/ConfirmDialog.jsx` | ✓ (may be new — not in original count) |
| `components/DecorativeElements.jsx` | ✓ |
| `components/ProtectedRoute.jsx` | ✓ |

The shadow directory has grown since the original audit (ConfirmDialog and DecorativeElements are new additions). Any fix to a shared context or component still requires manual replication.

---

### 07-003 — Government mobile navigation (not-fixed)

`government/src/components/Layout.jsx` (45 lines, unchanged):
```jsx
<div className="min-h-screen flex bg-gray-50">
  <div className="hidden lg:block fixed ..."> <GovernmentSidebar /> </div>
  <main className="flex-1 lg:ml-64 ...">
    <GovernmentBackground />
    <Outlet />
  </main>
</div>
```

No `BottomNav` import, no mobile nav render, no bottom padding for mobile. Government users on viewports below 1024px have no navigation UI.

---

### 07-005 — Toast ARIA (not-fixed)

`shared/components/Toast.jsx:23-26`:
```js
success: '✓',
error: '✕',
warning: '⚠',
info: 'ℹ',
```

Plain text emoji icons unchanged. No `role="alert"` or `role="status"` or `aria-live` attributes added. Screen readers remain silent on all toast notifications.

---

### 07-008 — Shared components English-only (not-fixed)

`shared/components/OfflineBanner.jsx:12`:
```jsx
You are offline. Some data may be outdated.
```

`shared/components/ErrorBoundary.jsx:30`:
```jsx
<p className="text-lg font-semibold text-gray-800">Something went wrong</p>
```

`shared/components/BottomNav.jsx:5-9`:
```js
{ name: 'Home', href: '/', icon: Home },
{ name: 'Activities', href: '/activities', icon: Calendar },
{ name: 'Media', href: '/media', icon: ImageIcon },
{ name: 'Profile', href: '/child', icon: User },
{ name: 'Help', href: '/help', icon: HelpCircle },
```

All three shared components render hardcoded English strings. `BottomNav` now has `aria-label={item.name}` and `aria-current` — accessibility was improved, but the label strings themselves remain English-only and cannot be translated.

---

### 07-013 — Background variants (partially-fixed)

**Changed:** `teacher/src/parent/components/Layout.jsx:4,13`:
```jsx
import JoyfulBackground from '../../shared/components/JoyfulBackground';
...
<JoyfulBackground />
```

`JoyfulBackground` is now used by the parent portal layout. `TeacherBackground` is used by the teacher layout. The "three backgrounds, one used" problem is now "three backgrounds, one unused."

**Still dead:** `teacher/src/shared/components/DecorativeBackground.jsx` (315 lines, ~500 DOM nodes) — no import found in any layout file at HEAD. This is the issue described in 07-004 (DOM bomb) as well. The file adds 315 lines of dead complexity.

---

## Metrics Scorecard

| Metric | Original v1 Score | v2 Score | Delta | Drivers |
|--------|------------------|----------|-------|---------|
| Messiness | 48% | 49% | +1 | (1) JoyfulBackground now used — one fewer dead file; (2) teacher shadow directory unchanged |
| Technical Debt | 45% | 46% | +1 | (1) JoyfulBackground now active (intentional dual-background design confirmed); (2) DecorativeBackground still 315-line dead code; (3) teacher shadow dir unchanged |
| Health | 42% | 44% | +2 | (1) Tailwind loads correctly in government app now; (2) government focus ring still absent — accessibility regression persists |
| Coherence | 38% | 38% | 0 | (1) OfflineBanner DOM positions unchanged; (2) Sidebar softNavy name/value still semantically wrong; (3) LanguageSwitcher inconsistency unchanged |
| Documentation Coverage | 25% | 25% | 0 | No change |
| Test Coverage | 20% | 20% | 0 | No change |
| Risk-on-Touch | 52% | 52% | 0 | (1) Teacher local-shared still means every shared fix requires manual replication |
| Cross-App Consistency | 35% | 36% | +1 | (1) Background strategy more intentional (parent vs teacher portal); (2) Government still no mobile nav; (3) LanguageSwitcher still inconsistent |
| **Overall** | **38%** | **40%** | **+2** | |

---

## Open Questions (from v1, updated)

1. **Government focus ring:** The accessibility regression (no `*:focus-visible` rule) persists after the partial CSS fix. This is a 2-line addition that was not made.
2. **Government mobile nav:** Still no `BottomNav` for viewports < 1024px.
3. **Teacher shadow shared:** Is the intent to eventually merge into monorepo shared, or keep the local variant permanently? This determines whether fixes to shared contexts need to be applied in two places indefinitely.
4. **JoyfulBackground vs TeacherBackground:** Now confirmed intentional (parent portal vs teacher portal). Not a dead-code concern for JoyfulBackground. DecorativeBackground remains undocumented dead code.
5. **BottomNav i18n:** The `aria-label` improvement is present but strings are still English-only — localization gap for screen reader users.

---

## What I Did NOT Look At

- Full teacher Layout.jsx (only checked for BottomNav + background)
- All admin modal files beyond MessageModal and MessagesModal
- Whether government ConfirmDialog component is shared or local
- Full TopBar.jsx (only grep'd for route strings)
- `DecorativeElements.jsx` content — whether it's a dependency of DecorativeBackground or standalone
