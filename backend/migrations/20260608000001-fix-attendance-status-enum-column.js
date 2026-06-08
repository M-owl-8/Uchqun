/**
 * Migration 20260606000001 created the new enum type but never completed the
 * ALTER COLUMN step. It crashed trying to SET status='sick' on a column still
 * typed as enum_child_attendance_status_old (which only has present/absent/
 * late/excused). This migration completes the column swap using a CASE expression
 * in the USING clause to remap legacy values atomically in one statement.
 */

export async function up(queryInterface) {
  await queryInterface.sequelize.query(`
    ALTER TABLE child_attendance
      ALTER COLUMN status TYPE "enum_child_attendance_status"
      USING CASE status::text
        WHEN 'late'    THEN 'present'::"enum_child_attendance_status"
        WHEN 'excused' THEN 'sick'::"enum_child_attendance_status"
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
    `UPDATE child_attendance SET status = 'excused' WHERE status::text = 'sick'`,
  );
  await queryInterface.sequelize.query(
    `UPDATE child_attendance SET status = 'absent' WHERE status::text IN ('home_leave', 'hospitalized')`,
  );
  await queryInterface.sequelize.query(`
    ALTER TABLE child_attendance
      ALTER COLUMN status TYPE "enum_child_attendance_status_old"
      USING status::text::"enum_child_attendance_status_old"
  `);
}
