# Uchqun — Demo Profiles

> **SYNTHETIC TEST DATA — STAGING ONLY — NOT REAL PERSONS**  
> All names are invented combinations of common Uzbek names. Phone numbers use valid +998 prefixes with invented subscriber digits. Diagnoses are real ПТПК clinical categories written in current professional Uzbek Cyrillic terminology. No real individuals are represented.

**Environment:** Railway production  
**Backend:** https://uchqun-production-b484.up.railway.app  
**Password (all accounts):** `Test@2026`  
**Shaped:** 2026-05-30 (PROD-READINESS-03)  
**Seed credentials:** see `credentials.md`

---

## Government Users (3)

| Email | Name | Phone | Role |
|---|---|---|---|
| `gov.republic@uchqun.uz` | Hamidjon Mirzayev | +998 90 512 34 56 | Republic |
| `gov.toshkent@uchqun.uz` | Nodira Yusupova | +998 91 623 45 67 | Region 01 (Toshkent) |
| `gov.samarqand@uchqun.uz` | Sherzod Raximov | +998 93 734 56 78 | Region 02 (Samarqand) |

---

## School 1 — Toshkent Maxsus Maktab 1 (Region 01)

### Adults

| Role | Email | Name | Phone |
|---|---|---|---|
| admin | `admin1@uchqun.uz` | Dilnoza Xoliqova | +998 94 817 83 45 |
| reception | `reception1@uchqun.uz` | Iroda Abdullayeva | +998 95 348 92 16 |
| teacher | `teacher1@uchqun.uz` | Zulfiya Nazarova | +998 90 459 17 28 |
| teacher | `teacher2@uchqun.uz` | Doniyor Ergashev | +998 33 561 24 39 |
| parent | `parent1@uchqun.uz` | Hulkar Sobirova | +998 97 672 35 84 |
| parent | `parent2@uchqun.uz` | Dilorom Tursunova | +998 99 783 46 51 |
| parent | `parent3@uchqun.uz` | Jasur Qodirov | +998 88 894 57 62 |

### Children

#### Bobur Sobirov (A-guruh → Zulfiya Nazarova, parent: Hulkar Sobirova)

| Field | Value |
|---|---|
| Date of Birth | 2022-01-15 |
| Class | Maktabgacha |
| Disability type | Аутистик спектр бузилишлари (енгил-ўрта даражада) |
| Medical diagnosis | АСБ, F84.0 |
| Special needs | Тузилган муҳит, визуал жадвал, сенсор интеграция машқлари |
| Child description | Нутқ ифодаси чекланган; кўз алоқаси вақти-вақти билан; ёлғиз ўйинни афзал кўради |
| Expected outcomes | Тенгдошлар билан функционал мулоқот; 20+ сўз бойлиги |
| Father | Sobirov Bobir Hamidovich, 1985-03-10, Savdo vakili |
| Mother | Sobirova Hulkar Yusupovna, 1988-07-22, Uy bekasi |
| Address | Toshkent sh., Yunusobod t., Navruz ko'chasi 14-uy |
| Contact phone | +998 97 672 35 84 |
| Institution start | 2024-09-01 |
| Emergency contact | Sobirova Hulkar: +998 97 672 35 84 |

**ПТПК fields for IRR creation:**
- `ptpkIntakeDate`: 2024-08-15
- `ptpkConclusionDate`: 2024-08-29
- `ptpkConclusionNumber`: ПТПК-2024-T01-0081
- `ptpkDiagnosis`: Аутистик спектр бузилишлари, F84.0 (ДСМ-5 мезони бўйича 1-даража)

---

#### Shahlo Tursunova (A-guruh → Zulfiya Nazarova, parent: Dilorom Tursunova)

| Field | Value |
|---|---|
| Date of Birth | 2018-11-20 |
| Class | 1-sinf |
| Disability type | Эшитиш қобилиятининг ўрта-оғир даражада чекланганлиги |
| Medical diagnosis | Иккала томонлама нейросенсор эшитмаслик, H90.3 |
| Special needs | Ешитиш аппарати, FM тизими, оғзаки нутқни ривожлантириш машқлари |
| Child description | Иккала томонда эшитиш аппарати тақади; лабдан ўқишда қобилиятли; синф олдинги қаторида ўтиради |
| Expected outcomes | Эшитиш аппарати билан мустақил нутқ; ёзма саводхонлик асослари |
| Father | Tursunov Mansur Salimovich, 1982-05-18, Haydovchi |
| Mother | Tursunova Dilorom Karimovna, 1986-09-04, Tibbiyot hamshirasi |
| Address | Toshkent sh., Yunusobod t., Bog'bon ko'chasi 7-uy, 3-xonadon |
| Contact phone | +998 99 783 46 51 |
| Institution start | 2025-09-01 |
| Emergency contact | Tursunova Dilorom: +998 99 783 46 51 |

**ПТПК fields for IRR creation:**
- `ptpkIntakeDate`: 2025-08-10
- `ptpkConclusionDate`: 2025-08-24
- `ptpkConclusionNumber`: ПТПК-2025-T01-0112
- `ptpkDiagnosis`: Иккала томонлама нейросенсор эшитмаслик, ўрта-оғир даража (H90.3)

---

#### Lola Qodirova (B-guruh → Doniyor Ergashev, parent: Jasur Qodirov)

| Field | Value |
|---|---|
| Date of Birth | 2014-09-08 |
| Class | 5-sinf |
| Disability type | Болалар церебрал фалажи (атетоид шакл, нутқ кўникмалари чекланган) |
| Medical diagnosis | БЦФ, дискинетик шакл, G80.3 |
| Special needs | Ногиронлик аравачаси, логопедик машқлар, AAC қурилмаси |
| Child description | Ихтиёрий ҳаракатлар назоратида қийинчилик; нутқ тушунарсиз; коммуникация учун AAC планшетидан фойдаланади |
| Expected outcomes | AAC орқали мустақил мулоқот; академик кўникмаларни синфдошлар билан ривожлантириш |
| Father | Qodirov Jasur Salimovich, 1978-12-25, Injener |
| Mother | Qodirova Sarvinoz Umarovna, 1981-04-11, O'qituvchi |
| Address | Toshkent sh., Chilonzor t., Mustaqillik ko'chasi 33-uy |
| Contact phone | +998 88 894 57 62 |
| Institution start | 2021-09-01 |
| Emergency contact | Qodirov Jasur: +998 88 894 57 62 |

**ПТПК fields for IRR creation:**
- `ptpkIntakeDate`: 2021-08-05
- `ptpkConclusionDate`: 2021-08-19
- `ptpkConclusionNumber`: ПТПК-2021-T01-0047
- `ptpkDiagnosis`: Болалар церебрал фалажи, дискинетик шакл (G80.3); нутқ ва мотор кўникмаларида чуқур чеклов

---

## School 2 — Toshkent Maxsus Maktab 2 (Region 01)

### Adults

| Role | Email | Name | Phone |
|---|---|---|---|
| admin | `admin2@uchqun.uz` | Bahrom Xasanov | +998 91 129 68 73 |
| reception | `reception2@uchqun.uz` | Yulduz Mirzayeva | +998 93 234 79 84 |
| teacher | `teacher3@uchqun.uz` | Feruza Normatova | +998 94 345 81 96 |
| teacher | `teacher4@uchqun.uz` | Sardor Toshpulatov | +998 95 456 92 17 |
| parent | `parent4@uchqun.uz` | Kamola Hasanova | +998 90 567 13 28 |
| parent | `parent5@uchqun.uz` | Lobar Mirzayeva | +998 33 678 24 39 |
| parent | `parent6@uchqun.uz` | Mansur Rahimov | +998 97 789 35 46 |

### Children

#### Murod Hasanov (A-guruh → Feruza Normatova, parent: Kamola Hasanova)

| Field | Value |
|---|---|
| Date of Birth | 2021-04-12 |
| Class | Tayyorlov |
| Disability type | Болалар церебрал фалажи (спастик диплегия) |
| Medical diagnosis | БЦФ, спастик диплегия, G80.1 |
| Special needs | Физиотерапия, ортопедик мослашувлар, ҳаракат ривожлантириш машқлари |
| Child description | Нутқ яхши ривожланган; оёқлар мускуллари тонуси юқори; ёрдамчи воситасиз қисқа масофани босиб ўтади |
| Expected outcomes | Мустақил юриш имкониятини кенгайтириш; синфда тенг иштирок этиш |
| Father | Hasanov Bahrom Ismoilovich, 1987-08-30, Hisobchi |
| Mother | Hasanova Kamola Rашidovna, 1990-02-14, Logoped |
| Address | Toshkent sh., Shayxontohur t., Zarqaynar ko'chasi 5-uy |
| Contact phone | +998 90 567 13 28 |
| Institution start | 2024-09-01 |
| Emergency contact | Hasanova Kamola: +998 90 567 13 28 |

**ПТПК fields for IRR creation:**
- `ptpkIntakeDate`: 2024-08-12
- `ptpkConclusionDate`: 2024-08-26
- `ptpkConclusionNumber`: ПТПК-2024-T02-0063
- `ptpkDiagnosis`: Болалар церебрал фалажи, спастик диплегия (G80.1); мотор функцияси ўрта даражада чекланган

---

#### Jasur Mirzayev (A-guruh → Feruza Normatova, parent: Lobar Mirzayeva)

| Field | Value |
|---|---|
| Date of Birth | 2016-08-25 |
| Class | 3-sinf |
| Disability type | Диққат етишмаслиги ва гиперактивлик синдроми (ўқиш қийинчиликлари билан) |
| Medical diagnosis | ДЕГС, F90.0; коморбид дислексия |
| Special needs | Чалғитиш камроқ бўлган муҳит, харакат танаффуслари, мультисенсор ўқиш ёндашуви |
| Child description | Диққатни жамлашда қийинчилик; ўрин алмашиб юради; вазифаларни бошлайди-у тугатмайди; тенгдошлари билан ижобий муносабатда |
| Expected outcomes | Синфда 20 дақиқа диққатни сақлаш; ёш меъёрига мос ўқиш суръати |
| Father | Mirzayev Ulugbek Hamidovich, 1984-11-07, Dasturchi |
| Mother | Mirzayeva Lobar Toshmatovna, 1987-06-19, Tabiiy fanlar o'qituvchisi |
| Address | Toshkent sh., Mirzo Ulug'bek t., Universitet ko'chasi 18-uy, 12-xonadon |
| Contact phone | +998 33 678 24 39 |
| Institution start | 2023-09-01 |
| Emergency contact | Mirzayeva Lobar: +998 33 678 24 39 |

**ПТПК fields for IRR creation:**
- `ptpkIntakeDate`: 2023-08-08
- `ptpkConclusionDate`: 2023-08-22
- `ptpkConclusionNumber`: ПТПК-2023-T02-0094
- `ptpkDiagnosis`: Диққат етишмаслиги ва гиперактивлик синдроми (F90.0), ўқиш кўникмаларида кечикиш билан

---

#### Diyora Rahimova (B-guruh → Sardor Toshpulatov, parent: Mansur Rahimov)

| Field | Value |
|---|---|
| Date of Birth | 2019-10-03 |
| Class | 1-sinf |
| Disability type | Эпилепсия (ривожланиш кечикиши билан) |
| Medical diagnosis | Симптоматик эпилепсия, G40.2; интеллектуал ривожланиш кечикиши |
| Special needs | Тиббий огоҳлантириш режаси, стресссиз муҳит, нобекор таълим |
| Child description | Ой-да 2-3 маротаба ўртача тутқаноқ хуружи; дори назорати остида; синфда нобекор ёндашувга муҳтож |
| Expected outcomes | 6 ой давомида хуружсиз давр; асосий академик кўникмаларни эгаллаш |
| Father | Rahimov Mansur Bekmurodovich, 1983-07-14, Ошпаз |
| Mother | Rahimova Mohira Nazarovna, 1986-03-28, Tibbiyot texnigi |
| Address | Toshkent sh., Uchtepa t., Olmazor ko'chasi 22-uy |
| Contact phone | +998 97 789 35 46 |
| Institution start | 2025-09-01 |
| Emergency contact | Rahimov Mansur: +998 97 789 35 46 |

**ПТПК fields for IRR creation:**
- `ptpkIntakeDate`: 2025-08-06
- `ptpkConclusionDate`: 2025-08-20
- `ptpkConclusionNumber`: ПТПК-2025-T02-0071
- `ptpkDiagnosis`: Симптоматик эпилепсия (G40.2), интеллектуал ривожланиш кечикиши билан

---

## School 3 — Samarqand Maxsus Maktab 1 (Region 02)

### Adults

| Role | Email | Name | Phone |
|---|---|---|---|
| admin | `admin3@uchqun.uz` | Vohida Toshmatova | +998 99 891 46 57 |
| reception | `reception3@uchqun.uz` | Xurshida Norqulova | +998 88 912 57 68 |
| teacher | `teacher5@uchqun.uz` | Shahnoza Ergasheva | +998 91 123 68 79 |
| teacher | `teacher6@uchqun.uz` | Erkin Nazarov | +998 93 245 79 81 |
| parent | `parent7@uchqun.uz` | Nafosatoy Hamidova | +998 94 356 81 92 |
| parent | `parent8@uchqun.uz` | Ozoda Karimova | +998 95 467 92 13 |
| parent | `parent9@uchqun.uz` | Pahlavon Ergashev | +998 90 578 13 24 |

### Children

#### Sarvar Hamidov (A-guruh → Shahnoza Ergasheva, parent: Nafosatoy Hamidova)

| Field | Value |
|---|---|
| Date of Birth | 2019-07-18 |
| Class | 1-sinf |
| Disability type | Даун синдроми |
| Medical diagnosis | Даун синдроми, трисомия 21, Q90.0 |
| Special needs | Визуал тасдиқлаш, такрорий машқлар, нутқ терапияси |
| Child description | Ёқимли ва ижтимоий; тили яхши тушунилади; кенгайтирилган топшириқларга эришган |
| Expected outcomes | Функционал ўқиш ва санаш; мустақил жамиятга мослашув кўникмалари |
| Father | Hamidov Sherzod Abdurahimovich, 1986-04-22, Qishloq xo'jaligi mutaxassisi |
| Mother | Hamidova Nafosatoy Tursunovna, 1989-10-05, Uy bekasi |
| Address | Samarqand sh., Siёb t., Temur ko'chasi 9-uy |
| Contact phone | +998 94 356 81 92 |
| Institution start | 2025-09-01 |
| Emergency contact | Hamidova Nafosatoy: +998 94 356 81 92 |

**ПТПК fields for IRR creation:**
- `ptpkIntakeDate`: 2025-08-14
- `ptpkConclusionDate`: 2025-08-28
- `ptpkConclusionNumber`: ПТПК-2025-S01-0038
- `ptpkDiagnosis`: Даун синдроми, трисомия 21 (Q90.0); ўрта даражали интеллектуал ривожланиш кечикиши

---

#### Aziza Karimova (A-guruh → Shahnoza Ergasheva, parent: Ozoda Karimova)

| Field | Value |
|---|---|
| Date of Birth | 2021-11-05 |
| Class | Maktabgacha |
| Disability type | Нутқ ва тил ривожланишининг кечикиши |
| Medical diagnosis | Нутқ ривожланишининг тизимли кечикиши, F80.1 |
| Special needs | Ҳафтасига икки марта логопедик машқлар, оила ичидаги нутқ стимуляцияси |
| Child description | 4 ёшда нутқ 18 ойлик даражасида; тушунишда яхши; ифода этишда кечикиш; нутқ терапиясига яхши жавоб беради |
| Expected outcomes | Ёшга мос нутқ даражасига эришиш; мактабгача таълимга тайёрлик |
| Father | Karimov Javlon Rустамович, 1988-09-17, Ошпаз |
| Mother | Karimova Ozoda Mirzayevna, 1991-01-30, Savdogar |
| Address | Samarqand sh., Bulunur t., Navruz ko'chasi 4-uy, 8-xonadon |
| Contact phone | +998 95 467 92 13 |
| Institution start | 2024-09-01 |
| Emergency contact | Karimova Ozoda: +998 95 467 92 13 |

**ПТПК fields for IRR creation:**
- `ptpkIntakeDate`: 2024-08-20
- `ptpkConclusionDate`: 2024-09-03
- `ptpkConclusionNumber`: ПТПК-2024-S01-0051
- `ptpkDiagnosis`: Нутқ ва тил ривожланишининг тизимли кечикиши (F80.1)

---

#### Zafar Ergashev (B-guruh → Erkin Nazarov, parent: Pahlavon Ergashev)

| Field | Value |
|---|---|
| Date of Birth | 2015-06-14 |
| Class | 4-sinf |
| Disability type | Аутистик спектр бузилишлари (нутқсиз, сенсор хусусиятлари ифода этилган) |
| Medical diagnosis | АСБ, F84.0 (ДСМ-5 3-даража); функционал нутқ йўқ |
| Special needs | AAC (PECS/SGD), сенсор муҳит тартибга солинган, бир-бир таълим оралиқлари |
| Child description | Нутқ йўқ; расмли картачалар/AAC орқали мулоқот; ёрдамсиз туалетга боради; сенсор ҳаракатлар кузатилади |
| Expected outcomes | AAC сўзлар бойлигини 50+ га кенгайтириш; ёш катталар ишлаш жойига ўтиш |
| Father | Ergashev Pahlavon Yusupovich, 1979-02-09, Dehqon |
| Mother | Ergasheva Gulnora Hamidovna, 1983-08-23, Uy bekasi |
| Address | Samarqand vil., Urgut t., Bog' ko'chasi 16-uy |
| Contact phone | +998 90 578 13 24 |
| Institution start | 2022-09-01 |
| Emergency contact | Ergashev Pahlavon: +998 90 578 13 24 |

**ПТПК fields for IRR creation:**
- `ptpkIntakeDate`: 2022-08-03
- `ptpkConclusionDate`: 2022-08-17
- `ptpkConclusionNumber`: ПТПК-2022-S01-0029
- `ptpkDiagnosis`: Аутистик спектр бузилишлари (F84.0), 3-даража; функционал нутқ йўқ, сенсор ифодаси аниқ

---

## School 4 — Samarqand Maxsus Maktab 2 (Region 02)

### Adults

| Role | Email | Name | Phone |
|---|---|---|---|
| admin | `admin4@uchqun.uz` | Gulsanam Xolmatova | +998 33 689 24 35 |
| reception | `reception4@uchqun.uz` | Umida Qodirboyeva | +998 97 791 35 48 |
| teacher | `teacher7@uchqun.uz` | Maftuna Aliyeva | +998 99 892 47 58 |
| teacher | `teacher8@uchqun.uz` | Akbar Pulatov | +998 88 913 57 61 |
| parent | `parent10@uchqun.uz` | Rano Yusupova | +998 91 124 68 72 |
| parent | `parent11@uchqun.uz` | Sanjar Qodirov | +998 93 235 79 83 |
| parent | `parent12@uchqun.uz` | Tursunoy Ahmedova | +998 94 346 81 94 |

### Children

#### Sanjar Yusupov (A-guruh → Maftuna Aliyeva, parent: Rano Yusupova)

| Field | Value |
|---|---|
| Date of Birth | 2017-12-01 |
| Class | 2-sinf |
| Disability type | Ақлий ривожланишнинг ўрта даражали кечикиши |
| Medical diagnosis | Интеллектуал ривожланиш кечикиши, ўрта даражали, F71 |
| Special needs | Структуралашган вазифалар, такрорий машқлар, мослашган ўқув материаллари |
| Child description | Мустақил кийиниш ва ейишга қодир; нутқ бор, ибора даражасида; мустақил ўқишга ўрганмоқда |
| Expected outcomes | Функционал ўқиш ва рақамлар; кундалик мустақил яшаш кўникмалари |
| Father | Yusupov Baxtiyor Karimovich, 1984-06-11, Mexanik |
| Mother | Yusupova Rano Egamberdiyevna, 1987-04-25, Uy bekasi |
| Address | Samarqand sh., Ўртачирчиқ t., Guliston ko'chasi 11-uy |
| Contact phone | +998 91 124 68 72 |
| Institution start | 2024-09-01 |
| Emergency contact | Yusupova Rano: +998 91 124 68 72 |

**ПТПК fields for IRR creation:**
- `ptpkIntakeDate`: 2024-08-09
- `ptpkConclusionDate`: 2024-08-23
- `ptpkConclusionNumber`: ПТПК-2024-S02-0044
- `ptpkDiagnosis`: Интеллектуал ривожланиш кечикиши, ўрта даражали (F71)

---

#### Nozima Qodirova (A-guruh → Maftuna Aliyeva, parent: Sanjar Qodirov)

| Field | Value |
|---|---|
| Date of Birth | 2023-02-27 |
| Class | Maktabgacha |
| Disability type | Умумий ривожланиш кечикиши |
| Medical diagnosis | Умумий ривожланиш кечикиши (сабаб аниқланмаган), F89 |
| Special needs | Эрта аралашув, мотор ривожлантириш, нутқ стимуляцияси |
| Child description | Ҳаракат ва нутқ соҳасида ёшга мос белгиларга эришилмаган; тетик ва истиқболли; эрта аралашувга яхши жавоб бермоқда |
| Expected outcomes | 3 ёшга мос ривожланиш нуқталарига эришиш; мактабгача гуруҳга тайёрлик |
| Father | Qodirov Sanjar Abdullayevich, 1990-12-03, Тикувчи |
| Mother | Qodirova Nafisa Mirzayevna, 1993-07-16, Pedagog |
| Address | Samarqand sh., Payariq t., Тинчлик ko'chasi 3-uy |
| Contact phone | +998 93 235 79 83 |
| Institution start | 2025-03-01 |
| Emergency contact | Qodirov Sanjar: +998 93 235 79 83 |

**ПТПК fields for IRR creation:**
- `ptpkIntakeDate`: 2025-02-10
- `ptpkConclusionDate`: 2025-02-24
- `ptpkConclusionNumber`: ПТПК-2025-S02-0012
- `ptpkDiagnosis`: Умумий ривожланиш кечикиши (F89); этиология аниқланмаган; мониторинг тавсия этилган

---

#### Malika Ahmedova (B-guruh → Akbar Pulatov, parent: Tursunoy Ahmedova)

| Field | Value |
|---|---|
| Date of Birth | 2020-09-16 |
| Class | Tayyorlov |
| Disability type | Кўриш қобилиятининг оғир даражада чекланганлиги |
| Medical diagnosis | Иккала кўзда оғир кўриш заифлиги, H54.2; корнеал дистрофия |
| Special needs | Брайл таёрлиги, ёруғлик кучайтиргичлар, мобилlik машқлари |
| Child description | Нутқ яхши ривожланган; математикага қизиқади; тактил материалларни ишлатади; мобилlik ва мустақилликни ривожлантираётган |
| Expected outcomes | Брайл ўқиш ва ёзиш; мустақил харакатланиш жойидаги муҳит доирасида |
| Father | Ahmedov Tursun Xolmatovich, 1981-10-08, Ҳимоячи |
| Mother | Ahmedova Tursunoy Rashidovna, 1985-05-31, Uy bekasi |
| Address | Samarqand sh., Нарпай t., Mustaqillik ko'chasi 7-uy |
| Contact phone | +998 94 346 81 94 |
| Institution start | 2025-09-01 |
| Emergency contact | Ahmedova Tursunoy: +998 94 346 81 94 |

**ПТПК fields for IRR creation:**
- `ptpkIntakeDate`: 2025-08-18
- `ptpkConclusionDate`: 2025-09-01
- `ptpkConclusionNumber`: ПТПК-2025-S02-0061
- `ptpkDiagnosis`: Иккала кўзда оғир кўриш заифлиги (H54.2); корнеал дистрофия, прогрессив

---

## Diagnosis Distribution by School

| School | Child | Diagnosis category |
|---|---|---|
| School 1 | Bobur Sobirov | ASD (1-daraja, functional speech) |
| School 1 | Shahlo Tursunova | Hearing impairment (moderate-severe) |
| School 1 | Lola Qodirova | Cerebral palsy (athetoid, AAC) |
| School 2 | Murod Hasanov | Cerebral palsy (spastic diplegia) |
| School 2 | Jasur Mirzayev | ADHD + dyslexia |
| School 2 | Diyora Rahimova | Epilepsy + intellectual delay |
| School 3 | Sarvar Hamidov | Down syndrome |
| School 3 | Aziza Karimova | Speech/language delay |
| School 3 | Zafar Ergashev | ASD (level 3, non-verbal, AAC) |
| School 4 | Sanjar Yusupov | Moderate intellectual disability |
| School 4 | Nozima Qodirova | Global developmental delay |
| School 4 | Malika Ahmedova | Severe visual impairment |

No school has two children with the same diagnosis category. All diagnoses use current ICD-10/DSM-5 codes and ПТПК-appropriate Uzbek Cyrillic terminology.

---

## Notes for Testers

- **Creating IRRs:** use the `ptpkIntakeDate`, `ptpkConclusionDate`, `ptpkConclusionNumber`, `ptpkDiagnosis` values above when creating IRR documents via the Teacher portal. These fields live on the `irrs` table, NOT on the `children` table.
- **Parent portal:** log in as any `parentN@uchqun.uz` to see their child's profile and progress.
- **Teacher portal:** `teacher1/2` = School 1; `teacher3/4` = School 2; `teacher5/6` = School 3; `teacher7/8` = School 4.
- **Admin portal:** `adminN@uchqun.uz` for School N.
- **Government portal:** `gov.republic` sees all schools; `gov.toshkent` sees Region 01 (Schools 1+2); `gov.samarqand` sees Region 02 (Schools 3+4).
