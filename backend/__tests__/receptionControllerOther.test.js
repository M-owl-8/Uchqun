import { jest } from '@jest/globals';

const mockDocumentFindAll = jest.fn();
const mockMessageFindAll = jest.fn();

jest.unstable_mockModule('../models/Document.js', () => ({
  default: { create: jest.fn(), findAll: mockDocumentFindAll },
}));
jest.unstable_mockModule('../models/GovernmentMessage.js', () => ({
  default: { findAll: mockMessageFindAll },
}));
jest.unstable_mockModule('../config/storage.js', () => ({
  uploadFile: jest.fn(),
  deleteFile: jest.fn(),
}));
jest.unstable_mockModule('file-type', () => ({
  fileTypeFromBuffer: jest.fn(),
}));
jest.unstable_mockModule('fs', () => ({
  default: { promises: { readFile: jest.fn(), unlink: jest.fn().mockResolvedValue(undefined) } },
  promises: { readFile: jest.fn(), unlink: jest.fn().mockResolvedValue(undefined) },
}));
jest.unstable_mockModule('../utils/logger.js', () => ({
  default: { error: jest.fn(), info: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

const { getMyDocuments, getVerificationStatus, getMyMessages } = await import('../controllers/receptionController.js');

const mkRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('receptionController.getMyDocuments', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns list of documents (no filter)', async () => {
    mockDocumentFindAll.mockResolvedValue([{ id: 'd1' }, { id: 'd2' }]);
    const req = { user: { id: 'u1' }, query: {} };
    const res = mkRes();
    await getMyDocuments(req, res);
    expect(res.json).toHaveBeenCalled();
    const payload = res.json.mock.calls[0][0];
    expect(payload.success).toBe(true);
    expect(payload.data).toHaveLength(2);
    const where = mockDocumentFindAll.mock.calls[0][0].where;
    expect(where).not.toHaveProperty('status');
  });

  it('filters by ?status=pending', async () => {
    mockDocumentFindAll.mockResolvedValue([{ id: 'd1', status: 'pending' }]);
    const req = { user: { id: 'u1' }, query: { status: 'pending' } };
    const res = mkRes();
    await getMyDocuments(req, res);
    expect(res.json).toHaveBeenCalledWith({ success: true, data: expect.any(Array) });
    const where = mockDocumentFindAll.mock.calls[0][0].where;
    expect(where.status).toBe('pending');
    expect(where.userId).toBe('u1');
  });

  it('filters by ?status=approved', async () => {
    mockDocumentFindAll.mockResolvedValue([]);
    const req = { user: { id: 'u1' }, query: { status: 'approved' } };
    const res = mkRes();
    await getMyDocuments(req, res);
    const where = mockDocumentFindAll.mock.calls[0][0].where;
    expect(where.status).toBe('approved');
  });

  it('400 when status is invalid', async () => {
    // Revert-test baseline: without validation, an invalid status would pass through
    // to findAll and return 200 with unfiltered or empty results.
    // Post-fix: 400 before any DB call.
    const req = { user: { id: 'u1' }, query: { status: 'garbage' } };
    const res = mkRes();
    await getMyDocuments(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(mockDocumentFindAll).not.toHaveBeenCalled();
  });

  it('500 on DB error', async () => {
    mockDocumentFindAll.mockRejectedValue(new Error('db fail'));
    const req = { user: { id: 'u1' }, query: {} };
    const res = mkRes();
    await getMyDocuments(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

describe('receptionController.getVerificationStatus', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns verification status with document counts', async () => {
    const docs = [
      { status: 'pending' },
      { status: 'approved' },
      { status: 'approved' },
      { status: 'rejected' },
    ];
    mockDocumentFindAll.mockResolvedValue(docs);
    const req = { user: { id: 'u1', isVerified: false, documentsApproved: false, isActive: false } };
    const res = mkRes();
    await getVerificationStatus(req, res);
    expect(res.json).toHaveBeenCalled();
    const payload = res.json.mock.calls[0][0];
    expect(payload.success).toBe(true);
    expect(payload.data.documentsCount).toBe(4);
    expect(payload.data.pendingCount).toBe(1);
    expect(payload.data.approvedCount).toBe(2);
    expect(payload.data.rejectedCount).toBe(1);
  });

  it('500 on DB error', async () => {
    mockDocumentFindAll.mockRejectedValue(new Error('db fail'));
    const req = { user: { id: 'u1', isVerified: false } };
    const res = mkRes();
    await getVerificationStatus(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

describe('receptionController.getMyMessages', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns list of messages', async () => {
    mockMessageFindAll.mockResolvedValue([
      { toJSON: () => ({ id: 'm1', text: 'hello' }) },
    ]);
    const req = { user: { id: 'u1' } };
    const res = mkRes();
    await getMyMessages(req, res);
    expect(res.json).toHaveBeenCalled();
    const payload = res.json.mock.calls[0][0];
    expect(payload.success).toBe(true);
    expect(payload.data).toHaveLength(1);
  });

  it('500 on DB error', async () => {
    mockMessageFindAll.mockRejectedValue(new Error('db fail'));
    const req = { user: { id: 'u1' } };
    const res = mkRes();
    await getMyMessages(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});
