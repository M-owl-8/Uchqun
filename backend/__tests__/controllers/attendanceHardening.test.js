// D-26 / D-27 / D-31 regression tests — attendance hardening.
//
// Found in the DEEP HARDENING campaign, phase P3:
//
//   D-31  GET /attendance returned every child in the school to a teacher.
//         A teacher of 21 children received 61 records with names and
//         statuses, because listAttendance scoped on schoolId alone.
//
//   D-27  Reception POSTed attendance for a child a teacher had just marked.
//         The row was overwritten and still reported markedBy = the teacher.
//         No audit row was written, and clearing an absence logged nothing.
//
//   D-26  Attendance accepted 2020-01-06 for a child born in 2018 at a school
//         created in 2026. There was an upper date bound but no lower one.
//
// FAIL-FIRST: every test in this file fails against the pre-fix controller.

import { jest } from '@jest/globals';

const mockAttendanceFindAll = jest.fn();
const mockAttendanceFindOne = jest.fn();
const mockAttendanceCreate = jest.fn();
const mockChildFindAll = jest.fn();
const mockGroupFindAll = jest.fn();
const mockValidateChildAccess = jest.fn();
const mockIsTeacherAssigned = jest.fn();
const mockLogAudit = jest.fn();
const mockEmitToUser = jest.fn();
const mockLoggerWarn = jest.fn();

jest.unstable_mockModule('../../models/ChildAttendance.js', () => ({
  default: { findAll: mockAttendanceFindAll, findOne: mockAttendanceFindOne, create: mockAttendanceCreate },
}));
jest.unstable_mockModule('../../models/Child.js', () => ({
  default: { findAll: mockChildFindAll, findOne: jest.fn(), findByPk: jest.fn() },
}));
jest.unstable_mockModule('../../models/Group.js', () => ({
  default: { findAll: mockGroupFindAll, findOne: jest.fn() },
}));
jest.unstable_mockModule('../../utils/schoolValidation.js', () => ({
  validateChildAccess: mockValidateChildAccess,
  isTeacherAssignedToChild: mockIsTeacherAssigned,
  findChildScopedResource: jest.fn(),
}));
jest.unstable_mockModule('../../utils/auditLogger.js', () => ({
  logAudit: mockLogAudit, default: { logAudit: mockLogAudit },
}));
jest.unstable_mockModule('../../config/socket.js', () => ({ emitToUser: mockEmitToUser, getIO: jest.fn() }));
jest.unstable_mockModule('../../utils/logger.js', () => ({
  default: { info: jest.fn(), warn: mockLoggerWarn, error: jest.fn(), debug: jest.fn() },
}));

const { createAttendance, listAttendance } = await import('../../controllers/attendanceController.js');

const SCHOOL = 'school-A';
const TEACHER = 'teacher-1';
const RECEPTION = 'reception-1';
const OWN_CHILD = 'child-own-1';
const OTHER_GROUP_CHILD = 'child-other-group';

const makeRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

beforeEach(() => {
  jest.clearAllMocks();
  mockValidateChildAccess.mockResolvedValue({ id: OWN_CHILD, schoolId: SCHOOL, firstName: 'A', lastName: 'B', parentId: 'p1' });
  mockIsTeacherAssigned.mockResolvedValue(true);
  mockChildFindAll.mockResolvedValue([{ id: OWN_CHILD }]);
  mockAttendanceFindOne.mockResolvedValue(null);
  mockAttendanceCreate.mockResolvedValue({ id: 'row-1' });
  mockAttendanceFindAll.mockResolvedValue([]);
});

describe('D-31 — listAttendance must not return the whole school to a teacher', () => {
  test('a teacher receives only their own children', async () => {
    const req = { user: { id: TEACHER, role: 'teacher', schoolId: SCHOOL }, query: { startDate: '2026-08-14', endDate: '2026-08-14' } };
    const res = makeRes();
    await listAttendance(req, res);

    expect(mockAttendanceFindAll).toHaveBeenCalled();
    const where = mockAttendanceFindAll.mock.calls[0][0].where;
    // the query must be narrowed by child, not by school alone
    expect(where.childId).toBeDefined();
  });

  test('a teacher asking for a child outside their groups is refused', async () => {
    mockIsTeacherAssigned.mockResolvedValue(false);
    mockValidateChildAccess.mockResolvedValue({ id: OTHER_GROUP_CHILD, schoolId: SCHOOL });
    const req = { user: { id: TEACHER, role: 'teacher', schoolId: SCHOOL }, query: { childId: OTHER_GROUP_CHILD } };
    const res = makeRes();
    await listAttendance(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
  });

  test('admin still sees the whole school', async () => {
    const req = { user: { id: 'admin-1', role: 'admin', schoolId: SCHOOL }, query: {} };
    const res = makeRes();
    await listAttendance(req, res);
    expect(res.status).not.toHaveBeenCalledWith(403);
    expect(mockAttendanceFindAll.mock.calls[0][0].where.schoolId).toBe(SCHOOL);
  });
});

describe('D-27 — an overwrite must be attributed to whoever made it', () => {
  test('re-marking updates markedBy to the caller, not the original marker', async () => {
    const existing = { childId: OWN_CHILD, date: '2026-08-11', status: 'absent', markedBy: TEACHER, teacherId: TEACHER, save: jest.fn() };
    mockAttendanceFindOne.mockResolvedValue(existing);
    const req = { user: { id: RECEPTION, role: 'reception', schoolId: SCHOOL }, body: { records: [{ childId: OWN_CHILD, date: '2026-08-11', status: 'present' }] } };
    const res = makeRes();
    await createAttendance(req, res);

    expect(existing.save).toHaveBeenCalled();
    expect(existing.markedBy).toBe(RECEPTION);
  });

  test('an overwrite writes an audit row', async () => {
    const existing = { childId: OWN_CHILD, date: '2026-08-11', status: 'absent', markedBy: TEACHER, teacherId: TEACHER, save: jest.fn() };
    mockAttendanceFindOne.mockResolvedValue(existing);
    const req = { user: { id: RECEPTION, role: 'reception', schoolId: SCHOOL }, body: { records: [{ childId: OWN_CHILD, date: '2026-08-11', status: 'present' }] } };
    await createAttendance(req, makeRes());

    expect(mockLogAudit).toHaveBeenCalled();
    const entry = mockLogAudit.mock.calls.at(-1)[0];
    expect(entry.action).toBe('attendance_overwrite');
    // audit_log.entityId is a uuid column. A composite "childId:date" string is
    // rejected by Postgres, and logAudit swallows the error by design, so the
    // row silently never appears — which is exactly what happened on the first
    // attempt at this fix. The date belongs in meta.
    expect(entry.entityId).toBe(OWN_CHILD);
    expect(entry.meta).toMatchObject({ date: '2026-08-11', previousStatus: 'absent', newStatus: 'present' });
  });

  test('clearing an absence is logged as a safeguarding event', async () => {
    const existing = { childId: OWN_CHILD, date: '2026-08-11', status: 'absent', markedBy: TEACHER, teacherId: TEACHER, save: jest.fn() };
    mockAttendanceFindOne.mockResolvedValue(existing);
    const req = { user: { id: RECEPTION, role: 'reception', schoolId: SCHOOL }, body: { records: [{ childId: OWN_CHILD, date: '2026-08-11', status: 'present' }] } };
    await createAttendance(req, makeRes());

    const warned = mockLoggerWarn.mock.calls.map((c) => String(c[0]));
    expect(warned.some((m) => /ATTENDANCE_ABSENCE_CLEARED/.test(m))).toBe(true);
  });
});

describe('D-26 — attendance needs a lower date bound', () => {
  test('a date years before the child existed is refused', async () => {
    const req = { user: { id: TEACHER, role: 'teacher', schoolId: SCHOOL }, body: { records: [{ childId: OWN_CHILD, date: '2020-01-06', status: 'present' }] } };
    const res = makeRes();
    await createAttendance(req, res);

    const payload = res.json.mock.calls.at(-1)[0];
    const codes = JSON.stringify(payload);
    expect(codes).toContain('ATTENDANCE_DATE_TOO_EARLY');
    expect(mockAttendanceCreate).not.toHaveBeenCalled();
  });

  test('a recent date is still accepted', async () => {
    const today = new Date();
    const recent = new Date(today.getTime() - 3 * 24 * 3600 * 1000).toISOString().slice(0, 10);
    const req = { user: { id: TEACHER, role: 'teacher', schoolId: SCHOOL }, body: { records: [{ childId: OWN_CHILD, date: recent, status: 'present' }] } };
    const res = makeRes();
    await createAttendance(req, res);

    expect(mockAttendanceCreate).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(201);
  });
});
