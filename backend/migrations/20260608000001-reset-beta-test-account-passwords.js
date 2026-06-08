/**
 * Reset passwords for canonical beta test accounts that were changed
 * during S6–S9 sprint testing (settings page, wizard tests).
 * Restores all to Test@2026 (bcrypt 10 rounds — same hash as seed-02.sql).
 *
 * Affected accounts identified via hash mismatch query 2026-06-08:
 *   reception1@uchqun.uz — changed via Settings page during S9
 *   teacher2@uchqun.uz   — changed during sprint testing
 *   gov.republic@uchqun.uz — changed during S9 government portal walk
 */

const HASH = '$2b$10$.ovwHitQ4P/HBG4RmhrYR.LRGIrOGlFaCtM.d9Gi.yXuCZ0q6KyTO';

const ACCOUNTS = [
  'reception1@uchqun.uz',
  'teacher2@uchqun.uz',
  'gov.republic@uchqun.uz',
];

export const up = async (queryInterface) => {
  for (const email of ACCOUNTS) {
    await queryInterface.sequelize.query(
      `UPDATE users SET password = :hash, "updatedAt" = NOW() WHERE email = :email`,
      { replacements: { hash: HASH, email } }
    );
  }
};

export const down = async () => {
  // No-op: previous hashes are unknown (changed during interactive testing).
};
