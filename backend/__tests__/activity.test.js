import { jest } from '@jest/globals';

const mockActivityFindByPk = jest.fn();
const mockActivityFindAll = jest.fn();
const mockChildFindByPk = jest.fn();
const mockChildFindAll = jest.fn();
const mockUserFindAll = jest.fn();
const mockValidateChildAccess = jest.fn();

jest.unstable_mockModule('../models/Activity.js', () => ({
  default: { findByPk: mockActivityFindByPk, findAll: mockActivityFindAll, create: jest.fn() },
}));

jest.unstable_mockModule('../models/Child.js', () => ({
  default: { findByPk: mockChildFindByPk, findAll: mockChildFindAll },
}));

jest.unstable_mockModule('../models/Media.js', () => ({ default: {} }));
jest.unstable_mockModule('../models/User.js', () => ({ default: { findAll: mockUserFindAll } }));
jest.unstable_mockModule('../utils/schoolValidation.js', () => ({ validateChildAccess: mockValidateChildAccess }));
jest.unstable_mockModule('../controllers/notificationController.js', () => ({ createNotification: jest.fn() }));
jest.unstable_mockModule('../config/socket.js', () => ({ emitToUser: jest.fn() }));
jest.unstable_mockModule('../utils/logger.js', () => ({
  default: { error: jest.fn(), info: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

const { updateActivity, getActivities } = await import('../controllers/activityController.js');

const mkRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('updateActivity', () => {
  beforeEach(() => jest.clearAllMocks());

  it('rejects roles outside teacher/admin/reception', async () => {
    const req = { user: { role: 'parent' }, params: { id: 'a1' }, body: {} };
    const res = mkRes();
    await updateActivity(req, res);
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('returns 404 when activity not found', async () => {
    mockActivityFindByPk.mockResolvedValue(null);
    const req = { user: { role: 'teacher', schoolId: 's1' }, params: { id: 'a1' }, body: {} };
    const res = mkRes();
    await updateActivity(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('rejects cross-school update', async () => {
    const fakeUpdate = jest.fn();
    mockActivityFindByPk.mockResolvedValue({ childId: 'c1', update: fakeUpdate });
    mockValidateChildAccess.mockResolvedValue(null); // access denied
    const req = { user: { role: 'teacher', schoolId: 's1', id: 't1' }, params: { id: 'a1' }, body: { description: 'x' } };
    const res = mkRes();
    await updateActivity(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(fakeUpdate).not.toHaveBeenCalled();
  });

  describe('getActivities scope', () => {
    it('parent: empty array when parent has no children', async () => {
      mockChildFindAll.mockResolvedValue([]);
      const req = { user: { id: 'p1', role: 'parent' }, query: {} };
      const res = mkRes();
      await getActivities(req, res);
      expect(res.json).toHaveBeenCalledWith([]);
    });

    it('parent: 403 when childId not owned', async () => {
      mockChildFindAll.mockResolvedValue([{ id: 'c1' }]);
      const req = { user: { id: 'p1', role: 'parent' }, query: { childId: 'OTHER' } };
      const res = mkRes();
      await getActivities(req, res);
      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('teacher: empty array when no assigned parents', async () => {
      mockUserFindAll.mockResolvedValue([]);
      const req = { user: { id: 't1', role: 'teacher' }, query: {} };
      const res = mkRes();
      await getActivities(req, res);
      expect(res.json).toHaveBeenCalledWith([]);
    });

    it('admin: returns all activities (no scope filter)', async () => {
      mockActivityFindAll.mockResolvedValue([]);
      const req = { user: { id: 'a1', role: 'admin' }, query: {} };
      const res = mkRes();
      await getActivities(req, res);
      const where = mockActivityFindAll.mock.calls[0][0].where;
      expect(where.childId).toBeUndefined();
    });
  });

  it('whitelists allowed fields and strips schoolId/childId from body', async () => {
    const fakeUpdate = jest.fn();
    const updated = {
      toJSON: () => ({ id: 'a1', description: 'updated', tasks: [], services: [] }),
    };
    mockActivityFindByPk.mockResolvedValueOnce({ childId: 'c1', update: fakeUpdate }).mockResolvedValueOnce(updated);
    mockValidateChildAccess.mockResolvedValue({ id: 'c1', schoolId: 's1', parentId: 'p1' });
    const req = {
      user: { role: 'teacher', schoolId: 's1', id: 't1' },
      params: { id: 'a1' },
      body: { description: 'updated', schoolId: 'INJECTED', childId: 'INJECTED', services: ['s1'] },
    };
    const res = mkRes();
    await updateActivity(req, res);
    const passed = fakeUpdate.mock.calls[0][0];
    expect(passed).toHaveProperty('description', 'updated');
    expect(passed).not.toHaveProperty('schoolId');
    expect(passed).not.toHaveProperty('childId');
    expect(passed.services).toEqual(['s1']);
  });
});
