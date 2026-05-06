import nodemailer from 'nodemailer';
import logger from './logger.js';

const createTransporter = () => {
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  if (process.env.GMAIL_CLIENT_ID && process.env.GMAIL_CLIENT_SECRET && process.env.GMAIL_REFRESH_TOKEN) {
    return nodemailer.createTransport({
      service: 'gmail',
      auth: {
        type: 'OAuth2',
        user: process.env.GMAIL_USER,
        clientId: process.env.GMAIL_CLIENT_ID,
        clientSecret: process.env.GMAIL_CLIENT_SECRET,
        refreshToken: process.env.GMAIL_REFRESH_TOKEN,
      },
    });
  }

  if (process.env.NODE_ENV !== 'production') {
    logger.warn('No email configuration found. Emails will not be sent in development.');
    return {
      sendMail: async (options) => {
        logger.info('Email suppressed (development, no SMTP configured)', {
          to: options.to,
          subject: options.subject,
        });
        return { messageId: 'dev-' + Date.now(), devMode: true };
      },
    };
  }

  throw new Error('Email configuration not found. Set SMTP or Gmail OAuth2 credentials.');
};

/**
 * Send an email.
 */
export async function sendEmail(to, subject, text, html = null) {
  try {
    const transporter = createTransporter();

    const mailOptions = {
      from: process.env.EMAIL_FROM || process.env.SMTP_USER || 'noreply@uchqun.uz',
      to,
      subject,
      text,
      html: html || text.replace(/\n/g, '<br>'),
    };

    const info = await transporter.sendMail(mailOptions);

    if (info.devMode) {
      logger.warn('Email NOT sent — development mode, no SMTP configured', { to, subject });
      throw new Error('Email konfiguratsiyasi topilmadi. SMTP yoki Gmail OAuth2 sozlamalari kerak.');
    }

    logger.info('Email sent successfully', { to, subject, messageId: info.messageId });
    return info;
  } catch (error) {
    logger.error('Failed to send email', { to, subject, error: error.message });
    throw error;
  }
}

/**
 * Send admin approval email with a set-password link (no plaintext password).
 * @param {string} email - Admin email address
 * @param {string} setPasswordUrl - Time-limited URL for the admin to set their password
 * @param {string} firstName - Admin first name
 */
export async function sendAdminApprovalEmail(email, setPasswordUrl, firstName) {
  const subject = 'Uchqun Admin Panel — Hisobingiz tasdiqlandi';

  const text = `
Salom ${firstName},

Sizning admin ro'yxatdan o'tish so'rovingiz tasdiqlandi.

Quyidagi havola orqali parolingizni o'rnating (24 soat davomida amal qiladi):

${setPasswordUrl}

Havola muddati o'tib ketsa, super-admin bilan bog'laning.

Hurmat bilan,
Uchqun Jamoasi
  `.trim();

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .warning { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 4px; }
        .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header"><h1>Uchqun Admin Panel</h1></div>
        <div class="content">
          <p>Salom <strong>${firstName}</strong>,</p>
          <p>Sizning admin ro'yxatdan o'tish so'rovingiz tasdiqlandi.</p>
          <p>Quyidagi tugma orqali parolingizni o'rnating:</p>
          <p>
            <a href="${setPasswordUrl}"
               style="display:inline-block;background:#667eea;color:white;padding:12px 24px;text-decoration:none;border-radius:6px;margin-top:10px;">
              Parol O'rnatish
            </a>
          </p>
          <div class="warning">
            <strong>⚠️ Eslatma:</strong> Bu havola 24 soat davomida amal qiladi.
          </div>
        </div>
        <div class="footer"><p>Hurmat bilan,<br>Uchqun Jamoasi</p></div>
      </div>
    </body>
    </html>
  `.trim();

  return sendEmail(email, subject, text, html);
}
