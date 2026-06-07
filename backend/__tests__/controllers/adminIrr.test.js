// CROSS-IRR-VISIBILITY — adminIrrController scope tests.
//
// School-scope is the contract: admin reads IRR for any child in their
// school; denied (404) for any child in another school. Same opacity rule
// as observation/journal — never leak existence of out-of-scope rows.

import { jest } from '@jest/globals';

const mockChildFindByPk = jest.fn();
const mockIRRFindOne = jest.fn();
const mockSessionFindAll = jest.fn();
const mockLTGFindAll = jest.fn();
const mockGoalPeriodFindAll = jest.fn();
const mockSTGFindAll = jest.fn();

jest.unstable_mockModule('../../models/Child.js',          () => ({ default: { findByPk: mockChildFindByPk } }));
jest.unstable_mockModule('../../models/IRR.js',            () => ({ default: { findOne: mockIRRFindOne } }));
jest.unstable_mockModule('../../models/AssessmentSession.js', () => ({ default: { findAll: mockSessionFindAll } }));
jest.unstable_mockModule('../../models/AssessmentScore.js',   () => ({ default: {} }));
jest.unstable_mockModule('../../models/LongTermGoal.js',   () => ({ default: { findAll: mockLTGFindAll } }));
jest.unstable_mockModule('../../models/ShortTermGoal.js',  () => ({ default: { findAll: mockSTGFindAll } }));
jest.unstable_mockModule('../../models/GoalPeriod.js',     () => ({ default: { findAll: mockGoalPeriodFindAll } }));
jest.unstable_mockModule('../../utils/logger.js',          () => ({ default: { error: jest.fn(), info: jest.fn() } }));

const { getChildIRR, getAssessmentProgression, getGoals } = await import(
  '../../controllers/admin/adminIrrController.js'
);

const mkRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

const adminReq = (overrides = {}) => ({
  user: { id: 'a1', role: 'admin', schoolId: 'school-A' },
  params: { childId: 'child-1' },
  ...overrides,
});

beforeEach(() => jest.clearAllMocks());

describe('admin getChildIRR — school-scope contract', () => {
  it('404 IRR_CHILD_NOT_ACCESSIBLE when caller is not admin role', async () => {
    const res = mkRes();
    await getChildIRR({ user: { id: 't1', role: 'teacher', schoolId: 'school-A' }, params: { childId: 'child-1' } }, res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(mockChildFindByPk).not.toHaveBeenCalled();
  });

  it('404 when child in a different school (cross-school denial)', async () => {
    mockChildFindByPk.mockResolvedValue({ id: 'child-1', schoolId: 'school-OTHER' });
    const res = mkRes();
    await getChildIRR(adminReq(), res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      error: expect.objectContaining({ code: 'IRR_CHILD_NOT_ACCESSIBLE' }),
    }));
    // IRR table must NEVER be queried for a cross-school request.
    expect(mockIRRFindOne).not.toHaveBeenCalled();
  });

  it('404 IRR_NOT_FOUND when child in own school but no active IRR', async () => {
    mockChildFindByPk.mockResolvedValue({ id: 'child-1', schoolId: 'school-A' });
    mockIRRFindOne.mockResolvedValue(null);
    const res = mkRes();
    await getChildIRR(adminReq(), res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      error: expect.objectContaining({ code: 'IRR_NOT_FOUND' }),
    }));
  });

  it('200 with IRR when child + active IRR exist in own school', async () => {
    mockChildFindByPk.mockResolvedValue({ id: 'child-1', schoolId: 'school-A' });
    const irr = { id: 'irr-1', childId: 'child-1', status: 'active' };
    mockIRRFindOne.mockResolvedValue(irr);
    const res = mkRes();
    await getChildIRR(adminReq(), res);
    expect(res.json).toHaveBeenCalledWith({ success: true, data: irr });
  });

  it('500 IRR_FETCH_FAILED on DB error', async () => {
    mockChildFindByPk.mockRejectedValue(new Error('db down'));
    const res = mkRes();
    await getChildIRR(adminReq(), res);
    expect(res.status).toHaveBeenCalledWith(500);
  });

  it('null schoolId on admin or child → 404 (fails closed, no scope inferable)', async () => {
    mockChildFindByPk.mockResolvedValue({ id: 'child-1', schoolId: 'school-A' });
    const res = mkRes();
    await getChildIRR({ user: { id: 'a1', role: 'admin', schoolId: null }, params: { childId: 'child-1' } }, res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(mockIRRFindOne).not.toHaveBeenCalled();
  });
});

describe('admin getAssessmentProgression — includes per-criterion scores', () => {
  it('returns sessions WITH scores include (admin has full access, unlike parent)', async () => {
    mockChildFindByPk.mockResolvedValue({ id: 'child-1', schoolId: 'school-A' });
    mockIRRFindOne.mockResolvedValue({ id: 'irr-1' });
    mockSessionFindAll.mockResolvedValue([
      { id: 's1', sessionType: 'intake', totalScore: 28, scores: [] },
    ]);
    const res = mkRes();
    await getAssessmentProgression(adminReq(), res);
    expect(mockSessionFindAll).toHaveBeenCalledWith(expect.objectContaining({
      include: expect.arrayContaining([
        expect.objectContaining({ as: 'scores' }),
      ]),
    }));
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });

  it('404 on cross-school child', async () => {
    mockChildFindByPk.mockResolvedValue({ id: 'child-1', schoolId: 'school-OTHER' });
    const res = mkRes();
    await getAssessmentProgression(adminReq(), res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(mockSessionFindAll).not.toHaveBeenCalled();
  });
});

describe('admin getGoals', () => {
  it('200 with LTG + periods + STGs for own-school child', async () => {
    mockChildFindByPk.mockResolvedValue({ id: 'child-1', schoolId: 'school-A' });
    mockIRRFindOne.mockResolvedValue({ id: 'irr-1' });
    mockLTGFindAll.mockResolvedValue([{ id: 'ltg-1' }]);
    mockGoalPeriodFindAll.mockResolvedValue([{ id: 'gp-1' }]);
    mockSTGFindAll.mockResolvedValue([{ id: 'stg-1' }]);
    const res = mkRes();
    await getGoals(adminReq(), res);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: {
        longTermGoals: [{ id: 'ltg-1' }],
        periods: [{ id: 'gp-1' }],
        shortTermGoals: [{ id: 'stg-1' }],
      },
    });
  });

  it('404 on cross-school child', async () => {
    mockChildFindByPk.mockResolvedValue({ id: 'child-1', schoolId: 'school-OTHER' });
    const res = mkRes();
    await getGoals(adminReq(), res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(mockLTGFindAll).not.toHaveBeenCalled();
  });
});
