import { Router, Request, Response } from 'express';
import { query } from '../database';
import bcrypt from 'bcryptjs';

const router = Router();

// GET /api/debug/users - List all users (for debugging)
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
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// POST /api/debug/verify-login - Debug login issues
router.post('/verify-login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password required'
      });
    }
    
    // Find user by email only (no company filter for debugging)
    const users = await query(
      'SELECT * FROM users WHERE email = $1',
      [email.toLowerCase()]
    );
    
    if (users.length === 0) {
      return res.json({
        success: false,
        found: false,
        error: 'User not found',
        emailSearched: email.toLowerCase()
      });
    }
    
    const user = users[0];
    
    // Verify password
    const valid = await bcrypt.compare(password, user.password_hash);
    
    res.json({
      success: valid,
      found: true,
      passwordValid: valid,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role,
        isActive: user.is_active,
        companyId: user.company_id
      }
    });
    
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// POST /api/debug/create-simple-user - Create a simple test user
router.post('/create-simple-user', async (req: Request, res: Response) => {
  try {
    // Create company if not exists
    let companyResult = await query(
      "SELECT id FROM companies WHERE slug = 'debug'"
    );
    
    let companyId;
    if (companyResult.length === 0) {
      const newCompany = await query(
        `INSERT INTO companies (id, name, slug) VALUES ($1, $2, $3) RETURNING id`,
        [require('uuid').v4(), 'Debug Company', 'debug']
      );
      companyId = newCompany[0].id;
    } else {
      companyId = companyResult[0].id;
    }
    
    // Delete old debug user
    await query("DELETE FROM users WHERE email = 'debug@fleet.com'");
    
    // Create debug user
    const passwordHash = await bcrypt.hash('debug123', 10);
    const newUser = await query(
      `INSERT INTO users (id, company_id, email, password_hash, first_name, last_name, role, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, email, first_name, last_name, role`,
      [
        require('uuid').v4(),
        companyId,
        'debug@fleet.com',
        passwordHash,
        'Debug',
        'User',
        'manager',
        true
      ]
    );
    
    res.json({
      success: true,
      message: 'Debug user created',
      credentials: {
        email: 'debug@fleet.com',
        password: 'debug123',
        companySlug: 'debug'
      },
      user: newUser[0]
    });
    
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
