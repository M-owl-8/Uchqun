import { jest } from '@jest/globals';

const mockReqFindByPk = jest.fn();
const mockUserCreate = jest.fn();
const mockUserFindOne = jest.fn();

jest.unstable_mockModule('../models/AdminRegistrationRequest.js', () => ({
  default: { findByPk: mockReqFindByPk, findAll: jest.fn(), findAndCountAll: jest.fn() },
}));
jest.unstable_mockModule('../models/User.js', () => ({
  default: { create: mockUserCreate, findOne: mockUserFindOne },
}));
jest.unstable_mockModule('../config/storage.js', () => ({ uploadFile: jest.fn(), deleteFile: jest.fn() }));
jest.unstable_mockModule('../config/database.js', () => ({
  default: { transaction: jest.fn(async (cb) => cb({})) },
}));
jest.unstable_mockModule('../controllers/authController.js', () => ({
  generateSetPasswordToken: () => 'fake-token',
}));
jest.unstable_mockModule('../utils/logger.js', () => ({
  default: { error: jest.fn(), info: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

const { approveRegistrationRequest, rejectRegistrationRequest } = await import('../controllers/adminRegistrationController.js');

const mkRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('adminRegistrationController', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('approveRegistrationRequest', () => {
    it('404 when request not found', async () => {
      mockReqFindByPk.mockResolvedValue(null);
      const req = { user: { id: 'g1' }, params: { id: 'r1' }, body: {} };
      const res = mkRes();
      await approveRegistrationRequest(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('400 when already approved', async () => {
      mockReqFindByPk.mockResolvedValue({ id: 'r1', status: 'approved' });
      const req = { user: { id: 'g1' }, params: { id: 'r1' }, body: {} };
      const res = mkRes();
      await approveRegistrationRequest(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('400 when email already registered', async () => {
      mockReqFindByPk.mockResolvedValue({ id: 'r1', status: 'pending', email: 'a@x.com' });
      mockUserFindOne.mockResolvedValue({ id: 'existing' });
      const req = { user: { id: 'g1' }, params: { id: 'r1' }, body: {} };
      const res = mkRes();
      await approveRegistrationRequest(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('creates admin and updates request to approved', async () => {
      const save = jest.fn().mockResolvedValue();
      const request = {
        id: 'r1', status: 'pending', email: 'a@x.com',
        firstName: 'A', lastName: 'B', phone: '+998901111111',
        schoolId: 's1',
        save, toJSON: () => ({}),
      };
      mockReqFindByPk.mockResolvedValue(request);
      mockUserFindOne.mockResolvedValue(null);
      mockUserCreate.mockResolvedValue({ id: 'admin1', toJSON: () => ({ id: 'admin1' }) });
      const req = { user: { id: 'g1' }, params: { id: 'r1' }, body: {} };
      const res = mkRes();
      await approveRegistrationRequest(req, res);
      expect(mockUserCreate).toHaveBeenCalledWith(
        expect.objectContaining({ email: 'a@x.com', role: 'admin', isActive: true, documentsApproved: true }),
        expect.objectContaining({ transaction: expect.anything() }),
      );
      expect(request.status).toBe('approved');
      expect(request.approvedUserId).toBe('admin1');
      expect(save).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });
  });

  describe('rejectRegistrationRequest', () => {
    it('404 when request not found', async () => {
      mockReqFindByPk.mockResolvedValue(null);
      const req = { user: { id: 'g1' }, params: { id: 'r1' }, body: {} };
      const res = mkRes();
      await rejectRegistrationRequest(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('400 when already rejected', async () => {
      mockReqFindByPk.mockResolvedValue({ id: 'r1', status: 'rejected' });
      const req = { user: { id: 'g1' }, params: { id: 'r1' }, body: {} };
      const res = mkRes();
      await rejectRegistrationRequest(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('persists rejection with reason', async () => {
      const save = jest.fn().mockResolvedValue();
      const request = { id: 'r1', status: 'pending', save, toJSON: () => ({}) };
      mockReqFindByPk.mockResolvedValue(request);
      const req = { user: { id: 'g1' }, params: { id: 'r1' }, body: { reason: '  bad docs  ' } };
      const res = mkRes();
      await rejectRegistrationRequest(req, res);
      expect(request.status).toBe('rejected');
      expect(request.rejectionReason).toBe('bad docs');
      expect(save).toHaveBeenCalled();
    });

    it('null reason when not provided', async () => {
      const save = jest.fn().mockResolvedValue();
      const request = { id: 'r1', status: 'pending', save, toJSON: () => ({}) };
      mockReqFindByPk.mockResolvedValue(request);
      const req = { user: { id: 'g1' }, params: { id: 'r1' }, body: {} };
      const res = mkRes();
      await rejectRegistrationRequest(req, res);
      expect(request.rejectionReason).toBeNull();
    });
  });
});
