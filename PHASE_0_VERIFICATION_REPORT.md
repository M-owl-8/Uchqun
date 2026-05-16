# Phase 0 Verification Report
Generated: 2026-05-16T05:30Z
Verifier: Claude Code (terminal, read-only audit)

---

## Verdict

⚠️ MOSTLY COMPLETE — with 3 blocking gaps

Phase 0A (Demolition) and 0B (Foundation) are substantially done. Phase 0C (Stripping) is complete for admin, reception, and teacher pages but the government portal's `components/tabs/` sub-components were never stripped and also have a broken `Card` import that crashes tests. Most critically, **all four production builds fail** due to wrong relative paths in i18n.js files introduced in the Phase 0 completion commit. The cleanup log incorrectly declares Phase 0 complete.

---

## Section 1 — Phase 0A: Demolition

### 1.1 `window.prompt()` removal
**Status: ❌ FAIL**
Evidence:
```
admin/src/pages/reception/ReceptionDetailPanel.jsx:137:
    const reason = prompt(t('receptionsPage.rejectionPrompt'));
```
One `prompt()` call remains. It captures a rejection reason for document approval. This needs a proper modal replacement.

---

### 1.2 Unrendered `<TopBar>` deletion (admin)
**Status: ✅ PASS**
Evidence: `ls -la admin/src/components/TopBar.jsx` → `No such file or directory`. No references to `TopBar` in `admin/src` at all. File correctly deleted.

Note: A `TopBar.jsx` exists in `shared/components/` but has **0 portal consumers** — dead weight (see 5.4).

---

### 1.3 Government Toast wiring
**Status: ✅ PASS**
Evidence from `government/src/App.jsx`:
```
line 8:  import { ToastProvider } from '@shared/context/ToastContext';
line 9:  import { ToastContainer } from '@shared/components/Toast';
line 82:     <ToastProvider>
line 85:       <ToastContainer />
line 86:     </ToastProvider>
```
`<ToastProvider>` wraps the routed app. `<ToastContainer>` renders toasts inside it.

---

### 1.4 `<a href>` for internal navigation in parent
**Status: ✅ PASS**
Evidence: All three grep patterns (`'<a href="/'`, `'<a href={\`/'`, `"<a href='/"`) returned zero matches in `teacher/src/parent`. Parent uses `<Link>` from `react-router-dom` exclusively for internal navigation.

---

### 1.5 `._id` (MongoDB leftover) cleanup
**Status: ⚠️ PARTIAL**
Evidence:
```
admin/src/pages/Dashboard.jsx:198:  <div key={reception.id || reception._id || `reception-${index}`}
admin/src/pages/Dashboard.jsx:217:  to={`/admin/receptions/${reception.id || reception._id}`}
```
Two occurrences remain as a defensive fallback pattern (`id || _id`). The primary key is `id`; `_id` is a legacy guard. Not a runtime failure, but the fallback is unnecessary noise given the PostgreSQL-only backend.

---

### 1.6 UTF-8 BOM in source files
**Status: ✅ PASS**
PowerShell BOM scan across all portal src directories returned zero results. No BOM-encoded files detected.

---

### 1.7 `lang="uz"` on all four portal HTML files
**Status: ✅ PASS**
Evidence:
```
admin/index.html:2:     <html lang="uz">
government/index.html:2:<html lang="uz">
reception/index.html:2: <html lang="uz">
teacher/index.html:2:   <html lang="uz">
```
All four portals correctly set.

---

### 1.8 Blue color leakage in teacher and parent (action UI)
**Status: ✅ PASS**
Evidence — remaining blue usages in teacher:
```
teacher/src/pages/Meals.jsx:192:       Lunch: { color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100' }
teacher/src/pages/Meals.jsx:194:       Dinner: { color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100' }
teacher/src/parent/pages/Meals.jsx:107: Lunch: same
teacher/src/parent/pages/Meals.jsx:109: Dinner: same
```
Category: **SEMANTIC_DATA** — these are meal-type data-visualization colors for Lunch/Dinner icons, not action UI. All four occurrences are accompanied by:
```js
// TODO(phase-1): data color palette decision needed — Lunch/Dinner use blue-* as semantic
//   meal-type colors; confirm these should stay blue (not primary-*) or define a dedicated
//   food-color token
```
Annotated and deferred correctly.

---

### 1.9 Hardcoded Uzbek strings in JSX
**Status: ⚠️ PARTIAL**
Most Uzbek strings are inside `t(key, { defaultValue: '...' })` — that's acceptable as i18n fallback text. However one exception:

```
admin/src/pages/Login.jsx:122: Admin bo&apos;lishni xohlaysizmi?
```
This is raw JSX text, not wrapped in `t(...)`. A genuine bare hardcoded string.

All other flagged strings (`Davlat`, `O'qituvchi`, `qabul`, `kirish`) are inside `t()` fallback `defaultValue` arguments — technically still hardcoded values but behind the i18n system, so acceptable per the convention used throughout the codebase.

---

### 1.10 Inline `style={{...}}` overrides
**Status: ✅ PASS**
All `style={{}}` occurrences are justified:
- `AdminBackground.jsx`, `GovernmentBackground.jsx`, `ReceptionBackground.jsx`, `JoyfulBackground.jsx`, `TeacherBackground.jsx`: SVG positioning (`position: absolute`, `zIndex: 0`) — CSS-in-JS is necessary here; Tailwind cannot encode arbitrary SVG dimensions.
- `VideoPlayer.jsx`, `parent/Media.jsx`: `border: 'none'` on `<iframe>` — browser default that Tailwind `border-0` would not fully cover in all browsers.
- `BottomNav.jsx:41`: `style={{ minHeight: isTop ? '68px' : '64px' }}` — dynamic computed value.
- `Ratings.jsx:56`: `style={{ width: \`${pct}%\` }}` — dynamic computed percentage.
None are static style overrides that should be replaced with Tailwind classes.

---

### 1.11 Emoji icons in component code
**Status: ✅ PASS**
Grep for non-ASCII characters across all portal JSX found no emoji in component code. All icons use `lucide-react`.

---

### 1.12 Favicon placeholder check
**Status: ⚠️ PARTIAL**
Evidence:
```
admin/index.html:5:    <!-- TODO(phase-1): replace placeholder /vite.svg with branded favicon -->
admin/index.html:6:    <link rel="icon" ... href="/vite.svg" />
reception/index.html:5: <!-- TODO(phase-1): replace placeholder /vite.svg ... -->
reception/index.html:6: <link rel="icon" ... href="/vite.svg" />
government/index.html:5: <link rel="icon" ... href="/vite.svg" />   ← NO TODO comment
teacher/index.html:    (no vite.svg — clean)
```
Admin and reception: properly annotated as deferred to Phase 1. Government: missing the TODO comment but same placeholder. Teacher: clean.

---

### 1.13 Re-export wrapper files
**Status: ✅ PASS**
Evidence:
```
teacher/src/parent/components/Card.jsx:
  export { default } from '../../../../shared/components/Card';

teacher/src/shared/components/Card.jsx:
  export { default } from '../../../../shared/components/Card';

teacher/src/shared/components/ConfirmDialog.jsx:
  export { default } from '@shared/components/ConfirmDialog';
```
These thin re-export wrappers exist to match the relative import paths that parent/teacher pages already used. This is an accepted pattern given the teacher portal's internal shared folder structure. The admin-level wrappers from Phase 0A were deleted.

---

### 1.14 N+1 fetches in teacher Dashboard
**Status: ✅ PASS**
The Dashboard.jsx makes a single batched call to a stats aggregation endpoint (`/dashboard/stats`). The overview cards array is built from the single `stats` response object. No `forEach`/per-student fetch pattern observed. No `TODO(phase-0b)` marker needed or present.

---

### 1.15 Reception floating LanguageSwitcher
**Status: ✅ PASS**
Evidence:
```
reception/src/components/Sidebar.jsx:13: import LanguageSwitcher from './LanguageSwitcher';
reception/src/components/Sidebar.jsx:85:     <LanguageSwitcher />
```
No `fixed top-4 right-4` in `reception/src/components/Layout.jsx`. LanguageSwitcher is rendered inside the sidebar footer as expected.

---

## Section 2 — Phase 0B: Foundation

### 2.1 Shared Tailwind preset adoption
**Status: ✅ PASS**
`shared/tailwind.base.js` exports `basePreset` with:
- `theme.extend.fontFamily.sans: ['Inter', ...]`
- `theme.extend.colors.primary` (violet scale)
- `theme.extend.colors.sidebar` (navy/muted/blue/mint/peach)
- `theme.extend.borderRadius` (card/button/badge/modal)
- `theme.extend.zIndex` (below/dropdown/sticky/overlay/modal/toast)
- `theme.extend.animation` (slide-in/fade-in/pulse-slow)

All four portal `tailwind.config.js` files:
```js
import { basePreset } from '../shared/tailwind.base.js';
export default { presets: [basePreset], content: [...], theme: { extend: {} }, plugins: [] };
```
Teacher config additionally extends with `teacher.*` and `parent.*` color tokens (portal-specific, acceptable).
No portal duplicates the primary scale or sidebar colors.

---

### 2.2 Shared component library completeness
**Status: ✅ PASS**
`shared/components/` contains: Avatar, Badge, Button, Card, Checkbox, ConfirmDialog, EmptyState, ErrorBoundary, Input, LanguageSwitcher, LoadingSpinner, Modal, OfflineBanner, PageHeader, Radio, Select, Skeleton, Table, Tabs, Textarea, Toast, TopBar.

Expected list vs present:
| Component | Present |
|---|---|
| Button | ✅ |
| Input | ✅ |
| Select | ✅ |
| Textarea | ✅ |
| Checkbox | ✅ |
| Radio | ✅ |
| Card | ✅ |
| Badge | ✅ |
| Modal | ✅ |
| ConfirmDialog | ✅ |
| Toast/ToastProvider | ✅ (Toast.jsx + context/ToastContext.jsx) |
| Table | ✅ |
| EmptyState | ✅ |
| Skeleton | ✅ |
| Avatar | ✅ |
| PageHeader | ✅ |
| Tabs | ✅ |
| LoadingSpinner | ✅ |
| OfflineBanner | ✅ |
| ErrorBoundary | ✅ |

Extra: `TopBar.jsx` — present but 0 portal consumers (dead export).

---

### 2.3 Component test coverage
**Status: ✅ PASS**
Test files in `admin/src/__tests__/shared/`: Avatar, Badge, Button, ConfirmDialog, EmptyState, Input, Modal, PageHeader, Table, Tabs.
Government has `SharedComponents.test.jsx` testing LoadingSpinner, Card, ErrorBoundary.
Admin test run: **79/79 tests pass** across 15 test files.

Components without dedicated tests: Select, Textarea, Checkbox, Radio, Skeleton, OfflineBanner, Toast, LanguageSwitcher. Acceptable for Phase 0; these are simple presentational components.

---

### 2.4 Toast adoption across portals
**Status: ✅ PASS**
Evidence — ToastProvider in App.jsx:
```
admin/src/App.jsx:82:        <ToastProvider>
government/src/App.jsx:82:   <ToastProvider>
reception/src/App.jsx:74:    <ToastProvider>
teacher/src/App.jsx:49:      <ToastProvider>
```
87 total `useToast`/`toast.(success|error|warning|info)` usages across all portals.

---

### 2.5 Locale foundation
**Status: ⚠️ PARTIAL**
`shared/locales/` contains: `en.json`, `ru.json`, `uz.json` ✅
`shared/utils/mergeLocales.js` exists ✅
`shared/locales/SCHEMA.md` — **not present** ⚠️ (minor gap; claimed in status report)

---

### 2.6 Locale merge wiring in portals
**Status: ⚠️ PARTIAL — see build failures in Section 4**
All four portals have `mergeLocales` wired in `i18n.js`. However, three portals have **wrong relative import paths** that cause production build failures:

```js
// admin/src/i18n.js, government/src/i18n.js, teacher/src/i18n.js — WRONG:
import { mergeLocales } from '../../../shared/utils/mergeLocales.js';
// from admin/src/, three levels up = /work/ (not /work/Uchqun/)
// CORRECT path: '../../shared/utils/mergeLocales.js'

// reception/src/i18n.js — correct shared path but MISSING portal locale files:
import portalEn from './locales/en/common.json';  // ← does not exist
import portalUz from './locales/uz/common.json';  // ← does not exist
import portalRu from './locales/ru/common.json';  // ← does not exist
// reception/src has no 'locales/' folder at all
```

The dev/test server works because relative paths in vitest use Vite's resolver which may handle them differently, but production Rollup build fails on all four portals.

---

### 2.7 Inter font loading
**Status: ✅ PASS**
Evidence:
```
admin/index.html:10:     <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
government/index.html:9: <link href="https://fonts.googleapis.com/css2?family=Inter:..." rel="stylesheet" />
reception/index.html:10: <link href="https://fonts.googleapis.com/css2?family=Inter:..." rel="stylesheet" />
teacher/index.html:9:    <link href="https://fonts.googleapis.com/css2?family=Inter:..." rel="stylesheet" />
shared/tailwind.base.js:19: sans: ['Inter', 'ui-sans-serif', 'system-ui', ...]
```
All four portals load Inter; shared preset declares it as the sans stack.

---

### 2.8 Government sidebar route coverage
**Status: ✅ PASS**
Sidebar navigation items vs. routes:
| Sidebar item | Route present |
|---|---|
| Dashboard → `/government` | ✅ `index` |
| Schools → `/government/schools` | ✅ |
| Students → `/government/students` | ✅ |
| Teachers → `/government/teachers` | ✅ |
| Parents → `/government/parents` | ✅ |
| Ratings → `/government/ratings` | ✅ |
| Platform → `/government/platform` | ✅ |
| Profile → `/government/profile` | ✅ |
| Settings → `/government/settings` | ✅ |

Note: `admin/:id` (AdminDetails) is a detail page, not a sidebar nav item — acceptable.

---

## Section 3 — Phase 0C: Stripping

### Portal Summary Table

| Portal | Pages total | Pages stripped | Sub-components stripped | Inline patterns remaining | Status |
|---|---|---|---|---|---|
| admin | 13 pages | 13 | 5 sub-pages (reception/, settings/) | 0 | ✅ |
| government | 10 pages | 10 | 0 of 5 tabs | 28 inline `<button>`, 16 inline `<input>` in tabs | ❌ |
| reception | 6 pages + 4 sub-pages | 6/10 | partial | 0 in main pages | ✅ |
| teacher | 10 pages + 8 sub-pages | 10/18 | partial | 0 in main pages | ✅ |
| parent (in teacher/) | 13 pages + 7 sub-pages | 13/20 | partial | 2 inline `<button>` (Media.jsx) | ⚠️ |

---

### 3.1 Admin — per page

All admin pages use shared components (Card, ConfirmDialog, LoadingSpinner, etc.) via `@shared/*` imports. Zero inline `<button>` or `<input>` elements in any page. ReceptionManagement.jsx has 2 inline status pills (`bg-green-100 text-green-800`) — acceptable semantic status colors.

**Admin status: ✅ STRIPPED**

---

### 3.2 Government — per page

Government page files (Dashboard, Schools, Students, Teachers, Parents, Ratings, Platform, Profile, Settings, AdminDetails) all use shared components. However, the `Platform` page delegates rendering to five tab components in `government/src/components/tabs/`:

| Tab file | Inline `<button>` | Inline `<input>` | Card import | Status |
|---|---|---|---|---|
| AdminsTab.jsx | 6 | 6 | `'../Card'` ❌ broken | ❌ |
| GovernmentTab.jsx | 8 | 5 | `'../Card'` ❌ broken | ❌ |
| MessagesTab.jsx | 4 | 0 | `'../Card'` ❌ broken | ❌ |
| RegistrationsTab.jsx | 8 | 2 | `'../Card'` ❌ broken | ❌ |
| SchoolsTab.jsx | 2 | 3 | `'../Card'` ❌ broken | ❌ |

The `Card` re-export wrapper at `government/src/components/Card.jsx` was deleted in Phase 0A but the 5 tab consumers were never updated. This causes:
1. Test failure: `government/src/__tests__/Platform.test.jsx` fails on import (even with vi.mock, the tab source file still resolves on import)
2. Production build failure (different root cause than i18n path issue)
3. Runtime crash when Platform page loads

**Government status: ❌ NOT STRIPPED (tabs); ❌ BROKEN import**

---

### 3.3 Reception — per page

All 6 main reception pages use shared Card, LoadingSpinner, ConfirmDialog via `@shared/*`. Sub-pages (parents/ChildFormModal, parents/ParentFormModal, parents/ParentCard) use shared Card and ConfirmDialog. Zero inline `<button>` or `<input>` in any page.

**Reception status: ✅ STRIPPED**

---

### 3.4 Teacher — per page

All 10 main teacher pages use shared components. Sub-components (activities/*, therapy/*, media/*) also appear clean (no inline form elements found). Zero inline `<button>` or `<input>` in main pages.

**Teacher status: ✅ STRIPPED**

---

### 3.5 Parent — per page

Most parent pages are clean. Exception:

```
teacher/src/parent/pages/Media.jsx: 2 inline <button> elements
teacher/src/parent/pages/AIWarnings.jsx: 2 inline status pills
```

**Parent status: ⚠️ PARTIAL (minor)**

---

### 3.6 Decorative background imports
**Status: ✅ PASS**
Grep for "Background" in all page files returned zero matches. Background components are only imported in Layout files, not pages.

---

### 3.7 Sidebar route coverage

| Portal | Sidebar items | Routes in App.jsx | Missing from sidebar |
|---|---|---|---|
| admin | 8 | 9 (+ users) | `/admin/users` (UsersStats page) |
| government | 9 | 9 | none |
| reception | 6 | 6 | none |
| teacher | 10 | 10 | none |
| parent | 11 | 12 | `/` (home/dashboard redirect) |

Admin sidebar is missing the `/admin/users` entry (UsersStats page exists and is routed but no sidebar link).

---

### 3.8 Mobile navigation route coverage

**Parent BottomNav**: 4 items — home (`/`), profile (`/child`), rating (`/rating`), ai-chat (`/ai-chat`).  
Parent routes total: 12 (activities, meals, media, ai-chat, chat, notifications, help, rating, settings, therapy, child, parents).  
**Coverage: 4/12 = 33%**

**Teacher BottomNav**: 2 items — dashboard (`/teacher`), profile (`/teacher/profile`).  
Teacher routes total: 10+.  
**Coverage: 2/10 = 20%**

Both BottomNavs are severely under-populated. This was flagged in a prior audit (parent 36%) and remains unresolved.

---

## Section 4 — Build & Test Health

### 4.1 Builds

| Portal | Build result | Root cause |
|---|---|---|
| admin | ❌ FAIL | `Could not resolve '../../../shared/utils/mergeLocales.js'` — path resolves to `/c/work/shared/` (wrong depth) |
| government | ❌ FAIL | `Could not resolve '../../../shared/locales/en.json'` — same depth error |
| reception | ❌ FAIL | `Could not resolve './locales/ru/common.json'` — `reception/src/locales/` never created |
| teacher | ❌ FAIL | `Could not resolve '../../../shared/utils/mergeLocales.js'` — same depth error |

All four builds fail. The project cannot be deployed in its current state. Path verification:
```bash
# From admin/src/:
../../shared/utils/  → /c/work/Uchqun/shared/utils/  ← CORRECT
../../../shared/utils/ → /c/work/shared/utils/        ← WRONG (used in admin, government, teacher)
```

---

### 4.2 Tests

| Portal | Test files | Tests | Result |
|---|---|---|---|
| admin | 15 | 79/79 | ✅ PASS |
| government | 4 pass / 1 fail | 47/47 tests | ❌ 1 file fails — `Platform.test.jsx` crashes on `'../Card'` import error from AdminsTab |
| reception | (running) | — | pending |
| teacher | (running) | — | pending |

Admin: 79 tests pass — matches prior "79 tests pass" claim. Vitest resolves `@shared` alias correctly in test environment, masking the wrong relative paths in i18n.js.

Government: 47 tests pass in 4 files, but `Platform.test.jsx` (1 file) fails at module resolution — `government/src/components/tabs/AdminsTab.jsx` tries to import `'../Card'` which doesn't exist. The vi.mock() of AdminsTab in the test file doesn't prevent the module from being parsed.

---

### 4.3 Lint

All four portals: **clean** (ESLint produces no output, exit 0). No lint errors or warnings.

---

## Section 5 — Cross-Cutting Issues

### 5.1 Console.log statements
**Count: 0** — All console.log and console.warn statements have been removed. ✅

---

### 5.2 Commented-out JSX blocks
**Count: 0** — No `// <Component>` commented-out JSX found across all portals. ✅

---

### 5.3 TODO comments (categorized)

| Tag | Count | Interpretation |
|---|---|---|
| `TODO(phase-0a)` | 0 | Phase 0A work claimed complete |
| `TODO(phase-0b)` | 0 | Phase 0B work claimed complete |
| `TODO(phase-0c)` | 0 | Phase 0C work claimed complete |
| `TODO(phase-1)` | 14 | Expected deferred decisions |
| Total `TODO/FIXME/XXX/HACK` | 15 | 14 phase-1 + 1 unrelated (reception test comment) |

The 14 `TODO(phase-1)` items are:
- Admin: therapy type colors, role badge colors, entity stat-card colors (3)
- Government: sidebar header color, entity/school icon colors, star rating palette, external link color, Telegram button color, Schools stat card (7)
- Teacher/Parent: Lunch/Dinner meal-type color (2)
- Government: Registrations external doc link (2)

All are product/design decisions properly deferred. ✅

---

### 5.4 Dead exports in shared components

| Component | Portal consumers |
|---|---|
| Card | 66 ✅ |
| LoadingSpinner | 52 ✅ |
| LanguageSwitcher | 17 ✅ |
| ConfirmDialog | 9 ✅ |
| Modal | 10 ✅ |
| Skeleton | 7 ✅ |
| ErrorBoundary | 5 ✅ |
| OfflineBanner | 5 ✅ |
| Toast | 4 ✅ |
| Avatar | 1 ✅ |
| Badge | 1 ✅ |
| Button | 1 ✅ |
| EmptyState | 1 ✅ |
| Input | 1 ✅ |
| PageHeader | 1 ✅ |
| Table | 1 ✅ |
| Tabs | 1 ✅ |
| **TopBar** | **0 ❌** |
| Checkbox | 0 (not yet adopted) |
| Radio | 0 (not yet adopted) |
| Select | 0 (not yet adopted) |
| Textarea | 0 (not yet adopted) |

`TopBar`: exported from shared but no portal imports it. Dead weight. Should be deleted or adopted.

`Checkbox`, `Radio`, `Select`, `Textarea`: not yet adopted by any portal page — this is Phase 1 work, not a Phase 0 gap.

---

### 5.5 Phase 0 cleanup log
**Status: ❌ OVERSTATES COMPLETENESS**

`PHASE_0_CLEANUP_LOG.md` last entry:
```
## PHASE 0 COMPLETE — 2026-05-16
All Phase 0 objectives met: 0A ✅, 0B ✅, 0C ✅
```

This is **inaccurate**. The log fails to document:
1. Wrong relative depth in i18n.js for admin/government/teacher (all 4 builds fail)
2. Deletion of `government/src/components/Card.jsx` without updating the 5 tab consumers that import it
3. Failure to create `reception/src/locales/` portal locale files
4. `prompt()` still present in admin ReceptionDetailPanel

---

## Gap List

Sorted by severity:

| # | Description | File(s) | Severity | Effort |
|---|---|---|---|---|
| 1 | All 4 production builds fail — i18n.js path depth wrong | `admin/src/i18n.js`, `government/src/i18n.js`, `teacher/src/i18n.js`: change `'../../../shared/'` → `'../../shared/'` | **Blocking Phase 1** | S |
| 2 | Reception build fails — portal locale files missing | Create `reception/src/locales/en/common.json`, `uz/common.json`, `ru/common.json` (can be empty `{}`) | **Blocking Phase 1** | S |
| 3 | Government tests fail + runtime crash on Platform page — `'../Card'` broken import in 5 tab files | `government/src/components/tabs/AdminsTab.jsx`, `GovernmentTab.jsx`, `MessagesTab.jsx`, `RegistrationsTab.jsx`, `SchoolsTab.jsx`: change `import Card from '../Card'` → `import Card from '@shared/components/Card'` | **Blocking Phase 1** | S |
| 4 | `window.prompt()` still present in admin rejection flow | `admin/src/pages/reception/ReceptionDetailPanel.jsx:137` — replace with a proper modal | Blocking Phase 1 | M |
| 5 | Government Platform tabs: 28 inline `<button>`, 16 inline `<input>` — Phase 0C stripping not done for tab sub-components | All 5 files in `government/src/components/tabs/` | Blocking Phase 1 | M |
| 6 | Admin sidebar missing `/admin/users` entry | `admin/src/components/Sidebar.jsx` | Cosmetic | S |
| 7 | Parent BottomNav: 4 of 12 routes (33%); Teacher BottomNav: 2 of 10 routes (20%) | `teacher/src/parent/components/BottomNav.jsx`, `teacher/src/shared/components/BottomNav.jsx` | Cosmetic | M |
| 8 | `admin/src/pages/Login.jsx:122`: bare Uzbek string `Admin bo'lishni xohlaysizmi?` not wrapped in `t()` | `admin/src/pages/Login.jsx` | Cosmetic | S |
| 9 | `._id` defensive fallback in admin Dashboard | `admin/src/pages/Dashboard.jsx:198,217` | Cosmetic | S |
| 10 | `government/index.html` vite.svg with no `TODO(phase-1)` comment | `government/index.html` | Deferred | S |
| 11 | `shared/components/TopBar.jsx` — 0 consumers, dead code | `shared/components/TopBar.jsx` | Deferred | S |
| 12 | `shared/locales/SCHEMA.md` missing (claimed in status report) | `shared/locales/` | Deferred | S |

---

## Recommendation

**Phase 0 is NOT complete. Do not proceed to Phase 1 until items #1–5 are fixed.**

The five blockers are all small in effort (S or M) and can be resolved in one session:

1. Fix path depth in `admin/src/i18n.js`, `government/src/i18n.js`, `teacher/src/i18n.js` (3 one-line changes)
2. Create empty `{}` locale files for reception (3 files)
3. Fix `import Card from '../Card'` → `import Card from '@shared/components/Card'` in 5 government tab files
4. Replace `prompt()` in ReceptionDetailPanel with a modal dialog
5. Strip government Platform tabs (AdminsTab, GovernmentTab, MessagesTab, RegistrationsTab, SchoolsTab) — use shared Button, Input, Card

Items #6–12 are cosmetic or deferred and do not block Phase 1.

After fixes: re-run `npm run build` and `npm test -- --run` in all four portals and confirm all pass before starting Phase 1.
