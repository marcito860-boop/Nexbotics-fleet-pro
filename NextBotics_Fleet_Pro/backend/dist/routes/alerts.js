"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const Alert_1 = require("../models/Alert");
const auth_1 = require("../utils/auth");
const router = (0, express_1.Router)();
router.use(auth_1.authMiddleware);
// GET /api/fleet/alerts - List all alerts
router.get('/', [
    (0, express_validator_1.query)('page').optional().isInt({ min: 1 }),
    (0, express_validator_1.query)('perPage').optional().isInt({ min: 1, max: 100 }),
    (0, express_validator_1.query)('isRead').optional().isBoolean(),
    (0, express_validator_1.query)('severity').optional().isIn(['info', 'warning', 'critical']),
    (0, express_validator_1.query)('alertType').optional().isIn(['maintenance_due', 'insurance_expiry', 'license_expiry', 'speeding', 'geofence', 'fuel_low', 'diagnostic', 'assignment', 'custom']),
    (0, express_validator_1.query)('vehicleId').optional().isUUID(),
], async (req, res) => {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, error: 'Validation failed', details: errors.array() });
    }
    try {
        const companyId = req.user.companyId;
        const page = parseInt(req.query.page) || 1;
        const perPage = parseInt(req.query.perPage) || 20;
        const isRead = req.query.isRead === 'true' ? true : req.query.isRead === 'false' ? false : undefined;
        const severity = req.query.severity;
        const alertType = req.query.alertType;
        const vehicleId = req.query.vehicleId;
        const { alerts, total, unreadCount } = await Alert_1.AlertModel.findByCompany(companyId, {
            isRead,
            severity,
            alertType,
            vehicleId,
            limit: perPage,
            offset: (page - 1) * perPage,
        });
        res.json({
            success: true,
            data: {
                items: alerts,
                total,
                unreadCount,
                page,
                perPage,
                totalPages: Math.ceil(total / perPage),
            }
        });
    }
    catch (error) {
        console.error('List alerts error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch alerts' });
    }
});
// GET /api/fleet/alerts/stats/unread-count - Frontend compatible endpoint
router.get('/stats/unread-count', async (req, res) => {
    try {
        const companyId = req.user.companyId;
        const { unreadCount } = await Alert_1.AlertModel.findByCompany(companyId, { limit: 0 });
        res.json({ success: true, data: { count: unreadCount } });
    }
    catch (error) {
        console.error('Unread count error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch unread count' });
    }
});
// GET /api/fleet/alerts/unread-count - Get unread alert count (keep for compatibility)
router.get('/unread-count', async (req, res) => {
    try {
        const companyId = req.user.companyId;
        const { unreadCount } = await Alert_1.AlertModel.findByCompany(companyId, { limit: 0 });
        res.json({ success: true, data: { unreadCount } });
    }
    catch (error) {
        console.error('Unread count error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch unread count' });
    }
});
// POST /api/fleet/alerts/generate - Generate system alerts (admin/manager only)
router.post('/generate', [
    (0, auth_1.requireRole)('admin', 'manager'),
], async (req, res) => {
    try {
        const companyId = req.user.companyId;
        await Alert_1.AlertModel.generateMaintenanceAlerts(companyId);
        await Alert_1.AlertModel.generateExpiryAlerts(companyId);
        res.json({ success: true, message: 'Alerts generated successfully' });
    }
    catch (error) {
        console.error('Generate alerts error:', error);
        res.status(500).json({ success: false, error: 'Failed to generate alerts' });
    }
});
// POST /api/fleet/alerts - Create custom alert (admin/manager only)
router.post('/', [
    (0, auth_1.requireRole)('admin', 'manager'),
    (0, express_validator_1.body)('title').trim().notEmpty().withMessage('Title required'),
    (0, express_validator_1.body)('alertType').isIn(['maintenance_due', 'insurance_expiry', 'license_expiry', 'speeding', 'geofence', 'fuel_low', 'diagnostic', 'assignment', 'custom']).withMessage('Valid alert type required'),
    (0, express_validator_1.body)('severity').optional().isIn(['info', 'warning', 'critical']),
    (0, express_validator_1.body)('message').optional().trim(),
    (0, express_validator_1.body)('vehicleId').optional().isUUID(),
    (0, express_validator_1.body)('driverId').optional().isUUID(),
], async (req, res) => {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, error: 'Validation failed', details: errors.array() });
    }
    try {
        const companyId = req.user.companyId;
        const alert = await Alert_1.AlertModel.create(companyId, {
            vehicleId: req.body.vehicleId,
            driverId: req.body.driverId,
            alertType: req.body.alertType,
            severity: req.body.severity || 'info',
            title: req.body.title,
            message: req.body.message,
            data: req.body.data,
        });
        res.status(201).json({ success: true, data: alert, message: 'Alert created successfully' });
    }
    catch (error) {
        console.error('Create alert error:', error);
        res.status(500).json({ success: false, error: 'Failed to create alert' });
    }
});
// POST /api/fleet/alerts/:id/read - Mark alert as read
router.post('/:id/read', [
    (0, express_validator_1.param)('id').isUUID().withMessage('Valid alert ID required'),
], async (req, res) => {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, error: 'Validation failed', details: errors.array() });
    }
    try {
        const companyId = req.user.companyId;
        const userId = req.user.userId;
        await Alert_1.AlertModel.markAsRead(req.params.id, companyId, userId);
        res.json({ success: true, message: 'Alert marked as read' });
    }
    catch (error) {
        console.error('Mark read error:', error);
        res.status(500).json({ success: false, error: 'Failed to mark alert as read' });
    }
});
// POST /api/fleet/alerts/read-all - Mark all alerts as read
router.post('/read-all', async (req, res) => {
    try {
        const companyId = req.user.companyId;
        const userId = req.user.userId;
        await Alert_1.AlertModel.markAllAsRead(companyId, userId);
        res.json({ success: true, message: 'All alerts marked as read' });
    }
    catch (error) {
        console.error('Mark all read error:', error);
        res.status(500).json({ success: false, error: 'Failed to mark alerts as read' });
    }
});
// POST /api/fleet/alerts/:id/dismiss - Dismiss alert
router.post('/:id/dismiss', [
    (0, express_validator_1.param)('id').isUUID().withMessage('Valid alert ID required'),
], async (req, res) => {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, error: 'Validation failed', details: errors.array() });
    }
    try {
        const companyId = req.user.companyId;
        const userId = req.user.userId;
        await Alert_1.AlertModel.dismiss(req.params.id, companyId, userId);
        res.json({ success: true, message: 'Alert dismissed' });
    }
    catch (error) {
        console.error('Dismiss alert error:', error);
        res.status(500).json({ success: false, error: 'Failed to dismiss alert' });
    }
});
// DELETE /api/fleet/alerts/:id - Delete alert (admin only)
router.delete('/:id', [
    (0, auth_1.requireRole)('admin'),
    (0, express_validator_1.param)('id').isUUID().withMessage('Valid alert ID required'),
], async (req, res) => {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, error: 'Validation failed', details: errors.array() });
    }
    try {
        const companyId = req.user.companyId;
        const deleted = await Alert_1.AlertModel.delete(req.params.id, companyId);
        if (!deleted) {
            return res.status(404).json({ success: false, error: 'Alert not found' });
        }
        res.json({ success: true, message: 'Alert deleted successfully' });
    }
    catch (error) {
        console.error('Delete alert error:', error);
        res.status(500).json({ success: false, error: 'Failed to delete alert' });
    }
});
exports.default = router;
//# sourceMappingURL=alerts.js.map