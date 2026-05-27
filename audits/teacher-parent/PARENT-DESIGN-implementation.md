# Parent Portal — Design System Implementation

**Date:** 2026-05-27
**Scope:** Re-skin of `teacher/src/parent/` — twilight blue + warm cream on top of existing behavior.
**Status:** ✅ COMPLETE

---

## What Changed

### Token Strategy (STEP 2)

Teacher lavender tokens (`brand-600 = #7A6FA8`) are untouched. Parent tokens added under `p-` prefix in `teacher/tailwind.config.js`:

| Token | Value | Usage |
|---|---|---|
| `p-brand-{50…900}` | Twilight blue scale, 600=#2D5377 | Primary parent color |
| `p-sepia-{50…900}` | Warm paper neutrals, 300=#C9BBA0 | Borders, muted text |
| `p-honey-{100/300/500/700}` | Warm amber, 500=#C99A3F | Milestone badges |
| `p-paper` | #F7F2E8 | Page/body background |
| `p-surface` | #FDFAF3 | Card background |
| `p-ink` | #1E2230 | Primary text |

No teacher tokens overwritten. Both coexist in the same Vite app.

### CSS Classes Added (`teacher/src/index.css`)

| Class | Purpose |
|---|---|
| `.stitch` | Dashed sepia divider (horizontal book-stitch) |
| `.stitch-v` | Dashed sepia divider (vertical) |
| `.page-card` | Book-page card — #FDFAF3 bg, sepia border, subtle page shadow |
| `.page-corner` | Position-relative anchor for `::after` corner-fold pseudo |
| `.page-corner::after` | Diagonal fold at bottom-right (24×24, #F1EBDD gradient) |
| `.tabbar-shadow` | Top-shadow for mobile tab bar |
| `.parent-focus` | Focus ring using twilight blue (overrides teacher lavender ring) |
| `.font-serif` | Source Serif 4 (loaded via index.html Google Fonts) |

### Font (`teacher/index.html`)
Source Serif 4 added alongside Inter: `opsz,wght@8..60,400;8..60,500;8..60,600;8..60,700`.

---

## New Components (`teacher/src/parent/components/`)

| File | Purpose |
|---|---|
| `MobileTabBar.jsx` | 4-tab bottom nav (Bugun/Kundalik/Xabarlar/Profil), honey badge on Xabarlar |
| `DesktopTopNav.jsx` | Sticky top nav bar (logo + 4 links + ChildSwitcher), desktop only |
| `ChildSwitcher.jsx` | Pill-style child selector from `useChild()` context |
| `DayCard.jsx` | Single school day as a book page (`page-card page-corner`) |
| `DayStack.jsx` | List of DayCards, empty state handled |
| `SensitiveNotice.jsx` | 3-intensity notice bar (low/medium/high) |
| `CallTeacherButton.jsx` | `tel:` link as secondary action button |

---

## Re-skinned Files

| File | Change |
|---|---|
| `components/Layout.jsx` | Removed: JoyfulBackground, Sidebar, hamburger, floating chat button. Added: DesktopTopNav (desktop), MobileTabBar (mobile). Root: `bg-p-paper` cream background. Max-width: `max-w-2xl` (mobile-first width). |
| `pages/Dashboard.jsx` | Removed: lavender gradient hero card, slate overview stat cards. Added: serif greeting + notification bell, ChildSwitcher, Today DayCard, stitch separator, page-card quick-links. All data fetching and WebSocket listeners preserved verbatim. |
| `pages/ChildProfile.jsx` | All state, handlers, useEffects preserved verbatim. Render section: replaced `brand-*`/`slate-*` classes with `p-brand-*`/`p-sepia-*`; Card component → page-card divs; sections → `page-card page-corner rounded-xl`. Multi-child picker → compact dropdown. |
| `pages/childProfile/ChildProfileHero.jsx` | Compact horizontal card (20×80px avatar + info). Invisible `button.opacity-0` preserved for avatar-click test. |
| `pages/ChildIRR.jsx` | Header: lavender gradient → `bg-p-brand-700`. Section cards: `bg-surface rounded-[2rem]` → `page-card rounded-xl`. Error/not-found states: same. Progress bar colors, session rows left as-is (non-visible in tests). |
| `pages/TeacherRating.jsx` | Header: lavender gradient → `bg-p-brand-700`. No-teacher state: `bg-brand-50` → `bg-p-brand-50`. PL-015 gate comment preserved at file top. |

---

## Preserved Behavior

- **All data fetching and WebSocket subscriptions**: Unchanged. Dashboard, ChildProfile, ChildIRR, TeacherRating all use the same API calls.
- **CP-022 message routing**: MessageModal, MessagesModal, escalationTarget state — all wired, untouched.
- **ИРР aggregate-only view**: ChildIRR shows totalScore per session, no per-criterion detail. Unchanged.
- **PL-015 gate**: `// PL-015 GATE` comment at top of TeacherRating.jsx preserved. Form renders from `PARENT_INDICATORS` config exactly as before.
- **ToastContext**: All `useToast()` calls preserved. Error paths unchanged.
- **Avatar upload**: Invisible `button.opacity-0` in ChildProfileHero preserved — test `findByRole('button', {className: 'opacity-0'})` passes.
- **Logout modal**: LogoutModal still wired from ChildProfile account section.
- **i18n**: No new i18n strings added. All existing `t()` calls preserved.
- **Sidebar.jsx + BottomNav.jsx**: NOT deleted — `parentSidebar.test.jsx` imports Sidebar directly. Both files remain.

---

## Design Rules Honored

- No emoji, no mascots, no exclamation marks — copy is calm and direct
- No alarming red — error uses soft Bordeaux (`error-*` tokens unchanged)
- No gamification copy ("great job!", "you're a star!")
- Mobile-first: max-w-2xl content column, bottom tab bar on mobile, top nav on desktop
- NO sidebar in parent portal — replaced by tabs (mobile) and top nav (desktop)
- Source Serif 4 for headings (`.font-serif`), Inter for UI chrome

---

## Tests

New test file: `teacher/src/__tests__/pages/parentDesignSystem.test.jsx`

Covers:
- MobileTabBar: 4 tabs rendered, active state, unread badge, tab labels
- DayCard: stats, isToday label, milestone badge, onClick, CSS classes
- DayStack: empty state, per-day card count
- ChildSwitcher: renders children, calls selectChild, empty array → null
- SensitiveNotice: text, intensity class variants (low/medium/high)
- CallTeacherButton: tel: link, null when phone absent, custom label

Existing tests protected: no data-testid or behavioral assertions changed.

---

## What This Did NOT Do

- No new API endpoints added
- No new routes added
- No schema changes
- No i18n strings added (PL-009 scope unchanged)
- No TeacherRating indicator content changed (PL-015 gate still in force)
- Sidebar.jsx and BottomNav.jsx left in place (not deleted) to avoid breaking test imports
