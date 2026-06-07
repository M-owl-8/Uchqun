# Beta Feature-Coverage Matrix
**S14 / BETA-VERIFICATION — STEP 0**
**Matrix date:** 2026-06-08
**Status:** PRE-TESTING CONTRACT — verdicts filled in during Waves 1–6

---

## Testing Configuration

| Item | Value |
|---|---|
| Government portal | https://government-production.up.railway.app |
| Admin portal | https://admin-production-536f.up.railway.app |
| Reception portal | https://reception-production-ba41.up.railway.app |
| Teacher / Parent portal | https://teacher-production-0647.up.railway.app |
| Backend API | https://uchqun-production-b484.up.railway.app |
| Credentials source | `credentials.md` (never printed here) |
| Browser | Playwright Chromium — real headed browser |
| Staff viewport | 1280×800 desktop |
| Parent viewport | 390×844 mobile |
| Teacher 390px repeat | teacher1 (S1) + teacher3 (S2) — full Wave 2 day repeated at 390px |

---

## Account Registry

| Account | Role | School | Region | Wave |
|---|---|---|---|---|
| gov.republic | Government / republic-main | — | All | Wave 6 |
| gov.toshkent | Government / region-main | — | Region 01 (Toshkent) | Wave 5 |
| gov.samarqand | Government / region-main | — | Region 02 (Samarqand) | Wave 5 |
| admin1 | Admin | S1 Toshkent MM 1 | R01 | Wave 4 |
| admin2 | Admin | S2 Toshkent MM 2 | R01 | Wave 4 |
| admin3 | Admin | S3 Samarqand MM 1 | R02 | Wave 4 |
| admin4 | Admin | S4 Samarqand MM 2 | R02 | Wave 4 |
| reception1 | Reception | S1 | R01 | Wave 1 |
| reception2 | Reception | S2 | R01 | Wave 1 |
| reception3 | Reception | S3 | R02 | Wave 1 |
| reception4 | Reception | S4 | R02 | Wave 1 |
| teacher1 | Teacher | S1 (Zulfiya Nazarova) | R01 | Wave 2 + 390px |
| teacher2 | Teacher | S1 (Doniyor Ergashev) | R01 | Wave 2 |
| teacher3 | Teacher | S2 (Feruza Normatova) | R01 | Wave 2 + 390px |
| teacher4 | Teacher | S2 (Sardor Toshpulatov) | R01 | Wave 2 |
| teacher5 | Teacher | S3 (Shahnoza Ergasheva) | R02 | Wave 2 |
| teacher6 | Teacher | S3 (Erkin Nazarov) | R02 | Wave 2 |
| teacher7 | Teacher | S4 (Maftuna Aliyeva) | R02 | Wave 2 |
| teacher8 | Teacher | S4 (Akbar Pulatov) | R02 | Wave 2 |
| parent1 | Parent | S1 (Hulkar Sobirova) | R01 | Wave 3 |
| parent2 | Parent | S1 (Dilorom Tursunova) | R01 | Wave 3 |
| parent3 | Parent | S1 (Jasur Qodirov) | R01 | Wave 3 |
| parent4 | Parent | S2 (Kamola Hasanova) | R01 | Wave 3 |
| parent5 | Parent | S2 (Lobar Mirzayeva) | R01 | Wave 3 |
| parent6 | Parent | S2 (Mansur Rahimov) | R01 | Wave 3 |
| parent7 | Parent | S3 (Nafosatoy Hamidova) | R02 | Wave 3 |
| parent8 | Parent | S3 (Ozoda Karimova) | R02 | Wave 3 |
| parent9 | Parent | S3 (Pahlavon Ergashev) | R02 | Wave 3 |
| parent10 | Parent | S4 (Rano Yusupova) | R02 | Wave 3 |
| parent11 | Parent | S4 (Sanjar Qodirov) | R02 | Wave 3 |
| parent12 | Parent | S4 (Tursunoy Ahmedova) | R02 | Wave 3 |

---

## Scope Findings (Pre-Testing)

### F-001 — Teacher Count Gap (BLOCKED-SCOPE)
**Spec:** Wave 2 requires 16 teacher accounts (8 full days + 8 attendance-only).
**Reality:** Only 8 teachers seeded (teacher1–teacher8). Teachers 9–16 do not exist.
**Impact:** The "8 attendance + one content action" sub-wave is BLOCKED. Re-scoped: all 8 seeded teachers run FULL days.
**Action:** Log in BETA-DEFECTS as P1 (data gap, not a code defect — seeder needs expanding).

### F-002 — School 1 Groups Missing
**Source:** `credentials.md` — "No groups seeded for School 1."
**Impact:** teacher1, teacher2 see children via teacherId linkage (confirmed 3 children), not via group assignment. Attendance still works. Reception1 must CREATE a group during Wave 1 before child-onboarding step.
**Action:** Wave 1 reception1 creates S1 group as first step. If group creation fails → P0 finding.

### F-003 — Known Pre-existing Issues
| Code | Description | Expected verdict |
|---|---|---|
| G-050 | `canRateSchools` i18n label renders as raw key in secondary-user form | FAIL |
| G-017 | CSV school export hard-coded limit=999 | KNOWN-ISSUE (informational, not a task blocker) |
| P-011 | Parent Sidebar.jsx imported but never rendered (dead code) | FAIL |
| C-02 | Group-wide media visibility (documented intentional; needs legal sign-off) | BLOCKED-LEGAL |

---

## Legend

| Symbol | Meaning |
|---|---|
| `—` | Verdict pending — test during wave |
| `PASS` | Verified working |
| `FAIL` | Broken or incorrect output |
| `BLOCKED` | No account / data / UI path to test (with reason) |
| `KNOWN-FAIL` | Expected failure from prior audit; still must be exercised |
| `PARTIAL` | Partially testable; explain in screenshot notes |

---

## Wave 1 — Reception Portal (R-001 – R-089)

**Accounts:** reception1 (S1), reception2 (S2), reception3 (S3), reception4 (S4)
**URL:** https://uchqun-reception.netlify.app
**Scenario per school:** login → dashboard → create group (S1 only) → create child+parent via wizard → confirm new parent can log in → verify child appears in teacher's group

### Auth & Navigation (R-001 – R-011)

| ID | Feature | Account | Scenario | Pre-Assessment | Verdict | Screenshot |
|---|---|---|---|---|---|---|
| R-001 | Login with email+password | reception1, rec2, rec3, rec4 | W1: each logs in | — | | |
| R-002 | Logout | reception1 | W1: end-of-session logout | — | | |
| R-003 | Forced password change on first login | reception1 (mustChangePassword test) | W1: set to true in test, verify redirect | — | | |
| R-004 | Change password (Settings page) | reception1 | W1: Settings → change password | — | | |
| R-005 | Language switcher UZ/RU/EN | reception1 | W1: toggle language on login + sidebar | — | | |
| R-006 | Dashboard nav link | reception1 | W1: click Dashboard in sidebar | — | | |
| R-007 | Parents management nav link | reception1 | W1: click Parents in sidebar | — | | |
| R-008 | Teachers management nav link | reception1 | W1: click Teachers in sidebar | — | | |
| R-009 | Groups management nav link | reception1 | W1: click Groups in sidebar | — | | |
| R-010 | Documents management nav link | reception1 | W1: click Documents in sidebar | — | | |
| R-011 | Settings nav link | reception1 | W1: click Settings in sidebar | — | | |

### Dashboard (R-012 – R-019)

| ID | Feature | Account | Scenario | Pre-Assessment | Verdict | Screenshot |
|---|---|---|---|---|---|---|
| R-012 | School statistics (parent/teacher/group counts) | reception1–4 (all) | W1: load dashboard, verify counts match Wave-1 creates | — | | |
| R-013 | Pending documents count card | reception1 | W1: check pending docs card (may be 0) | — | | |
| R-014 | Pending parent activations card | reception1 | W1: check suspended parents card | — | | |
| R-015 | Quick-create: new parent (wizard) | reception1 | W1: click New Parent → wizard opens | — | | |
| R-016 | Quick-create: new teacher | reception1 | W1: click New Teacher → navigates | — | | |
| R-017 | Quick-create: upload documents | reception1 | W1: click Upload Documents → navigates | — | | |
| R-018 | Recent activity feed | reception1–4 | W1: verify Wave-1 registrations appear | — | | |
| R-019 | New children grid (recent registrations) | reception1–4 | W1: verify Wave-1 children appear | — | | |

### Auth & Authorization (R-020 – R-023)

| ID | Feature | Account | Scenario | Pre-Assessment | Verdict | Screenshot |
|---|---|---|---|---|---|---|
| R-020 | Reception-only role enforcement | reception1 | W1: attempt login with teacher creds → blocked | — | | |
| R-021 | Documents approval gate | reception1 | W1: verify reception1 has documentsApproved=true, can access | — | | |
| R-022 | Account active gate | reception1 | W1: verify isActive=true guard | — | | |
| R-023 | ProtectedRoute wrapper | anonymous | W1: navigate to /reception/parents without auth → redirect to /login | — | | |

### Parent Management (R-024 – R-036)

| ID | Feature | Account | Scenario | Pre-Assessment | Verdict | Screenshot |
|---|---|---|---|---|---|---|
| R-024 | List all parents | reception1–4 | W1: load Parents page, verify existing parents shown | — | | |
| R-025 | Search parents by name/email/phone | reception1 | W1: type partial name, filter confirms match | — | | |
| R-026 | Filter parents by status (active/suspended/pending) | reception1 | W1: toggle tabs Faol / Kutmoqda / To'xtatilgan | — | | |
| R-027 | View parent detail (inline table row) | reception1 | W1: verify row shows child name, status badge, date | — | | |
| R-028 | Create new parent (inline form modal) | reception2–4 | W1: create parent via modal (non-wizard path) | — | | |
| R-029 | Create parent via 3-step wizard | reception1–4 | W1 CORE: each school's reception creates 1 parent via wizard | — | | |
| R-030 | Edit parent (name, email, phone) | reception1 | W1: edit the Wave-1 created parent | — | | |
| R-031 | Delete parent | reception1 | W1: delete a test parent (not Wave-1 main) | — | | |
| R-032 | Activate parent (suspended → active) | reception1 | W1: suspend then activate a parent | — | | |
| R-033 | Suspend parent (block login) | reception1 | W1: suspend parent, verify status badge | — | | |
| R-034 | Reset parent password | reception1 | W1: reset password, verify temp password modal | — | | |
| R-035 | Bulk select parents | reception1 | W1: multi-select, verify checkboxes highlight | — | | |
| R-036 | Bulk delete parents | reception1 | W1: select 2 test parents, bulk delete | — | | |

### Children Management (R-037 – R-040)

| ID | Feature | Account | Scenario | Pre-Assessment | Verdict | Screenshot |
|---|---|---|---|---|---|---|
| R-037 | Add child to existing parent | reception1–4 | W1 CORE: add Wave-1 child to Wave-1 parent | — | | |
| R-038 | Edit child (name, DOB, disability, photo) | reception1 | W1: edit Wave-1 child fields | — | | |
| R-039 | Delete child from parent | reception1 | W1: create extra child, then delete it | — | | |
| R-040 | View child photo (avatar preview) | reception1 | W1: verify initials fallback when no photo | — | | |

### Teacher Management (R-041 – R-049)

| ID | Feature | Account | Scenario | Pre-Assessment | Verdict | Screenshot |
|---|---|---|---|---|---|---|
| R-041 | List all teachers | reception1–4 | W1: load Teachers page | — | | |
| R-042 | Search teachers | reception1 | W1: type partial name, filter | — | | |
| R-043 | Create new teacher (modal) | reception1 | W1: create a test teacher | — | | |
| R-044 | Edit teacher | reception1 | W1: edit the test teacher | — | | |
| R-045 | Delete teacher | reception1 | W1: delete the test teacher | — | | |
| R-046 | Activate teacher | reception1 | W1: suspend then activate teacher | — | | |
| R-047 | Suspend teacher | reception1 | W1: suspend a teacher, verify badge | — | | |
| R-048 | Reset teacher password | reception1 | W1: reset teacher credentials, verify temp password | — | | |
| R-049 | View teacher ratings modal | reception1–4 | W1: click teacher card, view ratings | — | | |

### Group Management (R-050 – R-055)

| ID | Feature | Account | Scenario | Pre-Assessment | Verdict | Screenshot |
|---|---|---|---|---|---|---|
| R-050 | List all groups | reception1 (empty), rec2–4 | W1: reception1 sees empty state (S1 no groups); rec2–4 see existing groups | — | | |
| R-051 | Search groups | reception2 | W1: search in S2 groups | — | | |
| R-052 | Create new group | reception1 | W1 CORE S1: create S1 group (F-002 repair) before child onboarding | — | | |
| R-053 | Edit group | reception1 | W1: edit the newly created S1 group | — | | |
| R-054 | Delete group | reception1 | W1: create extra group, then delete | — | | |
| R-055 | Assign teacher to group | reception1 | W1: assign teacher1 when creating S1 group | — | | |

### Document Management (R-056 – R-060)

| ID | Feature | Account | Scenario | Pre-Assessment | Verdict | Screenshot |
|---|---|---|---|---|---|---|
| R-056 | Upload documents (license, cert, ID, other) | reception1 | W1: upload a test PDF document | — | | |
| R-057 | View document status (approved/pending/rejected) | reception1 | W1: verify status badges per document | — | | |
| R-058 | Delete pending document | reception1 | W1: delete the test-uploaded document | — | | |
| R-059 | Approval progress card (counts) | reception1 | W1: verify approvedCount/pendingCount/rejectedCount rendered | — | | |
| R-060 | All-approved banner | reception1 | W1: if all docs approved, verify green banner | — | | |

### Profile & Settings (R-061 – R-066)

| ID | Feature | Account | Scenario | Pre-Assessment | Verdict | Screenshot |
|---|---|---|---|---|---|---|
| R-061 | View profile (name, email, phone, avatar) | reception1 | W1: navigate to Profile page | — | | |
| R-062 | Send message to government | reception1 | W1: compose and send message from Profile | — | | |
| R-063 | View government replies | reception1 | W1: open messages modal, verify thread | — | | |
| R-064 | Update profile (name, phone, notifications) | reception1 | W1: edit name, save, verify toast | — | | |
| R-065 | Notification preferences | reception1 | W1: toggle email/push prefs, save | — | | |
| R-066 | Logout from profile | reception1 | W1: click logout in profile | — | | |

### Backend Route Access (R-067 – R-089)

| ID | Feature | Account | Scenario | Pre-Assessment | Verdict | Screenshot |
|---|---|---|---|---|---|---|
| R-067 | GET /reception/parents | reception1 | Covered by R-024 (list parents) | — | | |
| R-068 | POST /reception/parents | reception1 | Covered by R-029 (wizard create) | — | | |
| R-069 | PUT /reception/parents/:id | reception1 | Covered by R-030 (edit parent) | — | | |
| R-070 | DELETE /reception/parents/:id | reception1 | Covered by R-031 (delete parent) | — | | |
| R-071 | PUT /reception/parents/:id/activate | reception1 | Covered by R-032 (activate parent) | — | | |
| R-072 | PUT /reception/parents/:id/suspend | reception1 | Covered by R-033 (suspend parent) | — | | |
| R-073 | POST /reception/parents/:id/reset-credentials | reception1 | Covered by R-034 (reset password) | — | | |
| R-074 | GET /reception/teachers | reception1 | Covered by R-041 (list teachers) | — | | |
| R-075 | POST /reception/teachers | reception1 | Covered by R-043 (create teacher) | — | | |
| R-076 | GET /reception/teachers/:id/ratings | reception1 | Covered by R-049 (ratings modal) | — | | |
| R-077 | PUT /reception/teachers/:id | reception1 | Covered by R-044 (edit teacher) | — | | |
| R-078 | DELETE /reception/teachers/:id | reception1 | Covered by R-045 (delete teacher) | — | | |
| R-079 | PUT /reception/teachers/:id/activate | reception1 | Covered by R-046 (activate teacher) | — | | |
| R-080 | PUT /reception/teachers/:id/suspend | reception1 | Covered by R-047 (suspend teacher) | — | | |
| R-081 | POST /reception/teachers/:id/reset-credentials | reception1 | Covered by R-048 (reset teacher password) | — | | |
| R-082 | GET /groups | reception1–4 | Covered by R-050 (list groups) | — | | |
| R-083 | POST /groups | reception1 | Covered by R-052 (create group) | — | | |
| R-084 | GET /reception/documents | reception1 | Covered by R-057 (view doc status) | — | | |
| R-085 | POST /reception/documents | reception1 | Covered by R-056 (upload document) | — | | |
| R-086 | DELETE /reception/documents/:id | reception1 | Covered by R-058 (delete pending doc) | — | | |
| R-087 | GET /reception/messages | reception1 | Covered by R-063 (view gov replies) | — | | |
| R-088 | POST /reception/message-to-government | reception1 | Covered by R-062 (send message to gov) | — | | |
| R-089 | Teacher-scoped routes via requireTeacher | reception1 | W1: verify GET /teacher/children returns 200 using reception1 cookie | — | | |

---

## Wave 2 — Teacher Portal (T-001 – T-116)

**Accounts:** teacher1–teacher8 (all run full day)
**390px repeat:** teacher1 (S1) and teacher3 (S2) repeat full day at mobile viewport
**URL:** https://uchqun-teacher.netlify.app
**Full day scenario:** login → dashboard → attendance (mixed statuses) → private reflection → journal per child with tag → 2 photo uploads (1 normal, 1 >5MB → error) → observation → warnings → chat to each parent → switch RU → logout

**Note:** "Other 8 teachers" sub-wave (attendance + one action) is BLOCKED per F-001.

### Auth & Onboarding (T-001 – T-007)

| ID | Feature | Account | Scenario | Pre-Assessment | Verdict | Screenshot |
|---|---|---|---|---|---|---|
| T-001 | Login with email+password | teacher1–8 (all) | W2: each teacher logs in | — | | |
| T-002 | Show/hide password toggle | teacher1 | W2: click eye icon on login page | — | | |
| T-003 | Language switcher on login page | teacher1 | W2: switch UZ→RU→EN on login | — | | |
| T-004 | Forced password change on first login | teacher1 (simulate) | W2: verify redirect gate exists | — | | |
| T-005 | Change password strength validation | teacher1 | W2: submit weak password → error | — | | |
| T-006 | JWT token refresh (auto-silent) | teacher1 | W2: leave tab idle ~5 min; navigate → no 401 shown | — | | |
| T-007 | Logout | teacher1–8 (all) | W2: each teacher logs out at end of day | — | | |

### Navigation (T-008 – T-020)

| ID | Feature | Account | Scenario | Pre-Assessment | Verdict | Screenshot |
|---|---|---|---|---|---|---|
| T-008 | Nav: Bosh sahifa (Dashboard) | teacher1 | W2: click Dashboard link | — | | |
| T-009 | Nav: Davomat (Attendance) | teacher1 | W2: click Attendance link | — | | |
| T-010 | Nav: Guruh ro'yxati (Parents list) | teacher1 | W2: click Parents list link | — | | |
| T-011 | Nav: Galereya (Media) | teacher1 | W2: click Media link | — | | |
| T-012 | Nav: Maqsadlar (Monitoring/Goals) | teacher1 | W2: click Monitoring link | — | | |
| T-013 | Nav: Kuzatuvlar (Activities) | teacher1 | W2: click Activities link | — | | |
| T-014 | Nav: Muloqot (Chat) with unread badge | teacher1 | W2: verify badge present after Wave-3 parents send messages | — | | |
| T-015 | Nav: Kun jurnali (Daily Reflection) | teacher1 | W2: click Reflection link | — | | |
| T-016 | Nav: Settings | teacher1 | W2: click Settings link | — | | |
| T-017 | Unread chat badge — poll + socket refresh | teacher1 | W2: send parent message in W3; badge updates without reload | — | | |
| T-018 | Language switcher in sidebar | teacher1 | W2: switch mid-session UZ→RU, continue working | — | | |
| T-019 | User info card in sidebar (name, role) | teacher1 | W2: verify name shown in sidebar card | — | | |
| T-020 | Offline banner | teacher1 | W2: disconnect network briefly; banner appears | — | | |

### Dashboard (T-021 – T-025)

| ID | Feature | Account | Scenario | Pre-Assessment | Verdict | Screenshot |
|---|---|---|---|---|---|---|
| T-021 | View attendance count for today | teacher1 | W2: dashboard shows today's count after attendance saved | — | | |
| T-022 | View children list with avatar + status | teacher1–8 | W2: each teacher's dashboard shows their children | — | | |
| T-023 | View recent observations feed | teacher1 | W2: after creating observation (T-045/T-046), feed updates | — | | |
| T-024 | View attention alerts (AI warnings) | teacher1 | W2: warnings count visible on dashboard | — | | |
| T-025 | Click child avatar → child detail | teacher1 | W2: click child card → /teacher/children/:id | — | | |

### Attendance (T-026 – T-033)

| ID | Feature | Account | Scenario | Pre-Assessment | Verdict | Screenshot |
|---|---|---|---|---|---|---|
| T-026 | Mark child present | teacher1–8 (all) | W2: mark at least 1 child present per teacher | — | | |
| T-027 | Mark child absent | teacher1 | W2: mark 1 child absent | — | | |
| T-028 | Mark child late | teacher1 | W2: mark 1 child late | — | | |
| T-029 | Mark child sick | teacher1 | W2: mark 1 child sick | — | | |
| T-030 | Mark all children present (bulk) | teacher3 (S2, has group) | W2: bulk present button | — | | |
| T-031 | Select date for attendance | teacher1 | W2: change date picker to yesterday | — | | |
| T-032 | Save attendance to backend | teacher1–8 (all) | W2: submit attendance, expect success | — | | |
| T-033 | View pre-existing attendance for a date | teacher1 | W2: navigate to a prior date with data | — | | |

### Parent/Group List (T-034 – T-037)

| ID | Feature | Account | Scenario | Pre-Assessment | Verdict | Screenshot |
|---|---|---|---|---|---|---|
| T-034 | List parents with child assignment | teacher1–8 (all) | W2: /teacher/parents → parents listed | — | | |
| T-035 | Search parents by name | teacher1 | W2: type partial name, verify filter | — | | |
| T-036 | View parent contact card (phone, child info) | teacher1 | W2: inspect parent card details | — | | |
| T-037 | Open chat with parent from parent card | teacher1 | W2: click Chat button → /teacher/chat?parentId= | — | | |

### Chat (T-038 – T-044)

| ID | Feature | Account | Scenario | Pre-Assessment | Verdict | Screenshot |
|---|---|---|---|---|---|---|
| T-038 | List conversations (parents) | teacher1–8 (all) | W2: load chat, verify parent conversations listed | — | | |
| T-039 | Select conversation and view messages | teacher1 | W2: click conversation, messages load | — | | |
| T-040 | Send message to parent | teacher1–8 (all) | W2 CORE: send Cyrillic+emoji message to each linked parent | — | | |
| T-041 | Edit own message | teacher1 | W2: send then edit a message | — | | |
| T-042 | Delete own message | teacher1 | W2: send then delete a message | — | | |
| T-043 | Real-time incoming message (socket) | teacher1 (receive from parent) | W3→W2 check: parent reply triggers badge | — | | |
| T-044 | Mark conversation as read | teacher1 | W2: open conversation, verify read state | — | | |

### Activities / Observations (T-045 – T-049)

| ID | Feature | Account | Scenario | Pre-Assessment | Verdict | Screenshot |
|---|---|---|---|---|---|---|
| T-045 | List activities/observations | teacher1–8 (all) | W2: load Activities page | — | | |
| T-046 | Create activity (child, type, notes) | teacher1–8 (all) | W2 CORE: create observation with Cyrillic text | — | | |
| T-047 | Edit activity | teacher1 | W2: edit the created activity | — | | |
| T-048 | Delete activity | teacher1 | W2: create extra activity, delete it | — | | |
| T-049 | Select child for activity | teacher1 | W2: verify child dropdown in create modal | — | | |

### Media / Gallery (T-050 – T-053)

| ID | Feature | Account | Scenario | Pre-Assessment | Verdict | Screenshot |
|---|---|---|---|---|---|---|
| T-050 | List media items | teacher1–8 (all) | W2: load Media page | — | | |
| T-051 | Upload media — normal file | teacher1–8 (all) | W2 CORE: upload a real image (<5MB) via file picker | — | | |
| T-051b | Upload media — oversized file (>5MB) | teacher1 | W2 CROSS-CUT: upload >5MB file → localized error message | — | | |
| T-052 | Delete media item | teacher1 | W2: delete an uploaded item | — | | |
| T-053 | View/preview media item | teacher1 | W2: click media card → view modal | — | | |

### Meals (T-054 – T-057)

| ID | Feature | Account | Scenario | Pre-Assessment | Verdict | Screenshot |
|---|---|---|---|---|---|---|
| T-054 | List meal plan entries | teacher1–8 (all) | W2: load Meals page | — | | |
| T-055 | Create meal entry | teacher1–8 (all) | W2: create a meal entry for a child | — | | |
| T-056 | Edit meal entry | teacher1 | W2: edit the meal entry | — | | |
| T-057 | Delete meal entry | teacher1 | W2: delete a meal entry | — | | |

### Emotional Monitoring (T-058 – T-061)

| ID | Feature | Account | Scenario | Pre-Assessment | Verdict | Screenshot |
|---|---|---|---|---|---|---|
| T-058 | Log emotional state for child | teacher1–8 (all) | W2: log monitoring entry via checkboxes | — | | |
| T-059 | View prior monitoring entries | teacher1 | W2: navigate to prior entries | — | | |
| T-060 | Edit monitoring entry | teacher1 | W2: edit a prior entry | — | | |
| T-061 | Delete monitoring entry | teacher1 | W2: delete a test entry | — | | |

### Daily Reflection / Journal (T-062 – T-066)

| ID | Feature | Account | Scenario | Pre-Assessment | Verdict | Screenshot |
|---|---|---|---|---|---|---|
| T-062 | Write daily reflection text | teacher1–8 (all) | W2 CORE: write multi-line Cyrillic reflection | — | | |
| T-063 | Auto-save reflection to localStorage | teacher1 | W2: partially type, reload → draft restored | — | | |
| T-064 | List prior reflections | teacher1 | W2: navigate to prior reflections tab | — | | |
| T-065 | Log daily journal entry per child (with tag) | teacher1–8 (all) | W2 CORE: journal entry per child with moment tag, Cyrillic text | — | | |
| T-066 | View journal entries for child | teacher1 | W2: navigate back to child's journal entries | — | | |

### Child Detail (T-067 – T-069)

| ID | Feature | Account | Scenario | Pre-Assessment | Verdict | Screenshot |
|---|---|---|---|---|---|---|
| T-067 | View child profile (name, DOB, diagnosis, photo) | teacher1–8 (all) | W2: click into child detail | — | | |
| T-068 | View child's observations list | teacher1 | W2: observations tab in child detail | — | | |
| T-069 | Navigate to child's ИРР | teacher1 | W2: click ИРР link in child detail | — | | |

### ИРР — Individual Development Plan (T-070 – T-095)

| ID | Feature | Account | Scenario | Pre-Assessment | Verdict | Screenshot |
|---|---|---|---|---|---|---|
| T-070 | Create new ИРР for child | teacher1 | W2: create IRR for a child without one | — | | |
| T-071 | Fill ИРР header: ptpkIntakeDate | teacher1 | W2: fill header field, save | — | | |
| T-072 | Fill ИРР header: ptpkConclusionDate | teacher1 | W2: fill field, save | — | | |
| T-073 | Fill ИРР header: ptpkConclusionNumber | teacher1 | W2: fill field, save | — | | |
| T-074 | Fill ИРР header: ptpkDiagnosis | teacher1 | W2: fill field, save | — | | |
| T-075 | Fill ИРР header: childStrengths / riskFactors / additionalInfo | teacher1 | W2: fill all three fields, save | — | | |
| T-076 | Activate ИРР (validation gate) | teacher1 | W2: attempt activate with missing fields → error; complete fields → activate | — | | |
| T-077 | Archive ИРР | teacher1 | W2: archive an existing IRR | — | | |
| T-078 | Create assessment session | teacher1 | W2: create new assessment session | — | | |
| T-079 | Score assessment criterion (1–5, 17 criteria) | teacher1 | W2: score all 17 criteria | — | | |
| T-080 | Save assessment session scores | teacher1 | W2: submit when all 17 scored | — | | |
| T-081 | View live/current score per domain | teacher1 | W2: verify domain scores display | — | | |
| T-082 | List prior assessment sessions | teacher1 | W2: view progression table | — | | |
| T-083 | Create long-term goal | teacher1 | W2: add LTG with skill area | — | | |
| T-084 | Edit long-term goal | teacher1 | W2: edit LTG text | — | | |
| T-085 | Delete long-term goal | teacher1 | W2: delete test LTG | — | | |
| T-086 | Create goal period under LTG | teacher1 | W2: add goal period | — | | |
| T-087 | Create short-term goal under period | teacher1 | W2: add STG under period | — | | |
| T-088 | Edit short-term goal | teacher1 | W2: edit STG text | — | | |
| T-089 | Delete short-term goal | teacher1 | W2: delete test STG | — | | |
| T-090 | Write quarterly review (parentRecommendations) | teacher1 | W2: fill recommendations in goal period | — | | |
| T-091 | Sign goal period (teacher countersign) | teacher1 | W2: sign a goal period | — | | |
| T-092 | Log daily journal entry for child (from ИРР) | teacher1 | W2: submit 27-item daily checklist | — | | |
| T-093 | View daily journal entries (from ИРР) | teacher1 | W2: navigate to daily entries tab | — | | |
| T-094 | Log weekly journal entry | teacher1 | W2: submit 18-item weekly checklist | — | | |
| T-095 | View weekly journal entries | teacher1 | W2: navigate to weekly entries tab | — | | |

### Therapy Management (T-096 – T-099)

| ID | Feature | Account | Scenario | Pre-Assessment | Verdict | Screenshot |
|---|---|---|---|---|---|---|
| T-096 | List therapy sessions | teacher1–8 (all) | W2: load Therapy page | — | | |
| T-097 | Create therapy session | teacher1–8 (all) | W2: create therapy entry (enables P-083/P-086) | — | | |
| T-098 | Edit therapy session | teacher1 | W2: edit therapy entry | — | | |
| T-099 | Delete therapy session | teacher1 | W2: double-click delete guard | — | | |

### AI Warnings (T-100 – T-102)

| ID | Feature | Account | Scenario | Pre-Assessment | Verdict | Screenshot |
|---|---|---|---|---|---|---|
| T-100 | View AI warning list | teacher1–8 (all) | W2: load Warnings page | — | | |
| T-101 | Filter warnings by severity | teacher1 | W2: apply severity filter | — | | |
| T-102 | Resolve AI warning with note | teacher1 | W2: resolve a warning, enter note | — | | |

### Settings & Profile (T-103 – T-110)

| ID | Feature | Account | Scenario | Pre-Assessment | Verdict | Screenshot |
|---|---|---|---|---|---|---|
| T-103 | View profile (name, email, phone, school) | teacher1 | W2: /teacher/settings → Profile section | — | | |
| T-104 | Edit profile (firstName, lastName, phone) | teacher1 | W2: edit name, save, verify toast | — | | |
| T-105 | Change password (settings) | teacher1 | W2: change password via settings form | — | | |
| T-106 | Upload avatar | teacher1 | W2: upload avatar photo | — | | |
| T-107 | Toggle notification preferences | teacher1 | W2: toggle email/push prefs | — | | |
| T-108 | Language switcher in settings | teacher1 | W2: switch language from settings | — | | |
| T-109 | Send message to government | teacher1 | W2: compose message to government | — | | |
| T-110 | View replies from government | teacher1 | W2: open message history modal | — | | |

### Cross-Cutting (T-111 – T-116)

| ID | Feature | Account | Scenario | Pre-Assessment | Verdict | Screenshot |
|---|---|---|---|---|---|---|
| T-111 | Toast notification — success | teacher1 | W2: verify success toast on any save | — | | |
| T-112 | Toast notification — error | teacher1 | W2: trigger error (e.g. wrong file type) → error toast | — | | |
| T-113 | Error boundary — crash recovery | teacher1 | W2: inject invalid URL param, verify ErrorBoundary renders | — | | |
| T-114 | Real-time socket connection | teacher1 | W2: verify socket connects on login | — | | |
| T-115 | Notification panel — view list | teacher1 | W2: open notification panel | — | | |
| T-116 | Notification — mark as read | teacher1 | W2: mark a notification as read | — | | |

---

## Wave 3 — Parent Portal (P-001 – P-106)

**Accounts:** parent1–parent12 (all accounts)
**URL:** https://uchqun-teacher.netlify.app (shared portal, parent role)
**Viewport:** 390×844 mobile
**Scenario:** login → dashboard reflects Wave-2 writes → journal → attendance → media gallery → chat (read + reply) → rate teacher → switch RU → settings → logout

### Auth & Onboarding (P-001 – P-006)

| ID | Feature | Account | Scenario | Pre-Assessment | Verdict | Screenshot |
|---|---|---|---|---|---|---|
| P-001 | Login with email+password | parent1–12 (all) | W3: each parent logs in at 390px | — | | |
| P-002 | Refresh JWT token | parent1 | W3: idle, navigate → silent refresh | — | | |
| P-003 | Logout | parent1–12 (all) | W3: click Chiqish, verify redirect | — | | |
| P-004 | Change password (first login) | parent1 (simulate) | W3: verify forced change gate | — | | |
| P-005 | Change password (settings) | parent1 | W3: Settings → change password | — | | |
| P-006 | Parent role: isActive bypass (intentional) | parent1 | W3: verify parent with status=suspended can still log in per CP-020 | — | | |

### Navigation & Layout (P-007 – P-011)

| ID | Feature | Account | Scenario | Pre-Assessment | Verdict | Screenshot |
|---|---|---|---|---|---|---|
| P-007 | Mobile tab bar (5 tabs) | parent1 | W3: verify bottom nav at 390px | — | | |
| P-008 | Desktop top nav | parent1 (switch to 1280px) | W3: switch viewport, verify top nav | — | | |
| P-009 | Notification badge on nav | parent1 | W3: verify badge after Wave-2 creates notifications | — | | |
| P-010 | Active route highlighting | parent1 | W3: navigate tabs, verify active highlight | — | | |
| P-011 | Sidebar (dead code — never rendered) | parent1 | W3: inspect DOM — sidebar NOT present | KNOWN-FAIL: Sidebar.jsx imported but not rendered | | |

### Account & Child Management (P-012 – P-015)

| ID | Feature | Account | Scenario | Pre-Assessment | Verdict | Screenshot |
|---|---|---|---|---|---|---|
| P-012 | Switch between multiple children | parent1 (1 child), + any multi-child parent | W3: verify ChildSwitcher pill for 2+ children; static span for 1 | PARTIAL: depends on whether any seeded parent has 2 children | | |
| P-013 | Language switcher (Uz/Ru/En) | parent1 | W3: switch language, persist to localStorage | — | | |
| P-014 | View parent profile fields | parent1–12 | W3: Settings → profile fields visible | — | | |
| P-015 | Edit profile (name, phone, notifications) | parent1 | W3: edit + save | — | | |

### Dashboard & Overview (P-016 – P-020)

| ID | Feature | Account | Scenario | Pre-Assessment | Verdict | Screenshot |
|---|---|---|---|---|---|---|
| P-016 | Dashboard home page | parent1–12 (all) | W3 CORE: load dashboard; verify Wave-2 data reflected | — | | |
| P-017 | Fetch and cache dashboard stats | parent1 | W3: inspect network — Promise.all fires | — | | |
| P-018 | Today's day card (counts) | parent1 | W3: verify activities/meals/media counts from Wave-2 | — | | |
| P-019 | Quick access links (8 items) | parent1 | W3: tap all 8 quick links, verify navigation | — | | |
| P-020 | Real-time dashboard refresh (socket) | parent1 | W3: teacher sends message during session → dashboard updates | — | | |

### Child Profile & Features (P-021 – P-028)

| ID | Feature | Account | Scenario | Pre-Assessment | Verdict | Screenshot |
|---|---|---|---|---|---|---|
| P-021 | Select child from list | parent1 | W3: if 1 child, verify auto-select; if 2+ verify list | — | | |
| P-022 | View child basic info (hero section) | parent1–12 (all) | W3: verify child photo, name, teacher, school, group | — | | |
| P-023 | Upload child avatar | parent1 | W3: upload photo via avatar modal | — | | |
| P-024 | View child basic info card | parent1 | W3: verify name, DOB, diagnosis, teacher | — | | |
| P-025 | View special needs description | parent1 | W3: verify special needs text visible | — | | |
| P-026 | View emotional monitoring records | parent1 | W3: verify Wave-2 monitoring entry appears | — | | |
| P-027 | View weekly stats | parent1 | W3: verify 7-day counts from Wave-2 | — | | |
| P-028 | Account action buttons (IRR, Settings, Govt, Messages) | parent1 | W3: tap each action button | — | | |

### Activities & Individual Lessons (P-029 – P-031)

| ID | Feature | Account | Scenario | Pre-Assessment | Verdict | Screenshot |
|---|---|---|---|---|---|---|
| P-029 | List all child's activities | parent1–12 (all) | W3: verify Wave-2 activities appear | — | | |
| P-030 | View activity detail modal | parent1 | W3: tap Batafsil → full detail modal | — | | |
| P-031 | Empty state for activities | parent1 (if no Wave-2 activity) | W3: verify localized empty state | — | | |

### Meals (P-032 – P-036)

| ID | Feature | Account | Scenario | Pre-Assessment | Verdict | Screenshot |
|---|---|---|---|---|---|---|
| P-032 | List meals for selected date | parent1 | W3: verify Wave-2 meal entries appear | — | | |
| P-033 | Select date from dropdown | parent1 | W3: change date picker | — | | |
| P-034 | Meal eaten/not eaten indicator | parent1 | W3: verify eaten/not-eaten badges | — | | |
| P-035 | Daily nutrition summary card | parent1 | W3: verify Kunlik xulosa card | — | | |
| P-036 | Empty state for meals | parent1 (select date with no meals) | W3: navigate to date with no meals | — | | |

### Media (P-037 – P-044)

| ID | Feature | Account | Scenario | Pre-Assessment | Verdict | Screenshot |
|---|---|---|---|---|---|---|
| P-037 | Grid view of media | parent1–12 (all) | W3 CORE: verify Wave-2 uploaded photo appears in gallery | — | | |
| P-038 | Filter media by type | parent1 | W3: tap photo/video filter buttons | — | | |
| P-039 | Video preview on hover | parent1 (desktop viewport) | W3: switch to desktop, hover video card | — | | |
| P-040 | Open media in fullscreen modal | parent1 | W3: tap media card → fullscreen | — | | |
| P-041 | Custom video player | parent1 | W3: open video in fullscreen, test controls | — | | |
| P-042 | YouTube & Vimeo embed support | — | — | BLOCKED: no YT/Vimeo URLs in DB; cannot seed via UI | | |
| P-043 | Appwrite proxy for videos | — | — | BLOCKED: no Appwrite URLs in DB; cannot seed via UI | | |
| P-044 | Empty state for media | — | — | BLOCKED: seeded media exists and cannot be cleared via UI without an API call | | |

### Chat with Teacher (P-045 – P-051)

| ID | Feature | Account | Scenario | Pre-Assessment | Verdict | Screenshot |
|---|---|---|---|---|---|---|
| P-045 | List messages (thread) | parent1–12 (all) | W3 CORE: verify Wave-2 teacher messages visible | — | | |
| P-046 | Send message to teacher | parent1–12 (all) | W3 CORE: type and send Cyrillic reply including emoji | — | | |
| P-047 | Edit own message | parent1 | W3: send, then hover+click edit on own message | — | | |
| P-048 | Delete own message | parent1 | W3: send, then delete own message | — | | |
| P-049 | Auto-scroll to new messages | parent1 | W3: send messages, verify scroll to bottom | — | | |
| P-050 | Empty state for chat | parent1 (if no Wave-2 messages) | W3: verify "Xabarlar yo'q" empty state | — | | |
| P-051 | Real-time chat updates (socket) | parent1 + teacher1 (two tabs) | W3: open two tabs; teacher sends → parent sees instantly | — | | |

### Notifications Panel (P-052 – P-058)

| ID | Feature | Account | Scenario | Pre-Assessment | Verdict | Screenshot |
|---|---|---|---|---|---|---|
| P-052 | List all notifications | parent1 | W3: /notifications page loads | — | | |
| P-053 | Filter notifications (all/unread/read) | parent1 | W3: requires Wave-2 to generate notifications; toggle filters | — | | |
| P-054 | Mark single notification as read | parent1 | W3: tap checkmark on notification | — | | |
| P-055 | Mark all notifications as read | parent1 | W3: tap mark-all button | — | | |
| P-056 | Delete notification | parent1 | W3: delete a notification | — | | |
| P-057 | Unread count badge on nav | parent1 | W3: verify badge count after Wave-2 events | — | | |
| P-058 | Empty state for notifications | parent1 (before Wave-2 events) | W3: verify "Bildirishnomalar yo'q" | — | | |

### ИРР Read-Only (P-059 – P-066)

| ID | Feature | Account | Scenario | Pre-Assessment | Verdict | Screenshot |
|---|---|---|---|---|---|---|
| P-059 | View current IRR status | parent1 | W3: /irr → header with totalScore/maxScore | — | | |
| P-060 | View assessment progression (sessions) | parent1 | W3: view session list with trend icons | — | | |
| P-061 | View long-term goals | parent1 | W3: verify LTG list from Wave-2 | — | | |
| P-062 | View periods with short-term goals | parent1 | W3: expand STGs per period | — | | |
| P-063 | View parent recommendations | parent1 | W3: amber card with recommendations | — | | |
| P-064 | View STG review / teacher notes | parent1 | W3: gray card with teacher review | — | | |
| P-065 | IRR not found state | parent (child without IRR) | W3: navigate to child without IRR | — | | |
| P-066 | IRR load error + retry | parent1 | W3: simulate network error → Retry button | — | | |

### Teacher Rating (P-067 – P-072)

| ID | Feature | Account | Scenario | Pre-Assessment | Verdict | Screenshot |
|---|---|---|---|---|---|---|
| P-067 | Rate teacher (5-star) | parent1–12 (all) | W3 CORE: each parent rates their teacher | — | | |
| P-068 | Comment on teacher rating | parent1 | W3: add Cyrillic comment with emoji | — | | |
| P-069 | Show teacher rating summary | parent1 | W3: verify average + count displayed | — | | |
| P-070 | Rate school (5 indicators + comment) | parent1–12 (all) | W3: rate school via 5-indicator form | — | | |
| P-071 | School indicator labels (PL-015 placeholders) | parent1 | W3: verify Ko'rsatkich 1–5 labels render | — | | |
| P-072 | School rating summary | parent1 | W3: verify school average + personal rating summary | — | | |

### Contact Government (P-073 – P-082)

| ID | Feature | Account | Scenario | Pre-Assessment | Verdict | Screenshot |
|---|---|---|---|---|---|---|
| P-073 | Compose message to government | parent1 | W3: open MessageModal from child profile | — | | |
| P-074 | Select recipient level (owner/region/republic) | parent1 | W3: click each level button | — | | |
| P-075 | Default to republic level | parent1 | W3: verify new message defaults to republic | — | | |
| P-076 | Subject input (required validation) | parent1 | W3: submit without subject → error | — | | |
| P-077 | Message body input (required validation) | parent1 | W3: submit without body → error | — | | |
| P-078 | Send message to government | parent1–12 (all) | W3: send message at various levels | — | | |
| P-079 | View sent messages with replies | parent1 | W3: "Mening xabarlarim" → messages modal | — | | |
| P-080 | Escalate own message to next level | parent1 | W3: send then escalate own message | — | | |
| P-081 | Escalation chain indicator | parent1 | W3: verify escalatedFromId badge | — | | |
| P-082 | Government message count badge | parent1 | W3: send message, verify count badge | — | | |

### Useful Materials / Therapy (P-083 – P-087)

| ID | Feature | Account | Scenario | Pre-Assessment | Verdict | Screenshot |
|---|---|---|---|---|---|---|
| P-083 | Browse therapy items | parent1 | W3: /therapy → items from Wave-2 teacher creates (T-097) | — | | |
| P-084 | Filter therapy by type | parent1 | W3: tap Barchasi / Musiqa / Video filters | — | | |
| P-085 | Search therapy by title/description/tags | parent1 | W3: type in search, verify filter | — | | |
| P-086 | Start therapy session | parent1 | W3: click therapy item → start session | — | | |
| P-087 | End therapy session | parent1 | W3: end active session | — | | |

### Settings & Account (P-088 – P-092)

| ID | Feature | Account | Scenario | Pre-Assessment | Verdict | Screenshot |
|---|---|---|---|---|---|---|
| P-088 | View profile info | parent1–12 | W3: /settings → profile fields | — | | |
| P-089 | Edit name/phone | parent1 | W3: edit, save, toast | — | | |
| P-090 | Notification preferences | parent1 | W3: toggle email/push | — | | |
| P-091 | Change password in Settings | parent1 | W3: enter current + new password | — | | |
| P-092 | Logout button in Settings | parent1 | W3: "Chiqish" button visible + functional | — | | |

### Help & Support (P-093 – P-095)

| ID | Feature | Account | Scenario | Pre-Assessment | Verdict | Screenshot |
|---|---|---|---|---|---|---|
| P-093 | Help page with FAQs | parent1 | W3: /help → FAQs visible | — | | |
| P-094 | Contact email link | parent1 | W3: mailto: link present | — | | |
| P-095 | Contact phone link | parent1 | W3: tel: link present | — | | |

### Cross-Cutting Features (P-096 – P-106)

| ID | Feature | Account | Scenario | Pre-Assessment | Verdict | Screenshot |
|---|---|---|---|---|---|---|
| P-096 | Responsive design (mobile/tablet/desktop) | parent1 | W3: verify bottom nav at 375px; top nav at 1280px | — | | |
| P-097 | Protected routes (parent role enforcement) | anonymous | W3: navigate to /chat without auth → /login | — | | |
| P-098 | Real-time socket integration | parent1 | W3: verify 10 socket subscriptions active | — | | |
| P-099 | Toast notifications (success/error) | parent1 | W3: verify toast on any save | — | | |
| P-100 | Loading spinners & skeleton states | parent1 | W3: verify spinner on initial page load | — | | |
| P-101 | Error boundaries | parent1 | W3: verify ErrorBoundary wraps routes | — | | |
| P-102 | Offline detection banner | parent1 | W3: disconnect network briefly | — | | |
| P-103 | i18n support (Uz/Ru/En) | parent1 | W3: switch all 3 languages mid-session | — | | |
| P-104 | Client-side caching (selectedChildId keying) | parent1 | W3: switch child, verify cache keyed by childId | — | | |
| P-105 | Global error handling (4xx/5xx) | parent1 | W3: verify catch blocks show toasts not blank | — | | |
| P-106 | Accessibility features (ARIA) | — | — | BLOCKED: full ARIA audit deferred to pre-launch per feature file (PL scope) | | |

---

## Wave 4 — Admin Portal (A-001 – A-094 + A-082a/b)

**Accounts:** admin1 (S1), admin2 (S2), admin3 (S3), admin4 (S4)
**URL:** https://uchqun-admin.netlify.app
**Scenario:** login → verify Wave-1 registrations visible → communications reflect Wave-2/3 chat → reports → audit log shows only own school's actions

### Auth & Onboarding (A-001 – A-005)

| ID | Feature | Account | Scenario | Pre-Assessment | Verdict | Screenshot |
|---|---|---|---|---|---|---|
| A-001 | Login | admin1–4 (all) | W4: each admin logs in | — | | |
| A-002 | Logout | admin1 | W4: logout button in sidebar | — | | |
| A-003 | Admin self-registration | admin1 (test via registration form) | W4: submit registration request | — | | |
| A-004 | Forced password change on first login | admin1 (simulate) | W4: verify gate exists | — | | |
| A-005 | Language switcher (UZ/RU/EN) | admin1 | W4: toggle language in sidebar | — | | |

### Dashboard (A-006 – A-014)

| ID | Feature | Account | Scenario | Pre-Assessment | Verdict | Screenshot |
|---|---|---|---|---|---|---|
| A-006 | View dashboard | admin1–4 (all) | W4: load dashboard; all cards render | — | | |
| A-007 | Refresh dashboard stats | admin1 | W4: click refresh button | — | | |
| A-008 | School capacity gauge | admin1 | W4: verify capacity card | — | | |
| A-009 | Pending documents card | admin1 | W4: verify pending docs count | — | | |
| A-010 | AI warnings card | admin1 | W4: verify warnings count | — | | |
| A-011 | Pending reception staff card | admin1 | W4: verify pending receptions card | — | | |
| A-012 | School ratings panel | admin1 | W4: verify ratings from Wave-3 | — | | |
| A-013 | Recent activity feed (audit log) | admin1 | W4: verify Wave-1/2/3 actions appear | — | | |
| A-014 | Quick info (address, capacity, phone) | admin1 | W4: verify info panel renders | — | | |

### Reception Management (A-015 – A-027)

| ID | Feature | Account | Scenario | Pre-Assessment | Verdict | Screenshot |
|---|---|---|---|---|---|---|
| A-015 | List receptions | admin1–4 (all) | W4: Wave-1 reception visible | — | | |
| A-016 | Search receptions | admin1 | W4: search by name | — | | |
| A-017 | Filter by status | admin1 | W4: toggle status filters | — | | |
| A-018 | Paginate receptions | admin1 (need 15+ receptions) | W4: verify pagination controls | — | | |
| A-019 | Create reception (manual) | admin1 | W4: create a test reception | — | | |
| A-020 | Edit reception | admin1 | W4: edit the test reception | — | | |
| A-021 | Delete reception | admin1 | W4: delete the test reception | — | | |
| A-022 | Activate reception | admin1 | W4: deactivate then activate | — | | |
| A-023 | Deactivate reception | admin1 | W4: deactivate a reception | — | | |
| A-024 | View reception detail panel | admin1 | W4: click reception → detail panel | — | | |
| A-025 | View reception documents | admin1 | W4: open docs list in detail panel | — | | |
| A-026 | Approve reception document | admin1 | W4: approve a pending doc | — | | |
| A-027 | Reject reception document | admin1 | W4: reject a doc with reason | — | | |

### Parent Management (A-028 – A-036)

| ID | Feature | Account | Scenario | Pre-Assessment | Verdict | Screenshot |
|---|---|---|---|---|---|---|
| A-028 | List parents | admin1–4 (all) | W4: Wave-1 + existing parents visible | — | | |
| A-029 | Search parents | admin1 | W4: search by name | — | | |
| A-030 | View parent detail | admin1 | W4: select parent → detail panel | — | | |
| A-031 | View parent's children | admin1 | W4: children section in detail | — | | |
| A-032 | View parent's activities | admin1 | W4: activities section (may be empty) | — | | |
| A-033 | View parent's meals | admin1 | W4: meals section | — | | |
| A-034 | View parent's media | admin1 | W4: media section | — | | |
| A-035 | Suspend parent | admin1 | W4: suspend a parent | — | | |
| A-036 | Activate parent | admin1 | W4: activate suspended parent | — | | |

### Teacher Management (A-037 – A-040)

| ID | Feature | Account | Scenario | Pre-Assessment | Verdict | Screenshot |
|---|---|---|---|---|---|---|
| A-037 | List teachers | admin1–4 (all) | W4: verify teachers visible | — | | |
| A-038 | Search teachers | admin1 | W4: search by name | — | | |
| A-039 | View teacher detail | admin1 | W4: click teacher → detail page | — | | |
| A-040 | View teacher's groups | admin1 | W4: groups section in teacher detail | — | | |

### Group Management (A-041 – A-042)

| ID | Feature | Account | Scenario | Pre-Assessment | Verdict | Screenshot |
|---|---|---|---|---|---|---|
| A-041 | List groups | admin1 (S1 — Wave-1 created group visible), admin2–4 | W4: verify groups per school (admin1 sees Wave-1 created group) | — | | |
| A-042 | Search groups | admin2 | W4: S2 has groups; search them | — | | |

### Bulk Import (A-043 – A-047)

| ID | Feature | Account | Scenario | Pre-Assessment | Verdict | Screenshot |
|---|---|---|---|---|---|---|
| A-043 | Step 1: Upload CSV | admin1 | W4: /admin/import → upload test CSV | — | | |
| A-044 | Step 2: Validate results | admin1 | W4: click validate, see row counts | — | | |
| A-045 | Step 3: Confirm import | admin1 | W4: confirm, click start | — | | |
| A-046 | Step 4: Poll status | admin1 | W4: watch polling every 3s | — | | |
| A-047 | Step 5: See result | admin1 | W4: verify final result screen | — | | |

### Document Approval Queue (A-048 – A-055)

| ID | Feature | Account | Scenario | Pre-Assessment | Verdict | Screenshot |
|---|---|---|---|---|---|---|
| A-048 | List pending documents | admin1 | W4: pending tab at /admin/documents | — | | |
| A-049 | View approved tab | admin1 | W4: click approved tab | — | | |
| A-050 | View rejected tab | admin1 | W4: click rejected tab | — | | |
| A-051 | Search documents | admin1 | W4: search in doc queue | — | | |
| A-052 | Approve document | admin1 | W4: approve a Wave-1 uploaded doc | — | | |
| A-053 | Reject document | admin1 | W4: reject doc with reason | — | | |
| A-054 | View document file | admin1 | W4: click eye icon → new tab | — | | |
| A-055 | Paginate documents | admin1 | W4: verify pagination if >15 docs | — | | |

### Additional Features (A-056 – A-094)

| ID | Feature | Account | Scenario | Pre-Assessment | Verdict | Screenshot |
|---|---|---|---|---|---|---|
| A-056 | View child detail | admin1 | W4: navigate to a child's detail page | — | | |
| A-057 | View child observations | admin1 | W4: observations tab in child detail | — | | |
| A-058 | View child goals | admin1 | W4: goals tab in child detail | — | | |
| A-059 | View school profile | admin1 | W4: /admin/school profile page | — | | |
| A-060 | Edit school contact | admin1 | W4: edit whitelisted contact fields | — | | |
| A-061 | View school ratings | admin1 | W4: /admin/ratings → Wave-3 ratings reflected | — | | |
| A-062 | Edit admin profile | admin1 | W4: edit name, save | — | | |
| A-063 | Change password | admin1 | W4: Settings → change password | — | | |
| A-064 | Notification preferences | admin1 | W4: notification toggles in settings | — | | |
| A-065 | View audit log | admin1–4 (all) | W4 CORE: /admin/audit — verify only own school's actions | — | | |
| A-066 | Filter audit by action | admin1 | W4: filter by action type | — | | |
| A-067 | Filter audit by date | admin1 | W4: set date range, re-fetch | — | | |
| A-068 | Paginate audit log | admin1 | W4: navigate pages | — | | |
| A-069 | List AI warnings | admin1–4 (all) | W4: /admin/ai-warnings | — | | |
| A-070 | Filter warnings by status | admin1 | W4: toggle active/resolved | — | | |
| A-071 | Filter warnings by severity | admin1 | W4: apply severity filter | — | | |
| A-072 | Mark warning resolved | admin1 | W4: resolve a warning | — | | |
| A-073 | Notify stakeholders | admin1 | W4: notify for a warning | — | | |
| A-074 | Analyze data | admin1 | W4: trigger AI analysis | — | | |
| A-075 | View messages to government | admin1 | W4: /admin/messages | — | | |
| A-076 | View message detail | admin1 | W4: click message → thread | — | | |
| A-077 | Compose message to government | admin1 | W4: compose and send | — | | |
| A-078 | View deleted parents | admin1 | W4: /admin/trash → Parents tab | — | | |
| A-079 | View deleted receptions | admin1 | W4: Trash → Receptions tab | — | | |
| A-080 | Restore parent | admin1 | W4: restore a deleted parent | — | | |
| A-081 | Restore reception | admin1 | W4: restore a deleted reception | — | | |
| A-082 | View conversations | admin1 | W4: /admin/communications → verify Wave-2/3 chat volume | — | | |
| A-082a | Search conversations by parent name (A-BRK-01) | admin1 | W4: type parent name in search | — | | |
| A-082b | Chat API URL prefix correct (A-BRK-02) | admin1 | W4: network tab — no double /v1/ prefix | — | | |
| A-083 | View conversation detail | admin1 | W4: click conversation → thread | — | | |
| A-084 | View admin profile | admin1 | W4: /admin/profile | — | | |
| A-085 | Logout from profile | admin1 | W4: logout from profile page | — | | |
| A-086 | Send message (profile) | admin1 | W4: compose message from profile | — | | |
| A-087 | View my messages | admin1 | W4: open messages modal | — | | |
| A-088 | Quarterly monitoring (ManagerIRR) | admin1 | W4: /admin/irr → children list + sign button | — | | |
| A-089 | Settings profile form | admin1 | W4: PUT /user/profile | — | | |
| A-090 | Settings password form | admin1 | W4: PUT /user/password | — | | |
| A-091 | Settings notifications | admin1 | W4: notification section visible | — | | |
| A-092 | Settings message form (MessageModal) | admin1 | W4: open + submit compose modal | — | | |
| A-093 | Settings view messages (MessagesModal) | admin1 | W4: open + view messages modal | — | | |
| A-094 | Therapy management | admin1 | W4: /admin/therapy → list + delete | — | | |

---

## Waves 5–6 — Government Portal (G-001 – G-076)

**Wave 5 accounts:** gov.toshkent (Region 01), gov.samarqand (Region 02)
**Wave 6 account:** gov.republic (all regions)
**URL:** https://uchqun-government.netlify.app
**Scenario Wave 5:** login → dashboard (own region only) → schools list (2 schools) → ratings reflect Wave-3 → audit log (own region) → messages (Wave-2/3 teacher messages) → tenant-isolation probes
**Scenario Wave 6:** aggregate view — all 4 schools; three-rating model; government-rate schools; provision users; registrations

### Authentication & Session (G-001 – G-005)

| ID | Feature | Account | Scenario | Pre-Assessment | Verdict | Screenshot |
|---|---|---|---|---|---|---|
| G-001 | Login via email/password | gov.republic, gov.toshkent, gov.samarqand | W5/6: each gov user logs in | — | | |
| G-002 | Password visibility toggle | gov.republic | W6: click eye icon on login | — | | |
| G-003 | Forced password change on login | gov.republic (simulate) | W6: verify gate | — | | |
| G-004 | Logout | gov.republic | W6: click Chiqish | — | | |
| G-005 | Change password (post-login) | gov.republic | W6: Settings → change password | — | | |

### Dashboard & Overview (G-006 – G-012)

| ID | Feature | Account | Scenario | Pre-Assessment | Verdict | Screenshot |
|---|---|---|---|---|---|---|
| G-006 | Dashboard summary (4 stat cards) | gov.republic, gov.toshkent | W5/6: verify stat cards and counts | — | | |
| G-007 | Scope label (republic vs region) | gov.republic + gov.toshkent | W6: republic shows "All regions"; W5: region shows region name | — | | |
| G-008 | Pending admin registrations mini-list | gov.republic | W6: verify registrations from Wave-1/4 | — | | |
| G-009 | Schools ratings mini-list (top 6) | gov.republic | W6: verify Wave-3 ratings reflected | — | | |
| G-010 | Regional breakdown table (republic only) | gov.republic | W6: region-wise table visible; region accounts do NOT see it | — | | |
| G-011 | Manual refresh button | gov.republic | W6: click refresh | — | | |
| G-012 | Stale indicator with retry | gov.republic | W6: simulate failure, retry | — | | |

### Schools Management (G-013 – G-023)

| ID | Feature | Account | Scenario | Pre-Assessment | Verdict | Screenshot |
|---|---|---|---|---|---|---|
| G-013 | View schools list (region-scoped) | gov.toshkent (2 schools), gov.samarqand (2 schools) | W5: each region sees only own 2 schools | — | | |
| G-014 | Search schools by name/address | gov.republic | W6: search by name | — | | |
| G-015 | Filter schools by type | gov.republic | W6: dropdown filter by type | — | | |
| G-016 | Schools list badge (truncation indicator) | gov.republic | W6: badge shows X/Y count | — | | |
| G-017 | Export schools to CSV | gov.republic | W6: download CSV | KNOWN-ISSUE: limit hardcoded to 999 | | |
| G-018 | Navigate to school detail | gov.republic | W6: click school row | — | | |
| G-019 | School detail — basic info card | gov.republic | W6: view school info | — | | |
| G-020 | School detail — stats sidebar | gov.republic | W6: sidebar shows students/teachers/ratings | — | | |
| G-021 | School detail — rating display | gov.republic | W6: verify three-rating model (parent+gov+combined) | — | | |
| G-022 | Archive school | gov.republic | W6: archive a school, verify badge | — | | |
| G-023 | Reactivate school | gov.republic | W6: reactivate the archived school | — | | |

### Schools Ratings (G-024 – G-028)

| ID | Feature | Account | Scenario | Pre-Assessment | Verdict | Screenshot |
|---|---|---|---|---|---|---|
| G-024 | View aggregated ratings (parent direction) | gov.republic | W6: Ratings page, parent direction | — | | |
| G-025 | Expand school card for parent ratings | gov.republic | W6: expand → paginated reviews | — | | |
| G-026 | Load more parent ratings | gov.republic | W6: expand → Load more | — | | |
| G-027 | Rate school (government direction, 5 indicators) | gov.republic | W6: POST school rating with all 5 indicators | — | | |
| G-028 | View government ratings direction | gov.republic | W6: toggle parent↔gov direction | — | | |

### Users Directories (G-029 – G-036)

| ID | Feature | Account | Scenario | Pre-Assessment | Verdict | Screenshot |
|---|---|---|---|---|---|---|
| G-029 | View students list (region-scoped) | gov.toshkent, gov.samarqand | W5: each region sees only own students | — | | |
| G-030 | Search students | gov.republic | W6: search student by name | — | | |
| G-031 | Load more students | gov.republic | W6: click load more | — | | |
| G-032 | View teachers list (region-scoped) | gov.toshkent, gov.samarqand | W5: region-scoped teacher list | — | | |
| G-033 | Search teachers | gov.republic | W6: search by name | — | | |
| G-034 | Load more teachers | gov.republic | W6: click load more | — | | |
| G-035 | View parents list (region-scoped) | gov.toshkent | W5: region-scoped parent list | — | | |
| G-036 | Load more parents | gov.republic | W6: click load more | — | | |

### Messages (G-037 – G-042)

| ID | Feature | Account | Scenario | Pre-Assessment | Verdict | Screenshot |
|---|---|---|---|---|---|---|
| G-037 | View incoming messages | gov.republic | W6: Platform > Messages — Wave-2/3/4 messages visible | — | | |
| G-038 | Search messages | gov.republic | W6: search by sender name | — | | |
| G-039 | Mark message as read | gov.republic | W6: mark a message read | — | | |
| G-040 | Reply to message | gov.republic | W6: type and send reply | — | | |
| G-041 | Delete message | gov.republic | W6: delete a message | — | | |
| G-042 | Unread message badge (tab) | gov.republic | W6: verify badge count on Messages tab | — | | |

### Admin Provisioning (G-043 – G-046)

| ID | Feature | Account | Scenario | Pre-Assessment | Verdict | Screenshot |
|---|---|---|---|---|---|---|
| G-043 | List school admins | gov.republic | W6: Platform > Admins tab | — | | |
| G-044 | Create school admin | gov.republic | W6: create test admin | — | | |
| G-045 | Edit school admin | gov.republic | W6: edit test admin | — | | |
| G-046 | Delete school admin | gov.republic | W6: delete test admin | — | | |

### Government User Provisioning (G-047 – G-052)

| ID | Feature | Account | Scenario | Pre-Assessment | Verdict | Screenshot |
|---|---|---|---|---|---|---|
| G-047 | List government users | gov.republic | W6: Platform > Government tab | — | | |
| G-048 | Provision government user (secondary) | gov.republic | W6: create secondary user | — | | |
| G-049 | Provision secondary in same region | gov.toshkent | W5: provision secondary in own region | — | | |
| G-050 | Provision secondary with capability grants | gov.republic | W6: toggle capabilities; verify canRateSchools label | KNOWN-FAIL: canRateSchools label renders as raw i18n key | | |
| G-051 | Delete government user | gov.republic | W6: delete test secondary | — | | |
| G-052 | Reset government user password | gov.republic | W6: reset password via modal | — | | |

### Registration Requests (G-053 – G-056)

| ID | Feature | Account | Scenario | Pre-Assessment | Verdict | Screenshot |
|---|---|---|---|---|---|---|
| G-053 | View pending registration requests | gov.republic | W6: Platform > Registrations | — | | |
| G-054 | Approve request + show credentials | gov.republic | W6: approve a Wave-4 admin registration | — | | |
| G-055 | Reject request with reason | gov.republic | W6: reject a request | — | | |
| G-056 | Copy credentials to clipboard | gov.republic | W6: copy credential after approval | — | | |

### Audit Log (G-057 – G-061)

| ID | Feature | Account | Scenario | Pre-Assessment | Verdict | Screenshot |
|---|---|---|---|---|---|---|
| G-057 | View audit log (region-scoped) | gov.toshkent, gov.samarqand | W5: verify only own region's school actions | — | | |
| G-058 | Filter audit by action | gov.republic | W6: filter by action type | — | | |
| G-059 | Filter audit by entity type | gov.republic | W6: filter by entity | — | | |
| G-060 | Filter audit by date range | gov.republic | W6: set start/end date, apply | — | | |
| G-061 | Paginate audit log | gov.republic | W6: navigate pages | — | | |

### AI Warnings (G-062 – G-065)

| ID | Feature | Account | Scenario | Pre-Assessment | Verdict | Screenshot |
|---|---|---|---|---|---|---|
| G-062 | View AI warnings list | gov.republic | W6: active vs resolved tabs | — | | |
| G-063 | Filter warnings by severity | gov.republic | W6: apply severity pills | — | | |
| G-064 | Resolve warning with notes | gov.republic | W6: resolve + enter notes | — | | |
| G-065 | Display resolved warnings | gov.republic | W6: verify CheckCircle2 + strikethrough | — | | |

### Cross-cutting / Navigation (G-066 – G-073)

| ID | Feature | Account | Scenario | Pre-Assessment | Verdict | Screenshot |
|---|---|---|---|---|---|---|
| G-066 | Sidebar with capability gates | gov.toshkent + secondary | W5: secondary with limited grants sees only granted items | — | | |
| G-067 | Scope indicator (republic / region) | gov.republic + gov.toshkent | W5/6: Globe vs MapPin+name | — | | |
| G-068 | Sidebar active link styling | gov.republic | W6: navigate, verify active border | — | | |
| G-069 | User card in sidebar | gov.republic | W6: avatar + name + email in footer | — | | |
| G-070 | Logout from sidebar | gov.republic | W6: Chiqish button | — | | |
| G-071 | Language switcher | gov.republic | W6: switch UZ↔RU mid-session | — | | |
| G-072 | Offline banner | gov.republic | W6: disconnect network | — | | |
| G-073 | Toast notifications | gov.republic | W6: verify toasts on actions | — | | |

### Profile & Settings (G-074 – G-076)

| ID | Feature | Account | Scenario | Pre-Assessment | Verdict | Screenshot |
|---|---|---|---|---|---|---|
| G-074 | View user profile | gov.republic | W6: /government/profile | — | | |
| G-075 | Edit profile (name, phone) | gov.republic | W6: edit, save, toast | — | | |
| G-076 | Change password from Settings | gov.republic | W6: Settings → change password | — | | |

---

## Coverage Summary

| Portal | Total Features | PENDING | BLOCKED | KNOWN-FAIL | Verdict TBD |
|---|---|---|---|---|---|
| Reception | 89 | 89 | 0 | 0 | 89 |
| Teacher | 117* | 116 | 0 | 0 | 117 |
| Parent | 106 | 102 | 3 (P-042/043/044) | 1 (P-011/P-106†) | 103 |
| Admin | 96 | 96 | 0 | 0 | 96 |
| Government | 76 | 74 | 0 | 2 (G-050, G-017) | 76 |
| **TOTAL** | **484** | **477** | **3** | **3** | **481** |

*T-051 split into T-051 (normal upload) + T-051b (>5MB error) for coverage granularity.
†P-106 is BLOCKED (ARIA audit deferred per feature file); P-011 is KNOWN-FAIL (dead code).

**Pre-blocked: 3 features, all in Parent portal.**
**Pre-known-fail: 3 features (P-011, G-050, G-017).**
**Everything else: PENDING — verdict to be recorded during testing.**

---

## Cross-Cutting Probe Checklist (Step 2)

Woven through all waves — record evidence in BETA-DEFECTS.md if any fail.

| Probe | Where exercised | Status |
|---|---|---|
| Language switch UZ→RU mid-flow | W2 teacher1 (sidebar), W3 parent1 (settings), W4 admin1, W5 gov.toshkent | — |
| Language switch →EN | W2 teacher1 login page, W4 admin1 | — |
| Untranslated word / raw enum flag | Any wave — log to BETA-DEFECTS P1 | — |
| Wrong date format flag | Any wave — log to BETA-DEFECTS P1 | — |
| Session expiry — idle past TTL → clean redirect | W2 teacher2 (idle), W3 parent2 (idle) | — |
| No zombie UI after expiry | Same | — |
| No 401/403 storm | Same | — |
| Hard refresh (×5 minimum) | Distributed across W2/W3/W4 | — |
| Back-button stability | W2 teacher1, W3 parent1 | — |
| Double-submit — form 1 | W2 teacher1: Attendance save | — |
| Double-submit — form 2 | W3 parent1: Chat send | — |
| Double-submit — form 3 | W4 admin1: Approve document | — |
| Empty state — screen 1 | W2 teacher1: Activities (before creates) | — |
| Empty state — screen 2 | W3 parent1: Notifications | — |
| Empty state — screen 3 | W4 admin1: Audit log (filter to no results) | — |
| Oversized file upload → localized error | W2 T-051b: >5MB upload via teacher portal | — |
| Wrong file type upload → localized error | W2 teacher1: upload .exe file | — |

## Tenant Isolation Probe Checklist (Step 3)

Record every probe in ISOLATION-REPORT.md.

| Probe | Account | Evidence required |
|---|---|---|
| Teacher S1 cannot see S2 children in nav/search/dropdowns | teacher1 | Attendance dropdown, Parents list, Activities child select |
| Teacher S1 chat has no S2 conversations | teacher1 | Chat conversation list |
| Parent A cannot reach Parent B's child attendance via URL manipulation | parent1 → /parent/attendance?childId=[S2-child-uuid] | API returns 404 |
| Parent A cannot reach Parent B's journal via URL | parent1 → /parent/children/[S2-child-uuid]/journal | API returns 404 |
| Parent A cannot reach Parent B's media via URL | parent1 → /parent/media?childId=[S2-child-uuid] | API returns 404 |
| Admin S1 cannot see S2 parents in parent list | admin1 | Parents page (should only show S1) |
| Admin S1 audit log has no S2 events | admin1 | Audit log page |
| Admin S1 cannot view S2 teachers via URL | admin1 → /admin/teachers/[S2-teacher-uuid] | 404 or redirect |
| Region 01 (gov.toshkent) cannot see Region 02 schools | gov.toshkent | Schools list |
| Region 01 student directory contains no Region 02 students | gov.toshkent | Students list |
| Region 01 audit log has no Region 02 events | gov.toshkent | Audit log |
| Region 01 messages: no Region 02 school messages visible | gov.toshkent | Messages tab |

## Data Reconciliation Chain (Step 4)

Record in RECONCILIATION.md. Reference specific teacher→school→region→republic.

| Chain | Teacher | Parent see | Admin see | Region see | Republic see | Match? |
|---|---|---|---|---|---|---|
| Attendance today | teacher1 count | parent1 today tile | admin1 audit | gov.toshkent dashboard | gov.republic dashboard | — |
| Attendance today | teacher3 count | parent4/5/6 | admin2 | gov.toshkent | gov.republic | — |
| Ratings | parent1–3 ratings for teacher1 | teacher1 rating card | admin1 school ratings | gov.toshkent ratings | gov.republic ratings | — |
| Ratings | parent4–6 ratings for teacher3 | teacher3 rating card | admin2 | gov.toshkent | gov.republic | — |
| Ratings | parent7–9 for teacher5 | teacher5 rating card | admin3 | gov.samarqand | gov.republic | — |
| Ratings | parent10–12 for teacher7 | teacher7 rating card | admin4 | gov.samarqand | gov.republic | — |
| Three-rating model | parent avg + gov rating | — | admin summary card | — | gov.republic school detail combined avg | — |
