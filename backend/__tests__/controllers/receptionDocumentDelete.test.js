/**
 * Reception document DELETE endpoint tests — U-4 RE-15
 *
 * New endpoint: DELETE /reception/documents/:id
 * Guards: ownership (403 DOCUMENT_ACCESS_DENIED) + pending-only (400 DOCUMENT_CANNOT_DELETE_NON_PENDING)
 *
 * Revert-test:
 *   [REVERT-TEST RE-15 ownership] user-B deletes user-A's document → 403
 */
import { jest } from '@jest/globals';

const DOC_ID = 'dddd0000-0000-0000-0000-000000000001';
const USER_A = 'uuuu0000-0000-0000-0000-000000000001';
const USER_B = 'uuuu0000-0000-0000-0000-000000000002';

const mockDocFindByPk = jest.fn();
const mockDocDestroy = jest.fn();

jest.unstable_mockModule('../../models/Document.js', () => ({
  default: { findByPk: mockDocFindByPk },
}));

jest.unstable_mockModule('../../models/GovernmentMessage.js', () => ({
  default: { findAll: jest.fn() },
}));

jest.unstable_mockModule('../../utils/logger.js', () => ({
  default: { error: jest.fn(), info: jest.fn(), warn: jest.fn() },
}));

jest.unstable_mockModule('../../config/storage.js', () => ({
  uploadFile: jest.fn(),
  deleteFile: jest.fn(),
}));

jest.unstable_mockModule('file-type', () => ({ fileTypeFromBuffer: jest.fn() }));
jest.unstable_mockModule('fs', () => ({
  default: { promises: { readFile: jest.fn(), unlink: jest.fn() }, readFileSync: jest.fn() },
}));

const { deleteDocument } = await import('../../controllers/receptionController.js');

const mkRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

const mkReq = (userId, docId = DOC_ID) => ({
  user: { id: userId, role: 'reception' },
  params: { id: docId },
});

const makeDoc = (userId, status) => ({
  id: DOC_ID,
  userId,
  status,
  destroy: mockDocDestroy.mockResolvedValue(true),
});

beforeEach(() => jest.clearAllMocks());

it('returns 404 when document not found', async () => {
  mockDocFindByPk.mockResolvedValue(null);
  const res = mkRes();
  await deleteDocument(mkReq(USER_A), res);
  expect(res.status).toHaveBeenCalledWith(404);
  expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
    error: expect.objectContaining({ code: 'DOCUMENT_NOT_FOUND' }),
  }));
});

it('[REVERT-TEST RE-15 ownership] user-B cannot delete user-A document → 403', async () => {
  mockDocFindByPk.mockResolvedValue(makeDoc(USER_A, 'pending'));
  const res = mkRes();
  await deleteDocument(mkReq(USER_B), res);
  expect(res.status).toHaveBeenCalledWith(403);
  expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
    error: expect.objectContaining({ code: 'DOCUMENT_ACCESS_DENIED' }),
  }));
  expect(mockDocDestroy).not.toHaveBeenCalled();
});

it('returns 400 when document status is approved', async () => {
  mockDocFindByPk.mockResolvedValue(makeDoc(USER_A, 'approved'));
  const res = mkRes();
  await deleteDocument(mkReq(USER_A), res);
  expect(res.status).toHaveBeenCalledWith(400);
  expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
    error: expect.objectContaining({ code: 'DOCUMENT_CANNOT_DELETE_NON_PENDING' }),
  }));
  expect(mockDocDestroy).not.toHaveBeenCalled();
});

it('returns 400 when document status is rejected', async () => {
  mockDocFindByPk.mockResolvedValue(makeDoc(USER_A, 'rejected'));
  const res = mkRes();
  await deleteDocument(mkReq(USER_A), res);
  expect(res.status).toHaveBeenCalledWith(400);
  expect(mockDocDestroy).not.toHaveBeenCalled();
});

it('deletes a pending document owned by the caller and returns 200', async () => {
  mockDocFindByPk.mockResolvedValue(makeDoc(USER_A, 'pending'));
  const res = mkRes();
  await deleteDocument(mkReq(USER_A), res);
  expect(mockDocDestroy).toHaveBeenCalledTimes(1);
  expect(res.json).toHaveBeenCalledWith({ success: true });
});
