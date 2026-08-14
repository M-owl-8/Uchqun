/**
 * D-65 — guards shared by the fix-up migrations.
 *
 * Migrations importing a shared helper is normally an anti-pattern: change the
 * helper and you change the behaviour of migrations that have already run. It is
 * accepted here for one narrowly-scoped reason. Every function below can only
 * ever turn a HARD FAILURE into a LOGGED SKIP. It cannot make a migration do
 * more than it did, only less, and only when the target is absent. Nine copies
 * of the same guard would drift; this will not.
 *
 * Why the guards are needed at all: production accumulated its schema over
 * months, partly through Sequelize sync(), in an order the migration sequence
 * does not reproduce. Several fix-up migrations index or constrain columns that
 * exist on production TODAY but do not exist yet at that point in a rebuild —
 * and several name columns that never existed at all (`school_id` where the
 * column is `schoolId`, `sender_id` where it is `senderId`). Unguarded, each is
 * fatal to a from-scratch build.
 *
 * A skipped index costs a query plan. A migration that throws costs the entire
 * database.
 */

/** Does `table` exist, with every one of `cols`? */
export async function hasColumns(queryInterface, table, cols) {
  const list = cols.map((c) => `'${c}'`).join(',');
  const [[row]] = await queryInterface.sequelize.query(`
    SELECT (
      to_regclass('public.${table}') IS NOT NULL
      AND (SELECT count(*) FROM information_schema.columns
           WHERE table_schema = current_schema()
             AND table_name = '${table}'
             AND column_name IN (${list})) = ${cols.length}
    ) AS present;`);
  return Boolean(row.present);
}

/**
 * addIndex that skips — loudly — when the table or any column is missing.
 * The log line matters: a skip that prints is a gap somebody can act on, a skip
 * that is swallowed is why this went unnoticed for months.
 */
export async function safeAddIndex(queryInterface, table, fields, options = {}) {
  const name = options.name ?? `${table}_${fields.join('_')}`;
  if (!(await hasColumns(queryInterface, table, fields))) {
    console.log(`  ↷ skipping index ${name} — ${table}.${fields.join(',')} not present`);
    return false;
  }
  try {
    await queryInterface.addIndex(table, fields, options);
    return true;
  } catch (err) {
    if (err.message && err.message.includes('already exists')) return false;
    throw err;
  }
}
