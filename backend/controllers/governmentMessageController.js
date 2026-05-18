import GovernmentMessage from '../models/GovernmentMessage.js';
import User from '../models/User.js';
import { Op } from 'sequelize';
import logger from '../utils/logger.js';
import { parsePagination } from '../utils/pagination.js';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isValidUuid = (s) => UUID_RE.test(s);

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

    if (subject.trim().length > 500) {
      return res.status(400).json({ error: 'Subject must be 500 characters or fewer' });
    }
    if (message.trim().length > 5000) {
      return res.status(400).json({ error: 'Message must be 5000 characters or fewer' });
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
    res.status(500).json({ error: 'Failed to send message' });
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

    // Return only top-level messages; replies are eager-loaded as children
    const where = { parentMessageId: null };
    if (isRead !== undefined) {
      where.isRead = isRead === 'true';
    }

    if (search) {
      const escaped = search.trim().replace(/[%_\\]/g, '\\$&');
      where[Op.or] = [
        { subject: { [Op.iLike]: `%${escaped}%` } },
        { message: { [Op.iLike]: `%${escaped}%` } },
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
        {
          model: GovernmentMessage,
          as: 'replies',
          include: [
            {
              model: User,
              as: 'sender',
              attributes: ['id', 'firstName', 'lastName', 'role'],
              required: false,
            },
          ],
          order: [['createdAt', 'ASC']],
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
    if (!isValidUuid(id)) return res.status(400).json({ error: 'Invalid ID' });

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
    if (!isValidUuid(id)) return res.status(400).json({ error: 'Invalid ID' });
    const { reply } = req.body;

    if (!reply || reply.trim().length === 0) {
      return res.status(400).json({ error: 'Reply is required' });
    }
    if (reply.trim().length > 5000) {
      return res.status(400).json({ error: 'Reply exceeds 5000 characters' });
    }

    const parent = await GovernmentMessage.findByPk(id);
    if (!parent) {
      return res.status(404).json({ error: 'Message not found' });
    }

    // Create reply as a child message record (thread model)
    const replyMsg = await GovernmentMessage.create({
      senderId: req.user.id,
      parentMessageId: id,
      subject: `Re: ${parent.subject}`.slice(0, 500),
      message: reply.trim(),
      isRead: true,
    });

    // Also mark the parent as read
    if (!parent.isRead) {
      parent.isRead = true;
      parent.readAt = new Date();
      await parent.save();
    }

    logger.info('Government replied to message', {
      messageId: id,
      replyId: replyMsg.id,
      senderId: req.user.id,
    });

    res.json({
      success: true,
      message: 'Reply sent successfully',
      data: replyMsg.toJSON(),
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
    if (!isValidUuid(id)) return res.status(400).json({ error: 'Invalid ID' });
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
    if (!isValidUuid(id)) return res.status(400).json({ error: 'Invalid ID' });

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
