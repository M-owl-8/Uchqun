/**
 * GOV-INSTITUTION-TYPES: Replace the 3-value school type enum
 * (school / kindergarten / both) with the 5-category institution type taxonomy
 * (daycare / early_preschool / support / early_intervention / home_care).
 *
 * Strategy: Postgres ENUM mutation is fragile. We use a temp VARCHAR column
 * with a CHECK constraint — cleaner and fully reversible.
 *
 * Existing data mapping:
 *   school       → support       (special schools for school-age children)
 *   kindergarten → daycare       (preschool/childcare institutions)
 *   both         → support       (mixed-age special schools; all 4 seed schools)
 */
import { safeAddIndex } from './_guards.js';


const NEW_VALUES = ['daycare', 'early_preschool', 'support', 'early_intervention', 'home_care'];
const OLD_VALUES = ['school', 'kindergarten', 'both'];

export async function up(queryInterface, Sequelize) {
  // 1. Add temp column with CHECK constraint
  await queryInterface.addColumn('schools', 'type_new', {
    type: Sequelize.STRING(32),
    allowNull: true,
  });

  await queryInterface.sequelize.query(
    `ALTER TABLE schools ADD CONSTRAINT schools_type_new_check CHECK ("type_new" IN ('daycare','early_preschool','support','early_intervention','home_care'))`
  );

  // 2. Migrate existing data
  await queryInterface.sequelize.query(`
    UPDATE schools SET type_new =
      CASE type::text
        WHEN 'kindergarten' THEN 'daycare'
        ELSE 'support'
      END
  `);

  // 3. Make NOT NULL, add default
  await queryInterface.changeColumn('schools', 'type_new', {
    type: Sequelize.STRING(32),
    allowNull: false,
    defaultValue: 'support',
  });

  // 4. Drop old ENUM column and the Postgres type
  await queryInterface.removeIndex('schools', 'schools_type').catch(() => {});
  await queryInterface.removeColumn('schools', 'type');
  await queryInterface.sequelize.query(
    `DROP TYPE IF EXISTS "enum_schools_type" CASCADE`
  ).catch(() => {});

  // 5. Rename new column to type
  await queryInterface.renameColumn('schools', 'type_new', 'type');

  // 6. Re-create index on type
  await safeAddIndex(queryInterface, 'schools', ['type'], { name: 'schools_type' });
}

export async function down(queryInterface, Sequelize) {
  // Reverse: VARCHAR type_new → ENUM(school, kindergarten, both)

  // 1. Create old ENUM type
  await queryInterface.sequelize.query(`
    DO $$ BEGIN
      CREATE TYPE "enum_schools_type" AS ENUM('school', 'kindergarten', 'both');
    EXCEPTION WHEN duplicate_object THEN null;
    END $$
  `);

  // 2. Add temp column with old ENUM type
  await queryInterface.addColumn('schools', 'type_old', {
    type: '"enum_schools_type"',
    allowNull: true,
  });

  // 3. Map new values back to old values
  await queryInterface.sequelize.query(`
    UPDATE schools SET type_old =
      CASE type
        WHEN 'daycare'             THEN 'kindergarten'::"enum_schools_type"
        WHEN 'early_preschool'     THEN 'kindergarten'::"enum_schools_type"
        WHEN 'early_intervention'  THEN 'both'::"enum_schools_type"
        WHEN 'home_care'           THEN 'school'::"enum_schools_type"
        ELSE 'both'::"enum_schools_type"
      END
  `);

  // 4. Make NOT NULL
  await queryInterface.changeColumn('schools', 'type_old', {
    type: '"enum_schools_type"',
    allowNull: false,
    defaultValue: 'both',
  });

  // 5. Drop the CHECK constraint and new VARCHAR column
  await queryInterface.removeIndex('schools', 'schools_type').catch(() => {});
  await queryInterface.sequelize.query(
    `ALTER TABLE schools DROP CONSTRAINT IF EXISTS schools_type_new_check`
  );
  await queryInterface.removeColumn('schools', 'type');

  // 6. Rename old column back
  await queryInterface.renameColumn('schools', 'type_old', 'type');

  // 7. Re-create index
  await safeAddIndex(queryInterface, 'schools', ['type'], { name: 'schools_type' });
}
