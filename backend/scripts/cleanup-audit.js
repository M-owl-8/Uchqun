/**
 * Deletes all records created during the 2026-05-13 production audit.
 * Run via: railway run node scripts/cleanup-audit.js
 * Safe to run multiple times (idempotent).
 */
import dotenv from 'dotenv';
import sequelize from '../config/database.js';
import User from '../models/User.js';
import Child from '../models/Child.js';

dotenv.config();

const AUDIT_EMAILS = [
  'audit-teacher@uchqun-test.local',
  'audit-parent@uchqun-test.local',
  'audit-new-teacher@uchqun-test.local',
  'tenant-check-audit@example.com',
];

(async () => {
  try {
    await sequelize.authenticate();
    console.log('Connected to database\n');

    for (const email of AUDIT_EMAILS) {
      const u = await User.findOne({ where: { email }, paranoid: false });
      if (!u) {
        console.log(`Not found (skip): ${email}`);
        continue;
      }
      // Delete children first (FK)
      const childCount = await Child.destroy({ where: { parentId: u.id }, force: true });
      if (childCount) console.log(`  Deleted ${childCount} child record(s) for ${email}`);
      await u.destroy({ force: true });
      console.log(`Deleted user: ${email}`);
    }

    console.log('\nCleanup complete.');
  } catch (err) {
    console.error('Cleanup error:', err.message);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
})();
