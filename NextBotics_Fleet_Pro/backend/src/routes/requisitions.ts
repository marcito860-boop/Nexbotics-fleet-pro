import { Router, Request, Response } from 'express';
import { RequisitionModel } from '../models/Requisition';
import { authMiddleware, requireRole } from '../utils/auth';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// GET /api/fleet/requisitions - List requisitions
router.get('/', async (req: Request, res: Response) => {
  try {
    const companyId = req.user!.companyId;
    const { 
      status, 
      requestedBy, 
      dateFrom, 
      dateTo, 
      limit = '50', 
      offset = '0' 
    } = req.query;

    const result = await RequisitionModel.findByCompany(companyId, {
      status: status as any,
      requestedBy: requestedBy as string,
      dateFrom: dateFrom ? new Date(dateFrom as string) : undefined,
      dateTo: dateTo ? new Date(dateTo as string) : undefined,
      limit: parseInt(limit as string),
      offset: parseInt(offset as string),
    });

    res.json({
      success: true,
      data: result.requisitions,
      pagination: {
        total: result.total,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
      },
    });
  } catch (error) {
    console.error('Error fetching requisitions:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch requisitions' });
  }
});

// GET /api/fleet/requisitions/stats - Get requisition statistics
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const companyId = req.user!.companyId;
    const stats = await RequisitionModel.getStats(companyId);
    res.json({ success: true, data: stats });
  } catch (error) {
    console.error('Error fetching requisition stats:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch statistics' });
  }
});

// GET /api/fleet/requisitions/my-requests - Get current user's requisitions
router.get('/my-requests', async (req: Request, res: Response) => {
  try {
    const companyId = req.user!.companyId;
    const userId = req.user!.userId;
    const { limit = '50', offset = '0' } = req.query;

    const result = await RequisitionModel.findByCompany(companyId, {
      requestedBy: userId,
      limit: parseInt(limit as string),
      offset: parseInt(offset as string),
    });

    res.json({
      success: true,
      data: result.requisitions,
      pagination: {
        total: result.total,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
      },
    });
  } catch (error) {
    console.error('Error fetching my requisitions:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch requisitions' });
  }
});

// GET /api/fleet/requisitions/:id - Get single requisition
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const companyId = req.user!.companyId;
    const requisition = await RequisitionModel.findById(req.params.id, companyId);

    if (!requisition) {
      return res.status(404).json({ success: false, error: 'Requisition not found' });
    }

    res.json({ success: true, data: requisition });
  } catch (error) {
    console.error('Error fetching requisition:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch requisition' });
  }
});

// GET /api/fleet/requisitions/:id/history - Get workflow history
router.get('/:id/history', async (req: Request, res: Response) => {
  try {
    const companyId = req.user!.companyId;
    const history = await RequisitionModel.getWorkflowHistory(req.params.id, companyId);
    res.json({ success: true, data: history });
  } catch (error) {
    console.error('Error fetching workflow history:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch history' });
  }
});

// POST /api/fleet/requisitions - Create requisition
router.post('/', async (req: Request, res: Response) => {
  try {
    const companyId = req.user!.companyId;
    const userId = req.user!.userId;
    const user = req.user!;
    
    const {
      requesterName,
      requesterDepartment,
      requesterPhone,
      purpose,
      destination,
      passengersCount,
      startDate,
      endDate,
      preferredVehicleType,
      requiresDriver,
      priority,
    } = req.body;

    if (!purpose || !startDate || !endDate) {
      return res.status(400).json({ 
        success: false, 
        error: 'Purpose, start date, and end date are required' 
      });
    }

    const requisition = await RequisitionModel.create(companyId, {
      requestedBy: userId,
      requesterName: requesterName || `${user.firstName} ${user.lastName}`,
      requesterDepartment,
      requesterPhone,
      purpose,
      destination,
      passengersCount,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      preferredVehicleType,
      requiresDriver,
      priority: priority || 'normal',
    });

    res.status(201).json({ success: true, data: requisition });
  } catch (error) {
    console.error('Error creating requisition:', error);
    res.status(500).json({ success: false, error: 'Failed to create requisition' });
  }
});

// POST /api/fleet/requisitions/:id/approve - Approve requisition
router.post('/:id/approve', requireRole(['admin', 'manager']), async (req: Request, res: Response) => {
  try {
    const companyId = req.user!.companyId;
    const userId = req.user!.userId;
    const { notes } = req.body;

    const requisition = await RequisitionModel.approve(req.params.id, companyId, userId, notes);

    if (!requisition) {
      return res.status(404).json({ success: false, error: 'Requisition not found or not pending' });
    }

    res.json({ success: true, data: requisition });
  } catch (error) {
    console.error('Error approving requisition:', error);
    res.status(500).json({ success: false, error: 'Failed to approve requisition' });
  }
});

// POST /api/fleet/requisitions/:id/reject - Reject requisition
router.post('/:id/reject', requireRole(['admin', 'manager']), async (req: Request, res: Response) => {
  try {
    const companyId = req.user!.companyId;
    const userId = req.user!.userId;
    const { reason } = req.body;

    if (!reason) {
      return res.status(400).json({ success: false, error: 'Rejection reason is required' });
    }

    const requisition = await RequisitionModel.reject(req.params.id, companyId, userId, reason);

    if (!requisition) {
      return res.status(404).json({ success: false, error: 'Requisition not found or not pending' });
    }

    res.json({ success: true, data: requisition });
  } catch (error) {
    console.error('Error rejecting requisition:', error);
    res.status(500).json({ success: false, error: 'Failed to reject requisition' });
  }
});

// POST /api/fleet/requisitions/:id/allocate - Allocate vehicle and driver
router.post('/:id/allocate', requireRole(['admin', 'manager']), async (req: Request, res: Response) => {
  try {
    const companyId = req.user!.companyId;
    const userId = req.user!.userId;
    const { vehicleId, driverId } = req.body;

    if (!vehicleId) {
      return res.status(400).json({ success: false, error: 'Vehicle ID is required' });
    }

    const requisition = await RequisitionModel.allocate(req.params.id, companyId, userId, vehicleId, driverId);

    if (!requisition) {
      return res.status(404).json({ success: false, error: 'Requisition not found or not approved' });
    }

    res.json({ success: true, data: requisition });
  } catch (error) {
    console.error('Error allocating requisition:', error);
    res.status(500).json({ success: false, error: 'Failed to allocate requisition' });
  }
});

// POST /api/fleet/requisitions/:id/start - Start trip
router.post('/:id/start', requireRole(['admin', 'manager', 'staff']), async (req: Request, res: Response) => {
  try {
    const companyId = req.user!.companyId;
    const { odometer } = req.body;

    if (!odometer) {
      return res.status(400).json({ success: false, error: 'Odometer reading is required' });
    }

    const requisition = await RequisitionModel.startTrip(req.params.id, companyId, odometer);

    if (!requisition) {
      return res.status(404).json({ success: false, error: 'Requisition not found or not allocated' });
    }

    res.json({ success: true, data: requisition });
  } catch (error) {
    console.error('Error starting trip:', error);
    res.status(500).json({ success: false, error: 'Failed to start trip' });
  }
});

// POST /api/fleet/requisitions/:id/complete - Complete trip
router.post('/:id/complete', requireRole(['admin', 'manager', 'staff']), async (req: Request, res: Response) => {
  try {
    const companyId = req.user!.companyId;
    const { odometer, remarks } = req.body;

    if (!odometer) {
      return res.status(400).json({ success: false, error: 'Odometer reading is required' });
    }

    const requisition = await RequisitionModel.completeTrip(req.params.id, companyId, odometer, remarks);

    if (!requisition) {
      return res.status(404).json({ success: false, error: 'Requisition not found or not in progress' });
    }

    res.json({ success: true, data: requisition });
  } catch (error) {
    console.error('Error completing trip:', error);
    res.status(500).json({ success: false, error: 'Failed to complete trip' });
  }
});

// POST /api/fleet/requisitions/:id/cancel - Cancel requisition
router.post('/:id/cancel', async (req: Request, res: Response) => {
  try {
    const companyId = req.user!.companyId;
    const userId = req.user!.userId;
    const { reason } = req.body;

    const requisition = await RequisitionModel.cancel(req.params.id, companyId, userId, reason);

    if (!requisition) {
      return res.status(404).json({ success: false, error: 'Requisition not found or already completed' });
    }

    res.json({ success: true, data: requisition });
  } catch (error) {
    console.error('Error cancelling requisition:', error);
    res.status(500).json({ success: false, error: 'Failed to cancel requisition' });
  }
});

export default router;
