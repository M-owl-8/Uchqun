// Depends on: assessment_sessions (20260526000003), assessment_criteria (20260526000001)
// CHECK constraint enforces software-direction score range 0–4.
export const up = async (queryInterface, Sequelize) => {
  await queryInterface.createTable('assessment_scores', {
    id: {
      type: Sequelize.UUID,
      defaultValue: Sequelize.literal('gen_random_uuid()'),
      primaryKey: true,
    },
    sessionId: {
      type: Sequelize.UUID,
      allowNull: false,
      references: { model: 'assessment_sessions', key: 'id' },
      onDelete: 'CASCADE',
    },
    criterionId: {
      type: Sequelize.UUID,
      allowNull: false,
      references: { model: 'assessment_criteria', key: 'id' },
      onDelete: 'RESTRICT',
    },
    score: {
      type: Sequelize.INTEGER,
      allowNull: false,
    },
    notes: {
      type: Sequelize.TEXT,
      allowNull: true,
    },
    createdAt: { type: Sequelize.DATE, allowNull: false },
    updatedAt: { type: Sequelize.DATE, allowNull: false },
  });

  // Enforce software score range at DB level
  await queryInterface.sequelize.query(
    `ALTER TABLE assessment_scores ADD CONSTRAINT chk_assessment_score_range CHECK (score >= 0 AND score <= 4)`
  );

  // One score per criterion per session
  await queryInterface.addIndex('assessment_scores', ['sessionId', 'criterionId'], {
    unique: true,
    name: 'idx_assessment_scores_session_criterion_unique',
  });
  await queryInterface.addIndex('assessment_scores', ['sessionId'], {
    name: 'idx_assessment_scores_session_id',
  });
  await queryInterface.addIndex('assessment_scores', ['criterionId'], {
    name: 'idx_assessment_scores_criterion_id',
  });
};

export const down = async (queryInterface) => {
  await queryInterface.dropTable('assessment_scores');
};
