import SuperAdminMessage from '../models/SuperAdminMessage.js';
import User from '../models/User.js';
import Payment from '../models/Payment.js';
import School from '../models/School.js';
import Child from '../models/Child.js';
import { Op } from 'sequelize';
import logger from '../utils/logger.js';
import { parsePagination } from '../utils/pagination.js';

/**
 * Send message to super-admin
 * POST /api/super-admin/messages
 * Available for all authenticated users (parent, teacher, admin, reception)
 */
export const sendMessage = async (req, res) => {
  try {
    console.log('sendMessage called', { 
      hasUser: !!req.user, 
      userId: req.user?.id, 
      role: req.user?.role,
      body: req.body 
    });
    
    const { subject, message } = req.body;
    const senderId = req.user.id;

    if (!subject || !message) {
      return res.status(400).json({ error: 'Subject and message are required' });
    }

    if (subject.trim().length === 0 || message.trim().length === 0) {
      return res.status(400).json({ error: 'Subject and message cannot be empty' });
    }

    logger.info('Attempting to create super-admin message', {
      senderId,
      senderRole: req.user.role,
      subject: subject.substring(0, 50),
    });

    const superAdminMessage = await SuperAdminMessage.create({
      senderId,
      subject: subject.trim(),
      message: message.trim(),
      isRead: false,
    });

    logger.info('Message sent to super-admin', {
      messageId: superAdminMessage.id,
      senderId,
      senderRole: req.user.role,
    });

    res.status(201).json({
      success: true,
      message: 'Message sent successfully',
      data: superAdminMessage.toJSON(),
    });
  } catch (error) {
    logger.error('Send message error', { 
      error: error.message, 
      stack: error.stack,
      senderId: req.user?.id,
      senderRole: req.user?.role
    });
    console.error('Send message error details:', error);
    
    // Check if it's a table not found error
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
 * Get all messages for super-admin
 * GET /api/super-admin/messages
 */
export const getMessages = async (req, res) => {
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

    const { count, rows: messages } = await SuperAdminMessage.findAndCountAll({
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
 * GET /api/super-admin/messages/:id
 */
export const getMessageById = async (req, res) => {
  try {
    const { id } = req.params;

    const message = await SuperAdminMessage.findByPk(id, {
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

    // Mark as read if not already read
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
 * POST /api/super-admin/messages/:id/reply
 */
export const replyToMessage = async (req, res) => {
  try {
    const { id } = req.params;
    const { reply } = req.body;

    if (!reply || reply.trim().length === 0) {
      return res.status(400).json({ error: 'Reply is required' });
    }

    const message = await SuperAdminMessage.findByPk(id);
    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    message.reply = reply.trim();
    message.repliedAt = new Date();
    await message.save();

    logger.info('Super-admin replied to message', {
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
 * PUT /api/super-admin/messages/:id/read
 */
export const markMessageRead = async (req, res) => {
  try {
    const { id } = req.params;
    const { isRead } = req.body;

    const message = await SuperAdminMessage.findByPk(id);
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
 * DELETE /api/super-admin/messages/:id
 */
export const deleteMessage = async (req, res) => {
  try {
    const { id } = req.params;

    const message = await SuperAdminMessage.findByPk(id);
    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    await message.destroy();

    logger.info('Message deleted by super-admin', {
      messageId: id,
    });

    res.json({
      success: true,
      message: 'Message deleted successfully',
    });
  } catch (error) {
    logger.error('Delete message error', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Failed to delete message' });
  }
};

/**
 * Get all payments (Super Admin view)
 * GET /api/super-admin/payments
 */
export const getAllPayments = async (req, res) => {
  try {
    const {
      status,
      paymentType,
      startDate,
      endDate,
    } = req.query;
    const { limit, offset } = parsePagination(req.query, { limit: 50 });

    const where = {};

    if (status) {
      where.status = status;
    }

    if (paymentType) {
      where.paymentType = paymentType;
    }

    if (startDate || endDate) {
      where.paidAt = {};
      if (startDate) {
        where.paidAt[Op.gte] = new Date(startDate);
      }
      if (endDate) {
        where.paidAt[Op.lte] = new Date(endDate);
      }
    }

    const payments = await Payment.findAndCountAll({
      where,
      limit,
      offset,
      order: [['createdAt', 'DESC']],
      include: [
        {
          model: User,
          as: 'parent',
          required: false,
          attributes: ['id', 'firstName', 'lastName', 'email'],
        },
        {
          model: Child,
          as: 'child',
          required: false,
          attributes: ['id', 'firstName', 'lastName'],
        },
        {
          model: School,
          as: 'school',
          required: false,
          attributes: ['id', 'name'],
        },
      ],
    });

    // Calculate totals
    const totalAmount = payments.rows.reduce((sum, p) => {
      return sum + (parseFloat(p.amount) || 0);
    }, 0);

    const completedAmount = payments.rows
      .filter(p => p.status === 'completed')
      .reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);

    res.json({
      success: true,
      data: {
        payments: payments.rows,
        total: payments.count,
        totalAmount,
        completedAmount,
        limit,
        offset,
      },
    });
  } catch (error) {
    logger.error('Get all payments error', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Failed to fetch payments' });
  }
};
