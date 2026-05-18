import { jest } from '@jest/globals';

const mockCreate = jest.fn();
const mockFindAndCountAll = jest.fn();
const mockFindByPk = jest.fn();

// #03-004 #06-003 — GovernmentMessage model (renamed from legacy messages model)
jest.unstable_mockModule('../models/GovernmentMessage.js', () => ({
  default: { create: mockCreate, findAndCountAll: mockFindAndCountAll, findByPk: mockFindByPk },
}));
jest.unstable_mockModule('../models/User.js', () => ({ default: {} }));
jest.unstable_mockModule('../utils/logger.js', () => ({
  default: { error: jest.fn(), info: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));
jest.unstable_mockModule('../utils/pagination.js', () => ({
  parsePagination: () => ({ limit: 50, offset: 0 }),
}));

// #06-003 — governmentMessageController
const {
  sendMessage, getAllMessages, getMessageById, replyToMessage, markMessageRead, deleteMessage,
} = await import('../controllers/governmentMessageController.js');

const mkRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

// Valid UUID for all tests that go through UUID validation
const VALID_ID = '00000000-0000-0000-0000-000000000001';

describe('governmentMessageController', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('sendMessage', () => {
    it('#06-003 400 when subject or message missing', async () => {
      const req = { user: { id: 'u1', role: 'parent' }, body: { subject: '', message: '' } };
      const res = mkRes();
      await sendMessage(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('#06-003 400 when only whitespace', async () => {
      const req = { user: { id: 'u1', role: 'parent' }, body: { subject: '  ', message: '  ' } };
      const res = mkRes();
      await sendMessage(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('#06-003 creates message and trims fields', async () => {
      mockCreate.mockResolvedValue({ id: 'm1', toJSON: () => ({ id: 'm1' }) });
      const req = { user: { id: 'u1', role: 'parent' }, body: { subject: '  Hi  ', message: '  Hello  ' } };
      const res = mkRes();
      await sendMessage(req, res);
      expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({
        senderId: 'u1', subject: 'Hi', message: 'Hello', isRead: false,
      }));
      expect(res.status).toHaveBeenCalledWith(201);
    });

    it('#03-004 500 with hint when table missing', async () => {
      mockCreate.mockRejectedValue(new Error('relation "government_messages" does not exist'));
      const req = { user: { id: 'u1', role: 'parent' }, body: { subject: 'a', message: 'b' } };
      const res = mkRes();
      await sendMessage(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('getAllMessages', () => {
    it('#06-003 returns messages and pagination', async () => {
      const m = { toJSON: () => ({ id: 'm1' }) };
      mockFindAndCountAll.mockResolvedValue({ rows: [m], count: 1 });
      const req = { query: {} };
      const res = mkRes();
      await getAllMessages(req, res);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        data: [{ id: 'm1' }],
        pagination: expect.objectContaining({ total: 1, limit: 50, totalPages: 1 }),
      }));
    });

    it('#06-003 filters by isRead query', async () => {
      mockFindAndCountAll.mockResolvedValue({ rows: [], count: 0 });
      const req = { query: { isRead: 'false' } };
      const res = mkRes();
      await getAllMessages(req, res);
      const where = mockFindAndCountAll.mock.calls[0][0].where;
      expect(where.isRead).toBe(false);
    });
  });

  describe('getMessageById', () => {
    it('#06-003 400 on invalid UUID', async () => {
      const req = { params: { id: 'not-a-uuid' } };
      const res = mkRes();
      await getMessageById(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(mockFindByPk).not.toHaveBeenCalled();
    });

    it('#06-003 404 when not found', async () => {
      mockFindByPk.mockResolvedValue(null);
      const req = { params: { id: VALID_ID } };
      const res = mkRes();
      await getMessageById(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('#06-003 marks unread message as read', async () => {
      const save = jest.fn().mockResolvedValue();
      const m = { id: VALID_ID, isRead: false, save, toJSON: () => ({}) };
      mockFindByPk.mockResolvedValue(m);
      const req = { params: { id: VALID_ID } };
      const res = mkRes();
      await getMessageById(req, res);
      expect(m.isRead).toBe(true);
      expect(m.readAt).toBeInstanceOf(Date);
      expect(save).toHaveBeenCalled();
    });
  });

  describe('replyToMessage', () => {
    it('#06-003 400 when reply empty', async () => {
      const req = { params: { id: VALID_ID }, user: { id: 'gov1' }, body: { reply: '   ' } };
      const res = mkRes();
      await replyToMessage(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('#06-003 creates child reply record', async () => {
      const save = jest.fn().mockResolvedValue();
      const parent = { id: VALID_ID, subject: 'Hello', isRead: true, save, toJSON: () => ({}) };
      mockFindByPk.mockResolvedValue(parent);
      mockCreate.mockResolvedValue({ id: 'reply-1', toJSON: () => ({ id: 'reply-1' }) });
      const req = { params: { id: VALID_ID }, user: { id: 'gov1' }, body: { reply: 'thanks' } };
      const res = mkRes();
      await replyToMessage(req, res);
      expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({
        senderId: 'gov1',
        parentMessageId: VALID_ID,
        message: 'thanks',
        isRead: true,
      }));
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it('#06-003 marks unread parent as read when replying', async () => {
      const save = jest.fn().mockResolvedValue();
      const parent = { id: VALID_ID, subject: 'Q', isRead: false, save, toJSON: () => ({}) };
      mockFindByPk.mockResolvedValue(parent);
      mockCreate.mockResolvedValue({ id: 'r2', toJSON: () => ({}) });
      const req = { params: { id: VALID_ID }, user: { id: 'gov1' }, body: { reply: 'noted' } };
      const res = mkRes();
      await replyToMessage(req, res);
      expect(parent.isRead).toBe(true);
      expect(save).toHaveBeenCalled();
    });
  });

  describe('markMessageRead', () => {
    it('#06-003 clears readAt when isRead=false', async () => {
      const save = jest.fn().mockResolvedValue();
      const m = { id: VALID_ID, save, toJSON: () => ({}) };
      mockFindByPk.mockResolvedValue(m);
      const req = { params: { id: VALID_ID }, body: { isRead: false } };
      const res = mkRes();
      await markMessageRead(req, res);
      expect(m.isRead).toBe(false);
      expect(m.readAt).toBeNull();
    });
  });

  describe('deleteMessage', () => {
    it('#06-003 404 when not found', async () => {
      mockFindByPk.mockResolvedValue(null);
      const req = { params: { id: VALID_ID } };
      const res = mkRes();
      await deleteMessage(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('#06-003 destroys when found', async () => {
      const destroy = jest.fn().mockResolvedValue();
      mockFindByPk.mockResolvedValue({ id: VALID_ID, destroy });
      const req = { params: { id: VALID_ID } };
      const res = mkRes();
      await deleteMessage(req, res);
      expect(destroy).toHaveBeenCalled();
    });
  });
});
