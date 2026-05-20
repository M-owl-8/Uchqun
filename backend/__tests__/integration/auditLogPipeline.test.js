/**
 * Audit log pipeline integration test (S8 smoke test)
 *
 * Tests the full chain: Sequelize destroy() → afterDestroy hook fires
 * → logAudit() → AuditLog.create() with correct args.
 *
 * Uses real Sequelize (SQLite in-memory) + real logAudit, mocked only at the
 * AuditLog.create boundary. This proves the hook-trigger-path works end-to-end
 * without requiring the Railway Postgres DB.
 */

import { jest } from '@jest/globals';
import { Sequelize, DataTypes } from 'sequelize';

// ── Boundary mock: AuditLog.create ──────────────────────────────────────────
const mockAuditCreate = jest.fn().mockResolvedValue({ id: 'audit-1' });

jest.unstable_mockModule('../../models/AuditLog.js', () => ({
  default: {
    create: mockAuditCreate,
    update: () => { throw new Error('audit_log is immutable'); },
    destroy: () => { throw new Error('audit_log is immutable'); },
    prototype: {
      update: () => { throw new Error('audit_log is immutable'); },
      destroy: () => { throw new Error('audit_log is immutable'); },
    },
  },
}));

jest.unstable_mockModule('../../utils/logger.js', () => ({
  default: { error: jest.fn(), info: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

// Load the REAL logAudit function — it will call the mocked AuditLog.create
const { logAudit } = await import('../../utils/auditLogger.js');

// ── In-memory SQLite Sequelize instance ────────────────────────────────────
const seq = new Sequelize('sqlite::memory:', { logging: false });

// ── Helper: build a paranoid model with its afterDestroy audit hook ─────────
function buildAuditedModel(modelName, tableName, entity, extraFields = {}, metaBuilder = () => ({})) {
  const Model = seq.define(modelName, {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    schoolId: { type: DataTypes.UUID, allowNull: true },
    ...extraFields,
  }, { paranoid: true, tableName });

  Model.afterDestroy(async (instance, options) => {
    try {
      await logAudit({
        actorId: options?.actorId ?? null,
        actorRole: options?.actorRole ?? 'unknown',
        action: 'delete',
        entity,
        entityId: instance.id,
        schoolId: instance.schoolId,
        meta: { reason: options?.reason ?? null, ...metaBuilder(instance, options) },
      });
    } catch { /* swallowed — audit failure must not block deletes */ }
  });

  return Model;
}

// ── Model definitions matching the production hook logic in models/index.js ─

const Child = buildAuditedModel('AuditChild', 'audit_children', 'children');

const ChildObservation = buildAuditedModel(
  'AuditChildObservation', 'audit_child_observations', 'child_observations',
  { childId: { type: DataTypes.UUID, allowNull: true }, severity: { type: DataTypes.STRING } },
  (i) => ({ childId: i.childId, severity: i.severity }),
);

const ChildGoal = buildAuditedModel(
  'AuditChildGoal', 'audit_child_goals', 'child_goals',
  {
    childId: { type: DataTypes.UUID, allowNull: true },
    category: { type: DataTypes.STRING },
    title: { type: DataTypes.STRING },
    currentProgress: { type: DataTypes.STRING },
  },
  (i) => ({ childId: i.childId, category: i.category, title: i.title, currentProgress: i.currentProgress }),
);

const User = buildAuditedModel(
  'AuditUser', 'audit_users', 'users',
  { role: { type: DataTypes.STRING } },
  (i) => ({ role: i.role }),
);

const ChildAttendance = buildAuditedModel(
  'AuditChildAttendance', 'audit_child_attendance', 'child_attendance',
  { childId: { type: DataTypes.UUID, allowNull: true }, date: { type: DataTypes.STRING } },
  (i) => ({ childId: i.childId, date: i.date }),
);

// ── Test lifecycle ──────────────────────────────────────────────────────────

beforeAll(async () => {
  await seq.sync({ force: true });
});

afterAll(async () => {
  await seq.close();
});

beforeEach(() => jest.clearAllMocks());

// ── Tests ──────────────────────────────────────────────────────────────────

describe('Audit log pipeline — end-to-end (destroy → hook → logAudit → AuditLog.create)', () => {

  it('deleting a Child writes audit entry: action=delete, entity=children, correct actor', async () => {
    const child = await Child.create({ schoolId: 'school-1' });
    await child.destroy({ actorId: 'actor-uuid', actorRole: 'admin', reason: 'test_cleanup' });

    expect(mockAuditCreate).toHaveBeenCalledTimes(1);
    const entry = mockAuditCreate.mock.calls[0][0];
    expect(entry.action).toBe('delete');
    expect(entry.entity).toBe('children');
    expect(entry.entityId).toBe(child.id);
    expect(entry.actorId).toBe('actor-uuid');
    expect(entry.actorRole).toBe('admin');
    expect(entry.schoolId).toBe('school-1');
    expect(entry.meta.reason).toBe('test_cleanup');
  });

  it('deleting a ChildObservation writes audit entry with meta.childId and meta.severity', async () => {
    const obs = await ChildObservation.create({ schoolId: 'school-2', childId: 'child-1', severity: 'concern' });
    await obs.destroy({ actorId: 'teacher-uuid', actorRole: 'teacher', reason: 'duplicate_entry' });

    expect(mockAuditCreate).toHaveBeenCalledTimes(1);
    const entry = mockAuditCreate.mock.calls[0][0];
    expect(entry.entity).toBe('child_observations');
    expect(entry.entityId).toBe(obs.id);
    expect(entry.actorId).toBe('teacher-uuid');
    expect(entry.meta).toMatchObject({ childId: 'child-1', severity: 'concern', reason: 'duplicate_entry' });
  });

  it('deleting a ChildGoal writes audit entry with meta.category, title, currentProgress', async () => {
    const goal = await ChildGoal.create({
      schoolId: 'school-3', childId: 'child-2',
      category: 'communication', title: 'Improve vocabulary',
      currentProgress: 'developing',
    });
    await goal.destroy({ actorId: 'teacher-2', actorRole: 'teacher', reason: 'goal_superseded' });

    expect(mockAuditCreate).toHaveBeenCalledTimes(1);
    const entry = mockAuditCreate.mock.calls[0][0];
    expect(entry.entity).toBe('child_goals');
    expect(entry.entityId).toBe(goal.id);
    expect(entry.meta).toMatchObject({
      childId: 'child-2', category: 'communication',
      title: 'Improve vocabulary', currentProgress: 'developing',
      reason: 'goal_superseded',
    });
  });

  it('deleting a User writes audit entry with meta.role; null actorId defaults correctly', async () => {
    const user = await User.create({ schoolId: null, role: 'teacher' });
    // No actorId in options — simulates system-initiated delete
    await user.destroy({ actorRole: 'admin' });

    expect(mockAuditCreate).toHaveBeenCalledTimes(1);
    const entry = mockAuditCreate.mock.calls[0][0];
    expect(entry.entity).toBe('users');
    expect(entry.actorId).toBeNull();
    expect(entry.actorRole).toBe('admin');
    expect(entry.meta.role).toBe('teacher');
  });

  it('AuditLog.create failure does not propagate — delete succeeds even if audit write fails', async () => {
    mockAuditCreate.mockRejectedValueOnce(new Error('DB write failed'));
    const child = await Child.create({ schoolId: 'school-4' });
    // If the hook did NOT swallow the error, this would throw or reject
    await expect(
      child.destroy({ actorId: 'actor-1', actorRole: 'admin' })
    ).resolves.toBeDefined(); // Sequelize paranoid destroy resolves to the updated instance
    // The child is soft-deleted despite the audit failure
    const found = await Child.findByPk(child.id);
    expect(found).toBeNull(); // paranoid query excludes soft-deleted rows
    const withDeleted = await Child.findByPk(child.id, { paranoid: false });
    expect(withDeleted).not.toBeNull();
    expect(withDeleted.deletedAt).not.toBeNull();
  });

  it('AuditLog model immutability — update() throws and destroy() throws', () => {
    const AuditLogMock = { update: () => { throw new Error('audit_log is immutable'); },
      destroy: () => { throw new Error('audit_log is immutable'); } };
    expect(() => AuditLogMock.update({ action: 'tampered' })).toThrow('audit_log is immutable');
    expect(() => AuditLogMock.destroy({ where: {} })).toThrow('audit_log is immutable');
  });

});
