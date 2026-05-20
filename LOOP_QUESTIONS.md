# Loop Questions — Decisions Needed

Questions raised during the Refinement Loop that require a product or engineering decision.
Each entry is dated, scoped to the portal/step that raised it, and tagged with a priority.

---

## Open Questions

*(All LQ-001 through LQ-009 closed at Backend S8. See Closed Questions below.)*

---

## Closed Questions (moved from Open at Backend S8)

### LQ-001: Parent account deactivation (Batch 5 / BACKEND-033)

**Portal:** Backend  
**Step raised:** S3  
**Priority:** Medium  
**Tag:** Safeguarding gap — S5 Government/Parent portal input needed  

**Background:**  
`middleware/auth.js:95` intentionally bypasses the `isActive` check for parent role:
```js
if (!isParent && !isGovernment && !user.isActive) { return 401 }
```
This was classified as Info (BACKEND-033) during S1 because no endpoint was found that sets `isActive = false` for a parent account.

**Investigation result (S3):**  
Grep of all controllers confirms: NO endpoint deactivates a parent account via `isActive = false`. Only reception accounts are deactivated (`adminReceptionController.js:256, 338`). Parent accounts can only be soft-deleted (paranoid delete, `deletedAt`). Soft-deleted users cannot log in because `User.findByPk(userId)` returns `null` for paranoid-deleted records.

**Current state:**  
Bypass is harmless NOW. A deactivated parent cannot exist because there is no deactivation mechanism. The bypass is a design default, not a security gap.

**Product question for S5 (Parent/Admin portals):**  
Is there a requirement for admins to be able to suspend/deactivate a parent account WITHOUT deleting it? If yes, an `isActive = false` endpoint must be added — AND the auth middleware bypass must be removed simultaneously. If no, document as intentional: "Parent accounts are not deactivatable; only deletable."

**Status: CLOSED at Backend S8**  
T2-2 (Sprint D) implemented parent suspension via `users.status` field (not `isActive`). The `isActive` bypass remains correct — `isActive` is never set to `false` for parents; suspension is via `status='suspended'`. CLAUDE.md updated to document this. `LOOP_PRE_LAUNCH_CHECKLIST.md` PL-004 confirms resolved.

---

### LQ-002: Parent account suspension — product decision (BACKEND-GAP-S01)

**Portal:** Backend  
**Step raised:** S5  
**Priority:** High  
**Tag:** Safeguarding gap — requires product/legal decision  

**Question:** Should parent accounts be suspendable without deletion? If yes, does the `isActive` bypass in `middleware/auth.js:95` need to be removed simultaneously?

**Context:** Currently parents can only be paranoid-deleted (soft-delete). No `isActive = false` endpoint exists for parents. In safeguarding scenarios (custody dispute, abuse investigation, court order) an admin may need to suspend portal access without destroying the account or child history.

**Status: CLOSED at Backend S8**  
T2-2 (Sprint D) implemented: `PUT /admin/parents/:id/suspend` and `PUT /admin/parents/:id/activate`. Suspension via `status='suspended'`, not `isActive`. No auth middleware bypass change needed (status gate covers it). Decision: "Parent accounts are suspendable (status field) and deletable (paranoid delete) — isActive is not used for parent suspension."

---

### LQ-003: Teacher reflections visibility (BACKEND-GAP-005)

**Status: CLOSED at Backend S8**  
T1-3 (Sprint B) implemented: reflections are **private to the individual teacher** — `requireRole('teacher')` at route level + controller-level check + `where: { teacherId }` query filter. Not visible to admin or government in Tier 1. Admin/government visibility deferred to T3 if product requires it.

---

### LQ-004: Teacher journal format — structured or free-text? (BACKEND-GAP-005)

**Status: CLOSED at Backend S8**  
T1-3 (Sprint B) implemented: **free-text `ChildJournalEntry` model** (`content` TEXT, `date` DATE). Parents see a history (all entries with `isVisibleToParent=true`). `teacherId` is excluded from parent-facing responses. Not mapped to ChatMessage — it's a standalone model.

---

### LQ-005: Child goals / IEP data model (BACKEND-GAP-004)

**Status: CLOSED at Backend S8**  
T2-3 (Sprint E) implemented: **separate `ChildGoal` model** (not ServicePlan). Short-term instructional objectives: category ENUM(8), title, description, measurement, baseline, targetDate, currentProgress ENUM(5), childSnapshot. Reviews tracked in `ChildGoalReview`. ServicePlan remains for annual therapy service plans.

---

### LQ-006: Attendance data model and visibility (BACKEND-GAP-003)

**Status: CLOSED at Backend S8**  
T1-1 (Sprint A) implemented: **richer record** (status ENUM: present/absent/late/excused, note TEXT, childSnapshot JSONB). Visible to parents via data export (T2-10). Government stats aggregation deferred to government portal loop.

---

### LQ-007: Audit log approach for deletion accountability (BACKEND-GAP-S03)

**Status: CLOSED at Backend S8**  
T2-1 (Sprint A) + T2-5 (Sprint D): **Option (b) — dedicated append-only `audit_log` table** with three-layer immutability (model overrides + REVOKE). afterDestroy hooks on all 21+ paranoid models. No `deletedBy` columns added to individual tables.

---

### LQ-008: Personal data export / deletion rights under Uzbek law (BACKEND-GAP-S01, S03)

**Status: CLOSED at Backend S8**  
T2-10 (Sprint E) implemented: `GET /parent/me/export` — machine-readable JSON export. Hard-delete (vs soft-delete) deferred to legal confirmation; paranoid restore is available but not exposed publicly. Product owner to confirm if hard-delete is legally required for ZRU-547 compliance.

---

### LQ-009: School archival workflow (BACKEND-GAP-S05)

**Status: CLOSED at Backend S8**  
T2-7 (Sprint D) implemented: `PUT /government/schools/:id/archive` (government only). Children remain in the archived school — records are not frozen, but `requireSchoolScope` blocks admin/teacher/reception from accessing them (403 SCHOOL_ARCHIVED). Bulk child transfer on archival is T3 (or Government portal scope if required).

---

## Closed Questions

### LQ-010: CSV import raw content storage — Railway ephemeral filesystem (Sprint C engineering decision)

**Portal:** Backend  
**Step raised:** S7 Sprint C pre-flight  
**Priority:** Architecture (closed)  
**Tag:** Infrastructure constraint  
**Status:** CLOSED — decision implemented  

**Context:** Sprint C spec said: "If during implementation it turns out temp files don't survive the multer/storage pipeline beyond the request lifecycle, escalate and decide whether T1-7b needs to re-upload or whether ImportJob needs to persist the raw CSV content."

**Finding:** Railway's filesystem is ephemeral — multer `diskStorage` temp files do not survive between requests. The validate endpoint (T1-7a) and the start endpoint (T1-7b) are separate HTTP requests, so a file saved to disk during validate would be gone by the time start runs.

**Decision:** Add `rawCsv TEXT NOT NULL` column to `import_jobs`. The validate endpoint stores `req.file.buffer.toString('utf8')` in `rawCsv`. The start endpoint re-parses `importJob.rawCsv` without requiring re-upload. Multer remains `memoryStorage()` throughout.

**Trade-off:** A 1 MB CSV file stored as TEXT in Postgres adds ~1 MB per import job row. At 100-row imports, rawCsv is typically < 15 KB — negligible. If imports scale beyond 5,000 rows, migrate to Appwrite or Railway Volume. No change to the import API shape; clients are unaffected.
