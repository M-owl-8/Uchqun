# Phase 8 v2 — AI Service Verification
**Date:** 2026-05-09  
**Baseline:** `/audit/08-ai-service.md` (2026-05-07)  
**Mode:** Read-only verification. No project files modified.

---

## Executive Summary

Of the 10 issues, **3 are verified-fixed** and **7 are not-fixed**. The three fixes came from two tracker items with Phase 8 overlap: `#04-002` (N+1 Sidebar → `/chat/unread-count`, also 08-001) and `M-11` (chat:message Socket.io emit, also 08-008), and `#08-010` (JWT_EXPIRE default corrected to 15m).

The teacher AI controller was split into a new file (`teacherAIController.js`) as part of the L-04 refactor, but the core logic was moved as-is — the 503-on-missing-key path, the missing OpenRouter headers, and the absence of fallback are all unchanged. The AI input max-length, unverified client history, OpenRouter retry loop, notification stub, and AIChat localStorage PII remain unaddressed.

**Phase 8 v2 score: 48/100** (up from 41/100).

---

## Scope

Verification of all 10 issues from `/audit/08-ai-service.md`. All evidence from current code at HEAD.

---

## Per-Issue Verification Table

| Issue ID | Original Severity | Verdict | Evidence (file:line at HEAD) | Notes |
|----------|------------------|---------|------------------------------|-------|
| 08-001 | HIGH | **verified-fixed** | `teacher/src/components/Sidebar.jsx:43`; `teacher/src/parent/components/Sidebar.jsx:66` | Both Sidebars now call `/chat/unread-count` at 30s intervals; same finding as 04-002 |
| 08-002 | HIGH | **not-fixed** | `backend/controllers/teacherAIController.js:48,51-54` | `res.status(503)` on missing key unchanged; no fallback; no OpenRouter headers in `new OpenAI({})` |
| 08-003 | HIGH | **not-fixed** | `backend/routes/parentRoutes.js`; `backend/routes/teacherRoutes.js` | No AI-specific rate limiter found; only global `apiLimiter` applies |
| 08-004 | MEDIUM | **not-fixed** | `backend/controllers/parent/parentAIController.js:8`; `teacherAIController.js:7` | Both check for empty but no upper-bound on `message.length`; input tokens unbounded |
| 08-005 | MEDIUM | **not-fixed** | `backend/controllers/parent/parentAIController.js:36-40` | `req.body.messages` still accepted, sanitized by shape only, not verified as originating from current user |
| 08-006 | MEDIUM | **not-fixed** | `backend/controllers/parent/parentAIController.js:159-219` | Sequential free-model fetch + retry loop unchanged; up to 30s latency before fallback |
| 08-007 | MEDIUM | **not-fixed** | `backend/controllers/aiWarningController.js:292-340` | `sendWarningNotifications` still resolves user targets, logs count, then returns — no notification sent |
| 08-008 | MEDIUM | **verified-fixed** | `backend/controllers/chatController.js:5,91,100` | `emitToUser` imported and called; parent gets `chat:message` at line 91; teacher IDs at line 100; fixed via M-11 |
| 08-009 | LOW | **not-fixed** | `teacher/src/parent/pages/AIChat.jsx:15,45` | `localStorage.getItem/setItem` with no TTL or size cap; PII persists unbounded; same as 04-006 |
| 08-010 | LOW | **verified-fixed** | `backend/config/env.js:46` | `JWT_EXPIRE: Joi.string().default('15m')` — corrected from 30d; fixed via tracker `#08-010` |

**Verdict distribution: 3 verified-fixed · 0 partially-fixed · 7 not-fixed**

---

## Detailed Findings

### 08-001 — N+1 Sidebar polling (verified-fixed)

Confirmed in Phase 4 (04-002). Both teacher and parent `Sidebar.jsx` call `/chat/unread-count` at 30-second intervals. The `getUnreadTotalForPrefix` function with the N+1 loop still exists in `chatStore.js:38-65` as dead code but is no longer called from either Sidebar. The rate-limit risk from 21 requests/5s (252/minute) is eliminated.

---

### 08-002 — Teacher AI no fallback; no OpenRouter headers (not-fixed)

`teacherAIController.js` is the result of the L-04 split from `teacherController.js`. The split moved the function but did not fix it:

`teacherAIController.js:47-54`:
```js
const hasOpenAIKey = process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.trim().length > 0;
if (!hasOpenAIKey) return res.status(503).json({ error: 'AI service is not configured' });

const { default: OpenAI } = await import('openai');
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
});
```

No fallback when key is absent. No `defaultHeaders` for OpenRouter (`HTTP-Referer`, `X-Title`).

Compare with parent AI (`parentAIController.js:94-116`) which: (1) falls back to `generateFallbackResponse()` when key absent; (2) conditionally sets `defaultHeaders` when `OPENAI_BASE_URL` includes `openrouter.ai`.

The teacher AI continues to return 503 in any environment without a configured key, and may fail or be deprioritized by OpenRouter when used with an OpenRouter API key.

---

### 08-007 — aiWarningController notification stub (not-fixed)

`backend/controllers/aiWarningController.js:292-340` (`sendWarningNotifications`):
```js
async function sendWarningNotifications(warning, specificUserIds = null) {
  try {
    let targetUsers = [];
    // ... (resolves target users via User.findAll / Child.findAll) ...
    logger.info('Warning recipients resolved', {
      warningId: warning.id,
      usersNotified: targetUsers.length,  // ← logs the count
    });
  } catch (error) {
    logger.error(...);
  }
}  // ← returns here, having sent nothing
```

The function correctly resolves which users should be notified, logs a count, then exits. No push notification, no email, no in-app notification via `emitToUser`. The `POST /api/ai-warnings/:id/notify` endpoint still returns `{ success: true, message: 'Users notified' }` after calling this stub — the response is factually incorrect. The original audit described this as a stub; it remains one.

---

### 08-008 — Socket.io now wired to chat (verified-fixed)

`backend/controllers/chatController.js:5`:
```js
import { emitToUser } from '../config/socket.js';
```

`backend/controllers/chatController.js:91`:
```js
emitToUser(parseInt(parentId, 10), 'chat:message', msg.toJSON());
```

`backend/controllers/chatController.js:100`:
```js
teacherIds.forEach((tid) => emitToUser(tid, 'chat:message', msg.toJSON()));
```

`emitToUser` is now called on every new chat message — to the parent and to any associated teacher IDs. The Socket.io infrastructure (JWT auth, `userSockets` map, `emitToUser`) is no longer wasted. The teacher `Chat.jsx` subscribes to `chat:message` via `on()` and processes messages in real time (Phase 4 / 04-010 confirmed). The parent `Chat.jsx` still polls (04-010 not-fixed) but will receive messages faster via Socket.io on the backend even if the frontend doesn't subscribe yet. Fixed via M-11.

---

### 08-010 — JWT_EXPIRE default (verified-fixed)

`backend/config/env.js:46`:
```js
JWT_EXPIRE: Joi.string().default('15m'),
```

Corrected from `'30d'` to `'15m'`. If `JWT_EXPIRE` is absent from `.env`, access tokens now expire in 15 minutes as designed. The refresh-token rotation strategy is no longer undermined by the schema default. Fixed via tracker `#08-010`.

---

## Metrics Scorecard

| Metric | Original v1 Score | v2 Score | Delta | Drivers |
|--------|------------------|----------|-------|---------|
| Functional Correctness | 48% | 52% | +4 | (1) Socket.io now emits on every new chat message; (2) teacher AI fallback still 503 |
| Security | 44% | 49% | +5 | (1) JWT_EXPIRE at 15m restores auth security posture; (2) input max-length and unverified history unchanged |
| Performance | 28% | 36% | +8 | (1) N+1 Sidebar eliminated (biggest driver); (2) OpenRouter retry loop still 30s worst case |
| Reliability | 52% | 55% | +3 | (1) Short-lived JWT + refresh rotation now works as designed; (2) teacher AI still fails hard on missing key |
| Test Coverage | 38% | 38% | 0 | No new AI-specific tests |
| Coherence | 35% | 40% | +5 | (1) Socket.io now used for what it exists — real-time chat delivery; (2) notification stub still incoherent (returns success, sends nothing) |
| Documentation Coverage | 30% | 30% | 0 | No new AI cost/model/prompt documentation |
| Risk-on-Touch | 55% | 59% | +4 | (1) JWT short-lived reduces token-theft window; (2) N+1 rate-limit risk eliminated; (3) prompt injection surface unchanged |
| **Overall** | **41%** | **48%** | **+7** | |

---

## Open Questions (from v1, updated)

1. **08-002 teacher AI fallback:** Still hard-fails with 503. Adding `generateFallbackResponse()` (already exists in parentAIController) would close this.
2. **08-003 AI rate limiting:** No per-user or per-endpoint limit on AI calls. Unbounded token cost remains.
3. **08-007 notification stub:** `sendWarningNotifications` resolves users but sends nothing. The endpoint lies (`'Users notified'`). Needs either a real notification mechanism (emitToUser, email, push) or an honest error response.
4. **08-009 AIChat PII:** Child disability data in localStorage with no TTL is a pre-launch privacy concern.

---

## What I Did NOT Look At

- Full `parentAIController.js` (only key lines grep'd)
- `generateFallbackResponse()` implementation (confirmed it exists, not re-read)
- Whether `chatController.js` wraps the `emitToUser` calls in try/catch (partially visible: line 103 shows a catch for socket errors)
- Full `aiWarningController.js` content (read `sendWarningNotifications` function body only)
