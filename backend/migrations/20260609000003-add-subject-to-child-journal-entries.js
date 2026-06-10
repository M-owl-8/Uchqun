'use strict';

/**
 * Add `subject` to child_journal_entries so the teacher composer can
 * post a structured {subject, body} pair (PP-JOURNAL-BULK).
 *
 * Existing rows: NULL — the composer treats null as "no subject set"
 * and falls back to the body-only render the parent app shipped with.
 */
export default {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('child_journal_entries', 'subject', {
      type: Sequelize.STRING(200),
      allowNull: true,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('child_journal_entries', 'subject');
  },
};
