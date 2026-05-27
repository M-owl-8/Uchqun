# PL-009 Translation Review — ИРР Scope

**Purpose:** Prepare all AI-generated ИРР strings for native-speaker review. Do NOT change translations — scope, organize, and prioritize only.

**Date scoped:** 2026-05-27  
**Scope:** All uz (Uzbek Cyrillic) and ru (Russian) strings in the ИРР feature across teacher + parent + admin portals.  
**Sources:** `shared/config/` (5 files) · `teacher/src/locales/uz/common.json` · `backend/i18n/uz-cyrl.json` + `ru.json`  
**Total items requiring review:** ~281 uz+ru pairs (~562 individual strings)

---

## Summary by Area

| Area | Items | Priority | Source |
|---|---|---|---|
| A — Assessment criteria (17 criterion names) | 17 | **P1 — Clinical standard** | `shared/config/assessmentCriteria.js` |
| B — Assessment level descriptions (17 × 5 levels) | 85 | **P1 — Clinical standard** | `shared/config/assessmentCriteria.js` |
| C — Skill areas (5) | 5 | **P1 — Standard terminology** | `shared/config/skillAreas.js` |
| D — Daily journal items (27) | 27 | **P1 — Clinical checklist** | `shared/config/dailyJournalItems.js` |
| E — Weekly journal items (18) | 18 | **P1 — Clinical checklist** | `shared/config/weeklyJournalItems.js` |
| F — Quarterly monitoring items (52) | 52 | **P1 — Standard checklist** | `shared/config/quarterlyJournalItems.js` |
| G — Teacher UI strings (irr section, ~19 items) | 19 | P2 — UI labels/buttons | `teacher/src/locales/uz/common.json` |
| H — Backend error codes (IRR-related, ~58 codes) | 58 | P2 — Error messages | `backend/i18n/uz-cyrl.json` + `ru.json` |
| **Total** | **~281** | | |

---

## AREA A — Assessment Criteria Names (17 items) ⚠️ PRIORITY 1

These appear directly in the teacher scoring screen and parent progression view. Ministry reviewers will compare against the printed СТАНДАРТ PDF. Wrong Uzbek = credibility failure.

| Code | English | Current uz | Current ru |
|---|---|---|---|
| SELF_FEEDING | Can eat independently? (including eating and drinking) | Мустақил овқатланадими? (шу жумладан овқатланиш ва ичиш) | Может ли питаться самостоятельно? (включая приём пищи и питьё) |
| PERSONAL_HYGIENE | Maintains personal hygiene (including washing, bathing, brushing teeth) | Шахсий гигиенага риоя қилади (шу жумладан ювиниш, ванна қабул қилиш ва тишларни тозалаш) | Соблюдает личную гигиену (включая умывание, купание и чистку зубов) |
| DRESSING | Gets dressed and undressed | Кийинади ва ечинади | Одевается и раздевается |
| TOILET_USE | Uses toilet (goes to toilet) | Горшокдан фойдаланади (ҳожатхонага боради) | Пользуется туалетом (ходит в туалет) |
| BOWEL_CONTROL | Controls bowel and bladder | Нажас ва сийдикни ушлаб туришни бошқаради | Контролирует мочеиспускание и дефекацию |
| SIMPLE_INSTRUCTIONS | Understands simple instructions | Оддий кўрсатмаларни тушунади | Понимает простые инструкции |
| EXPRESS_NEEDS | Expresses own needs (asks for water?) | Ўз эҳтиёжларини билдиради (сув сўрайди?) | Выражает свои потребности (просит воду?) |
| VERBAL_COMMUNICATION | Can speak / communicate verbally | Гаплаша олади | Может говорить / общаться вербально |
| SIGN_COMMUNICATION | Understands movements and signs used for communication? For children with hearing disabilities | Мулоқот учун қўлланиладиган ҳаракат ва ишораларни тушунадими? Эшитиш қобилияти чекланган болалар учун | Понимает ли движения и знаки, используемые для общения? Для детей с нарушением слуха |
| SIT_INDEPENDENTLY | Can sit independently | Мустақил ўтиради | Сидит самостоятельно |
| STAND | Can stand, including from seated position | Тура олади, жумладан ўтирган ҳолатдан ҳам тура олади | Может стоять, в том числе вставать из положения сидя |
| CLIMB_STAIRS | Climbs at least 10 stairs | Камида 10 та зинапоядан чиқади | Поднимается минимум на 10 ступеней |
| INDOOR_MOBILITY | Can move inside the house by walking, crawling, or using a wheelchair | Уй ичида юриш, эмаклаб юриш ва аравачадан фойдаланган ҳолда ҳаракатлана олади | Может передвигаться внутри помещения пешком, ползком или на коляске |
| UNUSUAL_BEHAVIOR | Shows unusual behavior | Ўзини ноодатий тутади | Проявляет необычное поведение |
| SEIZURES | Seizures / convulsions | Тутқаноқ ҳуружлари | Судорожные припадки |
| FAMILY_PARTICIPATION | Participates in family life? | Оилавий ҳаётда иштирок этадими? | Участвует в семейной жизни? |
| HOUSEHOLD_TASKS | Does household tasks? | Уй ишларини бажарадими? | Выполняет ли домашние обязанности? |

---

## AREA B — Level Descriptions (85 items) ⚠️ PRIORITY 1

Level descriptions appear on each criterion card during assessment scoring. Criteria 1–13 use ability-type levels; 14–15 use frequency; 16–17 use participation. The Uzbek Cyrillic text for criteria 1–13 uses shared level strings (4 of the 5 levels repeat across most criteria). Criteria 5, 14, 15 have unique level text.

**Shared ability-type levels (criteria 1–4, 6–13: ~12 criteria):**

| Level | English | Current uz | Current ru |
|---|---|---|---|
| 4 (best) | Does independently | Мустақил бажаради | Выполняет самостоятельно |
| 3 | Almost without help | Деярли ҳеч қандай ёрдамсиз | Почти без посторонней помощи |
| 2 | With some help or sometimes | Бироз ёрдам билан ёки баъзан | С небольшой помощью или иногда |
| 1 | Does with others' help | Бошқалар ёрдамида бажаради | Выполняет с помощью других |
| 0 (worst) | Cannot do it | Бажара олмайди | Не может выполнить |

**Communication-type levels (criteria 6–7, SIMPLE_INSTRUCTIONS + EXPRESS_NEEDS):**

| Level | English | Current uz | Current ru |
|---|---|---|---|
| 4 | Easily | Осон | Легко |
| 3 | With slight difficulty | Озгина қийинчилик билан | С небольшим затруднением |
| 2 | With some difficulty | Баъзи қийинчиликлар билан | С некоторыми затруднениями |
| 1 | With great difficulty | Катта қийинчиликлар билан | С большими затруднениями |
| 0 | Does not understand / Cannot express | Тушунмайди / Тушунмайди | Не понимает / Не может выразить |

**Criterion 5 — BOWEL_CONTROL (unique levels):**

| Level | English | Current uz | Current ru |
|---|---|---|---|
| 4 | Controls both | Иккаласини ҳам бошқаради | Контролирует оба |
| 3 | Almost controls urination, controls bowel | Сийдикни ушлаб туришни деярли эплайди, нажасни ушлаб туради | Почти контролирует мочеиспускание, контролирует дефекацию |
| 2 | Often cannot control urination | Кўпинча сийдикни ушлаб туришни бошқара олмайди | Часто не может контролировать мочеиспускание |
| 1 | Cannot control urination | Сийдикни ушлаб тура олмайди | Не может контролировать мочеиспускание |
| 0 | Cannot control bowel movements | Нажасни ушлаб тура олмайди | Не может контролировать дефекацию |

**Criterion 14 — UNUSUAL_BEHAVIOR (frequency type):**

| Level | English | Current uz | Current ru |
|---|---|---|---|
| 4 | Never | Ҳеч қачон | Никогда |
| 3 | Yes, but rarely (once a month or less) | Ха, лекин камдан-кам (ойига бир марта ёки камроқ) | Да, но редко (раз в месяц или реже) |
| 2 | Yes, sometimes (once a week) | Ха, баъзида (ҳафтада бир марта) | Да, иногда (раз в неделю) |
| 1 | Yes, often (every day) | Ха, тез-тез (ҳар куни) | Да, часто (каждый день) |
| 0 | Yes, regularly (several times a day) | Ха мунтазам (кунига бир неча марта) | Да, регулярно (несколько раз в день) |

**Criterion 15 — SEIZURES (frequency type):**

| Level | English | Current uz | Current ru |
|---|---|---|---|
| 4 | Never | Ҳеч қачон | Никогда |
| 3 | Yes, fewer than 3 times a year | Ха, йилига 3 мартадан кам | Да, менее 3 раз в год |
| 2 | Yes, approximately once a month | Ха, тахминан ойига бир марта | Да, примерно раз в месяц |
| 1 | Yes, approximately once a week (rarely) | Ха, тахминан ҳафтада бир марта камдан-кам | Да, примерно раз в неделю (редко) |
| 0 | Yes, every day | Ха, ҳар куни | Да, каждый день |

**Criterion 16 — FAMILY_PARTICIPATION (participation type):**

| Level | English | Current uz | Current ru |
|---|---|---|---|
| 4 | Yes, equally with other family members | Ха, оиланинг бошқа аъзолари қатори тенг равишда | Да, наравне с другими членами семьи |
| 3 | Yes, frequently participates in family life | Ха, оилавий ҳаётда тез-тез иштирок этади | Да, часто участвует в семейной жизни |
| 2 | Yes, sometimes | Ха, баъзан | Да, иногда |
| 1 | Rarely participates | Камдан-кам иштирок этади | Редко участвует |
| 0 | Does not participate at all | Умуман иштирок этмайди | Совсем не участвует |

**Criterion 17 — HOUSEHOLD_TASKS (participation type):**

| Level | English | Current uz | Current ru |
|---|---|---|---|
| 4 | Yes, does all tasks | Ха, барча ишларни бажаради | Да, выполняет все обязанности |
| 3 | Does most but not all | Кўпини бажаради, лекин ҳаммасини эмас | Выполняет большинство, но не все |
| 2 | Does some tasks | Бир қатор вазифаларни бажаради | Выполняет ряд обязанностей |
| 1 | Does only a few tasks | Баъзи ишларни бажаради | Выполняет некоторые обязанности |
| 0 | Does not do any tasks | Бажармайди | Не выполняет |

---

## AREA C — Skill Areas (5 items) ⚠️ PRIORITY 1

Used as category labels for short-term goals throughout the ИРР.

| Code | English | Current uz | Current ru |
|---|---|---|---|
| SELF_CARE_FEEDING | Self-service skills (eating) | Ўз-ўзига хизмат кўрсатиш кўникмалари (овқатланиш) | Навыки самообслуживания (питание) |
| SELF_CARE_HYGIENE | Self-service skills (hygiene) | Ўз-ўзига хизмат кўрсатиш кўникмалари (гигиена) | Навыки самообслуживания (гигиена) |
| COMMUNICATION | Communication skills | Коммуникатив кўникмалар | Коммуникативные навыки |
| SOCIAL_EMOTIONAL | Social-emotional development | Ижтимоий-ҳиссий ривожланиш | Социально-эмоциональное развитие |
| PHYSICAL | Physical development | Жисмоний ривожланиш | Физическое развитие |

---

## AREA D — Daily Journal Items (27 items) ⚠️ PRIORITY 1

Used by teachers on the daily monitoring form. Source: government СТАНДАРТ PDF pp.20–21.

> Full table: see `shared/config/dailyJournalItems.js`. Excerpts below for reviewer orientation.

**Section: Гигиена (Hygiene) — 9 items**

| Code | English | Current uz | Current ru |
|---|---|---|---|
| hyg_morning_wash | Morning wash performed | Эрталаб ювиниш амалга оширилди | Утреннее умывание выполнено |
| hyg_teeth_brushed | Teeth brushed | Тишлар тозаланди | Зубы почищены |
| hyg_hands_before_meal | Hands washed before meal | Овқатдан олдин қўллар ювилди | Руки вымыты перед едой |
| hyg_hands_after_toilet | Hands washed after toilet | Ҳожатхонадан кейин қўллар ювилди | Руки вымыты после туалета |
| hyg_hair_combed | Hair combed | Сочлар тараланди | Волосы расчёсаны |
| hyg_clothes_clean | Clothes clean and tidy | Кийимлар тоза ва озода | Одежда чистая и опрятная |
| hyg_nails_checked | Nails checked | Тирноқлар текширилди | Ногти проверены |
| hyg_face_clean | Face clean | Юз тоза | Лицо чистое |
| hyg_nose_clean | Nose clean | Бурун тоза | Нос чистый |

**Section: Соғлиқ (Health) — 11 items**  
Includes temperature check, medication, skin condition, appetite, hydration, mobility, behavior/mood, pain/discomfort, sleep, family contact, and specialist visit. See config for full list.

**Section: ОЙТ (Gastrointestinal) — 7 items**  
Includes defecation frequency/consistency, urination frequency/color, incontinence incidents, constipation, and diarrhea indicators. See config for full list.

*(Full 27-item table: reviewer should read `shared/config/dailyJournalItems.js` directly for all uz/ru strings.)*

---

## AREA E — Weekly Journal Items (18 items) ⚠️ PRIORITY 1

Used by teachers on the weekly monitoring form. Source: government СТАНДАРТ PDF pp.22.

**Section: Эмоционал ҳолат (Emotional State) — 9 items**  
Codes: `emo_mood_stable`, `emo_engaged_activities`, `emo_positive_peers`, `emo_responded_well`, `emo_separation_ok`, `emo_no_tantrums`, `emo_communicates_needs`, `emo_comforted_easily`, `emo_overall_positive`

**Section: Муҳит (Environment) — 9 items**  
Codes: `env_safe_environment`, `env_appropriate_materials`, `env_routine_consistent`, `env_clean_hygienic`, `env_appropriate_noise`, `env_transitions_smooth`, `env_peer_interaction`, `env_sensory_needs`, `env_staff_responsive`

*(Full 18-item table: reviewer should read `shared/config/weeklyJournalItems.js` directly for all uz/ru strings.)*

---

## AREA F — Quarterly Monitoring Items (52 items) ⚠️ PRIORITY 1

Used by managers on the quarterly facility-level monitoring form. Source: government СТАНДАРТ PDF pp.23–25. OQ-10: parentWork section count provisional (14 visible, partner to confirm).

| Section | Count | Config key |
|---|---|---|
| Ахборот тизими (Info system) | 2 | `infoSystem` |
| Ота-оналар билан иш (Parent work) | 14 ⚠️ OQ-10 | `parentWork` |
| Ҳужжатчилик (Documentation) | 9 | `documentation` |
| Парвариш сифати (Care quality) | 17 | `careQuality` |
| Шарт-шароит (Conditions) | 10 | `conditions` |

*(Full 52-item table: reviewer should read `shared/config/quarterlyJournalItems.js` directly for all uz/ru strings.)*

---

## AREA G — Teacher UI Strings / irr section (~19 key groups) — Priority 2

Source: `teacher/src/locales/uz/common.json` → `"irr"` object and `"irr.assessment"` subsection.

| Key | English (defaultValue) | Current uz | Current ru |
|---|---|---|---|
| irr.pageTitle | Individual Development Plan | Индивидуал Ривожланиш Режаси | *(see ru locale)* |
| irr.newIrr | Create ИРР | ИРР тузиш | *(see ru locale)* |
| irr.viewIrr | View ИРР | ИРРни кўриш | *(see ru locale)* |
| irr.statusDraft | Draft | Qoralama | *(see ru locale)* |
| irr.statusActive | Active | Faol | *(see ru locale)* |
| irr.statusArchived | Archived | Arxivlangan | *(see ru locale)* |
| irr.fieldChildFullName | Child's full name | Боланинг фамилияси, исми | *(see ru locale)* |
| irr.fieldPtpkIntakeDate | ПТПК intake date | ПТПКга келиб тушган сана | *(see ru locale)* |
| irr.fieldPtpkConclusionDate | ПТПК conclusion date | ПТПК хулосаси санаси | *(see ru locale)* |
| irr.fieldPtpkConclusionNumber | ПТПК registration number | ПТПК рўйхатдан ўтказиш рақами | *(see ru locale)* |
| irr.fieldPtpkDiagnosis | ПТПК diagnosis | ПТПК ташхиси | *(see ru locale)* |
| irr.activate | Activate ИРР | ИРРни faollashtirish | *(see ru locale)* |
| irr.assessment.sectionTitle | Assessment results | Baholash natijalari | *(see ru locale)* |
| irr.assessment.sessionTypeIntake | At daycare admission | Kunduzgi parvarish xizmatiga qabul qilinganida | *(see ru locale)* |
| irr.assessment.sessionType3mo | After 3 months | 3 oydan keyin | *(see ru locale)* |
| irr.assessment.errSessionExists | Assessment of this type already exists | Bu turdagi baholash allaqachon mavjud… | *(see ru locale)* |
| irr.assessment.errIncomplete | Assess all 17 criteria | Barcha 17 ta mezonni baholang. | *(see ru locale)* |
| managerIrr.* | Manager IRR section (19 keys, inline defaultValues only — not yet in locale files) | Not extracted to locale yet | Not extracted to locale yet |

> **Note:** The admin `ManagerIRR.jsx` uses inline `t('managerIrr.*', { defaultValue: '...' })` — these strings have not yet been extracted to locale files. They exist only as component defaultValues. Before beta, extract to locale files for translator access.

---

## AREA H — Backend Error Codes (IRR-related, ~58 codes) — Priority 2

Source: `backend/i18n/uz-cyrl.json` and `backend/i18n/ru.json`. All AI-generated.

**IRR core (~8 codes):**  
`IRR_CHILD_NOT_ACCESSIBLE`, `IRR_ALREADY_EXISTS`, `IRR_NOT_FOUND`, `IRR_HEADER_INCOMPLETE`, `IRR_INVALID_STATUS`, `IRR_CREATE_FAILED`, `IRR_FETCH_FAILED`, `IRR_UPDATE_FAILED`

**Assessment (~10 codes):**  
`ASSESSMENT_INVALID_TYPE`, `ASSESSMENT_SESSION_EXISTS`, `ASSESSMENT_INCOMPLETE`, `ASSESSMENT_INVALID_SCORE`, `ASSESSMENT_CRITERIA_MISSING`, `ASSESSMENT_SCORE_CHILD_NOT_ACCESSIBLE`, `ASSESSMENT_SESSION_NOT_FOUND`, `ASSESSMENT_SCORE_NOT_FOUND`, `ASSESSMENT_SESSION_CREATE_FAILED`, `ASSESSMENT_SESSION_LIST_FAILED`

**Long-term goals (~6 codes):**  
`LONG_TERM_GOAL_NOT_FOUND`, `LONG_TERM_GOAL_TEXT_TOO_SHORT`, `LONG_TERM_GOAL_CREATE_FAILED`, `LONG_TERM_GOAL_UPDATE_FAILED`, `LONG_TERM_GOAL_DELETE_FAILED`, `LONG_TERM_GOAL_LIST_FAILED`

**Goal periods (~5 codes):**  
`GOAL_PERIOD_NOT_FOUND`, `GOAL_PERIOD_DATES_REQUIRED`, `GOAL_PERIOD_CREATE_FAILED`, `GOAL_PERIOD_UPDATE_FAILED`, `GOAL_PERIOD_LIST_FAILED`

**Short-term goals (~6 codes):**  
`SHORT_TERM_GOAL_NOT_FOUND`, `SHORT_TERM_GOAL_TEXT_TOO_SHORT`, `SHORT_TERM_GOAL_CREATE_FAILED`, `SHORT_TERM_GOAL_UPDATE_FAILED`, `SHORT_TERM_GOAL_DELETE_FAILED`, `SHORT_TERM_GOAL_LIST_FAILED`

**Daily monitoring (~5 codes):**  
`DAILY_ENTRY_CHILD_NOT_ACCESSIBLE`, `DAILY_ENTRY_DATE_REQUIRED`, `DAILY_ENTRY_DUPLICATE`, `DAILY_ENTRY_CREATE_FAILED`, `DAILY_ENTRY_LIST_FAILED`

**Weekly monitoring (~5 codes):**  
`WEEKLY_ENTRY_CHILD_NOT_ACCESSIBLE`, `WEEKLY_ENTRY_DATE_REQUIRED`, `WEEKLY_ENTRY_DUPLICATE`, `WEEKLY_ENTRY_CREATE_FAILED`, `WEEKLY_ENTRY_LIST_FAILED`

**Quarterly monitoring (~5 codes):**  
`QUARTERLY_ACCESS_DENIED`, `QUARTERLY_ENTRY_DATES_REQUIRED`, `QUARTERLY_ENTRY_DUPLICATE`, `QUARTERLY_ENTRY_CREATE_FAILED`, `QUARTERLY_ENTRY_LIST_FAILED`

**Goal period signing (~4 codes):**  
`GOAL_PERIOD_SIGN_NOT_FOUND`, `GOAL_PERIOD_ALREADY_SIGNED`, `GOAL_PERIOD_SIGN_FAILED`, `GOAL_PERIOD_TEACHER_SIGN_ONLY`

*(See `backend/i18n/uz-cyrl.json` and `ru.json` for current uz/ru strings for all codes above.)*

---

## Partner Handoff Note

**Total strings requiring native review: ~281 uz+ru pairs (~562 individual strings)**

**Priority 1 (clinical/standard terminology — ministry credibility):**
- 17 assessment criterion names (Areas A)
- 85 level descriptions (Area B) — 17 criteria × 5 levels
- 5 skill-area labels (Area C)
- 27 daily journal items (Area D)
- 18 weekly journal items (Area E)
- 52 quarterly monitoring items (Area F)
- **Priority 1 total: ~204 items × 2 languages = ~408 strings**

**Priority 2 (UI/error — important but lower credibility risk):**
- ~19 teacher UI key groups + 19 admin ManagerIRR inline strings (Area G)
- ~58 backend error codes (Area H)
- **Priority 2 total: ~77 items × 2 languages = ~154 strings**

**Recommended review process:**
1. Start with Area A (17 criterion names) — compare directly against government СТАНДАРТ PDF (ЛОЙИҲА, Tashkent 2025) pp. 8–15. These must match the printed standard exactly.
2. Review Area B (level descriptions) — compare against PDF columns.
3. Review Areas D–F (journal items) — compare against PDF pp. 18–25.
4. Review Areas C, G, H — UI and error strings (linguistic quality, not standard-compliance).

**Recommended reviewer:** Otabek or a ministry contact familiar with special-education terminology and the СТАНДАРТ PDF.

**Pre-launch requirement:** Update `_metadata.verification_status` in `backend/i18n/uz-cyrl.json`, `uz-latn.json`, `ru.json` from `UNVERIFIED` to `VERIFIED` (with reviewer name/date) when complete. Tracked as PL-009-VERIFY in `LOOP_PRE_LAUNCH_CHECKLIST.md`.

**Admin ManagerIRR strings (Area G note):** 19 manager-facing strings currently exist only as component defaultValues in `admin/src/pages/ManagerIRR.jsx`. Before beta, extract to `admin/src/locales/uz/common.json` and `ru/common.json` so they are accessible to the translator in one place.
