import Notification from '../models/Notification.js';
import Child from '../models/Child.js';
import logger from '../utils/logger.js';
import { Op } from 'sequelize';

/**
 * Get all notifications for the logged-in user
 * GET /api/notifications
 */
export const getNotifications = async (req, res) => {
  try {
    const { isRead, limit, offset } = req.query;
    const limitNum = limit ? parseInt(limit) : undefined;
    const offsetNum = offset ? parseInt(offset) : 0;

    const where = { userId: req.user.id };
    
    if (isRead !== undefined) {
      where.isRead = isRead === 'true';
    }

    const notifications = await Notification.findAll({
      where,
      include: [
        {
          model: Child,
          as: 'child',
          attributes: ['id', 'firstName', 'lastName'],
          required: false,
        },
      ],
      order: [['createdAt', 'DESC']],
      limit: limitNum,
      offset: offsetNum,
    });

    const unreadCount = await Notification.count({
      where: {
        userId: req.user.id,
        isRead: false,
      },
    });

    res.json({
      success: true,
      data: notifications,
      unreadCount,
      total: notifications.length,
    });
  } catch (error) {
    logger.error('Get notifications error', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Failed to get notifications' });
  }
};

/**
 * Mark notification as read
 * PUT /api/notifications/:id/read
 */
export const markAsRead = async (req, res) => {
  try {
    const { id } = req.params;

    const notification = await Notification.findOne({
      where: { id, userId: req.user.id },
    });

    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    await notification.update({
      isRead: true,
      readAt: new Date(),
    });

    res.json({
      success: true,
      message: 'Notification marked as read',
      data: notification,
    });
  } catch (error) {
    logger.error('Mark notification as read error', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Failed to mark notification as read' });
  }
};

/**
 * Mark all notifications as read
 * PUT /api/notifications/read-all
 */
export const markAllAsRead = async (req, res) => {
  try {
    await Notification.update(
      {
        isRead: true,
        readAt: new Date(),
      },
      {
        where: {
          userId: req.user.id,
          isRead: false,
        },
      }
    );

    res.json({
      success: true,
      message: 'All notifications marked as read',
    });
  } catch (error) {
    logger.error('Mark all notifications as read error', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Failed to mark all notifications as read' });
  }
};

/**
 * Delete notification
 * DELETE /api/notifications/:id
 */
export const deleteNotification = async (req, res) => {
  try {
    const { id } = req.params;

    const notification = await Notification.findOne({
      where: { id, userId: req.user.id },
    });

    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    await notification.destroy();

    res.json({
      success: true,
      message: 'Notification deleted',
    });
  } catch (error) {
    logger.error('Delete notification error', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Failed to delete notification' });
  }
};

/**
 * Get unread notification count
 * GET /api/notifications/count
 */
export const getUnreadCount = async (req, res) => {
  try {
    const count = await Notification.count({
      where: {
        userId: req.user.id,
        isRead: false,
      },
    });

    res.json({
      success: true,
      count,
    });
  } catch (error) {
    logger.error('Get unread count error', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Failed to get unread count' });
  }
};

/**
 * Helper function to create notification
 * This will be called when activities, meals, or media are created
 */
export const createNotification = async (userId, childId, type, title, message, relatedId = null, relatedType = null) => {
  try {
    const notification = await Notification.create({
      userId,
      childId,
      type,
      title,
      message,
      relatedId,
      relatedType,
      isRead: false,
    });

    logger.info('Notification created', {
      notificationId: notification.id,
      userId,
      type,
    });

    return notification;
  } catch (error) {
    logger.error('Create notification error', { error: error.message, stack: error.stack });
    return null;
  }
};


