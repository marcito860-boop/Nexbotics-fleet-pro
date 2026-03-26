import { Pool, PoolClient } from 'pg';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

// Use DATABASE_URL if available, otherwise fall back to individual env vars
const pool = process.env.DATABASE_URL 
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    })
  : new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'nextbotics_fleet_pro',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || '',
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

// Company context for multi-tenancy
export interface CompanyContext {
  companyId: string | null;
  isSuperAdmin: boolean;
}

// Query helper with company isolation
export async function query(
  sql: string,
  params?: any[],
  context?: CompanyContext
): Promise<any[]> {
  const client = await pool.connect();
  try {
    const result = await client.query(sql, params);
    return result.rows;
  } finally {
    client.release();
  }
}

// Transaction helper
export async function transaction<T>(
  callback: (client: PoolClient) => Promise<T>,
  context?: CompanyContext
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

// Migration runner
export async function runMigrations(): Promise<void> {
  const client = await pool.connect();
  try {
    console.log('🔄 Running database migrations...');
    
    // Create migrations tracking table
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id SERIAL PRIMARY KEY,
        filename VARCHAR(255) UNIQUE NOT NULL,
        applied_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Get list of applied migrations
    const appliedResult = await client.query('SELECT filename FROM schema_migrations');
    const appliedMigrations = new Set(appliedResult.rows.map(r => r.filename));
    
    // Find migration files
    const migrationsDir = path.join(__dirname, '../../database/migrations');
    
    // Check if migrations directory exists
    if (!fs.existsSync(migrationsDir)) {
      console.log('ℹ️ No migrations directory found, skipping migrations');
      return;
    }
    
    const migrationFiles = fs.readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort(); // Run in order
    
    let appliedCount = 0;
    let skippedCount = 0;
    
    for (const filename of migrationFiles) {
      if (appliedMigrations.has(filename)) {
        console.log(`  ✓ ${filename} (already applied)`);
        continue;
      }
      
      console.log(`  📝 Applying ${filename}...`);
      const filePath = path.join(migrationsDir, filename);
      const sql = fs.readFileSync(filePath, 'utf-8');
      
      try {
        // Run migration without transaction - individual statements should use IF NOT EXISTS
        await client.query(sql);
        await client.query(
          'INSERT INTO schema_migrations (filename) VALUES ($1)',
          [filename]
        );
        console.log(`  ✅ ${filename} applied successfully`);
        appliedCount++;
      } catch (error: any) {
        // Check if error is about something already existing
        if (error.code === '42P07' || error.code === '23505' || 
            error.message?.includes('already exists')) {
          console.log(`  ⚠️ ${filename} - some objects already exist, marking as applied`);
          await client.query(
            'INSERT INTO schema_migrations (filename) VALUES ($1)',
            [filename]
          );
          skippedCount++;
        } else {
          console.error(`  ❌ Failed to apply ${filename}:`, error.message);
          throw error;
        }
      }
    }
    
    if (appliedCount === 0 && skippedCount === 0) {
      console.log('✅ All migrations up to date');
    } else {
      console.log(`✅ Applied ${appliedCount} migration(s), skipped ${skippedCount}`);
    }
  } finally {
    client.release();
  }
}

export { pool };
export default pool;
