import { Pool, PoolClient } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
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
    // Set company context for RLS-like behavior
    if (context?.companyId) {
      await client.query('SET app.current_company_id = $1', [context.companyId]);
    } else {
      await client.query('SET app.current_company_id = NULL');
    }
    
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
    
    if (context?.companyId) {
      await client.query('SET app.current_company_id = $1', [context.companyId]);
    }
    
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

export { pool };
export default pool;
