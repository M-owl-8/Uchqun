/**
 * Migration: Add deletedAt columns for soft deletes on users and children.
 */
export async function up(queryInterface, Sequelize) {
  const tables = ['users', 'children'];
  for (const table of tables) {
    try {
      await queryInterface.addColumn(table, 'deletedAt', {
        type: Sequelize.DATE,
        allowNull: true,
        defaultValue: null,
      });
    } catch (err) {
      if (err.message && err.message.includes('already exists')) {
        // Column already exists, skip
      } else {
        throw err;
      }
    }
  }
}

export async function down(queryInterface) {
  await queryInterface.removeColumn('users', 'deletedAt');
  await queryInterface.removeColumn('children', 'deletedAt');
}
