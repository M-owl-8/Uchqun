// PP-DASHBOARD-CARDS S10 — parent-scoping regression for the three global
// endpoints the parent dashboard reads (activities/meals/media).
//
// The parent dashboard at teacher/src/parent/pages/Dashboard.jsx fetches:
//   GET /activities?limit=5&childId=<id>
//   GET /meals?limit=5&childId=<id>
//   GET /media?limit=5&childId=<id>
//
// Each global controller has a parent fallback (the else branch after the
// teacher / admin / government cases) that resolves children via
//   Child.findAll({ where: { parentId: req.user.id } })
// and rejects ?childId=X if X is not in the resolved set with a 403.
//
// This file locks that fallback in regression. If a future refactor drops
// the parent branch, the dashboard cards would silently return wrong data
// (the symptom PP-AUDIT B.4 was worried about). These tests catch that.

import { jest } from '@jest/globals';

const mockUserFindAll          = jest.fn();
const mockChildFindAll         = jest.fn();
const mockActivityFindAll      = jest.fn();
const mockMealFindAll          = jest.fn();
const mockMediaFindAll         = jest.fn();

jest.unstable_mockModule('../../models/User.js',     () => ({ default: { findAll: mockUserFindAll } }));
jest.unstable_mockModule('../../models/Child.js',    () => ({ default: { findAll: mockChildFindAll } }));
jest.unstable_mockModule('../../models/Activity.js', () => ({ default: { findAll: mockActivityFindAll } }));
jest.unstable_mockModule('../../models/Meal.js',     () => ({ default: { findAll: mockMealFindAll } }));
jest.unstable_mockModule('../../models/Media.js',    () => ({ default: { findAll: mockMediaFindAll } }));
jest.unstable_mockModule('../../utils/logger.js',    () => ({ default: { error: jest.fn(), warn: jest.fn(), info: jest.fn() } }));

const { getActivities } = await import('../../controllers/activityController.js');
const { getMeals }      = await import('../../controllers/mealController.js');
const { getMedia }      = await import('../../controllers/mediaController.js');

const makeRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json   = jest.fn().mockReturnValue(res);
  return res;
};

const resetAll = () => {
  mockUserFindAll.mockReset();
  mockChildFindAll.mockReset();
  mockActivityFindAll.mockReset();
  mockMealFindAll.mockReset();
  mockMediaFindAll.mockReset();
};

// ------------------------------------------------------------
// Faoliyat (Activities) — GET /activities (parent fallback)
// ------------------------------------------------------------
describe('Faoliyat (Activities) — parent dashboard card contract', () => {
  beforeEach(resetAll);

  it('returns [] when the parent has no linked children', async () => {
    mockChildFindAll.mockResolvedValue([]);
    const req = { user: { id: 'parent-A', role: 'parent' }, query: {} };
    const res = makeRes();
    await getActivities(req, res);
    expect(mockChildFindAll).toHaveBeenCalledWith(expect.objectContaining({
      where: { parentId: 'parent-A' },
    }));
    expect(res.json).toHaveBeenCalledWith([]);
    expect(mockActivityFindAll).not.toHaveBeenCalled();
  });

  it('scopes activity rows to the parent\'s own children when no childId is passed', async () => {
    mockChildFindAll.mockResolvedValue([{ id: 'child-A1' }, { id: 'child-A2' }]);
    mockActivityFindAll.mockResolvedValue([
      { id: 'act-1', childId: 'child-A1', toJSON: () => ({ id: 'act-1', childId: 'child-A1' }) },
    ]);
    const req = { user: { id: 'parent-A', role: 'parent' }, query: { limit: '5' } };
    const res = makeRes();
    await getActivities(req, res);
    const call = mockActivityFindAll.mock.calls[0][0];
    // childId uses Op.in (Symbol key) — Object.values() skips Symbols, use getOwnPropertySymbols
    const symKey = Object.getOwnPropertySymbols(call.where.childId)[0];
    const inSet = call.where.childId[symKey];
    expect(inSet).toEqual(expect.arrayContaining(['child-A1', 'child-A2']));
  });

  it('CRITICAL — parent A asking for ?childId=<parent B\'s child> gets 403', async () => {
    mockChildFindAll.mockResolvedValue([{ id: 'child-A1' }]);
    const req = { user: { id: 'parent-A', role: 'parent' }, query: { childId: 'child-B1' } };
    const res = makeRes();
    await getActivities(req, res);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(mockActivityFindAll).not.toHaveBeenCalled();
  });
});

// ------------------------------------------------------------
// Ovqat (Meals) — GET /meals (parent fallback)
// ------------------------------------------------------------
describe('Ovqat (Meals) — parent dashboard card contract', () => {
  beforeEach(resetAll);

  it('returns [] when the parent has no linked children', async () => {
    mockChildFindAll.mockResolvedValue([]);
    const req = { user: { id: 'parent-A', role: 'parent' }, query: {} };
    const res = makeRes();
    await getMeals(req, res);
    expect(res.json).toHaveBeenCalledWith([]);
    expect(mockMealFindAll).not.toHaveBeenCalled();
  });

  it('scopes meal rows to the parent\'s own children when no childId is passed', async () => {
    mockChildFindAll.mockResolvedValue([{ id: 'child-A1' }, { id: 'child-A2' }]);
    mockMealFindAll.mockResolvedValue([{ id: 'meal-1', childId: 'child-A1' }]);
    const req = { user: { id: 'parent-A', role: 'parent' }, query: { limit: '5' } };
    const res = makeRes();
    await getMeals(req, res);
    const call = mockMealFindAll.mock.calls[0][0];
    const symKey = Object.getOwnPropertySymbols(call.where.childId)[0];
    const inSet = call.where.childId[symKey];
    expect(inSet).toEqual(expect.arrayContaining(['child-A1', 'child-A2']));
  });

  it('CRITICAL — parent A asking for ?childId=<parent B\'s child> gets 403', async () => {
    mockChildFindAll.mockResolvedValue([{ id: 'child-A1' }]);
    const req = { user: { id: 'parent-A', role: 'parent' }, query: { childId: 'child-B1' } };
    const res = makeRes();
    await getMeals(req, res);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(mockMealFindAll).not.toHaveBeenCalled();
  });
});

// ------------------------------------------------------------
// Media (Rasm) — GET /media (parent fallback)
// PP-AUDIT B.4 flagged the dashboard calling /media instead of
// /parent/media. Both endpoints scope to the parent's children;
// these tests lock the global one's parent branch.
// ------------------------------------------------------------
describe('Media (Rasm) — parent dashboard card contract', () => {
  beforeEach(resetAll);

  it('returns [] when the parent has no linked children', async () => {
    mockChildFindAll.mockResolvedValue([]);
    const req = { user: { id: 'parent-A', role: 'parent' }, query: {} };
    const res = makeRes();
    await getMedia(req, res);
    expect(res.json).toHaveBeenCalledWith([]);
    expect(mockMediaFindAll).not.toHaveBeenCalled();
  });

  it('scopes media rows to the parent\'s own children when no childId is passed', async () => {
    mockChildFindAll.mockResolvedValue([{ id: 'child-A1' }]);
    mockMediaFindAll.mockResolvedValue([{ id: 'med-1', childId: 'child-A1', toJSON: () => ({ id: 'med-1', childId: 'child-A1' }) }]);
    const req = { user: { id: 'parent-A', role: 'parent' }, query: { limit: '5' } };
    const res = makeRes();
    await getMedia(req, res);
    const call = mockMediaFindAll.mock.calls[0][0];
    expect(call.where.childId).toBeDefined();
    const symKey = Object.getOwnPropertySymbols(call.where.childId)[0];
    const inSet = call.where.childId[symKey];
    expect(inSet).toEqual(expect.arrayContaining(['child-A1']));
  });

  it('CRITICAL — parent A asking for ?childId=<parent B\'s child> gets 403', async () => {
    mockChildFindAll.mockResolvedValue([{ id: 'child-A1' }]);
    const req = { user: { id: 'parent-A', role: 'parent' }, query: { childId: 'child-B1' } };
    const res = makeRes();
    await getMedia(req, res);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(mockMediaFindAll).not.toHaveBeenCalled();
  });
});
