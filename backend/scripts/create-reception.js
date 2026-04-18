/**
 * Create a reception account (pre-approved) for testing/production
 *
 * Usage:
 *   node scripts/create-reception.js
 *   npm run create:reception
 *
 * Override defaults via env:
 *   RECEPTION_EMAIL=...  RECEPTION_PASSWORD=...
 */

import dotenv from 'dotenv';
import sequelize from '../config/database.js';
import User from '../models/User.js';
import School from '../models/School.js';

dotenv.config();

const RECEPTION_EMAIL    = process.env.RECEPTION_EMAIL    || 'reception@uchqun.uz';
const RECEPTION_PASSWORD = process.env.RECEPTION_PASSWORD || 'Reception@2025';

const run = async () => {
  try {
    console.log('Connecting to database...');
    await sequelize.authenticate();
    console.log('Connected\n');

    const school = await School.findOne({ where: { isActive: true }, order: [['createdAt', 'ASC']] });
    if (!school) {
      console.error('No active school found. Run create-demo-accounts.js first or seed a school.');
      process.exit(1);
    }
    console.log(`Using school: ${school.name} (${school.id})`);

    let reception = await User.findOne({ where: { email: RECEPTION_EMAIL } });
    if (reception) {
      console.log(`Reception already exists: ${RECEPTION_EMAIL}`);
      if (!reception.documentsApproved || !reception.isActive) {
        await reception.update({ documentsApproved: true, isActive: true, isVerified: true });
        console.log('Updated: documentsApproved=true, isActive=true');
      }
    } else {
      reception = await User.create({
        email: RECEPTION_EMAIL,
        password: RECEPTION_PASSWORD,
        firstName: 'Demo',
        lastName: 'Reception',
        role: 'reception',
        isActive: true,
        isVerified: true,
        documentsApproved: true,
        schoolId: school.id,
      });
      console.log(`Reception created: ${RECEPTION_EMAIL}`);
    }

    console.log('\n' + '='.repeat(55));
    console.log('  RECEPTION ACCOUNT READY');
    console.log('='.repeat(55));
    console.log(`  Email    → ${RECEPTION_EMAIL}`);
    console.log(`  Password → ${RECEPTION_PASSWORD}`);
    console.log(`  School   → ${school.name}`);
    console.log('='.repeat(55));

    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    if (err.errors) err.errors.forEach(e => console.error(' -', e.message));
    process.exit(1);
  }
};

run();
