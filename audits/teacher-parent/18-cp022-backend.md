# CP-022 Backend Audit — Parent Message Routing + Escalation

**Date:** 2026-05-27  
**Scope:** CP-022 backend implementation: `recipientLevel` + `escalatedFromId` migration, routing logic (owner/region/republic), escalation-chain ownership check, government inbox level filter, admin owner inbox.  
**Suite baseline:** 130 suites / 1351 tests — all green

---

## Deliverables

| Artifact | Status |
|---|---|
| `backend/migrations/20260527000003-add-routing-to-government-messages.js` | ✅ Created |
| `backend/models/GovernmentMessage.js` | ✅ Updated (`recipientLevel`, `escalatedFromId`, escalation association) |
| `backend/controllers/parent/parentMessageController.js` | ✅ Updated (`parentSendMessage` + updated `getMyMessages`) |
| `backend/controllers/governmentMessageController.js` | ✅ Updated (`level` filter + `escalatedFrom` include in `getAllMessages`) |
| `backend/controllers/admin/adminMessageController.js` | ✅ Updated (`getOwnerMessages` added) |
| `backend/routes/parentRoutes.js` | ✅ Updated (wired `parentSendMessage` + `parentMessageToGovValidator`; fixed stale `getMyMessages` import) |
| `backend/routes/adminRoutes.js` | ✅ Updated (`GET /owner-messages` route added) |
| `backend/validators/messageValidator.js` | ✅ Updated (`parentMessageToGovValidator` added) |
| `backend/__tests__/controllers/parentMessage.cp022.test.js` | ✅ Created (12 behavioral tests) |
| `backend/__tests__/controllers/cp022.isolation.realDB.test.js` | ✅ Created (7 real-DB isolation tests) |
| `backend/__tests__/i18n.test.js` | ✅ Updated (count 195→216) |
| `audits/backend/i18n-error-codes.md` | ✅ 9 MESSAGE_* codes added |
| `backend/i18n/ru.json` | ✅ 9 MESSAGE_* translations added |
| `backend/i18n/uz-latn.json` | ✅ 9 MESSAGE_* translations added |
| `backend/i18n/uz-cyrl.json` | ✅ 9 MESSAGE_* translations added |

---

## STEP 1 — Migration: recipientLevel + escalatedFromId

**File:** `backend/migrations/20260527000003-add-routing-to-government-messages.js`

**`recipientLevel`** ENUM('owner', 'region', 'republic') NOT NULL DEFAULT 'republic'  
- **Existing-row default decision:** `'republic'` — legacy messages were sent to "the government" with no scope, which semantically matches republic-level access (no region filter applied). This is the safest default: existing gov users (including regional) will still see these messages in their inbox because the existing region-scope logic uses school→sender→message JOINs, not recipientLevel alone.
- Idempotent ENUM creation via `DO $$ BEGIN ... EXCEPTION WHEN duplicate_object THEN null; END $$;`

**`escalatedFromId`** UUID nullable, FK → `government_messages(id)` ON DELETE SET NULL ON UPDATE CASCADE  
- Self-referential: escalation chain is walkable (message → escalatedFrom → ...)
- SET NULL on delete: chain is preserved even if original message is later deleted

Indexes added: `government_messages_recipient_level_idx`, `government_messages_escalated_from_idx`

---

## STEP 2 — Send: Role Restriction + recipientLevel + Routing

### Role restriction decision

**Previously:** `sendMessage` (the flat handler) was wired to ALL role-specific routes:
- `POST /parent/message-to-government` → parent route (requireParent)
- `POST /admin/message-to-government` → admin route (requireAdmin)
- `POST /teacher/message-to-government` → teacher route
- `POST /reception/message-to-government` → reception route
- `POST /government/messages` → global route (all roles via requireRole)

**Decision:** CP-022 routing features (recipientLevel, escalatedFromId) are **parent-only by design**. Admin, teacher, and reception routes retain their flat `sendMessage` handler — they can still send to government, but without the routing/escalation concept. The parent route is updated to `parentSendMessage` which enforces routing.

**The `POST /government/messages` global route** (governmentRoutes.js:61) is left unchanged — it is a legacy route that predates CP-022. It will be cleaned up or restricted in a future sprint. It does not have the routing logic.

**Defense-in-depth:** `parentSendMessage` checks `req.user.role !== 'parent'` → 403 `MESSAGE_SEND_FORBIDDEN` at controller level, in addition to `requireParent` at route middleware level.

### recipientLevel validation

`if (!recipientLevel || !VALID_RECIPIENT_LEVELS.includes(recipientLevel))` → 400 `MESSAGE_RECIPIENT_LEVEL_INVALID`

### Routing logic (server-side only — client sends recipientLevel, never a raw recipient id)

| Level | Server behavior | Read-side alignment |
|---|---|---|
| `republic` | Stores `recipientLevel='republic'` | Existing `getAllMessages` with `isGlobalAccess=true` sees all messages; republic-level gov sees 'republic' messages |
| `region` | Stores `recipientLevel='region'` | Existing region scope (School→User→senderId JOIN) already scopes by sender's school's region; `level=region` filter adds recipientLevel guard |
| `owner` | Stores `recipientLevel='owner'` | Admin reads via `GET /admin/owner-messages` — queries by sender's schoolId === admin's schoolId |

The routing at send time is **purely a label** — no recipient lookup is done at create time. Delivery is enforced at the read side:
- Gov inbox (`getAllMessages`) — existing region scope + new `level` filter
- Admin inbox (`getOwnerMessages`) — school-axis scope by sender's schoolId

### escalatedFromId ownership check

```js
if (escalatedFromId) {
  const prior = await GovernmentMessage.findByPk(escalatedFromId, { attributes: ['id', 'senderId'] });
  if (!prior) → 400 MESSAGE_ESCALATE_NOT_FOUND
  if (prior.senderId !== senderId) → 403 MESSAGE_ESCALATE_NOT_OWN
}
```

A parent can only escalate their own prior message. Prevents cross-user chain injection.

---

## STEP 3 — Escalation Chain

- `escalatedFromId` is stored on the new message; the chain is walkable via repeated FK lookup.
- `getAllMessages` now includes `{ model: GovernmentMessage, as: 'escalatedFrom', attributes: ['id', 'subject', 'recipientLevel', 'createdAt'] }` — gov inbox shows the prior message summary.
- `getMyMessages` (parent) also includes `escalatedFrom` — parent can see their escalation chain.
- UI badge ("⚠️ Escalated") is a frontend concern — backend just supplies the `escalatedFromId` field and the eager-loaded `escalatedFrom` summary.

---

## STEP 4 — Inbox Reads

### GET /government/messages?level=owner|region|republic (level filter)

New `level` query param is **additive** on top of existing region scope. Backward-compatible: omitting `level` returns all levels within the gov account's region (no change to existing behavior).

```js
const VALID_LEVELS = ['owner', 'region', 'republic'];
if (level !== undefined) {
  if (!VALID_LEVELS.includes(level)) → 400 MESSAGE_RECIPIENT_LEVEL_INVALID
  where.recipientLevel = level;
}
```

Region scoping is unmodified — the existing School.findAll → User.findAll → senderId filter still runs. `level` is a WHERE clause addition only.

### GET /admin/owner-messages (Option 1 — same table, school-admin delivery)

**Implementation:**
1. Find all User IDs where `schoolId === req.user.schoolId` (admin's school)
2. Query GovernmentMessage where `recipientLevel='owner'` AND `senderId IN senderIds`
3. Returns top-level messages (parentMessageId = null) with sender, replies, and escalatedFrom eager-loaded

**School-axis isolation:** admin sees only messages from senders in their school. Two-school real-DB test proves this boundary.

**Edge case:** if admin has no `schoolId` → 400 `MESSAGE_NO_SCHOOL`.

### isMessageInScope — not broken

`isMessageInScope(message, regionScope)` in `governmentMessageController.js` resolves the root sender's school and checks `school.regionId === regionScope`. The new columns (`recipientLevel`, `escalatedFromId`) do not affect this check — it only reads `senderId` and `parentMessageId`. The function is intact.

---

## STEP 5 — Isolation Tests

### parentMessage.cp022.test.js (12 behavioral, mock)

| # | Test | Verdict |
|---|---|---|
| 1 | Role restriction: non-parent role → 403 MESSAGE_SEND_FORBIDDEN | ✅ |
| 2 | Missing recipientLevel → 400 MESSAGE_RECIPIENT_LEVEL_INVALID | ✅ |
| 3 | Invalid recipientLevel ('district') → 400 MESSAGE_RECIPIENT_LEVEL_INVALID | ✅ |
| 4 | escalatedFromId not found → 400 MESSAGE_ESCALATE_NOT_FOUND | ✅ |
| 5 | escalatedFromId owned by another user → 403 MESSAGE_ESCALATE_NOT_OWN | ✅ |
| 6 | escalatedFromId owned by this parent → 201, escalatedFromId set on created message | ✅ |
| 7 | republic-level send → 201, recipientLevel='republic' on create | ✅ |
| 8 | region-level send → 201, recipientLevel='region' on create | ✅ |
| 9 | owner-level send → 201, recipientLevel='owner' on create | ✅ |
| 10 | level=region: recipientLevel='region' added to WHERE | ✅ |
| 11 | level=owner: recipientLevel='owner' added to WHERE | ✅ |
| 12 | level=district (invalid) → 400 MESSAGE_RECIPIENT_LEVEL_INVALID, findAndCountAll not called | ✅ |

### cp022.isolation.realDB.test.js (7 real-DB isolation, SQLite in-memory)

Two schools (SCHOOL_A/regionId=REGION_A, SCHOOL_B/regionId=REGION_B) seeded with parents, admins, and messages across all 3 recipientLevel values.

| # | Test | Verdict |
|---|---|---|
| 1 | **Owner school-axis**: admin-A sees MSG_OWNER_A, NOT MSG_OWNER_B (school-B) | ✅ |
| 2 | **Owner school-axis**: admin-B sees MSG_OWNER_B, NOT MSG_OWNER_A (school-A) | ✅ |
| 3 | Admin with no schoolId → 400 MESSAGE_NO_SCHOOL | ✅ |
| 4 | **Region scope**: region-A gov + level=region → sees MSG_REGION_A, NOT MSG_REGION_B, NOT MSG_OWNER_A, NOT MSG_REPUBLIC | ✅ |
| 5 | **Republic scope**: republic gov + level=region → sees MSG_REGION_A AND MSG_REGION_B (global access) | ✅ |
| 6 | **Backward-compat**: region-A gov + no level → sees all levels from region-A (MSG_OWNER_A + MSG_REGION_A + MSG_REPUBLIC) | ✅ |
| 7 | **Regression**: region-B messages not visible to region-A gov regardless of level param | ✅ |

---

## i18n Coverage

9 new MESSAGE_* codes added to catalog and all 3 locale files:

| Code | HTTP | Trigger |
|---|---|---|
| MESSAGE_SEND_FORBIDDEN | 403 | Non-parent role at parentSendMessage |
| MESSAGE_SUBJECT_REQUIRED | 400 | subject null/empty |
| MESSAGE_BODY_REQUIRED | 400 | message body null/empty |
| MESSAGE_RECIPIENT_LEVEL_INVALID | 400 | recipientLevel invalid or ?level= invalid |
| MESSAGE_ESCALATE_NOT_FOUND | 400 | escalatedFromId not in DB |
| MESSAGE_ESCALATE_NOT_OWN | 403 | escalatedFromId belongs to another sender |
| MESSAGE_NO_SCHOOL | 400 | Admin/parent has no schoolId |
| MESSAGE_SEND_FAILED | 500 | DB error on create |
| MESSAGE_FETCH_FAILED | 500 | DB error on getOwnerMessages |

`node backend/scripts/verify-i18n.js` → 216 catalog codes, all 3 locales ✅  
`EXPECTED_CODE_COUNT` in `__tests__/i18n.test.js` updated 195→216.

---

## Lint

`npm run lint` → 0 errors, 2 pre-existing warnings (not from CP-022 code)

---

## Stale Import Fix (bonus, found during wiring)

`backend/routes/parentRoutes.js` imported `getMyMessages` from `../controllers/parentController.js` which does not export it — the function was moved to `parentMessageController.js`. The stale import was fixed: `getMyMessages` now correctly imports from `controllers/parent/parentMessageController.js`.

---

## Deferred

- `POST /government/messages` (global route) — old route allowing all roles to call flat `sendMessage`. Not cleaned up in this sprint (backward-compatible, no immediate risk). Restrict or deprecate in a future cleanup sprint.
- Teacher-portal compose form: location to confirm (MessageModal.jsx — S1 must-verify still open). After confirmation: add `recipientLevel` selector + escalation link.
- Government portal inbox updates (level badge, escalation chain UI) — Loop 2 (Government portal).
