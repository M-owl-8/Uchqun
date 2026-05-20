// T2-6: add soft-delete (paranoid) support to emotional_monitoring
export const up = async (queryInterface, Sequelize) => {
  await queryInterface.addColumn('emotional_monitoring', 'deletedAt', {
    type: Sequelize.DATE,
    allowNull: true,
    defaultValue: null,
  });
  await queryInterface.sequelize.query(
    `CREATE INDEX idx_emotional_monitoring_not_deleted ON emotional_monitoring ("deletedAt") WHERE "deletedAt" IS NULL`
  );
};

export const down = async (queryInterface) => {
  await queryInterface.sequelize.query(
    `DROP INDEX IF EXISTS idx_emotional_monitoring_not_deleted`
  );
  await queryInterface.removeColumn('emotional_monitoring', 'deletedAt');
};
