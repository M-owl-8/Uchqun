// Depends on: irrs (20260526000002), children, schools, users
// Must run BEFORE short_term_goals (which FK-references this table)
export const up = async (queryInterface, Sequelize) => {
  await queryInterface.createTable('goal_periods', {
    id: {
      type: Sequelize.UUID,
      defaultValue: Sequelize.literal('gen_random_uuid()'),
      primaryKey: true,
    },
    irrId: {
      type: Sequelize.UUID,
      allowNull: false,
      references: { model: 'irrs', key: 'id' },
      onDelete: 'CASCADE',
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
    periodStart: {
      type: Sequelize.DATEONLY,
      allowNull: false,
    },
    periodEnd: {
      type: Sequelize.DATEONLY,
      allowNull: false,
    },
    status: {
      type: Sequelize.ENUM('active', 'reviewed', 'completed'),
      allowNull: false,
      defaultValue: 'active',
    },
    overallAssessment: {
      type: Sequelize.TEXT,
      allowNull: true,
    },
    planChanges: {
      type: Sequelize.TEXT,
      allowNull: true,
    },
    parentRecommendations: {
      type: Sequelize.TEXT,
      allowNull: true,
    },
    nextReviewDate: {
      type: Sequelize.DATEONLY,
      allowNull: true,
    },
    nextAssessmentDate: {
      type: Sequelize.DATEONLY,
      allowNull: true,
    },
    parentDiscussionDate: {
      type: Sequelize.DATEONLY,
      allowNull: true,
    },
    teacherSignedAt: {
      type: Sequelize.DATE,
      allowNull: true,
    },
    teacherSignedBy: {
      type: Sequelize.UUID,
      allowNull: true,
      references: { model: 'users', key: 'id' },
      onDelete: 'SET NULL',
    },
    managerSignedAt: {
      type: Sequelize.DATE,
      allowNull: true,
    },
    managerSignedBy: {
      type: Sequelize.UUID,
      allowNull: true,
      references: { model: 'users', key: 'id' },
      onDelete: 'SET NULL',
    },
    createdAt: { type: Sequelize.DATE, allowNull: false },
    updatedAt: { type: Sequelize.DATE, allowNull: false },
  });

  await queryInterface.addIndex('goal_periods', ['irrId'], { name: 'idx_goal_periods_irr_id' });
  await queryInterface.addIndex('goal_periods', ['childId'], { name: 'idx_goal_periods_child_id' });
  await queryInterface.addIndex('goal_periods', ['schoolId'], { name: 'idx_goal_periods_school_id' });
  await queryInterface.addIndex('goal_periods', ['status'], { name: 'idx_goal_periods_status' });
  await queryInterface.addIndex('goal_periods', ['irrId', 'periodStart'], {
    name: 'idx_goal_periods_irr_period_start',
  });
};

export const down = async (queryInterface) => {
  await queryInterface.dropTable('goal_periods');
  await queryInterface.sequelize.query(`DROP TYPE IF EXISTS "enum_goal_periods_status"`);
};
