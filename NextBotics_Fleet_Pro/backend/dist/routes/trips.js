"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const Trip_1 = require("../models/Trip");
const auth_1 = require("../utils/auth");
const router = (0, express_1.Router)();
// All routes require authentication
router.use(auth_1.authMiddleware);
// GET /api/fleet/trips - List trips
router.get('/', async (req, res) => {
    try {
        const companyId = req.user.companyId;
        const { status, vehicleId, driverId, dateFrom, dateTo, limit = '50', offset = '0' } = req.query;
        const result = await Trip_1.TripModel.findByCompany(companyId, {
            status: status,
            vehicleId: vehicleId,
            driverId: driverId,
            dateFrom: dateFrom ? new Date(dateFrom) : undefined,
            dateTo: dateTo ? new Date(dateTo) : undefined,
            limit: parseInt(limit),
            offset: parseInt(offset),
        });
        res.json({
            success: true,
            data: result.trips,
            pagination: {
                total: result.total,
                limit: parseInt(limit),
                offset: parseInt(offset),
            },
        });
    }
    catch (error) {
        console.error('Error fetching trips:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch trips' });
    }
});
// GET /api/fleet/trips/stats/summary - Frontend compatible endpoint
router.get('/stats/summary', async (req, res) => {
    try {
        const companyId = req.user.companyId;
        const { dateFrom, dateTo } = req.query;
        const stats = await Trip_1.TripModel.getStats(companyId, dateFrom ? new Date(dateFrom) : undefined, dateTo ? new Date(dateTo) : undefined);
        res.json({ success: true, data: stats });
    }
    catch (error) {
        console.error('Error fetching trip stats:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch trip statistics' });
    }
});
// GET /api/fleet/trips/stats - Get trip statistics
router.get('/stats', async (req, res) => {
    try {
        const companyId = req.user.companyId;
        const { dateFrom, dateTo } = req.query;
        const stats = await Trip_1.TripModel.getStats(companyId, dateFrom ? new Date(dateFrom) : undefined, dateTo ? new Date(dateTo) : undefined);
        res.json({ success: true, data: stats });
    }
    catch (error) {
        console.error('Error fetching trip stats:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch trip statistics' });
    }
});
// GET /api/fleet/trips/:id - Get single trip
router.get('/:id', async (req, res) => {
    try {
        const companyId = req.user.companyId;
        const trip = await Trip_1.TripModel.findById(req.params.id, companyId);
        if (!trip) {
            return res.status(404).json({ success: false, error: 'Trip not found' });
        }
        res.json({ success: true, data: trip });
    }
    catch (error) {
        console.error('Error fetching trip:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch trip' });
    }
});
// POST /api/fleet/trips - Create new trip
router.post('/', (0, auth_1.requireRole)(['admin', 'manager']), async (req, res) => {
    try {
        const companyId = req.user.companyId;
        const { vehicleId, driverId, assignmentId, purpose, startTime } = req.body;
        if (!vehicleId) {
            return res.status(400).json({ success: false, error: 'Vehicle ID is required' });
        }
        const trip = await Trip_1.TripModel.create(companyId, {
            vehicleId,
            driverId,
            assignmentId,
            purpose,
            startTime: startTime ? new Date(startTime) : new Date(),
        });
        res.status(201).json({ success: true, data: trip });
    }
    catch (error) {
        console.error('Error creating trip:', error);
        res.status(500).json({ success: false, error: 'Failed to create trip' });
    }
});
// PUT /api/fleet/trips/:id - Update trip
router.put('/:id', (0, auth_1.requireRole)(['admin', 'manager']), async (req, res) => {
    try {
        const companyId = req.user.companyId;
        const { endTime, endOdometer, distanceKm, fuelConsumed, status } = req.body;
        const trip = await Trip_1.TripModel.update(req.params.id, companyId, {
            endTime: endTime ? new Date(endTime) : undefined,
            endOdometer,
            distanceKm,
            fuelConsumed,
            status,
        });
        if (!trip) {
            return res.status(404).json({ success: false, error: 'Trip not found' });
        }
        res.json({ success: true, data: trip });
    }
    catch (error) {
        console.error('Error updating trip:', error);
        res.status(500).json({ success: false, error: 'Failed to update trip' });
    }
});
// POST /api/fleet/trips/:id/complete - Complete a trip
router.post('/:id/complete', (0, auth_1.requireRole)(['admin', 'manager', 'staff']), async (req, res) => {
    try {
        const companyId = req.user.companyId;
        const { endOdometer, distanceKm, fuelConsumed } = req.body;
        if (!endOdometer || !distanceKm) {
            return res.status(400).json({
                success: false,
                error: 'End odometer reading and distance are required'
            });
        }
        const trip = await Trip_1.TripModel.complete(req.params.id, companyId, {
            endOdometer,
            distanceKm,
            fuelConsumed,
        });
        if (!trip) {
            return res.status(404).json({ success: false, error: 'Trip not found or already completed' });
        }
        res.json({ success: true, data: trip });
    }
    catch (error) {
        console.error('Error completing trip:', error);
        res.status(500).json({ success: false, error: 'Failed to complete trip' });
    }
});
exports.default = router;
//# sourceMappingURL=trips.js.map