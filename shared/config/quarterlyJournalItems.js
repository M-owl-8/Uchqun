// ⚠️ PL-009: ru/en translations are AI-generated / UNVERIFIED.
// Uzbek Cyrillic text is transcribed from the government СТАНДАРТ PDF (ЛОЙИҲА/DRAFT), pp.23–25.
// Facility-level checklist — completed by manager (раҳбар) once per quarter.
// Per OQ-3 decision: manager/admin role ONLY. Teachers cannot write quarterly entries.
// ~55 items: 2 info + 14 parent + 9 doc + 17 care + 10 conditions
// OQ-10 pending: parent section count unconfirmed (14 visible in source; one may be obscured).

export const QUARTERLY_JOURNAL_ITEMS = {
  infoSystem: [
    {
      code: 'info_tizimga_kiritildi',
      textUz: 'Барча тарбияланувчилар тизимга киритилди',
      textRu: 'Все воспитанники внесены в систему',
      textEn: 'All children entered in the system',
    },
    {
      code: 'info_face_id',
      textUz: 'Face ID орқали давомат мунтазам равишда қайд этиб борилади',
      textRu: 'Посещаемость регулярно фиксируется через Face ID',
      textEn: 'Attendance recorded regularly via Face ID',
    },
  ],
  parentWork: [
    {
      code: 'par_malumot_oladilar',
      textUz: 'Ота-оналар бола ҳақида мунтазам равишда маълумот оладилар',
      textRu: 'Родители регулярно получают информацию о ребёнке',
      textEn: 'Parents regularly receive information about the child',
    },
    {
      code: 'par_maslahatllar',
      textUz: 'Маслаҳатлар ва якка тартибдаги суҳбатлар ўтказилади',
      textRu: 'Проводятся консультации и индивидуальные беседы',
      textEn: 'Consultations and individual conversations are held',
    },
    {
      code: 'par_murojaatlar_qayd',
      textUz: 'Барча мурожаатлар махсус журналда қайд этилади',
      textRu: 'Все обращения фиксируются в специальном журнале',
      textEn: 'All appeals recorded in a dedicated journal',
    },
    {
      code: 'par_shikoyatlar_korib',
      textUz: 'Шикоят ва таклифлар белгиланган муддатда кўриб чиқилади',
      textRu: 'Жалобы и предложения рассматриваются в установленные сроки',
      textEn: 'Complaints and suggestions reviewed within the set deadline',
    },
    {
      code: 'par_yozma_javob',
      textUz: 'Ота-оналарнинг мурожаатларига ёзма жавоблар берилган',
      textRu: 'На обращения родителей даны письменные ответы',
      textEn: 'Written responses given to parent appeals',
    },
    {
      code: 'par_tadbirlarda_ishtirok',
      textUz: 'Ота-оналар тадбирлар ва йиғилишларда иштирок этадилар',
      textRu: 'Родители участвуют в мероприятиях и собраниях',
      textEn: 'Parents participate in events and meetings',
    },
    {
      code: 'par_xodimlar_muloqot',
      textUz: 'Ходимлар ҳурматли ва хотиржам мулоқот оҳангини сақлаб қоладилар',
      textRu: 'Сотрудники поддерживают уважительный и спокойный тон общения',
      textEn: 'Staff maintain respectful and calm communication tone',
    },
    {
      code: 'par_takliflar_hisobga',
      textUz: 'Ота-оналарнинг таклифлари иш режаларида инобатга олинади',
      textRu: 'Предложения родителей учитываются в рабочих планах',
      textEn: 'Parent suggestions considered in work plans',
    },
    {
      code: 'par_mutaxassislarni_taniyadilar',
      textUz: 'Ота-оналар фарзандлари билан ишлайдиган мутахассисларни танийдилар',
      textRu: 'Родители знают специалистов, работающих с их детьми',
      textEn: 'Parents know the specialists working with their children',
    },
    {
      code: 'par_nizoli_hal',
      textUz: 'Низоли вазиятлар самарали тарзда ҳал қилинади',
      textRu: 'Конфликтные ситуации разрешаются эффективно',
      textEn: 'Conflict situations resolved effectively',
    },
    {
      code: 'par_maqsad_xabardor',
      textUz: 'Ота-оналар марказнинг мақсади, вазифалари ва иш услублари ҳақида хабардор қилинган',
      textRu: 'Родители проинформированы о целях, задачах и методах работы центра',
      textEn: 'Parents informed about centre\'s goals, tasks, and methods',
    },
    {
      code: 'par_ijobiy_ozgarishlar',
      textUz: 'Ота-оналар болада ижобий ўзгаришларни қайд этадилар',
      textRu: 'Родители отмечают положительные изменения у ребёнка',
      textEn: 'Parents note positive changes in child',
    },
    {
      code: 'par_hamkorlik_hurmst',
      textUz: 'Ҳамкорлик ўзаро ҳурмат ва очиқликка асосланади',
      textRu: 'Сотрудничество основано на взаимном уважении и открытости',
      textEn: 'Cooperation based on mutual respect and openness',
    },
    {
      code: 'par_doimiy_aloqa',
      textUz: 'Ҳар бир ота-она билан доимий алоқа ўрнатилган',
      textRu: 'Установлен постоянный контакт с каждым родителем',
      textEn: 'Permanent contact established with each parent',
    },
    // OQ-10: 14 items confirmed visible in source PDF; one may be partially obscured.
    // Partner to confirm the complete list before beta launch.
  ],
  documentation: [
    {
      code: 'doc_irr_dolzarb',
      textUz: 'Барча болаларнинг ИРРлари долзарб ва тўлиқ тўлдирилган',
      textRu: 'ИРР всех детей актуальны и полностью заполнены',
      textEn: 'All children\'s ИРРs are current and fully completed',
    },
    {
      code: 'doc_irr_qayta_korib',
      textUz: 'ИРР уч ойда камида бир марта қайта кўриб чиқилади',
      textRu: 'ИРР пересматривается не реже одного раза в три месяца',
      textEn: 'ИРР reviewed at least once every 3 months',
    },
    {
      code: 'doc_reja_tasdiq',
      textUz: 'Тарбиявий ва ривожлантирувчи ишлар режаси тасдиқланган ва тизимли равишда олиб борилади',
      textRu: 'План воспитательной и развивающей работы утверждён и систематически реализуется',
      textEn: 'Educational and development work plan approved and systematically implemented',
    },
    {
      code: 'doc_anonim_shakl',
      textUz: 'Аноним мурожаат шакли мавжуд',
      textRu: 'Форма анонимного обращения имеется',
      textEn: 'Anonymous complaint form available',
    },
    {
      code: 'doc_ota_anket',
      textUz: 'Ота-оналар анкетаси мавжуд',
      textRu: 'Анкета удовлетворённости родителей имеется',
      textEn: 'Parent satisfaction survey available',
    },
    {
      code: 'doc_tashrif_jurnal',
      textUz: 'Ташриф буюрувчиларни ҳисобга олиш журнали',
      textRu: 'Журнал учёта посетителей ведётся',
      textEn: 'Visitor log maintained',
    },
    {
      code: 'doc_hodisalar_jurnal',
      textUz: 'Ҳодисалар журнали',
      textRu: 'Журнал инцидентов ведётся',
      textEn: 'Incident log maintained',
    },
    {
      code: 'doc_kundalik_jurnal',
      textUz: 'Болаларни кундузги хизматга қабул қилиш/топшириш кундалик мониторинг журнали',
      textRu: 'Ежедневный журнал приёма/сдачи детей в дневной уход ведётся',
      textEn: 'Daily monitoring (admission/handover) journal maintained',
    },
    {
      code: 'doc_shunurlangan',
      textUz: 'Барча журналлар шнурланган, рақамланган, раҳбарнинг имзоси ва ҳудудий бошқарма муҳри билан тасдиқланган',
      textRu: 'Все журналы прошнурованы, пронумерованы, подписаны руководителем и заверены печатью регионального управления',
      textEn: 'All journals sewn, numbered, signed by director, and stamped by regional administration',
    },
  ],
  careQuality: [
    {
      code: 'care_ovqat_rejim',
      textUz: 'Овқатланиш ва дам олиш режими бажарилади',
      textRu: 'Режим питания и отдыха соблюдается',
      textEn: 'Feeding and rest schedule followed',
    },
    {
      code: 'care_xona_toza',
      textUz: 'Хона тоза ва ҳавоси мусаффо',
      textRu: 'Комната чистая и воздух свежий',
      textEn: 'Room clean and air fresh',
    },
    {
      code: 'care_shaxsiy_vositalar',
      textUz: 'Болаларга шахсий парвариш воситалари берилган',
      textRu: 'Детям предоставлены средства личного ухода',
      textEn: 'Children provided with personal care items',
    },
    {
      code: 'care_xodimlar_gigiena',
      textUz: 'Ходимлар болаларнинг шахсий гигиенасини назорат қилади',
      textRu: 'Сотрудники контролируют личную гигиену детей',
      textEn: 'Staff monitor children\'s personal hygiene',
    },
    {
      code: 'care_yordam_oz_vaqt',
      textUz: 'Болалар ўзларини ёмон ҳис қилганда ўз вақтида ёрдам олади',
      textRu: 'Дети получают своевременную помощь при плохом самочувствии',
      textEn: 'Children receive timely help when unwell',
    },
    {
      code: 'care_tashqi_korinish',
      textUz: 'Боланинг ташқи кўриниши озода, ҳиди йўқ',
      textRu: 'Внешний вид ребёнка опрятный, без запаха',
      textEn: 'Child\'s appearance neat, no odour',
    },
    {
      code: 'care_barcha_vaqt',
      textUz: 'Барча парвариш турлари ўз вақтида бажарилади',
      textRu: 'Все виды ухода выполняются своевременно',
      textEn: 'All types of care performed on time',
    },
    {
      code: 'care_kuzatuvlar_qayd',
      textUz: 'Кузатувлар ҳужжатларда қайд этилади',
      textRu: 'Наблюдения фиксируются в документах',
      textEn: 'Observations recorded in documents',
    },
    {
      code: 'care_shikoyat_yoq',
      textUz: 'Ота-оналардан парвариш сифати бўйича шикоятлар йўқ',
      textRu: 'Жалоб от родителей по качеству ухода нет',
      textEn: 'No parent complaints about care quality',
    },
    {
      code: 'care_tozalash_2x',
      textUz: 'Тозалаш кунига икки марта ўтказилади',
      textRu: 'Уборка проводится дважды в день',
      textEn: 'Cleaning done twice a day',
    },
    {
      code: 'care_umumiy_tozalash',
      textUz: 'Умумий тозалаш ҳар ҳафта амалга оширилади',
      textRu: 'Генеральная уборка проводится еженедельно',
      textEn: 'General cleaning done weekly',
    },
    {
      code: 'care_mebel_artiladi',
      textUz: 'Мебеллар тоза нам латта билан артилади',
      textRu: 'Мебель протирается чистой влажной тряпкой',
      textEn: 'Furniture wiped with a clean damp cloth',
    },
    {
      code: 'care_oyinchoq_yuviladi',
      textUz: 'Ўйинчоқлар ювилади ва дезинфекция қилинади',
      textRu: 'Игрушки моются и дезинфицируются',
      textEn: 'Toys washed and disinfected',
    },
    {
      code: 'care_choyshab_toza',
      textUz: 'Чойшаб-ёстиқ жилдлари тоза',
      textRu: 'Постельное бельё чистое',
      textEn: 'Bedding is clean',
    },
    {
      code: 'care_sochiq_shaxsiy',
      textUz: 'Сочиқлар шахсий',
      textRu: 'Полотенца индивидуальные',
      textEn: 'Towels are individual (per child)',
    },
    {
      code: 'care_chiqindi_olinadi',
      textUz: 'Чиқиндилар ўз вақтида олиб ташланади',
      textRu: 'Мусор своевременно вывозится',
      textEn: 'Waste removed on time',
    },
    {
      code: 'care_kiyim_toza',
      textUz: 'Ходимларнинг алмаштирадиган кийимлари тоза',
      textRu: 'Сменная одежда сотрудников чистая',
      textEn: 'Staff\'s spare clothing is clean',
    },
  ],
  conditions: [
    {
      code: 'shar_harorat',
      textUz: 'Ҳарорат режимига риоя қилинган',
      textRu: 'Температурный режим соблюдён',
      textEn: 'Temperature regime observed',
    },
    {
      code: 'shar_yoritish',
      textUz: 'Ёритиш меъёрларга мос келади',
      textRu: 'Освещение соответствует нормам',
      textEn: 'Lighting meets standards',
    },
    {
      code: 'shar_mebel_mustahkam',
      textUz: 'Мебеллар мустаҳкам, болаларга мослаштирилган',
      textRu: 'Мебель прочная, адаптированная для детей',
      textEn: 'Furniture sturdy, adapted for children',
    },
    {
      code: 'shar_oyun_xoli',
      textUz: 'Ўйин майдони ортиқча нарсалардан холи ва хавфсиз',
      textRu: 'Игровая площадка свободна от лишних предметов и безопасна',
      textEn: 'Play area free of clutter and safe',
    },
    {
      code: 'shar_hudud_tartibli',
      textUz: 'Ҳудуд озода ва тартибли сақланган',
      textRu: 'Территория содержится в чистоте и порядке',
      textEn: 'Territory kept clean and orderly',
    },
    {
      code: 'shar_isitish_tosiq',
      textUz: 'Иситиш мосламалари тўсиқланган',
      textRu: 'Нагревательные приборы ограждены',
      textEn: 'Heating equipment guarded',
    },
    {
      code: 'shar_elektr_sozlangan',
      textUz: 'Электр жиҳозлари созланган',
      textRu: 'Электрооборудование исправно',
      textEn: 'Electrical equipment in working order',
    },
    {
      code: 'shar_tibbiy_aptechka',
      textUz: 'Тиббий аптечка тўлиқ жиҳозланган',
      textRu: 'Медицинская аптечка полностью укомплектована',
      textEn: 'Medical first-aid kit fully stocked',
    },
    {
      code: 'shar_masul_shaxslar',
      textUz: 'Хавфсизлик бўйича масъул шахслар белгиланган',
      textRu: 'Назначены ответственные за безопасность лица',
      textEn: 'Safety-responsible persons designated',
    },
    {
      code: 'shar_begona_kirish_taqiq',
      textUz: 'Бегона шахсларнинг кириши тақиқланган',
      textRu: 'Вход посторонних лиц запрещён',
      textEn: 'Unauthorized persons prohibited from entry',
    },
  ],
};

export const QUARTERLY_ITEM_COUNT = 52; // 2 + 14 + 9 + 17 + 10 (OQ-10: exact count pending partner confirmation)
