/**
 * Migration: Add deletedAt column (soft delete / paranoid mode) to models
 * that need it beyond users and children (already covered by 20260330000001).
 */

const tables = [
  'activities',
  'meals',
  'media',
  'payments',
  'therapies',
  'therapy_usages',
  'service_plans',
  'meal_plans',
  'teacher_ratings',
  'school_ratings',
];

export async function up(queryInterface, Sequelize) {
  for (const table of tables) {
    try {
      await queryInterface.addColumn(table, 'deletedAt', {
        type: Sequelize.DATE,
        allowNull: true,
        defaultValue: null,
      });
    } catch (err) {
      if (err.message && err.message.includes('already exists')) {
        // Already added — skip
      } else {
        throw err;
      }
    }
  }
}

export async function down(queryInterface) {
  for (const table of tables) {
    try {
      await queryInterface.removeColumn(table, 'deletedAt');
    } catch {
      // ignore
    }
  }
}
