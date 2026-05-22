# Admin Portal — S7 Phase 1 Backend Sub-Sprint Execution

**Date:** 2026-05-22  
**Branch:** main  
**Baseline test count (before sprint):** 106 suites / 1142 tests  
**Final test count:** 111 suites / 1179 tests (+5 suites / +37 tests)  
**Lint:** 0 warnings / 0 errors  
**verify-i18n.js:** 132 catalog codes — PASSED (all 3 lang files match)

---

## 1. Per-Commit Summary

| # | SHA | Title | Tests added |
|---|---|---|---|
| 1 | `687d38c` | fix(backend): close cross-school chat leak — admin conversation access scoped to own school | +8 (chatAdminScope.test.js) |
| 2 | `ff331eb` | feat(backend): admin school-scoped audit feed + reception-action audit logging | +7 (adminAuditController.test.js) |
| 3 | `cc8c3c6` | feat(backend): admin school profile view + whitelisted contact-field edit (GET+PATCH /admin/school) | +6 (adminSchoolController.test.js) |
| 4 | `e00b59d` | feat(backend): admin teacher detail endpoint — profile + groups (view-only, school-scoped via createdBy chain) | +4 (adminTeacherDetail.test.js) |
| 5 | `4f335b7` | feat(backend): admin list soft-deleted entities for trash/restore UI (school-scoped) | +6 (adminSoftDeleteList.test.js) |
| fix | `564ae63` | fix(backend): update i18n count to 132 and guard req.query access for include_deleted | 0 (count fix + optional chaining) |

---

## 2. BE-3 Revert-Test Evidence — Chat Leak Closed

### Listing leak (`getAccessibleConversationIds`)

**OLD code (line 200–208 of chatController.js before fix):**
```js
if (req.user.role === 'admin') {
  const rows = await ChatMessage.findAll({
    attributes: ['conversationId'],
    group: ['conversationId'],
    raw: true,
    ...(prefix && { where: { conversationId: { [Op.like]: `${prefix}%` } } }),
  });
  return rows.map((r) => r.conversationId);
}
```
No school filter — all `conversationId` values across all schools returned.

**Revert-test evidence (chatAdminScope.test.js):**
- `[REVERT-TEST BUG] old ChatMessage.findAll approach would return cross-school conversations` — simulates old behavior, confirms `parent:PARENT_B1` (school B) appears in the result.
- `[REVERT-TEST FIXED] with fix, admin A does not receive school B parent conversations` — `Child.findAll({ where: { schoolId: SCHOOL_A } })` is called; result contains only `parent:PARENT_A1` and `parent:PARENT_A2`; `parent:PARENT_B1` is absent.

**Fix (chatController.js):**
```js
if (req.user.role === 'admin') {
  const children = await Child.findAll({
    where: { schoolId: req.user.schoolId },
    attributes: ['parentId'],
    raw: true,
  });
  const parentIds = [...new Set(children.map(c => c.parentId).filter(Boolean))];
  const ids = parentIds.map(id => `parent:${id}`);
  return prefix ? ids.filter(id => id.startsWith(prefix)) : ids;
}
```

---

### Direct access leak (`canAccessConversation`)

**OLD code (line 13–14 of chatController.js before fix):**
```js
// Admin can access all conversations
if (req.user.role === 'admin') return true;
```
Unconditional — any admin could call `GET /api/chat/messages?conversationId=parent:PARENT_B1` and receive 200.

**Revert-test evidence (chatAdminScope.test.js):**
- `[REVERT-TEST BUG] old unconditional return-true allowed cross-school direct access` — `buggyCanAccess(adminAReq, 'parent:PARENT_B1')` resolves to `true`.
- `[REVERT-TEST FIXED] with fix, admin A gets 403 for school B conversation` — `Child.findOne({ where: { parentId: PARENT_B1, schoolId: SCHOOL_A } })` returns null → `false` → `listMessages` returns 403.

**Fix (chatController.js):**
```js
if (req.user.role === 'admin') {
  const parentId = conversationId.replace('parent:', '');
  if (!parentId) return false;
  const child = await Child.findOne({
    where: { parentId, schoolId: req.user.schoolId },
    attributes: ['id'],
  });
  return !!child;
}
```

---

## 3. Other Revert-Tests

### Audit feed isolation (`adminAuditController.test.js`)
- `[REVERT-TEST] admin A query has schoolId=SCHOOL_A, not SCHOOL_B` — verifies `where.schoolId = req.user.schoolId` is always set in the DB query. Admin A's query uses `SCHOOL_A`; admin B's query uses `SCHOOL_B`. Cross-school entries are not returned because the DB WHERE clause contains the caller's schoolId.

### School profile isolation (`adminSchoolController.test.js`)
- `[REVERT-TEST isolation] admin with wrong schoolId (null/missing) → 404` — endpoint always uses `req.user.schoolId`; there is no `:id` URL param. If `School.findByPk(schoolId)` returns null (e.g., wrong/missing schoolId), the response is 404 — not another school's data.

### School profile whitelist enforcement (`adminSchoolController.test.js`)
- `[REVERT-TEST whitelist] name, isActive, regionId in body are NOT applied` — body contains `{ name: 'HACKED NAME', isActive: false, regionId: 'region-hacked', phone: '555' }`. Test asserts `school.update()` was called WITHOUT name/isActive/regionId and WITH phone. The `OWNER_EDITABLE_FIELDS` array `['phone', 'email', 'address', 'description', 'director']` is the security boundary.

### Teacher isolation (`adminTeacherDetail.test.js`)
- `[REVERT-TEST isolation] teacher not in admin reception chain → 404` — `TEACHER_ID_B` (cross-school teacher) is looked up with `createdBy: { [Op.in]: [RECEPTION_ID] }` where RECEPTION_ID belongs to school A. `findOne` returns null → 404. Without the `createdBy` chain check, an admin could guess teacher UUIDs across schools.

### Deleted-list isolation (`adminSoftDeleteList.test.js`)
- `[REVERT-TEST isolation] include_deleted=true still scoped to own receptions` — `?include_deleted=true` path still uses `createdBy: { [Op.in]: receptionIds }`. The receptionIds list is derived from admin's own ID, so soft-deleted parents from school B's reception chain are not accessible.

---

## 4. Reception logAudit Additions Confirmed

All 6 operations in `backend/controllers/admin/adminReceptionController.js` now call `logAudit` before the mutation:

| Operation | Action | Entity | Location (approx line after edits) | logAudit position |
|---|---|---|---|---|
| approveDocument | `approve` | `documents` | Before `document.status = 'approved'` | Before save |
| rejectDocument | `reject` | `documents` | Before `document.status = 'rejected'` | Before save |
| activateReception | `activate` | `receptions` | Before `reception.isActive = true` | Before save |
| deactivateReception | `deactivate` | `receptions` | Before `reception.isActive = false` | Before save |
| createReception | `create` | `receptions` | Before `User.create(...)` | Before create |
| deleteReception | `delete` | `receptions` | Before `reception.destroy(...)` | Before destroy |

All use pattern:
```js
logAudit({
  actorId: req.user.id,
  actorRole: req.user.role,
  action: '<action>',
  entity: '<entity>',
  entityId: <record.id or null for create>,
  schoolId: req.user.schoolId,
  meta: { /* context */ },
});
```

---

## 5. Final State

| Metric | Value |
|---|---|
| Test suites | 111 passed, 111 total |
| Tests | 1179 passed, 1179 total |
| ESLint | 0 warnings, 0 errors |
| verify-i18n.js | PASSED — 132 codes in catalog, 132 keys in all 3 lang files |
| New i18n codes | 9 (AUDIT_LOG_FORBIDDEN, ADMIN_AUDIT_LOG_INVALID_FILTER, ADMIN_AUDIT_LOG_FETCH_FAILED, SCHOOL_FORBIDDEN, SCHOOL_FETCH_FAILED, SCHOOL_UPDATE_FAILED, TEACHER_FORBIDDEN, TEACHER_NOT_FOUND, TEACHER_FETCH_FAILED) |
| Chat security | Cross-school listing + direct access — both paths closed |

---

## 6. Backend Contracts Table — New Endpoints

For Phase 2/3 frontend to consume:

### `GET /api/admin/audit-log`

**Auth:** Admin role required.  
**Query params:** `action`, `entity`, `startDate`, `endDate`, `page` (default 1), `limit` (default 20, max 100).  
**Response 200:**
```json
{
  "success": true,
  "data": {
    "entries": [
      {
        "id": 1,
        "actorId": "uuid",
        "actorRole": "admin",
        "action": "approve",
        "entity": "documents",
        "entityId": "uuid",
        "schoolId": "uuid",
        "meta": {},
        "occurredAt": "2026-05-22T10:00:00.000Z",
        "actor": { "id": "uuid", "firstName": "A", "lastName": "B", "role": "admin" }
      }
    ],
    "total": 45,
    "page": 1,
    "limit": 20,
    "totalPages": 3
  }
}
```
**Errors:** `AUDIT_LOG_FORBIDDEN` (403), `ADMIN_AUDIT_LOG_INVALID_FILTER` (400), `ADMIN_AUDIT_LOG_FETCH_FAILED` (500).  
**Allowlisted action:entity pairs:** approve:documents, reject:documents, create:receptions, delete:receptions, activate:receptions, deactivate:receptions, suspend:users, activate:users, restore:children, restore:users, restore:observations, restore:attendance, bulk_import:children, transfer:children, update:schools.

---

### `GET /api/admin/school`

**Auth:** Admin role required.  
**Response 200:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "School Name",
    "type": "both",
    "phone": "...",
    "email": "...",
    "address": "...",
    "description": "...",
    "director": "...",
    "isActive": true,
    "regionId": "uuid",
    "categoryId": "uuid",
    "region": { "id": "uuid", "name": "...", "code": "..." },
    "category": { "id": "uuid", "name": "...", "code": "..." }
  }
}
```
**Errors:** `SCHOOL_FORBIDDEN` (403), `SCHOOL_NOT_FOUND` (404), `SCHOOL_FETCH_FAILED` (500).

---

### `PATCH /api/admin/school`

**Auth:** Admin role required.  
**Body (partial):** `{ phone, email, address, description, director }` — only these 5 fields are applied. Any other fields in body are silently ignored.  
**Response 200:** Same shape as GET.  
**Errors:** `SCHOOL_FORBIDDEN` (403), `SCHOOL_NOT_FOUND` (404), `SCHOOL_UPDATE_FAILED` (500).

---

### `GET /api/admin/teachers/:id`

**Auth:** Admin role required.  
**Response 200:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "firstName": "...",
    "lastName": "...",
    "email": "...",
    "schoolId": "uuid",
    "groups": [
      { "id": "uuid", "name": "...", "ageRange": "3-5", "capacity": 20 }
    ]
  }
}
```
**Errors:** `TEACHER_FORBIDDEN` (403), `TEACHER_NOT_FOUND` (404), `TEACHER_FETCH_FAILED` (500).  
**Note:** Teacher must be in admin's school scope (createdBy reception chain). View-only — no mutations.

---

### `GET /api/admin/parents?include_deleted=true`

**Auth:** Admin role required.  
**Query:** `include_deleted=true` returns ONLY soft-deleted parents (paranoid:false + deletedAt NOT NULL).  
**Default (no flag):** Returns only active records (unchanged behavior).  
**Response 200:**
```json
{ "success": true, "data": [ { ...parentFields } ] }
```

---

### `GET /api/admin/receptions?include_deleted=true`

**Auth:** Admin role required.  
**Query:** `include_deleted=true` returns ONLY soft-deleted receptions.  
**Default:** Returns only active records.  
**Response 200:**
```json
{ "success": true, "data": [ { ...receptionFields } ] }
```
