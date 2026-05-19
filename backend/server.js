import express from 'express';
import { createServer } from 'http';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { syncDatabase } from './models/index.js';
import sequelize from './config/database.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';
import { initializeSocket } from './config/socket.js';
import { securityHeaders, enforceHTTPS } from './middleware/security.js';
import { sanitizeBody } from './middleware/sanitize.js';
import { requestLogger, errorLogger } from './middleware/requestLogger.js';
import { apiLimiter } from './middleware/rateLimiter.js';
import logger from './utils/logger.js';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './config/swagger.js';

import './config/env.js';
import './utils/errorTracker.js';

import healthRoutes from './routes/health.js';
import authRoutes from './routes/authRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import receptionRoutes from './routes/receptionRoutes.js';
import parentRoutes from './routes/parentRoutes.js';
import teacherRoutes from './routes/teacherRoutes.js';
import childRoutes from './routes/childRoutes.js';
import userRoutes from './routes/userRoutes.js';
import activityRoutes from './routes/activityRoutes.js';
import mediaRoutes from './routes/mediaRoutes.js';
import mealRoutes from './routes/mealRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import progressRoutes from './routes/progressRoutes.js';
import groupRoutes from './routes/groupRoutes.js';
import chatRoutes from './routes/chatRoutes.js';
import therapyRoutes from './routes/therapyRoutes.js';
import aiWarningRoutes from './routes/aiWarningRoutes.js';
import governmentRoutes from './routes/governmentRoutes.js';
import businessRoutes from './routes/businessRoutes.js';
import childAssessmentRoutes from './routes/childAssessmentRoutes.js';
import servicePlanRoutes from './routes/servicePlanRoutes.js';
import mealPlanRoutes from './routes/mealPlanRoutes.js';
import teacherResourceRoutes from './routes/teacherResourceRoutes.js';
import migrationRoutes from './routes/migrationRoutes.js';
import newsRoutes from './routes/newsRoutes.js';
import attendanceRoutes from './routes/attendanceRoutes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const __dirname = path.dirname(fileURLToPath(import.meta.url));

app.set('trust proxy', 1);

app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'uchqun-backend',
    version: process.env.npm_package_version || '1.0.0',
    uptime: process.uptime(),
  });
});

app.use(securityHeaders);

if (process.env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    if (req.path === '/health') return next();
    enforceHTTPS(req, res, next);
  });
}

const localhostOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175',
  'http://localhost:5177',
];

// Production: FRONTEND_URL (comma-separated) is the explicit allowlist.
// Dev/staging: fall back to localhost + deploy-preview regex.
const isProduction = process.env.NODE_ENV === 'production';
const frontendUrls = process.env.FRONTEND_URL
  ? process.env.FRONTEND_URL.split(',').map((u) => u.trim()).filter(Boolean)
  : [];

if (isProduction && frontendUrls.length === 0) {
  logger.warn('CORS: FRONTEND_URL is not set in production — all cross-origin requests will be blocked');
}

const allowedOrigins = isProduction
  ? frontendUrls
  : [...new Set([...localhostOrigins, ...frontendUrls])];

// Require explicit opt-in to open CORS in dev; production always uses FRONTEND_URL allowlist.
const allowAllOrigins = !isProduction && process.env.CORS_DEV_OPEN === 'true';

logger.info('CORS configured', { origins: allowedOrigins, environment: process.env.NODE_ENV });

app.use(cors({
  origin: (origin, callback) => {
    if (allowAllOrigins) return callback(null, true);
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    // Non-production: allow deploy-preview-NNN-- prefix for staging/review workflows.
    // Production: regex not used — FRONTEND_URL is the sole explicit allowlist.
    if (!isProduction) {
      // eslint-disable-next-line security/detect-unsafe-regex
      const deployRegex = /^https:\/\/(deploy-preview-\d+--)?uchqun-[a-z-]+\.(netlify|vercel)\.app$/;
      if (deployRegex.test(origin)) return callback(null, true);
    }
    logger.warn('CORS blocked', { origin });
    // callback(null, false) suppresses the response header; the browser
    // receives a CORS error without triggering the Express error handler.
    // Using new Error() here causes Express to return 500, which is wrong.
    callback(null, false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin', 'x-migration-secret'],
  exposedHeaders: ['Authorization', 'Content-Range', 'X-Content-Range', 'X-Total-Count'],
  maxAge: 86400,
  preflightContinue: false,
  optionsSuccessStatus: 204,
}));

app.use(requestLogger);

app.use((req, res, next) => {
  const isUpload = req.headers['content-type']?.includes('multipart') ||
    req.path.includes('/avatar') || req.path.includes('/media');
  req.setTimeout(isUpload ? 120000 : 30000, () => {
    if (!res.headersSent) {
      logger.warn('Request timeout', { method: req.method, path: req.path, ip: req.ip });
      res.status(504).json({ error: 'Request timeout' });
    }
  });
  next();
});

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());
app.use(sanitizeBody);

app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// Global rate limiter — applies to all /api/* routes; health and static files are above
app.use('/api', apiLimiter);

app.use('/health', healthRoutes);
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/reception', receptionRoutes);
app.use('/api/v1/parent', parentRoutes);
app.use('/api/v1/teacher', teacherRoutes);
app.use('/api/v1/child', childRoutes);
app.use('/api/v1/user', userRoutes);
app.use('/api/v1/migrations', migrationRoutes);
app.use('/api/v1/activities', activityRoutes);
app.use('/api/v1/media', mediaRoutes);
app.use('/api/v1/meals', mealRoutes);
app.use('/api/v1/notifications', notificationRoutes);
app.use('/api/v1/chat', chatRoutes);
app.use('/api/v1/progress', progressRoutes);
app.use('/api/v1/groups', groupRoutes);
app.use('/api/v1/therapy', therapyRoutes);
app.use('/api/v1/ai-warnings', aiWarningRoutes);
app.use('/api/v1/government', governmentRoutes);
app.use('/api/v1/business', businessRoutes);
app.use('/api/v1/assessments', childAssessmentRoutes);
app.use('/api/v1/service-plans', servicePlanRoutes);
app.use('/api/v1/meal-plans', mealPlanRoutes);
app.use('/api/v1/resources', teacherResourceRoutes);
app.use('/api/v1/news', newsRoutes);
app.use('/api/v1/attendance', attendanceRoutes);

if (process.env.NODE_ENV !== 'production') {
  app.use('/api/v1/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
}

app.use(notFound);
app.use(errorLogger);
app.use(errorHandler);

const httpServer = createServer(app);
const io = initializeSocket(httpServer);

export { io };

const shutdown = async (signal) => {
  logger.info(`${signal} received, shutting down gracefully`);
  httpServer.close(async () => {
    try {
      await sequelize.close();
      logger.info('Database connection closed');
    } catch (err) {
      logger.error('Error closing database connection', { error: err.message });
    }
    process.exit(0);
  });
  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 30000);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Promise Rejection', {
    reason: reason instanceof Error ? reason.message : String(reason),
    stack: reason instanceof Error ? reason.stack : undefined,
    promise: String(promise),
  });
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception — shutting down', { error: error.message, stack: error.stack });
  shutdown('uncaughtException');
});

httpServer.listen(PORT, '0.0.0.0', () => {
  logger.info('Server started', {
    port: PORT,
    environment: process.env.NODE_ENV || 'development',
    apiUrl: `http://localhost:${PORT}/api/v1`,
  });

  if (process.env.RUN_MIGRATIONS === 'true') {
    (async () => {
      try {
        const { runMigrations } = await import('./config/migrate.js');
        await runMigrations();
        logger.info('Migrations completed');
      } catch (err) {
        logger.error('Migration failed', { error: err.message });
      }
    })();
  }

  if (process.env.NODE_ENV !== 'production' && process.env.FORCE_SYNC === 'true') {
    (async () => {
      try {
        logger.warn('FORCE_SYNC enabled — dropping and recreating all tables');
        await syncDatabase(true);
      } catch (err) {
        logger.error('Sync error', { error: err.message });
      }
    })();
  }
});

export default app;
