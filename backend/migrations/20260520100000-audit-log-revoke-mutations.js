/**
 * DB-level immutability enforcement for audit_log (Layer 3 of 3).
 * Layers 1 and 2 (static + instance model overrides) are in models/AuditLog.js.
 * This migration revokes UPDATE and DELETE on audit_log from PUBLIC so that any
 * direct SQL attempt to mutate audit entries fails at the DB level, independent
 * of the application layer.
 *
 * Note: Railway Postgres connects as the postgres superuser, which retains all
 * privileges regardless of REVOKE FROM PUBLIC. This migration protects against
 * other roles / future application users that might be added — it does not and
 * cannot restrict a superuser. The model-level guards (Layers 1 + 2) are the
 * primary enforcement for the application process itself.
 */

export const up = async (queryInterface) => {
  await queryInterface.sequelize.query(
    'REVOKE UPDATE, DELETE ON audit_log FROM PUBLIC'
  );
};

export const down = async (queryInterface) => {
  await queryInterface.sequelize.query(
    'GRANT UPDATE, DELETE ON audit_log TO PUBLIC'
  );
};
