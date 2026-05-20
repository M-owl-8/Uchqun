export const up = async (queryInterface, Sequelize) => {
  await queryInterface.createTable('child_observations', {
    id: {
      type: Sequelize.UUID,
      defaultValue: Sequelize.literal('gen_random_uuid()'),
      primaryKey: true,
    },
    childId: {
      type: Sequelize.UUID,
      allowNull: true,
      references: { model: 'children', key: 'id' },
      onDelete: 'SET NULL',
    },
    teacherId: {
      type: Sequelize.UUID,
      allowNull: true,
      references: { model: 'users', key: 'id' },
      onDelete: 'SET NULL',
    },
    schoolId: {
      type: Sequelize.UUID,
      allowNull: false,
      references: { model: 'schools', key: 'id' },
      onDelete: 'RESTRICT',
    },
    observationDate: {
      type: Sequelize.DATEONLY,
      allowNull: false,
    },
    domain: {
      type: Sequelize.ENUM('communication', 'motor', 'social', 'cognitive', 'self_care'),
      allowNull: false,
    },
    note: {
      type: Sequelize.TEXT,
      allowNull: false,
    },
    severity: {
      type: Sequelize.ENUM('routine', 'concern', 'urgent'),
      allowNull: false,
      defaultValue: 'routine',
    },
    childSnapshot: {
      type: Sequelize.JSONB,
      allowNull: false,
      defaultValue: {},
    },
    createdAt: { type: Sequelize.DATE, allowNull: false },
    updatedAt: { type: Sequelize.DATE, allowNull: false },
    deletedAt: { type: Sequelize.DATE, allowNull: true },
  });

  await queryInterface.addIndex('child_observations', ['schoolId', 'observationDate'], {
    name: 'idx_obs_school_date',
  });
  await queryInterface.addIndex('child_observations', ['childId', 'observationDate'], {
    name: 'idx_obs_child_date',
  });
  await queryInterface.addIndex('child_observations', ['teacherId', 'observationDate'], {
    name: 'idx_obs_teacher_date',
  });
  // Partial index for safeguarding queries on urgent observations
  await queryInterface.sequelize.query(
    `CREATE INDEX idx_obs_urgent ON child_observations (severity) WHERE severity = 'urgent' AND "deletedAt" IS NULL`
  );
};

export const down = async (queryInterface) => {
  await queryInterface.dropTable('child_observations');
  await queryInterface.sequelize.query(`DROP TYPE IF EXISTS "enum_child_observations_domain"`);
  await queryInterface.sequelize.query(`DROP TYPE IF EXISTS "enum_child_observations_severity"`);
};
