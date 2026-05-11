import winston from 'winston';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create logs directory if it doesn't exist (skip in production/Railway)
const logsDir = path.join(__dirname, '../logs');
let canWriteLogs = false;

try {
  if (process.env.NODE_ENV !== 'production') {
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }
    canWriteLogs = true;
  }
} catch (error) {
  console.warn('Could not create logs directory, file logging disabled:', error.message);
}

// PII redaction format — strips emails, tokens, and passwords from log metadata
const piiRedact = winston.format((info) => {
  const sensitiveKeys = /password|secret|token|authorization|cookie/i;
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

  function redact(obj) {
    if (typeof obj === 'string') {
      return obj.replace(emailRegex, '[REDACTED_EMAIL]');
    }
    if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
      const cleaned = {};
      for (const [key, value] of Object.entries(obj)) {
        if (sensitiveKeys.test(key)) {
          cleaned[key] = '[REDACTED]';
        } else {
          cleaned[key] = redact(value);
        }
      }
      return cleaned;
    }
    return obj;
  }

  return redact(info);
});

// Define log format
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  piiRedact(),
  winston.format.json()
);

// Console format for development
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...metadata }) => {
    let msg = `${timestamp} [${level}]: ${message}`;
    if (Object.keys(metadata).length > 0) {
      msg += ` ${JSON.stringify(metadata)}`;
    }
    return msg;
  })
);

// Create transports array
const transports = [];

// Console transport (always enabled)
transports.push(
  new winston.transports.Console({
    format: process.env.NODE_ENV === 'production' ? logFormat : consoleFormat,
    level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
  })
);

// File transports (development only, skip in production/Railway)
if (process.env.NODE_ENV !== 'test' && canWriteLogs) {
  // Combined log file
  transports.push(
    new winston.transports.File({
      filename: path.join(logsDir, 'combined.log'),
      format: logFormat,
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    })
  );

  // Error log file
  transports.push(
    new winston.transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error',
      format: logFormat,
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    })
  );
}


// Create logger config
const loggerConfig = {
  level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
  format: logFormat,
  defaultMeta: {
    service: 'uchqun-backend',
    environment: process.env.NODE_ENV || 'development',
  },
  transports,
};

// Add file-based exception/rejection handlers only if we can write logs
if (canWriteLogs) {
  loggerConfig.exceptionHandlers = [
    new winston.transports.File({
      filename: path.join(logsDir, 'exceptions.log'),
      format: logFormat,
    }),
  ];
  loggerConfig.rejectionHandlers = [
    new winston.transports.File({
      filename: path.join(logsDir, 'rejections.log'),
      format: logFormat,
    }),
  ];
}

// Create logger instance
const logger = winston.createLogger(loggerConfig);

// Create stream for HTTP request logging
logger.stream = {
  write: (message) => {
    logger.info(message.trim());
  },
};

export default logger;



