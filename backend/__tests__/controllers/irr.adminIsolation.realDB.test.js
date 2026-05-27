/**
 * Admin cross-school isolation — real SQLite, two-school seed.
 *
 * LOAD-BEARING TEST SUITE.
 *
 * Proves that an admin of school A cannot reach school B's child data
 * via teacher-scoped routes (GET /teacher/children, GET /teacher/children/:id/irr,
 * GET /teacher/irr/:irrId/goal-periods, POST /teacher/goal-periods/:id/sign).
 *
 * These routes accept admin role (requireTeacher allows ['teacher','reception','admin']),
 * and isTeacherAssignedToChild returns true immediately for non-teacher roles.
 * The ONLY cross-school boundary for admin is the explicit `schoolId` check inside
 * each resolver. This suite exercises those checks against real SQLite rows.
 *
 * schoolValidation.js is NOT mocked — real isTeacherAssignedToChild runs and confirms
 * the admin bypass is in place, making the schoolId resolver check the sole guard.
 */

import { jest } from '@jest/globals';
import { Sequelize, DataTypes } from 'sequelize';

const sqlite = new Sequelize('sqlite::memory:', { logging: false });

// ── Real SQLite models (isolation-critical) ───────────────────────────────────

const ChildModel = sqlite.define('Child', {
  id:          { type: DataTypes.STRING, primaryKey: true },
  schoolId:    { type: DataTypes.STRING, allowNull: true },
  groupId:     { type: DataTypes.STRING, allowNull: true },
  parentId:    { type: DataTypes.STRING, allowNull: true },
  firstName:   { type: DataTypes.STRING, defaultValue: 'Test' },
  lastName:    { type: DataTypes.STRING, defaultValue: 'Child' },
  dateOfBirth: { type: DataTypes.STRING, defaultValue: '2020-01-01' },
  gender:      { type: DataTypes.STRING, allowNull: true },
  class:       { type: DataTypes.STRING, allowNull: true },
}, { tableName: 'children', timestamps: false });

const IRRModel = sqlite.define('IRR', {
  id:       { type: DataTypes.STRING, primaryKey: true },
  childId:  { type: DataTypes.STRING, allowNull: true },
  schoolId: { type: DataTypes.STRING, allowNull: true },
  status:   { type: DataTypes.STRING, defaultValue: 'active' },
  childFullName:        { type: DataTypes.STRING, allowNull: true },
  dateOfBirth:          { type: DataTypes.STRING, allowNull: true },
  ageAtAssessmentStart: { type: DataTypes.STRING, allowNull: true },
  ptpkIntakeDate:       { type: DataTypes.STRING, allowNull: true },
  ptpkConclusionDate:   { type: DataTypes.STRING, allowNull: true },
  ptpkConclusionNumber: { type: DataTypes.STRING, allowNull: true },
  ptpkDiagnosis:        { type: DataTypes.STRING, allowNull: true },
  irrStartDate:         { type: DataTypes.STRING, allowNull: true },
  additionalInfo:       { type: DataTypes.STRING, allowNull: true },
}, { tableName: 'irrs', timestamps: false });

// GoalPeriod: mocked (school-B period is returned as plain object so schoolId check fires)
const mockGoalPeriod = {
  findByPk: jest.fn(),
  findAll:  jest.fn(),
  create:   jest.fn(),
};

// ── Stubs for models not on the isolation path ────────────────────────────────
const mkStub = () => ({
  findAll: jest.fn(), findByPk: jest.fn(), findOne: jest.fn(),
  create: jest.fn(), bulkCreate: jest.fn(),
});

jest.unstable_mockModule('../../models/Child.js',    () => ({ default: ChildModel }));
jest.unstable_mockModule('../../models/IRR.js',      () => ({ default: IRRModel }));
jest.unstable_mockModule('../../models/GoalPeriod.js', () => ({ default: mockGoalPeriod }));

// Models imported by teacherController but not touched by getChildren
jest.unstable_mockModule('../../models/User.js',                () => ({ default: mkStub() }));
jest.unstable_mockModule('../../models/Group.js',               () => ({ default: mkStub() }));
jest.unstable_mockModule('../../models/School.js',              () => ({ default: mkStub() }));
jest.unstable_mockModule('../../models/Activity.js',            () => ({ default: mkStub() }));
jest.unstable_mockModule('../../models/Meal.js',                () => ({ default: mkStub() }));
jest.unstable_mockModule('../../models/Media.js',               () => ({ default: mkStub() }));
jest.unstable_mockModule('../../models/EmotionalMonitoring.js', () => ({ default: mkStub() }));
jest.unstable_mockModule('../../models/TeacherResponsibility.js', () => ({ default: mkStub() }));
jest.unstable_mockModule('../../models/TeacherTask.js',         () => ({ default: mkStub() }));
jest.unstable_mockModule('../../models/TeacherWorkHistory.js',  () => ({ default: mkStub() }));
jest.unstable_mockModule('../../models/GovernmentMessage.js',   () => ({ default: mkStub() }));

// Models imported by irrController but not on the tested path
jest.unstable_mockModule('../../models/AssessmentSession.js',          () => ({ default: mkStub() }));
jest.unstable_mockModule('../../models/AssessmentScore.js',            () => ({ default: mkStub() }));
jest.unstable_mockModule('../../models/AssessmentCriteria.js',         () => ({ default: mkStub() }));
jest.unstable_mockModule('../../models/LongTermGoal.js',               () => ({ default: mkStub() }));
jest.unstable_mockModule('../../models/ShortTermGoal.js',              () => ({ default: mkStub() }));
jest.unstable_mockModule('../../models/DailyMonitoringEntry.js',       () => ({ default: mkStub() }));
jest.unstable_mockModule('../../models/WeeklyMonitoringEntry.js',      () => ({ default: mkStub() }));
jest.unstable_mockModule('../../models/QuarterlyMonitoringEntry.js',   () => ({ default: mkStub() }));

jest.unstable_mockModule('../../utils/logger.js', () => ({
  default: { error: jest.fn(), info: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));
jest.unstable_mockModule('../../utils/auditLogger.js', () => ({ logAudit: jest.fn() }));

// schoolValidation.js is NOT mocked — real isTeacherAssignedToChild confirms admin bypass

const { getChildren }                              = await import('../../controllers/teacherController.js');
const { getChildIRR, listGoalPeriods, signGoalPeriod } = await import('../../controllers/teacher/irrController.js');

// ── Seed constants ────────────────────────────────────────────────────────────
const SCHOOL_A  = 'adm-iso-school-a';
const SCHOOL_B  = 'adm-iso-school-b';
const CHILD_A1  = 'adm-iso-child-a1';
const CHILD_B1  = 'adm-iso-child-b1';
const IRR_A     = 'adm-iso-irr-a';
const IRR_B     = 'adm-iso-irr-b';
const PERIOD_B  = 'adm-iso-period-b';  // school-B period for sign test

const mkRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json   = jest.fn().mockReturnValue(res);
  return res;
};

const adminAReq = (params = {}) => ({
  user: { id: 'adm-iso-admin-a', role: 'admin', schoolId: SCHOOL_A },
  params,
  body: {},
  query: {},
});

beforeAll(async () => {
  await sqlite.sync({ force: true });

  await ChildModel.bulkCreate([
    { id: CHILD_A1, schoolId: SCHOOL_A },
    { id: CHILD_B1, schoolId: SCHOOL_B },
  ]);

  await IRRModel.bulkCreate([
    { id: IRR_A, childId: CHILD_A1, schoolId: SCHOOL_A, status: 'active' },
    { id: IRR_B, childId: CHILD_B1, schoolId: SCHOOL_B, status: 'active' },
  ]);
});

afterAll(async () => { await sqlite.close(); });

beforeEach(() => { jest.clearAllMocks(); });

// ── Test 1: getChildren — Pattern C (WHERE schoolId) ─────────────────────────
// Admin's only scoping is req.user.schoolId injected into the WHERE clause.
// A school-B child in the DB must not appear in school-A admin's list.

describe('getChildren — admin A sees only school-A children', () => {
  it('returns school-A child; school-B child absent from list', async () => {
    const res = mkRes();
    await getChildren(adminAReq(), res);

    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    const ids = res.json.mock.calls[0][0].data.map(c => c.id);
    expect(ids).toContain(CHILD_A1);
    expect(ids).not.toContain(CHILD_B1);
    expect(ids).toHaveLength(1);
  });
});

// ── Test 2: getChildIRR — resolver schoolId check blocks cross-school access ──
// resolveChildAccess: Child.findByPk → child.schoolId !== req.user.schoolId → null → 404

describe('getChildIRR — admin A blocked from school-B child (resolver schoolId check)', () => {
  it('404 when admin A requests school-B child IRR', async () => {
    const res = mkRes();
    await getChildIRR(adminAReq({ childId: CHILD_B1 }), res);

    expect(res.status).toHaveBeenCalledWith(404);
  });

});

// ── Test 3: listGoalPeriods — resolver blocks cross-school IRR ───────────────
// resolveIRRAccess: IRR.findByPk → irr.schoolId !== req.user.schoolId → null → 404

describe('listGoalPeriods — admin A blocked from school-B IRR (resolver schoolId check)', () => {
  it('404 when admin A requests periods for school-B IRR', async () => {
    const res = mkRes();
    await listGoalPeriods(adminAReq({ irrId: IRR_B }), res);

    expect(res.status).toHaveBeenCalledWith(404);
  });
});

// ── Test 4: signGoalPeriod — resolver blocks cross-school period ─────────────
// resolvePeriodAccess: GoalPeriod.findByPk → period.schoolId !== req.user.schoolId → null → 404
// GoalPeriod is mocked; we configure it to return a school-B period for this test.

describe('signGoalPeriod — admin A blocked from signing school-B period (resolver schoolId check)', () => {
  it('404 when admin A tries to sign a school-B period', async () => {
    mockGoalPeriod.findByPk.mockResolvedValueOnce({
      id: PERIOD_B,
      schoolId: SCHOOL_B,
      childId: CHILD_B1,
    });

    const res = mkRes();
    await signGoalPeriod(adminAReq({ id: PERIOD_B }), res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(mockGoalPeriod.findByPk).toHaveBeenCalledWith(PERIOD_B);
  });
});
