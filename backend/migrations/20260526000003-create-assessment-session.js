// Depends on: irrs (20260526000002), children, schools, users
// Must run BEFORE assessment_scores (which FK-references this table)
export const up = async (queryInterface, Sequelize) => {
  await queryInterface.createTable('assessment_sessions', {
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
    completedBy: {
      type: Sequelize.UUID,
      allowNull: true,
      references: { model: 'users', key: 'id' },
      onDelete: 'SET NULL',
    },
    sessionType: {
      type: Sequelize.ENUM('intake', '3mo', '6mo', '9mo', '12mo', 'custom'),
      allowNull: false,
    },
    customLabel: {
      type: Sequelize.STRING(100),
      allowNull: true,
    },
    assessmentDate: {
      type: Sequelize.DATEONLY,
      allowNull: false,
    },
    totalScore: {
      type: Sequelize.INTEGER,
      allowNull: true,
    },
    maxPossibleScore: {
      type: Sequelize.INTEGER,
      allowNull: true,
      defaultValue: 68,
    },
    isHearingImpaired: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    notes: {
      type: Sequelize.TEXT,
      allowNull: true,
    },
    completedAt: {
      type: Sequelize.DATE,
      allowNull: true,
    },
    createdAt: { type: Sequelize.DATE, allowNull: false },
    updatedAt: { type: Sequelize.DATE, allowNull: false },
  });

  await queryInterface.addIndex('assessment_sessions', ['irrId'], { name: 'idx_assessment_sessions_irr_id' });
  await queryInterface.addIndex('assessment_sessions', ['childId'], { name: 'idx_assessment_sessions_child_id' });
  await queryInterface.addIndex('assessment_sessions', ['schoolId'], { name: 'idx_assessment_sessions_school_id' });
  // Partial unique: only one session of each named type per IRR (custom type allows duplicates)
  await queryInterface.sequelize.query(
    `CREATE UNIQUE INDEX idx_assessment_sessions_irr_type_unique
     ON assessment_sessions ("irrId", "sessionType")
     WHERE "sessionType" != 'custom'`
  );
};

export const down = async (queryInterface) => {
  await queryInterface.dropTable('assessment_sessions');
  await queryInterface.sequelize.query(`DROP TYPE IF EXISTS "enum_assessment_sessions_sessionType"`);
};
