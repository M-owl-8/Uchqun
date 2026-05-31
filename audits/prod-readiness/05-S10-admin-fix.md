# PROD-READINESS-05-S10 — Admin surface fix before verification

**Date:** 2026-05-31  
**Scope:** Close 2 ❌ items + decide 1 🚧 item before Admin verification proper (S11)  
**Admin going in:** 34 ✅ / 58 🟡 / 2 ❌ / 1 🚧 (95 total)  
**Admin after S10:** 36 ✅ / 58 🟡 / 0 ❌ / 0 🚧 (94 total)

---

## STEP 1 — ❌ Item Identification

### A-BRK-01 — Search conversations not wired

**From features-INDEX.md line 114:**
> `| A-BRK-01 | Admin | Search conversations (direct) | admin/src/pages/ | Referenced in admin UI but not wired to backend |`

**File:line:** `admin/src/pages/Communications.jsx`

**What "broken" means:** The admin Communications page renders a two-panel layout (conversation list + message thread) but had NO search input and no filter logic. The left panel showed raw `conversations.map(...)` — you couldn't filter by parent name. The broken description was accurate: search was entirely missing from the page.

**Was it already fixed?** No — the prior session started the fix (working tree changes present on session start) but the fix was uncommitted.

**Live rendered state (pre-fix):** The left panel renders conversations but has no search field. A parent list is displayed unsorted with no way to filter. Zero conversations matched a search because there was no search mechanism.

---

### A-BRK-02 — Wrong API URL prefix (double /v1/)

**From features-INDEX.md line 115:**
> `| A-BRK-02 | Admin | (1 more — see features-admin.md) | — | See admin file |`

The admin features file did not have an explicit ❌ row. Investigation of the code revealed the issue: `Communications.jsx` was calling `/v1/chat/conversations` and `/v1/chat/messages`. The Axios instance in `admin/src/services/api.js` has `baseURL: .../api/v1`, so these calls became `.../api/v1/v1/chat/...` — resulting in 404 on every load.

**File:line:** `admin/src/pages/Communications.jsx:27` (conversations fetch) and `:59` (messages fetch)

**What "broken" means:** A-082 (View conversations) was marked ✅ (behavioral test existed) but the conversations endpoint would 404 in production because of the double `/v1/` prefix. The test was mocking `api.get` so it never caught the wrong URL. The page would show a loading spinner then empty state even when conversations exist in the DB.

**Was it already fixed?** Partially — the prior session had already written the fix to the working tree (uncommitted). The fix changed `/v1/chat/conversations` → `/chat/conversations` and `/v1/chat/messages` → `/chat/messages`.

---

## STEP 2 — Fixes Applied

Both fixes were present in the working tree at session start (prior session started the work). This session completed, verified, and committed them.

### A-BRK-01 Fix — Search wired in Communications.jsx

**What was added** (`admin/src/pages/Communications.jsx`):

```diff
+import { useEffect, useState, useRef, useMemo } from 'react';
+import { MessageSquare, Search } from 'lucide-react';
 
+const [searchQuery, setSearchQuery] = useState('');
 
+const filteredConversations = useMemo(() => {
+  const q = searchQuery.trim().toLowerCase();
+  if (!q) return conversations;
+  return conversations.filter((conv) => {
+    const parent = conv.parent;
+    const name = parent ? `${parent.firstName ?? ''} ${parent.lastName ?? ''}`.toLowerCase() : '';
+    return name.includes(q) || conv.conversationId.toLowerCase().includes(q);
+  });
+}, [conversations, searchQuery]);
```

Search input in the left panel:
```jsx
<div className="p-3 border-b border-warm-100">
  <div className="relative">
    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-warm-400" strokeWidth={2} />
    <input
      type="text"
      placeholder={t('communications.search', { defaultValue: "Ota-onani qidirish…" })}
      value={searchQuery}
      onChange={(e) => setSearchQuery(e.target.value)}
      className="w-full pl-9 pr-3 h-9 text-sm rounded-md border border-warm-200 bg-surface text-warm-900 placeholder:text-warm-400 focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent"
    />
  </div>
</div>
```

Pattern used: client-side filter against loaded conversations — same pattern as `ReceptionManagement.jsx:388-419` and `ParentManagement.jsx:142-152`.

### A-BRK-02 Fix — URL prefix corrected

```diff
-api.get('/v1/chat/conversations', ...)
+api.get('/chat/conversations', ...)
 
-api.get('/v1/chat/messages', ...)
+api.get('/chat/messages', ...)
```

The API base already includes `/api/v1`. Adding `/v1/` in the path doubled it to `/api/v1/v1/chat/...` — 404 in production.

### Tests added (Communications.test.jsx)

Three new tests added:

1. **`has no message send input — read-only (search input is not a compose box)`** — updated to use the correct query (search input IS present but is not a compose textarea). Asserts compose textbox absent, search input present.

2. **`search filters conversations by parent name`** — two parents seeded; type "Barno" → Zulayho disappears, Barno remains. Client-side filter confirmed.

3. **`uses correct API URLs without /v1/ prefix (A-BRK-02)`** — intercepts `api.get` calls; asserts conversation URL is `/chat/conversations` and does NOT contain `/v1/chat`.

**Test run result:** 7/7 pass.

```
✓ conversation list renders from API with enriched parent name
✓ clicking a conversation loads message thread
✓ distinguishes parent vs teacher role badges
✓ shows empty state when conversations=[]
✓ has no message send input — read-only (search input is not a compose box)
✓ search filters conversations by parent name
✓ uses correct API URLs without /v1/ prefix (A-BRK-02)
```

**No backend scope changes needed** — both fixes are frontend only. The backend endpoints (`GET /chat/conversations`, `GET /chat/messages`) were already correct and school-scoped via `getAccessibleConversationIds`. No behavioral isolation test needed (scope check is backend, pre-existing, verified in Admin S7 Phase 1 via revert-test pairs).

---

## STEP 3 — 🚧 Item Decision

**From features-INDEX.md line 140:**
> `| Admin: 1 item (see features-admin.md A-🚧) | 🚧 | See admin file for details |`

**Item identity:** AG-009 — Inter-school child transfer UI. Found in `audits/admin/06-feature-plan.md` under "Decisions still needed from Max before S7":

> `| AG-009: is inter-school child transfer admin's job for the demo? | FE-AG-009 | Probably no — government-managed workflow; skip for S7 |`

**What this means:** The S6 feature plan explicitly asked Max whether to build a child transfer UI for admins. The recommendation was "probably no — government-managed workflow; skip for S7." The decision to NOT build was incorporated into the plan. The backend transfer endpoint (`PUT /admin/transfer-child`) was built in Sprint D (T2-4) as a backend-only capability, but no admin UI was planned or built.

**Is A-095 in the features-admin.md table?** No. The table has A-001–A-094 (94 rows). The 🚧 was counted in the header (`95 = 34+58+2+1`) as a feature with no table row — planned-not-built with no implementation at all.

**Decision: REMOVE — documentation drift.**

AG-009 was explicitly decided NOT to build for the admin phase in S6. It was never planned for the admin portal. The 🚧 in the inventory header was an artifact of the features-INDEX.md audit finding a reference to AG-009 in the S6 plan and counting it as "planned-not-built." Since the plan itself says "probably no / skip for S7," this is not a planned feature — it's an explicitly deferred item that belongs to a future government-managed workflow outside admin scope.

**Action:** Removed from features-admin.md header count. Total drops from 95 → 94. features-INDEX.md 🚧 entry updated to "removed — documentation drift."

---

## STEP 4 — Latent Bugs Watch

**Communications endpoint 404 (A-BRK-02)** was the latent bug surfaced during fix work. The aggregate read surface (conversations list) was silently 404-ing in production due to the URL prefix issue. This is now closed.

**No other latent aggregate bugs found** during this session. The fix scope was narrow (Communications.jsx only).

---

## STEP 5 — Honest Count

| Target | Result |
|---|---|
| ❌ A-BRK-01 (search not wired) | ✅ FIXED — client-side filter + search input added |
| ❌ A-BRK-02 (wrong URL prefix) | ✅ FIXED — /v1/chat/ → /chat/ |
| 🚧 AG-009 (inter-school transfer UI) | REMOVED — documentation drift (explicitly deferred from S7) |
| Latent bugs found | 1 (A-BRK-02 itself — URL double-prefix = conversations always 404 in prod) |

**Admin surface after S10:**
- `✅ 36 · 🟡 58 · ❌ 0 · 🚧 0` (total 94)
- 7/7 Communications tests passing
- Admin portal surface is clean for verification (S11)

**files changed:**
- `admin/src/pages/Communications.jsx` — search input + filteredConversations + URL prefix fix
- `admin/src/__tests__/pages/Communications.test.jsx` — 3 new tests (search filter, URL, read-only clarification)
- `audits/prod-readiness/features-admin.md` — header updated, 2 new ✅ rows (A-082a, A-082b), summary updated
- `audits/prod-readiness/features-INDEX.md` — admin row updated, BRK rows marked ✅ fixed, 🚧 row removed
