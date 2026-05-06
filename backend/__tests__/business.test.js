import { jest } from '@jest/globals';

const mockUserCount = jest.fn();
const mockUserFindAndCount = jest.fn();
const mockUserFindAll = jest.fn();
const mockSchoolCount = jest.fn();
const mockTUsageCount = jest.fn();
const mockTUsageFindAll = jest.fn();
const mockBStatsCreate = jest.fn();
const mockBStatsFindAndCount = jest.fn();

jest.unstable_mockModule('../models/User.js', () => ({
  default: {
    count: mockUserCount,
    findAndCountAll: mockUserFindAndCount,
    findAll: mockUserFindAll,
  },
}));
jest.unstable_mockModule('../models/School.js', () => ({
  default: { count: mockSchoolCount },
}));
jest.unstable_mockModule('../models/TherapyUsage.js', () => ({
  default: { count: mockTUsageCount, findAll: mockTUsageFindAll },
}));
jest.unstable_mockModule('../models/BusinessStats.js', () => ({
  default: { create: mockBStatsCreate, findAndCountAll: mockBStatsFindAndCount },
}));
jest.unstable_mockModule('../utils/logger.js', () => ({
  default: { error: jest.fn(), info: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

const { getOverview, getUsersStats, getUsageStats, generateStats } = await import('../controllers/businessController.js');

const mkRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('businessController', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('getOverview', () => {
    it('returns counts of users, schools, therapy usages (no revenue)', async () => {
      mockUserCount.mockResolvedValue(40);
      mockSchoolCount.mockResolvedValue(5);
      mockTUsageCount.mockResolvedValue(11);
      const req = { user: { id: 'b1', role: 'business' } };
      const res = mkRes();
      await getOverview(req, res);
      const payload = res.json.mock.calls[0][0];
      expect(payload.data).toEqual({ totalUsers: 40, totalSchools: 5, therapyUsages: 11 });
      expect(payload.data).not.toHaveProperty('totalRevenue');
    });
  });

  describe('getUsersStats', () => {
    it('groups users by role', async () => {
      mockUserFindAndCount.mockResolvedValue({
        count: 3,
        rows: [
          { role: 'parent' }, { role: 'parent' }, { role: 'teacher' },
        ],
      });
      const req = { query: {} };
      const res = mkRes();
      await getUsersStats(req, res);
      const payload = res.json.mock.calls[0][0];
      expect(payload.data.byRole).toEqual({ parent: 2, teacher: 1 });
    });

    it('applies date filters', async () => {
      mockUserFindAndCount.mockResolvedValue({ count: 0, rows: [] });
      const req = { query: { startDate: '2026-01-01', endDate: '2026-12-31' } };
      const res = mkRes();
      await getUsersStats(req, res);
      const where = mockUserFindAndCount.mock.calls[0][0].where;
      expect(where.createdAt).toBeDefined();
    });
  });

  describe('getUsageStats', () => {
    it('groups by therapyId', async () => {
      mockTUsageFindAll.mockResolvedValue([
        { therapyId: 't1' }, { therapyId: 't1' }, { therapyId: 't2' },
      ]);
      const req = { query: {} };
      const res = mkRes();
      await getUsageStats(req, res);
      const payload = res.json.mock.calls[0][0];
      expect(payload.data.totalUsages).toBe(3);
      expect(payload.data.byTherapy).toEqual({ t1: 2, t2: 1 });
    });
  });

  describe('generateStats', () => {
    it('400 when fields missing', async () => {
      const req = { user: { id: 'b1' }, body: {} };
      const res = mkRes();
      await generateStats(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('400 when statType invalid', async () => {
      const req = {
        user: { id: 'b1' },
        body: { statType: 'revenue', period: 'monthly', periodStart: '2026-01-01', periodEnd: '2026-01-31' },
      };
      const res = mkRes();
      await generateStats(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('persists overview stat', async () => {
      mockUserCount.mockResolvedValue(20);
      mockSchoolCount.mockResolvedValue(2);
      mockBStatsCreate.mockResolvedValue({ id: 's1' });
      const req = {
        user: { id: 'b1' },
        body: { statType: 'overview', period: 'monthly', periodStart: '2026-01-01', periodEnd: '2026-01-31' },
      };
      const res = mkRes();
      await generateStats(req, res);
      expect(mockBStatsCreate).toHaveBeenCalledWith(expect.objectContaining({
        businessId: 'b1', statType: 'overview',
      }));
      expect(res.status).toHaveBeenCalledWith(201);
    });
  });
});
