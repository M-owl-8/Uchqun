/**
 * D-65, column level — the same defect one layer down.
 *
 * 20260401000009 covered seven TABLES that only ever existed because sync()
 * made them. The rebuild then failed again, at
 * 20260523100000-backfill-child-schoolid.js:
 *
 *     error: column c.schoolId does not exist
 *
 * `children.schoolId` and `children.groupId` are not created by ANY migration.
 * Not by 20240101000000-initial-schema (which creates `children` with a free-text
 * `school` column and no scoping columns at all), not by
 * 20260401000000-expand-child-profile (which adds the parent/medical fields via
 * a loop), not by anything. They exist on production only because sync() added
 * them.
 *
 * These are not incidental columns. `children.schoolId` is the tenant boundary
 * for every child on the platform — it is what validateChildAccess compares
 * against, and it is the column D-47, D-53, D-54 and D-61…D-64 are all about.
 * The migration set could not produce the column that the entire multi-tenant
 * safety model depends on.
 *
 * Types, defaults and nullability read from the live production schema. Every
 * addition is guarded, so on production this is a no-op.
 *
 * Only columns that NO migration creates are listed. Columns a later migration
 * owns — users.schoolId, users.status, users.govLevel, users.rating,
 * users.mustChangePassword, users.privacyConsentedAt, and the
 * expand-child-profile set — are deliberately left to those migrations. Adding
 * them here would make them fail with "column already exists", which is exactly
 * the mistake the first version of 20260401000009 made with six columns.
 */
export default {
  async up(queryInterface) {
    const sql = queryInterface.sequelize;

    const addColumn = async (table, column, ddl) => {
      const [[{ present }]] = await sql.query(`
        SELECT (
          to_regclass('public.${table}') IS NOT NULL
          AND EXISTS (SELECT 1 FROM information_schema.columns
                      WHERE table_schema = current_schema()
                        AND table_name = '${table}' AND column_name = '${column}')
        ) AS present;`);
      if (present) { console.log(`  ↷ ${table}.${column} already present`); return; }
      await sql.query(`ALTER TABLE "${table}" ADD COLUMN "${column}" ${ddl};`);
      console.log(`  ✓ added ${table}.${column}`);
    };

    // The tenant boundary for every child on the platform.
    await addColumn('children', 'schoolId', 'uuid');
    await addColumn('children', 'groupId', 'uuid');
    await addColumn('children', 'deletedAt', 'timestamp');

    // `users` is worse: EIGHT columns have no creating migration, and they are
    // not peripheral. isActive and documentsApproved ARE the reception access
    // gate (CLAUDE.md); teacherId binds a parent to a teacher; createdBy is the
    // ownership chain the document approve/reject boundary checks. Verified
    // individually: no addColumn for any of them, and none appear in the
    // initial-schema createTable('users') block.
    await addColumn('users', 'isVerified', 'boolean NOT NULL DEFAULT false');
    await addColumn('users', 'documentsApproved', 'boolean NOT NULL DEFAULT false');
    await addColumn('users', 'isActive', 'boolean NOT NULL DEFAULT false');
    await addColumn('users', 'groupId', 'uuid');
    await addColumn('users', 'teacherId', 'uuid');
    await addColumn('users', 'isSuperAdmin', 'boolean DEFAULT false');
    await addColumn('users', 'deletedAt', 'timestamp');
    await addColumn('users', 'createdBy', 'uuid');
  },

  async down() {
    // No-op. Dropping children.schoolId would detach every child from its school
    // and silently disable the tenant boundary rather than raising an error.
    console.log('↩ D-65 column down is a deliberate no-op');
  },
};
