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
  // Before fix: null && (null !== SCHOOL_B) = false → guard skipped → rating created.
  // After fix:  null !== SCHOOL_B = true → 403. FAILS pre-fix, PASSES post-fix.
  it('403 (TP-05) when req.user.schoolId is null — null-bypass guard', async () => {
    mockSchoolFindByPk.mockResolvedValue({ id: SCHOOL_B });
    const req = {
      user: { id: 'parent-1', role: 'parent', schoolId: null },
      body: { schoolId: SCHOOL_B, stars: 4 },
    };
    const res = mkRes();
    await rateSchool(req, res);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(mockSchoolRatingCreate).not.toHaveBeenCalled();
  });

  // TP-05 revert-test 2: schoolName path allows arbitrary School.create.
  // Before fix: schoolName accepted → School.findOne returns null → School.create called.
  // After fix:  schoolName path rejected immediately (400, schoolId required).
  //             FAILS pre-fix, PASSES post-fix.
  it('400 (TP-05) when only schoolName provided — schoolId required', async () => {
    const req = {
      user: { id: 'parent-1', role: 'parent', schoolId: SCHOOL_A },
      body: { schoolName: 'Arbitrary School XYZ', stars: 4 },
    };
    const res = mkRes();
    await rateSchool(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(mockSchoolCreate).not.toHaveBeenCalled();
  });

  // Sanity: valid same-school rating still succeeds.
  it('200 parent can rate their own school by schoolId', async () => {
    mockSchoolFindByPk.mockResolvedValue({ id: SCHOOL_A });
    const req = {
      user: { id: 'parent-1', role: 'parent', schoolId: SCHOOL_A },
      body: { schoolId: SCHOOL_A, stars: 4 },
    };
    const res = mkRes();
    await rateSchool(req, res);
    expect(res.status).not.toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });
});
