# Uchqun — Test Credentials (PROD-READINESS-02)

**Environment:** Railway production  
**Backend:** https://uchqun-production-b484.up.railway.app  
**Seeded:** 2026-05-30  
**Password (all accounts):** `Test@2026`

---

## Government (3 users)

| Email | Name | Level | Region |
|---|---|---|---|
| `gov.republic@uchqun.uz` | Alisher Nazarov | republic / main | — |
| `gov.toshkent@uchqun.uz` | Bobur Yusupov | region / main | Region 01 (Toshkent) |
| `gov.samarqand@uchqun.uz` | Sardor Karimov | region / main | Region 02 (Samarqand) |

---

## School 1 — Toshkent Maxsus Maktab 1 (Region 01)

| Role | Email | Name |
|---|---|---|
| admin | `admin1@uchqun.uz` | Aziz Umarov |
| reception | `reception1@uchqun.uz` | Zilola Raximova |
| teacher | `teacher1@uchqun.uz` | Malika Yunusova |
| teacher | `teacher2@uchqun.uz` | Nodir Ismoilov |
| parent | `parent1@uchqun.uz` | Hulkar Nasirova |
| parent | `parent2@uchqun.uz` | Dilorom Sobirov |
| parent | `parent3@uchqun.uz` | Jasur Tursunov |

**Groups:**
- A-guruh → Malika Yunusova (children: Asilbek Hulkarovich, Gulnora Diloromovna)
- B-guruh → Nodir Ismoilov (child: Muhammadali Jasurovich)

---

## School 2 — Toshkent Maxsus Maktab 2 (Region 01)

| Role | Email | Name |
|---|---|---|
| admin | `admin2@uchqun.uz` | Bahrom Solijev |
| reception | `reception2@uchqun.uz` | Yulduz Mirzayeva |
| teacher | `teacher3@uchqun.uz` | Feruza Qosimova |
| teacher | `teacher4@uchqun.uz` | Doniyor Xoliqov |
| parent | `parent4@uchqun.uz` | Kamola Hasanov |
| parent | `parent5@uchqun.uz` | Laylo Mirzayev |
| parent | `parent6@uchqun.uz` | Mansur Rahimov |

**Groups:**
- A-guruh → Feruza Qosimova (children: Nodira Kamolaovna, Otabek Layloevich)
- B-guruh → Doniyor Xoliqov (child: Parviz Mansurovich)

---

## School 3 — Samarqand Maxsus Maktab 1 (Region 02)

| Role | Email | Name |
|---|---|---|
| admin | `admin3@uchqun.uz` | Vohid Toshmatov |
| reception | `reception3@uchqun.uz` | Xurmo Normatova |
| teacher | `teacher5@uchqun.uz` | Shahnoza Ergasheva |
| teacher | `teacher6@uchqun.uz` | Erkin Nazarov |
| parent | `parent7@uchqun.uz` | Nafisa Hamidov |
| parent | `parent8@uchqun.uz` | Ozoda Karimov |
| parent | `parent9@uchqun.uz` | Pahlavon Ergashev |

**Groups:**
- A-guruh → Shahnoza Ergasheva (children: Qunduz Nafisaovna, Rustam Ozodinovich)
- B-guruh → Erkin Nazarov (child: Sarvinoz Pahlavonovna)

---

## School 4 — Samarqand Maxsus Maktab 2 (Region 02)

| Role | Email | Name |
|---|---|---|
| admin | `admin4@uchqun.uz` | Gulsanam Xolmatova |
| reception | `reception4@uchqun.uz` | Umida Qodirboyeva |
| teacher | `teacher7@uchqun.uz` | Maftuna Aliyeva |
| teacher | `teacher8@uchqun.uz` | Akmal Pulatov |
| parent | `parent10@uchqun.uz` | Rano Yusupov |
| parent | `parent11@uchqun.uz` | Sanjar Qodirov |
| parent | `parent12@uchqun.uz` | Tursun Ahmedov |

**Groups:**
- A-guruh → Maftuna Aliyeva (children: Tohir Ranoevich, Ulugbek Sanjarovich)
- B-guruh → Akmal Pulatov (child: Feruza Tursunovna)

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
