import { Router, Request, Response } from 'express';
import { InventoryCategoryModel, InventoryItemModel, InventoryTransactionModel, StockAlertModel } from '../models/Inventory';
import { authMiddleware, requireRole } from '../utils/auth';

const router = Router();

router.use(authMiddleware);

// ============================================
// CATEGORIES
// ============================================

// GET /api/fleet/inventory/categories - List categories
router.get('/categories', async (req: Request, res: Response) => {
  try {
    const companyId = req.user!.companyId;
    const categories = await InventoryCategoryModel.findByCompany(companyId);
    res.json({ success: true, data: categories });
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch categories' });
  }
});

// POST /api/fleet/inventory/categories - Create category
router.post('/categories', requireRole(['admin', 'manager']), async (req: Request, res: Response) => {
  try {
    const companyId = req.user!.companyId;
    const { name, description } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, error: 'Category name is required' });
    }

    const category = await InventoryCategoryModel.create(companyId, name, description);
    res.status(201).json({ success: true, data: category });
  } catch (error) {
    console.error('Error creating category:', error);
    res.status(500).json({ success: false, error: 'Failed to create category' });
  }
});

// ============================================
// ITEMS
// ============================================

// GET /api/fleet/inventory/items - List items
router.get('/items', async (req: Request, res: Response) => {
  try {
    const companyId = req.user!.companyId;
    const { categoryId, isActive, lowStockOnly, search, limit = '50', offset = '0' } = req.query;

    const result = await InventoryItemModel.findByCompany(companyId, {
      categoryId: categoryId as string,
      isActive: isActive !== undefined ? isActive === 'true' : undefined,
      lowStockOnly: lowStockOnly === 'true',
      search: search as string,
      limit: parseInt(limit as string),
      offset: parseInt(offset as string),
    });

    res.json({
      success: true,
      data: result.items,
      pagination: { total: result.total, limit: parseInt(limit as string), offset: parseInt(offset as string) },
    });
  } catch (error) {
    console.error('Error fetching items:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch items' });
  }
});

// GET /api/fleet/inventory/stats - Frontend compatible endpoint
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const companyId = req.user!.companyId;
    const stats = await InventoryTransactionModel.getStats(companyId);
    res.json({ success: true, data: stats });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch statistics' });
  }
});

// GET /api/fleet/inventory/items/stats - Get inventory statistics (keep for compatibility)
router.get('/items/stats', async (req: Request, res: Response) => {
  try {
    const companyId = req.user!.companyId;
    const stats = await InventoryTransactionModel.getStats(companyId);
    res.json({ success: true, data: stats });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch statistics' });
  }
});

// GET /api/fleet/inventory/items/:id - Get single item
router.get('/items/:id', async (req: Request, res: Response) => {
  try {
    const companyId = req.user!.companyId;
    const item = await InventoryItemModel.findById(req.params.id, companyId);

    if (!item) {
      return res.status(404).json({ success: false, error: 'Item not found' });
    }

    res.json({ success: true, data: item });
  } catch (error) {
    console.error('Error fetching item:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch item' });
  }
});

// POST /api/fleet/inventory/items - Create item
router.post('/items', requireRole(['admin', 'manager']), async (req: Request, res: Response) => {
  try {
    const companyId = req.user!.companyId;
    const userId = req.user!.userId;
    const { sku, name, description, categoryId, unitOfMeasure, unitPrice, supplierName, supplierContact, reorderLevel, reorderQuantity, currentStock, location } = req.body;

    if (!sku || !name) {
      return res.status(400).json({ success: false, error: 'SKU and name are required' });
    }

    const item = await InventoryItemModel.create(companyId, userId, {
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
  } catch (error) {
    console.error('Error creating item:', error);
    res.status(500).json({ success: false, error: 'Failed to create item' });
  }
});

// PUT /api/fleet/inventory/items/:id - Update item
router.put('/items/:id', requireRole(['admin', 'manager']), async (req: Request, res: Response) => {
  try {
    const companyId = req.user!.companyId;
    const { name, description, categoryId, unitOfMeasure, unitPrice, supplierName, supplierContact, reorderLevel, reorderQuantity, location, isActive } = req.body;

    const item = await InventoryItemModel.update(req.params.id, companyId, {
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
  } catch (error) {
    console.error('Error updating item:', error);
    res.status(500).json({ success: false, error: 'Failed to update item' });
  }
});

// POST /api/fleet/inventory/items/:id/adjust-stock - Adjust stock
router.post('/items/:id/adjust-stock', requireRole(['admin', 'manager']), async (req: Request, res: Response) => {
  try {
    const companyId = req.user!.companyId;
    const userId = req.user!.userId;
    const { quantity, notes } = req.body;

    if (quantity === undefined) {
      return res.status(400).json({ success: false, error: 'Quantity is required' });
    }

    const item = await InventoryItemModel.adjustStock(req.params.id, companyId, quantity, userId, notes);

    if (!item) {
      return res.status(404).json({ success: false, error: 'Item not found' });
    }

    res.json({ success: true, data: item });
  } catch (error: any) {
    console.error('Error adjusting stock:', error);
    res.status(400).json({ success: false, error: error.message || 'Failed to adjust stock' });
  }
});

// POST /api/fleet/inventory/items/import - Bulk import items
router.post('/items/import', requireRole(['admin', 'manager']), async (req: Request, res: Response) => {
  try {
    const companyId = req.user!.companyId;
    const userId = req.user!.userId;
    const { items } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, error: 'Items array is required' });
    }

    const result = await InventoryItemModel.bulkImport(companyId, userId, items);
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Error importing items:', error);
    res.status(500).json({ success: false, error: 'Failed to import items' });
  }
});

// ============================================
// TRANSACTIONS
// ============================================

// GET /api/fleet/inventory/transactions - List transactions
router.get('/transactions', async (req: Request, res: Response) => {
  try {
    const companyId = req.user!.companyId;
    const { itemId, transactionType, limit = '50', offset = '0' } = req.query;

    const result = await InventoryTransactionModel.findByCompany(companyId, {
      itemId: itemId as string,
      transactionType: transactionType as string,
      limit: parseInt(limit as string),
      offset: parseInt(offset as string),
    });

    res.json({
      success: true,
      data: result.transactions,
      pagination: { total: result.total, limit: parseInt(limit as string), offset: parseInt(offset as string) },
    });
  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch transactions' });
  }
});

// ============================================
// STOCK ALERTS
// ============================================

// GET /api/fleet/inventory/alerts - List alerts
router.get('/alerts', async (req: Request, res: Response) => {
  try {
    const companyId = req.user!.companyId;
    const { isRead, limit = '50' } = req.query;

    const alerts = await StockAlertModel.findByCompany(companyId, {
      isRead: isRead !== undefined ? isRead === 'true' : undefined,
      limit: parseInt(limit as string),
    });

    res.json({ success: true, data: alerts });
  } catch (error) {
    console.error('Error fetching alerts:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch alerts' });
  }
});

// GET /api/fleet/inventory/alerts/unread-count - Get unread count
router.get('/alerts/unread-count', async (req: Request, res: Response) => {
  try {
    const companyId = req.user!.companyId;
    const count = await StockAlertModel.getUnreadCount(companyId);
    res.json({ success: true, data: { count } });
  } catch (error) {
    console.error('Error fetching alert count:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch alert count' });
  }
});

// POST /api/fleet/inventory/alerts/:id/acknowledge - Acknowledge alert
router.post('/alerts/:id/acknowledge', async (req: Request, res: Response) => {
  try {
    const companyId = req.user!.companyId;
    const userId = req.user!.userId;

    await StockAlertModel.acknowledge(req.params.id, companyId, userId);
    res.json({ success: true, message: 'Alert acknowledged' });
  } catch (error) {
    console.error('Error acknowledging alert:', error);
    res.status(500).json({ success: false, error: 'Failed to acknowledge alert' });
  }
});

export default router;
