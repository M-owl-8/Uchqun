import express from 'express';
import { authenticate } from '../middleware/auth.js';
import {
  listMessages,
  createMessage,
  markConversationRead,
  updateMessage,
  deleteMessage,
  getUnreadCount,
  listConversations,
} from '../controllers/chatController.js';
import { handleValidationErrors } from '../middleware/validation.js';
import {
  sendMessageValidator,
  markReadValidator,
  updateMessageValidator,
  messageIdValidator,
} from '../validators/chatValidator.js';

const router = express.Router();

router.use(authenticate);

router.get('/messages', listMessages);
router.post('/messages', sendMessageValidator, handleValidationErrors, createMessage);
router.post('/read', markReadValidator, handleValidationErrors, markConversationRead);
router.put('/messages/:id', updateMessageValidator, handleValidationErrors, updateMessage);
router.delete('/messages/:id', messageIdValidator, handleValidationErrors, deleteMessage);
router.get('/unread-count', getUnreadCount);
router.get('/conversations', listConversations);

export default router;

