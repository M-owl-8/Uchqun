export const up = async (queryInterface, Sequelize) => {
  await queryInterface.createTable('child_goals', {
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
    schoolId: {
      type: Sequelize.UUID,
      allowNull: false,
      references: { model: 'schools', key: 'id' },
      onDelete: 'RESTRICT',
    },
    createdBy: {
      type: Sequelize.UUID,
      allowNull: true,
      references: { model: 'users', key: 'id' },
      onDelete: 'SET NULL',
    },
    category: {
      type: Sequelize.ENUM(
        'communication', 'social_emotional', 'cognitive',
        'fine_motor', 'gross_motor', 'self_care', 'behavioral', 'academic'
      ),
      allowNull: false,
    },
    title: {
      type: Sequelize.STRING(200),
      allowNull: false,
    },
    description: {
      type: Sequelize.TEXT,
      allowNull: true,
    },
    measurement: {
      type: Sequelize.TEXT,
      allowNull: true,
    },
    baseline: {
      type: Sequelize.TEXT,
      allowNull: true,
    },
    targetDate: {
      type: Sequelize.DATEONLY,
      allowNull: true,
    },
    currentProgress: {
      type: Sequelize.ENUM('not_started', 'emerging', 'developing', 'achieved', 'discontinued'),
      allowNull: false,
      defaultValue: 'not_started',
    },
    progressNotes: {
      type: Sequelize.TEXT,
      allowNull: true,
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

  await queryInterface.sequelize.query(
    `CREATE INDEX idx_goal_child_progress ON child_goals ("childId", "currentProgress") WHERE "deletedAt" IS NULL`
  );
  await queryInterface.sequelize.query(
    `CREATE INDEX idx_goal_school_created ON child_goals ("schoolId", "createdAt" DESC) WHERE "deletedAt" IS NULL`
  );
  await queryInterface.addIndex('child_goals', ['createdBy'], { name: 'idx_goal_created_by' });
};

export const down = async (queryInterface) => {
  await queryInterface.dropTable('child_goals');
  await queryInterface.sequelize.query(`DROP TYPE IF EXISTS "enum_child_goals_category"`);
  await queryInterface.sequelize.query(`DROP TYPE IF EXISTS "enum_child_goals_currentProgress"`);
};
