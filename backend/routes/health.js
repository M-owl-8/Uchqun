import express from 'express';
import sequelize from '../config/database.js';
import logger from '../utils/logger.js';
import { getAuditHealth } from '../utils/auditLogger.js';

const router = express.Router();

/**
 * Basic health check endpoint
 * Railway uses this for health checks
 */
router.get('/', async (req, res) => {
  try {
    // Simple health check - just return OK immediately
    // Don't check database here to avoid blocking deployment
    // Railway needs fast response for healthchecks
    res.status(200).json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'uchqun-backend',
      environment: process.env.NODE_ENV || 'development',
      uptime: process.uptime(),
    });
  } catch (error) {
    // Even if there's an error, return 200 to allow deployment
    // This ensures Railway doesn't fail deployment due to healthcheck errors
    res.status(200).json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'uchqun-backend',
      note: 'Health check endpoint responding',
    });
  }
});

/**
 * Readiness probe - checks if the service is ready to accept traffic
 * Includes database connectivity check
 */
router.get('/readiness', async (req, res) => {
  try {
    // Check database connection
    await sequelize.authenticate();

    // P2: audit writes are swallowed by design so they never break a feature.
    // That made a silent, months-long failure possible (D-27). Surface it here,
    // on the probe docs/OPERATIONS.md:112 calls "the canonical monitor".
    // Railway health-checks /health (railway.toml:8), not this path, so a
    // degraded audit trail alerts an operator without pulling the service.
    const audit = getAuditHealth();

    res.status(audit.healthy ? 200 : 503).json({
      status: audit.healthy ? 'ready' : 'degraded',
      timestamp: new Date().toISOString(),
      checks: {
        database: 'healthy',
        auditLog: audit.healthy ? 'healthy' : 'degraded',
      },
      audit: {
        writes: audit.writes,
        failures: audit.failures,
        lastAction: audit.lastAction,
        lastFailureAt: audit.lastFailureAt,
        lastError: process.env.NODE_ENV === 'production' ? undefined : audit.lastError,
      },
    });
  } catch (error) {
    logger.error('Readiness check failed', { error: error.message });
    res.status(503).json({
      status: 'not ready',
      timestamp: new Date().toISOString(),
      checks: {
        database: 'unhealthy',
      },
      error: process.env.NODE_ENV === 'production' 
        ? 'Service not ready'
        : error.message,
    });
  }
});

/**
 * Liveness probe - checks if the service is alive
 * Simple check that the process is running
 */
router.get('/liveness', (req, res) => {
  res.json({
    status: 'alive',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

export default router;



