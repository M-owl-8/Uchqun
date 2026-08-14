// P2.4 — the audit-write swallow.
//
// logAudit catches every write error and continues, by design: CLAUDE.md says
// "audit failures must never cascade to feature failures". That is correct as a
// request-path rule and wrong as an observability rule. In Campaign I the D-27
// fix passed a composite string into audit_log.entityId (a uuid column),
// Postgres rejected the insert, logAudit swallowed it, the endpoint returned
// 201, the unit test passed — and no audit row ever existed. The only thing that
// caught it was reading production by hand.
//
// The swallow stays. What changes is that the failure becomes DURABLE and
// VISIBLE: a counter that survives the request and surfaces on the readiness
// probe, which docs/OPERATIONS.md:112 calls "the canonical monitor". Railway
// health-checks /health (railway.toml:8), not /health/readiness, so a degraded
// readiness cannot take the service out of rotation.
//
// FAIL-FIRST: every test here fails against the pre-fix auditLogger.

import { jest } from '@jest/globals';

const mockCreate = jest.fn();
const mockLoggerError = jest.fn();

jest.unstable_mockModule('../../models/AuditLog.js', () => ({
  default: { create: mockCreate },
}));
jest.unstable_mockModule('../../utils/logger.js', () => ({
  default: { info: jest.fn(), warn: jest.fn(), error: mockLoggerError, debug: jest.fn() },
}));

const { logAudit, getAuditHealth, __resetAuditHealth } = await import('../../utils/auditLogger.js');

beforeEach(() => {
  jest.clearAllMocks();
  __resetAuditHealth();
  mockCreate.mockResolvedValue({ id: 1 });
});

describe('P2 — an audit write that fails must not vanish', () => {
  test('a healthy logger reports healthy with zero failures', async () => {
    await logAudit({ actorId: 'a', actorRole: 'admin', action: 'create', entity: 'x', entityId: 'e' });
    const h = getAuditHealth();
    expect(h.failures).toBe(0);
    expect(h.healthy).toBe(true);
    expect(h.lastError).toBeNull();
  });

  test('a rejected write is counted, and the reason is retained', async () => {
    mockCreate.mockRejectedValue(new Error('invalid input syntax for type uuid: "child:2026-08-12"'));
    await logAudit({ actorId: 'a', actorRole: 'reception', action: 'attendance_overwrite', entity: 'child_attendance', entityId: 'child:2026-08-12' });

    const h = getAuditHealth();
    expect(h.failures).toBe(1);
    expect(h.healthy).toBe(false);
    expect(h.lastError).toMatch(/invalid input syntax for type uuid/);
    expect(h.lastAction).toBe('attendance_overwrite');
    expect(h.lastFailureAt).toEqual(expect.any(String));
  });

  test('the failure still does not cascade — logAudit resolves, it does not throw', async () => {
    mockCreate.mockRejectedValue(new Error('db down'));
    await expect(logAudit({ actorId: 'a', actorRole: 'admin', action: 'delete', entity: 'x', entityId: 'e' }))
      .resolves.toBeUndefined();
    expect(mockLoggerError).toHaveBeenCalled();
  });

  test('failures accumulate across calls rather than overwriting', async () => {
    mockCreate.mockRejectedValue(new Error('boom'));
    await logAudit({ action: 'a1', entity: 'e' });
    await logAudit({ action: 'a2', entity: 'e' });
    await logAudit({ action: 'a3', entity: 'e' });
    expect(getAuditHealth().failures).toBe(3);
    expect(getAuditHealth().lastAction).toBe('a3');
  });

  test('a uuid-shaped entityId and a non-uuid one are distinguishable before the write', async () => {
    // the specific shape that produced the D-27 silent failure
    await logAudit({ action: 'attendance_overwrite', entity: 'child_attendance', entityId: '5eed0c9a-fe3e-4031-8f5c-aac195c36b31' });
    expect(mockCreate).toHaveBeenCalled();
    const arg = mockCreate.mock.calls.at(-1)[0];
    expect(arg.entityId).toBe('5eed0c9a-fe3e-4031-8f5c-aac195c36b31');
  });
});
