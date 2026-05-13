// #03-010 — add missing indexes on users.role, users.isActive, emotional_monitoring.childId
// Note: recordedAt was removed from emotional_monitoring in favour of createdAt;
//       the index on that column is skipped if the column is absent.
export async function up(queryInterface) {
  const addIdx = async (table, fields, name) => {
    try {
      await queryInterface.addIndex(table, fields, { name });
    } catch (err) {
      if (!err.message?.includes('already exists')) throw err;
    }
  };
  await addIdx('users', ['role'],     'users_role_idx');
  await addIdx('users', ['isActive'], 'users_is_active_idx');
  await addIdx('emotional_monitoring', ['childId'], 'em_child_idx');
  // Add recordedAt index only if the column exists
  const emCols = await queryInterface.describeTable('emotional_monitoring');
  if (emCols.recordedAt) {
    await addIdx('emotional_monitoring', ['recordedAt'], 'em_recorded_at_idx');
  }
}

export async function down(queryInterface) {
  await queryInterface.removeIndex('users', 'users_role_idx').catch(() => {});
  await queryInterface.removeIndex('users', 'users_is_active_idx').catch(() => {});
  await queryInterface.removeIndex('emotional_monitoring', 'em_child_idx').catch(() => {});
  await queryInterface.removeIndex('emotional_monitoring', 'em_recorded_at_idx').catch(() => {});
}
