import { jest } from '@jest/globals';

const mockSchoolFindAll = jest.fn();

jest.unstable_mockModule('../models/User.js', () => ({
  default: { count: jest.fn().mockResolvedValue(0), findAll: jest.fn().mockResolvedValue([]) },
}));
jest.unstable_mockModule('../models/Child.js', () => ({
  default: { count: jest.fn().mockResolvedValue(0) },
}));
jest.unstable_mockModule('../models/Group.js', () => ({
  default: { count: jest.fn().mockResolvedValue(0) },
}));
jest.unstable_mockModule('../models/School.js', () => ({
  default: { findAll: mockSchoolFindAll, findAndCountAll: mockSchoolFindAll, count: jest.fn().mockResolvedValue(0) },
}));
jest.unstable_mockModule('../models/SchoolRating.js', () => ({
  default: { findAll: jest.fn().mockResolvedValue([]) },
}));
jest.unstable_mockModule('../models/Document.js', () => ({
  default: { count: jest.fn().mockResolvedValue(0) },
}));
jest.unstable_mockModule('../models/ParentActivity.js', () => ({
  default: { count: jest.fn().mockResolvedValue(0) },
}));
jest.unstable_mockModule('../models/ParentMeal.js', () => ({
  default: { count: jest.fn().mockResolvedValue(0) },
}));
jest.unstable_mockModule('../models/ParentMedia.js', () => ({
  default: { count: jest.fn().mockResolvedValue(0) },
}));
jest.unstable_mockModule('../models/Activity.js', () => ({
  default: { count: jest.fn().mockResolvedValue(0) },
}));
jest.unstable_mockModule('../models/Meal.js', () => ({
  default: { count: jest.fn().mockResolvedValue(0) },
}));
jest.unstable_mockModule('../models/Media.js', () => ({
  default: { count: jest.fn().mockResolvedValue(0) },
}));
jest.unstable_mockModule('../models/TherapyUsage.js', () => ({
  default: { count: jest.fn().mockResolvedValue(0) },
}));
jest.unstable_mockModule('../utils/logger.js', () => ({
  default: { error: jest.fn(), info: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

const { getAllSchools, getSchoolRatings, getStatistics } = await import('../controllers/admin/adminStatsController.js');

const mkRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('admin/adminStatsController.getAllSchools', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns schools with computed average + count', async () => {
    mockSchoolFindAll.mockResolvedValue({
      rows: [
        {
          toJSON: () => ({ id: 's1', name: 'A' }),
          ratings: [{ stars: 5 }, { stars: 3 }],
        },
        {
          toJSON: () => ({ id: 's2', name: 'B' }),
          ratings: [],
        },
      ],
      count: 2,
    });
    const req = { query: {} };
    const res = mkRes();
    await getAllSchools(req, res);
    const result = res.json.mock.calls[0][0];
    expect(result.total).toBe(2);
    expect(result.data[0].summary).toEqual({ average: 4.0, count: 2 });
    expect(result.data[1].summary).toEqual({ average: 0, count: 0 });
  });

  it('500 on DB error', async () => {
    mockSchoolFindAll.mockRejectedValue(new Error('boom'));
    const req = {};
    const res = mkRes();
    await getAllSchools(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

describe('admin/adminStatsController.getStatistics', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Ensure School.findAll returns an array (not the paginated shape used by getAllSchools)
    mockSchoolFindAll.mockResolvedValue([]);
  });

  it('returns 401 when no user on request', async () => {
    const req = { user: null };
    const res = mkRes();
    await getStatistics(req, res);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('returns 401 when user has no id', async () => {
    const req = { user: {} };
    const res = mkRes();
    await getStatistics(req, res);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('returns success with zeroed stats when admin has no receptions', async () => {
    const req = { user: { id: 'a1', role: 'admin', schoolId: 's1' } };
    const res = mkRes();
    await getStatistics(req, res);
    expect(res.json).toHaveBeenCalled();
    const payload = res.json.mock.calls[0][0];
    expect(payload.success).toBe(true);
    expect(payload.data).toHaveProperty('receptions');
    expect(payload.data).toHaveProperty('teachers');
    expect(payload.data).toHaveProperty('children');
  });
});

describe('admin/adminStatsController.getSchoolRatings — BACKEND-007b', () => {
  beforeEach(() => jest.clearAllMocks());

  it('500 when primary SQL query fails (inner catch — BACKEND-007b)', async () => {
    // SchoolRating.sequelize is undefined in the mock → TypeError when inner try calls
    // SchoolRating.sequelize.query() → inner catch fires.
    // Pre-fix:  inner catch returned res.json({ success:true, data:[] }) → HTTP 200 (WRONG)
    // Post-fix: inner catch returns res.status(500).json({ success:false, error:... })
    const req = { user: { id: 'a1', schoolId: 's1' } };
    const res = mkRes();
    await getSchoolRatings(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
    const payload = res.json.mock.calls[0][0];
    expect(payload.success).toBe(false);
  });
});
