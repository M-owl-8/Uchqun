import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

// Use DATABASE_URL if available (Railway), otherwise use individual env vars
let sequelize;

// Determine if we should use SSL
const isProduction = process.env.NODE_ENV === 'production';
const useSSL = isProduction && (process.env.DATABASE_URL || process.env.DATABASE_PUBLIC_URL);

if (process.env.DATABASE_URL || process.env.DATABASE_PUBLIC_URL) {
  const dbUrl = process.env.DATABASE_URL || process.env.DATABASE_PUBLIC_URL;
  
  // Check if it's a local database (localhost or 127.0.0.1)
  const isLocalDatabase = dbUrl.includes('localhost') || dbUrl.includes('127.0.0.1');
  
  sequelize = new Sequelize(dbUrl, {
    dialect: 'postgres',
    logging: false,
    pool: {
      max: 5,
      min: 0,
      acquire: 60000,
      idle: 10000,
    },
    dialectOptions: {
      // Only use SSL in production and not for local databases
      ssl: useSSL && !isLocalDatabase ? {
        require: true,
        rejectUnauthorized: false
      } : false
    }
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
      logging: false,
      pool: {
        max: 5,
        min: 0,
        acquire: 60000,
        idle: 10000,
      },
      dialectOptions: {
        // No SSL for local development
        ssl: false
      }
    }
  );
}

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
        console.log('✓ Database connection established');
        connected = true;
      } catch (authError) {
        retries--;
        if (retries > 0) {
          console.log(`⚠ Database connection failed, retrying... (${3 - retries}/3)`);
          await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
        } else {
          throw authError;
        }
      }
    }
    
    if (!connected) {
      throw new Error('Failed to connect to database after 3 retries');
    }

    const migrationsDir = path.join(__dirname, '../migrations');
    
    // Create migrations directory if it doesn't exist
    if (!fs.existsSync(migrationsDir)) {
      fs.mkdirSync(migrationsDir, { recursive: true });
      console.log('✓ Created migrations directory');
      console.log('⚠ No migrations found. Run migration generation scripts first.');
      return;
    }

    // Get all migration files sorted by name
    const migrationFiles = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.js'))
      .sort();

    if (migrationFiles.length === 0) {
      console.log('⚠ No migration files found');
      return;
    }

    // Create migrations table if it doesn't exist
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS "SequelizeMeta" (
        name VARCHAR(255) NOT NULL PRIMARY KEY
      );
    `);

    // Get executed migrations
    const [executedMigrations] = await sequelize.query(
      'SELECT name FROM "SequelizeMeta" ORDER BY name'
    );
    const executedNames = executedMigrations.map(m => m.name);

    // Run pending migrations
    for (const file of migrationFiles) {
      if (executedNames.includes(file)) {
        console.log(`⏭ Skipping ${file} (already executed)`);
        continue;
      }

      console.log(`🔄 Running ${file}...`);
      try {
        const migration = await import(`file://${path.join(migrationsDir, file)}`);
        
        // Support both export default and named exports
        const upFunction = migration.up || migration.default?.up;
        
        if (typeof upFunction === 'function') {
          await upFunction(sequelize.getQueryInterface(), Sequelize);
          await sequelize.query('INSERT INTO "SequelizeMeta" (name) VALUES (:file)', { replacements: { file } });
          console.log(`✓ Completed ${file}`);
        } else {
          console.warn(`⚠ ${file} does not export an 'up' function`);
        }
      } catch (error) {
        // If error is about existing index/constraint/table, log and continue
        if (error.message && (
          error.message.includes('already exists') ||
          error.message.includes('duplicate key') ||
          (error.message.includes('relation') && error.message.includes('already exists'))
        )) {
          console.warn(`⚠ ${file}: ${error.message} - skipping (already exists)`);
          // Mark as executed even if it failed (to avoid retrying)
          try {
            await sequelize.query('INSERT INTO "SequelizeMeta" (name) VALUES (:file) ON CONFLICT (name) DO NOTHING', { replacements: { file } });
          } catch (insertError) {
            // Ignore insert errors
          }
          continue;
        }
        console.error(`✗ Error running ${file}:`, error.message);
        console.error('Stack:', error.stack);
        throw error;
      }
    }

    console.log('✓ All migrations completed');
    return { success: true, message: 'All migrations completed' };
  } catch (error) {
    console.error('✗ Migration error:', error.message || error);
    if (error.stack) {
      console.error('Error stack:', error.stack);
    }
    
    // Provide helpful error messages
    if (error.message && error.message.includes('Connection terminated')) {
      console.error('\n💡 Tip: Make sure PostgreSQL server is running');
      console.error('   On Windows: Check if PostgreSQL service is running in Services');
      console.error('   Or try: net start postgresql-x64-XX (replace XX with version)');
    } else if (error.message && error.message.includes('ECONNREFUSED')) {
      console.error('\n💡 Tip: PostgreSQL server is not accepting connections');
      console.error('   Check if PostgreSQL is running on the correct host and port');
    } else if (error.message && error.message.includes('password authentication failed')) {
      console.error('\n💡 Tip: Database password is incorrect');
      console.error('   Check your .env file DB_PASSWORD setting');
    } else if (error.message && error.message.includes('database') && error.message.includes('does not exist')) {
      console.error('\n💡 Tip: Database does not exist');
      console.error('   Run: npm run create:db to create the database');
    }
    // Don't close connection if called from API route
    const isDirectCall = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
    if (isDirectCall) {
      await sequelize.close();
      process.exit(1);
    }
    throw error;
  } finally {
    // Only close if called directly (not from API)
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



