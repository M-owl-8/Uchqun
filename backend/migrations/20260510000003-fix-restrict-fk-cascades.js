// #03-007 therapy_usages.parentId RESTRICT → CASCADE (parent deletion removes their usage records)
// #03-008 news.createdById RESTRICT → SET NULL (keep news, clear author reference)
async function changeFk(queryInterface, table, column, refTable, refColumn, onDelete, nullable = false) {
  const [rows] = await queryInterface.sequelize.query(`
    SELECT tc.constraint_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
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
  if (nullable) {
    await queryInterface.sequelize.query(
      `ALTER TABLE "${table}" ALTER COLUMN "${column}" DROP NOT NULL`
    );
  }
  await queryInterface.sequelize.query(`
    ALTER TABLE "${table}"
    ADD CONSTRAINT "fk_${table}_${column}"
    FOREIGN KEY ("${column}") REFERENCES "${refTable}"("${refColumn}")
    ON DELETE ${onDelete} ON UPDATE CASCADE
  `);
}

export async function up(queryInterface) {
  await changeFk(queryInterface, 'therapy_usages', 'parentId', 'users', 'id', 'CASCADE');
  await changeFk(queryInterface, 'news', 'createdById', 'users', 'id', 'SET NULL', true);
}

export async function down(queryInterface) {
  await changeFk(queryInterface, 'therapy_usages', 'parentId', 'users', 'id', 'RESTRICT');
  await changeFk(queryInterface, 'news', 'createdById', 'users', 'id', 'RESTRICT');
}
