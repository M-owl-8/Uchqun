/**
 * ИРР controllers — two-axis IDOR behavioral tests (real SQLite).
 *
 * LOAD-BEARING TEST SUITE — this is the only proof of tenant isolation for
 * ИРР endpoints. There is NO model-level tenancy hook; controllers are the
 * entire enforcement. Do not delete or weaken without replacing this coverage.
 *
 * Two-axis enforcement:
 *   Axis 1 (school scope):    teacher from school B cannot touch school A's resource → 404
 *   Axis 2 (assignment):      unassigned teacher in same school → 404
 *   Positive (assigned):      assigned teacher → 200/201
 *
 * schoolValidation.js is NOT mocked — isTeacherAssignedToChild runs against
 * real SQLite Child/Group/User rows so the assignment check is behaviorally proven.
 * All ИРР models (IRR, AssessmentSession, etc.) are mocked at the DB level only;
 * the controller logic runs real.
 */

import { jest } from '@jest/globals';
import { Sequelize, DataTypes, Op } from 'sequelize';

const sqlite = new Sequelize('sqlite::memory:', { logging: false });

// ── SQLite models (real, used by schoolValidation.js) ───────────────────────
const ChildModel = sqlite.define('Child', {
  id:        { type: DataTypes.STRING, primaryKey: true },
  schoolId:  { type: DataTypes.STRING, allowNull: true },
  groupId:   { type: DataTypes.STRING, allowNull: true },
  parentId:  { type: DataTypes.STRING, allowNull: true },
  firstName: { type: DataTypes.STRING, defaultValue: 'Test' },
  lastName:  { type: DataTypes.STRING, defaultValue: 'Child' },
  dateOfBirth: { type: DataTypes.STRING, defaultValue: '2020-01-01' },
}, { tableName: 'children', timestamps: false });

const GroupModel = sqlite.define('Group', {
  id:        { type: DataTypes.STRING, primaryKey: true },
  teacherId: { type: DataTypes.STRING, allowNull: true },
  schoolId:  { type: DataTypes.STRING, allowNull: true },
  name:      { type: DataTypes.STRING, defaultValue: 'Group' },
}, { tableName: 'groups', timestamps: false });

const UserModel = sqlite.define('User', {
  id:        { type: DataTypes.STRING, primaryKey: true },
  teacherId: { type: DataTypes.STRING, allowNull: true },
  role:      { type: DataTypes.STRING, defaultValue: 'parent' },
  email:     { type: DataTypes.STRING, defaultValue: 'test@test.com' },
  password:  { type: DataTypes.STRING, defaultValue: 'hash' },
  firstName: { type: DataTypes.STRING, defaultValue: 'Test' },
  lastName:  { type: DataTypes.STRING, defaultValue: 'User' },
}, { tableName: 'users', timestamps: false });

// ── IRR model mocks ──────────────────────────────────────────────────────────
const mockIRRFindByPk   = jest.fn();
const mockIRRFindOne    = jest.fn();
const mockIRRCreate     = jest.fn();
const mockIRRUpdate     = jest.fn();

const mockSessionFindOne   = jest.fn();
const mockSessionCreate    = jest.fn();
const mockSessionFindAll   = jest.fn();

const mockScoreBulkCreate  = jest.fn();

const mockCriteriaFindAll  = jest.fn();

const mockLTGoalCreate     = jest.fn();
const mockLTGoalFindAll    = jest.fn();
const mockLTGoalFindByPk   = jest.fn();

const mockPeriodCreate     = jest.fn();
const mockPeriodFindAll    = jest.fn();
const mockPeriodFindByPk   = jest.fn();

const mockSTGoalCreate     = jest.fn();
const mockSTGoalFindAll    = jest.fn();
const mockSTGoalFindByPk   = jest.fn();

const mockDailyCreate      = jest.fn();
const mockDailyFindAll     = jest.fn();

const mockWeeklyCreate     = jest.fn();
const mockWeeklyFindAll    = jest.fn();

const mockQuarterlyCreate  = jest.fn();

jest.unstable_mockModule('../../models/Child.js',    () => ({ default: ChildModel }));
jest.unstable_mockModule('../../models/Group.js',    () => ({ default: GroupModel }));
jest.unstable_mockModule('../../models/User.js',     () => ({ default: UserModel }));

jest.unstable_mockModule('../../models/IRR.js', () => ({
  default: { findByPk: mockIRRFindByPk, findOne: mockIRRFindOne, create: mockIRRCreate },
}));
jest.unstable_mockModule('../../models/AssessmentSession.js', () => ({
  default: { findOne: mockSessionFindOne, create: mockSessionCreate, findAll: mockSessionFindAll },
}));
jest.unstable_mockModule('../../models/AssessmentScore.js', () => ({
  default: { bulkCreate: mockScoreBulkCreate },
}));
jest.unstable_mockModule('../../models/AssessmentCriteria.js', () => ({
  default: { findAll: mockCriteriaFindAll },
}));
jest.unstable_mockModule('../../models/LongTermGoal.js', () => ({
  default: { create: mockLTGoalCreate, findAll: mockLTGoalFindAll, findByPk: mockLTGoalFindByPk },
}));
jest.unstable_mockModule('../../models/GoalPeriod.js', () => ({
  default: { create: mockPeriodCreate, findAll: mockPeriodFindAll, findByPk: mockPeriodFindByPk },
}));
jest.unstable_mockModule('../../models/ShortTermGoal.js', () => ({
  default: { create: mockSTGoalCreate, findAll: mockSTGoalFindAll, findByPk: mockSTGoalFindByPk },
}));
jest.unstable_mockModule('../../models/DailyMonitoringEntry.js', () => ({
  default: { create: mockDailyCreate, findAll: mockDailyFindAll },
}));
jest.unstable_mockModule('../../models/WeeklyMonitoringEntry.js', () => ({
  default: { create: mockWeeklyCreate, findAll: mockWeeklyFindAll },
}));
jest.unstable_mockModule('../../models/QuarterlyMonitoringEntry.js', () => ({
  default: { create: mockQuarterlyCreate },
}));
jest.unstable_mockModule('../../utils/logger.js', () => ({
  default: { error: jest.fn(), info: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));
jest.unstable_mockModule('../../utils/auditLogger.js', () => ({ logAudit: jest.fn() }));

// schoolValidation.js is NOT mocked — real isTeacherAssignedToChild runs
const {
  createIRR, getChildIRR,
  createAssessmentSession,
  createLongTermGoal,
  createGoalPeriod,
  createDailyEntry,
  createWeeklyEntry,
  createQuarterlyEntry,
} = await import('../../controllers/teacher/irrController.js');

// ── Seed constants ───────────────────────────────────────────────────────────
const SCHOOL_A   = 'school-a';
const SCHOOL_B   = 'school-b';
const TEACHER_A  = 'teacher-a';   // assigned to CHILD_A1 via GROUP_G1
const TEACHER_B  = 'teacher-b';   // same school A, different group (G2) — unassigned
const TEACHER_X  = 'teacher-x';   // school B — cross-school
const GROUP_G1   = 'group-g1';
const GROUP_G2   = 'group-g2';
const CHILD_A1   = 'child-a1';
const IRR_A1     = 'irr-a1';

// Fake IRR row belonging to school A / child A1
const fakeIRR = {
  id: IRR_A1, childId: CHILD_A1, schoolId: SCHOOL_A, status: 'active',
  update: mockIRRUpdate,
};

const mkRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json   = jest.fn().mockReturnValue(res);
  return res;
};

const req = (teacherId, schoolId, params = {}, body = {}) => ({
  user: { id: teacherId, role: 'teacher', schoolId },
  params,
  body,
});

beforeAll(async () => {
  await sqlite.sync({ force: true });
  await GroupModel.bulkCreate([
    { id: GROUP_G1, teacherId: TEACHER_A, schoolId: SCHOOL_A },
    { id: GROUP_G2, teacherId: TEACHER_B, schoolId: SCHOOL_A },
  ]);
  await ChildModel.bulkCreate([
    { id: CHILD_A1, schoolId: SCHOOL_A, groupId: GROUP_G1, parentId: null },
  ]);
});

afterAll(async () => { await sqlite.close(); });

beforeEach(() => { jest.clearAllMocks(); });

// ── AXIS 1: cross-school isolation ───────────────────────────────────────────

describe('createIRR — Axis 1 (school scope)', () => {
  it('404 when school-B teacher touches school-A child', async () => {
    const res = mkRes();
    await createIRR(req(TEACHER_X, SCHOOL_B, { childId: CHILD_A1 }), res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      error: expect.objectContaining({ code: 'IRR_CHILD_NOT_ACCESSIBLE' }),
    }));
    expect(mockIRRCreate).not.toHaveBeenCalled();
  });
});

describe('createAssessmentSession — Axis 1 (school scope)', () => {
  it('404 when school-B teacher touches school-A IRR', async () => {
    // IRR belongs to school A; teacher is school B → schoolId mismatch in resolveIRRAccess
    mockIRRFindByPk.mockResolvedValue(fakeIRR);
    const res = mkRes();
    await createAssessmentSession(req(TEACHER_X, SCHOOL_B, { irrId: IRR_A1 }), res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(mockSessionCreate).not.toHaveBeenCalled();
  });
});

describe('createLongTermGoal — Axis 1 (school scope)', () => {
  it('404 when school-B teacher touches school-A IRR', async () => {
    mockIRRFindByPk.mockResolvedValue(fakeIRR);
    const res = mkRes();
    await createLongTermGoal(req(TEACHER_X, SCHOOL_B, { irrId: IRR_A1 }, { goalText: 'Walk independently by end of term' }), res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(mockLTGoalCreate).not.toHaveBeenCalled();
  });
});

describe('createDailyEntry — Axis 1 (school scope)', () => {
  it('404 when school-B teacher touches school-A child', async () => {
    const res = mkRes();
    await createDailyEntry(
      req(TEACHER_X, SCHOOL_B, { childId: CHILD_A1 }, { entryDate: '2026-05-26' }),
      res,
    );
    expect(res.status).toHaveBeenCalledWith(404);
    expect(mockDailyCreate).not.toHaveBeenCalled();
  });
});

describe('createWeeklyEntry — Axis 1 (school scope)', () => {
  it('404 when school-B teacher touches school-A child', async () => {
    const res = mkRes();
    await createWeeklyEntry(
      req(TEACHER_X, SCHOOL_B, { childId: CHILD_A1 }, { weekStart: '2026-05-26' }),
      res,
    );
    expect(res.status).toHaveBeenCalledWith(404);
    expect(mockWeeklyCreate).not.toHaveBeenCalled();
  });
});

// ── AXIS 2: within-school assignment isolation ────────────────────────────────

describe('createIRR — Axis 2 (assignment)', () => {
  it('404 when same-school unassigned teacher touches child-A1', async () => {
    const res = mkRes();
    await createIRR(req(TEACHER_B, SCHOOL_A, { childId: CHILD_A1 }), res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(mockIRRCreate).not.toHaveBeenCalled();
  });
});

describe('createAssessmentSession — Axis 2 (assignment)', () => {
  it('404 when same-school unassigned teacher touches IRR of child-A1', async () => {
    mockIRRFindByPk.mockResolvedValue(fakeIRR);
    const res = mkRes();
    await createAssessmentSession(req(TEACHER_B, SCHOOL_A, { irrId: IRR_A1 }), res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(mockSessionCreate).not.toHaveBeenCalled();
  });
});

describe('createGoalPeriod — Axis 2 (assignment)', () => {
  it('404 when same-school unassigned teacher creates period on child-A1 IRR', async () => {
    mockIRRFindByPk.mockResolvedValue(fakeIRR);
    const res = mkRes();
    await createGoalPeriod(
      req(TEACHER_B, SCHOOL_A, { irrId: IRR_A1 }, { periodStart: '2026-01-01', periodEnd: '2026-06-30' }),
      res,
    );
    expect(res.status).toHaveBeenCalledWith(404);
    expect(mockPeriodCreate).not.toHaveBeenCalled();
  });
});

describe('createDailyEntry — Axis 2 (assignment)', () => {
  it('404 when same-school unassigned teacher creates daily entry for child-A1', async () => {
    const res = mkRes();
    await createDailyEntry(
      req(TEACHER_B, SCHOOL_A, { childId: CHILD_A1 }, { entryDate: '2026-05-26' }),
      res,
    );
    expect(res.status).toHaveBeenCalledWith(404);
    expect(mockDailyCreate).not.toHaveBeenCalled();
  });
});

// ── POSITIVE: assigned teacher succeeds ──────────────────────────────────────

describe('createIRR — positive (assigned teacher)', () => {
  it('201 when teacher-A creates IRR for own child-A1', async () => {
    mockIRRFindOne.mockResolvedValue(null); // no existing active IRR
    mockIRRCreate.mockResolvedValue({ id: 'irr-new', childId: CHILD_A1, schoolId: SCHOOL_A, status: 'draft' });
    const res = mkRes();
    await createIRR(req(TEACHER_A, SCHOOL_A, { childId: CHILD_A1 }), res);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(mockIRRCreate).toHaveBeenCalledWith(expect.objectContaining({
      childId: CHILD_A1,
      schoolId: SCHOOL_A,
    }));
  });
});

describe('createAssessmentSession — positive (assigned teacher)', () => {
  it('201 when teacher-A creates assessment session for child-A1 IRR', async () => {
    mockIRRFindByPk.mockResolvedValue(fakeIRR);
    mockSessionFindOne.mockResolvedValue(null); // no duplicate
    mockCriteriaFindAll.mockResolvedValue(
      Array.from({ length: 17 }, (_, i) => ({ id: `crit-${i + 1}` }))
    );
    mockSessionCreate.mockResolvedValue({
      id: 'sess-1', irrId: IRR_A1, totalScore: 68, maxPossibleScore: 68,
    });
    mockScoreBulkCreate.mockResolvedValue([]);
    const scores = Array(17).fill(4);
    const res = mkRes();
    await createAssessmentSession(
      req(TEACHER_A, SCHOOL_A, { irrId: IRR_A1 }, { sessionType: 'intake', scores }),
      res,
    );
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ totalScore: 68, maxPossibleScore: 68 }),
    }));
  });
});

describe('createLongTermGoal — positive (assigned teacher)', () => {
  it('201 when teacher-A creates long-term goal for child-A1 IRR', async () => {
    mockIRRFindByPk.mockResolvedValue(fakeIRR);
    mockLTGoalCreate.mockResolvedValue({ id: 'ltg-1', irrId: IRR_A1, goalText: 'Walk independently' });
    const res = mkRes();
    await createLongTermGoal(
      req(TEACHER_A, SCHOOL_A, { irrId: IRR_A1 }, { goalText: 'Walk independently by end of term' }),
      res,
    );
    expect(res.status).toHaveBeenCalledWith(201);
    expect(mockLTGoalCreate).toHaveBeenCalledWith(expect.objectContaining({
      schoolId: SCHOOL_A,
      childId: CHILD_A1,
    }));
  });
});

// ── Quarterly monitoring: role gate (admin-only, OQ-3) ───────────────────────

describe('createQuarterlyEntry — role gate', () => {
  it('403 when teacher role attempts quarterly entry (defense-in-depth)', async () => {
    const res = mkRes();
    await createQuarterlyEntry(
      { user: { id: TEACHER_A, role: 'teacher', schoolId: SCHOOL_A }, params: {}, body: { quarterStart: '2026-01-01', quarterEnd: '2026-03-31' } },
      res,
    );
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      error: expect.objectContaining({ code: 'QUARTERLY_ACCESS_DENIED' }),
    }));
    expect(mockQuarterlyCreate).not.toHaveBeenCalled();
  });

  it('201 when admin role creates quarterly entry', async () => {
    mockQuarterlyCreate.mockResolvedValue({
      id: 'q-1', schoolId: SCHOOL_A, quarterStart: '2026-01-01', quarterEnd: '2026-03-31',
    });
    const res = mkRes();
    await createQuarterlyEntry(
      { user: { id: 'admin-1', role: 'admin', schoolId: SCHOOL_A }, params: {}, body: { quarterStart: '2026-01-01', quarterEnd: '2026-03-31' } },
      res,
    );
    expect(res.status).toHaveBeenCalledWith(201);
    expect(mockQuarterlyCreate).toHaveBeenCalledWith(expect.objectContaining({
      schoolId: SCHOOL_A,
    }));
  });
});
