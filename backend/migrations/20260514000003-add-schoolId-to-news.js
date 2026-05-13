export const up = async (queryInterface, Sequelize) => {
  await queryInterface.addColumn('news', 'schoolId', {
    type: Sequelize.DataTypes.UUID,
    allowNull: true,
    references: { model: 'schools', key: 'id' },
    onDelete: 'SET NULL',
    onUpdate: 'CASCADE',
  });
  await queryInterface.addIndex('news', ['schoolId']);
};

export const down = async (queryInterface) => {
  await queryInterface.removeIndex('news', ['schoolId']);
  await queryInterface.removeColumn('news', 'schoolId');
};
