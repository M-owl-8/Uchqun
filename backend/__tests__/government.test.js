import { jest } from '@jest/globals';

const mockSchoolCount = jest.fn();
const mockChildCount = jest.fn();
const mockUserCount = jest.fn();
const mockUserFindAll = jest.fn();
const mockUserFindOne = jest.fn();
const mockSchoolRatingFindAll = jest.fn();
const mockAIWarningCount = jest.fn();

jest.unstable_mockModule('../models/School.js', () => ({
  default: { count: mockSchoolCount, findAll: jest.fn() },
}));
jest.unstable_mockModule('../models/Child.js', () => ({
  default: { count: mockChildCount, findAll: jest.fn() },
}));
jest.unstable_mockModule('../models/User.js', () => ({
  default: { count: mockUserCount, findAll: mockUserFindAll, findOne: mockUserFindOne },
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

const { getOverview } = await import('../controllers/governmentController.js');

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
