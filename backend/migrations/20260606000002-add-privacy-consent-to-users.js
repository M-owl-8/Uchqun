/**
 * G4 of BETA-LAUNCH-PLAN — privacy consent UI.
 *
 * Adds a single nullable timestamp column `privacy_consented_at` to the users
 * table. NULL = consent never given; non-null = consent recorded at that moment
 * with the platform's then-current consent text.
 *
 * Consent semantics (see docs/PRIVACY_POSTURE.md):
 *   - PL-001 / C-02 — group-wide media visibility (parents in the same group
 *     can see each other's children's media).
 *   - CP-019 / PL-009 — AI-generated UZ/RU translations may contain errors.
 *
 * The consent text is held in the parent portal's locale files; this column
 * only records WHEN consent was given. Re-consent (when the text changes
 * materially) is a future operation: bump a server-side version, compare to
 * `privacy_consented_at` (or store version separately), force a re-prompt.
 * Not in scope for beta — beta just gates first-login.
 *
 * Only parents are prompted (frontend gates by role). The column exists for
 * all users so the future audit-log + government-wide consent records share
 * the same shape.
 */

export async function up(queryInterface, Sequelize) {
  await queryInterface.addColumn('users', 'privacyConsentedAt', {
    type: Sequelize.DATE,
    allowNull: true,
  });
}

export async function down(queryInterface) {
  await queryInterface.removeColumn('users', 'privacyConsentedAt');
}
