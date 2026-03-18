const { query } = require('../dist/database');
const { hashPassword, generateSecurePassword } = require('../dist/utils/password');

async function seedUsers() {
  try {
    // Get company ID
    const companyResult = await query("SELECT id FROM companies WHERE slug = 'fleet-demo'");
    if (companyResult.length === 0) {
      console.log('Company fleet-demo not found');
      return;
    }
    const companyId = companyResult[0].id;
    console.log('Found company:', companyId);

    const users = [
      { email: 'admin@fleet-demo.com', firstName: 'Admin', lastName: 'User', role: 'admin' },
      { email: 'manager@fleet-demo.com', firstName: 'Manager', lastName: 'User', role: 'manager' },
      { email: 'staff@fleet-demo.com', firstName: 'Staff', lastName: 'User', role: 'staff' }
    ];

    for (const u of users) {
      // Check if exists
      const existing = await query(
        'SELECT id FROM users WHERE email = $1 AND company_id = $2',
        [u.email, companyId]
      );
      
      if (existing.length > 0) {
        console.log(`User ${u.email} already exists`);
        continue;
      }

      const tempPassword = generateSecurePassword();
      const passwordHash = await hashPassword(tempPassword);
      
      await query(
        `INSERT INTO users (company_id, email, password_hash, first_name, last_name, role, is_active, must_change_password)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [companyId, u.email.toLowerCase(), passwordHash, u.firstName, u.lastName, u.role, true, true]
      );
      
      console.log(`Created ${u.role} user: ${u.email} / ${tempPassword}`);
    }
    
    console.log('Done!');
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

seedUsers();
