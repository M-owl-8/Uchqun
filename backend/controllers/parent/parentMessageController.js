import GovernmentMessage from '../../models/GovernmentMessage.js';
import logger from '../../utils/logger.js';

const VALID_RECIPIENT_LEVELS = ['owner', 'region', 'republic'];

/**
 * Send a routed message to government (CP-022).
 * POST /api/parent/message-to-government
 *
 * Routing is server-side only: client sends recipientLevel, never a raw recipientUserId.
 * - 'owner'    → school admin inbox (recipientLevel stored; admin reads via GET /admin/owner-messages)
 * - 'region'   → regional gov inbox (existing getAllMessages region scope handles read-side)
 * - 'republic' → republic-level gov inbox (existing global-access read path)
 *
 * Escalation: escalatedFromId (optional) must point to a message sent by THIS parent.
 */
export const parentSendMessage = async (req, res) => {
  try {
    // Defense-in-depth role check (requireParent at route level, but double-check here).
    if (req.user?.role !== 'parent') {
      return res.status(403).json({
        success: false,
        error: { code: 'MESSAGE_SEND_FORBIDDEN' },
      });
    }

    const senderId = req.user.id;
    const { subject, message, recipientLevel, escalatedFromId } = req.body;

    // Basic content validation (messageToGovValidator covers these, but controller re-checks).
    if (!subject || typeof subject !== 'string' || subject.trim() === '') {
      return res.status(400).json({ success: false, error: { code: 'MESSAGE_SUBJECT_REQUIRED' } });
    }
    if (!message || typeof message !== 'string' || message.trim() === '') {
      return res.status(400).json({ success: false, error: { code: 'MESSAGE_BODY_REQUIRED' } });
    }

    // recipientLevel required and must be one of the three routing targets.
    if (!recipientLevel || !VALID_RECIPIENT_LEVELS.includes(recipientLevel)) {
      return res.status(400).json({
        success: false,
        error: { code: 'MESSAGE_RECIPIENT_LEVEL_INVALID' },
      });
    }

    // escalatedFromId ownership check: if provided, the referenced message must exist
    // and must have been sent by this parent — prevent pointing into another user's chain.
    if (escalatedFromId) {
      const prior = await GovernmentMessage.findByPk(escalatedFromId, {
        attributes: ['id', 'senderId'],
      });
      if (!prior) {
        return res.status(400).json({
          success: false,
          error: { code: 'MESSAGE_ESCALATE_NOT_FOUND' },
        });
      }
      if (prior.senderId !== senderId) {
        return res.status(403).json({
          success: false,
          error: { code: 'MESSAGE_ESCALATE_NOT_OWN' },
        });
      }
    }

    const governmentMessage = await GovernmentMessage.create({
      senderId,
      subject: subject.trim(),
      message: message.trim(),
      recipientLevel,
      escalatedFromId: escalatedFromId ?? null,
      isRead: false,
    });

    logger.info('Parent sent routed government message', {
      messageId: governmentMessage.id,
      senderId,
      recipientLevel,
      escalatedFromId: escalatedFromId ?? null,
    });

    return res.status(201).json({
      success: true,
      data: governmentMessage.toJSON(),
    });
  } catch (error) {
    logger.error('parentSendMessage error', { error: error.message, senderId: req.user?.id });
    return res.status(500).json({ success: false, error: { code: 'MESSAGE_SEND_FAILED' } });
  }
};

/**
 * Get parent's own sent messages (with gov replies).
 * GET /api/parent/messages
 */
export const getMyMessages = async (req, res) => {
  try {
    const messages = await GovernmentMessage.findAll({
      where: { senderId: req.user.id },
      include: [
        {
          model: GovernmentMessage,
          as: 'escalatedFrom',
          attributes: ['id', 'subject', 'recipientLevel', 'createdAt'],
          required: false,
        },
      ],
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
