# PROD-READINESS-04 — Complete Feature Inventory

**Date:** 2026-05-30  
**Status:** ✅ COMPLETE  
**Method:** atomic-grain, code-sourced  
**Source commit:** 6c34f4faba64f8b2ed41fb1f0871f8e20ac68e2d

---

## Objective

Produce the complete feature inventory for every role/portal — every user-perceivable capability, including small ones. Sourced from code (routes, controllers, page components, nav), not memory or prior audits. Output: 5 per-role files + 1 master index.

---

## Total Feature Counts

| Portal | Total | ✅ Working | 🟡 Unverified | ❌ Broken | 🚧 Planned |
|---|---|---|---|---|---|
| Teacher | 116 | 12 (10%) | 104 (90%) | 0 | 0 |
| Parent | 106 | 36 (34%) | 70 (66%) | 0 | 0 |
| Admin | 95 | 34 (36%) | 58 (61%) | 2 (2%) | 1 (1%) |
| Reception | 89 | 14 (16%) | 73 (82%) | 2 (2%) | 0 |
| Government | 76 | 65 (86%) | 7 (9%) | 0 | 0 |
| **TOTAL** | **482** | **161 (33%)** | **309 (64%)** | **4 (1%)** | **1 (<1%)** |

---

## Process

1. **Pre-flight:** Confirmed 5 portals from actual route + app structure (App.jsx, ParentApp.jsx, admin/App.jsx, reception/App.jsx, government/App.jsx). Noted teacher and parent share the same Vite app.
2. **Per-role inventory:** 5 parallel agents walked each portal from routes → nav → pages → backend endpoints. Teacher file was regenerated (first pass was narrative summary, not proper tables).
3. **Reception header fix:** First-pass agent wrote header as 41 features but file had 89 rows — corrected to 89.
4. **Spot-checks:** 10 entries verified by reading actual source files. 8 pass, 2 partial (both corrected). No structural failures.
5. **Master index written:** Cross-role feature matrix, 6 demo critical paths, known broken features, hidden features list.

---

## Spot-Check Results (10/10)

| # | Entry | Result |
|---|---|---|
| 1 | T-017 sidebar badge | ⚠️ Corrected — test polls /chat/unread-count (not socket direct) |
| 2 | T-076 IRR activate gate | ⚠️ Corrected — "9-field gate" → IRR_HEADER_INCOMPLETE validation |
| 3 | T-045 Activities.test.jsx | ✅ Pass |
| 4 | P-001 parent login file | ✅ Pass (already correct: teacher/src/pages/Login.jsx shared) |
| 5 | A-001 admin login | ✅ Pass |
| 6 | R-024 reception parents test | ✅ Pass |
| 7 | G-001 gov login | ✅ Pass |
| 8 | R-028 reception create parent endpoint | ✅ Pass |
| 9 | G-027 gov rating "no UI" claim | ✅ Pass (confirmed by reading SchoolDetail.jsx) |
| 10 | T-096 TherapyManagement.test.jsx | ✅ Pass |

---

## Key Findings

### Broken features (❌)
- **Admin:** 2 broken items — see features-admin.md
- **Reception:** Bulk action buttons render but click handlers missing (ParentManagement.jsx:446–451); group PUT scope unverified

### Hidden features (code exists, not in prior audits)
- Teacher responsibilities/tasks/work-history endpoints at `/teacher/responsibilities`, `/teacher/tasks`, `/teacher/work-history` — routes exist in teacherRoutes.js:61–72 but NO frontend page found
- Child goals separate from IRR goals: `/teacher/children/:childId/goals` CRUD in teacherRoutes.js:94–100
- Reception → government messaging: full send+receive in reception/src/pages/Profile.jsx
- Government school rating: backend API fully built (POST /government/schools/:id/rate, indicators validation, upsert per quarter), no frontend form UI

### Coverage observation
The 33% overall ✅ rate is not alarming — it reflects that test coverage was concentrated on the government portal (which went through the most audit loops) and admin (manual testing gate at phase boundaries). Teacher IRR is the largest unverified surface (26 IRR features all 🟡) and is the highest-priority area for E2E verification in PROD-READINESS-05.

---

## CLAUDE.md Update

Added reference to inventory files under "Test Accounts" section. Both `features-INDEX.md` and per-role files are now discoverable from CLAUDE.md.

---

## Deliverables

| File | Contents |
|---|---|
| `audits/prod-readiness/features-teacher.md` | 116 features, T-001–T-116 |
| `audits/prod-readiness/features-parent.md` | 106 features, P-001–P-106 |
| `audits/prod-readiness/features-admin.md` | 95 features, A-001–A-095 |
| `audits/prod-readiness/features-reception.md` | 89 features, R-001–R-089 |
| `audits/prod-readiness/features-government.md` | 76 features, G-001–G-076 |
| `audits/prod-readiness/features-INDEX.md` | Master index, cross-role matrix, 6 demo critical paths |
| `audits/prod-readiness/04-feature-inventory.md` | This file |

**PROD-READINESS-04 = ✅**
