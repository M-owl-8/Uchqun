// ⚠️ PL-009: ru/en translations are AI-generated / UNVERIFIED.
// Uzbek Cyrillic text is transcribed from the government СТАНДАРТ PDF (ЛОЙИҲА/DRAFT), p.22.
// Full title: "Кундалик мониторинг - Болаларни кундузги хизматга қабул қилиш/топшириш журнали"
// 27 items total: 9 hygiene + 11 health + 7 GI.

export const DAILY_JOURNAL_ITEMS = {
  hygiene: [
    {
      code: 'hyg_bola_toza_keldi',
      textUz: 'Бола тоза келди',
      textRu: 'Ребёнок пришёл чистым',
      textEn: 'Child arrived clean',
    },
    {
      code: 'hyg_kiyimlar_ozoda',
      textUz: 'Кийимлар озода, ҳидсиз',
      textRu: 'Одежда чистая, без запаха',
      textEn: 'Clothes are clean, odour-free',
    },
    {
      code: 'hyg_soch_toza',
      textUz: 'Соч тоза, таралган',
      textRu: 'Волосы чистые и расчёсаны',
      textEn: 'Hair is clean and combed',
    },
    {
      code: 'hyg_tirnoqlar_toza',
      textUz: 'Тирноқлар олинган ва тоза',
      textRu: 'Ногти подстрижены и чистые',
      textEn: 'Nails trimmed and clean',
    },
    {
      code: 'hyg_yuz_qollar',
      textUz: 'Юз ва қўллар ювилган',
      textRu: 'Лицо и руки вымыты',
      textEn: 'Face and hands washed',
    },
    {
      code: 'hyg_poyabzal_mos',
      textUz: 'Пойабзал тоза ва ўлчамига мос',
      textRu: 'Обувь чистая и по размеру',
      textEn: 'Shoes clean and appropriate size',
    },
    {
      code: 'hyg_tanadan_hid_yoq',
      textUz: 'Танадан ёқимсиз ҳид келмайди',
      textRu: 'Нет неприятного запаха от тела',
      textEn: 'No unpleasant body odour',
    },
    {
      code: 'hyg_faslga_mos',
      textUz: 'Фаслга мос кийим кийган',
      textRu: 'Одет по сезону',
      textEn: 'Wearing season-appropriate clothing',
    },
    {
      code: 'hyg_gigienik_vositalar',
      textUz: 'Гигиеник воситалар олиб келинган (памперслар, салфеткалар, дастрўмоллар ва ҳ.к.)',
      textRu: 'Принесены гигиенические средства (подгузники, салфетки, платочки и др.)',
      textEn: 'Hygiene supplies brought (diapers, tissues, handkerchiefs, etc.)',
    },
  ],
  health: [
    {
      code: 'hlth_harorat_normal',
      textUz: 'Тана ҳарорати меъёрида (36,0-37,0°C)',
      textRu: 'Температура тела в норме (36,0–37,0°C)',
      textEn: 'Body temperature normal (36.0–37.0°C)',
    },
    {
      code: 'hlth_harorat_kotarilgan',
      textUz: 'Ҳарорат кўтарилган',
      textRu: 'Температура повышена',
      textEn: 'Temperature elevated',
    },
    {
      code: 'hlth_shikoyatlar_yoq',
      textUz: 'Шикоятлар йўқ',
      textRu: 'Жалоб нет',
      textEn: 'No complaints',
    },
    {
      code: 'hlth_shikoyatlar_mavjud',
      textUz: 'Шикоятлар мавжуд (изоҳда кўрсатинг)',
      textRu: 'Жалобы имеются (укажите в примечании)',
      textEn: 'Complaints present (indicate in notes)',
    },
    {
      code: 'hlth_teri_toza',
      textUz: 'Тери тоза, тошмаларсиз',
      textRu: 'Кожа чистая, без сыпи',
      textEn: 'Skin clean, no rash',
    },
    {
      code: 'hlth_shilimshiq_bor',
      textUz: 'Шилиниш/лат/кўкаришлар бор (кўрсатинг)',
      textRu: 'Ссадины/ушибы/синяки (укажите)',
      textEn: 'Abrasions/bruises/contusions present (indicate)',
    },
    {
      code: 'hlth_burun_nafas',
      textUz: 'Бурундан нафас олиш эркин',
      textRu: 'Носовое дыхание свободное',
      textEn: 'Nasal breathing free',
    },
    {
      code: 'hlth_yaralar_yoq',
      textUz: 'Кўзга кўринадиган жароҳатлар йўқ',
      textRu: 'Видимых ран нет',
      textEn: 'No visible wounds',
    },
    {
      code: 'hlth_yotal_yoq',
      textUz: 'Йўтал мавжуд эмас',
      textRu: 'Кашля нет',
      textEn: 'No cough',
    },
    {
      code: 'hlth_yotal_mavjud',
      textUz: 'Йўтал мавжуд',
      textRu: 'Кашель есть',
      textEn: 'Cough present',
    },
    {
      code: 'hlth_kayfiyat_normal',
      textUz: 'Кайфият ва фаоллик меъёрида',
      textRu: 'Настроение и активность в норме',
      textEn: 'Mood and activity normal',
    },
  ],
  gi: [
    {
      code: 'gi_ich_normal',
      textUz: 'Ич келиши нормал',
      textRu: 'Стул нормальный',
      textEn: 'Normal bowel movements',
    },
    {
      code: 'gi_ich_kelmagan',
      textUz: 'Ич келмаган',
      textRu: 'Стула не было',
      textEn: 'No bowel movement',
    },
    {
      code: 'gi_qorin_ogriq',
      textUz: 'Қорин оғриғига шикоятлар бор',
      textRu: 'Жалобы на боли в животе',
      textEn: 'Complaints of abdominal pain',
    },
    {
      code: 'gi_oshqozon_buzilishi',
      textUz: 'Ошқозон-ичак тизими бузилиши (ич кетиши, қабзият ва ҳоказо) кузатилмоқда',
      textRu: 'Нарушение ЖКТ (понос, запор и т.д.) наблюдается',
      textEn: 'GI dysfunction (diarrhea, constipation, etc.) observed',
    },
    {
      code: 'gi_siydik_normal',
      textUz: 'Сийдик чиқариш мунтазам, шикоятларсиз',
      textRu: 'Мочеиспускание регулярное, без жалоб',
      textEn: 'Urination regular, no complaints',
    },
    {
      code: 'gi_siydik_tutilishi',
      textUz: 'Сийдик тутилиши ёки кам ажралиши',
      textRu: 'Задержка мочи или уменьшение диуреза',
      textEn: 'Urination retained or decreased',
    },
    {
      code: 'gi_siydik_tutolmaslik',
      textUz: 'Сийдик тутолмаслик мавжуд',
      textRu: 'Недержание мочи присутствует',
      textEn: 'Urinary incontinence present',
    },
  ],
};

export const DAILY_ITEM_COUNT = 27; // 9 + 11 + 7
