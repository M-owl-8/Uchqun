import AuditLog from '../models/AuditLog.js';
import logger from './logger.js';

/**
 * Audit-write health.
 *
 * logAudit deliberately swallows write errors — CLAUDE.md: "audit failures must
 * never cascade to feature failures". That rule is right for the request path
 * and wrong for observability. In Campaign I the D-27 fix passed a composite
 * "childId:date" string into audit_log.entityId (a uuid column); Postgres
 * rejected the insert; this function swallowed it; the endpoint returned 201;
 * the unit test passed; and no audit row ever existed. It was caught only by
 * reading production by hand.
 *
 * So the swallow stays, and the failure becomes durable instead: a counter that
 * outlives the request and is reported by GET /health/readiness, which
 * docs/OPERATIONS.md:112 calls "the canonical monitor". Railway health-checks
 * /health (railway.toml:8), not /health/readiness, so a degraded readiness
 * signals an operator without pulling the service out of rotation.
 *
 * For a government platform, an audit trail that silently drops writes is worse
 * than no audit trail: it produces a record that looks complete and is not.
 */
const auditHealth = {
  failures: 0,
  writes: 0,
  lastError: null,
  lastAction: null,
  lastFailureAt: null,
};

export const getAuditHealth = () => ({
  healthy: auditHealth.failures === 0,
  failures: auditHealth.failures,
  writes: auditHealth.writes,
  lastError: auditHealth.lastError,
  lastAction: auditHealth.lastAction,
  lastFailureAt: auditHealth.lastFailureAt,
});

/** Test-only. Not exported through any route. */
export const __resetAuditHealth = () => {
  auditHealth.failures = 0;
  auditHealth.writes = 0;
  auditHealth.lastError = null;
  auditHealth.lastAction = null;
  auditHealth.lastFailureAt = null;
};

export const logAudit = async ({
  actorId = null,
  actorRole = 'unknown',
  action,
  entity,
  entityId = null,
  schoolId = null,
  meta = null,
} = {}) => {
  try {
    await AuditLog.create({
      actorId,
      actorRole,
      action,
      entity,
      entityId,
      schoolId,
      meta,
      occurredAt: new Date(),
    });
    auditHealth.writes += 1;
  } catch (err) {
    // Still no cascade — the caller's feature must not fail because of us.
    auditHealth.failures += 1;
    auditHealth.lastError = err.message;
    auditHealth.lastAction = action ?? null;
    auditHealth.lastFailureAt = new Date().toISOString();
    logger.error('auditLogger: failed to write entry', {
      error: err.message,
      action,
      entity,
      entityId,
      totalFailures: auditHealth.failures,
    });
  }
};
