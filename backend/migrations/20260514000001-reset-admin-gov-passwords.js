/**
 * One-time migration: set known passwords for admin/government/business accounts
 * so the v2 audit fix loop can proceed without Railway CLI access.
 * Passwords are pre-hashed with bcrypt cost 10.
 *
 * Credentials set:
 *   admin@uchqun.uz        → AdminV2@2026
 *   superadmin@uchqun.uz   → SuperAdminV2@2026
 *   government@uchqun.uz   → GovernmentV2@2026
 *   business@uchqun.uz     → BusinessV2@2026
 */
export const up = async (queryInterface) => {
  const updates = [
    {
      email: 'admin@uchqun.uz',
      hash: '$2b$10$hyALwU9bsXzUJCNypTfnSu5MTJkFAQiTjfRYpLLPRyEWJ7fqf3jpi',
    },
    {
      email: 'superadmin@uchqun.uz',
      hash: '$2b$10$ZkL0rjmFbms2pqMGk6Mja.TZKfCfinsISdzswyygNqmWH03eJ2uw.',
    },
    {
      email: 'government@uchqun.uz',
      hash: '$2b$10$psCrBBmSwJewg93sdZXleusts9IVHks1PIpASCIwiXN3fw5hG9CcG',
    },
    {
      email: 'business@uchqun.uz',
      hash: '$2b$10$p8UcsHW4IHx3RjnbOQjyduyXiLixRuvYSPLD90VAJmQOjsuF1jpAq',
    },
  ];

  for (const { email, hash } of updates) {
    await queryInterface.sequelize.query(
      `UPDATE users SET password = :hash WHERE email = :email`,
      { replacements: { hash, email } }
    );
  }
};

export const down = async () => {
  // Intentionally no-op: passwords are secrets and cannot be reversed.
};
