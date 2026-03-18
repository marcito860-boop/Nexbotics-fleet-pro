"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const Inventory_1 = require("../models/Inventory");
const auth_1 = require("../utils/auth");
const router = (0, express_1.Router)();
router.use(auth_1.authMiddleware);
// ============================================
// CATEGORIES
// ============================================
// GET /api/fleet/inventory/categories - List categories
router.get('/categories', async (req, res) => {
    try {
        const companyId = req.user.companyId;
        const categories = await Inventory_1.InventoryCategoryModel.findByCompany(companyId);
        res.json({ success: true, data: categories });
    }
    catch (error) {
        console.error('Error fetching categories:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch categories' });
    }
});
// POST /api/fleet/inventory/categories - Create category
router.post('/categories', (0, auth_1.requireRole)(['admin', 'manager']), async (req, res) => {
    try {
        const companyId = req.user.companyId;
        const { name, description } = req.body;
        if (!name) {
            return res.status(400).json({ success: false, error: 'Category name is required' });
        }
        const category = await Inventory_1.InventoryCategoryModel.create(companyId, name, description);
        res.status(201).json({ success: true, data: category });
    }
    catch (error) {
        console.error('Error creating category:', error);
        res.status(500).json({ success: false, error: 'Failed to create category' });
    }
});
// ============================================
// ITEMS
// ============================================
// GET /api/fleet/inventory/items - List items
router.get('/items', async (req, res) => {
    try {
        const companyId = req.user.companyId;
        const { categoryId, isActive, lowStockOnly, search, limit = '50', offset = '0' } = req.query;
        const result = await Inventory_1.InventoryItemModel.findByCompany(companyId, {
            categoryId: categoryId,
            isActive: isActive !== undefined ? isActive === 'true' : undefined,
            lowStockOnly: lowStockOnly === 'true',
            search: search,
            limit: parseInt(limit),
            offset: parseInt(offset),
        });
        res.json({
            success: true,
            data: result.items,
            pagination: { total: result.total, limit: parseInt(limit), offset: parseInt(offset) },
        });
    }
    catch (error) {
        console.error('Error fetching items:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch items' });
    }
});
// GET /api/fleet/inventory/stats - Frontend compatible endpoint
router.get('/stats', async (req, res) => {
    try {
        const companyId = req.user.companyId;
        const stats = await Inventory_1.InventoryTransactionModel.getStats(companyId);
        res.json({ success: true, data: stats });
    }
    catch (error) {
        console.error('Error fetching stats:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch statistics' });
    }
});
// GET /api/fleet/inventory/items/stats - Get inventory statistics (keep for compatibility)
router.get('/items/stats', async (req, res) => {
    try {
        const companyId = req.user.companyId;
        const stats = await Inventory_1.InventoryTransactionModel.getStats(companyId);
        res.json({ success: true, data: stats });
    }
    catch (error) {
        console.error('Error fetching stats:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch statistics' });
    }
});
// GET /api/fleet/inventory/items/:id - Get single item
router.get('/items/:id', async (req, res) => {
    try {
        const companyId = req.user.companyId;
        const item = await Inventory_1.InventoryItemModel.findById(req.params.id, companyId);
        if (!item) {
            return res.status(404).json({ success: false, error: 'Item not found' });
        }
        res.json({ success: true, data: item });
    }
    catch (error) {
        console.error('Error fetching item:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch item' });
    }
});
// POST /api/fleet/inventory/items - Create item
router.post('/items', (0, auth_1.requireRole)(['admin', 'manager']), async (req, res) => {
    try {
        const companyId = req.user.companyId;
        const userId = req.user.userId;
        const { sku, name, description, categoryId, unitOfMeasure, unitPrice, supplierName, supplierContact, reorderLevel, reorderQuantity, currentStock, location } = req.body;
        if (!sku || !name) {
            return res.status(400).json({ success: false, error: 'SKU and name are required' });
        }
        const item = await Inventory_1.InventoryItemModel.create(companyId, userId, {
            sku,
            name,
            description,
            categoryId,
            unitOfMeasure,
            unitPrice,
            supplierName,
            supplierContact,
            reorderLevel,
            reorderQuantity,
            currentStock,
            location,
        });
        res.status(201).json({ success: true, data: item });
    }
    catch (error) {
        console.error('Error creating item:', error);
        res.status(500).json({ success: false, error: 'Failed to create item' });
    }
});
// PUT /api/fleet/inventory/items/:id - Update item
router.put('/items/:id', (0, auth_1.requireRole)(['admin', 'manager']), async (req, res) => {
    try {
        const companyId = req.user.companyId;
        const { name, description, categoryId, unitOfMeasure, unitPrice, supplierName, supplierContact, reorderLevel, reorderQuantity, location, isActive } = req.body;
        const item = await Inventory_1.InventoryItemModel.update(req.params.id, companyId, {
            name,
            description,
            categoryId,
            unitOfMeasure,
            unitPrice,
            supplierName,
            supplierContact,
            reorderLevel,
            reorderQuantity,
            location,
            isActive,
        });
        if (!item) {
            return res.status(404).json({ success: false, error: 'Item not found' });
        }
        res.json({ success: true, data: item });
    }
    catch (error) {
        console.error('Error updating item:', error);
        res.status(500).json({ success: false, error: 'Failed to update item' });
    }
});
// POST /api/fleet/inventory/items/:id/adjust-stock - Adjust stock
router.post('/items/:id/adjust-stock', (0, auth_1.requireRole)(['admin', 'manager']), async (req, res) => {
    try {
        const companyId = req.user.companyId;
        const userId = req.user.userId;
        const { quantity, notes } = req.body;
        if (quantity === undefined) {
            return res.status(400).json({ success: false, error: 'Quantity is required' });
        }
        const item = await Inventory_1.InventoryItemModel.adjustStock(req.params.id, companyId, quantity, userId, notes);
        if (!item) {
            return res.status(404).json({ success: false, error: 'Item not found' });
        }
        res.json({ success: true, data: item });
    }
    catch (error) {
        console.error('Error adjusting stock:', error);
        res.status(400).json({ success: false, error: error.message || 'Failed to adjust stock' });
    }
});
// POST /api/fleet/inventory/items/import - Bulk import items
router.post('/items/import', (0, auth_1.requireRole)(['admin', 'manager']), async (req, res) => {
    try {
        const companyId = req.user.companyId;
        const userId = req.user.userId;
        const { items } = req.body;
        if (!Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ success: false, error: 'Items array is required' });
        }
        const result = await Inventory_1.InventoryItemModel.bulkImport(companyId, userId, items);
        res.json({ success: true, data: result });
    }
    catch (error) {
        console.error('Error importing items:', error);
        res.status(500).json({ success: false, error: 'Failed to import items' });
    }
});
// ============================================
// TRANSACTIONS
// ============================================
// GET /api/fleet/inventory/transactions - List transactions
router.get('/transactions', async (req, res) => {
    try {
        const companyId = req.user.companyId;
        const { itemId, transactionType, limit = '50', offset = '0' } = req.query;
        const result = await Inventory_1.InventoryTransactionModel.findByCompany(companyId, {
            itemId: itemId,
            transactionType: transactionType,
            limit: parseInt(limit),
            offset: parseInt(offset),
        });
        res.json({
            success: true,
            data: result.transactions,
            pagination: { total: result.total, limit: parseInt(limit), offset: parseInt(offset) },
        });
    }
    catch (error) {
        console.error('Error fetching transactions:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch transactions' });
    }
});
// ============================================
// STOCK ALERTS
// ============================================
// GET /api/fleet/inventory/alerts - List alerts
router.get('/alerts', async (req, res) => {
    try {
        const companyId = req.user.companyId;
        const { isRead, limit = '50' } = req.query;
        const alerts = await Inventory_1.StockAlertModel.findByCompany(companyId, {
            isRead: isRead !== undefined ? isRead === 'true' : undefined,
            limit: parseInt(limit),
        });
        res.json({ success: true, data: alerts });
    }
    catch (error) {
        console.error('Error fetching alerts:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch alerts' });
    }
});
// GET /api/fleet/inventory/alerts/unread-count - Get unread count
router.get('/alerts/unread-count', async (req, res) => {
    try {
        const companyId = req.user.companyId;
        const count = await Inventory_1.StockAlertModel.getUnreadCount(companyId);
        res.json({ success: true, data: { count } });
    }
    catch (error) {
        console.error('Error fetching alert count:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch alert count' });
    }
});
// POST /api/fleet/inventory/alerts/:id/acknowledge - Acknowledge alert
router.post('/alerts/:id/acknowledge', async (req, res) => {
    try {
        const companyId = req.user.companyId;
        const userId = req.user.userId;
        await Inventory_1.StockAlertModel.acknowledge(req.params.id, companyId, userId);
        res.json({ success: true, message: 'Alert acknowledged' });
    }
    catch (error) {
        console.error('Error acknowledging alert:', error);
        res.status(500).json({ success: false, error: 'Failed to acknowledge alert' });
    }
});
exports.default = router;
//# sourceMappingURL=inventory.js.map