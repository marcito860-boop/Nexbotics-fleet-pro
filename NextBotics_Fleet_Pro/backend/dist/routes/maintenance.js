"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const auth_1 = require("../utils/auth");
const database_1 = require("../database");
const Maintenance_1 = require("../models/Maintenance");
const router = (0, express_1.Router)();
router.use(auth_1.authMiddleware);
// ==================== SERVICE PROVIDERS ====================
// GET /api/fleet/maintenance/providers - List all service providers
router.get('/providers', [
    (0, express_validator_1.query)('page').optional().isInt({ min: 1 }),
    (0, express_validator_1.query)('perPage').optional().isInt({ min: 1, max: 100 }),
    (0, express_validator_1.query)('type').optional().isIn(['general', 'specialist', 'dealership', 'emergency']),
    (0, express_validator_1.query)('isApproved').optional().isBoolean(),
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
        const type = req.query.type;
        const isApproved = req.query.isApproved !== undefined ? req.query.isApproved === 'true' : undefined;
        const search = req.query.search;
        const { providers, total } = await Maintenance_1.ServiceProviderModel.findByCompany(companyId, {
            type,
            isApproved,
            search,
            limit: perPage,
            offset: (page - 1) * perPage,
        });
        res.json({
            success: true,
            data: {
                items: providers,
                total,
                page,
                perPage,
                totalPages: Math.ceil(total / perPage),
            }
        });
    }
    catch (error) {
        console.error('List providers error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch service providers' });
    }
});
// GET /api/fleet/maintenance/providers/:id - Get provider by ID
router.get('/providers/:id', [
    (0, express_validator_1.param)('id').isUUID().withMessage('Valid provider ID required'),
], async (req, res) => {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, error: 'Validation failed', details: errors.array() });
    }
    try {
        const companyId = req.user.companyId;
        const provider = await Maintenance_1.ServiceProviderModel.findById(req.params.id, companyId);
        if (!provider) {
            return res.status(404).json({ success: false, error: 'Service provider not found' });
        }
        res.json({ success: true, data: provider });
    }
    catch (error) {
        console.error('Get provider error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch service provider' });
    }
});
// POST /api/fleet/maintenance/providers - Create new provider
router.post('/providers', [
    (0, auth_1.requireRole)('admin', 'manager'),
    (0, express_validator_1.body)('name').trim().notEmpty().withMessage('Provider name required'),
    (0, express_validator_1.body)('type').optional().isIn(['general', 'specialist', 'dealership', 'emergency']),
    (0, express_validator_1.body)('email').optional().isEmail().withMessage('Valid email required'),
    (0, express_validator_1.body)('phone').optional().trim(),
], async (req, res) => {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, error: 'Validation failed', details: errors.array() });
    }
    try {
        const companyId = req.user.companyId;
        const provider = await Maintenance_1.ServiceProviderModel.create(companyId, {
            name: req.body.name,
            type: req.body.type,
            contactPerson: req.body.contactPerson,
            phone: req.body.phone,
            email: req.body.email,
            address: req.body.address,
            city: req.body.city,
            country: req.body.country,
            taxId: req.body.taxId,
            bankAccount: req.body.bankAccount,
            specialties: req.body.specialties,
            workingHours: req.body.workingHours,
            notes: req.body.notes,
        });
        res.status(201).json({ success: true, data: provider, message: 'Service provider created successfully' });
    }
    catch (error) {
        console.error('Create provider error:', error);
        res.status(500).json({ success: false, error: 'Failed to create service provider' });
    }
});
// PUT /api/fleet/maintenance/providers/:id - Update provider
router.put('/providers/:id', [
    (0, auth_1.requireRole)('admin', 'manager'),
    (0, express_validator_1.param)('id').isUUID().withMessage('Valid provider ID required'),
], async (req, res) => {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, error: 'Validation failed', details: errors.array() });
    }
    try {
        const companyId = req.user.companyId;
        const provider = await Maintenance_1.ServiceProviderModel.update(req.params.id, companyId, {
            name: req.body.name,
            type: req.body.type,
            contactPerson: req.body.contactPerson,
            phone: req.body.phone,
            email: req.body.email,
            address: req.body.address,
            city: req.body.city,
            country: req.body.country,
            taxId: req.body.taxId,
            bankAccount: req.body.bankAccount,
            specialties: req.body.specialties,
            workingHours: req.body.workingHours,
            notes: req.body.notes,
        });
        if (!provider) {
            return res.status(404).json({ success: false, error: 'Service provider not found' });
        }
        res.json({ success: true, data: provider });
    }
    catch (error) {
        console.error('Update provider error:', error);
        res.status(500).json({ success: false, error: 'Failed to update service provider' });
    }
});
// DELETE /api/fleet/maintenance/providers/:id - Delete provider
router.delete('/providers/:id', [
    (0, auth_1.requireRole)('admin'),
    (0, express_validator_1.param)('id').isUUID().withMessage('Valid provider ID required'),
], async (req, res) => {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, error: 'Validation failed', details: errors.array() });
    }
    try {
        const companyId = req.user.companyId;
        const deleted = await Maintenance_1.ServiceProviderModel.delete(req.params.id, companyId);
        if (!deleted) {
            return res.status(404).json({ success: false, error: 'Service provider not found' });
        }
        res.json({ success: true, message: 'Service provider deleted successfully' });
    }
    catch (error) {
        console.error('Delete provider error:', error);
        res.status(500).json({ success: false, error: 'Failed to delete service provider' });
    }
});
// ==================== SPARE PARTS ====================
// GET /api/fleet/maintenance/parts - List all spare parts
router.get('/parts', [
    (0, express_validator_1.query)('page').optional().isInt({ min: 1 }),
    (0, express_validator_1.query)('perPage').optional().isInt({ min: 1, max: 100 }),
    (0, express_validator_1.query)('category').optional().trim(),
    (0, express_validator_1.query)('lowStockOnly').optional().isBoolean(),
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
        const category = req.query.category;
        const lowStockOnly = req.query.lowStockOnly === 'true';
        const search = req.query.search;
        const { parts, total } = await Maintenance_1.SparePartModel.findByCompany(companyId, {
            category,
            lowStockOnly,
            search,
            limit: perPage,
            offset: (page - 1) * perPage,
        });
        res.json({
            success: true,
            data: {
                items: parts,
                total,
                page,
                perPage,
                totalPages: Math.ceil(total / perPage),
            }
        });
    }
    catch (error) {
        console.error('List parts error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch spare parts' });
    }
});
// GET /api/fleet/maintenance/parts/low-stock - Get low stock items
router.get('/parts/low-stock', async (req, res) => {
    try {
        const companyId = req.user.companyId;
        const { parts, total } = await Maintenance_1.SparePartModel.findByCompany(companyId, { lowStockOnly: true });
        res.json({ success: true, data: { items: parts, total } });
    }
    catch (error) {
        console.error('Low stock error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch low stock items' });
    }
});
// POST /api/fleet/maintenance/parts - Create new part
router.post('/parts', [
    (0, auth_1.requireRole)('admin', 'manager'),
    (0, express_validator_1.body)('partNumber').trim().notEmpty().withMessage('Part number required'),
    (0, express_validator_1.body)('name').trim().notEmpty().withMessage('Part name required'),
    (0, express_validator_1.body)('category').trim().notEmpty().withMessage('Category required'),
], async (req, res) => {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, error: 'Validation failed', details: errors.array() });
    }
    try {
        const companyId = req.user.companyId;
        // Check for duplicate part number
        const existing = await Maintenance_1.SparePartModel.findByPartNumber(req.body.partNumber, companyId);
        if (existing) {
            return res.status(409).json({ success: false, error: 'Part with this number already exists' });
        }
        const part = await Maintenance_1.SparePartModel.create(companyId, {
            partNumber: req.body.partNumber,
            name: req.body.name,
            description: req.body.description,
            category: req.body.category,
            manufacturer: req.body.manufacturer,
            compatibleVehicles: req.body.compatibleVehicles,
            unitCost: req.body.unitCost,
            sellingPrice: req.body.sellingPrice,
            quantityInStock: req.body.quantityInStock,
            reorderLevel: req.body.reorderLevel,
            reorderQuantity: req.body.reorderQuantity,
            unitOfMeasure: req.body.unitOfMeasure,
            locationCode: req.body.locationCode,
            supplierId: req.body.supplierId,
            leadTimeDays: req.body.leadTimeDays,
        });
        res.status(201).json({ success: true, data: part, message: 'Spare part created successfully' });
    }
    catch (error) {
        console.error('Create part error:', error);
        res.status(500).json({ success: false, error: 'Failed to create spare part' });
    }
});
// PUT /api/fleet/maintenance/parts/:id - Update part
router.put('/parts/:id', [
    (0, auth_1.requireRole)('admin', 'manager'),
    (0, express_validator_1.param)('id').isUUID().withMessage('Valid part ID required'),
], async (req, res) => {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, error: 'Validation failed', details: errors.array() });
    }
    try {
        const companyId = req.user.companyId;
        const part = await Maintenance_1.SparePartModel.update(req.params.id, companyId, {
            partNumber: req.body.partNumber,
            name: req.body.name,
            description: req.body.description,
            category: req.body.category,
            manufacturer: req.body.manufacturer,
            compatibleVehicles: req.body.compatibleVehicles,
            unitCost: req.body.unitCost,
            sellingPrice: req.body.sellingPrice,
            reorderLevel: req.body.reorderLevel,
            reorderQuantity: req.body.reorderQuantity,
            unitOfMeasure: req.body.unitOfMeasure,
            locationCode: req.body.locationCode,
            supplierId: req.body.supplierId,
            leadTimeDays: req.body.leadTimeDays,
        });
        if (!part) {
            return res.status(404).json({ success: false, error: 'Spare part not found' });
        }
        res.json({ success: true, data: part });
    }
    catch (error) {
        console.error('Update part error:', error);
        res.status(500).json({ success: false, error: 'Failed to update spare part' });
    }
});
// POST /api/fleet/maintenance/parts/:id/adjust-stock - Adjust stock quantity
router.post('/parts/:id/adjust-stock', [
    (0, auth_1.requireRole)('admin', 'manager'),
    (0, express_validator_1.param)('id').isUUID().withMessage('Valid part ID required'),
    (0, express_validator_1.body)('quantity').isInt().withMessage('Quantity must be an integer'),
    (0, express_validator_1.body)('reason').optional().trim(),
], async (req, res) => {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, error: 'Validation failed', details: errors.array() });
    }
    try {
        const companyId = req.user.companyId;
        const part = await Maintenance_1.SparePartModel.adjustStock(req.params.id, companyId, req.body.quantity, req.body.reason);
        if (!part) {
            return res.status(404).json({ success: false, error: 'Spare part not found' });
        }
        res.json({ success: true, data: part, message: 'Stock adjusted successfully' });
    }
    catch (error) {
        console.error('Adjust stock error:', error);
        res.status(500).json({ success: false, error: 'Failed to adjust stock' });
    }
});
// DELETE /api/fleet/maintenance/parts/:id - Delete part
router.delete('/parts/:id', [
    (0, auth_1.requireRole)('admin'),
    (0, express_validator_1.param)('id').isUUID().withMessage('Valid part ID required'),
], async (req, res) => {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, error: 'Validation failed', details: errors.array() });
    }
    try {
        const companyId = req.user.companyId;
        const deleted = await Maintenance_1.SparePartModel.delete(req.params.id, companyId);
        if (!deleted) {
            return res.status(404).json({ success: false, error: 'Spare part not found' });
        }
        res.json({ success: true, message: 'Spare part deleted successfully' });
    }
    catch (error) {
        console.error('Delete part error:', error);
        res.status(500).json({ success: false, error: 'Failed to delete spare part' });
    }
});
// ==================== MAINTENANCE SCHEDULES ====================
// GET /api/fleet/maintenance/schedules - List all schedules
router.get('/schedules', [
    (0, express_validator_1.query)('page').optional().isInt({ min: 1 }),
    (0, express_validator_1.query)('perPage').optional().isInt({ min: 1, max: 100 }),
    (0, express_validator_1.query)('vehicleId').optional().isUUID(),
    (0, express_validator_1.query)('status').optional().isIn(['active', 'paused', 'completed', 'cancelled']),
    (0, express_validator_1.query)('upcoming').optional().isBoolean(),
    (0, express_validator_1.query)('overdue').optional().isBoolean(),
], async (req, res) => {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, error: 'Validation failed', details: errors.array() });
    }
    try {
        const companyId = req.user.companyId;
        const page = parseInt(req.query.page) || 1;
        const perPage = parseInt(req.query.perPage) || 20;
        const vehicleId = req.query.vehicleId;
        const status = req.query.status;
        const upcoming = req.query.upcoming === 'true';
        const overdue = req.query.overdue === 'true';
        const { schedules, total } = await Maintenance_1.MaintenanceScheduleModel.findByCompany(companyId, {
            vehicleId,
            status,
            upcoming,
            overdue,
            limit: perPage,
            offset: (page - 1) * perPage,
        });
        res.json({
            success: true,
            data: {
                items: schedules,
                total,
                page,
                perPage,
                totalPages: Math.ceil(total / perPage),
            }
        });
    }
    catch (error) {
        console.error('List schedules error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch maintenance schedules' });
    }
});
// GET /api/fleet/maintenance/schedules/stats - Get schedule statistics
router.get('/schedules/stats', async (req, res) => {
    try {
        const companyId = req.user.companyId;
        const stats = await Maintenance_1.MaintenanceScheduleModel.getStats(companyId);
        res.json({ success: true, data: stats });
    }
    catch (error) {
        console.error('Schedule stats error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch schedule statistics' });
    }
});
// GET /api/fleet/maintenance/schedules/:id - Get schedule by ID
router.get('/schedules/:id', [
    (0, express_validator_1.param)('id').isUUID().withMessage('Valid schedule ID required'),
], async (req, res) => {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, error: 'Validation failed', details: errors.array() });
    }
    try {
        const companyId = req.user.companyId;
        const schedule = await Maintenance_1.MaintenanceScheduleModel.findById(req.params.id, companyId);
        if (!schedule) {
            return res.status(404).json({ success: false, error: 'Maintenance schedule not found' });
        }
        res.json({ success: true, data: schedule });
    }
    catch (error) {
        console.error('Get schedule error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch maintenance schedule' });
    }
});
// POST /api/fleet/maintenance/schedules - Create new schedule
router.post('/schedules', [
    (0, auth_1.requireRole)('admin', 'manager'),
    (0, express_validator_1.body)('vehicleId').isUUID().withMessage('Valid vehicle ID required'),
    (0, express_validator_1.body)('scheduleType').isIn(['mileage_based', 'time_based', 'both']).withMessage('Valid schedule type required'),
    (0, express_validator_1.body)('serviceType').trim().notEmpty().withMessage('Service type required'),
    (0, express_validator_1.body)('title').trim().notEmpty().withMessage('Title required'),
], async (req, res) => {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, error: 'Validation failed', details: errors.array() });
    }
    try {
        const companyId = req.user.companyId;
        const schedule = await Maintenance_1.MaintenanceScheduleModel.create(companyId, {
            vehicleId: req.body.vehicleId,
            scheduleType: req.body.scheduleType,
            serviceType: req.body.serviceType,
            title: req.body.title,
            description: req.body.description,
            intervalMileage: req.body.intervalMileage,
            lastServiceMileage: req.body.lastServiceMileage,
            intervalMonths: req.body.intervalMonths,
            lastServiceDate: req.body.lastServiceDate ? new Date(req.body.lastServiceDate) : undefined,
            estimatedCost: req.body.estimatedCost,
            estimatedDurationHours: req.body.estimatedDurationHours,
            assignedProviderId: req.body.assignedProviderId,
            reminderDaysBefore: req.body.reminderDaysBefore,
            reminderMileageBefore: req.body.reminderMileageBefore,
            priority: req.body.priority,
        });
        res.status(201).json({ success: true, data: schedule, message: 'Maintenance schedule created successfully' });
    }
    catch (error) {
        console.error('Create schedule error:', error);
        res.status(500).json({ success: false, error: 'Failed to create maintenance schedule' });
    }
});
// PUT /api/fleet/maintenance/schedules/:id - Update schedule
router.put('/schedules/:id', [
    (0, auth_1.requireRole)('admin', 'manager'),
    (0, express_validator_1.param)('id').isUUID().withMessage('Valid schedule ID required'),
], async (req, res) => {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, error: 'Validation failed', details: errors.array() });
    }
    try {
        const companyId = req.user.companyId;
        const schedule = await Maintenance_1.MaintenanceScheduleModel.update(req.params.id, companyId, {
            scheduleType: req.body.scheduleType,
            serviceType: req.body.serviceType,
            title: req.body.title,
            description: req.body.description,
            intervalMileage: req.body.intervalMileage,
            lastServiceMileage: req.body.lastServiceMileage,
            intervalMonths: req.body.intervalMonths,
            lastServiceDate: req.body.lastServiceDate ? new Date(req.body.lastServiceDate) : undefined,
            estimatedCost: req.body.estimatedCost,
            estimatedDurationHours: req.body.estimatedDurationHours,
            assignedProviderId: req.body.assignedProviderId,
            reminderDaysBefore: req.body.reminderDaysBefore,
            reminderMileageBefore: req.body.reminderMileageBefore,
            priority: req.body.priority,
            status: req.body.status,
        });
        if (!schedule) {
            return res.status(404).json({ success: false, error: 'Maintenance schedule not found' });
        }
        res.json({ success: true, data: schedule });
    }
    catch (error) {
        console.error('Update schedule error:', error);
        res.status(500).json({ success: false, error: 'Failed to update maintenance schedule' });
    }
});
// DELETE /api/fleet/maintenance/schedules/:id - Delete schedule
router.delete('/schedules/:id', [
    (0, auth_1.requireRole)('admin', 'manager'),
    (0, express_validator_1.param)('id').isUUID().withMessage('Valid schedule ID required'),
], async (req, res) => {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, error: 'Validation failed', details: errors.array() });
    }
    try {
        const companyId = req.user.companyId;
        const deleted = await Maintenance_1.MaintenanceScheduleModel.delete(req.params.id, companyId);
        if (!deleted) {
            return res.status(404).json({ success: false, error: 'Maintenance schedule not found' });
        }
        res.json({ success: true, message: 'Maintenance schedule deleted successfully' });
    }
    catch (error) {
        console.error('Delete schedule error:', error);
        res.status(500).json({ success: false, error: 'Failed to delete maintenance schedule' });
    }
});
// ==================== MAINTENANCE RECORDS ====================
// GET /api/fleet/maintenance/records - List all records
router.get('/records', [
    (0, express_validator_1.query)('page').optional().isInt({ min: 1 }),
    (0, express_validator_1.query)('perPage').optional().isInt({ min: 1, max: 100 }),
    (0, express_validator_1.query)('vehicleId').optional().isUUID(),
    (0, express_validator_1.query)('status').optional().isIn(['scheduled', 'in_progress', 'completed', 'cancelled']),
    (0, express_validator_1.query)('serviceType').optional().isIn(['preventive', 'repair', 'breakdown', 'emergency']),
    (0, express_validator_1.query)('category').optional().trim(),
], async (req, res) => {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, error: 'Validation failed', details: errors.array() });
    }
    try {
        const companyId = req.user.companyId;
        const page = parseInt(req.query.page) || 1;
        const perPage = parseInt(req.query.perPage) || 20;
        const vehicleId = req.query.vehicleId;
        const status = req.query.status;
        const serviceType = req.query.serviceType;
        const category = req.query.category;
        const { records, total } = await Maintenance_1.MaintenanceRecordModel.findByCompany(companyId, {
            vehicleId,
            status,
            serviceType,
            category,
            limit: perPage,
            offset: (page - 1) * perPage,
        });
        res.json({
            success: true,
            data: {
                items: records,
                total,
                page,
                perPage,
                totalPages: Math.ceil(total / perPage),
            }
        });
    }
    catch (error) {
        console.error('List records error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch maintenance records' });
    }
});
// GET /api/fleet/maintenance/records/stats - Get record statistics
router.get('/records/stats', [
    (0, express_validator_1.query)('dateFrom').optional().isISO8601(),
    (0, express_validator_1.query)('dateTo').optional().isISO8601(),
], async (req, res) => {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, error: 'Validation failed', details: errors.array() });
    }
    try {
        const companyId = req.user.companyId;
        const dateFrom = req.query.dateFrom ? new Date(req.query.dateFrom) : undefined;
        const dateTo = req.query.dateTo ? new Date(req.query.dateTo) : undefined;
        const stats = await Maintenance_1.MaintenanceRecordModel.getStats(companyId, dateFrom, dateTo);
        res.json({ success: true, data: stats });
    }
    catch (error) {
        console.error('Record stats error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch record statistics' });
    }
});
// GET /api/fleet/maintenance/records/:id - Get record by ID
router.get('/records/:id', [
    (0, express_validator_1.param)('id').isUUID().withMessage('Valid record ID required'),
], async (req, res) => {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, error: 'Validation failed', details: errors.array() });
    }
    try {
        const companyId = req.user.companyId;
        const record = await Maintenance_1.MaintenanceRecordModel.findById(req.params.id, companyId);
        if (!record) {
            return res.status(404).json({ success: false, error: 'Maintenance record not found' });
        }
        res.json({ success: true, data: record });
    }
    catch (error) {
        console.error('Get record error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch maintenance record' });
    }
});
// POST /api/fleet/maintenance/records - Create new record
router.post('/records', [
    (0, auth_1.requireRole)('admin', 'manager'),
    (0, express_validator_1.body)('vehicleId').isUUID().withMessage('Valid vehicle ID required'),
    (0, express_validator_1.body)('serviceType').isIn(['preventive', 'repair', 'breakdown', 'emergency']).withMessage('Valid service type required'),
    (0, express_validator_1.body)('category').trim().notEmpty().withMessage('Category required'),
    (0, express_validator_1.body)('title').trim().notEmpty().withMessage('Title required'),
], async (req, res) => {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, error: 'Validation failed', details: errors.array() });
    }
    try {
        const companyId = req.user.companyId;
        const record = await Maintenance_1.MaintenanceRecordModel.create(companyId, {
            vehicleId: req.body.vehicleId,
            scheduleId: req.body.scheduleId,
            serviceType: req.body.serviceType,
            category: req.body.category,
            title: req.body.title,
            description: req.body.description,
            providerId: req.body.providerId,
            providerName: req.body.providerName,
            scheduledDate: req.body.scheduledDate ? new Date(req.body.scheduledDate) : undefined,
            startedDate: req.body.startedDate ? new Date(req.body.startedDate) : undefined,
            completedDate: req.body.completedDate ? new Date(req.body.completedDate) : undefined,
            serviceMileage: req.body.serviceMileage,
            nextServiceMileage: req.body.nextServiceMileage,
            laborCost: req.body.laborCost,
            partsCost: req.body.partsCost,
            otherCost: req.body.otherCost,
            status: req.body.status,
            breakdownLocation: req.body.breakdownLocation,
            breakdownCause: req.body.breakdownCause,
            isEmergency: req.body.isEmergency,
            technicianName: req.body.technicianName,
            driverId: req.body.driverId,
            warrantyMonths: req.body.warrantyMonths,
            invoiceNumber: req.body.invoiceNumber,
            documents: req.body.documents,
            notes: req.body.notes,
            parts: req.body.parts,
        });
        res.status(201).json({ success: true, data: record, message: 'Maintenance record created successfully' });
    }
    catch (error) {
        console.error('Create record error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create maintenance record',
            message: error.message,
            code: error.code,
            detail: error.detail || error.hint || error.stack
        });
    }
});
// PUT /api/fleet/maintenance/records/:id - Update record
router.put('/records/:id', [
    (0, auth_1.requireRole)('admin', 'manager'),
    (0, express_validator_1.param)('id').isUUID().withMessage('Valid record ID required'),
], async (req, res) => {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, error: 'Validation failed', details: errors.array() });
    }
    try {
        const companyId = req.user.companyId;
        const record = await Maintenance_1.MaintenanceRecordModel.update(req.params.id, companyId, {
            serviceType: req.body.serviceType,
            category: req.body.category,
            title: req.body.title,
            description: req.body.description,
            providerId: req.body.providerId,
            providerName: req.body.providerName,
            scheduledDate: req.body.scheduledDate ? new Date(req.body.scheduledDate) : undefined,
            startedDate: req.body.startedDate ? new Date(req.body.startedDate) : undefined,
            completedDate: req.body.completedDate ? new Date(req.body.completedDate) : undefined,
            serviceMileage: req.body.serviceMileage,
            nextServiceMileage: req.body.nextServiceMileage,
            laborCost: req.body.laborCost,
            partsCost: req.body.partsCost,
            otherCost: req.body.otherCost,
            status: req.body.status,
            breakdownLocation: req.body.breakdownLocation,
            breakdownCause: req.body.breakdownCause,
            isEmergency: req.body.isEmergency,
            technicianName: req.body.technicianName,
            driverId: req.body.driverId,
            warrantyMonths: req.body.warrantyMonths,
            invoiceNumber: req.body.invoiceNumber,
            documents: req.body.documents,
            notes: req.body.notes,
        });
        if (!record) {
            return res.status(404).json({ success: false, error: 'Maintenance record not found' });
        }
        res.json({ success: true, data: record });
    }
    catch (error) {
        console.error('Update record error:', error);
        res.status(500).json({ success: false, error: 'Failed to update maintenance record' });
    }
});
// DELETE /api/fleet/maintenance/records/:id - Delete record
router.delete('/records/:id', [
    (0, auth_1.requireRole)('admin'),
    (0, express_validator_1.param)('id').isUUID().withMessage('Valid record ID required'),
], async (req, res) => {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, error: 'Validation failed', details: errors.array() });
    }
    try {
        const companyId = req.user.companyId;
        const deleted = await Maintenance_1.MaintenanceRecordModel.delete(req.params.id, companyId);
        if (!deleted) {
            return res.status(404).json({ success: false, error: 'Maintenance record not found' });
        }
        res.json({ success: true, message: 'Maintenance record deleted successfully' });
    }
    catch (error) {
        console.error('Delete record error:', error);
        res.status(500).json({ success: false, error: 'Failed to delete maintenance record' });
    }
});
// ==================== VEHICLE DOWNTIME ====================
// GET /api/fleet/maintenance/downtime - List all downtime records
router.get('/downtime', [
    (0, express_validator_1.query)('page').optional().isInt({ min: 1 }),
    (0, express_validator_1.query)('perPage').optional().isInt({ min: 1, max: 100 }),
    (0, express_validator_1.query)('vehicleId').optional().isUUID(),
    (0, express_validator_1.query)('active').optional().isBoolean(),
], async (req, res) => {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, error: 'Validation failed', details: errors.array() });
    }
    try {
        const companyId = req.user.companyId;
        const page = parseInt(req.query.page) || 1;
        const perPage = parseInt(req.query.perPage) || 20;
        const vehicleId = req.query.vehicleId;
        const active = req.query.active === 'true';
        const { downtimes, total } = await Maintenance_1.VehicleDowntimeModel.findByCompany(companyId, {
            vehicleId,
            active,
            limit: perPage,
            offset: (page - 1) * perPage,
        });
        res.json({
            success: true,
            data: {
                items: downtimes,
                total,
                page,
                perPage,
                totalPages: Math.ceil(total / perPage),
            }
        });
    }
    catch (error) {
        console.error('List downtime error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch downtime records' });
    }
});
// GET /api/fleet/maintenance/downtime/stats - Get downtime statistics
router.get('/downtime/stats', async (req, res) => {
    try {
        const companyId = req.user.companyId;
        const stats = await Maintenance_1.VehicleDowntimeModel.getStats(companyId);
        res.json({ success: true, data: stats });
    }
    catch (error) {
        console.error('Downtime stats error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch downtime statistics' });
    }
});
// POST /api/fleet/maintenance/downtime - Create new downtime record
router.post('/downtime', [
    (0, auth_1.requireRole)('admin', 'manager'),
    (0, express_validator_1.body)('vehicleId').isUUID().withMessage('Valid vehicle ID required'),
    (0, express_validator_1.body)('downtimeType').isIn(['maintenance', 'repair', 'accident', 'other']).withMessage('Valid downtime type required'),
    (0, express_validator_1.body)('startDate').isISO8601().withMessage('Valid start date required'),
], async (req, res) => {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, error: 'Validation failed', details: errors.array() });
    }
    try {
        const companyId = req.user.companyId;
        const downtime = await Maintenance_1.VehicleDowntimeModel.create(companyId, {
            vehicleId: req.body.vehicleId,
            recordId: req.body.recordId,
            downtimeType: req.body.downtimeType,
            startDate: new Date(req.body.startDate),
            endDate: req.body.endDate ? new Date(req.body.endDate) : undefined,
            startTime: req.body.startTime,
            endTime: req.body.endTime,
            durationHours: req.body.durationHours,
            reason: req.body.reason,
            impact: req.body.impact,
            replacementVehicleId: req.body.replacementVehicleId,
            notes: req.body.notes,
        });
        res.status(201).json({ success: true, data: downtime, message: 'Downtime record created successfully' });
    }
    catch (error) {
        console.error('Create downtime error:', error);
        res.status(500).json({ success: false, error: 'Failed to create downtime record' });
    }
});
// POST /api/fleet/maintenance/downtime/:id/end - End downtime
router.post('/downtime/:id/end', [
    (0, auth_1.requireRole)('admin', 'manager'),
    (0, express_validator_1.param)('id').isUUID().withMessage('Valid downtime ID required'),
    (0, express_validator_1.body)('endDate').isISO8601().withMessage('Valid end date required'),
], async (req, res) => {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, error: 'Validation failed', details: errors.array() });
    }
    try {
        const companyId = req.user.companyId;
        const downtime = await Maintenance_1.VehicleDowntimeModel.endDowntime(req.params.id, companyId, new Date(req.body.endDate), req.body.endTime, req.body.durationHours);
        if (!downtime) {
            return res.status(404).json({ success: false, error: 'Downtime record not found' });
        }
        res.json({ success: true, data: downtime, message: 'Downtime ended successfully' });
    }
    catch (error) {
        console.error('End downtime error:', error);
        res.status(500).json({ success: false, error: 'Failed to end downtime' });
    }
});
// ==================== MAINTENANCE REMINDERS ====================
// GET /api/fleet/maintenance/reminders - List all reminders
router.get('/reminders', [
    (0, express_validator_1.query)('page').optional().isInt({ min: 1 }),
    (0, express_validator_1.query)('perPage').optional().isInt({ min: 1, max: 100 }),
    (0, express_validator_1.query)('status').optional().isIn(['pending', 'sent', 'acknowledged', 'dismissed']),
    (0, express_validator_1.query)('severity').optional().isIn(['info', 'warning', 'critical']),
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
        const status = req.query.status;
        const severity = req.query.severity;
        const vehicleId = req.query.vehicleId;
        const { reminders, total } = await Maintenance_1.MaintenanceReminderModel.findByCompany(companyId, {
            status,
            severity,
            vehicleId,
            limit: perPage,
            offset: (page - 1) * perPage,
        });
        res.json({
            success: true,
            data: {
                items: reminders,
                total,
                page,
                perPage,
                totalPages: Math.ceil(total / perPage),
            }
        });
    }
    catch (error) {
        console.error('List reminders error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch reminders' });
    }
});
// GET /api/fleet/maintenance/reminders/stats - Get reminder statistics
router.get('/reminders/stats', async (req, res) => {
    try {
        const companyId = req.user.companyId;
        const stats = await Maintenance_1.MaintenanceReminderModel.getStats(companyId);
        res.json({ success: true, data: stats });
    }
    catch (error) {
        console.error('Reminder stats error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch reminder statistics' });
    }
});
// POST /api/fleet/maintenance/reminders/generate - Generate reminders from schedules
router.post('/reminders/generate', [
    (0, auth_1.requireRole)('admin', 'manager'),
], async (req, res) => {
    try {
        const companyId = req.user.companyId;
        const generated = await Maintenance_1.MaintenanceReminderModel.generateFromSchedules(companyId);
        res.json({ success: true, data: { generated }, message: `${generated} reminders generated` });
    }
    catch (error) {
        console.error('Generate reminders error:', error);
        res.status(500).json({ success: false, error: 'Failed to generate reminders' });
    }
});
// POST /api/fleet/maintenance/reminders/:id/acknowledge - Acknowledge reminder
router.post('/reminders/:id/acknowledge', [
    (0, express_validator_1.param)('id').isUUID().withMessage('Valid reminder ID required'),
], async (req, res) => {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, error: 'Validation failed', details: errors.array() });
    }
    try {
        const companyId = req.user.companyId;
        const userId = req.user.userId;
        const reminder = await Maintenance_1.MaintenanceReminderModel.acknowledge(req.params.id, companyId, userId);
        if (!reminder) {
            return res.status(404).json({ success: false, error: 'Reminder not found' });
        }
        res.json({ success: true, data: reminder, message: 'Reminder acknowledged' });
    }
    catch (error) {
        console.error('Acknowledge reminder error:', error);
        res.status(500).json({ success: false, error: 'Failed to acknowledge reminder' });
    }
});
// POST /api/fleet/maintenance/reminders/:id/dismiss - Dismiss reminder
router.post('/reminders/:id/dismiss', [
    (0, express_validator_1.param)('id').isUUID().withMessage('Valid reminder ID required'),
], async (req, res) => {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, error: 'Validation failed', details: errors.array() });
    }
    try {
        const companyId = req.user.companyId;
        const reminder = await Maintenance_1.MaintenanceReminderModel.dismiss(req.params.id, companyId);
        if (!reminder) {
            return res.status(404).json({ success: false, error: 'Reminder not found' });
        }
        res.json({ success: true, data: reminder, message: 'Reminder dismissed' });
    }
    catch (error) {
        console.error('Dismiss reminder error:', error);
        res.status(500).json({ success: false, error: 'Failed to dismiss reminder' });
    }
});
// ==================== OVERVIEW / DASHBOARD ====================
// GET /api/fleet/maintenance/overview - Get maintenance overview
router.get('/overview', async (req, res) => {
    try {
        const companyId = req.user.companyId;
        // Get vehicles with maintenance status first
        const vehiclesResult = await (0, database_1.query)('SELECT id, registration_number, make, model, year, status FROM vehicles WHERE company_id = $1 AND status = $2', [companyId, 'maintenance']);
        // Fetch all stats in parallel
        const [scheduleStats, recordStats, reminderStats, downtimeStats, lowStockParts, overdueSchedules, activeDowntime, activeRepairs,] = await Promise.all([
            Maintenance_1.MaintenanceScheduleModel.getStats(companyId),
            Maintenance_1.MaintenanceRecordModel.getStats(companyId),
            Maintenance_1.MaintenanceReminderModel.getStats(companyId),
            Maintenance_1.VehicleDowntimeModel.getStats(companyId),
            Maintenance_1.SparePartModel.findByCompany(companyId, { lowStockOnly: true, limit: 5 }),
            Maintenance_1.MaintenanceScheduleModel.findByCompany(companyId, { overdue: true, limit: 5 }),
            Maintenance_1.VehicleDowntimeModel.findByCompany(companyId, { active: true, limit: 5 }),
            // Get active repairs (in_progress status)
            Maintenance_1.MaintenanceRecordModel.findByCompany(companyId, { status: 'in_progress', limit: 10 }),
        ]);
        res.json({
            success: true,
            data: {
                schedules: scheduleStats,
                records: recordStats,
                reminders: reminderStats,
                downtime: downtimeStats,
                lowStockParts: lowStockParts.parts,
                overdueSchedules: overdueSchedules.schedules,
                activeDowntime: activeDowntime.downtimes,
                activeRepairs: activeRepairs.records,
                vehiclesUnderMaintenance: vehiclesResult
            }
        });
    }
    catch (error) {
        console.error('Maintenance overview error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch maintenance overview' });
    }
});
// ==================== JOB CARDS ====================
// GET /api/fleet/maintenance/job-cards - List job cards
router.get('/job-cards', async (req, res) => {
    try {
        const companyId = req.user.companyId;
        const { status, providerId, page = '1', perPage = '20' } = req.query;
        const result = await Maintenance_1.JobCardModel.findByCompany(companyId, {
            status: status,
            providerId: providerId,
            limit: parseInt(perPage),
            offset: (parseInt(page) - 1) * parseInt(perPage),
        });
        res.json({
            success: true,
            data: {
                items: result.jobCards,
                total: result.total,
                page: parseInt(page),
                perPage: parseInt(perPage),
                totalPages: Math.ceil(result.total / parseInt(perPage)),
            },
        });
    }
    catch (error) {
        console.error('List job cards error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch job cards' });
    }
});
// GET /api/fleet/maintenance/job-cards/:id - Get job card details
router.get('/job-cards/:id', async (req, res) => {
    try {
        const companyId = req.user.companyId;
        const jobCard = await Maintenance_1.JobCardModel.findById(req.params.id, companyId);
        if (!jobCard) {
            return res.status(404).json({ success: false, error: 'Job card not found' });
        }
        res.json({ success: true, data: jobCard });
    }
    catch (error) {
        console.error('Get job card error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch job card' });
    }
});
// PATCH /api/fleet/maintenance/job-cards/:id/status - Update job card status
router.patch('/job-cards/:id/status', async (req, res) => {
    try {
        const companyId = req.user.companyId;
        const { status, sentDate, actualCompletionDate, actualCost, garageNotes } = req.body;
        const jobCard = await Maintenance_1.JobCardModel.updateStatus(req.params.id, companyId, status, { sentDate, actualCompletionDate, actualCost, garageNotes });
        if (!jobCard) {
            return res.status(404).json({ success: false, error: 'Job card not found' });
        }
        res.json({ success: true, data: jobCard });
    }
    catch (error) {
        console.error('Update job card status error:', error);
        res.status(500).json({ success: false, error: 'Failed to update job card' });
    }
});
exports.default = router;
//# sourceMappingURL=maintenance.js.map