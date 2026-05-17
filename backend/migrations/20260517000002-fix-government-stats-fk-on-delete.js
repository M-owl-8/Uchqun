export async function up(queryInterface) {
  await queryInterface.sequelize.query(`
    ALTER TABLE government_stats
      DROP CONSTRAINT IF EXISTS "government_stats_schoolId_fkey",
      DROP CONSTRAINT IF EXISTS "government_stats_generatedBy_fkey";
  `);

  await queryInterface.sequelize.query(`
    ALTER TABLE government_stats
      ADD CONSTRAINT "government_stats_schoolId_fkey"
        FOREIGN KEY ("schoolId") REFERENCES schools(id) ON DELETE SET NULL ON UPDATE CASCADE,
      ADD CONSTRAINT "government_stats_generatedBy_fkey"
        FOREIGN KEY ("generatedBy") REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE;
  `);
}

export async function down(queryInterface) {
  await queryInterface.sequelize.query(`
    ALTER TABLE government_stats
      DROP CONSTRAINT IF EXISTS "government_stats_schoolId_fkey",
      DROP CONSTRAINT IF EXISTS "government_stats_generatedBy_fkey";
  `);

  await queryInterface.sequelize.query(`
    ALTER TABLE government_stats
      ADD CONSTRAINT "government_stats_schoolId_fkey"
        FOREIGN KEY ("schoolId") REFERENCES schools(id) ON DELETE NO ACTION ON UPDATE NO ACTION,
      ADD CONSTRAINT "government_stats_generatedBy_fkey"
        FOREIGN KEY ("generatedBy") REFERENCES users(id) ON DELETE NO ACTION ON UPDATE NO ACTION;
  `);
}
