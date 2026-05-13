// #03-002 — meal_plans.meal_type enum labels normalized to TitleCase to match meals table.
// RENAME VALUE must happen BEFORE any UPDATE, because PostgreSQL rejects the new label as
// invalid input until the enum itself is updated. After RENAME, stored row values follow
// automatically — no separate UPDATE is required.
export async function up(queryInterface) {
  await queryInterface.sequelize.query(`ALTER TYPE "enum_meal_plans_meal_type" RENAME VALUE 'breakfast' TO 'Breakfast'`).catch(() => {});
  await queryInterface.sequelize.query(`ALTER TYPE "enum_meal_plans_meal_type" RENAME VALUE 'lunch' TO 'Lunch'`).catch(() => {});
  await queryInterface.sequelize.query(`ALTER TYPE "enum_meal_plans_meal_type" RENAME VALUE 'snack' TO 'Snack'`).catch(() => {});
  await queryInterface.sequelize.query(`ALTER TYPE "enum_meal_plans_meal_type" RENAME VALUE 'dinner' TO 'Dinner'`).catch(() => {});
}

export async function down(queryInterface) {
  await queryInterface.sequelize.query(`ALTER TYPE "enum_meal_plans_meal_type" RENAME VALUE 'Breakfast' TO 'breakfast'`).catch(() => {});
  await queryInterface.sequelize.query(`ALTER TYPE "enum_meal_plans_meal_type" RENAME VALUE 'Lunch' TO 'lunch'`).catch(() => {});
  await queryInterface.sequelize.query(`ALTER TYPE "enum_meal_plans_meal_type" RENAME VALUE 'Snack' TO 'snack'`).catch(() => {});
  await queryInterface.sequelize.query(`ALTER TYPE "enum_meal_plans_meal_type" RENAME VALUE 'Dinner' TO 'dinner'`).catch(() => {});
}
