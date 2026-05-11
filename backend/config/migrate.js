// #02-013 — reuse the shared Sequelize instance instead of opening a separate pool
import { Sequelize } from 'sequelize';
import sequelize from './database.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import logger from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Get all migration files and run them in order
 */
async function runMigrations() {
  try {
    // Test connection with retry logic
    let retries = 3;
    let connected = false;

    while (retries > 0 && !connected) {
      try {
        await sequelize.authenticate();
        logger.info('Database connection established');
        connected = true;
      } catch (authError) {
        retries--;
        if (retries > 0) {
          logger.warn('Database connection failed, retrying', { attempt: 3 - retries, maxRetries: 3 });
          await new Promise(resolve => setTimeout(resolve, 2000));
        } else {
          throw authError;
        }
      }
    }

    if (!connected) {
      throw new Error('Failed to connect to database after 3 retries');
    }

    const migrationsDir = path.join(__dirname, '../migrations');

    if (!fs.existsSync(migrationsDir)) {
      fs.mkdirSync(migrationsDir, { recursive: true });
      logger.info('Created migrations directory');
      logger.warn('No migrations found. Run migration generation scripts first.');
      return;
    }

    const migrationFiles = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.js'))
      .sort();

    if (migrationFiles.length === 0) {
      logger.warn('No migration files found');
      return;
    }

    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS "SequelizeMeta" (
        name VARCHAR(255) NOT NULL PRIMARY KEY
      );
    `);

    const [executedMigrations] = await sequelize.query(
      'SELECT name FROM "SequelizeMeta" ORDER BY name'
    );
    const executedNames = executedMigrations.map(m => m.name);

    for (const file of migrationFiles) {
      if (executedNames.includes(file)) {
        logger.info('Skipping migration (already executed)', { file });
        continue;
      }

      logger.info('Running migration', { file });
      try {
        const migration = await import(`file://${path.join(migrationsDir, file)}`);

        const upFunction = migration.up || migration.default?.up;

        if (typeof upFunction === 'function') {
          await upFunction(sequelize.getQueryInterface(), Sequelize);
          await sequelize.query('INSERT INTO "SequelizeMeta" (name) VALUES (:file)', { replacements: { file } });
          logger.info('Completed migration', { file });
        } else {
          logger.warn('Migration does not export an up function', { file });
        }
      } catch (error) {
        if (error.message && (
          error.message.includes('already exists') ||
          error.message.includes('duplicate key') ||
          (error.message.includes('relation') && error.message.includes('already exists'))
        )) {
          logger.warn('Migration skipped (already exists)', { file, error: error.message });
          try {
            await sequelize.query('INSERT INTO "SequelizeMeta" (name) VALUES (:file) ON CONFLICT (name) DO NOTHING', { replacements: { file } });
          } catch {
            // ignore insert errors
          }
          continue;
        }
        logger.error('Migration failed', { file, error: error.message, stack: error.stack });
        throw error;
      }
    }

    logger.info('All migrations completed');
    return { success: true, message: 'All migrations completed' };
  } catch (error) {
    logger.error('Migration runner error', { error: error.message, stack: error.stack });

    const isDirectCall = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
    if (isDirectCall) {
      await sequelize.close();
      process.exit(1);
    }
    throw error;
  } finally {
    const isDirectCall = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
    if (isDirectCall) {
      await sequelize.close();
    }
  }
}

// Run migrations if called directly
try {
  if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
    runMigrations();
  }
} catch {
  // ignore auto-run detection errors
}

export { runMigrations };
