/**
 * Behavioral isolation tests — reception lifecycle endpoints (6 endpoints)
 *
 * These complement the mock-based revert-tests in receptionLifecycle.test.js.
 * The key difference:
 *
 *   receptionLifecycle.test.js  — mocks findOne to return null, asserts 404.
 *                                  Proves: null-handling works.
 *                                  Does NOT prove: the WHERE clause filters by schoolId.
 *
 *   THIS FILE — uses a real in-memory SQLite database. Seeds school-A and
 *                school-B records. The actual User.findOne WHERE clause executes
 *                against real data. Cross-school call → SQLite returns null because
 *                schoolId doesn't match → 404. Same-school call → SQLite returns
 *                the record → mutation succeeds.
 *
 *   Both assertions are required:
 *     1. Cross-school 404 (the isolation holds)
 *     2. Same-school 200 with record changed (the clause is correctly selective —
 *        only the schoolId boundary stops the cross-school case)
 *     3. DB re-fetch after cross-school call confirms record is UNCHANGED.
 *        For reset-credentials: password unchanged (cross-school credential
 *        reset cannot alter school-B's credentials).
 */

import { jest } from '@jest/globals';
import { Sequelize, DataTypes } from 'sequelize';

// ── In-memory SQLite User model ──────────────────────────────────────────────
// Defined synchronously here so it can be captured in unstable_mockModule below.
const sqlite = new Sequelize('sqlite::memory:', { logging: false });

const UserModel = sqlite.define(
  'User',
  {
    id:                { type: DataTypes.UUID,    defaultValue: DataTypes.UUIDV4, primaryKey: true },
    email:             { type: DataTypes.STRING,  allowNull: false, unique: true },
    password:          { type: DataTypes.STRING,  allowNull: false },
    firstName:         { type: DataTypes.STRING,  allowNull: false },
    lastName:          { type: DataTypes.STRING,  allowNull: false },
    role:              { type: DataTypes.STRING,  defaultValue: 'parent' },
    schoolId:          { type: DataTypes.STRING,  allowNull: true },
    status:            { type: DataTypes.STRING,  defaultValue: 'active' },
    mustChangePassword:{ type: DataTypes.BOOLEAN, defaultValue: false },
  },
  { tableName: 'users', timestamps: true },
);

// ── Mocks — must be registered before any controller import ─────────────────
// User → real SQLite model (WHERE clause executes for real).
// All other model imports → empty stubs (not used by lifecycle functions).
jest.unstable_mockModule('../../models/User.js',         () => ({ default: UserModel }));
jest.unstable_mockModule('../../models/Child.js',        () => ({ default: {} }));
jest.unstable_mockModule('../../models/Group.js',        () => ({ default: {} }));
jest.unstable_mockModule('../../models/School.js',       () => ({ default: {} }));
jest.unstable_mockModule('../../models/TherapyUsage.js', () => ({ default: {} }));
jest.unstable_mockModule('../../models/Activity.js',     () => ({ default: {} }));
jest.unstable_mockModule('../../models/Media.js',        () => ({ default: {} }));
jest.unstable_mockModule('../../models/Meal.js',         () => ({ default: {} }));
jest.unstable_mockModule('../../models/Progress.js',     () => ({ default: {} }));
jest.unstable_mockModule('../../models/TeacherRating.js',() => ({ default: {} }));
jest.unstable_mockModule('../../config/database.js',     () => ({ default: {} }));
jest.unstable_mockModule('../../config/storage.js',      () => ({ uploadFile: jest.fn(), deleteFile: jest.fn() }));

const mockLogAudit = jest.fn();
jest.unstable_mockModule('../../utils/auditLogger.js',   () => ({ logAudit: mockLogAudit }));
jest.unstable_mockModule('../../utils/logger.js',        () => ({
  default: { error: jest.fn(), info: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

// ── Import controllers AFTER mocks ──────────────────────────────────────────
const { activateParent, suspendParent, resetParentCredentials } =
  await import('../../controllers/receptionParentController.js');
const { activateTeacher, suspendTeacher, resetTeacherCredentials } =
  await import('../../controllers/receptionTeacherController.js');

// ── Constants ────────────────────────────────────────────────────────────────
const SCHOOL_A = 'aaaa0000-0000-0000-0000-000000000001';
const SCHOOL_B = 'bbbb0000-0000-0000-0000-000000000002';

// Recognisable sentinel value: proves the field was not touched by a failed call.
const SEED_PASSWORD_PARENT_A  = '$seed$PARENT_A_HASH_UNCHANGED';
const SEED_PASSWORD_PARENT_B  = '$seed$PARENT_B_HASH_UNCHANGED';
const SEED_PASSWORD_TEACHER_A = '$seed$TEACHER_A_HASH_UNCHANGED';
const SEED_PASSWORD_TEACHER_B = '$seed$TEACHER_B_HASH_UNCHANGED';

// ── Request / response helpers ───────────────────────────────────────────────
const mkRes = () => {
  const r = {};
  r.status = jest.fn().mockReturnValue(r);
  r.json   = jest.fn().mockReturnValue(r);
  return r;
};

const receptionAReq = (targetId) => ({
  user:   { id: 'rec-a-1', role: 'reception', schoolId: SCHOOL_A },
  params: { id: targetId },
});

// ── DB seed records (shared across all tests) ────────────────────────────────
let parentA, parentB, teacherA, teacherB;

beforeAll(async () => {
  await sqlite.sync({ force: true });

  parentA = await UserModel.create({
    email: 'parent-a@school-a.test', password: SEED_PASSWORD_PARENT_A,
    firstName: 'Parent', lastName: 'A', role: 'parent',
    schoolId: SCHOOL_A, status: 'suspended', mustChangePassword: false,
  });

  parentB = await UserModel.create({
    email: 'parent-b@school-b.test', password: SEED_PASSWORD_PARENT_B,
    firstName: 'Parent', lastName: 'B', role: 'parent',
    schoolId: SCHOOL_B, status: 'suspended', mustChangePassword: false,
  });

  teacherA = await UserModel.create({
    email: 'teacher-a@school-a.test', password: SEED_PASSWORD_TEACHER_A,
    firstName: 'Teacher', lastName: 'A', role: 'teacher',
    schoolId: SCHOOL_A, status: 'suspended', mustChangePassword: false,
  });

  teacherB = await UserModel.create({
    email: 'teacher-b@school-b.test', password: SEED_PASSWORD_TEACHER_B,
    firstName: 'Teacher', lastName: 'B', role: 'teacher',
    schoolId: SCHOOL_B, status: 'suspended', mustChangePassword: false,
  });
});

afterAll(async () => {
  await sqlite.close();
});

beforeEach(async () => {
  // Reset all records to a known state before each test.
  await parentA.update({ status: 'suspended', password: SEED_PASSWORD_PARENT_A,  mustChangePassword: false });
  await parentB.update({ status: 'suspended', password: SEED_PASSWORD_PARENT_B,  mustChangePassword: false });
  await teacherA.update({ status: 'suspended', password: SEED_PASSWORD_TEACHER_A, mustChangePassword: false });
  await teacherB.update({ status: 'suspended', password: SEED_PASSWORD_TEACHER_B, mustChangePassword: false });
  mockLogAudit.mockClear();
});

// ─────────────────────────────────────────────────────────────────────────────
// activateParent
// ─────────────────────────────────────────────────────────────────────────────
describe('[BEHAVIORAL-ISOLATION] activateParent', () => {
  it('cross-school: reception-A cannot activate school-B parent — 404, record unchanged in DB', async () => {
    const res = mkRes();
    // reception-A targets parentB (schoolId=SCHOOL_B). Real SQLite WHERE filters it out.
    await activateParent(receptionAReq(parentB.id), res);

    expect(res.status).toHaveBeenCalledWith(404);

    // Re-fetch from SQLite to confirm the record was not mutated.
    const fresh = await UserModel.findByPk(parentB.id);
    expect(fresh.status).toBe('suspended'); // unchanged
    expect(mockLogAudit).not.toHaveBeenCalled(); // audit-before-mutation never fired
  });

  it('same-school: reception-A activates school-A parent — 200, status flips to active in DB', async () => {
    const res = mkRes();
    await activateParent(receptionAReq(parentA.id), res);

    expect(res.status).not.toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true, data: expect.objectContaining({ status: 'active' }) }),
    );

    const fresh = await UserModel.findByPk(parentA.id);
    expect(fresh.status).toBe('active'); // changed
    expect(mockLogAudit).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'activate', entity: 'parents' }),
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// suspendParent
// ─────────────────────────────────────────────────────────────────────────────
describe('[BEHAVIORAL-ISOLATION] suspendParent', () => {
  beforeEach(async () => {
    // suspendParent needs targets to be 'active' (suspended → 409).
    await parentA.update({ status: 'active' });
    await parentB.update({ status: 'active' });
  });

  it('cross-school: reception-A cannot suspend school-B parent — 404, record unchanged in DB', async () => {
    const res = mkRes();
    await suspendParent(receptionAReq(parentB.id), res);

    expect(res.status).toHaveBeenCalledWith(404);

    const fresh = await UserModel.findByPk(parentB.id);
    expect(fresh.status).toBe('active'); // unchanged
    expect(mockLogAudit).not.toHaveBeenCalled();
  });

  it('same-school: reception-A suspends school-A parent — 200, status flips to suspended in DB', async () => {
    const res = mkRes();
    await suspendParent(receptionAReq(parentA.id), res);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true, data: expect.objectContaining({ status: 'suspended' }) }),
    );

    const fresh = await UserModel.findByPk(parentA.id);
    expect(fresh.status).toBe('suspended'); // changed
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// resetParentCredentials
// ─────────────────────────────────────────────────────────────────────────────
describe('[BEHAVIORAL-ISOLATION] resetParentCredentials', () => {
  it('cross-school: reception-A cannot reset school-B parent credentials — 404, password unchanged in DB', async () => {
    const res = mkRes();
    await resetParentCredentials(receptionAReq(parentB.id), res);

    expect(res.status).toHaveBeenCalledWith(404);

    // Critical: re-fetch and confirm the credential was not touched.
    const fresh = await UserModel.findByPk(parentB.id);
    expect(fresh.password).toBe(SEED_PASSWORD_PARENT_B);  // unchanged
    expect(fresh.mustChangePassword).toBe(false);           // unchanged
    expect(mockLogAudit).not.toHaveBeenCalled();
  });

  it('same-school: reception-A resets school-A parent credentials — 200, tempPassword returned, password changed in DB', async () => {
    const res = mkRes();
    await resetParentCredentials(receptionAReq(parentA.id), res);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: expect.objectContaining({ tempPassword: expect.stringMatching(/^[A-Za-z0-9]{12}$/) }),
      }),
    );

    const fresh = await UserModel.findByPk(parentA.id);
    expect(fresh.password).not.toBe(SEED_PASSWORD_PARENT_A); // changed
    expect(fresh.mustChangePassword).toBe(true);               // set
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// activateTeacher
// ─────────────────────────────────────────────────────────────────────────────
describe('[BEHAVIORAL-ISOLATION] activateTeacher', () => {
  it('cross-school: reception-A cannot activate school-B teacher — 404, record unchanged in DB', async () => {
    const res = mkRes();
    await activateTeacher(receptionAReq(teacherB.id), res);

    expect(res.status).toHaveBeenCalledWith(404);

    const fresh = await UserModel.findByPk(teacherB.id);
    expect(fresh.status).toBe('suspended'); // unchanged
    expect(mockLogAudit).not.toHaveBeenCalled();
  });

  it('same-school: reception-A activates school-A teacher — 200, status flips to active in DB', async () => {
    const res = mkRes();
    await activateTeacher(receptionAReq(teacherA.id), res);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true, data: expect.objectContaining({ status: 'active' }) }),
    );

    const fresh = await UserModel.findByPk(teacherA.id);
    expect(fresh.status).toBe('active');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// suspendTeacher
// ─────────────────────────────────────────────────────────────────────────────
describe('[BEHAVIORAL-ISOLATION] suspendTeacher', () => {
  beforeEach(async () => {
    await teacherA.update({ status: 'active' });
    await teacherB.update({ status: 'active' });
  });

  it('cross-school: reception-A cannot suspend school-B teacher — 404, record unchanged in DB', async () => {
    const res = mkRes();
    await suspendTeacher(receptionAReq(teacherB.id), res);

    expect(res.status).toHaveBeenCalledWith(404);

    const fresh = await UserModel.findByPk(teacherB.id);
    expect(fresh.status).toBe('active'); // unchanged
    expect(mockLogAudit).not.toHaveBeenCalled();
  });

  it('same-school: reception-A suspends school-A teacher — 200, status flips in DB', async () => {
    const res = mkRes();
    await suspendTeacher(receptionAReq(teacherA.id), res);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true, data: expect.objectContaining({ status: 'suspended' }) }),
    );

    const fresh = await UserModel.findByPk(teacherA.id);
    expect(fresh.status).toBe('suspended');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// resetTeacherCredentials
// ─────────────────────────────────────────────────────────────────────────────
describe('[BEHAVIORAL-ISOLATION] resetTeacherCredentials', () => {
  it('cross-school: reception-A cannot reset school-B teacher credentials — 404, password unchanged in DB', async () => {
    const res = mkRes();
    await resetTeacherCredentials(receptionAReq(teacherB.id), res);

    expect(res.status).toHaveBeenCalledWith(404);

    const fresh = await UserModel.findByPk(teacherB.id);
    expect(fresh.password).toBe(SEED_PASSWORD_TEACHER_B);  // unchanged
    expect(fresh.mustChangePassword).toBe(false);            // unchanged
    expect(mockLogAudit).not.toHaveBeenCalled();
  });

  it('same-school: reception-A resets school-A teacher credentials — 200, tempPassword returned, password changed in DB', async () => {
    const res = mkRes();
    await resetTeacherCredentials(receptionAReq(teacherA.id), res);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: expect.objectContaining({ tempPassword: expect.stringMatching(/^[A-Za-z0-9]{12}$/) }),
      }),
    );

    const fresh = await UserModel.findByPk(teacherA.id);
    expect(fresh.password).not.toBe(SEED_PASSWORD_TEACHER_A); // changed
    expect(fresh.mustChangePassword).toBe(true);
  });
});
