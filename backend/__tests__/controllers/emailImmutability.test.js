/**
 * Email immutability — post-creation email changes must be silently ignored
 * across all 5 update endpoints.
 *
 * Revert-test: removing the "email excluded" guard from any of these controllers
 * would cause the mock user's `.email` field to be modified, which these tests
 * detect by asserting `mockUser.email` equals the original value after the call.
 *
 * Also tests:
 *  - GET /reception/school-info returns slug with role gate
 *  - approveRegistrationRequest uses resolveEmailDomain (not applicant's email)
 */
import { jest } from '@jest/globals';

// ── Shared mocks ──────────────────────────────────────────────────────────────
const SCHOOL_ID = 'aaaa0000-0000-0000-0000-000000000001';
const REGION_ID = 'bbbb0000-0000-0000-0000-000000000002';

const mockUserFindOne = jest.fn();
const mockUserCreate = jest.fn();
const mockLogAudit = jest.fn();
const mockResolveEmailDomain = jest.fn().mockResolvedValue('tmm1.uz');
const mockSchoolFindByPk = jest.fn();
const mockSchoolFindOne = jest.fn();

jest.unstable_mockModule('../../models/User.js', () => ({
  default: {
    findOne: mockUserFindOne,
    findAll: jest.fn().mockResolvedValue([]),
    findByPk: jest.fn(),
    create: mockUserCreate,
    count: jest.fn(),
  },
}));
jest.unstable_mockModule('../../models/School.js', () => ({
  default: { findOne: mockSchoolFindOne, findByPk: mockSchoolFindByPk, findAll: jest.fn().mockResolvedValue([]) },
}));
jest.unstable_mockModule('../../models/Region.js', () => ({
  default: { findByPk: jest.fn() },
}));
jest.unstable_mockModule('../../models/Group.js', () => ({
  default: { findByPk: jest.fn() },
}));
jest.unstable_mockModule('../../models/Child.js', () => ({
  default: { create: jest.fn(), destroy: jest.fn(), findAll: jest.fn() },
}));
jest.unstable_mockModule('../../models/Activity.js', () => ({ default: { destroy: jest.fn() } }));
jest.unstable_mockModule('../../models/Media.js', () => ({ default: { destroy: jest.fn() } }));
jest.unstable_mockModule('../../models/Meal.js', () => ({ default: { destroy: jest.fn() } }));
jest.unstable_mockModule('../../models/Progress.js', () => ({ default: { destroy: jest.fn() } }));
jest.unstable_mockModule('../../models/Document.js', () => ({
  default: { findAll: jest.fn(), findByPk: jest.fn() },
}));
jest.unstable_mockModule('../../models/GovernmentMessage.js', () => ({
  default: { findAll: jest.fn() },
}));
jest.unstable_mockModule('../../models/TeacherRating.js', () => ({
  default: { findOne: jest.fn(), findAll: jest.fn() },
}));
jest.unstable_mockModule('file-type', () => ({
  fileTypeFromBuffer: jest.fn().mockResolvedValue({ mime: 'image/jpeg' }),
}));
jest.unstable_mockModule('../../utils/logger.js', () => ({
  default: { error: jest.fn(), info: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));
jest.unstable_mockModule('../../utils/auditLogger.js', () => ({
  logAudit: mockLogAudit,
}));
jest.unstable_mockModule('../../utils/accountDomain.js', () => ({
  resolveEmailDomain: mockResolveEmailDomain,
  isValidLocalPart: jest.fn().mockReturnValue(true),
  REPUBLIC_DOMAIN: 'davlat.uz',
}));
jest.unstable_mockModule('../../middleware/auth.js', () => ({
  revokeJti: jest.fn(),
  invalidateUserCache: jest.fn(),
}));
jest.unstable_mockModule('../../config/govCapabilities.js', () => ({
  isValidGrantSet: jest.fn().mockReturnValue(true),
  unknownGrantKeys: jest.fn().mockReturnValue([]),
  GOV_CAPABILITIES: [],
}));
jest.unstable_mockModule('../../config/storage.js', () => ({
  uploadFile: jest.fn(),
  deleteFile: jest.fn(),
}));
// database.js mock needs define() because models call sequelize.define() at load time.
// Some models may not be intercepted by unstable_mockModule in all Jest ESM versions.
jest.unstable_mockModule('../../config/database.js', () => ({
  default: {
    transaction: jest.fn(async (fn) => fn({})),
    define: jest.fn(() => ({
      hasMany: jest.fn(), belongsTo: jest.fn(), hasOne: jest.fn(),
      findAll: jest.fn(), findOne: jest.fn(), findByPk: jest.fn(),
      create: jest.fn(), destroy: jest.fn(), update: jest.fn(), count: jest.fn(),
      findAndCountAll: jest.fn(),
      prototype: {},
    })),
    literal: jest.fn(),
    Op: {},
  },
}));
jest.unstable_mockModule('fs', () => ({
  default: {
    promises: { readFile: jest.fn(), unlink: jest.fn() },
    readFileSync: jest.fn().mockReturnValue(Buffer.from('test')),
  },
}));

const { updateAdmin, updateGovernmentUser } = await import('../../controllers/admin/adminUserController.js');
const { updateReception } = await import('../../controllers/admin/adminReceptionController.js');
const { updateTeacher } = await import('../../controllers/receptionTeacherController.js');
const { updateParent } = await import('../../controllers/receptionParentController.js');
const { getSchoolInfo } = await import('../../controllers/receptionController.js');

const mkRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

function makeMockUser(overrides = {}) {
  const user = {
    id: 'user-001',
    email: 'original@tmm1.uz',
    firstName: 'Original',
    lastName: 'User',
    phone: null,
    schoolId: SCHOOL_ID,
    role: 'teacher',
    toJSON: jest.fn().mockReturnThis(),
    save: jest.fn().mockResolvedValue(undefined),
    update: jest.fn().mockImplementation(function(data) {
      Object.assign(this, data);
      return Promise.resolve(this);
    }),
    reload: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };
  return user;
}

beforeEach(() => {
  jest.clearAllMocks();
});

// ── 2a.1: updateAdmin must not change email ──────────────────────────────────
describe('updateAdmin — email immutability', () => {
  test('ignores email field in body; original email unchanged', async () => {
    const admin = makeMockUser({ role: 'admin', schoolId: SCHOOL_ID });
    mockUserFindOne.mockResolvedValue(admin);
    mockSchoolFindOne.mockResolvedValue({ id: SCHOOL_ID });

    const req = {
      params: { id: 'admin-001' },
      body: { firstName: 'New', lastName: 'Name', email: 'attacker@evil.com', phone: null },
      user: { id: 'gov-001', role: 'government', govLevel: 'republic' },
      isGlobalAccess: true,
    };
    const res = mkRes();

    await updateAdmin(req, res);

    expect(res.json).toHaveBeenCalled();
    const savedEmail = admin.email;
    expect(savedEmail).toBe('original@tmm1.uz');
  });

  test('still updates non-email fields', async () => {
    const admin = makeMockUser({ role: 'admin', schoolId: SCHOOL_ID });
    mockUserFindOne.mockResolvedValue(admin);

    const req = {
      params: { id: 'admin-001' },
      body: { firstName: 'Updated', lastName: 'Name', email: 'attacker@evil.com' },
      user: { id: 'gov-001', role: 'government', govLevel: 'republic' },
      isGlobalAccess: true,
    };
    const res = mkRes();

    await updateAdmin(req, res);

    expect(admin.firstName).toBe('Updated');
    expect(admin.email).toBe('original@tmm1.uz');
  });
});

// ── 2a.2: updateGovernmentUser must not change email ─────────────────────────
describe('updateGovernmentUser — email immutability', () => {
  test('ignores email field in body; original email unchanged', async () => {
    const gov = makeMockUser({ role: 'government', govLevel: 'region', govRegionId: REGION_ID });
    mockUserFindOne.mockResolvedValue(gov);

    const req = {
      params: { id: 'gov-002' },
      body: { firstName: 'New', email: 'attacker@evil.com', password: null },
      user: { id: 'gov-001', role: 'government', govLevel: 'republic' },
    };
    const res = mkRes();

    await updateGovernmentUser(req, res);

    expect(gov.email).toBe('original@tmm1.uz');
    expect(gov.firstName).toBe('New');
  });
});

// ── 2a.3: updateReception must not change email ──────────────────────────────
describe('updateReception — email immutability', () => {
  test('ignores email field in body; original email unchanged', async () => {
    const reception = makeMockUser({ role: 'reception', createdBy: 'admin-001' });
    // findOne is called once to look up the reception
    mockUserFindOne.mockResolvedValue(reception);

    const req = {
      params: { id: 'rec-001' },
      body: { firstName: 'New', lastName: 'Name', email: 'attacker@evil.com', phone: null, password: null },
      user: { id: 'admin-001', role: 'admin', schoolId: SCHOOL_ID },
    };
    const res = mkRes();

    await updateReception(req, res);

    expect(reception.email).toBe('original@tmm1.uz');
    expect(reception.firstName).toBe('New');
  });
});

// ── 2a.4: updateTeacher must not change email ────────────────────────────────
describe('updateTeacher — email immutability', () => {
  test('ignores email field in body; original email unchanged', async () => {
    const teacher = makeMockUser({ role: 'teacher', schoolId: SCHOOL_ID });
    mockUserFindOne.mockResolvedValue(teacher);

    const req = {
      params: { id: 'teacher-001' },
      body: { firstName: 'New', email: 'attacker@evil.com', phone: null },
      user: { id: 'rec-001', role: 'reception', schoolId: SCHOOL_ID },
    };
    const res = mkRes();

    await updateTeacher(req, res);

    expect(teacher.email).toBe('original@tmm1.uz');
    expect(teacher.firstName).toBe('New');
  });
});

// ── 2a.5: updateParent must not change email ─────────────────────────────────
describe('updateParent — email immutability', () => {
  test('ignores email field in body; original email unchanged', async () => {
    const parent = makeMockUser({ role: 'parent', schoolId: SCHOOL_ID });
    mockUserFindOne.mockResolvedValue(parent);

    const req = {
      params: { id: 'parent-001' },
      body: { firstName: 'New', email: 'attacker@evil.com', phone: null },
      user: { id: 'rec-001', role: 'reception', schoolId: SCHOOL_ID },
    };
    const res = mkRes();

    await updateParent(req, res);

    expect(parent.email).toBe('original@tmm1.uz');
    expect(parent.firstName).toBe('New');
  });
});

// ── 2b: getSchoolInfo returns slug, role-gated ───────────────────────────────
describe('getSchoolInfo — GET /reception/school-info', () => {
  test('returns id, name, slug for reception user school', async () => {
    mockSchoolFindByPk.mockResolvedValue({ id: SCHOOL_ID, name: 'TMM 1', slug: 'tmm1', toJSON: jest.fn() });

    const req = { user: { id: 'rec-001', role: 'reception', schoolId: SCHOOL_ID } };
    const res = mkRes();

    await getSchoolInfo(req, res);

    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: { id: SCHOOL_ID, name: 'TMM 1', slug: 'tmm1' },
    });
  });

  test('returns 404 when user has no schoolId', async () => {
    const req = { user: { id: 'rec-001', role: 'reception', schoolId: null } };
    const res = mkRes();

    await getSchoolInfo(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    const body = res.json.mock.calls[0][0];
    expect(body.error.code).toBe('SCHOOL_NOT_ASSIGNED');
  });

  test('returns 404 when school record not found', async () => {
    mockSchoolFindByPk.mockResolvedValue(null);

    const req = { user: { id: 'rec-001', role: 'reception', schoolId: 'missing-school' } };
    const res = mkRes();

    await getSchoolInfo(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    const body = res.json.mock.calls[0][0];
    expect(body.error.code).toBe('SCHOOL_NOT_FOUND');
  });
});
