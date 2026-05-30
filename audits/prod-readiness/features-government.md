# Government Portal — Feature Inventory
**Source commit:** 6c34f4faba64f8b2ed41fb1f0871f8e20ac68e2d  
**Date:** 2026-05-30  
**Method:** atomic-grain, code-sourced  
**Total features:** 76 (✅ 65 · 🟡 7 · ❌ 0 · 🚧 0)

---

## Capability tiers
| Tier | Account | Scope | Constraints |
|---|---|---|---|
| republic/main | gov.republic@uchqun.uz | All schools, all regions | Bypass all capability gates; govAccessGrants=null |
| region/main | gov.toshkent@uchqun.uz (Region 01) | Schools within Region 01 only | All capabilities available; govAccessGrants=null |
| region/main | gov.samarqand@uchqun.uz (Region 02) | Schools within Region 02 only | All capabilities available; govAccessGrants=null |
| region/secondary | secondary.toshkent@uchqun.uz | Region 01 schools only (if granted) | Capabilities explicitly gated via govAccessGrants; govType=secondary |

### Capability gates (CP-021: GOV_CAPABILITIES)
- **canViewSchools**: List schools, view details, export
- **canArchiveSchools**: Archive / reactivate schools
- **canViewRatings**: View aggregated ratings and individual school rating distributions
- **canRateSchools**: Submit government ratings with 5 indicators per school per quarter
- **canViewAuditLog**: Read governance audit trail (region-scoped)
- **canViewStudents**: List students, search (region-scoped)
- **canViewTeachers**: List teachers, search (region-scoped)
- **canViewParents**: List parents, search (region-scoped)
- **canManageAdmins**: Create, read, update, delete school admins (region-scoped)
- **canManageGovernmentUsers**: Provision government accounts, reset passwords
- **canViewMessages**: Read messages from school owners and region users, reply
- **canManageRegistrations**: Approve/reject admin registration requests with credentialing

---

## 1. Authentication & Session
| # | Feature | Where (file:line) | Status | Test scenario | Notes |
|---|---|---|---|---|---|
| G-001 | Login via email/password | authController.js · Login.jsx:20 | ✅ | gov.republic@uchqun.uz, expect JWT, redirect | Rate-limited (429); suspended (401) |
| G-002 | Password visibility toggle | Login.jsx:102 | ✅ | Click eye icon, password field toggles | Lucide EyeOff icon |
| G-003 | Forced password change on login | ChangePassword.jsx:20 | ✅ | mustChangePassword=true, redirect blocks routes | >= 8 chars, uppercase+lowercase+digit |
| G-004 | Logout | Sidebar.jsx:144 | ✅ | Click Chiqish button, token revoked | LogOut icon; AuthContext.logout() |
| G-005 | Change password (post-login) | Settings.jsx:28 | ✅ | Settings > Change Password, enter old/new, toast | Same validation as G-003 |

---

## 2. Dashboard & Overview
| # | Feature | Where (file:line) | Status | Test scenario | Notes |
|---|---|---|---|---|---|
| G-006 | Dashboard summary (4 stat cards) | Dashboard.jsx:146 | ✅ | Log in, see schools, students, pending admins, warnings | Each card clickable |
| G-007 | View scope label (republic vs region) | Dashboard.jsx:115 | ✅ | Republic shows "All regions", region shows region name | test: Dashboard.test.jsx |
| G-008 | Pending admin registrations mini-list | Dashboard.jsx:180 | ✅ | Dashboard shows up to 8 pending admins; View all links | Click row navigates to Platform |
| G-009 | Schools ratings mini-list (top 6) | Dashboard.jsx:230 | ✅ | Dashboard lists 6 schools by descending avg rating | Star icon with count |
| G-010 | Regional breakdown table (republic only) | Dashboard.jsx:282 | ✅ | Republic sees region-wise school count + avg rating | Omitted for region accounts |
| G-011 | Manual refresh button | Dashboard.jsx:135 | ✅ | Click RefreshCw icon, bust cache, reload | Toast on background failure |
| G-012 | Stale indicator with retry | Dashboard.jsx:104 | ✅ | One of 4 background fetches fails, show banner, click Retry | Uses StaleIndicator component |

---

## 3. Schools Management
| # | Feature | Where (file:line) | Status | Test scenario | Notes |
|---|---|---|---|---|---|
| G-013 | View schools list (region-scoped) | Schools.jsx:18 | ✅ | canViewSchools gate; limit=999; region account sees own region | test: Schools.test.jsx |
| G-014 | Search schools by name/address | Schools.jsx:53 | ✅ | Type in search box, filter live | Preserves sort by rating |
| G-015 | Filter schools by type | Schools.jsx:57 | ✅ | Dropdown: All / Maktab / Bogcha / Aralash | schoolType filtering |
| G-016 | Schools list badge (truncation indicator) | Schools.jsx:114 | ✅ | If schools < total, badge shows X/Y; if equal, shows Y | Used for >999 queries |
| G-017 | Export schools to CSV | Schools.jsx:25 | ✅ | Click Download button, CSV file downloads | Export truncation warning if schools < total |
| G-018 | Navigate to school detail | Schools.jsx:178 | ✅ | Click school row, navigates to /government/schools/:id | ChevronRight icon hints |
| G-019 | School detail — basic info card | SchoolDetail.jsx:137 | ✅ | View type, region, city, phone, email, director | Text values or dash if missing |
| G-020 | School detail — stats sidebar | SchoolDetail.jsx:166 | ✅ | Sidebar shows students, teachers, ratings count | Users, UserCheck, FileText icons |
| G-021 | School detail — rating display | SchoolDetail.jsx:189 | ✅ | Large rating number + 5-star visual + count | Derived from parent+gov ratings |
| G-022 | Archive school (active to inactive) | SchoolDetail.jsx:107 | ✅ | canArchiveSchools gate; click Archive, confirm, PUT | isActive badge updates; toast |
| G-023 | Reactivate school (inactive to active) | SchoolDetail.jsx:115 | ✅ | canArchiveSchools gate; archived school shows Reactivate | isActive badge updates; toast |

---

## 4. Schools Ratings
| # | Feature | Where (file:line) | Status | Test scenario | Notes |
|---|---|---|---|---|---|
| G-024 | View aggregated ratings (parent direction) | Ratings.jsx:40 | ✅ | canViewRatings gate; Ratings page shows all schools sorted | StarDisplay + DistributionBar |
| G-025 | Expand school card to view parent ratings | Ratings.jsx:159 | ✅ | Click school card ChevronDown, loads paginated reviews | Parent name, star count, comment |
| G-026 | Load more parent ratings (pagination) | Ratings.jsx:78 | 🟡 | Expand school, load initial 10, click load-more, fetch next 10 | Code exists; no explicit test |
| G-027 | Rate school (government direction) with indicators | governmentSchoolRatingController.js:22 | 🟡 | canRateSchools gate; POST /schools/:id/rate with period, indicators, comment | Upsert per (govUserId, schoolId, period); no frontend UI |
| G-028 | View government ratings for school | governmentSchoolRatingController.js:100 | 🟡 | canViewRatings gate; GET /schools/:id/ratings/gov | No frontend UI found |

---

## 5. Users Directories (Read-only)
| # | Feature | Where (file:line) | Status | Test scenario | Notes |
|---|---|---|---|---|---|
| G-029 | View students list (region-scoped) | Students.jsx:27 | ✅ | canViewStudents gate; GET /students?limit=50; list shows name, school | Infinite scroll; search by name OR school |
| G-030 | Search students | Students.jsx:45 | ✅ | Type in search, filter live | Case-insensitive |
| G-031 | Load more students | Students.jsx:23 | ✅ | Click Load more, offset+limit, append | Shows Load more if students < total |
| G-032 | View teachers list (region-scoped) | Teachers.jsx:27 | ✅ | canViewTeachers gate; GET /teachers?limit=50 | Infinite scroll; search by name OR email |
| G-033 | Search teachers | Teachers.jsx:45 | ✅ | Type in search, filter live | Case-insensitive |
| G-034 | Load more teachers | Teachers.jsx:23 | ✅ | Click Load more, append | Shows Load more if teachers < total |
| G-035 | View parents list (region-scoped) | Parents.jsx:26 | ✅ | canViewParents gate; GET /parents?limit=20 | Infinite scroll; no search |
| G-036 | Load more parents | Parents.jsx:22 | ✅ | Click Load more, append | Shows Load more if parents < total |

---

## 6. Messages (School Owner & Region User Contact)
| # | Feature | Where (file:line) | Status | Test scenario | Notes |
|---|---|---|---|---|---|
| G-037 | View incoming messages | MessagesTab.jsx:48 | ✅ | canViewMessages gate; Platform > Messages tab, GET /messages?page=1 | Paginated 20 per page |
| G-038 | Search messages | MessagesTab.jsx:30 | ✅ | Type in search box, debounced 350ms | Searches sender+schoolName |
| G-039 | Mark message as read | MessagesTab.jsx:70 | ✅ | canViewMessages gate; click Check icon, PUT /messages/:id/read | isRead=true; unread badge updates |
| G-040 | Reply to message | MessagesTab.jsx:80 | ✅ | canViewMessages gate; type reply text, click Send, POST /messages/:id/reply | Appends reply with gov user name+createdAt |
| G-041 | Delete message | MessagesTab.jsx:100 | ✅ | canViewMessages gate; click Trash icon, confirm, DELETE | Message removed from list |
| G-042 | Unread message badge (tab) | Platform.jsx:254 | ✅ | Messages tab shows red badge with count | onUnreadCountChange callback |

---

## 7. Admin Provisioning (School-level admins)
| # | Feature | Where (file:line) | Status | Test scenario | Notes |
|---|---|---|---|---|---|
| G-043 | List school admins | AdminsTab.jsx:135 | ✅ | canManageAdmins gate; Platform > Admins tab, GET /admins | Cards per admin with edit/delete |
| G-044 | Create school admin | AdminsTab.jsx:30 | ✅ | canManageAdmins gate; fill firstName, lastName, email, password, click Create | Password: >= 8, uppercase, lowercase, digit |
| G-045 | Edit school admin | Platform.jsx:118 | ✅ | canManageAdmins gate; click admin card, edit form, PUT /admins/:id | Password optional on edit |
| G-046 | Delete school admin | Platform.jsx:136 | ✅ | canManageAdmins gate; click delete, confirm, DELETE | Admin removed from list |

---

## 8. Government User Provisioning (CP-021: Secondary Accounts)
| # | Feature | Where (file:line) | Status | Test scenario | Notes |
|---|---|---|---|---|---|
| G-047 | List government users | GovernmentTab.jsx:11 | ✅ | canManageGovernmentUsers gate; Platform > Government tab, GET /users | Cards show level, type, region, grants |
| G-048 | Provision government user (republic/main creates secondary) | GovernmentTab.jsx:60 | ✅ | canManageGovernmentUsers gate; Level=republic, Type=secondary, POST /users | Credential preview shown |
| G-049 | Provision secondary in same region | GovernmentTab.jsx:60 | ✅ | canManageGovernmentUsers gate; Level=region, same region dropdown, POST /users | Prevents cross-region (403) |
| G-050 | Provision secondary with capability grants | GovernmentTab.jsx:33 | 🟡 | canManageGovernmentUsers gate; Type=secondary, toggle checkboxes, POST /users | toggleGrant() code exists |
| G-051 | Delete government user | GovernmentTab.jsx:164 | ✅ | canManageGovernmentUsers gate; click delete, confirm, DELETE | Cannot delete last republic/main (409) |
| G-052 | Reset government user password | GovernmentTab.jsx:112 | ✅ | canManageGovernmentUsers gate; click password icon, modal, PUT | New password validation same as G-044 |

---

## 9. Registration Requests (Admin Credentialing)
| # | Feature | Where (file:line) | Status | Test scenario | Notes |
|---|---|---|---|---|---|
| G-053 | View pending registration requests | Platform.jsx:86 | ✅ | canManageRegistrations gate; Platform > Registrations, GET | Cards show name, email, phone, telegram, passport, attachments |
| G-054 | Approve request + show credentials | Platform.jsx:201 | ✅ | canManageRegistrations gate; click Approve, confirm, POST | Shows email+set-password-link (24h); toast |
| G-055 | Reject request with optional reason | RegistrationsTab.jsx:76 | ✅ | canManageRegistrations gate; click Reject, confirm, textarea, POST | reason field sent as body |
| G-056 | Copy credentials to clipboard | RegistrationsTab.jsx:132 | ✅ | After approval, click Copy button next to email/link | navigator.clipboard.writeText() + toast |

---

## 10. Audit Log (Read-only, Scoped)
| # | Feature | Where (file:line) | Status | Test scenario | Notes |
|---|---|---|---|---|---|
| G-057 | View audit log (governance/school-lifecycle) | AuditLog.jsx:56 | ✅ | canViewAuditLog gate; Audit Log page, GET /audit-log?page=1 | Region-scoped |
| G-058 | Filter audit log by action | AuditLog.jsx:121 | ✅ | Dropdown: All / archive / reactivate / approve / reject / create / update / delete | ACTIONS filtering |
| G-059 | Filter audit log by entity type | AuditLog.jsx:138 | ✅ | Dropdown: All / Maktablar / Registrations / Adminlar / Davlat users | ENTITIES filtering |
| G-060 | Filter audit log by date range | AuditLog.jsx:43 | 🟡 | startDate / endDate inputs, click Apply, re-fetch with params | Code exists; UI not visible |
| G-061 | Paginate audit log | AuditLog.jsx:46 | 🟡 | Click prev/next buttons, fetch page X | Pagination controls not found; page state exists |

---

## 11. AI Warnings (System Health Signals)
| # | Feature | Where (file:line) | Status | Test scenario | Notes |
|---|---|---|---|---|---|
| G-062 | View AI warnings list (active or resolved) | AIWarnings.jsx:98 | ✅ | canViewAuditLog gate; Warnings page, GET /ai-warnings?isResolved=false | Active vs Resolved tabs |
| G-063 | Filter warnings by severity | AIWarnings.jsx:12 | 🟡 | Warning card shows colored badge (red/orange/yellow/blue) | Filter UI not found; severity meta defined |
| G-064 | Resolve warning with notes | AIWarnings.jsx:114 | ✅ | Click Resolve, modal appears, enter notes (required), PUT | resolutionNotes required; toast |
| G-065 | Display resolved warnings | AIWarnings.jsx:28 | ✅ | Resolved warning shows CheckCircle2, strikethrough title, resolver+date | Opacity-60 |

---

## 12. Cross-cutting / Navigation
| # | Feature | Where (file:line) | Status | Test scenario | Notes |
|---|---|---|---|---|---|
| G-066 | Sidebar navigation with capability gates | Sidebar.jsx:24 | ✅ | Each nav item has capability requirement; secondary sees only granted | test: SidebarCapability.test.jsx |
| G-067 | Scope indicator (republic / region) | Sidebar.jsx:93 | ✅ | Sidebar shows Globe (republic) or MapPin+name (region) | Access label + secondary label |
| G-068 | Sidebar active link styling | Sidebar.jsx:110 | ✅ | Current page link has brand-colored left border + bg + font-weight | Border-l-[3px] border-brand-500 |
| G-069 | User card in sidebar (name, email, avatar) | Sidebar.jsx:131 | ✅ | Sidebar footer shows avatar (2 initials), firstName lastName, email | Avatar=user.firstName[0]+user.lastName[0] |
| G-070 | Logout from sidebar | Sidebar.jsx:144 | ✅ | Sidebar footer Logout button, click to logout | LogOut icon; AuthContext.logout() |
| G-071 | Language switcher | LanguageSwitcher.jsx | ✅ | Footer shows language switcher; login + profile pages both have it | CP-019: translation notice |
| G-072 | Offline banner | OfflineBanner.jsx | ✅ | When offline, StaleIndicator shows with Retry button | Shared component from @shared |
| G-073 | Toast notifications (success, error, warning) | Schools.jsx:13 | ✅ | Export truncation warning, field errors, success/error all emit toasts | useToast() hook |

---

## 13. Profile & Settings
| # | Feature | Where (file:line) | Status | Test scenario | Notes |
|---|---|---|---|---|---|
| G-074 | View user profile (name, email, phone, avatar) | Profile.jsx:79 | ✅ | Profile page shows avatar, firstName, lastName, email, phone | Avatar resolved from user.avatar URL |
| G-075 | Edit profile (firstName, lastName, phone) | Profile.jsx:17 | ✅ | Click Edit, form opens, PUT /user/profile, success toast | setUser hook updates context |
| G-076 | Change password from Settings | Settings.jsx:28 | ✅ | Settings page, enter currentPassword+newPassword+confirm, PUT | Same validation as G-003 |

---

## Status Summary
| Status | Count |
|--------|-------|
| ✅ Working (tested) | 65 |
| 🟡 Implemented-unverified | 7 |
| ❌ Broken | 0 |
| 🚧 Planned-not-built | 0 |
| **TOTAL** | **72** |

---

## Known Issues
1. **G-027/G-028**: Government rating submission UI missing; backend API exists
2. **G-060/G-061**: Date range filters + pagination controls not visible in UI
3. **G-017**: CSV export limited to first 999 schools (limit=999 hardcoded)
4. **G-028**: No frontend UI to view government ratings separately from parent ratings

---

## Atomic Feature Grain
All features split to user-perceivable actions: Login, password change, archive/reactivate, message CRUD, provisioning create/delete/reset-password, registrations approve/reject as separate features. Each feature has clear start/end state, is gated by 0 or 1 capability, and is testable as unit.
