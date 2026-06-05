export async function up(queryInterface) {
  // Step 1: rename the old enum type
  await queryInterface.sequelize.query(
    `ALTER TYPE "enum_child_attendance_status" RENAME TO "enum_child_attendance_status_old"`,
  );

  // Step 2: create new enum with care-institution presence statuses
  await queryInterface.sequelize.query(
    `CREATE TYPE "enum_child_attendance_status" AS ENUM ('present', 'absent', 'home_leave', 'sick', 'hospitalized')`,
  );

  // Step 3: migrate existing data before altering the column
  // late (arrived late, still present) → present
  await queryInterface.sequelize.query(
    `UPDATE child_attendance SET status = 'present' WHERE status = 'late'`,
  );
  // excused (excused absence) → sick (closest care-model equivalent)
  await queryInterface.sequelize.query(
    `UPDATE child_attendance SET status = 'sick' WHERE status = 'excused'`,
  );

  // Step 4: alter the column to use the new type
  await queryInterface.sequelize.query(
    `ALTER TABLE child_attendance
       ALTER COLUMN status TYPE "enum_child_attendance_status"
       USING status::text::"enum_child_attendance_status"`,
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
