// Depends on: children, schools, users, irrs (20260526000002)
// Unique constraint: one entry per child per week (weekStart = Monday of the ISO week)
export const up = async (queryInterface, Sequelize) => {
  await queryInterface.createTable('weekly_monitoring_entries', {
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
    weekStart: {
      type: Sequelize.DATEONLY,
      allowNull: false,
    },
    recordedAt: {
      type: Sequelize.DATE,
      allowNull: true,
    },
    emotionalData: {
      type: Sequelize.JSONB,
      allowNull: false,
      defaultValue: {},
    },
    environmentData: {
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

  await queryInterface.addIndex('weekly_monitoring_entries', ['childId', 'weekStart'], {
    unique: true,
    name: 'idx_weekly_monitoring_child_week_unique',
  });
  await queryInterface.addIndex('weekly_monitoring_entries', ['schoolId', 'weekStart'], {
    name: 'idx_weekly_monitoring_school_week',
  });
  await queryInterface.addIndex('weekly_monitoring_entries', ['recordedBy'], {
    name: 'idx_weekly_monitoring_recorded_by',
  });
};

export const down = async (queryInterface) => {
  await queryInterface.dropTable('weekly_monitoring_entries');
};
