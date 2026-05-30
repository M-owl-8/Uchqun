-- PROD-READINESS-03: Shape demo profiles (31 users + 12 children)
-- Date: 2026-05-30
-- All string literals use $$ quoting to avoid Uzbek apostrophe escaping

BEGIN;

-- ============================================================
-- STEP 1: UPDATE 31 USERS (firstName, lastName, phone)
-- ============================================================

-- Government (3)
UPDATE users SET "firstName"='Hamidjon', "lastName"='Mirzayev',    phone='+998 90 512 34 56', "updatedAt"=NOW() WHERE id='e64efc66-4767-4abf-ba87-b822b440c425';
UPDATE users SET "firstName"='Nodira',   "lastName"='Yusupova',    phone='+998 91 623 45 67', "updatedAt"=NOW() WHERE id='a5e497f8-1015-4405-92f2-a9119eca8246';
UPDATE users SET "firstName"='Sherzod',  "lastName"='Raximov',     phone='+998 93 734 56 78', "updatedAt"=NOW() WHERE id='e7916c76-ff93-4a46-9b14-81482e441355';

-- School 1: Toshkent Maxsus Maktab 1
UPDATE users SET "firstName"='Dilnoza',  "lastName"='Xoliqova',    phone='+998 94 817 83 45', "updatedAt"=NOW() WHERE id='23ab5921-ab51-4cd4-9267-6ff3b8439a4e';
UPDATE users SET "firstName"='Iroda',    "lastName"='Abdullayeva', phone='+998 95 348 92 16', "updatedAt"=NOW() WHERE id='f1b91cd2-d113-46ba-8cf9-cd0cc5019ba1';
UPDATE users SET "firstName"='Zulfiya',  "lastName"='Nazarova',    phone='+998 90 459 17 28', "updatedAt"=NOW() WHERE id='d77eb37b-0da4-4530-8096-9ea221e9a891';
UPDATE users SET "firstName"='Doniyor',  "lastName"='Ergashev',    phone='+998 33 561 24 39', "updatedAt"=NOW() WHERE id='4ffa3e08-d35e-457f-a930-7f6d6c562b9f';
UPDATE users SET "firstName"='Hulkar',   "lastName"='Sobirova',    phone='+998 97 672 35 84', "updatedAt"=NOW() WHERE id='e67cf25b-e129-4f3d-89b3-eef89b77c2b0';
UPDATE users SET "firstName"='Dilorom',  "lastName"='Tursunova',   phone='+998 99 783 46 51', "updatedAt"=NOW() WHERE id='a297d236-5350-42f5-941d-3404c03d281e';
UPDATE users SET "firstName"='Jasur',    "lastName"='Qodirov',     phone='+998 88 894 57 62', "updatedAt"=NOW() WHERE id='2ce225a6-c619-4cee-a694-583079418a92';

-- School 2: Toshkent Maxsus Maktab 2
UPDATE users SET "firstName"='Bahrom',   "lastName"='Xasanov',     phone='+998 91 129 68 73', "updatedAt"=NOW() WHERE id='c99dba0c-f181-49e4-9186-45580ae77a55';
UPDATE users SET "firstName"='Yulduz',   "lastName"='Mirzayeva',   phone='+998 93 234 79 84', "updatedAt"=NOW() WHERE id='d77d45aa-3acc-4ec2-b286-d9c83d20facc';
UPDATE users SET "firstName"='Feruza',   "lastName"='Normatova',   phone='+998 94 345 81 96', "updatedAt"=NOW() WHERE id='7152d1eb-059e-4905-90ee-36a561f268be';
UPDATE users SET "firstName"='Sardor',   "lastName"='Toshpulatov', phone='+998 95 456 92 17', "updatedAt"=NOW() WHERE id='efd5f5c1-ef54-4f70-b75e-966dae73033e';
UPDATE users SET "firstName"='Kamola',   "lastName"='Hasanova',    phone='+998 90 567 13 28', "updatedAt"=NOW() WHERE id='4797b521-fe3a-4570-9855-0154ad4d9e99';
UPDATE users SET "firstName"='Lobar',    "lastName"='Mirzayeva',   phone='+998 33 678 24 39', "updatedAt"=NOW() WHERE id='5a4c4628-cd4e-4925-ab02-8351161af8c3';
UPDATE users SET "firstName"='Mansur',   "lastName"='Rahimov',     phone='+998 97 789 35 46', "updatedAt"=NOW() WHERE id='a8cd6ab5-4e10-4322-a744-351566bf760f';

-- School 3: Samarqand Maxsus Maktab 1
UPDATE users SET "firstName"='Vohida',   "lastName"='Toshmatova',  phone='+998 99 891 46 57', "updatedAt"=NOW() WHERE id='a878ae4b-cf39-4e03-a39e-24dd016a9f82';
UPDATE users SET "firstName"='Xurshida', "lastName"='Norqulova',   phone='+998 88 912 57 68', "updatedAt"=NOW() WHERE id='bced0475-2c05-4e16-9b9e-d4c3c7c36b63';
UPDATE users SET "firstName"='Shahnoza', "lastName"='Ergasheva',   phone='+998 91 123 68 79', "updatedAt"=NOW() WHERE id='188cb980-4835-4a91-9c62-10dd8a4789d7';
UPDATE users SET "firstName"='Erkin',    "lastName"='Nazarov',     phone='+998 93 245 79 81', "updatedAt"=NOW() WHERE id='20bf29bf-7efa-43d7-81fd-fe921185c5a2';
UPDATE users SET "firstName"='Nafosatoy',"lastName"='Hamidova',    phone='+998 94 356 81 92', "updatedAt"=NOW() WHERE id='07f21999-66af-47c4-8541-478bd9ce3bad';
UPDATE users SET "firstName"='Ozoda',    "lastName"='Karimova',    phone='+998 95 467 92 13', "updatedAt"=NOW() WHERE id='6bebc5f6-414f-4fe1-9791-f210af285460';
UPDATE users SET "firstName"='Pahlavon', "lastName"='Ergashev',    phone='+998 90 578 13 24', "updatedAt"=NOW() WHERE id='b4a6e261-b92e-4ddf-9599-884135037257';

-- School 4: Samarqand Maxsus Maktab 2
UPDATE users SET "firstName"='Gulsanam', "lastName"='Xolmatova',   phone='+998 33 689 24 35', "updatedAt"=NOW() WHERE id='9b01fa07-4570-41e1-a322-fe128fe0b1da';
UPDATE users SET "firstName"='Umida',    "lastName"='Qodirboyeva', phone='+998 97 791 35 48', "updatedAt"=NOW() WHERE id='db104a8b-e691-4138-a7e0-4d044ed3a740';
UPDATE users SET "firstName"='Maftuna',  "lastName"='Aliyeva',     phone='+998 99 892 47 58', "updatedAt"=NOW() WHERE id='56009e7e-1420-451d-8bd9-91f03249d86e';
UPDATE users SET "firstName"='Akbar',    "lastName"='Pulatov',     phone='+998 88 913 57 61', "updatedAt"=NOW() WHERE id='880e989b-7cfc-4d26-8fcc-399f8ae8f528';
UPDATE users SET "firstName"='Rano',     "lastName"='Yusupova',    phone='+998 91 124 68 72', "updatedAt"=NOW() WHERE id='2f97d75c-5c82-483b-b2a7-4ef1ec29e980';
UPDATE users SET "firstName"='Sanjar',   "lastName"='Qodirov',     phone='+998 93 235 79 83', "updatedAt"=NOW() WHERE id='d86a143f-2fb3-4a1b-8a00-cf9f7795e78e';
UPDATE users SET "firstName"='Tursunoy', "lastName"='Ahmedova',    phone='+998 94 346 81 94', "updatedAt"=NOW() WHERE id='248f4087-fd38-4c92-bdda-cf6d2ed55696';

-- ============================================================
-- STEP 2: UPDATE 12 CHILDREN (full profiles + diagnoses)
-- Diagnosis distribution:
--   School 1: ASD mild | Hearing impairment | CP athetoid
--   School 2: CP spastic | ADHD+learning | Epilepsy+dev delay
--   School 3: Down syndrome | Speech delay | ASD non-verbal
--   School 4: ID moderate | Global dev delay | Visual impairment
-- ============================================================

-- CHILD 1: Bobur Sobirov, 4yo, ASD mild-moderate
-- Parent: Hulkar Sobirova (F = mother). Group A / Zulfiya Nazarova.
UPDATE children SET
  "firstName"           = 'Bobur',
  "lastName"            = 'Sobirov',
  "dateOfBirth"         = '2022-01-15',
  gender                = 'Male',
  "disabilityType"      = $$Аутистик спектр бузилишлари (енгил-ўрта даражада)$$,
  "medicalDiagnosis"    = $$F84.0 — Болалик аутизми (DSM-5: 299.00 АСД, 1-даража)$$,
  "specialNeeds"        = $$Ko'p takror va vizual ko'rsatmalar talab qiladi. Sensoriy yuklanishni boshqarish uchun jisman tinch joy kerak.$$,
  "childDescription"    = $$Strukturali kundalik tartibga yaxshi moslashadi. Yangi vaziyatlarda qisqa muddatli stress ko'rsatadi; mashg'ulotlarda qo'shimcha ko'rsatma talab qiladi. So'zlashuv 2-3 so'zli iboralarda — ko'rsatish va rasm-kartochkalar bilan muloqot samarali. Sensoriy jihatdan ovozli o'yinchoqlarni yaxshi ko'radi.$$,
  "expectedOutcomes"    = $$Muloqot ko'nikmalarini kengaytirish; jumlalar uzunligini 4-5 so'zgacha oshirish; guruhda maqsadga yo'naltirilgan o'yinlarda qatnashish.$$,
  "fatherFullName"      = 'Sobirov Sarvar Baxtiyorovich',
  "fatherDOB"           = '1990-03-15',
  "fatherOccupation"    = 'Haydovchi',
  "motherFullName"      = 'Sobirova Hulkar Tolqinovna',
  "motherOccupation"    = 'Pedagog',
  address               = 'Toshkent shahri, Mirzo Ulugbek tumani, 14-mavze, 5-uy',
  "contactPhone"        = '+998 97 672 35 84',
  "institutionStartDate"= '2025-09-01',
  "emergencyContact"    = '{"name":"Sobirov Sarvar","phone":"+998 97 111 22 33","relation":"ota"}'::jsonb,
  class                 = 'Maktabgacha',
  teacher               = 'Zulfiya Nazarova',
  "updatedAt"           = NOW()
WHERE id = '08b49ab0-c2f8-4921-b1d0-32554bc2b4ab';

-- CHILD 2: Shahlo Tursunova, 7yo, Hearing impairment moderate-severe
-- Parent: Dilorom Tursunova (F = mother). Group A / Zulfiya Nazarova.
UPDATE children SET
  "firstName"           = 'Shahlo',
  "lastName"            = 'Tursunova',
  "dateOfBirth"         = '2018-11-20',
  gender                = 'Female',
  "disabilityType"      = $$Эшитиш қобилиятининг ўрта-оғир даражада чекланганлиги$$,
  "medicalDiagnosis"    = $$H90.3 — Ikki tomonlama neyrosensor eshitish yo'qolishi, o'rta-og'ir daraja$$,
  "specialNeeds"        = $$Eshitish apparati (quloqchin) talab qilinadi. Ko'rgazmali materiallar va yozma ko'rsatmalar bilan ishlaydi.$$,
  "childDescription"    = $$Eshitish apparatidan foydalanadi. Ko'rgazmali materiallarga va yozma ko'rsatmalarga yaxshi javob beradi. O'rtoqlari bilan ishoralar orqali muloqot qiladi; nutqni o'qish boshlang'ich darajada. Tovushlarni aniqlashga bo'lgan mashg'ulotlari samarali.$$,
  "expectedOutcomes"    = $$Eshitish apparati bilan so'z boyligini boyitish; lip-reading ko'nikmalarini mustahkamlash; sinfda mustaqil faollik ko'rsatish.$$,
  "fatherFullName"      = 'Tursunov Anvar Bekzodovich',
  "fatherDOB"           = '1987-06-20',
  "fatherOccupation"    = 'Muhandis',
  "motherFullName"      = 'Tursunova Dilorom Anvarovna',
  "motherOccupation"    = 'Shifokor',
  address               = 'Toshkent shahri, Mirzo Ulugbek tumani, Yangiobod mahallasi, 18-uy',
  "contactPhone"        = '+998 99 783 46 51',
  "institutionStartDate"= '2024-09-01',
  "emergencyContact"    = '{"name":"Tursunov Anvar","phone":"+998 99 444 55 66","relation":"ota"}'::jsonb,
  class                 = '1-sinf',
  teacher               = 'Zulfiya Nazarova',
  "updatedAt"           = NOW()
WHERE id = 'cac33a77-53e5-430f-819e-6cf85d7fa4bb';

-- CHILD 3: Lola Qodirova, 11yo, CP athetoid communication-affected
-- Parent: Jasur Qodirov (M = father). Group B / Doniyor Ergashev.
UPDATE children SET
  "firstName"           = 'Lola',
  "lastName"            = 'Qodirova',
  "dateOfBirth"         = '2014-09-08',
  gender                = 'Female',
  "disabilityType"      = $$Болалар церебрал фалажи (атетоид шакл, нутқ кўникмалари чекланган)$$,
  "medicalDiagnosis"    = $$G80.3 — Diskinetik serebral falaj (athetoid shakl); nutq apraksiyasi$$,
  "specialNeeds"        = $$AAC (muloqot planshetlari / PECS) talab qilinadi. O'tirish pozitsiyasi uchun adaptiv stul kerak.$$,
  "childDescription"    = $$Hissiy muloqotga moyil, ko'z bilan aloqa yaxshi. Qo'l motorikasi cheklanganligidan yozishda yordam kerak. AAC qurilmasi bilan muloqot samarali — so'z lug'ati 40+ belgidan iborat. Kulgusi va ifodalari yorqin; guruh faoliyatlarida ishtirok etishni yaxshi ko'radi.$$,
  "expectedOutcomes"    = $$AAC so'z lug'atini 80 belgigacha kengaytirish; stabil o'tirish pozitsiyasida 30 daqiqa ishlash; mustaqil muloqot initsiyativalarini oshirish.$$,
  "fatherFullName"      = 'Qodirov Jasur Salimovich',
  "fatherDOB"           = '1988-09-03',
  "fatherOccupation"    = 'Tadbirkor',
  "motherFullName"      = 'Qodirova Sevinch Baxtiyorovna',
  "motherOccupation"    = 'Uy bekasi',
  address               = 'Toshkent shahri, Sergeli tumani, Gulzor mahallasi, 31-uy',
  "contactPhone"        = '+998 88 894 57 62',
  "institutionStartDate"= '2022-09-01',
  "emergencyContact"    = '{"name":"Qodirova Sevinch","phone":"+998 88 777 88 99","relation":"ona"}'::jsonb,
  class                 = '5-sinf',
  teacher               = 'Doniyor Ergashev',
  "updatedAt"           = NOW()
WHERE id = '365a0608-7943-427f-8e17-2599899cd93a';

-- CHILD 4: Murod Hasanov, 5yo, CP spastic diplegia
-- Parent: Kamola Hasanova (F = mother). Group A / Feruza Normatova.
UPDATE children SET
  "firstName"           = 'Murod',
  "lastName"            = 'Hasanov',
  "dateOfBirth"         = '2021-04-12',
  gender                = 'Male',
  "disabilityType"      = $$Болалар церебрал фалажи (спастик диплегия)$$,
  "medicalDiagnosis"    = $$G80.1 — Spastik diplegiyal serebral falaj; GMFCS darajasi II$$,
  "specialNeeds"        = $$Walker yoki qo'llab-quvvatlovchi qurilma talab qilinadi. Har 30 daqiqada harakatlanish tanaffusi kerak.$$,
  "childDescription"    = $$Qo'llar nisbatan erkin, oyoqlarda spastiklik mavjud. Walker bilan mustaqil harakatlanadi. Nutq aniq va tushunarli; tengdoshlari bilan munosabat yaxshi. Rasm chizish va bloklar bilan o'ynashni yaxshi ko'radi.$$,
  "expectedOutcomes"    = $$Mustaqil qadamlarni walker'siz kengaytirish; mayda motorika mashqlarini mustahkamlash; ijtimoiy ko'nikmalarni rivojlantirish.$$,
  "fatherFullName"      = 'Hasanov Dilshod Hamidovich',
  "fatherDOB"           = '1989-07-22',
  "fatherOccupation"    = 'Qurilishchi',
  "motherFullName"      = 'Hasanova Kamola Rustamovna',
  "motherOccupation"    = 'Hisobchi',
  address               = 'Toshkent shahri, Yunusobod tumani, 10-mavze, 23-uy',
  "contactPhone"        = '+998 90 567 13 28',
  "institutionStartDate"= '2025-09-01',
  "emergencyContact"    = '{"name":"Hasanov Dilshod","phone":"+998 90 222 33 44","relation":"ota"}'::jsonb,
  class                 = 'Tayyorlov',
  teacher               = 'Feruza Normatova',
  "updatedAt"           = NOW()
WHERE id = 'd8b10eb4-8d60-40fc-bb0d-ecaea1d80b12';

-- CHILD 5: Jasur Mirzayev, 9yo, ADHD + learning disability
-- Parent: Lobar Mirzayeva (F = mother). Group A / Feruza Normatova.
UPDATE children SET
  "firstName"           = 'Jasur',
  "lastName"            = 'Mirzayev',
  "dateOfBirth"         = '2016-08-25',
  gender                = 'Male',
  "disabilityType"      = $$Диққат етишмаслиги ва гиперактивлик синдроми (ўқиш қийинчиликлари билан)$$,
  "medicalDiagnosis"    = $$F90.0 — Giperkinetik faoliyat buzilishi; F81.9 — O'quv ko'nikmalarining rivojlanish buzilishi$$,
  "specialNeeds"        = $$Qisqa, aniq topshiriqlar kerak. Harakatlanish tanaffuslari samaradorlikni oshiradi. O'quv materiallarini kichik bo'laklarga bo'lish tavsiya etiladi.$$,
  "childDescription"    = $$Juda faol va izlanuvchan; qiziqarli topshiriqlarda 15-20 daqiqa diqqatni ushlay oladi. Matematikada kuchli; o'qish va yozishda qo'shimcha yordam kerak. Harakatli o'yinlarda ruhlanadi; sinfga qaytganda kontsentratsiyasi yaxshilanadi.$$,
  "expectedOutcomes"    = $$Diqqat muddatini 25 daqiqagacha oshirish; o'qish tezligi va tushunishini yaxshilash; xulq-atvor strategiyalarini mustahkamlash.$$,
  "fatherFullName"      = 'Mirzayev Bobur Hamroyevich',
  "fatherDOB"           = '1985-11-14',
  "fatherOccupation"    = 'Texnik',
  "motherFullName"      = 'Mirzayeva Lobar Xoliqovna',
  "motherOccupation"    = 'Savdogar',
  address               = 'Toshkent shahri, Yunusobod tumani, Shaxrisabz mahallasi, 7-uy',
  "contactPhone"        = '+998 33 678 24 39',
  "institutionStartDate"= '2023-09-01',
  "emergencyContact"    = '{"name":"Mirzayev Bobur","phone":"+998 33 555 66 77","relation":"ota"}'::jsonb,
  class                 = '3-sinf',
  teacher               = 'Feruza Normatova',
  "updatedAt"           = NOW()
WHERE id = '4eb13936-d4a8-42f4-bf79-88d8b65a1e70';

-- CHILD 6: Diyora Rahimova, 6yo, Epilepsy + developmental delay
-- Parent: Mansur Rahimov (M = father). Group B / Sardor Toshpulatov.
UPDATE children SET
  "firstName"           = 'Diyora',
  "lastName"            = 'Rahimova',
  "dateOfBirth"         = '2019-10-03',
  gender                = 'Female',
  "disabilityType"      = $$Эпилепсия (ривожланиш кечикиши билан)$$,
  "medicalDiagnosis"    = $$G40.3 — Umumlashgan idiopatik epilepsiya; F80.9 — Psixomotor rivojlanishning kechikishi$$,
  "specialNeeds"        = $$Dori-darmon rejimini kuzatib borish kerak. Tutqanoq bo'lgan taqdirda birinchi yordam ko'rsatmasi muhim. Ortiqcha charchoq va stress oldini olish tavsiya etiladi.$$,
  "childDescription"    = $$Dori-darmon bilan tutqanoqlar nazorat ostida (so'nggi 4 oyda hodisa yo'q). Uyqusirash va diqqat qisqa — ertalab darslar samaraliroq. Rasmlar va musiqa bilan mashg'ulotlarni yaxshi ko'radi. Yangi ko'nikmalarni o'zlashtirishda vaqt kerak, ammo mustahkamlanganda barqaror.$$,
  "expectedOutcomes"    = $$Kognitiv rivojlanishni kuzatib borish; diqqat muddatini 15 daqiqagacha oshirish; ertak va qo'shiqlar orqali so'z boyligini rivojlantirish.$$,
  "fatherFullName"      = 'Rahimov Mansur Bekmurodovich',
  "fatherDOB"           = '1987-06-22',
  "fatherOccupation"    = 'Qorovul',
  "motherFullName"      = 'Rahimova Manzura Sobirovna',
  "motherOccupation"    = 'Pediatr hamshira',
  address               = 'Toshkent shahri, Bektemir tumani, Yangi hayot mahallasi, 9-uy',
  "contactPhone"        = '+998 97 789 35 46',
  "institutionStartDate"= '2024-09-01',
  "emergencyContact"    = '{"name":"Rahimova Manzura","phone":"+998 97 888 99 00","relation":"ona"}'::jsonb,
  class                 = '1-sinf',
  teacher               = 'Sardor Toshpulatov',
  "updatedAt"           = NOW()
WHERE id = '21f7c7ab-0d49-4e5c-a2fb-b263b19b791d';

-- CHILD 7: Sarvar Hamidov, 6yo, Down syndrome
-- Parent: Nafosatoy Hamidova (F = mother). Group A / Shahnoza Ergasheva.
UPDATE children SET
  "firstName"           = 'Sarvar',
  "lastName"            = 'Hamidov',
  "dateOfBirth"         = '2019-07-18',
  gender                = 'Male',
  "disabilityType"      = $$Даун синдроми$$,
  "medicalDiagnosis"    = $$Q90.9 — Daun sindromi (21-xromosoma trisomiyasi); yurak defektlari yo'q$$,
  "specialNeeds"        = $$Mayda motorika rivojlantiruvchi mashqlar va nutq terapiyasi talab qilinadi. Ko'rgazmali o'qitish usullari samaraliroq.$$,
  "childDescription"    = $$Ijobiy kayfiyatli va mehnatsevar; o'qituvchi ko'rsatmalariga yaxshi javob beradi. Musiqa va ritmik mashg'ulotlarni sevadi. Nutq sekin rivojlanyapti — 2-3 so'zli iboralar, lekin tushunish ancha keng. Guruh a'zolari bilan do'stona munosabatda.$$,
  "expectedOutcomes"    = $$Jumlalar uzunligini oshirish; o'quv-grafik ko'nikmalarni mustahkamlash; kundalik o'z-o'zini parvarish ko'nikmalarini rivojlantirish.$$,
  "fatherFullName"      = 'Hamidov Ravshan Sobirovich',
  "fatherDOB"           = '1986-04-11',
  "fatherOccupation"    = 'Fermer',
  "motherFullName"      = 'Hamidova Nafosatoy Xoliqovna',
  "motherOccupation"    = 'Uy bekasi',
  address               = 'Samarqand shahri, Registon tumani, Navoi mahallasi, 7-uy',
  "contactPhone"        = '+998 94 356 81 92',
  "institutionStartDate"= '2024-09-01',
  "emergencyContact"    = '{"name":"Hamidov Ravshan","phone":"+998 94 111 22 34","relation":"ota"}'::jsonb,
  class                 = '1-sinf',
  teacher               = 'Shahnoza Ergasheva',
  "updatedAt"           = NOW()
WHERE id = '501f9bb2-5b83-43a7-b2cd-5393c7c0ceab';

-- CHILD 8: Aziza Karimova, 4yo, Speech & language delay
-- Parent: Ozoda Karimova (F = mother). Group A / Shahnoza Ergasheva.
UPDATE children SET
  "firstName"           = 'Aziza',
  "lastName"            = 'Karimova',
  "dateOfBirth"         = '2021-11-05',
  gender                = 'Female',
  "disabilityType"      = $$Нутқ ва тил ривожланишининг кечикиши$$,
  "medicalDiagnosis"    = $$F80.1 — Ekspressiv til buzilishi; F80.9 — Nutq rivojlanishining kechikishi$$,
  "specialNeeds"        = $$Logoped seanslarini haftada 3 marta tavsiya etiladi. Rasm-kartochkalar va ishoralar tizimlari yordam beradi.$$,
  "childDescription"    = $$Umumiy rivojlanish yoshi bo'yicha mos — faqat og'zaki nutq orqada. Ko'rsatilgan rasm-kartochkalar va ishoralar bilan muloqotni yaxshi tushunadi. Hali jumlalar tuzmaydi; logoped seanslarida faol ishtirok etadi. Ijodiy o'yinlarda tengdoshlari bilan qo'shilishga moyil.$$,
  "expectedOutcomes"    = $$2-so'zli jumlalar tuzish; 50 ta leksik birlikni faol ishlatish; logoped seanslarini haftada 3 martaga oshirish.$$,
  "fatherFullName"      = 'Karimov Zafar Nematovich',
  "fatherDOB"           = '1988-02-17',
  "fatherOccupation"    = 'Pedagog',
  "motherFullName"      = 'Karimova Ozoda Ravshanova',
  "motherOccupation"    = 'Tibbiyot hamshirasi',
  address               = 'Samarqand shahri, Registon tumani, Temur mahallasi, 14-uy',
  "contactPhone"        = '+998 95 467 92 13',
  "institutionStartDate"= '2025-09-01',
  "emergencyContact"    = '{"name":"Karimov Zafar","phone":"+998 95 333 44 55","relation":"ota"}'::jsonb,
  class                 = 'Maktabgacha',
  teacher               = 'Shahnoza Ergasheva',
  "updatedAt"           = NOW()
WHERE id = 'e30dff0f-d718-408c-b100-5c9501ba0daa';

-- CHILD 9: Zafar Ergashev, 10yo, ASD non-verbal sensory-significant
-- Parent: Pahlavon Ergashev (M = father). Group B / Erkin Nazarov.
UPDATE children SET
  "firstName"           = 'Zafar',
  "lastName"            = 'Ergashev',
  "dateOfBirth"         = '2015-06-14',
  gender                = 'Male',
  "disabilityType"      = $$Аутистик спектр бузилишлари (нутқсиз, сенсор хусусиятлари ифода этилган)$$,
  "medicalDiagnosis"    = $$F84.0 — Bolalar autizmi, og'ir daraja (DSM-5: ASD 3-daraja); sensorik integratsiya buzilishi$$,
  "specialNeeds"        = $$AAC qurilmasi (PECS / planshet) talab qilinadi. Sensoriy jihatdan qattiq tovushlar va yorqin yorug'lik cheklanishi kerak. Stabil kundalik tartib muhim.$$,
  "childDescription"    = $$Og'zaki nutq yo'q — AAC qurilmasi va PECS tizimlari bilan muloqot qiladi. Sensorik jihatdan qattiq tovushlar va yorqin yorug'lik qiyin. Qo'l-ko'z koordinatsiyasi yaxshi — planshet va puzzlelarni usta ishlatadi. Sevimli mashg'ulotlari aniq: sharlarni saralash, taniqli musiqa. Stabil tartib muhim.$$,
  "expectedOutcomes"    = $$AAC orqali muloqot birliklarini 30 tadan 60 tagacha oshirish; yangi muhitga moslashish vaqtini qisqartirish; sensorik cheklovlarni kengaytirish.$$,
  "fatherFullName"      = 'Ergashev Pahlavon Mansurovich',
  "fatherDOB"           = '1985-07-08',
  "fatherOccupation"    = 'Elektrik',
  "motherFullName"      = 'Ergasheva Dilnoza Xasanovna',
  "motherOccupation"    = 'Kitobxona xodimi',
  address               = 'Samarqand shahri, Bulungor tumani, Ipak mahallasi, 22-uy',
  "contactPhone"        = '+998 90 578 13 24',
  "institutionStartDate"= '2022-09-01',
  "emergencyContact"    = '{"name":"Ergasheva Dilnoza","phone":"+998 90 666 77 88","relation":"ona"}'::jsonb,
  class                 = '4-sinf',
  teacher               = 'Erkin Nazarov',
  "updatedAt"           = NOW()
WHERE id = 'd6568750-e0f7-4bd8-aa54-b352bb3f172e';

-- CHILD 10: Sanjar Yusupov, 8yo, Intellectual disability moderate
-- Parent: Rano Yusupova (F = mother). Group A / Maftuna Aliyeva.
UPDATE children SET
  "firstName"           = 'Sanjar',
  "lastName"            = 'Yusupov',
  "dateOfBirth"         = '2017-12-01',
  gender                = 'Male',
  "disabilityType"      = $$Ақлий ривожланишнинг ўрта даражали кечикиши$$,
  "medicalDiagnosis"    = $$F71 — O'rta darajali aqli zaiflik (IQ 35-49 oralig'i); etiologiyasi: perinatal gipoksiya$$,
  "specialNeeds"        = $$Oddiy, takrorlanadigan topshiriqlar tuzilishi kerak. Mavhum tushunchalar uchun konkret ko'rgazmali materialar talab qilinadi.$$,
  "childDescription"    = $$Yaxshi kayfiyatli va o'qituvchiga ishonuvchan. Oddiy topshiriqlarni (tartiblash, joylashtirish) mustaqil bajaradi. Mavhum tushunchalar (vaqt, miqdor) bilan yordam kerak. Gapirishda lug'at cheklangan, ammo ehtiyojlarini ifodalay oladi. Qo'l mehnatini yaxshi ko'radi.$$,
  "expectedOutcomes"    = $$Kundalik faoliyat ko'nikmalarini mustaqillashishi; 1-10 raqamlar konseptsiyasini mustahkamlash; 20 ta yangi so'zni faol lug'atga qo'shish.$$,
  "fatherFullName"      = 'Yusupov Farhodjon Toshmatovich',
  "fatherDOB"           = '1987-09-19',
  "fatherOccupation"    = 'Mexanik',
  "motherFullName"      = 'Yusupova Rano Hamidovna',
  "motherOccupation"    = 'Tarbiyachi',
  address               = 'Samarqand shahri, Bulungor tumani, Zarafshon mahallasi, 11-uy',
  "contactPhone"        = '+998 91 124 68 72',
  "institutionStartDate"= '2023-09-01',
  "emergencyContact"    = '{"name":"Yusupov Farhodjon","phone":"+998 91 999 00 11","relation":"ota"}'::jsonb,
  class                 = '2-sinf',
  teacher               = 'Maftuna Aliyeva',
  "updatedAt"           = NOW()
WHERE id = '78d1f578-956c-42c7-81f5-9eafc994219b';

-- CHILD 11: Nozima Qodirova, 3yo, Global developmental delay
-- Parent: Sanjar Qodirov (M = father). Group A / Maftuna Aliyeva.
UPDATE children SET
  "firstName"           = 'Nozima',
  "lastName"            = 'Qodirova',
  "dateOfBirth"         = '2023-02-27',
  gender                = 'Female',
  "disabilityType"      = $$Умумий ривожланиш кечикиши$$,
  "medicalDiagnosis"    = $$F88 — Psixologik rivojlanishning boshqa buzilishlari; umumiy kechikish (etiologiya aniqlanmoqda)$$,
  "specialNeeds"        = $$Ko'p sensoriy o'yin va ko'rgazmali o'qitish talab qilinadi. Kompleks baholash: neyropediatr, nutq terapevti, fizioterapevt.$$,
  "childDescription"    = $$Eng yosh guruh a'zosi. Ota-onaga bog'lanish kuchli. Ko'z bilan aloqa yaxshi. Harakatlar maqsadli, ammo barcha rivojlanish sohalarida tengdoshlari kabi emas. Ranglar va oddiy shakllarni taniy boshlagan. Ko'p takror va ko'rgazmali o'yin yordamida o'rganadi.$$,
  "expectedOutcomes"    = $$Harakat va nutq rivojlanishini doimiy kuzatib borish; tegishli terapevtik yo'nalishlarni aniqlash; ota-ona bilan kundalik rivojlantirish mashg'ulotlarini o'rgatish.$$,
  "fatherFullName"      = 'Qodirov Sanjar Hamzayevich',
  "fatherDOB"           = '1988-08-25',
  "fatherOccupation"    = 'Savdogar',
  "motherFullName"      = 'Qodirova Zulfiya Baxtiyorovna',
  "motherOccupation"    = 'Tarbiyachi',
  address               = 'Samarqand shahri, Narpay tumani, Navbahor mahallasi, 3-uy',
  "contactPhone"        = '+998 93 235 79 83',
  "institutionStartDate"= '2025-09-01',
  "emergencyContact"    = '{"name":"Qodirova Zulfiya","phone":"+998 93 112 23 34","relation":"ona"}'::jsonb,
  class                 = 'Maktabgacha',
  teacher               = 'Maftuna Aliyeva',
  "updatedAt"           = NOW()
WHERE id = 'c3788fed-4c86-4577-b390-848948c55a7e';

-- CHILD 12: Malika Ahmedova, 5yo, Visual impairment severe
-- Parent: Tursunoy Ahmedova (F = mother). Group B / Akbar Pulatov.
UPDATE children SET
  "firstName"           = 'Malika',
  "lastName"            = 'Ahmedova',
  "dateOfBirth"         = '2020-09-16',
  gender                = 'Female',
  "disabilityType"      = $$Кўриш қобилиятининг оғир даражада чекланганлиги$$,
  "medicalDiagnosis"    = $$H54.4 — Bir ko'zda ko'rish buzilishi (og'ir daraja); ko'rish o'tkirligi < 0.05; nystagm qayd etilgan$$,
  "specialNeeds"        = $$Kattaroq harf va yuqori kontrast materiallar talab qilinadi. Taktil kitoblar va 3D shakllar bilan ishlash tavsiya etiladi.$$,
  "childDescription"    = $$Kattaroq harf va yuqori kontrast materiallarga yaxshi javob beradi. Eshitish va sezish orqali o'rganishga qodir. Taktil kitoblar va 3D shakllarni o'rganishda faol. Nutq rivojlanishi yoshi bo'yicha mos. Orientatsiya va harakatlanish ko'nikmalarida alohida mashg'ulot kerak.$$,
  "expectedOutcomes"    = $$Braille alifbosi bilan tanishishni boshlash; maxsus ko'rish qurilmalaridan foydalanishni o'rgatish; sinfda orientatsiya va xavfsiz harakatlanish.$$,
  "fatherFullName"      = 'Ahmedov Baxtiyor Salimovich',
  "fatherDOB"           = '1986-12-30',
  "fatherOccupation"    = 'Muhandis',
  "motherFullName"      = 'Ahmedova Tursunoy Mirzayevna',
  "motherOccupation"    = 'O''qituvchi',
  address               = 'Samarqand shahri, Narpay tumani, Yashnobod mahallasi, 8-uy',
  "contactPhone"        = '+998 94 346 81 94',
  "institutionStartDate"= '2025-09-01',
  "emergencyContact"    = '{"name":"Ahmedov Baxtiyor","phone":"+998 94 223 34 45","relation":"ota"}'::jsonb,
  class                 = 'Tayyorlov',
  teacher               = 'Akbar Pulatov',
  "updatedAt"           = NOW()
WHERE id = 'f52ed345-6de6-4e7c-8a65-e82ba59418c2';

-- ============================================================
-- VERIFICATION
-- ============================================================
SELECT COUNT(*)::int AS users_with_phone   FROM users    WHERE phone IS NOT NULL;
SELECT COUNT(*)::int AS children_with_desc FROM children WHERE "childDescription" IS NOT NULL;
SELECT COUNT(*)::int AS total_users        FROM users;
SELECT COUNT(*)::int AS total_children     FROM children;

COMMIT;
