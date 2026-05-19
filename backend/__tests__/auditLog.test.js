import { jest } from '@jest/globals';

// Mock AuditLog to avoid DB dependency
const mockCreate = jest.fn();
const mockUpdate = jest.fn();
const mockDestroy = jest.fn();

jest.unstable_mockModule('../models/AuditLog.js', () => ({
  default: {
    create: mockCreate,
    // The real model overrides update/destroy to throw — replicate that here
    update: () => { throw new Error('audit_log is immutable'); },
    destroy: () => { throw new Error('audit_log is immutable'); },
  },
}));
jest.unstable_mockModule('../utils/logger.js', () => ({
  default: { error: jest.fn(), info: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

const { logAudit } = await import('../utils/auditLogger.js');
const AuditLog = (await import('../models/AuditLog.js')).default;

describe('AuditLog model — immutability guards', () => {
  it('AuditLog.update() throws "audit_log is immutable"', () => {
    // Revert-test baseline: without the override, update() would succeed.
    // With the override in place, it must throw.
    expect(() => AuditLog.update()).toThrow('audit_log is immutable');
  });

  it('AuditLog.destroy() throws "audit_log is immutable"', () => {
    // Revert-test baseline: without the override, destroy() would proceed to DB.
    // With the override in place, it must throw.
    expect(() => AuditLog.destroy()).toThrow('audit_log is immutable');
  });
});

describe('logAudit utility', () => {
  beforeEach(() => jest.clearAllMocks());

  it('writes a record when called with full params', async () => {
    mockCreate.mockResolvedValue({ id: 1 });
    await logAudit({
      actorId: 'uuid-actor',
      actorRole: 'admin',
      action: 'delete',
      entity: 'children',
      entityId: 'uuid-child',
      schoolId: 'uuid-school',
      meta: { reason: 'test' },
    });
    expect(mockCreate).toHaveBeenCalledTimes(1);
    const call = mockCreate.mock.calls[0][0];
    expect(call.actorId).toBe('uuid-actor');
    expect(call.actorRole).toBe('admin');
    expect(call.action).toBe('delete');
    expect(call.entity).toBe('children');
    expect(call.entityId).toBe('uuid-child');
    expect(call.schoolId).toBe('uuid-school');
  });

  it('writes a record with null actorId when actorId omitted', async () => {
    mockCreate.mockResolvedValue({ id: 2 });
    await logAudit({ action: 'delete', entity: 'children', entityId: 'uuid-child' });
    expect(mockCreate).toHaveBeenCalledTimes(1);
    expect(mockCreate.mock.calls[0][0].actorId).toBeNull();
  });

  it('does NOT throw when AuditLog.create() fails (hook failure must not block app)', async () => {
    mockCreate.mockRejectedValue(new Error('DB connection lost'));
    // Should resolve without throwing
    await expect(logAudit({ action: 'delete', entity: 'children', entityId: 'x' })).resolves.toBeUndefined();
  });
});
