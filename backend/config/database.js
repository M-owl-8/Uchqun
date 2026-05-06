import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';

dotenv.config();

// Support both DATABASE_URL format and individual variables
let sequelize;

// Determine if we should use SSL
// Only use SSL in production or if explicitly required
const isProduction = process.env.NODE_ENV === 'production';
const useSSL = isProduction && (process.env.DATABASE_URL || process.env.DATABASE_PUBLIC_URL);

if (process.env.DATABASE_URL || process.env.DATABASE_PUBLIC_URL) {
  // Use DATABASE_URL if provided (Railway, Heroku, etc.)
  const dbUrl = process.env.DATABASE_URL || process.env.DATABASE_PUBLIC_URL;
  
  // Check if it's a local database (localhost or 127.0.0.1)
  const isLocalDatabase = dbUrl.includes('localhost') || dbUrl.includes('127.0.0.1');
  
  sequelize = new Sequelize(dbUrl, {
    dialect: 'postgres',
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    pool: {
      max: parseInt(process.env.DB_POOL_MAX, 10) || 20,
      min: 0,
      acquire: 60000,
      idle: 10000,
      evict: 1000,
    },
    dialectOptions: {
      ssl: useSSL && !isLocalDatabase ? {
        require: true,
        rejectUnauthorized: true,
      } : false,
      connectTimeout: 60000,
    },
    retry: {
      max: 3,
      match: [/ETIMEDOUT/, /EHOSTUNREACH/, /ECONNREFUSED/, /SequelizeConnectionError/],
    },
  });
} else {
  // Use individual variables (local development)
  sequelize = new Sequelize(
    process.env.DB_NAME || 'uchqun',
    process.env.DB_USER || 'postgres',
    process.env.DB_PASSWORD || 'postgres',
    {
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      dialect: 'postgres',
      logging: process.env.NODE_ENV === 'development' ? console.log : false,
      pool: {
        max: parseInt(process.env.DB_POOL_MAX, 10) || 20,
        min: 0,
        acquire: 60000,
        idle: 10000,
        evict: 1000,
      },
      dialectOptions: {
        // No SSL for local development
        ssl: false,
        connectTimeout: 60000, // 60 seconds connection timeout
      },
      retry: {
        max: 3,
        match: [/ETIMEDOUT/, /EHOSTUNREACH/, /ECONNREFUSED/, /SequelizeConnectionError/],
      },
    }
  );
}

export default sequelize;



