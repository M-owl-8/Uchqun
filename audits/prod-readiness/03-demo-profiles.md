# PROD-READINESS-03 — Shape Demo Profiles

**Date:** 2026-05-30  
**Status:** ✅ COMPLETE  
**Environment:** RAILWAY only  
**Profiles file:** `demo-profile.md` (repo root)

---

## Objective

Update the 31 test accounts (seeded in PROD-READINESS-02) with plausible Uzbek names, phone numbers, and role-appropriate profile data. Update the 12 children with full demographic profiles and varied clinical diagnoses using ПТПК-standard Uzbek Cyrillic terminology.

---

## Pre-Flight: Field Audit

| Model | Updatable fields | Excluded fields |
|---|---|---|
| `User` | `firstName`, `lastName`, `phone` | No DOB, gender, or address on User model |
| `Child` | `firstName`, `lastName`, `dateOfBirth`, `gender`, `disabilityType`, `medicalDiagnosis`, `specialNeeds`, `childDescription`, `expectedOutcomes`, `fatherFullName/DOB/Occupation`, `motherFullName/DOB/Occupation`, `address`, `contactPhone`, `institutionStartDate`, `emergencyContact`, `class`, `teacher` | `parentId`, `groupId`, `schoolId` (FK wiring, not touched) |
| `IRR` | *(not updated — documented for testers in demo-profile.md)* | `ptpkIntakeDate`, `ptpkConclusionDate`, `ptpkConclusionNumber`, `ptpkDiagnosis` are on `irrs` table |

Model source reads: `backend/models/User.js`, `backend/models/Child.js`, `backend/models/IRR.js`

---

## Execution

SQL file: `audits/prod-readiness/shape-03.sql`

Transaction structure:
- `BEGIN`
- 31× `UPDATE users SET "firstName"=…, "lastName"=…, phone=…, "updatedAt"=NOW() WHERE id='…'`
- 12× `UPDATE children SET [all fields] WHERE id='…'`
- 4× verification `SELECT COUNT(*)` queries
- `COMMIT`

Dollar-quoting (`$…$`) used for all Uzbek Cyrillic text fields to avoid apostrophe escaping issues.

### Execution output

```
BEGIN
UPDATE 1   (×31 — all user rows)
UPDATE 1   (×12 — all children rows)
 users_with_phone = 31
 children_with_desc = 12
 total_users = 31
 total_children = 12
COMMIT
```

---

## AFTER Snapshot + Verification

### Row counts (unchanged from PROD-READINESS-02)

| Table | Count | Expected |
|---|---|---|
| users | **31** | 31 ✓ |
| children | **12** | 12 ✓ |

### Field verification — children sample

```
 firstName | lastName  | dateOfBirth |               disabilityType                          | class       | teacher
-----------+-----------+-------------+-------------------------------------------------------+-------------+-------------------
 Bobur     | Sobirov   | 2022-01-15  | Аутистик спектр бузилишлари (енгил-ўрта даражада)    | Maktabgacha | Zulfiya Nazarova
 Shahlo    | Tursunova | 2018-11-20  | Эшитиш қобилиятининг ўрта-оғир даражада чекланганлиги | 1-sinf      | Zulfiya Nazarova
 ...
 Malika    | Ahmedova  | 2020-09-16  | Кўриш қобилиятининг оғир даражада чекланганлиги       | Tayyorlov   | Akbar Pulatov
(12 rows — all verified)
```

### Field verification — users sample

```
        email          | firstName | lastName    |       phone
-----------------------+-----------+-------------+-------------------
 gov.republic@uchqun.uz | Hamidjon | Mirzayev    | +998 90 512 34 56
 admin1@uchqun.uz       | Dilnoza  | Xoliqova    | +998 94 817 83 45
 teacher1@uchqun.uz     | Zulfiya  | Nazarova    | +998 90 459 17 28
 parent1@uchqun.uz      | Hulkar   | Sobirova    | +998 97 672 35 84
 ...
(31 rows — all verified)
```

### HTTP login smoke test

| Account | HTTP | firstName in response |
|---|---|---|
| `parent1@uchqun.uz` | **200** ✓ | `"Hulkar"` ✓ |

Response body confirmed `lastName: "Sobirova"`, `phone: "+998 97 672 35 84"`.

---

## Diagnosis Distribution

| School | Child | ICD-10 | Category |
|---|---|---|---|
| School 1 | Bobur Sobirov | F84.0 | ASD level 1-2 (functional speech) |
| School 1 | Shahlo Tursunova | H90.3 | Hearing impairment (moderate-severe, bilateral) |
| School 1 | Lola Qodirova | G80.3 | Cerebral palsy (athetoid/dyskinetic, AAC) |
| School 2 | Murod Hasanov | G80.1 | Cerebral palsy (spastic diplegia) |
| School 2 | Jasur Mirzayev | F90.0 | ADHD + dyslexia |
| School 2 | Diyora Rahimova | G40.2 | Epilepsy + intellectual delay |
| School 3 | Sarvar Hamidov | Q90.0 | Down syndrome (trisomy 21) |
| School 3 | Aziza Karimova | F80.1 | Speech/language delay |
| School 3 | Zafar Ergashev | F84.0 | ASD level 3 (non-verbal, AAC) |
| School 4 | Sanjar Yusupov | F71 | Moderate intellectual disability |
| School 4 | Nozima Qodirova | F89 | Global developmental delay |
| School 4 | Malika Ahmedova | H54.2 | Severe visual impairment |

12 distinct clinical categories. No school has duplicate diagnosis categories. All written in current professional ПТПК Uzbek Cyrillic terminology — no outdated or stigmatizing language.

---

## Data Quality Guarantees

| Requirement | Result |
|---|---|
| Plausible invented Uzbek names | ✅ Common Uzbek first/last name combinations, no real persons |
| Valid +998 mobile prefixes (90/91/93/94/95/97/99/88/33) | ✅ |
| Invented subscriber digits (no real numbers) | ✅ |
| ПТПК real clinical categories, Cyrillic uz | ✅ |
| No outdated/stigmatizing terminology | ✅ |
| SYNTHETIC header in demo-profile.md | ✅ |
| Only existing model fields populated | ✅ (confirmed against model source) |
| Transactional update — rollback on any failure | ✅ (BEGIN/COMMIT, no partial state) |
| Row counts unchanged | ✅ (31 users, 12 children) |

---

## Summary

| Item | Result |
|---|---|
| 31 user names + phones updated | ✅ |
| 12 children full profiles + diagnoses updated | ✅ |
| Verification counts match | ✅ |
| HTTP login confirms new name in response | ✅ |
| demo-profile.md written at repo root | ✅ |
| Diagnosis variety (12 categories, no duplicates per school) | ✅ |

**PROD-READINESS-03 = ✅**
