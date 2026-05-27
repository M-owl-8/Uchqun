# Parent + Teacher Portal: Ground-Truth Investigation
**Date:** 2026-05-28  
**Method:** Full static-code audit of every JSX file in scope; dev server confirmed running (port 5174). Screenshots deferred — local backend not started; all findings are source-verified, not screenshot-dependent.  
**Scope:** `teacher/src/parent/**` (parent portal) + `teacher/src/pages/**` + `teacher/src/components/**` (teacher portal)

---

## 1. STRUCTURAL FINDINGS — PARENT PORTAL

### 1.1 Navigation Reachability

**What the router knows (App.jsx:84–94):**

| Route | Page | In MobileTabBar | In DesktopTopNav | Other entry point |
|-------|------|:-:|:-:|---|
| `/` | Dashboard | ✅ Tab 1 "Bugun" | ✅ Link 1 | — |
| `/activities` | ParentActivities | ✅ Tab 2 "Kundalik" | ✅ Link 2 | Dashboard QuickLinks |
| `/chat` | ParentChat | ✅ Tab 3 "Xabarlar" | ✅ Link 3 | — |
| `/child` | ChildProfile | ✅ Tab 4 "Profil" | ✅ Link 4 | Dashboard QuickLinks |
| `/meals` | ParentMeals | ❌ | ❌ | Dashboard QuickLinks |
| `/media` | ParentMedia | ❌ | ❌ | Dashboard QuickLinks |
| `/rating` | TeacherRating | ❌ | ❌ | Dashboard QuickLinks |
| `/irr` | ChildIRR | ❌ | ❌ | **NONE** |
| `/therapy` | Therapy | ❌ | ❌ | **NONE** |
| `/notifications` | Notifications | ❌ | ❌ | **NONE** |
| `/help` | Help | ❌ | ❌ | **NONE** |
| `/settings` | ParentSettings | ❌ | ❌ | Help page link (unreachable itself) |

**CRITICAL:** `/irr`, `/therapy`, `/notifications`, `/help` are completely orphaned — no link anywhere in the rendered UI points to them. `/settings` is reachable only from `/help`, which is itself unreachable. A parent who has never been told the URL cannot access these 5 routes.

**Dashboard QuickLinks (source: parent/pages/Dashboard.jsx):** Links to `/activities`, `/meals`, `/media`, `/child`, `/rating`. These 5 are the only secondary entry points. No link to `/irr`, `/therapy`, `/notifications`, `/settings`, `/help`.

**Notification badge:** MobileTabBar Tab 3 ("Xabarlar") shows an unread count badge from `useNotification()`. But the tab links to `/chat`, not `/notifications`. The notification count is cosmetically attached to the chat tab with no navigation path to the Notifications page.

---

### 1.2 Design System Consistency Audit

The parent portal defines its own token set (defined in `teacher/tailwind.config.js`, used via `p-*` prefix):
- Color tokens: `p-brand-{50..900}`, `p-sepia-{50..900}`, `p-honey-{100/300/500/700}`, `p-paper`, `p-surface`, `p-ink`
- CSS classes: `.page-card`, `.page-corner`, `.stitch`, `.stitch-v`, `.tabbar-shadow`, `.parent-focus`, `.font-serif`

The teacher portal uses standard `brand-{*}` tokens (lavender purple, #7A6FA8 family).

**Parent portal pages and their actual token usage:**

| File | Header tokens | Body tokens | Assessment |
|------|--------------|------------|-----------|
| `Layout.jsx` | `bg-p-paper text-p-ink` | — | ✅ PARENT |
| `MobileTabBar.jsx` | `p-brand-*` active states, `tabbar-shadow` | — | ✅ PARENT |
| `DesktopTopNav.jsx` | `p-brand-*` | — | ✅ PARENT |
| `DayCard.jsx` | `page-card page-corner`, `p-brand-*`, `p-honey-*`, `p-sepia-*` | `.stitch`, `font-serif` | ✅ PARENT |
| `Dashboard.jsx` | `page-card`, `p-brand-*`, `p-sepia-*` | `.stitch` divider | ✅ PARENT |
| `ChildProfile.jsx` | `page-card page-corner`, `p-brand-*`, `p-sepia-*`, `p-ink` | MessageModal/MessagesModal | ✅ PARENT |
| `ChildProfileHero.jsx` | `page-card page-corner`, `p-sepia-*`, `p-brand-*` | `border-p-sepia-200`, `bg-p-sepia-100` | ✅ PARENT |
| `ChildIRR.jsx` | **SPLIT** — header: `bg-p-brand-700` ✅ | Progression rows: `text-slate-700`, `bg-slate-100`, `text-success-600`, `bg-success-500` ❌ | ⚠️ MIXED |
| `TeacherRating.jsx` | Header: `bg-p-brand-700` ✅ | Rating form: `bg-brand-100`, `border-brand-200` ❌ School rating: `from-green-500`, `bg-success-600` ❌ | ⚠️ MIXED |
| `EmotionalMonitoringSection.jsx` | `bg-surface border-slate-100` | `text-brand-600`, `bg-success-500` | ❌ TEACHER |
| `Chat.jsx` | `from-brand-500 to-brand-400` | `bg-brand-50`, `bg-brand-600`, `focus:ring-brand-500` | ❌ TEACHER |
| `Activities.jsx` | `from-brand-500 to-brand-400` | `bg-brand-50`, `text-brand-600`, `border-brand-100` | ❌ TEACHER |
| `Meals.jsx` | `from-brand-600 to-brand-500` | `ring-brand-500`, semantic meal colors | ❌ TEACHER |
| `Media.jsx` | `from-brand-500 to-brand-400` | `bg-brand-50`, `ring-brand-500` | ❌ TEACHER |
| `Settings.jsx` | `text-slate-900` (no gradient) | `text-brand-600`, `ring-brand-500`, `bg-brand-600` | ❌ TEACHER |
| `Help.jsx` | `from-brand-500 to-brand-400` | `bg-brand-50`, `text-brand-600` | ❌ TEACHER |
| `Notifications.jsx` | `from-brand-500 to-brand-400` | `bg-brand-50`, `bg-brand-500`, `border-brand-200` | ❌ TEACHER |
| `Therapy.jsx` | **No header card** — plain `h1 text-2xl text-slate-900` | `bg-brand-600`, `ring-brand-500` | ❌ TEACHER |
| `AIWarnings.jsx` | **No header card** — plain `h1` | `bg-brand-600`, `bg-brand-100` | ❌ TEACHER |
| `ChangePassword.jsx` | `bg-brand-100`, `text-brand-600` | `bg-brand-600`, `ring-brand-600` | ❌ TEACHER |

**Score: 7 files use parent tokens (PARENT ✅), 11 files use teacher lavender tokens (❌), 2 files are split (⚠️).**

The parent portal was partially re-skinned. The "shell" (Layout, nav, DayCard, Dashboard) is parent-themed. The "content" pages (Chat, Activities, Meals, Media, Settings, Help, Notifications, Therapy, AIWarnings, ChangePassword) were never re-skinned.

**Practical effect:** A parent opening Bugun (/) sees warm amber/sepia tones. Opening Xabarlar (/chat), they see lavender purple headers identical to the teacher portal. Opening /activities, same. The brand identity is inconsistent within the same session.

---

## 2. PER-PAGE GROUND TRUTH — PARENT PORTAL

### `/` — Dashboard
- Renders: DayCard (today's summary), QuickLinks grid (5 links)
- DayCard shows: meal count, emotional state, activities count, media count — pulled from `/teacher/day-summary` via shared cache util
- QuickLinks: Activities, Meals, Media, Child profile, Rating
- Design: ✅ full parent tokens — `page-card`, `.stitch`, `p-brand-*`, `p-sepia-*`, `font-serif` date
- ChildSwitcher shown in DesktopTopNav right side; compact mode on mobile
- **No onboarding or first-run state**

### `/activities` — ParentActivities
- Shows: individual plan (IEP) cards in a grid, detail modal on click
- Data: `GET /activities?childId=<id>` → cached in `parent:activities:<childId>`
- Card displays: skill, goal, start/end dates, teacher name, services tags
- Header: `from-brand-500 to-brand-400` (teacher purple gradient ❌)
- Empty state: FileX icon + i18n empty text

### `/meals` — ParentMeals
- Shows: date picker (dropdown of available dates), filtered meal cards
- Meal types: Breakfast (amber), Lunch/Dinner (blue), Snack (success-green)
- Shows: meal name, type, time, description, quantity, eaten/skipped status, special notes
- Nutrition summary card at bottom (dark bg-slate-900 styled)
- Header: `from-brand-600 to-brand-500` ❌
- Data: `GET /meals?childId=<id>` → cached in `parent:meals:<childId>`

### `/media` — ParentMedia
- Shows: media grid (photos + videos), filter buttons (All/Photo/Video)
- Cards: aspect-4/5 with hover overlay, video auto-plays on hover
- Modal: left-panel media viewer + right-panel info sidebar
- Appwrite URLs proxied through `/api/media/proxy/:id`
- YouTube/Vimeo embedded via iframe; direct video has custom controls (play, skip ±10s, volume, scrubber)
- Header: `from-brand-500 to-brand-400` ❌

### `/chat` — ParentChat
- Shows: conversation thread with teacher, edit/delete own messages, send input
- Message bubbles: parent messages `bg-brand-50 text-brand-900` (teacher lavender tint ❌), teacher messages `bg-slate-100`
- Real-time: socket.io `chat:message` event triggers reload
- **V5-CRIT-01 ACTIVE:** Chat send is broken — chatValidator.js rejects `parent:<UUID>` conversationId format that chatController uses. All sends fail.

### `/child` — ChildProfile
- Shows: hero card (avatar, name, age, school, group), tab sections
- Sub-components: ChildProfileHero (✅ parent tokens), EmotionalMonitoringSection (❌ teacher tokens)
- Tabs include: monitoring journal, messages modal, avatar upload
- Avatar click → AvatarUploadModal
- Messages: MessagesModal opens full message history (fetches `/parent/messages`)
- MessageModal: single compose modal
- Design: ✅ `page-card page-corner`, `p-brand-*`, `p-sepia-*`, `p-ink`

### `/notifications` — Notifications (ORPHANED — no nav entry)
- Shows: header, filter tabs (All/Unread/Read), notification list cards
- Features: mark as read, mark all read, delete
- Notification types: activity (brand), meal (success), media (brand), default (slate)
- Unread cards: `bg-brand-50 border-brand-200` ❌
- Real-time: `notification:new` socket event triggers refresh
- Data: `GET /notifications/count` (badge) and `GET /notifications` (full list)

### `/help` — Help (ORPHANED — no nav entry)
- Shows: header, contact card (email + phone from i18n), FAQ list (4 items from i18n), Quick Links card
- Quick Links: /activities, /media, /meals, /settings
- All content pulled from i18n keys: `help.q1–q4`, `help.a1–a4`, `help.emailValue`, `help.phoneValue`
- Header: `from-brand-500 to-brand-400` ❌

### `/rating` — TeacherRating
- Shows: teacher rating form (1–5 stars + comment) and school rating form (1–5 stars), submission history
- Header: `bg-p-brand-700` ✅ (parent token)
- Teacher rating form: `bg-brand-100 border-brand-200` ❌ (teacher lavender fills)
- School rating form: `from-green-500 to-green-400`, `bg-success-600` ❌ (semantic green)
- Submit buttons: `bg-brand-600` ❌
- Data: `GET/POST /teacher-ratings` and `GET/POST /school-ratings`

### `/settings` — ParentSettings
- Shows: profile form (firstName, lastName, email disabled, phone), notification prefs checkbox, language switcher, password change form, logout button
- Auth import: `../../shared/context/AuthContext` (re-uses teacher's AuthContext — correct, parent AuthContext.jsx is a re-export passthrough)
- Avatar display: reads from user.avatar but shows "change in profile page" notice
- All fields styled with `focus:ring-brand-500` ❌
- Logout: calls `logout()` then navigates to `/login`
- Password change: `PUT /user/password`
- Profile update: `PUT /user/profile`

### `/settings` settings note
- `Settings.jsx` imports from `api` via `../../shared/services/api` (via teacher's shared dir, not parent/services/api). This is functionally equivalent since `parent/services/api.js` re-exports the same thing. ✓

### `/therapy` — Therapy (ORPHANED — no nav entry)
- Shows: search input, filter buttons (All/Musiqa/Video/Tavsiya), card grid, active session banner
- **No header gradient card** — breaks the pattern of all other parent pages; plain `h1 text-2xl font-bold text-slate-900`
- Card: icon, title, description, duration, star rating, tags, Start button
- Start session: `POST /therapy/:id/start` → sets activeSession state
- End session: `PUT /therapy/usage/:id/end`
- Tags styled with `bg-slate-100` (neutral) ✓
- Type icons: music→purple-50, video→brand-50, content→success-50

### `/irr` — ChildIRR (ORPHANED — no nav entry)
- Shows: header card (`bg-p-brand-700` gradient, `p-ink` text ✅), progression section, goals list
- Header: ✅ parent tokens
- Progression table: columns for session type, score/max, date
  - Rows use `text-slate-700`, `bg-slate-100` backgrounds for score badges ❌ (not parent tokens)
  - Score breakdown badges: `text-success-600 bg-success-500` or `text-warning-600 bg-warning-500` ❌
- Goals section: renders each long-term goal + its short-term children; purely read-only
- Data: `GET /parent/children/:id/irr` → `{ irr, sessions, longTermGoals, goalPeriods, shortTermGoals }`
- Import: `SKILL_AREAS` from `@shared/config/skillAreas` ✓

### `/change-password` — ParentChangePassword
- Full-screen centered card (NOT wrapped in Layout — standalone route outside ParentApp)
- Shows: current password, new password (min 8, must have upper/lower/digit), confirm
- Uses: `bg-brand-100`, `text-brand-600` icon ❌
- On success: sets `user.mustChangePassword = false`, navigates to `/`

---

## 3. PER-PAGE GROUND TRUTH — TEACHER PORTAL

### `/teacher` — Dashboard
- Two render branches: desktop (md:block) and mobile (md:hidden)
- Desktop: h1 "Bugun" with `borderLeft: 3px solid #7A6FA8`, welcome message, today's date, "Yangi yozuv" link
- "Sinf bir qarashda": child avatar grid with colored attendance dots (present=green, absent=slate, late=amber, sick=blue)
- 3-col stats: Davomat (attendance %), Kuzatuvlar bugun (observations), Yangi xabarlar (parent messages)
- Attention section: cards for absent/needs-attention children, each with "Xabar" CTA linking to `/teacher/chat`
- Bottom 2-col: recent observations list, quick links (Davomat, Bolalar ro'yxati, Chat, Kun jurnali)
- Ribbon colors per child: `useChildRibbon()` hook assigns a child-specific accent color for border-left
- No `brand-*` class utilities in JSX; uses `bg-brand-600`, `text-brand-700`, `bg-brand-50` for interactive elements

### `/teacher/children/:id` — ChildDetail
- 5 tabs: IEP Maqsadlar, Kuzatuvlar, Hujjatlar, Xabarlar, Galereya
- IEP tab: goal list with GoalHeatmap (12-square progress grid using hex colors)
- Outcome chips: mastered (green), independent (green), assisted (amber), emerging (lavender), struggling (amber)
- Parent info: phone/email with tel:/mailto: links
- Uses hardcoded color tokens matching teacher design language (#7AB89A, #BFB2D3, #C58A1F)

### `/teacher/children/:id/irr` — IrrShell
- Full IRR CRUD (1715 lines)
- Sections: Header form (9 required fields + 2 optional), Needs assessment (2 optional), Assessment sessions (17 criteria × 5 scores), Long-term goals (max 5), Goal periods + short-term goals (3–5 per period), Quarterly review + teacher signature, Daily monitoring journal (27 items: 9 hygiene + 11 health + 7 GI), Weekly monitoring journal (18 items: 9 emotional + 9 environment)
- Assessment scoring: buttons 4→3→2→1→0 (best→worst), selected state: `#4F46E5` (indigo, hardcoded)
- Status badge: draft/active/archived via inline style (not Tailwind tokens)
- Save buttons: `bg-brand-600 text-surface` ✓ (teacher tokens)
- Activate button: inline `background: '#E2F0E8', color: '#4F8C72'` (mint green, hardcoded)
- Teacher signature button: `borderColor: '#A8D2BC', color: '#4F8C72'` (hardcoded)

### Teacher Sidebar
- Dark panel (#2A2530) with brand accent (#7A6FA8) — all hardcoded inline styles
- Nav sections: Bugun (Dashboard, Davomat), Bolalar (Guruh ro'yxati, Galereya), IEP (Maqsadlar, Kuzatuvlar), Aloqa (Ota-onalar, Kun jurnali), Settings
- Chat badge: polls `/chat/unread-count?prefix=parent:&role=teacher` + socket `chat:message` refresh
- Language pill: UZ / RU / EN inline switcher at bottom
- Active item: `rgba(122,111,168,.18)` bg + 3px left border `#7A6FA8`
- Hover: background `#3A3340`

### Teacher MobileTabBar
- 4 tabs + center FAB: Bugun(/teacher), Bolalar(/teacher/parents), [FAB=QuickObservation], Xabarlar(/teacher/chat), Profil(/teacher/profile)
- FAB: `bg-brand-600` circle button opens QuickObservation modal
- Active tab icon: `#7A6FA8` (teacher brand purple), inactive: `#6F7585`

---

## 4. WIRING / DATA FLOW

### Parent API
- `parent/services/api.js` → re-exports `@shared/services/api` (cookie-based Axios instance, `withCredentials: true`)
- `parent/context/AuthContext.jsx` → re-exports `../../shared/context/AuthContext` (intentional, single Auth provider)
- `parent/context/ChildContext.jsx` → `GET /child` to fetch parent's children list; localStorage persistence of `selectedChildId`; 2-minute cache
- `parent/context/NotificationContext.jsx` → `GET /notifications/count` on mount + socket `notification:new`; `loadAllNotifications()` fetches full list

### Teacher API
- `teacher/src/shared/services/api.js` → same shared cookie-based Axios
- Teacher pages import from `../shared/services/api` or `../../shared/services/api`

### Shared utilities
- `shared/utils/cache.js` — in-memory cache with TTL, used by both parent and teacher pages
- `@shared/config/skillAreas` — skill area config for IRR goals
- `@shared/config/assessmentCriteria` — 17 assessment criteria
- `@shared/config/dailyJournalItems` / `weeklyJournalItems` — monitoring journal items

---

## 5. OPEN BUGS / KNOWN BROKEN STATE

| ID | Severity | Location | Description |
|----|----------|----------|-------------|
| V5-CRIT-01 | CRITICAL | `Chat.jsx` + backend chatValidator.js | **Chat send is 100% broken.** Frontend sends `conversationId = "parent:<uuid>"`, backend validator rejects non-UUID format. Every parent `POST /chat` fails silently (no error shown). Confirmed in V5 audit; not yet fixed. |
| NAV-01 | HIGH | `MobileTabBar.jsx`, `DesktopTopNav.jsx` | `/irr`, `/therapy`, `/notifications`, `/help` have no navigation entry. `/settings` entry point is circular (Help → Settings, but Help is unreachable). 5 routes are effectively invisible. |
| SKIN-01 | MEDIUM | 11 parent pages | `Chat`, `Activities`, `Meals`, `Media`, `Settings`, `Help`, `Notifications`, `Therapy`, `AIWarnings`, `ChangePassword`, `EmotionalMonitoringSection` use teacher lavender `brand-*` tokens instead of parent `p-brand-*`. The portal has two visual identities depending on which page you're on. |
| SKIN-02 | LOW | `ChildIRR.jsx`, `TeacherRating.jsx` | Partially re-skinned: header card uses `p-brand-*` but interior content uses teacher/semantic tokens. Inconsistent within a single page. |
| THERAPY-01 | LOW | `Therapy.jsx` | No gradient header card — breaks the visual pattern every other parent page follows. Plain `h1 text-2xl`. |
| AIWARNINGS-01 | INFO | `AIWarnings.jsx` | Resolve button condition is `user?.role !== 'parent'` — parents see the list but never see the resolve button. UX question: why show AI warnings to parents if they can't act on them? No parent-specific message. |
| NOTIF-BADGE-01 | LOW | `MobileTabBar.jsx` | Notification count badge is shown on the Chat tab (not a dedicated Notifications tab). Parents see "3" on the Xabarlar tab but those are notifications, not chat messages. Confusing. |

---

## 6. WHAT IS WORKING CORRECTLY

- Auth flow: JWT 15m access + 7d refresh, cookie-based ✓
- Child switching: `ChildContext` + `ChildSwitcher` component correctly persists selection in localStorage ✓
- Real-time: socket `chat:message` and `notification:new` events update UI ✓ (underlying chat send is broken, but the listener pattern is correct)
- Caching: in-memory cache with TTL prevents unnecessary API calls on navigation ✓
- Language switching: i18n configured, 3 locales (uz/ru/en), teacher and parent both have language switchers ✓
- Parent ChangePassword page: standalone (outside Layout), accessible at `/change-password` ✓, password strength validated ✓
- IRR teacher → parent symmetry: Teacher creates/edits in IrrShell, parent sees read-only progression in ChildIRR ✓
- Image proxy: Media page converts Appwrite URLs to `/api/media/proxy/:id` ✓
- Video player: custom controls (play/pause, skip ±10s, volume, scrubber, auto-hide) ✓
- Error boundaries: `<ErrorBoundary>` wraps every route in App.jsx ✓

---

## 7. VERDICT

**Parent portal:** The infrastructure is complete (all routes exist, all pages render, auth/child context works) but the UX has two significant gaps:  
1. **5 routes are unreachable** without typing the URL directly — no navigation entry points exist  
2. **11 of 20 pages are not skinned with the parent design system** — they look like the teacher portal

**Teacher portal:** Complete, consistent, all routes navigable. IrrShell is the largest component (1715 lines) and handles the full IRR lifecycle correctly. Design is internally consistent (dark sidebar, `brand-*` lavender for interactives, `bg-paper` content area).

**The most urgent pre-launch items from this pass (no fixes made):**
1. Fix V5-CRIT-01 (chat send broken) — blocks a core feature
2. Add navigation entries for orphaned routes — especially `/notifications` and `/settings`  
3. Re-skin the 11 parent pages that still use teacher `brand-*` tokens

---

## 8. ADDITIONAL FINDINGS (background static analysis agent)

### 8.1 Hard Bug: `bg-cream` undefined in ChangePassword.jsx
`parent/pages/ChangePassword.jsx` line 61: `min-h-screen bg-cream flex items-center justify-center p-4`  
`cream` does not exist in `tailwind.config.js`, `tailwind.base.js`, or `index.css`. The background will be transparent in production (shows through to whatever body background is behind it — likely `bg-p-paper` or white). Not a crash but a visible visual defect on the forced-password-change screen.

### 8.2 Undefined Token Classes (Built-in Fallback Risk)
These Tailwind class prefixes are used in parent pages but **not defined in `teacher/tailwind.config.js`**. They render via Tailwind's built-in palette IF content scanning picks them up; if PurgeCSS removes unused utilities, they break silently in production builds:

| Token family | Files using it | Should be |
|---|---|---|
| `blue-*` | `Meals.jsx`, `MessageModal.jsx`, `MessagesModal.jsx` | Possibly `info-*` or a semantic meal token |
| `purple-*` | `Therapy.jsx` | — |
| `orange-*` | `AIWarnings.jsx` | `warning-*` (IS defined) |
| `amber-*` | `ChildIRR.jsx`, `MessagesModal.jsx`, `MessageModal.jsx` | — |
| `green-*` | `TeacherRating.jsx` | `success-*` (IS defined) |

### 8.3 Orphaned Parent Components (Dead Code)
Three parent components are defined but never imported by the current `Layout.jsx`:

| File | Reason orphaned |
|---|---|
| `parent/components/BottomNav.jsx` | Replaced by `MobileTabBar.jsx`; uses old teacher tokens; has `nav.irr` i18n key missing from all locales |
| `parent/components/TopBar.jsx` | Replaced by `DesktopTopNav.jsx`; uses old teacher tokens |
| `parent/components/Sidebar.jsx` (parent-side) | Replaced by `DesktopTopNav.jsx`; uses old teacher tokens including `bg-bark-*` |

### 8.4 Missing i18n Keys
These `t()` calls reference keys that do not exist in the locale files; all fall back to `defaultValue:` (hardcoded strings — not crashes, but bypasses the i18n catalog):

| Key | File | Fallback |
|---|---|---|
| `dashboard.childStatus` | `Dashboard.jsx` | Hardcoded Uzbek `'Hissiy holat'` |
| `profile.logoutSuccess` / `logoutTitle` / `confirmLogout` / `yes` / `account` / `changeInProfile` / `profilePicture` | `ChildProfile.jsx` | Various English defaultValues |

### 8.5 `localStorage` Key Not User-Scoped
`ChildContext.jsx` stores `selectedChildId` under the bare key `'selectedChildId'` with no user prefix. On a shared device where two parents log in sequentially, the stored child ID from the first session persists and may resolve to a different parent's child on the second login. Low risk for this use-case (school computers are rarely shared by parents), but worth noting.

### 8.6 Dead `useAuth()` Call in Therapy.jsx
`Therapy.jsx` calls `useAuth()` at line ~12 without assigning the return value (`useAuth()` with no destructuring). The hook runs for its side effect but the `user` object is never used. Likely a leftover from an earlier version that required auth-gated display logic.

### 8.7 `parent-focus` CSS Class Defined but Never Used
`teacher/src/index.css` defines `.parent-focus:focus-visible { outline: 2px solid #2D5377; ... }`. No audited component applies this class. Dead CSS that can be removed.

### 8.8 `IrrShell.jsx` Hardcoded Hex Colors
The teacher IRR form (IrrShell.jsx) uses inline `style={{ background: '#4F46E5', color: '#FFFFFF' }}` and related hardcoded hex values for selected states, error banners, activation buttons, and sign buttons. These bypass the Tailwind token system entirely and will be invisible to any future design token refactor. The indigo `#4F46E5` is not in any token definition.

---

*No fixes were made during this investigation. This document is evidence-only.*
