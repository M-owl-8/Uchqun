/**
 * D-61 · D-62 · D-63 · D-64 — four more instances of the D-47 shape.
 *
 * These were not found by the P3 isolation sweep, which probes endpoints it
 * knows about. They were found by the R15 convention gate
 * (scripts/verify-conventions.mjs), which reads every controller and asks a
 * different question: does this handler scope a query by a childId it took from
 * the request, without an intervening access check?
 *
 *   D-61 getMealPlans           NO check of any kind, for any role
 *   D-62 createTherapy          Child.findByPk with no school scope, then WRITES
 *                               a TherapyUsage row — cross-tenant write
 *   D-63 startTherapy           "// Admin can access any child" — and it did
 *   D-64 getMonitoringByChild   parent and teacher checked; admin, reception and
 *                               government fell through unchecked
 *
 * The assertions are on refusal. A tenant-isolation test that only proves the
 * happy path proves nothing.
 */
import { jest } from '@jest/globals';

const mockValidateChildAccess = jest.fn();
const mockChildFindByPk = jest.fn();
const mockMealPlanFindAll = jest.fn();
const mockMonitoringFindAll = jest.fn();
const mockMonitoringCount = jest.fn();
const mockTherapyFindByPk = jest.fn();
const mockTherapyCreate = jest.fn();
const mockUsageCreate = jest.fn();
const mockUserFindOne = jest.fn();

jest.unstable_mockModule('../../utils/schoolValidation.js', () => ({
  validateChildAccess: mockValidateChildAccess,
  isTeacherAssignedToChild: jest.fn(),
  findChildScopedResource: jest.fn(),
}));
jest.unstable_mockModule('../../models/Child.js', () => ({
  default: { findByPk: mockChildFindByPk, findAll: jest.fn() },
}));
jest.unstable_mockModule('../../models/MealPlan.js', () => ({
  default: { findAll: mockMealPlanFindAll, findByPk: jest.fn(), create: jest.fn() },
}));
jest.unstable_mockModule('../../models/EmotionalMonitoring.js', () => ({
  default: { findAll: mockMonitoringFindAll, count: mockMonitoringCount, findByPk: jest.fn(), create: jest.fn() },
}));
jest.unstable_mockModule('../../models/Therapy.js', () => ({
  default: { findByPk: mockTherapyFindByPk, create: mockTherapyCreate, findAll: jest.fn() },
}));
jest.unstable_mockModule('../../models/TherapyUsage.js', () => ({
  default: { create: mockUsageCreate, findAll: jest.fn(), findOne: jest.fn(), findByPk: jest.fn() },
}));
jest.unstable_mockModule('../../models/User.js', () => ({
  default: { findOne: mockUserFindOne, findByPk: jest.fn(), findAll: jest.fn() },
}));
jest.unstable_mockModule('../../models/Group.js', () => ({
  default: { findAll: jest.fn(() => []), findByPk: jest.fn() },
}));

const { getMealPlans } = await import('../../controllers/mealPlanController.js');
const { getMonitoringByChild } = await import('../../controllers/emotionalMonitoringController.js');
const { createTherapy, startTherapy } = await import('../../controllers/therapyController.js');

const mkRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

// a child in ANOTHER school — what every one of these must refuse
const FOREIGN = { id: 'ch-foreign', firstName: 'Zaynab', lastName: 'Umarova', parentId: 'p-9', schoolId: 'school-B' };
const ADMIN_A = { id: 'a-1', role: 'admin', schoolId: 'school-A' };

const statusOf = (res) => (res.status.mock.calls[0] || [])[0];

beforeEach(() => {
  [mockValidateChildAccess, mockChildFindByPk, mockMealPlanFindAll, mockMonitoringFindAll,
    mockMonitoringCount, mockTherapyFindByPk, mockTherapyCreate, mockUsageCreate, mockUserFindOne]
    .forEach((m) => m.mockReset());
  mockMealPlanFindAll.mockResolvedValue([]);
  mockMonitoringFindAll.mockResolvedValue([]);
  mockMonitoringCount.mockResolvedValue(0);
  mockTherapyCreate.mockResolvedValue({ id: 'th-1', increment: jest.fn() });
  mockUsageCreate.mockResolvedValue({ id: 'u-1' });
  mockTherapyFindByPk.mockResolvedValue({ id: 'th-1', increment: jest.fn() });
  // the child EXISTS — the only thing standing between the caller and it is scope
  mockChildFindByPk.mockResolvedValue(FOREIGN);
});

describe('D-61 — getMealPlans must not serve a child outside the caller scope', () => {
  it('refuses, and never reaches the query', async () => {
    mockValidateChildAccess.mockResolvedValue(null);
    const res = mkRes();

    await getMealPlans({ query: { childId: 'ch-foreign' }, user: ADMIN_A }, res);

    expect([403, 404]).toContain(statusOf(res));
    expect(mockMealPlanFindAll).not.toHaveBeenCalled();
  });

  it('serves the child when the scope allows it', async () => {
    mockValidateChildAccess.mockResolvedValue({ ...FOREIGN, schoolId: 'school-A' });
    const res = mkRes();

    await getMealPlans({ query: { childId: 'ch-own' }, user: ADMIN_A }, res);

    expect(mockMealPlanFindAll).toHaveBeenCalled();
    expect(statusOf(res)).toBeUndefined();
  });
});

describe('D-64 — getMonitoringByChild must scope admin, reception and government', () => {
  it.each(['admin', 'reception', 'government'])(
    'refuses role %s for a child in another school',
    async (role) => {
      mockValidateChildAccess.mockResolvedValue(null);
      const res = mkRes();

      await getMonitoringByChild(
        { params: { childId: 'ch-foreign' }, query: {}, user: { id: 'u-1', role, schoolId: 'school-A' } },
        res
      );

      expect(statusOf(res)).toBe(403);
      expect(mockMonitoringFindAll).not.toHaveBeenCalled();
    }
  );

  it('a parent reading their OWN child is untouched by the fix', async () => {
    mockChildFindByPk.mockResolvedValue({ ...FOREIGN, parentId: 'par-1' });
    const res = mkRes();

    await getMonitoringByChild(
      { params: { childId: 'ch-1' }, query: {}, user: { id: 'par-1', role: 'parent' } },
      res
    );

    expect(statusOf(res)).not.toBe(403);
    // the parent path must NOT have been rerouted through validateChildAccess
    expect(mockValidateChildAccess).not.toHaveBeenCalled();
  });
});

describe('D-62 — createTherapy must not attach a clinical record to a foreign child', () => {
  it('creates the therapy but NOT the usage row for an out-of-scope child', async () => {
    mockValidateChildAccess.mockResolvedValue(null);
    const res = mkRes();

    await createTherapy(
      { body: { title: 'Nutq mashqi', therapyType: 'speech', childId: 'ch-foreign' }, user: ADMIN_A },
      res
    );

    // the cross-tenant WRITE is the defect
    expect(mockUsageCreate).not.toHaveBeenCalled();
  });

  it('creates the usage row when the child is in scope', async () => {
    mockValidateChildAccess.mockResolvedValue({ ...FOREIGN, schoolId: 'school-A' });
    const res = mkRes();

    await createTherapy(
      { body: { title: 'Nutq mashqi', therapyType: 'speech', childId: 'ch-own' }, user: ADMIN_A },
      res
    );

    expect(mockUsageCreate).toHaveBeenCalledWith(expect.objectContaining({ childId: 'ch-own' }));
  });
});

describe('D-63 — startTherapy must not let an admin reach any child', () => {
  it('refuses an admin a child in another school', async () => {
    mockValidateChildAccess.mockResolvedValue(null);
    const res = mkRes();

    await startTherapy(
      { params: { id: 'th-1' }, body: { childId: 'ch-foreign' }, user: ADMIN_A },
      res
    );

    expect(statusOf(res)).toBe(403);
    expect(mockUsageCreate).not.toHaveBeenCalled();
  });

  it('allows an admin a child in their own school', async () => {
    mockValidateChildAccess.mockResolvedValue({ ...FOREIGN, schoolId: 'school-A' });
    const res = mkRes();

    await startTherapy(
      { params: { id: 'th-1' }, body: { childId: 'ch-own' }, user: ADMIN_A },
      res
    );

    expect(statusOf(res)).not.toBe(403);
  });
});
