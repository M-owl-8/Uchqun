import { jest } from '@jest/globals';

const mockFindAll = jest.fn();
const mockFindOne = jest.fn();
const mockFindByPk = jest.fn();
const mockFindAndCountAll = jest.fn();
const mockCount = jest.fn();
const mockCreate = jest.fn();
const mockRegionFindByPk = jest.fn();
const mockRevokeJti = jest.fn();

jest.unstable_mockModule('../models/User.js', () => ({
  default: {
    findAll: mockFindAll,
    findOne: mockFindOne,
    findByPk: mockFindByPk,
    findAndCountAll: mockFindAndCountAll,
    count: mockCount,
    create: mockCreate,
  },
}));
jest.unstable_mockModule('../models/Region.js', () => ({
  default: { findByPk: mockRegionFindByPk },
}));
jest.unstable_mockModule('../models/School.js', () => ({
  default: { findOne: jest.fn(), findAll: jest.fn().mockResolvedValue([]) },
}));
jest.unstable_mockModule('../middleware/auth.js', () => ({
  revokeJti: mockRevokeJti,
  invalidateUserCache: jest.fn(),
}));
jest.unstable_mockModule('../utils/logger.js', () => ({
  default: { error: jest.fn(), info: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));
jest.unstable_mockModule('../utils/auditLogger.js', () => ({
  logAudit: jest.fn(),
}));

const {
  getAdmins, updateAdmin, deleteAdmin,
  createAdmin, createGovernment,
} = await import('../controllers/admin/adminUserController.js');

const mkRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('admin/adminUserController', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('getAdmins', () => {
    it('returns admins (excludes password)', async () => {
      mockFindAll.mockResolvedValue([{ id: 'a1' }]);
      const req = { user: { id: 'g1' } };
      const res = mkRes();
      await getAdmins(req, res);
      const opts = mockFindAll.mock.calls[0][0];
      expect(opts.where).toEqual({ role: 'admin' });
      expect(opts.attributes.exclude).toContain('password');
    });
  });

  describe('updateAdmin', () => {
    it('404 when admin not found', async () => {
      mockFindOne.mockResolvedValue(null);
      const req = { user: { id: 'g1' }, params: { id: 'a1' }, body: {} };
      const res = mkRes();
      await updateAdmin(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('400 when new email already in use', async () => {
      mockFindOne
        .mockResolvedValueOnce({ id: 'a1', email: 'old@x.com', save: jest.fn() })
        .mockResolvedValueOnce({ id: 'other' });
      const req = { user: { id: 'g1' }, params: { id: 'a1' }, body: { email: 'new@x.com' }, isGlobalAccess: true };
      const res = mkRes();
      await updateAdmin(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('saves changes when fields valid', async () => {
      const save = jest.fn().mockResolvedValue();
      const admin = { id: 'a1', email: 'old@x.com', save, toJSON: () => ({}) };
      mockFindOne.mockResolvedValueOnce(admin);
      const req = { user: { id: 'g1' }, params: { id: 'a1' }, body: { firstName: 'New' }, isGlobalAccess: true };
      const res = mkRes();
      await updateAdmin(req, res);
      expect(admin.firstName).toBe('New');
      expect(save).toHaveBeenCalled();
    });
  });

  describe('deleteAdmin', () => {
    it('404 when admin not found', async () => {
      mockFindOne.mockResolvedValue(null);
      const req = { user: { id: 'g1' }, params: { id: 'a1' } };
      const res = mkRes();
      await deleteAdmin(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('400 when trying to delete self', async () => {
      mockFindOne.mockResolvedValue({ id: 'g1' });
      const req = { user: { id: 'g1' }, params: { id: 'g1' }, isGlobalAccess: true };
      const res = mkRes();
      await deleteAdmin(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('409 when admin has dependents', async () => {
      mockFindOne.mockResolvedValue({ id: 'a1' });
      mockCount.mockResolvedValue(5);
      const req = { user: { id: 'g1' }, params: { id: 'a1' }, isGlobalAccess: true };
      const res = mkRes();
      await deleteAdmin(req, res);
      expect(res.status).toHaveBeenCalledWith(409);
    });

    it('destroys when no dependents', async () => {
      const destroy = jest.fn().mockResolvedValue();
      mockFindOne.mockResolvedValue({ id: 'a1', destroy });
      mockCount.mockResolvedValue(0);
      const req = { user: { id: 'g1' }, params: { id: 'a1' }, isGlobalAccess: true };
      const res = mkRes();
      await deleteAdmin(req, res);
      expect(destroy).toHaveBeenCalled();
    });
  });

  describe('createAdmin', () => {
    it('400 when fields missing', async () => {
      const req = { user: { id: 'g1' }, body: {} };
      const res = mkRes();
      await createAdmin(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('401 when no req.user', async () => {
      const req = { body: { firstName: 'A', lastName: 'B', email: 'a@x.com', password: 'pass1234' } };
      const res = mkRes();
      await createAdmin(req, res);
      expect(res.status).toHaveBeenCalledWith(401);
    });

    it('400 when email exists', async () => {
      mockFindOne.mockResolvedValue({ id: 'existing' });
      const req = { user: { id: 'g1' }, body: { firstName: 'A', lastName: 'B', email: 'a@x.com', password: 'Pass@2026' }, isGlobalAccess: true };
      const res = mkRes();
      await createAdmin(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('creates admin (role=admin) when valid', async () => {
      mockFindOne.mockResolvedValue(null);
      mockCreate.mockResolvedValue({ id: 'a1', email: 'a@x.com', toJSON: () => ({ id: 'a1' }) });
      const req = { user: { id: 'g1' }, body: { firstName: 'A', lastName: 'B', email: 'A@X.COM', password: 'Pass@2026' }, isGlobalAccess: true };
      const res = mkRes();
      await createAdmin(req, res);
      expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({
        email: 'a@x.com', role: 'admin',
      }));
      expect(res.status).toHaveBeenCalledWith(201);
    });
  });

  // createGovernment tests now use the provisioning API (CP-021).
  // Comprehensive provisioning tests are in __tests__/controllers/governmentProvisioning.test.js.
  describe('createGovernment (provisioning API)', () => {
    it('403 when caller is secondary account', async () => {
      const req = { user: { id: 'g1', govType: 'secondary' }, body: {} };
      const res = mkRes();
      await createGovernment(req, res);
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: expect.objectContaining({ code: 'PROVISION_FORBIDDEN' }) })
      );
    });

    it('400 when required fields missing (govLevel/govType absent)', async () => {
      const req = { user: { id: 'g1', govType: 'main', govLevel: 'republic' }, body: { firstName: 'Ali', lastName: 'Yo', password: 'Pass@2026' } };
      const res = mkRes();
      await createGovernment(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('409 when attempt to create second republic-main', async () => {
      const req = {
        user: { id: 'g1', govType: 'main', govLevel: 'republic' },
        body: { firstName: 'Ali', lastName: 'Yo', password: 'Pass@2026', govLevel: 'republic', govType: 'main' },
      };
      const res = mkRes();
      await createGovernment(req, res);
      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: expect.objectContaining({ code: 'REPUBLIC_MAIN_EXISTS' }) })
      );
    });

    it('400 when creating region account without govRegionId', async () => {
      const req = {
        user: { id: 'g1', govType: 'main', govLevel: 'republic' },
        body: { firstName: 'Ali', lastName: 'Yo', password: 'Pass@2026', govLevel: 'region', govType: 'main' },
      };
      const res = mkRes();
      await createGovernment(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: expect.objectContaining({ code: 'PROVISION_REGION_REQUIRED' }) })
      );
    });

    it('201 when republic-main creates region-main (happy path)', async () => {
      const REGION_ID = '00000000-0000-0000-0000-000000000001';
      mockRegionFindByPk.mockResolvedValue({ id: REGION_ID, code: 'R01' });
      mockFindOne.mockResolvedValue(null); // credential not taken
      mockCreate.mockResolvedValue({
        id: 'g2', email: 'ali@r01', toJSON: () => ({ id: 'g2', email: 'ali@r01', govLevel: 'region', govType: 'main' }),
      });
      const req = {
        user: { id: 'g1', govType: 'main', govLevel: 'republic' },
        body: { firstName: 'Ali', lastName: 'Yo', password: 'Pass@2026', govLevel: 'region', govType: 'main', govRegionId: REGION_ID },
      };
      const res = mkRes();
      await createGovernment(req, res);
      expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({
        role: 'government', isActive: true, govLevel: 'region', govType: 'main', mustChangePassword: true,
      }));
      expect(res.status).toHaveBeenCalledWith(201);
    });
  });
});
