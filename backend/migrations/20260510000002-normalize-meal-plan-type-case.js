// #03-002 — meal_plans.meal_type uses lowercase values; normalize to TitleCase matching meals table
export async function up(queryInterface) {
  const map = { breakfast: 'Breakfast', lunch: 'Lunch', snack: 'Snack', dinner: 'Dinner' };
  for (const [lower, title] of Object.entries(map)) {
    await queryInterface.sequelize.query(
      `UPDATE meal_plans SET meal_type = '${title}' WHERE meal_type = '${lower}'`
    );
  }
  // Rename the enum type values (Postgres requires renaming via ALTER TYPE)
  await queryInterface.sequelize.query(`ALTER TYPE "enum_meal_plans_meal_type" RENAME VALUE 'breakfast' TO 'Breakfast'`).catch(() => {});
  await queryInterface.sequelize.query(`ALTER TYPE "enum_meal_plans_meal_type" RENAME VALUE 'lunch' TO 'Lunch'`).catch(() => {});
  await queryInterface.sequelize.query(`ALTER TYPE "enum_meal_plans_meal_type" RENAME VALUE 'snack' TO 'Snack'`).catch(() => {});
  await queryInterface.sequelize.query(`ALTER TYPE "enum_meal_plans_meal_type" RENAME VALUE 'dinner' TO 'Dinner'`).catch(() => {});
}

export async function down(queryInterface) {
  const map = { Breakfast: 'breakfast', Lunch: 'lunch', Snack: 'snack', Dinner: 'dinner' };
  for (const [title, lower] of Object.entries(map)) {
    await queryInterface.sequelize.query(
      `UPDATE meal_plans SET meal_type = '${lower}' WHERE meal_type = '${title}'`
    );
  }
  await queryInterface.sequelize.query(`ALTER TYPE "enum_meal_plans_meal_type" RENAME VALUE 'Breakfast' TO 'breakfast'`).catch(() => {});
  await queryInterface.sequelize.query(`ALTER TYPE "enum_meal_plans_meal_type" RENAME VALUE 'Lunch' TO 'lunch'`).catch(() => {});
  await queryInterface.sequelize.query(`ALTER TYPE "enum_meal_plans_meal_type" RENAME VALUE 'Snack' TO 'snack'`).catch(() => {});
  await queryInterface.sequelize.query(`ALTER TYPE "enum_meal_plans_meal_type" RENAME VALUE 'Dinner' TO 'dinner'`).catch(() => {});
}
