# PP-CHAT-INTEGRITY — Parent chat confirmed on the shared model + layout parity

**Status:** 🟡 S9 phase-1 in progress (pending Railway round-trip walk against the single linked Hulkar↔Bobur's-teacher pair). Closes to ✅ only after phase 2, which depends on **TP-PARENT-ASSIGNMENT (S4)** for multi-parent verification.
**Scope:** Confirm parent chat is the same shared model as teacher (not a fork); fix any parent-perspective copy drift; bring messenger layout to platform parity (date separators + bubble timestamps via shared formatDate). NO new architecture.

---

## Verification gate (state up front)

This brief had two dimensions:
1. **Confirm-and-fix** (S9, this session) — every claim backed by a pasted grep/read; layout parity gaps closed.
2. **Multi-parent round-trip** — depends on S4 repairing the canonical `Child.parentId` chain. PP-AUDIT confirmed only Hulkar↔Bobur is linked today. Phase 1 walks that one pair; phase 2 walks all linked pairs after S4 lands.

The tracker stays 🟡 (`phase-1-done`) until phase 2 closes it.

---

## 1. Shared model — paste evidence

### 1.1 Parent chat goes through the same shared `chatStore` service as teacher

`teacher/src/parent/pages/Chat.jsx` (top-of-file imports):
```jsx
import { loadMessages, addMessage, markRead, updateMessage, deleteMessage }
  from '../../shared/services/chatStore';
```

`teacher/src/shared/services/chatStore.js` — the **only** chat-API surface used by parent (every function pasted verbatim):
```js
import api from './api';

export async function loadMessages(conversationId) {
  const res = await api.get('/chat/messages', { params: { conversationId, limit: 200 } });
  return Array.isArray(res.data) ? res.data : [];
}

export async function addMessage(author, text, conversationId) {
  const res = await api.post('/chat/messages', { conversationId, content: text });
  return res.data;
}

export async function markRead(conversationId) {
  await api.post('/chat/read', { conversationId });
}

export async function updateMessage(messageId, content) {
  const res = await api.put(`/chat/messages/${messageId}`, { content: content.trim() });
  return res.data;
}

export async function deleteMessage(messageId) {
  const res = await api.delete(`/chat/messages/${messageId}`);
  return res.data;
}
```

These hit the **same five endpoints** the teacher messenger uses (`teacher/src/pages/Chat.jsx` calls `api.get('/chat/conversations')`, `api.get('/chat/messages')`, `api.post('/chat/messages')`, `api.post('/chat/read')`, `api.put('/chat/messages/:id')`, `api.delete('/chat/messages/:id')`). The teacher also calls `/chat/conversations` for its left-panel list — parent doesn't need that endpoint because the parent always has exactly **one** conversation (see §1.3).

### 1.2 Same conversation-id format and routing

`teacher/src/parent/pages/Chat.jsx:14` — parent's conversation key:
```jsx
const conversationId = user?.id ? `parent:${user.id}` : null;
```

`backend/controllers/chatController.js:8` — backend builder used by both sides:
```js
const buildConversationId = (parentId) => `parent:${parentId}`;
```

`backend/controllers/chatController.js:10-13` — backend scoping check for parent role:
```js
if (req.user.role === 'parent') {
  return conversationId === buildConversationId(req.user.id);
}
```

The parent's frontend produces exactly the id the backend expects. Round-trip: parent sends → server stores against `parent:<parentId>` → teacher fetches their conversation list → sees the same `parent:<parentId>` row → opens it → reads the message. **One row, two views.**

### 1.3 Architectural note — parent has ONE conversation by design

The teacher portal needs a conversation list (it talks to many parents). The parent portal does NOT — every parent has exactly one thread keyed on `parent:<their userId>`, regardless of how many children they have (multi-child parents still share the single thread; the backend message rows just carry whichever sender wrote them). That's a deliberate model choice — fewer dropdowns, one canonical place to find every message about every child.

This is also why parent `Chat.jsx` doesn't need a list panel and doesn't have a mobile list↔thread toggle. The page IS the thread.

---

## 2. Round-trip + create-on-first-send

**Round-trip:** parent posts via `POST /chat/messages { conversationId: 'parent:<P>', content: '…' }`. The teacher fetches via `GET /chat/messages?conversationId=parent:<P>&limit=200` and the row is in the response. Same backend model (`ChatMessage` rows with `conversationId, senderId, senderRole, content, readByParent, readByTeacher, createdAt, updatedAt`). No parallel parent-only model.

**Create-on-first-send** is implicit in the backend: there is no separate `Conversation` table. The "conversation" is simply the set of `ChatMessage` rows sharing a `conversationId`. When parent (or teacher) sends the first message, the message row is created with that id, and from that point both ends can read/list it. **Nothing to wire on the parent side** — the parent's first message creates the thread on its own. Verified by reading `chatController.createMessage` (the simple `ChatMessage.create({ conversationId, senderId, senderRole, content, … })` at `:84` with no pre-existence check for the conversation).

---

## 3. Parent-perspective copy — confirmed correct, no leftovers

`teacher/src/parent/locales/{uz,en,ru}/common.json` — the `parentChat` namespace (three keys, parent-directed):

| Key | UZ | EN | RU |
|---|---|---|---|
| `parentChat.title` | "Tarbiyachi bilan chat" | "Chat with the teacher" | "Чат с учителем" |
| `parentChat.subtitle` | "Farzandingiz tarbiyachisiga xabar yuboring" | "Message your child's teacher" | "Напишите учителю вашего ребёнка" |
| `parentChat.placeholder` | "Tarbiyachiga xabar yozing..." | "Write a message to the teacher..." | "Напишите учителю..." |

Every parent-rendered string is reviewed and is parent-perspective:

| `t()` call in `parent/pages/Chat.jsx` | Renders | Verdict |
|---|---|---|
| `t('parentChat.title')` | Page title (S8 letterhead) | ✓ parent perspective |
| `t('parentChat.subtitle')` | Subtitle | ✓ parent perspective |
| `t('parentChat.placeholder')` | Composer input placeholder | ✓ parent perspective |
| `t('chat.empty')` | Empty state | ✓ role-neutral ("No messages") — fine from either side |
| `t('chat.you')` | Your own bubble label | ✓ role-neutral |
| `t('chat.teacher')` | The other bubble label | ✓ correct — the "other" from parent's perspective IS the teacher |
| `t('chat.edit')`, `t('chat.delete')`, `t('chat.confirmDelete')`, `t('chat.send')`, `t('chat.scrollToBottom')`, `t('cancel')`, `t('save')`, `t('chat.deleted')`, `t('chat.updated')`, `t('chat.deleteFailed')`, `t('chat.updateFailed')`, `t('chat.sendFailed')` | UI action labels + toasts | ✓ all role-neutral — generic, reusable on both sides without copy drift |

```
$ grep -rnE "t\('chat\.|t\('parentChat\." teacher/src/parent/pages/Chat.jsx
```
returned 19 hits, all enumerated above. **No teacher-perspective leftover** (the brief warned about a mirror of the teacher-side "Tarbiyachi bilan chat" bug; that string IS the title here, which is the correct parent perspective).

---

## 4. Layout parity — date separators + bubble timestamps added

The teacher messenger (`teacher/src/pages/Chat.jsx`) had two things the parent thread didn't:
1. **Date separators** between messages on different calendar days.
2. **Per-bubble timestamps** (`HH:MM`).

Both added this session, routed through the shared `formatDate` util (PP-DATE-LOCALE):

```jsx
import { formatTime, formatDateShort } from '@shared/utils/formatDate';

const isSameDay = (a, b) => {
  if (!a || !b) return false;
  return new Date(a).toDateString() === new Date(b).toDateString();
};
```

In the message loop:
```jsx
{sorted.map((msg, idx) => {
  const isYou = msg.senderRole === 'parent';
  const prev = sorted[idx - 1];
  const showSep = !prev || !isSameDay(prev.createdAt || prev.time, msg.createdAt || msg.time);
  return (
    <div key={msg.id}>
      {showSep && (
        <div className="flex items-center gap-2 my-4" aria-hidden="true">
          <div className="flex-1 h-px bg-p-sepia-100" />
          <span className="text-[10px] uppercase tracking-[.12em] text-p-sepia-500 shrink-0">
            {formatDateShort(msg.createdAt || msg.time, i18n.language)}
          </span>
          <div className="flex-1 h-px bg-p-sepia-100" />
        </div>
      )}
      …bubble…
      <div className={`text-[10px] mt-1 ${isYou ? 'text-p-sepia-500 text-right' : 'text-slate-500'}`}>
        {formatTime(msg.createdAt || msg.time, i18n.language)}
      </div>
    </div>
  );
})}
```

**Layout parity confirmed:**

| Element | Teacher (pages/Chat.jsx) | Parent (parent/pages/Chat.jsx) |
|---|---|---|
| Bubble alignment by `senderRole` | ✓ | ✓ (`senderRole === 'parent'` → right; teacher bubble → left) |
| Date separators (between days) | ✓ | ✓ (S9 added; uses `formatDateShort` via `i18n.language`) |
| Bubble timestamps | ✓ | ✓ (S9 added; uses `formatTime` via `i18n.language`) |
| Composer pinned at the bottom | ✓ | ✓ (flex column, composer in `border-t … rounded-b-2xl` at the column tail) |
| Send on Enter | ✓ | ✓ (`onKeyDown` → `handleSend()`) |
| Edit + delete on own messages | ✓ | ✓ (pencil + trash icons, `isYou` gated) |
| Confirm-delete modal | ✓ | ✓ |
| Scroll-to-bottom FAB | ✓ | ✓ |
| Empty state | ✓ | ✓ |
| Mobile list↔thread toggle | ✓ (needed because teacher has many threads) | n/a by design — parent has ONE thread |

**Conversation-list previews / S8 truncation:** parent doesn't have a conversation-list panel, so the S8 `flex-1 min-w-0` truncate fix doesn't have a render site on the parent side. The teacher-side fix (S8) still covers every preview rendered to teachers.

---

## 5. Scoping — privacy boundary locked in code AND in tests

### Backend code (already in production)
`backend/controllers/chatController.js:10-13`:
```js
if (req.user.role === 'parent') {
  return conversationId === buildConversationId(req.user.id);
}
```
For the parent role, the conversationId MUST equal `parent:<their userId>` — anything else returns false from `canAccessConversation`, which the message-list/send/update/delete/read handlers all gate on (lines `:55`, `:79`, `:126`, `:154`, `:182`). Parent A passing `parent:<B's id>` to any of those endpoints returns 403.

### Backend tests (already passing on `main`)
`backend/__tests__/chat.test.js` — full list of `it()` cases:
```
L42  '400 when conversationId missing'
L49  'parent can access only their own conversation'
L57  'parent denied access to another parent conversation'   ← THE one
L64  'government has access to any conversation'
L72  'admin has access to any conversation'
L80  'teacher denied when no groups'
L88  'teacher allowed when child of parent is in their group'
L98  'teacher denied when no child of parent is in their group'
L107 'reception allowed when they created the parent'
L116 'reception denied when they did not create the parent'
L124 'business role denied (no chat access)'
```

L49 + L57 lock the parent-side privacy boundary in regression. No new test added in S9 — would have been a duplicate of L57.

---

## 6. S4-gated note

Phase 2 of this audit waits on TP-PARENT-ASSIGNMENT (S4). Today, only Hulkar↔Bobur is canonically linked (PP-AUDIT B.3; TP-PARENT-ASSIGNMENT §1.4). When S4 lands:
- Lola's mother and Shahlo's mother gain their own `parent:<id>` conversations.
- Each parent sees only their own thread (because the conversationId in the URL is their own userId, hashed into `parent:<id>` — the canAccessConversation check at line 11-13 returns false for anyone else's id).
- Teacher Zulfiya sees all three threads in her conversation list (derived via `Child.groupId → Group.teacherId → Child.parentId`, the canonical chain S4 repairs).

There is nothing to change in this S9 surface when S4 lands — the scoping is already correct. The S4 fix only adds the data the surface needs to display.

---

## 7. Gates

| Gate | Status |
|---|---|
| `npm --prefix teacher run check:locales` | ✅ PASS — no new keys introduced; existing parentChat namespace covers every reference |
| Backend chat scoping regression (chat.test.js) | ✅ existing L49 + L57 lock parent A→B denial |
| Cyrillic/hardcoded JSX in parent (S2b carryover) | ✅ unchanged — no new strings introduced |
| Hardcoded date locales (PP-DATE-LOCALE carryover) | ✅ unchanged — added formatTime/formatDateShort imports route through `i18n.language` |
| `defaultValue:` masks (S2b carryover) | ✅ zero in teacher/src non-test files |
| ESLint / Vitest | ⚠️ pending CI — sandbox cannot install full dep tree |

---

## 8. Files modified in S9

| File | Change |
|---|---|
| `teacher/src/parent/pages/Chat.jsx` | + `formatTime`/`formatDateShort` shared-util imports; + `isSameDay` helper; + `i18n.language` from `useTranslation`; rewrote `.map()` loop to emit a date-separator row between calendar-day boundaries; + bubble timestamps below each message body |
| `audits/redesign/PP-CHAT-INTEGRITY.md` | NEW — pasted shared-model evidence + scoping test inventory + layout-parity table + S4-gated note |
| `LOOP_TRACKER.md` | + PP-CHAT-INTEGRITY tracker line |

No new keys, no new endpoints, no migrations.

---

## 9. User Railway verification

### PHASE 1 — single linked pair walk (NOW)

1. **Log in as Hulkar.** Open `/chat`. Conversation thread renders with the S8 letterhead `<ParentPageHeader>` ("Tarbiyachi bilan chat" / "Chat with the teacher" / "Чат с учителем").
2. **Parent → teacher round-trip.** Type "salom" → tap send → message appears on the right with the `bg-p-sepia-50` bubble and a timestamp (`HH:MM`) beneath. Open the teacher portal in another tab as the teacher (Zulfiya). Open the conversation with Hulkar → "salom" is there, with sender role `parent`. **Same row, both views.**
3. **Teacher → parent.** From the teacher's side, send "salom qaytib" → parent's `/chat` updates (socket pushes the message; if no socket, refresh). The new message appears on the left with the `bg-slate-100` bubble, the label "Tarbiyachi" (parent's view), and its own timestamp.
4. **Date separators.** If the conversation crosses calendar days, the separator row renders between groups — `formatDateShort(date, language)` localized (UZ short Latin month, RU short Russian month, EN short English month).
5. **Edit + delete.** On a message you sent (right bubble), tap the pencil → edit inline → save; confirm the row updates locally and via the next reload. Tap trash → confirm modal → confirm; row removed.
6. **Parent-perspective copy.** Header reads "Tarbiyachi bilan chat" (UZ) / "Chat with the teacher" (EN) / "Чат с учителем" (RU). The other-bubble label reads "Tarbiyachi" / "Teacher" / "Учитель". No teacher-perspective leftover ("send to parent", "ota-onaga yozish") anywhere.
7. **Layout.** Letterhead → thread Card → composer Card at the bottom (sticky inside the thread Card). On mobile, composer pinned to bottom (S3 mobile-fit confirmed); no list↔thread toggle because there's no list panel by design.
8. **Locale switch.** UZ → RU → EN — every visible string changes; timestamps + date separators localize via the shared formatter.

Reply **"verified phase 1"** → tracker stays 🟡 (`phase-1-done`); arc advances to S10.

### PHASE 2 — multi-parent walk (POST-S4)

After TP-PARENT-ASSIGNMENT closes:
1. Each of Lola's, Bobur's, Shahlo's parents see ONLY their own thread.
2. From a DevTools network tab, try `GET /chat/messages?conversationId=parent:<another parent's userId>` as parent A → confirm `403`. (The test at L57 of `chat.test.js` already locks this in code; phase 2 confirms it in production.)
3. Teacher Zulfiya sees all three threads in her conversation list (derived via canonical chain — S4 repairs the data so the existing teacher-side query produces all three rows).

Reply **"verified phase 2"** → tracker flips ✅. PP-CHAT-INTEGRITY closes; next is S10 PP-DASHBOARD-CARDS.
