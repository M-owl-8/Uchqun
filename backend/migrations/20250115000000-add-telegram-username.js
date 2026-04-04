/**
 * Migration: Add telegramUsername column to admin_registration_requests table
 */
export async function up(queryInterface, Sequelize) {
  // Guard: table is created in 20260113000000 — skip if not yet created (fresh install)
  const tableExists = await queryInterface.showAllTables()
    .then((tables) => tables.includes('admin_registration_requests'))
    .catch(() => false);
  if (!tableExists) return;

  const desc = await queryInterface.describeTable('admin_registration_requests').catch(() => null);
  if (!desc || desc.telegramUsername) return;

  await queryInterface.addColumn('admin_registration_requests', 'telegramUsername', {
    type: Sequelize.STRING,
    allowNull: false,
    defaultValue: '',
    comment: 'Telegram username (without @) - required field',
  });
}

export async function down(queryInterface) {
  const tableExists = await queryInterface.showAllTables()
    .then((tables) => tables.includes('admin_registration_requests'))
    .catch(() => false);
  if (!tableExists) return;

  await queryInterface.removeColumn('admin_registration_requests', 'telegramUsername');
}
