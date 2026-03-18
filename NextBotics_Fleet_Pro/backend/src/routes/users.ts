import { Router, Request, Response } from 'express';
import { body, param, validationResult } from 'express-validator';
import { UserModel, toSafeUser } from '../models/User';
import { CompanyModel } from '../models/Company';
import { authMiddleware, requireRole } from '../utils/auth';
import { CreateUserInput, UpdateUserInput, UserRole, ApiResponse, SafeUser } from '../types';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// GET /api/users - List all users for company (admin/manager only)
router.get('/', requireRole('admin', 'manager'), async (req: Request, res: Response) => {
  try {
    const companyId = req.user!.companyId;
    const page = parseInt(req.query.page as string) || 1;
    const perPage = parseInt(req.query.perPage as string) || 20;
    const role = req.query.role as UserRole | undefined;
    const isActive = req.query.isActive === 'true' ? true : 
                     req.query.isActive === 'false' ? false : undefined;

    const offset = (page - 1) * perPage;

    const { users, total } = await UserModel.findByCompany(companyId, {
      role,
      isActive,
      limit: perPage,
      offset
    });

    const response: ApiResponse = {
      success: true,
      data: {
        items: users.map(toSafeUser),
        total,
        page,
        perPage,
        totalPages: Math.ceil(total / perPage)
      }
    };

    res.json(response);
  } catch (error) {
    console.error('List users error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch users' 
    });
  }
});

// GET /api/users/:id - Get user by ID
router.get('/:id', [
  param('id').isUUID().withMessage('Valid user ID required')
], async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ 
      success: false, 
      error: 'Validation failed',
      details: errors.array() 
    });
  }

  try {
    const { id } = req.params;
    const companyId = req.user!.companyId;
    const requesterRole = req.user!.role;

    // Users can only view their own profile unless admin/manager
    const user = await UserModel.findByIdAndCompany(id, companyId);
    
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    if (requesterRole === 'staff' && user.id !== req.user!.userId) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    res.json({
      success: true,
      data: toSafeUser(user)
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch user' 
    });
  }
});

// POST /api/users - Create new user (admin/manager only)
router.post('/', [
  requireRole('admin', 'manager'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('firstName').trim().notEmpty().withMessage('First name required'),
  body('lastName').trim().notEmpty().withMessage('Last name required'),
  body('role').isIn(['admin', 'manager', 'staff']).withMessage('Valid role required'),
  body('phone').optional().trim(),
], async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ 
      success: false, 
      error: 'Validation failed',
      details: errors.array() 
    });
  }

  try {
    let companyId = req.user!.companyId;
    const requesterRole = req.user!.role;
    const userType = req.user!.type;

    // Super admins can specify a companyId to create users in any company
    if (userType === 'super_admin' && req.body.companyId) {
      companyId = req.body.companyId;
    }
    
    // Super admins can also specify companySlug to find the company
    if (userType === 'super_admin' && req.body.companySlug) {
      const company = await CompanyModel.findBySlug(req.body.companySlug);
      if (!company) {
        return res.status(404).json({ success: false, error: 'Company not found' });
      }
      companyId = company.id;
    }

    // Managers can only create staff, not other managers or admins
    if (requesterRole === 'manager' && req.body.role !== 'staff') {
      return res.status(403).json({ 
        success: false, 
        error: 'Managers can only create staff users' 
      });
    }

    // Check user limit
    const company = await CompanyModel.findById(companyId);
    const currentUserCount = await UserModel.countByCompany(companyId);
    
    if (currentUserCount >= (company?.maxUsers || 10)) {
      return res.status(403).json({ 
        success: false, 
        error: 'User limit reached for this company' 
      });
    }

    const input: CreateUserInput = {
      email: req.body.email,
      firstName: req.body.firstName,
      lastName: req.body.lastName,
      phone: req.body.phone,
      role: req.body.role,
      companyId
    };

    const { user, tempPassword } = await UserModel.create(input);

    res.status(201).json({
      success: true,
      data: {
        user: toSafeUser(user),
        tempPassword // Only shown once at creation
      },
      message: 'User created successfully. Please share the temporary password securely.'
    });
  } catch (error: any) {
    console.error('Create user error:', error);
    
    if (error.message?.includes('already exists')) {
      return res.status(409).json({ 
        success: false, 
        error: 'User with this email already exists' 
      });
    }
    
    res.status(500).json({ 
      success: false, 
      error: 'Failed to create user' 
    });
  }
});

// PUT /api/users/:id - Update user (admin/manager only, or self for limited fields)
router.put('/:id', [
  param('id').isUUID().withMessage('Valid user ID required'),
  body('firstName').optional().trim().notEmpty(),
  body('lastName').optional().trim().notEmpty(),
  body('phone').optional().trim(),
  body('role').optional().isIn(['admin', 'manager', 'staff']),
  body('isActive').optional().isBoolean(),
], async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ 
      success: false, 
      error: 'Validation failed',
      details: errors.array() 
    });
  }

  try {
    const { id } = req.params;
    const companyId = req.user!.companyId;
    const requesterId = req.user!.userId;
    const requesterRole = req.user!.role;

    const user = await UserModel.findByIdAndCompany(id, companyId);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    // Staff can only update their own basic info
    if (requesterRole === 'staff') {
      if (id !== requesterId) {
        return res.status(403).json({ success: false, error: 'Access denied' });
      }
      
      // Staff can only update name and phone
      const input: UpdateUserInput = {
        firstName: req.body.firstName,
        lastName: req.body.lastName,
        phone: req.body.phone
      };

      const updated = await UserModel.update(id, companyId, input);
      return res.json({
        success: true,
        data: toSafeUser(updated!)
      });
    }

    // Managers have restrictions
    if (requesterRole === 'manager') {
      // Can't modify admins
      if (user.role === 'admin') {
        return res.status(403).json({ 
          success: false, 
          error: 'Cannot modify admin users' 
        });
      }
      
      // Can't promote to admin/manager
      if (req.body.role && req.body.role !== 'staff') {
        return res.status(403).json({ 
          success: false, 
          error: 'Can only assign staff role' 
        });
      }
    }

    const input: UpdateUserInput = {
      firstName: req.body.firstName,
      lastName: req.body.lastName,
      phone: req.body.phone,
      role: req.body.role,
      isActive: req.body.isActive
    };

    const updated = await UserModel.update(id, companyId, input);
    
    res.json({
      success: true,
      data: toSafeUser(updated!)
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to update user' 
    });
  }
});

// DELETE /api/users/:id - Deactivate/Delete user (admin only)
router.delete('/:id', [
  requireRole('admin'),
  param('id').isUUID().withMessage('Valid user ID required')
], async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ 
      success: false, 
      error: 'Validation failed',
      details: errors.array() 
    });
  }

  try {
    const { id } = req.params;
    const companyId = req.user!.companyId;
    const requesterId = req.user!.userId;

    if (id === requesterId) {
      return res.status(400).json({ 
        success: false, 
        error: 'Cannot delete yourself' 
      });
    }

    const user = await UserModel.findByIdAndCompany(id, companyId);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    // Soft delete by default
    const hardDelete = req.query.hard === 'true';
    const deleted = await UserModel.delete(id, companyId, hardDelete);

    if (deleted) {
      res.json({ 
        success: true, 
        message: hardDelete ? 'User permanently deleted' : 'User deactivated' 
      });
    } else {
      res.status(500).json({ 
        success: false, 
        error: 'Failed to delete user' 
      });
    }
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to delete user' 
    });
  }
});

// POST /api/users/:id/reset-password - Reset user password (admin/manager only)
router.post('/:id/reset-password', [
  requireRole('admin', 'manager'),
  param('id').isUUID().withMessage('Valid user ID required')
], async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ 
      success: false, 
      error: 'Validation failed',
      details: errors.array() 
    });
  }

  try {
    const { id } = req.params;
    const companyId = req.user!.companyId;
    const requesterRole = req.user!.role;

    const user = await UserModel.findByIdAndCompany(id, companyId);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    // Managers can't reset admin passwords
    if (requesterRole === 'manager' && user.role === 'admin') {
      return res.status(403).json({ 
        success: false, 
        error: 'Cannot reset admin password' 
      });
    }

    // Generate new temporary password
    const { generateSecurePassword } = await import('../utils/password');
    const newPassword = generateSecurePassword();
    const { hashPassword } = await import('../utils/password');
    const passwordHash = await hashPassword(newPassword);

    await UserModel.changePassword(id, newPassword, companyId);

    res.json({
      success: true,
      data: { tempPassword: newPassword },
      message: 'Password reset successfully. Please share the temporary password securely.'
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to reset password' 
    });
  }
});

export default router;
