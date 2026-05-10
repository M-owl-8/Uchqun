import axios from 'axios';
import logger from './logger.js';

/**
 * Send message to Telegram user via bot
 * @param {string} username - Telegram username (without @)
 * @param {string} message - Message text
 * @returns {Promise<Object>}
 */
export async function sendTelegramMessage(username, _message) {
  try {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    
    if (!botToken) {
      throw new Error('TELEGRAM_BOT_TOKEN environment variable is not set');
    }

    // Remove @ if present
    const cleanUsername = username.replace('@', '');

    logger.warn('Telegram message sending requires chat_id. Username-based sending is limited.', {
      username: cleanUsername,
    });

    return {
      success: false,
      message: 'Telegram username-based sending requires chat_id. Please ensure user has started the bot.',
      username: cleanUsername,
    };
  } catch (error) {
    logger.error('Failed to send Telegram message', {
      username,
      error: error.message,
      stack: error.stack,
    });
    throw error;
  }
}

/**
 * Send message to Telegram user by chat_id (recommended method)
 * @param {string|number} chatId - Telegram chat ID
 * @param {string} message - Message text
 * @param {string} parseMode - Parse mode (HTML, Markdown, etc.)
 * @returns {Promise<Object>}
 */
export async function sendTelegramMessageByChatId(chatId, message, parseMode = 'HTML') {
  try {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    
    if (!botToken) {
      throw new Error('TELEGRAM_BOT_TOKEN environment variable is not set');
    }

    const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
    
    const response = await axios.post(url, {
      chat_id: chatId,
      text: message,
      parse_mode: parseMode,
    }, { timeout: 5000 });

    logger.info('Telegram message sent successfully', {
      chatId,
      messageId: response.data.result?.message_id,
    });

    return {
      success: true,
      messageId: response.data.result?.message_id,
      chatId,
    };
  } catch (error) {
    logger.error('Failed to send Telegram message by chat_id', {
      chatId,
      error: error.response?.data || error.message,
    });
    throw error;
  }
}

/**
 * Get user chat_id by username using Telegram Bot API
 * Note: This only works if user has started the bot
 * @param {string} username - Telegram username (without @)
 * @returns {Promise<string|number|null>}
 */
async function getUserChatIdByUsername(username) {
  try {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (!botToken) {
      return null;
    }

    // Try to get updates and find user by username
    const url = `https://api.telegram.org/bot${botToken}/getUpdates`;
    const response = await axios.get(url, { timeout: 5000 });
    
    if (response.data?.ok && response.data?.result) {
      // Search through updates to find user with matching username
      for (const update of response.data.result) {
        const message = update.message || update.edited_message;
        if (message?.from) {
          const user = message.from;
          if (user.username && user.username.toLowerCase() === username.toLowerCase()) {
            return user.id; // Return user's chat_id
          }
        }
      }
    }
    
    return null;
  } catch (error) {
    logger.error('Failed to get chat_id by username', {
      username,
      error: error.message,
    });
    return null;
  }
}

/**
 * Send admin approval message to Telegram
 * Tries multiple methods:
 * 1. Direct message to user (if user has started bot)
 * 2. Channel/group with mention (fallback)
 * @param {string} username - Telegram username (without @)
 * @param {string} email - Admin email
 * @param {string} password - Generated password
 * @param {string} firstName - Admin first name
 * @returns {Promise<Object>}
 */
export async function sendAdminApprovalTelegram(username, email, password, firstName) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const channelId = process.env.TELEGRAM_CHANNEL_ID; // Optional: channel/group ID for sending
  
  if (!botToken) {
    throw new Error('TELEGRAM_BOT_TOKEN environment variable is not set');
  }

  const message = `🎉 <b>Uchqun Admin Panel - Login Ma'lumotlari</b>

Salom ${firstName}!

Sizning admin ro'yxatdan o'tish so'rovingiz tasdiqlandi.

<b>Login Ma'lumotlari:</b>
📧 Email: <code>${email}</code>
🔑 Parol: <code>${password}</code>

⚠️ <b>Eslatma:</b> Xavfsizlik uchun iltimos, birinchi marta kirgandan so'ng parolingizni o'zgartiring.

Admin panel: ${process.env.ADMIN_PANEL_URL || 'http://localhost:5174'}

Hurmat bilan,
Uchqun Jamoasi`;

  try {
    // Method 1: Try to send directly to user (if user has started bot)
    // This is the best method - user doesn't need to join channel
    try {
      const userChatId = await getUserChatIdByUsername(username);
      if (userChatId) {
        const result = await sendTelegramMessageByChatId(userChatId, message, 'HTML');
        logger.info('Telegram approval message sent directly to user', {
          username,
          chatId: userChatId,
          messageId: result.messageId,
        });
        return {
          success: true,
          messageId: result.messageId,
          method: 'direct',
          username,
        };
      }
    } catch (directError) {
      logger.warn('Direct message failed, trying channel method', {
        username,
        error: directError.message,
      });
    }

    // Method 2: Send to channel/group and mention user (fallback)
    // User needs to join channel to see the message
    if (channelId) {
      const mentionMessage = `@${username}\n\n${message}`;
      const result = await sendTelegramMessageByChatId(channelId, mentionMessage, 'HTML');
      logger.info('Telegram approval message sent to channel', {
        username,
        channelId,
        messageId: result.messageId,
      });
      return {
        success: true,
        messageId: result.messageId,
        method: 'channel',
        username,
        note: 'Foydalanuvchi channel\'ga a\'zo bo\'lishi kerak',
      };
    }

    // Method 3: If neither works, return failure
    logger.warn('Telegram message could not be sent - user needs to start bot or channel_id required', {
      username,
      email,
    });

    return {
      success: false,
      message: 'Telegram xabar yuborilmadi. Foydalanuvchi botni start qilgan bo\'lishi yoki TELEGRAM_CHANNEL_ID sozlanishi kerak.',
      username,
      credentials: { email, password }, // Return credentials for manual delivery
    };
  } catch (error) {
    logger.error('Failed to send Telegram approval message', {
      username,
      error: error.message,
      stack: error.stack,
    });
    throw error;
  }
}

