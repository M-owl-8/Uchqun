import { jest } from '@jest/globals';

const mockMealFindAll = jest.fn();
const mockMealFindOne = jest.fn();
const mockMealFindByPk = jest.fn();
const mockMealCreate = jest.fn();
const mockChildFindAll = jest.fn();
const mockChildFindOne = jest.fn();
const mockUserFindAll = jest.fn();
const mockValidateChildAccess = jest.fn();
const mockCreateNotification = jest.fn();
const mockEmitToUser = jest.fn();

jest.unstable_mockModule('../models/Meal.js', () => ({
  default: {
    findAll: mockMealFindAll,
    findOne: mockMealFindOne,
    findByPk: mockMealFindByPk,
    create: mockMealCreate,
  },
}));
jest.unstable_mockModule('../models/Child.js', () => ({
  default: { findAll: mockChildFindAll, findOne: mockChildFindOne },
}));
jest.unstable_mockModule('../models/User.js', () => ({
  default: { findAll: mockUserFindAll },
}));
jest.unstable_mockModule('../utils/schoolValidation.js', () => ({
  validateChildAccess: mockValidateChildAccess,
}));
jest.unstable_mockModule('../controllers/notificationController.js', () => ({
  createNotification: mockCreateNotification,
}));
jest.unstable_mockModule('../config/socket.js', () => ({ emitToUser: mockEmitToUser }));

const { getMeals, getMeal, createMeal, updateMeal, deleteMeal } = await import('../controllers/mealController.js');

const mkRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('mealController', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('getMeals', () => {
    it('parent: empty array when parent has no children', async () => {
      mockChildFindAll.mockResolvedValue([]);
      const req = { user: { id: 'p1', role: 'parent' }, query: {} };
      const res = mkRes();
      await getMeals(req, res);
      expect(res.json).toHaveBeenCalledWith([]);
    });

    it('parent: 403 when childId not owned', async () => {
      mockChildFindAll.mockResolvedValue([{ id: 'c1' }]);
      const req = { user: { id: 'p1', role: 'parent' }, query: { childId: 'OTHER' } };
      const res = mkRes();
      await getMeals(req, res);
      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('teacher: empty array when no assigned parents', async () => {
      mockUserFindAll.mockResolvedValue([]);
      const req = { user: { id: 't1', role: 'teacher' }, query: {} };
      const res = mkRes();
      await getMeals(req, res);
      expect(res.json).toHaveBeenCalledWith([]);
    });

    it('teacher: 403 when childId not in assigned children', async () => {
      mockUserFindAll.mockResolvedValue([{ id: 'p1' }]);
      mockChildFindAll.mockResolvedValue([{ id: 'c1' }]);
      const req = { user: { id: 't1', role: 'teacher' }, query: { childId: 'OTHER' } };
      const res = mkRes();
      await getMeals(req, res);
      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('admin: returns all meals when no schoolId (global access)', async () => {
      mockMealFindAll.mockResolvedValue([{ id: 'm1' }]);
      const req = { user: { id: 'a1', role: 'admin' }, query: {} };
      const res = mkRes();
      await getMeals(req, res);
      const where = mockMealFindAll.mock.calls[0][0].where;
      expect(where.childId).toBeUndefined();
    });

    it('admin: scopes to school children when schoolId set (BACKEND-005)', async () => {
      mockChildFindAll.mockResolvedValue([{ id: 'c1' }, { id: 'c2' }]);
      mockMealFindAll.mockResolvedValue([]);
      const req = { user: { id: 'a1', role: 'admin', schoolId: 's1' }, query: {} };
      const res = mkRes();
      await getMeals(req, res);
      expect(mockChildFindAll).toHaveBeenCalledWith(expect.objectContaining({ where: { schoolId: 's1' } }));
      const where = mockMealFindAll.mock.calls[0][0].where;
      expect(where.childId).toBeDefined();
    });

    it('parent: applies date and mealType filters', async () => {
      mockChildFindAll.mockResolvedValue([{ id: 'c1' }]);
      mockMealFindAll.mockResolvedValue([]);
      const req = { user: { id: 'p1', role: 'parent' }, query: { date: '2026-05-06', mealType: 'lunch' } };
      const res = mkRes();
      await getMeals(req, res);
      const where = mockMealFindAll.mock.calls[0][0].where;
      expect(where.date).toBe('2026-05-06');
      expect(where.mealType).toBe('lunch');
    });
  });

  describe('getMeal', () => {
    it('parent: 404 when child not found', async () => {
      mockChildFindOne.mockResolvedValue(null);
      const req = { user: { id: 'p1', role: 'parent' }, params: { id: 'm1' } };
      const res = mkRes();
      await getMeal(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('parent: 404 when meal not found for child', async () => {
      mockChildFindOne.mockResolvedValue({ id: 'c1' });
      mockMealFindOne.mockResolvedValue(null);
      const req = { user: { id: 'p1', role: 'parent' }, params: { id: 'm1' } };
      const res = mkRes();
      await getMeal(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('parent: returns meal when found', async () => {
      mockChildFindOne.mockResolvedValue({ id: 'c1' });
      mockMealFindOne.mockResolvedValue({ id: 'm1' });
      const req = { user: { id: 'p1', role: 'parent' }, params: { id: 'm1' } };
      const res = mkRes();
      await getMeal(req, res);
      expect(res.json).toHaveBeenCalledWith({ id: 'm1' });
    });
  });

  describe('createMeal', () => {
    it('rejects parent role', async () => {
      const req = { user: { id: 'p1', role: 'parent' }, body: {} };
      const res = mkRes();
      await createMeal(req, res);
      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('400 when required fields missing', async () => {
      const req = { user: { role: 'teacher' }, body: { childId: 'c1' } };
      const res = mkRes();
      await createMeal(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('404 when validateChildAccess fails', async () => {
      mockValidateChildAccess.mockResolvedValue(null);
      const req = {
        user: { role: 'teacher' },
        body: { childId: 'c1', mealName: 'lunch', description: 'd', mealType: 'lunch', date: '2026-05-06' },
      };
      const res = mkRes();
      await createMeal(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('creates meal and emits socket event', async () => {
      mockValidateChildAccess.mockResolvedValue({ id: 'c1', firstName: 'A', parentId: 'p1' });
      mockMealCreate.mockResolvedValue({ id: 'm1' });
      mockMealFindByPk.mockResolvedValue({ id: 'm1', toJSON: () => ({ id: 'm1' }) });
      const req = {
        user: { role: 'teacher' },
        body: { childId: 'c1', mealName: 'lunch', description: 'd', mealType: 'lunch', date: '2026-05-06' },
      };
      const res = mkRes();
      await createMeal(req, res);
      expect(mockMealCreate).toHaveBeenCalled();
      expect(mockCreateNotification).toHaveBeenCalled();
      expect(mockEmitToUser).toHaveBeenCalledWith('p1', 'meal:created', expect.any(Object));
    });
  });

  describe('updateMeal — BACKEND-043', () => {
    it('404 when child belongs to different school', async () => {
      const update = jest.fn().mockResolvedValue();
      mockMealFindByPk.mockResolvedValue({ id: 'm1', childId: 'c_school_b', update });
      mockValidateChildAccess.mockResolvedValue(null);
      const req = {
        user: { id: 't1', role: 'teacher', schoolId: 'SCHOOL_A' },
        params: { id: 'm1' },
        body: {},
      };
      const res = mkRes();
      await updateMeal(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
      expect(update).not.toHaveBeenCalled();
    });
  });

  describe('deleteMeal — BACKEND-043', () => {
    it('404 when child belongs to different school', async () => {
      const destroy = jest.fn().mockResolvedValue();
      mockMealFindByPk.mockResolvedValue({ id: 'm1', childId: 'c_school_b', destroy });
      mockValidateChildAccess.mockResolvedValue(null);
      const req = {
        user: { id: 't1', role: 'teacher', schoolId: 'SCHOOL_A' },
        params: { id: 'm1' },
      };
      const res = mkRes();
      await deleteMeal(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
      expect(destroy).not.toHaveBeenCalled();
    });
  });
});
