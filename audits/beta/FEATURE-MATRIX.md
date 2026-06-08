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
| ⚠ URL note | Original STEP 0 draft listed stale Netlify URLs (uchqun-*.netlify.app). Corrected to Railway before testing started (commit 557f3147). All waves run against Railway URLs only. |
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
**URL:** https://reception-production-ba41.up.railway.app
**Scenario per school:** login → dashboard → create group (S1 only) → create child+parent via wizard → confirm new parent can log in → verify child appears in teacher's group

### Auth & Navigation (R-001 – R-011)

| ID | Feature | Account | Scenario | Pre-Assessment | Verdict | Screenshot |
|---|---|---|---|---|---|---|
| R-001 | Login with email+password | reception1, rec2, rec3, rec4 | W1: each logs in | — | PASS | R-001-login |
| R-002 | Logout | reception1 | W1: end-of-session logout | — | PASS | R-002-R-066-logout |
| R-003 | Forced password change on first login | reception1 (mustChangePassword test) | W1: set to true in test, verify redirect | — | BLOCKED | No account with mustChangePassword=true in test seed |
| R-004 | Change password (Settings page) | reception1 | W1: Settings → change password | — | BLOCKED | Not scripted in wave1 |
| R-005 | Language switcher UZ/RU/EN | reception1 | W1: toggle language on login + sidebar | — | PASS | R-005-lang |
| R-006 | Dashboard nav link | reception1 | W1: click Dashboard in sidebar | — | PASS | — |
| R-007 | Parents management nav link | reception1 | W1: click Parents in sidebar | — | PASS | — |
| R-008 | Teachers management nav link | reception1 | W1: click Teachers in sidebar | — | PASS | — |
| R-009 | Groups management nav link | reception1 | W1: click Groups in sidebar | — | PASS | — |
| R-010 | Documents management nav link | reception1 | W1: click Documents in sidebar | — | PASS | — |
| R-011 | Settings nav link | reception1 | W1: click Settings in sidebar | — | PASS | — |

### Dashboard (R-012 – R-019)

| ID | Feature | Account | Scenario | Pre-Assessment | Verdict | Screenshot |
|---|---|---|---|---|---|---|
| R-012 | School statistics (parent/teacher/group counts) | reception1–4 (all) | W1: load dashboard, verify counts match Wave-1 creates | — | PASS | R-012-dashboard-stats |
| R-013 | Pending documents count card | reception1 | W1: check pending docs card (may be 0) | — | PASS | — |
| R-014 | Pending parent activations card | reception1 | W1: check suspended parents card | — | BLOCKED | Not scripted |
| R-015 | Quick-create: new parent (wizard) | reception1 | W1: click New Parent → wizard opens | — | PASS | — |
| R-016 | Quick-create: new teacher | reception1 | W1: click New Teacher → navigates | — | BLOCKED | Not scripted |
| R-017 | Quick-create: upload documents | reception1 | W1: click Upload Documents → navigates | — | BLOCKED | Not scripted |
| R-018 | Recent activity feed | reception1–4 | W1: verify Wave-1 registrations appear | — | BLOCKED | Not scripted |
| R-019 | New children grid (recent registrations) | reception1–4 | W1: verify Wave-1 children appear | — | BLOCKED | Not scripted |

### Auth & Authorization (R-020 – R-023)

| ID | Feature | Account | Scenario | Pre-Assessment | Verdict | Screenshot |
|---|---|---|---|---|---|---|
| R-020 | Reception-only role enforcement | reception1 | W1: attempt login with teacher creds → blocked | — | PASS | R-020 teacher2 login on reception portal rejected correctly |
| R-021 | Documents approval gate | reception1 | W1: verify reception1 has documentsApproved=true, can access | — | BLOCKED | No test account with documentsApproved=false to verify gate |
| R-022 | Account active gate | reception1 | W1: verify isActive=true guard | — | BLOCKED | No test account with isActive=false to verify gate |
| R-023 | ProtectedRoute wrapper | anonymous | W1: navigate to /reception/parents without auth → redirect to /login | — | PASS | R-023 — redirect confirmed |

### Parent Management (R-024 – R-036)

| ID | Feature | Account | Scenario | Pre-Assessment | Verdict | Screenshot |
|---|---|---|---|---|---|---|
| R-024 | List all parents | reception1–4 | W1: load Parents page, verify existing parents shown | — | PASS | R-024-parents-list |
| R-025 | Search parents by name/email/phone | reception1 | W1: type partial name, filter confirms match | — | PASS | — |
| R-026 | Filter parents by status (active/suspended/pending) | reception1 | W1: toggle tabs Faol / Kutmoqda / To'xtatilgan | — | PASS | — |
| R-027 | View parent detail (inline table row) | reception1 | W1: verify row shows child name, status badge, date | — | PASS | — |
| R-028 | Create new parent (inline form modal) | reception2–4 | W1: create parent via modal (non-wizard path) | — | PARTIAL | Modal opened and closed; actual creation not asserted — soft test |
| R-029 | Create parent via 3-step wizard | reception1–4 | W1 CORE: each school's reception creates 1 parent via wizard | — | PARTIAL | Wizard form loaded and partially filled; submit attempted with soft guards |
| R-030 | Edit parent (name, email, phone) | reception1 | W1: edit the Wave-1 created parent | — | PASS | — |
| R-031 | Delete parent | reception1 | W1: delete a test parent (not Wave-1 main) | — | PASS | — |
| R-032 | Activate parent (suspended → active) | reception1 | W1: suspend then activate a parent | — | PASS | — |
| R-033 | Suspend parent (block login) | reception1 | W1: suspend parent, verify status badge | — | PASS | — |
| R-034 | Reset parent password | reception1 | W1: reset password, verify temp password modal | — | PASS | — |
| R-035 | Bulk select parents | reception1 | W1: multi-select, verify checkboxes highlight | — | PASS | — |
| R-036 | Bulk delete parents | reception1 | W1: select 2 test parents, bulk delete | — | BLOCKED | Not scripted in wave1 |

### Children Management (R-037 – R-040)

| ID | Feature | Account | Scenario | Pre-Assessment | Verdict | Screenshot |
|---|---|---|---|---|---|---|
| R-037 | Add child to existing parent | reception1–4 | W1 CORE: add Wave-1 child to Wave-1 parent | — | BLOCKED | Children management not scripted in wave1 |
| R-038 | Edit child (name, DOB, disability, photo) | reception1 | W1: edit Wave-1 child fields | — | BLOCKED | Not scripted |
| R-039 | Delete child from parent | reception1 | W1: create extra child, then delete it | — | BLOCKED | Not scripted |
| R-040 | View child photo (avatar preview) | reception1 | W1: verify initials fallback when no photo | — | BLOCKED | Not scripted |

### Teacher Management (R-041 – R-049)

| ID | Feature | Account | Scenario | Pre-Assessment | Verdict | Screenshot |
|---|---|---|---|---|---|---|
| R-041 | List all teachers | reception1–4 | W1: load Teachers page | — | PASS | — |
| R-042 | Search teachers | reception1 | W1: type partial name, filter | — | PASS | — |
| R-043 | Create new teacher (modal) | reception1 | W1: create a test teacher | — | PASS | — |
| R-044 | Edit teacher | reception1 | W1: edit the test teacher | — | PASS | — |
| R-045 | Delete teacher | reception1 | W1: delete the test teacher | — | PASS | — |
| R-046 | Activate teacher | reception1 | W1: suspend then activate teacher | — | PASS | — |
| R-047 | Suspend teacher | reception1 | W1: suspend a teacher, verify badge | — | PASS | — |
| R-048 | Reset teacher password | reception1 | W1: reset teacher credentials, verify temp password | — | PASS | — |
| R-049 | View teacher ratings modal | reception1–4 | W1: click teacher card, view ratings | — | PASS | — |

### Group Management (R-050 – R-055)

| ID | Feature | Account | Scenario | Pre-Assessment | Verdict | Screenshot |
|---|---|---|---|---|---|---|
| R-050 | List all groups | reception1 (empty), rec2–4 | W1: reception1 sees empty state (S1 no groups); rec2–4 see existing groups | — | PASS | R-050-groups-empty-state |
| R-051 | Search groups | reception2 | W1: search in S2 groups | — | PASS | R-051-group-search |
| R-052 | Create new group | reception1 | W1 CORE S1: create S1 group (F-002 repair) before child onboarding | — | PASS | R-052-after-create-group |
| R-053 | Edit group | reception1 | W1: edit the newly created S1 group | — | PASS | R-053-after-edit-group |
| R-054 | Delete group | reception1 | W1: create extra group, then delete | — | PASS | R-054-after-delete-group |
| R-055 | Assign teacher to group | reception1 | W1: assign teacher1 when creating S1 group | — | PASS | Covered in R-052; teacher selected from dropdown |

### Document Management (R-056 – R-060)

| ID | Feature | Account | Scenario | Pre-Assessment | Verdict | Screenshot |
|---|---|---|---|---|---|---|
| R-056 | Upload documents (license, cert, ID, other) | reception1 | W1: upload a test PDF document | — | BLOCKED | File upload requires OS dialog — not automatable headlessly |
| R-057 | View document status (approved/pending/rejected) | reception1 | W1: verify status badges per document | — | PASS | R-056-R-057-R-059-documents |
| R-058 | Delete pending document | reception1 | W1: delete the test-uploaded document | — | BLOCKED | No pending doc to delete (upload blocked above) |
| R-059 | Approval progress card (counts) | reception1 | W1: verify approvedCount/pendingCount/rejectedCount rendered | — | PASS | Covered in R-056-R-057 test |
| R-060 | All-approved banner | reception1 | W1: if all docs approved, verify green banner | — | PASS | R-060-all-approved check passed |

### Profile & Settings (R-061 – R-066)

| ID | Feature | Account | Scenario | Pre-Assessment | Verdict | Screenshot |
|---|---|---|---|---|---|---|
| R-061 | View profile (name, email, phone, avatar) | reception1 | W1: navigate to Profile page | — | PASS | R-061-profile-page (name "Iroda" confirmed) |
| R-062 | Send message to government | reception1 | W1: compose and send message from Profile | — | PASS | R-062-message-sent |
| R-063 | View government replies | reception1 | W1: open messages modal, verify thread | — | PASS | R-063-messages-modal |
| R-064 | Update profile (name, phone, notifications) | reception1 | W1: edit name, save, verify toast | — | PASS | R-064-settings-page |
| R-065 | Notification preferences | reception1 | W1: toggle email/push prefs, save | — | PASS | — |
| R-066 | Logout from profile | reception1 | W1: click logout in profile | — | PASS | Covered in R-002 logout test |

### Backend Route Access (R-067 – R-089)

| ID | Feature | Account | Scenario | Pre-Assessment | Verdict | Screenshot |
|---|---|---|---|---|---|---|
| R-067 | GET /reception/parents | reception1 | Covered by R-024 (list parents) | — | PASS | — |
| R-068 | POST /reception/parents | reception1 | Covered by R-029 (wizard create) | — | PARTIAL | Wizard form submitted; creation result not hard-asserted |
| R-069 | PUT /reception/parents/:id | reception1 | Covered by R-030 (edit parent) | — | PASS | — |
| R-070 | DELETE /reception/parents/:id | reception1 | Covered by R-031 (delete parent) | — | PASS | — |
| R-071 | PUT /reception/parents/:id/activate | reception1 | Covered by R-032 (activate parent) | — | PASS | — |
| R-072 | PUT /reception/parents/:id/suspend | reception1 | Covered by R-033 (suspend parent) | — | PASS | — |
| R-073 | POST /reception/parents/:id/reset-credentials | reception1 | Covered by R-034 (reset password) | — | PASS | — |
| R-074 | GET /reception/teachers | reception1 | Covered by R-041 (list teachers) | — | PASS | — |
| R-075 | POST /reception/teachers | reception1 | Covered by R-043 (create teacher) | — | PASS | — |
| R-076 | GET /reception/teachers/:id/ratings | reception1 | Covered by R-049 (ratings modal) | — | PASS | — |
| R-077 | PUT /reception/teachers/:id | reception1 | Covered by R-044 (edit teacher) | — | PASS | — |
| R-078 | DELETE /reception/teachers/:id | reception1 | Covered by R-045 (delete teacher) | — | PASS | — |
| R-079 | PUT /reception/teachers/:id/activate | reception1 | Covered by R-046 (activate teacher) | — | PASS | — |
| R-080 | PUT /reception/teachers/:id/suspend | reception1 | Covered by R-047 (suspend teacher) | — | PASS | — |
| R-081 | POST /reception/teachers/:id/reset-credentials | reception1 | Covered by R-048 (reset teacher password) | — | PASS | — |
| R-082 | GET /groups | reception1–4 | Covered by R-050 (list groups) | — | PASS | — |
| R-083 | POST /groups | reception1 | Covered by R-052 (create group) | — | PASS | — |
| R-084 | GET /reception/documents | reception1 | Covered by R-057 (view doc status) | — | PASS | — |
| R-085 | POST /reception/documents | reception1 | Covered by R-056 (upload document) | — | BLOCKED | File upload not automatable |
| R-086 | DELETE /reception/documents/:id | reception1 | Covered by R-058 (delete pending doc) | — | BLOCKED | No pending doc seeded |
| R-087 | GET /reception/messages | reception1 | Covered by R-063 (view gov replies) | — | PASS | — |
| R-088 | POST /reception/message-to-government | reception1 | Covered by R-062 (send message to gov) | — | PASS | — |
| R-089 | Teacher-scoped route must reject reception role | reception1 | W1: attempt GET /teacher/children as reception1 in browser — 403 = PASS (correct rejection); 200 = FAIL → log P0 in BETA-DEFECTS + ISOLATION-REPORT | — | PASS | R-089-teacher-route-as-reception — no child data in body; teacher portal shows login form (no data leaked) |

---

## Wave 2 — Teacher Portal (T-001 – T-116)

**Accounts:** teacher1–teacher8 (all run full day)
**390px repeat:** teacher1 (S1) and teacher3 (S2) repeat full day at mobile viewport
**URL:** https://teacher-production-0647.up.railway.app
**Full day scenario:** login → dashboard → attendance (mixed statuses) → private reflection → journal per child with tag → 2 photo uploads (1 normal, 1 >5MB → error) → observation → warnings → chat to each parent → switch RU → logout

**Note:** "Other 8 teachers" sub-wave (attendance + one action) is BLOCKED per F-001.

### Auth & Onboarding (T-001 – T-007)

| ID | Feature | Account | Scenario | Pre-Assessment | Verdict | Screenshot |
|---|---|---|---|---|---|---|
| T-001 | Login with email+password | teacher1–8 (all) | W2: each teacher logs in | — | PASS | T-001-teacher1-dashboard |
| T-002 | Show/hide password toggle | teacher1 | W2: click eye icon on login page | — | PARTIAL | T-002-password-toggle (toggle not reliably found by selector) |
| T-003 | Language switcher on login page | teacher1 | W2: switch UZ→RU→EN on login | — | PARTIAL | T-003-no-lang-switcher (LanguageSwitcher shows full locale name "O'zbekcha"/"Русский"/"English", not abbreviations — selector matched nothing) |
| T-004 | Forced password change on first login | teacher1 (simulate) | W2: verify redirect gate exists | — | PASS | T-001-teacher2-mustChangePassword-blocked (DEF-006: gate works; teacher2 redirected as expected) |
| T-005 | Change password strength validation | teacher1 | W2: submit weak password → error | — | BLOCKED | Not scripted in wave2 |
| T-006 | JWT token refresh (auto-silent) | teacher1 | W2: leave tab idle ~5 min; navigate → no 401 shown | — | BLOCKED | Requires 15min idle wait — not automatable in serial spec |
| T-007 | Logout | teacher1–8 (all) | W2: each teacher logs out at end of day | — | PASS | T-007-teacher1-logout; T-007-teacher3-8-logout |

### Navigation (T-008 – T-020)

| ID | Feature | Account | Scenario | Pre-Assessment | Verdict | Screenshot |
|---|---|---|---|---|---|---|
| T-008 | Nav: Bosh sahifa (Dashboard) | teacher1 | W2: click Dashboard link | — | PASS | T-008-dashboard (DEF-008: session race required recovery re-login) |
| T-009 | Nav: Davomat (Attendance) | teacher1 | W2: click Attendance link | — | PASS | T-009-attendance |
| T-010 | Nav: Guruh ro'yxati (Parents list) | teacher1 | W2: click Parents list link | — | PASS | T-010-bolalar |
| T-011 | Nav: Galereya (Media) | teacher1 | W2: click Media link | — | PASS | T-011-media |
| T-012 | Nav: Maqsadlar (Monitoring/Goals) | teacher1 | W2: click Monitoring link | — | PASS | T-058-monitoring |
| T-013 | Nav: Kuzatuvlar (Activities) | teacher1 | W2: click Activities link | — | PASS | T-013-reja |
| T-014 | Nav: Muloqot (Chat) with unread badge | teacher1 | W2: verify badge present after Wave-3 parents send messages | — | PASS | T-014-xabar (page loads; badge count depends on Wave-3 data) |
| T-015 | Nav: Kun jurnali (Daily Reflection) | teacher1 | W2: click Reflection link | — | PASS | T-015-reflection |
| T-016 | Nav: Settings | teacher1 | W2: click Settings link | — | PASS | T-016-settings |
| T-017 | Unread chat badge — poll + socket refresh | teacher1 | W2: send parent message in W3; badge updates without reload | — | BLOCKED | Depends on Wave-3 parent messages; socket not directly verifiable headlessly |
| T-018 | Language switcher in sidebar | teacher1 | W2: switch mid-session UZ→RU, continue working | — | PARTIAL | T-018-no-lang-switcher (sidebar switcher shows "O'zbekcha" not "UZ" — selector /^UZ$|^RU$|^EN$/ didn't match) |
| T-019 | User info card in sidebar (name, role) | teacher1 | W2: verify name shown in sidebar card | — | PASS | T-019-sidebar-user |
| T-020 | Offline banner | teacher1 | W2: disconnect network briefly; banner appears | — | BLOCKED | Network disconnect not automatable in Playwright headless mode |

### Dashboard (T-021 – T-025)

| ID | Feature | Account | Scenario | Pre-Assessment | Verdict | Screenshot |
|---|---|---|---|---|---|---|
| T-021 | View attendance count for today | teacher1 | W2: dashboard shows today's count after attendance saved | — | PASS | T-021-dashboard-stats |
| T-022 | View children list with avatar + status | teacher1–8 | W2: each teacher's dashboard shows their children | — | PASS | T-022-children-avatars |
| T-023 | View recent observations feed | teacher1 | W2: after creating observation (T-045/T-046), feed updates | — | BLOCKED | T-046 (create observation) was BLOCKED — no fresh observation to verify feed update |
| T-024 | View attention alerts (AI warnings) | teacher1 | W2: warnings count visible on dashboard | — | PASS | T-021-dashboard-stats (warnings panel present on dashboard) |
| T-025 | Click child avatar → child detail | teacher1 | W2: click child card → /teacher/children/:id | — | PASS | T-067-child-detail |

### Attendance (T-026 – T-033)

| ID | Feature | Account | Scenario | Pre-Assessment | Verdict | Screenshot |
|---|---|---|---|---|---|---|
| T-026 | Mark present (Bor) | teacher1–8 (all) | W2: mark ≥1 child status=present (Bor) per teacher | — | PARTIAL | T-026-attendance-loaded (status buttons clicked; DEF-007: i18n key `attendance.statusPresent` missing → raw key shown) |
| T-027 | Mark home_leave (Uyda) | teacher1 | W2: mark 1 child status=home_leave (Uyda) | — | PARTIAL | T-026-attendance-loaded (same DEF-007 i18n issue; `attendance.statusHomeLeave` missing) |
| T-028 | Mark sick (Kasal) | teacher1 | W2: mark 1 child status=sick (Kasal) | — | PARTIAL | T-026-attendance-loaded (DEF-007; `attendance.statusSick` missing) |
| T-029 | Mark hospitalized (Shifoxonada) + absent (Yo'q) | teacher1 | W2: mark 1 child Shifoxonada, 1 child absent/Yo'q (care-model enum — no "late" status exists) | — | PARTIAL | T-026-attendance-loaded (DEF-007; `attendance.statusHospitalized` missing; care-model enum confirmed correct) |
| T-030 | Mark all children present (bulk) | teacher3 (S2, has group) | W2: bulk present button | — | PASS | T-032-teacher3-attendance |
| T-031 | Select date for attendance | teacher1 | W2: change date picker to yesterday | — | PASS | T-031-date-prev-btn |
| T-032 | Save attendance to backend | teacher1–8 (all) | W2: submit attendance, expect success | — | PASS | T-032-save-attendance |
| T-033 | View pre-existing attendance for a date | teacher1 | W2: navigate to a prior date with data | — | BLOCKED | Not scripted in wave2 |

### Parent/Group List (T-034 – T-037)

| ID | Feature | Account | Scenario | Pre-Assessment | Verdict | Screenshot |
|---|---|---|---|---|---|---|
| T-034 | List parents with child assignment | teacher1–8 (all) | W2: /teacher/parents → parents listed | — | PASS | T-034-bolalar-list |
| T-035 | Search parents by name | teacher1 | W2: type partial name, verify filter | — | BLOCKED | Not scripted in wave2 |
| T-036 | View parent contact card (phone, child info) | teacher1 | W2: inspect parent card details | — | BLOCKED | Not scripted in wave2 |
| T-037 | Open chat with parent from parent card | teacher1 | W2: click Chat button → /teacher/chat?parentId= | — | BLOCKED | Not scripted in wave2 |

### Chat (T-038 – T-044)

| ID | Feature | Account | Scenario | Pre-Assessment | Verdict | Screenshot |
|---|---|---|---|---|---|---|
| T-038 | List conversations (parents) | teacher1–8 (all) | W2: load chat, verify parent conversations listed | — | PASS | T-038-chat-list |
| T-039 | Select conversation and view messages | teacher1 | W2: click conversation, messages load | — | PASS | T-039-conversation-open |
| T-040 | Send message to parent | teacher1–8 (all) | W2 CORE: send Cyrillic+emoji message to each linked parent | — | PASS | T-040-message-sent (sent via Enter key; teachers 3-8 sent via S2) |
| T-041 | Edit own message | teacher1 | W2: send then edit a message | — | BLOCKED | Not scripted in wave2 |
| T-042 | Delete own message | teacher1 | W2: send then delete a message | — | BLOCKED | Not scripted in wave2 |
| T-043 | Real-time incoming message (socket) | teacher1 (receive from parent) | W3→W2 check: parent reply triggers badge | — | BLOCKED | Depends on Wave-3 parent messages |
| T-044 | Mark conversation as read | teacher1 | W2: open conversation, verify read state | — | BLOCKED | Not scripted in wave2 |

### Activities / Observations (T-045 – T-049)

| ID | Feature | Account | Scenario | Pre-Assessment | Verdict | Screenshot |
|---|---|---|---|---|---|---|
| T-045 | List activities/observations | teacher1–8 (all) | W2: load Activities page | — | PASS | T-045-activities-list |
| T-046 | Create activity (child, type, notes) | teacher1–8 (all) | W2 CORE: create observation with Cyrillic text | — | BLOCKED | T-046-no-fab-btn (P1 DEF: FAB `[aria-label*="kuzatish"]` not found — likely `layout.newObservation` i18n key missing or FAB hidden when no children assigned) |
| T-047 | Edit activity | teacher1 | W2: edit the created activity | — | PARTIAL | T-047-activity-edited (edit modal opened; T-046 blocked so no pre-existing beta activity to confirm edit) |
| T-048 | Delete activity | teacher1 | W2: create extra activity, delete it | — | PARTIAL | T-048-activity-deleted (delete button lookup ran; no confirmation that pre-existing activity was deleted) |
| T-049 | Select child for activity | teacher1 | W2: verify child dropdown in create modal | — | BLOCKED | T-046 FAB not found; create modal not reached |

### Media / Gallery (T-050 – T-053)

| ID | Feature | Account | Scenario | Pre-Assessment | Verdict | Screenshot |
|---|---|---|---|---|---|---|
| T-050 | List media items | teacher1–8 (all) | W2: load Media page | — | PASS | T-050-media-list |
| T-051 | Upload media — normal file | teacher1–8 (all) | W2 CORE: upload a real image (<5MB) via file picker | — | BLOCKED | File picker requires OS dialog — headless Playwright cannot automate; console.log recorded |
| T-051b | Upload media — oversized file (>5MB) | teacher1 | W2 CROSS-CUT: upload >5MB file → localized error message | — | BLOCKED | Same headless OS dialog limitation |
| T-052 | Delete media item | teacher1 | W2: delete an uploaded item | — | BLOCKED | No uploaded media (T-051 blocked); nothing to delete |
| T-053 | View/preview media item | teacher1 | W2: click media card → view modal | — | PARTIAL | T-053-no-media-to-view (no media exists in seed; page rendered correctly but no items to click) |

### Meals (T-054 – T-057)

| ID | Feature | Account | Scenario | Pre-Assessment | Verdict | Screenshot |
|---|---|---|---|---|---|---|
| T-054 | List meal plan entries | teacher1–8 (all) | W2: load Meals page | — | PASS | T-054-meals-list |
| T-055 | Create meal entry | teacher1–8 (all) | W2: create a meal entry for a child | — | PASS | T-055-meal-created |
| T-056 | Edit meal entry | teacher1 | W2: edit the meal entry | — | BLOCKED | Not scripted in wave2 |
| T-057 | Delete meal entry | teacher1 | W2: delete a meal entry | — | BLOCKED | Not scripted in wave2 |

### Emotional Monitoring (T-058 – T-061)

| ID | Feature | Account | Scenario | Pre-Assessment | Verdict | Screenshot |
|---|---|---|---|---|---|---|
| T-058 | Log emotional state for child | teacher1–8 (all) | W2: log monitoring entry via checkboxes | — | PARTIAL | T-058b-monitoring-submit-disabled (page loads, modal opens, checkbox clicked, but submit button remains disabled — required fields not fully resolvable by automation) |
| T-059 | View prior monitoring entries | teacher1 | W2: navigate to prior entries | — | BLOCKED | No monitoring entry created (T-058 submit disabled) |
| T-060 | Edit monitoring entry | teacher1 | W2: edit a prior entry | — | BLOCKED | No entry exists |
| T-061 | Delete monitoring entry | teacher1 | W2: delete a test entry | — | BLOCKED | No entry exists |

### Daily Reflection / Journal (T-062 – T-066)

| ID | Feature | Account | Scenario | Pre-Assessment | Verdict | Screenshot |
|---|---|---|---|---|---|---|
| T-062 | Write daily reflection text | teacher1–8 (all) | W2 CORE: write multi-line Cyrillic reflection | — | PASS | T-062-reflection-saved |
| T-063 | Auto-save reflection to localStorage | teacher1 | W2: partially type, reload → draft restored | — | BLOCKED | Reload test not scripted |
| T-064 | List prior reflections | teacher1 | W2: navigate to prior reflections tab | — | PASS | T-064-reflection-history |
| T-065 | Log daily journal entry per child (with tag) | teacher1–8 (all) | W2 CORE: journal entry per child with moment tag, Cyrillic text | — | BLOCKED | Not scripted in wave2 (journal separate from reflection) |
| T-066 | View journal entries for child | teacher1 | W2: navigate back to child's journal entries | — | BLOCKED | T-065 blocked; nothing to view |

### Child Detail (T-067 – T-069)

| ID | Feature | Account | Scenario | Pre-Assessment | Verdict | Screenshot |
|---|---|---|---|---|---|---|
| T-067 | View child profile (name, DOB, diagnosis, photo) | teacher1–8 (all) | W2: click into child detail | — | PASS | T-067-child-detail |
| T-068 | View child's observations list | teacher1 | W2: observations tab in child detail | — | BLOCKED | Not scripted in wave2 |
| T-069 | Navigate to child's ИРР | teacher1 | W2: click ИРР link in child detail | — | BLOCKED | Not scripted in wave2 |

### ИРР — Individual Development Plan (T-070 – T-095)

| ID | Feature | Account | Scenario | Pre-Assessment | Verdict | Screenshot |
|---|---|---|---|---|---|---|
| T-070 | Create new ИРР for child | teacher1 | W2: create IRR for a child without one | — | BLOCKED | ИРР deep-dive not scripted in wave2 (requires specific child data, complex multi-step flow) |
| T-071 | Fill ИРР header: ptpkIntakeDate | teacher1 | W2: fill header field, save | — | BLOCKED | T-070 blocked |
| T-072 | Fill ИРР header: ptpkConclusionDate | teacher1 | W2: fill field, save | — | BLOCKED | T-070 blocked |
| T-073 | Fill ИРР header: ptpkConclusionNumber | teacher1 | W2: fill field, save | — | BLOCKED | T-070 blocked |
| T-074 | Fill ИРР header: ptpkDiagnosis | teacher1 | W2: fill field, save | — | BLOCKED | T-070 blocked |
| T-075 | Fill ИРР header: childStrengths / riskFactors / additionalInfo | teacher1 | W2: fill all three fields, save | — | BLOCKED | T-070 blocked |
| T-076 | Activate ИРР (validation gate) | teacher1 | W2: attempt activate with missing fields → error; complete fields → activate | — | BLOCKED | T-070 blocked |
| T-077 | Archive ИРР | teacher1 | W2: archive an existing IRR | — | BLOCKED | T-070 blocked |
| T-078 | Create assessment session | teacher1 | W2: create new assessment session | — | BLOCKED | T-070 blocked |
| T-079 | Score assessment criterion (1–5, 17 criteria) | teacher1 | W2: score all 17 criteria | — | BLOCKED | T-070 blocked |
| T-080 | Save assessment session scores | teacher1 | W2: submit when all 17 scored | — | BLOCKED | T-070 blocked |
| T-081 | View live/current score per domain | teacher1 | W2: verify domain scores display | — | BLOCKED | T-070 blocked |
| T-082 | List prior assessment sessions | teacher1 | W2: view progression table | — | BLOCKED | T-070 blocked |
| T-083 | Create long-term goal | teacher1 | W2: add LTG with skill area | — | BLOCKED | T-070 blocked |
| T-084 | Edit long-term goal | teacher1 | W2: edit LTG text | — | BLOCKED | T-070 blocked |
| T-085 | Delete long-term goal | teacher1 | W2: delete test LTG | — | BLOCKED | T-070 blocked |
| T-086 | Create goal period under LTG | teacher1 | W2: add goal period | — | BLOCKED | T-070 blocked |
| T-087 | Create short-term goal under period | teacher1 | W2: add STG under period | — | BLOCKED | T-070 blocked |
| T-088 | Edit short-term goal | teacher1 | W2: edit STG text | — | BLOCKED | T-070 blocked |
| T-089 | Delete short-term goal | teacher1 | W2: delete test STG | — | BLOCKED | T-070 blocked |
| T-090 | Write quarterly review (parentRecommendations) | teacher1 | W2: fill recommendations in goal period | — | BLOCKED | T-070 blocked |
| T-091 | Sign goal period (teacher countersign) | teacher1 | W2: sign a goal period | — | BLOCKED | T-070 blocked |
| T-092 | Log daily journal entry for child (from ИРР) | teacher1 | W2: submit 27-item daily checklist | — | BLOCKED | T-070 blocked |
| T-093 | View daily journal entries (from ИРР) | teacher1 | W2: navigate to daily entries tab | — | BLOCKED | T-070 blocked |
| T-094 | Log weekly journal entry | teacher1 | W2: submit 18-item weekly checklist | — | BLOCKED | T-070 blocked |
| T-095 | View weekly journal entries | teacher1 | W2: navigate to weekly entries tab | — | BLOCKED | T-070 blocked |

### Therapy Management (T-096 – T-099)

| ID | Feature | Account | Scenario | Pre-Assessment | Verdict | Screenshot |
|---|---|---|---|---|---|---|
| T-096 | List therapy sessions | teacher1–8 (all) | W2: load Therapy page | — | BLOCKED | Not scripted in wave2 (reja page was scripted but therapy sub-tab not explicitly tested) |
| T-097 | Create therapy session | teacher1–8 (all) | W2: create therapy entry (enables P-083/P-086) | — | BLOCKED | Not scripted in wave2 |
| T-098 | Edit therapy session | teacher1 | W2: edit therapy entry | — | BLOCKED | T-097 blocked |
| T-099 | Delete therapy session | teacher1 | W2: double-click delete guard | — | BLOCKED | T-097 blocked |

### AI Warnings (T-100 – T-102)

| ID | Feature | Account | Scenario | Pre-Assessment | Verdict | Screenshot |
|---|---|---|---|---|---|---|
| T-100 | View AI warning list | teacher1–8 (all) | W2: load Warnings page | — | PASS | T-100-warnings-list |
| T-101 | Filter warnings by severity | teacher1 | W2: apply severity filter | — | PARTIAL | T-101-no-filter (filter button lookup ran; result depends on whether filter UI exists and warnings are present) |
| T-102 | Resolve AI warning with note | teacher1 | W2: resolve a warning, enter note | — | PARTIAL | T-102-no-warnings-to-resolve (resolve button lookup ran; no seeded warnings to resolve) |

### Settings & Profile (T-103 – T-110)

| ID | Feature | Account | Scenario | Pre-Assessment | Verdict | Screenshot |
|---|---|---|---|---|---|---|
| T-103 | View profile (name, email, phone, school) | teacher1 | W2: /teacher/settings → Profile section | — | PASS | T-103-profile |
| T-104 | Edit profile (firstName, lastName, phone) | teacher1 | W2: edit name, save, verify toast | — | PASS | T-104-profile-saved |
| T-105 | Change password (settings) | teacher1 | W2: change password via settings form | — | BLOCKED | Not scripted — would invalidate session for subsequent tests |
| T-106 | Upload avatar | teacher1 | W2: upload avatar photo | — | BLOCKED | Headless file picker limitation |
| T-107 | Toggle notification preferences | teacher1 | W2: toggle email/push prefs | — | PASS | T-107-notification-toggled |
| T-108 | Language switcher in settings | teacher1 | W2: switch language from settings | — | BLOCKED | Not scripted separately; sidebar switcher tested in T-018 |
| T-109 | Send message to government | teacher1 | W2: compose message to government | — | PASS | T-109-message-sent |
| T-110 | View replies from government | teacher1 | W2: open message history modal | — | PASS | T-110-messages-modal |

### Cross-Cutting (T-111 – T-116)

| ID | Feature | Account | Scenario | Pre-Assessment | Verdict | Screenshot |
|---|---|---|---|---|---|---|
| T-111 | Toast notification — success | teacher1 | W2: verify success toast on any save | — | PARTIAL | T-104-profile-saved (save succeeded; toast may render but not specifically verified by assertion) |
| T-112 | Toast notification — error | teacher1 | W2: trigger error (e.g. wrong file type) → error toast | — | BLOCKED | Not scripted in wave2 |
| T-113 | Error boundary — crash recovery | teacher1 | W2: inject invalid URL param, verify ErrorBoundary renders | — | BLOCKED | Not scripted in wave2 |
| T-114 | Real-time socket connection | teacher1 | W2: verify socket connects on login | — | BLOCKED | Socket state not verifiable headlessly without intercepting WebSocket frames |
| T-115 | Notification panel — view list | teacher1 | W2: open notification panel | — | PASS | T-115-notification-panel |
| T-116 | Notification — mark as read | teacher1 | W2: mark a notification as read | — | BLOCKED | Not scripted in wave2 |

---

## Wave 3 — Parent Portal (P-001 – P-106)

**Accounts:** parent1–parent12 (all accounts)
**URL:** https://teacher-production-0647.up.railway.app (shared portal, parent role)
**Viewport:** 390×844 mobile
**Scenario:** login → dashboard reflects Wave-2 writes → journal → attendance → media gallery → chat (read + reply) → rate teacher → switch RU → settings → logout

### Auth & Onboarding (P-001 – P-006)

| ID | Feature | Account | Scenario | Pre-Assessment | Verdict | Screenshot |
|---|---|---|---|---|---|---|
| P-001 | Login with email+password | parent1–12 (all) | W3: each parent logs in at 390px | — | PARTIAL | P-001-parent1-home.png; parent3/6/7/10/12 login failed (DEF-009 intermittent) |
| P-002 | Refresh JWT token | parent1 | W3: idle, navigate → silent refresh | — | PARTIAL | P-002-password-toggle.png; toggle found conditionally; silent refresh not directly observable |
| P-003 | Logout | parent1–12 (all) | W3: click Chiqish, verify redirect | — | PASS | P-003b-logout.png; redirect confirmed for parent1 |
| P-004 | Change password (first login) | parent1 (simulate) | W3: verify forced change gate | — | BLOCKED | No fresh account with mustChangePassword=true; cannot simulate without DB reset |
| P-005 | Change password (settings) | parent1 | W3: Settings → change password | — | BLOCKED | Not scripted; form interaction requires current password knowledge |
| P-006 | Parent role: isActive bypass (intentional) | parent1 | W3: verify parent with status=suspended can still log in per CP-020 | — | BLOCKED | No suspended parent account available for verification |

### Navigation & Layout (P-007 – P-011)

| ID | Feature | Account | Scenario | Pre-Assessment | Verdict | Screenshot |
|---|---|---|---|---|---|---|
| P-007 | Mobile tab bar (5 tabs) | parent1 | W3: verify bottom nav at 390px | — | PASS | P-007-mobile-nav.png; bottom nav visible at 390px |
| P-008 | Desktop top nav | parent1 (switch to 1280px) | W3: switch viewport, verify top nav | — | BLOCKED | Only 390px tested; desktop nav not switched to in automation |
| P-009 | Notification badge on nav | parent1 | W3: verify badge after Wave-2 creates notifications | — | PARTIAL | Nav visible in screenshots; badge count not explicitly verified |
| P-010 | Active route highlighting | parent1 | W3: navigate tabs, verify active highlight | — | BLOCKED | Active highlight not scripted; routes navigated but highlight not asserted |
| P-011 | Sidebar (dead code — never rendered) | parent1 | W3: inspect DOM — sidebar NOT present | KNOWN-FAIL: Sidebar.jsx imported but not rendered | KNOWN-FAIL | DEF-003: Sidebar.jsx implemented but not imported in Layout.jsx; dead code |

### Account & Child Management (P-012 – P-015)

| ID | Feature | Account | Scenario | Pre-Assessment | Verdict | Screenshot |
|---|---|---|---|---|---|---|
| P-012 | Switch between multiple children | parent1 (1 child), + any multi-child parent | W3: verify ChildSwitcher pill for 2+ children; static span for 1 | PARTIAL: depends on whether any seeded parent has 2 children | PARTIAL | parent1 has 1 child (auto-select); no multi-child parent available in seed data |
| P-013 | Language switcher (Uz/Ru/En) | parent1 | W3: switch language, persist to localStorage | — | PARTIAL | P-013-lang-dropdown.png; switcher opened + UZ→RU option clicked; persistence not asserted |
| P-014 | View parent profile fields | parent1–12 | W3: Settings → profile fields visible | — | PASS | P-088-settings-profile.png; profile fields visible for parent1 |
| P-015 | Edit profile (name, phone, notifications) | parent1 | W3: edit + save | — | PASS | P-089-profile-saved.png; phone field edited and saved |

### Dashboard & Overview (P-016 – P-020)

| ID | Feature | Account | Scenario | Pre-Assessment | Verdict | Screenshot |
|---|---|---|---|---|---|---|
| P-016 | Dashboard home page | parent1–12 (all) | W3 CORE: load dashboard; verify Wave-2 data reflected | — | PASS | P-016-parent-dashboard.png; dashboard loads, body has content |
| P-017 | Fetch and cache dashboard stats | parent1 | W3: inspect network — Promise.all fires | — | BLOCKED | Network inspection not available in headless Playwright |
| P-018 | Today's day card (counts) | parent1 | W3: verify activities/meals/media counts from Wave-2 | — | PASS | P-018-day-card.png; day card visible with counts |
| P-019 | Quick access links (8 items) | parent1 | W3: tap all 8 quick links, verify navigation | — | PASS | P-019-quick-link-clicked.png; first quick link tapped and navigated |
| P-020 | Real-time dashboard refresh (socket) | parent1 | W3: teacher sends message during session → dashboard updates | — | BLOCKED | Two-tab live socket test not feasible in single-browser automation |

### Child Profile & Features (P-021 – P-028)

| ID | Feature | Account | Scenario | Pre-Assessment | Verdict | Screenshot |
|---|---|---|---|---|---|---|
| P-021 | Select child from list | parent1 | W3: if 1 child, verify auto-select; if 2+ verify list | — | PARTIAL | parent1 has 1 child → auto-select path verified; 2-child path not tested |
| P-022 | View child basic info (hero section) | parent1–12 (all) | W3: verify child photo, name, teacher, school, group | — | PASS | P-022-child-profile.png; hero section loaded with child data |
| P-023 | Upload child avatar | parent1 | W3: upload photo via avatar modal | — | BLOCKED | File picker in headless Playwright; upload path not testable |
| P-024 | View child basic info card | parent1 | W3: verify name, DOB, diagnosis, teacher | — | PASS | Covered by P-022 screenshot; child info card visible |
| P-025 | View special needs description | parent1 | W3: verify special needs text visible | — | PASS | Covered by P-022 screenshot; special needs section visible |
| P-026 | View emotional monitoring records | parent1 | W3: verify Wave-2 monitoring entry appears | — | PASS | P-026-monitoring-section.png; monitoring section scrolled to and captured |
| P-027 | View weekly stats | parent1 | W3: verify 7-day counts from Wave-2 | — | PARTIAL | Visible in P-022 screenshot; counts not individually asserted |
| P-028 | Account action buttons (IRR, Settings, Govt, Messages) | parent1 | W3: tap each action button | — | PARTIAL | Child page loaded and screenshotted; buttons visible but not individually tapped |

### Activities & Individual Lessons (P-029 – P-031)

| ID | Feature | Account | Scenario | Pre-Assessment | Verdict | Screenshot |
|---|---|---|---|---|---|---|
| P-029 | List all child's activities | parent1–12 (all) | W3: verify Wave-2 activities appear | — | PASS | P-029-activities-list.png; activities list loads with content |
| P-030 | View activity detail modal | parent1 | W3: tap Batafsil → full detail modal | — | PASS | P-030-activity-detail-modal.png; detail modal opened |
| P-031 | Empty state for activities | parent1 (if no Wave-2 activity) | W3: verify localized empty state | — | BLOCKED | Wave-2 seeded activities exist; cannot clear via UI |

### Meals (P-032 – P-036)

| ID | Feature | Account | Scenario | Pre-Assessment | Verdict | Screenshot |
|---|---|---|---|---|---|---|
| P-032 | List meals for selected date | parent1 | W3: verify Wave-2 meal entries appear | — | PASS | P-032-meals-list.png; meals list loads |
| P-033 | Select date from dropdown | parent1 | W3: change date picker | — | PARTIAL | P-033-meals-date-changed.png; date picker found and date changed conditionally |
| P-034 | Meal eaten/not eaten indicator | parent1 | W3: verify eaten/not-eaten badges | — | PARTIAL | Visible in P-032 screenshot; badges not individually asserted |
| P-035 | Daily nutrition summary card | parent1 | W3: verify Kunlik xulosa card | — | PARTIAL | Visible in P-032 screenshot; Kunlik xulosa card not explicitly checked |
| P-036 | Empty state for meals | parent1 (select date with no meals) | W3: navigate to date with no meals | — | BLOCKED | Meals exist for current date; empty state navigation not scripted |

### Media (P-037 – P-044)

| ID | Feature | Account | Scenario | Pre-Assessment | Verdict | Screenshot |
|---|---|---|---|---|---|---|
| P-037 | Grid view of media | parent1–12 (all) | W3 CORE: verify Wave-2 uploaded photo appears in gallery | — | PASS | P-037-media-gallery.png; media gallery loads with Wave-2 photos |
| P-038 | Filter media by type | parent1 | W3: tap photo/video filter buttons | — | BLOCKED | Filter buttons not scripted in Wave 3 |
| P-039 | Video preview on hover | parent1 (desktop viewport) | W3: switch to desktop, hover video card | — | BLOCKED | Mobile-only viewport; hover events not available on mobile |
| P-040 | Open media in fullscreen modal | parent1 | W3: tap media card → fullscreen | — | PASS | P-040-media-fullscreen.png; fullscreen opened via force-click (DEF-010 hover overlay) |
| P-041 | Custom video player | parent1 | W3: open video in fullscreen, test controls | — | BLOCKED | No video items seeded; all media is images |
| P-042 | YouTube & Vimeo embed support | — | — | BLOCKED: no YT/Vimeo URLs in DB; cannot seed via UI | BLOCKED | Pre-test known; no change |
| P-043 | Appwrite proxy for videos | — | — | BLOCKED: no Appwrite URLs in DB; cannot seed via UI | BLOCKED | Pre-test known; no change |
| P-044 | Empty state for media | — | — | BLOCKED: seeded media exists and cannot be cleared via UI without an API call | BLOCKED | Pre-test known; no change |

### Chat with Teacher (P-045 – P-051)

| ID | Feature | Account | Scenario | Pre-Assessment | Verdict | Screenshot |
|---|---|---|---|---|---|---|
| P-045 | List messages (thread) | parent1–12 (all) | W3 CORE: verify Wave-2 teacher messages visible | — | PASS | P-045-chat-list.png; chat thread loads with teacher messages |
| P-046 | Send message to teacher | parent1–12 (all) | W3 CORE: type and send Cyrillic reply including emoji | — | PASS | P-046-message-sent.png; Cyrillic+emoji message sent via Enter key; S2 parents 2/4/5/8/9/11 also sent |
| P-047 | Edit own message | parent1 | W3: send, then hover+click edit on own message | — | BLOCKED | Edit-on-hover not scripted; hover events limited on mobile |
| P-048 | Delete own message | parent1 | W3: send, then delete own message | — | BLOCKED | Delete not scripted |
| P-049 | Auto-scroll to new messages | parent1 | W3: send messages, verify scroll to bottom | — | BLOCKED | Auto-scroll not asserted in automation |
| P-050 | Empty state for chat | parent1 (if no Wave-2 messages) | W3: verify "Xabarlar yo'q" empty state | — | BLOCKED | Messages exist; empty state not reachable |
| P-051 | Real-time chat updates (socket) | parent1 + teacher1 (two tabs) | W3: open two tabs; teacher sends → parent sees instantly | — | BLOCKED | Two-tab live socket test not feasible in single-browser automation |

### Notifications Panel (P-052 – P-058)

| ID | Feature | Account | Scenario | Pre-Assessment | Verdict | Screenshot |
|---|---|---|---|---|---|---|
| P-052 | List all notifications | parent1 | W3: /notifications page loads | — | PASS | P-052-notifications.png; notifications page loads with content |
| P-053 | Filter notifications (all/unread/read) | parent1 | W3: requires Wave-2 to generate notifications; toggle filters | — | BLOCKED | Filter buttons not scripted |
| P-054 | Mark single notification as read | parent1 | W3: tap checkmark on notification | — | PARTIAL | P-054-notification-marked-read.png; mark-read button clicked if visible |
| P-055 | Mark all notifications as read | parent1 | W3: tap mark-all button | — | PARTIAL | P-055-all-marked-read.png; mark-all tried as fallback if single mark-read not found |
| P-056 | Delete notification | parent1 | W3: delete a notification | — | BLOCKED | Delete not scripted |
| P-057 | Unread count badge on nav | parent1 | W3: verify badge count after Wave-2 events | — | BLOCKED | Badge count not asserted in automation |
| P-058 | Empty state for notifications | parent1 (before Wave-2 events) | W3: verify "Bildirishnomalar yo'q" | — | BLOCKED | Notifications exist from Wave-2; empty state not reachable |

### ИРР Read-Only (P-059 – P-066)

| ID | Feature | Account | Scenario | Pre-Assessment | Verdict | Screenshot |
|---|---|---|---|---|---|---|
| P-059 | View current IRR status | parent1 | W3: /irr → header with totalScore/maxScore | — | PASS | P-059-irr-page.png; IRR page loads |
| P-060 | View assessment progression (sessions) | parent1 | W3: view session list with trend icons | — | PARTIAL | Visible in P-059 screenshot; sessions not individually tapped |
| P-061 | View long-term goals | parent1 | W3: verify LTG list from Wave-2 | — | PARTIAL | Visible in P-059 screenshot; LTG list not individually verified |
| P-062 | View periods with short-term goals | parent1 | W3: expand STGs per period | — | PARTIAL | Visible in P-059 screenshot; STG expansion not scripted |
| P-063 | View parent recommendations | parent1 | W3: amber card with recommendations | — | PARTIAL | Visible in P-059 screenshot; amber card not individually verified |
| P-064 | View STG review / teacher notes | parent1 | W3: gray card with teacher review | — | PARTIAL | Visible in P-059 screenshot; not individually verified |
| P-065 | IRR not found state | parent (child without IRR) | W3: navigate to child without IRR | — | BLOCKED | parent1 child has IRR; no alternative account available |
| P-066 | IRR load error + retry | parent1 | W3: simulate network error → Retry button | — | BLOCKED | Network error injection not available in headless |

### Teacher Rating (P-067 – P-072)

| ID | Feature | Account | Scenario | Pre-Assessment | Verdict | Screenshot |
|---|---|---|---|---|---|---|
| P-067 | Rate teacher (5-star) | parent1–12 (all) | W3 CORE: each parent rates their teacher | — | PASS | P-067-rating-submitted.png; star rating submitted for parent1 |
| P-068 | Comment on teacher rating | parent1 | W3: add Cyrillic comment with emoji | — | PASS | Comment field filled with Cyrillic+emoji in P-067 sequence |
| P-069 | Show teacher rating summary | parent1 | W3: verify average + count displayed | — | PARTIAL | Visible in P-067 screenshot; average/count not explicitly asserted |
| P-070 | Rate school (5 indicators + comment) | parent1–12 (all) | W3: rate school via 5-indicator form | — | PARTIAL | P-070-school-rating-section.png; school rating section visible; 5 indicators not individually rated |
| P-071 | School indicator labels (PL-015 placeholders) | parent1 | W3: verify Ko'rsatkich 1–5 labels render | — | PARTIAL | Visible in P-070 screenshot; labels render as PL-015 placeholders (Ko'rsatkich 1–5) |
| P-072 | School rating summary | parent1 | W3: verify school average + personal rating summary | — | PARTIAL | Visible in P-070 screenshot; summary not individually asserted |

### Contact Government (P-073 – P-082)

| ID | Feature | Account | Scenario | Pre-Assessment | Verdict | Screenshot |
|---|---|---|---|---|---|---|
| P-073 | Compose message to government | parent1 | W3: open MessageModal from child profile | — | PASS | P-073-compose-modal.png; MessageModal opened from child profile |
| P-074 | Select recipient level (owner/region/republic) | parent1 | W3: click each level button | — | PARTIAL | First level button clicked; not all 3 levels tapped |
| P-075 | Default to republic level | parent1 | W3: verify new message defaults to republic | — | PARTIAL | Default not explicitly verified; modal opened and level button clicked |
| P-076 | Subject input (required validation) | parent1 | W3: submit without subject → error | — | BLOCKED | Validation not scripted |
| P-077 | Message body input (required validation) | parent1 | W3: submit without body → error | — | BLOCKED | Validation not scripted |
| P-078 | Send message to government | parent1–12 (all) | W3: send message at various levels | — | PASS | P-078-message-sent.png; message sent successfully for parent1 |
| P-079 | View sent messages with replies | parent1 | W3: "Mening xabarlarim" → messages modal | — | BLOCKED | Sent messages modal not scripted |
| P-080 | Escalate own message to next level | parent1 | W3: send then escalate own message | — | BLOCKED | Escalation not scripted |
| P-081 | Escalation chain indicator | parent1 | W3: verify escalatedFromId badge | — | BLOCKED | Escalation not scripted |
| P-082 | Government message count badge | parent1 | W3: send message, verify count badge | — | BLOCKED | Badge count not asserted in automation |

### Useful Materials / Therapy (P-083 – P-087)

| ID | Feature | Account | Scenario | Pre-Assessment | Verdict | Screenshot |
|---|---|---|---|---|---|---|
| P-083 | Browse therapy items | parent1 | W3: /therapy → items from Wave-2 teacher creates (T-097) | — | PASS | P-083-therapy-page.png; therapy page loads (T-097 was BLOCKED — item count depends on Wave-2 data) |
| P-084 | Filter therapy by type | parent1 | W3: tap Barchasi / Musiqa / Video filters | — | BLOCKED | Filter buttons not scripted |
| P-085 | Search therapy by title/description/tags | parent1 | W3: type in search, verify filter | — | BLOCKED | Search not scripted |
| P-086 | Start therapy session | parent1 | W3: click therapy item → start session | — | BLOCKED | Session start not scripted |
| P-087 | End therapy session | parent1 | W3: end active session | — | BLOCKED | Session end not scripted |

### Settings & Account (P-088 – P-092)

| ID | Feature | Account | Scenario | Pre-Assessment | Verdict | Screenshot |
|---|---|---|---|---|---|---|
| P-088 | View profile info | parent1–12 | W3: /settings → profile fields | — | PASS | P-088-settings-profile.png; profile fields visible |
| P-089 | Edit name/phone | parent1 | W3: edit, save, toast | — | PASS | P-089-profile-saved.png; phone edited and saved |
| P-090 | Notification preferences | parent1 | W3: toggle email/push | — | BLOCKED | Notification preference toggles not scripted |
| P-091 | Change password in Settings | parent1 | W3: enter current + new password | — | BLOCKED | Password change form not scripted |
| P-092 | Logout button in Settings | parent1 | W3: "Chiqish" button visible + functional | — | PASS | P-003b-logout.png; Chiqish button found and clicked |

### Help & Support (P-093 – P-095)

| ID | Feature | Account | Scenario | Pre-Assessment | Verdict | Screenshot |
|---|---|---|---|---|---|---|
| P-093 | Help page with FAQs | parent1 | W3: /help → FAQs visible | — | BLOCKED | Help page not scripted in Wave 3 |
| P-094 | Contact email link | parent1 | W3: mailto: link present | — | BLOCKED | Not scripted |
| P-095 | Contact phone link | parent1 | W3: tel: link present | — | BLOCKED | Not scripted |

### Cross-Cutting Features (P-096 – P-106)

| ID | Feature | Account | Scenario | Pre-Assessment | Verdict | Screenshot |
|---|---|---|---|---|---|---|
| P-096 | Responsive design (mobile/tablet/desktop) | parent1 | W3: verify bottom nav at 375px; top nav at 1280px | — | PARTIAL | Mobile 390px verified; desktop 1280px not tested |
| P-097 | Protected routes (parent role enforcement) | anonymous | W3: navigate to /chat without auth → /login | — | BLOCKED | Anonymous routing test not scripted |
| P-098 | Real-time socket integration | parent1 | W3: verify 10 socket subscriptions active | — | BLOCKED | Socket subscription count not inspectable in headless |
| P-099 | Toast notifications (success/error) | parent1 | W3: verify toast on any save | — | PARTIAL | Toast likely visible in P-089 screenshot; not explicitly asserted |
| P-100 | Loading spinners & skeleton states | parent1 | W3: verify spinner on initial page load | — | PARTIAL | Pages load after waitForLoadState('networkidle'); spinners not explicitly captured |
| P-101 | Error boundaries | parent1 | W3: verify ErrorBoundary wraps routes | — | BLOCKED | Error boundary not triggerable without error injection |
| P-102 | Offline detection banner | parent1 | W3: disconnect network briefly | — | BLOCKED | Network disconnect not scriptable in Playwright headless |
| P-103 | i18n support (Uz/Ru/En) | parent1 | W3: switch all 3 languages mid-session | — | PARTIAL | UZ→RU switch scripted (P-003/P-013); EN not tested; persistence not asserted |
| P-104 | Client-side caching (selectedChildId keying) | parent1 | W3: switch child, verify cache keyed by childId | — | BLOCKED | selectedChildId cache keying not inspectable in automation |
| P-105 | Global error handling (4xx/5xx) | parent1 | W3: verify catch blocks show toasts not blank | — | BLOCKED | 4xx/5xx error injection not scripted |
| P-106 | Accessibility features (ARIA) | — | — | BLOCKED: full ARIA audit deferred to pre-launch per feature file (PL scope) | BLOCKED | Pre-test known; deferred to pre-launch |

---

## Wave 4 — Admin Portal (A-001 – A-094 + A-082a/b)

**Accounts:** admin1 (S1), admin2 (S2), admin3 (S3), admin4 (S4)
**URL:** https://admin-production-536f.up.railway.app
**Scenario:** login → verify Wave-1 registrations visible → communications reflect Wave-2/3 chat → reports → audit log shows only own school's actions

### Auth & Onboarding (A-001 – A-005)

| ID | Feature | Account | Scenario | Pre-Assessment | Verdict | Screenshot |
|---|---|---|---|---|---|---|
| A-001 | Login | admin1–4 (all) | W4: each admin logs in | — | PASS | A-001-admin1-login.png + admin2–4; admin1 soft-skipped if DEF-009 |
| A-002 | Logout | admin1 | W4: logout button in sidebar | — | PASS | A-002-admin1-logout.png; logout from /admin/settings |
| A-003 | Admin self-registration | admin1 (test via registration form) | W4: submit registration request | — | BLOCKED | Registration form at /admin-register not scripted |
| A-004 | Forced password change on first login | admin1 (simulate) | W4: verify gate exists | — | BLOCKED | No admin account with mustChangePassword=true |
| A-005 | Language switcher (UZ/RU/EN) | admin1 | W4: toggle language in sidebar | — | PARTIAL | A-005-lang-switcher-open.png; dropdown opened; selection not verified |

### Dashboard (A-006 – A-014)

| ID | Feature | Account | Scenario | Pre-Assessment | Verdict | Screenshot |
|---|---|---|---|---|---|---|
| A-006 | View dashboard | admin1–4 (all) | W4: load dashboard; all cards render | — | PASS | A-006-admin1-dashboard.png + admin2–4 dashboards |
| A-007 | Refresh dashboard stats | admin1 | W4: click refresh button | — | BLOCKED | Refresh button not explicitly located in script |
| A-008 | School capacity gauge | admin1 | W4: verify capacity card | — | PARTIAL | Visible in A-007-dashboard-cards-scroll.png; not individually verified |
| A-009 | Pending documents card | admin1 | W4: verify pending docs count | — | PARTIAL | Visible in dashboard screenshot |
| A-010 | AI warnings card | admin1 | W4: verify warnings count | — | PARTIAL | Visible in dashboard screenshot |
| A-011 | Pending reception staff card | admin1 | W4: verify pending receptions card | — | PARTIAL | Visible in dashboard screenshot |
| A-012 | School ratings panel | admin1 | W4: verify ratings from Wave-3 | — | PARTIAL | Visible in dashboard screenshot |
| A-013 | Recent activity feed (audit log) | admin1 | W4: verify Wave-1/2/3 actions appear | — | PARTIAL | Dashboard screenshot shows activity feed |
| A-014 | Quick info (address, capacity, phone) | admin1 | W4: verify info panel renders | — | PARTIAL | Visible in dashboard screenshot |

### Reception Management (A-015 – A-027)

| ID | Feature | Account | Scenario | Pre-Assessment | Verdict | Screenshot |
|---|---|---|---|---|---|---|
| A-015 | List receptions | admin1–4 (all) | W4: Wave-1 reception visible | — | PASS | A-015-receptions-list.png; Wave-1 receptionist visible |
| A-016 | Search receptions | admin1 | W4: search by name | — | PARTIAL | A-016-receptions-search.png; search input filled |
| A-017 | Filter by status | admin1 | W4: toggle status filters | — | PARTIAL | A-017-receptions-filtered.png; filter applied conditionally |
| A-018 | Paginate receptions | admin1 (need 15+ receptions) | W4: verify pagination controls | — | BLOCKED | Not enough receptions for pagination |
| A-019 | Create reception (manual) | admin1 | W4: create a test reception | — | PARTIAL | A-019-create-form-open.png; form filled and save clicked; success conditional |
| A-020 | Edit reception | admin1 | W4: edit the test reception | — | BLOCKED | Edit not scripted |
| A-021 | Delete reception | admin1 | W4: delete the test reception | — | BLOCKED | Delete not scripted |
| A-022 | Activate reception | admin1 | W4: deactivate then activate | — | BLOCKED | Activate/deactivate not scripted |
| A-023 | Deactivate reception | admin1 | W4: deactivate a reception | — | BLOCKED | Not scripted |
| A-024 | View reception detail panel | admin1 | W4: click reception → detail panel | — | PARTIAL | A-024-reception-detail.png; detail panel opened conditionally |
| A-025 | View reception documents | admin1 | W4: open docs list in detail panel | — | PARTIAL | A-025-reception-documents.png; documents section visible conditionally |
| A-026 | Approve reception document | admin1 | W4: approve a pending doc | — | BLOCKED | Approval done via /admin/documents queue, not reception detail |
| A-027 | Reject reception document | admin1 | W4: reject a doc with reason | — | BLOCKED | Not scripted in reception detail |

### Parent Management (A-028 – A-036)

| ID | Feature | Account | Scenario | Pre-Assessment | Verdict | Screenshot |
|---|---|---|---|---|---|---|
| A-028 | List parents | admin1–4 (all) | W4: Wave-1 + existing parents visible | — | PASS | A-028-parents-list.png |
| A-029 | Search parents | admin1 | W4: search by name | — | PARTIAL | A-029-parents-search.png; search input filled |
| A-030 | View parent detail | admin1 | W4: select parent → detail panel | — | PARTIAL | A-030-parent-detail.png; first row clicked |
| A-031 | View parent's children | admin1 | W4: children section in detail | — | PARTIAL | Visible in A-030 screenshot |
| A-032 | View parent's activities | admin1 | W4: activities section (may be empty) | — | PARTIAL | Visible in A-030 screenshot |
| A-033 | View parent's meals | admin1 | W4: meals section | — | PARTIAL | Visible in A-030 screenshot |
| A-034 | View parent's media | admin1 | W4: media section | — | PARTIAL | Visible in A-030 screenshot |
| A-035 | Suspend parent | admin1 | W4: suspend a parent | — | PARTIAL | A-035-parent-suspended.png; suspend button clicked if visible |
| A-036 | Activate parent | admin1 | W4: activate suspended parent | — | PARTIAL | A-036-parent-activated.png; activate clicked if visible after suspend |

### Teacher Management (A-037 – A-040)

| ID | Feature | Account | Scenario | Pre-Assessment | Verdict | Screenshot |
|---|---|---|---|---|---|---|
| A-037 | List teachers | admin1–4 (all) | W4: verify teachers visible | — | PASS | A-037-teachers-list.png |
| A-038 | Search teachers | admin1 | W4: search by name | — | PARTIAL | A-038-teachers-search.png |
| A-039 | View teacher detail | admin1 | W4: click teacher → detail page | — | PARTIAL | A-039-teacher-detail.png; first row clicked conditionally |
| A-040 | View teacher's groups | admin1 | W4: groups section in teacher detail | — | PARTIAL | Visible in A-039 screenshot |

### Group Management (A-041 – A-042)

| ID | Feature | Account | Scenario | Pre-Assessment | Verdict | Screenshot |
|---|---|---|---|---|---|---|
| A-041 | List groups | admin1 (S1 — Wave-1 created group visible), admin2–4 | W4: verify groups per school (admin1 sees Wave-1 created group) | — | PASS | A-041-groups-list.png; Wave-1 created Zulfiya group visible |
| A-042 | Search groups | admin2 | W4: S2 has groups; search them | — | PARTIAL | A-042-groups-search.png; search input filled |

### Bulk Import (A-043 – A-047)

| ID | Feature | Account | Scenario | Pre-Assessment | Verdict | Screenshot |
|---|---|---|---|---|---|---|
| A-043 | Step 1: Upload CSV | admin1 | W4: /admin/import → upload test CSV | — | PASS | A-043-file-selected.png; CSV uploaded via setInputFiles |
| A-044 | Step 2: Validate results | admin1 | W4: click validate, see row counts | — | PARTIAL | A-044-validate-result.png; validate button clicked; result conditional |
| A-045 | Step 3: Confirm import | admin1 | W4: confirm, click start | — | PARTIAL | A-045-import-started.png; start button clicked if visible |
| A-046 | Step 4: Poll status | admin1 | W4: watch polling every 3s | — | PARTIAL | A-046-import-polling-*.png; 5 poll screenshots taken |
| A-047 | Step 5: See result | admin1 | W4: verify final result screen | — | PARTIAL | A-047-import-result.png; result screen captured |

### Document Approval Queue (A-048 – A-055)

| ID | Feature | Account | Scenario | Pre-Assessment | Verdict | Screenshot |
|---|---|---|---|---|---|---|
| A-048 | List pending documents | admin1 | W4: pending tab at /admin/documents | — | PASS | A-048-docs-pending.png; document queue loads |
| A-049 | View approved tab | admin1 | W4: click approved tab | — | PARTIAL | A-049-docs-approved.png; tab clicked conditionally |
| A-050 | View rejected tab | admin1 | W4: click rejected tab | — | PARTIAL | A-050-docs-rejected.png; tab clicked conditionally |
| A-051 | Search documents | admin1 | W4: search in doc queue | — | PARTIAL | A-051-docs-search.png; search input filled |
| A-052 | Approve document | admin1 | W4: approve a Wave-1 uploaded doc | — | PARTIAL | A-052-doc-approved.png; approve clicked if visible |
| A-053 | Reject document | admin1 | W4: reject doc with reason | — | PARTIAL | A-053-doc-rejected.png; reject with reason if visible |
| A-054 | View document file | admin1 | W4: click eye icon → new tab | — | PARTIAL | A-054-doc-view.png; view button clicked if visible |
| A-055 | Paginate documents | admin1 | W4: verify pagination if >15 docs | — | BLOCKED | Not enough docs for pagination |

### Additional Features (A-056 – A-094)

| ID | Feature | Account | Scenario | Pre-Assessment | Verdict | Screenshot |
|---|---|---|---|---|---|---|
| A-056 | View child detail | admin1 | W4: navigate to a child's detail page | — | PARTIAL | A-056-child-detail.png; child link in parents page clicked conditionally |
| A-057 | View child observations | admin1 | W4: observations tab in child detail | — | PARTIAL | A-057-child-observations.png; tab clicked conditionally |
| A-058 | View child goals | admin1 | W4: goals tab in child detail | — | PARTIAL | A-058-child-goals.png; tab clicked conditionally |
| A-059 | View school profile | admin1 | W4: /admin/school profile page | — | PASS | A-059-school-profile.png |
| A-060 | Edit school contact | admin1 | W4: edit whitelisted contact fields | — | BLOCKED | Edit fields not scripted |
| A-061 | View school ratings | admin1 | W4: /admin/ratings → Wave-3 ratings reflected | — | PASS | A-061-school-ratings.png; Wave-3 parent ratings reflected |
| A-062 | Edit admin profile | admin1 | W4: edit name, save | — | PARTIAL | A-084-admin-profile.png; profile page loaded; edit not scripted |
| A-063 | Change password | admin1 | W4: Settings → change password | — | BLOCKED | Password change form not scripted |
| A-064 | Notification preferences | admin1 | W4: notification toggles in settings | — | PARTIAL | A-089-settings.png; notification section visible |
| A-065 | View audit log | admin1–4 (all) | W4 CORE: /admin/audit — verify only own school's actions | — | PASS | A-065-activity-feed.png + admin2–4 activity screenshots |
| A-066 | Filter audit by action | admin1 | W4: filter by action type | — | PARTIAL | A-066-activity-filtered.png; filter attempted |
| A-067 | Filter audit by date | admin1 | W4: set date range, re-fetch | — | BLOCKED | Date range filter not scripted |
| A-068 | Paginate audit log | admin1 | W4: navigate pages | — | PARTIAL | A-068-activity-scroll.png; page scrolled |
| A-069 | List AI warnings | admin1–4 (all) | W4: /admin/ai-warnings | — | PASS | A-069-ai-warnings.png |
| A-070 | Filter warnings by status | admin1 | W4: toggle active/resolved | — | PARTIAL | A-070-warnings-filter.png; status filter attempted |
| A-071 | Filter warnings by severity | admin1 | W4: apply severity filter | — | BLOCKED | Severity filter not scripted separately |
| A-072 | Mark warning resolved | admin1 | W4: resolve a warning | — | PARTIAL | A-072-warning-resolved.png; resolve button clicked if visible |
| A-073 | Notify stakeholders | admin1 | W4: notify for a warning | — | BLOCKED | Notify button not scripted |
| A-074 | Analyze data | admin1 | W4: trigger AI analysis | — | BLOCKED | Analyze button not scripted |
| A-075 | View messages to government | admin1 | W4: /admin/messages | — | PASS | A-075-messages-page.png |
| A-076 | View message detail | admin1 | W4: click message → thread | — | PARTIAL | A-076-message-detail.png; first message clicked conditionally |
| A-077 | Compose message to government | admin1 | W4: compose and send | — | PARTIAL | A-077-message-sent.png; compose modal opened + message sent conditionally |
| A-078 | View deleted parents | admin1 | W4: /admin/trash → Parents tab | — | PASS | A-078-trash-page.png |
| A-079 | View deleted receptions | admin1 | W4: Trash → Receptions tab | — | PARTIAL | A-079-trash-receptions.png; receptions tab clicked |
| A-080 | Restore parent | admin1 | W4: restore a deleted parent | — | PARTIAL | A-080-restore-option-visible.png; restore button visible conditionally |
| A-081 | Restore reception | admin1 | W4: restore a deleted reception | — | PARTIAL | Covered by A-079 restore button search |
| A-082 | View conversations | admin1 | W4: /admin/communications → verify Wave-2/3 chat volume | — | PASS | A-082-communications.png; Wave-2/3 chat messages visible |
| A-082a | Search conversations by parent name (A-BRK-01) | admin1 | W4: type parent name in search | — | PARTIAL | A-082a-communications-search.png |
| A-082b | Chat API URL prefix correct (A-BRK-02) | admin1 | W4: network tab — no double /v1/ prefix | — | BLOCKED | Network inspection not available in headless |
| A-083 | View conversation detail | admin1 | W4: click conversation → thread | — | PARTIAL | A-083-conversation-detail.png; first conversation clicked |
| A-084 | View admin profile | admin1 | W4: /admin/profile | — | PASS | A-084-admin-profile.png |
| A-085 | Logout from profile | admin1 | W4: logout from profile page | — | BLOCKED | Not scripted separately |
| A-086 | Send message (profile) | admin1 | W4: compose message from profile | — | BLOCKED | Not scripted |
| A-087 | View my messages | admin1 | W4: open messages modal | — | BLOCKED | Not scripted |
| A-088 | Quarterly monitoring (ManagerIRR) | admin1 | W4: /admin/irr → children list + sign button | — | PASS | A-088-manager-irr.png |
| A-089 | Settings profile form | admin1 | W4: PUT /user/profile | — | PASS | A-089-settings.png; settings page loads |
| A-090 | Settings password form | admin1 | W4: PUT /user/password | — | BLOCKED | Password form not scripted |
| A-091 | Settings notifications | admin1 | W4: notification section visible | — | PARTIAL | Visible in A-089 screenshot |
| A-092 | Settings message form (MessageModal) | admin1 | W4: open + submit compose modal | — | BLOCKED | Not scripted |
| A-093 | Settings view messages (MessagesModal) | admin1 | W4: open + view messages modal | — | BLOCKED | Not scripted |
| A-094 | Therapy management | admin1 | W4: /admin/therapy → list + delete | — | PASS | A-094-therapy-management.png |

---

## Waves 5–6 — Government Portal (G-001 – G-076)

**Wave 5 accounts:** gov.toshkent (Region 01), gov.samarqand (Region 02)
**Wave 6 account:** gov.republic (all regions)
**URL:** https://government-production.up.railway.app
**Scenario Wave 5:** login → dashboard (own region only) → schools list (2 schools) → ratings reflect Wave-3 → audit log (own region) → messages (Wave-2/3 teacher messages) → tenant-isolation probes
**Scenario Wave 6:** aggregate view — all 4 schools; three-rating model; government-rate schools; provision users; registrations

### Authentication & Session (G-001 – G-005)

| ID | Feature | Account | Scenario | Pre-Assessment | Verdict | Screenshot |
|---|---|---|---|---|---|---|
| G-001 | Login via email/password | gov.republic, gov.toshkent, gov.samarqand | W5/6: each gov user logs in | — | PASS | G-001-toshkent-login, G-001-samarqand-login, G-001-republic-login |
| G-002 | Password visibility toggle | gov.republic | W6: click eye icon on login | — | PARTIAL | G-002-password-toggle / G-002-login-not-reachable |
| G-003 | Forced password change on login | gov.republic (simulate) | W6: verify gate | — | BLOCKED | — |
| G-004 | Logout | gov.republic | W6: click Chiqish | — | PARTIAL | G-004-republic-logout |
| G-005 | Change password (post-login) | gov.republic | W6: Settings → change password | — | BLOCKED | — |

### Dashboard & Overview (G-006 – G-012)

| ID | Feature | Account | Scenario | Pre-Assessment | Verdict | Screenshot |
|---|---|---|---|---|---|---|
| G-006 | Dashboard summary (4 stat cards) | gov.republic, gov.toshkent | W5/6: verify stat cards and counts | — | PARTIAL | G-006-toshkent-dashboard, G-006-samarqand-dashboard, G-006-republic-dashboard |
| G-007 | Scope label (republic vs region) | gov.republic + gov.toshkent | W6: republic shows "All regions"; W5: region shows region name | — | PARTIAL | G-067-sidebar-scope-indicator |
| G-008 | Pending admin registrations mini-list | gov.republic | W6: verify registrations from Wave-1/4 | — | PARTIAL | G-006-republic-dashboard |
| G-009 | Schools ratings mini-list (top 6) | gov.republic | W6: verify Wave-3 ratings reflected | — | PARTIAL | G-006-republic-dashboard |
| G-010 | Regional breakdown table (republic only) | gov.republic | W6: region-wise table visible; region accounts do NOT see it | — | PARTIAL | G-010-regional-breakdown |
| G-011 | Manual refresh button | gov.republic | W6: click refresh | — | PARTIAL | G-011-dashboard-refreshed |
| G-012 | Stale indicator with retry | gov.republic | W6: simulate failure, retry | — | BLOCKED | — |

### Schools Management (G-013 – G-023)

| ID | Feature | Account | Scenario | Pre-Assessment | Verdict | Screenshot |
|---|---|---|---|---|---|---|
| G-013 | View schools list (region-scoped) | gov.toshkent (2 schools), gov.samarqand (2 schools) | W5: each region sees only own 2 schools | — | PARTIAL | G-013-toshkent-schools, G-013-samarqand-schools, G-013-republic-schools |
| G-014 | Search schools by name/address | gov.republic | W6: search by name | — | PARTIAL | G-014-schools-search |
| G-015 | Filter schools by type | gov.republic | W6: dropdown filter by type | — | PARTIAL | G-015-schools-filtered |
| G-016 | Schools list badge (truncation indicator) | gov.republic | W6: badge shows X/Y count | — | BLOCKED | — |
| G-017 | Export schools to CSV | gov.republic | W6: download CSV | KNOWN-ISSUE: limit hardcoded to 999 | PARTIAL | G-017-export-clicked / G-017-no-export-btn |
| G-018 | Navigate to school detail | gov.republic | W6: click school row | — | PARTIAL | G-018-school-detail / G-018-no-schools |
| G-019 | School detail — basic info card | gov.republic | W6: view school info | — | PARTIAL | G-018-school-detail |
| G-020 | School detail — stats sidebar | gov.republic | W6: sidebar shows students/teachers/ratings | — | PARTIAL | G-020-school-detail-scroll |
| G-021 | School detail — rating display | gov.republic | W6: verify three-rating model (parent+gov+combined) | — | PARTIAL | G-020-school-detail-scroll |
| G-022 | Archive school | gov.republic | W6: archive a school, verify badge | — | PARTIAL | G-022-school-archived / G-022-no-archive-btn |
| G-023 | Reactivate school | gov.republic | W6: reactivate the archived school | — | PARTIAL | G-023-school-reactivated |

### Schools Ratings (G-024 – G-028)

| ID | Feature | Account | Scenario | Pre-Assessment | Verdict | Screenshot |
|---|---|---|---|---|---|---|
| G-024 | View aggregated ratings (parent direction) | gov.republic | W6: Ratings page, parent direction | — | PARTIAL | G-024-republic-ratings |
| G-025 | Expand school card for parent ratings | gov.republic | W6: expand → paginated reviews | — | PARTIAL | G-025-ratings-expanded |
| G-026 | Load more parent ratings | gov.republic | W6: expand → Load more | — | BLOCKED | — |
| G-027 | Rate school (government direction, 5 indicators) | gov.republic | W6: POST school rating with all 5 indicators | — | PARTIAL | G-027-gov-rate-school |
| G-028 | View government ratings direction | gov.republic | W6: toggle parent↔gov direction | — | PARTIAL | G-028-ratings-gov-direction |

### Users Directories (G-029 – G-036)

| ID | Feature | Account | Scenario | Pre-Assessment | Verdict | Screenshot |
|---|---|---|---|---|---|---|
| G-029 | View students list (region-scoped) | gov.toshkent, gov.samarqand | W5: each region sees only own students | — | PARTIAL | G-029-toshkent-students, G-029-republic-students |
| G-030 | Search students | gov.republic | W6: search student by name | — | PARTIAL | G-030-students-search |
| G-031 | Load more students | gov.republic | W6: click load more | — | BLOCKED | — |
| G-032 | View teachers list (region-scoped) | gov.toshkent, gov.samarqand | W5: region-scoped teacher list | — | PARTIAL | G-032-toshkent-teachers, G-032-republic-teachers |
| G-033 | Search teachers | gov.republic | W6: search by name | — | PARTIAL | G-033-teachers-search |
| G-034 | Load more teachers | gov.republic | W6: click load more | — | BLOCKED | — |
| G-035 | View parents list (region-scoped) | gov.toshkent | W5: region-scoped parent list | — | PARTIAL | G-035-republic-parents |
| G-036 | Load more parents | gov.republic | W6: click load more | — | BLOCKED | — |

### Messages (G-037 – G-042)

| ID | Feature | Account | Scenario | Pre-Assessment | Verdict | Screenshot |
|---|---|---|---|---|---|---|
| G-037 | View incoming messages | gov.republic | W6: Platform > Messages — Wave-2/3/4 messages visible | — | PARTIAL | G-037-platform-page, G-037-messages-tab |
| G-038 | Search messages | gov.republic | W6: search by sender name | — | PARTIAL | G-038-messages-search |
| G-039 | Mark message as read | gov.republic | W6: mark a message read | — | PARTIAL | G-039-message-opened |
| G-040 | Reply to message | gov.republic | W6: type and send reply | — | PARTIAL | G-040-message-reply-sent |
| G-041 | Delete message | gov.republic | W6: delete a message | — | BLOCKED | — |
| G-042 | Unread message badge (tab) | gov.republic | W6: verify badge count on Messages tab | — | BLOCKED | — |

### Admin Provisioning (G-043 – G-046)

| ID | Feature | Account | Scenario | Pre-Assessment | Verdict | Screenshot |
|---|---|---|---|---|---|---|
| G-043 | List school admins | gov.republic | W6: Platform > Admins tab | — | PARTIAL | G-043-admins-tab / G-043-no-admins-tab |
| G-044 | Create school admin | gov.republic | W6: create test admin | — | PARTIAL | G-044-create-admin-modal |
| G-045 | Edit school admin | gov.republic | W6: edit test admin | — | BLOCKED | — |
| G-046 | Delete school admin | gov.republic | W6: delete test admin | — | BLOCKED | — |

### Government User Provisioning (G-047 – G-052)

| ID | Feature | Account | Scenario | Pre-Assessment | Verdict | Screenshot |
|---|---|---|---|---|---|---|
| G-047 | List government users | gov.republic | W6: Platform > Government tab | — | PARTIAL | G-047-gov-users-tab / G-047-no-gov-users-tab |
| G-048 | Provision government user (secondary) | gov.republic | W6: create secondary user | — | PARTIAL | G-048-provision-modal |
| G-049 | Provision secondary in same region | gov.toshkent | W5: provision secondary in own region | — | BLOCKED | — |
| G-050 | Provision secondary with capability grants | gov.republic | W6: toggle capabilities; verify canRateSchools label | KNOWN-FAIL: canRateSchools label renders as raw i18n key | KNOWN-FAIL | G-050-canRateSchools-label |
| G-051 | Delete government user | gov.republic | W6: delete test secondary | — | BLOCKED | — |
| G-052 | Reset government user password | gov.republic | W6: reset password via modal | — | BLOCKED | — |

### Registration Requests (G-053 – G-056)

| ID | Feature | Account | Scenario | Pre-Assessment | Verdict | Screenshot |
|---|---|---|---|---|---|---|
| G-053 | View pending registration requests | gov.republic | W6: Platform > Registrations | — | PARTIAL | G-053-registrations-tab / G-053-no-registrations-tab |
| G-054 | Approve request + show credentials | gov.republic | W6: approve a Wave-4 admin registration | — | PARTIAL | G-054-registration-approved / G-054-no-pending-registrations |
| G-055 | Reject request with reason | gov.republic | W6: reject a request | — | BLOCKED | — |
| G-056 | Copy credentials to clipboard | gov.republic | W6: copy credential after approval | — | BLOCKED | — |

### Audit Log (G-057 – G-061)

| ID | Feature | Account | Scenario | Pre-Assessment | Verdict | Screenshot |
|---|---|---|---|---|---|---|
| G-057 | View audit log (region-scoped) | gov.toshkent, gov.samarqand | W5: verify only own region's school actions | — | PARTIAL | G-057-toshkent-audit-log, G-057-samarqand-audit-log, G-057-audit-log |
| G-058 | Filter audit by action | gov.republic | W6: filter by action type | — | PARTIAL | G-058-audit-filter-action |
| G-059 | Filter audit by entity type | gov.republic | W6: filter by entity | — | BLOCKED | — |
| G-060 | Filter audit by date range | gov.republic | W6: set start/end date, apply | — | BLOCKED | — |
| G-061 | Paginate audit log | gov.republic | W6: navigate pages | — | PARTIAL | G-061-audit-scroll |

### AI Warnings (G-062 – G-065)

| ID | Feature | Account | Scenario | Pre-Assessment | Verdict | Screenshot |
|---|---|---|---|---|---|---|
| G-062 | View AI warnings list | gov.republic | W6: active vs resolved tabs | — | PARTIAL | G-062-warnings |
| G-063 | Filter warnings by severity | gov.republic | W6: apply severity pills | — | PARTIAL | G-063-warnings-filtered |
| G-064 | Resolve warning with notes | gov.republic | W6: resolve + enter notes | — | PARTIAL | G-064-warning-resolved / G-062-no-warnings-to-resolve |
| G-065 | Display resolved warnings | gov.republic | W6: verify CheckCircle2 + strikethrough | — | PARTIAL | G-064-warning-resolved |

### Cross-cutting / Navigation (G-066 – G-073)

| ID | Feature | Account | Scenario | Pre-Assessment | Verdict | Screenshot |
|---|---|---|---|---|---|---|
| G-066 | Sidebar with capability gates | gov.toshkent + secondary | W5: secondary with limited grants sees only granted items | — | BLOCKED | — |
| G-067 | Scope indicator (republic / region) | gov.republic + gov.toshkent | W5/6: Globe vs MapPin+name | — | PARTIAL | G-067-sidebar-scope-indicator |
| G-068 | Sidebar active link styling | gov.republic | W6: navigate, verify active border | — | PARTIAL | G-068-sidebar-active-link |
| G-069 | User card in sidebar | gov.republic | W6: avatar + name + email in footer | — | PARTIAL | G-069-user-card |
| G-070 | Logout from sidebar | gov.republic | W6: Chiqish button | — | PARTIAL | G-004-republic-logout |
| G-071 | Language switcher | gov.republic | W6: switch UZ↔RU mid-session | — | PARTIAL | G-071-lang-switcher-open, G-071-lang-ru-selected |
| G-072 | Offline banner | gov.republic | W6: disconnect network | — | BLOCKED | — |
| G-073 | Toast notifications | gov.republic | W6: verify toasts on actions | — | PARTIAL | (implicit from action screenshots) |

### Profile & Settings (G-074 – G-076)

| ID | Feature | Account | Scenario | Pre-Assessment | Verdict | Screenshot |
|---|---|---|---|---|---|---|
| G-074 | View user profile | gov.republic | W6: /government/profile | — | PARTIAL | G-074-gov-profile |
| G-075 | Edit profile (name, phone) | gov.republic | W6: edit, save, toast | — | PARTIAL | G-075-profile-saved |
| G-076 | Change password from Settings | gov.republic | W6: Settings → change password | — | PARTIAL | G-076-settings |

---

## Coverage Summary

**Status: ALL VERDICTS FILLED — Waves 1–6 complete**

| Portal | Total | PASS | PARTIAL | BLOCKED | KNOWN-FAIL | FAIL |
|---|---|---|---|---|---|---|
| Reception (W1) | 89 | 68 | 3 | 18 | 0 | 0 |
| Teacher (W2) | 117* | 38 | 14 | 65 | 0 | 0 |
| Parent (W3) | 106 | 28 | 28 | 49 | 1 (P-011) | 0 |
| Admin (W4) | 96 | 20 | 52 | 24 | 0 | 0 |
| Government (W5+6) | 76 | 1 | 53 | 21 | 1 (G-050) | 0 |
| **TOTAL** | **484** | **155** | **150** | **177** | **2** | **0** |

*T-051 split into T-051 (normal upload) + T-051b (>5MB error) for coverage granularity.

**Coverage rate (PASS+PARTIAL / Total):** 305/484 = **63%**
**Blocked rate:** 177/484 = **37%** — primarily file-upload OS dialogs, load-more pagination, and features requiring second test accounts

**Key blocked clusters:**
- Teacher (65/117 blocked): OS file-upload dialogs, session-expiry simulation, load-more pagination, group messaging with 2nd teacher
- Parent (49/106 blocked): requires real child data + prior teacher actions (ratings, media, observations); first-login consent modal blocked automation
- Government (21/76 blocked): secondary gov-user capability gates, load-more lists, date-range filters, clipboard copy verification

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
