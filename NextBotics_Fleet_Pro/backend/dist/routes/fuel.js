"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const Fuel_1 = require("../models/Fuel");
const auth_1 = require("../utils/auth");
const router = (0, express_1.Router)();
// All routes require authentication
router.use(auth_1.authMiddleware);
// GET /api/fleet/fuel/stats - Frontend compatible endpoint (aggregates all fuel stats)
router.get('/stats', async (req, res) => {
    try {
        const companyId = req.user.companyId;
        const { dateFrom, dateTo } = req.query;
        const fromDate = dateFrom ? new Date(dateFrom) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const toDate = dateTo ? new Date(dateTo) : new Date();
        const stats = await Fuel_1.FuelTransactionModel.getStats(companyId, fromDate, toDate);
        res.json({
            success: true,
            data: {
                totalCost: stats.totalCost || 0,
                totalLiters: stats.totalLiters || 0,
                transactionCount: stats.transactionCount || 0,
                averagePricePerLiter: stats.averagePricePerLiter || 0,
                byStation: stats.byStation || [],
                period: { from: fromDate, to: toDate },
            }
        });
    }
    catch (error) {
        console.error('Error fetching fuel stats:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch fuel statistics' });
    }
});
// ============================================
// FUEL CARDS
// ============================================
// GET /api/fleet/fuel/cards - List fuel cards
router.get('/cards', async (req, res) => {
    try {
        const companyId = req.user.companyId;
        const cards = await Fuel_1.FuelCardModel.findByCompany(companyId);
        res.json({ success: true, data: cards });
    }
    catch (error) {
        console.error('Error fetching fuel cards:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch fuel cards' });
    }
});
// GET /api/fleet/fuel/cards/:id - Get single fuel card
router.get('/cards/:id', async (req, res) => {
    try {
        const companyId = req.user.companyId;
        const card = await Fuel_1.FuelCardModel.findById(req.params.id, companyId);
        if (!card) {
            return res.status(404).json({ success: false, error: 'Fuel card not found' });
        }
        res.json({ success: true, data: card });
    }
    catch (error) {
        console.error('Error fetching fuel card:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch fuel card' });
    }
});
// POST /api/fleet/fuel/cards - Create fuel card
router.post('/cards', (0, auth_1.requireRole)(['admin', 'manager']), async (req, res) => {
    try {
        const companyId = req.user.companyId;
        const { cardNumber, cardProvider, vehicleId, driverId, monthlyLimit, expiryDate } = req.body;
        if (!cardNumber) {
            return res.status(400).json({ success: false, error: 'Card number is required' });
        }
        const card = await Fuel_1.FuelCardModel.create(companyId, {
            cardNumber,
            cardProvider,
            vehicleId,
            driverId,
            monthlyLimit,
            expiryDate: expiryDate ? new Date(expiryDate) : undefined,
        });
        res.status(201).json({ success: true, data: card });
    }
    catch (error) {
        console.error('Error creating fuel card:', error);
        res.status(500).json({ success: false, error: 'Failed to create fuel card' });
    }
});
// ============================================
// FUEL TRANSACTIONS
// ============================================
// GET /api/fleet/fuel/transactions - List fuel transactions
router.get('/transactions', async (req, res) => {
    try {
        const companyId = req.user.companyId;
        const { vehicleId, dateFrom, dateTo, isAnomaly, limit = '50', offset = '0' } = req.query;
        const result = await Fuel_1.FuelTransactionModel.findByCompany(companyId, {
            vehicleId: vehicleId,
            dateFrom: dateFrom ? new Date(dateFrom) : undefined,
            dateTo: dateTo ? new Date(dateTo) : undefined,
            isAnomaly: isAnomaly !== undefined ? isAnomaly === 'true' : undefined,
            limit: parseInt(limit),
            offset: parseInt(offset),
        });
        res.json({
            success: true,
            data: result.transactions,
            pagination: {
                total: result.total,
                limit: parseInt(limit),
                offset: parseInt(offset),
            },
        });
    }
    catch (error) {
        console.error('Error fetching fuel transactions:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch fuel transactions' });
    }
});
// GET /api/fleet/fuel/transactions/stats - Get fuel statistics
router.get('/transactions/stats', async (req, res) => {
    try {
        const companyId = req.user.companyId;
        const { dateFrom, dateTo } = req.query;
        const stats = await Fuel_1.FuelTransactionModel.getStats(companyId, dateFrom ? new Date(dateFrom) : undefined, dateTo ? new Date(dateTo) : undefined);
        res.json({ success: true, data: stats });
    }
    catch (error) {
        console.error('Error fetching fuel stats:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch fuel statistics' });
    }
});
// POST /api/fleet/fuel/transactions - Create fuel transaction
router.post('/transactions', (0, auth_1.requireRole)(['admin', 'manager', 'staff']), async (req, res) => {
    try {
        const companyId = req.user.companyId;
        const { vehicleId, driverId, fuelCardId, transactionDate, stationName, liters, pricePerLiter, totalCost, odometerReading, notes, } = req.body;
        if (!vehicleId || !liters || !totalCost) {
            return res.status(400).json({
                success: false,
                error: 'Vehicle ID, liters, and total cost are required'
            });
        }
        const transaction = await Fuel_1.FuelTransactionModel.create(companyId, {
            vehicleId,
            driverId,
            fuelCardId,
            transactionDate: transactionDate ? new Date(transactionDate) : new Date(),
            stationName,
            liters,
            pricePerLiter,
            totalCost,
            odometerReading,
            notes,
        });
        res.status(201).json({ success: true, data: transaction });
    }
    catch (error) {
        console.error('Error creating fuel transaction:', error);
        res.status(500).json({ success: false, error: 'Failed to create fuel transaction' });
    }
});
// ============================================
// EXPENSES
// ============================================
// GET /api/fleet/fuel/expenses - List expenses
router.get('/expenses', async (req, res) => {
    try {
        const companyId = req.user.companyId;
        const { status, vehicleId, expenseType, dateFrom, dateTo, limit = '50', offset = '0' } = req.query;
        const result = await Fuel_1.ExpenseModel.findByCompany(companyId, {
            status: status,
            vehicleId: vehicleId,
            expenseType: expenseType,
            dateFrom: dateFrom ? new Date(dateFrom) : undefined,
            dateTo: dateTo ? new Date(dateTo) : undefined,
            limit: parseInt(limit),
            offset: parseInt(offset),
        });
        res.json({
            success: true,
            data: result.expenses,
            pagination: {
                total: result.total,
                limit: parseInt(limit),
                offset: parseInt(offset),
            },
        });
    }
    catch (error) {
        console.error('Error fetching expenses:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch expenses' });
    }
});
// GET /api/fleet/fuel/expenses/stats - Get expense statistics
router.get('/expenses/stats', async (req, res) => {
    try {
        const companyId = req.user.companyId;
        const { dateFrom, dateTo } = req.query;
        const stats = await Fuel_1.ExpenseModel.getStats(companyId, dateFrom ? new Date(dateFrom) : undefined, dateTo ? new Date(dateTo) : undefined);
        res.json({ success: true, data: stats });
    }
    catch (error) {
        console.error('Error fetching expense stats:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch expense statistics' });
    }
});
// POST /api/fleet/fuel/expenses - Create expense
router.post('/expenses', (0, auth_1.requireRole)(['admin', 'manager', 'staff']), async (req, res) => {
    try {
        const companyId = req.user.companyId;
        const userId = req.user.userId;
        const { vehicleId, driverId, expenseType, amount, expenseDate, description, vendorName, isReimbursable, } = req.body;
        if (!expenseType || !amount) {
            return res.status(400).json({
                success: false,
                error: 'Expense type and amount are required'
            });
        }
        const expense = await Fuel_1.ExpenseModel.create(companyId, userId, {
            vehicleId,
            driverId,
            expenseType,
            amount,
            expenseDate: expenseDate ? new Date(expenseDate) : new Date(),
            description,
            vendorName,
            isReimbursable,
        });
        res.status(201).json({ success: true, data: expense });
    }
    catch (error) {
        console.error('Error creating expense:', error);
        res.status(500).json({ success: false, error: 'Failed to create expense' });
    }
});
exports.default = router;
//# sourceMappingURL=fuel.js.map