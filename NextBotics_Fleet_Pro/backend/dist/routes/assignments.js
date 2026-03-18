"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const Assignment_1 = require("../models/Assignment");
const Vehicle_1 = require("../models/Vehicle");
const auth_1 = require("../utils/auth");
const router = (0, express_1.Router)();
router.use(auth_1.authMiddleware);
// GET /api/fleet/assignments - List all assignments
router.get('/assignments', [
    (0, express_validator_1.query)('page').optional().isInt({ min: 1 }),
    (0, express_validator_1.query)('perPage').optional().isInt({ min: 1, max: 100 }),
    (0, express_validator_1.query)('status').optional().isIn(['active', 'completed', 'cancelled']),
    (0, express_validator_1.query)('vehicleId').optional().isUUID(),
    (0, express_validator_1.query)('driverId').optional().isUUID(),
    (0, express_validator_1.query)('activeOnly').optional().isBoolean(),
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
        const vehicleId = req.query.vehicleId;
        const driverId = req.query.driverId;
        const activeOnly = req.query.activeOnly === 'true';
        const { assignments, total } = await Assignment_1.AssignmentModel.findByCompany(companyId, {
            status,
            vehicleId,
            driverId,
            activeOnly,
            limit: perPage,
            offset: (page - 1) * perPage,
        });
        res.json({
            success: true,
            data: {
                items: assignments,
                total,
                page,
                perPage,
                totalPages: Math.ceil(total / perPage),
            }
        });
    }
    catch (error) {
        console.error('List assignments error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch assignments' });
    }
});
// GET /api/fleet/assignments/:id - Get assignment by ID
router.get('/assignments/:id', [
    (0, express_validator_1.param)('id').isUUID().withMessage('Valid assignment ID required'),
], async (req, res) => {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, error: 'Validation failed', details: errors.array() });
    }
    try {
        const companyId = req.user.companyId;
        const assignment = await Assignment_1.AssignmentModel.findById(req.params.id, companyId);
        if (!assignment) {
            return res.status(404).json({ success: false, error: 'Assignment not found' });
        }
        res.json({ success: true, data: assignment });
    }
    catch (error) {
        console.error('Get assignment error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch assignment' });
    }
});
// POST /api/fleet/assignments - Create new assignment (admin/manager only)
router.post('/assignments', [
    (0, auth_1.requireRole)('admin', 'manager'),
    (0, express_validator_1.body)('vehicleId').isUUID().withMessage('Valid vehicle ID required'),
    (0, express_validator_1.body)('driverId').isUUID().withMessage('Valid driver ID required'),
    (0, express_validator_1.body)('startDate').isISO8601().withMessage('Valid start date required'),
    (0, express_validator_1.body)('endDate').optional().isISO8601(),
    (0, express_validator_1.body)('purpose').optional().trim(),
], async (req, res) => {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, error: 'Validation failed', details: errors.array() });
    }
    try {
        const companyId = req.user.companyId;
        const assignedBy = req.user.userId;
        // Check if vehicle exists and is available
        const vehicle = await Vehicle_1.VehicleModel.findById(req.body.vehicleId, companyId);
        if (!vehicle) {
            return res.status(404).json({ success: false, error: 'Vehicle not found' });
        }
        if (vehicle.status !== 'available') {
            return res.status(400).json({ success: false, error: 'Vehicle is not available for assignment' });
        }
        // Check for existing active assignment
        const existingAssignment = await Assignment_1.AssignmentModel.getActiveAssignmentForVehicle(req.body.vehicleId, companyId);
        if (existingAssignment) {
            return res.status(400).json({ success: false, error: 'Vehicle already has an active assignment' });
        }
        const assignment = await Assignment_1.AssignmentModel.create(companyId, assignedBy, {
            vehicleId: req.body.vehicleId,
            driverId: req.body.driverId,
            startDate: new Date(req.body.startDate),
            endDate: req.body.endDate ? new Date(req.body.endDate) : undefined,
            purpose: req.body.purpose,
        });
        res.status(201).json({ success: true, data: assignment, message: 'Assignment created successfully' });
    }
    catch (error) {
        console.error('Create assignment error:', error);
        res.status(500).json({ success: false, error: 'Failed to create assignment' });
    }
});
// POST /api/fleet/assignments/:id/complete - Complete an assignment
router.post('/assignments/:id/complete', [
    (0, express_validator_1.param)('id').isUUID().withMessage('Valid assignment ID required'),
], async (req, res) => {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, error: 'Validation failed', details: errors.array() });
    }
    try {
        const companyId = req.user.companyId;
        const assignment = await Assignment_1.AssignmentModel.complete(req.params.id, companyId);
        if (!assignment) {
            return res.status(404).json({ success: false, error: 'Assignment not found' });
        }
        res.json({ success: true, data: assignment, message: 'Assignment completed successfully' });
    }
    catch (error) {
        console.error('Complete assignment error:', error);
        res.status(500).json({ success: false, error: 'Failed to complete assignment' });
    }
});
// POST /api/fleet/assignments/:id/cancel - Cancel an assignment (admin/manager only)
router.post('/assignments/:id/cancel', [
    (0, auth_1.requireRole)('admin', 'manager'),
    (0, express_validator_1.param)('id').isUUID().withMessage('Valid assignment ID required'),
], async (req, res) => {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, error: 'Validation failed', details: errors.array() });
    }
    try {
        const companyId = req.user.companyId;
        const assignment = await Assignment_1.AssignmentModel.cancel(req.params.id, companyId);
        if (!assignment) {
            return res.status(404).json({ success: false, error: 'Assignment not found' });
        }
        res.json({ success: true, data: assignment, message: 'Assignment cancelled successfully' });
    }
    catch (error) {
        console.error('Cancel assignment error:', error);
        res.status(500).json({ success: false, error: 'Failed to cancel assignment' });
    }
});
exports.default = router;
//# sourceMappingURL=assignments.js.map