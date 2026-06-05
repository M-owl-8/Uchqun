import { jest } from '@jest/globals';

const mockAttCreate = jest.fn();
const mockAttFindByPk = jest.fn();
const mockAttFindAll = jest.fn();
const mockAttFindOne = jest.fn();
const mockValidateChildAccess = jest.fn();

jest.unstable_mockModule('../models/ChildAttendance.js', () => ({
  default: {
    create: mockAttCreate,
    findByPk: mockAttFindByPk,
    findAll: mockAttFindAll,
    findOne: mockAttFindOne,
  },
}));
jest.unstable_mockModule('../models/Child.js', () => ({
  default: { findAll: jest.fn() },
}));
jest.unstable_mockModule('../utils/schoolValidation.js', () => ({
  validateChildAccess: mockValidateChildAccess,
  isTeacherAssignedToChild: jest.fn().mockResolvedValue(true),
}));
jest.unstable_mockModule('../utils/logger.js', () => ({
  default: { error: jest.fn(), info: jest.fn(), warn: jest.fn() },
}));

const { createAttendance, listAttendance, updateAttendance, deleteAttendance } =
  await import('../controllers/attendanceController.js');

const mkRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

const baseReq = () => ({
  user: { id: 'teacher-1', schoolId: 'school-1', role: 'teacher' },
  body: { records: [{ childId: 'child-1', date: '2026-05-19', status: 'present' }] },
  query: {},
  params: {},
});

describe('attendanceController — createAttendance (batch)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAttFindOne.mockResolvedValue(null); // default: no existing record
  });

  it('201 on valid batch payload — creates new record with childSnapshot', async () => {
    const child = { id: 'child-1', firstName: 'Aisha', lastName: 'Karimova', schoolId: 'school-1' };
    mockValidateChildAccess.mockResolvedValue(child);
    mockAttCreate.mockResolvedValue({ id: 'att-1', childId: 'child-1', status: 'present' });

    const req = baseReq();
    const res = mkRes();
    await createAttendance(req, res);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    const createArg = mockAttCreate.mock.calls[0][0];
    expect(createArg.childSnapshot).toEqual({ firstName: 'Aisha', lastName: 'Karimova', schoolId: 'school-1' });
  });

  it('400 when records array missing', async () => {
    const req = { ...baseReq(), body: {} };
    const res = mkRes();
    await createAttendance(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json.mock.calls[0][0].error.code).toBe('ATTENDANCE_RECORDS_REQUIRED');
  });

  it('400 when records is an empty array', async () => {
    const req = { ...baseReq(), body: { records: [] } };
    const res = mkRes();
    await createAttendance(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('201 with saved=0 skipped=N when all records are unset', async () => {
    const req = { ...baseReq(), body: { records: [{ childId: 'c1', date: '2026-05-19', status: 'unset' }] } };
    const res = mkRes();
    await createAttendance(req, res);
    expect(res.status).toHaveBeenCalledWith(201);
    const data = res.json.mock.calls[0][0].data;
    expect(data.saved).toBe(0);
    expect(data.skipped).toBe(1);
  });

  it('400 when status is invalid (late is no longer valid)', async () => {
    const child = { id: 'c1', firstName: 'A', lastName: 'B', schoolId: 'school-1' };
    mockValidateChildAccess.mockResolvedValue(child);
    const req = { ...baseReq(), body: { records: [{ childId: 'c1', date: '2026-05-19', status: 'late' }] } };
    const res = mkRes();
    await createAttendance(req, res);
    // late is not in VALID_STATUSES → per-record error → saved=0, toSave.length>0 → 400
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json.mock.calls[0][0].error.code).toBe('ATTENDANCE_INVALID_STATUS');
  });

  it('400 when date is in the future', async () => {
    const child = { id: 'c1', firstName: 'A', lastName: 'B', schoolId: 'school-1' };
    mockValidateChildAccess.mockResolvedValue(child);
    const req = { ...baseReq(), body: { records: [{ childId: 'c1', date: '2099-01-01', status: 'present' }] } };
    const res = mkRes();
    await createAttendance(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json.mock.calls[0][0].error.code).toBe('ATTENDANCE_FUTURE_DATE');
  });

  it('400 when child access denied (IDOR guard)', async () => {
    mockValidateChildAccess.mockResolvedValue(null);
    const req = baseReq();
    const res = mkRes();
    await createAttendance(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json.mock.calls[0][0].error.code).toBe('ATTENDANCE_ACCESS_DENIED');
    expect(mockAttCreate).not.toHaveBeenCalled();
  });

  it('upserts (saves to existing record) instead of creating duplicate', async () => {
    const child = { id: 'child-1', firstName: 'A', lastName: 'B', schoolId: 'school-1' };
    mockValidateChildAccess.mockResolvedValue(child);
    const save = jest.fn().mockResolvedValue();
    mockAttFindOne.mockResolvedValue({ id: 'existing', status: 'absent', save });

    const req = baseReq();
    const res = mkRes();
    await createAttendance(req, res);

    expect(save).toHaveBeenCalled();
    expect(mockAttCreate).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json.mock.calls[0][0].data.saved).toBe(1);
  });

  it('partial success: saved=1 error=1 → 201 (not 400)', async () => {
    const child = { id: 'child-1', firstName: 'A', lastName: 'B', schoolId: 'school-1' };
    mockValidateChildAccess
      .mockResolvedValueOnce(child)  // first record OK
      .mockResolvedValueOnce(null);  // second record denied
    mockAttFindOne.mockResolvedValue(null);
    mockAttCreate.mockResolvedValue({ id: 'att-1' });

    const req = {
      ...baseReq(),
      body: {
        records: [
          { childId: 'child-1', date: '2026-05-19', status: 'present' },
          { childId: 'child-2', date: '2026-05-19', status: 'absent' },
        ],
      },
    };
    const res = mkRes();
    await createAttendance(req, res);

    expect(res.status).toHaveBeenCalledWith(201);
    const data = res.json.mock.calls[0][0].data;
    expect(data.saved).toBe(1);
    expect(data.errors.length).toBe(1);
  });

  it('400 when DB throws on findOne (per-record catch)', async () => {
    const child = { id: 'child-1', firstName: 'A', lastName: 'B', schoolId: 'school-1' };
    mockValidateChildAccess.mockResolvedValue(child);
    mockAttFindOne.mockRejectedValue(new Error('DB down'));

    const req = baseReq();
    const res = mkRes();
    await createAttendance(req, res);
    // saved=0, toSave.length=1, errors=[ATTENDANCE_SAVE_FAILED] → 400
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('500 when outer try/catch is hit', async () => {
    // Simulate an error that escapes the for-loop (e.g., records.filter throws)
    const req = { ...baseReq(), body: { records: null } }; // null → not array → 400 before loop
    // Actually force 500 by making the body getter throw
    const badReq = { user: { id: 't1', schoolId: 's1', role: 'teacher' }, query: {}, params: {} };
    Object.defineProperty(badReq, 'body', { get() { throw new Error('unexpected'); } });
    const res = mkRes();
    await createAttendance(badReq, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

describe('attendanceController — listAttendance', () => {
  beforeEach(() => jest.clearAllMocks());

  it('200 returns records for teacher school only', async () => {
    mockAttFindAll.mockResolvedValue([{ id: 'att-1' }]);
    const req = { user: { id: 't1', schoolId: 'school-1' }, query: {} };
    const res = mkRes();
    await listAttendance(req, res);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    const where = mockAttFindAll.mock.calls[0][0].where;
    expect(where.schoolId).toBe('school-1');
  });

  it('500 when DB throws', async () => {
    mockAttFindAll.mockRejectedValue(new Error('boom'));
    const req = { user: { id: 't1', schoolId: 'school-1' }, query: {} };
    const res = mkRes();
    await listAttendance(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

describe('attendanceController — updateAttendance', () => {
  beforeEach(() => jest.clearAllMocks());

  it('400 when neither status nor note provided', async () => {
    const req = { user: { schoolId: 'school-1' }, params: { id: 'att-1' }, body: {} };
    const res = mkRes();
    await updateAttendance(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('400 when status is invalid (excused is no longer valid)', async () => {
    const req = { user: { schoolId: 'school-1' }, params: { id: 'att-1' }, body: { status: 'excused' } };
    const res = mkRes();
    await updateAttendance(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('403 when attendance record belongs to different school', async () => {
    mockAttFindByPk.mockResolvedValue({ id: 'att-1', childId: 'child-x', schoolId: 'OTHER-school', save: jest.fn() });
    mockValidateChildAccess.mockResolvedValue(null);
    const req = { user: { schoolId: 'school-1' }, params: { id: 'att-1' }, body: { status: 'absent' } };
    const res = mkRes();
    await updateAttendance(req, res);
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('200 on valid update with new status values', async () => {
    const child = { id: 'child-1', schoolId: 'school-1' };
    const save = jest.fn().mockResolvedValue();
    mockAttFindByPk.mockResolvedValue({ id: 'att-1', childId: 'child-1', schoolId: 'school-1', status: 'present', save });
    mockValidateChildAccess.mockResolvedValue(child);
    const req = { user: { schoolId: 'school-1', role: 'teacher' }, params: { id: 'att-1' }, body: { status: 'home_leave' } };
    const res = mkRes();
    await updateAttendance(req, res);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });

  it('500 when DB throws', async () => {
    mockAttFindByPk.mockRejectedValue(new Error('DB down'));
    const req = { user: { schoolId: 'school-1' }, params: { id: 'att-1' }, body: { status: 'absent' } };
    const res = mkRes();
    await updateAttendance(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

describe('attendanceController — deleteAttendance', () => {
  beforeEach(() => jest.clearAllMocks());

  it('403 when record belongs to different school', async () => {
    mockAttFindByPk.mockResolvedValue({ id: 'att-1', childId: 'child-x', schoolId: 'OTHER', destroy: jest.fn() });
    mockValidateChildAccess.mockResolvedValue(null);
    const req = { user: { schoolId: 'school-1' }, params: { id: 'att-1' } };
    const res = mkRes();
    await deleteAttendance(req, res);
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('200 on successful delete', async () => {
    const child = { id: 'child-1', schoolId: 'school-1' };
    const destroy = jest.fn().mockResolvedValue();
    mockAttFindByPk.mockResolvedValue({ id: 'att-1', childId: 'child-1', schoolId: 'school-1', destroy });
    mockValidateChildAccess.mockResolvedValue(child);
    const req = { user: { schoolId: 'school-1', role: 'teacher' }, params: { id: 'att-1' } };
    const res = mkRes();
    await deleteAttendance(req, res);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });

  it('500 when DB throws', async () => {
    mockAttFindByPk.mockRejectedValue(new Error('boom'));
    const req = { user: { schoolId: 'school-1' }, params: { id: 'att-1' } };
    const res = mkRes();
    await deleteAttendance(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});
