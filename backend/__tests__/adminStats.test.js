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
  default: { findAll: mockSchoolFindAll, count: jest.fn().mockResolvedValue(0) },
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
jest.unstable_mockModule('../models/TherapyUsage.js', () => ({
  default: { count: jest.fn().mockResolvedValue(0) },
}));
jest.unstable_mockModule('../utils/logger.js', () => ({
  default: { error: jest.fn(), info: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

const { getAllSchools } = await import('../controllers/admin/adminStatsController.js');

const mkRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('admin/adminStatsController.getAllSchools', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns schools with computed average + count', async () => {
    mockSchoolFindAll.mockResolvedValue([
      {
        toJSON: () => ({ id: 's1', name: 'A' }),
        ratings: [{ stars: 5 }, { stars: 3 }],
      },
      {
        toJSON: () => ({ id: 's2', name: 'B' }),
        ratings: [],
      },
    ]);
    const req = {};
    const res = mkRes();
    await getAllSchools(req, res);
    const data = res.json.mock.calls[0][0].data;
    expect(data[0].summary).toEqual({ average: 4.0, count: 2 });
    expect(data[1].summary).toEqual({ average: 0, count: 0 });
  });

  it('500 on DB error', async () => {
    mockSchoolFindAll.mockRejectedValue(new Error('boom'));
    const req = {};
    const res = mkRes();
    await getAllSchools(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});
