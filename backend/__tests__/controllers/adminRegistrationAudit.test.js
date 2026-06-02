/**
 * BC-02a: verify logAudit is called for approveRegistrationRequest and
 * rejectRegistrationRequest with correct action/entity values.
 *
 * GOV-ACCOUNT-AUDIT-FIX: approval now uses resolveEmailDomain (Scenario B fix).
 * Tests updated to provide schoolId and mock accountDomain.
 */
import { jest } from '@jest/globals';

const mockReqFindByPk = jest.fn();
const mockUserCreate = jest.fn();
const mockUserFindOne = jest.fn();
const mockLogAudit = jest.fn();
const mockResolveEmailDomain = jest.fn().mockResolvedValue('tmm1.uz');

jest.unstable_mockModule('../../models/AdminRegistrationRequest.js', () => ({
  default: { findByPk: mockReqFindByPk, findAll: jest.fn(), findAndCountAll: jest.fn() },
}));
jest.unstable_mockModule('../../models/User.js', () => ({
  default: { create: mockUserCreate, findOne: mockUserFindOne, findByPk: jest.fn() },
}));
jest.unstable_mockModule('../../config/storage.js', () => ({
  uploadFile: jest.fn(), deleteFile: jest.fn(),
}));
jest.unstable_mockModule('../../config/database.js', () => ({
  default: { transaction: jest.fn(async (cb) => cb({})) },
}));
jest.unstable_mockModule('../../models/School.js', () => ({
  default: { findOne: jest.fn().mockResolvedValue(null), findAll: jest.fn().mockResolvedValue([]), update: jest.fn().mockResolvedValue([0]) },
}));
jest.unstable_mockModule('../../controllers/authController.js', () => ({
  generateSetPasswordToken: () => 'fake-token',
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

const { approveRegistrationRequest, rejectRegistrationRequest } =
  await import('../../controllers/adminRegistrationController.js');

const mkRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

const VALID_ID  = '00000000-0000-0000-0000-000000000001';
const USER_ID   = '00000000-0000-0000-0000-000000000002';
const SCHOOL_ID = '00000000-0000-0000-0000-000000000003';

const makeRequest = (overrides = {}) => ({
  id: VALID_ID, status: 'pending',
  email: 'applicant@gmail.com',   // applicant's personal email — contact-only
  firstName: 'Test', lastName: 'Admin',
  schoolId: SCHOOL_ID,
  reviewedBy: null, reviewedAt: null, approvedUserId: null,
  save: jest.fn().mockResolvedValue(undefined),
  toJSON: () => ({ id: VALID_ID, status: 'approved' }),
  ...overrides,
});

describe('BC-02a: registration audit logging', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('approveRegistrationRequest', () => {
    it('logs audit with action=approve_registration entity=admin_registrations', async () => {
      const request = makeRequest();
      const adminUser = { id: USER_ID, email: 'test@tmm1.uz', toJSON: () => ({}) };
      mockReqFindByPk.mockResolvedValue(request);
      mockUserFindOne.mockResolvedValue(null);
      mockUserCreate.mockResolvedValue(adminUser);

      const req = {
        user: { id: 'g1', role: 'government', govLevel: 'republic' },
        params: { id: VALID_ID },
        body: {},
        isGlobalAccess: true,
      };
      await approveRegistrationRequest(req, mkRes());

      expect(mockLogAudit).toHaveBeenCalledWith(expect.objectContaining({
        actorId: 'g1', actorRole: 'government',
        action: 'approve_registration', entity: 'admin_registrations', entityId: VALID_ID,
      }));
    });

    it('uses resolveEmailDomain domain — NOT the applicant email', async () => {
      mockResolveEmailDomain.mockResolvedValue('tmm1.uz');
      const request = makeRequest({ firstName: 'iroda' });
      const adminUser = { id: USER_ID, email: 'iroda@tmm1.uz', toJSON: () => ({}) };
      mockReqFindByPk.mockResolvedValue(request);
      mockUserFindOne.mockResolvedValue(null);
      mockUserCreate.mockResolvedValue(adminUser);

      const req = {
        user: { id: 'g1', role: 'government', govLevel: 'republic' },
        params: { id: VALID_ID },
        body: {},
        isGlobalAccess: true,
      };
      await approveRegistrationRequest(req, mkRes());

      // User.create must receive the enforced domain email, not applicant@gmail.com
      expect(mockUserCreate).toHaveBeenCalledWith(
        expect.objectContaining({ email: 'iroda@tmm1.uz' }),
        expect.anything(),
      );
    });

    it('does not use applicant contact email as login credential', async () => {
      mockResolveEmailDomain.mockResolvedValue('tmm1.uz');
      const request = makeRequest({ firstName: 'test', email: 'attacker@evil.com' });
      const adminUser = { id: USER_ID, email: 'test@tmm1.uz', toJSON: () => ({}) };
      mockReqFindByPk.mockResolvedValue(request);
      mockUserFindOne.mockResolvedValue(null);
      mockUserCreate.mockResolvedValue(adminUser);

      const req = {
        user: { id: 'g1', role: 'government', govLevel: 'republic' },
        params: { id: VALID_ID },
        body: {},
        isGlobalAccess: true,
      };
      await approveRegistrationRequest(req, mkRes());

      const createCall = mockUserCreate.mock.calls[0][0];
      expect(createCall.email).not.toBe('attacker@evil.com');
      expect(createCall.email).toBe('test@tmm1.uz');
    });

    it('audit failure does not break approve — userCreate still called', async () => {
      mockLogAudit.mockImplementation(() => { throw new Error('audit down'); });
      const request = makeRequest();
      const adminUser = { id: USER_ID, email: 'test@tmm1.uz', toJSON: () => ({}) };
      mockReqFindByPk.mockResolvedValue(request);
      mockUserFindOne.mockResolvedValue(null);
      mockUserCreate.mockResolvedValue(adminUser);

      const req = { user: { id: 'g1', role: 'government', govLevel: 'republic' }, params: { id: VALID_ID }, body: {}, isGlobalAccess: true };
      await approveRegistrationRequest(req, mkRes());
      expect(mockUserCreate).toHaveBeenCalled();
    });

    it('returns 403 when resolveEmailDomain throws (no schoolId)', async () => {
      mockResolveEmailDomain.mockRejectedValue({ code: 'ACCOUNT_CREATE_FORBIDDEN_HIERARCHY', detail: 'schoolId required' });
      const request = makeRequest({ schoolId: null });
      mockReqFindByPk.mockResolvedValue(request);

      const req = {
        user: { id: 'g1', role: 'government', govLevel: 'republic' },
        params: { id: VALID_ID },
        body: {},
        isGlobalAccess: true,
      };
      const res = mkRes();
      await approveRegistrationRequest(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(mockUserCreate).not.toHaveBeenCalled();
    });
  });

  describe('rejectRegistrationRequest', () => {
    it('logs audit with action=reject_registration entity=admin_registrations', async () => {
      const request = makeRequest();
      mockReqFindByPk.mockResolvedValue(request);

      const req = {
        user: { id: 'g1', role: 'government' },
        params: { id: VALID_ID },
        body: { reason: 'Incomplete docs' },
        isGlobalAccess: true,
      };
      await rejectRegistrationRequest(req, mkRes());

      expect(mockLogAudit).toHaveBeenCalledWith(expect.objectContaining({
        actorId: 'g1', actorRole: 'government',
        action: 'reject_registration', entity: 'admin_registrations', entityId: VALID_ID,
        meta: expect.objectContaining({ reason: 'Incomplete docs' }),
      }));
    });

    it('audit failure does not break reject — request.save still called', async () => {
      mockLogAudit.mockImplementation(() => { throw new Error('audit down'); });
      const request = makeRequest();
      mockReqFindByPk.mockResolvedValue(request);

      const req = { user: { id: 'g1', role: 'government' }, params: { id: VALID_ID }, body: {}, isGlobalAccess: true };
      await rejectRegistrationRequest(req, mkRes());
      expect(request.save).toHaveBeenCalled();
    });
  });
});
