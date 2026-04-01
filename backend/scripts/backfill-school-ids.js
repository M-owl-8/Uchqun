import dotenv from 'dotenv';
import sequelize from '../config/database.js';
import User from '../models/User.js';
import School from '../models/School.js';

dotenv.config();

async function backfillSchoolIds() {
  try {
    await sequelize.authenticate();
    console.log('Connected to database');

    // Find all admins
    const admins = await User.findAll({ where: { role: 'admin' } });
    console.log(`Found ${admins.length} admins`);

    for (const admin of admins) {
      if (!admin.schoolId) {
        console.log(`Admin ${admin.email} has no schoolId - skipping (assign manually)`);
        continue;
      }

      const schoolId = admin.schoolId;
      console.log(`Processing admin ${admin.email} (school: ${schoolId})`);

      // Find receptions created by this admin
      const receptions = await User.findAll({
        where: { role: 'reception', createdBy: admin.id },
      });
      console.log(`  Found ${receptions.length} receptions`);

      for (const reception of receptions) {
        if (!reception.schoolId) {
          await reception.update({ schoolId });
          console.log(`  Updated reception ${reception.email}`);
        }

        // Find teachers and parents created by this reception
        const users = await User.findAll({
          where: { createdBy: reception.id },
        });
        let updated = 0;
        for (const user of users) {
          if (!user.schoolId) {
            await user.update({ schoolId });
            updated++;
          }
        }
        console.log(`  Updated ${updated} teachers/parents under ${reception.email}`);
      }
    }

    console.log('Backfill complete');
  } catch (error) {
    console.error('Backfill error:', error);
  } finally {
    await sequelize.close();
    process.exit(0);
  }
}

backfillSchoolIds();
