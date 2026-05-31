# Uchqun — Test Credentials (PROD-READINESS-02)

**Environment:** Railway production  
**Backend:** https://uchqun-production-b484.up.railway.app  
**Seeded:** 2026-05-30  
**Password (all accounts):** `Test@2026`

**CREDS-SYNC 2026-05-31 (S12):** All display names updated to match live DB after PROD-READINESS-03 demo-profile rename pass. Previous names (from original seed) were replaced with Uzbek professional-sounding names. Emails and password unchanged.

---

## Government (3 users)

| Email | Name | Level | Region |
|---|---|---|---|
| `gov.republic@uchqun.uz` | Hamidjon Mirzayev | republic / main | — |
| `gov.toshkent@uchqun.uz` | Nodira Yusupova | region / main | Region 01 (Toshkent) |
| `gov.samarqand@uchqun.uz` | Sherzod Raximov | region / main | Region 02 (Samarqand) |

---

## School 1 — Toshkent Maxsus Maktab 1 (Region 01)

| Role | Email | Name |
|---|---|---|
| admin | `admin1@uchqun.uz` | Dilnoza Xoliqova |
| reception | `reception1@uchqun.uz` | Iroda Abdullayeva |
| teacher | `teacher1@uchqun.uz` | Zulfiya Nazarova |
| teacher | `teacher2@uchqun.uz` | Doniyor Ergashev |
| parent | `parent1@uchqun.uz` | Hulkar Sobirova |
| parent | `parent2@uchqun.uz` | Dilorom Tursunova |
| parent | `parent3@uchqun.uz` | Jasur Qodirov |

**Groups:** No groups seeded for School 1 (data gap from PROD-READINESS-02 seeder — see S12 note).  
**Children:** Linked to parents via parentId; exist in DB but no group assignment for School 1.

---

## School 2 — Toshkent Maxsus Maktab 2 (Region 01)

| Role | Email | Name |
|---|---|---|
| admin | `admin2@uchqun.uz` | Bahrom Xasanov |
| reception | `reception2@uchqun.uz` | Yulduz Mirzayeva |
| teacher | `teacher3@uchqun.uz` | Feruza Normatova |
| teacher | `teacher4@uchqun.uz` | Sardor Toshpulatov |
| parent | `parent4@uchqun.uz` | Kamola Hasanova |
| parent | `parent5@uchqun.uz` | Lobar Mirzayeva |
| parent | `parent6@uchqun.uz` | Mansur Rahimov |

**Groups:**
- A-guruh → teacher3 (Feruza Normatova)
- B-guruh → teacher4 (Sardor Toshpulatov)

---

## School 3 — Samarqand Maxsus Maktab 1 (Region 02)

| Role | Email | Name |
|---|---|---|
| admin | `admin3@uchqun.uz` | Vohida Toshmatova |
| reception | `reception3@uchqun.uz` | Xurshida Norqulova |
| teacher | `teacher5@uchqun.uz` | Shahnoza Ergasheva |
| teacher | `teacher6@uchqun.uz` | Erkin Nazarov |
| parent | `parent7@uchqun.uz` | Nafosatoy Hamidova |
| parent | `parent8@uchqun.uz` | Ozoda Karimova |
| parent | `parent9@uchqun.uz` | Pahlavon Ergashev |

**Groups:**
- A-guruh → teacher5 (Shahnoza Ergasheva)
- B-guruh → teacher6 (Erkin Nazarov)

---

## School 4 — Samarqand Maxsus Maktab 2 (Region 02)

| Role | Email | Name |
|---|---|---|
| admin | `admin4@uchqun.uz` | Gulsanam Xolmatova |
| reception | `reception4@uchqun.uz` | Umida Qodirboyeva |
| teacher | `teacher7@uchqun.uz` | Maftuna Aliyeva |
| teacher | `teacher8@uchqun.uz` | Akbar Pulatov |
| parent | `parent10@uchqun.uz` | Rano Yusupova |
| parent | `parent11@uchqun.uz` | Sanjar Qodirov |
| parent | `parent12@uchqun.uz` | Tursunoy Ahmedova |

**Groups:**
- A-guruh → teacher7 (Maftuna Aliyeva)
- B-guruh → teacher8 (Akbar Pulatov)

---

## Dependency Wiring

- `school.regionId` → `regions` table (Region 01/02 via CP-021)
- `user.schoolId` → school
- `group.teacherId` → teacher user
- `group.schoolId` → school
- `child.parentId` → parent user
- `child.groupId` → group (isTeacherAssignedToChild modern path)
- `child.schoolId` → school

All chains verified via JOIN queries (see `audits/prod-readiness/02-account-seed.md`).

---

## Notes

- All accounts: `isActive=true`, `documentsApproved=true`, `status=active`, `mustChangePassword=false`
- Government: `govLevel=republic/region`, `govType=main`, `govRegionId` set for region accounts
- Reception: meets both `documentsApproved && isActive` auth gate (CLAUDE.md)
- Password hash: bcrypt 10 rounds — `$2b$10$.ovwHitQ4P/HBG4RmhrYR.LRGIrOGlFaCtM.d9Gi.yXuCZ0q6KyTO`
- createdBy chain: backfilled via migration 20260531000001 (S11/S12) — reception.createdBy = admin, teacher/parent.createdBy = first reception in same school
- School 1 groups: missing from DB (seeder gap) — children exist but unassigned to groups in School 1
