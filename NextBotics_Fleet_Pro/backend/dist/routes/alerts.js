"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const database_1 = require("../database");
const router = (0, express_1.Router)();
// GET /api/fleet/alerts - Get dashboard alerts
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
//# sourceMappingURL=alerts.js.map