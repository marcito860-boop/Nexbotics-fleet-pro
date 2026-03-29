import { Router } from 'express';
import { query } from '../database';

const router = Router();

router.get('/stats', async (req, res) => {
  try {
    // Fleet overview - use correct column names from vehicles table
    let fleetStats = [{ total_vehicles: 0, active_vehicles: 0, maintenance_vehicles: 0, total_mileage: 0 }];
    try {
      fleetStats = await query(`
        SELECT 
          COUNT(*) as total_vehicles,
          COUNT(CASE WHEN status = 'available' THEN 1 END) as active_vehicles,
          COUNT(CASE WHEN status = 'maintenance' THEN 1 END) as maintenance_vehicles,
          COALESCE(SUM(current_mileage), 0) as total_mileage
        FROM vehicles
      `);
    } catch (e: any) {
      console.error('Fleet stats error:', e.message);
    }

    // Staff count
    let staffStats = [{ total_staff: 0 }];
    try {
      staffStats = await query('SELECT COUNT(*) as total_staff FROM staff WHERE deleted_at IS NULL');
    } catch (e: any) {
      console.error('Staff stats error:', e.message);
    }

    // Today's routes - simplified without columns that might not exist
    let todayRoutes = { today_routes: 0, today_km: 0, today_fuel: 0 };
    try {
      const routesResult = await query(`
        SELECT COUNT(*) as today_routes
        FROM routes 
        WHERE route_date = CURRENT_DATE
      `);
      todayRoutes.today_routes = routesResult[0]?.today_routes || 0;
    } catch (e: any) {
      console.error('Routes stats error:', e.message);
    }

    // Fuel this month
    let monthlyFuel = [{ monthly_cost: 0, monthly_liters: 0 }];
    try {
      monthlyFuel = await query(`
        SELECT COALESCE(SUM(amount), 0) as monthly_cost,
          COALESCE(SUM(quantity_liters), 0) as monthly_liters
        FROM fuel_records 
        WHERE fuel_date >= DATE_TRUNC('month', CURRENT_DATE)
      `);
    } catch (e: any) {
      console.error('Fuel stats error:', e.message);
    }

    // Pending repairs - use correct status values
    let repairsStats = [{ pending_repairs: 0, repair_costs: 0 }];
    try {
      repairsStats = await query(`
        SELECT COUNT(*) as pending_repairs,
          COALESCE(SUM(cost), 0) as repair_costs
        FROM repairs 
        WHERE status != 'Completed' AND status != 'completed'
      `);
    } catch (e: any) {
      console.error('Repairs stats error:', e.message);
    }

    // Top fuel consumers (last 30 days)
    let topConsumers: any[] = [];
    try {
      topConsumers = await query(`
        SELECT v.registration_num, 
          SUM(f.quantity_liters) as total_fuel,
          SUM(f.amount) as total_cost
        FROM fuel_records f
        JOIN vehicles v ON v.id = f.vehicle_id
        WHERE f.fuel_date >= CURRENT_DATE - INTERVAL '30 days'
        GROUP BY v.registration_num
        ORDER BY total_fuel DESC
        LIMIT 5
      `);
    } catch (e: any) {
      console.error('Top consumers error:', e.message);
    }

    // Maintenance due (simplified query)
    let maintenanceDue: any[] = [];
    try {
      maintenanceDue = await query(`
        SELECT registration_num, 
          make_model, 
          current_mileage
        FROM vehicles
        WHERE status = 'available'
        LIMIT 10
      `);
    } catch (e: any) {
      console.error('Maintenance due error:', e.message);
    }

    res.json({
      fleet: fleetStats[0] || { total_vehicles: 0, active_vehicles: 0, maintenance_vehicles: 0, total_mileage: 0 },
      staff: staffStats[0] || { total_staff: 0 },
      today: todayRoutes,
      monthlyFuel: monthlyFuel[0] || { monthly_cost: 0, monthly_liters: 0 },
      repairs: repairsStats[0] || { pending_repairs: 0, repair_costs: 0 },
      topConsumers,
      maintenanceDue
    });
  } catch (error: any) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard stats', details: error.message });
  }
});

export default router;
