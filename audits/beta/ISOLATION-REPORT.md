# Tenant Isolation Report
**S14 / BETA-VERIFICATION — Step 3**
**Opened:** 2026-06-08
**Status:** COMPLETE — all 26 probes recorded

Every probe below must be logged with a result — including passes. A probe with no entry = test incomplete.

## Result Key
- ✅ PASS — school/region boundary enforced; no cross-tenant data visible
- ❌ FAIL — cross-tenant data exposed (P0 or P1 defect — log in BETA-DEFECTS.md)
- ⚠️ PARTIAL — boundary enforced in one layer but not another
- 🔲 BLOCKED — probe could not be executed (hostile URL, missing UUID, or not scripted)

---

## Methodology Note

Wave 1–6 test specs were written as positive-path automation. The **hostile probe** pattern (navigating to `/portal/resource/[other-school-uuid]` to verify a 404 or redirect) was not scripted in the Playwright specs — those probes require known UUIDs from the _other_ school's seed data. The Wave 2/3/4 tests exercised each portal's list and detail pages with the correct-tenant account only.

Observations in the PARTIAL rows below are based on: screenshots showing the correct-tenant data loading without visible cross-tenant bleed, and absence of unexpected items in lists. They are not cryptographic proofs — the hostile URL probes marked BLOCKED must be run in a follow-up session to close the isolation verification.

---

## Teacher ↔ School Isolation

| # | Probe | Account | Method | Result | Evidence (screenshot) |
|---|---|---|---|---|---|
| ISO-T01 | Teacher S1 attendance roster shows only S1 children | teacher1 | UI: load Attendance page, inspect child list | ⚠️ PARTIAL | T-026-attendance — roster loaded; children visible match expected S1 pupils; no S2 entries observed but no explicit count assertion made |
| ISO-T02 | Teacher S1 activity child dropdown shows only S1 children | teacher1 | UI: create activity modal, open child dropdown | ⚠️ PARTIAL | T-033-activities — create modal opened; child list populated; no S2 names observed |
| ISO-T03 | Teacher S1 chat has no conversations with S2 parents | teacher1 | UI: load Chat, inspect conversation list | ⚠️ PARTIAL | T-048-chat — chat page loaded; only S1 conversations visible in screenshot |
| ISO-T04 | Teacher S1 parents list shows only S1 parents | teacher1 | UI: /teacher/parents list | ⚠️ PARTIAL | T-019-parents — parent list loaded; visible entries match S1 seeded parents |
| ISO-T05 | Teacher S1 media page shows only S1 children's media | teacher1 | UI: /teacher/media, inspect items | ⚠️ PARTIAL | T-041-media — media page loaded; items shown scoped to teacher1's groups |
| ISO-T06 | Teacher S1 cannot load S2 child detail via URL | teacher1 | URL: /teacher/children/[S2-child-uuid] | 🔲 BLOCKED | Hostile URL probe not scripted — S2 child UUIDs not injected into Wave 2 spec |
| ISO-T07 | Teacher S2 attendance shows only S2 children | teacher3 | UI: load Attendance | ⚠️ PARTIAL | T-026-teacher3-attendance — attendance roster loaded for teacher3; no cross-school bleed observed |

---

## Parent ↔ Child Isolation

| # | Probe | Account | Method | Result | Evidence (screenshot) |
|---|---|---|---|---|---|
| ISO-P01 | Parent1 cannot view S2 child attendance via URL | parent1 | URL: /parent/attendance?childId=[S2-child-uuid] | 🔲 BLOCKED | Hostile URL probe requires S2 child UUID — not scripted in Wave 3 spec |
| ISO-P02 | Parent1 cannot view S2 child journal via URL | parent1 | URL: /parent/children/[S2-child-uuid]/journal | 🔲 BLOCKED | Same — S2 child UUID not available in Wave 3 test context |
| ISO-P03 | Parent1 cannot view S2 child media via URL | parent1 | URL: /parent/media?childId=[S2-child-uuid] | 🔲 BLOCKED | Same |
| ISO-P04 | Parent1 chat thread contains only teacher1 messages | parent1 | UI: /parent/chat, inspect thread | ⚠️ PARTIAL | P-060-chat — chat opened; visible thread matches parent1's teacher (teacher1 S1); no cross-school thread visible |
| ISO-P05 | Parent1 IRR view shows only own child's IRR | parent1 | UI: /parent/irr, verify child name in header | ⚠️ PARTIAL | P-074-irr — page navigated; IRR content matched parent1's child name |
| ISO-P06 | Multi-child parent switcher shows only own children | parent (if multi-child exists) | UI: ChildSwitcher dropdown | 🔲 BLOCKED | No multi-child parent seeded in Wave 3 account set |

---

## Admin ↔ School Isolation

| # | Probe | Account | Method | Result | Evidence (screenshot) |
|---|---|---|---|---|---|
| ISO-A01 | Admin1 parents list shows only S1 parents | admin1 | UI: /admin/parents | ⚠️ PARTIAL | A-029-parents — parent list loaded; visible entries match S1 school scope; no S2/S3/S4 parents observed |
| ISO-A02 | Admin1 audit log shows only S1 events | admin1 | UI: /admin/audit-log, inspect all entries | ⚠️ PARTIAL | A-078-activity — activity feed loaded; entries scoped to admin1's actions; no cross-school events visible |
| ISO-A03 | Admin1 teachers list shows only S1 teachers | admin1 | UI: /admin/teachers | ⚠️ PARTIAL | A-037-teachers — teacher list loaded; visible entries match S1 teachers (teacher1, teacher2) |
| ISO-A04 | Admin1 communications show only S1 parent-teacher chats | admin1 | UI: /admin/communications | ⚠️ PARTIAL | A-065-comms — communications page loaded; visible threads appear S1-scoped |
| ISO-A05 | Admin1 cannot access S2 teacher detail via URL | admin1 | URL: /admin/teachers/[S2-teacher-uuid] | 🔲 BLOCKED | Hostile URL probe not scripted — S2 teacher UUIDs not injected into Wave 4 spec |
| ISO-A06 | Admin1 school profile is S1's profile only | admin1 | UI: /admin/school-profile | ⚠️ PARTIAL | A-084-school-profile — school profile loaded; school name matches S1 (Toshkent MM 1) |
| ISO-A07 | Admin2 (S2) cannot see admin1 (S1) data | admin2 | UI: repeat ISO-A01/A02/A03 | ⚠️ PARTIAL | A-002-admin2-login — admin2 logged in; dashboard loaded; no S1 entries observed in quick activity view |

---

## Region ↔ Region Isolation

| # | Probe | Account | Method | Result | Evidence (screenshot) |
|---|---|---|---|---|---|
| ISO-G01 | gov.toshkent schools list shows only S1+S2 | gov.toshkent | UI: /government/schools | ⚠️ PARTIAL | G-013-toshkent-schools — schools page loaded; screenshot shows a limited list consistent with 2 schools; no explicit count assertion |
| ISO-G02 | gov.samarqand schools list shows only S3+S4 | gov.samarqand | UI: /government/schools | ⚠️ PARTIAL | G-013-samarqand-schools — page loaded; screenshot consistent with 2-school scope |
| ISO-G03 | gov.toshkent students directory has no Samarqand students | gov.toshkent | UI: /government/students, verify school column | ⚠️ PARTIAL | G-029-toshkent-students — students page loaded; visible entries appear scoped to R01; no R02 school names observed |
| ISO-G04 | gov.toshkent teachers directory has no Samarqand teachers | gov.toshkent | UI: /government/teachers | ⚠️ PARTIAL | G-032-toshkent-teachers — teachers page loaded; visible entries consistent with R01 schools |
| ISO-G05 | gov.toshkent audit log has no Samarqand events | gov.toshkent | UI: /government/audit-log | ⚠️ PARTIAL | G-057-toshkent-audit-log — page loaded; entries visible; no S3/S4 school names observed |
| ISO-G06 | gov.toshkent messages tab has no Samarqand school messages | gov.toshkent | UI: Platform → Messages | ⚠️ PARTIAL | G-037-toshkent-platform — platform page loaded; no cross-region messages visible |
| ISO-G07 | gov.toshkent ratings page shows only S1+S2 ratings | gov.toshkent | UI: /government/ratings | ⚠️ PARTIAL | G-024-toshkent-ratings — ratings page loaded; visible school cards consistent with R01 scope |
| ISO-G08 | gov.toshkent dashboard stats reflect only S1+S2 | gov.toshkent | UI: Dashboard stat cards | ⚠️ PARTIAL | G-006-toshkent-dashboard — dashboard loaded; stat figures consistent with 2-school scope (smaller than republic totals) |
| ISO-G09 | gov.republic sees all 4 schools | gov.republic | UI: /government/schools, count schools | ⚠️ PARTIAL | G-013-republic-schools — schools page loaded; list present; no explicit 4-school count assertion made |
| ISO-G10 | gov.republic regional breakdown table shows both R01+R02 | gov.republic | UI: Dashboard regional table | ⚠️ PARTIAL | G-010-regional-breakdown — scroll screenshot shows regional table; both R01 and R02 rows appear present |

---

## Summary

| Category | Count |
|---|---|
| Total probes | 26 |
| ✅ PASS | 0 |
| ⚠️ PARTIAL | 20 |
| 🔲 BLOCKED (hostile URL probes) | 6 |
| ❌ FAIL | 0 |

**No isolation breaches detected.** All observable list pages returned data consistent with the correct tenant scope. No cross-school or cross-region bleed was visible in any screenshot.

**Open work:** 6 hostile URL probes (ISO-T06, ISO-P01–P03, ISO-P06, ISO-A05) must be executed manually or in a follow-up spec that injects known cross-tenant UUIDs. These probes verify the backend's 404/403 response when a user navigates to another school's resource by UUID — the positive-path automation cannot cover this.
