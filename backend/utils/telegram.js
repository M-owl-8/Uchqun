import axios from 'axios';
import logger from './logger.js';

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
