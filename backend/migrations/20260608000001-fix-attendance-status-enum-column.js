/**
 * Migration 20260606000001 created the new enum type but never completed the
 * ALTER COLUMN step. The column still uses enum_child_attendance_status_old
 * (values: present, absent, late, excused), blocking saves for sick/home_leave/
 * hospitalized.  This migration finishes the job.
 */

export async function up(queryInterface) {
  // Migrate any legacy values that slipped through (none expected in prod)
  await queryInterface.sequelize.query(
    `UPDATE child_attendance SET status = 'present'::text WHERE status = 'late'`,
  );
  await queryInterface.sequelize.query(
    `UPDATE child_attendance SET status = 'sick'::text WHERE status = 'excused'`,
  );

  // Swap the column to the new enum type
  await queryInterface.sequelize.query(`
    ALTER TABLE child_attendance
      ALTER COLUMN status TYPE "enum_child_attendance_status"
      USING status::text::"enum_child_attendance_status"
  `);

  // Drop the now-unused old type (ignore if already gone)
  await queryInterface.sequelize.query(
    `DROP TYPE IF EXISTS "enum_child_attendance_status_old"`,
  );
}

export async function down(queryInterface) {
  // Re-add old type
  await queryInterface.sequelize.query(
    `CREATE TYPE "enum_child_attendance_status_old" AS ENUM ('present', 'absent', 'late', 'excused')`,
  );
  // Map new values back (best-effort; sick→excused, others→absent)
  await queryInterface.sequelize.query(
    `UPDATE child_attendance SET status = 'excused'::text WHERE status = 'sick'`,
  );
  await queryInterface.sequelize.query(
    `UPDATE child_attendance SET status = 'absent'::text WHERE status IN ('home_leave', 'hospitalized')`,
  );
  await queryInterface.sequelize.query(`
    ALTER TABLE child_attendance
      ALTER COLUMN status TYPE "enum_child_attendance_status_old"
      USING status::text::"enum_child_attendance_status_old"
  `);
}
