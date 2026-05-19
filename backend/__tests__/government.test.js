import { jest } from '@jest/globals';

const mockSchoolCount = jest.fn();
const mockChildCount = jest.fn();
const mockChildFindAndCountAll = jest.fn();
const mockUserCount = jest.fn();
const mockUserFindAll = jest.fn();
const mockUserFindOne = jest.fn();
const mockUserFindAndCountAll = jest.fn();
const mockSchoolRatingFindAll = jest.fn();
const mockAIWarningCount = jest.fn();

jest.unstable_mockModule('../models/School.js', () => ({
  default: { count: mockSchoolCount, findAll: jest.fn() },
}));
jest.unstable_mockModule('../models/Child.js', () => ({
  default: { count: mockChildCount, findAll: jest.fn(), findAndCountAll: mockChildFindAndCountAll },
}));
jest.unstable_mockModule('../models/User.js', () => ({
  default: { count: mockUserCount, findAll: mockUserFindAll, findOne: mockUserFindOne, findAndCountAll: mockUserFindAndCountAll },
}));
jest.unstable_mockModule('../models/SchoolRating.js', () => ({
  default: { findAll: mockSchoolRatingFindAll },
}));
jest.unstable_mockModule('../models/AIWarning.js', () => ({
  default: { count: mockAIWarningCount },
}));
jest.unstable_mockModule('../models/GovernmentStats.js', () => ({
  default: { create: jest.fn(), findAndCountAll: jest.fn() },
}));
jest.unstable_mockModule('../models/TherapyUsage.js', () => ({ default: {} }));
jest.unstable_mockModule('../utils/logger.js', () => ({
  default: { error: jest.fn(), info: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

const { getOverview, getStudentsStats, getTeachersList, getParentsList } = await import('../controllers/governmentController.js');

const mkRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('governmentController.getOverview', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns counts + averageRating + activeWarnings (no totalRevenue)', async () => {
    mockSchoolCount.mockResolvedValue(7);
    mockChildCount.mockResolvedValue(120);
    mockUserCount.mockResolvedValueOnce(15).mockResolvedValueOnce(80);
    mockSchoolRatingFindAll.mockResolvedValue([{ stars: 5 }, { stars: 3 }]);
    mockAIWarningCount.mockResolvedValue(2);

    const req = { query: {}, user: { role: 'government' } };
    const res = mkRes();
    await getOverview(req, res);

    const payload = res.json.mock.calls[0][0];
    expect(payload).toEqual(expect.objectContaining({
      success: true,
      data: expect.objectContaining({
        schools: 7,
        students: 120,
        teachers: 15,
        parents: 80,
        activeWarnings: 2,
      }),
    }));
    // The pivot deleted totalRevenue — confirm it's NOT present
    expect(payload.data).not.toHaveProperty('totalRevenue');
  });

  it('survives partial DB failures (returns 0 for failed counts)', async () => {
    mockSchoolCount.mockRejectedValue(new Error('boom'));
    mockChildCount.mockResolvedValue(10);
    mockUserCount.mockResolvedValueOnce(5).mockResolvedValueOnce(20);
    mockSchoolRatingFindAll.mockResolvedValue([]);
    mockAIWarningCount.mockResolvedValue(0);

    const req = { query: {}, user: { role: 'government' } };
    const res = mkRes();
    await getOverview(req, res);

    const payload = res.json.mock.calls[0][0];
    expect(payload.data.schools).toBe(0);
    expect(payload.data.students).toBe(10);
  });
});

describe('governmentController.getStudentsStats', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns paginated student list', async () => {
    const fakeStudents = [
      { toJSON: () => ({ id: 'c1', firstName: 'Ali' }), childSchool: { name: 'School A' }, parent: { firstName: 'B', lastName: 'C' } },
    ];
    mockChildFindAndCountAll.mockResolvedValue({ count: 1, rows: fakeStudents });
    const req = { query: {} };
    const res = mkRes();
    await getStudentsStats(req, res);
    expect(res.json).toHaveBeenCalled();
    const payload = res.json.mock.calls[0][0];
    expect(payload.success).toBe(true);
    expect(payload.data.total).toBe(1);
  });

  it('400 for invalid schoolId UUID', async () => {
    const req = { query: { schoolId: 'not-a-uuid' } };
    const res = mkRes();
    await getStudentsStats(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('500 on DB error', async () => {
    mockChildFindAndCountAll.mockRejectedValue(new Error('db fail'));
    const req = { query: {} };
    const res = mkRes();
    await getStudentsStats(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

describe('governmentController.getTeachersList', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns paginated teacher list', async () => {
    const fakeTeachers = [{ toJSON: () => ({ id: 't1', firstName: 'T' }) }];
    mockUserFindAndCountAll.mockResolvedValue({ count: 1, rows: fakeTeachers });
    const req = { query: {} };
    const res = mkRes();
    await getTeachersList(req, res);
    expect(res.json).toHaveBeenCalled();
    const payload = res.json.mock.calls[0][0];
    expect(payload.success).toBe(true);
    expect(payload.data.total).toBe(1);
  });

  it('500 on DB error', async () => {
    mockUserFindAndCountAll.mockRejectedValue(new Error('db fail'));
    const req = { query: {} };
    const res = mkRes();
    await getTeachersList(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

describe('governmentController.getParentsList', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns paginated parent list', async () => {
    const fakeParents = [{ toJSON: () => ({ id: 'p1', firstName: 'P' }) }];
    mockUserFindAndCountAll.mockResolvedValue({ count: 1, rows: fakeParents });
    const req = { query: {} };
    const res = mkRes();
    await getParentsList(req, res);
    expect(res.json).toHaveBeenCalled();
    const payload = res.json.mock.calls[0][0];
    expect(payload.success).toBe(true);
    expect(payload.data.total).toBe(1);
  });

  it('500 on DB error', async () => {
    mockUserFindAndCountAll.mockRejectedValue(new Error('db fail'));
    const req = { query: {} };
    const res = mkRes();
    await getParentsList(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});
