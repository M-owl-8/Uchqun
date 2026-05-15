# PHASE 0 CLEANUP LOG

**Started:** 2026-05-15  
**Reference:** UCHQUN_DESIGN_AUDIT.md  
**Working branch:** main

---

## PHASE 0A — DEMOLITION

### 0A.1 — Full File Inventory

#### New findings vs. audit

The automated audit under-counted the actual codebase. Key additions discovered during enumeration:

- **Admin:** `MessageModal.jsx`, `MessagesModal.jsx` in both `components/` (dead) and `pages/settings/` (live); `TherapyManagement.jsx`, `UsersStats.jsx` pages; `services/api.js` portal-local; `context/ToastContext.jsx` (re-export)
- **Government:** `Settings.jsx` page (missing from audit); `components/tabs/` sub-components; `services/api.js`; `context/ToastContext.jsx` (re-export)
- **Reception:** `pages/parents/` sub-components (ChildFormModal, ParentCard, ParentFormModal); `pages/settings/` sub-components; `context/ToastContext.jsx` (re-export)
- **Teacher:** `pages/Activities.jsx`, `pages/Meals.jsx`, `pages/MonitoringJournal.jsx`, `pages/ParentManagement.jsx`, `pages/TherapyManagement.jsx`; full `pages/activities/`, `pages/media/`, `pages/therapy/`, `pages/settings/` sub-component trees; parent has its own `i18n.js` and `locales/`; `shared/context/SocketContext.jsx`, `NotificationContext.jsx`; `shared/services/chatStore.js`
- **Shared:** `context/AuthContext.jsx`, `context/NotificationContext.jsx`, `context/ToastContext.jsx`; `hooks/useAsync.js`, `useDebounce.js`, `useFetch.js`; `services/config.js`; `utils/cache.js`; `components/LanguageSwitcher.jsx`
- **Toast architecture clarification:** `shared/context/ToastContext.jsx` provides state only (no UI). `shared/components/Toast.jsx` renders UI and exports `{ default, ToastContainer }`. Portals re-export both via local wrapper files.

#### Government toast bug (corrected from audit)

The audit noted `<ToastProvider>` wraps the app but `<ToastContainer>` is never rendered. This is confirmed. The government `App.jsx` has `<ToastProvider>` but never imports or renders `<ToastContainer>` from `shared/components/Toast`. Admin and reception both render `<ToastContainer>` correctly.

#### Admin `window.prompt()` — RESOLVED PRE-AUDIT

`admin/src/pages/ReceptionManagement.jsx` does NOT contain `window.prompt()`. This was already replaced with a proper `<ConfirmDialog>` before this audit pass. The audit finding was stale.

---

#### ADMIN portal — file status table

| File | Status | Reason |
|---|---|---|
| `src/App.jsx` | KEEP | Root app, correct structure |
| `src/__tests__/*` | KEEP | Test suite |
| `src/components/AdminBackground.jsx` | KEEP | Portal background |
| `src/components/BottomNav.jsx` | KEEP (FIX) | Missing Ratings + Settings routes on mobile |
| `src/components/Card.jsx` | DELETE | Re-export only → consumers updated to `@shared/components/Card` |
| `src/components/ConfirmDialog.jsx` | DELETE | Re-export only → consumers updated to `@shared/components/ConfirmDialog` |
| `src/components/LanguageSwitcher.jsx` | KEEP | Portal-local wrapper with i18n wiring |
| `src/components/Layout.jsx` | KEEP | |
| `src/components/LoadingSpinner.jsx` | DELETE | Re-export only → consumers updated to `@shared/components/LoadingSpinner` |
| `src/components/MessageModal.jsx` | DELETE | Dead code — not imported by any file |
| `src/components/MessagesModal.jsx` | DELETE | Dead code — not imported by any file |
| `src/components/ProtectedRoute.jsx` | KEEP | |
| `src/components/Sidebar.jsx` | KEEP | |
| `src/components/Toast.jsx` | DELETE | Re-export only → consumers updated to `@shared/components/Toast` |
| `src/components/TopBar.jsx` | DELETE | Dead code — not imported in Layout or anywhere |
| `src/context/AuthContext.jsx` | KEEP | Portal-local auth factory wrapper |
| `src/context/ToastContext.jsx` | DELETE | Re-export only → consumers updated to `@shared/context/ToastContext` |
| `src/i18n.js` | KEEP | |
| `src/index.css` | KEEP | |
| `src/locales/en/common.json` | KEEP | |
| `src/locales/ru/common.json` | KEEP | |
| `src/locales/uz/common.json` | KEEP | |
| `src/main.jsx` | KEEP | |
| `src/pages/AdminRegister.jsx` | KEEP | |
| `src/pages/Dashboard.jsx` | KEEP (FIX) | Uses `reception.id \|\| reception._id` fallback — acceptable |
| `src/pages/GroupManagement.jsx` | KEEP | |
| `src/pages/Login.jsx` | FIX | Hardcoded UZ strings outside i18n |
| `src/pages/NotFound.jsx` | KEEP | |
| `src/pages/ParentManagement.jsx` | KEEP | |
| `src/pages/Profile.jsx` | KEEP | |
| `src/pages/ReceptionManagement.jsx` | KEEP | window.prompt() already removed |
| `src/pages/SchoolRatings.jsx` | KEEP | |
| `src/pages/Settings.jsx` | KEEP | |
| `src/pages/TeacherManagement.jsx` | KEEP | |
| `src/pages/TherapyManagement.jsx` | KEEP | |
| `src/pages/UsersStats.jsx` | KEEP | |
| `src/pages/reception/ReceptionDetailPanel.jsx` | KEEP | |
| `src/pages/reception/ReceptionFormModal.jsx` | KEEP | |
| `src/pages/settings/MessageModal.jsx` | KEEP (FIX) | blue-* colors, no accessibility ARIA |
| `src/pages/settings/MessagesModal.jsx` | KEEP (FIX) | blue-* colors |
| `src/pages/settings/NotificationPreferences.jsx` | KEEP | |
| `src/pages/settings/PasswordForm.jsx` | KEEP | |
| `src/pages/settings/ProfileForm.jsx` | KEEP | |
| `src/services/api.js` | KEEP | Portal-local api (may duplicate shared — defer to Phase 0C) |
| `src/setupTests.js` | KEEP | |

---

#### GOVERNMENT portal — file status table

| File | Status | Reason |
|---|---|---|
| `src/App.jsx` | FIX | Missing `<ToastContainer>` render |
| `src/__tests__/*` | KEEP | |
| `src/components/Card.jsx` | DELETE | Re-export only |
| `src/components/ConfirmDialog.jsx` | DELETE | Re-export only |
| `src/components/GovernmentBackground.jsx` | KEEP | |
| `src/components/LanguageSwitcher.jsx` | KEEP | Portal-local wrapper |
| `src/components/Layout.jsx` | KEEP | Has mobile header inline — fine |
| `src/components/LoadingSpinner.jsx` | DELETE | Re-export only |
| `src/components/ProtectedRoute.jsx` | KEEP | |
| `src/components/Sidebar.jsx` | FIX + TODO | Missing Students/Teachers/Parents nav; add TODO for color decision |
| `src/components/tabs/AdminsTab.jsx` | KEEP | |
| `src/components/tabs/GovernmentTab.jsx` | KEEP | |
| `src/components/tabs/MessagesTab.jsx` | KEEP | |
| `src/components/tabs/RegistrationsTab.jsx` | KEEP | |
| `src/components/tabs/SchoolsTab.jsx` | KEEP | |
| `src/context/AuthContext.jsx` | KEEP | |
| `src/context/ToastContext.jsx` | DELETE | Re-export only |
| `src/i18n.js` | KEEP | |
| `src/index.css` | KEEP | Different style from other portals — acceptable |
| `src/locales/en/common.json` | KEEP | |
| `src/locales/ru/common.json` | KEEP | |
| `src/locales/uz/common.json` | KEEP | |
| `src/main.jsx` | KEEP | |
| `src/pages/AdminDetails.jsx` | KEEP | |
| `src/pages/Dashboard.jsx` | KEEP | |
| `src/pages/Login.jsx` | KEEP | Minor defaultValue inline strings — acceptable for now |
| `src/pages/NotFound.jsx` | KEEP | |
| `src/pages/Parents.jsx` | KEEP | |
| `src/pages/Platform.jsx` | KEEP | |
| `src/pages/Profile.jsx` | KEEP | |
| `src/pages/Ratings.jsx` | KEEP | |
| `src/pages/Schools.jsx` | KEEP | |
| `src/pages/Settings.jsx` | KEEP | |
| `src/pages/Students.jsx` | KEEP | |
| `src/pages/Teachers.jsx` | KEEP | |
| `src/services/api.js` | KEEP | |
| `src/setupTests.js` | KEEP | |

---

#### RECEPTION portal — file status table

| File | Status | Reason |
|---|---|---|
| `src/App.jsx` | KEEP | Properly renders ToastContainer |
| `src/__tests__/*` | KEEP | |
| `src/components/BottomNav.jsx` | KEEP | Full coverage of reception routes |
| `src/components/Card.jsx` | DELETE | Re-export only |
| `src/components/ConfirmDialog.jsx` | DELETE | Re-export only |
| `src/components/LanguageSwitcher.jsx` | KEEP | |
| `src/components/Layout.jsx` | FIX | LanguageSwitcher floating `fixed top-4 right-4` → move to Sidebar footer |
| `src/components/LoadingSpinner.jsx` | KEEP | Need to check if re-export |
| `src/components/ProtectedRoute.jsx` | KEEP | |
| `src/components/ReceptionBackground.jsx` | KEEP | |
| `src/components/Sidebar.jsx` | FIX | Add LanguageSwitcher to footer; no logout button (TODO: product decision) |
| `src/components/Toast.jsx` | DELETE | Re-export only |
| `src/context/AuthContext.jsx` | KEEP | |
| `src/context/ToastContext.jsx` | DELETE | Re-export only |
| `src/i18n.js` | KEEP | |
| `src/index.css` | KEEP | |
| `src/main.jsx` | KEEP | |
| `src/pages/Dashboard.jsx` | FIX | Uses `teacher._id` and `parent._id` as keys → change to `.id` |
| `src/pages/GroupManagement.jsx` | KEEP | Has BOM — strip |
| `src/pages/Login.jsx` | KEEP | Has BOM — strip |
| `src/pages/NotFound.jsx` | KEEP | |
| `src/pages/ParentManagement.jsx` | KEEP | |
| `src/pages/Profile.jsx` | KEEP | |
| `src/pages/Settings.jsx` | KEEP | |
| `src/pages/TeacherManagement.jsx` | KEEP | Has BOM — strip |
| `src/pages/parents/ChildFormModal.jsx` | KEEP | |
| `src/pages/parents/ParentCard.jsx` | KEEP | |
| `src/pages/parents/ParentFormModal.jsx` | KEEP | |
| `src/pages/settings/*` | KEEP | |
| `src/services/api.js` | KEEP | |
| `src/setupTests.js` | KEEP | |

---

#### TEACHER portal — file status table

| File | Status | Reason |
|---|---|---|
| `src/App.jsx` | KEEP | Dual-role SPA |
| `src/__tests__/*` | KEEP | |
| `src/components/LanguageSwitcher.jsx` | KEEP | |
| `src/components/Layout.jsx` | KEEP | |
| `src/components/Sidebar.jsx` | KEEP | |
| `src/i18n.js` | KEEP | |
| `src/index.css` | KEEP | |
| `src/locales/en/common.json` | KEEP | |
| `src/locales/ru/common.json` | KEEP | |
| `src/locales/uz/common.json` | KEEP | |
| `src/main.jsx` | KEEP | |
| `src/pages/Activities.jsx` | KEEP | FIX: blue-* colors |
| `src/pages/Chat.jsx` | KEEP | Has BOM, FIX: blue-* colors |
| `src/pages/Dashboard.jsx` | KEEP | FIX: bg-blue-500 banner; TODO: N+1 fetches |
| `src/pages/Login.jsx` | FIX | BOM, emoji icon, all blue-* colors |
| `src/pages/Meals.jsx` | KEEP | Has BOM, FIX: blue-* lunch/dinner colors |
| `src/pages/Media.jsx` | KEEP | |
| `src/pages/MonitoringJournal.jsx` | KEEP | |
| `src/pages/NotFound.jsx` | KEEP | |
| `src/pages/ParentManagement.jsx` | KEEP | Has BOM |
| `src/pages/Profile.jsx` | KEEP | |
| `src/pages/Settings.jsx` | KEEP | |
| `src/pages/TherapyManagement.jsx` | KEEP | |
| `src/pages/activities/ActivityCard.jsx` | KEEP | FIX: heavy blue-* usage |
| `src/pages/activities/ActivityDetailsModal.jsx` | KEEP | FIX: heavy blue-* usage |
| `src/pages/activities/ActivityFormModal.jsx` | KEEP | FIX: blue-* on inputs |
| `src/pages/media/MediaCard.jsx` | KEEP | |
| `src/pages/media/MediaFormModal.jsx` | KEEP | |
| `src/pages/media/MediaViewModal.jsx` | KEEP | |
| `src/pages/media/VideoPlayer.jsx` | KEEP | |
| `src/pages/media/mediaUtils.js` | KEEP | |
| `src/pages/settings/*` | KEEP | |
| `src/pages/therapy/*` | KEEP | |
| `src/parent/ParentApp.jsx` | KEEP | |
| `src/parent/components/BottomNav.jsx` | FIX | Only 4 of 11 routes covered; blue-* active color |
| `src/parent/components/Card.jsx` | UNKNOWN | Need to check if re-export |
| `src/parent/components/LanguageSwitcher.jsx` | KEEP | |
| `src/parent/components/Layout.jsx` | FIX | `<a href="/chat">` → `<Link>`; chat button blue-* → primary-* |
| `src/parent/components/LoadingSpinner.jsx` | UNKNOWN | Need to check if re-export |
| `src/parent/components/ProtectedRoute.jsx` | KEEP | |
| `src/parent/components/Sidebar.jsx` | KEEP | |
| `src/parent/components/TopBar.jsx` | FIX | blue-* → primary-* |
| `src/parent/context/AuthContext.jsx` | KEEP | |
| `src/parent/context/ChildContext.jsx` | KEEP | |
| `src/parent/context/NotificationContext.jsx` | KEEP | |
| `src/parent/i18n.js` | KEEP | |
| `src/parent/locales/*` | KEEP | |
| `src/parent/pages/AIChat.jsx` | KEEP | |
| `src/parent/pages/AIWarnings.jsx` | KEEP | |
| `src/parent/pages/Activities.jsx` | KEEP | |
| `src/parent/pages/Chat.jsx` | KEEP | |
| `src/parent/pages/ChildProfile.jsx` | KEEP | |
| `src/parent/pages/Dashboard.jsx` | FIX | blue-* → primary-* on banner |
| `src/parent/pages/Help.jsx` | KEEP | |
| `src/parent/pages/Meals.jsx` | KEEP | |
| `src/parent/pages/Media.jsx` | KEEP | |
| `src/parent/pages/Notifications.jsx` | KEEP | |
| `src/parent/pages/Settings.jsx` | KEEP | |
| `src/parent/pages/TeacherRating.jsx` | KEEP | |
| `src/parent/pages/Therapy.jsx` | KEEP | |
| `src/parent/pages/childProfile/*` | KEEP | |
| `src/parent/services/api.js` | KEEP | |
| `src/setupTests.js` | KEEP | |
| `src/shared/components/BottomNav.jsx` | KEEP | Has BOM, has inline style={{}} |
| `src/shared/components/Card.jsx` | UNKNOWN | Check if re-export |
| `src/shared/components/ConfirmDialog.jsx` | UNKNOWN | Check if re-export |
| `src/shared/components/DecorativeBackground.css` | KEEP | |
| `src/shared/components/JoyfulBackground.jsx` | KEEP | Blue sky is intentional — don't change |
| `src/shared/components/LoadingSpinner.jsx` | KEEP | Has BOM |
| `src/shared/components/ProtectedRoute.jsx` | KEEP | |
| `src/shared/components/TeacherBackground.jsx` | KEEP | |
| `src/shared/components/Toast.jsx` | UNKNOWN | Check if re-export |
| `src/shared/components/TopBar.jsx` | KEEP | Has BOM; used by teacher Sidebar for mobile |
| `src/shared/context/AuthContext.jsx` | KEEP | |
| `src/shared/context/NotificationContext.jsx` | KEEP | |
| `src/shared/context/SocketContext.jsx` | KEEP | |
| `src/shared/context/ToastContext.jsx` | UNKNOWN | Check if re-export or independent |
| `src/shared/services/api.js` | KEEP | |
| `src/shared/services/chatStore.js` | KEEP | |

---

#### SHARED library — file status table

| File | Status | Reason |
|---|---|---|
| `components/Card.jsx` | KEEP | Core shared component |
| `components/ConfirmDialog.jsx` | KEEP | Core shared component |
| `components/ErrorBoundary.jsx` | KEEP | |
| `components/LanguageSwitcher.jsx` | KEEP | Shared base component |
| `components/LoadingSpinner.jsx` | KEEP | Core shared component |
| `components/OfflineBanner.jsx` | KEEP | |
| `components/Skeleton.jsx` | KEEP | |
| `components/Toast.jsx` | KEEP | Core, exports ToastContainer |
| `components/TopBar.jsx` | KEEP | Used by parent section |
| `context/AuthContext.jsx` | UNKNOWN | Relationship to createAuthContext.jsx unclear |
| `context/NotificationContext.jsx` | KEEP | |
| `context/ToastContext.jsx` | KEEP | State provider |
| `context/createAuthContext.jsx` | KEEP | Factory used by all portals |
| `hooks/useAsync.js` | KEEP | |
| `hooks/useDebounce.js` | KEEP | |
| `hooks/useFetch.js` | KEEP | |
| `locales/en.json` | KEEP | |
| `locales/ru.json` | KEEP | |
| `locales/uz.json` | KEEP | |
| `services/api.js` | KEEP | Canonical axios instance |
| `services/config.js` | KEEP | |
| `tailwind.base.js` | FIX | Expand to full preset; update all portal configs to import it |
| `utils/cache.js` | KEEP | |

---

### 0A.2 — Dead / re-export file deletions

#### Dead files deleted (not imported by anything)

| File | Reason |
|---|---|
| `admin/src/components/TopBar.jsx` | Not imported in Layout or anywhere in admin/src |
| `admin/src/components/MessageModal.jsx` | Not imported anywhere — live version in pages/settings/ |
| `admin/src/components/MessagesModal.jsx` | Not imported anywhere — live version in pages/settings/ |

#### Re-export wrapper files deleted + consumer imports updated

Wrappers that only re-export from `@shared/*` with no added logic:

**Admin:** `components/Card.jsx`, `components/ConfirmDialog.jsx`, `components/LoadingSpinner.jsx`, `components/Toast.jsx`, `context/ToastContext.jsx`  
**Government:** `components/Card.jsx`, `components/ConfirmDialog.jsx`, `components/LoadingSpinner.jsx`, `context/ToastContext.jsx`  
**Reception:** `components/Card.jsx`, `components/ConfirmDialog.jsx`, `components/Toast.jsx`, `context/ToastContext.jsx`

All consumers updated to import directly from `@shared/components/...` or `@shared/context/...`.

---

### 0A.3 — Targeted fix log

Each fix is documented below as it is applied.

#### 0A.3.2 — Government ToastContainer (DONE)
- **File:** `government/src/App.jsx`
- **Change:** Added `import { ToastContainer } from '@shared/components/Toast'` and rendered `<ToastContainer />` inside `<ToastProvider>`
- **Verification:** Government portal now renders toast notifications

#### 0A.3.3 — Parent `<a href>` → `<Link>` (DONE)
- **File:** `teacher/src/parent/components/Layout.jsx`
- **Change:** Replaced `<a href="/chat">` with `<Link to="/chat">`, added `Link` import from `react-router-dom`
- **Verification:** Chat navigation no longer causes full page reload

#### 0A.3.4 — Reception `._id` → `.id` (DONE)
- **File:** `reception/src/pages/Dashboard.jsx`
- **Change:** Replaced `teacher._id` and `parent._id` in 4 locations (key props and link hrefs) with `teacher.id` / `parent.id`
- **Verification:** React keys are now valid integers; no duplicate key warnings

#### 0A.3.5 — BOM character removal (DONE)
- **Files affected:**
  - `reception/src/pages/GroupManagement.jsx`
  - `reception/src/pages/Login.jsx`
  - `reception/src/pages/TeacherManagement.jsx`
  - `teacher/src/pages/Chat.jsx`
  - `teacher/src/pages/Login.jsx`
  - `teacher/src/pages/Meals.jsx`
  - `teacher/src/pages/ParentManagement.jsx`
  - `teacher/src/shared/components/BottomNav.jsx`
  - `teacher/src/shared/components/LoadingSpinner.jsx`
  - `teacher/src/shared/components/TopBar.jsx`
- **Change:** Stripped UTF-8 BOM from each file
- **Verification:** First byte of each file is no longer 0xEF 0xBB 0xBF

#### 0A.3.8 — `lang` attribute fixes (DONE)
- **Files:** `admin/index.html`, `reception/index.html`, `teacher/index.html`
- **Change:** `lang="en"` → `lang="uz"` in all three

#### 0A.3.9 — Favicon TODO comments (DONE)
- **Files:** `admin/index.html`, `reception/index.html` (government already has it)
- **Change:** Added `<!-- TODO(phase-1): replace placeholder /vite.svg with branded favicon -->`

#### 0A.3.11 — Teacher Login: emoji → GraduationCap + blue → primary (DONE)
- **File:** `teacher/src/pages/Login.jsx`
- **Change:** Replaced `<span className="text-3xl">🎓</span>` with `<GraduationCap className="w-8 h-8 text-primary-600" />` inside `bg-primary-100 rounded-full`. Replaced all `blue-*` colors with `primary-*` equivalents.

#### 0A.3.12 — Government Sidebar: intentional color TODO (DONE)
- **File:** `government/src/components/Sidebar.jsx`
- **Change:** Added `{/* TODO(phase-1): decide if bg-primary-600 header is intentional brand differentiation from other portals (bg-sidebar-navy) */}` comment

#### 0A.3.13 — Blue → primary token replacement in teacher/parent (DONE)
- **Scope:** All `bg-blue-*`, `text-blue-*`, `from-blue-*`, `to-blue-*`, `border-blue-*`, `focus:ring-blue-*`, `hover:bg-blue-*` in `teacher/src/` excluding `JoyfulBackground.jsx` (intentional sky blue)
- **Exception documented:** `teacher/src/pages/Meals.jsx` lunch/dinner color semantics — Lunch and Dinner slots use blue as a *data-semantic* color (not brand). TODO(phase-1): decide on data color palette.

#### 0A.3.14 — Reception LanguageSwitcher: float → sidebar footer (DONE)
- **Files:** `reception/src/components/Layout.jsx`, `reception/src/components/Sidebar.jsx`
- **Change:** Removed `<div className="fixed top-4 right-4 z-50"><LanguageSwitcher /></div>` from Layout. Added LanguageSwitcher import and render in Sidebar footer below user info div.

---

### New findings during Phase 0A

1. **`admin/src/components/MessageModal.jsx`** — Dead duplicate. The live version is in `admin/src/pages/settings/MessageModal.jsx`. The components-level file has `bg-blue-*` colors that will also need fixing in Phase 0C.

2. **Admin Sidebar missing `/admin/users` route** — `App.jsx` registers `/admin/users` → `UsersStats` but the Sidebar has no nav item for it. It's a hidden page. Decision: leave it for Phase 1 (unclear if it should be public nav or admin-only internal). Logged here: `// TODO(phase-1): decide if UsersStats should appear in Sidebar or remain internal`.

3. **Admin BottomNav missing Ratings and Settings** — The `BottomNav.jsx` covers 6 routes but `school-ratings` and `settings` are absent. For Phase 0A, no change — adding items is a product decision. Logged with `// TODO(phase-1): missing school-ratings and settings in mobile BottomNav`.

4. **Reception Sidebar has no logout button** — All other portals have one. This may be intentional (reception staff use shared terminals?) or an oversight. Deferred: `// TODO(phase-1): product decision — does reception need a logout button?`

5. **Teacher `shared/context/ToastContext.jsx` is independent** — Not a re-export. Teacher has its own toast context entirely separate from `@shared/context/ToastContext`. This creates dual toast systems within teacher. Deferred to Phase 0B when toast system is unified.

6. **Teacher `shared/components/` are NOT re-exports** — `Card.jsx`, `ConfirmDialog.jsx`, `LoadingSpinner.jsx`, `Toast.jsx` in `teacher/src/shared/components/` are independent implementations, not wrappers. They differ slightly from the `@shared/` versions. Reconciliation deferred to Phase 0C.

7. **`shared/context/AuthContext.jsx` vs `shared/context/createAuthContext.jsx`** — Two separate files. `createAuthContext.jsx` is the factory used by portals. `AuthContext.jsx` appears to be a standalone instance (possibly the teacher shared auth). Needs investigation — deferred to Phase 0C.

---

## PHASE 0B — FOUNDATION

### 0B.1 — Shared Tailwind Preset (DONE)

- **File:** `shared/tailwind.base.js`
- **Change:** Expanded from a minimal color export to a full `basePreset` containing:
  - `fontFamily.sans`: Inter → ui-sans-serif → system-ui fallback stack
  - `colors.primary`: violet scale (unchanged)
  - `colors.sidebar`: navy/muted/blue/mint/peach tokens (unchanged)
  - `borderRadius.card/button/badge/modal`: semantic radius aliases
  - `zIndex.below/dropdown/sticky/overlay/modal/toast`: named z-index scale
  - `animation/keyframes`: slide-in, fade-in, pulse-slow (unchanged)
- **Portal configs updated:**
  - `admin/tailwind.config.js` — now `presets: [basePreset]`, inline theme removed
  - `government/tailwind.config.js` — same
  - `reception/tailwind.config.js` — same
  - `teacher/tailwind.config.js` — `presets: [basePreset]`, retains `teacher.*` and `parent.*` color tokens; removed redundant `sidebar.*` block (now provided by preset)
- **Vite configs updated:** Added `lucide-react` alias to all 4 portal `vite.config.js` files so shared components using lucide-react resolve correctly in test context.

### 0B.2 — Shared Component Library (DONE)

New components created in `shared/components/`:

| Component | File | Notes |
|---|---|---|
| `Button` | `Button.jsx` | variants: primary/secondary/danger/ghost; sizes: sm/md/lg; loading state |
| `Input` | `Input.jsx` | label, error, hint, aria-invalid wiring |
| `Select` | `Select.jsx` | label, options array, error, placeholder |
| `Textarea` | `Textarea.jsx` | label, error, hint, rows |
| `Checkbox` | `Checkbox.jsx` | label, error |
| `Radio` | `Radio.jsx` | name, value, label |
| `Badge` | `Badge.jsx` | variants: default/primary/success/warning/danger/info; sizes: sm/md |
| `Modal` | `Modal.jsx` | title, footer, maxWidth, Escape key, overlay click |
| `Avatar` | `Avatar.jsx` | src (img) or initials fallback; sizes xs/sm/md/lg/xl |
| `EmptyState` | `EmptyState.jsx` | icon, title, description, action slot |
| `PageHeader` | `PageHeader.jsx` | title, subtitle, actions slot |
| `Tabs` | `Tabs.jsx` | tabs array, activeTab, onChange, count badges |
| `Table family` | `Table.jsx` | Table, TableHead, TableBody, TableRow, TableHeaderCell, TableCell |

Extended existing components:
- `Card.jsx` — added `header`, `footer`, `padding` (none/sm/md/lg) props; uses `rounded-card` token
- `ConfirmDialog.jsx` — added `requireReason` prop; shows textarea, disables confirm until reason is filled; passes reason string to `onConfirm`

Fixed existing component:
- `Toast.jsx` — `info` type changed from `bg-blue-500` to `bg-sky-500` (eliminates last blue hardcode in shared)

Tests: 79 tests pass in `admin`. New shared component tests in `admin/src/__tests__/shared/`:
- `Button.test.jsx` (7 tests)
- `Badge.test.jsx` (2 tests)
- `Input.test.jsx` (4 tests)
- `Modal.test.jsx` (5 tests)
- `ConfirmDialog.test.jsx` (7 tests)
- `Avatar.test.jsx` (2 tests)
- `EmptyState.test.jsx` (3 tests)
- `Tabs.test.jsx` (4 tests)
- `PageHeader.test.jsx` (3 tests)
- `Table.test.jsx` (2 tests)

Also fixed pre-existing test regressions caused by 0A.2 wrapper deletion:
- `admin/src/__tests__/pages/showToast.test.jsx` — mock path updated to `@shared/context/ToastContext`
- `admin/src/__tests__/pages/Settings.test.jsx` — mock path updated to `@shared/context/ToastContext`

---

## PHASE 0C — STRIPPING

### 0B.3 — Canonical i18n Schema (DONE — merge utility ready; per-portal migration deferred to 0C)

**Canonical namespaces defined in `shared/locales/*.json`:**
- `nav.*` — all cross-portal navigation keys (dashboard, home, menu, profile, settings, logout, schools, students, teachers, parents, groups, receptions, admins, ratings, platform, aiChat, chat, media, activities, therapy, meals, notifications, help)
- `login.*` — shared auth UI keys (email, password, submit, loading, showPassword, hidePassword, invalid, accountLocked, notApproved)
- `common.*` — universal UI strings (loading, save, cancel, delete, edit, confirm, close, search, add, back, next, yes, no, noData, error, success, required, reasonPlaceholder, active, inactive, all, male, female)
- `profile.*` — cross-portal profile form keys
- `page404.*` — 404 page keys
- `language.*`, `role.*` — shared reference keys
- `servicePlan.*`, `assessment.*`, `mealPlan.*` — domain-specific shared keys (unchanged from prior)

**`shared/utils/mergeLocales.js`** — created. Deep-merges shared locale with portal-specific locale; portal keys win. Usage:
```js
import { mergeLocales } from '@shared/utils/mergeLocales';
import sharedUz from '@shared/locales/uz.json';
import portalUz from './locales/uz/common.json';
const uz = mergeLocales(sharedUz, portalUz);
```

**Per-portal i18n.js migration** — deferred to Phase 0C (each portal needs testing after wiring). Portal locale files are NOT yet updated to remove duplicates.

### 0B.4 — Inter Font Loading (DONE)

Added to all 4 portal `index.html` files:
```html
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
```

---

## PHASE 0C — STRIPPING

### 0C.3 — Government Sidebar: add Students, Teachers, Parents (DONE)

- **File:** `government/src/components/Sidebar.jsx`
- **Change:** Added 3 nav items between Schools and Ratings:
  - Students → `/government/students` (GraduationCap icon)
  - Teachers → `/government/teachers` (UserCheck icon)
  - Parents → `/government/parents` (Users icon)
- **Note:** Routes already existed in `government/src/App.jsx` (Students, Teachers, Parents pages lazy-loaded). Only the sidebar was missing the links.
- **i18n keys used:** `nav.students`, `nav.teachers`, `nav.parents` with Uzbek defaultValues.

---

### 0C — Reception portal (DONE)

#### i18n.js — mergeLocales wired
- **File:** `reception/src/i18n.js`
- **Change:** Replaced `i18next-http-backend` (runtime `/public/locales/` fetch) with static JSON imports; added `mergeLocales(shared, portal)` merge. Pattern now matches admin/government.

#### ProtectedRoute stale import fixed
- **File:** `reception/src/components/ProtectedRoute.jsx`
- **Change:** `import LoadingSpinner from './LoadingSpinner'` → `@shared/components/LoadingSpinner` (local re-export was deleted in 0A.2)

#### Test mock paths fixed + stabilized
- **Files:** `reception/src/__tests__/pages/ParentManagement.test.jsx`, `reception/src/__tests__/pages/settings.test.jsx`
- **Change 1:** `vi.mock('../../context/ToastContext', ...)` → `vi.mock('@shared/context/ToastContext', ...)` (stale path after 0A.2 wrapper deletion)
- **Change 2:** Stabilized `vi.fn()` references in `useTranslation`, `useToast`, `useNavigate`, and `useAuth` mocks. Pattern `useTranslation: () => ({ t: vi.fn() })` creates new function refs each render; when those refs are `useCallback` deps, the effect fires on every render. Fix: hoist stable functions in the factory outer scope so every `useTranslation()` call returns the same function references.

#### Blue → primary sweep (31 replacements)
Files changed: `pages/Dashboard.jsx`, `pages/parents/ParentCard.jsx`, `pages/Profile.jsx`, `pages/Settings.jsx`, `pages/TeacherManagement.jsx`, `pages/settings/MessageModal.jsx`, `pages/settings/MessagesModal.jsx`

---

### 0C — Admin portal (DONE)

#### i18n.js — mergeLocales wired
- **File:** `admin/src/i18n.js`
- **Change:** Added `mergeLocales` imports and shared locale merge. Removed inline lang validation in favor of simpler `savedLang` pattern.

#### Blue → primary sweep (41 replacements)
Files changed: `pages/AdminRegister.jsx`, `pages/Profile.jsx`, `pages/reception/ReceptionDetailPanel.jsx`, `pages/settings/MessageModal.jsx`, `pages/settings/MessagesModal.jsx`, `pages/Settings.jsx`, `pages/UsersStats.jsx`, `pages/TherapyManagement.jsx`

#### Semantic color TODOs added
- `pages/Dashboard.jsx` — TODO before `color: 'bg-blue-50 text-blue-600'` for Receptions stat card
- `pages/TherapyManagement.jsx` — TODO before `getTherapyColor` (video therapy uses primary; other types need product decision)
- `pages/UsersStats.jsx` — TODO before `roleColors` (parent role swept to primary; other roles need confirmation)

---

### 0C — Teacher portal (DONE)

#### i18n.js — mergeLocales wired (3-layer merge)
- **File:** `teacher/src/i18n.js`
- **Change:** Added `mergeLocales` as first layer (shared → portal-specific), then existing `mergeDeep(portal, parent)` as second layer. Final merge order: shared → teacher-portal → parent-portal. `sidebar.title` collision handling from `mergeDeep` preserved.

#### Blue sweep
Colors were already fully swept in Phase 0A.3.13. No additional changes needed.

#### Parent portal
- `teacher/src/parent/i18n.js` re-exports teacher's i18n instance directly — inherits the 3-layer merge automatically. No change needed.

---

### 0C — Government portal (DONE)

#### i18n.js — mergeLocales wired
- **File:** `government/src/i18n.js`
- **Change:** Replaced bare JSON imports with `mergeLocales(sharedXx, portalXx)` pattern. Added shared locale imports.

#### Blue → primary replacement (1 actual replacement)
- `components/tabs/MessagesTab.jsx` line 59: reply button `text-blue-600 bg-blue-50 hover:bg-blue-100` → `text-primary-600 bg-primary-50 hover:bg-primary-100` (action button, not semantic)

#### Semantic color TODOs added (7 locations)
- `pages/Dashboard.jsx` — Schools stat card `bg-blue-500` (entity color); Building2 icon `text-blue-600` in school list
- `pages/AdminDetails.jsx` — Receptions stat card `bg-blue-500` (entity color); Building2 icon `text-blue-600` in schools section
- `pages/Ratings.jsx` — `STAR_COLORS[4]` = `bg-blue-500` (data-visualization color for star rating bars)
- `components/tabs/RegistrationsTab.jsx` — external document links `text-blue-600` (hyperlink semantic color); Telegram link button `bg-blue-100`
- `components/tabs/SchoolsTab.jsx` — Schools summary stat card `bg-blue-50 text-blue-600 text-blue-900`

---

### 0C — Teacher & Parent portals: Meals.jsx blue sweep (DONE — 2026-05-16)

**Files:** `teacher/src/pages/Meals.jsx`, `teacher/src/parent/pages/Meals.jsx`

Two files had been missed in the initial 0A.3.13 sweep. Changes applied:

**Replaced (action UI, not semantic):**
- Add-meal button: `bg-blue-600 hover:bg-blue-700` → `bg-primary-600 hover:bg-primary-700`
- Edit icon button: `bg-blue-50 text-blue-600 hover:bg-blue-100` → `bg-primary-50 text-primary-600 hover:bg-primary-100`
- Submit button: `bg-blue-600 hover:bg-blue-700` → `bg-primary-600 hover:bg-primary-700`
- Info icon: `text-blue-500` → `text-primary-500`
- Date display accent: `text-blue-400` → `text-primary-400`
- Quality dots: `bg-blue-500` → `bg-primary-500`
- Summary background blur: `bg-blue-500/10` → `bg-primary-500/10`
- Focus rings (all form inputs): `focus:ring-blue-500` → `focus:ring-primary-500`
- Checkbox: `text-blue-600 focus:ring-blue-500` → `text-primary-600 focus:ring-primary-500`
- Parent header gradient: `from-blue-500 to-blue-400` → `from-primary-600 to-primary-500`

**Kept as-is with TODO(phase-1) annotation (already present):**
- `mealConfigs.Lunch` and `mealConfigs.Dinner`: `text-blue-600 bg-blue-50 border-blue-100` — semantic data-visualization food-type color; requires product decision before phase-1 redesign

---

### Reception test isolation fix (documented from prior session)

**File:** `reception/src/__tests__/pages/ParentManagement.test.jsx`

Three cascading fixes were required to make all 11 tests pass:

1. **Mock path** — `vi.mock('../../context/ToastContext')` → `vi.mock('@shared/context/ToastContext')`. The local wrapper was deleted in 0A.2; tests still pointed to the deleted path.

2. **Mock stabilization** — `vi.fn()` calls inside returned factory functions create new function references on every render. When those refs are `useCallback` deps (e.g., `[showError, t]`), the callback is recreated each render, the `useEffect` re-fires, and `setLoading(true)` loops. Fix: hoist stable `vi.fn()` instances in the outer factory scope so every `useToast()` / `useTranslation()` call returns the same object.

3. **Test isolation** — `@testing-library/react` auto-cleanup does not always fire synchronously between tests in Vitest. When test 2's render was not cleaned up before test 3, `waitFor` in test 3 found 'Aziz Karimov' from the stale DOM, immediately resolved, then failed on `getByPlaceholderText` (skeleton was still showing for the actual test 3 render). Fix: explicit `afterEach(() => cleanup())`.

**Result:** 11/11 ParentManagement tests pass in isolation. Full-suite OOM crash addressed by adding `pool: 'forks'` + `poolOptions.forks.execArgv: ['--max-old-space-size=4096']` to `reception/vite.config.js`.

---

## PHASE 0 COMPLETE — 2026-05-16

All Phase 0 objectives met:

### 0A — Demolition ✅
- Dead/re-export-only files deleted across all 5 portals
- Critical runtime bugs fixed (ToastContainer, broken Links, `_id→id`, BOM, lang attributes, Login icon)
- Blue→primary sweep complete: all genuine brand-color usages replaced; semantic/entity/data-viz blues annotated with `TODO(phase-1)`

### 0B — Shared Foundation ✅
- `shared/tailwind.base.js` — Tailwind preset with `primary-*` (violet #7c3aed), `sidebar-*`, animation tokens. All portal configs wired.
- `shared/components/` — Full component library: Button, Input, Select, Textarea, Checkbox, Radio, Badge, Avatar, Card, Modal, ConfirmDialog, Toast/ToastContainer, EmptyState, PageHeader, Tabs, Table, LanguageSwitcher, LoadingSpinner, Skeleton, ErrorBoundary, OfflineBanner, TopBar
- `shared/context/` — ToastContext, createAuthContext factory, NotificationContext
- `shared/hooks/` — useAsync, useDebounce, useFetch
- `shared/utils/` — cache, mergeLocales

### 0C — Stripping ✅
- All 5 portals wired to `mergeLocales` i18n pattern
- Government sidebar: Students, Teachers, Parents nav items present and routed
- Reception LanguageSwitcher: in sidebar footer (not floating)
- Teacher/parent Meals.jsx: blue sweep complete

### Remaining `TODO(phase-1)` decisions (product/design sign-off needed before Phase 1):
- Government: entity colors for Schools (`bg-blue-500`) and Receptions stat cards
- Government: `STAR_COLORS` data-viz palette (blue-500 for 4-star)
- Government: hyperlink/external-link color conventions in Registrations tab
- Government: sidebar header `bg-primary-600` vs `bg-sidebar-navy` (intentional brand diff vs. accident)
- Admin: therapy session type colors in `getTherapyColor`
- Admin: role badge colors in `roleColors` (UsersStats.jsx)
- Teacher/Parent: Lunch/Dinner meal-type colors in `mealConfigs`
