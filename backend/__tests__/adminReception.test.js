import { jest } from '@jest/globals';

const mockDocFindByPk = jest.fn();
const mockDocFindAll = jest.fn();
const mockUserFindByPk = jest.fn();
const mockUserFindAll = jest.fn();
const mockUserFindOne = jest.fn();
const mockUserCreate = jest.fn();

jest.unstable_mockModule('../models/Document.js', () => ({
  default: { findByPk: mockDocFindByPk, findAll: mockDocFindAll },
}));
jest.unstable_mockModule('../models/User.js', () => ({
  default: {
    findByPk: mockUserFindByPk,
    findAll: mockUserFindAll,
    findOne: mockUserFindOne,
    create: mockUserCreate,
  },
}));
jest.unstable_mockModule('../utils/logger.js', () => ({
  default: { error: jest.fn(), info: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

const {
  approveDocument, rejectDocument, activateReception, deactivateReception, updateReception,
  getDocuments,
} = await import('../controllers/admin/adminReceptionController.js');

const mkRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('admin/adminReceptionController', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('approveDocument', () => {
    it('404 when not found', async () => {
      mockDocFindByPk.mockResolvedValue(null);
      const req = { user: { id: 'a1' }, params: { id: 'd1' } };
      const res = mkRes();
      await approveDocument(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('403 when document user not created by this admin', async () => {
      mockDocFindByPk.mockResolvedValue({ id: 'd1', user: { createdBy: 'OTHER' } });
      const req = { user: { id: 'a1' }, params: { id: 'd1' } };
      const res = mkRes();
      await approveDocument(req, res);
      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('400 when document not pending', async () => {
      mockDocFindByPk.mockResolvedValue({
        id: 'd1', status: 'approved', user: { createdBy: 'a1' },
      });
      const req = { user: { id: 'a1' }, params: { id: 'd1' } };
      const res = mkRes();
      await approveDocument(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('approves and activates reception when all docs are approved', async () => {
      const docSave = jest.fn().mockResolvedValue();
      const recSave = jest.fn().mockResolvedValue();
      const document = {
        id: 'd1', status: 'pending', userId: 'r1', user: { createdBy: 'a1' }, save: docSave,
      };
      mockDocFindByPk
        .mockResolvedValueOnce(document)
        .mockResolvedValueOnce({ id: 'd1', status: 'approved' });
      mockDocFindAll.mockResolvedValue([{ status: 'approved' }, { status: 'approved' }]);
      mockUserFindByPk.mockResolvedValue({
        id: 'r1', email: 'r@x.com',
        documentsApproved: false, isActive: false,
        save: recSave,
      });
      const req = { user: { id: 'a1' }, params: { id: 'd1' } };
      const res = mkRes();
      await approveDocument(req, res);
      expect(document.status).toBe('approved');
      expect(docSave).toHaveBeenCalled();
      expect(recSave).toHaveBeenCalled();
    });
  });

  describe('rejectDocument', () => {
    it('400 when rejectionReason missing', async () => {
      const req = { user: { id: 'a1' }, params: { id: 'd1' }, body: {} };
      const res = mkRes();
      await rejectDocument(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('404 when not found', async () => {
      mockDocFindByPk.mockResolvedValue(null);
      const req = { user: { id: 'a1' }, params: { id: 'd1' }, body: { rejectionReason: 'bad' } };
      const res = mkRes();
      await rejectDocument(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('403 when document user not under this admin', async () => {
      mockDocFindByPk.mockResolvedValue({ id: 'd1', userId: 'r1' });
      mockUserFindByPk.mockResolvedValue({ id: 'r1', createdBy: 'OTHER' });
      const req = { user: { id: 'a1' }, params: { id: 'd1' }, body: { rejectionReason: 'bad' } };
      const res = mkRes();
      await rejectDocument(req, res);
      expect(res.status).toHaveBeenCalledWith(403);
    });
  });

  describe('activateReception', () => {
    it('404 when not found', async () => {
      mockUserFindOne.mockResolvedValue(null);
      const req = { user: { id: 'a1' }, params: { id: 'r1' } };
      const res = mkRes();
      await activateReception(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('activates reception when found', async () => {
      const save = jest.fn().mockResolvedValue();
      mockUserFindOne.mockResolvedValue({
        id: 'r1', isActive: false, documentsApproved: false, save, toJSON: () => ({}),
      });
      const req = { user: { id: 'a1' }, params: { id: 'r1' } };
      const res = mkRes();
      await activateReception(req, res);
      expect(save).toHaveBeenCalled();
    });
  });

  describe('deactivateReception', () => {
    it('404 when not found', async () => {
      mockUserFindOne.mockResolvedValue(null);
      const req = { user: { id: 'a1' }, params: { id: 'r1' } };
      const res = mkRes();
      await deactivateReception(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  describe('getDocuments', () => {
    it('200 returns all documents when no status filter', async () => {
      mockDocFindAll.mockResolvedValue([{ id: 'd1', status: 'pending' }, { id: 'd2', status: 'approved' }]);
      const req = { user: { id: 'a1' }, query: {} };
      const res = mkRes();
      await getDocuments(req, res);
      expect(res.json).toHaveBeenCalledWith({ success: true, data: expect.any(Array) });
      const call = mockDocFindAll.mock.calls[0][0];
      expect(call.where).not.toHaveProperty('status');
    });

    it('200 returns only approved docs when ?status=approved', async () => {
      mockDocFindAll.mockResolvedValue([{ id: 'd2', status: 'approved' }]);
      const req = { user: { id: 'a1' }, query: { status: 'approved' } };
      const res = mkRes();
      await getDocuments(req, res);
      expect(res.json).toHaveBeenCalledWith({ success: true, data: expect.any(Array) });
      const call = mockDocFindAll.mock.calls[0][0];
      expect(call.where.status).toBe('approved');
    });

    it('200 returns only rejected docs when ?status=rejected', async () => {
      mockDocFindAll.mockResolvedValue([{ id: 'd3', status: 'rejected' }]);
      const req = { user: { id: 'a1' }, query: { status: 'rejected' } };
      const res = mkRes();
      await getDocuments(req, res);
      expect(res.json).toHaveBeenCalledWith({ success: true, data: expect.any(Array) });
      const call = mockDocFindAll.mock.calls[0][0];
      expect(call.where.status).toBe('rejected');
    });

    it('400 when status value is invalid', async () => {
      const req = { user: { id: 'a1' }, query: { status: 'unknown' } };
      const res = mkRes();
      await getDocuments(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(mockDocFindAll).not.toHaveBeenCalled();
    });

    it('admin isolation — include where scopes by createdBy', async () => {
      // Revert-test baseline: without the include.where.createdBy filter, documents
      // belonging to other admins' receptions would be returned.
      // Post-fix: include join on User enforces createdBy = req.user.id tenant boundary.
      mockDocFindAll.mockResolvedValue([]);
      const req = { user: { id: 'admin-X' }, query: {} };
      const res = mkRes();
      await getDocuments(req, res);
      const call = mockDocFindAll.mock.calls[0][0];
      const userInclude = call.include.find(i => i.as === 'user');
      expect(userInclude.where).toEqual({ createdBy: 'admin-X' });
    });

    it('500 when DB throws', async () => {
      mockDocFindAll.mockRejectedValue(new Error('DB down'));
      const req = { user: { id: 'a1' }, query: {} };
      const res = mkRes();
      await getDocuments(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('updateReception — BACKEND-002 createdBy scope', () => {
    it('404 when reception not found (another admin owns it)', async () => {
      mockUserFindOne.mockResolvedValue(null);
      const req = { user: { id: 'admin1' }, params: { id: 'r1' }, body: { firstName: 'X' } };
      const res = mkRes();
      await updateReception(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
      // Verify query includes createdBy
      expect(mockUserFindOne).toHaveBeenCalledWith(expect.objectContaining({
        where: expect.objectContaining({ createdBy: 'admin1' }),
      }));
    });

    it('updates reception when createdBy matches (BACKEND-002 positive)', async () => {
      const save = jest.fn().mockResolvedValue();
      mockUserFindOne.mockResolvedValue({
        id: 'r1', email: 'r@x.com', firstName: 'Old', lastName: 'Name',
        save, toJSON: () => ({ id: 'r1' }),
      });
      mockUserFindAll.mockResolvedValue([]);
      const req = { user: { id: 'admin1' }, params: { id: 'r1' }, body: { firstName: 'New' } };
      const res = mkRes();
      await updateReception(req, res);
      expect(save).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });
  });
});
