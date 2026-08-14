// D-53 regression tests — the D-47 class, still live in two more controllers.
//
// Found by the REBUILT isolation suite in Campaign II P3 (250 cells across
// 5 roles). The suite it replaced was 29/29 PASS and could not have found any
// of this: it had no reception probes, no write probes, and never supplied a
// childId as an admin.
//
//   GET /service-plans?childId=<child at another school>   -> 200 with the data
//   GET /therapy/usage?childId=<child at another school>   -> 200 with the data
//
// Leaked to admin, reception AND a region-scoped government account. Teacher and
// parent were correctly refused, so the guard exists — these two paths skip it.
//
// Two distinct shapes:
//
//   servicePlanController.getServicePlans (:25-36) reads childId and queries
//   straight through. No validateChildAccess, no role branch, nothing. The
//   CREATE path in the same file (:86) does call validateChildAccess — the
//   pattern was known and applied to writes only.
//
//   therapyController.getUsage (:497-510) builds a per-role `where`, scoping
//   admin to their school's children — and then `if (childId) { where.childId =
//   childId }` OVERWRITES that scope with the raw foreign id. reception and
//   government match no branch at all, so `where` stays {} and the query returns
//   every usage row on the platform.
//
// FAIL-FIRST: every test here fails against the pre-fix controllers.

import { jest } from '@jest/globals';

const mockServicePlanFindAll = jest.fn();
const mockTherapyUsageFindAndCountAll = jest.fn();
const mockChildFindAll = jest.fn();
const mockValidateChildAccess = jest.fn();

jest.unstable_mockModule('../../models/ServicePlan.js', () => ({
  default: { findAll: mockServicePlanFindAll, findOne: jest.fn(), create: jest.fn(), bulkCreate: jest.fn() },
}));
jest.unstable_mockModule('../../models/TherapyUsage.js', () => ({
  default: { findAndCountAll: mockTherapyUsageFindAndCountAll, findAll: jest.fn(), findByPk: jest.fn(), create: jest.fn() },
}));
jest.unstable_mockModule('../../models/Therapy.js', () => ({
  default: { findByPk: jest.fn(), findAndCountAll: jest.fn(), findAll: jest.fn(), create: jest.fn() },
}));
jest.unstable_mockModule('../../models/Child.js', () => ({
  default: { findAll: mockChildFindAll, findByPk: jest.fn(), findOne: jest.fn() },
}));
jest.unstable_mockModule('../../models/User.js', () => ({
  default: { findAll: jest.fn().mockResolvedValue([]), findByPk: jest.fn(), findOne: jest.fn() },
}));
jest.unstable_mockModule('../../utils/schoolValidation.js', () => ({
  validateChildAccess: mockValidateChildAccess,
  isTeacherAssignedToChild: jest.fn().mockResolvedValue(true),
  findChildScopedResource: jest.fn(),
}));
jest.unstable_mockModule('../../utils/logger.js', () => ({
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));
jest.unstable_mockModule('../../config/socket.js', () => ({ emitToUser: jest.fn(), getIO: jest.fn() }));

const { getServicePlans } = await import('../../controllers/servicePlanController.js');
const { getTherapyUsage } = await import('../../controllers/therapyController.js');

const HOME_SCHOOL = 'school-A';
const FOREIGN_CHILD = 'child-at-school-B';

const makeRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

beforeEach(() => {
  jest.clearAllMocks();
  mockValidateChildAccess.mockResolvedValue(null); // foreign child: not accessible
  mockChildFindAll.mockResolvedValue([{ id: 'child-at-school-A' }]);
  mockServicePlanFindAll.mockResolvedValue([{ id: 'sp-1', childId: FOREIGN_CHILD, serviceType: 'speech' }]);
  mockTherapyUsageFindAndCountAll.mockResolvedValue({ rows: [{ id: 'tu-1', childId: FOREIGN_CHILD }], count: 1 });
});

describe('D-53 — service plans must not be readable across schools', () => {
  for (const role of ['admin', 'reception', 'government', 'teacher', 'parent']) {
    test(`getServicePlans refuses a foreign childId for role=${role}`, async () => {
      const req = { user: { id: 'u1', role, schoolId: HOME_SCHOOL }, query: { childId: FOREIGN_CHILD, year: '2026' } };
      const res = makeRes();
      await getServicePlans(req, res);

      expect(mockValidateChildAccess).toHaveBeenCalledWith(FOREIGN_CHILD, req);
      const statuses = res.status.mock.calls.map((c) => c[0]);
      expect(statuses.some((s) => s === 403 || s === 404)).toBe(true);
      const payload = res.json.mock.calls.at(-1)?.[0];
      expect(JSON.stringify(payload ?? {})).not.toContain(FOREIGN_CHILD);
    });
  }

  test('getServicePlans still works for a child the caller may see', async () => {
    const OWN = 'child-at-school-A';
    mockValidateChildAccess.mockResolvedValue({ id: OWN, schoolId: HOME_SCHOOL });
    mockServicePlanFindAll.mockResolvedValue([{ id: 'sp-2', childId: OWN, serviceType: 'speech' }]);
    const req = { user: { id: 'u1', role: 'admin', schoolId: HOME_SCHOOL }, query: { childId: OWN } };
    const res = makeRes();
    await getServicePlans(req, res);
    expect(res.status).not.toHaveBeenCalledWith(403);
    expect(mockServicePlanFindAll).toHaveBeenCalled();
  });
});

describe('D-53 — therapy usage must not be readable across schools', () => {
  for (const role of ['admin', 'reception', 'government']) {
    test(`getTherapyUsage refuses a foreign childId for role=${role}`, async () => {
      const req = { user: { id: 'u1', role, schoolId: HOME_SCHOOL }, query: { childId: FOREIGN_CHILD } };
      const res = makeRes();
      await getTherapyUsage(req, res);

      const statuses = res.status.mock.calls.map((c) => c[0]);
      expect(statuses.some((s) => s === 403 || s === 404)).toBe(true);
      const payload = res.json.mock.calls.at(-1)?.[0];
      expect(JSON.stringify(payload ?? {})).not.toContain(FOREIGN_CHILD);
    });
  }

  test('getTherapyUsage without a childId never leaves `where` unscoped for reception', async () => {
    // reception matched no branch at all, so `where` stayed {} and the query
    // returned every therapy usage row on the platform.
    const req = { user: { id: 'u1', role: 'reception', schoolId: HOME_SCHOOL }, query: {} };
    const res = makeRes();
    await getTherapyUsage(req, res);
    if (mockTherapyUsageFindAndCountAll.mock.calls.length) {
      const where = mockTherapyUsageFindAndCountAll.mock.calls[0][0].where;
      expect(Object.keys(where).length).toBeGreaterThan(0);
    } else {
      expect(res.status).toHaveBeenCalledWith(403);
    }
  });
});
