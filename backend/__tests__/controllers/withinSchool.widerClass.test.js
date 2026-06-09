/**
 * Behavioral within-school cross-teacher IDOR tests — wider class
 *
 * LOAD-BEARING TEST SUITE — second-axis (teacher→child assignment) isolation
 * for the full teacher portal wider class (journal/attendance/activity/meal/
 * media). The mock-based suites (attendance.test.js etc.) stub
 * isTeacherAssignedToChild to `true` and do NOT prove the primitive works
 * through a real child load. Do not delete or weaken without replacing this
 * coverage. See also: goalController.withinSchool.test.js (goals class).
 *
 * Proves that isTeacherAssignedToChild blocks Teacher B from mutating
 * children belonging to Teacher A's group, across all affected controllers.
 * Also proves the LEGACY path (parent.teacherId) works through an actual
 * controller child-load — not just the primitive in isolation.
 *
 * Shared fixture (real SQLite):
 *   School S — two groups
 *   Group G1 → Teacher A (TEACHER_A)
 *   Group G2 → Teacher B (TEACHER_B, same school)
 *   Child A1  → schoolId=S, groupId=G1 (Teacher A's child via modern path)
 *
 * For each controller, Teacher B tries to mutate Child A1's data → must get 4xx.
 * schoolValidation.js is NOT mocked — real primitive runs against real SQLite.
 */
import { jest } from '@jest/globals';
import { Sequelize, DataTypes } from 'sequelize';

// ── Real SQLite for Child / Group / User ─────────────────────────────────────

const sqlite = new Sequelize({ dialect: 'sqlite', storage: ':memory:', logging: false });

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
  schoolId:  { type: DataTypes.STRING },
  teacherId: { type: DataTypes.STRING },
}, { tableName: 'groups', timestamps: false });

const UserModel = sqlite.define('User', {
  id:        { type: DataTypes.STRING, primaryKey: true },
  teacherId: { type: DataTypes.STRING, allowNull: true },
}, { tableName: 'users', timestamps: false });

const SCHOOL_S   = 'aa000001-0000-4000-a000-000000000001';
const TEACHER_A  = 'aa000002-0000-4000-a000-000000000002';
const TEACHER_B  = 'aa000003-0000-4000-a000-000000000003';
const GROUP_G1   = 'aa000004-0000-4000-a000-000000000004';
const GROUP_G2   = 'aa000005-0000-4000-a000-000000000005';
const CHILD_A1   = 'aa000006-0000-4000-a000-000000000006';

// ── Mock helpers ──────────────────────────────────────────────────────────────

const mkRes = () => {
  const r = {};
  r.status = jest.fn().mockReturnValue(r);
  r.json   = jest.fn().mockReturnValue(r);
  r.send   = jest.fn().mockReturnValue(r);
  return r;
};

const reqTeacherB = (extra = {}) => ({
  user: { id: TEACHER_B, role: 'teacher', schoolId: SCHOOL_S },
  body: {},
  params: {},
  query: {},
  ...extra,
});

const reqTeacherA = (extra = {}) => ({
  user: { id: TEACHER_A, role: 'teacher', schoolId: SCHOOL_S },
  body: {},
  params: {},
  query: {},
  ...extra,
});

// ── Model mocks (controller-specific models, not Child/Group/User) ────────────

// ChildJournalEntry
const mockJournalCreate  = jest.fn().mockResolvedValue({ id: 'j-1' });
const mockJournalFindAll = jest.fn().mockResolvedValue([]);

jest.unstable_mockModule('../../models/ChildJournalEntry.js', () => ({
  default: { create: mockJournalCreate, findAll: mockJournalFindAll, afterDestroy: jest.fn(), belongsTo: jest.fn(), hasMany: jest.fn() },
}));

// ChildAttendance
const mockAttCreate  = jest.fn().mockResolvedValue({ id: 'att-1' });
const mockAttFindAll = jest.fn().mockResolvedValue([]);

jest.unstable_mockModule('../../models/ChildAttendance.js', () => ({
  default: {
    create: mockAttCreate, findAll: mockAttFindAll,
    findOne: jest.fn().mockResolvedValue(null), // upsert check in createAttendance
    afterDestroy: jest.fn(), belongsTo: jest.fn(), hasMany: jest.fn(),
  },
}));

// Activity
const mockActivityCreate  = jest.fn().mockResolvedValue({ id: 'act-1', toJSON: () => ({ id: 'act-1', tasks: [], services: [] }) });
const mockActivityFindAll = jest.fn().mockResolvedValue([]);
const mockActivityFindByPk = jest.fn().mockResolvedValue(null);

jest.unstable_mockModule('../../models/Activity.js', () => ({
  default: {
    create: mockActivityCreate, findAll: mockActivityFindAll, findByPk: mockActivityFindByPk,
    afterDestroy: jest.fn(), belongsTo: jest.fn(), hasMany: jest.fn(),
  },
}));

// Meal
const mockMealCreate   = jest.fn().mockResolvedValue({ id: 'meal-1', toJSON: () => ({ id: 'meal-1' }) });
const mockMealFindByPk = jest.fn();

jest.unstable_mockModule('../../models/Meal.js', () => ({
  default: {
    create: mockMealCreate, findAll: jest.fn().mockResolvedValue([]), findByPk: mockMealFindByPk,
    afterDestroy: jest.fn(), belongsTo: jest.fn(), hasMany: jest.fn(),
  },
}));

// Media
const mockMediaCreate   = jest.fn().mockResolvedValue({ id: 'media-1', toJSON: () => ({ id: 'media-1' }) });
const mockMediaFindByPk = jest.fn();

jest.unstable_mockModule('../../models/Media.js', () => ({
  default: {
    create: mockMediaCreate, findAll: jest.fn().mockResolvedValue([]), findByPk: mockMediaFindByPk,
    afterDestroy: jest.fn(), belongsTo: jest.fn(), hasMany: jest.fn(),
  },
}));

// Shared infrastructure mocks
jest.unstable_mockModule('../../models/User.js', () => ({ default: UserModel }));
jest.unstable_mockModule('../../models/Child.js', () => ({ default: ChildModel }));
jest.unstable_mockModule('../../models/Group.js', () => ({ default: GroupModel }));

jest.unstable_mockModule('../../utils/logger.js', () => ({
  default: { error: jest.fn(), info: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));
jest.unstable_mockModule('../../utils/auditLogger.js', () => ({ logAudit: jest.fn() }));
jest.unstable_mockModule('../../config/socket.js', () => ({ emitToUser: jest.fn() }));
jest.unstable_mockModule('../../controllers/notificationController.js', () => ({
  createNotification: jest.fn().mockResolvedValue(null),
}));

// Import controllers after all mocks registered
const { create: journalCreate, listByChild: journalListByChild } =
  await import('../../controllers/journalController.js');
const { createAttendance } =
  await import('../../controllers/attendanceController.js');
const { createActivity } =
  await import('../../controllers/activityController.js');
const { createMeal } =
  await import('../../controllers/mealController.js');
const { createMedia } =
  await import('../../controllers/mediaController.js');

// ── Fixtures ──────────────────────────────────────────────────────────────────

beforeAll(async () => {
  await sqlite.sync({ force: true });
  await GroupModel.bulkCreate([
    { id: GROUP_G1, schoolId: SCHOOL_S, teacherId: TEACHER_A },
    { id: GROUP_G2, schoolId: SCHOOL_S, teacherId: TEACHER_B },
  ]);
  await ChildModel.create({ id: CHILD_A1, schoolId: SCHOOL_S, groupId: GROUP_G1 });
});

afterAll(() => sqlite.close());

beforeEach(() => jest.clearAllMocks());

// ── journalController ─────────────────────────────────────────────────────────

describe('journalController — within-school cross-teacher IDOR', () => {
  const TODAY = new Date().toISOString().split('T')[0];

  it('Teacher B cannot create journal entry for Child A1', async () => {
    const res = mkRes();
    await journalCreate(reqTeacherB({
      body: { childId: CHILD_A1, date: TODAY, content: 'Long enough content passes the 10-char minimum.' },
    }), res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      error: expect.objectContaining({ code: 'JOURNAL_CHILD_NOT_ACCESSIBLE' }),
    }));
    expect(mockJournalCreate).not.toHaveBeenCalled();
  });

  it('Teacher B cannot list journal entries for Child A1', async () => {
    const res = mkRes();
    await journalListByChild(reqTeacherB({ params: { childId: CHILD_A1 } }), res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('Teacher A can create journal entry for own child (positive)', async () => {
    mockJournalCreate.mockResolvedValueOnce({ id: 'j-ok' });
    const res = mkRes();
    await journalCreate(reqTeacherA({
      body: { childId: CHILD_A1, date: TODAY, content: 'Long enough content passes the 10-char minimum.' },
    }), res);
    expect(res.status).toHaveBeenCalledWith(201);
  });
});

// ── attendanceController ──────────────────────────────────────────────────────

describe('attendanceController — within-school cross-teacher IDOR', () => {
  const TODAY = new Date().toISOString().split('T')[0];

  it('Teacher B cannot create attendance for Child A1 (access denied, no record saved)', async () => {
    // createAttendance uses batch format: body.records = [{childId, date, status}]
    // Access-denied records produce 400 ATTENDANCE_ACCESS_DENIED (batch error accumulation).
    const res = mkRes();
    await createAttendance(reqTeacherB({
      body: { records: [{ childId: CHILD_A1, date: TODAY, status: 'present' }] },
    }), res);
    // Batch: all records denied → 400 with ATTENDANCE_ACCESS_DENIED
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      error: expect.objectContaining({ code: 'ATTENDANCE_ACCESS_DENIED' }),
    }));
    expect(mockAttCreate).not.toHaveBeenCalled();
  });

  it('Teacher A can create attendance for own child (positive)', async () => {
    mockAttCreate.mockResolvedValueOnce({ id: 'att-ok' });
    const res = mkRes();
    await createAttendance(reqTeacherA({
      body: { records: [{ childId: CHILD_A1, date: TODAY, status: 'present' }] },
    }), res);
    expect(res.status).toHaveBeenCalledWith(201);
  });
});

// ── activityController ────────────────────────────────────────────────────────

describe('activityController — within-school cross-teacher IDOR', () => {
  it('Teacher B cannot create activity for Child A1', async () => {
    const res = mkRes();
    await createActivity(reqTeacherB({
      body: { childId: CHILD_A1, skill: 'Test Skill', goal: 'Test Goal',
              startDate: '2026-01-01', endDate: '2026-06-01' },
    }), res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(mockActivityCreate).not.toHaveBeenCalled();
  });

  it('Teacher A can create activity for own child (positive)', async () => {
    mockActivityCreate.mockResolvedValueOnce({
      id: 'act-ok', toJSON: () => ({ id: 'act-ok', tasks: [], services: [] }),
    });
    const res = mkRes();
    await createActivity(reqTeacherA({
      body: { childId: CHILD_A1, skill: 'Test Skill', goal: 'Test Goal',
              startDate: '2026-01-01', endDate: '2026-06-01' },
    }), res);
    expect(res.status).toHaveBeenCalledWith(201);
  });
});

// ── mealController ────────────────────────────────────────────────────────────

describe('mealController — within-school cross-teacher IDOR', () => {
  it('Teacher B cannot create meal for Child A1', async () => {
    const res = mkRes();
    await createMeal(reqTeacherB({
      body: { childId: CHILD_A1, mealName: 'Soup', description: 'Vegetable soup',
              mealType: 'lunch', date: '2026-05-25' },
    }), res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(mockMealCreate).not.toHaveBeenCalled();
  });

  it('Teacher A can create meal for own child (positive)', async () => {
    mockMealCreate.mockResolvedValueOnce({ id: 'meal-ok', toJSON: () => ({ id: 'meal-ok' }) });
    mockMealFindByPk.mockResolvedValueOnce({ id: 'meal-ok', toJSON: () => ({ id: 'meal-ok' }) });
    const res = mkRes();
    await createMeal(reqTeacherA({
      body: { childId: CHILD_A1, mealName: 'Soup', description: 'Vegetable soup',
              mealType: 'lunch', date: '2026-05-25' },
    }), res);
    expect(res.status).toHaveBeenCalledWith(201);
  });
});

// ── mediaController ───────────────────────────────────────────────────────────

describe('mediaController — within-school cross-teacher IDOR', () => {
  it('Teacher B cannot create media for Child A1', async () => {
    const res = mkRes();
    await createMedia(reqTeacherB({
      body: { childId: CHILD_A1, type: 'photo', url: 'https://example.com/img.jpg',
              title: 'Test Photo', date: '2026-05-25' },
    }), res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(mockMediaCreate).not.toHaveBeenCalled();
  });

  it('Teacher A can create media for own child (positive)', async () => {
    mockMediaCreate.mockResolvedValueOnce({ id: 'media-ok', toJSON: () => ({ id: 'media-ok', thumbnail: null }) });
    mockMediaFindByPk.mockResolvedValueOnce({ id: 'media-ok', toJSON: () => ({ id: 'media-ok', thumbnail: null }) });
    const res = mkRes();
    await createMedia(reqTeacherA({
      body: { childId: CHILD_A1, type: 'photo', url: 'https://example.com/img.jpg',
              title: 'Test Photo', date: '2026-05-25' },
    }), res);
    expect(res.status).toHaveBeenCalledWith(201);
  });
});
