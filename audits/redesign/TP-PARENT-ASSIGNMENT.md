# TP-PARENT-ASSIGNMENT — Teacher ↔ Parent Assignment Chain

**Status:** 🟡 In progress (STEP 1 complete, STEP 2 query plan ready, STEP 3 awaiting DB evidence)
**Reported symptom:** Teacher Zulfiya Nazarova's group has 3 children (Lola Q., Bobur S., Shahlo T.); `/teacher/parents` and `/teacher/chat` both show only 1 parent — Hulkar Sobirova (Bobur's mother). Lola's and Shahlo's parents are absent from BOTH lists.
**Scope:** map the assignment chain end-to-end, classify the root cause from real production data, unify scoping across the parent-list + chat surfaces.
**Constraint this session:** the `postgres-uchqun` MCP server is not connected in this Claude session, so the STEP 2 production queries cannot be run from here. STEP 2 is therefore presented as a precise query plan (paste-ready SQL) that the user (or any session with the MCP attached) can execute. **No code fix is applied until STEP 2 evidence is in** — the brief is explicit: "Negative claims proven by query/read, never asserted."

---

## STEP 1 — Map the assignment chain

### 1.1 Schema (the four columns that matter)

| Link | Table.column | Type | Nullable | FK → | Source |
|---|---|---|---|---|---|
| **Teacher → Group** | `groups.teacherId` | UUID | **NOT NULL** | `users.id` | `backend/models/Group.js:18-24` |
| **Group → Child** | `children.groupId` | UUID | nullable | `groups.id` | `backend/models/Child.js:63-70` |
| **Child → Parent** | `children.parentId` | UUID | **NOT NULL**, `onDelete: CASCADE` | `users.id` | `backend/models/Child.js:10-18` |
| **Parent (denorm) → Group** | `users.groupId` | UUID | nullable | `groups.id` | `backend/models/User.js:86-93` |
| **Parent (denorm) → Teacher** | `users.teacherId` | UUID | nullable | `users.id` | `backend/models/User.js:78-85` |

**Important properties:**
- The link is **strictly 1:N (parent → many children, child → exactly one parent)**. No `parent_children` / `child_parents` join table exists in the codebase (grep negative). A child has **one** parent User row; second-parent info is stored as text fields on the Child row itself (`children.fatherFullName`, `children.fatherDOB`, `children.fatherOccupation`, `children.motherFullName`, `children.motherDOB`, `children.motherOccupation` — `Child.js:79-102`).
- `children.parentId` is `NOT NULL` → **every child row must point to an existing User**.
- `users.groupId` and `users.teacherId` are **denormalized** on parent rows — they duplicate what's already derivable via `Child.parentId → Child.groupId → Group.teacherId`. Either path can be authoritative; the codebase uses both inconsistently (see 1.4).

Canonical associations in `backend/models/index.js`:
```js
// 170-175
User.belongsTo(User,  { foreignKey: 'teacherId', as: 'assignedTeacher' });
User.hasMany(User,    { foreignKey: 'teacherId', as: 'assignedParents' });
User.belongsTo(Group, { foreignKey: 'groupId',   as: 'group' });
Group.hasMany(User,   { foreignKey: 'groupId',   as: 'parents' });

// 182-183
User.hasMany(Child,   { foreignKey: 'parentId',  as: 'children' });
Child.belongsTo(User, { foreignKey: 'parentId',  as: 'parent' });

// 204-211
Child.belongsTo(Group, { foreignKey: 'groupId',  as: 'childGroup' });
Group.hasMany(Child,   { foreignKey: 'groupId',  as: 'groupChildren' });
Group.belongsTo(User,  { foreignKey: 'teacherId', as: 'teacher' });
User.hasMany(Group,    { foreignKey: 'teacherId', as: 'groups' });
```

### 1.2 `/teacher/parents` query — the **denormalized** chain

`backend/controllers/teacherController.js:116-169`:
```js
export const getParents = async (req, res) => {
  const where = { role: 'parent' };
  if (req.user.role === 'teacher') {
    const teacherGroups = await Group.findAll({ where: { teacherId: req.user.id }, attributes: ['id'] });
    const groupIds = teacherGroups.map(g => g.id);
    if (groupIds.length > 0) {
      where[Op.or] = [{ groupId: { [Op.in]: groupIds } }, { teacherId: req.user.id }];
    } else {
      where.teacherId = req.user.id;
    }
  }
  // ...
  const { count, rows: parents } = await User.findAndCountAll({ where, include: [{ model: Child, as: 'children', ... }, { model: Group, as: 'group', ... }], ... });
};
```

**What it actually queries:** rows in the `users` table where
```
role = 'parent' AND ( users.groupId IN <teacher's groupIds> OR users.teacherId = <teacher.id> )
```

This is the **denormalized chain**. It depends entirely on whether the parent User's `groupId`/`teacherId` columns were set when the account was created or edited. It does NOT consult `children.parentId` or `children.groupId` at all (those fields are only used inside the `include` to enrich the response, not to filter it).

### 1.3 Chat scoping — the **canonical** chain

`backend/controllers/chatController.js` has two parallel functions for "which conversations can this teacher see":

#### `canAccessConversation` (used by message read/send/edit/delete) — lines 10-46:
```js
if (req.user.role === 'teacher') {
  const groups = await Group.findAll({ where: { teacherId: req.user.id }, attributes: ['id'] });
  const groupIds = groups.map((g) => g.id);
  if (groupIds.length === 0) return false;
  const childCount = await Child.count({ where: { parentId, groupId: { [Op.in]: groupIds } } });
  return childCount > 0;
}
```

#### `getAccessibleConversationIds` (used by `listConversations` and `getUnreadCount`) — lines 202-244:
```js
// teacher: derive from children in groups they own (Child has no teacherId
// column — link goes Group.teacherId -> Group -> Child.groupId)
if (req.user.role === 'teacher') {
  const groups = await Group.findAll({ attributes: ['id'], where: { teacherId: req.user.id }, raw: true });
  const groupIds = groups.map((g) => g.id);
  if (groupIds.length === 0) return [];
  where = { groupId: { [Op.in]: groupIds } };
}
const children = await Child.findAll({ attributes: ['parentId'], where, group: ['parentId'], raw: true });
const ids = children.map((c) => `parent:${c.parentId}`);
```

**What it queries:** distinct `parentId` values from
```
children rows where children.groupId IN <teacher's groupIds>
```

This is the **canonical chain** (Teacher → Group.teacherId → Child.groupId → Child.parentId). It does NOT consult `users.groupId` or `users.teacherId` at all.

### 1.4 The two chains are NOT unified — single source of truth violated

| Surface | Scoping path used |
|---|---|
| `GET /teacher/parents` (`teacherController.js:116`) | `users.groupId IN ... OR users.teacherId = ...` — denormalized chain |
| `GET /chat/conversations` (`chatController.js:270` → `getAccessibleConversationIds:202`) | `children.groupId IN ...` then project `children.parentId` — canonical chain |
| `canAccessConversation` for send/edit/delete (`chatController.js:10`) | `children.parentId` AND `children.groupId IN ...` — canonical chain |

**This means a parent can appear in `/teacher/parents` but be unreachable in chat, or vice versa**, depending on which columns happen to be populated for their User and Child rows. The brief's "single source of truth" requirement is violated. See STEP 3 unification proposal below.

For context, the other parent-list surfaces use yet different scoping paths:

| Surface | Scoping path |
|---|---|
| `GET /reception/parents` (`receptionParentController.js:165-182`) | `users.schoolId = req.user.schoolId` |
| `GET /admin/parents` (`admin/adminParentController.js:22`) | `users.createdBy IN <receptions created by this admin>` |
| `GET /government/parents` (`governmentRoutes.js:76`) | `requireGovAccess('canViewParents')` — separate path |

### 1.5 Platform rule (proposed canonical form)

> **A parent appears for a teacher ⟺ ∃ a child row with `children.parentId = parent.id` AND `children.groupId ∈ {groups where groups.teacherId = teacher.id}`.**
>
> Multi-child parents appear once (distinct on `parent.id`), with `children` joined as an array.
>
> A parent whose children are spread across two teachers' groups appears for both teachers (because each teacher's groupIds match a subset of that parent's children).
>
> Stale `users.groupId` / `users.teacherId` columns must NOT be authoritative — they are a denormalized cache at best. Either backfill them from the canonical chain and never use them for scoping, or drop them entirely.

### 1.6 Link-creation flows (where the link is supposed to be created)

| Flow | File:line | Sets `children.parentId` | Sets `children.groupId` | Sets `users.teacherId` (parent) | Sets `users.groupId` (parent) |
|---|---|---|---|---|---|
| Reception `POST /reception/parents` (`createParent`) | `receptionParentController.js:38-163` | ✅ required (line 138) | ❌ **`groupId: null`** (line 143 — explicitly null) | conditional: from `teacherId` arg or derived from `groupId` arg's group | conditional: from `groupId` arg |
| Admin bulk import (T1-7b `processImport`) | `admin/adminImportController.js:175-264` | ✅ required (CSV `parentEmail` → lookup) | ❌ not set (no group column in CSV) | ❌ not set | ❌ not set |
| Demo seed `create-demo-accounts.js` | `backend/scripts/create-demo-accounts.js:80-124` | ✅ (line 104, 138) | ✅ (line 115 — sets to group.id) | ❌ not set | ✅ (line 93) |

**Smoking gun in reception's `createParent`** (the most likely production-active flow): the child is created with **`groupId: null`** explicitly (`receptionParentController.js:143`). So **every child created via this flow is born detached from any group** even when the parent IS being assigned to a group in the same request. That breaks the canonical chain immediately:
- Chat (canonical) cannot find this child via `Child.groupId IN ...` (groupId is null) → parent never surfaces.
- `/teacher/parents` (denormalized) MIGHT still find the parent if `users.groupId` got set on the parent in the same transaction.

This explains why a single parent can appear in `/teacher/parents` (via denormalized `users.groupId`) but be unreachable in chat (because none of their children have a non-null `groupId`).

For Hulkar to appear in BOTH surfaces, EITHER:
- (i) Hulkar+Bobur were not created via reception's `createParent` (they might be demo-seeded — the seed correctly sets `child.groupId`), OR
- (ii) Bobur's `groupId` was patched in via a separate flow after creation (admin/reception group-assignment endpoint).

For Lola and Shahlo's parents to appear in NEITHER:
- Either their parent User rows don't have `users.groupId`/`users.teacherId` set AND their children don't have `groupId` set (both chains broken), OR
- Their parent User rows don't exist (impossible — `Child.parentId` NOT NULL means a referenced User must exist, FK enforced).

---

## STEP 2 — Locate the gap (production-DB query plan)

**Why this is a plan, not results:** the `postgres-uchqun` MCP that CLAUDE.md mentions as configured is not connected in this Claude session (verified via `ToolSearch` — zero matches for postgres tools). I will not assert "no link exists" / "no flow creates it" without DB evidence per the brief's rule. Run these queries (read-only) in production:

### 2.1 Resolve identifiers (run first to plug into 2.2–2.5)

```sql
-- Zulfiya's teacher.id and group.id
SELECT u.id AS teacher_id, u."firstName", u."lastName", u."schoolId"
FROM users u
WHERE u.role = 'teacher'
  AND lower(u."firstName") = 'zulfiya'
  AND lower(u."lastName")  = 'nazarova';

-- Zulfiya's groups (expect ≥ 1)
SELECT g.id AS group_id, g.name, g."teacherId", g."schoolId"
FROM groups g
WHERE g."teacherId" = '<ZULFIYA_TEACHER_ID>';
```

### 2.2 The 3 children — do `groupId` and `parentId` point where expected?

```sql
SELECT c.id, c."firstName", c."lastName",
       c."parentId", c."groupId", c."schoolId",
       c.class, c.teacher,            -- legacy STRING fields (BACKEND-019 / PL-010)
       c."createdAt", c."deletedAt"
FROM children c
WHERE c."schoolId" = '<ZULFIYA_SCHOOL_ID>'
  AND (lower(c."lastName") IN ('q.', 'qodirov', 'qodirova', 's.', 'sobirov', 'sobirova', 't.')
       OR lower(c."firstName") IN ('lola','bobur','shahlo'));
```

**Decision points:**
- If `children.groupId IS NULL` for Lola/Shahlo but `= <ZULFIYA_GROUP_ID>` for Bobur → confirms the chat-side break (canonical chain broken for 2 of 3 children).
- If `children.parentId IS NULL` for any row → schema violation (impossible: NOT NULL); flag DB corruption.
- If `children.deletedAt IS NOT NULL` → soft-deleted; the chat/parent-list queries hide them by default.

### 2.3 The parent User rows — do they exist? Are denormalized fields populated?

```sql
SELECT u.id, u.email, u."firstName", u."lastName", u.role,
       u."schoolId", u."groupId", u."teacherId", u."createdBy",
       u."isActive", u.status, u."createdAt", u."deletedAt"
FROM users u
WHERE u.id IN (
  SELECT DISTINCT c."parentId"
  FROM children c
  WHERE c."schoolId" = '<ZULFIYA_SCHOOL_ID>'
    AND c.id IN ('<LOLA_ID>', '<BOBUR_ID>', '<SHAHLO_ID>')
);
```

**Decision points:**
- All three rows present and `role='parent'` → no missing-account problem (Hypothesis A ruled out).
- Compare `users.groupId` and `users.teacherId`: for which of the 3 parents are these set to Zulfiya's group/teacher.id? Almost certainly only Hulkar's are set — that's the denormalized-chain explanation for `/teacher/parents`'s output.

### 2.4 Reproduce both surfaces' queries verbatim

```sql
-- /teacher/parents teacher path (teacherController.js:116-169)
SELECT u.id, u.email, u."firstName", u."lastName", u."groupId", u."teacherId"
FROM users u
WHERE u.role = 'parent'
  AND u."deletedAt" IS NULL                     -- paranoid: true on User
  AND ( u."groupId" IN (SELECT g.id FROM groups g WHERE g."teacherId" = '<ZULFIYA_TEACHER_ID>')
        OR u."teacherId" = '<ZULFIYA_TEACHER_ID>' )
ORDER BY u."createdAt" DESC;

-- chat getAccessibleConversationIds teacher path (chatController.js:202-244)
SELECT DISTINCT c."parentId"
FROM children c
WHERE c."deletedAt" IS NULL                     -- paranoid: true on Child
  AND c."groupId" IN (SELECT g.id FROM groups g WHERE g."teacherId" = '<ZULFIYA_TEACHER_ID>');
```

**Expected outcome:** the first query returns Hulkar only; the second returns Bobur's `parentId` (= Hulkar) only. If results differ from this, the classification might be (c) QUERY rather than (a)/(b) DATA.

### 2.5 Classification matrix

Run 2.1–2.4, then read this matrix:

| Result in 2.2 | Result in 2.3 | Classification | Fix |
|---|---|---|---|
| Lola.groupId = Zulfiya's group AND Shahlo.groupId = Zulfiya's group | All 3 parent rows present, with denormalized fields set | **(c) QUERY** — both chains have data, the queries are dropping it (paranoid filter? soft-delete? bad join?) | Fix the dropping query; add regression test |
| Lola.groupId / Shahlo.groupId NULL or wrong; their parents have `users.groupId` set correctly | All 3 parent rows present, only Hulkar has denormalized fields set | **(b) DATA — partial link** (Children unassigned to groups; parent denormalized fields unset) | Data backfill + flow fix |
| Lola.groupId / Shahlo.groupId NULL **AND** their parents' `users.groupId`/`teacherId` NULL | Parent rows exist but unassigned anywhere | **(a) DATA — never linked to a group** | Backfill via the proper reception flow; close the flow gap |
| Lola.parentId / Shahlo.parentId points to a non-existent or soft-deleted user | (corresponding rows missing or `deletedAt IS NOT NULL`) | **(b) DATA — broken FK** (schema says impossible; investigate) | DB integrity repair |

---

## STEP 3 — Fix per classification (staged, NOT YET APPLIED)

I will not push code without STEP 2 evidence. Below is what each branch looks like; once the classification is confirmed, the matching fix is small and bounded.

### 3.1 If classification is **(c) QUERY** — fix the query

The most likely candidate is the canonical chain query (which most surfaces depend on). Patch:

```js
// backend/services/teacherParentScope.js  (NEW — single source of truth)
import Child from '../models/Child.js';
import Group from '../models/Group.js';
import User from '../models/User.js';
import { Op } from 'sequelize';

/**
 * The canonical "parents assigned to this teacher" set.
 * A parent is assigned to a teacher iff they have ≥ 1 active child whose
 * groupId belongs to one of the teacher's groups. Returns distinct parent
 * User rows with their children included.
 */
export async function listTeacherParents(teacherId, { search, limit = 100, offset = 0 } = {}) {
  const groups = await Group.findAll({ where: { teacherId }, attributes: ['id'], raw: true });
  const groupIds = groups.map(g => g.id);
  if (groupIds.length === 0) return { rows: [], count: 0 };

  // Step 1: parentIds from children in those groups
  const childRows = await Child.findAll({
    where: { groupId: { [Op.in]: groupIds } },
    attributes: ['parentId'],
    group: ['parentId'],
    raw: true,
  });
  const parentIds = childRows.map(r => r.parentId);
  if (parentIds.length === 0) return { rows: [], count: 0 };

  // Step 2: hydrate parent Users (with their children + group) — single source of truth
  const where = { id: { [Op.in]: parentIds }, role: 'parent' };
  if (search) { /* same iLike OR block as today */ }

  const { rows, count } = await User.findAndCountAll({
    where,
    attributes: { exclude: ['password'] },
    include: [
      { model: Child, as: 'children', where: { groupId: { [Op.in]: groupIds } }, required: false, attributes: ['id','firstName','lastName','dateOfBirth','gender','disabilityType','groupId'] },
      { model: Group, as: 'group', attributes: ['id','name'], required: false },
    ],
    order: [['createdAt', 'DESC']],
    limit, offset, distinct: true,
  });
  return { rows, count };
}
```

Then both surfaces consume it:
- `teacherController.getParents` calls `listTeacherParents(req.user.id, req.query)`.
- `chatController.getAccessibleConversationIds` for teachers returns `(await listTeacherParents(req.user.id)).rows.map(p => 'parent:' + p.id)`.
- `chatController.canAccessConversation` for teachers checks `parentIds.includes(parentId)` against the same helper.

Regression test (Jest, `backend/__tests__/services/teacherParentScope.test.js`):
- Teacher T1 has Group G1.
- 3 children: C1 (parent P1, groupId=G1), C2 (parent P2, groupId=G1), C3 (parent P1, groupId=G1).
- 1 unrelated child C4 (parent P3, groupId=G_OTHER).
- `listTeacherParents(T1)` returns DISTINCT [P1, P2] with P1.children=[C1, C3] and P2.children=[C2]. P3 is excluded.
- Negative case: T2 (different teacher) receives [].

### 3.2 If classification is **(b)/(a) DATA + flow gap** — backfill + flow repair

**Flow fix (the cause):** in `backend/controllers/receptionParentController.js:38-163`, when both `groupId` and a child are supplied in the request, set the child's `groupId` to the same `groupId` rather than hardcoding `groupId: null`. Concretely change line 143 from `groupId: null` to `groupId: parent.groupId || null` so child inherits the parent's group at creation. (This also closes the loop for chat scoping in one step.)

Additionally, the reception parent form likely needs to *require* a `groupId` for special-education onboarding. Tracked as part of this fix but the UI side requires its own session.

**Data backfill (one-off, idempotent migration):**
```js
// backend/migrations/20260606T000000-backfill-child-and-parent-group-linkage.js
'use strict';
module.exports = {
  async up(queryInterface) {
    // 1) For each parent User with groupId set but child.groupId NULL, copy parent.groupId → child.groupId
    await queryInterface.sequelize.query(`
      UPDATE children c
      SET    "groupId" = u."groupId", "updatedAt" = NOW()
      FROM   users u
      WHERE  c."parentId" = u.id
        AND  u.role = 'parent'
        AND  u."groupId" IS NOT NULL
        AND  c."groupId" IS NULL
        AND  c."deletedAt" IS NULL;
    `);
    // 2) For each child WITH groupId but whose parent has NULL users.groupId, copy back the other way
    await queryInterface.sequelize.query(`
      UPDATE users u
      SET    "groupId" = c."groupId", "teacherId" = g."teacherId", "updatedAt" = NOW()
      FROM   children c
      JOIN   groups   g ON g.id = c."groupId"
      WHERE  u.id = c."parentId"
        AND  u.role = 'parent'
        AND  u."groupId" IS NULL
        AND  c."groupId" IS NOT NULL
        AND  u."deletedAt" IS NULL
        AND  c."deletedAt" IS NULL;
    `);
    // Both statements are idempotent (NULL filters guarantee no row is updated twice).
  },
  async down() { /* no-op — backfill is non-destructive */ },
};
```

**Confirm deployment with a query, not the log** (Ketdik lesson):
```sql
-- after the migration runs on Railway, expect 0 rows
SELECT COUNT(*) FROM children c JOIN users u ON c."parentId"=u.id
WHERE u."groupId" IS NOT NULL AND c."groupId" IS NULL
  AND c."deletedAt" IS NULL AND u."deletedAt" IS NULL;
```

**If parents truly don't exist as User accounts** (impossible per the FK, but verify): the brief mandates re-creating them via the proper reception flow rather than raw inserts. That becomes a manual step the platform owner performs through the reception UI after this fix lands.

### 3.3 Unification (independent of classification)

Regardless of (a)/(b)/(c): introduce `services/teacherParentScope.js` per 3.1 and have BOTH `/teacher/parents` and chat surfaces call it. After this lands, deprecate (then drop) the `users.groupId`/`users.teacherId` denormalized columns as authoritative — they remain only as caches for sorting/display, never for scoping. Tracked as a follow-up clean-up after this session closes.

---

## What I'm waiting on (to apply STEP 3 here)

To progress to "STEP 3 applied, pushed to main, Railway verifying", I need one of:

1. **Re-attach `postgres-uchqun` MCP** so I can run the STEP 2 queries from this session and classify with confidence.
2. **Paste the STEP 2 query results** (2.1–2.4 against production) and I'll classify and apply the matching STEP 3 branch in the same turn.

I have intentionally not pushed any controller/migration change. Pushing a fix without STEP 2 evidence would violate the brief's "evidence not assertion" rule and risks shipping the wrong branch (e.g. backfilling data when the real bug is a query, or vice versa).

---

## Appendix — corroborated negative claims so far

| Claim | Method | Verdict |
|---|---|---|
| "No `parent_children` / `child_parents` / `ChildParent` / `ParentChild` join table exists." | `grep -rln 'parent_children\|child_parents\|ChildParent\|ParentChild\|belongsToMany' backend/models` → empty | ✅ verified |
| "Parent has no attendance surface" (relevance: same broken linkage affects PP-ATTENDANCE-SURFACE downstream) | grep over `teacher/src/parent` for `attendance`/`davomat` returned 0 hits (PP-AUDIT B.3) | ✅ verified |
| "`/teacher/parents` and chat use different scoping paths" | Side-by-side reads of `teacherController.js:126-132` vs `chatController.js:222-241` | ✅ verified — see 1.2 vs 1.3 |
| "Reception `createParent` writes `groupId: null` on the child" | Read `receptionParentController.js:143` | ✅ verified |
