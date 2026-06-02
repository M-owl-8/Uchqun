/**
 * Reception delegated lifecycle — activate/suspend/reset-credentials for parents and teachers
 *
 * Security model:
 *  - All mutations are school-scoped: findOne includes `schoolId: req.user.schoolId`
 *  - A parent/teacher from another school (or with null schoolId) returns 404 — no information leak
 *  - Defense-in-depth role check at controller top: non-reception role → 403
 *  - Credential-restore never exposes or allows the caller to set the real password;
 *    it only returns a system-generated temp password + sets mustChangePassword = true
 *
 * Revert-test convention: comment documents pre-fix behavior and why 404 is correct.
 */
import { jest } from '@jest/globals';

const SCHOOL_A = 'aaaa0000-0000-0000-0000-000000000001';
const SCHOOL_B = 'bbbb0000-0000-0000-0000-000000000002';
const RECEPTION_ID = 'rrrr0000-0000-0000-0000-000000000001';

const mockUserFindOne = jest.fn();
const mockLogAudit = jest.fn();

jest.unstable_mockModule('../../models/User.js', () => ({
  default: {
    findOne: mockUserFindOne,
    findAll: jest.fn(),
    findByPk: jest.fn(),
    create: jest.fn(),
  },
}));

jest.unstable_mockModule('../../models/Child.js', () => ({
  default: { create: jest.fn(), destroy: jest.fn(), findAll: jest.fn() },
}));
jest.unstable_mockModule('../../models/Group.js', () => ({ default: { findByPk: jest.fn() } }));
jest.unstable_mockModule('../../models/School.js', () => ({ default: { findOne: jest.fn() } }));
jest.unstable_mockModule('../../models/TherapyUsage.js', () => ({ default: { destroy: jest.fn() } }));
jest.unstable_mockModule('../../models/Activity.js', () => ({ default: { destroy: jest.fn() } }));
jest.unstable_mockModule('../../models/Media.js', () => ({ default: { destroy: jest.fn() } }));
jest.unstable_mockModule('../../models/Meal.js', () => ({ default: { destroy: jest.fn() } }));
jest.unstable_mockModule('../../models/Progress.js', () => ({ default: { destroy: jest.fn() } }));
jest.unstable_mockModule('../../models/TeacherRating.js', () => ({
  default: { findOne: jest.fn(), findAll: jest.fn() },
}));

jest.unstable_mockModule('../../utils/logger.js', () => ({
  default: { error: jest.fn(), info: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

jest.unstable_mockModule('../../utils/auditLogger.js', () => ({
  logAudit: mockLogAudit,
}));

jest.unstable_mockModule('../../config/storage.js', () => ({
  uploadFile: jest.fn(),
  deleteFile: jest.fn(),
}));

jest.unstable_mockModule('../../config/database.js', () => ({
  default: { transaction: jest.fn(async (fn) => fn({})) },
}));
jest.unstable_mockModule('../../utils/accountDomain.js', () => ({
  resolveEmailDomain: jest.fn().mockResolvedValue('test.uz'),
  isValidLocalPart: jest.fn().mockReturnValue(true),
  REPUBLIC_DOMAIN: 'davlat.uz',
}));

const {
  activateParent, suspendParent, resetParentCredentials,
} = await import('../../controllers/receptionParentController.js');

const {
  activateTeacher, suspendTeacher, resetTeacherCredentials,
} = await import('../../controllers/receptionTeacherController.js');

const mkRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

const mkReceptionReq = (paramId, extra = {}) => ({
  user: { id: RECEPTION_ID, role: 'reception', schoolId: SCHOOL_A },
  params: { id: paramId },
  ...extra,
});

beforeEach(() => jest.clearAllMocks());

// ---------------------------------------------------------------------------
// activateParent
// ---------------------------------------------------------------------------
describe('activateParent', () => {
  it('[REVERT-TEST] cross-school parent (null schoolId) → 404, no information leak', async () => {
    // A parent with null schoolId must not be activatable by any school's reception.
    // The school-scoped findOne({ where: { ..., schoolId: SCHOOL_A } }) returns null
    // because null !== SCHOOL_A. This closes a potential IDOR where a receptionist
    // could activate a parent that has no school assignment.
    mockUserFindOne.mockResolvedValue(null);
    const res = mkRes();
    await activateParent(mkReceptionReq('p1'), res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, error: expect.objectContaining({ code: 'PARENT_NOT_FOUND' }) }),
    );
  });

  it('[REVERT-TEST] parent from a different school → 404', async () => {
    // The findOne schoolId scope prevents cross-school activation.
    // Pre-scope: findOne without schoolId filter → parent from SCHOOL_B returned → activation succeeds (IDOR)
    // Post-scope: findOne({ where: { schoolId: SCHOOL_A } }) → null for SCHOOL_B parent → 404
    mockUserFindOne.mockResolvedValue(null); // SCHOOL_B parent not found under SCHOOL_A scope
    const res = mkRes();
    await activateParent(mkReceptionReq('p-school-b'), res);
    expect(res.status).toHaveBeenCalledWith(404);
    // Confirm the findOne call included the school scope
    expect(mockUserFindOne).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ schoolId: SCHOOL_A }) }),
    );
  });

  it('non-reception role → 403 (defense-in-depth)', async () => {
    const req = { user: { id: 'a1', role: 'admin', schoolId: SCHOOL_A }, params: { id: 'p1' } };
    const res = mkRes();
    await activateParent(req, res);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(mockUserFindOne).not.toHaveBeenCalled();
  });

  it('already active parent → 409', async () => {
    mockUserFindOne.mockResolvedValue({ id: 'p1', status: 'active', update: jest.fn() });
    const res = mkRes();
    await activateParent(mkReceptionReq('p1'), res);
    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.objectContaining({ code: 'PARENT_ALREADY_ACTIVE' }) }),
    );
  });

  it('success: sets status to active, logs audit, returns new status', async () => {
    const parent = { id: 'p1', status: 'suspended', update: jest.fn().mockResolvedValue(true) };
    parent.update.mockImplementation(async (data) => { Object.assign(parent, data); });
    mockUserFindOne.mockResolvedValue(parent);
    const res = mkRes();
    await activateParent(mkReceptionReq('p1'), res);
    expect(parent.update).toHaveBeenCalledWith({ status: 'active' });
    expect(mockLogAudit).toHaveBeenCalledWith(expect.objectContaining({ action: 'activate', entity: 'parents' }));
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });

  it('DB error → 500', async () => {
    mockUserFindOne.mockRejectedValue(new Error('db fail'));
    const res = mkRes();
    await activateParent(mkReceptionReq('p1'), res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

// ---------------------------------------------------------------------------
// suspendParent
// ---------------------------------------------------------------------------
describe('suspendParent', () => {
  it('[REVERT-TEST] cross-school parent (null schoolId) → 404', async () => {
    mockUserFindOne.mockResolvedValue(null);
    const res = mkRes();
    await suspendParent(mkReceptionReq('p1'), res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('non-reception role → 403', async () => {
    const req = { user: { id: 'a1', role: 'admin', schoolId: SCHOOL_A }, params: { id: 'p1' } };
    const res = mkRes();
    await suspendParent(req, res);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(mockUserFindOne).not.toHaveBeenCalled();
  });

  it('already suspended → 409', async () => {
    mockUserFindOne.mockResolvedValue({ id: 'p1', status: 'suspended', update: jest.fn() });
    const res = mkRes();
    await suspendParent(mkReceptionReq('p1'), res);
    expect(res.status).toHaveBeenCalledWith(409);
  });

  it('success: sets status to suspended, logs audit', async () => {
    const parent = { id: 'p1', status: 'active', update: jest.fn().mockImplementation(async (d) => Object.assign(parent, d)) };
    mockUserFindOne.mockResolvedValue(parent);
    const res = mkRes();
    await suspendParent(mkReceptionReq('p1'), res);
    expect(parent.update).toHaveBeenCalledWith({ status: 'suspended' });
    expect(mockLogAudit).toHaveBeenCalledWith(expect.objectContaining({ action: 'suspend', entity: 'parents' }));
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });

  it('DB error → 500', async () => {
    mockUserFindOne.mockRejectedValue(new Error('db fail'));
    const res = mkRes();
    await suspendParent(mkReceptionReq('p1'), res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

// ---------------------------------------------------------------------------
// resetParentCredentials
// ---------------------------------------------------------------------------
describe('resetParentCredentials', () => {
  it('[REVERT-TEST] cross-school parent (null or different schoolId) → 404', async () => {
    // Reception at SCHOOL_A cannot reset credentials of a parent from SCHOOL_B.
    // findOne({ where: { schoolId: SCHOOL_A } }) returns null for foreign parent → 404.
    mockUserFindOne.mockResolvedValue(null);
    const res = mkRes();
    await resetParentCredentials(mkReceptionReq('p-foreign'), res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(mockUserFindOne).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ schoolId: SCHOOL_A }) }),
    );
  });

  it('non-reception role → 403 (defense-in-depth)', async () => {
    const req = { user: { id: 'a1', role: 'admin', schoolId: SCHOOL_A }, params: { id: 'p1' } };
    const res = mkRes();
    await resetParentCredentials(req, res);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(mockUserFindOne).not.toHaveBeenCalled();
  });

  it('returns tempPassword; sets mustChangePassword = true; NEVER returns original hash', async () => {
    const ORIGINAL_HASH = '$2b$10$ORIGINAL_HASHED_PASSWORD_NEVER_EXPOSED';
    const parent = {
      id: 'p1', role: 'parent', schoolId: SCHOOL_A,
      password: ORIGINAL_HASH, mustChangePassword: false,
      save: jest.fn().mockResolvedValue(undefined),
    };
    mockUserFindOne.mockResolvedValue(parent);
    const res = mkRes();

    await resetParentCredentials(mkReceptionReq('p1'), res);

    // Response must contain tempPassword
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true, data: expect.objectContaining({ tempPassword: expect.any(String) }) }),
    );
    // mustChangePassword was set to true before save
    expect(parent.mustChangePassword).toBe(true);
    // The password field was replaced (the hook will hash it)
    expect(parent.password).not.toBe(ORIGINAL_HASH);
    // The original hash is NOT in the response
    const responseBody = JSON.stringify(res.json.mock.calls[0][0]);
    expect(responseBody).not.toContain(ORIGINAL_HASH);
    // temp password is a 12-char alphanumeric string
    expect(parent.password).toMatch(/^[A-Za-z0-9]{12}$/);
    // save was called to persist changes
    expect(parent.save).toHaveBeenCalled();
    // audit was logged
    expect(mockLogAudit).toHaveBeenCalledWith(expect.objectContaining({ action: 'reset_credentials', entity: 'parents' }));
  });

  it('DB error → 500', async () => {
    mockUserFindOne.mockRejectedValue(new Error('db fail'));
    const res = mkRes();
    await resetParentCredentials(mkReceptionReq('p1'), res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

// ---------------------------------------------------------------------------
// activateTeacher
// ---------------------------------------------------------------------------
describe('activateTeacher', () => {
  it('[REVERT-TEST] cross-school teacher (null schoolId) → 404', async () => {
    mockUserFindOne.mockResolvedValue(null);
    const res = mkRes();
    await activateTeacher(mkReceptionReq('t1'), res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(mockUserFindOne).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ schoolId: SCHOOL_A, role: 'teacher' }) }),
    );
  });

  it('non-reception role → 403', async () => {
    const req = { user: { id: 'a1', role: 'admin', schoolId: SCHOOL_A }, params: { id: 't1' } };
    const res = mkRes();
    await activateTeacher(req, res);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(mockUserFindOne).not.toHaveBeenCalled();
  });

  it('already active → 409', async () => {
    mockUserFindOne.mockResolvedValue({ id: 't1', status: 'active', update: jest.fn() });
    const res = mkRes();
    await activateTeacher(mkReceptionReq('t1'), res);
    expect(res.status).toHaveBeenCalledWith(409);
  });

  it('success: sets status to active, logs audit', async () => {
    const teacher = {
      id: 't1', status: 'suspended',
      update: jest.fn().mockImplementation(async (d) => Object.assign(teacher, d)),
    };
    mockUserFindOne.mockResolvedValue(teacher);
    const res = mkRes();
    await activateTeacher(mkReceptionReq('t1'), res);
    expect(teacher.update).toHaveBeenCalledWith({ status: 'active' });
    expect(mockLogAudit).toHaveBeenCalledWith(expect.objectContaining({ action: 'activate', entity: 'teachers' }));
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });

  it('DB error → 500', async () => {
    mockUserFindOne.mockRejectedValue(new Error('db fail'));
    const res = mkRes();
    await activateTeacher(mkReceptionReq('t1'), res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

// ---------------------------------------------------------------------------
// suspendTeacher
// ---------------------------------------------------------------------------
describe('suspendTeacher', () => {
  it('[REVERT-TEST] cross-school teacher → 404', async () => {
    mockUserFindOne.mockResolvedValue(null);
    const res = mkRes();
    await suspendTeacher(mkReceptionReq('t1'), res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('non-reception role → 403', async () => {
    const req = { user: { id: 'a1', role: 'admin', schoolId: SCHOOL_A }, params: { id: 't1' } };
    const res = mkRes();
    await suspendTeacher(req, res);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(mockUserFindOne).not.toHaveBeenCalled();
  });

  it('already suspended → 409', async () => {
    mockUserFindOne.mockResolvedValue({ id: 't1', status: 'suspended', update: jest.fn() });
    const res = mkRes();
    await suspendTeacher(mkReceptionReq('t1'), res);
    expect(res.status).toHaveBeenCalledWith(409);
  });

  it('success: sets status to suspended, logs audit', async () => {
    const teacher = {
      id: 't1', status: 'active',
      update: jest.fn().mockImplementation(async (d) => Object.assign(teacher, d)),
    };
    mockUserFindOne.mockResolvedValue(teacher);
    const res = mkRes();
    await suspendTeacher(mkReceptionReq('t1'), res);
    expect(teacher.update).toHaveBeenCalledWith({ status: 'suspended' });
    expect(mockLogAudit).toHaveBeenCalledWith(expect.objectContaining({ action: 'suspend', entity: 'teachers' }));
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });

  it('DB error → 500', async () => {
    mockUserFindOne.mockRejectedValue(new Error('db fail'));
    const res = mkRes();
    await suspendTeacher(mkReceptionReq('t1'), res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

// ---------------------------------------------------------------------------
// resetTeacherCredentials
// ---------------------------------------------------------------------------
describe('resetTeacherCredentials', () => {
  it('[REVERT-TEST] cross-school teacher → 404; schoolId scope enforced', async () => {
    mockUserFindOne.mockResolvedValue(null);
    const res = mkRes();
    await resetTeacherCredentials(mkReceptionReq('t-foreign'), res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(mockUserFindOne).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ schoolId: SCHOOL_A, role: 'teacher' }) }),
    );
  });

  it('non-reception role → 403', async () => {
    const req = { user: { id: 'a1', role: 'admin', schoolId: SCHOOL_A }, params: { id: 't1' } };
    const res = mkRes();
    await resetTeacherCredentials(req, res);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(mockUserFindOne).not.toHaveBeenCalled();
  });

  it('returns tempPassword; sets mustChangePassword = true; NEVER returns original hash', async () => {
    const ORIGINAL_HASH = '$2b$10$TEACHER_ORIGINAL_HASH_NEVER_RETURNED';
    const teacher = {
      id: 't1', role: 'teacher', schoolId: SCHOOL_A,
      password: ORIGINAL_HASH, mustChangePassword: false,
      save: jest.fn().mockResolvedValue(undefined),
    };
    mockUserFindOne.mockResolvedValue(teacher);
    const res = mkRes();

    await resetTeacherCredentials(mkReceptionReq('t1'), res);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true, data: expect.objectContaining({ tempPassword: expect.any(String) }) }),
    );
    expect(teacher.mustChangePassword).toBe(true);
    expect(teacher.password).not.toBe(ORIGINAL_HASH);
    expect(teacher.password).toMatch(/^[A-Za-z0-9]{12}$/);
    const responseBody = JSON.stringify(res.json.mock.calls[0][0]);
    expect(responseBody).not.toContain(ORIGINAL_HASH);
    expect(teacher.save).toHaveBeenCalled();
    expect(mockLogAudit).toHaveBeenCalledWith(expect.objectContaining({ action: 'reset_credentials', entity: 'teachers' }));
  });

  it('DB error → 500', async () => {
    mockUserFindOne.mockRejectedValue(new Error('db fail'));
    const res = mkRes();
    await resetTeacherCredentials(mkReceptionReq('t1'), res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});
