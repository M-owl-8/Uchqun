import { jest } from '@jest/globals';

const mockSchoolFindByPk = jest.fn();
const mockSchoolFindOne = jest.fn();
const mockSchoolCreate = jest.fn();
const mockSchoolRatingFindOne = jest.fn();
const mockSchoolRatingCreate = jest.fn();
const mockUserFindByPk = jest.fn();

jest.unstable_mockModule('../../models/School.js', () => ({
  default: {
    findByPk: mockSchoolFindByPk,
    findOne: mockSchoolFindOne,
    create: mockSchoolCreate,
    findAll: jest.fn().mockResolvedValue([]),
  },
}));
jest.unstable_mockModule('../../models/SchoolRating.js', () => ({
  default: {
    findOne: mockSchoolRatingFindOne,
    create: mockSchoolRatingCreate,
    findAll: jest.fn().mockResolvedValue([]),
  },
}));
jest.unstable_mockModule('../../models/User.js', () => ({
  default: { findByPk: mockUserFindByPk },
}));
jest.unstable_mockModule('../../models/Child.js', () => ({
  default: { findOne: jest.fn(), findAll: jest.fn().mockResolvedValue([]) },
}));
jest.unstable_mockModule('../../utils/logger.js', () => ({
  default: { error: jest.fn(), info: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));
jest.unstable_mockModule('../../utils/governmentLevel.js', () => ({
  computeAverageRating: jest.fn().mockReturnValue({ average: 4, count: 1 }),
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

describe('rateSchool — TP-05 revert-tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUserFindByPk.mockResolvedValue({ id: 'parent-1' });
    mockSchoolRatingFindOne.mockResolvedValue(null);
    mockSchoolRatingCreate.mockResolvedValue({ id: 'rating-1', schoolId: SCHOOL_B, parentId: 'parent-1', stars: 4, toJSON: () => ({}) });
  });

  // TP-05 revert-test 1: null-schoolId bypass.
  // Before fix (3-part): null && (null !== SCHOOL_B) = false → guard skipped → rating created.
  // After fix (2-part deny-on-null): !null = true → immediate 403.
  it('403 (TP-05) when req.user.schoolId is null — null-bypass guard', async () => {
    mockSchoolFindByPk.mockResolvedValue({ id: SCHOOL_B });
    const req = {
      user: { id: 'parent-1', role: 'parent', schoolId: null },
      body: {
        schoolId: SCHOOL_B,
        indicators: { parent_indicator_1: 4, parent_indicator_2: 3, parent_indicator_3: 5, parent_indicator_4: 2, parent_indicator_5: 4 },
        comment: 'Cross-school attempt',
      },
    };
    const res = mkRes();
    await rateSchool(req, res);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(mockSchoolRatingCreate).not.toHaveBeenCalled();
  });

  // TP-05 revert-test 2: schoolId is required — body without it must be rejected.
  it('400 (TP-05) when schoolId is missing — schoolId required', async () => {
    const req = {
      user: { id: 'parent-1', role: 'parent', schoolId: SCHOOL_A },
      body: {
        schoolId: null,
        indicators: { parent_indicator_1: 4, parent_indicator_2: 3, parent_indicator_3: 5, parent_indicator_4: 2, parent_indicator_5: 4 },
        comment: 'good',
      },
    };
    const res = mkRes();
    await rateSchool(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(mockSchoolRatingCreate).not.toHaveBeenCalled();
  });

  // Sanity: valid same-school rating with mandatory comment + indicators succeeds.
  it('200 parent can rate their own school by schoolId', async () => {
    mockSchoolFindByPk.mockResolvedValue({ id: SCHOOL_A });
    mockSchoolRatingFindOne.mockResolvedValue(null);
    mockSchoolRatingCreate.mockResolvedValue({
      id: 'r-1', schoolId: SCHOOL_A, parentId: 'parent-1', stars: 4,
      toJSON: () => ({ id: 'r-1', stars: 4 }),
    });
    const req = {
      user: { id: 'parent-1', role: 'parent', schoolId: SCHOOL_A },
      body: {
        schoolId: SCHOOL_A,
        indicators: {
          parent_indicator_1: 4, parent_indicator_2: 3, parent_indicator_3: 5,
          parent_indicator_4: 2, parent_indicator_5: 4,
        },
        comment: 'Good school',
      },
    };
    const res = mkRes();
    await rateSchool(req, res);
    expect(res.status).not.toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });
});
