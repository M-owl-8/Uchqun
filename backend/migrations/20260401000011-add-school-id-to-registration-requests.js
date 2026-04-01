export async function up(queryInterface, Sequelize) {
  try {
    await queryInterface.addColumn('admin_registration_requests', 'schoolId', {
      type: Sequelize.UUID,
      allowNull: true,
      references: { model: 'schools', key: 'id' },
      onDelete: 'SET NULL',
    });
  } catch (err) {
    if (!err.message?.includes('already exists')) throw err;
  }
}

export async function down(queryInterface) {
  try { await queryInterface.removeColumn('admin_registration_requests', 'schoolId'); } catch (_e) { /* ignore */ }
}
