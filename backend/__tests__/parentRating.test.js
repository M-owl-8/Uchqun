import { jest } from '@jest/globals';

const mockUserFindByPk = jest.fn();
const mockUserUpdate = jest.fn();
const mockUserFindAll = jest.fn();
const mockUserFindOne = jest.fn();
const mockTRFindAll = jest.fn();
const mockTRFindOne = jest.fn();
const mockTRFindOrCreate = jest.fn();
const mockSRFindAll = jest.fn();
const mockSRFindOne = jest.fn();

jest.unstable_mockModule('../models/User.js', () => ({
  default: {
    findByPk: mockUserFindByPk,
    update: mockUserUpdate,
    findAll: mockUserFindAll,
    findOne: mockUserFindOne,
  },
}));
jest.unstable_mockModule('../models/Child.js', () => ({ default: { findOne: jest.fn(), findAll: jest.fn() } }));
// D-11: the controller now resolves the teacher through child → group.
jest.unstable_mockModule('../models/Group.js', () => ({ default: { findByPk: jest.fn(), findOne: jest.fn(), findAll: jest.fn() } }));
jest.unstable_mockModule('../models/TeacherRating.js', () => ({
  default: { findAll: mockTRFindAll, findOne: mockTRFindOne, findOrCreate: mockTRFindOrCreate },
}));
jest.unstable_mockModule('../models/School.js', () => ({ default: { findOne: jest.fn(), findAll: jest.fn() } }));
jest.unstable_mockModule('../models/SchoolRating.js', () => ({
  default: { findAll: mockSRFindAll, findOne: mockSRFindOne, findOrCreate: jest.fn() },
}));
jest.unstable_mockModule('../utils/logger.js', () => ({
  default: { error: jest.fn(), info: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

const { rateMyTeacher } = await import('../controllers/parent/parentTeacherRatingController.js');

const mkRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('parentRatingController.rateMyTeacher', () => {
  beforeEach(() => jest.clearAllMocks());

  it('400 when stars missing', async () => {
    const req = { user: { id: 'p1' }, body: {} };
    const res = mkRes();
    await rateMyTeacher(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('400 when stars out of range', async () => {
    for (const s of [0, 6, -1, 'abc']) {
      const req = { user: { id: 'p1' }, body: { stars: s } };
      const res = mkRes();
      await rateMyTeacher(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    }
  });

  // D-11: users.teacherId is NULL for every parent created on the normal enrolment
  // path, so this was the state of 100% of production parents and 400 made the
  // rating feature permanently unusable. The teacher is now resolved through
  // child → group → group.teacherId; only a genuinely unassigned child yields a
  // refusal, and it is 409 (state conflict), not 400 (bad request).
  it('409 RATING_NO_ASSIGNED_TEACHER when the child has no group at all', async () => {
    mockUserFindByPk.mockResolvedValue({ id: 'p1', teacherId: null });
    const ChildModel = (await import('../models/Child.js')).default;
    ChildModel.findOne.mockResolvedValue(null);
    const req = { user: { id: 'p1' }, body: { stars: 4 } };
    const res = mkRes();
    await rateMyTeacher(req, res);
    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json.mock.calls[0][0].error.code).toBe('RATING_NO_ASSIGNED_TEACHER');
  });

  it('resolves the teacher via child → group when users.teacherId is NULL', async () => {
    mockUserFindByPk.mockResolvedValue({ id: 'p1', teacherId: null });
    const ChildModel = (await import('../models/Child.js')).default;
    const GroupModel = (await import('../models/Group.js')).default;
    ChildModel.findOne.mockResolvedValue({ id: 'c1', groupId: 'g1' });
    GroupModel.findByPk.mockResolvedValue({ id: 'g1', teacherId: 't9' });
    const save = jest.fn().mockResolvedValue();
    mockTRFindOrCreate.mockResolvedValue([{ id: 'r1', stars: null, comment: null, save, toJSON: () => ({ id: 'r1' }) }, true]);
    mockTRFindAll.mockResolvedValue([{ stars: 4 }]);
    mockUserUpdate.mockResolvedValue([1]);

    const req = { user: { id: 'p1' }, body: { stars: 4 } };
    const res = mkRes();
    await rateMyTeacher(req, res);

    expect(mockTRFindOrCreate).toHaveBeenCalledWith(expect.objectContaining({
      where: { teacherId: 't9', parentId: 'p1' },
    }));
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });

  it('upserts rating + recalcs teacher average', async () => {
    mockUserFindByPk.mockResolvedValue({ id: 'p1', teacherId: 't1' });
    const save = jest.fn().mockResolvedValue();
    mockTRFindOrCreate.mockResolvedValue([{
      id: 'r1', stars: null, comment: null, save,
      toJSON: () => ({ id: 'r1' }),
    }, false]);
    mockTRFindAll.mockResolvedValue([{ stars: 5 }, { stars: 3 }]);
    const req = { user: { id: 'p1' }, body: { stars: 5, comment: 'great' } };
    const res = mkRes();
    await rateMyTeacher(req, res);
    expect(save).toHaveBeenCalled();
    expect(mockUserUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ rating: 4, totalRatings: 2 }),
      expect.objectContaining({ where: { id: 't1' } }),
    );
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });

  it('does not fail request if rating recalc throws', async () => {
    mockUserFindByPk.mockResolvedValue({ id: 'p1', teacherId: 't1' });
    mockTRFindOrCreate.mockResolvedValue([{
      stars: 4, comment: null, save: jest.fn().mockResolvedValue(), toJSON: () => ({}),
    }, true]);
    mockTRFindAll.mockRejectedValue(new Error('agg fail'));
    const req = { user: { id: 'p1' }, body: { stars: 4 } };
    const res = mkRes();
    await rateMyTeacher(req, res);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });
});
