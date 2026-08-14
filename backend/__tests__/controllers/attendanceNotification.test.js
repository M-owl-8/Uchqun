/**
 * D-35 — the parent notification centre was never fed by attendance or journal.
 *
 * On a day when a parent's child received a journal entry, a chat message and
 * three attendance changes, the parent's page read `Bildirishnomalar(0)` and the
 * whole notifications table held only activity / media / meal / general rows.
 *
 * The tests below pin BOTH halves of the fix: that the notification is created,
 * and that 'present' deliberately creates nothing. The second is not an
 * omission — attendance is marked in bulk for every child every day, so
 * notifying on 'present' would generate one message per child per day and bury
 * the one a parent actually needs to see.
 */
import { jest } from '@jest/globals';

const mockCreateNotification = jest.fn();
const mockChildFindAll = jest.fn();
const mockAttendanceFindOne = jest.fn();
const mockAttendanceCreate = jest.fn();
const mockEmitToUser = jest.fn();
const mockValidateChildAccess = jest.fn();
const mockIsTeacherAssigned = jest.fn();

jest.unstable_mockModule('../../controllers/notificationController.js', () => ({
  createNotification: mockCreateNotification,
}));
jest.unstable_mockModule('../../models/ChildAttendance.js', () => ({
  default: { findOne: mockAttendanceFindOne, create: mockAttendanceCreate, findAll: jest.fn() },
}));
jest.unstable_mockModule('../../models/Child.js', () => ({
  default: { findAll: mockChildFindAll, findByPk: jest.fn() },
}));
jest.unstable_mockModule('../../config/socket.js', () => ({
  emitToUser: mockEmitToUser, getIO: jest.fn(), initSocket: jest.fn(),
}));
jest.unstable_mockModule('../../utils/schoolValidation.js', () => ({
  validateChildAccess: mockValidateChildAccess,
  isTeacherAssignedToChild: mockIsTeacherAssigned,
  findChildScopedResource: jest.fn(),
}));
jest.unstable_mockModule('../../utils/auditLogger.js', () => ({
  logAudit: jest.fn(), getAuditHealth: jest.fn(), __resetAuditHealth: jest.fn(),
}));

const { createAttendance } = await import('../../controllers/attendanceController.js');

const CHILD = {
  id: 'ch-1', firstName: 'Gulnoza', lastName: 'Ergasheva',
  parentId: 'par-1', schoolId: 's-1', groupId: 'g-1',
};

const mkRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

const mkReq = (status) => ({
  body: { records: [{ childId: 'ch-1', date: '2026-08-14', status }] },
  user: { id: 't-1', role: 'teacher', schoolId: 's-1' },
});

beforeEach(() => {
  [mockCreateNotification, mockChildFindAll, mockAttendanceFindOne, mockAttendanceCreate,
    mockEmitToUser, mockValidateChildAccess, mockIsTeacherAssigned].forEach((m) => m.mockReset());
  mockChildFindAll.mockResolvedValue([CHILD]);
  mockValidateChildAccess.mockResolvedValue(CHILD);
  mockIsTeacherAssigned.mockResolvedValue(true);
  mockAttendanceFindOne.mockResolvedValue(null);
  mockAttendanceCreate.mockResolvedValue({ id: 'att-1' });
  mockCreateNotification.mockResolvedValue({ id: 'n-1' });
});

describe('D-35 — attendance feeds the parent notification centre', () => {
  it.each(['absent', 'sick', 'hospitalized', 'home_leave'])(
    'creates a parent notification for %s',
    async (status) => {
      await createAttendance(mkReq(status), mkRes());

      expect(mockCreateNotification).toHaveBeenCalledTimes(1);
      const args = mockCreateNotification.mock.calls[0];
      expect(args[0]).toBe('par-1');       // the parent, not the teacher
      expect(args[1]).toBe('ch-1');
      expect(args[2]).toBe('attendance');  // the type the enum migration added
      expect(typeof args[3]).toBe('string');
      expect(args[3].length).toBeGreaterThan(0);
      expect(args[7]).toBe('s-1');         // schoolId carried through
    }
  );

  it('creates NOTHING for present — this is the design, not a gap', async () => {
    await createAttendance(mkReq('present'), mkRes());

    expect(mockCreateNotification).not.toHaveBeenCalled();
    // the write itself still happened; only the notification is suppressed
    expect(mockAttendanceCreate).toHaveBeenCalled();
  });

  it('notifies nobody when the child has no parent', async () => {
    mockChildFindAll.mockResolvedValue([{ ...CHILD, parentId: null }]);
    mockValidateChildAccess.mockResolvedValue({ ...CHILD, parentId: null });

    await createAttendance(mkReq('absent'), mkRes());

    expect(mockCreateNotification).not.toHaveBeenCalled();
  });

  it('a failing notification never fails the attendance write', async () => {
    // L13 in the other direction: the record is the safeguarding artefact, and a
    // notification outage must not cost a school its attendance register.
    mockCreateNotification.mockRejectedValue(new Error('notification table down'));
    const res = mkRes();

    await createAttendance(mkReq('absent'), res);

    expect(mockAttendanceCreate).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it('the message names the child, so a parent of two knows which one', async () => {
    await createAttendance(mkReq('sick'), mkRes());

    const message = mockCreateNotification.mock.calls[0][4];
    expect(message).toContain('Gulnoza');
  });
});

/**
 * The trap this fix nearly fell into, pinned so it cannot come back.
 *
 * notifications.type and notifications.relatedType are SEPARATE postgres enums
 * with different value sets. The first version of this fix added 'attendance'
 * and 'journal' to `type` only. Every unit test passed, because they assert on
 * the arguments handed to createNotification — but on production every insert
 * would have failed on relatedType, and createNotification swallows its own
 * errors, so the notification centre would have stayed empty and green. That is
 * the D-27 pattern verbatim: a 201, a passing test, and nothing written.
 */
import fs from 'fs';
import path from 'path';

describe('D-35 — the two notification enums must stay in step', () => {
  const modelSrc = fs.readFileSync(
    path.resolve('models/Notification.js'), 'utf8'
  );

  const enumValues = (field) => {
    // the ENUM(...) that follows the named field
    const at = modelSrc.indexOf(`${field}: {`);
    expect(at).toBeGreaterThan(-1);
    const m = modelSrc.slice(at).match(/DataTypes\.ENUM\(([^)]*)\)/);
    expect(m).toBeTruthy();
    return m[1].split(',').map((s) => s.trim().replace(/^'|'$/g, '')).filter(Boolean);
  };

  it('every relatedType value is also a valid type value', () => {
    const types = enumValues('  type');
    const related = enumValues('relatedType');
    for (const v of related) expect(types).toContain(v);
  });

  it('both carry the values this fix introduced', () => {
    for (const field of ['  type', 'relatedType']) {
      expect(enumValues(field)).toEqual(expect.arrayContaining(['attendance', 'journal']));
    }
  });

  it('a migration exists that adds them to BOTH postgres enums', () => {
    const mig = fs.readFileSync(
      path.resolve('migrations/20260814000001-d35-notification-types.js'), 'utf8'
    );
    expect(mig).toContain('enum_notifications_type');
    expect(mig).toContain('enum_notifications_relatedType');
    expect(mig).toMatch(/ADD VALUE IF NOT EXISTS/);
  });
});
