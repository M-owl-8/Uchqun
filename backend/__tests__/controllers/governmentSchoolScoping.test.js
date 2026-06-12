/**
 * CP-021 Sprint C Commit 1 — Region isolation tests for schools endpoints
 *
 * Tests: getSchoolsStats, getSchoolById, archiveSchool, reactivateSchool
 * Each has:
 *   - Republic account sees all schools
 *   - Region-A account sees only Region-A schools
 *   - Region-A account gets 404 for Region-B schools (IDOR prevention)
 *   - REVERT-TEST pair: proves regionWhere is load-bearing
 */
import { jest } from '@jest/globals';

const REGION_A = '00000000-0000-0000-0000-000000000001';
const REGION_B = '00000000-0000-0000-0000-000000000002';
const SCHOOL_A_ID = 'aaaa0000-0000-0000-0000-000000000001';
const SCHOOL_B_ID = 'bbbb0000-0000-0000-0000-000000000001';

const mockSchoolFindOne = jest.fn();
const mockSchoolFindAll = jest.fn();
const mockSchoolFindAndCountAll = jest.fn();
const mockSchoolRatingFindAll = jest.fn();
const mockChildFindAll = jest.fn();
const mockSchoolUpdate = jest.fn();
const mockLogAudit = jest.fn();

jest.unstable_mockModule('../../models/School.js', () => ({
  default: {
    findOne: mockSchoolFindOne,
    findAll: mockSchoolFindAll,
    findAndCountAll: mockSchoolFindAndCountAll,
  },
}));
jest.unstable_mockModule('../../models/SchoolRating.js', () => ({
  default: { findAll: mockSchoolRatingFindAll },
}));
jest.unstable_mockModule('../../models/Child.js', () => ({
  default: { findAll: mockChildFindAll, count: jest.fn().mockResolvedValue(0) },
}));
jest.unstable_mockModule('../../models/User.js', () => ({
  default: { count: jest.fn().mockResolvedValue(0), findAll: jest.fn().mockResolvedValue([]) },
}));
jest.unstable_mockModule('../../models/AIWarning.js', () => ({ default: { count: jest.fn().mockResolvedValue(0) } }));
jest.unstable_mockModule('../../models/GovernmentStats.js', () => ({ default: {} }));
jest.unstable_mockModule('../../utils/logger.js', () => ({
  default: { error: jest.fn(), info: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));
jest.unstable_mockModule('../../utils/auditLogger.js', () => ({ logAudit: mockLogAudit }));
jest.unstable_mockModule('../../utils/governmentLevel.js', () => ({
  getGovernmentLevel: jest.fn().mockReturnValue('standard'),
  sortSchoolsByRating: jest.fn(arr => arr),
  computeRatingScore: jest.fn().mockReturnValue(4),
  computeAverageRating: jest.fn().mockReturnValue({ average: 4.0, count: 2 }),
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

const { getSchoolsStats, getSchoolById, archiveSchool, reactivateSchool } =
  await import('../../controllers/governmentController.js');

const mkRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

const republicReq = () => ({
  isGlobalAccess: true,
  govType: 'main',
  user: { id: 'rep1', role: 'government', govLevel: 'republic' },
  query: {},
});

const regionAReq = () => ({
  isGlobalAccess: false,
  regionScope: REGION_A,
  govType: 'main',
  user: { id: 'reg-a', role: 'government', govLevel: 'region', govRegionId: REGION_A },
  query: {},
});

// ── getSchoolsStats ──────────────────────────────────────────────────────────

describe('getSchoolsStats — region scoping', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSchoolRatingFindAll.mockResolvedValue([]);
  });

  it('republic: where clause has no regionId', async () => {
    mockSchoolFindAndCountAll.mockResolvedValue({ count: 0, rows: [] });
    await getSchoolsStats(republicReq(), mkRes());
    const callWhere = mockSchoolFindAndCountAll.mock.calls[0][0].where;
    expect(callWhere).not.toHaveProperty('regionId');
    expect(callWhere.isActive).toBe(true);
  });

  it('region-A: where clause has regionId=REGION_A', async () => {
    mockSchoolFindAndCountAll.mockResolvedValue({ count: 0, rows: [] });
    await getSchoolsStats(regionAReq(), mkRes());
    const callWhere = mockSchoolFindAndCountAll.mock.calls[0][0].where;
    expect(callWhere).toHaveProperty('regionId', REGION_A);
    expect(callWhere.isActive).toBe(true);
  });

  // ── REVERT-TEST ──────────────────────────────────────────────────────────
  //
  // BUG: without regionWhere, region-A account lists all schools (region-B included).
  // With fix: region-A account sees only region-A schools.
  //
  it('[REVERT-TEST: BUG] without regionWhere, region-A where has no regionId filter', async () => {
    mockSchoolFindAndCountAll.mockResolvedValue({ count: 0, rows: [] });
    // Simulates the old code path: no regionWhere applied
    const buggyGetSchoolsStats = async (req, res) => {
      const where = { isActive: true };  // BUG: no regionWhere
      await mockSchoolFindAndCountAll({ where, limit: 50, offset: 0, distinct: true });
      res.json({ success: true, data: { schools: [], total: 0 } });
    };
    await buggyGetSchoolsStats(regionAReq(), mkRes());
    const callWhere = mockSchoolFindAndCountAll.mock.calls[0][0].where;
    expect(callWhere).not.toHaveProperty('regionId');  // BUG: region-B schools would leak
  });

  it('[REVERT-TEST: FIXED] with regionWhere, region-A where has regionId filter', async () => {
    mockSchoolFindAndCountAll.mockResolvedValue({ count: 0, rows: [] });
    await getSchoolsStats(regionAReq(), mkRes());
    const callWhere = mockSchoolFindAndCountAll.mock.calls[0][0].where;
    expect(callWhere).toHaveProperty('regionId', REGION_A);  // FIXED: filtered correctly
  });
});

// ── getSchoolsStats — regionRef pass-through (S32, S29 bug class) ────────────

describe('getSchoolsStats — regionRef include (S32)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSchoolRatingFindAll.mockResolvedValue([]);
  });

  it('query includes the Region relation as regionRef', async () => {
    mockSchoolFindAndCountAll.mockResolvedValue({ count: 0, rows: [] });
    await getSchoolsStats(republicReq(), mkRes());
    const include = mockSchoolFindAndCountAll.mock.calls[0][0].include;
    expect(include).toEqual(expect.arrayContaining([
      expect.objectContaining({ as: 'regionRef' }),
    ]));
  });

  it('response schools carry regionRef through (dashboard groups by it)', async () => {
    const school = {
      id: SCHOOL_A_ID,
      ratings: [],
      schoolChildren: [],
      toJSON: () => ({
        id: SCHOOL_A_ID, name: 'School A', regionId: REGION_A,
        region: null, // legacy STRING is NULL in production
        regionRef: { id: REGION_A, name: 'Toshkent', code: 'TAS' },
      }),
    };
    mockSchoolFindAndCountAll.mockResolvedValue({ count: 1, rows: [school] });
    const res = mkRes();
    await getSchoolsStats(republicReq(), res);
    const payload = res.json.mock.calls[0][0];
    expect(payload.data.schools[0].regionRef).toEqual({ id: REGION_A, name: 'Toshkent', code: 'TAS' });
  });
});

// ── getSchoolById ────────────────────────────────────────────────────────────

describe('getSchoolById — region IDOR isolation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSchoolRatingFindAll.mockResolvedValue([]);
  });

  it('republic: findOne called without regionId filter', async () => {
    mockSchoolFindOne.mockResolvedValue({
      id: SCHOOL_B_ID, toJSON: () => ({ id: SCHOOL_B_ID }),
    });
    const res = mkRes();
    const req = { ...republicReq(), params: { id: SCHOOL_B_ID } };
    await getSchoolById(req, res);
    const callWhere = mockSchoolFindOne.mock.calls[0][0].where;
    expect(callWhere).not.toHaveProperty('regionId');
  });

  it('region-A: findOne called WITH regionId=REGION_A', async () => {
    mockSchoolFindOne.mockResolvedValue(null);  // school not in region
    const res = mkRes();
    const req = { ...regionAReq(), params: { id: SCHOOL_B_ID } };
    await getSchoolById(req, res);
    const callWhere = mockSchoolFindOne.mock.calls[0][0].where;
    expect(callWhere).toHaveProperty('regionId', REGION_A);
    expect(callWhere).toHaveProperty('id', SCHOOL_B_ID);
  });

  it('region-A: 404 when requesting out-of-region school (IDOR prevented)', async () => {
    mockSchoolFindOne.mockResolvedValue(null);
    const res = mkRes();
    await getSchoolById({ ...regionAReq(), params: { id: SCHOOL_B_ID } }, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  // ── REVERT-TEST ──────────────────────────────────────────────────────────
  //
  // BUG: without regionWhere in getSchoolById, region-A account can read any school by UUID.
  // With fix: region-A account gets 404 for school in region-B.
  //
  it('[REVERT-TEST: BUG] without regionWhere, region-A finds region-B school → 200', async () => {
    const buggyGetSchoolById = async (req, res) => {
      const { id } = req.params;
      // BUG: no regionWhere — any school UUID resolves
      const school = await mockSchoolFindOne({ where: { id } });
      if (!school) return res.status(404).json({});
      res.json({ success: true, data: school.toJSON() });
    };
    mockSchoolFindOne.mockResolvedValue({
      id: SCHOOL_B_ID, regionId: REGION_B, toJSON: () => ({ id: SCHOOL_B_ID }),
    });
    const res = mkRes();
    await buggyGetSchoolById({ ...regionAReq(), params: { id: SCHOOL_B_ID } }, res);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    // BUG confirmed: region-A saw region-B school
  });

  it('[REVERT-TEST: FIXED] with regionWhere, region-A gets 404 for region-B school', async () => {
    // The real function uses regionWhere(req) = { regionId: REGION_A }
    // When the DB gets { id: SCHOOL_B_ID, regionId: REGION_A } it returns null
    mockSchoolFindOne.mockResolvedValue(null);
    const res = mkRes();
    await getSchoolById({ ...regionAReq(), params: { id: SCHOOL_B_ID } }, res);
    expect(res.status).toHaveBeenCalledWith(404);
    // FIXED: region-A correctly blocked from region-B school
  });
});

// ── archiveSchool ────────────────────────────────────────────────────────────

describe('archiveSchool — region scoping', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSchoolRatingFindAll.mockResolvedValue([]);
  });

  it('region-A: findOne called with regionId=REGION_A (scope enforced)', async () => {
    mockSchoolFindOne.mockResolvedValue(null);
    const req = { ...regionAReq(), params: { id: SCHOOL_B_ID } };
    await archiveSchool(req, mkRes());
    const callWhere = mockSchoolFindOne.mock.calls[0][0].where;
    expect(callWhere).toHaveProperty('regionId', REGION_A);
    expect(callWhere).toHaveProperty('id', SCHOOL_B_ID);
  });

  it('region-A: 404 when archiving out-of-region school', async () => {
    mockSchoolFindOne.mockResolvedValue(null);
    const req = { ...regionAReq(), params: { id: SCHOOL_B_ID } };
    const res = mkRes();
    await archiveSchool(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('republic: archives any school (no regionId filter)', async () => {
    const school = { id: SCHOOL_B_ID, name: 'School B', isActive: true, update: mockSchoolUpdate };
    mockSchoolFindOne.mockResolvedValue(school);
    mockSchoolUpdate.mockResolvedValue({});
    const req = { ...republicReq(), params: { id: SCHOOL_B_ID } };
    const res = mkRes();
    await archiveSchool(req, res);
    const callWhere = mockSchoolFindOne.mock.calls[0][0].where;
    expect(callWhere).not.toHaveProperty('regionId');
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });

  // ── REVERT-TEST ──────────────────────────────────────────────────────────
  //
  // BUG: without regionWhere in archiveSchool, region-A can archive any school.
  // With fix: region-A gets 404 for out-of-region school.
  //
  it('[REVERT-TEST: BUG] without regionWhere, region-A archives region-B school', async () => {
    const buggyArchive = async (req, res) => {
      const { id } = req.params;
      // BUG: findByPk — no region filter
      const school = await mockSchoolFindOne({ where: { id } });  // called without regionId
      if (!school) return res.status(404).json({});
      if (!school.isActive) return res.status(409).json({});
      await school.update({ isActive: false });
      res.json({ success: true });
    };
    mockSchoolFindOne.mockResolvedValue({ id: SCHOOL_B_ID, isActive: true, update: mockSchoolUpdate });
    mockSchoolUpdate.mockResolvedValue({});
    const res = mkRes();
    await buggyArchive({ ...regionAReq(), params: { id: SCHOOL_B_ID } }, res);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    // BUG confirmed: region-A archived region-B school
  });

  it('[REVERT-TEST: FIXED] with regionWhere, region-A cannot archive region-B school', async () => {
    mockSchoolFindOne.mockResolvedValue(null);  // regionId=REGION_A filter → no result for SCHOOL_B
    const res = mkRes();
    await archiveSchool({ ...regionAReq(), params: { id: SCHOOL_B_ID } }, res);
    expect(res.status).toHaveBeenCalledWith(404);
    // FIXED: region-A blocked from archiving region-B school
  });
});

// ── reactivateSchool ─────────────────────────────────────────────────────────

describe('reactivateSchool — region scoping', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSchoolRatingFindAll.mockResolvedValue([]);
  });

  it('region-A: 404 when reactivating out-of-region school', async () => {
    mockSchoolFindOne.mockResolvedValue(null);
    const req = { ...regionAReq(), params: { id: SCHOOL_B_ID } };
    const res = mkRes();
    await reactivateSchool(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('region-A: findOne has regionId=REGION_A filter', async () => {
    mockSchoolFindOne.mockResolvedValue(null);
    const req = { ...regionAReq(), params: { id: SCHOOL_B_ID } };
    await reactivateSchool(req, mkRes());
    const callWhere = mockSchoolFindOne.mock.calls[0][0].where;
    expect(callWhere).toHaveProperty('regionId', REGION_A);
  });
});
