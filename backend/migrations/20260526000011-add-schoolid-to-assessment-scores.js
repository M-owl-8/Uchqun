// Corrective migration: assessment_scores was created without schoolId in 000004.
// All child-scoped ИРР tables carry schoolId for direct-row tenant enforcement —
// without it a Phase-2 findByPk on a score row cannot enforce tenant boundary
// without joining through assessmentSession → irr.
//
// Local: runs after 000004 against an empty table — NOT NULL is safe.
// Railway: DO NOT run until Phase 2 is proven locally. Before promoting to Railway,
//   verify assessment_scores is empty (it will be — Phase 2 hasn't shipped) or
//   add a backfill step. The IF NOT EXISTS guard makes the migration re-runnable.
export const up = async (queryInterface, Sequelize) => {
  await queryInterface.sequelize.query(
    `ALTER TABLE assessment_scores ADD COLUMN IF NOT EXISTS "schoolId" UUID NOT NULL REFERENCES schools(id) ON DELETE RESTRICT`
  );
  await queryInterface.addIndex('assessment_scores', ['schoolId'], {
    name: 'idx_assessment_scores_school_id',
  });
};

export const down = async (queryInterface) => {
  await queryInterface.removeIndex('assessment_scores', 'idx_assessment_scores_school_id');
  await queryInterface.sequelize.query(
    `ALTER TABLE assessment_scores DROP COLUMN IF EXISTS "schoolId"`
  );
};
