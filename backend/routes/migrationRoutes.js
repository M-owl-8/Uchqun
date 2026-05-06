import express from 'express';
import crypto from 'crypto';
import { runMigrations } from '../config/migrate.js';
import logger from '../utils/logger.js';

const router = express.Router();

const secretMatches = (provided, expected) => {
  if (!provided || !expected) return false;
  const a = crypto.createHash('sha256').update(String(provided)).digest();
  const b = crypto.createHash('sha256').update(String(expected)).digest();
  return crypto.timingSafeEqual(a, b);
};

router.post('/run', async (req, res) => {
  try {
    const secret = req.body.secret || req.headers['x-migration-secret'];
    const expectedSecret = process.env.MIGRATION_SECRET;

    if (!expectedSecret) {
      return res.status(500).json({ success: false, error: 'MIGRATION_SECRET env var is not configured' });
    }

    if (!secretMatches(secret, expectedSecret)) {
      return res.status(403).json({ success: false, error: 'Invalid migration secret key' });
    }

    logger.info('Manual migration trigger requested');
    const result = await runMigrations();
    res.json({ success: true, message: 'Migrations completed successfully', ...result });
  } catch (error) {
    logger.error('Migration error', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    });
  }
});

export default router;
