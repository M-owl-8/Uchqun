import dotenv from 'dotenv';
import crypto from 'crypto';
import sequelize from '../config/database.js';
import User from '../models/User.js';

dotenv.config();

async function createSuperAdmin() {
  let hasError = false;
  try {
    console.log('🔍 Connecting to database...');
    console.log('Database URL:', process.env.DATABASE_PUBLIC_URL ? 'Using DATABASE_PUBLIC_URL' : 'Using individual variables');
    console.log('DB Host:', process.env.DB_HOST || 'localhost');
    await sequelize.authenticate();
    console.log('✅ Database connected');

    // Sync models
    await User.sync();

    const superAdminData = {
      email: process.env.SUPER_ADMIN_EMAIL || 'superadmin@uchqun.uz',
      password: process.env.SUPER_ADMIN_DEFAULT_PASSWORD || crypto.randomBytes(16).toString('hex'),
      firstName: 'Super',
      lastName: 'Admin',
      role: 'admin', // Using 'admin' role (highest permission)
      phone: '+998901234567',
      status: 'active'
    };

    // Check if super admin already exists
    const existing = await User.findOne({
      where: { email: superAdminData.email }
    });

    if (existing) {
      console.log('⚠️  Super admin already exists!');
      console.log('Email:', existing.email);
      console.log('Role:', existing.role);
      return;
    }

    // Create super admin (password will be hashed automatically by User model hook)
    const superAdmin = await User.create({
      ...superAdminData
    });

    console.log('\n✅ Super admin created successfully!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📧 Email:', superAdminData.email);
    console.log('🔑 Password:', superAdminData.password);
    console.log('👤 Name:', `${superAdmin.firstName} ${superAdmin.lastName}`);
    console.log('🎭 Role:', superAdmin.role);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('⚠️  IMPORTANT: Change the password after first login!');

  } catch (error) {
    hasError = true;
    console.error('❌ Error creating super admin:', error.message);
    
    // Provide helpful error messages
    if (error.name === 'SequelizeConnectionError' || error.message.includes('ETIMEDOUT') || error.message.includes('ECONNREFUSED')) {
      console.error('\n💡 Database connection error!');
      console.error('Please check:');
      console.error('  1. PostgreSQL is running');
      console.error('  2. Database credentials in .env file are correct');
      console.error('  3. Database "uchqun" exists');
      console.error('  4. Network connection to database server');
      console.error('\nCurrent database config:');
      console.error(`  Host: ${process.env.DB_HOST || 'localhost'}`);
      console.error(`  Port: ${process.env.DB_PORT || 5432}`);
      console.error(`  Database: ${process.env.DB_NAME || 'uchqun'}`);
      console.error(`  User: ${process.env.DB_USER || 'postgres'}`);
    }
    
    if (error.stack) {
      console.error('\nStack trace:', error.stack);
    }
  } finally {
    try {
      await sequelize.close();
    } catch (closeError) {
      // Ignore close errors
    }
    process.exit(hasError ? 1 : 0);
  }
}

createSuperAdmin();
