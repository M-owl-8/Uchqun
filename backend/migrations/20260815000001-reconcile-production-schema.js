/**
 * Campaign III P2 — reconcile production with what the migrations build.
 *
 * The schema diff (backend/scripts/schema-diff.mjs) compared production against
 * a database built from migrations alone. Most differences were the migrations'
 * fault and are fixed there. These are the other direction: objects the
 * migrations correctly create that **production does not have**.
 *
 * They are missing for one reason, and it is worth stating because it is a
 * defect in the migration runner rather than in any migration. `config/migrate.js`
 * catches "already exists" and marks the migration COMPLETE:
 *
 *     warn: Migration skipped (already exists)
 *           {"file":"20260510000000-rename-government-messages-table.js",
 *            "error":"relation \"government_messages\" already exists"}
 *
 * When a migration's FIRST statement hits that — typically a createTable for a
 * table sync() had already made — every remaining statement in that migration is
 * skipped too, and the migration is recorded as applied. `20260117100000-create-schools.js`
 * creates the schools table and then two indexes; production has the table and
 * neither index, and the migration is in SequelizeMeta. Same shape for
 * `20260401000010-add-school-id-to-users-groups.js` and its users index.
 *
 * Everything here is idempotent and additive. On a database built from
 * migrations it is a no-op; on production it closes the gap.
 */
export default {
  async up(queryInterface) {
    const sql = queryInterface.sequelize;

    // ── indexes lost to the skip ──────────────────────────────────────────
    const addIndex = async (table, name, columns) => {
      const [[{ ok }]] = await sql.query(`
        SELECT (
          to_regclass('public.${table}') IS NOT NULL
          AND to_regclass('public.${name}') IS NULL
        ) AS ok;`);
      if (!ok) { console.log(`  ↷ ${name} already present (or ${table} absent)`); return; }
      await sql.query(`CREATE INDEX "${name}" ON "${table}" (${columns});`);
      console.log(`  ✓ created index ${name}`);
    };

    await addIndex('schools', 'schools_name', '"name"');
    await addIndex('schools', 'schools_is_active', '"isActive"');
    await addIndex('users', 'idx_users_school_id', '"schoolId"');

    // ── constraint names left behind by the same skip ─────────────────────
    // 20260506000000-add-cascade-rules renames each FK to fk_<table>_<column>.
    // On production these three kept their original sequelize names, so the two
    // schemas describe identical behaviour under different identifiers — which
    // is a real divergence the moment anything references one by name.
    const renameConstraint = async (table, from, to) => {
      const [[{ ok }]] = await sql.query(`
        SELECT (
          EXISTS (SELECT 1 FROM pg_constraint WHERE conname = '${from}')
          AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = '${to}')
        ) AS ok;`);
      if (!ok) { console.log(`  ↷ ${from} -> ${to} not applicable`); return; }
      await sql.query(`ALTER TABLE "${table}" RENAME CONSTRAINT "${from}" TO "${to}";`);
      console.log(`  ✓ renamed ${from} -> ${to}`);
    };

    await renameConstraint('parent_evaluations', 'parent_evaluations_parent_id_fkey', 'fk_parent_evaluations_parent_id');
    await renameConstraint('parent_evaluations', 'parent_evaluations_teacher_id_fkey', 'fk_parent_evaluations_teacher_id');
    await renameConstraint('parent_evaluations', 'parent_evaluations_school_id_fkey', 'fk_parent_evaluations_school_id');
  },

  async down() {
    // No-op. Dropping an index degrades production silently rather than loudly,
    // and renaming the constraints back would re-open the divergence this exists
    // to close.
    console.log('↩ reconcile-production-schema down is a deliberate no-op');
  },
};
