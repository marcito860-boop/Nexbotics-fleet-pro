import { Pool } from 'pg';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

// Database connection
const poolConfig = process.env.DATABASE_URL
  ? {
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    }
  : {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'nextbotics_fleet_pro',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || '',
    };

const pool = new Pool(poolConfig);

async function createTestUser() {
  try {
    console.log('🔧 Creating test user...');
    
    // 1. Create or get demo company
    const companyResult = await pool.query(
      `INSERT INTO companies (id, name, slug, subscription_plan, subscription_status)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (slug) DO UPDATE SET name = $2
       RETURNING id`,
      [crypto.randomUUID(), 'Test Company', 'test-company', 'basic', 'active']
    );
    const companyId = companyResult.rows[0].id;
    console.log(`✅ Company ID: ${companyId}`);
    
    // 2. Delete existing test user if exists
    await pool.query(
      "DELETE FROM users WHERE email = 'test@fleet.com'"
    );
    
    // 3. Create test user with proper fields
    const passwordHash = await bcrypt.hash('Test123!', 10);
    const userResult = await pool.query(
      `INSERT INTO users (id, company_id, email, password_hash, first_name, last_name, role, is_active, must_change_password)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING id`,
      [
        crypto.randomUUID(),
        companyId,
        'test@fleet.com',
        passwordHash,
        'Test',
        'Manager',
        'manager',
        true,
        false
      ]
    );
    
    console.log('✅ Test user created successfully!');
    console.log('');
    console.log('🔑 TEST CREDENTIALS:');
    console.log('  Email:    test@fleet.com');
    console.log('  Password: Test123!');
    console.log('  Role:     manager');
    console.log('  Company:  test-company');
    console.log('');
    console.log('Try logging in with these credentials.');
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    await pool.end();
  }
}

// For Node.js < 18 without crypto.randomUUID
import crypto from 'crypto';

createTestUser();
