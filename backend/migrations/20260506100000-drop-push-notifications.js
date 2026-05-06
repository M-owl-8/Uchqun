export const up = async (queryInterface) => {
  await queryInterface.sequelize.query('DROP TABLE IF EXISTS push_notifications CASCADE');
  await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_push_notifications_platform"');
  await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_push_notifications_notificationType"');
  await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_push_notifications_priority"');
  await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_push_notifications_status"');
};

export const down = async () => {
  // Mobile/Expo push removed — no rollback path. Restore from backup if needed.
};
