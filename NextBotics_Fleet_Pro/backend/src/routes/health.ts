import { Router, Request, Response } from 'express';
import { query } from '../database';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// GET /api/health/db - Check database status (no auth)
router.get('/db', async (req: Request, res: Response) => {
  const checks: any = {};
  
  try {
    // Check if we can connect
    await query('SELECT 1');
    checks.databaseConnection = 'OK';
    
    // Check if tables exist
    const tables = await query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    checks.tablesFound = tables.map((t: any) => t.table_name);
    
    // Check companies
    const companies = await query('SELECT COUNT(*) as count FROM companies');
    checks.companiesCount = parseInt(companies[0].count);
    
    // Check users
    const users = await query('SELECT COUNT(*) as count FROM users');
    checks.usersCount = parseInt(users[0].count);
    
    res.json({
      success: true,
      status: 'healthy',
      checks
    });
  } catch (error: any) {
    checks.error = error.message;
    res.status(500).json({
      success: false,
      status: 'unhealthy',
      checks
    });
  }
});

// POST /api/health/reset-db - Initialize database with emergency user (no auth)
router.post('/reset-db', async (req: Request, res: Response) => {
  try {
    // 1. Create companies table if not exists
    await query(`
      CREATE TABLE IF NOT EXISTS companies (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        slug VARCHAR(100) UNIQUE NOT NULL,
        subscription_plan VARCHAR(50) DEFAULT 'basic',
        subscription_status VARCHAR(50) DEFAULT 'active',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // 2. Create users table if not exists
    await query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
        email VARCHAR(255) NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        first_name VARCHAR(100) NOT NULL,
        last_name VARCHAR(100) NOT NULL,
        role VARCHAR(50) DEFAULT 'staff',
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(company_id, email)
      )
    `);
    
    // 3. Clean and create emergency company
    await query("DELETE FROM companies WHERE slug = 'emergency'");
    const companyId = uuidv4();
    await query(
      `INSERT INTO companies (id, name, slug, subscription_plan, subscription_status)
       VALUES ($1, $2, $3, $4, $5)`,
      [companyId, 'Emergency Test', 'emergency', 'basic', 'active']
    );
    
    // 4. Clean and create emergency user
    await query("DELETE FROM users WHERE email = 'emergency@fleet.com'");
    const passwordHash = await bcrypt.hash('test123', 10);
    await query(
      `INSERT INTO users (id, company_id, email, password_hash, first_name, last_name, role, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [uuidv4(), companyId, 'emergency@fleet.com', passwordHash, 'Emergency', 'Test', 'manager', true]
    );
    
    res.json({
      success: true,
      message: 'Database initialized with emergency user',
      credentials: {
        email: 'emergency@fleet.com',
        password: 'test123',
        companySlug: 'emergency'
      }
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// GET /api/health/tables - Show all tables
router.get('/tables', async (req: Request, res: Response) => {
  try {
    const tables = await query(`
      SELECT table_name, column_name, data_type
      FROM information_schema.columns
      WHERE table_schema = 'public'
      ORDER BY table_name, ordinal_position
    `);
    
    const grouped: any = {};
    tables.forEach((row: any) => {
      if (!grouped[row.table_name]) grouped[row.table_name] = [];
      grouped[row.table_name].push(`${row.column_name} (${row.data_type})`);
    });
    
    res.json({ success: true, tables: grouped });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
