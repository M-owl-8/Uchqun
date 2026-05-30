# Teacher Portal — Feature Inventory
**Source commit:** 6c34f4faba64f8b2ed41fb1f0871f8e20ac68e2d  
**Date:** 2026-05-30  
**Method:** atomic-grain, code-sourced  
**Total features:** 116 (✅ 12 · 🟡 104 · ❌ 0 · 🚧 0)

---

## 1. Auth & Onboarding

| # | Feature | Where (file:line) | Status | Test scenario |
|---|---|---|---|---|
| T-001 | Login with email+password | backend/controllers/authController.js · teacher/src/pages/Login.jsx:1 | ✅ | Log in as teacher1@uchqun.uz / Test@2026, expect JWT cookie + redirect to /teacher |
| T-002 | Show/hide password toggle | teacher/src/pages/Login.jsx | 🟡 | Toggle eye icon on password field, characters reveal |
| T-003 | Language switcher on login page (UZ/RU/EN) | teacher/src/pages/Login.jsx | 🟡 | Click EN on login page, form labels switch language |
| T-004 | Forced password change on first login | backend/middleware/auth.js:117 · teacher/src/pages/ChangePassword.jsx:1 | 🟡 | Log in with mustChangePassword=true, redirected to /teacher/change-password |
| T-005 | Change password strength validation | teacher/src/pages/ChangePassword.jsx | 🟡 | Enter weak password, see strength indicator reject |
| T-006 | JWT token refresh (auto-silent) | teacher/src/shared/services/api.js | 🟡 | Leave session open 14 min, make API call, token refreshes silently |
| T-007 | Logout | teacher/src/components/Sidebar.jsx · backend/routes/authRoutes.js | ✅ | Click logout in sidebar, JWT cookie cleared, redirected to /login |

---

## 2. Navigation

| # | Feature | Where (file:line) | Status | Test scenario |
|---|---|---|---|---|
| T-008 | Nav: Bosh sahifa (Dashboard) | teacher/src/components/Sidebar.jsx:26 | ✅ | Sidebar link navigates to /teacher |
| T-009 | Nav: Davomat (Attendance) | teacher/src/components/Sidebar.jsx:27 | 🟡 | Sidebar link navigates to /teacher/attendance |
| T-010 | Nav: Guruh ro'yxati (Parents list) | teacher/src/components/Sidebar.jsx:33 | 🟡 | Sidebar link navigates to /teacher/parents |
| T-011 | Nav: Galereya (Media) | teacher/src/components/Sidebar.jsx:34 | 🟡 | Sidebar link navigates to /teacher/media |
| T-012 | Nav: Maqsadlar (Monitoring/Goals) | teacher/src/components/Sidebar.jsx:40 | 🟡 | Sidebar link navigates to /teacher/monitoring |
| T-013 | Nav: Kuzatuvlar (Activities/Observations) | teacher/src/components/Sidebar.jsx:41 | 🟡 | Sidebar link navigates to /teacher/activities |
| T-014 | Nav: Ota-onalar (Chat) with unread badge | teacher/src/components/Sidebar.jsx:47 | ✅ | SidebarPolling.test.jsx verifies badge updates on chat:message socket event |
| T-015 | Nav: Kun jurnali (Daily Reflection) | teacher/src/components/Sidebar.jsx:48 | 🟡 | Sidebar link navigates to /teacher/reflection |
| T-016 | Nav: Settings | teacher/src/components/Sidebar.jsx | 🟡 | Sidebar link navigates to /teacher/settings |
| T-017 | Unread chat badge — poll /chat/unread-count on load + socket refresh | teacher/src/components/Sidebar.jsx:66–77 | ✅ | SidebarPolling.test.jsx: Sidebar polls /chat/unread-count; badge updates (file at teacher/src/__tests__/pages/SidebarPolling.test.jsx) |
| T-018 | Language switcher in sidebar (UZ/RU/EN) | teacher/src/components/Sidebar.jsx | 🟡 | Toggle language, all page labels switch |
| T-019 | User info card in sidebar (name, role) | teacher/src/components/Sidebar.jsx | 🟡 | Logged-in teacher name displays correctly |
| T-020 | Offline banner | teacher/src/App.jsx:52 (OfflineBanner) | 🟡 | Disconnect network, banner appears at top of screen |

---

## 3. Dashboard (/teacher)

| # | Feature | Where (file:line) | Status | Test scenario |
|---|---|---|---|---|
| T-021 | View attendance count for today | teacher/src/pages/Dashboard.jsx · backend/controllers/teacherController.js (getDashboardCounts) | 🟡 | Dashboard shows present/absent counts for today's date |
| T-022 | View children list with avatar + status indicators | teacher/src/pages/Dashboard.jsx | 🟡 | Dashboard lists all children in teacher's group with photo avatars |
| T-023 | View recent observations feed | teacher/src/pages/Dashboard.jsx | 🟡 | Latest observations from /teacher/observations/recent appear in feed |
| T-024 | View attention alerts (AI warnings) | teacher/src/pages/Dashboard.jsx | 🟡 | AI warning flags appear in dashboard alert section |
| T-025 | Click child avatar → navigate to child detail | teacher/src/pages/Dashboard.jsx · teacher/src/pages/ChildDetail.jsx | 🟡 | Click child card, navigate to /teacher/children/:id |

---

## 4. Attendance (/teacher/attendance)

| # | Feature | Where (file:line) | Status | Test scenario |
|---|---|---|---|---|
| T-026 | Mark child present | teacher/src/pages/Attendance.jsx · backend/routes/attendanceRoutes.js | 🟡 | Log in as teacher1@uchqun.uz, mark child present, save |
| T-027 | Mark child absent | teacher/src/pages/Attendance.jsx | 🟡 | Mark child absent, save, verify in DB |
| T-028 | Mark child late | teacher/src/pages/Attendance.jsx | 🟡 | Mark child late, save |
| T-029 | Mark child sick | teacher/src/pages/Attendance.jsx | 🟡 | Mark child sick, save |
| T-030 | Mark all children present (bulk) | teacher/src/pages/Attendance.jsx | 🟡 | Click "Barchasi bor" button, all children set to present |
| T-031 | Select date for attendance | teacher/src/pages/Attendance.jsx | 🟡 | Change date picker, loads that day's attendance records |
| T-032 | Save attendance to backend | teacher/src/pages/Attendance.jsx · POST /teacher/attendance | 🟡 | Click save, POST fires, toast confirms |
| T-033 | View pre-existing attendance for a date | teacher/src/pages/Attendance.jsx | 🟡 | Navigate to prior date, existing marks load |

---

## 5. Parent/Group List (/teacher/parents)

| # | Feature | Where (file:line) | Status | Test scenario |
|---|---|---|---|---|
| T-034 | List parents with child assignment | teacher/src/pages/ParentManagement.jsx · GET /teacher/parents | 🟡 | Log in as teacher1@uchqun.uz, see parent cards for school1 parents |
| T-035 | Search parents by name | teacher/src/pages/ParentManagement.jsx | 🟡 | Type in search, filters parent cards live |
| T-036 | View parent contact card (phone, child info) | teacher/src/pages/ParentManagement.jsx | 🟡 | Expand parent card, see phone number and children list |
| T-037 | Open chat with parent from parent card | teacher/src/pages/ParentManagement.jsx | 🟡 | Click chat button on parent card, navigate to /teacher/chat pre-selected |

---

## 6. Chat (/teacher/chat)

| # | Feature | Where (file:line) | Status | Test scenario |
|---|---|---|---|---|
| T-038 | List conversations (parents) | teacher/src/pages/Chat.jsx · GET /chat/conversations | 🟡 | Chat page loads parent conversation list |
| T-039 | Select conversation and view messages | teacher/src/pages/Chat.jsx | 🟡 | Click parent name, message thread loads |
| T-040 | Send message to parent | teacher/src/pages/Chat.jsx · POST /chat/messages | 🟡 | Type message, press send, message appears in thread |
| T-041 | Edit own message | teacher/src/pages/Chat.jsx · PUT /chat/messages/:id | 🟡 | Hover message, click edit, modify text, confirm |
| T-042 | Delete own message | teacher/src/pages/Chat.jsx · DELETE /chat/messages/:id | 🟡 | Hover message, click delete, message removed |
| T-043 | Real-time incoming message (socket) | teacher/src/pages/Chat.jsx · teacher/src/shared/context/SocketContext.jsx | 🟡 | Parent sends message, teacher sees it appear without refresh |
| T-044 | Mark conversation as read | teacher/src/pages/Chat.jsx · PUT /chat/conversations/:id/read | 🟡 | Open conversation, unread badge clears |

---

## 7. Activities/Observations (/teacher/activities)

| # | Feature | Where (file:line) | Status | Test scenario |
|---|---|---|---|---|
| T-045 | List activities/observations | teacher/src/pages/Activities.jsx · GET /activities | ✅ | Activities.test.jsx verifies list renders |
| T-046 | Create activity (form: child, type, notes) | teacher/src/pages/Activities.jsx · POST /activities | ✅ | Activities.test.jsx covers create flow |
| T-047 | Edit activity | teacher/src/pages/Activities.jsx · PUT /activities/:id | 🟡 | Edit existing activity, save |
| T-048 | Delete activity | teacher/src/pages/Activities.jsx · DELETE /activities/:id | 🟡 | Delete activity, removed from list |
| T-049 | Select child for activity | teacher/src/pages/Activities.jsx:24–77 | 🟡 | Dropdown lists children in teacher's group |

---

## 8. Media / Gallery (/teacher/media)

| # | Feature | Where (file:line) | Status | Test scenario |
|---|---|---|---|---|
| T-050 | List media items | teacher/src/pages/Media.jsx · GET /media | 🟡 | Log in as teacher1@uchqun.uz, media gallery loads |
| T-051 | Upload media (photo/video/file) | teacher/src/pages/Media.jsx · POST /media | 🟡 | File picker opens, select file, upload, appears in gallery |
| T-052 | Delete media item | teacher/src/pages/Media.jsx · DELETE /media/:id | 🟡 | Click delete on media item, confirm, removed |
| T-053 | View/preview media item | teacher/src/pages/Media.jsx | 🟡 | Click media item, full-size preview opens |

---

## 9. Meals (/teacher route — accessed via meal pages)

| # | Feature | Where (file:line) | Status | Test scenario |
|---|---|---|---|---|
| T-054 | List meal plan entries | teacher/src/pages/Meals.jsx · GET /meals | 🟡 | Meals page loads entries for teacher's group |
| T-055 | Create meal entry | teacher/src/pages/Meals.jsx · POST /meals | 🟡 | Fill meal form, save, appears in list |
| T-056 | Edit meal entry | teacher/src/pages/Meals.jsx · PUT /meals/:id | 🟡 | Edit meal entry, save |
| T-057 | Delete meal entry | teacher/src/pages/Meals.jsx · DELETE /meals/:id | 🟡 | Delete entry, removed from list |

---

## 10. Emotional Monitoring (/teacher/monitoring)

| # | Feature | Where (file:line) | Status | Test scenario |
|---|---|---|---|---|
| T-058 | Log emotional state for child (checkboxes) | teacher/src/pages/MonitoringJournal.jsx · POST /teacher/emotional-monitoring | 🟡 | Select child, check emotional state items, save |
| T-059 | View prior monitoring entries for child | teacher/src/pages/MonitoringJournal.jsx · GET /teacher/emotional-monitoring/child/:id | 🟡 | Select child, prior entries load below |
| T-060 | Edit monitoring entry | teacher/src/pages/MonitoringJournal.jsx · PUT /teacher/emotional-monitoring/:id | 🟡 | Edit prior entry, save |
| T-061 | Delete monitoring entry | teacher/src/pages/MonitoringJournal.jsx · DELETE /teacher/emotional-monitoring/:id | 🟡 | Delete entry, removed |

---

## 11. Daily Reflection / Journal (/teacher/reflection)

| # | Feature | Where (file:line) | Status | Test scenario |
|---|---|---|---|---|
| T-062 | Write daily reflection text | teacher/src/pages/DailyReflection.jsx · POST /teacher/reflections | 🟡 | Type reflection text, save |
| T-063 | Auto-save reflection to localStorage | teacher/src/pages/DailyReflection.jsx | 🟡 | Type text, close page, reopen — draft still present |
| T-064 | List prior reflections | teacher/src/pages/DailyReflection.jsx · GET /teacher/reflections | 🟡 | Prior reflections list appears below form |
| T-065 | Log daily journal entry for child | teacher/src/pages/DailyReflection.jsx · POST /teacher/journal | 🟡 | Select child, fill daily checklist items, submit |
| T-066 | View journal entries for child | teacher/src/pages/DailyReflection.jsx · GET /teacher/journal/:childId | 🟡 | Select child, past journal entries load |

---

## 12. Child Detail (/teacher/children/:id)

| # | Feature | Where (file:line) | Status | Test scenario |
|---|---|---|---|---|
| T-067 | View child profile (name, DOB, diagnosis, photo) | teacher/src/pages/ChildDetail.jsx | 🟡 | Navigate to child detail, see full profile fields |
| T-068 | View child's observations list | teacher/src/pages/ChildDetail.jsx · GET /teacher/children/:id/observations | 🟡 | Child detail shows observation history |
| T-069 | Navigate to child's ИРР | teacher/src/pages/ChildDetail.jsx · link to /teacher/children/:id/irr | 🟡 | Click ИРР link on child detail page |

---

## 13. ИРР — Individual Development Plan (/teacher/children/:id/irr)

| # | Feature | Where (file:line) | Status | Test scenario |
|---|---|---|---|---|
| T-070 | Create new ИРР for child | teacher/src/pages/IrrShell.jsx · POST /teacher/children/:childId/irr | ✅ | IrrShell.test.jsx covers create flow |
| T-071 | Fill ИРР header: ptpkIntakeDate | teacher/src/pages/IrrShell.jsx · PATCH /teacher/irr/:irrId | 🟡 | Fill ПТПК intake date field, save |
| T-072 | Fill ИРР header: ptpkConclusionDate | teacher/src/pages/IrrShell.jsx | 🟡 | Fill ПТПК conclusion date field, save |
| T-073 | Fill ИРР header: ptpkConclusionNumber | teacher/src/pages/IrrShell.jsx | 🟡 | Fill ПТПК conclusion number, save |
| T-074 | Fill ИРР header: ptpkDiagnosis | teacher/src/pages/IrrShell.jsx | 🟡 | Fill ПТПК diagnosis text, save |
| T-075 | Fill ИРР header: childStrengths / riskFactors / additionalInfo | teacher/src/pages/IrrShell.jsx | 🟡 | Fill strengths and risk factors fields, save |
| T-076 | Activate ИРР (IRR_HEADER_INCOMPLETE validation gate) | teacher/src/pages/IrrShell.jsx · POST /teacher/irr/:irrId/activate | ✅ | IrrShell.test.jsx:145 — tests IRR_HEADER_INCOMPLETE error when required fields missing (additionalInfo, irrStartDate) |
| T-077 | Archive ИРР | teacher/src/pages/IrrShell.jsx · POST /teacher/irr/:irrId/archive | 🟡 | Click archive, ИРР status → archived |
| T-078 | Create assessment session | teacher/src/pages/IrrShell.jsx · POST /teacher/irr/:irrId/assessment-sessions | 🟡 | Open new session, 17 criteria appear |
| T-079 | Score assessment criterion (1–5 scale, 17 criteria) | teacher/src/pages/IrrShell.jsx · backend/controllers/teacher/irrController.js | 🟡 | Select score 1–5 for each criterion in session |
| T-080 | Save assessment session scores | teacher/src/pages/IrrShell.jsx | 🟡 | Submit session, scores stored to AssessmentSession + Scores |
| T-081 | View live/current score per domain | teacher/src/pages/IrrShell.jsx · GET /teacher/assessment-sessions/:sessionId | 🟡 | After scoring, domain totals display |
| T-082 | List prior assessment sessions | teacher/src/pages/IrrShell.jsx · GET /teacher/irr/:irrId/assessment-sessions | 🟡 | Session history list shows dates + totals |
| T-083 | Create long-term goal | teacher/src/pages/IrrShell.jsx · POST /teacher/irr/:irrId/long-term-goals | 🟡 | Fill LTG form, save |
| T-084 | Edit long-term goal | teacher/src/pages/IrrShell.jsx · PATCH /teacher/long-term-goals/:id | 🟡 | Edit LTG, save |
| T-085 | Delete long-term goal | teacher/src/pages/IrrShell.jsx · DELETE /teacher/long-term-goals/:id | 🟡 | Delete LTG, removed |
| T-086 | Create goal period under long-term goal | teacher/src/pages/IrrShell.jsx · POST /teacher/irr/:irrId/goal-periods | 🟡 | Add period (Q1–Q4) under LTG |
| T-087 | Create short-term goal under period | teacher/src/pages/IrrShell.jsx · POST /teacher/goal-periods/:id/short-term-goals | 🟡 | Add STG under period |
| T-088 | Edit short-term goal | teacher/src/pages/IrrShell.jsx · PATCH /teacher/short-term-goals/:id | 🟡 | Edit STG, save |
| T-089 | Delete short-term goal | teacher/src/pages/IrrShell.jsx · DELETE /teacher/short-term-goals/:id | 🟡 | Delete STG, removed |
| T-090 | Write quarterly review (parentRecommendations) | teacher/src/pages/IrrShell.jsx · PATCH /teacher/goal-periods/:id/review | 🟡 | Fill parentRecommendations field for period, save |
| T-091 | Sign goal period (teacher countersign) | teacher/src/pages/IrrShell.jsx · POST /teacher/goal-periods/:id/sign | 🟡 | Click sign, period status → signed |
| T-092 | Log daily journal entry for child (from ИРР) | teacher/src/pages/IrrShell.jsx · POST /teacher/children/:childId/daily-entries | 🟡 | Fill DAILY_JOURNAL_ITEMS checklist, submit |
| T-093 | View daily journal entries for child | teacher/src/pages/IrrShell.jsx · GET /teacher/children/:childId/daily-entries | 🟡 | Prior daily entries list |
| T-094 | Log weekly journal entry for child | teacher/src/pages/IrrShell.jsx · POST /teacher/children/:childId/weekly-entries | 🟡 | Fill WEEKLY_JOURNAL_ITEMS checklist, submit |
| T-095 | View weekly journal entries for child | teacher/src/pages/IrrShell.jsx · GET /teacher/children/:childId/weekly-entries | 🟡 | Prior weekly entries list |

---

## 14. Therapy Management (/teacher/therapy)

| # | Feature | Where (file:line) | Status | Test scenario |
|---|---|---|---|---|
| T-096 | List therapy sessions for children | teacher/src/pages/TherapyManagement.jsx · GET /therapies | ✅ | TherapyManagement.test.jsx covers list |
| T-097 | Create therapy session | teacher/src/pages/TherapyManagement.jsx · POST /therapies | ✅ | TherapyManagement.test.jsx covers create |
| T-098 | Edit therapy session | teacher/src/pages/TherapyManagement.jsx | 🟡 | Edit therapy entry, save |
| T-099 | Delete therapy session | teacher/src/pages/TherapyManagement.jsx | 🟡 | Delete therapy entry |

---

## 15. AI Warnings (/teacher/ai-warnings)

| # | Feature | Where (file:line) | Status | Test scenario |
|---|---|---|---|---|
| T-100 | View AI warning list | teacher/src/parent/pages/AIWarnings.jsx (shared) · GET /ai-warnings | ✅ | AIWarnings.test.jsx covers list render |
| T-101 | Filter warnings by severity | teacher/src/parent/pages/AIWarnings.jsx | 🟡 | Filter by HIGH severity, list updates |
| T-102 | Resolve AI warning (with note) | teacher/src/parent/pages/AIWarnings.jsx · PATCH /ai-warnings/:id/resolve | 🟡 | Click resolve, enter note, warning marked resolved |

---

## 16. Settings & Profile (/teacher/settings, /teacher/profile)

| # | Feature | Where (file:line) | Status | Test scenario |
|---|---|---|---|---|
| T-103 | View profile (name, email, phone, school) | teacher/src/pages/Profile.jsx · GET /teacher/profile | 🟡 | Profile page shows logged-in teacher's details |
| T-104 | Edit profile (firstName, lastName, phone) | teacher/src/pages/Settings.jsx · PUT /user/profile | 🟡 | Change phone number, save, reflects in profile |
| T-105 | Change password (settings) | teacher/src/pages/Settings.jsx · PUT /user/password | 🟡 | Enter current + new password, save |
| T-106 | Upload avatar | teacher/src/pages/Settings.jsx | 🟡 | Select image, upload, avatar appears in sidebar |
| T-107 | Toggle notification preferences (email, push) | teacher/src/pages/Settings.jsx | 🟡 | Toggle email notifications off, preference saved |
| T-108 | Language switcher (UZ/RU/EN) in settings | teacher/src/pages/Settings.jsx | 🟡 | Switch to RU, all labels change language |
| T-109 | Send message to government (from profile) | teacher/src/pages/Profile.jsx · POST /teacher/message-to-government | 🟡 | Compose message, send, appears in sent list |
| T-110 | View replies from government | teacher/src/pages/Profile.jsx · GET /teacher/messages | 🟡 | Profile shows government replies in messages list |

---

## 17. Cross-cutting

| # | Feature | Where (file:line) | Status | Test scenario |
|---|---|---|---|---|
| T-111 | Toast notification — success | teacher/src/shared/context/ToastContext.jsx | 🟡 | Any save action shows green success toast |
| T-112 | Toast notification — error | teacher/src/shared/context/ToastContext.jsx | 🟡 | API error shows red error toast with message |
| T-113 | Error boundary — crash recovery | teacher/src/App.jsx:46 (ErrorBoundary) | 🟡 | Page component throws error, fallback UI shown |
| T-114 | Real-time socket connection established | teacher/src/shared/context/SocketContext.jsx | 🟡 | Log in, socket connects to backend, confirmed via network tab |
| T-115 | Notification panel — view list | teacher/src/shared/context/NotificationContext.jsx | 🟡 | Open notifications panel, list of recent events |
| T-116 | Notification — mark as read | backend/routes/notificationRoutes.js · PUT /notifications/:id/read | 🟡 | Click notification, marked read, badge count decrements |

---

## Notes

- **Child goals** (T-068 area via `/teacher/children/:childId/goals`): `requireRole('teacher')` — strictly teacher-only, not reception
- **Reflections** (T-062): `requireRole('teacher')` — strictly teacher-only, not reception
- **Journal** (T-065): `requireTeacher` allows teacher/reception/admin (CLAUDE.md `requireTeacher` note)
- **IRR mutations** (T-070, T-076–T-091): `requireRole('teacher')` — strictly teacher-only
- **Therapy**: `TherapyManagement.test.jsx` exists in `teacher/src/__tests__/`
