export async function up(queryInterface, Sequelize) {
  await queryInterface.createTable('import_jobs', {
    id: {
      type: Sequelize.UUID,
      defaultValue: Sequelize.literal('gen_random_uuid()'),
      primaryKey: true,
    },
    schoolId: {
      type: Sequelize.UUID,
      allowNull: false,
      references: { model: 'schools', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'RESTRICT',
    },
    createdBy: {
      type: Sequelize.UUID,
      allowNull: true,
      references: { model: 'users', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    },
    filename: {
      type: Sequelize.STRING(255),
      allowNull: false,
    },
    status: {
      type: Sequelize.ENUM('ready', 'importing', 'completed', 'failed'),
      allowNull: false,
      defaultValue: 'ready',
    },
    totalRows: {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    validRows: {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    invalidRows: {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    errors: {
      type: Sequelize.JSONB,
      allowNull: false,
      defaultValue: [],
    },
    // rawCsv: stores the full UTF-8 CSV text from the validate request so T1-7b
    // can re-parse without re-upload. Required because Railway filesystem is ephemeral.
    rawCsv: {
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

  await queryInterface.addIndex('import_jobs', ['schoolId', 'createdAt'], {
    name: 'import_jobs_school_created',
  });
  await queryInterface.addIndex('import_jobs', ['createdBy'], {
    name: 'import_jobs_created_by',
  });
  await queryInterface.addIndex('import_jobs', ['status'], {
    name: 'import_jobs_status',
  });
}

export async function down(queryInterface) {
  await queryInterface.dropTable('import_jobs');
  await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_import_jobs_status"');
}
