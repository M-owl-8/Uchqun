import { jest } from '@jest/globals';

const mockChildFindOne = jest.fn();
const mockChildUpdate = jest.fn();
const mockSchoolFindByPk = jest.fn();
const mockLogAudit = jest.fn();

jest.unstable_mockModule('../models/Child.js', () => ({
  default: { findOne: mockChildFindOne },
}));
jest.unstable_mockModule('../models/School.js', () => ({
  default: { findByPk: mockSchoolFindByPk },
}));
jest.unstable_mockModule('../models/User.js', () => ({ default: {} }));
jest.unstable_mockModule('../models/Group.js', () => ({ default: {} }));
jest.unstable_mockModule('../models/AuditLog.js', () => ({ default: {} }));
jest.unstable_mockModule('../config/storage.js', () => ({
  uploadFile: jest.fn(), deleteFile: jest.fn(),
}));
jest.unstable_mockModule('../config/socket.js', () => ({ emitToUser: jest.fn() }));
jest.unstable_mockModule('../utils/logger.js', () => ({
  default: { error: jest.fn(), info: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));
jest.unstable_mockModule('../utils/auditLogger.js', () => ({
  logAudit: mockLogAudit,
}));

const { transferChild } = await import('../controllers/childController.js');

const mkRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

const adminReq = (childId, toSchoolId, reason) => ({
  user: { id: 'a1', role: 'admin', schoolId: 's1' },
  params: { id: childId },
  body: { toSchoolId, reason },
});

describe('transferChild', () => {
  beforeEach(() => jest.clearAllMocks());

  it('transfers child to target school and returns 200 with schoolId', async () => {
    const mockChild = { id: 'c1', schoolId: 's1', update: mockChildUpdate };
    mockChildFindOne.mockResolvedValue(mockChild);
    mockSchoolFindByPk.mockResolvedValue({ id: 's2', name: 'New School' });
    mockChildUpdate.mockResolvedValue({ ...mockChild, schoolId: 's2' });

    const res = mkRes();
    await transferChild(adminReq('c1', 's2', 'family relocated'), res);

    expect(mockChildUpdate).toHaveBeenCalledWith({ schoolId: 's2' });
    expect(mockLogAudit).toHaveBeenCalledWith(expect.objectContaining({
      action: 'transfer',
      entity: 'children',
      meta: expect.objectContaining({ fromSchoolId: 's1', toSchoolId: 's2' }),
    }));
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });

  it('400 when toSchoolId is missing', async () => {
    const req = { user: { id: 'a1', role: 'admin', schoolId: 's1' }, params: { id: 'c1' }, body: {} };
    const res = mkRes();
    await transferChild(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      error: expect.objectContaining({ code: 'CHILD_TRANSFER_TARGET_REQUIRED' }),
    }));
  });

  it('403 when child does not belong to admin school', async () => {
    mockChildFindOne.mockResolvedValue(null);
    const res = mkRes();
    await transferChild(adminReq('c1', 's2'), res);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      error: expect.objectContaining({ code: 'CHILD_TRANSFER_NOT_IN_SCHOOL' }),
    }));
  });

  it('400 when toSchoolId equals the current schoolId', async () => {
    mockChildFindOne.mockResolvedValue({ id: 'c1', schoolId: 's1', update: mockChildUpdate });
    const res = mkRes();
    await transferChild(adminReq('c1', 's1'), res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      error: expect.objectContaining({ code: 'CHILD_TRANSFER_SAME_SCHOOL' }),
    }));
  });

  it('404 when target school does not exist', async () => {
    mockChildFindOne.mockResolvedValue({ id: 'c1', schoolId: 's1', update: mockChildUpdate });
    mockSchoolFindByPk.mockResolvedValue(null);
    const res = mkRes();
    await transferChild(adminReq('c1', 's-nonexistent'), res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      error: expect.objectContaining({ code: 'CHILD_TRANSFER_SCHOOL_NOT_FOUND' }),
    }));
  });

  it('403 when caller role is not admin (defense-in-depth)', async () => {
    const req = { user: { id: 'r1', role: 'reception', schoolId: 's1' }, params: { id: 'c1' }, body: { toSchoolId: 's2' } };
    const res = mkRes();
    await transferChild(req, res);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      error: expect.objectContaining({ code: 'CHILD_TRANSFER_FORBIDDEN' }),
    }));
  });

  it('writes audit log before update so transfer is always traceable', async () => {
    const mockChild = { id: 'c1', schoolId: 's1', update: mockChildUpdate };
    mockChildFindOne.mockResolvedValue(mockChild);
    mockSchoolFindByPk.mockResolvedValue({ id: 's2' });
    mockChildUpdate.mockRejectedValue(new Error('db down'));

    const res = mkRes();
    await transferChild(adminReq('c1', 's2'), res);

    // Audit was called even though update failed
    expect(mockLogAudit).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(500);
  });

  it('500 when DB throws on findOne', async () => {
    mockChildFindOne.mockRejectedValue(new Error('db error'));
    const res = mkRes();
    await transferChild(adminReq('c1', 's2'), res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      error: expect.objectContaining({ code: 'CHILD_TRANSFER_FAILED' }),
    }));
  });
});
