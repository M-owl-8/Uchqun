// G2 / BACKEND-040 + BACKEND-041 + BACKEND-043 regression LOCK tests.
//
// Verified safe at sweep time — these controllers ALREADY call
// validateChildAccess before any mutation, so the original Batch-10
// findings (mealController updateMeal/deleteMeal, mealPlanController
// updateMealPlan/deleteMealPlan, childAssessmentController
// updateAssessment, teacherResourceController deleteResource) are
// closed in current code.
//
// These tests LOCK that closure — if a future refactor removes the
// validateChildAccess call or the school-scope branch, the relevant
// test fails loud. They're cheap insurance.

import { jest } from '@jest/globals';

const mockMealFindByPk     = jest.fn();
const mockMealPlanFindByPk = jest.fn();
const mockAssessmentFindByPk = jest.fn();
const mockResourceFindByPk = jest.fn();
const mockValidateChildAccess = jest.fn();
const mockIsTeacherAssignedToChild = jest.fn();
const mockEmitToUser = jest.fn();

jest.unstable_mockModule('../../models/Meal.js', () => ({
  default: { findByPk: mockMealFindByPk, findAndCountAll: jest.fn() },
}));
jest.unstable_mockModule('../../models/MealPlan.js', () => ({
  default: { findByPk: mockMealPlanFindByPk },
}));
jest.unstable_mockModule('../../models/ChildAssessment.js', () => ({
  default: { findByPk: mockAssessmentFindByPk },
}));
jest.unstable_mockModule('../../models/TeacherResource.js', () => ({
  default: { findByPk: mockResourceFindByPk },
}));
jest.unstable_mockModule('../../models/Child.js', () => ({ default: {} }));
jest.unstable_mockModule('../../models/User.js', () => ({ default: {} }));
jest.unstable_mockModule('../../models/AssessmentCriteria.js', () => ({ default: {} }));
jest.unstable_mockModule('../../models/Group.js', () => ({ default: {} }));
jest.unstable_mockModule('../../models/ParentMeal.js', () => ({ default: {} }));
jest.unstable_mockModule('../../utils/schoolValidation.js', () => ({
  validateChildAccess: mockValidateChildAccess,
  isTeacherAssignedToChild: mockIsTeacherAssignedToChild,
}));
jest.unstable_mockModule('../../utils/logger.js', () => ({
  default: { info: jest.fn(), error: jest.fn(), warn: jest.fn() },
}));
jest.unstable_mockModule('../../config/socket.js', () => ({
  emitToUser: mockEmitToUser,
}));

const { updateMeal, deleteMeal } = await import('../../controllers/mealController.js');
const { updateMealPlan, deleteMealPlan } = await import('../../controllers/mealPlanController.js');
const { updateAssessment } = await import('../../controllers/childAssessmentController.js');
const { deleteResource } = await import('../../controllers/teacherResourceController.js');

const mkRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};
const teacherReq = (overrides = {}) => ({
  params: { id: 'rec-1' },
  body: {},
  user: { id: 't1', role: 'teacher', schoolId: 'school-A' },
  ...overrides,
});

beforeEach(() => {
  jest.clearAllMocks();
  mockValidateChildAccess.mockResolvedValue(null);      // default: scope DENY
  mockIsTeacherAssignedToChild.mockResolvedValue(true);
});

describe('BACKEND-043 — mealController scope lock', () => {
  it('updateMeal: 404 when validateChildAccess returns null (cross-school attempt)', async () => {
    mockMealFindByPk.mockResolvedValue({ id: 'm1', childId: 'c-OTHER', update: jest.fn() });
    const res = mkRes();
    await updateMeal(teacherReq(), res);
    expect(mockValidateChildAccess).toHaveBeenCalledWith('c-OTHER', expect.any(Object));
    expect(res.status).toHaveBeenCalledWith(404);
  });
  it('deleteMeal: 404 when validateChildAccess returns null', async () => {
    mockMealFindByPk.mockResolvedValue({ id: 'm1', childId: 'c-OTHER', destroy: jest.fn() });
    const res = mkRes();
    await deleteMeal(teacherReq(), res);
    expect(mockValidateChildAccess).toHaveBeenCalledWith('c-OTHER', expect.any(Object));
    expect(res.status).toHaveBeenCalledWith(404);
  });
});

describe('BACKEND-041 — mealPlanController scope lock', () => {
  it('updateMealPlan: 404 when validateChildAccess returns null', async () => {
    mockMealPlanFindByPk.mockResolvedValue({ id: 'mp1', childId: 'c-OTHER', save: jest.fn() });
    const res = mkRes();
    await updateMealPlan(teacherReq(), res);
    expect(mockValidateChildAccess).toHaveBeenCalledWith('c-OTHER', expect.any(Object));
    expect(res.status).toHaveBeenCalledWith(404);
  });
  it('deleteMealPlan: 404 when validateChildAccess returns null', async () => {
    mockMealPlanFindByPk.mockResolvedValue({ id: 'mp1', childId: 'c-OTHER', destroy: jest.fn() });
    const res = mkRes();
    await deleteMealPlan(teacherReq(), res);
    expect(mockValidateChildAccess).toHaveBeenCalledWith('c-OTHER', expect.any(Object));
    expect(res.status).toHaveBeenCalledWith(404);
  });
});

describe('BACKEND-040 — childAssessmentController scope lock', () => {
  it('updateAssessment: 404 when validateChildAccess returns null', async () => {
    mockAssessmentFindByPk.mockResolvedValue({
      id: 'a1', childId: 'c-OTHER', teacherId: 't1', save: jest.fn(),
    });
    const res = mkRes();
    await updateAssessment(teacherReq(), res);
    expect(mockValidateChildAccess).toHaveBeenCalledWith('c-OTHER', expect.any(Object));
    expect(res.status).toHaveBeenCalledWith(404);
  });
});

describe('BACKEND-040 — teacherResourceController school-scope lock', () => {
  it('deleteResource: 404 when admin attempts cross-school delete', async () => {
    mockResourceFindByPk.mockResolvedValue({
      id: 'r1', schoolId: 'school-OTHER', teacherId: 'tX', destroy: jest.fn(),
    });
    const req = {
      params: { id: 'r1' },
      user: { id: 'a1', role: 'admin', schoolId: 'school-A' },
    };
    const res = mkRes();
    await deleteResource(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });
});
