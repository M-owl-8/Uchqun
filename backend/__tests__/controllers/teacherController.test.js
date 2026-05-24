/**
 * teacherController — TP-02 revert-tests (conditional schoolId bypass)
 *
 * Four functions in teacherController use:
 *   if (req.user.schoolId) where.schoolId = req.user.schoolId;
 *
 * This means a request with schoolId=null skips the filter entirely and
 * returns records from ALL schools — cross-school data leak.
 *
 * Fix: unconditional `where.schoolId = req.user.schoolId;`
 * After fix: null schoolId → WHERE schoolId IS NULL → no matches (correct).
 *
 * Behavioral test uses real SQLite so the WHERE clause actually executes.
 */

import { jest } from '@jest/globals';
import { Sequelize, DataTypes } from 'sequelize';

// Real in-memory SQLite for the User model (WHERE clause executes for real).
const sqlite = new Sequelize('sqlite::memory:', { logging: false });

const UserModel = sqlite.define(
  'User',
  {
    id:          { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    email:       { type: DataTypes.STRING, allowNull: false, unique: true },
    password:    { type: DataTypes.STRING, allowNull: false, defaultValue: 'hash' },
    firstName:   { type: DataTypes.STRING, allowNull: false },
    lastName:    { type: DataTypes.STRING, allowNull: false },
    role:        { type: DataTypes.STRING, defaultValue: 'teacher' },
    schoolId:    { type: DataTypes.STRING, allowNull: true },
    rating:      { type: DataTypes.FLOAT,   defaultValue: 0 },
    totalRatings:{ type: DataTypes.INTEGER, defaultValue: 0 },
    avatar:      { type: DataTypes.STRING, allowNull: true },
  },
  { tableName: 'users', timestamps: false },
);

// All models → stubs except User which is real SQLite.
jest.unstable_mockModule('../../models/User.js',                  () => ({ default: UserModel }));
jest.unstable_mockModule('../../models/Child.js',                  () => ({ default: { findAll: jest.fn().mockResolvedValue([]) } }));
jest.unstable_mockModule('../../models/Group.js',                  () => ({ default: { findAll: jest.fn().mockResolvedValue([]) } }));
jest.unstable_mockModule('../../models/School.js',                 () => ({ default: {} }));
jest.unstable_mockModule('../../models/Activity.js',               () => ({ default: {} }));
jest.unstable_mockModule('../../models/Meal.js',                   () => ({ default: {} }));
jest.unstable_mockModule('../../models/Media.js',                  () => ({ default: {} }));
jest.unstable_mockModule('../../models/EmotionalMonitoring.js',    () => ({ default: {} }));
jest.unstable_mockModule('../../models/TeacherResponsibility.js',  () => ({ default: {} }));
jest.unstable_mockModule('../../models/TeacherTask.js',            () => ({ default: {} }));
jest.unstable_mockModule('../../models/TeacherWorkHistory.js',     () => ({ default: {} }));
jest.unstable_mockModule('../../models/GovernmentMessage.js',      () => ({ default: {} }));
jest.unstable_mockModule('../../utils/schoolValidation.js',        () => ({ validateChildAccess: jest.fn() }));
jest.unstable_mockModule('../../utils/logger.js',                  () => ({
  default: { error: jest.fn(), info: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

const { getTeacherRatings } = await import('../../controllers/teacherController.js');

const SCHOOL_A = 'aaaa0000-0000-0000-0000-000000000001';
const SCHOOL_B = 'bbbb0000-0000-0000-0000-000000000002';

const mkRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

beforeAll(async () => {
  await sqlite.sync({ force: true });
  await UserModel.bulkCreate([
    { email: 'teacher-a1@test.com', firstName: 'Alice', lastName: 'A', role: 'teacher', schoolId: SCHOOL_A, rating: 4.5, totalRatings: 10, password: 'hash' },
    { email: 'teacher-a2@test.com', firstName: 'Bob',   lastName: 'B', role: 'teacher', schoolId: SCHOOL_A, rating: 3.0, totalRatings: 5,  password: 'hash' },
    { email: 'teacher-b1@test.com', firstName: 'Carol', lastName: 'C', role: 'teacher', schoolId: SCHOOL_B, rating: 5.0, totalRatings: 20, password: 'hash' },
  ]);
});

afterAll(async () => { await sqlite.close(); });

describe('getTeacherRatings — TP-02 revert-tests (behavioral SQLite)', () => {
  // TP-02 revert-test: schoolId=null returns ALL teachers cross-school before fix,
  // returns EMPTY after fix (WHERE schoolId IS NULL → no matches).
  // FAILS pre-fix (returns 3 teachers), PASSES post-fix (returns 0).
  it('(TP-02) schoolId=null → empty result after fix, not all-school cross-leak', async () => {
    const req = { user: { id: 'caller', role: 'admin', schoolId: null } };
    const res = mkRes();
    await getTeacherRatings(req, res);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true, data: [] })
    );
  });

  // Sanity: same-school query returns only school A's teachers.
  it('schoolId=SCHOOL_A → returns only school A teachers', async () => {
    const req = { user: { id: 'caller', role: 'admin', schoolId: SCHOOL_A } };
    const res = mkRes();
    await getTeacherRatings(req, res);
    const { data } = res.json.mock.calls[0][0];
    expect(data).toHaveLength(2);
    // email IS in attributes list; schoolId is not (excluded from SELECT)
    expect(data.map(t => t.email).sort()).toEqual(
      ['teacher-a1@test.com', 'teacher-a2@test.com'].sort()
    );
  });
});
