// GOV-REGIONS-NAME: Replace placeholder Region 01–13 names with official
// Uzbekistan administrative division names in UZ Latin / RU / UZ Cyrillic.
// Also adds Xorazm viloyati as r14 (previously missing from 13-region seed).
//
// Stable UUIDs: r01–r13 are unchanged. r14 gets the next sequential UUID.
// down() restores placeholder names and drops the new columns/row.

export const up = async (queryInterface, Sequelize) => {
  // ── 1. Add multilingual name columns ─────────────────────────────────────────
  await queryInterface.addColumn('regions', 'nameRu', {
    type: Sequelize.STRING(255),
    allowNull: true,
  });
  await queryInterface.addColumn('regions', 'nameCyrl', {
    type: Sequelize.STRING(255),
    allowNull: true,
  });

  // ── 2. Update existing 13 rows with official names ─────────────────────────
  const updates = [
    { code: 'r01', name: "Toshkent shahri",              nameRu: 'Город Ташкент',                   nameCyrl: 'Тошкент шаҳри' },
    { code: 'r02', name: 'Samarqand viloyati',            nameRu: 'Самаркандская область',            nameCyrl: 'Самарқанд вилояти' },
    { code: 'r03', name: 'Andijon viloyati',              nameRu: 'Андижанская область',              nameCyrl: 'Андижон вилояти' },
    { code: 'r04', name: 'Buxoro viloyati',               nameRu: 'Бухарская область',                nameCyrl: 'Бухоро вилояти' },
    { code: 'r05', name: "Farg'ona viloyati",             nameRu: 'Ферганская область',               nameCyrl: 'Фарғона вилояти' },
    { code: 'r06', name: 'Jizzax viloyati',               nameRu: 'Джизакская область',               nameCyrl: 'Жиззах вилояти' },
    { code: 'r07', name: 'Namangan viloyati',             nameRu: 'Наманганская область',             nameCyrl: 'Наманган вилояти' },
    { code: 'r08', name: 'Navoiy viloyati',               nameRu: 'Навоийская область',               nameCyrl: 'Навоий вилояти' },
    { code: 'r09', name: 'Qashqadaryo viloyati',          nameRu: 'Кашкадарьинская область',          nameCyrl: 'Қашқадарё вилояти' },
    { code: 'r10', name: 'Sirdaryo viloyati',             nameRu: 'Сырдарьинская область',            nameCyrl: 'Сирдарё вилояти' },
    { code: 'r11', name: 'Surxondaryo viloyati',          nameRu: 'Сурхандарьинская область',         nameCyrl: 'Сурхондарё вилояти' },
    { code: 'r12', name: 'Toshkent viloyati',             nameRu: 'Ташкентская область',              nameCyrl: 'Тошкент вилояти' },
    { code: 'r13', name: "Qoraqalpog'iston Respublikasi", nameRu: 'Республика Каракалпакстан',        nameCyrl: 'Қорақалпоғистон Республикаси' },
  ];

  for (const row of updates) {
    await queryInterface.sequelize.query(
      `UPDATE regions SET name = :name, "nameRu" = :nameRu, "nameCyrl" = :nameCyrl WHERE code = :code`,
      { replacements: { name: row.name, nameRu: row.nameRu, nameCyrl: row.nameCyrl, code: row.code } }
    );
  }

  // ── 3. Insert r14 — Xorazm viloyati (previously missing) ──────────────────
  const now = new Date().toISOString();
  await queryInterface.bulkInsert('regions', [{
    id:       '00000000-0000-0000-0000-000000000014',
    code:     'r14',
    name:     'Xorazm viloyati',
    nameRu:   'Хорезмская область',
    nameCyrl: 'Хоразм вилояти',
    isRepublic: false,
    createdAt: now,
    updatedAt: now,
  }]);
};

export const down = async (queryInterface) => {
  // Remove Xorazm row
  await queryInterface.sequelize.query(
    `DELETE FROM regions WHERE code = 'r14'`
  );

  // Restore placeholder names on r01–r13
  for (let n = 1; n <= 13; n++) {
    const code = `r${String(n).padStart(2, '0')}`;
    const name = `Region ${String(n).padStart(2, '0')}`;
    await queryInterface.sequelize.query(
      `UPDATE regions SET name = :name WHERE code = :code`,
      { replacements: { name, code } }
    );
  }

  // Drop the multilingual columns
  await queryInterface.removeColumn('regions', 'nameCyrl');
  await queryInterface.removeColumn('regions', 'nameRu');
};
