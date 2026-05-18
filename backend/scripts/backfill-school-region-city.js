/**
 * One-time backfill: populate region/city/director on schools from approved registration requests.
 * Run after the 20260518100000-add-school-region-city-director migration.
 *
 * Usage:  node backend/scripts/backfill-school-region-city.js
 */
import sequelize from '../config/database.js';
import School from '../models/School.js';
import AdminRegistrationRequest from '../models/AdminRegistrationRequest.js';
import { Op } from 'sequelize';

async function backfill() {
  await sequelize.authenticate();
  const schools = await School.findAll({
    where: { region: null },
    attributes: ['id', 'name', 'region', 'city', 'director'],
  });

  let updated = 0;
  for (const school of schools) {
    const req = await AdminRegistrationRequest.findOne({
      where: { schoolId: school.id, status: 'approved' },
      order: [['createdAt', 'DESC']],
    });
    if (req) {
      const patch = {};
      if (req.region) patch.region = req.region;
      if (req.city) patch.city = req.city;
      if (!school.director) patch.director = `${req.firstName} ${req.lastName}`;
      if (Object.keys(patch).length > 0) {
        await school.update(patch);
        updated++;
        console.log(`Updated ${school.name}: ${JSON.stringify(patch)}`);
      }
    }
  }
  console.log(`\nBackfilled ${updated} of ${schools.length} schools.`);
  process.exit(0);
}

backfill().catch(err => { console.error(err); process.exit(1); });
