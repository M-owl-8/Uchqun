# Loop Questions — Decisions Needed

Questions raised during the Refinement Loop that require a product or engineering decision.
Each entry is dated, scoped to the portal/step that raised it, and tagged with a priority.

---

## Open Questions

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

**Action:**  
Carry to S5 Gap Research for the Parent portal. Track as potential feature: "Parent account suspension without deletion."

---

### LQ-002: Parent account suspension — product decision (BACKEND-GAP-S01)

**Portal:** Backend  
**Step raised:** S5  
**Priority:** High  
**Tag:** Safeguarding gap — requires product/legal decision  

**Question:** Should parent accounts be suspendable without deletion? If yes, does the `isActive` bypass in `middleware/auth.js:95` need to be removed simultaneously?

**Context:** Currently parents can only be paranoid-deleted (soft-delete). No `isActive = false` endpoint exists for parents. In safeguarding scenarios (custody dispute, abuse investigation, court order) an admin may need to suspend portal access without destroying the account or child history.

**Action required:** Product owner to decide. If yes → Backend adds `PUT /admin/parents/:id/deactivate` AND removes the auth middleware bypass. If no → document as intentional: "Parent accounts are only deletable, not suspendable."

---

### LQ-003: Teacher reflections visibility (BACKEND-GAP-005)

**Portal:** Backend / Teacher  
**Step raised:** S5  
**Priority:** Medium  
**Tag:** Data model decision  

**Question:** Are teacher reflections (`POST /teacher/reflections`) private to the teacher, or visible to admin/government? At what level of detail?

**Context:** The Teacher portal's DailyReflection page has two distinct sections: a private personal reflection and a parent-visible journal entry. The backend needs to know the access control model before the endpoint can be designed.

---

### LQ-004: Teacher journal format — structured or free-text? (BACKEND-GAP-005)

**Portal:** Backend / Teacher / Parent  
**Step raised:** S5  
**Priority:** Medium  
**Tag:** Data model decision  

**Question:** Is the teacher-to-parent journal entry (`POST /teacher/journal`) a free-text message or a structured daily summary? Should parents see a history or only the latest entry?

**Context:** Determines whether this maps to an existing model (ChatMessage), a new model (DailyJournalEntry), or a simple field on Activity. Retention rules also depend on this.

---

### LQ-005: Child goals / IEP data model (BACKEND-GAP-004)

**Portal:** Backend / Teacher / Parent  
**Step raised:** S5  
**Priority:** High  
**Tag:** Data model decision  

**Question:** What is the data model for child goals (`GET /teacher/children/:id/goals`)? Who can set goals? Is this the same as `ServicePlan` (already modelled) or a separate concept?

**Context:** `ServicePlan` models annual therapy service plans with 8 service types and monthly booleans. If "goals" means short-term instructional objectives (IEP-style), it likely needs a separate model with target, metric, and progress fields.

---

### LQ-006: Attendance data model and visibility (BACKEND-GAP-003)

**Portal:** Backend / Teacher / Parent / Government  
**Step raised:** S5  
**Priority:** High  
**Tag:** Data model decision  

**Question:** Is attendance a daily present/absent binary, or a richer record (late, excused, reason code)? Is it visible to parents? Is it reported to government statistics?

**Context:** The Teacher portal has an Attendance screen that calls `POST /attendance` — the model and migration don't exist yet. The answer determines the schema, access control, and whether `governmentController.js:getOverview` needs to aggregate attendance.

---

### LQ-007: Audit log approach for deletion accountability (BACKEND-GAP-S03)

**Portal:** Backend  
**Step raised:** S5  
**Priority:** High  
**Tag:** Safeguarding / Architecture  

**Question:** Should deletion accountability be implemented as: (a) a `deletedBy` column added to each paranoid table (simpler, migration-based), or (b) a dedicated append-only `audit_logs` table recording all destructive actions (more complete, more complex)?

**Context:** Paranoid deletes currently record `deletedAt` but not the actor. Option (a) is S effort per table but pollutes schemas. Option (b) is M-L effort but provides a single queryable audit trail.

---

### LQ-008: Personal data export / deletion rights under Uzbek law (BACKEND-GAP-S01, S03)

**Portal:** Backend  
**Step raised:** S5  
**Priority:** Medium  
**Tag:** Legal / Compliance  

**Question:** Does ZRU-547 ("On Personal Data") or any other applicable Uzbekistan regulation require: (a) a machine-readable export of a parent's personal data on request, and (b) a verifiable hard-delete option beyond Sequelize paranoid soft-delete?

**Context:** Paranoid soft-delete retains records in the DB with `deletedAt` set. If the law requires genuine deletion, `restore()` must be disabled and records must be periodically purged. If an export right exists, a `GET /parent/me/export` endpoint is needed.

---

### LQ-009: School archival workflow (BACKEND-GAP-S05)

**Portal:** Backend / Admin / Government  
**Step raised:** S5  
**Priority:** Medium  
**Tag:** Product / Safeguarding  

**Question:** When a school closes, what happens to its children? Are they transferred to another school in bulk? Are their records frozen? Who authorizes archival?

**Context:** `School.isActive` exists but no archival workflow does. Without a defined process, a school's closure can result in children becoming invisible (if `isActive` gates queries) or continuing to accumulate records (if `isActive` is ignored).

---

## Closed Questions

_(None yet)_
