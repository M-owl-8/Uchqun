import { jest } from '@jest/globals';

const mockUserFindByPk = jest.fn();
const mockPAFindAndCount = jest.fn();
const mockPAFindOne = jest.fn();
const mockActivityFindAndCount = jest.fn();
const mockActivityFindOne = jest.fn();
const mockPMealFindAndCount = jest.fn();
const mockPMealFindOne = jest.fn();
const mockMealFindAndCount = jest.fn();
const mockMealFindOne = jest.fn();

jest.unstable_mockModule('../models/User.js', () => ({
  default: { findByPk: mockUserFindByPk },
}));
jest.unstable_mockModule('../models/ParentActivity.js', () => ({
  default: { findAndCountAll: mockPAFindAndCount, findOne: mockPAFindOne },
}));
jest.unstable_mockModule('../models/Activity.js', () => ({
  default: { findAndCountAll: mockActivityFindAndCount, findOne: mockActivityFindOne },
}));
jest.unstable_mockModule('../models/ParentMeal.js', () => ({
  default: { findAndCountAll: mockPMealFindAndCount, findOne: mockPMealFindOne },
}));
jest.unstable_mockModule('../models/Meal.js', () => ({
  default: { findAndCountAll: mockMealFindAndCount, findOne: mockMealFindOne },
}));
const mockChildFindAll = jest.fn();
jest.unstable_mockModule('../models/Child.js', () => ({
  default: { findAll: mockChildFindAll },
}));
jest.unstable_mockModule('../utils/logger.js', () => ({
  default: { error: jest.fn(), info: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));
jest.unstable_mockModule('../utils/pagination.js', () => ({
  parsePagination: () => ({ limit: 50, offset: 0 }),
}));

const { getMyActivities, getActivityById } = await import('../controllers/parent/parentActivityController.js');
const { getMyMeals, getMealById } = await import('../controllers/parent/parentMealController.js');

const mkRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('parentActivityController', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('getMyActivities', () => {
    it('parent without group: queries legacy ParentActivity scoped to parentId', async () => {
      mockUserFindByPk.mockResolvedValue({ groupId: null });
      mockPAFindAndCount.mockResolvedValue({ rows: [], count: 0 });
      const req = { user: { id: 'p1' }, query: {} };
      const res = mkRes();
      await getMyActivities(req, res);
      const where = mockPAFindAndCount.mock.calls[0][0].where;
      expect(where.parentId).toBe('p1');
    });

    it('parent with group: queries Activity scoped to own children', async () => {
      mockUserFindByPk.mockResolvedValue({ groupId: 'g1' });
      mockChildFindAll.mockResolvedValue([{ id: 'c1' }, { id: 'c2' }]);
      mockActivityFindAndCount.mockResolvedValue({ rows: [], count: 0 });
      const req = { user: { id: 'p1' }, query: {} };
      const res = mkRes();
      await getMyActivities(req, res);
      const opts = mockActivityFindAndCount.mock.calls[0][0];
      const includeWhere = opts.include[0].where;
      expect(includeWhere.id).toBeDefined();
    });

    it('parent with group: 403 when childId is not own child', async () => {
      mockUserFindByPk.mockResolvedValue({ groupId: 'g1' });
      mockChildFindAll.mockResolvedValue([{ id: 'c1' }]);
      const req = { user: { id: 'p1' }, query: { childId: 'OTHER' } };
      const res = mkRes();
      await getMyActivities(req, res);
      expect(res.status).toHaveBeenCalledWith(403);
    });
  });

  describe('getActivityById', () => {
    it('group-assigned: 404 when activity outside group', async () => {
      mockUserFindByPk.mockResolvedValue({ groupId: 'g1' });
      mockActivityFindOne.mockResolvedValue(null);
      const req = { user: { id: 'p1' }, params: { id: 'a1' } };
      const res = mkRes();
      await getActivityById(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('legacy parent: queries ParentActivity by id+parentId', async () => {
      mockUserFindByPk.mockResolvedValue({ groupId: null });
      mockPAFindOne.mockResolvedValue({ id: 'a1' });
      const req = { user: { id: 'p1' }, params: { id: 'a1' } };
      const res = mkRes();
      await getActivityById(req, res);
      expect(mockPAFindOne).toHaveBeenCalledWith(expect.objectContaining({
        where: { id: 'a1', parentId: 'p1' },
      }));
    });
  });
});

describe('parentMealController', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('getMyMeals', () => {
    it('parent with group: queries Meal scoped to own children', async () => {
      mockUserFindByPk.mockResolvedValue({ groupId: 'g1' });
      mockChildFindAll.mockResolvedValue([{ id: 'c1' }]);
      mockMealFindAndCount.mockResolvedValue({ rows: [], count: 0 });
      const req = { user: { id: 'p1' }, query: {} };
      const res = mkRes();
      await getMyMeals(req, res);
      const opts = mockMealFindAndCount.mock.calls[0][0];
      expect(opts.include[0].where.id).toBeDefined();
    });

    it('parent without group: queries legacy ParentMeal', async () => {
      mockUserFindByPk.mockResolvedValue({ groupId: null });
      mockPMealFindAndCount.mockResolvedValue({ rows: [], count: 0 });
      const req = { user: { id: 'p1' }, query: {} };
      const res = mkRes();
      await getMyMeals(req, res);
      const where = mockPMealFindAndCount.mock.calls[0][0].where;
      expect(where.parentId).toBe('p1');
    });
  });

  describe('getMealById', () => {
    it('group-assigned: 404 when meal outside group', async () => {
      mockUserFindByPk.mockResolvedValue({ groupId: 'g1' });
      mockMealFindOne.mockResolvedValue(null);
      const req = { user: { id: 'p1' }, params: { id: 'm1' } };
      const res = mkRes();
      await getMealById(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('legacy parent: queries ParentMeal by id+parentId', async () => {
      mockUserFindByPk.mockResolvedValue({ groupId: null });
      mockPMealFindOne.mockResolvedValue({ id: 'm1' });
      const req = { user: { id: 'p1' }, params: { id: 'm1' } };
      const res = mkRes();
      await getMealById(req, res);
      expect(mockPMealFindOne).toHaveBeenCalledWith(expect.objectContaining({
        where: { id: 'm1', parentId: 'p1' },
      }));
    });
  });
});
