export const up = async (queryInterface, Sequelize) => {
  await queryInterface.createTable('child_goal_reviews', {
    id: {
      type: Sequelize.UUID,
      defaultValue: Sequelize.literal('gen_random_uuid()'),
      primaryKey: true,
    },
    goalId: {
      type: Sequelize.UUID,
      allowNull: false,
      references: { model: 'child_goals', key: 'id' },
      onDelete: 'CASCADE',
    },
    reviewerId: {
      type: Sequelize.UUID,
      allowNull: true,
      references: { model: 'users', key: 'id' },
      onDelete: 'SET NULL',
    },
    reviewDate: {
      type: Sequelize.DATEONLY,
      allowNull: false,
    },
    status: {
      type: Sequelize.ENUM(
        'on_track', 'progressing_slowly', 'not_progressing', 'achieved', 'revised'
      ),
      allowNull: false,
    },
    evidence: {
      type: Sequelize.TEXT,
      allowNull: true,
    },
    nextSteps: {
      type: Sequelize.TEXT,
      allowNull: true,
    },
    createdAt: { type: Sequelize.DATE, allowNull: false },
    updatedAt: { type: Sequelize.DATE, allowNull: false },
  });

  await queryInterface.sequelize.query(
    `CREATE INDEX idx_goal_review_goal_date ON child_goal_reviews ("goalId", "reviewDate" DESC)`
  );
};

export const down = async (queryInterface) => {
  await queryInterface.dropTable('child_goal_reviews');
  await queryInterface.sequelize.query(`DROP TYPE IF EXISTS "enum_child_goal_reviews_status"`);
};
