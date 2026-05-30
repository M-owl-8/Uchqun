# PROD-READINESS-02 — Seed Dependency-Correct Test Accounts

**Date:** 2026-05-30  
**Status:** ✅ COMPLETE  
**Environment:** RAILWAY only  
**Credentials file:** `credentials.md` (repo root)

---

## Pre-Flight Findings (from previous session)

| Fact | Value |
|---|---|
| Railway DB state (post-wipe) | users=0, children=0, schools=2 (stale), groups=3 (zombie) |
| Stale schools | `4ffc18f4` "Uchqun Demo Maktabi", `661d2411` "Uchqun School" — 0 owned data |
| Zombie groups | 3 rows with `teacherId=NULL` — 0 children |
| Region UUIDs | Region 01 (`00000000-0000-0000-0000-000000000001`) = Toshkent |
|               | Region 02 (`00000000-0000-0000-0000-000000000002`) = Samarqand |
| Password hashing | bcrypt 10 rounds via `User.beforeCreate` hook — **not** Argon2id |
| isTeacherAssignedToChild | Modern path: `child.groupId → group.teacherId` (sufficient) |

---

## BEFORE Snapshot

| Table | Count |
|---|---|
| users | 0 |
| children | 0 |
| schools | 2 (stale) |
| groups | 3 (zombie, `teacherId=NULL`) |
| regions | 13 |
| assessment_criteria | 17 |
| SequelizeMeta | 85 |

---

## Execution

### Pre-seed cleanup (inside transaction)

```sql
DELETE FROM groups WHERE id IN (
  '434b1d31-6c5c-4514-b9d2-c6eb29891f27',  -- 1-guruh
  '0b00f154-0d2e-4449-a7c6-d4420d62f866',  -- 2-guruh
  '2f6e4aa0-4703-41af-b932-ad9a6e312bc4'   -- Demo Guruh 1
);
-- Result: DELETE 3

DELETE FROM schools WHERE id IN (
  '4ffc18f4-12a5-4687-9d08-c27d938909f7',  -- Uchqun Demo Maktabi
  '661d2411-b1ea-4d8e-8a93-d0374780476a'   -- Uchqun School
);
-- Result: DELETE 2
```

### Seed transaction output

```
BEGIN
DELETE 3
DELETE 2
INSERT 0 4   -- schools
INSERT 0 3   -- government users
INSERT 0 7   -- school 1 users
INSERT 0 7   -- school 2 users
INSERT 0 7   -- school 3 users
INSERT 0 7   -- school 4 users
INSERT 0 8   -- groups
INSERT 0 3   -- school 1 children
INSERT 0 3   -- school 2 children
INSERT 0 3   -- school 3 children
INSERT 0 3   -- school 4 children
COMMIT
```

Full seed SQL: `audits/prod-readiness/seed-02.sql`

---

## AFTER Snapshot + Verification

### Row counts

| Table | AFTER | Expected |
|---|---|---|
| schools | **4** | 4 ✓ |
| users | **31** | 31 ✓ |
| groups | **8** | 8 ✓ |
| children | **12** | 12 ✓ |
| regions | 13 | unchanged ✓ |
| assessment_criteria | 17 | unchanged ✓ |
| SequelizeMeta | 85 | unchanged ✓ |

### Users by role

| Role | Count |
|---|---|
| government | 3 |
| admin | 4 |
| reception | 4 |
| teacher | 8 |
| parent | 12 |
| **TOTAL** | **31** |

### School → Region wiring (JOIN verified)

| School | Region |
|---|---|
| Toshkent Maxsus Maktab 1 | Region 01 |
| Toshkent Maxsus Maktab 2 | Region 01 |
| Samarqand Maxsus Maktab 1 | Region 02 |
| Samarqand Maxsus Maktab 2 | Region 02 |

### Group → Teacher wiring (JOIN verified)

| Group | Teacher | School |
|---|---|---|
| A-guruh | Malika Yunusova | Toshkent Maxsus Maktab 1 |
| B-guruh | Nodir Ismoilov | Toshkent Maxsus Maktab 1 |
| A-guruh | Feruza Qosimova | Toshkent Maxsus Maktab 2 |
| B-guruh | Doniyor Xoliqov | Toshkent Maxsus Maktab 2 |
| A-guruh | Shahnoza Ergasheva | Samarqand Maxsus Maktab 1 |
| B-guruh | Erkin Nazarov | Samarqand Maxsus Maktab 1 |
| A-guruh | Maftuna Aliyeva | Samarqand Maxsus Maktab 2 |
| B-guruh | Akmal Pulatov | Samarqand Maxsus Maktab 2 |

### Child → Parent → Group → Teacher chain (JOIN verified, 12/12 rows)

All 12 children have a complete chain:
`child.groupId → group.teacherId → teacher` ✓  
`child.parentId → parent` ✓  
`child.schoolId = group.schoolId` ✓

Per-school layout (3 children per school):
- Children 1+2 → A-guruh → teacher1
- Child 3 → B-guruh → teacher2

### HTTP login smoke test (Railway)

| Role | Email | HTTP |
|---|---|---|
| government | gov.republic@uchqun.uz | **200** ✓ |
| admin | admin1@uchqun.uz | **200** ✓ |
| reception | reception1@uchqun.uz | **200** ✓ |
| teacher | teacher1@uchqun.uz | **200** ✓ |
| parent | parent1@uchqun.uz | **200** ✓ |

All roles return `success: true` with correct role in response body.

---

## Summary

| Item | Result |
|---|---|
| Pre-seed cleanup (3 groups + 2 schools deleted) | ✅ |
| 4 schools created with correct regionId FK | ✅ |
| 31 users created (3 gov + 28 school) | ✅ |
| 8 groups created with teacherId wiring | ✅ |
| 12 children created with groupId → teacher chain | ✅ |
| HTTP login 200 for all 5 roles | ✅ |
| Reference tables unchanged (regions=13, criteria=17) | ✅ |
| credentials.md written | ✅ |

**PROD-READINESS-02 = ✅**
