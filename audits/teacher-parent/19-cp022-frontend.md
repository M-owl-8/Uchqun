# CP-022 Frontend Audit — Parent Compose: recipientLevel Selector + Escalation + Level Badge

**Date:** 2026-05-27  
**Scope:** CP-022 frontend — MessageModal recipientLevel selector (owner/region/republic), escalation flow, MessagesModal level badge + escalation chain + escalate button, ChildProfile.jsx wiring, 15 new tests.  
**Suite baseline:** teacher portal — full suite green (exit code 0)

---

## Deliverables

| File | Change |
|---|---|
| `teacher/src/parent/pages/childProfile/MessageModal.jsx` | Rewritten: 3-button recipientLevel selector, escalation notice, NEXT_LEVEL auto-advance |
| `teacher/src/parent/pages/childProfile/MessagesModal.jsx` | Rewritten: level badge, escalation chain indicator, escalate button |
| `teacher/src/parent/pages/ChildProfile.jsx` | Added `escalationTarget` + `messagesError` state; wired compose↔history escalation loop |
| `teacher/src/__tests__/pages/MessageModal.test.jsx` | New — 15 tests (8 MessageModal + 7 MessagesModal) |
| `teacher/src/__tests__/pages/ChildProfile.test.jsx` | Updated POST assertion to include `recipientLevel: 'republic'` |

---

## Design Decisions

- **recipientLevel selector**: 3 distinct color-coded buttons (amber=owner, blue=region, indigo=republic). Default: `'republic'` (matches backend default).
- **Escalation auto-advance**: `NEXT_LEVEL = { owner: 'region', region: 'republic', republic: 'republic' }`. When `escalatedFromLevel` prop is set, a `useEffect` fires and sets recipientLevel to NEXT_LEVEL[escalatedFromLevel].
- **Escalate button visibility**: Only shown when `msg.recipientLevel !== 'republic'` — republic is top level, no further escalation.
- **messagesError state**: Separate from fetch loading; shown as `data-testid="messages-error"` banner in MessagesModal.
- **Escalation loop**: MessagesModal `onEscalate` → sets `escalationTarget` in ChildProfile, closes MessagesModal, opens MessageModal with pre-filled level/subject/id.

---

## Security

- recipientLevel is validated server-side (`VALID_RECIPIENT_LEVELS = ['owner', 'region', 'republic']`). Frontend selector is UX-only guard.
- escalatedFromId ownership enforced server-side (`prior.senderId === req.user.id`). Frontend sends the ID; backend rejects mismatches with 403 `MESSAGE_ESCALATE_NOT_OWN`.

---

## Tests — MessageModal (8)

1. Renders 3 level buttons (owner, region, republic)
2. `republic` is selected by default (has `bg-indigo-100` class)
3. Clicking `owner` selects it (gains `bg-amber-100`)
4. Send POSTs with `recipientLevel=region` when region selected
5. Send POSTs with `escalatedFromId` when in escalation mode
6. Escalation notice banner rendered when `escalatedFromSubject` provided
7. `toastError` shown on POST failure with `MESSAGE_SUBJECT_REQUIRED` code
8. When `escalatedFromLevel='owner'`, defaults to `region` (NEXT_LEVEL advance)

## Tests — MessagesModal (7)

9. Level badge renders for `recipientLevel='region'`
10. Level badge renders for `recipientLevel='owner'`
11. Escalation chain indicator renders when `escalatedFrom` present
12. Escalate button fires `onEscalate` for owner-level message
13. Escalate button absent for republic-level messages
14. `messagesError` banner renders when error prop set
15. Empty state shown when no messages and no error

---

## Suite Result

Full teacher test suite: exit code 0 — all tests passed.  
New tests: 15/15 green.  
Pre-existing `Maximum update depth` warnings in Activities.test.jsx are unrelated to this change.
