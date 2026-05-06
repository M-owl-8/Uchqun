import { jest } from '@jest/globals';

const mockChildFindAll = jest.fn();
const mockUserFindByPk = jest.fn();
const mockUserFindOne = jest.fn();
const mockSAMFindAll = jest.fn();
const mockPACount = jest.fn();
const mockPMCount = jest.fn();
const mockPMedCount = jest.fn();
const mockPAFindAll = jest.fn();
const mockPMFindAll = jest.fn();
const mockPMedFindAll = jest.fn();

jest.unstable_mockModule('../models/Child.js', () => ({
  default: { findAll: mockChildFindAll },
}));
jest.unstable_mockModule('../models/User.js', () => ({
  default: { findByPk: mockUserFindByPk, findOne: mockUserFindOne },
}));
jest.unstable_mockModule('../models/Group.js', () => ({ default: {} }));
jest.unstable_mockModule('../models/SuperAdminMessage.js', () => ({
  default: { findAll: mockSAMFindAll },
}));
jest.unstable_mockModule('../models/ParentActivity.js', () => ({
  default: { count: mockPACount, findAll: mockPAFindAll },
}));
jest.unstable_mockModule('../models/ParentMeal.js', () => ({
  default: { count: mockPMCount, findAll: mockPMFindAll },
}));
jest.unstable_mockModule('../models/ParentMedia.js', () => ({
  default: { count: mockPMedCount, findAll: mockPMedFindAll },
}));
jest.unstable_mockModule('../utils/logger.js', () => ({
  default: { error: jest.fn(), info: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

const { getMyChildren } = await import('../controllers/parent/parentChildController.js');
const { getMyMessages } = await import('../controllers/parent/parentMessageController.js');
const { getMyProfile, getParentData } = await import('../controllers/parent/parentProfileController.js');

const mkRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('parentChildController.getMyChildren', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns parents children scoped by parentId', async () => {
    mockChildFindAll.mockResolvedValue([{ id: 'c1' }]);
    const req = { user: { id: 'p1' } };
    const res = mkRes();
    await getMyChildren(req, res);
    expect(mockChildFindAll).toHaveBeenCalledWith(expect.objectContaining({
      where: { parentId: 'p1' },
    }));
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ data: [{ id: 'c1' }] }));
  });

  it('500 on DB error', async () => {
    mockChildFindAll.mockRejectedValue(new Error('boom'));
    const req = { user: { id: 'p1' } };
    const res = mkRes();
    await getMyChildren(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

describe('parentMessageController.getMyMessages', () => {
  beforeEach(() => jest.clearAllMocks());

  it('scopes to senderId', async () => {
    mockSAMFindAll.mockResolvedValue([{ toJSON: () => ({ id: 'm1' }) }]);
    const req = { user: { id: 'p1' } };
    const res = mkRes();
    await getMyMessages(req, res);
    expect(mockSAMFindAll).toHaveBeenCalledWith(expect.objectContaining({
      where: { senderId: 'p1' },
    }));
  });
});

describe('parentProfileController.getMyProfile', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns user + counts of activities/meals/media', async () => {
    mockUserFindByPk.mockResolvedValue({ id: 'p1', toJSON: () => ({ id: 'p1' }) });
    mockPACount.mockResolvedValue(5);
    mockPMCount.mockResolvedValue(3);
    mockPMedCount.mockResolvedValue(2);
    const req = { user: { id: 'p1' } };
    const res = mkRes();
    await getMyProfile(req, res);
    const payload = res.json.mock.calls[0][0];
    expect(payload.data.summary).toEqual({ activitiesCount: 5, mealsCount: 3, mediaCount: 2 });
  });
});

describe('parentProfileController.getParentData', () => {
  beforeEach(() => jest.clearAllMocks());

  it('404 when parent not in scope', async () => {
    mockUserFindOne.mockResolvedValue(null);
    const req = { user: { schoolId: 's1' }, params: { parentId: 'p1' } };
    const res = mkRes();
    await getParentData(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('returns 10-item windows of activities/meals/media', async () => {
    mockUserFindOne.mockResolvedValue({ id: 'p1', toJSON: () => ({ id: 'p1' }) });
    mockPAFindAll.mockResolvedValue([{ id: 'a1' }]);
    mockPMFindAll.mockResolvedValue([{ id: 'm1' }]);
    mockPMedFindAll.mockResolvedValue([{ id: 'med1' }]);
    const req = { user: { schoolId: 's1' }, params: { parentId: 'p1' } };
    const res = mkRes();
    await getParentData(req, res);
    expect(mockPAFindAll).toHaveBeenCalledWith(expect.objectContaining({ limit: 10 }));
    expect(mockPMFindAll).toHaveBeenCalledWith(expect.objectContaining({ limit: 10 }));
    expect(mockPMedFindAll).toHaveBeenCalledWith(expect.objectContaining({ limit: 10 }));
  });

  it('scopes by req.user.schoolId when present', async () => {
    mockUserFindOne.mockResolvedValue(null);
    const req = { user: { schoolId: 's1' }, params: { parentId: 'p1' } };
    const res = mkRes();
    await getParentData(req, res);
    const where = mockUserFindOne.mock.calls[0][0].where;
    expect(where.schoolId).toBe('s1');
  });
});
