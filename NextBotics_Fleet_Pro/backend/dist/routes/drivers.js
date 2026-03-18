"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const Driver_1 = require("../models/Driver");
const auth_1 = require("../utils/auth");
const router = (0, express_1.Router)();
router.use(auth_1.authMiddleware);
// GET /api/fleet/drivers - List all drivers
router.get('/', [
    (0, express_validator_1.query)('page').optional().isInt({ min: 1 }),
    (0, express_validator_1.query)('perPage').optional().isInt({ min: 1, max: 100 }),
    (0, express_validator_1.query)('status').optional().isIn(['active', 'inactive', 'suspended', 'terminated']),
    (0, express_validator_1.query)('search').optional().trim(),
], async (req, res) => {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, error: 'Validation failed', details: errors.array() });
    }
    try {
        const companyId = req.user.companyId;
        const page = parseInt(req.query.page) || 1;
        const perPage = parseInt(req.query.perPage) || 20;
        const status = req.query.status;
        const search = req.query.search;
        const { drivers, total } = await Driver_1.DriverModel.findByCompany(companyId, {
            status,
            search,
            limit: perPage,
            offset: (page - 1) * perPage,
        });
        res.json({
            success: true,
            data: {
                items: drivers,
                total,
                page,
                perPage,
                totalPages: Math.ceil(total / perPage),
            }
        });
    }
    catch (error) {
        console.error('List drivers error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch drivers' });
    }
});
// GET /api/fleet/drivers/stats/overview - Frontend compatible endpoint
router.get('/stats/overview', async (req, res) => {
    try {
        const companyId = req.user.companyId;
        const stats = await Driver_1.DriverModel.getStats(companyId);
        res.json({
            success: true,
            data: {
                total: stats.total || 0,
                active: stats.active || 0,
                available: stats.active || 0, // Map active to available for frontend
                onLeave: stats.inactive || 0, // Map inactive to onLeave for frontend
                suspended: stats.suspended || 0,
            }
        });
    }
    catch (error) {
        console.error('Driver stats error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch driver stats' });
    }
});
// GET /api/fleet/drivers/stats - Get driver statistics
router.get('/stats', async (req, res) => {
    try {
        const companyId = req.user.companyId;
        const stats = await Driver_1.DriverModel.getStats(companyId);
        res.json({ success: true, data: stats });
    }
    catch (error) {
        console.error('Driver stats error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch driver stats' });
    }
});
// GET /api/fleet/drivers/:id - Get driver by ID
router.get('/:id', [
    (0, express_validator_1.param)('id').isUUID().withMessage('Valid driver ID required'),
], async (req, res) => {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, error: 'Validation failed', details: errors.array() });
    }
    try {
        const companyId = req.user.companyId;
        const driver = await Driver_1.DriverModel.findById(req.params.id, companyId);
        if (!driver) {
            return res.status(404).json({ success: false, error: 'Driver not found' });
        }
        res.json({ success: true, data: driver });
    }
    catch (error) {
        console.error('Get driver error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch driver' });
    }
});
// POST /api/fleet/drivers - Create new driver (admin/manager only)
router.post('/', [
    (0, auth_1.requireRole)('admin', 'manager'),
    (0, express_validator_1.body)('firstName').trim().notEmpty().withMessage('First name required'),
    (0, express_validator_1.body)('lastName').trim().notEmpty().withMessage('Last name required'),
    (0, express_validator_1.body)('email').optional().isEmail().normalizeEmail(),
    (0, express_validator_1.body)('licenseExpiry').optional().isISO8601(),
    (0, express_validator_1.body)('dateOfBirth').optional().isISO8601(),
    (0, express_validator_1.body)('hireDate').optional().isISO8601(),
], async (req, res) => {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, error: 'Validation failed', details: errors.array() });
    }
    try {
        const companyId = req.user.companyId;
        const driver = await Driver_1.DriverModel.create(companyId, {
            firstName: req.body.firstName,
            lastName: req.body.lastName,
            email: req.body.email,
            phone: req.body.phone,
            licenseNumber: req.body.licenseNumber,
            licenseExpiry: req.body.licenseExpiry ? new Date(req.body.licenseExpiry) : undefined,
            licenseClass: req.body.licenseClass,
            dateOfBirth: req.body.dateOfBirth ? new Date(req.body.dateOfBirth) : undefined,
            emergencyContactName: req.body.emergencyContactName,
            emergencyContactPhone: req.body.emergencyContactPhone,
            address: req.body.address,
            hireDate: req.body.hireDate ? new Date(req.body.hireDate) : undefined,
            notes: req.body.notes,
        }, req.body.userId);
        res.status(201).json({ success: true, data: driver, message: 'Driver created successfully' });
    }
    catch (error) {
        console.error('Create driver error:', error);
        res.status(500).json({ success: false, error: 'Failed to create driver' });
    }
});
// PUT /api/fleet/drivers/:id - Update driver
router.put('/:id', [
    (0, express_validator_1.param)('id').isUUID().withMessage('Valid driver ID required'),
    (0, express_validator_1.body)('email').optional().isEmail().normalizeEmail(),
    (0, express_validator_1.body)('status').optional().isIn(['active', 'inactive', 'suspended', 'terminated']),
], async (req, res) => {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, error: 'Validation failed', details: errors.array() });
    }
    try {
        const companyId = req.user.companyId;
        const driver = await Driver_1.DriverModel.update(req.params.id, companyId, {
            firstName: req.body.firstName,
            lastName: req.body.lastName,
            email: req.body.email,
            phone: req.body.phone,
            licenseNumber: req.body.licenseNumber,
            licenseExpiry: req.body.licenseExpiry ? new Date(req.body.licenseExpiry) : undefined,
            licenseClass: req.body.licenseClass,
            emergencyContactName: req.body.emergencyContactName,
            emergencyContactPhone: req.body.emergencyContactPhone,
            address: req.body.address,
            status: req.body.status,
            notes: req.body.notes,
        });
        if (!driver) {
            return res.status(404).json({ success: false, error: 'Driver not found' });
        }
        res.json({ success: true, data: driver });
    }
    catch (error) {
        console.error('Update driver error:', error);
        res.status(500).json({ success: false, error: 'Failed to update driver' });
    }
});
// DELETE /api/fleet/drivers/:id - Delete driver (admin only)
router.delete('/:id', [
    (0, auth_1.requireRole)('admin'),
    (0, express_validator_1.param)('id').isUUID().withMessage('Valid driver ID required'),
], async (req, res) => {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, error: 'Validation failed', details: errors.array() });
    }
    try {
        const companyId = req.user.companyId;
        const deleted = await Driver_1.DriverModel.delete(req.params.id, companyId);
        if (!deleted) {
            return res.status(404).json({ success: false, error: 'Driver not found' });
        }
        res.json({ success: true, message: 'Driver deleted successfully' });
    }
    catch (error) {
        console.error('Delete driver error:', error);
        res.status(500).json({ success: false, error: 'Failed to delete driver' });
    }
});
exports.default = router;
//# sourceMappingURL=drivers.js.map