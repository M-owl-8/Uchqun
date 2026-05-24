/**
 * Teacher assignment scope tests — U-3 (RE-14)
 *
 * Max's decision: per-school (any reception at the same school can assign any school teacher).
 * Was: per-reception (only teachers created by the same reception could be assigned).
 *
 * Revert-test:
 *   [REVERT-TEST RE-14] teacher at same school created by different reception → allowed (post-fix)
 *   Previously this would have failed because the old where-clause used `createdBy: req.user.id`.
 */
import { jest } from '@jest/globals';

const SCHOOL_A = 'aaaa0000-0000-0000-0000-000000000001';
const PARENT_ID = 'pppp0000-0000-0000-0000-000000000001';
const TEACHER_A = 'tttt0000-0000-0000-0000-000000000001';
const RECEPTION_1 = 'r1r10000-0000-0000-0000-000000000001';
const RECEPTION_2 = 'r2r20000-0000-0000-0000-000000000002';

const mockUserFindOne = jest.fn();
const mockUserCreate = jest.fn();
const mockChildCreate = jest.fn();
const mockGroupFindByPk = jest.fn();
const mockSequelizeTransaction = jest.fn();

jest.unstable_mockModule('../../models/User.js', () => ({
  default: {
    findOne: mockUserFindOne,
    findByPk: jest.fn(),
    create: mockUserCreate,
  },
}));

jest.unstable_mockModule('../../models/Child.js', () => ({
  default: { create: mockChildCreate },
}));

jest.unstable_mockModule('../../models/Group.js', () => ({
  default: { findByPk: mockGroupFindByPk },
}));

jest.unstable_mockModule('../../models/School.js', () => ({
  default: { findOne: jest.fn() },
}));

jest.unstable_mockModule('../../models/TherapyUsage.js', () => ({ default: { destroy: jest.fn() } }));
jest.unstable_mockModule('../../models/Activity.js', () => ({ default: { destroy: jest.fn() } }));
jest.unstable_mockModule('../../models/Media.js', () => ({ default: { destroy: jest.fn() } }));
jest.unstable_mockModule('../../models/Meal.js', () => ({ default: { destroy: jest.fn() } }));
jest.unstable_mockModule('../../models/Progress.js', () => ({ default: { destroy: jest.fn() } }));

jest.unstable_mockModule('../../utils/logger.js', () => ({
  default: { error: jest.fn(), info: jest.fn(), warn: jest.fn() },
}));

jest.unstable_mockModule('../../utils/auditLogger.js', () => ({
  logAudit: jest.fn(),
}));

jest.unstable_mockModule('../../config/storage.js', () => ({
  uploadFile: jest.fn(),
  deleteFile: jest.fn(),
}));

jest.unstable_mockModule('../../config/database.js', () => ({
  default: {
    transaction: mockSequelizeTransaction.mockImplementation(async (fn) => fn({})),
  },
}));

const { createParent, updateParent } = await import('../../controllers/receptionParentController.js');

const mkRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

const makeParent = () => ({
  id: PARENT_ID,
  email: 'parent@test.com',
  schoolId: SCHOOL_A,
  teacherId: null,
  update: jest.fn().mockResolvedValue(true),
  toJSON: () => ({ id: PARENT_ID }),
});

beforeEach(() => jest.clearAllMocks());

describe('createParent teacher assignment (RE-14)', () => {
  it('[REVERT-TEST RE-14] teacher created by DIFFERENT reception (same school) is now allowed', async () => {
    // Teacher T1 was created by reception R1. Reception R2 tries to assign T1 to a new parent.
    // Pre-fix: `createdBy: req.user.id (R2)` → teacher T1 (createdBy R1) not found → 400
    // Post-fix: `schoolId: req.user.schoolId (SCHOOL_A)` → teacher T1 at SCHOOL_A found → 201

    // First findOne call (email uniqueness check) returns null (no existing user)
    // Second findOne call (teacher validation) returns the teacher at SCHOOL_A
    mockUserFindOne
      .mockResolvedValueOnce(null) // email check
      .mockResolvedValueOnce({ id: TEACHER_A, role: 'teacher', schoolId: SCHOOL_A, createdBy: RECEPTION_1 }); // teacher found by schoolId

    const createdParent = { id: PARENT_ID, toJSON: () => ({ id: PARENT_ID }) };
    mockUserCreate.mockResolvedValue(createdParent);

    const req = {
      user: { id: RECEPTION_2, role: 'reception', schoolId: SCHOOL_A },
      body: {
        email: 'parent@test.com',
        password: 'Pass@123',
        firstName: 'Ali',
        lastName: 'Valiyev',
        teacherId: TEACHER_A,
      },
      files: null,
    };
    const res = mkRes();

    await createParent(req, res);

    expect(res.status).toHaveBeenCalledWith(201);
    // Teacher lookup must use schoolId, not createdBy
    const teacherCall = mockUserFindOne.mock.calls.find(c => c[0]?.where?.schoolId === SCHOOL_A);
    expect(teacherCall).toBeDefined();
    const callWhere = teacherCall[0].where;
    expect(callWhere.createdBy).toBeUndefined();
    expect(callWhere.schoolId).toBe(SCHOOL_A);
  });
});

describe('updateParent teacher assignment (RE-14)', () => {
  it('updateParent: teacher at same school (created by different reception) is allowed', async () => {
    mockUserFindOne
      .mockResolvedValueOnce(makeParent()) // parent lookup
      .mockResolvedValueOnce({ id: TEACHER_A, role: 'teacher', schoolId: SCHOOL_A, createdBy: RECEPTION_1 }); // teacher

    const req = {
      user: { id: RECEPTION_2, role: 'reception', schoolId: SCHOOL_A },
      params: { id: PARENT_ID },
      body: { teacherId: TEACHER_A },
    };
    const res = mkRes();

    await updateParent(req, res);

    expect(res.status).not.toHaveBeenCalledWith(400);
    const teacherCall = mockUserFindOne.mock.calls.find(c => c[0]?.where?.schoolId === SCHOOL_A && c[0]?.where?.role === 'teacher');
    expect(teacherCall).toBeDefined();
    expect(teacherCall[0].where.createdBy).toBeUndefined();
  });
});
