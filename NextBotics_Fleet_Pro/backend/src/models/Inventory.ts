import { query } from '../database';

export interface InventoryCategory {
  id: string;
  companyId: string;
  name: string;
  description?: string;
  createdAt: Date;
}

export interface InventoryItem {
  id: string;
  companyId: string;
  sku: string;
  name: string;
  description?: string;
  categoryId?: string;
  unitOfMeasure: string;
  unitPrice?: number; // KSH
  supplierName?: string;
  supplierContact?: string;
  reorderLevel: number;
  reorderQuantity: number;
  currentStock: number;
  location?: string;
  isActive: boolean;
  createdBy?: string;
  createdAt: Date;
  updatedAt: Date;
  // Joined fields
  category?: {
    name: string;
  };
  isLowStock?: boolean;
}

export interface InventoryTransaction {
  id: string;
  companyId: string;
  itemId: string;
  transactionType: 'purchase' | 'consumption' | 'adjustment' | 'return' | 'transfer';
  quantity: number;
  unitCost?: number; // KSH
  totalCost?: number; // KSH
  referenceType?: string;
  referenceId?: string;
  performedBy: string;
  notes?: string;
  createdAt: Date;
  // Joined fields
  item?: {
    name: string;
    sku: string;
  };
  performer?: {
    firstName: string;
    lastName: string;
  };
}

export interface StockAlert {
  id: string;
  companyId: string;
  itemId: string;
  alertType: 'low_stock' | 'expiring' | 'overstock';
  message: string;
  isRead: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
  createdAt: Date;
  // Joined fields
  item?: {
    name: string;
    sku: string;
    currentStock: number;
    reorderLevel: number;
  };
}

export class InventoryCategoryModel {
  static async findByCompany(companyId: string): Promise<InventoryCategory[]> {
    const rows = await query(
      'SELECT * FROM inventory_categories WHERE company_id = $1 ORDER BY name ASC',
      [companyId]
    );
    return rows.map((row: any) => ({
      id: row.id,
      companyId: row.company_id,
      name: row.name,
      description: row.description,
      createdAt: new Date(row.created_at),
    }));
  }

  static async create(companyId: string, name: string, description?: string): Promise<InventoryCategory> {
    const rows = await query(
      'INSERT INTO inventory_categories (company_id, name, description) VALUES ($1, $2, $3) RETURNING *',
      [companyId, name, description]
    );
    return {
      id: rows[0].id,
      companyId: rows[0].company_id,
      name: rows[0].name,
      description: rows[0].description,
      createdAt: new Date(rows[0].created_at),
    };
  }
}

export class InventoryItemModel {
  static async findById(id: string, companyId: string): Promise<InventoryItem | null> {
    const rows = await query(
      `SELECT i.*, c.name as category_name
       FROM inventory_items i
       LEFT JOIN inventory_categories c ON i.category_id = c.id
       WHERE i.id = $1 AND i.company_id = $2`,
      [id, companyId]
    );
    return rows.length > 0 ? this.mapItemRow(rows[0]) : null;
  }

  static async findByCompany(companyId: string, options?: {
    categoryId?: string;
    isActive?: boolean;
    lowStockOnly?: boolean;
    search?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ items: InventoryItem[]; total: number }> {
    let sql = `
      SELECT i.*, c.name as category_name
      FROM inventory_items i
      LEFT JOIN inventory_categories c ON i.category_id = c.id
      WHERE i.company_id = $1
    `;
    let countSql = 'SELECT COUNT(*) as total FROM inventory_items WHERE company_id = $1';
    const params: any[] = [companyId];

    if (options?.categoryId) {
      sql += ` AND i.category_id = $${params.length + 1}`;
      countSql += ` AND category_id = $${params.length + 1}`;
      params.push(options.categoryId);
    }

    if (options?.isActive !== undefined) {
      sql += ` AND i.is_active = $${params.length + 1}`;
      countSql += ` AND is_active = $${params.length + 1}`;
      params.push(options.isActive);
    }

    if (options?.lowStockOnly) {
      sql += ` AND i.current_stock <= i.reorder_level`;
      countSql += ` AND current_stock <= reorder_level`;
    }

    if (options?.search) {
      sql += ` AND (i.name ILIKE $${params.length + 1} OR i.sku ILIKE $${params.length + 1})`;
      countSql += ` AND (name ILIKE $${params.length + 1} OR sku ILIKE $${params.length + 1})`;
      params.push(`%${options.search}%`);
    }

    sql += ' ORDER BY i.name ASC';

    if (options?.limit) {
      sql += ` LIMIT $${params.length + 1}`;
      params.push(options.limit);
      if (options?.offset) {
        sql += ` OFFSET $${params.length + 1}`;
        params.push(options.offset);
      }
    }

    const [rows, countRows] = await Promise.all([
      query(sql, params),
      query(countSql, params.slice(0, options?.limit ? params.length - (options.offset ? 2 : 1) : params.length))
    ]);

    return {
      items: rows.map(this.mapItemRow),
      total: parseInt(countRows[0].total)
    };
  }

  static async create(companyId: string, createdBy: string, data: Partial<InventoryItem>): Promise<InventoryItem> {
    const rows = await query(
      `INSERT INTO inventory_items (company_id, sku, name, description, category_id, unit_of_measure,
       unit_price, supplier_name, supplier_contact, reorder_level, reorder_quantity,
       current_stock, location, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14) RETURNING *`,
      [companyId, data.sku, data.name, data.description, data.categoryId, data.unitOfMeasure || 'piece',
       data.unitPrice, data.supplierName, data.supplierContact, data.reorderLevel || 10,
       data.reorderQuantity || 50, data.currentStock || 0, data.createdBy, createdBy]
    );
    return this.mapItemRow(rows[0]);
  }

  static async update(id: string, companyId: string, data: Partial<InventoryItem>): Promise<InventoryItem | null> {
    const updates: string[] = [];
    const params: any[] = [];

    const fieldMap: Record<string, string> = {
      name: 'name',
      description: 'description',
      categoryId: 'category_id',
      unitOfMeasure: 'unit_of_measure',
      unitPrice: 'unit_price',
      supplierName: 'supplier_name',
      supplierContact: 'supplier_contact',
      reorderLevel: 'reorder_level',
      reorderQuantity: 'reorder_quantity',
      location: 'location',
      isActive: 'is_active',
    };

    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined && fieldMap[key]) {
        updates.push(`${fieldMap[key]} = $${params.length + 1}`);
        params.push(value);
      }
    }

    if (updates.length === 0) return this.findById(id, companyId);

    params.push(id, companyId);

    const rows = await query(
      `UPDATE inventory_items SET ${updates.join(', ')} WHERE id = $${params.length - 1} AND company_id = $${params.length} RETURNING *`,
      params
    );

    return rows.length > 0 ? this.mapItemRow(rows[0]) : null;
  }

  static async adjustStock(
    id: string, 
    companyId: string, 
    quantity: number, 
    performedBy: string, 
    notes?: string
  ): Promise<InventoryItem | null> {
    const item = await this.findById(id, companyId);
    if (!item) return null;

    const newStock = item.currentStock + quantity;
    if (newStock < 0) {
      throw new Error('Insufficient stock');
    }

    await query(
      'UPDATE inventory_items SET current_stock = $1, updated_at = NOW() WHERE id = $2 AND company_id = $3',
      [newStock, id, companyId]
    );

    // Log transaction
    await InventoryTransactionModel.create(companyId, {
      itemId: id,
      transactionType: quantity > 0 ? 'adjustment' : 'consumption',
      quantity,
      unitCost: item.unitPrice,
      totalCost: item.unitPrice ? Math.abs(quantity) * item.unitPrice : undefined,
      performedBy,
      notes,
    });

    // Check for low stock and create alert
    if (newStock <= item.reorderLevel && item.currentStock > item.reorderLevel) {
      await StockAlertModel.create(companyId, id, 'low_stock', 
        `Stock for ${item.name} (${item.sku}) is below reorder level. Current: ${newStock}, Reorder at: ${item.reorderLevel}`);
    }

    return this.findById(id, companyId);
  }

  static async bulkImport(companyId: string, createdBy: string, items: Partial<InventoryItem>[]): Promise<{ imported: number; errors: string[] }> {
    const errors: string[] = [];
    let imported = 0;

    for (const item of items) {
      try {
        if (!item.sku || !item.name) {
          errors.push(`Missing SKU or name for item`);
          continue;
        }

        // Check for duplicate SKU
        const existing = await query(
          'SELECT id FROM inventory_items WHERE company_id = $1 AND sku = $2',
          [companyId, item.sku]
        );

        if (existing.length > 0) {
          errors.push(`SKU ${item.sku} already exists`);
          continue;
        }

        await this.create(companyId, createdBy, item);
        imported++;
      } catch (err: any) {
        errors.push(`Error importing ${item.sku}: ${err.message}`);
      }
    }

    return { imported, errors };
  }

  private static mapItemRow(row: any): InventoryItem {
    const item: InventoryItem = {
      id: row.id,
      companyId: row.company_id,
      sku: row.sku,
      name: row.name,
      description: row.description,
      categoryId: row.category_id,
      unitOfMeasure: row.unit_of_measure,
      unitPrice: row.unit_price ? parseFloat(row.unit_price) : undefined,
      supplierName: row.supplier_name,
      supplierContact: row.supplier_contact,
      reorderLevel: row.reorder_level,
      reorderQuantity: row.reorder_quantity,
      currentStock: row.current_stock,
      location: row.location,
      isActive: row.is_active,
      createdBy: row.created_by,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };

    if (row.category_name) {
      item.category = { name: row.category_name };
    }

    item.isLowStock = row.current_stock <= row.reorder_level;

    return item;
  }
}

export class InventoryTransactionModel {
  static async findByCompany(companyId: string, options?: {
    itemId?: string;
    transactionType?: string;
    dateFrom?: Date;
    dateTo?: Date;
    limit?: number;
    offset?: number;
  }): Promise<{ transactions: InventoryTransaction[]; total: number }> {
    let sql = `
      SELECT t.*, i.name as item_name, i.sku as item_sku,
        u.first_name, u.last_name
      FROM inventory_transactions t
      JOIN inventory_items i ON t.item_id = i.id
      LEFT JOIN users u ON t.performed_by = u.id
      WHERE t.company_id = $1
    `;
    let countSql = 'SELECT COUNT(*) as total FROM inventory_transactions WHERE company_id = $1';
    const params: any[] = [companyId];

    if (options?.itemId) {
      sql += ` AND t.item_id = $${params.length + 1}`;
      countSql += ` AND item_id = $${params.length + 1}`;
      params.push(options.itemId);
    }

    if (options?.transactionType) {
      sql += ` AND t.transaction_type = $${params.length + 1}`;
      countSql += ` AND transaction_type = $${params.length + 1}`;
      params.push(options.transactionType);
    }

    sql += ' ORDER BY t.created_at DESC';

    if (options?.limit) {
      sql += ` LIMIT $${params.length + 1}`;
      params.push(options.limit);
      if (options?.offset) {
        sql += ` OFFSET $${params.length + 1}`;
        params.push(options.offset);
      }
    }

    const [rows, countRows] = await Promise.all([
      query(sql, params),
      query(countSql, params.slice(0, options?.limit ? params.length - (options.offset ? 2 : 1) : params.length))
    ]);

    return {
      transactions: rows.map(this.mapTransactionRow),
      total: parseInt(countRows[0].total)
    };
  }

  static async create(companyId: string, data: Partial<InventoryTransaction>): Promise<InventoryTransaction> {
    const rows = await query(
      `INSERT INTO inventory_transactions (company_id, item_id, transaction_type, quantity,
       unit_cost, total_cost, reference_type, reference_id, performed_by, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
      [companyId, data.itemId, data.transactionType, data.quantity, data.unitCost,
       data.totalCost, data.referenceType, data.referenceId, data.performedBy, data.notes]
    );

    // Update item stock
    await query(
      'UPDATE inventory_items SET current_stock = current_stock + $1, updated_at = NOW() WHERE id = $2 AND company_id = $3',
      [data.quantity, data.itemId, companyId]
    );

    return this.mapTransactionRow(rows[0]);
  }

  static async getStats(companyId: string): Promise<{
    totalTransactions: number;
    byType: Record<string, number>;
    totalValue: number;
    lowStockItems: number;
  }> {
    const [transactionRows, itemRows] = await Promise.all([
      query(
        `SELECT 
          transaction_type,
          COUNT(*) as count,
          COALESCE(SUM(total_cost), 0) as total_value
         FROM inventory_transactions 
         WHERE company_id = $1
         GROUP BY transaction_type`,
        [companyId]
      ),
      query(
        `SELECT COUNT(*) as count 
         FROM inventory_items 
         WHERE company_id = $1 AND current_stock <= reorder_level AND is_active = true`,
        [companyId]
      )
    ]);

    const byType: Record<string, number> = {};
    let totalTransactions = 0;
    let totalValue = 0;

    for (const row of transactionRows) {
      byType[row.transaction_type] = parseInt(row.count);
      totalTransactions += parseInt(row.count);
      totalValue += parseFloat(row.total_value);
    }

    return {
      totalTransactions,
      byType,
      totalValue,
      lowStockItems: parseInt(itemRows[0].count),
    };
  }

  private static mapTransactionRow(row: any): InventoryTransaction {
    const transaction: InventoryTransaction = {
      id: row.id,
      companyId: row.company_id,
      itemId: row.item_id,
      transactionType: row.transaction_type,
      quantity: row.quantity,
      unitCost: row.unit_cost ? parseFloat(row.unit_cost) : undefined,
      totalCost: row.total_cost ? parseFloat(row.total_cost) : undefined,
      referenceType: row.reference_type,
      referenceId: row.reference_id,
      performedBy: row.performed_by,
      notes: row.notes,
      createdAt: new Date(row.created_at),
    };

    if (row.item_name) {
      transaction.item = {
        name: row.item_name,
        sku: row.item_sku,
      };
    }

    if (row.first_name) {
      transaction.performer = {
        firstName: row.first_name,
        lastName: row.last_name,
      };
    }

    return transaction;
  }
}

export class StockAlertModel {
  static async findByCompany(companyId: string, options?: {
    isRead?: boolean;
    limit?: number;
  }): Promise<StockAlert[]> {
    let sql = `
      SELECT a.*, i.name as item_name, i.sku as item_sku, 
        i.current_stock, i.reorder_level
      FROM stock_alerts a
      JOIN inventory_items i ON a.item_id = i.id
      WHERE a.company_id = $1
    `;
    const params: any[] = [companyId];

    if (options?.isRead !== undefined) {
      sql += ` AND a.is_read = $${params.length + 1}`;
      params.push(options.isRead);
    }

    sql += ' ORDER BY a.created_at DESC';

    if (options?.limit) {
      sql += ` LIMIT $${params.length + 1}`;
      params.push(options.limit);
    }

    const rows = await query(sql, params);
    return rows.map(this.mapAlertRow);
  }

  static async create(companyId: string, itemId: string, alertType: string, message: string): Promise<StockAlert> {
    // Check if similar alert already exists and is unread
    const existing = await query(
      `SELECT id FROM stock_alerts 
       WHERE company_id = $1 AND item_id = $2 AND alert_type = $3 AND is_read = false`,
      [companyId, itemId, alertType]
    );

    if (existing.length > 0) {
      // Update existing alert
      const rows = await query(
        `UPDATE stock_alerts SET message = $1, created_at = NOW() 
         WHERE id = $2 RETURNING *`,
        [message, existing[0].id]
      );
      return this.mapAlertRow(rows[0]);
    }

    const rows = await query(
      `INSERT INTO stock_alerts (company_id, item_id, alert_type, message)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [companyId, itemId, alertType, message]
    );
    return this.mapAlertRow(rows[0]);
  }

  static async acknowledge(id: string, companyId: string, userId: string): Promise<void> {
    await query(
      `UPDATE stock_alerts 
       SET is_read = true, acknowledged_by = $1, acknowledged_at = NOW()
       WHERE id = $2 AND company_id = $3`,
      [userId, id, companyId]
    );
  }

  static async getUnreadCount(companyId: string): Promise<number> {
    const rows = await query(
      `SELECT COUNT(*) as count FROM stock_alerts 
       WHERE company_id = $1 AND is_read = false`,
      [companyId]
    );
    return parseInt(rows[0].count);
  }

  private static mapAlertRow(row: any): StockAlert {
    const alert: StockAlert = {
      id: row.id,
      companyId: row.company_id,
      itemId: row.item_id,
      alertType: row.alert_type,
      message: row.message,
      isRead: row.is_read,
      acknowledgedBy: row.acknowledged_by,
      acknowledgedAt: row.acknowledged_at ? new Date(row.acknowledged_at) : undefined,
      createdAt: new Date(row.created_at),
    };

    if (row.item_name) {
      alert.item = {
        name: row.item_name,
        sku: row.item_sku,
        currentStock: row.current_stock,
        reorderLevel: row.reorder_level,
      };
    }

    return alert;
  }
}
