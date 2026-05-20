// T2-2 PR1: add account status column to users table.
// Coexists with isActive — isActive is NOT removed here (that is PR2's job).
// All existing rows receive DEFAULT 'active'; no table rewrite on Postgres 11+.
export const up = async (queryInterface, Sequelize) => {
  await queryInterface.addColumn('users', 'status', {
    type: Sequelize.STRING(20),
    allowNull: false,
    defaultValue: 'active',
  });

  // Enforce valid values at DB level
  await queryInterface.sequelize.query(
    `ALTER TABLE users ADD CONSTRAINT users_status_check CHECK (status IN ('active', 'suspended', 'archived'))`
  );

  // Partial index: fast lookup of suspended/archived users.
  // The index is small because almost all users are active.
  await queryInterface.sequelize.query(
    `CREATE INDEX idx_users_status_non_active ON users (status) WHERE status != 'active'`
  );
};

export const down = async (queryInterface) => {
  await queryInterface.sequelize.query(
    `DROP INDEX IF EXISTS idx_users_status_non_active`
  );
  await queryInterface.sequelize.query(
    `ALTER TABLE users DROP CONSTRAINT IF EXISTS users_status_check`
  );
  await queryInterface.removeColumn('users', 'status');
};
