import { Router, Request, Response } from 'express';
import { body, param, validationResult } from 'express-validator';
import { CompanyModel } from '../models/Company';
import { UserModel, toSafeUser } from '../models/User';
import { authMiddleware, requireRole } from '../utils/auth';
import { CreateCompanyInput, ApiResponse } from '../types';

const router = Router();

router.use(authMiddleware);

// GET /api/companies - List companies (super admin only, or current company for regular users)
router.get('/', async (req: Request, res: Response) => {
  try {
    const isSuperAdmin = req.user!.type === 'super_admin';

    if (isSuperAdmin) {
      const page = parseInt(req.query.page as string) || 1;
      const perPage = parseInt(req.query.perPage as string) || 20;
      const offset = (page - 1) * perPage;

      const { companies, total } = await CompanyModel.findAll({
        limit: perPage,
        offset
      });

      // Get stats for each company
      const companiesWithStats = await Promise.all(
        companies.map(async (company) => ({
          ...company,
          stats: await CompanyModel.getStats(company.id)
        }))
      );

      return res.json({
        success: true,
        data: {
          items: companiesWithStats,
          total,
          page,
          perPage,
          totalPages: Math.ceil(total / perPage)
        }
      });
    }

    // Regular users - return only their company
    const company = await CompanyModel.findById(req.user!.companyId);
    if (!company) {
      return res.status(404).json({ success: false, error: 'Company not found' });
    }

    const stats = await CompanyModel.getStats(company.id);

    res.json({
      success: true,
      data: {
        items: [{ ...company, stats }],
        total: 1,
        page: 1,
        perPage: 1,
        totalPages: 1
      }
    });
  } catch (error) {
    console.error('List companies error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch companies' 
    });
  }
});

// GET /api/companies/:id - Get company by ID
router.get('/:id', [
  param('id').isUUID().withMessage('Valid company ID required')
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
    const isSuperAdmin = req.user!.type === 'super_admin';

    // Regular users can only view their own company
    if (!isSuperAdmin && id !== req.user!.companyId) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    const company = await CompanyModel.findById(id);
    if (!company) {
      return res.status(404).json({ success: false, error: 'Company not found' });
    }

    const stats = await CompanyModel.getStats(id);

    res.json({
      success: true,
      data: { ...company, stats }
    });
  } catch (error) {
    console.error('Get company error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch company' 
    });
  }
});

// POST /api/companies - Create company (super admin only)
router.post('/', [
  requireRole('admin'), // Only super admins have admin role without company
  body('name').trim().notEmpty().withMessage('Company name required'),
  body('slug').optional().trim().matches(/^[a-z0-9-]+$/).withMessage('Slug must be lowercase alphanumeric with hyphens'),
  body('address').optional().trim(),
  body('phone').optional().trim(),
  body('email').optional().isEmail().normalizeEmail(),
], async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ 
      success: false, 
      error: 'Validation failed',
      details: errors.array() 
    });
  }

  // Verify this is actually a super admin
  if (req.user!.type !== 'super_admin') {
    return res.status(403).json({ 
      success: false, 
      error: 'Only super admins can create companies' 
    });
  }

  try {
    const input: CreateCompanyInput = {
      name: req.body.name,
      slug: req.body.slug,
      address: req.body.address,
      phone: req.body.phone,
      email: req.body.email
    };

    const company = await CompanyModel.create(input);

    res.status(201).json({
      success: true,
      data: company,
      message: 'Company created successfully'
    });
  } catch (error: any) {
    console.error('Create company error:', error);
    
    if (error.message?.includes('already exists')) {
      return res.status(409).json({ 
        success: false, 
        error: error.message 
      });
    }
    
    res.status(500).json({ 
      success: false, 
      error: 'Failed to create company' 
    });
  }
});

// PUT /api/companies/:id - Update company
router.put('/:id', [
  param('id').isUUID().withMessage('Valid company ID required'),
  body('name').optional().trim().notEmpty(),
  body('address').optional().trim(),
  body('phone').optional().trim(),
  body('email').optional().isEmail().normalizeEmail(),
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
    const isSuperAdmin = req.user!.type === 'super_admin';

    // Regular admins can only update their own company
    if (!isSuperAdmin && id !== req.user!.companyId) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    const company = await CompanyModel.findById(id);
    if (!company) {
      return res.status(404).json({ success: false, error: 'Company not found' });
    }

    const updates: Partial<CreateCompanyInput> = {};
    
    // Only super admin can change name (which affects slug)
    if (isSuperAdmin && req.body.name) {
      updates.name = req.body.name;
    }
    
    if (req.body.address !== undefined) updates.address = req.body.address;
    if (req.body.phone !== undefined) updates.phone = req.body.phone;
    if (req.body.email !== undefined) updates.email = req.body.email;

    const updated = await CompanyModel.update(id, updates);
    
    res.json({
      success: true,
      data: updated
    });
  } catch (error) {
    console.error('Update company error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to update company' 
    });
  }
});

// PUT /api/companies/:id/subscription - Update subscription (super admin only)
router.put('/:id/subscription', [
  requireRole('admin'),
  param('id').isUUID().withMessage('Valid company ID required'),
  body('plan').isIn(['basic', 'pro', 'enterprise']).withMessage('Valid plan required'),
  body('status').isIn(['active', 'suspended', 'cancelled']).withMessage('Valid status required'),
], async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ 
      success: false, 
      error: 'Validation failed',
      details: errors.array() 
    });
  }

  if (req.user!.type !== 'super_admin') {
    return res.status(403).json({ 
      success: false, 
      error: 'Only super admins can update subscriptions' 
    });
  }

  try {
    const { id } = req.params;
    const { plan, status } = req.body;

    const company = await CompanyModel.updateSubscription(id, plan, status);
    
    if (!company) {
      return res.status(404).json({ success: false, error: 'Company not found' });
    }

    res.json({
      success: true,
      data: company
    });
  } catch (error) {
    console.error('Update subscription error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to update subscription' 
    });
  }
});

// DELETE /api/companies/:id - Delete company (super admin only)
router.delete('/:id', [
  requireRole('admin'),
  param('id').isUUID().withMessage('Valid company ID required')
], async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ 
      success: false, 
      error: 'Validation failed',
      details: errors.array() 
    });
  }

  if (req.user!.type !== 'super_admin') {
    return res.status(403).json({ 
      success: false, 
      error: 'Only super admins can delete companies' 
    });
  }

  try {
    const { id } = req.params;

    const deleted = await CompanyModel.delete(id);
    
    if (deleted) {
      res.json({ 
        success: true, 
        message: 'Company and all associated data deleted' 
      });
    } else {
      res.status(404).json({ success: false, error: 'Company not found' });
    }
  } catch (error) {
    console.error('Delete company error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to delete company' 
    });
  }
});

export default router;
