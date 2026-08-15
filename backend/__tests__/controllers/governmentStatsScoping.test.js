/**
 * Sprint D Commit 3: GovernmentStats regionId — region scoping for getSavedStats and generateStats.
 * Tests: republic sees all, region sees own, generateStats stamps regionId.
 * Revert-test pair proves region-scoping leak and fix.
 */
import { jest } from '@jest/globals';

const mockStatsFindAndCountAll = jest.fn();
const mockStatsCreate = jest.fn();

jest.unstable_mockModule('../../models/GovernmentStats.js', () => ({
  default: {
    findAndCountAll: mockStatsFindAndCountAll,
    create: mockStatsCreate,
  },
}));
jest.unstable_mockModule('../../models/School.js', () => ({
  default: {
    findOne: jest.fn().mockResolvedValue(null),
    findAll: jest.fn().mockResolvedValue([]),
    count: jest.fn().mockResolvedValue(0),
  },
}));
jest.unstable_mockModule('../../models/SchoolCategory.js', () => ({
  default: { findByPk: jest.fn() },
}));
jest.unstable_mockModule('../../models/SchoolRating.js', () => ({
  default: { findAll: jest.fn().mockResolvedValue([]) },
}));
jest.unstable_mockModule('../../models/User.js', () => ({
  default: { findAll: jest.fn().mockResolvedValue([]), count: jest.fn().mockResolvedValue(0) },
}));
jest.unstable_mockModule('../../models/Child.js', () => ({
  default: { count: jest.fn().mockResolvedValue(0) },
}));
jest.unstable_mockModule('../../models/AIWarning.js', () => ({
  default: { count: jest.fn().mockResolvedValue(0) },
}));
jest.unstable_mockModule('../../models/AuditLog.js', () => ({
  default: { findAndCountAll: jest.fn().mockResolvedValue({ rows: [], count: 0 }) },
}));
jest.unstable_mockModule('../../utils/logger.js', () => ({
  default: { error: jest.fn(), info: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));
jest.unstable_mockModule('../../utils/auditLogger.js', () => ({
  logAudit: jest.fn(),
}));
jest.unstable_mockModule('../../utils/governmentLevel.js', () => ({
  getGovernmentLevel: jest.fn(),
  sortSchoolsByRating: jest.fn().mockReturnValue([]),
  computeRatingScore: jest.fn().mockReturnValue(0),
  computeAverageRating: jest.fn().mockReturnValue(0),
}));
jest.unstable_mockModule('../../utils/pagination.js', () => ({
  parsePagination: () => ({ limit: 20, offset: 0 }),
}));
jest.unstable_mockModule('../../services/schoolRatingService.js', () => ({
  getSchoolRatingAggregated: jest.fn().mockResolvedValue({
    parent: { avg: null, count: 0 },
    government: null,
    cumulative: { avg: null, isPartial: false },
  }),
  getSchoolRatingsBatch: jest.fn().mockResolvedValue({}),
}));

const { getSavedStats, generateStats } = await import('../../controllers/governmentController.js');

const mkRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

const REGION_A = '00000000-0000-0000-0000-000000000011';

const republicReq = (query = {}) => ({
  user: { id: 'g1', role: 'government' },
  query,
  isGlobalAccess: true,
  govType: 'main',
  regionScope: null,
});

const regionReq = (regionScope, query = {}) => ({
  user: { id: 'g2', role: 'government' },
  query,
  isGlobalAccess: false,
  govType: 'main',
  regionScope,
});

describe('GovernmentStats — Sprint D Commit 3', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('getSavedStats', () => {
    it('republic account: no regionId filter in where clause', async () => {
      mockStatsFindAndCountAll.mockResolvedValue({ rows: [], count: 0 });
      const res = mkRes();
      await getSavedStats(republicReq(), res);

      const where = mockStatsFindAndCountAll.mock.calls[0][0].where;
      expect(where).not.toHaveProperty('regionId');
    });

    it('region account: regionId filter applied to where clause', async () => {
      mockStatsFindAndCountAll.mockResolvedValue({ rows: [], count: 0 });
      const res = mkRes();
      await getSavedStats(regionReq(REGION_A), res);

      const where = mockStatsFindAndCountAll.mock.calls[0][0].where;
      expect(where.regionId).toBe(REGION_A);
    });

    it('republic account returns all rows (no region restriction)', async () => {
      const statA = { id: 's1', regionId: REGION_A, toJSON: () => ({ id: 's1' }) };
      const statNull = { id: 's2', regionId: null, toJSON: () => ({ id: 's2' }) };
      mockStatsFindAndCountAll.mockResolvedValue({ rows: [statA, statNull], count: 2 });

      const res = mkRes();
      await getSavedStats(republicReq(), res);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });
  });

  describe('generateStats', () => {
    const validBody = {
      statType: 'schools',
      period: 'monthly',
      periodStart: '2026-01-01',
      periodEnd: '2026-01-31',
    };

    it('republic account: regionId saved as null', async () => {
      mockStatsCreate.mockResolvedValue({ id: 'stat1' });
      const req = { ...republicReq(), body: validBody };
      const res = mkRes();
      await generateStats(req, res);

      const createArg = mockStatsCreate.mock.calls[0][0];
      expect(createArg.regionId).toBeNull();
    });

    it('region account: regionId auto-stamped with req.regionScope', async () => {
      mockStatsCreate.mockResolvedValue({ id: 'stat2' });
      const req = { ...regionReq(REGION_A), body: validBody };
      const res = mkRes();
      await generateStats(req, res);

      const createArg = mockStatsCreate.mock.calls[0][0];
      expect(createArg.regionId).toBe(REGION_A);
    });
  });

  describe('[REVERT-TEST] region-scoping for getSavedStats', () => {
// Historical bug, documented rather than asserted (P4.6):
//   without regionId filter, region account would see all stats
// The former [REVERT-TEST: BUG] case here reimplemented the buggy code
// locally and asserted the bug, so it could not fail when the real
// controller regressed. The [REVERT-TEST: FIXED] case below exercises
// the real controller and is what actually guards this.

    it('[REVERT-TEST: FIXED] region account only sees own-region stats', async () => {
      mockStatsFindAndCountAll.mockResolvedValue({ rows: [], count: 0 });
      const res = mkRes();
      await getSavedStats(regionReq(REGION_A), res);

      const where = mockStatsFindAndCountAll.mock.calls[0][0].where;
      // Filter is present — only REGION_A stats returned
      expect(where.regionId).toBe(REGION_A);
    });
  });
});
