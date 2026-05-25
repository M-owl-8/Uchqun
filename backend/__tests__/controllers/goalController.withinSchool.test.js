/**
 * goalController — within-school cross-teacher IDOR revert-test (behavioral SQLite)
 *
 * LOAD-BEARING TEST SUITE — second-axis (teacher→child assignment) isolation
 * for the goals class (V1 remediation). The mock-based suites stub
 * isTeacherAssignedToChild to `true` and do NOT prove the primitive works
 * through a real child load. Do not delete or weaken without replacing this
 * coverage. See also: withinSchool.widerClass.test.js (wider class + legacy-positive).
 *
 * V1 residual from S4: validateChildAccess checks school membership only.
 * Teacher B (same school S, group G2) can PATCH/DELETE/POST-review/POST-create goals
 * on Child A1 who belongs to Teacher A (group G1) — both in school S.
 *
 * Fix: isTeacherAssignedToChild(child, req) checks both assignment paths:
 *   - Modern: child.groupId → Group.teacherId === req.user.id
 *   - Legacy: child.parentId → User.teacherId === req.user.id
 *
 * Revert-test discipline: each within-school test FAILS before the fix (controller
 * returns 200/201/204), PASSES after the fix (returns 404 GOAL_CHILD_NOT_ACCESSIBLE).
 * The "SELECT after" invariant is proven by asserting goal.update/goal.destroy NOT called.
 */

import { jest } from '@jest/globals';
import { Sequelize, DataTypes } from 'sequelize';

// Real in-memory SQLite — assignment checks execute against real data
const sqlite = new Sequelize('sqlite::memory:', { logging: false });

const ChildModel = sqlite.define('Child', {
  id:       { type: DataTypes.STRING, primaryKey: true },
  schoolId: { type: DataTypes.STRING, allowNull: true },
  groupId:  { type: DataTypes.STRING, allowNull: true },
  parentId: { type: DataTypes.STRING, allowNull: true },
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

// ChildGoal and ChildGoalReview are mocked — we only need real SQLite for assignment check
const mockGoalFindOne = jest.fn();
const mockGoalCreate  = jest.fn();
const mockGoalUpdate  = jest.fn();
const mockGoalDestroy = jest.fn();
const mockReviewCreate = jest.fn();

jest.unstable_mockModule('../../models/Child.js',          () => ({ default: ChildModel }));
jest.unstable_mockModule('../../models/Group.js',          () => ({ default: GroupModel }));
jest.unstable_mockModule('../../models/User.js',           () => ({ default: UserModel }));
jest.unstable_mockModule('../../models/ChildGoal.js',      () => ({
  default: { findOne: mockGoalFindOne, create: mockGoalCreate },
}));
jest.unstable_mockModule('../../models/ChildGoalReview.js', () => ({
  default: { create: mockReviewCreate },
}));
jest.unstable_mockModule('../../utils/logger.js', () => ({
  default: { error: jest.fn(), info: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));
jest.unstable_mockModule('../../utils/auditLogger.js', () => ({ logAudit: jest.fn() }));

// schoolValidation.js is NOT mocked — real validateChildAccess + isTeacherAssignedToChild
// run against the SQLite Child/Group/User models above.

const { update, deleteGoal, createReview, create, listByChild } =
  await import('../../controllers/goalController.js');

// ── Seed constants ──────────────────────────────────────────────────────────
const SCHOOL_S    = 'school-s';
const TEACHER_A   = 'teacher-a';  // owns Group G1
const TEACHER_B   = 'teacher-b';  // owns Group G2 (same school)
const TEACHER_C   = 'teacher-c';  // no group — legacy parent.teacherId assignment
const GROUP_G1    = 'group-g1';   // Teacher A's group
const GROUP_G2    = 'group-g2';   // Teacher B's group
const CHILD_A1    = 'child-a1';   // in Group G1 → assigned to Teacher A
const CHILD_C1    = 'child-c1';   // parentId=PARENT_C1 → legacy Teacher C assignment
const PARENT_C1   = 'parent-c1';  // user: teacherId=TEACHER_C
const GOAL_G      = 'goal-g';

const fakeGoalA1 = {
  id: GOAL_G, childId: CHILD_A1, schoolId: SCHOOL_S,
  category: 'communication', title: 'Say five words',
  update: mockGoalUpdate, destroy: mockGoalDestroy,
};

const mkRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json   = jest.fn().mockReturnValue(res);
  res.send   = jest.fn().mockReturnValue(res);
  return res;
};

beforeAll(async () => {
  await sqlite.sync({ force: true });
  await GroupModel.bulkCreate([
    { id: GROUP_G1, teacherId: TEACHER_A, schoolId: SCHOOL_S },
    { id: GROUP_G2, teacherId: TEACHER_B, schoolId: SCHOOL_S },
  ]);
  await ChildModel.bulkCreate([
    { id: CHILD_A1, schoolId: SCHOOL_S, groupId: GROUP_G1, parentId: null },
    { id: CHILD_C1, schoolId: SCHOOL_S, groupId: null,    parentId: PARENT_C1 },
  ]);
  await UserModel.bulkCreate([
    { id: PARENT_C1, role: 'parent', teacherId: TEACHER_C },
  ]);
});

afterAll(async () => { await sqlite.close(); });

beforeEach(() => { jest.clearAllMocks(); });

// ── Helper requests ─────────────────────────────────────────────────────────
const reqTeacherB = (params = {}, body = {}) => ({
  user: { id: TEACHER_B, role: 'teacher', schoolId: SCHOOL_S },
  params: { id: GOAL_G, childId: CHILD_A1, ...params },
  body,
});
const reqTeacherA = (params = {}, body = {}) => ({
  user: { id: TEACHER_A, role: 'teacher', schoolId: SCHOOL_S },
  params: { id: GOAL_G, childId: CHILD_A1, ...params },
  body,
});
const reqTeacherC = (params = {}, body = {}) => ({
  user: { id: TEACHER_C, role: 'teacher', schoolId: SCHOOL_S },
  params: { id: GOAL_G, childId: CHILD_C1, ...params },
  body,
});
const reqAdmin = (params = {}, body = {}) => ({
  user: { id: 'admin-1', role: 'admin', schoolId: SCHOOL_S },
  params: { id: GOAL_G, childId: CHILD_A1, ...params },
  body,
});

// ── Within-school cross-teacher IDOR tests ──────────────────────────────────
// These tests FAIL before the fix (200/201/204 returned) and PASS after (404).

describe('update — within-school cross-teacher IDOR', () => {
  it('404 GOAL_CHILD_NOT_ACCESSIBLE when Teacher B updates Child A1\'s goal', async () => {
    mockGoalFindOne.mockResolvedValue({ ...fakeGoalA1 });
    const res = mkRes();
    await update(reqTeacherB({}, { currentProgress: 'developing' }), res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      error: expect.objectContaining({ code: 'GOAL_CHILD_NOT_ACCESSIBLE' }),
    }));
    // SELECT-after invariant: goal row must be unchanged
    expect(mockGoalUpdate).not.toHaveBeenCalled();
  });
});

describe('deleteGoal — within-school cross-teacher IDOR', () => {
  it('404 GOAL_CHILD_NOT_ACCESSIBLE when Teacher B deletes Child A1\'s goal', async () => {
    mockGoalFindOne.mockResolvedValue({ ...fakeGoalA1 });
    const res = mkRes();
    await deleteGoal(reqTeacherB({}, {}), res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      error: expect.objectContaining({ code: 'GOAL_CHILD_NOT_ACCESSIBLE' }),
    }));
    expect(mockGoalDestroy).not.toHaveBeenCalled();
  });
});

describe('createReview — within-school cross-teacher IDOR', () => {
  it('404 GOAL_CHILD_NOT_ACCESSIBLE when Teacher B creates review on Child A1\'s goal', async () => {
    mockGoalFindOne.mockResolvedValue({ ...fakeGoalA1 });
    const res = mkRes();
    await createReview(reqTeacherB({}, { reviewDate: '2026-01-01', status: 'on_track' }), res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      error: expect.objectContaining({ code: 'GOAL_CHILD_NOT_ACCESSIBLE' }),
    }));
    expect(mockReviewCreate).not.toHaveBeenCalled();
  });
});

describe('create — within-school cross-teacher IDOR', () => {
  it('404 GOAL_CHILD_NOT_ACCESSIBLE when Teacher B creates goal on Child A1', async () => {
    const res = mkRes();
    await create(
      { ...reqTeacherB({ childId: CHILD_A1 }), body: { category: 'communication', title: 'Say hello' } },
      res,
    );
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      error: expect.objectContaining({ code: 'GOAL_CHILD_NOT_ACCESSIBLE' }),
    }));
    expect(mockGoalCreate).not.toHaveBeenCalled();
  });
});

describe('listByChild — within-school cross-teacher IDOR', () => {
  it('404 GOAL_CHILD_NOT_ACCESSIBLE when Teacher B lists goals for Child A1', async () => {
    const res = mkRes();
    await listByChild({ ...reqTeacherB(), params: { childId: CHILD_A1 } }, res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      error: expect.objectContaining({ code: 'GOAL_CHILD_NOT_ACCESSIBLE' }),
    }));
  });
});

// ── Positive: Teacher A CAN access Child A1 (own group) ────────────────────
describe('positive: Teacher A accesses own child\'s goals', () => {
  it('update — Teacher A gets 200 on Child A1 goal', async () => {
    mockGoalFindOne.mockResolvedValue({ ...fakeGoalA1, update: mockGoalUpdate });
    mockGoalUpdate.mockResolvedValue();
    const res = mkRes();
    await update(reqTeacherA({}, { currentProgress: 'developing' }), res);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    expect(mockGoalUpdate).toHaveBeenCalled();
  });
});

// ── Legacy path: Teacher C CAN access Child C1 (via parent.teacherId) ───────
describe('legacy positive: Teacher C (parent.teacherId) accesses Child C1\'s goals', () => {
  const fakeGoalC1 = {
    id: GOAL_G, childId: CHILD_C1, schoolId: SCHOOL_S,
    category: 'cognitive', title: 'Count to ten',
    update: mockGoalUpdate, destroy: mockGoalDestroy,
  };

  it('update — Teacher C gets 200 on Child C1 goal (legacy assignment)', async () => {
    mockGoalFindOne.mockResolvedValue({ ...fakeGoalC1, update: mockGoalUpdate });
    mockGoalUpdate.mockResolvedValue();
    const res = mkRes();
    await update(reqTeacherC({}, { currentProgress: 'emerging' }), res);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    expect(mockGoalUpdate).toHaveBeenCalled();
  });
});

// ── Admin bypass: admin CAN access any school child ─────────────────────────
describe('admin bypass: admin accesses any child\'s goals', () => {
  it('update — admin gets 200 on Child A1 goal despite not being in Group G1', async () => {
    mockGoalFindOne.mockResolvedValue({ ...fakeGoalA1, update: mockGoalUpdate });
    mockGoalUpdate.mockResolvedValue();
    const res = mkRes();
    await update(reqAdmin({}, { currentProgress: 'developing' }), res);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    expect(mockGoalUpdate).toHaveBeenCalled();
  });
});
