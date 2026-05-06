import { jest } from '@jest/globals';

const mockFindAll = jest.fn();
const mockFindOne = jest.fn();
const mockFindByPk = jest.fn();
const mockFindAndCountAll = jest.fn();
const mockCount = jest.fn();
const mockCreate = jest.fn();

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
jest.unstable_mockModule('../utils/logger.js', () => ({
  default: { error: jest.fn(), info: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

const {
  getAdmins, updateAdminBySuper, deleteAdminBySuper,
  createAdmin, createGovernment, getGovernments,
  updateGovernmentBySuper, deleteGovernmentBySuper,
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

  describe('updateAdminBySuper', () => {
    it('404 when admin not found', async () => {
      mockFindOne.mockResolvedValue(null);
      const req = { user: { id: 'g1' }, params: { id: 'a1' }, body: {} };
      const res = mkRes();
      await updateAdminBySuper(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('400 when new email already in use', async () => {
      mockFindOne
        .mockResolvedValueOnce({ id: 'a1', email: 'old@x.com', save: jest.fn() })
        .mockResolvedValueOnce({ id: 'other' });
      const req = { user: { id: 'g1' }, params: { id: 'a1' }, body: { email: 'new@x.com' } };
      const res = mkRes();
      await updateAdminBySuper(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('saves changes when fields valid', async () => {
      const save = jest.fn().mockResolvedValue();
      const admin = { id: 'a1', email: 'old@x.com', save, toJSON: () => ({}) };
      mockFindOne.mockResolvedValueOnce(admin);
      const req = { user: { id: 'g1' }, params: { id: 'a1' }, body: { firstName: 'New' } };
      const res = mkRes();
      await updateAdminBySuper(req, res);
      expect(admin.firstName).toBe('New');
      expect(save).toHaveBeenCalled();
    });
  });

  describe('deleteAdminBySuper', () => {
    it('404 when admin not found', async () => {
      mockFindOne.mockResolvedValue(null);
      const req = { user: { id: 'g1' }, params: { id: 'a1' } };
      const res = mkRes();
      await deleteAdminBySuper(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('400 when trying to delete self', async () => {
      mockFindOne.mockResolvedValue({ id: 'g1' });
      const req = { user: { id: 'g1' }, params: { id: 'g1' } };
      const res = mkRes();
      await deleteAdminBySuper(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('409 when admin has dependents', async () => {
      mockFindOne.mockResolvedValue({ id: 'a1' });
      mockCount.mockResolvedValue(5);
      const req = { user: { id: 'g1' }, params: { id: 'a1' } };
      const res = mkRes();
      await deleteAdminBySuper(req, res);
      expect(res.status).toHaveBeenCalledWith(409);
    });

    it('destroys when no dependents', async () => {
      const destroy = jest.fn().mockResolvedValue();
      mockFindOne.mockResolvedValue({ id: 'a1', destroy });
      mockCount.mockResolvedValue(0);
      const req = { user: { id: 'g1' }, params: { id: 'a1' } };
      const res = mkRes();
      await deleteAdminBySuper(req, res);
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
      const req = { user: { id: 'g1' }, body: { firstName: 'A', lastName: 'B', email: 'a@x.com', password: 'pass1234' } };
      const res = mkRes();
      await createAdmin(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('creates admin (role=admin) when valid', async () => {
      mockFindOne.mockResolvedValue(null);
      mockCreate.mockResolvedValue({ id: 'a1', email: 'a@x.com', toJSON: () => ({ id: 'a1' }) });
      const req = { user: { id: 'g1' }, body: { firstName: 'A', lastName: 'B', email: 'A@X.COM', password: 'pass1234' } };
      const res = mkRes();
      await createAdmin(req, res);
      expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({
        email: 'a@x.com', role: 'admin',
      }));
      expect(res.status).toHaveBeenCalledWith(201);
    });
  });

  describe('createGovernment', () => {
    it('400 when fields missing', async () => {
      const req = { user: { id: 'g1' }, body: {} };
      const res = mkRes();
      await createGovernment(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('400 when email format invalid', async () => {
      const req = { user: { id: 'g1' }, body: { firstName: 'A', lastName: 'B', email: 'noatsign', password: 'pass12' } };
      const res = mkRes();
      await createGovernment(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('400 when password short', async () => {
      const req = { user: { id: 'g1' }, body: { firstName: 'A', lastName: 'B', email: 'a@x.com', password: '12' } };
      const res = mkRes();
      await createGovernment(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('400 when email already exists', async () => {
      mockFindOne.mockResolvedValue({ id: 'existing' });
      const req = { user: { id: 'g1' }, body: { firstName: 'A', lastName: 'B', email: 'a@x.com', password: 'longenough' } };
      const res = mkRes();
      await createGovernment(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('creates government user (role=government, isActive=true)', async () => {
      mockFindOne.mockResolvedValue(null);
      mockCreate.mockResolvedValue({ id: 'g2', email: 'g@x.com', toJSON: () => ({ id: 'g2' }) });
      const req = { user: { id: 'g1' }, body: { firstName: 'A', lastName: 'B', email: 'g@x.com', password: 'longenough' } };
      const res = mkRes();
      await createGovernment(req, res);
      expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({
        role: 'government', isActive: true,
      }));
      expect(res.status).toHaveBeenCalledWith(201);
    });
  });
});
