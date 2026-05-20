export const up = async (queryInterface, Sequelize) => {
  await queryInterface.createTable('teacher_reflections', {
    id: {
      type: Sequelize.UUID,
      defaultValue: Sequelize.literal('gen_random_uuid()'),
      primaryKey: true,
      allowNull: false,
    },
    teacherId: {
      type: Sequelize.UUID,
      allowNull: true,
      references: { model: 'users', key: 'id' },
      onDelete: 'CASCADE',
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

  await queryInterface.addConstraint('teacher_reflections', {
    fields: ['teacherId', 'date'],
    type: 'unique',
    name: 'teacher_reflections_teacher_date_unique',
  });

  await queryInterface.addIndex('teacher_reflections', ['teacherId', 'date'], {
    name: 'teacher_reflections_teacher_date_idx',
    order: { date: 'DESC' },
  });
};

export const down = async (queryInterface) => {
  await queryInterface.dropTable('teacher_reflections');
};
