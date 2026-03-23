import { Router, Request, Response } from 'express';
import { query } from '../database';
import bcrypt from 'bcryptjs';
import { UserModel } from '../models/User';
import { CompanyModel } from '../models/Company';

const router = Router();

// GET /api/debug/users - List all users
router.get('/users', async (req: Request, res: Response) => {
  try {
    const users = await query(
      'SELECT id, email, first_name, last_name, role, is_active, company_id FROM users LIMIT 20'
    );
    
    res.json({
      success: true,
      count: users.length,
      users: users
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/debug/companies - List all companies
router.get('/companies', async (req: Request, res: Response) => {
  try {
    const companies = await query(
      'SELECT id, name, slug, email FROM companies LIMIT 20'
    );
    
    res.json({
      success: true,
      count: companies.length,
      companies: companies
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/debug/trace-login - Trace through login step by step
router.post('/trace-login', async (req: Request, res: Response) => {
  try {
    const { email, password, companySlug } = req.body;
    const trace: any = { steps: [] };
    
    trace.input = { email, companySlug, passwordProvided: !!password };
    
    // Step 1: Check if company exists
    let company = null;
    if (companySlug) {
      company = await CompanyModel.findBySlug(companySlug);
      trace.steps.push({ 
        step: 'findCompanyBySlug', 
        slug: companySlug, 
        found: !!company,
        companyId: company?.id 
      });
    }
    
    if (!company && email) {
      company = await CompanyModel.findByEmail(email);
      trace.steps.push({ 
        step: 'findCompanyByEmail', 
        email, 
        found: !!company,
        companyId: company?.id 
      });
    }
    
    if (!company) {
      // List available companies for debugging
      const allCompanies = await query('SELECT slug, name FROM companies LIMIT 10');
      trace.steps.push({ 
        step: 'noCompanyFound', 
        availableCompanies: allCompanies.map((c: any) => ({ slug: c.slug, name: c.name }))
      });
      return res.json({ success: false, trace, error: 'Company not found' });
    }
    
    // Step 2: Find user by email in company
    const userRows = await query(
      'SELECT * FROM users WHERE email = $1 AND company_id = $2',
      [email.toLowerCase(), company.id]
    );
    
    trace.steps.push({ 
      step: 'findUser', 
      email: email.toLowerCase(), 
      companyId: company.id,
      found: userRows.length > 0 
    });
    
    if (userRows.length === 0) {
      // Check if user exists in ANY company
      const anyUser = await query('SELECT email, company_id FROM users WHERE email = $1', [email.toLowerCase()]);
      trace.steps.push({ 
        step: 'checkAnyCompany', 
        foundInOtherCompanies: anyUser.length,
        otherCompanies: anyUser.map((u: any) => ({ companyId: u.company_id }))
      });
      return res.json({ success: false, trace, error: 'User not found in this company' });
    }
    
    const user = userRows[0];
    trace.user = {
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      role: user.role,
      isActive: user.is_active,
      hasPasswordHash: !!user.password_hash,
      passwordHashLength: user.password_hash?.length
    };
    
    // Step 3: Verify password
    const passwordValid = await bcrypt.compare(password, user.password_hash);
    trace.steps.push({ 
      step: 'verifyPassword', 
      valid: passwordValid,
      passwordProvided: password,
      hashPrefix: user.password_hash?.substring(0, 20) + '...'
    });
    
    if (!passwordValid) {
      // Try to debug password issue
      const testHash = await bcrypt.hash(password, 10);
      trace.steps.push({
        step: 'generateTestHash',
        testHash: testHash.substring(0, 30) + '...',
        originalHashPrefix: user.password_hash?.substring(0, 30) + '...'
      });
      
      // Check if it's a plaintext password issue
      trace.steps.push({
        step: 'plaintextCheck',
        storedEqualsProvided: user.password_hash === password
      });
      
      return res.json({ success: false, trace, error: 'Invalid password' });
    }
    
    // Step 4: Check if user is active
    trace.steps.push({ 
      step: 'checkActive', 
      isActive: user.is_active 
    });
    
    if (!user.is_active) {
      return res.json({ success: false, trace, error: 'User is not active' });
    }
    
    trace.steps.push({ step: 'success' });
    
    res.json({
      success: true,
      trace,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role
      }
    });
    
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message, stack: error.stack });
  }
});

// POST /api/debug/create-working-user - Create a guaranteed working user
router.post('/create-working-user', async (req: Request, res: Response) => {
  try {
    const { v4: uuidv4 } = require('uuid');
    
    // 1. Create company
    const companyId = uuidv4();
    await query(
      `INSERT INTO companies (id, name, slug, subscription_plan, subscription_status)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (slug) DO UPDATE SET name = $2
       RETURNING id`,
      [companyId, 'Debug Company', 'debug', 'basic', 'active']
    );
    
    // Get the company ID (in case of conflict)
    const companyResult = await query('SELECT id FROM companies WHERE slug = $1', ['debug']);
    const actualCompanyId = companyResult[0].id;
    
    // 2. Delete old debug user
    await query("DELETE FROM users WHERE email = 'test@debug.com'");
    
    // 3. Create user with known password hash
    // Using bcrypt hash for 'test123'
    const passwordHash = '$2a$10$N9qo8uLOickgx2ZMRZoMy.MqrqQzBZN0UfGNEsKYGsFqPpP9QNXTG';  // hash for 'test123'
    const userId = uuidv4();
    
    await query(
      `INSERT INTO users (id, company_id, email, password_hash, first_name, last_name, role, is_active, must_change_password)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [userId, actualCompanyId, 'test@debug.com', passwordHash, 'Test', 'User', 'manager', true, false]
    );
    
    // 4. Verify the user was created
    const verifyUser = await query('SELECT * FROM users WHERE email = $1', ['test@debug.com']);
    
    // 5. Test password
    const passwordValid = await bcrypt.compare('test123', verifyUser[0].password_hash);
    
    res.json({
      success: true,
      credentials: {
        email: 'test@debug.com',
        password: 'test123',
        companySlug: 'debug'
      },
      user: {
        id: verifyUser[0].id,
        email: verifyUser[0].email,
        firstName: verifyUser[0].first_name,
        lastName: verifyUser[0].last_name,
        role: verifyUser[0].role,
        companyId: verifyUser[0].company_id
      },
      passwordTest: passwordValid,
      message: 'Use these credentials to test login'
    });
    
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/debug/test-bcrypt - Test bcrypt directly
router.post('/test-bcrypt', async (req: Request, res: Response) => {
  try {
    const { password } = req.body;
    
    // Generate hash
    const hash = await bcrypt.hash(password, 10);
    
    // Verify immediately
    const valid = await bcrypt.compare(password, hash);
    
    res.json({
      success: true,
      password,
      hash,
      hashValid: valid
    });
    
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
