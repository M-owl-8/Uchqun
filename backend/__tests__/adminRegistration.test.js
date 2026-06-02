/**
 * adminRegistrationController tests
 *
 * GOV-ACCOUNT-AUDIT-FIX: approval now uses resolveEmailDomain instead of
 * the applicant's free-text email. Tests updated to reflect the new behavior.
 */
import { jest } from '@jest/globals';

const mockReqFindByPk = jest.fn();
const mockUserCreate = jest.fn();
const mockUserFindOne = jest.fn();
const mockResolveEmailDomain = jest.fn().mockResolvedValue('tmm1.uz');

jest.unstable_mockModule('../models/AdminRegistrationRequest.js', () => ({
  default: { findByPk: mockReqFindByPk, findAll: jest.fn(), findAndCountAll: jest.fn() },
}));
jest.unstable_mockModule('../models/User.js', () => ({
  default: { create: mockUserCreate, findOne: mockUserFindOne },
}));
jest.unstable_mockModule('../config/storage.js', () => ({ uploadFile: jest.fn(), deleteFile: jest.fn() }));
jest.unstable_mockModule('../config/database.js', () => ({
  default: {
    transaction: jest.fn(async (cb) => cb({})),
    define: jest.fn(() => ({ hasMany: jest.fn(), belongsTo: jest.fn() })),
  },
}));
jest.unstable_mockModule('../models/School.js', () => ({
  default: { findOne: jest.fn().mockResolvedValue(null), findAll: jest.fn().mockResolvedValue([]), update: jest.fn().mockResolvedValue([0]) },
}));
jest.unstable_mockModule('../controllers/authController.js', () => ({
  generateSetPasswordToken: () => 'fake-token',
}));
jest.unstable_mockModule('../utils/logger.js', () => ({
  default: { error: jest.fn(), info: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));
jest.unstable_mockModule('../utils/auditLogger.js', () => ({
  logAudit: jest.fn(),
}));
jest.unstable_mockModule('../utils/accountDomain.js', () => ({
  resolveEmailDomain: mockResolveEmailDomain,
  isValidLocalPart: jest.fn().mockReturnValue(true),
  REPUBLIC_DOMAIN: 'davlat.uz',
}));

const { approveRegistrationRequest, rejectRegistrationRequest } = await import('../controllers/adminRegistrationController.js');

const mkRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

const VALID_ID  = '00000000-0000-0000-0000-000000000001';
const SCHOOL_ID = '00000000-0000-0000-0000-000000000003';

describe('adminRegistrationController', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('approveRegistrationRequest', () => {
    it('404 when request not found', async () => {
      mockReqFindByPk.mockResolvedValue(null);
      const req = { user: { id: 'g1', role: 'government', govLevel: 'republic' }, params: { id: VALID_ID }, body: {}, isGlobalAccess: true };
      const res = mkRes();
      await approveRegistrationRequest(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('400 when already approved', async () => {
      mockReqFindByPk.mockResolvedValue({ id: VALID_ID, status: 'approved', schoolId: SCHOOL_ID });
      const req = { user: { id: 'g1', role: 'government', govLevel: 'republic' }, params: { id: VALID_ID }, body: {}, isGlobalAccess: true };
      const res = mkRes();
      await approveRegistrationRequest(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('409 when enforced email already registered', async () => {
      // resolveEmailDomain returns 'tmm1.uz', firstName='iroda' → enforced email = iroda@tmm1.uz
      mockResolveEmailDomain.mockResolvedValue('tmm1.uz');
      mockReqFindByPk.mockResolvedValue({
        id: VALID_ID, status: 'pending', email: 'iroda@gmail.com',
        firstName: 'iroda', lastName: 'B', schoolId: SCHOOL_ID,
        save: jest.fn(), toJSON: () => ({}),
      });
      mockUserFindOne.mockResolvedValue({ id: 'existing' }); // enforced email taken
      const req = { user: { id: 'g1', role: 'government', govLevel: 'republic' }, params: { id: VALID_ID }, body: {}, isGlobalAccess: true };
      const res = mkRes();
      await approveRegistrationRequest(req, res);
      expect(res.status).toHaveBeenCalledWith(409);
      const body = res.json.mock.calls[0][0];
      expect(body.error.code).toBe('EMAIL_ALREADY_EXISTS');
    });

    it('creates admin with enforced domain email, not applicant email', async () => {
      mockResolveEmailDomain.mockResolvedValue('tmm1.uz');
      const save = jest.fn().mockResolvedValue();
      const request = {
        id: VALID_ID, status: 'pending', email: 'applicant@gmail.com',
        firstName: 'iroda', lastName: 'B', phone: '+998901111111',
        schoolId: SCHOOL_ID,
        save, toJSON: () => ({}),
      };
      mockReqFindByPk.mockResolvedValue(request);
      mockUserFindOne.mockResolvedValue(null);  // enforced email not taken
      mockUserCreate.mockResolvedValue({ id: 'admin1', toJSON: () => ({ id: 'admin1' }) });
      const req = { user: { id: 'g1', role: 'government', govLevel: 'republic' }, params: { id: VALID_ID }, body: {}, isGlobalAccess: true };
      const res = mkRes();
      await approveRegistrationRequest(req, res);

      // Must use enforced email (iroda@tmm1.uz), NOT applicant@gmail.com
      expect(mockUserCreate).toHaveBeenCalledWith(
        expect.objectContaining({ email: 'iroda@tmm1.uz', role: 'admin', isActive: true }),
        expect.anything(),
      );
      expect(request.status).toBe('approved');
      expect(request.approvedUserId).toBe('admin1');
      expect(save).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it('supports explicit localPart in body', async () => {
      mockResolveEmailDomain.mockResolvedValue('tmm1.uz');
      const save = jest.fn().mockResolvedValue();
      const request = {
        id: VALID_ID, status: 'pending', email: 'applicant@gmail.com',
        firstName: 'iroda', lastName: 'B', schoolId: SCHOOL_ID,
        save, toJSON: () => ({}),
      };
      mockReqFindByPk.mockResolvedValue(request);
      mockUserFindOne.mockResolvedValue(null);
      mockUserCreate.mockResolvedValue({ id: 'admin1', toJSON: () => ({}) });
      const req = { user: { id: 'g1', role: 'government', govLevel: 'republic' }, params: { id: VALID_ID }, body: { localPart: 'director' }, isGlobalAccess: true };
      const res = mkRes();
      await approveRegistrationRequest(req, res);

      expect(mockUserCreate).toHaveBeenCalledWith(
        expect.objectContaining({ email: 'director@tmm1.uz' }),
        expect.anything(),
      );
    });

    it('403 when resolveEmailDomain rejects (no school context)', async () => {
      mockResolveEmailDomain.mockRejectedValue({ code: 'ACCOUNT_CREATE_FORBIDDEN_HIERARCHY' });
      mockReqFindByPk.mockResolvedValue({
        id: VALID_ID, status: 'pending', email: 'a@gmail.com',
        firstName: 'test', schoolId: null,
        save: jest.fn(), toJSON: () => ({}),
      });
      const req = { user: { id: 'g1', role: 'government', govLevel: 'republic' }, params: { id: VALID_ID }, body: {}, isGlobalAccess: true };
      const res = mkRes();
      await approveRegistrationRequest(req, res);
      expect(res.status).toHaveBeenCalledWith(403);
      expect(mockUserCreate).not.toHaveBeenCalled();
    });
  });

  describe('rejectRegistrationRequest', () => {
    it('404 when request not found', async () => {
      mockReqFindByPk.mockResolvedValue(null);
      const req = { user: { id: 'g1' }, params: { id: VALID_ID }, body: {}, isGlobalAccess: true };
      const res = mkRes();
      await rejectRegistrationRequest(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('400 when already rejected', async () => {
      mockReqFindByPk.mockResolvedValue({ id: VALID_ID, status: 'rejected' });
      const req = { user: { id: 'g1' }, params: { id: VALID_ID }, body: {}, isGlobalAccess: true };
      const res = mkRes();
      await rejectRegistrationRequest(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('persists rejection with reason', async () => {
      const save = jest.fn().mockResolvedValue();
      const request = { id: VALID_ID, status: 'pending', save, toJSON: () => ({}) };
      mockReqFindByPk.mockResolvedValue(request);
      const req = { user: { id: 'g1' }, params: { id: VALID_ID }, body: { reason: '  bad docs  ' }, isGlobalAccess: true };
      const res = mkRes();
      await rejectRegistrationRequest(req, res);
      expect(request.status).toBe('rejected');
      expect(request.rejectionReason).toBe('bad docs');
      expect(save).toHaveBeenCalled();
    });

    it('null reason when not provided', async () => {
      const save = jest.fn().mockResolvedValue();
      const request = { id: VALID_ID, status: 'pending', save, toJSON: () => ({}) };
      mockReqFindByPk.mockResolvedValue(request);
      const req = { user: { id: 'g1' }, params: { id: VALID_ID }, body: {}, isGlobalAccess: true };
      const res = mkRes();
      await rejectRegistrationRequest(req, res);
      expect(request.rejectionReason).toBeNull();
    });
  });
});
