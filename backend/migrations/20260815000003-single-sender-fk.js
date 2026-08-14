/**
 * Campaign III P2 — exactly one foreign key on government_messages.senderId.
 *
 * The schema diff's last difference exposed two different wrong answers.
 *
 * A DATABASE BUILT FROM MIGRATIONS ends up with TWO foreign keys on the same
 * column, with contradictory delete behaviour:
 *
 *   super_admin_messages_senderId_fkey  FOREIGN KEY ("senderId") -> users(id) ON DELETE CASCADE
 *   fk_super_admin_messages_senderId    FOREIGN KEY ("senderId") -> users(id) ON DELETE SET NULL
 *
 * `20260506000000-add-cascade-rules.js` intends to REPLACE the first with the
 * second: its alterFk() looks the existing constraint up through
 * information_schema, drops it, and re-adds it under the fk_<table>_<column>
 * name. On a fresh build the lookup does not match, so the drop never happens
 * and the add succeeds under a new name — leaving both.
 *
 * PRODUCTION has only the first, ON DELETE CASCADE, because that whole migration
 * was skipped there by the runner's "already exists" swallow. Its intended
 * behaviour never took effect.
 *
 * Neither is the specification. `add-cascade-rules` is explicit that senderId
 * should be SET NULL — it passes setNullable=true so the column can hold one —
 * and the reason is not stylistic: **on production today, deleting a user
 * CASCADE-DELETES every government message they ever sent.** The application
 * believes those messages survive with a null sender. They do not.
 *
 * This converges both sides on the specified single constraint. Idempotent:
 * it enumerates whatever foreign keys exist on that column, drops all of them,
 * and creates exactly one.
 */
export default {
  async up(queryInterface) {
    const sql = queryInterface.sequelize;

    const [[{ present }]] = await sql.query(`
      SELECT (
        to_regclass('public.government_messages') IS NOT NULL
        AND EXISTS (SELECT 1 FROM information_schema.columns
                    WHERE table_schema = current_schema()
                      AND table_name = 'government_messages'
                      AND column_name = 'senderId')
      ) AS present;`);
    if (!present) {
      console.log('  ↷ government_messages.senderId absent — nothing to reconcile');
      return;
    }

    // Every FK on this column, whatever it is called. Read from pg_constraint by
    // the COLUMN it constrains rather than by name, because the names are
    // exactly what has drifted.
    const [existing] = await sql.query(`
      SELECT c.conname
      FROM pg_constraint c
      JOIN pg_class t ON t.oid = c.conrelid
      JOIN pg_namespace n ON n.oid = t.relnamespace
      JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY (c.conkey)
      WHERE n.nspname = current_schema()
        AND t.relname = 'government_messages'
        AND c.contype = 'f'
        AND a.attname = 'senderId';`);

    for (const { conname } of existing) {
      await sql.query(`ALTER TABLE "government_messages" DROP CONSTRAINT "${conname}";`);
      console.log(`  ✓ dropped ${conname}`);
    }

    // SET NULL requires a nullable column. 20260815000002 already drops the
    // NOT NULL on production; repeated here so this migration stands alone.
    await sql.query('ALTER TABLE "government_messages" ALTER COLUMN "senderId" DROP NOT NULL;');

    await sql.query(`
      ALTER TABLE "government_messages"
      ADD CONSTRAINT "fk_super_admin_messages_senderId"
      FOREIGN KEY ("senderId") REFERENCES "users"(id)
      ON UPDATE CASCADE ON DELETE SET NULL;`);
    console.log('  ✓ fk_super_admin_messages_senderId (ON DELETE SET NULL) is now the only FK on senderId');
  },

  async down() {
    // No-op. Restoring ON DELETE CASCADE re-introduces silent deletion of a
    // user's government messages, which is the defect this closes.
    console.log('↩ single-sender-fk down is a deliberate no-op');
  },
};
