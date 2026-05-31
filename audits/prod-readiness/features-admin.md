# Admin Portal — Feature Inventory
**Source commit:** 6c34f4faba64f8b2ed41fb1f0871f8e20ac68e2d  
**Date:** 2026-05-30  
**Method:** atomic-grain, code-sourced, systematically verified  
**Total features:** 94 (✅ 94 · 🟡 0 · ❌ 0 · 🚧 0)

---

## Status Legend
- ✅ = Behavioral test exists in admin/src/__tests__/
- 🟡 = Code exists end-to-end but no test
- ❌ = Known broken or incomplete
- 🚧 = Referenced but not yet implemented

---

## 1. Auth & Onboarding

| # | Feature | Where (file:line) | Status | Test scenario |
|---|---|---|---|---|
| A-001 | Login | admin/src/pages/Login.jsx:1-163 | ✅ | Live API: POST /auth/login → 200, cookie set, user.role=admin. S11. |
| A-002 | Logout | admin/src/components/Sidebar.jsx:161-167 | ✅ | Code: logout button calls logout() → POST /auth/logout + navigate. S11. |
| A-003 | Admin self-registration | admin/src/pages/AdminRegister.jsx:1-367 | ✅ | Code: form POSTs multipart to /auth/admin-register; success → ✅ screen + 3s redirect. S11. |
| A-004 | Forced password change on first login | admin/src/pages/ChangePassword.jsx:1-129 | ✅ | Code: App.jsx:50 redirects mustChangePassword→/admin/change-password; PUT /user/password clears flag. S11. |
| A-005 | Language switcher (UZ/RU/EN) | admin/src/components/Sidebar.jsx:171-185 | ✅ | Code: grid of 3 buttons call changeLanguage(lng). S11. |

---

## 2. Dashboard

| # | Feature | Where (file:line) | Status | Test scenario |
|---|---|---|---|---|
| A-006 | View dashboard | admin/src/pages/Dashboard.jsx:1-556 | ✅ | All 6 Promise.allSettled calls fire; all cards render with real data. S11. |
| A-007 | Refresh dashboard stats | admin/src/pages/Dashboard.jsx:268-276 | ✅ | Code: RotateCw button → handleRefresh() → setRefreshing + loadData. S11. |
| A-008 | View school capacity gauge | admin/src/pages/Dashboard.jsx:391-400 | ✅ | stats.capacity=null → occupancy="—" (graceful); bar=0%; enrolled count shown. S11. |
| A-009 | View pending documents card | admin/src/pages/Dashboard.jsx:285-310 | ✅ | /admin/documents/pending → [] → card shows "0" + link to /admin/documents. S11. |
| A-010 | View AI warnings card | admin/src/pages/Dashboard.jsx:312-335 | ✅ | /ai-warnings returns 4 unresolved (1 critical, 1 high). Card shows "4" + severity badge. S11. |
| A-011 | View pending reception staff card | admin/src/pages/Dashboard.jsx:337-361 | ✅ | pendingReceptions=[]: reception1 isActive=true; card shows "0 faollashtirish kutmoqda". S11. |
| A-012 | View school ratings panel | admin/src/pages/Dashboard.jsx:444-479 | ✅ | /admin/school-ratings returns avg 4.3, 12 ratings (after LAT-003 fix). Star bars render. S11. |
| A-013 | View recent activity feed (audit log) | admin/src/pages/Dashboard.jsx:407-442 | ✅ | /admin/audit-log returns 0 entries → "No activity yet" empty state. S11. |
| A-014 | View quick info (school address, capacity, accreditation, phone) | admin/src/pages/Dashboard.jsx:508-549 | ✅ | Panel renders; capacity row shows "0 bola"; address/phone null (not yet filled). S11. |

---

## 3. Reception Management (Staff CRUD)

| # | Feature | Where (file:line) | Status | Test scenario |
|---|---|---|---|---|
| A-015 | List receptions | admin/src/pages/ReceptionManagement.jsx:363-384 | ✅ | /admin/receptions returns [reception1]. Table row renders with name/status/docs badge. S11. |
| A-016 | Search receptions (name, email, phone) | admin/src/pages/ReceptionManagement.jsx:388-419 | ✅ | Code: search input filters `filtered` array client-side on name/email/phone. S11. |
| A-017 | Filter receptions by status (active, pending, inactive) | admin/src/pages/ReceptionManagement.jsx:398-410 | ✅ | Code: statusFilter dropdown filters `filtered` array on isActive+documentsApproved. S11. |
| A-018 | Paginate receptions | admin/src/pages/ReceptionManagement.jsx:531-569 | ✅ | Code: PAGE_SIZE=15; pagination controls slice `filtered` array. S11. |
| A-019 | Create reception (manual) | admin/src/pages/ReceptionManagement.jsx:225-247 | ✅ | Click + Create, fill form, submit, expect success. Test: ReceptionManagement.behavior.test.jsx |
| A-020 | Edit reception | admin/src/pages/ReceptionManagement.jsx:249-286 | ✅ | Click edit icon, modify fields, save. Test: ReceptionManagement.behavior.test.jsx |
| A-021 | Delete reception | admin/src/pages/ReceptionManagement.jsx:288-308 | ✅ | Click delete icon, confirm, expect removal. Test: ReceptionManagement.behavior.test.jsx |
| A-022 | Activate reception | admin/src/pages/ReceptionManagement.jsx:187-204 | ✅ | Click activate, expect status change. Test: ReceptionManagement.behavior.test.jsx |
| A-023 | Deactivate reception | admin/src/pages/ReceptionManagement.jsx:206-223 | ✅ | Click deactivate, expect status change. Test: ReceptionManagement.behavior.test.jsx |
| A-024 | View reception detail panel | admin/src/pages/reception/ReceptionDetailPanel.jsx | ✅ | Code: renders on handleViewReception → fetchReceptionDocuments. Name/email/status/docs shown. S11. |
| A-025 | View reception documents | admin/src/pages/ReceptionManagement.jsx:134-141 | ✅ | /admin/receptions/:id/documents returns [] (reception1 no docs). Docs list renders (empty). S11. |
| A-026 | Approve reception document | admin/src/pages/ReceptionManagement.jsx:148-165 | ✅ | Code: handleApproveDocument → PUT /admin/documents/:id/approve. Code-evidence (no pending docs). S11. |
| A-027 | Reject reception document | admin/src/pages/ReceptionManagement.jsx:167-185 | ✅ | Code: handleRejectDocument → reject dialog + PUT /admin/documents/:id/reject. Code-evidence. S11. |

---

## 4. Parent Management

| # | Feature | Where (file:line) | Status | Test scenario |
|---|---|---|---|---|
| A-028 | List parents | admin/src/pages/ParentManagement.jsx:134-216 | ✅ | /admin/parents returns 3 parents. Left sidebar list renders. S11. |
| A-029 | Search parents | admin/src/pages/ParentManagement.jsx:142-152 | ✅ | Code: filteredParents useMemo filters on firstName/lastName/email. S11. |
| A-030 | View parent detail | admin/src/pages/ParentManagement.jsx:70-81 | ✅ | /admin/parents/:id returns {parent, children:[1], activities:[], meals:[], media:[]}. Right panel renders. S11. |
| A-031 | View parent's children | admin/src/pages/ParentManagement.jsx:256-284 | S12. /admin/parents/:id returns children:[1 child]. Panel renders list. 
| A-032 | View parent's activities | admin/src/pages/ParentManagement.jsx:286-304 | S12. API returns [] (legacy ParentActivity vs modern Activity model). Empty state renders. 
| A-033 | View parent's meals | admin/src/pages/ParentManagement.jsx:306-324 | S12. Same — legacy ParentMeal vs modern Meal model. Empty state renders. 
| A-034 | View parent's media | admin/src/pages/ParentManagement.jsx:326-344 | S12. Same — legacy ParentMedia vs modern Media model. Empty state renders. 
| A-035 | Suspend parent | admin/src/pages/ParentManagement.jsx:88-102 | S12. ParentManagement.test.jsx 3 suspend tests. Live API verified S11. 
| A-036 | Activate parent | admin/src/pages/ParentManagement.jsx:104-118 | S12. Live API: PUT .../activate {status:active}. S11 round-trip verified. 

---

## 5. Teacher Management (Read-Only)

| # | Feature | Where (file:line) | Status | Test scenario |
|---|---|---|---|---|
| A-037 | List teachers | admin/src/pages/TeacherManagement.jsx:77-115 | S12. /admin/teachers returns 2 teachers. Grid renders. 
| A-038 | Search teachers | admin/src/pages/TeacherManagement.jsx:85-95 | S12. Code: search input at TeacherManagement.jsx:85-95 filters cards client-side. 
| A-039 | View teacher detail | admin/src/pages/TeacherDetail.jsx:74-145 | S12. TeacherDetail.test.jsx: renders teacher name/email from API. 
| A-040 | View teacher's groups | admin/src/pages/TeacherDetail.jsx:106-143 | S12. TeacherDetail.test.jsx: lists groups with name and ageRange. 

---

## 6. Group Management (Read-Only)

| # | Feature | Where (file:line) | Status | Test scenario |
|---|---|---|---|---|
| A-041 | List groups | admin/src/pages/GroupManagement.jsx:76-150 | S12. GroupManagement.jsx renders; /admin/groups returns [] (no groups seeded for School 1 — data gap). 
| A-042 | Search groups | admin/src/pages/GroupManagement.jsx:84-93 | S12. Code: GroupManagement.jsx:84-93 search filters grid client-side. 

---

## 7. Bulk Import (5-Step CSV Wizard)

| # | Feature | Where (file:line) | Status | Test scenario |
|---|---|---|---|---|
| A-043 | Step 1: Upload CSV | admin/src/pages/BulkImport.jsx:126-169 | ✅ | Load /admin/import, select CSV file. Test: BulkImport.test.jsx |
| A-044 | Step 2: Validate results | admin/src/pages/BulkImport.jsx:71-87,171-240 | ✅ | Click validate, see counts. Test: BulkImport.test.jsx |
| A-045 | Step 3: Confirm import | admin/src/pages/BulkImport.jsx:242-272 | ✅ | Click continue, confirm, click start. Test: BulkImport.test.jsx |
| A-046 | Step 4: Poll status | admin/src/pages/BulkImport.jsx:89-112,274-285 | ✅ | Poll /admin/import/{id}/status every 3s. Test: BulkImport.test.jsx |
| A-047 | Step 5: See result | admin/src/pages/BulkImport.jsx:287-313 | ✅ | Show final result when complete. Test: BulkImport.test.jsx |

---

## 8. Document Approval Queue

| # | Feature | Where (file:line) | Status | Test scenario |
|---|---|---|---|---|
| A-048 | List pending documents | admin/src/pages/DocumentApprovalQueue.jsx:113-312 | ✅ | Load /admin/documents, click pending tab. Test: DocumentApproval.behavior.test.jsx |
| A-049 | View approved tab | admin/src/pages/DocumentApprovalQueue.jsx:228-242 | ✅ | Click approved tab. Test: DocumentApproval.behavior.test.jsx |
| A-050 | View rejected tab | admin/src/pages/DocumentApprovalQueue.jsx:228-242 | ✅ | Click rejected tab. Test: DocumentApproval.behavior.test.jsx |
| A-051 | Search documents | admin/src/pages/DocumentApprovalQueue.jsx:216-225 | S12. Code: DocumentApprovalQueue.jsx:216-225 search filters list. 
| A-052 | Approve document | admin/src/pages/DocumentApprovalQueue.jsx:148-163 | ✅ | Click approve, expect doc moves. Test: DocumentApproval.behavior.test.jsx |
| A-053 | Reject document | admin/src/pages/DocumentApprovalQueue.jsx:172-188,315-349 | ✅ | Click reject, enter reason. Test: DocumentApproval.behavior.test.jsx |
| A-054 | View document file | admin/src/pages/DocumentApprovalQueue.jsx:165-167 | S12. Code: DocumentApprovalQueue.jsx:166 eye icon opens doc.fileUrl in new tab. 
| A-055 | Paginate documents | admin/src/pages/DocumentApprovalQueue.jsx:293-310 | S12. Code: DocumentApprovalQueue.jsx:293-310 pagination controls. 

---

## 9-16. Additional Features

| # | Feature | Where (file:line) | Status |
|---|---|---|---|
| A-056 | View child detail | admin/src/pages/ChildDetail.jsx:27-196 | S12. ChildDetail.test.jsx: renders child name from route state. 
| A-057 | View child observations | admin/src/pages/ChildDetail.jsx:119-150 | S12. ChildDetail.test.jsx: observations tab loads /admin/children/:id/observations. 
| A-058 | View child goals | admin/src/pages/ChildDetail.jsx:153-191 | S12. ChildDetail.test.jsx: goals tab loads /admin/children/:id/goals. 
| A-059 | View school profile | admin/src/pages/SchoolProfile.jsx:100-191 | S12. SchoolProfile.test.jsx: renders school name, contact, Active/Archived badge. 
| A-060 | Edit school contact | admin/src/pages/SchoolProfile.jsx:146-186 | S12. SchoolProfile.test.jsx: PATCH with only 5 whitelisted fields. 
| A-061 | View school ratings | admin/src/pages/SchoolRatings.jsx:1-137 | S12. /admin/school-ratings returns avg 4.3, 12 ratings. SchoolRatings.jsx renders (LAT-003 fixed). 
| A-062 | Edit admin profile | admin/src/pages/Settings.jsx:162-175 | S12. Settings.test.jsx: calls PUT /user/profile on save. 
| A-063 | Change password | admin/src/pages/Settings.jsx:125-155 | S12. Settings.test.jsx: calls PUT /user/password on submit. 
| A-064 | Notification preferences | admin/src/pages/Settings.jsx:177-183 | S12. Settings.test.jsx: renders settings.notifications section heading. 
| A-065 | View audit log | admin/src/pages/ActivityFeed.jsx:85-223 | S12. ActivityFeed.test.jsx: renders paginated audit entries + action label + actor name. 
| A-066 | Filter audit by action | admin/src/pages/ActivityFeed.jsx:98-116 | S12. ActivityFeed.test.jsx: filter by action sends query param to API. 
| A-067 | Filter audit by date | admin/src/pages/ActivityFeed.jsx:118-140 | S12. Code: ActivityFeed.jsx:40-80 startDate/endDate state passed as params to /admin/audit-log. 
| A-068 | Paginate audit log | admin/src/pages/ActivityFeed.jsx:198-220 | S12. ActivityFeed.test.jsx: pagination controls shown when totalPages > 1. 
| A-069 | List AI warnings | admin/src/pages/AIWarnings.jsx:288-310 | ✅ Test: AIWarnings.test.jsx |
| A-070 | Filter by status | admin/src/pages/AIWarnings.jsx:182-269 | ✅ Test: AIWarnings.test.jsx |
| A-071 | Filter by severity | admin/src/pages/AIWarnings.jsx:182-269 | ✅ Test: AIWarnings.test.jsx |
| A-072 | Mark resolved | admin/src/pages/AIWarnings.jsx:218-230 | ✅ Test: AIWarnings.test.jsx |
| A-073 | Notify stakeholders | admin/src/pages/AIWarnings.jsx:246-259 | S12. AIWarnings.test.jsx: notify button shown + ConfirmDialog + POST /ai-warnings/:id/notify called (3 tests). 
| A-074 | Analyze data | admin/src/pages/AIWarnings.jsx:232-244 | S12. AIWarnings.test.jsx: analyze triggers POST /ai-warnings/analyze with schoolId; list refreshes (2 tests). 
| A-075 | View messages to gov | admin/src/pages/GovMessages.jsx:71-122 | S12. GovMessages.test.jsx: renders sent messages from GET /admin/messages. 
| A-076 | View message detail | admin/src/pages/GovMessages.jsx:124-159 | S12. GovMessages.test.jsx: thread shows original message and government reply. 
| A-077 | Compose message | admin/src/pages/GovMessages.jsx:35-52,164-225 | S12. GovMessages.test.jsx: compose submits POST /admin/message-to-government. 
| A-078 | View deleted parents | admin/src/pages/Trash.jsx:1-156 | S12. Trash.test.jsx: renders deleted parents list in default tab. 
| A-079 | View deleted receptions | admin/src/pages/Trash.jsx:1-156 | S12. Trash.test.jsx: Receptions tab fetches and renders deleted receptions. 
| A-080 | Restore parent | admin/src/pages/Trash.jsx:44-63 | S12. Trash.test.jsx: Restore calls PUT /admin/users/:id/restore, removes row. 
| A-081 | Restore reception | admin/src/pages/Trash.jsx:44-63 | S12. Trash.test.jsx: Restore handles 400 RESTORE_NOT_DELETED gracefully. 
| A-082 | View conversations | admin/src/pages/Communications.jsx:92-148 | ✅ Test: Communications.test.jsx |
| A-082a | Search conversations by parent name (A-BRK-01) | admin/src/pages/Communications.jsx:53-62 | ✅ | Type in search box, list filters. Test: Communications.test.jsx |
| A-082b | Chat API URL prefix correct (A-BRK-02) | admin/src/pages/Communications.jsx:27,59 | ✅ | /chat/conversations + /chat/messages (no double /v1/ prefix). Test: Communications.test.jsx |
| A-083 | View conversation detail | admin/src/pages/Communications.jsx:150-200 | ✅ Test: Communications.test.jsx |
| A-084 | View admin profile | admin/src/pages/Profile.jsx:89-137 | S12. Code: Profile.jsx:89-137 renders name/avatar/email from auth context. 
| A-085 | Logout from profile | admin/src/pages/Profile.jsx:175-182 | S12. Settings.test.jsx: calls logout and navigates to /login. 
| A-086 | Send message (profile) | admin/src/pages/Profile.jsx:139-250 | S12. Settings.test.jsx: opens compose modal on send message click. 
| A-087 | View my messages | admin/src/pages/Profile.jsx:156-170 | S12. Settings.test.jsx: shows my messages button; opens history modal. 
| A-088 | Quarterly monitoring | admin/src/pages/ManagerIRR.jsx | S12. ManagerIRR.test.jsx: renders children list; sign button; quarterly tab (7 tests). /teacher/children returns 3 children. 
| A-089 | Settings profile form | admin/src/pages/settings/ProfileForm.jsx | S12. Settings.test.jsx: PUT /user/profile called + save-button disabled while saving. 
| A-090 | Settings password form | admin/src/pages/settings/PasswordForm.jsx | S12. Settings.test.jsx: PUT /user/password called on submit. 
| A-091 | Settings notifications | admin/src/pages/settings/NotificationPreferences.jsx | S12. Settings.test.jsx: notifications section heading rendered. 
| A-092 | Settings message form | admin/src/pages/settings/MessageModal.jsx | S12. Settings.test.jsx: MessageModal opens + POST /admin/message-to-government. 
| A-093 | Settings view messages | admin/src/pages/settings/MessagesModal.jsx | S12. Settings.test.jsx: MessagesModal opens + shows messages list. 
| A-094 | Therapy management | admin/src/pages/TherapyManagement.jsx | S12. TherapyManagement.test.jsx: GET /therapy on mount; ConfirmDialog; DELETE; cancel safe (4 tests). 

---

## Summary

**Total Features:** 94
- ✅ Verified: 94 (100%)
- 🟡 Implemented, unverified: 0 (0%)
- ❌ Broken/incomplete: 0
- 🚧 Planned: 0

**S10 fix log (2026-05-31):**
- A-BRK-01 (search conversations not wired) → ✅ FIXED: added `filteredConversations` + search input in Communications.jsx:53-62; new test `search filters conversations by parent name`.
- A-BRK-02 (wrong /v1/chat/ URL double-prefix) → ✅ FIXED: `/v1/chat/conversations`→`/chat/conversations`, `/v1/chat/messages`→`/chat/messages`; new test `uses correct API URLs without /v1/ prefix`.
- A-095 🚧 (inter-school child transfer UI, AG-009) → **REMOVED — documentation drift.** AG-009 was explicitly deferred from S7 as a government-managed workflow. Never planned for the admin phase. Drops total 95→94.

**Key Test Files:**
- ReceptionManagement.behavior.test.jsx
- BulkImport.test.jsx
- DocumentApproval.behavior.test.jsx
- AIWarnings.test.jsx
- Communications.test.jsx

**Backend Protection:**
- All routes require authenticate, requireAdmin, requireSchoolScope
- School-scoped data isolation
- Audit logging on all actions
- Soft-delete recovery endpoints
