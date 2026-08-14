import { safeAddIndex } from './_guards.js';
export async function up(queryInterface, Sequelize) {
  // Create ENUM type for recipientLevel (Postgres-safe: idempotent)
  await queryInterface.sequelize.query(`
    DO $$ BEGIN
      CREATE TYPE "enum_government_messages_recipientLevel"
        AS ENUM ('owner', 'region', 'republic');
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;
  `);

  // Add recipientLevel: NOT NULL DEFAULT 'republic' — existing rows pre-date routing;
  // treating them as republic-level is the safest default (they were sent to "the government"
  // with no scope, which semantically matches republic-level access).
  await queryInterface.addColumn('government_messages', 'recipientLevel', {
    type: Sequelize.ENUM('owner', 'region', 'republic'),
    allowNull: false,
    defaultValue: 'republic',
  });

  // Add escalatedFromId: nullable self-ref FK. SET NULL on delete preserves escalation
  // chain even if the original message is removed.
  await queryInterface.addColumn('government_messages', 'escalatedFromId', {
    type: Sequelize.UUID,
    allowNull: true,
    references: { model: 'government_messages', key: 'id' },
    onDelete: 'SET NULL',
    onUpdate: 'CASCADE',
  });

  await safeAddIndex(queryInterface, 'government_messages', ['recipientLevel'], {
    name: 'government_messages_recipient_level_idx',
  });
  await safeAddIndex(queryInterface, 'government_messages', ['escalatedFromId'], {
    name: 'government_messages_escalated_from_idx',
  });
}

export async function down(queryInterface) {
  await queryInterface.removeIndex('government_messages', 'government_messages_escalated_from_idx');
  await queryInterface.removeIndex('government_messages', 'government_messages_recipient_level_idx');
  await queryInterface.removeColumn('government_messages', 'escalatedFromId');
  await queryInterface.removeColumn('government_messages', 'recipientLevel');
  await queryInterface.sequelize.query(
    'DROP TYPE IF EXISTS "enum_government_messages_recipientLevel";',
  );
}
