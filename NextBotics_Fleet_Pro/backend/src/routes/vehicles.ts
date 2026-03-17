import { Router, Request, Response } from 'express';
import { body, param, query as queryValidator, validationResult } from 'express-validator';
import { VehicleModel } from '../models/Vehicle';
import { authMiddleware, requireRole } from '../utils/auth';
import { ApiResponse } from '../types';

const router = Router();

router.use(authMiddleware);

// GET /api/fleet/vehicles - List all vehicles
router.get('/', [
  queryValidator('page').optional().isInt({ min: 1 }),
  queryValidator('perPage').optional().isInt({ min: 1, max: 100 }),
  queryValidator('status').optional().isIn(['available', 'assigned', 'maintenance', 'retired']),
  queryValidator('category').optional().trim(),
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
    const category = req.query.category as string;
    const search = req.query.search as string;

    const { vehicles, total } = await VehicleModel.findByCompany(companyId, {
      status,
      category,
      search,
      limit: perPage,
      offset: (page - 1) * perPage,
    });

    res.json({
      success: true,
      data: {
        items: vehicles,
        total,
        page,
        perPage,
        totalPages: Math.ceil(total / perPage),
      }
    });
  } catch (error) {
    console.error('List vehicles error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch vehicles' });
  }
});

// GET /api/fleet/vehicles/stats/overview - Frontend compatible endpoint
router.get('/stats/overview', async (req: Request, res: Response) => {
  try {
    const companyId = req.user!.companyId;
    const stats = await VehicleModel.getStats(companyId);
    res.json({
      success: true,
      data: {
        total: stats.total || 0,
        available: stats.available || 0,
        assigned: stats.assigned || 0,
        maintenance: stats.maintenance || 0,
      }
    });
  } catch (error) {
    console.error('Vehicle stats error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch vehicle stats' });
  }
});

// GET /api/fleet/vehicles/stats - Get vehicle statistics
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const companyId = req.user!.companyId;
    const stats = await VehicleModel.getStats(companyId);

    res.json({ success: true, data: stats });
  } catch (error) {
    console.error('Vehicle stats error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch vehicle stats' });
  }
});

// GET /api/fleet/vehicles/:id - Get vehicle by ID
router.get('/:id', [
  param('id').isUUID().withMessage('Valid vehicle ID required'),
], async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, error: 'Validation failed', details: errors.array() });
  }

  try {
    const companyId = req.user!.companyId;
    const vehicle = await VehicleModel.findById(req.params.id, companyId);

    if (!vehicle) {
      return res.status(404).json({ success: false, error: 'Vehicle not found' });
    }

    res.json({ success: true, data: vehicle });
  } catch (error) {
    console.error('Get vehicle error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch vehicle' });
  }
});

// POST /api/fleet/vehicles - Create new vehicle (admin/manager only)
router.post('/', [
  requireRole('admin', 'manager'),
  body('registrationNumber').trim().notEmpty().withMessage('Registration number required'),
  body('make').trim().notEmpty().withMessage('Make required'),
  body('model').trim().notEmpty().withMessage('Model required'),
  body('year').optional().isInt({ min: 1900, max: 2100 }),
  body('fuelType').optional().isIn(['petrol', 'diesel', 'electric', 'hybrid']),
  body('currentMileage').optional().isFloat({ min: 0 }),
], async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, error: 'Validation failed', details: errors.array() });
  }

  try {
    const companyId = req.user!.companyId;

    // Check for duplicate registration
    const existing = await VehicleModel.findByRegistration(req.body.registrationNumber, companyId);
    if (existing) {
      return res.status(409).json({ success: false, error: 'Vehicle with this registration number already exists' });
    }

    const vehicle = await VehicleModel.create(companyId, {
      registrationNumber: req.body.registrationNumber,
      make: req.body.make,
      model: req.body.model,
      year: req.body.year,
      color: req.body.color,
      vin: req.body.vin,
      engineNumber: req.body.engineNumber,
      chassisNumber: req.body.chassisNumber,
      fuelType: req.body.fuelType,
      fuelCapacity: req.body.fuelCapacity,
      currentMileage: req.body.currentMileage,
      category: req.body.category,
      gpsDeviceId: req.body.gpsDeviceId,
      gpsProvider: req.body.gpsProvider,
      purchaseDate: req.body.purchaseDate ? new Date(req.body.purchaseDate) : undefined,
      purchasePrice: req.body.purchasePrice,
      insuranceExpiry: req.body.insuranceExpiry ? new Date(req.body.insuranceExpiry) : undefined,
      licenseExpiry: req.body.licenseExpiry ? new Date(req.body.licenseExpiry) : undefined,
      serviceIntervalKm: req.body.serviceIntervalKm,
      notes: req.body.notes,
    });

    res.status(201).json({ success: true, data: vehicle, message: 'Vehicle created successfully' });
  } catch (error: any) {
    console.error('Create vehicle error:', error);
    res.status(500).json({ success: false, error: 'Failed to create vehicle' });
  }
});

// PUT /api/fleet/vehicles/:id - Update vehicle
router.put('/:id', [
  param('id').isUUID().withMessage('Valid vehicle ID required'),
  body('year').optional().isInt({ min: 1900, max: 2100 }),
  body('fuelType').optional().isIn(['petrol', 'diesel', 'electric', 'hybrid']),
  body('status').optional().isIn(['available', 'assigned', 'maintenance', 'retired']),
], async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, error: 'Validation failed', details: errors.array() });
  }

  try {
    const companyId = req.user!.companyId;
    const vehicle = await VehicleModel.update(req.params.id, companyId, {
      make: req.body.make,
      model: req.body.model,
      year: req.body.year,
      color: req.body.color,
      fuelType: req.body.fuelType,
      fuelCapacity: req.body.fuelCapacity,
      currentMileage: req.body.currentMileage,
      status: req.body.status,
      category: req.body.category,
      gpsDeviceId: req.body.gpsDeviceId,
      gpsProvider: req.body.gpsProvider,
      insuranceExpiry: req.body.insuranceExpiry ? new Date(req.body.insuranceExpiry) : undefined,
      licenseExpiry: req.body.licenseExpiry ? new Date(req.body.licenseExpiry) : undefined,
      notes: req.body.notes,
      isActive: req.body.isActive,
    });

    if (!vehicle) {
      return res.status(404).json({ success: false, error: 'Vehicle not found' });
    }

    res.json({ success: true, data: vehicle });
  } catch (error) {
    console.error('Update vehicle error:', error);
    res.status(500).json({ success: false, error: 'Failed to update vehicle' });
  }
});

// DELETE /api/fleet/vehicles/:id - Delete vehicle (admin only)
router.delete('/:id', [
  requireRole('admin'),
  param('id').isUUID().withMessage('Valid vehicle ID required'),
], async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, error: 'Validation failed', details: errors.array() });
  }

  try {
    const companyId = req.user!.companyId;
    const deleted = await VehicleModel.delete(req.params.id, companyId);

    if (!deleted) {
      return res.status(404).json({ success: false, error: 'Vehicle not found' });
    }

    res.json({ success: true, message: 'Vehicle deleted successfully' });
  } catch (error) {
    console.error('Delete vehicle error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete vehicle' });
  }
});

export default router;
