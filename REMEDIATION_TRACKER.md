# Uchqun — Remediation Tracker

**Audit:** PRODUCTION_READINESS_AUDIT_2026-05-18.md  
**Audit score:** 71% → DELAY  
**Generated:** 2026-05-18  
**Rule:** Close all OPEN items, then re-run the full audit. Loop until score ≥ 95%.

Each finding follows: failing test first → fix → staging verify → prod verify → close → stop.

---

## Open Findings

| ID | Status | Severity | Title | File / Location | Reproduction | Suggested Fix |
|---|---|---|---|---|---|---|
| V5-CRIT-02 | OPEN | BLOCKER | Cross-school group leak — reception sees groups from another school | `backend/controllers/groupController.js` lines 13, 31–32 | Login as reception@uchqun.uz (schoolId 4ffc18f4); `GET /api/v1/reception/groups` → returns groups with schoolId 661d2411 | Add `where.schoolId = req.user.schoolId` before the `Group.findAll()` call; add `schoolId: req.user.schoolId` to the teacher include where clause |
| V5-CRIT-03 | OPEN | BLOCKER | `schoolWhere()` returns `{}` for null schoolId — global data exposure risk | `backend/middleware/schoolScope.js` lines 27–33 | Any non-government user with `schoolId=null` in DB gets global WHERE clause on any controller using `schoolWhere()` directly | Change `if (!schoolId) return {};` to throw an error or return `{ schoolId: null }` (zero results); ensure all callers are guarded by `requireSchoolScope` |
| V5-HIGH-01 | OPEN | HIGH | Migration endpoint has no per-route rate limiter | `backend/routes/migrationRoutes.js` | `POST /api/v1/migrations/run` — accessible from internet with no route-level rate limit (only global limiter applies) | Apply `authLimiter` or a dedicated strict limiter (max 3 req/hour) on the migration route |
| V5-HIGH-02 | OPEN | HIGH | Government role blocked from `/admin/*` — design ambiguity | `backend/middleware/auth.js` (requireAdmin) | `curl -b government.txt GET /api/v1/admin/statistics` → 403; government oversight users cannot see admin-level school stats | Product decision: if government should have admin-level read access, add `'government'` to `requireAdmin`; if intentional, document explicitly in CLAUDE.md |
| V5-MED-01 | OPEN | MEDIUM | GET `/parent/school-rating` returns null after successful POST | `backend/controllers/parentController.js` (getMySchoolRating) | Submit `POST /parent/school-rating {schoolId, stars, comment}` → 200; then `GET /parent/school-rating` → `{"rating":null}` | Default schoolId from `req.user.schoolId` when no query param, so parent's own school rating is always returned without needing to pass schoolId |
| V5-MED-02 | OPEN | MEDIUM | Demo child "mm mm" has DOB 1999-03-12 (age 27) — data quality | DB seed data | `GET /parent/children` → child with unrealistic DOB | Fix in seed migration or direct DB update; use realistic child name and DOB in demo data |
| V5-MED-03 | OPEN | MEDIUM | Assessments and service-plans require `?childId` — inconsistent API pattern | `backend/routes/childAssessmentRoutes.js`, `servicePlanRoutes.js` | `GET /api/v1/assessments` → 400 "childId is required"; compare with `GET /activities` which works without childId | Either document this as intentional (add to API docs) or add default behavior that returns all accessible records when childId is omitted, consistent with activities |
| V5-LOW-01 | OPEN | LOW | Socket.IO in-memory — multi-instance Railway not ready | `backend/config/socket.js` | Two Railway instances would not fan-out events to each other | Add Redis adapter: `socket.adapter(createAdapter(redisClient))` — requires `REDIS_URL` in Railway env |
| V5-LOW-02 | OPEN | LOW | Demo parent.schoolId = null → empty activity/meal/media feeds | DB seed data | `GET /parent/activities` returns 0 results; parent's child has `schoolId=null` | Fix seed data so demo parent and child have correct schoolId associations |

---

## Closed Findings

| ID | Status | Severity | Title | Closed In |
|---|---|---|---|---|
| V5-CRIT-01 | CLOSED | BLOCKER | Chat send broken — validator rejected `parent:UUID` format | 7553760 \| 2026-05-18T03:28:48Z |
| V4-CRIT-01 | CLOSED | CRITICAL | Session lost on page reload (createAuthContext wrong envelope) | Commit (pre-audit); `res.data.data ?? res.data` at line 50 |
| V4-HIGH-01 | CLOSED | HIGH | No error message on wrong password (all frontends) | Deployed before this audit; detailed error messages confirmed |

---

## Re-Audit Checklist

Before scheduling a re-audit, verify all BLOCKER findings are closed:

- [x] V5-CRIT-01: Chat send fixed and tested end-to-end — 201 confirmed on prod 2026-05-18T03:28:48Z
- [ ] V5-CRIT-02: groupController schoolId filter added; reception sees only own-school groups confirmed live
- [ ] V5-CRIT-03: schoolWhere() throws or returns empty for null schoolId; no null-schoolId user can access cross-school data

When all three BLOCKERs are closed, re-run `PRODUCTION_READINESS_AUDIT_<new-date>.md`.
Target score for next cycle: ≥ 85% (CONDITIONAL GO) with goal of 95% (UNCONDITIONAL GO).
