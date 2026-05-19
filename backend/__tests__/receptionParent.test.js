import { jest } from '@jest/globals';

const mockUserFindAll = jest.fn();
const mockUserFindOne = jest.fn();
const mockUserFindByPk = jest.fn();
const mockUserCreate = jest.fn();
const mockChildCreate = jest.fn();
const mockChildDestroy = jest.fn();
const mockGroupFindByPk = jest.fn();
const mockSchoolFindOne = jest.fn();
const mockSequelizeTransaction = jest.fn();

jest.unstable_mockModule('../models/User.js', () => ({
  default: { findAll: mockUserFindAll, findOne: mockUserFindOne, findByPk: mockUserFindByPk, create: mockUserCreate },
}));
jest.unstable_mockModule('../models/Child.js', () => ({
  default: { create: mockChildCreate, findAll: jest.fn().mockResolvedValue([]), findByPk: jest.fn(), destroy: mockChildDestroy },
}));
jest.unstable_mockModule('../models/Group.js', () => ({
  default: { findByPk: mockGroupFindByPk },
}));
jest.unstable_mockModule('../models/School.js', () => ({
  default: { findOne: mockSchoolFindOne },
}));
jest.unstable_mockModule('../models/TherapyUsage.js', () => ({
  default: { destroy: jest.fn().mockResolvedValue(0) },
}));
jest.unstable_mockModule('../models/Activity.js', () => ({
  default: { destroy: jest.fn().mockResolvedValue(0) },
}));
jest.unstable_mockModule('../models/Media.js', () => ({
  default: { destroy: jest.fn().mockResolvedValue(0) },
}));
jest.unstable_mockModule('../models/Meal.js', () => ({
  default: { destroy: jest.fn().mockResolvedValue(0) },
}));
jest.unstable_mockModule('../models/Progress.js', () => ({
  default: { destroy: jest.fn().mockResolvedValue(0) },
}));
jest.unstable_mockModule('../utils/logger.js', () => ({
  default: { error: jest.fn(), info: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));
jest.unstable_mockModule('../config/database.js', () => ({
  default: { transaction: mockSequelizeTransaction },
}));
jest.unstable_mockModule('../config/storage.js', () => ({
  uploadFile: jest.fn(),
  deleteFile: jest.fn(),
}));

const { getParents, deleteParent, createChildForParent } = await import('../controllers/receptionParentController.js');

const mkRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('receptionParentController.getParents', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns list of parents', async () => {
    mockUserFindAll.mockResolvedValue([{ id: 'p1' }]);
    const req = { user: { id: 'r1', schoolId: 's1' } };
    const res = mkRes();
    await getParents(req, res);
    expect(res.json).toHaveBeenCalled();
    const payload = res.json.mock.calls[0][0];
    expect(payload.success).toBe(true);
    expect(payload.data).toHaveLength(1);
  });

  it('500 on DB error', async () => {
    mockUserFindAll.mockRejectedValue(new Error('db fail'));
    const req = { user: { id: 'r1', schoolId: 's1' } };
    const res = mkRes();
    await getParents(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

describe('receptionParentController.deleteParent', () => {
  beforeEach(() => jest.clearAllMocks());

  it('404 when parent not found', async () => {
    mockUserFindOne.mockResolvedValue(null);
    const req = { params: { id: 'p1' }, user: { id: 'r1', schoolId: 's1' } };
    const res = mkRes();
    await deleteParent(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('success when parent and transaction complete', async () => {
    const fakeParent = { id: 'p1', destroy: jest.fn().mockResolvedValue(true) };
    mockUserFindOne.mockResolvedValue(fakeParent);
    mockSequelizeTransaction.mockImplementation(async (cb) => {
      await cb({ /* transaction */ });
    });
    mockChildDestroy.mockResolvedValue(1);
    const req = { params: { id: 'p1' }, user: { id: 'r1', schoolId: 's1' } };
    const res = mkRes();
    await deleteParent(req, res);
    expect(res.json).toHaveBeenCalled();
    const payload = res.json.mock.calls[0][0];
    expect(payload.success).toBe(true);
  });
});

describe('receptionParentController.createChildForParent', () => {
  beforeEach(() => jest.clearAllMocks());

  it('400 when parentId is missing', async () => {
    const req = { params: {}, body: {}, user: { id: 'r1', schoolId: 's1' }, files: {} };
    const res = mkRes();
    await createChildForParent(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('404 when parent not found', async () => {
    mockUserFindOne.mockResolvedValue(null);
    const req = { params: { id: 'p1' }, body: {}, user: { id: 'r1', schoolId: 's1' }, files: {} };
    const res = mkRes();
    await createChildForParent(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('400 when required child fields are missing', async () => {
    const fakeParent = { id: 'p1', schoolId: 's1' };
    mockUserFindOne.mockResolvedValue(fakeParent);
    const req = {
      params: { id: 'p1' },
      body: {},
      user: { id: 'r1', schoolId: 's1' },
      files: {},
    };
    const res = mkRes();
    await createChildForParent(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });
});
