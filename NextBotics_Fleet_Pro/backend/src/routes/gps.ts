import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import { query } from '../database';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// ==================== GPS TRACKING ROUTES ====================

/**
 * GET /api/gps/vehicles
 * Get all vehicles with their current GPS locations
 */
router.get('/vehicles', authenticateToken, async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    
    const vehicles = await query(`
      SELECT 
        v.id,
        v.registration_number,
        v.make_model,
        v.status,
        COALESCE(gps.latitude, -1.2921) as latitude,
        COALESCE(gps.longitude, 36.8219) as longitude,
        COALESCE(gps.speed, 0) as speed,
        COALESCE(gps.heading, 0) as heading,
        gps.ignition_status,
        gps.last_updated,
        gps.accuracy,
        d.id as driver_id,
        d.staff_name as driver_name,
        d.phone as driver_phone,
        r.route_name as current_route,
        r.status as route_status
      FROM vehicles v
      LEFT JOIN gps_tracking gps ON gps.vehicle_id = v.id
      LEFT JOIN staff d ON d.id = (
        SELECT driver1_id FROM routes 
        WHERE vehicle_id = v.id 
        AND route_date = CURRENT_DATE 
        AND actual_km IS NULL
        LIMIT 1
      )
      LEFT JOIN routes r ON r.id = (
        SELECT id FROM routes 
        WHERE vehicle_id = v.id 
        AND route_date = CURRENT_DATE
        ORDER BY created_at DESC
        LIMIT 1
      )
      WHERE v.deleted_at IS NULL
      ${companyId ? 'AND v.company_id = $1' : ''}
      ORDER BY v.registration_number
    `, companyId ? [companyId] : []);

    res.json({
      success: true,
      count: vehicles.length,
      data: vehicles
    });
  } catch (error: any) {
    console.error('Error fetching GPS vehicles:', error);
    res.status(500).json({ error: 'Failed to fetch vehicle locations' });
  }
});

/**
 * GET /api/gps/vehicles/:id/location
 * Get current location for a specific vehicle
 */
router.get('/vehicles/:id/location', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = req.user?.companyId;

    const location = await query(`
      SELECT 
        v.id,
        v.registration_number,
        gps.latitude,
        gps.longitude,
        gps.speed,
        gps.heading,
        gps.ignition_status,
        gps.odometer,
        gps.fuel_level,
        gps.battery_voltage,
        gps.last_updated,
        gps.accuracy,
        r.route_name,
        r.route_date
      FROM vehicles v
      LEFT JOIN gps_tracking gps ON gps.vehicle_id = v.id
      LEFT JOIN routes r ON r.vehicle_id = v.id 
        AND r.route_date = CURRENT_DATE
      WHERE v.id = $1
      ${companyId ? 'AND v.company_id = $2' : ''}
      LIMIT 1
    `, companyId ? [id, companyId] : [id]);

    if (!location || location.length === 0) {
      return res.status(404).json({ error: 'Vehicle not found' });
    }

    res.json({
      success: true,
      data: location[0]
    });
  } catch (error: any) {
    console.error('Error fetching vehicle location:', error);
    res.status(500).json({ error: 'Failed to fetch vehicle location' });
  }
});

/**
 * GET /api/gps/vehicles/:id/history
 * Get location history for a vehicle
 */
router.get('/vehicles/:id/history', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { startDate, endDate, limit = '100' } = req.query;
    const companyId = req.user?.companyId;

    // Verify vehicle exists and belongs to company
    const vehicleCheck = await query(`
      SELECT id FROM vehicles 
      WHERE id = $1 ${companyId ? 'AND company_id = $2' : ''}
    `, companyId ? [id, companyId] : [id]);

    if (!vehicleCheck || vehicleCheck.length === 0) {
      return res.status(404).json({ error: 'Vehicle not found' });
    }

    const history = await query(`
      SELECT 
        id,
        latitude,
        longitude,
        speed,
        heading,
        ignition_status,
        odometer,
        recorded_at,
        accuracy
      FROM gps_history
      WHERE vehicle_id = $1
      AND recorded_at BETWEEN $2 AND $3
      ORDER BY recorded_at DESC
      LIMIT $4
    `, [
      id,
      startDate || new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      endDate || new Date().toISOString(),
      parseInt(limit as string)
    ]);

    res.json({
      success: true,
      count: history.length,
      data: history
    });
  } catch (error: any) {
    console.error('Error fetching location history:', error);
    res.status(500).json({ error: 'Failed to fetch location history' });
  }
});

/**
 * POST /api/gps/vehicles/:id/update
 * Update GPS location (simulated or from device)
 */
router.post('/vehicles/:id/update', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      latitude,
      longitude,
      speed = 0,
      heading = 0,
      ignition_status = 'off',
      odometer,
      fuel_level,
      battery_voltage,
      accuracy = 10
    } = req.body;

    if (latitude === undefined || longitude === undefined) {
      return res.status(400).json({ error: 'Latitude and longitude are required' });
    }

    // Update current location
    await query(`
      INSERT INTO gps_tracking (
        id, vehicle_id, latitude, longitude, speed, heading,
        ignition_status, odometer, fuel_level, battery_voltage,
        accuracy, last_updated
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
      ON CONFLICT (vehicle_id) DO UPDATE SET
        latitude = EXCLUDED.latitude,
        longitude = EXCLUDED.longitude,
        speed = EXCLUDED.speed,
        heading = EXCLUDED.heading,
        ignition_status = EXCLUDED.ignition_status,
        odometer = EXCLUDED.odometer,
        fuel_level = EXCLUDED.fuel_level,
        battery_voltage = EXCLUDED.battery_voltage,
        accuracy = EXCLUDED.accuracy,
        last_updated = NOW()
    `, [
      uuidv4(), id, latitude, longitude, speed, heading,
      ignition_status, odometer, fuel_level, battery_voltage, accuracy
    ]);

    // Add to history
    await query(`
      INSERT INTO gps_history (
        id, vehicle_id, latitude, longitude, speed, heading,
        ignition_status, odometer, recorded_at, accuracy
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), $9)
    `, [
      uuidv4(), id, latitude, longitude, speed, heading,
      ignition_status, odometer, accuracy
    ]);

    res.json({
      success: true,
      message: 'Location updated successfully'
    });
  } catch (error: any) {
    console.error('Error updating GPS location:', error);
    res.status(500).json({ error: 'Failed to update location' });
  }
});

/**
 * POST /api/gps/vehicles/:id/geofence
 * Create a geofence for a vehicle
 */
router.post('/vehicles/:id/geofence', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, latitude, longitude, radius, alert_on_exit, alert_on_enter } = req.body;

    if (!name || latitude === undefined || longitude === undefined || !radius) {
      return res.status(400).json({ error: 'Name, latitude, longitude, and radius are required' });
    }

    const result = await query(`
      INSERT INTO geofences (
        id, vehicle_id, name, latitude, longitude, radius,
        alert_on_exit, alert_on_enter, is_active, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true, NOW())
      RETURNING *
    `, [
      uuidv4(), id, name, latitude, longitude, radius,
      alert_on_exit || false, alert_on_enter || false
    ]);

    res.status(201).json({
      success: true,
      data: result[0]
    });
  } catch (error: any) {
    console.error('Error creating geofence:', error);
    res.status(500).json({ error: 'Failed to create geofence' });
  }
});

/**
 * GET /api/gps/vehicles/:id/geofences
 * Get all geofences for a vehicle
 */
router.get('/vehicles/:id/geofences', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const geofences = await query(`
      SELECT * FROM geofences
      WHERE vehicle_id = $1 AND is_active = true
      ORDER BY created_at DESC
    `, [id]);

    res.json({
      success: true,
      count: geofences.length,
      data: geofences
    });
  } catch (error: any) {
    console.error('Error fetching geofences:', error);
    res.status(500).json({ error: 'Failed to fetch geofences' });
  }
});

/**
 * GET /api/gps/live-status
 * Get real-time fleet status for dashboard
 */
router.get('/live-status', authenticateToken, async (req, res) => {
  try {
    const companyId = req.user?.companyId;

    const stats = await query(`
      SELECT 
        COUNT(DISTINCT v.id) as total_vehicles,
        COUNT(DISTINCT CASE WHEN gps.ignition_status = 'on' THEN v.id END) as active_vehicles,
        COUNT(DISTINCT CASE WHEN gps.speed > 0 THEN v.id END) as moving_vehicles,
        COUNT(DISTINCT CASE WHEN gps.ignition_status = 'off' THEN v.id END) as parked_vehicles,
        COUNT(DISTINCT CASE WHEN gps.last_updated < NOW() - INTERVAL '1 hour' THEN v.id END) as offline_vehicles,
        AVG(gps.speed) as avg_speed,
        MAX(gps.speed) as max_speed
      FROM vehicles v
      LEFT JOIN gps_tracking gps ON gps.vehicle_id = v.id
      WHERE v.deleted_at IS NULL
      ${companyId ? 'AND v.company_id = $1' : ''}
    `, companyId ? [companyId] : []);

    res.json({
      success: true,
      data: stats[0]
    });
  } catch (error: any) {
    console.error('Error fetching live status:', error);
    res.status(500).json({ error: 'Failed to fetch live status' });
  }
});

/**
 * POST /api/gps/simulate/:vehicleId
 * Simulate GPS movement for testing
 */
router.post('/simulate/:vehicleId', authenticateToken, async (req, res) => {
  try {
    const { vehicleId } = req.params;
    const { route = 'nairobi-loop' } = req.body;

    // Predefined simulation routes
    const routes: Record<string, Array<{ lat: number; lng: number }>> = {
      'nairobi-loop': [
        { lat: -1.2921, lng: 36.8219 }, // CBD
        { lat: -1.2865, lng: 36.8254 }, // Tom Mboya
        { lat: -1.2842, lng: 36.8301 }, // Haile Selassie
        { lat: -1.2819, lng: 36.8356 }, // Mombasa Road
        { lat: -1.3234, lng: 36.8432 }, // JKIA area
        { lat: -1.3156, lng: 36.8265 }, // South C
        { lat: -1.2987, lng: 36.8154 }, // Wilson
        { lat: -1.2921, lng: 36.8219 }, // Back to CBD
      ],
      'westlands-route': [
        { lat: -1.2921, lng: 36.8219 }, // CBD
        { lat: -1.2854, lng: 36.8143 }, // Uhuru Highway
        { lat: -1.2743, lng: 36.8065 }, // Museum Hill
        { lat: -1.2687, lng: 36.8012 }, // Westlands
        { lat: -1.2634, lng: 36.7987 }, // Sarit
        { lat: -1.2743, lng: 36.8065 }, // Back
        { lat: -1.2854, lng: 36.8143 },
        { lat: -1.2921, lng: 36.8219 },
      ]
    };

    const selectedRoute = routes[route] || routes['nairobi-loop'];
    
    // Simulate movement along route
    for (let i = 0; i < selectedRoute.length; i++) {
      const point = selectedRoute[i];
      const nextPoint = selectedRoute[(i + 1) % selectedRoute.length];
      
      // Calculate heading
      const heading = Math.atan2(
        nextPoint.lng - point.lng,
        nextPoint.lat - point.lat
      ) * (180 / Math.PI);

      await query(`
        INSERT INTO gps_tracking (
          id, vehicle_id, latitude, longitude, speed, heading,
          ignition_status, odometer, fuel_level, last_updated
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
        ON CONFLICT (vehicle_id) DO UPDATE SET
          latitude = EXCLUDED.latitude,
          longitude = EXCLUDED.longitude,
          speed = EXCLUDED.speed,
          heading = EXCLUDED.heading,
          ignition_status = EXCLUDED.ignition_status,
          odometer = EXCLUDED.odometer,
          fuel_level = EXCLUDED.fuel_level,
          last_updated = NOW()
      `, [
        uuidv4(), vehicleId, point.lat, point.lng, 
        40 + Math.random() * 20, // Random speed 40-60 km/h
        heading,
        'on',
        10000 + i * 10,
        75 - i * 2
      ]);

      await query(`
        INSERT INTO gps_history (
          id, vehicle_id, latitude, longitude, speed, heading,
          ignition_status, odometer, recorded_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
      `, [
        uuidv4(), vehicleId, point.lat, point.lng,
        40 + Math.random() * 20,
        heading,
        'on',
        10000 + i * 10
      ]);
    }

    res.json({
      success: true,
      message: `GPS simulation completed for route: ${route}`,
      points: selectedRoute.length
    });
  } catch (error: any) {
    console.error('Error simulating GPS:', error);
    res.status(500).json({ error: 'Failed to simulate GPS' });
  }
});

export default router;
