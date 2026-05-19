import { jest } from '@jest/globals';

const mockAttCreate = jest.fn();
const mockAttFindByPk = jest.fn();
const mockAttFindAll = jest.fn();
const mockValidateChildAccess = jest.fn();

jest.unstable_mockModule('../models/ChildAttendance.js', () => ({
  default: {
    create: mockAttCreate,
    findByPk: mockAttFindByPk,
    findAll: mockAttFindAll,
  },
}));
jest.unstable_mockModule('../models/Child.js', () => ({
  default: { findAll: jest.fn() },
}));
jest.unstable_mockModule('../utils/schoolValidation.js', () => ({
  validateChildAccess: mockValidateChildAccess,
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
  body: { childId: 'child-1', date: '2026-05-19', status: 'present' },
  query: {},
  params: {},
});

describe('attendanceController — createAttendance', () => {
  beforeEach(() => jest.clearAllMocks());

  it('201 on valid payload with childSnapshot populated', async () => {
    const child = { id: 'child-1', firstName: 'Aisha', lastName: 'Karimova', schoolId: 'school-1' };
    mockValidateChildAccess.mockResolvedValue(child);
    mockAttCreate.mockResolvedValue({ id: 'att-1', childId: 'child-1', status: 'present', childSnapshot: { firstName: 'Aisha', lastName: 'Karimova', schoolId: 'school-1' } });

    const req = baseReq();
    const res = mkRes();
    await createAttendance(req, res);

    expect(res.status).toHaveBeenCalledWith(201);
    const createArg = mockAttCreate.mock.calls[0][0];
    expect(createArg.childSnapshot).toEqual({ firstName: 'Aisha', lastName: 'Karimova', schoolId: 'school-1' });
  });

  it('400 when childId missing', async () => {
    const req = { ...baseReq(), body: { date: '2026-05-19', status: 'present' } };
    const res = mkRes();
    await createAttendance(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('400 when date missing', async () => {
    const req = { ...baseReq(), body: { childId: 'c1', status: 'present' } };
    const res = mkRes();
    await createAttendance(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('400 when status is invalid', async () => {
    const req = { ...baseReq(), body: { childId: 'c1', date: '2026-05-19', status: 'walking' } };
    const res = mkRes();
    await createAttendance(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('400 when date is in the future', async () => {
    const req = { ...baseReq(), body: { childId: 'c1', date: '2099-01-01', status: 'present' } };
    const res = mkRes();
    await createAttendance(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('403 when child belongs to different school (IDOR guard)', async () => {
    // Revert-test baseline: without validateChildAccess, a child from another school
    // would succeed (200 response). With it in place: 403.
    // Pre-fix (access check removed): mockValidateChildAccess returns null →
    //   the code path would create without checking school → 201
    // Post-fix (access check present): validateChildAccess returns null → 403
    mockValidateChildAccess.mockResolvedValue(null);
    const req = baseReq();
    const res = mkRes();
    await createAttendance(req, res);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(mockAttCreate).not.toHaveBeenCalled();
  });

  it('409 on duplicate date+childId (SequelizeUniqueConstraintError)', async () => {
    const child = { id: 'child-1', firstName: 'Aisha', lastName: 'K', schoolId: 'school-1' };
    mockValidateChildAccess.mockResolvedValue(child);
    const err = new Error('conflict');
    err.name = 'SequelizeUniqueConstraintError';
    mockAttCreate.mockRejectedValue(err);
    const req = baseReq();
    const res = mkRes();
    await createAttendance(req, res);
    expect(res.status).toHaveBeenCalledWith(409);
  });

  it('500 when DB throws', async () => {
    const child = { id: 'child-1', firstName: 'A', lastName: 'B', schoolId: 'school-1' };
    mockValidateChildAccess.mockResolvedValue(child);
    mockAttCreate.mockRejectedValue(new Error('DB down'));
    const req = baseReq();
    const res = mkRes();
    await createAttendance(req, res);
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

  it('403 when attendance record belongs to different school', async () => {
    // Revert-test baseline: without the schoolId check, cross-school update succeeds.
    // With check: returns 403.
    mockAttFindByPk.mockResolvedValue({ id: 'att-1', schoolId: 'OTHER-school', save: jest.fn() });
    const req = { user: { schoolId: 'school-1' }, params: { id: 'att-1' }, body: { status: 'absent' } };
    const res = mkRes();
    await updateAttendance(req, res);
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('200 on valid update', async () => {
    const save = jest.fn().mockResolvedValue();
    mockAttFindByPk.mockResolvedValue({ id: 'att-1', schoolId: 'school-1', status: 'present', save });
    const req = { user: { schoolId: 'school-1' }, params: { id: 'att-1' }, body: { status: 'absent' } };
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
    mockAttFindByPk.mockResolvedValue({ id: 'att-1', schoolId: 'OTHER', destroy: jest.fn() });
    const req = { user: { schoolId: 'school-1' }, params: { id: 'att-1' } };
    const res = mkRes();
    await deleteAttendance(req, res);
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('200 on successful delete', async () => {
    const destroy = jest.fn().mockResolvedValue();
    mockAttFindByPk.mockResolvedValue({ id: 'att-1', schoolId: 'school-1', destroy });
    const req = { user: { schoolId: 'school-1' }, params: { id: 'att-1' } };
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
