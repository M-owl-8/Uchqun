# DEFERRED — open work parked for later

Anything listed here is **not lost** — it's intentionally paused because something outside this codebase is blocking it (an unattached MCP, a missing credential, a partner deliverable, a product decision). When that block clears, the **Resume checklist** for each item is the entry point — read it, run it, and the item moves back to active in `LOOP_TRACKER.md`.

> **Convention:** every entry must have an explicit **Blocker**, **Resume checklist**, and a clear **owner**. If you're about to mark something deferred and can't fill in those three, the item isn't ready to defer — diagnose further first.

---

## TP-PARENT-ASSIGNMENT ⏸ DEFERRED — **G1 of beta-launch plan** (2026-06-06)

> **🚀 BETA PRIORITY:** This is **Gate 1** of `audits/BETA-LAUNCH-PLAN.md`. It is the first action of the 2–3 week beta countdown. It unblocks the four PP-* phase-2 walks (PP-ATTENDANCE-SURFACE, PP-DASHBOARD-CARDS, PP-CHAT-INTEGRITY, PP-JOURNAL-FEATURE). Day 1 of the plan.

**Status:** STEP 1 complete and on `main` (`df8df86`); STEP 2 and STEP 3 deferred.
**Audit file:** `audits/redesign/TP-PARENT-ASSIGNMENT.md`
**Owner to resume:** Murodbek (run STEP 2 queries through Claude Code terminal where `postgres-uchqun` MCP is attached).

### Why deferred

STEP 2 requires running four read-only `SELECT` queries against the Railway production DB to classify the root cause as (a) data, (b) data + flow, or (c) query. The brief is explicit that fixes must be evidence-based, not asserted. In Claude Code on the web (this remote sandbox):
- the `postgres-uchqun` MCP server is not connected (no `.mcp.json` in repo, no `DATABASE_URL` secret); and
- the sandbox's outbound network policy blocks the Railway public proxy port (TCP 44423 timed out — diagnosed 2026-06-06).

The same queries run instantly from your **local Claude Code terminal** because that environment has `postgres-uchqun` configured in `~/.claude.json` per CLAUDE.md's MCP Servers section.

### Resume checklist (do this in Claude Code terminal, not web)

1. Open a Claude Code terminal session in this repo. Confirm `postgres-uchqun` is connected (CLAUDE.md's "MCP Servers Available" section says it is, restricted to READ-ONLY).
2. Open `audits/redesign/TP-PARENT-ASSIGNMENT.md` and run the SQL in sections **2.1 → 2.4** against production via the MCP. Paste the five labeled rowsets into the audit file at the end (a new "STEP 2 — live results" section is fine).
3. Use the classification matrix at the bottom of section 2.5 to pick (a), (b), or (c).
4. Apply the matching STEP 3 branch already drafted in the audit:
   - **(c) QUERY** → introduce `backend/services/teacherParentScope.js` (single source of truth) + refactor `teacherController.getParents` and `chatController.{getAccessibleConversationIds, canAccessConversation}` to use it + add Jest regression test (3 children, 2 distinct parents incl. a multi-child parent, plus negative case).
   - **(b)/(a) DATA + flow** → ship the idempotent backfill migration drafted in section 3.2 **and** change `backend/controllers/receptionParentController.js:143` from `groupId: null` to `groupId: parent.groupId || null` so children inherit their parent's group at creation. Verify deployment with the post-migration `SELECT COUNT(*)` query (Ketdik lesson — confirm by query, not by deploy log).
   - **Unification** lands regardless: `teacherParentScope.js` is the single source of truth for both /teacher/parents and chat.
5. Commit on `main` (per `.claude/settings.json` rule), push, watch the Railway deploy, run the four user-verification checks at the bottom of the audit, flip `LOOP_TRACKER.md` `TP-PARENT-ASSIGNMENT 🟡 → ✅`, and remove this entry from `DEFERRED.md`.

### Cross-portal unblock note

When TP-PARENT-ASSIGNMENT closes it unblocks **two** downstream items already documented:
- Full multi-parent verification of PP-AUDIT Part B contracts (chat/journal/etc. against more than the single Hulkar→Bobur link the audit could verify).
- **PP-ATTENDANCE-SURFACE** (highest-priority item in PP-AUDIT Part D) — it depends on the exact same `Teacher → Group → Child → parent` linkage being intact.

### Security action — do this BEFORE you resume

The Railway DB **superuser** connection string was pasted in this session's transcript on 2026-06-06 to attempt remote access. The attempt failed (network policy), but the credential is in the transcript regardless. **Rotate that password now** (Railway dashboard → Postgres plugin → Connect → Reset credentials). For the resume session, attach the new credential as a `DATABASE_URL` secret in the Claude Code environment settings — never paste it into chat again.

---

*Empty section below is the template for the next deferred item. Delete this comment when you use it.*

<!--
## XX-EXAMPLE ⏸ DEFERRED (YYYY-MM-DD)

**Status:** what's done so far + commit SHA
**Audit file:** path
**Owner to resume:** who + how

### Why deferred
External blocker description.

### Resume checklist
1. …
2. …

### Security action / cleanup needed
If any.
-->
