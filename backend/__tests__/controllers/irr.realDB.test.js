/**
 * ИРР controllers — real-DB isolation for list/query-WHERE endpoints + activation gate.
 *
 * LOAD-BEARING TEST SUITE.
 *
 * Phase 2 withinSchool tests mock all ИРР Sequelize models. Mocked models return
 * whatever they are configured to return regardless of WHERE clause — they prove
 * controller logic but cannot prove that a DB-level WHERE actually filters rows.
 *
 * STEP 1 — Isolation pattern taxonomy (full controller read 2026-05-26):
 *
 *   Pattern A — Resolver-on-fetched-row (PK fetch + .schoolId field check on instance):
 *     createIRR, getChildIRR, getIRR, updateIRR, activateIRR, archiveIRR,
 *     createAssessmentSession, getAssessmentSession (findByPk + session.schoolId check),
 *     createLongTermGoal, updateLongTermGoal, deleteLongTermGoal,
 *     createGoalPeriod, updateGoalPeriodReview, signGoalPeriod,
 *     createShortTermGoal, updateShortTermGoal, deleteShortTermGoal,
 *     createDailyEntry, createWeeklyEntry
 *     → Proven by irr.withinSchool.test.js (real SQLite assignment + mocked ИРР models).
 *
 *   Pattern B — Cascade via verified FK (findAll WHERE fkId = resolverVerifiedValue):
 *     listAssessmentSessions (WHERE irrId=verified),
 *     listLongTermGoals (WHERE irrId=verified),
 *     listGoalPeriods (WHERE irrId=verified),
 *     listShortTermGoals (WHERE periodId=verified),
 *     listDailyEntries (WHERE childId=verified),
 *     listWeeklyEntries (WHERE childId=verified)
 *     → Resolver guarantees FK belongs to tenant; real-DB test proves WHERE executes.
 *     → Safety assumption: creation flow copies schoolId onto each row, making cross-tenant
 *       rows with matching FK physically impossible through normal write paths.
 *
 *   Pattern C — Direct WHERE schoolId (no resolver):
 *     listQuarterlyEntries (WHERE schoolId=req.user.schoolId)
 *     → Only endpoint without a pre-query resolver. Most critical to prove with real DB.
 *
 * STEP 2 — Real SQLite with two-school seed proves:
 *   - listQuarterlyEntries: school B's entry excluded from school A admin's list (Pattern C)
 *   - listAssessmentSessions: school B's session excluded when listing school A's IRR (Pattern B)
 *   - listDailyEntries: school B's entry excluded when listing school A's child's entries (Pattern B)
 *
 * STEP 3 — activateIRR header-gate:
 *   - 8/9 fields → 400 IRR_HEADER_INCOMPLETE, DB status unchanged ('draft')
 *   - 9/9 fields → 200, DB status updated to 'active'
 *
 * schoolValidation.js is NOT mocked — real isTeacherAssignedToChild runs against SQLite data.
 */

import { jest } from '@jest/globals';
import { Sequelize, DataTypes } from 'sequelize';

const sqlite = new Sequelize('sqlite::memory:', { logging: false });

// ── Real SQLite models ───────────────────────────────────────────────────────
// Child/Group/User: assignment axis (schoolValidation.js is not mocked)
// IRR: resolver + activation gate (real .update() proves DB state change)
// AssessmentSession, DailyMonitoringEntry, QuarterlyMonitoringEntry: list query targets

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

const IRRModel = sqlite.define('IRR', {
  id:                   { type: DataTypes.STRING, primaryKey: true },
  childId:              { type: DataTypes.STRING, allowNull: true },
  schoolId:             { type: DataTypes.STRING, allowNull: true },
  status:               { type: DataTypes.STRING, defaultValue: 'draft' },
  // HEADER_FIELDS — checked by activateIRR gate
  childFullName:         { type: DataTypes.STRING, allowNull: true },
  dateOfBirth:           { type: DataTypes.STRING, allowNull: true },
  ageAtAssessmentStart:  { type: DataTypes.STRING, allowNull: true },
  ptpkIntakeDate:        { type: DataTypes.STRING, allowNull: true },
  ptpkConclusionDate:    { type: DataTypes.STRING, allowNull: true },
  ptpkConclusionNumber:  { type: DataTypes.STRING, allowNull: true },
  ptpkDiagnosis:         { type: DataTypes.STRING, allowNull: true },
  irrStartDate:          { type: DataTypes.STRING, allowNull: true },
  additionalInfo:        { type: DataTypes.STRING, allowNull: true },
}, { tableName: 'irrs', timestamps: false });

const AssessmentSessionModel = sqlite.define('AssessmentSession', {
  id:              { type: DataTypes.STRING, primaryKey: true },
  irrId:           { type: DataTypes.STRING, allowNull: true },
  schoolId:        { type: DataTypes.STRING, allowNull: true },
  sessionType:     { type: DataTypes.STRING, defaultValue: 'intake' },
  completedAt:     { type: DataTypes.STRING, allowNull: true },
  totalScore:      { type: DataTypes.INTEGER, defaultValue: 0 },
  maxPossibleScore: { type: DataTypes.INTEGER, defaultValue: 68 },
}, { tableName: 'assessment_sessions', timestamps: false });

const DailyEntryModel = sqlite.define('DailyMonitoringEntry', {
  id:        { type: DataTypes.STRING, primaryKey: true },
  childId:   { type: DataTypes.STRING, allowNull: true },
  schoolId:  { type: DataTypes.STRING, allowNull: true },
  entryDate: { type: DataTypes.STRING, allowNull: true },
}, { tableName: 'daily_monitoring_entries', timestamps: false });

const QuarterlyEntryModel = sqlite.define('QuarterlyMonitoringEntry', {
  id:           { type: DataTypes.STRING, primaryKey: true },
  schoolId:     { type: DataTypes.STRING, allowNull: true },
  quarterStart: { type: DataTypes.STRING, allowNull: true },
  quarterEnd:   { type: DataTypes.STRING, allowNull: true },
}, { tableName: 'quarterly_monitoring_entries', timestamps: false });

// ── Mocked ИРР models (not the list targets for this suite) ──────────────────
const mockWeekly    = { create: jest.fn(), findAll: jest.fn() };
const mockLTGoal    = { create: jest.fn(), findAll: jest.fn(), findByPk: jest.fn() };
const mockPeriod    = { create: jest.fn(), findAll: jest.fn(), findByPk: jest.fn() };
const mockSTGoal    = { create: jest.fn(), findAll: jest.fn(), findByPk: jest.fn() };
const mockCriteria  = { findAll: jest.fn() };
const mockScore     = { bulkCreate: jest.fn(), findAll: jest.fn() };

jest.unstable_mockModule('../../models/Child.js',    () => ({ default: ChildModel }));
jest.unstable_mockModule('../../models/Group.js',    () => ({ default: GroupModel }));
jest.unstable_mockModule('../../models/User.js',     () => ({ default: UserModel }));
jest.unstable_mockModule('../../models/IRR.js',      () => ({ default: IRRModel }));
jest.unstable_mockModule('../../models/AssessmentSession.js',      () => ({ default: AssessmentSessionModel }));
jest.unstable_mockModule('../../models/DailyMonitoringEntry.js',   () => ({ default: DailyEntryModel }));
jest.unstable_mockModule('../../models/QuarterlyMonitoringEntry.js', () => ({ default: QuarterlyEntryModel }));
jest.unstable_mockModule('../../models/WeeklyMonitoringEntry.js',  () => ({ default: mockWeekly }));
jest.unstable_mockModule('../../models/LongTermGoal.js',           () => ({ default: mockLTGoal }));
jest.unstable_mockModule('../../models/GoalPeriod.js',             () => ({ default: mockPeriod }));
jest.unstable_mockModule('../../models/ShortTermGoal.js',          () => ({ default: mockSTGoal }));
jest.unstable_mockModule('../../models/AssessmentCriteria.js',     () => ({ default: mockCriteria }));
jest.unstable_mockModule('../../models/AssessmentScore.js',        () => ({ default: mockScore }));
jest.unstable_mockModule('../../utils/logger.js', () => ({
  default: { error: jest.fn(), info: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));
jest.unstable_mockModule('../../utils/auditLogger.js', () => ({ logAudit: jest.fn() }));

// schoolValidation.js is NOT mocked — real isTeacherAssignedToChild runs
const {
  listAssessmentSessions,
  listDailyEntries,
  listQuarterlyEntries,
  activateIRR,
} = await import('../../controllers/teacher/irrController.js');

// ── Seed constants ────────────────────────────────────────────────────────────
const SCHOOL_A  = 'rdb-school-a';
const SCHOOL_B  = 'rdb-school-b';
const TEACHER_A = 'rdb-teacher-a';
const GROUP_G1  = 'rdb-group-g1';
const CHILD_A1  = 'rdb-child-a1';
const CHILD_B1  = 'rdb-child-b1';
const IRR_A     = 'rdb-irr-a';      // school A, child A1
const IRR_B     = 'rdb-irr-b';      // school B, child B1

const SESS_A1   = 'rdb-sess-a1';
const SESS_A2   = 'rdb-sess-a2';
const SESS_B1   = 'rdb-sess-b1';    // school B — must NOT appear in school A lists
const DAILY_A1  = 'rdb-daily-a1';
const DAILY_A2  = 'rdb-daily-a2';
const DAILY_B1  = 'rdb-daily-b1';   // school B — must NOT appear in school A lists
const QTR_A1    = 'rdb-q-a1';
const QTR_A2    = 'rdb-q-a2';
const QTR_B1    = 'rdb-q-b1';       // school B — must NOT appear in school A lists
const IRR_INCOMPLETE = 'rdb-irr-incomplete';  // 8/9 header fields
const IRR_COMPLETE   = 'rdb-irr-complete';    // 9/9 header fields

const mkRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json   = jest.fn().mockReturnValue(res);
  return res;
};

const teacherAReq = (params = {}, query = {}) => ({
  user: { id: TEACHER_A, role: 'teacher', schoolId: SCHOOL_A },
  params,
  body: {},
  query,
});

const adminAReq = () => ({
  user: { id: 'rdb-admin-a', role: 'admin', schoolId: SCHOOL_A },
  params: {},
  body: {},
  query: {},
});

const HEADER8 = {
  childFullName: 'Test Child', dateOfBirth: '2020-01-01',
  ageAtAssessmentStart: '5', ptpkIntakeDate: '2026-01-01',
  ptpkConclusionDate: '2026-01-15', ptpkConclusionNumber: 'PKT-001',
  ptpkDiagnosis: 'F84.0', irrStartDate: '2026-02-01',
  additionalInfo: null,   // MISSING — only 8 of 9 HEADER_FIELDS are truthy
};

const HEADER9 = { ...HEADER8, additionalInfo: 'Complete notes' };  // all 9

beforeAll(async () => {
  await sqlite.sync({ force: true });

  // Assignment data (schoolValidation.js uses real SQLite Group + Child + User)
  await GroupModel.create({ id: GROUP_G1, teacherId: TEACHER_A, schoolId: SCHOOL_A });
  await ChildModel.bulkCreate([
    { id: CHILD_A1, schoolId: SCHOOL_A, groupId: GROUP_G1 },
    { id: CHILD_B1, schoolId: SCHOOL_B, groupId: null },
  ]);

  // IRR rows for list test resolvers + activation gate
  await IRRModel.bulkCreate([
    { id: IRR_A, childId: CHILD_A1, schoolId: SCHOOL_A, status: 'active' },
    { id: IRR_B, childId: CHILD_B1, schoolId: SCHOOL_B, status: 'active' },
    { id: IRR_INCOMPLETE, childId: CHILD_A1, schoolId: SCHOOL_A, status: 'draft', ...HEADER8 },
    { id: IRR_COMPLETE,   childId: CHILD_A1, schoolId: SCHOOL_A, status: 'draft', ...HEADER9 },
  ]);

  // Assessment sessions — school A × 2, school B × 1
  await AssessmentSessionModel.bulkCreate([
    { id: SESS_A1, irrId: IRR_A, schoolId: SCHOOL_A, sessionType: 'intake', completedAt: '2026-01-01', totalScore: 48 },
    { id: SESS_A2, irrId: IRR_A, schoolId: SCHOOL_A, sessionType: '3mo',    completedAt: '2026-04-01', totalScore: 56 },
    { id: SESS_B1, irrId: IRR_B, schoolId: SCHOOL_B, sessionType: 'intake', completedAt: '2026-01-01', totalScore: 32 },
  ]);

  // Daily monitoring — school A × 2, school B × 1
  await DailyEntryModel.bulkCreate([
    { id: DAILY_A1, childId: CHILD_A1, schoolId: SCHOOL_A, entryDate: '2026-05-20' },
    { id: DAILY_A2, childId: CHILD_A1, schoolId: SCHOOL_A, entryDate: '2026-05-21' },
    { id: DAILY_B1, childId: CHILD_B1, schoolId: SCHOOL_B, entryDate: '2026-05-20' },
  ]);

  // Quarterly monitoring — school A × 2, school B × 1
  await QuarterlyEntryModel.bulkCreate([
    { id: QTR_A1, schoolId: SCHOOL_A, quarterStart: '2026-01-01', quarterEnd: '2026-03-31' },
    { id: QTR_A2, schoolId: SCHOOL_A, quarterStart: '2026-04-01', quarterEnd: '2026-06-30' },
    { id: QTR_B1, schoolId: SCHOOL_B, quarterStart: '2026-01-01', quarterEnd: '2026-03-31' },
  ]);
});

afterAll(async () => { await sqlite.close(); });

beforeEach(() => { jest.clearAllMocks(); });

// ── STEP 2a: listQuarterlyEntries — Pattern C (direct WHERE schoolId) ─────────
// Most critical: no resolver before the findAll, WHERE clause IS the only filter.

describe('listQuarterlyEntries — Pattern C: real-DB WHERE schoolId', () => {
  it('school A admin receives exactly 2 school-A entries; school-B entry excluded', async () => {
    const res = mkRes();
    await listQuarterlyEntries(adminAReq(), res);

    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    const ids = res.json.mock.calls[0][0].data.map(e => e.id);
    expect(ids).toContain(QTR_A1);
    expect(ids).toContain(QTR_A2);
    expect(ids).not.toContain(QTR_B1);
    expect(ids).toHaveLength(2);
  });
});

// ── STEP 2b: listAssessmentSessions — Pattern B (cascade via verified irrId) ──
// Resolver verifies irrId belongs to tenant; findAll filters by that FK value.
// Real DB proves: SQL WHERE irrId=IRR_A actually excludes SESS_B1 (irrId=IRR_B).

describe('listAssessmentSessions — Pattern B: cascade via verified irrId', () => {
  it('returns 2 school-A sessions; school-B session (different irrId) excluded', async () => {
    const res = mkRes();
    await listAssessmentSessions(teacherAReq({ irrId: IRR_A }), res);

    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    const ids = res.json.mock.calls[0][0].data.map(s => s.id);
    expect(ids).toContain(SESS_A1);
    expect(ids).toContain(SESS_A2);
    expect(ids).not.toContain(SESS_B1);
    expect(ids).toHaveLength(2);
  });

  it('school-B irrId is blocked at resolver (404) before any session query', async () => {
    // Teacher A (school A) cannot reach IRR_B (school B) — resolver blocks
    const res = mkRes();
    await listAssessmentSessions(teacherAReq({ irrId: IRR_B }), res);
    expect(res.status).toHaveBeenCalledWith(404);
  });
});

// ── STEP 2c: listDailyEntries — Pattern B (cascade via verified childId) ──────
// Resolver verifies childId belongs to tenant+assigned; findAll filters by that FK value.

describe('listDailyEntries — Pattern B: cascade via verified childId', () => {
  it('returns 2 school-A entries for child-A1; school-B entry (different childId) excluded', async () => {
    const res = mkRes();
    await listDailyEntries(teacherAReq({ childId: CHILD_A1 }, {}), res);

    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    const ids = res.json.mock.calls[0][0].data.map(e => e.id);
    expect(ids).toContain(DAILY_A1);
    expect(ids).toContain(DAILY_A2);
    expect(ids).not.toContain(DAILY_B1);
    expect(ids).toHaveLength(2);
  });

  it('school-B childId is blocked at resolver (404) before any entry query', async () => {
    const res = mkRes();
    await listDailyEntries(teacherAReq({ childId: CHILD_B1 }, {}), res);
    expect(res.status).toHaveBeenCalledWith(404);
  });
});

// ── STEP 3: activateIRR header-gate ──────────────────────────────────────────
// Proves the 9-field completeness gate rejects, and the DB state is unchanged on rejection.

describe('activateIRR — header-gate negative: 8/9 fields (additionalInfo missing)', () => {
  it('400 IRR_HEADER_INCOMPLETE; DB status remains draft', async () => {
    const res = mkRes();
    await activateIRR(teacherAReq({ irrId: IRR_INCOMPLETE }), res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      success: false,
      error: expect.objectContaining({ code: 'IRR_HEADER_INCOMPLETE' }),
    }));

    // Real DB check — status must be unchanged
    const irr = await IRRModel.findByPk(IRR_INCOMPLETE);
    expect(irr.status).toBe('draft');
  });
});

describe('activateIRR — header-gate positive: all 9 fields present', () => {
  it('200; DB status updated to active', async () => {
    const res = mkRes();
    await activateIRR(teacherAReq({ irrId: IRR_COMPLETE }), res);

    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    expect(res.status).not.toHaveBeenCalledWith(400);

    // Real DB check — status must be updated
    const irr = await IRRModel.findByPk(IRR_COMPLETE);
    expect(irr.status).toBe('active');
  });
});
