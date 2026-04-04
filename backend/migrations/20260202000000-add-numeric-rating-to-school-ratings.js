export async function up(queryInterface, Sequelize) {
  // Add numericRating field to school_ratings table if it doesn't exist
  try {
    await queryInterface.addColumn('school_ratings', 'numericRating', {
      type: Sequelize.INTEGER,
      allowNull: true,
    });
    console.log('✓ Added numericRating column to school_ratings table');
  } catch (error) {
    // Column might already exist, ignore error
    if (!error.message.includes('already exists') && !error.message.includes('duplicate column') && !error.message.includes('does not exist')) {
      console.warn('Could not add numericRating column:', error.message);
      throw error;
    } else {
      console.log('ℹ numericRating column already exists, skipping');
    }
  }
}

export async function down(queryInterface) {
  // Remove numericRating field from school_ratings table
  try {
    await queryInterface.removeColumn('school_ratings', 'numericRating');
    console.log('✓ Removed numericRating column from school_ratings table');
  } catch (error) {
    // Column might not exist, ignore error
    if (!error.message.includes('does not exist') && !error.message.includes('column') && !error.message.includes('not found')) {
      console.warn('Could not remove numericRating column:', error.message);
      throw error;
    } else {
      console.log('ℹ numericRating column does not exist, skipping');
    }
  }
}
