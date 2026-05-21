# Uchqun Refinement Loop — Cross-Portal Handoffs

Items identified during Backend S3 (Execute Cleanup) that cannot be fully resolved within the backend alone.

**Created:** 2026-05-19  
**Source step:** Backend S3 Execute Cleanup  

---

| ID | Finding | Backend state | Portal(s) needed | Action required |
|---|---|---|---|---|
| CP-001 | BACKEND-009: Government endpoints default limit 500 → 50 | ✅ Backend capped at `Math.min(limit, 200)`, response now includes `total/limit/offset` | Government portal (Loop 2) | `getStudentsStats` and `getTeachersList` now return paginated shape. Government dashboard directory pages must implement pagination UI. Temporary workaround: pass `?limit=200` until UI is updated. |
| CP-002 | BACKEND-010: User avatars stored as base64 in DB | Deferred from Backend S3 | All portals (Loops 2–6) | Cannot migrate to URL-based avatar storage until every frontend portal is confirmed to read avatars from URL, not inline data URI. Backend migration must be atomic with frontend rollout. Revisit after Government audit (Loop 2) confirms Appwrite is stable across all portals. |
| CP-003 | BACKEND-012: Response shape inconsistency (`{success,data}` vs bare object) | Decision documented in `CLAUDE.md` under Conventions | All portals (Loops 2–6) | New backend endpoints use `{success: true, data}` shape. Existing endpoints are grandfather-claused. Full migration blocked until all frontend portals are audited for `response.data.X` vs `response.data.data.X` access patterns. Track as "Response shape migration" backlog item. |
| CP-004 | Teacher children list (GAP-001) | ✅ GET /teacher/children — Sprint A (a706f96) | teacher/Attendance.jsx, teacher/ChildDetail.jsx | schoolId-scoped; `{ success, data: [...] }` shape |
| CP-005 | Attendance marking (GAP-003) | ✅ POST/GET/PATCH/DELETE /attendance — Sprint A (69d2114) | teacher/Attendance.jsx | Returns `childSnapshot`; PATCH for corrections; DELETE admin-only |
| CP-006 | Child observations (GAP-002) | ✅ POST /teacher/observations, GET /teacher/observations/recent, GET /teacher/children/:id/observations — Sprint B T1-2 (5bd03ae) | teacher/QuickObservation.jsx, teacher/DailyReflection.jsx | Private to staff; not visible to parents |
| CP-007 | Teacher reflections (GAP-005) | ✅ POST /teacher/reflections, GET /teacher/reflections — Sprint B T1-3 (93a22a2) | teacher/DailyReflection.jsx | Filtered by `teacherId` — cross-teacher invisible; requireRole('teacher') strict |
| CP-008 | Parent journal (GAP-005) | ✅ POST /teacher/journal (write), GET /parent/children/:id/journal (read) — Sprint B T1-3 (93a22a2) | teacher/DailyReflection.jsx (write), parent portal (read) | `isVisibleToParent` flag controls visibility; teacherId UUID never exposed to parents |
| CP-009 | Admin doc filter (GAP-006, GAP-018) | ✅ GET /admin/documents?status= — Sprint A (a706f96) | admin/DocumentApprovalQueue.jsx | Keep GET /admin/documents/pending unchanged |
| CP-010 | Reception doc filter (GAP-007) | ✅ GET /reception/documents?status= — Sprint A (9c8d888) | reception portal doc list | Additive query param — non-breaking |
| CP-011 | Bulk import (GAP-011) | ✅ POST /admin/import/children/validate, POST /admin/import/:id/start, GET /admin/import/:id/status, GET /admin/import/:id/errors — Sprint C T1-7a+T1-7b | admin portal import UI | Validate → 201 ImportJob; Start → 202 then setImmediate; poll /status every ~3s; /errors returns { row, field, code }[] |
| CP-012 | Parent suspension (GAP-S01) | ✅ PUT /admin/parents/:id/suspend+activate (0a9bde6); auth gate returns 401 ACCOUNT_NOT_ACTIVE on next request | admin portal parent detail | Suspended parent gets 401 ACCOUNT_NOT_ACTIVE immediately on next request. Admin UI needs suspend/activate buttons on parent detail page. |
| CP-013 | Child goals (GAP-004) | ✅ GET /teacher/children/:id/goals, POST /teacher/children/:id/goals, GET/PATCH/DELETE /teacher/goals/:id, POST/GET /teacher/goals/:id/reviews, GET /admin/children/:id/goals — Sprint E T2-3 (ab7c424) | teacher/ChildDetail.jsx | Goals screen now functional. 8 categories, 5 progress statuses, review history. Admin view returns review counts via include. |
| CP-014 | School archival (GAP-S05) | ✅ PUT /government/schools/:id/archive+reactivate (00a1402); requireSchoolScope returns 403 SCHOOL_ARCHIVED for admin/teacher/reception at inactive schools | government portal school management | Government UI needs archive/reactivate buttons on school detail page. Admin portal should display "school archived" banner when their school is inactive. |
| CP-015 | Data export (DEC-7 / LQ-008) | ✅ GET /parent/me/export — Sprint E T2-10 (8aeea41) | parent portal account settings | JSON file download; rate-limited 1 request/24h per user (Redis-backed). No password, no concern/urgent observations, no raw EM entries. |
| CP-016 | Restore endpoints (GAP-017) | ✅ PUT /admin/children/:id/restore, /admin/users/:id/restore, /admin/observations/:id/restore, /admin/attendance/:id/restore — Sprint E T2-9 (87b7174) | admin portal, government portal | Admin-only (+ government cross-school). Returns 400 RESTORE_NOT_DELETED if record not soft-deleted. Admin portal needs "Restore" action on soft-deleted record views. Government portal can restore across schools. |
| CP-017 | Parent data export UI | ✅ GET /parent/me/export — Sprint E T2-10 (8aeea41) | parent portal account settings page | Add "Download my data" button. On success: browser downloads `uchqun-data-export-{id}-{date}.json`. On 429 DATA_EXPORT_RATE_LIMITED: show "You can only export once per day. Try again tomorrow." |

| CP-018 | BACKEND-017: Mixed Sequelize `underscored` convention across models | Deferred from Backend S3 — 4 models use `underscored: true`, majority use `underscored: false` | Database portal (Loop 7) | `ChildAssessment.js`, `ServicePlan.js`, `MealPlan.js`, `ParentEvaluation.js` use `underscored: true`; all others use camelCase columns. Verify live schema column names match model declarations before any JOIN-heavy query is added. Fix convention drift in Database portal S2. |
| CP-019 | AI-translation UI notice — first parent login | Pre-Launch Sprint PL-009 — `backend/i18n/` files generated by AI, explicitly labeled UNVERIFIED. PL-009-VERIFY tracked for professional review. | Every portal with end-user-facing text (Government, Admin, Reception, Teacher, Parent) | Display a one-time notice during first-time parent/teacher/reception login: "This platform's Russian and Uzbek translations are auto-generated and may contain errors. We apologize for any inconvenience." Dismiss on user acknowledgement. Remove notice once PL-009-VERIFY is complete. |
| CP-020 | Two-direction school rating system (parent + government) | ⬜ PLANNED-NOT-BUILT. Depends on CP-021 (region model). | Producer: Backend (new `GovernmentSchoolRating` model + refactored `SchoolRating` endpoints). Consumers: Teacher portal (parent rating UI), Government portal (rating display + government rating UI). | See full spec below. Two rating directions; 5 named indicators each; mandatory comment; region-aware aggregation; placeholder config at `shared/config/ratingIndicators.js`. Build per-portal when each loop runs. |
| CP-021 | Region/hierarchy authorization model (forward reference) | ⬜ PLANNED-NOT-BUILT. Design deliverable is next step after this spec capture. | Producer: Backend (new region model + migrations + scope middleware). Consumers: ALL portals — government queries, ratings (CP-020), messages (CP-022), directories, audit log. | See full spec below. Foundation model: region accounts scope to one region, republic accounts see all. Every CP from CP-020 onward depends on this. Build before any multi-region feature. |
| CP-022 | Parent message routing & escalation | ⬜ PLANNED-NOT-BUILT. Depends on CP-021 (region model for school→region mapping). | Producer: Backend (new `recipientLevel` field on `GovernmentMessage` + routing logic). Consumers: Teacher portal (parent sends + chooses level), Government portal (receipt + routing inbox). | See full spec below. Parent chooses: owner, region, or republic. Current state unverified — teacher portal loop must audit MessagesModal before building. Build per-portal when each loop runs. |
| CP-023 | Forced password-change flow | ✅ Backend gate: `middleware/auth.js:117` — `mustChangePassword=true` returns `403 PASSWORD_CHANGE_REQUIRED` for all endpoints except `/api/v1/user/password` and `/api/v1/auth/logout`. Government portal: ✅ Sprint E1 — redirect to `/government/change-password`, nav blocked until changed. | Admin, Reception, Teacher portals (Loops 3–5) | Each portal must redirect to a `/change-password` page when `mustChangePassword=true` in the auth context. Block all nav (same pattern as Government Sprint E1: check in AppRoutes, navigate away on success). Backend gate is already enforced. |

---

## Full Specifications

### CP-020 — Two-direction school rating system

**Status:** PLANNED-NOT-BUILT  
**Depends on:** CP-021 (region model — required for region-aware aggregation)  
**Captured:** 2026-05-21 (Government S7 Sprint 1 close-out)

#### Two rating directions

Both target schools (`schoolId`). Stored and aggregated independently — they are never mixed:

1. **Parent ratings of schools** — a parent submits a rating for their child's school. One rating per parent per school (upsert). Subject to school-membership check (parent's child must belong to the rated school).
2. **Government ratings of schools** — a government-role user (region or republic level) submits a rating for any school within their scope. One rating per government user per school per period (TBD on period enforcement — confirm during Backend loop).

#### 5 indicators per direction (placeholder names)

Both directions use **5 labeled sub-criteria**. Each indicator is rated on a 1–5 integer scale (same scale as `stars`). The aggregate rating for a submission is derived from the indicator scores (mean, or weighted — TBD during backend loop).

**Parent indicator names (placeholders):**
- `parent_indicator_1` — placeholder label: "Indicator 1" / "Ko'rsatkich 1" / "Показатель 1"
- `parent_indicator_2` — placeholder label: "Indicator 2" / "Ko'rsatkich 2" / "Показатель 2"
- `parent_indicator_3` — placeholder label: "Indicator 3" / "Ko'rsatkich 3" / "Показатель 3"
- `parent_indicator_4` — placeholder label: "Indicator 4" / "Ko'rsatkich 4" / "Показатель 4"
- `parent_indicator_5` — placeholder label: "Indicator 5" / "Ko'rsatkich 5" / "Показатель 5"

**Government indicator names (placeholders):**
- `gov_indicator_1` — placeholder label: "Indicator 1" / "Ko'rsatkich 1" / "Показатель 1"
- `gov_indicator_2` — placeholder label: "Indicator 2" / "Ko'rsatkich 2" / "Показатель 2"
- `gov_indicator_3` — placeholder label: "Indicator 3" / "Ko'rsatkich 3" / "Показатель 3"
- `gov_indicator_4` — placeholder label: "Indicator 4" / "Ko'rsatkich 4" / "Показатель 4"
- `gov_indicator_5` — placeholder label: "Indicator 5" / "Ko'rsatkich 5" / "Показатель 5"

> **IMPORTANT — placeholder replacement:** Real indicator names (e.g. "tozalik", "qarov") are provided by the product owner. When received, update **only** the config file at `shared/config/ratingIndicators.js` — all portals read labels from there. Labels must exist in all three languages (en / uz / ru). AI-generated translations must be labeled UNVERIFIED. Do NOT hardcode indicator names in any component or backend file; always reference the config.

#### Placeholder config file

Path: `shared/config/ratingIndicators.js`  
```js
// HOW TO REPLACE PLACEHOLDERS:
// 1. Replace "parent_indicator_N" keys with real indicator slugs (e.g. "cleanness").
// 2. Replace label strings with authoritative translations in all three languages.
// 3. Mark translations UNVERIFIED until reviewed by a native speaker.
// 4. Do NOT change the file structure — every frontend and backend references these keys.

export const PARENT_INDICATORS = [
  { key: 'parent_indicator_1', en: 'Indicator 1', uz: "Ko'rsatkich 1", ru: 'Показатель 1' },
  { key: 'parent_indicator_2', en: 'Indicator 2', uz: "Ko'rsatkich 2", ru: 'Показатель 2' },
  { key: 'parent_indicator_3', en: 'Indicator 3', uz: "Ko'rsatkich 3", ru: 'Показатель 3' },
  { key: 'parent_indicator_4', en: 'Indicator 4', uz: "Ko'rsatkich 4", ru: 'Показатель 4' },
  { key: 'parent_indicator_5', en: 'Indicator 5', uz: "Ko'rsatkich 5", ru: 'Показатель 5' },
];

export const GOV_INDICATORS = [
  { key: 'gov_indicator_1', en: 'Indicator 1', uz: "Ko'rsatkich 1", ru: 'Показатель 1' },
  { key: 'gov_indicator_2', en: 'Indicator 2', uz: "Ko'rsatkich 2", ru: 'Показатель 2' },
  { key: 'gov_indicator_3', en: 'Indicator 3', uz: "Ko'rsatkich 3", ru: 'Показатель 3' },
  { key: 'gov_indicator_4', en: 'Indicator 4', uz: "Ko'rsatkich 4", ru: 'Показатель 4' },
  { key: 'gov_indicator_5', en: 'Indicator 5', uz: "Ko'rsatkich 5", ru: 'Показатель 5' },
];
```

#### Mandatory comment

Every rating submission (both directions) **must include a written comment**. Empty or whitespace-only comment → HTTP 400 `RATING_COMMENT_REQUIRED`.

**Current state note:** `SchoolRating.comment` is currently `allowNull: true` and the `parentSchoolRatingController.rateSchool` handler allows empty/null comments. Both the model constraint and the controller validation must be tightened when CP-020 is implemented. This is a **breaking change** to the existing parent rating form in the teacher portal — the form must be updated before the backend validation is hardened.

#### Region-aware aggregation (depends on CP-021)

Ratings must be aggregatable two ways:
- **(a) Within a single region** — for region-level government accounts: aggregate only schools in that account's region.
- **(b) Across the whole republic** — for republic-level government accounts: aggregate all schools.

The aggregation endpoint (`GET /government/ratings`) must accept a `scope` parameter (`region` | `republic`) or derive scope from the authenticated user's region assignment (from the CP-021 region model). Do NOT implement region-aware aggregation until CP-021's region model is merged.

#### What each portal loop builds

| Loop | Portal | Work |
|---|---|---|
| Backend (already open) | Backend | New `GovernmentSchoolRating` model + migration. Update `SchoolRating` to enforce mandatory comment. New endpoints: `POST /government/schools/:id/rate`, `GET /government/schools/:id/ratings/gov`, `GET /government/ratings?direction=parent|gov`. Region-aware aggregation after CP-021 lands. |
| Loop 5 (Teacher) | Teacher portal | Parent rating form: 5 indicator sliders + mandatory comment textarea. One submission per parent per school. Show parent's own previous rating for edit. |
| Loop 2 (Government) | Government portal | Government rating form on SchoolDetail page (Sprint 2+): 5 gov indicator sliders + mandatory comment. Display both parent aggregate and government aggregate separately. Filter ratings by region scope from CP-021. |

#### Current backend state

- `SchoolRating` model exists (`backend/models/SchoolRating.js`): `schoolId`, `parentId`, `stars`, `numericRating`, `evaluation` (JSONB, generic), `comment` (nullable)
- `GET /government/ratings` and `GET /government/ratings/:schoolId` exist and return parent-only aggregates
- No `GovernmentSchoolRating` model exists — government-direction ratings are entirely new
- The existing `evaluation` JSONB field is the predecessor to the 5-indicator structure; it will be superseded (not migrated — old data kept as-is, new submissions use indicator columns)

---

### CP-021 — Region/hierarchy authorization model

**Status:** PLANNED-NOT-BUILT  
**Depends on:** Nothing — this is the foundation  
**Captured:** 2026-05-21 (Government S7 Sprint 1 close-out)  
**Full design:** Separate design deliverable (next step after this spec capture)

#### Purpose

All government queries, ratings, messages, and directory pages must scope to either:
- **Region level:** a government account assigned to a single region sees only schools in that region
- **Republic level:** a government account with no region restriction sees all schools across Uzbekistan

Without this model, every government endpoint is either under-scoped (no region filtering) or over-scoped (no authorization boundary). CP-020 and CP-022 both depend on region data for routing.

#### What the region model must define

(Detail lives in the region design deliverable — this entry is a forward reference only)

- Region entity: `id`, `name` (uz/ru/en), `code`
- School → Region foreign key (`schools.regionId`)
- Government user → Region assignment (`users.regionId`, nullable — null = republic)
- `requireRegionScope` middleware: for region accounts, automatically adds `regionId` filter to school lookups
- Authoritative region list: provided by product owner (see PL-015)

#### Consumers of CP-021 (every item below is blocked until CP-021 lands)

| CP | Consumer |
|---|---|
| CP-020 | Region-aware rating aggregation |
| CP-022 | Region-level message routing |
| Government portal | School directory, Ratings page, Audit Log scope |
| All portals | `requireSchoolScope` middleware may need to join region table |

---

### CP-022 — Parent message routing & escalation

**Status:** PLANNED-NOT-BUILT  
**Depends on:** CP-021 (region model — required to route region-level messages to the right account)  
**Captured:** 2026-05-21 (Government S7 Sprint 1 close-out)

#### Current state (verified 2026-05-21)

- `GovernmentMessage` model (`backend/models/GovernmentMessage.js`): `senderId`, `subject`, `message`, `isRead`, `readAt`, `reply`, `repliedAt`, `parentMessageId` (threading)
- `POST /api/government/messages` (via `governmentMessageController.sendMessage`): accepts message from ANY authenticated user (parent, teacher, admin, reception) — no role restriction and no recipient level
- All messages land in a single government inbox — there is **no routing concept** (owner | region | republic) today
- `parentMessageController.getMyMessages`: returns all messages by `senderId = req.user.id`
- Teacher portal: `MessagesModal.jsx` and `MessagesModal.jsx` exist in both parent and teacher subtrees — **current functionality unverified** — the teacher portal loop (Loop 5) must audit whether send/receive works end-to-end before building CP-022 on top of it

#### What CP-022 adds

**`GovernmentMessage` model changes (backend):**

New field: `recipientLevel` — enum: `owner` | `region` | `republic`  
- `owner` — routes to the school's admin/owner inbox (within-school escalation, not to a government account)  
- `region` — routes to the government account assigned to the sender's school's region (requires CP-021)  
- `republic` — routes to any republic-level government account

New field: `escalatedFromId` (UUID, nullable, self-referential FK) — when a parent escalates an existing message, the new record points back to the original. Enables escalation chain visibility.

**Send endpoint changes:**

`POST /api/government/messages` must be restricted to `role === 'parent'` for CP-022 routing to be safe. Other roles (teacher, admin) sending to government is a separate use case — do NOT silently remove other-role send access during CP-022 implementation; document the decision.

Request body additions:
```json
{
  "subject": "...",
  "message": "...",
  "recipientLevel": "owner | region | republic",
  "escalatedFromId": "<optional UUID of prior message being escalated>"
}
```

**Routing logic (depends on CP-021):**
- `owner` → deliver to school admin inbox (use existing admin message channel, or a new owner-specific channel — TBD during backend loop)
- `region` → look up `schools.regionId` for sender's school → find the government account with that `regionId` → store on that account's inbox filter
- `republic` → lands in the republic-level government inbox (government accounts with `regionId = null`)

The inbox filter (`GET /government/messages`) must accept a `level` param and scope to the authenticated government account's region (from CP-021).

**Escalation flow:**

1. Parent sends to `owner` (school admin) — message `escalatedFromId = null`
2. If unresolved, parent re-sends same issue to `region` — new `GovernmentMessage` with `escalatedFromId = <step 1 id>`
3. If still unresolved, parent escalates to `republic` — new record with `escalatedFromId = <step 2 id>`

Government inbox shows escalation chain. UI shows "Escalated from owner → region" breadcrumb.

**Reporting:** a parent reporting a concern vs. escalating is distinguished by `recipientLevel`. A `republic`-level message with a prior `escalatedFromId` chain is a full escalation. Display separately in government inbox with "⚠️ Escalated" badge.

#### What each portal loop builds

| Loop | Portal | Work |
|---|---|---|
| Backend | Backend | Add `recipientLevel` + `escalatedFromId` to `GovernmentMessage` (migration). Update send endpoint (recipient level validation, routing logic post-CP-021). Update GET messages (filter by authenticated account's region scope). |
| Loop 5 (Teacher) | Teacher portal (parent UI) | `MessagesModal.jsx`: audit current state first. Add `recipientLevel` selector (owner / region / republic) with explanatory copy. Add optional "Escalate from prior message" linking. Show sent message history with level badge. |
| Loop 2 (Government) | Government portal | Messages inbox: filter/tab by level (owner / region / republic). Show escalation chain on each message thread. "Escalated" badge for messages with `escalatedFromId`. |

---

## Usage

When a portal audit begins, check this file for any CP items involving that portal. Add new rows here whenever a Backend (or other portal) audit identifies a cross-portal blocker.
