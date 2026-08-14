// D-47 regression tests — cross-tenant read of child-scoped resources.
//
// Found in the DEEP HARDENING campaign, phase P7: an admin at school A could
// read another school's child records simply by supplying that child's id:
//
//   GET /activities?childId=<child at school B>  -> 200, 13 records
//   GET /meals?childId=<child at school B>       -> 200, 39 records
//   GET /meals/<meal id of child at school B>    -> 200, the record
//
// Cause: in activityController.getActivities and mealController.getMeals the
// admin/reception branch reads
//
//     if (childId) { where.childId = childId; }
//     else if (req.user.schoolId) { ...school scope... }
//
// so supplying childId takes the first branch and skips the school scope
// entirely. mealController.getMeal had no admin filter at all.
//
// CLAUDE.md, "Child-scoped resource access pattern (mandatory)", names
// Activity and Meal explicitly and requires validateChildAccess for exactly
// this case. These tests assert that requirement at the controller boundary.
//
// FAIL-FIRST: every test in this file fails against the pre-fix controllers.

import { jest } from '@jest/globals';

const mockActivityFindAll = jest.fn();
const mockMealFindAll = jest.fn();
const mockMealFindAndCountAll = jest.fn();
const mockMealFindByPk = jest.fn();
const mockMealFindOne = jest.fn();
const mockChildFindAll = jest.fn();
const mockChildFindByPk = jest.fn();
const mockValidateChildAccess = jest.fn();
const mockIsTeacherAssignedToChild = jest.fn();

jest.unstable_mockModule('../../models/Activity.js', () => ({
  default: { findAll: mockActivityFindAll, findByPk: jest.fn(), create: jest.fn() },
}));
jest.unstable_mockModule('../../models/Meal.js', () => ({
  default: { findAll: mockMealFindAll, findAndCountAll: mockMealFindAndCountAll, findByPk: mockMealFindByPk, findOne: mockMealFindOne, create: jest.fn() },
}));
jest.unstable_mockModule('../../models/Child.js', () => ({
  default: { findAll: mockChildFindAll, findByPk: mockChildFindByPk, findOne: jest.fn() },
}));
jest.unstable_mockModule('../../models/User.js', () => ({
  default: { findAll: jest.fn().mockResolvedValue([]), findByPk: jest.fn(), findOne: jest.fn() },
}));
jest.unstable_mockModule('../../utils/schoolValidation.js', () => ({
  validateChildAccess: mockValidateChildAccess,
  isTeacherAssignedToChild: mockIsTeacherAssignedToChild,
  findChildScopedResource: jest.fn(),
}));
jest.unstable_mockModule('../../controllers/notificationController.js', () => ({
  createNotification: jest.fn(),
}));
jest.unstable_mockModule('../../config/socket.js', () => ({
  emitToUser: jest.fn(), getIO: jest.fn(),
}));
jest.unstable_mockModule('../../utils/logger.js', () => ({
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

const { getActivities } = await import('../../controllers/activityController.js');
const { getMeals, getMeal } = await import('../../controllers/mealController.js');

const HOME_SCHOOL = 'school-A-0000-0000-0000-000000000001';
const FOREIGN_CHILD = 'child-B-0000-0000-0000-000000000002';

const makeRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

beforeEach(() => {
  jest.clearAllMocks();
  // the foreign child is NOT accessible to this caller
  mockValidateChildAccess.mockResolvedValue(null);
  mockIsTeacherAssignedToChild.mockResolvedValue(true);
  mockChildFindAll.mockResolvedValue([]);
  // if the controller ever reaches the query, it would return the foreign rows
  mockActivityFindAll.mockResolvedValue([{ id: 'act-1', childId: FOREIGN_CHILD }]);
  mockMealFindAll.mockResolvedValue([{ id: 'meal-1', childId: FOREIGN_CHILD }]);
  mockMealFindAndCountAll.mockResolvedValue({ rows: [{ id: 'meal-1', childId: FOREIGN_CHILD }], count: 1 });
});

describe('D-47 — admin/reception must not read another school\'s child records', () => {
  for (const role of ['admin', 'reception']) {
    test(`getActivities refuses a foreign childId for role=${role}`, async () => {
      const req = { user: { id: 'u1', role, schoolId: HOME_SCHOOL }, query: { childId: FOREIGN_CHILD } };
      const res = makeRes();
      await getActivities(req, res);

      expect(mockValidateChildAccess).toHaveBeenCalledWith(FOREIGN_CHILD, req);
      expect(res.status).toHaveBeenCalledWith(403);
      const payload = res.json.mock.calls.at(-1)?.[0];
      expect(JSON.stringify(payload ?? {})).not.toContain(FOREIGN_CHILD);
    });

    test(`getMeals refuses a foreign childId for role=${role}`, async () => {
      const req = { user: { id: 'u1', role, schoolId: HOME_SCHOOL }, query: { childId: FOREIGN_CHILD } };
      const res = makeRes();
      await getMeals(req, res);

      expect(mockValidateChildAccess).toHaveBeenCalledWith(FOREIGN_CHILD, req);
      expect(res.status).toHaveBeenCalledWith(403);
      const payload = res.json.mock.calls.at(-1)?.[0];
      expect(JSON.stringify(payload ?? {})).not.toContain(FOREIGN_CHILD);
    });
  }

  test('getMeal refuses a single meal belonging to another school\'s child', async () => {
    // The caller's own school contains a different child. A school-scoped
    // lookup therefore cannot match this meal; an UNSCOPED lookup (the pre-fix
    // "Admin can see all meals - no filter needed" branch) matches it and
    // returns another school's record.
    mockChildFindAll.mockResolvedValue([{ id: 'child-A-own' }]);
    mockMealFindOne.mockImplementation(async ({ where }) => (
      where.childId === undefined ? { id: 'meal-1', childId: FOREIGN_CHILD } : null
    ));
    const req = { user: { id: 'u1', role: 'admin', schoolId: HOME_SCHOOL }, params: { id: 'meal-1' } };
    const res = makeRes();
    await getMeal(req, res);

    const statuses = res.status.mock.calls.map((c) => c[0]);
    expect(statuses.some((s) => s === 403 || s === 404)).toBe(true);
    const payload = res.json.mock.calls.at(-1)?.[0];
    expect(JSON.stringify(payload ?? {})).not.toContain(FOREIGN_CHILD);
  });
});

describe('D-47 — the same endpoints still work for a child the caller may see', () => {
  test('getActivities returns records when the child IS accessible', async () => {
    const OWN_CHILD = 'child-A-0000-0000-0000-000000000003';
    mockValidateChildAccess.mockResolvedValue({ id: OWN_CHILD, schoolId: HOME_SCHOOL });
    mockActivityFindAll.mockResolvedValue([{ id: 'act-2', childId: OWN_CHILD }]);
    const req = { user: { id: 'u1', role: 'admin', schoolId: HOME_SCHOOL }, query: { childId: OWN_CHILD } };
    const res = makeRes();
    await getActivities(req, res);

    expect(res.status).not.toHaveBeenCalledWith(403);
    expect(mockActivityFindAll).toHaveBeenCalled();
    const where = mockActivityFindAll.mock.calls[0][0].where;
    expect(where.childId).toBe(OWN_CHILD);
  });
});
