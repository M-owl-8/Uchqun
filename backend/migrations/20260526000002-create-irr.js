// Depends on: children, schools, users tables (all pre-existing)
// Must run BEFORE assessment_sessions, long_term_goals, goal_periods, short_term_goals,
//   daily_monitoring_entries, weekly_monitoring_entries (all FK-reference irrs)
export const up = async (queryInterface, Sequelize) => {
  await queryInterface.createTable('irrs', {
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
    parentId: {
      type: Sequelize.UUID,
      allowNull: true,
      references: { model: 'users', key: 'id' },
      onDelete: 'SET NULL',
    },
    createdBy: {
      type: Sequelize.UUID,
      allowNull: true,
      references: { model: 'users', key: 'id' },
      onDelete: 'SET NULL',
    },
    status: {
      type: Sequelize.ENUM('draft', 'active', 'archived'),
      allowNull: false,
      defaultValue: 'draft',
    },
    childFullName: {
      type: Sequelize.STRING(200),
      allowNull: true,
    },
    dateOfBirth: {
      type: Sequelize.DATEONLY,
      allowNull: true,
    },
    ageAtAssessmentStart: {
      type: Sequelize.STRING(50),
      allowNull: true,
    },
    ptpkIntakeDate: {
      type: Sequelize.DATEONLY,
      allowNull: true,
    },
    ptpkConclusionDate: {
      type: Sequelize.DATEONLY,
      allowNull: true,
    },
    ptpkConclusionNumber: {
      type: Sequelize.STRING(100),
      allowNull: true,
    },
    ptpkDiagnosis: {
      type: Sequelize.TEXT,
      allowNull: true,
    },
    ptpkNotes: {
      type: Sequelize.TEXT,
      allowNull: true,
    },
    irrStartDate: {
      type: Sequelize.DATEONLY,
      allowNull: true,
    },
    additionalInfo: {
      type: Sequelize.TEXT,
      allowNull: true,
    },
    childStrengths: {
      type: Sequelize.TEXT,
      allowNull: true,
    },
    riskFactors: {
      type: Sequelize.TEXT,
      allowNull: true,
    },
    createdAt: { type: Sequelize.DATE, allowNull: false },
    updatedAt: { type: Sequelize.DATE, allowNull: false },
    deletedAt: { type: Sequelize.DATE, allowNull: true },
  });

  await queryInterface.addIndex('irrs', ['childId'], { name: 'idx_irrs_child_id' });
  await queryInterface.addIndex('irrs', ['schoolId'], { name: 'idx_irrs_school_id' });
  await queryInterface.addIndex('irrs', ['parentId'], { name: 'idx_irrs_parent_id' });
  await queryInterface.addIndex('irrs', ['status'], { name: 'idx_irrs_status' });
  await queryInterface.sequelize.query(
    `CREATE INDEX idx_irrs_child_status_active ON irrs ("childId", status) WHERE "deletedAt" IS NULL`
  );
};

export const down = async (queryInterface) => {
  await queryInterface.dropTable('irrs');
  await queryInterface.sequelize.query(`DROP TYPE IF EXISTS "enum_irrs_status"`);
};
