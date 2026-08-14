import { safeAddIndex } from './_guards.js';
export async function up(queryInterface, Sequelize) {
  await queryInterface.addColumn('schools', 'region', {
    type: Sequelize.STRING(255),
    allowNull: true,
  });
  await queryInterface.addColumn('schools', 'city', {
    type: Sequelize.STRING(255),
    allowNull: true,
  });
  await queryInterface.addColumn('schools', 'director', {
    type: Sequelize.STRING(255),
    allowNull: true,
  });
  await safeAddIndex(queryInterface, 'schools', ['region'], { name: 'schools_region' });
  await safeAddIndex(queryInterface, 'schools', ['city'], { name: 'schools_city' });
}

export async function down(queryInterface) {
  await queryInterface.removeIndex('schools', 'schools_city');
  await queryInterface.removeIndex('schools', 'schools_region');
  await queryInterface.removeColumn('schools', 'director');
  await queryInterface.removeColumn('schools', 'city');
  await queryInterface.removeColumn('schools', 'region');
}
