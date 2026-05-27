// CP-020: add indicators JSONB column + tighten comment to NOT NULL.
// Existing rows:
//   - indicators: left null (legacy data — old submissions had no indicator structure).
//   - comment: backfilled with '—' placeholder for any existing null rows before NOT NULL.
export async function up(queryInterface, Sequelize) {
  await queryInterface.addColumn('school_ratings', 'indicators', {
    type: Sequelize.JSONB,
    allowNull: true,
  });

  await queryInterface.sequelize.query(
    "UPDATE school_ratings SET comment = '—' WHERE comment IS NULL AND \"deletedAt\" IS NULL"
  );

  await queryInterface.changeColumn('school_ratings', 'comment', {
    type: Sequelize.TEXT,
    allowNull: false,
    defaultValue: null,
  });
}

export async function down(queryInterface, Sequelize) {
  await queryInterface.changeColumn('school_ratings', 'comment', {
    type: Sequelize.TEXT,
    allowNull: true,
  });

  await queryInterface.removeColumn('school_ratings', 'indicators');
}
