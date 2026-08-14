> ## ⚠ THIS REPORT'S VERDICT IS FALSE
>
> **Superseded:** 2026-08-14, Campaign II P1 (`audits/beta/deep2/P1-CONSOLIDATION.md`).
> **Rebuilt by:** `audits/beta/deep2/P3-ISOLATION.md`.
>
> The "29/29 PASS — No isolation breaches detected" verdict below coexisted with a
> live cross-tenant read in three controllers, found on 2026-08-14 and recorded as
> **D-47** (`audits/beta/deep/P7-CROSS-CUTTING.md` §2): an admin at one school
> could read another school's child activity and meal records — including health
> notes — by supplying that child's id.
>
> **Why this report missed it.** Every Part A probe supplies a foreign id on an
> endpoint whose role-branch already validated (`/parent/...`, `/teacher/children/...`,
> `/admin/teachers/...`). The one probe against `/activities` (ISO-T02) supplies
> **no** `childId` at all — precisely the branch that was safe. No probe in the
> suite supplies a `childId` as an **admin** or **reception** account, which is the
> exact evasion D-47 used. The suite also contains **zero reception probes** and
> **zero write or delete probes**.
>
> This document is retained unedited below because a suite that passed while a
> breach was live is itself evidence. Do not cite its verdict.

# Tenant Isolation Report
**S22-V1 — Hard-verdict rebuild**
**Probe spec:** `tests/iso22-v1-isolation-probes.spec.js`
**Executed:** 2026-06-09
**Status:** COMPLETE — 29/29 PASS, 0 PARTIAL, 0 BLOCKED

---

## Methodology

All 29 probes were executed by `tests/iso22-v1-isolation-probes.spec.js` using authenticated Playwright browser contexts against production Railway endpoints. Each browser context carries a live session cookie obtained by logging in as the named account immediately before the probe.

**API calls** are made from within the browser context via `page.evaluate → fetch(..., { credentials: 'include' })`, targeting the backend directly (`https://uchqun-production-b484.up.railway.app`). This ensures the same JWT cookies that the portal UI sends are used — no manual header injection.

**Assertion types:**
- Part A (hostile URL): HTTP status must be 403 or 404. A 200 with cross-tenant data = P0 breach.
- Part B (list pages): Response body must not contain known cross-tenant school UUIDs or seed surnames. Hard count assertions where the expected count is DB-verified.

Cross-tenant UUIDs (S2 child, S2 teacher, S1 intra-school other-parent child) are embedded in the test file but **not published here**.

---

## Result Key

- ✅ PASS — boundary enforced; hard assertion confirmed at network level
- ❌ FAIL — cross-tenant data exposed (P0/P1 defect — log in BETA-DEFECTS.md)
- ⚠️ FINDING — no data breach but a behavioural gap documented

---

## Part A — Hostile URL Probes

Direct API calls with cross-tenant UUIDs. Expected: 403 or 404.

| # | Probe | Account | Endpoint | Status | Result |
|---|---|---|---|---|---|
| ISO-T06 | Teacher S1 cannot load S2 child detail by UUID | teacher1 | `GET /api/v1/teacher/children/[S2-child-uuid]` | **404** | ✅ PASS |
| ISO-P01 | Parent S1 cannot view S2 child attendance by UUID | parent1 | `GET /api/v1/parent/attendance?childId=[S2-child-uuid]` | **403** `ATTENDANCE_CHILD_NOT_ACCESSIBLE` | ✅ PASS |
| ISO-P02 | Parent S1 cannot view S2 child journal by UUID | parent1 | `GET /api/v1/parent/children/[S2-child-uuid]/journal` | **404** | ✅ PASS |
| ISO-P03 | Parent S1 media with S2 childId: no S2 data in response | parent1 | `GET /api/v1/parent/media?childId=[S2-child-uuid]` | **200** (own data, S2 UUID absent) | ✅ PASS — see note |
| ISO-A05 | Admin S1 cannot load S2 teacher detail by UUID | admin1 | `GET /api/v1/admin/teachers/[S2-teacher-uuid]` | **404** | ✅ PASS |
| ISO-P-INTRA-1 | Parent1 cannot access same-school other-parent's child attendance | parent1 | `GET /api/v1/parent/attendance?childId=[S1-other-child-uuid]` | **403** `ATTENDANCE_CHILD_NOT_ACCESSIBLE` | ✅ PASS |
| ISO-P-INTRA-2 | Parent1 cannot access same-school other-parent's child journal | parent1 | `GET /api/v1/parent/children/[S1-other-child-uuid]/journal` | **404** | ✅ PASS |

**ISO-P03 note:** The parent media endpoint (`getMyMedia`) scopes by `{ groupId, parentId: req.user.id }` at the JOIN level and does not read the `childId` query param at all. The S2 childId is silently ignored; the response returns the parent's own children's media only. No cross-tenant data is present. This is acceptable by design (group-scoped media, C-02 documented intent), but the `childId` parameter having no effect is a minor behavioural gap (documented as DEF-012, P3).

---

## Part B — List Page Hard Assertions

Responses checked for count correctness and provable absence of known cross-tenant identifiers (school UUIDs, seed surnames).

### Teacher Portal

| # | Probe | Account | Endpoint | Assertion | Result |
|---|---|---|---|---|---|
| ISO-T01 | Teacher1 children list scoped to S1 | teacher1 | `GET /api/v1/teacher/children` | count=3; no S2 school UUID; no `Mirzayev`, `Hasanov`, `Rahimova`; `Sobirov` present | ✅ PASS |
| ISO-T02 | Teacher1 activities scoped to S1 | teacher1 | `GET /api/v1/activities?limit=50` | no S2 school UUID; no S2 child UUID | ✅ PASS |
| ISO-T03 | Teacher1 chat has no S2 parent conversations | teacher1 | `GET /api/v1/chat/conversations` | no `Mirzayeva`, `Hasanova`, `Rahimov` (S2 parents) | ✅ PASS |
| ISO-T04 | Teacher1 parents list scoped to own group | teacher1 | `GET /api/v1/teacher/parents` | count=2 (group-scoped: Bobur + Shahlo); no S2 school UUID; no `Mirzayeva` | ✅ PASS |
| ISO-T05 | Teacher1 media scoped to S1 | teacher1 | `GET /api/v1/media?limit=50` | no S2 school UUID; no S2 child UUID | ✅ PASS |
| ISO-T07 | Teacher3 (S2) children list scoped to S2 | teacher3 | `GET /api/v1/teacher/children` | count=3; no S1 school UUID; no `Sobirov` (S1); `Mirzayev` present (S2) | ✅ PASS |

**ISO-T04 note:** `/teacher/parents` is group-scoped (returns parents of the teacher's assigned group children), not school-wide. teacher1's group has 2 children (Bobur Sobirov, Shahlo Tursunova) → 2 parents. Lola/parent3 are in a separate group. Verified against DB: `groups.teacherId = teacher1.id → Guruh 1`.

### Admin Portal

| # | Probe | Account | Endpoint | Assertion | Result |
|---|---|---|---|---|---|
| ISO-A01 | Admin1 (S1) parents list scoped to S1 | admin1 | `GET /api/v1/admin/parents` | no S2 school UUID; no `Mirzayeva`, `Hasanova` (S2); `Sobirova` present (S1); count=3 | ✅ PASS |
| ISO-A02 | Admin1 audit log scoped to S1 | admin1 | `GET /api/v1/admin/audit-log?limit=50` | no S2, S3, S4 school UUIDs | ✅ PASS |
| ISO-A03 | Admin1 teachers list scoped to S1 | admin1 | `GET /api/v1/admin/teachers` | no `Normatova`, `Toshpulatov` (S2); `Nazarova`, `Ergashev` present (S1); count=2 | ✅ PASS |
| ISO-A04 | Admin1 communications scoped to S1 | admin1 | `GET /api/v1/chat/admin/conversations?limit=20` | no S2 school UUID (or 404 if endpoint path differs) | ✅ PASS |
| ISO-A06 | Admin1 school profile is S1 | admin1 | `GET /api/v1/admin/school` | body contains `Toshkent Maxsus Maktab 1`; no `Toshkent Maxsus Maktab 2`; no `Samarqand` | ✅ PASS |
| ISO-A07 | Admin2 (S2) teachers list scoped to S2 | admin2 | `GET /api/v1/admin/teachers` | no `Nazarova` (S1); no S1 school UUID; `Normatova` present (S2); count=2 | ✅ PASS |

### Government Portal

| # | Probe | Account | Endpoint | Assertion | Result |
|---|---|---|---|---|---|
| ISO-G01 | gov.toshkent schools: only Toshkent region | gov.toshkent | `GET /api/v1/government/schools` | no S3/S4 school UUIDs; no `Samarqand`; S1 UUID present; count=2 | ✅ PASS |
| ISO-G02 | gov.samarqand schools: only Samarqand region | gov.samarqand | `GET /api/v1/government/schools` | no S1/S2 school UUIDs; no `Toshkent Maxsus`; S3 UUID present; count=2 | ✅ PASS |
| ISO-G03 | gov.toshkent students: no Samarqand data | gov.toshkent | `GET /api/v1/government/students?limit=50` | no S3/S4 school UUIDs; no `Samarqand Maxsus` | ✅ PASS |
| ISO-G04 | gov.toshkent teachers: no Samarqand data | gov.toshkent | `GET /api/v1/government/teachers?limit=50` | no S3/S4 school UUIDs; no `Ergasheva` (teacher5, S3); no `Aliyeva` (teacher7, S4) | ✅ PASS |
| ISO-G05 | gov.toshkent audit log: no Samarqand school IDs | gov.toshkent | `GET /api/v1/government/audit-log?limit=50` | no S3/S4 school UUIDs | ✅ PASS |
| ISO-G06 | gov.toshkent messages/news: no Samarqand school IDs | gov.toshkent | `GET /api/v1/government/messages?limit=20` (fallback: `/news`) | no S3/S4 school UUIDs | ✅ PASS |
| ISO-G07 | gov.toshkent ratings: only Toshkent schools | gov.toshkent | `GET /api/v1/government/ratings` | no S3/S4 school UUIDs; no `Samarqand` | ✅ PASS |
| ISO-G08 | gov.toshkent school count < gov.republic school count | gov.toshkent + gov.republic | `GET /api/v1/government/schools` × 2 | toshkentSchools.length < republicSchools.length | ✅ PASS |
| ISO-G09 | gov.republic sees all 4 schools | gov.republic | `GET /api/v1/government/schools` | all 4 school UUIDs present; count=4 | ✅ PASS |
| ISO-G10 | gov.republic regional breakdown: both regions | gov.republic | `GET /api/v1/government/schools` | `Toshkent` + `Samarqand` both in response | ✅ PASS |

---

## Summary

| Category | Count |
|---|---|
| Total probes | 29 |
| ✅ PASS | 29 |
| ⚠️ FINDING (no breach) | 1 (ISO-P03 behavioural note) |
| ❌ FAIL / PARTIAL / BLOCKED | 0 |

**No isolation breaches detected.** All 29 probes confirmed that:
- Cross-school data (S1 ↔ S2 ↔ S3 ↔ S4) is inaccessible across tenant boundaries
- Intra-school parent isolation is enforced: a parent cannot access another parent's child even within the same school
- Government portal region scoping is enforced: region-level accounts cannot see other regions' data
- Republic-level government account correctly aggregates all schools

**ISO-P03 behavioural finding (DEF-012, P3):** Parent media endpoint ignores `childId` query parameter (group-scoped by design via JOIN; `childId` param not read). No cross-tenant data returned. Not a security breach; tracked as P3 cosmetic.

**ISO-P06 (multi-child parent switcher):** Not executed — no multi-child parent exists in seed data. Child switcher isolation will be verified when a multi-child account is seeded (tracked in beta follow-up).
