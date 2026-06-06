// PP-ATTENDANCE-SURFACE — parent attendance scoping regression tests.
//
// These tests lock the privacy boundary on minors' records:
//   - A parent reads only THEIR OWN child's attendance (resolved via
//     Child.parentId — the same canonical chain TP-PARENT-ASSIGNMENT
//     repairs).
//   - Passing ?childId=<another parent's child> -> 403 ATTENDANCE_CHILD_NOT_ACCESSIBLE.
//   - Calling as a non-parent role -> 403 ATTENDANCE_PARENT_ONLY (defense-in-depth
//     in addition to the requireParent middleware at the route level).

import { jest } from '@jest/globals';

const mockChildFindAll = jest.fn();
const mockChildAttendanceFindAll = jest.fn();

jest.unstable_mockModule('../../models/Child.js', () => ({ default: { findAll: mockChildFindAll } }));
jest.unstable_mockModule('../../models/ChildAttendance.js', () => ({ default: { findAll: mockChildAttendanceFindAll } }));
jest.unstable_mockModule('../../utils/logger.js', () => ({ default: { error: jest.fn(), info: jest.fn(), warn: jest.fn() } }));
jest.unstable_mockModule('../../utils/schoolValidation.js', () => ({
  validateChildAccess: jest.fn(),
  isTeacherAssignedToChild: jest.fn(),
}));

const { getMyChildAttendance } = await import('../../controllers/attendanceController.js');

const makeRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('getMyChildAttendance — parent scoping', () => {
  beforeEach(() => {
    mockChildFindAll.mockReset();
    mockChildAttendanceFindAll.mockReset();
  });

  it('rejects non-parent role with 403 ATTENDANCE_PARENT_ONLY (defense-in-depth)', async () => {
    const req = { user: { id: 'teacher-1', role: 'teacher' }, query: {} };
    const res = makeRes();
    await getMyChildAttendance(req, res);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      success: false,
      error: expect.objectContaining({ code: 'ATTENDANCE_PARENT_ONLY' }),
    }));
    expect(mockChildFindAll).not.toHaveBeenCalled();
  });

  it('returns empty data when the parent has no linked children', async () => {
    mockChildFindAll.mockResolvedValue([]);
    const req = { user: { id: 'parent-orphan', role: 'parent' }, query: {} };
    const res = makeRes();
    await getMyChildAttendance(req, res);
    expect(mockChildFindAll).toHaveBeenCalledWith(expect.objectContaining({
      where: { parentId: 'parent-orphan' },
    }));
    expect(mockChildAttendanceFindAll).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: { records: [], children: [] },
    });
  });

  it('returns own child attendance scoped to Child.parentId', async () => {
    mockChildFindAll.mockResolvedValue([
      { id: 'child-A1', firstName: 'A1', lastName: 'Test', dateOfBirth: '2018-01-01' },
      { id: 'child-A2', firstName: 'A2', lastName: 'Test', dateOfBirth: '2019-01-01' },
    ]);
    mockChildAttendanceFindAll.mockResolvedValue([
      { id: 'r1', childId: 'child-A1', date: '2026-06-05', status: 'present', note: null, createdAt: new Date() },
    ]);
    const req = { user: { id: 'parent-A', role: 'parent' }, query: {} };
    const res = makeRes();
    await getMyChildAttendance(req, res);
    expect(mockChildAttendanceFindAll).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        childId: expect.objectContaining({ [Symbol.for('eq.in') === undefined ? expect.anything() : expect.anything()]: expect.anything() }),
      }),
    }));
    // tightening: directly inspect call args
    const callArgs = mockChildAttendanceFindAll.mock.calls[0][0];
    expect(callArgs.where.childId).toBeDefined();
    // childId where clause uses Op.in with parent's child ids
    const inValues = Object.values(callArgs.where.childId)[0];
    expect(inValues).toEqual(expect.arrayContaining(['child-A1', 'child-A2']));
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      success: true,
      data: expect.objectContaining({
        records: expect.any(Array),
        children: expect.arrayContaining([expect.objectContaining({ id: 'child-A1' })]),
      }),
    }));
  });

  it('CRITICAL — parent A passing parent B\'s child as ?childId is denied 403 ATTENDANCE_CHILD_NOT_ACCESSIBLE', async () => {
    // Parent A has child-A1 only; not child-B1 (which belongs to parent B).
    mockChildFindAll.mockResolvedValue([
      { id: 'child-A1', firstName: 'A1', lastName: 'Test', dateOfBirth: '2018-01-01' },
    ]);
    const req = {
      user: { id: 'parent-A', role: 'parent' },
      query: { childId: 'child-B1' }, // someone else's child
    };
    const res = makeRes();
    await getMyChildAttendance(req, res);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      success: false,
      error: expect.objectContaining({ code: 'ATTENDANCE_CHILD_NOT_ACCESSIBLE' }),
    }));
    expect(mockChildAttendanceFindAll).not.toHaveBeenCalled(); // never query the DB for someone else's records
  });

  it('passing an own childId narrows the scope to that single child', async () => {
    mockChildFindAll.mockResolvedValue([
      { id: 'child-A1', firstName: 'A1', lastName: 'Test', dateOfBirth: '2018-01-01' },
      { id: 'child-A2', firstName: 'A2', lastName: 'Test', dateOfBirth: '2019-01-01' },
    ]);
    mockChildAttendanceFindAll.mockResolvedValue([]);
    const req = {
      user: { id: 'parent-A', role: 'parent' },
      query: { childId: 'child-A1' },
    };
    const res = makeRes();
    await getMyChildAttendance(req, res);
    const callArgs = mockChildAttendanceFindAll.mock.calls[0][0];
    expect(callArgs.where.childId).toBe('child-A1');
  });

  it('startDate + endDate produce a between() range filter', async () => {
    mockChildFindAll.mockResolvedValue([
      { id: 'child-A1', firstName: 'A1', lastName: 'Test', dateOfBirth: '2018-01-01' },
    ]);
    mockChildAttendanceFindAll.mockResolvedValue([]);
    const req = {
      user: { id: 'parent-A', role: 'parent' },
      query: { startDate: '2026-06-01', endDate: '2026-06-07' },
    };
    const res = makeRes();
    await getMyChildAttendance(req, res);
    const callArgs = mockChildAttendanceFindAll.mock.calls[0][0];
    const dateClause = callArgs.where.date;
    expect(dateClause).toBeDefined();
    const between = Object.values(dateClause)[0];
    expect(between).toEqual(['2026-06-01', '2026-06-07']);
  });

  it('a single ?date passes through as equality', async () => {
    mockChildFindAll.mockResolvedValue([
      { id: 'child-A1', firstName: 'A1', lastName: 'Test', dateOfBirth: '2018-01-01' },
    ]);
    mockChildAttendanceFindAll.mockResolvedValue([]);
    const req = {
      user: { id: 'parent-A', role: 'parent' },
      query: { date: '2026-06-05' },
    };
    const res = makeRes();
    await getMyChildAttendance(req, res);
    const callArgs = mockChildAttendanceFindAll.mock.calls[0][0];
    expect(callArgs.where.date).toBe('2026-06-05');
  });

  it('on DB error returns 500 ATTENDANCE_FETCH_FAILED', async () => {
    mockChildFindAll.mockRejectedValue(new Error('connection lost'));
    const req = { user: { id: 'parent-A', role: 'parent' }, query: {} };
    const res = makeRes();
    await getMyChildAttendance(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      success: false,
      error: expect.objectContaining({ code: 'ATTENDANCE_FETCH_FAILED' }),
    }));
  });
});
