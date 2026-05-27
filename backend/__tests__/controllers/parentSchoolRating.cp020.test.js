/**
 * CP-020 parent school rating — behavioral tests.
 * Tests: mandatory comment, 5-indicator validation, TP-05 2-part deny-on-null isolation.
 * Uses jest.fn() mocks — validates controller logic, not DB schema.
 */
import { jest } from '@jest/globals';

const mockSchoolFindByPk = jest.fn();
const mockSchoolRatingFindOne = jest.fn();
const mockSchoolRatingCreate = jest.fn();
const mockSchoolRatingUpdate = jest.fn();

jest.unstable_mockModule('../../models/School.js', () => ({
  default: { findByPk: mockSchoolFindByPk },
}));

const mockRatingInstance = { toJSON: () => ({ id: 'r-1', stars: 3, indicators: {}, comment: 'good' }), update: mockSchoolRatingUpdate };
jest.unstable_mockModule('../../models/SchoolRating.js', () => ({
  default: { findOne: mockSchoolRatingFindOne, create: mockSchoolRatingCreate },
}));
jest.unstable_mockModule('../../models/Child.js', () => ({
  default: { findOne: jest.fn(), findAll: jest.fn().mockResolvedValue([]) },
}));
jest.unstable_mockModule('../../utils/logger.js', () => ({
  default: { error: jest.fn(), info: jest.fn(), warn: jest.fn() },
}));

const { rateSchool } = await import('../../controllers/parent/parentSchoolRatingController.js');

const mkRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

const SCHOOL_A = 'aaaaaaaa-0000-0000-0000-000000000001';
const SCHOOL_B = 'bbbbbbbb-0000-0000-0000-000000000002';

const VALID_INDICATORS = {
  parent_indicator_1: 4,
  parent_indicator_2: 3,
  parent_indicator_3: 5,
  parent_indicator_4: 2,
  parent_indicator_5: 4,
};

const mkReq = (overrides = {}) => ({
  user: { id: 'parent-1', role: 'parent', schoolId: SCHOOL_A, ...overrides.user },
  body: { schoolId: SCHOOL_A, indicators: VALID_INDICATORS, comment: 'Great school', ...overrides.body },
});

beforeEach(() => {
  jest.clearAllMocks();
  mockSchoolFindByPk.mockResolvedValue({ id: SCHOOL_A });
  mockSchoolRatingFindOne.mockResolvedValue(null);
  mockSchoolRatingCreate.mockResolvedValue(mockRatingInstance);
  mockSchoolRatingUpdate.mockResolvedValue(mockRatingInstance);
});

describe('CP-020 rateSchool — mandatory comment', () => {
  it('400 RATING_COMMENT_REQUIRED when comment is missing', async () => {
    const req = mkReq({ body: { schoolId: SCHOOL_A, indicators: VALID_INDICATORS, comment: null } });
    const res = mkRes();
    await rateSchool(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      success: false,
      error: expect.objectContaining({ code: 'RATING_COMMENT_REQUIRED' }),
    }));
    expect(mockSchoolRatingCreate).not.toHaveBeenCalled();
  });

  it('400 RATING_COMMENT_REQUIRED when comment is whitespace-only', async () => {
    const req = mkReq({ body: { schoolId: SCHOOL_A, indicators: VALID_INDICATORS, comment: '   ' } });
    const res = mkRes();
    await rateSchool(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      error: expect.objectContaining({ code: 'RATING_COMMENT_REQUIRED' }),
    }));
  });
});

describe('CP-020 rateSchool — 5-indicator validation', () => {
  it('400 RATING_INDICATORS_REQUIRED when indicators is absent', async () => {
    const req = mkReq({ body: { schoolId: SCHOOL_A, comment: 'good', indicators: null } });
    const res = mkRes();
    await rateSchool(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      error: expect.objectContaining({ code: 'RATING_INDICATORS_REQUIRED' }),
    }));
  });

  it('400 RATING_INDICATOR_INVALID when one indicator is out of range', async () => {
    const badIndicators = { ...VALID_INDICATORS, parent_indicator_3: 6 };
    const req = mkReq({ body: { schoolId: SCHOOL_A, indicators: badIndicators, comment: 'ok' } });
    const res = mkRes();
    await rateSchool(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      error: expect.objectContaining({ code: 'RATING_INDICATOR_INVALID' }),
    }));
  });

  it('400 RATING_INDICATOR_INVALID when one indicator is missing', async () => {
    const { parent_indicator_5: _unused, ...partial } = VALID_INDICATORS;
    const req = mkReq({ body: { schoolId: SCHOOL_A, indicators: partial, comment: 'ok' } });
    const res = mkRes();
    await rateSchool(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      error: expect.objectContaining({ code: 'RATING_INDICATOR_INVALID' }),
    }));
  });
});

describe('CP-020 rateSchool — TP-05 2-part deny-on-null isolation', () => {
  // TP-05 revert-test: null schoolId MUST NOT bypass the guard.
  // Before 2-part fix: `null !== SCHOOL_A` short-circuits to false when
  // the guard is `if (req.user.schoolId && ...)` — null allowed through.
  // After 2-part fix: `!null` = true → immediate 403.
  it('403 RATING_SCHOOL_FORBIDDEN when req.user.schoolId is null (deny-on-null)', async () => {
    mockSchoolFindByPk.mockResolvedValue({ id: SCHOOL_A });
    const req = mkReq({ user: { id: 'parent-1', role: 'parent', schoolId: null } });
    const res = mkRes();
    await rateSchool(req, res);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      error: expect.objectContaining({ code: 'RATING_SCHOOL_FORBIDDEN' }),
    }));
    expect(mockSchoolRatingCreate).not.toHaveBeenCalled();
  });

  it('403 RATING_SCHOOL_FORBIDDEN when rating a school other than own school', async () => {
    mockSchoolFindByPk.mockResolvedValue({ id: SCHOOL_B });
    const req = mkReq({ user: { id: 'parent-1', role: 'parent', schoolId: SCHOOL_A },
                        body: { schoolId: SCHOOL_B, indicators: VALID_INDICATORS, comment: 'cross' } });
    const res = mkRes();
    await rateSchool(req, res);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(mockSchoolRatingCreate).not.toHaveBeenCalled();
  });
});

describe('CP-020 rateSchool — happy path', () => {
  it('200 parent rates own school with valid indicators + comment — stars derived', async () => {
    mockSchoolFindByPk.mockResolvedValue({ id: SCHOOL_A });
    mockSchoolRatingFindOne.mockResolvedValue(null);
    const capturedCreate = {};
    mockSchoolRatingCreate.mockImplementation(async (data) => {
      Object.assign(capturedCreate, data);
      return { ...data, id: 'r-new', toJSON: () => ({ ...data, id: 'r-new' }) };
    });

    const req = mkReq();
    const res = mkRes();
    await rateSchool(req, res);

    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    // Stars should be computed as mean: (4+3+5+2+4)/5 = 3.6 → rounded = 4
    expect(capturedCreate.stars).toBe(4);
    expect(capturedCreate.indicators).toEqual(VALID_INDICATORS);
    expect(capturedCreate.comment).toBe('Great school');
    expect(capturedCreate.parentId).toBe('parent-1');
    expect(capturedCreate.schoolId).toBe(SCHOOL_A);
  });

  it('200 upsert — updates existing rating instead of creating duplicate', async () => {
    mockSchoolFindByPk.mockResolvedValue({ id: SCHOOL_A });
    const existingRating = { update: mockSchoolRatingUpdate, toJSON: () => ({ id: 'r-exist' }) };
    mockSchoolRatingFindOne.mockResolvedValue(existingRating);
    mockSchoolRatingUpdate.mockResolvedValue(existingRating);

    const req = mkReq();
    const res = mkRes();
    await rateSchool(req, res);

    expect(mockSchoolRatingUpdate).toHaveBeenCalled();
    expect(mockSchoolRatingCreate).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });
});
