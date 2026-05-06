import SuperAdminMessage from '../../models/SuperAdminMessage.js';
import logger from '../../utils/logger.js';

/**
 * Get admin's messages to super-admin
 * GET /api/admin/messages
 *
 * Business Logic:
 * - Admin can view their own messages sent to super-admin
 * - Includes replies from super-admin
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
