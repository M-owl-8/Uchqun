import express from 'express';
import { createServer } from 'http';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { syncDatabase } from './models/index.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';
import { initializeSocket } from './config/socket.js';

// Import security middleware
import { securityHeaders, enforceHTTPS } from './middleware/security.js';
import { sanitizeBody } from './middleware/sanitize.js';
import { requestLogger } from './middleware/requestLogger.js';
import logger from './utils/logger.js';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './config/swagger.js';

// Validate environment variables
import './config/env.js';

// Setup error tracking
import './utils/errorTracker.js';

// Import routes
import healthRoutes from './routes/health.js';
import authRoutes from './routes/authRoutes.js';
// New role-based routes
import adminRoutes from './routes/adminRoutes.js';
import superAdminRoutes from './routes/superAdminRoutes.js';
import receptionRoutes from './routes/receptionRoutes.js';
import parentRoutes from './routes/parentRoutes.js';
import teacherRoutes from './routes/teacherRoutes.js';
import childRoutes from './routes/childRoutes.js';
import userRoutes from './routes/userRoutes.js';
// Activity, meal, and media routes
import activityRoutes from './routes/activityRoutes.js';
import mediaRoutes from './routes/mediaRoutes.js';
import mealRoutes from './routes/mealRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
// Legacy routes (kept for backward compatibility if needed)
import progressRoutes from './routes/progressRoutes.js';
import groupRoutes from './routes/groupRoutes.js';
import chatRoutes from './routes/chatRoutes.js';
// New feature routes
import therapyRoutes from './routes/therapyRoutes.js';
import aiWarningRoutes from './routes/aiWarningRoutes.js';
import pushNotificationRoutes from './routes/pushNotificationRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import governmentRoutes from './routes/governmentRoutes.js';
import businessRoutes from './routes/businessRoutes.js';
import childAssessmentRoutes from './routes/childAssessmentRoutes.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const localUploadsRoot = process.env.LOCAL_UPLOADS_DIR || path.join(process.cwd(), 'uploads');

// Trust proxy (needed for HTTPS behind reverse proxy)
app.set('trust proxy', 1);

// Simple health check endpoint (must be FIRST - before all middleware including HTTPS enforcement)
// This allows Railway to check health even during server startup
// Must be before enforceHTTPS to avoid redirects that break healthchecks
// IMPORTANT: No database checks here - just verify server is responding
// Database checks should be done via /health/readiness endpoint
app.get('/health', (req, res) => {
  // Return immediately without any async operations
  // This ensures Railway healthcheck passes quickly
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'uchqun-backend',
    version: process.env.npm_package_version || '1.0.0',
    uptime: process.uptime(),
  });
});

// Security middleware (after health endpoint)
app.use(securityHeaders);

// HTTPS enforcement (production only)
// Skip health endpoint to allow Railway healthchecks over HTTP
if (process.env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    // Skip HTTPS enforcement for health endpoint
    if (req.path === '/health') {
      return next();
    }
    enforceHTTPS(req, res, next);
  });
}

// CORS Configuration
const defaultOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175',
  'http://localhost:5176',
  'http://localhost:5177', // Super-admin panel
  'https://uchqun-platform.vercel.app',
  'https://uchqunedu.uz',
  'https://www.uchqunedu.uz',
  // Netlify deployments
  'https://uchqun-reception.netlify.app',
  'https://uchqun-admin.netlify.app',
  'https://uchqun-teacher.netlify.app',
  'https://uchqun-government.netlify.app',
  'https://uchqun-super-admin.netlify.app',
];

const allowedOrigins = process.env.FRONTEND_URL
  ? [
      ...defaultOrigins,
      ...process.env.FRONTEND_URL.split(',').map(url => url.trim()).filter(url => {
        // Remove old Railway URLs (uchqun-production-4f83)
        return !url.includes('uchqun-production-4f83');
      })
    ].filter((url, index, self) => self.indexOf(url) === index) // Remove duplicates
  : defaultOrigins;

// In production, default to strict CORS; opt out with CORS_STRICT=false
const allowAllOrigins = process.env.NODE_ENV === 'production'
  ? process.env.CORS_STRICT === 'false'
  : process.env.CORS_STRICT !== 'true' ? true : false;

// Log allowed origins (both development and production for debugging)
logger.info('CORS allowed origins:', { origins: allowedOrigins, environment: process.env.NODE_ENV });

app.use(cors({
  origin: (origin, callback) => {
    if (allowAllOrigins) {
      return callback(null, true);
    }

    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) {
      return callback(null, true);
    }

    // Check if origin is in allowed list
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      // In development, allow any localhost origin
      if (process.env.NODE_ENV === 'development' && origin.includes('localhost')) {
        callback(null, true);
      } else if (process.env.NODE_ENV === 'production') {
        // In production, allow Netlify and Vercel subdomains
        if (origin.includes('.netlify.app') || origin.includes('.vercel.app')) {
          callback(null, true);
        } else {
          // Log blocked origin for debugging
          logger.warn('CORS blocked origin:', { origin, allowedOrigins, environment: process.env.NODE_ENV });
          callback(new Error(`CORS: Origin ${origin} is not allowed`));
        }
      } else {
        // Log blocked origin for debugging
        logger.warn('CORS blocked origin:', { origin, allowedOrigins, environment: process.env.NODE_ENV });
        callback(new Error(`CORS: Origin ${origin} is not allowed`));
      }
    }
  },
  credentials: true, // Allow cookies and authorization headers
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'Origin',
    'Access-Control-Request-Method',
    'Access-Control-Request-Headers',
    'x-migration-secret'
  ],
  exposedHeaders: [
    'Authorization',
    'Content-Range',
    'X-Content-Range',
    'X-Total-Count'
  ],
  maxAge: 86400, // Cache preflight requests for 24 hours
  preflightContinue: false, // Let cors handle preflight
  optionsSuccessStatus: 204 // Some legacy browsers (IE11) choke on 204
}));

// Request logging (should be after body parsing but before routes)
app.use(requestLogger);

// Request timeout middleware - prevent 499 errors
app.use((req, res, next) => {
  // File uploads (multipart) and media routes get 120s, everything else 30s
  const isUpload = req.headers['content-type']?.includes('multipart') ||
    req.path.includes('/avatar') || req.path.includes('/media');
  const timeout = isUpload ? 120000 : 30000;
  req.setTimeout(timeout, () => {
    if (!res.headersSent) {
      logger.warn('Request timeout', {
        method: req.method,
        path: req.path,
        ip: req.ip
      });
      res.status(504).json({ error: 'Request timeout' });
    }
  });
  next();
});

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Sanitize request body strings (XSS prevention)
app.use(sanitizeBody);

// CSRF protection removed - using Bearer token authentication instead

// Serve local uploads (works for both fallback and misconfigured remote storage)

app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// Health check routes (before API routes, no rate limiting)
// Must be registered early so Railway can check health during deployment
// Health routes are available at /health/readiness and /health/liveness
// Main /health endpoint is defined inline above (before middleware) for Railway
app.use('/health', healthRoutes);

// API Routes
// Authentication (public)
app.use('/api/auth', authRoutes);

// Super Admin routes (public, protected by secret key)
app.use('/api/super-admin', superAdminRoutes);

// Role-based routes
app.use('/api/admin', adminRoutes);        // Admin routes (document verification, reception management)
app.use('/api/reception', receptionRoutes); // Reception routes (teacher/parent management, document upload)
app.use('/api/parent', parentRoutes);       // Parent routes (view own activities, meals, media)
app.use('/api/teacher', teacherRoutes);     // Teacher routes (responsibilities, tasks, work history)
app.use('/api/child', childRoutes);         // Child routes (child management for parents)
app.use('/api/user', userRoutes);           // User profile, avatar, password (authenticated)

// Migration routes (public for Railway deployment)
import migrationRoutes from './routes/migrationRoutes.js';
app.use('/api/migrations', migrationRoutes);

// Activity, meal, and media routes
app.use('/api/activities', activityRoutes);
app.use('/api/media', mediaRoutes);
app.use('/api/meals', mealRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/chat', chatRoutes);

// Legacy routes (kept for backward compatibility if needed)
app.use('/api/progress', progressRoutes);
app.use('/api/groups', groupRoutes);

// New feature routes
app.use('/api/therapy', therapyRoutes);
app.use('/api/ai-warnings', aiWarningRoutes);
app.use('/api/push-notifications', pushNotificationRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/government', governmentRoutes);
app.use('/api/business', businessRoutes);
app.use('/api/assessments', childAssessmentRoutes);

// API Documentation (non-production only)
if (process.env.NODE_ENV !== 'production') {
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
}

// Error handling
app.use(notFound);
app.use(errorHandler);

// Create HTTP server for Socket.IO
const httpServer = createServer(app);

// Initialize Socket.IO
const io = initializeSocket(httpServer);

// Export io for use in controllers
export { io };

// Start server immediately so healthcheck can respond
// Run migrations in background after server starts
httpServer.listen(PORT, '0.0.0.0', () => {
  logger.info(`Server started`, {
    port: PORT,
    environment: process.env.NODE_ENV || 'development',
    apiUrl: `http://localhost:${PORT}/api`,
  });
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📡 API available at http://localhost:${PORT}/api`);
  console.log(`⚡ Socket.IO WebSocket server ready`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`✅ Health check available at /health`);
  
  // Run migrations in background after server starts (only if RUN_MIGRATIONS env var is set)
  // This allows healthcheck to respond immediately
  // Migrations should be run manually or via deployment script, not on every restart
  if (process.env.RUN_MIGRATIONS === 'true') {
    (async () => {
      try {
        console.log('Running database migrations in background...');
        try {
          const { runMigrations } = await import('./config/migrate.js');
          await runMigrations();
          console.log('✓ Migrations completed successfully');
        } catch (migrationError) {
          console.error('⚠ Migration error:', migrationError.message);
          console.error('Migration error stack:', migrationError.stack);
          // Don't exit on migration errors - allow server to continue
          // Migrations can be run manually if needed
          console.warn('⚠ Continuing despite migration errors - server will continue running');
          logger.warn('Migration failed but server continuing', { error: migrationError.message });
        }
      } catch (error) {
        console.error('Background migration task error:', error);
        logger.error('Background migration task failed', { error: error.message });
        // Don't exit - server should continue running
      }
    })();
  } else {
    console.log('ℹ Migrations skipped (set RUN_MIGRATIONS=true to run migrations on startup)');
  }
  
  // In development, also allow sync for convenience
  if (process.env.NODE_ENV !== 'production') {
    (async () => {
      try {
        const forceSync = process.env.FORCE_SYNC === 'true';
        if (forceSync) {
          console.warn('⚠ WARNING: FORCE_SYNC is enabled. This will drop all tables!');
          await syncDatabase(forceSync);
        }
      } catch (error) {
        console.error('Sync error:', error.message);
      }
    })();
  }
});

export default app;

