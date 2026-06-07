# Tenant Isolation Report
**S14 / BETA-VERIFICATION — Step 3**
**Opened:** 2026-06-08

Every probe below must be logged with a result — including passes. A probe with no entry = test incomplete.

## Result Key
- ✅ PASS — school/region boundary enforced; no cross-tenant data visible
- ❌ FAIL — cross-tenant data exposed (P0 or P1 defect — log in BETA-DEFECTS.md)
- ⚠️ PARTIAL — boundary enforced in one layer but not another

---

## Teacher ↔ School Isolation

| # | Probe | Account | Method | Result | Evidence (screenshot) |
|---|---|---|---|---|---|
| ISO-T01 | Teacher S1 attendance roster shows only S1 children | teacher1 | UI: load Attendance page, inspect child list | | |
| ISO-T02 | Teacher S1 activity child dropdown shows only S1 children | teacher1 | UI: create activity modal, open child dropdown | | |
| ISO-T03 | Teacher S1 chat has no conversations with S2 parents | teacher1 | UI: load Chat, inspect conversation list | | |
| ISO-T04 | Teacher S1 parents list shows only S1 parents | teacher1 | UI: /teacher/parents list | | |
| ISO-T05 | Teacher S1 media page shows only S1 children's media | teacher1 | UI: /teacher/media, inspect items | | |
| ISO-T06 | Teacher S1 cannot load S2 child detail via URL | teacher1 | URL: /teacher/children/[S2-child-uuid] | | |
| ISO-T07 | Teacher S2 attendance shows only S2 children | teacher3 | UI: load Attendance | | |

## Parent ↔ Child Isolation

| # | Probe | Account | Method | Result | Evidence (screenshot) |
|---|---|---|---|---|---|
| ISO-P01 | Parent1 cannot view S2 child attendance via URL | parent1 | URL: /parent/attendance?childId=[S2-child-uuid] | | |
| ISO-P02 | Parent1 cannot view S2 child journal via URL | parent1 | URL: /parent/children/[S2-child-uuid]/journal | | |
| ISO-P03 | Parent1 cannot view S2 child media via URL | parent1 | URL: /parent/media?childId=[S2-child-uuid] | | |
| ISO-P04 | Parent1 chat thread contains only teacher1 messages | parent1 | UI: /parent/chat, inspect thread | | |
| ISO-P05 | Parent1 IRR view shows only own child's IRR | parent1 | UI: /parent/irr, verify child name in header | | |
| ISO-P06 | Multi-child parent switcher shows only own children | parent (if multi-child exists) | UI: ChildSwitcher dropdown | | |

## Admin ↔ School Isolation

| # | Probe | Account | Method | Result | Evidence (screenshot) |
|---|---|---|---|---|---|
| ISO-A01 | Admin1 parents list shows only S1 parents | admin1 | UI: /admin/parents | | |
| ISO-A02 | Admin1 audit log shows only S1 events | admin1 | UI: /admin/audit-log, inspect all entries | | |
| ISO-A03 | Admin1 teachers list shows only S1 teachers | admin1 | UI: /admin/teachers | | |
| ISO-A04 | Admin1 communications show only S1 parent-teacher chats | admin1 | UI: /admin/communications | | |
| ISO-A05 | Admin1 cannot access S2 teacher detail via URL | admin1 | URL: /admin/teachers/[S2-teacher-uuid] | | |
| ISO-A06 | Admin1 school profile is S1's profile only | admin1 | UI: /admin/school-profile | | |
| ISO-A07 | Admin2 (S2) cannot see admin1 (S1) data | admin2 | UI: repeat ISO-A01/A02/A03 | | |

## Region ↔ Region Isolation

| # | Probe | Account | Method | Result | Evidence (screenshot) |
|---|---|---|---|---|---|
| ISO-G01 | gov.toshkent schools list shows only S1+S2 | gov.toshkent | UI: /government/schools | | |
| ISO-G02 | gov.samarqand schools list shows only S3+S4 | gov.samarqand | UI: /government/schools | | |
| ISO-G03 | gov.toshkent students directory has no Samarqand students | gov.toshkent | UI: /government/students, verify school column | | |
| ISO-G04 | gov.toshkent teachers directory has no Samarqand teachers | gov.toshkent | UI: /government/teachers | | |
| ISO-G05 | gov.toshkent audit log has no Samarqand events | gov.toshkent | UI: /government/audit-log | | |
| ISO-G06 | gov.toshkent messages tab has no Samarqand school messages | gov.toshkent | UI: Platform → Messages | | |
| ISO-G07 | gov.toshkent ratings page shows only S1+S2 ratings | gov.toshkent | UI: /government/ratings | | |
| ISO-G08 | gov.toshkent dashboard stats reflect only S1+S2 | gov.toshkent | UI: Dashboard stat cards | | |
| ISO-G09 | gov.republic sees all 4 schools | gov.republic | UI: /government/schools, count schools | | |
| ISO-G10 | gov.republic regional breakdown table shows both R01+R02 | gov.republic | UI: Dashboard regional table | | |

## Summary
<!-- Populated after all probes run -->
- Total probes: 26
- PASS: —
- FAIL: —
- PARTIAL: —
