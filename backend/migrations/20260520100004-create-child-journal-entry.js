export const up = async (queryInterface, Sequelize) => {
  await queryInterface.createTable('child_journal_entries', {
    id: {
      type: Sequelize.UUID,
      defaultValue: Sequelize.literal('gen_random_uuid()'),
      primaryKey: true,
      allowNull: false,
    },
    childId: {
      type: Sequelize.UUID,
      allowNull: true,
      references: { model: 'children', key: 'id' },
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE',
    },
    teacherId: {
      type: Sequelize.UUID,
      allowNull: true,
      references: { model: 'users', key: 'id' },
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE',
    },
    schoolId: {
      type: Sequelize.UUID,
      allowNull: false,
      references: { model: 'schools', key: 'id' },
      onDelete: 'RESTRICT',
      onUpdate: 'CASCADE',
    },
    date: {
      type: Sequelize.DATEONLY,
      allowNull: false,
    },
    content: {
      type: Sequelize.TEXT,
      allowNull: false,
    },
    isVisibleToParent: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    childSnapshot: {
      type: Sequelize.JSONB,
      allowNull: false,
      defaultValue: {},
    },
    createdAt: {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.literal('NOW()'),
    },
    updatedAt: {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.literal('NOW()'),
    },
    deletedAt: {
      type: Sequelize.DATE,
      allowNull: true,
    },
  });

  await queryInterface.addIndex('child_journal_entries', ['childId', 'date'], {
    name: 'child_journal_entries_child_date_idx',
    order: { date: 'DESC' },
  });

  await queryInterface.addIndex('child_journal_entries', ['schoolId', 'date'], {
    name: 'child_journal_entries_school_date_idx',
    order: { date: 'DESC' },
  });
};

export const down = async (queryInterface) => {
  await queryInterface.dropTable('child_journal_entries');
};
