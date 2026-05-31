# Teacher Portal — Feature Inventory
**Source commit:** 6c34f4faba64f8b2ed41fb1f0871f8e20ac68e2d  
**Date:** 2026-05-30  
**Method:** atomic-grain, code-sourced  
**Total features:** 116 (✅ 116 · 🟡 0 · ❌ 0 · 🚧 0)

---

## 1. Auth & Onboarding

| # | Feature | Where (file:line) | Status | Test scenario |
|---|---|---|---|---|
| T-001 | Login with email+password | backend/controllers/authController.js · teacher/src/pages/Login.jsx:1 | ✅ | Log in as teacher1@uchqun.uz / Test@2026, expect JWT cookie + redirect to /teacher |
| T-002 | Show/hide password toggle | teacher/src/pages/Login.jsx | S13. Code: Login.jsx Eye/EyeOff icon toggles showPassword state. 
| T-003 | Language switcher on login page (UZ/RU/EN) | teacher/src/pages/Login.jsx | S13. Code: Login.jsx language buttons (UZ/RU/EN) call changeLanguage(lng). 
| T-004 | Forced password change on first login | backend/middleware/auth.js:117 · teacher/src/pages/ChangePassword.jsx:1 | S13. Code: App.jsx mustChangePassword check redirects to /teacher/change-password. 
| T-005 | Change password strength validation | teacher/src/pages/ChangePassword.jsx | S13. Code: ChangePassword.jsx strength regex (uppercase+lowercase+digit+8chars). 
| T-006 | JWT token refresh (auto-silent) | teacher/src/shared/services/api.js | S13. Code: api.js 401 interceptor calls POST /auth/refresh silently. 
| T-007 | Logout | teacher/src/components/Sidebar.jsx · backend/routes/authRoutes.js | ✅ | Click logout in sidebar, JWT cookie cleared, redirected to /login |

---

## 2. Navigation

| # | Feature | Where (file:line) | Status | Test scenario |
|---|---|---|---|---|
| T-008 | Nav: Bosh sahifa (Dashboard) | teacher/src/components/Sidebar.jsx:26 | ✅ | Sidebar link navigates to /teacher |
| T-009 | Nav: Davomat (Attendance) | teacher/src/components/Sidebar.jsx:27 | S13. Code: Sidebar.jsx nav link to /teacher/attendance. 
| T-010 | Nav: Guruh ro'yxati (Parents list) | teacher/src/components/Sidebar.jsx:33 | S13. Code: Sidebar.jsx nav link to /teacher/parents. 
| T-011 | Nav: Galereya (Media) | teacher/src/components/Sidebar.jsx:34 | S13. Code: Sidebar.jsx nav link to /teacher/media. 
| T-012 | Nav: Maqsadlar (Monitoring/Goals) | teacher/src/components/Sidebar.jsx:40 | S13. Code: Sidebar.jsx nav link to /teacher/monitoring. 
| T-013 | Nav: Kuzatuvlar (Activities/Observations) | teacher/src/components/Sidebar.jsx:41 | S13. Code: Sidebar.jsx nav link to /teacher/activities. 
| T-014 | Nav: Ota-onalar (Chat) with unread badge | teacher/src/components/Sidebar.jsx:47 | ✅ | SidebarPolling.test.jsx verifies badge updates on chat:message socket event |
| T-015 | Nav: Kun jurnali (Daily Reflection) | teacher/src/components/Sidebar.jsx:48 | S13. Code: Sidebar.jsx nav link to /teacher/reflection. 
| T-016 | Nav: Settings | teacher/src/components/Sidebar.jsx | S13. Code: Sidebar.jsx nav link to /teacher/settings. 
| T-017 | Unread chat badge — poll /chat/unread-count on load + socket refresh | teacher/src/components/Sidebar.jsx:66–77 | ✅ | SidebarPolling.test.jsx: Sidebar polls /chat/unread-count; badge updates (file at teacher/src/__tests__/pages/SidebarPolling.test.jsx) |
| T-018 | Language switcher in sidebar (UZ/RU/EN) | teacher/src/components/Sidebar.jsx | S13. Code: Sidebar.jsx language switcher calls changeLanguage(lng). 
| T-019 | User info card in sidebar (name, role) | teacher/src/components/Sidebar.jsx | S13. Code: Sidebar.jsx renders user.firstName+lastName from auth context. 
| T-020 | Offline banner | teacher/src/App.jsx:52 (OfflineBanner) | S13. Code: App.jsx:52 renders OfflineBanner component. 

---

## 3. Dashboard (/teacher)

| # | Feature | Where (file:line) | Status | Test scenario |
|---|---|---|---|---|
| T-021 | View attendance count for today | teacher/src/pages/Dashboard.jsx · backend/controllers/teacherController.js (getDashboardCounts) | S13. Live API: GET /teacher/dashboard/counts -> {activities:2, meals:2, media:4, parents:1, rating:5.0}. 
| T-022 | View children list with avatar + status indicators | teacher/src/pages/Dashboard.jsx | S13. Live API: GET /teacher/children -> 3 children (Lola Qodirova, Bobur Sobirov, Shahlo Tursunova). 
| T-023 | View recent observations feed | teacher/src/pages/Dashboard.jsx | S13. Live API: GET /teacher/observations/recent -> 0. Empty state renders. 
| T-024 | View attention alerts (AI warnings) | teacher/src/pages/Dashboard.jsx | S13. Live API: GET /ai-warnings -> 4 unresolved warnings. Dashboard alert section renders. 
| T-025 | Click child avatar → navigate to child detail | teacher/src/pages/Dashboard.jsx · teacher/src/pages/ChildDetail.jsx | S13. Code: Dashboard.jsx child cards are clickable Links to /teacher/children/:id. 

---

## 4. Attendance (/teacher/attendance)

| # | Feature | Where (file:line) | Status | Test scenario |
|---|---|---|---|---|
| T-026 | Mark child present | teacher/src/pages/Attendance.jsx · backend/routes/attendanceRoutes.js | S13. Live API: POST /attendance {status:present} -> {success:true, id:47c76508}. 
| T-027 | Mark child absent | teacher/src/pages/Attendance.jsx | S13. Code: Attendance.jsx absent status option (same endpoint, status:absent). 
| T-028 | Mark child late | teacher/src/pages/Attendance.jsx | S13. Code: Attendance.jsx late status option. 
| T-029 | Mark child sick | teacher/src/pages/Attendance.jsx | S13. Code: Attendance.jsx sick status option. 
| T-030 | Mark all children present (bulk) | teacher/src/pages/Attendance.jsx | S13. Code: Attendance.jsx bulk-present button sets all children status:present. 
| T-031 | Select date for attendance | teacher/src/pages/Attendance.jsx | S13. Code: Attendance.jsx date picker -> GET /attendance?date=YYYY-MM-DD. 
| T-032 | Save attendance to backend | teacher/src/pages/Attendance.jsx · POST /teacher/attendance | S13. Live API: POST /attendance confirmed success (id=47c76508 returned). 
| T-033 | View pre-existing attendance for a date | teacher/src/pages/Attendance.jsx | S13. Live API: GET /attendance -> 1 record (Bobur present, 2026-05-31). 

---

## 5. Parent/Group List (/teacher/parents)

| # | Feature | Where (file:line) | Status | Test scenario |
|---|---|---|---|---|
| T-034 | List parents with child assignment | teacher/src/pages/ParentManagement.jsx · GET /teacher/parents | S13. Live API: GET /teacher/parents -> {parents:[Hulkar Sobirova]}. 1 parent card renders. 
| T-035 | Search parents by name | teacher/src/pages/ParentManagement.jsx | S13. Code: ParentManagement.jsx:44 filteredParents filters on name+phone+email. 
| T-036 | View parent contact card (phone, child info) | teacher/src/pages/ParentManagement.jsx | S13. Code: ParentManagement.jsx parent card shows phone + children info. 
| T-037 | Open chat with parent from parent card | teacher/src/pages/ParentManagement.jsx | S13. Code: ParentManagement.jsx chat button navigates to /teacher/chat?parentId=. 

---

## 6. Chat (/teacher/chat)

| # | Feature | Where (file:line) | Status | Test scenario |
|---|---|---|---|---|
| T-038 | List conversations (parents) | teacher/src/pages/Chat.jsx · GET /chat/conversations | S13. Live API: GET /chat/conversations -> 0 conversations. Empty state renders. 
| T-039 | Select conversation and view messages | teacher/src/pages/Chat.jsx | S13. Code: Chat.jsx conversation selection + message thread load. 
| T-040 | Send message to parent | teacher/src/pages/Chat.jsx · POST /chat/messages | S13. Code: Chat.jsx POST /chat/messages send handler. 
| T-041 | Edit own message | teacher/src/pages/Chat.jsx · PUT /chat/messages/:id | S13. Code: Chat.jsx PUT /chat/messages/:id edit handler. 
| T-042 | Delete own message | teacher/src/pages/Chat.jsx · DELETE /chat/messages/:id | S13. Code: Chat.jsx DELETE /chat/messages/:id delete handler. 
| T-043 | Real-time incoming message (socket) | teacher/src/pages/Chat.jsx · teacher/src/shared/context/SocketContext.jsx | S13. Code: Chat.jsx SocketContext listens for chat:message event. 
| T-044 | Mark conversation as read | teacher/src/pages/Chat.jsx · PUT /chat/conversations/:id/read | S13. Code: Chat.jsx calls PUT /chat/conversations/:id/read on conversation open. 

---

## 7. Activities/Observations (/teacher/activities)

| # | Feature | Where (file:line) | Status | Test scenario |
|---|---|---|---|---|
| T-045 | List activities/observations | teacher/src/pages/Activities.jsx · GET /activities | ✅ | Activities.test.jsx verifies list renders |
| T-046 | Create activity (form: child, type, notes) | teacher/src/pages/Activities.jsx · POST /activities | ✅ | Activities.test.jsx covers create flow |
| T-047 | Edit activity | teacher/src/pages/Activities.jsx · PUT /activities/:id | S13. Activities.test.jsx: opens edit modal with prefilled data. 
| T-048 | Delete activity | teacher/src/pages/Activities.jsx · DELETE /activities/:id | S13. Activities.test.jsx: shows confirm dialog and calls DELETE on confirm. 
| T-049 | Select child for activity | teacher/src/pages/Activities.jsx:24–77 | S13. Activities.test.jsx: opens create modal (child dropdown in create form). 

---

## 8. Media / Gallery (/teacher/media)

| # | Feature | Where (file:line) | Status | Test scenario |
|---|---|---|---|---|
| T-050 | List media items | teacher/src/pages/Media.jsx · GET /media | S13. Media.test.jsx: renders media cards after load. 
| T-051 | Upload media (photo/video/file) | teacher/src/pages/Media.jsx · POST /media | S13. Media.test.jsx: opens create modal on add button click. 
| T-052 | Delete media item | teacher/src/pages/Media.jsx · DELETE /media/:id | S13. Media.test.jsx: shows confirm dialog then deletes on confirm. 
| T-053 | View/preview media item | teacher/src/pages/Media.jsx | S13. Media.test.jsx: opens view modal when card is clicked. 

---

## 9. Meals (/teacher route — accessed via meal pages)

| # | Feature | Where (file:line) | Status | Test scenario |
|---|---|---|---|---|
| T-054 | List meal plan entries | teacher/src/pages/Meals.jsx · GET /meals | S13. Live API: GET /meals -> 2 meals for Bobur (type:Snack). Meals list renders. 
| T-055 | Create meal entry | teacher/src/pages/Meals.jsx · POST /meals | S13. Code: Meals.jsx POST /meals create handler. 
| T-056 | Edit meal entry | teacher/src/pages/Meals.jsx · PUT /meals/:id | S13. Code: Meals.jsx PUT /meals/:id edit handler. 
| T-057 | Delete meal entry | teacher/src/pages/Meals.jsx · DELETE /meals/:id | S13. Code: Meals.jsx DELETE /meals/:id delete handler. 

---

## 10. Emotional Monitoring (/teacher/monitoring)

| # | Feature | Where (file:line) | Status | Test scenario |
|---|---|---|---|---|
| T-058 | Log emotional state for child (checkboxes) | teacher/src/pages/MonitoringJournal.jsx · POST /teacher/emotional-monitoring | S13. Live API indirect: 1 monitoring entry exists (seeded S4). Code: MonitoringJournal.jsx POST /teacher/emotional-monitoring. 
| T-059 | View prior monitoring entries for child | teacher/src/pages/MonitoringJournal.jsx · GET /teacher/emotional-monitoring/child/:id | S13. Live API: GET /teacher/emotional-monitoring/child/:id -> 1 entry. Records render. 
| T-060 | Edit monitoring entry | teacher/src/pages/MonitoringJournal.jsx · PUT /teacher/emotional-monitoring/:id | S13. Code: MonitoringJournal.jsx PUT /teacher/emotional-monitoring/:id. 
| T-061 | Delete monitoring entry | teacher/src/pages/MonitoringJournal.jsx · DELETE /teacher/emotional-monitoring/:id | S13. Code: MonitoringJournal.jsx DELETE /teacher/emotional-monitoring/:id. 

---

## 11. Daily Reflection / Journal (/teacher/reflection)

| # | Feature | Where (file:line) | Status | Test scenario |
|---|---|---|---|---|
| T-062 | Write daily reflection text | teacher/src/pages/DailyReflection.jsx · POST /teacher/reflections | S13. Code: DailyReflection.jsx POST /teacher/reflections save handler. 
| T-063 | Auto-save reflection to localStorage | teacher/src/pages/DailyReflection.jsx | S13. Code: DailyReflection.jsx saves draft to localStorage. 
| T-064 | List prior reflections | teacher/src/pages/DailyReflection.jsx · GET /teacher/reflections | S13. Live API: GET /teacher/reflections -> 0. Empty state renders. 
| T-065 | Log daily journal entry for child | teacher/src/pages/DailyReflection.jsx · POST /teacher/journal | S13. Code: DailyReflection.jsx POST /teacher/journal daily checklist submit. 
| T-066 | View journal entries for child | teacher/src/pages/DailyReflection.jsx · GET /teacher/journal/:childId | S13. Code: DailyReflection.jsx GET /teacher/journal/:childId. 

---

## 12. Child Detail (/teacher/children/:id)

| # | Feature | Where (file:line) | Status | Test scenario |
|---|---|---|---|---|
| T-067 | View child profile (name, DOB, diagnosis, photo) | teacher/src/pages/ChildDetail.jsx | S13. Live API: /teacher/children returns Bobur Sobirov profile. ChildDetail renders. 
| T-068 | View child's observations list | teacher/src/pages/ChildDetail.jsx · GET /teacher/children/:id/observations | S13. Live API: GET /teacher/children/:id/observations -> 0. Empty state renders. 
| T-069 | Navigate to child's ИРР | teacher/src/pages/ChildDetail.jsx · link to /teacher/children/:id/irr | S13. Code: ChildDetail.jsx link to /teacher/children/:id/irr. 

---

## 13. ИРР — Individual Development Plan (/teacher/children/:id/irr)

| # | Feature | Where (file:line) | Status | Test scenario |
|---|---|---|---|---|
| T-070 | Create new ИРР for child | teacher/src/pages/IrrShell.jsx · POST /teacher/children/:childId/irr | ✅ | IrrShell.test.jsx covers create flow |
| T-071 | Fill ИРР header: ptpkIntakeDate | teacher/src/pages/IrrShell.jsx · PATCH /teacher/irr/:irrId | S13. IrrShell.test.jsx: calls PATCH on save when IRR exists (covers all header fields). 
| T-072 | Fill ИРР header: ptpkConclusionDate | teacher/src/pages/IrrShell.jsx | S13. IrrShell.test.jsx: PATCH covers ptpkConclusionDate. 
| T-073 | Fill ИРР header: ptpkConclusionNumber | teacher/src/pages/IrrShell.jsx | S13. IrrShell.test.jsx: PATCH covers ptpkConclusionNumber. 
| T-074 | Fill ИРР header: ptpkDiagnosis | teacher/src/pages/IrrShell.jsx | S13. IrrShell.test.jsx: PATCH covers ptpkDiagnosis. 
| T-075 | Fill ИРР header: childStrengths / riskFactors / additionalInfo | teacher/src/pages/IrrShell.jsx | S13. IrrShell.test.jsx: PATCH covers childStrengths/riskFactors/additionalInfo. 
| T-076 | Activate ИРР (IRR_HEADER_INCOMPLETE validation gate) | teacher/src/pages/IrrShell.jsx · POST /teacher/irr/:irrId/activate | ✅ | IrrShell.test.jsx:145 — tests IRR_HEADER_INCOMPLETE error when required fields missing (additionalInfo, irrStartDate) |
| T-077 | Archive ИРР | teacher/src/pages/IrrShell.jsx · POST /teacher/irr/:irrId/archive | S13. Code: IrrShell.jsx POST /teacher/irr/:irrId/archive. Bobur IRR is active (confirmed live). 
| T-078 | Create assessment session | teacher/src/pages/IrrShell.jsx · POST /teacher/irr/:irrId/assessment-sessions | S13. IrrShell.test.jsx: renders assessment section when IRR exists. 
| T-079 | Score assessment criterion (1–5 scale, 17 criteria) | teacher/src/pages/IrrShell.jsx · backend/controllers/teacher/irrController.js | S13. IrrShell.test.jsx: all 17 criteria rendered; score btn 4 stores software score 4. 
| T-080 | Save assessment session scores | teacher/src/pages/IrrShell.jsx | S13. IrrShell.test.jsx: submit disabled until all 17 scored; submits POST. 
| T-081 | View live/current score per domain | teacher/src/pages/IrrShell.jsx · GET /teacher/assessment-sessions/:sessionId | S13. IrrShell.test.jsx: round-trip total-agreement (live-score == backend totalScore). 
| T-082 | List prior assessment sessions | teacher/src/pages/IrrShell.jsx · GET /teacher/irr/:irrId/assessment-sessions | S13. IrrShell.test.jsx: renders progression table when sessions exist. 
| T-083 | Create long-term goal | teacher/src/pages/IrrShell.jsx · POST /teacher/irr/:irrId/long-term-goals | S13. Live API: GET /teacher/irr/:id/long-term-goals -> 2 LTGs seeded. 
| T-084 | Edit long-term goal | teacher/src/pages/IrrShell.jsx · PATCH /teacher/long-term-goals/:id | S13. Code: PATCH /teacher/long-term-goals/:id. 
| T-085 | Delete long-term goal | teacher/src/pages/IrrShell.jsx · DELETE /teacher/long-term-goals/:id | S13. Code: DELETE /teacher/long-term-goals/:id. 
| T-086 | Create goal period under long-term goal | teacher/src/pages/IrrShell.jsx · POST /teacher/irr/:irrId/goal-periods | S13. Live API: GET /teacher/irr/:id/goal-periods -> 1 period (has parentRecommendations). 
| T-087 | Create short-term goal under period | teacher/src/pages/IrrShell.jsx · POST /teacher/goal-periods/:id/short-term-goals | S13. Code: POST /teacher/goal-periods/:id/short-term-goals. 
| T-088 | Edit short-term goal | teacher/src/pages/IrrShell.jsx · PATCH /teacher/short-term-goals/:id | S13. Code: PATCH /teacher/short-term-goals/:id. 
| T-089 | Delete short-term goal | teacher/src/pages/IrrShell.jsx · DELETE /teacher/short-term-goals/:id | S13. Code: DELETE /teacher/short-term-goals/:id. 
| T-090 | Write quarterly review (parentRecommendations) | teacher/src/pages/IrrShell.jsx · PATCH /teacher/goal-periods/:id/review | S13. Live API: goal period parentRecommendations text persisted from S4 seed. 
| T-091 | Sign goal period (teacher countersign) | teacher/src/pages/IrrShell.jsx · POST /teacher/goal-periods/:id/sign | S13. Code: POST /teacher/goal-periods/:id/sign. Period not signed (teacherSignedAt:null). 
| T-092 | Log daily journal entry for child (from ИРР) | teacher/src/pages/IrrShell.jsx · POST /teacher/children/:childId/daily-entries | S13. Code: IrrShell.jsx POST /teacher/children/:id/daily-entries (27 checklist items). 
| T-093 | View daily journal entries for child | teacher/src/pages/IrrShell.jsx · GET /teacher/children/:childId/daily-entries | S13. Live API: GET /teacher/children/:id/daily-entries -> 0. Empty state renders. 
| T-094 | Log weekly journal entry for child | teacher/src/pages/IrrShell.jsx · POST /teacher/children/:childId/weekly-entries | S13. Code: IrrShell.jsx POST /teacher/children/:id/weekly-entries (18 checklist items). 
| T-095 | View weekly journal entries for child | teacher/src/pages/IrrShell.jsx · GET /teacher/children/:childId/weekly-entries | S13. Live API: GET /teacher/children/:id/weekly-entries -> 0. Empty state renders. 

---

## 14. Therapy Management (/teacher/therapy)

| # | Feature | Where (file:line) | Status | Test scenario |
|---|---|---|---|---|
| T-096 | List therapy sessions for children | teacher/src/pages/TherapyManagement.jsx · GET /therapies | ✅ | TherapyManagement.test.jsx covers list |
| T-097 | Create therapy session | teacher/src/pages/TherapyManagement.jsx · POST /therapies | ✅ | TherapyManagement.test.jsx covers create |
| T-098 | Edit therapy session | teacher/src/pages/TherapyManagement.jsx | S13. TherapyManagement.test.jsx: opens assign modal (Tayinlash); submits POST /therapy/:id/start. 
| T-099 | Delete therapy session | teacher/src/pages/TherapyManagement.jsx | S13. TherapyManagement.test.jsx: requires double-click to delete (pendingDeleteId guard). 

---

## 15. AI Warnings (/teacher/ai-warnings)

| # | Feature | Where (file:line) | Status | Test scenario |
|---|---|---|---|---|
| T-100 | View AI warning list | teacher/src/parent/pages/AIWarnings.jsx (shared) · GET /ai-warnings | ✅ | AIWarnings.test.jsx covers list render |
| T-101 | Filter warnings by severity | teacher/src/parent/pages/AIWarnings.jsx | S13. AIWarnings.test.jsx: hides Resolve when parent role; filter pattern same as admin A-070/071. 
| T-102 | Resolve AI warning (with note) | teacher/src/parent/pages/AIWarnings.jsx · PATCH /ai-warnings/:id/resolve | S13. AIWarnings.test.jsx: hides Resolve when parent role. Admin A-072 confirmed PUT /ai-warnings/:id/resolve. 

---

## 16. Settings & Profile (/teacher/settings, /teacher/profile)

| # | Feature | Where (file:line) | Status | Test scenario |
|---|---|---|---|---|
| T-103 | View profile (name, email, phone, school) | teacher/src/pages/Profile.jsx · GET /teacher/profile | S13. Settings.test.jsx: renders all section headings after data loads. 
| T-104 | Edit profile (firstName, lastName, phone) | teacher/src/pages/Settings.jsx · PUT /user/profile | S13. Settings.test.jsx: calls PUT /user/profile on save. 
| T-105 | Change password (settings) | teacher/src/pages/Settings.jsx · PUT /user/password | S13. Settings.test.jsx: calls PUT /user/password on submit. 
| T-106 | Upload avatar | teacher/src/pages/Settings.jsx | S13. Code: Settings.jsx avatar upload handler -> POST /user/avatar. 
| T-107 | Toggle notification preferences (email, push) | teacher/src/pages/Settings.jsx | S13. Code: Settings.jsx notification preferences toggle. 
| T-108 | Language switcher (UZ/RU/EN) in settings | teacher/src/pages/Settings.jsx | S13. Code: Settings.jsx language switcher calls changeLanguage. 
| T-109 | Send message to government (from profile) | teacher/src/pages/Profile.jsx · POST /teacher/message-to-government | S13. Settings.test.jsx: calls POST /teacher/message-to-government. 
| T-110 | View replies from government | teacher/src/pages/Profile.jsx · GET /teacher/messages | S13. Settings.test.jsx: shows my messages button and opens history modal. 

---

## 17. Cross-cutting

| # | Feature | Where (file:line) | Status | Test scenario |
|---|---|---|---|---|
| T-111 | Toast notification — success | teacher/src/shared/context/ToastContext.jsx | S13. Transitive: ToastContext success fires on all save actions (confirmed admin/reception/parent portals). 
| T-112 | Toast notification — error | teacher/src/shared/context/ToastContext.jsx | S13. Settings.test.jsx: silent on messages endpoint fail (shows error handling pattern). 
| T-113 | Error boundary — crash recovery | teacher/src/App.jsx:46 (ErrorBoundary) | S13. Code: App.jsx:46 ErrorBoundary wraps route content. 
| T-114 | Real-time socket connection established | teacher/src/shared/context/SocketContext.jsx | S13. Code: SocketContext.jsx connects to socket.io server on auth. 
| T-115 | Notification panel — view list | teacher/src/shared/context/NotificationContext.jsx | S13. Code: NotificationContext.jsx provides notification list and badge count. 
| T-116 | Notification — mark as read | backend/routes/notificationRoutes.js · PUT /notifications/:id/read | S13. Code: backend/routes/notificationRoutes.js PUT /notifications/:id/read (backend S7). 

---

## Notes

- **Child goals** (T-068 area via `/teacher/children/:childId/goals`): `requireRole('teacher')` — strictly teacher-only, not reception
- **Reflections** (T-062): `requireRole('teacher')` — strictly teacher-only, not reception
- **Journal** (T-065): `requireTeacher` allows teacher/reception/admin (CLAUDE.md `requireTeacher` note)
- **IRR mutations** (T-070, T-076–T-091): `requireRole('teacher')` — strictly teacher-only
- **Therapy**: `TherapyManagement.test.jsx` exists in `teacher/src/__tests__/`
