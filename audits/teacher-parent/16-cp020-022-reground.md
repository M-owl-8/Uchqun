# CP-020 / CP-022 Re-Grounding Audit

**Date:** 2026-05-27  
**Type:** READ-ONLY — no code changes  
**Scope:** Verify actual state of CP-020 (two-direction school rating), CP-022 (parent message routing), and their shared dependency CP-021 (region model). Produce a clear BUILDABLE-vs-BLOCKED table for both overhauls.

---

## STEP 1 — CP-021: Region Model Actual State + Verdict

### Original spec (LOOP_CROSS_PORTAL.md, row CP-021)

> "Foundation model: region accounts scope to one region, republic accounts see all. Every CP from CP-020 onward depends on this. Build before any multi-region feature."

Required deliverables per spec:
- Region entity: `id`, `name`, `code`
- School → Region FK (`schools.regionId`)
- Government user → Region assignment (nullable — null = republic)
- `requireRegionScope` middleware
- Authoritative region list (PL-015 — product owner to provide real names)

### What was actually built (Sprints A–E3)

| Deliverable | Built? | Notes |
|---|---|---|
| `Region` model | ✅ | `id UUID, code STRING(50) unique, name STRING(255), isRepublic BOOLEAN` |
| `District` model | ✅ | Exists (not audited in depth — not a CP-020/022 dependency) |
| 13 placeholder region seeds | ✅ | Uzbekistan's 13 regions + 1 republic row |
| `schools.regionId` FK | ✅ | School belongs to a region |
| `users.govRegionId` + `govLevel` + `govType` + `govAccessGrants` | ✅ | Government account region assignment columns |
| `requireRegionScope` middleware | ✅ | Restricts gov queries to assigned region |
| `regionWhere` helper | ✅ | Builds Sequelize WHERE clause for region-scoped queries |
| `req.isGlobalAccess` + `req.regionScope` | ✅ | Populated by middleware, consumed by controllers |
| `requireGovAccess` middleware | ✅ | Combined gate |
| `GET /government/messages` region-scoped | ✅ | Already uses `req.isGlobalAccess + req.regionScope` via school→user→message join |

### Verdict: CP-021 is COMPLETE

The original spec called CP-021 "the foundation — build before any multi-region feature." That foundation is fully in place. **CP-021 is no longer a blocker for CP-020 or CP-022.**

PL-015 (product owner to provide real region names) is a data concern, not a code blocker. Placeholder names exist in seeds; they do not block building or wiring any backend endpoint.

---

## STEP 2 — CP-020: Two-Direction School Rating — Current vs Spec + Verdict

### Original spec (LOOP_CROSS_PORTAL.md, rows CP-020 + CP-021 + spec section)

**Two rating directions:**
1. Parent → School: one rating per parent per school (upsert). School membership required.
2. Government → School: one rating per gov user per school per period. Region scope applied.

**5 indicators per direction:** each rated 1–5; aggregate = mean (or weighted — TBD). Labels live in `shared/config/ratingIndicators.js` (already created with placeholder names).

**Mandatory comment:** every submission (both directions) must include a non-empty comment → 400 `RATING_COMMENT_REQUIRED` if missing.

**Region-aware aggregation:** `GET /government/ratings` must scope to authenticated gov account's region (or all, if republic). Blocked on CP-021 — but CP-021 is now built.

**Backend work per spec:**
- New `GovernmentSchoolRating` model + migration
- Tighten `SchoolRating` to enforce mandatory comment + indicator structure
- `POST /government/schools/:id/rate`
- `GET /government/schools/:id/ratings/gov`
- `GET /government/ratings?direction=parent|gov`

**Teacher portal (Loop 5) work per spec:**
- Parent rating form: 5 indicator sliders (PARENT_INDICATORS) + mandatory comment textarea
- Show parent's own prior rating for editing
- Replaces/extends existing single-star form

### Current backend state

**`SchoolRating` model** (`backend/models/SchoolRating.js`):
```
schoolId UUID (FK)
parentId UUID (FK)
stars INTEGER (1-5)
numericRating INTEGER nullable (1-10)  — legacy, will be superseded
evaluation JSONB nullable              — generic predecessor to 5-indicator structure
comment TEXT nullable                  — MUST become NOT NULL for CP-020
```
Unique index on `(schoolId, parentId)`.

**`parentSchoolRatingController.rateSchool`** (`backend/controllers/parent/parentSchoolRatingController.js`):
- Accepts: `stars` (required), `comment` (nullable), `evaluation` (nullable JSONB), `schoolId` (from body — then 3-part ownership check)
- Uses OLD error shape (`{ error: '<string>' }`) — not BACKEND-012
- TP-05: three-part null-bypass `if (req.user.schoolId && req.user.schoolId !== finalSchoolId)` — safe in practice (parent always has schoolId) but follows the defect class

**Existing government read endpoints:**
- `GET /government/ratings` — returns parent-only aggregates (stars only, no indicator breakdown)
- `GET /government/ratings/:schoolId` — same, single-school

**`shared/config/ratingIndicators.js`** — exists with 5 placeholder `PARENT_INDICATORS` + 5 `GOV_INDICATORS`. Structure is correct; placeholder names need product-owner replacement (PL-015).

**Not yet built:**
- `GovernmentSchoolRating` model (entirely new)
- Government-direction rating endpoints
- 5-indicator structure in parent SchoolRating (currently flat JSONB)
- Mandatory comment enforcement (model + controller)

### Current teacher portal state

- `teacher/src/parent/pages/TeacherRating.jsx` — **5-star teacher rating**, not school rating. Separate concept.
- No dedicated parent school rating page exists in the teacher portal today.
- `POST /parent/school-rating` call exists somewhere in parent portal — exact file not pinpointed in S0 audit; likely in Settings or inline in another page.
- Backend endpoint accepts the old single-star form; any new 5-indicator form requires backend to land first.

### CP-020 delta table

| Spec requirement | Current state | Gap |
|---|---|---|
| `GovernmentSchoolRating` model | ❌ Not built | Full model + migration needed |
| Parent 5-indicator structure | ❌ Flat JSONB only | New indicator columns or JSONB schema enforce |
| Mandatory comment enforcement | ❌ Nullable in model + controller | Model constraint + controller validation |
| `POST /government/schools/:id/rate` | ❌ Not built | New endpoint |
| `GET /government/schools/:id/ratings/gov` | ❌ Not built | New endpoint |
| `GET /government/ratings?direction=` | ⚠️ Exists for parent only | Extend to support `direction=gov` |
| Region-aware aggregation | ✅ CP-021 now built (blocker lifted) | Just needs wiring to regionWhere |
| BACKEND-012 error shape on rating endpoints | ❌ Old shape on existing parent endpoint | Grandfather clause applies; fix when touched |
| TP-05 three-part bypass in rateSchool | ⚠️ Low severity (parent always has schoolId) | Fix opportunistically when touching controller |
| `ratingIndicators.js` placeholder config | ✅ Exists | PL-015 data (real names) needed before beta |
| Teacher portal: 5-indicator parent form | ❌ Not built | Blocked on backend landing first |

### PL-015 status

PL-015 tracks product owner providing real indicator names (e.g. "tozalik", "qarov"). This is a **data-only blocker** for the user-facing UI — the backend model, migration, and endpoint work can all proceed with placeholder names. The frontend form must not ship to beta users with placeholder labels.

### CP-020 verdict: PARTIALLY BUILDABLE

Backend work (GovernmentSchoolRating model, migration, government endpoints, indicator structure, mandatory comment) is fully unblocked — CP-021 dependency is met. Build backend CP-020 first.

Teacher portal parent rating form is blocked on the backend landing the indicator structure. Sequence: backend CP-020 → teacher portal form.

---

## STEP 3 — CP-022: Parent Message Routing — Current vs Spec + Verdict

### Original spec (LOOP_CROSS_PORTAL.md, row CP-022 + spec section)

**What CP-022 adds to `GovernmentMessage`:**
- New field `recipientLevel` — enum `owner | region | republic`
  - `owner` → school admin inbox (within-school, not a government account)
  - `region` → government account assigned to sender's school's region (CP-021 required)
  - `republic` → any republic-level government account (`regionId = null`)
- New field `escalatedFromId` (UUID, nullable, self-referential FK) — escalation chain pointer

**Send endpoint changes:**
- Restrict sender to `role === 'parent'` (other roles' send access must be documented, not silently removed)
- Accept `recipientLevel` + optional `escalatedFromId` in body
- Routing logic: look up `schools.regionId` → find matching gov account → scope delivery

**Inbox changes:**
- `GET /government/messages`: accept `level` param; scope to authenticated gov account's region

**Escalation flow:** parent sends `owner` → `region` → `republic` with `escalatedFromId` chain. Government inbox shows chain with "⚠️ Escalated" badge.

**Teacher portal (Loop 5) work:**
1. Audit current compose form location (`MessageModal.jsx` singular — not confirmed in S0)
2. Add `recipientLevel` selector (owner / region / republic) with explanatory copy
3. Optional escalation link
4. Level badge on sent message history

### Current backend state

**`GovernmentMessage` model** (`backend/models/GovernmentMessage.js`):
```
id UUID
senderId UUID (FK users, SET NULL on delete)
subject STRING(500)
message TEXT
isRead BOOLEAN (default false)
readAt DATE nullable
reply TEXT nullable
repliedAt DATE nullable
parentMessageId UUID (FK self, SET NULL — threading)
```
Associations: `hasMany GovernmentMessage as 'replies'`, `belongsTo GovernmentMessage as 'parent'`.

**Not present on model:** `recipientLevel`, `escalatedFromId`.

**`governmentMessageController.sendMessage`:**
- Accepts from ANY authenticated user — no role restriction
- Creates flat `GovernmentMessage` record with `senderId`, `subject`, `message`
- No routing logic; no `recipientLevel` consumption

**`governmentMessageController.getAllMessages`:**
- Already region-scoped via `req.isGlobalAccess + req.regionScope` (school→user→message join)
- Has `isMessageInScope(message, req)` helper for boundary checks on reply/read/delete
- No `level` filter parameter

**`parentMessageController.getMyMessages`:**
- Returns `where: { senderId: req.user.id }` — own sent messages only ✓

**Teacher portal current state (from S0 audit):**
- `teacher/src/parent/pages/childProfile/MessagesModal.jsx` — **display-only** (received messages + gov replies)
- `teacher/src/pages/settings/MessagesModal.jsx` — **display-only** (teacher's own sent messages)
- Compose form location: S0 identified `MessageModal.jsx` (singular) as the suspected send form — **not confirmed in S0 audit** (marked as must-verify in S1)

### CP-022 delta table

| Spec requirement | Current state | Gap |
|---|---|---|
| `recipientLevel` field on GovernmentMessage | ❌ Not present | Migration needed |
| `escalatedFromId` field on GovernmentMessage | ❌ Not present | Migration needed + self-ref FK |
| Routing: `owner` path | ❌ Not built | Design decision needed: what is "school admin inbox"? |
| Routing: `region` path | ❌ Not built | CP-021 built — `schools.regionId` + `users.govRegionId` available |
| Routing: `republic` path | ❌ Not built | Gov accounts with `govRegionId = null` |
| Restrict send to parent role | ❌ Any role can send | Needs explicit restriction + documentation |
| `level` filter on `GET /government/messages` | ❌ Not present | Additive query param |
| Escalation chain visibility in gov inbox | ❌ Not built | Query + UI layer |
| "Escalated" badge on `recipientLevel = republic` with prior chain | ❌ Not built | UI |
| `isMessageInScope` already exists | ✅ | Region boundary check helper present |
| `getAllMessages` already region-scoped | ✅ | CP-021 wiring already done for read path |
| Teacher portal: `recipientLevel` selector | ❌ Not built | Blocked on backend |
| Teacher portal: escalation link + level badge | ❌ Not built | Blocked on backend |
| Compose form location confirmed | ⚠️ Unconfirmed | Must verify `MessageModal.jsx` in S1 |

### CP-022 region-dependency split

The three routing paths have different CP-021 dependencies:

| Routing path | CP-021 required? | Now unblocked? |
|---|---|---|
| `republic` | No — just find gov accounts with `govRegionId = null` | ✅ Yes |
| `region` | Yes — need `schools.regionId` → find gov account with matching `govRegionId` | ✅ Yes (CP-021 built) |
| `owner` | No region model needed — deliver within school | ✅ Yes (but "owner inbox" channel is TBD) |

**TBD item:** the spec says `owner` routes to "the school's admin/owner inbox (within-school escalation, not to a government account)." It adds: "use existing admin message channel, or a new owner-specific channel — TBD during backend loop." This is an open design decision that must be resolved before building the `owner` routing path. Options:
1. Deliver to existing `GovernmentMessage` table with `recipientLevel='owner'` and filter by school admin query
2. Separate channel (new model or table) — higher cost but cleaner separation
3. Reuse the teacher↔parent Chat socket channel — semantically wrong

Recommendation: Option 1 (same table, filter by school admin) is lowest cost and consistent with the existing model. Backend loop must confirm.

### CP-022 verdict: PARTIALLY BUILDABLE

Migration (`recipientLevel` + `escalatedFromId`) and `republic`/`region` routing are unblocked. The `owner` path has an open design decision. Teacher portal work is blocked until backend lands. Compose form location must be confirmed in S1 before building the UI layer.

---

## STEP 4 — Changed-Surface Cross-Check + Isolation Axes

### CP-020 isolation axes for new endpoints

**`POST /government/schools/:id/rate` (government-direction rating):**
- Axis 1 — Role: must be `requireGovAccess` (gov role only)
- Axis 2 — Region scope: government rating on school X requires school X to be in gov user's region (via `requireRegionScope` or explicit `regionWhere` check in controller)
- Axis 3 — One-rating-per-gov-user-per-school: upsert guard on `(schoolId, govUserId)` — model must enforce or controller must check

**`POST /parent/school-rating` (updated for indicators):**
- Axis 1 — Ownership: `parentId` from `req.user.id` (never from body)
- Axis 2 — School membership: parent's child must belong to the rated school — current 3-part bypass (TP-05) must be tightened to 2-part form
- Axis 3 — Mandatory comment: controller must validate before model create/upsert

**`GET /government/ratings?direction=` (aggregation):**
- Already region-scoped via `req.isGlobalAccess + req.regionScope`
- New `direction` param just switches which model (SchoolRating vs GovernmentSchoolRating) to aggregate

### CP-022 isolation axes for new endpoints

**`POST /government/messages` (updated with routing):**
- Role restriction: restrict sender to `role === 'parent'` per spec — but document that teacher/admin send was previously allowed, and decide explicitly whether to remove it
- `recipientLevel` validation: must be one of `owner | region | republic` (400 otherwise)
- `escalatedFromId` validation: if provided, message must exist AND belong to `req.user.id` as sender (prevent pointing to another user's message chain)
- Routing: server-side only — client sends `recipientLevel`, never a raw `recipientUserId`

**`GET /government/messages?level=` (updated inbox):**
- Already region-scoped for gov accounts — `level` param is additive filter on top of existing region scope
- No new isolation risk; additive-only

### Surfaces to regression-test after CP-020 build

- Existing `GET /government/ratings` / `GET /government/ratings/:schoolId` — must continue returning parent-direction aggregates unchanged
- `POST /parent/school-rating` — tightening comment validation is a **breaking change** for any parent form that currently submits without a comment (teacher portal form must be updated simultaneously)

### Surfaces to regression-test after CP-022 build

- `GET /government/messages` — must not break existing non-level-filtered queries
- `GET /parent/messages` — no changes expected; just verify `senderId` scoping still holds after migration adds new columns
- Reply/read/delete endpoints via `isMessageInScope` — new columns must not break scope checks

---

## BUILDABLE-vs-BLOCKED Summary

| Item | Buildable now? | Blocker (if any) |
|---|---|---|
| CP-020: `GovernmentSchoolRating` model + migration | ✅ BUILDABLE | None |
| CP-020: 5-indicator structure on parent SchoolRating | ✅ BUILDABLE | None |
| CP-020: Mandatory comment enforcement (model + controller) | ✅ BUILDABLE | Must coordinate with teacher portal form update (simultaneous) |
| CP-020: `POST /government/schools/:id/rate` | ✅ BUILDABLE | None |
| CP-020: `GET /government/schools/:id/ratings/gov` | ✅ BUILDABLE | None |
| CP-020: `GET /government/ratings?direction=gov` | ✅ BUILDABLE | None |
| CP-020: Region-aware aggregation | ✅ BUILDABLE | CP-021 is complete (blocker lifted) |
| CP-020: Teacher portal parent rating form (5 indicators) | 🔶 BLOCKED | Backend indicator structure must land first |
| CP-020: Real indicator names (PL-015) | 🔶 BLOCKED (beta UX only) | Product owner to provide names; backend/migration can proceed with placeholders |
| CP-022: `recipientLevel` + `escalatedFromId` migration | ✅ BUILDABLE | None |
| CP-022: Routing — `republic` path | ✅ BUILDABLE | None (find gov accounts with `govRegionId = null`) |
| CP-022: Routing — `region` path | ✅ BUILDABLE | CP-021 is complete (blocker lifted) |
| CP-022: Routing — `owner` path | 🔶 NEEDS DECISION | "School admin inbox" channel TBD — resolve before build |
| CP-022: Restrict send to `role === 'parent'` | ✅ BUILDABLE | Explicitly document what happens to other-role sends |
| CP-022: `GET /government/messages?level=` | ✅ BUILDABLE | None |
| CP-022: Escalation chain query + gov inbox display | ✅ BUILDABLE | None |
| CP-022: Teacher portal `recipientLevel` selector | 🔶 BLOCKED | Backend must land; compose form location must be confirmed |
| CP-022: Teacher portal level badge + escalation link | 🔶 BLOCKED | Same |

### Recommended build sequence

1. **Confirm `owner` routing design** — pick Option 1 (same `government_messages` table, school admin inbox filter) or reject it. One conversation with the product owner. Unblocks CP-022 `owner` path.
2. **Backend CP-020** — `GovernmentSchoolRating` model, migration, 5-indicator structure, mandatory comment, all government endpoints. This is the largest backend sprint.
3. **Backend CP-022** — migration (`recipientLevel` + `escalatedFromId`), routing logic, `level` filter. Smaller than CP-020 backend; both can be tackled in the same backend sprint.
4. **Teacher portal CP-020** (parent rating form) — after backend lands. Must tighten TP-05 bypass simultaneously.
5. **Teacher portal CP-022** (compose form + level selector) — after backend lands. Confirm compose form location first (S1 item: read `MessageModal.jsx`).
6. **Government portal CP-020 + CP-022** — Loop 2 (Government portal), outside current Loop 5 scope.
