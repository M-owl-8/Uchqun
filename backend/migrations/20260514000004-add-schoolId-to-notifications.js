export const up = async (queryInterface, Sequelize) => {
  await queryInterface.addColumn('notifications', 'schoolId', {
    type: Sequelize.DataTypes.UUID,
    allowNull: true,
    references: { model: 'schools', key: 'id' },
    onDelete: 'SET NULL',
    onUpdate: 'CASCADE',
  });
};

export const down = async (queryInterface) => {
  await queryInterface.removeColumn('notifications', 'schoolId');
};
