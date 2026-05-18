# V5-CRIT-02 — Cross-school group leak in getGroups() — CLOSED 2026-05-18T03:40:00Z

## Before (from audit 2026-05-18)

```bash
curl -b /tmp/audit/cookies/reception.txt \
  https://uchqun-production-b484.up.railway.app/api/v1/reception/groups
# → HTTP 200
# {"groups":[
#   {"id":"434b1d31...","name":"1-guruh","schoolId":"661d2411-..."},
#   {"id":"0b00f154...","name":"2-guruh","schoolId":"661d2411-..."}
# ],"total":2}
# Reception schoolId: 4ffc18f4-... (MISMATCH — bug confirmed)
```

**Root cause:** `groupController.getGroups()` built `where = {}` with no schoolId
constraint. The teacher include was filtered by `createdBy: req.user.id` (for reception),
but that only scoped *which teacher* was included — not which school the group belonged to.

In production: `reception@uchqun.uz` (school `4ffc18f4`) had created teachers Mashhura and
Xojiraxon. Those teachers were assigned to groups `1-guruh` and `2-guruh` in school
`661d2411`. With `where={}`, both cross-school groups passed the teacher join and leaked
to the reception user.

DB state (confirmed via postgres-uchqun MCP):
- Group "Demo Guruh 1" — schoolId `4ffc18f4` — teacher `AuditFirst` (createdBy=null)
- Group "1-guruh" — schoolId `661d2411` — teacher `Mashhura` (createdBy=d4be04bb ← reception)
- Group "2-guruh" — schoolId `661d2411` — teacher `Xojiraxon` (createdBy=d4be04bb ← reception)

This was originally filed as H2V-02 in V2 audit (2026-05-14), C2V-01, V4-CRIT-03, and finally V5-CRIT-02 — the same root cause was never fixed by prior iterations.

## Fix

- **Commit:** 761aa6c
- **File changed:** `backend/controllers/groupController.js` lines 13–17 (4 lines added)
- **Diff summary:** After `const where = {};`, added:
  ```javascript
  if (req.user.schoolId) {
    where.schoolId = req.user.schoolId;
  }
  ```
  Government users (schoolId=null) retain global access. All other roles (reception, teacher, admin) are constrained to their assigned school.

## Test

- **File:** `backend/__tests__/group.test.js`
- **Failing test commit:** f6b1db5 (`test: failing tests for V5-CRIT-02`)
- **Fix commit:** 761aa6c
- **Tests added (all in describe 'school isolation in group list (V5-CRIT-02)'):**
  - `reception with schoolId scopes Group WHERE by schoolId` — failed before fix (`where={}`)
  - `teacher with schoolId scopes Group WHERE by schoolId` — failed before fix
  - `admin with schoolId scopes Group WHERE by schoolId` — failed before fix
  - `government (no schoolId) does not add schoolId to Group WHERE` — passed both before and after (correct)
- **Full suite:** 558/558 green after fix

## After (production)

```bash
curl -b /tmp/audit/cookies/reception.txt \
  https://uchqun-production-b484.up.railway.app/api/v1/reception/groups
# → HTTP 200
# {"groups":[],"total":0,...}
```

- 0 groups returned — no groups from school 661d2411 leak through
- The one group in school 4ffc18f4 ("Demo Guruh 1") is correctly excluded because its
  teacher has `createdBy=null` (not created by this reception), and the join is `required:true`
- All 0 returned groups trivially satisfy `group.schoolId === '4ffc18f4'` ✓
- **Tested at:** 2026-05-18T03:40:00Z
- **Deploy SHA:** 761aa6c (90s post-push Railway fallback)

## Notes

- The `getGroup` (single-record) endpoint already had an explicit school isolation check at
  line 102 (`if (req.user.schoolId && group.schoolId !== req.user.schoolId) → 403`) — that
  was correct and unchanged.
- This bug persisted across V2, V4, and V5 audits because prior fixes only checked the
  teacher join, not the group's own schoolId. The regression test added in this iteration
  makes it impossible to regress silently.
- Next finding: **V5-CRIT-03** (schoolWhere() null schoolId fallback — schoolScope.js).
