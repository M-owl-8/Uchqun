/**
 * Migration: Enforce proper ON DELETE rules on all foreign keys.
 *
 * Strategy: find existing FK constraint by table+column via information_schema,
 * drop it, re-add with the correct cascade action.
 */

async function alterFk(queryInterface, table, column, refTable, refColumn, onDelete, setNullable = false) {
  // Find existing FK constraint name
  const [rows] = await queryInterface.sequelize.query(`
    SELECT tc.constraint_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    WHERE tc.table_name = '${table}'
      AND tc.constraint_type = 'FOREIGN KEY'
      AND kcu.column_name = '${column}'
      AND tc.table_schema = current_schema()
  `);

  for (const row of rows) {
    await queryInterface.sequelize.query(
      `ALTER TABLE "${table}" DROP CONSTRAINT IF EXISTS "${row.constraint_name}"`
    );
  }

  // Optionally make the column nullable (required for SET NULL actions)
  if (setNullable) {
    await queryInterface.sequelize.query(
      `ALTER TABLE "${table}" ALTER COLUMN "${column}" DROP NOT NULL`
    );
  }

  const constraintName = `fk_${table}_${column}`;
  await queryInterface.sequelize.query(`
    ALTER TABLE "${table}"
    ADD CONSTRAINT "${constraintName}"
    FOREIGN KEY ("${column}") REFERENCES "${refTable}"("${refColumn}")
    ON DELETE ${onDelete} ON UPDATE CASCADE
  `);
}

export async function up(queryInterface) {
  await alterFk(queryInterface, 'activities',           'childId',    'children', 'id', 'CASCADE');
  await alterFk(queryInterface, 'meals',                'childId',    'children', 'id', 'CASCADE');
  await alterFk(queryInterface, 'media',                'childId',    'children', 'id', 'CASCADE');
  await alterFk(queryInterface, 'media',                'activityId', 'activities', 'id', 'SET NULL');
  await alterFk(queryInterface, 'progress',             'childId',    'children', 'id', 'CASCADE');
  await alterFk(queryInterface, 'payments',             'parentId',   'users',    'id', 'RESTRICT');
  await alterFk(queryInterface, 'payments',             'childId',    'children', 'id', 'SET NULL');
  await alterFk(queryInterface, 'payments',             'schoolId',   'schools',  'id', 'SET NULL');
  await alterFk(queryInterface, 'refresh_tokens',       'user_id',    'users',    'id', 'CASCADE');
  await alterFk(queryInterface, 'therapies',            'createdBy',  'users',    'id', 'SET NULL');
  await alterFk(queryInterface, 'therapy_usages',       'therapyId',  'therapies','id', 'CASCADE');
  await alterFk(queryInterface, 'therapy_usages',       'childId',    'children', 'id', 'CASCADE');
  await alterFk(queryInterface, 'therapy_usages',       'parentId',   'users',    'id', 'RESTRICT');
  await alterFk(queryInterface, 'therapy_usages',       'teacherId',  'users',    'id', 'SET NULL');
  await alterFk(queryInterface, 'school_ratings',       'schoolId',   'schools',  'id', 'CASCADE');
  await alterFk(queryInterface, 'school_ratings',       'parentId',   'users',    'id', 'CASCADE');
  await alterFk(queryInterface, 'teacher_ratings',      'teacherId',  'users',    'id', 'CASCADE');
  await alterFk(queryInterface, 'teacher_ratings',      'parentId',   'users',    'id', 'CASCADE');
  await alterFk(queryInterface, 'chat_messages',        'sender_id',  'users',    'id', 'CASCADE');
  // senderId on super_admin_messages → SET NULL (make column nullable first)
  await alterFk(queryInterface, 'super_admin_messages', 'senderId',   'users',    'id', 'SET NULL', true);
  await alterFk(queryInterface, 'teacher_resources',    'teacherId',  'users',    'id', 'CASCADE');
  await alterFk(queryInterface, 'teacher_resources',    'schoolId',   'schools',  'id', 'SET NULL');
  await alterFk(queryInterface, 'parent_evaluations',   'parent_id',  'users',    'id', 'CASCADE');
  await alterFk(queryInterface, 'parent_evaluations',   'teacher_id', 'users',    'id', 'SET NULL');
  await alterFk(queryInterface, 'parent_evaluations',   'school_id',  'schools',  'id', 'SET NULL');
  await alterFk(queryInterface, 'news',                 'createdById','users',    'id', 'RESTRICT');
}

export async function down() {
  // Cascade changes are hard to reverse automatically.
  // To revert: restore original FKs without cascade rules using a manual migration.
}
