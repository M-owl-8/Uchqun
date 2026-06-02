# GOV-INSTITUTION-TYPES — Institution Type Taxonomy + Tarbiyachi Rename

**Date:** 2026-06-02  
**Status:** ✅ CLOSED

---

## Pre-flight inventory

### Current school type field

`backend/models/School.js` (before this change):
```js
type: {
  type: DataTypes.ENUM('school', 'kindergarten', 'both'),
  defaultValue: 'both',
  allowNull: false,
},
```

Migration that created it: `20260117100000-create-schools.js` — `CREATE TYPE "enum_schools_type" AS ENUM('school', 'kindergarten', 'both')`.

**Existing schools type:** all 4 seed schools (`tmm1`, `tmm2`, `smm1`, `smm2`) have type `both` per the original seed data. These are "Maxsus Maktab" (Special Schools) for children with disabilities.

**No Cyrillic UZ frontend locales.** Portals use only Latin UZ (`uz`) and Russian (`ru`). Cyrillic UZ exists only in backend i18n error code files.

### Government portal filter dropdown (before)
```jsx
<option value="school">{t('schools.typeSchool')}</option>     // "Maktab"
<option value="kindergarten">{t('schools.typeKindergarten')}</option>  // "Bog'cha"
<option value="both">{t('schools.typeBoth')}</option>         // "Aralash"
```

### O'qituvchi references found
Across 5 portals × 3 locales: 70+ string values containing "O'qituvchi" (UZ) or "Учитель" (RU). Also 10+ hardcoded strings in JSX files.

---

## STEP 1 — Institution Type Taxonomy

### 1a — Schema migration: `20260602000003-update-school-type-enum.js`

**Strategy:** Postgres ENUM mutation is fragile. Used a temp VARCHAR column with CHECK constraint — clean and reversible.

**Up migration:**
1. Add `type_new VARCHAR(32)` with CHECK constraint for 5 new values
2. Migrate: `both` → `support`, `kindergarten` → `daycare`, `school` → `support`
3. Drop old ENUM column + `enum_schools_type` type
4. Rename `type_new` → `type`
5. Re-add index

**Down migration:** reverses completely with temp column → old ENUM.

**Existing data mapping:**
| School | Old type | New type | Rationale |
|---|---|---|---|
| tmm1, tmm2, smm1, smm2 | `both` | `support` | "Maxsus Maktab" = special support schools for school-age children |
| Any `school` schools | `school` | `support` | Special schools, school-age oriented |
| Any `kindergarten` schools | `kindergarten` | `daycare` | Closest equivalent: preschool daycare |

### 1b — Model update: `backend/models/School.js`

```js
// Before:
type: { type: DataTypes.ENUM('school', 'kindergarten', 'both'), defaultValue: 'both' }

// After:
type: {
  type: DataTypes.STRING(32),
  defaultValue: 'support',
  allowNull: false,
  validate: { isIn: [['daycare', 'early_preschool', 'support', 'early_intervention', 'home_care']] },
},
```

### 1c — Locale strings: all portals

New type labels added to UZ, RU, EN locales of government portal (`schools.type*`):

| Code | UZ (Latin) | RU |  EN |
|---|---|---|---|
| `daycare` | Kunduzgi parvarish | Дневной уход | Day care |
| `early_preschool` | Yangi kun | Новый день | Early preschool |
| `support` | Madad | Поддержка | Support |
| `early_intervention` | Erta aralashuv | Раннее вмешательство | Early intervention |
| `home_care` | Uyda qarab turish | Домашний уход | Home care |

Keys added: `schools.typeDaycare/typeEarlyPreschool/typeSupport/typeEarlyIntervention/typeHomeCare` and corresponding `government.schoolType*` keys. Old `typeSchool/typeKindergarten/typeBoth` keys removed.

### 1d — Frontend updates

**`government/src/pages/Schools.jsx`:**
- `typeLabel()` function updated with 5 new cases
- Filter dropdown `<select>` updated with 5 new `<option>` values

**`government/src/pages/SchoolDetail.jsx`:**
- Type display was raw `school.type` (showing "support", "daycare" etc. verbatim)
- Fixed: inline IIFE maps type code to localized label using `t('schools.typeX')`

**School creation form:** No government creation UI for schools exists yet. Schools are onboarded via self-registration (admin portal) or direct database seeding. This is an inventory item for a future session.

### 1e — Backend endpoints

`governmentController.getSchoolsStats` does not accept a `type` filter parameter — filtering is client-side. No backend changes needed.

---

## STEP 2 — Tarbiyachi Terminology Rename

**Decision on English:** English locale retains "Teacher". The platform targets Uzbek and Russian users; English is dev-convenience only. Documented.

### 2a — Locale files updated

| Portal | UZ locale | RU locale |
|---|---|---|
| Government | ✅ All "O'qituvchi*" → "Tarbiyachi*" | ✅ All "Учитель*" → "Воспитатель*" |
| Admin | ✅ nav, dashboard, teachersPage, teacherDetail, roleTeacher | ✅ same |
| Reception | ✅ nav, dashboard stats, teachersPage (14 strings), parentsPage, groupsPage | ✅ same |
| Teacher | ✅ app title, role display, activity/chat/IRR strings | ✅ same |
| Parent (in teacher/src/parent) | ✅ child error, chat, rating page, help strings, contactTeacher | ✅ same |

**UZ replacements:** O'qituvchi → Tarbiyachi, O'qituvchilar → Tarbiyachilar, o'qituvchi → tarbiyachi, o'qituvchilar → tarbiyachilar + all grammatical case forms.

**RU replacements:** Учитель → Воспитатель (all cases: именительный Воспитатели, родительный Воспитателей, дательный Воспитателю, accusative Воспитателя).

### 2b — Hardcoded JSX strings fixed

| File | Before | After |
|---|---|---|
| `government/src/pages/SchoolDetail.jsx:250` | `"O'qituvchilar"` (defaultValue) | `"Tarbiyachilar"` |
| `government/src/pages/SchoolDetail.jsx:579` | `"O'qituvchilar"` (tab label default) | `"Tarbiyachilar"` |
| `government/src/pages/AdminDetails.jsx:68` | `"O'qituvchilar"` (stat card default) | `"Tarbiyachilar"` |
| `government/src/pages/AdminDetails.jsx:216` | `"O'qituvchilar"` (section heading default) | `"Tarbiyachilar"` |
| `reception/src/pages/Dashboard.jsx:370` | `"O'qituvchilar"` (total stat default) | `"Tarbiyachilar"` |
| `reception/src/pages/TeacherManagement.jsx:158,175,189` | 3 defaultValue strings | Updated |
| `reception/src/pages/ParentWizard/steps/GroupStep.jsx:86` | `{"O'qituvchi"}` | `{"Tarbiyachi"}` |
| `admin/src/pages/BulkImport.jsx:21` | `"O'qituvchi majburiy"` | `"Tarbiyachi majburiy"` |
| `teacher/src/parent/pages/ChildIRR.jsx:192,244` | 2 defaultValue strings | Updated |
| `teacher/src/parent/components/CallTeacherButton.jsx:7` | default label | Updated |
| `teacher/src/parent/components/DayStack.jsx:15` | hardcoded string | Updated |
| `teacher/src/parent/pages/childProfile/EmotionalMonitoringSection.jsx:27` | defaultValue | Updated |

**12 JSX files with hardcoded strings fixed.**

Note: `teacher/src/__tests__/pages/Settings.test.jsx` contains `"O'qituvchi muammo"` — this is mock test data (a message subject), not a UI label. Left intentionally.

### 2c — Code identifiers not changed (intentional)

Role `'teacher'`, model `Teacher`, routes `/reception/teachers`, file names, i18n key names (e.g. `teachersPage.title`), audit log entries — all unchanged. Only values changed.

### 2d — Backend i18n translation files

Added `SCHOOL_NOT_ASSIGNED` (new error code from previous session's `GET /reception/school-info` endpoint) to all 3 backend i18n files. `SCHOOL_NOT_FOUND` already existed. Count updated: 217 → 218.

---

## STEP 3 — Test results

**Backend:** `134/134 suites, 1412/1412 tests — all green**

- `i18n.test.js`: EXPECTED_CODE_COUNT updated 217 → 218. All 3 language files pass count + catalog + non-empty checks.
- Migration test: Not applicable (migration runs on Railway, no unit test for the migration itself — the model validation test covers the new enum values implicitly).
- No pre-existing tests reference old enum values (`school`, `kindergarten`, `both`).

---

## STEP 4 — Honest count

| Category | Status |
|---|---|
| Migration (enum → VARCHAR+CHECK) | ✅ Written (runs on next Railway deploy) |
| Existing schools mapped (both → support) | ✅ In migration |
| Model validation updated | ✅ 5 new values, `DataTypes.STRING(32)` + validate.isIn |
| Government portal type filter dropdown | ✅ 5 options |
| Government portal type display (SchoolDetail) | ✅ Localized label (was raw code string) |
| School creation form (government) | ⚠️ No creation UI exists yet — inventory item |
| UZ locale: all portals teacher → tarbiyachi | ✅ 5 portals |
| RU locale: all portals учитель → воспитатель | ✅ 5 portals |
| EN locale: Teacher kept (documented decision) | ✅ No changes made |
| Hardcoded JSX strings | ✅ 12 files fixed |
| Backend i18n files (SCHOOL_NOT_ASSIGNED) | ✅ 3 files, 218 codes each |
| Test count accurate | ✅ EXPECTED_CODE_COUNT = 218 |

### Residuals

**Medium: School creation form** — Government portal has no UI for creating new schools. New schools are created via admin self-registration flow (which uses the admin registration controller) or direct seeding. The type field in the model now accepts 5 values. When a creation UI is built, it must use the 5-value taxonomy. Tracked as backlog item.

**Native-speaker review** — UZ Latin grammatical case forms for Tarbiyachi (genitive, dative, accusative) were updated by AI substitution. Require native Uzbek speaker review before production (same as PL-009-VERIFY). Added to `LOOP_PRE_LAUNCH_CHECKLIST.md`.

**Russian grammatical cases** — Воспитатель case forms were applied by rule (masculine 2nd declension). Require native Russian speaker review.

---

## STEP 5 — Adjacent observations

- The `schoolDetail` locale keys still reference "maktab" (school) in some labels like `confirmArchive: "Ushbu maktabni arxivlashni..."` — these should eventually say "muassasani" for consistency. Deferred.
- Government portal still shows "Maktablar" in some dashboard strings while others say "Muassasalar". Terminology not fully unified. Deferred.
- Teacher portal title "Uchqun Tarbiyachi" is now correct. Parent portal "Tarbiyachi" branding consistent.
