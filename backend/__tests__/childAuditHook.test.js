import { jest } from '@jest/globals';

// ─── Hook-capture mocks (must be defined before jest.unstable_mockModule calls) ─

// Capture the afterDestroy hook registered on Child
let capturedHook = null;
const mockChildAfterDestroy = jest.fn((hookFn) => { capturedHook = hookFn; });

// Capture the afterDestroy hook registered on ChildObservation
let capturedObservationHook = null;
const mockObservationAfterDestroy = jest.fn((hookFn) => { capturedObservationHook = hookFn; });

// Capture the afterDestroy hook registered on TeacherReflection
let capturedReflectionHook = null;
const mockReflectionAfterDestroy = jest.fn((hookFn) => { capturedReflectionHook = hookFn; });

// T2-5 new captures
let capturedUserHook = null;
const mockUserAfterDestroy = jest.fn((hookFn) => { capturedUserHook = hookFn; });

let capturedAttendanceHook = null;
const mockAttendanceAfterDestroy = jest.fn((hookFn) => { capturedAttendanceHook = hookFn; });

let capturedEmotionalHook = null;
const mockEmotionalAfterDestroy = jest.fn((hookFn) => { capturedEmotionalHook = hookFn; });

// Mock AuditLog.create for assertion
const mockAuditCreate = jest.fn().mockResolvedValue({ id: 1 });
jest.unstable_mockModule('../models/AuditLog.js', () => ({
  default: {
    update: () => { throw new Error('audit_log is immutable'); },
    destroy: () => { throw new Error('audit_log is immutable'); },
    create: mockAuditCreate,
  },
}));

// Mock all models that index.js imports to prevent DB connections
jest.unstable_mockModule('../models/User.js', () => ({ default: { hasMany: jest.fn(), belongsTo: jest.fn(), findByPk: jest.fn(), findAll: jest.fn(), hasOne: jest.fn(), afterDestroy: mockUserAfterDestroy } }));
jest.unstable_mockModule('../models/Document.js', () => ({ default: { belongsTo: jest.fn(), findAll: jest.fn(), afterDestroy: jest.fn() } }));
jest.unstable_mockModule('../models/ParentActivity.js', () => ({ default: { belongsTo: jest.fn() } }));
jest.unstable_mockModule('../models/ParentMeal.js', () => ({ default: { belongsTo: jest.fn() } }));
jest.unstable_mockModule('../models/ParentMedia.js', () => ({ default: { belongsTo: jest.fn() } }));
jest.unstable_mockModule('../models/TeacherResponsibility.js', () => ({ default: { belongsTo: jest.fn() } }));
jest.unstable_mockModule('../models/TeacherTask.js', () => ({ default: { belongsTo: jest.fn() } }));
jest.unstable_mockModule('../models/TeacherWorkHistory.js', () => ({ default: { belongsTo: jest.fn() } }));
jest.unstable_mockModule('../models/Progress.js', () => ({ default: { belongsTo: jest.fn(), afterDestroy: jest.fn() } }));
jest.unstable_mockModule('../models/Group.js', () => ({ default: { belongsTo: jest.fn(), hasMany: jest.fn() } }));
jest.unstable_mockModule('../models/Activity.js', () => ({ default: { belongsTo: jest.fn(), hasMany: jest.fn(), addScope: jest.fn(), afterDestroy: jest.fn() } }));
jest.unstable_mockModule('../models/Media.js', () => ({ default: { belongsTo: jest.fn(), hasMany: jest.fn(), addScope: jest.fn(), afterDestroy: jest.fn() } }));
jest.unstable_mockModule('../models/Meal.js', () => ({ default: { belongsTo: jest.fn(), hasMany: jest.fn(), addScope: jest.fn(), afterDestroy: jest.fn() } }));
jest.unstable_mockModule('../models/Notification.js', () => ({ default: { belongsTo: jest.fn() } }));
jest.unstable_mockModule('../models/TeacherRating.js', () => ({ default: { belongsTo: jest.fn(), afterDestroy: jest.fn() } }));
jest.unstable_mockModule('../models/ChatMessage.js', () => ({ default: { belongsTo: jest.fn(), afterDestroy: jest.fn() } }));
jest.unstable_mockModule('../models/School.js', () => ({ default: { hasMany: jest.fn(), belongsTo: jest.fn() } }));
jest.unstable_mockModule('../models/SchoolRating.js', () => ({ default: { belongsTo: jest.fn(), afterDestroy: jest.fn() } }));
jest.unstable_mockModule('../models/GovernmentMessage.js', () => ({ default: { belongsTo: jest.fn() } }));
jest.unstable_mockModule('../models/AdminRegistrationRequest.js', () => ({ default: { belongsTo: jest.fn() } }));
jest.unstable_mockModule('../models/EmotionalMonitoring.js', () => ({ default: { belongsTo: jest.fn(), afterDestroy: mockEmotionalAfterDestroy } }));
jest.unstable_mockModule('../models/Therapy.js', () => ({ default: { belongsTo: jest.fn(), hasMany: jest.fn(), afterDestroy: jest.fn() } }));
jest.unstable_mockModule('../models/TherapyUsage.js', () => ({ default: { belongsTo: jest.fn(), afterDestroy: jest.fn() } }));
jest.unstable_mockModule('../models/AIWarning.js', () => ({ default: { belongsTo: jest.fn() } }));
jest.unstable_mockModule('../models/GovernmentStats.js', () => ({ default: { belongsTo: jest.fn() } }));
jest.unstable_mockModule('../models/BusinessStats.js', () => ({ default: { belongsTo: jest.fn() } }));
jest.unstable_mockModule('../models/RefreshToken.js', () => ({ default: { belongsTo: jest.fn() } }));
jest.unstable_mockModule('../models/ChildAssessment.js', () => ({ default: { belongsTo: jest.fn(), hasMany: jest.fn(), afterDestroy: jest.fn() } }));
jest.unstable_mockModule('../models/ServicePlan.js', () => ({ default: { belongsTo: jest.fn(), afterDestroy: jest.fn() } }));
jest.unstable_mockModule('../models/MealPlan.js', () => ({ default: { belongsTo: jest.fn(), afterDestroy: jest.fn() } }));
jest.unstable_mockModule('../models/TeacherResource.js', () => ({ default: { belongsTo: jest.fn() } }));
jest.unstable_mockModule('../models/ParentEvaluation.js', () => ({ default: { belongsTo: jest.fn() } }));
jest.unstable_mockModule('../models/News.js', () => ({ default: { belongsTo: jest.fn() } }));
jest.unstable_mockModule('../models/ChildAttendance.js', () => ({ default: { belongsTo: jest.fn(), hasMany: jest.fn(), afterDestroy: mockAttendanceAfterDestroy } }));
jest.unstable_mockModule('../models/ChildObservation.js', () => ({ default: { belongsTo: jest.fn(), hasMany: jest.fn(), afterDestroy: mockObservationAfterDestroy } }));
jest.unstable_mockModule('../models/TeacherReflection.js', () => ({ default: { belongsTo: jest.fn(), hasMany: jest.fn(), afterDestroy: mockReflectionAfterDestroy } }));
jest.unstable_mockModule('../models/ChildJournalEntry.js', () => ({ default: { belongsTo: jest.fn(), hasMany: jest.fn(), afterDestroy: jest.fn() } }));
jest.unstable_mockModule('../models/ImportJob.js', () => ({ default: { belongsTo: jest.fn(), hasMany: jest.fn(), afterDestroy: jest.fn() } }));
jest.unstable_mockModule('../utils/logger.js', () => ({
  default: { error: jest.fn(), info: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

jest.unstable_mockModule('../models/Child.js', () => ({
  default: {
    hasMany: jest.fn(),
    belongsTo: jest.fn(),
    afterDestroy: mockChildAfterDestroy,
    addScope: jest.fn(),
  },
}));

jest.unstable_mockModule('../config/database.js', () => ({
  default: { authenticate: jest.fn(), sync: jest.fn() },
}));

// Loading index.js registers the hook
await import('../models/index.js');

describe('Child.afterDestroy audit hook', () => {
  beforeEach(() => jest.clearAllMocks());

  it('registers an afterDestroy hook on Child', () => {
    // capturedHook is set during module loading (before clearAllMocks runs),
    // so we check it directly rather than via mock call count.
    expect(capturedHook).not.toBeNull();
    expect(typeof capturedHook).toBe('function');
  });

  it('writes an audit_log entry when Child is destroyed with actorId', async () => {
    // Revert-test baseline: without the hook, mockAuditCreate would not be called.
    // With the hook registered, it must be called on destroy.
    mockAuditCreate.mockResolvedValue({ id: 1 });
    const fakeInstance = { id: 'child-uuid', schoolId: 'school-uuid' };
    const fakeOptions = { actorId: 'actor-uuid', actorRole: 'admin' };
    await capturedHook(fakeInstance, fakeOptions);
    expect(mockAuditCreate).toHaveBeenCalledTimes(1);
    const entry = mockAuditCreate.mock.calls[0][0];
    expect(entry.action).toBe('delete');
    expect(entry.entity).toBe('children');
    expect(entry.entityId).toBe('child-uuid');
    expect(entry.actorId).toBe('actor-uuid');
    expect(entry.actorRole).toBe('admin');
  });

  it('writes audit_log with null actorId when no actorId passed', async () => {
    mockAuditCreate.mockResolvedValue({ id: 2 });
    await capturedHook({ id: 'child-uuid', schoolId: 'school-uuid' }, {});
    expect(mockAuditCreate.mock.calls[0][0].actorId).toBeNull();
  });

  it('does NOT throw when AuditLog.create fails (hook failure must not block delete)', async () => {
    mockAuditCreate.mockRejectedValue(new Error('DB down'));
    // Should not throw — the hook swallows audit failures
    await expect(capturedHook({ id: 'x', schoolId: null }, {})).resolves.toBeUndefined();
  });
});

describe('ChildObservation.afterDestroy audit hook', () => {
  beforeEach(() => jest.clearAllMocks());

  it('registers an afterDestroy hook on ChildObservation', () => {
    expect(capturedObservationHook).not.toBeNull();
    expect(typeof capturedObservationHook).toBe('function');
  });

  it('writes audit_log with correct entity, meta.childId, and meta.severity', async () => {
    mockAuditCreate.mockResolvedValue({ id: 10 });
    const fakeInstance = { id: 'obs-uuid', schoolId: 'school-uuid', childId: 'child-uuid', severity: 'urgent' };
    const fakeOptions = { actorId: 'teacher-uuid', actorRole: 'teacher', reason: 'duplicate entry' };
    await capturedObservationHook(fakeInstance, fakeOptions);
    expect(mockAuditCreate).toHaveBeenCalledTimes(1);
    const entry = mockAuditCreate.mock.calls[0][0];
    expect(entry.action).toBe('delete');
    expect(entry.entity).toBe('child_observations');
    expect(entry.entityId).toBe('obs-uuid');
    expect(entry.actorId).toBe('teacher-uuid');
    expect(entry.actorRole).toBe('teacher');
    expect(entry.meta).toMatchObject({ childId: 'child-uuid', severity: 'urgent', reason: 'duplicate entry' });
  });

  it('defaults actorRole to "unknown" when options omits it', async () => {
    mockAuditCreate.mockResolvedValue({ id: 11 });
    await capturedObservationHook({ id: 'obs-uuid', schoolId: 'school-uuid', childId: 'child-uuid', severity: 'routine' }, {});
    expect(mockAuditCreate.mock.calls[0][0].actorRole).toBe('unknown');
    expect(mockAuditCreate.mock.calls[0][0].actorId).toBeNull();
  });

  it('does NOT throw when AuditLog.create fails (hook failure must not block delete)', async () => {
    mockAuditCreate.mockRejectedValue(new Error('DB down'));
    await expect(
      capturedObservationHook({ id: 'obs-uuid', schoolId: 'school-uuid', childId: 'child-uuid', severity: 'concern' }, {}),
    ).resolves.toBeUndefined();
  });
});

describe('TeacherReflection.afterDestroy audit hook', () => {
  beforeEach(() => jest.clearAllMocks());

  it('registers an afterDestroy hook on TeacherReflection', () => {
    expect(capturedReflectionHook).not.toBeNull();
    expect(typeof capturedReflectionHook).toBe('function');
  });

  it('writes audit_log with correct entity and meta.teacherId', async () => {
    mockAuditCreate.mockResolvedValue({ id: 30 });
    const fakeInstance = { id: 'ref-uuid', schoolId: 'school-uuid', teacherId: 'teacher-uuid' };
    const fakeOptions = { actorId: 'admin-uuid', actorRole: 'admin', reason: 'user deleted' };
    await capturedReflectionHook(fakeInstance, fakeOptions);
    expect(mockAuditCreate).toHaveBeenCalledTimes(1);
    const entry = mockAuditCreate.mock.calls[0][0];
    expect(entry.action).toBe('delete');
    expect(entry.entity).toBe('teacher_reflections');
    expect(entry.entityId).toBe('ref-uuid');
    expect(entry.actorId).toBe('admin-uuid');
    expect(entry.meta).toMatchObject({ teacherId: 'teacher-uuid', reason: 'user deleted' });
  });

  it('defaults actorRole to "unknown" when options omits it', async () => {
    mockAuditCreate.mockResolvedValue({ id: 31 });
    await capturedReflectionHook({ id: 'ref-uuid', schoolId: 'school-uuid', teacherId: 't1' }, {});
    expect(mockAuditCreate.mock.calls[0][0].actorRole).toBe('unknown');
  });

  it('does NOT throw when AuditLog.create fails', async () => {
    mockAuditCreate.mockRejectedValue(new Error('DB down'));
    await expect(
      capturedReflectionHook({ id: 'ref-uuid', schoolId: 'school-uuid', teacherId: 't1' }, {}),
    ).resolves.toBeUndefined();
  });
});

// ─── T2-5 new hooks ───────────────────────────────────────────────────────────

describe('User.afterDestroy audit hook (T2-5)', () => {
  beforeEach(() => jest.clearAllMocks());

  it('registers an afterDestroy hook on User', () => {
    expect(capturedUserHook).not.toBeNull();
    expect(typeof capturedUserHook).toBe('function');
  });

  it('writes audit_log with entity=users and meta.role', async () => {
    mockAuditCreate.mockResolvedValue({ id: 50 });
    const fakeInstance = { id: 'user-uuid', schoolId: 'school-uuid', role: 'teacher' };
    const fakeOptions = { actorId: 'admin-uuid', actorRole: 'admin', reason: 'admin_delete' };
    await capturedUserHook(fakeInstance, fakeOptions);
    expect(mockAuditCreate).toHaveBeenCalledTimes(1);
    const entry = mockAuditCreate.mock.calls[0][0];
    expect(entry.action).toBe('delete');
    expect(entry.entity).toBe('users');
    expect(entry.entityId).toBe('user-uuid');
    expect(entry.actorId).toBe('admin-uuid');
    expect(entry.schoolId).toBe('school-uuid');
    expect(entry.meta).toMatchObject({ role: 'teacher', reason: 'admin_delete' });
  });

  it('does NOT throw when AuditLog.create fails', async () => {
    mockAuditCreate.mockRejectedValue(new Error('DB down'));
    await expect(
      capturedUserHook({ id: 'user-uuid', schoolId: null, role: 'parent' }, {}),
    ).resolves.toBeUndefined();
  });
});

describe('ChildAttendance.afterDestroy audit hook (T2-5)', () => {
  beforeEach(() => jest.clearAllMocks());

  it('registers an afterDestroy hook on ChildAttendance', () => {
    expect(capturedAttendanceHook).not.toBeNull();
    expect(typeof capturedAttendanceHook).toBe('function');
  });

  it('writes audit_log with entity=child_attendance, meta.childId and meta.date', async () => {
    mockAuditCreate.mockResolvedValue({ id: 60 });
    const fakeInstance = { id: 'att-uuid', schoolId: 'school-uuid', childId: 'child-uuid', date: '2026-05-20' };
    const fakeOptions = { actorId: 'admin-uuid', actorRole: 'admin', reason: 'correction' };
    await capturedAttendanceHook(fakeInstance, fakeOptions);
    const entry = mockAuditCreate.mock.calls[0][0];
    expect(entry.entity).toBe('child_attendance');
    expect(entry.entityId).toBe('att-uuid');
    expect(entry.meta).toMatchObject({ childId: 'child-uuid', date: '2026-05-20', reason: 'correction' });
  });

  it('does NOT throw when AuditLog.create fails', async () => {
    mockAuditCreate.mockRejectedValue(new Error('DB down'));
    await expect(
      capturedAttendanceHook({ id: 'att-uuid', schoolId: 'school-uuid', childId: 'c1', date: '2026-05-20' }, {}),
    ).resolves.toBeUndefined();
  });
});

describe('EmotionalMonitoring.afterDestroy audit hook (T2-5)', () => {
  beforeEach(() => jest.clearAllMocks());

  it('registers an afterDestroy hook on EmotionalMonitoring', () => {
    expect(capturedEmotionalHook).not.toBeNull();
    expect(typeof capturedEmotionalHook).toBe('function');
  });

  it('writes audit_log with entity=emotional_monitoring and meta.childId', async () => {
    mockAuditCreate.mockResolvedValue({ id: 70 });
    const fakeInstance = { id: 'em-uuid', childId: 'child-uuid', date: '2026-05-20' };
    const fakeOptions = { actorId: 'teacher-uuid', actorRole: 'teacher', reason: 'teacher_delete' };
    await capturedEmotionalHook(fakeInstance, fakeOptions);
    const entry = mockAuditCreate.mock.calls[0][0];
    expect(entry.entity).toBe('emotional_monitoring');
    expect(entry.entityId).toBe('em-uuid');
    expect(entry.schoolId).toBeNull();
    expect(entry.meta).toMatchObject({ childId: 'child-uuid', date: '2026-05-20', reason: 'teacher_delete' });
  });

  it('does NOT throw when AuditLog.create fails', async () => {
    mockAuditCreate.mockRejectedValue(new Error('DB down'));
    await expect(
      capturedEmotionalHook({ id: 'em-uuid', childId: 'c1', date: '2026-05-01' }, {}),
    ).resolves.toBeUndefined();
  });
});
