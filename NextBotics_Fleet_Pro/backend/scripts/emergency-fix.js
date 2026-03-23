const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

// Get database URL from environment or use default
const databaseUrl = process.env.DATABASE_URL;

const pool = databaseUrl 
  ? new Pool({ connectionString: databaseUrl, ssl: { rejectUnauthorized: false } })
  : new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'nextbotics_fleet_pro',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || '',
    });

async function emergencyFix() {
  const client = await pool.connect();
  
  try {
    console.log('🚨 EMERGENCY LOGIN FIX\n');
    
    await client.query('BEGIN');
    
    // 1. Clean up
    await client.query("DELETE FROM users WHERE email = 'emergency@fleet.com'");
    await client.query("DELETE FROM companies WHERE slug = 'emergency'");
    console.log('✅ Cleaned up old emergency data');
    
    // 2. Create company
    const companyId = uuidv4();
    await client.query(
      `INSERT INTO companies (id, name, slug, subscription_plan, subscription_status)
       VALUES ($1, $2, $3, $4, $5)`,
      [companyId, 'Emergency Test', 'emergency', 'basic', 'active']
    );
    console.log('✅ Created emergency company');
    
    // 3. Create password and hash
    const password = 'test123';
    const passwordHash = await bcrypt.hash(password, 10);
    console.log('✅ Generated password hash');
    
    // 4. Create user
    const userId = uuidv4();
    await client.query(
      `INSERT INTO users (id, company_id, email, password_hash, first_name, last_name, role, is_active, must_change_password)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [userId, companyId, 'emergency@fleet.com', passwordHash, 'Emergency', 'Test', 'manager', true, false]
    );
    console.log('✅ Created emergency user');
    
    // 5. Verify the password works
    const verifyResult = await client.query('SELECT password_hash FROM users WHERE email = $1', ['emergency@fleet.com']);
    const storedHash = verifyResult.rows[0].password_hash;
    const isValid = await bcrypt.compare(password, storedHash);
    
    if (!isValid) {
      throw new Error('Password verification failed after creation!');
    }
    console.log('✅ Verified password works');
    
    await client.query('COMMIT');
    
    console.log('\n' + '='.repeat(50));
    console.log('🎉 EMERGENCY USER CREATED SUCCESSFULLY!');
    console.log('='.repeat(50));
    console.log('');
    console.log('🔑 LOGIN WITH THESE CREDENTIALS:');
    console.log('');
    console.log('   Email:    emergency@fleet.com');
    console.log('   Password: test123');
    console.log('   Company:  emergency');
    console.log('');
    console.log('   OR use company slug in login request:');
    console.log('   { "email": "emergency@fleet.com",');
    console.log('     "password": "test123",');
    console.log('     "companySlug": "emergency" }');
    console.log('');
    console.log('='.repeat(50));
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('\n❌ ERROR:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

// Run if called directly
if (require.main === module) {
  emergencyFix();
}

module.exports = { emergencyFix };
