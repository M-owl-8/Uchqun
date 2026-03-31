export async function up(queryInterface, Sequelize) {
  const columns = {
    medicalDiagnosis: { type: Sequelize.STRING(500), allowNull: true },
    institutionStartDate: { type: Sequelize.DATEONLY, allowNull: true },
    fatherFullName: { type: Sequelize.STRING(255), allowNull: true },
    fatherDOB: { type: Sequelize.DATEONLY, allowNull: true },
    fatherOccupation: { type: Sequelize.STRING(255), allowNull: true },
    motherFullName: { type: Sequelize.STRING(255), allowNull: true },
    motherDOB: { type: Sequelize.DATEONLY, allowNull: true },
    motherOccupation: { type: Sequelize.STRING(255), allowNull: true },
    address: { type: Sequelize.TEXT, allowNull: true },
    contactPhone: { type: Sequelize.STRING(50), allowNull: true },
    childDescription: { type: Sequelize.TEXT, allowNull: true },
    expectedOutcomes: { type: Sequelize.TEXT, allowNull: true },
  };

  for (const [name, definition] of Object.entries(columns)) {
    try {
      await queryInterface.addColumn('children', name, definition);
    } catch (err) {
      if (err.message && err.message.includes('already exists')) continue;
      throw err;
    }
  }
}

export async function down(queryInterface) {
  const columns = ['medicalDiagnosis', 'institutionStartDate', 'fatherFullName', 'fatherDOB', 'fatherOccupation', 'motherFullName', 'motherDOB', 'motherOccupation', 'address', 'contactPhone', 'childDescription', 'expectedOutcomes'];
  for (const col of columns) {
    try { await queryInterface.removeColumn('children', col); } catch (_e) { /* ignore if column doesn't exist */ }
  }
}
