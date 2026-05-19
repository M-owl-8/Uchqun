import dotenv from 'dotenv';
import { Sequelize } from 'sequelize';
import logger from '../utils/logger.js';

dotenv.config();

if (process.env.ALLOW_DB_RESET !== 'true') {
  logger.error('reset-database: ALLOW_DB_RESET is not set to "true". Aborting.');
  process.exit(1);
}

const isDryRun = process.argv.includes('--dry-run');

const sequelize = new Sequelize(
  'postgres',
  process.env.DB_USER || 'postgres',
  process.env.DB_PASSWORD || 'postgres',
  {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    dialect: 'postgres',
    logging: false,
  }
);

async function resetDatabase() {
  const dbName = process.env.DB_NAME || 'uchqun';
  try {
    logger.info('reset-database: connecting to PostgreSQL...');
    await sequelize.authenticate();
    logger.info('reset-database: connected');

    if (isDryRun) {
      logger.info(`reset-database: DRY RUN — would drop and recreate database "${dbName}"`);
      process.exit(0);
    }

    logger.info(`reset-database: resetting database "${dbName}"...`);

    await sequelize.query(
      `
      SELECT pg_terminate_backend(pid)
      FROM pg_stat_activity
      WHERE datname = :dbName
        AND pid <> pg_backend_pid();
      `,
      { replacements: { dbName } }
    );

    await sequelize.query(`DROP DATABASE IF EXISTS "${dbName}";`);
    await sequelize.query(`CREATE DATABASE "${dbName}";`);

    logger.info(`reset-database: database "${dbName}" reset successfully`);
    process.exit(0);
  } catch (error) {
    logger.error('reset-database: error', { error: error.original?.message || error.message });
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

resetDatabase();
