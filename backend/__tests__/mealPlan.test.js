import { jest } from '@jest/globals';

const mockFindAll = jest.fn();
const mockFindOrCreate = jest.fn();
const mockFindByPk = jest.fn();
const mockValidateChildAccess = jest.fn();

jest.unstable_mockModule('../models/MealPlan.js', () => ({
  default: { findAll: mockFindAll, findOrCreate: mockFindOrCreate, findByPk: mockFindByPk },
}));
jest.unstable_mockModule('../models/Child.js', () => ({ default: {} }));
jest.unstable_mockModule('../utils/schoolValidation.js', () => ({
  validateChildAccess: mockValidateChildAccess,
}));
jest.unstable_mockModule('../utils/logger.js', () => ({
  default: { error: jest.fn(), info: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

const { getMealPlans, createMealPlan, updateMealPlan, deleteMealPlan } = await import('../controllers/mealPlanController.js');

const mkRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('mealPlanController', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('getMealPlans', () => {
    it('400 when childId missing', async () => {
      const req = { query: {} };
      const res = mkRes();
      await getMealPlans(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('applies date range when both startDate and endDate provided', async () => {
      mockFindAll.mockResolvedValue([]);
      const req = { query: { childId: 'c1', startDate: '2026-01-01', endDate: '2026-01-31' } };
      const res = mkRes();
      await getMealPlans(req, res);
      const where = mockFindAll.mock.calls[0][0].where;
      expect(where.date).toBeDefined();
    });
  });

  describe('createMealPlan', () => {
    it('400 when fields missing', async () => {
      const req = { user: { id: 't1' }, body: {} };
      const res = mkRes();
      await createMealPlan(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('400 when mealType invalid', async () => {
      const req = {
        user: { id: 't1' },
        body: { childId: 'c1', date: '2026-05-06', mealType: 'invalid', plannedMenu: 'soup' },
      };
      const res = mkRes();
      await createMealPlan(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('404 when child access denied', async () => {
      mockValidateChildAccess.mockResolvedValue(null);
      const req = {
        user: { id: 't1' },
        body: { childId: 'c1', date: '2026-05-06', mealType: 'lunch', plannedMenu: 'soup' },
      };
      const res = mkRes();
      await createMealPlan(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('creates new (201)', async () => {
      mockValidateChildAccess.mockResolvedValue({ id: 'c1' });
      mockFindOrCreate.mockResolvedValue([{ id: 'mp1' }, true]);
      const req = {
        user: { id: 't1' },
        body: { childId: 'c1', date: '2026-05-06', mealType: 'lunch', plannedMenu: 'soup' },
      };
      const res = mkRes();
      await createMealPlan(req, res);
      expect(res.status).toHaveBeenCalledWith(201);
    });

    it('updates existing (200)', async () => {
      mockValidateChildAccess.mockResolvedValue({ id: 'c1' });
      const save = jest.fn().mockResolvedValue();
      mockFindOrCreate.mockResolvedValue([{ id: 'mp1', save }, false]);
      const req = {
        user: { id: 't1' },
        body: { childId: 'c1', date: '2026-05-06', mealType: 'lunch', plannedMenu: 'pasta' },
      };
      const res = mkRes();
      await createMealPlan(req, res);
      expect(save).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('updateMealPlan — BACKEND-041', () => {
    it('404 when child belongs to different school', async () => {
      const save = jest.fn().mockResolvedValue();
      mockFindByPk.mockResolvedValue({ id: 'mp1', childId: 'c_school_b', save });
      mockValidateChildAccess.mockResolvedValue(null);
      const req = {
        user: { id: 't1', role: 'teacher', schoolId: 'SCHOOL_A' },
        params: { id: 'mp1' },
        body: {},
      };
      const res = mkRes();
      await updateMealPlan(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
      expect(save).not.toHaveBeenCalled();
    });
  });

  describe('deleteMealPlan — BACKEND-041', () => {
    it('404 when child belongs to different school', async () => {
      const destroy = jest.fn().mockResolvedValue();
      mockFindByPk.mockResolvedValue({ id: 'mp1', childId: 'c_school_b', destroy });
      mockValidateChildAccess.mockResolvedValue(null);
      const req = {
        user: { id: 't1', role: 'teacher', schoolId: 'SCHOOL_A' },
        params: { id: 'mp1' },
      };
      const res = mkRes();
      await deleteMealPlan(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
      expect(destroy).not.toHaveBeenCalled();
    });
  });
});
