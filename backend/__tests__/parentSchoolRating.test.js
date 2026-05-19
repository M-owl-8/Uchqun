import { jest } from '@jest/globals';

const mockSchoolFindByPk = jest.fn();
const mockSchoolFindOne = jest.fn();
const mockSchoolFindAll = jest.fn();
const mockSchoolRatingFindOne = jest.fn();
const mockSchoolRatingCreate = jest.fn();
const mockSchoolRatingFindAll = jest.fn();
const mockUserFindByPk = jest.fn();
const mockChildFindOne = jest.fn();
const mockChildFindAll = jest.fn();

jest.unstable_mockModule('../models/User.js', () => ({
  default: { findByPk: mockUserFindByPk },
}));
jest.unstable_mockModule('../models/Child.js', () => ({
  default: { findOne: mockChildFindOne, findAll: mockChildFindAll },
}));
jest.unstable_mockModule('../models/School.js', () => ({
  default: { findByPk: mockSchoolFindByPk, findOne: mockSchoolFindOne, findAll: mockSchoolFindAll, create: jest.fn() },
}));
jest.unstable_mockModule('../models/SchoolRating.js', () => ({
  default: {
    findOne: mockSchoolRatingFindOne,
    create: mockSchoolRatingCreate,
    findAll: mockSchoolRatingFindAll,
  },
}));
jest.unstable_mockModule('../utils/logger.js', () => ({
  default: { error: jest.fn(), info: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));
jest.unstable_mockModule('../utils/governmentLevel.js', () => ({
  computeAverageRating: jest.fn().mockReturnValue({ average: 4.0, count: 2 }),
}));

const { rateSchool, getMySchoolRating, getSchools } = await import('../controllers/parent/parentSchoolRatingController.js');

const mkRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

const SCHOOL_UUID = '11111111-1111-1111-1111-111111111111';
const PARENT_UUID = '22222222-2222-2222-2222-222222222222';
const parentUser = { id: PARENT_UUID, role: 'parent', schoolId: SCHOOL_UUID };

describe('parentSchoolRatingController.rateSchool', () => {
  beforeEach(() => jest.resetAllMocks());

  it('403 for non-parent role', async () => {
    const req = { body: { stars: 5, schoolId: SCHOOL_UUID }, user: { id: PARENT_UUID, role: 'admin', schoolId: SCHOOL_UUID } };
    const res = mkRes();
    await rateSchool(req, res);
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('400 when stars is missing', async () => {
    const req = { body: { schoolId: SCHOOL_UUID }, user: parentUser };
    const res = mkRes();
    await rateSchool(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('400 when stars is out of range', async () => {
    const req = { body: { schoolId: SCHOOL_UUID, stars: 6 }, user: parentUser };
    const res = mkRes();
    await rateSchool(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('400 when stars is not integer', async () => {
    const req = { body: { schoolId: SCHOOL_UUID, stars: 3.5 }, user: parentUser };
    const res = mkRes();
    await rateSchool(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('400 when neither schoolId nor schoolName provided', async () => {
    const req = { body: { stars: 4 }, user: parentUser };
    const res = mkRes();
    await rateSchool(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('404 when school not found by PK', async () => {
    mockSchoolFindByPk.mockResolvedValue(null);
    mockUserFindByPk.mockResolvedValue({ id: PARENT_UUID });
    const req = { body: { stars: 4, schoolId: SCHOOL_UUID }, user: parentUser };
    const res = mkRes();
    await rateSchool(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('creates new rating on success', async () => {
    const fakeSchool = { id: SCHOOL_UUID, name: 'Test' };
    mockSchoolFindByPk.mockResolvedValue(fakeSchool);
    mockUserFindByPk.mockResolvedValue({ id: PARENT_UUID });
    mockSchoolRatingFindOne.mockResolvedValue(null);
    const fakeRating = { id: 'r1', schoolId: SCHOOL_UUID, parentId: PARENT_UUID, stars: 5, toJSON: () => ({ id: 'r1', stars: 5 }) };
    mockSchoolRatingCreate.mockResolvedValue(fakeRating);
    const req = { body: { stars: 5, schoolId: SCHOOL_UUID }, user: parentUser };
    const res = mkRes();
    await rateSchool(req, res);
    expect(res.json).toHaveBeenCalled();
    const payload = res.json.mock.calls[0][0];
    expect(payload.success).toBe(true);
  });

  it('updates existing rating on success', async () => {
    const fakeSchool = { id: SCHOOL_UUID, name: 'Test' };
    mockSchoolFindByPk.mockResolvedValue(fakeSchool);
    mockUserFindByPk.mockResolvedValue({ id: PARENT_UUID });
    const fakeRating = {
      id: 'r1', schoolId: SCHOOL_UUID, parentId: PARENT_UUID, stars: 3,
      update: jest.fn().mockResolvedValue(true),
      toJSON: () => ({ id: 'r1', stars: 4 }),
    };
    mockSchoolRatingFindOne.mockResolvedValue(fakeRating);
    const req = { body: { stars: 4, schoolId: SCHOOL_UUID }, user: parentUser };
    const res = mkRes();
    await rateSchool(req, res);
    expect(fakeRating.update).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalled();
    const payload = res.json.mock.calls[0][0];
    expect(payload.success).toBe(true);
  });
});

describe('parentSchoolRatingController.getMySchoolRating', () => {
  beforeEach(() => jest.resetAllMocks());

  it('returns empty data when parent has no children', async () => {
    mockChildFindAll.mockResolvedValue([]);
    const req = { query: {}, user: { id: 'p1' } };
    const res = mkRes();
    await getMySchoolRating(req, res);
    expect(res.json).toHaveBeenCalled();
    const payload = res.json.mock.calls[0][0];
    expect(payload.success).toBe(true);
    expect(payload.data.rating).toBeNull();
  });

  it('returns empty data when child has no schoolId', async () => {
    const fakeChild = { id: 'c1', schoolId: null, childSchool: null };
    mockChildFindAll.mockResolvedValue([fakeChild]);
    const req = { query: {}, user: { id: 'p1' } };
    const res = mkRes();
    await getMySchoolRating(req, res);
    expect(res.json).toHaveBeenCalled();
    const payload = res.json.mock.calls[0][0];
    expect(payload.data.rating).toBeNull();
  });

  it('returns rating and summary when data exists', async () => {
    const fakeSchool = { id: 's1', name: 'Test', toJSON: () => ({ id: 's1', name: 'Test' }) };
    const fakeChild = { id: 'c1', schoolId: 's1', childSchool: fakeSchool };
    mockChildFindAll.mockResolvedValue([fakeChild]);
    const fakeRating = { id: 'r1', stars: 5, toJSON: () => ({ id: 'r1', stars: 5 }) };
    mockSchoolRatingFindOne.mockResolvedValue(fakeRating);
    mockSchoolRatingFindAll.mockResolvedValue([
      { ...fakeRating, ratingParent: null, toJSON: () => ({ id: 'r1', stars: 5 }) },
    ]);
    const req = { query: {}, user: { id: 'p1' } };
    const res = mkRes();
    await getMySchoolRating(req, res);
    expect(res.json).toHaveBeenCalled();
    const payload = res.json.mock.calls[0][0];
    expect(payload.success).toBe(true);
    expect(payload.data.rating).toBeDefined();
  });
});

describe('parentSchoolRatingController.getSchools', () => {
  beforeEach(() => jest.resetAllMocks());

  it('returns list of active schools', async () => {
    mockSchoolFindAll.mockResolvedValue([
      { id: 's1', name: 'School A', toJSON: () => ({ id: 's1', name: 'School A' }) },
    ]);
    const req = {};
    const res = mkRes();
    await getSchools(req, res);
    expect(res.json).toHaveBeenCalled();
    const payload = res.json.mock.calls[0][0];
    expect(payload.success).toBe(true);
    expect(payload.data).toHaveLength(1);
  });

  it('500 on DB error', async () => {
    mockSchoolFindAll.mockRejectedValue(new Error('db error'));
    const req = {};
    const res = mkRes();
    await getSchools(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});
