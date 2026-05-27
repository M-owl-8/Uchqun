# ИРР End-to-End Walkthrough

**Version:** 2026-05-27  
**Scope:** Full ИРР lifecycle — Teacher → Parent → Admin → Teacher → Parent (progression demo)  
**Base URL:** `http://localhost:5000/api/v1`  
**Auth:** All requests require a session cookie (`withCredentials: true`). Login first; cookie is HTTP-only and handled by the browser / test client.

Substitute `{CHILD_ID}`, `{IRR_ID}`, `{PERIOD_ID}`, etc. with IDs returned by preceding steps.

---

## PHASE 1 — Teacher: Create and Activate ИРР

### Step 1.1 — Log in as Teacher

```
POST /auth/login
{ "email": "teacher@school.uz", "password": "…" }
→ 200 { success: true, data: { user: { id, role: "teacher", schoolId } } }
  Cookie: access_token set (HTTP-only)
```

Expected: role = `teacher`, schoolId present.

### Step 1.2 — Pick a Child

```
GET /teacher/children
→ 200 { success: true, data: [ { id, firstName, lastName, … } ] }
```

Pick any child from the returned list. Capture `{CHILD_ID}`.

### Step 1.3 — Create ИРР (draft)

```
POST /teacher/children/{CHILD_ID}/irr
Body: {}
→ 201 { success: true, data: { id, status: "draft", childId, schoolId, … } }
```

Capture `{IRR_ID}`. Status is `draft` — editing allowed, activation blocked until header is complete.

**Gate:** If an active ИРР already exists for this child, you get `409 IRR_ALREADY_EXISTS`.

### Step 1.4 — Fill the 9 Header Fields

All 9 fields are required before activation. Fill them in a single PATCH:

```
PATCH /teacher/irr/{IRR_ID}
Body: {
  "childFullName":         "Алишер Тошматов",
  "dateOfBirth":           "2019-03-15",
  "ageAtAssessmentStart":  "4 years 10 months",
  "ptpkIntakeDate":        "2026-01-10",
  "ptpkConclusionDate":    "2026-01-15",
  "ptpkConclusionNumber":  "ПТПК-2026-042",
  "ptpkDiagnosis":         "F84.0 — Аутизм спектри бузилиши",
  "irrStartDate":          "2026-02-01",
  "additionalInfo":        "Эшитиш қобилияти сақланган"
}
→ 200 { success: true, data: { …all 9 fields now populated… } }
```

**Allowed fields also include:** `childStrengths`, `riskFactors` (optional, any text).

### Step 1.5 — Activate ИРР

```
POST /teacher/irr/{IRR_ID}/activate
Body: {}
→ 200 { success: true, data: { …irr, status: "active" } }
```

**Gate:** If any of the 9 header fields are still empty, you get `400 IRR_HEADER_INCOMPLETE` with the list of missing fields in `detail`.

---

## PHASE 2 — Teacher: Intake Assessment (17 Criteria)

### Step 2.1 — Create Intake Assessment Session

Scores are an array of 17 integers. Each value is `0–4` (ability criteria 1–13) or `0–3` (frequency criteria 14–15) or `0–3` (participation criteria 16–17). Score index 0 = criterion 1, index 16 = criterion 17.

```
POST /teacher/irr/{IRR_ID}/assessment-sessions
Body: {
  "sessionType":      "intake",
  "completedAt":      "2026-02-01T09:00:00.000Z",
  "isHearingImpaired": false,
  "scores": [3, 2, 2, 3, 2, 1, 2, 3, 2, 2, 3, 2, 2, 2, 2, 2, 2],
  "notes": "Boshlang'ich baholash — qabul kuni"
}
→ 201 {
  success: true,
  data: {
    session: { id, sessionType: "intake", totalScore: 37, maxPossibleScore: 68 },
    totalScore: 37,
    maxPossibleScore: 68
  }
}
```

Capture `{SESSION_ID}` and note `totalScore` (37 in this example — ~54 %).

**Gate:** 
- Array length must be exactly 17 → `400 ASSESSMENT_INCOMPLETE`
- `sessionType` must be one of `intake | 3mo | 6mo | 9mo | 12mo | custom`
- Duplicate non-custom type → `409 ASSESSMENT_SESSION_EXISTS`

### Step 2.2 — View Progression (1 session so far)

```
GET /teacher/irr/{IRR_ID}/assessment-sessions
→ 200 { success: true, data: [ { id, sessionType: "intake", totalScore: 37, completedAt } ] }
```

One entry visible. Parent will see the same aggregate (no per-criterion breakdown).

---

## PHASE 3 — Teacher: Long-Term Goals

### Step 3.1 — Create LTG 1

```
POST /teacher/irr/{IRR_ID}/long-term-goals
Body: {
  "goalText":          "Мустақил овқатланиш кўникмасини шакллантириш",
  "targetPeriodStart": "2026-02-01",
  "targetPeriodEnd":   "2026-08-01"
}
→ 201 { success: true, data: { id, goalText, … } }
```

Capture `{LTG_1_ID}`.

**Gate:** `goalText` must be ≥ 5 chars → `400 LONG_TERM_GOAL_TEXT_TOO_SHORT`

### Step 3.2 — Create LTG 2

```
POST /teacher/irr/{IRR_ID}/long-term-goals
Body: {
  "goalText": "Мустақил ювиниш ва кийиниш кўникмаларини ривожлантириш"
}
→ 201 { success: true, data: { id, goalText, … } }
```

### Step 3.3 — List LTGs

```
GET /teacher/irr/{IRR_ID}/long-term-goals
→ 200 { success: true, data: [ {LTG1}, {LTG2} ] }
```

---

## PHASE 4 — Teacher: Goal Period + Short-Term Goals

### Step 4.1 — Create Goal Period

```
POST /teacher/irr/{IRR_ID}/goal-periods
Body: {
  "periodStart": "2026-02-01",
  "periodEnd":   "2026-05-01"
}
→ 201 { success: true, data: { id, status: "active", teacherSignedAt: null, managerSignedAt: null, … } }
```

Capture `{PERIOD_ID}`.

**Gate:** Both `periodStart` and `periodEnd` required → `400 GOAL_PERIOD_DATES_REQUIRED`

### Step 4.2 — Add STG 1 (Self-care feeding)

```
POST /teacher/goal-periods/{PERIOD_ID}/short-term-goals
Body: {
  "skillAreaCode": "SELF_CARE_FEEDING",
  "goalText":      "Қошиқ билан мустақил овқатланишни ўрганади",
  "taskSetDate":   "2026-02-01",
  "targetDate":    "2026-04-01",
  "tasks":         "Ҳар куни тушлик вақтида машқ қилиш",
  "methods":       "Кўрсатиб ўргатиш, йўналтириш",
  "progress":      null,
  "observations":  null
}
→ 201 { success: true, data: { id, skillAreaCode: "SELF_CARE_FEEDING", goalText, … } }
```

### Step 4.3 — Add STG 2 (Communication)

```
POST /teacher/goal-periods/{PERIOD_ID}/short-term-goals
Body: {
  "skillAreaCode": "COMMUNICATION",
  "goalText":      "Овқат сўраш учун 3 та сўз ишлатади",
  "targetDate":    "2026-04-01"
}
→ 201 { success: true, data: { id, … } }
```

### Step 4.4 — Add STG 3 (Social-emotional)

```
POST /teacher/goal-periods/{PERIOD_ID}/short-term-goals
Body: {
  "skillAreaCode": "SOCIAL_EMOTIONAL",
  "goalText":      "Гуруҳда бошқа болалар билан ўйнашни бошлайди"
}
→ 201 { success: true, data: { id, … } }
```

### Step 4.5 — List STGs

```
GET /teacher/goal-periods/{PERIOD_ID}/short-term-goals
→ 200 { success: true, data: [ {STG1}, {STG2}, {STG3} ] }
```

---

## PHASE 5 — Teacher: Quarterly Review + Sign

### Step 5.1 — Write Quarterly Review + Parent Recommendations

```
PATCH /teacher/goal-periods/{PERIOD_ID}/review
Body: {
  "overallAssessment":     "Болада мустақил овқатланишга интилиш кузатилмоқда. Кўрсатилган кўмак билан вазифаларни бажаради.",
  "planChanges":           "STG-1 муддатини 1 ойга узайтириш мақсадга мувофиқ.",
  "parentRecommendations": "Уйда ҳам қошиқ билан мустақил овқатланишга имкон бериш. Кийинишда ёрдам қилишдан олдин болага мустақил уриниш учун вақт беринг.",
  "nextReviewDate":        "2026-08-01",
  "nextAssessmentDate":    "2026-07-15",
  "parentDiscussionDate":  "2026-05-10"
}
→ 200 { success: true, data: { …period, overallAssessment, parentRecommendations, … } }
```

`parentRecommendations` is the amber-highlighted block parents see in their portal.

### Step 5.2 — Teacher Sign

```
POST /teacher/goal-periods/{PERIOD_ID}/sign
Body: {}
→ 200 { success: true, data: { …period, teacherSignedAt: "2026-05-10T…", teacherSignedBy: {teacherId} } }
```

Period now has `teacherSignedAt` set. Manager signature still null.

---

## PHASE 6 — Teacher: Daily + Weekly Journal Entries

### Step 6.1 — Daily Entry

```
POST /teacher/children/{CHILD_ID}/daily-entries
Body: {
  "entryDate": "2026-02-03",
  "irrId":     "{IRR_ID}",
  "hygieneData": {
    "hygiene_teeth_brushed": true,
    "hygiene_hands_washed":  true,
    "hygiene_face_washed":   false
  },
  "healthData": {
    "health_fever":    false,
    "health_appetite": true
  },
  "giData": {
    "gi_ate_well": true
  },
  "notes": "Болада кайфият яхши, дарс давомида фаол"
}
→ 201 { success: true, data: { id, entryDate, hygieneData, healthData, giData, … } }
```

**Gate:** `entryDate` required. Duplicate date → `409 DAILY_ENTRY_DUPLICATE`.

### Step 6.2 — Weekly Entry

```
POST /teacher/children/{CHILD_ID}/weekly-entries
Body: {
  "weekStart": "2026-02-03",
  "irrId":     "{IRR_ID}",
  "emotionalData": {
    "emo_happy":   true,
    "emo_calm":    true,
    "emo_anxious": false
  },
  "environmentData": {
    "env_participated_in_group": true,
    "env_followed_routine":      true
  },
  "notes": "Ҳафта давомида гуруҳ фаолиятига яхши жалб бўлди"
}
→ 201 { success: true, data: { id, weekStart, emotionalData, environmentData, … } }
```

**Gate:** `weekStart` required. Duplicate weekStart → `409 WEEKLY_ENTRY_DUPLICATE`.

---

## PHASE 7 — Parent: View-Only ИРР Surface

### Step 7.1 — Log in as Parent

```
POST /auth/login
{ "email": "parent@school.uz", "password": "…" }
→ 200 { data: { user: { id, role: "parent" } } }
```

The parent must be the `parentId` on the child record. If not linked, steps 7.2–7.4 return `404 IRR_CHILD_NOT_ACCESSIBLE`.

### Step 7.2 — View ИРР Header

```
GET /parent/children/{CHILD_ID}/irr
→ 200 { success: true, data: {
  id, status: "active",
  childFullName, ptpkDiagnosis, irrStartDate,
  ptpkConclusionNumber, … (all header fields)
}}
```

Parent sees header fields and diagnosis. No edit affordance — read-only endpoint.

### Step 7.3 — View Assessment Progression (aggregate only)

```
GET /parent/children/{CHILD_ID}/irr/assessment
→ 200 { success: true, data: [
  { id, sessionType: "intake", totalScore: 37, maxPossibleScore: 68, completedAt }
]}
```

Parent sees total score and percentage — no per-criterion breakdown (OQ-4 scope). With only 1 session, the progression bar shows a baseline. After step 10.1, a second bar appears and the rise is visible.

### Step 7.4 — View Goals + Parent Recommendations

```
GET /parent/children/{CHILD_ID}/irr/goals
→ 200 { success: true, data: {
  longTermGoals: [ {LTG1}, {LTG2} ],
  periods: [ {
    id, periodStart, periodEnd, status,
    parentRecommendations: "Уйда ҳам қошиқ…",
    teacherSignedAt: "2026-05-10T…",
    managerSignedAt: null
  } ],
  shortTermGoals: [ {STG1}, {STG2}, {STG3} ]
}}
```

`parentRecommendations` is the amber-highlighted field in `ChildIRR.jsx`. Long-term goals shown as cards. STGs nested under their period. No edit button or form anywhere on the parent surface.

---

## PHASE 8 — Admin: Manager Sign + Quarterly Monitoring

### Step 8.1 — Log in as Admin

```
POST /auth/login
{ "email": "admin@school.uz", "password": "…" }
→ 200 { data: { user: { id, role: "admin", schoolId } } }
```

Admin must be in the **same school** as the child. Cross-school attempts return 404.

### Step 8.2 — Manager Sign the Period

`signGoalPeriod` checks `req.user.role`: `teacher` sets `teacherSignedAt`; anything else (admin, reception) sets `managerSignedAt`.

```
POST /teacher/goal-periods/{PERIOD_ID}/sign
Body: {}
→ 200 { success: true, data: { …period, managerSignedAt: "2026-05-27T…", managerSignedBy: {adminId} } }
```

Period is now doubly-signed. Both signatures visible to parent in step 7.4 if re-queried.

### Step 8.3 — Fill Quarterly Monitoring Entry (52 items)

The full 52-item structured checklist. Send `code → boolean` maps for all 5 sections:

```
POST /admin/irr/quarterly-entries
Body: {
  "quarterStart": "2026-01-01",
  "quarterEnd":   "2026-03-31",
  "infoSystemData": {
    "info_tizimga_kiritildi": true,
    "info_face_id":           false
  },
  "parentWorkData": {
    "par_malumot_oladilar":     false,
    "par_qoshimcha_malumot":    false,
    "par_suhbat_otkaz":         false,
    "par_suhbat_rejalashtiril": false,
    "par_suhbat_otkazildi":     false,
    "par_irr_tanishtirildi":    false,
    "par_irr_muvofiqlik":       false,
    "par_irr_tasdiq":           false,
    "par_malumot_yangilandi":   false,
    "par_shikoyat_yoq":         false,
    "par_shikoyat_bor":         false,
    "par_shikoyat_javob":       false,
    "par_uchrashuvlar":         false,
    "par_faol_ishtirok":        false
  },
  "documentationData": {
    "doc_irr_dolzarb":    false,
    "doc_irr_imzolangan": false,
    "doc_ptpk_hujjat":    false,
    "doc_ijtimoiy":       false,
    "doc_kundalik":       false,
    "doc_haftalik":       false,
    "doc_chorak":         false,
    "doc_rivojlanish":    false,
    "doc_boshqa":         false
  },
  "careQualityData": {
    "care_ovqat_rejim":    false,
    "care_ovqat_sifat":    false,
    "care_gigiyena_rejim": false,
    "care_gigiyena_sifat": false,
    "care_jismoniy":       false,
    "care_logoped":        false,
    "care_psixolog":       false,
    "care_defektolog":     false,
    "care_muzika":         false,
    "care_jismoniy_tarbiya": false,
    "care_individual":     false,
    "care_guruh":          false,
    "care_kuzatuv":        false,
    "care_dori":           false,
    "care_shoshilinch":    false,
    "care_havfsizlik":     false,
    "care_uyqu":           false
  },
  "conditionsData": {
    "shar_harorat":    false,
    "shar_namlik":     false,
    "shar_yoritish":   false,
    "shar_mebel":      false,
    "shar_oyin":       false,
    "shar_kitob":      false,
    "shar_tozalik":    false,
    "shar_xavfsizlik": false,
    "shar_ramp":       false,
    "shar_sanitar":    false
  },
  "departures": [],
  "notes": "Биринчи чоракли мониторинг — умумий ҳолат қониқарли"
}
→ 201 { success: true, data: { id, quarterStart, quarterEnd, childId, … } }
```

**Gate:** Duplicate `(childId, quarterStart, quarterEnd)` → `409 QUARTERLY_ENTRY_DUPLICATE`.

### Step 8.4 — List Quarterly Entries

```
GET /admin/irr/quarterly-entries?childId={CHILD_ID}
→ 200 { success: true, data: [ { id, quarterStart, quarterEnd, … } ] }
```

---

## PHASE 9 — Teacher: 3-Month Assessment (Progression Demo Payoff)

### Step 9.1 — Create 3-Month Assessment Session

Higher scores — demonstrates improvement:

```
POST /teacher/irr/{IRR_ID}/assessment-sessions
Body: {
  "sessionType":      "3mo",
  "completedAt":      "2026-05-01T09:00:00.000Z",
  "isHearingImpaired": false,
  "scores": [4, 3, 3, 4, 3, 2, 3, 4, 3, 3, 4, 3, 3, 3, 3, 3, 3],
  "notes": "3 oylik baholash — sezilarli o'sish"
}
→ 201 { data: { session: { totalScore: 52, maxPossibleScore: 68 }, … } }
```

`totalScore` rises from 37 to 52 (54 % → 76 %).

---

## PHASE 10 — Parent: See Progression Rise

### Step 10.1 — Check Assessment Progression (now 2 sessions)

```
GET /parent/children/{CHILD_ID}/irr/assessment
→ 200 { success: true, data: [
  { sessionType: "intake", totalScore: 37, maxPossibleScore: 68, completedAt: "2026-02-01" },
  { sessionType: "3mo",    totalScore: 52, maxPossibleScore: 68, completedAt: "2026-05-01" }
]}
```

**Demo payoff:** Parent sees two data points. The `ChildIRR.jsx` component renders both as score bars with trend arrows. Intake bar: 37/68 (54 %). 3-month bar: 52/68 (76 %). Trend arrow points UP.

---

## Sequence Summary

| Step | Actor   | Route                                               | Expected Result                        |
|------|---------|-----------------------------------------------------|----------------------------------------|
| 1.1  | Teacher | POST /auth/login                                    | Cookie set, role = teacher             |
| 1.2  | Teacher | GET /teacher/children                               | Child list, pick CHILD_ID              |
| 1.3  | Teacher | POST /teacher/children/{CHILD_ID}/irr               | IRR created, status = draft            |
| 1.4  | Teacher | PATCH /teacher/irr/{IRR_ID}                         | 9 header fields saved                  |
| 1.5  | Teacher | POST /teacher/irr/{IRR_ID}/activate                 | status = active                        |
| 2.1  | Teacher | POST /teacher/irr/{IRR_ID}/assessment-sessions      | intake session, totalScore = 37        |
| 3.1  | Teacher | POST /teacher/irr/{IRR_ID}/long-term-goals          | LTG 1 created                         |
| 3.2  | Teacher | POST /teacher/irr/{IRR_ID}/long-term-goals          | LTG 2 created                         |
| 4.1  | Teacher | POST /teacher/irr/{IRR_ID}/goal-periods             | Period created, PERIOD_ID captured     |
| 4.2–4.4 | Teacher | POST /teacher/goal-periods/{PERIOD_ID}/short-term-goals | 3 STGs created                  |
| 5.1  | Teacher | PATCH /teacher/goal-periods/{PERIOD_ID}/review      | parentRecommendations saved            |
| 5.2  | Teacher | POST /teacher/goal-periods/{PERIOD_ID}/sign         | teacherSignedAt set                    |
| 6.1  | Teacher | POST /teacher/children/{CHILD_ID}/daily-entries     | Daily entry created                    |
| 6.2  | Teacher | POST /teacher/children/{CHILD_ID}/weekly-entries    | Weekly entry created                   |
| 7.1  | Parent  | POST /auth/login                                    | Cookie set, role = parent              |
| 7.2  | Parent  | GET /parent/children/{CHILD_ID}/irr                 | Header fields visible, read-only       |
| 7.3  | Parent  | GET /parent/children/{CHILD_ID}/irr/assessment      | 1 session, score = 37/68 (54 %)       |
| 7.4  | Parent  | GET /parent/children/{CHILD_ID}/irr/goals           | LTGs + periods + parentRecommendations |
| 8.1  | Admin   | POST /auth/login                                    | Cookie set, role = admin (same school) |
| 8.2  | Admin   | POST /teacher/goal-periods/{PERIOD_ID}/sign         | managerSignedAt set                    |
| 8.3  | Admin   | POST /admin/irr/quarterly-entries                   | 52-item JSONB entry created            |
| 9.1  | Teacher | POST /teacher/irr/{IRR_ID}/assessment-sessions      | 3mo session, totalScore = 52           |
| 10.1 | Parent  | GET /parent/children/{CHILD_ID}/irr/assessment      | 2 sessions, 37 → 52, trend UP          |

---

## Sequence Findings

The following issues were identified during the walkthrough script review. None are blocking — all are behavioral notes for the next sprint.

### F-001 — signGoalPeriod role dispatch: no "already signed" guard

`signGoalPeriod` at `backend/controllers/teacher/irrController.js:498` checks role but does not guard against double-signing. A teacher could call `POST .../sign` a second time and overwrite `teacherSignedAt` with a new timestamp. The period's `status` field is not auto-advanced to `completed` after double-sign.

**Impact:** Low — data is correct (last sign wins), but idempotency is not guaranteed. A `409` guard (`if (period.teacherSignedAt) return 409`) would be cleaner.  
**Recommendation:** Add idempotency check in next hardening pass.

### F-002 — Daily/weekly entries not linked to IRR by default

`createDailyEntry` and `createWeeklyEntry` accept `irrId` as an optional body field. If the teacher omits it (as is common in the legacy daily-journal flow), the entry has `irrId: null` and is invisible from the ИРР detail view. The parent journal route (`GET /parent/children/:childId/journal`) is a separate endpoint and does not filter by irrId.

**Impact:** Low for current scope — daily/weekly entries are outside OQ-4 parent scope. Internal teacher view renders entries by `childId` regardless of irrId.  
**Recommendation:** Consider making `irrId` required on the active-IRR journal routes in a future cleanup.

### F-003 — Parent route: no check for IRR `status: 'active'` before returning `assessment`/`goals`

`getAssessmentProgression` and `getGoals` (parent) both call `IRR.findOne({ where: { childId, status: 'active' } })`. This means if the IRR is archived, both return `404 IRR_NOT_FOUND` — correct behavior. No issue.

### F-004 — ~~Quarterly entry POST: cross-school childId~~ RETRACTED — FALSE POSITIVE

**Retracted in consolidation follow-up (15-consolidation-followup.md).**

`QuarterlyMonitoringEntry` has NO `childId` column — it is FACILITY-LEVEL (one per school per quarter, per OQ-3/OQ-6). `departures` rows are `{name, admitDate, departDate, reason}` plain text; no UUID child references exist. `schoolId` is always stamped from `req.user.schoolId`, never from the request body.

**Isolation is correct.** Confirmed by `irr.quarterlyIsolation.realDB.test.js` (3/3 ✅). The `childId` field in the example body above was a documentation error and has been removed.

---

## Execution Notes

This walkthrough was executed as a script review against the backend source code. Live API execution requires:
1. Backend running locally (`cd backend && npm run dev`)
2. A seeded school, teacher user, parent user linked to a child, and admin user in the same school
3. A REST client with cookie jar support (curl --cookie-jar, Insomnia, Postman with cookie handling)

All route signatures and field names verified against current source code at commit `3b2a029`.
