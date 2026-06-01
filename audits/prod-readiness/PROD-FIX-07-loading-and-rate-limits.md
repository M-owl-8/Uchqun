# PROD-FIX-07 — Loading States + Rate Limit Residuals (10 Items Closed)

**Date:** 2026-06-01  
**Source:** PROD-ISSUE-AUDIT-01 Categories 8 (Loading States) + 1 (Rate Limits residuals)  
**Commit:** (see close-out below)

---

## STEP 0 — Skeleton component decision

`shared/components/Skeleton.jsx` already exports: `SkeletonLine`, `SkeletonAvatar`, `SkeletonCard`, `SkeletonTable`, `SkeletonStat`, `SkeletonDashboard`, `SkeletonList`. All needed shapes are covered.

**Decision: reuse existing shared component.** No new component created.

---

## STEP 1 — HIGH

### LS-001 — Reception dashboard loading skeleton ✅

**File:** `reception/src/pages/Dashboard.jsx`

**Root cause:** `const [, setLoading]` — the loading state was destructured away (`,` discards the value). The component never knew whether it was loading or not, so it always rendered with `parents = []` and `stats = null` during the initial fetch — triggering the PROD-FIX-04 empty states (ES-006 recent activity) before data arrived.

**Fix:**
1. Changed to `const [loading, setLoading] = useState(!cache.get(CACHE_KEY))`.
2. Added `if (loading) return <SkeletonDashboard stats={3} cards={2} />;` early return.

This is a true early-return guard: since the empty state is rendered inside the `return (...)` block (which is now unreachable during loading), ES-006's recent-activity empty state is automatically suppressed. No additional gating needed.

**LS/ES interaction verified:** loading → skeleton → data (no false empty flash).

---

## STEP 2 — MEDIUMs

### LS-002 — Teacher Chat no loading state ✅

**File:** `teacher/src/pages/Chat.jsx`

Added:
- `loadingParents` (true when no cache): shows an animated placeholder bar in the parent-selector row during the initial parents fetch.
- `loadingMessages` (true during each message load): shows 3 staggered animated skeleton bubbles in the message area.

Both suppress the `t('chat.empty')` text during load.

### LS-003 — Teacher DailyReflection false empty state ✅

**File:** `teacher/src/pages/DailyReflection.jsx`

Added `const [loading, setLoading] = useState(true)`. Set to `false` in the `Promise.allSettled().then().finally()` handler. The observations empty state ("Bugun hali kuzatuv yozilmadi") is now gated: `loading ? skeleton : observations.length === 0 ? emptyState : list`.

Skeleton: 3 animated `h-16 rounded-xl` pulse divs — matches the height of a typical observation card.

### LS-004 — BulkImport progress bar ✅

**File:** `admin/src/pages/BulkImport.jsx`

In step 4 (polling), when `pollStatus.processedRows` and `pollStatus.totalRows` are available:
- Shows "X / Y satr" numeric progress
- Renders a brand-600 progress bar (CSS width = `processedRows / totalRows * 100%`, clamped to 100%)
- Shows percentage label

Falls back gracefully to the existing "Import in progress…" text when the fields are absent (e.g. early poll response before the backend updates them).

### RL-002 — changePasswordLimiter IP-keyed → user-keyed ✅

**File:** `backend/middleware/rateLimiter.js`

Added `keyGenerator: (req) => \`chgpwd:${req.user?.id || req.ip}\``. Mirrors `dataExportLimiter` pattern.

Before: one shared-IP school could trigger the 10-attempt limit for all users at that IP. After: 10 failed attempts per user — other users at the same IP are unaffected.

### RL-003 — apiLimiter default raised to 1000 + env.example documented ✅

**File:** `backend/middleware/rateLimiter.js` + `backend/env.example`

Changed default from 500 → 1000 per 15-minute window. Rationale: portal staff browsing admin/teacher/reception pages in quick succession (loading dashboards, checking documents, navigating back and forth) can easily exceed 500/15min during normal work. 1000 is still conservative relative to automated attack thresholds.

Added `RATE_LIMIT_API_MAX` and related variables to `backend/env.example` with inline comments explaining each.

---

## STEP 3 — LOWs

### LS-005 — Parent Chat no initial loading indicator ✅

**File:** `teacher/src/parent/pages/Chat.jsx`

Added `loadingMessages` state. During initial load (and on socket-triggered reload), shows 3 skeleton bubble divs in alternating justify-start/end positions — matching the visual shape of a message thread. Suppresses the "chat.empty" text during load.

### RL-001 — Unmounted passwordResetLimiter removed ✅

**File:** `backend/middleware/rateLimiter.js`

Removed the `passwordResetLimiter` export entirely. No file in the codebase imports or uses it (confirmed via grep). When a password-reset feature is added (PL-025), a new limiter should be created at that point with proper user-ID keying.

### RL-004 — loginIpLimiter no-unlock-path documented ✅

**File:** `backend/middleware/rateLimiter.js`

Added code comment above `loginIpLimiter` explaining the limitation: the `/auth/unlock-account` endpoint clears the per-email lock but cannot clear the IP-level lock without knowing the user's IP address. The IP bucket auto-expires after 1 hour. If a future unlock-by-IP path is needed, the recommendation is to store the last-blocked IP in the user record during lockout so an admin can supply it to the unlock endpoint.

### RL-005 — 429 response shape standardized ✅

**File:** `backend/middleware/rateLimiter.js`

Migrated all non-conforming handlers to BACKEND-012 shape (`{ success: false, error: { code, detail } }`):

| Limiter | Old shape | New code |
|---------|-----------|----------|
| `apiLimiter` | `{ error: string, message: string, retryAfter }` | `API_RATE_LIMITED` |
| `authLimiter` | `{ error: string, message: string, retryAfter }` | `AUTH_RATE_LIMITED` |
| `changePasswordLimiter` | `{ error: string, message: string }` | `CHANGE_PASSWORD_RATE_LIMITED` |
| `uploadLimiter` | `{ error: string, message: string, retryAfter }` | `UPLOAD_RATE_LIMITED` |

`loginLimiter` and `loginIpLimiter` were already BACKEND-012 compliant. `dataExportLimiter` was already compliant. `passwordResetLimiter` was removed (RL-001).

---

## STEP 4 — LS/ES Interaction Verification

| Loading state | Empty state (PROD-FIX-04) | Verified |
|---------------|--------------------------|---------|
| LS-001 Reception dashboard (loading = true) | ES-006 recent-activity empty state | ✅ Suppressed — early return before empty state renders |
| LS-003 DailyReflection (loading = true) | "Bugun hali kuzatuv yozilmadi" | ✅ Suppressed — ternary: `loading ? skeleton : (obs.length === 0 ? emptyState : list)` |
| LS-002 Teacher Chat (loadingParents = true) | `t('chat.empty')` in parent selector | ✅ Parent selector replaced by animated bar during load |
| LS-002 Teacher Chat (loadingMessages = true) | `t('chat.empty')` in message area | ✅ Skeleton shown, empty state gated by `!loadingMessages` |
| LS-005 Parent Chat (loadingMessages = true) | `t('chat.empty')` | ✅ Same pattern |

---

## STEP 5 — Honest Count

| Item | Severity | Status |
|------|----------|--------|
| LS-001 | HIGH | ✅ Closed |
| LS-002 | MEDIUM | ✅ Closed |
| LS-003 | MEDIUM | ✅ Closed |
| LS-004 | MEDIUM | ✅ Closed |
| RL-002 | MEDIUM | ✅ Closed |
| RL-003 | MEDIUM | ✅ Closed |
| LS-005 | LOW | ✅ Closed |
| RL-001 | LOW | ✅ Closed |
| RL-004 | LOW | ✅ Closed |
| RL-005 | LOW | ✅ Closed |

All 10 items closed. No deferrals.

**Audit ledger:** HIGH 1→0 (−1), MEDIUM 10→5 (−5), LOW 4→0 (−4).  
**Total open: 14→5. HIGH count = 0. Major milestone.**

Remaining 5 items are all MEDIUM — i18n catalog completion (PROD-FIX-08).

---

## STEP 6 — Adjacent Latent Findings

**LAT-LS-001 (LOW):** `admin/src/pages/Communications.jsx` — message thread list shows empty state immediately while fetching. Same pattern as LS-003. Flagged for PROD-FIX-08 sweep.

**LAT-LS-002 (LOW):** `government/src/pages/Schools.jsx` — schools list renders 0 items while paginating. `loading` state exists but doesn't suppress the `schools.notFound` empty text. Flagged.

**LAT-RL-001 (INFO):** The `retryAfter` value was removed from API/auth/upload 429 responses during the shape migration (RL-005). This value could be useful for frontend retry logic. Future: include as `error.detail` or as a separate response header via `standardHeaders: true` (which the limiter already sets as `Retry-After`). The Retry-After header is available regardless.
