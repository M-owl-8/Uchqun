# TP-CHAT-MESSENGER — Teacher portal full-page messenger

**Status:** ✅ CLOSED (pending user verification) — commit b6827e1  
**Scope:** teacher portal — Chat.jsx, locales ×3, backend test

---

## Part 0 — Diagnosis (evidence before any code)

### Endpoint list (what Chat.jsx was calling)

| Endpoint | Direction | Status |
|----------|-----------|--------|
| `GET /teacher/parents` | → backend | ✅ correct, teacher-scoped |
| `GET /chat/messages?conversationId=parent:${id}&limit=200` | → `/api/v1/chat` | ✅ `canAccessConversation` handles teacher role |
| `POST /chat/messages { conversationId, content }` | → `/api/v1/chat` | ✅ teacher-accessible |
| `POST /chat/read { conversationId }` | → `/api/v1/chat` | ✅ teacher-accessible |
| `PUT /chat/messages/:id` | → `/api/v1/chat` | ✅ teacher-accessible |
| `DELETE /chat/messages/:id` | → `/api/v1/chat` | ✅ teacher-accessible |

**No parent-scoped endpoints were ever called.** The 403s in evidence came from the `canAccessConversation` check when the cached parent list was stale or the teacher had no groups with that parent — not from wrong endpoints.

### Auth interceptor

`shared/services/api.js` is correct and matches the platform standard:
- 401 → attempt token refresh via `POST /auth/refresh`
- Refresh success → retry original request
- Refresh failure → `clearAuth()` → `window.location.replace('/login')`
- Mutex prevents concurrent refresh races

The 401s reported in evidence (`/auth/me`, `/notifications/count`, etc.) came from dashboard/header widgets, not from Chat.jsx.

### Root cause of broken conversation list

`chatStore.js:69` — `export async function listConversations() { return []; }` — the conversations list was a hardcoded stub. The backend endpoint `GET /chat/conversations` was fully implemented and teacher-scoped but never called. The new Chat.jsx calls it directly.

---

## Architecture — one conversation model, two views

The backend has a single `ChatMessage` table and single `/api/v1/chat` route set. Both parent portal and teacher portal are two views of the same data. Conversation ID format: `parent:${userId}`. No data model was forked.

---

## UI — two-panel full-page messenger

### Layout

The Chat component uses negative margins to bust out of Layout.jsx's padding (`px-4 sm:px-6 py-6 pb-24 md:pb-8`) and fills the full content area:
```jsx
<div className="-mx-4 sm:-mx-6 -mt-6 -mb-24 md:-mb-8 flex overflow-hidden"
     style={{ height: 'calc(100vh - 56px)' }}>
```

### Left panel (300px desktop, full-screen mobile pre-selection)
- Header with title + subtitle
- Search input filtering by parent name
- Conversation rows from `GET /chat/conversations`:
  - Avatar (purple initials, sidebar palette #7A6FA8)
  - Parent name (cross-referenced from `GET /teacher/parents`)
  - Last message preview (1 line truncated) + timestamp
  - Unread badge (red pill, clears on open)
  - Active row: `rgba(122,111,168,.12)` highlight
  - Skeleton loading (5 rows)
  - Empty state when no conversations

### Right panel (flex-1)
- Thread header: avatar + parent name + child name(s)
- Scrollable message area:
  - Teacher messages: right-aligned, `bg-brand-600 text-white`
  - Parent messages: left-aligned, `bg-surface border border-slate-100`
  - Date separators between days (hr line + date)
  - Skeleton loading during fetch
  - "Hozircha xabarlar yo'q" empty state
- Composer pinned to bottom:
  - Auto-resize textarea (up to 120px)
  - Enter sends, Shift+Enter = newline
  - Send button: `bg-brand-600`, disabled when empty or sending

### Mobile
- Left panel hidden (`hidden md:flex`) when conversation selected
- Right panel shows ChevronLeft back button to return to list

### Real-time (Socket.io)
- Incoming `chat:message` event:
  - If active conversation: append to thread + mark read immediately
  - If different conversation: increment unread badge on that row
  - Always update lastMessage + updatedAt on the conversation row

---

## Files changed

| File | Change |
|------|--------|
| `teacher/src/pages/Chat.jsx` | Full rewrite — two-panel messenger |
| `teacher/src/locales/uz/common.json` | title/subtitle updated, 5 new keys |
| `teacher/src/locales/en/common.json` | same |
| `teacher/src/locales/ru/common.json` | same |
| `backend/__tests__/chatAdminScope.test.js` | +2 teacher listConversations scope tests |
| `LOOP_TRACKER.md` | TP-CHAT-MESSENGER = 🟡 → ✅ |

### Locale keys added (×3 languages)
- `chat.searchParents` — search placeholder
- `chat.noConversations` — empty state for left panel
- `chat.noMessages` — conversation row preview when no messages yet
- `chat.selectConversation` — empty right panel prompt
- `chat.back` — mobile back button

### Locale keys updated
- `chat.title`: "Ota-onalar bilan muloqot" (teacher perspective, not parent-portal copy)
- `chat.subtitle`: "Guruhingiz ota-onalari bilan yozishmalar"

---

## Gates

| Gate | Result |
|------|--------|
| `chatAdminScope.test.js` (10 tests incl. 2 new teacher scope) | ✅ 10/10 |
| `verify-i18n.js` (backend catalog) | ✅ 226 codes, all 3 lang files match |
| `check:locales --portal=teacher` | ✅ 660/660 keys in uz/en/ru |
| Lint errors in Chat.jsx | ✅ 0 (pre-existing DayStack.jsx errors unchanged) |
| git push origin main | ✅ b6827e1 |

---

## User verification steps

1. Hard refresh `/teacher/chat` — console: **no 401 or 403 errors**
2. Layout: full-page (no card, no page scroll); parents listed left with previews; thread right; composer at the very bottom
3. Send a message → appears in thread instantly; open parent portal as Hulkar → message visible there (shared model proof)
4. Reply as parent → teacher side shows the reply + unread badge on that conversation row; opening the conversation clears the badge
5. Let session expire or invalidate cookie → app redirects to `/login` cleanly (no zombie authenticated UI)
6. Switch language to RU or EN → all chat strings translated, teacher-perspective, no tarbiyachi-directed copy
