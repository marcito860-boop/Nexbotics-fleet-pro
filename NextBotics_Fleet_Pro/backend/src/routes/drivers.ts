import { Router, Request, Response } from 'express';
import { body, param, query as queryValidator, validationResult } from 'express-validator';
import { DriverModel } from '../models/Driver';
import { authMiddleware, requireRole } from '../utils/auth';

const router = Router();

router.use(authMiddleware);

// GET /api/fleet/drivers - List all drivers
router.get('/', [
  queryValidator('page').optional().isInt({ min: 1 }),
  queryValidator('perPage').optional().isInt({ min: 1, max: 100 }),
  queryValidator('status').optional().isIn(['active', 'inactive', 'suspended', 'terminated']),
  queryValidator('search').optional().trim(),
], async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, error: 'Validation failed', details: errors.array() });
  }

  try {
    const companyId = req.user!.companyId;
    const page = parseInt(req.query.page as string) || 1;
    const perPage = parseInt(req.query.perPage as string) || 20;
    const status = req.query.status as any;
    const search = req.query.search as string;

    const { drivers, total } = await DriverModel.findByCompany(companyId, {
      status,
      search,
      limit: perPage,
      offset: (page - 1) * perPage,
    });

    res.json({
      success: true,
      data: {
        items: drivers,
        total,
        page,
        perPage,
        totalPages: Math.ceil(total / perPage),
      }
    });
  } catch (error) {
    console.error('List drivers error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch drivers' });
  }
});

// GET /api/fleet/drivers/stats/overview - Frontend compatible endpoint
router.get('/stats/overview', async (req: Request, res: Response) => {
  try {
    const companyId = req.user!.companyId;
    const stats = await DriverModel.getStats(companyId);
    res.json({
      success: true,
      data: {
        total: stats.total || 0,
        active: stats.active || 0,
        available: stats.active || 0, // Map active to available for frontend
        onLeave: stats.inactive || 0, // Map inactive to onLeave for frontend
        suspended: stats.suspended || 0,
      }
    });
  } catch (error) {
    console.error('Driver stats error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch driver stats' });
  }
});

// GET /api/fleet/drivers/stats - Get driver statistics
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const companyId = req.user!.companyId;
    const stats = await DriverModel.getStats(companyId);

    res.json({ success: true, data: stats });
  } catch (error) {
    console.error('Driver stats error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch driver stats' });
  }
});

// GET /api/fleet/drivers/:id - Get driver by ID
router.get('/:id', [
  param('id').isUUID().withMessage('Valid driver ID required'),
], async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, error: 'Validation failed', details: errors.array() });
  }

  try {
    const companyId = req.user!.companyId;
    const driver = await DriverModel.findById(req.params.id, companyId);

    if (!driver) {
      return res.status(404).json({ success: false, error: 'Driver not found' });
    }

    res.json({ success: true, data: driver });
  } catch (error) {
    console.error('Get driver error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch driver' });
  }
});

// POST /api/fleet/drivers - Create new driver (admin/manager only)
router.post('/', [
  requireRole('admin', 'manager'),
  body('firstName').trim().notEmpty().withMessage('First name required'),
  body('lastName').trim().notEmpty().withMessage('Last name required'),
  body('email').optional().isEmail().normalizeEmail(),
  body('licenseExpiry').optional().isISO8601(),
  body('dateOfBirth').optional().isISO8601(),
  body('hireDate').optional().isISO8601(),
], async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, error: 'Validation failed', details: errors.array() });
  }

  try {
    const companyId = req.user!.companyId;

    const driver = await DriverModel.create(companyId, {
      firstName: req.body.firstName,
      lastName: req.body.lastName,
      email: req.body.email,
      phone: req.body.phone,
      licenseNumber: req.body.licenseNumber,
      licenseExpiry: req.body.licenseExpiry ? new Date(req.body.licenseExpiry) : undefined,
      licenseClass: req.body.licenseClass,
      dateOfBirth: req.body.dateOfBirth ? new Date(req.body.dateOfBirth) : undefined,
      emergencyContactName: req.body.emergencyContactName,
      emergencyContactPhone: req.body.emergencyContactPhone,
      address: req.body.address,
      hireDate: req.body.hireDate ? new Date(req.body.hireDate) : undefined,
      notes: req.body.notes,
    }, req.body.userId);

    res.status(201).json({ success: true, data: driver, message: 'Driver created successfully' });
  } catch (error) {
    console.error('Create driver error:', error);
    res.status(500).json({ success: false, error: 'Failed to create driver' });
  }
});

// PUT /api/fleet/drivers/:id - Update driver
router.put('/:id', [
  param('id').isUUID().withMessage('Valid driver ID required'),
  body('email').optional().isEmail().normalizeEmail(),
  body('status').optional().isIn(['active', 'inactive', 'suspended', 'terminated']),
], async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, error: 'Validation failed', details: errors.array() });
  }

  try {
    const companyId = req.user!.companyId;
    const driver = await DriverModel.update(req.params.id, companyId, {
      firstName: req.body.firstName,
      lastName: req.body.lastName,
      email: req.body.email,
      phone: req.body.phone,
      licenseNumber: req.body.licenseNumber,
      licenseExpiry: req.body.licenseExpiry ? new Date(req.body.licenseExpiry) : undefined,
      licenseClass: req.body.licenseClass,
      emergencyContactName: req.body.emergencyContactName,
      emergencyContactPhone: req.body.emergencyContactPhone,
      address: req.body.address,
      status: req.body.status,
      notes: req.body.notes,
    });

    if (!driver) {
      return res.status(404).json({ success: false, error: 'Driver not found' });
    }

    res.json({ success: true, data: driver });
  } catch (error) {
    console.error('Update driver error:', error);
    res.status(500).json({ success: false, error: 'Failed to update driver' });
  }
});

// DELETE /api/fleet/drivers/:id - Delete driver (admin only)
router.delete('/:id', [
  requireRole('admin'),
  param('id').isUUID().withMessage('Valid driver ID required'),
], async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, error: 'Validation failed', details: errors.array() });
  }

  try {
    const companyId = req.user!.companyId;
    const deleted = await DriverModel.delete(req.params.id, companyId);

    if (!deleted) {
      return res.status(404).json({ success: false, error: 'Driver not found' });
    }

    res.json({ success: true, message: 'Driver deleted successfully' });
  } catch (error) {
    console.error('Delete driver error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete driver' });
  }
});

export default router;
