import { jest } from '@jest/globals';

const mockGroupFindAndCount = jest.fn();
const mockGroupFindByPk = jest.fn();
const mockGroupCreate = jest.fn();
const mockUserFindByPk = jest.fn();
const mockUserFindAll = jest.fn();

jest.unstable_mockModule('../models/Group.js', () => ({
  default: {
    findAndCountAll: mockGroupFindAndCount,
    findByPk: mockGroupFindByPk,
    create: mockGroupCreate,
  },
}));
jest.unstable_mockModule('../models/User.js', () => ({
  default: { findByPk: mockUserFindByPk, findAll: mockUserFindAll },
}));
jest.unstable_mockModule('../utils/logger.js', () => ({
  default: { error: jest.fn(), info: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

const { getGroups, createGroup, updateGroup, deleteGroup } = await import('../controllers/groupController.js');

const mkRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('groupController', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('getGroups', () => {
    it('admin with no receptions returns empty list', async () => {
      mockUserFindAll.mockResolvedValue([]);
      const req = { user: { id: 'a1', role: 'admin' }, query: {} };
      const res = mkRes();
      await getGroups(req, res);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        groups: [], total: 0,
      }));
    });

    it('reception scopes by createdBy on teacher include', async () => {
      mockGroupFindAndCount.mockResolvedValue({ rows: [], count: 0 });
      const req = { user: { id: 'r1', role: 'reception' }, query: {} };
      const res = mkRes();
      await getGroups(req, res);
      const include = mockGroupFindAndCount.mock.calls[0][0].include[0];
      expect(include.where).toEqual({ createdBy: 'r1' });
    });

    it('teacher scopes to their own groups', async () => {
      mockGroupFindAndCount.mockResolvedValue({ rows: [], count: 0 });
      const req = { user: { id: 't1', role: 'teacher' }, query: {} };
      const res = mkRes();
      await getGroups(req, res);
      const include = mockGroupFindAndCount.mock.calls[0][0].include[0];
      expect(include.where).toEqual({ id: 't1' });
    });
  });

  describe('createGroup', () => {
    it('400 when teacherId not a teacher', async () => {
      mockUserFindByPk.mockResolvedValue({ role: 'admin' });
      const req = {
        user: { id: 'a1', role: 'admin' },
        body: { name: 'G1', teacherId: 'a1' },
      };
      const res = mkRes();
      await createGroup(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('uses req.user.schoolId when creating', async () => {
      mockUserFindByPk.mockResolvedValue({ id: 't1', role: 'teacher' });
      const reload = jest.fn().mockResolvedValue();
      mockGroupCreate.mockResolvedValue({ id: 'g1', reload });
      const req = {
        user: { id: 'a1', role: 'admin', schoolId: 's1' },
        body: { name: 'G1', teacherId: 't1', capacity: 10, ageRange: '3-5' },
      };
      const res = mkRes();
      await createGroup(req, res);
      expect(mockGroupCreate).toHaveBeenCalledWith(expect.objectContaining({
        schoolId: 's1', teacherId: 't1',
      }));
    });
  });

  describe('updateGroup', () => {
    it('404 when not found', async () => {
      mockGroupFindByPk.mockResolvedValue(null);
      const req = { user: { id: 'a1' }, params: { id: 'g1' }, body: {} };
      const res = mkRes();
      await updateGroup(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('403 when cross-school', async () => {
      mockGroupFindByPk.mockResolvedValue({ id: 'g1', schoolId: 'OTHER' });
      const req = { user: { id: 'a1', schoolId: 's1' }, params: { id: 'g1' }, body: {} };
      const res = mkRes();
      await updateGroup(req, res);
      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('400 when new teacherId is not a teacher', async () => {
      mockGroupFindByPk.mockResolvedValue({ id: 'g1', schoolId: 's1', teacherId: 't1', update: jest.fn(), reload: jest.fn() });
      mockUserFindByPk.mockResolvedValue({ role: 'admin' });
      const req = {
        user: { id: 'a1', schoolId: 's1' },
        params: { id: 'g1' },
        body: { teacherId: 'a1' },
      };
      const res = mkRes();
      await updateGroup(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('deleteGroup', () => {
    it('404 when not found', async () => {
      mockGroupFindByPk.mockResolvedValue(null);
      const req = { user: { id: 'a1' }, params: { id: 'g1' } };
      const res = mkRes();
      await deleteGroup(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('403 when cross-school', async () => {
      mockGroupFindByPk.mockResolvedValue({ id: 'g1', schoolId: 'OTHER' });
      const req = { user: { id: 'a1', schoolId: 's1' }, params: { id: 'g1' } };
      const res = mkRes();
      await deleteGroup(req, res);
      expect(res.status).toHaveBeenCalledWith(403);
    });
  });
});
