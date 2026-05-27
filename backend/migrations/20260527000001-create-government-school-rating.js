export async function up(queryInterface, Sequelize) {
  await queryInterface.createTable('government_school_ratings', {
    id: {
      type: Sequelize.UUID,
      defaultValue: Sequelize.UUIDV4,
      primaryKey: true,
      allowNull: false,
    },
    schoolId: {
      type: Sequelize.UUID,
      allowNull: false,
      references: { model: 'schools', key: 'id' },
      onDelete: 'RESTRICT',
      onUpdate: 'CASCADE',
    },
    govUserId: {
      type: Sequelize.UUID,
      allowNull: true,
      references: { model: 'users', key: 'id' },
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE',
    },
    period: {
      type: Sequelize.STRING(20),
      allowNull: false,
    },
    stars: {
      type: Sequelize.INTEGER,
      allowNull: false,
    },
    indicators: {
      type: Sequelize.JSONB,
      allowNull: false,
    },
    comment: {
      type: Sequelize.TEXT,
      allowNull: false,
    },
    createdAt: {
      type: Sequelize.DATE,
      allowNull: false,
    },
    updatedAt: {
      type: Sequelize.DATE,
      allowNull: false,
    },
    deletedAt: {
      type: Sequelize.DATE,
      allowNull: true,
    },
  });

  await queryInterface.addIndex('government_school_ratings', ['schoolId'], { name: 'idx_gov_school_ratings_school' });
  await queryInterface.addIndex('government_school_ratings', ['govUserId'], { name: 'idx_gov_school_ratings_gov_user' });
  // Partial unique: one non-deleted rating per gov user per school per period.
  await queryInterface.addIndex('government_school_ratings', ['schoolId', 'govUserId', 'period'], {
    unique: true,
    name: 'idx_gov_school_ratings_unique_active',
    where: { deletedAt: null },
  });
}

export async function down(queryInterface) {
  await queryInterface.dropTable('government_school_ratings');
}
