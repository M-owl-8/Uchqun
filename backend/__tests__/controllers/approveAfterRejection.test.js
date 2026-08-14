/**
 * D-52 — document rejection was a one-way door.
 *
 * approveDocument gated on `document.status !== 'pending'`, so a mistakenly
 * rejected document could never be approved. There is no un-reject endpoint and
 * no route returning a document to pending, and reception login requires
 * documentsApproved — so the reception stayed locked out of the product with no
 * path back through any UI. Restoring one during the P2 audit required direct
 * SQL.
 *
 * The reversal must also be legible afterwards: an approval that undoes a
 * rejection is audited as its own action, carrying the reason it overrode.
 */
import { jest } from '@jest/globals';

const mockDocumentFindByPk = jest.fn();
const mockDocumentFindAll = jest.fn();
const mockUserUpdate = jest.fn();
const mockLogAudit = jest.fn();
const mockEmitToUser = jest.fn();

jest.unstable_mockModule('../../models/Document.js', () => ({
  default: { findByPk: mockDocumentFindByPk, findAll: mockDocumentFindAll },
}));
jest.unstable_mockModule('../../models/User.js', () => ({
  default: { update: mockUserUpdate, findByPk: jest.fn(), findAll: jest.fn(), findOne: jest.fn() },
}));
jest.unstable_mockModule('../../utils/auditLogger.js', () => ({
  logAudit: mockLogAudit, getAuditHealth: jest.fn(), __resetAuditHealth: jest.fn(),
}));
jest.unstable_mockModule('../../config/socket.js', () => ({
  emitToUser: mockEmitToUser, getIO: jest.fn(), initSocket: jest.fn(),
}));

const { approveDocument } = await import('../../controllers/admin/adminReceptionController.js');

const mkRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

const mkDoc = (status, extra = {}) => ({
  id: 'doc-1', userId: 'rec-1', status,
  rejectionReason: status === 'rejected' ? 'Rasm juda xira' : null,
  reviewedBy: null, reviewedAt: null,
  user: { id: 'rec-1', createdBy: 'admin-1', role: 'reception' },
  save: jest.fn().mockResolvedValue(true),
  ...extra,
});

const req = { params: { id: 'doc-1' }, user: { id: 'admin-1', role: 'admin', schoolId: 's-1' } };

beforeEach(() => {
  [mockDocumentFindByPk, mockDocumentFindAll, mockUserUpdate, mockLogAudit, mockEmitToUser]
    .forEach((m) => m.mockReset());
  mockDocumentFindAll.mockResolvedValue([]);
});

describe('D-52 — a rejected document can be approved on review', () => {
  it('approves a rejected document instead of refusing with 400', async () => {
    const doc = mkDoc('rejected');
    mockDocumentFindByPk.mockResolvedValue(doc);
    const res = mkRes();

    await approveDocument(req, res);

    expect(res.status).not.toHaveBeenCalledWith(400);
    expect(doc.status).toBe('approved');
    expect(doc.save).toHaveBeenCalled();
  });

  it('clears the stale rejection reason', async () => {
    const doc = mkDoc('rejected');
    mockDocumentFindByPk.mockResolvedValue(doc);

    await approveDocument(req, mkRes());

    // an approved document carrying "Rasm juda xira" would be read by the
    // reception as a rejection that had somehow stuck
    expect(doc.rejectionReason).toBeNull();
  });

  it('records the reversal as its own audit action, with what it overrode', async () => {
    const doc = mkDoc('rejected');
    mockDocumentFindByPk.mockResolvedValue(doc);

    await approveDocument(req, mkRes());

    expect(mockLogAudit).toHaveBeenCalledWith(expect.objectContaining({
      action: 'approve_after_rejection',
      entity: 'documents',
      entityId: 'doc-1',
      actorId: 'admin-1',
      meta: expect.objectContaining({ previousRejectionReason: 'Rasm juda xira' }),
    }));
  });

  it('a plain pending approval is still audited as a plain approval', async () => {
    const doc = mkDoc('pending');
    mockDocumentFindByPk.mockResolvedValue(doc);

    await approveDocument(req, mkRes());

    expect(mockLogAudit).toHaveBeenCalledWith(expect.objectContaining({ action: 'approve' }));
    expect(doc.status).toBe('approved');
  });

  it('an already-approved document is still refused — reversal is not re-approval', async () => {
    const doc = mkDoc('approved');
    mockDocumentFindByPk.mockResolvedValue(doc);
    const res = mkRes();

    await approveDocument(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(doc.save).not.toHaveBeenCalled();
  });

  it('the ownership boundary still holds for a rejected document', async () => {
    // the reversal path must not become a way around the createdBy check
    const doc = mkDoc('rejected', { user: { id: 'rec-1', createdBy: 'some-other-admin' } });
    mockDocumentFindByPk.mockResolvedValue(doc);
    const res = mkRes();

    await approveDocument(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(doc.save).not.toHaveBeenCalled();
    expect(mockLogAudit).not.toHaveBeenCalled();
  });
});
