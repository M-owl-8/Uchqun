/**
 * Migration 20260606000001 created the new enum type but never completed the
 * ALTER COLUMN step. It crashed trying to SET status='sick' on a column still
 * typed as enum_child_attendance_status_old (which only has present/absent/
 * late/excused). This migration completes the column swap using a CASE expression
 * in the USING clause to remap legacy values atomically in one statement.
 *
 * DEF-011 amendment (S24, 2026-06-11): the original CASE mapped excused→sick,
 * which is semantically wrong — 'excused' is a permission-based absence, not a
 * medical state. Corrected here to excused→absent. Safe to edit because every
 * applied environment (production) has this migration completed in
 * SequelizeMeta and never re-runs it; production data produced by the old
 * mapping is corrected by 20260611000001-def011-excused-remap-correction.js.
 * Fresh environments now get the correct mapping directly. down() likewise
 * maps all post-enum medical/care states to old-enum 'absent' instead of
 * inventing an 'excused' permission that was never granted.
 */

export async function up(queryInterface) {
  await queryInterface.sequelize.query(`
    ALTER TABLE child_attendance
      ALTER COLUMN status TYPE "enum_child_attendance_status"
      USING CASE status::text
        WHEN 'late'    THEN 'present'::"enum_child_attendance_status"
        WHEN 'excused' THEN 'absent'::"enum_child_attendance_status"
        ELSE status::text::"enum_child_attendance_status"
      END
  `);

  await queryInterface.sequelize.query(
    `DROP TYPE IF EXISTS "enum_child_attendance_status_old"`,
  );
}

export async function down(queryInterface) {
  await queryInterface.sequelize.query(
    `CREATE TYPE "enum_child_attendance_status_old" AS ENUM ('present', 'absent', 'late', 'excused')`,
  );
  await queryInterface.sequelize.query(
    `UPDATE child_attendance SET status = 'absent' WHERE status::text IN ('sick', 'home_leave', 'hospitalized')`,
  );
  await queryInterface.sequelize.query(`
    ALTER TABLE child_attendance
      ALTER COLUMN status TYPE "enum_child_attendance_status_old"
      USING status::text::"enum_child_attendance_status_old"
  `);
}
