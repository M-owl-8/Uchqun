# Uchqun Refinement Loop — Master Tracker

**Loop order (strict):** 1. Backend → 2. Government → 3. Admin → 4. Reception → 5. Teacher → 6. Parent → 7. Database

**Each portal runs through 8 steps:** Understand → Audit → Plan-Cleanup → Confirm-Clean → Research-Gaps → Build-Cleanup → Plan-Features → Implement-Features → Final-Verify

**Status legend:** ⬜ Not started · 🟡 In progress · ✅ Closed (with evidence) · ⛔ Blocked

| Portal | S0 Understand | S1 Audit | S2 Cleanup Build | S3 Confirm Clean | S4 Research | S5 Implement Build | S6 Plan Features | S7 Implement Features | S8 Final Verify |
|---|---|---|---|---|---|---|---|---|---|
| 1. Backend | ✅ | ✅ | ✅ | ✅ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| 2. Government | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| 3. Admin | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| 4. Reception | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| 5. Teacher | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| 6. Parent | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| 7. Database | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |

## Rules (read before every step)

1. Before starting ANY step, read this entire tracker. If the previous portal has any step that is not ✅, stop and report which one is incomplete. Never jump ahead.
2. A step is ✅ only when the deliverable file for that step exists, is complete, and has been honestly self-verified — not when "mostly done."
3. Honesty over speed. If something is broken, say so. If you guessed, say "I guessed here." No fabrication.
4. Read actual code. Do not infer from filenames or rely on previous audit markdown files. Every claim must cite file:line from the current state.
5. Update the tracker at the END of each step with: status, commit SHA, and the deliverable file path.
6. If you encounter ambiguity that needs a product decision, mark the step 🟡, document the question in `LOOP_QUESTIONS.md`, and stop.

## Step deliverables (file per portal)

- S0 → `audits/{portal}/00-understanding.md`
- S1 → `audits/{portal}/01-audit.md`
- S2 → `audits/{portal}/02-cleanup-plan.md`
- S3 → `audits/{portal}/03-cleanup-verification.md`
- S4 → `audits/{portal}/04-gap-research.md`
- S5 → `audits/{portal}/05-cleanup-execution.md`
- S6 → `audits/{portal}/06-feature-plan.md`
- S7 → `audits/{portal}/07-feature-execution.md`
- S8 → `audits/{portal}/08-final-verification.md`

Where `{portal}` ∈ { backend, government, admin, reception, teacher, parent, database }.

## Log
(Entries appended chronologically as steps close.)

| # | Portal | Step | SHA | Timestamp | Summary |
|---|---|---|---|---|---|
| 1 | Backend | S0 Understand | c29a325 | 2026-05-19 | 637-line first-principles read of all backend/ files; 14 open questions identified; `audits/backend/00-understanding.md` |
| 2 | Backend | S1 Deep Audit | fdab974 | 2026-05-19 | 34 findings: 0 Critical, 6 High, 12 Medium, 10 Low, 6 Info; all 14 OQs resolved; `audits/backend/01-audit.md` |
| 3 | Backend | S2 Cleanup Plan | 3a6633d | 2026-05-19 | 10 batches across 38 findings (34 S1 + 4 Batch 0 from activityController.js); `audits/backend/02-cleanup-plan.md` |
| 4 | Backend | S3 Execute Cleanup | 5c9ccdb | 2026-05-19 | 32 findings fixed, 3 deferred; 9 code batches (4b87f17→4b870e2); coverage 38.68%→45.02% (2380/5286); 70 suites 630 tests passing; `audits/backend/05-cleanup-execution.md` |
