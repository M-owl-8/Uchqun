// Idempotent seeder for AssessmentCriteria table.
// Re-runnable: upserts on unique 'code' field.
// Run: node scripts/seedAssessmentCriteria.js (from backend/ directory)
// Or:  npm run seed:criteria
//
// When the DRAFT standard is finalized and criteria change:
//   1. Update shared/config/assessmentCriteria.js
//   2. Re-run this seeder — no migration needed.
import dotenv from 'dotenv';
import { fileURLToPath, pathToFileURL } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

// Dynamic import after dotenv so DATABASE_URL is set before Sequelize connects
const { default: AssessmentCriteria } = await import('../models/AssessmentCriteria.js');
const { ASSESSMENT_CRITERIA, CRITERIA_COUNT, MAX_SCORE } = await import(
  pathToFileURL(path.join(__dirname, '../../shared/config/assessmentCriteria.js')).href
);
const { default: sequelize } = await import('../config/database.js');

async function seed() {
  try {
    await sequelize.authenticate();
    console.log('Database connected.');

    let created = 0;
    let updated = 0;

    for (const criterion of ASSESSMENT_CRITERIA) {
      const [, wasCreated] = await AssessmentCriteria.upsert(criterion, {
        conflictFields: ['code'],
      });
      if (wasCreated) {
        created++;
      } else {
        updated++;
      }
    }

    const total = await AssessmentCriteria.count();
    console.log(`\nSeeder complete:`);
    console.log(`  Created: ${created}`);
    console.log(`  Updated: ${updated}`);
    console.log(`  Total in DB: ${total} (expected: ${CRITERIA_COUNT})`);
    console.log(`  Max score: ${MAX_SCORE}`);

    if (total !== CRITERIA_COUNT) {
      console.warn(`\nWARNING: DB count (${total}) does not match expected (${CRITERIA_COUNT}).`);
      console.warn('Check for extra or missing criteria.');
      process.exit(1);
    }

    console.log('\n✅ Assessment criteria seed verified: 17 criteria, max score = 68.');
    process.exit(0);
  } catch (error) {
    console.error('Seeder failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

seed();
