# FIX LOG — Uchqun Production Systematic Remediation
**Started:** 2026-05-13T06:08:15Z  
**Branch:** main (Railway auto-deploy)  
**Target:** https://uchqun-production-b484.up.railway.app

---

## CRIT-01 — Migrations not running on Railway start
**Status:** RESOLVED  
**Commit:** `00d7436`  
**Files:** `backend/railway.toml`, `backend/nixpacks.toml`  
**Fix:** Changed `startCommand` from `npm start` to `npm run start:migrate` so Railway runs pending migrations before the HTTP server binds. Also bumped `healthcheckTimeout` from 60 → 120 s to allow for migration time. All 16 pending migrations (20260506–20260511) applied on next deploy.  
**Secondary:** Fixed `20260510000002` (enum RENAME VALUE before UPDATE, `ffe422b`) and `20260510000005` (guard recordedAt index on missing column, `08da2a8`) which were crashing the migration runner.

---

## HIGH-01 — schoolWhere() returns {} for null schoolId (tenant isolation bypass)
**Status:** RESOLVED  
**Commit:** `8400d92`  
**Files:** `backend/middleware/schoolScope.js`  
**Fix:** `schoolWhere()` now throws a 403-flagged error when a non-government/business user has `schoolId = null`, rather than returning `{}` which granted unrestricted cross-tenant access.  
**Note:** HIGH-02 data fix (backfill) was run before this code reached users — no lockout occurred.

---

## HIGH-02 — 31 production users have schoolId = null
**Status:** RESOLVED  
**Commit:** `7421b60` (script), run manually 2026-05-13  
**Files:** `backend/scripts/backfill-school-ids-v2.js`  
**Fix:** Script assigned all 31 null-schoolId users to the correct school via FK inference (teacher → group → school for parents; direct for teachers). 4 audit test accounts deleted (with their group and children). Post-run: 0 null-schoolId operational users remain.  
**Results:**
- Deleted: `audit-teacher@`, `audit-parent@`, `audit-new-teacher@`, `tenant-check-audit@` + Demo Guruh 1 group
- 1-guruh, 2-guruh groups → Uchqun School
- tursunova@, ibragimova@ teachers → Uchqun School
- 16 parents → Uchqun School (via teacher relationship)
- 3 parents → Demo Maktabi (no teacher link or teacher at Demo Maktabi)
- 2 teachers → Demo Maktabi
- 3 admin/reception → Demo Maktabi

---

## HIGH-03 — Reception creates teachers with null schoolId
**Status:** RESOLVED  
**Commit:** `8400d92`  
**Files:** `backend/controllers/receptionTeacherController.js`  
**Fix:** Added early guard in `createTeacher` — returns 403 if `req.user.schoolId` is null, preventing null schoolId propagation to new staff/parent accounts.

---

## MED-01 — CORS rejection triggers Express error handler (HTTP 500)
**Status:** RESOLVED  
**Commit:** `c4f12bd`  
**Files:** `backend/server.js`  
**Fix:** Changed `callback(new Error('CORS: Origin ... is not allowed'))` to `callback(null, false)`. Blocked origins now silently suppress the CORS header; the browser receives a standard CORS error without the server returning HTTP 500.

---

## MED-02 — Therapy controller triple-catch swallows all DB errors
**Status:** RESOLVED  
**Commit:** `c4f12bd`  
**Files:** `backend/controllers/therapyController.js`  
**Fix:** Removed triple-nested try/catch fallback chain. Controller now returns `500` on DB error rather than an empty result set, making failures visible.

---

## LOW-01 — Rate limiters use in-memory store (bypassed across instances)
**Status:** RESOLVED  
**Commit:** (this batch)  
**Files:** `backend/utils/redisRateLimitStore.js` (new), `backend/middleware/rateLimiter.js`  
**Fix:** Created a Redis-backed store for `express-rate-limit` v7 using the existing `ioredis` singleton. Falls back to in-memory when `REDIS_URL` is unset. Applied to all 5 limiters: `apiLimiter`, `authLimiter`, `passwordResetLimiter`, `aiChatLimiter`, `uploadLimiter`.

---

## LOW-02 — Socket.io uses in-memory adapter (no fan-out across instances)
**Status:** RESOLVED  
**Commit:** (this batch)  
**Files:** `backend/config/socket.js`, `backend/package.json`  
**Fix:** Installed `@socket.io/redis-adapter@^8.3.0`. When `REDIS_URL` is set, `initializeSocket` attaches the Redis adapter (pub = existing client, sub = duplicated client). Falls back to in-memory with a warning when Redis is unavailable.

---

## LOW-03 — CSP img-src allows all HTTPS origins
**Status:** RESOLVED  
**Commit:** (this batch)  
**Files:** `backend/middleware/security.js`  
**Fix:** Narrowed `imgSrc` from `["'self'", "data:", "https:"]` to `["'self'", "data:", "https://cloud.appwrite.io", "https://*.appwrite.io"]` — permits only the Appwrite CDN domains actually used for media.

---

## LOW-04 — Weak password minimum (6 chars, no complexity)
**Status:** RESOLVED  
**Commit:** (this batch)  
**Files:** `backend/validators/receptionValidator.js`, `backend/validators/adminValidator.js`, `backend/controllers/admin/adminUserController.js`, `backend/controllers/userController.js`  
**Fix:** Upgraded all password checks to: min 8 characters + at least one uppercase, one lowercase, one digit. Removed redundant 6-char controller check in `changePassword` (validator already enforces stronger rules on that route).

---

## TRIV-01 — Audit test accounts in production DB
**Status:** RESOLVED (via HIGH-02 backfill script, run 2026-05-13)  
**Fix:** All 4 audit test accounts and their associated group/children deleted as part of HIGH-02 backfill execution.

---

## TRIV-02 — Duplicate entry in .gitignore
**Status:** RESOLVED  
**Commit:** `736e458`  
**Files:** `.gitignore`  
**Fix:** Removed duplicate `.claude/settings.local.json` entry.

---

## TRIV-03 — nixpacks.toml out of sync with railway.toml start command
**Status:** RESOLVED  
**Commit:** `736e458`  
**Files:** `backend/nixpacks.toml`  
**Fix:** Updated `cmd` from `npm start` to `npm run start:migrate` to match railway.toml.

---

## Summary
All 13 tracked issues resolved. Critical migration runner fix (CRIT-01) unblocked all downstream endpoints. Tenant isolation bypass (HIGH-01/02/03) closed after safe data backfill. Security hardening (LOW-01–04) applied in single batch. No force-pushes, no secrets committed, AUDIT_REPORT.md and FIX_LOG.md preserved throughout.
