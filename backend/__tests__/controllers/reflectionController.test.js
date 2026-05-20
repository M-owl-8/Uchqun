import { jest } from '@jest/globals';

const mockReflectionFindOne = jest.fn();
const mockReflectionFindAll = jest.fn();
const mockReflectionCreate = jest.fn();

jest.unstable_mockModule('../../models/TeacherReflection.js', () => ({
  default: {
    findOne: mockReflectionFindOne,
    findAll: mockReflectionFindAll,
    create: mockReflectionCreate,
  },
}));
jest.unstable_mockModule('../../utils/logger.js', () => ({
  default: { error: jest.fn(), info: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

const { create, list } = await import('../../controllers/reflectionController.js');

const mkRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

const TODAY = new Date().toISOString().split('T')[0];
const FUTURE = '2099-01-01';

const baseReq = () => ({
  user: { id: 'teacher-1', schoolId: 'school-1', role: 'teacher' },
  body: {
    date: TODAY,
    content: 'This is a valid reflection with enough characters to pass.',
  },
});

// ─── create ───────────────────────────────────────────────────────────────────

describe('reflectionController — create', () => {
  beforeEach(() => jest.clearAllMocks());

  it('201 valid payload creates reflection', async () => {
    mockReflectionFindOne.mockResolvedValue(null);
    mockReflectionCreate.mockResolvedValue({ id: 'ref-1', ...baseReq().body });
    const res = mkRes();
    await create(baseReq(), res);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(mockReflectionCreate).toHaveBeenCalledWith(expect.objectContaining({
      teacherId: 'teacher-1',
      schoolId: 'school-1',
    }));
  });

  it('409 REFLECTION_ALREADY_EXISTS_FOR_DATE when (teacherId, date) already exists', async () => {
    mockReflectionFindOne.mockResolvedValue({ id: 'existing-ref' });
    const res = mkRes();
    await create(baseReq(), res);
    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json.mock.calls[0][0].error.code).toBe('REFLECTION_ALREADY_EXISTS_FOR_DATE');
    expect(mockReflectionCreate).not.toHaveBeenCalled();
  });

  it('403 REFLECTION_FORBIDDEN when role is reception', async () => {
    const req = { ...baseReq(), user: { ...baseReq().user, role: 'reception' } };
    const res = mkRes();
    await create(req, res);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json.mock.calls[0][0].error.code).toBe('REFLECTION_FORBIDDEN');
    expect(mockReflectionCreate).not.toHaveBeenCalled();
  });

  it('403 REFLECTION_FORBIDDEN when role is admin', async () => {
    const req = { ...baseReq(), user: { ...baseReq().user, role: 'admin' } };
    const res = mkRes();
    await create(req, res);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json.mock.calls[0][0].error.code).toBe('REFLECTION_FORBIDDEN');
    expect(mockReflectionCreate).not.toHaveBeenCalled();
  });

  it('400 REFLECTION_DATE_IN_FUTURE when date is in the future', async () => {
    const req = { ...baseReq(), body: { ...baseReq().body, date: FUTURE } };
    const res = mkRes();
    await create(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json.mock.calls[0][0].error.code).toBe('REFLECTION_DATE_IN_FUTURE');
  });

  it('400 REFLECTION_CONTENT_TOO_SHORT when content < 20 chars', async () => {
    const req = { ...baseReq(), body: { ...baseReq().body, content: 'too short' } };
    const res = mkRes();
    await create(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json.mock.calls[0][0].error.code).toBe('REFLECTION_CONTENT_TOO_SHORT');
  });

  it('500 when DB throws', async () => {
    mockReflectionFindOne.mockRejectedValue(new Error('DB down'));
    const res = mkRes();
    await create(baseReq(), res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

// ─── list ────────────────────────────────────────────────────────────────────

describe('reflectionController — list', () => {
  beforeEach(() => jest.clearAllMocks());

  it('200 teacher A cannot see teacher B records — where.teacherId scoped to own id', async () => {
    // Revert-test baseline: without teacherId filter, all reflections would be accessible.
    // Pre-fix (teacherId filter removed): findAll is called without teacherId → IDOR.
    // Post-fix: findAll is called with where.teacherId === req.user.id.
    mockReflectionFindAll.mockResolvedValue([{ id: 'ref-own' }]);
    const req = { user: { id: 'teacher-1', schoolId: 'school-1', role: 'teacher' } };
    const res = mkRes();
    await list(req, res);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    const call = mockReflectionFindAll.mock.calls[0][0];
    expect(call.where.teacherId).toBe('teacher-1');
  });

  it('200 returns empty array when teacher has no reflections', async () => {
    mockReflectionFindAll.mockResolvedValue([]);
    const req = { user: { id: 'new-teacher', schoolId: 'school-1', role: 'teacher' } };
    const res = mkRes();
    await list(req, res);
    expect(res.json).toHaveBeenCalledWith({ success: true, data: [] });
  });
});
