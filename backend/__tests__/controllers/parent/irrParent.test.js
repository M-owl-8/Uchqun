/**
 * irrParentController — parentId-axis isolation tests (behavioral SQLite).
 *
 * Proves that parent P1 cannot read P2's child's ИРР (parentId mismatch → 404).
 * VIEW-ONLY contract: no parent mutation path exists; no write tests required.
 * Per OQ-4: aggregate score only returned (no per-criterion data).
 */

import { jest } from '@jest/globals';
import { Sequelize, DataTypes } from 'sequelize';

const sqlite = new Sequelize('sqlite::memory:', { logging: false });

// Real SQLite Child — parentId check runs against real data
const ChildModel = sqlite.define('Child', {
  id:       { type: DataTypes.STRING, primaryKey: true },
  parentId: { type: DataTypes.STRING, allowNull: true },
  schoolId: { type: DataTypes.STRING, allowNull: true },
  groupId:  { type: DataTypes.STRING, allowNull: true },
  firstName: { type: DataTypes.STRING, defaultValue: 'Test' },
  lastName:  { type: DataTypes.STRING, defaultValue: 'Child' },
  dateOfBirth: { type: DataTypes.STRING, defaultValue: '2020-01-01' },
}, { tableName: 'children', timestamps: false });

// ── IRR model mocks ──────────────────────────────────────────────────────────
const mockIRRFindOne       = jest.fn();
const mockSessionFindAll   = jest.fn();
const mockLTGoalFindAll    = jest.fn();
const mockPeriodFindAll    = jest.fn();
const mockSTGoalFindAll    = jest.fn();

jest.unstable_mockModule('../../../models/Child.js', () => ({ default: ChildModel }));
jest.unstable_mockModule('../../../models/IRR.js', () => ({
  default: { findOne: mockIRRFindOne },
}));
jest.unstable_mockModule('../../../models/AssessmentSession.js', () => ({
  default: { findAll: mockSessionFindAll },
}));
jest.unstable_mockModule('../../../models/LongTermGoal.js', () => ({
  default: { findAll: mockLTGoalFindAll },
}));
jest.unstable_mockModule('../../../models/GoalPeriod.js', () => ({
  default: { findAll: mockPeriodFindAll },
}));
jest.unstable_mockModule('../../../models/ShortTermGoal.js', () => ({
  default: { findAll: mockSTGoalFindAll },
}));
jest.unstable_mockModule('../../../utils/logger.js', () => ({
  default: { error: jest.fn(), info: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

const { getChildIRR, getAssessmentProgression, getGoals } =
  await import('../../../controllers/parent/irrParentController.js');

// ── Seed ─────────────────────────────────────────────────────────────────────
const PARENT_P1  = 'parent-p1';
const PARENT_P2  = 'parent-p2';
const SCHOOL_A   = 'school-a';
const CHILD_C1   = 'child-c1';  // belongs to P1
const CHILD_C2   = 'child-c2';  // belongs to P2
const IRR_C1     = 'irr-c1';

const fakeIRR = {
  id: IRR_C1, childId: CHILD_C1, schoolId: SCHOOL_A, status: 'active',
};

const mkRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json   = jest.fn().mockReturnValue(res);
  return res;
};

const reqParent = (parentId, childId) => ({
  user: { id: parentId, role: 'parent', schoolId: SCHOOL_A },
  params: { childId },
  body: {},
  query: {},
});

beforeAll(async () => {
  await sqlite.sync({ force: true });
  await ChildModel.bulkCreate([
    { id: CHILD_C1, parentId: PARENT_P1, schoolId: SCHOOL_A },
    { id: CHILD_C2, parentId: PARENT_P2, schoolId: SCHOOL_A },
  ]);
});

afterAll(async () => { await sqlite.close(); });

beforeEach(() => { jest.clearAllMocks(); });

// ── getChildIRR parentId-axis isolation ─────────────────────────────────────

describe('getChildIRR — parentId isolation', () => {
  it('404 when P1 requests P2 child IRR', async () => {
    const res = mkRes();
    await getChildIRR(reqParent(PARENT_P1, CHILD_C2), res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      error: expect.objectContaining({ code: 'IRR_CHILD_NOT_ACCESSIBLE' }),
    }));
    expect(mockIRRFindOne).not.toHaveBeenCalled();
  });

  it('200 when P1 requests own child IRR', async () => {
    mockIRRFindOne.mockResolvedValue(fakeIRR);
    const res = mkRes();
    await getChildIRR(reqParent(PARENT_P1, CHILD_C1), res);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    expect(mockIRRFindOne).toHaveBeenCalled();
  });

  it('404 when child does not exist', async () => {
    const res = mkRes();
    await getChildIRR(reqParent(PARENT_P1, 'nonexistent-child'), res);
    expect(res.status).toHaveBeenCalledWith(404);
  });
});

// ── getAssessmentProgression — aggregate only (OQ-4) ────────────────────────

describe('getAssessmentProgression — parentId isolation + aggregate shape', () => {
  it('404 when P1 requests P2 child progression', async () => {
    const res = mkRes();
    await getAssessmentProgression(reqParent(PARENT_P1, CHILD_C2), res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(mockSessionFindAll).not.toHaveBeenCalled();
  });

  it('200 with aggregate-only sessions (no per-criterion data) for own child', async () => {
    mockIRRFindOne.mockResolvedValue(fakeIRR);
    const sessions = [
      { id: 's-1', sessionType: 'intake', completedAt: '2026-01-01', totalScore: 48, maxPossibleScore: 68 },
      { id: 's-2', sessionType: '3mo',    completedAt: '2026-04-01', totalScore: 56, maxPossibleScore: 68 },
    ];
    mockSessionFindAll.mockResolvedValue(sessions);
    const res = mkRes();
    await getAssessmentProgression(reqParent(PARENT_P1, CHILD_C1), res);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: sessions,
    });
    // Per OQ-4: caller must not receive per-criterion data.
    // The controller queries with attributes: ['id','sessionType','completedAt','totalScore','maxPossibleScore']
    // Verify findAll was called with that attributes restriction.
    expect(mockSessionFindAll).toHaveBeenCalledWith(expect.objectContaining({
      attributes: expect.arrayContaining(['totalScore', 'maxPossibleScore']),
    }));
  });
});

// ── getGoals — parentId isolation ────────────────────────────────────────────

describe('getGoals — parentId isolation', () => {
  it('404 when P1 requests P2 child goals', async () => {
    const res = mkRes();
    await getGoals(reqParent(PARENT_P1, CHILD_C2), res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(mockLTGoalFindAll).not.toHaveBeenCalled();
  });

  it('200 with structured goals for own child', async () => {
    mockIRRFindOne.mockResolvedValue(fakeIRR);
    mockLTGoalFindAll.mockResolvedValue([{ id: 'ltg-1', goalText: 'Walk independently' }]);
    mockPeriodFindAll.mockResolvedValue([{ id: 'per-1' }]);
    mockSTGoalFindAll.mockResolvedValue([{ id: 'stg-1', periodId: 'per-1' }]);
    const res = mkRes();
    await getGoals(reqParent(PARENT_P1, CHILD_C1), res);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: expect.objectContaining({
        longTermGoals: expect.any(Array),
        periods: expect.any(Array),
        shortTermGoals: expect.any(Array),
      }),
    });
  });
});
