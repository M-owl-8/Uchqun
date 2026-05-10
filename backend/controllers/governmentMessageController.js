import GovernmentMessage from '../models/GovernmentMessage.js';
import User from '../models/User.js';
import { Op } from 'sequelize';
import logger from '../utils/logger.js';
import { parsePagination } from '../utils/pagination.js';

/**
 * Send message to government
 * POST /api/government/messages
 * Available for all authenticated users (parent, teacher, admin, reception)
 */
export const sendMessage = async (req, res) => {
  try {
    const { subject, message } = req.body;
    const senderId = req.user.id;

    if (!subject || !message) {
      return res.status(400).json({ error: 'Subject and message are required' });
    }

    if (subject.trim().length === 0 || message.trim().length === 0) {
      return res.status(400).json({ error: 'Subject and message cannot be empty' });
    }

    logger.info('Attempting to create government message', {
      senderId,
      senderRole: req.user.role,
      subject: subject.substring(0, 50),
    });

    const governmentMessage = await GovernmentMessage.create({
      senderId,
      subject: subject.trim(),
      message: message.trim(),
      isRead: false,
    });

    logger.info('Message sent to government', {
      messageId: governmentMessage.id,
      senderId,
      senderRole: req.user.role,
    });

    res.status(201).json({
      success: true,
      message: 'Message sent successfully',
      data: governmentMessage.toJSON(),
    });
  } catch (error) {
    logger.error('Send message error', {
      error: error.message,
      stack: error.stack,
      senderId: req.user?.id,
      senderRole: req.user?.role
    });
    if (error.message && error.message.includes('does not exist')) {
      return res.status(500).json({
        error: 'Database table not found. Please run migrations.',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
    res.status(500).json({
      error: 'Failed to send message',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get all messages (government view)
 * GET /api/government/messages
 */
export const getAllMessages = async (req, res) => {
  try {
    const { isRead, search } = req.query;
    const { limit, offset } = parsePagination(req.query);

    const where = {};
    if (isRead !== undefined) {
      where.isRead = isRead === 'true';
    }

    if (search) {
      where[Op.or] = [
        { subject: { [Op.iLike]: `%${search}%` } },
        { message: { [Op.iLike]: `%${search}%` } },
      ];
    }

    const { count, rows: messages } = await GovernmentMessage.findAndCountAll({
      where,
      include: [
        {
          model: User,
          as: 'sender',
          attributes: ['id', 'firstName', 'lastName', 'email', 'role'],
          required: false,
        },
      ],
      order: [['createdAt', 'DESC']],
      limit,
      offset,
    });

    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    res.json({
      success: true,
      data: messages.map(m => m.toJSON()),
      pagination: {
        total: count,
        page,
        limit,
        totalPages: Math.ceil(count / limit),
      },
    });
  } catch (error) {
    logger.error('Get messages error', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
};

/**
 * Get single message by ID
 * GET /api/government/messages/:id
 */
export const getMessageById = async (req, res) => {
  try {
    const { id } = req.params;

    const message = await GovernmentMessage.findByPk(id, {
      include: [
        {
          model: User,
          as: 'sender',
          attributes: ['id', 'firstName', 'lastName', 'email', 'role', 'phone'],
          required: false,
        },
      ],
    });

    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    if (!message.isRead) {
      message.isRead = true;
      message.readAt = new Date();
      await message.save();
    }

    res.json({
      success: true,
      data: message.toJSON(),
    });
  } catch (error) {
    logger.error('Get message by id error', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Failed to fetch message' });
  }
};

/**
 * Reply to message
 * POST /api/government/messages/:id/reply
 */
export const replyToMessage = async (req, res) => {
  try {
    const { id } = req.params;
    const { reply } = req.body;

    if (!reply || reply.trim().length === 0) {
      return res.status(400).json({ error: 'Reply is required' });
    }

    const message = await GovernmentMessage.findByPk(id);
    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    message.reply = reply.trim();
    message.repliedAt = new Date();
    await message.save();

    logger.info('Government replied to message', {
      messageId: id,
      senderId: message.senderId,
    });

    res.json({
      success: true,
      message: 'Reply sent successfully',
      data: message.toJSON(),
    });
  } catch (error) {
    logger.error('Reply to message error', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Failed to send reply' });
  }
};

/**
 * Mark message as read/unread
 * PUT /api/government/messages/:id/read
 */
export const markMessageRead = async (req, res) => {
  try {
    const { id } = req.params;
    const { isRead } = req.body;

    const message = await GovernmentMessage.findByPk(id);
    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    message.isRead = isRead !== false;
    if (message.isRead) {
      message.readAt = new Date();
    } else {
      message.readAt = null;
    }
    await message.save();

    res.json({
      success: true,
      message: `Message marked as ${message.isRead ? 'read' : 'unread'}`,
      data: message.toJSON(),
    });
  } catch (error) {
    logger.error('Mark message read error', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Failed to update message status' });
  }
};

/**
 * Delete message
 * DELETE /api/government/messages/:id
 */
export const deleteMessage = async (req, res) => {
  try {
    const { id } = req.params;

    const message = await GovernmentMessage.findByPk(id);
    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    await message.destroy();

    logger.info('Message deleted by government', { messageId: id });

    res.json({
      success: true,
      message: 'Message deleted successfully',
    });
  } catch (error) {
    logger.error('Delete message error', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Failed to delete message' });
  }
};
