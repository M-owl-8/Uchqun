import { jest } from '@jest/globals';

const mockGroupFindAndCount = jest.fn();
const mockGroupFindByPk = jest.fn();
const mockGroupCreate = jest.fn();
const mockUserFindByPk = jest.fn();
const mockUserFindOne = jest.fn();
const mockUserFindAll = jest.fn();

jest.unstable_mockModule('../models/Group.js', () => ({
  default: {
    findAndCountAll: mockGroupFindAndCount,
    findByPk: mockGroupFindByPk,
    create: mockGroupCreate,
  },
}));
jest.unstable_mockModule('../models/User.js', () => ({
  default: { findByPk: mockUserFindByPk, findOne: mockUserFindOne, findAll: mockUserFindAll },
}));
jest.unstable_mockModule('../models/School.js', () => ({ default: {} }));
jest.unstable_mockModule('../utils/logger.js', () => ({
  default: { error: jest.fn(), info: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

const { getGroups, getGroup, createGroup, updateGroup, deleteGroup } = await import('../controllers/groupController.js');

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
        success: true, data: [], total: 0,
      }));
    });

    // RE-14 fix: reception now scopes by schoolId on teacher include (not createdBy)
    it('reception scopes by schoolId on teacher include (RE-14)', async () => {
      mockGroupFindAndCount.mockResolvedValue({ rows: [], count: 0 });
      const req = { user: { id: 'r1', role: 'reception', schoolId: 's1' }, query: {} };
      const res = mkRes();
      await getGroups(req, res);
      const include = mockGroupFindAndCount.mock.calls[0][0].include[0];
      expect(include.where).toEqual({ schoolId: 's1' });
    });

    it('teacher scopes to their own groups', async () => {
      mockGroupFindAndCount.mockResolvedValue({ rows: [], count: 0 });
      const req = { user: { id: 't1', role: 'teacher' }, query: {} };
      const res = mkRes();
      await getGroups(req, res);
      const include = mockGroupFindAndCount.mock.calls[0][0].include[0];
      expect(include.where).toEqual({ id: 't1' });
    });

    // V5-CRIT-02: getGroups had no schoolId constraint on the Group WHERE clause —
    // only the teacher include was filtered, allowing cross-school group leakage.
    describe('school isolation in group list (V5-CRIT-02)', () => {
      it('reception with schoolId scopes Group WHERE by schoolId (V5-CRIT-02)', async () => {
        mockGroupFindAndCount.mockResolvedValue({ rows: [], count: 0 });
        const req = { user: { id: 'r1', role: 'reception', schoolId: 's-a' }, query: {} };
        const res = mkRes();
        await getGroups(req, res);
        const { where } = mockGroupFindAndCount.mock.calls[0][0];
        expect(where).toMatchObject({ schoolId: 's-a' });
      });

      it('teacher with schoolId scopes Group WHERE by schoolId (V5-CRIT-02)', async () => {
        mockGroupFindAndCount.mockResolvedValue({ rows: [], count: 0 });
        const req = { user: { id: 't1', role: 'teacher', schoolId: 's-a' }, query: {} };
        const res = mkRes();
        await getGroups(req, res);
        const { where } = mockGroupFindAndCount.mock.calls[0][0];
        expect(where).toMatchObject({ schoolId: 's-a' });
      });

      it('admin with schoolId scopes Group WHERE by schoolId (V5-CRIT-02)', async () => {
        mockUserFindAll.mockResolvedValue([{ id: 'r1' }]);
        mockGroupFindAndCount.mockResolvedValue({ rows: [], count: 0 });
        const req = { user: { id: 'a1', role: 'admin', schoolId: 's-a' }, query: {} };
        const res = mkRes();
        await getGroups(req, res);
        const { where } = mockGroupFindAndCount.mock.calls[0][0];
        expect(where).toMatchObject({ schoolId: 's-a' });
      });

      it('government (no schoolId) does not add schoolId to Group WHERE (V5-CRIT-02)', async () => {
        mockGroupFindAndCount.mockResolvedValue({ rows: [], count: 0 });
        const req = { user: { id: 'g1', role: 'government', schoolId: null }, query: {} };
        const res = mkRes();
        await getGroups(req, res);
        const { where } = mockGroupFindAndCount.mock.calls[0][0];
        expect(where).not.toHaveProperty('schoolId');
      });
    });
  });

  describe('createGroup', () => {
    // RE-13 fix: teacher lookup scoped to school via findOne; not-found → 404
    it('404 when teacherId not found at school (RE-13)', async () => {
      mockUserFindOne.mockResolvedValue(null);
      const req = {
        user: { id: 'a1', role: 'admin', schoolId: 's1' },
        body: { name: 'G1', teacherId: 'a1' },
      };
      const res = mkRes();
      await createGroup(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('uses req.user.schoolId when creating', async () => {
      mockUserFindOne.mockResolvedValue({ id: 't1', role: 'teacher', schoolId: 's1' });
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

    // RE-13 fix: teacher lookup scoped to school via findOne; not-found → 404
    it('404 when new teacherId not found at school (RE-13)', async () => {
      mockGroupFindByPk.mockResolvedValue({ id: 'g1', schoolId: 's1', teacherId: 't1', update: jest.fn(), reload: jest.fn() });
      mockUserFindOne.mockResolvedValue(null);
      const req = {
        user: { id: 'a1', schoolId: 's1' },
        params: { id: 'g1' },
        body: { teacherId: 'a-other' },
      };
      const res = mkRes();
      await updateGroup(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
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

  describe('getGroup — school isolation (C2V-01)', () => {
    const groupA = { id: 'g-a', schoolId: 's-a', teacherId: 't1', teacher: { id: 't1', firstName: 'T', lastName: 'A', email: 't@a.com' } };
    const groupB = { id: 'g-b', schoolId: 's-b', teacherId: 't2', teacher: { id: 't2', firstName: 'T', lastName: 'B', email: 't@b.com' } };

    it('teacher from school-A blocked from school-B group', async () => {
      mockGroupFindByPk.mockResolvedValue(groupB);
      const req = { user: { id: 'u1', role: 'teacher', schoolId: 's-a' }, params: { id: 'g-b' } };
      const res = mkRes();
      await getGroup(req, res);
      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('teacher from school-A allowed own school group', async () => {
      mockGroupFindByPk.mockResolvedValue(groupA);
      const req = { user: { id: 'u1', role: 'teacher', schoolId: 's-a' }, params: { id: 'g-a' } };
      const res = mkRes();
      await getGroup(req, res);
      expect(res.json).toHaveBeenCalledWith(groupA);
    });

    it('reception from school-A blocked from school-B group', async () => {
      mockGroupFindByPk.mockResolvedValue(groupB);
      const req = { user: { id: 'u2', role: 'reception', schoolId: 's-a' }, params: { id: 'g-b' } };
      const res = mkRes();
      await getGroup(req, res);
      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('reception from school-A allowed own school group', async () => {
      mockGroupFindByPk.mockResolvedValue(groupA);
      const req = { user: { id: 'u2', role: 'reception', schoolId: 's-a' }, params: { id: 'g-a' } };
      const res = mkRes();
      await getGroup(req, res);
      expect(res.json).toHaveBeenCalledWith(groupA);
    });

    it('parent from school-A blocked from school-B group', async () => {
      mockGroupFindByPk.mockResolvedValue(groupB);
      const req = { user: { id: 'u3', role: 'parent', schoolId: 's-a' }, params: { id: 'g-b' } };
      const res = mkRes();
      await getGroup(req, res);
      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('parent from school-A allowed own school group', async () => {
      mockGroupFindByPk.mockResolvedValue(groupA);
      const req = { user: { id: 'u3', role: 'parent', schoolId: 's-a' }, params: { id: 'g-a' } };
      const res = mkRes();
      await getGroup(req, res);
      expect(res.json).toHaveBeenCalledWith(groupA);
    });

    it('admin from school-A blocked from school-B group', async () => {
      mockGroupFindByPk.mockResolvedValue(groupB);
      const req = { user: { id: 'a1', role: 'admin', schoolId: 's-a' }, params: { id: 'g-b' } };
      const res = mkRes();
      await getGroup(req, res);
      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('admin from school-A blocked when teacher not under their receptions', async () => {
      mockGroupFindByPk.mockResolvedValue(groupA);
      mockUserFindByPk.mockResolvedValue({ id: 't1', createdBy: 'r-other' });
      mockUserFindAll.mockResolvedValue([{ id: 'r-mine' }]);
      const req = { user: { id: 'a1', role: 'admin', schoolId: 's-a' }, params: { id: 'g-a' } };
      const res = mkRes();
      await getGroup(req, res);
      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('admin from school-A allowed when teacher IS under their receptions', async () => {
      mockGroupFindByPk.mockResolvedValue(groupA);
      mockUserFindByPk.mockResolvedValue({ id: 't1', createdBy: 'r-mine' });
      mockUserFindAll.mockResolvedValue([{ id: 'r-mine' }]);
      const req = { user: { id: 'a1', role: 'admin', schoolId: 's-a' }, params: { id: 'g-a' } };
      const res = mkRes();
      await getGroup(req, res);
      expect(res.json).toHaveBeenCalledWith(groupA);
    });

    it('government (no schoolId) allowed to access any school group', async () => {
      mockGroupFindByPk.mockResolvedValue(groupB);
      const req = { user: { id: 'gov1', role: 'government', schoolId: null }, params: { id: 'g-b' } };
      const res = mkRes();
      await getGroup(req, res);
      expect(res.json).toHaveBeenCalledWith(groupB);
    });

    it('404 when group not found', async () => {
      mockGroupFindByPk.mockResolvedValue(null);
      const req = { user: { id: 'u1', role: 'teacher', schoolId: 's-a' }, params: { id: 'nonexistent' } };
      const res = mkRes();
      await getGroup(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });
  });
});
