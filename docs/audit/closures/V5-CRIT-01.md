# V5-CRIT-01 — Chat send broken (validator/controller format mismatch) — CLOSED 2026-05-18T03:28:48Z

## Before (from audit 2026-05-18)

```bash
# Attempt 1 — bare UUID (passes validator, rejected by controller access check)
curl -b parent.txt -X POST https://uchqun-production-b484.up.railway.app/api/v1/chat/messages \
  -H "Content-Type: application/json" \
  -d '{"conversationId":"94b43484-41a0-4f7f-9faf-c289e99c4485","content":"test"}'
# → HTTP 403 {"error":"Forbidden"}
# (UUID passes chatValidator, but canAccessConversation checks
#   conversationId === "parent:94b43484-..." — never matches a bare UUID)

# Attempt 2 — parent:UUID format (correct format, rejected by validator)
curl -b parent.txt -X POST https://uchqun-production-b484.up.railway.app/api/v1/chat/messages \
  -H "Content-Type: application/json" \
  -d '{"conversationId":"parent:94b43484-41a0-4f7f-9faf-c289e99c4485","content":"test"}'
# → HTTP 400 {"error":"Validation failed","details":[{"field":"conversationId",
#   "message":"conversationId must be a valid UUID"}]}
```

**Root cause:** `chatValidator.js` used `UUID_RE` (bare UUID pattern) while the
entire controller uses `parent:<UUID>` format — the format stored in `chat_messages.conversationId`
and returned by `GET /chat/conversations`. No valid input existed that could satisfy
both the validator and the controller simultaneously.

## Fix

- **Commit:** 7553760
- **Files changed:** `backend/validators/chatValidator.js` (5 lines changed)
- **Diff summary:** Added `CONVERSATION_ID_RE = /^parent:<UUID>$/i`; replaced `UUID_RE`
  with `CONVERSATION_ID_RE` in `sendMessageValidator` and `markReadValidator`. Message
  ID path params (`param('id')`) retain bare UUID check — that is correct.

## Test

- **File:** `backend/__tests__/chatValidator.test.js`
- **Failing test commit:** 98c8d17 (`test: failing test for V5-CRIT-01`)
- **Fix commit:** 7553760 (`fix(chat): accept parent:UUID conversationId format`)
- **Tests confirmed:**
  - Failed against pre-fix HEAD (98c8d17): `parent:UUID` rejected → `isEmpty() = false`
  - Pass against post-fix HEAD (7553760): all 6 tests green, 554 total tests green

## After (production)

```bash
curl -b /tmp/audit/cookies/parent.txt \
  -X POST https://uchqun-production-b484.up.railway.app/api/v1/chat/messages \
  -H "Content-Type: application/json" \
  -d '{"conversationId":"parent:94b43484-41a0-4f7f-9faf-c289e99c4485","content":"audit-verify-V5-CRIT-01"}'

# → HTTP 201
# {"id":"8ab8b1bb-dfa7-4957-b280-53963bea9df4",
#  "conversationId":"parent:94b43484-41a0-4f7f-9faf-c289e99c4485",
#  "senderId":"94b43484-41a0-4f7f-9faf-c289e99c4485",
#  "senderRole":"parent",
#  "content":"audit-verify-V5-CRIT-01",
#  "readByParent":true,"readByTeacher":false,
#  "updatedAt":"2026-05-18T03:28:48.127Z","createdAt":"2026-05-18T03:28:48.127Z","deletedAt":null}
```

- **Tested at:** 2026-05-18T03:28:48Z
- **Deploy SHA:** 7553760 (90s post-push, Railway confirmed live)
- **Test message cleaned up:** DELETE /chat/messages/8ab8b1bb... → 200 {"success":true}

## Notes

- `markReadValidator` had the same bug and is fixed in the same commit.
- The `updateMessageValidator` and `messageIdValidator` use `param('id')` with bare UUID — these are message record IDs (UUIDs in the `id` primary key), not conversation IDs. They are correct and unchanged.
- No related findings filed; no side effects observed.
- Next finding in tracker: **V5-CRIT-02** (cross-school group leak — `groupController.js`).
