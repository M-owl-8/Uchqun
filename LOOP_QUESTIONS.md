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

## Closed Questions

_(None yet)_
