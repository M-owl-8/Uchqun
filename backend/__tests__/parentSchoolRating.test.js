import { jest } from '@jest/globals';

const mockSchoolFindByPk = jest.fn();
const mockSchoolFindAll = jest.fn();
const mockSchoolRatingFindOne = jest.fn();
const mockSchoolRatingCreate = jest.fn();
const mockSchoolRatingUpdate = jest.fn();
const mockSchoolRatingFindAll = jest.fn().mockResolvedValue([]);
const mockChildFindOne = jest.fn();
const mockChildFindAll = jest.fn();
const mockSchoolFindByPkForChild = jest.fn();

jest.unstable_mockModule('../models/Child.js', () => ({
  default: { findOne: mockChildFindOne, findAll: mockChildFindAll },
}));
jest.unstable_mockModule('../models/School.js', () => ({
  default: { findByPk: mockSchoolFindByPk, findAll: mockSchoolFindAll },
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

const VALID_INDICATORS = {
  parent_indicator_1: 4, parent_indicator_2: 3, parent_indicator_3: 5,
  parent_indicator_4: 2, parent_indicator_5: 4,
};

describe('parentSchoolRatingController.rateSchool', () => {
  beforeEach(() => jest.resetAllMocks());

  it('403 for non-parent role', async () => {
    const req = {
      body: { schoolId: SCHOOL_UUID, indicators: VALID_INDICATORS, comment: 'ok' },
      user: { id: PARENT_UUID, role: 'admin', schoolId: SCHOOL_UUID },
    };
    const res = mkRes();
    await rateSchool(req, res);
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('400 when comment is missing', async () => {
    const req = { body: { schoolId: SCHOOL_UUID, indicators: VALID_INDICATORS, comment: null }, user: parentUser };
    const res = mkRes();
    await rateSchool(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('400 when indicators are missing', async () => {
    const req = { body: { schoolId: SCHOOL_UUID, comment: 'good', indicators: null }, user: parentUser };
    const res = mkRes();
    await rateSchool(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('400 when schoolId is missing', async () => {
    const req = { body: { indicators: VALID_INDICATORS, comment: 'ok', schoolId: null }, user: parentUser };
    const res = mkRes();
    await rateSchool(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('404 when school not found by PK', async () => {
    mockSchoolFindByPk.mockResolvedValue(null);
    const req = { body: { indicators: VALID_INDICATORS, comment: 'ok', schoolId: SCHOOL_UUID }, user: parentUser };
    const res = mkRes();
    await rateSchool(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('creates new rating on success', async () => {
    mockSchoolFindByPk.mockResolvedValue({ id: SCHOOL_UUID });
    mockSchoolRatingFindOne.mockResolvedValue(null);
    const fakeRating = {
      id: 'r1', schoolId: SCHOOL_UUID, parentId: PARENT_UUID, stars: 4,
      toJSON: () => ({ id: 'r1', stars: 4 }),
    };
    mockSchoolRatingCreate.mockResolvedValue(fakeRating);
    const req = {
      body: { schoolId: SCHOOL_UUID, indicators: VALID_INDICATORS, comment: 'Good school' },
      user: parentUser,
    };
    const res = mkRes();
    await rateSchool(req, res);
    expect(res.json).toHaveBeenCalled();
    const payload = res.json.mock.calls[0][0];
    expect(payload.success).toBe(true);
  });

  it('updates existing rating on success', async () => {
    mockSchoolFindByPk.mockResolvedValue({ id: SCHOOL_UUID });
    const fakeRating = {
      id: 'r1', update: jest.fn().mockResolvedValue(true),
      toJSON: () => ({ id: 'r1', stars: 4 }),
    };
    mockSchoolRatingFindOne.mockResolvedValue(fakeRating);
    const req = {
      body: { schoolId: SCHOOL_UUID, indicators: VALID_INDICATORS, comment: 'Updated comment' },
      user: parentUser,
    };
    const res = mkRes();
    await rateSchool(req, res);
    expect(fakeRating.update).toHaveBeenCalled();
    expect(res.json.mock.calls[0][0].success).toBe(true);
  });
});

describe('parentSchoolRatingController.getMySchoolRating', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockSchoolRatingFindAll.mockResolvedValue([]);
  });

  it('returns empty data when parent has no children', async () => {
    mockChildFindAll.mockResolvedValue([]);
    const req = { query: {}, user: { id: 'p1' } };
    const res = mkRes();
    await getMySchoolRating(req, res);
    const payload = res.json.mock.calls[0][0];
    expect(payload.success).toBe(true);
    expect(payload.data.rating).toBeNull();
  });

  it('returns empty data when child has no schoolId', async () => {
    mockChildFindAll.mockResolvedValue([{ id: 'c1', schoolId: null }]);
    const req = { query: {}, user: { id: 'p1' } };
    const res = mkRes();
    await getMySchoolRating(req, res);
    const payload = res.json.mock.calls[0][0];
    expect(payload.data.rating).toBeNull();
  });

  it('returns { school, rating, summary } when data exists', async () => {
    mockChildFindAll.mockResolvedValue([{ id: 'c1', schoolId: 's1' }]);
    mockSchoolFindByPk.mockResolvedValue({ id: 's1', name: 'Test School' });
    const fakeRating = { id: 'r1', stars: 5, toJSON: () => ({ id: 'r1', stars: 5 }) };
    mockSchoolRatingFindOne.mockResolvedValue(fakeRating);
    const req = { query: {}, user: { id: 'p1' } };
    const res = mkRes();
    await getMySchoolRating(req, res);
    const payload = res.json.mock.calls[0][0];
    expect(payload.success).toBe(true);
    // New shape: school object (not schoolName string) so frontend TeacherRating.jsx:80-81 can read school.id
    expect(payload.data.school).toEqual({ id: 's1', name: 'Test School' });
    expect(payload.data.rating).toBeDefined();
    expect(payload.data.summary).toBeDefined();
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
