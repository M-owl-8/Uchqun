// CROSS-IRR-VISIBILITY — governmentChildController scope tests.
//
// Region-scope contract:
//   - Republic government (isGlobalAccess=true) sees ANY school / child
//   - Region government sees only schools whose regionId === regionScope
//
// 404 opacity rule: never leak existence of out-of-region rows.

import { jest } from '@jest/globals';

const mockChildFindByPk = jest.fn();
const mockChildFindAll = jest.fn();
const mockSchoolFindByPk = jest.fn();
const mockUserFindByPk = jest.fn();
const mockGroupFindByPk = jest.fn();
const mockIRRFindOne = jest.fn();
const mockSessionFindAll = jest.fn();
const mockLTGFindAll = jest.fn();
const mockGoalPeriodFindAll = jest.fn();
const mockSTGFindAll = jest.fn();

jest.unstable_mockModule('../../models/Child.js',          () => ({ default: { findByPk: mockChildFindByPk, findAll: mockChildFindAll } }));
jest.unstable_mockModule('../../models/School.js',         () => ({ default: { findByPk: mockSchoolFindByPk } }));
jest.unstable_mockModule('../../models/User.js',           () => ({ default: { findByPk: mockUserFindByPk } }));
jest.unstable_mockModule('../../models/Group.js',          () => ({ default: { findByPk: mockGroupFindByPk } }));
jest.unstable_mockModule('../../models/IRR.js',            () => ({ default: { findOne: mockIRRFindOne } }));
jest.unstable_mockModule('../../models/AssessmentSession.js', () => ({ default: { findAll: mockSessionFindAll } }));
jest.unstable_mockModule('../../models/LongTermGoal.js',   () => ({ default: { findAll: mockLTGFindAll } }));
jest.unstable_mockModule('../../models/ShortTermGoal.js',  () => ({ default: { findAll: mockSTGFindAll } }));
jest.unstable_mockModule('../../models/GoalPeriod.js',     () => ({ default: { findAll: mockGoalPeriodFindAll } }));
jest.unstable_mockModule('../../utils/logger.js',          () => ({ default: { error: jest.fn(), info: jest.fn() } }));

const {
  listSchoolStudents, getChild, getChildIRR, getAssessmentProgression, getGoals,
} = await import('../../controllers/government/governmentChildController.js');

const mkRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

const regionGovReq = (overrides = {}) => ({
  user: { id: 'g1', role: 'government' },
  isGlobalAccess: false,
  regionScope: 'region-A',
  params: {},
  ...overrides,
});

const republicGovReq = (overrides = {}) => ({
  user: { id: 'g0', role: 'government' },
  isGlobalAccess: true,
  regionScope: null,
  params: {},
  ...overrides,
});

beforeEach(() => jest.clearAllMocks());

describe('listSchoolStudents — region scope', () => {
  it('region account: 404 when school is in another region', async () => {
    mockSchoolFindByPk.mockResolvedValue({ id: 'sch-1', regionId: 'region-B' });
    const res = mkRes();
    await listSchoolStudents(regionGovReq({ params: { schoolId: 'sch-1' } }), res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(mockChildFindAll).not.toHaveBeenCalled();
  });

  it('region account: 200 when school is in own region', async () => {
    mockSchoolFindByPk.mockResolvedValue({ id: 'sch-1', regionId: 'region-A' });
    mockChildFindAll.mockResolvedValue([{ id: 'c1', firstName: 'Bobur' }]);
    const res = mkRes();
    await listSchoolStudents(regionGovReq({ params: { schoolId: 'sch-1' } }), res);
    expect(res.json).toHaveBeenCalledWith({ success: true, data: [{ id: 'c1', firstName: 'Bobur' }] });
  });

  it('republic account (isGlobalAccess=true): 200 for any school regardless of region', async () => {
    mockSchoolFindByPk.mockResolvedValue({ id: 'sch-X', regionId: 'region-Z' });
    mockChildFindAll.mockResolvedValue([]);
    const res = mkRes();
    await listSchoolStudents(republicGovReq({ params: { schoolId: 'sch-X' } }), res);
    expect(res.status).not.toHaveBeenCalledWith(404);
  });

  it('404 when caller is not government', async () => {
    const res = mkRes();
    await listSchoolStudents({ user: { id: 'a1', role: 'admin' }, params: { schoolId: 'sch-1' } }, res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(mockSchoolFindByPk).not.toHaveBeenCalled();
  });
});

describe('getChild + IRR endpoints — region scope', () => {
  it('region account: 404 on cross-region child (IRR NEVER queried)', async () => {
    mockChildFindByPk.mockResolvedValue({ id: 'c1', schoolId: 'sch-1' });
    mockSchoolFindByPk.mockResolvedValue({ id: 'sch-1', regionId: 'region-B' });
    const res = mkRes();
    await getChildIRR(regionGovReq({ params: { childId: 'c1' } }), res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(mockIRRFindOne).not.toHaveBeenCalled();
  });

  it('region account: 200 when child is in own-region school', async () => {
    mockChildFindByPk.mockResolvedValue({ id: 'c1', schoolId: 'sch-1' });
    mockSchoolFindByPk.mockResolvedValue({ id: 'sch-1', regionId: 'region-A' });
    mockIRRFindOne.mockResolvedValue({ id: 'irr-1', childId: 'c1' });
    const res = mkRes();
    await getChildIRR(regionGovReq({ params: { childId: 'c1' } }), res);
    expect(res.json).toHaveBeenCalledWith({ success: true, data: { id: 'irr-1', childId: 'c1' } });
  });

  it('getAssessmentProgression returns AGGREGATE ONLY (no per-criterion scores include)', async () => {
    mockChildFindByPk.mockResolvedValue({ id: 'c1', schoolId: 'sch-1' });
    mockSchoolFindByPk.mockResolvedValue({ id: 'sch-1', regionId: 'region-A' });
    mockIRRFindOne.mockResolvedValue({ id: 'irr-1' });
    mockSessionFindAll.mockResolvedValue([
      { id: 's1', sessionType: 'intake', totalScore: 28 },
    ]);
    const res = mkRes();
    await getAssessmentProgression(regionGovReq({ params: { childId: 'c1' } }), res);
    // CRITICAL: government MUST NOT see per-criterion scores (Q2 decision).
    // The findAll call must NOT include AssessmentScore.
    const call = mockSessionFindAll.mock.calls[0][0];
    expect(call).not.toHaveProperty('include');
    expect(call.attributes).toEqual(expect.arrayContaining(['totalScore']));
  });

  it('404 when caller is not government', async () => {
    const res = mkRes();
    await getChild({ user: { id: 't1', role: 'teacher' }, params: { childId: 'c1' } }, res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(mockChildFindByPk).not.toHaveBeenCalled();
  });
});

describe('getGoals — region scope', () => {
  it('region account: 200 for own-region child', async () => {
    mockChildFindByPk.mockResolvedValue({ id: 'c1', schoolId: 'sch-1' });
    mockSchoolFindByPk.mockResolvedValue({ id: 'sch-1', regionId: 'region-A' });
    mockIRRFindOne.mockResolvedValue({ id: 'irr-1' });
    mockLTGFindAll.mockResolvedValue([{ id: 'ltg-1' }]);
    mockGoalPeriodFindAll.mockResolvedValue([]);
    mockSTGFindAll.mockResolvedValue([]);
    const res = mkRes();
    await getGoals(regionGovReq({ params: { childId: 'c1' } }), res);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: { longTermGoals: [{ id: 'ltg-1' }], periods: [], shortTermGoals: [] },
    });
  });
});
