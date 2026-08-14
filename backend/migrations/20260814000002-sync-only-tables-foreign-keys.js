/**
 * D-65, part two — the foreign keys for the seven sync-only tables.
 *
 * 20260401000009 creates the tables but no constraints, because it has to run
 * before 20260401000010 (which needs `groups` to exist) while `schools` is not
 * created until 20260117100000 and `regions` not until 20260521100000. Adding
 * the keys there would fail on a fresh database for the same class of reason
 * the rebuild failed in the first place.
 *
 * This runs last, when every referenced table certainly exists. Each constraint
 * is added only if it is absent and only if its target table is present, so on
 * production — where all of these already exist — it is a no-op, and on a fresh
 * database it completes the schema.
 *
 * Definitions copied from the live production constraints via pg_constraint, so
 * the ON DELETE / ON UPDATE behaviour of a rebuilt database matches the one
 * running today rather than a plausible guess.
 */
const FKS = [
  // table, constraint name, column, target table, target column, clause
  ['groups', 'groups_teacherId_fkey', 'teacherId', 'users', 'id', ''],
  ['groups', 'groups_schoolId_fkey', 'schoolId', 'schools', 'id', 'ON DELETE SET NULL'],

  ['notifications', 'notifications_userId_fkey', 'userId', 'users', 'id', 'ON DELETE CASCADE'],
  ['notifications', 'notifications_childId_fkey', 'childId', 'children', 'id', 'ON DELETE CASCADE'],
  ['notifications', 'notifications_schoolId_fkey', 'schoolId', 'schools', 'id', 'ON UPDATE CASCADE ON DELETE SET NULL'],

  ['ai_warnings', 'ai_warnings_schoolId_fkey', 'schoolId', 'schools', 'id', ''],
  ['ai_warnings', 'ai_warnings_parentId_fkey', 'parentId', 'users', 'id', ''],
  ['ai_warnings', 'ai_warnings_resolvedBy_fkey', 'resolvedBy', 'users', 'id', ''],

  ['business_stats', 'business_stats_businessId_fkey', 'businessId', 'users', 'id', ''],

  ['government_messages', 'super_admin_messages_senderId_fkey', 'senderId', 'users', 'id', 'ON UPDATE CASCADE ON DELETE CASCADE'],
  ['government_messages', 'government_messages_parentMessageId_fkey', 'parentMessageId', 'government_messages', 'id', 'ON UPDATE CASCADE ON DELETE SET NULL'],
  ['government_messages', 'government_messages_escalatedFromId_fkey', 'escalatedFromId', 'government_messages', 'id', 'ON UPDATE CASCADE ON DELETE SET NULL'],

  ['government_stats', 'government_stats_schoolId_fkey', 'schoolId', 'schools', 'id', 'ON UPDATE CASCADE ON DELETE SET NULL'],
  ['government_stats', 'government_stats_regionId_fkey', 'regionId', 'regions', 'id', 'ON DELETE SET NULL'],
  ['government_stats', 'government_stats_generatedBy_fkey', 'generatedBy', 'users', 'id', 'ON UPDATE CASCADE ON DELETE SET NULL'],

  ['news', 'fk_news_createdById', 'createdById', 'users', 'id', 'ON UPDATE CASCADE ON DELETE SET NULL'],
  ['news', 'news_schoolId_fkey', 'schoolId', 'schools', 'id', 'ON UPDATE CASCADE ON DELETE SET NULL'],
];

export default {
  async up(queryInterface) {
    const sql = queryInterface.sequelize;
    let added = 0;
    let skipped = 0;

    for (const [table, name, column, target, targetCol, clause] of FKS) {
      const [[{ ok }]] = await sql.query(`
        SELECT (
          to_regclass('public.${table}') IS NOT NULL
          AND to_regclass('public.${target}') IS NOT NULL
          AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = '${name}')
        ) AS ok;`);

      if (!ok) { skipped++; continue; }

      await sql.query(`
        ALTER TABLE "${table}"
        ADD CONSTRAINT "${name}"
        FOREIGN KEY ("${column}") REFERENCES "${target}"("${targetCol}") ${clause};`);
      added++;
    }

    console.log(`✓ D-65 foreign keys: ${added} added, ${skipped} already present or not applicable`);
  },

  async down() {
    // No-op, for the same reason as 20260401000009: dropping these constraints
    // on a live database would silently permit orphaned rows against a child's
    // records. Reverting is not a safe automatic operation here.
    console.log('↩ D-65 foreign-key down is a deliberate no-op');
  },
};
