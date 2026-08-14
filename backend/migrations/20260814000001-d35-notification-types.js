/**
 * D-35 — the parent notification centre is never fed by attendance or journal.
 *
 * On a day when a parent's child received a journal entry, a chat message and
 * three attendance changes, the parent's notification page read
 * `Bildirishnomalar(0)`. The whole notifications table held 18 rows, all of type
 * activity / media / meal / general — no event source outside those three ever
 * produces one.
 *
 * enum_notifications_type has no value to hold them, so the wiring cannot exist
 * without this. Additive only: ADD VALUE IF NOT EXISTS, no rewrite of existing
 * rows, nothing dropped.
 *
 * Note on the down migration: PostgreSQL cannot remove a value from an enum
 * type. Rebuilding the type would mean rewriting the column on a live table for
 * the sake of undoing an additive change, which is a far larger risk than the
 * change itself. The down is therefore a documented no-op rather than a
 * destructive rebuild — stated here rather than left for someone to discover.
 */
export default {
  async up(queryInterface) {
    // BOTH enums. notifications.type and notifications.relatedType are separate
    // types with different value sets — relatedType had only
    // (activity, meal, media, progress). Adding the value to `type` alone would
    // have made every insert fail on relatedType, and createNotification
    // swallows its own errors, so the notification centre would have stayed
    // empty while every test passed. That is the D-27 failure mode exactly.
    for (const typname of ['enum_notifications_type', 'enum_notifications_relatedType']) {
      const [rows] = await queryInterface.sequelize.query(`
        SELECT e.enumlabel AS label
        FROM pg_enum e
        JOIN pg_type t ON t.oid = e.enumtypid
        WHERE t.typname = '${typname}';
      `);
      const existing = rows.map((r) => r.label);

      for (const value of ['attendance', 'journal']) {
        if (existing.includes(value)) {
          console.log(`✓ ${typname} already has '${value}'`);
          continue;
        }
        await queryInterface.sequelize.query(
          `ALTER TYPE "${typname}" ADD VALUE IF NOT EXISTS '${value}';`
        );
        console.log(`✓ Added '${value}' to ${typname}`);
      }
    }
  },

  async down() {
    // Intentionally a no-op — see the note above. Removing an enum value in
    // PostgreSQL requires recreating the type and rewriting every dependent
    // column; the risk of that vastly exceeds the benefit of reverting an
    // additive change. Rows of these types would also become unrepresentable.
    console.log('↩ d35-notification-types down is a no-op (enum values cannot be dropped safely)');
  },
};
