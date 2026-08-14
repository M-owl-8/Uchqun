export async function up(queryInterface) {
  // Step 1: rename the old enum type
  await queryInterface.sequelize.query(
    `ALTER TYPE "enum_child_attendance_status" RENAME TO "enum_child_attendance_status_old"`,
  );

  // Step 2: create new enum with care-institution presence statuses
  await queryInterface.sequelize.query(
    `CREATE TYPE "enum_child_attendance_status" AS ENUM ('present', 'absent', 'home_leave', 'sick', 'hospitalized')`,
  );

  // Steps 3+4 combined. D-65: the original did the remap as UPDATEs BEFORE the
  // type change, which cannot work — at that point the column still has the OLD
  // type, and 'sick' is not one of its values, so
  //   UPDATE child_attendance SET status = 'sick' WHERE status = 'excused'
  // fails with `invalid input value for enum enum_child_attendance_status_old:
  // "sick"`. Postgres rejects the literal on the way in; it never gets as far as
  // matching rows. (On an empty database there are no rows to remap at all, and
  // it still fails — the error is about the literal, not the data.)
  //
  // Mapping inside the USING clause converts and remaps in one atomic step, so
  // every value is only ever written as a member of the type it is being written
  // to. Same result on production, where the old values exist; correct on a
  // fresh database, where they do not.
  await queryInterface.sequelize.query(
    `ALTER TABLE child_attendance
       ALTER COLUMN status TYPE "enum_child_attendance_status"
       USING (
         CASE status::text
           WHEN 'late'    THEN 'present'
           WHEN 'excused' THEN 'sick'
           ELSE status::text
         END
       )::"enum_child_attendance_status"`,
  );

  // Step 5: drop old enum
  await queryInterface.sequelize.query(
    `DROP TYPE "enum_child_attendance_status_old"`,
  );
}

export async function down(queryInterface) {
  await queryInterface.sequelize.query(
    `ALTER TYPE "enum_child_attendance_status" RENAME TO "enum_child_attendance_status_old"`,
  );
  await queryInterface.sequelize.query(
    `CREATE TYPE "enum_child_attendance_status" AS ENUM ('present', 'absent', 'late', 'excused')`,
  );
  // sick → excused (best-effort reverse; late→present is unrecoverable)
  await queryInterface.sequelize.query(
    `UPDATE child_attendance SET status = 'excused' WHERE status = 'sick'`,
  );
  // home_leave, hospitalized have no equivalent → map to absent
  await queryInterface.sequelize.query(
    `UPDATE child_attendance SET status = 'absent' WHERE status IN ('home_leave', 'hospitalized')`,
  );
  await queryInterface.sequelize.query(
    `ALTER TABLE child_attendance
       ALTER COLUMN status TYPE "enum_child_attendance_status"
       USING status::text::"enum_child_attendance_status"`,
  );
  await queryInterface.sequelize.query(
    `DROP TYPE "enum_child_attendance_status_old"`,
  );
}
