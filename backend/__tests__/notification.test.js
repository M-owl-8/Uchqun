import { jest } from '@jest/globals';

const mockFindAll = jest.fn();
const mockFindOne = jest.fn();
const mockCount = jest.fn();
const mockUpdate = jest.fn();
const mockCreate = jest.fn();

jest.unstable_mockModule('../models/Notification.js', () => ({
  default: {
    findAll: mockFindAll,
    findOne: mockFindOne,
    count: mockCount,
    update: mockUpdate,
    create: mockCreate,
  },
}));
jest.unstable_mockModule('../models/Child.js', () => ({ default: {} }));
jest.unstable_mockModule('../config/socket.js', () => ({ emitToUser: jest.fn() }));
jest.unstable_mockModule('../utils/logger.js', () => ({
  default: { error: jest.fn(), info: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

const {
  getNotifications, markAsRead, markAllAsRead, deleteNotification, getUnreadCount, createNotification,
} = await import('../controllers/notificationController.js');

const mkRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('notificationController', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('getNotifications', () => {
    it('scopes to req.user.id and returns unread count', async () => {
      mockFindAll.mockResolvedValue([{ id: 'n1' }]);
      mockCount.mockResolvedValue(1);
      const req = { user: { id: 'u1' }, query: {} };
      const res = mkRes();
      await getNotifications(req, res);
      expect(mockFindAll).toHaveBeenCalledWith(expect.objectContaining({
        where: { userId: 'u1' },
      }));
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        unreadCount: 1, total: 1,
      }));
    });

    it('filters by isRead=true', async () => {
      mockFindAll.mockResolvedValue([]);
      mockCount.mockResolvedValue(0);
      const req = { user: { id: 'u1' }, query: { isRead: 'true' } };
      const res = mkRes();
      await getNotifications(req, res);
      expect(mockFindAll).toHaveBeenCalledWith(expect.objectContaining({
        where: { userId: 'u1', isRead: true },
      }));
    });
  });

  describe('markAsRead', () => {
    it('404 when not owned', async () => {
      mockFindOne.mockResolvedValue(null);
      const req = { user: { id: 'u1' }, params: { id: 'n1' } };
      const res = mkRes();
      await markAsRead(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('marks as read with timestamp', async () => {
      const update = jest.fn().mockResolvedValue();
      mockFindOne.mockResolvedValue({ id: 'n1', update });
      const req = { user: { id: 'u1' }, params: { id: 'n1' } };
      const res = mkRes();
      await markAsRead(req, res);
      expect(update).toHaveBeenCalledWith(expect.objectContaining({ isRead: true }));
    });
  });

  describe('markAllAsRead', () => {
    it('updates all unread for the user', async () => {
      mockUpdate.mockResolvedValue([1]);
      const req = { user: { id: 'u1' } };
      const res = mkRes();
      await markAllAsRead(req, res);
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ isRead: true }),
        expect.objectContaining({ where: { userId: 'u1', isRead: false } }),
      );
    });
  });

  describe('deleteNotification', () => {
    it('404 when not owned', async () => {
      mockFindOne.mockResolvedValue(null);
      const req = { user: { id: 'u1' }, params: { id: 'n1' } };
      const res = mkRes();
      await deleteNotification(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('destroys notification when owned', async () => {
      const destroy = jest.fn().mockResolvedValue();
      mockFindOne.mockResolvedValue({ id: 'n1', destroy });
      const req = { user: { id: 'u1' }, params: { id: 'n1' } };
      const res = mkRes();
      await deleteNotification(req, res);
      expect(destroy).toHaveBeenCalled();
    });
  });

  describe('getUnreadCount', () => {
    it('returns count for the user', async () => {
      mockCount.mockResolvedValue(7);
      const req = { user: { id: 'u1' } };
      const res = mkRes();
      await getUnreadCount(req, res);
      expect(res.json).toHaveBeenCalledWith({ success: true, count: 7 });
    });
  });

  describe('createNotification helper', () => {
    it('creates notification record with given fields', async () => {
      mockCreate.mockResolvedValue({ id: 'n1' });
      const result = await createNotification('u1', 'c1', 'meal', 'Title', 'Msg', 'r1', 'meal');
      expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({
        userId: 'u1', childId: 'c1', type: 'meal', title: 'Title', message: 'Msg',
        relatedId: 'r1', relatedType: 'meal', isRead: false,
      }));
      expect(result).toEqual({ id: 'n1' });
    });

    it('returns null on failure (does not throw)', async () => {
      mockCreate.mockRejectedValue(new Error('boom'));
      const result = await createNotification('u1', null, 'system', 'T', 'M');
      expect(result).toBeNull();
    });
  });
});
