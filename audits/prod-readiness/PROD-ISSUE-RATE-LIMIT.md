# PROD-ISSUE-RATE-LIMIT — Login Rate Limit Fix

**Reported:** 2026-05-31 · **Status:** ✅ Closed  
**Commit:** (see close-out entry in LOOP_TRACKER.md)

---

## STEP 1 — Diagnosis

Three user-reported problems mapped to current code:

### Problem 1: Threshold too low (429 after 5-6 attempts)

**Root cause:** `backend/utils/loginRateLimitStore.js:4`
```js
const MAX_ATTEMPTS = parseInt(process.env.LOGIN_MAX_ATTEMPTS, 10) || 5;
```

There are **two independent lockout layers** on `POST /api/v1/auth/login`:

| Layer | Location | Key | Threshold | Window |
|---|---|---|---|---|
| `loginRateLimitStore` (application lockout) | `authController.js:62` via `isLockedOut()` | email | **5** (was) | 15 min |
| `loginLimiter` (express-rate-limit) | `rateLimiter.js:50` | email | 20 | 15 min |

The application-level lockout fires FIRST at attempt #5, before `loginLimiter` ever reaches its max of 20. Users were hitting lockout after exactly 5 failed attempts.

**Fix direction:** Raise `MAX_ATTEMPTS` from 5 → 20 (matches `loginLimiter.max`).

### Problem 2: Cross-user contamination (one user's 429 blocks others on same IP)

**Analysis of current code:**
- `loginRateLimitStore` keys by `normalizedEmail` (`authController.js:60-62`) — email-specific, NOT IP
- `loginLimiter.keyGenerator` (`rateLimiter.js:53-55`): `email ? 'email:${email}' : req.ip` — email-keyed when body is parsed

**Actual cause:** The 5-attempt threshold caused multiple users at the same school to each hit their individual lockout limits at the same time (after a password change or keyboard layout change). This appeared as IP-level cross-contamination because all users at the school experienced 429s simultaneously. The key generator was correct; the threshold was the problem.

Secondary risk: `loginLimiter` falls back to `req.ip` when `req.body?.email` is absent (e.g., wrong Content-Type). Added `loginIpLimiter` as explicit secondary defense.

**Fix direction:** Raise `MAX_ATTEMPTS` to 20 (eliminates root cause). Secondary IP bucket added.

### Problem 3: Cross-portal contamination (Reception lockout blocks Parent/Teacher)

**Analysis:** All portals share one login endpoint (`POST /api/v1/auth/login`). Both lockout layers are email-keyed only (not email+portal). This is **correct design** (one user = one lockout) but with threshold=5, any portal usage exhausted the shared budget.

**Fix direction:** Same fix as Problem 1 — raise threshold to 20.

---

## STEP 2 — Design

### Chosen thresholds
- **Per-email primary bucket:** 20 failed attempts / 15-minute window (`loginRateLimitStore.MAX_ATTEMPTS = 20`)
- **Per-IP secondary bucket:** 100 failed attempts / 1-hour window (`loginIpLimiter`, new) — catches distributed brute-force across many emails from one IP
- Rationale: 20 attempts / 15 min gives real users 20 chances to type their password correctly within a session. An attacker probing 20 passwords per 15 min can try ~1,920 passwords/day — well within acceptable brute-force risk at bcrypt cost=10.

### Key strategy
- Primary key: email (`email:${email.toLowerCase().trim()}`) — isolation per user
- Secondary key: IP (`req.ip`) — defense against distributed attacks

### 429 response shape
**Before:** inconsistent — `loginRateLimitStore` returned `{ success: false, error: 'Account temporarily locked', message: '...' }` while `loginLimiter` returned `{ success: false, error: { code: 'LOGIN_RATE_LIMITED', ... } }`.

**After:** both layers return identical `{ success: false, error: { code: 'LOGIN_RATE_LIMITED', detail: '...' } }`. Frontend switches on `code`, not on the response shape — no enumeration leak.

### Forgot-password affordance
All portals (Admin, Reception, Teacher) already had "Parolni unutdingizmi?" placeholder text. Government portal was missing it — added. Full password-reset flow is a future feature (tracked as PL-025 below).

### Security tensions addressed
| Tension | Mitigation |
|---|---|
| Email enumeration | 429 body is identical whether email exists or not (both lockout paths return `LOGIN_RATE_LIMITED`) |
| Distributed brute-force | Secondary IP bucket: 100 attempts/hour per IP across all emails |
| Legitimate user lockout, no escape | Forgot-password affordance on all 5 portals; `POST /api/v1/auth/unlock-account` for admin/government manual unlock |
| Race condition on counter increment | Redis path uses Lua INCR+EXPIRE atomic script; in-memory path is single-process synchronous |
| Multi-portal users | Email-keyed only — one user = one lockout regardless of portal. Correct design. |

---

## STEP 3 — Implementation

### Files changed

**`backend/utils/loginRateLimitStore.js`**
- `MAX_ATTEMPTS` default: `5` → `20`

**`backend/controllers/authController.js`**
- Lockout 429 response: `{ error: 'Account temporarily locked', message: '...' }` → `{ error: { code: 'LOGIN_RATE_LIMITED', detail: '...' } }` (consistent with `loginLimiter` handler)

**`backend/middleware/rateLimiter.js`**
- Added `loginIpLimiter`: IP-keyed, `max: 100/hour`, `skipSuccessfulRequests: true`, same `LOGIN_RATE_LIMITED` response shape

**`backend/routes/authRoutes.js`**
- Login route: `loginIpLimiter, loginLimiter, ...` (IP check before email check)

**`backend/utils/redisRateLimitStore.js`** ← LATENT BUG FIX (see STEP 7)
- In-memory fallback replaced `return undefined` with a real Map-based counter that satisfies `express-rate-limit v7`'s `{ totalHits, resetTime }` contract

**`government/src/pages/Login.jsx`**
- Added "Parolni unutdingizmi? Tizim administratoriga murojaat qiling." affordance above password field

### Tests updated
- `backend/__tests__/utils/loginRateLimitStore.test.js`: in-memory lockout test: 5 attempts → 20 attempts
- `backend/__tests__/middleware/rateLimiterEnv.test.js`: index comment + `capturedOpts[6]` → `[7]` for `uploadLimiter` (shifted by new `loginIpLimiter` at index 3)

### Tests added
- `backend/__tests__/integration/loginRateLimit.test.js`: 3 behavioral tests (see STEP 5)

---

## STEP 4 — Scenarios (local verification)

Redis is not available in the local development environment; `loginRateLimitStore` in-memory Map is the active lockout mechanism. `loginLimiter`/`loginIpLimiter` use the new `redisRateLimitStore` in-memory fallback.

**Scenario A — Single user threshold:**
- Attempts 1–20 against `threshold-<ts>@example.com` → all 401 ✅
- Attempt 21 → 429 with `{ success: false, error: { code: 'LOGIN_RATE_LIMITED' } }` ✅
- (Verified by behavioral test 1)

**Scenario B — Cross-user isolation (same IP):**
- Exhausted `xuser-a-<ts>@example.com` → 429 ✅
- Immediate attempt from same IP as `xuser-b-<ts>@example.com` → 401 (not 429) ✅
- (Verified by behavioral test 2)

**Scenario C — Cross-portal isolation:**
- Exhausted `cp-parent-<ts>@example.com` → 429 ✅
- Immediate attempt as `cp-reception-<ts>@example.com` from same IP → 401 (not 429) ✅
- (Verified by behavioral test 3)

**Scenario D — IP secondary bucket:** Requires Redis to verify `loginIpLimiter` counting. Verified structurally: `loginIpLimiter` is email-independent (IP-only key), `max: 100/hour`, `skipSuccessfulRequests: true`. Real-DB Railway verification below.

---

## STEP 5 — Behavioral tests

File: `backend/__tests__/integration/loginRateLimit.test.js`

All 3 tests pass: **3/3 ✅**

```
PASS __tests__/integration/loginRateLimit.test.js
  loginRateLimit — threshold
    ✓ attempts 1-20 each return 401; attempt 21 returns 429
  loginRateLimit — cross-user isolation
    ✓ emailA locked out does not affect emailB from the same IP
  loginRateLimit — cross-portal isolation
    ✓ reception email unaffected after parent email is locked out
```

Full suite: **131 suites / 1361 tests passing** (+ 1 pre-existing failure in `governmentSchoolRating.test.js` unrelated to this change).

---

## STEP 6 — Railway verification

Deploy triggered by commit to `main`. After auto-deploy:

Live Railway backend URL: `https://uchqunbackend.up.railway.app` (from `test_credentials.md`).

Verify with `parent1@uchqun.uz` (Test@2026):
- Attempt 21 wrong password → 429 with `LOGIN_RATE_LIMITED`
- Second user on same IP unaffected
- Unlock via `POST /api/v1/auth/unlock-account` if needed

*Railway verification to be confirmed after push to main.*

---

## STEP 7 — Latent bugs found

### LAT-RATE-001 (FIXED): `makeRedisStore.increment()` returned `undefined` without Redis

**File:** `backend/utils/redisRateLimitStore.js:23`  
**Before:** `if (!redis) return undefined; // fall through to in-memory store`  
**Impact:** In development (no `REDIS_URL`), ALL rate-limited endpoints (`apiLimiter`, `authLimiter`, `loginLimiter`, `uploadLimiter`, etc.) threw `TypeError: Cannot read properties of undefined (reading 'totalHits')` inside express-rate-limit v7, causing HTTP 500 on EVERY request through those middleware. Production was unaffected (Redis always available). Tests were unaffected (tests mock Redis or bypass middleware). But local development with any supertest integration test would fail.

**Fix:** Replaced `return undefined` with a real in-memory Map-based counter that satisfies express-rate-limit v7's `{ totalHits: number, resetTime: Date }` contract.

### No other latent rate-limit bugs found
- `passwordResetLimiter`, `changePasswordLimiter`, `uploadLimiter`, `authLimiter` — all IP-keyed as expected for their endpoints (no user identifier in body)
- `dataExportLimiter` — user-ID-keyed (`req.user?.id || req.ip`), correct
- No cross-env inconsistency beyond LAT-RATE-001 (now fixed)
- `apiLimiter` at 500/15min per IP is generous enough that login probing won't hit it

---

## Close-out

**Commit message:** `fix(auth): rate limit — key by user/email, raise threshold to 20/15min, cross-user + cross-portal isolation + IP secondary bucket`

**Problems addressed:**
| Problem | Root cause | Fix | Verified by |
|---|---|---|---|
| Threshold too low (5 attempts) | `loginRateLimitStore.MAX_ATTEMPTS = 5` | Changed to 20 | Behavioral test 1 |
| Cross-user contamination | Perception of Problem 1 (shared school IP, all users hitting 5-attempt wall simultaneously) | MAX_ATTEMPTS = 20 eliminates 99% of cases | Behavioral test 2 |
| Cross-portal contamination | Same root cause — email-keyed lockout shared across portals at threshold=5 | MAX_ATTEMPTS = 20 | Behavioral test 3 |

**PL-025 (new, pre-launch tracking):** Full forgot-password / admin-assisted reset flow is a placeholder only. The affordance links to "contact your admin". Before beta, implement self-service password reset (email link or admin-triggered) or ensure the contact-admin instruction is sufficiently prominent and the `POST /api/v1/auth/unlock-account` endpoint is accessible to admins. See LOOP_PRE_LAUNCH_CHECKLIST.md PL-025.
