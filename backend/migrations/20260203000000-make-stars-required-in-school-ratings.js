export async function up(queryInterface, Sequelize) {
  // Make stars field NOT NULL in school_ratings table
  try {
    // First, update any NULL stars to a default value (e.g., 3) if any exist
    await queryInterface.sequelize.query(`
      UPDATE school_ratings 
      SET stars = 3 
      WHERE stars IS NULL;
    `);
    
    // Then alter the column to be NOT NULL
    await queryInterface.changeColumn('school_ratings', 'stars', {
      type: Sequelize.INTEGER,
      allowNull: false,
    });
    
    console.log('✓ Made stars column NOT NULL in school_ratings table');
  } catch (error) {
    // Column might already be NOT NULL, ignore error
    if (!error.message.includes('already') && !error.message.includes('does not exist')) {
      console.warn('Could not alter stars column:', error.message);
      throw error;
    } else {
      console.log('ℹ stars column already NOT NULL, skipping');
    }
  }
}

export async function down(queryInterface, Sequelize) {
  // Revert stars field to allow NULL
  try {
    await queryInterface.changeColumn('school_ratings', 'stars', {
      type: Sequelize.INTEGER,
      allowNull: true,
    });
    console.log('✓ Reverted stars column to allow NULL in school_ratings table');
  } catch (error) {
    // Column might not exist, ignore error
    if (!error.message.includes('does not exist')) {
      console.warn('Could not revert stars column:', error.message);
      throw error;
    } else {
      console.log('ℹ stars column does not exist, skipping');
    }
  }
}
