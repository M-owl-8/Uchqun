/**
 * Campaign III P3 — the real-Postgres integration lane.
 *
 * Deliberately a SEPARATE config from jest.config.js. The default suite mocks
 * every model and must keep doing so — it is fast and it covers branch logic.
 * This lane mocks nothing: real Express app, real middleware chain, real
 * Sequelize, real PostgreSQL, schema built from migrations.
 *
 * The two must not share a testMatch, or the default suite would try to open a
 * database connection it does not have and the integration suite would inherit
 * mocks that defeat its entire purpose.
 */
export default {
  testEnvironment: 'node',
  transform: {},
  testMatch: ['**/__tests__/integration/**/*.test.js'],
  setupFiles: ['./__tests__/integration/helpers/env.js'],
  // One worker: every test shares one database and one fixture set. Parallel
  // workers would interleave writes into the same rows and produce failures
  // that say nothing about isolation.
  maxWorkers: 1,
  testTimeout: 120000,
  forceExit: true,
};
