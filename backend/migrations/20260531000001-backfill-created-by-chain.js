'use strict';

/** Backfill createdBy chain for seed data (PROD-READINESS S11).
 *
 * Seed (PROD-READINESS-02) created users directly without the admin→reception→
 * teacher/parent creation chain, leaving createdBy=null. This means the admin
 * portal shows empty reception and parent lists even though users exist.
 *
 * Fix:
 *  1. For each school: set reception.createdBy = that school's admin.id
 *  2. For each school: set teacher/parent.createdBy = that school's first reception.id
 *
 * Only updates rows where createdBy IS NULL to avoid overwriting intentionally set values.
 */
export async function up(queryInterface) {
  // Step 1: reception.createdBy = admin of same school
  await queryInterface.sequelize.query(`
    UPDATE users AS u
    SET "createdBy" = a.id
    FROM (
      SELECT id, "schoolId"
      FROM users
      WHERE role = 'admin'
        AND "deletedAt" IS NULL
        AND "schoolId" IS NOT NULL
    ) a
    WHERE u.role = 'reception'
      AND u."schoolId" = a."schoolId"
      AND u."createdBy" IS NULL
      AND u."deletedAt" IS NULL;
  `);

  // Step 2: teacher/parent.createdBy = first reception in same school
  await queryInterface.sequelize.query(`
    UPDATE users AS u
    SET "createdBy" = r.id
    FROM (
      SELECT DISTINCT ON ("schoolId") id, "schoolId"
      FROM users
      WHERE role = 'reception'
        AND "deletedAt" IS NULL
        AND "schoolId" IS NOT NULL
      ORDER BY "schoolId", "createdAt"
    ) r
    WHERE u.role IN ('teacher', 'parent')
      AND u."schoolId" = r."schoolId"
      AND u."createdBy" IS NULL
      AND u."deletedAt" IS NULL;
  `);
}

export async function down(queryInterface) {
  // Undo: clear createdBy for all roles that were seeded
  // (conservative: only clear if createdBy points to same-school admin/reception)
  await queryInterface.sequelize.query(`
    UPDATE users AS u
    SET "createdBy" = NULL
    FROM users creator
    WHERE u."createdBy" = creator.id
      AND creator."schoolId" = u."schoolId"
      AND u."deletedAt" IS NULL
      AND creator."deletedAt" IS NULL;
  `);
}
