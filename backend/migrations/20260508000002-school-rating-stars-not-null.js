/**
 * M-06: SchoolRating.stars had allowNull: true despite no code path ever
 * creating a rating without stars. Delete any null-star orphans, then add
 * the NOT NULL constraint.
 */

export async function up(queryInterface, Sequelize) {
  // Remove any orphaned rows that have no stars (shouldn't exist in prod)
  await queryInterface.sequelize.query(
    `DELETE FROM school_ratings WHERE stars IS NULL AND "deletedAt" IS NULL`
  );

  await queryInterface.changeColumn('school_ratings', 'stars', {
    type: Sequelize.INTEGER,
    allowNull: false,
  });
}

export async function down(queryInterface, Sequelize) {
  await queryInterface.changeColumn('school_ratings', 'stars', {
    type: Sequelize.INTEGER,
    allowNull: true,
  });
}
