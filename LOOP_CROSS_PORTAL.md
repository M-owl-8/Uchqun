# Uchqun Refinement Loop — Cross-Portal Handoffs

Items identified during Backend S3 (Execute Cleanup) that cannot be fully resolved within the backend alone.

**Created:** 2026-05-19  
**Source step:** Backend S3 Execute Cleanup  

---

| ID | Finding | Backend state | Portal(s) needed | Action required |
|---|---|---|---|---|
| CP-001 | BACKEND-009: Government endpoints default limit 500 → 50 | ✅ Backend capped at `Math.min(limit, 200)`, response now includes `total/limit/offset` | Government portal (Loop 2) | `getStudentsStats` and `getTeachersList` now return paginated shape. Government dashboard directory pages must implement pagination UI. Temporary workaround: pass `?limit=200` until UI is updated. |
| CP-002 | BACKEND-010: User avatars stored as base64 in DB | Deferred from Backend S3 | All portals (Loops 2–6) | Cannot migrate to URL-based avatar storage until every frontend portal is confirmed to read avatars from URL, not inline data URI. Backend migration must be atomic with frontend rollout. Revisit after Government audit (Loop 2) confirms Appwrite is stable across all portals. |
| CP-003 | BACKEND-012: Response shape inconsistency (`{success,data}` vs bare object) | Decision documented in `CLAUDE.md` under Conventions | All portals (Loops 2–6) | New backend endpoints use `{success: true, data}` shape. Existing endpoints are grandfather-claused. Full migration blocked until all frontend portals are audited for `response.data.X` vs `response.data.data.X` access patterns. Track as "Response shape migration" backlog item. |
| CP-004 | Teacher children list (GAP-001) | ✅ GET /teacher/children — Sprint A (a706f96) | teacher/Attendance.jsx, teacher/ChildDetail.jsx | schoolId-scoped; `{ success, data: [...] }` shape |
| CP-005 | Attendance marking (GAP-003) | ✅ POST/GET/PATCH/DELETE /attendance — Sprint A (69d2114) | teacher/Attendance.jsx | Returns `childSnapshot`; PATCH for corrections; DELETE admin-only |
| CP-006 | Child observations (GAP-002) | ✅ POST /teacher/observations, GET /teacher/observations/recent, GET /teacher/children/:id/observations — Sprint B T1-2 (5bd03ae) | teacher/QuickObservation.jsx, teacher/DailyReflection.jsx | Private to staff; not visible to parents |
| CP-007 | Teacher reflections (GAP-005) | ✅ POST /teacher/reflections, GET /teacher/reflections — Sprint B T1-3 (93a22a2) | teacher/DailyReflection.jsx | Filtered by `teacherId` — cross-teacher invisible; requireRole('teacher') strict |
| CP-008 | Parent journal (GAP-005) | ✅ POST /teacher/journal (write), GET /parent/children/:id/journal (read) — Sprint B T1-3 (93a22a2) | teacher/DailyReflection.jsx (write), parent portal (read) | `isVisibleToParent` flag controls visibility; teacherId UUID never exposed to parents |
| CP-009 | Admin doc filter (GAP-006, GAP-018) | ✅ GET /admin/documents?status= — Sprint A (a706f96) | admin/DocumentApprovalQueue.jsx | Keep GET /admin/documents/pending unchanged |
| CP-010 | Reception doc filter (GAP-007) | ✅ GET /reception/documents?status= — Sprint A (9c8d888) | reception portal doc list | Additive query param — non-breaking |
| CP-011 | Bulk import (GAP-011) | ✅ POST /admin/import/children/validate, POST /admin/import/:id/start, GET /admin/import/:id/status, GET /admin/import/:id/errors — Sprint C T1-7a+T1-7b | admin portal import UI | Validate → 201 ImportJob; Start → 202 then setImmediate; poll /status every ~3s; /errors returns { row, field, code }[] |
| CP-012 | Parent suspension (GAP-S01) | ✅ PUT /admin/parents/:id/suspend+activate (0a9bde6); auth gate returns 401 ACCOUNT_NOT_ACTIVE on next request | admin portal parent detail | Suspended parent gets 401 ACCOUNT_NOT_ACTIVE immediately on next request. Admin UI needs suspend/activate buttons on parent detail page. |
| CP-013 | Child goals (GAP-004) | ✅ GET /teacher/children/:id/goals, POST /teacher/children/:id/goals, GET/PATCH/DELETE /teacher/goals/:id, POST/GET /teacher/goals/:id/reviews, GET /admin/children/:id/goals — Sprint E T2-3 (ab7c424) | teacher/ChildDetail.jsx | Goals screen now functional. 8 categories, 5 progress statuses, review history. Admin view returns review counts via include. |
| CP-014 | School archival (GAP-S05) | ✅ PUT /government/schools/:id/archive+reactivate (00a1402); requireSchoolScope returns 403 SCHOOL_ARCHIVED for admin/teacher/reception at inactive schools | government portal school management | Government UI needs archive/reactivate buttons on school detail page. Admin portal should display "school archived" banner when their school is inactive. |
| CP-015 | Data export (DEC-7 / LQ-008) | ✅ GET /parent/me/export — Sprint E T2-10 (8aeea41) | parent portal account settings | JSON file download; rate-limited 1 request/24h per user (Redis-backed). No password, no concern/urgent observations, no raw EM entries. |
| CP-016 | Restore endpoints (GAP-017) | ✅ PUT /admin/children/:id/restore, /admin/users/:id/restore, /admin/observations/:id/restore, /admin/attendance/:id/restore — Sprint E T2-9 (87b7174) | admin portal, government portal | Admin-only (+ government cross-school). Returns 400 RESTORE_NOT_DELETED if record not soft-deleted. Admin portal needs "Restore" action on soft-deleted record views. Government portal can restore across schools. |
| CP-017 | Parent data export UI | ✅ GET /parent/me/export — Sprint E T2-10 (8aeea41) | parent portal account settings page | Add "Download my data" button. On success: browser downloads `uchqun-data-export-{id}-{date}.json`. On 429 DATA_EXPORT_RATE_LIMITED: show "You can only export once per day. Try again tomorrow." |

| CP-018 | BACKEND-017: Mixed Sequelize `underscored` convention across models | Deferred from Backend S3 — 4 models use `underscored: true`, majority use `underscored: false` | Database portal (Loop 7) | `ChildAssessment.js`, `ServicePlan.js`, `MealPlan.js`, `ParentEvaluation.js` use `underscored: true`; all others use camelCase columns. Verify live schema column names match model declarations before any JOIN-heavy query is added. Fix convention drift in Database portal S2. |

---

## Usage

When a portal audit begins, check this file for any CP items involving that portal. Add new rows here whenever a Backend (or other portal) audit identifies a cross-portal blocker.
