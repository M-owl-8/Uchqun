# V5-CRIT-03 — schoolWhere() null schoolId returns {} (global access) — CLOSED 2026-05-18T03:59:10Z

## Before (from audit 2026-05-18)

**Source:** `backend/middleware/schoolScope.js` lines 27–33

```javascript
// schoolWhere returns { schoolId } for school-scoped roles, {} for government
// (global access), or throws if the caller has no schoolId assigned yet.
export const schoolWhere = (req) => {
  if (!req.user) return {};
  const { role, schoolId } = req.user;
  if (role === 'government') return {};
  if (!schoolId) return {};   // BUG: comment says "throws", code returns {} (global access)
  return { schoolId };
};
```

The function's documented contract (comment: "throws if the caller has no schoolId assigned
yet") did not match the implementation (returned `{}`, which acts as a global WHERE clause).
Any future controller calling `schoolWhere()` directly without a `requireSchoolScope` route
guard — thinking the function would throw — would silently expose all records across all schools.

**Active exploit status at time of audit:** Latent risk only. No controller imported
`schoolWhere()` directly (confirmed by grep across all routes/ and controllers/). The only
non-government user with `schoolId=null` in the DB was `v3alpha.admin@uchqun.uz`
(isActive=false, never logged in successfully). `requireSchoolScope` middleware already
correctly returned 403 for null-schoolId users at the route level.

**Prior audit history:** Originally flagged as HIGH-01 in V1 (2026-05-13), regressed
after fix, re-filed as V4-CRIT-02, persisted to V5-CRIT-03 across three audit cycles
because the implementation was never corrected to match the documented contract.

## Fix

- **Commit:** 442dcd9
- **Files changed:**
  - `backend/middleware/schoolScope.js` line 31 (1 line)
  - `backend/__tests__/middleware/schoolScope.test.js` lines 110–128 (2 test names + assertions updated)
- **Diff summary:** `if (!schoolId) return {};` → `if (!schoolId) throw new Error('schoolId not assigned — use requireSchoolScope as a route guard');`
  Two existing tests that asserted the wrong behavior (`toEqual({})`) updated to `toThrow()`.

## Test

- **Failing test commit:** c881698 (`test: failing test for V5-CRIT-03`)
- **Fix commit:** 442dcd9
- **New test:** `schoolWhere throws for non-government user with null schoolId (V5-CRIT-03)`
  - Exercises: admin, teacher, reception, parent, business — all with `schoolId: null`
  - Confirmed: failed before fix (function returned {} silently), passes after fix (throws)
- **Updated tests (corrected to assert proper contract):**
  - `throws for business without schoolId` (was `empty object for business without schoolId`)
  - `throws when user has no schoolId` (was `empty object when user has no schoolId`)
- **Full suite:** 559/559 green

## After (production)

**Regression check — normal admin with schoolId=4ffc18f4:**
```bash
curl -b /tmp/audit/cookies/admin.txt \
  https://uchqun-production-b484.up.railway.app/api/v1/admin/statistics
# → HTTP 200 {"success":true,"data":{...}}
```

**Null-schoolId inactive admin — blocked at login layer:**
```bash
curl -X POST https://uchqun-production-b484.up.railway.app/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"v3alpha.admin@uchqun.uz","password":"Admin@2026"}'
# → HTTP 401 {"success":false,"error":"Invalid email or password",...}
```

- **Tested at:** 2026-05-18T03:59:10Z
- **Deploy SHA:** 442dcd9 (90s Railway fallback)

## Notes

- **Why no direct API test for the null-schoolId case:** The only null-schoolId non-gov user
  in prod (`v3alpha.admin@uchqun.uz`) is inactive and login fails with 401. No controller
  calls `schoolWhere()` directly, so there is no API endpoint that exposes this code path.
  The fix is verified by unit tests + regression check that normal users are unaffected.
- **Defense layers now in place (innermost to outermost):**
  1. `schoolWhere()` throws — callers that bypass the route guard will get a 500, not silently global data
  2. `requireSchoolScope` → 403 for null-schoolId non-gov users (existing, unchanged)
  3. `isActive=false` for v3alpha.admin → 401 at login (existing, unchanged)
- **All three BLOCKERs (V5-CRIT-01, V5-CRIT-02, V5-CRIT-03) are now CLOSED.**
  Next step: re-run the full production readiness audit to calculate the updated score.
  Projected: ~82–88% (CONDITIONAL GO range), up from 71% (DELAY).
