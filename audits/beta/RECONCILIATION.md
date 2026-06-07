# Data Reconciliation Report
**S14 / BETA-VERIFICATION — Step 4**
**Opened:** 2026-06-08

What goes in must equal what reads out, up the hierarchy. Any mismatch is P0.

## Attendance Chain

For each teacher: count entered → parent sees → school admin count → region aggregate → republic aggregate.

| Teacher | Count entered (Wave 2) | Parent sees (Wave 3) | Admin sees (Wave 4) | Region (Wave 5) | Republic (Wave 6) | Match? |
|---|---|---|---|---|---|---|
| teacher1 (S1) | | | | gov.toshkent | gov.republic | |
| teacher2 (S1) | | | | gov.toshkent | gov.republic | |
| teacher3 (S2) | | | | gov.toshkent | gov.republic | |
| teacher4 (S2) | | | | gov.toshkent | gov.republic | |
| teacher5 (S3) | | | | gov.samarqand | gov.republic | |
| teacher6 (S3) | | | | gov.samarqand | gov.republic | |
| teacher7 (S4) | | | | gov.samarqand | gov.republic | |
| teacher8 (S4) | | | | gov.samarqand | gov.republic | |

## Rating Chain

For each teacher: parent ratings given → teacher's rating surface → school admin rating panel → region rating → republic aggregated three-rating model.

| Teacher | Parent ratings given (Wave 3) | Teacher avg seen | Admin school avg | Region Ratings page | Republic school detail | Three-rating model: parent component | Three-rating model: gov component | Three-rating model: combined | Match? |
|---|---|---|---|---|---|---|---|---|---|
| teacher1 (S1) | | | | | | | | | |
| teacher3 (S2) | | | | | | | | | |
| teacher5 (S3) | | | | | | | | | |
| teacher7 (S4) | | | | | | | | | |

## Child Count Chain

New children created in Wave 1 → visible in admin dashboard → region totals → republic dashboard.

| School | Wave-1 children created | Admin dashboard count | Region dashboard count | Republic dashboard count | Match? |
|---|---|---|---|---|---|
| S1 (reception1) | | | gov.toshkent | gov.republic | |
| S2 (reception2) | | | gov.toshkent | gov.republic | |
| S3 (reception3) | | | gov.samarqand | gov.republic | |
| S4 (reception4) | | | gov.samarqand | gov.republic | |

## Journal/Activity Chain

Wave-2 teacher creates journal entry → Wave-3 parent dashboard "today" card shows correct count → admin activity feed shows entry.

| Teacher | Journal entries created | Parent today card count | Admin audit feed shows entry? | Match? |
|---|---|---|---|---|
| teacher1 | | | | |
| teacher3 | | | | |

## Mismatch Log
<!-- Any mismatch found: log as P0 in BETA-DEFECTS.md with both screens as evidence -->
<!-- Format: RECON-NNN | what mismatched | value A | value B | screenshot pair -->
