import { Router, Request, Response } from 'express';
import { query } from '../database';
import { authMiddleware, requireRole } from '../utils/auth';

const router = Router();

router.use(authMiddleware);

// ============================================
// ROUTES
// ============================================

// GET /api/fleet/routes - List planned routes
router.get('/', async (req: Request, res: Response) => {
  try {
    const companyId = req.user!.companyId;
    const { status, vehicleId, dateFrom, dateTo, limit = '50' } = req.query;

    let sql = `
      SELECT r.*, 
        v.registration_number, v.make, v.model,
        d.first_name as driver_fname, d.last_name as driver_lname
      FROM planned_routes r
      LEFT JOIN vehicles v ON r.vehicle_id = v.id
      LEFT JOIN drivers d ON r.driver_id = d.id
      WHERE r.company_id = $1
    `;
    const params: any[] = [companyId];

    if (status) {
      sql += ` AND r.status = $${params.length + 1}`;
      params.push(status);
    }
    if (vehicleId) {
      sql += ` AND r.vehicle_id = $${params.length + 1}`;
      params.push(vehicleId);
    }
    if (dateFrom) {
      sql += ` AND r.planned_date >= $${params.length + 1}`;
      params.push(dateFrom);
    }
    if (dateTo) {
      sql += ` AND r.planned_date <= $${params.length + 1}`;
      params.push(dateTo);
    }

    sql += ' ORDER BY r.planned_date DESC, r.created_at DESC';

    if (limit) {
      sql += ` LIMIT $${params.length + 1}`;
      params.push(parseInt(limit as string));
    }

    const rows = await query(sql, params);

    res.json({
      success: true,
      data: rows.map((r: any) => ({
        id: r.id,
        routeName: r.route_name,
        vehicleId: r.vehicle_id,
        vehicle: r.registration_number ? {
          registrationNumber: r.registration_number,
          make: r.make,
          model: r.model,
        } : null,
        driverId: r.driver_id,
        driver: r.driver_fname ? `${r.driver_fname} ${r.driver_lname}` : null,
        plannedDate: r.planned_date,
        startLocation: r.start_location,
        endLocation: r.end_location,
        waypoints: r.waypoints,
        estimatedDistance: r.estimated_distance,
        estimatedDuration: r.estimated_duration,
        status: r.status,
        startedAt: r.started_at,
        completedAt: r.completed_at,
        actualDistance: r.actual_distance,
        deviationAlerts: r.deviation_alerts,
        createdAt: r.created_at,
      })),
    });
  } catch (error) {
    console.error('Error fetching routes:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch routes' });
  }
});

// POST /api/fleet/routes - Create planned route
router.post('/', requireRole(['admin', 'manager']), async (req: Request, res: Response) => {
  try {
    const companyId = req.user!.companyId;
    const userId = req.user!.userId;
    const { routeName, vehicleId, driverId, plannedDate, startLocation, endLocation, 
            waypoints, estimatedDistance, estimatedDuration, notes } = req.body;

    if (!routeName || !vehicleId || !startLocation || !endLocation) {
      return res.status(400).json({ success: false, error: 'Route name, vehicle, start and end locations are required' });
    }

    const rows = await query(
      `INSERT INTO planned_routes (company_id, route_name, vehicle_id, driver_id, planned_date,
       start_location, end_location, waypoints, estimated_distance, estimated_duration, notes, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *`,
      [companyId, routeName, vehicleId, driverId, plannedDate, startLocation, endLocation,
       waypoints ? JSON.stringify(waypoints) : null, estimatedDistance, estimatedDuration, notes, userId]
    );

    res.status(201).json({ success: true, data: rows[0] });
  } catch (error) {
    console.error('Error creating route:', error);
    res.status(500).json({ success: false, error: 'Failed to create route' });
  }
});

// POST /api/fleet/routes/:id/start - Start route
router.post('/:id/start', async (req: Request, res: Response) => {
  try {
    const companyId = req.user!.companyId;
    const { currentOdometer } = req.body;

    const rows = await query(
      `UPDATE planned_routes 
       SET status = 'in_progress', started_at = NOW(), start_odometer = $1
       WHERE id = $2 AND company_id = $3 AND status = 'planned'
       RETURNING *`,
      [currentOdometer, req.params.id, companyId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Route not found or already started' });
    }

    res.json({ success: true, data: rows[0] });
  } catch (error) {
    console.error('Error starting route:', error);
    res.status(500).json({ success: false, error: 'Failed to start route' });
  }
});

// POST /api/fleet/routes/:id/complete - Complete route
router.post('/:id/complete', async (req: Request, res: Response) => {
  try {
    const companyId = req.user!.companyId;
    const { currentOdometer, actualDistance, notes } = req.body;

    const rows = await query(
      `UPDATE planned_routes 
       SET status = 'completed', completed_at = NOW(), end_odometer = $1, actual_distance = $2, notes = COALESCE(notes, '') || $3
       WHERE id = $4 AND company_id = $5 AND status = 'in_progress'
       RETURNING *`,
      [currentOdometer, actualDistance, notes ? '\n' + notes : '', req.params.id, companyId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Route not found or not in progress' });
    }

    res.json({ success: true, data: rows[0] });
  } catch (error) {
    console.error('Error completing route:', error);
    res.status(500).json({ success: false, error: 'Failed to complete route' });
  }
});

// POST /api/fleet/routes/:id/alert - Record deviation alert
router.post('/:id/alert', async (req: Request, res: Response) => {
  try {
    const companyId = req.user!.companyId;
    const { alertType, latitude, longitude, message } = req.body;

    const route = await query(
      'SELECT deviation_alerts FROM planned_routes WHERE id = $1 AND company_id = $2',
      [req.params.id, companyId]
    );

    if (route.length === 0) {
      return res.status(404).json({ success: false, error: 'Route not found' });
    }

    const alerts = route[0].deviation_alerts || [];
    alerts.push({
      alertType,
      latitude,
      longitude,
      message,
      timestamp: new Date().toISOString(),
    });

    await query(
      'UPDATE planned_routes SET deviation_alerts = $1 WHERE id = $2',
      [JSON.stringify(alerts), req.params.id]
    );

    // Create fleet alert for serious deviations
    if (alertType === 'unauthorized_stop' || alertType === 'route_deviation') {
      await query(
        `INSERT INTO fleet_alerts (company_id, alert_type, severity, title, message, reference_id, reference_type, latitude, longitude)
         VALUES ($1, $2, 'high', $3, $4, $5, 'route', $6, $7)`,
        [companyId, alertType, `Route Alert: ${alertType}`, message, req.params.id, latitude, longitude]
      );
    }

    res.json({ success: true, message: 'Alert recorded' });
  } catch (error) {
    console.error('Error recording alert:', error);
    res.status(500).json({ success: false, error: 'Failed to record alert' });
  }
});

// GET /api/fleet/routes/active - Get currently active routes
router.get('/active', async (req: Request, res: Response) => {
  try {
    const companyId = req.user!.companyId;

    const rows = await query(
      `SELECT r.*, 
        v.registration_number, v.make, v.model,
        d.first_name as driver_fname, d.last_name as driver_lname,
        (SELECT latitude FROM gps_telemetry WHERE vehicle_id = r.vehicle_id ORDER BY timestamp DESC LIMIT 1) as current_lat,
        (SELECT longitude FROM gps_telemetry WHERE vehicle_id = r.vehicle_id ORDER BY timestamp DESC LIMIT 1) as current_lng
      FROM planned_routes r
      LEFT JOIN vehicles v ON r.vehicle_id = v.id
      LEFT JOIN drivers d ON r.driver_id = d.id
      WHERE r.company_id = $1 AND r.status = 'in_progress'`,
      [companyId]
    );

    res.json({
      success: true,
      data: rows.map((r: any) => ({
        id: r.id,
        routeName: r.route_name,
        vehicle: {
          registrationNumber: r.registration_number,
          make: r.make,
          model: r.model,
        },
        driver: r.driver_fname ? `${r.driver_fname} ${r.driver_lname}` : null,
        startLocation: r.start_location,
        endLocation: r.end_location,
        startedAt: r.started_at,
        currentLocation: r.current_lat ? { lat: r.current_lat, lng: r.current_lng } : null,
        deviationAlerts: r.deviation_alerts?.length || 0,
      })),
    });
  } catch (error) {
    console.error('Error fetching active routes:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch routes' });
  }
});

// GET /api/fleet/routes/analytics - Route analytics
router.get('/analytics', async (req: Request, res: Response) => {
  try {
    const companyId = req.user!.companyId;
    const { dateFrom, dateTo } = req.query;

    const fromDate = dateFrom ? new Date(dateFrom as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const toDate = dateTo ? new Date(dateTo as string) : new Date();

    const rows = await query(
      `SELECT 
        COUNT(*) as total_routes,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
        COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled,
        COALESCE(SUM(estimated_distance), 0) as planned_distance,
        COALESCE(SUM(actual_distance), 0) as actual_distance,
        COALESCE(AVG(EXTRACT(EPOCH FROM (completed_at - started_at))/3600), 0) as avg_duration_hours,
        COALESCE(SUM(CASE WHEN deviation_alerts IS NOT NULL AND jsonb_array_length(deviation_alerts) > 0 THEN 1 ELSE 0 END), 0) as routes_with_alerts
       FROM planned_routes 
       WHERE company_id = $1 AND planned_date >= $2 AND planned_date <= $3`,
      [companyId, fromDate, toDate]
    );

    const vehicleUtilization = await query(
      `SELECT 
        v.registration_number,
        COUNT(r.id) as route_count,
        COALESCE(SUM(r.actual_distance), 0) as total_distance
       FROM vehicles v
       LEFT JOIN planned_routes r ON v.id = r.vehicle_id AND r.planned_date >= $2 AND r.planned_date <= $3
       WHERE v.company_id = $1
       GROUP BY v.id, v.registration_number
       ORDER BY route_count DESC
       LIMIT 10`,
      [companyId, fromDate, toDate]
    );

    res.json({
      success: true,
      data: {
        summary: {
          totalRoutes: parseInt(rows[0].total_routes),
          completed: parseInt(rows[0].completed),
          cancelled: parseInt(rows[0].cancelled),
          plannedDistance: parseFloat(rows[0].planned_distance),
          actualDistance: parseFloat(rows[0].actual_distance),
          averageDurationHours: parseFloat(rows[0].avg_duration_hours),
          routesWithAlerts: parseInt(rows[0].routes_with_alerts),
        },
        vehicleUtilization: vehicleUtilization.map((r: any) => ({
          registrationNumber: r.registration_number,
          routeCount: parseInt(r.route_count),
          totalDistance: parseFloat(r.total_distance),
        })),
        period: { from: fromDate, to: toDate },
      },
    });
  } catch (error) {
    console.error('Error fetching route analytics:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch analytics' });
  }
});

export default router;
