export const up = async (queryInterface) => {
  await queryInterface.sequelize.query('DROP TABLE IF EXISTS payments CASCADE');
  await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_payments_paymentMethod"');
  await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_payments_paymentType"');
  await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_payments_status"');
  await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_payments_currency"');
};

export const down = async () => {
  // Payments removed — no rollback. Restore from backup if needed.
};
