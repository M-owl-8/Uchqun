// Depends on: schools, users
// FACILITY-LEVEL: no childId (per OQ-3/OQ-6 design — school-scoped, manager/admin only)
// Unique constraint: one entry per school per quarter
export const up = async (queryInterface, Sequelize) => {
  await queryInterface.createTable('quarterly_monitoring_entries', {
    id: {
      type: Sequelize.UUID,
      defaultValue: Sequelize.literal('gen_random_uuid()'),
      primaryKey: true,
    },
    schoolId: {
      type: Sequelize.UUID,
      allowNull: false,
      references: { model: 'schools', key: 'id' },
      onDelete: 'RESTRICT',
    },
    recordedBy: {
      type: Sequelize.UUID,
      allowNull: true,
      references: { model: 'users', key: 'id' },
      onDelete: 'SET NULL',
    },
    quarterStart: {
      type: Sequelize.DATEONLY,
      allowNull: false,
    },
    recordedAt: {
      type: Sequelize.DATE,
      allowNull: true,
    },
    infoSystemData: {
      type: Sequelize.JSONB,
      allowNull: false,
      defaultValue: {},
    },
    parentWorkData: {
      type: Sequelize.JSONB,
      allowNull: false,
      defaultValue: {},
    },
    documentationData: {
      type: Sequelize.JSONB,
      allowNull: false,
      defaultValue: {},
    },
    careQualityData: {
      type: Sequelize.JSONB,
      allowNull: false,
      defaultValue: {},
    },
    conditionsData: {
      type: Sequelize.JSONB,
      allowNull: false,
      defaultValue: {},
    },
    departures: {
      type: Sequelize.JSONB,
      allowNull: false,
      defaultValue: [],
    },
    notes: {
      type: Sequelize.TEXT,
      allowNull: true,
    },
    createdAt: { type: Sequelize.DATE, allowNull: false },
    updatedAt: { type: Sequelize.DATE, allowNull: false },
  });

  await queryInterface.addIndex('quarterly_monitoring_entries', ['schoolId', 'quarterStart'], {
    unique: true,
    name: 'idx_quarterly_monitoring_school_quarter_unique',
  });
  await queryInterface.addIndex('quarterly_monitoring_entries', ['schoolId'], {
    name: 'idx_quarterly_monitoring_school_id',
  });
  await queryInterface.addIndex('quarterly_monitoring_entries', ['recordedBy'], {
    name: 'idx_quarterly_monitoring_recorded_by',
  });
};

export const down = async (queryInterface) => {
  await queryInterface.dropTable('quarterly_monitoring_entries');
};
