# Phase 7 — Design System & UI Consistency Audit
## Scope: `shared/`, all four app layouts, sidebars, navigation, backgrounds, modals

> Audit only — no modifications to project files.
> All file references include path + line range.

---

## Scorecard

| Metric | Score | Notes |
|--------|-------|-------|
| Messiness | 48/100 | Teacher shadow-shared dir, LanguageSwitcher scattershot, 3 background variants |
| Technical Debt | 45/100 | DecorativeBackground 170-node DOM bomb, duplicate contexts, government mobile nav absent |
| Health | 42/100 | `government/index.css` broken, no keyboard focus ring on government app, hardcoded modal strings |
| Coherence | 38/100 | Teacher is an isolated island; Sidebar navy vs. purple mismatch; OfflineBanner in different DOM positions |
| Documentation Coverage | 25/100 | No explanation of why teacher duplicates shared; no design token docs |
| Test Coverage | 20/100 | Zero visual regression tests for shared components; shared component behavior untested across apps |
| Risk-on-Touch | 52/100 | Teacher local-shared means any fix to shared context must be manually replicated |
| Cross-App Consistency | 35/100 | LanguageSwitcher in 3 different positions; BottomNav absent from government mobile; Logout button in 1 of 4 sidebars |
| **Overall** | **38/100** | |

---

## 1. Token Layer — What Works

**Tailwind config:** All four apps extend an identical `baseTheme` from [`shared/tailwind.base.js`](shared/tailwind.base.js). The config is consistent:

```js
// shared/tailwind.base.js — purple scale, shared animations
export const baseTheme = {
  extend: {
    colors: { primary: { 50: '#f5f3ff', ..., 500: '#8b5cf6', ..., 900: '#4c1d95' } },
    animation: { 'slide-in': '...', 'fade-in': '...', 'pulse-slow': '...' },
    keyframes: { ... }
  }
};
```

Each of `admin/tailwind.config.js`, `teacher/tailwind.config.js`, `reception/tailwind.config.js`, `government/tailwind.config.js` is identical: `content: [...]`, `theme: { ...baseTheme }`, `plugins: []`. This is the healthiest layer of the design system.

**App-level component re-exports:** Admin, reception, and government each have thin 1-line re-exports for `Card`, `LoadingSpinner`, and `Toast` from `@shared/components/`. These work correctly and prevent drift at the component API level for those three apps.

---

## 2. Issues Found

### Issue 07-001 — HIGH: `government/index.css` Uses Vite Default Template

[`government/index.css`](government/index.css) is the old Vite default CSS, not the shared Tailwind bootstrap used by the other three apps.

**Government** (wrong):
```css
:root { color-scheme: light dark; color: rgba(0,0,0,0.87); background-color: #ffffff; }
body { margin: 0; min-height: 100vh; }
```

**Admin / Reception / Teacher** (correct):
```css
@tailwind base; @tailwind components; @tailwind utilities;
body { @apply bg-gray-50 text-gray-900; }
*:focus-visible { @apply outline-2 outline-offset-2 outline-primary-500; }
.line-clamp-2 { overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
```

Three consequences:
1. **Base background**: Government app uses `#ffffff` instead of `bg-gray-50`. The visual difference is subtle but inconsistent.
2. **Base text color**: `rgba(0,0,0,0.87)` instead of `text-gray-900` (#111827). Different contrast ratio.
3. **No keyboard focus ring**: The `*:focus-visible` ring from `outline-primary-500` is absent. Keyboard navigation in the government app produces no visible focus indicator — an accessibility regression.

---

### Issue 07-002 — HIGH: Teacher App Maintains a Shadow `src/shared/` Directory

[`teacher/src/shared/`](teacher/src/shared/) is a parallel "shared" library local to the teacher app. It contains:

| File | Status vs. monorepo shared |
|------|---------------------------|
| `context/ToastContext.jsx` | Duplicate — identical API (`success`, `error`, `warning`, `info`) |
| `context/AuthContext.jsx` | Teacher-specific variant |
| `context/NotificationContext.jsx` | Duplicate |
| `context/SocketContext.jsx` | Teacher-specific |
| `services/api.js` | **Thin wrapper** — correctly delegates to `@shared/services/api` |
| `services/chatStore.js` | Teacher-specific (parent chat unread count) |
| `components/Toast.jsx` | Near-duplicate — container positioned at `top-20` vs. monorepo's `top-4` |
| `components/BottomNav.jsx` | Extended version — adds `variant`, `allowed`, `showExit`, `showLanguageSwitcher` props |
| `components/Card.jsx`, `LoadingSpinner.jsx`, `TopBar.jsx` | Duplicates |
| `components/TeacherBackground.jsx` | Teacher-specific SVG background |
| `components/DecorativeBackground.jsx` | 315-line DOM-based background (see Issue 07-004) |
| `components/JoyfulBackground.jsx` | Unused third background variant |

`teacher/src/components/Layout.jsx:3` imports `BottomNav` from `'../shared/components/BottomNav'` (the local version), not from `@shared`. This is intentional — the local BottomNav supports richer props (`variant`, `allowed`, `showExit`). However, this means:

1. **Two ToastContexts in scope** for the teacher build. If a component unknowingly imports from `@shared/context/ToastContext`, it will get a different context instance than `teacher/src/shared/context/ToastContext`.
2. **Any fix to `shared/context/ToastContext.jsx` must be manually replicated** in `teacher/src/shared/context/ToastContext.jsx`. They will silently drift.
3. Teacher `Toast.jsx` positions at `top-20` (line 51) while shared `Toast.jsx` positions at `top-4`. No visual alignment rationale documented.

---

### Issue 07-003 — HIGH: Government Mobile Navigation Is Missing

[`government/src/components/Layout.jsx`](government/src/components/Layout.jsx) (45 lines) has no `BottomNav` component for mobile. The layout structure is:

```jsx
<div className="min-h-screen flex bg-gray-50">
  <div className="hidden lg:block fixed ..."> <GovernmentSidebar /> </div>
  <main className="flex-1 lg:ml-64 ...">
    <GovernmentBackground />
    <Outlet />
  </main>
</div>
```

On viewports below `lg` (1024px), the sidebar is hidden and no bottom navigation replaces it. Government users on tablet or phone have no navigation UI after the initial page load — they are stranded unless they use the browser back button or type a URL manually.

Contrast with the other apps:
- **Admin** [`admin/src/components/Layout.jsx:34–42`](admin/src/components/Layout.jsx#L34): `<div className="lg:hidden fixed bottom-0 ..."><BottomNav /></div>` + `pb-20 lg:pb-6` bottom padding
- **Reception** [`reception/src/components/Layout.jsx`](reception/src/components/Layout.jsx): same mobile BottomNav + bottom padding
- **Teacher** [`teacher/src/components/Layout.jsx:28–37`](teacher/src/components/Layout.jsx#L28): `<div className="lg:hidden fixed bottom-0 ..."><BottomNav .../></div>` + `pb-24`

Government's `main` element has no bottom padding for mobile, so content also runs into the screen edge.

---

### Issue 07-004 — MEDIUM: `DecorativeBackground.jsx` Renders ~170 DOM Nodes

[`teacher/src/shared/components/DecorativeBackground.jsx`](teacher/src/shared/components/DecorativeBackground.jsx) (315 lines) is a fixed-position decorative background implemented as 170+ absolutely-positioned `<div>` elements (bears, cars, stars, bubbles). Sample from the source:

```js
const decorativeElements = [
  { type: 'bear', top: 10, left: 20, size: 50, rotation: -15 },
  { type: 'bear', top: 150, left: 80, size: 45, rotation: 20 },
  // ... 168 more entries
];
```

Each element renders 2–4 nested divs with inline styles. Total DOM nodes: approximately 500–700. The other apps use single inline `<svg>` elements for their backgrounds (`AdminBackground`, `GovernmentBackground`, `TeacherBackground`), which paint as a single composited layer and add exactly 1 DOM node.

The `DecorativeBackground` is additionally **unused** in the current teacher layout — `Layout.jsx:13` imports and renders `<TeacherBackground />` (the SVG version). `DecorativeBackground` appears to be leftover from an earlier prototype. Three background variants exist for the teacher app (`TeacherBackground.jsx`, `DecorativeBackground.jsx`, `JoyfulBackground.jsx`) with no documentation about which is canonical.

---

### Issue 07-005 — MEDIUM: Toast Lacks Accessibility Attributes

[`shared/components/Toast.jsx`](shared/components/Toast.jsx) renders transient notifications with no ARIA live region:

```jsx
<div className={`${bgColor} text-white px-6 py-4 rounded-lg ...`}>
  <span className="text-xl mr-3">{icons}</span>  {/* plain emoji: ✓ ✕ ⚠ ℹ */}
  <p className="font-medium">{message}</p>
</div>
```

Missing: `role="alert"` (for errors) or `role="status"` / `aria-live="polite"` (for success/info). Screen readers will not announce these notifications. The icon set uses plain text emoji instead of lucide-react icons used everywhere else in the application.

The `ToastContainer` is positioned `fixed top-4 right-4`. The teacher app's duplicate `Toast.jsx` positions at `top-20` — so the same notification appears in a different position depending on which app is rendering it.

---

### Issue 07-006 — MEDIUM: LanguageSwitcher Placement Is Inconsistent

The four apps handle the LanguageSwitcher in three different ways:

| App | LanguageSwitcher location |
|-----|--------------------------|
| Reception | [`reception/src/components/Layout.jsx`](reception/src/components/Layout.jsx) — floating `fixed top-4 right-4 z-50` in Layout |
| Admin | `admin/src/pages/Settings.jsx` only — hidden in settings page, not persistent |
| Government | `government/src/pages/Settings.jsx` only — same as admin |
| Teacher | Not found in any page or layout |

Reception users can switch language from any page. Admin and government users must navigate to Settings. Teacher users have no language switcher UI at all (despite all four apps shipping translations for UZ/RU/EN).

---

### Issue 07-007 — MEDIUM: Sidebar Color Themes Diverge

All four sidebars copy the same `COLORS` object, but government changed the `softNavy` value:

| App | `COLORS.softNavy` | Header color |
|-----|-------------------|-------------|
| Admin ([`admin/src/components/Sidebar.jsx:14`](admin/src/components/Sidebar.jsx#L14)) | `'#2E3A59'` — dark navy | Navy header, no logout |
| Reception ([`reception/src/components/Sidebar.jsx:15`](reception/src/components/Sidebar.jsx#L15)) | `'#2E3A59'` — dark navy | Navy header, no logout |
| Teacher ([`teacher/src/components/Sidebar.jsx:20`](teacher/src/components/Sidebar.jsx#L20)) | `'#2E3A59'` — dark navy | Navy header, no logout |
| Government ([`government/src/components/Sidebar.jsx`](government/src/components/Sidebar.jsx)) | `'#7C3AED'` — `primary-600` purple | Purple header, **has logout** |

The color variable is named `softNavy` in all four files, but its value is purple (#7C3AED) in government. The name has become semantically wrong. The Logout button asymmetry means government users can log out from the sidebar footer, while admin/reception/teacher users must navigate to Settings.

---

### Issue 07-008 — MEDIUM: Shared Components Have Hardcoded English Strings

Three shared components serve all 4 apps but are English-only:

- [`shared/components/OfflineBanner.jsx`](shared/components/OfflineBanner.jsx): `"You are offline. Some data may be outdated."` — no `t()` call
- [`shared/components/ErrorBoundary.jsx`](shared/components/ErrorBoundary.jsx): `"Something went wrong"` — no `t()` call
- [`shared/components/BottomNav.jsx`](shared/components/BottomNav.jsx): Navigation labels `"Home"`, `"Activities"`, `"Media"`, `"Profile"`, `"Help"` — hardcoded English

The platform primary language is Uzbek; all app-specific UI uses `t()`. These shared components are the only user-visible text that cannot be translated.

---

### Issue 07-009 — MEDIUM: `admin/MessageModal.jsx` and `MessagesModal.jsx` Bypass i18n

[`admin/src/components/MessageModal.jsx`](admin/src/components/MessageModal.jsx) (113 lines) uses hardcoded Uzbek throughout:
- Line 44: `"Davlatga xabar yuborish"` (modal title)
- Line 59: `"Mavzu"`, `"Xabar"` (field labels)
- Line 60: `"Xabar mavzusi..."` (placeholder)
- Lines 82, 90: `"Bekor qilish"`, `"Yuborish"` (button labels)

[`admin/src/components/MessagesModal.jsx`](admin/src/components/MessagesModal.jsx) (87 lines) similarly:
- Line 13: `"Mening xabarlarim"` (modal title)
- Line 26: `"Hozircha xabarlar yo'q"` (empty state)
- Lines 53–54: `"Sizning xabaringiz:"` (section label)
- Line 63: `"Davlat javobi"` (reply section label)
- Line 46, 65: `toLocaleDateString('uz-UZ', ...)` — locale hardcoded in component

Both modals compose the primary admin-to-government messaging workflow. None of the strings use `t()`.

---

### Issue 07-010 — MEDIUM: `shared/TopBar.jsx` Hardcodes Non-Universal Routes

[`shared/components/TopBar.jsx`](shared/components/TopBar.jsx) hardcodes two navigation destinations:

```jsx
<Link to="/notifications"><Bell /></Link>
<Link to="/settings"><Settings /></Link>
```

The `/notifications` and `/settings` paths exist in some apps but may not exist in all. When `TopBar` is consumed by an app that doesn't define these routes, clicking the bell or gear icon silently navigates to a blank/404 page with no feedback to the user.

---

### Issue 07-011 — MEDIUM: `OfflineBanner` DOM Position Differs Across Apps

- Government [`government/src/App.jsx`](government/src/App.jsx): `OfflineBanner` is inside `AppRoutes` → inside the `<Router>` — it mounts and unmounts with route changes
- Admin [`admin/src/App.jsx`](admin/src/App.jsx), reception [`reception/src/App.jsx`](reception/src/App.jsx): `OfflineBanner` is outside `AppRoutes` — it persists across all routes

Same component, different behavior when navigating. In government, a user who goes offline and then navigates may briefly lose the banner during route transitions.

---

### Issue 07-012 — LOW: `shared/components/Card.jsx` Lacks Keyboard Accessibility

[`shared/components/Card.jsx`](shared/components/Card.jsx):

```jsx
const Card = ({ children, className = '', onClick }) => (
  <div
    className={`bg-white rounded-2xl shadow-sm ... ${onClick ? 'cursor-pointer hover:shadow-md' : ''} ${className}`}
    onClick={onClick}
  >
    {children}
  </div>
);
```

When `onClick` is provided, the card becomes visually interactive but adds no `role="button"`, no `tabIndex={0}`, and no `onKeyDown` handler. Keyboard-only users cannot activate clickable cards.

---

### Issue 07-013 — LOW: Three Background Variants for Teacher, One Used

The teacher app ships three background components:

| Component | Lines | Type | Used in Layout? |
|-----------|-------|------|-----------------|
| [`teacher/src/shared/components/TeacherBackground.jsx`](teacher/src/shared/components/TeacherBackground.jsx) | 111 | SVG | ✅ Yes (Layout:13) |
| [`teacher/src/shared/components/DecorativeBackground.jsx`](teacher/src/shared/components/DecorativeBackground.jsx) | 315 | 170+ divs | ❌ No |
| [`teacher/src/shared/components/JoyfulBackground.jsx`](teacher/src/shared/components/JoyfulBackground.jsx) | ~100 | SVG | ❌ No |

`DecorativeBackground` and `JoyfulBackground` are dead code. They add ~430 lines and a confusing choice between three visual themes that a developer touching the layout must resolve manually.

---

## 3. Issue Summary

| Issue | Severity | Location | Description |
|-------|----------|----------|-------------|
| `government/index.css` wrong template — no focus ring | HIGH | government/index.css | Missing Tailwind base, no `*:focus-visible` ring, different base colors |
| Teacher local `src/shared/` shadow library | HIGH | teacher/src/shared/ | Duplicates ToastContext, components; fixes must be applied twice |
| Government mobile nav absent | HIGH | government/Layout.jsx | No `BottomNav` on mobile — government users stranded below 1024px |
| `DecorativeBackground` 170-node DOM bomb | MEDIUM | teacher/src/shared/components/DecorativeBackground.jsx | ~500 DOM nodes for decorative background; currently unused |
| Toast missing ARIA live region + emoji icons | MEDIUM | shared/components/Toast.jsx | No `role="alert"`, screen readers silent; emoji instead of lucide |
| LanguageSwitcher inconsistent placement | MEDIUM | reception/Layout.jsx, admin/Settings.jsx, government/Settings.jsx | Different accessibility by role; teacher has no language switcher |
| Sidebar color mismatch (`softNavy` = purple in government) | MEDIUM | government/Sidebar.jsx | Misleading variable name; visual inconsistency with other apps |
| Shared OfflineBanner/ErrorBoundary/BottomNav English-only | MEDIUM | shared/components/ | User-visible strings in 3 shared components can't be translated |
| MessageModal / MessagesModal bypass i18n | MEDIUM | admin/src/components/ | All strings hardcoded Uzbek; `'uz-UZ'` locale hardcoded |
| `shared/TopBar` hardcodes `/notifications`, `/settings` | MEDIUM | shared/components/TopBar.jsx | Routes may not exist in all apps |
| `OfflineBanner` in different DOM positions | MEDIUM | admin, reception, government App.jsx | Inside vs. outside Router — different remount behavior |
| `Card` not keyboard-accessible when `onClick` provided | LOW | shared/components/Card.jsx | No `role="button"`, `tabIndex`, or `onKeyDown` |
| Three background variants for teacher app | LOW | teacher/src/shared/components/ | 2 of 3 are dead code; adds 430 lines of confusion |

**Total: 3 HIGH · 8 MEDIUM · 2 LOW = 13 issues**

---

## 4. What's Actually Good

- **Tailwind token layer**: Single source of truth in `shared/tailwind.base.js`. All four apps extend it identically. Purple primary scale is consistent everywhere Tailwind utility classes are used.
- **Component re-exports (admin, reception, government)**: `Card.jsx`, `LoadingSpinner.jsx`, `Toast.jsx` in these three apps are 1-line re-exports — they can't drift from the shared versions.
- **`shared/components/LoadingSpinner.jsx`**: Proper a11y (`role="status"`, `aria-label`, `sr-only` text). Size variants (sm/md/lg/xl). Uses `border-primary-200 / border-t-primary-600` from the token layer.
- **`shared/components/Skeleton.jsx`**: Well-designed skeleton library (`SkeletonLine`, `SkeletonCard`, `SkeletonTable`, `SkeletonStat`, `SkeletonDashboard`, `SkeletonList`). The primitives exist and are correct — they just need wider adoption.
- **Teacher local `BottomNav` props API**: The teacher-specific BottomNav correctly adds `variant`, `allowed`, and `showExit` props to support limited-access screens. The extension is well-reasoned, even if the isolation mechanism (duplicating shared/) is costly.
- **Admin `MessageModal.jsx`**: Correctly uses `const { success, error: showError } = useToast()` (not the broken `showToast` pattern from Phase 5), and posts to the correct `/admin/message-to-government` endpoint.
