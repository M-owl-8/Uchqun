// H2V-01: rename camelCase deletedAt → deleted_at so underscored:true models work
// L2V-04: rebuild service_plans unique index as partial (exclude soft-deleted rows)
export const up = async (queryInterface) => {
  await queryInterface.sequelize.query(
    `ALTER TABLE service_plans RENAME COLUMN "deletedAt" TO deleted_at`
  );
  await queryInterface.sequelize.query(
    `ALTER TABLE meal_plans RENAME COLUMN "deletedAt" TO deleted_at`
  );

  // Rebuild unique index to exclude soft-deleted rows
  await queryInterface.sequelize.query(
    `DROP INDEX IF EXISTS service_plans_child_year_service_unique`
  );
  await queryInterface.sequelize.query(
    `CREATE UNIQUE INDEX service_plans_child_year_service_unique
     ON service_plans (child_id, year, service_type)
     WHERE deleted_at IS NULL`
  );
};

export const down = async (queryInterface) => {
  await queryInterface.sequelize.query(
    `DROP INDEX IF EXISTS service_plans_child_year_service_unique`
  );
  await queryInterface.sequelize.query(
    `CREATE UNIQUE INDEX service_plans_child_year_service_unique
     ON service_plans (child_id, year, service_type)`
  );

  await queryInterface.sequelize.query(
    `ALTER TABLE service_plans RENAME COLUMN deleted_at TO "deletedAt"`
  );
  await queryInterface.sequelize.query(
    `ALTER TABLE meal_plans RENAME COLUMN deleted_at TO "deletedAt"`
  );
};
