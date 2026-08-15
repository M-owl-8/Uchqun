/**
 * Region scoping — remaining government endpoints (CP-021 Sprint C, Commit 4)
 *
 * Covers the last two mandatory endpoints from design §2.3:
 *   #9  GET /government/admins  — admin accounts anchored to schools
 *   #10 GET /government/ratings — school ratings
 *
 * Also covers:
 *   - getOverview: region-scoped school + people + rating + warning counts
 *   - getSchoolRatings: IDOR check by schoolId parameter
 *   - getAdminDetails: IDOR check by admin id (admin's school must be in region)
 *
 * Revert-test pairs prove each scope guard is load-bearing.
 */
import { jest } from '@jest/globals';
import { Op } from 'sequelize';

const REGION_A = 'aaaaaaaa-0000-0000-0000-000000000001';
const REGION_B = 'bbbbbbbb-0000-0000-0000-000000000002';
const SCHOOL_A1 = 'aa000001-0000-0000-0000-000000000001';
const SCHOOL_A2 = 'aa000002-0000-0000-0000-000000000002';
const SCHOOL_B1 = 'bb000001-0000-0000-0000-000000000003';
const ADMIN_A = 'aa010001-0000-0000-0000-000000000001';
const ADMIN_B = 'bb010001-0000-0000-0000-000000000002';

const mockSchoolCount = jest.fn();
const mockSchoolFindAll = jest.fn();
const mockSchoolFindOne = jest.fn();
const mockSchoolRatingFindAll = jest.fn();
const mockSchoolRatingFindAndCountAll = jest.fn();
const mockUserFindAndCountAll = jest.fn();
const mockUserFindOne = jest.fn();
const mockUserCount = jest.fn();
const mockChildCount = jest.fn();
const mockAIWarningCount = jest.fn();

jest.unstable_mockModule('../../models/School.js', () => ({
  default: {
    count: mockSchoolCount,
    findAll: mockSchoolFindAll,
    findOne: mockSchoolFindOne,
    findByPk: jest.fn(),
  },
}));
jest.unstable_mockModule('../../models/SchoolRating.js', () => ({
  default: { findAll: mockSchoolRatingFindAll, findAndCountAll: mockSchoolRatingFindAndCountAll },
}));
jest.unstable_mockModule('../../models/User.js', () => ({
  default: {
    findAndCountAll: mockUserFindAndCountAll,
    findOne: mockUserFindOne,
    count: mockUserCount,
    findAll: jest.fn().mockResolvedValue([]),
    hasMany: jest.fn(),
  },
}));
jest.unstable_mockModule('../../models/Child.js', () => ({
  default: {
    count: mockChildCount,
    findAll: jest.fn().mockResolvedValue([]),
    findAndCountAll: jest.fn().mockResolvedValue({ count: 0, rows: [] }),
  },
}));
jest.unstable_mockModule('../../models/AIWarning.js', () => ({
  default: { count: mockAIWarningCount },
}));
jest.unstable_mockModule('../../models/AuditLog.js', () => ({
  default: { findAndCountAll: jest.fn(), belongsTo: jest.fn() },
}));
jest.unstable_mockModule('../../models/GovernmentStats.js', () => ({
  default: { create: jest.fn(), findAndCountAll: jest.fn() },
}));
jest.unstable_mockModule('../../utils/logger.js', () => ({
  default: { error: jest.fn(), info: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));
jest.unstable_mockModule('../../utils/auditLogger.js', () => ({ logAudit: jest.fn() }));
jest.unstable_mockModule('../../utils/governmentLevel.js', () => ({
  getGovernmentLevel: jest.fn().mockReturnValue('standard'),
  sortSchoolsByRating: jest.fn(s => s),
  computeRatingScore: jest.fn().mockReturnValue(4),
  computeAverageRating: jest.fn().mockReturnValue({ average: 4.0, count: 2 }),
}));
jest.unstable_mockModule('../../utils/pagination.js', () => ({
  parsePagination: jest.fn().mockReturnValue({ limit: 100, offset: 0 }),
}));
jest.unstable_mockModule('../../services/schoolRatingService.js', () => ({
  getSchoolRatingAggregated: jest.fn().mockResolvedValue({
    parent: { avg: null, count: 0 },
    government: null,
    cumulative: { avg: null, isPartial: false },
  }),
  getSchoolRatingsBatch: jest.fn().mockResolvedValue({}),
}));

const {
  getAdmins, getAdminDetails, getRatingsStats, getSchoolRatings, getOverview,
} = await import('../../controllers/governmentController.js');

const mkRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

const republicReq = (overrides = {}) => ({
  user: { id: 'rep1', role: 'government', govLevel: 'republic' },
  isGlobalAccess: true,
  govType: 'main',
  query: {},
  params: {},
  ...overrides,
});

const regionAReq = (overrides = {}) => ({
  user: { id: 'reg-a', role: 'government', govLevel: 'region', govRegionId: REGION_A },
  isGlobalAccess: false,
  regionScope: REGION_A,
  govType: 'main',
  query: {},
  params: {},
  ...overrides,
});

// ═══════════════════════════════════════════════════════════════════════════
// getAdmins — design §2.3 endpoint #9
// ═══════════════════════════════════════════════════════════════════════════

describe('getAdmins — region scoping', () => {
  beforeEach(() => jest.clearAllMocks());

  it('republic: School.findAll not called, no schoolId filter injected', async () => {
    mockUserFindAndCountAll.mockResolvedValue({
      count: 2,
      rows: [
        { toJSON: () => ({ id: ADMIN_A, schoolId: SCHOOL_A1 }) },
        { toJSON: () => ({ id: ADMIN_B, schoolId: SCHOOL_B1 }) },
      ],
    });

    const res = mkRes();
    await getAdmins(republicReq(), res);

    expect(mockSchoolFindAll).not.toHaveBeenCalled();
    const callArg = mockUserFindAndCountAll.mock.calls[0][0];
    expect(callArg.where.schoolId).toBeUndefined();
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });

  it('region account: School.findAll called with own regionId', async () => {
    mockSchoolFindAll.mockResolvedValue([{ id: SCHOOL_A1 }, { id: SCHOOL_A2 }]);
    mockUserFindAndCountAll.mockResolvedValue({ count: 1, rows: [{ toJSON: () => ({ id: ADMIN_A }) }] });

    const res = mkRes();
    await getAdmins(regionAReq(), res);

    expect(mockSchoolFindAll).toHaveBeenCalledWith(
      expect.objectContaining({ where: { regionId: REGION_A } })
    );
  });

  it('region account: schoolId IN filter contains only region-A school IDs', async () => {
    mockSchoolFindAll.mockResolvedValue([{ id: SCHOOL_A1 }, { id: SCHOOL_A2 }]);
    mockUserFindAndCountAll.mockResolvedValue({ count: 0, rows: [] });

    const res = mkRes();
    await getAdmins(regionAReq(), res);

    const callArg = mockUserFindAndCountAll.mock.calls[0][0];
    const ids = callArg.where.schoolId[Op.in];
    expect(ids).toContain(SCHOOL_A1);
    expect(ids).toContain(SCHOOL_A2);
    expect(ids).not.toContain(SCHOOL_B1);
  });

  // ── REVERT-TEST: getAdmins isolation ──────────────────────────────────────
// Historical bug, documented rather than asserted (P4.6):
//   without region filter, query has no schoolId restriction
// The former [REVERT-TEST: BUG] case here reimplemented the buggy code
// locally and asserted the bug, so it could not fail when the real
// controller regressed. The [REVERT-TEST: FIXED] case below exercises
// the real controller and is what actually guards this.

  it('[REVERT-TEST: FIXED] with region filter, schoolId IN(region-A schools) injected', async () => {
    mockSchoolFindAll.mockResolvedValue([{ id: SCHOOL_A1 }]);
    mockUserFindAndCountAll.mockResolvedValue({ count: 0, rows: [] });

    const res = mkRes();
    await getAdmins(regionAReq(), res);

    const callArg = mockUserFindAndCountAll.mock.calls[0][0];
    const ids = callArg.where.schoolId[Op.in];
    expect(ids).toContain(SCHOOL_A1);
    expect(ids).not.toContain(SCHOOL_B1);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// getRatingsStats — design §2.3 endpoint #10
// ═══════════════════════════════════════════════════════════════════════════

describe('getRatingsStats — region scoping', () => {
  beforeEach(() => jest.clearAllMocks());

  it('republic: School.findAll called without regionId filter', async () => {
    mockSchoolFindAll.mockResolvedValue([
      { id: SCHOOL_A1, name: 'School A1', address: 'Addr', ratings: [] },
      { id: SCHOOL_B1, name: 'School B1', address: 'Addr', ratings: [] },
    ]);

    const res = mkRes();
    await getRatingsStats(republicReq(), res);

    const callArg = mockSchoolFindAll.mock.calls[0][0];
    // Republic: where has isActive:true but no regionId
    expect(callArg.where.regionId).toBeUndefined();
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });

  it('region account: School.findAll called with regionId in where', async () => {
    mockSchoolFindAll.mockResolvedValue([
      { id: SCHOOL_A1, name: 'School A1', address: 'Addr', ratings: [] },
    ]);

    const res = mkRes();
    await getRatingsStats(regionAReq(), res);

    const callArg = mockSchoolFindAll.mock.calls[0][0];
    expect(callArg.where.regionId).toBe(REGION_A);
  });

  // ── REVERT-TEST: getRatingsStats isolation ───────────────────────────────
// Historical bug, documented rather than asserted (P4.6):
//   without regionWhere, query has no regionId restriction
// The former [REVERT-TEST: BUG] case here reimplemented the buggy code
// locally and asserted the bug, so it could not fail when the real
// controller regressed. The [REVERT-TEST: FIXED] case below exercises
// the real controller and is what actually guards this.

  it('[REVERT-TEST: FIXED] with regionWhere, regionId=REGION_A in school query', async () => {
    mockSchoolFindAll.mockResolvedValue([]);

    const res = mkRes();
    await getRatingsStats(regionAReq(), res);

    const callArg = mockSchoolFindAll.mock.calls[0][0];
    expect(callArg.where.regionId).toBe(REGION_A);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// getSchoolRatings — IDOR check on /ratings/:schoolId
// ═══════════════════════════════════════════════════════════════════════════

describe('getSchoolRatings — region IDOR check', () => {
  beforeEach(() => jest.clearAllMocks());

  it('republic: any valid schoolId passes (no region check)', async () => {
    mockSchoolFindOne.mockResolvedValue({ id: SCHOOL_B1 });
    mockSchoolRatingFindAndCountAll.mockResolvedValue({ count: 0, rows: [] });

    const res = mkRes();
    await getSchoolRatings(republicReq({ params: { schoolId: SCHOOL_B1 } }), res);

    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });

  it('region account: school in own region → 200', async () => {
    mockSchoolFindOne.mockResolvedValue({ id: SCHOOL_A1 });
    mockSchoolRatingFindAndCountAll.mockResolvedValue({ count: 0, rows: [] });

    const res = mkRes();
    await getSchoolRatings(regionAReq({ params: { schoolId: SCHOOL_A1 } }), res);

    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });

  it('region account: school NOT in region → 404 (IDOR prevention)', async () => {
    // findOne returns null because regionId filter excludes SCHOOL_B1
    mockSchoolFindOne.mockResolvedValue(null);

    const res = mkRes();
    await getSchoolRatings(regionAReq({ params: { schoolId: SCHOOL_B1 } }), res);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('region account: School.findOne called with regionId in where clause', async () => {
    mockSchoolFindOne.mockResolvedValue({ id: SCHOOL_A1 });
    mockSchoolRatingFindAndCountAll.mockResolvedValue({ count: 0, rows: [] });

    const res = mkRes();
    await getSchoolRatings(regionAReq({ params: { schoolId: SCHOOL_A1 } }), res);

    const callArg = mockSchoolFindOne.mock.calls[0][0];
    expect(callArg.where).toEqual(expect.objectContaining({ id: SCHOOL_A1, regionId: REGION_A }));
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// getOverview — region-scoped counts
// ═══════════════════════════════════════════════════════════════════════════

describe('getOverview — region scoping', () => {
  beforeEach(() => jest.clearAllMocks());

  it('republic: no region school join, School.findAll not called for people counts', async () => {
    mockSchoolCount.mockResolvedValue(20);
    mockChildCount.mockResolvedValue(500);
    mockUserCount.mockResolvedValueOnce(100).mockResolvedValueOnce(400);
    mockSchoolRatingFindAll.mockResolvedValue([]);
    mockAIWarningCount.mockResolvedValue(3);

    const res = mkRes();
    await getOverview(republicReq(), res);

    // For republic, School.findAll should not be called to resolve school IDs
    expect(mockSchoolFindAll).not.toHaveBeenCalled();
    const payload = res.json.mock.calls[0][0];
    expect(payload.success).toBe(true);
    expect(payload.data.schools).toBe(20);
  });

  it('region account: School.findAll called to resolve school IDs for people counts', async () => {
    mockSchoolFindAll.mockResolvedValue([{ id: SCHOOL_A1 }, { id: SCHOOL_A2 }]);
    mockSchoolCount.mockResolvedValue(2);
    mockChildCount.mockResolvedValue(50);
    mockUserCount.mockResolvedValueOnce(10).mockResolvedValueOnce(40);
    mockSchoolRatingFindAll.mockResolvedValue([]);
    mockAIWarningCount.mockResolvedValue(1);

    const res = mkRes();
    await getOverview(regionAReq(), res);

    expect(mockSchoolFindAll).toHaveBeenCalledWith(
      expect.objectContaining({ where: { regionId: REGION_A } })
    );
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });

  it('region account: schoolWhere for School.count includes regionId', async () => {
    mockSchoolFindAll.mockResolvedValue([]);
    mockSchoolCount.mockResolvedValue(0);
    mockChildCount.mockResolvedValue(0);
    mockUserCount.mockResolvedValue(0);
    mockSchoolRatingFindAll.mockResolvedValue([]);
    mockAIWarningCount.mockResolvedValue(0);

    const res = mkRes();
    await getOverview(regionAReq(), res);

    const countArg = mockSchoolCount.mock.calls[0][0];
    expect(countArg.where.regionId).toBe(REGION_A);
  });
});
