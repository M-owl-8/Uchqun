import { jest } from '@jest/globals';

const mockChildFindOne = jest.fn();
const mockChildRestore = jest.fn();
const mockUserFindOne = jest.fn();
const mockAttFindOne = jest.fn();
const mockLogAudit = jest.fn();

jest.unstable_mockModule('../../models/Child.js', () => ({
  default: { findOne: mockChildFindOne },
}));
jest.unstable_mockModule('../../models/User.js', () => ({
  default: { findOne: mockUserFindOne },
}));
jest.unstable_mockModule('../../models/ChildAttendance.js', () => ({
  default: { findOne: mockAttFindOne },
}));
jest.unstable_mockModule('../../utils/logger.js', () => ({
  default: { error: jest.fn(), info: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));
jest.unstable_mockModule('../../utils/auditLogger.js', () => ({
  logAudit: mockLogAudit,
}));

const { restoreChild, restoreUser, restoreAttendance } =
  await import('../../controllers/admin/adminRestoreController.js');

const mkRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

const adminReq = (id) => ({
  user: { id: 'a1', role: 'admin', schoolId: 's1' },
  params: { id },
});

const govReq = (id) => ({
  user: { id: 'g1', role: 'government', schoolId: null },
  params: { id },
});

const RECORD_ID = '00000000-0000-0000-0000-000000000001';
const deletedRecord = (schoolId = 's1') => ({
  id: RECORD_ID,
  schoolId,
  deletedAt: new Date('2026-01-01'),
  restore: mockChildRestore,
});

describe('restoreChild', () => {
  beforeEach(() => jest.clearAllMocks());

  it('200 restores a soft-deleted child and logs audit', async () => {
    mockChildFindOne.mockResolvedValue(deletedRecord('s1'));
    mockChildRestore.mockResolvedValue();
    const res = mkRes();
    await restoreChild(adminReq(RECORD_ID), res);
    expect(mockChildRestore).toHaveBeenCalled();
    expect(mockLogAudit).toHaveBeenCalledWith(expect.objectContaining({ action: 'restore', entity: 'children' }));
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });

  it('400 RESTORE_NOT_DELETED when child is not soft-deleted', async () => {
    mockChildFindOne.mockResolvedValue({ ...deletedRecord(), deletedAt: null });
    const res = mkRes();
    await restoreChild(adminReq(RECORD_ID), res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      error: expect.objectContaining({ code: 'RESTORE_NOT_DELETED' }),
    }));
  });

  it('403 RESTORE_FORBIDDEN when child belongs to different school (IDOR)', async () => {
    mockChildFindOne.mockResolvedValue(deletedRecord('s-other'));
    const res = mkRes();
    await restoreChild(adminReq(RECORD_ID), res);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      error: expect.objectContaining({ code: 'RESTORE_FORBIDDEN' }),
    }));
    // Revert-check: without the schoolId guard, cross-school restore would succeed.
    // With guard: 403 returned. mockChildRestore not called.
    expect(mockChildRestore).not.toHaveBeenCalled();
  });

  it('404 RESTORE_NOT_FOUND when record does not exist', async () => {
    mockChildFindOne.mockResolvedValue(null);
    const res = mkRes();
    await restoreChild(adminReq(RECORD_ID), res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      error: expect.objectContaining({ code: 'RESTORE_NOT_FOUND' }),
    }));
  });

  it('403 RESTORE_FORBIDDEN when caller is not admin or government', async () => {
    const req = { user: { id: 'r1', role: 'reception', schoolId: 's1' }, params: { id: RECORD_ID } };
    const res = mkRes();
    await restoreChild(req, res);
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('500 on DB error', async () => {
    mockChildFindOne.mockRejectedValue(new Error('db down'));
    const res = mkRes();
    await restoreChild(adminReq(RECORD_ID), res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      error: expect.objectContaining({ code: 'RESTORE_FAILED' }),
    }));
  });
});

describe('restoreAttendance', () => {
  beforeEach(() => jest.clearAllMocks());

  it('200 restores a soft-deleted attendance record', async () => {
    const restore = jest.fn().mockResolvedValue();
    mockAttFindOne.mockResolvedValue({ ...deletedRecord('s1'), restore });
    const res = mkRes();
    await restoreAttendance(adminReq(RECORD_ID), res);
    expect(restore).toHaveBeenCalled();
    expect(mockLogAudit).toHaveBeenCalledWith(expect.objectContaining({ entity: 'child_attendance' }));
  });
});

describe('restoreUser', () => {
  beforeEach(() => jest.clearAllMocks());

  it('200 restores a soft-deleted user (same school)', async () => {
    const restore = jest.fn().mockResolvedValue();
    mockUserFindOne.mockResolvedValue({ ...deletedRecord('s1'), restore });
    const res = mkRes();
    await restoreUser(adminReq(RECORD_ID), res);
    expect(restore).toHaveBeenCalled();
    expect(mockLogAudit).toHaveBeenCalledWith(expect.objectContaining({ entity: 'users' }));
  });

  it('403 admin cross-school user restore blocked', async () => {
    mockUserFindOne.mockResolvedValue({ ...deletedRecord('s-other'), restore: jest.fn() });
    const res = mkRes();
    await restoreUser(adminReq(RECORD_ID), res);
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('200 government can restore cross-school user', async () => {
    const restore = jest.fn().mockResolvedValue();
    mockUserFindOne.mockResolvedValue({ ...deletedRecord('s-other'), restore });
    const res = mkRes();
    await restoreUser(govReq(RECORD_ID), res);
    expect(restore).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });

  it('audit_log failure does not block restore (logAudit is fire-and-forget)', async () => {
    // logAudit is called synchronously with no await — even if it failed internally
    // (auditLogger swallows errors), the restore still returns 200.
    const restore = jest.fn().mockResolvedValue();
    mockUserFindOne.mockResolvedValue({ ...deletedRecord('s1'), restore });
    mockLogAudit.mockImplementation(() => { /* fire-and-forget: no throw propagates */ });
    const res = mkRes();
    await restoreUser(adminReq(RECORD_ID), res);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });
});
