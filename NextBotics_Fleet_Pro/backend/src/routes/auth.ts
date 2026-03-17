import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { UserModel, toSafeUser } from '../models/User';
import { CompanyModel } from '../models/Company';
import { SuperAdminModel } from '../models/SuperAdmin';
import { verifyPassword, generateSecurePassword } from '../utils/password';
import { generateToken, authMiddleware } from '../utils/auth';
import { LoginInput, ChangePasswordInput, AuthResponse, ApiResponse } from '../types';

const router = Router();

// POST /api/auth/login - User login
router.post('/login', [
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('password').notEmpty().withMessage('Password required'),
  body('companySlug').optional().trim(),
], async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ 
      success: false, 
      error: 'Validation failed',
      details: errors.array() 
    });
  }

  const { email, password, companySlug } = req.body as LoginInput;

  try {
    // First, check if it's a super admin login
    const superAdmin = await SuperAdminModel.verifyCredentials(email, password);
    if (superAdmin) {
      await SuperAdminModel.updateLastLogin(superAdmin.id);
      
      const token = generateToken({
        userId: superAdmin.id,
        companyId: 'super_admin',
        email: superAdmin.email,
        firstName: superAdmin.firstName,
        lastName: superAdmin.lastName,
        role: 'admin',
        type: 'super_admin'
      });

      const response: ApiResponse<AuthResponse> = {
        success: true,
        data: {
          token,
          user: {
            id: superAdmin.id,
            email: superAdmin.email,
            firstName: superAdmin.firstName,
            lastName: superAdmin.lastName,
            role: 'admin',
            mustChangePassword: false
          }
        }
      };
      return res.json(response);
    }

    // Regular user login - need company context
    let company = null;
    
    if (companySlug) {
      company = await CompanyModel.findBySlug(companySlug);
    } else {
      // Try to auto-discover by email domain
      company = await CompanyModel.findByEmail(email);
    }

    if (!company) {
      return res.status(401).json({ 
        success: false, 
        error: 'Company not found. Please specify your company.' 
      });
    }

    // Find user in company and verify credentials
    const user = await UserModel.verifyCredentials(email, company.id, password);
    if (!user) {
      return res.status(401).json({ 
        success: false, 
        error: 'Invalid credentials' 
      });
    }

    // Update last login
    await UserModel.updateLastLogin(user.id);

    // Generate JWT
    const token = generateToken({
      userId: user.id,
      companyId: user.companyId,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      type: 'user'
    });

    const response: ApiResponse<AuthResponse> = {
      success: true,
      data: {
        token,
        user: toSafeUser(user),
        company: {
          id: company.id,
          name: company.name,
          slug: company.slug,
          logoUrl: company.logoUrl,
          subscriptionPlan: company.subscriptionPlan,
          subscriptionStatus: company.subscriptionStatus,
          maxUsers: company.maxUsers,
          settings: company.settings,
          createdAt: company.createdAt,
          updatedAt: company.updatedAt
        }
      }
    };

    res.json(response);
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Login failed. Please try again.' 
    });
  }
});

// POST /api/auth/change-password - Change password
router.post('/change-password', [
  authMiddleware,
  body('currentPassword').notEmpty().withMessage('Current password required'),
  body('newPassword').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
], async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ 
      success: false, 
      error: 'Validation failed',
      details: errors.array() 
    });
  }

  const { currentPassword, newPassword } = req.body as ChangePasswordInput;
  const userId = req.user!.userId;
  const isSuperAdmin = req.user!.type === 'super_admin';

  try {
    if (isSuperAdmin) {
      // Verify current password for super admin
      const superAdmin = await SuperAdminModel.findByEmail(req.user!.email);
      if (!superAdmin) {
        return res.status(404).json({ success: false, error: 'User not found' });
      }
      
      const valid = await SuperAdminModel.verifyCredentials(req.user!.email, currentPassword);
      if (!valid) {
        return res.status(401).json({ success: false, error: 'Current password is incorrect' });
      }
      
      await SuperAdminModel.changePassword(userId, newPassword);
    } else {
      // Regular user - verify credentials using model method
      const user = await UserModel.findById(userId);
      if (!user) {
        return res.status(404).json({ success: false, error: 'User not found' });
      }

      const valid = await UserModel.verifyCredentials(user.email, user.companyId, currentPassword);
      if (!valid) {
        return res.status(401).json({ success: false, error: 'Current password is incorrect' });
      }

      await UserModel.changePassword(userId, newPassword, user.companyId);
    }

    res.json({ 
      success: true, 
      message: 'Password changed successfully' 
    });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to change password' 
    });
  }
});

// GET /api/auth/me - Get current user
router.get('/me', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const isSuperAdmin = req.user!.type === 'super_admin';

    if (isSuperAdmin) {
      const superAdmin = await SuperAdminModel.findByEmail(req.user!.email);
      if (!superAdmin) {
        return res.status(404).json({ success: false, error: 'User not found' });
      }
      
      return res.json({
        success: true,
        data: {
          user: {
            id: superAdmin.id,
            email: superAdmin.email,
            firstName: superAdmin.firstName,
            lastName: superAdmin.lastName,
            role: 'admin',
            mustChangePassword: false
          },
          type: 'super_admin'
        }
      });
    }

    const user = await UserModel.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const company = await CompanyModel.findById(user.companyId);

    res.json({
      success: true,
      data: {
        user: toSafeUser(user),
        company: company ? {
          id: company.id,
          name: company.name,
          slug: company.slug
        } : null,
        type: 'user'
      }
    });
  } catch (error) {
    console.error('Get me error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to get user info' 
    });
  }
});

// POST /api/auth/refresh - Refresh token (optional implementation)
router.post('/refresh', authMiddleware, async (req: Request, res: Response) => {
  // Generate new token with extended expiry
  const token = generateToken({
    userId: req.user!.userId,
    companyId: req.user!.companyId,
    email: req.user!.email,
    firstName: req.user!.firstName,
    lastName: req.user!.lastName,
    role: req.user!.role,
    type: req.user!.type
  });

  res.json({
    success: true,
    data: { token }
  });
});

export default router;
