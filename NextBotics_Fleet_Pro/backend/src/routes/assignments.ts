import { Router, Request, Response } from 'express';
import { body, param, query as queryValidator, validationResult } from 'express-validator';
import { AssignmentModel } from '../models/Assignment';
import { VehicleModel } from '../models/Vehicle';
import { authMiddleware, requireRole } from '../utils/auth';

const router = Router();

router.use(authMiddleware);

// GET /api/fleet/assignments - List all assignments
router.get('/assignments', [
  queryValidator('page').optional().isInt({ min: 1 }),
  queryValidator('perPage').optional().isInt({ min: 1, max: 100 }),
  queryValidator('status').optional().isIn(['active', 'completed', 'cancelled']),
  queryValidator('vehicleId').optional().isUUID(),
  queryValidator('driverId').optional().isUUID(),
  queryValidator('activeOnly').optional().isBoolean(),
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
    const vehicleId = req.query.vehicleId as string;
    const driverId = req.query.driverId as string;
    const activeOnly = req.query.activeOnly === 'true';

    const { assignments, total } = await AssignmentModel.findByCompany(companyId, {
      status,
      vehicleId,
      driverId,
      activeOnly,
      limit: perPage,
      offset: (page - 1) * perPage,
    });

    res.json({
      success: true,
      data: {
        items: assignments,
        total,
        page,
        perPage,
        totalPages: Math.ceil(total / perPage),
      }
    });
  } catch (error) {
    console.error('List assignments error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch assignments' });
  }
});

// GET /api/fleet/assignments/:id - Get assignment by ID
router.get('/assignments/:id', [
  param('id').isUUID().withMessage('Valid assignment ID required'),
], async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, error: 'Validation failed', details: errors.array() });
  }

  try {
    const companyId = req.user!.companyId;
    const assignment = await AssignmentModel.findById(req.params.id, companyId);

    if (!assignment) {
      return res.status(404).json({ success: false, error: 'Assignment not found' });
    }

    res.json({ success: true, data: assignment });
  } catch (error) {
    console.error('Get assignment error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch assignment' });
  }
});

// POST /api/fleet/assignments - Create new assignment (admin/manager only)
router.post('/assignments', [
  requireRole('admin', 'manager'),
  body('vehicleId').isUUID().withMessage('Valid vehicle ID required'),
  body('driverId').isUUID().withMessage('Valid driver ID required'),
  body('startDate').isISO8601().withMessage('Valid start date required'),
  body('endDate').optional().isISO8601(),
  body('purpose').optional().trim(),
], async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, error: 'Validation failed', details: errors.array() });
  }

  try {
    const companyId = req.user!.companyId;
    const assignedBy = req.user!.userId;

    // Check if vehicle exists and is available
    const vehicle = await VehicleModel.findById(req.body.vehicleId, companyId);
    if (!vehicle) {
      return res.status(404).json({ success: false, error: 'Vehicle not found' });
    }
    if (vehicle.status !== 'available') {
      return res.status(400).json({ success: false, error: 'Vehicle is not available for assignment' });
    }

    // Check for existing active assignment
    const existingAssignment = await AssignmentModel.getActiveAssignmentForVehicle(req.body.vehicleId, companyId);
    if (existingAssignment) {
      return res.status(400).json({ success: false, error: 'Vehicle already has an active assignment' });
    }

    const assignment = await AssignmentModel.create(companyId, assignedBy, {
      vehicleId: req.body.vehicleId,
      driverId: req.body.driverId,
      startDate: new Date(req.body.startDate),
      endDate: req.body.endDate ? new Date(req.body.endDate) : undefined,
      purpose: req.body.purpose,
    });

    res.status(201).json({ success: true, data: assignment, message: 'Assignment created successfully' });
  } catch (error) {
    console.error('Create assignment error:', error);
    res.status(500).json({ success: false, error: 'Failed to create assignment' });
  }
});

// POST /api/fleet/assignments/:id/complete - Complete an assignment
router.post('/assignments/:id/complete', [
  param('id').isUUID().withMessage('Valid assignment ID required'),
], async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, error: 'Validation failed', details: errors.array() });
  }

  try {
    const companyId = req.user!.companyId;
    const assignment = await AssignmentModel.complete(req.params.id, companyId);

    if (!assignment) {
      return res.status(404).json({ success: false, error: 'Assignment not found' });
    }

    res.json({ success: true, data: assignment, message: 'Assignment completed successfully' });
  } catch (error) {
    console.error('Complete assignment error:', error);
    res.status(500).json({ success: false, error: 'Failed to complete assignment' });
  }
});

// POST /api/fleet/assignments/:id/cancel - Cancel an assignment (admin/manager only)
router.post('/assignments/:id/cancel', [
  requireRole('admin', 'manager'),
  param('id').isUUID().withMessage('Valid assignment ID required'),
], async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, error: 'Validation failed', details: errors.array() });
  }

  try {
    const companyId = req.user!.companyId;
    const assignment = await AssignmentModel.cancel(req.params.id, companyId);

    if (!assignment) {
      return res.status(404).json({ success: false, error: 'Assignment not found' });
    }

    res.json({ success: true, data: assignment, message: 'Assignment cancelled successfully' });
  } catch (error) {
    console.error('Cancel assignment error:', error);
    res.status(500).json({ success: false, error: 'Failed to cancel assignment' });
  }
});

export default router;
