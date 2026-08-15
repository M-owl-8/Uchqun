/**
 * Campaign III P3 — environment for the integration lane.
 *
 * Sets only what the app requires to boot. The database connection comes from
 * the ambient DB_* / DATABASE_URL, which in CI point at the postgres service
 * whose schema was built by `npm run migrate` — never by sync().
 *
 * FORCE_SYNC is pinned to 'false' here on purpose. CLAUDE.md forbids it, and a
 * lane whose whole point is "the schema came from migrations" must not be able
 * to paper over a missing column by creating it at boot.
 */
process.env.NODE_ENV = process.env.NODE_ENV || 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'integration-jwt-secret-at-least-32-characters';
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'integration-refresh-secret-at-least-32-chars';
process.env.JWT_EXPIRE = '15m';
process.env.JWT_REFRESH_EXPIRE = '7d';
process.env.FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
process.env.FORCE_SYNC = 'false';
process.env.RUN_MIGRATIONS = 'false';
// server.js binds a port at import time; keep it off anything else in CI.
process.env.PORT = process.env.INTEGRATION_PORT || '5099';
