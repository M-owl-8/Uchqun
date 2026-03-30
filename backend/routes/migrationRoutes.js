import express from 'express';
import { runMigrations } from '../config/migrate.js';

const router = express.Router();

// Public endpoint to check migration status and run migrations
// This is useful for Railway where migrations might not run automatically
// Protected by secret key to prevent abuse
router.post('/run', async (req, res) => {
  try {
    // Optional: protect with secret key
    // Accept secret from body or query parameter to avoid CORS issues
    const secret = req.body.secret || req.headers['x-migration-secret'];
    const expectedSecret = process.env.MIGRATION_SECRET;

    if (!expectedSecret) {
      return res.status(500).json({ success: false, error: 'MIGRATION_SECRET env var is not configured' });
    }
    
    if (secret !== expectedSecret) {
      return res.status(403).json({ 
        success: false, 
        error: 'Invalid migration secret key' 
      });
    }
    
    console.log('Manual migration trigger requested');
    const result = await runMigrations();
    res.json({ 
      success: true, 
      message: 'Migrations completed successfully',
      ...result
    });
  } catch (error) {
    console.error('Migration error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

export default router;
