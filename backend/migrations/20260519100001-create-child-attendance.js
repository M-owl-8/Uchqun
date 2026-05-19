export async function up(queryInterface, Sequelize) {
  // Create status enum type first (Postgres requires it before the column)
  await queryInterface.sequelize.query(
    `CREATE TYPE "enum_child_attendance_status" AS ENUM ('present', 'absent', 'late', 'excused');`
  ).catch(() => {}); // ignore if already exists

  await queryInterface.createTable('child_attendance', {
    id: {
      type: Sequelize.UUID,
      defaultValue: Sequelize.literal('gen_random_uuid()'),
      primaryKey: true,
    },
    childId: {
      type: Sequelize.UUID,
      allowNull: true,
      references: { model: 'children', key: 'id' },
      onDelete: 'SET NULL',
    },
    teacherId: {
      type: Sequelize.UUID,
      allowNull: true,
      references: { model: 'users', key: 'id' },
      onDelete: 'SET NULL',
    },
    schoolId: {
      type: Sequelize.UUID,
      allowNull: false,
      references: { model: 'schools', key: 'id' },
      onDelete: 'RESTRICT',
    },
    date: {
      type: Sequelize.DATEONLY,
      allowNull: false,
    },
    status: {
      type: Sequelize.ENUM('present', 'absent', 'late', 'excused'),
      allowNull: false,
    },
    note: {
      type: Sequelize.TEXT,
      allowNull: true,
    },
    markedBy: {
      type: Sequelize.UUID,
      allowNull: true,
      references: { model: 'users', key: 'id' },
      onDelete: 'SET NULL',
    },
    childSnapshot: {
      type: Sequelize.JSONB,
      allowNull: false,
      defaultValue: {},
    },
    createdAt: {
      type: Sequelize.DATE,
      allowNull: false,
    },
    updatedAt: {
      type: Sequelize.DATE,
      allowNull: false,
    },
    deletedAt: {
      type: Sequelize.DATE,
      allowNull: true,
    },
  });

  await queryInterface.addIndex('child_attendance', ['childId', 'date'], {
    name: 'child_attendance_child_date_unique',
    unique: true,
    where: { deletedAt: null },
  });
  await queryInterface.addIndex('child_attendance', ['schoolId', 'date'], {
    name: 'child_attendance_school_date_idx',
  });
  await queryInterface.addIndex('child_attendance', ['teacherId'], {
    name: 'child_attendance_teacher_id_idx',
  });
}

export async function down(queryInterface) {
  await queryInterface.dropTable('child_attendance');
  await queryInterface.sequelize.query(
    `DROP TYPE IF EXISTS "enum_child_attendance_status";`
  ).catch(() => {});
}
