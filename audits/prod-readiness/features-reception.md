# Reception Portal — Feature Inventory
**Source commit:** 6c34f4faba64f8b2ed41fb1f0871f8e20ac68e2d  
**Date:** 2026-05-30  
**Method:** atomic-grain, code-sourced  
**Total features:** 89 (✅ 25 · 🟡 62 · ❌ 0 · 🚧 0) — BRK-001/BRK-002 resolved S6; R-004/R-014/R-018/R-019/R-023/R-026/R-027/R-029/R-030 verified S7

---

## Navigation & Cross-Cutting

| # | Feature | Where (file:line) | Status | Test scenario |
|---|---|---|---|---|
| R-001 | Login with email+password | backend/middleware/auth.js:65 · reception/src/pages/Login.jsx:19 | ✅ | Log in as reception1@uchqun.uz with valid password, expect JWT cookie + dashboard |
| R-002 | Logout | reception/src/context/AuthContext.jsx:4 · reception/src/components/Sidebar.jsx:155 | ✅ | auth.test.js:102–124 covers logout flow |
| R-003 | Forced password change on first login | backend/middleware/auth.js:117 · reception/src/pages/ChangePassword.jsx:1 | ✅ | Log in with mustChangePassword=true, redirect to /change-password |
| R-004 | Change password (Settings page) | reception/src/pages/Settings.jsx:112 · backend/routes/receptionRoutes.js (via /user/password) | ✅ | Settings page renders password form (S7: "parol" text confirmed, handler Settings.jsx:112 calls PUT /user/password) · screenshot R-004-settings.png |
| R-005 | Language switcher (UZ/RU/EN) | reception/src/components/Sidebar.jsx:163 · reception/src/pages/Login.jsx:197 | ✅ | Toggle language buttons, localStorage persists selection |
| R-006 | Dashboard navigation link | reception/src/components/Sidebar.jsx:20 · reception/src/App.jsx:54 | ✅ | Sidebar nav renders correctly per Dashboard.test.jsx |
| R-007 | Parents management nav link | reception/src/components/Sidebar.jsx:21 | ✅ | Link present; ParentManagement tests verify routing |
| R-008 | Teachers management nav link | reception/src/components/Sidebar.jsx:22 | ✅ | Link present; TeacherManagement tests verify routing |
| R-009 | Groups management nav link | reception/src/components/Sidebar.jsx:23 | ✅ | Link present; GroupManagement.test.jsx verifies routing |
| R-010 | Documents management nav link | reception/src/components/Sidebar.jsx:24 | ✅ | Link present; Documents.jsx displays upload + list |
| R-011 | Settings nav link | reception/src/components/Sidebar.jsx:28 | ✅ | Link present; Settings.jsx renders form pages |

---

## Dashboard

| # | Feature | Where (file:line) | Status | Test scenario |
|---|---|---|---|---|
| R-012 | Display school statistics (parent/teacher/group counts) | reception/src/pages/Dashboard.jsx:299–359 | ✅ | Dashboard.test.jsx:87–97 verifies stats render |
| R-013 | Show pending documents count card | reception/src/pages/Dashboard.jsx:176–219 | ✅ | Dashboard.test.jsx:57–72 tests /reception/documents call + pending badge |
| R-014 | Show pending parent activations (status=suspended) | reception/src/pages/Dashboard.jsx:222–264 | ✅ | Card verified (S7): Dashboard.jsx:79 filters parents by status==='suspended', up to 3 shown. Dashboard body text contains 'faollashtirish kutayotgan'. screenshot R-012-dashboard-full.png |
| R-015 | Quick-create button: new parent (wizard) | reception/src/pages/Dashboard.jsx:114–130 | ✅ | Button navigates to /reception/parents/new |
| R-016 | Quick-create button: new teacher | reception/src/pages/Dashboard.jsx:132–148 | ✅ | Button navigates to /reception/teachers |
| R-017 | Quick-create button: upload documents | reception/src/pages/Dashboard.jsx:150–166 | ✅ | Button navigates to /reception/documents |
| R-018 | Recent activity feed (new parent registrations) | reception/src/pages/Dashboard.jsx:268–295 | ✅ | Verified (S7): Dashboard.jsx:82 sorts parents by createdAt desc, slice(0,5). Activity section body confirmed. screenshot R-012-dashboard-full.png |
| R-019 | New children grid (recent registrations) | reception/src/pages/Dashboard.jsx:298–335 | ✅ | Verified (S7): flatMap over parents.children, slice(0,4), correct empty state. 'bola' confirmed in dashboard body. screenshot R-012-dashboard-full.png |

---

## Authentication & Authorization

| # | Feature | Where (file:line) | Status | Test scenario |
|---|---|---|---|---|
| R-020 | Reception-only role enforcement | reception/src/context/AuthContext.jsx:4–7 · backend/middleware/auth.js:154 | ✅ | auth.test.js:66–75 verifies role check rejects non-reception users |
| R-021 | Documents approval gate (documentsApproved=true required) | backend/middleware/auth.js:106–111 | ✅ | Middleware enforces; login shows warning on documents.jsx:177–183 |
| R-022 | Account active gate (isActive=true required) | backend/middleware/auth.js:102–104,106 | ✅ | Middleware enforces for reception role |
| R-023 | ProtectedRoute wrapper | reception/src/components/ProtectedRoute.jsx | ✅ | Verified (S7): anonymous context navigating to /reception/parents → redirected to /login. ProtectedRoute.jsx:16 checks !isAuthenticated || !isReception. screenshot R-023-protected-redirect.png |

---

## Parent Management

| # | Feature | Where (file:line) | Status | Test scenario |
|---|---|---|---|---|
| R-024 | List all parents | reception/src/pages/ParentManagement.jsx:106–132 | ✅ | ParentManagement.test.jsx:133–140 verifies parent cards render |
| R-025 | Search parents by name/email/phone | reception/src/pages/ParentManagement.jsx:346–360 | ✅ | ParentManagement.test.jsx:142–150 tests search filter |
| R-026 | Filter parents by status (active/suspended/pending) | reception/src/pages/ParentManagement.jsx:346–360 | ✅ | LAT-001 fixed (S7): added To'xtatilgan tab; fixed active filter logic (isActive!==false && status!=='suspended'); all 4 tabs confirmed live: Barchasi/Faol/Kutmoqda/To'xtatilgan. screenshots R-026-filter-bar.png, R-026-suspended-active.png |
| R-027 | View parent detail (children, status, date inline in table row) | reception/src/pages/ParentManagement.jsx:524–660 | ✅ | Reclassified (S7): no expand/collapse card — data is inline in table row: Bola col shows first child name, Holat shows StatusBadge, action menu shows edit/add-child/suspend/reset/delete. Row text confirmed: "Hulkar Sobirova … Bobur Sobirov Faol 2026-05-30". screenshot R-027-parent-table.png |
| R-028 | Create new parent (inline form modal) | reception/src/pages/ParentManagement.jsx:139–151 · receptionParentController.js | ✅ | ParentFormModal.jsx handles creation |
| R-029 | Create parent via wizard (3-step: parent/child/group) | reception/src/pages/ParentWizard/ParentWizardPage.jsx:70–98 | ✅ | Verified (S7): all 3 steps render. Step 1: parent info form (6 inputs). Step 2: child info form. Step 3: group assignment. POST /reception/parents on complete. screenshots R-029a/b/c.png |
| R-030 | Edit parent (name, email, phone, group, teacher) | reception/src/pages/ParentManagement.jsx:143–151 | ✅ | Verified (S7): action menu → Tahrirlash → ParentFormModal opens pre-filled (5 inputs confirmed). handleEdit sets formData from parent object; PUT /reception/parents/:id on submit. screenshot R-030b-edit-modal.png |
| R-031 | Delete parent | reception/src/pages/ParentManagement.jsx:153–167 | 🟡 | Modal confirm + API call; test not found |
| R-032 | Activate parent (status=suspended → active) | reception/src/pages/ParentManagement.jsx:205–213 | 🟡 | Button exists; no test |
| R-033 | Suspend parent (block login) | reception/src/pages/ParentManagement.jsx:215–229 | 🟡 | Button exists; no test |
| R-034 | Reset parent password (generate temp password) | reception/src/pages/ParentManagement.jsx:231–244 | 🟡 | Confirm dialog + API POST; no test |
| R-035 | Bulk select parents (checkbox row selection) | reception/src/pages/ParentManagement.jsx:366–380 | ✅ | All three bulk actions wired (S6): activate (confirm dialog + iterate PUT activate), export (client-side CSV BOM), delete (confirm dialog + iterate DELETE). Partial-failure toast for activate/delete. |
| R-036 | Bulk delete parents | reception/src/pages/ParentManagement.jsx:497–519 | ✅ | Delete button wired with confirm dialog; iterates DELETE /reception/parents/:id; surfaces partial failures (S6) |

---

## Children Management

| # | Feature | Where (file:line) | Status | Test scenario |
|---|---|---|---|---|
| R-037 | Add child to existing parent | reception/src/pages/ParentManagement.jsx:198–203 · receptionParentController.js | 🟡 | ChildFormModal handles add; no test coverage |
| R-038 | Edit child (name, DOB, disability type, medical diagnosis, photo) | reception/src/pages/ParentManagement.jsx:169–180 | 🟡 | handleEditChild exists; test not found |
| R-039 | Delete child from parent | reception/src/pages/ParentManagement.jsx:182–196 | 🟡 | Delete endpoint exists; no test |
| R-040 | View child photo (avatar preview) | reception/src/pages/ParentManagement.jsx:311 (render children grid) | 🟡 | Grid renders photo fallback; no test for actual image load |

---

## Teacher Management

| # | Feature | Where (file:line) | Status | Test scenario |
|---|---|---|---|---|
| R-041 | List all teachers | reception/src/pages/TeacherManagement.jsx:57–91 | ✅ | TeacherManagement.test.jsx verifies teacher list renders |
| R-042 | Search teachers by name/email/phone | reception/src/pages/TeacherManagement.jsx:242–250 | 🟡 | Search input exists; test coverage not found |
| R-043 | Create new teacher (modal form) | reception/src/pages/TeacherManagement.jsx:93–103 | 🟡 | Modal renders; no test for submission |
| R-044 | Edit teacher (name, email, phone, password) | reception/src/pages/TeacherManagement.jsx:105–115 | 🟡 | handleEdit exists; no test |
| R-045 | Delete teacher | reception/src/pages/TeacherManagement.jsx:147–161 | 🟡 | Confirm dialog + API DELETE; no test |
| R-046 | Activate teacher (status=suspended → active) | reception/src/pages/TeacherManagement.jsx:163–171 | 🟡 | Button exists; no test |
| R-047 | Suspend teacher (block login) | reception/src/pages/TeacherManagement.jsx:173–187 | 🟡 | Button exists; no test |
| R-048 | Reset teacher password (generate temp password) | reception/src/pages/TeacherManagement.jsx:189–202 | 🟡 | Confirm dialog + API call; no test |
| R-049 | View teacher ratings modal (stars, comments, parent attribution) | reception/src/pages/TeacherManagement.jsx:117–134 | 🟡 | Modal renders ratings; no test verifies API call or data display |

---

## Group Management

| # | Feature | Where (file:line) | Status | Test scenario |
|---|---|---|---|---|
| R-050 | List all groups | reception/src/pages/GroupManagement.jsx:38–55 | ✅ | GroupManagement.test.jsx verifies groups render |
| R-051 | Search groups by name/description | reception/src/pages/GroupManagement.jsx:122–126 | 🟡 | Filter logic exists; test not found |
| R-052 | Create new group (name, teacher, capacity, age range) | reception/src/pages/GroupManagement.jsx:57–67 | 🟡 | Modal form exists; no test |
| R-053 | Edit group | reception/src/pages/GroupManagement.jsx:69–80 | 🟡 | handleEdit exists; no test |
| R-054 | Delete group | reception/src/pages/GroupManagement.jsx:82–96 | 🟡 | Confirm + API DELETE; no test |
| R-055 | Assign teacher to group | reception/src/pages/GroupManagement.jsx:98–120 (formData.teacherId) | 🟡 | Form field exists; no test |

---

## Document Management

| # | Feature | Where (file:line) | Status | Test scenario |
|---|---|---|---|---|
| R-056 | Upload documents (license, certificate, identification, other) | reception/src/pages/Documents.jsx:39–63 · DocumentUpload.jsx | 🟡 | Upload form renders with type selector; no end-to-end test |
| R-057 | View document status (approved/pending/rejected) | reception/src/pages/Documents.jsx:83–196 | 🟡 | Status badges render; no test for API response parsing |
| R-058 | Delete pending document | reception/src/pages/Documents.jsx:65–81 | 🟡 | Delete handler exists; code 'DOCUMENT_CANNOT_DELETE_NON_PENDING' implemented but no test |
| R-059 | Display approval progress card (counts) | reception/src/pages/Documents.jsx:166–196 | 🟡 | Progress card renders; no test |
| R-060 | All approved banner (reception can access full platform) | reception/src/pages/Documents.jsx:108–116 | 🟡 | Banner renders when allApproved=true; no test |

---

## Profile & Settings

| # | Feature | Where (file:line) | Status | Test scenario |
|---|---|---|---|---|
| R-061 | View profile information (name, email, phone, avatar) | reception/src/pages/Profile.jsx:88–134 | 🟡 | Card renders; no test for data display |
| R-062 | Send message to government | reception/src/pages/Profile.jsx:136–168 | 🟡 | Button + modal form exist; no test verifies API call |
| R-063 | View government replies to messages | reception/src/pages/Profile.jsx:253–336 | 🟡 | Messages modal renders with replies; no test |
| R-064 | Update profile (name, email, phone, notification preferences) | reception/src/pages/Settings.jsx:98–110 | 🟡 | Form exists; test not found |
| R-065 | Notification preferences (email, push toggles) | reception/src/pages/Settings.jsx:8–44 | 🟡 | Form field exists; test coverage not found |
| R-066 | Logout from profile button | reception/src/pages/Profile.jsx:172–179 | ✅ | Button click calls logout() |

---

## Backend Route Access

| # | Feature | Where (file:line) | Status | Test scenario |
|---|---|---|---|---|
| R-067 | GET /reception/parents (list parents) | backend/routes/receptionRoutes.js:48 | ✅ | Called from Dashboard.jsx:35, ParentManagement.jsx:109 |
| R-068 | POST /reception/parents (create parent ± child) | backend/routes/receptionRoutes.js:47 | ✅ | Called from ParentWizardPage.jsx:88, ParentManagement form |
| R-069 | PUT /reception/parents/:id (update parent) | backend/routes/receptionRoutes.js:52 | 🟡 | Controller exists; no test verifies call |
| R-070 | DELETE /reception/parents/:id (delete parent) | backend/routes/receptionRoutes.js:53 | 🟡 | Handler exists; no test |
| R-071 | PUT /reception/parents/:id/activate (restore access) | backend/routes/receptionRoutes.js:49 | 🟡 | Button calls endpoint; no test |
| R-072 | PUT /reception/parents/:id/suspend (block access) | backend/routes/receptionRoutes.js:50 | 🟡 | Button calls endpoint; no test |
| R-073 | POST /reception/parents/:id/reset-credentials | backend/routes/receptionRoutes.js:51 | 🟡 | Button calls endpoint; no test |
| R-074 | GET /reception/teachers (list teachers) | backend/routes/receptionRoutes.js:37 | ✅ | Called from TeacherManagement.jsx:62 |
| R-075 | POST /reception/teachers (create teacher) | backend/routes/receptionRoutes.js:36 | 🟡 | Form submission exists; no test |
| R-076 | GET /reception/teachers/:id/ratings (view teacher ratings) | backend/routes/receptionRoutes.js:38 | 🟡 | Modal call exists; no test |
| R-077 | PUT /reception/teachers/:id (update teacher) | backend/routes/receptionRoutes.js:42 | 🟡 | Edit form exists; no test |
| R-078 | DELETE /reception/teachers/:id (delete teacher) | backend/routes/receptionRoutes.js:43 | 🟡 | Delete button exists; no test |
| R-079 | PUT /reception/teachers/:id/activate | backend/routes/receptionRoutes.js:39 | 🟡 | Button exists; no test |
| R-080 | PUT /reception/teachers/:id/suspend | backend/routes/receptionRoutes.js:40 | 🟡 | Button exists; no test |
| R-081 | POST /reception/teachers/:id/reset-credentials | backend/routes/receptionRoutes.js:41 | 🟡 | Button exists; no test |
| R-082 | GET /groups (list groups, shared with teacherRoutes) | backend/routes/receptionRoutes.js:60 | ✅ | Called from GroupManagement.jsx:43 |
| R-083 | POST /groups (create group, shared scope) | backend/routes/receptionRoutes.js:60 | 🟡 | Create form exists; no test |
| R-084 | GET /reception/documents (reception's own documents) | backend/routes/receptionRoutes.js:31 | ✅ | Called from Documents.jsx:25, Dashboard.jsx:39 |
| R-085 | POST /reception/documents (upload document) | backend/routes/receptionRoutes.js:30 | 🟡 | Upload form exists; no test |
| R-086 | DELETE /reception/documents/:id (delete pending doc) | backend/routes/receptionRoutes.js:32 | 🟡 | Delete button exists; no test |
| R-087 | GET /reception/messages (list government replies) | backend/routes/receptionRoutes.js:65 | 🟡 | Messages modal calls endpoint; no test |
| R-088 | POST /reception/message-to-government (send message) | backend/routes/receptionRoutes.js:63 | 🟡 | Modal submit exists; no test |
| R-089 | Teacher-scoped routes via requireTeacher (['teacher','reception','admin']) | backend/routes/teacherRoutes.js:153–164 | 🟡 | Reception has access; no test verifies cross-role endpoint behavior |

---

## Known Issues & Gaps

| # | Issue | Severity | Details |
|---|---|---|---|
| BRK-001 | ✅ RESOLVED (S6) | Medium | All three bulk-action handlers wired in ParentManagement.jsx: activate (confirm + iterate PUT /reception/parents/:id/activate), export (client-side CSV), delete (confirm + iterate DELETE). Confirm-before-destructive; partial-failure toasts. |
| BRK-002 | ✅ VERIFIED (S6) | Low | PUT /groups/:id accessible via groupRoutes.js:45 with requireRole('reception'). Controller updateGroup:181 checks `!group.schoolId \|\| group.schoolId !== req.user.schoolId → 403`. Cross-school isolation proven by groupController.receptionScope.test.js (3 tests, all green). |

---

## Test Coverage Summary

- **Total tests found:** 9 files in reception/src/__tests__/
- **Test files with coverage:** auth.test.js, Dashboard.test.jsx, ParentManagement.test.jsx, TeacherManagement.test.jsx, GroupManagement.test.jsx, ChangePassword.test.jsx, Settings.test.jsx
- **Untested but implemented:** Change password (settings), Teacher/parent CRUD operations, Document upload/delete, Group CRUD, Profile/settings updates, Government message send/view, Ratings view, Bulk operations, Status filters

---

## Production Readiness Assessment

**Auth & Gates:** ✅ Complete  
**Parent Management:** 🟡 Mostly working, some features unverified  
**Teacher Management:** 🟡 Mostly working, some features unverified  
**Group Management:** 🟡 Mostly working, search/edit/delete unverified  
**Document Management:** 🟡 Upload/delete logic exists, no tests  
**Profile & Settings:** 🟡 Forms exist, no tests  
**Backend Integration:** ✅ Routes defined, 🟡 Features mostly untested  

**Recommendation:** Receipt of documents approval must complete before reception can fully access dashboard. All core CRUD operations exist but lack behavioral test coverage. Bulk operations are incomplete (handlers missing). Deploy with caution and plan test automation sprint.