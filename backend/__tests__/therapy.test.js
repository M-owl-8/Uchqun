import { jest } from '@jest/globals';

const mockTherapyFindByPk = jest.fn();
const mockChildFindByPk = jest.fn();
const mockGroupFindAll = jest.fn();
const mockUserFindOne = jest.fn();
const mockTherapyUsageCreate = jest.fn();

jest.unstable_mockModule('../models/Therapy.js', () => ({
  default: { findByPk: mockTherapyFindByPk, findAll: jest.fn(), create: jest.fn() },
}));
jest.unstable_mockModule('../models/Child.js', () => ({
  default: { findByPk: mockChildFindByPk },
}));
jest.unstable_mockModule('../models/Group.js', () => ({
  default: { findAll: mockGroupFindAll },
}));
jest.unstable_mockModule('../models/User.js', () => ({
  default: { findOne: mockUserFindOne },
}));
jest.unstable_mockModule('../models/TherapyUsage.js', () => ({
  default: { create: mockTherapyUsageCreate, findAll: jest.fn(), findByPk: jest.fn() },
}));
jest.unstable_mockModule('../utils/logger.js', () => ({
  default: { error: jest.fn(), info: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

const { startTherapy } = await import('../controllers/therapyController.js');

const mkRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('therapyController.startTherapy', () => {
  beforeEach(() => jest.clearAllMocks());

  it('404 when therapy not found', async () => {
    mockTherapyFindByPk.mockResolvedValue(null);
    const req = { user: { id: 'p1', role: 'parent' }, params: { id: 't1' }, body: {} };
    const res = mkRes();
    await startTherapy(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('404 when childId provided but child not found', async () => {
    mockTherapyFindByPk.mockResolvedValue({ id: 't1', increment: jest.fn() });
    mockChildFindByPk.mockResolvedValue(null);
    const req = { user: { id: 'p1', role: 'parent' }, params: { id: 't1' }, body: { childId: 'c1' } };
    const res = mkRes();
    await startTherapy(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('parent: 403 when child belongs to another parent', async () => {
    mockTherapyFindByPk.mockResolvedValue({ id: 't1', increment: jest.fn() });
    mockChildFindByPk.mockResolvedValue({ id: 'c1', parentId: 'OTHER' });
    const req = { user: { id: 'p1', role: 'parent' }, params: { id: 't1' }, body: { childId: 'c1' } };
    const res = mkRes();
    await startTherapy(req, res);
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('parent: starts therapy when child is owned', async () => {
    const increment = jest.fn();
    mockTherapyFindByPk.mockResolvedValue({ id: 't1', increment });
    mockChildFindByPk.mockResolvedValue({ id: 'c1', parentId: 'p1' });
    mockTherapyUsageCreate.mockResolvedValue({ id: 'u1' });
    const req = { user: { id: 'p1', role: 'parent' }, params: { id: 't1' }, body: { childId: 'c1' } };
    const res = mkRes();
    await startTherapy(req, res);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(mockTherapyUsageCreate).toHaveBeenCalledWith(expect.objectContaining({
      therapyId: 't1', childId: 'c1', parentId: 'p1',
    }));
    expect(increment).toHaveBeenCalledWith('usageCount');
  });

  it('teacher: 403 when no group/parent assignment', async () => {
    mockTherapyFindByPk.mockResolvedValue({ id: 't1', increment: jest.fn() });
    mockChildFindByPk.mockResolvedValue({ id: 'c1', parentId: 'p1' });
    mockGroupFindAll.mockResolvedValue([]);
    mockUserFindOne.mockResolvedValue(null);
    const req = { user: { id: 't1', role: 'teacher' }, params: { id: 't1' }, body: { childId: 'c1' } };
    const res = mkRes();
    await startTherapy(req, res);
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('teacher: starts therapy when assigned via group', async () => {
    const increment = jest.fn();
    mockTherapyFindByPk.mockResolvedValue({ id: 't1', increment });
    mockChildFindByPk.mockResolvedValue({ id: 'c1', parentId: 'p1' });
    mockGroupFindAll.mockResolvedValue([{ id: 'g1' }]);
    mockUserFindOne.mockResolvedValue({ id: 'p1' });
    mockTherapyUsageCreate.mockResolvedValue({ id: 'u1' });
    const req = { user: { id: 't1', role: 'teacher' }, params: { id: 't1' }, body: { childId: 'c1' } };
    const res = mkRes();
    await startTherapy(req, res);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(mockTherapyUsageCreate).toHaveBeenCalledWith(expect.objectContaining({
      teacherId: 't1', parentId: 'p1',
    }));
  });

  it('admin: starts therapy for any child', async () => {
    mockTherapyFindByPk.mockResolvedValue({ id: 't1', increment: jest.fn() });
    mockChildFindByPk.mockResolvedValue({ id: 'c1', parentId: 'p1' });
    mockTherapyUsageCreate.mockResolvedValue({ id: 'u1' });
    const req = { user: { id: 'a1', role: 'admin' }, params: { id: 't1' }, body: { childId: 'c1' } };
    const res = mkRes();
    await startTherapy(req, res);
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it('rejects unknown role', async () => {
    mockTherapyFindByPk.mockResolvedValue({ id: 't1', increment: jest.fn() });
    mockChildFindByPk.mockResolvedValue({ id: 'c1', parentId: 'p1' });
    const req = { user: { id: 'u1', role: 'business' }, params: { id: 't1' }, body: { childId: 'c1' } };
    const res = mkRes();
    await startTherapy(req, res);
    expect(res.status).toHaveBeenCalledWith(403);
  });
});
