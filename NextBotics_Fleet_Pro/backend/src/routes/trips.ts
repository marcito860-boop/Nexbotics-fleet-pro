import { Router, Request, Response } from 'express';
import { TripModel } from '../models/Trip';
import { authMiddleware, requireRole } from '../utils/auth';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// GET /api/fleet/trips - List trips
router.get('/', async (req: Request, res: Response) => {
  try {
    const companyId = req.user!.companyId;
    const { 
      status, 
      vehicleId, 
      driverId, 
      dateFrom, 
      dateTo, 
      limit = '50', 
      offset = '0' 
    } = req.query;

    const result = await TripModel.findByCompany(companyId, {
      status: status as any,
      vehicleId: vehicleId as string,
      driverId: driverId as string,
      dateFrom: dateFrom ? new Date(dateFrom as string) : undefined,
      dateTo: dateTo ? new Date(dateTo as string) : undefined,
      limit: parseInt(limit as string),
      offset: parseInt(offset as string),
    });

    res.json({
      success: true,
      data: result.trips,
      pagination: {
        total: result.total,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
      },
    });
  } catch (error) {
    console.error('Error fetching trips:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch trips' });
  }
});

// GET /api/fleet/trips/stats/summary - Frontend compatible endpoint
router.get('/stats/summary', async (req: Request, res: Response) => {
  try {
    const companyId = req.user!.companyId;
    const { dateFrom, dateTo } = req.query;
    const stats = await TripModel.getStats(
      companyId,
      dateFrom ? new Date(dateFrom as string) : undefined,
      dateTo ? new Date(dateTo as string) : undefined
    );
    res.json({ success: true, data: stats });
  } catch (error) {
    console.error('Error fetching trip stats:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch trip statistics' });
  }
});

// GET /api/fleet/trips/stats - Get trip statistics
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const companyId = req.user!.companyId;
    const { dateFrom, dateTo } = req.query;

    const stats = await TripModel.getStats(
      companyId,
      dateFrom ? new Date(dateFrom as string) : undefined,
      dateTo ? new Date(dateTo as string) : undefined
    );

    res.json({ success: true, data: stats });
  } catch (error) {
    console.error('Error fetching trip stats:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch trip statistics' });
  }
});

// GET /api/fleet/trips/:id - Get single trip
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const companyId = req.user!.companyId;
    const trip = await TripModel.findById(req.params.id, companyId);

    if (!trip) {
      return res.status(404).json({ success: false, error: 'Trip not found' });
    }

    res.json({ success: true, data: trip });
  } catch (error) {
    console.error('Error fetching trip:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch trip' });
  }
});

// POST /api/fleet/trips - Create new trip
router.post('/', requireRole(['admin', 'manager']), async (req: Request, res: Response) => {
  try {
    const companyId = req.user!.companyId;
    const { vehicleId, driverId, assignmentId, purpose, startTime } = req.body;

    if (!vehicleId) {
      return res.status(400).json({ success: false, error: 'Vehicle ID is required' });
    }

    const trip = await TripModel.create(companyId, {
      vehicleId,
      driverId,
      assignmentId,
      purpose,
      startTime: startTime ? new Date(startTime) : new Date(),
    });

    res.status(201).json({ success: true, data: trip });
  } catch (error) {
    console.error('Error creating trip:', error);
    res.status(500).json({ success: false, error: 'Failed to create trip' });
  }
});

// PUT /api/fleet/trips/:id - Update trip
router.put('/:id', requireRole(['admin', 'manager']), async (req: Request, res: Response) => {
  try {
    const companyId = req.user!.companyId;
    const { endTime, endOdometer, distanceKm, fuelConsumed, status } = req.body;

    const trip = await TripModel.update(req.params.id, companyId, {
      endTime: endTime ? new Date(endTime) : undefined,
      endOdometer,
      distanceKm,
      fuelConsumed,
      status,
    });

    if (!trip) {
      return res.status(404).json({ success: false, error: 'Trip not found' });
    }

    res.json({ success: true, data: trip });
  } catch (error) {
    console.error('Error updating trip:', error);
    res.status(500).json({ success: false, error: 'Failed to update trip' });
  }
});

// POST /api/fleet/trips/:id/complete - Complete a trip
router.post('/:id/complete', requireRole(['admin', 'manager', 'staff']), async (req: Request, res: Response) => {
  try {
    const companyId = req.user!.companyId;
    const { endOdometer, distanceKm, fuelConsumed } = req.body;

    if (!endOdometer || !distanceKm) {
      return res.status(400).json({ 
        success: false, 
        error: 'End odometer reading and distance are required' 
      });
    }

    const trip = await TripModel.complete(req.params.id, companyId, {
      endOdometer,
      distanceKm,
      fuelConsumed,
    });

    if (!trip) {
      return res.status(404).json({ success: false, error: 'Trip not found or already completed' });
    }

    res.json({ success: true, data: trip });
  } catch (error) {
    console.error('Error completing trip:', error);
    res.status(500).json({ success: false, error: 'Failed to complete trip' });
  }
});

export default router;
