export async function up(queryInterface, Sequelize) {
  await queryInterface.changeColumn('children', 'school', {
    type: Sequelize.STRING(500),
    allowNull: true,
  });
}

export async function down(queryInterface, Sequelize) {
  // Restore NOT NULL — will fail if any rows have null school; run manually
  await queryInterface.changeColumn('children', 'school', {
    type: Sequelize.STRING(500),
    allowNull: false,
    defaultValue: '',
  });
}
