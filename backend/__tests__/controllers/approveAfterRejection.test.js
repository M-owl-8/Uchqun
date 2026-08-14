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
const mockUserFindByPk = jest.fn();
jest.unstable_mockModule('../../models/User.js', () => ({
  default: { update: mockUserUpdate, findByPk: mockUserFindByPk, findAll: jest.fn(), findOne: jest.fn() },
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
  [mockDocumentFindByPk, mockDocumentFindAll, mockUserUpdate, mockLogAudit, mockEmitToUser, mockUserFindByPk]
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

/**
 * D-60 — the mirror defect, found while verifying D-52 on production.
 *
 * rejectDocument gated on `status !== 'pending'` too, so an APPROVED document
 * could never be rejected. A reception approved on a wrong, expired or forged
 * identification kept full access permanently, with no revocation path in the
 * product at all. That is the more dangerous direction of the same one-way
 * door: D-52 wrongly denied access, D-60 wrongly grants it.
 */
const { rejectDocument } = await import('../../controllers/admin/adminReceptionController.js');

describe('D-60 — an approved document can be rejected on re-review', () => {
  const rreq = {
    params: { id: 'doc-1' },
    body: { rejectionReason: 'Hujjat muddati tugagan' },
    user: { id: 'admin-1', role: 'admin', schoolId: 's-1' },
  };

  const reception = () => ({
    id: 'rec-1', documentsApproved: true, isActive: true,
    save: jest.fn().mockResolvedValue(true),
  });

  it('rejects an approved document instead of refusing with 400', async () => {
    const doc = mkDoc('approved');
    mockDocumentFindByPk.mockResolvedValueOnce(doc).mockResolvedValue(doc);
    mockUserFindByPk.mockResolvedValue(Object.assign(reception(), { createdBy: 'admin-1' }));
    const res = mkRes();

    await rejectDocument(rreq, res);

    expect(res.status).not.toHaveBeenCalledWith(400);
    expect(doc.status).toBe('rejected');
  });

  it('revoking an approval is audited as its own action', async () => {
    const doc = mkDoc('approved');
    mockDocumentFindByPk.mockResolvedValueOnce(doc).mockResolvedValue(doc);
    mockUserFindByPk.mockResolvedValue(Object.assign(reception(), { createdBy: 'admin-1' }));

    await rejectDocument(rreq, mkRes());

    expect(mockLogAudit).toHaveBeenCalledWith(expect.objectContaining({
      action: 'reject_after_approval',
      meta: expect.objectContaining({ revokedApproval: true }),
    }));
  });

  it('revocation actually removes the access the approval granted', async () => {
    const doc = mkDoc('approved');
    const rec = Object.assign(reception(), { createdBy: 'admin-1' });
    mockDocumentFindByPk.mockResolvedValueOnce(doc).mockResolvedValue(doc);
    mockUserFindByPk.mockResolvedValue(rec);

    await rejectDocument(rreq, mkRes());

    // the point of the fix: not just a status string, but the access itself
    expect(rec.documentsApproved).toBe(false);
    expect(rec.isActive).toBe(false);
  });

  it('a plain pending rejection is still audited as a plain rejection', async () => {
    const doc = mkDoc('pending');
    mockDocumentFindByPk.mockResolvedValueOnce(doc).mockResolvedValue(doc);
    mockUserFindByPk.mockResolvedValue(Object.assign(reception(), { createdBy: 'admin-1' }));

    await rejectDocument(rreq, mkRes());

    expect(mockLogAudit).toHaveBeenCalledWith(expect.objectContaining({ action: 'reject' }));
  });

  it('an already-rejected document is still refused', async () => {
    const doc = mkDoc('rejected');
    mockDocumentFindByPk.mockResolvedValue(doc);
    mockUserFindByPk.mockResolvedValue(Object.assign(reception(), { createdBy: 'admin-1' }));
    const res = mkRes();

    await rejectDocument(rreq, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(doc.save).not.toHaveBeenCalled();
  });

  it('the ownership boundary still holds on the revocation path', async () => {
    const doc = mkDoc('approved');
    mockDocumentFindByPk.mockResolvedValue(doc);
    mockUserFindByPk.mockResolvedValue(Object.assign(reception(), { createdBy: 'another-admin' }));
    const res = mkRes();

    await rejectDocument(rreq, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(mockLogAudit).not.toHaveBeenCalled();
  });
});
