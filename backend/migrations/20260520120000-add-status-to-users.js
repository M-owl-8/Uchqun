// T2-2 PR1: add account status column to users table.
// Idempotent: status column pre-existed on Railway (added outside migration system).
// This migration adds the CHECK constraint and partial index regardless.
export const up = async (queryInterface, Sequelize) => {
  // Add column only if it doesn't already exist
  try {
    await queryInterface.addColumn('users', 'status', {
      type: Sequelize.STRING(20),
      allowNull: true,
      defaultValue: 'active',
    });
  } catch (err) {
    if (!err.message?.includes('already exists')) throw err;
  }

  // Enforce valid values at DB level (idempotent via DO block)
  await queryInterface.sequelize.query(`
    DO $$ BEGIN
      ALTER TABLE users ADD CONSTRAINT users_status_check
        CHECK (status IN ('active', 'suspended', 'archived'));
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
  `);

  // Partial index: fast lookup of non-active users (small because most users are active)
  await queryInterface.sequelize.query(
    `CREATE INDEX IF NOT EXISTS idx_users_status_non_active ON users (status) WHERE status != 'active'`
  );
};

export const down = async (queryInterface) => {
  await queryInterface.sequelize.query(
    `DROP INDEX IF EXISTS idx_users_status_non_active`
  );
  await queryInterface.sequelize.query(
    `ALTER TABLE users DROP CONSTRAINT IF EXISTS users_status_check`
  );
  await queryInterface.removeColumn('users', 'status').catch(() => {});
};
