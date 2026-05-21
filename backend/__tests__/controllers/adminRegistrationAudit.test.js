/**
 * BC-02a: verify logAudit is called for approveRegistrationRequest and
 * rejectRegistrationRequest with correct action/entity values.
 */
import { jest } from '@jest/globals';

const mockReqFindByPk = jest.fn();
const mockUserCreate = jest.fn();
const mockUserFindOne = jest.fn();
const mockLogAudit = jest.fn();

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

const { approveRegistrationRequest, rejectRegistrationRequest } =
  await import('../../controllers/adminRegistrationController.js');

const mkRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

const VALID_ID = '00000000-0000-0000-0000-000000000001';
const USER_ID  = '00000000-0000-0000-0000-000000000002';

const makeRequest = (overrides = {}) => ({
  id: VALID_ID, status: 'pending', email: 'admin@school.uz',
  firstName: 'Test', lastName: 'Admin',
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
      const adminUser = { id: USER_ID, email: 'admin@school.uz', toJSON: () => ({}) };
      mockReqFindByPk.mockResolvedValue(request);
      mockUserFindOne.mockResolvedValue(null);
      mockUserCreate.mockResolvedValue(adminUser);

      const req = {
        user: { id: 'g1', role: 'government' },
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

    it('audit failure does not break approve — userCreate still called', async () => {
      mockLogAudit.mockImplementation(() => { throw new Error('audit down'); });
      const request = makeRequest();
      const adminUser = { id: USER_ID, email: 'admin@school.uz', toJSON: () => ({}) };
      mockReqFindByPk.mockResolvedValue(request);
      mockUserFindOne.mockResolvedValue(null);
      mockUserCreate.mockResolvedValue(adminUser);

      const req = { user: { id: 'g1', role: 'government' }, params: { id: VALID_ID }, body: {}, isGlobalAccess: true };
      await approveRegistrationRequest(req, mkRes());
      expect(mockUserCreate).toHaveBeenCalled();
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
