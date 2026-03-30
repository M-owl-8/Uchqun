import dotenv from 'dotenv';
import crypto from 'crypto';
import sequelize from '../config/database.js';
import User from '../models/User.js';

dotenv.config();

const createAdmin = async () => {
  try {
    console.log('🔍 Connecting to database...');
    await sequelize.authenticate();
    console.log('✅ Connected to database');

    const email = process.env.ADMIN_EMAIL || 'admin@uchqun.com';
    const password = process.env.ADMIN_PASSWORD || crypto.randomBytes(16).toString('hex');
    const firstName = 'Admin';
    const lastName = 'User';

    // Check if admin already exists
    const existingAdmin = await User.findOne({ where: { email } });
    if (existingAdmin) {
      console.log(`\n⚠️  Admin account already exists:`);
      console.log(`   Email: ${email}`);
      console.log(`   Password: ${password}`);
      console.log(`\n💡 To reset the password, delete the user first or update it manually.`);
      process.exit(0);
    }

    // Create admin account
    console.log('\n👑 Creating admin account...');
    const admin = await User.create({
      email,
      password,
      firstName,
      lastName,
      role: 'admin',
    });

    console.log('\n✅ Admin account created successfully!');
    console.log('\n📝 Login credentials:');
    console.log(`   Email: ${email}`);
    console.log(`   Password: ${password}`);
    console.log('\n✨ You can now log in with these credentials.');
    console.log('\n⚠️  Remember to change the password after first login!');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating admin account:', error);
    process.exit(1);
  }
};

createAdmin();



