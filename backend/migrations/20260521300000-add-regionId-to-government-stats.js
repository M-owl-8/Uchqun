// CP-021 Sprint D: add regionId FK to government_stats.
// Closes the last Sprint C yellow — stats endpoints can now be region-scoped.
// Nullable: existing stats records have regionId=null (treated as republic-level).
export const up = async (queryInterface, Sequelize) => {
  await queryInterface.addColumn('government_stats', 'regionId', {
    type: Sequelize.UUID,
    allowNull: true,
    references: { model: 'regions', key: 'id' },
    onDelete: 'SET NULL',
  });
  await queryInterface.sequelize.query(
    `CREATE INDEX IF NOT EXISTS idx_government_stats_region_id ON government_stats ("regionId")`
  );
};

export const down = async (queryInterface) => {
  await queryInterface.sequelize.query(`DROP INDEX IF EXISTS idx_government_stats_region_id`);
  await queryInterface.removeColumn('government_stats', 'regionId').catch(() => {});
};
