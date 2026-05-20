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
| CP-011 | Bulk import (GAP-011) | POST /admin/import/validate, POST /admin/import/start, GET /admin/import/:id/status | admin portal import UI | Frontend polls every ~3s until `status='completed'` |
| CP-012 | Parent suspension (GAP-S01) | PUT /admin/parents/:id/suspend, PUT /admin/parents/:id/activate | admin portal parent detail | Suspended parent gets 401 immediately on next request |
| CP-013 | Child goals (GAP-004) | GET /teacher/children/:id/goals, POST /teacher/children/:id/goals | teacher/ChildDetail.jsx | ICF-CY codes — frontend displays only; no taxonomy picker in Tier 1 |
| CP-014 | School archival (GAP-S05) | PUT /government/schools/:id/archive, PUT /government/schools/:id/reactivate | government portal school management | schoolScope middleware enforces `isActive` for admin |
| CP-015 | Data export (DEC-7 / LQ-008) | GET /parent/me/export | parent portal account settings | JSON file download; rate-limited 1 request/24h |

---

## Usage

When a portal audit begins, check this file for any CP items involving that portal. Add new rows here whenever a Backend (or other portal) audit identifies a cross-portal blocker.
