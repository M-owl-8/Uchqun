import { jest } from '@jest/globals';

const mockSchoolFindOne = jest.fn();
const mockChildCount = jest.fn();
const mockUserCount = jest.fn();
const mockSchoolRatingFindAll = jest.fn();
const mockLogAudit = jest.fn();

jest.unstable_mockModule('../../models/School.js', () => ({
  default: { findOne: mockSchoolFindOne, findByPk: jest.fn() },
}));
jest.unstable_mockModule('../../models/Child.js', () => ({
  default: { count: mockChildCount },
}));
jest.unstable_mockModule('../../models/User.js', () => ({
  default: { count: mockUserCount, findByPk: jest.fn() },
}));
jest.unstable_mockModule('../../models/SchoolRating.js', () => ({
  default: { findAll: mockSchoolRatingFindAll },
}));
jest.unstable_mockModule('../../models/GovernmentStats.js', () => ({ default: {} }));
jest.unstable_mockModule('../../models/AIWarning.js', () => ({ default: {} }));
jest.unstable_mockModule('../../utils/logger.js', () => ({
  default: { error: jest.fn(), info: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));
jest.unstable_mockModule('../../utils/auditLogger.js', () => ({
  logAudit: mockLogAudit,
}));
jest.unstable_mockModule('../../utils/governmentLevel.js', () => ({
  getGovernmentLevel: jest.fn().mockReturnValue('standard'),
  sortSchoolsByRating: jest.fn(),
  computeRatingScore: jest.fn(),
  computeAverageRating: jest.fn().mockReturnValue({ average: 4.0, count: 5 }),
}));
jest.unstable_mockModule('../../utils/pagination.js', () => ({
  parsePagination: jest.fn().mockReturnValue({ limit: 50, offset: 0 }),
}));
jest.unstable_mockModule('../../services/schoolRatingService.js', () => ({
  getSchoolRatingAggregated: jest.fn().mockResolvedValue({
    parent: { avg: null, count: 0 },
    government: null,
    cumulative: { avg: null, isPartial: false },
  }),
  getSchoolRatingsBatch: jest.fn().mockResolvedValue({}),
}));

const { getSchoolById } = await import('../../controllers/governmentController.js');
const { requireGovernment } = await import('../../middleware/auth.js');

const mkRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

const govReq = (id) => ({
  user: { id: 'g1', role: 'government' },
  params: { id },
  query: {},
  isGlobalAccess: true,
  govType: 'main',
});

const SCHOOL_ID = '00000000-0000-0000-0000-000000000001';
const INVALID_ID = 'not-a-uuid';

describe('governmentController.getSchoolById', () => {
  beforeEach(() => jest.clearAllMocks());

  it('BC-01: returns 200 with isActive=false for archived school (core fix)', async () => {
    const archivedSchool = {
      id: SCHOOL_ID, name: 'Test School', isActive: false, toJSON: () => ({ id: SCHOOL_ID, isActive: false }),
    };
    mockSchoolFindOne.mockResolvedValue(archivedSchool);
    mockChildCount.mockResolvedValue(10);
    mockUserCount.mockResolvedValue(2);
    mockSchoolRatingFindAll.mockResolvedValue([]);

    const res = mkRes();
    await getSchoolById(govReq(SCHOOL_ID), res);

    expect(mockSchoolFindOne).toHaveBeenCalledWith({ where: { id: SCHOOL_ID } });
    expect(mockSchoolFindOne.mock.calls[0][0].where).not.toHaveProperty('isActive');
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    const payload = res.json.mock.calls[0][0];
    expect(payload.data.isActive).toBe(false);
  });

  it('returns 200 with isActive=true for active school', async () => {
    const activeSchool = {
      id: SCHOOL_ID, name: 'Active School', isActive: true, toJSON: () => ({ id: SCHOOL_ID, isActive: true }),
    };
    mockSchoolFindOne.mockResolvedValue(activeSchool);
    mockChildCount.mockResolvedValue(20);
    mockUserCount.mockResolvedValue(3);
    mockSchoolRatingFindAll.mockResolvedValue([]);

    const res = mkRes();
    await getSchoolById(govReq(SCHOOL_ID), res);

    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    expect(res.json.mock.calls[0][0].data.isActive).toBe(true);
  });

  it('returns 404 when school does not exist', async () => {
    mockSchoolFindOne.mockResolvedValue(null);

    const res = mkRes();
    await getSchoolById(govReq(SCHOOL_ID), res);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('returns 400 for invalid UUID', async () => {
    const res = mkRes();
    await getSchoolById(govReq(INVALID_ID), res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(mockSchoolFindOne).not.toHaveBeenCalled();
  });

  it('returns 500 on unexpected DB error', async () => {
    mockSchoolFindOne.mockRejectedValue(new Error('db down'));

    const res = mkRes();
    await getSchoolById(govReq(SCHOOL_ID), res);

    expect(res.status).toHaveBeenCalledWith(500);
  });
});

describe('getSchoolById route scoping — requireGovernment rejects non-government roles', () => {
  it('admin role receives 403 from requireGovernment', () => {
    const req = { user: { id: 'a1', role: 'admin' } };
    const res = mkRes();
    const next = jest.fn();

    requireGovernment(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it('teacher role receives 403 from requireGovernment', () => {
    const req = { user: { id: 't1', role: 'teacher' } };
    const res = mkRes();
    const next = jest.fn();

    requireGovernment(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it('government role passes through requireGovernment', () => {
    const req = { user: { id: 'g1', role: 'government' } };
    const res = mkRes();
    const next = jest.fn();

    requireGovernment(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });
});
