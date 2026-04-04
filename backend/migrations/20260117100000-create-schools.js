/**
 * Migration: Create schools table.
 * Schools were previously created via Sequelize sync; this migration
 * makes the schema explicit and enables proper FK references in later migrations.
 */
export async function up(queryInterface, Sequelize) {
  const tables = await queryInterface.showAllTables();
  if (tables.includes('schools')) return; // already exists (created by sync)

  await queryInterface.sequelize.query(`
    DO $$ BEGIN
      CREATE TYPE "enum_schools_type" AS ENUM('school', 'kindergarten', 'both');
    EXCEPTION WHEN duplicate_object THEN null;
    END $$;
  `);

  await queryInterface.createTable('schools', {
    id: {
      type: Sequelize.UUID,
      defaultValue: Sequelize.UUIDV4,
      primaryKey: true,
    },
    name: {
      type: Sequelize.STRING(500),
      allowNull: false,
    },
    type: {
      type: Sequelize.ENUM('school', 'kindergarten', 'both'),
      defaultValue: 'both',
      allowNull: false,
    },
    address: {
      type: Sequelize.TEXT,
      allowNull: true,
    },
    phone: {
      type: Sequelize.STRING(255),
      allowNull: true,
    },
    email: {
      type: Sequelize.STRING(255),
      allowNull: true,
    },
    description: {
      type: Sequelize.TEXT,
      allowNull: true,
    },
    isActive: {
      type: Sequelize.BOOLEAN,
      defaultValue: true,
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
  });

  await queryInterface.addIndex('schools', ['name'], { name: 'schools_name' });
  await queryInterface.addIndex('schools', ['type'], { name: 'schools_type' });
  await queryInterface.addIndex('schools', ['isActive'], { name: 'schools_is_active' });
}

export async function down(queryInterface) {
  await queryInterface.dropTable('schools');
}
