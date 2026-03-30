/**
 * Script to create a teacher account
 * 
 * Usage: node scripts/create-teacher.js
 * Or: npm run create:teacher
 */

import dotenv from 'dotenv';
import crypto from 'crypto';
import sequelize from '../config/database.js';
import User from '../models/User.js';

dotenv.config();

const createTeacher = async () => {
  try {
    console.log('🔍 Connecting to database...');
    await sequelize.authenticate();
    console.log('✅ Connected to database');

    const email = process.env.TEACHER_EMAIL || 'teacher@example.com';
    const password = process.env.TEACHER_PASSWORD || crypto.randomBytes(16).toString('hex');
    const firstName = 'Teacher';
    const lastName = 'Admin';

    // Check if teacher already exists
    const existingTeacher = await User.findOne({ where: { email } });
    if (existingTeacher) {
      console.log(`\n⚠️  Teacher account already exists:`);
      console.log(`   Email: ${email}`);
      console.log(`   Password: ${password}`);
      console.log(`\n💡 To reset the password, delete the user first or update it manually.`);
      process.exit(0);
    }

    // Create teacher account
    console.log('\n👨‍🏫 Creating teacher account...');
    const teacher = await User.create({
      email,
      password,
      firstName,
      lastName,
      role: 'teacher',
    });

    console.log('\n✅ Teacher account created successfully!');
    console.log('\n📝 Login credentials:');
    console.log(`   Email: ${email}`);
    console.log(`   Password: ${password}`);
    console.log('\n✨ You can now log in with these credentials.');
    console.log('\n⚠️  Remember to change the password after first login!');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating teacher account:', error);
    process.exit(1);
  }
};

createTeacher();



