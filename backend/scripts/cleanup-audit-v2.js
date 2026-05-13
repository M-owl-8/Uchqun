/**
 * Cleanup script for v2 audit test records.
 * Run MANUALLY after reviewing AUDIT_REPORT_V2.md.
 *
 * Usage: cd backend && node scripts/cleanup-audit-v2.js
 *
 * Records targeted (all prefixed v2-):
 *   - v2-regression-teacher@uchqun.uz (UUID: cc69745a-fae0-4555-b2c7-23dc7f479cd4)
 */

import sequelize from '../config/database.js';
import User from '../models/User.js';

const V2_EMAILS = [
  'v2-regression-teacher@uchqun.uz',
];

async function cleanup() {
  try {
    await sequelize.authenticate();
    console.log('DB connected');

    for (const email of V2_EMAILS) {
      const user = await User.findOne({ where: { email }, paranoid: false });
      if (!user) {
        console.log(`  SKIP — not found: ${email}`);
        continue;
      }
      await user.destroy({ force: true });
      console.log(`  DELETED (hard): ${email} (${user.id})`);
    }

    console.log('\nCleanup complete.');
  } catch (err) {
    console.error('Cleanup failed:', err.message);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

cleanup();
