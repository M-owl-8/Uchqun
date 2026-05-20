// T2-8: add soft-delete (paranoid) support to progress
export const up = async (queryInterface, Sequelize) => {
  await queryInterface.addColumn('progress', 'deletedAt', {
    type: Sequelize.DATE,
    allowNull: true,
    defaultValue: null,
  });
  await queryInterface.sequelize.query(
    `CREATE INDEX idx_progress_not_deleted ON progress ("deletedAt") WHERE "deletedAt" IS NULL`
  );
};

export const down = async (queryInterface) => {
  await queryInterface.sequelize.query(
    `DROP INDEX IF EXISTS idx_progress_not_deleted`
  );
  await queryInterface.removeColumn('progress', 'deletedAt');
};
