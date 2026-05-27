/**
 * CP-020 government school rating — behavioral isolation tests.
 * Region axis: region account of region A cannot rate a school in region B.
 * Republic account can rate any school.
 * Aggregation region-scope: GET /government/ratings proves WHERE filters by region.
 * Uses jest.fn() mocks — validates controller call-argument isolation.
 */
import { jest } from '@jest/globals';

const mockSchoolFindOne = jest.fn();
const mockSchoolFindAll = jest.fn();
const mockGovRatingFindOne = jest.fn();
const mockGovRatingCreate = jest.fn();
const mockGovRatingUpdate = jest.fn();
const mockGovRatingFindAll = jest.fn();
const mockSchoolRatingFindAll = jest.fn();

jest.unstable_mockModule('../../models/School.js', () => ({
  default: { findOne: mockSchoolFindOne, findAll: mockSchoolFindAll },
}));

const mkGovRatingInstance = (data) => ({
  ...data, toJSON: () => data, update: mockGovRatingUpdate,
});

jest.unstable_mockModule('../../models/GovernmentSchoolRating.js', () => ({
  default: { findOne: mockGovRatingFindOne, create: mockGovRatingCreate, findAll: mockGovRatingFindAll },
}));
jest.unstable_mockModule('../../models/SchoolRating.js', () => ({
  default: { findAll: mockSchoolRatingFindAll },
}));
jest.unstable_mockModule('../../models/User.js', () => ({
  default: { findByPk: jest.fn() },
}));
jest.unstable_mockModule('../../utils/logger.js', () => ({
  default: { error: jest.fn(), info: jest.fn(), warn: jest.fn() },
}));
// regionWhere is imported in controller — mock it to simulate region scoping
jest.unstable_mockModule('../../middleware/regionScope.js', () => ({
  regionWhere: jest.fn(),
}));

const { rateSchoolAsGov, getGovRatingsForSchool, getRatingsAggregated } =
  await import('../../controllers/government/governmentSchoolRatingController.js');
const { regionWhere } = await import('../../middleware/regionScope.js');

const mkRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

const REGION_A = 'rrrraaaa-0000-0000-0000-000000000001';
const REGION_B = 'rrrrbbbb-0000-0000-0000-000000000002';
const SCHOOL_A1 = 'sssssss1-0000-0000-0000-000000000001';
const SCHOOL_B1 = 'sssssss1-0000-0000-0000-000000000002';
const GOV_A = 'ggggggg1-0000-0000-0000-000000000001';

const VALID_GOV_INDICATORS = {
  gov_indicator_1: 4,
  gov_indicator_2: 3,
  gov_indicator_3: 5,
  gov_indicator_4: 2,
  gov_indicator_5: 4,
};

const mkReq = (overrides = {}) => ({
  user: { id: GOV_A, govLevel: 'region', govRegionId: REGION_A, ...overrides.user },
  params: { id: SCHOOL_A1, ...overrides.params },
  query: overrides.query ?? {},
  body: {
    period: 'Q2-2026',
    indicators: VALID_GOV_INDICATORS,
    comment: 'School is well-organised',
    ...overrides.body,
  },
  isGlobalAccess: overrides.isGlobalAccess ?? false,
  regionScope: overrides.regionScope ?? REGION_A,
});

beforeEach(() => {
  jest.clearAllMocks();
  regionWhere.mockImplementation((req) => (req.isGlobalAccess ? {} : { regionId: req.regionScope }));
  mockGovRatingFindOne.mockResolvedValue(null);
  mockGovRatingCreate.mockImplementation(async (data) => mkGovRatingInstance({ ...data, id: 'gr-1' }));
  mockGovRatingUpdate.mockResolvedValue({});
});

describe('rateSchoolAsGov — region isolation', () => {
  // Region axis: school not in gov's region → findOne with regionId filter returns null → 404.
  it('404 when region-A gov rates a school in region-B (region axis enforced)', async () => {
    // findOne returns null because School_B1 is not in REGION_A
    mockSchoolFindOne.mockResolvedValue(null);
    const req = mkReq({ params: { id: SCHOOL_B1 } });
    const res = mkRes();
    await rateSchoolAsGov(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      error: expect.objectContaining({ code: 'RATING_SCHOOL_NOT_FOUND' }),
    }));
    expect(mockGovRatingCreate).not.toHaveBeenCalled();
    // Prove regionWhere was called with the request (region scope applied at find)
    expect(regionWhere).toHaveBeenCalledWith(req);
    // Prove findOne was called with regionId filter
    const findArgs = mockSchoolFindOne.mock.calls[0][0];
    expect(findArgs.where).toMatchObject({ id: SCHOOL_B1, regionId: REGION_A });
  });

  it('200 when republic gov rates any school (isGlobalAccess=true → no regionId filter)', async () => {
    mockSchoolFindOne.mockResolvedValue({ id: SCHOOL_B1 });
    const req = mkReq({ isGlobalAccess: true, regionScope: null, params: { id: SCHOOL_B1 } });
    const res = mkRes();
    await rateSchoolAsGov(req, res);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    // findOne should have been called with no regionId filter
    const findArgs = mockSchoolFindOne.mock.calls[0][0];
    expect(findArgs.where.regionId).toBeUndefined();
  });

  it('200 when region-A gov rates a school in region-A (same region)', async () => {
    mockSchoolFindOne.mockResolvedValue({ id: SCHOOL_A1 });
    const req = mkReq();
    const res = mkRes();
    await rateSchoolAsGov(req, res);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    expect(mockGovRatingCreate).toHaveBeenCalledWith(expect.objectContaining({
      schoolId: SCHOOL_A1,
      govUserId: GOV_A,
      period: 'Q2-2026',
    }));
  });
});

describe('rateSchoolAsGov — period validation', () => {
  it('400 RATING_PERIOD_INVALID for bad period format', async () => {
    const req = mkReq({ body: { period: 'Q5-2026', indicators: VALID_GOV_INDICATORS, comment: 'ok' } });
    const res = mkRes();
    await rateSchoolAsGov(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      error: expect.objectContaining({ code: 'RATING_PERIOD_INVALID' }),
    }));
  });

  it('400 RATING_COMMENT_REQUIRED when comment missing', async () => {
    const req = mkReq({ body: { period: 'Q2-2026', indicators: VALID_GOV_INDICATORS, comment: null } });
    const res = mkRes();
    await rateSchoolAsGov(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      error: expect.objectContaining({ code: 'RATING_COMMENT_REQUIRED' }),
    }));
  });
});

describe('rateSchoolAsGov — upsert behaviour', () => {
  it('updates existing rating for same gov user + school + period (upsert)', async () => {
    mockSchoolFindOne.mockResolvedValue({ id: SCHOOL_A1 });
    const existing = { update: mockGovRatingUpdate, toJSON: () => ({ id: 'gr-exist' }) };
    mockGovRatingFindOne.mockResolvedValue(existing);
    mockGovRatingUpdate.mockResolvedValue(existing);

    const req = mkReq();
    const res = mkRes();
    await rateSchoolAsGov(req, res);
    expect(mockGovRatingUpdate).toHaveBeenCalled();
    expect(mockGovRatingCreate).not.toHaveBeenCalled();
  });
});

describe('getRatingsAggregated — region scope on direction=gov', () => {
  it('direction=gov: only schools in region are queried (WHERE regionId applied)', async () => {
    const schoolA = { id: SCHOOL_A1, name: 'School A', isActive: true };
    mockSchoolFindAll.mockResolvedValue([schoolA]);
    mockGovRatingFindAll.mockResolvedValue([
      { schoolId: SCHOOL_A1, stars: 4, period: 'Q2-2026' },
      { schoolId: SCHOOL_A1, stars: 5, period: 'Q2-2026' },
    ]);

    const req = mkReq({ query: { direction: 'gov' } });
    const res = mkRes();
    await getRatingsAggregated(req, res);

    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    const result = res.json.mock.calls[0][0];
    expect(result.data.direction).toBe('gov');
    expect(result.data.overall.count).toBe(2);
    expect(result.data.overall.averageStars).toBe(4.5);

    // findAll on School was called with regionId filter for region account
    expect(mockSchoolFindAll).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ regionId: REGION_A }),
    }));
  });

  it('direction=parent (default): SchoolRating is queried, not GovernmentSchoolRating', async () => {
    const schoolA = { id: SCHOOL_A1, name: 'School A' };
    mockSchoolFindAll.mockResolvedValue([schoolA]);
    mockSchoolRatingFindAll.mockResolvedValue([{ schoolId: SCHOOL_A1, stars: 3 }]);

    const req = mkReq({ query: {} });
    const res = mkRes();
    await getRatingsAggregated(req, res);

    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    const result = res.json.mock.calls[0][0];
    expect(result.data.direction).toBe('parent');
    expect(mockGovRatingFindAll).not.toHaveBeenCalled();
    expect(mockSchoolRatingFindAll).toHaveBeenCalled();
  });
});
