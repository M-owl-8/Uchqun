/**
 * Migration: Add schoolId to users and groups tables for multi-school isolation.
 * Every user and group belongs to a school. This enables proper data isolation
 * so School A's data never leaks to School B.
 */
export async function up(queryInterface, Sequelize) {
  // Add schoolId to users
  try {
    await queryInterface.addColumn('users', 'schoolId', {
      type: Sequelize.UUID,
      allowNull: true, // Nullable for backward compat (government users have no school)
      references: { model: 'schools', key: 'id' },
      onDelete: 'SET NULL',
    });
    await queryInterface.addIndex('users', ['schoolId'], { name: 'idx_users_school_id' });
  } catch (err) {
    if (!err.message?.includes('already exists')) throw err;
  }

  // Add schoolId to groups
  try {
    await queryInterface.addColumn('groups', 'schoolId', {
      type: Sequelize.UUID,
      allowNull: true,
      references: { model: 'schools', key: 'id' },
      onDelete: 'SET NULL',
    });
    await queryInterface.addIndex('groups', ['schoolId'], { name: 'idx_groups_school_id' });
  } catch (err) {
    if (!err.message?.includes('already exists')) throw err;
  }
}

export async function down(queryInterface) {
  try { await queryInterface.removeColumn('users', 'schoolId'); } catch (_e) { /* ignore */ }
  try { await queryInterface.removeColumn('groups', 'schoolId'); } catch (_e) { /* ignore */ }
}
