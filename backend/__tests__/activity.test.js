import { jest } from '@jest/globals';

const mockActivityFindByPk = jest.fn();
const mockChildFindByPk = jest.fn();

jest.unstable_mockModule('../models/Activity.js', () => ({
  default: { findByPk: mockActivityFindByPk },
}));

jest.unstable_mockModule('../models/Child.js', () => ({
  default: { findByPk: mockChildFindByPk },
}));

jest.unstable_mockModule('../models/Media.js', () => ({ default: {} }));
jest.unstable_mockModule('../models/User.js', () => ({ default: {} }));
jest.unstable_mockModule('../config/socket.js', () => ({ emitToUser: jest.fn() }));
jest.unstable_mockModule('../utils/logger.js', () => ({
  default: { error: jest.fn(), info: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

const { updateActivity } = await import('../controllers/activityController.js');

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
    mockChildFindByPk.mockResolvedValue({ schoolId: 'OTHER' });
    const req = { user: { role: 'teacher', schoolId: 's1', id: 't1' }, params: { id: 'a1' }, body: { description: 'x' } };
    const res = mkRes();
    await updateActivity(req, res);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(fakeUpdate).not.toHaveBeenCalled();
  });

  it('whitelists allowed fields and strips schoolId/childId from body', async () => {
    const fakeUpdate = jest.fn();
    const updated = {
      toJSON: () => ({ id: 'a1', description: 'updated', tasks: [], services: [] }),
    };
    mockActivityFindByPk.mockResolvedValueOnce({ childId: 'c1', update: fakeUpdate }).mockResolvedValueOnce(updated);
    mockChildFindByPk.mockResolvedValue({ schoolId: 's1', parentId: 'p1' });
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
