/**
 * Promote any legacy super-admin user (role='admin' with SUPER_ADMIN_EMAIL)
 * to the government role. The super-admin app and special-email auth path
 * are removed; government is now the top-level platform owner.
 */
export const up = async (queryInterface) => {
  const targetEmail = process.env.SUPER_ADMIN_EMAIL || 'superadmin@uchqun.uz';
  await queryInterface.sequelize.query(
    `UPDATE users SET role = 'government' WHERE email = :email AND role = 'admin'`,
    { replacements: { email: targetEmail } }
  );
};

export const down = async (queryInterface) => {
  const targetEmail = process.env.SUPER_ADMIN_EMAIL || 'superadmin@uchqun.uz';
  await queryInterface.sequelize.query(
    `UPDATE users SET role = 'admin' WHERE email = :email AND role = 'government'`,
    { replacements: { email: targetEmail } }
  );
};
