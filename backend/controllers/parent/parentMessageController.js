import SuperAdminMessage from '../../models/SuperAdminMessage.js';
import logger from '../../utils/logger.js';

/**
 * Get parent's messages to government
 * GET /api/parent/messages
 *
 * Business Logic:
 * - Parents can view their own messages sent to government
 * - Includes replies from government
 */
export const getMyMessages = async (req, res) => {
  try {
    const messages = await SuperAdminMessage.findAll({
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
