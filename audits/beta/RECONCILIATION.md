# Data Reconciliation Report
**S14 / BETA-VERIFICATION — Step 4**
**Opened:** 2026-06-08
**Status:** PARTIAL — screenshots captured; numeric extraction not automated

## Methodology

The Wave 1–6 Playwright tests captured `fullPage: false` screenshots at each chain link but did not OCR or extract numeric values from the UI. Full chain verification (exact count comparison) requires manual screenshot review. The table below records what was observed vs. what was scripted.

All screenshots are in `audits/beta/screens/`.

---

## Attendance Chain

For each teacher: count entered → parent sees → school admin count → region aggregate → republic aggregate.

| Teacher | Count entered (Wave 2) | Parent sees (Wave 3) | Admin sees (Wave 4) | Region (Wave 5) | Republic (Wave 6) | Match? |
|---|---|---|---|---|---|---|
| teacher1 (S1) | ≥1 entry (T-026-attendance screenshot) | P-022-parent1 attended view | A-059-admin1-attendance-reports | G-006-toshkent-dashboard | G-006-republic-dashboard | ⚠️ Not numerically verified — screenshot review required |
| teacher2 (S1) | Blocked — mustChangePassword (DEF-006) | — | — | — | — | 🔲 N/A |
| teacher3 (S2) | ≥1 entry (T-026-teacher3-attendance) | P-022-parent4 attended view | A-002-admin2-login (limited data) | G-006-toshkent-dashboard | G-006-republic-dashboard | ⚠️ Not numerically verified |
| teacher4 (S2) | ≥1 entry (T-026-teacher4-attendance) | — | — | — | — | ⚠️ Partial |
| teacher5 (S3) | ≥1 entry (T-026-teacher5-attendance) | — | — | G-006-samarqand-dashboard | G-006-republic-dashboard | ⚠️ Not numerically verified |
| teacher6 (S3) | ≥1 entry (T-026-teacher6-attendance) | — | — | — | — | ⚠️ Partial |
| teacher7 (S4) | ≥1 entry (T-026-teacher7-attendance) | — | — | G-006-samarqand-dashboard | G-006-republic-dashboard | ⚠️ Not numerically verified |
| teacher8 (S4) | ≥1 entry (T-026-teacher8-attendance) | — | — | — | — | ⚠️ Partial |

**Chain status:** All teachers (except teacher2) submitted attendance entries during Wave 2. The count values were not extracted numerically — screenshots require manual review to confirm the propagation chain.

---

## Rating Chain

For each school: parent ratings given → school admin rating panel → region rating → republic aggregated three-rating model.

| School | Parent ratings given (Wave 3) | Admin school avg (Wave 4) | Region Ratings page (Wave 5) | Republic school detail (Wave 6) | Three-rating: parent | Three-rating: gov | Three-rating: combined | Match? |
|---|---|---|---|---|---|---|---|---|
| S1 (teacher1) | P-083-parent-ratings — parents gave star ratings | A-082-admin1-school-ratings (conditional) | G-007-toshkent-ratings (limited) | G-018-school-detail scroll | Screenshot only | G-027-gov-rate-school (conditional) | G-021 scroll | ⚠️ Screenshots captured; numeric values not extracted |
| S2 (teacher3) | P-083-parent4-ratings | A-002-admin2 (limited) | Same | Same | Same | Same | Same | ⚠️ Not numerically verified |
| S3 (teacher5) | P-083-parent7-ratings | A-003-admin3 (limited) | G-007-samarqand-ratings | Same | Same | Same | Same | ⚠️ Not numerically verified |
| S4 (teacher7) | P-083-parent10-ratings | A-004-admin4 (limited) | Same | Same | Same | Same | Same | ⚠️ Not numerically verified |

**Chain status:** Parent ratings were submitted during Wave 3. Government ratings were attempted in Wave 6 (G-027 conditional click). No mismatches detected in visible UI during testing, but exact numeric reconciliation requires screenshot audit.

---

## Child Count Chain

New children created in Wave 1 → visible in admin dashboard → region totals → republic dashboard.

| School | Wave-1 children created | Admin dashboard count | Region dashboard count | Republic dashboard count | Match? |
|---|---|---|---|---|---|
| S1 (reception1) | ≥1 via wizard (R-029-wizard) | A-001-admin1-dashboard | G-006-toshkent-dashboard stat card | G-006-republic-dashboard stat card | ⚠️ Screenshots captured; counts not compared numerically |
| S2 (reception2) | ≥1 via wizard (R-029-reception2-wizard) | A-002-admin2-login | G-006-toshkent-dashboard | G-006-republic-dashboard | ⚠️ Not numerically verified |
| S3 (reception3) | ≥1 via wizard (R-029-reception3-wizard) | A-003-admin3 | G-006-samarqand-dashboard | G-006-republic-dashboard | ⚠️ Not numerically verified |
| S4 (reception4) | ≥1 via wizard (R-029-reception4-wizard) | A-004-admin4 | G-006-samarqand-dashboard | G-006-republic-dashboard | ⚠️ Not numerically verified |

**Chain status:** Each reception account submitted the create-parent+child wizard during Wave 1. All dashboard pages were navigated during the respective waves and screenshots captured. No count discrepancies were visually apparent during review of screenshots.

---

## Journal/Activity Chain

Wave-2 teacher creates journal entry → Wave-3 parent dashboard "today" card shows correct count → admin activity feed shows entry.

| Teacher | Journal entries created | Parent today card | Admin activity feed | Match? |
|---|---|---|---|---|
| teacher1 | ≥1 (T-033-T-036 journal screenshots) | P-022-parent1 dashboard (today card present) | A-078-activity feed (entries present) | ⚠️ Positive evidence in all 3 screenshots; not numerically compared |
| teacher3 | ≥1 (T-033-teacher3-journal) | P-022-parent4 dashboard | A-002-admin2 (limited) | ⚠️ Not fully verified |
| teacher5 | ≥1 (T-033-teacher5-journal) | P-022-parent7 dashboard | A-003-admin3 (limited) | ⚠️ Not verified |
| teacher7 | ≥1 (T-033-teacher7-journal) | P-022-parent10 dashboard | A-004-admin4 (limited) | ⚠️ Not verified |

**Chain status:** Journal entries were created during Wave 2. Parent dashboards were navigated during Wave 3. Admin activity feeds were loaded during Wave 4. Screenshots capture all three layers — numeric comparison is pending manual review.

---

## Mismatch Log

No mismatches detected during automated testing.

| ID | What mismatched | Value A | Value B | Screenshot pair | Status |
|---|---|---|---|---|---|
| — | No numeric mismatches detected | — | — | — | CLEAN |

**Note:** The absence of detected mismatches reflects that no explicit numeric comparison was scripted in the test automation. Manual screenshot review is required before this chain can be closed as VERIFIED. Screenshots exist in `audits/beta/screens/` for all 4 chains above.
