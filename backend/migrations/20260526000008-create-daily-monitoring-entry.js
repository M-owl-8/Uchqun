// Depends on: children, schools, users, irrs (20260526000002)
// Unique constraint: one entry per child per calendar day (OQ-6 decision)
export const up = async (queryInterface, Sequelize) => {
  await queryInterface.createTable('daily_monitoring_entries', {
    id: {
      type: Sequelize.UUID,
      defaultValue: Sequelize.literal('gen_random_uuid()'),
      primaryKey: true,
    },
    childId: {
      type: Sequelize.UUID,
      allowNull: false,
      references: { model: 'children', key: 'id' },
      onDelete: 'CASCADE',
    },
    schoolId: {
      type: Sequelize.UUID,
      allowNull: false,
      references: { model: 'schools', key: 'id' },
      onDelete: 'RESTRICT',
    },
    irrId: {
      type: Sequelize.UUID,
      allowNull: true,
      references: { model: 'irrs', key: 'id' },
      onDelete: 'SET NULL',
    },
    recordedBy: {
      type: Sequelize.UUID,
      allowNull: true,
      references: { model: 'users', key: 'id' },
      onDelete: 'SET NULL',
    },
    entryDate: {
      type: Sequelize.DATEONLY,
      allowNull: false,
    },
    recordedAt: {
      type: Sequelize.DATE,
      allowNull: true,
    },
    hygieneData: {
      type: Sequelize.JSONB,
      allowNull: false,
      defaultValue: {},
    },
    healthData: {
      type: Sequelize.JSONB,
      allowNull: false,
      defaultValue: {},
    },
    giData: {
      type: Sequelize.JSONB,
      allowNull: false,
      defaultValue: {},
    },
    notes: {
      type: Sequelize.TEXT,
      allowNull: true,
    },
    createdAt: { type: Sequelize.DATE, allowNull: false },
    updatedAt: { type: Sequelize.DATE, allowNull: false },
  });

  await queryInterface.addIndex('daily_monitoring_entries', ['childId', 'entryDate'], {
    unique: true,
    name: 'idx_daily_monitoring_child_date_unique',
  });
  await queryInterface.addIndex('daily_monitoring_entries', ['schoolId', 'entryDate'], {
    name: 'idx_daily_monitoring_school_date',
  });
  await queryInterface.addIndex('daily_monitoring_entries', ['recordedBy'], {
    name: 'idx_daily_monitoring_recorded_by',
  });
};

export const down = async (queryInterface) => {
  await queryInterface.dropTable('daily_monitoring_entries');
};
