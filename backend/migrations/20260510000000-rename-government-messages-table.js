/**
 * Rename super_admin_messages → government_messages.
 * Covers: 03-004, 03-016 — table name reflects government role, not defunct super_admin.
 * Reversible: down() renames back.
 */

export async function up(queryInterface) {
  await queryInterface.renameTable('super_admin_messages', 'government_messages');

  // Rename indexes to match new table name
  await queryInterface.sequelize.query(
    `ALTER INDEX IF EXISTS super_admin_messages_sender_id RENAME TO government_messages_sender_id`
  );
  await queryInterface.sequelize.query(
    `ALTER INDEX IF EXISTS super_admin_messages_is_read RENAME TO government_messages_is_read`
  );
  await queryInterface.sequelize.query(
    `ALTER INDEX IF EXISTS super_admin_messages_created_at RENAME TO government_messages_created_at`
  );
}

export async function down(queryInterface) {
  await queryInterface.renameTable('government_messages', 'super_admin_messages');

  await queryInterface.sequelize.query(
    `ALTER INDEX IF EXISTS government_messages_sender_id RENAME TO super_admin_messages_sender_id`
  );
  await queryInterface.sequelize.query(
    `ALTER INDEX IF EXISTS government_messages_is_read RENAME TO super_admin_messages_is_read`
  );
  await queryInterface.sequelize.query(
    `ALTER INDEX IF EXISTS government_messages_created_at RENAME TO super_admin_messages_created_at`
  );
}
