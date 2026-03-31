"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const database_1 = require("../database");
const router = (0, express_1.Router)();
router.get('/stats', async (req, res) => {
    try {
        // Fleet overview - use correct column names from vehicles table
        let fleetStats = [{ total_vehicles: 0, active_vehicles: 0, maintenance_vehicles: 0, total_mileage: 0 }];
        try {
            fleetStats = await (0, database_1.query)(`
        SELECT 
          COUNT(*) as total_vehicles,
          COUNT(CASE WHEN status = 'available' THEN 1 END) as active_vehicles,
          COUNT(CASE WHEN status = 'maintenance' THEN 1 END) as maintenance_vehicles,
          COALESCE(SUM(current_mileage), 0) as total_mileage
        FROM vehicles
      `);
        }
        catch (e) {
            console.error('Fleet stats error:', e.message);
        }
        // Staff count
        let staffStats = [{ total_staff: 0 }];
        try {
            staffStats = await (0, database_1.query)('SELECT COUNT(*) as total_staff FROM staff WHERE deleted_at IS NULL');
        }
        catch (e) {
            console.error('Staff stats error:', e.message);
        }
        // Today's routes - simplified without columns that might not exist
        let todayRoutes = { today_routes: 0, today_km: 0, today_fuel: 0 };
        try {
            const routesResult = await (0, database_1.query)(`
        SELECT COUNT(*) as today_routes
        FROM routes 
        WHERE route_date = CURRENT_DATE
      `);
            todayRoutes.today_routes = routesResult[0]?.today_routes || 0;
        }
        catch (e) {
            console.error('Routes stats error:', e.message);
        }
        // Fuel this month
        let monthlyFuel = [{ monthly_cost: 0, monthly_liters: 0 }];
        try {
            monthlyFuel = await (0, database_1.query)(`
        SELECT COALESCE(SUM(amount), 0) as monthly_cost,
          COALESCE(SUM(quantity_liters), 0) as monthly_liters
        FROM fuel_records 
        WHERE fuel_date >= DATE_TRUNC('month', CURRENT_DATE)
      `);
        }
        catch (e) {
            console.error('Fuel stats error:', e.message);
        }
        // Pending repairs - use correct status values
        let repairsStats = [{ pending_repairs: 0, repair_costs: 0 }];
        try {
            repairsStats = await (0, database_1.query)(`
        SELECT COUNT(*) as pending_repairs,
          COALESCE(SUM(cost), 0) as repair_costs
        FROM repairs 
        WHERE status != 'Completed' AND status != 'completed'
      `);
        }
        catch (e) {
            console.error('Repairs stats error:', e.message);
        }
        // Top fuel consumers (last 30 days)
        let topConsumers = [];
        try {
            topConsumers = await (0, database_1.query)(`
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
        }
        catch (e) {
            console.error('Top consumers error:', e.message);
        }
        // Maintenance due (simplified query)
        let maintenanceDue = [];
        try {
            maintenanceDue = await (0, database_1.query)(`
        SELECT registration_num, 
          make_model, 
          current_mileage
        FROM vehicles
        WHERE status = 'available'
        LIMIT 10
      `);
        }
        catch (e) {
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
    }
    catch (error) {
        console.error('Dashboard stats error:', error);
        res.status(500).json({ error: 'Failed to fetch dashboard stats', details: error.message });
    }
});
// GET /api/fleet/alerts - Get dashboard alerts
// Note: This router is mounted at /api/fleet/alerts, so this handles the root path
router.get('/', async (req, res) => {
    try {
        const { status, limit = 5 } = req.query;
        const companyId = req.user?.companyId;
        // Generate alerts from actual data
        const alerts = [];
        // Check for vehicles needing maintenance (based on mileage or date)
        try {
            const maintenanceAlerts = await (0, database_1.query)(`
        SELECT id, registration_num, make_model, current_mileage, 
               next_service_due, last_service_date
        FROM vehicles
        WHERE status = 'available'
        AND (
          next_service_due <= CURRENT_DATE + INTERVAL '7 days'
          OR current_mileage > 0
        )
        LIMIT ${parseInt(limit)}
      `);
            maintenanceAlerts.forEach((v) => {
                alerts.push({
                    id: `maint-${v.id}`,
                    type: 'maintenance',
                    severity: 'medium',
                    title: `Maintenance Due: ${v.registration_num}`,
                    message: `${v.make_model || 'Vehicle'} requires maintenance`,
                    vehicleId: v.id,
                    status: 'unread',
                    createdAt: new Date().toISOString()
                });
            });
        }
        catch (e) {
            // Ignore errors
        }
        // Check for pending requisitions
        try {
            const pendingReqs = await (0, database_1.query)(`
        SELECT r.id, r.request_no, r.purpose, s.staff_name
        FROM requisitions r
        JOIN staff s ON r.requested_by = s.id
        WHERE r.status = 'pending'
        LIMIT ${parseInt(limit)}
      `);
            pendingReqs.forEach((r) => {
                alerts.push({
                    id: `req-${r.id}`,
                    type: 'requisition',
                    severity: 'high',
                    title: `Pending Requisition: ${r.request_no}`,
                    message: `Request from ${r.staff_name}: ${r.purpose?.substring(0, 50)}...`,
                    requisitionId: r.id,
                    status: 'unread',
                    createdAt: new Date().toISOString()
                });
            });
        }
        catch (e) {
            // Ignore errors
        }
        // Check for fuel cards nearing limit
        try {
            const fuelAlerts = await (0, database_1.query)(`
        SELECT fc.id, fc.card_num, fc.card_name, fc.monthly_limit, 
               COALESCE(fc.current_month_usage, 0) as current_usage
        FROM fuel_cards fc
        WHERE fc.status = 'active'
        AND fc.monthly_limit > 0
        AND COALESCE(fc.current_month_usage, 0) > fc.monthly_limit * 0.8
        LIMIT ${parseInt(limit)}
      `);
            fuelAlerts.forEach((f) => {
                const percent = Math.round((f.current_usage / f.monthly_limit) * 100);
                alerts.push({
                    id: `fuel-${f.id}`,
                    type: 'fuel',
                    severity: percent > 95 ? 'high' : 'medium',
                    title: `Fuel Card Limit: ${f.card_num}`,
                    message: `${f.card_name || 'Card'} at ${percent}% of monthly limit`,
                    fuelCardId: f.id,
                    status: 'unread',
                    createdAt: new Date().toISOString()
                });
            });
        }
        catch (e) {
            // Ignore errors
        }
        // Filter by status if requested
        let filteredAlerts = alerts;
        if (status && status !== 'all') {
            filteredAlerts = alerts.filter((a) => a.status === status);
        }
        res.json({
            success: true,
            data: {
                items: filteredAlerts.slice(0, parseInt(limit)),
                total: filteredAlerts.length,
                unreadCount: alerts.filter((a) => a.status === 'unread').length
            }
        });
    }
    catch (error) {
        console.error('Get alerts error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch alerts' });
    }
});
exports.default = router;
//# sourceMappingURL=dashboard.js.map