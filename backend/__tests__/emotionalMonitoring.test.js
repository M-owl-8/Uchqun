import { jest } from '@jest/globals';

const mockChildFindByPk = jest.fn();
const mockUserFindOne = jest.fn();
const mockGroupFindOne = jest.fn();
const mockEmFindOne = jest.fn();
const mockEmCreate = jest.fn();
const mockEmFindByPk = jest.fn();

jest.unstable_mockModule('../models/Child.js', () => ({
  default: { findByPk: mockChildFindByPk },
}));
jest.unstable_mockModule('../models/User.js', () => ({
  default: { findOne: mockUserFindOne },
}));
jest.unstable_mockModule('../models/Group.js', () => ({
  default: { findOne: mockGroupFindOne },
}));
jest.unstable_mockModule('../models/EmotionalMonitoring.js', () => ({
  default: {
    findOne: mockEmFindOne,
    create: mockEmCreate,
    findByPk: mockEmFindByPk,
    findAll: jest.fn(),
  },
}));
jest.unstable_mockModule('../utils/logger.js', () => ({
  default: { error: jest.fn(), info: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

const { createOrUpdateMonitoring } = await import('../controllers/emotionalMonitoringController.js');

const mkRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('emotionalMonitoringController.createOrUpdateMonitoring', () => {
  beforeEach(() => jest.clearAllMocks());

  it('400 when childId or date missing', async () => {
    const req = { method: 'POST', user: { id: 't1', role: 'teacher' }, params: {}, body: {} };
    const res = mkRes();
    await createOrUpdateMonitoring(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('404 when child not found', async () => {
    mockChildFindByPk.mockResolvedValue(null);
    const req = {
      method: 'POST',
      user: { id: 't1', role: 'teacher' },
      params: {},
      body: { childId: 'c1', date: '2026-05-06' },
    };
    const res = mkRes();
    await createOrUpdateMonitoring(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('teacher allowed via legacy parent.teacherId assignment', async () => {
    mockChildFindByPk.mockResolvedValue({ id: 'c1', parentId: 'p1', groupId: null });
    mockUserFindOne.mockResolvedValue({ id: 'p1', teacherId: 't1' });
    mockEmFindOne.mockResolvedValue(null);
    mockEmCreate.mockResolvedValue({ id: 'em1' });
    mockEmFindByPk.mockResolvedValue({ id: 'em1' });
    const req = {
      method: 'POST',
      user: { id: 't1', role: 'teacher' },
      params: {},
      body: { childId: 'c1', date: '2026-05-06' },
    };
    const res = mkRes();
    await createOrUpdateMonitoring(req, res);
    expect(res.status).not.toHaveBeenCalledWith(403);
  });

  it('teacher allowed via group assignment when no direct parent.teacherId match', async () => {
    mockChildFindByPk.mockResolvedValue({ id: 'c1', parentId: 'p1', groupId: 'g1' });
    mockUserFindOne.mockResolvedValue(null);
    mockGroupFindOne.mockResolvedValue({ id: 'g1', teacherId: 't1' });
    mockEmFindOne.mockResolvedValue(null);
    mockEmCreate.mockResolvedValue({ id: 'em1' });
    mockEmFindByPk.mockResolvedValue({ id: 'em1' });
    const req = {
      method: 'POST',
      user: { id: 't1', role: 'teacher' },
      params: {},
      body: { childId: 'c1', date: '2026-05-06' },
    };
    const res = mkRes();
    await createOrUpdateMonitoring(req, res);
    expect(res.status).not.toHaveBeenCalledWith(403);
  });

  it('teacher denied when neither parent.teacherId nor group match', async () => {
    mockChildFindByPk.mockResolvedValue({ id: 'c1', parentId: 'p1', groupId: 'g1' });
    mockUserFindOne.mockResolvedValue(null);
    mockGroupFindOne.mockResolvedValue(null);
    const req = {
      method: 'POST',
      user: { id: 't1', role: 'teacher' },
      params: {},
      body: { childId: 'c1', date: '2026-05-06' },
    };
    const res = mkRes();
    await createOrUpdateMonitoring(req, res);
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('government bypasses teacher access check', async () => {
    mockChildFindByPk.mockResolvedValue({ id: 'c1', parentId: 'p1', groupId: 'g1' });
    mockEmFindOne.mockResolvedValue(null);
    mockEmCreate.mockResolvedValue({ id: 'em1' });
    mockEmFindByPk.mockResolvedValue({ id: 'em1' });
    const req = {
      method: 'POST',
      user: { id: 'g1', role: 'government' },
      params: {},
      body: { childId: 'c1', date: '2026-05-06' },
    };
    const res = mkRes();
    await createOrUpdateMonitoring(req, res);
    expect(mockUserFindOne).not.toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalledWith(403);
  });

  it('admin bypasses teacher access check', async () => {
    mockChildFindByPk.mockResolvedValue({ id: 'c1', parentId: 'p1', groupId: 'g1' });
    mockEmFindOne.mockResolvedValue(null);
    mockEmCreate.mockResolvedValue({ id: 'em1' });
    mockEmFindByPk.mockResolvedValue({ id: 'em1' });
    const req = {
      method: 'POST',
      user: { id: 'a1', role: 'admin' },
      params: {},
      body: { childId: 'c1', date: '2026-05-06' },
    };
    const res = mkRes();
    await createOrUpdateMonitoring(req, res);
    expect(mockUserFindOne).not.toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalledWith(403);
  });
});
