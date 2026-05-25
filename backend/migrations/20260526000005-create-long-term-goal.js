// Depends on: irrs (20260526000002), children, schools
export const up = async (queryInterface, Sequelize) => {
  await queryInterface.createTable('long_term_goals', {
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
    sortOrder: {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 1,
    },
    goalText: {
      type: Sequelize.TEXT,
      allowNull: false,
    },
    targetPeriodStart: {
      type: Sequelize.DATEONLY,
      allowNull: true,
    },
    targetPeriodEnd: {
      type: Sequelize.DATEONLY,
      allowNull: true,
    },
    createdAt: { type: Sequelize.DATE, allowNull: false },
    updatedAt: { type: Sequelize.DATE, allowNull: false },
  });

  await queryInterface.addIndex('long_term_goals', ['irrId'], { name: 'idx_long_term_goals_irr_id' });
  await queryInterface.addIndex('long_term_goals', ['childId'], { name: 'idx_long_term_goals_child_id' });
  await queryInterface.addIndex('long_term_goals', ['schoolId'], { name: 'idx_long_term_goals_school_id' });
  await queryInterface.addIndex('long_term_goals', ['irrId', 'sortOrder'], {
    name: 'idx_long_term_goals_irr_sort',
  });
};

export const down = async (queryInterface) => {
  await queryInterface.dropTable('long_term_goals');
};
