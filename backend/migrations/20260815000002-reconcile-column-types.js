/**
 * Campaign III P2 — second reconciliation pass: column types and one missing FK.
 *
 * 20260815000001 closed the index and constraint-name gaps. The schema diff then
 * reported what remained, and all of it is production carrying the shape sync()
 * gave it rather than the shape its migration specifies:
 *
 *   children.deletedAt        timestamp   -> timestamptz
 *   users.deletedAt           timestamp   -> timestamptz
 *   schools.createdAt         timestamp NOT NULL DEFAULT now() -> timestamptz, no default
 *   schools.updatedAt         timestamp NOT NULL DEFAULT now() -> timestamptz, no default
 *   schools.id               DEFAULT gen_random_uuid()         -> no default
 *   government_messages.senderId  NOT NULL -> nullable
 *   users.schoolId           FK missing                        -> added
 *
 * The `schools` cluster is the clearest evidence of the cause: production's
 * schools table has sync()'s column shapes AND was missing both indexes that
 * 20260117100000-create-schools.js creates, while that migration sits in
 * SequelizeMeta marked applied. Its createTable hit "already exists", the runner
 * logged a warning and marked the whole migration complete, and every statement
 * after the first never ran.
 *
 * government_messages.senderId is not cosmetic. 20260506000000-add-cascade-rules
 * makes it nullable precisely so its ON DELETE SET NULL can fire; production
 * kept NOT NULL, so deleting a user who has sent a government message would fail
 * at the constraint instead of nulling the column. That is a live latent bug,
 * and this is the migration that removes it.
 *
 * Timezone conversions are explicit about UTC. The application runs UTC on
 * Railway and these values were written by now()/CURRENT_TIMESTAMP in that zone,
 * so `AT TIME ZONE 'UTC'` preserves the instant rather than shifting it.
 *
 * Every step is guarded and idempotent: a no-op on a database already built from
 * migrations, and on a second run against production.
 */
export default {
  async up(queryInterface) {
    const sql = queryInterface.sequelize;

    const columnType = async (table, column) => {
      const [rows] = await sql.query(`
        SELECT c.udt_name, c.is_nullable, coalesce(c.column_default, '') AS def
        FROM information_schema.columns c
        WHERE c.table_schema = current_schema()
          AND c.table_name = '${table}' AND c.column_name = '${column}';`);
      return rows[0] ?? null;
    };

    const toTimestamptz = async (table, column) => {
      const info = await columnType(table, column);
      if (!info) { console.log(`  ↷ ${table}.${column} absent`); return; }
      if (info.udt_name === 'timestamptz') { console.log(`  ↷ ${table}.${column} already timestamptz`); return; }
      await sql.query(`
        ALTER TABLE "${table}"
        ALTER COLUMN "${column}" TYPE timestamptz
        USING "${column}" AT TIME ZONE 'UTC';`);
      console.log(`  ✓ ${table}.${column} -> timestamptz`);
    };

    const dropDefault = async (table, column) => {
      const info = await columnType(table, column);
      if (!info) { console.log(`  ↷ ${table}.${column} absent`); return; }
      if (!info.def) { console.log(`  ↷ ${table}.${column} has no default`); return; }
      await sql.query(`ALTER TABLE "${table}" ALTER COLUMN "${column}" DROP DEFAULT;`);
      console.log(`  ✓ ${table}.${column} default dropped`);
    };

    const dropNotNull = async (table, column) => {
      const info = await columnType(table, column);
      if (!info) { console.log(`  ↷ ${table}.${column} absent`); return; }
      if (info.is_nullable === 'YES') { console.log(`  ↷ ${table}.${column} already nullable`); return; }
      await sql.query(`ALTER TABLE "${table}" ALTER COLUMN "${column}" DROP NOT NULL;`);
      console.log(`  ✓ ${table}.${column} NOT NULL dropped`);
    };

    await toTimestamptz('children', 'deletedAt');
    await toTimestamptz('users', 'deletedAt');
    await toTimestamptz('schools', 'createdAt');
    await toTimestamptz('schools', 'updatedAt');

    await dropDefault('schools', 'createdAt');
    await dropDefault('schools', 'updatedAt');
    await dropDefault('schools', 'id');

    await dropNotNull('government_messages', 'senderId');

    // users.schoolId lost its foreign key to the same skipped migration
    // (20260401000010). The column exists; the constraint does not.
    const [[{ needsFk }]] = await sql.query(`
      SELECT (
        EXISTS (SELECT 1 FROM information_schema.columns
                WHERE table_schema = current_schema()
                  AND table_name = 'users' AND column_name = 'schoolId')
        AND to_regclass('public.schools') IS NOT NULL
        AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_schoolId_fkey')
      ) AS "needsFk";`);
    if (needsFk) {
      await sql.query(`
        ALTER TABLE "users"
        ADD CONSTRAINT "users_schoolId_fkey"
        FOREIGN KEY ("schoolId") REFERENCES "schools"(id) ON DELETE SET NULL;`);
      console.log('  ✓ users_schoolId_fkey added');
    } else {
      console.log('  ↷ users_schoolId_fkey already present or not applicable');
    }
  },

  async down() {
    // No-op. Narrowing timestamptz back to timestamp discards the offset, and
    // restoring NOT NULL on government_messages.senderId re-introduces the
    // latent delete failure this exists to remove.
    console.log('↩ reconcile-column-types down is a deliberate no-op');
  },
};
