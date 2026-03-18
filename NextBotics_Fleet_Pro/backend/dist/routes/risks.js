"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const Risk_1 = require("../models/Risk");
const auth_1 = require("../utils/auth");
const router = (0, express_1.Router)();
router.use(auth_1.authMiddleware);
// ============================================
// RISK REGISTER
// ============================================
// GET /api/fleet/risks - List risks
router.get('/', async (req, res) => {
    try {
        const companyId = req.user.companyId;
        const { status, riskLevel, category, ownerId, limit = '50', offset = '0' } = req.query;
        const result = await Risk_1.RiskModel.findByCompany(companyId, {
            status: status,
            riskLevel: riskLevel,
            category: category,
            ownerId: ownerId,
            limit: parseInt(limit),
            offset: parseInt(offset),
        });
        res.json({
            success: true,
            data: result.risks,
            pagination: { total: result.total, limit: parseInt(limit), offset: parseInt(offset) },
        });
    }
    catch (error) {
        console.error('Error fetching risks:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch risks' });
    }
});
// GET /api/fleet/risks/stats - Get risk statistics
router.get('/stats', async (req, res) => {
    try {
        const companyId = req.user.companyId;
        const stats = await Risk_1.RiskModel.getStats(companyId);
        res.json({ success: true, data: stats });
    }
    catch (error) {
        console.error('Error fetching risk stats:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch statistics' });
    }
});
// GET /api/fleet/risks/my-risks - Get risks assigned to current user
router.get('/my-risks', async (req, res) => {
    try {
        const companyId = req.user.companyId;
        const userId = req.user.userId;
        const result = await Risk_1.RiskModel.findByCompany(companyId, {
            ownerId: userId,
            limit: 50,
        });
        res.json({ success: true, data: result.risks });
    }
    catch (error) {
        console.error('Error fetching my risks:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch risks' });
    }
});
// GET /api/fleet/risks/:id - Get single risk
router.get('/:id', async (req, res) => {
    try {
        const companyId = req.user.companyId;
        const risk = await Risk_1.RiskModel.findById(req.params.id, companyId);
        if (!risk) {
            return res.status(404).json({ success: false, error: 'Risk not found' });
        }
        res.json({ success: true, data: risk });
    }
    catch (error) {
        console.error('Error fetching risk:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch risk' });
    }
});
// POST /api/fleet/risks - Create risk
router.post('/', (0, auth_1.requireRole)(['admin', 'manager']), async (req, res) => {
    try {
        const companyId = req.user.companyId;
        const userId = req.user.userId;
        const { title, description, category, likelihood, impact, mitigatingActions, ownerId, reviewDate } = req.body;
        if (!title || !description || !category || !likelihood || !impact) {
            return res.status(400).json({ success: false, error: 'Missing required fields' });
        }
        const risk = await Risk_1.RiskModel.create(companyId, {
            title,
            description,
            category,
            likelihood,
            impact,
            mitigatingActions,
            identifiedBy: userId,
            ownerId,
            reviewDate: reviewDate ? new Date(reviewDate) : undefined,
        });
        res.status(201).json({ success: true, data: risk });
    }
    catch (error) {
        console.error('Error creating risk:', error);
        res.status(500).json({ success: false, error: 'Failed to create risk' });
    }
});
// PUT /api/fleet/risks/:id - Update risk
router.put('/:id', (0, auth_1.requireRole)(['admin', 'manager']), async (req, res) => {
    try {
        const companyId = req.user.companyId;
        const userId = req.user.userId;
        const { title, description, category, likelihood, impact, mitigatingActions, ownerId, reviewDate, status } = req.body;
        const risk = await Risk_1.RiskModel.update(req.params.id, companyId, {
            title,
            description,
            category,
            likelihood,
            impact,
            mitigatingActions,
            ownerId,
            reviewDate: reviewDate ? new Date(reviewDate) : undefined,
            status,
        }, userId);
        if (!risk) {
            return res.status(404).json({ success: false, error: 'Risk not found' });
        }
        res.json({ success: true, data: risk });
    }
    catch (error) {
        console.error('Error updating risk:', error);
        res.status(500).json({ success: false, error: 'Failed to update risk' });
    }
});
// GET /api/fleet/risks/:id/history - Get risk history
router.get('/:id/history', async (req, res) => {
    try {
        const companyId = req.user.companyId;
        const history = await Risk_1.RiskModel.getHistory(req.params.id, companyId);
        res.json({ success: true, data: history });
    }
    catch (error) {
        console.error('Error fetching risk history:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch history' });
    }
});
// ============================================
// INSPECTION RECORDS
// ============================================
// GET /api/fleet/risks/inspections - List inspections
router.get('/inspections/all', async (req, res) => {
    try {
        const companyId = req.user.companyId;
        const { inspectionType, vehicleId, status, limit = '50', offset = '0' } = req.query;
        const result = await Risk_1.InspectionModel.findByCompany(companyId, {
            inspectionType: inspectionType,
            vehicleId: vehicleId,
            status: status,
            limit: parseInt(limit),
            offset: parseInt(offset),
        });
        res.json({
            success: true,
            data: result.inspections,
            pagination: { total: result.total, limit: parseInt(limit), offset: parseInt(offset) },
        });
    }
    catch (error) {
        console.error('Error fetching inspections:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch inspections' });
    }
});
// GET /api/fleet/risks/inspections/:id - Get single inspection
router.get('/inspections/:id', async (req, res) => {
    try {
        const companyId = req.user.companyId;
        const inspection = await Risk_1.InspectionModel.findById(req.params.id, companyId);
        if (!inspection) {
            return res.status(404).json({ success: false, error: 'Inspection not found' });
        }
        res.json({ success: true, data: inspection });
    }
    catch (error) {
        console.error('Error fetching inspection:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch inspection' });
    }
});
// POST /api/fleet/risks/inspections - Create inspection
router.post('/inspections', (0, auth_1.requireRole)(['admin', 'manager', 'staff']), async (req, res) => {
    try {
        const companyId = req.user.companyId;
        const userId = req.user.userId;
        const { inspectionType, vehicleId, driverId, location, latitude, longitude, overallStatus, findings, correctiveActionNeeded, photos, signatureUrl } = req.body;
        if (!inspectionType) {
            return res.status(400).json({ success: false, error: 'Inspection type is required' });
        }
        const inspection = await Risk_1.InspectionModel.create(companyId, {
            inspectionType,
            vehicleId,
            driverId,
            inspectedBy: userId,
            location,
            latitude,
            longitude,
            overallStatus,
            findings,
            correctiveActionNeeded,
            photos,
            signatureUrl,
        });
        res.status(201).json({ success: true, data: inspection });
    }
    catch (error) {
        console.error('Error creating inspection:', error);
        res.status(500).json({ success: false, error: 'Failed to create inspection' });
    }
});
// POST /api/fleet/risks/inspections/:id/link-action - Link to corrective action
router.post('/inspections/:id/link-action', (0, auth_1.requireRole)(['admin', 'manager']), async (req, res) => {
    try {
        const companyId = req.user.companyId;
        const userId = req.user.userId;
        const { correctiveActionId } = req.body;
        if (!correctiveActionId) {
            return res.status(400).json({ success: false, error: 'Corrective action ID is required' });
        }
        await Risk_1.InspectionModel.linkToCorrectiveAction(req.params.id, correctiveActionId, userId);
        res.json({ success: true, message: 'Inspection linked to corrective action' });
    }
    catch (error) {
        console.error('Error linking inspection:', error);
        res.status(500).json({ success: false, error: 'Failed to link inspection' });
    }
});
exports.default = router;
//# sourceMappingURL=risks.js.map