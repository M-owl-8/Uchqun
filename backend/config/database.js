import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';

dotenv.config();

const isProduction = process.env.NODE_ENV === 'production';
const useSSL = isProduction && (process.env.DATABASE_URL || process.env.DATABASE_PUBLIC_URL);

const POOL_CONFIG = {
  max: parseInt(process.env.DB_POOL_MAX, 10) || 20,
  min: 0,
  acquire: 60000,
  idle: 10000,
  evict: 1000,
};

const RETRY_CONFIG = {
  max: 3,
  match: [/ETIMEDOUT/, /EHOSTUNREACH/, /ECONNREFUSED/, /SequelizeConnectionError/],
};

let sequelize;

if (process.env.DATABASE_URL || process.env.DATABASE_PUBLIC_URL) {
  const dbUrl = process.env.DATABASE_URL || process.env.DATABASE_PUBLIC_URL;
  const isLocalDatabase = dbUrl.includes('localhost') || dbUrl.includes('127.0.0.1');

  sequelize = new Sequelize(dbUrl, {
    dialect: 'postgres',
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    pool: POOL_CONFIG,
    dialectOptions: {
      // Railway Postgres uses a self-signed cert — rejectUnauthorized must be false.
      // The private network URL (postgres.railway.internal) is not exposed publicly,
      // so the risk of MITM is contained to Railway's internal network.
      ssl: useSSL && !isLocalDatabase ? { require: true, rejectUnauthorized: false } : false,
      connectTimeout: 60000,
    },
    retry: RETRY_CONFIG,
  });
} else {
  sequelize = new Sequelize(
    process.env.DB_NAME || 'uchqun',
    process.env.DB_USER || 'postgres',
    process.env.DB_PASSWORD || 'postgres',
    {
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      dialect: 'postgres',
      logging: process.env.NODE_ENV === 'development' ? console.log : false,
      pool: POOL_CONFIG,
      dialectOptions: {
        ssl: false,
        connectTimeout: 60000,
      },
      retry: RETRY_CONFIG,
    }
  );
}

export default sequelize;
