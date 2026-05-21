// CP-021 Sprint D: data-driven school category model.
// Creates school_categories table + seeds 4 placeholder entries (codes stable, names PL-015-pending).
// Adds categoryId FK to schools (nullable — existing schools uncategorised until assigned).
// Real category names replace placeholders via UPDATE in docs/region-category-data-update.md.
export const up = async (queryInterface, Sequelize) => {
  // 1. school_categories reference table
  await queryInterface.createTable('school_categories', {
    id: {
      type: Sequelize.UUID,
      defaultValue: Sequelize.literal('gen_random_uuid()'),
      primaryKey: true,
    },
    code: { type: Sequelize.STRING(50), allowNull: false, unique: true },
    name: { type: Sequelize.STRING(255), allowNull: false },
    isActive: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
    createdAt: { type: Sequelize.DATE, allowNull: false },
    updatedAt: { type: Sequelize.DATE, allowNull: false },
  });
  await queryInterface.sequelize.query(
    `CREATE INDEX IF NOT EXISTS idx_school_categories_code ON school_categories (code)`
  );

  // 2. Add categoryId FK to schools (nullable — null = uncategorised)
  await queryInterface.addColumn('schools', 'categoryId', {
    type: Sequelize.UUID,
    allowNull: true,
    references: { model: 'school_categories', key: 'id' },
    onDelete: 'SET NULL',
  });
  await queryInterface.sequelize.query(
    `CREATE INDEX IF NOT EXISTS idx_schools_category_id ON schools ("categoryId")`
  );

  // 3. Seed 4 placeholder categories.
  // Codes are stable identifiers — scoping and lookups always key off code/id, not name.
  // Names are ~70% confirmed pending partner (PL-015). Swap names without touching codes.
  const now = new Date().toISOString();
  await queryInterface.bulkInsert('school_categories', [
    { id: '00000000-0000-0000-cafe-000000000001', code: 'kunduzgi_parvarish', name: 'Kunduzgi parvarish', isActive: true, createdAt: now, updatedAt: now },
    { id: '00000000-0000-0000-cafe-000000000002', code: 'yangi_kun',          name: 'Yangi kun',          isActive: true, createdAt: now, updatedAt: now },
    { id: '00000000-0000-0000-cafe-000000000003', code: 'madad',              name: 'Madad',              isActive: true, createdAt: now, updatedAt: now },
    { id: '00000000-0000-0000-cafe-000000000004', code: 'uyda_qarab_turish',  name: 'Uyda qarab turish',  isActive: true, createdAt: now, updatedAt: now },
  ]);
};

export const down = async (queryInterface) => {
  await queryInterface.sequelize.query(`DROP INDEX IF EXISTS idx_schools_category_id`);
  await queryInterface.removeColumn('schools', 'categoryId').catch(() => {});
  await queryInterface.bulkDelete('school_categories', null, {});
  await queryInterface.sequelize.query(`DROP INDEX IF EXISTS idx_school_categories_code`);
  await queryInterface.dropTable('school_categories');
};
