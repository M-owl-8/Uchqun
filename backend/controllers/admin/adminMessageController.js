import GovernmentMessage from '../../models/GovernmentMessage.js';
import User from '../../models/User.js';
import { Op } from 'sequelize';
import logger from '../../utils/logger.js';

/**
 * Get admin's own sent messages to government.
 * GET /api/admin/messages
 */
export const getMyMessages = async (req, res) => {
  try {
    const messages = await GovernmentMessage.findAll({
      where: { senderId: req.user.id },
      order: [['createdAt', 'DESC']],
    });

    res.json({
      success: true,
      data: messages.map(m => m.toJSON()),
    });
  } catch (error) {
    logger.error('Get my messages error', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
};

/**
 * Admin owner inbox — CP-022 Option 1.
 * GET /api/admin/owner-messages
 *
 * Returns all owner-level messages sent by parents from THIS school.
 * School-axis isolation: only messages where sender.schoolId === req.user.schoolId.
 */
export const getOwnerMessages = async (req, res) => {
  try {
    const adminSchoolId = req.user.schoolId;
    if (!adminSchoolId) {
      return res.status(400).json({
        success: false,
        error: { code: 'MESSAGE_NO_SCHOOL' },
      });
    }

    // Resolve sender IDs from admin's school (school-axis scope).
    const senders = await User.findAll({
      where: { schoolId: adminSchoolId },
      attributes: ['id'],
    });
    const senderIds = senders.map(u => u.id);

    const messages = await GovernmentMessage.findAll({
      where: {
        recipientLevel: 'owner',
        parentMessageId: null, // top-level only; replies are eager-loaded
        ...(senderIds.length > 0 ? { senderId: { [Op.in]: senderIds } } : { senderId: null }),
      },
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
          required: false,
          order: [['createdAt', 'ASC']],
        },
        {
          model: GovernmentMessage,
          as: 'escalatedFrom',
          attributes: ['id', 'subject', 'recipientLevel', 'createdAt'],
          required: false,
        },
      ],
      order: [['createdAt', 'DESC']],
    });

    return res.json({ success: true, data: messages.map(m => m.toJSON()) });
  } catch (error) {
    logger.error('getOwnerMessages error', { error: error.message, adminId: req.user?.id });
    return res.status(500).json({ success: false, error: { code: 'MESSAGE_FETCH_FAILED' } });
  }
};
