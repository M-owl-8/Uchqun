# ИРР (Индивидуал Ривожланиш Режаси) — Feature Specification

**Date:** 2026-05-24
**Source documents:**
- `TeacherParent/КУНДУЗГИ_ПАРВАРИШ_СТАНДАРТ_УЗБ_12.pdf` — Government daycare standard, watermarked ЛОЙИҲА (DRAFT), Tashkent 2025. PDF pages referenced below.
- `TeacherParent/photo_2026-05-24_10-03-18.jpg` — ИРР header page (PDF p.12)
- `TeacherParent/photo_2026-05-21_21-35-29.jpg` — Assessment table criteria 1–9 (PDF p.14)
- `TeacherParent/photo_2026-05-24_10-04-17.jpg` — Score summary (5-time-point table, PDF p.13)
- `TeacherParent/photo_2026-05-24_10-04-33.jpg` — Assessment table criteria 10–17 (PDF p.15)
- `TeacherParent/photo_2026-05-24_10-04-42.jpg` — Short-term goals table, rows 1–2 (PDF p.18)
- `TeacherParent/photo_2026-05-24_10-04-47.jpg` — Short-term goals table, rows 3–5 (PDF p.19)
- `TeacherParent/photo_2026-05-24_10-04-56.jpg` — Daily monitoring journal (PDF p.22)
- `TeacherParent/photo_2026-05-24_10-05-03.jpg` — Weekly monitoring journal (PDF p.23)

**Status:** SPEC ONLY — no implementation. Review before building.
**Divergences needing sign-off:** 3 (see Part F)
**Open questions:** 12 (see Part G)

---

## Locked Decisions (do not re-open without Max approval)

1. **ИРР is the centerpiece.** All existing observations/goals/monitoring flow into or alongside the ИРР. This spec defines how.
2. **Beta scope = FULL ИРР** — all parts A through D below.
3. **Scoring inversion:** software direction is 0 = worst/can't-do, 4 = best/can-do, OPPOSITE of the printed standard. See Part F §1 for full statement. Needs ministry sign-off.
4. **Parent is VIEW-ONLY on the ИРР.** No parent write path to any ИРР data.
5. **Data-driven design:** assessment criteria, skill-area categories, and journal checklist items are stored as configurable data (seed tables or seed files) — not hardcoded in application logic. Changing a criterion is a data change, not a code change.

---

## ЛОЙИҲА / DRAFT Warning

The source document bears the ЛОЙИҲА (ЛОЙИҲА = DRAFT / ПРОЕКТ) watermark on every page. The structure, criteria list, and journal items may change before the ministry publishes the final version. The data-driven design specifically anticipates this: when the standard is finalized, only seed data updates are required, not code changes.

---

## Part A — The ИРР Structure

### A-1. Document overview

The ИРР is described on PDF p.12 as:

> ИРР - бу ҳар бир боланинг шахсий эҳтиёжлари, қобилиятлари ва салоҳиятини инобатга олган ҳолда, унинг ривожланишини қўллаб-қувватлашга қаратилган ҳужжатдир. (Ҳар бир тарбияланувчи учун ишлаб чиқилади)

("ИРР is a document aimed at supporting the development of each child, taking into account their personal needs, abilities, and potential. Developed for each child in care.")

One ИРР is created per child per enrollment in the daycare service.

The complete ИРР document in the standard covers pages 12–21:
- p.12: Header / basic info
- p.13: Score summary table (5 assessment time points)
- p.14–15: Skills & activity assessment table (17 criteria)
- p.15: Conclusion sentence ("build ИРР from assessment results")
- p.16: Needs assessment — strengths + risk factors
- p.17: Long-term goals (up to 5, tied to ПТПК validity)
- p.18–19: Short-term goals — current quarter (example rows)
- p.20: Quarterly review (overall assessment + changes + parent recommendations + next steps)
- p.21: Short-term goals — next quarter (blank template)

The monitoring instruments (journals) are a separate section, pp.22–25, starting with a title page: **"НОГИРОНЛИГИ БЎЛГАН БОЛАЛАРГА КУНДУЗГИ ПАРВАРИШ ХИЗМАТИНИ МОНИТОРИНГ ҚИЛИШ ИНСТРУМЕНТИ"** (Monitoring instruments for the daycare service for children with disabilities).

---

### A-2. Header / Basic Info (PDF p.12)

Every field on the header page is MANDATORY before an ИРР can be activated. Exact field names transcribed from the source:

| # | Uzbek Cyrillic label | English translation | Data type |
|---|---|---|---|
| 1 | Боланинг фамилияси, исми | Child's last name, first name | `STRING` |
| 2 | Туғилган санаси | Date of birth | `DATE` |
| 3 | Текширув бошланган вақтдаги ёш | Age at time of assessment start | `STRING` (e.g., "5 yosh 3 oy") |
| 4 | ПТПКга келиб тушган сана | Date of ПТПК intake (when child was referred to the ПТПК) | `DATE` |
| 5 | ПТПК хулосаси (сана, рўйхатдан ўтказиш рақами) | ПТПК conclusion — date and registration number | `DATE` + `STRING` (two sub-fields) |
| 6 | ПТПК ташхиси | ПТПК diagnosis | `TEXT` |
| 7 | ПТПК изоҳи | ПТПК notes / comments | `TEXT` |
| 8 | Боланинг шахсий ривожланиш режасини тўлдириш бошланган сана | Date when filling in the ИРР started | `DATE` |
| 9 | Қўшимча маълумотлар | Additional information | `TEXT` (multi-line) |

**ПТПК** = Психологик-тиббий-педагогик комиссия (Psychological-medical-pedagogical commission). This is the external government body that assesses the child and issues a formal conclusion (хулоса) with a diagnosis and registration number. The ИРР cannot begin without a ПТПК conclusion.

Immediately after the header, the PDF includes two free-text fields captured in the "needs assessment" section (p.16 — see A-2a below):

**A-2a. Needs Assessment (PDF p.16)**

Comes between the header and long-term goals. Captures qualitative context before goals are set.

| Field | Uzbek label | Type |
|---|---|---|
| Strengths | Боланинг кучли томонлари | `TEXT` |
| Risk factors | Бола билан боғлиқ хатар омиллари | `TEXT` |

---

### A-3. Skills & Activity Assessment (PDF pp.13–15)

#### A-3a. The score summary table (PDF p.13)

Title: **"БОЛАНИНГ КЎНИКМАЛАРИ ВА ФАОЛИЯТИНИ БАҲОЛАШ"** (Assessment of the child's skills and activities)

Sub-title: **"Кўникмалари ва фаолиятини баҳолашда баллар йиғиндиси"** (Total score in the skills and activities assessment)

This table is shown to PARENTS as the progress progression chart.

| Column | Content |
|---|---|
| Вақти (Time) | Named assessment time point |
| Баллар (Score) | Auto-calculated total score |
| Сана (Date) | Date the assessment was taken |

Five mandatory time points (from the standard):
1. **Кундузги парвариш хизматига қабул қилинганда** — At admission to the daycare service (intake)
2. **3 ойдан кейин** — After 3 months
3. **6 ойдан кейин** — After 6 months
4. **9 ойдан кейин** — After 9 months
5. **12 ойдан кейин** — After 12 months

The printed table has 3 blank rows below the 5 named rows. These are available for assessments beyond 12 months (e.g., if the child remains in care longer). The label for these would be user-entered (e.g., "18 ойдан кейин").

#### A-3b. The assessment criteria (17 criteria)

Each criterion is scored on a 5-level scale (levels 0–4). The printed columns are numbered 0–4. All level descriptions are transcribed exactly from the source.

**⚠️ CRITICAL: SCORING DIRECTION — READ THIS BEFORE BUILDING**

The printed standard has:
- **Column 0** = BEST performance (independent / can do without help / never shows problem behavior)
- **Column 4** = WORST performance (cannot do at all / problem behavior multiple times daily)

The SOFTWARE INVERTS this (locked decision — see also Part F §1):
- **Software score 0** = WORST (cannot do, always shows problem behavior)
- **Software score 4** = BEST (can do independently, never shows problem behavior)
- **Progress = RISING score** in the software

When displaying level descriptions to users, the software must show the description for the INVERTED position. Software score 4 → display the text printed in column 0; software score 0 → display the text printed in column 4.

**Complete criteria list (17 criteria, source: PDF pp.14–15)**

Criteria 1–9 (from PDF p.14):

| # | Criterion (Uzbek Cyrillic) | Criterion (English) | Level 0 (printed: BEST) | Level 1 | Level 2 | Level 3 | Level 4 (printed: WORST) | Special notes |
|---|---|---|---|---|---|---|---|---|
| 1 | Мустақил овқатланадими? (шу жумладан овқатланиш ва ичиш) | Can eat independently? (including eating and drinking) | Мустақил бажаради | Деярли ҳеч қандай ёрдамсиз | Бироз ёрдам билан ёки баъзан | Бошқалар ёрдамида бажаради | Бажара олмайди | — |
| 2 | Шахсий гигиенага риоя қилади (шу жумладан ювиниш, ванна қабул қилиш ва тишларни тозалаш) | Maintains personal hygiene (including washing, bathing, brushing teeth) | Мустақил бажаради | Деярли ҳеч қандай ёрдамсиз | Бироз ёрдам билан ёки баъзан | Бошқалар ёрдамида бажаради | Бажара олмайди | — |
| 3 | Кийинади ва ечинади | Gets dressed and undressed | Мустақил бажаради | Деярли ҳеч қандай ёрдамсиз | Бироз ёрдам билан ёки баъзан | Бошқалар ёрдамида бажаради | Бажара олмайди | — |
| 4 | Горшокдан фойдаланади (ҳожатхонага боради) | Uses toilet (goes to toilet) | Мустақил бажаради | Деярли ҳеч қандай ёрдамсиз | Бироз ёрдам билан ёки баъзан | Бошқалар ёрдамида бажаради | Бажара олмайди | — |
| 5 | Нажас ва сийдикни ушлаб туришни бошқаради | Controls bowel and bladder | Иккаласини ҳам бошқаради (controls both) | Сийдикни ушлаб туришни деярли эплайди, нажасни ушлаб туради | Кўпинча сийдикни ушлаб туришни бошқара олмайди | Сийдикни ушлаб тура олмайди | Нажасни ушлаб тура олмайди | Different level text per level |
| 6 | Оддий кўрсатмаларни тушунади | Understands simple instructions | Осон (easily) | Озгина қийинчилик билан | Баъзи қийинчиликлар билан | Катта қийинчиликлар билан | Тушунмайди | — |
| 7 | Ўз эҳтиёжларини билдиради (сув сўрайди?) | Expresses own needs (asks for water?) | Осон | Озгина қийинчилик билан | Баъзи қийинчиликлар билан | катта қийинчиликлар билан | Тушунмайди | — |
| 8 | Гаплаша олади | Can speak / communicate verbally | Бемалол (freely) | Деярли эркин | Бироз қийналади | Зўрға | Гаплаша олмайди | — |
| 9 | Мулоқот учун қўлланиладиган ҳаракат ва ишораларни тушунадими? **Эшитиш қобилияти чекланган болалар учун** | Understands movements and signs used for communication? **For children with hearing disabilities** | Осон тушунади | Деярли қийналмайди | Бироз қийналади | Зўрға | Тушунмайди | ⚠️ CONDITIONAL: applies only to children with hearing disabilities. See Open Question §OQ-1. |

Criteria 10–17 (from PDF p.15):

| # | Criterion (Uzbek Cyrillic) | Criterion (English) | Level 0 (printed: BEST) | Level 1 | Level 2 | Level 3 | Level 4 (printed: WORST) | Special notes |
|---|---|---|---|---|---|---|---|---|
| 10 | Мустақил ўтиради | Can sit independently | Мустақил ўтиради | Деярли ёрдамсиз мумкин | Бироз ёрдам билан ёки баъзан | Бошқаларнинг ёрдами билан ўтиради | Ўтирмайди | — |
| 11 | Тура олади, жумладан ўтирган ҳолатдан ҳам тура олади | Can stand, including from seated position | Мустақил туради | Деярли ёрдамсиз | Бироз ёрдам билан ёки баъзан | Бошқаларнинг ёрдами билан туради | Тура олмайди | — |
| 12 | Камида 10 та зинапоядан чиқади | Climbs at least 10 stairs | Мустақил равишда ва махсус мосламаларсиз | Деярли ёрдамсиз | Бироз ёрдам билан ёки баъзан | Бошқаларнинг ёрдами билан чиқади | Чиқмайди | — |
| 13 | Уй ичида юриш, эмаклаб юриш ва аравачадан фойдаланган ҳолда ҳаракатлана олади | Can move inside the house by walking, crawling, or using a wheelchair | Мустақил равишда ва махсус мосламаларсиз | Деярли ёрдамсиз | Бироз ёрдам билан ёки баъзан | Бошқаларнинг ёрдами билан ҳаракатланади | Ҳаракатланмайди | — |
| 14 | Ўзини ноодатий тутади | Shows unusual behavior | Ҳеч қачон (never) | Ха, лекин камдан-кам (ойига бир марта ёки камроқ) | Ха, баъзида (ҳафтада бир марта) | Ха, тез-тез (ҳар куни) | Ха мунтазам (кунига бир неча марта) | ⚠️ FREQUENCY-based. Printed 0=best (never). Software inversion: score 4=never (best). |
| 15 | Тутқаноқ ҳуружлари | Seizures / convulsions | Ҳеч қачон (never) | Ха, йилига 3 мартадан кам | Ха, тахминан ойига бир марта | Ха, тахминан ҳафтада бир марта камдан-кам | Ха, ҳар куни | ⚠️ FREQUENCY-based. Same inversion applies. |
| 16 | Оилавий ҳаётда иштирок этадими? | Participates in family life? | Ха, оиланинг бошқа аъзолари қатори тенг равишда | Ха, оилавий ҳаётда тез-тез иштирок этади | Ха, баъзан | Камдан-кам иштирок этади | Умуман иштирок этмайди | — |
| 17 | Уй ишларини бажарадими? | Does household tasks? | Ха, барча ишларни бажаради | Кўпини бажаради, лекин ҳаммасини эмас | Бир қатор вазифаларни бажаради | Баъзи ишларни бажаради | Бажармайди | — |

**Total criterion count: 17** (confirmed by full read of source PDF)

**Scoring formula (software):**

```
softwareScore(criterion, printedLevel) = 4 - printedLevel

totalScore(session) = SUM of softwareScore for all applicable criteria

For criterion 9 (hearing-specific):
  - If child is hearing-impaired: scored normally (contributes to total)
  - If child is NOT hearing-impaired: excluded from sum (see OQ-1)

maxPossibleScore:
  - Hearing-impaired child:  17 × 4 = 68
  - Non-hearing-impaired:    16 × 4 = 64
```

**Conclusion sentence from the standard (PDF p.15):**

> Боланинг кўникмаларини ва фаолиятини баҳолаш натижаларига кўра, узоқ ва қисқа муддатли вазифаларни ўз ичига олган боланинг индивидуал ривожланиш режаси тузилади.

("Based on the results of the assessment of the child's skills and activities, an individual development plan for the child is drawn up, including long-term and short-term tasks.")

This sentence defines the workflow gate: assessment → ИРР plan. The software enforces this by requiring at least one completed assessment session before long-term goals can be saved.

---

### A-4. Long-Term Goals (PDF p.17)

Title: **"20___-20_____ йилларга мўлжалланган узоқ муддатли вазифалар (ПТПК хулосасининг амал қилиш муддатига мос равишда ишлаб чиқилади)"**

("Long-term tasks planned for 20___–20_____ years, developed in accordance with the validity period of the ПТПК conclusion")

**Structure:**
- Up to 5 numbered long-term goals (free text, no fixed columns)
- Tied to the ПТПК conclusion validity period (multi-year horizon, e.g. 2025–2027)
- Goal text is free-form in Uzbek
- No prescribed skill-area categorization at this level (unlike short-term goals)

**Relationship to assessment:** Long-term goals are built AFTER the initial assessment. They represent the 1–3 year horizon anchored to the ПТПК conclusion dates.

**See OQ-2** for the question about ПТПК conclusion validity duration.

---

### A-5. Short-Term Goals (PDF pp.18–21)

**Rule from the standard:** "3 ойлик давр учун 3-5 та мақсад белгиланади. Ушбу давр тугаши билан янги мақсадлар ишлаб чиқилади."
("3–5 goals are set for a 3-month period. At the end of this period, new goals are developed.")

**Important note from the standard:** "(Жадвалда мисоллар келтирилган! Ҳар бир бола учун эҳтиёжларга қараб индивидуал мақсад ва вазифалар белгиланади)"
("Examples are given in the table! Individual goals and objectives are set for each child based on their needs.")
The example rows in the standard are NOT a fixed list — they are illustrative.

#### A-5a. Goal table columns

| Column (Uzbek) | Column (English) | Type |
|---|---|---|
| № | Row number | `INT` (1–5) |
| Кўникма | Skill area | `ENUM/CONFIG` (see skill areas below) |
| Мақсад | Goal statement | `TEXT` |
| Вазифалар тузилган сана | Date tasks were set | `DATE` |
| Мақсадларга эришиш муддати | Target date for achieving the goal | `DATE` |
| Вазифалар | Tasks (numbered sub-steps) | `TEXT` (or JSONB list) |
| Усуллар | Methods | `TEXT` |
| Жараён | Process / progress notes | `TEXT` |
| Кузатиш | Observations | `TEXT` |

#### A-5b. Skill areas (Кўникма categories)

The standard's example rows use these 5 skill areas (from PDF pp.18–19). These are the EXAMPLE categories — the data-driven design allows the partner to add or rename them:

| Code (proposed) | Uzbek Cyrillic | English translation |
|---|---|---|
| `SELF_CARE_FEEDING` | Ўз-ўзига хизмат кўрсатиш кўникмалари (овқатланиш) | Self-service skills (eating) |
| `SELF_CARE_HYGIENE` | Ўз-ўзига хизмат кўрсатиш кўникмалари (гигиена) | Self-service skills (hygiene) |
| `COMMUNICATION` | Коммуникатив кўникмалар | Communication skills |
| `SOCIAL_EMOTIONAL` | Ижтимоий-ҳиссий ривожланиш | Social-emotional development |
| `PHYSICAL` | Жисмоний ривожланиш | Physical development |

Additional skill areas likely in a real ИРР (not in the example rows but implied by the assessment criteria): cognitive development, hearing/visual, ADL (activities of daily living). The seed data should include all 5 above as a minimum; partner to confirm the full list.

#### A-5c. Quarterly review section (PDF p.20)

After each 3-month period, the teacher completes a review as part of the same ИРР document:

| Field (Uzbek) | Field (English) | Type |
|---|---|---|
| Жараённинг умумий баҳоси | Overall process assessment — brief summary of development during the period | `TEXT` |
| Режага ўзгаришлар киритиш (зарур бўлганда) | Plan amendments (if needed) | `TEXT` |
| Ота-оналар/қонуний вакиллар учун тавсиялар | Recommendations for parents / legal representatives | `TEXT` |
| Кейинги қадамлар — ИРРни қайта кўриб чиқиш ва янгилаш | Next ИРР review date | `DATE` |
| Кейинги қадамлар — Кейинги баҳолаш | Next assessment date | `DATE` |
| Кейинги қадамлар — Ота-оналар билан муҳокама | Parent discussion date | `DATE` |

**Signatures (from PDF p.21):**
- Гуруҳ тарбиячиси (Group teacher): `name` field + signature (digital = timestamp)
- Кундузги парвариш хизмати раҳбари (Daycare service manager): `name` field + signature

#### A-5d. Quarterly goal cycle

One ИРР can span multiple 3-month goal periods. The standard shows:
- p.18–19: Current quarter's goals (with example rows filled in)
- p.21: Next quarter's goals (blank template, same column structure)

This implies a repeating structure: each quarter has its own goal set, review, and signatures. The database must support multiple goal periods per ИРР.

---

### A-6. Monitoring Journals (PDF pp.22–25)

The monitoring instruments are SEPARATE from the ИРР document but are part of the same standard. The title page states they are the monitoring instrument for the daycare service for children with disabilities.

**Regulatory requirement (from standard, verbatim):**
> БАРЧА ЖУРНАЛЛАР ИЖТИМОИЙ ҲИМОЯ МИЛЛИЙ АГЕНТЛИГИНИНГ ҲУДУДИЙ БОШҚАРМАСИ МУҲРИ БИЛАН, ШНУРЛАНГАН ВА РАҚАМЛАНГАН БЎЛИШИ ШАРТ.

("ALL JOURNALS MUST BE STAMPED WITH THE SEAL OF THE REGIONAL ADMINISTRATION OF THE NATIONAL AGENCY FOR SOCIAL PROTECTION, AND MUST BE SEWN AND NUMBERED.")

This is a PHYSICAL regulatory requirement. The software captures the same data digitally; physical journals may still be required by regulation. See Part F §2.

#### A-6a. Daily Monitoring Journal (Кундалик мониторинг журнали) — PDF p.22

Full title: "Кундалик мониторинг - Болаларни кундузги хизматга қабул қилиш/топшириш журнали"
(Daily monitoring — Journal for accepting/handing over children to the daycare service)

**Who fills it:** Teacher (тарбиячи), every day. Required per child at admission.
**Format in printed standard:** One page covers multiple children (up to 9 per page), each as a column. Software: one entry per child per day.

**Section 1 — Гигиеник ҳолат (Hygiene state):**

| Code | Uzbek Cyrillic | English |
|---|---|---|
| `hyg_bola_toza_keldi` | Бола тоза келди | Child arrived clean |
| `hyg_kiyimlar_ozoda` | Кийимлар озода, ҳидсиз | Clothes are clean, odour-free |
| `hyg_soch_toza` | Соч тоза, таралган | Hair is clean and combed |
| `hyg_tirnoqlar_toza` | Тирноқлар олинган ва тоза | Nails trimmed and clean |
| `hyg_yuz_qollar` | Юз ва қўллар ювилган | Face and hands washed |
| `hyg_poyabzal_mos` | Пойабзал тоза ва ўлчамига мос | Shoes clean and appropriate size |
| `hyg_tanadan_hid_yoq` | Танадан ёқимсиз ҳид келмайди | No unpleasant body odour |
| `hyg_faslga_mos` | Фаслга мос кийим кийган | Wearing season-appropriate clothing |
| `hyg_gigienik_vositalar` | Гигиеник воситалар олиб келинган (памперслар, салфеткалар, дастрўмоллар ва ҳ.к.) | Hygiene supplies brought (diapers, tissues, handkerchiefs, etc.) |

**Section 2 — Соғлиқнинг умумий ҳолати (General health state):**

| Code | Uzbek Cyrillic | English |
|---|---|---|
| `hlth_harorat_normal` | Тана ҳарорати меъёрида (36,0-37,0°C) | Body temperature normal (36.0–37.0°C) |
| `hlth_harorat_kotarilgan` | Ҳарорат кўтарилган | Temperature elevated |
| `hlth_shikoyatlar_yoq` | Шикоятлар йўқ | No complaints |
| `hlth_shikoyatlar_mavjud` | Шикоятлар мавжуд (изоҳда кўрсатинг) | Complaints present (indicate in notes) |
| `hlth_teri_toza` | Тери тоза, тошмаларсиз | Skin clean, no rash |
| `hlth_shilimshiq_bor` | Шилиниш/лат/кўкаришлар бор (кўрсатинг) | Abrasions/bruises/contusions present (indicate) |
| `hlth_burun_nafas` | Бурундан нафас олиш эркин | Nasal breathing free |
| `hlth_yaralar_yoq` | Кўзга кўринадиган жароҳатлар йўқ | No visible wounds |
| `hlth_yotal_yoq` | Йўтал мавжуд эмас | No cough |
| `hlth_yotal_mavjud` | Йўтал мавжуд | Cough present |
| `hlth_kayfiyat_normal` | Кайфият ва фаоллик меъёрида | Mood and activity normal |

**Section 3 — Ошқозон функцияси (Gastrointestinal function):**

| Code | Uzbek Cyrillic | English |
|---|---|---|
| `gi_ich_normal` | Ич келиши нормал | Normal bowel movements |
| `gi_ich_kelmagan` | Ич келмаган | No bowel movement |
| `gi_qorin_ogriq` | Қорин оғриғига шикоятлар бор | Complaints of abdominal pain |
| `gi_oshqozon_buzilishi` | Ошқозон-ичак тизими бузилиши (ич кетиши, қабзият ва ҳоказо) кузатилмоқда | GI dysfunction (diarrhea, constipation, etc.) observed |
| `gi_siydik_normal` | Сийдик чиқариш мунтазам, шикоятларсиз | Urination regular, no complaints |
| `gi_siydik_tutilishi` | Сийдик тутилиши ёки кам ажралиши | Urination retained or decreased |
| `gi_siydik_tutolmaslik` | Сийдик тутолмаслик мавжуд | Urinary incontinence present |

**Footer:** Изоҳ / бошқа (Notes / other) — free text. Масъул тарбиячи ФИШ ва имзоси (Responsible teacher name and signature).

**Total daily checklist items: 27** (9 hygiene + 11 health + 7 GI)

#### A-6b. Weekly Monitoring Journal (Ҳафталик мониторинг журнали) — PDF p.23

**Who fills it:** Teacher (тарбиячи), once per week per child.

**Section 1 — Болаларнинг эмоционал ҳолати (Children's emotional state):**

| Code | Uzbek Cyrillic | English |
|---|---|---|
| `emo_holat_barqaror` | Боланинг ҳиссий ҳолати барқарор | Child's emotional state is stable |
| `emo_ijobiy_his` | Бола ижобий ҳис-туйғуларни намоён этади (табассум, қувонч, қизиқиш) | Child shows positive emotions (smiling, joy, curiosity) |
| `emo_xavotir_yoq` | Хавотирланиш белгилари йўқ (тортинчоқлик, йиғлоқилик, ўзини четга олиш) | No signs of anxiety (shyness, crying, withdrawal) |
| `emo_dushmanlik_yoq` | Болалар ва катталарга нисбатан душманлик муносабати кузатилмайди | No hostile behavior towards children or adults |
| `emo_tanbehga_xotirjam` | Танбеҳ ва илтимосларга хотиржам муносабат билдиради | Calm response to corrections and requests |
| `emo_hamdardlik` | Бошқа болаларга ҳамдардлик кўрсатади | Shows empathy towards other children |
| `emo_stressdan_tiklanadi` | Стрессли вазиятдан кейин тезда ўзини ўнглаб олади | Recovers quickly after stressful situations |
| `emo_kayfiyat_barqaror` | Кайфияти кун давомида барқарор туради | Mood remains stable throughout the day |
| `emo_tarbiyachi_ishonar` | Тарбиячи билан муносабати ишончли ва мустаҳкам | Relationship with teacher is trusting and stable |

**Section 2 — Муҳитнинг қулайлиги ва хавфсизлиги (Environment comfort and safety):**

| Code | Uzbek Cyrillic | English |
|---|---|---|
| `env_xona_toza` | Хоналар тоза, мунтазам тозаланиб турилади | Rooms clean, regularly cleaned |
| `env_hid_chanq_yoq` | Бегона ҳидлар, чанг ва ахлат йўқ | No foreign odours, dust, or waste |
| `env_pollar_xavfsiz` | Поллар, мебеллар ва жиҳозлар хавфсиз ҳамда барқарор | Floors, furniture, equipment safe and stable |
| `env_harorat_normal` | Хона ҳарорати 18°C дан паст эмас ва 28°C дан юқори эмас | Room temperature between 18°C and 28°C |
| `env_yoritish_etarli` | Ёритиш етарли, ярқираш ва соялар йўқ | Lighting adequate, no glare or shadows |
| `env_shamollatiadi` | Хона кунига 2 марта шамоллатилади | Room ventilated twice per day |
| `env_oyinchoqlar_soz` | Ўйин жиҳозлари ва ўйинчоқлар соз, тоза ҳолатда сақланади | Play equipment and toys in good, clean condition |
| `env_dori_qutisi` | Дори қутиси мавжуд | First aid kit present |
| `env_ichimlik_suvi` | Ичимлик суви болалар учун қулай жойда | Drinking water accessible for children |

**Footer:** Same as daily — notes + teacher name/signature.

**Total weekly checklist items: 18** (9 emotional + 9 environment)

#### A-6c. Quarterly Monitoring (Чораклик мониторинг) — PDF p.23+

**Important distinction from daily/weekly:** The quarterly monitoring is a **FACILITY-LEVEL checklist**, not per-child. It is completed by the daycare centre management (likely the раҳбар / director), not the teacher. It assesses the operation of the entire centre for the quarter.

**Who fills it:** Daycare service manager (раҳбар). Frequency: once per quarter.

**Section 1 — Ахборот тизимидан фойдаланиш (Use of the information system):**

| Code | Uzbek Cyrillic | English |
|---|---|---|
| `info_tizimga_kiritildi` | Барча тарбияланувчилар тизимга киритилди | All children entered in the system |
| `info_face_id` | Face ID орқали давомат мунтазам равишда қайд этиб борилади | Attendance recorded regularly via Face ID |

**Section 2 — Ота-оналар билан ишлаш (Work with parents):** 15 items

| Code | Uzbek Cyrillic | English |
|---|---|---|
| `par_malumot_oladilar` | Ота-оналар бола ҳақида мунтазам равишда маълумот оладилар | Parents regularly receive information about the child |
| `par_maslahatllar` | Маслаҳатлар ва якка тартибдаги суҳбатлар ўтказилади | Consultations and individual conversations are held |
| `par_murojaatlar_qayd` | Барча мурожаатлар махсус журналда қайд этилади | All appeals recorded in a dedicated journal |
| `par_shikoyatlar_korib` | Шикоят ва таклифлар белгиланган муддатда кўриб чиқилади | Complaints and suggestions reviewed within the set deadline |
| `par_yozma_javob` | Ота-оналарнинг мурожаатларига ёзма жавоблар берилган | Written responses given to parent appeals |
| `par_tadbirlarda_ishtirok` | Ота-оналар тадбирлар ва йиғилишларда иштирок этадилар | Parents participate in events and meetings |
| `par_xodimlar_muloqot` | Ходимлар ҳурматли ва хотиржам мулоқот оҳангини сақлаб қоладилар | Staff maintain respectful and calm communication tone |
| `par_takliflar_hisobga` | Ота-оналарнинг таклифлари иш режаларида инобатга олинади | Parent suggestions considered in work plans |
| `par_mutaxassislarni_taniyadilar` | Ота-оналар фарзандлари билан ишлайдиган мутахассисларни танийдилар | Parents know the specialists working with their children |
| `par_nizoli_hal` | Низоли вазиятлар самарали тарзда ҳал қилинади | Conflict situations resolved effectively |
| `par_maqsad_xabardor` | Ота-оналар марказнинг мақсади, вазифалари ва иш услублари ҳақида хабардор қилинган | Parents informed about centre's goals, tasks, and methods |
| `par_ijobiy_ozgarishlar` | Ота-оналар болада ижобий ўзгаришларни қайд этадилар | Parents note positive changes in child |
| `par_hamkorlik_hurmst` | Ҳамкорлик ўзаро ҳурмат ва очиқликка асосланади | Cooperation based on mutual respect and openness |
| `par_doimiy_aloqa` | Ҳар бир ота-она билан доимий алоқа ўрнатилган | Permanent contact established with each parent |

*(Note: Standard lists 15 items in this section but one item may be partially obscured in the source — count confirmed as 15 visible items in the PDF extract. See OQ-10.)*

**Section 3 — Ҳужжатлар ва ҳисоботлар (Documents and reports):** 8 items

| Code | Uzbek Cyrillic | English |
|---|---|---|
| `doc_irr_dolzarb` | Барча болаларнинг ИРРлари долзарб ва тўлиқ тўлдирилган | All children's ИРРs are current and fully completed |
| `doc_irr_qayta_korib` | ИРР уч ойда камида бир марта қайта кўриб чиқилади | ИРР reviewed at least once every 3 months |
| `doc_reja_tasdiq` | Тарбиявий ва ривожлантирувчи ишлар режаси тасдиқланган ва тизимли равишда олиб борилади | Educational and development work plan approved and systematically implemented |
| `doc_anonim_shakl` | Аноним мурожаат шакли мавжуд | Anonymous complaint form available |
| `doc_ota_anket` | Ота-оналар анкетаси мавжуд | Parent satisfaction survey available |
| `doc_tashrif_jurnal` | Ташриф буюрувчиларни ҳисобга олиш журнали | Visitor log maintained |
| `doc_hodisalar_jurnal` | Ҳодисалар журнали | Incident log maintained |
| `doc_kundalik_jurnal` | Болаларни кундузги хизматга қабул қилиш/топшириш кундалик мониторинг журнали | Daily monitoring (admission/handover) journal maintained |
| `doc_shunurlangan` | Барча журналлар шнурланган, рақамланган, раҳбарнинг имзоси ва ҳудудий бошқарма муҳри билан тасдиқланган | All journals sewn, numbered, signed by director, and stamped by regional administration |

*(9 items visible including the physical-stamp item. Consolidated from "Ҳужжатлар" section.)*

**Section 4 — Парвариш сифати (Care quality):** 16 items

| Code | Uzbek Cyrillic | English |
|---|---|---|
| `care_ovqat_rejim` | Овқатланиш ва дам олиш режими бажарилади | Feeding and rest schedule followed |
| `care_xona_toza` | Хона тоза ва ҳавоси мусаффо | Room clean and air fresh |
| `care_shaxsiy_vositalar` | Болаларга шахсий парвариш воситалари берилган | Children provided with personal care items |
| `care_xodimlar_gigiena` | Ходимлар болаларнинг шахсий гигиенасини назорат қилади | Staff monitor children's personal hygiene |
| `care_yordam_oz_vaqt` | Болалар ўзларини ёмон ҳис қилганда ўз вақтида ёрдам олади | Children receive timely help when unwell |
| `care_tashqi_korinish` | Боланинг ташқи кўриниши озода, ҳиди йўқ | Child's appearance neat, no odour |
| `care_barcha_vaqt` | Барча парвариш турлари ўз вақтида бажарилади | All types of care performed on time |
| `care_kuzatuvlar_qayd` | Кузатувлар ҳужжатларда қайд этилади | Observations recorded in documents |
| `care_shikoyat_yoq` | Ота-оналардан парвариш сифати бўйича шикоятлар йўқ | No parent complaints about care quality |
| `care_tozalash_2x` | Тозалаш кунига икки марта ўтказилади | Cleaning done twice a day |
| `care_umumiy_tozalash` | Умумий тозалаш ҳар ҳафта амалга оширилади | General cleaning done weekly |
| `care_mebel_artiladi` | Мебеллар тоза нам латта билан артилади | Furniture wiped with a clean damp cloth |
| `care_oyinchoq_yuviladi` | Ўйинчоқлар ювилади ва дезинфекция қилинади | Toys washed and disinfected |
| `care_choyshab_toza` | Чойшаб-ёстиқ жилдлари тоза | Bedding is clean |
| `care_sochiq_shaxsiy` | Сочиқлар шахсий | Towels are individual (per child) |
| `care_chiqindi_olinadi` | Чиқиндилар ўз вақтида олиб ташланади | Waste removed on time |
| `care_kiyim_toza` | Ходимларнинг алмаштирадиган кийимлари тоза | Staff's spare clothing is clean |

**Section 5 — Шароитлари (Conditions):** 10 items

| Code | Uzbek Cyrillic | English |
|---|---|---|
| `shar_harorat` | Ҳарорат режимига риоя қилинган | Temperature regime observed |
| `shar_yoritish` | Ёритиш меъёрларга мос келади | Lighting meets standards |
| `shar_mebel_mustahkam` | Мебеллар мустаҳкам, болаларга мослаштирилган | Furniture sturdy, adapted for children |
| `shar_oyun_xoli` | Ўйин майдони ортиқча нарсалардан холи ва хавфсиз | Play area free of clutter and safe |
| `shar_hudud_tartibli` | Ҳудуд озода ва тартибли сақланган | Territory kept clean and orderly |
| `shar_isitish_tosiq` | Иситиш мосламалари тўсиқланган | Heating equipment guarded |
| `shar_elektr_sozlangan` | Электр жиҳозлари созланган | Electrical equipment in working order |
| `shar_tibbiy_aptechka` | Тиббий аптечка тўлиқ жиҳозланган | Medical first-aid kit fully stocked |
| `shar_masul_shaxslar` | Хавфсизлик бўйича масъул шахслар белгиланган | Safety-responsible persons designated |
| `shar_begona_kirish_taqiq` | Бегона шахсларнинг кириши тақиқланган | Unauthorized persons prohibited from entry |

**Footer note (from standard):** "Эслатма: ҳар чораклик мониторингда ушбу устунда кундузги парвариш хизматини тарк этган болалар сони ва унинг сабаби кўрсатилади." (Note: in each quarterly monitoring, this column shows the number of children who left the service during the quarter and the reason.)

Quarterly monitoring also tracks children who left:
- Child full name (ФИШ)
- Date of admission and date of leaving
- Reason (Сабаби)
- Manager's signature

**Total quarterly checklist items: ~55** (2 info + 15 parent + 9 doc + 16 care + 10 conditions)
*(Exact count: 52 checkboxes + the children-who-left table)*

---

## Part B — Proposed Data Model

### B-1. Core ИРР models

```
IRR (IndividualDevelopmentPlan)
├── id                UUID, PK
├── childId           FK → Child (one ИРР per child per enrollment)
├── schoolId          COPIED from child — required for school-scope isolation
├── parentId          COPIED from child — required for parent-axis isolation
├── status            ENUM('draft', 'active', 'archived') — default 'draft'
│
│ ── Header fields (all mandatory before 'active')
├── childFullName     STRING — denormalized from Child at ИРР creation
├── dateOfBirth       DATE
├── ageAtAssessmentStart  STRING (e.g. "5 yosh 3 oy")
├── ptpkIntakeDate    DATE
├── ptpkConclusionDate    DATE
├── ptpkConclusionNumber  STRING (registration number)
├── ptpkDiagnosis     TEXT
├── ptpkNotes         TEXT
├── irrStartDate      DATE
├── additionalInfo    TEXT
│
│ ── Needs assessment
├── childStrengths    TEXT (Боланинг кучли томонлари)
├── riskFactors       TEXT (Бола билан боғлиқ хатар омиллари)
│
├── createdBy         FK → User (teacher who created the ИРР)
├── createdAt, updatedAt, deletedAt (paranoid)
```

```
AssessmentCriteria  ← SEED table, data-driven
├── id              UUID, PK
├── sortOrder       INT (1–17)
├── code            STRING (e.g. 'SELF_FEEDING', 'PERSONAL_HYGIENE', ...)
├── textUz          TEXT (Uzbek Cyrillic)
├── textRu          TEXT
├── textEn          TEXT
├── isHearingSpecific  BOOLEAN (true for criterion 9 only)
├── levelDescriptions  JSONB {
│     "0": { "uz": "...", "ru": "...", "en": "..." },
│     "1": { ... }, "2": { ... }, "3": { ... }, "4": { ... }
│   }
│   NB: keys 0–4 in PRINTED direction. Software displays inverted.
├── scoringType     ENUM('ability', 'frequency', 'participation')
│   — 'ability' for criteria 1–13: printed 0=best ability
│   — 'frequency' for criteria 14–15: printed 0=never (best)
│   — 'participation' for criteria 16–17: printed 0=full participation
│   (Inversion logic is identical for all types — documented for clarity)
├── isActive        BOOLEAN (allows deactivating without deletion if standard changes)
```

```
AssessmentSession
├── id              UUID, PK
├── irrId           FK → IRR
├── childId         FK → Child (denormalized for fast scoping)
├── schoolId        COPIED — school-scope isolation
├── sessionType     ENUM('intake', '3mo', '6mo', '9mo', '12mo', 'custom')
├── customLabel     STRING (nullable — only for sessionType='custom', e.g. "18 ойдан кейин")
├── assessmentDate  DATE
├── totalScore      INT (auto-calculated sum; stored for fast retrieval)
├── maxPossibleScore  INT (64 or 68 depending on hearing-specific criterion inclusion)
├── isHearingImpaired  BOOLEAN (determines whether criterion 9 is scored)
├── notes           TEXT
├── completedAt     TIMESTAMP
├── completedBy     FK → User (teacher)
├── createdAt, updatedAt
```

```
AssessmentScore  (one row per criterion per session)
├── id              UUID, PK
├── sessionId       FK → AssessmentSession
├── criterionId     FK → AssessmentCriteria
├── score           INT (0–4, SOFTWARE direction: 4=best)
│   CONSTRAINT: CHECK (score >= 0 AND score <= 4)
│   NULL allowed for hearing-specific criterion when child is not hearing-impaired
├── notes           TEXT (optional per-criterion note)
```

```
LongTermGoal
├── id              UUID, PK
├── irrId           FK → IRR
├── childId, schoolId  (denormalized for isolation)
├── sortOrder       INT (1–5)
├── goalText        TEXT
├── targetPeriodStart  DATE (year start)
├── targetPeriodEnd    DATE (year end, tied to PTPK conclusion validity)
├── createdAt, updatedAt
```

```
GoalPeriod  (one per 3-month quarter)
├── id              UUID, PK
├── irrId           FK → IRR
├── childId, schoolId  (denormalized)
├── periodStart     DATE
├── periodEnd       DATE
├── status          ENUM('active', 'reviewed', 'completed')
│ ── Quarterly review fields (filled at period end)
├── overallAssessment      TEXT (Жараённинг умумий баҳоси)
├── planChanges            TEXT (Режага ўзгаришлар)
├── parentRecommendations  TEXT (Ота-оналар учун тавсиялар)
├── nextReviewDate         DATE
├── nextAssessmentDate     DATE
├── parentDiscussionDate   DATE
├── teacherSignedAt        TIMESTAMP (nullable)
├── teacherSignedBy        FK → User
├── managerSignedAt        TIMESTAMP (nullable)
├── managerSignedBy        FK → User
├── createdAt, updatedAt
```

```
ShortTermGoal  (3–5 per GoalPeriod)
├── id              UUID, PK
├── periodId        FK → GoalPeriod
├── irrId           FK → IRR
├── childId, schoolId  (denormalized)
├── sortOrder       INT (1–5)
├── skillAreaCode   STRING  ← from SkillArea seed config (data-driven)
├── goalText        TEXT (Мақсад)
├── taskSetDate     DATE (Вазифалар тузилган сана)
├── targetDate      DATE (Мақсадларга эришиш муддати)
├── tasks           TEXT (Вазифалар — numbered list as free text)
├── methods         TEXT (Усуллар)
├── progress        TEXT (Жараён)
├── observations    TEXT (Кузатиш)
├── createdAt, updatedAt
```

### B-2. Monitoring journal models

```
DailyMonitoringEntry  (one per child per day)
├── id              UUID, PK
├── childId         FK → Child
├── schoolId        COPIED — school-scope isolation
├── irrId           FK → IRR, nullable (child may not yet have an ИРР)
├── entryDate       DATE
├── recordedBy      FK → User (teacher)
├── recordedAt      TIMESTAMP
│
│ ── Checklist data stored as JSONB (data-driven, not separate columns)
│    Key = item code from A-6a; value = boolean
├── hygieneData     JSONB  { "hyg_bola_toza_keldi": true, ... }
├── healthData      JSONB  { "hlth_harorat_normal": true, ... }
├── giData          JSONB  { "gi_ich_normal": true, ... }
│
├── notes           TEXT (Изоҳ / бошқа)
```

```
WeeklyMonitoringEntry  (one per child per week)
├── id              UUID, PK
├── childId         FK → Child
├── schoolId        COPIED
├── irrId           FK → IRR, nullable
├── weekStart       DATE (Monday of the week)
├── recordedBy      FK → User
├── recordedAt      TIMESTAMP
├── emotionalData   JSONB  { "emo_holat_barqaror": true, ... }
├── environmentData JSONB  { "env_xona_toza": true, ... }
├── notes           TEXT
```

```
QuarterlyMonitoringEntry  (FACILITY-LEVEL, not per-child — one per quarter per school)
├── id              UUID, PK
├── schoolId        FK → School
├── quarterStart    DATE
├── recordedBy      FK → User (manager/admin role)
├── recordedAt      TIMESTAMP
├── infoSystemData  JSONB  { "info_tizimga_kiritildi": true, ... }
├── parentWorkData  JSONB  { "par_malumot_oladilar": true, ... }
├── documentationData  JSONB
├── careQualityData    JSONB
├── conditionsData     JSONB
│ ── Children who left during the quarter
├── departures      JSONB [{ name, admitDate, departDate, reason }]
├── notes           TEXT
```

**JSONB rationale:** Checklist items are stored as JSONB (code → boolean) rather than individual columns. This is the DATA-DRIVEN implementation: when the DRAFT standard is finalized and items change, only the seed config file changes — no schema migration needed. Individual item querying is rare; aggregate reports are on full entries.

### B-3. Isolation enforcement

Every ИРР and journal model carries both isolation axes from S0:

**Axis 1 — School scope:** `schoolId` is copied from `Child` when the record is created. All teacher queries must include `WHERE schoolId = req.user.schoolId`. A teacher from school A cannot reach school B's ИРРs.

**Axis 2 — Child ownership / teacher assignment:**
- Teacher reads: must call `validateChildAccess(childId, req)` before any ИРР read — confirms teacher is assigned to the child (group or legacy path).
- Parent reads: `WHERE parentId = req.user.id` — parent sees only their own child's ИРР.
- Quarterly monitoring: school-scoped only (facility-level, `WHERE schoolId = req.user.schoolId`, manager role).

---

### B-4. Relationship to existing models

| Existing model | Relationship to ИРР | Disposition |
|---|---|---|
| `ChildObservation` | Ad-hoc teacher notes. The ИРР has `Кузатиш` (observations) per goal — different purpose. | **STAYS SEPARATE.** Observations are informal; ИРР goal observations are structured. No migration. |
| `ChildGoal` | Predecessor to ShortTermGoal. Different schema: 8 categories, 5 progress statuses vs ИРР's 9 columns. | **FLAG as migration candidate** (Database loop). Do NOT migrate now. Both models coexist; ИРР short-term goals use the new ShortTermGoal model. |
| `EmotionalMonitoring` | Overlaps with WeeklyMonitoringEntry emotional section. Different format (freeform vs checkboxes). | **STAYS SEPARATE.** EM is freeform clinical entry; weekly journal is structured checklist. Consolidation decision deferred to Database loop. |
| `ChildJournalEntry` | Teacher writes for parent to read (isVisibleToParent). ИРР journals are operational checklists, not parent-facing narration. | **STAYS SEPARATE.** Different purpose: journal entries are parent-communication; ИРР journals are regulatory checklists. |
| `TeacherReflection` | Daily professional reflection by teacher. Independent of ИРР. | **STAYS SEPARATE.** No overlap. |

---

## Part C — Screen Flow (Teacher Side)

### C-1. Entry point

**Route:** Child profile page (`/teacher/children/:id`) → "ИРР тузиш" ("Build ИРР") button.

If an active ИРР exists: button becomes "ИРРни кўриш/таҳрирлаш" ("View/Edit ИРР").
If no ИРР: button shows "ИРР тузиш" → opens ИРР creation flow.

### C-2. ИРР creation flow (gate-based)

**Step 1 — Header form (mandatory gate)**

All 9 header fields must be filled before proceeding to assessment. The form enforces:
- `ptpkConclusionDate` and `ptpkConclusionNumber` must both be present
- `irrStartDate` defaults to today
- `childStrengths` and `riskFactors` (needs assessment) are on the same step

On submit: ИРР created with `status: 'draft'`.

**Step 2 — Assessment (mandatory gate before goals)**

The standard's scoring table appears first. Teacher scores each of the 17 criteria.

UI: One criterion at a time, OR all on one scrollable page. For each criterion:
- Criterion text displayed in Uzbek Cyrillic
- 5 radio buttons labelled with the level descriptions (displayed in SOFTWARE direction: radio 0 = worst, radio 4 = best)
- Criterion 9 rendered conditionally: shown only if `isHearingImpaired` is checked on the child's profile (or on the assessment session)
- Running total score shown as criteria are filled

On submit: `AssessmentSession` created (type: 'intake'), `totalScore` auto-calculated, ИРР status remains 'draft' until goals are set.

**Score display:** After submission, show the 5-row progress table (Вақти / Баллар / Сана). Intake row fills in. Remaining 4 rows show empty until completed.

**Step 3 — Long-term goals (unlocked after assessment)**

Up to 5 text fields for long-term goals. Target period dates (from–to, tied to ПТПК validity).

**Step 4 — Short-term goals (3-month quarter)**

On activating: teacher selects the quarter period (start / end dates).
Then 3–5 goal rows, each with all 9 columns from A-5a.
Skill area is a dropdown from the SkillArea seed config.
Tasks field accepts numbered items.

On submit: `GoalPeriod` + up to 5 `ShortTermGoal` records created. ИРР status promoted to `'active'`.

Signature step: Teacher confirms their name; manager signs off (separate login or separate confirmation). Both signatures recorded as timestamps.

### C-3. Ongoing usage (repeat quarterly)

**Quarterly re-assessment:** Teacher opens ИРР → "Баҳолаш" ("Assess") → selects next time point (3mo / 6mo / 9mo / 12mo / custom). Score table updates; progress chart shows growth.

**Quarterly review:** At end of each 3-month period → "Якунлаш" ("Complete quarter"):
- Fill `overallAssessment`, `planChanges`, `parentRecommendations`
- Set next review / assessment / parent discussion dates
- Sign → period status becomes 'reviewed'

**Next quarter goals:** Start a new `GoalPeriod` → fill new 3–5 goals.

### C-4. Existing pages that get reworked

| Existing page | Current role | ИРР impact |
|---|---|---|
| `ChildDetail.jsx` | Shows child info, goals, observations | **Entry point for ИРР.** ИРР button added. Existing goal panel remains (ChildGoal model still active); ИРР short-term goals appear as a separate panel. |
| `MonitoringJournal.jsx` | EmotionalMonitoring + journal | **Supplemented, not replaced.** Daily/weekly monitoring journal entry forms added. MonitoringJournal becomes the hub for daily, weekly entries. EmotionalMonitoring stays. |
| `DailyReflection.jsx` | Observations + reflections | **Unchanged.** Teacher reflections and ChildObservation are separate from ИРР. |
| `ParentJournalComposer.jsx` | Writes ChildJournalEntry for parent | **Unchanged.** These are parent-communication entries, not ИРР journal entries. |

---

## Part D — Parent View (VIEW-ONLY)

**Hard rule:** Parents can never write, edit, submit, or influence any ИРР data. No parent route hits any mutation endpoint in the ИРР models.

### D-1. What parents see

| ИРР section | Parent visibility | Notes |
|---|---|---|
| Header (basic info) | ✅ YES | Their child's own header. Parent already knows this info. |
| Needs assessment (strengths + risk factors) | ✅ YES | Intended for parent awareness. |
| Score progression table (5 time points) | ✅ YES — the main progress view | Shows Вақти / Баллар / Сана. Rising score = visible progress. |
| Individual criterion scores | ⚠️ OPEN — see OQ-4 | May be too clinical per session; progression table is the summary. |
| Long-term goals | ✅ YES | Parents should understand the multi-year horizon. |
| Short-term goals (current quarter) | ✅ YES — including Жараён + Кузатиш columns | The `parentRecommendations` field specifically targets them. |
| Quarterly review summary | ✅ YES | `overallAssessment` + `parentRecommendations` + next dates. |
| Daily monitoring journal | ❌ NO | Operational clinical checklist. Not parent-facing. |
| Weekly monitoring journal | ❌ NO | Same rationale. |
| Quarterly monitoring | ❌ NO | Facility-level document, not child-specific. |

### D-2. Parent-side endpoints (read-only)

```
GET /parent/children/:childId/irr
  — Returns: active ИРР header + needs assessment + all GoalPeriods + all ShortTermGoals
  — Auth: parentId check: child.parentId === req.user.id
  — Excludes: daily/weekly journal data

GET /parent/children/:childId/irr/assessment
  — Returns: all AssessmentSessions for this child, each with totalScore + date
  — Same auth as above
  — Displays as the score progression table

GET /parent/children/:childId/irr/goals
  — Returns: all GoalPeriods with their ShortTermGoals
  — Same auth
```

All three endpoints: `WHERE parentId = req.user.id` — parent cannot access another parent's child's ИРР by ID-guessing.

### D-3. Parent portal page

New page in parent subtree: **ИРР** (accessed from `ChildProfile.jsx` or via bottom navigation).

Content:
1. Score progression chart (Вақти / Баллар / Сана) — visual bar or line chart showing 5 time points
2. Current quarter goals list — each goal with skill area, goal text, progress, observations, recommendations
3. Long-term goals (read-only display)
4. Next parent discussion date (from quarterly review)

No forms. No submit buttons. No edit affordance of any kind.

---

## Part E — Existing Feature Map

How each existing teacher+parent portal feature relates to the ИРР:

| Feature | Models | Disposition |
|---|---|---|
| **Child observations** (`ChildObservation`) | observationController | **Stays separate.** Ad-hoc, quick notes. Not part of ИРР. Goal-level observations in ИРР are per-goal text fields. |
| **Child goals** (`ChildGoal` + `ChildGoalReview`) | goalController | **Coexists with ИРР short-term goals.** The existing ChildGoal model remains active. ИРР introduces a new, richer ShortTermGoal model. Migration to unify in Database loop. |
| **Reflections** (`TeacherReflection`) | reflectionController | **Stays separate.** Professional self-reflection, not child record. No ИРР linkage. |
| **Journal entries** (`ChildJournalEntry`) | journalController | **Stays separate.** isVisibleToParent entries are parent-communication. ИРР journals are regulatory checklists. |
| **Emotional monitoring** (`EmotionalMonitoring`) | emotionalMonitoringController | **Stays separate.** Clinical freeform entries. Weekly journal emotional section is a different instrument (structured checklist). May be consolidated in Database loop. |
| **Attendance** (`ChildAttendance`) | attendanceController | **Stays separate.** Attendance is an operational record, not an ИРР component. |
| **Teacher rating** (`TeacherRating`) | parentTeacherRatingController | **Stays separate.** CP-020 handles ratings; no ИРР overlap. |
| **Media** (`Media`) | mediaController | **Stays separate.** Photos/videos not referenced by ИРР. |
| **Therapy** (`Therapy`, `TherapyUsage`) | therapyController | **Stays separate.** Therapy tracking is an operational record, not an ИРР component. |
| **Activities** (`Activity`) | activityController | **Stays separate.** Activities are teacher-logged records, not ИРР structural elements. |
| **Chat / Messages** | chatController, governmentMessageController | **Completely separate.** No ИРР overlap. |

**Net-new models required:** `IRR`, `AssessmentCriteria` (seed), `AssessmentSession`, `AssessmentScore`, `LongTermGoal`, `GoalPeriod`, `ShortTermGoal`, `DailyMonitoringEntry`, `WeeklyMonitoringEntry`, `QuarterlyMonitoringEntry`

**Seed config files required:** `shared/config/assessmentCriteria.js` (17 criteria), `shared/config/skillAreas.js` (5+ categories), `shared/config/dailyJournalItems.js`, `shared/config/weeklyJournalItems.js`, `shared/config/quarterlyJournalItems.js`

---

## Part F — Divergences and Sign-Offs Required

### F-1. SCORING INVERSION (ministry sign-off required)

**What the printed standard says:**
- Column 0 = best performance (child does it independently / behavior never occurs / fully participates)
- Column 4 = worst performance (child cannot do it / behavior occurs multiple times daily / does not participate)
- Progress in the printed standard = FALLING score (lower number as child improves)

**What the software implements (locked decision):**
- Software score 0 = worst (cannot do / always occurs)
- Software score 4 = best (can do independently / never occurs)
- Progress in the software = RISING score (higher number as child improves)

**Conversion:** `softwareScore = 4 - printedScore`

**Why this inversion:** Rising score = visible progress = more intuitive for parents and teachers viewing the score progression table.

**Impact:** Every level description must be displayed with its inverted index. A child scored 4 in software (best) is displayed the level-0 text from the standard; a child scored 0 (worst) is displayed the level-4 text.

**⚠️ SIGN-OFF REQUIRED:** This divergence from the printed standard must be approved by the partner (Otabek) and confirmed with the ministry/ИЖТИМОИЙ ҲИМОЯ МИЛЛИЙ АГЕНТЛИГИ before the scoring screen is built. If the ministry requires the software to match the printed form exactly (0=best), the entire scoring display must be rebuilt to the non-inverted direction.

**Action item:** Partner to present the inversion to the ministry and obtain written approval.

### F-2. Physical journal stamp requirement (regulatory sign-off required)

**What the standard says:** All journals must be stamped with the regional administration's seal, sewn, and numbered.

**What the software implements:** Digital records stored in the database. There is no mechanism for digital seal application or physical sewing/numbering in the software.

**Interpretation:** The software is a SUPPLEMENT to physical journals, not a legal replacement. Until the regulatory framework explicitly permits digital-only records, the daycare centre must still maintain physical journals with the required stamp.

**⚠️ SIGN-OFF REQUIRED:** Partner (Otabek) must confirm with the regional administration whether the digital system's records satisfy the journal regulatory requirement, or whether physical journals remain mandatory alongside the software.

### F-3. Standard is DRAFT — all structures provisional

**What the standard says:** The document is watermarked ЛОЙИҲА (DRAFT) on every page.

**What the software implements:** A complete ИРР feature built on the DRAFT structure.

**Risk:** Any criterion, item, or structural element may change when the standard is finalized. The data-driven design mitigates this: changing a criterion is a seed data update, not a code change. However, if the NUMBER of criteria changes significantly (e.g., from 17 to 25), or the column structure of goal tables changes, a schema migration will be required.

**⚠️ ACKNOWLEDGMENT REQUIRED:** The build proceeds on the DRAFT standard with the partner's acknowledgment that post-finalization changes may require migration work. No additional ministry sign-off needed — the risk is engineering, not regulatory.

---

## Part G — Open Questions for Max / Partner

| # | Question | Blocked area |
|---|---|---|
| OQ-1 | Is criterion 9 (hearing-specific) scored for ALL children or only hearing-impaired children? If skipped for non-hearing-impaired, how is the progress table score computed — out of 64 or 68? Is the max displayed to parents? | Assessment engine, score table display |
| OQ-2 | What is the typical validity period of a ПТПК conclusion? (1 year? 2 years?) This determines the target date range for long-term goals. | LongTermGoal UI |
| OQ-3 | Who fills the quarterly monitoring checklist — the daycare manager (раҳбар), or can a teacher also fill it? | QuarterlyMonitoringEntry access control, role gating |
| OQ-4 | Should parents see individual criterion scores per assessment session, or only the aggregate score progression table? | Parent-side assessment view |
| OQ-5 | Should daily/weekly journal entries be REQUIRED for every child every day/week, or are they optional records? If required: what happens if a day is skipped (historical gap vs. blocked UI)? | DailyMonitoringEntry UX, validation |
| OQ-6 | The printed daily/weekly journals show all children on one sheet (group format). Should the digital UX have a group view (teacher fills one form for all children at once), a per-child view, or both? | Teacher-side journal entry UX |
| OQ-7 | Should the ИРР support digital signature fields that map to the physical signatures (teacher + manager), or are physical signatures on printed ИРR the only valid legal record? | GoalPeriod signature fields, print/export |
| OQ-8 | Is printing / PDF export of the ИРР document a Day 1 requirement for beta? | Export feature scope |
| OQ-9 | The standard shows "Боланинг кучли томонлари" (strengths) and "Хатар омиллари" (risk factors) on a single page before long-term goals. Are these fields mandatory, or advisory? | Header gate validation |
| OQ-10 | The parent engagement section of the quarterly monitoring appears to have 15 items in the standard, but our extraction shows 14 items clearly — one may be partially obscured. Partner to confirm the complete list. | QuarterlyMonitoringEntry seed data |
| OQ-11 | Long-term goals have no skill-area column (unlike short-term goals). Should the UI add an optional skill area tag to long-term goals to make them easier to link to short-term goal planning? | LongTermGoal model + UI |
| OQ-12 | Should a child's ИРР be archived when the child leaves the daycare service (departure tracked in quarterly monitoring), or remain active until explicitly archived by a teacher/manager? | IRR status lifecycle |

---

## Appendix — Document Structure Map (Standard → Software)

```
PDF page → Software concept

p.12    ИРР header form                     → IRR.header fields
p.13    Score summary table (5 time points) → AssessmentSession list (parent view)
p.14-15 17-criteria assessment table        → AssessmentCriteria seed + AssessmentScore entries
p.15    "Build ИРР from assessment results" → Gate: assessment required before goals
p.16    Strengths + risk factors            → IRR.childStrengths + IRR.riskFactors
p.17    Long-term goals (up to 5)           → LongTermGoal records
p.18-19 Short-term goals, current quarter   → GoalPeriod + ShortTermGoal records
p.20    Quarterly review                    → GoalPeriod.review fields
p.21    Next quarter goals (blank)          → New GoalPeriod UI
p.22    Daily monitoring journal             → DailyMonitoringEntry per child per day
p.23a   Weekly journal — emotional          → WeeklyMonitoringEntry.emotionalData
p.23b   Weekly journal — environment        → WeeklyMonitoringEntry.environmentData
p.24-25 Quarterly monitoring (facility)     → QuarterlyMonitoringEntry per school per quarter
p.25    Incident log                        → SEPARATE: IncidentLog model (out of ИРР scope)
p.26    Visitor log                         → SEPARATE: VisitorLog model (out of ИРР scope)
p.27    Anonymous complaint form            → SEPARATE: out of scope for ИРР feature
p.28    Parent satisfaction survey          → SEPARATE: out of scope for ИРР feature
```

---

*Spec prepared from primary source documents. All Uzbek Cyrillic terms transcribed exactly from the standard. Unclear items flagged as open questions rather than guessed.*
