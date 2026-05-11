export async function up(queryInterface, Sequelize) {
  const tableDesc = await queryInterface.describeTable('children');
  if (tableDesc.school) {
    await queryInterface.removeColumn('children', 'school');
  }
}

export async function down(queryInterface, Sequelize) {
  const tableDesc = await queryInterface.describeTable('children');
  if (!tableDesc.school) {
    await queryInterface.addColumn('children', 'school', {
      type: Sequelize.STRING(500),
      allowNull: true,
    });
  }
}
