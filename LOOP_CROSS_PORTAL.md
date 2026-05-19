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

---

## Usage

When a portal audit begins, check this file for any CP items involving that portal. Add new rows here whenever a Backend (or other portal) audit identifies a cross-portal blocker.
