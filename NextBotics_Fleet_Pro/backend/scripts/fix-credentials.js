const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

// Database connection
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'nextbotics_fleet_pro',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
});

async function fixCredentials() {
  const client = await pool.connect();
  
  try {
    console.log('🔧 Fixing login credentials...');
    
    // 1. Clean up broken demo data
    await client.query("DELETE FROM users WHERE email LIKE '%@nextfleet.com'");
    await client.query("DELETE FROM staff WHERE email LIKE '%@nextfleet.com'");
    await client.query("DELETE FROM companies WHERE slug = 'nextfleet-logistics'");
    console.log('✅ Cleaned up old demo data');
    
    // 2. Create demo company
    const companyId = uuidv4();
    await client.query(
      `INSERT INTO companies (id, name, slug, subscription_plan, subscription_status)
       VALUES ($1, $2, $3, $4, $5)`,
      [companyId, 'NextFleet Logistics', 'nextfleet-logistics', 'basic', 'active']
    );
    console.log(`✅ Created company: ${companyId}`);
    
    // 3. Create users with properly hashed passwords
    const password = 'Manager123!';
    const passwordHash = await bcrypt.hash(password, 10);
    
    const users = [
      { email: 'manager@nextfleet.com', firstName: 'Morgan', lastName: 'Manager', role: 'manager' },
      { email: 'admin@nextfleet.com', firstName: 'Alex', lastName: 'Admin', role: 'admin' },
      { email: 'staff@nextfleet.com', firstName: 'Sam', lastName: 'Staff', role: 'staff' },
    ];
    
    for (const user of users) {
      const userId = uuidv4();
      await client.query(
        `INSERT INTO users (id, company_id, email, password_hash, first_name, last_name, role, is_active, must_change_password)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [userId, companyId, user.email, passwordHash, user.firstName, user.lastName, user.role, true, false]
      );
      console.log(`✅ Created user: ${user.email}`);
    }
    
    await client.query('COMMIT');
    
    console.log('');
    console.log('🎉 CREDENTIALS FIXED!');
    console.log('');
    console.log('🔑 Login with:');
    console.log('   Email:    manager@nextfleet.com');
    console.log('   Password: Manager123!');
    console.log('   Company:  nextfleet-logistics');
    console.log('');
    console.log('   Email:    admin@nextfleet.com');
    console.log('   Password: Manager123!');
    console.log('   Company:  nextfleet-logistics');
    console.log('');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

fixCredentials();
