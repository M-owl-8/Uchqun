# Backend S2: Cleanup Plan

**Generated:** 2026-05-19  
**Status:** Complete (6 sections)  
**Total findings in scope:** 38 (34 from S1 + 4 from Batch 0 activityController.js read)  
**Batches:** 10 (Batch 0 through Batch 9)

---

## Section 1 — Batch 0 Findings (activityController.js full read)

`activityController.js` read end-to-end in three passes: lines 0–160, 160–320, 320–461.

| ID | Severity | Category | File:Line | Title | Description | Evidence | Recommended fix |
|---|---|---|---|---|---|---|---|
| BACKEND-035 | High | Security (OWASP A01 BAC) | `activityController.js:53` | `getActivities` and `getActivity` admin/reception paths have no school scoping | The admin/reception branch (lines 53–58, 175–176) applies no `schoolId` filter. Any admin or reception can list or view all activities across all schools. Same root cause as BACKEND-005 (meals) and BACKEND-003 (media). | `} else if (req.user.role === 'admin' \|\| req.user.role === 'reception') { // Admin and reception can see all activities` (line 53–54); `// Admin and reception can see all activities - no filter needed` (line 175–176) | Mirror the `mediaController.js` admin pattern: if `req.user.schoolId` is set, scope `where.childId` to children in that school. |
| BACKEND-036 | High | Security (OWASP A01 IDOR) | `activityController.js:427` | `deleteActivity` has no school/ownership check | Role guard at line 429 checks role only. After finding the activity by PK (line 434), the code calls `Child.findByPk` only to build the notification payload — not for authorization. Any teacher/admin/reception can delete any activity by UUID. Inconsistent with `updateActivity` (line 367) which correctly calls `validateChildAccess`. | `const child = await Child.findByPk(activity.childId);` (line 441) — used for notification only, no ownership check; contrast: `const child = await validateChildAccess(activity.childId, req)` in `updateActivity` (line 367) | Replace `Child.findByPk(activity.childId)` with `validateChildAccess(activity.childId, req)` and return 404 if null. |
| BACKEND-037 | Medium | Correctness | `activityController.js:178` | `getActivity` parent path fetches only first child — breaks multi-child families | `Child.findOne({ where: { parentId: req.user.id } })` returns the first child in DB insertion order. If the parent has multiple children, activities for child 2, 3, … are inaccessible via this endpoint. `getActivities` correctly uses `Op.in` across all children. | `const child = await Child.findOne({ where: { parentId: req.user.id } });` (line 178–180); contrast `getActivities` lines 61–64: `Child.findAll(...)` | Replace with `Child.findAll({ where: { parentId: req.user.id }, attributes: ['id'] })` and use `{ [Op.in]: childIds }` in the where clause (same pattern as `getActivities`). |
| BACKEND-038 | Low | Data Integrity | `activityController.js:247` | `teacher` field in `createActivity` accepted from request body — forgeable | `teacher: teacher \|\| \`${req.user.firstName} ${req.user.lastName}\`` allows any teacher/admin/reception to override the `teacher` field to an arbitrary string. Records in the DB will not reliably reflect the actual creator. | `teacher: teacher \|\| \`${req.user.firstName} ${req.user.lastName}\`` (line 247) — `teacher` comes from `req.body` (line 218) | Remove `teacher` from the destructured body parameters. Always set `teacher: \`${req.user.firstName} ${req.user.lastName}\`` server-side. |

---

## Section 2 — Execution Batches

### Summary table

| Batch | Findings | Effort | Depends on |
|---|---|---|---|
| 1 — Silently broken production | BACKEND-001, 006 | S | — |
| 2 — Scoping helper design | (architecture) | S | Batch 1 |
| 3 — Apply scoping to all IDOR sites | BACKEND-002, 003, 004, 005, 011, 025, 035, 036 | M | Batch 2 |
| 4 — Defensive over-wrapping | BACKEND-007 | S | — |
| 5 — Parent isActive investigation | BACKEND-033 | S | — |
| 6 — Medium hygiene | BACKEND-008, 009, 013, 014, 016, 018, 037 | M | Batch 3 |
| 7 — Response shape decision | BACKEND-012 | S | — |
| 8 — Low-severity cleanup | BACKEND-019, 020, 021, 022, 023, 024, 026, 027, 028, 038 | S | — |
| 9 — Dead code and documentation | BACKEND-015, 034 + doc updates | S | Batches 5, 7 |
| Deferred | BACKEND-010, 017 | — | external/investigation |

Total code batches: 7 (1, 3, 4, 6, 7-doc, 8, 9).  
Total investigation/planning batches: 3 (2, 5, 7-decision).

---

### Batch 1 — Silently broken production features

**Findings:** BACKEND-001, BACKEND-006  
**Rationale:** BACKEND-001 is a completely broken production feature (admin document approval always returns 403). BACKEND-006 is an active security gap on the same document path. Both touch `receptionController.js` and `admin/adminReceptionController.js`; fix together in one commit.

#### BACKEND-001: `approveDocument` always returns 403

**Action:** Fix  
**Approach:** Add `'createdBy'` to the User attributes list in the `Document.findByPk` include, OR (preferred — consistent with `rejectDocument`) remove the include entirely and do a separate `User.findByPk(document.userId)` call with no attribute restriction, then check `docOwner.createdBy !== req.user.id`.  
**Files:** `backend/controllers/admin/adminReceptionController.js:134–213`  
**Risk:** Low. The function currently always returns 403; any change that makes it sometimes return 200 is an improvement. Risk: if the DB has documents whose `userId` points to a user with a different `createdBy` (e.g., from a data migration), the new check could correctly start returning 403 for those — which would be correct behavior. Integration test required to catch regressions.  
**Order dependency:** None.  
**Effort:** S (<1h)  
**Verification (S3):**
- New test: `POST /api/v1/admin/documents/:id/approve` with a valid admin + their own reception's document → expect 200 and reception activated.
- Existing test: same request with a different admin's document → expect 403.
- Test file: `__tests__/adminReception.test.js` (add cases).

#### BACKEND-006: Document upload trusts client MIME type

**Action:** Fix  
**Approach:** Use `fileTypeFromBuffer` (from `file-type` package, already a dependency) on the in-memory buffer before calling `uploadFile` in `receptionController.js`. Reject if detected type is not in the document allowlist (`['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf']`). The `uploadDocument` multer config in `upload.js` uses `documentFileFilter` for a first-pass check; this adds a second, server-side pass.  
**Files:** `backend/controllers/receptionController.js:6–38`  
**Risk:** Low. Any valid document will pass both the MIME header filter and the magic-byte check. Risk: documents with mismatched extension/content (e.g., a PDF with `.jpg` extension) will now correctly be rejected.  
**Order dependency:** None (but combine into one commit with BACKEND-001 since both touch the document flow).  
**Effort:** S (<1h)  
**Verification (S3):**
- New test: upload a file with correct MIME header but wrong magic bytes → expect 400.
- New test: upload a valid PDF → expect 201.
- Test file: `__tests__/documentUpload.test.js` (add cases).

---

### Batch 2 — Root-cause IDOR scoping helper (design only)

**Findings:** Architecture decision, no S1 finding ID  
**Rationale:** Six High findings (BACKEND-002, 003, 004, 005, 025, 035, 036) share the root cause of per-controller role checks without tenant isolation. Rather than patching each controller individually, this batch designs a single verified pattern that Batch 3 applies uniformly.

**Action:** Design + document  
**Approach:** The existing `validateChildAccess(childId, req)` in `utils/schoolValidation.js` already correctly handles:
- Intake children (schoolId null) → parent-only + government
- Scoped users → must match child's schoolId
- Government → unrestricted

This function is the correct primitive. Batch 2 does NOT add new code — it:
1. Reads `validateChildAccess` current implementation (already done in S1).
2. Confirms it handles all edge cases needed by Batch 3 (intake, government, cross-school).
3. Documents the required pattern in this plan: **every write or delete endpoint that operates on a child-scoped resource (Activity, Meal, Media, TherapyUsage) MUST call `validateChildAccess(resourceId_or_childId, req)` after finding the resource by PK**.
4. For non-child-scoped resources (e.g., `updateReception`), the pattern is direct `where: { ..., createdBy: req.user.id }` or equivalent.

**Files:** No code changes. Add pattern note to `CLAUDE.md` "When Touching Sensitive Areas" section.  
**Risk:** Zero (no code change).  
**Order dependency:** Must complete before Batch 3.  
**Effort:** S (<1h)  
**Verification:** The CLAUDE.md update serves as the documentation artifact. Batch 3 success is the proof.

---

### Batch 3 — Apply scoping fix to all IDOR sites

**Findings:** BACKEND-002, BACKEND-003, BACKEND-004, BACKEND-005, BACKEND-011, BACKEND-025, BACKEND-035, BACKEND-036  
**Rationale:** All 8 findings share the same root cause identified in Batch 2. Apply the pattern to each affected controller. One commit per controller for traceability and easier rollback.

#### Sub-batch 3a: `admin/adminReceptionController.js` — BACKEND-002

**Action:** Fix  
**Approach:** In `updateReception` (line 419), add `createdBy: req.user.id` to `receptionWhere`. Remove the `if (req.user.schoolId)` check — `createdBy` is the correct ownership scope, not `schoolId`.  
**Files:** `backend/controllers/admin/adminReceptionController.js:419–420`  
**Risk:** Low. Narrows access (admin A can no longer update admin B's receptions even if same school). No legitimate use case for the current behavior.  
**Effort:** S  
**Verification:** Test: Admin A tries to update Admin B's reception → 404. Admin A updates own reception → 200.

#### Sub-batch 3b: `mediaController.js` — BACKEND-003, BACKEND-004, BACKEND-011

**Action:** Fix (all three in one commit — same file)  
**Approach:**  
- `deleteMedia` (line 912): After `Media.findByPk(id)`, call `validateChildAccess(media.childId, req)`. If null → 404.  
- `updateMedia` (line 627): Same — add `validateChildAccess` after finding the media record.  
- `proxyMediaFile` (line 690): Add `validateChildAccess(media.childId, req)` before streaming. If null → 403.  
- BACKEND-011: Remove `res.setHeader('Access-Control-Allow-Origin', '*')` (line 855) and `res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin')` (line 856).  
**Files:** `backend/controllers/mediaController.js:627, 690, 855, 912`  
**Risk:** Medium. Existing code that calls `deleteMedia`/`updateMedia` without school context will now get 404 instead of succeeding. Risk: any script or admin tool that bypasses school scope will break (correct behavior, but watch for test failures).  
**Effort:** M (1-2h, test updates needed)  
**Verification:** Tests for cross-school access → 404. Own-school access → 200/204. Proxy cross-school → 403.

#### Sub-batch 3c: `mealController.js` — BACKEND-005

**Action:** Fix  
**Approach:** In `getMeals` admin branch (line 53), mirror `mediaController.js` admin pattern: if `req.user.schoolId`, fetch children scoped to that school and add `where.childId = { [Op.in]: schoolChildIds }`. If no `schoolId` (e.g., government), no filter.  
**Files:** `backend/controllers/mealController.js:53–58`  
**Risk:** Low.  
**Effort:** S  
**Verification:** Admin from school A calls GET /meals without childId → sees only school A meals. Government (no schoolId) → sees all.

#### Sub-batch 3d: `therapyController.js` — BACKEND-025

**Action:** Fix  
**Approach:** In `getTherapyUsage` (line 490), add admin scope: if `req.user.role === 'admin' && req.user.schoolId`, scope by children in the admin's school (via parent chain) or via `where.childId IN (select children by school)`.  
**Files:** `backend/controllers/therapyController.js:490`  
**Risk:** Low.  
**Effort:** S  
**Verification:** Admin from school A calls GET /therapy/usage → sees only school A usage.

#### Sub-batch 3e: `activityController.js` — BACKEND-035, BACKEND-036

**Action:** Fix  
**Approach:**  
- BACKEND-035 `getActivities` admin/reception branch (line 53): add school scoping identical to `mealController.js` fix.  
- BACKEND-035 `getActivity` admin/reception branch (line 175): same.  
- BACKEND-036 `deleteActivity` (line 441): Replace `Child.findByPk(activity.childId)` with `validateChildAccess(activity.childId, req)` and check for null → 404. Use the returned child for the notification.  
**Files:** `backend/controllers/activityController.js:53, 175, 427`  
**Risk:** Low.  
**Effort:** S  
**Verification:** Admin from school A calls GET /activities → sees only school A activities. Cross-school delete → 404.

---

### Batch 4 — Defensive over-wrapping cleanup

**Findings:** BACKEND-007  
**Rationale:** `getSchoolRatings` returns HTTP 200 `{success:true, data:[]}` on any error, masking failures from monitoring. This is a standalone fix with no cross-cutting risk.

#### BACKEND-007: `getSchoolRatings` returns 200 on all errors

**Action:** Fix  
**Approach:** In the outer `catch` block of `getSchoolRatings` (line 607–619), change from `res.json({ success: true, data: [] })` to `res.status(500).json({ success: false, error: 'Failed to fetch school ratings' })`. The comment "// Always return success with empty array on error to prevent 500" explains why it was written this way — likely to prevent a flaky UI. The correct fix is to ensure the query is reliable (via Batch 2 pattern), then expose the error.  
**Files:** `backend/controllers/admin/adminStatsController.js:607–619`  
**Risk:** Low. Tests that check for 200 on error will now expect 500. Update `__tests__/adminStats.test.js` accordingly. Monitor for any UI that depends on this silent-success behavior (frontend should handle 500).  
**Order dependency:** None (safe to run in parallel with Batch 3).  
**Effort:** S  
**Verification:** Test: mock DB failure → expect 500. Normal case → expect 200 with data.

---

### Batch 5 — Parent isActive investigation

**Findings:** BACKEND-033  
**Rationale:** The audit classified parent `isActive` bypass as Info assuming it is intentional. The step instructions require this assumption to be investigated, not silently accepted.

**Action:** Investigate → file in `LOOP_QUESTIONS.md`  
**Approach:**  
1. Search the codebase for any endpoint that sets `isActive = false` for parent role.  
2. Document findings in `LOOP_QUESTIONS.md` as a product question.  
3. If an admin/reception can deactivate a parent but that deactivation is silently bypassed at login, re-grade BACKEND-033 to Medium and add a Batch 6 fix.  
4. If there is no deactivation mechanism for parents at all, the bypass is harmless but should be documented in `CLAUDE.md`.

**Investigation task (before writing code):**
- Run `grep -r 'isActive' backend/controllers/ --include="*.js" | grep -i parent` to find any parent deactivation path.
- Check `receptionParentController.js` and `adminParentController.js` for deactivate/delete endpoints.
- If parent account deletion is only via paranoid soft-delete (not `isActive = false`), the bypass is safe: a deleted parent can't log in because `User.findByPk` returns null for soft-deleted users.

**Files:** `LOOP_QUESTIONS.md` (create if not exists), `CLAUDE.md` (if accepted)  
**Order dependency:** None — can run in parallel with code batches.  
**Effort:** S (<30 min)  
**Verification:** `LOOP_QUESTIONS.md` has a dated entry. If upgraded to Medium: test that a deactivated parent cannot log in.

---

### Batch 6 — Medium-severity hygiene

**Findings:** BACKEND-008, BACKEND-009, BACKEND-013, BACKEND-014, BACKEND-016, BACKEND-018, BACKEND-037  
**Rationale:** These findings are independent of the IDOR cluster and can be addressed after Batch 3 land. Group by file where possible.

#### BACKEND-008: `getAllSchools` unbounded findAll

**Action:** Fix  
**Approach:** Add `parsePagination(req.query, { limit: 50 })` and pass `limit`/`offset` to `School.findAll`.  
**Files:** `backend/controllers/admin/adminStatsController.js:626`  
**Risk:** Low. Clients that relied on getting all schools in one call will now need to paginate. Check if any frontend dashboard calls this without pagination.  
**Effort:** S

#### BACKEND-009: Government endpoints default to 500-row responses

**Action:** Fix  
**Approach:** In `getStudentsStats` and `getTeachersList`, change default limit from 500 to 50 and cap at 200 (using `Math.min(parsedLimit, 200)`). Update response to include `total`, `limit`, `offset` consistently.  
**Files:** `backend/controllers/governmentController.js:300–380`  
**Risk:** Low-Medium. Government frontend may depend on getting all records in one call. Flag as cross-portal blocker (see Section 3).  
**Effort:** S

#### BACKEND-013: `deleteTherapy` deactivates instead of soft-deletes

**Action:** Fix  
**Approach:** Replace `await therapy.update({ isActive: false })` with `await therapy.destroy()`. The `Therapy` model is `paranoid: true`; `.destroy()` sets `deletedAt`. Add a separate `PATCH /therapy/:id/deactivate` route if deactivation-without-deletion is needed.  
**Files:** `backend/controllers/therapyController.js:474`  
**Risk:** Low. Tests that expect the record to still exist after "delete" will fail — update to expect 404 on re-fetch.  
**Effort:** S

#### BACKEND-014: Swagger glob misses subdirectory routes

**Action:** Fix (future-proofing)  
**Approach:** Change `apis: ['./routes/*.js']` to `apis: ['./routes/**/*.js', './controllers/**/*.js']`.  
**Files:** `backend/config/swagger.js:33`  
**Risk:** Negligible (Swagger is dev-only, non-production).  
**Effort:** S (5 min)

#### BACKEND-016: `isVerified = true` at document upload (misleading state)

**Action:** Fix (rename semantics)  
**Approach:** Remove `await req.user.update({ isVerified: true })` from `receptionController.js:29`. Instead, set `isVerified = true` inside `approveDocument` after all documents are approved (i.e., same block as `documentsApproved = true`, line 180–184 of `adminReceptionController.js`). This makes `isVerified` mean "has been verified by admin" rather than "has uploaded at least once."  
**Files:** `backend/controllers/receptionController.js:29`, `backend/controllers/admin/adminReceptionController.js:176–184`  
**Order dependency:** Batch 1 (BACKEND-001 must be fixed first so `approveDocument` actually runs).  
**Risk:** Low. The actual access gates are `isActive`/`documentsApproved` — `isVerified` changing semantics has no runtime security effect.  
**Effort:** S

#### BACKEND-018: Legacy ParentActivity/Meal/Media in admin stats

**Action:** Refactor  
**Approach:** In `adminStatsController.js` `getStatistics`, replace the `ParentActivity.count`, `ParentMeal.count`, `ParentMedia.count` calls (lines 169–179) with `Activity.count`, `Meal.count`, `Media.count` scoped by `childId IN (children of the admin's parents)`. During a transition window, sum both legacy and modern counts so historical data isn't lost.  
**Files:** `backend/controllers/admin/adminStatsController.js:7–9, 169–179`  
**Risk:** Medium. Stats will change values (modern counts likely differ from legacy counts). The admin dashboard will show different numbers before and after. Warn stakeholders.  
**Effort:** M (1–2h, needs correct child-scoping query)

#### BACKEND-037: `getActivity` parent path fetches only first child

**Action:** Fix  
**Approach:** Replace `Child.findOne({ where: { parentId: req.user.id } })` (lines 178–180) with `Child.findAll({ where: { parentId: req.user.id }, attributes: ['id'] })` and use `where.childId = { [Op.in]: childIds }` (same pattern as `getActivities`).  
**Files:** `backend/controllers/activityController.js:178–185`  
**Risk:** Low. Previously hidden activities (for children 2+) will now be visible. This is correct behavior.  
**Order dependency:** None.  
**Effort:** S

---

### Batch 7 — Response shape standardization decision

**Findings:** BACKEND-012  
**Rationale:** Response shape inconsistency is a cross-cutting problem that requires a product decision before any migration begins. This batch produces a decision document, not code.

**Action:** Decide + document (no migration in this loop)  
**Approach:**  
Choose one of two paths and document it in `CLAUDE.md`:

**Option A (Recommended):** Adopt `{ success: true, data: <payload> }` as the standard for all new endpoints. Existing endpoints that return bare objects are grandfather-claused until a dedicated "response shape" backlog item migrates them. Write the standard in `CLAUDE.md` under "Conventions."

**Option B:** Accept the current mixed state, add an explicit note to `CLAUDE.md` that both shapes exist, and plan a migration in a future sprint.

**Decision gate:** This batch is S-effort (one person, 30 minutes) but requires a product/engineering agreement. If no agreement is reachable in this loop, file in `LOOP_QUESTIONS.md` and note in Section 5.  
**Files:** `CLAUDE.md` (conventions section)  
**Effort:** S (decision) + L (actual migration — deferred to future sprint)

---

### Batch 8 — Low-severity cleanup

**Findings:** BACKEND-019, BACKEND-020, BACKEND-021, BACKEND-022, BACKEND-023, BACKEND-024, BACKEND-026, BACKEND-027, BACKEND-028, BACKEND-038

These are all independent, low-risk, and can be grouped aggressively into 2–3 commits by theme.

#### Sub-batch 8a: Dead files and dead imports (S)

| Finding | Action | File | Change |
|---|---|---|---|
| BACKEND-020 | Remove | `governmentController.js:5` | Delete `import _TherapyUsage from '../models/TherapyUsage.js'` |
| BACKEND-021 | Remove | `.env.example:64–74` | Delete Payme/Click block |
| BACKEND-022 | Remove | `tsconfig.json` | Delete file |

**Risk:** None. **Verification:** ESLint passes, `npm test` passes.

#### Sub-batch 8b: Validation and schema fixes (S)

| Finding | Action | File | Change |
|---|---|---|---|
| BACKEND-024 | Fix | `receptionController.js:9` | Add enum check for `documentType` |
| BACKEND-038 | Fix | `activityController.js:218,247` | Remove `teacher` from body destructure; always set from `req.user` |
| BACKEND-019 | Investigate | `models/Child.js` | Verify whether `class`/`teacher` STRING fields are used by any live query before removing |

**For BACKEND-019:** Before deleting, grep all controllers for `child.class` and `child.teacher` references. If zero references, delete from model. If any exist, document and defer.  
**Risk:** Low.

#### Sub-batch 8c: Rate limiting, logging, pagination (S)

| Finding | Action | File | Change |
|---|---|---|---|
| BACKEND-026 | Fix | `routes/migrationRoutes.js` | Apply `authLimiter` (50/15m) to the `/run` route |
| BACKEND-027 | Fix | `config/database.js:30` | Change `console.log` to `(msg) => logger.debug(msg)` |
| BACKEND-028 | Fix | `parentEvaluationController.js:58` | Use `parsePagination(req.query, { limit: 20 })` |

**Risk:** None. **Verification:** Tests pass.

#### Sub-batch 8d: Safety guard for reset-database script (S)

| Finding | Action | File | Change |
|---|---|---|---|
| BACKEND-023 | Fix | `scripts/reset-database.js` | Add `if (process.env.ALLOW_DB_RESET !== 'true') throw new Error('...')` guard at top; add `--dry-run` flag that prints actions without executing; replace `console.log` with `logger` |

**Risk:** None (script only). Does not affect production path.

---

### Batch 9 — Dead code deletion and documentation

**Findings:** BACKEND-015, BACKEND-034, plus doc outputs from Batches 5 and 7

#### BACKEND-015 + BACKEND-034: Delete dead Telegram functions

**Action:** Remove  
**Files to delete from:** `backend/utils/telegram.js`  
**Specific deletions:**
- `async function getUserChatIdByUsername(username)` (lines 88–120) — private function, no external callers
- `export async function sendAdminApprovalTelegram(...)` (lines 133–223) — exported but never imported anywhere
- `export async function sendTelegramMessage(username, _message)` (lines 10–38) — check if this has callers; if zero, delete as well

**Verification:** After deletion, run `grep -r 'sendAdminApprovalTelegram\|getUserChatIdByUsername\|sendTelegramMessage' backend/` — expect zero results outside `telegram.js` itself.  
**Risk:** None if zero callers confirmed. Run the grep before deleting.

#### Documentation outputs

1. **From Batch 5 (isActive policy):** Add to `CLAUDE.md` under "Auth Flow": explanation of the parent `isActive` bypass, with reason and any product decision reached.
2. **From Batch 7 (response shape):** Add to `CLAUDE.md` under "Conventions": the chosen standard or the explicit acknowledgment of the mixed state.
3. **Pattern documentation:** Add to `CLAUDE.md` under "When Touching Sensitive Areas": "Any endpoint that reads/writes/deletes a child-scoped resource (Activity, Meal, Media, TherapyUsage) MUST call `validateChildAccess(childId, req)` for authorization after the initial PK lookup."

---

## Section 3 — Cross-Portal Blockers

Items that cannot be fully resolved within the backend alone:

| Finding | Blocker type | Coordination needed |
|---|---|---|
| BACKEND-010 (base64 avatars in DB) | Frontend + Backend | The backend can migrate to URL-based avatars (Appwrite upload), but every frontend that reads `user.avatar` expects a base64 data URI. Both must be updated atomically (or a fallback period added). Blocked until frontend portals are audited. |
| BACKEND-012 (response shape inconsistency) | Frontend + Backend | Changing bare-object responses to `{success,data}` will break frontend code that accesses `response.data.groups` vs `response.data.data.groups`. Requires coordinated migration across all portals. |
| BACKEND-009 (government large defaults) | Frontend (government portal) | Reducing default page size from 500 to 50 will require the government frontend to implement pagination for the students/teachers directory pages. |

---

## Section 4 — Deferred Items

Items deliberately not addressed in this loop:

| Finding | Reason | Tracking note |
|---|---|---|
| BACKEND-010 (base64 avatars) | Requires frontend coordination (Section 3). The Railway ephemeral disk workaround that motivated base64 storage remains valid until Appwrite is confirmed stable for all portals. | Revisit when Government portal (Loop 2) is complete; confirm Appwrite is used everywhere. |
| BACKEND-017 (mixed `underscored` convention) | Changing `underscored: true` on an existing model can silently break queries if the migration column names differ from what Sequelize computes. Must be preceded by a live schema inspection via the `postgres-uchqun` MCP tool to verify actual column names for `ChildAssessment`, `ServicePlan`, `MealPlan`, `ParentEvaluation`, `RefreshToken`. Fixing without verification risks production breakage. | Block: schedule a dedicated "schema drift audit" pass during the Database portal (Loop 7). |
| BACKEND-012 (response shape — migration) | Decision is Batch 7; actual endpoint migration is too broad for this loop without frontend coordination. | Track as "Response shape migration" backlog item; execute after all portals are audited. |

---

## Section 5 — Investigation Tasks (gates before batch execution)

| Task | Blocking | Question | Action |
|---|---|---|---|
| BACKEND-033: Can parent accounts be deactivated? | Batch 5 / re-grading | Is there any endpoint that sets `isActive = false` for a parent account? If yes, does the auth middleware bypass prevent that from working? | Grep `backend/controllers/` for `isActive` in combination with parent role. Check `adminParentController.js` and `receptionParentController.js`. |
| BACKEND-017: Live column names for `underscored: true` models | Deferred (Section 4) | Do the DB columns for `ChildAssessment`, `ServicePlan`, `MealPlan`, `ParentEvaluation` actually use snake_case as Sequelize would generate? | Query `postgres-uchqun` MCP: `SELECT column_name FROM information_schema.columns WHERE table_name IN ('child_assessments', 'service_plans', 'meal_plans', 'parent_evaluations')`. |
| BACKEND-019: Are `Child.class`/`Child.teacher` referenced in code? | Sub-batch 8b | Deleting these model fields is safe only if no controller reads them. | `grep -r 'child\.class\|child\.teacher\|\.class\|\.teacher' backend/controllers/ --include="*.js"` |
| BACKEND-015: Is `sendTelegramMessage` (the generic function) called? | Batch 9 | Only `sendAdminApprovalTelegram` and `getUserChatIdByUsername` were confirmed dead. The named export `sendTelegramMessage` might still be imported. | `grep -r 'sendTelegramMessage' backend/ --include="*.js"` |
| BACKEND-012: Response shape decision | Batch 7 | Which shape is the standard? `{success,data}` or bare object? | Engineering/product decision; file in LOOP_QUESTIONS.md if not resolvable. |

---

## Section 6 — Test Plan Summary

For each batch, the minimum tests that must exist or be added to prove the batch is safe:

| Batch | Required tests |
|---|---|
| 1 (BACKEND-001) | `adminReception.test.js`: admin approves own reception's document → 200, reception activated; admin approves another admin's document → 403. |
| 1 (BACKEND-006) | `documentUpload.test.js`: file with mismatched magic bytes → 400; valid PDF → 201. |
| 3a (BACKEND-002) | `adminReception.test.js`: admin updates own reception → 200; admin updates other admin's reception (same school) → 404. |
| 3b (BACKEND-003) | `media.test.js`: delete/update own-school media → 204/200; cross-school media by UUID → 404; proxy own-school → 200; proxy cross-school → 403. |
| 3c (BACKEND-005) | `meal.test.js`: admin lists meals (no filter) → only own-school meals returned. |
| 3d (BACKEND-025) | `therapy.test.js`: admin lists therapy usage → only own-school usage. |
| 3e (BACKEND-035) | `activity.test.js`: admin lists activities → only own-school; cross-school delete → 404. |
| 3e (BACKEND-036) | `activity.test.js`: teacher deletes cross-school activity → 404. |
| 4 (BACKEND-007) | `adminStats.test.js`: mock DB error → expect 500 from getSchoolRatings. |
| 6 (BACKEND-037) | `activity.test.js`: parent with 2 children calls GET /activities/:id for child 2's activity → 200 (not 404). |
| 6 (BACKEND-013) | `therapy.test.js`: after DELETE /therapy/:id, GET /therapy/:id → 404 (paranoid delete). |
| 8 (BACKEND-028) | `parentEvaluation.test.js`: GET /evaluations?limit=5 → max 5 results. |
| 8 (BACKEND-026) | Rate-limit test or manual verification that migration endpoint returns 429 after 50 rapid requests. |
| 9 | After telegram deletion: `grep -r sendAdminApprovalTelegram backend/` → zero results; `npm test` passes. |

**Note:** `schoolIsolation.test.js` should be extended to cover all newly fixed controllers as a regression guard. It currently tests the school isolation middleware; extend it to include `getActivities`, `getMeals`, `deleteMedia`, `deleteActivity` cross-school scenarios.

---

## Finding index (complete — 38 findings, no gaps)

Verify every finding is in exactly one batch:

| Finding | Batch |
|---|---|
| BACKEND-001 | 1 |
| BACKEND-002 | 3a |
| BACKEND-003 | 3b |
| BACKEND-004 | 3b |
| BACKEND-005 | 3c |
| BACKEND-006 | 1 |
| BACKEND-007 | 4 |
| BACKEND-008 | 6 |
| BACKEND-009 | 6 |
| BACKEND-010 | Deferred |
| BACKEND-011 | 3b |
| BACKEND-012 | 7 |
| BACKEND-013 | 6 |
| BACKEND-014 | 6 |
| BACKEND-015 | 9 |
| BACKEND-016 | 6 |
| BACKEND-017 | Deferred |
| BACKEND-018 | 6 |
| BACKEND-019 | 8b (after investigation) |
| BACKEND-020 | 8a |
| BACKEND-021 | 8a |
| BACKEND-022 | 8a |
| BACKEND-023 | 8d |
| BACKEND-024 | 8b |
| BACKEND-025 | 3d |
| BACKEND-026 | 8c |
| BACKEND-027 | 8c |
| BACKEND-028 | 8c |
| BACKEND-029 | Info — no action |
| BACKEND-030 | Info — no action |
| BACKEND-031 | Info — no action |
| BACKEND-032 | Info — no action |
| BACKEND-033 | 5 (investigate) |
| BACKEND-034 | 9 |
| BACKEND-035 | 3e |
| BACKEND-036 | 3e |
| BACKEND-037 | 6 |
| BACKEND-038 | 8b |
