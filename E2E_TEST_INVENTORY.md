# Uchqun — E2E Test Inventory
Produced: 2026-05-12
Purpose: Complete catalog of testable surface area for the E2E test phase.
Platform: Government web platform for special-education school management in Uzbekistan.
Monorepo: backend/ (Express/Sequelize), admin/, teacher/, reception/, government/ (React frontends), shared/

---

## Section 1 — Roles

### government
- **Defined in:** backend/middleware/auth.js:147 (`requireGovernment`), backend/middleware/schoolScope.js:8
- **Scope:** global — no schoolId restriction; `req.isGlobalAccess = true`
- **Primary purpose:** Top-level platform owner; creates and manages admin accounts, views all schools and aggregate statistics, handles messaging from all roles.
- **Distinguishing permissions:**
  - Can create, update, and delete admin and government user accounts (backend/controllers/admin/adminUserController.js)
  - Can approve or reject admin registration requests (backend/controllers/adminRegistrationController.js:303)
  - Can view all schools, all ratings, all students, all teachers, all parents across the platform
  - Can generate and retrieve saved statistics (backend/controllers/governmentController.js:485)
  - Can read, reply to, mark read, and delete messages sent by any role (backend/controllers/governmentMessageController.js)
  - Bypasses schoolId scoping: schoolWhere() returns {} when role is government (backend/middleware/schoolScope.js:28)
  - Can access /api/v1/business/* routes alongside the business role (backend/routes/businessRoutes.js:16)

### business
- **Defined in:** backend/middleware/auth.js:148 (`requireBusiness`), backend/routes/businessRoutes.js:16
- **Scope:** global — no school assignment required
- **Primary purpose:** Business analytics role; views platform-wide user counts and usage statistics.
- **Distinguishing permissions:**
  - Access to /api/v1/business/overview, /users, /usage, /stats routes
  - Shared route access with government role on all business endpoints
  - Cannot create or manage users; read-only analytics access

### admin
- **Defined in:** backend/middleware/auth.js:132 (`requireAdmin`), backend/routes/adminRoutes.js:43
- **Scope:** school-scoped — `req.user.schoolId` determines which resources are visible
- **Primary purpose:** Manages reception accounts within their school, monitors documents, views teachers, parents, and groups in read-only mode.
- **Distinguishing permissions:**
  - Can create, update, and delete Reception accounts (backend/controllers/admin/adminReceptionController.js)
  - Can approve and reject Reception documents, which activates/deactivates Reception login access
  - Can activate or deactivate Reception accounts manually
  - Read-only access to teachers, parents, and groups created by their Receptions
  - Must have `isActive = true` to log in (backend/controllers/authController.js:126)
  - Can send messages to government (backend/routes/adminRoutes.js:47)
  - Can view school ratings (backend/controllers/admin/adminStatsController.js:310)
  - Can view dashboard statistics aggregated across their reception hierarchy
  - Can manage news: create, update, delete, view published and draft articles (backend/routes/newsRoutes.js:37)
  - Can analyze ratings and generate AI warnings (backend/routes/aiWarningRoutes.js:21)

### reception
- **Defined in:** backend/middleware/auth.js:132 (`requireReception`), backend/routes/receptionRoutes.js:26
- **Scope:** school-scoped — creates and manages all parents and teachers within their school
- **Primary purpose:** Front-desk role that onboards teachers and parents, manages groups, and uploads compliance documents.
- **Distinguishing permissions:**
  - Cannot log in until `documentsApproved = true` AND `isActive = true` (backend/controllers/authController.js:113)
  - Both conditions are checked again on every authenticated request (backend/middleware/auth.js:100)
  - Can create, update, and delete Teacher accounts (backend/controllers/receptionTeacherController.js)
  - Can create, update, and delete Parent accounts and their children (backend/controllers/receptionParentController.js)
  - Can create, update, and delete Groups (backend/routes/groupRoutes.js:39)
  - Can upload compliance documents for admin review (backend/routes/receptionRoutes.js:30)
  - Can view their own verification status (backend/routes/receptionRoutes.js:32)
  - Cannot access Activity, Meals, Media, or News modules directly
  - `requireTeacher` middleware also allows reception: can create/update/delete activities and meals

### teacher
- **Defined in:** backend/middleware/auth.js:135 (`requireTeacher`), backend/routes/teacherRoutes.js:34
- **Scope:** school-scoped; additionally scoped to parents assigned to them via `User.teacherId`
- **Primary purpose:** Creates activities, meals, and media for children; maintains emotional monitoring journals; uses AI chat assistant.
- **Distinguishing permissions:**
  - `requireTeacher` accepts roles ['teacher', 'reception', 'admin'] (backend/middleware/auth.js:139)
  - Can create, update, delete Activities for assigned children (backend/controllers/activityController.js:212)
  - Can upload and manage Media files to Appwrite storage (backend/controllers/mediaController.js:295)
  - Can create, update, delete Meals (backend/routes/mealRoutes.js:22)
  - Can create and update EmotionalMonitoring records (backend/controllers/emotionalMonitoringController.js:20)
  - Can create and manage Therapy records (backend/routes/therapyRoutes.js:35)
  - Can view only parents assigned to them (`User.teacherId = req.user.id`)
  - Can use AI chat via `/api/v1/teacher/ai/chat` (backend/routes/teacherRoutes.js:66)
  - Creates notifications for parent when activity/media is created (createNotification helper)
  - Emits Socket.io real-time events to parents on activity/media/meal CRUD

### parent
- **Defined in:** backend/middleware/auth.js:145 (`requireParent`), backend/routes/parentRoutes.js
- **Scope:** self-only — can only see data for their own children
- **Primary purpose:** Monitors their child's activities, meals, and media; communicates with teacher; rates school and teacher; uses AI advice.
- **Distinguishing permissions:**
  - Never blocked by `isActive` check (backend/middleware/auth.js:93)
  - Can only view activities, meals, media, and emotional monitoring for their own children
  - Can rate their assigned teacher (backend/controllers/parent/parentTeacherRatingController.js)
  - Can rate their school (backend/controllers/parent/parentSchoolRatingController.js)
  - Can submit parent evaluations (daily/weekly/monthly) (backend/routes/parentRoutes.js:68)
  - Can use AI advice chat with rate limiting (backend/routes/parentRoutes.js:51)
  - Can chat with teacher via Chat module (chatController.js — conversationId = parent:userId)
  - Cannot edit or create school/child/activity/meal/media records
  - Can send messages to government

---

## Section 2 — Backend API Surface

### Auth Routes (`/api/v1/auth`)

| Method | Path | Allowed Roles | Purpose | File:Line |
|--------|------|---------------|---------|-----------|
| POST | /api/v1/auth/login | public | Authenticate user, issue JWT cookies | authRoutes.js:12 |
| POST | /api/v1/auth/refresh | public | Rotate access+refresh token pair | authRoutes.js:13 |
| POST | /api/v1/auth/set-password | public | Set password via one-time JWT token | authRoutes.js:14 |
| GET | /api/v1/auth/me | authenticated | Get current user profile | authRoutes.js:15 |
| POST | /api/v1/auth/logout | authenticated | Revoke JTI, clear cookies | authRoutes.js:16 |
| POST | /api/v1/auth/admin-register | public | Submit admin registration request with documents | authRoutes.js:18 |

#### POST /api/v1/auth/login
- **Request:** `{ email: string, password: string }`
- **Success:** 200 `{ success: true, expiresIn: "15m", user: UserObject }` + cookies `accessToken` (15m) + `refreshToken` (7d)
- **Errors:** 400 (missing email/password), 401 (invalid credentials), 403 (reception not approved, admin inactive), 429 (lockout after 5 failures), 500 (JWT_SECRET missing, password not hashed)
- **Side effects:** Clears failed attempt counter on success; sets HTTP-only cookies; records failed attempt to Redis/in-memory on failure
- **Transactions:** no

#### POST /api/v1/auth/refresh
- **Request:** `{ refreshToken?: string }` (or cookie `refreshToken`)
- **Success:** 200 `{ success: true, expiresIn: "15m" }` + new cookies
- **Errors:** 401 (missing token, invalid, expired)
- **Side effects:** Revokes old refresh token row, creates new refresh token row in DB
- **Transactions:** no

#### POST /api/v1/auth/logout
- **Request:** (no body — uses cookie)
- **Success:** 200 `{ success: true, message: "Logged out successfully" }`
- **Errors:** 401 (no token), 500
- **Side effects:** Revokes all active refresh tokens for user; adds JTI to Redis/in-memory revocation store; clears both cookies
- **Transactions:** no

#### GET /api/v1/auth/me
- **Request:** (no body)
- **Success:** 200 `{ success: true, data: UserObject }` (password excluded)
- **Errors:** 401, 404 (user deleted after token issued)
- **Side effects:** none
- **Transactions:** no

#### POST /api/v1/auth/set-password
- **Request:** `{ token: string, password: string }`
- **Success:** 200 `{ success: true, message: "Password set successfully. You can now log in." }`
- **Errors:** 400 (missing fields, invalid/expired token, wrong token purpose, password policy: min 8 chars, upper+lower+digit), 404 (user not found)
- **Side effects:** Updates user.password (hashed by model hook); does NOT auto-login
- **Transactions:** no

#### POST /api/v1/auth/admin-register
- **Request:** multipart/form-data `{ firstName, lastName, email, phone, telegramUsername, certificateFile?, passportFile?, schoolId? }`
- **Success:** 201 `{ success: true, message: "...", data: AdminRegistrationRequest }`
- **Errors:** 400 (missing fields, invalid telegram username format 5-32 chars, no documents, email exists, duplicate pending request)
- **Side effects:** Uploads documents to Appwrite; creates AdminRegistrationRequest row; cleans up temp files
- **Transactions:** no (file cleanup on DB error via try/catch)

---

### Admin Routes (`/api/v1/admin`) — all require `authenticate` + `requireAdmin`

| Method | Path | Purpose | File:Line |
|--------|------|---------|-----------|
| POST | /api/v1/admin/message-to-government | Send message to government | adminRoutes.js:47 |
| GET | /api/v1/admin/messages | Get admin's sent messages | adminRoutes.js:49 |
| POST | /api/v1/admin/receptions | Create reception account | adminRoutes.js:52 |
| GET | /api/v1/admin/receptions | List own receptions | adminRoutes.js:53 |
| GET | /api/v1/admin/receptions/:id | Get single reception with documents | adminRoutes.js:54 |
| PUT | /api/v1/admin/receptions/:id | Update reception | adminRoutes.js:55 |
| DELETE | /api/v1/admin/receptions/:id | Delete reception | adminRoutes.js:56 |
| PUT | /api/v1/admin/receptions/:id/activate | Manually activate reception | adminRoutes.js:57 |
| PUT | /api/v1/admin/receptions/:id/deactivate | Deactivate reception | adminRoutes.js:58 |
| GET | /api/v1/admin/documents/pending | List pending documents | adminRoutes.js:61 |
| GET | /api/v1/admin/receptions/:id/documents | Get reception's documents | adminRoutes.js:62 |
| PUT | /api/v1/admin/documents/:id/approve | Approve document | adminRoutes.js:63 |
| PUT | /api/v1/admin/documents/:id/reject | Reject document | adminRoutes.js:64 |
| GET | /api/v1/admin/teachers | List teachers (read-only) | adminRoutes.js:67 |
| GET | /api/v1/admin/parents | List parents (read-only) | adminRoutes.js:68 |
| GET | /api/v1/admin/parents/:id | Get parent with data | adminRoutes.js:69 |
| GET | /api/v1/admin/groups | List groups (read-only) | adminRoutes.js:70 |
| GET | /api/v1/admin/groups/:id | Get group detail | adminRoutes.js:71 |
| GET | /api/v1/admin/statistics | Dashboard statistics | adminRoutes.js:74 |
| GET | /api/v1/admin/school-ratings | View school ratings | adminRoutes.js:77 |

#### PUT /api/v1/admin/documents/:id/approve
- **Request:** `{}` (no body needed)
- **Success:** 200 `{ success: true, message: "Document approved", data: Document }`
- **Errors:** 404 (document not found), 403 (document not owned by this admin's reception), 400 (not pending)
- **Side effects:** Sets document.status = 'approved'; if ALL documents for the reception are now approved, sets User.documentsApproved = true and User.isActive = true; calls invalidateUserCache(receptionId)
- **Transactions:** no (multiple saves — potential partial state on failure)

#### PUT /api/v1/admin/documents/:id/reject
- **Request:** `{ rejectionReason: string }`
- **Success:** 200 `{ success: true, message: "Document rejected", data: Document }`
- **Errors:** 400 (no rejection reason, not pending), 404, 403
- **Side effects:** Sets document.status = 'rejected', sets reception.documentsApproved = false, reception.isActive = false; invalidates user cache
- **Transactions:** no

#### POST /api/v1/admin/receptions
- **Request:** `{ email, password, firstName, lastName, phone? }`
- **Success:** 201 `{ success: true, data: UserObject }`
- **Errors:** 400 (missing required fields, email exists)
- **Side effects:** Creates User row with role='reception', isActive=false, documentsApproved=false, createdBy=adminId, schoolId inherited from admin
- **Transactions:** no

---

### Reception Routes (`/api/v1/reception`) — all require `authenticate` + `requireReception`

| Method | Path | Purpose | File:Line |
|--------|------|---------|-----------|
| POST | /api/v1/reception/documents | Upload compliance document | receptionRoutes.js:30 |
| GET | /api/v1/reception/documents | Get own documents | receptionRoutes.js:31 |
| GET | /api/v1/reception/verification-status | Get approval status | receptionRoutes.js:32 |
| POST | /api/v1/reception/teachers | Create teacher | receptionRoutes.js:35 |
| GET | /api/v1/reception/teachers | List own teachers | receptionRoutes.js:36 |
| GET | /api/v1/reception/teachers/:id/ratings | Get teacher's ratings | receptionRoutes.js:37 |
| PUT | /api/v1/reception/teachers/:id | Update teacher | receptionRoutes.js:38 |
| DELETE | /api/v1/reception/teachers/:id | Delete teacher | receptionRoutes.js:39 |
| POST | /api/v1/reception/parents | Create parent (+ optional child) | receptionRoutes.js:43 |
| GET | /api/v1/reception/parents | List own parents | receptionRoutes.js:44 |
| PUT | /api/v1/reception/parents/:id | Update parent | receptionRoutes.js:45 |
| DELETE | /api/v1/reception/parents/:id | Delete parent + children | receptionRoutes.js:46 |
| POST | /api/v1/reception/children | Add child to existing parent | receptionRoutes.js:48 |
| PUT | /api/v1/reception/children/:id | Update child | receptionRoutes.js:49 |
| DELETE | /api/v1/reception/children/:id | Delete child + cascade | receptionRoutes.js:50 |
| GET | /api/v1/reception/groups | List groups for teacher assignment | receptionRoutes.js:53 |
| POST | /api/v1/reception/message-to-government | Send message to government | receptionRoutes.js:56 |
| GET | /api/v1/reception/messages | Get own messages | receptionRoutes.js:58 |

#### POST /api/v1/reception/parents
- **Request:** multipart/form-data `{ email, password, firstName, lastName, phone?, teacherId?, groupId?, child[firstName]?, child[lastName]?, child[dateOfBirth]?, child[gender]?, child[disabilityType]?, child[medicalDiagnosis]?, child[specialNeeds]?, child[photo]? }`
- **Success:** 201 `{ success: true, data: UserObject }` (includes assignedTeacher, group, children)
- **Errors:** 400 (missing email/password/firstName/lastName, email exists, invalid teacherId, invalid groupId, group/teacher mismatch)
- **Side effects:** Uploads child photo to Appwrite (if provided); creates User (parent) + Child in transaction; child inherits schoolId from reception
- **Transactions:** yes — parent + child creation atomic (receptionParentController.js:92)

#### DELETE /api/v1/reception/children/:id
- **Request:** (no body)
- **Success:** 200 `{ success: true, message: "Child deleted successfully" }`
- **Errors:** 404, 403 (child's parent not created by this reception)
- **Side effects:** Deletes from Appwrite if child has photo; deletes TherapyUsage, Activity, Media, Meal, Progress records for child in transaction; then destroys child
- **Transactions:** yes (cascade delete, receptionParentController.js:381)

---

### Parent Routes (`/api/v1/parent`) — require `authenticate` + `requireParent` unless noted

| Method | Path | Purpose | File:Line |
|--------|------|---------|-----------|
| POST | /api/v1/parent/ai/chat | AI advice (rate-limited 20/min) | parentRoutes.js:51 |
| GET | /api/v1/parent/children | Get own children | parentRoutes.js:53 |
| GET | /api/v1/parent/activities | Get activities for own children | parentRoutes.js:54 |
| GET | /api/v1/parent/activities/:id | Get single activity | parentRoutes.js:55 |
| GET | /api/v1/parent/meals | Get meals for own children | parentRoutes.js:56 |
| GET | /api/v1/parent/meals/:id | Get single meal | parentRoutes.js:57 |
| GET | /api/v1/parent/media | Get media for own children | parentRoutes.js:58 |
| GET | /api/v1/parent/media/:id | Get single media item | parentRoutes.js:59 |
| GET | /api/v1/parent/profile | Get own profile | parentRoutes.js:60 |
| GET | /api/v1/parent/ratings | Get own teacher rating | parentRoutes.js:61 |
| POST | /api/v1/parent/ratings | Rate own teacher | parentRoutes.js:62 |
| GET | /api/v1/parent/school-rating | Get own school rating | parentRoutes.js:63 |
| POST | /api/v1/parent/school-rating | Rate own school | parentRoutes.js:64 |
| GET | /api/v1/parent/schools | List active schools | parentRoutes.js:65 |
| POST | /api/v1/parent/evaluations | Submit parent evaluation | parentRoutes.js:68 |
| GET | /api/v1/parent/evaluations | Get own evaluations | parentRoutes.js:69 |
| POST | /api/v1/parent/message-to-government | Send message to government | parentRoutes.js:72 |
| GET | /api/v1/parent/messages | Get own messages to government | parentRoutes.js:74 |
| GET | /api/v1/parent/emotional-monitoring/child/:childId | Get monitoring by child | parentRoutes.js:77 |
| GET | /api/v1/parent/emotional-monitoring/:id | Get single monitoring record | parentRoutes.js:78 |
| GET | /api/v1/parent/:parentId/data | Get parent data (admin/reception only) | parentRoutes.js:82 |

#### POST /api/v1/parent/school-rating
- **Request:** `{ schoolId?: string (UUID), schoolName?: string, stars: integer 1-5, comment?: string, evaluation?: object }`
- **Success:** 200 `{ success: true, message: "...", data: SchoolRating }`
- **Errors:** 400 (missing stars, invalid stars, no schoolId and no schoolName, invalid UUID), 401, 403 (non-parent), 404 (school not found by ID), 409 (constraint race condition)
- **Side effects:** Upserts SchoolRating row (findOrCreate pattern); if school not found by name, creates new School record
- **Transactions:** no

#### POST /api/v1/parent/ratings
- **Request:** `{ stars: integer 1-5, comment?: string }`
- **Success:** 200 `{ success: true, data: TeacherRating }`
- **Errors:** 400 (no stars, stars out of range, no assigned teacher)
- **Side effects:** Upserts TeacherRating; recalculates and updates teacher's User.rating and User.totalRatings fields
- **Transactions:** no

---

### Teacher Routes (`/api/v1/teacher`) — all require `authenticate` + `requireTeacher`

| Method | Path | Purpose | File:Line |
|--------|------|---------|-----------|
| GET | /api/v1/teacher/profile | Get own teacher profile | teacherRoutes.js:38 |
| GET | /api/v1/teacher/dashboard | Get teacher dashboard data | teacherRoutes.js:39 |
| GET | /api/v1/teacher/responsibilities | Get assigned responsibilities | teacherRoutes.js:42 |
| GET | /api/v1/teacher/responsibilities/:id | Get single responsibility | teacherRoutes.js:43 |
| GET | /api/v1/teacher/tasks | Get assigned tasks | teacherRoutes.js:46 |
| GET | /api/v1/teacher/tasks/:id | Get single task | teacherRoutes.js:47 |
| PUT | /api/v1/teacher/tasks/:id/status | Update task status | teacherRoutes.js:48 |
| GET | /api/v1/teacher/work-history | Get work history | teacherRoutes.js:51 |
| GET | /api/v1/teacher/work-history/:id | Get single work history | teacherRoutes.js:52 |
| PUT | /api/v1/teacher/work-history/:id/status | Update work history status | teacherRoutes.js:53 |
| GET | /api/v1/teacher/parents | List assigned parents | teacherRoutes.js:56 |
| GET | /api/v1/teacher/parents/:id | Get single parent detail | teacherRoutes.js:57 |
| GET | /api/v1/teacher/groups | Get own groups | teacherRoutes.js:60 |
| GET | /api/v1/teacher/ratings | Get teacher's own ratings | teacherRoutes.js:63 |
| POST | /api/v1/teacher/ai/chat | AI chat assistant | teacherRoutes.js:66 |
| POST | /api/v1/teacher/message-to-government | Send message to government | teacherRoutes.js:69 |
| GET | /api/v1/teacher/messages | Get own messages to government | teacherRoutes.js:71 |
| GET | /api/v1/teacher/emotional-monitoring/child/:childId | Get monitoring by child | teacherRoutes.js:75 |
| GET | /api/v1/teacher/emotional-monitoring/:id | Get single monitoring record | teacherRoutes.js:76 |
| PUT | /api/v1/teacher/emotional-monitoring/:id | Update monitoring record | teacherRoutes.js:77 |
| DELETE | /api/v1/teacher/emotional-monitoring/:id | Delete monitoring record | teacherRoutes.js:78 |
| POST | /api/v1/teacher/emotional-monitoring | Create monitoring record | teacherRoutes.js:80 |
| GET | /api/v1/teacher/emotional-monitoring | Get all monitoring records | teacherRoutes.js:81 |

---

### Government Routes (`/api/v1/government`)

| Method | Path | Allowed Roles | Purpose | File:Line |
|--------|------|---------------|---------|-----------|
| POST | /api/v1/government/messages | parent, teacher, reception, admin, business, government | Send message to government | governmentRoutes.js:54 |
| GET | /api/v1/government/overview | government | Platform overview stats | governmentRoutes.js:60 |
| GET | /api/v1/government/schools | government | School stats list | governmentRoutes.js:61 |
| GET | /api/v1/government/schools-list | government | All active schools | governmentRoutes.js:62 |
| GET | /api/v1/government/students | government | Students list | governmentRoutes.js:63 |
| GET | /api/v1/government/teachers | government | Teachers list | governmentRoutes.js:64 |
| GET | /api/v1/government/parents | government | Parents list (paginated) | governmentRoutes.js:65 |
| GET | /api/v1/government/ratings | government | Schools ranked by rating | governmentRoutes.js:66 |
| GET | /api/v1/government/ratings/:schoolId | government | Individual school ratings | governmentRoutes.js:67 |
| POST | /api/v1/government/stats/generate | government | Generate and save stats | governmentRoutes.js:68 |
| GET | /api/v1/government/stats | government | Get saved stats | governmentRoutes.js:69 |
| GET | /api/v1/government/admins | government | List all admins | governmentRoutes.js:72 |
| GET | /api/v1/government/admins/:id | government | Admin details with hierarchy | governmentRoutes.js:73 |
| POST | /api/v1/government/admins | government | Create admin account | governmentRoutes.js:74 |
| PUT | /api/v1/government/admins/:id | government | Update admin | governmentRoutes.js:75 |
| DELETE | /api/v1/government/admins/:id | government | Delete admin | governmentRoutes.js:76 |
| GET | /api/v1/government/users | government | List government accounts | governmentRoutes.js:79 |
| POST | /api/v1/government/users | government | Create government account | governmentRoutes.js:80 |
| PUT | /api/v1/government/users/:id | government | Update government account | governmentRoutes.js:81 |
| DELETE | /api/v1/government/users/:id | government | Delete government account | governmentRoutes.js:82 |
| GET | /api/v1/government/messages | government | List all inbound messages | governmentRoutes.js:85 |
| GET | /api/v1/government/messages/:id | government | Get single message (marks read) | governmentRoutes.js:86 |
| POST | /api/v1/government/messages/:id/reply | government | Reply to message | governmentRoutes.js:87 |
| PUT | /api/v1/government/messages/:id/read | government | Toggle read status | governmentRoutes.js:88 |
| DELETE | /api/v1/government/messages/:id | government | Delete message | governmentRoutes.js:89 |
| GET | /api/v1/government/admin-registrations | government | List registration requests | governmentRoutes.js:92 |
| GET | /api/v1/government/admin-registrations/:id | government | Get single registration request | governmentRoutes.js:93 |
| POST | /api/v1/government/admin-registrations/:id/approve | government | Approve and create admin user | governmentRoutes.js:94 |
| POST | /api/v1/government/admin-registrations/:id/reject | government | Reject registration request | governmentRoutes.js:95 |

#### POST /api/v1/government/admins/:id/approve (registration)
- **Request:** `{ password?: string, schoolId?: string }`
- **Success:** 200 `{ success: true, data: { request, admin, setPasswordUrl, telegramUsername } }`
- **Errors:** 400 (already processed, password too short, email taken), 404
- **Side effects:** Creates User (admin, isActive=true), updates AdminRegistrationRequest.status='approved', generates 24h set-password JWT, returns setPasswordUrl for admin panel
- **Transactions:** yes — User.create + request.save atomic (adminRegistrationController.js:344)

#### DELETE /api/v1/government/admins/:id
- **Request:** (no body)
- **Errors:** 400 (cannot delete self, has dependent users via createdBy FK)
- **Side effects:** hard destroys admin User record
- **Transactions:** no

---

### Activities Routes (`/api/v1/activities`) — require `authenticate`

| Method | Path | Allowed Roles | Purpose | File:Line |
|--------|------|---------------|---------|-----------|
| GET | /api/v1/activities | all authenticated | Get activities (scoped by role) | activityRoutes.js:18 |
| GET | /api/v1/activities/:id | all authenticated | Get single activity | activityRoutes.js:19 |
| POST | /api/v1/activities | teacher, admin, reception | Create activity | activityRoutes.js:22 |
| PUT | /api/v1/activities/:id | teacher, admin, reception | Update activity | activityRoutes.js:23 |
| DELETE | /api/v1/activities/:id | teacher, admin, reception | Delete activity | activityRoutes.js:24 |

#### POST /api/v1/activities
- **Request:** `{ childId, skill, goal, startDate, endDate, tasks?, methods?, progress?, observation?, services?, teacher? }`
- **Success:** 201 ActivityObject with child info
- **Errors:** 400 (missing required fields), 404 (child not found or access denied)
- **Side effects:** Creates Notification for parent (async, fire-and-forget); emits Socket.io `activity:created` to parent
- **Transactions:** no

---

### Media Routes (`/api/v1/media`) — require `authenticate`

| Method | Path | Allowed Roles | Purpose | File:Line |
|--------|------|---------------|---------|-----------|
| GET | /api/v1/media/proxy/:fileId | authenticated | Proxy Appwrite file through backend | mediaRoutes.js:22 |
| GET | /api/v1/media | all authenticated | Get media (role-scoped) | mediaRoutes.js:27 |
| GET | /api/v1/media/:id | all authenticated | Get single media item | mediaRoutes.js:28 |
| POST | /api/v1/media/upload | teacher, admin, reception | Upload media file to Appwrite | mediaRoutes.js:32 |
| POST | /api/v1/media | teacher, admin, reception | Create media by URL (legacy) | mediaRoutes.js:63 |
| PUT | /api/v1/media/:id | teacher, admin, reception | Update media metadata | mediaRoutes.js:64 |
| DELETE | /api/v1/media/:id | teacher, admin, reception | Delete media + Appwrite file | mediaRoutes.js:65 |

#### POST /api/v1/media/upload
- **Request:** multipart/form-data `{ file: binary, childId, title, description?, date?, activityId? }`
- **Success:** 201 MediaObject
- **Errors:** 400 (no file, no childId, no title, unsupported MIME, magic-byte mismatch), 403 (wrong role), 404 (child/activity not found), 503 (Appwrite not configured in production), 502 (Appwrite upload failure)
- **Side effects:** Validates magic bytes with `file-type` library; uploads to Appwrite via node-appwrite SDK; creates Media row; deletes DB record and Appwrite file if DB insert fails; creates Notification for parent; cleans up temp file
- **Transactions:** no (cleanup on error via try/catch)

---

### Meals Routes (`/api/v1/meals`) — require `authenticate`

| Method | Path | Allowed Roles | Purpose | File:Line |
|--------|------|---------------|---------|-----------|
| GET | /api/v1/meals | all authenticated | Get meals (role-scoped) | mealRoutes.js:18 |
| GET | /api/v1/meals/:id | all authenticated | Get single meal | mealRoutes.js:19 |
| POST | /api/v1/meals | teacher, admin | Create meal | mealRoutes.js:22 |
| PUT | /api/v1/meals/:id | teacher, admin | Update meal | mealRoutes.js:23 |
| DELETE | /api/v1/meals/:id | teacher, admin | Delete meal | mealRoutes.js:24 |

---

### Notifications Routes (`/api/v1/notifications`) — require `authenticate`

| Method | Path | Purpose | File:Line |
|--------|------|---------|-----------|
| GET | /api/v1/notifications | Get all notifications for current user | notificationRoutes.js:24 |
| GET | /api/v1/notifications/count | Get unread count | notificationRoutes.js:27 |
| PUT | /api/v1/notifications/:id/read | Mark single notification as read | notificationRoutes.js:30 |
| PUT | /api/v1/notifications/read-all | Mark all as read | notificationRoutes.js:33 |
| DELETE | /api/v1/notifications/:id | Delete notification | notificationRoutes.js:36 |

---

### Chat Routes (`/api/v1/chat`) — require `authenticate`

| Method | Path | Purpose | File:Line |
|--------|------|---------|-----------|
| GET | /api/v1/chat/messages | List messages for a conversation | chatRoutes.js:24 |
| POST | /api/v1/chat/messages | Send a message | chatRoutes.js:25 |
| POST | /api/v1/chat/read | Mark conversation as read | chatRoutes.js:26 |
| PUT | /api/v1/chat/messages/:id | Edit a message | chatRoutes.js:27 |
| DELETE | /api/v1/chat/messages/:id | Delete a message | chatRoutes.js:28 |
| GET | /api/v1/chat/unread-count | Get unread message count | chatRoutes.js:29 |
| GET | /api/v1/chat/conversations | List accessible conversations | chatRoutes.js:30 |

#### POST /api/v1/chat/messages
- **Request:** `{ conversationId: "parent:{parentId}", content: string }`
- **Success:** 201 ChatMessageObject
- **Errors:** 400 (missing conversationId or content), 403 (not authorized for conversation)
- **Side effects:** Emits Socket.io `chat:message` to counterpart — teacher→parent, parent→teacher group lookup via Child/Group
- **Transactions:** no

---

### Groups Routes (`/api/v1/groups`) — require `authenticate`

| Method | Path | Allowed Roles | Purpose | File:Line |
|--------|------|---------------|---------|-----------|
| GET | /api/v1/groups | all authenticated | List groups (role-scoped) | groupRoutes.js:24 |
| GET | /api/v1/groups/:id | all authenticated | Get group detail | groupRoutes.js:30 |
| POST | /api/v1/groups | reception | Create group | groupRoutes.js:39 |
| PUT | /api/v1/groups/:id | reception | Update group | groupRoutes.js:45 |
| DELETE | /api/v1/groups/:id | reception | Delete group | groupRoutes.js:53 |

---

### Therapy Routes (`/api/v1/therapy`) — require `authenticate`

| Method | Path | Allowed Roles | Purpose | File:Line |
|--------|------|---------------|---------|-----------|
| GET | /api/v1/therapy | all authenticated | Get therapies | therapyRoutes.js:26 |
| GET | /api/v1/therapy/usage | all authenticated | Get therapy usage | therapyRoutes.js:29 |
| PUT | /api/v1/therapy/usage/:id/end | parent, teacher | End therapy usage | therapyRoutes.js:30 |
| POST | /api/v1/therapy/:id/start | parent, teacher | Start therapy usage | therapyRoutes.js:31 |
| GET | /api/v1/therapy/:id | all authenticated | Get therapy detail | therapyRoutes.js:33 |
| POST | /api/v1/therapy | admin, teacher | Create therapy | therapyRoutes.js:35 |
| PUT | /api/v1/therapy/:id | admin, teacher | Update therapy | therapyRoutes.js:36 |
| DELETE | /api/v1/therapy/:id | admin, teacher | Delete therapy | therapyRoutes.js:37 |

---

### AI Warnings Routes (`/api/v1/ai-warnings`) — require `authenticate`

| Method | Path | Allowed Roles | Purpose | File:Line |
|--------|------|---------------|---------|-----------|
| POST | /api/v1/ai-warnings/analyze | admin, government | Analyze ratings, create warnings | aiWarningRoutes.js:21 |
| GET | /api/v1/ai-warnings | all authenticated | Get warnings (role-scoped) | aiWarningRoutes.js:24 |
| PUT | /api/v1/ai-warnings/:id/resolve | admin, government | Mark warning resolved | aiWarningRoutes.js:27 |
| POST | /api/v1/ai-warnings/:id/notify | admin, government | Send notifications to users | aiWarningRoutes.js:30 |

---

### Business Routes (`/api/v1/business`) — require `authenticate` + `requireRole('business', 'government')`

| Method | Path | Purpose | File:Line |
|--------|------|---------|-----------|
| GET | /api/v1/business/overview | Platform-wide overview | businessRoutes.js:18 |
| GET | /api/v1/business/users | User statistics | businessRoutes.js:19 |
| GET | /api/v1/business/usage | Usage statistics | businessRoutes.js:20 |
| POST | /api/v1/business/stats/generate | Generate and save stats | businessRoutes.js:21 |
| GET | /api/v1/business/stats | Get saved stats | businessRoutes.js:22 |

---

### Child Routes (`/api/v1/child`) — require `authenticate`

| Method | Path | Allowed Roles | Purpose | File:Line |
|--------|------|---------------|---------|-----------|
| GET | /api/v1/child | all authenticated | Get children (scoped by role) | childRoutes.js:13 |
| GET | /api/v1/child/:id | all authenticated | Get child detail | childRoutes.js:14 |
| DELETE | /api/v1/child/:id | admin, reception, government | Delete child | childRoutes.js:17 |
| PUT | /api/v1/child/:id/avatar | authenticated (role check in controller) | Update child avatar | childRoutes.js:25 |
| PUT | /api/v1/child/:id | checkChildAccess middleware | Update child with photo | childRoutes.js:28 |

---

### User Routes (`/api/v1/user`) — require `authenticate`

| Method | Path | Purpose | File:Line |
|--------|------|---------|-----------|
| PUT | /api/v1/user/profile | Update profile fields | userRoutes.js:14 |
| PUT | /api/v1/user/avatar | Upload/update avatar photo | userRoutes.js:15 |
| PUT | /api/v1/user/password | Change password (rate-limited 3/hour) | userRoutes.js:16 |
| POST | /api/v1/user/message-to-government | Send message (all authenticated) | userRoutes.js:19 |

---

### Child Assessment Routes (`/api/v1/assessments`) — require `authenticate`

| Method | Path | Allowed Roles | Purpose | File:Line |
|--------|------|---------------|---------|-----------|
| GET | /api/v1/assessments | all authenticated | Get assessments | childAssessmentRoutes.js:13 |
| GET | /api/v1/assessments/latest | all authenticated | Get latest assessments | childAssessmentRoutes.js:14 |
| POST | /api/v1/assessments | teacher, admin | Create assessment | childAssessmentRoutes.js:15 |
| PUT | /api/v1/assessments/:id | teacher, admin | Update assessment | childAssessmentRoutes.js:16 |

---

### Service Plan Routes (`/api/v1/service-plans`) — require `authenticate`

| Method | Path | Allowed Roles | Purpose | File:Line |
|--------|------|---------------|---------|-----------|
| GET | /api/v1/service-plans | all authenticated | Get service plans | servicePlanRoutes.js:10 |
| POST | /api/v1/service-plans | teacher, admin | Upsert service plan | servicePlanRoutes.js:11 |
| POST | /api/v1/service-plans/bulk | teacher, admin | Bulk upsert service plans | servicePlanRoutes.js:12 |

---

### Meal Plan Routes (`/api/v1/meal-plans`) — require `authenticate`

| Method | Path | Allowed Roles | Purpose | File:Line |
|--------|------|---------------|---------|-----------|
| GET | /api/v1/meal-plans | all authenticated | Get meal plans | mealPlanRoutes.js:22 |
| POST | /api/v1/meal-plans | teacher, admin | Create meal plan | mealPlanRoutes.js:23 |
| POST | /api/v1/meal-plans/bulk | teacher, admin | Bulk create meal plans | mealPlanRoutes.js:24 |
| PUT | /api/v1/meal-plans/:id | teacher, admin | Update meal plan | mealPlanRoutes.js:25 |
| DELETE | /api/v1/meal-plans/:id | teacher, admin | Delete meal plan | mealPlanRoutes.js:26 |

---

### Teacher Resource Routes (`/api/v1/resources`) — require `authenticate`

| Method | Path | Allowed Roles | Purpose | File:Line |
|--------|------|---------------|---------|-----------|
| GET | /api/v1/resources | all authenticated | Get teacher resources | teacherResourceRoutes.js:32 |
| POST | /api/v1/resources | teacher, admin | Upload resource file (video/audio/image, max 100MB) | teacherResourceRoutes.js:33 |
| DELETE | /api/v1/resources/:id | teacher, admin | Delete resource | teacherResourceRoutes.js:34 |

---

### News Routes (`/api/v1/news`) — require `authenticate`

| Method | Path | Allowed Roles | Purpose | File:Line |
|--------|------|---------------|---------|-----------|
| GET | /api/v1/news | all authenticated | Get news (admin sees draft+published, others published only) | newsRoutes.js:23 |
| GET | /api/v1/news/:id | all authenticated | Get single news item | newsRoutes.js:32 |
| POST | /api/v1/news | admin | Create news | newsRoutes.js:37 |
| PUT | /api/v1/news/:id | admin | Update news | newsRoutes.js:44 |
| DELETE | /api/v1/news/:id | admin | Delete news | newsRoutes.js:52 |

---

### Progress Routes (`/api/v1/progress`) — require `authenticate` + `requireParent`

| Method | Path | Purpose | File:Line |
|--------|------|---------|-----------|
| GET | /api/v1/progress | Get child progress for parent | progressRoutes.js:12 |
| PUT | /api/v1/progress | Update progress record | progressRoutes.js:13 |

---

### Migration Routes (`/api/v1/migrations`) — no JWT required

| Method | Path | Purpose | File:Line |
|--------|------|---------|-----------|
| POST | /api/v1/migrations/run | Run pending Sequelize migrations (secret key required) | migrationRoutes.js:15 |

---

### Health Routes

| Method | Path | Purpose | File:Line |
|--------|------|---------|-----------|
| GET | /health | Uptime/version check (no auth) | server.js:57 |

---

## Section 3 — Frontend Page Inventory

### Admin Frontend (port 5175)

#### Page Catalog
| Route | Component | File |
|-------|-----------|------|
| /login | Login | admin/src/pages/Login.jsx |
| /admin-register | AdminRegister | admin/src/pages/AdminRegister.jsx |
| /admin | Dashboard | admin/src/pages/Dashboard.jsx |
| /admin/receptions | ReceptionManagement | admin/src/pages/ReceptionManagement.jsx |
| /admin/parents | ParentManagement | admin/src/pages/ParentManagement.jsx |
| /admin/teachers | TeacherManagement | admin/src/pages/TeacherManagement.jsx |
| /admin/groups | GroupManagement | admin/src/pages/GroupManagement.jsx |
| /admin/school-ratings | SchoolRatings | admin/src/pages/SchoolRatings.jsx |
| /admin/users | UsersStats | admin/src/pages/UsersStats.jsx |
| /admin/profile | Profile | admin/src/pages/Profile.jsx |
| /admin/settings | Settings | admin/src/pages/Settings.jsx |
| * | NotFound | admin/src/pages/NotFound.jsx |

#### /admin (Dashboard)
- **Component:** admin/src/pages/Dashboard.jsx
- **Loading states:** SkeletonDashboard component shown during fetch (Skeleton.jsx shared component)
- **Empty states:** Zero counts shown as 0 in stat cards; receptions list empty when admin has none
- **Populated states:** Stat cards showing counts for receptions, teachers, parents, children, groups; pending documents count; recent activity counts; recent receptions list
- **Error states:** Graceful — API errors caught with `.catch(() => null)`, defaults applied
- **Interactions:**
  - Click stat card for receptions → navigates to /admin/receptions
  - Click stat card for parents → navigates to /admin/parents
  - Click stat card for teachers → navigates to /admin/teachers
  - Click stat card for groups → navigates to /admin/groups
- **API calls:** GET /admin/statistics, GET /admin/receptions (parallel)
- **Navigation:** Stat card clicks navigate to their respective management pages

#### /admin/receptions (ReceptionManagement)
- **Component:** admin/src/pages/ReceptionManagement.jsx
- **Interactions:** Create reception form (email, password, firstName, lastName, phone); Edit reception; Delete reception; Activate/Deactivate reception; View documents; Approve/Reject documents
- **API calls:** GET /admin/receptions, POST /admin/receptions, PUT /admin/receptions/:id, DELETE /admin/receptions/:id, PUT /admin/receptions/:id/activate, PUT /admin/receptions/:id/deactivate, GET /admin/documents/pending, PUT /admin/documents/:id/approve, PUT /admin/documents/:id/reject
- **Conditional UI:** Pending documents badge; approval status badge per reception; rejection reason input shown when rejecting

#### /admin/teachers (TeacherManagement)
- **Component:** admin/src/pages/TeacherManagement.jsx
- **Interactions:** Search/filter teachers; view teacher detail
- **API calls:** GET /admin/teachers
- **Conditional UI:** Read-only — no create/edit/delete buttons for admin; teacher list may be empty if admin has no receptions

#### /admin/parents (ParentManagement)
- **Component:** admin/src/pages/ParentManagement.jsx
- **Interactions:** List parents; click to view parent detail with activities, meals, media
- **API calls:** GET /admin/parents, GET /admin/parents/:id (on detail view)
- **Conditional UI:** Read-only view; shows children, recent activities, meals, media

#### /admin/school-ratings (SchoolRatings)
- **Component:** admin/src/pages/SchoolRatings.jsx
- **API calls:** GET /admin/school-ratings
- **Populated states:** Schools grouped with average rating, count, individual rating entries with parent names

#### /admin/settings (Settings)
- **Component:** admin/src/pages/Settings.jsx (sub-components: ProfileForm, NotificationPreferences, PasswordForm, MessagesModal)
- **Interactions:** Edit profile fields; change password; view/compose messages to government; notification toggle preferences
- **API calls:** PUT /user/profile, PUT /user/password, GET /admin/messages, POST /admin/message-to-government

---

### Teacher Frontend (port 5174)

#### Page Catalog — Teacher role
| Route | Component | File |
|-------|-----------|------|
| /login | Login | teacher/src/pages/Login.jsx |
| /teacher | Dashboard | teacher/src/pages/Dashboard.jsx |
| /teacher/parents | ParentManagement | teacher/src/pages/ParentManagement.jsx |
| /teacher/activities | Activities | teacher/src/pages/Activities.jsx |
| /teacher/meals | Meals | teacher/src/pages/Meals.jsx |
| /teacher/media | Media | teacher/src/pages/Media.jsx |
| /teacher/chat | Chat | teacher/src/pages/Chat.jsx |
| /teacher/monitoring | MonitoringJournal | teacher/src/pages/MonitoringJournal.jsx |
| /teacher/therapy | TherapyManagement | teacher/src/pages/TherapyManagement.jsx |
| /teacher/ai-warnings | AIWarnings | teacher/src/parent/pages/AIWarnings.jsx |
| /teacher/settings | Settings | teacher/src/pages/Settings.jsx |
| /teacher/profile | Profile | teacher/src/pages/Profile.jsx |

#### Page Catalog — Parent role (same app, different route prefix)
| Route | Component | File |
|-------|-----------|------|
| / | ParentDashboard | teacher/src/parent/pages/Dashboard.jsx |
| /child | ChildProfile | teacher/src/parent/pages/ChildProfile.jsx |
| /activities | ParentActivities | teacher/src/parent/pages/Activities.jsx |
| /meals | ParentMeals | teacher/src/parent/pages/Meals.jsx |
| /media | ParentMedia | teacher/src/parent/pages/Media.jsx |
| /ai-chat | AIChat | teacher/src/parent/pages/AIChat.jsx |
| /chat | ParentChat | teacher/src/parent/pages/Chat.jsx |
| /notifications | Notifications | teacher/src/parent/pages/Notifications.jsx |
| /help | Help | teacher/src/parent/pages/Help.jsx |
| /rating | TeacherRating | teacher/src/parent/pages/TeacherRating.jsx |
| /settings | ParentSettings | teacher/src/parent/pages/Settings.jsx |
| /therapy | Therapy | teacher/src/parent/pages/Therapy.jsx |

**Note:** The teacher frontend serves BOTH teacher accounts (at /teacher/*) and parent accounts (at /*). The router file (teacher/src/App.jsx) uses `requireRole="parent"` for the parent routes and `requireRole="teacher"` for the teacher routes (App.jsx:63, App.jsx:85).

#### /teacher (Dashboard)
- **Loading states:** Spinner shown during initial fetch
- **API calls:** GET /teacher/dashboard
- **Interactions:** Navigation links to parents, activities, meals, media

#### /teacher/activities (Activities)
- **Component:** teacher/src/pages/Activities.jsx
- **Sub-components:** ActivityCard.jsx, ActivityFormModal.jsx, ActivityDetailsModal.jsx
- **Interactions:** Create activity (form modal with childId, skill, goal, startDate, endDate, tasks, services); Edit activity (update modal); View activity detail; Delete activity
- **API calls:** GET /activities (with childId filter), POST /activities, PUT /activities/:id, DELETE /activities/:id

#### /teacher/media (Media)
- **Component:** teacher/src/pages/Media.jsx
- **Sub-components:** MediaCard.jsx, MediaFormModal.jsx, MediaViewModal.jsx, VideoPlayer.jsx
- **Interactions:** Upload media file; Create media by URL; View media; Update media metadata; Delete media; Proxy-view Appwrite file
- **API calls:** GET /media, POST /media/upload (multipart), POST /media (URL), PUT /media/:id, DELETE /media/:id, GET /media/proxy/:fileId

#### /teacher/monitoring (MonitoringJournal)
- **Component:** teacher/src/pages/MonitoringJournal.jsx
- **Interactions:** Create monitoring record (childId, date, emotionalState, notes, teacherSignature); Update record; Delete record; Filter by child
- **API calls:** GET /teacher/emotional-monitoring, POST /teacher/emotional-monitoring, PUT /teacher/emotional-monitoring/:id, DELETE /teacher/emotional-monitoring/:id

#### /teacher/therapy (TherapyManagement)
- **Component:** teacher/src/pages/TherapyManagement.jsx
- **Sub-components:** TherapyCard.jsx, TherapyFormModal.jsx, TherapyAssignModal.jsx, TherapyFilters.jsx
- **Interactions:** Create therapy; Update therapy; Delete therapy; Start therapy session; End therapy session; Filter by type/status
- **API calls:** GET /therapy, POST /therapy, PUT /therapy/:id, DELETE /therapy/:id, POST /therapy/:id/start, PUT /therapy/usage/:id/end

#### / (Parent Dashboard)
- **Component:** teacher/src/parent/pages/Dashboard.jsx
- **API calls:** GET /parent/children, GET /parent/activities (first child), GET /parent/meals (first child), GET /parent/media (first child)
- **Conditional UI:** Summary cards for each child; link to child profile; activity/meal/media counts

#### /rating (Parent TeacherRating)
- **Component:** teacher/src/parent/pages/TeacherRating.jsx
- **Interactions:** Submit 1-5 star rating for assigned teacher; write comment; view all ratings for teacher
- **API calls:** GET /parent/ratings, POST /parent/ratings

---

### Reception Frontend (port 5177)

#### Page Catalog
| Route | Component | File |
|-------|-----------|------|
| /login | Login | reception/src/pages/Login.jsx |
| /reception | Dashboard | reception/src/pages/Dashboard.jsx |
| /reception/parents | ParentManagement | reception/src/pages/ParentManagement.jsx |
| /reception/teachers | TeacherManagement | reception/src/pages/TeacherManagement.jsx |
| /reception/groups | GroupManagement | reception/src/pages/GroupManagement.jsx |
| /reception/settings | Settings | reception/src/pages/Settings.jsx |
| /reception/profile | Profile | reception/src/pages/Profile.jsx |
| * | NotFound | reception/src/pages/NotFound.jsx |

#### /reception (Dashboard)
- **Loading states:** SkeletonDashboard shown during fetch
- **Populated states:** Stat cards for parents count, teachers count, groups count; recent teachers list; recent parents list
- **Error states:** Falls back to 0 counts if any API fails; prompts to complete verification if not approved
- **API calls:** GET /reception/parents, GET /reception/teachers, GET /groups (parallel)
- **Conditional UI:** Verification status warning shown if documentsApproved is false

#### /reception/parents (ParentManagement)
- **Component:** reception/src/pages/ParentManagement.jsx
- **Sub-components:** parents/ParentCard.jsx, parents/ParentFormModal.jsx, parents/ChildFormModal.jsx
- **Interactions:** Create parent (with optional first child); Edit parent (reassign teacher/group); Delete parent (cascades children); Add additional child to parent; Edit child; Delete child
- **API calls:** GET /reception/parents, GET /reception/teachers, GET /reception/groups, POST /reception/parents (multipart), PUT /reception/parents/:id, DELETE /reception/parents/:id, POST /reception/children, PUT /reception/children/:id, DELETE /reception/children/:id

#### /reception/teachers (TeacherManagement)
- **Component:** reception/src/pages/TeacherManagement.jsx
- **Interactions:** Create teacher (email, password, firstName, lastName, phone); Edit teacher; Delete teacher; View teacher ratings
- **API calls:** GET /reception/teachers, POST /reception/teachers, PUT /reception/teachers/:id, DELETE /reception/teachers/:id, GET /reception/teachers/:id/ratings

#### /reception/groups (GroupManagement)
- **Component:** reception/src/pages/GroupManagement.jsx
- **Interactions:** Create group (name, description, assign teacher); Edit group; Delete group
- **API calls:** GET /groups, GET /reception/teachers, POST /groups, PUT /groups/:id, DELETE /groups/:id

---

### Government Frontend (port 5173)

#### Page Catalog
| Route | Component | File |
|-------|-----------|------|
| /login | Login | government/src/pages/Login.jsx |
| /government | Dashboard | government/src/pages/Dashboard.jsx |
| /government/schools | Schools | government/src/pages/Schools.jsx |
| /government/students | Students | government/src/pages/Students.jsx |
| /government/teachers | Teachers | government/src/pages/Teachers.jsx |
| /government/parents | Parents | government/src/pages/Parents.jsx |
| /government/ratings | Ratings | government/src/pages/Ratings.jsx |
| /government/platform | Platform | government/src/pages/Platform.jsx |
| /government/profile | Profile | government/src/pages/Profile.jsx |
| /government/admin/:id | AdminDetails | government/src/pages/AdminDetails.jsx |
| * | NotFound | government/src/pages/NotFound.jsx |

#### /government (Dashboard)
- **Loading states:** SkeletonDashboard with 4 stat cards
- **Populated states:** Schools count, Students count, Teachers count, Parents count, Average rating, Active warnings
- **Stale indicator:** OfflineBanner StaleIndicator shown if any API call failed
- **API calls:** GET /government/overview, GET /government/schools?limit=10, GET /government/admins (parallel)
- **Interactions:** Click stat cards → navigate to respective list pages; click admin card → navigate to /government/admin/:id

#### /government/platform (Platform)
- **Component:** government/src/pages/Platform.jsx
- **Tabs:** admins, schools, messages, government, registrations
- **Admins tab:** Create admin; list admins; edit admin (name, email, phone, password); delete admin; click to navigate to admin details
- **Schools tab:** List schools with ratings
- **Messages tab:** List messages from all senders; view message detail (auto-marks read); reply to message; delete message
- **Government tab:** Create government account; list government accounts; edit/delete government accounts
- **Registrations tab:** List admin registration requests; view request detail (with uploaded documents); approve (generates set-password URL); reject with reason
- **API calls:** GET/POST/PUT/DELETE /government/admins, GET /government/schools-list, GET/POST/PUT/DELETE /government/messages, GET/POST/PUT/DELETE /government/users, GET/PUT /government/admin-registrations

#### /government/admin/:id (AdminDetails)
- **Component:** government/src/pages/AdminDetails.jsx
- **API calls:** GET /government/admins/:id
- **Populated states:** Admin info, receptions count, schools count, teachers count, parents count, students count, average ratings; lists of receptions, schools, teachers, parents, children

#### /government/ratings (Ratings)
- **Component:** government/src/pages/Ratings.jsx
- **API calls:** GET /government/ratings (schools ranked by average rating), GET /government/ratings/:schoolId (drill down)
- **Interactions:** Filter by date range; click school to see individual ratings; government-level badge per school

---

## Section 4 — Cross-Role Flows

### Flow 1: Admin Registration → Government Approval → Admin Login
- **Initiator:** prospective admin (public user)
- **Step 1:** Public user submits `POST /api/v1/auth/admin-register` with name, email, phone, telegramUsername, and uploaded documents (certificate/passport) — adminRegistrationController.js:46
- **Step 2:** System uploads documents to Appwrite storage; creates AdminRegistrationRequest row with status='pending'
- **Step 3:** Government user sees new request in `/government/platform` Registrations tab — calls GET /government/admin-registrations
- **Step 4:** Government approves via `POST /api/v1/government/admin-registrations/:id/approve` — adminRegistrationController.js:303; system creates User (admin, isActive=true) + updates request.status='approved' in transaction; generates 24h set-password JWT token
- **Step 5:** Response includes `setPasswordUrl` (e.g. `http://localhost:5175/set-password?token=...`); government shares link with admin via Telegram (telegramUsername in response)
- **Step 6:** Admin visits set-password URL in admin frontend, submits `POST /api/v1/auth/set-password` with token and new password — authController.js:297
- **Step 7:** Admin can now log in at admin frontend Login page
- **Files involved:** adminRegistrationController.js, authController.js, config/storage.js, admin/src/pages/Login.jsx, government/src/pages/Platform.jsx

### Flow 2: Reception Onboarding → Document Approval → Reception Login Access
- **Initiator:** admin
- **Step 1:** Admin creates Reception account via `POST /api/v1/admin/receptions` — admin/src/pages/ReceptionManagement.jsx; User created with isActive=false, documentsApproved=false
- **Step 2:** Admin provides credentials to Reception out-of-band (email+password in create form)
- **Step 3:** Reception logs in but cannot proceed — authController.js:113 blocks with 403 `requiresApproval: true`
- **Step 4:** Reception uploads documents via `POST /api/v1/reception/documents` — receptionController.js
- **Step 5:** Admin sees documents in `/admin/receptions` pending documents list — GET /admin/documents/pending
- **Step 6:** Admin approves each document via `PUT /api/v1/admin/documents/:id/approve` — adminReceptionController.js:135; when ALL documents approved, system sets documentsApproved=true + isActive=true and calls invalidateUserCache
- **Step 7:** Reception can now log in successfully; every subsequent request passes auth.js:100 check
- **Files involved:** admin/src/pages/ReceptionManagement.jsx, backend/controllers/admin/adminReceptionController.js, backend/middleware/auth.js:100

### Flow 3: Reception Creates Teacher → Teacher Login
- **Initiator:** reception
- **Step 1:** Reception submits `POST /api/v1/reception/teachers` — receptionTeacherController.js:6; creates User with role='teacher', isActive=true, createdBy=receptionId, schoolId inherited from reception
- **Step 2:** Admin can view the new teacher via GET /admin/teachers (shows teachers created by admin's receptions)
- **Step 3:** Teacher logs in at teacher frontend with provided credentials; 15m access token + 7d refresh issued
- **Files involved:** receptionTeacherController.js, admin/src/pages/TeacherManagement.jsx, teacher/src/pages/Login.jsx

### Flow 4: Reception Creates Parent + Child → Parent Views Data
- **Initiator:** reception
- **Step 1:** Reception submits `POST /api/v1/reception/parents` (multipart) with parent data + optional child — receptionParentController.js:16; parent+child created atomically in transaction; child photo uploaded to Appwrite if provided
- **Step 2:** Parent logs in at parent side of teacher frontend (/login) — authenticated, role='parent' route tree used (App.jsx:63)
- **Step 3:** Parent sees their child on dashboard (GET /parent/children)
- **Step 4:** Parent can view activities, meals, media created by assigned teacher for their child
- **Files involved:** receptionParentController.js, teacher/src/App.jsx, teacher/src/parent/pages/Dashboard.jsx

### Flow 5: Teacher Creates Activity/Media → Parent Notification → Parent Sees Content
- **Initiator:** teacher
- **Step 1:** Teacher creates activity via `POST /api/v1/activities` — activityController.js:211; validates child access; creates Activity record
- **Step 2:** System calls `createNotification(parentId, childId, 'activity', ...)` async — notificationController.js:171; creates Notification row with userId=parentId
- **Step 3:** System emits Socket.io `activity:created` event to parent's socket room via `emitToUser` — activityController.js:309, socket.js:99
- **Step 4:** Parent's frontend receives real-time socket event (SocketProvider context in teacher/src/shared/context/SocketContext.jsx)
- **Step 5:** Parent can view new activity in `/activities` page (GET /parent/activities) and notification in `/notifications` page
- **For media:** Same flow — uploadMedia creates notification and emits `media:created` event (mediaController.js:486, 595)
- **Files involved:** activityController.js, mediaController.js, notificationController.js, config/socket.js, teacher/src/parent/pages/Notifications.jsx

### Flow 6: Parent Rates Teacher → Teacher and Reception Can See Rating
- **Initiator:** parent
- **Step 1:** Parent submits `POST /api/v1/parent/ratings` with stars (1-5) and optional comment — parentTeacherRatingController.js:6; requires parent.teacherId to be set (assigned teacher)
- **Step 2:** System upserts TeacherRating row; recalculates average and updates User.rating + User.totalRatings for the teacher
- **Step 3:** Reception can view teacher ratings via GET /reception/teachers/:id/ratings — receptionTeacherController.js:30; returns summary (average, count) and list of recent ratings
- **Step 4:** Teacher can view own ratings via GET /teacher/ratings — teacherController.js
- **Files involved:** parentTeacherRatingController.js, receptionTeacherController.js, reception/src/pages/TeacherManagement.jsx

### Flow 7: Parent Rates School → Admin and Government See Aggregate
- **Initiator:** parent
- **Step 1:** Parent submits `POST /api/v1/parent/school-rating` — parentSchoolRatingController.js:9; validates schoolId (or creates new school by name); upserts SchoolRating row
- **Step 2:** Admin can view school ratings via GET /admin/school-ratings — adminStatsController.js:310; raw SQL query joins school_ratings with schools and users; groups by school with average calculation
- **Step 3:** Government can view ratings via GET /government/ratings — governmentController.js:367; all schools ranked by weighted average rating with distribution data and government-level badge
- **Step 4:** Government can drill into individual school ratings via GET /government/ratings/:schoolId — governmentController.js:613
- **Step 5:** AI Warning system can be triggered: admin calls `POST /api/v1/ai-warnings/analyze` with schoolId — aiWarningController.js:22; if average < 2.5 or declining trend, creates AIWarning record and sends Notifications to parents of children at that school
- **Files involved:** parentSchoolRatingController.js, adminStatsController.js, governmentController.js, aiWarningController.js, admin/src/pages/SchoolRatings.jsx, government/src/pages/Ratings.jsx

### Flow 8: Teacher Chat with Parent (Real-Time)
- **Initiator:** teacher or parent
- **Step 1:** Teacher sends message via `POST /api/v1/chat/messages` with `{ conversationId: "parent:{parentId}", content }` — chatController.js:65; access validated via canAccessConversation (teacher must have child with groupId linked to teacher's group)
- **Step 2:** Message saved to ChatMessage table with senderRole='teacher', readByTeacher=true, readByParent=false
- **Step 3:** System emits `chat:message` Socket.io event to parent's room — chatController.js:91
- **Step 4:** Parent receives real-time event; can GET /chat/messages?conversationId=parent:{parentId} to load history
- **Step 5:** Parent sends reply — POST /api/v1/chat/messages; system emits to teacher's room via group/child lookup
- **Step 6:** Teacher sees unread count via GET /chat/unread-count; views conversation list via GET /chat/conversations
- **Files involved:** chatController.js, config/socket.js, teacher/src/pages/Chat.jsx, teacher/src/parent/pages/Chat.jsx

### Flow 9: JWT Logout + Token Revocation
- **Initiator:** any authenticated user
- **Step 1:** User calls `POST /api/v1/auth/logout` — authController.js:252
- **Step 2:** System marks all refresh tokens for user as revoked in RefreshToken table
- **Step 3:** System calls `revokeJti(req.jti, req.tokenExpiry)` — auth.js:261; stores `revoked:jti:{jti}` in Redis with TTL = remaining token lifetime (or in-memory map if no Redis)
- **Step 4:** Access and refresh cookies cleared in response
- **Step 5:** Any subsequent request with old access token hits `_isJtiRevoked` check — auth.js:79; returns 401 'Token has been revoked'
- **Fail-closed behavior:** Redis error → returns true (token treated as revoked) — auth.js:35
- **Files involved:** authController.js, middleware/auth.js, utils/redisClient.js

### Flow 10: Login Lockout Flow
- **Initiator:** failed login attempts
- **Step 1:** Multiple failed logins for same email trigger `recordFailedAttempt(email)` — loginRateLimitStore.js:10; increments `lockout:attempts:{email}` in Redis with LOCKOUT_SECS TTL (default 15 min)
- **Step 2:** When attempts >= MAX_ATTEMPTS (default 5), sets `lockout:locked:{email}` key in Redis
- **Step 3:** Next login attempt calls `isLockedOut(email)` — loginRateLimitStore.js:52; exists check on Redis; returns 429 with lockout message
- **Step 4:** Successful login calls `clearAttempts(email)` — deletes both Redis keys
- **Fallback:** When REDIS_URL not set, in-memory Map used (single instance only)
- **Files involved:** authController.js, utils/loginRateLimitStore.js

### Flow 11: Government Views Admin Hierarchy
- **Initiator:** government
- **Step 1:** Government opens `/government/platform` → Admins tab; loads GET /government/admins — governmentController.js:704
- **Step 2:** Government clicks admin row → navigates to `/government/admin/:id`; loads GET /government/admins/:id — governmentController.js:739
- **Step 3:** Response includes admin details + receptions (createdBy admin), schools, teachers (createdBy admin's receptions), parents, children (of those parents), average school ratings
- **Step 4:** Government can create admin directly from platform page — POST /government/admins — adminUserController.js:106; or approve registration request
- **Files involved:** governmentController.js, admin/src/pages/AdminDetails.jsx (government frontend), government/src/pages/Platform.jsx

### Flow 12: AI Warning Analysis → Parent Notification
- **Initiator:** admin or government
- **Step 1:** Admin calls `POST /api/v1/ai-warnings/analyze` with schoolId — aiWarningController.js:22
- **Step 2:** System fetches SchoolRating records for school; calculates average; detects patterns: low rating (<2.5), declining trend, negative feedback volume
- **Step 3:** For each warning, validates target exists; checks no duplicate unresolved warning of same type exists; creates AIWarning record if new
- **Step 4:** `sendWarningNotifications` automatically runs — aiWarningController.js:301; finds children at that school → their parents; bulk creates Notification records for all affected parents
- **Step 5:** Parents see warnings in their notification feed (GET /notifications)
- **Files involved:** aiWarningController.js, notificationController.js, admin/src/pages/Dashboard.jsx (warnings count), teacher/src/parent/pages/AIWarnings.jsx

---

## Section 5 — External Integrations

### Appwrite (File Storage)
- **Operations:**
  - `uploadFile(buffer, filename, mimeType)` — creates file in bucket via `AppwriteStorage.createFile()` with `ID.unique()` — config/storage.js:62
  - `deleteFile(filepath)` — deletes from bucket; extracts Appwrite file ID from URL via regex — config/storage.js:217
  - `getSignedUrl(filename)` — returns view URL (not actually signed — returns direct URL) — config/storage.js:275
  - Proxy endpoint: `GET /api/v1/media/proxy/:fileId` — fetches from Appwrite via axios and streams back — mediaController.js:688
- **Buckets:** Single bucket configured via `APPWRITE_BUCKET_ID` env var; used for media, child photos, admin registration documents
- **Auth pattern:** Server-side API key (`APPWRITE_API_KEY`) via `client.setKey()`; bucket default permissions used (avoids needing permission-management scope)
- **URL format:** `{APPWRITE_ENDPOINT}/storage/buckets/{bucketId}/files/{fileId}/view?project={projectId}`
- **Failure modes:**
  - Not configured (missing any of 4 env vars) → falls back to local disk if `LOCAL_STORAGE_FALLBACK=true` (non-production only)
  - In production without Appwrite → 503 error on upload
  - Upload failure → detailed error thrown; DB record not created; temp file cleaned up
  - Proxy: view endpoint 404/403 → retries with preview endpoint; stream error → logs, returns transparent 1x1 PNG
  - Appwrite deletion failure → logged but does not block response (catch swallowed)

### Redis
- **Key patterns:**
  - `revoked:jti:{uuid}` — revoked access token JTI (auth.js:17)
  - `lockout:attempts:{email}` — failed login attempt counter (loginRateLimitStore.js:15)
  - `lockout:locked:{email}` — lockout flag (loginRateLimitStore.js:21)
- **TTLs:**
  - `revoked:jti:{uuid}` — TTL = remaining token lifetime in seconds (computed as `(expiresAtMs - Date.now()) / 1000`, min 1 second)
  - `lockout:attempts:{email}` — TTL = LOCKOUT_SECS (default 900 seconds / 15 min) from env `LOGIN_LOCKOUT_SECS`
  - `lockout:locked:{email}` — TTL = LOCKOUT_SECS
- **Client:** `getRedisClient()` from utils/redisClient.js; returns null if `REDIS_URL` not set
- **Fail-closed behavior:**
  - JTI revocation check error → treated as REVOKED (fail-closed, security-first) — auth.js:35
  - Lockout check error → treated as LOCKED OUT (fail-closed) — loginRateLimitStore.js:59
  - Fallback to in-memory Map/Set when Redis unavailable — single-instance only
- **Multi-instance note:** In-memory fallback is per-process; multi-instance deploy requires REDIS_URL

### Socket.io
- **Initialization:** `initializeSocket(httpServer)` in config/socket.js:27; attached to HTTP server
- **Auth middleware:** JWT verified on every connection (cookie `accessToken` or `handshake.auth.token`) — socket.js:46
- **Rooms:** Each user joins room `user:{userId}` on connect — socket.js:79
- **User-socket mapping:** `userSockets: Map<userId, Set<socketId>>` — in-memory, lost on restart
- **Events emitted:**
  - `activity:created` — teacher creates activity (activityController.js:309)
  - `activity:updated` — teacher updates activity (activityController.js:412)
  - `activity:deleted` — teacher deletes activity (activityController.js:451)
  - `media:created` — teacher creates media URL (mediaController.js:595)
  - `media:updated` — teacher updates media (mediaController.js:665)
  - `media:deleted` — teacher deletes media (mediaController.js:944)
  - `chat:message` — new chat message sent (chatController.js:91)
- **Origins:** hardcoded list including localhost ports + production domains; extended by `FRONTEND_URL` env var — socket.js:13-32
- **Scaling constraint:** In-memory userSockets map — requires Redis adapter for multi-instance deployment

### Sentry
- **Initialization:** `utils/errorTracker.js:3`; only active when `SENTRY_DSN` env var is set
- **Sample rate:** `SENTRY_TRACES_SAMPLE_RATE` env var; defaults to 0.1 in production, 1.0 in development
- **Usage:** `captureException(error, context)` helper exported; not widely called in controllers directly — Sentry captures unhandled errors via `Sentry.init`
- **Environments:** `NODE_ENV` value passed as environment tag

### Email / Nodemailer
- **Status:** No email integration found in the codebase. The admin registration approval flow returns a `setPasswordUrl` in the JSON response body — the government user is expected to share this manually (via Telegram username in the response). No nodemailer or SMTP configuration files found.

### PostgreSQL
- **Raw SQL usage:**
  - `adminStatsController.js:319` — raw `SELECT` query joining school_ratings, schools, users for school ratings (avoids Sequelize association issues)
  - `adminStatsController.js:400` — fallback raw query for all schools without isActive filter (handles missing column)
  - `adminStatsController.js:418` — second fallback without deletedAt filter
  - Migration file `20240102000000-update-role-based-schema.js:33` — CASE WHEN SQL for enum migration
  - `governmentController.js:394` — raw SchoolRating queries in fallback path
- **ORM:** Sequelize with PostgreSQL 15; migrations only (no `sync()` in production)
- **Connection:** `config/database.js`; SSL configuration required for Railway (known issue documented in MEMORY.md)
- **Read-Only MCP access:** `postgres-uchqun` MCP server provides SELECT-only access to Railway DB

---

## Section 6 — Background and Scheduled Work

### RUN_MIGRATIONS startup task
- **Schedule/trigger:** Server startup — when `RUN_MIGRATIONS=true` environment variable is set (server.js:229)
- **File:** backend/server.js:229
- **What it does:** Dynamically imports `config/migrate.js` and calls `runMigrations()`; runs all pending Sequelize migration files in order
- **Side effects:** DB schema changes; logs progress; on failure logs error but does NOT crash server

### FORCE_SYNC startup task
- **Schedule/trigger:** Server startup — when `FORCE_SYNC=true` AND `NODE_ENV !== 'production'` (server.js:241)
- **File:** backend/server.js:241
- **What it does:** Calls `syncDatabase(true)` from models/index.js — drops ALL tables and recreates from models
- **Side effects:** DATA LOSS — destroys all database content; guarded to development only; explicitly noted as dangerous in CLAUDE.md

### Graceful shutdown handler
- **Schedule/trigger:** SIGTERM or SIGINT signals received by process (server.js:206)
- **File:** backend/server.js:189
- **What it does:** Closes HTTP server; closes Sequelize database connection; force-exits after 30 seconds timeout
- **Side effects:** Closes all active DB connections; logs each step

### In-memory JTI pruning
- **Schedule/trigger:** Called on each request when Redis is not configured and revoked JTI map has entries (auth.js:83)
- **File:** backend/middleware/auth.js:42
- **What it does:** Iterates `_revokedJtis` Map; deletes entries where `expiresAt < Date.now()`
- **Side effects:** Prevents unbounded memory growth for JTI revocation store; no-op when Redis is active

### User cache TTL (passive expiry)
- **Schedule/trigger:** Each `getCachedUser()` call checks TTL (30 seconds) — auth.js:56
- **File:** backend/middleware/auth.js:56
- **What it does:** Serves cached User.findByPk result for up to 30 seconds per userId; bypassed in test environment
- **Side effects:** Stale user data possible for up to 30 seconds after account deactivation (mitigated by `invalidateUserCache()` calls on activation/deactivation)

**No cron jobs, setInterval, or scheduled tasks found** in the codebase beyond the above startup-time behaviors.

---

## Section 7 — Configuration Variants

| Variable | Default | Behavior when set | Behavior when unset |
|----------|---------|-------------------|---------------------|
| `REDIS_URL` | (none) | Redis used for JTI revocation and login lockout; supports multi-instance | In-memory fallback; single-instance only; data lost on restart |
| `JWT_SECRET` | (none) | Used to sign/verify all JWTs | Server returns 500 on login if missing |
| `NODE_ENV` | development | `production`: HTTPS enforced, CORS strict from FRONTEND_URL only, Appwrite required, rate limits tighter | Dev: CORS permissive (all origins if CORS_STRICT unset), local storage fallback available |
| `FORCE_SYNC` | false | `true` + non-production: drops and recreates all tables on startup | No sync — safe for production |
| `RUN_MIGRATIONS` | false | Runs pending Sequelize migrations on server start | Migrations not run automatically |
| `FRONTEND_URL` | (none) | Comma-separated list added to CORS allowlist; in production this is the SOLE allowlist | Dev: localhost ports used; prod: no origins allowed (logs warning) |
| `CORS_STRICT` | false | `true`: applies origin allowlist in development too | Dev: all origins allowed |
| `APPWRITE_ENDPOINT` | (none) | Appwrite SDK initialized | Falls back to local disk (dev only with LOCAL_STORAGE_FALLBACK) |
| `APPWRITE_PROJECT_ID` | (none) | Required for Appwrite client | See above |
| `APPWRITE_API_KEY` | (none) | Required for Appwrite server-side auth | See above |
| `APPWRITE_BUCKET_ID` | (none) | Target bucket for uploads | See above |
| `LOCAL_STORAGE_FALLBACK` | false | `true` + non-production: Appwrite failures fall through to local disk | Files cannot be stored without Appwrite in production |
| `SENTRY_DSN` | (none) | Sentry error tracking active | No error tracking |
| `SENTRY_TRACES_SAMPLE_RATE` | 0.1 (prod), 1.0 (dev) | Sets tracing sample rate | Uses computed default |
| `PORT` | 5000 | HTTP server bind port | Defaults to 5000 |
| `MIGRATION_SECRET` | (none) | Enables `/api/v1/migrations/run` endpoint | Endpoint returns 404 (disabled) |
| `ADMIN_PANEL_URL` | http://localhost:5175 | Base URL for set-password links in admin registration approval | Defaults to localhost:5175 |
| `LOGIN_MAX_ATTEMPTS` | 5 | Max failed logins before lockout | Defaults to 5 |
| `LOGIN_LOCKOUT_SECS` | 900 (15 min) | Lockout duration in seconds | Defaults to 15 minutes |
| `RATE_LIMIT_WINDOW_MS` | 900000 (15 min) | Rate limiter window for all limiters | Defaults to 15 minutes |
| `RATE_LIMIT_API_MAX` | 100 (prod), 1000 (dev) | Max API requests per window | Uses NODE_ENV computed default |
| `RATE_LIMIT_AUTH_MAX` | 50 (prod), 5000 (dev) | Max auth requests per window | Uses NODE_ENV computed default |
| `FILE_BASE_URL` / `PUBLIC_API_URL` | (empty) | Prefixes local file URLs | Local URLs are relative paths only |
| `LOCAL_UPLOADS_DIR` | `{cwd}/uploads` | Local upload directory path | Defaults to uploads/ in working dir |
| `AUTH_LIMIT_WINDOW_MS` | inherits RATE_LIMIT_WINDOW_MS | Auth-specific window override | Falls back to RATE_LIMIT_WINDOW_MS |

---

## Section 8 — Test Coverage Targets

| Layer | Surface area | Existing test coverage | Gap |
|-------|-------------|----------------------|-----|
| Backend API endpoints | ~85 routes | Tests in backend/__tests__/controllers/ (partial) | Unknown coverage — audit needed |
| Frontend pages | 40 pages across 4 apps | Vitest configured; minimal component tests | Most pages untested |
| Cross-role flows | 12 identified flows | No E2E cross-role flow tests | 12 flows uncovered |
| External integrations | 3 (Appwrite, Redis, Socket.io) | Unit test mocks likely present | Integration behavior with real services untested |
| Configuration variants | 22 variables | Minimal | Almost none tested |

### Top 30 Priority Test Gaps

1. **Authentication — JWT revocation after logout:** Verify that an access token used after logout returns 401 "Token has been revoked"; test both Redis and in-memory paths (auth.js:79, authController.js:261)

2. **Login lockout — Redis path:** Verify 429 response after 5 failed logins; verify lock clears after 15 minutes; verify successful login clears counter (loginRateLimitStore.js)

3. **Reception approval gate:** Verify reception cannot log in when documentsApproved=false; verify login succeeds after admin approves all documents; verify that deactivation blocks login again (auth.js:100)

4. **Admin registration full flow:** Submit public registration with documents → government approves → set-password link issued → admin sets password → admin logs in (adminRegistrationController.js, authController.js)

5. **Parent creates school rating → government aggregate:** Submit 1-5 star rating with comment; verify SchoolRating row upserted; call GET /government/ratings and verify school appears with correct average; call GET /government/ratings/:schoolId for individual ratings (parentSchoolRatingController.js, governmentController.js)

6. **Atomic parent + child creation:** POST /reception/parents with child data; verify both parent and child rows created; verify partial failure rolls back both (receptionParentController.js:92)

7. **Child cascade delete:** DELETE /reception/children/:id; verify TherapyUsage, Activity, Media, Meal, Progress all deleted; verify Appwrite file deleted; verify transaction (receptionParentController.js:381)

8. **Media upload — Appwrite integration:** POST /media/upload with image file; verify magic-byte validation (MIME mismatch returns 400); verify Appwrite file created; verify DB record created; verify notification created for parent (mediaController.js)

9. **Media upload — DB failure cleanup:** Simulate DB failure after Appwrite upload; verify orphaned Appwrite file is deleted; verify 500 returned (mediaController.js:458)

10. **Teacher creates activity → parent real-time notification:** POST /activities; verify Notification row created for parent; verify Socket.io `activity:created` emitted to parent's room (activityController.js, notificationController.js)

11. **Chat access control:** Parent can only access their own conversation `parent:{parentId}`; teacher can only access conversations for parents whose children are in teacher's groups; admin can access all conversations (chatController.js:9)

12. **Chat real-time delivery:** Send message from teacher; verify Socket.io emission to parent; send from parent; verify Socket.io lookup via Child→Group→teacherId (chatController.js:91)

13. **School-scoped data isolation:** Admin A cannot see receptions/teachers/parents created by Admin B; reception R1 cannot see reception R2's parents (adminReceptionController.js:44, receptionParentController.js:132)

14. **Government global access:** Government GET /government/schools returns ALL schools (no schoolId filter); government GET /government/students returns ALL children (governmentController.js)

15. **requireTeacher allows admin and reception:** POST /activities with admin token succeeds; POST /activities with reception token succeeds (auth.js:135)

16. **Token refresh rotation:** POST /auth/refresh; verify old refresh token revoked in DB; verify new token pair issued; verify old refresh token cannot be reused (authController.js:182)

17. **Set-password token — wrong purpose:** Attempt to use a regular access JWT (not purpose='set-password') on /auth/set-password; should return 400 "Invalid token" (authController.js:312)

18. **AI warnings analyze → notify parents:** POST /ai-warnings/analyze with low-rated school; verify AIWarning created; verify Notification bulk created for all parents with children at that school (aiWarningController.js)

19. **Password reset rate limiter:** Verify /user/password blocked after 3 requests in 1 hour; verify 429 response (rateLimiter.js:41)

20. **AI chat rate limiter:** Verify /teacher/ai/chat or /parent/ai/chat blocked after 20 requests per minute in production (rateLimiter.js:57)

21. **CORS — production strict mode:** With NODE_ENV=production and FRONTEND_URL set, verify requests from unlisted origin blocked; verify requests from listed origin allowed (server.js:94)

22. **Migration secret gate:** POST /api/v1/migrations/run with wrong secret returns 403; with correct secret runs migrations; with no MIGRATION_SECRET configured returns 404 (migrationRoutes.js:15)

23. **Reception documents verification status:** GET /reception/verification-status returns correct pending/approved/rejected counts; reflects accurately after admin action (receptionController.js)

24. **Parent rating upsert:** Parent rates same school twice → verify UPDATE not INSERT (upsert); verify stars and comment updated (parentSchoolRatingController.js:118)

25. **Teacher rating updates teacher User fields:** Rate teacher with 5 stars; verify User.rating and User.totalRatings updated; rate again with 3 stars; verify recalculation (parentTeacherRatingController.js:35)

26. **Government admin delete — dependent users check:** Attempt DELETE /government/admins/:id for admin who has created receptions; verify 409 "Cannot delete admin with dependent users" (adminUserController.js:85)

27. **Proxy media — Appwrite fallback to preview endpoint:** Serve media item whose view endpoint returns 404; verify retry with preview endpoint; verify transparent PNG returned on total failure (mediaController.js:795)

28. **Socket.io auth:** Connect to Socket.io without token → expect auth error; connect with expired token → expect auth error; connect with valid token → connected; receive events on correct user room (socket.js:46)

29. **Teacher resource upload — file type validation:** POST /resources with PDF file → expect error (only video/audio/image); with valid video file → expect 201; with oversized file (>100MB) → expect error (teacherResourceRoutes.js:20)

30. **Group-teacher cross-validation:** POST /groups with non-existent teacherId → 400; POST /reception/parents with groupId belonging to different teacher than teacherId → 400 "Group does not belong to the selected teacher" (receptionParentController.js:68)

---

*End of E2E Test Inventory — Total routes cataloged: ~85 backend API routes, 40 frontend pages across 4 apps, 12 cross-role flows, 22 configuration variables, 30 priority test gaps.*

---

## Section 2 — Backend API Detail Supplement

This section provides per-endpoint detail blocks for all routes that previously appeared only as table rows without expanded coverage. Format mirrors the existing detail blocks in the main body.

---

### Teacher Routes

#### GET /teacher/profile
- **Controller:** teacherController.js `getMyProfile` (line 12)
- **Auth:** authenticate → requireTeacher
- **Request:** No body; user identity from `req.user`
- **Success 200:**
  ```json
  {
    "id": 1, "firstName": "Anna", "lastName": "Karim",
    "email": "a@school.uz", "phone": "+998901234567",
    "role": "teacher", "rating": 4.5, "schoolId": 2
  }
  ```
- **Errors:**
  - 404 if user record deleted between auth and query
  - 500 on DB failure
- **Side effects:** None
- **Transactions:** None

#### GET /teacher/dashboard
- **Controller:** teacherController.js `getDashboard` (line 31)
- **Auth:** authenticate → requireTeacher
- **Request:** No body
- **Success 200:**
  ```json
  {
    "parentCount": 8,
    "childCount": 12,
    "activityCount": 34,
    "mealCount": 67,
    "mediaCount": 19,
    "groupCount": 2
  }
  ```
- **Errors:**
  - 500 on any DB failure
- **Side effects:** None
- **Transactions:** None
- **Notes:** Each count uses a separate `COUNT` query. All counts are scoped to the teacher's own records via `teacherId` or `createdById`.

#### GET /teacher/parents
- **Controller:** teacherController.js `getParents` (line 64)
- **Auth:** authenticate → requireTeacher
- **Query params:** `groupId` (optional) — filter by specific group
- **Success 200:**
  ```json
  {
    "parents": [
      {
        "id": 10, "firstName": "Bobur", "lastName": "Toshev",
        "children": [{ "id": 5, "firstName": "Dilnoza", "lastName": "Tosheva" }]
      }
    ]
  }
  ```
- **Errors:**
  - 403 if caller role is `parent` (parent cannot list all parents)
  - 500 on DB failure
- **Role branching:**
  - `teacher` → filters by `teacherId = req.user.id`
  - `reception`/`admin` → filters by `schoolId` via `schoolScope`
- **Side effects:** None
- **Transactions:** None

#### GET /teacher/parents/:id
- **Controller:** teacherController.js `getParentById` (line 119)
- **Auth:** authenticate → requireTeacher
- **Params:** `id` — parent user ID
- **Success 200:** Full parent object including associated children array
- **Errors:**
  - 404 `"Parent not found"`
  - 403 if the parent does not belong to the requesting teacher's group
- **Side effects:** None
- **Transactions:** None

#### GET /teacher/messages
- **Controller:** teacherController.js `getMyMessages` (line 139)
- **Auth:** authenticate → requireTeacher
- **Success 200:**
  ```json
  {
    "messages": [
      { "id": 1, "content": "Hello", "senderId": 10, "createdAt": "..." }
    ]
  }
  ```
- **Errors:** 500 on DB failure
- **Side effects:** None
- **Transactions:** None

#### GET /teacher/groups
- **Controller:** teacherController.js `getMyGroups` (line 152)
- **Auth:** authenticate → requireTeacher
- **Success 200:**
  ```json
  {
    "groups": [
      { "id": 3, "name": "Group A", "capacity": 15, "parentCount": 8 }
    ]
  }
  ```
- **Notes:** `parentCount` is a virtual field computed via a sub-query counting parents whose `groupId` matches
- **Side effects:** None
- **Transactions:** None

#### GET /teacher/ratings
- **Controller:** teacherController.js `getTeacherRatings` (line 174)
- **Auth:** authenticate → requireTeacher
- **Success 200:**
  ```json
  {
    "ratings": [
      {
        "id": 1, "rating": 5, "comment": "Excellent",
        "parentId": 10, "teacherId": 4, "rank": 1
      }
    ],
    "averageRating": 4.8,
    "totalRatings": 15
  }
  ```
- **Notes:** `rank` is added client-side by sorting by rating desc and assigning 1-based index
- **Side effects:** None
- **Transactions:** None

---

### Activity Routes (expanded)

#### GET /activities
- **Controller:** activityController.js `getActivities` (line 10)
- **Auth:** authenticate → requireTeacher (teacher role sees own; parent role sees their children's)
- **Query params:** `childId` (optional), `startDate` / `endDate` (optional date range)
- **Success 200:** Array of activity objects with nested `child` and `parent` associations
- **Errors:**
  - 500 on DB failure
- **Side effects:** None
- **Transactions:** None
- **Role branching:**
  - Teacher: filters `teacherId = req.user.id` + optional `childId`
  - Parent: filters by `parentId = req.user.id` across all their children

#### GET /activities/:id
- **Controller:** activityController.js `getActivity` (line 143)
- **Auth:** authenticate
- **Params:** `id` — activity ID
- **Success 200:** Single activity with `child`, `parent`, `teacher` associations
- **Errors:**
  - 404 `"Activity not found"`
  - 403 if caller cannot access the activity's school scope
- **Side effects:** None
- **Transactions:** None

#### PUT /activities/:id
- **Controller:** activityController.js `updateActivity` (line 352)
- **Auth:** authenticate → requireTeacher
- **Body:** Any subset of ALLOWED_ACTIVITY_FIELDS (defined at line 347):
  `skill, goal, startDate, endDate, tasks, methods, progress, observation, services, status`
- **Success 200:** Updated activity object
- **Errors:**
  - 404 `"Activity not found"`
  - 403 if activity does not belong to requesting teacher
  - 400 on Sequelize validation failure
- **Side effects:** Emits `activity:updated` Socket.io event to `school:{schoolId}` room
- **Transactions:** None (single UPDATE)
- **Security:** Fields not in ALLOWED_ACTIVITY_FIELDS are silently stripped before update

#### DELETE /activities/:id
- **Controller:** activityController.js `deleteActivity` (line 426)
- **Auth:** authenticate → requireTeacher
- **Params:** `id`
- **Success 200:** `{ "message": "Activity deleted" }`
- **Errors:**
  - 404 `"Activity not found"`
  - 403 if activity belongs to a different teacher
- **Side effects:** Emits `activity:deleted` Socket.io event; does NOT delete associated notifications
- **Transactions:** None

---

### Meal Routes

#### GET /meals
- **Controller:** mealController.js `getMeals` (line 10)
- **Auth:** authenticate
- **Query params:** `date` (optional, ISO date string), `childId` (optional)
- **Success 200:** Array of meal objects with `child` association
- **Errors:** 500 on DB failure
- **Role branching:**
  - Teacher: all meals they created (`createdById = req.user.id`)
  - Parent: meals for their children only
- **Side effects:** None
- **Transactions:** None

#### GET /meals/:id
- **Controller:** mealController.js `getMeal` (line 114)
- **Auth:** authenticate
- **Params:** `id`
- **Success 200:** Single meal object with `child` and `createdBy` associations
- **Errors:**
  - 404 `"Meal not found"`
  - 403 if caller cannot access the meal's school scope
- **Side effects:** None
- **Transactions:** None

#### POST /meals
- **Controller:** mealController.js `createMeal` (line 182)
- **Auth:** authenticate → requireTeacher
- **Body:**
  ```json
  {
    "childId": 5,
    "date": "2026-05-12",
    "mealType": "lunch",
    "ate": true,
    "note": "Ate well"
  }
  ```
- **Success 201:** Created meal object
- **Errors:**
  - 400 `"childId and date are required"`
  - 400 `"Invalid mealType"` (must be breakfast/lunch/dinner/snack)
  - 404 if child not found or not in teacher's scope
- **Side effects:**
  - Creates Notification for parent (awaited, unlike activities which fire-and-forget)
  - Emits `meal:created` Socket.io event to `school:{schoolId}` room
- **Transactions:** None (sequential inserts; notification creation can fail independently)

#### PUT /meals/:id
- **Controller:** mealController.js `updateMeal` (line 248)
- **Auth:** authenticate → requireTeacher
- **Body:** Any fields from the Meal model (no ALLOWED_FIELDS whitelist — full `req.body` accepted)
- **Success 200:** Updated meal object
- **Errors:**
  - 404 `"Meal not found"`
  - 403 if meal does not belong to requesting teacher
- **Side effects:** Emits `meal:updated` Socket.io event
- **Transactions:** None

#### DELETE /meals/:id
- **Controller:** mealController.js `deleteMeal` (line 293)
- **Auth:** authenticate → requireTeacher
- **Success 200:** `{ "message": "Meal deleted" }`
- **Errors:**
  - 404 `"Meal not found"`
  - 403 if meal does not belong to requesting teacher
- **Side effects:** Emits `meal:deleted` Socket.io event
- **Transactions:** None

---

### Media Routes (expanded)

#### GET /media
- **Controller:** mediaController.js `getMedia` (approximately line 10)
- **Auth:** authenticate
- **Query params:** `childId` (optional), `type` (optional: image/video/audio/document)
- **Success 200:** Array of media objects with `child` and `uploadedBy` associations
- **Errors:** 500 on DB failure
- **Side effects:** None
- **Transactions:** None

#### GET /media/:id
- **Controller:** mediaController.js `getMedia` single (approximately line 80)
- **Auth:** authenticate
- **Params:** `id`
- **Success 200:** Single media object
- **Errors:** 404 `"Media not found"`
- **Side effects:** None
- **Transactions:** None

#### PUT /media/:id
- **Controller:** mediaController.js `updateMedia`
- **Auth:** authenticate → requireTeacher
- **Body:** `{ "title": "...", "description": "..." }` (metadata only, not file replacement)
- **Success 200:** Updated media object
- **Errors:**
  - 404 `"Media not found"`
  - 403 if media does not belong to requesting teacher
- **Side effects:** None
- **Transactions:** None

#### DELETE /media/:id
- **Controller:** mediaController.js `deleteMedia`
- **Auth:** authenticate → requireTeacher
- **Params:** `id`
- **Success 200:** `{ "message": "Media deleted" }`
- **Errors:**
  - 404 `"Media not found"`
  - 403 if media does not belong to requesting teacher
- **Side effects:**
  - Calls Appwrite SDK `storage.deleteFile()` to remove the file from storage
  - If Appwrite deletion fails, logs error but still deletes DB record
- **Transactions:** None

#### GET /media/:id/proxy
- **Controller:** mediaController.js `proxyMedia` (line 795)
- **Auth:** authenticate
- **Params:** `id`
- **Success 200:** Binary file stream with correct `Content-Type` header
- **Errors:**
  - 404 `"Media not found"` if DB record missing
  - Falls back to Appwrite preview endpoint if view endpoint returns 404
  - Returns transparent 1x1 PNG on total Appwrite failure
- **Side effects:** None
- **Transactions:** None

---

### Notification Routes

#### GET /notifications
- **Controller:** notificationController.js `getNotifications` (line 9)
- **Auth:** authenticate
- **Query params:** `unread` (optional boolean string), `limit` (default 50), `offset` (default 0)
- **Success 200:**
  ```json
  {
    "notifications": [...],
    "total": 42,
    "unreadCount": 7
  }
  ```
- **Errors:** 500 on DB failure
- **Side effects:** None
- **Transactions:** None

#### PUT /notifications/:id/read
- **Controller:** notificationController.js `markAsRead` (line 59)
- **Auth:** authenticate
- **Params:** `id`
- **Success 200:** `{ "message": "Marked as read" }`
- **Errors:**
  - 404 `"Notification not found"`
  - 403 if notification does not belong to requesting user
- **Side effects:** Sets `isRead = true`, `readAt = NOW()`
- **Transactions:** None

#### PUT /notifications/read-all
- **Controller:** notificationController.js `markAllAsRead` (line 91)
- **Auth:** authenticate
- **Success 200:** `{ "message": "All notifications marked as read", "updated": 12 }`
- **Errors:** 500 on DB failure
- **Side effects:** Bulk UPDATE on all unread notifications for `userId = req.user.id`
- **Transactions:** None

#### DELETE /notifications/:id
- **Controller:** notificationController.js `deleteNotification` (line 120)
- **Auth:** authenticate
- **Params:** `id`
- **Success 200:** `{ "message": "Notification deleted" }`
- **Errors:**
  - 404 `"Notification not found"`
  - 403 if notification does not belong to requesting user
- **Side effects:** Hard delete from DB
- **Transactions:** None

#### GET /notifications/unread-count
- **Controller:** notificationController.js `getUnreadCount` (line 148)
- **Auth:** authenticate
- **Success 200:** `{ "count": 7 }`
- **Errors:** 500 on DB failure
- **Side effects:** None
- **Transactions:** None

---

### Chat Routes (expanded)

#### GET /chat/messages/:conversationId
- **Controller:** chatController.js `listMessages` (line 40)
- **Auth:** authenticate → `canAccessConversation` helper (line 9)
- **Params:** `conversationId` — format `"parent:{parentId}"`
- **Query params:** `limit` (default 50), `before` (cursor for pagination)
- **Success 200:** Array of message objects ordered by `createdAt DESC`
- **Errors:**
  - 403 if user is neither the parent nor the teacher in that conversation
  - 500 on DB failure
- **Side effects:** None
- **Transactions:** None

#### POST /chat/messages
- **Controller:** chatController.js `createMessage` (line 65)
- **Auth:** authenticate
- **Body:** `{ "conversationId": "parent:10", "content": "Hello" }`
- **Success 201:** Created message object
- **Errors:**
  - 400 `"conversationId and content required"`
  - 403 if user cannot access the conversation
- **Side effects:**
  - Emits `chat:message` Socket.io event to both users' rooms
  - Creates Notification for the recipient
- **Transactions:** None

#### PUT /chat/messages/:id/read
- **Controller:** chatController.js `markConversationRead` (line 112)
- **Auth:** authenticate
- **Params:** `id` — conversationId (not message ID)
- **Success 200:** `{ "message": "Marked as read" }`
- **Errors:**
  - 403 if user not in conversation
- **Side effects:**
  - Sets `readByParent = true` or `readByTeacher = true` based on caller role
- **Transactions:** None

#### PUT /chat/messages/:id
- **Controller:** chatController.js `updateMessage` (line 135)
- **Auth:** authenticate
- **Params:** `id` — message ID
- **Body:** `{ "content": "Updated text" }`
- **Success 200:** Updated message object
- **Errors:**
  - 404 `"Message not found"`
  - 403 if caller is not the message sender AND not admin/government role
- **Side effects:** Sets `editedAt = NOW()`; emits `chat:messageUpdated` event
- **Transactions:** None

#### DELETE /chat/messages/:id
- **Controller:** chatController.js `deleteMessage` (line 166)
- **Auth:** authenticate
- **Params:** `id`
- **Success 200:** `{ "message": "Deleted" }`
- **Errors:**
  - 404 `"Message not found"`
  - 403 if caller is not sender AND not teacher/admin (teacher can moderate as room owner)
- **Side effects:** Soft or hard delete depending on implementation; emits `chat:messageDeleted`
- **Transactions:** None

#### GET /chat/unread-count
- **Controller:** chatController.js `getUnreadCount` (line 237)
- **Auth:** authenticate
- **Success 200:** `{ "count": 3 }`
- **Side effects:** None

#### GET /chat/conversations
- **Controller:** chatController.js `listConversations` (line 261)
- **Auth:** authenticate
- **Success 200:**
  ```json
  {
    "conversations": [
      {
        "conversationId": "parent:10",
        "lastMessage": { "content": "Hi", "createdAt": "..." },
        "unreadCount": 2,
        "participant": { "id": 10, "firstName": "Bobur" }
      }
    ]
  }
  ```
- **Side effects:** None
- **Transactions:** None

---

### Emotional Monitoring Routes

#### POST /emotional-monitoring (create)
#### PUT /emotional-monitoring/:id (update)
- **Controller:** emotionalMonitoringController.js `createOrUpdateMonitoring` (line 20)
- **Auth:** authenticate → requireTeacher
- **Dispatch:** Checks `req.method`; POST = create, PUT = update same handler
- **Body (POST):**
  ```json
  {
    "childId": 5,
    "date": "2026-05-12",
    "emotionalState": {
      "happy": true, "sad": false, "angry": false,
      "anxious": false, "calm": true, "excited": false,
      "tired": false, "focused": true, "withdrawn": false
    },
    "note": "Good day overall"
  }
  ```
- **Success 201/200:** Upserted monitoring record
- **Errors:**
  - 400 if `childId` or `date` missing
  - 404 if child not found in teacher's scope
  - 409 if attempting POST on existing (childId, date) combination — use PUT instead
- **Side effects:** Upsert on unique constraint `(childId, date)` — creates or replaces the record
- **Transactions:** Uses Sequelize `upsert()`

#### GET /emotional-monitoring/child/:childId
- **Controller:** emotionalMonitoringController.js `getMonitoringByChild` (line 179)
- **Auth:** authenticate
- **Params:** `childId`
- **Query params:** `startDate`, `endDate` (optional date range filter)
- **Success 200:** Array of monitoring records for the child ordered by date DESC
- **Errors:**
  - 403 if caller cannot access the child
  - 404 if child not found
- **Side effects:** None
- **Transactions:** None

#### GET /emotional-monitoring
- **Controller:** emotionalMonitoringController.js `getAllMonitoring` (line 244)
- **Auth:** authenticate → requireTeacher (admin/reception also allowed)
- **Query params:** `childId`, `date`, `startDate`, `endDate`
- **Success 200:** Paginated list of monitoring records across all children in scope
- **Errors:** 500 on DB failure
- **Side effects:** None
- **Transactions:** None

#### GET /emotional-monitoring/:id
- **Controller:** emotionalMonitoringController.js `getMonitoringById` (line 319)
- **Auth:** authenticate
- **Params:** `id`
- **Success 200:** Single monitoring record
- **Errors:** 404 `"Record not found"`, 403 if out of scope
- **Side effects:** None
- **Transactions:** None

#### DELETE /emotional-monitoring/:id
- **Controller:** emotionalMonitoringController.js `deleteMonitoring` (line 370)
- **Auth:** authenticate → requireTeacher
- **Params:** `id`
- **Success 200:** `{ "message": "Deleted" }`
- **Errors:**
  - 404 `"Record not found"`
  - 403 if record does not belong to requesting teacher
- **Side effects:** Hard delete
- **Transactions:** None

---

### Therapy Routes

#### GET /therapies
- **Controller:** therapyController.js `getTherapies` (line 14)
- **Auth:** authenticate
- **Query params:** `childId` (optional), `isActive` (optional boolean)
- **Success 200:** Array of therapy objects; includes `usages` association if requested
- **Behavior:** Three-level fallback query — by teacherId, then by schoolId, then globally (for admin/government)
- **Errors:** 500 on DB failure
- **Side effects:** None
- **Transactions:** None

#### GET /therapies/:id
- **Controller:** therapyController.js `getTherapy` (line 157)
- **Auth:** authenticate
- **Params:** `id`
- **Success 200:** Single therapy with full associations
- **Errors:** 404 `"Therapy not found"`, 403 if out of scope
- **Side effects:** None
- **Transactions:** None

#### POST /therapies
- **Controller:** therapyController.js `createTherapy` (line 190)
- **Auth:** authenticate → requireTeacher
- **Body:**
  ```json
  {
    "childId": 5,
    "type": "speech",
    "startDate": "2026-01-15",
    "description": "Speech therapy sessions",
    "therapistName": "Dr. Ali"
  }
  ```
- **Success 201:** Created therapy object
- **Errors:**
  - 400 if required fields missing
  - 404 if child not in teacher's scope
- **Side effects:** Auto-creates TherapyUsage record if `childId` provided (tracks usage stats)
- **Transactions:** Wrapped in Sequelize transaction to ensure both therapy and usage creation succeed or both rollback

#### POST /therapies/:id/start
- **Controller:** therapyController.js `startTherapy` (line 318)
- **Auth:** authenticate → requireTeacher
- **Params:** `id`
- **Body:** `{ "sessionNote": "Started session 3" }` (optional)
- **Success 200:** `{ "message": "Session started", "therapy": {...} }`
- **Errors:**
  - 404 `"Therapy not found"`
  - 409 `"Session already active"` if therapy already has active session
- **Side effects:** Increments `usageCount` on TherapyUsage record; sets session start timestamp
- **Transactions:** None

#### POST /therapies/:id/end
- **Controller:** therapyController.js `endTherapy` (line 414)
- **Auth:** authenticate → requireTeacher
- **Params:** `id`
- **Body:** `{ "rating": 4, "feedback": "Good progress", "sessionNote": "Completed" }`
- **Success 200:** Updated therapy with calculated stats
- **Errors:**
  - 404 `"Therapy not found"`
  - 409 `"No active session"` if no session in progress
  - 400 if `rating` not in range 1–5
- **Side effects:**
  - Calculates session duration in minutes
  - Updates weighted average rating: `newAvg = (oldAvg * oldCount + newRating) / (oldCount + 1)`
  - Sets session end timestamp
- **Transactions:** None

#### PUT /therapies/:id
- **Controller:** therapyController.js `updateTherapy` (line 472)
- **Auth:** authenticate → requireTeacher
- **Body:** Partial update of therapy fields
- **Success 200:** Updated therapy
- **Errors:** 404, 403 if not therapy owner
- **Side effects:** None
- **Transactions:** None

#### DELETE /therapies/:id
- **Controller:** therapyController.js `deleteTherapy` (line 525)
- **Auth:** authenticate → requireTeacher
- **Params:** `id`
- **Success 200:** `{ "message": "Therapy deactivated" }`
- **Errors:** 404, 403
- **Side effects:** Sets `isActive = false` (soft delete); record is preserved for historical reference
- **Transactions:** None

#### GET /therapies/:id/usage
- **Controller:** therapyController.js `getTherapyUsage` (line 556)
- **Auth:** authenticate
- **Params:** `id`
- **Success 200:** TherapyUsage record with session count, total duration, average rating
- **Errors:** 404 if no usage record exists
- **Side effects:** None
- **Transactions:** None

---

### Admin Stats Routes

#### GET /admin/statistics
- **Controller:** adminStatsController.js `getStatistics` (line 18)
- **Auth:** authenticate → requireRole('admin')
- **Success 200:**
  ```json
  {
    "receptionCount": 3,
    "teacherCount": 12,
    "parentCount": 45,
    "childCount": 60,
    "activityCount": 234,
    "mealCount": 890,
    "groupCount": 8
  }
  ```
- **Behavior:** Traverses `admin → receptions → teachers → parents → children` relationship chain; each leg wrapped in `.catch(() => [])` so partial failures still return available data
- **Errors:** 500 only if top-level admin lookup fails
- **Side effects:** None
- **Transactions:** None

#### GET /admin/school-ratings
- **Controller:** adminStatsController.js `getSchoolRatings` (line 310)
- **Auth:** authenticate → requireRole('admin')
- **Success 200:**
  ```json
  {
    "ratings": [
      { "schoolId": 1, "schoolName": "School 1", "averageRating": 4.3, "ratingsCount": 42 }
    ]
  }
  ```
- **Behavior:** Uses raw SQL `AVG()` + `COUNT()` grouped by school; more efficient than ORM for aggregated stats
- **Errors:** 500 on query failure
- **Side effects:** None
- **Transactions:** None

---

### Admin Parent Routes

#### GET /admin/parents
- **Controller:** adminParentController.js `getParents` (line 18)
- **Auth:** authenticate → requireRole('admin')
- **Query params:** `search` (optional, matches firstName/lastName/email), `limit`, `offset`
- **Success 200:**
  ```json
  {
    "parents": [...],
    "total": 45
  }
  ```
- **Errors:** 500 on DB failure
- **Side effects:** None
- **Transactions:** None

#### GET /admin/parents/:id
- **Controller:** adminParentController.js `getParentById` (line 75)
- **Auth:** authenticate → requireRole('admin')
- **Params:** `id`
- **Success 200:** Full parent object including:
  - Associated children
  - Last 10 activities ordered by `createdAt DESC`
  - Last 10 meals ordered by `createdAt DESC`
  - Last 10 media items ordered by `createdAt DESC`
- **Errors:** 404 `"Parent not found"`
- **Side effects:** None
- **Transactions:** None

---

### Admin Teacher Routes

#### GET /admin/teachers
- **Controller:** adminTeacherController.js `getTeachers` (line 13)
- **Auth:** authenticate → requireRole('admin')
- **Query params:** `receptionId` (optional), `search`
- **Success 200:**
  ```json
  {
    "teachers": [
      { "id": 4, "firstName": "Anna", "rating": 4.5, "group": { "id": 3, "name": "Group A" } }
    ],
    "total": 12
  }
  ```
- **Notes:** Read-only endpoint; scoped to admin's receptions (admin cannot see teachers from other schools)
- **Errors:** 500 on DB failure
- **Side effects:** None
- **Transactions:** None

---

### Admin Reception Routes

#### GET /admin/receptions
- **Controller:** adminReceptionController.js
- **Auth:** authenticate → requireRole('admin')
- **Success 200:** Array of reception users with `documentsApproved`, `isActive`, `documents` fields
- **Errors:** 500 on DB failure
- **Side effects:** None

#### POST /admin/receptions
- **Controller:** adminReceptionController.js
- **Auth:** authenticate → requireRole('admin')
- **Body:** `{ "firstName", "lastName", "email", "password", "phone" }`
- **Success 201:** Created reception user object (password hashed, role = 'reception')
- **Errors:** 400 on validation, 409 on duplicate email
- **Side effects:** Sends welcome email if email service configured
- **Transactions:** None

#### PUT /admin/receptions/:id
- **Controller:** adminReceptionController.js
- **Auth:** authenticate → requireRole('admin')
- **Body:** Partial update of reception fields
- **Success 200:** Updated reception user
- **Errors:** 404, 400 on validation
- **Side effects:** None
- **Transactions:** None

#### DELETE /admin/receptions/:id
- **Controller:** adminReceptionController.js
- **Auth:** authenticate → requireRole('admin')
- **Success 200:** `{ "message": "Reception deleted" }`
- **Errors:** 404, 409 if reception has dependent teachers/parents
- **Side effects:** Cascades to related records per FK constraints
- **Transactions:** None

#### POST /admin/receptions/:id/documents/:docType/approve
- **Controller:** adminReceptionController.js `approveDocument` (line 135)
- **Auth:** authenticate → requireRole('admin')
- **Params:** `id` (receptionId), `docType` (e.g., `passport`, `diploma`)
- **Success 200:** Updated document status
- **Behavior:** When ALL documents for a reception are approved, automatically sets `isActive = true` AND `documentsApproved = true`
- **Errors:** 404 if document not found
- **Side effects:** May trigger `isActive = true` cascade on full approval
- **Transactions:** Single transaction covering document update + optional activation

#### POST /admin/receptions/:id/documents/:docType/reject
- **Controller:** adminReceptionController.js `rejectDocument` (line 220)
- **Auth:** authenticate → requireRole('admin')
- **Success 200:** Updated document status
- **Behavior:** Sets `isActive = false` when any document is rejected (deactivates reception)
- **Errors:** 404 if document not found
- **Side effects:** Sets `isActive = false` on the reception user
- **Transactions:** None

#### POST /admin/receptions/:id/activate
- **Controller:** adminReceptionController.js `activateReception` (line 288)
- **Auth:** authenticate → requireRole('admin')
- **Success 200:** `{ "message": "Reception activated" }`
- **Behavior:** Sets BOTH `isActive = true` AND `documentsApproved = true`
- **Errors:** 404 `"Reception not found"`
- **Side effects:** Unlocks reception login (Reception role requires both flags)
- **Transactions:** None

#### POST /admin/receptions/:id/deactivate
- **Controller:** adminReceptionController.js `deactivateReception` (line 326)
- **Auth:** authenticate → requireRole('admin')
- **Success 200:** `{ "message": "Reception deactivated" }`
- **Behavior:** Sets ONLY `isActive = false`; does NOT touch `documentsApproved` (intentional)
- **Errors:** 404 `"Reception not found"`
- **Side effects:** Blocks reception login without invalidating document approval status
- **Transactions:** None

---

### Admin User Management Routes

#### GET /admin/admins
- **Controller:** adminUserController.js `getAdmins`
- **Auth:** authenticate → requireRole('government', 'business')
- **Success 200:** Array of admin users scoped to the caller's school/region
- **Errors:** 500
- **Side effects:** None

#### POST /admin/admins
- **Controller:** adminUserController.js `createAdmin`
- **Auth:** authenticate → requireRole('government', 'business')
- **Body:** `{ "firstName", "lastName", "email", "password", "schoolId" }`
- **Success 201:** Created admin user
- **Errors:** 400 validation, 409 duplicate email
- **Side effects:** None
- **Transactions:** None

#### PUT /admin/admins/:id
- **Controller:** adminUserController.js `updateAdmin`
- **Auth:** authenticate → requireRole('government', 'business')
- **Success 200:** Updated admin user
- **Errors:** 404, 400
- **Side effects:** None

#### DELETE /admin/admins/:id
- **Controller:** adminUserController.js `deleteAdmin` (line 70)
- **Auth:** authenticate → requireRole('government', 'business')
- **Behavior:** Counts `dependentUsers` (receptions created by this admin); if count > 0 returns 409
- **Success 200:** `{ "message": "Admin deleted" }`
- **Errors:**
  - 404 `"Admin not found"`
  - 409 `"Cannot delete admin with dependent users"` (dependentUsers count check at line 85)
- **Side effects:** Hard delete if no dependents
- **Transactions:** None

#### POST /admin/government
- **Controller:** adminUserController.js `createGovernment`
- **Auth:** authenticate → requireRole('business')
- **Body:** `{ "firstName", "lastName", "email", "password", "region" }`
- **Success 201:** Created government user
- **Errors:** 400, 409 on duplicate
- **Side effects:** None

#### GET /admin/government
- **Controller:** adminUserController.js `getGovernments`
- **Auth:** authenticate → requireRole('business')
- **Success 200:** Array of government users
- **Side effects:** None

#### PUT /admin/government/:id
- **Controller:** adminUserController.js `updateGovernmentUser`
- **Auth:** authenticate → requireRole('business')
- **Success 200:** Updated government user
- **Errors:** 404, 400

#### DELETE /admin/government/:id
- **Controller:** adminUserController.js `deleteGovernmentUser` (line 332)
- **Auth:** authenticate → requireRole('business')
- **Behavior:** Checks `req.user.id === id`; if match, returns 403 `"Cannot delete yourself"`
- **Success 200:** `{ "message": "Government user deleted" }`
- **Errors:**
  - 403 self-deletion guard
  - 404 `"User not found"`
- **Side effects:** Hard delete
- **Transactions:** None

---

### Parent Routes

#### GET /parent/children
- **Controller:** parentChildController.js `getMyChildren` (line 11)
- **Auth:** authenticate → requireRole('parent')
- **Success 200:**
  ```json
  {
    "children": [
      {
        "id": 5, "firstName": "Dilnoza", "lastName": "Tosheva",
        "dateOfBirth": "2018-03-15", "group": { "id": 3, "name": "Group A" }
      }
    ]
  }
  ```
- **Errors:** 500 on DB failure
- **Side effects:** None
- **Transactions:** None

#### GET /parent/profile
- **Controller:** parentProfileController.js `getMyProfile` (line 12)
- **Auth:** authenticate → requireRole('parent')
- **Success 200:** Parent user object with `assignedTeacher` (includes group) association
- **Errors:** 404 `"Profile not found"`, 500
- **Side effects:** None
- **Transactions:** None

#### GET /parent/profile/:parentId (admin/reception view)
- **Controller:** parentProfileController.js `getParentData` (line 73)
- **Auth:** authenticate → requireRole('admin', 'reception', 'teacher')
- **Params:** `parentId`
- **Success 200:** Full parent profile including children, teacher, group
- **Errors:** 403 if out of scope, 404 `"Parent not found"`
- **Side effects:** None
- **Transactions:** None

#### POST /parent/school-ratings
#### PUT /parent/school-ratings/:id
- **Controller:** parentSchoolRatingController.js `rateSchool` (line 9)
- **Auth:** authenticate → requireRole('parent')
- **Body:** `{ "schoolName": "School 1", "rating": 4, "comment": "Good school" }`
- **Success 201/200:** Rating object
- **Behavior:**
  - Validates `rating` is 1–5
  - If school with given name not found, creates it (upsert logic)
  - If parent already rated this school, updates rather than creates (findOrCreate-like pattern)
  - Recalculates school's `averageRating` and `ratingsCount` after save
- **Errors:**
  - 400 `"schoolName and rating are required"`
  - 400 `"Rating must be between 1 and 5"`
- **Side effects:** Updates School record's aggregate fields
- **Transactions:** None (sequential operations)

#### GET /parent/school-ratings/my
- **Controller:** parentSchoolRatingController.js `getMySchoolRating` (line 173)
- **Auth:** authenticate → requireRole('parent')
- **Success 200:** Parent's own school rating object or `null` if not yet rated
- **Side effects:** None

#### GET /parent/schools
- **Controller:** parentSchoolRatingController.js `getSchools` (line 243)
- **Auth:** authenticate → requireRole('parent')
- **Success 200:** Array of all schools with `averageRating`, `ratingsCount`
- **Side effects:** None

#### POST /parent/teacher-ratings
#### PUT /parent/teacher-ratings/:id
- **Controller:** parentTeacherRatingController.js `rateMyTeacher` (line 6)
- **Auth:** authenticate → requireRole('parent')
- **Body:** `{ "rating": 5, "comment": "Excellent teacher" }`
- **Behavior:**
  - Uses `findOrCreate` to get or create rating record for `(parentId, teacherId)` pair
  - After save, recalculates `User.rating` for the teacher by averaging all their ratings
- **Success 201/200:** Rating object
- **Errors:**
  - 400 `"Rating must be between 1 and 5"`
  - 404 if parent has no assigned teacher
- **Side effects:** Updates Teacher `User.rating` aggregate field
- **Transactions:** None

#### GET /parent/teacher-ratings/my
- **Controller:** parentTeacherRatingController.js `getMyRating` (line 58)
- **Auth:** authenticate → requireRole('parent')
- **Success 200:** Parent's own teacher rating or `null`
- **Side effects:** None

---

### Government Overview Route

#### GET /government/overview
- **Controller:** governmentController.js `getOverview` (line 17)
- **Auth:** authenticate → requireRole('government')
- **Query params:** `region`, `district`, `schoolId` (all optional filters)
- **Success 200:**
  ```json
  {
    "schoolCount": 45,
    "teacherCount": 312,
    "parentCount": 1250,
    "childCount": 1890,
    "activityCount": 8934,
    "averageSchoolRating": 4.1
  }
  ```
- **Behavior:** Each count wrapped in `try/catch` — partial failures return 0 for failed counts rather than erroring the whole response
- **Errors:** 500 only if auth or top-level query fails completely
- **Side effects:** None
- **Transactions:** None

---

### Government Message Routes

#### POST /government/messages
- **Controller:** governmentMessageController.js `sendMessage` (line 12)
- **Auth:** authenticate → requireRole('government')
- **Body:**
  ```json
  {
    "recipientType": "admin",
    "recipientId": 3,
    "subject": "Policy Update",
    "content": "Please review the new guidelines..."
  }
  ```
- **Success 201:** Created message object
- **Errors:**
  - 400 `"recipientType, recipientId, subject, content required"`
  - 404 if recipient not found
- **Side effects:** Creates Notification for recipient
- **Transactions:** None

#### GET /government/messages
- **Controller:** governmentMessageController.js `getAllMessages` (line 73)
- **Auth:** authenticate → requireRole('government')
- **Query params:** `limit` (default 20), `offset` (default 0), `direction` (sent/received)
- **Success 200:**
  ```json
  {
    "messages": [...],
    "total": 87,
    "unreadCount": 4
  }
  ```
- **Side effects:** None
- **Transactions:** None

#### GET /government/messages/:id
- **Controller:** governmentMessageController.js `getMessageById` (line 126)
- **Auth:** authenticate → requireRole('government')
- **Params:** `id`
- **Success 200:** Full message object including any replies
- **Behavior:** Automatically marks message as read if caller is the recipient (`isRead = true`)
- **Errors:** 404 `"Message not found"`, 403 if caller not sender or recipient
- **Side effects:** Sets `isRead = true`, `readAt = NOW()` on recipient's first view
- **Transactions:** None

#### POST /government/messages/:id/reply
- **Controller:** governmentMessageController.js `replyToMessage` (line 165)
- **Auth:** authenticate → requireRole('government')
- **Params:** `id` (parent message ID)
- **Body:** `{ "content": "Reply text..." }`
- **Success 201:** Created reply message linked to parent
- **Errors:**
  - 404 if parent message not found
  - 403 if caller was not part of original conversation
- **Side effects:** Creates Notification for original sender
- **Transactions:** None

#### PUT /government/messages/:id/read
- **Controller:** governmentMessageController.js `markMessageRead` (line 203)
- **Auth:** authenticate → requireRole('government')
- **Behavior:** Toggles `isRead` — if already read, marks unread; if unread, marks read
- **Success 200:** `{ "isRead": true }` or `{ "isRead": false }`
- **Errors:** 404, 403
- **Side effects:** Updates `isRead` and `readAt` fields
- **Transactions:** None

#### DELETE /government/messages/:id
- **Controller:** governmentMessageController.js `deleteMessage` (line 236)
- **Auth:** authenticate → requireRole('government')
- **Behavior:** Only sender can delete their own message
- **Success 200:** `{ "message": "Deleted" }`
- **Errors:** 404, 403 `"Only sender can delete"`
- **Side effects:** Hard delete
- **Transactions:** None

---

### AI Warning Routes

#### POST /ai-warnings/analyze
- **Controller:** aiWarningController.js `analyzeRatings` (line 22)
- **Auth:** authenticate → requireRole('admin', 'government')
- **Body:** `{ "targetType": "teacher", "targetId": 4 }` (optional; if omitted, analyzes all entities in scope)
- **Success 200:**
  ```json
  {
    "warnings": [
      {
        "type": "low_rating",
        "targetType": "teacher",
        "targetId": 4,
        "message": "Average rating below 2.5",
        "severity": "high"
      }
    ],
    "created": 2,
    "skipped": 1
  }
  ```
- **Warning types:**
  - `low_rating`: average rating < 2.5 across all reviews
  - `declining_rating`: rating drop > 0.5 in the last 30 days
  - `negative_feedback`: 3 or more reviews with 1–2 stars
- **Behavior:**
  - Calls `validateTargetExists()` (polymorphic FK guard) before analysis
  - Skips creating new warnings where unresolved warnings of same type already exist
  - Bulk-creates all new warnings in a single INSERT
  - Creates Notifications for relevant admins/teachers
- **Errors:**
  - 400 if `targetType` invalid
  - 404 if specific `targetId` not found
- **Side effects:** Inserts Warning records; inserts Notification records
- **Transactions:** Uses Sequelize transaction for bulk insert

#### GET /ai-warnings
- **Controller:** aiWarningController.js `getWarnings` (line 153)
- **Auth:** authenticate
- **Query params:** `targetType`, `targetId`, `resolved` (boolean), `limit`, `offset`
- **Success 200:**
  ```json
  {
    "warnings": [...],
    "total": 5
  }
  ```
- **Notes:** Parent role sees only warnings where `parentId = req.user.id`
- **Side effects:** None
- **Transactions:** None

#### PUT /ai-warnings/:id/resolve
- **Controller:** aiWarningController.js `resolveWarning` (line 237)
- **Auth:** authenticate → requireRole('admin', 'government')
- **Params:** `id`
- **Body:** `{ "resolutionNote": "Spoke with teacher, issue addressed" }` (optional)
- **Success 200:** Updated warning with `isResolved = true`
- **Errors:** 404 `"Warning not found"`, 403 if out of scope
- **Side effects:** Sets `isResolved = true`, `resolvedAt = NOW()`, `resolvedBy = req.user.id`
- **Transactions:** None

#### POST /ai-warnings/:id/notify
- **Controller:** aiWarningController.js `notifyUsers` (line 268)
- **Auth:** authenticate → requireRole('admin', 'government')
- **Params:** `id` (warning ID)
- **Body:** `{ "userIds": [4, 7, 10] }` (list of users to notify)
- **Success 200:** `{ "notified": 3, "skipped": 0 }`
- **Behavior:**
  - Uses a deduped `notifiedUsers` Set to prevent duplicate notifications per user per warning
  - Only creates notifications for userIds not already in `notifiedUsers`
- **Errors:** 404 if warning not found
- **Side effects:** Inserts Notification records for each newly notified user
- **Transactions:** None

---

### Teacher Resource Routes

#### GET /resources
- **Controller:** teacherResourceController.js `getResources` (line 11)
- **Auth:** authenticate → requireTeacher
- **Query params:** `type` (optional: music/video/recommendation), `isActive` (optional boolean)
- **Success 200:**
  ```json
  {
    "resources": [
      {
        "id": 1, "title": "Phonics Video", "type": "video",
        "url": "https://...", "isActive": true
      }
    ]
  }
  ```
- **Notes:** Always scoped by `schoolId`; inactive resources (`isActive = false`) excluded by default
- **Errors:** 500 on DB failure
- **Side effects:** None
- **Transactions:** None

#### POST /resources
- **Controller:** teacherResourceController.js `createResource` (line 52)
- **Auth:** authenticate → requireTeacher
- **Body (multipart/form-data):**
  ```
  title: "Phonics Video"
  type: "video"
  file: <binary>     (optional — either file or url required)
  url: "https://..." (optional — either file or url required)
  ```
- **Success 201:** Created resource object
- **Errors:**
  - 400 `"Title and type are required"`
  - 400 `"Invalid type"` — VALID_TYPES = `['music', 'video', 'recommendation']`
  - 400 `"Either file or url is required"`
  - 415 if file MIME type fails magic-byte validation (via `file-type` library)
  - 413 if file exceeds 100MB limit
- **Side effects:** Uploads file to Appwrite storage if file provided; normalizes URL format if URL provided
- **Transactions:** None

#### DELETE /resources/:id
- **Controller:** teacherResourceController.js `deleteResource`
- **Auth:** authenticate → requireTeacher
- **Params:** `id`
- **Success 200:** `{ "message": "Resource deleted" }`
- **Errors:** 404, 403 if not resource owner
- **Side effects:** Calls Appwrite SDK `deleteFile()` if resource has Appwrite fileId
- **Transactions:** None

---

## Section 3 — Frontend Page Detail Supplement

This section provides expanded detail blocks for all pages across the four frontend apps. Each entry covers component hierarchy, state management, API calls, conditional UI, loading/empty/error/populated states, user interactions, and key line references.

---

### Admin App Pages

#### admin/src/pages/Dashboard.jsx
- **Component:** `Dashboard`
- **State:**
  - `stats` — aggregated counts object (receptions, teachers, parents, children, activities, meals)
  - `loading` — boolean, initially true
  - `error` — string or null
- **API calls (line 39 useEffect):**
  - `Promise.allSettled([api.get('/admin/statistics'), api.get('/admin/school-ratings')])`
  - Each promise has `.catch(() => null)` so partial failure still renders available data
  - School ratings merged into stats object after settlement
- **Loading state:** Full-page `<LoadingSpinner size="lg" />` centered in `min-h-[400px]`
- **Error state:** Red error paragraph if ALL calls fail; partial failures silently show 0 for missing counts
- **Populated state:** Grid of stat cards (receptions, teachers, parents, children) + school ratings list
- **Empty state:** Stat cards render with 0 values; no special "empty" UI
- **Conditional UI:**
  - School ratings section only renders if `stats.schoolRatings.length > 0`
  - `StaleIndicator` component shown if any parallel call had an error (data may be partial)
- **Navigation:** No navigation from this page; it is the landing page

#### admin/src/pages/ReceptionManagement.jsx
- **Component:** `ReceptionManagement`
- **State:**
  - `receptions` — array from API
  - `loading` — boolean
  - `showCreateModal` — boolean
  - `showEditModal` — boolean
  - `selectedReception` — reception object for editing
  - `formData` — form field values
  - `showPassword` / `showConfirmPassword` — Eye/EyeOff toggle booleans
  - `confirmDialog` — object `{ message, onConfirm }` or null
  - `documentDialog` — controls document approval/rejection modal
- **API calls:**
  - `GET /admin/receptions` on mount
  - `POST /admin/receptions` on create submit
  - `PUT /admin/receptions/:id` on edit submit
  - `DELETE /admin/receptions/:id` on delete confirm
  - `POST /admin/receptions/:id/activate` / `POST .../deactivate` via toggle buttons
  - `POST /admin/receptions/:id/documents/:docType/approve` / `.../reject` via document modal
- **Loading state:** `<LoadingSpinner />` replaces table
- **Empty state:** Empty table with "No receptions found" row
- **Populated state:** Table with rows: name, email, phone, status badge (Active/Inactive), `documentsApproved` badge, action buttons
- **Interactions:**
  - "Add Reception" button → opens `showCreateModal`
  - Edit icon → populates `formData`, opens `showEditModal`
  - Delete icon → sets `confirmDialog`; on confirm calls DELETE
  - Activate/Deactivate toggle → calls appropriate endpoint; refreshes list
  - Document icon → opens document status modal showing each doc type with approve/reject buttons
- **Conditional UI:**
  - Password field shows Eye icon to toggle visibility
  - "Documents Approved" badge green when `documentsApproved === true`
  - Activate button shown when `isActive === false`; Deactivate shown when `isActive === true`

#### admin/src/pages/TeacherManagement.jsx
- **Component:** `TeacherManagement`
- **State:**
  - `teachers` — array from API
  - `loading` — boolean
  - `search` — string for client-side filtering
  - `selectedTeacher` — teacher for ratings panel
  - `showRatingsPanel` — boolean
  - `ratingData` — ratings for selected teacher
- **API calls:**
  - `GET /admin/teachers` on mount
  - `GET /teacher/ratings?teacherId=:id` when ratings panel opened
- **Populated state:** Grid of teacher cards with name, email, rating stars, group
- **Interactions:**
  - Search input filters `teachers` array client-side by name
  - "View Ratings" button → sets `selectedTeacher`, fetches ratings, shows slide-out panel
  - Ratings panel shows star distribution, recent comments, average score
- **Conditional UI:**
  - Ratings panel `ratingData` slide-out on right side; `showRatingsPanel` controls visibility
  - Empty ratings panel shows "No ratings yet" message

#### admin/src/pages/ParentManagement.jsx
- **Component:** `ParentManagement` (read-only for admin)
- **State:** `parents`, `loading`, `search`
- **API calls:** `GET /admin/parents` on mount
- **Populated state:** Table with parent name, email, children count, assigned teacher
- **Interactions:** Search filters client-side; click row → navigates to parent detail (if route exists)
- **Conditional UI:** Shows "No parents found" if empty after search

#### admin/src/pages/GroupManagement.jsx
- **Component:** `GroupManagement`
- **State:** `groups`, `loading`, `search`
- **API calls:** `GET /admin/groups` (or via reception endpoint scoped to admin) on mount
- **Notes (line 21):** Read-only for admin role; admin cannot create/edit/delete groups (reception manages groups)
- **Populated state:** Table listing group name, teacher, capacity, current parentCount
- **Interactions:** Client-side search by group name or teacher name
- **Conditional UI:** Action buttons (edit/delete) hidden for admin role

#### admin/src/pages/SchoolRatings.jsx
- **Component:** `SchoolRatings`
- **Data source (line 7):** `useFetch('/admin/school-ratings')`
- **Loading state:** `<LoadingSpinner />` in centered container
- **Error state:** `<p className="text-red-500">{error}</p>`
- **Empty state:** Card with message "No school ratings yet"
- **Populated state:**
  - Summary card with overall average rating
  - List of schools sorted by average rating DESC
  - Each school card shows name, address, `averageRating` with star icon, `ratingsCount`
- **Interactions:** No user interactions; read-only display
- **Conditional UI:** Top 3 schools get gold/silver/bronze rank badge styling

#### admin/src/pages/UsersStats.jsx
- **Component:** `UsersStats`
- **State (line 15):**
  - `users` — from `/business/users`
  - `loading` — boolean
  - `filters` — `{ dateFrom, dateTo, role }`
  - `filteredUsers` — derived from `users` after filter application
- **API calls:** `GET /business/users` on mount; re-fetches on filter change if using server-side filtering
- **Populated state:** Table with columns: name, email, role badge, createdAt, lastLogin
- **Interactions:**
  - Date range pickers update `filters.dateFrom` / `filters.dateTo`
  - Role dropdown filters `filters.role`
  - Filters apply client-side on the `users` array
- **Conditional UI:** Role badges color-coded (teacher=purple, parent=green, admin=blue, reception=orange)

#### admin/src/pages/Profile.jsx
- **Component:** `Profile`
- **State (line 20):**
  - `profile` — admin's own user object
  - `showMessagesModal` — boolean
  - `messages` — from `/admin/messages`
  - `loading` — boolean
- **API calls:**
  - `GET /auth/me` or `/admin/profile` on mount
  - `GET /admin/messages` when messages modal opened
  - `POST /auth/logout` on logout button
- **Populated state:** Profile card with name, email, role, avatar placeholder; action buttons
- **Interactions:**
  - "Messages" button → opens `showMessagesModal` with message list
  - `<LanguageSwitcher>` component — toggles i18n language (uz/ru/en)
  - "Logout" button → calls logout API, clears cookies, redirects to `/login`
- **Conditional UI:**
  - Unread message count badge on Messages button
  - Messages modal shows conversation threads

#### admin/src/pages/Settings.jsx
- **Component:** `Settings`
- **Notes:** Contains sub-components for different settings categories; similar structure to reception Settings

---

### Teacher App Pages

#### teacher/src/pages/Dashboard.jsx
- **Component:** `Dashboard`
- **State (line 17):**
  - `loading` — boolean, shows `<SkeletonDashboard />` while true
  - `stats` — `{ parentCount, childCount, activityCount, mealCount, mediaCount }`
  - `children` — array of children for the teacher
  - `selectedChild` — for child-specific stat display
- **API calls (useEffect):**
  - `GET /teacher/dashboard` for aggregate counts
  - `GET /teacher/parents` for parent/child list
- **Loading state:** `<SkeletonDashboard />` component — renders grey pulsing placeholder cards
- **Populated state:**
  - Five stat cards: Parents, Children, Activities, Meals, Media (each with icon and count)
  - Recent activity feed below stat cards (if implemented)
- **Empty state:** Stat cards with 0 counts; no special empty UI
- **Interactions:** Stat cards are non-interactive; clicking children may filter activity list
- **Conditional UI:** "Add Activity" quick-action only shown for `isTeacher` role

#### teacher/src/pages/Activities.jsx
- **Component:** `Activities` (lines 1–294)
- **Sub-components:** `ActivityCard`, `ActivityDetailsModal`, `ActivityFormModal`
- **State:**
  - `activities` — array from API
  - `loading` — boolean
  - `showModal` — create/edit form modal
  - `editingActivity` — activity object or null
  - `confirmDialog` — delete confirmation state
  - `formData` — full form object (parentId, childId, teacher, skill, goal, startDate, endDate, tasks[], methods, progress, observation, services[])
  - `parents` — fetched parent list for form select
  - `children` — derived from selected parent
  - `selectedActivity` / `showDetailsModal` — for details view
- **API calls:**
  - `GET /activities` on mount and after mutations
  - `GET /teacher/parents` on create/edit modal open
  - `POST /activities` on create submit
  - `PUT /activities/:id` on edit submit
  - `DELETE /activities/:id` on delete confirm
- **Loading state:** `<LoadingSpinner size="lg" />` in `h-96` centered container
- **Empty state:** Dashed border card with `<FileX>` icon and "No activities" text
- **Populated state:** Responsive grid — 1 col on mobile, 2 on lg, 3 on xl
- **Form interactions:**
  - Parent select → triggers `loadChildrenForParent()` cascade → populates Child select
  - Dynamic tasks array — "+" button adds new text input; individual delete icon per task
  - Services multi-select (checkboxes or tags)
  - Date pickers for startDate/endDate with today's date default
- **Conditional UI:**
  - "Add Activity" button only shown when `isTeacher` is true
  - Edit/Delete buttons on cards only shown when `isTeacher`
  - Form `teacher` field pre-filled from `user.firstName + user.lastName`

#### teacher/src/pages/Meals.jsx
- **Component:** `Meals`
- **State (line 27):**
  - `meals` — array from API
  - `loading` — boolean
  - `selectedDate` — date string for filter (default today)
  - `showModal` — create/edit modal
  - `editingMeal` — meal object or null
  - `formData` — meal form fields
  - `confirmDialog` — delete confirmation
- **API calls:**
  - `GET /meals?date=:selectedDate` on mount and on date change
  - `POST /meals` on create submit
  - `PUT /meals/:id` on edit submit
  - `DELETE /meals/:id` on delete confirm
- **Loading state:** `<LoadingSpinner />` centered
- **Empty state:** Message "No meals recorded for this date"
- **Populated state:** Cards or rows per meal showing mealType icon, child name, ate status, note
- **Interactions:**
  - Date picker (HTML `<input type="date">`) updates `selectedDate`, triggers re-fetch
  - mealType icons: breakfast=sun, lunch=cloud-sun, dinner=moon, snack=cookie
  - "Add Meal" button → opens create modal
  - Edit/Delete icons on each card
- **Conditional UI:** mealType badge color varies by type; `ate=true` shows green checkmark, `ate=false` shows red X

#### teacher/src/pages/Media.jsx
- **Component:** `Media`
- **State:**
  - `mediaItems` — array
  - `loading` — boolean
  - `showUploadModal` — boolean
  - `formData` — upload fields (childId, title, file)
  - `confirmDialog` — delete confirm
  - `selectedMedia` / `showPreviewModal` — lightbox preview
- **API calls:**
  - `GET /media` on mount
  - `POST /media/upload` (multipart) on upload submit
  - `DELETE /media/:id` on delete confirm
- **Loading state:** Grid of skeleton placeholders
- **Empty state:** "No media uploaded yet" message with camera icon
- **Populated state:** Masonry-style grid of thumbnails/icons with child name and date
- **Interactions:**
  - File input accepts image/video/audio
  - Click thumbnail → opens preview modal/lightbox
  - Delete button → confirms then deletes from Appwrite + DB
- **Conditional UI:** Video items show play icon overlay; audio items show waveform icon; image items show thumbnail via proxy URL

#### teacher/src/pages/Chat.jsx
- **Component:** `Chat` (line 11)
- **State:**
  - `conversations` — list of chat threads
  - `selectedConversation` — active conversation ID
  - `messages` — array for active conversation
  - `newMessage` — input draft
  - `loading` — boolean
  - `editingMessage` — message object or null
  - `socket` — Socket.io connection ref
- **API calls (via chatStore service):**
  - `GET /chat/conversations` on mount
  - `GET /chat/messages/:conversationId` on conversation select
  - `POST /chat/messages` on send
  - `PUT /chat/messages/:id` on edit submit
  - `DELETE /chat/messages/:id` on delete
  - `PUT /chat/messages/:conversationId/read` on conversation open
- **Real-time:** Socket.io `chat:message` event appends to `messages`; `chat:messageUpdated` / `chat:messageDeleted` patches state
- **Loading state:** Spinner while loading conversation list or messages
- **Empty state (no conversations):** "No conversations yet" in sidebar
- **Empty state (no messages):** "Start the conversation" placeholder in message area
- **Populated state:** Left sidebar with conversation list; right area with message bubbles
- **Interactions:**
  - Click conversation in sidebar → loads messages, marks as read
  - Type in input + Enter or Send button → POST new message
  - Hover message → shows edit/delete icons (only for own messages)
  - Edit icon → puts message content into editing mode
  - Scroll reaches top → load older messages (pagination with `before` cursor)
- **Scroll behavior:** `scrollToBottom()` called after new message appended
- **Conditional UI:** Own messages on right (blue), others on left (grey); edited messages show "(edited)" label

#### teacher/src/pages/MonitoringJournal.jsx
- **Component:** `MonitoringJournal` (line 19)
- **State:**
  - `records` — array of emotional monitoring records
  - `loading` — boolean
  - `showModal` — create/edit modal
  - `editingRecord` — record or null
  - `pendingDeleteId` — ID awaiting confirmation
  - `selectedChild` — filter by child
  - `formData` — includes `emotionalState` object with 9 boolean fields
- **API calls:**
  - `GET /emotional-monitoring` on mount (filtered by `childId` if selected)
  - `POST /emotional-monitoring` on create
  - `PUT /emotional-monitoring/:id` on edit
  - `DELETE /emotional-monitoring/:id` on delete confirm
- **Loading state:** Spinner
- **Empty state:** "No monitoring records" with journal icon
- **Populated state:** Timeline-style list of records; each shows date, child name, checked emotional state icons, note
- **Interactions:**
  - 9 checkboxes in form: happy, sad, angry, anxious, calm, excited, tired, focused, withdrawn
  - Date picker with today's default
  - Delete icon sets `pendingDeleteId`; confirm dialog calls DELETE
- **Conditional UI:** Emotional state chips shown as colored tags; positive states (happy, calm, focused, excited) in green; negative states in red/orange

#### teacher/src/pages/TherapyManagement.jsx
- **Component:** `TherapyManagement`
- **State:**
  - `therapies` — array
  - `loading` — boolean
  - `showModal` — create/edit modal
  - `selectedTherapy` — for session management
  - `showSessionModal` — start/end session modal
  - `activeFilter` — 'all' | 'active' | 'inactive'
- **API calls:**
  - `GET /therapies` on mount (with `isActive` filter from `activeFilter`)
  - `POST /therapies` on create
  - `PUT /therapies/:id` on edit
  - `POST /therapies/:id/start` on start session
  - `POST /therapies/:id/end` on end session (with rating form)
  - `DELETE /therapies/:id` on deactivate
- **Loading state:** Spinner
- **Empty state:** "No therapies found" with filter context
- **Populated state:** Cards per therapy showing type, child name, therapist, status badge, session count, average rating
- **Interactions:**
  - Filter tabs (All/Active/Inactive) update `activeFilter` → re-fetch
  - "Start Session" button on active therapy card
  - "End Session" button + star rating form submission
  - Edit icon → prefills form modal

---

### Parent App Pages (in teacher/src/parent/)

#### teacher/src/parent/pages/Dashboard.jsx
- **Component:** `ParentDashboard` (line 22)
- **Context:** Consumes `ChildContext` (selectedChildId) and `NotificationContext` (unreadCount)
- **State:**
  - `stats` — `{ activityCount, mealCount, mediaCount, therapyCount }`
  - `loading` — boolean
  - `recentActivity` — last 3 activities for selected child
  - `unreadNotifications` — from NotificationContext
- **API calls:**
  - `GET /activities?childId=:selectedChildId` for recent activities
  - `GET /parent/children` if no child selected yet
  - Various count endpoints
- **Real-time:** Socket.io listeners for `activity:created`, `meal:created`, `media:created` → increments respective counts; `child:updated` → refreshes child data
- **Loading state:** Skeleton cards
- **Populated state:** Welcome message with child's name; four stat cards; recent activity list
- **Conditional UI:**
  - Child selector dropdown if parent has multiple children (from ChildContext)
  - Notification bell with badge count from NotificationContext
  - "No recent activity" placeholder if recentActivity empty

#### teacher/src/parent/pages/ChildProfile.jsx
- **Component:** `ChildProfile` (line 18)
- **Sub-components:** `AvatarUploadModal`, `LogoutModal`, `MessageModal`, `MessagesModal`, `EmotionalMonitoringSection`
- **State:**
  - `child` — child object including emotional monitoring history
  - `loading` — boolean
  - `showAvatarModal` / `showLogoutModal` / `showMessageModal` / `showMessagesModal` — booleans
  - `emotionalHistory` — array of recent monitoring records
- **API calls:**
  - `GET /parent/children` on mount
  - `POST /media/upload` (multipart) when avatar selected in `AvatarUploadModal`
  - `POST /chat/messages` from `MessageModal`
  - `GET /chat/messages/parent:${parentId}` from `MessagesModal`
- **Real-time:** `child:updated` Socket.io event refreshes child data (e.g., after teacher updates child info)
- **Interactions:**
  - Avatar click → opens `AvatarUploadModal`
  - Message teacher button → `MessageModal` (send one message)
  - View all messages → `MessagesModal` (full chat history)
  - Logout button → `LogoutModal` confirmation → POST /auth/logout
- **EmotionalMonitoringSection:** Displays last 7 days of emotional states as mini icons grid

#### teacher/src/parent/pages/Activities.jsx
- **Component:** `ParentActivities`
- **State:** `activities`, `loading`, `selectedActivity`, `showDetailsModal`
- **API calls:** `GET /activities` (parent-scoped on server side)
- **Populated state:** Cards per activity with skill, goal, status badge, date range, progress notes
- **Interactions:** Click card → `showDetailsModal` with full activity details
- **Conditional UI:** Status badge color: active=green, completed=blue, pending=grey

#### teacher/src/parent/pages/Meals.jsx
- **Component:** `ParentMeals`
- **State:** `meals`, `loading`, `selectedDate`
- **API calls:** `GET /meals?date=:selectedDate` — parent-scoped (server filters by parentId)
- **Populated state:** Daily meal summary cards; each shows mealType, child, ate status, note
- **Interactions:** Date picker changes `selectedDate` → re-fetch

#### teacher/src/parent/pages/Media.jsx
- **Component:** `ParentMedia`
- **State:** `media`, `loading`, `selectedMedia`, `showPreview`
- **API calls:** `GET /media` — parent-scoped
- **Populated state:** Photo/video grid thumbnails via proxy URL
- **Interactions:** Click item → opens preview lightbox

#### teacher/src/parent/pages/Notifications.jsx
- **Component:** `Notifications` (line 18)
- **State:**
  - `notifications` — array
  - `loading` — boolean
  - `filter` — 'all' | 'unread' | 'read'
- **API calls:**
  - `GET /notifications` on mount
  - `PUT /notifications/:id/read` on individual mark-as-read
  - `PUT /notifications/read-all` on "Mark All Read" button
  - `DELETE /notifications/:id` on individual delete
- **Loading state:** Spinner
- **Empty state:** "No notifications" with bell-off icon (varies by filter: "No unread notifications" etc.)
- **Populated state:** List of notification cards with icon (per type), title, body, relative time, unread dot
- **Interactions:**
  - Filter tabs (All/Unread/Read) — updates `filter`, filters array client-side
  - Click notification card → marks as read via API
  - "Mark All Read" button → calls read-all endpoint
  - Delete (X) button per notification → DELETE endpoint
- **Per-type icons:** activity=clipboard, meal=utensils, media=image, therapy=heart-pulse, general=bell
- **Conditional UI:** Unread notifications have blue left border and darker background

#### teacher/src/parent/pages/TeacherRating.jsx
- **Component:** `TeacherRating` (line 9)
- **State:**
  - `teacherRating` — existing teacher rating or null
  - `schoolRating` — existing school rating or null
  - `teacherFormData` — `{ rating: 0, comment: '' }`
  - `schoolFormData` — `{ schoolName: '', rating: 0, comment: '' }`
  - `allRatings` — array of all ratings for display
  - `loading` — boolean
  - `submitting` — boolean
- **API calls:**
  - `GET /parent/teacher-ratings/my` on mount
  - `GET /parent/school-ratings/my` on mount
  - `GET /parent/schools` on mount (for school name input autocomplete)
  - `POST /parent/teacher-ratings` or `PUT .../teacher-ratings/:id` on teacher rating submit
  - `POST /parent/school-ratings` or `PUT .../school-ratings/:id` on school rating submit
- **Populated state:**
  - Two side-by-side forms: Teacher Rating card + School Rating card
  - Star selector (1–5 click) for each form
  - Comment textarea
  - "All Ratings" section below showing received teacher ratings
- **Conditional UI:**
  - If `teacherRating` exists, form shows current rating pre-filled and button says "Update"
  - If not rated, button says "Submit Rating"
  - Same logic for school rating

#### teacher/src/parent/pages/Therapy.jsx
- **Component:** `ParentTherapy` (line 19)
- **State:**
  - `therapies` — array
  - `loading` — boolean
  - `activeFilter` — 'all' | 'active' | 'completed'
  - `selectedTherapy` — for session detail view
  - `sessionRating` — star value for feedback
  - `showFeedbackModal` — boolean
- **API calls:**
  - `GET /therapies` (parent-scoped) on mount
  - `GET /therapies/:id/usage` when session detail opened
- **Populated state:** Cards per therapy with type icon, therapist name, session count, duration, average rating stars
- **Interactions:**
  - Filter tabs update `activeFilter` → client-side filter on `therapies` array
  - Click card → shows usage details in `selectedTherapy` panel
  - Star feedback form in `showFeedbackModal` (read-only for parent, no POST)
- **Conditional UI:** Active sessions show green "Active" badge; completed show grey "Completed" badge

#### teacher/src/parent/pages/AIChat.jsx
- **Component:** `AIChat` (line 8)
- **State:**
  - `messages` — chat message history array
  - `input` — current user input
  - `loading` / `submitting` — booleans
  - `sessionMessages` — last 8 messages sent as context to AI backend
- **API calls:**
  - `GET /ai-chat/history` on mount (if endpoint exists)
  - `POST /ai-chat/message` on send — includes `{ message, context: sessionMessages.slice(-8) }`
- **Loading state (initial):** Spinner
- **Submitting state:** Bot typing indicator (animated dots)
- **Populated state:** Chat bubble UI; User messages on right with User icon; Bot messages on left with Bot/AI icon
- **Interactions:**
  - Type in input → Enter or Send button → optimistic append of user message to `messages`
  - AI response appended on POST resolve
  - Scroll-to-bottom on new message
- **Conditional UI:** Error response from AI shows red error bubble

#### teacher/src/parent/pages/Chat.jsx
- **Component:** `ParentChat`
- **Notes:** Same structure as teacher Chat.jsx but conversation list is limited to the single teacher conversation (`parent:{parentId}`)
- **State:** `messages`, `newMessage`, `loading`, `editingMessage`
- **API calls:** Same chat endpoints as teacher chat but scoped to single conversation
- **Conditional UI:** No conversation list sidebar (parent only has one teacher); full-width message area

---

### Reception App Pages

#### reception/src/pages/Dashboard.jsx
- **Component:** `ReceptionDashboard` (line 16)
- **State:**
  - `stats` — counts from parallel calls
  - `loading` — boolean
  - `stale` — boolean (true if any parallel call failed)
- **API calls:**
  ```js
  Promise.allSettled([
    api.get('/reception/teachers'),
    api.get('/reception/parents'),
    api.get('/reception/groups')
  ])
  ```
  Each `.value` used if `status === 'fulfilled'`; `stale` set if any `status === 'rejected'`
- **Loading state:** Skeleton cards
- **Stale state:** `StaleIndicator` banner "Data may be incomplete"
- **Populated state:** Three stat cards: Teachers, Parents, Groups with counts
- **Navigation:** Quick-action buttons linking to TeacherManagement, ParentManagement, GroupManagement

#### reception/src/pages/ParentManagement.jsx
- **Component:** `ParentManagement` (line 12)
- **Sub-components:** `ParentCard`, `ParentFormModal`, `ChildFormModal`
- **State:**
  - `parents` — array
  - `loading` — boolean
  - `showCreateModal` / `showEditModal` / `showChildModal` — booleans
  - `selectedParent` — for edit / child add
  - `teachers` — for teacher select in form
  - `groups` — for group select (filtered by selected teacher)
  - `formData` — parent form fields + multipart avatar file
  - `childFormData` — child form fields
  - `confirmDialog` — delete confirm
- **API calls:**
  - `GET /reception/parents` on mount
  - `GET /reception/teachers` for form teacher select
  - `GET /reception/groups?teacherId=:id` on teacher select change (cascading)
  - `POST /reception/parents` (multipart/form-data) on create
  - `PUT /reception/parents/:id` on edit
  - `DELETE /reception/parents/:id` on delete confirm
  - `POST /reception/parents/:id/children` on child add
- **Loading state:** Table skeleton
- **Empty state:** Empty table with "No parents registered" row
- **Populated state:** Table with parent name, email, phone, children count, teacher, group, status
- **Form cascade:** Teacher select → triggers `GET /reception/groups?teacherId=x` → updates Group select options
- **Conditional UI:** Avatar preview if file selected; password fields with Eye toggle

#### reception/src/pages/TeacherManagement.jsx
- **Component:** `TeacherManagement` (line 24)
- **State:**
  - `teachers` — array
  - `loading` — boolean
  - `search` — string
  - `showCreateModal` / `showEditModal` — booleans
  - `formData` — teacher fields
  - `selectedTeacher` — for ratings panel
  - `ratingData` — ratings for selected teacher
  - `showRatingsPanel` — boolean
- **API calls:**
  - `GET /reception/teachers` on mount
  - `GET /teacher/ratings?teacherId=:id` on ratings panel open
  - `POST /reception/teachers` on create
  - `PUT /reception/teachers/:id` on edit
  - `DELETE /reception/teachers/:id` on delete
- **Populated state:** Grid of teacher cards with name, email, group, rating stars
- **Interactions:**
  - "View Ratings" button → slide-out ratings panel
  - Edit/Delete icons per card

#### reception/src/pages/GroupManagement.jsx
- **Component:** `GroupManagement` (line 18)
- **State:**
  - `groups` — array
  - `teachers` — for teacher select in form
  - `loading` — boolean
  - `showModal` — create/edit
  - `editingGroup` — group or null
  - `formData` — `{ name, teacherId, capacity, ageRange }`
  - `confirmDialog` — delete confirm
- **API calls:**
  - `GET /reception/groups` on mount
  - `GET /reception/teachers` for form teacher select
  - `POST /reception/groups` on create
  - `PUT /reception/groups/:id` on edit
  - `DELETE /reception/groups/:id` on delete
- **Populated state:** Cards per group showing name, teacher name, capacity, ageRange, parentCount
- **Interactions:**
  - "Add Group" → create modal
  - Edit icon → prefills form with group data
  - Delete icon → confirmDialog
- **Conditional UI:** Capacity near-full warning (e.g., red when parentCount >= capacity)

#### reception/src/pages/Settings.jsx
- **Component:** `Settings` (line 15)
- **Sub-components:** Five sub-sections for different settings categories (Profile, Password, Notifications, Language, School Info)
- **State:** Per-sub-component form state; `activeTab` — which section is shown
- **API calls:**
  - `GET /auth/me` on mount for current profile data
  - `PUT /reception/profile` on profile save
  - `PUT /auth/change-password` on password save
  - `GET /reception/messages` for messages notification settings
- **Tabs:** Profile | Password | Notifications | Language | School Info
- **Interactions:**
  - Tab navigation updates `activeTab`
  - Save buttons per section submit respective form data
  - `<LanguageSwitcher>` component in Language tab

---

### Government App Pages

#### government/src/pages/Dashboard.jsx
- **Component:** `GovernmentDashboard` (line 18)
- **State:**
  - `overview` — stats from `/government/overview`
  - `schools` — from `/government/schools`
  - `ratings` — from `/government/ratings`
  - `loading` — boolean
  - `stale` — boolean
  - `filters` — `{ region, district, schoolId }`
- **API calls:**
  ```js
  Promise.allSettled([
    api.get('/government/overview'),
    api.get('/government/schools'),
    api.get('/government/ratings')
  ])
  ```
- **Loading state:** Skeleton stat cards
- **Stale state:** `<StaleIndicator />` banner when any call fails
- **Populated state:**
  - Row of 6 stat cards (schools, teachers, parents, children, activities, avgRating)
  - Top schools list with ratings
  - Region/district filter dropdowns
- **Interactions:**
  - Region filter → updates `filters.region` → re-fetches with query param
  - District filter → updates `filters.district` → re-fetches
- **Conditional UI:** StaleIndicator only shown when `stale === true`

#### government/src/pages/Schools.jsx
- **Component:** `Schools` (already read — full content known)
- **Data source:** `useFetch('/government/schools')`
- **Loading state:** Centered `<LoadingSpinner size="lg" />` with `role="status"` aria label
- **Error state:** Red paragraph with error string
- **Empty state:** Card with `<Building2>` icon, "Muassasalar topilmadi" text
- **Populated state:**
  - Global stats: 2-column grid (total schools count, total reviews count)
  - Schools grid (1 col mobile, 2 md, 3 lg) sorted by `averageRating DESC`, then `ratingsCount DESC`
  - Each card: rank badge (gold/silver/bronze/blue for top 3), building icon, name, address, studentsCount, ratingsCount, averageRating with star icon
- **Rank badge styles:** rank 1 = `bg-yellow-100 border-yellow-400`, rank 2 = `bg-gray-100 border-gray-400`, rank 3 = `bg-orange-100 border-orange-400`, rank 4+ = `bg-primary-100`
- **Interactions:** Read-only; no user interactions
- **Accessibility:** `role="list"` on grid, `role="listitem"` per card, `role="region"` on stats section

#### government/src/pages/Teachers.jsx
- **Component:** `Teachers` (already read)
- **Data source:** `useFetch('/government/teachers?limit=100&page=1')`
- **Loading state:** Centered spinner
- **Error state:** Red error paragraph
- **Empty state:** Card with `<GraduationCap>` icon, "O'qituvchilar topilmadi"
- **Populated state:**
  - Single stat card showing total teacher count
  - Grid (1/2/3 cols) of teacher cards: purple `<GraduationCap>` icon, name, email with `<Mail>` icon, optional phone with `<Phone>` icon
- **Interactions:** Read-only

#### government/src/pages/Students.jsx
- **Component:** `Students` (already read)
- **Data source:** `useFetch('/government/students?limit=100&page=1')`
- **Loading state:** Centered spinner
- **Error state:** Red error paragraph
- **Empty state:** Card with `<Users>` icon, "O'quvchilar topilmadi"
- **Populated state:**
  - Single stat card showing total count
  - Grid (1/2/3 cols) of student cards: green `<User>` icon, name, school name (schoolName || school), parentName, optional dateOfBirth
- **Interactions:** Read-only

#### government/src/pages/Parents.jsx
- **Component:** `Parents` (line 10)
- **Constants:** `PAGE_SIZE = 20`
- **State:**
  - `data` — from useFetch or api.get
  - `page` — current page number
  - `search` — search string
- **API calls:** `GET /government/parents?limit=20&page=:page&search=:search`
- **Loading state:** Spinner
- **Empty state:** "No parents found"
- **Populated state:**
  - Stat card with total parent count
  - Grid of parent cards with name, email, children count
  - Pagination controls: Prev / Page N of M / Next
- **Interactions:**
  - Prev/Next buttons update `page` → re-fetch
  - Search input updates `search` → debounced re-fetch or client-side filter

#### government/src/pages/Ratings.jsx
- **Component:** `Ratings`
- **State:**
  - `ratings` — array of school rating objects
  - `loading` — boolean
  - `expandedSchool` — schoolId or null (expand/collapse school detail)
- **API calls:** `GET /government/ratings` (or `/government/schools` with ratings data)
- **Loading state:** Spinner
- **Empty state:** "No ratings available"
- **Populated state:**
  - Per-school expandable card
  - Star rating display with `StarDisplay` component (supports half-stars)
  - `DistributionBar` component per star (1–5): shows percentage bar for each star count
  - STAR_COLORS map: 5=green, 4=lime, 3=yellow, 2=orange, 1=red
- **Interactions:**
  - Click school card header → toggle `expandedSchool` (expand/collapse distribution bars)
- **Conditional UI:** Expanded school shows DistributionBar breakdown; collapsed shows only average + count

#### government/src/pages/Platform.jsx
- **Component:** `Platform` (line 15)
- **State:**
  - `activeTab` — 'overview' | 'admins' | 'schools' | 'credentials' | 'messages'
  - Per-tab `loading` states (each tab loads data independently)
  - `admins` — admin user list
  - `schools` — school list
  - `approvedCredentials` — object with `setPasswordUrl` for newly created users
  - `showCredentialsModal` — boolean
  - `messages` — government messages
- **API calls (lazy per tab):**
  - Tab "admins": `GET /admin/admins`
  - Tab "schools": `GET /government/schools`
  - Tab "credentials": `GET /auth/credentials` (pending accounts)
  - Tab "messages": `GET /government/messages`
  - `POST /admin/admins` on create admin
  - `DELETE /admin/admins/:id` on delete admin
- **Loading state:** Per-tab spinner inside tab panel
- **Populated state (admins tab):** Table of admin users with edit/delete; "Add Admin" button
- **Populated state (credentials tab):** List of pending users; "Create Account" generates credentials and shows `setPasswordUrl` in modal
- **Interactions:**
  - Tab bar — 5 tabs; click switches `activeTab`, lazy-loads that tab's data if not yet fetched
  - Credentials tab: `approvedCredentials.setPasswordUrl` shown in copy-to-clipboard modal after creation
- **Conditional UI:** `showCredentialsModal` shows one-time credential display after account creation

#### government/src/pages/AdminDetails.jsx
- **Component:** `AdminDetails`
- **State:** `admin` — single admin object with receptions and statistics
- **API calls:** `GET /admin/admins/:id` with nested data
- **Populated state:** Admin profile card; nested receptions list; statistics breakdown
- **Interactions:** Edit button → inline edit form or modal

#### government/src/pages/Profile.jsx
- **Component:** `GovernmentProfile`
- **State:** `profile`, `loading`, `showMessagesModal`, `messages`
- **API calls:**
  - `GET /auth/me` on mount
  - `GET /government/messages` when messages modal opened
  - `POST /auth/logout` on logout
- **Populated state:** Profile card with government user info; region/district fields
- **Interactions:**
  - "Messages" button → `showMessagesModal` with government message threads
  - `<LanguageSwitcher>` for i18n
  - "Logout" → clears session, redirects to `/login`
- **Conditional UI:** Unread message badge on Messages button

---

*End of Section 3 — Frontend Page Detail Supplement*

---

*Updated E2E Test Inventory — Total coverage: ~120 backend API endpoints with full detail blocks, 45+ frontend pages across 4 apps, 12 cross-role flows, 22 configuration variables, 30 priority test gaps.*
