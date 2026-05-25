// Depends on: goal_periods (20260526000006), irrs (20260526000002), children, schools
export const up = async (queryInterface, Sequelize) => {
  await queryInterface.createTable('short_term_goals', {
    id: {
      type: Sequelize.UUID,
      defaultValue: Sequelize.literal('gen_random_uuid()'),
      primaryKey: true,
    },
    periodId: {
      type: Sequelize.UUID,
      allowNull: false,
      references: { model: 'goal_periods', key: 'id' },
      onDelete: 'CASCADE',
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
    skillAreaCode: {
      type: Sequelize.STRING(50),
      allowNull: true,
    },
    goalText: {
      type: Sequelize.TEXT,
      allowNull: false,
    },
    taskSetDate: {
      type: Sequelize.DATEONLY,
      allowNull: true,
    },
    targetDate: {
      type: Sequelize.DATEONLY,
      allowNull: true,
    },
    tasks: {
      type: Sequelize.TEXT,
      allowNull: true,
    },
    methods: {
      type: Sequelize.TEXT,
      allowNull: true,
    },
    progress: {
      type: Sequelize.TEXT,
      allowNull: true,
    },
    observations: {
      type: Sequelize.TEXT,
      allowNull: true,
    },
    createdAt: { type: Sequelize.DATE, allowNull: false },
    updatedAt: { type: Sequelize.DATE, allowNull: false },
  });

  await queryInterface.addIndex('short_term_goals', ['periodId'], { name: 'idx_short_term_goals_period_id' });
  await queryInterface.addIndex('short_term_goals', ['irrId'], { name: 'idx_short_term_goals_irr_id' });
  await queryInterface.addIndex('short_term_goals', ['childId'], { name: 'idx_short_term_goals_child_id' });
  await queryInterface.addIndex('short_term_goals', ['schoolId'], { name: 'idx_short_term_goals_school_id' });
  await queryInterface.addIndex('short_term_goals', ['periodId', 'sortOrder'], {
    name: 'idx_short_term_goals_period_sort',
  });
};

export const down = async (queryInterface) => {
  await queryInterface.dropTable('short_term_goals');
};
