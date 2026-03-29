import { Router } from 'express';
import { query } from '../database';

const router = Router();

router.get('/stats', async (req, res) => {
  try {
    // Fleet overview - use correct column names from vehicles table
    const fleetStats = await query(`
      SELECT 
        COUNT(*) as total_vehicles,
        COUNT(CASE WHEN status = 'available' THEN 1 END) as active_vehicles,
        COUNT(CASE WHEN status = 'maintenance' THEN 1 END) as maintenance_vehicles,
        COALESCE(SUM(current_mileage), 0) as total_mileage
      FROM vehicles
    `);

    // Staff count
    const staffStats = await query('SELECT COUNT(*) as total_staff FROM staff WHERE deleted_at IS NULL');

    // Today's routes - simplified without columns that might not exist
    let todayRoutes = { today_routes: 0, today_km: 0, today_fuel: 0 };
    try {
      const routesResult = await query(`
        SELECT COUNT(*) as today_routes
        FROM routes 
        WHERE route_date = CURRENT_DATE
      `);
      todayRoutes.today_routes = routesResult[0]?.today_routes || 0;
    } catch (e) {
      // Routes table might not exist or have different columns
    }

    // Fuel this month
    const monthlyFuel = await query(`
      SELECT COALESCE(SUM(amount), 0) as monthly_cost,
        COALESCE(SUM(quantity_liters), 0) as monthly_liters
      FROM fuel_records 
      WHERE fuel_date >= DATE_TRUNC('month', CURRENT_DATE)
    `);

    // Pending repairs - use correct status values
    const repairsStats = await query(`
      SELECT COUNT(*) as pending_repairs,
        COALESCE(SUM(cost), 0) as repair_costs
      FROM repairs 
      WHERE status != 'Completed' AND status != 'completed'
    `);

    // Top fuel consumers (last 30 days)
    const topConsumers = await query(`
      SELECT v.registration_number as registration_num, 
        SUM(f.quantity_liters) as total_fuel,
        SUM(f.amount) as total_cost
      FROM fuel_records f
      JOIN vehicles v ON v.id = f.vehicle_id
      WHERE f.fuel_date >= CURRENT_DATE - INTERVAL '30 days'
      GROUP BY v.registration_number
      ORDER BY total_fuel DESC
      LIMIT 5
    `);

    // Maintenance due (simplified query)
    let maintenanceDue = [];
    try {
      maintenanceDue = await query(`
        SELECT registration_number as registration_num, 
          make || ' ' || model as make_model, 
          current_mileage
        FROM vehicles
        WHERE status = 'available'
        LIMIT 10
      `);
    } catch (e) {
      // Ignore errors
    }

    res.json({
      fleet: fleetStats[0],
      staff: staffStats[0],
      today: todayRoutes,
      monthlyFuel: monthlyFuel[0],
      repairs: repairsStats[0],
      topConsumers,
      maintenanceDue
    });
  } catch (error: any) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard stats', details: error.message });
  }
});

export default router;
