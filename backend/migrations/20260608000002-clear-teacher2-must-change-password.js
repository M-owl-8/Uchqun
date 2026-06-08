/**
 * Clear stale mustChangePassword flag for teacher2@uchqun.uz.
 *
 * Root cause (DEF-006): migration 20260608000001 reset teacher2's password
 * to Test@2026 but did not clear mustChangePassword. The flag was originally
 * set when teacher2's password was changed interactively during S6-S9 sprint
 * testing, triggering the CP-021 forced-change gate on every subsequent login.
 *
 * Scope: exactly teacher2@uchqun.uz from the beta test fleet.
 * Non-beta sprint accounts (testr077.s9, testwizard3.s8) retain their flags —
 * they are NOT part of the canonical beta fleet and the gate should remain
 * active for them.
 *
 * Idempotent: the UPDATE is a no-op if the flag is already false.
 */

const BETA_FLEET_EMAIL = 'teacher2@uchqun.uz';

export const up = async (queryInterface) => {
  await queryInterface.sequelize.query(
    `UPDATE users
     SET "mustChangePassword" = false, "updatedAt" = NOW()
     WHERE email = :email
       AND "mustChangePassword" = true`,
    { replacements: { email: BETA_FLEET_EMAIL } }
  );
};

export const down = async (queryInterface) => {
  // Deliberately a no-op: we do not re-introduce a stale flag on rollback.
  // If a rollback is needed, re-set manually via the admin portal or a
  // targeted UPDATE — do not automate re-flagging a test account.
};
