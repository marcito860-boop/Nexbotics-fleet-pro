import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import bcrypt from 'bcryptjs';
import { Admin } from '../models';
import { generateToken } from '../middleware/auth';

// Create initial admin user if none exists
export const createInitialAdmin = async (): Promise<void> => {
  try {
    const count = await Admin.count();
    if (count === 0) {
      const username = process.env.ADMIN_USERNAME || 'admin';
      const password = process.env.ADMIN_PASSWORD || 'admin123';
      const password_hash = await bcrypt.hash(password, 10);
      
      await Admin.create({
        username,
        password_hash
      });
      console.log('✅ Initial admin created:', username);
    }
  } catch (error) {
    console.error('❌ Failed to create initial admin:', error);
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const { username, password } = req.body;

    const admin = await Admin.findOne({ where: { username } });
    if (!admin) {
      res.status(401).json({ message: 'Invalid credentials' });
      return;
    }

    const isValidPassword = await bcrypt.compare(password, admin.password_hash);
    if (!isValidPassword) {
      res.status(401).json({ message: 'Invalid credentials' });
      return;
    }

    const token = generateToken(admin.id, admin.username);

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: admin.id,
        username: admin.username
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const verifyToken = async (req: Request, res: Response): Promise<void> => {
  res.json({ valid: true });
};