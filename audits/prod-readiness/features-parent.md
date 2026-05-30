# Parent Portal — Feature Inventory
**Source commit:** 6c34f4faba64f8b2ed41fb1f0871f8e20ac68e2d  
**Date:** 2026-05-30  
**Method:** atomic-grain, code-sourced  
**Total features:** 106 (✅ 36 · 🟡 70 · ❌ 0 · 🚧 0)

---
## 1. Auth & Onboarding

| # | Feature | Where (file:line) | Status | Test scenario |
|---|---|---|---|---|
| P-001 | Login with email+password | backend/routes/authRoutes.js:13 · teacher/src/pages/Login.jsx | 🟡 | Log in as parent1@uchqun.uz with password, expect JWT cookie + redirect to dashboard |
| P-002 | Refresh JWT token | backend/routes/authRoutes.js:15 · teacher/src/shared/context/AuthContext.jsx | 🟡 | Navigate away and back; expect token silently refreshed |
| P-003 | Logout | backend/routes/authRoutes.js:18 · teacher/src/parent/pages/childProfile/LogoutModal.jsx:30 | 🟡 | Click Exit button in profile, confirm modal → POST /logout → redirect to /login |
| P-004 | Change password (first login) | backend/routes/authRoutes.js:16 · teacher/src/parent/pages/ChangePassword.jsx:39 | ✅ | Log in with mustChangePassword=true → force /change-password → submit new password with uppercase, lowercase, digit → expect redirect to dashboard |
| P-005 | Change password (settings) | teacher/src/parent/pages/Settings.jsx:100 · backend/routes/parentRoutes.js (via /user/password) | 🟡 | In Settings, enter current + new password → PUT /user/password → expect toast success + form reset |
| P-006 | Parent role check on login | backend/middleware/auth.js:102 (skips isActive for parent) | 🟡 | Parent with status=suspended can still login (intentional per CP-020 bypass) |

---
## 2. Navigation & Layout

| # | Feature | Where (file:line) | Status | Test scenario |
|---|---|---|---|---|
| P-007 | Mobile tab bar (4 tabs) | teacher/src/parent/components/MobileTabBar.jsx:5-10 | ✅ | On mobile, see bottom nav with Bugun, Kundalik, Xabarlar, Profil tabs; active tab highlighted |
| P-008 | Desktop top nav (4 links) | teacher/src/parent/components/DesktopTopNav.jsx:6-11 | 🟡 | On desktop, see top nav with same links + notification bell + settings gear + child switcher |
| P-009 | Notification badge on nav | teacher/src/parent/components/MobileTabBar.jsx:24-39 · teacher/src/parent/components/DesktopTopNav.jsx:57-62 | 🟡 | When count > 0, show red badge with count (capped at 9+) |
| P-010 | Active route highlighting | teacher/src/parent/components/MobileTabBar.jsx:15-18 · teacher/src/parent/components/DesktopTopNav.jsx:17-18 | 🟡 | Current page nav item highlighted with brand color; non-active items grayed |
| P-011 | Sidebar (desktop variant) | teacher/src/parent/components/Sidebar.jsx | 🟡 | Expanded menu with 10 nav items + unread chat/notification badges; user profile footer |

---
## 3. Account & Child Management

| # | Feature | Where (file:line) | Status | Test scenario |
|---|---|---|---|---|
| P-012 | Switch between multiple children | teacher/src/parent/components/ChildSwitcher.jsx · teacher/src/parent/pages/ChildProfile.jsx:247-263 | 🟡 | Parent with 2+ children can select via dropdown or button pills; page reloads with new childId |
| P-013 | Language switcher (Uz/Ru/En) | teacher/src/parent/components/LanguageSwitcher.jsx · teacher/src/parent/pages/Settings.jsx:129 | 🟡 | Click language selector in settings/profile, choose language, UI updates to new locale |
| P-014 | View parent profile fields | teacher/src/parent/pages/Settings.jsx:39-48 | 🟡 | See firstName, lastName, email, phone, notification preferences filled from auth context |
| P-015 | Edit profile (name, phone, notifications) | teacher/src/parent/pages/Settings.jsx:63-83 | 🟡 | Update name/phone → PUT /user/profile → toast success + context updates |

---
## 4. Dashboard & Overview

| # | Feature | Where (file:line) | Status | Test scenario |
|---|---|---|---|---|
| P-016 | Dashboard home page | teacher/src/parent/pages/Dashboard.jsx:16-204 | ✅ | Load /, see greeting with parent name + child switcher + today's day card + 8 quick link cards |
| P-017 | Fetch and cache dashboard stats | teacher/src/parent/pages/Dashboard.jsx:29-94 | 🟡 | Load dashboard: fetch /activities, /meals, /media, /parent/ratings, /parent/emotional-monitoring in parallel; display counts and teacher rating |
| P-018 | Today's day card (counts) | teacher/src/parent/pages/Dashboard.jsx:160-175 | 🟡 | Show summary card with activities count, meals count, media count for today |
| P-019 | Quick access links (8 items) | teacher/src/parent/pages/Dashboard.jsx:121-199 | ✅ | 8 linkable cards: Activities, Meals, Media, Child Status %, Teacher Rating, ИРР, Therapy, Help; click → navigate |
| P-020 | Real-time dashboard refresh | teacher/src/parent/pages/Dashboard.jsx:102-111 | 🟡 | Listen on socket events (activity:created, meal:updated, media:deleted, child:updated); cache invalidate + refetch |

---
## 5. Child Profile & Features

| # | Feature | Where (file:line) | Status | Test scenario |
|---|---|---|---|---|
| P-021 | Select child from list | teacher/src/parent/pages/ChildProfile.jsx:194-219 | ✅ | If parent has 2+ children and none selected, show list of children; click → selectChild → reload page |
| P-022 | View child basic info (hero section) | teacher/src/parent/pages/ChildProfile.jsx:267-276 | 🟡 | See child photo (with upload modal), name, assigned teacher, school, group |
| P-023 | Upload child avatar | teacher/src/parent/pages/childProfile/AvatarUploadModal.jsx | 🟡 | Click photo → modal with 4 avatar choices → select → POST /child/avatar → toast success + photo updates |
| P-024 | View child basic info (card) | teacher/src/parent/pages/ChildProfile.jsx:279-289 | 🟡 | Card with name, date of birth, diagnosis (disability type), assigned teacher |
| P-025 | View special needs description | teacher/src/parent/pages/ChildProfile.jsx:291-297 | 🟡 | Read-only text card displaying child's special needs from DB |
| P-026 | View emotional monitoring records | teacher/src/parent/pages/ChildProfile.jsx:299 | 🟡 | Latest emotional monitoring snapshot: emotionalState fields (% completion) |
| P-027 | View weekly stats (activities/meals/media) | teacher/src/parent/pages/ChildProfile.jsx:301-309 | 🟡 | Dark card showing 7-day rolling counts for activities, meals, media |
| P-028 | Account action buttons (IRR, Settings, Govt Message, View Messages) | teacher/src/parent/pages/ChildProfile.jsx:324-366 | ✅ | 4-5 action buttons in account section; click → navigate or open modal |

---
## 6. Activities & Individual Lessons

| # | Feature | Where (file:line) | Status | Test scenario |
|---|---|---|---|---|
| P-029 | List all child's activities (cards) | teacher/src/parent/pages/Activities.jsx:72-183 | 🟡 | Grid of activity cards with skill name, start/end dates, teacher, services pills |
| P-030 | View activity detail modal | teacher/src/parent/pages/Activities.jsx:173-179 · 192-334 | ✅ | Click "Batafsil" button → full modal with goal, dates, tasks, methods, progress, observation, services |
| P-031 | Empty state for activities | teacher/src/parent/pages/Activities.jsx:185-189 | 🟡 | No activities → show "Faoliyatlar yo'q" message with icon |

---
## 7. Meals

| # | Feature | Where (file:line) | Status | Test scenario |
|---|---|---|---|---|
| P-032 | List meals for selected date | teacher/src/parent/pages/Meals.jsx:101-203 | 🟡 | Show all meals for one day with type (Breakfast/Lunch/Snack/Dinner), name, time, eaten status, quantity, special notes |
| P-033 | Select date from dropdown | teacher/src/parent/pages/Meals.jsx:131-149 | 🟡 | Dropdown of available meal dates (latest first); select one → filter meals to that date |
| P-034 | Meal eaten/not eaten indicator | teacher/src/parent/pages/Meals.jsx:185-188 | 🟡 | Green checkmark if meal.eaten; red X if not; label changes |
| P-035 | Daily nutrition summary card | teacher/src/parent/pages/Meals.jsx:212-245 | 🟡 | Dark card showing total meals, eaten count (green), skipped count (red), quality stars |
| P-036 | Empty state for meals | teacher/src/parent/pages/Meals.jsx:204-208 | 🟡 | No meals → show utensils icon + "Ovqatlar yo'q" |

---
## 8. Media (Photos & Videos)

| # | Feature | Where (file:line) | Status | Test scenario |
|---|---|---|---|---|
| P-037 | Grid view of media (photos + videos) | teacher/src/parent/pages/Media.jsx:534-621 | 🟡 | Responsive grid (1-4 cols) of media thumbnails with type badge (photo/video) |
| P-038 | Filter media by type (all/photo/video) | teacher/src/parent/pages/Media.jsx:509-529 | 🟡 | 3 filter buttons with glassmorphic style; click → show only media of that type |
| P-039 | Video preview on hover | teacher/src/parent/pages/Media.jsx:553-575 | 🟡 | Hover over video thumbnail → play preview (muted, looping); show play icon overlay |
| P-040 | Open media in fullscreen modal | teacher/src/parent/pages/Media.jsx:651-668 | 🟡 | Click thumbnail → large modal with image or video player (title, date, description in sidebar) |
| P-041 | Custom video player (play/pause, volume, skip, progress) | teacher/src/parent/pages/Media.jsx:62-444 | 🟡 | Play/pause, skip ±10s, mute, volume slider, progress bar, time display; auto-hide controls |
| P-042 | YouTube & Vimeo embed support | teacher/src/parent/pages/Media.jsx:46-59, 213-258 | 🟡 | Detect YT/Vimeo URLs → embed iframe (fullscreen allowed) |
| P-043 | Appwrite proxy for videos | teacher/src/parent/pages/Media.jsx:26-43 | 🟡 | Convert Appwrite storage URL to /api/media/proxy/ID → use in video src |
| P-044 | Empty state for media | teacher/src/parent/pages/Media.jsx:623-627 | 🟡 | No media → show image icon + "Rasmlar va videolar yo'q" |

---
## 9. Chat with Teacher

| # | Feature | Where (file:line) | Status | Test scenario |
|---|---|---|---|---|
| P-045 | List messages (thread) | teacher/src/parent/pages/Chat.jsx:51-231 | 🟡 | Load /chat → fetch messages for conversationId=parent:userId; show chronological list with sender badges |
| P-046 | Send message to teacher | teacher/src/parent/pages/Chat.jsx:66-79 | 🟡 | Type in input → Enter or Send button → POST to chatStore → message appended; input cleared |
| P-047 | Edit own message | teacher/src/parent/pages/Chat.jsx:81-103 · 193-224 | 🟡 | Click edit pencil on your message → textarea expands → save or cancel |
| P-048 | Delete own message | teacher/src/parent/pages/Chat.jsx:105-121 · 165-188 | 🟡 | Click delete icon → confirm modal → DELETE → optimistic remove + reload |
| P-049 | Auto-scroll to new messages | teacher/src/parent/pages/Chat.jsx:59-64 · 233-243 | 🟡 | New message added → scroll to bottom; if user scrolled up, show "scroll to bottom" button |
| P-050 | Empty state for chat | teacher/src/parent/pages/Chat.jsx:143-146 | 🟡 | No messages → show "Xabarlar yo'q" |
| P-051 | Real-time chat updates | teacher/src/parent/pages/Chat.jsx:27-49 | 🟡 | Listen on chat:message socket event → reload messages |

---
## 10. Notifications Panel

| # | Feature | Where (file:line) | Status | Test scenario |
|---|---|---|---|---|
| P-052 | List all notifications | teacher/src/parent/pages/Notifications.jsx:142-216 | 🟡 | /notifications shows notifications with title, message, timestamp, type icon (activity/meal/media/bell) |
| P-053 | Filter notifications (all/unread/read) | teacher/src/parent/pages/Notifications.jsx:30-140 | 🟡 | 3 filter tabs; click → show only notifications in that state |
| P-054 | Mark single notification as read | teacher/src/parent/pages/Notifications.jsx:194-202 | 🟡 | Click "O'qilgan deb belgilash" → notification.isRead = true → badge disappears |
| P-055 | Mark all notifications as read | teacher/src/parent/pages/Notifications.jsx:96-104 | 🟡 | Click "Barchasini o'qilgan deb belgilash" → all isRead = true |
| P-056 | Delete notification | teacher/src/parent/pages/Notifications.jsx:204-210 | 🟡 | Click delete button → notification removed from list |
| P-057 | Unread count badge on nav | teacher/src/parent/pages/Dashboard.jsx:145-152 · DesktopTopNav.jsx:57-62 | 🟡 | Show red badge on bell icon with unread count (9+ cap) |
| P-058 | Empty state for notifications | teacher/src/parent/pages/Notifications.jsx:218-229 | 🟡 | No notifications → show bell icon + "Bildirishnomalar yo'q" |

---
## 11. ИРР (Individual Development Plan) - READ-ONLY

| # | Feature | Where (file:line) | Status | Test scenario |
|---|---|---|---|---|
| P-059 | View current IСР status | teacher/src/parent/pages/ChildIRR.jsx:138-168 | ✅ | /irr shows header with totalScore / maxScore; progress bar; note explaining max is 68 points |
| P-060 | View assessment progression (sessions) | teacher/src/parent/pages/ChildIRR.jsx:170-213 | ✅ | Show each assessment session (initial, 3mo, 6mo, final) with score, trend icon (up/down/stable), date completed |
| P-061 | View long-term goals | teacher/src/parent/pages/ChildIRR.jsx:215-236 | ✅ | List of long-term goals with skill area label and goal text |
| P-062 | View periods with short-term goals | teacher/src/parent/pages/ChildIRR.jsx:238-318 | ✅ | Group STGs by period; show period label, dates, signed status; expand each STG with review + parentRecommendations |
| P-063 | View parent recommendations (per STG) | teacher/src/parent/pages/ChildIRR.jsx:286-296 | ✅ | Amber-highlighted card with home activity recommendations for each STG |
| P-064 | View STG review/teacher notes | teacher/src/parent/pages/ChildIRR.jsx:278-284 | ✅ | Light gray card showing teacher's assessment review for each STG |
| P-065 | IRR not found state | teacher/src/parent/pages/ChildIRR.jsx:97-111 | ✅ | If no IRR exists, show "Ривожланиш режаси ҳали тузилмаган" message |
| P-066 | IRR load error + retry | teacher/src/parent/pages/ChildIRR.jsx:113-131 | ✅ | If fetch fails, show error message + Retry button |

---
## 12. Teacher Rating (CP-020)

| # | Feature | Where (file:line) | Status | Test scenario |
|---|---|---|---|---|
| P-067 | Rate teacher (5-star) | teacher/src/parent/pages/TeacherRating.jsx:104-150 | 🟡 | Click 1-5 star buttons; stars become interactive buttons with hover; submit → POST /parent/ratings |
| P-068 | Comment on teacher rating | teacher/src/parent/pages/TeacherRating.jsx:25 · 77 | 🟡 | Text area for optional comment; included in POST payload |
| P-069 | Show teacher rating summary | teacher/src/parent/pages/TeacherRating.jsx:71-78, 123-132 | 🟡 | Display: average rating (float), count of ratings, last updated timestamp |
| P-070 | Rate school (5 indicators + comment) | teacher/src/parent/pages/TeacherRating.jsx:152-208 | 🟡 | 5-point scale for each PARENT_INDICATOR; mandatory comment; POST /parent/school-rating with indicators object |
| P-071 | School indicator labels (PL-015 gate) | teacher/src/parent/pages/TeacherRating.jsx:1-3, 12 | 🟡 | Labels loaded from PARENT_INDICATORS config; currently placeholder until partner input (PL-015 gate) |
| P-072 | School rating summary | teacher/src/parent/pages/TeacherRating.jsx:29, 80-84, 192-194 | 🟡 | Show average rating, count of ratings; refresh after submit |

---
## 13. Contact Government (CP-022)

| # | Feature | Where (file:line) | Status | Test scenario |
|---|---|---|---|---|
| P-073 | Compose message to government | teacher/src/parent/pages/childProfile/MessageModal.jsx:96-128 | ✅ | In profile, click "Davlatga xabar yuborish" → modal with subject, message, recipientLevel picker |
| P-074 | Select recipient level (owner/region/republic) | teacher/src/parent/pages/childProfile/MessageModal.jsx:9-40, 171-195 | ✅ | 3 buttons showing Maktab (owner), Viloyat (region), Respublika (republic); click → select |
| P-075 | Default to republic level | teacher/src/parent/pages/childProfile/MessageModal.jsx:72-84 | ✅ | New message defaults to recipientLevel='republic'; escalated messages default to NEXT_LEVEL[escalatedFromLevel] |
| P-076 | Subject input (required validation) | teacher/src/parent/pages/childProfile/MessageModal.jsx:70-98 | ✅ | Text input for subject; validation on send → error toast if empty |
| P-077 | Message body input (required validation) | teacher/src/parent/pages/childProfile/MessageModal.jsx:71-101 | ✅ | Textarea for message; validation on send → error toast if empty |
| P-078 | Send message to government | teacher/src/parent/pages/childProfile/MessageModal.jsx:106-128 | ✅ | POST /parent/message-to-government with subject, message, recipientLevel, escalatedFromId (if escalating) → toast success |
| P-079 | View sent messages with replies | teacher/src/parent/pages/childProfile/MessagesModal.jsx | 🟡 | List of messages with sender, subject, level badge, reply status; click to read reply |
| P-080 | Escalate own message to next level | teacher/src/parent/pages/childProfile/MessagesModal.jsx:80-120 | 🟡 | For non-republic messages, show "Escalate" button → opens MessageModal with escalatedFromId set |
| P-081 | Escalation chain indicator | teacher/src/parent/pages/childProfile/MessagesModal.jsx:50-75 | 🟡 | Show badge/indicator if message.escalatedFromId exists (linked to prior message) |
| P-082 | Government message count badge | teacher/src/parent/pages/ChildProfile.jsx:345-357 | 🟡 | "Mening xabarlarim" button shows badge count of messages with reply |

---
## 14. Useful Materials (Therapy)

| # | Feature | Where (file:line) | Status | Test scenario |
|---|---|---|---|---|
| P-083 | Browse therapy items (music/video/content) | teacher/src/parent/pages/Therapy.jsx:119-240+ | 🟡 | /therapy lists active therapies with icons, descriptions, tags; filter by type or search |
| P-084 | Filter therapy by type (all/music/video/content) | teacher/src/parent/pages/Therapy.jsx:142-150 | 🟡 | Buttons: All, Music, Video, Content; click → filter therapies |
| P-085 | Search therapy by title/description/tags | teacher/src/parent/pages/Therapy.jsx:99-109, 131-140 | 🟡 | Search box; type → filter therapies matching query |
| P-086 | Start therapy session | teacher/src/parent/pages/Therapy.jsx:52-62 | 🟡 | Click therapy → POST /therapy/:id/start → session stored; show active session card |
| P-087 | End therapy session | teacher/src/parent/pages/Therapy.jsx:64-71 | 🟡 | Click "End" button → PUT /therapy/usage/:sessionId/end → session cleared |

---
## 15. Settings & Account

| # | Feature | Where (file:line) | Status | Test scenario |
|---|---|---|---|---|
| P-088 | View profile info (firstName, lastName, email, phone) | teacher/src/parent/pages/Settings.jsx:122-206 | 🟡 | See all profile fields filled from auth context; avatar with initials fallback |
| P-089 | Edit name/phone | teacher/src/parent/pages/Settings.jsx:63-83, 148-206 | 🟡 | Edit inputs → Save → PUT /user/profile → toast success + context updates |
| P-090 | Notification preferences (email/push toggles) | teacher/src/parent/pages/Settings.jsx:39-83, 200+ | 🟡 | Toggles for email/push notifications; save with profile update |
| P-091 | Change password in Settings | teacher/src/parent/pages/Settings.jsx:85-115, 220+ | 🟡 | Old password, new password, confirm → validate 8+ chars, uppercase, lowercase, digit → PUT /user/password |
| P-092 | Logout button in Settings | teacher/src/parent/pages/Settings.jsx:117-120 | 🟡 | Click → call logout() → redirect to /login |

---
## 16. Help & Support

| # | Feature | Where (file:line) | Status | Test scenario |
|---|---|---|---|---|
| P-093 | Help page with FAQs | teacher/src/parent/pages/Help.jsx:6-88 | 🟡 | /help displays 4 FAQs + contact info (email, phone) + quick links to main pages |
| P-094 | Contact email link | teacher/src/parent/pages/Help.jsx:35 | 🟡 | Click email → mailto: link opens email client |
| P-095 | Contact phone link | teacher/src/parent/pages/Help.jsx:46 | 🟡 | Click phone → tel: link opens phone app |

---
## 17. Cross-Cutting Features

| # | Feature | Where (file:line) | Status | Test scenario |
|---|---|---|---|---|
| P-096 | Responsive design (mobile/tablet/desktop) | teacher/src/parent/components/Layout.jsx · MobileTabBar.jsx · DesktopTopNav.jsx | 🟡 | Mobile: bottom nav, full-width content. Tablet: responsive grid. Desktop: top nav, sidebar possible |
| P-097 | Protected routes (parent role enforcement) | teacher/src/shared/components/ProtectedRoute.jsx:9, teacher/src/App.jsx:78 | 🟡 | Routes under / check ProtectedRoute requireRole="parent" → if not parent, redirect to /login |
| P-098 | Real-time socket integration | teacher/src/parent/pages/Dashboard.jsx:102-111, ChildProfile.jsx:165-184 | 🟡 | Listen: activity:created, :updated, :deleted, meal:*, media:*, child:updated → cache invalidate + refetch |
| P-099 | Toast notifications (success/error) | teacher/src/shared/context/ToastContext.jsx | 🟡 | All forms show inline toast messages for success/error feedback |
| P-100 | Loading spinners & skeleton states | teacher/src/parent/components/LoadingSpinner.jsx | 🟡 | Show during API fetch; replace with content when loaded |
| P-101 | Error boundaries | teacher/src/shared/components/ErrorBoundary.jsx · teacher/src/App.jsx:46 | 🟡 | Wrap routes in ErrorBoundary to catch React errors gracefully |
| P-102 | Offline detection banner | teacher/src/shared/components/OfflineBanner.jsx | 🟡 | Show when navigator.onLine = false; hide when online |
| P-103 | i18n support (Uz/Ru/En) | teacher/src/parent/** (all files use useTranslation()) | 🟡 | All UI text uses t() with defaultValue fallback; switch in settings |
| P-104 | Client-side caching (selectedChildId keying) | teacher/src/parent/pages/Dashboard.jsx:23-25, Activities.jsx:37-39 | 🟡 | Cache key includes selectedChildId; invalidate when child switches |
| P-105 | Global error handling (4xx/5xx) | teacher/src/parent/pages/** | 🟡 | All api.get/post catch errors → show toast with error.response.data.error or .message |
| P-106 | Accessibility features (ARIA labels, semantic HTML) | teacher/src/parent/components/** | 🟡 | Buttons have aria-label; form fields are semantic; keyboard navigation supported |

---

## Backend Routes Summary

### Parent-scoped data
- GET /parent/children
- GET /parent/activities, /parent/activities/:id
- GET /parent/meals, /parent/meals/:id
- GET /parent/media, /parent/media/:id
- GET /parent/profile
- GET /parent/ratings, POST /parent/ratings
- GET /parent/school-rating, POST /parent/school-rating
- GET /parent/schools
- GET /parent/emotional-monitoring/child/:childId
- GET /parent/evaluations, POST /parent/evaluations
- GET /parent/messages (with replies), POST /parent/message-to-government
- GET /parent/me/export
- GET /parent/children/:childId/journal
- GET /parent/children/:childId/irr, :id/irr/assessment, :id/irr/goals

### Shared auth
- POST /auth/login
- POST /auth/refresh
- POST /auth/logout
- PUT /user/password
- GET /auth/me

### Chat (local chatStore)
- loadMessages, addMessage, markRead, updateMessage, deleteMessage

---

## Design System

**Uchqun Parent Portal Colors:**
- `p-brand-*` — blues (primary actions, active states)
- `p-sepia-*` — warm grays (borders, secondary text)
- `p-honey-*` — golds/amber (progress, trends, success)
- `p-surface` — cream (card backgrounds)
- `p-paper` — off-white (page background)
- `p-ink` — dark blue (primary text)

All interactive elements use 300-500ms transitions + hover states.

---

## Key Notes

### CP-020 (School Rating)
- 5-indicator form with mandatory comment
- Placeholder labels (PL-015 gate) awaiting partner input
- Stars derived server-side

### CP-022 (Government Messages)
- recipientLevel: 'owner' | 'region' | 'republic'
- Escalation: parent can escalate own messages to next level
- escalatedFromId self-ref to prior message

### Auth Bypass
- Parent role skips isActive check (suspensions via status field instead)

### Real-Time
- Socket events: activity:*, meal:*, media:*, child:updated, chat:message
- Dashboard auto-refreshes on these events

### Testing
- MessageModal.test.jsx — CP-022 level selector, escalation, validation
- ChildProfile.test.jsx — child selection, profile, logout
- ChildIRR.test.jsx — IСР display, goals, STGs
- Other pages lack tests (🟡 status)

---

**Generated:** 2026-05-30 (commit 6c34f4faba64f8b2ed41fb1f0871f8e20ac68e2d)